import { createClient } from '@supabase/supabase-js'

export type AppMode = 'auto' | 'local' | 'cloud'

const rawMode = String(import.meta.env.VITE_APP_MODE ?? 'auto').trim().toLowerCase()
export const appMode: AppMode = rawMode === 'cloud' || rawMode === 'local' ? rawMode : 'auto'

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const publishableKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()
const legacyAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
const supabasePublicKey = publishableKey || legacyAnonKey

export const supabaseConfigured = Boolean(supabaseUrl && supabasePublicKey)
export const cloudRequired = appMode === 'cloud'
export const localDemoEnabled = appMode === 'local' || (appMode === 'auto' && !supabaseConfigured)

export const supabaseConfiguration = {
  mode: appMode,
  urlConfigured: Boolean(supabaseUrl),
  keyConfigured: Boolean(supabasePublicKey),
  keyType: publishableKey ? 'publishable' : legacyAnonKey ? 'anon' : 'missing',
  projectHost: (() => {
    try {
      return supabaseUrl ? new URL(supabaseUrl).host : ''
    } catch {
      return ''
    }
  })(),
}

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabasePublicKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'x-application-name': 'is-riadenie-odboru',
        },
      },
    })
  : null

export function getAppUrl(): string {
  const configured = String(import.meta.env.VITE_APP_URL ?? '').trim()
  if (configured) return configured.replace(/\/$/, '')
  return window.location.origin
}

export function getPasswordRecoveryUrl(): string {
  return `${getAppUrl()}/?reset=1`
}
