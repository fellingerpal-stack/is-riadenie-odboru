import { useMemo, useState } from 'react'
import { Badge, Empty, Icon, PageHeader } from '../components/UI'
import type { AppState } from '../types'
import {
  buildControlTower,
  buildLifecycleEvents,
  buildService360,
  contractForecast,
  sitContracts,
  sitPayments,
  type AttentionTone,
} from '../lib/managementIntelligence'
import { resolveSupplierName } from '../lib/supplierDirectory'
import './OperationsIntelligence.css'

type Go=(view:string)=>void
type Tab='tower'|'services'|'lifecycle'|'vendors'|'forecast'
type ForecastMethod='allAverage'|'last3'|'conservative'

const money=new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR',minimumFractionDigits:0,maximumFractionDigits:0})
const money2=new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2})
const pct=new Intl.NumberFormat('sk-SK',{minimumFractionDigits:1,maximumFractionDigits:1})
const compactMoney=new Intl.NumberFormat('sk-SK',{notation:'compact',style:'currency',currency:'EUR',maximumFractionDigits:1})
const monthNames=['Jan','Feb','Mar','Apr','Máj','Jún','Júl','Aug','Sep','Okt','Nov','Dec']

function badgeTone(tone:AttentionTone){return tone==='critical'?'danger':tone==='high'?'warning':tone==='medium'?'info':'neutral'}
function healthTone(score:number){return score>=85?'success':score>=70?'info':score>=55?'warning':'danger'}
function forecastTone(share:number){return share>115?'danger':share>100?'warning':share>85?'info':'success'}
function sum(values:number[]){return values.reduce((total,value)=>total+value,0)}

