import type {
  AppState,
  ChangeRequest,
  CmdbItem,
  ContractRecord,
  ProblemRecord,
  Project,
  RaciItem,
  Risk,
  Service,
  SupplierRelationship,
  Task,
  Ticket,
} from '../types'
import { getArchitectureCatalog, oitPeopleById, type ArchitectureCatalogRecord } from '../data/serviceArchitecture'
import { supplierRelationshipCandidates } from '../data/supplierRelationshipCandidates'
import contractTaskData from '../data/contractTasks.json'
import contractTaskLedgerData from '../data/contractTaskLedger.json'
import websiteRegistryData from '../data/websiteRegistry.seed.json'
import informationSystemsData from '../data/informationSystems.seed.json'
import { komisContract, komisModuleSearchText, komisModulesForEntity, type KomisContractModule } from '../data/komisContract'

interface ContractTask {
  code: string
  centers: string[]
  name: string
  description: string
  budget: number
  spent: number
  remaining: number
  monthly: number[]
}

export interface EnterpriseLedgerRow {
  id: string
  sourceRow: string
  task: string
  zak: string
  kpd: string
  ppd: string
  fzd: string
  pgd: string
  pracm: string
  amount: number
  originalZak: string
  column: string
  category: string
  date: string
  month: number
  document: string
  note: string
  dataNote: string
}

interface WebsiteRegistryRow {
  name?: string
  url?: string
  normalizedDomain?: string
  primaryPurpose?: string
  owner?: string
  technicalOwner?: string
  status?: string
  notes?: string
}

interface InformationSystemRow {
  sourceKey?: string
  name?: string
  supplier?: string
  contractNumber?: string
  criticality?: string
  slaStatus?: string
  contractValidTo?: string
  notes?: string
  businessOwner?: string
  technicalOwner?: string
}

interface ContractTaskDataset {
  meta: { period:string; year:number; monthsLoaded:number; source:string }
  tasks: ContractTask[]
}

interface ContractLedgerDataset {
  meta: { period:string; year:number; monthsLoaded:number; rowCount:number; source:string }
  payments: EnterpriseLedgerRow[]
}

export interface EnterpriseFinance {
  task: ContractTask | null
  taskCode: string
  budget: number
  spent: number
  remaining: number
  monthly: number[]
  rows: EnterpriseLedgerRow[]
  period: string
  year: number
  monthsLoaded: number
  assetAnnualCost: number
  assetPurchaseValue: number
  contractAnnualValue: number
  contractTotalValue: number
  contractSpentYtd: number
}

export interface Enterprise360Entity {
  id: string
  title: string
  aliases: string[]
  businessLayer: string
  criticality: string
  confidence: string
  service: Service | null
  projects: Project[]
  tasks: Task[]
  tickets: Ticket[]
  problems: ProblemRecord[]
  changes: ChangeRequest[]
  cmdb: CmdbItem[]
  risks: Risk[]
  raci: RaciItem[]
  suppliers: SupplierRelationship[]
  contracts: ContractRecord[]
  websites: WebsiteRegistryRow[]
  informationSystems: InformationSystemRow[]
  finance: EnterpriseFinance
  komisModules: KomisContractModule[]
  runtimeLocation: string
  environment: string
  platform: string
  serverHints: string[]
  networkDependencies: string[]
  monitoring: string
  backup: string
  continuity: string
  oitDomains: string[]
  oitOwners: string[]
  primaryOwner: string
  businessOwner: string
  technicalOwner: string
  deputy: string
  openWorkCount: number
  openIncidentCount: number
  openProblemCount: number
  activeChangeCount: number
  openRiskCount: number
  highRiskCount: number
  missing: string[]
  readinessScore: number
  attentionScore: number
  searchText: string
}

const taskDataset = contractTaskData as ContractTaskDataset
const ledgerDataset = contractTaskLedgerData as ContractLedgerDataset
const websiteRegistry = websiteRegistryData as WebsiteRegistryRow[]
const informationSystems = informationSystemsData as InformationSystemRow[]

