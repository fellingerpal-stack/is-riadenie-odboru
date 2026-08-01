import { useEffect, useMemo, useState } from 'react'
import type { AppRole, UserAuditEntry, UserProfile } from '../types'
import { inviteUser, listProfiles, listUserAudit, sendUserPasswordReset, updateProfile } from '../lib/cloud'
import { appendLocalAudit, inviteLocalUser, loadLocalAudit, loadLocalUsers, resetLocalUsers, saveLocalUser } from '../lib/localUsers'
import { Badge, Field, Icon, Modal, PageHeader } from '../components/UI'

const roles: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Administrátor', description: 'Úplná správa aplikácie, používateľov a nastavení.' },
  { value: 'manager', label: 'Riaditeľ / manažér', description: 'Riadenie, schvaľovanie, reporty a editácia manažérskych modulov.' },
  { value: 'resolver', label: 'Riešiteľ', description: 'Správa pridelených úloh, ticketov, problémov, zmien a aktív.' },
  { value: 'employee', label: 'Zamestnanec', description: 'Používateľský prístup k vlastným požiadavkám a prideleným záznamom.' },
  { value: 'viewer', label: 'Čitateľ', description: 'Prístup iba na čítanie povolených informácií.' },
]

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

function blankInvite(): Omit<UserProfile, 'id' | 'organizationId' | 'isActive' | 'lastLoginAt' | 'invitedAt' | 'createdAt' | 'updatedAt'> {
  return { fullName: '', email: '', department: 'Odbor 3.2', jobTitle: '', phone: '', role: 'employee' }
}