export default function OperationsIntelligence({state,go}:{state:AppState;go:Go}){
  const [tab,setTab]=useState<Tab>('tower')
  const tower=useMemo(()=>buildControlTower(state),[state])
  const services=useMemo(()=>buildService360(state),[state])
  const lifecycle=useMemo(()=>buildLifecycleEvents(state),[state])
  const [serviceQuery,setServiceQuery]=useState('')
  const [selectedServiceId,setSelectedServiceId]=useState(services[0]?.service.id||'')
  const selectedService=services.find(item=>item.service.id===selectedServiceId)||services[0]
  const [lifecycleHorizon,setLifecycleHorizon]=useState('365')
  const [lifecycleKind,setLifecycleKind]=useState('Všetko')
  const [vendorTask,setVendorTask]=useState('all')
  const [forecastTask,setForecastTask]=useState('all')
  const [forecastMethod,setForecastMethod]=useState<ForecastMethod>('conservative')

  const filteredServices=services.filter(item=>`${item.service.name} ${item.service.category} ${item.service.technicalOwner} ${item.service.primary}`.toLocaleLowerCase('sk').includes(serviceQuery.toLocaleLowerCase('sk')))
  const lifecycleRows=lifecycle.filter(event=>(lifecycleKind==='Všetko'||event.kind===lifecycleKind)&&(lifecycleHorizon==='all'||event.days<=Number(lifecycleHorizon)))
  const vendorRows=sitPayments.vendors.filter(vendor=>vendorTask==='all'||vendor.task===vendorTask).sort((a,b)=>b.amount-a.amount)
  const vendorTotal=sum(vendorRows.map(row=>row.amount))
  const vendorTop2=sum(vendorRows.slice(0,2).map(row=>row.amount))
  const contractTasks=forecastTask==='all'?sitContracts.tasks:sitContracts.tasks.filter(task=>task.code===forecastTask)
  const forecastBudget=sum(contractTasks.map(task=>task.budget))
  const forecastSpent=sum(contractTasks.map(task=>task.spent))
  const forecastValue=sum(contractTasks.map(task=>contractForecast(task,forecastMethod).forecast))
  const forecastDelta=forecastValue-forecastBudget
  const serviceHealthAverage=services.length?Math.round(sum(services.map(item=>item.health))/services.length):0
  const servicesAtRisk=services.filter(item=>item.attention>=55).length
  const lifecycle90=lifecycle.filter(event=>event.days<=90).length

  function openService(id:string){setSelectedServiceId(id);setTab('services')}

  return <div className="ops-intelligence">
    <PageHeader eyebrow="Spoločný manažérsky modul 3.1 + 3.2" title="Riadiace centrum IT · Service 360" description="Jeden operačný pohľad nad službami, ľuďmi, RACI, technológiami, incidentmi, problémami, zmenami, lifecycle termínmi, kontraktmi a IT nákladmi." actions={<button className="button button-secondary" onClick={()=>go('technology')}><Icon name="systems" size={17}/>Technologický katalóg</button>}/>

    <section className="ops-hero-strip">
      <div><Icon name="shield" size={20}/><span><strong>Vysvetliteľná riadiaca inteligencia</strong><small>Signály sú odvodené z existujúcich registrov a lokálnych pravidiel. Nejde o automatické personálne hodnotenie ani o externé AI API.</small></span></div>
      <Badge tone={tower.critical?'danger':tower.high?'warning':'success'}>{tower.alerts.length} signálov</Badge>
    </section>

    <div className="view-tabs ops-tabs">
      <button className={tab==='tower'?'active':''} onClick={()=>setTab('tower')}><Icon name="dashboard"/>Control Tower <b>{tower.alerts.length}</b></button>
      <button className={tab==='services'?'active':''} onClick={()=>setTab('services')}><Icon name="services"/>Service 360 <b>{services.length}</b></button>
      <button className={tab==='lifecycle'?'active':''} onClick={()=>setTab('lifecycle')}><Icon name="calendar"/>Lifecycle radar <b>{lifecycle90}</b></button>
      <button className={tab==='vendors'?'active':''} onClick={()=>setTab('vendors')}><Icon name="database"/>Dodávatelia / zmluvy</button>
      <button className={tab==='forecast'?'active':''} onClick={()=>setTab('forecast')}><Icon name="capacity"/>Forecast 10 / 22 / 25</button>
    </div>

    {tab==='tower'&&<>
      <section className="ops-kpis">
        <article className={tower.critical?'danger':''}><span>KRITICKÉ SIGNÁLY</span><strong>{tower.critical}</strong><small>{tower.high} ďalších vysokých</small></article>
        <article><span>SERVICE HEALTH</span><strong>{serviceHealthAverage}/100</strong><small>priemer {services.length} služieb</small></article>
        <article><span>SLUŽBY V POZORNOSTI</span><strong>{servicesAtRisk}</strong><small>attention score ≥ 55</small></article>
        <article><span>LIFECYCLE ≤ 90 DNÍ</span><strong>{lifecycle90}</strong><small>licencie, podpora, zmluvy, záruky</small></article>
        <article><span>SIT ČERPANIE</span><strong>{pct.format(forecastBudget?forecastSpent/forecastBudget*100:0)} %</strong><small>{money.format(forecastSpent)} z {money.format(forecastBudget)}</small></article>
      </section>

      <section className="ops-tower-grid">
        <article className="panel ops-priority-panel">
          <div className="panel-heading"><div><span className="eyebrow">DNEŠNÁ PRIORITA</span><h3>Čo potrebuje pozornosť</h3><p>Signály zoradené podľa kombinácie kritickosti, kontinuity, prevádzkových udalostí, lifecycle a rozpočtu.</p></div><Badge tone={tower.critical?'danger':'info'}>{tower.alerts.length}</Badge></div>
          <div className="ops-alert-list">{tower.alerts.slice(0,14).map(alert=><button key={alert.id} className={`ops-alert ${alert.tone}`} onClick={()=>alert.serviceId?openService(alert.serviceId):go(alert.route)}><span className="ops-alert-icon"><Icon name={alert.tone==='critical'?'warning':alert.source==='Rozpočet'?'capacity':alert.source==='Technológia'?'calendar':'services'} size={18}/></span><span className="ops-alert-copy"><strong>{alert.title}</strong><small>{alert.detail}</small></span><Badge tone={badgeTone(alert.tone)}>{alert.source}</Badge><Icon name="chevron" size={16}/></button>)}</div>
        </article>

        <aside className="panel ops-health-panel">
          <div className="panel-heading"><div><span className="eyebrow">SERVICE HEALTH</span><h3>Najslabšie služby</h3></div></div>
          <div className="ops-health-list">{[...services].sort((a,b)=>a.health-b.health).slice(0,8).map(item=><button key={item.service.id} onClick={()=>openService(item.service.id)}><span><strong>{item.service.name}</strong><small>{item.attentionReasons[0]||'bez kritického signálu'}</small></span><div><i style={{width:`${item.health}%`}}/><Badge tone={healthTone(item.health)}>{item.health}</Badge></div></button>)}</div>
          <button className="button button-secondary ops-wide-button" onClick={()=>setTab('services')}>Otvoriť všetky služby <Icon name="arrow" size={16}/></button>
        </aside>
      </section>

      <section className="ops-summary-grid">
        <article className="panel"><div className="panel-heading"><div><span className="eyebrow">NAJBLIŽŠIE TERMÍNY</span><h3>Lifecycle radar</h3></div></div>{lifecycle.slice(0,6).map(event=><div className="ops-mini-row" key={event.id}><span><strong>{event.technology}</strong><small>{event.kind} · {event.date}</small></span><Badge tone={badgeTone(event.severity)}>{event.days<0?`${Math.abs(event.days)} d po`:event.days===0?'dnes':`${event.days} d`}</Badge></div>)}<button className="text-button" onClick={()=>setTab('lifecycle')}>Celý radar <Icon name="arrow" size={15}/></button></article>
        <article className="panel"><div className="panel-heading"><div><span className="eyebrow">ROZPOČTOVÝ VÝHĽAD</span><h3>SIT 2026 · konzervatívny forecast</h3></div></div>{sitContracts.tasks.map(task=>{const f=contractForecast(task,'conservative');return <div className="ops-mini-row" key={task.code}><span><strong>Úloha {task.code}</strong><small>{money.format(task.spent)} vyčerpané · {pct.format(task.spent/task.budget*100)} %</small></span><Badge tone={forecastTone(f.share)}>{pct.format(f.share)} % FY</Badge></div>})}<button className="text-button" onClick={()=>setTab('forecast')}>Detail forecastu <Icon name="arrow" size={15}/></button></article>
        <article className="panel"><div className="panel-heading"><div><span className="eyebrow">KONCENTRÁCIA</span><h3>Dodávateľská stopa SIT</h3></div></div><div className="ops-big-metric"><strong>{pct.format(vendorTotal?vendorTop2/vendorTotal*100:0)} %</strong><span>TOP 2 evidovaných dodávateľských identít na objeme riadkových platieb</span></div><p className="ops-footnote">Pri úlohe 25 je {money2.format(sitPayments.meta.task25OtherCenters)} priradených cez reconciliačné pravidlo mimo strediska 345.</p><button className="text-button" onClick={()=>setTab('vendors')}>Dodávatelia a zmluvy <Icon name="arrow" size={15}/></button></article>
      </section>
    </>}

    {tab==='services'&&<section className="ops-service-workspace">
      <aside className="panel ops-service-list">
        <div className="ops-service-search"><Icon name="search" size={16}/><input value={serviceQuery} onChange={event=>setServiceQuery(event.target.value)} placeholder="Hľadať službu, ownera…"/></div>
        <div className="ops-service-scroll">{filteredServices.map(item=><button key={item.service.id} className={selectedService?.service.id===item.service.id?'active':''} onClick={()=>setSelectedServiceId(item.service.id)}><span><strong>{item.service.name}</strong><small>{item.service.category} · {item.service.criticality}</small></span><div><Badge tone={healthTone(item.health)}>{item.health}</Badge>{item.attention>=55&&<i/>}</div></button>)}</div>
      </aside>
      {selectedService?<ServiceDetail record={selectedService} go={go} state={state}/>:<div className="panel"><Empty title="Služba nebola vybraná" text="Vyberte službu v ľavom zozname."/></div>}
    </section>}

    {tab==='lifecycle'&&<>
      <section className="panel ops-filter-row"><label><span>Horizont</span><select value={lifecycleHorizon} onChange={event=>setLifecycleHorizon(event.target.value)}><option value="30">30 dní</option><option value="90">90 dní</option><option value="180">6 mesiacov</option><option value="365">12 mesiacov</option><option value="all">Všetko</option></select></label><label><span>Typ</span><select value={lifecycleKind} onChange={event=>setLifecycleKind(event.target.value)}><option>Všetko</option><option>Licencia</option><option>Podpora</option><option>Kontrakt</option><option>Záruka</option></select></label><div className="ops-filter-note"><Icon name="calendar" size={17}/><span>{lifecycleRows.length} termínov vo výbere</span></div></section>
      <section className="panel ops-lifecycle-panel"><div className="panel-heading"><div><span className="eyebrow">LIFECYCLE RADAR</span><h3>Termíny technológií, licencií a podpory</h3><p>Radí položky podľa času do termínu; nevytvára dátum tam, kde ho zdrojový register neobsahuje.</p></div></div><div className="ops-lifecycle-list">{lifecycleRows.length?lifecycleRows.map(event=><div className={`ops-lifecycle-row ${event.severity}`} key={event.id}><div className="ops-life-days"><strong>{event.days<0?`-${Math.abs(event.days)}`:event.days}</strong><span>dní</span></div><span className="ops-life-main"><strong>{event.technology}</strong><small>{event.kind} · {event.date} · {event.owner||'owner na potvrdenie'}</small></span><Badge tone={badgeTone(event.severity)}>{event.kind}</Badge><button className="text-button" onClick={()=>go('technology')}>Technológia <Icon name="arrow" size={14}/></button></div>):<Empty title="Bez termínov" text="V zvolenom horizonte nie je evidovaný žiadny termín."/>}</div></section>
    </>}

    {tab==='vendors'&&<VendorView task={vendorTask} setTask={setVendorTask} state={state} go={go}/>} 
    {tab==='forecast'&&<ForecastView task={forecastTask} setTask={setForecastTask} method={forecastMethod} setMethod={setForecastMethod}/>} 
  </div>
}

