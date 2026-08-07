import { useEffect, useMemo, useState } from 'react'
import type { AccessLevel, AccessScope, AppRole, UserAccessScopes, UserAuditEntry, UserProfile } from '../types'
import {
  cancelUserInvitation,
  friendlyUserOperationError,
  inviteUser,
  listProfiles,
  listUserAudit,
  resendUserAccess,
  sendUserPasswordReset,
  setUserPassword,
  updateProfile,
} from '../lib/cloud'
import {
  appendLocalAudit,
  cancelLocalInvitation,
  inviteLocalUser,
  loadLocalAudit,
  loadLocalUsers,
  resendLocalInvitation,
  resetLocalUsers,
  saveLocalUser,
} from '../lib/localUsers'
import { useAuth } from '../auth/AuthContext'
import { ACCESS_LEVEL_LABELS, ACCESS_SCOPE_LABELS, defaultAccessScopes, normalizeAccessScopes } from '../lib/accessControl'
import { Badge, Field, Icon, Modal, PageHeader } from '../components/UI'

const roles: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Administrátor', description: 'Úplná správa aplikácie, používateľov a nastavení.' },
  { value: 'manager', label: 'Riaditeľ / manažér', description: 'Riadenie, schvaľovanie, reporty a editácia manažérskych modulov.' },
  { value: 'resolver', label: 'Riešiteľ', description: 'Správa pridelených úloh, ticketov, problémov, zmien a aktív.' },
  { value: 'employee', label: 'Zamestnanec', description: 'Používateľský prístup k vlastným požiadavkám a prideleným záznamom.' },
  { value: 'viewer', label: 'Čitateľ', description: 'Prístup iba na čítanie povolených informácií.' },
]


const accessLevels: { value: AccessLevel; short: string }[] = [
  { value: 'none', short: '—' },
  { value: 'read', short: 'R' },
  { value: 'write', short: 'W' },
]
const accessScopes: AccessScope[] = ['oit', 'oris', 'shared']

function accessTone(level: AccessLevel): 'success' | 'info' | 'neutral' {
  return level === 'write' ? 'success' : level === 'read' ? 'info' : 'neutral'
}

function AccessBadges({ profile }: { profile: UserProfile }) {
  const scopes = normalizeAccessScopes(profile.accessScopes, profile.role, profile.department)
  return <div className="access-badges">{accessScopes.map((scope) => <Badge key={scope} tone={accessTone(scopes[scope])}>{scope === 'oit' ? '3.1' : scope === 'oris' ? '3.2' : 'Spol.'} {scopes[scope] === 'write' ? 'W' : scopes[scope] === 'read' ? 'R' : '—'}</Badge>)}</div>
}

function AccessMatrix({ value, disabled = false, onChange }: { value: UserAccessScopes; disabled?: boolean; onChange: (value: UserAccessScopes) => void }) {
  return <section className="access-matrix"><header><div><strong>Rozsah prístupu</strong><span>R = iba čítanie · W = čítanie a zápis · — = bez prístupu</span></div></header><div className="access-matrix-grid">{accessScopes.map((scope) => <label key={scope}><span>{ACCESS_SCOPE_LABELS[scope]}</span><select disabled={disabled} value={value[scope]} onChange={(event) => onChange({ ...value, [scope]: event.target.value as AccessLevel })}>{accessLevels.map((level) => <option key={level.value} value={level.value}>{level.short} · {ACCESS_LEVEL_LABELS[level.value]}</option>)}</select></label>)}</div><p>Aplikačná rola určuje maximálnu schopnosť používateľa; táto matica určuje, v ktorom pracovnom priestore ju môže použiť.</p></section>
}

type AccountState = 'active' | 'invited' | 'expired' | 'cancelled' | 'inactive'
type UserTab = 'users' | 'onboarding' | 'audit'

const INVITE_WINDOW_HOURS = 24

function roleInfo(role: AppRole) {
  return roles.find((item) => item.value === role) ?? roles[4]
}

function roleTone(role: AppRole): 'danger' | 'purple' | 'info' | 'success' | 'neutral' {
  if (role === 'admin') return 'danger'
  if (role === 'manager') return 'purple'
  if (role === 'resolver') return 'info'
  if (role === 'employee') return 'success'
  return 'neutral'
}

function initials(value: string) {
  return value.split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'IS'
}

