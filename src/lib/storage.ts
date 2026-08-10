import seed from '../data/seed.json'
import type { AccessApproval, AccessCatalogItem, AccessRequest, AppState, ChangeApproval, ContractRecord, CmdbItem, CmdbRelationship, ChangeRequest, ProblemAction, ProblemRecord, Project, RecertificationCampaign, RecertificationItem, ServiceArchitectureRecord, SlaPolicy, SupplierRecord, SupplierRelationship, Task, Ticket } from '../types'

const STORAGE_KEY = 'cvti-is-riadenie-odboru-v01'
const ROLE_KEY = 'cvti-is-riadenie-role'
const CURRENT_VERSION = '0.34.0'

export function cloneSeed(): AppState {
  return structuredClone(seed) as unknown as AppState
}

function migrateTask(task: Task): Task {
  return {
    type: 'Úloha',
    start: '',
    estimateHours: 0,
    spentHours: 0,
    progress: task.status === 'Hotovo' ? 100 : 0,
    dependency: '',
    note: '',
    ...task,
  }
}

function migrateProject(project: Project): Project {
  return {
    note: '',
    ...project,
  }
}

function addHours(value: string, hours: number): string {
  const base = new Date(value)
  const safe = Number.isNaN(base.getTime()) ? new Date() : base
  safe.setTime(safe.getTime() + hours * 60 * 60 * 1000)
  return safe.toISOString()
}

function policyFor(priority: string, policies: SlaPolicy[]): SlaPolicy {
  return policies.find((policy) => policy.isActive && policy.priority === priority)
    ?? policies.find((policy) => policy.priority === 'Stredná')
    ?? { id: 'SLA00', name: 'Predvolené SLA', priority: 'Stredná', firstResponseHours: 8, resolutionHours: 40, isActive: true }
}

function migrateTicket(ticket: Ticket, policies: SlaPolicy[]): Ticket {
  const source = (ticket ?? {}) as Partial<Ticket>
  const createdAt = typeof source.createdAt === 'string' && source.createdAt
    ? source.createdAt
    : new Date().toISOString()
  const updatedAt = typeof source.updatedAt === 'string' && source.updatedAt
    ? source.updatedAt
    : createdAt
  const priority = typeof source.priority === 'string' && source.priority
    ? source.priority
    : 'Stredná'
  const policy = policyFor(priority, policies)

  return {
    id: typeof source.id === 'string' ? source.id : '',
    type: typeof source.type === 'string' ? source.type : 'Požiadavka',
    title: typeof source.title === 'string' ? source.title : 'Bez názvu',
    description: typeof source.description === 'string' ? source.description : '',
    requester: typeof source.requester === 'string' ? source.requester : '',
    requesterEmail: typeof source.requesterEmail === 'string' ? source.requesterEmail : '',
    serviceId: typeof source.serviceId === 'string' ? source.serviceId : '',
    category: typeof source.category === 'string' ? source.category : 'Ostatné',
    subcategory: typeof source.subcategory === 'string' ? source.subcategory : 'Iné',
    queueId: typeof source.queueId === 'string' ? source.queueId : '',
    priority,
    impact: typeof source.impact === 'string' ? source.impact : 'Stredný',
    urgency: typeof source.urgency === 'string' ? source.urgency : 'Stredná',
    status: typeof source.status === 'string' ? source.status : 'Nová',
    assignee: typeof source.assignee === 'string' ? source.assignee : '',
    channel: typeof source.channel === 'string' ? source.channel : 'Formulár',
    createdAt,
    updatedAt,
    due: typeof source.due === 'string' ? source.due : '',
    firstResponseDueAt: typeof source.firstResponseDueAt === 'string' && source.firstResponseDueAt
      ? source.firstResponseDueAt
      : addHours(createdAt, policy.firstResponseHours),
    resolutionDueAt: typeof source.resolutionDueAt === 'string' && source.resolutionDueAt
      ? source.resolutionDueAt
      : addHours(createdAt, policy.resolutionHours),
    firstRespondedAt: typeof source.firstRespondedAt === 'string' ? source.firstRespondedAt : undefined,
    resolvedAt: typeof source.resolvedAt === 'string' ? source.resolvedAt : undefined,
    linkedTaskId: typeof source.linkedTaskId === 'string' ? source.linkedTaskId : '',
    resolution: typeof source.resolution === 'string' ? source.resolution : '',
    internalNote: typeof source.internalNote === 'string' ? source.internalNote : '',
    comments: Array.isArray(source.comments) ? source.comments : [],
    history: Array.isArray(source.history) ? source.history : [],
    attachments: Array.isArray(source.attachments) ? source.attachments : [],
  }
}


