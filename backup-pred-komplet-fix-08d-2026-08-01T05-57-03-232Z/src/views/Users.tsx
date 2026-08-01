import { useEffect, useMemo, useState } from 'react'
import type { AppRole, UserProfile } from '../types'
import { inviteUser, listProfiles, updateProfile } from '../lib/cloud'
import { Badge, Field, Icon, Modal, PageHeader } from '../components/UI'

function roleLabel(role: AppRole) {
  return role === 'admin' ? 'Administrátor' : role === 'manager' ? 'Manažér' : 'Čitateľ'
}

export default function Users({ currentUserId }: { currentUserId: string }) {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invite, setInvite] = useState({ email: '', fullName: '', role: 'viewer' as AppRole })
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try { setProfiles(await listProfiles()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Používateľov sa nepodarilo načítať.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const activeCount = useMemo(() => profiles.filter(p => p.isActive).length, [profiles])

  async function save(profile: UserProfile) {
    setMessage('')
    setError('')
    try {
      await updateProfile(profile)
      setProfiles(rows => rows.map(row => row.id === profile.id ? profile : row))
      setMessage(`Profil ${profile.fullName || profile.email} bol uložený.`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Profil sa nepodarilo uložiť.') }
  }

  async function sendInvite() {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const result = await inviteUser(invite)
      setMessage(result)
      setInviteOpen(false)
      setInvite({ email: '', fullName: '', role: 'viewer' })
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Pozvanie sa nepodarilo odoslať.') }
    finally { setBusy(false) }
  }

  return <>
    <PageHeader eyebrow="Administrácia" title="Používatelia a oprávnenia" description="Správa členov organizácie, aplikačných rolí a aktívnosti účtov." actions={<button className="button button-primary" onClick={() => setInviteOpen(true)}><Icon name="plus"/> Pozvať používateľa</button>} />
    <div className="summary-strip"><span><strong>{profiles.length}</strong> účtov</span><span><strong>{activeCount}</strong> aktívnych</span><span><strong>{profiles.filter(p => p.role === 'admin').length}</strong> administrátorov</span></div>
    {(message || error) && <div className={error ? 'inline-alert inline-alert-error' : 'inline-alert inline-alert-success'}><Icon name={error ? 'warning' : 'check'} size={18}/><span>{error || message}</span></div>}
    <section className="panel users-panel">
      {loading ? <div className="loading-block">Načítavam používateľov…</div> : <div className="table-scroll"><table className="data-table users-table"><thead><tr><th>Používateľ</th><th>Rola</th><th>Stav</th><th>Posledná zmena</th><th></th></tr></thead><tbody>{profiles.map(profile => <UserRow key={profile.id} profile={profile} current={profile.id === currentUserId} onSave={save}/>)}</tbody></table></div>}
    </section>
    {inviteOpen && <Modal title="Pozvať používateľa" onClose={() => setInviteOpen(false)}><div className="form-grid">
      <Field label="Meno a priezvisko"><input value={invite.fullName} onChange={e => setInvite({...invite, fullName:e.target.value})} placeholder="Meno Priezvisko" /></Field>
      <Field label="Pracovný e-mail"><input type="email" value={invite.email} onChange={e => setInvite({...invite, email:e.target.value})} placeholder="meno@cvtisr.sk" /></Field>
      <Field label="Aplikačná rola"><select value={invite.role} onChange={e => setInvite({...invite, role:e.target.value as AppRole})}><option value="viewer">Čitateľ</option><option value="manager">Manažér</option><option value="admin">Administrátor</option></select></Field>
    </div><div className="modal-actions"><button className="button button-secondary" onClick={() => setInviteOpen(false)}>Zrušiť</button><button className="button button-primary" disabled={busy || !invite.email || !invite.fullName} onClick={() => void sendInvite()}>{busy ? 'Odosielam…' : 'Odoslať pozvanie'}</button></div></Modal>}
  </>
}

function UserRow({ profile, current, onSave }: { profile: UserProfile; current: boolean; onSave: (profile: UserProfile) => Promise<void> }) {
  const [draft, setDraft] = useState(profile)
  const changed = JSON.stringify(draft) !== JSON.stringify(profile)
  useEffect(() => setDraft(profile), [profile])
  return <tr>
    <td><div className="user-cell"><div className="avatar avatar-small">{(draft.fullName || draft.email).split(/\s|@/).filter(Boolean).slice(0,2).map(v => v[0]?.toUpperCase()).join('')}</div><div><input className="inline-name" value={draft.fullName} onChange={e => setDraft({...draft, fullName:e.target.value})}/><small>{draft.email} {current && <Badge tone="info">Vy</Badge>}</small></div></div></td>
    <td><select value={draft.role} onChange={e => setDraft({...draft, role:e.target.value as AppRole})} disabled={current}><option value="viewer">Čitateľ</option><option value="manager">Manažér</option><option value="admin">Administrátor</option></select><small className="role-description">{roleLabel(draft.role)}</small></td>
    <td><label className="switch-label"><input type="checkbox" checked={draft.isActive} disabled={current} onChange={e => setDraft({...draft, isActive:e.target.checked})}/><span>{draft.isActive ? 'Aktívny' : 'Deaktivovaný'}</span></label></td>
    <td><small>{draft.updatedAt ? new Date(draft.updatedAt).toLocaleString('sk-SK') : '—'}</small></td>
    <td><button className="button button-secondary button-small" disabled={!changed} onClick={() => void onSave(draft)}><Icon name="check" size={15}/> Uložiť</button></td>
  </tr>
}
