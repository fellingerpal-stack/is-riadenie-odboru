import type { AppRole, UserAuditEntry, UserProfile } from '../types'
import { accessSummary, defaultAccessScopes, normalizeAccessScopes } from './accessControl'

const USERS_KEY = 'cvti-is-riadenie-local-users-v010'
const AUDIT_KEY = 'cvti-is-riadenie-local-user-audit-v010'

const now = () => new Date().toISOString()
const inHours = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

const seedUsers: UserProfile[] = [
  {
    id: 'local-admin', organizationId: 'local-cvti', fullName: 'Pavol Horváth',
    email: 'pavol.horvath@cvtisr.sk', department: 'Odbor 3.2', jobTitle: 'Riaditeľ odboru',
    phone: '', role: 'admin', accessScopes: defaultAccessScopes('admin', 'Odbor 3.2'), isActive: true, lastLoginAt: now(), acceptedAt: now(), invitedAt: '', inviteExpiresAt: '', createdAt: now(), updatedAt: now(),
  },
  {
    id: 'local-manager', organizationId: 'local-cvti', fullName: 'Peter Modrák',
    email: 'peter.modrak@cvtisr.sk', department: 'Odbor 3.2', jobTitle: 'Vedúci oddelenia',
    phone: '', role: 'manager', accessScopes: defaultAccessScopes('manager', 'Odbor 3.2'), isActive: true, lastLoginAt: '', acceptedAt: '', invitedAt: now(), inviteExpiresAt: inHours(24), createdAt: now(), updatedAt: now(),
  },
  {
    id: 'local-resolver', organizationId: 'local-cvti', fullName: 'Ladislav Turányi',
    email: 'ladislav.turanyi@cvtisr.sk', department: 'Odbor 3.2', jobTitle: 'Riešiteľ / projektová rola',
    phone: '', role: 'resolver', accessScopes: defaultAccessScopes('resolver', 'Odbor 3.2'), isActive: true, lastLoginAt: '', acceptedAt: '', invitedAt: now(), inviteExpiresAt: inHours(24), createdAt: now(), updatedAt: now(),
  },
  {
    id: 'local-employee', organizationId: 'local-cvti', fullName: 'Michelle Kožuchová Bajema',
    email: 'michelle.bajema@cvtisr.sk', department: 'Odbor 3.2', jobTitle: 'Zamestnanec',
    phone: '', role: 'employee', accessScopes: defaultAccessScopes('employee', 'Odbor 3.2'), isActive: true, lastLoginAt: '', acceptedAt: '', invitedAt: now(), inviteExpiresAt: inHours(24), createdAt: now(), updatedAt: now(),
  },
  {
    id: 'local-viewer', organizationId: 'local-cvti', fullName: 'Audítor – čítanie',
    email: 'auditor@cvtisr.sk', department: 'Kontrola', jobTitle: 'Čitateľ',
    phone: '', role: 'viewer', accessScopes: defaultAccessScopes('viewer', 'Kontrola'), isActive: false, lastLoginAt: '', acceptedAt: '', invitedAt: now(), inviteExpiresAt: inHours(24), createdAt: now(), updatedAt: now(),
  },
]

function safeUsers(value: unknown): UserProfile[] {
  if (!Array.isArray(value)) return structuredClone(seedUsers)
  return value.map((row) => ({
    id: String(row?.id ?? crypto.randomUUID()),
    organizationId: String(row?.organizationId ?? 'local-cvti'),
    fullName: String(row?.fullName ?? ''),
    email: String(row?.email ?? ''),
    department: String(row?.department ?? ''),
    jobTitle: String(row?.jobTitle ?? ''),
    phone: String(row?.phone ?? ''),
    role: normalizeRole(row?.role),
    accessScopes: normalizeAccessScopes(row?.accessScopes, normalizeRole(row?.role), String(row?.department ?? '')),
    isActive: row?.isActive !== false,
    lastLoginAt: String(row?.lastLoginAt ?? ''),
    acceptedAt: String(row?.acceptedAt ?? row?.lastLoginAt ?? ''),
    invitedAt: String(row?.invitedAt ?? ''),
    inviteExpiresAt: String(row?.inviteExpiresAt ?? ''),
    createdAt: String(row?.createdAt ?? now()),
    updatedAt: String(row?.updatedAt ?? now()),
  }))
}

function normalizeRole(value: unknown): AppRole {
  return value === 'admin' || value === 'manager' || value === 'resolver' || value === 'project_manager' || value === 'project_member' || value === 'employee' ? value : 'viewer'
}

