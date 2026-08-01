import type { AppState, CloudSnapshot, UserAuditEntry, UserProfile } from '../types'
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

export async function saveCurrentSnapshot(payload: AppState): Promise<CloudSnapshot> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
  const { data, error } = await supabase.rpc('save_app_snapshot', { p_payload: payload })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('Supabase nevrátil uloženú verziu.')
  return {
    id: row.id,
    version: row.version,
    payload,
    createdAt: row.created_at,
    createdBy: row.created_by,
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
    isActive: Boolean(row.is_active),
    lastLoginAt: String(row.last_login_at ?? ''),
    invitedAt: String(row.invited_at ?? ''),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

export async function listProfiles(): Promise<UserProfile[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, organization_id, full_name, email, department, job_title, phone, role, is_active, last_login_at, invited_at, created_at, updated_at')
    .order('full_name')
  if (error) throw error
  return (data ?? []).map((row) => normalizeProfile(row as Record<string, unknown>))
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
      is_active: profile.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
  if (error) throw error
  await writeUserAudit('Profil upravený', profile.id, profile.fullName || profile.email, `Rola: ${profile.role}; stav: ${profile.isActive ? 'aktívny' : 'deaktivovaný'}`)
}

export async function inviteUser(input: {
  email: string
  fullName: string
  department: string
  jobTitle: string
  phone: string
  role: UserProfile['role']
}): Promise<string> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
  const { data, error } = await supabase.functions.invoke('invite-user', { body: input })
  if (error) throw error
  if (!data?.ok) throw new Error(data?.error ?? 'Pozvanie sa nepodarilo odoslať.')
  return String(data.message ?? 'Pozvanie bolo odoslané.')
}

export async function sendUserPasswordReset(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/?reset=1`,
  })
  if (error) throw error
  await writeUserAudit('Odoslaná obnova hesla', '', email, `Odkaz na obnovu hesla bol odoslaný na ${email}.`)
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

export async function listUserAudit(): Promise<UserAuditEntry[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('user_admin_audit')
    .select('id, actor_id, actor_name, target_user_id, target_user_name, action, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
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