function migrateApproval(approval: ChangeApproval, role: string): ChangeApproval {
  const source = (approval ?? {}) as Partial<ChangeApproval>
  return {
    id: typeof source.id === 'string' && source.id ? source.id : crypto.randomUUID(),
    role: typeof source.role === 'string' && source.role ? source.role : role,
    approver: typeof source.approver === 'string' ? source.approver : '',
    decision: typeof source.decision === 'string' && source.decision ? source.decision : 'Čaká',
    note: typeof source.note === 'string' ? source.note : '',
    decidedAt: typeof source.decidedAt === 'string' ? source.decidedAt : '',
  }
}

function migrateChange(change: ChangeRequest): ChangeRequest {
  const source = (change ?? {}) as Partial<ChangeRequest>
  const createdAt = typeof source.createdAt === 'string' && source.createdAt ? source.createdAt : new Date().toISOString()
  const approvals = Array.isArray(source.approvals) && source.approvals.length
    ? source.approvals.map((approval, index) => migrateApproval(approval, ['Vecný vlastník', 'Technický vlastník', 'Bezpečnosť / prevádzka'][index] ?? 'Schvaľovateľ'))
    : [migrateApproval({} as ChangeApproval, 'Vecný vlastník'), migrateApproval({} as ChangeApproval, 'Technický vlastník'), migrateApproval({} as ChangeApproval, 'Bezpečnosť / prevádzka')]
  return {
    id: typeof source.id === 'string' ? source.id : '',
    title: typeof source.title === 'string' ? source.title : 'Bez názvu',
    description: typeof source.description === 'string' ? source.description : '',
    type: typeof source.type === 'string' && source.type ? source.type : 'Normálna',
    category: typeof source.category === 'string' && source.category ? source.category : 'Iné',
    serviceId: typeof source.serviceId === 'string' ? source.serviceId : '',
    requester: typeof source.requester === 'string' ? source.requester : '',
    owner: typeof source.owner === 'string' ? source.owner : '',
    approver: typeof source.approver === 'string' ? source.approver : '',
    priority: typeof source.priority === 'string' && source.priority ? source.priority : 'Stredná',
    risk: typeof source.risk === 'string' && source.risk ? source.risk : 'Stredné',
    impact: typeof source.impact === 'string' && source.impact ? source.impact : 'Jeden útvar',
    status: typeof source.status === 'string' && source.status ? source.status : 'Návrh',
    reason: typeof source.reason === 'string' ? source.reason : '',
    plannedStart: typeof source.plannedStart === 'string' ? source.plannedStart : '',
    plannedEnd: typeof source.plannedEnd === 'string' ? source.plannedEnd : '',
    outageMinutes: typeof source.outageMinutes === 'number' && Number.isFinite(source.outageMinutes) ? source.outageMinutes : 0,
    implementationPlan: typeof source.implementationPlan === 'string' ? source.implementationPlan : '',
    testPlan: typeof source.testPlan === 'string' ? source.testPlan : '',
    rollbackPlan: typeof source.rollbackPlan === 'string' ? source.rollbackPlan : '',
    communicationPlan: typeof source.communicationPlan === 'string' ? source.communicationPlan : '',
    affectedSystems: typeof source.affectedSystems === 'string' ? source.affectedSystems : '',
    linkedTicketIds: Array.isArray(source.linkedTicketIds) ? source.linkedTicketIds : [],
    linkedProjectId: typeof source.linkedProjectId === 'string' ? source.linkedProjectId : '',
    linkedTaskId: typeof source.linkedTaskId === 'string' ? source.linkedTaskId : '',
    createdAt,
    updatedAt: typeof source.updatedAt === 'string' && source.updatedAt ? source.updatedAt : createdAt,
    completedAt: typeof source.completedAt === 'string' ? source.completedAt : '',
    validationResult: typeof source.validationResult === 'string' ? source.validationResult : '',
    approvals,
    history: Array.isArray(source.history) ? source.history : [],
  }
}


function migrateProblemAction(action: ProblemAction): ProblemAction {
  const source = (action ?? {}) as Partial<ProblemAction>
  return {
    id: typeof source.id === 'string' && source.id ? source.id : crypto.randomUUID(),
    title: typeof source.title === 'string' ? source.title : '',
    owner: typeof source.owner === 'string' ? source.owner : '',
    due: typeof source.due === 'string' ? source.due : '',
    status: typeof source.status === 'string' && source.status ? source.status : 'Návrh',
    linkedTaskId: typeof source.linkedTaskId === 'string' ? source.linkedTaskId : '',
  }
}

