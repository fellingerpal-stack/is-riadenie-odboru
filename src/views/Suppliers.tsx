import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import * as XLSX from 'xlsx'
import { Badge, Empty, Field, Icon, Modal, PageHeader } from '../components/UI'
import type { AppRole, AppState, SupplierRecord, SupplierRelationship, SupplierRelationshipConfidence, SupplierRelationshipStatus } from '../types'
import { buildSupplierDirectory, normalizeSupplierText, supplierKey, type SupplierDirectoryItem, type SupplierRelationshipView } from '../lib/supplierDirectory'
import { knownSupplierByIco, normalizeSupplierIco } from '../data/supplierRegistry'
import './Suppliers.css'

const money = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const money2 = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Máj']

type SupplierFilter = 'active' | 'all' | 'payments' | 'contracts' | 'systems' | 'candidates' | 'inactive' | 'unresolved'
type SupplierSlaFilter = 'all' | 'yes' | 'no' | 'unknown' | 'missing'
type SupplierPeriodMode = 'year' | 'all'

const PAYMENT_YEAR = 2026
const PAYMENT_PERIOD_LABEL = 'Jan–Máj 2026'
const PERIOD_YEARS = [2023, 2024, 2025, 2026, 2027, 2028]

interface Props {
  state: AppState
  canEdit: boolean
  currentUser: string
  role: AppRole
  onChange: (records: SupplierRecord[]) => void
  onRelationshipsChange: (records: SupplierRelationship[]) => void
  go?: (view: string) => void
}

function emptyRecord(item?: SupplierDirectoryItem | null): SupplierRecord {
  return {
    id: item?.key || '',
    ico: item?.ico || '',
    name: item?.name?.startsWith('Firma / IČO') ? '' : item?.name || '',
    status: item?.record?.status || 'Aktívny',
    category: item?.record?.category || '',
    source: item?.record?.source || 'Manuálna evidencia',
    website: item?.record?.website || '',
    crzUrl: item?.record?.crzUrl || '',
    contractPdfUrl: item?.record?.contractPdfUrl || '',
    dmsUrl: item?.record?.dmsUrl || '',
    salesContact: item?.record?.salesContact || '',
    salesEmail: item?.record?.salesEmail || '',
    salesPhone: item?.record?.salesPhone || '',
    supplierProjectManager: item?.record?.supplierProjectManager || '',
    customerProjectManager: item?.record?.customerProjectManager || '',
    contractManager: item?.record?.contractManager || '',
    serviceOwner: item?.record?.serviceOwner || '',
    escalationContact: item?.record?.escalationContact || '',
    note: item?.record?.note || '',
    updatedAt: item?.record?.updatedAt || '',
    updatedBy: item?.record?.updatedBy || '',
  }
}

function emptyRelationship(item?: SupplierDirectoryItem | null, relationship?: SupplierRelationshipView | null): SupplierRelationship {
  return {
    id: relationship?.id || crypto.randomUUID(),
    supplierKey: item?.key || relationship?.supplierKey || '',
    supplierIco: item?.ico || relationship?.supplierIco || '',
    supplierName: item?.name || relationship?.supplierName || '',
    targetType: relationship?.targetType || 'Informačný systém',
    targetId: relationship?.targetId || '',
    targetName: relationship?.targetName || '',
    parentSystem: relationship?.parentSystem || '',
    role: relationship?.role || 'Dodávateľ / partner',
    contractNumber: relationship?.contractNumber || '',
    validFrom: relationship?.validFrom || '',
    validTo: relationship?.validTo || '',
    source: relationship?.source || 'Manuálna evidencia',
    evidence: relationship?.evidence || '',
    confidence: relationship?.confidence || 'Manuálne',
    status: relationship?.status || 'Potvrdené',
    note: relationship?.note || '',
    updatedAt: relationship?.updatedAt || '',
    updatedBy: relationship?.updatedBy || '',
  }
}

function identityTone(item: SupplierDirectoryItem) {
  if (item.record?.name) return 'success' as const
  if (item.verifiedName) return 'info' as const
  return 'warning' as const
}

function identityLabel(item: SupplierDirectoryItem) {
  if (item.record?.name) return 'spravované'
  if (item.verifiedName) return 'názov overený'
  return 'názov doplniť'
}

function relationshipTone(status: SupplierRelationshipStatus) {
  if (status === 'Potvrdené') return 'success' as const
  if (status === 'Zamietnuté') return 'neutral' as const
  return 'warning' as const
}

function confidenceTone(confidence: SupplierRelationshipConfidence) {
  if (confidence === 'Zdrojové') return 'info' as const
  if (confidence === 'Manuálne') return 'purple' as const
  return 'warning' as const
}

function valueOrDash(value?: string) { return value?.trim() || '—' }

function yearFromText(value?: string): number | null {
  const match = String(value || '').match(/\b(20\d{2})\b/)
  return match ? Number(match[1]) : null
}

function relationshipInPeriod(relation: SupplierRelationshipView, mode: SupplierPeriodMode, year: number): boolean {
  if (relation.status === 'Zamietnuté') return false
  if (mode === 'all') return true
  const from = yearFromText(relation.validFrom)
  const to = yearFromText(relation.validTo)
  if (from && from > year) return false
  if (to && to < year) return false
  return true
}

function systemInPeriod(system: SupplierDirectoryItem['systems'][number], mode: SupplierPeriodMode, year: number): boolean {
  if (mode === 'all') return true
  const to = yearFromText(system.contractValidTo)
  return !to || to >= year
}

function normalizedSla(value?: string): 'yes' | 'no' | 'unknown' | 'missing' {
  const text = normalizeSupplierText(value || '')
  if (!text) return 'missing'
  if (text === 'ano' || text.startsWith('ano ')) return 'yes'
  if (text === 'nie') return 'no'
  if (text.includes('neviem') || text.includes('prever')) return 'unknown'
  if (text.includes('nerelevant')) return 'missing'
  if (text.startsWith('nie ')) return 'unknown'
  return 'unknown'
}

function meaningfulContract(value: string): boolean {
  const text = normalizeSupplierText(value)
  if (!text || text === 'n a' || text === 'na' || text.includes('neuveden') || text.includes('udaj nie je') || text.includes('bez zmluv')) return false
  return true
}

