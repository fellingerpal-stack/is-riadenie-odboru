import type { Project, Task } from '../types'
import { supabase } from './supabase'

export type WorkDatabaseState = 'local' | 'loading' | 'synced' | 'saving' | 'error'

interface WorkProjectRow {
  id: string
  code: string
  name: string
  type: string
  owner: string
  sponsor: string
  status: string
  priority: string
  progress: number
  start_date: string | null
  due_date: string | null
  description: string
  note: string
  updated_at: string
}

interface WorkTaskRow {
  id: string
  code: string
  title: string
  project_id: string | null
  owner: string
  priority: string
  status: string
  start_date: string | null
  due_date: string | null
  description: string
  source: string
  type: string
  estimate_hours: number
  spent_hours: number
  progress: number
  dependency: string
  note: string
  created_at: string
  updated_at: string
}

function projectFromRow(row: WorkProjectRow): Project {
  return {
    id: row.code,
    name: row.name,
    type: row.type,
    owner: row.owner,
    sponsor: row.sponsor,
    status: row.status,
    priority: row.priority,
    progress: Number(row.progress || 0),
    start: row.start_date ?? '',
    due: row.due_date ?? '',
    description: row.description,
    note: row.note,
    updatedAt: row.updated_at,
  }
}

function taskFromRow(row: WorkTaskRow, projectCodes: Map<string, string>): Task {
  return {
    id: row.code,
    title: row.title,
    projectId: row.project_id ? projectCodes.get(row.project_id) ?? '' : '',
    owner: row.owner,
    priority: row.priority,
    status: row.status,
    start: row.start_date ?? '',
    due: row.due_date ?? '',
    description: row.description,
    source: row.source,
    type: row.type,
    estimateHours: Number(row.estimate_hours || 0),
    spentHours: Number(row.spent_hours || 0),
    progress: Number(row.progress || 0),
    dependency: row.dependency,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function sameRecord(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function friendlyWorkError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const lower = message.toLowerCase()

  if (
    lower.includes('work_projects') ||
    lower.includes('work_tasks') ||
    lower.includes('schema cache') ||
    lower.includes('could not find the table') ||
    lower.includes('relation') && lower.includes('does not exist')
  ) {
    return new Error('Databázové tabuľky Projektov a úloh ešte nie sú pripravené. Spustite Supabase migráciu pre release 0.12.')
  }
  if (lower.includes('permission') || lower.includes('row-level security') || lower.includes('oprávnen')) {
    return new Error('Používateľ nemá oprávnenie meniť Projekty a úlohy.')
  }
  return error instanceof Error ? error : new Error(message || 'Operácia s Projektmi a úlohami zlyhala.')
}

export async function loadWorkData(): Promise<{ projects: Project[]; tasks: Task[] }> {
  if (!supabase) return { projects: [], tasks: [] }

  try {
    const [projectsResult, tasksResult] = await Promise.all([
      supabase
        .from('work_projects')
        .select('id, code, name, type, owner, sponsor, status, priority, progress, start_date, due_date, description, note, updated_at')
        .order('priority')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('code'),
      supabase
        .from('work_tasks')
        .select('id, code, title, project_id, owner, priority, status, start_date, due_date, description, source, type, estimate_hours, spent_hours, progress, dependency, note, created_at, updated_at')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('code'),
    ])

    if (projectsResult.error) throw projectsResult.error
    if (tasksResult.error) throw tasksResult.error

    const projectRows = (projectsResult.data ?? []) as WorkProjectRow[]
    const projectCodes = new Map(projectRows.map((row) => [row.id, row.code]))

    return {
      projects: projectRows.map(projectFromRow),
      tasks: ((tasksResult.data ?? []) as WorkTaskRow[]).map((row) => taskFromRow(row, projectCodes)),
    }
  } catch (error) {
    throw friendlyWorkError(error)
  }
}

export async function upsertWorkProject(project: Project): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('upsert_work_project', { p_project: project })
  if (error) throw friendlyWorkError(error)
}

export async function deleteWorkProject(projectCode: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('delete_work_project', { p_project_code: projectCode })
  if (error) throw friendlyWorkError(error)
}

export async function upsertWorkTask(task: Task): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('upsert_work_task', { p_task: task })
  if (error) throw friendlyWorkError(error)
}

export async function deleteWorkTask(taskCode: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('delete_work_task', { p_task_code: taskCode })
  if (error) throw friendlyWorkError(error)
}

export async function syncWorkProjects(previous: Project[], next: Project[]): Promise<void> {
  const previousById = new Map(previous.map((item) => [item.id, item]))
  const nextById = new Map(next.map((item) => [item.id, item]))

  for (const item of next) {
    const old = previousById.get(item.id)
    if (!old || !sameRecord(old, item)) await upsertWorkProject(item)
  }

  for (const item of previous) {
    if (!nextById.has(item.id)) await deleteWorkProject(item.id)
  }
}

export async function syncWorkTasks(previous: Task[], next: Task[]): Promise<void> {
  const previousById = new Map(previous.map((item) => [item.id, item]))
  const nextById = new Map(next.map((item) => [item.id, item]))

  for (const item of next) {
    const old = previousById.get(item.id)
    if (!old || !sameRecord(old, item)) await upsertWorkTask(item)
  }

  for (const item of previous) {
    if (!nextById.has(item.id)) await deleteWorkTask(item.id)
  }
}

export function subscribeToWorkData(organizationId: string, onChange: () => void): () => void {
  if (!supabase || !organizationId) return () => undefined

  const channel = supabase
    .channel(`work-data-${organizationId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'work_projects', filter: `organization_id=eq.${organizationId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'work_tasks', filter: `organization_id=eq.${organizationId}` },
      onChange,
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