function migrateProblem(problem: ProblemRecord): ProblemRecord {
  const source = (problem ?? {}) as Partial<ProblemRecord>
  const createdAt = typeof source.createdAt === 'string' && source.createdAt ? source.createdAt : new Date().toISOString()
  const whySource = Array.isArray(source.whyAnalysis) ? source.whyAnalysis.slice(0, 5) : []
  while (whySource.length < 5) whySource.push('')
  return {
    id: typeof source.id === 'string' ? source.id : '',
    title: typeof source.title === 'string' ? source.title : 'Bez názvu',
    description: typeof source.description === 'string' ? source.description : '',
    serviceId: typeof source.serviceId === 'string' ? source.serviceId : '',
    owner: typeof source.owner === 'string' ? source.owner : '',
    team: typeof source.team === 'string' ? source.team : '',
    priority: typeof source.priority === 'string' && source.priority ? source.priority : 'Stredná',
    impact: typeof source.impact === 'string' && source.impact ? source.impact : 'Jeden útvar',
    status: typeof source.status === 'string' && source.status ? source.status : 'Nový',
    symptom: typeof source.symptom === 'string' ? source.symptom : '',
    recurringPattern: typeof source.recurringPattern === 'string' ? source.recurringPattern : '',
    rootCause: typeof source.rootCause === 'string' ? source.rootCause : '',
    rootCauseMethod: typeof source.rootCauseMethod === 'string' && source.rootCauseMethod ? source.rootCauseMethod : '5× prečo',
    whyAnalysis: whySource,
    workaround: typeof source.workaround === 'string' ? source.workaround : '',
    permanentSolution: typeof source.permanentSolution === 'string' ? source.permanentSolution : '',
    knownError: Boolean(source.knownError) || source.status === 'Známa chyba',
    knownErrorSummary: typeof source.knownErrorSummary === 'string' ? source.knownErrorSummary : '',
    linkedTicketIds: Array.isArray(source.linkedTicketIds) ? source.linkedTicketIds : [],
    linkedChangeIds: Array.isArray(source.linkedChangeIds) ? source.linkedChangeIds : [],
    linkedProjectId: typeof source.linkedProjectId === 'string' ? source.linkedProjectId : '',
    linkedTaskIds: Array.isArray(source.linkedTaskIds) ? source.linkedTaskIds : [],
    actions: Array.isArray(source.actions) ? source.actions.map(migrateProblemAction) : [],
    comments: Array.isArray(source.comments) ? source.comments : [],
    history: Array.isArray(source.history) ? source.history : [],
    createdAt,
    updatedAt: typeof source.updatedAt === 'string' && source.updatedAt ? source.updatedAt : createdAt,
    targetDate: typeof source.targetDate === 'string' ? source.targetDate : '',
    resolvedAt: typeof source.resolvedAt === 'string' ? source.resolvedAt : '',
  }
}


function migrateAccessApproval(approval: AccessApproval, stage: string): AccessApproval {
  const source = (approval ?? {}) as Partial<AccessApproval>
  return {
    id: typeof source.id === 'string' && source.id ? source.id : crypto.randomUUID(),
    stage: typeof source.stage === 'string' && source.stage ? source.stage : stage,
    approver: typeof source.approver === 'string' ? source.approver : '',
    decision: typeof source.decision === 'string' && source.decision ? source.decision : 'Čaká',
    note: typeof source.note === 'string' ? source.note : '',
    decidedAt: typeof source.decidedAt === 'string' ? source.decidedAt : '',
  }
}

function migrateAccessRequest(request: AccessRequest): AccessRequest {
  const source = (request ?? {}) as Partial<AccessRequest>
  const createdAt = typeof source.createdAt === 'string' && source.createdAt ? source.createdAt : new Date().toISOString()
  return {
    id: typeof source.id === 'string' ? source.id : '',
    requestType: typeof source.requestType === 'string' && source.requestType ? source.requestType : 'Nový prístup',
    subjectName: typeof source.subjectName === 'string' ? source.subjectName : '',
    subjectEmail: typeof source.subjectEmail === 'string' ? source.subjectEmail : '',
    department: typeof source.department === 'string' ? source.department : '',
    manager: typeof source.manager === 'string' ? source.manager : '',
    requester: typeof source.requester === 'string' ? source.requester : '',
    serviceId: typeof source.serviceId === 'string' ? source.serviceId : '',
    catalogItemId: typeof source.catalogItemId === 'string' ? source.catalogItemId : '',
    requestedAccess: typeof source.requestedAccess === 'string' ? source.requestedAccess : '',
    currentAccess: typeof source.currentAccess === 'string' ? source.currentAccess : '',
    businessJustification: typeof source.businessJustification === 'string' ? source.businessJustification : '',
    privileged: Boolean(source.privileged),
    risk: typeof source.risk === 'string' && source.risk ? source.risk : 'Stredné',
    status: typeof source.status === 'string' && source.status ? source.status : 'Návrh',
    startDate: typeof source.startDate === 'string' ? source.startDate : '',
    endDate: typeof source.endDate === 'string' ? source.endDate : '',
    dueDate: typeof source.dueDate === 'string' ? source.dueDate : '',
    assignee: typeof source.assignee === 'string' ? source.assignee : '',
    linkedTaskId: typeof source.linkedTaskId === 'string' ? source.linkedTaskId : '',
    approvals: Array.isArray(source.approvals) ? source.approvals.map((item, index) => migrateAccessApproval(item, ['Priamy nadriadený', 'Vlastník služby', 'Bezpečnosť / administrátor'][index] ?? 'Schvaľovateľ')) : [],
    comments: Array.isArray(source.comments) ? source.comments : [],
    history: Array.isArray(source.history) ? source.history : [],
    createdAt,
    updatedAt: typeof source.updatedAt === 'string' && source.updatedAt ? source.updatedAt : createdAt,
    completedAt: typeof source.completedAt === 'string' ? source.completedAt : '',
  }
}

