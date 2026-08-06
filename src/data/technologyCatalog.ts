import { getArchitectureCatalog, type ArchitectureCatalogRecord } from './serviceArchitecture'
import { oitData } from './oitData'
import type { AppState, CmdbItem } from '../types'

export type TechnologyModel = 'IaaS' | 'PaaS' | 'SaaS'
export type TechnologyEvidence = 'Potvrdené' | 'Odvodené' | 'Na potvrdenie'

export interface TechnologyItem {
  id: string
  name: string
  model: TechnologyModel
  category: string
  kind: string
  location: string
  environment: string
  platform: string
  serviceIds: string[]
  cmdbIds: string[]
  serverHints: string[]
  monitoring: string
  backup: string
  owner: string
  lifecycle: string
  supportEnd: string
  licenseEnd: string
  evidence: TechnologyEvidence
  source: string
  note: string
}

interface PlatformBlueprint {
  id: string
  name: string
  model: TechnologyModel
  category: string
  location: string
  platformTerms: string[]
  monitoring: string
  backup: string
  owner: string
  lifecycle: string
  evidence: TechnologyEvidence
  source: string
  note: string
}

const platformBlueprints: PlatformBlueprint[] = [
  {
    id: 'platform-vmware',
    name: 'VMware virtualizačná platforma',
    model: 'IaaS',
    category: 'Virtualizácia a výpočtová infraštruktúra',
    location: 'Lamačská cesta / DC VaV Žilina',
    platformTerms: ['vmware', 'vsphere', 'esxi', 'vcenter', 'virtualiza'],
    monitoring: 'Zabbix / Microsoft SCOM; konkrétny rozsah metrík potvrdiť.',
    backup: 'IBM Spectrum Protect, Protect Plus a VMware Site Recovery Manager.',
    owner: 'OIT · servery, virtualizácia a monitoring',
    lifecycle: 'V prevádzke',
    evidence: 'Potvrdené',
    source: 'Katalóg serverového softvéru a prevádzkový report',
    note: 'Spoločná infraštruktúrna vrstva pre virtuálne servery a platformové služby.',
  },
  {
    id: 'platform-storage-backup',
    name: 'Úložiská, zálohovanie a Disaster Recovery',
    model: 'IaaS',
    category: 'Storage a kontinuita',
    location: 'Lamačská cesta / DC VaV Žilina',
    platformTerms: ['storage', 'úložisk', 'záloh', 'backup', 'spectrum protect', 'site recovery'],
    monitoring: 'Kapacita, dostupnosť diskových polí a stav zálohovacích úloh.',
    backup: 'Platforma zabezpečuje zálohy a replikácie ostatných systémov.',
    owner: 'OIT · storage, zálohovanie a kontinuita',
    lifecycle: 'V prevádzke',
    evidence: 'Potvrdené',
    source: 'Kapacitný report DC VaV a katalóg serverového softvéru',
    note: 'Register testov obnovy a RPO/RTO je potrebné postupne doplniť.',
  },
  {
    id: 'platform-network',
    name: 'Sieťová a bezpečnostná platforma',
    model: 'IaaS',
    category: 'Sieť, firewall a publikovanie služieb',
    location: 'Lamačská cesta / DC VaV Žilina',
    platformTerms: ['sieť', 'network', 'firewall', 'forti', 'dns', 'radius', 'load balanc', 'wan', 'lan'],
    monitoring: 'Sieťový dohľad, alerting a dostupnosť kritických trás.',
    backup: 'Zálohy konfigurácií a redundantné trasy potvrdiť po jednotlivých prvkoch.',
    owner: 'OIT · sieťová infraštruktúra a bezpečnosť',
    lifecycle: 'V prevádzke',
    evidence: 'Potvrdené',
    source: 'Sieťové topológie oboch lokalít a RACI OIT',
    note: 'Prepája interné siete, internetové publikovanie, VPN/MPLS a bezpečnostné prvky.',
  },
  {
    id: 'platform-identity',
    name: 'Microsoft Active Directory a systémové identity',
    model: 'PaaS',
    category: 'Identity a systémové služby',
    location: 'Lamačská cesta',
    platformTerms: ['active directory', 'identity', 'identit', 'dns', 'radius', 'smtp', 'idm'],
    monitoring: 'Dostupnosť doménových, DNS, RADIUS a SMTP služieb.',
    backup: 'System-state a konfiguračné zálohy potvrdiť.',
    owner: 'OIT · Microsoft enterprise a systémové služby',
    lifecycle: 'V prevádzke',
    evidence: 'Potvrdené',
    source: 'Katalóg serverového softvéru a RACI OIT',
    note: 'Platformová závislosť aplikačných systémov, IAM a administrátorských prístupov.',
  },
  {
    id: 'platform-database',
    name: 'Databázové platformy',
    model: 'PaaS',
    category: 'Databázy a dátové služby',
    location: 'Lamačská cesta / DC VaV Žilina',
    platformTerms: ['database', 'databáz', 'sql', 'bigsql', 'postgres'],
    monitoring: 'Dostupnosť, výkon, kapacita, chybové stavy a rast dát.',
    backup: 'Databázové zálohy a pravidelný restore test podľa kritickosti služby.',
    owner: 'OIT · databázové a systémové platformy',
    lifecycle: 'V prevádzke',
    evidence: 'Potvrdené',
    source: 'Katalóg serverového softvéru, CMDB a report DC VaV',
    note: 'Obsahuje Microsoft SQL Server, IBM BigSQL a ďalšie databázové technológie evidované pri službách.',
  },
  {
    id: 'platform-monitoring',
    name: 'Monitoring a dohľad',
    model: 'PaaS',
    category: 'Prevádzkový dohľad',
    location: 'Lamačská cesta / DC VaV Žilina',
    platformTerms: ['monitoring', 'zabbix', 'scom', 'dohľad'],
    monitoring: 'Zabbix a Microsoft SCOM 2012.',
    backup: 'Záloha konfigurácie monitoringu a pravidiel alertingu potvrdiť.',
    owner: 'OIT · monitoring a prevádzkový dohľad',
    lifecycle: 'V prevádzke',
    evidence: 'Potvrdené',
    source: 'Katalóg serverového softvéru',
    note: 'Spoločná platforma pre infraštruktúrne metriky, alerty a servisné notifikácie.',
  },
  {
    id: 'platform-hpc-bigdata',
    name: 'HPC a Big Data platformy',
    model: 'PaaS',
    category: 'Výpočtové a analytické platformy',
    location: 'DC VaV Žilina',
    platformTerms: ['hpc', 'big data', 'hortonworks', 'bigsql', 'matlab', 'comsol'],
    monitoring: 'Výkon uzlov, joby, kapacita a dostupnosť úložísk.',
    backup: 'Zálohovanie konfigurácií a dát podľa typu projektu; rozsah potvrdiť.',
    owner: 'OIT · HPC, cloud a architektúra',
    lifecycle: 'V prevádzke',
    evidence: 'Potvrdené',
    source: 'Prevádzkový report DC VaV a katalóg serverového softvéru',
    note: 'Zahŕňa výpočtové uzly, akcelerátory, riadiace uzly a analytické platformy.',
  },
  {
    id: 'platform-cloud-orchestration',
    name: 'Cloud a orchestrácia',
    model: 'PaaS',
    category: 'Cloudová platforma',
    location: 'DC VaV Žilina / cloudové služby',
    platformTerms: ['cloud', 'orchestr', 'vcloud', 'iwcloud', 'eosc'],
    monitoring: 'Dostupnosť platformy, kapacity tenantov a integračné body.',
    backup: 'Zálohy platformy a tenantov podľa poskytovanej služby.',
    owner: 'OIT · cloud, HPC a architektúra',
    lifecycle: 'V prevádzke',
    evidence: 'Potvrdené',
    source: 'Katalóg serverového softvéru a register projektov DC VaV',
    note: 'Platformová vrstva pre cloudové a orchestrátorské služby.',
  },
  {
    id: 'platform-application',
    name: 'Aplikačné a webové platformy',
    model: 'PaaS',
    category: 'Aplikačný runtime a CMS',
    location: 'Lamačská cesta / DC VaV Žilina',
    platformTerms: ['coldfusion', 'buxus', 'naviga', 'scidap', 'sk cris', 'iss', 'webjet', 'aplikač'],
    monitoring: 'Webová dostupnosť a systémový monitoring; aplikačné metriky doplniť.',
    backup: 'Aplikačné súbory, konfigurácia a databázy podľa služby.',
    owner: 'ORIS · aplikačná správa / OIT · platformová prevádzka',
    lifecycle: 'V prevádzke',
    evidence: 'Potvrdené',
    source: 'Katalóg serverového softvéru, register služieb a CMDB',
    note: 'Spoločné platformové technológie používané webmi, registrami a informačnými systémami.',
  },
]

