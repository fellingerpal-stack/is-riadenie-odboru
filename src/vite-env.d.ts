/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_MODE?: 'auto' | 'local' | 'cloud'
  readonly VITE_APP_MODE?: 'auto' | 'local' | 'cloud'
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_APP_URL?: string
  readonly VITE_MICROSOFT_SSO_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
