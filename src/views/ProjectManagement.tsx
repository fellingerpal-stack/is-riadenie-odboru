import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AppRole,
  Project,
  ProjectFunding,
  ProjectLink,
  ProjectMember,
  ProjectMilestone,
  ProjectRaidItem,
  ProjectStatusReport,
  ProjectDecision,
  ProjectPortfolioData,
  ProjectCreateSeed,
  Task,
} from '../types'
import {
  deletePortfolioProject,
  deletePortfolioTask,
  deleteProjectFunding,
  deleteProjectLink,
  deleteProjectMember,
  deleteProjectMilestone,
  deleteProjectRaidItem,
  deleteProjectStatusReport,
  deleteProjectDecision,
  loadProjectPortfolio,
  savePortfolioProject,
  savePortfolioTask,
  saveProjectFunding,
  saveProjectLink,
  saveProjectMember,
  saveProjectMilestone,
  saveProjectRaidItem,
  saveProjectStatusReport,
  saveProjectDecision,
  subscribeToProjectPortfolio,
  type ProjectDatabaseState,
} from '../lib/projectCloud'
import { Badge, Empty, Field, Icon, Modal, PageHeader, Progress } from '../components/UI'
import contractTaskData from '../data/contractTasks.json'
import contractTaskLedgerData from '../data/contractTaskLedger.json'
import './ProjectManagement.css'

type PortfolioTab = 'overview' | 'control' | 'projects' | 'capacity' | 'assignments'
type ProjectDetailTab = 'overview' | 'delivery' | 'governance' | 'team' | 'finance' | 'links'
type CapacityView = 'bi' | 'heatmap' | 'chart' | 'detail'

interface ContractTask {
  code: string
  centers: string[]
  name: string
  description: string
  budget: number
  spent: number
  remaining: number
  monthly: number[]
}
interface ContractTaskDataset {
  meta: { title: string; source: string; period: string; year: number; monthsLoaded: number; method: string }
  tasks: ContractTask[]
}
interface ContractLedgerRow {
  id: string
  sourceRow: string
  task: string
  zak: string
  kpd: string
  ppd: string
  fzd: string
  pgd: string
  pracm: string
  amount: number
  originalZak: string
  column: string
  category: string
  date: string
  month: number
  document: string
  note: string
  dataNote: string
}
interface ContractLedgerDataset {
  meta: { title: string; source: string; period: string; year: number; monthsLoaded: number; rowCount: number; method: string }
  payments: ContractLedgerRow[]
}

const contractDataset = contractTaskData as ContractTaskDataset
const contractLedger = contractTaskLedgerData as ContractLedgerDataset

type ProjectManagementProps = {
  role: AppRole
  currentUserId: string
  currentUser: string
  currentUserEmail: string
  organizationId: string
  databaseMode: 'local' | 'cloud'
  fallbackProjects: Project[]
  fallbackTasks: Task[]
  onFallbackProjectsChange: (projects: Project[]) => void
  onFallbackTasksChange: (tasks: Task[]) => void
  onDatabaseStateChange?: (state: ProjectDatabaseState) => void
  initialCreateSeed?: ProjectCreateSeed | null
  onInitialCreateSeedConsumed?: () => void
}

const projectPhases = ['Idea', 'Iniciácia', 'Analýza', 'Príprava', 'Realizácia', 'Testovanie', 'Pilot', 'Go-live', 'Stabilizácia', 'Prevádzka', 'Ukončenie']
const projectStatuses = ['Návrh', 'Plánovaný', 'Aktívny', 'Ohrozený', 'Pozastavený', 'Ukončený']
const healthStates = ['Zelený', 'Oranžový', 'Červený']
const deliveryModels = ['Interný', 'Dodávateľský', 'Hybridný', 'Agile / iteratívny', 'Waterfall', 'Iný']
const projectRoles = ['Projektový manažér', 'Gestor', 'Analytik', 'Business analytik', 'Architekt', 'Vývojár', 'Tester', 'Bezpečnosť', 'Prevádzka', 'Financie', 'Verejné obstarávanie', 'Dodávateľ', 'Konzultant', 'Iné']
const fundingTypes = ['Štátny rozpočet / úloha', 'EÚ fondy', 'Plán obnovy', 'Iné verejné zdroje', 'Vlastné zdroje', 'Externé zdroje', 'Iné']
const milestoneStatuses = ['Plánované', 'Prebieha', 'Splnené', 'Blokované', 'Posunuté']
const linkTypes = ['Informačný systém', 'Služba', 'Zmluva', 'Dodávateľ', 'Asset', 'Riziko', 'Change', 'Iné']
const taskStatuses = ['Návrh', 'Plánované', 'Prebieha', 'Blokované', 'Hotovo']
const priorities = ['Kritická', 'Vysoká', 'Stredná', 'Nízka']
const raidTypes = ['Riziko', 'Problém', 'Závislosť', 'Predpoklad']
const raidStatuses = ['Otvorené', 'Sleduje sa', 'Rieši sa', 'Akceptované', 'Uzavreté']
const severityStates = ['Nízka', 'Stredná', 'Vysoká', 'Kritická']
const probabilityStates = ['Nízka', 'Stredná', 'Vysoká']
const decisionStatuses = ['Čaká na rozhodnutie', 'Rozhodnuté', 'Odložené', 'Zrušené']

const emptyPortfolio = (): ProjectPortfolioData => ({ projects: [], tasks: [], members: [], funding: [], milestones: [], links: [], raidItems: [], statusReports: [], decisions: [], references: [] })
const today = () => new Date().toISOString().slice(0, 10)
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const normalize = (value: string) => value.trim().toLocaleLowerCase('sk-SK')

function blankProject(): Project {
  return {
    id: '', name: '', type: 'Projekt', owner: '', sponsor: '', status: 'Návrh', priority: 'Stredná', progress: 0,
    start: today(), due: '', description: '', note: '', phase: 'Idea', health: 'Zelený', deliveryModel: 'Hybridný',
    objective: '', expectedOutcome: '', nextMilestone: '', nextMilestoneDue: '', fundingStatus: 'Neurčené', budgetTotal: 0,
    budgetSpent: 0, managerUserId: '', managerName: '', managerEmail: '', linkedSystemNames: [], linkedServiceIds: [], linkedContractNumbers: [],
  }
}

function blankMember(projectId = ''): ProjectMember {
  return { id: '', projectId, userId: '', name: '', email: '', projectRole: 'Analytik', responsibility: '', allocationPercent: 20, validFrom: today(), validTo: '', isActive: true, note: '' }
}
function blankFunding(projectId = '', sourceMode: 'manual' | 'linked_task' = 'manual'): ProjectFunding {
  return {
    id: '', projectId, sourceType: 'Štátny rozpočet / úloha', sourceName: '', program: '', taskCode: '',
    year: contractDataset.meta.year || new Date().getFullYear(), amount: 0, spent: 0, cofinancingPercent: 0, note: '',
    sourceMode, linkMode: sourceMode === 'linked_task' ? 'whole_task' : undefined, linkedTaskCode: '', allocationAmount: 0,
    filterZak: '', selectedLedgerIds: [], syncSource: sourceMode === 'linked_task' ? contractDataset.meta.source : '',
  }
}
function blankMilestone(projectId = ''): ProjectMilestone {
  return { id: '', projectId, title: '', phase: 'Realizácia', gate: '', owner: '', due: '', status: 'Plánované', completedAt: '', note: '' }
}
function blankLink(projectId = ''): ProjectLink {
  return { id: '', projectId, targetType: 'Informačný systém', targetKey: '', targetName: '', relation: 'Súčasť / predmet projektu', note: '' }
}
function blankTask(projectId = ''): Task {
  return { id: '', title: '', projectId, owner: '', priority: 'Stredná', status: 'Návrh', start: today(), due: '', description: '', source: 'Riadenie projektov', type: 'Úloha', estimateHours: 0, spentHours: 0, progress: 0, dependency: '', note: '' }
}
function blankRaidItem(projectId = ''): ProjectRaidItem {
  return { id: '', projectId, itemType: 'Riziko', title: '', description: '', category: '', probability: 'Stredná', impact: 'Stredná', severity: 'Stredná', owner: '', due: '', status: 'Otvorené', response: '', dependencyProjectId: '', note: '' }
}
function blankStatusReport(projectId = '', authorName = '', authorEmail = ''): ProjectStatusReport {
  return { id: '', projectId, period: new Date().toISOString().slice(0, 7), reportDate: today(), overallStatus: 'Zelený', summary: '', achievements: '', nextSteps: '', risks: '', blockers: '', decisionsNeeded: '', progressPercent: 0, authorName, authorEmail, note: '' }
}
function blankDecision(projectId = ''): ProjectDecision {
  return { id: '', projectId, title: '', decision: '', decisionMaker: '', status: 'Čaká na rozhodnutie', decisionDate: '', due: '', reason: '', impact: '', note: '' }
}

function healthTone(value?: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (value === 'Zelený') return 'success'
  if (value === 'Oranžový') return 'warning'
  if (value === 'Červený') return 'danger'
  return 'neutral'
}
function statusTone(value?: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (value === 'Ukončený' || value === 'Hotovo' || value === 'Splnené') return 'success'
  if (value === 'Ohrozený' || value === 'Blokované') return 'danger'
  if (value === 'Pozastavený' || value === 'Posunuté') return 'warning'
  if (value === 'Aktívny' || value === 'Prebieha') return 'info'
  return 'neutral'
}
function money(value: number) {
  return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value || 0))
}
function moneyPrecise(value: number) {
  return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))
}
function contractTaskByCode(code?: string) {
  const key = String(code || '').trim()
  return contractDataset.tasks.find((task) => task.code === key)
}
function ledgerRowsForTask(code?: string) {
  const key = String(code || '').trim()
  return contractLedger.payments.filter((row) => row.task === key)
}
function ledgerRowsForFunding(item: ProjectFunding) {
  if ((item.sourceMode || 'manual') !== 'linked_task') return []
  const code = item.linkedTaskCode || item.taskCode
  const rows = ledgerRowsForTask(code)
  if (item.linkMode === 'zak') return rows.filter((row) => row.zak === String(item.filterZak || '').trim())
  if (item.linkMode === 'items') {
    const selected = new Set(item.selectedLedgerIds || [])
    return rows.filter((row) => selected.has(row.id))
  }
  if (item.linkMode === 'whole_task') return rows
  return []
}
function fundingEffective(item: ProjectFunding) {
  const linked = (item.sourceMode || 'manual') === 'linked_task'
  const task = linked ? contractTaskByCode(item.linkedTaskCode || item.taskCode) : undefined
  if (!linked || !task) {
    const amount = Number(item.amount || 0)
    const spent = Number(item.spent || 0)
    return { linked: false, task, amount, spent, remaining: amount - spent, rows: [] as ContractLedgerRow[], status: 'Manuálny' }
  }
  const rows = ledgerRowsForFunding(item)
  const linkedSpent = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
  if (item.linkMode === 'whole_task') {
    return { linked: true, task, amount: task.budget, spent: task.spent, remaining: task.remaining, rows, status: 'Synchronizovaný' }
  }
  const amount = Number(item.allocationAmount || item.amount || 0)
  const spent = item.linkMode === 'allocation' ? Number(item.spent || 0) : linkedSpent
  return { linked: true, task, amount, spent, remaining: amount - spent, rows, status: item.linkMode === 'allocation' ? 'Čiastočne synchronizovaný' : 'Synchronizovaný' }
}
function fundingLinkLabel(item: ProjectFunding) {
  if ((item.sourceMode || 'manual') !== 'linked_task') return item.program || item.taskCode || 'Manuálna evidencia'
  const code = item.linkedTaskCode || item.taskCode
  if (item.linkMode === 'whole_task') return `Úloha ${code} · celá úloha`
  if (item.linkMode === 'zak') return `Úloha ${code} · ZAK ${item.filterZak || '—'}`
  if (item.linkMode === 'items') return `Úloha ${code} · ${item.selectedLedgerIds?.length || 0} položiek`
  return `Úloha ${code} · projektová alokácia`
}
function fundingDraftIsValid(item: ProjectFunding) {
  if ((item.sourceMode || 'manual') !== 'linked_task') return Boolean(item.projectId)
  const code = item.linkedTaskCode || item.taskCode
  if (!contractTaskByCode(code)) return false
  if (item.linkMode === 'whole_task') return true
  if (Number(item.allocationAmount || 0) <= 0) return false
  if (item.linkMode === 'zak') return Boolean(String(item.filterZak || '').trim())
  if (item.linkMode === 'items') return Boolean(item.selectedLedgerIds?.length)
  return true
}
function dateLabel(value?: string) {
  if (!value) return '—'
  const d = new Date(`${value}T12:00:00`)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('sk-SK')
}

