import { useEffect, useMemo, useState } from 'react'
import type { AccessScope, AppRole, ChangeRequest, CmdbItem, CmdbRelationship, Employee, Service, SupplierRecord, Ticket } from '../types'
import { Badge, Field, Icon, Modal, PageHeader } from '../components/UI'
import { ASSET_IMPORT_FIELDS, assetDuplicateKey, autoMapAssetHeaders, blankAsset, buildImportedAssets, csvTemplate, inferAssetClass, readAssetImportFile, type AssetImportTable } from '../lib/assetImport'
import './Cmdb.css'

const itemTypes = [
  'Aplikácia', 'Informačný systém', 'Fyzický server', 'Virtuálny server', 'Databáza', 'Storage',
  'Sieťový prvok', 'Firewall', 'Switch', 'Router', 'Wi-Fi AP', 'Pracovná stanica', 'Notebook',
  'Monitor', 'Dokovacia stanica', 'Tlačiareň', 'MFP', 'Skener', 'UPS', 'Mobilný telefón', 'Tablet',
  'Externý disk', 'Licencia', 'SaaS', 'Cloud resource', 'Zmluva', 'Iné',
]
const statuses = ['V príprave', 'Na sklade', 'Pridelené', 'V prevádzke', 'Servis', 'Obmedzená prevádzka', 'Mimo prevádzky', 'Na vyradenie', 'Vyradené']
const criticalities = ['Kritická', 'Vysoká', 'Stredná', 'Nízka']
const lifecycleStates = ['Plánované', 'Objednané', 'Na sklade', 'Pridelené', 'V prevádzke', 'Servis', 'Na obnovu', 'Na vyradenie', 'Vyradené']
const inventoryStates = ['Neoverené', 'Nájdené', 'Presunuté', 'Nezhoda', 'Nenájdené']
const scopeLabels: Record<AccessScope, string> = { oit: '3.1 OIT', oris: '3.2 ORIS', shared: 'Spoločné' }

type AssetTab = 'overview' | 'register' | 'inventory' | 'import' | 'relations' | 'lifecycle'
type DuplicateMode = 'skip' | 'update' | 'create'
type SavedAssetView = { id:string; name:string; search:string; type:string; status:string; criticality:string; scope:'Všetky'|AccessScope; inventoryOnly:string }

function parseDate(value: string) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}
function daysUntil(value: string) {
  const date = parseDate(value)
  if (!date) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000)
}
function expiryDates(item: CmdbItem) {
  return [
    { label: 'Záruka', value: item.warrantyEnd },
    { label: 'Licencia', value: item.licenseEnd },
    { label: 'Zmluva', value: item.contractEnd },
    { label: 'Podpora', value: item.supportEnd },
    { label: 'Plán obnovy', value: item.plannedReplacementDate },
  ].filter((entry) => entry.value)
}
function nearestExpiry(item: CmdbItem) {
  return expiryDates(item).map((entry) => ({ ...entry, days: daysUntil(entry.value) }))
    .filter((entry): entry is { label: string; value: string; days: number } => entry.days !== null)
    .sort((a, b) => a.days - b.days)[0]
}
function toneForCriticality(value: string): 'danger'|'warning'|'info'|'neutral' {
  if (value === 'Kritická') return 'danger'
  if (value === 'Vysoká') return 'warning'
  if (value === 'Stredná') return 'info'
  return 'neutral'
}
function toneForInventory(value: string): 'success'|'warning'|'danger'|'info'|'neutral' {
  if (value === 'Nájdené') return 'success'
  if (value === 'Presunuté') return 'warning'
  if (value === 'Nezhoda' || value === 'Nenájdené') return 'danger'
  return 'neutral'
}
function isPhysical(item: CmdbItem) {
  return ['Fyzický server','Storage','Sieťový prvok','Firewall','Switch','Router','Wi-Fi AP','Pracovná stanica','Notebook','Monitor','Dokovacia stanica','Tlačiareň','MFP','Skener','UPS','Mobilný telefón','Tablet','Externý disk','Iné'].includes(item.type)
}
function formatMoney(value: number) {
  return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(Number(value) || 0)
}
function assetHealth(item: CmdbItem) {
  const checks: { label: string; ok: boolean; weight: number }[] = [
    { label: 'Vlastník', ok: Boolean(item.businessOwner || item.technicalOwner || item.assignedTo), weight: 15 },
    { label: 'Lokalita', ok: Boolean(item.location), weight: 10 },
    { label: 'Identifikátor', ok: Boolean(item.assetTag || item.serialNumber || item.hostname), weight: 15 },
    { label: 'Lifecycle', ok: Boolean(item.lifecycle && item.lifecycle !== 'Plánované'), weight: 10 },
    { label: 'Dokumentácia', ok: Boolean(item.documentation && !item.documentation.toLowerCase().includes('chýba')), weight: 10 },
    { label: 'Služba / účel', ok: Boolean(item.serviceId || item.category || item.department), weight: 10 },
    { label: 'Dodávateľ / pôvod', ok: Boolean(item.supplier || item.source), weight: 10 },
    { label: 'Finančná stopa', ok: Boolean(item.purchasePrice || item.cost || item.contractRef || item.contractTask), weight: 10 },
    { label: 'Záruka / podpora', ok: !isPhysical(item) || Boolean(item.warrantyEnd || item.supportEnd), weight: 10 },
  ]
  const score = checks.reduce((sum, check) => sum + (check.ok ? check.weight : 0), 0)
  return { score, checks }
}
function safeCsv(value: unknown) { return `"${String(value ?? '').replace(/"/g, '""')}"` }
function downloadText(name: string, text: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}
function scopeForNew(canWriteOit: boolean, canWriteOris: boolean, canWriteShared: boolean): AccessScope {
  if (canWriteShared) return 'shared'
  if (canWriteOris) return 'oris'
  return canWriteOit ? 'oit' : 'shared'
}
function appendHistory(item: CmdbItem, action: string, actor: string, detail: string): CmdbItem {
  const now = new Date().toISOString()
  return {
    ...item,
    updatedAt: now,
    updatedBy: actor,
    history: [...(item.history ?? []), { id: crypto.randomUUID(), action, actor, detail, createdAt: now }].slice(-100),
  }
}

