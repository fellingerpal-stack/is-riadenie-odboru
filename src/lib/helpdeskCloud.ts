import type { AppRole, ServiceCalendarException, ServiceCatalogField, ServiceCatalogItem, ServiceEmailChannel, ServiceKnowledgeArticle, ServiceNotification, ServiceRoutingRule, SlaPolicy, SupportQueue, Ticket, TicketAttachment, TicketComment, TicketHistory } from '../types'
import { supabase } from './supabase'

export type HelpdeskDatabaseState = 'local' | 'loading' | 'synced' | 'saving' | 'error'

interface ServiceQueueRow {
  id: string
  code: string
  name: string
  description: string
  members: unknown
  email: string
  lead: string
  deputy: string
  working_hours: string
  business_calendar_enabled: boolean
  working_days: unknown
  workday_start: string
  workday_end: string
  timezone: string
  sla_warning_minutes: number
  email_notifications: boolean
  sla_policy_code: string
  is_active: boolean
}


interface ServiceEmployeeQueueRow {
  id: string
  code: string
  name: string
  description: string
  is_active: boolean
}

interface ServiceNotificationRow {
  id: string
  kind: string
  severity: string
  title: string
  message: string
  ticket_code: string
  target_email: string
  is_read: boolean
  email_status: string
  created_at: string
}

interface ServiceCalendarExceptionRow {
  id: string
  day: string
  is_working_day: boolean
  workday_start: string | null
  workday_end: string | null
  label: string
}

interface ServiceEmailChannelRow {
  id: string
  address: string
  name: string
  queue_code: string
  ticket_type: string
  category: string
  subcategory: string
  service_key: string
  priority: string
  is_active: boolean
}

interface ServiceCatalogItemRow {
  id: string
  code: string
  name: string
  group_name: string
  description: string
  icon: string
  ticket_type: string
  category: string
  subcategory: string
  service_key: string
  queue_code: string
  priority: string
  sort_order: number
  form_schema: unknown
  is_active: boolean
}

interface ServiceKnowledgeArticleRow {
  id: string
  code: string
  title: string
  summary: string
  content: string
  article_type: string
  status: string
  service_key: string
  catalog_item_code: string
  category: string
  subcategory: string
  keywords: unknown
  symptoms: string
  workaround: string
  root_cause: string
  owner_name: string
  source_ticket_code: string
  is_featured: boolean
  view_count: number
  helpful_count: number
  not_helpful_count: number
  created_at: string
  updated_at: string
}

interface ServiceSlaPolicyRow {
  id: string
  code: string
  name: string
  priority: string
  first_response_hours: number
  resolution_hours: number
  is_active: boolean
}


interface ServiceRoutingRuleRow {
  id: string
  code: string
  name: string
  ticket_type: string
  category: string
  subcategory: string
  service_key: string
  queue_id: string | null
  priority: string
  sort_order: number
  is_active: boolean
}