function ServiceDetail({record,go,state}:{record:ReturnType<typeof buildService360>[number];go:Go;state:AppState}){
  const maxCost=Math.max(...record.cost.byYear.map(value=>Math.abs(value.amount)),1)
  const rTotal=record.raciStats.r+record.oitRaciStats.r
  const singleR=record.raciStats.singleR+record.oitRaciStats.singleR
  return <article className="panel ops-service-detail">
    <header className="ops-service-detail-head"><div><span className="eyebrow">SERVICE 360</span><h2>{record.service.name}</h2><p>{record.service.note||record.service.category}</p><div className="ops-service-tags"><Badge tone={/krit/i.test(record.service.criticality)?'danger':'info'}>{record.service.criticality||'kritickosť neurčená'}</Badge><Badge tone={healthTone(record.health)}>Health {record.health}/100</Badge>{record.attention>=55&&<Badge tone="warning">Attention {record.attention}</Badge>}</div></div><div className="ops-service-owner"><span>Technický vlastník</span><strong>{record.service.technicalOwner||'Na potvrdenie'}</strong><small>R: {record.service.primary||'—'} · zástupca: {record.service.deputy||'—'}</small></div></header>

    {record.attentionReasons.length>0&&<div className="ops-service-signals">{record.attentionReasons.slice(0,5).map(reason=><span key={reason}><Icon name="warning" size={15}/>{reason}</span>)}</div>}

    <section className="ops-service-metrics">
      <div><span>RACI</span><strong>{rTotal} R</strong><small>{singleR} procesov s jediným R</small></div>
      <div><span>Technológie</span><strong>{record.technologies.length}</strong><small>{record.cmdb.length} CMDB položiek</small></div>
      <div><span>Prevádzka</span><strong>{record.openTickets.length}</strong><small>otvorených ticketov · {record.openProblems.length} problémov</small></div>
      <div><span>Zmeny</span><strong>{record.openChanges.length}</strong><small>otvorených / plánovaných</small></div>
      <div><span>Náklad 2026</span><strong>{record.cost.current?money.format(record.cost.current):'—'}</strong><small>{record.cost.entities.join(', ')||'bez priamej COST väzby'}</small></div>
      <div><span>Lifecycle ≤90d</span><strong>{record.lifecycle.filter(event=>event.days<=90).length}</strong><small>{record.lifecycle.length} termínov celkom</small></div>
    </section>

    <section className="ops-service-grid-2">
      <div className="ops-detail-block"><h3>Riadenie a kontinuita</h3><dl><div><dt>Business owner</dt><dd>{record.service.businessOwner||'—'}</dd></div><div><dt>Technický owner</dt><dd>{record.service.technicalOwner||'—'}</dd></div><div><dt>Primárny riešiteľ</dt><dd>{record.service.primary||'—'}</dd></div><div><dt>Zástupca</dt><dd>{record.service.deputy||'—'}</dd></div><div><dt>RTO</dt><dd>{record.service.rto||'—'}</dd></div><div><dt>Monitoring</dt><dd>{record.service.monitoring||'—'}</dd></div><div><dt>Backup</dt><dd>{record.service.backup||'—'}</dd></div><div><dt>Supplier SLA</dt><dd>{record.service.supplierSla||'—'}</dd></div></dl></div>
      <div className="ops-detail-block"><h3>Náklady · 5 rokov</h3><div className="ops-cost-bars">{record.cost.byYear.map(value=><div key={value.year}><span>{value.year}</span><i><b style={{width:`${Math.max(value.amount?3:0,Math.abs(value.amount)/maxCost*100)}%`}}/></i><strong>{value.amount?compactMoney.format(value.amount):'—'}</strong></div>)}</div><footer><span>RUN {money.format(record.cost.run)}</span><span>CHANGE {money.format(record.cost.change)}</span></footer></div>
    </section>

    <section className="ops-service-grid-3">
      <div className="ops-detail-block"><h3>Technológie a CMDB</h3>{record.technologies.slice(0,7).map(item=><div className="ops-link-row" key={item.id}><span><strong>{item.name}</strong><small>{item.model} · {item.location}</small></span><Badge tone="info">{item.lifecycle||'—'}</Badge></div>)}{record.technologies.length===0&&<p className="ops-muted">Priama technologická väzba nebola nájdená.</p>}<button className="text-button" onClick={()=>go('technology')}>Technologický katalóg <Icon name="arrow" size={14}/></button></div>
      <div className="ops-detail-block"><h3>Incidenty · problémy · change</h3><div className="ops-three-stats"><span><b>{record.openTickets.length}</b>tickety</span><span><b>{record.openProblems.length}</b>problémy</span><span><b>{record.openChanges.length}</b>change</span></div>{record.openProblems.slice(0,3).map(item=><div className="ops-link-row" key={item.id}><span><strong>{item.title}</strong><small>{item.status} · {item.priority}</small></span></div>)}<div className="ops-inline-links"><button onClick={()=>go('helpdesk')}>ServiceDesk</button><button onClick={()=>go('problems')}>Problémy</button><button onClick={()=>go('changes')}>Zmeny</button></div></div>
      <div className="ops-detail-block"><h3>Kontraktová expozícia</h3>{record.contractTasks.map(task=>{const f=contractForecast(task,'conservative');return <div className="ops-contract-mini" key={task.code}><span><b>Úloha {task.code}</b><small>{money.format(task.spent)} / {money.format(task.budget)}</small></span><Badge tone={forecastTone(f.share)}>{pct.format(f.share)} % FY</Badge></div>})}{record.contractTasks.length===0&&<p className="ops-muted">Služba nemá jednoznačnú väzbu na úlohu 10/22/25.</p>}{record.topVendors.length>0&&<><h4>TOP dodávateľské identity</h4>{record.topVendors.slice(0,3).map(vendor=><div className="ops-link-row" key={`${vendor.task}-${vendor.supplierId}`}><span><strong>{resolveSupplierName(state,vendor.supplierId,vendor.supplierLabel)}</strong><small>{vendor.supplierId!=='bez-ico'?`IČO ${vendor.supplierId} · `:''}{vendor.contracts.slice(0,2).join(', ')||'bez zmluvnej referencie'}</small></span><b>{money.format(vendor.amount)}</b></div>)}<small className="ops-muted">TOP 2 koncentrácia v príslušnej kontraktovej úlohe: {pct.format(record.vendorConcentration)} %.</small></>}</div>
    </section>

    <section className="ops-service-bottom"><div><span className="eyebrow">PREPOJENIA</span><strong>{record.risks.length} rizík · {record.projects.length} projektov · {record.tasks.length} úloh</strong><small>Väzby sú založené na serviceId a na konzervatívnom názvovom prekryve existujúcich registrov.</small></div><div className="ops-inline-links"><button onClick={()=>go('raci')}>RACI 3.2</button><button onClick={()=>go('oitRaci')}>RACI 3.1</button><button onClick={()=>go('risks')}>Riziká</button><button onClick={()=>go('work')}>Projekty</button><button onClick={()=>go('itCosts')}>IT náklady</button></div></section>
  </article>
}