function formatDate(value: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function inviteExpiry(profile: UserProfile): string {
  if (profile.inviteExpiresAt) return profile.inviteExpiresAt
  if (!profile.invitedAt) return ''
  const invited = new Date(profile.invitedAt)
  if (Number.isNaN(invited.getTime())) return ''
  invited.setHours(invited.getHours() + INVITE_WINDOW_HOURS)
  return invited.toISOString()
}

function accountState(profile: UserProfile): AccountState {
  if (!profile.isActive) return profile.lastLoginAt ? 'inactive' : 'cancelled'
  if (profile.lastLoginAt) return 'active'
  const expiresAt = inviteExpiry(profile)
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return 'expired'
  return 'invited'
}

const accountStateInfo: Record<AccountState, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; description: string }> = {
  active: { label: 'Aktívny', tone: 'success', description: 'Používateľ sa už prihlásil a má povolený prístup.' },
  invited: { label: 'Pozvaný', tone: 'info', description: 'Pozvánka bola odoslaná, čaká sa na prvé prihlásenie.' },
  expired: { label: 'Pozvánka expirovala', tone: 'warning', description: 'Prístupový odkaz je starší ako 24 hodín. Odošlite nový odkaz.' },
  cancelled: { label: 'Pozvánka zrušená', tone: 'neutral', description: 'Účet sa ešte neprihlásil a jeho prístup bol zablokovaný.' },
  inactive: { label: 'Deaktivovaný', tone: 'danger', description: 'Používateľ sa už v minulosti prihlásil, ale prístup je vypnutý.' },
}

function blankInvite(): Omit<UserProfile, 'id' | 'organizationId' | 'isActive' | 'lastLoginAt' | 'acceptedAt' | 'invitedAt' | 'inviteExpiresAt' | 'createdAt' | 'updatedAt'> {
  return { fullName: '', email: '', department: 'Odbor 3.2', jobTitle: '', phone: '', role: 'employee', accessScopes: defaultAccessScopes('employee', 'Odbor 3.2') }
}

