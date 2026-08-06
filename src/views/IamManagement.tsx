import { useMemo, useState } from 'react'
import type {
  AccessApproval,
  AccessCatalogItem,
  AccessComment,
  AccessRequest,
  Employee,
  RecertificationCampaign,
  RecertificationItem,
  Service,
  Task,
} from '../types'
import { Badge, Empty, Field, Icon, Modal, PageHeader } from '../components/UI'
import type { IamDatabaseState } from '../lib/iamCloud'
import './IamManagement.css'

const requestTypes = ['Nový prístup', 'Zmena prístupu', 'Odobratie prístupu', 'Onboarding', 'Offboarding', 'Dočasný prístup']
const requestStatuses = ['Návrh', 'Na schválenie', 'Schválenie nadriadeným', 'Schválenie vlastníkom', 'Bezpečnostné schválenie', 'Schválená', 'Realizácia', 'Dokončená', 'Zamietnutá', 'Zrušená']
const risks = ['Nízke', 'Stredné', 'Vysoké', 'Kritické']
const closedStatuses = ['Dokončená', 'Zamietnutá', 'Zrušená']
type IamView = 'overview' | 'requests' | 'catalog' | 'recertification'

function databaseStateLabel(state: IamDatabaseState, setupRequired = false) {
  if (setupRequired) return 'Vyžaduje SQL inicializáciu'
  if (state === 'loading') return 'Načítavam z databázy'
  if (state === 'saving') return 'Ukladám zmeny'
  if (state === 'synced') return 'Synchronizované'
  if (state === 'error') return 'Chyba synchronizácie'
  return 'Lokálny režim'
}

type Props = {
  accessRequests: AccessRequest[]
  accessCatalog: AccessCatalogItem[]
  recertificationCampaigns: RecertificationCampaign[]
  services: Service[]
  employees: Employee[]
  tasks: Task[]
  canEdit: boolean
  canConfigure: boolean
  currentUser: string
  databaseMode: 'local' | 'cloud'
  databaseState: IamDatabaseState
  databaseError: string
  onReload: () => void
  onAccessRequestsChange: (items: AccessRequest[]) => void
  onAccessCatalogChange: (items: AccessCatalogItem[]) => void
  onRecertificationCampaignsChange: (items: RecertificationCampaign[]) => void
  onTasksChange: (items: Task[]) => void
}

