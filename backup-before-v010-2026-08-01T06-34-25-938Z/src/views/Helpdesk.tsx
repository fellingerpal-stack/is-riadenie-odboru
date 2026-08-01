import { useMemo, useState } from 'react'
import type {
  Employee,
  Service,
  SlaPolicy,
  SupportQueue,
  Task,
  Ticket,
  TicketAttachment,
  TicketComment,
} from '../types'
import { Badge, Empty, Field, Icon, Modal, PageHeader } from '../components/UI'
import './Helpdesk.css'

const ticketTypes = ['Incident', 'Požiadavka']
const ticketStatuses = ['Nová', 'Pridelená', 'V riešení', 'Čaká na používateľa', 'Blokované', 'Vyriešená', 'Uzatvorená', 'Zrušená']
const priorities = ['Kritická', 'Vysoká', 'Stredná', 'Nízka']
const impacts = ['Vysoký', 'Stredný', 'Nízky']
const urgencies = ['Vysoká', 'Stredná', 'Nízka']
const categories: Record<string, string[]> = {
  'Aplikácie a portály': ['Nedostupnosť služby', 'Chyba funkcie', 'Dátový problém', 'Nová funkcionalita', 'Konzultácia'],
  'Prístupy a oprávnenia': ['Nový prístup', 'Zmena oprávnenia', 'Reset hesla', 'Odobratie prístupu'],
  'Web a obsah': ['Úprava obsahu', 'Publikovanie', 'Grafický výstup', 'Chyba webu'],
  'Videokonferencie a NTI': ['Technická podpora podujatia', 'Rezervácia', 'Porucha zariadenia', 'Licencia'],
  'Konzultácie a zmeny': ['Konzultácia', 'Návrh zmeny', 'Posúdenie dopadu'],
  Infraštruktúra: ['Prevádzkový incident', 'Server', 'Sieť', 'Zálohovanie', 'Bezpečnosť'],
  Ostatné: ['Iné'],
}
const channels = ['Formulár', 'E-mail', 'Telefón', 'Chat', 'Porada', 'Iné']
const closedStatuses = ['Vyriešená', 'Uzatvorená', 'Zrušená']

type DeskView = 'queue' | 'mine' | 'sla'
type SlaTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function isClosed(status: string) {
  return closedStatuses.includes(status)
}

function safeDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value?: string, withTime = false) {
  const date = safeDate(value)
  if (!date) return 'Neurčené'
  return date.toLocaleDateString('sk-SK', withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function addHours(value: string, hours: number) {
  const date = safeDate(value) ?? new Date()
  date.setTime(date.getTime() + hours * 60 * 60 * 1000)
  return date.toISOString()
}

function hoursUntil(value?: string) {
  const date = safeDate(value)
  if (!date) return Number.POSITIVE_INFINITY
  return (date.getTime() - Date.now()) / 3_600_000
}

function priorityTone(priority: string) {
  if (priority === 'Kritická') return 'danger' as const
  if (priority === 'Vysoká') return 'warning' as const
  if (priority === 'Stredná') return 'info' as const
  return 'neutral' as const
}

function statusTone(status: string) {
  if (status === 'Uzatvorená' || status === 'Vyriešená') return 'success' as const
  if (status === 'Blokované') return 'danger' as const
  if (status === 'Čaká na používateľa') return 'warning' as const
  if (status === 'V riešení') return 'info' as const
  return 'neutral' as const
}

function policyFor(priority: string, policies: SlaPolicy[]) {
  return policies.find((policy) => policy.isActive && policy.priority === priority)
    ?? policies.find((policy) => policy.priority === 'Stredná')
    ?? { id: 'SLA00', name: 'Predvolené SLA', priority: 'Stredná', firstResponseHours: 8, resolutionHours: 40, isActive: true }
}

function applySla(ticket: Ticket, policies: SlaPolicy[], force = false): Ticket {
  const policy = policyFor(ticket.priority, policies)
  const createdAt = ticket.createdAt || new Date().toISOString()
  const firstResponseDueAt = force || !ticket.firstResponseDueAt
    ? addHours(createdAt, policy.firstResponseHours)
    : ticket.firstResponseDueAt
  const resolutionDueAt = force || !ticket.resolutionDueAt
    ? addHours(createdAt, policy.resolutionHours)
    : ticket.resolutionDueAt
  return {
    ...ticket,
    firstResponseDueAt,
    resolutionDueAt,
    due: ticket.due || resolutionDueAt.slice(0, 10),
  }
}

function slaState(ticket: Ticket): { label: string; tone: SlaTone; detail: string; rank: number } {
  if (ticket.status === 'Čaká na používateľa') return { label: 'Pozastavené', tone: 'warning', detail: 'Čaká sa na používateľa', rank: 2 }
  if (isClosed(ticket.status)) {
    const resolved = safeDate(ticket.resolvedAt)
    const target = safeDate(ticket.resolutionDueAt)
    if (resolved && target && resolved.getTime() > target.getTime()) return { label: 'Prekročené', tone: 'danger', detail: 'Vyriešené po limite', rank: 0 }
    return { label: 'Splnené', tone: 'success', detail: 'Ticket je uzatvorený', rank: 4 }
  }
  const responseLeft = ticket.firstRespondedAt ? Number.POSITIVE_INFINITY : hoursUntil(ticket.firstResponseDueAt)
  const resolutionLeft = hoursUntil(ticket.resolutionDueAt)
  const left = Math.min(responseLeft, resolutionLeft)
  if (left < 0) return { label: 'SLA prekročené', tone: 'danger', detail: `${Math.abs(Math.round(left))} h po limite`, rank: 0 }
  if (left <= 4) return { label: 'SLA v riziku', tone: 'warning', detail: `${Math.max(0, Math.round(left))} h do limitu`, rank: 1 }
  return { label: 'V limite', tone: 'success', detail: `${Math.round(left)} h zostáva`, rank: 3 }
}

function nextTicketId(type: string, tickets: Ticket[]) {
  const prefix = type === 'Incident' ? 'INC' : 'REQ'
  const year = new Date().getFullYear()
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`)
  const max = tickets.reduce((result, ticket) => {
    const match = ticket.id.match(pattern)
    return Math.max(result, match ? Number(match[1]) : 0)
  }, 0)
  return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`
}

function nextTaskId(tasks: Task[]) {
  const max = tasks.reduce((result, task) => Math.max(result, Number(task.id.replace(/\D/g, '')) || 0), 0)
  return `T${String(max + 1).padStart(2, '0')}`
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '—'
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function blankTicket(policies: SlaPolicy[], queues: SupportQueue[]): Ticket {
  const now = new Date().toISOString()
  return applySla({
    id: '',
    type: 'Požiadavka',
    title: '',
    description: '',
    requester: '',
    requesterEmail: '',
    serviceId: '',
    category: 'Ostatné',
    subcategory: 'Iné',
    queueId: queues.find((queue) => queue.isActive)?.id || '',
    priority: 'Stredná',
    impact: 'Stredný',
    urgency: 'Stredná',
    status: 'Nová',
    assignee: '',
    channel: 'Formulár',
    createdAt: now,
    updatedAt: now,
    due: '',
    linkedTaskId: '',
    resolution: '',
    internalNote: '',
    comments: [],
    history: [],
    attachments: [],
  }, policies)
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

export default function Helpdesk({
  tickets,
  services,
  employees,
  tasks,
  supportQueues,
  slaPolicies,
  canEdit,
  currentUser,
  onTicketsChange,
  onTasksChange,
  onSupportQueuesChange,
  onSlaPoliciesChange,
}: {
  tickets: Ticket[]
  services: Service[]
  employees: Employee[]
  tasks: Task[]
  supportQueues: SupportQueue[]
  slaPolicies: SlaPolicy[]
  canEdit: boolean
  currentUser: string
  onTicketsChange: (tickets: Ticket[]) => void
  onTasksChange: (tasks: Task[]) => void
  onSupportQueuesChange: (queues: SupportQueue[]) => void
  onSlaPoliciesChange: (policies: SlaPolicy[]) => void
}) {
  const fallbackPolicies: SlaPolicy[] = [
    { id: 'SLA01', name: 'Kritická priorita', priority: 'Kritická', firstResponseHours: 1, resolutionHours: 4, isActive: true },
    { id: 'SLA02', name: 'Vysoká priorita', priority: 'Vysoká', firstResponseHours: 4, resolutionHours: 12, isActive: true },
    { id: 'SLA03', name: 'Stredná priorita', priority: 'Stredná', firstResponseHours: 8, resolutionHours: 40, isActive: true },
    { id: 'SLA04', name: 'Nízka priorita', priority: 'Nízka', firstResponseHours: 16, resolutionHours: 80, isActive: true },
  ]

  tickets = Array.isArray(tickets) ? tickets.map((ticket) => ({
    id: typeof ticket?.id === 'string' ? ticket.id : `TICKET-${Date.now()}`,
    type: typeof ticket?.type === 'string' ? ticket.type : 'Požiadavka',
    title: typeof ticket?.title === 'string' ? ticket.title : 'Bez názvu',
    description: typeof ticket?.description === 'string' ? ticket.description : '',
    requester: typeof ticket?.requester === 'string' ? ticket.requester : '',
    requesterEmail: typeof ticket?.requesterEmail === 'string' ? ticket.requesterEmail : '',
    serviceId: typeof ticket?.serviceId === 'string' ? ticket.serviceId : '',
    category: typeof ticket?.category === 'string' ? ticket.category : 'Ostatné',
    subcategory: typeof ticket?.subcategory === 'string' ? ticket.subcategory : 'Iné',
    queueId: typeof ticket?.queueId === 'string' ? ticket.queueId : '',
    priority: typeof ticket?.priority === 'string' ? ticket.priority : 'Stredná',
    impact: typeof ticket?.impact === 'string' ? ticket.impact : 'Stredný',
    urgency: typeof ticket?.urgency === 'string' ? ticket.urgency : 'Stredná',
    status: typeof ticket?.status === 'string' ? ticket.status : 'Nová',
    assignee: typeof ticket?.assignee === 'string' ? ticket.assignee : '',
    channel: typeof ticket?.channel === 'string' ? ticket.channel : 'Formulár',
    createdAt: typeof ticket?.createdAt === 'string' ? ticket.createdAt : new Date().toISOString(),
    updatedAt: typeof ticket?.updatedAt === 'string' ? ticket.updatedAt : (typeof ticket?.createdAt === 'string' ? ticket.createdAt : new Date().toISOString()),
    due: typeof ticket?.due === 'string' ? ticket.due : '',
    linkedTaskId: typeof ticket?.linkedTaskId === 'string' ? ticket.linkedTaskId : '',
    resolution: typeof ticket?.resolution === 'string' ? ticket.resolution : '',
    internalNote: typeof ticket?.internalNote === 'string' ? ticket.internalNote : '',
    comments: Array.isArray(ticket?.comments) ? ticket.comments : [],
    history: Array.isArray(ticket?.history) ? ticket.history : [],
    attachments: Array.isArray(ticket?.attachments) ? ticket.attachments : [],
    firstResponseDueAt: typeof ticket?.firstResponseDueAt === 'string' ? ticket.firstResponseDueAt : undefined,
    resolutionDueAt: typeof ticket?.resolutionDueAt === 'string' ? ticket.resolutionDueAt : undefined,
    firstRespondedAt: typeof ticket?.firstRespondedAt === 'string' ? ticket.firstRespondedAt : undefined,
    resolvedAt: typeof ticket?.resolvedAt === 'string' ? ticket.resolvedAt : undefined,
  })) : []
  services = Array.isArray(services) ? services : []
  employees = Array.isArray(employees) ? employees : []
  tasks = Array.isArray(tasks) ? tasks : []
  supportQueues = Array.isArray(supportQueues) ? supportQueues.map((queue) => ({ ...queue, members: Array.isArray(queue?.members) ? queue.members : [] })) : []
  slaPolicies = Array.isArray(slaPolicies) && slaPolicies.length ? slaPolicies : fallbackPolicies
  currentUser = typeof currentUser === 'string' && currentUser.trim() ? currentUser : 'Používateľ'

  const [deskView, setDeskView] = useState<DeskView>('queue')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('Všetky')
  const [statusFilter, setStatusFilter] = useState('Otvorené')
  const [priorityFilter, setPriorityFilter] = useState('Všetky')
  const [serviceFilter, setServiceFilter] = useState('Všetky')
  const [queueFilter, setQueueFilter] = useState('Všetky')
  const [assigneeFilter, setAssigneeFilter] = useState('Všetci')
  const [draft, setDraft] = useState<Ticket>(() => blankTicket(slaPolicies, supportQueues))
  const [modalOpen, setModalOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentInternal, setCommentInternal] = useState(false)

  const openTickets = tickets.filter((ticket) => !isClosed(ticket.status))
  const incidentCount = openTickets.filter((ticket) => ticket.type === 'Incident').length
  const criticalCount = openTickets.filter((ticket) => ticket.priority === 'Kritická').length
  const breachedCount = openTickets.filter((ticket) => slaState(ticket).tone === 'danger').length
  const waitingCount = openTickets.filter((ticket) => ticket.status === 'Čaká na používateľa').length
  const unassignedCount = openTickets.filter((ticket) => !ticket.assignee).length

  const alertItems = useMemo(() => openTickets
    .map((ticket) => ({ ticket, sla: slaState(ticket) }))
    .filter(({ ticket, sla }) => sla.tone === 'danger' || sla.tone === 'warning' || (ticket.priority === 'Kritická' && !ticket.assignee))
    .sort((a, b) => a.sla.rank - b.sla.rank), [tickets])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return tickets
      .filter((ticket) => {
        const service = services.find((item) => item.id === ticket.serviceId)
        const queue = supportQueues.find((item) => item.id === ticket.queueId)
        const matchesSearch = !query || `${ticket.id} ${ticket.title} ${ticket.description} ${ticket.requester} ${ticket.assignee} ${service?.name || ''} ${queue?.name || ''}`.toLowerCase().includes(query)
        const matchesStatus = statusFilter === 'Všetky' || (statusFilter === 'Otvorené' ? !isClosed(ticket.status) : ticket.status === statusFilter)
        const matchesMine = deskView !== 'mine' || (ticket.requester || '').toLowerCase() === currentUser.toLowerCase() || (ticket.assignee || '').toLowerCase() === currentUser.toLowerCase()
        return matchesSearch && matchesMine
          && (typeFilter === 'Všetky' || ticket.type === typeFilter)
          && matchesStatus
          && (priorityFilter === 'Všetky' || ticket.priority === priorityFilter)
          && (serviceFilter === 'Všetky' || ticket.serviceId === serviceFilter)
          && (queueFilter === 'Všetky' || ticket.queueId === queueFilter)
          && (assigneeFilter === 'Všetci' || ticket.assignee === assigneeFilter)
      })
      .sort((a, b) => {
        const slaDifference = slaState(a).rank - slaState(b).rank
        if (slaDifference) return slaDifference
        const priorityOrder: Record<string, number> = { Kritická: 0, Vysoká: 1, Stredná: 2, Nízka: 3 }
        const priorityDifference = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
        return priorityDifference || b.updatedAt.localeCompare(a.updatedAt)
      })
  }, [tickets, services, supportQueues, search, deskView, currentUser, typeFilter, statusFilter, priorityFilter, serviceFilter, queueFilter, assigneeFilter])

  const hasFilters = Boolean(search || typeFilter !== 'Všetky' || statusFilter !== 'Otvorené' || priorityFilter !== 'Všetky' || serviceFilter !== 'Všetky' || queueFilter !== 'Všetky' || assigneeFilter !== 'Všetci')

  const analytics = useMemo(() => {
    const status = ticketStatuses.map((name) => ({ name, count: tickets.filter((ticket) => ticket.status === name).length })).filter((item) => item.count)
    const service = services.map((item) => ({ name: item.name, count: tickets.filter((ticket) => ticket.serviceId === item.id).length })).filter((item) => item.count).sort((a, b) => b.count - a.count).slice(0, 6)
    const assignee = employees.map((item) => ({ name: item.name, count: openTickets.filter((ticket) => ticket.assignee === item.name).length })).filter((item) => item.count).sort((a, b) => b.count - a.count).slice(0, 6)
    const age = [
      { name: '0–1 deň', count: openTickets.filter((ticket) => (Date.now() - (safeDate(ticket.createdAt)?.getTime() || Date.now())) / 86_400_000 <= 1).length },
      { name: '2–3 dni', count: openTickets.filter((ticket) => { const days = (Date.now() - (safeDate(ticket.createdAt)?.getTime() || Date.now())) / 86_400_000; return days > 1 && days <= 3 }).length },
      { name: '4–7 dní', count: openTickets.filter((ticket) => { const days = (Date.now() - (safeDate(ticket.createdAt)?.getTime() || Date.now())) / 86_400_000; return days > 3 && days <= 7 }).length },
      { name: 'Nad 7 dní', count: openTickets.filter((ticket) => (Date.now() - (safeDate(ticket.createdAt)?.getTime() || Date.now())) / 86_400_000 > 7).length },
    ]
    return { status, service, assignee, age }
  }, [tickets, services, employees])

  function clearFilters() {
    setSearch('')
    setTypeFilter('Všetky')
    setStatusFilter('Otvorené')
    setPriorityFilter('Všetky')
    setServiceFilter('Všetky')
    setQueueFilter('Všetky')
    setAssigneeFilter('Všetci')
  }

  function openNewTicket(type = 'Požiadavka') {
    setDraft({ ...blankTicket(slaPolicies, supportQueues), type })
    setCommentText('')
    setCommentInternal(false)
    setModalOpen(true)
  }

  function openTicket(ticket: Ticket) {
    setDraft(structuredClone(applySla(ticket, slaPolicies)))
    setCommentText('')
    setCommentInternal(false)
    setModalOpen(true)
  }

  function saveTicket() {
    if (!draft.title.trim()) return
    const now = new Date().toISOString()
    if (draft.id) {
      const original = tickets.find((ticket) => ticket.id === draft.id)
      const priorityChanged = original?.priority !== draft.priority
      const prepared = applySla(draft, slaPolicies, priorityChanged)
      const changes: string[] = []
      if (original && original.status !== prepared.status) changes.push(`Stav: ${original.status} → ${prepared.status}`)
      if (original && original.assignee !== prepared.assignee) changes.push(`Riešiteľ: ${original.assignee || 'neurčený'} → ${prepared.assignee || 'neurčený'}`)
      if (original && original.priority !== prepared.priority) changes.push(`Priorita: ${original.priority} → ${prepared.priority}`)
      const history = changes.length
        ? [...prepared.history, { id: `HH-${Date.now()}`, action: changes.join(' · '), author: currentUser, createdAt: now }]
        : prepared.history
      const resolvedAt = isClosed(prepared.status) ? prepared.resolvedAt || now : undefined
      onTicketsChange(tickets.map((ticket) => ticket.id === prepared.id ? { ...prepared, history, resolvedAt, updatedAt: now } : ticket))
    } else {
      const id = nextTicketId(draft.type, tickets)
      const prepared = applySla({ ...draft, id }, slaPolicies, true)
      onTicketsChange([{
        ...prepared,
        createdAt: now,
        updatedAt: now,
        history: [{ id: `HH-${Date.now()}`, action: `Ticket vytvorený v stave ${prepared.status}.`, author: currentUser, createdAt: now }],
      }, ...tickets])
    }
    setModalOpen(false)
  }

  function deleteTicket() {
    if (!draft.id || !confirm(`Odstrániť ticket ${draft.id}?`)) return
    onTicketsChange(tickets.filter((ticket) => ticket.id !== draft.id))
    setModalOpen(false)
  }

  function addComment() {
    if (!commentText.trim()) return
    const now = new Date().toISOString()
    const comment: TicketComment = {
      id: `HC-${Date.now()}`,
      author: currentUser,
      text: commentText.trim(),
      internal: commentInternal,
      createdAt: now,
    }
    setDraft({
      ...draft,
      firstRespondedAt: draft.firstRespondedAt || now,
      comments: [...draft.comments, comment],
      history: [...draft.history, { id: `HH-${Date.now()}-C`, action: commentInternal ? 'Pridaná interná poznámka.' : 'Pridaná odpoveď používateľovi.', author: currentUser, createdAt: now }],
    })
    setCommentText('')
    setCommentInternal(false)
  }

  async function addAttachments(fileList: FileList | null) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    const remaining = Math.max(0, 5 - draft.attachments.length)
    const selected = files.slice(0, remaining)
    const attachments: TicketAttachment[] = []
    for (const file of selected) {
      if (file.size > 750 * 1024) {
        alert(`${file.name}: v prototype je limit prílohy 750 kB.`)
        continue
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      attachments.push({ id: `HA-${Date.now()}-${attachments.length}`, name: file.name, type: file.type, size: file.size, dataUrl, uploadedBy: currentUser, createdAt: new Date().toISOString() })
    }
    setDraft({ ...draft, attachments: [...draft.attachments, ...attachments] })
  }

  function removeAttachment(id: string) {
    setDraft({ ...draft, attachments: draft.attachments.filter((attachment) => attachment.id !== id) })
  }

  function downloadAttachment(attachment: TicketAttachment) {
    if (!attachment.dataUrl) return
    const link = document.createElement('a')
    link.href = attachment.dataUrl
    link.download = attachment.name
    link.click()
  }

  function createLinkedTask() {
    if (!draft.id) return alert('Najprv ticket uložte.')
    if (draft.linkedTaskId) return alert(`Ticket je už prepojený s úlohou ${draft.linkedTaskId}.`)
    const id = nextTaskId(tasks)
    const now = new Date().toISOString()
    const task: Task = {
      id,
      title: `[${draft.id}] ${draft.title}`,
      projectId: '',
      owner: draft.assignee,
      priority: draft.priority,
      status: 'Návrh',
      start: todayIso(),
      due: draft.due,
      description: draft.description,
      source: `Helpdesk ${draft.id}`,
      type: draft.type === 'Incident' ? 'Prevádzková činnosť' : 'Úloha',
      estimateHours: 0,
      spentHours: 0,
      progress: 0,
      dependency: draft.id,
      note: `Vytvorené z ticketu ${draft.id}.`,
      createdAt: now,
      updatedAt: now,
    }
    onTasksChange([...tasks, task])
    const updated = { ...draft, linkedTaskId: id, history: [...draft.history, { id: `HH-${Date.now()}`, action: `Vytvorená prepojená úloha ${id}.`, author: currentUser, createdAt: now }], updatedAt: now }
    setDraft(updated)
    onTicketsChange(tickets.map((ticket) => ticket.id === updated.id ? updated : ticket))
  }

  function exportTickets() {
    const header = ['Číslo', 'Typ', 'Názov', 'Stav', 'Priorita', 'Služba', 'Fronta', 'Riešiteľ', 'Žiadateľ', 'Vytvorené', 'SLA odpoveď', 'SLA vyriešenie', 'SLA stav']
    const rows = filtered.map((ticket) => [ticket.id, ticket.type, ticket.title, ticket.status, ticket.priority, services.find((service) => service.id === ticket.serviceId)?.name || '', supportQueues.find((queue) => queue.id === ticket.queueId)?.name || '', ticket.assignee, ticket.requester, ticket.createdAt, ticket.firstResponseDueAt, ticket.resolutionDueAt, slaState(ticket).label])
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(escapeCsv).join(';')).join('\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `servicedesk-${todayIso()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function updatePolicy(id: string, field: 'firstResponseHours' | 'resolutionHours', value: number) {
    onSlaPoliciesChange(slaPolicies.map((policy) => policy.id === id ? { ...policy, [field]: Math.max(1, value || 1) } : policy))
  }

  return <div className="helpdesk-page helpdesk-page-compact">
    <PageHeader
      eyebrow="ServiceDesk"
      title="Helpdesk a používateľská podpora"
      description="Jednotná evidencia incidentov, požiadaviek, SLA, komunikácie, príloh a nadväzných úloh."
      actions={<div className="helpdesk-page-actions">
        <button className="button button-secondary alert-button" onClick={() => setAlertsOpen(true)}><Icon name="warning" size={17} /> Upozornenia {alertItems.length > 0 && <b>{alertItems.length}</b>}</button>
        <button className="button button-secondary" onClick={exportTickets}><Icon name="download" size={17} /> Export pre Excel</button>
        {canEdit && <button className="button button-secondary" onClick={() => openNewTicket('Incident')}><Icon name="warning" size={17} /> Nový incident</button>}
        {canEdit && <button className="button button-primary" onClick={() => openNewTicket('Požiadavka')}><Icon name="plus" size={17} /> Nová požiadavka</button>}
      </div>}
    />

    <div className="helpdesk-view-tabs" role="tablist">
      <button className={deskView === 'queue' ? 'active' : ''} onClick={() => setDeskView('queue')}><Icon name="helpdesk" size={18} /> Fronta ticketov <span>{openTickets.length}</span></button>
      <button className={deskView === 'mine' ? 'active' : ''} onClick={() => setDeskView('mine')}><Icon name="user" size={18} /> Moje tickety <span>{tickets.filter((ticket) => ticket.requester === currentUser || ticket.assignee === currentUser).length}</span></button>
      <button className={deskView === 'sla' ? 'active' : ''} onClick={() => setDeskView('sla')}><Icon name="capacity" size={18} /> SLA a reporty <span>{breachedCount}</span></button>
    </div>

    {deskView !== 'sla' && <>
      <div className="helpdesk-kpis">
        <button className="helpdesk-kpi is-open" onClick={() => { setStatusFilter('Otvorené'); setTypeFilter('Všetky') }}><span className="helpdesk-kpi-icon"><Icon name="helpdesk" /></span><span><small>Otvorené tickety</small><strong>{openTickets.length}</strong><em>spolu vo fronte</em></span></button>
        <button className="helpdesk-kpi" onClick={() => setTypeFilter('Incident')}><span className="helpdesk-kpi-icon"><Icon name="warning" /></span><span><small>Incidenty</small><strong>{incidentCount}</strong><em>otvorených incidentov</em></span></button>
        <button className="helpdesk-kpi is-critical" onClick={() => setPriorityFilter('Kritická')}><span className="helpdesk-kpi-icon"><Icon name="risk" /></span><span><small>Kritická priorita</small><strong>{criticalCount}</strong><em>vyžaduje pozornosť</em></span></button>
        <button className="helpdesk-kpi is-overdue" onClick={() => setDeskView('sla')}><span className="helpdesk-kpi-icon"><Icon name="calendar" /></span><span><small>SLA prekročené</small><strong>{breachedCount}</strong><em>mimo dohodnutého času</em></span></button>
        <button className="helpdesk-kpi" onClick={() => setStatusFilter('Čaká na používateľa')}><span className="helpdesk-kpi-icon"><Icon name="user" /></span><span><small>Čaká na používateľa</small><strong>{waitingCount}</strong><em>SLA je pozastavené</em></span></button>
        <button className="helpdesk-kpi" onClick={() => setAssigneeFilter('')}><span className="helpdesk-kpi-icon"><Icon name="people" /></span><span><small>Bez riešiteľa</small><strong>{unassignedCount}</strong><em>potrebné prideliť</em></span></button>
      </div>

      <section className="helpdesk-queue-panel">
        <div className="helpdesk-queue-heading"><div><span className="eyebrow">{deskView === 'mine' ? 'Osobný pohľad' : 'Operatívna fronta'}</span><h2>{deskView === 'mine' ? 'Moje požiadavky a pridelené tickety' : 'Incidenty a požiadavky'}</h2><p>Tickety sú zoradené podľa SLA rizika, priority a času poslednej zmeny.</p></div><div className="helpdesk-queue-summary"><Badge tone={breachedCount ? 'danger' : 'success'}>{breachedCount} po SLA</Badge><Badge tone="info">{filtered.length} zobrazených</Badge></div></div>
        <div className="helpdesk-toolbar">
          <div className="search-box helpdesk-search"><Icon name="search" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hľadať číslo, názov, žiadateľa, službu alebo riešiteľa…" /></div>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>Všetky</option>{ticketTypes.map((value) => <option key={value}>{value}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Otvorené</option><option>Všetky</option>{ticketStatuses.map((value) => <option key={value}>{value}</option>)}</select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>Všetky</option>{priorities.map((value) => <option key={value}>{value}</option>)}</select>
          <select value={queueFilter} onChange={(event) => setQueueFilter(event.target.value)}><option value="Všetky">Všetky fronty</option><option value="">Bez fronty</option>{supportQueues.filter((queue) => queue.isActive).map((queue) => <option key={queue.id} value={queue.id}>{queue.name}</option>)}</select>
          <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}><option value="Všetky">Všetky služby</option><option value="">Bez služby</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select>
          <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}><option>Všetci</option><option value="">Bez riešiteľa</option>{employees.map((employee) => <option key={employee.id}>{employee.name}</option>)}</select>
          {hasFilters && <button className="text-button helpdesk-clear" onClick={clearFilters}>Zrušiť filtre</button>}
        </div>

        {filtered.length ? <div className="helpdesk-table-shell"><table className="data-table helpdesk-table"><thead><tr><th>Ticket</th><th>Typ</th><th>Fronta / služba</th><th>Priorita</th><th>Stav</th><th>SLA</th><th>Riešiteľ</th><th>Aktualizované</th></tr></thead><tbody>{filtered.map((ticket) => {
          const service = services.find((item) => item.id === ticket.serviceId)
          const queue = supportQueues.find((item) => item.id === ticket.queueId)
          const sla = slaState(ticket)
          return <tr key={ticket.id} className={sla.tone === 'danger' ? 'ticket-overdue-row' : ''} onClick={() => openTicket(ticket)}>
            <td><div className="ticket-primary"><div><strong>{ticket.id}</strong><span>{ticket.requester || 'Žiadateľ neurčený'}</span></div><h3>{ticket.title}</h3><p>{ticket.description}</p></div></td>
            <td><span className={`ticket-type ticket-type-${ticket.type === 'Incident' ? 'incident' : 'request'}`}>{ticket.type}</span></td>
            <td><span className="ticket-queue">{queue?.name || 'Bez fronty'}</span><span className="ticket-service">{service?.name || 'Bez služby'}</span></td>
            <td><Badge tone={priorityTone(ticket.priority)}>{ticket.priority}</Badge></td>
            <td><Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge></td>
            <td><span className={`sla-chip sla-${sla.tone}`}><strong>{sla.label}</strong><small>{sla.detail}</small></span></td>
            <td><span className="ticket-assignee"><span className="ticket-avatar">{initials(ticket.assignee)}</span>{ticket.assignee || 'Bez riešiteľa'}</span></td>
            <td>{formatDate(ticket.updatedAt, true)}</td>
          </tr>
        })}</tbody></table></div> : <Empty title="Žiadny ticket" text="Zmeňte filtre alebo vytvorte novú požiadavku." />}
      </section>
    </>}

    {deskView === 'sla' && <div className="servicedesk-report-grid">
      <section className="panel sla-policy-panel"><div className="panel-heading"><div><span className="eyebrow">Riadenie úrovne služby</span><h3>SLA politiky</h3></div><Badge tone="info">kalendárne hodiny</Badge></div><div className="sla-policy-grid">{slaPolicies.map((policy) => <article key={policy.id}><header><Badge tone={priorityTone(policy.priority)}>{policy.priority}</Badge><strong>{policy.name}</strong></header><div><label>Prvá reakcia<input type="number" min="1" value={policy.firstResponseHours} disabled={!canEdit} onChange={(event) => updatePolicy(policy.id, 'firstResponseHours', Number(event.target.value))} /><span>h</span></label><label>Vyriešenie<input type="number" min="1" value={policy.resolutionHours} disabled={!canEdit} onChange={(event) => updatePolicy(policy.id, 'resolutionHours', Number(event.target.value))} /><span>h</span></label></div></article>)}</div><p className="panel-note">Zmena politiky sa použije na nové tickety. Pri zmene priority existujúceho ticketu sa SLA prepočíta od času jeho vytvorenia.</p></section>

      <section className="panel queue-panel"><div className="panel-heading"><div><span className="eyebrow">Organizácia podpory</span><h3>Fronty riešiteľov</h3></div><Badge tone="neutral">{supportQueues.filter((queue) => queue.isActive).length} aktívne</Badge></div><div className="support-queue-grid">{supportQueues.map((queue) => <article key={queue.id} className={!queue.isActive ? 'is-disabled' : ''}><header><span className="queue-icon"><Icon name="helpdesk" size={18} /></span><div><strong>{queue.name}</strong><small>{queue.email}</small></div>{canEdit && <label className="switch"><input type="checkbox" checked={queue.isActive} onChange={(event) => onSupportQueuesChange(supportQueues.map((item) => item.id === queue.id ? { ...item, isActive: event.target.checked } : item))} /><span /></label>}</header><p>{queue.description}</p><div className="queue-members">{queue.members.map((member) => <span key={member}>{initials(member)} <small>{member}</small></span>)}</div></article>)}</div></section>

      <section className="panel analytics-panel"><div className="panel-heading"><div><span className="eyebrow">Manažérsky report</span><h3>Rozloženie ticketov</h3></div><button className="text-button" onClick={exportTickets}><Icon name="download" size={15} /> Export pre Excel</button></div><div className="analytics-grid"><ReportList title="Podľa stavu" items={analytics.status} total={tickets.length} /><ReportList title="Podľa služby" items={analytics.service} total={tickets.length} /><ReportList title="Podľa riešiteľa" items={analytics.assignee} total={openTickets.length} /><ReportList title="Vek otvorených ticketov" items={analytics.age} total={openTickets.length} /></div></section>

      <section className="panel integration-panel"><div className="panel-heading"><div><span className="eyebrow">Integrácie</span><h3>Pripravenosť ServiceDesku</h3></div></div><div className="integration-list"><div><Icon name="check" /><span><strong>Notifikácie v aplikácii</strong><small>SLA, kritické a nepridelené tickety</small></span><Badge tone="success">Aktívne</Badge></div><div><Icon name="check" /><span><strong>Prílohy</strong><small>V prototype do 750 kB na súbor</small></span><Badge tone="success">Aktívne</Badge></div><div><Icon name="database" /><span><strong>Samostatné Supabase tabuľky</strong><small>SQL návrh je súčasťou releasu</small></span><Badge tone="warning">Na nasadenie</Badge></div><div><Icon name="roadmap" /><span><strong>E-mailové notifikácie</strong><small>Vyžadujú Edge Function a odosielaciu doménu</small></span><Badge tone="neutral">Ďalší krok</Badge></div></div></section>
    </div>}

    {alertsOpen && <Modal title={`Upozornenia ServiceDesku (${alertItems.length})`} onClose={() => setAlertsOpen(false)}><div className="servicedesk-alert-list">{alertItems.length ? alertItems.map(({ ticket, sla }) => <button key={ticket.id} onClick={() => { setAlertsOpen(false); openTicket(ticket) }}><span className={`alert-dot alert-${sla.tone}`} /><div><strong>{ticket.id} · {ticket.title}</strong><small>{sla.label} · {sla.detail}{!ticket.assignee ? ' · bez riešiteľa' : ''}</small></div><Icon name="chevron" size={17} /></button>) : <Empty title="Bez upozornení" text="Žiadny otvorený ticket momentálne nevyžaduje zásah." />}</div></Modal>}

    {modalOpen && <Modal title={draft.id ? `${draft.id} · ${draft.title}` : 'Nový ticket'} onClose={() => setModalOpen(false)} wide><div className="helpdesk-modal-layout"><div className="helpdesk-form-column">
      <div className="helpdesk-modal-banner"><span className={`ticket-type ticket-type-${draft.type === 'Incident' ? 'incident' : 'request'}`}>{draft.type}</span>{draft.id && <strong>{draft.id}</strong>}<Badge tone={statusTone(draft.status)}>{draft.status}</Badge><Badge tone={slaState(draft).tone}>{slaState(draft).label}</Badge>{draft.linkedTaskId && <Badge tone="purple">Úloha {draft.linkedTaskId}</Badge>}</div>
      <div className="form-grid helpdesk-form-grid">
        <Field label="Typ"><select value={draft.type} disabled={!canEdit || Boolean(draft.id)} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>{ticketTypes.map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Stav"><select value={draft.status} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>{ticketStatuses.map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Priorita"><select value={draft.priority} disabled={!canEdit} onChange={(event) => setDraft(applySla({ ...draft, priority: event.target.value }, slaPolicies, true))}>{priorities.map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Názov"><input value={draft.title} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Stručný názov požiadavky alebo incidentu" /></Field>
        <Field label="Popis"><textarea value={draft.description} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Čo sa stalo alebo čo používateľ potrebuje?" /></Field>
        <Field label="Fronta"><select value={draft.queueId} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, queueId: event.target.value })}><option value="">Bez fronty</option>{supportQueues.filter((queue) => queue.isActive || queue.id === draft.queueId).map((queue) => <option key={queue.id} value={queue.id}>{queue.name}</option>)}</select></Field>
        <Field label="Služba / systém"><select value={draft.serviceId} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, serviceId: event.target.value })}><option value="">Bez väzby na službu</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></Field>
        <Field label="Kategória"><select value={draft.category} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, category: event.target.value, subcategory: categories[event.target.value]?.[0] || 'Iné' })}>{Object.keys(categories).map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Podkategória"><select value={draft.subcategory} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, subcategory: event.target.value })}>{(categories[draft.category] || ['Iné']).map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Riešiteľ"><select value={draft.assignee} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, assignee: event.target.value, status: draft.status === 'Nová' && event.target.value ? 'Pridelená' : draft.status })}><option value="">Bez riešiteľa</option>{employees.map((employee) => <option key={employee.id}>{employee.name}</option>)}</select></Field>
        <Field label="Dopad"><select value={draft.impact} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, impact: event.target.value })}>{impacts.map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Naliehavosť"><select value={draft.urgency} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, urgency: event.target.value })}>{urgencies.map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Kanál"><select value={draft.channel} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, channel: event.target.value })}>{channels.map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Žiadateľ"><input value={draft.requester} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, requester: event.target.value })} /></Field>
        <Field label="E-mail žiadateľa"><input type="email" value={draft.requesterEmail} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, requesterEmail: event.target.value })} /></Field>
        <Field label="Interná poznámka"><textarea value={draft.internalNote || ''} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, internalNote: event.target.value })} /></Field>
        <Field label="Riešenie / výsledok"><textarea value={draft.resolution || ''} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, resolution: event.target.value })} /></Field>
      </div>
    </div><aside className="helpdesk-activity-column">
      <section className="helpdesk-activity-card sla-detail-card"><div className="helpdesk-activity-heading"><div><span className="eyebrow">SLA</span><h3>Časové ciele</h3></div><Badge tone={slaState(draft).tone}>{slaState(draft).label}</Badge></div><div className="sla-detail-list"><div><span>Prvá reakcia</span><strong>{formatDate(draft.firstResponseDueAt, true)}</strong><small>{draft.firstRespondedAt ? `Reakcia: ${formatDate(draft.firstRespondedAt, true)}` : 'Čaká na prvú reakciu'}</small></div><div><span>Vyriešenie</span><strong>{formatDate(draft.resolutionDueAt, true)}</strong><small>{slaState(draft).detail}</small></div></div></section>
      <section className="helpdesk-activity-card"><div className="helpdesk-activity-heading"><div><span className="eyebrow">Prílohy</span><h3>Súbory</h3></div><Badge tone="neutral">{draft.attachments.length}/5</Badge></div><div className="ticket-attachments">{draft.attachments.map((attachment) => <div key={attachment.id}><button className="attachment-main" onClick={() => downloadAttachment(attachment)} disabled={!attachment.dataUrl}><Icon name="download" size={15} /><span><strong>{attachment.name}</strong><small>{fileSize(attachment.size)} · {attachment.uploadedBy}</small></span></button>{canEdit && <button className="attachment-remove" onClick={() => removeAttachment(attachment.id)} aria-label="Odstrániť prílohu"><Icon name="trash" size={14} /></button>}</div>)}{!draft.attachments.length && <p className="helpdesk-empty-copy">Bez príloh.</p>}</div>{canEdit && draft.attachments.length < 5 && <label className="attachment-upload"><Icon name="upload" size={16} /> Pridať prílohy<input type="file" multiple onChange={(event) => void addAttachments(event.target.files)} /></label>}</section>
      <section className="helpdesk-activity-card"><div className="helpdesk-activity-heading"><div><span className="eyebrow">Komunikácia</span><h3>Komentáre</h3></div><Badge tone="neutral">{draft.comments.length}</Badge></div><div className="ticket-comments">{draft.comments.length ? [...draft.comments].reverse().map((comment) => <article key={comment.id} className={comment.internal ? 'is-internal' : ''}><header><strong>{comment.author}</strong><span>{formatDate(comment.createdAt, true)}</span></header><p>{comment.text}</p>{comment.internal && <small>Interná poznámka</small>}</article>) : <p className="helpdesk-empty-copy">Zatiaľ bez komentárov.</p>}</div>{canEdit && <div className="ticket-comment-editor"><textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Napísať komentár…" /><label><input type="checkbox" checked={commentInternal} onChange={(event) => setCommentInternal(event.target.checked)} /> Interná poznámka</label><button className="button button-secondary" onClick={addComment} disabled={!commentText.trim()}><Icon name="plus" size={17} /> Pridať komentár</button></div>}</section>
      <section className="helpdesk-activity-card"><div className="helpdesk-activity-heading"><div><span className="eyebrow">Audit</span><h3>História</h3></div></div><div className="ticket-history">{[...draft.history].reverse().map((item) => <div key={item.id}><span /><p><strong>{item.action}</strong><small>{item.author} · {formatDate(item.createdAt, true)}</small></p></div>)}{!draft.history.length && <p className="helpdesk-empty-copy">História vznikne po uložení ticketu.</p>}</div></section>
      {draft.id && canEdit && <button className="button button-secondary helpdesk-task-button" onClick={createLinkedTask} disabled={Boolean(draft.linkedTaskId)}><Icon name="tasks" />{draft.linkedTaskId ? `Prepojené s ${draft.linkedTaskId}` : 'Vytvoriť úlohu z ticketu'}</button>}
    </aside></div><div className="modal-actions split-actions helpdesk-modal-actions"><div>{draft.id && canEdit && <button className="button button-danger" onClick={deleteTicket}><Icon name="trash" /> Odstrániť</button>}</div><div><button className="button button-ghost" onClick={() => setModalOpen(false)}>Zrušiť</button>{canEdit && <button className="button button-primary" onClick={saveTicket} disabled={!draft.title.trim()}><Icon name="check" /> Uložiť ticket</button>}</div></div></Modal>}
  </div>
}

function ReportList({ title, items, total }: { title: string; items: { name: string; count: number }[]; total: number }) {
  const max = Math.max(1, ...items.map((item) => item.count))
  return <section><h4>{title}</h4><div>{items.map((item) => <article key={item.name}><header><span>{item.name}</span><strong>{item.count}</strong></header><div><span style={{ width: `${Math.max(4, item.count / max * 100)}%` }} /></div><small>{total ? Math.round(item.count / total * 100) : 0}%</small></article>)}{!items.length && <p>Bez údajov.</p>}</div></section>
}