export default function Users({ currentUserId, currentUserName, configured }: { currentUserId: string; currentUserName: string; configured: boolean }) {
  const { updatePassword } = useAuth()
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [audit, setAudit] = useState<UserAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<UserTab>('users')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | AccountState>('all')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editProfile, setEditProfile] = useState<UserProfile | null>(null)
  const [detailProfile, setDetailProfile] = useState<UserProfile | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [adminPasswordProfile, setAdminPasswordProfile] = useState<UserProfile | null>(null)
  const [invite, setInvite] = useState(blankInvite())
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      if (configured) {
        const [users, entries] = await Promise.all([listProfiles(), listUserAudit()])
        setProfiles(users)
        setAudit(entries)
      } else {
        setProfiles(loadLocalUsers())
        setAudit(loadLocalAudit())
      }
    } catch (caught) {
      setError(friendlyUserOperationError(caught, 'Používateľov sa nepodarilo načítať.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [configured])

  const filtered = useMemo(() => profiles.filter((profile) => {
    const state = accountState(profile)
    const haystack = `${profile.fullName} ${profile.email} ${profile.department} ${profile.jobTitle} ${roleInfo(profile.role).label} ${accountStateInfo[state].label}`.toLowerCase()
    const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase())
    const matchesRole = roleFilter === 'all' || profile.role === roleFilter
    const matchesStatus = statusFilter === 'all' || state === statusFilter
    return matchesQuery && matchesRole && matchesStatus
  }), [profiles, query, roleFilter, statusFilter])

  const counts = useMemo(() => {
    const states = profiles.map(accountState)
    return {
      total: profiles.length,
      active: states.filter((state) => state === 'active').length,
      onboarding: states.filter((state) => state === 'invited' || state === 'expired').length,
      disabled: states.filter((state) => state === 'cancelled' || state === 'inactive').length,
      admins: profiles.filter((profile) => profile.role === 'admin' && accountState(profile) === 'active').length,
    }
  }, [profiles])

  const onboardingProfiles = useMemo(() => profiles
    .filter((profile) => ['invited', 'expired', 'cancelled'].includes(accountState(profile)))
    .sort((a, b) => {
      const priority: Record<AccountState, number> = { expired: 0, invited: 1, cancelled: 2, inactive: 3, active: 4 }
      return priority[accountState(a)] - priority[accountState(b)]
    }), [profiles])

  async function save(profile: UserProfile) {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      if (profile.id === currentUserId && (!profile.isActive || profile.role !== profiles.find((item) => item.id === currentUserId)?.role)) {
        throw new Error('Vlastný účet nemožno deaktivovať ani mu zmeniť rolu.')
      }
      if (configured) {
        await updateProfile(profile)
        await load()
      } else {
        setProfiles(saveLocalUser(profile, currentUserName))
        setAudit(loadLocalAudit())
      }
      setEditProfile(null)
      setMessage(`Profil ${profile.fullName || profile.email} bol uložený.`)
    } catch (caught) {
      setError(friendlyUserOperationError(caught, 'Profil sa nepodarilo uložiť.'))
    } finally {
      setBusy(false)
    }
  }

  async function sendInvite() {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      if (!invite.fullName.trim() || !invite.email.includes('@')) throw new Error('Doplňte meno a platný pracovný e-mail.')
      if (configured) {
        const result = await inviteUser(invite)
        setMessage(result)
        await load()
      } else {
        setProfiles(inviteLocalUser(invite, currentUserName))
        setAudit(loadLocalAudit())
        setMessage(`Demo účet ${invite.email} bol vytvorený. V lokálnom režime sa e-mail neposiela.`)
      }
      setInviteOpen(false)
      setInvite(blankInvite())
    } catch (caught) {
      setError(friendlyUserOperationError(caught, 'Pozvanie sa nepodarilo odoslať.'))
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword(profile: UserProfile) {
    if (!confirm(`Odoslať obnovu hesla používateľovi ${profile.email}?`)) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      if (configured) {
        await sendUserPasswordReset(profile.email)
        setMessage(`Odkaz na obnovu hesla bol odoslaný na ${profile.email}.`)
        await load()
      } else {
        appendLocalAudit({ actorName: currentUserName, targetUserId: profile.id, targetUserName: profile.fullName, action: 'Simulovaná obnova hesla', detail: `Lokálny režim – e-mail ${profile.email} nebol odoslaný.` })
        setAudit(loadLocalAudit())
        setMessage('V lokálnom režime bola obnova hesla iba zaznamenaná do auditu.')
      }
    } catch (caught) {
      setError(friendlyUserOperationError(caught, 'Obnovu hesla sa nepodarilo odoslať.'))
    } finally {
      setBusy(false)
    }
  }

  async function resendAccess(profile: UserProfile) {
    if (!confirm(`Odoslať nový prístupový odkaz používateľovi ${profile.email}?`)) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      if (configured) {
        await resendUserAccess(profile)
        setMessage(`Nový prístupový odkaz bol odoslaný na ${profile.email}.`)
        await load()
      } else {
        setProfiles(resendLocalInvitation(profile, currentUserName))
        setAudit(loadLocalAudit())
        setMessage('Demo pozvánka bola obnovená. V lokálnom režime sa e-mail neposiela.')
      }
    } catch (caught) {
      setError(friendlyUserOperationError(caught, 'Nový prístupový odkaz sa nepodarilo odoslať.'))
    } finally {
      setBusy(false)
    }
  }

  async function cancelInvitation(profile: UserProfile) {
    if (!confirm(`Zrušiť pozvánku používateľa ${profile.email}? Účet zostane evidovaný, ale prístup bude zablokovaný.`)) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      if (configured) {
        await cancelUserInvitation(profile)
        await load()
      } else {
        setProfiles(cancelLocalInvitation(profile, currentUserName))
        setAudit(loadLocalAudit())
      }
      setMessage(`Pozvánka používateľa ${profile.email} bola zrušená.`)
    } catch (caught) {
      setError(friendlyUserOperationError(caught, 'Pozvánku sa nepodarilo zrušiť.'))
    } finally {
      setBusy(false)
    }
  }

  async function changeOwnPassword(password: string) {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await updatePassword(password)
      setPasswordOpen(false)
      setMessage('Heslo bolo úspešne zmenené.')
    } catch (caught) {
      setError(friendlyUserOperationError(caught, 'Heslo sa nepodarilo zmeniť.'))
    } finally {
      setBusy(false)
    }
  }

  async function changeUserPassword(profile: UserProfile, password: string) {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const result = await setUserPassword(profile.id, password)
      setAdminPasswordProfile(null)
      setEditProfile(null)
      setDetailProfile(null)
      setMessage(result || `Heslo používateľa ${profile.fullName || profile.email} bolo zmenené.`)
      await load()
    } catch (caught) {
      setError(friendlyUserOperationError(caught, 'Heslo používateľa sa nepodarilo nastaviť.'))
    } finally {
      setBusy(false)
    }
  }

  function resetDemoAccounts() {
    if (!confirm('Obnoviť vzorové lokálne účty a vymazať lokálny audit používateľov?')) return
    setProfiles(resetLocalUsers())
    setAudit([])
    setMessage('Vzorové lokálne účty boli obnovené.')
  }

  return <div className="users-page">
    <PageHeader eyebrow="Administrácia" title="Používatelia a onboarding" description="Správa účtov, rolí, pozvánok, prístupov, hesiel a auditných zmien." actions={<div className="page-actions">{!configured && <button className="button button-secondary" onClick={resetDemoAccounts}><Icon name="refresh"/> Obnoviť demo účty</button>}{configured && <button className="button button-secondary" onClick={() => setPasswordOpen(true)}><Icon name="lock"/> Zmeniť moje heslo</button>}<button className="button button-primary" onClick={() => setInviteOpen(true)}><Icon name="plus"/> Pozvať používateľa</button></div>} />

    <div className={`environment-banner ${configured ? 'is-cloud' : 'is-local'}`}>
      <Icon name={configured ? 'shield' : 'database'} size={20}/>
      <div><strong>{configured ? 'Supabase Auth je aktívny' : 'Lokálny demo režim'}</strong><span>{configured ? 'Účty, pozvánky a zmeny oprávnení sa zapisujú do Supabase a chránia pravidlami RLS.' : 'Účty sú uložené iba v tomto prehliadači. Prihlásenie sa aktivuje po nastavení Supabase premenných.'}</span></div>
      <Badge tone={configured ? 'success' : 'warning'}>{configured ? 'produkčný režim' : 'bez reálneho prihlásenia'}</Badge>
    </div>

    <div className="user-kpi-grid user-kpi-grid-five">
      <article><span>Všetky účty</span><strong>{counts.total}</strong><small>evidovaných používateľov</small></article>
      <article><span>Aktívni</span><strong>{counts.active}</strong><small>už sa úspešne prihlásili</small></article>
      <article><span>Onboarding</span><strong>{counts.onboarding}</strong><small>čakajú na prvé prihlásenie</small></article>
      <article><span>Blokované</span><strong>{counts.disabled}</strong><small>zrušené alebo deaktivované</small></article>
      <article><span>Administrátori</span><strong>{counts.admins}</strong><small>aktívne správcovské účty</small></article>
    </div>

    <div className="module-tabs user-tabs">
      <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}><Icon name="people" size={18}/> Účty <span>{profiles.length}</span></button>
      <button className={tab === 'onboarding' ? 'active' : ''} onClick={() => setTab('onboarding')}><Icon name="roadmap" size={18}/> Onboarding <span>{onboardingProfiles.length}</span></button>
      <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}><Icon name="shield" size={18}/> Audit zmien <span>{audit.length}</span></button>
    </div>

    {(message || error) && <div className={error ? 'inline-alert inline-alert-error' : 'inline-alert inline-alert-success'}><Icon name={error ? 'warning' : 'check'} size={18}/><span>{error || message}</span></div>}

    {tab === 'users' && <>
      <section className="panel user-toolbar">
        <div className="search-box"><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hľadať podľa mena, e-mailu, útvaru, roly alebo stavu…"/></div>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'all' | AppRole)}><option value="all">Všetky roly</option>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | AccountState)}><option value="all">Všetky stavy</option><option value="active">Aktívni</option><option value="invited">Pozvaní</option><option value="expired">Expirované pozvánky</option><option value="cancelled">Zrušené pozvánky</option><option value="inactive">Deaktivovaní</option></select>
        <Badge tone="info">{filtered.length} z {profiles.length}</Badge>
      </section>
      <section className="panel users-panel">
        {loading ? <div className="loading-block">Načítavam používateľov…</div> : filtered.length ? <div className="table-scroll users-table-shell" role="region" aria-label="Zoznam používateľov" tabIndex={0}><table className="data-table users-table"><thead><tr><th>Používateľ</th><th>Útvar a pozícia</th><th>Aplikačná rola</th><th>Prístupy 3.1 / 3.2</th><th>Stav účtu</th><th>Prihlásenie</th><th></th></tr></thead><tbody>{filtered.map((profile) => {
          const state = accountState(profile)
          const stateInfo = accountStateInfo[state]
          return <tr key={profile.id} className={!profile.isActive ? 'is-inactive' : ''}>
            <td><div className="user-cell"><div className="avatar avatar-small">{initials(profile.fullName || profile.email)}</div><div><strong>{profile.fullName || 'Meno nedoplnené'} {profile.id === currentUserId && <Badge tone="info">Vy</Badge>}</strong><small>{profile.email}</small><small>{profile.phone || 'Telefón nedoplnený'}</small></div></div></td>
            <td><strong className="table-main-value">{profile.department || 'Útvar neurčený'}</strong><small className="table-sub-value">{profile.jobTitle || 'Pozícia neurčená'}</small></td>
            <td><Badge tone={roleTone(profile.role)}>{roleInfo(profile.role).label}</Badge><small className="table-sub-value role-copy">{roleInfo(profile.role).description}</small></td>
            <td><AccessBadges profile={profile}/><small className="table-sub-value">W = zápis · R = čítanie</small></td>
            <td><Badge tone={stateInfo.tone}>{stateInfo.label}</Badge><small className="table-sub-value">{state === 'invited' || state === 'expired' ? `Platnosť do ${formatDate(inviteExpiry(profile))}` : stateInfo.description}</small></td>
            <td><strong className="table-main-value">{formatDate(profile.lastLoginAt)}</strong><small className="table-sub-value">{profile.acceptedAt ? `Prijaté ${formatDate(profile.acceptedAt)}` : profile.invitedAt ? `Pozvaný ${formatDate(profile.invitedAt)}` : 'Vytvorený priamo'}</small></td>
            <td><UserRowActions profile={profile} state={state} current={profile.id === currentUserId} cloud={configured} busy={busy} onDetail={() => setDetailProfile(profile)} onEdit={() => setEditProfile(profile)} onReset={() => void resetPassword(profile)} onResend={() => void resendAccess(profile)} onCancel={() => void cancelInvitation(profile)} onOwnPassword={() => setPasswordOpen(true)}/></td>
          </tr>
        })}</tbody></table></div> : <div className="empty"><div className="empty-icon"><Icon name="search" size={26}/></div><strong>Žiadny používateľ nezodpovedá filtru</strong><p>Upravte vyhľadávanie alebo filtre.</p></div>}
      </section>
    </>}

    {tab === 'onboarding' && <OnboardingPanel profiles={onboardingProfiles} busy={busy} onResend={(profile) => void resendAccess(profile)} onCancel={(profile) => void cancelInvitation(profile)} onDetail={setDetailProfile}/>} 

    {tab === 'audit' && <section className="panel audit-panel">{loading ? <div className="loading-block">Načítavam audit…</div> : audit.length ? <div className="audit-list">{audit.map((entry) => <article key={entry.id}><div className="audit-icon"><Icon name="shield" size={16}/></div><div><header><strong>{entry.action}</strong><span>{formatDate(entry.createdAt)}</span></header><p>{entry.detail}</p><small>{entry.actorName || 'Systém'} → {entry.targetUserName || 'bez cieľového účtu'}</small></div></article>)}</div> : <div className="empty"><div className="empty-icon"><Icon name="shield" size={26}/></div><strong>Audit je zatiaľ prázdny</strong><p>Záznamy vzniknú pri pozvaní, úprave účtu, zmene prístupu alebo obnove hesla.</p></div>}</section>}

    {inviteOpen && <Modal title="Pozvať používateľa" onClose={() => setInviteOpen(false)}><div className="form-grid">
      <Field label="Meno a priezvisko"><input value={invite.fullName} onChange={(event) => setInvite({ ...invite, fullName: event.target.value })} placeholder="Meno Priezvisko"/></Field>
      <Field label="Pracovný e-mail"><input type="email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} placeholder="meno@cvtisr.sk"/></Field>
      <Field label="Útvar / oddelenie"><input value={invite.department} onChange={(event) => { const department=event.target.value; setInvite({ ...invite, department, accessScopes: defaultAccessScopes(invite.role, department) }) }} placeholder="Odbor 3.2"/></Field>
      <Field label="Pracovná pozícia"><input value={invite.jobTitle} onChange={(event) => setInvite({ ...invite, jobTitle: event.target.value })} placeholder="Názov pozície"/></Field>
      <Field label="Telefón"><input value={invite.phone} onChange={(event) => setInvite({ ...invite, phone: event.target.value })} placeholder="+421…"/></Field>
      <Field label="Aplikačná rola" hint={roleInfo(invite.role).description}><select value={invite.role} onChange={(event) => { const role=event.target.value as AppRole; setInvite({ ...invite, role, accessScopes: defaultAccessScopes(role, invite.department) }) }}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></Field>
    </div><AccessMatrix value={invite.accessScopes} disabled={invite.role==='admin'} onChange={(accessScopes)=>setInvite({...invite,accessScopes})}/><div className="invite-note"><Icon name="calendar" size={17}/><div><strong>Prístupový odkaz je určený na prvotné nastavenie hesla.</strong><span>Ak používateľ odkaz neotvorí včas, v záložke Onboarding mu odošlete nový.</span></div></div><div className="modal-actions"><button className="button button-secondary" onClick={() => setInviteOpen(false)}>Zrušiť</button><button className="button button-primary" disabled={busy || !invite.email || !invite.fullName} onClick={() => void sendInvite()}>{busy ? 'Spracúvam…' : configured ? 'Odoslať pozvanie' : 'Vytvoriť demo účet'}</button></div></Modal>}

    {editProfile && <UserEditModal profile={editProfile} current={editProfile.id === currentUserId} cloud={configured} busy={busy} onClose={() => setEditProfile(null)} onSave={save} onOwnPassword={() => { setEditProfile(null); setPasswordOpen(true) }} onSetPassword={() => { setEditProfile(null); setAdminPasswordProfile(editProfile) }}/>} 
    {detailProfile && <UserDetailModal profile={profiles.find((item) => item.id === detailProfile.id) ?? detailProfile} audit={audit.filter((entry) => entry.targetUserId === detailProfile.id || entry.targetUserName === detailProfile.fullName)} current={detailProfile.id === currentUserId} cloud={configured} busy={busy} onClose={() => setDetailProfile(null)} onEdit={() => { setDetailProfile(null); setEditProfile(detailProfile) }} onReset={() => void resetPassword(detailProfile)} onResend={() => void resendAccess(detailProfile)} onCancel={() => void cancelInvitation(detailProfile)} onOwnPassword={() => { setDetailProfile(null); setPasswordOpen(true) }} onSetPassword={() => { setDetailProfile(null); setAdminPasswordProfile(detailProfile) }}/>} 
    {passwordOpen && <ChangePasswordModal busy={busy} onClose={() => setPasswordOpen(false)} onSave={changeOwnPassword}/>} 
    {adminPasswordProfile && <AdminSetPasswordModal profile={adminPasswordProfile} busy={busy} onClose={() => setAdminPasswordProfile(null)} onSave={(password) => changeUserPassword(adminPasswordProfile, password)}/>} 
  </div>
}

