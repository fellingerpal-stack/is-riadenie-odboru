import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Badge, Empty, Icon, Modal, PageHeader, Progress } from '../components/UI'
import { oitData, type OitRaciRow, type OitRackItem } from '../data/oitData'
import { loadOitTopologyDocuments } from '../lib/oitDocuments'

type Go=(view:string)=>void

function splitRoles(value:string){return value.split('/').map(x=>x.trim()).filter(Boolean)}
function roleCount(row:OitRaciRow,role:string){return Object.values(row.assignments).filter(value=>splitRoles(value).includes(role)).length}
function raciIssue(row:OitRaciRow){
  const a=roleCount(row,'A'), r=roleCount(row,'R')
  if(a===0)return 'Chýba A'
  if(a>1)return 'Viac A'
  if(r===0)return 'Chýba R'
  if(r===1)return 'Jediný R'
  return ''
}
function toneForRaci(value:string){
  if(value.includes('A')&&value.includes('R'))return 'raci-ar'
  if(value.includes('A'))return 'raci-a'
  if(value.includes('R'))return 'raci-r'
  if(value.includes('C'))return 'raci-c'
  if(value.includes('I'))return 'raci-i'
  return 'raci-empty'
}
function statusTone(status:string){
  const v=status.toLowerCase()
  if(v.includes('vypnut'))return 'danger' as const
  if(v.includes('zive')||v.includes('živ'))return 'success' as const
  if(v.includes('test')||v.includes('nasadz'))return 'warning' as const
  return 'neutral' as const
}

export function OitDashboard({go}:{go:Go}){
  const processes=oitData.raciAreas.reduce((sum,a)=>sum+a.rows.length,0)
  const activeDevices=oitData.rackInventory.filter(i=>i.device&&!i.device.toLowerCase().includes('voln')&&i.status.toLowerCase().includes('zive')).length
  const modules=[
    {view:'oitRaci',number:'01',title:'RACI a kompetencie',description:'Komplexná RACI matica OIT podľa konkrétnych pracovníkov, oblastí a procesov.',tags:[`${processes} procesov`,`${oitData.people.length} pracovníkov`,'Rizikové medzery'],icon:'matrix' as const,tone:'blue'},
    {view:'oitDc',number:'02',title:'Dátové centrum',description:'Kapacity DC VaV, rack inventár, zariadenia a podporné technológie.',tags:[`${new Set(oitData.rackInventory.map(i=>i.rack).filter(Boolean)).size} rackov`,`${activeDevices} živých zariadení`,'Kapacity'],icon:'database' as const,tone:'green'},
    {view:'oitNetwork',number:'03',title:'Sieťová architektúra',description:'Hlavná sieťová topológia a oddelený OOB pohľad pre prevádzku a diagnostiku.',tags:['Hlavná topológia','OOB','Bezpečnostná vrstva'],icon:'web' as const,tone:'purple'},
    {view:'oitSystems',number:'04',title:'Systémy a projekty',description:'Zdrojový register projektov a systémov prevádzkovaných v dátovom centre.',tags:[`${oitData.projects.length} položiek`,'Vyhľadávanie','Prevádzkový stav'],icon:'systems' as const,tone:'gold'},
    {view:'oitOperations',number:'05',title:'Prevádzka a riziká',description:'Non-IT technológie, servisný režim a zariadenia určené na obnovu alebo vyradenie.',tags:['UPS a napájanie','Chladenie','Životný cyklus'],icon:'risk' as const,tone:'red'},
  ]
  return <>
    <PageHeader eyebrow="OIT · manažérsky rozcestník" title="Riadenie odboru informačných technológií" description="Päť samostatných pohľadov vytvorených zo zdrojovej RACI matice, inventára dátového centra, prevádzkového reportu a sieťových topológií."/>
    <section className="oit-app-grid">{modules.map(m=><article className={`oit-app-card oit-tone-${m.tone}`} key={m.view}>
      <div className="oit-app-head"><div className="oit-app-icon"><Icon name={m.icon} size={24}/></div><span>APLIKÁCIA {m.number}</span></div>
      <h2>{m.title}</h2><p>{m.description}</p>
      <div className="oit-app-tags">{m.tags.map(t=><span key={t}>{t}</span>)}</div>
      <button onClick={()=>go(m.view)}>Otvoriť modul <Icon name="arrow" size={17}/></button>
    </article>)}</section>
  </>
}

