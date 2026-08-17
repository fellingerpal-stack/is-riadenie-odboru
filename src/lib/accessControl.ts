import type { AccessLevel, AccessScope, AppRole, UserAccessScopes, UserProfile } from '../types'

export const ACCESS_SCOPE_LABELS: Record<AccessScope, string> = {
  oit: 'Odbor 3.1',
  oris: 'Odbor 3.2',
  shared: 'Spoločné',
}

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  none: 'Bez prístupu',
  read: 'Iba čítanie',
  write: 'Čítanie + zápis',
}

export function normalizeAccessLevel(value: unknown): AccessLevel {
  return value === 'write' || value === 'read' ? value : 'none'
}

export function defaultAccessScopes(role: AppRole, department: string): UserAccessScopes {
  if (role === 'admin') return { oit: 'write', oris: 'write', shared: 'write' }
  if (role === 'employee') return { oit: 'none', oris: 'none', shared: 'none' }

  const dept = String(department || '').toLowerCase()
  const is31 = dept.includes('3.1') || dept.includes('oit')
  const is32 = dept.includes('3.2') || dept.includes('oris')
  const operationalWrite = role !== 'viewer'

  if (is31) {
    return {
      oit: operationalWrite ? 'write' : 'read',
      oris: 'read',
      shared: operationalWrite ? 'write' : 'read',
    }
  }
  if (is32) {
    return {
      oit: 'read',
      oris: operationalWrite ? 'write' : 'read',
      shared: operationalWrite ? 'write' : 'read',
    }
  }

  return { oit: 'read', oris: 'read', shared: 'read' }
}

export function normalizeAccessScopes(value: unknown, role: AppRole, department: string): UserAccessScopes {
  if (role === 'admin') return { oit: 'write', oris: 'write', shared: 'write' }
  if (role === 'employee') return { oit: 'none', oris: 'none', shared: 'none' }
  const fallback = defaultAccessScopes(role, department)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback
  const row = value as Record<string, unknown>
  return {
    oit: row.oit === undefined ? fallback.oit : normalizeAccessLevel(row.oit),
    oris: row.oris === undefined ? fallback.oris : normalizeAccessLevel(row.oris),
    shared: row.shared === undefined ? fallback.shared : normalizeAccessLevel(row.shared),
  }
}

export function profileAccess(profile: Pick<UserProfile, 'role' | 'department' | 'accessScopes'> | null | undefined, scope: AccessScope): AccessLevel {
  if (!profile) return 'none'
  if (profile.role === 'admin') return 'write'
  return normalizeAccessScopes(profile.accessScopes, profile.role, profile.department)[scope]
}

export function canReadScope(profile: Pick<UserProfile, 'role' | 'department' | 'accessScopes'> | null | undefined, scope: AccessScope): boolean {
  return profileAccess(profile, scope) !== 'none'
}

export function canWriteScope(profile: Pick<UserProfile, 'role' | 'department' | 'accessScopes'> | null | undefined, scope: AccessScope): boolean {
  return profileAccess(profile, scope) === 'write'
}

export function accessSummary(scopes: UserAccessScopes): string {
  const token = (value: AccessLevel) => value === 'write' ? 'W' : value === 'read' ? 'R' : '—'
  return `3.1 ${token(scopes.oit)} · 3.2 ${token(scopes.oris)} · spoločné ${token(scopes.shared)}`
}