function supplierPeriodContext(item: SupplierDirectoryItem, mode: SupplierPeriodMode, year: number) {
  const paymentAvailable = mode === 'all' || year === PAYMENT_YEAR
  const hasPayment = paymentAvailable && item.paymentCount > 0
  const paymentAmount = hasPayment ? item.amount : 0
  const paymentCount = hasPayment ? item.paymentCount : 0
  const relationships = item.relationships.filter(relation => relationshipInPeriod(relation, mode, year))
  const candidates = relationships.filter(relation => relation.status === 'Na preverenie')
  const systems = item.systems.filter(system => systemInPeriod(system, mode, year))
  const paymentContracts = paymentAvailable ? item.contracts : []
  const contracts = [...new Set([
    ...paymentContracts,
    ...relationships.map(relation => relation.contractNumber),
    ...systems.map(system => system.contractNumber),
  ].filter(value => Boolean(value) && meaningfulContract(String(value))))]
  const slaStates = systems.map(system => normalizedSla(system.slaStatus))
  const slaYes = slaStates.filter(value => value === 'yes').length
  const slaNo = slaStates.filter(value => value === 'no').length
  const slaUnknown = slaStates.filter(value => value === 'unknown').length
  const slaMissing = slaStates.filter(value => value === 'missing').length
  const hasActivity = hasPayment || contracts.length > 0 || relationships.length > 0
  return { paymentAvailable, hasPayment, paymentAmount, paymentCount, relationships, candidates, systems, contracts, slaYes, slaNo, slaUnknown, slaMissing, hasActivity }
}

function slaLabel(context: ReturnType<typeof supplierPeriodContext>): string {
  if (context.slaYes && !context.slaNo && !context.slaUnknown) return 'Áno'
  if (context.slaNo && !context.slaYes && !context.slaUnknown) return 'Nie'
  if (context.slaUnknown) return 'Preveriť'
  if (context.slaYes || context.slaNo) return 'Zmiešané'
  return 'Bez evidencie'
}

function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function csvCell(value: unknown): string {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function relationshipTemplateCsv(): string {
  const header = ['IČO', 'Dodávateľ', 'Systém', 'Modul', 'Typ', 'Nadradený systém', 'Rola dodávateľa', 'Zmluva', 'Platnosť od', 'Platnosť do', 'Stav', 'Dôvera', 'Zdroj', 'Poznámka']
  const example = ['35728531', 'InterWay, a. s.', 'IS KOMIS', 'ISS', 'Modul', 'IS KOMIS', 'Aplikačný dodávateľ / technická podpora', '', '', '', 'Potvrdené', 'Manuálne', 'Import – potvrdený zoznam', '']
  return `\ufeff${header.map(csvCell).join(';')}\n${example.map(csvCell).join(';')}\n`
}

function importedRelationshipId(supplier: string, targetType: string, targetName: string, parentSystem: string): string {
  const slug = [supplier, targetType, targetName, parentSystem].map(value => normalizeSupplierText(value).replace(/\s+/g, '-')).filter(Boolean).join('--')
  return `import-${slug || crypto.randomUUID()}`.slice(0, 180)
}

function normalizeHeaderMap(row: Record<string, unknown>): Map<string, unknown> {
  return new Map(Object.entries(row).map(([key, value]) => [normalizeSupplierText(key), value]))
}

function readAlias(map: Map<string, unknown>, ...aliases: string[]): string {
  for (const alias of aliases) {
    const value = map.get(normalizeSupplierText(alias))
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim()
  }
  return ''
}

function parseStatus(value: string): SupplierRelationshipStatus {
  const normalized = normalizeSupplierText(value)
  if (normalized.includes('zamiet')) return 'Zamietnuté'
  if (normalized.includes('prever') || normalized.includes('kandidat')) return 'Na preverenie'
  return 'Potvrdené'
}

function parseConfidence(value: string): SupplierRelationshipConfidence {
  const normalized = normalizeSupplierText(value)
  if (normalized.includes('zdroj')) return 'Zdrojové'
  if (normalized.includes('odvod')) return 'Odvodené'
  return 'Manuálne'
}

async function parseRelationshipImport(file: File): Promise<SupplierRelationship[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!firstSheet) throw new Error('Súbor neobsahuje čitateľný hárok.')
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' })
  const parsed: SupplierRelationship[] = []

  rows.forEach((row, index) => {
    const map = normalizeHeaderMap(row)
    const ico = normalizeSupplierIco(readAlias(map, 'IČO', 'ICO', 'supplier ico'))
    const supplierName = readAlias(map, 'Dodávateľ', 'Dodavatel', 'Supplier', 'Názov dodávateľa')
    const system = readAlias(map, 'Systém', 'System', 'IS')
    const moduleName = readAlias(map, 'Modul', 'Module')
    const targetName = moduleName || system
    if ((!ico && !supplierName) || !targetName) return
    const parentSystem = readAlias(map, 'Nadradený systém', 'Nadradeny system', 'Parent system') || (moduleName && system !== moduleName ? system : '')
    const targetType = readAlias(map, 'Typ', 'Type') || (moduleName ? 'Modul' : 'Informačný systém')
    const status = parseStatus(readAlias(map, 'Stav', 'Status'))
    const confidence = parseConfidence(readAlias(map, 'Dôvera', 'Dovera', 'Confidence'))
    const relationSupplierKey = supplierKey(ico, supplierName)
    parsed.push({
      id: importedRelationshipId(relationSupplierKey, targetType, targetName, parentSystem),
      supplierKey: relationSupplierKey,
      supplierIco: ico,
      supplierName,
      targetType,
      targetId: readAlias(map, 'ID služby', 'ID sluzby', 'Target ID', 'Service ID'),
      targetName,
      parentSystem,
      role: readAlias(map, 'Rola dodávateľa', 'Rola dodavatela', 'Rola', 'Role') || 'Dodávateľ / partner',
      contractNumber: readAlias(map, 'Zmluva', 'Číslo zmluvy', 'Cislo zmluvy', 'Contract'),
      validFrom: readAlias(map, 'Platnosť od', 'Platnost od', 'Valid from'),
      validTo: readAlias(map, 'Platnosť do', 'Platnost do', 'Valid to'),
      source: readAlias(map, 'Zdroj', 'Source') || `Import ${file.name}`,
      evidence: readAlias(map, 'Dôkaz', 'Dokaz', 'Evidence'),
      confidence,
      status,
      note: readAlias(map, 'Poznámka', 'Poznamka', 'Note') || `Importovaný riadok ${index + 2}`,
      updatedAt: new Date().toISOString(),
      updatedBy: '',
    })
  })
  return parsed
}

