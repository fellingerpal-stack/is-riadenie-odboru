import contractPayments from '../data/contractPayments.json'
import type { AppState, ContractRecord } from '../types'
import { buildSupplierDirectory, normalizeSupplierText, supplierKey } from './supplierDirectory'
import { knownSupplierByIco, normalizeSupplierIco } from '../data/supplierRegistry'

interface PaymentContractRow {
  task: string
  ref: string
  amount: number
  paymentCount: number
  supplierIds: string[]
  centers: string[]
  topNotes: string[]
}

export interface ContractView {
  id: string
  canonicalKey: string
  contractNumber: string
  aliases: string[]
  title: string
  supplierKey: string
  supplierIco: string
  supplierName: string
  status: ContractRecord['status'] | 'Zdrojový záznam'
  validFrom: string
  validTo: string
  daysToEnd: number | null
  noticePeriodDays: number
  procurementLeadDays: number
  renewalType: ContractRecord['renewalType'] | ''
  renewalStart: string
  renewalState: 'Po termíne' | 'Začať teraz' | 'Do 90 dní' | 'Neskôr' | 'Chýba termín'
  owner: string
  systemNames: string[]
  serviceIds: string[]
  tasks: string[]
  centers: string[]
  spentYtd: number
  paymentCount: number
  annualValue: number
  totalValue: number
  slaRequired: boolean
  slaTarget: string
  slaStatus: string
  crzUrl: string
  dmsUrl: string
  note: string
  source: string[]
  topNotes: string[]
  managed: ContractRecord | null
}

function uniq(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))]
}

function parseIsoDate(value: string): Date | null {
  const trimmed = String(value || '').trim()
  if (!trimmed || /neuved|neznam|—|-/.test(normalizeSupplierText(trimmed))) return null
  const direct = new Date(trimmed)
  if (!Number.isNaN(direct.getTime())) return direct
  const match = trimmed.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/)
  if (!match) return null
  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function isoDate(date: Date | null): string {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function usableContractRef(value: string): boolean {
  const normalized = normalizeSupplierText(value)
  if (!normalized) return false
  return !['n a','na','neuvedene','neuvedena','nezname','bez zmluvy'].includes(normalized)
    && !normalized.includes('udaj nie je')
    && !normalized.includes('nie je ohv znamy')
}

function contractTokens(value: string): string[] {
  return String(value || '').toUpperCase().match(/\d+/g) || []
}

export function canonicalContractRef(value: string): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const tokens = contractTokens(raw)
  if (tokens.length >= 2) return `${tokens[0]}/${tokens[tokens.length - 1]}`
  return normalizeSupplierText(raw).replace(/\s+/g, '-')
}

function contractGroupKey(supplierIdentity: string, contractNumber: string) {
  return `${supplierIdentity || 'unknown'}::${canonicalContractRef(contractNumber) || normalizeSupplierText(contractNumber) || 'without-ref'}`
}

function findSupplierName(ico: string, fallback = '') {
  const known = knownSupplierByIco(ico)
  return known?.name || fallback || (ico ? `Firma / IČO ${ico}` : 'Dodávateľ neurčený')
}

