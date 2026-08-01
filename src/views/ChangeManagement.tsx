import { useMemo, useState } from 'react'
import type { ChangeApproval, ChangeRequest, Employee, Project, Service, Task, Ticket } from '../types'
import { Badge, Empty, Field, Icon, Modal, PageHeader } from '../components/UI'
import './ChangeManagement.css'

const statuses = ['Návrh', 'Posúdenie', 'Čaká na schválenie', 'Schválená', 'Naplánovaná', 'Realizácia', 'Validácia', 'Dokončená', 'Zamietnutá', 'Rollback', 'Zrušená']
const types = ['Štandardná', 'Normálna', 'Núdzová']
const priorities = ['Kritická', 'Vysoká', 'Stredná', 'Nízka']
const risks = ['Kritické', 'Vysoké', 'Stredné', 'Nízke']
const impacts = ['Organizácia', 'Viac útvarov', 'Jeden útvar', 'Jednotlivci']
const categories = ['Aplikácia', 'Infraštruktúra', 'Web a obsah', 'Bezpečnosť', 'Dáta', 'Prístupy', 'Proces', 'Iné']
const closedStatuses = ['Dokončená', 'Zamietnutá', 'Rollback', 'Zrušená']

type ChangeView = 'board' | 'list' | 'calendar'

type Props = {
  changes: ChangeRequest[]
  services: Service[]
  employees: Employee[]
  tickets: Ticket[]
  projects: Project[]
  tasks: Task[]
  canEdit: boolean
  currentUser: string
  onChangesChange: (changes: ChangeRequest[]) => void
  onTasksChange: (tasks: Task[]) => void
}

