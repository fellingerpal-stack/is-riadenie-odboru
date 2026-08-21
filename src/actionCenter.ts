import type { AppState } from '../types'

export type ActionCenterPriority = 'critical' | 'high' | 'medium' | 'info'

export interface ActionCenterItem {
  id: string
  source: string
  sourceId: string
  title: string
  detail: string
  priority: ActionCenterPriority
  owner: string
  due: string
  status: string
  view: string
  reason: string
}

type GenericRecord = Record<string, unknown>

type SourceRule = {
  key: string
  source: string
  view: string
  title: string[]
  detail: string[]
  owner: string[]
  due: string[]
  status: string[]
  priority: string[]
  id: string[]
}

const SOURCE_RULES: SourceRule[] = [
  { key: 'actions', source: 'Riadiace opatrenia', view: 'dashboard', title: ['title'], detail: ['expectedOutput', 'directorDecision', 'note'], owner: ['confirmedOwner', 'proposedOwner', 'owner'], due: ['due'], status: ['status'], priority: ['priority'], id: ['id'] },
  { key: 'risks', source: 'Riziká', view: 'risks', title: ['risk', 'title'], detail: ['impact', 'measure', 'managementDecision'], owner: ['owner'], due: ['due'], status: ['status'], priority: ['priority'], id: ['id'] },
  { key: 'decisions', source: 'Rozhodnutia', view: 'decisions', title: ['question', 'topic'], detail: ['proposal', 'impact', 'reason'], owner: ['decisionMaker', 'owner'], due: ['due'], status: ['status'], priority: ['priority'], id: ['id'] },
  { key: 'tasks', source: 'Projekty a úlohy', view: 'work', title: ['title'], detail: ['description'], owner: ['owner', 'assignee'], due: ['due'], status: ['status'], priority: ['priority'], id: ['id'] },
  { key: 'tickets', source: 'Helpdesk', view: 'helpdesk', title: ['title'], detail: ['description', 'internalNote'], owner: ['assignee', 'owner'], due: ['resolutionDueAt', 'due', 'firstResponseDueAt'], status: ['status'], priority: ['priority', 'urgency', 'impact'], id: ['id'] },
  { key: 'changes', source: 'Change management', view: 'changes', title: ['title'], detail: ['reason', 'description'], owner: ['owner', 'requester'], due: ['plannedStart', 'plannedEnd'], status: ['status'], priority: ['risk', 'priority'], id: ['id'] },
  { key: 'problems', source: 'Problem management', view: 'problems', title: ['title'], detail: ['symptom', 'permanentSolution', 'description'], owner: ['owner'], due: ['targetDate'], status: ['status'], priority: ['priority', 'impact'], id: ['id'] },
  { key: 'accessRequests', source: 'IAM / Prístupy', view: 'iam', title: ['requestedAccess', 'requestType'], detail: ['businessJustification', 'subjectName'], owner: ['assignee', 'manager'], due: ['dueDate', 'endDate'], status: ['status'], priority: ['risk'], id: ['id'] },
  { key: 'cmdbItems', source: 'Asset management', view: 'cmdb', title: ['name'], detail: ['note', 'documentation'], owner: ['technicalOwner', 'businessOwner', 'assignedTo', 'custodian'], due: ['contractEnd', 'supportEnd', 'warrantyEnd', 'licenseEnd'], status: ['inventoryStatus', 'lifecycle', 'status'], priority: ['criticality'], id: ['id'] },
  { key: 'supplierRelationships', source: 'Dodávatelia', view: 'suppliers', title: ['supplierName', 'targetName'], detail: ['role', 'evidence', 'note'], owner: ['updatedBy'], due: ['validTo'], status: ['status'], priority: ['confidence'], id: ['id'] },
  { key: 'contractRecords', source: 'Zmluvy a SLA', view: 'contracts', title: ['name', 'title', 'contractNumber'], detail: ['note', 'supplierName', 'serviceName'], owner: ['contractManager', 'serviceOwner', 'owner'], due: ['validTo', 'endDate', 'renewalDate'], status: ['status'], priority: ['criticality', 'risk'], id: ['id'] },
]

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function first(record: GenericRecord, keys: string[]): string {
  for (const key of keys) {
    const value = text(record[key])
    if (value) return value
  }
  return ''
}

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function isClosed(status: string): boolean {
  const value = normalized(status)
  return [
    'hotovo', 'ukoncene', 'ukoncena', 'uzatvorene', 'uzatvorena', 'vyriesene', 'vyrieseny',
    'schvalene', 'dokoncena', 'dokoncene', 'zamietnute', 'zamietnuta', 'zrusene', 'zrusena',
    'rollback', 'potvrdene', 'archivovane', 'closed', 'done', 'completed', 'resolved',
  ].some(token => value.includes(token))
}

function basePriority(...values: string[]): ActionCenterPriority {
  const value = normalized(values.filter(Boolean).join(' '))
  if (/krit|critical|urgent|vysoke riziko|high risk/.test(value)) return 'critical'
  if (/vysok|high|major/.test(value)) return 'high'
  if (/stred|medium|warning|upozor/.test(value)) return 'medium'
  return 'info'
}