function normalize(value: string) {
  return value.toLocaleLowerCase('sk').replace(/[^a-z0-9áäčďéíĺľňóôöŕšťúüýž]+/g, ' ').trim()
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function modelForCmdb(item: CmdbItem): TechnologyModel {
  const text = normalize(`${item.type} ${item.category} ${item.name}`)
  if (/aplikácia|aplikacia|cloudová služba|cloudova sluzba|licencia|portál|portal|cms/.test(text)) return 'SaaS'
  if (/databáza|databaza|platforma|middleware|active directory|identity|monitoring|orchestr/.test(text)) return 'PaaS'
  return 'IaaS'
}

function architectureForService(records: ArchitectureCatalogRecord[], serviceId: string) {
  return records.find(record => record.serviceIds.includes(serviceId))
}

function matchingArchitecture(records: ArchitectureCatalogRecord[], terms: string[]) {
  const normalizedTerms = terms.map(normalize)
  return records.filter(record => {
    const haystack = normalize([
      record.title,
      record.businessLayer,
      record.platform,
      record.runtimeLocation,
      ...record.oitProjects,
      ...record.serverHints,
      ...record.networkDependencies,
      ...record.oitDomains,
    ].join(' '))
    return normalizedTerms.some(term => term && haystack.includes(term))
  })
}

function fromCmdb(state: AppState, records: ArchitectureCatalogRecord[]): TechnologyItem[] {
  return state.cmdbItems.map<TechnologyItem>(item => {
    const service = state.services.find(candidate => candidate.id === item.serviceId)
    const record = architectureForService(records, item.serviceId)
    return {
      id: `cmdb-${item.id}`,
      name: item.name,
      model: modelForCmdb(item),
      category: item.category || item.type,
      kind: item.type || 'CMDB položka',
      location: item.location || record?.runtimeLocation || 'Na potvrdenie',
      environment: item.environment || record?.environment || 'Neurčené',
      platform: item.version || record?.platform || item.category || 'Na potvrdenie',
      serviceIds: item.serviceId ? [item.serviceId] : [],
      cmdbIds: [item.id],
      serverHints: uniq([item.hostname, ...(record?.serverHints || [])]),
      monitoring: item.monitoring || record?.monitoring || 'Na potvrdenie',
      backup: item.backup || record?.backup || 'Na potvrdenie',
      owner: item.technicalOwner || service?.technicalOwner || record?.oitOwnerIds.join(', ') || 'Na potvrdenie',
      lifecycle: item.lifecycle || item.status || 'Na potvrdenie',
      supportEnd: item.supportEnd || item.contractEnd || '',
      licenseEnd: item.licenseEnd || '',
      evidence: item.hostname || item.serialNumber || item.assetTag ? 'Potvrdené' : 'Odvodené',
      source: `CMDB ${item.id}${record ? ' + architektonický register' : ''}`,
      note: item.note || service?.note || record?.note || '',
    }
  })
}

function fromServices(state: AppState, cmdbServiceIds: Set<string>, records: ArchitectureCatalogRecord[]): TechnologyItem[] {
  return state.services
    .filter(service => !cmdbServiceIds.has(service.id))
    .map<TechnologyItem>(service => {
      const record = architectureForService(records, service.id)
      return {
        id: `service-${service.id}`,
        name: service.name,
        model: 'SaaS' as const,
        category: service.category || 'Aplikačná služba',
        kind: 'Služba',
        location: record?.runtimeLocation || 'Na potvrdenie',
        environment: record?.environment || 'Neurčené',
        platform: record?.platform || 'Na potvrdenie',
        serviceIds: [service.id],
        cmdbIds: [],
        serverHints: record?.serverHints || [],
        monitoring: service.monitoring || record?.monitoring || 'Na potvrdenie',
        backup: service.backup || record?.backup || 'Na potvrdenie',
        owner: service.technicalOwner || service.primary || record?.oitOwnerIds.join(', ') || 'Na potvrdenie',
        lifecycle: service.readiness || 'Na potvrdenie',
        supportEnd: '',
        licenseEnd: '',
        evidence: record ? (record.confidence === 'Potvrdené zo zdrojov' ? 'Potvrdené' : 'Odvodené') : 'Na potvrdenie',
        source: record?.evidence || 'Register služieb ORIS',
        note: service.note || record?.note || '',
      }
    })
}

function fromPlatforms(records: ArchitectureCatalogRecord[]): TechnologyItem[] {
  return platformBlueprints.map<TechnologyItem>(blueprint => {
    const matchingRecords = matchingArchitecture(records, blueprint.platformTerms)
    return {
      id: blueprint.id,
      name: blueprint.name,
      model: blueprint.model,
      category: blueprint.category,
      kind: 'Technologická platforma',
      location: blueprint.location,
      environment: 'Spoločná prevádzková platforma',
      platform: blueprint.name,
      serviceIds: uniq(matchingRecords.flatMap(record => record.serviceIds)),
      cmdbIds: [],
      serverHints: uniq(matchingRecords.flatMap(record => record.serverHints)),
      monitoring: blueprint.monitoring,
      backup: blueprint.backup,
      owner: blueprint.owner,
      lifecycle: blueprint.lifecycle,
      supportEnd: '',
      licenseEnd: '',
      evidence: blueprint.evidence,
      source: blueprint.source,
      note: blueprint.note,
    }
  })
}

function fromServerHints(records: ArchitectureCatalogRecord[]): TechnologyItem[] {
  const items: TechnologyItem[] = []
  records.forEach(record => {
    record.serverHints.forEach((hint, index) => {
      items.push({
        id: `server-${record.id}-${index}`,
        name: hint,
        model: 'IaaS',
        category: 'Server alebo serverová skupina',
        kind: 'Serverová väzba',
        location: record.runtimeLocation,
        environment: record.environment,
        platform: record.platform,
        serviceIds: record.serviceIds,
        cmdbIds: [],
        serverHints: [hint],
        monitoring: record.monitoring,
        backup: record.backup,
        owner: record.oitOwnerIds.join(', ') || 'Na potvrdenie',
        lifecycle: 'V prevádzke · potvrdiť konkrétny stav',
        supportEnd: '',
        licenseEnd: '',
        evidence: record.confidence === 'Potvrdené zo zdrojov' ? 'Potvrdené' : 'Odvodené',
        source: record.evidence,
        note: `${record.title}: ${record.note}`,
      })
    })
  })
  return items
}

export function buildTechnologyItems(state: AppState): TechnologyItem[] {
  const records = getArchitectureCatalog(state)
  const cmdb = fromCmdb(state, records)
  const cmdbServiceIds = new Set(cmdb.flatMap(item => item.serviceIds))
  return [...fromPlatforms(records), ...fromServerHints(records), ...cmdb, ...fromServices(state, cmdbServiceIds, records)]
    .sort((a, b) => a.model.localeCompare(b.model) || a.name.localeCompare(b.name, 'sk'))
}

export function evidenceTone(value: TechnologyEvidence) {
  if (value === 'Potvrdené') return 'success' as const
  if (value === 'Odvodené') return 'info' as const
  return 'warning' as const
}

export function technologySourcesSummary() {
  return {
    softwareCategories: oitData.serverSoftwareCatalog.length,
    dcRacks: new Set(oitData.rackInventory.map(item => item.rack).filter(Boolean)).size,
    lamacskaRacks: new Set(oitData.lamacskaRackInventory.map(item => item.rack).filter(Boolean)).size,
    dcDevices: oitData.rackInventory.filter(item => item.device && !/voľn|voln/i.test(item.device)).length,
    lamacskaDevices: oitData.lamacskaRackInventory.filter(item => item.device && !/voľn|voln/i.test(item.device)).length,
  }
}

export function recordsForItem(state: AppState, item: TechnologyItem): ArchitectureCatalogRecord[] {
  return getArchitectureCatalog(state).filter(record =>
    record.serviceIds.some(id => item.serviceIds.includes(id)) ||
    record.serverHints.some(hint => item.serverHints.includes(hint)),
  )
}