function UserRowActions({ profile, state, current, cloud, busy, onDetail, onEdit, onReset, onResend, onCancel, onOwnPassword }: { profile: UserProfile; state: AccountState; current: boolean; cloud: boolean; busy: boolean; onDetail: () => void; onEdit: () => void; onReset: () => void; onResend: () => void; onCancel: () => void; onOwnPassword: () => void }) {
  const pending = state === 'invited' || state === 'expired' || state === 'cancelled'
  return <div className="row-actions">
    <button className="icon-button" title="Detail účtu" onClick={onDetail}><Icon name="eye" size={17}/></button>
    <button className="icon-button" title="Upraviť profil" onClick={onEdit}><Icon name="edit" size={17}/></button>
    {current ? cloud ? <button className="icon-button" title="Zmeniť moje heslo" disabled={busy} onClick={onOwnPassword}><Icon name="lock" size={17}/></button> : null : pending ? <>
      <button className="icon-button" title="Odoslať nový prístupový odkaz" disabled={busy} onClick={onResend}><Icon name="refresh" size={17}/></button>
      {state !== 'cancelled' && <button className="icon-button icon-button-danger" title="Zrušiť pozvánku" disabled={busy} onClick={onCancel}><Icon name="close" size={17}/></button>}
    </> : <button className="icon-button" title="Odoslať obnovu hesla" disabled={busy || !profile.isActive} onClick={onReset}><Icon name="lock" size={17}/></button>}
  </div>
}

