import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AppRole,
  Project,
  ProjectFunding,
  ProjectLink,
  ProjectMember,
  ProjectMilestone,
  ProjectPortfolioData,
  Task,
} from '../types'
import {
  deletePortfolioProject,
  deletePortfolioTask,
  deleteProjectFunding,
  deleteProjectLink,
  deleteProjectMember,
  deleteProjectMilestone,
  loadProjectPortfolio,
  savePortfolioProject,
  savePortfolioTask,
  saveProjectFunding,
  saveProjectLink,
  saveProjectMember,
  saveProjectMilestone,
  subscribeToProjectPortfolio,
  type ProjectDatabaseState,
} from '../lib/projectCloud'
import { Badge, Empty, Field, Icon, Modal, PageHeader, Progress } from '../components/UI'
import './ProjectManagement.css'

type PortfolioTab = 'overview' | 'projects' | 'capacity'
type ProjectDetailTab = 'overview' | 'delivery' | 'team' | 'finance' | 'links'

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

const emptyPortfolio = (): ProjectPortfolioData => ({ projects: [], tasks: [], members: [], funding: [], milestones: [], links: [], references: [] })
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
function blankFunding(projectId = ''): ProjectFunding {
  return { id: '', projectId, sourceType: 'Štátny rozpočet / úloha', sourceName: '', program: '', taskCode: '', year: new Date().getFullYear(), amount: 0, spent: 0, cofinancingPercent: 0, note: '' }
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
function dateLabel(value?: string) {
  if (!value) return '—'
  const d = new Date(`${value}T12:00:00`)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('sk-SK')
}

export default function ProjectManagement(props: ProjectManagementProps) {
  const { role, currentUserId, currentUser, currentUserEmail, organizationId, databaseMode, fallbackProjects, fallbackTasks, onFallbackProjectsChange, onFallbackTasksChange } = props
  const [data, setData] = useState<ProjectPortfolioData>(() => ({ ...emptyPortfolio(), projects: fallbackProjects, tasks: fallbackTasks }))
  const [dbState, setDbState] = useState<ProjectDatabaseState>(databaseMode === 'cloud' ? 'loading' : 'local')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<PortfolioTab>('overview')
  const [detailTab, setDetailTab] = useState<ProjectDetailTab>('overview')
  const [detailOpen, setDetailOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [capacityQuery, setCapacityQuery] = useState('')
  const [capacityMonth, setCapacityMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projectDraft, setProjectDraft] = useState<Project | null>(null)
  const [memberDraft, setMemberDraft] = useState<ProjectMember | null>(null)
  const [fundingDraft, setFundingDraft] = useState<ProjectFunding | null>(null)
  const [milestoneDraft, setMilestoneDraft] = useState<ProjectMilestone | null>(null)
  const [linkDraft, setLinkDraft] = useState<ProjectLink | null>(null)
  const [taskDraft, setTaskDraft] = useState<Task | null>(null)
  const [busy, setBusy] = useState(false)

  const canManagePortfolio = role === 'admin' || role === 'project_manager'
  const isProjectMemberRole = role === 'project_member'

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
  const projectTasks = selectedProject ? data.tasks.filter((task) => task.projectId === selectedProject.id) : []
  const projectMembers = selectedProject ? data.members.filter((member) => member.projectId === selectedProject.id && member.isActive) : []
  const projectFunding = selectedProject ? data.funding.filter((item) => item.projectId === selectedProject.id) : []
  const projectMilestones = selectedProject ? data.milestones.filter((item) => item.projectId === selectedProject.id) : []
  const projectLinks = selectedProject ? data.links.filter((item) => item.projectId === selectedProject.id) : []

  const kpis = useMemo(() => {
    const active = data.projects.filter((p) => !['Ukončený', 'Ukončené'].includes(p.status)).length
    const atRisk = data.projects.filter((p) => p.health === 'Červený' || p.status === 'Ohrozený').length
    const budget = data.funding.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const spent = data.funding.reduce((sum, item) => sum + Number(item.spent || 0), 0)
    const overdueMilestones = data.milestones.filter((m) => m.status !== 'Splnené' && m.due && m.due < today()).length
    return { active, atRisk, budget, spent, overdueMilestones }
  }, [data])

  const capacityRows = useMemo(() => {
    const [yearText, monthText] = capacityMonth.split('-')
    const year = Number(yearText)
    const month = Number(monthText)
    const start = `${capacityMonth}-01`
    const endDate = new Date(year, month, 0)
    const end = Number.isNaN(endDate.getTime()) ? `${capacityMonth}-31` : endDate.toISOString().slice(0, 10)
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

  function canEditTask(task: Task) {
    if (canManagePortfolio) return true
    if (!isProjectMemberRole) return false
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
    await runSave(() => savePortfolioProject(draft), () => {
      const next = projectDraft.id ? fallbackProjects.map((p) => p.id === draft.id ? draft : p) : [...fallbackProjects, draft]
      onFallbackProjectsChange(next)
      setData((current) => ({ ...current, projects: next }))
    })
    setProjectDraft(null); setSelectedProjectId(draft.id); setDetailTab('overview'); setDetailOpen(true)
  }

  async function removeProject(project: Project) {
    if (!canManagePortfolio || !confirm(`Odstrániť projekt ${project.name}?`)) return
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
    if (!fundingDraft?.projectId) return
    const draft = { ...fundingDraft, id: fundingDraft.id || uid('PF') }
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

  const stateLabel = dbState === 'loading' ? 'Načítavam' : dbState === 'saving' ? 'Ukladám' : dbState === 'synced' ? 'Synchronizované' : dbState === 'error' ? 'Chyba' : 'Lokálny režim'

  return <div className="project-management">
    <PageHeader
      eyebrow={detailOpen && selectedProject ? `PROJEKT · ${selectedProject.id}` : 'PORTFÓLIO · DELIVERY · FINANCOVANIE'}
      title={detailOpen && selectedProject ? selectedProject.name : 'Riadenie projektov'}
      description={detailOpen && selectedProject ? (selectedProject.objective || selectedProject.description || 'Karta projektu a jeho riadenie.') : 'Jednotný projektový register prepája delivery, ľudí, kapacity, financovanie, úlohy a väzby na systémy, služby, zmluvy a dodávateľov.'}
      actions={<div className="project-header-actions">
        <Badge tone={dbState === 'error' ? 'danger' : dbState === 'saving' || dbState === 'loading' ? 'warning' : 'success'}>{stateLabel}</Badge>
        <button className="button button-secondary" onClick={() => void reload()} disabled={busy}><Icon name="refresh" size={16}/>Obnoviť</button>
        {!detailOpen && canManagePortfolio && <button className="button button-primary" onClick={() => setProjectDraft(blankProject())}><Icon name="plus" size={16}/>Nový projekt</button>}
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
        {([['overview','Prehľad'],['projects','Projekty'],['capacity',isProjectMemberRole ? 'Moje kapacity' : 'Kapacity']] as [PortfolioTab,string][]).map(([key,label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}
      </div>

      {(tab === 'overview' || tab === 'projects') && <>
        <div className="project-toolbar"><div className="project-search"><Icon name="search" size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Hľadať projekt, fázu, manažéra…"/></div><span>{filteredProjects.length} projektov</span></div>
        {filteredProjects.length === 0 ? <Empty title="Žiadne projekty" text="Vytvorte prvý projekt alebo upravte vyhľadávanie."/> : <section className="project-portfolio-grid">{filteredProjects.map((project) => {
          const taskCount = data.tasks.filter((task) => task.projectId === project.id).length
          const memberCount = data.members.filter((member) => member.projectId === project.id && member.isActive).length
          const funding = data.funding.filter((item) => item.projectId === project.id).reduce((sum,item) => sum + Number(item.amount || 0), 0)
          return <article key={project.id} className="project-card" onClick={() => openProject(project.id)} tabIndex={0} role="button" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openProject(project.id) }}>
            <div className="project-card-top"><div><span className="project-code">{project.id}</span><h3>{project.name}</h3></div><Badge tone={healthTone(project.health)}>{project.health || 'Bez health'}</Badge></div>
            <div className="project-card-meta"><span><Icon name="roadmap" size={14}/>{project.phase || 'Neurčená fáza'}</span><span><Icon name="user" size={14}/>{project.managerName || project.owner || 'Bez PM'}</span></div>
            <p>{project.objective || project.description || 'Bez definovaného cieľa.'}</p>
            <Progress value={Number(project.progress || 0)} label="Delivery"/>
            <div className="project-card-stats"><span><b>{memberCount}</b> ľudí</span><span><b>{taskCount}</b> úloh</span><span><b>{money(funding)}</b> zdroje</span></div>
            <div className="project-card-bottom"><Badge tone={statusTone(project.status)}>{project.status}</Badge><span>{dateLabel(project.start)} → {dateLabel(project.due)}</span></div>
            <div className="project-card-open">Otvoriť kartu projektu <Icon name="chevron" size={15}/></div>
          </article>
        })}</section>}
      </>}

      {tab === 'capacity' && <section className="capacity-shell">
        <div className="project-section-title"><div><span>KAPACITY ĽUDÍ</span><h3>{isProjectMemberRole ? 'Moje vyťaženie v projektoch' : 'Vyťaženie zamestnancov v projektoch'}</h3></div></div>
        <div className="capacity-toolbar">
          <div className="project-search"><Icon name="search" size={17}/><input value={capacityQuery} onChange={(e) => setCapacityQuery(e.target.value)} placeholder={isProjectMemberRole ? 'Hľadať v mojich projektoch…' : 'Hľadať zamestnanca, projekt alebo rolu…'}/></div>
          <label className="capacity-month"><span>Mesiac</span><input type="month" value={capacityMonth} onChange={(e) => setCapacityMonth(e.target.value)}/></label>
        </div>
        <section className="capacity-kpi-grid">
          <article><span>{isProjectMemberRole ? 'Osoba' : 'Ľudia v projektoch'}</span><strong>{capacityKpis.people}</strong><small>aktívne alokácie v mesiaci</small></article>
          <article><span>Preťažení nad 100 %</span><strong>{capacityKpis.overloaded}</strong><small>vyžaduje preplánovanie</small></article>
          <article><span>Vyťažení 80–100 %</span><strong>{capacityKpis.high}</strong><small>malá voľná rezerva</small></article>
          <article><span>Priemerné vyťaženie</span><strong>{capacityKpis.average}%</strong><small>súčet projektových alokácií</small></article>
        </section>
        {capacityRows.length ? <div className="capacity-list">{capacityRows.map((row) => <article key={row.key} className="capacity-person-card">
          <div className="capacity-person-head"><div className="capacity-person-name"><span className="capacity-avatar"><Icon name="user" size={18}/></span><div><strong>{row.name}</strong><small>{row.email || 'Bez e-mailu'}</small></div></div><div className="capacity-total"><Badge tone={capacityTone(row.total)}>{row.total}% vyťaženie</Badge><strong>{row.total > 100 ? `+${row.total - 100}% nad kapacitu` : `${100 - row.total}% voľné`}</strong></div></div>
          <div className="capacity-bar"><span className={row.total > 100 ? 'over' : row.total >= 80 ? 'high' : ''} style={{ width: `${Math.min(100, row.total)}%` }}/></div>
          <div className="capacity-assignments">{row.assignments.sort((a,b) => b.member.allocationPercent - a.member.allocationPercent).map(({member, project}) => <div key={member.id} className="capacity-assignment">
            <button className="capacity-project-link" onClick={() => openProject(project.id)}><strong>{project.id} · {project.name}</strong><span>{member.projectRole}{member.responsibility ? ` · ${member.responsibility}` : ''}</span></button>
            <div><b>{member.allocationPercent}%</b><small>{dateLabel(member.validFrom)} – {dateLabel(member.validTo)}</small></div>
            {canManagePortfolio && <button className="icon-button capacity-edit" title="Upraviť alokáciu" onClick={() => setMemberDraft({ ...member })}><Icon name="edit" size={14}/></button>}
          </div>)}</div>
        </article>)}</div> : <Empty title="Bez kapacitných údajov" text={isProjectMemberRole ? 'V zvolenom mesiaci nemáte aktívnu projektovú alokáciu.' : 'Pridajte členov do projektov a nastavte im percentuálnu kapacitu a obdobie platnosti.'}/>} 
      </section>}
    </>}

    {detailOpen && selectedProject && <section className="project-detail-shell project-detail-page">
      <div className="project-detail-toolbar"><button className="button button-secondary button-small" onClick={closeProject}><Icon name="arrow" size={15}/>Späť na projekty</button><span>Karta projektu</span></div>
      <header className="project-detail-head"><div><span>{selectedProject.id} · {selectedProject.type}</span><h2>{selectedProject.name}</h2><p>{selectedProject.objective || selectedProject.description}</p></div><div className="project-detail-actions"><Badge tone={healthTone(selectedProject.health)}>{selectedProject.health || 'Health neurčený'}</Badge><Badge tone={statusTone(selectedProject.status)}>{selectedProject.status}</Badge>{canManagePortfolio && <><button className="button button-secondary button-small" onClick={() => setProjectDraft({ ...blankProject(), ...selectedProject })}><Icon name="edit" size={15}/>Upraviť projekt</button><button className="button button-primary button-small" onClick={() => setMemberDraft(blankMember(selectedProject.id))}><Icon name="plus" size={15}/>Pridať člena</button><button className="button button-ghost button-small" onClick={() => void removeProject(selectedProject)}><Icon name="trash" size={15}/>Odstrániť</button></>}</div></header>

      <div className="project-tabs project-detail-tabs">
        {([['overview','Karta projektu'],['delivery','Delivery a úlohy'],['team','Tím a kapacity'],['finance','Financovanie'],['links','Väzby']] as [ProjectDetailTab,string][]).map(([key,label]) => <button key={key} className={detailTab === key ? 'active' : ''} onClick={() => setDetailTab(key)}>{label}</button>)}
      </div>

      {detailTab === 'overview' && <>
        <div className="project-detail-grid">
          <article><span>Fáza</span><strong>{selectedProject.phase || '—'}</strong><small>{selectedProject.deliveryModel || 'Model delivery neurčený'}</small></article>
          <article><span>Projektový manažér</span><strong>{selectedProject.managerName || selectedProject.owner || '—'}</strong><small>{selectedProject.managerEmail || '—'}</small></article>
          <article><span>Gestor / sponsor</span><strong>{selectedProject.sponsor || '—'}</strong><small>riadiaca zodpovednosť</small></article>
          <article><span>Termín</span><strong>{dateLabel(selectedProject.start)} → {dateLabel(selectedProject.due)}</strong><small>{selectedProject.priority || 'Priorita neurčená'}</small></article>
          <article><span>Projektový tím</span><strong>{projectMembers.length} ľudí</strong><small>{projectMembers.reduce((sum, member) => sum + Number(member.allocationPercent || 0), 0)}% súčet projektových alokácií</small></article>
          <article><span>Úlohy</span><strong>{projectTasks.length}</strong><small>{projectTasks.filter((task) => task.status === 'Hotovo').length} hotových</small></article>
          <article><span>Rozpočet</span><strong>{money(projectFunding.reduce((sum,item) => sum + Number(item.amount || 0), 0))}</strong><small>{money(projectFunding.reduce((sum,item) => sum + Number(item.spent || 0), 0))} čerpané</small></article>
          <article><span>Najbližší míľnik</span><strong>{selectedProject.nextMilestone || projectMilestones.find((m) => m.status !== 'Splnené')?.title || '—'}</strong><small>{dateLabel(selectedProject.nextMilestoneDue || projectMilestones.find((m) => m.status !== 'Splnené')?.due)}</small></article>
          <article className="span-two"><span>Cieľ projektu</span><strong>{selectedProject.objective || 'Zatiaľ neurčený'}</strong><small>{selectedProject.description || ''}</small></article>
          <article className="span-two"><span>Očakávaný výsledok</span><strong>{selectedProject.expectedOutcome || 'Zatiaľ neurčený'}</strong><small>{selectedProject.note || ''}</small></article>
        </div>
        <section className="project-overview-actions"><div className="project-section-title"><div><span>RÝCHLA SPRÁVA</span><h3>Projektové oblasti</h3></div></div><div className="project-quick-grid">
          <button onClick={() => setDetailTab('delivery')}><Icon name="roadmap" size={19}/><div><strong>Delivery a úlohy</strong><span>{projectMilestones.length} míľnikov · {projectTasks.length} úloh</span></div><Icon name="chevron" size={16}/></button>
          <button onClick={() => setDetailTab('team')}><Icon name="people" size={19}/><div><strong>Tím a kapacity</strong><span>{projectMembers.length} členov projektu</span></div><Icon name="chevron" size={16}/></button>
          <button onClick={() => setDetailTab('finance')}><Icon name="capacity" size={19}/><div><strong>Financovanie</strong><span>{projectFunding.length} zdrojov financovania</span></div><Icon name="chevron" size={16}/></button>
          <button onClick={() => setDetailTab('links')}><Icon name="systems" size={19}/><div><strong>Väzby</strong><span>{projectLinks.length} väzieb na registre</span></div><Icon name="chevron" size={16}/></button>
        </div></section>
      </>}

      {detailTab === 'delivery' && <div className="project-two-column">
        <section><div className="project-section-title"><div><span>DELIVERY</span><h3>Míľniky a fázy</h3></div>{canManagePortfolio && <button className="button button-primary button-small" onClick={() => setMilestoneDraft(blankMilestone(selectedProject.id))}><Icon name="plus" size={14}/>Míľnik</button>}</div>
          <div className="project-timeline">{projectMilestones.length ? [...projectMilestones].sort((a,b) => a.due.localeCompare(b.due)).map((item) => <article key={item.id}><i className={item.status === 'Splnené' ? 'done' : item.status === 'Blokované' ? 'blocked' : ''}/><div><div><strong>{item.title}</strong><Badge tone={statusTone(item.status)}>{item.status}</Badge></div><span>{item.phase}{item.gate ? ` · ${item.gate}` : ''}</span><small>{item.owner || 'Bez vlastníka'} · {dateLabel(item.due)}</small>{item.note && <p>{item.note}</p>}</div>{canManagePortfolio && <div className="row-actions"><button onClick={() => setMilestoneDraft({ ...item })}><Icon name="edit" size={14}/></button><button onClick={() => confirm('Odstrániť míľnik?') && void runSave(() => deleteProjectMilestone(item.id))}><Icon name="trash" size={14}/></button></div>}</article>) : <Empty title="Bez míľnikov" text="Doplňte hlavné delivery body a rozhodovacie gates."/>}</div>
        </section>
        <section><div className="project-section-title"><div><span>PRÁCA</span><h3>Úlohy projektu</h3></div>{canManagePortfolio && <button className="button button-secondary button-small" onClick={() => setTaskDraft(blankTask(selectedProject.id))}><Icon name="plus" size={14}/>Úloha</button>}</div>
          <div className="project-task-list">{projectTasks.length ? projectTasks.map((task) => <article key={task.id}><div><strong>{task.title}</strong><span>{task.owner || 'Bez vlastníka'} · {dateLabel(task.due)}</span></div><Progress value={task.status === 'Hotovo' ? 100 : Number(task.progress || 0)}/><Badge tone={statusTone(task.status)}>{task.status}</Badge>{canEditTask(task) && <button onClick={() => setTaskDraft({ ...blankTask(selectedProject.id), ...task })}><Icon name="edit" size={14}/></button>}</article>) : <Empty title="Bez úloh" text="Projekt zatiaľ nemá evidované úlohy."/>}</div>
        </section>
      </div>}

      {detailTab === 'team' && <section><div className="project-section-title"><div><span>ĽUDIA A ZODPOVEDNOSTI</span><h3>Projektový tím a plánované kapacity</h3></div>{canManagePortfolio && <button className="button button-primary button-small" onClick={() => setMemberDraft(blankMember(selectedProject.id))}><Icon name="plus" size={14}/>Člen tímu</button>}</div>
        <div className="project-table-wrap"><table className="project-table"><thead><tr><th>Meno</th><th>Rola v projekte</th><th>Zodpovednosť</th><th>Kapacita</th><th>Platnosť</th><th></th></tr></thead><tbody>{projectMembers.map((member) => <tr key={member.id}><td><strong>{member.name}</strong><small>{member.email}</small></td><td><Badge tone={member.projectRole === 'Projektový manažér' ? 'purple' : 'info'}>{member.projectRole}</Badge></td><td>{member.responsibility || '—'}</td><td><Badge tone={capacityTone(Number(member.allocationPercent || 0))}>{member.allocationPercent}%</Badge></td><td>{dateLabel(member.validFrom)} – {dateLabel(member.validTo)}</td><td>{canManagePortfolio && <div className="row-actions"><button onClick={() => setMemberDraft({ ...member })}><Icon name="edit" size={14}/></button><button onClick={() => confirm('Odstrániť člena z projektu?') && void runSave(() => deleteProjectMember(member.id))}><Icon name="trash" size={14}/></button></div>}</td></tr>)}</tbody></table>{!projectMembers.length && <Empty title="Tím ešte nie je zostavený" text="Pridajte gestora, analytikov, testerov, technické roly a ďalších členov."/>}</div>
      </section>}

      {detailTab === 'finance' && <section><div className="project-section-title"><div><span>ZDROJE A ČERPANIE</span><h3>Financovanie projektu</h3></div>{canManagePortfolio && <button className="button button-primary button-small" onClick={() => setFundingDraft(blankFunding(selectedProject.id))}><Icon name="plus" size={14}/>Zdroj financovania</button>}</div>
        <div className="project-finance-summary"><div><span>Rozpočet</span><strong>{money(projectFunding.reduce((s,x) => s + Number(x.amount || 0),0))}</strong></div><div><span>Čerpanie</span><strong>{money(projectFunding.reduce((s,x) => s + Number(x.spent || 0),0))}</strong></div><div><span>Zostatok</span><strong>{money(projectFunding.reduce((s,x) => s + Number(x.amount || 0) - Number(x.spent || 0),0))}</strong></div></div>
        <div className="project-table-wrap"><table className="project-table"><thead><tr><th>Zdroj</th><th>Program / úloha</th><th>Rok</th><th>Rozpočet</th><th>Čerpanie</th><th></th></tr></thead><tbody>{projectFunding.map((item) => <tr key={item.id}><td><strong>{item.sourceType}</strong><small>{item.sourceName || '—'}</small></td><td>{item.program || item.taskCode || '—'}</td><td>{item.year || '—'}</td><td>{money(item.amount)}</td><td>{money(item.spent)}</td><td>{canManagePortfolio && <div className="row-actions"><button onClick={() => setFundingDraft({ ...item })}><Icon name="edit" size={14}/></button><button onClick={() => confirm('Odstrániť zdroj financovania?') && void runSave(() => deleteProjectFunding(item.id))}><Icon name="trash" size={14}/></button></div>}</td></tr>)}</tbody></table>{!projectFunding.length && <Empty title="Financovanie nie je evidované" text="Pridajte úlohu, EÚ zdroj, plán obnovy alebo iný zdroj financovania."/>}</div>
      </section>}

      {detailTab === 'links' && <section><div className="project-section-title"><div><span>VÄZBY NA OSTATNÉ MODULY</span><h3>Systémy, služby, zmluvy a dodávatelia</h3></div>{canManagePortfolio && <button className="button button-primary button-small" onClick={() => setLinkDraft(blankLink(selectedProject.id))}><Icon name="plus" size={14}/>Pridať väzbu</button>}</div>
        <div className="project-link-grid">{projectLinks.map((link) => <article key={link.id}><span className="project-link-icon"><Icon name={link.targetType === 'Dodávateľ' ? 'database' : link.targetType === 'Zmluva' ? 'calendar' : 'systems'} size={18}/></span><div><small>{link.targetType}</small><strong>{link.targetName}</strong><span>{link.relation}{link.targetKey ? ` · ${link.targetKey}` : ''}</span></div>{canManagePortfolio && <div className="row-actions"><button onClick={() => setLinkDraft({ ...link })}><Icon name="edit" size={14}/></button><button onClick={() => confirm('Odstrániť väzbu?') && void runSave(() => deleteProjectLink(link.id))}><Icon name="trash" size={14}/></button></div>}</article>)}</div>{!projectLinks.length && <Empty title="Projekt zatiaľ nemá väzby" text="Prepojte ho s informačnými systémami, službami, zmluvami, dodávateľmi alebo rizikami."/>}
      </section>}
    </section>}

    {projectDraft && <Modal wide title={projectDraft.id ? `Projekt ${projectDraft.id}` : 'Nový projekt'} onClose={() => setProjectDraft(null)}><div className="project-form-grid">
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
      <Field label="Vybrať používateľa"><select value="" onChange={(e) => { const ref = data.references.find((item) => item.type === 'Používateľ' && item.key === e.target.value); if (ref) setMemberDraft({ ...memberDraft, userId: ref.key, name: ref.name, email: ref.subtitle.split(' · ')[0] || '' }) }}><option value="">— vybrať z používateľov —</option>{data.references.filter((ref) => ref.type === 'Používateľ').map((ref) => <option key={ref.key} value={ref.key}>{ref.name}{ref.subtitle ? ` · ${ref.subtitle}` : ''}</option>)}</select></Field>
      <Field label="Meno"><input value={memberDraft.name} onChange={(e) => setMemberDraft({ ...memberDraft, name: e.target.value })}/></Field><Field label="E-mail"><input type="email" value={memberDraft.email} onChange={(e) => setMemberDraft({ ...memberDraft, email: e.target.value })}/></Field>
      <Field label="Rola v projekte"><select value={memberDraft.projectRole} onChange={(e) => setMemberDraft({ ...memberDraft, projectRole: e.target.value })}>{projectRoles.map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Kapacita %"><input type="number" min="0" max="100" value={memberDraft.allocationPercent} onChange={(e) => setMemberDraft({ ...memberDraft, allocationPercent: Number(e.target.value) })}/></Field>
      <Field label="Zodpovednosť"><textarea rows={3} value={memberDraft.responsibility} onChange={(e) => setMemberDraft({ ...memberDraft, responsibility: e.target.value })}/></Field><Field label="Poznámka"><textarea rows={3} value={memberDraft.note} onChange={(e) => setMemberDraft({ ...memberDraft, note: e.target.value })}/></Field>
      <Field label="Platí od"><input type="date" value={memberDraft.validFrom} onChange={(e) => setMemberDraft({ ...memberDraft, validFrom: e.target.value })}/></Field><Field label="Platí do"><input type="date" value={memberDraft.validTo} onChange={(e) => setMemberDraft({ ...memberDraft, validTo: e.target.value })}/></Field>
    </div><div className="modal-actions"><button className="button button-secondary" onClick={() => setMemberDraft(null)}>Zrušiť</button><button className="button button-primary" disabled={busy || !memberDraft.name.trim()} onClick={() => void persistMember()}>Uložiť</button></div></Modal>}

    {fundingDraft && <Modal title={fundingDraft.id ? 'Upraviť financovanie' : 'Nový zdroj financovania'} onClose={() => setFundingDraft(null)}><div className="form-grid">
      <Field label="Typ zdroja"><select value={fundingDraft.sourceType} onChange={(e) => setFundingDraft({ ...fundingDraft, sourceType: e.target.value })}>{fundingTypes.map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Názov zdroja"><input value={fundingDraft.sourceName} onChange={(e) => setFundingDraft({ ...fundingDraft, sourceName: e.target.value })}/></Field>
      <Field label="Program / výzva"><input value={fundingDraft.program} onChange={(e) => setFundingDraft({ ...fundingDraft, program: e.target.value })}/></Field><Field label="Úloha / kód"><input value={fundingDraft.taskCode} onChange={(e) => setFundingDraft({ ...fundingDraft, taskCode: e.target.value })}/></Field>
      <Field label="Rok"><input type="number" value={fundingDraft.year} onChange={(e) => setFundingDraft({ ...fundingDraft, year: Number(e.target.value) })}/></Field><Field label="Spolufinancovanie %"><input type="number" min="0" max="100" value={fundingDraft.cofinancingPercent} onChange={(e) => setFundingDraft({ ...fundingDraft, cofinancingPercent: Number(e.target.value) })}/></Field>
      <Field label="Rozpočet €"><input type="number" min="0" step="0.01" value={fundingDraft.amount} onChange={(e) => setFundingDraft({ ...fundingDraft, amount: Number(e.target.value) })}/></Field><Field label="Čerpanie €"><input type="number" min="0" step="0.01" value={fundingDraft.spent} onChange={(e) => setFundingDraft({ ...fundingDraft, spent: Number(e.target.value) })}/></Field>
      <Field label="Poznámka"><textarea rows={3} value={fundingDraft.note} onChange={(e) => setFundingDraft({ ...fundingDraft, note: e.target.value })}/></Field>
    </div><div className="modal-actions"><button className="button button-secondary" onClick={() => setFundingDraft(null)}>Zrušiť</button><button className="button button-primary" disabled={busy} onClick={() => void persistFunding()}>Uložiť</button></div></Modal>}

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

    {taskDraft && <Modal title={taskDraft.id ? 'Upraviť úlohu' : 'Nová projektová úloha'} onClose={() => setTaskDraft(null)}><div className="form-grid">
      <Field label="Názov"><input value={taskDraft.title} onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })}/></Field><Field label="Vlastník"><input value={taskDraft.owner} onChange={(e) => setTaskDraft({ ...taskDraft, owner: e.target.value })} disabled={isProjectMemberRole}/></Field>
      <Field label="Stav"><select value={taskDraft.status} onChange={(e) => setTaskDraft({ ...taskDraft, status: e.target.value, progress: e.target.value === 'Hotovo' ? 100 : taskDraft.progress })}>{taskStatuses.map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Priorita"><select value={taskDraft.priority} onChange={(e) => setTaskDraft({ ...taskDraft, priority: e.target.value })} disabled={isProjectMemberRole}>{priorities.map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Termín"><input type="date" value={taskDraft.due} onChange={(e) => setTaskDraft({ ...taskDraft, due: e.target.value })} disabled={isProjectMemberRole}/></Field><Field label="Progress %"><input type="number" min="0" max="100" value={taskDraft.progress || 0} onChange={(e) => setTaskDraft({ ...taskDraft, progress: Number(e.target.value) })}/></Field>
      <Field label="Popis"><textarea rows={3} value={taskDraft.description} onChange={(e) => setTaskDraft({ ...taskDraft, description: e.target.value })} disabled={isProjectMemberRole}/></Field><Field label="Poznámka"><textarea rows={3} value={taskDraft.note || ''} onChange={(e) => setTaskDraft({ ...taskDraft, note: e.target.value })}/></Field>
    </div><div className="modal-actions">{taskDraft.id && canManagePortfolio && <button className="button button-ghost" onClick={() => void removeTask(taskDraft)}>Odstrániť</button>}<span/><button className="button button-secondary" onClick={() => setTaskDraft(null)}>Zrušiť</button><button className="button button-primary" disabled={busy || !taskDraft.title.trim()} onClick={() => void persistTask()}>Uložiť</button></div></Modal>}
  </div>
}
