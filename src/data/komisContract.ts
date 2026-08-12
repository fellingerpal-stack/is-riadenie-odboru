export interface KomisContractModule {
  id: string
  code: string
  title: string
  aliases: string[]
  entityIds: string[]
  developmentNet: number
  developmentGross: number
  slaQuarterlyNet: number
  slaQuarterlyGross: number
  slaMonthlyNet: number
  slaMonthlyGross: number
  sla84Net: number
  sla84Gross: number
  supportMonths: number
  supportQuarters: number
}

export interface KomisContractSummary {
  sourceUrl: string
  sourceLabel: string
  supplier: string
  customer: string
  vatRate: number
  supportMonths: number
  supportQuarters: number
  developmentNet: number
  developmentGross: number
  sla84Net: number
  sla84Gross: number
  slaMonthlyNet: number
  slaMonthlyGross: number
  operationsFrameworkHours: number
  operationsFrameworkHourlyNet: number
  operationsFrameworkNet: number
  operationsFrameworkGross: number
  contractNet: number
  contractVat: number
  contractGross: number
  modules: KomisContractModule[]
}

const VAT_RATE = 0.20
const SUPPORT_QUARTERS = 28
const SUPPORT_MONTHS = 84

function moduleRow(
  id: string,
  code: string,
  title: string,
  aliases: string[],
  entityIds: string[],
  developmentNet: number,
  slaQuarterlyNet: number,
): KomisContractModule {
  const sla84Net = slaQuarterlyNet * SUPPORT_QUARTERS
  return {
    id,
    code,
    title,
    aliases,
    entityIds,
    developmentNet,
    developmentGross: developmentNet * (1 + VAT_RATE),
    slaQuarterlyNet,
    slaQuarterlyGross: slaQuarterlyNet * (1 + VAT_RATE),
    slaMonthlyNet: slaQuarterlyNet / 3,
    slaMonthlyGross: slaQuarterlyNet * (1 + VAT_RATE) / 3,
    sla84Net,
    sla84Gross: sla84Net * (1 + VAT_RATE),
    supportMonths: SUPPORT_MONTHS,
    supportQuarters: SUPPORT_QUARTERS,
  }
}

const modules: KomisContractModule[] = [
  moduleRow(
    'primo',
    'PRIMO',
    'PRIMO · discovery, OpenURL, ERMs a vzdialený prístup',
    ['PRIMO', 'Discovery', 'OpenURL', 'ERMS', 'vzdialený prístup'],
    [],
    687680,
    2750,
  ),
  moduleRow(
    'crepc',
    'CREPČ',
    'Centrálny register evidencie publikačnej činnosti',
    ['CREPČ', 'CREPC', 'Centrálny register evidencie publikačnej činnosti'],
    [],
    153400,
    2850,
  ),
  moduleRow(
    'creuc',
    'CREUČ',
    'Centrálny register evidencie umeleckej činnosti',
    ['CREUČ', 'CREUC', 'Centrálny register evidencie umeleckej činnosti'],
    [],
    109520,
    2850,
  ),
  moduleRow(
    'skcris',
    'SK CRIS',
    'Informačný systém o vede a výskume · SK CRIS / CIP VVI',
    ['SK CRIS', 'SKCRIS', 'CIP VVI', 'IS o vede a výskume', 'VedaTechnika', 'RVVI'],
    ['rvvi'],
    728320,
    6750,
  ),
  moduleRow(
    'crzp-antiplag',
    'CRZP / ANTIPLAG',
    'Centrálny register záverečných prác a antiplagiátorský systém',
    ['CRZP', 'ANTIPLAG', 'APS', 'Centrálny register záverečných prác', 'Antiplagiátorský systém'],
    ['crzp-aps'],
    218040,
    4600,
  ),
  moduleRow(
    'scidap',
    'SCIDAP',
    'SCIDAP',
    ['SCIDAP', 'SciDAP'],
    ['scidap'],
    748760,
    4500,
  ),
  moduleRow(
    'svd',
    'SVD',
    'Správa výskumných dát',
    ['SVD', 'Správa výskumných dát'],
    ['scidap'],
    489160,
    2400,
  ),
  moduleRow(
    'open-access',
    'OPEN ACCESS',
    'Open Access publikačná platforma',
    ['Open Access', 'Open Access publikačná platforma'],
    [],
    627040,
    4500,
  ),
  moduleRow(
    'analytics',
    'ANALYTIKA',
    'Analytický modul pre hodnotenie vedy',
    ['Analytický modul', 'Analytika', 'hodnotenie vedy'],
    [],
    346040,
    2100,
  ),
  moduleRow(
    'presentation',
    'PREZENTAČNÁ PLATFORMA',
    'Prezentačná platforma',
    ['Prezentačná platforma', 'Prezentačná platforma KOMIS'],
    [],
    124280,
    1500,
  ),
  moduleRow(
    'iss',
    'ISS CVTI SR',
    'Integrovaný systém služieb CVTI SR · frontend, middleware, midPoint a JIRA',
    ['ISS', 'ISS CVTI SR', 'Integrovaný systém služieb', 'midPoint', 'JIRA'],
    ['iss'],
    328280,
    5400,
  ),
  moduleRow(
    'central-components',
    'CENTRÁLNE KOMPONENTY',
    'Centrálne funkčné komponenty a integračná orchestrácia KOMIS',
    ['Centrálne komponenty', 'centrálne funkčné komponenty', 'integračná orchestrácia'],
    ['komis'],
    626120,
    5750,
  ),
]

const developmentNet = modules.reduce((sum, item) => sum + item.developmentNet, 0)
const sla84Net = modules.reduce((sum, item) => sum + item.sla84Net, 0)
const slaMonthlyNet = modules.reduce((sum, item) => sum + item.slaMonthlyNet, 0)
const operationsFrameworkHours = 7000
const operationsFrameworkHourlyNet = 55
const operationsFrameworkNet = operationsFrameworkHours * operationsFrameworkHourlyNet

export const komisContract: KomisContractSummary = {
  sourceUrl: 'https://crz.gov.sk/data/att/4838476_dokument1.pdf',
  sourceLabel: 'CRZ · KOMIS · Príloha č. 1 SP – Štruktúrovaný rozpočet ceny',
  supplier: 'InterWay, a. s.',
  customer: 'Centrum vedecko-technických informácií SR',
  vatRate: VAT_RATE,
  supportMonths: SUPPORT_MONTHS,
  supportQuarters: SUPPORT_QUARTERS,
  developmentNet,
  developmentGross: developmentNet * (1 + VAT_RATE),
  sla84Net,
  sla84Gross: sla84Net * (1 + VAT_RATE),
  slaMonthlyNet,
  slaMonthlyGross: slaMonthlyNet * (1 + VAT_RATE),
  operationsFrameworkHours,
  operationsFrameworkHourlyNet,
  operationsFrameworkNet,
  operationsFrameworkGross: operationsFrameworkNet * (1 + VAT_RATE),
  contractNet: 6858240,
  contractVat: 1371648,
  contractGross: 8229888,
  modules,
}

export function komisModulesForEntity(entityId: string): KomisContractModule[] {
  if (entityId === 'komis') return komisContract.modules
  return komisContract.modules.filter(item => item.entityIds.includes(entityId))
}

export function komisModuleSearchText(module: KomisContractModule): string {
  return [module.code, module.title, ...module.aliases].join(' ')
}