function OnboardingPanel({ profiles, busy, onResend, onCancel, onDetail }: { profiles: UserProfile[]; busy: boolean; onResend: (profile: UserProfile) => void; onCancel: (profile: UserProfile) => void; onDetail: (profile: UserProfile) => void }) {
  return <div className="onboarding-layout">
    <section className="panel onboarding-flow-panel"><header><div><span className="section-kicker">Proces prvého prístupu</span><h2>Od pozvánky po aktívny účet</h2></div><Badge tone="info">4 kroky</Badge></header><div className="onboarding-flow">
      <article><span>1</span><div><strong>Pozvanie</strong><small>Administrátor odošle prístupový e-mail.</small></div></article>
      <article><span>2</span><div><strong>Nastavenie hesla</strong><small>Používateľ otvorí odkaz a nastaví si heslo.</small></div></article>
      <article><span>3</span><div><strong>Prvé prihlásenie</strong><small>Systém overí profil, rolu a aktívny stav.</small></div></article>
      <article><span>4</span><div><strong>Aktívny účet</strong><small>Zapíše sa prijatie pozvánky a posledné prihlásenie.</small></div></article>
    </div></section>
    <section className="panel onboarding-queue"><header><div><span className="section-kicker">Vyžaduje pozornosť</span><h2>Rozpracované pozvánky</h2></div><Badge tone={profiles.some((profile) => accountState(profile) === 'expired') ? 'warning' : 'info'}>{profiles.length}</Badge></header>
      {profiles.length ? <div className="onboarding-list">{profiles.map((profile) => {
        const state = accountState(profile)
        const info = accountStateInfo[state]
        return <article key={profile.id}><div className="avatar avatar-small">{initials(profile.fullName || profile.email)}</div><div className="onboarding-person"><strong>{profile.fullName || profile.email}</strong><span>{profile.email}</span><small>{state === 'cancelled' ? 'Prístup je zablokovaný.' : `Platnosť odkazu do ${formatDate(inviteExpiry(profile))}`}</small></div><Badge tone={info.tone}>{info.label}</Badge><div className="onboarding-actions"><button className="button button-small button-secondary" onClick={() => onDetail(profile)}>Detail</button><button className="button button-small button-primary" disabled={busy} onClick={() => onResend(profile)}>{state === 'cancelled' ? 'Obnoviť pozvanie' : 'Nový odkaz'}</button>{state !== 'cancelled' && <button className="icon-button icon-button-danger" title="Zrušiť pozvánku" disabled={busy} onClick={() => onCancel(profile)}><Icon name="close" size={16}/></button>}</div></article>
      })}</div> : <div className="empty"><div className="empty-icon"><Icon name="check" size={26}/></div><strong>Onboarding je vybavený</strong><p>Nie sú tu žiadne čakajúce, expirované ani zrušené pozvánky.</p></div>}
    </section>
  </div>
}

