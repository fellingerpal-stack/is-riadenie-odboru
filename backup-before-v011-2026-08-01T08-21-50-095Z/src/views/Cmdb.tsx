import { useMemo, useState } from 'react'
import type { ChangeRequest, CmdbItem, CmdbRelationship, Service, Ticket } from '../types'
import { Badge, Field, Icon, Modal, PageHeader } from '../components/UI'
import './Cmdb.css'

const itemTypes = ['Aplikácia', 'Server', 'Databáza', 'Sieťový prvok', 'Pracovná stanica', 'Licencia', 'Zmluva', 'Iné']
const statuses = ['V prevádzke', 'V príprave', 'Obmedzená prevádzka', 'Mimo prevádzky', 'Vyradené']
const criticalities = ['Kritická', 'Vysoká', 'Stredná', 'Nízka']
const lifecycleStates = ['Plánované', 'Obstarané', 'V prevádzke', 'Na obnovu', 'Ukončované', 'Vyradené']

function emptyItem(): CmdbItem {
  return {
    id: '',
    name: '',
    type: 'Aplikácia',
    category: '',
    status: 'V prevádzke',
    criticality: 'Stredná',
    serviceId: '',
    businessOwner: '',
    technicalOwner: '',
    custodian: '',
    environment: 'Produkcia',
    location: '',
    supplier: '',
    version: '',
    hostname: '',
    ipAddress: '',
    serialNumber: '',
    assetTag: '',
    purchaseDate: '',
    warrantyEnd: '',
    licenseEnd: '',
    contractEnd: '',
    supportEnd: '',
    cost: 0,
    dataClassification: 'Interné',
    monitoring: '',
    backup: '',
    documentation: '',
    lifecycle: 'V prevádzke',
    linkedTicketIds: [],
    linkedChangeIds: [],
    note: '',
    updatedAt: new Date().toISOString(),
  }
}

function emptyRelationship(): CmdbRelationship {
  return { id: '', sourceId: '', targetId: '', type: 'Závisí od', criticality: 'Stredná', note: '' }
}

function parseDate(value: string) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysUntil(value: string) {
  const date = parseDate(value)
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000)
}

function expiryDates(item: CmdbItem) {
  return [
    { label: 'Záruka', value: item.warrantyEnd },
    { label: 'Licencia', value: item.licenseEnd },
    { label: 'Zmluva', value: item.contractEnd },
    { label: 'Podpora', value: item.supportEnd },
  ].filter((entry) => entry.value)
}

function nearestExpiry(item: CmdbItem) {
  return expiryDates(item)
    .map((entry) => ({ ...entry, days: daysUntil(entry.value) }))
    .filter((entry): entry is { label: string; value: string; days: number } => entry.days !== null)
    .sort((a, b) => a.days - b.days)[0]
}

function typeTone(type: string): 'info' | 'purple' | 'warning' | 'neutral' {
  if (type === 'Aplikácia' || type === 'Databáza') return 'info'
  if (type === 'Licencia' || type === 'Zmluva') return 'purple'
  if (type === 'Server' || type === 'Sieťový prvok') return 'warning'
  return 'neutral'
}

