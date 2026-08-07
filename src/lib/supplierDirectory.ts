import type { AppState, SupplierRecord } from '../types'
import informationSystems from '../data/informationSystems.seed.json'
import { sitPayments } from './managementIntelligence'
import { knownSupplierByIco, normalizeSupplierIco } from '../data/supplierRegistry'

interface InformationSystemSupplierRow {
  name?: string
  supplier?: string
  contractNumber?: string
  criticality?: string
  slaStatus?: string
  contractValidTo?: string
}

export interface SupplierDirectoryItem {
  key: string
  ico: string
  name: string
  source: string
  verifiedName: boolean
  amount: number
  paymentCount: number
  monthly: number[]
  tasks: string[]
  contracts: string[]
  centers: string[]
  topNotes: string[]
  systems: { name: string; criticality: string; contractNumber: string; slaStatus: string; contractValidTo: string }[]
  record: SupplierRecord | null
}

export function normalizeSupplierText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function keyFromName(name: string): string {
  const normalized = normalizeSupplierText(name).replace(/\s+/g, '-')
  return `name-${normalized || 'neznamy'}`
}

export function supplierKey(ico: unknown, name = ''): string {
  const normalizedIco = normalizeSupplierIco(ico)
  return normalizedIco || keyFromName(name)
}

function supplierNameForPayment(ico: string): { name: string; source: string; verified: boolean } {
  if (ico === 'bez-ico') return { name: 'Bez IČO / interné položky', source: 'Excel', verified: false }
  const normalizedIco = normalizeSupplierIco(ico)
  const known = knownSupplierByIco(normalizedIco)
  if (known) return { name: known.name, source: known.source, verified: true }
  return { name: `Firma / IČO ${normalizedIco || ico}`, source: 'IČO zo zdrojovej platby', verified: false }
}

function supplierNameMatches(supplier: string, itemName: string): boolean {
  const a = normalizeSupplierText(supplier)
  const b = normalizeSupplierText(itemName)
  if (!a || !b) return false
  if (a.includes(b) || b.includes(a)) return true
  const firstA = a.split(' ')[0]
  const firstB = b.split(' ')[0]
  return firstA.length >= 5 && firstA === firstB
}

function mergeUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

export function resolveSupplierName(state: AppState, icoOrKey: string, fallback = ''): string {
  const normalizedIco = normalizeSupplierIco(icoOrKey)
  const record = state.supplierRecords.find(item => (normalizedIco && normalizeSupplierIco(item.ico) === normalizedIco) || item.id === icoOrKey)
  if (record?.name) return record.name
  const known = knownSupplierByIco(normalizedIco)
  if (known) return known.name
  return fallback || (normalizedIco ? `Firma / IČO ${normalizedIco}` : icoOrKey)
}

export function buildSupplierDirectory(state: AppState): SupplierDirectoryItem[] {
  const map = new Map<string, SupplierDirectoryItem>()

  function ensure(key: string, ico: string, name: string, source: string, verifiedName: boolean): SupplierDirectoryItem {
    if (!map.has(key)) {
      map.set(key, {
        key,
        ico,
        name: name || 'Neznámy dodávateľ',
        source,
        verifiedName,
        amount: 0,
        paymentCount: 0,
        monthly: [0, 0, 0, 0, 0],
        tasks: [],
        contracts: [],
        centers: [],
        topNotes: [],
        systems: [],
        record: null,
      })
    }
    const item = map.get(key)!
    if ((!item.name || item.name.startsWith('Firma / IČO')) && name) item.name = name
    if (!item.ico && ico) item.ico = ico
    if (verifiedName) item.verifiedName = true
    if (source && !item.source.includes(source)) item.source = [item.source, source].filter(Boolean).join(' · ')
    return item
  }

  sitPayments.vendors.forEach(vendor => {
    const ico = vendor.supplierId === 'bez-ico' ? '' : normalizeSupplierIco(vendor.supplierId)
    const identity = supplierNameForPayment(vendor.supplierId)
    const key = ico || 'no-ico-payments'
    const item = ensure(key, ico, identity.name, identity.source, identity.verified)
    item.amount += vendor.amount
    item.paymentCount += vendor.paymentCount
    vendor.months.forEach((value, index) => { item.monthly[index] = (item.monthly[index] || 0) + value })
    item.tasks = mergeUnique([...item.tasks, vendor.task])
    item.contracts = mergeUnique([...item.contracts, ...vendor.contracts])
    item.centers = mergeUnique([...item.centers, ...vendor.centers])
    item.topNotes = mergeUnique([...item.topNotes, ...vendor.topNotes]).slice(0, 8)
  })

  ;(informationSystems as InformationSystemSupplierRow[]).forEach(system => {
    const supplier = String(system.supplier || '').trim()
    if (!supplier) return
    const existing = [...map.values()].find(item => supplierNameMatches(supplier, item.name))
    const key = existing?.key || keyFromName(supplier)
    const item = existing || ensure(key, '', supplier, 'Register informačných systémov', false)
    if (!item.source.includes('Register informačných systémov')) item.source = `${item.source} · Register informačných systémov`
    if (!item.systems.some(value => value.name === system.name)) {
      item.systems.push({
        name: String(system.name || 'IS bez názvu'),
        criticality: String(system.criticality || ''),
        contractNumber: String(system.contractNumber || ''),
        slaStatus: String(system.slaStatus || ''),
        contractValidTo: String(system.contractValidTo || ''),
      })
    }
  })

  state.supplierRecords.forEach(record => {
    const ico = normalizeSupplierIco(record.ico)
    const key = record.id || supplierKey(ico, record.name)
    let item = ico ? [...map.values()].find(value => normalizeSupplierIco(value.ico) === ico) : map.get(key)
    if (!item && record.name) item = [...map.values()].find(value => supplierNameMatches(record.name, value.name))
    if (!item) item = ensure(key, ico, record.name, record.source || 'Manuálna evidencia', Boolean(ico && knownSupplierByIco(ico)))
    item.record = record
    if (record.name) item.name = record.name
    if (ico) item.ico = ico
    if (record.source && !item.source.includes(record.source)) item.source = `${item.source} · ${record.source}`
  })

  return [...map.values()]
    .map(item => ({
      ...item,
      tasks: item.tasks.sort(),
      contracts: item.contracts.sort((a, b) => a.localeCompare(b, 'sk')),
      centers: item.centers.sort(),
      systems: item.systems.sort((a, b) => a.name.localeCompare(b.name, 'sk')),
    }))
    .sort((a, b) => b.amount - a.amount || b.systems.length - a.systems.length || a.name.localeCompare(b.name, 'sk'))
}