function UserEditModal({ profile, current, cloud, busy, onClose, onSave, onOwnPassword, onSetPassword }: { profile: UserProfile; current: boolean; cloud: boolean; busy: boolean; onClose: () => void; onSave: (profile: UserProfile) => Promise<void>; onOwnPassword: () => void; onSetPassword: () => void }) {
  const [draft, setDraft] = useState(profile)
  return <Modal title="Upraviť používateľa" onClose={onClose}><div className="user-edit-header"><div className="avatar avatar-large">{initials(draft.fullName || draft.email)}</div><div><strong>{draft.fullName || draft.email}</strong><span>{draft.email}</span>{current && <Badge tone="info">Aktuálne prihlásený účet</Badge>}</div></div><div className="form-grid">
    <Field label="Meno a priezvisko"><input value={draft.fullName} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })}/></Field>
    <Field label="E-mail"><input value={draft.email} disabled/></Field>
    <Field label="Útvar / oddelenie"><input value={draft.department} onChange={(event) => { const department=event.target.value; setDraft({ ...draft, department, accessScopes: defaultAccessScopes(draft.role, department) }) }}/></Field>
    <Field label="Pracovná pozícia"><input value={draft.jobTitle} onChange={(event) => setDraft({ ...draft, jobTitle: event.target.value })}/></Field>
    <Field label="Telefón"><input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })}/></Field>
    <Field label="Aplikačná rola" hint={roleInfo(draft.role).description}><select value={draft.role} disabled={current} onChange={(event) => { const role=event.target.value as AppRole; setDraft({ ...draft, role, accessScopes: defaultAccessScopes(role, draft.department) }) }}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></Field>
    <Field label="Stav účtu" hint={current ? 'Vlastný účet nemožno deaktivovať.' : 'Deaktivovaný používateľ sa neprihlási.'}><label className="account-status-switch"><input type="checkbox" checked={draft.isActive} disabled={current} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}/><span>{draft.isActive ? 'Prístup povolený' : 'Prístup zablokovaný'}</span></label></Field>
  </div><AccessMatrix value={draft.accessScopes} disabled={current || draft.role==='admin'} onChange={(accessScopes)=>setDraft({...draft,accessScopes})}/>{cloud&&<div className="password-guidance"><Icon name="lock" size={20}/><div><strong>{current?'Zmena vlastného hesla':'Správa hesla používateľa'}</strong><span>{current?'Heslo zmeníte priamo bez e-mailu a bez SMTP.':'Administrátor môže nastaviť nové heslo priamo v Supabase Auth. Používateľovi ho odovzdajte bezpečným kanálom.'}</span><button className="button button-secondary button-small" type="button" onClick={current?onOwnPassword:onSetPassword}><Icon name="lock" size={16}/> {current?'Zmeniť moje heslo':'Nastaviť nové heslo'}</button></div></div>}<div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Zrušiť</button><button className="button button-primary" disabled={busy || !draft.fullName.trim()} onClick={() => void onSave(draft)}>{busy ? 'Ukladám…' : 'Uložiť zmeny'}</button></div></Modal>
}