export default function Users({ currentUserId, currentUserName, configured }: { currentUserId: string; currentUserName: string; configured: boolean }) {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [audit, setAudit] = useState<UserAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'users' | 'audit'>('users')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editProfile, setEditProfile] = useState<UserProfile | null>(null)
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
      setError(caught instanceof Error ? caught.message : 'Používateľov sa nepodarilo načítať.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [configured])

  const filtered = useMemo(() => profiles.filter((profile) => {
    const haystack = `${profile.fullName} ${profile.email} ${profile.department} ${profile.jobTitle} ${roleInfo(profile.role).label}`.toLowerCase()
    const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase())
    const matchesRole = roleFilter === 'all' || profile.role === roleFilter
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? profile.isActive : !profile.isActive)
    return matchesQuery && matchesRole && matchesStatus
  }), [profiles, query, roleFilter, statusFilter])

  const counts = useMemo(() => ({
    total: profiles.length,
    active: profiles.filter((profile) => profile.isActive).length,
    admins: profiles.filter((profile) => profile.role === 'admin' && profile.isActive).length,
    pending: profiles.filter((profile) => profile.isActive && !profile.lastLoginAt).length,
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
      setError(caught instanceof Error ? caught.message : 'Profil sa nepodarilo uložiť.')
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
      setError(caught instanceof Error ? caught.message : 'Pozvanie sa nepodarilo odoslať.')
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
      setError(caught instanceof Error ? caught.message : 'Obnovu hesla sa nepodarilo odoslať.')
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
    <PageHeader eyebrow="Administrácia" title="Používatelia a oprávnenia" description="Správa účtov aplikácie, rolí, aktívnosti, organizačných údajov a auditných zmien." actions={<div className="page-actions">{!configured && <button className="button button-secondary" onClick={resetDemoAccounts}><Icon name="refresh"/> Obnoviť demo účty</button>}<button className="button button-primary" onClick={() => setInviteOpen(true)}><Icon name="plus"/> Pozvať používateľa</button></div>} />

    <div className={`environment-banner ${configured ? 'is-cloud' : 'is-local'}`}>
      <Icon name={configured ? 'shield' : 'database'} size={20}/>
      <div><strong>{configured ? 'Supabase Auth je aktívny' : 'Lokálny demo režim'}</strong><span>{configured ? 'Zmeny účtov sa zapisujú do Supabase a chránia pravidlami RLS.' : 'Účty sú uložené iba v tomto prehliadači. Prihlásenie sa aktivuje po nastavení Supabase premenných.'}</span></div>
      <Badge tone={configured ? 'success' : 'warning'}>{configured ? 'produkčný režim' : 'bez reálneho prihlásenia'}</Badge>
    </div>

    <div className="user-kpi-grid">
      <article><span>Všetky účty</span><strong>{counts.total}</strong><small>evidovaných používateľov</small></article>
      <article><span>Aktívne účty</span><strong>{counts.active}</strong><small>môžu používať aplikáciu</small></article>
      <article><span>Administrátori</span><strong>{counts.admins}</strong><small>aktívne správcovské účty</small></article>
      <article><span>Bez prihlásenia</span><strong>{counts.pending}</strong><small>pozvaní alebo demo používatelia</small></article>
    </div>

    <div className="module-tabs user-tabs">
      <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}><Icon name="people" size={18}/> Účty <span>{profiles.length}</span></button>
      <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}><Icon name="shield" size={18}/> Audit zmien <span>{audit.length}</span></button>
    </div>

    {(message || error) && <div className={error ? 'inline-alert inline-alert-error' : 'inline-alert inline-alert-success'}><Icon name={error ? 'warning' : 'check'} size={18}/><span>{error || message}</span></div>}

    {tab === 'users' && <>
      <section className="panel user-toolbar">
        <div className="search-box"><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hľadať podľa mena, e-mailu, útvaru alebo pozície…"/></div>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'all' | AppRole)}><option value="all">Všetky roly</option>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}><option value="all">Všetky stavy</option><option value="active">Aktívne</option><option value="inactive">Deaktivované</option></select>
        <Badge tone="info">{filtered.length} z {profiles.length}</Badge>
      </section>
      <section className="panel users-panel">
        {loading ? <div className="loading-block">Načítavam používateľov…</div> : filtered.length ? <div className="table-scroll"><table className="data-table users-table"><thead><tr><th>Používateľ</th><th>Útvar a pozícia</th><th>Aplikačná rola</th><th>Stav</th><th>Posledné prihlásenie</th><th></th></tr></thead><tbody>{filtered.map((profile) => <tr key={profile.id} className={!profile.isActive ? 'is-inactive' : ''}>
          <td><div className="user-cell"><div className="avatar avatar-small">{initials(profile.fullName || profile.email)}</div><div><strong>{profile.fullName || 'Meno nedoplnené'} {profile.id === currentUserId && <Badge tone="info">Vy</Badge>}</strong><small>{profile.email}</small><small>{profile.phone || 'Telefón nedoplnený'}</small></div></div></td>
          <td><strong className="table-main-value">{profile.department || 'Útvar neurčený'}</strong><small className="table-sub-value">{profile.jobTitle || 'Pozícia neurčená'}</small></td>
          <td><Badge tone={roleTone(profile.role)}>{roleInfo(profile.role).label}</Badge><small className="table-sub-value role-copy">{roleInfo(profile.role).description}</small></td>
          <td><Badge tone={profile.isActive ? 'success' : 'danger'}>{profile.isActive ? 'Aktívny' : 'Deaktivovaný'}</Badge><small className="table-sub-value">{profile.invitedAt ? `Pozvaný ${formatDate(profile.invitedAt)}` : 'Vytvorený priamo'}</small></td>
          <td><strong className="table-main-value">{formatDate(profile.lastLoginAt)}</strong><small className="table-sub-value">Zmena profilu {formatDate(profile.updatedAt)}</small></td>
          <td><div className="row-actions"><button className="icon-button" title="Upraviť profil" onClick={() => setEditProfile(profile)}><Icon name="edit" size={17}/></button><button className="icon-button" title="Odoslať obnovu hesla" disabled={busy || !profile.isActive} onClick={() => void resetPassword(profile)}><Icon name="lock" size={17}/></button></div></td>
        </tr>)}</tbody></table></div> : <div className="empty"><div className="empty-icon"><Icon name="search" size={26}/></div><strong>Žiadny používateľ nezodpovedá filtru</strong><p>Upravte vyhľadávanie alebo filtre.</p></div>}
      </section>
    </>}

    {tab === 'audit' && <section className="panel audit-panel">{loading ? <div className="loading-block">Načítavam audit…</div> : audit.length ? <div className="audit-list">{audit.map((entry) => <article key={entry.id}><div className="audit-icon"><Icon name="shield" size={16}/></div><div><header><strong>{entry.action}</strong><span>{formatDate(entry.createdAt)}</span></header><p>{entry.detail}</p><small>{entry.actorName || 'Systém'} → {entry.targetUserName || 'bez cieľového účtu'}</small></div></article>)}</div> : <div className="empty"><div className="empty-icon"><Icon name="shield" size={26}/></div><strong>Audit je zatiaľ prázdny</strong><p>Záznamy vzniknú pri pozvaní, úprave účtu alebo obnove hesla.</p></div>}</section>}

    {inviteOpen && <Modal title="Pozvať používateľa" onClose={() => setInviteOpen(false)}><div className="form-grid">
      <Field label="Meno a priezvisko"><input value={invite.fullName} onChange={(event) => setInvite({ ...invite, fullName: event.target.value })} placeholder="Meno Priezvisko"/></Field>
      <Field label="Pracovný e-mail"><input type="email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} placeholder="meno@cvtisr.sk"/></Field>
      <Field label="Útvar / oddelenie"><input value={invite.department} onChange={(event) => setInvite({ ...invite, department: event.target.value })} placeholder="Odbor 3.2"/></Field>
      <Field label="Pracovná pozícia"><input value={invite.jobTitle} onChange={(event) => setInvite({ ...invite, jobTitle: event.target.value })} placeholder="Názov pozície"/></Field>
      <Field label="Telefón"><input value={invite.phone} onChange={(event) => setInvite({ ...invite, phone: event.target.value })} placeholder="+421…"/></Field>
      <Field label="Aplikačná rola" hint={roleInfo(invite.role).description}><select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value as AppRole })}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></Field>
    </div><div className="modal-actions"><button className="button button-secondary" onClick={() => setInviteOpen(false)}>Zrušiť</button><button className="button button-primary" disabled={busy || !invite.email || !invite.fullName} onClick={() => void sendInvite()}>{busy ? 'Spracúvam…' : configured ? 'Odoslať pozvanie' : 'Vytvoriť demo účet'}</button></div></Modal>}

    {editProfile && <UserEditModal profile={editProfile} current={editProfile.id === currentUserId} busy={busy} onClose={() => setEditProfile(null)} onSave={save}/>} 
  </div>
}