export default function Cmdb({
  items,
  relationships,
  services,
  tickets,
  changes,
  canEdit,
  onItemsChange,
  onRelationshipsChange,
}: {
  items: CmdbItem[]
  relationships: CmdbRelationship[]
  services: Service[]
  tickets: Ticket[]
  changes: ChangeRequest[]
  canEdit: boolean
  onItemsChange: (items: CmdbItem[]) => void
  onRelationshipsChange: (relationships: CmdbRelationship[]) => void
}) {
  const [tab, setTab] = useState<'register' | 'relations' | 'lifecycle'>('register')
  const [search, setSearch] = useState('')
  const [type, setType] = useState('Všetky')
  const [status, setStatus] = useState('Všetky')
  const [criticality, setCriticality] = useState('Všetky')
  const [editing, setEditing] = useState<CmdbItem | null>(null)
  const [relationEditing, setRelationEditing] = useState<CmdbRelationship | null>(null)

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchesSearch = !needle || `${item.id} ${item.name} ${item.type} ${item.hostname} ${item.ipAddress} ${item.businessOwner} ${item.technicalOwner} ${item.documentation} ${item.lifecycle} ${item.supplier}`.toLowerCase().includes(needle)
      return matchesSearch && (type === 'Všetky' || item.type === type) && (status === 'Všetky' || item.status === status) && (criticality === 'Všetky' || item.criticality === criticality)
    })
  }, [items, search, type, status, criticality])

  const criticalCount = items.filter((item) => item.criticality === 'Kritická').length
  const ownerGapCount = items.filter((item) => !item.businessOwner || !item.technicalOwner).length
  const documentationGapCount = items.filter((item) => !item.documentation || item.documentation.toLowerCase().includes('chýba')).length
  const lifecycleRiskCount = items.filter((item) => {
    const expiry = nearestExpiry(item)
    return item.lifecycle === 'Na obnovu' || (expiry?.days ?? 9999) <= 90
  }).length

  const lifecycleItems = useMemo(
    () => items
      .map((item) => ({ item, expiry: nearestExpiry(item) }))
      .filter(({ item, expiry }) => item.lifecycle === 'Na obnovu' || Boolean(expiry && expiry.days <= 180))
      .sort((a, b) => (a.expiry?.days ?? 9999) - (b.expiry?.days ?? 9999)),
    [items],
  )

  function saveItem(item: CmdbItem) {
    const now = new Date().toISOString()
    const normalized = {
      ...item,
      id: item.id.trim() || `CI-${String(items.length + 1).padStart(4, '0')}`,
      name: item.name.trim() || 'Bez názvu',
      updatedAt: now,
    }
    const exists = items.some((candidate) => candidate.id === normalized.id)
    onItemsChange(exists ? items.map((candidate) => candidate.id === normalized.id ? normalized : candidate) : [normalized, ...items])
    setEditing(null)
  }

  function saveRelationship(value: CmdbRelationship) {
    if (!value.sourceId || !value.targetId || value.sourceId === value.targetId) return
    const normalized = { ...value, id: value.id || `REL-${crypto.randomUUID().slice(0, 8)}` }
    const exists = relationships.some((candidate) => candidate.id === normalized.id)
    onRelationshipsChange(exists ? relationships.map((candidate) => candidate.id === normalized.id ? normalized : candidate) : [normalized, ...relationships])
    setRelationEditing(null)
  }

  const itemName = (id: string) => items.find((item) => item.id === id)?.name || id || 'Neurčené'
  const serviceName = (id: string) => services.find((service) => service.id === id)?.name || 'Bez služby'

  return (
    <div className="cmdb-page">
      <PageHeader
        eyebrow="Prevádzka a aktíva"
        title="CMDB a evidencia aktív"
        description="Jednotný register aplikácií, infraštruktúry, zariadení, licencií, zmlúv a ich vzájomných závislostí."
        actions={canEdit ? (
          <button type="button" className="button button-primary" onClick={() => setEditing(emptyItem())}>
            <Icon name="plus" size={17} /> Nová položka
          </button>
        ) : undefined}
      />

      <div className="cmdb-kpis">
        <button type="button" onClick={() => { setTab('register'); setType('Všetky'); setStatus('Všetky'); setCriticality('Všetky') }}>
          <span>Konfiguračné položky</span><strong>{items.length}</strong><small>v centrálnom registri</small>
        </button>
        <button type="button" onClick={() => { setTab('register'); setCriticality('Kritická') }}>
          <span>Kritické CI</span><strong>{criticalCount}</strong><small>vyžadujú zvýšenú kontrolu</small>
        </button>
        <button type="button" className={lifecycleRiskCount ? 'alert' : ''} onClick={() => setTab('lifecycle')}>
          <span>Obnova / koniec platnosti</span><strong>{lifecycleRiskCount}</strong><small>do 90 dní alebo na obnovu</small>
        </button>
        <button type="button" className={ownerGapCount ? 'alert' : ''} onClick={() => { setTab('register'); setSearch('') }}>
          <span>Neúplné vlastníctvo</span><strong>{ownerGapCount}</strong><small>chýba vecný alebo technický vlastník</small>
        </button>
        <button type="button" className={documentationGapCount ? 'alert' : ''} onClick={() => { setTab('register'); setSearch('chýba') }}>
          <span>Dokumentačné medzery</span><strong>{documentationGapCount}</strong><small>bez použiteľnej dokumentácie</small>
        </button>
      </div>

      <div className="tabs cmdb-tabs">
        <button className={tab === 'register' ? 'active' : ''} onClick={() => setTab('register')}><Icon name="cmdb" size={17}/> Register <span>{items.length}</span></button>
        <button className={tab === 'relations' ? 'active' : ''} onClick={() => setTab('relations')}><Icon name="substitute" size={17}/> Väzby <span>{relationships.length}</span></button>
        <button className={tab === 'lifecycle' ? 'active' : ''} onClick={() => setTab('lifecycle')}><Icon name="calendar" size={17}/> Životný cyklus <span>{lifecycleItems.length}</span></button>
      </div>

      {tab === 'register' ? (
        <>
          <div className="toolbar cmdb-toolbar">
            <div className="search-box"><Icon name="search" size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Názov, kód, hostname, IP alebo vlastník…"/></div>
            <select value={type} onChange={(event) => setType(event.target.value)}><option>Všetky</option>{itemTypes.map((value) => <option key={value}>{value}</option>)}</select>
            <select value={status} onChange={(event) => setStatus(event.target.value)}><option>Všetky</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select>
            <select value={criticality} onChange={(event) => setCriticality(event.target.value)}><option>Všetky</option>{criticalities.map((value) => <option key={value}>{value}</option>)}</select>
            <Badge tone="info">{filtered.length} položiek</Badge>
          </div>

          <div className="table-shell cmdb-table-shell">
            <table className="data-table cmdb-table">
              <thead><tr><th>CI / aktívum</th><th>Typ</th><th>Služba</th><th>Vlastníci</th><th>Stav</th><th>Životný cyklus</th><th>Najbližší termín</th></tr></thead>
              <tbody>
                {filtered.map((item) => {
                  const expiry = nearestExpiry(item)
                  return (
                    <tr key={item.id} className="clickable-row" onClick={() => setEditing(item)}>
                      <td><div className="cmdb-primary"><span className="cmdb-ci-icon"><Icon name="cmdb" size={18}/></span><div><strong>{item.name}</strong><small>{item.id}{item.hostname ? ` · ${item.hostname}` : ''}{item.ipAddress ? ` · ${item.ipAddress}` : ''}</small></div></div></td>
                      <td><Badge tone={typeTone(item.type)}>{item.type}</Badge></td>
                      <td><strong className="cmdb-service-name">{serviceName(item.serviceId)}</strong><small>{item.environment || 'Bez prostredia'}</small></td>
                      <td><strong>{item.businessOwner || 'Chýba vecný vlastník'}</strong><small>{item.technicalOwner || 'Chýba technický vlastník'}</small></td>
                      <td><Badge tone={item.status === 'V prevádzke' ? 'success' : item.status === 'Mimo prevádzky' ? 'danger' : 'warning'}>{item.status}</Badge><small>{item.criticality}</small></td>
                      <td><strong>{item.lifecycle}</strong><small>{item.version || item.supplier || 'Bez doplnenia'}</small></td>
                      <td>{expiry ? <><strong className={expiry.days < 0 ? 'danger-text' : expiry.days <= 90 ? 'cmdb-warning-text' : ''}>{expiry.label}: {expiry.value}</strong><small>{expiry.days < 0 ? `${Math.abs(expiry.days)} dní po termíne` : `o ${expiry.days} dní`}</small></> : <span className="muted">Bez termínu</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === 'relations' ? (
        <section className="panel cmdb-relations-panel">
          <div className="panel-heading"><div><div className="eyebrow">Mapa závislostí</div><h3>Väzby medzi konfiguračnými položkami</h3></div>{canEdit ? <button className="button button-secondary" onClick={() => setRelationEditing(emptyRelationship())}><Icon name="plus" size={16}/> Nová väzba</button> : null}</div>
          <div className="cmdb-relations-list">
            {relationships.map((relationship) => (
              <button key={relationship.id} type="button" onClick={() => setRelationEditing(relationship)}>
                <div><span className="cmdb-node">{itemName(relationship.sourceId)}</span><small>{relationship.sourceId}</small></div>
                <div className="cmdb-relation-arrow"><Badge tone={relationship.criticality === 'Kritická' ? 'danger' : 'info'}>{relationship.type}</Badge><Icon name="arrow" size={20}/></div>
                <div><span className="cmdb-node">{itemName(relationship.targetId)}</span><small>{relationship.targetId}</small></div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {tab === 'lifecycle' ? (
        <section className="panel cmdb-lifecycle-panel">
          <div className="panel-heading"><div><div className="eyebrow">Obnova a platnosť</div><h3>Najbližšie termíny životného cyklu</h3></div><Badge tone={lifecycleRiskCount ? 'warning' : 'success'}>{lifecycleRiskCount} do 90 dní</Badge></div>
          <div className="cmdb-lifecycle-list">
            {lifecycleItems.length ? lifecycleItems.map(({ item, expiry }) => (
              <button type="button" key={item.id} onClick={() => setEditing(item)}>
                <span className={`cmdb-lifecycle-days ${(expiry?.days ?? 999) < 0 ? 'expired' : (expiry?.days ?? 999) <= 90 ? 'soon' : ''}`}>{expiry ? (expiry.days < 0 ? `${Math.abs(expiry.days)} d po` : `${expiry.days} d`) : 'Obnova'}</span>
                <div><strong>{item.name}</strong><small>{item.id} · {item.type} · {item.lifecycle}</small></div>
                <div><strong>{expiry ? `${expiry.label}: ${expiry.value}` : 'Označené na obnovu'}</strong><small>{item.technicalOwner || 'Bez technického vlastníka'}</small></div>
              </button>
            )) : <p className="muted-copy">Nie sú evidované blízke termíny ani položky označené na obnovu.</p>}
          </div>
        </section>
      ) : null}

      {editing ? (
        <Modal title={editing.id ? `${editing.id} · ${editing.name}` : 'Nová konfiguračná položka'} onClose={() => setEditing(null)} wide>
          <div className="form-grid cmdb-form">
            <Field label="Kód CI"><input value={editing.id} disabled={Boolean(items.some((item) => item.id === editing.id))} onChange={(event) => setEditing({ ...editing, id: event.target.value })}/></Field>
            <Field label="Názov"><input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })}/></Field>
            <Field label="Typ"><select value={editing.type} onChange={(event) => setEditing({ ...editing, type: event.target.value })}>{itemTypes.map((value) => <option key={value}>{value}</option>)}</select></Field>
            <Field label="Kategória"><input value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })}/></Field>
            <Field label="Stav"><select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></Field>
            <Field label="Kritickosť"><select value={editing.criticality} onChange={(event) => setEditing({ ...editing, criticality: event.target.value })}>{criticalities.map((value) => <option key={value}>{value}</option>)}</select></Field>
            <Field label="Súvisiaca služba"><select value={editing.serviceId} onChange={(event) => setEditing({ ...editing, serviceId: event.target.value })}><option value="">Bez služby</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></Field>
            <Field label="Životný cyklus"><select value={editing.lifecycle} onChange={(event) => setEditing({ ...editing, lifecycle: event.target.value })}>{lifecycleStates.map((value) => <option key={value}>{value}</option>)}</select></Field>
            <Field label="Vecný vlastník"><input value={editing.businessOwner} onChange={(event) => setEditing({ ...editing, businessOwner: event.target.value })}/></Field>
            <Field label="Technický vlastník"><input value={editing.technicalOwner} onChange={(event) => setEditing({ ...editing, technicalOwner: event.target.value })}/></Field>
            <Field label="Správca / custodian"><input value={editing.custodian} onChange={(event) => setEditing({ ...editing, custodian: event.target.value })}/></Field>
            <Field label="Prostredie"><input value={editing.environment} onChange={(event) => setEditing({ ...editing, environment: event.target.value })}/></Field>
            <Field label="Umiestnenie"><input value={editing.location} onChange={(event) => setEditing({ ...editing, location: event.target.value })}/></Field>
            <Field label="Dodávateľ"><input value={editing.supplier} onChange={(event) => setEditing({ ...editing, supplier: event.target.value })}/></Field>
            <Field label="Verzia"><input value={editing.version} onChange={(event) => setEditing({ ...editing, version: event.target.value })}/></Field>
            <Field label="Hostname"><input value={editing.hostname} onChange={(event) => setEditing({ ...editing, hostname: event.target.value })}/></Field>
            <Field label="IP adresa"><input value={editing.ipAddress} onChange={(event) => setEditing({ ...editing, ipAddress: event.target.value })}/></Field>
            <Field label="Sériové číslo"><input value={editing.serialNumber} onChange={(event) => setEditing({ ...editing, serialNumber: event.target.value })}/></Field>
            <Field label="Inventárne číslo"><input value={editing.assetTag} onChange={(event) => setEditing({ ...editing, assetTag: event.target.value })}/></Field>
            <Field label="Koniec záruky"><input type="date" value={editing.warrantyEnd} onChange={(event) => setEditing({ ...editing, warrantyEnd: event.target.value })}/></Field>
            <Field label="Koniec licencie"><input type="date" value={editing.licenseEnd} onChange={(event) => setEditing({ ...editing, licenseEnd: event.target.value })}/></Field>
            <Field label="Koniec zmluvy"><input type="date" value={editing.contractEnd} onChange={(event) => setEditing({ ...editing, contractEnd: event.target.value })}/></Field>
            <Field label="Koniec podpory"><input type="date" value={editing.supportEnd} onChange={(event) => setEditing({ ...editing, supportEnd: event.target.value })}/></Field>
            <Field label="Monitoring"><input value={editing.monitoring} onChange={(event) => setEditing({ ...editing, monitoring: event.target.value })}/></Field>
            <Field label="Zálohovanie"><input value={editing.backup} onChange={(event) => setEditing({ ...editing, backup: event.target.value })}/></Field>
            <Field label="Dokumentácia"><input value={editing.documentation} onChange={(event) => setEditing({ ...editing, documentation: event.target.value })}/></Field>
            <Field label="Klasifikácia údajov"><input value={editing.dataClassification} onChange={(event) => setEditing({ ...editing, dataClassification: event.target.value })}/></Field>
            <label className="field full"><span>Poznámka</span><textarea rows={3} value={editing.note} onChange={(event) => setEditing({ ...editing, note: event.target.value })}/></label>
          </div>
          <div className="cmdb-linked-summary">
            <span><strong>{editing.linkedTicketIds.length}</strong> prepojených ticketov</span>
            <span><strong>{editing.linkedChangeIds.length}</strong> prepojených zmien</span>
            <span><strong>{tickets.filter((ticket) => editing.linkedTicketIds.includes(ticket.id)).length}</strong> dostupných väzieb na incidenty</span>
            <span><strong>{changes.filter((change) => editing.linkedChangeIds.includes(change.id)).length}</strong> dostupných väzieb na zmeny</span>
          </div>
          <div className="modal-actions"><button className="button button-ghost" onClick={() => setEditing(null)}>Zrušiť</button><button className="button button-primary" disabled={!canEdit} onClick={() => saveItem(editing)}>Uložiť položku</button></div>
        </Modal>
      ) : null}

      {relationEditing ? (
        <Modal title={relationEditing.id ? 'Upraviť väzbu' : 'Nová väzba'} onClose={() => setRelationEditing(null)}>
          <div className="form-grid">
            <Field label="Zdrojová položka"><select value={relationEditing.sourceId} onChange={(event) => setRelationEditing({ ...relationEditing, sourceId: event.target.value })}><option value="">Vyberte</option>{items.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></Field>
            <Field label="Cieľová položka"><select value={relationEditing.targetId} onChange={(event) => setRelationEditing({ ...relationEditing, targetId: event.target.value })}><option value="">Vyberte</option>{items.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></Field>
            <Field label="Typ väzby"><select value={relationEditing.type} onChange={(event) => setRelationEditing({ ...relationEditing, type: event.target.value })}>{['Závisí od', 'Beží na', 'Používa', 'Je súčasťou', 'Je chránené', 'Je podporované'].map((value) => <option key={value}>{value}</option>)}</select></Field>
            <Field label="Kritickosť väzby"><select value={relationEditing.criticality} onChange={(event) => setRelationEditing({ ...relationEditing, criticality: event.target.value })}>{criticalities.map((value) => <option key={value}>{value}</option>)}</select></Field>
            <label className="field full"><span>Poznámka</span><textarea rows={3} value={relationEditing.note} onChange={(event) => setRelationEditing({ ...relationEditing, note: event.target.value })}/></label>
          </div>
          <div className="modal-actions"><button className="button button-ghost" onClick={() => setRelationEditing(null)}>Zrušiť</button><button className="button button-primary" disabled={!canEdit || !relationEditing.sourceId || !relationEditing.targetId || relationEditing.sourceId === relationEditing.targetId} onClick={() => saveRelationship(relationEditing)}>Uložiť väzbu</button></div>
        </Modal>
      ) : null}
    </div>
  )
}
