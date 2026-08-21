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

function rawErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim()
  if (typeof error === 'string' && error.trim()) return error.trim()
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    const parts = ['message', 'details', 'hint', 'code', 'error_description']
      .map((key) => record[key])
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    if (parts.length) return parts.join(' · ')
    try {
      const serialized = JSON.stringify(error)
      if (serialized && serialized !== '{}') return serialized
    } catch {
      // Použijeme všeobecnú hlášku nižšie.
    }
  }
  return ''
}

function friendlyIamError(error: unknown, context = 'Operácia IAM'): Error {
  const message = rawErrorMessage(error)
  const lower = message.toLowerCase()

  if (
    lower.includes('iam_requests') ||
    lower.includes('iam_catalog_items') ||
    lower.includes('iam_recert_campaigns') ||
    lower.includes('schema cache') ||
    lower.includes('could not find the table') ||
    lower.includes('pgrst205') ||
    lower.includes('42p01') ||
    (lower.includes('relation') && lower.includes('does not exist'))
  ) {
    return new Error('Databázové tabuľky IAM nie sú pripravené v tomto Supabase projekte. Spustite súbor IS_Riadenie_odboru_v0.16.1_IAM_DATABASE_FIX.sql a potom kliknite na Obnoviť. Dáta zo spoločného snapshotu zostali zobrazené.')
  }
  if (
    lower.includes('upsert_iam_') ||
    lower.includes('delete_iam_') ||
    lower.includes('42883') ||
    lower.includes('function') && lower.includes('does not exist')
  ) {
    return new Error('Databázové funkcie IAM nie sú pripravené. Spustite súbor IS_Riadenie_odboru_v0.16.1_IAM_DATABASE_FIX.sql.')
  }
  if (lower.includes('column') && (lower.includes('does not exist') || lower.includes('42703'))) {
    return new Error(`Štruktúra IAM databázy nie je aktuálna. Spustite SQL opravu 0.16.1. Technický detail: ${message}`)
  }
  if (
    lower.includes('permission') ||
    lower.includes('row-level security') ||
    lower.includes('42501') ||
    lower.includes('oprávnen')
  ) {
    return new Error('Používateľ nemá oprávnenie vykonať túto operáciu v IAM. Skontrolujte rolu používateľa a RLS pravidlá.')
  }
  if (lower.includes('jwt') || lower.includes('401') || lower.includes('not authenticated')) {
    return new Error('Prihlásenie do Supabase už nie je platné. Odhláste sa a znovu sa prihláste.')
  }

  return new Error(message ? `${context} zlyhala: ${message}` : `${context} zlyhala bez technického detailu. Skontrolujte Supabase Logs.`)
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

    if (catalogResult.error) throw friendlyIamError(catalogResult.error, 'Načítanie katalógu prístupov')
    if (requestsResult.error) throw friendlyIamError(requestsResult.error, 'Načítanie IAM žiadostí')
    if (campaignsResult.error) throw friendlyIamError(campaignsResult.error, 'Načítanie recertifikácií')

    const catalogRows = (catalogResult.data ?? []) as IamCatalogRow[]
    const catalogCodes = new Map(catalogRows.map((row) => [row.id, row.code]))

    return {
      accessCatalog: catalogRows.map(catalogFromRow),
      accessRequests: ((requestsResult.data ?? []) as IamRequestRow[]).map((row) => requestFromRow(row, catalogCodes)),
      recertificationCampaigns: ((campaignsResult.data ?? []) as IamCampaignRow[]).map(campaignFromRow),
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw friendlyIamError(error, 'Načítanie IAM')
  }
}

export async function upsertIamRequest(request: AccessRequest): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('upsert_iam_request', { p_request: request })
  if (error) throw friendlyIamError(error, 'Uloženie IAM žiadosti')
}

export async function deleteIamRequest(requestCode: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('delete_iam_request', { p_request_code: requestCode })
  if (error) throw friendlyIamError(error, 'Odstránenie IAM žiadosti')
}

export async function upsertIamCatalogItem(item: AccessCatalogItem): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('upsert_iam_catalog_item', { p_item: item })
  if (error) throw friendlyIamError(error, 'Uloženie katalógovej položky IAM')
}

export async function deleteIamCatalogItem(itemCode: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('delete_iam_catalog_item', { p_item_code: itemCode })
  if (error) throw friendlyIamError(error, 'Odstránenie katalógovej položky IAM')
}

export async function upsertIamRecertCampaign(campaign: RecertificationCampaign): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('upsert_iam_recert_campaign', { p_campaign: campaign })
  if (error) throw friendlyIamError(error, 'Uloženie recertifikačnej kampane')
}

export async function deleteIamRecertCampaign(campaignCode: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('delete_iam_recert_campaign', { p_campaign_code: campaignCode })
  if (error) throw friendlyIamError(error, 'Odstránenie recertifikačnej kampane')
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
