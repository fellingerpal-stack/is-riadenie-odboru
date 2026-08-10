import type { AppState, CloudSnapshot, UserAuditEntry, UserProfile } from '../types'
import { accessSummary, normalizeAccessScopes } from './accessControl'
import { getAppUrl, supabase } from './supabase'

export async function loadCurrentSnapshot(): Promise<CloudSnapshot | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('app_snapshots')
    .select('id, version, payload, created_at, created_by')
    .eq('is_current', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id,
    version: data.version,
    payload: data.payload as AppState,
    createdAt: data.created_at,
    createdBy: data.created_by,
  }
}

export async function saveCurrentSnapshot(payload: AppState, expectedVersion: number | null = null): Promise<CloudSnapshot> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')

  let result = await supabase.rpc('save_app_snapshot_v4', {
    p_payload: payload,
    p_expected_version: expectedVersion,
  })

  if (result.error) {
    const detail = extractErrorDetails(result.error)
    const normalized = `${detail.code} ${detail.message}`.toLowerCase()
    const v4Missing = normalized.includes('pgrst202')
      || normalized.includes('save_app_snapshot_v4') && (normalized.includes('schema cache') || normalized.includes('could not find'))
    if (v4Missing) {
      result = await supabase.rpc('save_app_snapshot_v3', {
        p_payload: payload,
        p_expected_version: expectedVersion,
      })
    }
  }

  const { data, error } = result
  if (error) {
    const detail = extractErrorDetails(error)
    const parts = [
      detail.code ? `[${detail.code}]` : '',
      detail.message || 'Databáza odmietla zápis snapshotu.',
    ].filter(Boolean)
    throw new Error(parts.join(' '))
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') throw new Error('Supabase nevrátil uloženú verziu snapshotu.')

  const record = row as Record<string, unknown>
  const version = Number(record.version ?? 0)
  if (!Number.isFinite(version) || version <= 0) throw new Error('Supabase vrátil neplatnú verziu snapshotu.')

  return {
    id: String(record.id ?? ''),
    version,
    payload,
    createdAt: String(record.created_at ?? new Date().toISOString()),
    createdBy: String(record.created_by ?? ''),
  }
}

function normalizeProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id ?? ''),
    organizationId: String(row.organization_id ?? ''),
    fullName: String(row.full_name ?? ''),
    email: String(row.email ?? ''),
    department: String(row.department ?? ''),
    jobTitle: String(row.job_title ?? ''),
    phone: String(row.phone ?? ''),
    role: row.role === 'admin' || row.role === 'manager' || row.role === 'resolver' || row.role === 'employee' ? row.role : 'viewer',
    accessScopes: normalizeAccessScopes(row.access_scopes, row.role === 'admin' || row.role === 'manager' || row.role === 'resolver' || row.role === 'employee' ? row.role : 'viewer', String(row.department ?? '')),
    isActive: Boolean(row.is_active),
    lastLoginAt: String(row.last_login_at ?? ''),
    acceptedAt: String(row.accepted_at ?? ''),
    invitedAt: String(row.invited_at ?? ''),
    inviteExpiresAt: String(row.invite_expires_at ?? ''),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

export async function listProfiles(): Promise<UserProfile[]> {
  if (!supabase) return []
  const detailed = await supabase
    .from('profiles')
    .select('id, organization_id, full_name, email, department, job_title, phone, role, access_scopes, is_active, last_login_at, accepted_at, invited_at, invite_expires_at, created_at, updated_at')
    .order('full_name')

  if (!detailed.error) {
    return (detailed.data ?? []).map((row) => normalizeProfile(row as Record<string, unknown>))
  }

  const legacy = await supabase
    .from('profiles')
    .select('id, organization_id, full_name, email, department, job_title, phone, role, is_active, last_login_at, invited_at, created_at, updated_at')
    .order('full_name')
  if (legacy.error) throw legacy.error
  return (legacy.data ?? []).map((row) => normalizeProfile(row as Record<string, unknown>))
}

export async function updateProfile(profile: UserProfile): Promise<void> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: profile.fullName,
      department: profile.department,
      job_title: profile.jobTitle,
      phone: profile.phone,
      role: profile.role,
      access_scopes: profile.accessScopes,
      is_active: profile.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
  if (error) throw error
  await writeUserAudit('Profil upravený', profile.id, profile.fullName || profile.email, `Rola: ${profile.role}; prístupy: ${accessSummary(profile.accessScopes)}; stav: ${profile.isActive ? 'aktívny' : 'deaktivovaný'}`)
}

type ErrorRecord = Record<string, unknown>

