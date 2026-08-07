import type { AppState, RaciItem, Service } from '../types'
import { buildTechnologyItems, type TechnologyItem } from '../data/technologyCatalog'
import { oitData, type OitRaciRow } from '../data/oitData'
import costData from '../data/itCosts.json'
import contractData from '../data/contractTasks.json'
import paymentData from '../data/contractPayments.json'

export type AttentionTone = 'critical' | 'high' | 'medium' | 'info'

interface CostValue { year:number; amount:number }
interface CostRow { entity:string; category:string; mode:'Prevádzka'|'Rozvoj'; values:CostValue[]; label?:string }
interface CostDataset { items:CostRow[] }
interface ContractTask { code:string; budget:number; spent:number; remaining:number; monthly:number[]; name:string; description:string; centers:string[] }
interface ContractDataset { meta:{year:number;monthsLoaded:number}; tasks:ContractTask[] }
interface VendorRow { task:string; supplierId:string; supplierLabel:string; amount:number; paymentCount:number; months:number[]; contracts:string[]; centers:string[]; mapping:string[]; topNotes:string[] }
interface PaymentDataset { meta:{task25StrictCenter345:number;task25OtherCenters:number;rowCount:number}; vendors:VendorRow[] }

const costs=costData as CostDataset
export const sitContracts=contractData as ContractDataset
export const sitPayments=paymentData as PaymentDataset

const costAliases:Record<string,string[]>= {
  'DC VaV':['dc vav','dcvav','datove centrum','dátové centrum','data center'],
  'KOMIS':['komis','sk cris','skcris','scidap','iss','svd'],
  'CRZP/APS':['crzp','aps','antiplag','plagiat'],
  'CREPČ/CREUČ':['crepc','crepč','creuc','creuč'],
  'DMS / Fabasoft':['fabasoft','dms','registratur'],
  'VEMA':['vema'],
  'MUVV':['muvv','mvl'],
  'ESET':['eset'],
  'Mitel':['mitel'],
  'Zoho':['zoho'],
  'Adobe':['adobe'],
  'Mailchimp':['mailchimp'],
  'Hosting / domény':['hosting','domen'],
  'Internet / hosting':['internet','webhosting'],
}

export function normalizeManagementText(value:unknown){
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
}

function words(value:string){return normalizeManagementText(value).split(' ').filter(word=>word.length>=4)}
function includesAny(text:string, aliases:string[]){const n=normalizeManagementText(text);return aliases.some(alias=>n.includes(normalizeManagementText(alias)))}
const SERVICE_STOPWORDS=new Set(['sluzba','sluzby','system','systemy','informacny','informacne','prevadzka','sprava','podpora','rozvoj','agenda','portal','cvti','centralny','centralne','oblast'])
function strongTerms(service:Service){
  const base=[service.name,service.category,service.note].join(' ')
  const result=new Set<string>(words(base).filter(word=>!SERVICE_STOPWORDS.has(word)))
  Object.entries(costAliases).forEach(([entity,aliases])=>{if(includesAny(base,aliases)){result.add(normalizeManagementText(entity));aliases.forEach(alias=>result.add(normalizeManagementText(alias)))}})
  return [...result].filter(term=>term.length>=4)
}
function textMatchesService(service:Service,...values:unknown[]){
  const haystack=normalizeManagementText(values.join(' '))
  const terms=strongTerms(service)
  const name=normalizeManagementText(service.name)
  if(name.length>=4&&haystack.includes(name))return true
  return terms.some(term=>term.length>=5&&haystack.includes(term))
}

function amountFor(row:CostRow,year:number){return row.values.find(value=>value.year===year)?.amount||0}
function costEntities(service:Service){
  const source=[service.name,service.category,service.note].join(' ')
  return Object.entries(costAliases).filter(([,aliases])=>includesAny(source,aliases)).map(([entity])=>entity)
}
export function serviceCostProfile(service:Service){
  const entities=costEntities(service)
  const directEntities=costs.items.filter(row=>entities.includes(row.entity))
  const byYear=[2022,2023,2024,2025,2026].map(year=>({year,amount:directEntities.reduce((sum,row)=>sum+amountFor(row,year),0)}))
  const current=byYear.find(value=>value.year===2026)?.amount||0
  const run=directEntities.filter(row=>row.mode==='Prevádzka').reduce((sum,row)=>sum+amountFor(row,2026),0)
  const change=directEntities.filter(row=>row.mode==='Rozvoj').reduce((sum,row)=>sum+amountFor(row,2026),0)
  return {entities,byYear,current,run,change,rowCount:directEntities.length}
}