function inferRenewal(view: ContractView, today: Date): Pick<ContractView, 'daysToEnd' | 'renewalStart' | 'renewalState'> {
  const end = parseIsoDate(view.validTo)
  if (!end) return { daysToEnd: null, renewalStart: '', renewalState: 'Chýba termín' }
  const msDay = 86_400_000
  const daysToEnd = Math.ceil((end.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / msDay)
  const lead = Math.max(view.noticePeriodDays || 0, view.procurementLeadDays || 0)
  const start = new Date(end)
  start.setDate(start.getDate() - lead)
  const daysToStart = Math.ceil((start.getTime() - today.getTime()) / msDay)
  const renewalState: ContractView['renewalState'] = daysToEnd < 0 ? 'Po termíne' : daysToStart <= 0 ? 'Začať teraz' : daysToStart <= 90 ? 'Do 90 dní' : 'Neskôr'
  return { daysToEnd, renewalStart: isoDate(start), renewalState }
}

function normalizeContractRecord(record: ContractRecord): ContractRecord {
  return {
    ...record,
    supplierIco: normalizeSupplierIco(record.supplierIco),
    supplierKey: record.supplierKey || supplierKey(record.supplierIco, record.supplierName),
    noticePeriodDays: Number(record.noticePeriodDays || 0),
    procurementLeadDays: Number(record.procurementLeadDays || 0),
    annualValue: Number(record.annualValue || 0),
    totalValue: Number(record.totalValue || 0),
    spentYtd: Number(record.spentYtd || 0),
  }
}

export function buildContractDirectory(state: AppState, today = new Date()): ContractView[] {
  const supplierDirectory = buildSupplierDirectory(state)
  const map = new Map<string, ContractView>()

  function ensure(supplierIdentity: string, contractNumber: string, supplierIco = '', supplierName = ''): ContractView {
    const normalizedIco = normalizeSupplierIco(supplierIco)
    const effectiveKey = supplierIdentity || supplierKey(normalizedIco, supplierName)
    const key = contractGroupKey(effectiveKey, contractNumber)
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        canonicalKey: key,
        contractNumber: contractNumber || 'Bez čísla zmluvy',
        aliases: contractNumber ? [contractNumber] : [],
        title: '',
        supplierKey: effectiveKey,
        supplierIco: normalizedIco,
        supplierName: findSupplierName(normalizedIco, supplierName),
        status: 'Zdrojový záznam',
        validFrom: '',
        validTo: '',
        daysToEnd: null,
        noticePeriodDays: 60,
        procurementLeadDays: 120,
        renewalType: '',
        renewalStart: '',
        renewalState: 'Chýba termín',
        owner: '',
        systemNames: [],
        serviceIds: [],
        tasks: [],
        centers: [],
        spentYtd: 0,
        paymentCount: 0,
        annualValue: 0,
        totalValue: 0,
        slaRequired: false,
        slaTarget: '',
        slaStatus: '',
        crzUrl: '',
        dmsUrl: '',
        note: '',
        source: [],
        topNotes: [],
        managed: null,
      })
    }
    const item = map.get(key)!
    if (!item.supplierIco && normalizedIco) item.supplierIco = normalizedIco
    if ((!item.supplierName || item.supplierName.startsWith('Firma / IČO')) && supplierName) item.supplierName = supplierName
    if (contractNumber && !item.aliases.includes(contractNumber)) item.aliases.push(contractNumber)
    return item
  }

  ;((contractPayments as { contracts?: PaymentContractRow[] }).contracts || []).forEach(row => {
    const supplierIds = (row.supplierIds || []).map(normalizeSupplierIco).filter(Boolean)
    if (!supplierIds.length) {
      const item = ensure('payment-unassigned', row.ref, '', 'Dodávateľ neurčený')
      item.spentYtd += Number(row.amount || 0)
      item.paymentCount += Number(row.paymentCount || 0)
      item.tasks = uniq([...item.tasks, row.task])
      item.centers = uniq([...item.centers, ...(row.centers || [])])
      item.topNotes = uniq([...item.topNotes, ...(row.topNotes || [])]).slice(0, 10)
      item.source = uniq([...item.source, 'SIT 2026 – platby'])
      return
    }
    supplierIds.forEach(ico => {
      const supplier = supplierDirectory.find(item => normalizeSupplierIco(item.ico) === ico)
      const item = ensure(supplier?.key || ico, row.ref, ico, supplier?.name || '')
      // Ak má riadok viac dodávateľov, nechceme plnú sumu započítať každému.
      item.spentYtd += Number(row.amount || 0) / supplierIds.length
      item.paymentCount += Math.max(1, Math.round(Number(row.paymentCount || 0) / supplierIds.length))
      item.tasks = uniq([...item.tasks, row.task])
      item.centers = uniq([...item.centers, ...(row.centers || [])])
      item.topNotes = uniq([...item.topNotes, ...(row.topNotes || [])]).slice(0, 10)
      item.source = uniq([...item.source, 'SIT 2026 – platby'])
    })
  })

  supplierDirectory.forEach(supplier => {
    supplier.relationships.filter(relation => relation.status !== 'Zamietnuté' && usableContractRef(relation.contractNumber)).forEach(relation => {
      const item = ensure(supplier.key, relation.contractNumber, supplier.ico, supplier.name)
      item.systemNames = uniq([...item.systemNames, relation.targetName, relation.parentSystem])
      if (relation.targetId) item.serviceIds = uniq([...item.serviceIds, relation.targetId])
      if (!item.validFrom && relation.validFrom) item.validFrom = relation.validFrom
      if (!item.validTo && relation.validTo) item.validTo = relation.validTo
      item.source = uniq([...item.source, relation.origin === 'source' ? 'Register informačných systémov' : relation.source || 'Supplier Relationships'])
    })
    supplier.systems.filter(system => usableContractRef(system.contractNumber)).forEach(system => {
      const item = ensure(supplier.key, system.contractNumber, supplier.ico, supplier.name)
      item.systemNames = uniq([...item.systemNames, system.name])
      if (!item.validTo && system.contractValidTo) item.validTo = system.contractValidTo
      if (!item.slaStatus && system.slaStatus) item.slaStatus = system.slaStatus
      item.source = uniq([...item.source, 'Register informačných systémov'])
    })
  })

  ;(state.contractRecords || []).map(normalizeContractRecord).forEach(record => {
    const identity = record.supplierKey || supplierKey(record.supplierIco, record.supplierName)
    const item = ensure(identity || `managed-${record.id}`, record.contractNumber || `MANAGED-${record.id}`, record.supplierIco, record.supplierName)
    item.id = record.id
    item.title = record.title
    item.status = record.status
    item.validFrom = record.validFrom || item.validFrom
    item.validTo = record.validTo || item.validTo
    item.noticePeriodDays = record.noticePeriodDays
    item.procurementLeadDays = record.procurementLeadDays
    item.renewalType = record.renewalType
    item.owner = record.owner
    item.systemNames = uniq([...item.systemNames, ...(record.systemNames || [])])
    item.serviceIds = uniq([...item.serviceIds, ...(record.serviceIds || [])])
    item.tasks = uniq([...item.tasks, record.task])
    item.annualValue = record.annualValue
    item.totalValue = record.totalValue
    if (record.spentYtd) item.spentYtd = record.spentYtd
    item.slaRequired = record.slaRequired
    item.slaTarget = record.slaTarget
    item.slaStatus = record.slaStatus || item.slaStatus
    item.crzUrl = record.crzUrl
    item.dmsUrl = record.dmsUrl
    item.note = record.note
    item.source = uniq([...item.source, 'Spravovaný register zmlúv'])
    item.managed = record
  })

  return [...map.values()]
    .map(item => ({ ...item, ...inferRenewal(item, today), aliases: uniq(item.aliases), source: uniq(item.source) }))
    .sort((a, b) => {
      const riskRank = (value: ContractView['renewalState']) => value === 'Po termíne' ? 0 : value === 'Začať teraz' ? 1 : value === 'Do 90 dní' ? 2 : value === 'Chýba termín' ? 3 : 4
      const risk = riskRank(a.renewalState) - riskRank(b.renewalState)
      if (risk) return risk
      return b.spentYtd - a.spentYtd || a.contractNumber.localeCompare(b.contractNumber, 'sk')
    })
}

