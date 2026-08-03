import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Empty, Field, Icon, Modal, PageHeader } from '../components/UI'
import {
  deleteWebsite,
  loadWebsites,
  normalizeWebsite,
  saveLocalWebsites,
  subscribeToWebsiteRegistry,
  upsertWebsite,
  type RegistrySyncState,
  type WebsiteRecord,
} from '../lib/digitalPortfolioCloud'
import './DigitalPortfolio.css'

type ViewMode = 'overview' | 'register' | 'risks'
type ModalTab = 'basic' | 'technical' | 'content' | 'decision'

const comparisonOptions = ['Presná zhoda domény', 'Možná zhoda – potvrdiť', 'Chýba vo weby_IS', 'Chýba alebo je neplatná URL vo WS02']
const actionOptions = ['Doplniť technické údaje', 'Opraviť URL vo WS02', 'Preveriť kandidáta', 'Doplniť web do weby_IS', 'Zlúčiť duplicity', 'Ponechať ako podstránku', 'Ponechať samostatne', 'Presmerovať/archivovať', 'Bez zmeny']
const reviewOptions = ['Čaká na kontrolu', 'Potvrdené', 'Opraviť URL', 'Doplniť do weby_IS', 'Zlúčiť duplicitu', 'Ponechať samostatne', 'Mimo rozsahu']

