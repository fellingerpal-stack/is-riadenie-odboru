import type { AppState, ChangeRequest, CmdbItem, ProblemRecord, Project, Service, Ticket } from '../types'

export type ArchitectureConfidence = 'Potvrdené zo zdrojov' | 'Čiastočne potvrdené' | 'Na potvrdenie'

export interface ArchitectureCatalogRecord {
  id: string
  title: string
  serviceIds: string[]
  projectIds: string[]
  aliases: string[]
  businessLayer: string
  oitProjects: string[]
  runtimeLocation: string
  environment: string
  platform: string
  serverHints: string[]
  networkDependencies: string[]
  monitoring: string
  backup: string
  continuity: string
  oitDomains: string[]
  oitOwnerIds: string[]
  confidence: ArchitectureConfidence
  evidence: string
  note: string
}

export interface ArchitectureItem {
  key: string
  kind: 'Služba' | 'Projekt'
  name: string
  service?: Service
  project?: Project
  record?: ArchitectureCatalogRecord
  cmdb: CmdbItem[]
  tickets: Ticket[]
  problems: ProblemRecord[]
  changes: ChangeRequest[]
  completeness: number
  missing: string[]
}

export const architectureCatalog: ArchitectureCatalogRecord[] = [
  {
    id: 'crzp-aps', title: 'CRZP a antiplagiátorský systém', serviceIds: ['S01'], projectIds: [],
    aliases: ['CRZP', 'APS', 'Centrálny register záverečných prác', 'Antiplagiátorský systém', 'Antiplagiátorsky system'],
    businessLayer: 'Register záverečných prác a kontrola originality',
    oitProjects: ['Centrálny register záverečných prác', 'Antiplagiátorsky system'],
    runtimeLocation: 'DC VaV Žilina', environment: 'Produkčné viacvrstvové prostredie',
    platform: 'Windows Server, aplikačná vrstva, databáza, frontend a centrálne úložiská',
    serverHints: ['CIVMSSVZAP01', 'CIVMSSVAPS01–20', 'CIVMSSVFND01/11', 'CIVMSSVFPS01', 'CIVMSSVSTR01/02', 'CIVMSSVNET01'],
    networkDependencies: ['DNS', 'firewall', 'load balancing / frontend', 'LAN/WAN', 'internetové publikovanie'],
    monitoring: 'Infraštruktúrny monitoring OIT; aplikačné metriky a end-to-end dohľad potvrdiť.',
    backup: 'Databázové, aplikačné a storage zálohy; pravidelný test obnovy potvrdiť a evidovať.',
    continuity: 'Kritická služba. Potrebný RTO/RPO, runbook, sekundárny technický riešiteľ a test obnovy.',
    oitDomains: ['Servery a virtualizácia', 'Storage a zálohovanie', 'Sieť a bezpečnosť', 'Monitoring'],
    oitOwnerIds: ['PM','ŠK','JL','MŽ','RB'], confidence: 'Potvrdené zo zdrojov',
    evidence: 'Prevádzkový report DC VaV + register služieb/CMDB', note: 'Technické údaje vychádzajú z dostupného prevádzkového podkladu a musia byť priebežne potvrdené.'
  },
  {
    id: 'rvvi', title: 'RVVI / SK CRIS / VedaTechnika', serviceIds: ['S04'], projectIds: ['P03'],
    aliases: ['RVVI','regvvi','ISOVAV','SKCRIS','SK CRIS','VedaTechnika','Veda Technika'],
    businessLayer: 'Informačné a registračné služby pre vedu, výskum a inovácie',
    oitProjects: ['SKCRIS','VedaTechnika'], runtimeLocation: 'DC VaV Žilina', environment: 'Produkcia a test',
    platform: 'Portál, integračné rozhranie, reporty, databáza a webové publikovanie',
    serverHints: ['CIVMSSCAS01–04', 'CIVMSSCIS01/02', 'ATAIR', 'DORADO', 'GRUS', 'ORION'],
    networkDependencies: ['DNS a TLS', 'internetové publikovanie', 'Active Directory', 'aplikačná a databázová sieť'],
    monitoring: 'Dostupnosť portálu, integračných rozhraní, databázy a certifikátov.',
    backup: 'Zálohy databázy a aplikačných konfigurácií; test obnovy a retenciu potvrdiť.',
    continuity: 'Oddeliť produkčné a testovacie závislosti, potvrdiť vlastníkov a eskalačný postup.',
    oitDomains: ['Aplikačné platformy', 'Databázy', 'Identity', 'Sieť a bezpečnosť'],
    oitOwnerIds: ['JL','ŠK','PM','MŽ','VŠ'], confidence: 'Potvrdené zo zdrojov',
    evidence: 'Prevádzkový report DC VaV + portfólio ORIS', note: 'Názvy RVVI, SK CRIS, VedaTechnika a ISOVAV treba zjednotiť na jednoznačné identifikátory služieb.'
  },
  {
    id: 'iss', title: 'ISS – Integrovaný systém služieb', serviceIds: ['S12'], projectIds: [],
    aliases: ['ISS','Integrovaný systém služieb','Integrovaný system sluzieb'], businessLayer: 'Integrované používateľské a informačné služby',
    oitProjects: ['ISS'], runtimeLocation: 'DC VaV Žilina', environment: 'Produkčné viacserverové prostredie',
    platform: 'Linux aplikačné, databázové, systémové a ownCloud komponenty',
    serverHints: ['CIVMSISAPP01/02/12','CIVMSISSQL01/02','CIVMSISSYS01/02','CIVMSISOWC01'],
    networkDependencies: ['DNS', 'LAN/WAN', 'identity služby', 'databázová komunikácia', 'internetové publikovanie podľa rozsahu'],
    monitoring: 'Monitoring dostupnosti komponentov, kapacity, databázy a integračných väzieb.',
    backup: 'Aplikačné a databázové zálohy; potvrdiť RPO/RTO a posledný úspešný test obnovy.',
    continuity: 'Viacserverová služba – vyžaduje aktuálnu topológiu, runbook a mapu závislostí.',
    oitDomains: ['Linux servery', 'Databázy', 'Storage a zálohovanie', 'Sieť'],
    oitOwnerIds: ['ŠK','PM','JL','MŽ'], confidence: 'Potvrdené zo zdrojov', evidence: 'Prevádzkový report DC VaV', note: ''
  },
  {
    id: 'komis', title: 'KOMIS', serviceIds: [], projectIds: ['P01'], aliases: ['KOMIS'],
    businessLayer: 'Projekt a informačný systém ORIS', oitProjects: ['KOMIS'], runtimeLocation: 'DC VaV Žilina', environment: 'Produkčné viacserverové prostredie',
    platform: 'Ubuntu aplikačné, clusterové, load-balancing, databázové a worker uzly',
    serverHints: ['CIVMSKOAJC21–23','CIVMSKOAKC21–28','CIVMSKOALM21/22','CIVMSKOAWN21–24','CIVMSKOB*','CIVMSKOS*'],
    networkDependencies: ['DNS', 'load balancing', 'clusterová sieť', 'storage', 'databáza', 'LAN/WAN'],
    monitoring: 'Monitoring uzlov, clusterov, kapacity storage, databáz a aplikačných endpointov.',
    backup: 'Zálohy databáz, konfigurácií a pracovných dát; potvrdiť obnovu celého reťazca.',
    continuity: 'Komplexná topológia s veľkým počtom uzlov – potrebná CMDB väzba a automatizovaný runbook.',
    oitDomains: ['Linux servery', 'Virtualizácia', 'Storage', 'Sieť', 'Monitoring'],
    oitOwnerIds: ['ŠK','PM','JL','MŽ'], confidence: 'Potvrdené zo zdrojov', evidence: 'Prevádzkový report DC VaV + projekt ORIS', note: 'Rozsah serverov treba zosúladiť s aktuálnym CMDB.'
  },
  {
    id: 'scidap', title: 'SVD / SciDAP', serviceIds: ['S11'], projectIds: [], aliases: ['SVD','SCIDAP','SciDAP'],
    businessLayer: 'Dátová a analytická služba', oitProjects: ['SciDAP'], runtimeLocation: 'DC VaV Žilina', environment: 'Prevádzkové prostredie – rozsah potvrdiť',
    platform: 'Aplikačná a dátová platforma v serverovej infraštruktúre DC VaV', serverHints: [],
    networkDependencies: ['databázová komunikácia', 'storage', 'DNS', 'identity podľa spôsobu prístupu'],
    monitoring: 'Potvrdiť konkrétne komponenty, aplikačné metriky a vlastníka alarmov.',
    backup: 'Potvrdiť dátové zdroje, rozsah, retenciu a test obnovy.', continuity: 'Doplniť aktuálnu technickú topológiu a SLA.',
    oitDomains: ['Aplikačné platformy', 'Databázy', 'Storage'], oitOwnerIds: ['JL','ŠK','PM'], confidence: 'Čiastočne potvrdené', evidence: 'Zoznam projektov DC VaV + služba ORIS', note: ''
  },
  {
    id: 'webjet', title: 'WebJet / BUXUS / webový ekosystém', serviceIds: ['S06'], projectIds: [],
    aliases: ['WebJet','BUXUS','Webové stránky CVTI','webovy ekosystem','webový ekosystém'], businessLayer: 'Webové portály a publikačné služby CVTI SR',
    oitProjects: ['BUXUS weby'], runtimeLocation: 'DC VaV Žilina / webhosting – potvrdiť po jednotlivých weboch', environment: 'Produkčné webové prostredia',
    platform: 'CMS, webové servery, databázy, DNS/TLS a internetové publikovanie',
    serverHints: ['CIVMSIFWWW01–12'], networkDependencies: ['DNS', 'TLS certifikáty', 'firewall/WAF', 'internet', 'databáza'],
    monitoring: 'Dostupnosť webov, certifikáty, chybovosť aplikácie a bezpečnostné udalosti.',
    backup: 'Obsah, databáza a konfigurácia CMS; potvrdiť hostingové zálohy a obnovu.',
    continuity: 'Každý web priradiť ku konkrétnemu CMS, serveru, vlastníkovi a termínu obnovy.',
    oitDomains: ['Webové servery', 'Databázy', 'Sieť a bezpečnosť'], oitOwnerIds: ['ŠK','JL','MŽ','PM'], confidence: 'Čiastočne potvrdené', evidence: 'Prevádzkový report DC VaV + register webov', note: ''
  },
  {
    id: 'mohok', title: 'MOHOK', serviceIds: ['S05'], projectIds: ['P02'], aliases: ['MOHOK','mohok.cvtisr.sk'],
    businessLayer: 'Webový portál ORIS', oitProjects: ['BUXUS weby'], runtimeLocation: 'Webová infraštruktúra CVTI SR – konkrétny host potvrdiť', environment: 'Produkcia',
    platform: 'Webová aplikácia / CMS, databáza, DNS a TLS', serverHints: [], networkDependencies: ['DNS', 'TLS', 'internetové publikovanie', 'databáza'],
    monitoring: 'Dostupnosť URL, platnosť TLS, aplikačné chyby a výkon.', backup: 'Databáza, obsah a konfigurácia – zodpovednosť hostingu potvrdiť.',
    continuity: 'Doplniť server/hosting, technického vlastníka a obnovovací postup.', oitDomains: ['Webové platformy','Sieť','Databázy'],
    oitOwnerIds: ['ŠK','JL','MŽ'], confidence: 'Na potvrdenie', evidence: 'Portfólio ORIS + register webov', note: ''
  },
  {
    id: 'eosc', title: 'EOSC portály a cloudové služby', serviceIds: ['S08'], projectIds: ['P06'], aliases: ['EOSC','IWCloud','OWNCLOUD','OwnCloud'],
    businessLayer: 'Projektové a cloudové služby', oitProjects: ['IWCloud','OWNCLOUD'], runtimeLocation: 'DC VaV Žilina / cloudové prostredie', environment: 'Produkčné a projektové prostredia',
    platform: 'Cloudové riadiace, výpočtové a dátové uzly; ownCloud komponenty', serverHints: ['CIVMSIW*','CIVMSAPOWN10'],
    networkDependencies: ['internet', 'DNS/TLS', 'identity', 'storage', 'cloudová sieť'], monitoring: 'Cloudové uzly, dostupnosť portálu, storage, certifikáty a kapacita.',
    backup: 'Dátové úložiská a konfigurácie; zadefinovať zodpovednosť používateľa a platformy.', continuity: 'Doplniť katalóg služieb, tenantov, RTO/RPO a eskalácie.',
    oitDomains: ['Cloud','Storage','Identity','Sieť'], oitOwnerIds: ['JL','PM','ŠK','MŽ'], confidence: 'Čiastočne potvrdené', evidence: 'Zoznam projektov a serverov DC VaV + portfólio ORIS', note: ''
  },
  {
    id: 'nti', title: 'NTI', serviceIds: ['S07'], projectIds: ['P07'], aliases: ['NTI','Národná teleprezentačná infraštruktúra'],
    businessLayer: 'Komunikačná a audiovizuálna infraštruktúra', oitProjects: [], runtimeLocation: 'NTI miestnosti a externé/cloudové komponenty', environment: 'Produkcia s čiastočne neformalizovanými prvkami',
    platform: 'AV zariadenia, sieť, Webex licencie a lokálne serverové komponenty', serverHints: [], networkDependencies: ['internet', 'LAN/WAN', 'Wi-Fi', 'videokonferenčné služby'],
    monitoring: 'Ručná kontrola; doplniť centrálny monitoring dostupnosti kritických prvkov.', backup: 'Nevzťahuje sa na AV prvky; konfigurácie a lokálne dáta treba zálohovať.',
    continuity: 'Inventarizovať zariadenia, licencie, testovací server a určiť cieľový prevádzkový model.', oitDomains: ['Sieť','Endpointy','Cloudové služby'],
    oitOwnerIds: ['MŽ','ĽH','SK','VŠ'], confidence: 'Čiastočne potvrdené', evidence: 'Portfólio ORIS a CMDB', note: ''
  },
  {
    id: 'evupp', title: 'EvuPP', serviceIds: ['S02'], projectIds: [], aliases: ['EvuPP'], businessLayer: 'Rezortný informačný systém',
    oitProjects: [], runtimeLocation: 'Lokalita a infraštruktúrna platforma na potvrdenie', environment: 'Produkcia', platform: 'Aplikačná a databázová vrstva – technické komponenty doplniť',
    serverHints: [], networkDependencies: ['identity', 'databáza', 'sieťové publikovanie podľa rozsahu'], monitoring: 'Doplniť aplikačný a infraštruktúrny monitoring.',
    backup: 'Potvrdiť rozsah, retenciu, vlastníka a test obnovy.', continuity: 'Kritická personálna závislosť; doplniť technickú topológiu a zástupcu.',
    oitDomains: ['Aplikačné platformy','Databázy','Monitoring'], oitOwnerIds: ['ŠK','JL','PM'], confidence: 'Na potvrdenie', evidence: 'Portfólio ORIS', note: ''
  },
  {
    id: 'intranet', title: 'Nový intranet', serviceIds: ['S03'], projectIds: ['P04'], aliases: ['Nový intranet','intranet'], businessLayer: 'Interný komunikačný a informačný portál',
    oitProjects: [], runtimeLocation: 'Hosting CVTI SR – cieľová lokalita potvrdiť', environment: 'Vývoj / príprava produkcie', platform: 'Webová aplikácia, databáza, DNS, autentifikácia',
    serverHints: [], networkDependencies: ['DNS/TLS','identity/SSO','databáza','interná sieť'], monitoring: 'Nastaviť pred produkciou: URL, certifikát, aplikácia, databáza a kapacita.',
    backup: 'Nastaviť pred produkciou a vykonať test obnovy.', continuity: 'Pred spustením doplniť runbook, zástupcu, CI/CD a rollback.',
    oitDomains: ['Webové platformy','Identity','Databázy','Sieť'], oitOwnerIds: ['JL','ŠK','VŠ','MŽ'], confidence: 'Na potvrdenie', evidence: 'Portfólio ORIS a change register', note: ''
  },
  {
    id: 'dalv', title: 'DALV', serviceIds: ['S10'], projectIds: [], aliases: ['DALV'], businessLayer: 'Aplikačná služba ORIS', oitProjects: [],
    runtimeLocation: 'Na potvrdenie', environment: 'Produkcia – rozsah potvrdiť', platform: 'Aplikačné a databázové komponenty doplniť', serverHints: [],
    networkDependencies: ['sieť','databáza','identity podľa rozsahu'], monitoring: 'Doplniť.', backup: 'Doplniť.', continuity: 'Doplniť technickú topológiu, vlastníka a zástupcu.',
    oitDomains: ['Aplikačné platformy','Databázy'], oitOwnerIds: ['JL','ŠK','PM'], confidence: 'Na potvrdenie', evidence: 'Portfólio ORIS', note: ''
  },
  {
    id: 'openai', title: 'OpenAI administrácia', serviceIds: ['S09'], projectIds: [], aliases: ['OpenAI'], businessLayer: 'SaaS administrácia', oitProjects: [],
    runtimeLocation: 'Externý SaaS / cloud', environment: 'Produkčná cloudová služba', platform: 'SaaS, používateľské účty, licencie a administrátorská konzola', serverHints: [],
    networkDependencies: ['internet','identity/MFA','e-mail'], monitoring: 'Administrátorský prehľad, audit účtov a spotreby.', backup: 'Export konfigurácie a evidencie účtov; obsah podľa pravidiel služby.',
    continuity: 'Doplniť náhradného administrátora, recovery postup a evidenciu privilegovaných rolí.', oitDomains: ['Identity','Cloud','Bezpečnosť'],
    oitOwnerIds: ['VŠ','JL'], confidence: 'Potvrdené zo zdrojov', evidence: 'Portfólio ORIS', note: 'Nie je hostované v dátových centrách CVTI SR.'
  },
  {
    id: 'graphics', title: 'Grafické a publikačné pracovisko', serviceIds: ['S13'], projectIds: [], aliases: ['Grafické','Adobe','publikačné pracovisko'],
    businessLayer: 'Podporná grafická a publikačná služba', oitProjects: [], runtimeLocation: 'Koncové pracovisko CVTI SR', environment: 'Endpoint / SaaS licencie',
    platform: 'Spravovaná pracovná stanica, Adobe Creative Cloud a zdieľané úložisko', serverHints: [], networkDependencies: ['LAN/Wi-Fi','identity','cloudové licencie','spravované úložisko'],
    monitoring: 'Endpoint management, stav zariadenia a licencie.', backup: 'Používateľské dáta ukladať do spravovaného úložiska.', continuity: 'Doplniť zástupcu, licenčný model a štandard zariadenia.',
    oitDomains: ['Endpointy','Identity','Cloudové licencie'], oitOwnerIds: ['ĽH','SK','VŠ'], confidence: 'Čiastočne potvrdené', evidence: 'Portfólio ORIS a CMDB', note: ''
  }
]

