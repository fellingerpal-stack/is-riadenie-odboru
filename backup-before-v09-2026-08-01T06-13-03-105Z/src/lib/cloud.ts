import type { AppState, CloudSnapshot, UserProfile } from '../types'
import { supabase } from './supabase'

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

export async function listProfiles(): Promise<UserProfile[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, organization_id, full_name, email, role, is_active, created_at, updated_at')
    .order('full_name')
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function updateProfile(profile: UserProfile): Promise<void> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: profile.fullName,
      role: profile.role,
      is_active: profile.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
  if (error) throw error
}

export async function inviteUser(input: { email: string; fullName: string; role: UserProfile['role'] }): Promise<string> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
  const { data, error } = await supabase.functions.invoke('invite-user', { body: input })
  if (error) throw error
  if (!data?.ok) throw new Error(data?.error ?? 'Pozvanie sa nepodarilo odoslať.')
  return String(data.message ?? 'Pozvanie bolo odoslané.')
}