function migrateAccessCatalog(item: AccessCatalogItem): AccessCatalogItem {
  const source = (item ?? {}) as Partial<AccessCatalogItem>
  return {
    id: typeof source.id === 'string' ? source.id : '',
    name: typeof source.name === 'string' ? source.name : 'Bez názvu',
    serviceId: typeof source.serviceId === 'string' ? source.serviceId : '',
    system: typeof source.system === 'string' ? source.system : '',
    description: typeof source.description === 'string' ? source.description : '',
    businessOwner: typeof source.businessOwner === 'string' ? source.businessOwner : '',
    technicalOwner: typeof source.technicalOwner === 'string' ? source.technicalOwner : '',
    risk: typeof source.risk === 'string' && source.risk ? source.risk : 'Stredné',
    privileged: Boolean(source.privileged),
    defaultDurationDays: typeof source.defaultDurationDays === 'number' && Number.isFinite(source.defaultDurationDays) ? source.defaultDurationDays : 365,
    approvalPath: Array.isArray(source.approvalPath) ? source.approvalPath : ['Priamy nadriadený', 'Vlastník služby'],
    isActive: source.isActive !== false,
  }
}

function migrateRecertificationItem(item: RecertificationItem): RecertificationItem {
  const source = (item ?? {}) as Partial<RecertificationItem>
  return {
    id: typeof source.id === 'string' && source.id ? source.id : crypto.randomUUID(),
    subjectName: typeof source.subjectName === 'string' ? source.subjectName : '',
    subjectEmail: typeof source.subjectEmail === 'string' ? source.subjectEmail : '',
    catalogItemId: typeof source.catalogItemId === 'string' ? source.catalogItemId : '',
    accessName: typeof source.accessName === 'string' ? source.accessName : '',
    reviewer: typeof source.reviewer === 'string' ? source.reviewer : '',
    decision: typeof source.decision === 'string' && source.decision ? source.decision : 'Čaká',
    decisionNote: typeof source.decisionNote === 'string' ? source.decisionNote : '',
    dueDate: typeof source.dueDate === 'string' ? source.dueDate : '',
    lastUsedAt: typeof source.lastUsedAt === 'string' ? source.lastUsedAt : '',
    privileged: Boolean(source.privileged),
  }
}

function migrateRecertificationCampaign(campaign: RecertificationCampaign): RecertificationCampaign {
  const source = (campaign ?? {}) as Partial<RecertificationCampaign>
  const createdAt = typeof source.createdAt === 'string' && source.createdAt ? source.createdAt : new Date().toISOString()
  return {
    id: typeof source.id === 'string' ? source.id : '',
    name: typeof source.name === 'string' ? source.name : 'Bez názvu',
    description: typeof source.description === 'string' ? source.description : '',
    owner: typeof source.owner === 'string' ? source.owner : '',
    scope: typeof source.scope === 'string' ? source.scope : 'Aktívne prístupy',
    status: typeof source.status === 'string' && source.status ? source.status : 'Návrh',
    startDate: typeof source.startDate === 'string' ? source.startDate : '',
    dueDate: typeof source.dueDate === 'string' ? source.dueDate : '',
    items: Array.isArray(source.items) ? source.items.map(migrateRecertificationItem) : [],
    createdAt,
    updatedAt: typeof source.updatedAt === 'string' && source.updatedAt ? source.updatedAt : createdAt,
  }
}