interface ServiceTicketRow {
  id: string
  code: string
  ticket_type: string
  title: string
  description: string
  requester_name: string
  requester_email: string
  service_key: string
  category: string
  subcategory: string
  queue_id: string | null
  priority: string
  impact: string
  urgency: string
  status: string
  assignee: string
  channel: string
  catalog_item_code: string
  request_data: unknown
  due_date: string | null
  first_response_due_at: string | null
  resolution_due_at: string | null
  first_responded_at: string | null
  resolved_at: string | null
  linked_task_key: string
  resolution: string
  internal_note: string
  comments: unknown
  history: unknown
  attachments: unknown
  created_at: string
  updated_at: string
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function emailChannelFromRow(row: ServiceEmailChannelRow): ServiceEmailChannel {
  return {
    id: row.id,
    address: row.address,
    name: row.name,
    queueId: row.queue_code || '',
    ticketType: row.ticket_type || 'Požiadavka',
    category: row.category || 'Ostatné',
    subcategory: row.subcategory || 'Iné',
    serviceId: row.service_key || '',
    priority: row.priority || 'Stredná',
    isActive: Boolean(row.is_active),
  }
}

function catalogItemFromRow(row: ServiceCatalogItemRow): ServiceCatalogItem {
  const fields = asArray<ServiceCatalogField>(row.form_schema).map((field) => ({
    key: typeof field?.key === 'string' ? field.key : '',
    label: typeof field?.label === 'string' ? field.label : '',
    type: ['text','textarea','select','date','number','checkbox'].includes(String(field?.type)) ? field.type : 'text',
    required: Boolean(field?.required),
    placeholder: typeof field?.placeholder === 'string' ? field.placeholder : '',
    helpText: typeof field?.helpText === 'string' ? field.helpText : '',
    options: Array.isArray(field?.options) ? field.options.filter((value): value is string => typeof value === 'string') : [],
  })).filter((field) => field.key && field.label)
  return {
    id: row.code,
    name: row.name,
    group: row.group_name || 'Ostatné',
    description: row.description || '',
    icon: row.icon || 'helpdesk',
    ticketType: row.ticket_type || 'Požiadavka',
    category: row.category || 'Ostatné',
    subcategory: row.subcategory || 'Iné',
    serviceId: row.service_key || '',
    queueId: row.queue_code || '',
    priority: row.priority || 'Stredná',
    sortOrder: Number(row.sort_order || 0),
    fields,
    isActive: Boolean(row.is_active),
  }
}

function knowledgeArticleFromRow(row: ServiceKnowledgeArticleRow): ServiceKnowledgeArticle {
  return {
    id: row.code,
    title: row.title || '',
    summary: row.summary || '',
    content: row.content || '',
    articleType: row.article_type === 'Known Error' ? 'Known Error' : 'Návod',
    status: row.status === 'Publikované' || row.status === 'Archivované' ? row.status : 'Návrh',
    serviceId: row.service_key || '',
    catalogItemId: row.catalog_item_code || '',
    category: row.category || '',
    subcategory: row.subcategory || '',
    keywords: asArray<string>(row.keywords).filter((value): value is string => typeof value === 'string'),
    symptoms: row.symptoms || '',
    workaround: row.workaround || '',
    rootCause: row.root_cause || '',
    owner: row.owner_name || '',
    sourceTicketId: row.source_ticket_code || '',
    isFeatured: Boolean(row.is_featured),
    viewCount: Number(row.view_count || 0),
    helpfulCount: Number(row.helpful_count || 0),
    notHelpfulCount: Number(row.not_helpful_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function queueFromRow(row: ServiceQueueRow): SupportQueue {
  return {
    id: row.code,
    name: row.name,
    description: row.description,
    members: asArray<string>(row.members).filter((item) => typeof item === 'string'),
    email: row.email,
    lead: row.lead || '',
    deputy: row.deputy || '',
    workingHours: row.working_hours || 'Po-Pi 08:00-16:00',
    businessCalendarEnabled: row.business_calendar_enabled !== false,
    workingDays: asArray<number>(row.working_days).filter((item) => Number.isInteger(item) && item >= 1 && item <= 7),
    workdayStart: row.workday_start || '08:00',
    workdayEnd: row.workday_end || '16:00',
    timezone: row.timezone || 'Europe/Bratislava',
    slaWarningMinutes: Number(row.sla_warning_minutes || 240),
    emailNotifications: row.email_notifications !== false,
    slaPolicyId: row.sla_policy_code || '',
    isActive: Boolean(row.is_active),
  }
}

function notificationFromRow(row: ServiceNotificationRow): ServiceNotification {
  return {
    id: row.id,
    kind: row.kind,
    severity: row.severity,
    title: row.title,
    message: row.message,
    ticketId: row.ticket_code || '',
    targetEmail: row.target_email || '',
    isRead: Boolean(row.is_read),
    emailStatus: row.email_status || 'disabled',
    createdAt: row.created_at,
  }
}

function calendarExceptionFromRow(row: ServiceCalendarExceptionRow): ServiceCalendarException {
  return {
    id: row.id,
    day: row.day,
    isWorkingDay: Boolean(row.is_working_day),
    workdayStart: row.workday_start || '',
    workdayEnd: row.workday_end || '',
    label: row.label || '',
  }
}

function policyFromRow(row: ServiceSlaPolicyRow): SlaPolicy {
  return {
    id: row.code,
    name: row.name,
    priority: row.priority,
    firstResponseHours: Number(row.first_response_hours || 0),
    resolutionHours: Number(row.resolution_hours || 0),
    isActive: Boolean(row.is_active),
  }
}


function routingRuleFromRow(row: ServiceRoutingRuleRow, queueCodes: Map<string,string>): ServiceRoutingRule {
  return {
    id: row.code,
    name: row.name,
    ticketType: row.ticket_type,
    category: row.category,
    subcategory: row.subcategory,
    serviceId: row.service_key,
    queueId: row.queue_id ? queueCodes.get(row.queue_id) ?? '' : '',
    priority: row.priority,
    sortOrder: Number(row.sort_order || 0),
    isActive: Boolean(row.is_active),
  }
}

function ticketFromRow(row: ServiceTicketRow, queueCodes: Map<string, string>): Ticket {
  return {
    id: row.code,
    type: row.ticket_type,
    title: row.title,
    description: row.description,
    requester: row.requester_name,
    requesterEmail: row.requester_email,
    serviceId: row.service_key,
    category: row.category,
    subcategory: row.subcategory,
    queueId: row.queue_id ? queueCodes.get(row.queue_id) ?? '' : '',
    priority: row.priority,
    impact: row.impact,
    urgency: row.urgency,
    status: row.status,
    assignee: row.assignee,
    channel: row.channel,
    catalogItemId: row.catalog_item_code || '',
    requestData: row.request_data && typeof row.request_data === 'object' && !Array.isArray(row.request_data) ? row.request_data as Record<string, string | number | boolean> : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    due: row.due_date ?? '',
    firstResponseDueAt: row.first_response_due_at ?? undefined,
    resolutionDueAt: row.resolution_due_at ?? undefined,
    firstRespondedAt: row.first_responded_at ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    linkedTaskId: row.linked_task_key,
    resolution: row.resolution,
    internalNote: row.internal_note,
    comments: asArray<TicketComment>(row.comments),
    history: asArray<TicketHistory>(row.history),
    attachments: asArray<TicketAttachment>(row.attachments),
  }
}

function sameRecord(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function friendlyHelpdeskError(error: unknown): Error {
  const source = error && typeof error === 'object' ? error as Record<string, unknown> : null
  const parts = source
    ? ['message', 'details', 'hint', 'code', 'error_description']
        .map((key) => typeof source[key] === 'string' ? String(source[key]).trim() : '')
        .filter(Boolean)
    : []
  const fallback = error instanceof Error ? error.message : (typeof error === 'string' ? error : '')
  const message = parts.length ? [...new Set(parts)].join(' · ') : fallback
  const lower = message.toLowerCase()

  if (
    lower.includes('service_tickets') ||
    lower.includes('service_queues') ||
    lower.includes('service_sla_policies') ||
    lower.includes('service_routing_rules') ||
    lower.includes('service_notifications') ||
    lower.includes('service_email_outbox') ||
    lower.includes('service_email_channels') ||
    lower.includes('service_email_messages') ||
    lower.includes('service_catalog_items') ||
    lower.includes('service_knowledge_articles') ||
    lower.includes('service_knowledge_feedback') ||
    lower.includes('service_calendar_exceptions') ||
    lower.includes('schema cache') ||
    lower.includes('could not find the table') ||
    (lower.includes('relation') && lower.includes('does not exist'))
  ) {
    return new Error(`Databázová vrstva ServiceDesku nie je kompletná. Overte migrácie v0.44.0 až v0.48.0.${message ? ` Detail: ${message}` : ''}`)
  }
  if (lower.includes('permission') || lower.includes('row-level security') || lower.includes('oprávnen')) {
    return new Error(`Používateľ nemá oprávnenie vykonať túto operáciu v ServiceDesku.${message ? ` Detail: ${message}` : ''}`)
  }
  return new Error(message || 'Operácia so ServiceDeskom zlyhala. Server neposlal čitateľný detail chyby.')
}

export async function loadHelpdeskData(role?: AppRole): Promise<{
  tickets: Ticket[]
  supportQueues: SupportQueue[]
  slaPolicies: SlaPolicy[]
  serviceRoutingRules: ServiceRoutingRule[]
}> {
  if (!supabase) return { tickets: [], supportQueues: [], slaPolicies: [], serviceRoutingRules: [] }

  try {
    if (role === 'employee') {
      const rpcQueues = await supabase.rpc('get_service_employee_queues')
      let queueData: unknown[] = []
      if (!rpcQueues.error) {
        queueData = (rpcQueues.data ?? []) as unknown[]
      } else if (String(rpcQueues.error.code || '').toUpperCase() === 'PGRST202') {
        const fallbackQueues = await supabase
          .from('service_queues')
          .select('id, code, name, description, is_active')
          .eq('is_active', true)
          .order('name')
        if (fallbackQueues.error) throw fallbackQueues.error
        queueData = (fallbackQueues.data ?? []) as unknown[]
      } else {
        throw rpcQueues.error
      }
      const ticketsResult = await supabase.rpc('get_service_tickets')
      if (ticketsResult.error) throw ticketsResult.error
      const queueRows = queueData as ServiceEmployeeQueueRow[]
      const queueCodes = new Map(queueRows.map((row) => [row.id, row.code]))
      const supportQueues: SupportQueue[] = queueRows.map((row) => ({
        id: row.code,
        name: row.name,
        description: row.description || '',
        members: [], email: '', lead: '', deputy: '', workingHours: '',
        businessCalendarEnabled: true, workingDays: [1,2,3,4,5], workdayStart: '08:00', workdayEnd: '16:00',
        timezone: 'Europe/Bratislava', slaWarningMinutes: 240, emailNotifications: false, slaPolicyId: '', isActive: Boolean(row.is_active),
      }))
      return {
        supportQueues,
        slaPolicies: [],
        serviceRoutingRules: [],
        tickets: ((ticketsResult.data ?? []) as ServiceTicketRow[]).map((row) => ticketFromRow(row, queueCodes)),
      }
    }

    const [queuesResult, policiesResult, routingResult, ticketsResult] = await Promise.all([
      supabase
        .from('service_queues')
        .select('id, code, name, description, members, email, lead, deputy, working_hours, business_calendar_enabled, working_days, workday_start, workday_end, timezone, sla_warning_minutes, email_notifications, sla_policy_code, is_active')
        .order('name'),
      supabase
        .from('service_sla_policies')
        .select('id, code, name, priority, first_response_hours, resolution_hours, is_active')
        .order('first_response_hours'),
      supabase
        .from('service_routing_rules')
        .select('id, code, name, ticket_type, category, subcategory, service_key, queue_id, priority, sort_order, is_active')
        .order('sort_order'),
      supabase.rpc('get_service_tickets'),
    ])

    if (queuesResult.error) throw queuesResult.error
    if (policiesResult.error) throw policiesResult.error
    if (routingResult.error) throw routingResult.error
    if (ticketsResult.error) throw ticketsResult.error

    const queueRows = (queuesResult.data ?? []) as ServiceQueueRow[]
    const queueCodes = new Map(queueRows.map((row) => [row.id, row.code]))

    return {
      supportQueues: queueRows.map(queueFromRow),
      slaPolicies: ((policiesResult.data ?? []) as ServiceSlaPolicyRow[]).map(policyFromRow),
      serviceRoutingRules: ((routingResult.data ?? []) as ServiceRoutingRuleRow[]).map((row)=>routingRuleFromRow(row,queueCodes)),
      tickets: ((ticketsResult.data ?? []) as ServiceTicketRow[]).map((row) => ticketFromRow(row, queueCodes)),
    }
  } catch (error) {
    throw friendlyHelpdeskError(error)
  }
}

export async function loadServiceCatalogItems(includeInactive = false): Promise<ServiceCatalogItem[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('get_service_catalog_items', { p_include_inactive: includeInactive })
  if (error) throw friendlyHelpdeskError(error)
  return ((data ?? []) as ServiceCatalogItemRow[]).map(catalogItemFromRow)
}

export async function upsertServiceCatalogItem(item: ServiceCatalogItem): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('upsert_service_catalog_item', { p_item: item })
  if (error) throw friendlyHelpdeskError(error)
}

export async function deleteServiceCatalogItem(itemCode: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('delete_service_catalog_item', { p_item_code: itemCode })
  if (error) throw friendlyHelpdeskError(error)
}

export async function loadServiceKnowledgeArticles(includeDrafts = false): Promise<ServiceKnowledgeArticle[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('get_service_knowledge_articles', { p_include_drafts: includeDrafts })
  if (error) throw friendlyHelpdeskError(error)
  return ((data ?? []) as ServiceKnowledgeArticleRow[]).map(knowledgeArticleFromRow)
}

export async function upsertServiceKnowledgeArticle(item: ServiceKnowledgeArticle): Promise<string> {
  if (!supabase) return item.id
  const { data, error } = await supabase.rpc('upsert_service_knowledge_article', { p_item: item })
  if (error) throw friendlyHelpdeskError(error)
  return String(data || item.id)
}

export async function archiveServiceKnowledgeArticle(articleCode: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('archive_service_knowledge_article', { p_article_code: articleCode })
  if (error) throw friendlyHelpdeskError(error)
}

export async function recordServiceKnowledgeView(articleCode: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('record_service_knowledge_view', { p_article_code: articleCode })
  if (error) throw friendlyHelpdeskError(error)
}

export async function rateServiceKnowledgeArticle(articleCode: string, helpful: boolean): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('rate_service_knowledge_article', { p_article_code: articleCode, p_helpful: helpful })
  if (error) throw friendlyHelpdeskError(error)
}

export async function loadServiceNotifications(limit = 80): Promise<ServiceNotification[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('get_service_notifications', { p_limit: limit })
  if (error) throw friendlyHelpdeskError(error)
  return ((data ?? []) as ServiceNotificationRow[]).map(notificationFromRow)
}

export async function markServiceNotificationRead(notificationId: string, isRead = true): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('mark_service_notification_read', { p_notification_id: notificationId, p_is_read: isRead })
  if (error) throw friendlyHelpdeskError(error)
}

export async function processServiceSlaEscalations(): Promise<number> {
  if (!supabase) return 0
  const { data, error } = await supabase.rpc('process_service_sla_escalations')
  if (error) throw friendlyHelpdeskError(error)
  return Number(data || 0)
}

export async function loadServiceCalendarExceptions(): Promise<ServiceCalendarException[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('get_service_calendar_exceptions')
  if (error) throw friendlyHelpdeskError(error)
  return ((data ?? []) as ServiceCalendarExceptionRow[]).map(calendarExceptionFromRow)
}

export async function upsertServiceCalendarException(item: ServiceCalendarException): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('upsert_service_calendar_exception', { p_item: item })
  if (error) throw friendlyHelpdeskError(error)
}

export async function deleteServiceCalendarException(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('delete_service_calendar_exception', { p_id: id })
  if (error) throw friendlyHelpdeskError(error)
}

export async function loadServiceEmailChannels(): Promise<ServiceEmailChannel[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('get_service_email_channels')
  if (error) throw friendlyHelpdeskError(error)
  return ((data ?? []) as ServiceEmailChannelRow[]).map(emailChannelFromRow)
}

export async function upsertServiceEmailChannel(item: ServiceEmailChannel): Promise<string> {
  if (!supabase) return item.id
  const { data, error } = await supabase.rpc('upsert_service_email_channel', { p_item: item })
  if (error) throw friendlyHelpdeskError(error)
  return String(data || item.id)
}

export async function deleteServiceEmailChannel(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('delete_service_email_channel', { p_id: id })
  if (error) throw friendlyHelpdeskError(error)
}

export async function upsertServiceTicket(ticket: Ticket): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('upsert_service_ticket', { p_ticket: ticket })
  if (error) throw friendlyHelpdeskError(error)
}

