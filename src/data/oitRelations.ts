import type { IconName } from '../components/UI'

export interface OitRelationDomain {
  id: string
  title: string
  shortTitle: string
  description: string
  location: string
  icon: IconName
  tone: 'blue' | 'green' | 'purple' | 'gold' | 'red'
  ownerIds: string[]
  keywords: string[]
  targetViews: { view: string; label: string; icon: IconName }[]
}

export const oitRelationDomains: OitRelationDomain[] = [
  {
    id: 'infrastructure',
    title: 'Dátové centrá a serverová infraštruktúra',
    shortTitle: 'DC a infraštruktúra',
    description: 'Racky, servery, virtualizácia, úložiská, HPC a prevádzkové lokality DC VaV Žilina a Lamačská cesta.',
    location: 'DC VaV Žilina · Lamačská cesta · Teslova',
    icon: 'database',
    tone: 'green',
    ownerIds: ['RB', 'MD', 'AP', 'PM', 'ŠK', 'JL'],
    keywords: ['dátové centrum', 'datove centrum', 'serverov', 'server', 'rack', 'vmware', 'virtual', 'storage', 'úlož', 'uloz', 'hpc', 'big sql', 'spectrum protect', 'žilina', 'zilina', 'lamač', 'lamac', 'teslova'],
    targetViews: [
      { view: 'oitDc', label: 'Dátové centrá', icon: 'database' },
      { view: 'cmdb', label: 'CMDB', icon: 'cmdb' },
      { view: 'changes', label: 'Zmeny', icon: 'change' },
    ],
  },
  {
    id: 'network',
    title: 'Sieťová infraštruktúra a bezpečnosť',
    shortTitle: 'Sieť a bezpečnosť',
    description: 'Core a access prvky, firewally, load balancery, internetové a OOB prepojenia, DNS, RADIUS a VPN.',
    location: 'Obe lokality · WAN · OOB',
    icon: 'web',
    tone: 'blue',
    ownerIds: ['MŽ', 'JL', 'PM', 'ŠK'],
    keywords: ['sieť', 'siet', 'network', 'firewall', 'forti', 'vpn', 'vlan', 'router', 'switch', 'prepína', 'prepinac', 'dns', 'radius', 'load balanc', 'internet', 'wan', 'oob', 'wifi', 'wi-fi'],
    targetViews: [
      { view: 'oitNetwork', label: 'Topológie', icon: 'web' },
      { view: 'cmdb', label: 'CMDB', icon: 'cmdb' },
      { view: 'risks', label: 'Riziká', icon: 'risk' },
    ],
  },
  {
    id: 'identity',
    title: 'Identity, účty a prístupové služby',
    shortTitle: 'Identity a prístupy',
    description: 'Active Directory, používateľské účty, autentifikácia, oprávnenia, privilegované prístupy a recertifikácia.',
    location: 'Lamačská cesta · Teslova · cloud',
    icon: 'iam',
    tone: 'purple',
    ownerIds: ['VŠ', 'JL', 'ŠK', 'MK'],
    keywords: ['active directory', 'identity', 'identit', 'iam', 'prístup', 'pristup', 'účt', 'uct', 'ldap', 'sso', 'mfa', 'hesl', 'autent', 'radius'],
    targetViews: [
      { view: 'iam', label: 'IAM', icon: 'iam' },
      { view: 'services', label: 'Služby', icon: 'services' },
      { view: 'risks', label: 'Riziká', icon: 'risk' },
    ],
  },
  {
    id: 'continuity',
    title: 'Monitoring, zálohovanie a kontinuita',
    shortTitle: 'Kontinuita prevádzky',
    description: 'Monitoring, alerting, zálohy, disaster recovery, napájanie, UPS, chladenie a režim servisných zásahov.',
    location: 'DC VaV Žilina · Lamačská cesta',
    icon: 'shield',
    tone: 'red',
    ownerIds: ['PM', 'ŠK', 'JL', 'RB', 'MD', 'AP'],
    keywords: ['monitor', 'zabbix', 'scom', 'záloh', 'zaloh', 'backup', 'disaster', 'recovery', 'kontinuit', 'ups', 'generátor', 'generator', 'chladen', 'klimatiz', 'hasi', 'alert', 'spectrum protect'],
    targetViews: [
      { view: 'oitOperations', label: 'Prevádzka', icon: 'risk' },
      { view: 'problems', label: 'Problémy', icon: 'problem' },
      { view: 'helpdesk', label: 'ServiceDesk', icon: 'helpdesk' },
    ],
  },
  {
    id: 'platforms',
    title: 'Aplikačné, dátové a cloudové platformy',
    shortTitle: 'Platformy a systémy',
    description: 'Databázy, operačné systémy, cloud, HPC, integračné a aplikačné platformy prevádzkované OIT.',
    location: 'Serverovne · cloud · aplikačné prostredia',
    icon: 'systems',
    tone: 'gold',
    ownerIds: ['JL', 'ŠK', 'PM', 'VŠ', 'MK'],
    keywords: ['aplik', 'systém', 'system', 'datab', 'sql', 'cloud', 'hpc', 'big data', 'coldfusion', 'matlab', 'linux', 'windows server', 'operačný systém', 'operacny system', 'projekt', 'web'],
    targetViews: [
      { view: 'oitSystems', label: 'Systémy OIT', icon: 'systems' },
      { view: 'work', label: 'Projekty', icon: 'projects' },
      { view: 'cmdb', label: 'CMDB', icon: 'cmdb' },
    ],
  },
]

export function normalizeRelationText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function relationText(...values: unknown[]): string {
  return normalizeRelationText(values.flat(Infinity).filter(Boolean).join(' '))
}

export function matchesOitDomain(domain: OitRelationDomain, text: string): boolean {
  const normalized = normalizeRelationText(text)
  return domain.keywords.some((keyword) => normalized.includes(normalizeRelationText(keyword)))
}
