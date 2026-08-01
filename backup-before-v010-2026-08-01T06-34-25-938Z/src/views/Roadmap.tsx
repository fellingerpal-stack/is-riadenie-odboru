import { useRef, useState } from 'react'
import type { AppRole, AppState, CloudSnapshot, SyncState, UserProfile } from '../types'
import { Badge, Icon, PageHeader } from '../components/UI'

const modules = [
  { phase: 'Fáza 1', status: 'Aktívne', title: 'Riadenie odboru', text: 'Dashboard, roly, RACI, služby, zastupiteľnosť, kapacity, projekty, úlohy, riziká a rozhodnutia.', icon: 'dashboard' as const },
  { phase: 'Fáza 2', status: 'Aktívne', title: 'ServiceDesk / Helpdesk', text: 'Katalóg služieb, požiadavky, incidenty, SLA, fronty, prílohy, eskalácie a reporting.', icon: 'helpdesk' as const },
  { phase: 'Fáza 3', status: 'Aktívne', title: 'Change management', text: 'RFC, posúdenie dopadu a rizika, CAB, plán nasadenia, rollback, release kalendár a auditná stopa.', icon: 'change' as const },
  { phase: 'Fáza 3', status: 'Aktívne', title: 'Problem management', text: 'Evidencia problémov, root cause analysis, známe chyby, workaroundy a prepojenie na incidenty a zmeny.', icon: 'problem' as const },
  { phase: 'Fáza 4', status: 'Aktívne', title: 'IAM a prístupy', text: 'Žiadosti o prístup, schvaľovanie, privilegované oprávnenia, recertifikácia, onboarding a offboarding.', icon: 'iam' as const },
  { phase: 'Fáza 5', status: 'Aktívne', title: 'CMDB a majetok', text: 'Aplikácie, infraštruktúra, zariadenia, licencie, zmluvy, väzby služieb a dopad incidentov.', icon: 'database' as const },
  { phase: 'Fáza 6', status: 'Aktívne', title: 'Prihlásenie a používatelia', text: 'Supabase Auth, účty, aplikačné roly, aktivácia, obnova hesla a audit administrátorských zmien.', icon: 'user' as const },
]
function roleLabel(role: AppRole) {
  if (role === 'admin') return 'Administrátor'
  if (role === 'manager') return 'Riaditeľ / manažér'
  if (role === 'resolver') return 'Riešiteľ'
  if (role === 'employee') return 'Zamestnanec'
  return 'Čitateľ'
}

function syncLabel(sync: SyncState) {
  if (sync === 'saving') return 'Ukladanie do databázy'
  if (sync === 'loading') return 'Načítavanie z databázy'
  if (sync === 'synced') return 'Dáta sú synchronizované'
  if (sync === 'dirty') return 'Lokálne zmeny nie sú uložené'
  if (sync === 'empty') return 'Databáza zatiaľ neobsahuje dáta'
  if (sync === 'error') return 'Synchronizácia zlyhala'
  return 'Lokálny režim'
}

interface RoadmapProps {
  state: AppState
  role: AppRole
  configured: boolean
  profile: UserProfile | null
  sync: SyncState
  snapshot: CloudSnapshot | null
  onRoleChange: (role: AppRole) => void
  onExport: () => void
  onImport: (file: File) => Promise<void>
  onReset: () => void
  onLoadCloud: () => Promise<void>
  onSaveCloud: () => Promise<void>
  onSignOut: () => Promise<void>
}