function migrateCmdbItem(item: Partial<CmdbItem>): CmdbItem {
  const source = (item ?? {}) as Partial<CmdbItem>
  const createdAt = typeof source.createdAt === 'string' && source.createdAt
    ? source.createdAt
    : (typeof source.updatedAt === 'string' && source.updatedAt ? source.updatedAt : new Date().toISOString())
  const scope = source.scope === 'oit' || source.scope === 'oris' || source.scope === 'shared' ? source.scope : 'oris'
  return {
    id: typeof source.id === 'string' ? source.id : '',
    name: typeof source.name === 'string' && source.name ? source.name : 'Bez názvu',
    type: typeof source.type === 'string' && source.type ? source.type : 'Iné',
    assetClass: typeof source.assetClass === 'string' && source.assetClass ? source.assetClass : 'Digitálne aktívum / CI',
    scope,
    category: typeof source.category === 'string' ? source.category : '',
    status: typeof source.status === 'string' && source.status ? source.status : 'V prevádzke',
    criticality: typeof source.criticality === 'string' && source.criticality ? source.criticality : 'Stredná',
    serviceId: typeof source.serviceId === 'string' ? source.serviceId : '',
    businessOwner: typeof source.businessOwner === 'string' ? source.businessOwner : '',
    technicalOwner: typeof source.technicalOwner === 'string' ? source.technicalOwner : '',
    custodian: typeof source.custodian === 'string' ? source.custodian : '',
    assignedTo: typeof source.assignedTo === 'string' ? source.assignedTo : '',
    department: typeof source.department === 'string' ? source.department : '',
    environment: typeof source.environment === 'string' ? source.environment : '',
    location: typeof source.location === 'string' ? source.location : '',
    room: typeof source.room === 'string' ? source.room : '',
    costCenter: typeof source.costCenter === 'string' ? source.costCenter : '',
    supplier: typeof source.supplier === 'string' ? source.supplier : '',
    supplierIco: typeof source.supplierIco === 'string' ? source.supplierIco : '',
    contractRef: typeof source.contractRef === 'string' ? source.contractRef : '',
    contractTask: typeof source.contractTask === 'string' ? source.contractTask : '',
    manufacturer: typeof source.manufacturer === 'string' ? source.manufacturer : '',
    model: typeof source.model === 'string' ? source.model : '',
    version: typeof source.version === 'string' ? source.version : '',
    hostname: typeof source.hostname === 'string' ? source.hostname : '',
    ipAddress: typeof source.ipAddress === 'string' ? source.ipAddress : '',
    macAddress: typeof source.macAddress === 'string' ? source.macAddress : '',
    discoveryDeviceId: typeof source.discoveryDeviceId === 'string' ? source.discoveryDeviceId : '',
    discoveryFirstSeenAt: typeof source.discoveryFirstSeenAt === 'string' ? source.discoveryFirstSeenAt : '',
    discoveryLastSeenAt: typeof source.discoveryLastSeenAt === 'string' ? source.discoveryLastSeenAt : '',
    discoveryCollector: typeof source.discoveryCollector === 'string' ? source.discoveryCollector : '',
    serialNumber: typeof source.serialNumber === 'string' ? source.serialNumber : '',
    assetTag: typeof source.assetTag === 'string' ? source.assetTag : '',
    purchaseDate: typeof source.purchaseDate === 'string' ? source.purchaseDate : '',
    warrantyEnd: typeof source.warrantyEnd === 'string' ? source.warrantyEnd : '',
    licenseEnd: typeof source.licenseEnd === 'string' ? source.licenseEnd : '',
    contractEnd: typeof source.contractEnd === 'string' ? source.contractEnd : '',
    supportEnd: typeof source.supportEnd === 'string' ? source.supportEnd : '',
    plannedReplacementDate: typeof source.plannedReplacementDate === 'string' ? source.plannedReplacementDate : '',
    retirementDate: typeof source.retirementDate === 'string' ? source.retirementDate : '',
    acquisitionMethod: typeof source.acquisitionMethod === 'string' ? source.acquisitionMethod : '',
    purchasePrice: typeof source.purchasePrice === 'number' && Number.isFinite(source.purchasePrice) ? source.purchasePrice : (typeof source.cost === 'number' && Number.isFinite(source.cost) ? source.cost : 0),
    annualOperatingCost: typeof source.annualOperatingCost === 'number' && Number.isFinite(source.annualOperatingCost) ? source.annualOperatingCost : 0,
    licenseCostAnnual: typeof source.licenseCostAnnual === 'number' && Number.isFinite(source.licenseCostAnnual) ? source.licenseCostAnnual : 0,
    currency: typeof source.currency === 'string' && source.currency ? source.currency : 'EUR',
    cost: typeof source.cost === 'number' && Number.isFinite(source.cost) ? source.cost : 0,
    dataClassification: typeof source.dataClassification === 'string' ? source.dataClassification : 'Interné',
    monitoring: typeof source.monitoring === 'string' ? source.monitoring : '',
    backup: typeof source.backup === 'string' ? source.backup : '',
    documentation: typeof source.documentation === 'string' ? source.documentation : '',
    lifecycle: typeof source.lifecycle === 'string' && source.lifecycle ? source.lifecycle : 'V prevádzke',
    inventoryStatus: typeof source.inventoryStatus === 'string' && source.inventoryStatus ? source.inventoryStatus : 'Neoverené',
    lastInventoryDate: typeof source.lastInventoryDate === 'string' ? source.lastInventoryDate : '',
    inventoryNote: typeof source.inventoryNote === 'string' ? source.inventoryNote : '',
    source: typeof source.source === 'string' && source.source ? source.source : 'Migrácia z CMDB',
    qrCode: typeof source.qrCode === 'string' ? source.qrCode : '',
    linkedTicketIds: Array.isArray(source.linkedTicketIds) ? source.linkedTicketIds : [],
    linkedChangeIds: Array.isArray(source.linkedChangeIds) ? source.linkedChangeIds : [],
    history: Array.isArray(source.history) ? source.history : [],
    note: typeof source.note === 'string' ? source.note : '',
    createdAt,
    updatedAt: typeof source.updatedAt === 'string' && source.updatedAt ? source.updatedAt : createdAt,
    updatedBy: typeof source.updatedBy === 'string' ? source.updatedBy : '',
  }
}

