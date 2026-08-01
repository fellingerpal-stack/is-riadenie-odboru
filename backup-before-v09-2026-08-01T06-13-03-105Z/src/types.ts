export type RaciCode = '' | 'R' | 'A' | 'C' | 'I' | 'R/A'
export type AppRole = 'admin' | 'manager' | 'viewer'

export interface Meta {
  version: string
  organization: string
  unit: string
  sourceDate: string
  source: string
}

export interface Employee {
  id: string
  name: string
  position: string
  roleType: string
  responsibilities: string
  systems: string
  decides: string
  needsApproval: string
  outputs: string
  manager: string
  deputy: string
  capacity: string | number
  documentation: string
  status: string
  note: string
}

export interface RaciItem {
  id: string
  area: string
  process: string
  output: string
  criticality: string
  assignments: Record<string, RaciCode | string>
  note: string
}

export interface Service {
  id: string
  name: string
  category: string
  criticality: string
  businessOwner: string
  technicalOwner: string
  primary: string
  deputy: string
  rto: string
  runbook: string
  repository: string
  monitoring: string
  backup: string
  securityOwner: string
  supplierSla: string
  readiness: string
  note: string
}

export interface Substitution {
  id: string
  agenda: string
  owner: string
  currentState: string
  proposedDeputy: string
  confirmedDeputy: string
  scope: string
  runbook: string
  location: string
  handoverDue: string
  testDate: string
  testResult: string
  status: string
  note: string
}

export interface CapacityRow {
  employee: string
  management: number
  operations: number
  projects: number
  helpdesk: number
  other: number
  seasonalPeaks: string
  conflict: string
  sustainability: string
  status: string
  note: string
}

export interface Risk {
  id: string
  area: string
  risk: string
  trigger: string
  impact: string
  probability: number
  impactScore: number
  priority: string
  owner: string
  measure: string
  due: string
  status: string
  evidence: string
  managementDecision: string
  note: string
}

export interface ActionItem {
  id: string
  horizon: string
  title: string
  expectedOutput: string
  proposedOwner: string
  confirmedOwner: string
  start: string
  due: string
  status: string
  dependency: string
  kpi: string
  directorDecision: string
  note: string
}

export interface Decision {
  id: string
  topic: string
  question: string
  proposal: string
  decisionMaker: string
  due: string
  decision: string
  reason: string
  impact: string
  status: string
  note: string
}

export interface Project {
  id: string
  name: string
  type: string
  owner: string
  sponsor: string
  status: string
  priority: string
  progress: number
  start: string
  due: string
  description: string
  note?: string
  updatedAt?: string
}

export interface Task {
  id: string
  title: string
  projectId: string
  owner: string
  priority: string
  status: string
  start?: string
  due: string
  description: string
  source: string
  type?: string
  estimateHours?: number
  spentHours?: number
  progress?: number
  dependency?: string
  note?: string
  createdAt?: string
  updatedAt?: string
}


export interface TicketAttachment {
  id: string
  name: string
  type: string
  size: number
  dataUrl?: string
  uploadedBy: string
  createdAt: string
}

export interface SupportQueue {
  id: string
  name: string
  description: string
  members: string[]
  email: string
  isActive: boolean
}

export interface SlaPolicy {
  id: string
  name: string
  priority: string
  firstResponseHours: number
  resolutionHours: number
  isActive: boolean
}

export interface TicketComment {
  id: string
  author: string
  text: string
  internal: boolean
  createdAt: string
}

export interface TicketHistory {
  id: string
  action: string
  author: string
  createdAt: string
}

export interface Ticket {
  id: string
  type: string
  title: string
  description: string
  requester: string
  requesterEmail: string
  serviceId: string
  category: string
  subcategory: string
  queueId: string
  priority: string
  impact: string
  urgency: string
  status: string
  assignee: string
  channel: string
  createdAt: string
  updatedAt: string
  due: string
  firstResponseDueAt?: string
  resolutionDueAt?: string
  firstRespondedAt?: string
  resolvedAt?: string
  linkedTaskId?: string
  resolution?: string
  internalNote?: string
  comments: TicketComment[]
  history: TicketHistory[]
  attachments: TicketAttachment[]
}


export interface ChangeApproval {
  id: string
  role: string
  approver: string
  decision: string
  note: string
  decidedAt: string
}

export interface ChangeHistory {
  id: string
  action: string
  author: string
  createdAt: string
}

export interface ChangeRequest {
  id: string
  title: string
  description: string
  type: string
  category: string
  serviceId: string
  requester: string
  owner: string
  approver: string
  priority: string
  risk: string
  impact: string
  status: string
  reason: string
  plannedStart: string
  plannedEnd: string
  outageMinutes: number
  implementationPlan: string
  testPlan: string
  rollbackPlan: string
  communicationPlan: string
  affectedSystems: string
  linkedTicketIds: string[]
  linkedProjectId: string
  linkedTaskId: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  validationResult: string
  approvals: ChangeApproval[]
  history: ChangeHistory[]
}


