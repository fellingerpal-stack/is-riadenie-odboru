import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Empty, Field, Icon, Modal, PageHeader } from '../components/UI'
import {
  deleteInformationSystem,
  loadInformationSystems,
  normalizeInformationSystem,
  saveLocalInformationSystems,
  subscribeToInformationSystemRegistry,
  upsertInformationSystem,
  type InformationSystemRecord,
  type RegistrySyncState,
} from '../lib/digitalPortfolioCloud'
import './DigitalPortfolio.css'

type ViewMode = 'overview' | 'register' | 'contracts' | 'risks'
type ModalTab = 'basic' | 'owners' | 'contracts' | 'security'

const operationOptions = ['Aktívny', 'Neaktívny', 'Utlmený', 'Vo vyraďovaní', 'Neviem / preveriť']
const criticalityOptions = ['Vysoká', 'Stredná', 'Nízka', 'Neviem / preveriť']
const slaOptions = ['Áno', 'Nie', 'Neviem / preveriť', 'Nerelevantné']
const personalDataOptions = ['Áno', 'Nie', 'Neviem / preveriť', 'N/a']
const reviewOptions = ['Na doplnenie', 'Čiastočne doplnené', 'Doplnené', 'Neviem posúdiť', 'Nepatrí do pôsobnosti sekcie']

