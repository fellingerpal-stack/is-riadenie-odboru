import type { AppState, SupplierRecord, SupplierRelationship } from '../types'
import informationSystems from '../data/informationSystems.seed.json'
import { supplierRelationshipCandidates } from '../data/supplierRelationshipCandidates'
import { sitPayments } from './managementIntelligence'
import { knownSupplierByIco, normalizeSupplierIco } from '../data/supplierRegistry'
import supplierPaymentHistory from '../data/supplierPaymentsHistory.json'

interface InformationSystemSupplierRow {
  sourceKey?: string
  name?: string
  supplier?: string
  contractNumber?: string
  criticality?: string
  slaStatus?: string
  contractValidTo?: string
  notes?: string
}

export interface SupplierRelationshipView extends SupplierRelationship {
  origin: 'source' | 'candidate' | 'managed'
  criticality: string
  locked: boolean
}

export interface SupplierLedgerYear {
  year: number
  amount: number
  movementCount: number
  positiveAmount: number
  negativeAmount: number
  correctionCount: number
  monthly: number[]
  contracts: string[]
  centers: string[]
  kpd: string[]
  topNotes: string[]
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
  ledgerAmount: number
  ledgerMovementCount: number
  ledgerPositiveAmount: number
  ledgerNegativeAmount: number
  ledgerCorrectionCount: number
  ledgerYears: SupplierLedgerYear[]
  ledgerContracts: string[]
  ledgerCenters: string[]
  ledgerKpd: string[]
  ledgerTopNotes: string[]
  ledgerFirstDate: string
  ledgerLastDate: string
  systems: { name: string; criticality: string; contractNumber: string; slaStatus: string; contractValidTo: string }[]
  relationships: SupplierRelationshipView[]
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

function relationshipFingerprint(relationship: Pick<SupplierRelationship, 'targetType' | 'targetName' | 'parentSystem'>): string {
  return [relationship.targetType, relationship.targetName, relationship.parentSystem]
    .map(normalizeSupplierText)
    .join('|')
}

function parentSystemForSource(system: InformationSystemSupplierRow): string {
  const name = normalizeSupplierText(system.name)
  const notes = normalizeSupplierText(system.notes)
  const contract = normalizeSupplierText(system.contractNumber)
  if (name.includes('crepc') || name.includes('creuc') || notes.includes('komis') || contract.includes('komis')) return 'IS KOMIS'
  return ''
}

function sourceRole(supplier: string): string {
  const normalized = normalizeSupplierText(supplier)
  if (normalized.includes('subdodavatel')) return 'Subdodávateľ / technická podpora'
  return 'Dodávateľ IS'
}

function relationshipPriority(origin: SupplierRelationshipView['origin']): number {
  if (origin === 'managed') return 3
  if (origin === 'source') return 2
  return 1
}

export function resolveSupplierName(state: AppState, icoOrKey: string, fallback = ''): string {
  const normalizedIco = normalizeSupplierIco(icoOrKey)
  const record = state.supplierRecords.find(item => (normalizedIco && normalizeSupplierIco(item.ico) === normalizedIco) || item.id === icoOrKey)
  if (record?.name) return record.name
  const known = knownSupplierByIco(normalizedIco)
  if (known) return known.name
  return fallback || (normalizedIco ? `Firma / IČO ${normalizedIco}` : icoOrKey)
}

interface SupplierLedgerVendorRow {
  supplierId: string
  amount: number
  movementCount: number
  positiveAmount: number
  negativeAmount: number
  correctionCount: number
  years: SupplierLedgerYear[]
  contracts: string[]
  centers: string[]
  kpd: string[]
  topNotes: string[]
  firstDate: string
  lastDate: string
}

const supplierLedger = supplierPaymentHistory as { vendors: SupplierLedgerVendorRow[] }

export function buildSupplierDirectory(state: AppState): SupplierDirectoryItem[] {
  const map = new Map<string, SupplierDirectoryItem>()
  const serviceCriticality = new Map((state.services || []).map(service => [service.id, service.criticality || '']))

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
        ledgerAmount: 0,
        ledgerMovementCount: 0,
        ledgerPositiveAmount: 0,
        ledgerNegativeAmount: 0,
        ledgerCorrectionCount: 0,
        ledgerYears: [],
        ledgerContracts: [],
        ledgerCenters: [],
        ledgerKpd: [],
        ledgerTopNotes: [],
        ledgerFirstDate: '',
        ledgerLastDate: '',
        systems: [],
        relationships: [],
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

  function findSupplier(ico: string, name: string, key = ''): SupplierDirectoryItem | undefined {
    const normalizedIco = normalizeSupplierIco(ico)
    if (normalizedIco) {
      const byIco = [...map.values()].find(item => normalizeSupplierIco(item.ico) === normalizedIco)
      if (byIco) return byIco
    }
    if (key && map.has(key)) return map.get(key)
    if (name) return [...map.values()].find(item => supplierNameMatches(name, item.name))
    return undefined
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

  supplierLedger.vendors.forEach(vendor => {
    const ico = normalizeSupplierIco(vendor.supplierId)
    if (!ico) return
    const identity = supplierNameForPayment(ico)
    const item = ensure(ico, ico, identity.name, `${identity.source} · účtovný XLSX ledger`, identity.verified)
    item.ledgerAmount = Number(vendor.amount || 0)
    item.ledgerMovementCount = Number(vendor.movementCount || 0)
    item.ledgerPositiveAmount = Number(vendor.positiveAmount || 0)
    item.ledgerNegativeAmount = Number(vendor.negativeAmount || 0)
    item.ledgerCorrectionCount = Number(vendor.correctionCount || 0)
    item.ledgerYears = (vendor.years || []).map(year => ({ ...year, monthly: [...(year.monthly || [])] }))
    item.ledgerContracts = mergeUnique(vendor.contracts || [])
    item.ledgerCenters = mergeUnique(vendor.centers || [])
    item.ledgerKpd = mergeUnique(vendor.kpd || [])
    item.ledgerTopNotes = mergeUnique(vendor.topNotes || []).slice(0, 10)
    item.ledgerFirstDate = vendor.firstDate || ''
    item.ledgerLastDate = vendor.lastDate || ''
  })

  ;(informationSystems as InformationSystemSupplierRow[]).forEach(system => {
    const supplier = String(system.supplier || '').trim()
    if (!supplier) return
    const existing = [...map.values()].find(item => supplierNameMatches(supplier, item.name))
    const key = existing?.key || keyFromName(supplier)
    const item = existing || ensure(key, '', supplier, 'Register informačných systémov', false)
    if (!item.source.includes('Register informačných systémov')) item.source = `${item.source} · Register informačných systémov`
    const systemName = String(system.name || 'IS bez názvu')
    if (!item.systems.some(value => value.name === systemName)) {
      item.systems.push({
        name: systemName,
        criticality: String(system.criticality || ''),
        contractNumber: String(system.contractNumber || ''),
        slaStatus: String(system.slaStatus || ''),
        contractValidTo: String(system.contractValidTo || ''),
      })
    }
    item.relationships.push({
      id: `source-${String(system.sourceKey || systemName).replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase()}`,
      supplierKey: item.key,
      supplierIco: item.ico,
      supplierName: item.name,
      targetType: 'Informačný systém',
      targetId: String(system.sourceKey || ''),
      targetName: systemName,
      parentSystem: parentSystemForSource(system),
      role: sourceRole(supplier),
      contractNumber: String(system.contractNumber || ''),
      validFrom: '',
      validTo: String(system.contractValidTo || ''),
      source: 'Register informačných systémov',
      evidence: `Dodávateľ je explicitne uvedený pri informačnom systéme ako „${supplier}“.`,
      confidence: 'Zdrojové',
      status: 'Potvrdené',
      note: '',
      updatedAt: '',
      updatedBy: '',
      origin: 'source',
      criticality: String(system.criticality || ''),
      locked: true,
    })
  })

  state.supplierRecords.forEach(record => {
    const ico = normalizeSupplierIco(record.ico)
    const key = record.id || supplierKey(ico, record.name)
    let item = findSupplier(ico, record.name, key)
    if (!item) item = ensure(key, ico, record.name, record.source || 'Manuálna evidencia', Boolean(ico && knownSupplierByIco(ico)))
    item.record = record
    if (record.name) item.name = record.name
    if (ico) item.ico = ico
    if (record.source && !item.source.includes(record.source)) item.source = `${item.source} · ${record.source}`
  })

  supplierRelationshipCandidates.forEach(candidate => {
    const ico = normalizeSupplierIco(candidate.supplierIco)
    const known = knownSupplierByIco(ico)
    const key = candidate.supplierKey || supplierKey(ico, candidate.supplierName)
    const item = findSupplier(ico, candidate.supplierName, key) || ensure(key, ico, candidate.supplierName, candidate.source, Boolean(known))
    item.relationships.push({
      ...candidate,
      supplierKey: item.key,
      supplierIco: item.ico || ico,
      supplierName: item.name || candidate.supplierName,
      origin: 'candidate',
      criticality: candidate.targetId ? serviceCriticality.get(candidate.targetId) || '' : '',
      locked: false,
    })
  })

  ;(state.supplierRelationships || []).forEach(relationship => {
    const ico = normalizeSupplierIco(relationship.supplierIco)
    const key = relationship.supplierKey || supplierKey(ico, relationship.supplierName)
    const known = knownSupplierByIco(ico)
    const item = findSupplier(ico, relationship.supplierName, key) || ensure(key, ico, relationship.supplierName || known?.name || '', relationship.source || 'Manuálna evidencia', Boolean(known))
    item.relationships.push({
      ...relationship,
      supplierKey: item.key,
      supplierIco: item.ico || ico,
      supplierName: item.name || relationship.supplierName,
      origin: 'managed',
      criticality: relationship.targetId ? serviceCriticality.get(relationship.targetId) || '' : '',
      locked: false,
    })
  })

  return [...map.values()]
    .map(item => {
      const relationshipMap = new Map<string, SupplierRelationshipView>()
      item.relationships.forEach(relationship => {
        const fingerprint = relationshipFingerprint(relationship)
        const existing = relationshipMap.get(fingerprint)
        if (!existing || relationshipPriority(relationship.origin) > relationshipPriority(existing.origin)) relationshipMap.set(fingerprint, relationship)
      })
      return {
        ...item,
        tasks: item.tasks.sort(),
        contracts: item.contracts.sort((a, b) => a.localeCompare(b, 'sk')),
        centers: item.centers.sort(),
        systems: item.systems.sort((a, b) => a.name.localeCompare(b.name, 'sk')),
        relationships: [...relationshipMap.values()].sort((a, b) => {
          if (a.status !== b.status) return a.status === 'Potvrdené' ? -1 : b.status === 'Potvrdené' ? 1 : a.status === 'Na preverenie' ? -1 : 1
          const parent = a.parentSystem.localeCompare(b.parentSystem, 'sk')
          return parent || a.targetName.localeCompare(b.targetName, 'sk')
        }),
      }
    })
    .sort((a, b) => Math.abs(b.ledgerAmount || b.amount) - Math.abs(a.ledgerAmount || a.amount) || b.relationships.filter(item => item.status !== 'Zamietnuté').length - a.relationships.filter(item => item.status !== 'Zamietnuté').length || a.name.localeCompare(b.name, 'sk'))
}
