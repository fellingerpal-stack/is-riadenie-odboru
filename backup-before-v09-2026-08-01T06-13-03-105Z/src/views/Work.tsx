import { useMemo, useState } from 'react'
import type { Employee, Project, Task } from '../types'
import { Badge, Empty, Field, Icon, Modal, PageHeader, Progress } from '../components/UI'
import './Work.css'

const taskStatuses = ['Návrh', 'Plánované', 'Prebieha', 'Blokované', 'Hotovo']
const projectStatuses = ['Plánované', 'Prebieha', 'Na rozhodnutie', 'Pozastavené', 'Ukončené']
const priorities = ['Kritická', 'Vysoká', 'Stredná', 'Nízka']
const taskTypes = ['Úloha', 'Opatrenie', 'Míľnik', 'Prevádzková činnosť']

type WorkTab = 'projects' | 'tasks' | 'calendar' | 'workload'
type TaskView = 'board' | 'list'

function priorityTone(priority: string) {
  if (priority === 'Kritická') return 'danger' as const
  if (priority === 'Vysoká') return 'warning' as const
  if (priority === 'Stredná') return 'info' as const
  return 'neutral' as const
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function dateValue(value?: string) {
  if (!value) return null
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysFromToday(value?: string) {
  const due = dateValue(value)
  if (!due) return null
  const today = dateValue(todayIso()) as Date
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

function dueState(task: Task) {
  if (task.status === 'Hotovo') return 'done'
  const days = daysFromToday(task.due)
  if (days === null) return 'none'
  if (days < 0) return 'overdue'
  if (days <= 7) return 'soon'
  return 'later'
}

function dueLabel(task: Task) {
  if (task.status === 'Hotovo') return 'Hotovo'
  const days = daysFromToday(task.due)
  if (days === null) return 'Bez termínu'
  if (days < 0) return `${Math.abs(days)} d. po termíne`
  if (days === 0) return 'Termín dnes'
  if (days === 1) return 'Termín zajtra'
  return `O ${days} dní`
}

function formatDate(value?: string) {
  const date = dateValue(value)
  return date ? date.toLocaleDateString('sk-SK') : 'Neurčený'
}

function nextId(prefix: string, items: Array<{ id: string }>) {
  const highest = items.reduce((max, item) => {
    const number = Number(item.id.replace(/\D/g, ''))
    return Number.isFinite(number) ? Math.max(max, number) : max
  }, 0)
  return `${prefix}${String(highest + 1).padStart(2, '0')}`
}

function blankTask(): Task {
  return {
    id: '',
    title: '',
    projectId: '',
    owner: '',
    priority: 'Stredná',
    status: 'Návrh',
    start: todayIso(),
    due: '',
    description: '',
    source: '',
    type: 'Úloha',
    estimateHours: 0,
    spentHours: 0,
    progress: 0,
    dependency: '',
    note: '',
  }
}

function blankProject(): Project {
  return {
    id: '',
    name: '',
    type: 'Projekt',
    owner: '',
    sponsor: '',
    status: 'Plánované',
    priority: 'Stredná',
    progress: 0,
    start: todayIso(),
    due: '',
    description: '',
    note: '',
  }
}

export default function Work({
  projects,
  tasks,
  employees,
  canEdit,
  onProjectsChange,
  onTasksChange,
}: {
  projects: Project[]
  tasks: Task[]
  employees: Employee[]
  canEdit: boolean
  onProjectsChange: (projects: Project[]) => void
  onTasksChange: (tasks: Task[]) => void
}) {
  const [tab, setTab] = useState<WorkTab>('projects')
  const [taskView, setTaskView] = useState<TaskView>('board')
  const [taskModal, setTaskModal] = useState(false)
  const [projectModal, setProjectModal] = useState(false)
  const [taskDraft, setTaskDraft] = useState<Task>(blankTask())
  const [projectDraft, setProjectDraft] = useState<Project>(blankProject())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Všetky')
  const [priorityFilter, setPriorityFilter] = useState('Všetky')
  const [ownerFilter, setOwnerFilter] = useState('Všetci')
  const [projectFilter, setProjectFilter] = useState('Všetky')
  const [projectStatusFilter, setProjectStatusFilter] = useState('Všetky')

  const activeTasks = tasks.filter((task) => task.status !== 'Hotovo')
  const overdueTasks = activeTasks.filter((task) => dueState(task) === 'overdue')
  const dueSoonTasks = activeTasks.filter((task) => dueState(task) === 'soon')
  const unassignedTasks = activeTasks.filter((task) => !task.owner)
  const activeProjects = projects.filter((project) => project.status !== 'Ukončené')

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return tasks.filter((task) => {
      const project = projects.find((item) => item.id === task.projectId)
      const matchesSearch =
        !query ||
        `${task.id} ${task.title} ${task.description} ${task.owner} ${project?.name || ''}`
          .toLowerCase()
          .includes(query)
      return (
        matchesSearch &&
        (statusFilter === 'Všetky' || task.status === statusFilter) &&
        (priorityFilter === 'Všetky' || task.priority === priorityFilter) &&
        (ownerFilter === 'Všetci' || task.owner === ownerFilter) &&
        (projectFilter === 'Všetky' || task.projectId === projectFilter)
      )
    })
  }, [tasks, projects, search, statusFilter, priorityFilter, ownerFilter, projectFilter])

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    return projects.filter(
      (project) =>
        (!query ||
          `${project.id} ${project.name} ${project.description} ${project.owner}`
            .toLowerCase()
            .includes(query)) &&
        (projectStatusFilter === 'Všetky' || project.status === projectStatusFilter),
    )
  }, [projects, search, projectStatusFilter])

  const workload = useMemo(() => {
    const map = new Map<string, { owner: string; hours: number; tasks: number; missing: number }>()
    activeTasks.forEach((task) => {
      const owner = task.owner || 'Bez vlastníka'
      const current = map.get(owner) || { owner, hours: 0, tasks: 0, missing: 0 }
      current.tasks += 1
      if (task.estimateHours && task.estimateHours > 0) current.hours += task.estimateHours
      else current.missing += 1
      map.set(owner, current)
    })
    return [...map.values()].sort((a, b) => b.hours - a.hours || b.tasks - a.tasks)
  }, [activeTasks])

  const maxWorkload = Math.max(1, ...workload.map((row) => row.hours))

  function clearFilters() {
    setSearch('')
    setStatusFilter('Všetky')
    setPriorityFilter('Všetky')
    setOwnerFilter('Všetci')
    setProjectFilter('Všetky')
    setProjectStatusFilter('Všetky')
  }

  function openNewTask(projectId = '') {
    setTaskDraft({ ...blankTask(), projectId })
    setTaskModal(true)
  }

  function openTask(task: Task) {
    setTaskDraft({ ...blankTask(), ...task })
    setTaskModal(true)
  }

  function openNewProject() {
    setProjectDraft(blankProject())
    setProjectModal(true)
  }

  function openProject(project: Project) {
    setProjectDraft({ ...blankProject(), ...project })
    setProjectModal(true)
  }

  function saveTask() {
    if (!taskDraft.title.trim()) return
    const now = new Date().toISOString()
    if (taskDraft.id) {
      onTasksChange(
        tasks.map((task) =>
          task.id === taskDraft.id ? { ...taskDraft, updatedAt: now } : task,
        ),
      )
    } else {
      onTasksChange([
        ...tasks,
        {
          ...taskDraft,
          id: nextId('T', tasks),
          createdAt: now,
          updatedAt: now,
        },
      ])
    }
    setTaskModal(false)
  }

  function saveProject() {
    if (!projectDraft.name.trim()) return
    const now = new Date().toISOString()
    if (projectDraft.id) {
      onProjectsChange(
        projects.map((project) =>
          project.id === projectDraft.id ? { ...projectDraft, updatedAt: now } : project,
        ),
      )
    } else {
      onProjectsChange([
        ...projects,
        {
          ...projectDraft,
          id: nextId('P', projects),
          updatedAt: now,
        },
      ])
    }
    setProjectModal(false)
  }

  function deleteTask(id: string) {
    if (!confirm('Odstrániť túto úlohu?')) return
    onTasksChange(tasks.filter((task) => task.id !== id))
    setTaskModal(false)
  }

  function deleteProject(id: string) {
    const linked = tasks.filter((task) => task.projectId === id).length
    const message = linked
      ? `Projekt má ${linked} prepojených úloh. Projekt sa odstráni a úlohy zostanú bez projektu. Pokračovať?`
      : 'Odstrániť tento projekt?'
    if (!confirm(message)) return
    onProjectsChange(projects.filter((project) => project.id !== id))
    if (linked) {
      onTasksChange(tasks.map((task) => (task.projectId === id ? { ...task, projectId: '' } : task)))
    }
    setProjectModal(false)
  }

  function setTaskStatus(id: string, status: string) {
    onTasksChange(
      tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              status,
              progress: status === 'Hotovo' ? 100 : task.progress,
              updatedAt: new Date().toISOString(),
            }
          : task,
      ),
    )
  }

  function projectProgress(project: Project) {
    const linked = tasks.filter((task) => task.projectId === project.id)
    if (!linked.length) return project.progress
    return Math.round(
      linked.reduce((sum, task) => sum + (task.status === 'Hotovo' ? 100 : task.progress || 0), 0) /
        linked.length,
    )
  }

  const calendarGroups = [
    { key: 'overdue', title: 'Po termíne', tone: 'danger' as const },
    { key: 'soon', title: 'Najbližších 7 dní', tone: 'warning' as const },
    { key: 'later', title: 'Neskoršie termíny', tone: 'info' as const },
    { key: 'none', title: 'Bez termínu', tone: 'neutral' as const },
  ]

  const hasFilters =
    search ||
    statusFilter !== 'Všetky' ||
    priorityFilter !== 'Všetky' ||
    ownerFilter !== 'Všetci' ||
    projectFilter !== 'Všetky' ||
    projectStatusFilter !== 'Všetky'

  return (
    <>
      <PageHeader
        eyebrow="Realizácia"
        title="Projekty, opatrenia a úlohy"
        description="Riadenie portfólia, termínov a pracovného zaťaženia v jednom spoločnom backlogu."
        actions={
          canEdit ? (
            <div className="work-page-actions">
              <button className="button button-secondary" onClick={openNewProject}>
                <Icon name="projects" /> Nový projekt
              </button>
              <button className="button button-primary" onClick={() => openNewTask()}>
                <Icon name="plus" /> Nová úloha
              </button>
            </div>
          ) : undefined
        }
      />

      <section className="work-kpi-grid" aria-label="Súhrn projektov a úloh">
        <button
          type="button"
          className={`work-kpi-card ${tab === 'projects' ? 'is-active' : ''}`}
          onClick={() => setTab('projects')}
          aria-pressed={tab === 'projects'}
        >
          <span className="work-kpi-icon"><Icon name="projects" size={19} /></span>
          <span className="work-kpi-copy">
            <span className="work-kpi-label">Aktívne projekty</span>
            <span className="work-kpi-number-row"><strong>{activeProjects.length}</strong><small>z {projects.length} celkom</small></span>
          </span>
        </button>
        <button
          type="button"
          className={`work-kpi-card ${tab === 'tasks' ? 'is-active' : ''}`}
          onClick={() => setTab('tasks')}
          aria-pressed={tab === 'tasks'}
        >
          <span className="work-kpi-icon"><Icon name="tasks" size={19} /></span>
          <span className="work-kpi-copy">
            <span className="work-kpi-label">Otvorené úlohy</span>
            <span className="work-kpi-number-row"><strong>{activeTasks.length}</strong><small>{tasks.filter((task) => task.status === 'Hotovo').length} dokončených</small></span>
          </span>
        </button>
        <button
          type="button"
          className={`work-kpi-card ${overdueTasks.length ? 'work-kpi-alert' : ''} ${tab === 'calendar' ? 'is-active' : ''}`}
          onClick={() => setTab('calendar')}
          aria-pressed={tab === 'calendar'}
        >
          <span className="work-kpi-icon"><Icon name="warning" size={19} /></span>
          <span className="work-kpi-copy">
            <span className="work-kpi-label">Po termíne</span>
            <span className="work-kpi-number-row"><strong>{overdueTasks.length}</strong><small>vyžaduje zásah</small></span>
          </span>
        </button>
        <button
          type="button"
          className={`work-kpi-card ${tab === 'calendar' ? 'is-active' : ''}`}
          onClick={() => setTab('calendar')}
          aria-pressed={tab === 'calendar'}
        >
          <span className="work-kpi-icon"><Icon name="calendar" size={19} /></span>
          <span className="work-kpi-copy">
            <span className="work-kpi-label">Do 7 dní</span>
            <span className="work-kpi-number-row"><strong>{dueSoonTasks.length}</strong><small>blížiace sa termíny</small></span>
          </span>
        </button>
        <button
          type="button"
          className={`work-kpi-card ${tab === 'workload' ? 'is-active' : ''}`}
          onClick={() => setTab('workload')}
          aria-pressed={tab === 'workload'}
        >
          <span className="work-kpi-icon"><Icon name="user" size={19} /></span>
          <span className="work-kpi-copy">
            <span className="work-kpi-label">Bez vlastníka</span>
            <span className="work-kpi-number-row"><strong>{unassignedTasks.length}</strong><small>otvorených úloh</small></span>
          </span>
        </button>
      </section>

      <div className="tabs work-tabs">
        <button className={tab === 'projects' ? 'active' : ''} onClick={() => setTab('projects')}>
          <Icon name="projects" size={18} /> Projekty <span>{projects.length}</span>
        </button>
        <button className={tab === 'tasks' ? 'active' : ''} onClick={() => setTab('tasks')}>
          <Icon name="tasks" size={18} /> Úlohy <span>{tasks.length}</span>
        </button>
        <button className={tab === 'calendar' ? 'active' : ''} onClick={() => setTab('calendar')}>
          <Icon name="calendar" size={18} /> Termíny <span>{overdueTasks.length + dueSoonTasks.length}</span>
        </button>
        <button className={tab === 'workload' ? 'active' : ''} onClick={() => setTab('workload')}>
          <Icon name="capacity" size={18} /> Zaťaženie
        </button>
      </div>

      {(tab === 'projects' || tab === 'tasks') && (
        <div className={`toolbar work-toolbar ${tab === 'projects' ? 'work-toolbar-projects' : 'work-toolbar-tasks'}`}>
          <div className="search-box">
            <Icon name="search" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tab === 'projects' ? 'Hľadať projekt…' : 'Hľadať úlohu, vlastníka alebo projekt…'}
            />
          </div>

          {tab === 'projects' ? (
            <select value={projectStatusFilter} onChange={(event) => setProjectStatusFilter(event.target.value)}>
              <option value="Všetky">Všetky stavy</option>
              {projectStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          ) : (
            <>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="Všetky">Všetky stavy</option>
                {taskStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                <option value="Všetky">Všetky priority</option>
                {priorities.map((priority) => <option key={priority}>{priority}</option>)}
              </select>
              <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                <option value="Všetci">Všetci vlastníci</option>
                {employees.map((employee) => <option key={employee.id}>{employee.name}</option>)}
              </select>
              <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
                <option value="Všetky">Všetky projekty</option>
                <option value="">Bez projektu</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </>
          )}

          {tab === 'tasks' && (
            <div className="view-switch">
              <button className={taskView === 'board' ? 'active' : ''} onClick={() => setTaskView('board')} title="Kanban">
                <Icon name="matrix" size={17} />
              </button>
              <button className={taskView === 'list' ? 'active' : ''} onClick={() => setTaskView('list')} title="Zoznam">
                <Icon name="tasks" size={17} />
              </button>
            </div>
          )}

          {hasFilters && <button className="text-button" onClick={clearFilters}>Zrušiť filtre</button>}
        </div>
      )}

      {tab === 'projects' && (
        filteredProjects.length ? (
          <div className="projects-grid work-projects-grid">
            {filteredProjects.map((project) => {
              const linked = tasks.filter((task) => task.projectId === project.id)
              const completed = linked.filter((task) => task.status === 'Hotovo').length
              const overdue = linked.filter((task) => dueState(task) === 'overdue').length
              const progress = projectProgress(project)
              return (
                <article className="project-card work-project-card" key={project.id}>
                  <div className="project-top">
                    <div className="project-top-badges">
                      <Badge tone={priorityTone(project.priority)}>{project.priority}</Badge>
                      <span>{project.id} · {project.type}</span>
                    </div>
                    <button type="button" className="project-edit-button" onClick={() => openProject(project)} aria-label={`Otvoriť ${project.name}`} title="Otvoriť detail projektu"><Icon name="edit" size={16} /></button>
                  </div>
                  <button type="button" className="project-title-button" onClick={() => openProject(project)}>{project.name}</button>
                  <p className="project-description">{project.description || 'Bez popisu projektu.'}</p>
                  <div className="project-meta">
                    <span><Icon name="user" size={15} />{project.owner || 'Vlastník neurčený'}</span>
                    <span><Icon name="calendar" size={15} />{formatDate(project.due)}</span>
                  </div>
                  <Progress value={progress} label={linked.length ? 'Progres podľa úloh' : 'Manuálny progres'} />
                  <div className="project-task-summary">
                    <span><strong>{linked.length}</strong> úloh</span>
                    <span><strong>{completed}</strong> hotovo</span>
                    <span className={overdue ? 'danger-text' : ''}><strong>{overdue}</strong> po termíne</span>
                  </div>
                  <footer>
                    <Badge tone={project.status === 'Prebieha' ? 'info' : project.status === 'Na rozhodnutie' ? 'warning' : project.status === 'Ukončené' ? 'success' : 'neutral'}>{project.status}</Badge>
                    {canEdit && <button className="text-button" onClick={() => openNewTask(project.id)}>Pridať úlohu</button>}
                  </footer>
                </article>
              )
            })}
          </div>
        ) : <Empty title="Žiadny projekt" text="Zmeňte filtre alebo vytvorte nový projekt." />
      )}

      {tab === 'tasks' && taskView === 'board' && (
        <div className="kanban work-kanban">
          {taskStatuses.map((status) => {
            const columnTasks = filteredTasks.filter((task) => task.status === status)
            return (
              <section className="kanban-column" key={status}>
                <header>
                  <strong>{status}</strong>
                  <span>{columnTasks.length}</span>
                </header>
                <div className="kanban-card-list">
                  {!columnTasks.length && <div className="kanban-empty-state"><Icon name="tasks" size={20} /><span>Bez úloh</span></div>}
                  {columnTasks.map((task) => {
                    const project = projects.find((item) => item.id === task.projectId)
                    const state = dueState(task)
                    return (
                      <article className={`task-card due-${state}`} key={task.id} onDoubleClick={() => openTask(task)}>
                        <div className="task-card-top">
                          <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                          <span>{task.id}</span>
                        </div>
                        <button className="task-title-button" onClick={() => openTask(task)}>{task.title}</button>
                        {project && <small className="task-project">{project.name}</small>}
                        <p>{task.description || 'Bez popisu.'}</p>
                        <div className="task-owner"><Icon name="user" size={15} />{task.owner || 'Bez vlastníka'}</div>
                        <div className={`task-due-label due-${state}`}>
                          <Icon name="calendar" size={14} />
                          <span>{dueLabel(task)}</span>
                        </div>
                        <div className="task-footer">
                          <small>{task.estimateHours ? `${task.estimateHours} h` : 'Bez odhadu'}</small>
                          {canEdit && (
                            <select value={task.status} onChange={(event) => setTaskStatus(task.id, event.target.value)}>
                              {taskStatuses.map((item) => <option key={item}>{item}</option>)}
                            </select>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {tab === 'tasks' && taskView === 'list' && (
        filteredTasks.length ? (
          <div className="table-shell work-task-table-shell">
            <table className="data-table work-task-table">
              <thead>
                <tr>
                  <th>Úloha</th>
                  <th>Projekt</th>
                  <th>Vlastník</th>
                  <th>Priorita</th>
                  <th>Stav</th>
                  <th>Termín</th>
                  <th>Odhad</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const project = projects.find((item) => item.id === task.projectId)
                  const state = dueState(task)
                  return (
                    <tr key={task.id} onClick={() => openTask(task)}>
                      <td>
                        <div className="table-primary">
                          <div><span>{task.id}</span><Badge tone="neutral">{task.type || 'Úloha'}</Badge></div>
                          <strong>{task.title}</strong>
                          <small>{task.description}</small>
                        </div>
                      </td>
                      <td>{project?.name || 'Bez projektu'}</td>
                      <td>{task.owner || 'Bez vlastníka'}</td>
                      <td><Badge tone={priorityTone(task.priority)}>{task.priority}</Badge></td>
                      <td><Badge tone={task.status === 'Hotovo' ? 'success' : task.status === 'Blokované' ? 'danger' : task.status === 'Prebieha' ? 'info' : 'neutral'}>{task.status}</Badge></td>
                      <td><span className={`due-table due-${state}`}>{dueLabel(task)}</span></td>
                      <td>{task.estimateHours ? `${task.estimateHours} h` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : <Empty title="Žiadna úloha" text="Zmeňte filtre alebo vytvorte novú úlohu." />
      )}

      {tab === 'calendar' && (
        <div className="deadline-grid">
          {calendarGroups.map((group) => {
            const groupTasks = tasks
              .filter((task) => dueState(task) === group.key)
              .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))
            return (
              <section className="deadline-column" key={group.key}>
                <header>
                  <Badge tone={group.tone}>{group.title}</Badge>
                  <strong>{groupTasks.length}</strong>
                </header>
                <div>
                  {groupTasks.length ? groupTasks.map((task) => (
                    <button key={task.id} className={`deadline-item due-${group.key}`} onClick={() => openTask(task)}>
                      <span>{task.id} · {formatDate(task.due)}</span>
                      <strong>{task.title}</strong>
                      <small>{task.owner || 'Bez vlastníka'} · {projects.find((project) => project.id === task.projectId)?.name || 'Bez projektu'}</small>
                    </button>
                  )) : <p>Bez položiek</p>}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {tab === 'workload' && (
        <div className="workload-layout">
          <article className="panel">
            <div className="panel-heading">
              <div><span className="eyebrow">Kapacitný výhľad</span><h3>Odhadované hodiny v otvorených úlohách</h3></div>
              <Badge tone="info">{activeTasks.reduce((sum, task) => sum + (task.estimateHours || 0), 0)} h</Badge>
            </div>
            <div className="workload-list">
              {workload.map((row) => (
                <button key={row.owner} onClick={() => { setOwnerFilter(row.owner === 'Bez vlastníka' ? '' : row.owner); setTab('tasks') }}>
                  <div>
                    <strong>{row.owner}</strong>
                    <small>{row.tasks} otvorených úloh{row.missing ? ` · ${row.missing} bez odhadu` : ''}</small>
                  </div>
                  <div className="workload-meter"><span style={{ width: `${Math.max(4, row.hours / maxWorkload * 100)}%` }} /></div>
                  <b>{row.hours} h</b>
                </button>
              ))}
            </div>
          </article>
          <article className="panel workload-guidance">
            <span className="eyebrow">Pravidlá plánovania</span>
            <h3>Ako čítať kapacitný výhľad</h3>
            <p>Výpočet zahŕňa iba otvorené úlohy s vyplneným odhadom hodín. Nie je náhradou evidencie pracovného času, ale slúži na porovnanie záťaže, priorizáciu a odhalenie úloh bez vlastníka alebo odhadu.</p>
            <ul>
              <li>Doplniť odhad pri každej plánovanej úlohe.</li>
              <li>Pri kolízii termínov potvrdiť prioritu manažérom.</li>
              <li>Rozdeliť veľké úlohy na menšie kontrolovateľné kroky.</li>
            </ul>
          </article>
        </div>
      )}

      {taskModal && (
        <Modal title={taskDraft.id ? `${taskDraft.id} · Upraviť úlohu` : 'Nová úloha'} onClose={() => setTaskModal(false)} wide>
          <div className="form-grid work-form-grid">
            <Field label="Názov úlohy"><input value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })} /></Field>
            <Field label="Typ"><select value={taskDraft.type || 'Úloha'} onChange={(event) => setTaskDraft({ ...taskDraft, type: event.target.value })}>{taskTypes.map((type) => <option key={type}>{type}</option>)}</select></Field>
            <Field label="Projekt"><select value={taskDraft.projectId} onChange={(event) => setTaskDraft({ ...taskDraft, projectId: event.target.value })}><option value="">Bez projektu</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
            <Field label="Vlastník"><select value={taskDraft.owner} onChange={(event) => setTaskDraft({ ...taskDraft, owner: event.target.value })}><option value="">Bez vlastníka</option>{employees.map((employee) => <option key={employee.id}>{employee.name}</option>)}</select></Field>
            <Field label="Priorita"><select value={taskDraft.priority} onChange={(event) => setTaskDraft({ ...taskDraft, priority: event.target.value })}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></Field>
            <Field label="Stav"><select value={taskDraft.status} onChange={(event) => setTaskDraft({ ...taskDraft, status: event.target.value, progress: event.target.value === 'Hotovo' ? 100 : taskDraft.progress })}>{taskStatuses.map((status) => <option key={status}>{status}</option>)}</select></Field>
            <Field label="Začiatok"><input type="date" value={taskDraft.start || ''} onChange={(event) => setTaskDraft({ ...taskDraft, start: event.target.value })} /></Field>
            <Field label="Termín"><input type="date" value={taskDraft.due} onChange={(event) => setTaskDraft({ ...taskDraft, due: event.target.value })} /></Field>
            <Field label="Odhad hodín"><input type="number" min="0" step="0.5" value={taskDraft.estimateHours || 0} onChange={(event) => setTaskDraft({ ...taskDraft, estimateHours: Number(event.target.value) || 0 })} /></Field>
            <Field label="Odpracované hodiny"><input type="number" min="0" step="0.5" value={taskDraft.spentHours || 0} onChange={(event) => setTaskDraft({ ...taskDraft, spentHours: Number(event.target.value) || 0 })} /></Field>
            <Field label="Progres %"><input type="number" min="0" max="100" value={taskDraft.progress || 0} onChange={(event) => setTaskDraft({ ...taskDraft, progress: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /></Field>
            <Field label="Závislosť"><input value={taskDraft.dependency || ''} onChange={(event) => setTaskDraft({ ...taskDraft, dependency: event.target.value })} placeholder="ID úlohy alebo externá podmienka" /></Field>
            <Field label="Zdroj / opatrenie"><input value={taskDraft.source} onChange={(event) => setTaskDraft({ ...taskDraft, source: event.target.value })} /></Field>
            <Field label="Popis"><textarea value={taskDraft.description} onChange={(event) => setTaskDraft({ ...taskDraft, description: event.target.value })} /></Field>
            <Field label="Poznámka"><textarea value={taskDraft.note || ''} onChange={(event) => setTaskDraft({ ...taskDraft, note: event.target.value })} /></Field>
          </div>
          <div className="modal-actions split-actions">
            <div>{taskDraft.id && canEdit && <button className="button button-danger" onClick={() => deleteTask(taskDraft.id)}><Icon name="trash" /> Odstrániť</button>}</div>
            <div><button className="button button-ghost" onClick={() => setTaskModal(false)}>Zrušiť</button>{canEdit && <button className="button button-primary" onClick={saveTask}><Icon name="check" /> Uložiť</button>}</div>
          </div>
        </Modal>
      )}

      {projectModal && (
        <Modal title={projectDraft.id ? `${projectDraft.id} · Upraviť projekt` : 'Nový projekt'} onClose={() => setProjectModal(false)} wide>
          <div className="form-grid work-form-grid">
            <Field label="Názov"><input value={projectDraft.name} onChange={(event) => setProjectDraft({ ...projectDraft, name: event.target.value })} /></Field>
            <Field label="Typ"><input value={projectDraft.type} onChange={(event) => setProjectDraft({ ...projectDraft, type: event.target.value })} /></Field>
            <Field label="Vlastník"><select value={projectDraft.owner} onChange={(event) => setProjectDraft({ ...projectDraft, owner: event.target.value })}><option value="">Bez vlastníka</option>{employees.map((employee) => <option key={employee.id}>{employee.name}</option>)}</select></Field>
            <Field label="Sponzor"><select value={projectDraft.sponsor} onChange={(event) => setProjectDraft({ ...projectDraft, sponsor: event.target.value })}><option value="">Bez sponzora</option>{employees.map((employee) => <option key={employee.id}>{employee.name}</option>)}</select></Field>
            <Field label="Priorita"><select value={projectDraft.priority} onChange={(event) => setProjectDraft({ ...projectDraft, priority: event.target.value })}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></Field>
            <Field label="Stav"><select value={projectDraft.status} onChange={(event) => setProjectDraft({ ...projectDraft, status: event.target.value })}>{projectStatuses.map((status) => <option key={status}>{status}</option>)}</select></Field>
            <Field label="Začiatok"><input type="date" value={projectDraft.start} onChange={(event) => setProjectDraft({ ...projectDraft, start: event.target.value })} /></Field>
            <Field label="Termín"><input type="date" value={projectDraft.due} onChange={(event) => setProjectDraft({ ...projectDraft, due: event.target.value })} /></Field>
            <Field label="Manuálny progres %"><input type="number" min="0" max="100" value={projectDraft.progress} onChange={(event) => setProjectDraft({ ...projectDraft, progress: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /></Field>
            <Field label="Popis"><textarea value={projectDraft.description} onChange={(event) => setProjectDraft({ ...projectDraft, description: event.target.value })} /></Field>
            <Field label="Poznámka"><textarea value={projectDraft.note || ''} onChange={(event) => setProjectDraft({ ...projectDraft, note: event.target.value })} /></Field>
          </div>
          <div className="modal-actions split-actions">
            <div>{projectDraft.id && canEdit && <button className="button button-danger" onClick={() => deleteProject(projectDraft.id)}><Icon name="trash" /> Odstrániť</button>}</div>
            <div><button className="button button-ghost" onClick={() => setProjectModal(false)}>Zrušiť</button>{canEdit && <button className="button button-primary" onClick={saveProject}><Icon name="check" /> Uložiť</button>}</div>
          </div>
        </Modal>
      )}
    </>
  )
}