export default function Cmdb({
  items,
  relationships,
  services,
  tickets,
  changes,
  employees,
  suppliers,
  role,
  currentUser,
  canWriteOit,
  canWriteOris,
  canWriteShared,
  onItemsChange,
  onRelationshipsChange,
}: {
  items: CmdbItem[]
  relationships: CmdbRelationship[]
  services: Service[]
  tickets: Ticket[]
  changes: ChangeRequest[]
  employees: Employee[]
  suppliers: SupplierRecord[]
  role: AppRole
  currentUser: string
  canWriteOit: boolean
  canWriteOris: boolean
  canWriteShared: boolean
  onItemsChange: (items: CmdbItem[]) => void
  onRelationshipsChange: (relationships: CmdbRelationship[]) => void
}) {
  const [tab, setTab] = useState<AssetTab>('overview')
  const [search, setSearch] = useState('')
  const [type, setType] = useState('Všetky')
  const [status, setStatus] = useState('Všetky')
  const [criticality, setCriticality] = useState('Všetky')
  const [scope, setScope] = useState<'Všetky'|AccessScope>('Všetky')
  const [inventoryOnly, setInventoryOnly] = useState('Všetky')
  const [editing, setEditing] = useState<CmdbItem | null>(null)
  const [detail, setDetail] = useState<CmdbItem | null>(null)
  const [relationEditing, setRelationEditing] = useState<CmdbRelationship | null>(null)
  const [importTable, setImportTable] = useState<AssetImportTable | null>(null)
  const [importMapping, setImportMapping] = useState<Partial<Record<keyof CmdbItem, string>>>({})
  const [importError, setImportError] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('skip')
  const [importScope, setImportScope] = useState<AccessScope>(() => scopeForNew(canWriteOit, canWriteOris, canWriteShared))
  const [importMessage, setImportMessage] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState('inventoryStatus')
  const [bulkValue, setBulkValue] = useState('Nájdené')
  const [savedViews, setSavedViews] = useState<SavedAssetView[]>(() => {
    try { return JSON.parse(localStorage.getItem('cvti-asset-saved-views') || '[]') as SavedAssetView[] } catch { return [] }
  })
  const [savedViewName, setSavedViewName] = useState('')

  const canEditScope = (assetScope: AccessScope) => {
    if (!['admin', 'manager', 'resolver'].includes(role)) return false
    if (role === 'admin') return true
    if (assetScope === 'oit') return canWriteOit
    if (assetScope === 'oris') return canWriteOris
    return canWriteShared
  }
  const writableScopes = ([['oit', canWriteOit], ['oris', canWriteOris], ['shared', canWriteShared]] as [AccessScope, boolean][]).filter(([, allowed]) => allowed).map(([value]) => value)
  const canCreate = role === 'admin' || (['manager', 'resolver'].includes(role) && writableScopes.length > 0)

  useEffect(() => {
    const params = new URLSearchParams(location.hash.split('?')[1] ?? '')
    const assetId = params.get('asset')
    if (!assetId) return
    const found = items.find((item) => item.id === assetId || item.assetTag === assetId)
    if (found) { setDetail(found); setTab('register') }
  }, [items])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return items.filter((item) => {
      const haystack = `${item.id} ${item.name} ${item.type} ${item.assetClass} ${item.assetTag} ${item.serialNumber} ${item.hostname} ${item.ipAddress} ${item.manufacturer} ${item.model} ${item.assignedTo} ${item.department} ${item.location} ${item.room} ${item.businessOwner} ${item.technicalOwner} ${item.supplier} ${item.supplierIco} ${item.contractRef} ${item.contractTask}`.toLowerCase()
      return (!needle || haystack.includes(needle))
        && (type === 'Všetky' || item.type === type)
        && (status === 'Všetky' || item.status === status)
        && (criticality === 'Všetky' || item.criticality === criticality)
        && (scope === 'Všetky' || item.scope === scope)
        && (inventoryOnly === 'Všetky' || item.inventoryStatus === inventoryOnly)
    })
  }, [items, search, type, status, criticality, scope, inventoryOnly])

  const physicalCount = items.filter(isPhysical).length
  const peripheralCount = items.filter((item) => ['Monitor','Dokovacia stanica','Tlačiareň','MFP','Skener','UPS','Mobilný telefón','Tablet','Externý disk'].includes(item.type)).length
  const ownerGapCount = items.filter((item) => !item.businessOwner && !item.technicalOwner && !item.assignedTo).length
  const lifecycleRiskCount = items.filter((item) => item.lifecycle === 'Na obnovu' || (nearestExpiry(item)?.days ?? 9999) <= 90).length
  const inventoryGapCount = items.filter((item) => ['Neoverené','Nenájdené','Nezhoda'].includes(item.inventoryStatus)).length
  const healthAverage = items.length ? Math.round(items.reduce((sum, item) => sum + assetHealth(item).score, 0) / items.length) : 100

  const duplicates = useMemo(() => {
    const map = new Map<string, CmdbItem[]>()
    items.forEach((item) => {
      const keys = [item.assetTag && `TAG:${item.assetTag.toLowerCase()}`, item.serialNumber && `SN:${item.serialNumber.toLowerCase()}`, item.hostname && `HOST:${item.hostname.toLowerCase()}`].filter(Boolean) as string[]
      keys.forEach((key) => map.set(key, [...(map.get(key) ?? []), item]))
    })
    return [...map.entries()].filter(([, group]) => group.length > 1)
  }, [items])

  const lifecycleItems = useMemo(() => items.map((item) => ({ item, expiry: nearestExpiry(item) }))
    .filter(({ item, expiry }) => item.lifecycle === 'Na obnovu' || Boolean(expiry && expiry.days <= 365))
    .sort((a, b) => (a.expiry?.days ?? 99999) - (b.expiry?.days ?? 99999)), [items])

  const topAttention = useMemo(() => items.map((item) => {
    const health = assetHealth(item).score
    const expiry = nearestExpiry(item)
    let attention = 100 - health
    if (item.criticality === 'Kritická') attention += 25
    if (expiry && expiry.days <= 90) attention += 25
    if (['Nenájdené','Nezhoda'].includes(item.inventoryStatus)) attention += 35
    if (item.lifecycle === 'Na obnovu') attention += 20
    return { item, attention, health, expiry }
  }).sort((a, b) => b.attention - a.attention).slice(0, 8), [items])

  const saveItem = (candidate: CmdbItem) => {
    if (!canEditScope(candidate.scope)) return
    const exists = items.some((item) => item.id === candidate.id)
    const id = candidate.id || `AST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    const next = appendHistory({ ...candidate, id }, exists ? 'Úprava' : 'Vytvorenie', currentUser, exists ? 'Aktualizovaná karta aktíva.' : 'Vytvorené nové aktívum.')
    onItemsChange(exists ? items.map((item) => item.id === candidate.id ? next : item) : [next, ...items])
    setEditing(null)
    setDetail(next)
  }

  const retireItem = (item: CmdbItem) => {
    if (!canEditScope(item.scope)) return
    const next = appendHistory({ ...item, lifecycle: 'Na vyradenie', status: 'Na vyradenie' }, 'Lifecycle', currentUser, 'Aktívum označené na vyradenie.')
    onItemsChange(items.map((entry) => entry.id === item.id ? next : entry)); setDetail(next)
  }
  const deleteItem = (item: CmdbItem) => {
    if (role !== 'admin' || !window.confirm(`Naozaj odstrániť ${item.name}? Auditná história tejto položky sa stratí.`)) return
    onItemsChange(items.filter((entry) => entry.id !== item.id))
    onRelationshipsChange(relationships.filter((rel) => rel.sourceId !== item.id && rel.targetId !== item.id))
    setDetail(null)
  }

  const setInventory = (item: CmdbItem, inventoryStatus: string) => {
    if (!canEditScope(item.scope)) return
    const today = new Date().toISOString().slice(0, 10)
    const next = appendHistory({ ...item, inventoryStatus, lastInventoryDate: today }, 'Inventúra', currentUser, `Inventúrny stav: ${inventoryStatus}`)
    onItemsChange(items.map((entry) => entry.id === item.id ? next : entry))
    if (detail?.id === item.id) setDetail(next)
  }

  const saveRelationship = (relation: CmdbRelationship) => {
    const source = items.find((item) => item.id === relation.sourceId)
    if (!source || !canEditScope(source.scope)) return
    const exists = relationships.some((item) => item.id === relation.id)
    const next = { ...relation, id: relation.id || crypto.randomUUID() }
    onRelationshipsChange(exists ? relationships.map((item) => item.id === relation.id ? next : item) : [next, ...relationships])
    setRelationEditing(null)
  }

  const toggleSelected = (id: string) => setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  const selectableFiltered = filtered.filter(item => canEditScope(item.scope))
  const allFilteredSelected = selectableFiltered.length > 0 && selectableFiltered.every(item => selectedIds.includes(item.id))
  const toggleAllFiltered = () => setSelectedIds(current => allFilteredSelected ? current.filter(id => !selectableFiltered.some(item => item.id === id)) : [...new Set([...current, ...selectableFiltered.map(item => item.id)])])

  const persistSavedViews = (next: SavedAssetView[]) => { setSavedViews(next); localStorage.setItem('cvti-asset-saved-views', JSON.stringify(next)) }
  const saveCurrentView = () => {
    const name = savedViewName.trim() || window.prompt('Názov uloženého pohľadu:')?.trim() || ''
    if (!name) return
    const next = [...savedViews.filter(view => view.name.toLocaleLowerCase('sk') !== name.toLocaleLowerCase('sk')), { id: crypto.randomUUID(), name, search, type, status, criticality, scope, inventoryOnly }]
    persistSavedViews(next); setSavedViewName('')
  }
  const applySavedView = (id: string) => {
    const view = savedViews.find(item => item.id === id); if (!view) return
    setSearch(view.search); setType(view.type); setStatus(view.status); setCriticality(view.criticality); setScope(view.scope); setInventoryOnly(view.inventoryOnly)
  }
  const deleteSavedView = () => {
    if (!savedViews.length) return
    const name = window.prompt(`Zadaj názov pohľadu na odstránenie:
${savedViews.map(view=>`• ${view.name}`).join('\n')}`)?.trim()
    if (!name) return
    persistSavedViews(savedViews.filter(view => view.name.toLocaleLowerCase('sk') !== name.toLocaleLowerCase('sk')))
  }
  const applyBulkAction = () => {
    if (!selectedIds.length || !bulkValue.trim()) return
    const selected = new Set(selectedIds)
    const today = new Date().toISOString().slice(0,10)
    const next = items.map(item => {
      if (!selected.has(item.id) || !canEditScope(item.scope)) return item
      let candidate = { ...item }
      if (bulkAction === 'location') candidate.location = bulkValue
      else if (bulkAction === 'assignedTo') candidate.assignedTo = bulkValue
      else if (bulkAction === 'businessOwner') candidate.businessOwner = bulkValue
      else if (bulkAction === 'technicalOwner') candidate.technicalOwner = bulkValue
      else if (bulkAction === 'lifecycle') candidate.lifecycle = bulkValue
      else if (bulkAction === 'inventoryStatus') { candidate.inventoryStatus = bulkValue; candidate.lastInventoryDate = today }
      else if (bulkAction === 'scope' && ['oit','oris','shared'].includes(bulkValue)) candidate.scope = bulkValue as AccessScope
      return appendHistory(candidate, 'Hromadná úprava', currentUser, `${bulkAction}: ${bulkValue}`)
    })
    onItemsChange(next); setSelectedIds([])
  }

  const exportCsv = () => {
    const headers = ['ID','Názov','Typ','Trieda','Scope','Inventárne číslo','Sériové číslo','Výrobca','Model','Pridelené osobe','Oddelenie','Lokalita','Miestnosť','Stav','Lifecycle','Inventúra','Kritickosť','Vecný vlastník','Technický vlastník','Dodávateľ','IČO','Zmluva','Úloha','Obstarávacia cena','Dátum nákupu','Záruka do','Plán obnovy','Hostname','IP','Služba','Zdroj','Aktualizoval','Aktualizované']
    const rows = filtered.map((item) => [item.id,item.name,item.type,item.assetClass,scopeLabels[item.scope],item.assetTag,item.serialNumber,item.manufacturer,item.model,item.assignedTo,item.department,item.location,item.room,item.status,item.lifecycle,item.inventoryStatus,item.criticality,item.businessOwner,item.technicalOwner,item.supplier,item.supplierIco,item.contractRef,item.contractTask,item.purchasePrice,item.purchaseDate,item.warrantyEnd,item.plannedReplacementDate,item.hostname,item.ipAddress,item.serviceId,item.source,item.updatedBy,item.updatedAt])
    downloadText(`asset-register-${new Date().toISOString().slice(0,10)}.csv`, [headers, ...rows].map((row) => row.map(safeCsv).join(';')).join('\n'), 'text/csv;charset=utf-8')
  }

  const loadImportFile = async (file: File | undefined) => {
    if (!file) return
    setImportError(''); setImportMessage(''); setImportBusy(true)
    try {
      const table = await readAssetImportFile(file)
      setImportTable(table)
      setImportMapping(autoMapAssetHeaders(table.headers))
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Súbor sa nepodarilo načítať.')
      setImportTable(null)
    } finally { setImportBusy(false) }
  }

  const importPreview = useMemo(() => importTable ? buildImportedAssets(importTable, importMapping, importScope, currentUser) : null, [importTable, importMapping, importScope, currentUser])
  const importStats = useMemo(() => {
    if (!importPreview) return { duplicate: 0, writable: 0, blockedScope: 0 }
    const existingKeys = new Set(items.map(assetDuplicateKey))
    return importPreview.assets.reduce((acc, item) => {
      if (existingKeys.has(assetDuplicateKey(item))) acc.duplicate += 1
      if (canEditScope(item.scope)) acc.writable += 1; else acc.blockedScope += 1
      return acc
    }, { duplicate: 0, writable: 0, blockedScope: 0 })
  }, [importPreview, items])

  const commitImport = () => {
    if (!importPreview) return
    const existingByKey = new Map(items.map((item) => [assetDuplicateKey(item), item]))
    const next = [...items]
    let created = 0, updated = 0, skipped = 0, blocked = 0
    importPreview.assets.forEach((candidate) => {
      if (!canEditScope(candidate.scope)) { blocked += 1; return }
      const key = assetDuplicateKey(candidate)
      const existing = existingByKey.get(key)
      if (existing && duplicateMode === 'skip') { skipped += 1; return }
      if (existing && duplicateMode === 'update') {
        const merged = appendHistory({ ...existing, ...candidate, id: existing.id, history: existing.history }, 'Hromadný import', currentUser, `Aktualizované zo súboru ${importTable?.fileName ?? ''}`)
        const index = next.findIndex((item) => item.id === existing.id); if (index >= 0) next[index] = merged
        updated += 1; return
      }
      const uniqueCandidate = existing && duplicateMode === 'create' ? { ...candidate, id: `AST-${crypto.randomUUID().slice(0, 8).toUpperCase()}` } : candidate
      next.unshift(uniqueCandidate); existingByKey.set(assetDuplicateKey(uniqueCandidate), uniqueCandidate); created += 1
    })
    onItemsChange(next)
    setImportMessage(`Import dokončený: ${created} nových · ${updated} aktualizovaných · ${skipped} preskočených · ${blocked} bez oprávnenia.`)
  }

  const printLabel = async (item: CmdbItem) => {
    try {
      const QRCode = await import('qrcode')
      const target = `${location.origin}${location.pathname}#/cmdb?asset=${encodeURIComponent(item.id)}`
      const dataUrl = await QRCode.toDataURL(target, { width: 220, margin: 1 })
      const win = window.open('', '_blank', 'width=640,height=520')
      if (!win) return
      win.document.write(`<!doctype html><html><head><title>${item.id}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#14283d}.label{width:520px;border:2px solid #14283d;border-radius:14px;padding:20px;display:grid;grid-template-columns:210px 1fr;gap:20px;align-items:center}.label img{width:200px}.label h1{font-size:24px;margin:0 0 8px}.label p{margin:5px 0;font-size:14px}.tag{font-weight:800;font-size:18px}@media print{body{padding:0}.label{border:1px solid #000}}</style></head><body><section class="label"><img src="${dataUrl}"/><div><h1>${item.name}</h1><p class="tag">${item.assetTag || item.id}</p><p>${item.type}</p><p>${item.manufacturer} ${item.model}</p><p>${item.location}${item.room ? ` · ${item.room}` : ''}</p><p>S/N: ${item.serialNumber || '—'}</p></div></section><script>window.onload=()=>window.print()</script></body></html>`)
      win.document.close()
    } catch (error) { window.alert(error instanceof Error ? error.message : 'QR štítok sa nepodarilo vytvoriť.') }
  }

  const newAsset = () => {
    const candidate = blankAsset()
    candidate.scope = scopeForNew(canWriteOit, canWriteOris, canWriteShared)
    candidate.updatedBy = currentUser
    setEditing(candidate)
  }

  const serviceName = (id: string) => services.find((service) => service.id === id)?.name || id || 'Bez väzby'
  const employeeOptions = [...new Set(employees.map((employee) => employee.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sk'))

  return <div className="asset-page">
    <PageHeader eyebrow="IT Asset Management · Asset 360" title="Asset management a centrálna evidencia aktív" description="Jedno miesto pre fyzické zariadenia, periférie, infraštruktúru, virtuálne CI, softvér a licencie. Register prepája vlastníctvo, inventúru, lifecycle, služby, dodávateľov a finančnú stopu." actions={<><button className="button button-secondary" onClick={exportCsv}><Icon name="download" size={16}/>CSV</button>{canCreate&&<button className="button button-primary" onClick={newAsset}><Icon name="plus" size={16}/>Nové aktívum</button>}</>}/>

    <section className="asset-briefing">
      <div><span>ASSET INTELLIGENCE</span><strong>{items.length ? `${healthAverage}/100 priemerný Asset Health` : 'Register je pripravený na import'}</strong><p>{ownerGapCount} aktív bez jasného ownera · {lifecycleRiskCount} lifecycle/termínových rizík · {inventoryGapCount} inventúrnych položiek na preverenie · {duplicates.length} skupín možných duplicít.</p></div>
      <div className="asset-briefing-score"><b>{items.length}</b><span>aktív spolu</span><small>{physicalCount} fyzických · {peripheralCount} periférií</small></div>
    </section>

    <div className="asset-kpis">
      <button onClick={() => { setTab('register'); setType('Všetky') }}><span>Aktíva spolu</span><strong>{items.length}</strong><small>fyzické + virtuálne + SW</small></button>
      <button onClick={() => { setTab('register'); setType('Notebook') }}><span>Fyzické aktíva</span><strong>{physicalCount}</strong><small>servery, PC, notebooky, periférie</small></button>
      <button onClick={() => { setTab('register'); setSearch(''); setType('Všetky') }}><span>Periférie</span><strong>{peripheralCount}</strong><small>monitory, tlačiarne, MFP, UPS…</small></button>
      <button className={ownerGapCount ? 'alert' : ''} onClick={() => setTab('overview')}><span>Bez ownera</span><strong>{ownerGapCount}</strong><small>treba doplniť zodpovednosť</small></button>
      <button className={lifecycleRiskCount ? 'alert' : ''} onClick={() => setTab('lifecycle')}><span>Lifecycle riziko</span><strong>{lifecycleRiskCount}</strong><small>obnova / termín ≤ 90 dní</small></button>
      <button className={inventoryGapCount ? 'alert' : ''} onClick={() => setTab('inventory')}><span>Inventúra</span><strong>{inventoryGapCount}</strong><small>neoverené / nezhoda / nenájdené</small></button>
    </div>

    <div className="tabs asset-tabs">
      {([['overview','Prehľad'],['register','Register aktív'],['inventory','Inventarizácia'],['import','Hromadný import'],['relations','Väzby / CMDB'],['lifecycle','Lifecycle radar']] as [AssetTab,string][]).map(([key,label]) => <button key={key} className={tab===key?'active':''} onClick={() => setTab(key)}>{label}</button>)}
    </div>

    {tab === 'overview' && <div className="asset-overview-grid">
      <section className="panel asset-attention"><div className="panel-heading"><div><span className="eyebrow">Riadiaca priorita</span><h3>Aktíva vyžadujúce pozornosť</h3></div><Badge tone={topAttention.some((row) => row.attention >= 60) ? 'danger' : 'success'}>{topAttention.length} signálov</Badge></div>
        <div className="asset-attention-list">{topAttention.length ? topAttention.map(({item, attention, health, expiry}) => <button key={item.id} onClick={() => setDetail(item)}><div className={`asset-health-ring ${health < 60 ? 'bad' : health < 80 ? 'warn' : ''}`}>{health}</div><div><strong>{item.name}</strong><small>{item.type} · {scopeLabels[item.scope]} · {item.location || 'bez lokality'}</small></div><div className="asset-attention-meta"><Badge tone={attention >= 60 ? 'danger' : attention >= 35 ? 'warning' : 'info'}>{attention} bodov</Badge><small>{expiry ? `${expiry.label}: ${expiry.days} dní` : item.lifecycle}</small></div></button>) : <p className="muted">Register zatiaľ neobsahuje aktíva.</p>}</div>
      </section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">Kvalita registra</span><h3>Asset Intelligence</h3></div></div>
        <div className="asset-intelligence-list">
          <button onClick={() => setTab('inventory')}><Icon name="check"/><div><strong>Inventarizácia</strong><small>{inventoryGapCount} položiek čaká na kontrolu</small></div></button>
          <button onClick={() => setTab('lifecycle')}><Icon name="calendar"/><div><strong>Lifecycle debt</strong><small>{lifecycleRiskCount} položiek na obnovu alebo s termínom</small></div></button>
          <button onClick={() => setTab('register')}><Icon name="user"/><div><strong>Ownership gaps</strong><small>{ownerGapCount} aktív bez ownera alebo pridelenej osoby</small></div></button>
          <button onClick={() => setTab('register')}><Icon name="warning"/><div><strong>Možné duplicity</strong><small>{duplicates.length} skupín podľa inventárneho čísla, S/N alebo hostname</small></div></button>
        </div>
      </section>
    </div>}

    {(tab === 'register' || tab === 'inventory') && <>
      <section className="asset-toolbar panel">
        <label className="search-box"><Icon name="search" size={17}/><input placeholder="Názov, inventárne číslo, S/N, hostname, osoba, lokalita, dodávateľ…" value={search} onChange={(event) => setSearch(event.target.value)}/></label>
        <select value={scope} onChange={(event) => setScope(event.target.value as 'Všetky'|AccessScope)}><option>Všetky</option><option value="oit">3.1 OIT</option><option value="oris">3.2 ORIS</option><option value="shared">Spoločné</option></select>
        <select value={type} onChange={(event) => setType(event.target.value)}><option>Všetky</option>{itemTypes.map((value) => <option key={value}>{value}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option>Všetky</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select>
        <select value={criticality} onChange={(event) => setCriticality(event.target.value)}><option>Všetky</option>{criticalities.map((value) => <option key={value}>{value}</option>)}</select>
        {tab === 'inventory' && <select value={inventoryOnly} onChange={(event) => setInventoryOnly(event.target.value)}><option>Všetky</option>{inventoryStates.map((value) => <option key={value}>{value}</option>)}</select>}
        <button className="button button-secondary" onClick={() => { setSearch(''); setScope('Všetky'); setType('Všetky'); setStatus('Všetky'); setCriticality('Všetky'); setInventoryOnly('Všetky') }}>Reset</button>
        <div className="asset-saved-views"><select defaultValue="" onChange={(event)=>{if(event.target.value)applySavedView(event.target.value);event.target.value=''}}><option value="">Uložené pohľady</option>{savedViews.map(view=><option key={view.id} value={view.id}>{view.name}</option>)}</select><button className="icon-button" title="Uložiť aktuálne filtre" onClick={saveCurrentView}><Icon name="plus" size={16}/></button>{savedViews.length>0&&<button className="icon-button" title="Odstrániť uložený pohľad" onClick={deleteSavedView}><Icon name="trash" size={15}/></button>}</div>
      </section>
      {selectedIds.length>0&&<section className="asset-bulk-bar"><div><Badge tone="info">{selectedIds.length} označených</Badge><span>Hromadná úprava</span></div><select value={bulkAction} onChange={event=>{setBulkAction(event.target.value);setBulkValue(event.target.value==='inventoryStatus'?'Nájdené':event.target.value==='lifecycle'?'V prevádzke':event.target.value==='scope'?'shared':'')}}><option value="inventoryStatus">Inventúrny stav</option><option value="location">Lokalita</option><option value="assignedTo">Pridelené osobe</option><option value="businessOwner">Vecný vlastník</option><option value="technicalOwner">Technický vlastník</option><option value="lifecycle">Lifecycle</option>{role==='admin'&&<option value="scope">Scope</option>}</select>{bulkAction==='inventoryStatus'?<select value={bulkValue} onChange={event=>setBulkValue(event.target.value)}>{inventoryStates.map(value=><option key={value}>{value}</option>)}</select>:bulkAction==='lifecycle'?<select value={bulkValue} onChange={event=>setBulkValue(event.target.value)}>{lifecycleStates.map(value=><option key={value}>{value}</option>)}</select>:bulkAction==='scope'?<select value={bulkValue} onChange={event=>setBulkValue(event.target.value)}><option value="oit">3.1 OIT</option><option value="oris">3.2 ORIS</option><option value="shared">Spoločné</option></select>:<input value={bulkValue} onChange={event=>setBulkValue(event.target.value)} placeholder="Nová hodnota…"/>}<button className="button button-primary" disabled={!bulkValue.trim()} onClick={applyBulkAction}>Použiť</button><button className="button button-ghost" onClick={()=>setSelectedIds([])}>Zrušiť výber</button></section>}
      <div className="table-shell asset-table-shell"><table className="data-table asset-table"><thead><tr><th className="asset-select-col"><input type="checkbox" aria-label="Označiť filtrované" checked={allFilteredSelected} onChange={toggleAllFiltered}/></th><th>Aktívum</th><th>Typ / scope</th><th>Identifikácia</th><th>Pridelenie / lokalita</th><th>Owner / služba</th>{tab==='inventory'&&<th>Inventúra</th>}<th>Health</th><th>Lifecycle</th><th></th></tr></thead><tbody>{filtered.map((item) => {
        const health = assetHealth(item).score; const expiry = nearestExpiry(item)
        return <tr key={item.id} className={item.inventoryStatus === 'Nenájdené' ? 'asset-row-danger' : ''}>
          <td className="asset-select-col"><input type="checkbox" aria-label={`Označiť ${item.name}`} disabled={!canEditScope(item.scope)} checked={selectedIds.includes(item.id)} onChange={()=>toggleSelected(item.id)}/></td>
          <td><button className="asset-primary" onClick={() => setDetail(item)}><span className="asset-ci-icon"><Icon name="cmdb" size={17}/></span><span><strong>{item.name}</strong><small>{item.id}{item.manufacturer || item.model ? ` · ${item.manufacturer} ${item.model}` : ''}</small></span></button></td>
          <td><strong>{item.type}</strong><small>{scopeLabels[item.scope]} · {item.assetClass}</small></td>
          <td><strong>{item.assetTag || '—'}</strong><small>S/N {item.serialNumber || '—'}{item.hostname ? ` · ${item.hostname}` : ''}</small></td>
          <td><strong>{item.assignedTo || item.department || 'Nepridelené'}</strong><small>{item.location || 'bez lokality'}{item.room ? ` · ${item.room}` : ''}</small></td>
          <td><strong>{item.businessOwner || item.technicalOwner || 'Bez ownera'}</strong><small>{serviceName(item.serviceId)}</small></td>
          {tab==='inventory'&&<td><div className="asset-inventory-cell"><Badge tone={toneForInventory(item.inventoryStatus)}>{item.inventoryStatus}</Badge><select value={item.inventoryStatus} disabled={!canEditScope(item.scope)} onChange={(event) => setInventory(item, event.target.value)}>{inventoryStates.map((value) => <option key={value}>{value}</option>)}</select><small>{item.lastInventoryDate || 'neoverené'}</small></div></td>}
          <td><span className={`asset-health-score ${health < 60 ? 'bad' : health < 80 ? 'warn' : ''}`}>{health}</span></td>
          <td><Badge tone={expiry && expiry.days <= 30 ? 'danger' : expiry && expiry.days <= 90 ? 'warning' : 'neutral'}>{item.lifecycle}</Badge><small>{expiry ? `${expiry.label} · ${expiry.days} dní` : 'bez blízkeho termínu'}</small></td>
          <td><button className="icon-button" title="Asset 360" onClick={() => setDetail(item)}><Icon name="eye" size={17}/></button></td>
        </tr>
      })}</tbody></table></div>
      <div className="asset-table-footer"><span>{filtered.length} z {items.length} aktív</span><span>Červené inventúrne stavy a termíny sú prioritizované.</span></div>
    </>}

    {tab === 'import' && <div className="asset-import-layout">
      <section className="panel asset-import-start"><div className="panel-heading"><div><span className="eyebrow">CSV / XLSX / XLS</span><h3>Hromadný import aktív</h3></div></div>
        <p>Importuj existujúci inventár zariadení. Aplikácia automaticky skúsi spárovať názvy stĺpcov, potom ich môžeš ručne upraviť. Duplicity sa kontrolujú podľa inventárneho čísla, sériového čísla a hostname.</p>
        <div className="asset-import-actions"><label className="button button-primary"><Icon name="upload" size={16}/>{importBusy ? 'Načítavam…' : 'Vybrať súbor'}<input type="file" accept=".csv,.txt,.xlsx,.xls" hidden disabled={!canCreate||importBusy} onChange={(event) => void loadImportFile(event.target.files?.[0])}/></label><button className="button button-secondary" onClick={() => downloadText('asset-import-template.csv', csvTemplate(), 'text/csv;charset=utf-8')}><Icon name="download" size={16}/>Stiahnuť šablónu CSV</button></div>
        {importError&&<div className="inline-alert inline-alert-error">{importError}</div>}
        {importMessage&&<div className="inline-alert">{importMessage}</div>}
        <div className="asset-import-rules"><strong>Odporúčané kľúče</strong><span>Inventárne číslo</span><span>Sériové číslo</span><span>Hostname</span><span>Názov</span><span>Typ</span><span>Odbor / scope</span></div>
      </section>
      {importTable&&<section className="panel asset-import-work"><div className="panel-heading"><div><span className="eyebrow">{importTable.fileName}</span><h3>Mapovanie a kontrola importu</h3><small>{importTable.rows.length} riadkov · {importTable.headers.length} stĺpcov</small></div></div>
        <div className="asset-import-controls"><Field label="Predvolený scope"><select value={importScope} onChange={(event) => setImportScope(event.target.value as AccessScope)}>{writableScopes.map((value) => <option key={value} value={value}>{scopeLabels[value]}</option>)}</select></Field><Field label="Duplicity"><select value={duplicateMode} onChange={(event) => setDuplicateMode(event.target.value as DuplicateMode)}><option value="skip">Preskočiť</option><option value="update">Aktualizovať existujúce</option><option value="create">Vytvoriť ako nové</option></select></Field></div>
        <div className="asset-import-summary"><span><b>{importPreview?.assets.length ?? 0}</b> pripravených</span><span><b>{importStats.duplicate}</b> duplicít</span><span><b>{importStats.blockedScope}</b> mimo oprávnenia</span><span><b>{importPreview?.warnings.length ?? 0}</b> upozornení</span></div>
        <details className="asset-mapping" open><summary>Mapovanie stĺpcov</summary><div>{ASSET_IMPORT_FIELDS.map((field) => <label key={String(field.key)}><span>{field.label}{field.required ? ' *' : ''}</span><select value={importMapping[field.key] ?? ''} onChange={(event) => setImportMapping((current) => ({ ...current, [field.key]: event.target.value || undefined }))}><option value="">— nepoužiť —</option>{importTable.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>)}</div></details>
        <div className="table-shell asset-import-preview"><table className="data-table"><thead><tr><th>Názov</th><th>Typ</th><th>Scope</th><th>Inventár / S/N</th><th>Pridelenie</th><th>Lokalita</th><th>Cena</th></tr></thead><tbody>{(importPreview?.assets ?? []).slice(0, 25).map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.id}</small></td><td>{item.type}</td><td>{scopeLabels[item.scope]}</td><td>{item.assetTag || '—'}<small>{item.serialNumber || ''}</small></td><td>{item.assignedTo || item.department || '—'}</td><td>{item.location || '—'}</td><td>{formatMoney(item.purchasePrice)}</td></tr>)}</tbody></table></div>
        <div className="modal-actions"><span className="muted">Import zapisuje iba scope, do ktorých máš W oprávnenie.</span><button className="button button-primary" disabled={!canCreate || !importPreview?.assets.length} onClick={commitImport}><Icon name="check" size={16}/>Importovať {importPreview?.assets.length ?? 0} aktív</button></div>
      </section>}
    </div>}

    {tab === 'relations' && <section className="panel asset-relations-panel"><div className="panel-heading"><div><span className="eyebrow">CMDB väzby</span><h3>Závislosti medzi aktívami a CI</h3></div>{canCreate&&<button className="button button-primary" onClick={() => setRelationEditing({ id:'', sourceId:'', targetId:'', type:'Závisí od', criticality:'Stredná', note:'' })}><Icon name="plus" size={16}/>Nová väzba</button>}</div>
      <div className="asset-relations-list">{relationships.map((relation) => { const sourceItem=items.find((item)=>item.id===relation.sourceId); const targetItem=items.find((item)=>item.id===relation.targetId); return <button key={relation.id} onClick={() => canEditScope(sourceItem?.scope ?? 'shared') && setRelationEditing(relation)}><div><strong>{sourceItem?.name || relation.sourceId}</strong><small>{sourceItem?.type || '—'}</small></div><span><Icon name="arrow" size={16}/>{relation.type}</span><div><strong>{targetItem?.name || relation.targetId}</strong><small>{targetItem?.type || '—'}</small></div></button> })}</div>
    </section>}

    {tab === 'lifecycle' && <section className="panel asset-lifecycle-panel"><div className="panel-heading"><div><span className="eyebrow">Nasledujúcich 12 mesiacov</span><h3>Lifecycle, záruky, podpora a plán obnovy</h3></div><Badge tone={lifecycleItems.length ? 'warning' : 'success'}>{lifecycleItems.length} udalostí</Badge></div>
      <div className="asset-lifecycle-list">{lifecycleItems.map(({item,expiry}) => <button key={item.id} onClick={() => setDetail(item)}><span className={`asset-lifecycle-days ${expiry && expiry.days < 0 ? 'expired' : expiry && expiry.days <= 90 ? 'soon' : ''}`}>{expiry ? `${expiry.days} d` : 'obnova'}</span><div><strong>{item.name}</strong><small>{item.type} · {scopeLabels[item.scope]} · {item.assetTag || item.id}</small></div><div><strong>{expiry?.label || item.lifecycle}</strong><small>{expiry?.value || item.plannedReplacementDate || 'bez dátumu'}</small></div><Badge tone={toneForCriticality(item.criticality)}>{item.criticality}</Badge></button>)}</div>
    </section>}

    {detail&&<Modal wide title={`Asset 360 · ${detail.name}`} onClose={() => setDetail(null)}><div className="asset-360-head"><div><span className="asset-ci-icon asset-ci-icon-large"><Icon name="cmdb" size={24}/></span><div><span className="eyebrow">{detail.id} · {scopeLabels[detail.scope]}</span><h2>{detail.name}</h2><p>{detail.type} · {detail.manufacturer} {detail.model}</p></div></div><div className="asset-360-actions">{canEditScope(detail.scope)&&<button className="button button-secondary" onClick={() => setEditing(detail)}><Icon name="edit" size={16}/>Upraviť</button>}<button className="button button-secondary" onClick={() => void printLabel(detail)}>QR štítok</button>{canEditScope(detail.scope)&&detail.lifecycle!=='Vyradené'&&<button className="button button-secondary" onClick={() => retireItem(detail)}>Na vyradenie</button>}{role==='admin'&&<button className="button button-danger" onClick={() => deleteItem(detail)}><Icon name="trash" size={15}/>Odstrániť</button>}</div></div>
      <div className="asset-360-kpis"><article><span>Asset Health</span><strong>{assetHealth(detail).score}/100</strong><small>kvalita a pripravenosť evidencie</small></article><article><span>Inventúra</span><strong>{detail.inventoryStatus}</strong><small>{detail.lastInventoryDate || 'neoverené'}</small></article><article><span>Hodnota</span><strong>{formatMoney(detail.purchasePrice || detail.cost)}</strong><small>ročná prevádzka {formatMoney(detail.annualOperatingCost + detail.licenseCostAnnual)}</small></article><article><span>Lifecycle</span><strong>{detail.lifecycle}</strong><small>{nearestExpiry(detail)?.label || 'bez blízkeho termínu'}</small></article></div>
      <div className="asset-360-grid">
        <section><h3>Identita a vlastníctvo</h3><dl><dt>Inventárne číslo</dt><dd>{detail.assetTag||'—'}</dd><dt>Sériové číslo</dt><dd>{detail.serialNumber||'—'}</dd><dt>Pridelené osobe</dt><dd>{detail.assignedTo||'—'}</dd><dt>Oddelenie</dt><dd>{detail.department||'—'}</dd><dt>Vecný owner</dt><dd>{detail.businessOwner||'—'}</dd><dt>Technický owner</dt><dd>{detail.technicalOwner||'—'}</dd></dl></section>
        <section><h3>Lokalita a technika</h3><dl><dt>Lokalita</dt><dd>{detail.location||'—'}{detail.room?` · ${detail.room}`:''}</dd><dt>Hostname</dt><dd>{detail.hostname||'—'}</dd><dt>IP adresa</dt><dd>{detail.ipAddress||'—'}</dd><dt>Výrobca / model</dt><dd>{`${detail.manufacturer} ${detail.model}`.trim()||'—'}</dd><dt>Monitoring</dt><dd>{detail.monitoring||'—'}</dd><dt>Backup</dt><dd>{detail.backup||'—'}</dd></dl></section>
        <section><h3>Financie a dodávateľ</h3><dl><dt>Dodávateľ</dt><dd>{detail.supplier||'—'}{detail.supplierIco?` · IČO ${detail.supplierIco}`:''}</dd><dt>Zmluva</dt><dd>{detail.contractRef||'—'}</dd><dt>Úloha</dt><dd>{detail.contractTask||'—'}</dd><dt>Obstarávacia cena</dt><dd>{formatMoney(detail.purchasePrice)}</dd><dt>Ročný RUN</dt><dd>{formatMoney(detail.annualOperatingCost)}</dd><dt>Ročné licencie</dt><dd>{formatMoney(detail.licenseCostAnnual)}</dd></dl></section>
        <section><h3>Služba a lifecycle</h3><dl><dt>Služba</dt><dd>{serviceName(detail.serviceId)}</dd><dt>Dátum nákupu</dt><dd>{detail.purchaseDate||'—'}</dd><dt>Záruka do</dt><dd>{detail.warrantyEnd||'—'}</dd><dt>Podpora do</dt><dd>{detail.supportEnd||'—'}</dd><dt>Plán obnovy</dt><dd>{detail.plannedReplacementDate||'—'}</dd><dt>Zdroj evidencie</dt><dd>{detail.source||'—'}</dd></dl></section>
      </div>
      <section className="asset-health-detail"><h3>Asset Health · vysvetlenie</h3><div>{assetHealth(detail).checks.map((check) => <span key={check.label} className={check.ok?'ok':'gap'}><Icon name={check.ok?'check':'warning'} size={14}/>{check.label}<b>{check.ok?'OK':'Doplniť'}</b></span>)}</div></section>
      <section className="asset-history"><h3>Auditná história</h3>{(detail.history??[]).length ? [...detail.history].reverse().slice(0,20).map((entry) => <article key={entry.id}><span>{new Date(entry.createdAt).toLocaleString('sk-SK')}</span><strong>{entry.action}</strong><p>{entry.detail}</p><small>{entry.actor}</small></article>) : <p className="muted">História sa začne zaznamenávať pri najbližšej úprave alebo inventúre.</p>}</section>
    </Modal>}

    {editing&&<Modal wide title={editing.id ? `Upraviť aktívum · ${editing.id}` : 'Nové aktívum'} onClose={() => setEditing(null)}><div className="asset-form form-grid">
      <Field label="Názov"><input value={editing.name} onChange={(e)=>setEditing({...editing,name:e.target.value})}/></Field>
      <Field label="Typ"><select value={editing.type} onChange={(e)=>setEditing({...editing,type:e.target.value,assetClass:inferAssetClass(e.target.value)})}>{itemTypes.map((value)=><option key={value}>{value}</option>)}</select></Field>
      <Field label="Scope / odbor"><select value={editing.scope} disabled={role!=='admin'&&!writableScopes.includes(editing.scope)} onChange={(e)=>setEditing({...editing,scope:e.target.value as AccessScope})}>{(['oit','oris','shared'] as AccessScope[]).filter((value)=>role==='admin'||writableScopes.includes(value)||value===editing.scope).map((value)=><option key={value} value={value}>{scopeLabels[value]}</option>)}</select></Field>
      <Field label="Kategória"><input value={editing.category} onChange={(e)=>setEditing({...editing,category:e.target.value})}/></Field>
      <Field label="Stav"><select value={editing.status} onChange={(e)=>setEditing({...editing,status:e.target.value})}>{statuses.map((value)=><option key={value}>{value}</option>)}</select></Field>
      <Field label="Lifecycle"><select value={editing.lifecycle} onChange={(e)=>setEditing({...editing,lifecycle:e.target.value})}>{lifecycleStates.map((value)=><option key={value}>{value}</option>)}</select></Field>
      <Field label="Kritickosť"><select value={editing.criticality} onChange={(e)=>setEditing({...editing,criticality:e.target.value})}>{criticalities.map((value)=><option key={value}>{value}</option>)}</select></Field>
      <Field label="Inventárne číslo"><input value={editing.assetTag} onChange={(e)=>setEditing({...editing,assetTag:e.target.value})}/></Field>
      <Field label="Sériové číslo"><input value={editing.serialNumber} onChange={(e)=>setEditing({...editing,serialNumber:e.target.value})}/></Field>
      <Field label="Výrobca"><input value={editing.manufacturer} onChange={(e)=>setEditing({...editing,manufacturer:e.target.value})}/></Field>
      <Field label="Model"><input value={editing.model} onChange={(e)=>setEditing({...editing,model:e.target.value})}/></Field>
      <Field label="Pridelené osobe"><input list="asset-employees" value={editing.assignedTo} onChange={(e)=>setEditing({...editing,assignedTo:e.target.value})}/><datalist id="asset-employees">{employeeOptions.map((name)=><option key={name} value={name}/>)}</datalist></Field>
      <Field label="Oddelenie / odbor"><input value={editing.department} onChange={(e)=>setEditing({...editing,department:e.target.value})}/></Field>
      <Field label="Lokalita"><input value={editing.location} onChange={(e)=>setEditing({...editing,location:e.target.value})}/></Field>
      <Field label="Miestnosť"><input value={editing.room} onChange={(e)=>setEditing({...editing,room:e.target.value})}/></Field>
      <Field label="Nákladové stredisko"><input value={editing.costCenter} onChange={(e)=>setEditing({...editing,costCenter:e.target.value})}/></Field>
      <Field label="Vecný vlastník"><input list="asset-employees" value={editing.businessOwner} onChange={(e)=>setEditing({...editing,businessOwner:e.target.value})}/></Field>
      <Field label="Technický vlastník"><input list="asset-employees" value={editing.technicalOwner} onChange={(e)=>setEditing({...editing,technicalOwner:e.target.value})}/></Field>
      <Field label="Súvisiaca služba"><select value={editing.serviceId} onChange={(e)=>setEditing({...editing,serviceId:e.target.value})}><option value="">Bez služby</option>{services.map((service)=><option key={service.id} value={service.id}>{service.name}</option>)}</select></Field>
      <Field label="Dodávateľ"><input list="asset-suppliers" value={editing.supplier} onChange={(e)=>setEditing({...editing,supplier:e.target.value})}/><datalist id="asset-suppliers">{suppliers.map((supplier)=><option key={supplier.id} value={supplier.name}>{supplier.ico}</option>)}</datalist></Field>
      <Field label="IČO dodávateľa"><input value={editing.supplierIco} onChange={(e)=>setEditing({...editing,supplierIco:e.target.value.replace(/\D/g,'')})}/></Field>
      <Field label="Zmluva"><input value={editing.contractRef} onChange={(e)=>setEditing({...editing,contractRef:e.target.value})}/></Field>
      <Field label="Úloha 10 / 22 / 25"><input value={editing.contractTask} onChange={(e)=>setEditing({...editing,contractTask:e.target.value})}/></Field>
      <Field label="Dátum nákupu"><input type="date" value={editing.purchaseDate} onChange={(e)=>setEditing({...editing,purchaseDate:e.target.value})}/></Field>
      <Field label="Obstarávacia cena"><input type="number" step="0.01" value={editing.purchasePrice} onChange={(e)=>setEditing({...editing,purchasePrice:Number(e.target.value)})}/></Field>
      <Field label="Ročný prevádzkový náklad"><input type="number" step="0.01" value={editing.annualOperatingCost} onChange={(e)=>setEditing({...editing,annualOperatingCost:Number(e.target.value)})}/></Field>
      <Field label="Ročný licenčný náklad"><input type="number" step="0.01" value={editing.licenseCostAnnual} onChange={(e)=>setEditing({...editing,licenseCostAnnual:Number(e.target.value)})}/></Field>
      <Field label="Koniec záruky"><input type="date" value={editing.warrantyEnd} onChange={(e)=>setEditing({...editing,warrantyEnd:e.target.value})}/></Field>
      <Field label="Koniec podpory"><input type="date" value={editing.supportEnd} onChange={(e)=>setEditing({...editing,supportEnd:e.target.value})}/></Field>
      <Field label="Koniec licencie"><input type="date" value={editing.licenseEnd} onChange={(e)=>setEditing({...editing,licenseEnd:e.target.value})}/></Field>
      <Field label="Koniec zmluvy"><input type="date" value={editing.contractEnd} onChange={(e)=>setEditing({...editing,contractEnd:e.target.value})}/></Field>
      <Field label="Plán obnovy"><input type="date" value={editing.plannedReplacementDate} onChange={(e)=>setEditing({...editing,plannedReplacementDate:e.target.value})}/></Field>
      <Field label="Hostname"><input value={editing.hostname} onChange={(e)=>setEditing({...editing,hostname:e.target.value})}/></Field>
      <Field label="IP adresa"><input value={editing.ipAddress} onChange={(e)=>setEditing({...editing,ipAddress:e.target.value})}/></Field>
      <Field label="Monitoring"><input value={editing.monitoring} onChange={(e)=>setEditing({...editing,monitoring:e.target.value})}/></Field>
      <Field label="Backup"><input value={editing.backup} onChange={(e)=>setEditing({...editing,backup:e.target.value})}/></Field>
      <Field label="Dokumentácia"><input value={editing.documentation} onChange={(e)=>setEditing({...editing,documentation:e.target.value})}/></Field>
      <Field label="Inventúrny stav"><select value={editing.inventoryStatus} onChange={(e)=>setEditing({...editing,inventoryStatus:e.target.value})}>{inventoryStates.map((value)=><option key={value}>{value}</option>)}</select></Field>
      <label className="field full"><span>Poznámka</span><textarea rows={3} value={editing.note} onChange={(e)=>setEditing({...editing,note:e.target.value})}/></label>
    </div><div className="modal-actions"><button className="button button-ghost" onClick={()=>setEditing(null)}>Zrušiť</button><button className="button button-primary" disabled={!editing.name.trim()||!canEditScope(editing.scope)} onClick={()=>saveItem(editing)}>Uložiť aktívum</button></div></Modal>}

    {relationEditing&&<Modal title={relationEditing.id?'Upraviť väzbu':'Nová väzba'} onClose={()=>setRelationEditing(null)}><div className="form-grid">
      <Field label="Zdroj"><select value={relationEditing.sourceId} onChange={(e)=>setRelationEditing({...relationEditing,sourceId:e.target.value})}><option value="">Vyberte</option>{items.map((item)=><option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></Field>
      <Field label="Cieľ"><select value={relationEditing.targetId} onChange={(e)=>setRelationEditing({...relationEditing,targetId:e.target.value})}><option value="">Vyberte</option>{items.map((item)=><option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></Field>
      <Field label="Typ väzby"><select value={relationEditing.type} onChange={(e)=>setRelationEditing({...relationEditing,type:e.target.value})}>{['Závisí od','Beží na','Používa','Je súčasťou','Je pripojené k','Je chránené','Je podporované','Nahrádza'].map((value)=><option key={value}>{value}</option>)}</select></Field>
      <Field label="Kritickosť"><select value={relationEditing.criticality} onChange={(e)=>setRelationEditing({...relationEditing,criticality:e.target.value})}>{criticalities.map((value)=><option key={value}>{value}</option>)}</select></Field>
      <label className="field full"><span>Poznámka</span><textarea rows={3} value={relationEditing.note} onChange={(e)=>setRelationEditing({...relationEditing,note:e.target.value})}/></label>
    </div><div className="modal-actions"><button className="button button-ghost" onClick={()=>setRelationEditing(null)}>Zrušiť</button><button className="button button-primary" disabled={!relationEditing.sourceId||!relationEditing.targetId||relationEditing.sourceId===relationEditing.targetId} onClick={()=>saveRelationship(relationEditing)}>Uložiť väzbu</button></div></Modal>}
  </div>
}
