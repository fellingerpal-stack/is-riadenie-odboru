import type { ServiceRoutingRule, SlaPolicy, SupportQueue, Ticket, TicketAttachment, TicketComment, TicketHistory } from '../types'
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
  sla_policy_code: string
  is_active: boolean
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
    slaPolicyId: row.sla_policy_code || '',
    isActive: Boolean(row.is_active),
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
  const message = error instanceof Error ? error.message : String(error ?? '')
  const lower = message.toLowerCase()

  if (
    lower.includes('service_tickets') ||
    lower.includes('service_queues') ||
    lower.includes('service_sla_policies') ||
    lower.includes('service_routing_rules') ||
    lower.includes('schema cache') ||
    lower.includes('could not find the table') ||
    (lower.includes('relation') && lower.includes('does not exist'))
  ) {
    return new Error('Databázové tabuľky Helpdesku ešte nie sú pripravené. Spustite Supabase migráciu migration_servicedesk_v044.sql pre release 0.44.0.')
  }
  if (lower.includes('permission') || lower.includes('row-level security') || lower.includes('oprávnen')) {
    return new Error('Používateľ nemá oprávnenie vykonať túto operáciu v Helpdesku.')
  }
  return error instanceof Error ? error : new Error(message || 'Operácia s Helpdeskom zlyhala.')
}

export async function loadHelpdeskData(): Promise<{
  tickets: Ticket[]
  supportQueues: SupportQueue[]
  slaPolicies: SlaPolicy[]
  serviceRoutingRules: ServiceRoutingRule[]
}> {
  if (!supabase) return { tickets: [], supportQueues: [], slaPolicies: [], serviceRoutingRules: [] }

  try {
    const [queuesResult, policiesResult, routingResult, ticketsResult] = await Promise.all([
      supabase
        .from('service_queues')
        .select('id, code, name, description, members, email, lead, deputy, working_hours, sla_policy_code, is_active')
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