function monthKeyOffset(base: string, offset: number) {
  const [yearText, monthText] = base.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const date = new Date(Date.UTC(year, Math.max(0, month - 1) + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}
function monthBounds(monthKey: string) {
  const [yearText, monthText] = monthKey.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { start: `${monthKey}-01`, end: `${monthKey}-${String(lastDay || 31).padStart(2, '0')}` }
}
function monthCaption(monthKey: string) {
  const [yearText, monthText] = monthKey.split('-')
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1))
  return new Intl.DateTimeFormat('sk-SK', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(date)
}
function memberActiveInMonth(member: ProjectMember, monthKey: string) {
  if (!member.isActive) return false
  const { start, end } = monthBounds(monthKey)
  if (member.validFrom && member.validFrom > end) return false
  if (member.validTo && member.validTo < start) return false
  return true
}

export default function ProjectManagement(props: ProjectManagementProps) {
  const { role, currentUserId, currentUser, currentUserEmail, organizationId, databaseMode, fallbackProjects, fallbackTasks, onFallbackProjectsChange, onFallbackTasksChange, onDatabaseStateChange, initialCreateSeed, onInitialCreateSeedConsumed } = props
  const [data, setData] = useState<ProjectPortfolioData>(() => ({ ...emptyPortfolio(), projects: fallbackProjects, tasks: fallbackTasks }))
  const [dbState, setDbState] = useState<ProjectDatabaseState>(databaseMode === 'cloud' ? 'loading' : 'local')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<PortfolioTab>('overview')
  const [detailTab, setDetailTab] = useState<ProjectDetailTab>('overview')
  const [detailOpen, setDetailOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [capacityQuery, setCapacityQuery] = useState('')
  const [assignmentQuery, setAssignmentQuery] = useState('')
  const [capacityMonth, setCapacityMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [capacityView, setCapacityView] = useState<CapacityView>('bi')
  const [capacityHorizon, setCapacityHorizon] = useState<3 | 6 | 12>(6)
  const [capacityFocus, setCapacityFocus] = useState<{ personKey: string; month: string } | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projectDraft, setProjectDraft] = useState<Project | null>(null)
  const [pendingCreateLinks, setPendingCreateLinks] = useState<Array<Omit<ProjectLink, 'id' | 'projectId'>>>([])
  const [memberDraft, setMemberDraft] = useState<ProjectMember | null>(null)
  const [fundingDraft, setFundingDraft] = useState<ProjectFunding | null>(null)
  const [financeDrilldown, setFinanceDrilldown] = useState<ProjectFunding | null>(null)
  const [milestoneDraft, setMilestoneDraft] = useState<ProjectMilestone | null>(null)
  const [linkDraft, setLinkDraft] = useState<ProjectLink | null>(null)
  const [taskDraft, setTaskDraft] = useState<Task | null>(null)
  const [raidDraft, setRaidDraft] = useState<ProjectRaidItem | null>(null)
  const [statusReportDraft, setStatusReportDraft] = useState<ProjectStatusReport | null>(null)
  const [decisionDraft, setDecisionDraft] = useState<ProjectDecision | null>(null)
  const [busy, setBusy] = useState(false)

  const canManagePortfolio = role === 'admin' || role === 'project_manager'
  const isProjectMemberRole = role === 'project_member'

  useEffect(() => {
    if (!initialCreateSeed || !canManagePortfolio) return
    const seed = initialCreateSeed
    setDetailOpen(false)
    setSelectedProjectId('')
    setTab('projects')
    setPendingCreateLinks(seed.links || [])
    setProjectDraft({
      ...blankProject(),
      name: seed.name,
      type: seed.type,
      sponsor: seed.sponsor,
      objective: seed.objective,
      description: seed.description,
      linkedSystemNames: (seed.links || []).filter((link) => link.targetType === 'Informačný systém').map((link) => link.targetName),
      linkedServiceIds: (seed.links || []).filter((link) => link.targetType === 'Služba').map((link) => link.targetKey),
      linkedContractNumbers: (seed.links || []).filter((link) => link.targetType === 'Zmluva').map((link) => link.targetKey),
    })
    onInitialCreateSeedConsumed?.()
  }, [initialCreateSeed?.requestId])

  function isCurrentProjectMember(member: ProjectMember) {
    if (!member.isActive) return false
    const currentDate = today()
    if (member.validFrom && member.validFrom > currentDate) return false
    if (member.validTo && member.validTo < currentDate) return false
    const idMatch = Boolean(currentUserId && member.userId && member.userId === currentUserId)
    const emailMatch = Boolean(currentUserEmail && member.email && normalize(member.email) === normalize(currentUserEmail))
    const nameMatch = Boolean(currentUser && member.name && normalize(member.name) === normalize(currentUser))
    return idMatch || emailMatch || nameMatch
  }

  function canManageProject(project: Project) {
    if (role === 'admin') return true
    if (role !== 'project_manager') return false
    if (project.managerUserId && project.managerUserId === currentUserId) return true
    if (project.managerEmail && currentUserEmail && normalize(project.managerEmail) === normalize(currentUserEmail)) return true
    if (project.managerName && currentUser && normalize(project.managerName) === normalize(currentUser)) return true
    return data.members.some((member) => member.projectId === project.id && normalize(member.projectRole) === normalize('Projektový manažér') && isCurrentProjectMember(member))
  }

  useEffect(() => { onDatabaseStateChange?.(dbState) }, [dbState, onDatabaseStateChange])

  const reload = useCallback(async (silent = false) => {
    if (databaseMode !== 'cloud') {
      setData((current) => ({ ...current, projects: fallbackProjects, tasks: fallbackTasks }))
      setDbState('local')
      return
    }
    setDbState('loading')
    if (!silent) setError('')
    try {
      const portfolio = await loadProjectPortfolio()
      setData(portfolio)
      setDbState('synced')
      setSelectedProjectId((current) => current && portfolio.projects.some((project) => project.id === current) ? current : '')
    } catch (caught) {
      setDbState('error')
      setError(caught instanceof Error ? caught.message : 'Riadenie projektov sa nepodarilo načítať.')
    }
  }, [databaseMode, fallbackProjects, fallbackTasks])

  useEffect(() => { void reload() }, [reload])
  useEffect(() => {
    if (databaseMode !== 'cloud' || !organizationId) return
    let timer: number | undefined
    return subscribeToProjectPortfolio(organizationId, () => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => void reload(true), 300)
    })
  }, [databaseMode, organizationId, reload])

  const filteredProjects = useMemo(() => {
    const q = normalize(query)
    return data.projects.filter((project) => !q || normalize(`${project.id} ${project.name} ${project.owner} ${project.managerName ?? ''} ${project.phase ?? ''} ${project.status}`).includes(q))
  }, [data.projects, query])
  const selectedProject = data.projects.find((project) => project.id === selectedProjectId) ?? null
  const canManageSelectedProject = selectedProject ? canManageProject(selectedProject) : false
  const projectTasks = selectedProject ? data.tasks.filter((task) => task.projectId === selectedProject.id) : []
  const projectMembers = selectedProject ? data.members.filter((member) => member.projectId === selectedProject.id && member.isActive) : []
  const projectFunding = selectedProject ? data.funding.filter((item) => item.projectId === selectedProject.id) : []
  const projectFundingView = projectFunding.map((item) => ({ item, effective: fundingEffective(item) }))
  const projectFinanceBudget = projectFundingView.reduce((sum, row) => sum + row.effective.amount, 0)
  const projectFinanceSpent = projectFundingView.reduce((sum, row) => sum + row.effective.spent, 0)
  const financeDrillSnapshot = financeDrilldown ? fundingEffective(financeDrilldown) : null
  const projectMilestones = selectedProject ? data.milestones.filter((item) => item.projectId === selectedProject.id) : []
  const projectLinks = selectedProject ? data.links.filter((item) => item.projectId === selectedProject.id) : []
  const projectRaidItems = selectedProject ? data.raidItems.filter((item) => item.projectId === selectedProject.id) : []
  const projectStatusReports = selectedProject ? data.statusReports.filter((item) => item.projectId === selectedProject.id) : []
  const projectDecisions = selectedProject ? data.decisions.filter((item) => item.projectId === selectedProject.id) : []
  const projectOpenRaidCount = projectRaidItems.filter((item) => !['Uzavreté', 'Akceptované'].includes(item.status)).length
  const projectPendingDecisionCount = projectDecisions.filter((item) => item.status === 'Čaká na rozhodnutie').length
  const projectCapacityTotal = projectMembers.reduce((sum, member) => sum + Number(member.allocationPercent || 0), 0)
  const projectNextMilestone = [...projectMilestones].filter((item) => item.status !== 'Splnené').sort((a, b) => (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31'))[0]
  const projectBudgetUsage = projectFinanceBudget > 0 ? Math.round(projectFinanceSpent / projectFinanceBudget * 100) : 0

  const healthByProject = useMemo(() => {
    const map = new Map<string, { health: 'Zelený' | 'Oranžový' | 'Červený'; score: number; reasons: string[] }>()
    const currentMonth = new Date().toISOString().slice(0, 7)
    for (const project of data.projects) {
      let score = 0
      const reasons: string[] = []
      const openRaid = data.raidItems.filter((item) => item.projectId === project.id && !['Uzavreté', 'Akceptované'].includes(item.status))
      const critical = openRaid.filter((item) => item.severity === 'Kritická')
      const high = openRaid.filter((item) => item.severity === 'Vysoká')
      const overdueMilestones = data.milestones.filter((item) => item.projectId === project.id && item.status !== 'Splnené' && item.due && item.due < today())
      const funding = data.funding.filter((item) => item.projectId === project.id)
      const budget = funding.reduce((sum, item) => sum + fundingEffective(item).amount, 0)
      const spent = funding.reduce((sum, item) => sum + fundingEffective(item).spent, 0)
      const pendingDecisions = data.decisions.filter((item) => item.projectId === project.id && item.status === 'Čaká na rozhodnutie')
      const overdueDecisions = pendingDecisions.filter((item) => item.due && item.due < today())
      const latestReport = data.statusReports.filter((item) => item.projectId === project.id).sort((a, b) => b.period.localeCompare(a.period))[0]
      if (project.status === 'Ohrozený' || project.health === 'Červený') { score += 4; reasons.push('projekt je označený ako ohrozený') }
      if (critical.length) { score += 4; reasons.push(`${critical.length} kritické RAID položky`) }
      if (high.length) { score += 2; reasons.push(`${high.length} vysoké RAID položky`) }
      if (overdueMilestones.length) { score += overdueMilestones.length > 1 ? 3 : 2; reasons.push(`${overdueMilestones.length} míľniky po termíne`) }
      if (budget > 0 && spent > budget * 1.05) { score += 4; reasons.push('čerpanie je nad rozpočtom') }
      else if (budget > 0 && spent >= budget * .9) { score += 1; reasons.push('čerpanie je nad 90 % rozpočtu') }
      if (overdueDecisions.length) { score += 3; reasons.push(`${overdueDecisions.length} rozhodnutia po termíne`) }
      else if (pendingDecisions.length) { score += 1; reasons.push(`${pendingDecisions.length} čakajúce rozhodnutia`) }
      if (!['Ukončený', 'Ukončené'].includes(project.status) && (!latestReport || latestReport.period < currentMonth)) { score += 1; reasons.push('chýba aktuálny status report') }
      if (project.due && project.due < today() && !['Ukončený', 'Ukončené'].includes(project.status)) { score += 4; reasons.push('projekt je po plánovanom termíne') }
      const health: 'Zelený' | 'Oranžový' | 'Červený' = score >= 4 ? 'Červený' : score >= 1 ? 'Oranžový' : 'Zelený'
      map.set(project.id, { health, score, reasons })
    }
    return map
  }, [data.projects, data.raidItems, data.milestones, data.funding, data.decisions, data.statusReports])

  const kpis = useMemo(() => {
    const active = data.projects.filter((p) => !['Ukončený', 'Ukončené'].includes(p.status)).length
    const atRisk = data.projects.filter((p) => healthByProject.get(p.id)?.health === 'Červený').length
    const budget = data.funding.reduce((sum, item) => sum + fundingEffective(item).amount, 0)
    const spent = data.funding.reduce((sum, item) => sum + fundingEffective(item).spent, 0)
    const overdueMilestones = data.milestones.filter((m) => m.status !== 'Splnené' && m.due && m.due < today()).length
    return { active, atRisk, budget, spent, overdueMilestones }
  }, [data, healthByProject])

  const capacityRows = useMemo(() => {
    const { start, end } = monthBounds(capacityMonth)
    const currentKeys = new Set([currentUserId, normalize(currentUserEmail), normalize(currentUser)].filter(Boolean))
    const activeMembers = data.members.filter((member) => {
      if (!member.isActive) return false
      if (member.validFrom && member.validFrom > end) return false
      if (member.validTo && member.validTo < start) return false
      if (isProjectMemberRole) {
        const keys = [member.userId, normalize(member.email), normalize(member.name)].filter(Boolean)
        return keys.some((key) => currentKeys.has(key))
      }
      return true
    })
    const byPerson = new Map<string, { key:string; name:string; email:string; total:number; assignments:{ member:ProjectMember; project:Project }[] }>()
    for (const member of activeMembers) {
      const project = data.projects.find((item) => item.id === member.projectId)
      if (!project) continue
      const key = member.userId || normalize(member.email) || normalize(member.name) || member.id
      const row = byPerson.get(key) ?? { key, name: member.name || member.email || 'Neznámy člen', email: member.email || '', total: 0, assignments: [] }
      row.total += Number(member.allocationPercent || 0)
      row.assignments.push({ member, project })
      byPerson.set(key, row)
    }
    const q = normalize(capacityQuery)
    return [...byPerson.values()]
      .filter((row) => !q || normalize(`${row.name} ${row.email} ${row.assignments.map((x) => `${x.project.id} ${x.project.name} ${x.member.projectRole}`).join(' ')}`).includes(q))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'sk'))
  }, [capacityMonth, capacityQuery, currentUser, currentUserEmail, currentUserId, data.members, data.projects, isProjectMemberRole])

  const capacityKpis = useMemo(() => {
    const total = capacityRows.reduce((sum, row) => sum + row.total, 0)
    const overloaded = capacityRows.filter((row) => row.total > 100).length
    const high = capacityRows.filter((row) => row.total >= 80 && row.total <= 100).length
    const average = capacityRows.length ? Math.round(total / capacityRows.length) : 0
    return { people: capacityRows.length, overloaded, high, average }
  }, [capacityRows])

  const capacityMonths = useMemo(() => Array.from({ length: capacityHorizon }, (_, index) => monthKeyOffset(capacityMonth, index)), [capacityHorizon, capacityMonth])

  const capacityMatrixRows = useMemo(() => {
    const currentKeys = new Set([currentUserId, normalize(currentUserEmail), normalize(currentUser)].filter(Boolean))
    const byPerson = new Map<string, {
      key: string
      name: string
      email: string
      months: Record<string, number>
      assignments: Record<string, { member: ProjectMember; project: Project }[]>
    }>()
    for (const member of data.members) {
      if (!member.isActive) continue
      if (isProjectMemberRole) {
        const keys = [member.userId, normalize(member.email), normalize(member.name)].filter(Boolean)
        if (!keys.some((key) => currentKeys.has(key))) continue
      }
      const project = data.projects.find((item) => item.id === member.projectId)
      if (!project) continue
      const key = member.userId || normalize(member.email) || normalize(member.name) || member.id
      const row = byPerson.get(key) ?? { key, name: member.name || member.email || 'Neznámy člen', email: member.email || '', months: {}, assignments: {} }
      let activeInHorizon = false
      for (const monthKey of capacityMonths) {
        if (!memberActiveInMonth(member, monthKey)) continue
        activeInHorizon = true
        row.months[monthKey] = Number(row.months[monthKey] || 0) + Number(member.allocationPercent || 0)
        row.assignments[monthKey] = [...(row.assignments[monthKey] || []), { member, project }]
      }
      if (activeInHorizon || byPerson.has(key)) byPerson.set(key, row)
    }
    const q = normalize(capacityQuery)
    return [...byPerson.values()]
      .filter((row) => !q || normalize(`${row.name} ${row.email} ${Object.values(row.assignments).flat().map((x) => `${x.project.id} ${x.project.name} ${x.member.projectRole}`).join(' ')}`).includes(q))
      .sort((a, b) => Math.max(...capacityMonths.map((monthKey) => Number(b.months[monthKey] || 0)), 0) - Math.max(...capacityMonths.map((monthKey) => Number(a.months[monthKey] || 0)), 0) || a.name.localeCompare(b.name, 'sk'))
  }, [capacityHorizon, capacityMonths, capacityQuery, currentUser, currentUserEmail, currentUserId, data.members, data.projects, isProjectMemberRole])

  const capacityDistribution = useMemo(() => ({
    free: capacityRows.filter((row) => row.total < 50).length,
    balanced: capacityRows.filter((row) => row.total >= 50 && row.total < 80).length,
    high: capacityRows.filter((row) => row.total >= 80 && row.total <= 100).length,
    over: capacityRows.filter((row) => row.total > 100).length,
    allocatedFte: capacityRows.reduce((sum, row) => sum + row.total, 0) / 100,
    freeFte: capacityRows.reduce((sum, row) => sum + Math.max(0, 100 - row.total), 0) / 100,
  }), [capacityRows])

  const projectCapacitySummary = useMemo(() => {
    const byProject = new Map<string, { project: Project; total: number; people: Set<string> }>()
    for (const row of capacityRows) for (const assignment of row.assignments) {
      const key = assignment.project.id
      const item = byProject.get(key) ?? { project: assignment.project, total: 0, people: new Set<string>() }
      item.total += Number(assignment.member.allocationPercent || 0)
      item.people.add(row.key)
      byProject.set(key, item)
    }
    return [...byProject.values()].map((item) => ({ project: item.project, total: item.total, people: item.people.size })).sort((a, b) => b.total - a.total).slice(0, 8)
  }, [capacityRows])

  const roleCapacitySummary = useMemo(() => {
    const byRole = new Map<string, { total: number; people: Set<string> }>()
    for (const row of capacityRows) for (const assignment of row.assignments) {
      const key = assignment.member.projectRole || 'Iné'
      const item = byRole.get(key) ?? { total: 0, people: new Set<string>() }
      item.total += Number(assignment.member.allocationPercent || 0)
      item.people.add(row.key)
      byRole.set(key, item)
    }
    return [...byRole.entries()].map(([roleName, value]) => ({ roleName, total: value.total, people: value.people.size })).sort((a, b) => b.total - a.total).slice(0, 6)
  }, [capacityRows])

  const capacityRisks = useMemo(() => {
    const risks: { tone: 'danger' | 'warning' | 'info'; title: string; text: string; personKey?: string }[] = []
    for (const row of capacityRows.filter((item) => item.total > 100).slice(0, 5)) risks.push({ tone: 'danger', title: `${row.name} je preťažený`, text: `${row.total}% alokácie · ${row.total - 100}% nad plánovanú kapacitu.`, personKey: row.key })
    for (const row of capacityRows.filter((item) => item.total <= 100 && item.assignments.length >= 3).slice(0, 4)) risks.push({ tone: 'warning', title: `${row.name} je na ${row.assignments.length} projektoch`, text: `${row.total}% celkové vyťaženie · zvýšené riziko kontextového prepínania.`, personKey: row.key })
    const { end } = monthBounds(capacityMonth)
    for (const row of capacityRows) {
      const ending = row.assignments.filter(({ member }) => member.validTo && member.validTo <= end && member.validTo >= `${capacityMonth}-01`)
      if (ending.length) risks.push({ tone: 'info', title: `${row.name} – končí alokácia`, text: `${ending.map(({ project }) => project.id).join(', ')} · skontrolovať nadväzujúce obdobie.`, personKey: row.key })
      if (risks.length >= 10) break
    }
    return risks
  }, [capacityMonth, capacityRows])

  const capacityFocusRow = useMemo(() => {
    if (!capacityFocus) return null
    const row = capacityMatrixRows.find((item) => item.key === capacityFocus.personKey)
    if (!row) return null
    return { row, month: capacityFocus.month, total: Number(row.months[capacityFocus.month] || 0), assignments: row.assignments[capacityFocus.month] || [] }
  }, [capacityFocus, capacityMatrixRows])

  const assignmentRows = useMemo(() => {
    const q = normalize(assignmentQuery)
    return data.members
      .map((member) => ({ member, project: data.projects.find((project) => project.id === member.projectId) }))
      .filter((row): row is { member: ProjectMember; project: Project } => Boolean(row.project))
      .filter(({ member, project }) => !q || normalize(`${member.name} ${member.email} ${member.projectRole} ${member.responsibility} ${project.id} ${project.name}`).includes(q))
      .sort((a, b) => a.member.name.localeCompare(b.member.name, 'sk') || a.project.name.localeCompare(b.project.name, 'sk'))
  }, [assignmentQuery, data.members, data.projects])

  const controlCenter = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const governedProjects = role === 'project_manager' ? data.projects.filter((project) => canManageProject(project)) : data.projects
    const governedIds = new Set(governedProjects.map((project) => project.id))
    const activeProjects = governedProjects.filter((project) => !['Ukončený', 'Ukončené'].includes(project.status))
    const criticalProjects = activeProjects
      .map((project) => ({ project, auto: healthByProject.get(project.id) }))
      .filter((row) => row.auto && row.auto.health !== 'Zelený')
      .sort((a, b) => (b.auto?.score || 0) - (a.auto?.score || 0))
    const openRaid = data.raidItems.filter((item) => governedIds.has(item.projectId) && !['Uzavreté', 'Akceptované'].includes(item.status))
    const pendingDecisions = data.decisions.filter((item) => governedIds.has(item.projectId) && item.status === 'Čaká na rozhodnutie').sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))
    const missingReports = activeProjects.filter((project) => !data.statusReports.some((report) => report.projectId === project.id && report.period >= currentMonth))
    const overdueMilestones = data.milestones.filter((item) => governedIds.has(item.projectId) && item.status !== 'Splnené' && item.due && item.due < today())
    return { criticalProjects, openRaid, pendingDecisions, missingReports, overdueMilestones }
  }, [data.projects, data.members, data.raidItems, data.decisions, data.statusReports, data.milestones, healthByProject, role, currentUserId, currentUserEmail, currentUser])

  function canEditTask(task: Task) {
    const project = data.projects.find((item) => item.id === task.projectId)
    if (project && canManageProject(project)) return true
    if (role !== 'project_member' && role !== 'project_manager') return false
    const who = [currentUser, currentUserEmail].map(normalize)
    return who.includes(normalize(task.owner))
  }


  function openProject(projectId: string) {
    setSelectedProjectId(projectId)
    setDetailTab('overview')
    setDetailOpen(true)
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0)
  }

  function closeProject() {
    setDetailOpen(false)
    setSelectedProjectId('')
    setDetailTab('overview')
  }

  function capacityTone(total: number): 'success' | 'warning' | 'danger' | 'info' {
    if (total > 100) return 'danger'
    if (total >= 80) return 'warning'
    if (total >= 50) return 'info'
    return 'success'
  }

  async function runSave(operation: () => Promise<void>, localOperation?: () => void) {
    setBusy(true); setError('')
    try {
      if (databaseMode === 'cloud') {
        setDbState('saving')
        await operation()
        await reload(true)
      } else {
        localOperation?.()
        setDbState('local')
      }
    } catch (caught) {
      setDbState('error')
      setError(caught instanceof Error ? caught.message : 'Zmenu sa nepodarilo uložiť.')
    } finally { setBusy(false) }
  }

  async function persistProject() {
    if (!projectDraft?.name.trim()) return
    const draft: Project = { ...projectDraft, id: projectDraft.id || `PRJ-${String(data.projects.length + 1).padStart(3, '0')}`, owner: projectDraft.managerName || projectDraft.owner || currentUser, managerName: projectDraft.managerName || currentUser, managerEmail: projectDraft.managerEmail || currentUserEmail, managerUserId: projectDraft.managerUserId || currentUserId }
    const createLinks = projectDraft.id ? [] : pendingCreateLinks
    await runSave(async () => {
      await savePortfolioProject(draft)
      for (const link of createLinks) {
        await saveProjectLink({ ...link, id: uid('PL'), projectId: draft.id })
      }
    }, () => {
      const next = projectDraft.id ? fallbackProjects.map((p) => p.id === draft.id ? draft : p) : [...fallbackProjects, draft]
      onFallbackProjectsChange(next)
      setData((current) => ({
        ...current,
        projects: next,
        links: createLinks.length ? [...current.links, ...createLinks.map((link) => ({ ...link, id: uid('PL'), projectId: draft.id }))] : current.links,
      }))
    })
    setPendingCreateLinks([])
    setProjectDraft(null); setSelectedProjectId(draft.id); setDetailTab('overview'); setDetailOpen(true)
  }

  async function removeProject(project: Project) {
    if (!canManageProject(project) || !confirm(`Odstrániť projekt ${project.name}?`)) return
    await runSave(() => deletePortfolioProject(project.id), () => {
      onFallbackProjectsChange(fallbackProjects.filter((p) => p.id !== project.id))
      onFallbackTasksChange(fallbackTasks.map((t) => t.projectId === project.id ? { ...t, projectId: '' } : t))
      setData((current) => ({ ...current, projects: current.projects.filter((p) => p.id !== project.id), tasks: current.tasks.map((t) => t.projectId === project.id ? { ...t, projectId: '' } : t) }))
    })
    closeProject()
  }

  async function persistTask() {
    if (!taskDraft?.title.trim() || !taskDraft.projectId) return
    const draft = { ...taskDraft, id: taskDraft.id || `PT-${Date.now().toString().slice(-7)}`, source: taskDraft.source || 'Riadenie projektov', updatedAt: new Date().toISOString() }
    await runSave(() => savePortfolioTask(draft), () => {
      const next = taskDraft.id ? fallbackTasks.map((t) => t.id === draft.id ? draft : t) : [...fallbackTasks, draft]
      onFallbackTasksChange(next); setData((current) => ({ ...current, tasks: next }))
    })
    setTaskDraft(null)
  }

  async function removeTask(task: Task) {
    if (!canEditTask(task) || !confirm(`Odstrániť úlohu ${task.title}?`)) return
    await runSave(() => deletePortfolioTask(task.id), () => {
      const next = fallbackTasks.filter((t) => t.id !== task.id); onFallbackTasksChange(next); setData((current) => ({ ...current, tasks: next }))
    })
  }

  async function persistMember() {
    if (!memberDraft?.name.trim() || !memberDraft.projectId) return
    const draft = { ...memberDraft, id: memberDraft.id || uid('PM') }
    await runSave(() => saveProjectMember(draft))
    setMemberDraft(null)
  }
  async function persistFunding() {
    if (!fundingDraft?.projectId || !fundingDraftIsValid(fundingDraft)) return
    const linked = (fundingDraft.sourceMode || 'manual') === 'linked_task'
    const task = linked ? contractTaskByCode(fundingDraft.linkedTaskCode || fundingDraft.taskCode) : undefined
    const normalized: ProjectFunding = linked && task
      ? {
          ...fundingDraft,
          sourceType: 'Štátny rozpočet / úloha',
          sourceName: `Úloha ${task.code} - ${task.name}`,
          taskCode: task.code,
          linkedTaskCode: task.code,
          year: contractDataset.meta.year,
          syncSource: contractDataset.meta.source,
        }
      : { ...fundingDraft, sourceMode: 'manual', linkMode: undefined, linkedTaskCode: '', allocationAmount: 0, filterZak: '', selectedLedgerIds: [], syncSource: '' }
    const effective = fundingEffective(normalized)
    const draft = { ...normalized, id: normalized.id || uid('PF'), amount: effective.amount, spent: effective.spent }
    await runSave(() => saveProjectFunding(draft))
    setFundingDraft(null)
  }
  async function persistMilestone() {
    if (!milestoneDraft?.title.trim() || !milestoneDraft.projectId) return
    const draft = { ...milestoneDraft, id: milestoneDraft.id || uid('MS') }
    await runSave(() => saveProjectMilestone(draft))
    setMilestoneDraft(null)
  }
  async function persistLink() {
    if (!linkDraft?.targetName.trim() || !linkDraft.projectId) return
    const draft = { ...linkDraft, id: linkDraft.id || uid('PL') }
    await runSave(() => saveProjectLink(draft))
    setLinkDraft(null)
  }
  async function persistRaid() {
    if (!raidDraft?.title.trim() || !raidDraft.projectId) return
    const draft = { ...raidDraft, id: raidDraft.id || uid('RAID') }
    await runSave(() => saveProjectRaidItem(draft))
    setRaidDraft(null)
  }
  async function persistStatusReport() {
    if (!statusReportDraft?.projectId || !statusReportDraft.period) return
    const draft = { ...statusReportDraft, id: statusReportDraft.id || uid('SR'), authorName: statusReportDraft.authorName || currentUser, authorEmail: statusReportDraft.authorEmail || currentUserEmail }
    await runSave(() => saveProjectStatusReport(draft))
    setStatusReportDraft(null)
  }
  async function persistDecision() {
    if (!decisionDraft?.title.trim() || !decisionDraft.projectId) return
    const draft = { ...decisionDraft, id: decisionDraft.id || uid('DEC') }
    await runSave(() => saveProjectDecision(draft))
    setDecisionDraft(null)
  }

  const stateLabel = dbState === 'loading' ? 'Načítavam' : dbState === 'saving' ? 'Ukladám' : dbState === 'synced' ? 'Synchronizované' : dbState === 'error' ? 'Chyba' : 'Lokálny režim'

  return <div className="project-management">
    <PageHeader
      eyebrow={detailOpen && selectedProject ? `PROJEKT · ${selectedProject.id}` : 'PORTFÓLIO · DELIVERY · FINANCOVANIE'}
      title={detailOpen && selectedProject ? selectedProject.name : 'Riadenie projektov'}
      description={detailOpen && selectedProject ? (selectedProject.objective || selectedProject.description || 'Karta projektu a jeho riadenie.') : 'Jednotný projektový register prepája delivery, ľudí, kapacity, financovanie, úlohy a väzby na systémy, služby, zmluvy a dodávateľov.'}
      actions={<div className="project-header-actions">
        <Badge tone={dbState === 'error' ? 'danger' : dbState === 'saving' || dbState === 'loading' ? 'warning' : 'success'}>{stateLabel}</Badge>
        <button className="button button-secondary" onClick={() => void reload()} disabled={busy}><Icon name="refresh" size={16}/>Obnoviť</button>
        {!detailOpen && canManagePortfolio && <button className="button button-primary" onClick={() => { setPendingCreateLinks([]); setProjectDraft(blankProject()) }}><Icon name="plus" size={16}/>Nový projekt</button>}
      </div>}
    />

    {error && <div className="inline-alert inline-alert-error"><Icon name="warning" size={18}/><span>{error}</span></div>}

    {!detailOpen && <>
      <section className="project-kpi-grid">
        <article><span>Aktívne projekty</span><strong>{kpis.active}</strong><small>z {data.projects.length} v portfóliu</small></article>
        <article><span>Ohrozené</span><strong>{kpis.atRisk}</strong><small>červený health / ohrozený stav</small></article>
        <article><span>Rozpočet</span><strong>{money(kpis.budget)}</strong><small>evidované zdroje financovania</small></article>
        <article><span>Čerpanie</span><strong>{money(kpis.spent)}</strong><small>{kpis.budget ? Math.round(kpis.spent / kpis.budget * 100) : 0}% rozpočtu</small></article>
        <article><span>Míľniky po termíne</span><strong>{kpis.overdueMilestones}</strong><small>vyžadujú pozornosť</small></article>
      </section>

      <div className="project-tabs">
        {([['overview','Prehľad'],...(!isProjectMemberRole ? [['control','Control Center']] : []),['projects','Projekty'],['capacity',isProjectMemberRole ? 'Moje kapacity' : 'Kapacity'],...(role === 'admin' ? [['assignments','Zaradenia']] : [])] as [PortfolioTab,string][]).map(([key,label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}
      </div>

      {(tab === 'overview' || tab === 'projects') && <>
        <div className="project-toolbar"><div className="project-search"><Icon name="search" size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Hľadať projekt, fázu, manažéra…"/></div><span>{filteredProjects.length} projektov</span></div>
        {filteredProjects.length === 0 ? <Empty title={isProjectMemberRole ? 'Nemáte priradený projekt' : 'Žiadne projekty'} text={isProjectMemberRole ? 'Projekt sa zobrazí automaticky, keď vás Admin alebo projektový manažér zaradí do projektového tímu.' : role === 'project_manager' ? 'Vytvorte vlastný projekt alebo vás Admin priradí do existujúceho projektu.' : 'Vytvorte prvý projekt alebo upravte vyhľadávanie.'}/> : <section className="project-portfolio-grid">{filteredProjects.map((project) => {
          const projectTasksAll = data.tasks.filter((task) => task.projectId === project.id)
          const taskCount = projectTasksAll.length
          const memberRows = data.members.filter((member) => member.projectId === project.id && member.isActive)
          const memberCount = memberRows.length
          const fundingRows = data.funding.filter((item) => item.projectId === project.id).map((item) => fundingEffective(item))
          const funding = fundingRows.reduce((sum,item) => sum + item.amount, 0)
          const spent = fundingRows.reduce((sum,item) => sum + item.spent, 0)
          const usage = funding > 0 ? Math.round(spent / funding * 100) : 0
          const openRaid = data.raidItems.filter((item) => item.projectId === project.id && !['Uzavreté','Akceptované'].includes(item.status)).length
          const pendingDecisions = data.decisions.filter((item) => item.projectId === project.id && item.status === 'Čaká na rozhodnutie').length
          const nextMilestone = [...data.milestones].filter((item) => item.projectId === project.id && item.status !== 'Splnené').sort((a,b) => (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31'))[0]
          const autoHealth = healthByProject.get(project.id)?.health || 'Zelený'
          return <article key={project.id} className={`project-card project-card-executive health-${normalize(autoHealth)}`} onClick={() => openProject(project.id)} tabIndex={0} role="button" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openProject(project.id) }}>
            <div className="project-card-accent"/>
            <div className="project-card-top project-card-top-executive"><div><span className="project-code">{project.id}</span><h3>{project.name}</h3></div><div className="project-card-state-stack"><Badge tone={healthTone(autoHealth)}>{autoHealth}</Badge><Badge tone={statusTone(project.status)}>{project.status}</Badge></div></div>
            <div className="project-card-meta"><span><Icon name="roadmap" size={14}/>{project.phase || 'Neurčená fáza'}</span><span><Icon name="user" size={14}/>{project.managerName || project.owner || 'Bez PM'}</span></div>
            <p className="project-card-objective">{project.objective || project.description || 'Bez definovaného cieľa.'}</p>
            <div className="project-card-delivery"><div><span>Delivery</span><strong>{Number(project.progress || 0)}%</strong></div><div className="project-card-progress"><i style={{width:`${Math.max(0,Math.min(100,Number(project.progress || 0)))}%`}}/></div></div>
            <div className="project-card-exec-stats">
              <div><span>Rozpočet</span><strong>{money(funding)}</strong><small>{funding ? `${usage}% čerpané` : 'bez zdroja'}</small></div>
              <div><span>Tím</span><strong>{memberCount}</strong><small>{memberRows.reduce((sum, member) => sum + Number(member.allocationPercent || 0), 0)}% alokácia</small></div>
              <div><span>Úlohy</span><strong>{taskCount}</strong><small>{projectTasksAll.filter((task) => task.status === 'Hotovo').length} hotových</small></div>
              <div><span>Signály</span><strong>{openRaid + pendingDecisions}</strong><small>{openRaid} RAID · {pendingDecisions} rozhod.</small></div>
            </div>
            <div className="project-card-milestone"><span><Icon name="calendar" size={14}/>Najbližší míľnik</span><strong>{project.nextMilestone || nextMilestone?.title || 'Neurčený'}</strong><small>{dateLabel(project.nextMilestoneDue || nextMilestone?.due)}</small></div>
            <div className="project-card-bottom project-card-bottom-executive"><span><Icon name="calendar" size={13}/>{dateLabel(project.start)} → {dateLabel(project.due)}</span><span className="project-card-open-inline">Detail <Icon name="chevron" size={15}/></span></div>
          </article>
        })}</section>}
      </>}

      {tab === 'control' && !isProjectMemberRole && <section className="governance-control-center">
        <div className="project-section-title"><div><span>PROJECT GOVERNANCE & CONTROL</span><h3>Manažérsky Control Center</h3><p className="project-section-help">Jedna obrazovka pre projekty, ktoré vyžadujú zásah: automatický health, RAID, rozhodnutia, status reporting a míľniky po termíne.</p></div></div>
        <section className="governance-kpi-grid">
          <article><span>Červený auto health</span><strong>{controlCenter.criticalProjects.filter((row) => row.auto?.health === 'Červený').length}</strong><small>kritické projekty</small></article>
          <article><span>Otvorený RAID</span><strong>{controlCenter.openRaid.length}</strong><small>riziká, problémy, závislosti</small></article>
          <article><span>Čaká na rozhodnutie</span><strong>{controlCenter.pendingDecisions.length}</strong><small>decision log</small></article>
          <article><span>Chýba status report</span><strong>{controlCenter.missingReports.length}</strong><small>za aktuálny mesiac</small></article>
          <article><span>Míľniky po termíne</span><strong>{controlCenter.overdueMilestones.length}</strong><small>otvorené delivery body</small></article>
        </section>
        <div className="governance-control-grid">
          <section className="governance-panel governance-panel-wide"><div className="governance-panel-head"><div><span>AUTOMATICKÝ PROJECT HEALTH</span><h4>Projekty vyžadujúce pozornosť</h4></div><Badge tone={controlCenter.criticalProjects.some((row) => row.auto?.health === 'Červený') ? 'danger' : 'success'}>{controlCenter.criticalProjects.length} upozornení</Badge></div>
            {controlCenter.criticalProjects.length ? <div className="governance-project-list">{controlCenter.criticalProjects.slice(0,8).map(({project,auto}) => <button key={project.id} onClick={() => openProject(project.id)}><span className={`health-dot ${auto?.health === 'Červený' ? 'red' : 'orange'}`}/><div><strong>{project.id} · {project.name}</strong><small>{auto?.reasons.slice(0,3).join(' · ') || 'Vyžaduje kontrolu'}</small></div><Badge tone={healthTone(auto?.health)}>{auto?.health}</Badge></button>)}</div> : <div className="governance-good"><Icon name="check" size={18}/><div><strong>Portfólio bez kritických signálov</strong><span>Automatický health momentálne neidentifikuje projekt vyžadujúci eskaláciu.</span></div></div>}
          </section>
          <section className="governance-panel"><div className="governance-panel-head"><div><span>DECISION LOG</span><h4>Čakajúce rozhodnutia</h4></div></div>{controlCenter.pendingDecisions.length ? <div className="governance-compact-list">{controlCenter.pendingDecisions.slice(0,6).map((item) => <button key={item.id} onClick={() => openProject(item.projectId)}><strong>{item.title}</strong><span>{item.projectId} · termín {dateLabel(item.due)}</span></button>)}</div> : <p className="capacity-muted">Žiadne otvorené rozhodnutia.</p>}</section>
          <section className="governance-panel"><div className="governance-panel-head"><div><span>STATUS REPORTING</span><h4>Chýbajúce reporty</h4></div></div>{controlCenter.missingReports.length ? <div className="governance-compact-list">{controlCenter.missingReports.slice(0,6).map((project) => <button key={project.id} onClick={() => { openProject(project.id); setDetailTab('governance') }}><strong>{project.id} · {project.name}</strong><span>PM: {project.managerName || project.owner || '—'}</span></button>)}</div> : <div className="governance-good small"><Icon name="check" size={16}/><span>Status reporting je aktuálny.</span></div>}</section>
        </div>
      </section>}

      {tab === 'capacity' && <section className="capacity-shell capacity-intelligence-shell">
        <div className="project-section-title"><div><span>PROJECT CAPACITY INTELLIGENCE</span><h3>{isProjectMemberRole ? 'Moje vyťaženie a kapacitný plán' : 'BI pohľad na kapacity projektových tímov'}</h3><p className="project-section-help">Prepínajte medzi manažérskym BI, časovou heatmapou, grafom alokácií a detailným rozpadom. Všetky pohľady vychádzajú z rovnakých projektových členstiev a platnosti alokácií.</p></div></div>
        <div className="capacity-toolbar capacity-intelligence-toolbar">
          <div className="project-search"><Icon name="search" size={17}/><input value={capacityQuery} onChange={(e) => setCapacityQuery(e.target.value)} placeholder={isProjectMemberRole ? 'Hľadať v mojich projektoch…' : 'Hľadať zamestnanca, projekt alebo rolu…'}/></div>
          <div className="capacity-period-controls">
            <label className="capacity-month"><span>Referenčný mesiac</span><input type="month" value={capacityMonth} onChange={(e) => { setCapacityMonth(e.target.value); setCapacityFocus(null) }}/></label>
            <label className="capacity-month"><span>Horizont</span><select value={capacityHorizon} onChange={(e) => setCapacityHorizon(Number(e.target.value) as 3 | 6 | 12)}><option value={3}>3 mesiace</option><option value={6}>6 mesiacov</option><option value={12}>12 mesiacov</option></select></label>
          </div>
        </div>
        <div className="capacity-view-switch" role="tablist" aria-label="Pohľad na kapacity">
          {([['bi','BI prehľad'],['heatmap','Heatmapa'],['chart','Graf'],['detail','Detail']] as [CapacityView,string][]).map(([key,label]) => <button key={key} className={capacityView === key ? 'active' : ''} onClick={() => setCapacityView(key)}>{key === 'bi' && <Icon name="dashboard" size={15}/>} {key === 'heatmap' && <Icon name="matrix" size={15}/>} {key === 'chart' && <Icon name="capacity" size={15}/>} {key === 'detail' && <Icon name="people" size={15}/>}<span>{label}</span></button>)}
        </div>
        <section className="capacity-kpi-grid capacity-kpi-grid-six">
          <article><span>{isProjectMemberRole ? 'Osoba' : 'Ľudia v projektoch'}</span><strong>{capacityKpis.people}</strong><small>aktívne alokácie v mesiaci</small></article>
          <article><span>Plánované FTE</span><strong>{capacityDistribution.allocatedFte.toLocaleString('sk-SK', { maximumFractionDigits: 1 })}</strong><small>súčet projektových alokácií / 100</small></article>
          <article><span>Voľná kapacita</span><strong>{capacityDistribution.freeFte.toLocaleString('sk-SK', { maximumFractionDigits: 1 })} FTE</strong><small>rezerva do 100 % na osobu</small></article>
          <article><span>Preťažení nad 100 %</span><strong>{capacityKpis.overloaded}</strong><small>vyžaduje preplánovanie</small></article>
          <article><span>Vyťažení 80–100 %</span><strong>{capacityKpis.high}</strong><small>malá voľná rezerva</small></article>
          <article><span>Priemerné vyťaženie</span><strong>{capacityKpis.average}%</strong><small>za referenčný mesiac</small></article>
        </section>

        {capacityView === 'bi' && <div className="capacity-bi-grid">
          <section className="capacity-bi-panel capacity-bi-wide">
            <div className="capacity-bi-heading"><div><span>ROZLOŽENIE KAPACITY</span><h4>Vyťaženosť tímu · {monthCaption(capacityMonth)}</h4></div><Badge tone={capacityKpis.overloaded ? 'danger' : 'success'}>{capacityKpis.overloaded ? `${capacityKpis.overloaded} preťažených` : 'Bez preťaženia'}</Badge></div>
            <div className="capacity-distribution-grid">
              {[{label:'Voľná kapacita',value:capacityDistribution.free,range:'< 50 %',cls:'free'},{label:'Vyvážené',value:capacityDistribution.balanced,range:'50–79 %',cls:'balanced'},{label:'Vysoké vyťaženie',value:capacityDistribution.high,range:'80–100 %',cls:'high'},{label:'Preťaženie',value:capacityDistribution.over,range:'> 100 %',cls:'over'}].map((item) => <article key={item.label} className={`capacity-distribution-card ${item.cls}`}><div><strong>{item.value}</strong><span>{item.label}</span></div><small>{item.range}</small><div className="capacity-dist-track"><span style={{width:`${capacityKpis.people ? Math.round((item.value / capacityKpis.people) * 100) : 0}%`}}/></div></article>)}
            </div>
            <div className="capacity-bi-note"><Icon name="decision" size={16}/><span>BI počíta vyťaženie zo súčtu aktívnych alokácií v projektoch. 100 % predstavuje plnú plánovanú projektovú kapacitu človeka.</span></div>
          </section>

          <section className="capacity-bi-panel">
            <div className="capacity-bi-heading"><div><span>PROJEKTOVÝ TLAK</span><h4>Najväčšie kapacitné projekty</h4></div></div>
            <div className="capacity-ranking">{projectCapacitySummary.length ? projectCapacitySummary.map((item) => <button key={item.project.id} className="capacity-ranking-row" onClick={() => openProject(item.project.id)}><div><strong>{item.project.id} · {item.project.name}</strong><small>{item.people} ľudí · {(item.total / 100).toLocaleString('sk-SK', { maximumFractionDigits: 1 })} FTE</small></div><div className="capacity-ranking-meter"><span style={{width:`${Math.min(100, (item.total / Math.max(100, projectCapacitySummary[0]?.total || 100)) * 100)}%`}}/></div><b>{item.total}%</b></button>) : <Empty title="Bez projektových alokácií" text="V referenčnom mesiaci nie sú aktívne kapacity."/>}</div>
          </section>

          <section className="capacity-bi-panel">
            <div className="capacity-bi-heading"><div><span>ROLE A KOMPETENCIE</span><h4>Kde je sústredená kapacita</h4></div></div>
            <div className="capacity-role-list">{roleCapacitySummary.length ? roleCapacitySummary.map((item) => <div key={item.roleName} className="capacity-role-row"><div><strong>{item.roleName}</strong><small>{item.people} ľudí</small></div><div className="capacity-role-meter"><span style={{width:`${Math.min(100, (item.total / Math.max(100, roleCapacitySummary[0]?.total || 100)) * 100)}%`}}/></div><b>{item.total}%</b></div>) : <p className="capacity-muted">Bez údajov o projektových rolách.</p>}</div>
          </section>

          <section className="capacity-bi-panel capacity-bi-wide">
            <div className="capacity-bi-heading"><div><span>RIZIKÁ KAPACÍT</span><h4>Čo si vyžaduje manažérsku pozornosť</h4></div><Badge tone={capacityRisks.some((item) => item.tone === 'danger') ? 'danger' : capacityRisks.length ? 'warning' : 'success'}>{capacityRisks.length ? `${capacityRisks.length} signálov` : 'Bez signálov'}</Badge></div>
            {capacityRisks.length ? <div className="capacity-risk-list">{capacityRisks.map((risk, index) => <button key={`${risk.title}-${index}`} className={`capacity-risk-row ${risk.tone}`} onClick={() => { if (risk.personKey) { setCapacityFocus({ personKey: risk.personKey, month: capacityMonth }); setCapacityView('heatmap') } }}><span className="capacity-risk-icon"><Icon name={risk.tone === 'danger' ? 'warning' : risk.tone === 'warning' ? 'risk' : 'calendar'} size={17}/></span><div><strong>{risk.title}</strong><small>{risk.text}</small></div><Icon name="chevron" size={15}/></button>)}</div> : <div className="capacity-empty-good"><Icon name="check" size={22}/><div><strong>Kapacitný plán je bez kritických signálov</strong><span>V referenčnom mesiaci nie je evidované preťaženie ani končiaca alokácia.</span></div></div>}
          </section>
        </div>}

        {capacityView === 'heatmap' && <section className="capacity-visual-panel">
          <div className="capacity-bi-heading"><div><span>ČASOVÁ HEATMAPA</span><h4>Vývoj vyťaženia po mesiacoch</h4><p>Kliknutím na bunku otvoríte rozpad človeka na konkrétne projekty.</p></div><div className="heatmap-legend"><span className="heat-free">&lt;50</span><span className="heat-balanced">50–79</span><span className="heat-high">80–100</span><span className="heat-over">&gt;100</span></div></div>
          {capacityMatrixRows.length ? <div className="capacity-heatmap-wrap"><table className="capacity-heatmap"><thead><tr><th>Zamestnanec</th>{capacityMonths.map((monthKey) => <th key={monthKey}>{monthCaption(monthKey)}</th>)}</tr></thead><tbody>{capacityMatrixRows.map((row) => <tr key={row.key}><th><strong>{row.name}</strong><small>{row.email || 'Bez e-mailu'}</small></th>{capacityMonths.map((monthKey) => { const total = Number(row.months[monthKey] || 0); const tone = total > 100 ? 'over' : total >= 80 ? 'high' : total >= 50 ? 'balanced' : total > 0 ? 'free' : 'empty'; return <td key={monthKey}><button className={`capacity-heat-cell ${tone} ${capacityFocus?.personKey === row.key && capacityFocus.month === monthKey ? 'selected' : ''}`} onClick={() => setCapacityFocus({ personKey: row.key, month: monthKey })} title={`${row.name} · ${monthCaption(monthKey)} · ${total}%`}>{total ? `${total}%` : '—'}</button></td>})}</tr>)}</tbody></table></div> : <Empty title="Bez údajov pre heatmapu" text="V zvolenom horizonte nie sú aktívne projektové alokácie."/>}
          {capacityFocusRow && <div className="capacity-focus-panel"><div className="capacity-focus-head"><div><span>DRILL-DOWN</span><h4>{capacityFocusRow.row.name} · {monthCaption(capacityFocusRow.month)}</h4><small>{capacityFocusRow.total}% celkové vyťaženie</small></div><button className="icon-button" onClick={() => setCapacityFocus(null)} aria-label="Zavrieť detail"><Icon name="close" size={16}/></button></div><div className="capacity-focus-assignments">{capacityFocusRow.assignments.length ? capacityFocusRow.assignments.sort((a,b) => Number(b.member.allocationPercent || 0) - Number(a.member.allocationPercent || 0)).map(({member,project}) => <button key={member.id} onClick={() => openProject(project.id)}><div><strong>{project.id} · {project.name}</strong><span>{member.projectRole}{member.responsibility ? ` · ${member.responsibility}` : ''}</span></div><b>{member.allocationPercent}%</b></button>) : <span>Bez alokácie v mesiaci.</span>}</div></div>}
        </section>}

        {capacityView === 'chart' && <section className="capacity-visual-panel">
          <div className="capacity-bi-heading"><div><span>STACKED CAPACITY</span><h4>Rozpad kapacity podľa projektov · {monthCaption(capacityMonth)}</h4><p>Stĺpec je škálovaný do 120 %. Zvislá značka predstavuje hranicu 100 %.</p></div></div>
          {capacityRows.length ? <div className="capacity-chart-list">{capacityRows.map((row) => <article key={row.key} className="capacity-chart-row"><div className="capacity-chart-person"><strong>{row.name}</strong><span>{row.assignments.length} projektov · {row.total}%</span></div><div className="capacity-chart-track"><span className="capacity-chart-limit" title="100 %"/>{row.assignments.sort((a,b) => Number(b.member.allocationPercent || 0) - Number(a.member.allocationPercent || 0)).map(({member,project}) => <button key={member.id} className={`capacity-chart-segment series-${Math.max(0, data.projects.findIndex((item) => item.id === project.id)) % 6}`} style={{width:`${Math.min(100, Number(member.allocationPercent || 0) / 1.2)}%`}} onClick={() => openProject(project.id)} title={`${project.id} · ${project.name}: ${member.allocationPercent}%`}><span>{Number(member.allocationPercent || 0) >= 15 ? `${project.id} ${member.allocationPercent}%` : ''}</span></button>)}</div><Badge tone={capacityTone(row.total)}>{row.total}%</Badge></article>)}</div> : <Empty title="Bez údajov pre graf" text="V referenčnom mesiaci nie sú aktívne projektové alokácie."/>}
          <div className="capacity-chart-axis"><span>0 %</span><span>50 %</span><span>100 %</span><span>120 %</span></div>
        </section>}

        {capacityView === 'detail' && (capacityRows.length ? <div className="capacity-list">{capacityRows.map((row) => <article key={row.key} className="capacity-person-card">
          <div className="capacity-person-head"><div className="capacity-person-name"><span className="capacity-avatar"><Icon name="user" size={18}/></span><div><strong>{row.name}</strong><small>{row.email || 'Bez e-mailu'}</small></div></div><div className="capacity-total"><Badge tone={capacityTone(row.total)}>{row.total}% vyťaženie</Badge><strong>{row.total > 100 ? `+${row.total - 100}% nad kapacitu` : `${100 - row.total}% voľné`}</strong></div></div>
          <div className="capacity-bar"><span className={row.total > 100 ? 'over' : row.total >= 80 ? 'high' : ''} style={{ width: `${Math.min(100, row.total)}%` }}/></div>
          <div className="capacity-assignments">{row.assignments.sort((a,b) => b.member.allocationPercent - a.member.allocationPercent).map(({member, project}) => <div key={member.id} className="capacity-assignment">
            <button className="capacity-project-link" onClick={() => openProject(project.id)}><strong>{project.id} · {project.name}</strong><span>{member.projectRole}{member.responsibility ? ` · ${member.responsibility}` : ''}</span></button>
            <div><b>{member.allocationPercent}%</b><small>{dateLabel(member.validFrom)} – {dateLabel(member.validTo)}</small></div>
            {canManageProject(project) && <button className="icon-button capacity-edit" title="Upraviť alokáciu" onClick={() => setMemberDraft({ ...member })}><Icon name="edit" size={14}/></button>}
          </div>)}</div>
        </article>)}</div> : <Empty title="Bez kapacitných údajov" text={isProjectMemberRole ? 'V zvolenom mesiaci nemáte aktívnu projektovú alokáciu.' : 'Pridajte členov do projektov a nastavte im percentuálnu kapacitu a obdobie platnosti.'}/>)}
      </section>}

      {tab === 'assignments' && role === 'admin' && <section className="capacity-shell project-assignments-shell">
        <div className="project-section-title"><div><span>GLOBÁLNA SPRÁVA ČLENSTIEV</span><h3>Projektové zaradenia zamestnancov</h3></div><button className="button button-primary button-small" onClick={() => setMemberDraft(blankMember())}><Icon name="plus" size={14}/>Pridať zaradenie</button></div>
        <p className="project-section-help">Admin spravuje väzbu používateľ → projekt → projektová rola. Viditeľnosť projektu sa viaže na interné user ID, nie iba na meno alebo e-mail.</p>
        <div className="project-toolbar"><div className="project-search"><Icon name="search" size={17}/><input value={assignmentQuery} onChange={(e) => setAssignmentQuery(e.target.value)} placeholder="Hľadať človeka, projekt alebo rolu…"/></div><span>{assignmentRows.length} zaradení</span></div>
        <div className="project-table-wrap"><table className="project-table"><thead><tr><th>Zamestnanec</th><th>Projekt</th><th>Rola</th><th>Kapacita</th><th>Platnosť</th><th>Väzba účtu</th><th></th></tr></thead><tbody>{assignmentRows.map(({member, project}) => <tr key={member.id}><td><strong>{member.name}</strong><small>{member.email || 'Bez e-mailu'}</small></td><td><button className="assignment-project-button" onClick={() => openProject(project.id)}><strong>{project.id}</strong><span>{project.name}</span></button></td><td><Badge tone={member.projectRole === 'Projektový manažér' ? 'purple' : 'info'}>{member.projectRole}</Badge></td><td><Badge tone={capacityTone(Number(member.allocationPercent || 0))}>{member.allocationPercent}%</Badge></td><td>{dateLabel(member.validFrom)} – {dateLabel(member.validTo)}</td><td><Badge tone={member.userId ? 'success' : 'warning'}>{member.userId ? 'Prepojené' : 'Treba dopárovať'}</Badge></td><td><div className="row-actions"><button title="Upraviť zaradenie" onClick={() => setMemberDraft({ ...member })}><Icon name="edit" size={14}/></button><button title="Odstrániť zaradenie" onClick={() => confirm('Odstrániť projektové zaradenie?') && void runSave(() => deleteProjectMember(member.id))}><Icon name="trash" size={14}/></button></div></td></tr>)}</tbody></table>{!assignmentRows.length && <Empty title="Bez projektových zaradení" text="Pridajte používateľa do projektu a určte jeho projektovú rolu a kapacitu."/>}</div>
      </section>}
    </>}

    {detailOpen && selectedProject && <section className="project-detail-shell project-detail-page">
      <div className="project-detail-toolbar"><button className="button button-secondary button-small" onClick={closeProject}><Icon name="arrow" size={15}/>Späť na projekty</button><span>Karta projektu</span></div>
      <header className={`project-detail-head project-detail-hero health-${normalize(healthByProject.get(selectedProject.id)?.health || 'Zelený')}`}>
        <div className="project-detail-identity"><span>{selectedProject.id} · {selectedProject.type}</span><h2>{selectedProject.name}</h2><p>{selectedProject.objective || selectedProject.description || 'Karta projektu a jeho riadenie.'}</p><div className="project-detail-hero-badges"><Badge tone={healthTone(healthByProject.get(selectedProject.id)?.health)}>{healthByProject.get(selectedProject.id)?.health || 'Zelený'} · auto health</Badge><Badge tone={statusTone(selectedProject.status)}>{selectedProject.status}</Badge><Badge tone="info">{selectedProject.phase || 'Fáza neurčená'}</Badge></div></div>
        <div className="project-detail-actions">{canManageSelectedProject && <><button className="button button-secondary button-small" onClick={() => { setPendingCreateLinks([]); setProjectDraft({ ...blankProject(), ...selectedProject }) }}><Icon name="edit" size={15}/>Upraviť</button><button className="button button-primary button-small" onClick={() => setMemberDraft(blankMember(selectedProject.id))}><Icon name="plus" size={15}/>Člen tímu</button><button className="button button-ghost button-small" onClick={() => void removeProject(selectedProject)}><Icon name="trash" size={15}/></button></>}</div>
        <div className="project-detail-delivery"><div><span>Delivery</span><strong>{Number(selectedProject.progress || 0)}%</strong></div><div className="project-card-progress"><i style={{width:`${Math.max(0,Math.min(100,Number(selectedProject.progress || 0)))}%`}}/></div></div>
        <div className="project-detail-exec-grid">
          <article><span>Projektový manažér</span><strong>{selectedProject.managerName || selectedProject.owner || '—'}</strong><small>{selectedProject.managerEmail || 'bez e-mailu'}</small></article>
          <article><span>Termín</span><strong>{dateLabel(selectedProject.due)}</strong><small>od {dateLabel(selectedProject.start)}</small></article>
          <article><span>Rozpočet</span><strong>{money(projectFinanceBudget)}</strong><small>{projectBudgetUsage}% čerpané · {money(projectFinanceSpent)}</small></article>
          <article><span>Tím / kapacita</span><strong>{projectMembers.length} ľudí</strong><small>{projectCapacityTotal}% projektových alokácií</small></article>
          <article><span>Governance signály</span><strong>{projectOpenRaidCount + projectPendingDecisionCount}</strong><small>{projectOpenRaidCount} RAID · {projectPendingDecisionCount} rozhodnutí</small></article>
          <article><span>Najbližší míľnik</span><strong>{selectedProject.nextMilestone || projectNextMilestone?.title || '—'}</strong><small>{dateLabel(selectedProject.nextMilestoneDue || projectNextMilestone?.due)}</small></article>
        </div>
      </header>

      {role === 'project_manager' && !canManageSelectedProject && <div className="inline-alert inline-alert-info"><Icon name="decision" size={17}/><span><strong>Projekt máte sprístupnený ako člen tímu.</strong> Projektovú kartu môžete čítať; riadiace zmeny vykonáva projektový manažér projektu alebo Admin.</span></div>}

      <div className="project-tabs project-detail-tabs">
        {([['overview','Karta projektu'],['delivery','Delivery a úlohy'],['governance','Governance'],['team','Tím a kapacity'],['finance','Financovanie'],['links','Väzby']] as [ProjectDetailTab,string][]).map(([key,label]) => <button key={key} className={detailTab === key ? 'active' : ''} onClick={() => setDetailTab(key)}>{label}</button>)}
      </div>

      {detailTab === 'overview' && <>
        <div className="project-detail-grid project-detail-context-grid">
          <article><span>Fáza / delivery model</span><strong>{selectedProject.phase || '—'}</strong><small>{selectedProject.deliveryModel || 'Model delivery neurčený'}</small></article>
          <article><span>Gestor / sponsor</span><strong>{selectedProject.sponsor || '—'}</strong><small>riadiaca zodpovednosť</small></article>
          <article><span>Priorita</span><strong>{selectedProject.priority || '—'}</strong><small>{healthByProject.get(selectedProject.id)?.score || 0} bodov automatického rizika</small></article>
          <article><span>Stav reportingu</span><strong>{projectStatusReports.length ? `${projectStatusReports.length} reportov` : 'Bez reportu'}</strong><small>{[...projectStatusReports].sort((a,b) => b.period.localeCompare(a.period))[0]?.period || 'aktuálny report chýba'}</small></article>
          <article><span>Projektový tím</span><strong>{projectMembers.length} ľudí</strong><small>{projectMembers.reduce((sum, member) => sum + Number(member.allocationPercent || 0), 0)}% súčet projektových alokácií</small></article>
          <article><span>Úlohy</span><strong>{projectTasks.length}</strong><small>{projectTasks.filter((task) => task.status === 'Hotovo').length} hotových</small></article>
          <article><span>Rozpočet</span><strong>{money(projectFinanceBudget)}</strong><small>{money(projectFinanceSpent)} čerpané</small></article>
          <article><span>Najbližší míľnik</span><strong>{selectedProject.nextMilestone || projectMilestones.find((m) => m.status !== 'Splnené')?.title || '—'}</strong><small>{dateLabel(selectedProject.nextMilestoneDue || projectMilestones.find((m) => m.status !== 'Splnené')?.due)}</small></article>
          <article className="span-two"><span>Cieľ projektu</span><strong>{selectedProject.objective || 'Zatiaľ neurčený'}</strong><small>{selectedProject.description || ''}</small></article>
          <article className="span-two"><span>Očakávaný výsledok</span><strong>{selectedProject.expectedOutcome || 'Zatiaľ neurčený'}</strong><small>{selectedProject.note || ''}</small></article>
        </div>
        <section className="project-overview-actions"><div className="project-section-title"><div><span>RÝCHLA SPRÁVA</span><h3>Projektové oblasti</h3></div></div><div className="project-quick-grid">
          <button onClick={() => setDetailTab('delivery')}><Icon name="roadmap" size={19}/><div><strong>Delivery a úlohy</strong><span>{projectMilestones.length} míľnikov · {projectTasks.length} úloh</span></div><Icon name="chevron" size={16}/></button>
          <button onClick={() => setDetailTab('team')}><Icon name="people" size={19}/><div><strong>Tím a kapacity</strong><span>{projectMembers.length} členov projektu</span></div><Icon name="chevron" size={16}/></button>
          <button onClick={() => setDetailTab('finance')}><Icon name="capacity" size={19}/><div><strong>Financovanie</strong><span>{projectFunding.length} zdrojov financovania</span></div><Icon name="chevron" size={16}/></button>
          <button onClick={() => setDetailTab('links')}><Icon name="systems" size={19}/><div><strong>Väzby</strong><span>{projectLinks.length} väzieb na registre</span></div><Icon name="chevron" size={16}/></button>
          <button onClick={() => setDetailTab('governance')}><Icon name="decision" size={19}/><div><strong>Governance</strong><span>{projectOpenRaidCount} otvorených RAID · {projectPendingDecisionCount} rozhodnutí</span></div><Icon name="chevron" size={16}/></button>
        </div></section>
      </>}

      {detailTab === 'delivery' && <div className="project-two-column">
        <section><div className="project-section-title"><div><span>DELIVERY</span><h3>Míľniky a fázy</h3></div>{canManageSelectedProject && <button className="button button-primary button-small" onClick={() => setMilestoneDraft(blankMilestone(selectedProject.id))}><Icon name="plus" size={14}/>Míľnik</button>}</div>
          <div className="project-timeline">{projectMilestones.length ? [...projectMilestones].sort((a,b) => a.due.localeCompare(b.due)).map((item) => <article key={item.id}><i className={item.status === 'Splnené' ? 'done' : item.status === 'Blokované' ? 'blocked' : ''}/><div><div><strong>{item.title}</strong><Badge tone={statusTone(item.status)}>{item.status}</Badge></div><span>{item.phase}{item.gate ? ` · ${item.gate}` : ''}</span><small>{item.owner || 'Bez vlastníka'} · {dateLabel(item.due)}</small>{item.note && <p>{item.note}</p>}</div>{canManageSelectedProject && <div className="row-actions"><button onClick={() => setMilestoneDraft({ ...item })}><Icon name="edit" size={14}/></button><button onClick={() => confirm('Odstrániť míľnik?') && void runSave(() => deleteProjectMilestone(item.id))}><Icon name="trash" size={14}/></button></div>}</article>) : <Empty title="Bez míľnikov" text="Doplňte hlavné delivery body a rozhodovacie gates."/>}</div>
        </section>
        <section><div className="project-section-title"><div><span>PRÁCA</span><h3>Úlohy projektu</h3></div>{canManageSelectedProject && <button className="button button-secondary button-small" onClick={() => setTaskDraft(blankTask(selectedProject.id))}><Icon name="plus" size={14}/>Úloha</button>}</div>
          <div className="project-task-list">{projectTasks.length ? projectTasks.map((task) => <article key={task.id}><div><strong>{task.title}</strong><span>{task.owner || 'Bez vlastníka'} · {dateLabel(task.due)}</span></div><Progress value={task.status === 'Hotovo' ? 100 : Number(task.progress || 0)}/><Badge tone={statusTone(task.status)}>{task.status}</Badge>{canEditTask(task) && <button onClick={() => setTaskDraft({ ...blankTask(selectedProject.id), ...task })}><Icon name="edit" size={14}/></button>}</article>) : <Empty title="Bez úloh" text="Projekt zatiaľ nemá evidované úlohy."/>}</div>
        </section>
      </div>}

      {detailTab === 'governance' && <div className="project-governance-space">
        <section className="governance-health-card">
          <div className="governance-health-main"><span>AUTOMATICKÝ PROJECT HEALTH</span><div><strong>{healthByProject.get(selectedProject.id)?.health || 'Zelený'}</strong><Badge tone={healthTone(healthByProject.get(selectedProject.id)?.health)}>{healthByProject.get(selectedProject.id)?.score || 0} bodov rizika</Badge></div><p>{healthByProject.get(selectedProject.id)?.reasons.join(' · ') || 'Bez identifikovaných varovných signálov.'}</p></div>
          <div className="governance-health-metrics"><article><span>Otvorený RAID</span><strong>{projectRaidItems.filter((item) => !['Uzavreté','Akceptované'].includes(item.status)).length}</strong></article><article><span>Čaká na rozhodnutie</span><strong>{projectDecisions.filter((item) => item.status === 'Čaká na rozhodnutie').length}</strong></article><article><span>Status reporty</span><strong>{projectStatusReports.length}</strong></article><article><span>Posledný report</span><strong>{projectStatusReports.sort((a,b) => b.period.localeCompare(a.period))[0]?.period || '—'}</strong></article></div>
        </section>

        <section><div className="project-section-title"><div><span>RAID REGISTER</span><h3>Riziká, problémy, závislosti a predpoklady</h3></div>{canManageSelectedProject && <button className="button button-primary button-small" onClick={() => setRaidDraft(blankRaidItem(selectedProject.id))}><Icon name="plus" size={14}/>RAID položka</button>}</div>
          <div className="project-table-wrap"><table className="project-table governance-table"><thead><tr><th>Typ</th><th>Položka</th><th>Závažnosť</th><th>Vlastník</th><th>Termín</th><th>Stav</th><th></th></tr></thead><tbody>{[...projectRaidItems].sort((a,b) => (a.status === 'Uzavreté' ? 1 : 0) - (b.status === 'Uzavreté' ? 1 : 0) || severityStates.indexOf(b.severity) - severityStates.indexOf(a.severity)).map((item) => <tr key={item.id}><td><Badge tone={item.itemType === 'Problém' ? 'danger' : item.itemType === 'Riziko' ? 'warning' : 'info'}>{item.itemType}</Badge></td><td><strong>{item.title}</strong><small>{item.description || item.response || '—'}</small></td><td><Badge tone={item.severity === 'Kritická' ? 'danger' : item.severity === 'Vysoká' ? 'warning' : 'neutral'}>{item.severity}</Badge></td><td>{item.owner || '—'}</td><td>{dateLabel(item.due)}</td><td>{item.status}</td><td>{canManageSelectedProject && <div className="row-actions"><button onClick={() => setRaidDraft({ ...item })}><Icon name="edit" size={14}/></button><button onClick={() => confirm('Odstrániť RAID položku?') && void runSave(() => deleteProjectRaidItem(item.id))}><Icon name="trash" size={14}/></button></div>}</td></tr>)}</tbody></table>{!projectRaidItems.length && <Empty title="RAID register je prázdny" text="Evidujte riziká, problémy, závislosti a predpoklady projektu."/>}</div>
        </section>

        <div className="project-two-column governance-two-column">
          <section><div className="project-section-title"><div><span>STATUS REPORT</span><h3>Pravidelný manažérsky reporting</h3></div>{canManageSelectedProject && <button className="button button-secondary button-small" onClick={() => setStatusReportDraft({ ...blankStatusReport(selectedProject.id, currentUser, currentUserEmail), progressPercent: Number(selectedProject.progress || 0), overallStatus: healthByProject.get(selectedProject.id)?.health || 'Zelený' })}><Icon name="plus" size={14}/>Status report</button>}</div>
            <div className="status-report-list">{[...projectStatusReports].sort((a,b) => b.period.localeCompare(a.period)).map((report) => <article key={report.id}><div className="status-report-head"><div><strong>{report.period}</strong><span>{dateLabel(report.reportDate)} · {report.authorName || '—'}</span></div><Badge tone={healthTone(report.overallStatus)}>{report.overallStatus}</Badge></div><p>{report.summary || 'Bez manažérskeho zhrnutia.'}</p><div className="status-report-meta"><span>Progress <b>{report.progressPercent}%</b></span>{report.decisionsNeeded && <span>Rozhodnutie: <b>{report.decisionsNeeded}</b></span>}</div>{canManageSelectedProject && <div className="row-actions"><button onClick={() => setStatusReportDraft({ ...report })}><Icon name="edit" size={14}/></button><button onClick={() => confirm('Odstrániť status report?') && void runSave(() => deleteProjectStatusReport(report.id))}><Icon name="trash" size={14}/></button></div>}</article>)}{!projectStatusReports.length && <Empty title="Bez status reportu" text="PM môže vytvoriť pravidelný mesačný report projektu."/>}</div>
          </section>
          <section><div className="project-section-title"><div><span>DECISION LOG</span><h3>Rozhodnutia a požiadavky na vedenie</h3></div>{canManageSelectedProject && <button className="button button-secondary button-small" onClick={() => setDecisionDraft(blankDecision(selectedProject.id))}><Icon name="plus" size={14}/>Rozhodnutie</button>}</div>
            <div className="decision-list">{[...projectDecisions].sort((a,b) => (a.status === 'Čaká na rozhodnutie' ? 0 : 1) - (b.status === 'Čaká na rozhodnutie' ? 0 : 1) || (a.due || '9999').localeCompare(b.due || '9999')).map((item) => <article key={item.id}><div><strong>{item.title}</strong><span>{item.decisionMaker || 'Bez rozhodovateľa'} · {dateLabel(item.due)}</span><p>{item.decision || item.reason || 'Čaká na rozhodnutie.'}</p></div><Badge tone={item.status === 'Rozhodnuté' ? 'success' : item.status === 'Čaká na rozhodnutie' ? 'warning' : 'neutral'}>{item.status}</Badge>{canManageSelectedProject && <div className="row-actions"><button onClick={() => setDecisionDraft({ ...item })}><Icon name="edit" size={14}/></button><button onClick={() => confirm('Odstrániť rozhodnutie?') && void runSave(() => deleteProjectDecision(item.id))}><Icon name="trash" size={14}/></button></div>}</article>)}{!projectDecisions.length && <Empty title="Decision log je prázdny" text="Evidujte rozhodnutia, ktoré ovplyvňujú scope, termín, rozpočet alebo delivery."/>}</div>
          </section>
        </div>
      </div>}

      {detailTab === 'team' && <section><div className="project-section-title"><div><span>ĽUDIA A ZODPOVEDNOSTI</span><h3>Projektový tím a plánované kapacity</h3></div>{canManageSelectedProject && <button className="button button-primary button-small" onClick={() => setMemberDraft(blankMember(selectedProject.id))}><Icon name="plus" size={14}/>Člen tímu</button>}</div>
        <div className="project-table-wrap"><table className="project-table"><thead><tr><th>Meno</th><th>Rola v projekte</th><th>Zodpovednosť</th><th>Kapacita</th><th>Platnosť</th><th></th></tr></thead><tbody>{projectMembers.map((member) => <tr key={member.id}><td><strong>{member.name}</strong><small>{member.email}</small></td><td><Badge tone={member.projectRole === 'Projektový manažér' ? 'purple' : 'info'}>{member.projectRole}</Badge></td><td>{member.responsibility || '—'}</td><td><Badge tone={capacityTone(Number(member.allocationPercent || 0))}>{member.allocationPercent}%</Badge></td><td>{dateLabel(member.validFrom)} – {dateLabel(member.validTo)}</td><td>{canManageSelectedProject && <div className="row-actions"><button onClick={() => setMemberDraft({ ...member })}><Icon name="edit" size={14}/></button><button onClick={() => confirm('Odstrániť člena z projektu?') && void runSave(() => deleteProjectMember(member.id))}><Icon name="trash" size={14}/></button></div>}</td></tr>)}</tbody></table>{!projectMembers.length && <Empty title="Tím ešte nie je zostavený" text="Pridajte gestora, analytikov, testerov, technické roly a ďalších členov."/>}</div>
      </section>}

      {detailTab === 'finance' && <section><div className="project-section-title"><div><span>ZDROJE A ČERPANIE</span><h3>Financovanie projektu</h3><p className="project-section-help">Projekt môže kombinovať synchronizované IT úlohy 10 / 22 / 25 a ľubovoľné manuálne zdroje financovania.</p></div>{canManageSelectedProject && <div className="project-finance-actions"><button className="button button-secondary button-small" onClick={() => setFundingDraft(blankFunding(selectedProject.id, 'linked_task'))}><Icon name="systems" size={14}/>Pripojiť IT úlohu</button><button className="button button-primary button-small" onClick={() => setFundingDraft(blankFunding(selectedProject.id, 'manual'))}><Icon name="plus" size={14}/>Nový zdroj</button></div>}</div>
        <div className="project-finance-data-note"><Icon name="database" size={16}/><div><strong>IT finančná dátová vrstva</strong><span>{contractDataset.meta.period} · {contractDataset.meta.source}. Mesiace po poslednom načítanom období sa nepovažujú za nulové čerpanie.</span></div></div>
        <div className="project-finance-summary"><div><span>Projektový rozpočet</span><strong>{money(projectFinanceBudget)}</strong></div><div><span>Čerpanie</span><strong>{money(projectFinanceSpent)}</strong></div><div><span>Zostatok</span><strong>{money(projectFinanceBudget - projectFinanceSpent)}</strong></div><div><span>Synchronizované zdroje</span><strong>{projectFundingView.filter((row) => row.effective.linked).length}</strong></div></div>
        <div className="project-table-wrap"><table className="project-table project-finance-table"><thead><tr><th>Zdroj</th><th>Väzba</th><th>Rok</th><th>Rozpočet</th><th>Čerpanie</th><th>Zostatok</th><th>Stav dát</th><th></th></tr></thead><tbody>{projectFundingView.map(({item,effective}) => <tr key={item.id}><td><strong>{item.sourceType}</strong><small>{effective.task ? `Úloha ${effective.task.code} · ${effective.task.name}` : (item.sourceName || '—')}</small></td><td><strong>{fundingLinkLabel(item)}</strong>{item.program && <small>{item.program}</small>}</td><td>{item.year || '—'}</td><td>{money(effective.amount)}</td><td>{money(effective.spent)}</td><td className={effective.remaining < 0 ? 'finance-negative' : ''}>{money(effective.remaining)}</td><td><Badge tone={effective.linked ? (effective.status === 'Synchronizovaný' ? 'success' : 'warning') : 'neutral'}>{effective.status}</Badge>{!effective.linked && contractTaskByCode(item.taskCode) && canManageSelectedProject && <button className="finance-inline-link" onClick={() => setFundingDraft({ ...item, sourceMode: 'linked_task', linkedTaskCode: item.taskCode, linkMode: 'whole_task', allocationAmount: 0, selectedLedgerIds: [], syncSource: contractDataset.meta.source })}>Prepojiť</button>}</td><td><div className="row-actions">{effective.linked && <button title="Detail čerpania" onClick={() => setFinanceDrilldown(item)}><Icon name="eye" size={14}/></button>}{canManageSelectedProject && <><button title="Upraviť" onClick={() => setFundingDraft({ ...item, sourceMode: item.sourceMode || 'manual', selectedLedgerIds: item.selectedLedgerIds || [] })}><Icon name="edit" size={14}/></button><button title="Odstrániť" onClick={() => confirm('Odstrániť zdroj financovania?') && void runSave(() => deleteProjectFunding(item.id))}><Icon name="trash" size={14}/></button></>}</div></td></tr>)}</tbody></table>{!projectFunding.length && <Empty title="Financovanie nie je evidované" text="Pripojte IT úlohu 10 / 22 / 25 alebo pridajte nový manuálny zdroj financovania."/>}</div>
      </section>}

      {detailTab === 'links' && <section><div className="project-section-title"><div><span>VÄZBY NA OSTATNÉ MODULY</span><h3>Systémy, služby, zmluvy a dodávatelia</h3></div>{canManageSelectedProject && <button className="button button-primary button-small" onClick={() => setLinkDraft(blankLink(selectedProject.id))}><Icon name="plus" size={14}/>Pridať väzbu</button>}</div>
        <div className="project-link-grid">{projectLinks.map((link) => <article key={link.id}><span className="project-link-icon"><Icon name={link.targetType === 'Dodávateľ' ? 'database' : link.targetType === 'Zmluva' ? 'calendar' : 'systems'} size={18}/></span><div><small>{link.targetType}</small><strong>{link.targetName}</strong><span>{link.relation}{link.targetKey ? ` · ${link.targetKey}` : ''}</span></div>{canManageSelectedProject && <div className="row-actions"><button onClick={() => setLinkDraft({ ...link })}><Icon name="edit" size={14}/></button><button onClick={() => confirm('Odstrániť väzbu?') && void runSave(() => deleteProjectLink(link.id))}><Icon name="trash" size={14}/></button></div>}</article>)}</div>{!projectLinks.length && <Empty title="Projekt zatiaľ nemá väzby" text="Prepojte ho s informačnými systémami, službami, zmluvami, dodávateľmi alebo rizikami."/>}
      </section>}
    </section>}

    {projectDraft && <Modal wide title={projectDraft.id ? `Projekt ${projectDraft.id}` : 'Nový projekt'} onClose={() => { setProjectDraft(null); setPendingCreateLinks([]) }}>{!projectDraft.id && pendingCreateLinks.length > 0 && <div className="project-origin-banner"><Icon name="systems" size={18}/><div><strong>Projekt vzniká z existujúcej evidencie</strong><span>{pendingCreateLinks.map((link) => `${link.targetType}: ${link.targetName}`).join(' · ')}</span><small>Po uložení sa vytvoria živé väzby; zdrojové údaje sa nekopírujú ako samostatný register.</small></div></div>}<div className="project-form-grid">
      <Field label="Názov projektu"><input value={projectDraft.name} onChange={(e) => setProjectDraft({ ...projectDraft, name: e.target.value })}/></Field>
      <Field label="Typ"><input value={projectDraft.type} onChange={(e) => setProjectDraft({ ...projectDraft, type: e.target.value })}/></Field>
      <Field label="Fáza"><select value={projectDraft.phase || ''} onChange={(e) => setProjectDraft({ ...projectDraft, phase: e.target.value })}>{projectPhases.map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Stav"><select value={projectDraft.status} onChange={(e) => setProjectDraft({ ...projectDraft, status: e.target.value })}>{projectStatuses.map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Health"><select value={projectDraft.health || ''} onChange={(e) => setProjectDraft({ ...projectDraft, health: e.target.value })}>{healthStates.map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Priorita"><select value={projectDraft.priority} onChange={(e) => setProjectDraft({ ...projectDraft, priority: e.target.value })}>{priorities.map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Projektový manažér"><input value={projectDraft.managerName || ''} onChange={(e) => setProjectDraft({ ...projectDraft, managerName: e.target.value, owner: e.target.value })} disabled={role === 'project_manager'}/></Field>
      {role === 'admin' ? <Field label="Vybrať používateľa"><select value="" onChange={(e) => { const ref = data.references.find((item) => item.type === 'Používateľ' && item.key === e.target.value); if (ref) setProjectDraft({ ...projectDraft, managerUserId: ref.key, managerName: ref.name, owner: ref.name, managerEmail: ref.subtitle.split(' · ')[0] || '' }) }}><option value="">— vybrať z používateľov —</option>{data.references.filter((ref) => ref.type === 'Používateľ').map((ref) => <option key={ref.key} value={ref.key}>{ref.name}{ref.subtitle ? ` · ${ref.subtitle}` : ''}</option>)}</select></Field> : <Field label="Rozsah PM" hint="Projektový manažér riadi iba projekty, ku ktorým je priradený ako PM."><input value="Vlastné projekty" disabled/></Field>}
      <Field label="E-mail PM"><input type="email" value={projectDraft.managerEmail || ''} onChange={(e) => setProjectDraft({ ...projectDraft, managerEmail: e.target.value })} disabled={role === 'project_manager'}/></Field>
      <Field label="Gestor / sponsor"><input value={projectDraft.sponsor} onChange={(e) => setProjectDraft({ ...projectDraft, sponsor: e.target.value })}/></Field>
      <Field label="Delivery model"><select value={projectDraft.deliveryModel || ''} onChange={(e) => setProjectDraft({ ...projectDraft, deliveryModel: e.target.value })}>{deliveryModels.map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Začiatok"><input type="date" value={projectDraft.start} onChange={(e) => setProjectDraft({ ...projectDraft, start: e.target.value })}/></Field>
      <Field label="Plánovaný koniec"><input type="date" value={projectDraft.due} onChange={(e) => setProjectDraft({ ...projectDraft, due: e.target.value })}/></Field>
      <Field label="Progress %"><input type="number" min="0" max="100" value={projectDraft.progress} onChange={(e) => setProjectDraft({ ...projectDraft, progress: Number(e.target.value) })}/></Field>
      <Field label="Najbližší míľnik"><input value={projectDraft.nextMilestone || ''} onChange={(e) => setProjectDraft({ ...projectDraft, nextMilestone: e.target.value })}/></Field>
      <Field label="Termín míľnika"><input type="date" value={projectDraft.nextMilestoneDue || ''} onChange={(e) => setProjectDraft({ ...projectDraft, nextMilestoneDue: e.target.value })}/></Field>
      <Field label="Cieľ projektu"><textarea rows={3} value={projectDraft.objective || ''} onChange={(e) => setProjectDraft({ ...projectDraft, objective: e.target.value })}/></Field>
      <Field label="Očakávaný výsledok"><textarea rows={3} value={projectDraft.expectedOutcome || ''} onChange={(e) => setProjectDraft({ ...projectDraft, expectedOutcome: e.target.value })}/></Field>
      <Field label="Popis"><textarea rows={3} value={projectDraft.description} onChange={(e) => setProjectDraft({ ...projectDraft, description: e.target.value })}/></Field>
      <Field label="Poznámka"><textarea rows={3} value={projectDraft.note || ''} onChange={(e) => setProjectDraft({ ...projectDraft, note: e.target.value })}/></Field>
    </div><div className="modal-actions"><button className="button button-secondary" onClick={() => setProjectDraft(null)}>Zrušiť</button><button className="button button-primary" disabled={busy || !projectDraft.name.trim()} onClick={() => void persistProject()}>Uložiť projekt</button></div></Modal>}

    {memberDraft && <Modal title={memberDraft.id ? 'Upraviť člena projektu' : 'Pridať člena projektu'} onClose={() => setMemberDraft(null)}><div className="form-grid">
      <Field label="Projekt" hint={detailOpen ? 'Pri úprave z karty projektu je projekt pevne určený.' : 'Vyberte projekt, do ktorého bude používateľ zaradený.'}><select value={memberDraft.projectId} disabled={detailOpen} onChange={(e) => setMemberDraft({ ...memberDraft, projectId: e.target.value })}><option value="">— vybrať projekt —</option>{data.projects.map((project) => <option key={project.id} value={project.id}>{project.id} · {project.name}</option>)}</select></Field>
      <Field label="Vybrať používateľa" hint="Odporúčané: výber používateľa vytvorí pevnú väzbu na jeho interné user ID."><select value={memberDraft.userId || ''} onChange={(e) => { const ref = data.references.find((item) => item.type === 'Používateľ' && item.key === e.target.value); if (ref) setMemberDraft({ ...memberDraft, userId: ref.key, name: ref.name, email: ref.subtitle.split(' · ')[0] || '' }); else setMemberDraft({ ...memberDraft, userId: '' }) }}><option value="">— vybrať z používateľov —</option>{data.references.filter((ref) => ref.type === 'Používateľ').map((ref) => <option key={ref.key} value={ref.key}>{ref.name}{ref.subtitle ? ` · ${ref.subtitle}` : ''}</option>)}</select></Field>
      <Field label="Meno"><input value={memberDraft.name} onChange={(e) => setMemberDraft({ ...memberDraft, name: e.target.value, userId: memberDraft.userId })}/></Field><Field label="E-mail"><input type="email" value={memberDraft.email} onChange={(e) => setMemberDraft({ ...memberDraft, email: e.target.value, userId: memberDraft.userId })}/></Field>
      <Field label="Väzba na účet" hint="Člen projektu uvidí projekt podľa user ID. Staršie záznamy migrácia v0.53.0 automaticky dopáruje, ak je zhoda jednoznačná."><input value={memberDraft.userId ? `Prepojené · ${memberDraft.userId}` : 'Zatiaľ bez pevnej väzby'} disabled/></Field>
      <Field label="Rola v projekte"><select value={memberDraft.projectRole} onChange={(e) => setMemberDraft({ ...memberDraft, projectRole: e.target.value })}>{projectRoles.map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Kapacita %"><input type="number" min="0" max="100" value={memberDraft.allocationPercent} onChange={(e) => setMemberDraft({ ...memberDraft, allocationPercent: Number(e.target.value) })}/></Field>
      <Field label="Zodpovednosť"><textarea rows={3} value={memberDraft.responsibility} onChange={(e) => setMemberDraft({ ...memberDraft, responsibility: e.target.value })}/></Field><Field label="Poznámka"><textarea rows={3} value={memberDraft.note} onChange={(e) => setMemberDraft({ ...memberDraft, note: e.target.value })}/></Field>
      <Field label="Platí od"><input type="date" value={memberDraft.validFrom} onChange={(e) => setMemberDraft({ ...memberDraft, validFrom: e.target.value })}/></Field><Field label="Platí do"><input type="date" value={memberDraft.validTo} onChange={(e) => setMemberDraft({ ...memberDraft, validTo: e.target.value })}/></Field>
    </div><div className="modal-actions"><button className="button button-secondary" onClick={() => setMemberDraft(null)}>Zrušiť</button><button className="button button-primary" disabled={busy || !memberDraft.name.trim() || !memberDraft.projectId} onClick={() => void persistMember()}>Uložiť</button></div></Modal>}

    {fundingDraft && <Modal wide title={fundingDraft.id ? 'Upraviť financovanie' : ((fundingDraft.sourceMode || 'manual') === 'linked_task' ? 'Pripojiť IT úlohu' : 'Nový zdroj financovania')} onClose={() => setFundingDraft(null)}><div className="finance-source-mode"><button className={(fundingDraft.sourceMode || 'manual') === 'manual' ? 'active' : ''} onClick={() => setFundingDraft({ ...fundingDraft, sourceMode: 'manual', linkMode: undefined })}>Manuálny zdroj</button><button className={(fundingDraft.sourceMode || 'manual') === 'linked_task' ? 'active' : ''} onClick={() => setFundingDraft({ ...fundingDraft, sourceMode: 'linked_task', sourceType: 'Štátny rozpočet / úloha', linkMode: fundingDraft.linkMode || 'whole_task', syncSource: contractDataset.meta.source })}>Prepojená IT úloha</button></div>
      {(fundingDraft.sourceMode || 'manual') === 'manual' ? <div className="form-grid">
        <Field label="Typ zdroja"><select value={fundingDraft.sourceType} onChange={(e) => setFundingDraft({ ...fundingDraft, sourceType: e.target.value })}>{fundingTypes.map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Názov zdroja"><input value={fundingDraft.sourceName} onChange={(e) => setFundingDraft({ ...fundingDraft, sourceName: e.target.value })}/></Field>
        <Field label="Program / výzva"><input value={fundingDraft.program} onChange={(e) => setFundingDraft({ ...fundingDraft, program: e.target.value })}/></Field><Field label="Úloha / kód"><input value={fundingDraft.taskCode} onChange={(e) => setFundingDraft({ ...fundingDraft, taskCode: e.target.value })}/></Field>
        <Field label="Rok"><input type="number" value={fundingDraft.year} onChange={(e) => setFundingDraft({ ...fundingDraft, year: Number(e.target.value) })}/></Field><Field label="Spolufinancovanie %"><input type="number" min="0" max="100" value={fundingDraft.cofinancingPercent} onChange={(e) => setFundingDraft({ ...fundingDraft, cofinancingPercent: Number(e.target.value) })}/></Field>
        <Field label="Rozpočet €"><input type="number" min="0" step="0.01" value={fundingDraft.amount} onChange={(e) => setFundingDraft({ ...fundingDraft, amount: Number(e.target.value) })}/></Field><Field label="Čerpanie €"><input type="number" min="0" step="0.01" value={fundingDraft.spent} onChange={(e) => setFundingDraft({ ...fundingDraft, spent: Number(e.target.value) })}/></Field>
        <Field label="Poznámka"><textarea rows={3} value={fundingDraft.note} onChange={(e) => setFundingDraft({ ...fundingDraft, note: e.target.value })}/></Field>
      </div> : <div className="finance-link-form">
        <div className="form-grid"><Field label="IT úloha" hint="Vyberte autoritatívny finančný zdroj z pohľadu SIT 2026."><select value={fundingDraft.linkedTaskCode || fundingDraft.taskCode || ''} onChange={(e) => { const task = contractTaskByCode(e.target.value); setFundingDraft({ ...fundingDraft, linkedTaskCode: e.target.value, taskCode: e.target.value, sourceName: task ? `Úloha ${task.code} - ${task.name}` : '', year: contractDataset.meta.year, filterZak: '', selectedLedgerIds: [] }) }}><option value="">— vybrať úlohu —</option>{contractDataset.tasks.map((task) => <option key={task.code} value={task.code}>Úloha {task.code} · {task.name}</option>)}</select></Field><Field label="Spôsob väzby"><select value={fundingDraft.linkMode || 'whole_task'} onChange={(e) => setFundingDraft({ ...fundingDraft, linkMode: e.target.value as ProjectFunding['linkMode'], filterZak: '', selectedLedgerIds: [] })}><option value="whole_task">Celá úloha</option><option value="zak">Podľa ZAK</option><option value="items">Vybrané finančné položky</option><option value="allocation">Projektová alokácia + manuálne čerpanie</option></select></Field></div>
        {contractTaskByCode(fundingDraft.linkedTaskCode || fundingDraft.taskCode) && <div className="finance-link-preview">{(() => { const task = contractTaskByCode(fundingDraft.linkedTaskCode || fundingDraft.taskCode)!; return <><div><span>Rozpočet úlohy</span><strong>{moneyPrecise(task.budget)}</strong></div><div><span>Čerpanie úlohy</span><strong>{moneyPrecise(task.spent)}</strong></div><div><span>Zostatok úlohy</span><strong>{moneyPrecise(task.remaining)}</strong></div><div><span>Dátové obdobie</span><strong>{contractDataset.meta.period}</strong></div></> })()}</div>}
        {fundingDraft.linkMode === 'whole_task' && <div className="finance-link-warning"><Icon name="warning" size={16}/><span>Celá úloha znamená, že celý rozpočet a celé čerpanie úlohy budú započítané do projektu. Ak úloha financuje viac projektov, použite ZAK, vybrané položky alebo projektovú alokáciu.</span></div>}
        {fundingDraft.linkMode === 'zak' && <div className="form-grid"><Field label="ZAK" hint="Čerpanie sa spočíta iba z riadkov vybranej IT úlohy s týmto ZAK."><select value={fundingDraft.filterZak || ''} onChange={(e) => setFundingDraft({ ...fundingDraft, filterZak: e.target.value })}><option value="">— vybrať ZAK —</option>{Array.from(new Set(ledgerRowsForTask(fundingDraft.linkedTaskCode || fundingDraft.taskCode).map((row) => row.zak).filter(Boolean))).sort().map((zak) => <option key={zak} value={zak}>{zak}</option>)}</select></Field><Field label="Projektová alokácia €"><input type="number" min="0" step="0.01" value={fundingDraft.allocationAmount || 0} onChange={(e) => setFundingDraft({ ...fundingDraft, allocationAmount: Number(e.target.value) })}/></Field></div>}
        {fundingDraft.linkMode === 'items' && <><div className="form-grid"><Field label="Projektová alokácia €"><input type="number" min="0" step="0.01" value={fundingDraft.allocationAmount || 0} onChange={(e) => setFundingDraft({ ...fundingDraft, allocationAmount: Number(e.target.value) })}/></Field></div>{selectedProject && <div className="finance-item-suggest"><button className="button button-secondary button-small" onClick={() => { const needle = normalize(selectedProject.name); const ids = ledgerRowsForTask(fundingDraft.linkedTaskCode || fundingDraft.taskCode).filter((row) => needle && normalize(row.note || '').includes(needle)).map((row) => row.id); setFundingDraft({ ...fundingDraft, selectedLedgerIds: ids }) }}><Icon name="search" size={14}/>Navrhnúť podľa názvu projektu</button><span>Pomôcka iba predvyberie riadky, ktorých popis obsahuje názov projektu. Výber pred uložením skontrolujte.</span></div>}<Field label="Vybrané položky čerpania" hint="Ctrl/Shift umožní vybrať viac riadkov. Čerpanie projektu bude súčtom vybraných zdrojových položiek."><select className="finance-ledger-select" multiple size={9} value={fundingDraft.selectedLedgerIds || []} onChange={(e) => setFundingDraft({ ...fundingDraft, selectedLedgerIds: Array.from(e.currentTarget.selectedOptions).map((option) => option.value) })}>{ledgerRowsForTask(fundingDraft.linkedTaskCode || fundingDraft.taskCode).map((row) => <option key={row.id} value={row.id}>{row.date} · {row.document || row.id} · {moneyPrecise(row.amount)} · ZAK {row.zak || '—'} · {row.note}</option>)}</select></Field></>}
        {fundingDraft.linkMode === 'allocation' && <div className="form-grid"><Field label="Projektová alokácia €"><input type="number" min="0" step="0.01" value={fundingDraft.allocationAmount || 0} onChange={(e) => setFundingDraft({ ...fundingDraft, allocationAmount: Number(e.target.value) })}/></Field><Field label="Projektové čerpanie €" hint="Tento režim má prepojenú identitu IT úlohy, ale projektové čerpanie sa zadáva manuálne."><input type="number" min="0" step="0.01" value={fundingDraft.spent} onChange={(e) => setFundingDraft({ ...fundingDraft, spent: Number(e.target.value) })}/></Field></div>}
        {fundingDraft.linkMode && fundingDraft.linkMode !== 'whole_task' && contractTaskByCode(fundingDraft.linkedTaskCode || fundingDraft.taskCode) && <div className="finance-link-calculated"><span>Projektové čerpanie podľa zvolenej väzby</span><strong>{moneyPrecise(fundingEffective(fundingDraft).spent)}</strong><small>{fundingEffective(fundingDraft).rows.length ? `${fundingEffective(fundingDraft).rows.length} zdrojových riadkov` : fundingDraft.linkMode === 'allocation' ? 'manuálne projektové čerpanie' : 'bez priradených riadkov'}</small></div>}
        <Field label="Poznámka"><textarea rows={3} value={fundingDraft.note} onChange={(e) => setFundingDraft({ ...fundingDraft, note: e.target.value })}/></Field>
      </div>}
      <div className="modal-actions"><span className="finance-modal-status">{(fundingDraft.sourceMode || 'manual') === 'linked_task' ? `Zdroj dát: ${contractDataset.meta.source}` : 'Manuálne evidovaný zdroj'}</span><button className="button button-secondary" onClick={() => setFundingDraft(null)}>Zrušiť</button><button className="button button-primary" disabled={busy || !fundingDraftIsValid(fundingDraft)} onClick={() => void persistFunding()}>Uložiť</button></div></Modal>}

    {financeDrilldown && financeDrillSnapshot && <Modal wide title={`Detail čerpania · ${financeDrillSnapshot.task ? `Úloha ${financeDrillSnapshot.task.code}` : financeDrilldown.sourceName}`} onClose={() => setFinanceDrilldown(null)}><div className="finance-drill-head"><div><span>Väzba</span><strong>{fundingLinkLabel(financeDrilldown)}</strong></div><div><span>Rozpočet projektu</span><strong>{moneyPrecise(financeDrillSnapshot.amount)}</strong></div><div><span>Čerpanie projektu</span><strong>{moneyPrecise(financeDrillSnapshot.spent)}</strong></div><div><span>Zostatok</span><strong>{moneyPrecise(financeDrillSnapshot.remaining)}</strong></div></div><p className="finance-drill-source">{contractLedger.meta.period} · {contractLedger.meta.source}. Zobrazené riadky sú zdrojové finančné položky použité pre projektovú väzbu.</p>{financeDrillSnapshot.rows.length ? <div className="project-table-wrap finance-drill-table"><table className="project-table"><thead><tr><th>Dátum</th><th>Doklad</th><th>Úloha</th><th>ZAK</th><th>KPD/PPD</th><th>Popis</th><th>Suma</th></tr></thead><tbody>{financeDrillSnapshot.rows.map((row) => <tr key={row.id}><td>{dateLabel(row.date)}</td><td>{row.document || '—'}</td><td>{row.task}</td><td>{row.zak || '—'}</td><td>{row.kpd || '—'}{row.ppd ? ` / ${row.ppd}` : ''}</td><td><strong>{row.note || '—'}</strong><small>{row.category ? `Kategória ${row.category}` : ''}</small></td><td><strong>{moneyPrecise(row.amount)}</strong></td></tr>)}</tbody></table></div> : <Empty title="Bez zdrojových riadkov" text={financeDrilldown.linkMode === 'allocation' ? 'Projektové čerpanie je v tomto režime evidované manuálne.' : 'Pre zvolenú väzbu neboli nájdené finančné riadky.'}/>}<div className="modal-actions"><button className="button button-primary" onClick={() => setFinanceDrilldown(null)}>Zavrieť</button></div></Modal>}

    {milestoneDraft && <Modal title={milestoneDraft.id ? 'Upraviť míľnik' : 'Nový míľnik'} onClose={() => setMilestoneDraft(null)}><div className="form-grid">
      <Field label="Názov"><input value={milestoneDraft.title} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, title: e.target.value })}/></Field><Field label="Fáza"><select value={milestoneDraft.phase} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, phase: e.target.value })}>{projectPhases.map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Gate / rozhodovací bod"><input value={milestoneDraft.gate} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, gate: e.target.value })}/></Field><Field label="Vlastník"><input value={milestoneDraft.owner} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, owner: e.target.value })}/></Field>
      <Field label="Termín"><input type="date" value={milestoneDraft.due} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, due: e.target.value })}/></Field><Field label="Stav"><select value={milestoneDraft.status} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, status: e.target.value, completedAt: e.target.value === 'Splnené' ? (milestoneDraft.completedAt || today()) : milestoneDraft.completedAt })}>{milestoneStatuses.map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Poznámka"><textarea rows={3} value={milestoneDraft.note} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, note: e.target.value })}/></Field>
    </div><div className="modal-actions"><button className="button button-secondary" onClick={() => setMilestoneDraft(null)}>Zrušiť</button><button className="button button-primary" disabled={busy || !milestoneDraft.title.trim()} onClick={() => void persistMilestone()}>Uložiť</button></div></Modal>}

    {linkDraft && <Modal title={linkDraft.id ? 'Upraviť väzbu' : 'Nová projektová väzba'} onClose={() => setLinkDraft(null)}><div className="form-grid">
      <Field label="Typ väzby"><select value={linkDraft.targetType} onChange={(e) => setLinkDraft({ ...linkDraft, targetType: e.target.value })}>{linkTypes.map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Vybrať z existujúcich registrov"><select value="" onChange={(e) => { const ref = data.references.find((item) => `${item.type}|${item.key}` === e.target.value); if (ref) setLinkDraft({ ...linkDraft, targetType: ref.type, targetKey: ref.key, targetName: ref.name }) }}><option value="">— vybrať —</option>{data.references.map((ref) => <option key={`${ref.type}-${ref.key}`} value={`${ref.type}|${ref.key}`}>{ref.type} · {ref.name}{ref.subtitle ? ` · ${ref.subtitle}` : ''}</option>)}</select></Field>
      <Field label="Kód / identifikátor"><input value={linkDraft.targetKey} onChange={(e) => setLinkDraft({ ...linkDraft, targetKey: e.target.value })}/></Field><Field label="Názov"><input value={linkDraft.targetName} onChange={(e) => setLinkDraft({ ...linkDraft, targetName: e.target.value })}/></Field>
      <Field label="Vzťah k projektu"><input value={linkDraft.relation} onChange={(e) => setLinkDraft({ ...linkDraft, relation: e.target.value })}/></Field><Field label="Poznámka"><textarea rows={3} value={linkDraft.note} onChange={(e) => setLinkDraft({ ...linkDraft, note: e.target.value })}/></Field>
    </div><div className="modal-actions"><button className="button button-secondary" onClick={() => setLinkDraft(null)}>Zrušiť</button><button className="button button-primary" disabled={busy || !linkDraft.targetName.trim()} onClick={() => void persistLink()}>Uložiť</button></div></Modal>}

    {raidDraft && <Modal title={raidDraft.id ? 'Upraviť RAID položku' : 'Nová RAID položka'} onClose={() => setRaidDraft(null)}><div className="form-grid">
      <Field label="Typ"><select value={raidDraft.itemType} onChange={(e) => setRaidDraft({ ...raidDraft, itemType: e.target.value })}>{raidTypes.map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Názov"><input value={raidDraft.title} onChange={(e) => setRaidDraft({ ...raidDraft, title: e.target.value })}/></Field>
      <Field label="Kategória"><input value={raidDraft.category} onChange={(e) => setRaidDraft({ ...raidDraft, category: e.target.value })} placeholder="Technické, kapacitné, finančné…"/></Field><Field label="Vlastník"><input value={raidDraft.owner} onChange={(e) => setRaidDraft({ ...raidDraft, owner: e.target.value })}/></Field>
      <Field label="Pravdepodobnosť"><select value={raidDraft.probability} onChange={(e) => setRaidDraft({ ...raidDraft, probability: e.target.value })}>{probabilityStates.map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Dopad"><select value={raidDraft.impact} onChange={(e) => setRaidDraft({ ...raidDraft, impact: e.target.value })}>{severityStates.filter((x) => x !== 'Kritická').map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Závažnosť"><select value={raidDraft.severity} onChange={(e) => setRaidDraft({ ...raidDraft, severity: e.target.value })}>{severityStates.map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Stav"><select value={raidDraft.status} onChange={(e) => setRaidDraft({ ...raidDraft, status: e.target.value })}>{raidStatuses.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Termín"><input type="date" value={raidDraft.due} onChange={(e) => setRaidDraft({ ...raidDraft, due: e.target.value })}/></Field><Field label="Závislý projekt"><select value={raidDraft.dependencyProjectId} onChange={(e) => setRaidDraft({ ...raidDraft, dependencyProjectId: e.target.value })}><option value="">— bez väzby —</option>{data.projects.filter((project) => project.id !== raidDraft.projectId).map((project) => <option key={project.id} value={project.id}>{project.id} · {project.name}</option>)}</select></Field>
      <Field label="Popis"><textarea rows={3} value={raidDraft.description} onChange={(e) => setRaidDraft({ ...raidDraft, description: e.target.value })}/></Field><Field label="Mitigácia / reakcia"><textarea rows={3} value={raidDraft.response} onChange={(e) => setRaidDraft({ ...raidDraft, response: e.target.value })}/></Field><Field label="Poznámka"><textarea rows={3} value={raidDraft.note} onChange={(e) => setRaidDraft({ ...raidDraft, note: e.target.value })}/></Field>
    </div><div className="modal-actions"><button className="button button-secondary" onClick={() => setRaidDraft(null)}>Zrušiť</button><button className="button button-primary" disabled={busy || !raidDraft.title.trim()} onClick={() => void persistRaid()}>Uložiť</button></div></Modal>}

    {statusReportDraft && <Modal title={statusReportDraft.id ? 'Upraviť status report' : 'Nový status report'} onClose={() => setStatusReportDraft(null)}><div className="form-grid">
      <Field label="Obdobie"><input type="month" value={statusReportDraft.period} onChange={(e) => setStatusReportDraft({ ...statusReportDraft, period: e.target.value })}/></Field><Field label="Dátum reportu"><input type="date" value={statusReportDraft.reportDate} onChange={(e) => setStatusReportDraft({ ...statusReportDraft, reportDate: e.target.value })}/></Field>
      <Field label="Celkový stav"><select value={statusReportDraft.overallStatus} onChange={(e) => setStatusReportDraft({ ...statusReportDraft, overallStatus: e.target.value })}>{healthStates.map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Progress %"><input type="number" min="0" max="100" value={statusReportDraft.progressPercent} onChange={(e) => setStatusReportDraft({ ...statusReportDraft, progressPercent: Number(e.target.value) })}/></Field>
      <Field label="Manažérske zhrnutie"><textarea rows={3} value={statusReportDraft.summary} onChange={(e) => setStatusReportDraft({ ...statusReportDraft, summary: e.target.value })}/></Field><Field label="Čo sa podarilo"><textarea rows={3} value={statusReportDraft.achievements} onChange={(e) => setStatusReportDraft({ ...statusReportDraft, achievements: e.target.value })}/></Field>
      <Field label="Plán na ďalšie obdobie"><textarea rows={3} value={statusReportDraft.nextSteps} onChange={(e) => setStatusReportDraft({ ...statusReportDraft, nextSteps: e.target.value })}/></Field><Field label="Riziká"><textarea rows={3} value={statusReportDraft.risks} onChange={(e) => setStatusReportDraft({ ...statusReportDraft, risks: e.target.value })}/></Field>
      <Field label="Blokátory"><textarea rows={3} value={statusReportDraft.blockers} onChange={(e) => setStatusReportDraft({ ...statusReportDraft, blockers: e.target.value })}/></Field><Field label="Rozhodnutia potrebné od vedenia"><textarea rows={3} value={statusReportDraft.decisionsNeeded} onChange={(e) => setStatusReportDraft({ ...statusReportDraft, decisionsNeeded: e.target.value })}/></Field>
      <Field label="Poznámka"><textarea rows={3} value={statusReportDraft.note} onChange={(e) => setStatusReportDraft({ ...statusReportDraft, note: e.target.value })}/></Field>
    </div><div className="modal-actions"><button className="button button-secondary" onClick={() => setStatusReportDraft(null)}>Zrušiť</button><button className="button button-primary" disabled={busy || !statusReportDraft.period} onClick={() => void persistStatusReport()}>Uložiť report</button></div></Modal>}

    {decisionDraft && <Modal title={decisionDraft.id ? 'Upraviť rozhodnutie' : 'Nové rozhodnutie'} onClose={() => setDecisionDraft(null)}><div className="form-grid">
      <Field label="Téma / názov"><input value={decisionDraft.title} onChange={(e) => setDecisionDraft({ ...decisionDraft, title: e.target.value })}/></Field><Field label="Stav"><select value={decisionDraft.status} onChange={(e) => setDecisionDraft({ ...decisionDraft, status: e.target.value, decisionDate: e.target.value === 'Rozhodnuté' ? (decisionDraft.decisionDate || today()) : decisionDraft.decisionDate })}>{decisionStatuses.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Rozhodovateľ"><input value={decisionDraft.decisionMaker} onChange={(e) => setDecisionDraft({ ...decisionDraft, decisionMaker: e.target.value })}/></Field><Field label="Termín rozhodnutia"><input type="date" value={decisionDraft.due} onChange={(e) => setDecisionDraft({ ...decisionDraft, due: e.target.value })}/></Field>
      <Field label="Dátum rozhodnutia"><input type="date" value={decisionDraft.decisionDate} onChange={(e) => setDecisionDraft({ ...decisionDraft, decisionDate: e.target.value })}/></Field><Field label="Rozhodnutie"><textarea rows={3} value={decisionDraft.decision} onChange={(e) => setDecisionDraft({ ...decisionDraft, decision: e.target.value })}/></Field>
      <Field label="Dôvod"><textarea rows={3} value={decisionDraft.reason} onChange={(e) => setDecisionDraft({ ...decisionDraft, reason: e.target.value })}/></Field><Field label="Dopad"><textarea rows={3} value={decisionDraft.impact} onChange={(e) => setDecisionDraft({ ...decisionDraft, impact: e.target.value })}/></Field><Field label="Poznámka"><textarea rows={3} value={decisionDraft.note} onChange={(e) => setDecisionDraft({ ...decisionDraft, note: e.target.value })}/></Field>
    </div><div className="modal-actions"><button className="button button-secondary" onClick={() => setDecisionDraft(null)}>Zrušiť</button><button className="button button-primary" disabled={busy || !decisionDraft.title.trim()} onClick={() => void persistDecision()}>Uložiť</button></div></Modal>}

    {taskDraft && <Modal title={taskDraft.id ? 'Upraviť úlohu' : 'Nová projektová úloha'} onClose={() => setTaskDraft(null)}><div className="form-grid">
      <Field label="Názov"><input value={taskDraft.title} onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })}/></Field><Field label="Vlastník"><input value={taskDraft.owner} onChange={(e) => setTaskDraft({ ...taskDraft, owner: e.target.value })} disabled={isProjectMemberRole}/></Field>
      <Field label="Stav"><select value={taskDraft.status} onChange={(e) => setTaskDraft({ ...taskDraft, status: e.target.value, progress: e.target.value === 'Hotovo' ? 100 : taskDraft.progress })}>{taskStatuses.map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Priorita"><select value={taskDraft.priority} onChange={(e) => setTaskDraft({ ...taskDraft, priority: e.target.value })} disabled={isProjectMemberRole}>{priorities.map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Termín"><input type="date" value={taskDraft.due} onChange={(e) => setTaskDraft({ ...taskDraft, due: e.target.value })} disabled={isProjectMemberRole}/></Field><Field label="Progress %"><input type="number" min="0" max="100" value={taskDraft.progress || 0} onChange={(e) => setTaskDraft({ ...taskDraft, progress: Number(e.target.value) })}/></Field>
      <Field label="Popis"><textarea rows={3} value={taskDraft.description} onChange={(e) => setTaskDraft({ ...taskDraft, description: e.target.value })} disabled={isProjectMemberRole}/></Field><Field label="Poznámka"><textarea rows={3} value={taskDraft.note || ''} onChange={(e) => setTaskDraft({ ...taskDraft, note: e.target.value })}/></Field>
    </div><div className="modal-actions">{taskDraft.id && canEditTask(taskDraft) && <button className="button button-ghost" onClick={() => void removeTask(taskDraft)}>Odstrániť</button>}<span/><button className="button button-secondary" onClick={() => setTaskDraft(null)}>Zrušiť</button><button className="button button-primary" disabled={busy || !taskDraft.title.trim()} onClick={() => void persistTask()}>Uložiť</button></div></Modal>}
  </div>
}