function normalizedRoles(assignments:Record<string,string>){
  return Object.entries(assignments).map(([person,value])=>({person,roles:String(value||'').split(/[\/,+\s]+/).map(v=>v.trim()).filter(Boolean)}))
}
function raciStats(items:RaciItem[]){
  let r=0,a=0,c=0,i=0,singleR=0
  items.forEach(item=>{
    const rows=normalizedRoles(item.assignments)
    const rPeople=rows.filter(row=>row.roles.includes('R'))
    if(rPeople.length===1)singleR++
    rows.forEach(row=>{if(row.roles.includes('R'))r++;if(row.roles.includes('A'))a++;if(row.roles.includes('C'))c++;if(row.roles.includes('I'))i++})
  })
  return {r,a,c,i,singleR}
}
function oitRaciStats(rows:OitRaciRow[]){
  let r=0,a=0,c=0,i=0,singleR=0
  rows.forEach(item=>{
    const roles=normalizedRoles(item.assignments)
    const rPeople=roles.filter(row=>row.roles.includes('R'))
    if(rPeople.length===1)singleR++
    roles.forEach(row=>{if(row.roles.includes('R'))r++;if(row.roles.includes('A'))a++;if(row.roles.includes('C'))c++;if(row.roles.includes('I'))i++})
  })
  return {r,a,c,i,singleR}
}

function daysUntil(value:string){
  if(!value)return Number.POSITIVE_INFINITY
  const time=new Date(`${value}T00:00:00`).getTime()
  if(Number.isNaN(time))return Number.POSITIVE_INFINITY
  return Math.ceil((time-Date.now())/86400000)
}

export interface LifecycleEvent {
  id:string
  date:string
  days:number
  title:string
  kind:'Licencia'|'Podpora'|'Kontrakt'|'Záruka'
  technology:string
  serviceIds:string[]
  owner:string
  severity:AttentionTone
}

export function buildLifecycleEvents(state:AppState):LifecycleEvent[]{
  const items=buildTechnologyItems(state)
  const events:LifecycleEvent[]=[]
  items.forEach(item=>{
    const add=(date:string,kind:LifecycleEvent['kind'])=>{
      if(!date)return
      const days=daysUntil(date)
      if(!Number.isFinite(days))return
      events.push({id:`${item.id}-${kind}-${date}`,date,days,title:`${kind}: ${item.name}`,kind,technology:item.name,serviceIds:item.serviceIds,owner:item.owner,severity:days<0?'critical':days<=30?'critical':days<=90?'high':days<=180?'medium':'info'})
    }
    add(item.licenseEnd,'Licencia');add(item.supportEnd,'Podpora')
  })
  state.cmdbItems.forEach(item=>{
    const add=(date:string,kind:LifecycleEvent['kind'])=>{
      if(!date)return
      const days=daysUntil(date);if(!Number.isFinite(days))return
      const id=`cmdb-${item.id}-${kind}-${date}`
      if(events.some(event=>event.id===id||event.technology===item.name&&event.kind===kind&&event.date===date))return
      events.push({id,date,days,title:`${kind}: ${item.name}`,kind,technology:item.name,serviceIds:item.serviceId?[item.serviceId]:[],owner:item.technicalOwner||item.businessOwner,severity:days<0?'critical':days<=30?'critical':days<=90?'high':days<=180?'medium':'info'})
    }
    add(item.contractEnd,'Kontrakt');add(item.warrantyEnd,'Záruka')
  })
  return events.sort((a,b)=>a.days-b.days)
}

export function contractForecast(task:ContractTask,method:'allAverage'|'last3'|'conservative'='allAverage'){
  const months=sitContracts.meta.monthsLoaded
  const remainingMonths=Math.max(0,12-months)
  const avgAll=months?task.spent/months:0
  const last3Rows=task.monthly.slice(Math.max(0,months-3),months)
  const avgLast3=last3Rows.length?last3Rows.reduce((sum,value)=>sum+value,0)/last3Rows.length:avgAll
  let forecast=task.spent+avgAll*remainingMonths
  if(method==='last3')forecast=task.spent+avgLast3*remainingMonths
  if(method==='conservative')forecast=task.spent+Math.max(avgAll,avgLast3)*remainingMonths
  return {forecast,delta:forecast-task.budget,avgAll,avgLast3,share:task.budget?forecast/task.budget*100:0}
}

export function taskForService(service:Service):string[]{
  const text=[service.name,service.category,service.note].join(' ')
  if(includesAny(text,['dc vav','dcvav','datove centrum','dátové centrum','teleprez']))return ['10']
  if(includesAny(text,['crzp','aps','antiplag']))return ['22']
  const entities=costEntities(service)
  if(entities.length||/(?:informa|softver|cloud|licenc|telekom|web|hosting|mailchimp|vema|fabasoft|muvv|pbx)/i.test(normalizeManagementText(text)))return ['25']
  return []
}

