import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import type { AppRole, UserProfile } from '../types'
import { normalizeAccessScopes } from '../lib/accessControl'
import {
  cloudRequired,
  getPasswordRecoveryUrl,
  localDemoEnabled,
  microsoftSsoEnabled,
  getAppUrl,
  supabase,
  supabaseConfigured,
  supabaseConfiguration,
} from '../lib/supabase'
import { touchLastLogin } from '../lib/cloud'

interface AuthContextValue {
  configured: boolean
  cloudRequired: boolean
  localDemoEnabled: boolean
  configuration: typeof supabaseConfiguration
  microsoftSsoEnabled: boolean
  loading: boolean
  recoveryMode: boolean
  authEvent: AuthChangeEvent | 'BOOTSTRAP'
  session: Session | null
  user: User | null
  profile: UserProfile | null
  error: string
  signIn: (email: string, password: string) => Promise<void>
  signInWithMicrosoft: () => Promise<void>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  finishPasswordRecovery: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function normalizeRole(value: unknown): AppRole {
  return value === 'admin' || value === 'manager' || value === 'resolver' || value === 'project_manager' || value === 'project_member' || value === 'employee' ? value : 'viewer'
}

function normalizeProfile(row: unknown): UserProfile | null {
  if (!row || typeof row !== 'object') return null
  const item = row as Record<string, unknown>
  return {
    id: String(item.id ?? ''),
    organizationId: String(item.organization_id ?? ''),
    fullName: String(item.full_name ?? ''),
    email: String(item.email ?? ''),
    department: String(item.department ?? ''),
    jobTitle: String(item.job_title ?? ''),
    phone: String(item.phone ?? ''),
    role: normalizeRole(item.role),
    accessScopes: normalizeAccessScopes(item.access_scopes, normalizeRole(item.role), String(item.department ?? '')),
    isActive: Boolean(item.is_active),
    lastLoginAt: String(item.last_login_at ?? ''),
    acceptedAt: String(item.accepted_at ?? ''),
    invitedAt: String(item.invited_at ?? ''),
    inviteExpiresAt: String(item.invite_expires_at ?? ''),
    createdAt: String(item.created_at ?? ''),
    updatedAt: String(item.updated_at ?? ''),
  }
}

function initialRecoveryMode(): boolean {
  return new URLSearchParams(window.location.search).get('reset') === '1'
    || window.location.hash.startsWith('#/reset-password')
}

function friendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) return 'Nesprávny e-mail alebo heslo.'
  if (lower.includes('email not confirmed')) return 'E-mail ešte nebol potvrdený.'
  if (lower.includes('user not found')) return 'Používateľský účet neexistuje.'
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) return 'Microsoft prihlásenie ešte nie je povolené v Supabase Auth. Skontrolujte Authentication → Providers → Azure.'
  if (lower.includes('oauth') && lower.includes('state')) return 'Microsoft prihlásenie sa nepodarilo dokončiť. Skúste ho spustiť znova z prihlasovacej obrazovky.'
  if (lower.includes('email rate limit') || lower.includes('rate limit')) return 'Bol prekročený limit odosielania e-mailov. Počkajte približne hodinu alebo nastavte vlastné SMTP v Supabase.'
  return message || 'Operáciu prihlásenia sa nepodarilo dokončiť.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(supabaseConfigured)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState('')
  const [recoveryMode, setRecoveryMode] = useState(initialRecoveryMode)
  const [authEvent, setAuthEvent] = useState<AuthChangeEvent | 'BOOTSTRAP'>('BOOTSTRAP')
  const lastLoginTouchedFor = useRef('')

  async function queryProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase) return null
    const detailed = await supabase
      .from('profiles')
      .select('id, organization_id, full_name, email, department, job_title, phone, role, access_scopes, is_active, last_login_at, accepted_at, invited_at, invite_expires_at, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle()

    if (!detailed.error) return normalizeProfile(detailed.data)

    const legacy = await supabase
      .from('profiles')
      .select('id, organization_id, full_name, email, department, job_title, phone, role, is_active, last_login_at, invited_at, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle()
    if (legacy.error) throw legacy.error
    return normalizeProfile(legacy.data)
  }

  async function loadProfile(userId?: string) {
    if (!supabase || !userId) {
      setProfile(null)
      return
    }

    let next: UserProfile | null = null
    let lastError: unknown = null
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        next = await queryProfile(userId)
        if (next) break
      } catch (caught) {
        lastError = caught
      }
      await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)))
    }

    if (!next) {
      if (lastError) throw lastError
      throw new Error('Prihlásenie je platné, ale používateľ nemá vytvorený profil. Administrátor musí dokončiť registráciu účtu.')
    }
    if (!next.isActive) {
      await supabase.auth.signOut()
      throw new Error('Používateľský účet je deaktivovaný.')
    }

    setProfile(next)
    if (lastLoginTouchedFor.current !== next.id) {
      lastLoginTouchedFor.current = next.id
      void touchLastLogin()
    }
  }

  async function refreshProfile() {
    setError('')
    try {
      await loadProfile(session?.user.id)
    } catch (caught) {
      setError(friendlyAuthError(caught))
    }
  }

  async function applySession(nextSession: Session | null, event: AuthChangeEvent | 'BOOTSTRAP') {
    setAuthEvent(event)
    setSession(nextSession)
    if (!nextSession?.user) {
      setProfile(null)
      lastLoginTouchedFor.current = ''
      return
    }
    await loadProfile(nextSession.user.id)
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let alive = true

    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!alive) return
      if (sessionError) setError(friendlyAuthError(sessionError))
      try {
        await applySession(data.session, 'BOOTSTRAP')
      } catch (caught) {
        if (alive) setError(friendlyAuthError(caught))
      } finally {
        if (alive) setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!alive) return
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      if (event === 'SIGNED_OUT') setRecoveryMode(false)
      setLoading(true)
      queueMicrotask(async () => {
        try {
          await applySession(nextSession, event)
          if (alive) setError('')
        } catch (caught) {
          if (alive) {
            setProfile(null)
            setError(friendlyAuthError(caught))
          }
        } finally {
          if (alive) setLoading(false)
        }
      })
    })

    return () => {
      alive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (signInError) throw new Error(friendlyAuthError(signInError))
  }

  async function signInWithMicrosoft() {
    if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
    if (!microsoftSsoEnabled) throw new Error('Microsoft prihlásenie ešte nie je zapnuté v konfigurácii aplikácie.')
    setError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email',
        redirectTo: `${getAppUrl()}/`,
      },
    })
    if (oauthError) throw new Error(friendlyAuthError(oauthError))
  }

  async function signOut() {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) throw new Error(friendlyAuthError(signOutError))
    setRecoveryMode(false)
    setProfile(null)
  }

  async function sendPasswordReset(email: string) {
    if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: getPasswordRecoveryUrl(),
    })
    if (resetError) throw new Error(friendlyAuthError(resetError))
  }

  async function updatePassword(password: string) {
    if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) throw new Error(friendlyAuthError(updateError))
  }

  function finishPasswordRecovery() {
    setRecoveryMode(false)
    const cleanUrl = `${window.location.pathname}#/dashboard`
    window.history.replaceState({}, '', cleanUrl)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }

  const value = useMemo<AuthContextValue>(() => ({
    configured: supabaseConfigured,
    cloudRequired,
    localDemoEnabled,
    configuration: supabaseConfiguration,
    microsoftSsoEnabled,
    loading,
    recoveryMode,
    authEvent,
    session,
    user: session?.user ?? null,
    profile,
    error,
    signIn,
    signInWithMicrosoft,
    signOut,
    sendPasswordReset,
    updatePassword,
    finishPasswordRecovery,
    refreshProfile,
  }), [loading, recoveryMode, authEvent, session, profile, error])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth musí byť použitý v AuthProvider.')
  return context
}