export default function Roadmap({
  state,
  role,
  configured,
  profile,
  sync,
  snapshot,
  onRoleChange,
  onExport,
  onImport,
  onReset,
  onLoadCloud,
  onSaveCloud,
  onSignOut,
}: RoadmapProps) {
  const input = useRef<HTMLInputElement | null>(null)
  const [message, setMessage] = useState('')

  async function fileSelected(file?: File) {
    if (!file) return
    try {
      await onImport(file)
      setMessage('Dáta boli úspešne importované. Pred pokračovaním ich skontrolujte a uložte do databázy.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import zlyhal.')
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  const canSaveCloud = configured && ['admin','manager','resolver'].includes(role) && sync !== 'saving' && sync !== 'loading' && sync !== 'synced'

  return <>
    <PageHeader
      eyebrow="Rozvoj aplikácie"
      title="Roadmap a nastavenia"
      description="Správa režimu aplikácie, dátových záloh, synchronizácie so Supabase a ďalšieho rozvoja ITSM modulov."
    />

    <section className="settings-grid">
      <article className="panel span-7">
        <div className="panel-heading"><div><span className="eyebrow">Rozvoj</span><h3>Navrhované moduly</h3></div></div>
        <div className="roadmap-list">
          {modules.map((module) => <div className="roadmap-item" key={module.title}>
            <div className="roadmap-icon"><Icon name={module.icon}/></div>
            <div>
              <div><Badge tone={module.status === 'Aktívne' ? 'success' : module.status === 'Ďalší release' ? 'info' : 'neutral'}>{module.status}</Badge><small>{module.phase}</small></div>
              <h4>{module.title}</h4><p>{module.text}</p>
            </div>
          </div>)}
        </div>
      </article>

      <aside className="span-5 settings-side">
        {configured ? <article className="panel">
          <div className="panel-heading"><div><span className="eyebrow">Účet</span><h3>Prihlásený používateľ</h3></div><Badge tone={profile?.isActive ? 'success' : 'danger'}>{profile?.isActive ? 'Aktívny' : 'Neaktívny'}</Badge></div>
          <div className="account-card">
            <div className="avatar">{(profile?.fullName || profile?.email || 'IS').split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}</div>
            <div><strong>{profile?.fullName || 'Bez mena'}</strong><small>{profile?.email}</small><span>{roleLabel(role)}</span></div>
          </div>
          <button className="button button-secondary full-button" onClick={() => void onSignOut()}><Icon name="lock"/> Odhlásiť sa</button>
        </article> : <article className="panel">
          <div className="panel-heading"><div><span className="eyebrow">Testovanie oprávnení</span><h3>Demo rola</h3></div></div>
          <p className="muted-copy">Supabase zatiaľ nie je nakonfigurovaný. Rolu je možné prepínať iba na overenie používateľského rozhrania.</p>
          <select value={role} onChange={(event) => onRoleChange(event.target.value as AppRole)}>
            <option value="admin">Administrátor</option><option value="manager">Riaditeľ / manažér</option><option value="resolver">Riešiteľ</option><option value="employee">Zamestnanec</option><option value="viewer">Čitateľ</option>
          </select>
          <div className="role-info"><Icon name={role === 'viewer' ? 'lock' : role === 'employee' ? 'user' : 'edit'} size={18}/><span>{role === 'viewer' ? 'Režim iba na čítanie.' : role === 'employee' ? 'Používateľský prístup k vlastným požiadavkám.' : role === 'resolver' ? 'Prevádzkové a riešiteľské moduly možno upravovať.' : 'Manažérske údaje možno upravovať.'}</span></div>
        </article>}

        {configured && <article className="panel">
          <div className="panel-heading"><div><span className="eyebrow">Supabase</span><h3>Cloudová synchronizácia</h3></div><Badge tone={sync === 'synced' ? 'success' : sync === 'error' ? 'danger' : sync === 'dirty' ? 'warning' : 'info'}>{syncLabel(sync)}</Badge></div>
          <p className="muted-copy">Načítanie prepíše lokálny pracovný stav poslednou verziou z databázy. Uloženie vytvorí novú verzovanú snímku.</p>
          <div className="stack-buttons">
            <button className="button button-secondary" disabled={sync === 'loading' || sync === 'saving'} onClick={() => void onLoadCloud()}><Icon name="download"/> Načítať z databázy</button>
            {['admin','manager','resolver'].includes(role) && <button className="button button-primary" disabled={!canSaveCloud} onClick={() => void onSaveCloud()}><Icon name="upload"/> Uložiť do databázy</button>}
          </div>
          <div className="version-list cloud-version-list">
            <span>Posledná verzia<strong>{snapshot ? `#${snapshot.version}` : '—'}</strong></span>
            <span>Uložené<strong>{snapshot ? new Date(snapshot.createdAt).toLocaleString('sk-SK') : '—'}</strong></span>
          </div>
        </article>}

        <article className="panel">
          <div className="panel-heading"><div><span className="eyebrow">Záloha</span><h3>Import a export</h3></div></div>
          <p className="muted-copy">JSON export slúži ako nezávislá záloha a na bezpečný prenos medzi testovacím a produkčným prostredím.</p>
          <div className="stack-buttons">
            <button className="button button-secondary" onClick={onExport}><Icon name="download"/> Exportovať JSON</button>
            <button className="button button-secondary" disabled={!['admin','manager','resolver'].includes(role)} onClick={() => input.current?.click()}><Icon name="upload"/> Importovať JSON</button>
            <input ref={input} hidden type="file" accept="application/json" onChange={(event) => void fileSelected(event.target.files?.[0])}/>
            <button className="button button-danger" disabled={!['admin','manager'].includes(role)} onClick={onReset}><Icon name="refresh"/> Obnoviť vzorové dáta</button>
          </div>
          {message && <div className="inline-info">{message}</div>}
        </article>

        <article className="panel">
          <div className="panel-heading"><div><span className="eyebrow">Verzia</span><h3>{state.meta.organization} · {state.meta.unit}</h3></div></div>
          <div className="version-list">
            <span>Release<strong>{state.meta.version}</strong></span>
            <span>Zdrojový stav<strong>{new Date(state.meta.sourceDate).toLocaleDateString('sk-SK')}</strong></span>
            <span>Režim<strong>{configured ? 'Supabase + lokálna cache' : 'localStorage'}</strong></span>
          </div>
        </article>
      </aside>
    </section>
  </>
}