export interface Service360Record {
  service:Service
  technologies:TechnologyItem[]
  cmdb:AppState['cmdbItems']
  tickets:AppState['tickets']
  openTickets:AppState['tickets']
  problems:AppState['problems']
  openProblems:AppState['problems']
  changes:AppState['changes']
  openChanges:AppState['changes']
  risks:AppState['risks']
  projects:AppState['projects']
  tasks:AppState['tasks']
  raci:AppState['raci']
  oitRaci:OitRaciRow[]
  raciStats:ReturnType<typeof raciStats>
  oitRaciStats:ReturnType<typeof oitRaciStats>
  cost:ReturnType<typeof serviceCostProfile>
  lifecycle:LifecycleEvent[]
  contractTasks:ContractTask[]
  topVendors:VendorRow[]
  vendorConcentration:number
  health:number
  attention:number
  attentionReasons:string[]
}

function isOpenStatus(status:string,closed:string[]){return !closed.some(value=>normalizeManagementText(status)===normalizeManagementText(value))}
function serviceHealth(record:Omit<Service360Record,'health'|'attention'|'attentionReasons'>){
  const s=record.service
  let score=100
  if(!s.technicalOwner)score-=12
  if(!s.deputy)score-=12
  if(!s.runbook)score-=10
  if(!s.monitoring)score-=8
  if(!s.backup)score-=8
  if(!s.supplierSla)score-=5
  if(record.raciStats.r+record.oitRaciStats.r===0)score-=10
  if(record.raciStats.singleR+record.oitRaciStats.singleR>0)score-=8
  if(record.openProblems.length)score-=Math.min(12,record.openProblems.length*4)
  if(record.lifecycle.some(event=>event.days<0))score-=12
  else if(record.lifecycle.some(event=>event.days<=90))score-=6
  return Math.max(0,Math.round(score))
}
function attentionFor(record:Omit<Service360Record,'health'|'attention'|'attentionReasons'>,health:number){
  let score=0;const reasons:string[]=[]
  const critical=/krit/i.test(record.service.criticality)
  if(critical){score+=10}
  if(!record.service.deputy&&critical){score+=25;reasons.push('kritická služba bez evidovaného zástupcu')}
  const single=record.raciStats.singleR+record.oitRaciStats.singleR
  if(single){score+=Math.min(25,single*8);reasons.push(`${single} RACI procesov s jediným R`)}
  if(record.openProblems.length){score+=Math.min(25,record.openProblems.length*10);reasons.push(`${record.openProblems.length} otvorených problémov`)}
  const urgentTickets=record.openTickets.filter(ticket=>/krit|vysok/i.test(`${ticket.priority} ${ticket.impact}`)).length
  if(urgentTickets){score+=Math.min(20,urgentTickets*7);reasons.push(`${urgentTickets} prioritných incidentov/požiadaviek`)}
  const due=record.lifecycle.filter(event=>event.days<=90).length
  if(due){score+=Math.min(20,due*7);reasons.push(`${due} lifecycle termínov do 90 dní alebo po termíne`)}
  if(record.contractTasks.some(task=>contractForecast(task,'conservative').delta>0)){score+=18;reasons.push('kontraktový forecast signalizuje riziko prekročenia')}
  if(health<70){score+=12;reasons.push(`Service Health ${health}/100`)}
  if(record.cost.current>100000){score+=8;reasons.push('významná finančná expozícia 2026')}
  return {attention:Math.min(100,score),reasons}
}

