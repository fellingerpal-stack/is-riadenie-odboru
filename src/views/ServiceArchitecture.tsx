import { useMemo, useState, type ChangeEvent } from 'react'
import { Badge, Empty, Icon, PageHeader, Progress } from '../components/UI'
import { buildArchitectureItems, oitPeopleById, type ArchitectureItem } from '../data/serviceArchitecture'
import type { AppState } from '../types'

type Go=(view:string)=>void
type Perspective='oris'|'oit'
type Tab='map'|'dependencies'|'locations'|'gaps'

function confidenceTone(value:string):'success'|'info'|'warning' {
  if(value==='Potvrdené zo zdrojov')return 'success'
  if(value==='Čiastočne potvrdené')return 'info'
  return 'warning'
}
function locationKey(item:ArchitectureItem){
  const value=item.record?.runtimeLocation.toLowerCase()||''
  if(value.includes('žilina'))return 'DC VaV Žilina'
  if(value.includes('lamač'))return 'Lamačská cesta'
  if(value.includes('saas')||value.includes('cloud'))return 'Cloud / SaaS'
  if(value.includes('nti')||value.includes('pracovisko'))return 'Pracoviská CVTI SR'
  return 'Lokalita na potvrdenie'
}
function csv(value:unknown){return `"${String(value??'').replaceAll('"','""')}"`}

