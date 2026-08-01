import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { AppRole, UserProfile } from '../types'
import { getAppUrl, supabase, supabaseConfigured } from '../lib/supabase'

interface AuthContextValue {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  profile: UserProfile | null
  error: string
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function normalizeProfile(row: unknown): UserProfile | null {
  if (!row || typeof row !== 'object') return null
  const item = row as Record<string, unknown>
  const role: AppRole = item.role === 'admin' || item.role === 'manager' ? item.role : 'viewer'
  return {
    id: String(item.id ?? ''),
    organizationId: String(item.organization_id ?? ''),
    fullName: String(item.full_name ?? ''),
    email: String(item.email ?? ''),
    role,
    isActive: Boolean(item.is_active),
    createdAt: String(item.created_at ?? ''),
    updatedAt: String(item.updated_at ?? ''),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(supabaseConfigured)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState('')

  async function loadProfile(userId?: string) {
    if (!supabase || !userId) {
      setProfile(null)
      return
    }
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, organization_id, full_name, email, role, is_active, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle()
    if (profileError) throw profileError
    const next = normalizeProfile(data)
    if (next && !next.isActive) throw new Error('Používateľský účet je deaktivovaný.')
    setProfile(next)
  }

  async function refreshProfile() {
    setError('')
    try {
      await loadProfile(session?.user.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Profil sa nepodarilo načítať.')
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let alive = true
    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!alive) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      try {
        await loadProfile(data.session?.user.id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Profil sa nepodarilo načítať.')
      } finally {
        if (alive) setLoading(false)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return
      setSession(nextSession)
      setLoading(true)
      queueMicrotask(async () => {
        try {
          await loadProfile(nextSession?.user.id)
          setError('')
        } catch (e) {
          setProfile(null)
          setError(e instanceof Error ? e.message : 'Profil sa nepodarilo načítať.')
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
    if (!supabase) return
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) throw signInError
  }

  async function signOut() {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) throw signOutError
  }

  async function sendPasswordReset(email: string) {
    if (!supabase) return
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppUrl()}/?reset=1`,
    })
    if (resetError) throw resetError
  }

  async function updatePassword(password: string) {
    if (!supabase) return
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) throw updateError
  }

  const value = useMemo<AuthContextValue>(() => ({
    configured: supabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
    profile,
    error,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
    refreshProfile,
  }), [loading, session, profile, error])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth musí byť použitý v AuthProvider.')
  return context
}