export default function Suppliers({ state, canEdit, currentUser, role, onChange, onRelationshipsChange, go }: Props) {
  const directory = useMemo(() => buildSupplierDirectory(state), [state])
  const canOpenAdvanced = role !== 'employee'
  const [query, setQuery] = useState('')
  const [task, setTask] = useState('all')
  const [periodMode, setPeriodMode] = useState<SupplierPeriodMode>('year')
  const [selectedYear, setSelectedYear] = useState(PAYMENT_YEAR)
  const [filter, setFilter] = useState<SupplierFilter>('active')
  const [slaFilter, setSlaFilter] = useState<SupplierSlaFilter>('all')
  const [selectedKey, setSelectedKey] = useState(directory[0]?.key || '')
  const [editingSupplier, setEditingSupplier] = useState<SupplierDirectoryItem | null | undefined>(undefined)
  const [newSupplierMode, setNewSupplierMode] = useState(false)
  const [editingRelationship, setEditingRelationship] = useState<SupplierRelationshipView | null | undefined>(undefined)
  const [importOpen, setImportOpen] = useState(false)
  const [importRows, setImportRows] = useState<SupplierRelationship[]>([])
  const [importFileName, setImportFileName] = useState('')
  const [importError, setImportError] = useState('')

  const contexts = useMemo(() => new Map(directory.map(item => [item.key, supplierPeriodContext(item, periodMode, selectedYear)])), [directory, periodMode, selectedYear])
  const filtered = directory.filter(item => {
    const context = contexts.get(item.key) || supplierPeriodContext(item, periodMode, selectedYear)
    const relationshipText = item.relationships.map(relation => `${relation.targetName} ${relation.parentSystem} ${relation.role} ${relation.contractNumber}`).join(' ')
    const haystack = normalizeSupplierText(`${item.name} ${item.ico} ${item.contracts.join(' ')} ${item.topNotes.join(' ')} ${item.systems.map(system => `${system.name} ${system.slaStatus}`).join(' ')} ${relationshipText}`)
    if (query && !haystack.includes(normalizeSupplierText(query))) return false
    if (task !== 'all' && context.paymentAvailable && !item.tasks.includes(task)) return false
    if (filter === 'active' && !context.hasActivity) return false
    if (filter === 'payments' && !context.hasPayment) return false
    if (filter === 'contracts' && context.contracts.length === 0) return false
    if (filter === 'systems' && context.relationships.length === 0) return false
    if (filter === 'candidates' && context.candidates.length === 0) return false
    if (filter === 'inactive' && context.hasActivity) return false
    if (filter === 'unresolved' && (item.verifiedName || item.record?.name)) return false
    if (slaFilter === 'yes' && context.slaYes === 0) return false
    if (slaFilter === 'no' && context.slaNo === 0) return false
    if (slaFilter === 'unknown' && context.slaUnknown === 0) return false
    if (slaFilter === 'missing' && (context.systems.length > 0 && context.slaMissing < context.systems.length)) return false
    return true
  })
  const selected = filtered.find(item => item.key === selectedKey) || filtered[0] || (filtered.length ? undefined : directory.find(item => item.key === selectedKey) || directory[0])
  const selectedContext = selected ? contexts.get(selected.key) || supplierPeriodContext(selected, periodMode, selectedYear) : null
  const kpiItems = filtered
  const paymentDataAvailable = periodMode === 'all' || selectedYear === PAYMENT_YEAR
  const totalAmount = kpiItems.reduce((total, item) => total + (contexts.get(item.key)?.paymentAmount || 0), 0)
  const namedCount = kpiItems.filter(item => item.verifiedName || item.record?.name).length
  const contractCount = new Set(kpiItems.flatMap(item => contexts.get(item.key)?.contracts || [])).size
  const relationshipCount = kpiItems.reduce((total, item) => total + (contexts.get(item.key)?.relationships.length || 0), 0)
  const candidateCount = kpiItems.reduce((total, item) => total + (contexts.get(item.key)?.candidates.length || 0), 0)
  const slaSupplierCount = kpiItems.filter(item => (contexts.get(item.key)?.slaYes || 0) > 0).length
  const periodLabel = periodMode === 'all' ? 'Všetky dostupné obdobia' : String(selectedYear)

  function openSupplierEdit(item: SupplierDirectoryItem) {
    if (!canEdit) return
    setNewSupplierMode(false)
    setEditingSupplier(item)
  }

  function openNewSupplier() {
    if (!canEdit) return
    setNewSupplierMode(true)
    setEditingSupplier(null)
  }

  function openNewRelationship() {
    if (!canEdit || !selected) return
    setEditingRelationship(null)
  }

  function saveSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEdit) return
    const form = new FormData(event.currentTarget)
    const ico = normalizeSupplierIco(form.get('ico'))
    const name = String(form.get('name') || '').trim()
    if (!ico && !name) return
    const base = newSupplierMode ? null : editingSupplier
    const id = base?.record?.id || base?.key || supplierKey(ico, name) || crypto.randomUUID()
    const record: SupplierRecord = {
      id,
      ico,
      name,
      status: String(form.get('status') || 'Aktívny'),
      category: String(form.get('category') || ''),
      source: base?.record?.source || 'Manuálna evidencia',
      website: String(form.get('website') || '').trim(),
      crzUrl: String(form.get('crzUrl') || '').trim(),
      contractPdfUrl: String(form.get('contractPdfUrl') || '').trim(),
      dmsUrl: String(form.get('dmsUrl') || '').trim(),
      salesContact: String(form.get('salesContact') || '').trim(),
      salesEmail: String(form.get('salesEmail') || '').trim(),
      salesPhone: String(form.get('salesPhone') || '').trim(),
      supplierProjectManager: String(form.get('supplierProjectManager') || '').trim(),
      customerProjectManager: String(form.get('customerProjectManager') || '').trim(),
      contractManager: String(form.get('contractManager') || '').trim(),
      serviceOwner: String(form.get('serviceOwner') || '').trim(),
      escalationContact: String(form.get('escalationContact') || '').trim(),
      note: String(form.get('note') || '').trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser,
    }
    const next = state.supplierRecords.some(item => item.id === id)
      ? state.supplierRecords.map(item => item.id === id ? record : item)
      : [...state.supplierRecords, record]
    onChange(next)
    setSelectedKey(id)
    setEditingSupplier(undefined)
    setNewSupplierMode(false)
  }

  function upsertRelationship(record: SupplierRelationship) {
    const normalized: SupplierRelationship = { ...record, updatedAt: new Date().toISOString(), updatedBy: currentUser }
    const existingIndex = (state.supplierRelationships || []).findIndex(item => item.id === normalized.id)
    const next = existingIndex >= 0
      ? state.supplierRelationships.map((item, index) => index === existingIndex ? normalized : item)
      : [...(state.supplierRelationships || []), normalized]
    onRelationshipsChange(next)
  }

  function saveRelationship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEdit || !selected) return
    const form = new FormData(event.currentTarget)
    const base = editingRelationship ? emptyRelationship(selected, editingRelationship) : emptyRelationship(selected)
    const relation: SupplierRelationship = {
      ...base,
      supplierKey: selected.key,
      supplierIco: selected.ico,
      supplierName: selected.name,
      targetType: String(form.get('targetType') || 'Informačný systém'),
      targetId: String(form.get('targetId') || '').trim(),
      targetName: String(form.get('targetName') || '').trim(),
      parentSystem: String(form.get('parentSystem') || '').trim(),
      role: String(form.get('role') || 'Dodávateľ / partner').trim(),
      contractNumber: String(form.get('contractNumber') || '').trim(),
      validFrom: String(form.get('validFrom') || '').trim(),
      validTo: String(form.get('validTo') || '').trim(),
      status: String(form.get('status') || 'Potvrdené') as SupplierRelationshipStatus,
      confidence: String(form.get('confidence') || 'Manuálne') as SupplierRelationshipConfidence,
      source: String(form.get('source') || 'Manuálna evidencia').trim(),
      evidence: String(form.get('evidence') || '').trim(),
      note: String(form.get('note') || '').trim(),
    }
    if (!relation.targetName) return
    upsertRelationship(relation)
    setEditingRelationship(undefined)
  }

  function confirmRelationship(relation: SupplierRelationshipView) {
    if (!canEdit || !selected) return
    upsertRelationship({ ...emptyRelationship(selected, relation), status: 'Potvrdené', confidence: 'Manuálne', note: relation.note || 'Potvrdené administrátorom v Supplier 360.' })
  }

  function rejectRelationship(relation: SupplierRelationshipView) {
    if (!canEdit || !selected) return
    if (!confirm(`Zamietnuť kandidátsku väzbu „${selected.name} → ${relation.targetName}“?`)) return
    upsertRelationship({ ...emptyRelationship(selected, relation), status: 'Zamietnuté', confidence: 'Manuálne', note: relation.note || 'Kandidát zamietnutý administrátorom.' })
  }

  function deleteRelationship(relation: SupplierRelationshipView) {
    if (!canEdit || relation.origin !== 'managed') return
    const restoreCandidate = relation.id.startsWith('candidate-')
    if (!confirm(restoreCandidate ? `Odstrániť spravované rozhodnutie pre „${relation.targetName}“? Pôvodný kandidát sa znovu zobrazí.` : `Odstrániť väzbu „${relation.targetName}“?`)) return
    onRelationshipsChange((state.supplierRelationships || []).filter(item => item.id !== relation.id))
  }

  function deleteSupplierOverride(item: SupplierDirectoryItem) {
    if (!canEdit || !item.record) return
    if (!confirm(`Odstrániť spravovanú kartu dodávateľa „${item.name}“? Zdrojové platby a väzby zostanú zachované.`)) return
    onChange(state.supplierRecords.filter(record => record.id !== item.record?.id))
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setImportRows([])
    setImportError('')
    setImportFileName(file?.name || '')
    if (!file) return
    try {
      const rows = await parseRelationshipImport(file)
      if (!rows.length) throw new Error('Nenašli sa riadky s dodávateľom/IČO a cieľovým systémom alebo modulom.')
      setImportRows(rows.map(row => ({ ...row, updatedBy: currentUser })))
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import sa nepodarilo načítať.')
    }
  }

  function commitImport() {
    if (!canEdit || !importRows.length) return
    const next = [...(state.supplierRelationships || [])]
    importRows.forEach(row => {
      const same = next.findIndex(item => item.id === row.id)
      if (same >= 0) next[same] = row
      else next.push(row)
    })
    onRelationshipsChange(next)
    setImportOpen(false)
    setImportRows([])
    setImportFileName('')
    setImportError('')
  }

  return <div className="supplier-page">
    <PageHeader
      eyebrow="Spoločný register 3.1 + 3.2"
      title="Dodávatelia, zmluvy a väzby na služby"
      description="Supplier 360 prepája IČO a platby so zmluvami, informačnými systémami a servisnými väzbami. Zdrojové väzby sú oddelené od odvodených kandidátov, ktoré môže administrátor potvrdiť alebo zamietnuť."
      actions={canEdit ? <div className="supplier-page-actions"><button className="button button-secondary button-small" onClick={() => setImportOpen(true)}><Icon name="upload" size={16}/> Import väzieb</button><button className="button button-secondary button-small" onClick={openNewRelationship} disabled={!selected}><Icon name="plus" size={16}/> Nová väzba</button><button className="button button-primary button-small" onClick={openNewSupplier}><Icon name="plus" size={16}/> Nový dodávateľ</button></div> : undefined}
    />

    <section className={`supplier-access-note ${canEdit ? 'is-admin' : ''}`}>
      <Icon name={canEdit ? 'shield' : 'eye'} size={20}/>
      <div><strong>{canEdit ? 'Admin režim · správa dodávateľov a väzieb povolená' : 'Read-only Supplier 360'}</strong><span>{canEdit ? 'Môžete potvrdiť kandidátov, vytvárať väzby, importovať CSV/XLSX a dopĺňať profil dodávateľa. Zdrojové platby sa nemenia.' : 'Každý prihlásený používateľ vidí zdroj, dôveru a stav väzby. Zápis a import sú dostupné iba administrátorovi.'}</span></div>
    </section>

    <section className="supplier-period-strip">
      <div><Icon name="calendar" size={17}/><span><strong>Časový pohľad: {periodLabel}</strong>{paymentDataAvailable ? ` · finančné dáta ${PAYMENT_PERIOD_LABEL}` : ` · finančné dáta pre ${selectedYear} nie sú v Supplier datasete`}</span></div>
      <small>Zmluvy, SLA a servisné väzby rešpektujú zvolené obdobie podľa dostupnej platnosti; chýbajúce dátumy sa neodhadujú.</small>
    </section>

    <section className="supplier-kpis supplier-kpis-temporal">
      <article><span>Dodávateľské identity</span><strong>{filtered.length}</strong><small>{namedCount} s pomenovaním vo výbere</small></article>
      <article><span>{periodMode === 'all' ? 'SIT platby 2026' : `Platby ${selectedYear}`}</span><strong>{paymentDataAvailable ? money.format(totalAmount) : '—'}</strong><small>{paymentDataAvailable ? `${PAYMENT_PERIOD_LABEL} · úlohy 10 / 22 / 25` : 'finančný supplier dataset nie je dostupný'}</small></article>
      <article><span>Zmluvy v období</span><strong>{contractCount}</strong><small>unikátne referencie v aktuálnom výbere</small></article>
      <article><span>Väzby na IS / služby</span><strong>{relationshipCount}</strong><small>platné / nedatované väzby v období</small></article>
      <article><span>SLA evidované</span><strong>{slaSupplierCount}</strong><small>dodávatelia s aspoň jedným SLA „Áno“</small></article>
      <article className={candidateCount ? 'is-warning' : ''}><span>Na preverenie</span><strong>{candidateCount}</strong><small>{candidateCount ? 'kandidátske väzby' : 'bez otvorených kandidátov'}</small></article>
    </section>

    <section className="panel supplier-toolbar supplier-toolbar-temporal">
      <label className="supplier-search"><span>Hľadať</span><div><Icon name="search" size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Názov, IČO, zmluva, systém, modul, rola…"/></div></label>
      <label><span>Obdobie</span><select value={periodMode} onChange={event => setPeriodMode(event.target.value as SupplierPeriodMode)}><option value="year">Konkrétny rok</option><option value="all">Všetky dostupné</option></select></label>
      <label><span>Rok</span><select value={selectedYear} disabled={periodMode === 'all'} onChange={event => setSelectedYear(Number(event.target.value))}>{PERIOD_YEARS.map(year => <option key={year} value={year}>{year}{year === PAYMENT_YEAR ? ' · platby' : ' · zmluvy/SLA'}</option>)}</select></label>
      <label><span>Aktivita</span><select value={filter} onChange={event => setFilter(event.target.value as SupplierFilter)}><option value="active">Aktivita v období</option><option value="all">Všetci dodávatelia</option><option value="payments">S platbou</option><option value="contracts">So zmluvou</option><option value="systems">S väzbou na IS/službu</option><option value="candidates">Na preverenie</option><option value="inactive">Bez aktivity v období</option><option value="unresolved">IČO bez názvu</option></select></label>
      <label><span>SLA</span><select value={slaFilter} onChange={event => setSlaFilter(event.target.value as SupplierSlaFilter)}><option value="all">Všetko</option><option value="yes">SLA áno</option><option value="no">SLA nie</option><option value="unknown">SLA preveriť</option><option value="missing">Bez SLA evidencie</option></select></label>
      <label><span>Úloha</span><select value={task} disabled={!paymentDataAvailable} onChange={event => setTask(event.target.value)}><option value="all">10 + 22 + 25</option><option value="10">Úloha 10</option><option value="22">Úloha 22</option><option value="25">Úloha 25</option></select></label>
      <div className="supplier-toolbar-result"><strong>{filtered.length}</strong><span>vo výbere</span></div>
    </section>

    <section className="supplier-workspace">
      <aside className="panel supplier-list-panel">
        <div className="supplier-list-head"><div><span className="eyebrow">REGISTER</span><h3>Dodávatelia</h3></div><small>{directory.length} celkom</small></div>
        <div className="supplier-list-scroll">
          {filtered.length ? filtered.map(item => {
            const context = contexts.get(item.key) || supplierPeriodContext(item, periodMode, selectedYear)
            const openCandidates = context.candidates.length
            const activeLinks = context.relationships.length
            return <button key={item.key} className={selected?.key === item.key ? 'active' : ''} onClick={() => setSelectedKey(item.key)}>
              <div className="supplier-list-main"><strong>{item.name}</strong><small>{item.ico ? `IČO ${item.ico}` : 'bez IČO'} · {context.paymentCount} platieb · {context.contracts.length} zmlúv · {activeLinks} väzieb</small></div>
              <div className="supplier-list-side"><b>{context.paymentAvailable && context.paymentAmount ? money.format(context.paymentAmount) : '—'}</b>{openCandidates ? <Badge tone="warning">{openCandidates} preveriť</Badge> : <Badge tone={identityTone(item)}>{identityLabel(item)}</Badge>}</div>
            </button>
          }) : <Empty title="Bez výsledkov" text="Zmeňte vyhľadávanie alebo filter."/>}
        </div>
      </aside>

      {selected ? <SupplierDetail item={selected} periodMode={periodMode} selectedYear={selectedYear} periodContext={selectedContext || supplierPeriodContext(selected, periodMode, selectedYear)} canEdit={canEdit} canOpenAdvanced={canOpenAdvanced} onEditSupplier={() => openSupplierEdit(selected)} onDeleteSupplier={() => deleteSupplierOverride(selected)} onNewRelationship={openNewRelationship} onEditRelationship={setEditingRelationship} onConfirmRelationship={confirmRelationship} onRejectRelationship={rejectRelationship} onDeleteRelationship={deleteRelationship} go={go}/> : <div className="panel supplier-detail-empty"><Empty title="Dodávateľ nebol vybraný" text="Vyberte dodávateľa v ľavom registri."/></div>}
    </section>

    {editingSupplier !== undefined && canEdit && <SupplierEditModal item={editingSupplier} newMode={newSupplierMode} onClose={() => { setEditingSupplier(undefined); setNewSupplierMode(false) }} onSave={saveSupplier}/>} 
    {editingRelationship !== undefined && canEdit && selected && <RelationshipEditModal item={selected} relationship={editingRelationship} onClose={() => setEditingRelationship(undefined)} onSave={saveRelationship}/>} 
    {importOpen && canEdit && <RelationshipImportModal rows={importRows} fileName={importFileName} error={importError} onFile={handleImportFile} onTemplate={() => downloadText('VZOR_DODAVATEL_VAZBY.csv', relationshipTemplateCsv())} onClose={() => { setImportOpen(false); setImportRows([]); setImportFileName(''); setImportError('') }} onCommit={commitImport}/>} 
  </div>
}