export default function ServiceArchitecture({state,go,perspective}:{state:AppState;go:Go;perspective:Perspective}){
  const [tab,setTab]=useState<Tab>('map')
  const [query,setQuery]=useState('')
  const [location,setLocation]=useState('all')
  const items=useMemo(()=>buildArchitectureItems(state),[state])
  const locations=useMemo(()=>Array.from(new Set(items.map(locationKey))).sort((a,b)=>a.localeCompare(b,'sk')),[items])
  const filtered=items.filter(item=>(location==='all'||locationKey(item)===location)&&`${item.name} ${item.record?.title||''} ${item.record?.runtimeLocation||''} ${item.record?.platform||''} ${item.record?.oitProjects.join(' ')||''}`.toLowerCase().includes(query.toLowerCase()))
  const mapped=items.filter(item=>item.record)
  const confirmed=items.filter(item=>item.record?.confidence==='Potvrdené zo zdrojov')
  const gaps=items.filter(item=>item.missing.length)
  const linkedCmdb=new Set(items.flatMap(item=>item.cmdb.map(ci=>ci.id))).size
  const locationGroups=locations.map(name=>({name,items:items.filter(item=>locationKey(item)===name)}))
  const title=perspective==='oris'?'Architektúra služieb a závislostí ORIS':'Spoločná architektúra ORIS a OIT'
  const eyebrow=perspective==='oris'?'Odbor 3.2 · architektúra služieb':'Odbor 3.1 · technická architektúra'

  function exportCsv(){
    const rows=[['Typ','Služba alebo projekt','OIT zdroj','Lokalita','Platforma','Sieťové závislosti','Monitoring','Zálohovanie','OIT vlastníci','Dôveryhodnosť','Chýbajúce údaje'],...items.map(item=>[item.kind,item.name,item.record?.oitProjects.join('; ')||'',item.record?.runtimeLocation||'',item.record?.platform||'',item.record?.networkDependencies.join('; ')||'',item.record?.monitoring||'',item.record?.backup||'',item.record?.oitOwnerIds.map(id=>oitPeopleById[id]||id).join('; ')||'',item.record?.confidence||'Bez mapovania',item.missing.join('; ')])]
    const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(csv).join(';')).join('\n')],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='architektura-sluzieb-cvti.csv';a.click();URL.revokeObjectURL(url)
  }

  return <>
    <PageHeader eyebrow={eyebrow} title={title} description="Jednotný pohľad prepája služby a projekty odboru 3.2 s technickou prevádzkou odboru 3.1: lokalitou, platformou, servermi, sieťou, monitoringom, zálohovaním, CMDB a ITSM udalosťami." actions={<button className="button button-secondary" onClick={exportCsv}><Icon name="download" size={17}/> Export CSV</button>}/>
    <div className="architecture-source-note"><Icon name="warning" size={19}/><div><strong>Zdrojový architektonický pohľad</strong><span>Technické väzby sú zostavené z dostupných inventárov, RACI OIT, reportu dátového centra a registrov aplikácie. Označenie „Na potvrdenie“ nie je produkčne potvrdený fakt a má byť doplnené vlastníkom služby.</span></div></div>
    <section className="architecture-kpis">
      <article><span>SLUŽBY A PROJEKTY</span><strong>{items.length}</strong><small>{mapped.length} má technické mapovanie</small></article>
      <article><span>ZDROJOVO POTVRDENÉ</span><strong>{confirmed.length}</strong><small>väzba má konkrétny OIT podklad</small></article>
      <article><span>CMDB VÄZBY</span><strong>{linkedCmdb}</strong><small>rozpoznané aktíva v spoločnom registri</small></article>
      <article><span>OTVORENÉ MEDZERY</span><strong>{gaps.length}</strong><small>lokalita, monitoring, záloha alebo vlastník</small></article>
    </section>
    <div className="view-tabs architecture-tabs"><button className={tab==='map'?'active':''} onClick={()=>setTab('map')}><Icon name="dashboard"/> Mapa služieb</button><button className={tab==='dependencies'?'active':''} onClick={()=>setTab('dependencies')}><Icon name="substitute"/> Závislosti</button><button className={tab==='locations'?'active':''} onClick={()=>setTab('locations')}><Icon name="database"/> Lokality</button><button className={tab==='gaps'?'active':''} onClick={()=>setTab('gaps')}><Icon name="risk"/> Medzery <b>{gaps.length}</b></button></div>

    {tab==='map'&&<>
      <div className="filter-panel architecture-filter"><label><span>Vyhľadávanie</span><div className="search-input"><Icon name="search" size={17}/><input value={query} onChange={(e:ChangeEvent<HTMLInputElement>)=>setQuery(e.target.value)} placeholder="CRZP, KOMIS, ISS, lokalita, server alebo platforma..."/></div></label><label><span>Lokalita</span><select value={location} onChange={(e:ChangeEvent<HTMLSelectElement>)=>setLocation(e.target.value)}><option value="all">Všetky lokality</option>{locations.map(value=><option key={value}>{value}</option>)}</select></label><span className="result-pill">{filtered.length} položiek</span></div>
      <section className="architecture-card-grid">{filtered.map(item=><article className="panel architecture-card" key={item.key}>
        <div className="architecture-card-head"><span className="architecture-kind"><Icon name={item.kind==='Služba'?'services':'projects'} size={18}/></span><div><small>{item.kind} · {item.record?.businessLayer||'Technické mapovanie chýba'}</small><h3>{item.name}</h3></div><Badge tone={item.record?confidenceTone(item.record.confidence):'warning'}>{item.record?.confidence||'Bez mapovania'}</Badge></div>
        <div className="architecture-location"><Icon name="database" size={17}/><span><strong>{item.record?.runtimeLocation||'Lokalita na potvrdenie'}</strong><small>{item.record?.environment||'Prostredie neurčené'}</small></span></div>
        <p>{item.record?.platform||'Pre túto položku ešte nie je priradená technická platforma OIT.'}</p>
        <Progress value={item.completeness} label="Úplnosť architektonických údajov"/>
        <div className="architecture-pill-row"><span><b>{item.record?.oitProjects.length||0}</b> OIT zdrojov</span><span><b>{item.cmdb.length}</b> CMDB</span><span><b>{item.tickets.length}</b> ticketov</span><span><b>{item.problems.length}</b> problémov</span><span><b>{item.changes.length}</b> zmien</span></div>
        {item.record&&<div className="architecture-owners"><small>Technické domény a odporúčaní vlastníci</small><div>{item.record.oitDomains.map(value=><span key={value}>{value}</span>)}</div><div>{item.record.oitOwnerIds.map(id=><b key={id}>{id} · {oitPeopleById[id]||id}</b>)}</div></div>}
        <div className="architecture-card-actions"><button onClick={()=>go('services')}><Icon name="services" size={15}/>Služby</button><button onClick={()=>go('cmdb')}><Icon name="cmdb" size={15}/>CMDB</button><button onClick={()=>go(perspective==='oit'?'oitRelations':'oitArchitecture')}><Icon name="substitute" size={15}/>{perspective==='oit'?'Prevádzkové väzby':'Technický pohľad'}</button></div>
      </article>)}</section>
      {!filtered.length&&<Empty title="Bez výsledkov" text="Zmeňte vyhľadávanie alebo filter lokality."/>}
    </>}

    {tab==='dependencies'&&<section className="panel architecture-dependency-panel"><div className="panel-heading"><div><span className="eyebrow">End-to-end závislosti</span><h3>Od služby po technickú prevádzku</h3></div><Badge tone="info">{items.length} reťazcov</Badge></div><div className="architecture-table-shell"><table className="architecture-table"><thead><tr><th>Služba / projekt</th><th>OIT systém</th><th>Lokalita</th><th>Platforma / servery</th><th>Monitoring</th><th>Zálohovanie</th><th>ITSM</th></tr></thead><tbody>{items.map(item=><tr key={item.key}><td><small>{item.kind}</small><strong>{item.name}</strong>{item.record&&<Badge tone={confidenceTone(item.record.confidence)}>{item.record.confidence}</Badge>}</td><td>{item.record?.oitProjects.length?item.record.oitProjects.join(' · '):<em>nepriradené</em>}</td><td>{item.record?.runtimeLocation||<em>na potvrdenie</em>}</td><td><strong>{item.record?.platform||'—'}</strong>{item.record?.serverHints.length?<small>{item.record.serverHints.join(' · ')}</small>:null}</td><td>{item.record?.monitoring||'—'}</td><td>{item.record?.backup||'—'}</td><td><span className="architecture-itsm-counts"><b>{item.cmdb.length} CI</b><b>{item.tickets.length} INC/REQ</b><b>{item.problems.length} PRB</b><b>{item.changes.length} CHG</b></span></td></tr>)}</tbody></table></div></section>}

    {tab==='locations'&&<section className="architecture-location-grid">{locationGroups.map(group=><article className="panel" key={group.name}><div className="panel-heading"><div><span className="eyebrow">Prevádzková lokalita</span><h3>{group.name}</h3></div><Badge tone={group.name.includes('potvrdenie')?'warning':'info'}>{group.items.length}</Badge></div><div className="architecture-location-list">{group.items.map(item=><div key={item.key}><span><Icon name={item.kind==='Služba'?'services':'projects'} size={17}/></span><div><strong>{item.name}</strong><small>{item.record?.platform||'Technická platforma na potvrdenie'}</small></div><Badge tone={item.missing.length?'warning':'success'}>{item.missing.length?`${item.missing.length} medzery`:'pokryté'}</Badge></div>)}</div>{group.name==='DC VaV Žilina'&&<button className="button button-secondary button-small" onClick={()=>go('oitDc')}>Otvoriť DC VaV Žilina</button>}{group.name==='Lamačská cesta'&&<button className="button button-secondary button-small" onClick={()=>go('oitDc')}>Otvoriť Lamačskú</button>}</article>)}</section>}

    {tab==='gaps'&&<section className="architecture-gap-layout"><article className="panel"><div className="panel-heading"><div><span className="eyebrow">Otvorené architektonické medzery</span><h3>Položky vyžadujúce potvrdenie</h3></div><Badge tone="warning">{gaps.length}</Badge></div><div className="architecture-gap-list">{gaps.map(item=><div key={item.key}><span><Icon name="warning" size={17}/></span><div><strong>{item.name}</strong><small>{item.record?.evidence||'Bez technického zdroja'}</small></div><Badge tone="warning">{item.missing.join(', ')}</Badge></div>)}</div>{!gaps.length&&<Empty title="Bez otvorených medzier" text="Všetky služby majú základnú technickú mapu."/>}</article><aside className="panel architecture-actions-panel"><div className="panel-heading"><div><span className="eyebrow">Odporúčaný postup</span><h3>Ako údaje potvrdiť</h3></div></div><ol><li>Priradiť jednoznačné ID služby a systému.</li><li>Potvrdiť produkčnú lokalitu, platformu a konkrétne CMDB položky.</li><li>Doplniť aplikačného a infraštruktúrneho vlastníka.</li><li>Zapísať monitoring, zálohovanie, RTO/RPO a posledný test obnovy.</li><li>Prepojiť incidenty, problémy a zmeny cez rovnaké serviceId.</li></ol><button className="button button-primary" onClick={()=>go('services')}>Otvoriť služby</button><button className="button button-secondary" onClick={()=>go('cmdb')}>Otvoriť CMDB</button></aside></section>}
  </>
}
