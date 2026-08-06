import { useMemo, useState, type ChangeEvent } from 'react'
import { Badge, Empty, Icon, PageHeader, Progress } from '../components/UI'
import { oitData } from '../data/oitData'
import {
  buildTechnologyItems,
  evidenceTone,
  recordsForItem,
  technologySourcesSummary,
  type TechnologyItem,
  type TechnologyModel,
} from '../data/technologyCatalog'
import type { AppState } from '../types'

type Tab = 'overview' | 'explorer' | 'models' | 'capacity' | 'licenses' | 'impact'
type Go = (view: string) => void

function csv(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function normalize(value: string) {
  return value.toLocaleLowerCase('sk')
}

function modelTone(model: TechnologyModel) {
  if (model === 'IaaS') return 'info' as const
  if (model === 'PaaS') return 'purple' as const
  return 'success' as const
}

function dateState(value: string) {
  if (!value) return { label: 'Dátum neevidovaný', tone: 'warning' as const, days: Number.POSITIVE_INFINITY }
  const date = new Date(`${value}T00:00:00`)
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000)
  if (Number.isNaN(days)) return { label: value, tone: 'neutral' as const, days: Number.POSITIVE_INFINITY }
  if (days < 0) return { label: `Po termíne ${Math.abs(days)} dní`, tone: 'danger' as const, days }
  if (days <= 90) return { label: `Končí do ${days} dní`, tone: 'warning' as const, days }
  return { label: `Platné do ${date.toLocaleDateString('sk-SK')}`, tone: 'success' as const, days }
}

function itemCompleteness(item: TechnologyItem) {
  const checks = [item.location, item.platform, item.monitoring, item.backup, item.owner]
  return Math.round(checks.filter(value => value && !/na potvrdenie|neurčen/i.test(value)).length / checks.length * 100)
}

function relatedServices(state: AppState, item: TechnologyItem) {
  return state.services.filter(service => item.serviceIds.includes(service.id))
}

function relatedCmdb(state: AppState, item: TechnologyItem) {
  const direct = new Set(item.cmdbIds)
  const serviceIds = new Set(item.serviceIds)
  state.cmdbRelationships.forEach(relationship => {
    if (direct.has(relationship.sourceId)) direct.add(relationship.targetId)
    if (direct.has(relationship.targetId)) direct.add(relationship.sourceId)
  })
  return state.cmdbItems.filter(cmdb => direct.has(cmdb.id) || serviceIds.has(cmdb.serviceId))
}

function blastRadius(state: AppState, item: TechnologyItem) {
  const services = relatedServices(state, item)
  const cmdb = relatedCmdb(state, item)
  const serviceIds = new Set(services.map(service => service.id))
  const tickets = state.tickets.filter(ticket => serviceIds.has(ticket.serviceId))
  const changes = state.changes.filter(change => serviceIds.has(change.serviceId))
  const problems = state.problems.filter(problem => serviceIds.has(problem.serviceId))
  const critical = services.filter(service => service.criticality === 'Kritická').length
  const score = Math.min(100, critical * 25 + services.length * 8 + cmdb.length * 3 + problems.length * 6 + changes.length * 2)
  return { services, cmdb, tickets, changes, problems, critical, score }
}