export const oitPeopleById: Record<string,string> = {
  MK:'Michal Kučera', 'ĽH':'Ľubomír Hozlár', SK:'Samuel Kováč', 'VŠ':'Vladimír Šulko', JS:'Ján Strešňák',
  RB:'Roman Bátora', MD:'Mário Dubec', AP:'Alojz Pavlovič', PM:'Pavol Marcina', 'ŠK':'Štefan Knap', JL:'Jaroslav Lečko', 'MŽ':'Matej Žáry', RJ:'Richard Jurík'
}

export function normalizeArchitectureText(value: unknown): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
}

function textMatches(record: ArchitectureCatalogRecord, values: unknown[]) {
  const text=normalizeArchitectureText(values.filter(Boolean).join(' '))
  return record.aliases.some(alias=>text.includes(normalizeArchitectureText(alias)))
}

function linkedCmdb(state: AppState, service: Service | undefined, record: ArchitectureCatalogRecord | undefined) {
  return state.cmdbItems.filter(item=>service?.id===item.serviceId || (!!record && textMatches(record,[item.name,item.category,item.hostname,item.note,item.location])))
}
function linkedTickets(state: AppState, service: Service | undefined, record: ArchitectureCatalogRecord | undefined) {
  return state.tickets.filter(item=>service?.id===item.serviceId || (!!record && textMatches(record,[item.title,item.description,item.category,item.subcategory])))
}
function linkedProblems(state: AppState, service: Service | undefined, record: ArchitectureCatalogRecord | undefined) {
  return state.problems.filter(item=>service?.id===item.serviceId || (!!record && textMatches(record,[item.title,item.description,item.symptom,item.rootCause])))
}
function linkedChanges(state: AppState, service: Service | undefined, record: ArchitectureCatalogRecord | undefined) {
  return state.changes.filter(item=>service?.id===item.serviceId || (!!record && textMatches(record,[item.title,item.description,item.affectedSystems,item.reason])))
}

