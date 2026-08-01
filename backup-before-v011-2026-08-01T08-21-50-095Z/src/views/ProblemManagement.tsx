import { useMemo, useState } from 'react'
import type {
  ChangeRequest,
  Employee,
  ProblemAction,
  ProblemComment,
  ProblemRecord,
  Project,
  Service,
  Task,
  Ticket,
} from '../types'
import { Badge, Empty, Field, Icon, Modal, PageHeader } from '../components/UI'
import './ProblemManagement.css'

const statuses = ['Nový', 'V analýze', 'Známa chyba', 'Riešenie naplánované', 'Vyriešený', 'Uzatvorený']
const priorities = ['Kritická', 'Vysoká', 'Stredná', 'Nízka']
const impacts = ['Organizácia', 'Viac útvarov', 'Jeden útvar', 'Jednotlivci']
const methods = ['5× prečo', 'Ishikawa', 'Chronológia udalostí', 'Analýza logov', 'Iná']
const closedStatuses = ['Vyriešený', 'Uzatvorený']

type ProblemView = 'overview' | 'register' | 'known-errors'

type Props = {
  problems: ProblemRecord[]
  services: Service[]
  employees: Employee[]
  tickets: Ticket[]
  changes: ChangeRequest[]
  projects: Project[]
  tasks: Task[]
  canEdit: boolean
  currentUser: string
  onProblemsChange: (problems: ProblemRecord[]) => void
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
function isOverdue(problem: ProblemRecord) {
  return !isClosed(problem.status) && Boolean(problem.targetDate) && problem.targetDate < todayIso()
}
function statusTone(status: string) {
  if (status === 'Vyriešený' || status === 'Uzatvorený') return 'success' as const
  if (status === 'Známa chyba') return 'purple' as const
  if (status === 'Riešenie naplánované') return 'info' as const
  if (status === 'V analýze') return 'warning' as const
  return 'neutral' as const
}
function priorityTone(priority: string) {
  if (priority === 'Kritická') return 'danger' as const
  if (priority === 'Vysoká') return 'warning' as const
  if (priority === 'Stredná') return 'info' as const
  return 'neutral' as const
}
function nextProblemId(problems: ProblemRecord[]) {
  const year = new Date().getFullYear()
  const max = problems.reduce((value, problem) => {
    const match = problem.id.match(/PRB-\d{4}-(\d+)/)
    return match ? Math.max(value, Number(match[1])) : value
  }, 0)
  return `PRB-${year}-${String(max + 1).padStart(4, '0')}`
}
function nextTaskId(tasks: Task[]) {
  const max = tasks.reduce((value, task) => Math.max(value, Number(task.id.replace(/\D/g, '')) || 0), 0)
  return `T${String(max + 1).padStart(2, '0')}`
}
function newAction(): ProblemAction {
  return { id: crypto.randomUUID(), title: '', owner: '', due: '', status: 'Návrh', linkedTaskId: '' }
}
function blankProblem(problems: ProblemRecord[], currentUser: string): ProblemRecord {
  const createdAt = nowIso()
  return {
    id: nextProblemId(problems),
    title: '',
    description: '',
    serviceId: '',
    owner: currentUser,
    team: '',
    priority: 'Stredná',
    impact: 'Jeden útvar',
    status: 'Nový',
    symptom: '',
    recurringPattern: '',
    rootCause: '',
    rootCauseMethod: '5× prečo',
    whyAnalysis: ['', '', '', '', ''],
    workaround: '',
    permanentSolution: '',
    knownError: false,
    knownErrorSummary: '',
    linkedTicketIds: [],
    linkedChangeIds: [],
    linkedProjectId: '',
    linkedTaskIds: [],
    actions: [],
    comments: [],
    history: [{ id: crypto.randomUUID(), action: 'Problém bol vytvorený.', author: currentUser, createdAt }],
    createdAt,
    updatedAt: createdAt,
    targetDate: '',
    resolvedAt: '',
  }
}

export default function ProblemManagement({ problems, services, employees, tickets, changes, projects, tasks, canEdit, currentUser, onProblemsChange, onTasksChange }: Props) {
  const [view, setView] = useState<ProblemView>('overview')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Otvorené')
  const [priorityFilter, setPriorityFilter] = useState('Všetky')
  const [serviceFilter, setServiceFilter] = useState('Všetky')
  const [modalOpen, setModalOpen] = useState(false)
  const [incidentPickerOpen, setIncidentPickerOpen] = useState(false)
  const [draft, setDraft] = useState<ProblemRecord>(() => blankProblem(problems, currentUser))
  const [commentText, setCommentText] = useState('')
  const [commentInternal, setCommentInternal] = useState(true)

  const openProblems = problems.filter((problem) => !isClosed(problem.status))
  const analysisCount = openProblems.filter((problem) => problem.status === 'V analýze').length
  const knownErrorCount = problems.filter((problem) => problem.knownError || problem.status === 'Známa chyba').length
  const recurringCount = openProblems.filter((problem) => problem.linkedTicketIds.length >= 2).length
  const overdueCount = openProblems.filter(isOverdue).length
  const missingRcaCount = openProblems.filter((problem) => !problem.rootCause.trim()).length

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return problems.filter((problem) => {
      const service = services.find((item) => item.id === problem.serviceId)
      const matchesSearch = !query || `${problem.id} ${problem.title} ${problem.description} ${problem.symptom} ${problem.rootCause} ${problem.owner} ${service?.name || ''}`.toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'Všetky' || (statusFilter === 'Otvorené' ? !isClosed(problem.status) : problem.status === statusFilter)
      return matchesSearch && matchesStatus
        && (priorityFilter === 'Všetky' || problem.priority === priorityFilter)
        && (serviceFilter === 'Všetky' || problem.serviceId === serviceFilter)
    }).sort((a, b) => {
      if (isOverdue(a) !== isOverdue(b)) return isOverdue(a) ? -1 : 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [problems, search, statusFilter, priorityFilter, serviceFilter, services])

  const knownErrors = filtered.filter((problem) => problem.knownError || problem.status === 'Známa chyba')
  const affectedServices = useMemo(() => services.map((service) => ({
    service,
    count: openProblems.filter((problem) => problem.serviceId === service.id).length,
    incidents: openProblems.filter((problem) => problem.serviceId === service.id).reduce((sum, problem) => sum + problem.linkedTicketIds.length, 0),
  })).filter((item) => item.count).sort((a, b) => b.incidents - a.incidents), [services, problems])

  function openNew(linkedTicketId = '') {
    const base = blankProblem(problems, currentUser)
    const ticket = tickets.find((item) => item.id === linkedTicketId)
    setDraft(ticket ? {
      ...base,
      title: `Opakovaný problém: ${ticket.title}`,
      description: ticket.description,
      serviceId: ticket.serviceId,
      owner: ticket.assignee || currentUser,
      priority: ticket.priority,
      symptom: ticket.title,
      linkedTicketIds: [ticket.id],
      history: [...base.history, { id: crypto.randomUUID(), action: `Problém vytvorený z incidentu ${ticket.id}.`, author: currentUser, createdAt: nowIso() }],
    } : base)
    setCommentText('')
    setModalOpen(true)
  }
  function openProblem(problem: ProblemRecord) {
    setDraft(structuredClone(problem))
    setCommentText('')
    setModalOpen(true)
  }
  function setField<K extends keyof ProblemRecord>(key: K, value: ProblemRecord[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }
  function toggleLink(key: 'linkedTicketIds' | 'linkedChangeIds', id: string) {
    const values = draft[key]
    setField(key, values.includes(id) ? values.filter((item) => item !== id) : [...values, id])
  }
  function saveProblem() {
    if (!draft.title.trim()) return
    const now = nowIso()
    const original = problems.find((problem) => problem.id === draft.id)
    const changesLog: string[] = []
    if (original?.status !== draft.status) changesLog.push(`Stav: ${original?.status || 'nový'} → ${draft.status}`)
    if (original?.owner !== draft.owner) changesLog.push(`Vlastník: ${original?.owner || 'neurčený'} → ${draft.owner || 'neurčený'}`)
    if (original?.priority !== draft.priority) changesLog.push(`Priorita: ${original?.priority || 'neurčená'} → ${draft.priority}`)
    const knownError = draft.knownError || draft.status === 'Známa chyba'
    const history = original && changesLog.length
      ? [...draft.history, { id: crypto.randomUUID(), action: changesLog.join(' · '), author: currentUser, createdAt: now }]
      : draft.history
    const prepared = {
      ...draft,
      knownError,
      status: knownError && draft.status === 'Nový' ? 'Známa chyba' : draft.status,
      history,
      updatedAt: now,
      resolvedAt: isClosed(draft.status) ? draft.resolvedAt || now : '',
    }
    onProblemsChange(original ? problems.map((problem) => problem.id === prepared.id ? prepared : problem) : [prepared, ...problems])
    setModalOpen(false)
  }
  function deleteProblem() {
    if (!confirm(`Odstrániť problém ${draft.id}?`)) return
    onProblemsChange(problems.filter((problem) => problem.id !== draft.id))
    setModalOpen(false)
  }
  function addComment() {
    if (!commentText.trim()) return
    const comment: ProblemComment = { id: crypto.randomUUID(), author: currentUser, text: commentText.trim(), internal: commentInternal, createdAt: nowIso() }
    setDraft((current) => ({ ...current, comments: [...current.comments, comment], updatedAt: nowIso() }))
    setCommentText('')
  }
  function addAction() { setDraft((current) => ({ ...current, actions: [...current.actions, newAction()] })) }
  function updateAction(id: string, patch: Partial<ProblemAction>) {
    setDraft((current) => ({ ...current, actions: current.actions.map((action) => action.id === id ? { ...action, ...patch } : action) }))
  }
  function removeAction(id: string) { setDraft((current) => ({ ...current, actions: current.actions.filter((action) => action.id !== id) })) }
  function createTaskForAction(action: ProblemAction) {
    if (!action.title.trim()) return alert('Najprv doplňte názov opatrenia.')
    if (action.linkedTaskId) return alert(`Opatrenie je už prepojené s úlohou ${action.linkedTaskId}.`)
    const id = nextTaskId(tasks)
    const now = nowIso()
    const task: Task = {
      id,
      title: `[${draft.id}] ${action.title}`,
      projectId: draft.linkedProjectId,
      owner: action.owner || draft.owner,
      priority: draft.priority,
      status: action.status === 'Hotovo' ? 'Hotovo' : 'Návrh',
      start: todayIso(),
      due: action.due || draft.targetDate,
      description: draft.permanentSolution || draft.description,
      source: `Problem management ${draft.id}`,
      type: 'Nápravné opatrenie',
      estimateHours: 0,
      spentHours: 0,
      progress: action.status === 'Hotovo' ? 100 : 0,
      dependency: '',
      note: `Opatrenie problému ${draft.id}`,
      createdAt: now,
      updatedAt: now,
    }
    onTasksChange([...tasks, task])
    updateAction(action.id, { linkedTaskId: id })
    setDraft((current) => ({ ...current, linkedTaskIds: [...new Set([...current.linkedTaskIds, id])], history: [...current.history, { id: crypto.randomUUID(), action: `Vytvorená úloha ${id} pre nápravné opatrenie.`, author: currentUser, createdAt: now }] }))
  }
  function clearFilters() {
    setSearch(''); setStatusFilter('Otvorené'); setPriorityFilter('Všetky'); setServiceFilter('Všetky')
  }

  return <div className="problem-page">
    <PageHeader eyebrow="ITSM · Problem management" title="Problémy a známe chyby" description="Od opakovaných incidentov cez analýzu koreňovej príčiny až po workaround, známu chybu a trvalé nápravné opatrenie." actions={canEdit && <div className="page-action-row"><button className="button button-secondary" onClick={() => openNew()}><Icon name="plus" size={17}/> Nový problém</button><button className="button button-primary" onClick={() => setIncidentPickerOpen(true)}><Icon name="problem" size={17}/> Vytvoriť z incidentu</button></div>}/>

    <div className="problem-kpis">
      <button onClick={() => { setStatusFilter('Otvorené'); setView('register') }}><span className="problem-kpi-icon tone-blue"><Icon name="problem"/></span><span><small>Otvorené problémy</small><strong>{openProblems.length}</strong><em>aktívnych záznamov</em></span></button>
      <button onClick={() => { setStatusFilter('V analýze'); setView('register') }}><span className="problem-kpi-icon tone-orange"><Icon name="search"/></span><span><small>V analýze</small><strong>{analysisCount}</strong><em>hľadá sa príčina</em></span></button>
      <button onClick={() => setView('known-errors')}><span className="problem-kpi-icon tone-purple"><Icon name="warning"/></span><span><small>Známe chyby</small><strong>{knownErrorCount}</strong><em>s workaroundom</em></span></button>
      <button onClick={() => setView('register')}><span className="problem-kpi-icon tone-teal"><Icon name="helpdesk"/></span><span><small>Opakované incidenty</small><strong>{recurringCount}</strong><em>2 a viac väzieb</em></span></button>
      <button className={overdueCount ? 'is-alert' : ''} onClick={() => setView('register')}><span className="problem-kpi-icon tone-red"><Icon name="calendar"/></span><span><small>Po termíne</small><strong>{overdueCount}</strong><em>nápravné opatrenia</em></span></button>
      <button className={missingRcaCount ? 'is-warning' : ''} onClick={() => setView('register')}><span className="problem-kpi-icon tone-orange"><Icon name="risk"/></span><span><small>Bez RCA</small><strong>{missingRcaCount}</strong><em>chýba príčina</em></span></button>
    </div>

    <div className="problem-control-card">
      <div className="problem-view-tabs">
        <button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}><Icon name="dashboard" size={17}/> Prehľad</button>
        <button className={view === 'register' ? 'active' : ''} onClick={() => setView('register')}><Icon name="matrix" size={17}/> Register <span>{filtered.length}</span></button>
        <button className={view === 'known-errors' ? 'active' : ''} onClick={() => setView('known-errors')}><Icon name="warning" size={17}/> Known Error DB <span>{knownErrors.length}</span></button>
      </div>
      <div className="problem-toolbar"><label className="problem-search"><Icon name="search" size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hľadať problém, službu, príčinu alebo vlastníka…"/></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Otvorené</option><option>Všetky</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>Všetky</option>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select><select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}><option>Všetky</option><option value="">Bez služby</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select>{(search || statusFilter !== 'Otvorené' || priorityFilter !== 'Všetky' || serviceFilter !== 'Všetky') && <button className="text-button" onClick={clearFilters}>Zrušiť filtre</button>}</div>
    </div>

    {view === 'overview' && <div className="problem-overview-grid"><section className="problem-overview-main"><header><div><span className="eyebrow">PRIORITY</span><h2>Problémy vyžadujúce pozornosť</h2></div><button className="text-button" onClick={() => setView('register')}>Zobraziť register</button></header><div>{filtered.slice(0, 6).map((problem) => <button key={problem.id} className={isOverdue(problem) ? 'is-overdue' : ''} onClick={() => openProblem(problem)}><div className="problem-list-id"><strong>{problem.id}</strong><span>{services.find((service) => service.id === problem.serviceId)?.name || 'Bez služby'}</span></div><div className="problem-list-main"><h3>{problem.title}</h3><p>{problem.rootCause || problem.symptom || problem.description || 'Príčina zatiaľ nie je popísaná.'}</p><div><Badge tone={statusTone(problem.status)}>{problem.status}</Badge><Badge tone={priorityTone(problem.priority)}>{problem.priority}</Badge><span>{problem.linkedTicketIds.length} incidentov</span></div></div><div className="problem-list-owner"><strong>{problem.owner || 'Neurčený'}</strong><small>{problem.targetDate ? `Termín ${formatDate(problem.targetDate)}` : 'Bez termínu'}</small><Icon name="chevron" size={17}/></div></button>)}{!filtered.length && <Empty title="Bez problémov" text="Aktuálne filtre neobsahujú žiadny záznam."/>}</div></section><aside className="problem-service-panel"><header><span className="eyebrow">TREND</span><h2>Najviac dotknuté služby</h2></header><div>{affectedServices.slice(0, 7).map(({ service, count, incidents }) => <article key={service.id}><div><strong>{service.name}</strong><small>{count} problémov · {incidents} incidentov</small></div><span style={{ width: `${Math.max(8, incidents / Math.max(1, affectedServices[0]?.incidents || 1) * 100)}%` }}/></article>)}{!affectedServices.length && <p>Bez otvorených problémov.</p>}</div></aside></div>}

    {view === 'register' && (filtered.length ? <div className="problem-table-shell"><table className="data-table problem-table"><thead><tr><th>Problém</th><th>Služba</th><th>Priorita</th><th>Stav</th><th>Incidenty</th><th>Vlastník</th><th>Termín</th><th>RCA</th></tr></thead><tbody>{filtered.map((problem) => <tr key={problem.id} className={isOverdue(problem) ? 'is-overdue' : ''} onClick={() => openProblem(problem)}><td><strong>{problem.id}</strong><span>{problem.title}</span><small>{problem.description}</small></td><td>{services.find((service) => service.id === problem.serviceId)?.name || 'Bez služby'}</td><td><Badge tone={priorityTone(problem.priority)}>{problem.priority}</Badge></td><td><Badge tone={statusTone(problem.status)}>{problem.status}</Badge></td><td><strong>{problem.linkedTicketIds.length}</strong></td><td>{problem.owner || 'Neurčený'}</td><td>{problem.targetDate ? formatDate(problem.targetDate) : 'Neurčený'}{isOverdue(problem) && <small className="problem-overdue">Po termíne</small>}</td><td><Badge tone={problem.rootCause ? 'success' : 'warning'}>{problem.rootCause ? 'Doplnená' : 'Chýba'}</Badge></td></tr>)}</tbody></table></div> : <Empty title="Bez výsledkov" text="Zmeňte vyhľadávanie alebo filtre."/>)}

    {view === 'known-errors' && <div className="known-error-grid">{knownErrors.map((problem) => <button key={problem.id} onClick={() => openProblem(problem)}><header><div><strong>{problem.id}</strong><span>{services.find((service) => service.id === problem.serviceId)?.name || 'Bez služby'}</span></div><Badge tone="purple">Známa chyba</Badge></header><h3>{problem.title}</h3><section><span>Prejav</span><p>{problem.symptom || problem.description || 'Nezadané'}</p></section><section className="known-error-workaround"><span>Workaround</span><p>{problem.workaround || 'Workaround zatiaľ nie je zdokumentovaný.'}</p></section><footer><span>{problem.linkedTicketIds.length} incidentov</span><span>{problem.owner || 'Vlastník neurčený'}</span><Icon name="chevron" size={17}/></footer></button>)}{!knownErrors.length && <Empty title="Databáza známych chýb je prázdna" text="Označte analyzovaný problém ako známu chybu a doplňte workaround."/>}</div>}

    {incidentPickerOpen && <Modal title="Vytvoriť problém z incidentu" onClose={() => setIncidentPickerOpen(false)}><div className="problem-incident-picker"><p>Vyberte incident, z ktorého sa predvyplní nový problém. Ďalšie incidenty môžete pripojiť v detaile problému.</p>{tickets.filter((ticket) => ticket.type === 'Incident').map((ticket) => <button key={ticket.id} onClick={() => { setIncidentPickerOpen(false); openNew(ticket.id) }}><span><strong>{ticket.id} · {ticket.title}</strong><small>{services.find((service) => service.id === ticket.serviceId)?.name || 'Bez služby'} · {ticket.status}</small></span><Badge tone={priorityTone(ticket.priority)}>{ticket.priority}</Badge><Icon name="chevron" size={17}/></button>)}{!tickets.some((ticket) => ticket.type === 'Incident') && <Empty title="Bez incidentov" text="Najprv vytvorte incident v ServiceDesku."/>}</div></Modal>}

    {modalOpen && <Modal title={`${draft.id} · ${draft.title || 'Nový problém'}`} onClose={() => setModalOpen(false)} wide><div className="problem-modal-banner"><div><Badge tone={statusTone(draft.status)}>{draft.status}</Badge><Badge tone={priorityTone(draft.priority)}>{draft.priority}</Badge>{draft.knownError && <Badge tone="purple">Známa chyba</Badge>}<Badge tone="neutral">{draft.linkedTicketIds.length} incidentov</Badge></div><span>Aktualizované {formatDate(draft.updatedAt, true)}</span></div><div className="problem-modal-layout"><main className="problem-form-column"><section className="problem-form-section"><header><span className="eyebrow">ZÁKLAD</span><h3>Identifikácia a vlastníctvo</h3></header><div className="problem-form-grid"><Field label="Názov problému"><input value={draft.title} disabled={!canEdit} onChange={(event) => setField('title', event.target.value)} placeholder="Stručný názov opakovaného alebo závažného problému"/></Field><Field label="Stav"><select value={draft.status} disabled={!canEdit} onChange={(event) => setField('status', event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></Field><Field label="Služba / systém"><select value={draft.serviceId} disabled={!canEdit} onChange={(event) => setField('serviceId', event.target.value)}><option value="">Bez väzby</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></Field><Field label="Vlastník problému"><select value={draft.owner} disabled={!canEdit} onChange={(event) => setField('owner', event.target.value)}><option value="">Neurčený</option>{employees.map((employee) => <option key={employee.id}>{employee.name}</option>)}</select></Field><Field label="Riešiteľský tím"><input value={draft.team} disabled={!canEdit} onChange={(event) => setField('team', event.target.value)} placeholder="Aplikácie, infraštruktúra, dodávateľ…"/></Field><Field label="Priorita"><select value={draft.priority} disabled={!canEdit} onChange={(event) => setField('priority', event.target.value)}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></Field><Field label="Dopad"><select value={draft.impact} disabled={!canEdit} onChange={(event) => setField('impact', event.target.value)}>{impacts.map((impact) => <option key={impact}>{impact}</option>)}</select></Field><Field label="Cieľový termín"><input type="date" value={draft.targetDate} disabled={!canEdit} onChange={(event) => setField('targetDate', event.target.value)}/></Field><Field label="Projekt"><select value={draft.linkedProjectId} disabled={!canEdit} onChange={(event) => setField('linkedProjectId', event.target.value)}><option value="">Bez projektu</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field><Field label="Opis problému"><textarea value={draft.description} disabled={!canEdit} onChange={(event) => setField('description', event.target.value)} placeholder="Rozsah, kontext a dopad problému"/></Field></div></section>

      <section className="problem-form-section"><header><span className="eyebrow">RCA</span><h3>Analýza koreňovej príčiny</h3></header><div className="problem-analysis-grid"><Field label="Prejav / symptóm"><textarea value={draft.symptom} disabled={!canEdit} onChange={(event) => setField('symptom', event.target.value)} placeholder="Ako sa problém prejavuje?"/></Field><Field label="Opakujúci sa vzorec"><textarea value={draft.recurringPattern} disabled={!canEdit} onChange={(event) => setField('recurringPattern', event.target.value)} placeholder="Kedy, ako často a za akých podmienok?"/></Field><Field label="Metóda analýzy"><select value={draft.rootCauseMethod} disabled={!canEdit} onChange={(event) => setField('rootCauseMethod', event.target.value)}>{methods.map((method) => <option key={method}>{method}</option>)}</select></Field><Field label="Koreňová príčina"><textarea value={draft.rootCause} disabled={!canEdit} onChange={(event) => setField('rootCause', event.target.value)} placeholder="Potvrdená alebo pracovná koreňová príčina"/></Field></div><div className="why-analysis"><header><strong>5× prečo</strong><small>Postupné rozloženie príčiny od prejavu po systémový zdroj</small></header>{draft.whyAnalysis.map((value, index) => <label key={index}><span>{index + 1}. prečo?</span><input value={value} disabled={!canEdit} onChange={(event) => setField('whyAnalysis', draft.whyAnalysis.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={index === 0 ? 'Prečo incident vznikol?' : 'Prečo nastala predchádzajúca príčina?'}/></label>)}</div></section>

      <section className="problem-form-section"><header><span className="eyebrow">RIEŠENIE</span><h3>Workaround a trvalá náprava</h3></header><div className="problem-solution-grid"><Field label="Dočasné riešenie / workaround"><textarea value={draft.workaround} disabled={!canEdit} onChange={(event) => setField('workaround', event.target.value)} placeholder="Postup na obnovenie služby alebo obídenie chyby"/></Field><Field label="Trvalé riešenie"><textarea value={draft.permanentSolution} disabled={!canEdit} onChange={(event) => setField('permanentSolution', event.target.value)} placeholder="Technické alebo procesné riešenie koreňovej príčiny"/></Field><label className="known-error-toggle"><input type="checkbox" checked={draft.knownError} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, knownError: event.target.checked, status: event.target.checked && current.status === 'Nový' ? 'Známa chyba' : current.status }))}/><span><strong>Zaradiť do Known Error Database</strong><small>Sprístupní symptóm a workaround riešiteľom incidentov.</small></span></label><Field label="Stručný popis známej chyby"><textarea value={draft.knownErrorSummary} disabled={!canEdit || !draft.knownError} onChange={(event) => setField('knownErrorSummary', event.target.value)} placeholder="Krátke zhrnutie vhodné pre podporu a používateľov"/></Field></div></section>

      <section className="problem-form-section"><header className="problem-section-actions"><div><span className="eyebrow">AKČNÝ PLÁN</span><h3>Nápravné opatrenia</h3></div>{canEdit && <button className="button button-secondary" onClick={addAction}><Icon name="plus" size={15}/> Pridať opatrenie</button>}</header><div className="problem-actions-list">{draft.actions.map((action) => <article key={action.id}><input className="action-title" value={action.title} disabled={!canEdit} onChange={(event) => updateAction(action.id, { title: event.target.value })} placeholder="Názov opatrenia"/><select value={action.owner} disabled={!canEdit} onChange={(event) => updateAction(action.id, { owner: event.target.value })}><option value="">Vlastník</option>{employees.map((employee) => <option key={employee.id}>{employee.name}</option>)}</select><input type="date" value={action.due} disabled={!canEdit} onChange={(event) => updateAction(action.id, { due: event.target.value })}/><select value={action.status} disabled={!canEdit} onChange={(event) => updateAction(action.id, { status: event.target.value })}><option>Návrh</option><option>Naplánované</option><option>V riešení</option><option>Hotovo</option><option>Zrušené</option></select>{action.linkedTaskId ? <Badge tone="purple">Úloha {action.linkedTaskId}</Badge> : canEdit ? <button className="action-icon" onClick={() => createTaskForAction(action)} title="Vytvoriť úlohu"><Icon name="tasks" size={15}/></button> : <span/>}{canEdit && <button className="action-icon action-remove" onClick={() => removeAction(action.id)} title="Odstrániť"><Icon name="trash" size={15}/></button>}</article>)}{!draft.actions.length && <p className="problem-empty-copy">Zatiaľ bez nápravných opatrení.</p>}</div></section>
    </main>

    <aside className="problem-side-column"><section className="problem-side-card"><header><div><span className="eyebrow">VÄZBY</span><h3>Incidenty a zmeny</h3></div></header><div className="problem-link-block"><strong>Incidenty</strong><div>{tickets.filter((ticket) => ticket.type === 'Incident').map((ticket) => <label key={ticket.id}><input type="checkbox" checked={draft.linkedTicketIds.includes(ticket.id)} disabled={!canEdit} onChange={() => toggleLink('linkedTicketIds', ticket.id)}/><span><b>{ticket.id}</b>{ticket.title}</span></label>)}{!tickets.some((ticket) => ticket.type === 'Incident') && <p>Bez incidentov.</p>}</div></div><div className="problem-link-block"><strong>Zmeny</strong><div>{changes.map((change) => <label key={change.id}><input type="checkbox" checked={draft.linkedChangeIds.includes(change.id)} disabled={!canEdit} onChange={() => toggleLink('linkedChangeIds', change.id)}/><span><b>{change.id}</b>{change.title}</span></label>)}{!changes.length && <p>Bez zmien.</p>}</div></div></section>

      <section className="problem-side-card"><header><div><span className="eyebrow">KOMUNIKÁCIA</span><h3>Komentáre</h3></div><Badge tone="neutral">{draft.comments.length}</Badge></header><div className="problem-comments">{[...draft.comments].reverse().map((comment) => <article key={comment.id} className={comment.internal ? 'is-internal' : ''}><header><strong>{comment.author}</strong><span>{formatDate(comment.createdAt, true)}</span></header><p>{comment.text}</p>{comment.internal && <small>Interná poznámka</small>}</article>)}{!draft.comments.length && <p className="problem-empty-copy">Bez komentárov.</p>}</div>{canEdit && <div className="problem-comment-editor"><textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Pridať komentár…"/><label><input type="checkbox" checked={commentInternal} onChange={(event) => setCommentInternal(event.target.checked)}/> Interná poznámka</label><button className="button button-secondary" onClick={addComment} disabled={!commentText.trim()}><Icon name="plus" size={15}/> Pridať</button></div>}</section>

      <section className="problem-side-card"><header><div><span className="eyebrow">AUDIT</span><h3>História</h3></div></header><div className="problem-history">{[...draft.history].reverse().map((entry) => <article key={entry.id}><span/><div><strong>{entry.action}</strong><small>{entry.author} · {formatDate(entry.createdAt, true)}</small></div></article>)}</div></section>
    </aside></div><div className="modal-actions split-actions"><div>{canEdit && problems.some((problem) => problem.id === draft.id) && <button className="button button-danger" onClick={deleteProblem}><Icon name="trash" size={16}/> Odstrániť</button>}</div><div><button className="button button-ghost" onClick={() => setModalOpen(false)}>Zrušiť</button>{canEdit && <button className="button button-primary" onClick={saveProblem} disabled={!draft.title.trim()}><Icon name="check" size={16}/> Uložiť problém</button>}</div></div></Modal>}
  </div>
}