export function buildService360(state:AppState):Service360Record[]{
  const technologies=buildTechnologyItems(state)
  const lifecycle=buildLifecycleEvents(state)
  return state.services.map(service=>{
    const serviceTechnologies=technologies.filter(item=>item.serviceIds.includes(service.id)||textMatchesService(service,item.name,item.category,item.platform,item.note))
    const cmdb=state.cmdbItems.filter(item=>item.serviceId===service.id||textMatchesService(service,item.name,item.category,item.note))
    const tickets=state.tickets.filter(item=>item.serviceId===service.id||textMatchesService(service,item.title,item.description,item.category,item.subcategory))
    const openTickets=tickets.filter(item=>isOpenStatus(item.status,['Vyriešená','Uzatvorená','Zrušená']))
    const problems=state.problems.filter(item=>item.serviceId===service.id||textMatchesService(service,item.title,item.description,item.symptom,item.rootCause))
    const openProblems=problems.filter(item=>isOpenStatus(item.status,['Vyriešený','Uzatvorený']))
    const changes=state.changes.filter(item=>item.serviceId===service.id||textMatchesService(service,item.title,item.description,item.affectedSystems,item.reason))
    const openChanges=changes.filter(item=>isOpenStatus(item.status,['Dokončená','Zamietnutá','Rollback','Zrušená']))
    const risks=state.risks.filter(item=>textMatchesService(service,item.area,item.risk,item.trigger,item.impact,item.measure,item.note))
    const projects=state.projects.filter(item=>textMatchesService(service,item.name,item.description,item.note))
    const projectIds=new Set(projects.map(item=>item.id))
    const tasks=state.tasks.filter(item=>projectIds.has(item.projectId)||textMatchesService(service,item.title,item.description,item.note))
    const raci=state.raci.filter(item=>textMatchesService(service,item.area,item.process,item.output,item.note))
    const oitRaci=oitData.raciAreas.flatMap(area=>area.rows).filter(item=>textMatchesService(service,item.process,item.note))
    const contractCodes=taskForService(service)
    const contractTasks=sitContracts.tasks.filter(task=>contractCodes.includes(task.code))
    const vendors=sitPayments.vendors.filter(vendor=>contractCodes.includes(vendor.task)).sort((a,b)=>b.amount-a.amount)
    const vendorTotal=vendors.reduce((sum,vendor)=>sum+vendor.amount,0)
    const topVendors=vendors.slice(0,5)
    const vendorConcentration=vendorTotal?topVendors.slice(0,2).reduce((sum,vendor)=>sum+vendor.amount,0)/vendorTotal*100:0
    const base={service,technologies:serviceTechnologies,cmdb,tickets,openTickets,problems,openProblems,changes,openChanges,risks,projects,tasks,raci,oitRaci,raciStats:raciStats(raci),oitRaciStats:oitRaciStats(oitRaci),cost:serviceCostProfile(service),lifecycle:lifecycle.filter(event=>event.serviceIds.includes(service.id)||serviceTechnologies.some(tech=>event.technology===tech.name)),contractTasks,topVendors,vendorConcentration}
    const health=serviceHealth(base)
    const attention=attentionFor(base,health)
    return {...base,health,attention:attention.attention,attentionReasons:attention.reasons}
  }).sort((a,b)=>b.attention-a.attention||a.service.name.localeCompare(b.service.name,'sk'))
}

export interface ControlTowerAlert {
  id:string
  tone:AttentionTone
  score:number
  title:string
  detail:string
  source:'Služba'|'Technológia'|'Rozpočet'|'Dáta'
  route:string
  serviceId?:string
}

export function buildControlTower(state:AppState){
  const services=buildService360(state)
  const lifecycle=buildLifecycleEvents(state)
  const alerts:ControlTowerAlert[]=[]
  services.filter(item=>item.attention>=35).forEach(item=>alerts.push({id:`service-${item.service.id}`,tone:item.attention>=75?'critical':item.attention>=55?'high':'medium',score:item.attention,title:item.service.name,detail:item.attentionReasons.slice(0,3).join(' · ')||'Vyžaduje manažérsku kontrolu.',source:'Služba',route:'intelligence',serviceId:item.service.id}))
  lifecycle.filter(event=>event.days<=90).slice(0,12).forEach(event=>alerts.push({id:`life-${event.id}`,tone:event.severity,score:event.days<0?95:event.days<=30?85:65,title:event.title,detail:event.days<0?`Termín je ${Math.abs(event.days)} dní po dátume ${event.date}.`:`Termín o ${event.days} dní · ${event.date}.`,source:'Technológia',route:'technology'}))
  sitContracts.tasks.forEach(task=>{const forecast=contractForecast(task,'conservative');if(forecast.delta>0)alerts.push({id:`budget-${task.code}`,tone:forecast.share>=120?'critical':'high',score:Math.min(100,55+(forecast.share-100)),title:`Úloha ${task.code} · forecast nad rozpočtom`,detail:`Konzervatívna projekcia ${Math.round(forecast.share)} % rozpočtu, rozdiel približne ${Math.round(forecast.delta).toLocaleString('sk-SK')} € pri zachovaní doterajšieho tempa.`,source:'Rozpočet',route:'itCosts'})})
  if(sitPayments.meta.task25OtherCenters>0)alerts.push({id:'task25-method',tone:'medium',score:45,title:'Úloha 25 · mapovanie mimo strediska 345',detail:`${sitPayments.meta.task25OtherCenters.toLocaleString('sk-SK')} € čerpania je v súhrne dorovnaných cez ostatné IT/telekom strediská; pravidlo je v reporte označené ako metodické.`,source:'Dáta',route:'itCosts'})
  alerts.sort((a,b)=>b.score-a.score)
  return {alerts,services,lifecycle,critical:alerts.filter(alert=>alert.tone==='critical').length,high:alerts.filter(alert=>alert.tone==='high').length}
}