function UserDetailModal({ profile, audit, current, cloud, busy, onClose, onEdit, onReset, onResend, onCancel, onOwnPassword, onSetPassword }: { profile: UserProfile; audit: UserAuditEntry[]; current: boolean; cloud: boolean; busy: boolean; onClose: () => void; onEdit: () => void; onReset: () => void; onResend: () => void; onCancel: () => void; onOwnPassword: () => void; onSetPassword: () => void }) {
  const state = accountState(profile)
  const info = accountStateInfo[state]
  const pending = state === 'invited' || state === 'expired' || state === 'cancelled'
  return <Modal title="Detail používateľského účtu" onClose={onClose} wide><div className="user-detail-hero"><div className="avatar avatar-large">{initials(profile.fullName || profile.email)}</div><div><div className="user-detail-title"><h3>{profile.fullName || 'Meno nedoplnené'}</h3>{current && <Badge tone="info">Vy</Badge>}</div><p>{profile.email}</p><div className="user-detail-badges"><Badge tone={roleTone(profile.role)}>{roleInfo(profile.role).label}</Badge><Badge tone={info.tone}>{info.label}</Badge></div></div></div>
    <div className="user-detail-grid"><article><span>Útvar</span><strong>{profile.department || 'Neurčený'}</strong><small>{profile.jobTitle || 'Pozícia neurčená'}</small></article><article><span>Telefón</span><strong>{profile.phone || 'Nedoplnený'}</strong><small>Kontaktný údaj</small></article><article><span>Pozvaný</span><strong>{formatDate(profile.invitedAt)}</strong><small>{pending ? `Platnosť do ${formatDate(inviteExpiry(profile))}` : 'Prvotné vytvorenie účtu'}</small></article><article><span>Prijatie pozvánky</span><strong>{formatDate(profile.acceptedAt)}</strong><small>{profile.acceptedAt ? 'Prvé úspešné prihlásenie' : 'Zatiaľ nezaznamenané'}</small></article><article><span>Posledné prihlásenie</span><strong>{formatDate(profile.lastLoginAt)}</strong><small>Aktivita používateľa</small></article><article><span>Posledná zmena</span><strong>{formatDate(profile.updatedAt)}</strong><small>Profil alebo oprávnenia</small></article></div>
    <section className="user-access-detail"><header><strong>Prístupy podľa pracoviska</strong><span>Efektívny rozsah po prihlásení</span></header><AccessBadges profile={profile}/><div className="user-access-detail-grid">{accessScopes.map(scope=><article key={scope}><span>{ACCESS_SCOPE_LABELS[scope]}</span><strong>{ACCESS_LEVEL_LABELS[normalizeAccessScopes(profile.accessScopes,profile.role,profile.department)[scope]]}</strong></article>)}</div></section>
    <section className="detail-status-explainer"><Icon name={state === 'active' ? 'check' : 'warning'} size={18}/><div><strong>{info.label}</strong><span>{info.description}</span></div></section>
    <section className="user-detail-audit"><header><div><span className="section-kicker">História účtu</span><h3>Posledné administrátorské zmeny</h3></div><Badge tone="neutral">{audit.length}</Badge></header>{audit.length ? <div>{audit.slice(0, 8).map((entry) => <article key={entry.id}><span>{formatDate(entry.createdAt)}</span><div><strong>{entry.action}</strong><small>{entry.detail}</small></div></article>)}</div> : <p className="muted-copy">Pre tento účet zatiaľ nie je evidovaná administrátorská zmena.</p>}</section>
    <div className="modal-actions modal-actions-between"><button className="button button-secondary" onClick={onClose}>Zavrieť</button><div><button className="button button-secondary" onClick={onEdit}><Icon name="edit"/> Upraviť profil</button>{current ? cloud ? <button className="button button-primary" disabled={busy} onClick={onOwnPassword}><Icon name="lock"/> Zmeniť moje heslo</button> : null : <><button className="button button-primary" disabled={busy} onClick={onSetPassword}><Icon name="lock"/> Nastaviť heslo</button>{pending&&<button className="button button-secondary" disabled={busy} onClick={onResend}><Icon name="refresh"/> {state === 'cancelled' ? 'Obnoviť pozvanie' : 'Odoslať nový odkaz'}</button>}{!pending&&<button className="button button-secondary" disabled={busy || !profile.isActive} onClick={onReset}>Odoslať obnovu e-mailom</button>}{pending&&state !== 'cancelled'&&<button className="button button-danger" disabled={busy} onClick={onCancel}>Zrušiť pozvánku</button>}</>}</div></div>
  </Modal>
}

