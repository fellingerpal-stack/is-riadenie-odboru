import { useMemo, useState, type ChangeEvent } from 'react'
import { Badge, Empty, Field, Icon, Modal, PageHeader, Progress } from '../components/UI'
import { buildArchitectureItems, oitPeopleById, type ArchitectureItem, type ArchitectureCatalogRecord } from '../data/serviceArchitecture'
import type { AppState, ServiceArchitectureRecord } from '../types'

type Go = (view: string) => void
type Perspective = 'oris' | 'oit'
type Tab = 'map' | 'dependencies' | 'locations' | 'gaps'

function confidenceTone(value: string): 'success' | 'info' | 'warning' {
  if (value === 'Potvrdené zo zdrojov') return 'success'
  if (value === 'Čiastočne potvrdené') return 'info'
  return 'warning'
}

function locationKey(item: ArchitectureItem) {
  const value = item.record?.runtimeLocation.toLowerCase() || ''
  if (value.includes('žilina')) return 'DC VaV Žilina'
  if (value.includes('lamač')) return 'Lamačská cesta'
  if (value.includes('saas') || value.includes('cloud')) return 'Cloud / SaaS'
  if (value.includes('nti') || value.includes('pracovisko')) return 'Pracoviská CVTI SR'
  return 'Lokalita na potvrdenie'
}