function syncLabel(state: RegistrySyncState) {
  if (state === 'loading') return 'Načítavam'
  if (state === 'saving') return 'Ukladám'
  if (state === 'synced') return 'Synchronizované'
  if (state === 'error') return 'Chyba synchronizácie'
  return 'Lokálne dáta'
}
function operationTone(value: string) {
  if (value === 'Aktívny') return 'success' as const
  if (value === 'Neaktívny' || value === 'Vo vyraďovaní') return 'danger' as const
  if (value === 'Utlmený') return 'warning' as const
  return 'neutral' as const
}
function criticalityTone(value: string) {
  if (value === 'Vysoká') return 'danger' as const
  if (value === 'Stredná') return 'warning' as const
  if (value === 'Nízka') return 'success' as const
  return 'neutral' as const
}
function lacksBusinessOwner(item: InformationSystemRecord) { return !item.businessOwner.trim() || !item.businessContact.trim() }
function lacksTechnicalOwner(item: InformationSystemRecord) { return !item.technicalOwner.trim() || item.technicalOwner.toLowerCase().includes('neviem') || item.technicalOwner.toLowerCase().includes('možno') }
function slaRisk(item: InformationSystemRecord) { return item.criticality === 'Vysoká' && (!item.slaStatus || ['Nie', 'Neviem / preveriť'].includes(item.slaStatus)) }
function privacyRisk(item: InformationSystemRecord) { return !item.personalData || item.personalData.toLowerCase().includes('neviem') }
function incomplete(item: InformationSystemRecord) {
  const required = [item.operationStatus, item.businessOwner, item.businessContact, item.technicalOwner, item.purpose, item.criticality, item.hosting, item.slaStatus, item.personalData, item.reviewStatus]
  return required.filter((value) => value.trim()).length < 7
}
function riskCount(item: InformationSystemRecord) { return [slaRisk(item), lacksBusinessOwner(item), lacksTechnicalOwner(item), privacyRisk(item), incomplete(item)].filter(Boolean).length }
function blankSystem(items: InformationSystemRecord[]): InformationSystemRecord {
  const max = items.reduce((value, item) => Math.max(value, Number(item.sourceKey.replace(/\D/g, '')) || 0), 0)
  return normalizeInformationSystem({ sourceKey: `IS-${String(max + 1).padStart(3, '0')}`, name: '', operationStatus: 'Aktívny', criticality: 'Neviem / preveriť', slaStatus: 'Neviem / preveriť', personalData: 'Neviem / preveriť', reviewStatus: 'Na doplnenie', sourceFile: 'Aplikácia', sourceSheet: 'Informačné systémy', sourceRow: 0 })
}
function escapeCsv(value: unknown) { return `"${String(value ?? '').replaceAll('"', '""')}"` }
function downloadCsv(items: InformationSystemRecord[]) {
  const columns: Array<[keyof InformationSystemRecord, string]> = [
    ['sourceKey', 'ID'], ['name', 'Názov IS'], ['area', 'Modul / oblasť'], ['operationStatus', 'Stav prevádzky'], ['businessOwner', 'Vecný gestor'],
    ['businessContact', 'Kontaktná osoba'], ['technicalOwner', 'Technický správca'], ['endUsers', 'Koncoví používatelia'], ['purpose', 'Účel'], ['userCount', 'Počet používateľov'],
    ['criticality', 'Kritickosť'], ['hosting', 'Hosting'], ['slaStatus', 'SLA'], ['slaFrom', 'SLA od'], ['slaTo', 'SLA do'], ['annualSlaPayment', 'Ročná platba SLA'],
    ['contractValue', 'Hodnota zmluvy'], ['supplier', 'Dodávateľ'], ['contractNumber', 'Číslo zmluvy'], ['contractEffectiveFrom', 'Zmluva od'], ['contractValidTo', 'Zmluva do'],
    ['crzLink', 'CRZ'], ['adminAccessManager', 'Správca admin prístupov'], ['personalData', 'Osobné údaje'], ['notes', 'Poznámka'], ['reviewStatus', 'Stav preverenia'],
  ]
  const content = [columns.map(([, label]) => escapeCsv(label)).join(';'), ...items.map((item) => columns.map(([key]) => escapeCsv(item[key])).join(';'))].join('\n')
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `informacne-systemy-cvti-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href)
}

export default function InformationSystems({ canEdit, databaseMode, organizationId }: { canEdit: boolean; databaseMode: 'local' | 'cloud'; organizationId?: string }) {
  const [items, setItems] = useState<InformationSystemRecord[]>([])
  const [sync, setSync] = useState<RegistrySyncState>(databaseMode === 'cloud' ? 'loading' : 'local')
  const [error, setError] = useState('')
  const [view, setView] = useState<ViewMode>('overview')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Všetky')
  const [criticalityFilter, setCriticalityFilter] = useState('Všetky')
  const [reviewFilter, setReviewFilter] = useState('Všetky')
  const [draft, setDraft] = useState<InformationSystemRecord | null>(null)
  const [modalTab, setModalTab] = useState<ModalTab>('basic')
  const reloadTimer = useRef<number | undefined>(undefined)

  async function reload(silent = false) {
    setSync(databaseMode === 'cloud' ? 'loading' : 'local'); setError('')
    try { setItems(await loadInformationSystems(databaseMode)); setSync(databaseMode === 'cloud' ? 'synced' : 'local') }
    catch (caught) { const message = caught instanceof Error ? caught.message : 'Register informačných systémov sa nepodarilo načítať.'; setError(message); setSync('error'); if (!silent) alert(message) }
  }
  useEffect(() => { void reload(true) }, [databaseMode])
  useEffect(() => {
    if (databaseMode !== 'cloud' || !organizationId) return
    const unsubscribe = subscribeToInformationSystemRegistry(organizationId, () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current)
      reloadTimer.current = window.setTimeout(() => void reload(true), 300)
    })
    return () => { if (reloadTimer.current) window.clearTimeout(reloadTimer.current); unsubscribe() }
  }, [databaseMode, organizationId])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter((item) => {
      const haystack = `${item.sourceKey} ${item.name} ${item.area} ${item.businessOwner} ${item.businessContact} ${item.technicalOwner} ${item.endUsers} ${item.purpose} ${item.hosting} ${item.supplier} ${item.contractNumber} ${item.notes}`.toLowerCase()
      return (!query || haystack.includes(query))
        && (statusFilter === 'Všetky' || item.operationStatus === statusFilter)
        && (criticalityFilter === 'Všetky' || item.criticality === criticalityFilter)
        && (reviewFilter === 'Všetky' || item.reviewStatus === reviewFilter)
    }).sort((a, b) => riskCount(b) - riskCount(a) || a.name.localeCompare(b.name, 'sk'))
  }, [items, search, statusFilter, criticalityFilter, reviewFilter])

  const active = items.filter((item) => item.operationStatus === 'Aktívny').length
  const highCritical = items.filter((item) => item.criticality === 'Vysoká').length
  const personalData = items.filter((item) => item.personalData.toLowerCase() === 'áno').length
  const slaMissing = items.filter((item) => !item.slaStatus || ['Nie', 'Neviem / preveriť'].includes(item.slaStatus)).length
  const ownerMissing = items.filter((item) => lacksBusinessOwner(item) || lacksTechnicalOwner(item)).length
  const incompleteCount = items.filter(incomplete).length
  const priorityQueue = [...items].filter((item) => riskCount(item) > 0).sort((a, b) => riskCount(b) - riskCount(a) || a.name.localeCompare(b.name, 'sk')).slice(0, 12)

  async function saveDraft() {
    if (!draft || !draft.name.trim()) return
    const normalized = normalizeInformationSystem(draft)
    const next = items.some((item) => item.sourceKey === normalized.sourceKey) ? items.map((item) => item.sourceKey === normalized.sourceKey ? normalized : item) : [...items, normalized]
    setItems(next); setDraft(null); setSync(databaseMode === 'cloud' ? 'saving' : 'local'); setError('')
    if (databaseMode === 'local') { saveLocalInformationSystems(next); return }
    try { await upsertInformationSystem(normalized, databaseMode); setSync('synced') }
    catch (caught) { setSync('error'); setError(caught instanceof Error ? caught.message : 'Informačný systém sa nepodarilo uložiť.') }
  }
  async function removeItem(item: InformationSystemRecord) {
    if (!canEdit || !confirm(`Odstrániť informačný systém „${item.name}“ z registra?`)) return
    const next = items.filter((entry) => entry.sourceKey !== item.sourceKey); setItems(next); setSync(databaseMode === 'cloud' ? 'saving' : 'local')
    if (databaseMode === 'local') { saveLocalInformationSystems(next); return }
    try { await deleteInformationSystem(item.sourceKey, databaseMode); setSync('synced') }
    catch (caught) { setSync('error'); setError(caught instanceof Error ? caught.message : 'Informačný systém sa nepodarilo odstrániť.') }
  }
  function update<K extends keyof InformationSystemRecord>(key: K, value: InformationSystemRecord[K]) { setDraft((current) => current ? { ...current, [key]: value } : current) }

  return <>
    <PageHeader eyebrow="Digitálne portfólio" title="Informačné systémy CVTI SR" description="Register systémov a softvéru s vecným a technickým vlastníctvom, kritickosťou, hostingom, SLA, zmluvami a ochranou údajov."
      actions={<><button className="button button-secondary" onClick={() => downloadCsv(filtered)}><Icon name="download" size={16}/> Export CSV</button>{canEdit && <button className="button button-primary" onClick={() => { setDraft(blankSystem(items)); setModalTab('basic') }}><Icon name="plus" size={17}/> Nový IS</button>}</>}/>

    <section className={`portfolio-sync portfolio-sync-${sync}`}><div className="portfolio-sync-icon"><Icon name={sync === 'error' ? 'warning' : 'database'} size={20}/></div><div><strong>{databaseMode === 'cloud' ? 'Samostatný register v Supabase' : 'Lokálny pracovný register'}</strong><span>{error || 'Zdrojové dáta boli načítané zo súboru IS mimo správy IT – komplet.'}</span></div><div><Badge tone={sync === 'error' ? 'danger' : sync === 'synced' ? 'success' : sync === 'saving' || sync === 'loading' ? 'warning' : 'info'}>{syncLabel(sync)}</Badge><button className="icon-button" onClick={() => void reload()} title="Obnoviť"><Icon name="refresh" size={17}/></button></div></section>

    <div className="portfolio-kpi-grid">
      <button className="portfolio-kpi" onClick={() => setView('register')}><Icon name="systems"/><span>Všetky systémy<strong>{items.length}</strong><small>evidovaných záznamov</small></span></button>
      <button className="portfolio-kpi portfolio-kpi-good" onClick={() => { setStatusFilter('Aktívny'); setView('register') }}><Icon name="check"/><span>Aktívne<strong>{active}</strong><small>potvrdená prevádzka</small></span></button>
      <button className="portfolio-kpi portfolio-kpi-danger" onClick={() => { setCriticalityFilter('Vysoká'); setView('register') }}><Icon name="warning"/><span>Vysoká kritickosť<strong>{highCritical}</strong><small>významné pre činnosť</small></span></button>
      <button className="portfolio-kpi portfolio-kpi-purple" onClick={() => setView('risks')}><Icon name="shield"/><span>Osobné údaje<strong>{personalData}</strong><small>potvrdené spracúvanie</small></span></button>
      <button className="portfolio-kpi portfolio-kpi-warning" onClick={() => setView('contracts')}><Icon name="tasks"/><span>SLA chýba / nejasná<strong>{slaMissing}</strong><small>potrebné preverenie</small></span></button>
      <button className="portfolio-kpi portfolio-kpi-warning" onClick={() => setView('risks')}><Icon name="user"/><span>Neúplné vlastníctvo<strong>{ownerMissing}</strong><small>vecný alebo technický gestor</small></span></button>
    </div>

    <div className="portfolio-tabs"><button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}><Icon name="dashboard" size={17}/> Manažérsky prehľad</button><button className={view === 'register' ? 'active' : ''} onClick={() => setView('register')}><Icon name="systems" size={17}/> Register IS</button><button className={view === 'contracts' ? 'active' : ''} onClick={() => setView('contracts')}><Icon name="tasks" size={17}/> SLA a zmluvy</button><button className={view === 'risks' ? 'active' : ''} onClick={() => setView('risks')}><Icon name="risk" size={17}/> Riziká a kvalita <b>{incompleteCount}</b></button></div>

    {view === 'overview' && <div className="portfolio-overview-grid">
      <section className="panel portfolio-priority"><div className="panel-heading"><div><span className="eyebrow">Riadiaci pohľad</span><h3>Najdôležitejšie otvorené otázky</h3></div><Badge tone="warning">{priorityQueue.length} priorít</Badge></div><div className="portfolio-priority-list">{priorityQueue.map((item) => <button key={item.sourceKey} onClick={() => { setDraft(structuredClone(item)); setModalTab('security') }}><span className={`portfolio-risk-score risk-${Math.min(5, riskCount(item))}`}>{riskCount(item)}</span><span><strong>{item.name}</strong><small>{[slaRisk(item) && 'SLA', lacksBusinessOwner(item) && 'vecný gestor', lacksTechnicalOwner(item) && 'technický správca', privacyRisk(item) && 'osobné údaje', incomplete(item) && 'neúplné údaje'].filter(Boolean).join(' · ')}</small></span><Badge tone={item.criticality === 'Vysoká' ? 'danger' : 'warning'}>{item.criticality || 'Neurčené'}</Badge><Icon name="chevron" size={16}/></button>)}</div></section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">Kvalita evidencie</span><h3>Úplnosť registra</h3></div></div><div className="portfolio-status-list"><div><span>Aktívne systémy</span><strong>{active}</strong><i style={{ width: `${items.length ? active / items.length * 100 : 0}%` }}/></div><div><span>Vysoká kritickosť</span><strong>{highCritical}</strong><i style={{ width: `${items.length ? highCritical / items.length * 100 : 0}%` }}/></div><div><span>Neúplné základné údaje</span><strong>{incompleteCount}</strong><i style={{ width: `${items.length ? incompleteCount / items.length * 100 : 0}%` }}/></div><div><span>Chýbajúci alebo nejasný vlastník</span><strong>{ownerMissing}</strong><i style={{ width: `${items.length ? ownerMissing / items.length * 100 : 0}%` }}/></div></div></section>
      <section className="panel portfolio-wide"><div className="panel-heading"><div><span className="eyebrow">Vecní gestori</span><h3>Rozloženie informačných systémov</h3></div></div><div className="portfolio-owner-grid">{Object.entries(items.reduce<Record<string, number>>((acc, item) => { const key = item.businessOwner || 'Gestor neurčený'; acc[key] = (acc[key] || 0) + 1; return acc }, {})).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([owner, count]) => <button key={owner} onClick={() => { setSearch(owner); setView('register') }}><strong>{count}</strong><span>{owner}</span></button>)}</div></section>
    </div>}

    {view === 'register' && <>
      <section className="portfolio-toolbar"><label className="search-box"><Icon name="search"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hľadať názov, oblasť, gestora, správcu, dodávateľa alebo zmluvu…"/></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Všetky</option>{operationOptions.map((value) => <option key={value}>{value}</option>)}</select><select value={criticalityFilter} onChange={(event) => setCriticalityFilter(event.target.value)}><option>Všetky</option>{criticalityOptions.map((value) => <option key={value}>{value}</option>)}</select><select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value)}><option>Všetky</option>{reviewOptions.map((value) => <option key={value}>{value}</option>)}</select><Badge tone="info">{filtered.length} z {items.length}</Badge></section>
      <section className="panel portfolio-table-panel"><div className="portfolio-table-shell"><table className="portfolio-table systems-table"><thead><tr><th>Informačný systém</th><th>Prevádzka</th><th>Vlastníctvo</th><th>Kritickosť a údaje</th><th>SLA / hosting</th><th>Preverenie</th><th></th></tr></thead><tbody>{filtered.map((item) => <tr key={item.sourceKey}><td><strong>{item.name}</strong><small>{item.sourceKey} · {item.area || 'Oblasť neurčená'}</small><span>{item.purpose || 'Účel nebol doplnený'}</span></td><td><Badge tone={operationTone(item.operationStatus)}>{item.operationStatus || 'Neurčené'}</Badge><small>{item.userCount ? `${item.userCount} používateľov` : 'Počet používateľov neurčený'}</small></td><td><strong>{item.businessOwner || 'Vecný gestor chýba'}</strong><small>{item.businessContact || 'Kontakt chýba'}</small><small>{item.technicalOwner ? `IT: ${item.technicalOwner}` : 'Technický správca chýba'}</small></td><td><Badge tone={criticalityTone(item.criticality)}>{item.criticality || 'Neurčená'}</Badge><small>Osobné údaje: {item.personalData || 'nepreverené'}</small></td><td><strong>{item.slaStatus ? `SLA: ${item.slaStatus}` : 'SLA neurčená'}</strong><small>{item.hosting || 'Hosting neurčený'}</small><small>{item.supplier || item.contractNumber || ''}</small></td><td><Badge tone={item.reviewStatus === 'Doplnené' ? 'success' : item.reviewStatus === 'Čiastočne doplnené' ? 'warning' : 'neutral'}>{item.reviewStatus || 'Na doplnenie'}</Badge></td><td><div className="row-actions"><button className="icon-button" onClick={() => { setDraft(structuredClone(item)); setModalTab('basic') }} title={canEdit ? 'Upraviť' : 'Detail'}><Icon name={canEdit ? 'edit' : 'eye'} size={17}/></button>{canEdit && <button className="icon-button icon-button-danger" onClick={() => void removeItem(item)} title="Odstrániť"><Icon name="trash" size={17}/></button>}</div></td></tr>)}</tbody></table>{!filtered.length && <Empty title="Žiadne informačné systémy" text="Zmeňte vyhľadávanie alebo filtre."/>}</div></section>
    </>}

    {view === 'contracts' && <section className="panel portfolio-table-panel"><div className="portfolio-contract-summary"><div><span>SLA áno</span><strong>{items.filter((item) => item.slaStatus === 'Áno').length}</strong></div><div><span>SLA nie</span><strong>{items.filter((item) => item.slaStatus === 'Nie').length}</strong></div><div><span>SLA nepreverená</span><strong>{items.filter((item) => !item.slaStatus || item.slaStatus.includes('Neviem')).length}</strong></div><div><span>Dodávateľ uvedený</span><strong>{items.filter((item) => item.supplier).length}</strong></div><div><span>CRZ link uvedený</span><strong>{items.filter((item) => item.crzLink).length}</strong></div></div><div className="portfolio-table-shell"><table className="portfolio-table contract-table"><thead><tr><th>Systém</th><th>SLA</th><th>Platnosť SLA</th><th>Ročná platba</th><th>Dodávateľ / zmluva</th><th>Platnosť zmluvy</th><th>CRZ</th><th></th></tr></thead><tbody>{[...items].sort((a, b) => (a.slaStatus || '').localeCompare(b.slaStatus || '') || a.name.localeCompare(b.name, 'sk')).map((item) => <tr key={item.sourceKey}><td><strong>{item.name}</strong><small>{item.criticality || 'Kritickosť neurčená'}</small></td><td><Badge tone={item.slaStatus === 'Áno' ? 'success' : item.slaStatus === 'Nie' ? 'danger' : item.slaStatus === 'Nerelevantné' ? 'neutral' : 'warning'}>{item.slaStatus || 'Neurčené'}</Badge></td><td><span>{item.slaFrom || '—'}</span><small>{item.slaTo ? `do ${item.slaTo}` : ''}</small></td><td>{item.annualSlaPayment || '—'}</td><td><strong>{item.supplier || 'Dodávateľ neurčený'}</strong><small>{item.contractNumber || 'Zmluva neurčená'}</small></td><td><span>{item.contractEffectiveFrom || '—'}</span><small>{item.contractValidTo ? `do ${item.contractValidTo}` : ''}</small></td><td>{item.crzLink ? <a href={item.crzLink.startsWith('http') ? item.crzLink : undefined} target="_blank" rel="noreferrer">{item.crzLink}<Icon name="arrow" size={12}/></a> : '—'}</td><td><button className="icon-button" onClick={() => { setDraft(structuredClone(item)); setModalTab('contracts') }}><Icon name={canEdit ? 'edit' : 'eye'} size={17}/></button></td></tr>)}</tbody></table></div></section>}

    {view === 'risks' && <div className="portfolio-risk-grid">
      <SystemRiskPanel title="Vysoká kritickosť bez potvrdenej SLA" items={items.filter(slaRisk)} onOpen={(item) => { setDraft(structuredClone(item)); setModalTab('contracts') }}/>
      <SystemRiskPanel title="Chýbajúci vecný gestor alebo kontakt" items={items.filter(lacksBusinessOwner)} onOpen={(item) => { setDraft(structuredClone(item)); setModalTab('owners') }}/>
      <SystemRiskPanel title="Chýbajúci alebo neistý technický správca" items={items.filter(lacksTechnicalOwner)} onOpen={(item) => { setDraft(structuredClone(item)); setModalTab('owners') }}/>
      <SystemRiskPanel title="Osobné údaje neboli preverené" items={items.filter(privacyRisk)} onOpen={(item) => { setDraft(structuredClone(item)); setModalTab('security') }}/>
    </div>}

    {draft && <Modal title={draft.name ? `Informačný systém: ${draft.name}` : 'Nový informačný systém'} onClose={() => setDraft(null)} wide><div className="portfolio-modal-tabs"><button className={modalTab === 'basic' ? 'active' : ''} onClick={() => setModalTab('basic')}>Základné údaje</button><button className={modalTab === 'owners' ? 'active' : ''} onClick={() => setModalTab('owners')}>Vlastníctvo a používatelia</button><button className={modalTab === 'contracts' ? 'active' : ''} onClick={() => setModalTab('contracts')}>SLA a zmluvy</button><button className={modalTab === 'security' ? 'active' : ''} onClick={() => setModalTab('security')}>Bezpečnosť a preverenie</button></div>
      {modalTab === 'basic' && <div className="form-grid"><Field label="Názov IS"><input disabled={!canEdit} value={draft.name} onChange={(event) => update('name', event.target.value)}/></Field><Field label="Modul / oblasť"><input disabled={!canEdit} value={draft.area} onChange={(event) => update('area', event.target.value)}/></Field><Field label="Stav prevádzky"><select disabled={!canEdit} value={draft.operationStatus} onChange={(event) => update('operationStatus', event.target.value)}>{operationOptions.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Kritickosť"><select disabled={!canEdit} value={draft.criticality} onChange={(event) => update('criticality', event.target.value)}>{criticalityOptions.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Hosting / prevádzka"><input disabled={!canEdit} value={draft.hosting} onChange={(event) => update('hosting', event.target.value)}/></Field><Field label="Počet používateľov (odhad)"><input disabled={!canEdit} value={draft.userCount} onChange={(event) => update('userCount', event.target.value)}/></Field><Field label="Využitie / účel IS"><textarea disabled={!canEdit} value={draft.purpose} onChange={(event) => update('purpose', event.target.value)}/></Field></div>}
      {modalTab === 'owners' && <div className="form-grid"><Field label="Vecný gestor (sekcia/odbor)"><input disabled={!canEdit} value={draft.businessOwner} onChange={(event) => update('businessOwner', event.target.value)}/></Field><Field label="Kontaktná osoba vecného gestora"><input disabled={!canEdit} value={draft.businessContact} onChange={(event) => update('businessContact', event.target.value)}/></Field><Field label="Gestor IT / technický správca"><input disabled={!canEdit} value={draft.technicalOwner} onChange={(event) => update('technicalOwner', event.target.value)}/></Field><Field label="Správca admin prístupov"><input disabled={!canEdit} value={draft.adminAccessManager} onChange={(event) => update('adminAccessManager', event.target.value)}/></Field><Field label="Koncoví používatelia"><textarea disabled={!canEdit} value={draft.endUsers} onChange={(event) => update('endUsers', event.target.value)}/></Field></div>}
      {modalTab === 'contracts' && <div className="form-grid"><Field label="SLA uzatvorená?"><select disabled={!canEdit} value={draft.slaStatus} onChange={(event) => update('slaStatus', event.target.value)}>{slaOptions.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Platnosť SLA od"><input disabled={!canEdit} value={draft.slaFrom} onChange={(event) => update('slaFrom', event.target.value)}/></Field><Field label="Platnosť SLA do"><input disabled={!canEdit} value={draft.slaTo} onChange={(event) => update('slaTo', event.target.value)}/></Field><Field label="Ročná platba za SLA (€ bez DPH)"><input disabled={!canEdit} value={draft.annualSlaPayment} onChange={(event) => update('annualSlaPayment', event.target.value)}/></Field><Field label="Celková hodnota zmluvy (€ bez DPH)"><input disabled={!canEdit} value={draft.contractValue} onChange={(event) => update('contractValue', event.target.value)}/></Field><Field label="Dodávateľ"><input disabled={!canEdit} value={draft.supplier} onChange={(event) => update('supplier', event.target.value)}/></Field><Field label="Číslo zmluvy"><input disabled={!canEdit} value={draft.contractNumber} onChange={(event) => update('contractNumber', event.target.value)}/></Field><Field label="Účinnosť zmluvy od"><input disabled={!canEdit} value={draft.contractEffectiveFrom} onChange={(event) => update('contractEffectiveFrom', event.target.value)}/></Field><Field label="Platnosť zmluvy do"><input disabled={!canEdit} value={draft.contractValidTo} onChange={(event) => update('contractValidTo', event.target.value)}/></Field><Field label="Link na CRZ"><input disabled={!canEdit} value={draft.crzLink} onChange={(event) => update('crzLink', event.target.value)}/></Field></div>}
      {modalTab === 'security' && <div className="form-grid"><Field label="Spracúva osobné/citlivé údaje?"><select disabled={!canEdit} value={draft.personalData} onChange={(event) => update('personalData', event.target.value)}>{personalDataOptions.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Stav preverenia údajov"><select disabled={!canEdit} value={draft.reviewStatus} onChange={(event) => update('reviewStatus', event.target.value)}>{reviewOptions.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Poznámka / otvorené otázky"><textarea disabled={!canEdit} value={draft.notes} onChange={(event) => update('notes', event.target.value)}/></Field></div>}
      <div className="portfolio-source-note"><Icon name="database" size={17}/><span><strong>Zdrojový záznam</strong>{draft.sourceFile || 'Aplikácia'} · {draft.sourceSheet || 'Informačné systémy'} · riadok {draft.sourceRow || 'nový'}</span></div><div className="modal-actions"><button className="button button-secondary" onClick={() => setDraft(null)}>Zavrieť</button>{canEdit && <button className="button button-primary" onClick={() => void saveDraft()} disabled={!draft.name.trim()}><Icon name="check" size={16}/> Uložiť IS</button>}</div>
    </Modal>}
  </>
}

function SystemRiskPanel({ title, items, onOpen }: { title: string; items: InformationSystemRecord[]; onOpen: (item: InformationSystemRecord) => void }) {
  return <section className="panel portfolio-risk-panel"><div className="panel-heading"><div><span className="eyebrow">Kontrolný zoznam</span><h3>{title}</h3></div><Badge tone={items.length ? 'warning' : 'success'}>{items.length}</Badge></div><div>{items.slice(0, 40).map((item) => <button key={item.sourceKey} onClick={() => onOpen(item)}><span><strong>{item.name}</strong><small>{item.businessOwner || item.technicalOwner || item.reviewStatus || 'Údaj chýba'}</small></span><Badge tone={criticalityTone(item.criticality)}>{item.criticality || 'Neurčená'}</Badge><Icon name="chevron" size={16}/></button>)}{!items.length && <Empty title="Bez nálezov" text="V tejto oblasti nie je otvorený problém."/>}</div></section>
}