function nowIso() { return new Date().toISOString() }
function todayIso() { return new Date().toISOString().slice(0, 10) }
function safeDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
function formatDate(value?: string, time = false) {
  const date = safeDate(value)
  if (!date) return 'Neurčené'
  return date.toLocaleDateString('sk-SK', time
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function isClosed(status: string) { return closedStatuses.includes(status) }
function isOverdue(change: ChangeRequest) {
  return !isClosed(change.status) && Boolean(change.plannedEnd) && change.plannedEnd < todayIso()
}
function statusTone(status: string) {
  if (status === 'Dokončená') return 'success' as const
  if (status === 'Zamietnutá' || status === 'Rollback' || status === 'Zrušená') return 'danger' as const
  if (status === 'Čaká na schválenie' || status === 'Validácia') return 'warning' as const
  if (status === 'Schválená' || status === 'Naplánovaná' || status === 'Realizácia') return 'info' as const
  return 'neutral' as const
}
function riskTone(risk: string) {
  if (risk === 'Kritické') return 'danger' as const
  if (risk === 'Vysoké') return 'warning' as const
  if (risk === 'Stredné') return 'info' as const
  return 'success' as const
}
function generateChangeId(changes: ChangeRequest[]) {
  const year = new Date().getFullYear()
  const max = changes.reduce((value, change) => {
    const match = change.id.match(/CHG-\d{4}-(\d+)/)
    return match ? Math.max(value, Number(match[1])) : value
  }, 0)
  return `CHG-${year}-${String(max + 1).padStart(4, '0')}`
}
function generateTaskId(tasks: Task[]) {
  const max = tasks.reduce((value, task) => {
    const match = task.id.match(/T(\d+)/)
    return match ? Math.max(value, Number(match[1])) : value
  }, 0)
  return `T${String(max + 1).padStart(2, '0')}`
}
function newApproval(role: string, approver = ''): ChangeApproval {
  return { id: crypto.randomUUID(), role, approver, decision: 'Čaká', note: '', decidedAt: '' }
}
function blankChange(changes: ChangeRequest[], currentUser: string): ChangeRequest {
  const createdAt = nowIso()
  return {
    id: generateChangeId(changes),
    title: '',
    description: '',
    type: 'Normálna',
    category: 'Aplikácia',
    serviceId: '',
    requester: currentUser,
    owner: currentUser,
    approver: '',
    priority: 'Stredná',
    risk: 'Stredné',
    impact: 'Jeden útvar',
    status: 'Návrh',
    reason: '',
    plannedStart: '',
    plannedEnd: '',
    outageMinutes: 0,
    implementationPlan: '',
    testPlan: '',
    rollbackPlan: '',
    communicationPlan: '',
    affectedSystems: '',
    linkedTicketIds: [],
    linkedProjectId: '',
    linkedTaskId: '',
    createdAt,
    updatedAt: createdAt,
    completedAt: '',
    validationResult: '',
    approvals: [newApproval('Vecný vlastník'), newApproval('Technický vlastník'), newApproval('Bezpečnosť / prevádzka')],
    history: [{ id: crypto.randomUUID(), action: 'Požiadavka na zmenu bola vytvorená.', author: currentUser, createdAt }],
  }
}

const boardGroups = [
  { key: 'prepare', label: 'Príprava', statuses: ['Návrh', 'Posúdenie'] },
  { key: 'approve', label: 'Schvaľovanie', statuses: ['Čaká na schválenie'] },
  { key: 'schedule', label: 'Schválené a plánované', statuses: ['Schválená', 'Naplánovaná'] },
  { key: 'execute', label: 'Realizácia', statuses: ['Realizácia', 'Validácia'] },
  { key: 'closed', label: 'Ukončené', statuses: ['Dokončená', 'Zamietnutá', 'Rollback', 'Zrušená'] },
]

export default function ChangeManagement({ changes, services, employees, tickets, projects, tasks, canEdit, currentUser, onChangesChange, onTasksChange }: Props) {
  const safeChanges = Array.isArray(changes) ? changes : []
  const [view, setView] = useState<ChangeView>('board')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Všetky')
  const [typeFilter, setTypeFilter] = useState('Všetky')
  const [serviceFilter, setServiceFilter] = useState('Všetky')
  const [editing, setEditing] = useState<ChangeRequest | null>(null)
  const [selected, setSelected] = useState<ChangeRequest | null>(null)

  const filtered = useMemo(() => safeChanges.filter((change) => {
    const needle = search.trim().toLowerCase()
    const service = services.find((item) => item.id === change.serviceId)?.name ?? ''
    const matchesSearch = !needle || [change.id, change.title, change.description, change.owner, change.requester, service, change.affectedSystems].some((value) => String(value).toLowerCase().includes(needle))
    return matchesSearch
      && (statusFilter === 'Všetky' || change.status === statusFilter)
      && (typeFilter === 'Všetky' || change.type === typeFilter)
      && (serviceFilter === 'Všetky' || change.serviceId === serviceFilter)
  }), [safeChanges, search, statusFilter, typeFilter, serviceFilter, services])

  const metrics = useMemo(() => ({
    open: safeChanges.filter((change) => !isClosed(change.status)).length,
    approval: safeChanges.filter((change) => change.status === 'Čaká na schválenie').length,
    scheduled: safeChanges.filter((change) => ['Schválená', 'Naplánovaná'].includes(change.status)).length,
    emergency: safeChanges.filter((change) => change.type === 'Núdzová' && !isClosed(change.status)).length,
    overdue: safeChanges.filter(isOverdue).length,
    rollback: safeChanges.filter((change) => change.status === 'Rollback').length,
  }), [safeChanges])

  function saveChange(change: ChangeRequest) {
    const exists = safeChanges.some((item) => item.id === change.id)
    const updatedAt = nowIso()
    const previous = safeChanges.find((item) => item.id === change.id)
    const statusChanged = previous && previous.status !== change.status
    const history = [...(Array.isArray(change.history) ? change.history : [])]
    if (statusChanged) history.unshift({ id: crypto.randomUUID(), action: `Stav zmenený z „${previous.status}“ na „${change.status}“.`, author: currentUser, createdAt: updatedAt })
    const saved = { ...change, updatedAt, completedAt: change.status === 'Dokončená' ? (change.completedAt || updatedAt) : change.completedAt, history }
    onChangesChange(exists ? safeChanges.map((item) => item.id === saved.id ? saved : item) : [saved, ...safeChanges])
    setEditing(null)
    if (selected?.id === saved.id) setSelected(saved)
  }

  function removeChange(id: string) {
    if (!confirm('Naozaj odstrániť túto požiadavku na zmenu?')) return
    onChangesChange(safeChanges.filter((item) => item.id !== id))
    setSelected(null)
  }

  function updateApproval(change: ChangeRequest, approvalId: string, decision: string) {
    const decidedAt = nowIso()
    const approvals = change.approvals.map((approval) => approval.id === approvalId
      ? { ...approval, decision, decidedAt: decision === 'Čaká' ? '' : decidedAt, approver: approval.approver || currentUser }
      : approval)
    const rejected = approvals.some((approval) => approval.decision === 'Zamietnuté')
    const allApproved = approvals.length > 0 && approvals.every((approval) => approval.decision === 'Schválené')
    const nextStatus = rejected ? 'Zamietnutá' : allApproved && change.status === 'Čaká na schválenie' ? 'Schválená' : change.status
    const history = [{ id: crypto.randomUUID(), action: `${approvals.find((item) => item.id === approvalId)?.role}: ${decision}.`, author: currentUser, createdAt: decidedAt }, ...change.history]
    const updated = { ...change, approvals, status: nextStatus, history, updatedAt: decidedAt }
    onChangesChange(safeChanges.map((item) => item.id === change.id ? updated : item))
    setSelected(updated)
  }

  function createLinkedTask(change: ChangeRequest) {
    if (change.linkedTaskId) return
    const id = generateTaskId(tasks)
    const task: Task = {
      id,
      title: `Zmena ${change.id}: ${change.title}`,
      projectId: change.linkedProjectId,
      owner: change.owner,
      priority: change.priority,
      status: change.status === 'Naplánovaná' ? 'Plánované' : 'Návrh',
      start: change.plannedStart,
      due: change.plannedEnd,
      description: change.implementationPlan || change.description,
      source: `Change management · ${change.id}`,
      type: 'Zmena',
      estimateHours: 0,
      spentHours: 0,
      progress: 0,
      dependency: '',
      note: `Rollback: ${change.rollbackPlan || 'nezadaný'}`,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    onTasksChange([task, ...tasks])
    const updated = { ...change, linkedTaskId: id, updatedAt: nowIso(), history: [{ id: crypto.randomUUID(), action: `Vytvorená prepojená úloha ${id}.`, author: currentUser, createdAt: nowIso() }, ...change.history] }
    onChangesChange(safeChanges.map((item) => item.id === change.id ? updated : item))
    setSelected(updated)
  }

  return <div className="change-page">
    <PageHeader eyebrow="ITSM · RIADENIE ZMIEN" title="Change management" description="Riadenie požiadaviek na zmenu od návrhu cez posúdenie a schválenie až po realizáciu, validáciu a uzatvorenie."
      actions={canEdit ? <button className="button button-primary" onClick={() => setEditing(blankChange(safeChanges, currentUser))}><Icon name="plus" size={17}/> Nová zmena</button> : undefined}/>

    <section className="change-kpis">
      <article><span className="change-kpi-icon tone-blue"><Icon name="change"/></span><div><small>Otvorené zmeny</small><strong>{metrics.open}</strong><p>v aktívnom životnom cykle</p></div></article>
      <article><span className="change-kpi-icon tone-orange"><Icon name="decision"/></span><div><small>Čaká na schválenie</small><strong>{metrics.approval}</strong><p>vyžaduje rozhodnutie</p></div></article>
      <article><span className="change-kpi-icon tone-teal"><Icon name="calendar"/></span><div><small>Schválené / plánované</small><strong>{metrics.scheduled}</strong><p>pripravené na realizáciu</p></div></article>
      <article><span className="change-kpi-icon tone-red"><Icon name="warning"/></span><div><small>Núdzové zmeny</small><strong>{metrics.emergency}</strong><p>otvorené urgentné zásahy</p></div></article>
      <article className={metrics.overdue ? 'is-alert' : ''}><span className="change-kpi-icon tone-purple"><Icon name="calendar"/></span><div><small>Po termíne</small><strong>{metrics.overdue}</strong><p>vyžaduje zásah</p></div></article>
      <article className={metrics.rollback ? 'is-alert' : ''}><span className="change-kpi-icon tone-red"><Icon name="refresh"/></span><div><small>Rollback</small><strong>{metrics.rollback}</strong><p>neúspešné realizácie</p></div></article>
    </section>

    <section className="change-control-card">
      <div className="change-view-tabs">
        <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}><Icon name="matrix" size={17}/> Kanban</button>
        <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><Icon name="tasks" size={17}/> Register</button>
        <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}><Icon name="calendar" size={17}/> Kalendár zmien</button>
      </div>
      <div className="change-toolbar">
        <label className="change-search"><Icon name="search" size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hľadať zmenu, vlastníka, systém alebo službu..."/></label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Všetky</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>Všetky</option>{types.map((type) => <option key={type}>{type}</option>)}</select>
        <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}><option value="Všetky">Všetky služby</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select>
        <button className="button button-secondary" onClick={() => { setSearch(''); setStatusFilter('Všetky'); setTypeFilter('Všetky'); setServiceFilter('Všetky') }}><Icon name="refresh" size={15}/> Zrušiť filtre</button>
      </div>
    </section>

    {view === 'board' && <section className="change-board">
      {boardGroups.map((group) => {
        const rows = filtered.filter((change) => group.statuses.includes(change.status))
        return <div className="change-column" key={group.key}>
          <header><strong>{group.label}</strong><span>{rows.length}</span></header>
          <div>{rows.length ? rows.map((change) => <ChangeCard key={change.id} change={change} service={services.find((service) => service.id === change.serviceId)} onOpen={() => setSelected(change)}/>) : <div className="change-column-empty">Bez zmien</div>}</div>
        </div>
      })}
    </section>}

    {view === 'list' && <section className="change-register panel">
      <header className="panel-header"><div><span className="eyebrow">REGISTER ZMIEN</span><h2>{filtered.length} záznamov</h2></div></header>
      {filtered.length ? <div className="change-table-wrap"><table className="change-table"><thead><tr><th>ID a názov</th><th>Typ</th><th>Služba</th><th>Vlastník</th><th>Riziko</th><th>Plán</th><th>Stav</th></tr></thead><tbody>{filtered.map((change) => <tr key={change.id} onClick={() => setSelected(change)}><td><strong>{change.id}</strong><span>{change.title}</span></td><td>{change.type}</td><td>{services.find((service) => service.id === change.serviceId)?.name || 'Bez služby'}</td><td>{change.owner || 'Neurčený'}</td><td><Badge tone={riskTone(change.risk)}>{change.risk}</Badge></td><td><span>{formatDate(change.plannedStart)} – {formatDate(change.plannedEnd)}</span>{isOverdue(change) && <small className="change-overdue">Po termíne</small>}</td><td><Badge tone={statusTone(change.status)}>{change.status}</Badge></td></tr>)}</tbody></table></div> : <Empty title="Žiadne zmeny" text="Upravte filtre alebo vytvorte novú požiadavku na zmenu."/>}
    </section>}

    {view === 'calendar' && <ChangeCalendar changes={filtered} services={services} onOpen={setSelected}/>} 

    {editing && <ChangeForm change={editing} services={services} employees={employees} tickets={tickets} projects={projects} onClose={() => setEditing(null)} onSave={saveChange}/>} 
    {selected && <ChangeDetail change={selected} service={services.find((service) => service.id === selected.serviceId)} tickets={tickets} projects={projects} task={tasks.find((task) => task.id === selected.linkedTaskId)} canEdit={canEdit} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setSelected(null) }} onRemove={() => removeChange(selected.id)} onApproval={(approvalId, decision) => updateApproval(selected, approvalId, decision)} onCreateTask={() => createLinkedTask(selected)}/>} 
  </div>
}