function csv(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function listText(values: string[]) {
  return values.join('\n')
}

function textList(value: string) {
  return Array.from(new Set(value.split(/[\n,;]+/).map(part => part.trim()).filter(Boolean)))
}

function cloneRecord(record: ArchitectureCatalogRecord): ServiceArchitectureRecord {
  return {
    ...record,
    serviceIds: [...record.serviceIds],
    projectIds: [...record.projectIds],
    aliases: [...record.aliases],
    oitProjects: [...record.oitProjects],
    serverHints: [...record.serverHints],
    networkDependencies: [...record.networkDependencies],
    oitDomains: [...record.oitDomains],
    oitOwnerIds: [...record.oitOwnerIds],
  }
}

function newRecordFor(item: ArchitectureItem): ServiceArchitectureRecord {
  return {
    id: item.service ? `custom-service-${item.service.id}` : item.project ? `custom-project-${item.project.id}` : `custom-${crypto.randomUUID()}`,
    title: item.name,
    serviceIds: item.service ? [item.service.id] : [],
    projectIds: item.project ? [item.project.id] : [],
    aliases: [item.name],
    businessLayer: item.service?.category || 'Aplikačná alebo projektová služba',
    oitProjects: [],
    runtimeLocation: 'Na potvrdenie',
    environment: 'Produkcia – rozsah potvrdiť',
    platform: 'Technická platforma na potvrdenie',
    serverHints: [],
    networkDependencies: [],
    monitoring: 'Doplniť.',
    backup: 'Doplniť.',
    continuity: 'Doplniť technickú topológiu, RTO/RPO, vlastníka a zastupiteľnosť.',
    oitDomains: [],
    oitOwnerIds: [],
    confidence: 'Na potvrdenie',
    evidence: 'Manuálne doplnené v aplikácii',
    note: '',
  }
}

export default function ServiceArchitecture({
  state,
  go,
  perspective,
  canEdit,
  currentUser,
  onArchitectureChange,
}: {
  state: AppState
  go: Go
  perspective: Perspective
  canEdit: boolean
  currentUser: string
  onArchitectureChange: (records: ServiceArchitectureRecord[]) => void
}) {
  const [tab, setTab] = useState<Tab>('map')
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('all')
  const [editing, setEditing] = useState<ServiceArchitectureRecord | null>(null)
  const items = useMemo(() => buildArchitectureItems(state), [state])
  const locations = useMemo(() => Array.from(new Set(items.map(locationKey))).sort((a, b) => a.localeCompare(b, 'sk')), [items])
  const filtered = items.filter(item => (location === 'all' || locationKey(item) === location) && `${item.name} ${item.record?.title || ''} ${item.record?.runtimeLocation || ''} ${item.record?.platform || ''} ${item.record?.oitProjects.join(' ') || ''}`.toLowerCase().includes(query.toLowerCase()))
  const mapped = items.filter(item => item.record)
  const confirmed = items.filter(item => item.record?.confidence === 'Potvrdené zo zdrojov')
  const gaps = items.filter(item => item.missing.length)
  const linkedCmdb = new Set(items.flatMap(item => item.cmdb.map(ci => ci.id))).size
  const locationGroups = locations.map(name => ({ name, items: items.filter(item => locationKey(item) === name) }))
  const title = perspective === 'oris' ? 'Architektúra služieb a závislostí ORIS' : 'Spoločná architektúra ORIS a OIT'
  const eyebrow = perspective === 'oris' ? 'Odbor 3.2 · architektúra služieb' : 'Odbor 3.1 · technická architektúra'
  const overrideIds = useMemo(() => new Set((state.architectureOverrides || []).map(record => record.id)), [state.architectureOverrides])

  function exportCsv() {
    const rows = [['Typ', 'Služba alebo projekt', 'OIT zdroj', 'Lokalita', 'Platforma', 'Sieťové závislosti', 'Monitoring', 'Zálohovanie', 'OIT vlastníci', 'Dôveryhodnosť', 'Chýbajúce údaje'], ...items.map(item => [item.kind, item.name, item.record?.oitProjects.join('; ') || '', item.record?.runtimeLocation || '', item.record?.platform || '', item.record?.networkDependencies.join('; ') || '', item.record?.monitoring || '', item.record?.backup || '', item.record?.oitOwnerIds.map(id => oitPeopleById[id] || id).join('; ') || '', item.record?.confidence || 'Bez mapovania', item.missing.join('; ')])]
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(csv).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'architektura-sluzieb-cvti.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function openEdit(item: ArchitectureItem) {
    if (!canEdit) return
    setEditing(item.record ? cloneRecord(item.record) : newRecordFor(item))
  }

  function updateEditing<K extends keyof ServiceArchitectureRecord>(key: K, value: ServiceArchitectureRecord[K]) {
    setEditing(current => current ? { ...current, [key]: value } : current)
  }

  function saveEditing() {
    if (!editing) return
    const record: ServiceArchitectureRecord = {
      ...editing,
      title: editing.title.trim() || 'Bez názvu',
      aliases: Array.from(new Set([...editing.aliases, editing.title].map(value => value.trim()).filter(Boolean))),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser,
    }
    const next = [...(state.architectureOverrides || []).filter(item => item.id !== record.id), record]
    onArchitectureChange(next)
    setEditing(null)
  }

  function resetEditing() {
    if (!editing) return
    onArchitectureChange((state.architectureOverrides || []).filter(item => item.id !== editing.id))
    setEditing(null)
  }

  return <>
    <PageHeader eyebrow={eyebrow} title={title} description="Jednotný pohľad prepája služby a projekty odboru 3.2 s technickou prevádzkou odboru 3.1: lokalitou, platformou, servermi, sieťou, monitoringom, zálohovaním, CMDB a ITSM udalosťami." actions={<button className="button button-secondary" onClick={exportCsv}><Icon name="download" size={17}/> Export CSV</button>}/>
    <div className="architecture-source-note"><Icon name="warning" size={19}/><div><strong>Zdrojový architektonický pohľad</strong><span>Technické väzby sú zostavené z dostupných inventárov, RACI OIT, reportu dátového centra a registrov aplikácie. Oprávnený používateľ ich môže doplniť priamo v kartách; úpravy sa ukladajú do spoločného snapshotu a premietnu sa aj do Technologického katalógu.</span></div></div>
    <section className="architecture-kpis">
      <article><span>SLUŽBY A PROJEKTY</span><strong>{items.length}</strong><small>{mapped.length} má technické mapovanie</small></article>
      <article><span>ZDROJOVO POTVRDENÉ</span><strong>{confirmed.length}</strong><small>väzba má konkrétny OIT podklad</small></article>
      <article><span>CMDB VÄZBY</span><strong>{linkedCmdb}</strong><small>rozpoznané aktíva v spoločnom registri</small></article>
      <article><span>OTVORENÉ MEDZERY</span><strong>{gaps.length}</strong><small>lokalita, monitoring, záloha alebo vlastník</small></article>
    </section>
    <div className="view-tabs architecture-tabs" role="tablist" aria-label="Architektonické pohľady">
      <button type="button" role="tab" aria-selected={tab === 'map'} className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}><Icon name="dashboard"/> Mapa služieb <b>{items.length}</b></button>
      <button type="button" role="tab" aria-selected={tab === 'dependencies'} className={tab === 'dependencies' ? 'active' : ''} onClick={() => setTab('dependencies')}><Icon name="substitute"/> Závislosti <b>{mapped.length}</b></button>
      <button type="button" role="tab" aria-selected={tab === 'locations'} className={tab === 'locations' ? 'active' : ''} onClick={() => setTab('locations')}><Icon name="database"/> Lokality <b>{locations.length}</b></button>
      <button type="button" role="tab" aria-selected={tab === 'gaps'} className={tab === 'gaps' ? 'active' : ''} onClick={() => setTab('gaps')}><Icon name="risk"/> Medzery <b>{gaps.length}</b></button>
    </div>

    {tab === 'map' && <>
      <div className="filter-panel architecture-filter"><label><span>Vyhľadávanie</span><div className="search-input"><Icon name="search" size={17}/><input value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="CRZP, KOMIS, DALV, ISS, lokalita, server alebo platforma..."/></div></label><label><span>Lokalita</span><select value={location} onChange={(event: ChangeEvent<HTMLSelectElement>) => setLocation(event.target.value)}><option value="all">Všetky lokality</option>{locations.map(value => <option key={value}>{value}</option>)}</select></label><span className="result-pill">{filtered.length} položiek</span></div>
      <section className="architecture-card-grid">{filtered.map(item => <article className="panel architecture-card" key={item.key}>
        <div className="architecture-card-head"><span className="architecture-kind"><Icon name={item.kind === 'Služba' ? 'services' : 'projects'} size={18}/></span><div><small>{item.kind} · {item.record?.businessLayer || 'Technické mapovanie chýba'}</small><h3>{item.name}</h3></div><div className="architecture-card-badges"><Badge tone={item.record ? confidenceTone(item.record.confidence) : 'warning'}>{item.record?.confidence || 'Bez mapovania'}</Badge>{item.record && overrideIds.has(item.record.id) && <Badge tone="purple">upravené</Badge>}</div></div>
        <div className="architecture-location"><Icon name="database" size={17}/><span><strong>{item.record?.runtimeLocation || 'Lokalita na potvrdenie'}</strong><small>{item.record?.environment || 'Prostredie neurčené'}</small></span></div>
        <p>{item.record?.platform || 'Pre túto položku ešte nie je priradená technická platforma OIT.'}</p>
        <Progress value={item.completeness} label="Úplnosť architektonických údajov"/>
        <div className="architecture-pill-row"><span><b>{item.record?.oitProjects.length || 0}</b> OIT zdrojov</span><span><b>{item.cmdb.length}</b> CMDB</span><span><b>{item.tickets.length}</b> ticketov</span><span><b>{item.problems.length}</b> problémov</span><span><b>{item.changes.length}</b> zmien</span></div>
        {item.record && <div className="architecture-owners"><small>Technické domény a odporúčaní vlastníci</small><div>{item.record.oitDomains.map(value => <span key={value}>{value}</span>)}</div><div>{item.record.oitOwnerIds.map(id => <b key={id}>{id} · {oitPeopleById[id] || id}</b>)}</div>{item.record.updatedAt && <small className="architecture-updated">Upravil {item.record.updatedBy || 'používateľ'} · {new Date(item.record.updatedAt).toLocaleString('sk-SK')}</small>}</div>}
        <div className="architecture-card-actions">{canEdit && <button className="architecture-edit-action" onClick={() => openEdit(item)}><Icon name="edit" size={15}/>Upraviť mapovanie</button>}<button onClick={() => go('services')}><Icon name="services" size={15}/>Služby</button><button onClick={() => go('cmdb')}><Icon name="cmdb" size={15}/>CMDB</button><button onClick={() => go(perspective === 'oit' ? 'oitRelations' : 'oitArchitecture')}><Icon name="substitute" size={15}/>{perspective === 'oit' ? 'Prevádzkové väzby' : 'Technický pohľad'}</button></div>
      </article>)}</section>
      {!filtered.length && <Empty title="Bez výsledkov" text="Zmeňte vyhľadávanie alebo filter lokality."/>}
    </>}

    {tab === 'dependencies' && <section className="panel architecture-dependency-panel"><div className="panel-heading"><div><span className="eyebrow">End-to-end závislosti</span><h3>Od služby po technickú prevádzku</h3></div><Badge tone="info">{items.length} reťazcov</Badge></div><div className="architecture-table-shell"><table className="architecture-table"><thead><tr><th>Služba / projekt</th><th>OIT systém</th><th>Lokalita</th><th>Platforma / servery</th><th>Monitoring</th><th>Zálohovanie</th><th>ITSM</th></tr></thead><tbody>{items.map(item => <tr key={item.key}><td><small>{item.kind}</small><strong>{item.name}</strong>{item.record && <Badge tone={confidenceTone(item.record.confidence)}>{item.record.confidence}</Badge>}</td><td>{item.record?.oitProjects.length ? item.record.oitProjects.join(' · ') : <em>nepriradené</em>}</td><td>{item.record?.runtimeLocation || <em>na potvrdenie</em>}</td><td><strong>{item.record?.platform || '—'}</strong>{item.record?.serverHints.length ? <small>{item.record.serverHints.join(' · ')}</small> : null}</td><td>{item.record?.monitoring || '—'}</td><td>{item.record?.backup || '—'}</td><td><span className="architecture-itsm-counts"><b>{item.cmdb.length} CI</b><b>{item.tickets.length} INC/REQ</b><b>{item.problems.length} PRB</b><b>{item.changes.length} CHG</b></span></td></tr>)}</tbody></table></div></section>}

    {tab === 'locations' && <section className="architecture-location-grid">{locationGroups.map(group => <article className="panel" key={group.name}><div className="panel-heading"><div><span className="eyebrow">Prevádzková lokalita</span><h3>{group.name}</h3></div><Badge tone={group.name.includes('potvrdenie') ? 'warning' : 'info'}>{group.items.length}</Badge></div><div className="architecture-location-list">{group.items.map(item => <div key={item.key}><span><Icon name={item.kind === 'Služba' ? 'services' : 'projects'} size={17}/></span><div><strong>{item.name}</strong><small>{item.record?.platform || 'Technická platforma na potvrdenie'}</small></div><Badge tone={item.missing.length ? 'warning' : 'success'}>{item.missing.length ? `${item.missing.length} medzery` : 'pokryté'}</Badge></div>)}</div>{group.name === 'DC VaV Žilina' && <button className="button button-secondary button-small" onClick={() => go('oitDc')}>Otvoriť DC VaV Žilina</button>}{group.name === 'Lamačská cesta' && <button className="button button-secondary button-small" onClick={() => go('oitDc')}>Otvoriť Lamačskú</button>}</article>)}</section>}

    {tab === 'gaps' && <section className="architecture-gap-layout"><article className="panel"><div className="panel-heading"><div><span className="eyebrow">Otvorené architektonické medzery</span><h3>Položky vyžadujúce potvrdenie</h3></div><Badge tone="warning">{gaps.length}</Badge></div><div className="architecture-gap-list">{gaps.map(item => <div key={item.key}><span><Icon name="warning" size={17}/></span><div><strong>{item.name}</strong><small>{item.record?.evidence || 'Bez technického zdroja'}</small></div><Badge tone="warning">{item.missing.join(', ')}</Badge>{canEdit && <button className="icon-button" title="Upraviť mapovanie" onClick={() => openEdit(item)}><Icon name="edit" size={16}/></button>}</div>)}</div>{!gaps.length && <Empty title="Bez otvorených medzier" text="Všetky služby majú základnú technickú mapu."/>}</article><aside className="panel architecture-actions-panel"><div className="panel-heading"><div><span className="eyebrow">Odporúčaný postup</span><h3>Ako údaje potvrdiť</h3></div></div><ol><li>Priradiť jednoznačné ID služby a systému.</li><li>Potvrdiť produkčnú lokalitu, platformu a konkrétne CMDB položky.</li><li>Doplniť aplikačného a infraštruktúrneho vlastníka.</li><li>Zapísať monitoring, zálohovanie, RTO/RPO a posledný test obnovy.</li><li>Prepojiť incidenty, problémy a zmeny cez rovnaké serviceId.</li></ol><button className="button button-primary" onClick={() => go('services')}>Otvoriť služby</button><button className="button button-secondary" onClick={() => go('cmdb')}>Otvoriť CMDB</button></aside></section>}

    {editing && <Modal wide title={`Upraviť architektúru: ${editing.title}`} onClose={() => setEditing(null)}>
      <div className="architecture-edit-note"><Icon name="database" size={18}/><span>Úprava sa uloží do spoločného snapshotu aplikácie. Zdrojový katalóg zostane zachovaný a manuálne údaje ho pre túto položku prekryjú.</span></div>
      <div className="form-grid architecture-edit-form">
        <Field label="Názov mapovania"><input value={editing.title} onChange={event => updateEditing('title', event.target.value)}/></Field>
        <Field label="Biznis vrstva"><input value={editing.businessLayer} onChange={event => updateEditing('businessLayer', event.target.value)}/></Field>
        <Field label="Prevádzková lokalita"><input value={editing.runtimeLocation} onChange={event => updateEditing('runtimeLocation', event.target.value)} placeholder="DC VaV Žilina, Lamačská cesta, cloud..."/></Field>
        <Field label="Prostredie"><input value={editing.environment} onChange={event => updateEditing('environment', event.target.value)} placeholder="Produkcia, test, vývoj..."/></Field>
        <div className="architecture-edit-full"><Field label="Technická platforma"><textarea rows={3} value={editing.platform} onChange={event => updateEditing('platform', event.target.value)}/></Field></div>
        <Field label="OIT systémy / projekty – jeden na riadok"><textarea rows={4} value={listText(editing.oitProjects)} onChange={event => updateEditing('oitProjects', textList(event.target.value))}/></Field>
        <Field label="Servery / hostname – jeden na riadok"><textarea rows={4} value={listText(editing.serverHints)} onChange={event => updateEditing('serverHints', textList(event.target.value))}/></Field>
        <Field label="Sieťové závislosti – jedna na riadok"><textarea rows={4} value={listText(editing.networkDependencies)} onChange={event => updateEditing('networkDependencies', textList(event.target.value))}/></Field>
        <Field label="Technické domény OIT – jedna na riadok"><textarea rows={4} value={listText(editing.oitDomains)} onChange={event => updateEditing('oitDomains', textList(event.target.value))}/></Field>
        <Field label="Monitoring"><textarea rows={3} value={editing.monitoring} onChange={event => updateEditing('monitoring', event.target.value)}/></Field>
        <Field label="Zálohovanie"><textarea rows={3} value={editing.backup} onChange={event => updateEditing('backup', event.target.value)}/></Field>
        <div className="architecture-edit-full"><Field label="Kontinuita / RTO / RPO"><textarea rows={3} value={editing.continuity} onChange={event => updateEditing('continuity', event.target.value)}/></Field></div>
        <Field label="OIT vlastníci – ID oddelené čiarkou"><input value={editing.oitOwnerIds.join(', ')} onChange={event => updateEditing('oitOwnerIds', textList(event.target.value))} placeholder="JL, ŠK, PM..."/><small>{Object.entries(oitPeopleById).map(([id, name]) => `${id} ${name}`).join(' · ')}</small></Field>
        <Field label="Úroveň potvrdenia"><select value={editing.confidence} onChange={event => updateEditing('confidence', event.target.value as ServiceArchitectureRecord['confidence'])}><option>Potvrdené zo zdrojov</option><option>Čiastočne potvrdené</option><option>Na potvrdenie</option></select></Field>
        <Field label="Zdroj / evidencia"><textarea rows={3} value={editing.evidence} onChange={event => updateEditing('evidence', event.target.value)}/></Field>
        <Field label="Poznámka"><textarea rows={3} value={editing.note} onChange={event => updateEditing('note', event.target.value)}/></Field>
      </div>
      <div className="modal-actions architecture-edit-actions">{overrideIds.has(editing.id) && <button className="button button-danger" onClick={resetEditing}>Obnoviť zdrojové údaje</button>}<span/><button className="button button-secondary" onClick={() => setEditing(null)}>Zrušiť</button><button className="button button-primary" onClick={saveEditing}><Icon name="check" size={16}/> Uložiť mapovanie</button></div>
    </Modal>}
  </>
}