function VendorView({task,setTask,state,go}:{task:string;setTask:(value:string)=>void;state:AppState;go:Go}){
  const rows=sitPayments.vendors.filter(vendor=>task==='all'||vendor.task===task).sort((a,b)=>b.amount-a.amount)
  const total=sum(rows.map(row=>row.amount));const top2=sum(rows.slice(0,2).map(row=>row.amount));const max=Math.max(...rows.map(row=>row.amount),1)
  const contracts=new Set(rows.flatMap(row=>row.contracts))
  return <>
    <section className="panel ops-filter-row"><label><span>Kontraktová úloha</span><select value={task} onChange={event=>setTask(event.target.value)}><option value="all">10 + 22 + 25</option><option value="10">Úloha 10</option><option value="22">Úloha 22</option><option value="25">Úloha 25</option></select></label><div className="ops-filter-note"><Icon name="database" size={17}/><span>{rows.length} dodávateľských identít · {contracts.size} zmluvných referencií</span></div></section>
    <section className="ops-kpis ops-vendor-kpis"><article><span>RIADKOVÉ PLATBY</span><strong>{money.format(total)}</strong><small>január–máj 2026</small></article><article><span>TOP 2 KONCENTRÁCIA</span><strong>{pct.format(total?top2/total*100:0)} %</strong><small>podiel dvoch najväčších identít</small></article><article><span>PLATIEB V ZDROJI</span><strong>{sitPayments.meta.rowCount}</strong><small>všetky úlohy 10/22/25</small></article><article className="warning"><span>ÚLOHA 25 · MIMO 345</span><strong>{money2.format(sitPayments.meta.task25OtherCenters)}</strong><small>reconciliačné pravidlo</small></article></section>
    <section className="panel ops-vendor-panel"><div className="panel-heading"><div><span className="eyebrow">VENDOR DEPENDENCY</span><h3>Koncentrácia platieb podľa firmy/IČO</h3><p>Ak máme overené mapovanie IČO → názov alebo spravovanú kartu, zobrazí sa názov firmy. Neznáme IČO zostáva identifikátorom. Koncentrácia je finančná stopa, nie hodnotenie dodávateľa.</p><button className="text-button" onClick={()=>go('suppliers')}>Otvoriť register dodávateľov <Icon name="arrow" size={14}/></button></div></div><div className="ops-vendor-list">{rows.map((row,index)=><article key={`${row.task}-${row.supplierId}`}><div className="ops-vendor-rank">{index+1}</div><span className="ops-vendor-name"><strong>{resolveSupplierName(state,row.supplierId,row.supplierLabel)}</strong><small>{row.supplierId!=='bez-ico'?`IČO ${row.supplierId} · `:''}Úloha {row.task} · {row.paymentCount} platieb · strediská {row.centers.join(', ')||'—'}</small></span><div className="ops-vendor-bar"><i style={{width:`${row.amount/max*100}%`}}/></div><strong className="ops-vendor-amount">{money.format(row.amount)}</strong><Badge tone={row.mapping.some(value=>value.includes('reconciliation'))?'warning':'success'}>{row.mapping.some(value=>value.includes('reconciliation'))?'pravidlo':'priame'}</Badge><details><summary>Zmluvy a poznámky</summary><p><b>Zmluvy:</b> {row.contracts.join(', ')||'bez referencie'}</p><p><b>Typické položky:</b> {row.topNotes.join(' · ')||'—'}</p></details></article>)}</div></section>
    <section className="panel ops-method"><Icon name="shield" size={21}/><div><h3>Metodická hranica úlohy 25</h3><p>Z riadkového zdroja sa úlohy 10 (130/328) a 22 (341) mapujú priamo. Pri úlohe 25 tvorí stredisko 345 {money2.format(sitPayments.meta.task25StrictCenter345)}; ďalších {money2.format(sitPayments.meta.task25OtherCenters)} je priradených cez ostatné IT/telekom strediská, aby riadkové platby presne sedeli s autoritatívnym súhrnom úlohy 25.</p></div></section>
  </>
}