function UserEditModal({ profile, current, busy, onClose, onSave }: { profile: UserProfile; current: boolean; busy: boolean; onClose: () => void; onSave: (profile: UserProfile) => Promise<void> }) {
  const [draft, setDraft] = useState(profile)
  return <Modal title="Upraviť používateľa" onClose={onClose}><div className="user-edit-header"><div className="avatar avatar-large">{initials(draft.fullName || draft.email)}</div><div><strong>{draft.fullName || draft.email}</strong><span>{draft.email}</span>{current && <Badge tone="info">Aktuálne prihlásený účet</Badge>}</div></div><div className="form-grid">
    <Field label="Meno a priezvisko"><input value={draft.fullName} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })}/></Field>
    <Field label="E-mail"><input value={draft.email} disabled/></Field>
    <Field label="Útvar / oddelenie"><input value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value })}/></Field>
    <Field label="Pracovná pozícia"><input value={draft.jobTitle} onChange={(event) => setDraft({ ...draft, jobTitle: event.target.value })}/></Field>
    <Field label="Telefón"><input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })}/></Field>
    <Field label="Aplikačná rola" hint={roleInfo(draft.role).description}><select value={draft.role} disabled={current} onChange={(event) => setDraft({ ...draft, role: event.target.value as AppRole })}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></Field>
    <Field label="Stav účtu" hint={current ? 'Vlastný účet nemožno deaktivovať.' : 'Deaktivovaný používateľ sa neprihlási.'}><label className="account-status-switch"><input type="checkbox" checked={draft.isActive} disabled={current} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}/><span>{draft.isActive ? 'Aktívny účet' : 'Deaktivovaný účet'}</span></label></Field>
  </div><div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Zrušiť</button><button className="button button-primary" disabled={busy || !draft.fullName.trim()} onClick={() => void onSave(draft)}>{busy ? 'Ukladám…' : 'Uložiť zmeny'}</button></div></Modal>
}