export function normalize360(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('sk-SK')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function unique<T>(values:T[]):T[]{ return [...new Set(values)] }
function isClosedStatus(value: string){
  const text=normalize360(value)
  return ['hotovo','uzatvorena','uzatvoreny','vyriesena','vyrieseny','dokoncena','ukoncene','ukoncena','zamietnuta','zrusena','rollback'].some(item=>text.includes(item))
}
function recordText(record: ArchitectureCatalogRecord){
  return normalize360([record.title,...record.aliases,record.businessLayer,record.platform,record.runtimeLocation,...record.serverHints,...record.oitDomains].join(' '))
}
function matchesRecord(record: ArchitectureCatalogRecord, values: unknown[]){
  const haystack=normalize360(values.filter(Boolean).join(' '))
  if(!haystack)return false
  const aliases=unique([record.title,...record.aliases]).map(normalize360).filter(alias=>alias.length>=3)
  return aliases.some(alias=>haystack.includes(alias))
}
function serviceFor(state:AppState,record:ArchitectureCatalogRecord){
  return state.services.find(service=>record.serviceIds.includes(service.id))
    ||state.services.find(service=>matchesRecord(record,[service.name,service.category,service.note]))
    ||null
}
function linkedProjects(state:AppState,record:ArchitectureCatalogRecord){
  return state.projects.filter(project=>record.projectIds.includes(project.id)||matchesRecord(record,[project.name,project.description,project.note]))
}
function linkedTasks(state:AppState,record:ArchitectureCatalogRecord,projects:Project[]){
  const ids=new Set(projects.map(project=>project.id))
  return state.tasks.filter(task=>ids.has(task.projectId)||matchesRecord(record,[task.title,task.description,task.source,task.note]))
}
function linkedTickets(state:AppState,record:ArchitectureCatalogRecord,service:Service|null){
  return state.tickets.filter(ticket=>ticket.serviceId===service?.id||matchesRecord(record,[ticket.title,ticket.description,ticket.category,ticket.subcategory,ticket.resolution,ticket.internalNote]))
}
function linkedProblems(state:AppState,record:ArchitectureCatalogRecord,service:Service|null){
  return state.problems.filter(problem=>problem.serviceId===service?.id||matchesRecord(record,[problem.title,problem.description,problem.symptom,problem.rootCause,problem.knownErrorSummary]))
}
function linkedChanges(state:AppState,record:ArchitectureCatalogRecord,service:Service|null){
  return state.changes.filter(change=>change.serviceId===service?.id||matchesRecord(record,[change.title,change.description,change.affectedSystems,change.reason]))
}
function linkedCmdb(state:AppState,record:ArchitectureCatalogRecord,service:Service|null){
  return state.cmdbItems.filter(item=>item.serviceId===service?.id||matchesRecord(record,[item.name,item.category,item.hostname,item.note,item.location,item.contractTask]))
}
function linkedRisks(state:AppState,record:ArchitectureCatalogRecord){
  return state.risks.filter(risk=>matchesRecord(record,[risk.area,risk.risk,risk.trigger,risk.impact,risk.measure,risk.evidence,risk.note]))
}
function linkedRaci(state:AppState,record:ArchitectureCatalogRecord){
  return state.raci.filter(item=>matchesRecord(record,[item.area,item.process,item.output,item.note]))
}
function linkedSuppliers(state:AppState,record:ArchitectureCatalogRecord,service:Service|null){
  const managed=state.supplierRelationships||[]
  const combined=[...managed,...supplierRelationshipCandidates]
  const seen=new Set<string>()
  return combined.filter(rel=>{
    const match=(service?.id&&rel.targetId===service.id)||matchesRecord(record,[rel.targetName,rel.parentSystem,rel.role,rel.note,rel.evidence])
    if(!match)return false
    const key=normalize360(rel.supplierIco||rel.supplierKey||rel.supplierName)
    if(seen.has(key))return false
    seen.add(key)
    return true
  })
}
function linkedContracts(state:AppState,record:ArchitectureCatalogRecord,service:Service|null,suppliers:SupplierRelationship[]){
  const supplierKeys=new Set(suppliers.flatMap(item=>[item.supplierKey,item.supplierIco]).filter(Boolean))
  return (state.contractRecords||[]).filter(contract=>
    (!!service&&contract.serviceIds.includes(service.id))
    ||contract.systemNames.some(name=>matchesRecord(record,[name]))
    ||matchesRecord(record,[contract.title,contract.task,contract.note])
    ||supplierKeys.has(contract.supplierKey)
    ||supplierKeys.has(contract.supplierIco)
  )
}
function linkedWebsites(record:ArchitectureCatalogRecord){
  return websiteRegistry.filter(row=>matchesRecord(record,[row.name,row.url,row.normalizedDomain,row.primaryPurpose,row.notes]))
}
function linkedInformationSystems(record:ArchitectureCatalogRecord){
  return informationSystems.filter(row=>matchesRecord(record,[row.name,row.sourceKey,row.notes]))
}
function exactContractTask(record:ArchitectureCatalogRecord):ContractTask|null{
  const exact=taskDataset.tasks.find(task=>matchesRecord(record,[task.name,task.description]))
  if(exact)return exact
  if(record.id==='crzp-aps')return taskDataset.tasks.find(task=>task.code==='22')||null
  return null
}
function financeFor(record:ArchitectureCatalogRecord,cmdb:CmdbItem[],contracts:ContractRecord[]):EnterpriseFinance{
  const task=exactContractTask(record)
  const rows=task?ledgerDataset.payments.filter(row=>row.task===task.code):[]
  return {
    task,
    taskCode:task?.code||'',
    budget:Number(task?.budget||0),
    spent:Number(task?.spent||0),
    remaining:Number(task?.remaining||0),
    monthly:[...(task?.monthly||[])],
    rows,
    period:taskDataset.meta.period,
    year:taskDataset.meta.year,
    monthsLoaded:taskDataset.meta.monthsLoaded,
    assetAnnualCost:cmdb.reduce((sum,item)=>sum+Number(item.annualOperatingCost||0)+Number(item.licenseCostAnnual||0),0),
    assetPurchaseValue:cmdb.reduce((sum,item)=>sum+Number(item.purchasePrice||item.cost||0),0),
    contractAnnualValue:contracts.reduce((sum,item)=>sum+Number(item.annualValue||0),0),
    contractTotalValue:contracts.reduce((sum,item)=>sum+Number(item.totalValue||0),0),
    contractSpentYtd:contracts.reduce((sum,item)=>sum+Number(item.spentYtd||0),0),
  }
}
function ownersFor(record:ArchitectureCatalogRecord,service:Service|null){
  const oitOwners=record.oitOwnerIds.map(id=>oitPeopleById[id]||id)
  return {
    primaryOwner:service?.primary||'',
    businessOwner:service?.businessOwner||'',
    technicalOwner:service?.technicalOwner||'',
    deputy:service?.deputy||'',
    oitOwners,
  }
}
function missingFor(record:ArchitectureCatalogRecord,service:Service|null,finance:EnterpriseFinance,suppliers:SupplierRelationship[],contracts:ContractRecord[]){
  const missing:string[]=[]
  if(!service?.businessOwner)missing.push('business owner')
  if(!service?.technicalOwner)missing.push('technický vlastník')
  if(!service?.deputy)missing.push('zástupca')
  if(!service?.rto)missing.push('RTO')
  if(!service?.runbook)missing.push('runbook')
  if(!record.monitoring||/potvrdiť|doplniť/i.test(record.monitoring))missing.push('monitoring')
  if(!record.backup||/potvrdiť|doplniť/i.test(record.backup))missing.push('backup/test obnovy')
  if(!finance.task)missing.push('priame finančné mapovanie')
  if(!suppliers.length)missing.push('dodávateľská väzba')
  if(!contracts.length)missing.push('zmluvná väzba')
  return missing
}
function readinessScore(missing:string[],highRisk:number,openProblems:number,openIncidents:number){
  return Math.max(20,Math.min(100,100-missing.length*5-highRisk*5-openProblems*3-Math.min(8,openIncidents*2)))
}

export function buildEnterprise360Entities(state:AppState):Enterprise360Entity[]{
  return getArchitectureCatalog(state).map(record=>{
    const service=serviceFor(state,record)
    const projects=linkedProjects(state,record)
    const tasks=linkedTasks(state,record,projects)
    const tickets=linkedTickets(state,record,service)
    const problems=linkedProblems(state,record,service)
    const changes=linkedChanges(state,record,service)
    const cmdb=linkedCmdb(state,record,service)
    const risks=linkedRisks(state,record)
    const raci=linkedRaci(state,record)
    const suppliers=linkedSuppliers(state,record,service)
    const contracts=linkedContracts(state,record,service,suppliers)
    const websites=linkedWebsites(record)
    const informationSystems=linkedInformationSystems(record)
    const finance=financeFor(record,cmdb,contracts)
    const komisModules=komisModulesForEntity(record.id)
    const owners=ownersFor(record,service)
    const openTasks=tasks.filter(task=>!isClosedStatus(task.status))
    const openIncidents=tickets.filter(ticket=>!isClosedStatus(ticket.status))
    const openProblems=problems.filter(problem=>!isClosedStatus(problem.status))
    const activeChanges=changes.filter(change=>!isClosedStatus(change.status))
    const openRisks=risks.filter(risk=>!isClosedStatus(risk.status))
    const highRisks=openRisks.filter(risk=>['kriticka','vysoka'].includes(normalize360(risk.priority)))
    const missing=missingFor(record,service,finance,suppliers,contracts)
    const readiness=readinessScore(missing,highRisks.length,openProblems.length,openIncidents.length)
    const attention=highRisks.length*3+openProblems.length*2+openIncidents.length+activeChanges.length+missing.length
    const criticality=service?.criticality||'Neurčená'
    const searchText=normalize360([
      recordText(record),service?.name,service?.category,service?.primary,
      ...projects.map(item=>item.name),...tasks.map(item=>item.title),...cmdb.map(item=>`${item.name} ${item.hostname}`),
      ...suppliers.map(item=>`${item.supplierName} ${item.role}`),...contracts.map(item=>`${item.title} ${item.contractNumber}`),
      ...websites.map(item=>`${item.name} ${item.url}`),...informationSystems.map(item=>`${item.name} ${item.supplier}`),
      ...komisModules.map(komisModuleSearchText), record.id==='komis'?komisContract.modules.map(komisModuleSearchText).join(' '):'',
    ].join(' '))
    return {
      id:record.id,title:record.title,aliases:record.aliases,businessLayer:record.businessLayer,criticality,
      confidence:record.confidence,service,projects,tasks,tickets,problems,changes,cmdb,risks,raci,suppliers,contracts,websites,informationSystems,
      finance,komisModules,runtimeLocation:record.runtimeLocation,environment:record.environment,platform:record.platform,serverHints:record.serverHints,
      networkDependencies:record.networkDependencies,monitoring:record.monitoring,backup:record.backup,continuity:record.continuity,
      oitDomains:record.oitDomains,oitOwners:owners.oitOwners,primaryOwner:owners.primaryOwner,businessOwner:owners.businessOwner,
      technicalOwner:owners.technicalOwner,deputy:owners.deputy,openWorkCount:openTasks.length,openIncidentCount:openIncidents.length,
      openProblemCount:openProblems.length,activeChangeCount:activeChanges.length,openRiskCount:openRisks.length,highRiskCount:highRisks.length,
      missing,readinessScore:readiness,attentionScore:attention,searchText,
    }
  }).sort((a,b)=>b.attentionScore-a.attentionScore||a.title.localeCompare(b.title,'sk'))
}

export function enterprisePortfolioTotals(entities:Enterprise360Entity[]){
  const exactFinance=entities.filter(entity=>entity.finance.task)
  return {
    systems:entities.length,
    critical:entities.filter(entity=>normalize360(entity.criticality).includes('krit')).length,
    budget:exactFinance.reduce((sum,entity)=>sum+entity.finance.budget,0),
    spent:exactFinance.reduce((sum,entity)=>sum+entity.finance.spent,0),
    openWork:entities.reduce((sum,entity)=>sum+entity.openWorkCount,0),
    openRisks:entities.reduce((sum,entity)=>sum+entity.openRiskCount,0),
    assets:entities.reduce((sum,entity)=>sum+entity.cmdb.length,0),
    attention:entities.filter(entity=>entity.attentionScore>8).length,
    komisMonthlySlaGross:komisContract.slaMonthlyGross,
    komisSupport84Gross:komisContract.sla84Gross,
    komisDevelopmentGross:komisContract.developmentGross,
  }
}