export function emptyContractRecord(view?: ContractView | null): ContractRecord {
  return {
    id: view?.managed?.id || crypto.randomUUID(),
    contractNumber: view && view.contractNumber !== 'Bez čísla zmluvy' ? view.contractNumber : '',
    title: view?.title || view?.topNotes?.[0] || '',
    supplierKey: view?.supplierKey || '',
    supplierIco: view?.supplierIco || '',
    supplierName: view?.supplierName || '',
    status: view?.managed?.status || (view?.renewalState === 'Po termíne' ? 'Príprava obnovy' : 'Aktívna'),
    validFrom: view?.validFrom || '',
    validTo: view?.validTo || '',
    noticePeriodDays: view?.noticePeriodDays || 60,
    procurementLeadDays: view?.procurementLeadDays || 120,
    renewalType: view?.managed?.renewalType || 'Manuálne rozhodnutie',
    owner: view?.owner || '',
    serviceIds: view?.serviceIds || [],
    systemNames: view?.systemNames || [],
    task: view?.tasks?.[0] || '',
    annualValue: view?.annualValue || 0,
    totalValue: view?.totalValue || 0,
    spentYtd: view?.spentYtd || 0,
    slaRequired: view?.slaRequired || Boolean(view?.slaStatus),
    slaTarget: view?.slaTarget || '',
    slaStatus: view?.slaStatus || '',
    crzUrl: view?.crzUrl || '',
    dmsUrl: view?.dmsUrl || '',
    note: view?.note || '',
    updatedAt: view?.managed?.updatedAt || '',
    updatedBy: view?.managed?.updatedBy || '',
  }
}
