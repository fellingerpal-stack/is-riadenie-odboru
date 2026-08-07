import { useMemo, useState, type FormEvent } from 'react'
import { Badge, Empty, Field, Icon, Modal, PageHeader } from '../components/UI'
import type { AppRole, AppState, SupplierRecord } from '../types'
import { buildSupplierDirectory, normalizeSupplierText, supplierKey, type SupplierDirectoryItem } from '../lib/supplierDirectory'
import { knownSupplierByIco, normalizeSupplierIco } from '../data/supplierRegistry'
import './Suppliers.css'

const money = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const money2 = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Máj']

type SupplierFilter = 'all' | 'payments' | 'systems' | 'unresolved'

interface Props {
  state: AppState
  canEdit: boolean
  currentUser: string
  role: AppRole
  onChange: (records: SupplierRecord[]) => void
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

function valueOrDash(value?: string) { return value?.trim() || '—' }

export default function Suppliers({ state, canEdit, currentUser, role, onChange, go }: Props) {
  const directory = useMemo(() => buildSupplierDirectory(state), [state])
  const canOpenAdvanced = role !== 'employee'
  const [query, setQuery] = useState('')
  const [task, setTask] = useState('all')
  const [filter, setFilter] = useState<SupplierFilter>('all')
  const [selectedKey, setSelectedKey] = useState(directory[0]?.key || '')
  const [editing, setEditing] = useState<SupplierDirectoryItem | null | undefined>(undefined)
  const [newMode, setNewMode] = useState(false)

  const filtered = directory.filter(item => {
    const haystack = normalizeSupplierText(`${item.name} ${item.ico} ${item.contracts.join(' ')} ${item.topNotes.join(' ')} ${item.systems.map(system => system.name).join(' ')}`)
    if (query && !haystack.includes(normalizeSupplierText(query))) return false
    if (task !== 'all' && !item.tasks.includes(task)) return false
    if (filter === 'payments' && item.paymentCount === 0) return false
    if (filter === 'systems' && item.systems.length === 0) return false
    if (filter === 'unresolved' && (item.verifiedName || item.record?.name)) return false
    return true
  })
  const selected = filtered.find(item => item.key === selectedKey) || directory.find(item => item.key === selectedKey) || filtered[0] || directory[0]
  const totalAmount = directory.reduce((total, item) => total + item.amount, 0)
  const namedCount = directory.filter(item => item.verifiedName || item.record?.name).length
  const unresolvedCount = directory.filter(item => !item.verifiedName && !item.record?.name && item.ico).length
  const contractCount = new Set(directory.flatMap(item => item.contracts)).size
  const systemLinks = directory.reduce((total, item) => total + item.systems.length, 0)

  function openEdit(item: SupplierDirectoryItem) {
    if (!canEdit) return
    setNewMode(false)
    setEditing(item)
  }

  function openNew() {
    if (!canEdit) return
    setNewMode(true)
    setEditing(null)
  }

  function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEdit) return
    const form = new FormData(event.currentTarget)
    const ico = normalizeSupplierIco(form.get('ico'))
    const name = String(form.get('name') || '').trim()
    if (!ico && !name) return
    const base = newMode ? null : editing
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
    setEditing(undefined)
    setNewMode(false)
  }

  function deleteOverride(item: SupplierDirectoryItem) {
    if (!canEdit || !item.record) return
    if (!confirm(`Odstrániť spravovanú kartu dodávateľa „${item.name}“? Zdrojové platby a väzby zostanú zachované.`)) return
    onChange(state.supplierRecords.filter(record => record.id !== item.record?.id))
  }

  return <div className="supplier-page">
    <PageHeader
      eyebrow="Spoločný register 3.1 + 3.2"
      title="Dodávatelia a zmluvné väzby"
      description="Register spája IČO zo SIT platieb, zmluvné referencie a dodávateľov evidovaných pri informačných systémoch. Neznáme firmy sa nedohadujú – zostávajú označené IČO, kým ich admin nepotvrdí."
      actions={canEdit ? <button className="button button-primary" onClick={openNew}><Icon name="plus" size={17}/> Nový dodávateľ</button> : undefined}
    />

    <section className={`supplier-access-note ${canEdit ? 'is-admin' : ''}`}>
      <Icon name={canEdit ? 'shield' : 'eye'} size={20}/>
      <div><strong>{canEdit ? 'Admin režim · správa povolená' : 'Read-only register'}</strong><span>{canEdit ? 'Môžete dopĺňať názvy, kontakty, vlastníkov, odkazy a poznámky. Zdrojové platby sa tým nemenia.' : 'Zoznam a detail dodávateľov môže čítať každý prihlásený používateľ. Úpravy sú dostupné iba administrátorovi.'}</span></div>
    </section>

    <section className="supplier-kpis">
      <article><span>Dodávateľské identity</span><strong>{directory.length}</strong><small>{namedCount} s pomenovaním</small></article>
      <article><span>SIT platby 2026</span><strong>{money.format(totalAmount)}</strong><small>úlohy 10 / 22 / 25</small></article>
      <article><span>Zmluvné referencie</span><strong>{contractCount}</strong><small>unikátne čísla v platbách</small></article>
      <article><span>Väzby na IS</span><strong>{systemLinks}</strong><small>dodávateľ uvedený pri systéme</small></article>
      <article className={unresolvedCount ? 'is-warning' : ''}><span>IČO bez názvu</span><strong>{unresolvedCount}</strong><small>{unresolvedCount ? 'na potvrdenie adminom' : 'všetky pomenované'}</small></article>
    </section>

    <section className="panel supplier-toolbar">
      <label className="supplier-search"><Icon name="search" size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Názov, IČO, zmluva, systém, poznámka…"/></label>
      <label><span>Úloha</span><select value={task} onChange={event => setTask(event.target.value)}><option value="all">10 + 22 + 25</option><option value="10">Úloha 10</option><option value="22">Úloha 22</option><option value="25">Úloha 25</option></select></label>
      <label><span>Pohľad</span><select value={filter} onChange={event => setFilter(event.target.value as SupplierFilter)}><option value="all">Všetci</option><option value="payments">S platbami</option><option value="systems">S väzbou na IS</option><option value="unresolved">IČO bez názvu</option></select></label>
      <div className="supplier-toolbar-result"><strong>{filtered.length}</strong><span>vo výbere</span></div>
    </section>

    <section className="supplier-workspace">
      <aside className="panel supplier-list-panel">
        <div className="supplier-list-head"><div><span className="eyebrow">REGISTER</span><h3>Dodávatelia</h3></div><small>{directory.length} celkom</small></div>
        <div className="supplier-list-scroll">
          {filtered.length ? filtered.map(item => <button key={item.key} className={selected?.key === item.key ? 'active' : ''} onClick={() => setSelectedKey(item.key)}>
            <div className="supplier-list-main"><strong>{item.name}</strong><small>{item.ico ? `IČO ${item.ico}` : 'bez IČO'} · {item.paymentCount ? `${item.paymentCount} platieb` : `${item.systems.length} väzieb na IS`}</small></div>
            <div className="supplier-list-side"><b>{item.amount ? money.format(item.amount) : '—'}</b><Badge tone={identityTone(item)}>{identityLabel(item)}</Badge></div>
          </button>) : <Empty title="Bez výsledkov" text="Zmeňte vyhľadávanie alebo filter."/>}
        </div>
      </aside>

      {selected ? <SupplierDetail item={selected} canEdit={canEdit} canOpenAdvanced={canOpenAdvanced} onEdit={() => openEdit(selected)} onDelete={() => deleteOverride(selected)} go={go}/> : <div className="panel supplier-detail-empty"><Empty title="Dodávateľ nebol vybraný" text="Vyberte dodávateľa v ľavom registri."/></div>}
    </section>

    {editing !== undefined && canEdit && <SupplierEditModal item={editing} newMode={newMode} onClose={() => { setEditing(undefined); setNewMode(false) }} onSave={saveRecord}/>} 
  </div>
}