export function OitRaci(){
  const [area,setArea]=useState('all')
  const [query,setQuery]=useState('')
  const [issue,setIssue]=useState('all')
  const [tab,setTab]=useState<'matrix'|'risks'|'people'>('matrix')
  const rows=useMemo(()=>oitData.raciAreas.flatMap(a=>a.rows.map(row=>({...row,areaId:a.id,areaTitle:a.title}))),[])
  const filtered=rows.filter(row=>(area==='all'||row.areaId===area)&&(issue==='all'||(issue==='ok'?!raciIssue(row):raciIssue(row)===issue))&&`${row.process} ${row.note} ${row.areaTitle}`.toLowerCase().includes(query.toLowerCase()))
  const issues=rows.filter(r=>raciIssue(r))
  const missingA=rows.filter(r=>roleCount(r,'A')===0).length
  const noR=rows.filter(r=>roleCount(r,'R')===0).length
  const singleR=rows.filter(r=>roleCount(r,'R')===1).length
  const accountable=oitData.people.map(p=>({person:p,count:rows.filter(r=>Object.entries(r.assignments).some(([id,v])=>id===p.id&&splitRoles(v).includes('A'))).length})).sort((a,b)=>b.count-a.count)
  return <>
    <PageHeader eyebrow="OIT · zodpovednosti" title="RACI OIT" description="Matica 79 procesov v ôsmich odborných oblastiach podľa konkrétnych pracovníkov."/>
    <section className="kpi-grid oit-kpi-grid">
      <article className="kpi-card"><span>PROCESY</span><strong>{rows.length}</strong><small>{oitData.raciAreas.length} odborných oblastí</small></article>
      <article className="kpi-card"><span>PRACOVNÍCI</span><strong>{oitData.people.length}</strong><small>konkrétne RACI roly</small></article>
      <article className="kpi-card"><span>RACI MEDZERY</span><strong>{issues.length}</strong><small>vrátane jediného R</small></article>
      <article className="kpi-card"><span>BEZ VYKONÁVATEĽA</span><strong>{noR}</strong><small>procesy bez roly R</small></article>
    </section>
    <div className="view-tabs oit-tabs"><button className={tab==='matrix'?'active':''} onClick={()=>setTab('matrix')}><Icon name="matrix"/> Matica</button><button className={tab==='risks'?'active':''} onClick={()=>setTab('risks')}><Icon name="risk"/> Riziká a medzery <b>{issues.length}</b></button><button className={tab==='people'?'active':''} onClick={()=>setTab('people')}><Icon name="people"/> Ľudia</button></div>
    {tab==='matrix'&&<>
      <div className="filter-panel oit-filter"><label><span>Vyhľadávanie</span><div className="search-input"><Icon name="search" size={17}/><input value={query} onChange={(e:ChangeEvent<HTMLInputElement>)=>setQuery(e.target.value)} placeholder="Proces, poznámka alebo oblasť..."/></div></label><label><span>Oblasť</span><select value={area} onChange={(e:ChangeEvent<HTMLSelectElement>)=>setArea(e.target.value)}><option value="all">Všetky oblasti</option>{oitData.raciAreas.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label><label><span>Kontrola</span><select value={issue} onChange={(e:ChangeEvent<HTMLSelectElement>)=>setIssue(e.target.value)}><option value="all">Všetky riadky</option><option value="ok">Bez medzery</option><option>Chýba A</option><option>Viac A</option><option>Chýba R</option><option>Jediný R</option></select></label><span className="result-pill">{filtered.length} procesov</span></div>
      <div className="oit-raci-legend"><span><b className="raci-r">R</b> Vykonávateľ</span><span><b className="raci-a">A</b> Vlastník</span><span><b className="raci-c">C</b> Konzultovaný</span><span><b className="raci-i">I</b> Informovaný</span></div>
      <div className="oit-table-shell"><table className="oit-raci-table"><thead><tr><th>Proces / oblasť</th><th>Kontrola</th>{oitData.people.map(p=><th key={p.id}><span>{p.id}</span><small>{p.name.split(' ').slice(-1)}</small></th>)}</tr></thead><tbody>{filtered.map(row=>{const gap=raciIssue(row);return <tr key={row.id}><td><small>{row.areaTitle}</small><strong>{row.process}</strong><p>{row.note}</p></td><td>{gap?<Badge tone={gap==='Jediný R'?'warning':'danger'}>{gap}</Badge>:<Badge tone="success">OK</Badge>}</td>{oitData.people.map(p=>{const val=row.assignments[p.id]||'·';return <td key={p.id}><span className={`raci-cell ${toneForRaci(val)}`}>{val}</span></td>})}</tr>})}</tbody></table>{!filtered.length&&<Empty title="Bez výsledkov" text="Zmeňte vyhľadávanie alebo filtre."/>}</div>
    </>}
    {tab==='risks'&&<section className="oit-risk-layout"><div className="oit-risk-cards"><article><span>Chýba vlastník A</span><strong>{missingA}</strong><small>procesov bez konečnej zodpovednosti</small></article><article><span>Chýba vykonávateľ R</span><strong>{noR}</strong><small>procesov bez praktického riešiteľa</small></article><article><span>Jediný vykonávateľ</span><strong>{singleR}</strong><small>potenciálny single point of failure</small></article></div><article className="panel"><div className="panel-heading"><div><span className="eyebrow">Koncentrácia zodpovednosti</span><h3>Najviac rolí A</h3></div></div><div className="oit-ranking">{accountable.slice(0,6).map((x,i)=><div key={x.person.id}><span>{i+1}</span><div><strong>{x.person.name}</strong><small>{x.person.area}</small></div><b>{x.count}</b></div>)}</div></article><article className="panel"><div className="panel-heading"><div><span className="eyebrow">Otvorené medzery</span><h3>Procesy na kontrolu</h3></div></div><div className="oit-gap-list">{issues.slice(0,18).map(row=><div key={row.id}><Badge tone={raciIssue(row)==='Jediný R'?'warning':'danger'}>{raciIssue(row)}</Badge><span><strong>{row.process}</strong><small>{row.areaTitle}</small></span></div>)}</div></article></section>}
    {tab==='people'&&<section className="oit-people-grid">{oitData.people.map(p=><article key={p.id}><div className="avatar">{p.id}</div><div><strong>{p.name}</strong><span>{p.area}</span><small>A: {accountable.find(x=>x.person.id===p.id)?.count||0} · R: {rows.filter(r=>Object.entries(r.assignments).some(([id,v])=>id===p.id&&splitRoles(v).includes('R'))).length}</small></div></article>)}</section>}
  </>
}

export function OitDataCenter(){
  const [tab,setTab]=useState<'capacity'|'racks'|'support'>('capacity')
  const [row,setRow]=useState('all'),[query,setQuery]=useState('')
  const devices=oitData.rackInventory.filter(i=>i.device&&!i.device.toLowerCase().includes('voln'))
  const racks=new Set(oitData.rackInventory.map(i=>i.rack).filter(Boolean))
  const oldLive=devices.filter(i=>i.generation.toLowerCase().includes('stare')&&i.status.toLowerCase().includes('zive')).length
  const retirement=devices.filter(i=>/vypinat|vypnúť|moze sa vypnut|môže sa vypnúť/i.test(i.status)).length
  const filtered=oitData.rackInventory.filter(i=>(row==='all'||i.row===row)&&`${i.rack} ${i.device} ${i.code} ${i.status} ${i.note}`.toLowerCase().includes(query.toLowerCase()))
  return <>
    <PageHeader eyebrow="OIT · infraštruktúra" title="Dátové centrum pre vedu a výskum" description="Kapacitný prehľad z reportu za rok 2023, rack inventár a podporné non-IT technológie."/>
    <section className="kpi-grid oit-kpi-grid"><article className="kpi-card"><span>RACKY</span><strong>{racks.size}</strong><small>evidované pozície R1–R5</small></article><article className="kpi-card"><span>ZARIADENIA</span><strong>{devices.length}</strong><small>bez voľných pozícií</small></article><article className="kpi-card"><span>STARÉ A ŽIVÉ</span><strong>{oldLive}</strong><small>priorita životného cyklu</small></article><article className="kpi-card"><span>NA VYRADENIE</span><strong>{retirement}</strong><small>textovo označené v zdroji</small></article></section>
    <div className="view-tabs oit-tabs"><button className={tab==='capacity'?'active':''} onClick={()=>setTab('capacity')}><Icon name="capacity"/> Kapacity</button><button className={tab==='racks'?'active':''} onClick={()=>setTab('racks')}><Icon name="cmdb"/> Rack inventár</button><button className={tab==='support'?'active':''} onClick={()=>setTab('support')}><Icon name="shield"/> Podporné technológie</button></div>
    {tab==='capacity'&&<><section className="oit-capacity-grid">{oitData.capacity.map(c=><article className="panel" key={c.name}><span className="eyebrow">Kapacita {c.name}</span><h3>{c.used} využité</h3><Progress value={c.percent} label={`${c.percent}% z ${c.total}`}/><div><span>Voľné</span><strong>{c.free}</strong></div></article>)}</section><section className="panel oit-hpc"><div className="panel-heading"><div><span className="eyebrow">Výpočtová infraštruktúra</span><h3>HPC Cluster</h3></div><Badge tone="info">Zdroj 2023</Badge></div><div>{oitData.hpc.map(x=><span key={x}><Icon name="systems" size={17}/>{x}</span>)}</div></section></>}
    {tab==='racks'&&<><div className="filter-panel oit-filter"><label><span>Vyhľadávanie</span><div className="search-input"><Icon name="search" size={17}/><input value={query} onChange={(e:ChangeEvent<HTMLInputElement>)=>setQuery(e.target.value)} placeholder="Rack, zariadenie, označenie alebo stav..."/></div></label><label><span>Rad</span><select value={row} onChange={(e:ChangeEvent<HTMLSelectElement>)=>setRow(e.target.value)}><option value="all">Všetky rady</option>{['R1','R2','R3','R4','R5'].map(x=><option key={x}>{x}</option>)}</select></label><span className="result-pill">{filtered.length} položiek</span></div><div className="oit-table-shell"><table className="oit-registry-table"><thead><tr><th>Rack</th><th>Zariadenie</th><th>Označenie</th><th>Pozícia</th><th>Generácia</th><th>Stav / poznámka</th></tr></thead><tbody>{filtered.map((i,idx)=><tr key={`${i.row}-${i.rack}-${i.position}-${idx}`}><td><strong>{i.rack||i.row}</strong><small>{i.size}</small></td><td>{i.device||'—'}</td><td>{i.code||'—'}</td><td>{i.position||'—'} <small>{i.units}</small></td><td>{i.generation?<Badge tone={i.generation.toLowerCase().includes('stare')?'warning':'success'}>{i.generation}</Badge>:'—'}</td><td><Badge tone={statusTone(i.status)}>{i.status||'Neurčený'}</Badge>{i.note&&<small>{i.note}</small>}</td></tr>)}</tbody></table></div></>}
    {tab==='support'&&<><section className="oit-support-grid">{oitData.nonIt.map(group=><article className="panel" key={group.category}><div className="panel-heading"><div><span className="eyebrow">Non-IT infraštruktúra</span><h3>{group.category}</h3></div><Badge tone="info">{group.items.length}</Badge></div><p>{group.summary}</p><div>{group.items.map(item=><span key={item}><Icon name="check" size={16}/>{item}</span>)}</div></article>)}</section><article className="panel oit-workflow"><div className="panel-heading"><div><span className="eyebrow">Prevádzkový postup</span><h3>Režim servisných zásahov</h3></div></div><p>{oitData.serviceWorkflow}</p></article></>}
  </>
}

export function OitNetwork(){
  const [image,setImage]=useState<{src:string;title:string}|null>(null)
  const [urls,setUrls]=useState({topologyUrl:'',oobUrl:''})
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  async function loadDocuments(){
    setLoading(true);setError('')
    try{setUrls(await loadOitTopologyDocuments())}
    catch(caught){setError(caught instanceof Error?caught.message:'Topologické dokumenty sa nepodarilo načítať.')}
    finally{setLoading(false)}
  }

  useEffect(()=>{void loadDocuments()},[])

  const cards=[
    {src:urls.topologyUrl,title:'Hlavná sieťová topológia',description:'Komplexný pohľad na prepínače, firewally, load balancery, servery a prepojenia.'},
    {src:urls.oobUrl,title:'OOB topológia',description:'Samostatný pohľad na internetové pripojenie, HA firewally, routre, ACS a OOB prepínače.'},
  ]
  return <>
    <PageHeader eyebrow="OIT · sieť a bezpečnosť" title="Sieťová architektúra" description="Oddelený hlavný a Out-of-Band pohľad uložený v privátnom Supabase Storage."/>
    {error&&<div className="inline-alert inline-alert-error"><Icon name="warning" size={18}/><span>{error}</span><button className="button button-secondary button-small" onClick={()=>void loadDocuments()}>Obnoviť</button></div>}
    <section className="oit-topology-grid">{cards.map(card=><article className="panel" key={card.title}><div className="panel-heading"><div><span className="eyebrow">Privátny topologický dokument</span><h3>{card.title}</h3></div><Badge tone={card.src?'success':loading?'warning':'danger'}>{card.src?'Načítaný':loading?'Načítavam':'Nedostupný'}</Badge></div><p>{card.description}</p>{card.src?<button className="topology-preview" onClick={()=>setImage({src:card.src,title:card.title})}><img src={card.src} alt={card.title}/></button>:<div className="topology-placeholder"><Icon name="lock" size={32}/><strong>Chránený dokument</strong><span>Nahrajte súbor do privátneho bucketu oit-documents.</span></div>}</article>)}</section>
    <section className="panel oit-network-notes"><div className="panel-heading"><div><span className="eyebrow">Manažérsky pohľad</span><h3>Čo evidovať pri ďalšom kroku</h3></div></div><div><span><Icon name="cmdb"/>väzby zariadení na CMDB položky</span><span><Icon name="user"/>technický vlastník každého prvku</span><span><Icon name="calendar"/>termín obnovy a servisnej podpory</span><span><Icon name="risk"/>kritické prepojenia bez alternatívnej trasy</span></div></section>
    {image&&<Modal wide title={image.title} onClose={()=>setImage(null)}><div className="topology-modal"><img src={image.src} alt={image.title}/></div></Modal>}
  </>
}

export function OitSystems(){
  const [query,setQuery]=useState(''),[category,setCategory]=useState('all')
  const categories=Array.from(new Set(oitData.projects.map(p=>p.category))).sort()
  const filtered=oitData.projects.filter(p=>(category==='all'||p.category===category)&&`${p.name} ${p.description} ${p.note} ${p.status}`.toLowerCase().includes(query.toLowerCase()))
  const statusKnown=oitData.projects.filter(p=>p.status!=='Neurčený').length
  return <>
    <PageHeader eyebrow="OIT · prevádzkové portfólio" title="Systémy a projekty v dátovom centre" description="Register vytvorený zo zoznamu projektov a prevádzkového reportu dátového centra za rok 2023."/>
    <section className="kpi-grid oit-kpi-grid"><article className="kpi-card"><span>POLOŽKY</span><strong>{oitData.projects.length}</strong><small>projekty a systémy</small></article><article className="kpi-card"><span>S POPISOM</span><strong>{oitData.projects.filter(p=>p.description).length}</strong><small>zdrojový alebo doplnený detail</small></article><article className="kpi-card"><span>SO STAVOM</span><strong>{statusKnown}</strong><small>stav uvedený v zdroji</small></article><article className="kpi-card"><span>KATEGÓRIE</span><strong>{categories.length}</strong><small>pracovné členenie</small></article></section>
    <div className="filter-panel oit-filter"><label><span>Vyhľadávanie</span><div className="search-input"><Icon name="search" size={17}/><input value={query} onChange={(e:ChangeEvent<HTMLInputElement>)=>setQuery(e.target.value)} placeholder="Názov projektu, systém alebo popis..."/></div></label><label><span>Kategória</span><select value={category} onChange={(e:ChangeEvent<HTMLSelectElement>)=>setCategory(e.target.value)}><option value="all">Všetky kategórie</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label><span className="result-pill">{filtered.length} položiek</span></div>
    <section className="oit-system-grid">{filtered.map((p,idx)=><article className="panel" key={`${p.name}-${idx}`}><div className="oit-system-title"><div className="oit-system-number">{String(idx+1).padStart(2,'0')}</div><div><span>{p.category}</span><h3>{p.name}</h3></div></div><p>{p.description||p.note||'V zdrojovom reporte nie je uvedený podrobnejší opis.'}</p><div><Badge tone={statusTone(p.status)}>{p.status}</Badge>{p.note&&<small>{p.note}</small>}</div></article>)}</section>
  </>
}

export function OitOperations(){
  const devices=oitData.rackInventory.filter(i=>i.device&&!i.device.toLowerCase().includes('voln'))
  const oldLive=devices.filter(i=>i.generation.toLowerCase().includes('stare')&&i.status.toLowerCase().includes('zive'))
  const planned=devices.filter(i=>/vypinat|vypnúť|moze sa vypnut|môže sa vypnúť/i.test(i.status))
  const off=devices.filter(i=>i.status.toLowerCase().includes('vypnute'))
  return <>
    <PageHeader eyebrow="OIT · kontinuita prevádzky" title="Prevádzka, životný cyklus a riziká" description="Manažérsky pohľad na technický dlh v rackoch, non-IT kontinuitu a koordináciu servisných zásahov."/>
    <section className="oit-risk-cards"><article><span>Staré a stále živé</span><strong>{oldLive.length}</strong><small>zariadení podľa inventára</small></article><article><span>Plánované vypnutie</span><strong>{planned.length}</strong><small>záznamy s textovým plánom vyradenia</small></article><article><span>Vypnuté zariadenia</span><strong>{off.length}</strong><small>kandidáti na fyzické odstránenie</small></article></section>
    <section className="oit-operations-layout"><article className="panel"><div className="panel-heading"><div><span className="eyebrow">Priorita obnovy</span><h3>Staré zariadenia v prevádzke</h3></div><Badge tone="warning">{oldLive.length}</Badge></div><div className="oit-device-list">{oldLive.slice(0,24).map((i,idx)=><div key={`${i.rack}-${i.code}-${idx}`}><Icon name="warning" size={17}/><span><strong>{i.device}</strong><small>{i.rack} · {i.code||'bez označenia'} · {i.status}</small></span></div>)}</div></article><article className="panel"><div className="panel-heading"><div><span className="eyebrow">Plán vyradenia</span><h3>Zariadenia označené na vypnutie</h3></div><Badge tone="danger">{planned.length}</Badge></div><div className="oit-device-list">{planned.slice(0,24).map((i,idx)=><div key={`${i.rack}-${i.code}-${idx}`}><Icon name="calendar" size={17}/><span><strong>{i.device}</strong><small>{i.rack} · {i.status}</small></span></div>)}</div></article></section>
    <article className="panel oit-workflow"><div className="panel-heading"><div><span className="eyebrow">Kontinuita</span><h3>Servisný zásah v dátovom centre</h3></div></div><p>{oitData.serviceWorkflow}</p><div className="workflow-steps"><span><b>1</b>Alert a notifikácia</span><span><b>2</b>Koordinácia administrátora a DC</span><span><b>3</b>Migrácia na záložné zdroje</span><span><b>4</b>Fyzický alebo hot-plug zásah</span></div></article>
  </>
}