export interface ProblemAction {
  id: string
  title: string
  owner: string
  due: string
  status: string
  linkedTaskId: string
}

export interface ProblemComment {
  id: string
  author: string
  text: string
  internal: boolean
  createdAt: string
}

export interface ProblemHistory {
  id: string
  action: string
  author: string
  createdAt: string
}

export interface ProblemRecord {
  id: string
  title: string
  description: string
  serviceId: string
  owner: string
  team: string
  priority: string
  impact: string
  status: string
  symptom: string
  recurringPattern: string
  rootCause: string
  rootCauseMethod: string
  whyAnalysis: string[]
  workaround: string
  permanentSolution: string
  knownError: boolean
  knownErrorSummary: string
  linkedTicketIds: string[]
  linkedChangeIds: string[]
  linkedProjectId: string
  linkedTaskIds: string[]
  actions: ProblemAction[]
  comments: ProblemComment[]
  history: ProblemHistory[]
  createdAt: string
  updatedAt: string
  targetDate: string
  resolvedAt?: string
}


export interface AccessApproval {
  id: string
  stage: string
  approver: string
  decision: string
  note: string
  decidedAt: string
}

export interface AccessComment {
  id: string
  author: string
  text: string
  internal: boolean
  createdAt: string
}

export interface AccessHistory {
  id: string
  action: string
  author: string
  createdAt: string
}

export interface AccessRequest {
  id: string
  requestType: string
  subjectName: string
  subjectEmail: string
  department: string
  manager: string
  requester: string
  serviceId: string
  catalogItemId: string
  requestedAccess: string
  currentAccess: string
  businessJustification: string
  privileged: boolean
  risk: string
  status: string
  startDate: string
  endDate: string
  dueDate: string
  assignee: string
  linkedTaskId: string
  approvals: AccessApproval[]
  comments: AccessComment[]
  history: AccessHistory[]
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface AccessCatalogItem {
  id: string
  name: string
  serviceId: string
  system: string
  description: string
  businessOwner: string
  technicalOwner: string
  risk: string
  privileged: boolean
  defaultDurationDays: number
  approvalPath: string[]
  isActive: boolean
}

export interface RecertificationItem {
  id: string
  subjectName: string
  subjectEmail: string
  catalogItemId: string
  accessName: string
  reviewer: string
  decision: string
  decisionNote: string
  dueDate: string
  lastUsedAt: string
  privileged: boolean
}

export interface RecertificationCampaign {
  id: string
  name: string
  description: string
  owner: string
  scope: string
  status: string
  startDate: string
  dueDate: string
  items: RecertificationItem[]
  createdAt: string
  updatedAt: string
}



export interface CmdbItem {
  id: string
  name: string
  type: string
  category: string
  status: string
  criticality: string
  serviceId: string
  businessOwner: string
  technicalOwner: string
  custodian: string
  environment: string
  location: string
  supplier: string
  version: string
  hostname: string
  ipAddress: string
  serialNumber: string
  assetTag: string
  purchaseDate: string
  warrantyEnd: string
  licenseEnd: string
  contractEnd: string
  supportEnd: string
  cost: number
  dataClassification: string
  monitoring: string
  backup: string
  documentation: string
  lifecycle: string
  linkedTicketIds: string[]
  linkedChangeIds: string[]
  note: string
  updatedAt: string
}

export interface CmdbRelationship {
  id: string
  sourceId: string
  targetId: string
  type: string
  criticality: string
  note: string
}

export interface AppState {
  meta: Meta
  employees: Employee[]
  raci: RaciItem[]
  services: Service[]
  substitutions: Substitution[]
  capacity: CapacityRow[]
  risks: Risk[]
  actions: ActionItem[]
  decisions: Decision[]
  projects: Project[]
  tasks: Task[]
  tickets: Ticket[]
  supportQueues: SupportQueue[]
  slaPolicies: SlaPolicy[]
  changes: ChangeRequest[]
  problems: ProblemRecord[]
  accessRequests: AccessRequest[]
  accessCatalog: AccessCatalogItem[]
  recertificationCampaigns: RecertificationCampaign[]
  cmdbItems: CmdbItem[]
  cmdbRelationships: CmdbRelationship[]
}

export interface UserProfile {
  id: string
  organizationId: string
  fullName: string
  email: string
  role: AppRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CloudSnapshot {
  id: string
  version: number
  payload: AppState
  createdAt: string
  createdBy: string | null
}

export type SyncState = 'local' | 'loading' | 'synced' | 'dirty' | 'saving' | 'error' | 'empty'