function SupplierDetail({ item, periodMode, selectedYear, periodContext, canEdit, canOpenAdvanced, onEditSupplier, onDeleteSupplier, onNewRelationship, onEditRelationship, onConfirmRelationship, onRejectRelationship, onDeleteRelationship, go }: {
  item: SupplierDirectoryItem
  periodMode: SupplierPeriodMode
  selectedYear: number
  periodContext: ReturnType<typeof supplierPeriodContext>
  canEdit: boolean
  canOpenAdvanced: boolean
  onEditSupplier: () => void
  onDeleteSupplier: () => void
  onNewRelationship: () => void
  onEditRelationship: (relationship: SupplierRelationshipView) => void
  onConfirmRelationship: (relationship: SupplierRelationshipView) => void
  onRejectRelationship: (relationship: SupplierRelationshipView) => void
  onDeleteRelationship: (relationship: SupplierRelationshipView) => void
  go?: (view: string) => void
}) {
  const record = item.record
  const maxMonth = Math.max(...item.monthly.map(value => Math.abs(value)), 1)
  const known = knownSupplierByIco(item.ico)
  const activeRelationships = periodContext.relationships
  const rejectedRelationships = item.relationships.filter(relation => relation.status === 'Zamietnuté')
  const confirmed = activeRelationships.filter(relation => relation.status === 'Potvrdené').length
  const candidates = activeRelationships.filter(relation => relation.status === 'Na preverenie').length
  const highCritical = activeRelationships.filter(relation => /krit|vysok/i.test(relation.criticality)).length
  const groups = [...new Set(activeRelationships.map(relation => relation.parentSystem || relation.targetType || 'Ostatné'))]
  const detailPeriodLabel = periodMode === 'all' ? 'Všetky dostupné obdobia' : String(selectedYear)
  const detailSlaLabel = slaLabel(periodContext)

  function exportRelationships() {
    const header = ['IČO', 'Dodávateľ', 'Typ', 'Nadradený systém', 'Systém / modul', 'Rola', 'Zmluva', 'Platnosť od', 'Platnosť do', 'Stav', 'Dôvera', 'Zdroj', 'Poznámka']
    const rows = item.relationships.map(relation => [item.ico, item.name, relation.targetType, relation.parentSystem, relation.targetName, relation.role, relation.contractNumber, relation.validFrom, relation.validTo, relation.status, relation.confidence, relation.source, relation.note])
    downloadText(`dodavatel-vazby-${item.ico || normalizeSupplierText(item.name).replace(/\s+/g, '-')}.csv`, `\ufeff${[header, ...rows].map(row => row.map(csvCell).join(';')).join('\n')}\n`)
  }

  return <article className="panel supplier-detail">
    <header className="supplier-detail-head">
      <div><span className="eyebrow">DODÁVATEĽ 360</span><h2>{item.name}</h2><div className="supplier-detail-tags"><Badge tone={identityTone(item)}>{identityLabel(item)}</Badge>{item.ico && <Badge tone="neutral">IČO {item.ico}</Badge>}<Badge tone="info">Obdobie: {detailPeriodLabel}</Badge>{record?.status && <Badge tone={record.status === 'Aktívny' ? 'success' : 'neutral'}>{record.status}</Badge>}{candidates > 0 && <Badge tone="warning">{candidates} na preverenie</Badge>}</div><p>{record?.category || 'Dodávateľ / partner identifikovaný zo zdrojových dát aplikácie.'}</p></div>
      <div className="supplier-detail-actions">{go&&<button className="button button-secondary button-small" onClick={()=>go('contracts')}><Icon name="calendar" size={15}/> Zmluvy / SLA</button>}<button className="button button-secondary button-small" onClick={exportRelationships}><Icon name="download" size={15}/> CSV väzby</button>{canEdit && <><button className="button button-secondary button-small" onClick={onNewRelationship}><Icon name="plus" size={15}/> Väzba</button><button className="button button-secondary button-small" onClick={onEditSupplier}><Icon name="edit" size={15}/> Karta</button>{record && <button className="icon-button supplier-delete" onClick={onDeleteSupplier} title="Odstrániť manuálnu kartu"><Icon name="trash" size={17}/></button>}</>}</div>
    </header>

    <section className="supplier-detail-metrics supplier-detail-metrics-extended supplier-detail-metrics-temporal">
      <div><span>{periodMode === 'all' ? 'Platby 2026' : `Platby ${selectedYear}`}</span><strong>{periodContext.paymentAvailable ? (periodContext.paymentAmount ? money2.format(periodContext.paymentAmount) : '—') : '—'}</strong><small>{periodContext.paymentAvailable ? PAYMENT_PERIOD_LABEL : 'bez finančného datasetu'}</small></div>
      <div><span>Zmluvy v období</span><strong>{periodContext.contracts.length}</strong><small>{periodContext.contracts.slice(0, 2).join(', ') || 'bez referencie'}</small></div>
      <div><span>Aktívne väzby</span><strong>{activeRelationships.length}</strong><small>{confirmed} potvrdených</small></div>
      <div><span>SLA</span><strong>{detailSlaLabel}</strong><small>{periodContext.slaYes} áno · {periodContext.slaNo} nie · {periodContext.slaUnknown} preveriť</small></div>
      <div className={candidates ? 'metric-warning' : ''}><span>Na preverenie</span><strong>{candidates}</strong><small>{highCritical} vysoké / kritické väzby</small></div>
    </section>

    <section className="supplier-relationship-summary">
      <div><span className="eyebrow">VENDOR DEPENDENCY</span><h3>Mapa dodávateľskej expozície</h3><p>{activeRelationships.length ? `${item.name} je momentálne prepojený s ${activeRelationships.length} systémami/modulmi; ${candidates} väzieb ešte čaká na potvrdenie.` : 'Zatiaľ nie je evidovaná servisná alebo systémová väzba.'}</p></div>
      <div className="supplier-dependency-counters"><span><strong>{confirmed}</strong> potvrdené</span><span><strong>{candidates}</strong> kandidáti</span><span><strong>{highCritical}</strong> vysoké/kritické</span></div>
    </section>

    <section className="supplier-card-block supplier-relationships">
      <div className="supplier-block-head"><div><span className="eyebrow">SERVICE / IS VÄZBY</span><h3>Systémy, moduly a rola dodávateľa</h3></div>{go && canOpenAdvanced && <button className="text-button" onClick={() => go('services')}>Service 360 <Icon name="arrow" size={14}/></button>}</div>
      {groups.length ? <div className="supplier-relationship-groups">{groups.map(group => {
        const rows = activeRelationships.filter(relation => (relation.parentSystem || relation.targetType || 'Ostatné') === group)
        return <section className="supplier-relationship-group" key={group}>
          <header><div><strong>{group}</strong><small>{rows.length} väzieb</small></div><span>{rows.filter(row => row.status === 'Potvrdené').length}/{rows.length} potvrdené</span></header>
          <div className="supplier-relationship-table">
            <div className="supplier-relationship-row supplier-relationship-head"><span>Systém / modul</span><span>Rola</span><span>Dôvera / stav</span><span>Zmluva</span><span></span></div>
            {rows.map(relation => <div className={`supplier-relationship-row ${relation.status === 'Na preverenie' ? 'is-candidate' : ''}`} key={`${relation.id}-${relation.targetName}`}>
              <span><strong>{relation.targetName}</strong><small>{relation.targetType}{relation.criticality ? ` · ${relation.criticality}` : ''}</small></span>
              <span><strong>{relation.role}</strong><small>{relation.source}</small></span>
              <span className="supplier-relation-badges"><Badge tone={confidenceTone(relation.confidence)}>{relation.confidence}</Badge><Badge tone={relationshipTone(relation.status)}>{relation.status}</Badge></span>
              <span><strong>{relation.contractNumber || '—'}</strong><small>{relation.validTo ? `do ${relation.validTo}` : relation.evidence || 'bez termínu'}</small></span>
              <span className="supplier-relation-actions">{canEdit && relation.status === 'Na preverenie' && <><button className="mini-action confirm" onClick={() => onConfirmRelationship(relation)} title="Potvrdiť"><Icon name="check" size={14}/></button><button className="mini-action" onClick={() => onEditRelationship(relation)} title="Upraviť a potvrdiť"><Icon name="edit" size={14}/></button><button className="mini-action reject" onClick={() => onRejectRelationship(relation)} title="Zamietnuť"><Icon name="close" size={14}/></button></>}{canEdit && relation.origin === 'managed' && relation.status === 'Potvrdené' && <><button className="mini-action" onClick={() => onEditRelationship(relation)} title="Upraviť"><Icon name="edit" size={14}/></button><button className="mini-action reject" onClick={() => onDeleteRelationship(relation)} title="Odstrániť spravovanú väzbu"><Icon name="trash" size={14}/></button></>}{relation.locked && <Icon name="lock" size={14}/>}</span>
            </div>)}
          </div>
        </section>
      })}</div> : <p className="supplier-muted">Pri tomto dodávateľovi zatiaľ nebola nájdená väzba na systém alebo službu.</p>}
      {rejectedRelationships.length > 0 && <div className="supplier-rejected-note"><Icon name="eyeOff" size={15}/><span>{rejectedRelationships.length} zamietnutých kandidátov je uložených v auditnej vrstve a nezapočítava sa do aktívnych väzieb.</span></div>}
    </section>

    <section className="supplier-detail-grid">
      <div className="supplier-card-block">
        <h3>Mesačné čerpanie · {periodMode === 'all' ? '2026' : selectedYear}</h3>
        {periodContext.paymentAvailable ? (item.paymentCount ? <div className="supplier-month-bars">{item.monthly.map((value, index) => <div key={months[index]}><span>{months[index]}</span><i><b style={{ width: `${value ? Math.max(4, Math.abs(value) / maxMonth * 100) : 0}%` }}/></i><strong>{value ? money.format(value) : '—'}</strong></div>)}</div> : <p className="supplier-muted">Táto identita nemá platbu v SIT snapshote {PAYMENT_PERIOD_LABEL}.</p>) : <p className="supplier-muted">Pre rok {selectedYear} momentálne nie je v Supplier registri dostupný riadkový finančný dataset. Zobrazenie preto filtruje iba zmluvy, SLA a servisné väzby.</p>}
      </div>
      <div className="supplier-card-block"><h3>Identita a evidencia</h3><dl className="supplier-dl"><div><dt>Názov</dt><dd>{item.name}</dd></div><div><dt>IČO</dt><dd>{item.ico || '—'}</dd></div><div><dt>Zdroj názvu</dt><dd>{record?.name ? 'Spravovaná karta' : known?.source || item.source}</dd></div><div><dt>Strediská</dt><dd>{item.centers.join(', ') || '—'}</dd></div><div><dt>Kategória</dt><dd>{valueOrDash(record?.category)}</dd></div><div><dt>Aktualizácia</dt><dd>{record?.updatedAt ? `${new Date(record.updatedAt).toLocaleString('sk-SK')} · ${record.updatedBy || 'admin'}` : 'zdrojová evidencia'}</dd></div></dl></div>
    </section>

    <section className="supplier-detail-grid">
      <div className="supplier-card-block"><h3>Kontakty a zodpovednosť</h3><dl className="supplier-dl"><div><dt>Obchodný kontakt</dt><dd>{valueOrDash(record?.salesContact)}</dd></div><div><dt>E-mail</dt><dd>{valueOrDash(record?.salesEmail)}</dd></div><div><dt>Telefón</dt><dd>{valueOrDash(record?.salesPhone)}</dd></div><div><dt>PM dodávateľa</dt><dd>{valueOrDash(record?.supplierProjectManager)}</dd></div><div><dt>PM CVTI SR</dt><dd>{valueOrDash(record?.customerProjectManager)}</dd></div><div><dt>Garant zmluvy</dt><dd>{valueOrDash(record?.contractManager)}</dd></div><div><dt>Garant služby</dt><dd>{valueOrDash(record?.serviceOwner)}</dd></div><div><dt>Eskalácia</dt><dd>{valueOrDash(record?.escalationContact)}</dd></div></dl></div>
      <div className="supplier-card-block"><h3>Dokumenty a odkazy</h3><div className="supplier-link-list">{record?.website ? <a href={record.website} target="_blank" rel="noreferrer">Web dodávateľa <Icon name="arrow" size={14}/></a> : null}{record?.crzUrl ? <a href={record.crzUrl} target="_blank" rel="noreferrer">Centrálny register zmlúv <Icon name="arrow" size={14}/></a> : null}{record?.contractPdfUrl ? <a href={record.contractPdfUrl} target="_blank" rel="noreferrer">Zmluva / PDF <Icon name="arrow" size={14}/></a> : null}{record?.dmsUrl ? <a href={record.dmsUrl} target="_blank" rel="noreferrer">DMS / interný priečinok <Icon name="arrow" size={14}/></a> : null}{!record?.website && !record?.crzUrl && !record?.contractPdfUrl && !record?.dmsUrl && <p className="supplier-muted">Odkazy zatiaľ nie sú doplnené.</p>}</div>{record?.note && <div className="supplier-note"><strong>Poznámka</strong><p>{record.note}</p></div>}</div>
    </section>

    <section className="supplier-card-block supplier-contracts"><div className="supplier-block-head"><div><span className="eyebrow">KONTRAKTY A PLATBY</span><h3>Zmluvné referencie a vecný obsah</h3></div>{go && canOpenAdvanced && <button className="text-button" onClick={() => go('intelligence')}>Riadiace centrum <Icon name="arrow" size={14}/></button>}</div>{item.contracts.length ? <div className="supplier-contract-chips">{item.contracts.map(contract => <span key={contract}>{contract}</span>)}</div> : <p className="supplier-muted">V zdrojových platbách nie je číslo zmluvy.</p>}{item.topNotes.length > 0 && <div className="supplier-note-list">{item.topNotes.map(note => <span key={note}>{note}</span>)}</div>}</section>
  </article>
}