function ChangePasswordModal({ busy, onClose, onSave }: { busy: boolean; onClose: () => void; onSave: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')

  function submit() {
    setLocalError('')
    if (password.length < 10) {
      setLocalError('Nové heslo musí mať aspoň 10 znakov.')
      return
    }
    if (password !== confirmPassword) {
      setLocalError('Zadané heslá sa nezhodujú.')
      return
    }
    void onSave(password)
  }

  return <Modal title="Zmeniť moje heslo" onClose={onClose}><div className="password-guidance"><Icon name="shield" size={20}/><div><strong>Bezpečné heslo</strong><span>Použite aspoň 10 znakov a nekombinujte ho s heslom z iného systému.</span></div></div><div className="form-grid form-grid-single"><Field label="Nové heslo"><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimálne 10 znakov"/></Field><Field label="Zopakujte nové heslo"><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Zadajte heslo znova"/></Field></div>{localError && <div className="inline-alert inline-alert-error compact-alert"><Icon name="warning" size={17}/><span>{localError}</span></div>}<div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Zrušiť</button><button className="button button-primary" disabled={busy || !password || !confirmPassword} onClick={submit}>{busy ? 'Ukladám…' : 'Zmeniť heslo'}</button></div></Modal>
}


function AdminSetPasswordModal({ profile, busy, onClose, onSave }: { profile: UserProfile; busy: boolean; onClose: () => void; onSave: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  function submit() {
    setLocalError('')
    if (password.length < 10) {
      setLocalError('Nové heslo musí mať aspoň 10 znakov.')
      return
    }
    if (password !== confirmPassword) {
      setLocalError('Zadané heslá sa nezhodujú.')
      return
    }
    void onSave(password)
  }

  return <Modal title="Nastaviť heslo používateľa" onClose={onClose}><div className="user-edit-header"><div className="avatar avatar-large">{initials(profile.fullName || profile.email)}</div><div><strong>{profile.fullName || profile.email}</strong><span>{profile.email}</span><Badge tone="warning">Administrátorská zmena</Badge></div></div><div className="password-guidance"><Icon name="shield" size={20}/><div><strong>Bez e-mailu a SMTP</strong><span>Heslo sa nastaví priamo v Supabase Auth. Používateľovi ho odovzdajte cez bezpečný kanál a požiadajte ho, aby si ho po prihlásení zmenil cez Môj profil.</span></div></div><div className="form-grid form-grid-single"><Field label="Nové heslo"><div className="auth-input"><Icon name="lock" size={18}/><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimálne 10 znakov"/><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Skryť heslo' : 'Zobraziť heslo'}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={17}/></button></div></Field><Field label="Zopakujte nové heslo"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Zadajte heslo znova"/></Field></div>{localError && <div className="inline-alert inline-alert-error compact-alert"><Icon name="warning" size={17}/><span>{localError}</span></div>}<div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Zrušiť</button><button className="button button-primary" disabled={busy || !password || !confirmPassword} onClick={submit}>{busy ? 'Ukladám…' : 'Nastaviť nové heslo'}</button></div></Modal>
}