function syncLabel(state: RegistrySyncState) {
  if (state === 'loading') return 'Načítavam'
  if (state === 'saving') return 'Ukladám'
  if (state === 'synced') return 'Synchronizované'
  if (state === 'error') return 'Chyba synchronizácie'
  return 'Lokálne dáta'
}
function toneForComparison(value: string) {
  if (value === 'Presná zhoda domény') return 'success' as const
  if (value.includes('Možná')) return 'warning' as const
  if (value.includes('neplatná')) return 'danger' as const
  return 'info' as const
}
function safeHref(value: string) {
  const raw = value.trim()
  if (!raw || raw.toLowerCase() === 'x') return ''
  try { return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).toString() } catch { return '' }
}
function isBadUrl(item: WebsiteRecord) { return !safeHref(item.url) || item.comparisonStatus.includes('neplatná') }
function isCandidate(item: WebsiteRecord) { return item.comparisonStatus.includes('Možná') }
function isDuplicate(item: WebsiteRecord) { return Boolean(item.duplicateGroup || item.duplicateType) }
function lacksOwner(item: WebsiteRecord) { return !item.businessContact.trim() && !item.technicalOwner.trim() }
function lacksTechnicalData(item: WebsiteRecord) { return !item.publicIp.trim() && !item.serverIp.trim() && !item.platform.trim() }
function riskCount(item: WebsiteRecord) { return [isBadUrl(item), isCandidate(item), isDuplicate(item), lacksOwner(item), lacksTechnicalData(item)].filter(Boolean).length }
function blankWebsite(items: WebsiteRecord[]): WebsiteRecord {
  const max = items.reduce((value, item) => Math.max(value, Number(item.sourceKey.replace(/\D/g, '')) || 0), 0)
  return normalizeWebsite({ sourceKey: `WEB-${String(max + 1).padStart(3, '0')}`, sourceId: String(max + 1), name: '', reviewStatus: 'Čaká na kontrolu', comparisonStatus: 'Chýba vo weby_IS', recommendedAction: 'Doplniť technické údaje', sourceFile: 'Aplikácia', sourceSheet: 'Weby CVTI SR', sourceRow: 0 })
}
function escapeCsv(value: unknown) { return `"${String(value ?? '').replaceAll('"', '""')}"` }
function downloadCsv(items: WebsiteRecord[]) {
  const columns: Array<[keyof WebsiteRecord, string]> = [
    ['sourceKey', 'ID'], ['name', 'Názov webu'], ['url', 'URL'], ['normalizedDomain', 'Doména'], ['comparisonStatus', 'Stav porovnania'],
    ['businessUnit', 'Sekcia / oddelenie'], ['businessContact', 'Garant / kontakt'], ['technicalOwner', 'Technický vlastník'], ['platform', 'Platforma'],
    ['recommendedAction', 'Odporúčané opatrenie'], ['reviewStatus', 'Stav kontroly'], ['priority', 'Priorita'], ['largestProblem', 'Najväčší problém'], ['analystNotes', 'Poznámky analytika'],
  ]
  const content = [columns.map(([, label]) => escapeCsv(label)).join(';'), ...items.map((item) => columns.map(([key]) => escapeCsv(item[key])).join(';'))].join('\n')
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `weby-cvti-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href)
}

export default function WebRegistry({ canEdit, databaseMode, organizationId }: { canEdit: boolean; databaseMode: 'local' | 'cloud'; organizationId?: string }) {
  const [items, setItems] = useState<WebsiteRecord[]>([])
  const [sync, setSync] = useState<RegistrySyncState>(databaseMode === 'cloud' ? 'loading' : 'local')
  const [error, setError] = useState('')
  const [view, setView] = useState<ViewMode>('overview')
  const [search, setSearch] = useState('')
  const [comparisonFilter, setComparisonFilter] = useState('Všetky')
  const [actionFilter, setActionFilter] = useState('Všetky')
  const [reviewFilter, setReviewFilter] = useState('Všetky')
  const [draft, setDraft] = useState<WebsiteRecord | null>(null)
  const [modalTab, setModalTab] = useState<ModalTab>('basic')
  const reloadTimer = useRef<number | undefined>(undefined)

  async function reload(silent = false) {
    setSync(databaseMode === 'cloud' ? 'loading' : 'local'); setError('')
    try { setItems(await loadWebsites(databaseMode)); setSync(databaseMode === 'cloud' ? 'synced' : 'local') }
    catch (caught) { const message = caught instanceof Error ? caught.message : 'Register webov sa nepodarilo načítať.'; setError(message); setSync('error'); if (!silent) alert(message) }
  }
  useEffect(() => { void reload(true) }, [databaseMode])
  useEffect(() => {
    if (databaseMode !== 'cloud' || !organizationId) return
    const unsubscribe = subscribeToWebsiteRegistry(organizationId, () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current)
      reloadTimer.current = window.setTimeout(() => void reload(true), 300)
    })
    return () => { if (reloadTimer.current) window.clearTimeout(reloadTimer.current); unsubscribe() }
  }, [databaseMode, organizationId])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter((item) => {
      const haystack = `${item.sourceKey} ${item.name} ${item.url} ${item.normalizedDomain} ${item.businessUnit} ${item.businessContact} ${item.technicalOwner} ${item.primaryPurpose} ${item.analystNotes}`.toLowerCase()
      return (!query || haystack.includes(query))
        && (comparisonFilter === 'Všetky' || item.comparisonStatus === comparisonFilter)
        && (actionFilter === 'Všetky' || item.recommendedAction === actionFilter)
        && (reviewFilter === 'Všetky' || item.reviewStatus === reviewFilter)
    }).sort((a, b) => riskCount(b) - riskCount(a) || a.name.localeCompare(b.name, 'sk'))
  }, [items, search, comparisonFilter, actionFilter, reviewFilter])

  const exact = items.filter((item) => item.comparisonStatus === 'Presná zhoda domény').length
  const badUrls = items.filter(isBadUrl).length
  const candidates = items.filter(isCandidate).length
  const duplicates = items.filter(isDuplicate).length
  const missingOwner = items.filter(lacksOwner).length
  const pending = items.filter((item) => !item.reviewStatus || item.reviewStatus === 'Čaká na kontrolu').length
  const priorityQueue = [...items].filter((item) => riskCount(item) > 0).sort((a, b) => riskCount(b) - riskCount(a) || a.name.localeCompare(b.name, 'sk')).slice(0, 10)

  async function saveDraft() {
    if (!draft || !draft.name.trim()) return
    const normalized = normalizeWebsite(draft)
    const next = items.some((item) => item.sourceKey === normalized.sourceKey) ? items.map((item) => item.sourceKey === normalized.sourceKey ? normalized : item) : [...items, normalized]
    setItems(next); setDraft(null); setSync(databaseMode === 'cloud' ? 'saving' : 'local'); setError('')
    if (databaseMode === 'local') { saveLocalWebsites(next); return }
    try { await upsertWebsite(normalized, databaseMode); setSync('synced') }
    catch (caught) { setSync('error'); setError(caught instanceof Error ? caught.message : 'Web sa nepodarilo uložiť.') }
  }
  async function removeItem(item: WebsiteRecord) {
    if (!canEdit || !confirm(`Odstrániť web „${item.name}“ z registra?`)) return
    const next = items.filter((entry) => entry.sourceKey !== item.sourceKey); setItems(next); setSync(databaseMode === 'cloud' ? 'saving' : 'local')
    if (databaseMode === 'local') { saveLocalWebsites(next); return }
    try { await deleteWebsite(item.sourceKey, databaseMode); setSync('synced') }
    catch (caught) { setSync('error'); setError(caught instanceof Error ? caught.message : 'Web sa nepodarilo odstrániť.') }
  }
  function update<K extends keyof WebsiteRecord>(key: K, value: WebsiteRecord[K]) { setDraft((current) => current ? { ...current, [key]: value } : current) }

  return <>
    <PageHeader eyebrow="Digitálne portfólio" title="Weby CVTI SR" description="Centrálny register webov, technických údajov, vlastníctva, duplicít a rozhodnutí z inventarizácie WS02 a weby_IS."
      actions={<><button className="button button-secondary" onClick={() => downloadCsv(filtered)}><Icon name="download" size={16}/> Export CSV</button>{canEdit && <button className="button button-primary" onClick={() => { setDraft(blankWebsite(items)); setModalTab('basic') }}><Icon name="plus" size={17}/> Nový web</button>}</>}/>

    <section className={`portfolio-sync portfolio-sync-${sync}`}><div className="portfolio-sync-icon"><Icon name={sync === 'error' ? 'warning' : 'database'} size={20}/></div><div><strong>{databaseMode === 'cloud' ? 'Samostatný register v Supabase' : 'Lokálny pracovný register'}</strong><span>{error || 'Zdrojové dáta boli načítané zo súboru Inventarizácia webov CVTI SR – krok 1 V2.'}</span></div><div><Badge tone={sync === 'error' ? 'danger' : sync === 'synced' ? 'success' : sync === 'saving' || sync === 'loading' ? 'warning' : 'info'}>{syncLabel(sync)}</Badge><button className="icon-button" onClick={() => void reload()} title="Obnoviť"><Icon name="refresh" size={17}/></button></div></section>

    <div className="portfolio-kpi-grid">
      <button className="portfolio-kpi" onClick={() => setView('register')}><Icon name="web"/><span>Všetky weby<strong>{items.length}</strong><small>evidovaných záznamov</small></span></button>
      <button className="portfolio-kpi portfolio-kpi-good" onClick={() => { setComparisonFilter('Presná zhoda domény'); setView('register') }}><Icon name="check"/><span>Presné zhody<strong>{exact}</strong><small>potvrdená doména</small></span></button>
      <button className="portfolio-kpi portfolio-kpi-danger" onClick={() => setView('risks')}><Icon name="warning"/><span>Chybné URL<strong>{badUrls}</strong><small>opraviť alebo preveriť</small></span></button>
      <button className="portfolio-kpi portfolio-kpi-warning" onClick={() => setView('risks')}><Icon name="search"/><span>Kandidátske zhody<strong>{candidates}</strong><small>vyžadujú rozhodnutie</small></span></button>
      <button className="portfolio-kpi portfolio-kpi-purple" onClick={() => setView('risks')}><Icon name="matrix"/><span>Duplicity / vzťahy<strong>{duplicates}</strong><small>v skupinách webov</small></span></button>
      <button className="portfolio-kpi portfolio-kpi-warning" onClick={() => setView('risks')}><Icon name="user"/><span>Bez vlastníka<strong>{missingOwner}</strong><small>chýba garant aj technik</small></span></button>
    </div>

    <div className="portfolio-tabs"><button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}><Icon name="dashboard" size={17}/> Manažérsky prehľad</button><button className={view === 'register' ? 'active' : ''} onClick={() => setView('register')}><Icon name="web" size={17}/> Register webov</button><button className={view === 'risks' ? 'active' : ''} onClick={() => setView('risks')}><Icon name="risk" size={17}/> Riziká a kvalita <b>{badUrls + candidates + duplicates}</b></button></div>

    {view === 'overview' && <div className="portfolio-overview-grid">
      <section className="panel portfolio-priority"><div className="panel-heading"><div><span className="eyebrow">Riadiaci pohľad</span><h3>Čo treba riešiť ako prvé</h3></div><Badge tone="warning">{priorityQueue.length} priorít</Badge></div><div className="portfolio-priority-list">{priorityQueue.map((item) => <button key={item.sourceKey} onClick={() => { setDraft(structuredClone(item)); setModalTab('decision') }}><span className={`portfolio-risk-score risk-${Math.min(5, riskCount(item))}`}>{riskCount(item)}</span><span><strong>{item.name || item.sourceKey}</strong><small>{[isBadUrl(item) && 'URL', isCandidate(item) && 'zhoda', isDuplicate(item) && 'duplicita', lacksOwner(item) && 'vlastník', lacksTechnicalData(item) && 'technické údaje'].filter(Boolean).join(' · ')}</small></span><Badge tone={riskCount(item) >= 3 ? 'danger' : 'warning'}>{item.recommendedAction || 'Preveriť'}</Badge><Icon name="chevron" size={16}/></button>)}</div></section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">Kontrola inventarizácie</span><h3>Stav spracovania</h3></div></div><div className="portfolio-status-list"><div><span>Čaká na kontrolu</span><strong>{pending}</strong><i style={{ width: `${items.length ? pending / items.length * 100 : 0}%` }}/></div><div><span>Presná zhoda domény</span><strong>{exact}</strong><i style={{ width: `${items.length ? exact / items.length * 100 : 0}%` }}/></div><div><span>Chýba / neplatná URL</span><strong>{badUrls}</strong><i style={{ width: `${items.length ? badUrls / items.length * 100 : 0}%` }}/></div><div><span>Bez vecného alebo technického vlastníka</span><strong>{missingOwner}</strong><i style={{ width: `${items.length ? missingOwner / items.length * 100 : 0}%` }}/></div></div></section>
      <section className="panel portfolio-wide"><div className="panel-heading"><div><span className="eyebrow">Odporúčané opatrenia</span><h3>Pracovný backlog webového portfólia</h3></div></div><div className="portfolio-action-grid">{actionOptions.map((action) => { const count = items.filter((item) => item.recommendedAction === action).length; return count ? <button key={action} onClick={() => { setActionFilter(action); setView('register') }}><strong>{count}</strong><span>{action}</span><Icon name="chevron" size={16}/></button> : null })}</div></section>
    </div>}

    {view === 'register' && <>
      <section className="portfolio-toolbar"><label className="search-box"><Icon name="search"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hľadať názov, doménu, garanta, sekciu alebo poznámku…"/></label><select value={comparisonFilter} onChange={(event) => setComparisonFilter(event.target.value)}><option>Všetky</option>{comparisonOptions.map((value) => <option key={value}>{value}</option>)}</select><select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}><option>Všetky</option>{actionOptions.map((value) => <option key={value}>{value}</option>)}</select><select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value)}><option>Všetky</option>{reviewOptions.map((value) => <option key={value}>{value}</option>)}</select><Badge tone="info">{filtered.length} z {items.length}</Badge></section>
      <section className="panel portfolio-table-panel"><div className="portfolio-table-shell"><table className="portfolio-table website-table"><thead><tr><th>Web</th><th>Stav a doména</th><th>Vlastníctvo</th><th>Technika</th><th>Opatrenie</th><th>Kontrola</th><th></th></tr></thead><tbody>{filtered.map((item) => <tr key={item.sourceKey}><td><strong>{item.name || 'Bez názvu'}</strong><small>{item.sourceKey} · riadok {item.sourceRow || '—'}</small>{safeHref(item.url) ? <a href={safeHref(item.url)} target="_blank" rel="noreferrer">{item.url}<Icon name="arrow" size={12}/></a> : <span className="portfolio-invalid-url">{item.url || 'URL chýba'}</span>}</td><td><Badge tone={toneForComparison(item.comparisonStatus)}>{item.comparisonStatus || 'Neurčené'}</Badge><small>{item.normalizedDomain || 'Doména neurčená'}</small>{item.duplicateGroup && <Badge tone="purple">{item.duplicateGroup}</Badge>}</td><td><strong>{item.businessUnit || item.technicalSection || 'Útvar neurčený'}</strong><small>{item.businessContact || item.technicalOwner || 'Vlastník chýba'}</small></td><td><strong>{item.platform || 'Platforma neurčená'}</strong><small>{[item.publicIp, item.serverIp].filter(Boolean).join(' · ') || 'IP údaje chýbajú'}</small></td><td><Badge tone={isBadUrl(item) ? 'danger' : item.recommendedAction.includes('Preveriť') ? 'warning' : 'info'}>{item.recommendedAction || 'Bez opatrenia'}</Badge><small>{item.priority || item.analystCategory}</small></td><td><Badge tone={item.reviewStatus === 'Potvrdené' ? 'success' : item.reviewStatus === 'Čaká na kontrolu' ? 'warning' : 'neutral'}>{item.reviewStatus || 'Čaká na kontrolu'}</Badge></td><td><div className="row-actions"><button className="icon-button" onClick={() => { setDraft(structuredClone(item)); setModalTab('basic') }} title={canEdit ? 'Upraviť' : 'Detail'}><Icon name={canEdit ? 'edit' : 'eye'} size={17}/></button>{canEdit && <button className="icon-button icon-button-danger" onClick={() => void removeItem(item)} title="Odstrániť"><Icon name="trash" size={17}/></button>}</div></td></tr>)}</tbody></table>{!filtered.length && <Empty title="Žiadne weby" text="Zmeňte vyhľadávanie alebo filtre."/>}</div></section>
    </>}

    {view === 'risks' && <div className="portfolio-risk-grid">
      <RiskPanel title="Chýbajúca alebo neplatná URL" items={items.filter(isBadUrl)} onOpen={(item) => { setDraft(structuredClone(item)); setModalTab('basic') }}/>
      <RiskPanel title="Možná zhoda – potvrdiť" items={items.filter(isCandidate)} onOpen={(item) => { setDraft(structuredClone(item)); setModalTab('decision') }}/>
      <RiskPanel title="Duplicity a podstránky" items={items.filter(isDuplicate)} onOpen={(item) => { setDraft(structuredClone(item)); setModalTab('decision') }}/>
      <RiskPanel title="Chýbajúce vlastníctvo" items={items.filter(lacksOwner)} onOpen={(item) => { setDraft(structuredClone(item)); setModalTab('content') }}/>
    </div>}

    {draft && <Modal title={draft.name ? `Web: ${draft.name}` : 'Nový web CVTI SR'} onClose={() => setDraft(null)} wide><div className="portfolio-modal-tabs"><button className={modalTab === 'basic' ? 'active' : ''} onClick={() => setModalTab('basic')}>Základné údaje</button><button className={modalTab === 'technical' ? 'active' : ''} onClick={() => setModalTab('technical')}>Technika</button><button className={modalTab === 'content' ? 'active' : ''} onClick={() => setModalTab('content')}>Obsah a vlastníctvo</button><button className={modalTab === 'decision' ? 'active' : ''} onClick={() => setModalTab('decision')}>Rozhodnutie a riziká</button></div>
      {modalTab === 'basic' && <div className="form-grid"><Field label="Názov webu"><input disabled={!canEdit} value={draft.name} onChange={(event) => update('name', event.target.value)}/></Field><Field label="URL"><input disabled={!canEdit} value={draft.url} onChange={(event) => update('url', event.target.value)}/></Field><Field label="Normalizovaná doména"><input disabled={!canEdit} value={draft.normalizedDomain} onChange={(event) => update('normalizedDomain', event.target.value)}/></Field><Field label="Stav porovnania"><select disabled={!canEdit} value={draft.comparisonStatus} onChange={(event) => update('comparisonStatus', event.target.value)}>{comparisonOptions.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Istota zhody"><input disabled={!canEdit} value={draft.matchConfidence} onChange={(event) => update('matchConfidence', event.target.value)}/></Field><Field label="Dátum stretnutia"><input disabled={!canEdit} type="date" value={draft.meetingDate} onChange={(event) => update('meetingDate', event.target.value)}/></Field><Field label="Aktívny a relevantný?"><input disabled={!canEdit} value={draft.activeRelevant} onChange={(event) => update('activeRelevant', event.target.value)}/></Field><Field label="EÚ financovanie – online?"><input disabled={!canEdit} value={draft.euFundedOnline} onChange={(event) => update('euFundedOnline', event.target.value)}/></Field><Field label="EÚ financovanie – do kedy?"><input disabled={!canEdit} value={draft.euFundedUntil} onChange={(event) => update('euFundedUntil', event.target.value)}/></Field><Field label="Prekrývajúci web"><input disabled={!canEdit} value={draft.overlappingSite} onChange={(event) => update('overlappingSite', event.target.value)}/></Field></div>}
      {modalTab === 'technical' && <div className="form-grid"><Field label="DNS názvy / aliasy"><input disabled={!canEdit} value={draft.dnsAliases} onChange={(event) => update('dnsAliases', event.target.value)}/></Field><Field label="Verejná IP"><input disabled={!canEdit} value={draft.publicIp} onChange={(event) => update('publicIp', event.target.value)}/></Field><Field label="LB VIP"><input disabled={!canEdit} value={draft.lbVip} onChange={(event) => update('lbVip', event.target.value)}/></Field><Field label="Server IP"><input disabled={!canEdit} value={draft.serverIp} onChange={(event) => update('serverIp', event.target.value)}/></Field><Field label="Sekcia weby_IS"><input disabled={!canEdit} value={draft.technicalSection} onChange={(event) => update('technicalSection', event.target.value)}/></Field><Field label="Technický vlastník"><input disabled={!canEdit} value={draft.technicalOwner} onChange={(event) => update('technicalOwner', event.target.value)}/></Field><Field label="Platforma"><input disabled={!canEdit} value={draft.platform} onChange={(event) => update('platform', event.target.value)}/></Field><Field label="Vlastný brand manuál?"><input disabled={!canEdit} value={draft.hasOwnBrandManual} onChange={(event) => update('hasOwnBrandManual', event.target.value)}/></Field><Field label="Brand manuál dostupný?"><input disabled={!canEdit} value={draft.brandManualAvailable} onChange={(event) => update('brandManualAvailable', event.target.value)}/></Field><Field label="Technický komentár"><textarea disabled={!canEdit} value={draft.technicalComment} onChange={(event) => update('technicalComment', event.target.value)}/></Field><Field label="Interaktívne funkcie?"><textarea disabled={!canEdit} value={draft.interactiveFunctions} onChange={(event) => update('interactiveFunctions', event.target.value)}/></Field><Field label="Funkcie / napojenia"><textarea disabled={!canEdit} value={draft.integrationDescription} onChange={(event) => update('integrationDescription', event.target.value)}/></Field></div>}
      {modalTab === 'content' && <div className="form-grid"><Field label="Garant / kontakt"><input disabled={!canEdit} value={draft.businessContact} onChange={(event) => update('businessContact', event.target.value)}/></Field><Field label="Sekcia / oddelenie"><input disabled={!canEdit} value={draft.businessUnit} onChange={(event) => update('businessUnit', event.target.value)}/></Field><Field label="Zodpovedný za obsah"><input disabled={!canEdit} value={draft.contentOwner} onChange={(event) => update('contentOwner', event.target.value)}/></Field><Field label="Frekvencia aktualizácie"><input disabled={!canEdit} value={draft.updateFrequency} onChange={(event) => update('updateFrequency', event.target.value)}/></Field><Field label="Primárny účel webu"><textarea disabled={!canEdit} value={draft.primaryPurpose} onChange={(event) => update('primaryPurpose', event.target.value)}/></Field><Field label="Cieľová skupina"><textarea disabled={!canEdit} value={draft.targetAudience} onChange={(event) => update('targetAudience', event.target.value)}/></Field><Field label="Typy obsahu"><textarea disabled={!canEdit} value={draft.contentTypes} onChange={(event) => update('contentTypes', event.target.value)}/></Field><Field label="Najdôležitejšie stránky"><textarea disabled={!canEdit} value={draft.keyPages} onChange={(event) => update('keyPages', event.target.value)}/></Field><Field label="Rôzne používateľské skupiny?"><input disabled={!canEdit} value={draft.differentUserGroups} onChange={(event) => update('differentUserGroups', event.target.value)}/></Field><Field label="Plán rozvoja"><textarea disabled={!canEdit} value={draft.developmentPlan} onChange={(event) => update('developmentPlan', event.target.value)}/></Field></div>}
      {modalTab === 'decision' && <div className="form-grid"><Field label="Odporúčané opatrenie"><select disabled={!canEdit} value={draft.recommendedAction} onChange={(event) => update('recommendedAction', event.target.value)}>{actionOptions.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Stav kontroly"><select disabled={!canEdit} value={draft.reviewStatus} onChange={(event) => update('reviewStatus', event.target.value)}>{reviewOptions.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Skupina duplicity"><input disabled={!canEdit} value={draft.duplicateGroup} onChange={(event) => update('duplicateGroup', event.target.value)}/></Field><Field label="Typ duplicity / vzťahu"><input disabled={!canEdit} value={draft.duplicateType} onChange={(event) => update('duplicateType', event.target.value)}/></Field><Field label="Navrhovaný kanonický záznam"><input disabled={!canEdit} value={draft.canonicalRecord} onChange={(event) => update('canonicalRecord', event.target.value)}/></Field><Field label="Priorita"><input disabled={!canEdit} value={draft.priority} onChange={(event) => update('priority', event.target.value)}/></Field><Field label="Najväčší problém webu"><textarea disabled={!canEdit} value={draft.largestProblem} onChange={(event) => update('largestProblem', event.target.value)}/></Field><Field label="Čo by zmenili"><textarea disabled={!canEdit} value={draft.desiredChange} onChange={(event) => update('desiredChange', event.target.value)}/></Field><Field label="Definícia úspechu"><textarea disabled={!canEdit} value={draft.successDefinition} onChange={(event) => update('successDefinition', event.target.value)}/></Field><Field label="Poznámka k rozhodnutiu"><textarea disabled={!canEdit} value={draft.decisionNote} onChange={(event) => update('decisionNote', event.target.value)}/></Field><Field label="Kategória analytika"><input disabled={!canEdit} value={draft.analystCategory} onChange={(event) => update('analystCategory', event.target.value)}/></Field><Field label="Odôvodnenie kategórie"><textarea disabled={!canEdit} value={draft.analystReason} onChange={(event) => update('analystReason', event.target.value)}/></Field><Field label="Poznámky analytika"><textarea disabled={!canEdit} value={draft.analystNotes} onChange={(event) => update('analystNotes', event.target.value)}/></Field></div>}
      <div className="portfolio-source-note"><Icon name="database" size={17}/><span><strong>Zdrojový záznam</strong>{draft.sourceFile || 'Aplikácia'} · {draft.sourceSheet || 'Weby CVTI SR'} · riadok {draft.sourceRow || 'nový'}</span></div><div className="modal-actions"><button className="button button-secondary" onClick={() => setDraft(null)}>Zavrieť</button>{canEdit && <button className="button button-primary" onClick={() => void saveDraft()} disabled={!draft.name.trim()}><Icon name="check" size={16}/> Uložiť web</button>}</div>
    </Modal>}
  </>
}

function RiskPanel({ title, items, onOpen }: { title: string; items: WebsiteRecord[]; onOpen: (item: WebsiteRecord) => void }) {
  return <section className="panel portfolio-risk-panel"><div className="panel-heading"><div><span className="eyebrow">Kontrolný zoznam</span><h3>{title}</h3></div><Badge tone={items.length ? 'warning' : 'success'}>{items.length}</Badge></div><div>{items.slice(0, 30).map((item) => <button key={item.sourceKey} onClick={() => onOpen(item)}><span><strong>{item.name || item.sourceKey}</strong><small>{item.url || item.normalizedDomain || item.recommendedAction}</small></span><Icon name="chevron" size={16}/></button>)}{!items.length && <Empty title="Bez nálezov" text="V tejto oblasti nie je otvorený problém."/>}</div></section>
}