function ForecastView({task,setTask,method,setMethod}:{task:string;setTask:(value:string)=>void;method:ForecastMethod;setMethod:(value:ForecastMethod)=>void}){
  const tasks=task==='all'?sitContracts.tasks:sitContracts.tasks.filter(item=>item.code===task)
  const budget=sum(tasks.map(item=>item.budget));const spent=sum(tasks.map(item=>item.spent));const forecasts=tasks.map(item=>contractForecast(item,method));const forecast=sum(forecasts.map(item=>item.forecast));const delta=forecast-budget
  const monthly=Array.from({length:sitContracts.meta.monthsLoaded},(_,index)=>sum(tasks.map(item=>item.monthly[index]||0)))
  const maxMonth=Math.max(...monthly,1)
  return <>
    <section className="panel ops-filter-row"><label><span>Úloha</span><select value={task} onChange={event=>setTask(event.target.value)}><option value="all">10 + 22 + 25</option>{sitContracts.tasks.map(item=><option key={item.code} value={item.code}>Úloha {item.code}</option>)}</select></label><label><span>Forecast metóda</span><select value={method} onChange={event=>setMethod(event.target.value as ForecastMethod)}><option value="allAverage">Priemer všetkých mesiacov</option><option value="last3">Tempo posledných 3 mesiacov</option><option value="conservative">Konzervatívny · vyšší priemer</option></select></label><div className="ops-filter-note"><Icon name="shield" size={17}/><span>Analytický forecast, nie schválený rozpočtový plán</span></div></section>
    <section className="ops-kpis"><article><span>ROZPOČET</span><strong>{money.format(budget)}</strong><small>SIT 2026</small></article><article><span>SKUTOČNOSŤ 01–05</span><strong>{money.format(spent)}</strong><small>{pct.format(budget?spent/budget*100:0)} % rozpočtu</small></article><article className={delta>0?'danger':''}><span>FORECAST 31.12.</span><strong>{money.format(forecast)}</strong><small>{delta>0?`+${money.format(delta)} nad rozpočet`:`${money.format(Math.abs(delta))} pod rozpočet`}</small></article><article><span>FORECAST VYUŽITIE</span><strong>{pct.format(budget?forecast/budget*100:0)} %</strong><small>podľa zvolenej metódy</small></article></section>
    <section className="ops-forecast-grid"><article className="panel"><div className="panel-heading"><div><span className="eyebrow">SKUTOČNOSŤ</span><h3>Mesačné čerpanie</h3></div></div><div className="ops-month-chart">{monthly.map((value,index)=><div key={index}><span>{monthNames[index]}</span><i><b style={{height:`${Math.max(4,value/maxMonth*100)}%`}}/></i><strong>{compactMoney.format(value)}</strong></div>)}</div></article><article className="panel"><div className="panel-heading"><div><span className="eyebrow">SCENÁRE</span><h3>Porovnanie forecast metód</h3></div></div>{(['allAverage','last3','conservative'] as ForecastMethod[]).map(value=>{const projection=sum(tasks.map(item=>contractForecast(item,value).forecast));const share=budget?projection/budget*100:0;return <button className={`ops-forecast-method ${method===value?'active':''}`} key={value} onClick={()=>setMethod(value)}><span><strong>{value==='allAverage'?'Priemer 01–05':value==='last3'?'Posledné 3 mesiace':'Konzervatívny'}</strong><small>{value==='conservative'?'vyšší z priemerov pre zostávajúce mesiace':'extrapolácia doterajšieho tempa'}</small></span><b>{money.format(projection)}</b><Badge tone={forecastTone(share)}>{pct.format(share)} %</Badge></button>})}</article></section>
    <section className="panel ops-forecast-table"><div className="panel-heading"><div><span className="eyebrow">PO ÚLOHE</span><h3>Forecast a rozpočtová odchýlka</h3></div></div><div className="contract-table-wrap"><table className="contract-table"><thead><tr><th>Úloha</th><th>Názov</th><th className="number">Rozpočet</th><th className="number">Skutočnosť</th><th className="number">Forecast</th><th className="number">Odchýlka</th><th className="number">FY %</th></tr></thead><tbody>{tasks.map(item=>{const f=contractForecast(item,method);return <tr key={item.code}><td><strong>{item.code}</strong></td><td><strong>{item.name}</strong><small>{item.description}</small></td><td className="number">{money.format(item.budget)}</td><td className="number">{money.format(item.spent)}</td><td className="number"><strong>{money.format(f.forecast)}</strong></td><td className={`number ${f.delta>0?'ops-negative':''}`}>{f.delta>0?'+':''}{money.format(f.delta)}</td><td className="number"><Badge tone={forecastTone(f.share)}>{pct.format(f.share)} %</Badge></td></tr>})}</tbody></table></div></section>
  </>
}