export default function TechnologyCatalog({ state, go }: { state: AppState; go: Go }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [query, setQuery] = useState('')
  const [model, setModel] = useState<'all' | TechnologyModel>('all')
  const [location, setLocation] = useState('all')
  const items = useMemo(() => buildTechnologyItems(state), [state])
  const [selectedId, setSelectedId] = useState('platform-vmware')
  const selected = items.find(item => item.id === selectedId) || items[0]
  const locations = useMemo<string[]>(() => Array.from(new Set<string>(items.map(item => item.location))).sort((a: string, b: string) => a.localeCompare(b, 'sk')), [items])
  const filtered = items.filter(item =>
    (model === 'all' || item.model === model) &&
    (location === 'all' || item.location === location) &&
    normalize(`${item.name} ${item.category} ${item.kind} ${item.location} ${item.platform} ${item.serverHints.join(' ')} ${item.note}`).includes(normalize(query)),
  )
  const modelGroups = (['IaaS', 'PaaS', 'SaaS'] as TechnologyModel[]).map(value => ({
    model: value,
    items: items.filter(item => item.model === value),
  }))
  const sourceSummary = technologySourcesSummary()
  const licenseItems = state.cmdbItems
    .filter(item => item.type === 'Licencia' || item.licenseEnd || item.supportEnd || /licenc/i.test(`${item.name} ${item.category}`))
    .sort((a, b) => (a.licenseEnd || a.supportEnd || '9999').localeCompare(b.licenseEnd || b.supportEnd || '9999'))
  const gaps = items.filter(item => itemCompleteness(item) < 80)
  const averageCompleteness = items.length ? Math.round(items.reduce((sum, item) => sum + itemCompleteness(item), 0) / items.length) : 0
  const impact = selected ? blastRadius(state, selected) : null
  const records = selected ? recordsForItem(selected) : []

  function exportCsv() {
    const rows = [
      ['Model', 'Názov', 'Typ', 'Kategória', 'Lokalita', 'Prostredie', 'Platforma', 'Služby', 'Servery', 'Monitoring', 'Zálohovanie', 'Vlastník', 'Životný cyklus', 'Podpora do', 'Licencia do', 'Dôkaz', 'Zdroj'],
      ...items.map(item => [item.model, item.name, item.kind, item.category, item.location, item.environment, item.platform, item.serviceIds.join('; '), item.serverHints.join('; '), item.monitoring, item.backup, item.owner, item.lifecycle, item.supportEnd, item.licenseEnd, item.evidence, item.source]),
    ]
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(csv).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'technologicky-katalog-cvti.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return <>
    <PageHeader
      eyebrow="Spoločný modul odborov 3.1 a 3.2"
      title="Technologický katalóg a infraštruktúrny explorer"
      description="Interaktívny pohľad od fyzickej a virtuálnej infraštruktúry cez platformy až po informačné systémy, služby, licencie, výkonové kapacity a dopady výpadkov."
      actions={<button className="button button-secondary" onClick={exportCsv}><Icon name="download" size={17}/>Export CSV</button>}
    />

    <div className="technology-source-note"><Icon name="shield" size={20}/><div><strong>Jednotný technologický model CVTI SR</strong><span>Údaje sa skladajú z CMDB, registra služieb ORIS, technickej architektúry OIT, inventárov oboch lokalít a prevádzkového reportu. Odvodené položky sú označené a musia byť potvrdené vlastníkom.</span></div></div>

    <section className="technology-kpis">
      <article><span>TECHNOLOGICKÉ POLOŽKY</span><strong>{items.length}</strong><small>platformy, servery, CMDB a služby</small></article>
      <article><span>IaaS / PaaS / SaaS</span><strong>{modelGroups.map(group => group.items.length).join(' / ')}</strong><small>vrstvy technologického modelu</small></article>
      <article><span>ÚPLNOSŤ ÚDAJOV</span><strong>{averageCompleteness}%</strong><small>{gaps.length} položiek potrebuje doplnenie</small></article>
      <article><span>LICENCIE A PODPORA</span><strong>{licenseItems.length}</strong><small>položky s licenčným alebo podporným termínom</small></article>
      <article><span>LOKALITY</span><strong>{locations.length}</strong><small>produkčné, lokálne a cloudové umiestnenia</small></article>
    </section>

    <div className="view-tabs technology-tabs" role="tablist" aria-label="Pohľady technologického katalógu">
      <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><Icon name="dashboard"/>Prehľad</button>
      <button className={tab === 'explorer' ? 'active' : ''} onClick={() => setTab('explorer')}><Icon name="systems"/>Explorer <b>{items.length}</b></button>
      <button className={tab === 'models' ? 'active' : ''} onClick={() => setTab('models')}><Icon name="services"/>IaaS · PaaS · SaaS</button>
      <button className={tab === 'capacity' ? 'active' : ''} onClick={() => setTab('capacity')}><Icon name="capacity"/>Kapacita a výkon</button>
      <button className={tab === 'licenses' ? 'active' : ''} onClick={() => setTab('licenses')}><Icon name="calendar"/>Licencie <b>{licenseItems.length}</b></button>
      <button className={tab === 'impact' ? 'active' : ''} onClick={() => setTab('impact')}><Icon name="risk"/>Dopad výpadku</button>
    </div>

    {tab === 'overview' && <>
      <section className="technology-model-grid">
        {modelGroups.map(group => <article className={`panel technology-model-card technology-model-${group.model.toLowerCase()}`} key={group.model}>
          <div className="panel-heading"><div><span className="eyebrow">Servisný model</span><h3>{group.model}</h3></div><Badge tone={modelTone(group.model)}>{group.items.length}</Badge></div>
          <p>{group.model === 'IaaS' ? 'Výpočtová, serverová, sieťová, storage a zálohovacia infraštruktúra.' : group.model === 'PaaS' ? 'Databázy, identity, monitoring, aplikačné runtime, cloud a analytické platformy.' : 'Informačné systémy, registre, webové portály a používateľské cloudové služby.'}</p>
          <div className="technology-model-list">{group.items.slice(0, 6).map(item => <button key={item.id} onClick={() => { setSelectedId(item.id); setTab('explorer') }}><span><strong>{item.name}</strong><small>{item.location}</small></span><Icon name="chevron" size={16}/></button>)}</div>
        </article>)}
      </section>
      <section className="technology-overview-layout">
        <article className="panel technology-flow-panel">
          <div className="panel-heading"><div><span className="eyebrow">End-to-end model</span><h3>Od lokality po službu</h3></div><Badge tone="info">interaktívne väzby</Badge></div>
          <div className="technology-flow">
            <button onClick={() => { setModel('IaaS'); setTab('explorer') }}><Icon name="database"/><span><strong>Lokalita a rack</strong><small>{sourceSummary.dcRacks + sourceSummary.lamacskaRacks} evidovaných rackov</small></span></button>
            <i><Icon name="arrow" size={18}/></i>
            <button onClick={() => { setModel('IaaS'); setTab('explorer') }}><Icon name="cmdb"/><span><strong>Server a infraštruktúra</strong><small>{sourceSummary.dcDevices + sourceSummary.lamacskaDevices} inventárnych záznamov</small></span></button>
            <i><Icon name="arrow" size={18}/></i>
            <button onClick={() => { setModel('PaaS'); setTab('models') }}><Icon name="systems"/><span><strong>Platforma</strong><small>{sourceSummary.softwareCategories} softvérových kategórií</small></span></button>
            <i><Icon name="arrow" size={18}/></i>
            <button onClick={() => { setModel('SaaS'); setTab('explorer') }}><Icon name="services"/><span><strong>Systém a služba</strong><small>{state.services.length} služieb ORIS</small></span></button>
          </div>
        </article>
        <article className="panel technology-quality-panel">
          <div className="panel-heading"><div><span className="eyebrow">Kvalita údajov</span><h3>Dokumentačné pokrytie</h3></div><Badge tone={averageCompleteness >= 80 ? 'success' : 'warning'}>{averageCompleteness}%</Badge></div>
          <Progress value={averageCompleteness} label="Priemerná úplnosť"/>
          <div>{gaps.slice(0, 6).map(item => <button key={item.id} onClick={() => { setSelectedId(item.id); setTab('explorer') }}><Icon name="warning" size={16}/><span><strong>{item.name}</strong><small>Úplnosť {itemCompleteness(item)}% · {item.location}</small></span></button>)}</div>
          {!gaps.length && <Empty title="Bez otvorených medzier" text="Všetky položky majú základné technologické údaje."/>}
        </article>
      </section>
    </>}

    {tab === 'explorer' && <>
      <div className="filter-panel technology-filter">
        <label><span>Vyhľadávanie</span><div className="search-input"><Icon name="search" size={17}/><input value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="Server, CRZP, VMware, lokalita, platforma..."/></div></label>
        <label><span>Model</span><select value={model} onChange={(event: ChangeEvent<HTMLSelectElement>) => setModel(event.target.value as typeof model)}><option value="all">Všetky modely</option><option>IaaS</option><option>PaaS</option><option>SaaS</option></select></label>
        <label><span>Lokalita</span><select value={location} onChange={(event: ChangeEvent<HTMLSelectElement>) => setLocation(event.target.value)}><option value="all">Všetky lokality</option>{locations.map(value => <option key={value}>{value}</option>)}</select></label>
        <span className="result-pill">{filtered.length} položiek</span>
      </div>
      <section className="technology-explorer-layout">
        <div className="technology-explorer-list">{filtered.map(item => <button className={selected?.id === item.id ? 'active' : ''} key={item.id} onClick={() => setSelectedId(item.id)}>
          <span className={`technology-model-mark technology-model-mark-${item.model.toLowerCase()}`}>{item.model}</span>
          <span><strong>{item.name}</strong><small>{item.kind} · {item.location}</small></span>
          <Badge tone={evidenceTone(item.evidence)}>{item.evidence}</Badge>
        </button>)}</div>
        {selected && <article className="panel technology-detail-panel">
          <div className="technology-detail-head"><div><Badge tone={modelTone(selected.model)}>{selected.model}</Badge><span>{selected.category}</span><h2>{selected.name}</h2></div><Badge tone={evidenceTone(selected.evidence)}>{selected.evidence}</Badge></div>
          <p>{selected.note || 'Bez doplňujúcej poznámky.'}</p>
          <Progress value={itemCompleteness(selected)} label="Úplnosť technologických údajov"/>
          <div className="technology-detail-grid">
            <section><small>Lokalita</small><strong>{selected.location}</strong><span>{selected.environment}</span></section>
            <section><small>Platforma / verzia</small><strong>{selected.platform}</strong><span>{selected.lifecycle}</span></section>
            <section><small>Technický vlastník</small><strong>{selected.owner}</strong><span>{selected.source}</span></section>
            <section><small>Monitoring</small><strong>{selected.monitoring}</strong></section>
            <section><small>Zálohovanie</small><strong>{selected.backup}</strong></section>
            <section><small>Servery / hostitelia</small><strong>{selected.serverHints.length ? selected.serverHints.join(' · ') : 'Na potvrdenie'}</strong></section>
          </div>
          <div className="technology-linked-services"><small>Prepojené služby</small><div>{relatedServices(state, selected).map(service => <button key={service.id} onClick={() => go('services')}><Icon name="services" size={15}/>{service.name}</button>)}{!relatedServices(state, selected).length && <span>Bez jednoznačnej väzby na službu.</span>}</div></div>
          <div className="technology-detail-actions"><button className="button button-secondary button-small" onClick={() => go('cmdb')}><Icon name="cmdb" size={16}/>Otvoriť CMDB</button><button className="button button-secondary button-small" onClick={() => go('architecture')}><Icon name="substitute" size={16}/>Architektúra služieb</button><button className="button button-primary button-small" onClick={() => setTab('impact')}><Icon name="risk" size={16}/>Analyzovať dopad</button></div>
        </article>}
      </section>
    </>}

    {tab === 'models' && <section className="technology-model-columns">{modelGroups.map(group => <article className="panel" key={group.model}>
      <div className="panel-heading"><div><span className="eyebrow">Technologická vrstva</span><h3>{group.model}</h3></div><Badge tone={modelTone(group.model)}>{group.items.length}</Badge></div>
      <div className="technology-layer-summary">{group.model === 'IaaS' ? 'Kto prevádzkuje výpočtový výkon, siete, storage a hostiteľské prostredia.' : group.model === 'PaaS' ? 'Ktoré platformy poskytujú databázy, identity, runtime, monitoring a cloudové funkcie.' : 'Ktoré aplikácie a služby používa organizácia a na akých platformách závisia.'}</div>
      <div className="technology-layer-list">{group.items.map(item => <button key={item.id} onClick={() => { setSelectedId(item.id); setTab('explorer') }}><span><strong>{item.name}</strong><small>{item.category} · {item.location}</small></span><Badge tone={evidenceTone(item.evidence)}>{item.evidence}</Badge></button>)}</div>
    </article>)}</section>}

    {tab === 'capacity' && <>
      <section className="technology-capacity-grid">{oitData.capacity.map(metric => <article className="panel" key={metric.name}><div className="panel-heading"><div><span className="eyebrow">DC VaV Žilina</span><h3>{metric.name}</h3></div><Badge tone={metric.percent > 80 ? 'danger' : metric.percent > 60 ? 'warning' : 'success'}>{metric.percent}%</Badge></div><strong className="technology-capacity-value">{metric.used}</strong><small>použité z {metric.total} · voľné {metric.free}</small><Progress value={metric.percent} label="Využitie"/></article>)}</section>
      <section className="technology-capacity-layout">
        <article className="panel"><div className="panel-heading"><div><span className="eyebrow">HPC infraštruktúra</span><h3>Výpočtové uzly DC VaV</h3></div><Badge tone="info">{oitData.hpc.length} skupín</Badge></div><div className="technology-hpc-list">{oitData.hpc.map(item => <span key={item}><Icon name="check" size={16}/>{item}</span>)}</div></article>
        <article className="panel"><div className="panel-heading"><div><span className="eyebrow">Inventár lokalít</span><h3>Rozsah technických podkladov</h3></div></div><div className="technology-inventory-stats"><span><b>{sourceSummary.dcRacks}</b><small>rackov DC VaV</small></span><span><b>{sourceSummary.dcDevices}</b><small>zariadení DC VaV</small></span><span><b>{sourceSummary.lamacskaRacks}</b><small>rackov Lamačská</small></span><span><b>{sourceSummary.lamacskaDevices}</b><small>zariadení Lamačská</small></span></div><p>Kapacitné hodnoty sú zdrojovým snapshotom, nie živou telemetriou. Pre aktuálne trendy bude neskôr vhodný import z VMware, Zabbix alebo SCOM.</p><button className="button button-secondary" onClick={() => go('oitDc')}>Otvoriť dátové centrá</button></article>
      </section>
    </>}

    {tab === 'licenses' && <section className="technology-license-layout">
      <article className="panel technology-license-register"><div className="panel-heading"><div><span className="eyebrow">Licencie a podpora</span><h3>Termíny evidované v CMDB</h3></div><Badge tone="info">{licenseItems.length}</Badge></div><div className="technology-license-list">{licenseItems.map(item => {
        const end = item.licenseEnd || item.supportEnd || item.contractEnd
        const stateInfo = dateState(end)
        const service = state.services.find(candidate => candidate.id === item.serviceId)
        return <button key={item.id} onClick={() => { const catalogItem = items.find(candidate => candidate.cmdbIds.includes(item.id)); if (catalogItem) setSelectedId(catalogItem.id); setTab('explorer') }}><span className="technology-license-icon"><Icon name="lock" size={18}/></span><span><strong>{item.name}</strong><small>{item.version || item.category} · {service?.name || 'bez služby'}</small></span><Badge tone={stateInfo.tone}>{stateInfo.label}</Badge></button>
      })}</div>{!licenseItems.length && <Empty title="Licencie nie sú evidované" text="Doplňte licenčné a podporné dátumy v CMDB."/>}</article>
      <aside className="panel technology-license-gaps"><div className="panel-heading"><div><span className="eyebrow">Ďalšie produkty</span><h3>Softvér bez licenčného detailu</h3></div><Badge tone="warning">na doplnenie</Badge></div>{oitData.serverSoftwareCatalog.map(group => <div key={group.category}><strong>{group.category}</strong><span>{group.items.join(' · ')}</span></div>)}<p>Zdrojový katalóg potvrdzuje používané produkty, ale neobsahuje počty licencií, náklady, zmluvy ani dátumy obnovy. Tieto údaje treba doplniť do CMDB.</p></aside>
    </section>}

    {tab === 'impact' && selected && impact && <section className="technology-impact-layout">
      <article className="panel technology-impact-selector"><div className="panel-heading"><div><span className="eyebrow">Simulátor výpadku</span><h3>Vyberte technológiu</h3></div><Badge tone={impact.score >= 70 ? 'danger' : impact.score >= 40 ? 'warning' : 'info'}>{impact.score}/100</Badge></div><label className="field"><span>Technologická položka</span><select value={selected.id} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedId(event.target.value)}>{items.map(item => <option value={item.id} key={item.id}>{item.model} · {item.name}</option>)}</select></label><div className="technology-impact-score"><strong>{impact.score}</strong><span><b>Odhadovaný blast radius</b><small>Skóre je odvodené z kritickosti služieb, počtu CMDB väzieb a ITSM udalostí.</small></span></div><div className="technology-impact-summary"><span><b>{impact.services.length}</b>služieb</span><span><b>{impact.critical}</b>kritických</span><span><b>{impact.cmdb.length}</b>CMDB položiek</span><span><b>{impact.problems.length}</b>problémov</span></div></article>
      <article className="panel technology-impact-chain"><div className="panel-heading"><div><span className="eyebrow">Dopadový reťazec</span><h3>{selected.name}</h3></div><Badge tone={evidenceTone(selected.evidence)}>{selected.evidence}</Badge></div><div className="technology-impact-path"><span><Icon name="database"/><b>{selected.location}</b><small>lokalita</small></span><i><Icon name="arrow"/></i><span><Icon name="systems"/><b>{selected.platform}</b><small>platforma</small></span><i><Icon name="arrow"/></i><span><Icon name="services"/><b>{impact.services.length} služieb</b><small>aplikačný dopad</small></span><i><Icon name="arrow"/></i><span><Icon name="helpdesk"/><b>{impact.tickets.length + impact.problems.length + impact.changes.length} udalostí</b><small>ITSM väzby</small></span></div>
        <div className="technology-impact-sections"><section><h4>Dotknuté služby</h4>{impact.services.map(service => <button key={service.id} onClick={() => go('services')}><strong>{service.name}</strong><Badge tone={service.criticality === 'Kritická' ? 'danger' : service.criticality === 'Vysoká' ? 'warning' : 'info'}>{service.criticality}</Badge></button>)}{!impact.services.length && <p>Nie je potvrdená konkrétna služba.</p>}</section><section><h4>CMDB a hostitelia</h4>{impact.cmdb.map(cmdb => <button key={cmdb.id} onClick={() => go('cmdb')}><strong>{cmdb.name}</strong><small>{cmdb.type} · {cmdb.hostname || cmdb.location}</small></button>)}{!impact.cmdb.length && selected.serverHints.map(server => <span key={server}><strong>{server}</strong><small>serverová väzba zo zdroja</small></span>)}</section><section><h4>ITSM udalosti</h4><span><b>{impact.tickets.length}</b> incidentov a požiadaviek</span><span><b>{impact.problems.length}</b> problémov</span><span><b>{impact.changes.length}</b> zmien</span></section><section><h4>Zdrojové architektonické väzby</h4>{records.map(record => <span key={record.id}><strong>{record.title}</strong><small>{record.evidence}</small></span>)}{!records.length && <p>Bez samostatného architektonického záznamu.</p>}</section></div>
      </article>
    </section>}
  </>
}
