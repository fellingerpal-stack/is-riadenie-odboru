import type { UserAuditEntry } from '../types'
import { listUserAudit } from './cloud'
import { supabase } from './supabase'

export type AuditCategory = 'data_change' | 'user_admin' | 'security' | 'system' | 'integration' | 'unknown'
export type AuditStatus = 'success' | 'warning' | 'error'

export interface AuditLogEntry {
  id: string
  organizationId: string
  actorId: string
  actorName: string
  actorEmail: string
  category: AuditCategory
  action: string
  module: string
  scope: string
  entityType: string
  entityId: string
  entityLabel: string
  summary: string
  details: Record<string, unknown>
  status: AuditStatus
  source: string
  snapshotVersion: number | null
  requestIp: string
  userAgent: string
  createdAt: string
}

export interface AuditFeedResult {
  available: boolean
  entries: AuditLogEntry[]
  error: string
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function category(value: unknown): AuditCategory {
  const normalized = text(value)
  return normalized === 'data_change' || normalized === 'user_admin' || normalized === 'security' || normalized === 'system' || normalized === 'integration'
    ? normalized
    : 'unknown'
}

function status(value: unknown): AuditStatus {
  const normalized = text(value)
  return normalized === 'error' || normalized === 'warning' ? normalized : 'success'
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function mapAppRow(row: Record<string, unknown>): AuditLogEntry {
  const version = Number(row.snapshot_version)
  return {
    id: text(row.id),
    organizationId: text(row.organization_id),
    actorId: text(row.actor_id),
    actorName: text(row.actor_name),
    actorEmail: text(row.actor_email),
    category: category(row.category),
    action: text(row.action),
    module: text(row.module),
    scope: text(row.scope),
    entityType: text(row.entity_type),
    entityId: text(row.entity_id),
    entityLabel: text(row.entity_label),
    summary: text(row.summary),
    details: objectValue(row.details),
    status: status(row.status),
    source: text(row.source),
    snapshotVersion: Number.isFinite(version) && version > 0 ? version : null,
    requestIp: text(row.request_ip),
    userAgent: text(row.user_agent),
    createdAt: text(row.created_at),
  }
}

function mapUserAudit(entry: UserAuditEntry): AuditLogEntry {
  return {
    id: `user-${entry.id}`,
    organizationId: '',
    actorId: entry.actorId,
    actorName: entry.actorName,
    actorEmail: '',
    category: 'user_admin',
    action: 'user.admin',
    module: 'users',
    scope: 'admin',
    entityType: 'user',
    entityId: entry.targetUserId,
    entityLabel: entry.targetUserName,
    summary: entry.action,
    details: { detail: entry.detail, legacyAudit: true },
    status: 'success',
    source: 'user_admin_audit',
    snapshotVersion: null,
    requestIp: '',
    userAgent: '',
    createdAt: entry.createdAt,
  }
}

function missingAuditSchema(error: unknown): boolean {
  const raw = error && typeof error === 'object' ? error as Record<string, unknown> : {}
  const message = `${text(raw.message)} ${text(raw.details)} ${text(raw.hint)} ${text(raw.code)}`.toLowerCase()
  return message.includes('app_audit_log')
    || message.includes('schema cache')
    || message.includes('could not find the table')
    || message.includes('relation') && message.includes('does not exist')
    || message.includes('pgrst205')
}

export async function loadAuditFeed(limit = 800): Promise<AuditFeedResult> {
  if (!supabase) return { available: false, entries: [], error: 'Supabase nie je nakonfigurovaný.' }

  const appResult = await supabase
    .from('app_audit_log')
    .select('id, organization_id, actor_id, actor_name, actor_email, category, action, module, scope, entity_type, entity_id, entity_label, summary, details, status, source, snapshot_version, request_ip, user_agent, created_at')
    .order('created_at', { ascending: false })
    .limit(Math.max(50, Math.min(limit, 2000)))

  if (appResult.error && !missingAuditSchema(appResult.error)) throw appResult.error

  let legacy: UserAuditEntry[] = []
  try {
    legacy = await listUserAudit(500)
  } catch {
    // Staršie inštalácie nemusia mať user_admin_audit; hlavný audit zostane použiteľný.
  }

  const appEntries = appResult.error ? [] : (appResult.data ?? []).map((row) => mapAppRow(row as Record<string, unknown>))
  const entries = [...appEntries, ...legacy.map(mapUserAudit)]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))