export async function deleteServiceTicket(ticketCode: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('delete_service_ticket', { p_ticket_code: ticketCode })
  if (error) throw friendlyHelpdeskError(error)
}

export async function upsertServiceQueue(queue: SupportQueue): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('upsert_service_queue', { p_queue: queue })
  if (error) throw friendlyHelpdeskError(error)
}

export async function deleteServiceQueue(queueCode: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('delete_service_queue', { p_queue_code: queueCode })
  if (error) throw friendlyHelpdeskError(error)
}

export async function upsertServiceSlaPolicy(policy: SlaPolicy): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('upsert_service_sla_policy', { p_policy: policy })
  if (error) throw friendlyHelpdeskError(error)
}

export async function deleteServiceSlaPolicy(policyCode: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('delete_service_sla_policy', { p_policy_code: policyCode })
  if (error) throw friendlyHelpdeskError(error)
}


export async function upsertServiceRoutingRule(rule: ServiceRoutingRule): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('upsert_service_routing_rule', { p_rule: rule })
  if (error) throw friendlyHelpdeskError(error)
}

export async function deleteServiceRoutingRule(ruleCode: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('delete_service_routing_rule', { p_rule_code: ruleCode })
  if (error) throw friendlyHelpdeskError(error)
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

export function syncServiceTickets(previous: Ticket[], next: Ticket[]): Promise<void> {
  return syncCollection(previous, next, upsertServiceTicket, deleteServiceTicket)
}

export function syncServiceQueues(previous: SupportQueue[], next: SupportQueue[]): Promise<void> {
  return syncCollection(previous, next, upsertServiceQueue, deleteServiceQueue)
}

export function syncServiceSlaPolicies(previous: SlaPolicy[], next: SlaPolicy[]): Promise<void> {
  return syncCollection(previous, next, upsertServiceSlaPolicy, deleteServiceSlaPolicy)
}

export function syncServiceRoutingRules(previous: ServiceRoutingRule[], next: ServiceRoutingRule[]): Promise<void> {
  return syncCollection(previous, next, upsertServiceRoutingRule, deleteServiceRoutingRule)
}

export function subscribeToHelpdeskData(organizationId: string, onChange: () => void): () => void {
  if (!supabase || !organizationId) return () => undefined

  const client = supabase
  const channel = client
    .channel(`helpdesk-data-${organizationId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'service_tickets', filter: `organization_id=eq.${organizationId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'service_queues', filter: `organization_id=eq.${organizationId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'service_sla_policies', filter: `organization_id=eq.${organizationId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'service_routing_rules', filter: `organization_id=eq.${organizationId}` },
      onChange,
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}