function evaluate(record: ArchitectureCatalogRecord | undefined, service?: Service) {
  const missing=[
    (!record || /potvrdiť|na potvrdenie/i.test(record.runtimeLocation)) && 'lokalita',
    (!record?.monitoring || /^doplniť\.?$/i.test(record.monitoring)) && 'monitoring',
    (!record?.backup || /^doplniť\.?$/i.test(record.backup)) && 'zálohovanie',
    !record?.oitOwnerIds.length && 'OIT vlastník',
    !service?.technicalOwner && 'aplikačný vlastník',
  ].filter(Boolean) as string[]
  return {missing,completeness:Math.max(0,100-missing.length*20)}
}

export function buildArchitectureItems(state: AppState): ArchitectureItem[] {
  const result: ArchitectureItem[]=[]
  const used=new Set<string>()
  state.services.forEach(service=>{
    const record=architectureCatalog.find(candidate=>candidate.serviceIds.includes(service.id) || textMatches(candidate,[service.name,service.category,service.note]))
    const evalResult=evaluate(record,service)
    result.push({key:`service-${service.id}`,kind:'Služba',name:service.name,service,record,cmdb:linkedCmdb(state,service,record),tickets:linkedTickets(state,service,record),problems:linkedProblems(state,service,record),changes:linkedChanges(state,service,record),...evalResult})
    if(record)used.add(record.id)
  })
  state.projects.forEach(project=>{
    const record=architectureCatalog.find(candidate=>candidate.projectIds.includes(project.id) || textMatches(candidate,[project.name,project.description,project.note]))
    if(!record || used.has(record.id))return
    const evalResult=evaluate(record)
    result.push({key:`project-${project.id}`,kind:'Projekt',name:project.name,project,record,cmdb:linkedCmdb(state,undefined,record),tickets:linkedTickets(state,undefined,record),problems:linkedProblems(state,undefined,record),changes:linkedChanges(state,undefined,record),...evalResult})
    used.add(record.id)
  })
  return result.sort((a,b)=>(a.record?0:1)-(b.record?0:1)||a.name.localeCompare(b.name,'sk'))
}