function ChangeCard({ change, service, onOpen }: { change: ChangeRequest; service?: Service; onOpen: () => void }) {
  const approved = change.approvals.filter((approval) => approval.decision === 'Schválené').length
  return <button className={`change-card ${isOverdue(change) ? 'is-overdue' : ''}`} onClick={onOpen}>
    <div className="change-card-top"><span>{change.id}</span><Badge tone={riskTone(change.risk)}>{change.risk}</Badge></div>
    <strong>{change.title || 'Bez názvu'}</strong>
    <p>{service?.name || change.affectedSystems || 'Bez väzby na službu'}</p>
    <div className="change-card-meta"><span><Icon name="user" size={13}/>{change.owner || 'Neurčený'}</span><span><Icon name="calendar" size={13}/>{formatDate(change.plannedStart)}</span></div>
    <div className="change-card-footer"><Badge tone={statusTone(change.status)}>{change.status}</Badge><small>{approved}/{change.approvals.length} schválení</small></div>
  </button>
}

function ChangeCalendar({ changes, services, onOpen }: { changes: ChangeRequest[]; services: Service[]; onOpen: (change: ChangeRequest) => void }) {
  const sorted = [...changes].filter((change) => change.plannedStart || change.plannedEnd).sort((a, b) => (a.plannedStart || a.plannedEnd).localeCompare(b.plannedStart || b.plannedEnd))
  return <section className="change-calendar panel">
    <header className="panel-header"><div><span className="eyebrow">PLÁN ZMIEN</span><h2>Kalendár plánovaných zásahov</h2></div></header>
    {sorted.length ? <div className="change-calendar-list">{sorted.map((change) => <button key={change.id} onClick={() => onOpen(change)}><time><strong>{formatDate(change.plannedStart)}</strong><small>{change.plannedStart ? 'začiatok' : 'neurčené'}</small></time><span className={`change-calendar-line risk-${change.risk.toLowerCase().replace('é', 'e')}`}/><div><header><strong>{change.id} · {change.title}</strong><Badge tone={statusTone(change.status)}>{change.status}</Badge></header><p>{services.find((service) => service.id === change.serviceId)?.name || change.affectedSystems || 'Bez služby'} · vlastník: {change.owner || 'neurčený'}</p><small>Koniec: {formatDate(change.plannedEnd)} · výpadok: {change.outageMinutes || 0} min.</small></div></button>)}</div> : <Empty title="Kalendár je prázdny" text="Zmeny s plánovaným termínom sa zobrazia na tejto časovej osi."/>}
  </section>
}