function usefulText(value: unknown): string {
  if (typeof value !== 'string') return ''
  const text = value.trim()
  if (!text || text === '{}' || text === '[]' || text === '[object Object]' || text === 'null' || text === 'undefined') return ''

  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      const parsed = JSON.parse(text) as unknown
      const nested = extractErrorDetails(parsed)
      if (nested.message) return nested.message
    } catch {
      // Text nie je použiteľný JSON; vrátime pôvodnú hodnotu.
    }
  }

  return text
}

function extractErrorDetails(error: unknown, depth = 0): { message: string; code: string; status: number } {
  if (depth > 3 || error == null) return { message: '', code: '', status: 0 }

  if (typeof error === 'string') {
    return { message: usefulText(error), code: '', status: 0 }
  }

  const record = typeof error === 'object' ? error as ErrorRecord : {}
  const statusValue = Number(record.status ?? record.statusCode ?? 0)
  const status = Number.isFinite(statusValue) ? statusValue : 0
  const code = usefulText(record.code) || usefulText(record.error_code)

  const directValues = [
    error instanceof Error ? error.message : '',
    record.error_description,
    record.error,
    record.message,
    record.msg,
    record.details,
    record.hint,
    record.reason,
  ]

  for (const value of directValues) {
    const message = usefulText(value)
    if (message) return { message, code, status }

    if (value && typeof value === 'object') {
      const nested = extractErrorDetails(value, depth + 1)
      if (nested.message || nested.code || nested.status) {
        return {
          message: nested.message,
          code: nested.code || code,
          status: nested.status || status,
        }
      }
    }
  }

  const cause = record.cause
  if (cause) {
    const nested = extractErrorDetails(cause, depth + 1)
    if (nested.message || nested.code || nested.status) {
      return {
        message: nested.message,
        code: nested.code || code,
        status: nested.status || status,
      }
    }
  }

  return { message: '', code, status }
}

export function friendlyUserOperationError(error: unknown, fallback = 'Operáciu sa nepodarilo dokončiť.'): string {
  const detail = extractErrorDetails(error)
  const normalized = `${detail.message} ${detail.code}`.toLowerCase()

  if (detail.status === 429 || normalized.includes('email rate limit') || normalized.includes('rate limit') || normalized.includes('over_email_send_rate_limit')) {
    return 'Bol prekročený limit odosielania e-mailov. Počkajte približne hodinu alebo nastavte vlastné SMTP v Supabase.'
  }
  if (normalized.includes('failed to send a request to the edge function') || normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return 'Supabase Edge Function momentálne neodpovedá. Skontrolujte funkciu invite-user, jej CORS nastavenie a prihlásenie.'
  }
  if (normalized.includes('already been registered') || normalized.includes('already registered') || normalized.includes('already exists') || normalized.includes('user_already_exists')) {
    return 'Používateľ s týmto e-mailom už existuje.'
  }
  if (normalized.includes('invalid login credentials')) return 'Nesprávny e-mail alebo heslo.'
  if (normalized.includes('email not confirmed')) return 'E-mail používateľa ešte nebol potvrdený.'
  if (normalized.includes('jwt') || normalized.includes('session') || normalized.includes('invalid_session') || normalized.includes('prihlásenie vypršalo')) {
    return 'Prihlásenie vypršalo. Odhláste sa a prihláste znova.'
  }
  if (normalized.includes('email address not authorized') || normalized.includes('not authorized to send') || normalized.includes('email_not_authorized')) {
    return 'Supabase odmietol odoslanie na túto adresu. Nastavte vlastné SMTP alebo použite povolenú tímovú adresu.'
  }
  if (normalized.includes('smtp') || normalized.includes('error sending') || normalized.includes('failed to send email') || normalized.includes('sending confirmation email') || normalized.includes('smtp_error')) {
    return 'E-mail sa nepodarilo odoslať. Skontrolujte SMTP prihlasovacie údaje, odosielaciu adresu a overenie domény v Supabase.'
  }
  if (!detail.message && detail.status >= 500) {
    return 'Supabase Auth vrátil serverovú chybu bez podrobností. Skontrolujte Authentication → Logs; najčastejšie ide o SMTP alebo limit odosielania e-mailov.'
  }
  if (!detail.message) {
    return `${fallback} Supabase nevrátil podrobnosti chyby. Skontrolujte Authentication → Logs.`
  }

  return detail.message
}