  if (appResult.error) {
    return {
      available: false,
      entries,
      error: 'Databázová vrstva Log management ešte nie je nainštalovaná. Spustite SQL migráciu v0.34.0.',
    }
  }

  return { available: true, entries, error: '' }
}

export async function writeAppAudit(input: {
  category?: AuditCategory
  action: string
  module: string
  scope?: string
  entityType?: string
  entityId?: string
  entityLabel?: string
  summary: string
  details?: Record<string, unknown>
  status?: AuditStatus
  source?: string
  snapshotVersion?: number | null
}): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('log_app_event', {
    p_category: input.category ?? 'system',
    p_action: input.action,
    p_module: input.module,
    p_scope: input.scope ?? '',
    p_entity_type: input.entityType ?? '',
    p_entity_id: input.entityId ?? '',
    p_entity_label: input.entityLabel ?? '',
    p_summary: input.summary,
    p_details: input.details ?? {},
    p_status: input.status ?? 'success',
    p_source: input.source ?? 'application',
    p_snapshot_version: input.snapshotVersion ?? null,
  })
  if (error && !missingAuditSchema(error)) console.warn('Auditná udalosť sa nepodarila uložiť:', error.message)
}

export function auditModuleLabel(module: string): string {
  const labels: Record<string, string> = {
    snapshot: 'Aplikačný snapshot',
    employees: 'Ľudia',
    raci: 'RACI',
    services: 'Služby a systémy',
    substitutions: 'Zastupiteľnosť',
    capacity: 'Kapacity',
    risks: 'Riziká',
    decisions: 'Rozhodnutia',
    changes: 'Change management',
    problems: 'Problem management',
    actions: 'Finančné akcie',
    architectureOverrides: 'Architektúra služieb',
    supplierRecords: 'Dodávatelia',
    supplierRelationships: 'Väzby dodávateľov',
    contractRecords: 'Zmluvy a SLA',
    cmdbItems: 'Asset management',
    cmdbRelationships: 'Väzby assetov',
    projects: 'Projekty',
    tasks: 'Úlohy',
    tickets: 'Helpdesk tickety',
    supportQueues: 'Helpdesk fronty',
    slaPolicies: 'Helpdesk SLA politiky',
    accessRequests: 'IAM požiadavky',
    accessCatalog: 'IAM katalóg',
    recertificationCampaigns: 'IAM recertifikácie',
    website_registry: 'Webový register',
    information_system_registry: 'Register IS',
    users: 'Používatelia a IAM',
    authentication: 'Prihlásenie a bezpečnosť',
    work_projects: 'Projekty',
    work_tasks: 'Úlohy',
    service_tickets: 'Helpdesk tickety',
    service_queues: 'Helpdesk fronty',
    service_sla_policies: 'Helpdesk SLA politiky',
    iam_catalog_items: 'IAM katalóg',
    iam_requests: 'IAM požiadavky',
    iam_recert_campaigns: 'IAM recertifikácie',
  }
  return labels[module] ?? (module || 'Systém')
}

export function auditCategoryLabel(value: AuditCategory): string {
  if (value === 'data_change') return 'Zmena dát'
  if (value === 'user_admin') return 'Správa používateľov'
  if (value === 'security') return 'Bezpečnosť'
  if (value === 'integration') return 'Integrácia'
  if (value === 'system') return 'Systém'
  return 'Nezaradené'
}

export function auditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'snapshot.create': 'Prvý snapshot',
    'snapshot.update': 'Uložená zmena',
    'snapshot.history': 'Historický snapshot',
    'row.insert': 'Vytvorený záznam',
    'row.update': 'Upravený záznam',
    'row.delete': 'Odstránený záznam',
    'auth.login': 'Prihlásenie',
    'auth.logout': 'Odhlásenie',
    'auth.password_change': 'Zmena hesla',
    'user.admin': 'Administrácia účtu',
  }
  return labels[action] ?? action
}