function migrateArchitectureRecord(record: ServiceArchitectureRecord): ServiceArchitectureRecord {
  const source = (record ?? {}) as Partial<ServiceArchitectureRecord>
  const confidence = source.confidence === 'Potvrdené zo zdrojov' || source.confidence === 'Čiastočne potvrdené'
    ? source.confidence
    : 'Na potvrdenie'
  return {
    id: typeof source.id === 'string' && source.id ? source.id : crypto.randomUUID(),
    title: typeof source.title === 'string' && source.title ? source.title : 'Bez názvu',
    serviceIds: Array.isArray(source.serviceIds) ? source.serviceIds.filter((value): value is string => typeof value === 'string') : [],
    projectIds: Array.isArray(source.projectIds) ? source.projectIds.filter((value): value is string => typeof value === 'string') : [],
    aliases: Array.isArray(source.aliases) ? source.aliases.filter((value): value is string => typeof value === 'string') : [],
    businessLayer: typeof source.businessLayer === 'string' ? source.businessLayer : '',
    oitProjects: Array.isArray(source.oitProjects) ? source.oitProjects.filter((value): value is string => typeof value === 'string') : [],
    runtimeLocation: typeof source.runtimeLocation === 'string' ? source.runtimeLocation : 'Na potvrdenie',
    environment: typeof source.environment === 'string' ? source.environment : 'Neurčené',
    platform: typeof source.platform === 'string' ? source.platform : 'Na potvrdenie',
    serverHints: Array.isArray(source.serverHints) ? source.serverHints.filter((value): value is string => typeof value === 'string') : [],
    networkDependencies: Array.isArray(source.networkDependencies) ? source.networkDependencies.filter((value): value is string => typeof value === 'string') : [],
    monitoring: typeof source.monitoring === 'string' ? source.monitoring : '',
    backup: typeof source.backup === 'string' ? source.backup : '',
    continuity: typeof source.continuity === 'string' ? source.continuity : '',
    oitDomains: Array.isArray(source.oitDomains) ? source.oitDomains.filter((value): value is string => typeof value === 'string') : [],
    oitOwnerIds: Array.isArray(source.oitOwnerIds) ? source.oitOwnerIds.filter((value): value is string => typeof value === 'string') : [],
    confidence,
    evidence: typeof source.evidence === 'string' ? source.evidence : 'Manuálne doplnené v aplikácii',
    note: typeof source.note === 'string' ? source.note : '',
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : '',
    updatedBy: typeof source.updatedBy === 'string' ? source.updatedBy : '',
  }
}

function migrateCmdbRelationship(relationship: CmdbRelationship): CmdbRelationship {
  const source = (relationship ?? {}) as Partial<CmdbRelationship>
  return {
    id: typeof source.id === 'string' && source.id ? source.id : crypto.randomUUID(),
    sourceId: typeof source.sourceId === 'string' ? source.sourceId : '',
    targetId: typeof source.targetId === 'string' ? source.targetId : '',
    type: typeof source.type === 'string' && source.type ? source.type : 'Závisí od',
    criticality: typeof source.criticality === 'string' && source.criticality ? source.criticality : 'Stredná',
    note: typeof source.note === 'string' ? source.note : '',
  }
}

function migrateSupplierRecord(record: SupplierRecord): SupplierRecord {
  const source = (record ?? {}) as Partial<SupplierRecord>
  return {
    id: typeof source.id === 'string' && source.id ? source.id : crypto.randomUUID(),
    ico: typeof source.ico === 'string' ? source.ico : '',
    name: typeof source.name === 'string' ? source.name : '',
    status: typeof source.status === 'string' && source.status ? source.status : 'Aktívny',
    category: typeof source.category === 'string' ? source.category : '',
    source: typeof source.source === 'string' && source.source ? source.source : 'Manuálna evidencia',
    website: typeof source.website === 'string' ? source.website : '',
    crzUrl: typeof source.crzUrl === 'string' ? source.crzUrl : '',
    contractPdfUrl: typeof source.contractPdfUrl === 'string' ? source.contractPdfUrl : '',
    dmsUrl: typeof source.dmsUrl === 'string' ? source.dmsUrl : '',
    salesContact: typeof source.salesContact === 'string' ? source.salesContact : '',
    salesEmail: typeof source.salesEmail === 'string' ? source.salesEmail : '',
    salesPhone: typeof source.salesPhone === 'string' ? source.salesPhone : '',
    supplierProjectManager: typeof source.supplierProjectManager === 'string' ? source.supplierProjectManager : '',
    customerProjectManager: typeof source.customerProjectManager === 'string' ? source.customerProjectManager : '',
    contractManager: typeof source.contractManager === 'string' ? source.contractManager : '',
    serviceOwner: typeof source.serviceOwner === 'string' ? source.serviceOwner : '',
    escalationContact: typeof source.escalationContact === 'string' ? source.escalationContact : '',
    note: typeof source.note === 'string' ? source.note : '',
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : '',
    updatedBy: typeof source.updatedBy === 'string' ? source.updatedBy : '',
  }
}