function dueDate(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(value.length <= 10 ? `${value}T23:59:59` : value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function daysUntil(value: string, now: Date): number | null {
  const parsed = dueDate(value)
  if (!parsed) return null
  return Math.ceil((parsed.getTime() - now.getTime()) / 86_400_000)
}

function priorityWithDue(priority: ActionCenterPriority, due: string, now: Date): ActionCenterPriority {
  const days = daysUntil(due, now)
  if (days == null) return priority
  if (days < 0) return 'critical'
  if (days <= 7 && priority === 'info') return 'high'
  if (days <= 14 && priority === 'info') return 'medium'
  return priority
}

function shouldInclude(rule: SourceRule, record: GenericRecord, status: string): boolean {
  if (isClosed(status)) return false
  if (rule.key === 'cmdbItems') {
    const missingOwner = !first(record, ['businessOwner', 'technicalOwner', 'assignedTo'])
    const lifecycle = normalized(first(record, ['lifecycle']))
    const inventory = normalized(first(record, ['inventoryStatus']))
    const criticality = normalized(first(record, ['criticality']))
    return missingOwner || /na obnovu|nenajdene|nezhoda/.test(`${lifecycle} ${inventory}`) || criticality.includes('krit')
  }
  if (rule.key === 'supplierRelationships') {
    return !/potvrdene|zamietnute/.test(normalized(status))
  }
  if (rule.key === 'contractRecords') {
    const due = first(record, rule.due)
    const manager = first(record, rule.owner)
    return Boolean(due || !manager || status)
  }
  return true
}

function reasonFor(rule: SourceRule, record: GenericRecord, owner: string, due: string, status: string, now: Date): string {
  const days = daysUntil(due, now)
  if (days != null && days < 0) return `Termín prekročený o ${Math.abs(days)} d.`
  if (days != null && days === 0) return 'Termín je dnes.'
  if (days != null && days <= 7) return `Termín do ${days} d.`
  if (!owner) return 'Chýba potvrdený vlastník / riešiteľ.'
  if (rule.key === 'cmdbItems') {
    const lifecycle = first(record, ['lifecycle'])
    const inventory = first(record, ['inventoryStatus'])
    if (lifecycle || inventory) return [lifecycle, inventory].filter(Boolean).join(' · ')
  }
  if (status) return `Stav: ${status}`
  return 'Otvorený riadiaci signál.'
}

function sourceItems(state: AppState, now: Date): ActionCenterItem[] {
  const root = state as unknown as GenericRecord
  const items: ActionCenterItem[] = []

  for (const rule of SOURCE_RULES) {
    const records = Array.isArray(root[rule.key]) ? root[rule.key] as GenericRecord[] : []
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index] ?? {}
      const status = first(record, rule.status)
      if (!shouldInclude(rule, record, status)) continue
      const owner = first(record, rule.owner)
      const due = first(record, rule.due)
      const rawPriority = basePriority(first(record, rule.priority), first(record, ['criticality']), first(record, ['risk']), first(record, ['impact']))
      const priority = priorityWithDue(rawPriority, due, now)
      const sourceId = first(record, rule.id) || `${rule.key}-${index + 1}`
      const financialAction = rule.key === 'actions' && normalized(first(record, ['note'])).includes('fin25')
      const source = financialAction ? 'Financial Actions' : rule.source
      const view = financialAction ? 'itCosts' : rule.view
      const title = first(record, rule.title) || `${source} · ${sourceId}`
      const detail = first(record, rule.detail)
      items.push({
        id: `${rule.key}:${sourceId}`,
        source,
        sourceId,
        title,
        detail,
        priority,
        owner,
        due,
        status: status || 'Otvorené',
        view,
        reason: reasonFor(rule, record, owner, due, status, now),
      })
    }
  }

  return items
}

const PRIORITY_SCORE: Record<ActionCenterPriority, number> = { critical: 4, high: 3, medium: 2, info: 1 }

export function buildActionCenter(state: AppState, now = new Date()): ActionCenterItem[] {
  return sourceItems(state, now).sort((a, b) => {
    const priority = PRIORITY_SCORE[b.priority] - PRIORITY_SCORE[a.priority]
    if (priority) return priority
    const aDue = dueDate(a.due)?.getTime() ?? Number.POSITIVE_INFINITY
    const bDue = dueDate(b.due)?.getTime() ?? Number.POSITIVE_INFINITY
    if (aDue !== bDue) return aDue - bDue
    return a.source.localeCompare(b.source, 'sk') || a.title.localeCompare(b.title, 'sk')
  })
}

export function countManagementActions(state: AppState): number {
  return buildActionCenter(state).filter(item => item.priority === 'critical' || item.priority === 'high').length
}

export function actionCenterDaysUntil(value: string, now = new Date()): number | null {
  return daysUntil(value, now)
}