function SupplierEditModal({ item, newMode, onClose, onSave }: { item: SupplierDirectoryItem | null; newMode: boolean; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const value = emptyRecord(item)
  return <Modal title={newMode ? 'Nový dodávateľ' : `Správa dodávateľa · ${item?.name || ''}`} onClose={onClose} wide>
    <form className="supplier-edit-form" onSubmit={onSave}>
      <div className="supplier-edit-section"><div><span className="eyebrow">IDENTITA</span><h3>Základná karta</h3></div><div className="form-grid">
        <Field label="Názov dodávateľa"><input name="name" defaultValue={value.name} placeholder="napr. InterWay, a. s." required={!value.ico}/></Field>
        <Field label="IČO" hint={item?.ico && item.paymentCount > 0 ? 'IČO pochádza zo zdrojovej platby a v spravovanej karte sa nemení.' : 'Pri známom IČO aplikácia automaticky používa overený názov ako východisko.'}><input name="ico" defaultValue={value.ico} placeholder="8 číslic" readOnly={Boolean(item?.ico && item.paymentCount > 0)}/></Field>
        <Field label="Stav"><select name="status" defaultValue={value.status}><option>Aktívny</option><option>Neaktívny</option><option>Na preverenie</option><option>Ukončený</option></select></Field>
        <Field label="Kategória"><input name="category" defaultValue={value.category} placeholder="napr. aplikačný dodávateľ, infraštruktúra, telekom…"/></Field>
      </div></div>
      <div className="supplier-edit-section"><div><span className="eyebrow">KONTAKTY</span><h3>Ľudia a eskalácia</h3></div><div className="form-grid">
        <Field label="Kontaktná osoba / obchodník"><input name="salesContact" defaultValue={value.salesContact}/></Field><Field label="E-mail"><input name="salesEmail" type="email" defaultValue={value.salesEmail}/></Field><Field label="Telefón"><input name="salesPhone" defaultValue={value.salesPhone}/></Field><Field label="Projektový manažér dodávateľa"><input name="supplierProjectManager" defaultValue={value.supplierProjectManager}/></Field><Field label="Projektový manažér CVTI SR"><input name="customerProjectManager" defaultValue={value.customerProjectManager}/></Field><Field label="Garant zmluvy"><input name="contractManager" defaultValue={value.contractManager}/></Field><Field label="Garant služby"><input name="serviceOwner" defaultValue={value.serviceOwner}/></Field><Field label="Eskalácia"><input name="escalationContact" defaultValue={value.escalationContact}/></Field>
      </div></div>
      <div className="supplier-edit-section"><div><span className="eyebrow">DOKUMENTY</span><h3>Odkazy a poznámka</h3></div><div className="form-grid"><Field label="Web"><input name="website" type="url" defaultValue={value.website} placeholder="https://…"/></Field><Field label="CRZ"><input name="crzUrl" type="url" defaultValue={value.crzUrl} placeholder="https://www.crz.gov.sk/…"/></Field><Field label="PDF zmluvy / dokument"><input name="contractPdfUrl" defaultValue={value.contractPdfUrl} placeholder="URL alebo interný odkaz"/></Field><Field label="DMS / interný priečinok"><input name="dmsUrl" defaultValue={value.dmsUrl} placeholder="interný odkaz"/></Field><Field label="Poznámka"><textarea name="note" rows={4} defaultValue={value.note} placeholder="Vecná poznámka, servisný model, otvorené otázky…"/></Field></div></div>
      <div className="supplier-edit-info"><Icon name="shield" size={18}/><span>Úprava dopĺňa spravovanú kartu. Zdrojové platby, IČO, doklady a automatické väzby sa neprepisujú.</span></div>
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Zrušiť</button><button type="submit" className="button button-primary"><Icon name="check" size={16}/> Uložiť kartu</button></div>
    </form>
  </Modal>
}

function RelationshipEditModal({ item, relationship, onClose, onSave }: { item: SupplierDirectoryItem; relationship: SupplierRelationshipView | null; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const value = emptyRelationship(item, relationship)
  return <Modal title={relationship ? `Väzba · ${item.name} → ${relationship.targetName}` : `Nová väzba · ${item.name}`} onClose={onClose} wide>
    <form className="supplier-edit-form" onSubmit={onSave}>
      <div className="supplier-edit-info"><Icon name="database" size={18}/><span>Dodávateľ: <strong>{item.name}</strong>{item.ico ? ` · IČO ${item.ico}` : ''}. Väzba je samostatná spravovaná vrstva a nemení zdrojový register IS.</span></div>
      <div className="supplier-edit-section"><div><span className="eyebrow">CIEĽ VÄZBY</span><h3>Systém, modul alebo služba</h3></div><div className="form-grid">
        <Field label="Typ"><select name="targetType" defaultValue={value.targetType}><option>Informačný systém</option><option>Modul</option><option>Služba</option><option>Platforma</option><option>Technológia</option></select></Field>
        <Field label="Názov systému / modulu"><input name="targetName" defaultValue={value.targetName} required placeholder="napr. ISS, CRZP, SCIDAP…"/></Field>
        <Field label="Nadradený systém"><input name="parentSystem" defaultValue={value.parentSystem} placeholder="napr. IS KOMIS, CRZP / APS"/></Field>
        <Field label="ID služby / interné ID"><input name="targetId" defaultValue={value.targetId} placeholder="voliteľné, napr. S12"/></Field>
        <Field label="Rola dodávateľa"><input name="role" defaultValue={value.role} placeholder="technická podpora, vývoj, integrátor…"/></Field>
        <Field label="Číslo zmluvy"><input name="contractNumber" defaultValue={value.contractNumber}/></Field>
        <Field label="Platnosť od"><input name="validFrom" defaultValue={value.validFrom} placeholder="YYYY-MM-DD alebo text"/></Field>
        <Field label="Platnosť do"><input name="validTo" defaultValue={value.validTo} placeholder="YYYY-MM-DD alebo text"/></Field>
      </div></div>
      <div className="supplier-edit-section"><div><span className="eyebrow">DÔVERYHODNOSŤ</span><h3>Stav a evidencia</h3></div><div className="form-grid">
        <Field label="Stav"><select name="status" defaultValue={relationship?.status === 'Na preverenie' ? 'Potvrdené' : value.status}><option>Potvrdené</option><option>Na preverenie</option><option>Zamietnuté</option></select></Field>
        <Field label="Dôvera"><select name="confidence" defaultValue={relationship?.status === 'Na preverenie' ? 'Manuálne' : value.confidence}><option>Manuálne</option><option>Zdrojové</option><option>Odvodené</option></select></Field>
        <Field label="Zdroj"><input name="source" defaultValue={value.source}/></Field>
        <Field label="Dôkaz / referencia"><input name="evidence" defaultValue={value.evidence} placeholder="zmluva, register IS, JIRA, Excel…"/></Field>
        <Field label="Poznámka"><textarea name="note" rows={4} defaultValue={value.note}/></Field>
      </div></div>
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Zrušiť</button><button type="submit" className="button button-primary"><Icon name="check" size={16}/> Uložiť väzbu</button></div>
    </form>
  </Modal>
}

function RelationshipImportModal({ rows, fileName, error, onFile, onTemplate, onClose, onCommit }: { rows: SupplierRelationship[]; fileName: string; error: string; onFile: (event: ChangeEvent<HTMLInputElement>) => void; onTemplate: () => void; onClose: () => void; onCommit: () => void }) {
  const confirmed = rows.filter(row => row.status === 'Potvrdené').length
  const candidates = rows.filter(row => row.status === 'Na preverenie').length
  return <Modal title="Hromadný import dodávateľských väzieb" onClose={onClose} wide>
    <div className="supplier-import">
      <div className="supplier-import-help"><Icon name="upload" size={22}/><div><strong>CSV / XLSX import</strong><p>Stačí IČO alebo názov dodávateľa a cieľový systém/modul. Podporované sú aj stĺpce rola, nadradený systém, zmluva, platnosť, stav, dôvera, zdroj a poznámka.</p></div><button className="button button-secondary button-small" onClick={onTemplate}><Icon name="download" size={15}/> Stiahnuť vzor CSV</button></div>
      <label className="supplier-import-drop"><input type="file" accept=".xlsx,.xls,.csv,.tsv" onChange={onFile}/><Icon name="upload" size={26}/><strong>{fileName || 'Vyber CSV alebo XLSX súbor'}</strong><span>Súbor sa najprv iba načíta do náhľadu. Zápis nastane až po potvrdení importu.</span></label>
      {error && <div className="supplier-import-error"><Icon name="warning" size={17}/>{error}</div>}
      {rows.length > 0 && <><div className="supplier-import-metrics"><span><strong>{rows.length}</strong> riadkov</span><span><strong>{confirmed}</strong> potvrdených</span><span><strong>{candidates}</strong> na preverenie</span><span><strong>{new Set(rows.map(row => row.supplierIco || row.supplierName)).size}</strong> dodávateľov</span></div><div className="supplier-import-preview"><div className="supplier-import-row supplier-import-head"><span>Dodávateľ</span><span>Systém / modul</span><span>Rola</span><span>Stav</span></div>{rows.slice(0, 10).map(row => <div className="supplier-import-row" key={row.id}><span><strong>{row.supplierName || `IČO ${row.supplierIco}`}</strong><small>{row.supplierIco}</small></span><span><strong>{row.targetName}</strong><small>{row.parentSystem || row.targetType}</small></span><span>{row.role}</span><span><Badge tone={relationshipTone(row.status)}>{row.status}</Badge></span></div>)}{rows.length > 10 && <div className="supplier-import-more">+ ďalších {rows.length - 10} riadkov</div>}</div></>}
      <div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Zrušiť</button><button className="button button-primary" onClick={onCommit} disabled={!rows.length}><Icon name="check" size={16}/> Importovať {rows.length || ''}</button></div>
    </div>
  </Modal>
}