function SupplierDetail({ item, canEdit, canOpenAdvanced, onEdit, onDelete, go }: { item: SupplierDirectoryItem; canEdit: boolean; canOpenAdvanced: boolean; onEdit: () => void; onDelete: () => void; go?: (view: string) => void }) {
  const record = item.record
  const maxMonth = Math.max(...item.monthly.map(value => Math.abs(value)), 1)
  const known = knownSupplierByIco(item.ico)
  return <article className="panel supplier-detail">
    <header className="supplier-detail-head">
      <div><span className="eyebrow">DODÁVATEĽ 360</span><h2>{item.name}</h2><div className="supplier-detail-tags"><Badge tone={identityTone(item)}>{identityLabel(item)}</Badge>{item.ico && <Badge tone="neutral">IČO {item.ico}</Badge>}{record?.status && <Badge tone={record.status === 'Aktívny' ? 'success' : 'neutral'}>{record.status}</Badge>}</div><p>{record?.category || 'Dodávateľ / partner identifikovaný zo zdrojových dát aplikácie.'}</p></div>
      {canEdit && <div className="supplier-detail-actions"><button className="button button-secondary button-small" onClick={onEdit}><Icon name="edit" size={15}/> Upraviť kartu</button>{record && <button className="icon-button supplier-delete" onClick={onDelete} title="Odstrániť manuálnu kartu"><Icon name="trash" size={17}/></button>}</div>}
    </header>

    <section className="supplier-detail-metrics">
      <div><span>Platby 2026</span><strong>{item.amount ? money2.format(item.amount) : '—'}</strong><small>v SIT zdroji</small></div>
      <div><span>Doklady / platby</span><strong>{item.paymentCount}</strong><small>{item.tasks.length ? `úloha ${item.tasks.join(' / ')}` : 'bez SIT platby'}</small></div>
      <div><span>Zmluvné referencie</span><strong>{item.contracts.length}</strong><small>{item.contracts.slice(0, 2).join(', ') || 'bez referencie'}</small></div>
      <div><span>Informačné systémy</span><strong>{item.systems.length}</strong><small>dodávateľ uvedený pri IS</small></div>
    </section>

    <section className="supplier-detail-grid">
      <div className="supplier-card-block">
        <h3>Mesačné čerpanie · 2026</h3>
        {item.paymentCount ? <div className="supplier-month-bars">{item.monthly.map((value, index) => <div key={months[index]}><span>{months[index]}</span><i><b style={{ width: `${value ? Math.max(4, Math.abs(value) / maxMonth * 100) : 0}%` }}/></i><strong>{value ? money.format(value) : '—'}</strong></div>)}</div> : <p className="supplier-muted">Táto identita nemá platbu v SIT snapshote 01–05/2026.</p>}
      </div>
      <div className="supplier-card-block"><h3>Identita a evidencia</h3><dl className="supplier-dl"><div><dt>Názov</dt><dd>{item.name}</dd></div><div><dt>IČO</dt><dd>{item.ico || '—'}</dd></div><div><dt>Zdroj názvu</dt><dd>{record?.name ? 'Spravovaná karta' : known?.source || item.source}</dd></div><div><dt>Strediská</dt><dd>{item.centers.join(', ') || '—'}</dd></div><div><dt>Kategória</dt><dd>{valueOrDash(record?.category)}</dd></div><div><dt>Aktualizácia</dt><dd>{record?.updatedAt ? `${new Date(record.updatedAt).toLocaleString('sk-SK')} · ${record.updatedBy || 'admin'}` : 'zdrojová evidencia'}</dd></div></dl></div>
    </section>

    <section className="supplier-detail-grid">
      <div className="supplier-card-block"><h3>Kontakty a zodpovednosť</h3><dl className="supplier-dl"><div><dt>Obchodný kontakt</dt><dd>{valueOrDash(record?.salesContact)}</dd></div><div><dt>E-mail</dt><dd>{valueOrDash(record?.salesEmail)}</dd></div><div><dt>Telefón</dt><dd>{valueOrDash(record?.salesPhone)}</dd></div><div><dt>PM dodávateľa</dt><dd>{valueOrDash(record?.supplierProjectManager)}</dd></div><div><dt>PM CVTI SR</dt><dd>{valueOrDash(record?.customerProjectManager)}</dd></div><div><dt>Garant zmluvy</dt><dd>{valueOrDash(record?.contractManager)}</dd></div><div><dt>Garant služby</dt><dd>{valueOrDash(record?.serviceOwner)}</dd></div><div><dt>Eskalácia</dt><dd>{valueOrDash(record?.escalationContact)}</dd></div></dl></div>
      <div className="supplier-card-block"><h3>Dokumenty a odkazy</h3><div className="supplier-link-list">{record?.website ? <a href={record.website} target="_blank" rel="noreferrer">Web dodávateľa <Icon name="arrow" size={14}/></a> : null}{record?.crzUrl ? <a href={record.crzUrl} target="_blank" rel="noreferrer">Centrálny register zmlúv <Icon name="arrow" size={14}/></a> : null}{record?.contractPdfUrl ? <a href={record.contractPdfUrl} target="_blank" rel="noreferrer">Zmluva / PDF <Icon name="arrow" size={14}/></a> : null}{record?.dmsUrl ? <a href={record.dmsUrl} target="_blank" rel="noreferrer">DMS / interný priečinok <Icon name="arrow" size={14}/></a> : null}{!record?.website && !record?.crzUrl && !record?.contractPdfUrl && !record?.dmsUrl && <p className="supplier-muted">Odkazy zatiaľ nie sú doplnené.</p>}</div>{record?.note && <div className="supplier-note"><strong>Poznámka</strong><p>{record.note}</p></div>}</div>
    </section>

    <section className="supplier-card-block supplier-contracts"><div className="supplier-block-head"><div><span className="eyebrow">KONTRAKTY A PLATBY</span><h3>Zmluvné referencie a vecný obsah</h3></div>{go && canOpenAdvanced && <button className="text-button" onClick={() => go('intelligence')}>Riadiace centrum <Icon name="arrow" size={14}/></button>}</div>{item.contracts.length ? <div className="supplier-contract-chips">{item.contracts.map(contract => <span key={contract}>{contract}</span>)}</div> : <p className="supplier-muted">V zdrojových platbách nie je číslo zmluvy.</p>}{item.topNotes.length > 0 && <div className="supplier-note-list">{item.topNotes.map(note => <span key={note}>{note}</span>)}</div>}</section>

    <section className="supplier-card-block supplier-systems"><div className="supplier-block-head"><div><span className="eyebrow">SERVICE / IS VÄZBA</span><h3>Informačné systémy</h3></div>{go && canOpenAdvanced && <button className="text-button" onClick={() => go('informationSystems')}>Register IS <Icon name="arrow" size={14}/></button>}</div>{item.systems.length ? <div className="supplier-system-table"><div className="supplier-system-row supplier-system-head"><span>Systém</span><span>Kritickosť</span><span>SLA</span><span>Zmluva</span></div>{item.systems.map(system => <div className="supplier-system-row" key={system.name}><span><strong>{system.name}</strong><small>{system.contractValidTo ? `platnosť ${system.contractValidTo}` : ''}</small></span><span>{system.criticality || '—'}</span><span>{system.slaStatus || '—'}</span><span>{system.contractNumber || '—'}</span></div>)}</div> : <p className="supplier-muted">Pri tomto dodávateľovi zatiaľ nebola nájdená väzba v registri informačných systémov.</p>}</section>
  </article>
}