function nowIso() { return new Date().toISOString() }
function todayIso() { return new Date().toISOString().slice(0, 10) }
function formatDate(value?: string, includeTime = false) {
  if (!value) return 'Neurčené'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Neurčené'
  return date.toLocaleDateString('sk-SK', includeTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function isClosed(status: string) { return closedStatuses.includes(status) }
function isOverdue(item: AccessRequest) { return !isClosed(item.status) && Boolean(item.dueDate) && item.dueDate < todayIso() }
function requestTone(status: string) {
  if (status === 'Dokončená') return 'success' as const
  if (status === 'Zamietnutá' || status === 'Zrušená') return 'danger' as const
  if (status === 'Realizácia' || status === 'Schválená') return 'info' as const
  if (status.includes('schválenie') || status === 'Na schválenie') return 'warning' as const
  return 'neutral' as const
}
function riskTone(risk: string) {
  if (risk === 'Kritické') return 'danger' as const
  if (risk === 'Vysoké') return 'warning' as const
  if (risk === 'Stredné') return 'info' as const
  return 'neutral' as const
}
function nextRequestId(items: AccessRequest[]) {
  const year = new Date().getFullYear()
  const max = items.reduce((value, item) => {
    const match = item.id.match(/IAM-\d{4}-(\d+)/)
    return match ? Math.max(value, Number(match[1])) : value
  }, 0)
  return `IAM-${year}-${String(max + 1).padStart(4, '0')}`
}
function nextCatalogId(items: AccessCatalogItem[]) {
  const max = items.reduce((value, item) => Math.max(value, Number(item.id.replace(/\D/g, '')) || 0), 0)
  return `ACC${String(max + 1).padStart(2, '0')}`
}
function nextCampaignId(items: RecertificationCampaign[]) {
  const year = new Date().getFullYear()
  const max = items.reduce((value, item) => {
    const match = item.id.match(/REC-\d{4}-(\d+)/)
    return match ? Math.max(value, Number(match[1])) : value
  }, 0)
  return `REC-${year}-${String(max + 1).padStart(3, '0')}`
}
function nextTaskId(tasks: Task[]) {
  const max = tasks.reduce((value, task) => Math.max(value, Number(task.id.replace(/\D/g, '')) || 0), 0)
  return `T${String(max + 1).padStart(2, '0')}`
}
function defaultApprovals(manager = '', owner = '', privileged = false): AccessApproval[] {
  const stages = [
    { stage: 'Priamy nadriadený', approver: manager },
    { stage: 'Vlastník služby', approver: owner },
    ...(privileged ? [{ stage: 'Bezpečnosť / administrátor', approver: '' }] : []),
  ]
  return stages.map((stage) => ({ id: crypto.randomUUID(), ...stage, decision: 'Čaká', note: '', decidedAt: '' }))
}
function blankRequest(items: AccessRequest[], currentUser: string): AccessRequest {
  const createdAt = nowIso()
  return {
    id: nextRequestId(items), requestType: 'Nový prístup', subjectName: '', subjectEmail: '', department: '', manager: '', requester: currentUser,
    serviceId: '', catalogItemId: '', requestedAccess: '', currentAccess: '', businessJustification: '', privileged: false, risk: 'Stredné',
    status: 'Návrh', startDate: todayIso(), endDate: '', dueDate: '', assignee: '', linkedTaskId: '', approvals: [], comments: [],
    history: [{ id: crypto.randomUUID(), action: 'Žiadosť bola vytvorená.', author: currentUser, createdAt }], createdAt, updatedAt: createdAt, completedAt: '',
  }
}
function blankCatalog(items: AccessCatalogItem[]): AccessCatalogItem {
  return { id: nextCatalogId(items), name: '', serviceId: '', system: '', description: '', businessOwner: '', technicalOwner: '', risk: 'Stredné', privileged: false, defaultDurationDays: 365, approvalPath: ['Priamy nadriadený', 'Vlastník služby'], isActive: true }
}
function campaignProgress(campaign: RecertificationCampaign) {
  if (!campaign.items.length) return 0
  return Math.round(campaign.items.filter((item) => item.decision && item.decision !== 'Čaká').length / campaign.items.length * 100)
}

export default function IamManagement({ accessRequests, accessCatalog, recertificationCampaigns, services, employees, tasks, canEdit, canConfigure, currentUser, databaseMode, databaseState, databaseError, onReload, onAccessRequestsChange, onAccessCatalogChange, onRecertificationCampaignsChange, onTasksChange }: Props) {
  const [view, setView] = useState<IamView>('overview')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Otvorené')
  const [typeFilter, setTypeFilter] = useState('Všetky')
  const [riskFilter, setRiskFilter] = useState('Všetky')
  const [requestModal, setRequestModal] = useState(false)
  const [catalogModal, setCatalogModal] = useState(false)
  const [campaignModal, setCampaignModal] = useState(false)
  const [draft, setDraft] = useState<AccessRequest>(() => blankRequest(accessRequests, currentUser))
  const [catalogDraft, setCatalogDraft] = useState<AccessCatalogItem>(() => blankCatalog(accessCatalog))
  const [campaignDraft, setCampaignDraft] = useState<RecertificationCampaign | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentInternal, setCommentInternal] = useState(true)

  const setupRequired = databaseState === 'error' && databaseError.includes('IS_Riadenie_odboru_v0.16.1_IAM_DATABASE_FIX.sql')
  const openRequests = accessRequests.filter((item) => !isClosed(item.status))
  const pendingApprovals = openRequests.filter((item) => item.status.includes('schválenie') || item.status === 'Na schválenie').length
  const privilegedOpen = openRequests.filter((item) => item.privileged).length
  const overdue = openRequests.filter(isOverdue).length
  const expiringSoon = accessRequests.filter((item) => {
    if (!item.endDate || isClosed(item.status)) return false
    const days = Math.ceil((new Date(`${item.endDate}T12:00:00`).getTime() - new Date(`${todayIso()}T12:00:00`).getTime()) / 86400000)
    return days >= 0 && days <= 30
  }).length
  const activeCampaigns = recertificationCampaigns.filter((item) => item.status === 'Aktívna').length

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return accessRequests.filter((item) => {
      const catalog = accessCatalog.find((entry) => entry.id === item.catalogItemId)
      const service = services.find((entry) => entry.id === item.serviceId)
      const haystack = `${item.id} ${item.subjectName} ${item.subjectEmail} ${item.requestedAccess} ${item.requester} ${item.assignee} ${catalog?.name || ''} ${service?.name || ''}`.toLowerCase()
      return (!query || haystack.includes(query))
        && (statusFilter === 'Všetky' || (statusFilter === 'Otvorené' ? !isClosed(item.status) : item.status === statusFilter))
        && (typeFilter === 'Všetky' || item.requestType === typeFilter)
        && (riskFilter === 'Všetky' || item.risk === riskFilter)
    }).sort((a, b) => {
      if (isOverdue(a) !== isOverdue(b)) return isOverdue(a) ? -1 : 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [accessRequests, accessCatalog, services, search, statusFilter, typeFilter, riskFilter])

  function openNewRequest() {
    setDraft(blankRequest(accessRequests, currentUser)); setCommentText(''); setRequestModal(true)
  }
  function openRequest(item: AccessRequest) {
    setDraft(structuredClone(item)); setCommentText(''); setRequestModal(true)
  }
  function setRequestField<K extends keyof AccessRequest>(key: K, value: AccessRequest[K]) { setDraft((current) => ({ ...current, [key]: value })) }
  function selectCatalog(catalogId: string) {
    const item = accessCatalog.find((entry) => entry.id === catalogId)
    const service = services.find((entry) => entry.id === item?.serviceId)
    setDraft((current) => ({
      ...current,
      catalogItemId: catalogId,
      serviceId: item?.serviceId || current.serviceId,
      requestedAccess: item?.name || current.requestedAccess,
      privileged: Boolean(item?.privileged),
      risk: item?.risk || current.risk,
      endDate: item?.defaultDurationDays ? new Date(Date.now() + item.defaultDurationDays * 86400000).toISOString().slice(0, 10) : current.endDate,
      approvals: defaultApprovals(current.manager, item?.businessOwner || service?.businessOwner || '', Boolean(item?.privileged)),
    }))
  }
  function rebuildApprovals() {
    const catalog = accessCatalog.find((entry) => entry.id === draft.catalogItemId)
    const service = services.find((entry) => entry.id === draft.serviceId)
    setRequestField('approvals', defaultApprovals(draft.manager, catalog?.businessOwner || service?.businessOwner || '', draft.privileged))
  }
  function updateApproval(id: string, patch: Partial<AccessApproval>) {
    setRequestField('approvals', draft.approvals.map((item) => item.id === id ? { ...item, ...patch } : item))
  }
  function saveRequest() {
    if (!draft.subjectName.trim() || !draft.requestedAccess.trim()) return
    const now = nowIso()
    const original = accessRequests.find((item) => item.id === draft.id)
    const changes: string[] = []
    if (original?.status !== draft.status) changes.push(`Stav: ${original?.status || 'nová'} → ${draft.status}`)
    if (original?.assignee !== draft.assignee) changes.push(`Riešiteľ: ${original?.assignee || 'neurčený'} → ${draft.assignee || 'neurčený'}`)
    const prepared: AccessRequest = {
      ...draft,
      approvals: draft.approvals.length ? draft.approvals : defaultApprovals(draft.manager, '', draft.privileged),
      updatedAt: now,
      completedAt: draft.status === 'Dokončená' ? draft.completedAt || now : '',
      history: changes.length ? [...draft.history, { id: crypto.randomUUID(), action: changes.join(' · '), author: currentUser, createdAt: now }] : draft.history,
    }
    onAccessRequestsChange(original ? accessRequests.map((item) => item.id === prepared.id ? prepared : item) : [prepared, ...accessRequests])
    setRequestModal(false)
  }
  function deleteRequest() {
    if (!confirm(`Odstrániť žiadosť ${draft.id}?`)) return
    onAccessRequestsChange(accessRequests.filter((item) => item.id !== draft.id)); setRequestModal(false)
  }
  function addComment() {
    if (!commentText.trim()) return
    const comment: AccessComment = { id: crypto.randomUUID(), author: currentUser, text: commentText.trim(), internal: commentInternal, createdAt: nowIso() }
    setRequestField('comments', [...draft.comments, comment]); setCommentText('')
  }
  function createProvisioningTask() {
    if (draft.linkedTaskId) return
    const task: Task = {
      id: nextTaskId(tasks), title: `${draft.requestType}: ${draft.subjectName} – ${draft.requestedAccess}`, projectId: '', owner: draft.assignee || currentUser,
      priority: draft.privileged ? 'Vysoká' : 'Stredná', status: 'Návrh', start: todayIso(), due: draft.dueDate, description: draft.businessJustification,
      source: `IAM ${draft.id}`, type: 'IAM', estimateHours: 2, spentHours: 0, progress: 0, dependency: '', note: `Vytvorené zo žiadosti ${draft.id}`, createdAt: nowIso(), updatedAt: nowIso(),
    }
    onTasksChange([task, ...tasks]); setRequestField('linkedTaskId', task.id)
  }

  function openNewCatalog() { if (!canConfigure) return; setCatalogDraft(blankCatalog(accessCatalog)); setCatalogModal(true) }
  function openCatalog(item: AccessCatalogItem) { setCatalogDraft(structuredClone(item)); setCatalogModal(true) }
  function saveCatalog() {
    if (!canConfigure || !catalogDraft.name.trim()) return
    const exists = accessCatalog.some((item) => item.id === catalogDraft.id)
    onAccessCatalogChange(exists ? accessCatalog.map((item) => item.id === catalogDraft.id ? catalogDraft : item) : [catalogDraft, ...accessCatalog])
    setCatalogModal(false)
  }
  function deleteCatalog() {
    if (!canConfigure) return
    if (!confirm(`Odstrániť katalógovú položku ${catalogDraft.name}?`)) return
    onAccessCatalogChange(accessCatalog.filter((item) => item.id !== catalogDraft.id)); setCatalogModal(false)
  }

  function openNewCampaign() {
    if (!canConfigure) return
    const createdAt = nowIso()
    const items: RecertificationItem[] = accessRequests.filter((item) => item.status === 'Dokončená').slice(0, 12).map((request) => ({
      id: crypto.randomUUID(), subjectName: request.subjectName, subjectEmail: request.subjectEmail, catalogItemId: request.catalogItemId,
      accessName: request.requestedAccess, reviewer: request.manager || currentUser, decision: 'Čaká', decisionNote: '', dueDate: '', lastUsedAt: '', privileged: request.privileged,
    }))
    setCampaignDraft({ id: nextCampaignId(recertificationCampaigns), name: '', description: '', owner: currentUser, scope: 'Aktívne prístupy', status: 'Návrh', startDate: todayIso(), dueDate: '', items, createdAt, updatedAt: createdAt })
    setCampaignModal(true)
  }
  function openCampaign(item: RecertificationCampaign) { setCampaignDraft(structuredClone(item)); setCampaignModal(true) }
  function saveCampaign() {
    if (!canConfigure || !campaignDraft || !campaignDraft.name.trim()) return
    const prepared = { ...campaignDraft, updatedAt: nowIso() }
    const exists = recertificationCampaigns.some((item) => item.id === prepared.id)
    onRecertificationCampaignsChange(exists ? recertificationCampaigns.map((item) => item.id === prepared.id ? prepared : item) : [prepared, ...recertificationCampaigns])
    setCampaignModal(false)
  }
  function updateCampaignItem(id: string, patch: Partial<RecertificationItem>) {
    if (!campaignDraft) return
    setCampaignDraft({ ...campaignDraft, items: campaignDraft.items.map((item) => item.id === id ? { ...item, ...patch } : item) })
  }

  const kpis = [
    { label: 'Otvorené žiadosti', value: openRequests.length, detail: `${overdue} po termíne`, icon: 'iam' as const, tone: overdue ? 'danger' : 'info' },
    { label: 'Čaká na schválenie', value: pendingApprovals, detail: 'manažér / vlastník / bezpečnosť', icon: 'check' as const, tone: pendingApprovals ? 'warning' : 'success' },
    { label: 'Privilegované', value: privilegedOpen, detail: 'otvorené rizikové prístupy', icon: 'lock' as const, tone: privilegedOpen ? 'danger' : 'success' },
    { label: 'Končí do 30 dní', value: expiringSoon, detail: 'potrebné predĺžiť alebo odobrať', icon: 'calendar' as const, tone: expiringSoon ? 'warning' : 'success' },
    { label: 'Aktívne recertifikácie', value: activeCampaigns, detail: `${recertificationCampaigns.length} kampaní celkom`, icon: 'refresh' as const, tone: activeCampaigns ? 'purple' : 'neutral' },
  ]

  return <div className="iam-page">
    <PageHeader eyebrow="Identity & Access Management" title="IAM a riadenie prístupov" description="Žiadosti o prístup, schvaľovanie, onboarding, offboarding, privilegované oprávnenia a pravidelná recertifikácia." actions={<div className="iam-page-actions"><button className="button button-secondary" onClick={openNewCampaign} disabled={!canConfigure}><Icon name="refresh"/> Nová recertifikácia</button><button className="button button-primary" onClick={openNewRequest} disabled={!canEdit}><Icon name="plus"/> Nová žiadosť</button></div>} />

    <section className={`iam-db-status iam-db-${setupRequired ? 'setup' : databaseState}`}>
      <div className="iam-db-icon"><Icon name="database"/></div>
      <div><span>Uloženie IAM</span><strong>{databaseMode === 'cloud' ? setupRequired ? 'IAM databáza čaká na inicializáciu' : 'Samostatné Supabase tabuľky' : 'Lokálny pracovný režim'}</strong><small>{databaseError || 'Žiadosti, katalóg a recertifikácie sa ukladajú samostatne a synchronizujú v reálnom čase.'}</small></div>
      <Badge tone={databaseState === 'synced' ? 'success' : setupRequired ? 'warning' : databaseState === 'error' ? 'danger' : databaseState === 'local' ? 'neutral' : 'warning'}>{databaseStateLabel(databaseState, setupRequired)}</Badge>
      {databaseMode === 'cloud' && <button className="button button-secondary" onClick={onReload} disabled={databaseState === 'loading' || databaseState === 'saving'}><Icon name="refresh"/> Obnoviť</button>}
    </section>

    <section className="iam-kpis">{kpis.map((item) => <article className={`iam-kpi iam-kpi-${item.tone}`} key={item.label}><div className="iam-kpi-icon"><Icon name={item.icon}/></div><div><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></div></article>)}</section>

    <div className="iam-tabs">
      <button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}><Icon name="dashboard"/> Prehľad</button>
      <button className={view === 'requests' ? 'active' : ''} onClick={() => setView('requests')}><Icon name="iam"/> Žiadosti <b>{openRequests.length}</b></button>
      <button className={view === 'catalog' ? 'active' : ''} onClick={() => setView('catalog')}><Icon name="services"/> Katalóg prístupov</button>
      <button className={view === 'recertification' ? 'active' : ''} onClick={() => setView('recertification')}><Icon name="refresh"/> Recertifikácia</button>
    </div>

    {view === 'overview' && <section className="iam-overview-grid">
      <article className="panel iam-overview-main"><div className="panel-heading"><div><span className="eyebrow">Operatíva</span><h3>Žiadosti vyžadujúce pozornosť</h3></div><button className="text-button" onClick={() => setView('requests')}>Všetky žiadosti <Icon name="arrow" size={15}/></button></div>
        <div className="iam-priority-list">{openRequests.slice().sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a))).slice(0, 7).map((item) => <button key={item.id} onClick={() => openRequest(item)}><span className="iam-request-id">{item.id}</span><span className="iam-request-main"><strong>{item.subjectName || 'Bez osoby'} · {item.requestedAccess}</strong><small>{item.requestType} · {item.assignee || 'Bez riešiteľa'}</small></span><Badge tone={requestTone(item.status)}>{item.status}</Badge>{isOverdue(item) && <span className="iam-overdue">Po termíne</span>}</button>)}</div>
      </article>
      <article className="panel"><div className="panel-heading"><div><span className="eyebrow">Governance</span><h3>Kontrolné body</h3></div></div><div className="iam-control-list">
        <div><Icon name="lock"/><span><strong>Privilegované prístupy</strong><small>{privilegedOpen} otvorených žiadostí vyžaduje zvýšenú kontrolu.</small></span></div>
        <div><Icon name="calendar"/><span><strong>Časovo obmedzené prístupy</strong><small>{expiringSoon} prístupov končí v nasledujúcich 30 dňoch.</small></span></div>
        <div><Icon name="refresh"/><span><strong>Recertifikácia</strong><small>{activeCampaigns ? `${activeCampaigns} aktívna kampaň.` : 'Nie je otvorená žiadna kampaň.'}</small></span></div>
        <div><Icon name="warning"/><span><strong>Omeškané žiadosti</strong><small>{overdue ? `${overdue} žiadostí prekročilo termín.` : 'Bez omeškaných žiadostí.'}</small></span></div>
      </div></article>
    </section>}

    {view === 'requests' && <>
      <div className="toolbar iam-toolbar"><div className="search-box iam-search"><Icon name="search" size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Číslo, osoba, prístup, služba alebo riešiteľ…"/></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Otvorené</option><option>Všetky</option>{requestStatuses.map((item) => <option key={item}>{item}</option>)}</select><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>Všetky</option>{requestTypes.map((item) => <option key={item}>{item}</option>)}</select><select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}><option>Všetky</option>{risks.map((item) => <option key={item}>{item}</option>)}</select><Badge tone="info">{filtered.length} žiadostí</Badge></div>
      {filtered.length ? <div className="table-shell"><table className="data-table iam-table"><thead><tr><th>Žiadosť</th><th>Osoba a prístup</th><th>Typ</th><th>Riziko</th><th>Stav</th><th>Riešiteľ</th><th>Termín</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} onClick={() => openRequest(item)}><td><strong>{item.id}</strong><small>{formatDate(item.createdAt)}</small></td><td><strong>{item.subjectName}</strong><small>{item.requestedAccess}</small></td><td>{item.requestType}</td><td><Badge tone={riskTone(item.risk)}>{item.risk}</Badge>{item.privileged && <small className="iam-privileged">Privilegovaný</small>}</td><td><Badge tone={requestTone(item.status)}>{item.status}</Badge></td><td>{item.assignee || 'Neurčený'}</td><td className={isOverdue(item) ? 'iam-due-overdue' : ''}>{formatDate(item.dueDate)}{isOverdue(item) && <small>po termíne</small>}</td></tr>)}</tbody></table></div> : <Empty title="Žiadne žiadosti" text="Zmeňte filtre alebo vytvorte novú žiadosť."/>}
    </>}

    {view === 'catalog' && <><div className="iam-section-head"><div><span className="eyebrow">Katalóg oprávnení</span><h2>Štandardizované prístupy</h2><p>Každá položka určuje vlastníka, riziko, platnosť a schvaľovaciu cestu.</p></div><button className="button button-primary" onClick={openNewCatalog} disabled={!canConfigure}><Icon name="plus"/> Nová položka</button></div><div className="iam-catalog-grid">{accessCatalog.map((item) => { const service = services.find((entry) => entry.id === item.serviceId); return <button key={item.id} onClick={() => openCatalog(item)} className={!item.isActive ? 'is-inactive' : ''}><header><span className="iam-catalog-icon"><Icon name={item.privileged ? 'lock' : 'services'}/></span><div><strong>{item.name}</strong><small>{item.id} · {item.system}</small></div><Badge tone={riskTone(item.risk)}>{item.risk}</Badge></header><p>{item.description}</p><dl><div><dt>Služba</dt><dd>{service?.name || 'Neurčená'}</dd></div><div><dt>Vlastník</dt><dd>{item.businessOwner || 'Neurčený'}</dd></div><div><dt>Platnosť</dt><dd>{item.defaultDurationDays ? `${item.defaultDurationDays} dní` : 'Bez obmedzenia'}</dd></div><div><dt>Schválenie</dt><dd>{item.approvalPath.join(' → ')}</dd></div></dl></button>})}</div></>}

    {view === 'recertification' && <><div className="iam-section-head"><div><span className="eyebrow">Pravidelná kontrola</span><h2>Recertifikačné kampane</h2><p>Potvrdenie, odobratie alebo úprava existujúcich prístupov.</p></div><button className="button button-primary" onClick={openNewCampaign} disabled={!canEdit}><Icon name="plus"/> Nová kampaň</button></div><div className="iam-campaign-grid">{recertificationCampaigns.map((campaign) => <button key={campaign.id} onClick={() => openCampaign(campaign)}><header><div><strong>{campaign.name}</strong><small>{campaign.id} · {campaign.scope}</small></div><Badge tone={campaign.status === 'Ukončená' ? 'success' : campaign.status === 'Aktívna' ? 'info' : 'neutral'}>{campaign.status}</Badge></header><p>{campaign.description}</p><div className="iam-campaign-progress"><span><i style={{ width: `${campaignProgress(campaign)}%` }}/></span><strong>{campaignProgress(campaign)} %</strong></div><footer><span>{campaign.items.length} prístupov</span><span>Termín {formatDate(campaign.dueDate)}</span></footer></button>)}</div></>}

    {requestModal && <Modal title={`${draft.id} · ${draft.requestType}`} onClose={() => setRequestModal(false)} wide><div className="iam-modal-layout"><div className="iam-form-column">
      <section className="iam-form-section"><header><span className="eyebrow">Žiadosť</span><h3>Osoba a požadovaný prístup</h3></header><div className="iam-form-grid"><Field label="Typ žiadosti"><select value={draft.requestType} onChange={(event) => setRequestField('requestType', event.target.value)} disabled={!canEdit}>{requestTypes.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Stav"><select value={draft.status} onChange={(event) => setRequestField('status', event.target.value)} disabled={!canEdit}>{requestStatuses.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Riziko"><select value={draft.risk} onChange={(event) => setRequestField('risk', event.target.value)} disabled={!canEdit}>{risks.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Meno osoby"><input value={draft.subjectName} onChange={(event) => setRequestField('subjectName', event.target.value)} disabled={!canEdit}/></Field><Field label="E-mail"><input value={draft.subjectEmail} onChange={(event) => setRequestField('subjectEmail', event.target.value)} disabled={!canEdit}/></Field><Field label="Útvar"><input value={draft.department} onChange={(event) => setRequestField('department', event.target.value)} disabled={!canEdit}/></Field><Field label="Priamy nadriadený"><select value={draft.manager} onChange={(event) => setRequestField('manager', event.target.value)} disabled={!canEdit}><option value="">Neurčený</option>{employees.map((item) => <option key={item.id}>{item.name}</option>)}</select></Field><Field label="Katalógová položka"><select value={draft.catalogItemId} onChange={(event) => selectCatalog(event.target.value)} disabled={!canEdit}><option value="">Vlastný prístup</option>{accessCatalog.filter((item) => item.isActive).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field><Field label="Služba / systém"><select value={draft.serviceId} onChange={(event) => setRequestField('serviceId', event.target.value)} disabled={!canEdit}><option value="">Neurčená</option>{services.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field><Field label="Požadovaný prístup"><input value={draft.requestedAccess} onChange={(event) => setRequestField('requestedAccess', event.target.value)} disabled={!canEdit}/></Field><Field label="Aktuálny prístup"><input value={draft.currentAccess} onChange={(event) => setRequestField('currentAccess', event.target.value)} disabled={!canEdit}/></Field><Field label="Riešiteľ"><select value={draft.assignee} onChange={(event) => setRequestField('assignee', event.target.value)} disabled={!canEdit}><option value="">Neurčený</option>{employees.map((item) => <option key={item.id}>{item.name}</option>)}</select></Field><Field label="Začiatok"><input type="date" value={draft.startDate} onChange={(event) => setRequestField('startDate', event.target.value)} disabled={!canEdit}/></Field><Field label="Koniec platnosti"><input type="date" value={draft.endDate} onChange={(event) => setRequestField('endDate', event.target.value)} disabled={!canEdit}/></Field><Field label="Termín vybavenia"><input type="date" value={draft.dueDate} onChange={(event) => setRequestField('dueDate', event.target.value)} disabled={!canEdit}/></Field><label className="iam-privileged-toggle"><input type="checkbox" checked={draft.privileged} onChange={(event) => setRequestField('privileged', event.target.checked)} disabled={!canEdit}/><span><strong>Privilegovaný prístup</strong><small>Vyžaduje zvýšenú kontrolu a bezpečnostné schválenie.</small></span></label><Field label="Biznis zdôvodnenie"><textarea value={draft.businessJustification} onChange={(event) => setRequestField('businessJustification', event.target.value)} disabled={!canEdit}/></Field></div></section>
      <section className="iam-form-section"><header className="iam-section-actions"><div><span className="eyebrow">Schválenie</span><h3>Schvaľovacia cesta</h3></div><button className="text-button" onClick={rebuildApprovals} disabled={!canEdit}>Obnoviť cestu</button></header><div className="iam-approvals">{draft.approvals.map((item) => <article key={item.id}><div><strong>{item.stage}</strong><small>{item.decidedAt ? formatDate(item.decidedAt, true) : 'Čaká na rozhodnutie'}</small></div><select value={item.approver} onChange={(event) => updateApproval(item.id, { approver: event.target.value })} disabled={!canEdit}><option value="">Neurčený</option>{employees.map((employee) => <option key={employee.id}>{employee.name}</option>)}</select><select value={item.decision} onChange={(event) => updateApproval(item.id, { decision: event.target.value, decidedAt: event.target.value === 'Čaká' ? '' : nowIso() })} disabled={!canEdit}><option>Čaká</option><option>Schválené</option><option>Zamietnuté</option><option>Vrátené</option></select><input value={item.note} onChange={(event) => updateApproval(item.id, { note: event.target.value })} placeholder="Poznámka" disabled={!canEdit}/></article>)}</div></section>
    </div><aside className="iam-side-column"><section className="iam-side-card"><header><h3>Realizácia</h3></header><div className="iam-realization"><div><span>Prepojená úloha</span><strong>{draft.linkedTaskId || 'Nevytvorená'}</strong></div><button className="button button-secondary" onClick={createProvisioningTask} disabled={!canEdit || Boolean(draft.linkedTaskId)}><Icon name="tasks"/> Vytvoriť realizačnú úlohu</button></div></section><section className="iam-side-card"><header><h3>Komentáre</h3></header><div className="iam-comments">{draft.comments.map((item) => <article className={item.internal ? 'is-internal' : ''} key={item.id}><header><strong>{item.author}</strong><span>{formatDate(item.createdAt, true)}</span></header><p>{item.text}</p>{item.internal && <small>Interná poznámka</small>}</article>)}</div><div className="iam-comment-editor"><textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Pridať komentár…"/><label><input type="checkbox" checked={commentInternal} onChange={(event) => setCommentInternal(event.target.checked)}/> Interná poznámka</label><button className="button button-secondary" onClick={addComment} disabled={!canEdit || !commentText.trim()}>Pridať</button></div></section><section className="iam-side-card"><header><h3>História</h3></header><div className="iam-history">{draft.history.slice().reverse().map((item) => <article key={item.id}><span/><div><strong>{item.action}</strong><small>{item.author} · {formatDate(item.createdAt, true)}</small></div></article>)}</div></section></aside></div><div className="modal-actions split-actions"><div>{accessRequests.some((item) => item.id === draft.id) && <button className="button button-danger" onClick={deleteRequest} disabled={!canEdit}><Icon name="trash"/> Odstrániť</button>}</div><div><button className="button button-secondary" onClick={() => setRequestModal(false)}>Zrušiť</button><button className="button button-primary" onClick={saveRequest} disabled={!canEdit || !draft.subjectName.trim() || !draft.requestedAccess.trim()}>Uložiť žiadosť</button></div></div></Modal>}

    {catalogModal && <Modal title={`${catalogDraft.id} · Katalógová položka`} onClose={() => setCatalogModal(false)}><div className="iam-catalog-form"><Field label="Názov"><input value={catalogDraft.name} onChange={(event) => setCatalogDraft({ ...catalogDraft, name: event.target.value })} disabled={!canConfigure}/> </Field><Field label="Systém / rola"><input value={catalogDraft.system} onChange={(event) => setCatalogDraft({ ...catalogDraft, system: event.target.value })} disabled={!canConfigure}/> </Field><Field label="Služba"><select value={catalogDraft.serviceId} onChange={(event) => setCatalogDraft({ ...catalogDraft, serviceId: event.target.value })} disabled={!canConfigure}><option value="">Neurčená</option>{services.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field><Field label="Riziko"><select value={catalogDraft.risk} onChange={(event) => setCatalogDraft({ ...catalogDraft, risk: event.target.value })} disabled={!canConfigure}>{risks.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Biznis vlastník"><input value={catalogDraft.businessOwner} onChange={(event) => setCatalogDraft({ ...catalogDraft, businessOwner: event.target.value })} disabled={!canConfigure}/> </Field><Field label="Technický vlastník"><input value={catalogDraft.technicalOwner} onChange={(event) => setCatalogDraft({ ...catalogDraft, technicalOwner: event.target.value })} disabled={!canConfigure}/> </Field><Field label="Predvolená platnosť (dni)"><input type="number" min="0" value={catalogDraft.defaultDurationDays} onChange={(event) => setCatalogDraft({ ...catalogDraft, defaultDurationDays: Number(event.target.value) })} disabled={!canConfigure}/> </Field><label className="iam-checkbox"><input type="checkbox" checked={catalogDraft.privileged} onChange={(event) => setCatalogDraft({ ...catalogDraft, privileged: event.target.checked })} disabled={!canConfigure}/> Privilegovaný prístup</label><label className="iam-checkbox"><input type="checkbox" checked={catalogDraft.isActive} onChange={(event) => setCatalogDraft({ ...catalogDraft, isActive: event.target.checked })} disabled={!canConfigure}/> Aktívna položka</label><Field label="Opis"><textarea value={catalogDraft.description} onChange={(event) => setCatalogDraft({ ...catalogDraft, description: event.target.value })} disabled={!canConfigure}/> </Field></div><div className="modal-actions split-actions"><div>{accessCatalog.some((item) => item.id === catalogDraft.id) && <button className="button button-danger" onClick={deleteCatalog} disabled={!canConfigure}><Icon name="trash"/> Odstrániť</button>}</div><div><button className="button button-secondary" onClick={() => setCatalogModal(false)}>Zrušiť</button><button className="button button-primary" onClick={saveCatalog} disabled={!canConfigure || !catalogDraft.name.trim()}>Uložiť</button></div></div></Modal>}

    {campaignModal && campaignDraft && <Modal title={`${campaignDraft.id} · Recertifikácia`} onClose={() => setCampaignModal(false)} wide><div className="iam-campaign-form"><div className="iam-campaign-fields"><Field label="Názov kampane"><input value={campaignDraft.name} onChange={(event) => setCampaignDraft({ ...campaignDraft, name: event.target.value })} disabled={!canConfigure}/></Field><Field label="Stav"><select value={campaignDraft.status} onChange={(event) => setCampaignDraft({ ...campaignDraft, status: event.target.value })} disabled={!canConfigure}><option>Návrh</option><option>Aktívna</option><option>Ukončená</option><option>Zrušená</option></select></Field><Field label="Vlastník"><input value={campaignDraft.owner} onChange={(event) => setCampaignDraft({ ...campaignDraft, owner: event.target.value })} disabled={!canConfigure}/></Field><Field label="Rozsah"><input value={campaignDraft.scope} onChange={(event) => setCampaignDraft({ ...campaignDraft, scope: event.target.value })} disabled={!canConfigure}/></Field><Field label="Začiatok"><input type="date" value={campaignDraft.startDate} onChange={(event) => setCampaignDraft({ ...campaignDraft, startDate: event.target.value })} disabled={!canConfigure}/></Field><Field label="Termín"><input type="date" value={campaignDraft.dueDate} onChange={(event) => setCampaignDraft({ ...campaignDraft, dueDate: event.target.value })} disabled={!canConfigure}/></Field><Field label="Opis"><textarea value={campaignDraft.description} onChange={(event) => setCampaignDraft({ ...campaignDraft, description: event.target.value })} disabled={!canConfigure}/></Field></div><div className="iam-recert-table"><table className="data-table"><thead><tr><th>Osoba</th><th>Prístup</th><th>Recenzent</th><th>Rozhodnutie</th><th>Poznámka</th></tr></thead><tbody>{campaignDraft.items.map((item) => <tr key={item.id}><td><strong>{item.subjectName}</strong><small>{item.subjectEmail}</small></td><td>{item.accessName}{item.privileged && <small className="iam-privileged">Privilegovaný</small>}</td><td><input value={item.reviewer} onChange={(event) => updateCampaignItem(item.id, { reviewer: event.target.value })} disabled={!canConfigure}/></td><td><select value={item.decision} onChange={(event) => updateCampaignItem(item.id, { decision: event.target.value })} disabled={!canConfigure}><option>Čaká</option><option>Ponechať</option><option>Odobrať</option><option>Upraviť</option></select></td><td><input value={item.decisionNote} onChange={(event) => updateCampaignItem(item.id, { decisionNote: event.target.value })} disabled={!canConfigure}/></td></tr>)}</tbody></table></div></div><div className="modal-actions"><button className="button button-secondary" onClick={() => setCampaignModal(false)}>Zrušiť</button><button className="button button-primary" onClick={saveCampaign} disabled={!canConfigure || !campaignDraft.name.trim()}>Uložiť kampaň</button></div></Modal>}
  </div>
}