function migrateContractRecord(record: ContractRecord): ContractRecord {
  const source = (record ?? {}) as Partial<ContractRecord>
  const status = source.status === 'Príprava obnovy' || source.status === 'Na obstaranie' || source.status === 'Ukončená' || source.status === 'Pozastavená' ? source.status : 'Aktívna'
  const renewalType = source.renewalType === 'Automatická obnova' || source.renewalType === 'Nové obstarávanie' || source.renewalType === 'Bez obnovy' ? source.renewalType : 'Manuálne rozhodnutie'
  return {
    id: typeof source.id === 'string' && source.id ? source.id : crypto.randomUUID(),
    contractNumber: typeof source.contractNumber === 'string' ? source.contractNumber : '',
    title: typeof source.title === 'string' ? source.title : '',
    supplierKey: typeof source.supplierKey === 'string' ? source.supplierKey : '',
    supplierIco: typeof source.supplierIco === 'string' ? source.supplierIco : '',
    supplierName: typeof source.supplierName === 'string' ? source.supplierName : '',
    status,
    validFrom: typeof source.validFrom === 'string' ? source.validFrom : '',
    validTo: typeof source.validTo === 'string' ? source.validTo : '',
    noticePeriodDays: Number.isFinite(Number(source.noticePeriodDays)) ? Math.max(0, Number(source.noticePeriodDays)) : 60,
    procurementLeadDays: Number.isFinite(Number(source.procurementLeadDays)) ? Math.max(0, Number(source.procurementLeadDays)) : 120,
    renewalType,
    owner: typeof source.owner === 'string' ? source.owner : '',
    serviceIds: Array.isArray(source.serviceIds) ? source.serviceIds.filter((value): value is string => typeof value === 'string') : [],
    systemNames: Array.isArray(source.systemNames) ? source.systemNames.filter((value): value is string => typeof value === 'string') : [],
    task: typeof source.task === 'string' ? source.task : '',
    annualValue: Number.isFinite(Number(source.annualValue)) ? Number(source.annualValue) : 0,
    totalValue: Number.isFinite(Number(source.totalValue)) ? Number(source.totalValue) : 0,
    spentYtd: Number.isFinite(Number(source.spentYtd)) ? Number(source.spentYtd) : 0,
    slaRequired: Boolean(source.slaRequired),
    slaTarget: typeof source.slaTarget === 'string' ? source.slaTarget : '',
    slaStatus: typeof source.slaStatus === 'string' ? source.slaStatus : '',
    crzUrl: typeof source.crzUrl === 'string' ? source.crzUrl : '',
    dmsUrl: typeof source.dmsUrl === 'string' ? source.dmsUrl : '',
    note: typeof source.note === 'string' ? source.note : '',
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : '',
    updatedBy: typeof source.updatedBy === 'string' ? source.updatedBy : '',
  }
}

function migrateSupplierRelationship(relationship: SupplierRelationship): SupplierRelationship {
  const source = (relationship ?? {}) as Partial<SupplierRelationship>
  const status = source.status === 'Potvrdené' || source.status === 'Zamietnuté' ? source.status : 'Na preverenie'
  const confidence = source.confidence === 'Zdrojové' || source.confidence === 'Odvodené' ? source.confidence : 'Manuálne'
  return {
    id: typeof source.id === 'string' && source.id ? source.id : crypto.randomUUID(),
    supplierKey: typeof source.supplierKey === 'string' ? source.supplierKey : '',
    supplierIco: typeof source.supplierIco === 'string' ? source.supplierIco : '',
    supplierName: typeof source.supplierName === 'string' ? source.supplierName : '',
    targetType: typeof source.targetType === 'string' && source.targetType ? source.targetType : 'Informačný systém',
    targetId: typeof source.targetId === 'string' ? source.targetId : '',
    targetName: typeof source.targetName === 'string' ? source.targetName : '',
    parentSystem: typeof source.parentSystem === 'string' ? source.parentSystem : '',
    role: typeof source.role === 'string' && source.role ? source.role : 'Dodávateľ / partner',
    contractNumber: typeof source.contractNumber === 'string' ? source.contractNumber : '',
    validFrom: typeof source.validFrom === 'string' ? source.validFrom : '',
    validTo: typeof source.validTo === 'string' ? source.validTo : '',
    source: typeof source.source === 'string' && source.source ? source.source : 'Manuálna evidencia',
    evidence: typeof source.evidence === 'string' ? source.evidence : '',
    confidence,
    status,
    note: typeof source.note === 'string' ? source.note : '',
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : '',
    updatedBy: typeof source.updatedBy === 'string' ? source.updatedBy : '',
  }
}

