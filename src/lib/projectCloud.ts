import type {
  Project,
  ProjectFunding,
  ProjectLink,
  ProjectMember,
  ProjectMilestone,
  ProjectRaidItem,
  ProjectStatusReport,
  ProjectDecision,
  ProjectPortfolioData,
  ProjectReferenceItem,
  Task,
} from '../types'
import { supabase } from './supabase'

export type ProjectDatabaseState = 'local' | 'loading' | 'synced' | 'saving' | 'error'

const emptyPortfolio = (): ProjectPortfolioData => ({
  projects: [],
  tasks: [],
  members: [],
  funding: [],
  milestones: [],
  links: [],
  raidItems: [],
  statusReports: [],
  decisions: [],
  references: [],
})

function array<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function friendlyProjectError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const lower = message.toLowerCase()
  if (lower.includes('project_governance')) {
    return new Error('Project Governance ešte nie je pripravený v databáze. Spustite migráciu v0.55.0.')
  }
  if (lower.includes('project_portfolio') || lower.includes('project_members') || lower.includes('project_funding')) {
    return new Error('Modul Riadenie projektov ešte nie je pripravený v databáze. Spustite projektové migrácie.')
  }
  if (lower.includes('permission') || lower.includes('denied') || lower.includes('opravnen')) {
    return new Error('Na túto operáciu v Riadení projektov nemáte oprávnenie.')
  }
  return error instanceof Error ? error : new Error(message || 'Operácia Riadenia projektov zlyhala.')
}

function normalizePortfolio(value: unknown): ProjectPortfolioData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyPortfolio()
  const row = value as Record<string, unknown>
  return {
    projects: array<Project>(row.projects),
    tasks: array<Task>(row.tasks),
    members: array<ProjectMember>(row.members),
    funding: array<ProjectFunding>(row.funding),
    milestones: array<ProjectMilestone>(row.milestones),
    links: array<ProjectLink>(row.links),
    raidItems: array<ProjectRaidItem>(row.raidItems),
    statusReports: array<ProjectStatusReport>(row.statusReports),
    decisions: array<ProjectDecision>(row.decisions),
    references: array<ProjectReferenceItem>(row.references),
  }
}

export async function loadProjectPortfolio(): Promise<ProjectPortfolioData> {
  if (!supabase) return emptyPortfolio()
  try {
    const [{ data, error }, governance] = await Promise.all([
      supabase.rpc('project_portfolio_read'),
      supabase.rpc('project_governance_read'),
    ])
    if (error) throw error
    if (governance.error) throw governance.error
    const portfolio = normalizePortfolio(data)
    const governanceData = governance.data && typeof governance.data === 'object' && !Array.isArray(governance.data) ? governance.data as Record<string, unknown> : {}
    return {
      ...portfolio,
      raidItems: array<ProjectRaidItem>(governanceData.raidItems),
      statusReports: array<ProjectStatusReport>(governanceData.statusReports),
      decisions: array<ProjectDecision>(governanceData.decisions),
    }
  } catch (error) {
    throw friendlyProjectError(error)
  }
}

async function invoke(functionName: string, args: Record<string, unknown>): Promise<void> {
  if (!supabase) return
  try {
    const { error } = await supabase.rpc(functionName, args)
    if (error) throw error
  } catch (error) {
    throw friendlyProjectError(error)
  }
}

export async function savePortfolioProject(project: Project): Promise<void> {
  return invoke('project_portfolio_upsert_project', { p_project: project })
}

export async function deletePortfolioProject(projectId: string): Promise<void> {
  return invoke('project_portfolio_delete_project', { p_project_code: projectId })
}

export async function savePortfolioTask(task: Task): Promise<void> {
  return invoke('project_portfolio_upsert_task', { p_task: task })
}

export async function deletePortfolioTask(taskId: string): Promise<void> {
  return invoke('project_portfolio_delete_task', { p_task_code: taskId })
}

export async function saveProjectMember(member: ProjectMember): Promise<void> {
  return invoke('project_portfolio_upsert_member', { p_member: member })
}

export async function deleteProjectMember(memberId: string): Promise<void> {
  return invoke('project_portfolio_delete_member', { p_member_id: memberId })
}

export async function saveProjectFunding(item: ProjectFunding): Promise<void> {
  return invoke('project_portfolio_upsert_funding', { p_item: item })
}

export async function deleteProjectFunding(itemId: string): Promise<void> {
  return invoke('project_portfolio_delete_funding', { p_item_id: itemId })
}

export async function saveProjectMilestone(item: ProjectMilestone): Promise<void> {
  return invoke('project_portfolio_upsert_milestone', { p_item: item })
}

export async function deleteProjectMilestone(itemId: string): Promise<void> {
  return invoke('project_portfolio_delete_milestone', { p_item_id: itemId })
}

export async function saveProjectLink(item: ProjectLink): Promise<void> {
  return invoke('project_portfolio_upsert_link', { p_item: item })
}

export async function deleteProjectLink(itemId: string): Promise<void> {
  return invoke('project_portfolio_delete_link', { p_item_id: itemId })
}


export async function saveProjectRaidItem(item: ProjectRaidItem): Promise<void> {
  return invoke('project_portfolio_upsert_raid', { p_item: item })
}

export async function deleteProjectRaidItem(itemId: string): Promise<void> {
  return invoke('project_portfolio_delete_raid', { p_item_id: itemId })
}

export async function saveProjectStatusReport(item: ProjectStatusReport): Promise<void> {
  return invoke('project_portfolio_upsert_status_report', { p_item: item })
}

export async function deleteProjectStatusReport(itemId: string): Promise<void> {
  return invoke('project_portfolio_delete_status_report', { p_item_id: itemId })
}

export async function saveProjectDecision(item: ProjectDecision): Promise<void> {
  return invoke('project_portfolio_upsert_decision', { p_item: item })
}

export async function deleteProjectDecision(itemId: string): Promise<void> {
  return invoke('project_portfolio_delete_decision', { p_item_id: itemId })
}

export function subscribeToProjectPortfolio(organizationId: string, onChange: () => void): () => void {
  if (!supabase || !organizationId) return () => undefined
  const client = supabase
  const tables = ['work_projects', 'work_tasks', 'project_members', 'project_funding', 'project_milestones', 'project_links', 'project_raid_items', 'project_status_reports', 'project_decisions']
  let channel = client.channel(`project-portfolio-${organizationId}`)
  for (const table of tables) {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `organization_id=eq.${organizationId}` }, onChange)
  }
  channel.subscribe()
  return () => { void client.removeChannel(channel) }
}