async function readFunctionError(error: unknown): Promise<string> {
  const candidate = error as { message?: string; context?: Response; status?: number; name?: string }
  const context = candidate?.context

  if (context instanceof Response) {
    const status = context.status
    try {
      const text = (await context.clone().text()).trim()
      if (text && text !== '{}' && text !== '[]') {
        try {
          const parsed = JSON.parse(text) as unknown
          const parsedMessage = friendlyUserOperationError({ ...extractErrorDetails(parsed), status }, '')
          if (parsedMessage) return parsedMessage
        } catch {
          const plain = usefulText(text)
          if (plain) return plain
        }
      }
    } catch {
      // Pokračujeme mapovaním statusu a pôvodnej chyby.
    }

    if (status === 401) return 'Prihlásenie vypršalo. Odhláste sa a prihláste znova.'
    if (status === 403) return 'Pozývať používateľov môže iba aktívny administrátor.'
    if (status === 404) return 'Edge Function invite-user nebola nájdená alebo je nasadená pod iným názvom.'
    if (status === 429) return 'Bol prekročený limit odosielania e-mailov. Skúste to neskôr alebo nastavte vlastné SMTP.'
    if (status >= 500) return 'Edge Function vrátila serverovú chybu bez podrobností. Skontrolujte jej Invocations / Logs a SMTP nastavenie.'
  }

  return friendlyUserOperationError(candidate, 'Pozvanie sa nepodarilo odoslať.')
}

export async function inviteUser(input: {
  email: string
  fullName: string
  department: string
  jobTitle: string
  phone: string
  role: UserProfile['role']
  accessScopes: UserProfile['accessScopes']
}): Promise<string> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('Prihlásenie vypršalo. Odhláste sa a prihláste znova.')

  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: { ...input, appUrl: getAppUrl() },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (error) throw new Error(await readFunctionError(error))
  if (!data?.ok) throw new Error(data?.error ?? 'Pozvanie sa nepodarilo odoslať.')
  return String(data.message ?? 'Pozvanie bolo odoslané.')
}

export async function setUserPassword(userId: string, password: string): Promise<string> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
  if (!userId) throw new Error('Používateľský účet nemá identifikátor.')
  if (password.length < 10) throw new Error('Nové heslo musí mať aspoň 10 znakov.')

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('Prihlásenie vypršalo. Odhláste sa a prihláste znova.')

  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: { action: 'set-password', userId, password },
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (error) throw new Error(await readFunctionError(error))
  if (!data?.ok) throw new Error(data?.error ?? 'Heslo sa nepodarilo nastaviť.')
  return String(data.message ?? 'Heslo bolo nastavené.')
}

export async function sendUserPasswordReset(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/?reset=1`,
  })
  if (error) throw new Error(friendlyUserOperationError(error, 'Obnovu hesla sa nepodarilo odoslať.'))
  await writeUserAudit('Odoslaná obnova hesla', '', email, `Odkaz na obnovu hesla bol odoslaný na ${email}.`)
}

export async function resendUserAccess(profile: UserProfile): Promise<void> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${getAppUrl()}/?reset=1`,
  })
  if (resetError) throw new Error(friendlyUserOperationError(resetError, 'Nový prístupový odkaz sa nepodarilo odoslať.'))

  const detailed = await supabase
    .from('profiles')
    .update({
      is_active: true,
      invited_at: now.toISOString(),
      invite_expires_at: expiresAt,
      updated_at: now.toISOString(),
    })
    .eq('id', profile.id)

  if (detailed.error) {
    const legacy = await supabase
      .from('profiles')
      .update({ is_active: true, invited_at: now.toISOString(), updated_at: now.toISOString() })
      .eq('id', profile.id)
    if (legacy.error) throw legacy.error
  }

  await writeUserAudit('Znovu odoslaný prístupový odkaz', profile.id, profile.fullName || profile.email, `Nový odkaz bol odoslaný na ${profile.email}.`)
}

export async function cancelUserInvitation(profile: UserProfile): Promise<void> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', profile.id)
  if (error) throw error
  await writeUserAudit('Pozvánka zrušená', profile.id, profile.fullName || profile.email, `Prístup používateľa ${profile.email} bol zablokovaný pred prvým prihlásením.`)
}

export async function touchLastLogin(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('touch_last_login')
  if (error) console.warn('Nepodarilo sa zapísať posledné prihlásenie:', error.message)
}

export async function writeUserAudit(action: string, targetUserId: string, targetUserName: string, detail: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('log_user_admin_action', {
    p_action: action,
    p_target_user_id: targetUserId || null,
    p_target_user_name: targetUserName,
    p_detail: detail,
  })
  if (error) console.warn('Auditný záznam sa nepodarilo uložiť:', error.message)
}

export async function listUserAudit(limit = 200): Promise<UserAuditEntry[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('user_admin_audit')
    .select('id, actor_id, actor_name, target_user_id, target_user_name, action, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(Math.max(20, Math.min(limit, 1000)))
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: String(row.id ?? ''),
    actorId: String(row.actor_id ?? ''),
    actorName: String(row.actor_name ?? ''),
    targetUserId: String(row.target_user_id ?? ''),
    targetUserName: String(row.target_user_name ?? ''),
    action: String(row.action ?? ''),
    detail: String(row.detail ?? ''),
    createdAt: String(row.created_at ?? ''),
  }))
}
