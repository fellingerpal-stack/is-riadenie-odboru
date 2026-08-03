import type { AccessApproval, AccessCatalogItem, AccessComment, AccessHistory, AccessRequest, RecertificationCampaign, RecertificationItem } from '../types'
import { supabase } from './supabase'

export type IamDatabaseState = 'local' | 'loading' | 'synced' | 'saving' | 'error'

interface IamCatalogRow {
  id: string
  code: string
  name: string
  service_key: string
  system_name: string
  description: string
  business_owner: string
  technical_owner: string
  risk: string
  privileged: boolean
  default_duration_days: number
  approval_path: unknown
  is_active: boolean
}

interface IamRequestRow {
  id: string
  code: string
  request_type: string
  subject_name: string
  subject_email: string
  department: string
  manager_name: string
  requester_name: string
  service_key: string
  catalog_item_id: string | null
  requested_access: string
  current_access: string
  business_justification: string
  privileged: boolean
  risk: string
  status: string
  start_date: string | null
  end_date: string | null
  due_date: string | null
  assignee: string
  linked_task_key: string
  approvals: unknown
  comments: unknown
  history: unknown
  completed_at: string | null
  created_at: string
  updated_at: string
}

interface IamCampaignRow {
  id: string
  code: string
  name: string
  description: string
  owner_name: string
  scope: string
  status: string
  start_date: string | null
  due_date: string | null
  items: unknown
  created_at: string
  updated_at: string
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function catalogFromRow(row: IamCatalogRow): AccessCatalogItem {
  return {
    id: row.code,
    name: row.name,
    serviceId: row.service_key,
    system: row.system_name,
    description: row.description,
    businessOwner: row.business_owner,
    technicalOwner: row.technical_owner,
    risk: row.risk,
    privileged: Boolean(row.privileged),
    defaultDurationDays: Number(row.default_duration_days || 0),
    approvalPath: asArray<string>(row.approval_path).filter((item) => typeof item === 'string'),
    isActive: Boolean(row.is_active),
  }
}

function requestFromRow(row: IamRequestRow, catalogCodes: Map<string, string>): AccessRequest {
  return {
    id: row.code,
    requestType: row.request_type,
    subjectName: row.subject_name,
    subjectEmail: row.subject_email,
    department: row.department,
    manager: row.manager_name,
    requester: row.requester_name,
    serviceId: row.service_key,
    catalogItemId: row.catalog_item_id ? catalogCodes.get(row.catalog_item_id) ?? '' : '',
    requestedAccess: row.requested_access,
    currentAccess: row.current_access,
    businessJustification: row.business_justification,
    privileged: Boolean(row.privileged),
    risk: row.risk,
    status: row.status,
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    dueDate: row.due_date ?? '',
    assignee: row.assignee,
    linkedTaskId: row.linked_task_key,
    approvals: asArray<AccessApproval>(row.approvals),
    comments: asArray<AccessComment>(row.comments),
    history: asArray<AccessHistory>(row.history),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? '',
  }
}

function campaignFromRow(row: IamCampaignRow): RecertificationCampaign {
  return {
    id: row.code,
    name: row.name,
    description: row.description,
    owner: row.owner_name,
    scope: row.scope,
    status: row.status,
    startDate: row.start_date ?? '',
    dueDate: row.due_date ?? '',
    items: asArray<RecertificationItem>(row.items),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function sameRecord(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function friendlyIamError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const lower = message.toLowerCase()

  if (
    lower.includes('iam_requests') ||
    lower.includes('iam_catalog_items') ||
    lower.includes('iam_recert_campaigns') ||
    lower.includes('schema cache') ||
    lower.includes('could not find the table') ||
    (lower.includes('relation') && lower.includes('does not exist'))
  ) {
    return new Error('Databázové tabuľky IAM ešte nie sú pripravené. Spustite Supabase migráciu pre release 0.12.2.')
  }
  if (lower.includes('permission') || lower.includes('row-level security') || lower.includes('oprávnen')) {
    return new Error('Používateľ nemá oprávnenie vykonať túto operáciu v IAM.')
  }
  return error instanceof Error ? error : new Error(message || 'Operácia s IAM zlyhala.')
}

export async function loadIamData(): Promise<{
  accessRequests: AccessRequest[]
  accessCatalog: AccessCatalogItem[]
  recertificationCampaigns: RecertificationCampaign[]
}> {
  if (!supabase) return { accessRequests: [], accessCatalog: [], recertificationCampaigns: [] }

  try {
    const [catalogResult, requestsResult, campaignsResult] = await Promise.all([
      supabase
        .from('iam_catalog_items')
        .select('id, code, name, service_key, system_name, description, business_owner, technical_owner, risk, privileged, default_duration_days, approval_path, is_active')
        .order('name'),
      supabase
        .from('iam_requests')
        .select('id, code, request_type, subject_name, subject_email, department, manager_name, requester_name, service_key, catalog_item_id, requested_access, current_access, business_justification, privileged, risk, status, start_date, end_date, due_date, assignee, linked_task_key, approvals, comments, history, completed_at, created_at, updated_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('iam_recert_campaigns')
        .select('id, code, name, description, owner_name, scope, status, start_date, due_date, items, created_at, updated_at')
        .order('created_at', { ascending: false }),
    ])

    if (catalogResult.error) throw catalogResult.error
    if (requestsResult.error) throw requestsResult.error
    if (campaignsResult.error) throw campaignsResult.error

    const catalogRows = (catalogResult.data ?? []) as IamCatalogRow[]
    const catalogCodes = new Map(catalogRows.map((row) => [row.id, row.code]))

    return {
      accessCatalog: catalogRows.map(catalogFromRow),
      accessRequests: ((requestsResult.data ?? []) as IamRequestRow[]).map((row) => requestFromRow(row, catalogCodes)),
      recertificationCampaigns: ((campaignsResult.data ?? []) as IamCampaignRow[]).map(campaignFromRow),
    }
  } catch (error) {
    throw friendlyIamError(error)
  }
}

export async function upsertIamRequest(request: AccessRequest): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('upsert_iam_request', { p_request: request })
  if (error) throw friendlyIamError(error)
}

export async function deleteIamRequest(requestCode: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('delete_iam_request', { p_request_code: requestCode })
  if (error) throw friendlyIamError(error)
}

export async function upsertIamCatalogItem(item: AccessCatalogItem): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('upsert_iam_catalog_item', { p_item: item })
  if (error) throw friendlyIamError(error)
}

export async function deleteIamCatalogItem(itemCode: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('delete_iam_catalog_item', { p_item_code: itemCode })
  if (error) throw friendlyIamError(error)
}

export async function upsertIamRecertCampaign(campaign: RecertificationCampaign): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('upsert_iam_recert_campaign', { p_campaign: campaign })
  if (error) throw friendlyIamError(error)
}

export async function deleteIamRecertCampaign(campaignCode: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('delete_iam_recert_campaign', { p_campaign_code: campaignCode })
  if (error) throw friendlyIamError(error)
}

async function syncCollection<T extends { id: string }>(
  previous: T[],
  next: T[],
  upsert: (item: T) => Promise<void>,
  remove: (id: string) => Promise<void>,
): Promise<void> {
  const previousById = new Map(previous.map((item) => [item.id, item]))
  const nextById = new Map(next.map((item) => [item.id, item]))

  for (const item of next) {
    const old = previousById.get(item.id)
    if (!old || !sameRecord(old, item)) await upsert(item)
  }

  for (const item of previous) {
    if (!nextById.has(item.id)) await remove(item.id)
  }
}

export function syncIamRequests(previous: AccessRequest[], next: AccessRequest[]): Promise<void> {
  return syncCollection(previous, next, upsertIamRequest, deleteIamRequest)
}

export function syncIamCatalog(previous: AccessCatalogItem[], next: AccessCatalogItem[]): Promise<void> {
  return syncCollection(previous, next, upsertIamCatalogItem, deleteIamCatalogItem)
}

export function syncIamCampaigns(previous: RecertificationCampaign[], next: RecertificationCampaign[]): Promise<void> {
  return syncCollection(previous, next, upsertIamRecertCampaign, deleteIamRecertCampaign)
}

export function subscribeToIamData(organizationId: string, onChange: () => void): () => void {
  if (!supabase || !organizationId) return () => undefined

  const client = supabase
  const channel = client
    .channel(`iam-data-${organizationId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'iam_catalog_items', filter: `organization_id=eq.${organizationId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'iam_requests', filter: `organization_id=eq.${organizationId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'iam_recert_campaigns', filter: `organization_id=eq.${organizationId}` },
      onChange,
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}