export function loadLocalUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) {
      localStorage.setItem(USERS_KEY, JSON.stringify(seedUsers))
      return structuredClone(seedUsers)
    }
    return safeUsers(JSON.parse(raw))
  } catch {
    return structuredClone(seedUsers)
  }
}

export function saveLocalUser(profile: UserProfile, actorName = 'Pavol Horváth'): UserProfile[] {
  const users = loadLocalUsers()
  const updated = { ...profile, updatedAt: now() }
  const next = users.some((item) => item.id === profile.id)
    ? users.map((item) => item.id === profile.id ? updated : item)
    : [...users, updated]
  localStorage.setItem(USERS_KEY, JSON.stringify(next))
  appendLocalAudit({ actorName, targetUserId: updated.id, targetUserName: updated.fullName || updated.email, action: 'Profil upravený', detail: `Rola: ${updated.role}; prístupy: ${accessSummary(updated.accessScopes)}; stav: ${updated.isActive ? 'aktívny' : 'deaktivovaný'}` })
  return next
}

export function inviteLocalUser(input: { email: string; fullName: string; department: string; jobTitle: string; phone: string; role: AppRole; accessScopes: UserProfile['accessScopes'] }, actorName = 'Pavol Horváth'): UserProfile[] {
  const users = loadLocalUsers()
  if (users.some((item) => item.email.toLowerCase() === input.email.toLowerCase())) throw new Error('Používateľ s týmto e-mailom už existuje.')
  const createdAt = now()
  const profile: UserProfile = {
    id: `local-${crypto.randomUUID()}`,
    organizationId: 'local-cvti',
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    department: input.department.trim(),
    jobTitle: input.jobTitle.trim(),
    phone: input.phone.trim(),
    role: input.role,
    accessScopes: normalizeAccessScopes(input.accessScopes, input.role, input.department),
    isActive: true,
    lastLoginAt: '',
    acceptedAt: '',
    invitedAt: createdAt,
    inviteExpiresAt: new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt,
    updatedAt: createdAt,
  }
  const next = [...users, profile]
  localStorage.setItem(USERS_KEY, JSON.stringify(next))
  appendLocalAudit({ actorName, targetUserId: profile.id, targetUserName: profile.fullName, action: 'Používateľ pozvaný', detail: `${profile.email}; rola: ${profile.role}; prístupy: ${accessSummary(profile.accessScopes)}` })
  return next
}


export function resendLocalInvitation(profile: UserProfile, actorName = 'Pavol Horváth'): UserProfile[] {
  const users = loadLocalUsers()
  const invitedAt = now()
  const updated: UserProfile = {
    ...profile,
    isActive: true,
    invitedAt,
    inviteExpiresAt: new Date(new Date(invitedAt).getTime() + 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: invitedAt,
  }
  const next = users.map((item) => item.id === profile.id ? updated : item)
  localStorage.setItem(USERS_KEY, JSON.stringify(next))
  appendLocalAudit({ actorName, targetUserId: profile.id, targetUserName: profile.fullName || profile.email, action: 'Znovu odoslaný prístupový odkaz', detail: `Lokálny demo režim – pozvánka ${profile.email} bola obnovená.` })
  return next
}

export function cancelLocalInvitation(profile: UserProfile, actorName = 'Pavol Horváth'): UserProfile[] {
  const users = loadLocalUsers()
  const updated: UserProfile = { ...profile, isActive: false, updatedAt: now() }
  const next = users.map((item) => item.id === profile.id ? updated : item)
  localStorage.setItem(USERS_KEY, JSON.stringify(next))
  appendLocalAudit({ actorName, targetUserId: profile.id, targetUserName: profile.fullName || profile.email, action: 'Pozvánka zrušená', detail: `Lokálny demo režim – prístup ${profile.email} bol zablokovaný.` })
  return next
}

export function resetLocalUsers(): UserProfile[] {
  localStorage.setItem(USERS_KEY, JSON.stringify(seedUsers))
  localStorage.removeItem(AUDIT_KEY)
  return structuredClone(seedUsers)
}

export function appendLocalAudit(input: Partial<UserAuditEntry> & Pick<UserAuditEntry, 'actorName' | 'targetUserId' | 'targetUserName' | 'action' | 'detail'>): void {
  const entries = loadLocalAudit()
  entries.unshift({
    id: crypto.randomUUID(), actorId: 'local-admin', createdAt: now(), ...input,
  } as UserAuditEntry)
  localStorage.setItem(AUDIT_KEY, JSON.stringify(entries.slice(0, 100)))
}

export function loadLocalAudit(): UserAuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY)
    return raw ? JSON.parse(raw) as UserAuditEntry[] : []
  } catch {
    return []
  }
}