function ChangeForm({ change, services, employees, tickets, projects, onClose, onSave }: { change: ChangeRequest; services: Service[]; employees: Employee[]; tickets: Ticket[]; projects: Project[]; onClose: () => void; onSave: (change: ChangeRequest) => void }) {
  const [draft, setDraft] = useState<ChangeRequest>(() => structuredClone(change))
  const set = <K extends keyof ChangeRequest>(key: K, value: ChangeRequest[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const toggleTicket = (id: string) => set('linkedTicketIds', draft.linkedTicketIds.includes(id) ? draft.linkedTicketIds.filter((item) => item !== id) : [...draft.linkedTicketIds, id])
  const valid = draft.title.trim() && draft.owner.trim() && draft.reason.trim()
  return <Modal title={`${change.title ? 'Upraviť' : 'Nová'} požiadavka na zmenu · ${draft.id}`} onClose={onClose} wide>
    <div className="change-form-grid">
      <Field label="Názov zmeny"><input value={draft.title} onChange={(event) => set('title', event.target.value)} placeholder="Stručný a jednoznačný názov"/></Field>
      <Field label="Stav"><select value={draft.status} onChange={(event) => set('status', event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></Field>
      <Field label="Typ zmeny"><select value={draft.type} onChange={(event) => set('type', event.target.value)}>{types.map((type) => <option key={type}>{type}</option>)}</select></Field>
      <Field label="Kategória"><select value={draft.category} onChange={(event) => set('category', event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field>
      <Field label="Služba / systém"><select value={draft.serviceId} onChange={(event) => set('serviceId', event.target.value)}><option value="">Bez väzby</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></Field>
      <Field label="Vlastník realizácie"><select value={draft.owner} onChange={(event) => set('owner', event.target.value)}><option value="">Neurčený</option>{employees.map((employee) => <option key={employee.id}>{employee.name}</option>)}</select></Field>
      <Field label="Žiadateľ"><input value={draft.requester} onChange={(event) => set('requester', event.target.value)}/></Field>
      <Field label="Schvaľovateľ"><select value={draft.approver} onChange={(event) => set('approver', event.target.value)}><option value="">Neurčený</option>{employees.map((employee) => <option key={employee.id}>{employee.name}</option>)}</select></Field>
      <Field label="Priorita"><select value={draft.priority} onChange={(event) => set('priority', event.target.value)}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></Field>
      <Field label="Riziko"><select value={draft.risk} onChange={(event) => set('risk', event.target.value)}>{risks.map((risk) => <option key={risk}>{risk}</option>)}</select></Field>
      <Field label="Dopad"><select value={draft.impact} onChange={(event) => set('impact', event.target.value)}>{impacts.map((impact) => <option key={impact}>{impact}</option>)}</select></Field>
      <Field label="Predpokladaný výpadok (min.)"><input type="number" min="0" value={draft.outageMinutes} onChange={(event) => set('outageMinutes', Number(event.target.value))}/></Field>
      <Field label="Plánovaný začiatok"><input type="datetime-local" value={draft.plannedStart} onChange={(event) => set('plannedStart', event.target.value)}/></Field>
      <Field label="Plánovaný koniec"><input type="datetime-local" value={draft.plannedEnd} onChange={(event) => set('plannedEnd', event.target.value)}/></Field>
      <Field label="Projekt"><select value={draft.linkedProjectId} onChange={(event) => set('linkedProjectId', event.target.value)}><option value="">Bez projektu</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
      <Field label="Dotknuté systémy"><input value={draft.affectedSystems} onChange={(event) => set('affectedSystems', event.target.value)} placeholder="Systémy, komponenty, integrácie"/></Field>
      <Field label="Opis zmeny"><textarea value={draft.description} onChange={(event) => set('description', event.target.value)} placeholder="Čo sa má zmeniť?"/></Field>
      <Field label="Dôvod a očakávaný prínos"><textarea value={draft.reason} onChange={(event) => set('reason', event.target.value)} placeholder="Prečo je zmena potrebná?"/></Field>
      <Field label="Implementačný plán"><textarea value={draft.implementationPlan} onChange={(event) => set('implementationPlan', event.target.value)} placeholder="Kroky realizácie, zodpovednosti a poradie"/></Field>
      <Field label="Testovací a validačný plán"><textarea value={draft.testPlan} onChange={(event) => set('testPlan', event.target.value)} placeholder="Ako sa overí úspešnosť zmeny?"/></Field>
      <Field label="Rollback plán"><textarea value={draft.rollbackPlan} onChange={(event) => set('rollbackPlan', event.target.value)} placeholder="Podmienky a postup návratu"/></Field>
      <Field label="Komunikačný plán"><textarea value={draft.communicationPlan} onChange={(event) => set('communicationPlan', event.target.value)} placeholder="Koho, kedy a ako informovať"/></Field>
      <div className="change-ticket-links"><strong>Prepojené tickety</strong><div>{tickets.map((ticket) => <label key={ticket.id}><input type="checkbox" checked={draft.linkedTicketIds.includes(ticket.id)} onChange={() => toggleTicket(ticket.id)}/><span>{ticket.id} · {ticket.title}</span></label>)}</div></div>
    </div>
    <div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Zrušiť</button><button className="button button-primary" disabled={!valid} onClick={() => onSave(draft)}><Icon name="check" size={16}/> Uložiť zmenu</button></div>
  </Modal>
}

function ChangeDetail({ change, service, tickets, projects, task, canEdit, onClose, onEdit, onRemove, onApproval, onCreateTask }: { change: ChangeRequest; service?: Service; tickets: Ticket[]; projects: Project[]; task?: Task; canEdit: boolean; onClose: () => void; onEdit: () => void; onRemove: () => void; onApproval: (approvalId: string, decision: string) => void; onCreateTask: () => void }) {
  return <Modal title={`${change.id} · ${change.title}`} onClose={onClose} wide>
    <div className="change-detail-banner"><div><Badge tone={statusTone(change.status)}>{change.status}</Badge><Badge tone={riskTone(change.risk)}>Riziko: {change.risk}</Badge><Badge tone="purple">{change.type}</Badge></div><span>Aktualizované {formatDate(change.updatedAt, true)}</span></div>
    <div className="change-detail-grid">
      <main>
        <section className="change-detail-section"><h3>Základný rozsah</h3><dl><div><dt>Služba</dt><dd>{service?.name || 'Bez väzby'}</dd></div><div><dt>Vlastník</dt><dd>{change.owner || 'Neurčený'}</dd></div><div><dt>Žiadateľ</dt><dd>{change.requester || 'Neurčený'}</dd></div><div><dt>Schvaľovateľ</dt><dd>{change.approver || 'Neurčený'}</dd></div><div><dt>Plánované okno</dt><dd>{formatDate(change.plannedStart, true)} – {formatDate(change.plannedEnd, true)}</dd></div><div><dt>Výpadok</dt><dd>{change.outageMinutes || 0} min.</dd></div></dl><p>{change.description || 'Bez podrobného opisu.'}</p></section>
        <section className="change-plan-grid"><article><h3>Dôvod a prínos</h3><p>{change.reason || 'Nezadané'}</p></article><article><h3>Implementačný plán</h3><p>{change.implementationPlan || 'Nezadané'}</p></article><article><h3>Testovací plán</h3><p>{change.testPlan || 'Nezadané'}</p></article><article className={!change.rollbackPlan ? 'is-missing' : ''}><h3>Rollback plán</h3><p>{change.rollbackPlan || 'Chýba – pred schválením doplniť.'}</p></article><article><h3>Komunikácia</h3><p>{change.communicationPlan || 'Nezadané'}</p></article><article><h3>Dotknuté systémy</h3><p>{change.affectedSystems || 'Nezadané'}</p></article></section>
        <section className="change-detail-section"><h3>Väzby</h3><div className="change-links"><span>Projekt: <strong>{projects.find((project) => project.id === change.linkedProjectId)?.name || 'bez projektu'}</strong></span><span>Úloha: <strong>{task ? `${task.id} · ${task.title}` : 'bez úlohy'}</strong></span>{change.linkedTicketIds.map((id) => { const ticket = tickets.find((item) => item.id === id); return <span key={id}>Ticket: <strong>{ticket ? `${ticket.id} · ${ticket.title}` : id}</strong></span> })}</div></section>
      </main>
      <aside>
        <section className="change-approval-panel"><header><span className="eyebrow">CAB / SCHVÁLENIA</span><h3>Kontrolné stanoviská</h3></header>{change.approvals.map((approval) => <article key={approval.id}><div><strong>{approval.role}</strong><small>{approval.approver || 'Schvaľovateľ neurčený'}</small></div><Badge tone={approval.decision === 'Schválené' ? 'success' : approval.decision === 'Zamietnuté' ? 'danger' : 'warning'}>{approval.decision}</Badge>{canEdit && <div className="change-approval-actions"><button onClick={() => onApproval(approval.id, 'Schválené')} title="Schváliť"><Icon name="check" size={14}/></button><button onClick={() => onApproval(approval.id, 'Zamietnuté')} title="Zamietnuť"><Icon name="close" size={14}/></button><button onClick={() => onApproval(approval.id, 'Čaká')} title="Vrátiť na čakanie"><Icon name="refresh" size={14}/></button></div>}</article>)}</section>
        <section className="change-history-panel"><header><span className="eyebrow">AUDIT</span><h3>História zmeny</h3></header><div>{change.history.map((entry) => <article key={entry.id}><span/><div><strong>{entry.action}</strong><small>{entry.author} · {formatDate(entry.createdAt, true)}</small></div></article>)}</div></section>
        {canEdit && <div className="change-detail-actions"><button className="button button-primary" onClick={onEdit}><Icon name="edit" size={16}/> Upraviť</button><button className="button button-secondary" disabled={Boolean(change.linkedTaskId)} onClick={onCreateTask}><Icon name="tasks" size={16}/>{change.linkedTaskId ? ' Úloha vytvorená' : ' Vytvoriť úlohu'}</button><button className="button button-danger" onClick={onRemove}><Icon name="trash" size={16}/> Odstrániť</button></div>}
      </aside>
    </div>
  </Modal>
}