export function migrateState(input: AppState): AppState {
  const defaults = cloneSeed()
  const source = (input && typeof input === 'object' ? input : {}) as Partial<AppState>
  const slaPolicies = Array.isArray(source.slaPolicies) ? source.slaPolicies : defaults.slaPolicies
  return {
    ...defaults,
    ...source,
    meta: {
      ...defaults.meta,
      ...source.meta,
      version: CURRENT_VERSION,
    },
    employees: Array.isArray(source.employees) ? source.employees : defaults.employees,
    raci: Array.isArray(source.raci) ? source.raci : defaults.raci,
    services: Array.isArray(source.services) ? source.services : defaults.services,
    substitutions: Array.isArray(source.substitutions) ? source.substitutions : defaults.substitutions,
    capacity: Array.isArray(source.capacity) ? source.capacity : defaults.capacity,
    risks: Array.isArray(source.risks) ? source.risks : defaults.risks,
    actions: Array.isArray(source.actions) ? source.actions : defaults.actions,
    decisions: Array.isArray(source.decisions) ? source.decisions : defaults.decisions,
    projects: Array.isArray(source.projects) ? source.projects.map(migrateProject) : defaults.projects,
    tasks: Array.isArray(source.tasks) ? source.tasks.map(migrateTask) : defaults.tasks,
    supportQueues: Array.isArray(source.supportQueues) ? source.supportQueues : defaults.supportQueues,
    slaPolicies,
    tickets: Array.isArray(source.tickets) ? source.tickets.map((ticket) => migrateTicket(ticket, slaPolicies)) : defaults.tickets,
    changes: Array.isArray(source.changes) ? source.changes.map(migrateChange) : defaults.changes,
    problems: Array.isArray(source.problems) ? source.problems.map(migrateProblem) : defaults.problems,
    accessRequests: Array.isArray(source.accessRequests) ? source.accessRequests.map(migrateAccessRequest) : defaults.accessRequests,
    accessCatalog: Array.isArray(source.accessCatalog) ? source.accessCatalog.map(migrateAccessCatalog) : defaults.accessCatalog,
    recertificationCampaigns: Array.isArray(source.recertificationCampaigns) ? source.recertificationCampaigns.map(migrateRecertificationCampaign) : defaults.recertificationCampaigns,
    cmdbItems: Array.isArray(source.cmdbItems)
      ? source.cmdbItems.map(migrateCmdbItem)
      : (defaults.cmdbItems as unknown as Partial<CmdbItem>[]).map(migrateCmdbItem),
    cmdbRelationships: Array.isArray(source.cmdbRelationships) ? source.cmdbRelationships.map(migrateCmdbRelationship) : defaults.cmdbRelationships,
    architectureOverrides: Array.isArray(source.architectureOverrides) ? source.architectureOverrides.map(migrateArchitectureRecord) : [],
    supplierRecords: Array.isArray(source.supplierRecords) ? source.supplierRecords.map(migrateSupplierRecord) : [],
    supplierRelationships: Array.isArray(source.supplierRelationships) ? source.supplierRelationships.map(migrateSupplierRelationship) : [],
    contractRecords: Array.isArray(source.contractRecords) ? source.contractRecords.map(migrateContractRecord) : [],
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return migrateState(cloneSeed())
    return migrateState(JSON.parse(raw) as AppState)
  } catch {
    return migrateState(cloneSeed())
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(migrateState(state)))
}

export function resetState(): AppState {
  localStorage.removeItem(STORAGE_KEY)
  return migrateState(cloneSeed())
}

export function exportState(state: AppState): void {
  const payload = migrateState(state)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `is-riadenie-odboru-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export async function importState(file: File): Promise<AppState> {
  const parsed = JSON.parse(await file.text()) as AppState
  if (!parsed.meta || !Array.isArray(parsed.employees) || !Array.isArray(parsed.raci)) {
    throw new Error('Súbor nemá očakávanú štruktúru aplikácie.')
  }
  const migrated = migrateState(parsed)
  saveState(migrated)
  return migrated
}

export function loadRole(): 'admin' | 'manager' | 'resolver' | 'employee' | 'viewer' {
  const value = localStorage.getItem(ROLE_KEY)
  return value === 'manager' || value === 'resolver' || value === 'employee' || value === 'viewer' ? value : 'admin'
}

export function saveRole(role: 'admin' | 'manager' | 'resolver' | 'employee' | 'viewer'): void {
  localStorage.setItem(ROLE_KEY, role)
}
