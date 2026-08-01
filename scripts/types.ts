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
}

export interface Task {
  id: string
  title: string
  projectId: string
  owner: string
  priority: string
  status: string
  due: string
  description: string
  source: string
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
}