function SupplierEditModal({ item, newMode, onClose, onSave }: { item: SupplierDirectoryItem | null; newMode: boolean; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const value = emptyRecord(item)
  return <Modal title={newMode ? 'Nový dodávateľ' : `Správa dodávateľa · ${item?.name || ''}`} onClose={onClose} wide>
    <form className="supplier-edit-form" onSubmit={onSave}>
      <div className="supplier-edit-section"><div><span className="eyebrow">IDENTITA</span><h3>Základná karta</h3></div><div className="form-grid">
        <Field label="Názov dodávateľa"><input name="name" defaultValue={value.name} placeholder="napr. InterWay, a. s." required={!value.ico}/></Field>
        <Field label="IČO" hint={item?.ico && item.paymentCount > 0 ? "IČO pochádza zo zdrojovej platby a v spravovanej karte sa nemení." : "Pri známom IČO aplikácia automaticky používa overený názov ako východisko."}><input name="ico" defaultValue={value.ico} placeholder="8 číslic" readOnly={Boolean(item?.ico && item.paymentCount > 0)}/></Field>
        <Field label="Stav"><select name="status" defaultValue={value.status}><option>Aktívny</option><option>Neaktívny</option><option>Na preverenie</option><option>Ukončený</option></select></Field>
        <Field label="Kategória"><input name="category" defaultValue={value.category} placeholder="napr. aplikačný dodávateľ, infraštruktúra, telekom…"/></Field>
      </div></div>
      <div className="supplier-edit-section"><div><span className="eyebrow">KONTAKTY</span><h3>Ľudia a eskalácia</h3></div><div className="form-grid">
        <Field label="Kontaktná osoba / obchodník"><input name="salesContact" defaultValue={value.salesContact}/></Field>
        <Field label="E-mail"><input name="salesEmail" type="email" defaultValue={value.salesEmail}/></Field>
        <Field label="Telefón"><input name="salesPhone" defaultValue={value.salesPhone}/></Field>
        <Field label="Projektový manažér dodávateľa"><input name="supplierProjectManager" defaultValue={value.supplierProjectManager}/></Field>
        <Field label="Projektový manažér CVTI SR"><input name="customerProjectManager" defaultValue={value.customerProjectManager}/></Field>
        <Field label="Garant zmluvy"><input name="contractManager" defaultValue={value.contractManager}/></Field>
        <Field label="Garant služby"><input name="serviceOwner" defaultValue={value.serviceOwner}/></Field>
        <Field label="Eskalácia"><input name="escalationContact" defaultValue={value.escalationContact}/></Field>
      </div></div>
      <div className="supplier-edit-section"><div><span className="eyebrow">DOKUMENTY</span><h3>Odkazy a poznámka</h3></div><div className="form-grid">
        <Field label="Web"><input name="website" type="url" defaultValue={value.website} placeholder="https://…"/></Field>
        <Field label="CRZ"><input name="crzUrl" type="url" defaultValue={value.crzUrl} placeholder="https://www.crz.gov.sk/…"/></Field>
        <Field label="PDF zmluvy / dokument"><input name="contractPdfUrl" defaultValue={value.contractPdfUrl} placeholder="URL alebo interný odkaz"/></Field>
        <Field label="DMS / interný priečinok"><input name="dmsUrl" defaultValue={value.dmsUrl} placeholder="interný odkaz"/></Field>
        <Field label="Poznámka"><textarea name="note" rows={4} defaultValue={value.note} placeholder="Vecná poznámka, servisný model, otvorené otázky…"/></Field>
      </div></div>
      <div className="supplier-edit-info"><Icon name="shield" size={18}/><span>Úprava dopĺňa spravovanú kartu. Zdrojové platby, IČO, doklady a automatické väzby sa neprepisujú.</span></div>
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Zrušiť</button><button type="submit" className="button button-primary"><Icon name="check" size={16}/> Uložiť kartu</button></div>
    </form>
  </Modal>
}
