import { useEffect, useMemo, useState } from 'react'
import { Badge, Icon, PageHeader } from '../components/UI'
import type { AppState } from '../types'
import { buildEnterprise360Entities, enterprisePortfolioTotals, normalize360, type Enterprise360Entity, type EnterpriseLedgerRow } from '../lib/enterprise360'
import './Enterprise360.css'

type Tab='overview'|'finance'|'work'|'technology'|'governance'|'relations'
type Go=(view:string)=>void

const money=new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2})
const compactMoney=new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR',notation:'compact',maximumFractionDigits:1})
const number=new Intl.NumberFormat('sk-SK',{maximumFractionDigits:1})
const monthNames=['Jan','Feb','Mar','Apr','Máj','Jún','Júl','Aug','Sep','Okt','Nov','Dec']

function pct(value:number,total:number){return total?value/total*100:0}
function closed(value:string){const text=normalize360(value);return ['hotovo','uzatvorena','uzatvoreny','vyriesena','vyrieseny','dokoncena','ukoncena','ukoncene','zamietnuta','zrusena','rollback'].some(item=>text.includes(item))}
function toneForScore(score:number){return score>=80?'success' as const:score>=60?'warning' as const:'danger' as const}
function statusTone(value:string){const text=normalize360(value);if(text.includes('krit')||text.includes('vysok')||text.includes('problem')||text.includes('po termine'))return 'danger' as const;if(text.includes('pozor')||text.includes('priprava')||text.includes('plan'))return 'warning' as const;if(closed(value)||text.includes('aktiv')||text.includes('prevadzka'))return 'success' as const;return 'info' as const}
function dueDays(value:string){if(!value)return null;const date=new Date(`${value}T12:00:00`);if(Number.isNaN(date.getTime()))return null;return Math.ceil((date.getTime()-Date.now())/86400000)}
function unique(values:string[]){return [...new Set(values.filter(Boolean))]}

interface DocumentGroup{key:string;document:string;date:string;amount:number;rows:EnterpriseLedgerRow[];notes:string[];codes:string[];centers:string[]}
function groupDocuments(rows:EnterpriseLedgerRow[]):DocumentGroup[]{
  const map=new Map<string,DocumentGroup>()
  rows.forEach(row=>{
    const key=`${row.date}|${row.document||'bez-dokladu'}`
    const current=map.get(key)??{key,document:row.document||'Bez dokladu',date:row.date,amount:0,rows:[],notes:[],codes:[],centers:[]}
    current.amount+=Number(row.amount||0);current.rows.push(row)
    current.notes=unique([...current.notes,row.note]);current.codes=unique([...current.codes,`${row.kpd}${row.ppd?`/${row.ppd}`:''}`]);current.centers=unique([...current.centers,row.pracm])
    map.set(key,current)
  })
  return [...map.values()].map(item=>({...item,amount:Math.round(item.amount*100)/100})).sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount))
}

function MiniStat({label,value,detail,tone='blue'}:{label:string;value:string;detail:string;tone?:'blue'|'teal'|'green'|'amber'|'purple'|'red'}){
  return <article className={`e360-mini-stat is-${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function QuickLink({icon,label,detail,onClick}:{icon:'capacity'|'systems'|'cmdb'|'tasks'|'database'|'calendar'|'shield'|'people';label:string;detail:string;onClick:()=>void}){
  return <button className="e360-quick-link" onClick={onClick}><span><Icon name={icon} size={18}/></span><p><strong>{label}</strong><small>{detail}</small></p><Icon name="arrow" size={16}/></button>
}

function Attention({entity}:{entity:Enterprise360Entity}){
  const entries=[
    ...entity.missing.slice(0,4).map(value=>({kind:'Dátová medzera',title:`Doplniť ${value}`,detail:'360° karta nemá pre túto oblasť potvrdenú väzbu alebo údaj.',tone:'warning' as const})),
    ...entity.risks.filter(r=>!closed(r.status)).slice(0,3).map(r=>({kind:'Riziko',title:r.risk,detail:`${r.owner||'Bez vlastníka'} · ${r.status||'otvorené'}`,tone:statusTone(r.priority)})),
    ...entity.problems.filter(p=>!closed(p.status)).slice(0,2).map(p=>({kind:'Problem',title:p.title,detail:`${p.owner||'Bez vlastníka'} · ${p.status}`,tone:'danger' as const})),
    ...entity.tickets.filter(t=>!closed(t.status)).slice(0,2).map(t=>({kind:'Incident / požiadavka',title:t.title,detail:`${t.assignee||'Nepridelené'} · ${t.status}`,tone:statusTone(t.priority)})),
  ].slice(0,6)
  return <div className="e360-attention-list">{entries.length?entries.map((item,index)=><article key={`${item.kind}-${index}`}><span className={`e360-attention-dot is-${item.tone}`}/><div><small>{item.kind}</small><strong>{item.title}</strong><p>{item.detail}</p></div></article>):<div className="e360-empty-small"><Icon name="check" size={20}/><strong>Bez kritických upozornení</strong><span>Aktuálne prepojené dáta neindikujú otvorený problém.</span></div>}</div>
}

function FinanceView({entity,onGo}:{entity:Enterprise360Entity;onGo:Go}){
  const [month,setMonth]=useState<number|null>(null)
  const finance=entity.finance
  const scopedRows=useMemo(()=>month?finance.rows.filter(row=>row.month===month):finance.rows,[finance.rows,month])
  const docs=useMemo(()=>groupDocuments(scopedRows),[scopedRows])
  const scopedTotal=scopedRows.reduce((sum,row)=>sum+Number(row.amount||0),0)
  const expected=month?Number(finance.monthly[month-1]||0):finance.spent
  const maxMonth=Math.max(1,...finance.monthly.map(value=>Math.abs(value)))
  return <div className="e360-section-stack">
    {!finance.task&&<div className="e360-callout warning"><Icon name="warning" size={20}/><div><strong>Táto entita zatiaľ nemá priame mapovanie na kontraktovú rozpočtovú úlohu.</strong><span>CVTI 360 preto nezobrazuje odvodené čerpanie. Assetové a zmluvné finančné údaje ostávajú uvedené samostatne.</span></div></div>}
    <section className="e360-finance-kpis">
      <MiniStat label="ROZPOČET" value={finance.task?money.format(finance.budget):'—'} detail={finance.task?`Úloha ${finance.taskCode}`:'Bez priameho mapovania'} tone="blue"/>
      <MiniStat label="ČERPANIE YTD" value={finance.task?money.format(finance.spent):'—'} detail={finance.task?`${number.format(pct(finance.spent,finance.budget))} % rozpočtu`:'Nie je odvodené'} tone="teal"/>
      <MiniStat label="ZOSTÁVA" value={finance.task?money.format(finance.remaining):'—'} detail={finance.task?`${number.format(100-pct(finance.spent,finance.budget))} % rozpočtu`:'Nie je odvodené'} tone="green"/>
      <MiniStat label="ZMLUVY · ROČNÁ HODNOTA" value={finance.contractAnnualValue?money.format(finance.contractAnnualValue):'—'} detail={`${entity.contracts.length} prepojených zmlúv`} tone="purple"/>
      <MiniStat label="ASSETY · ROČNÝ OPEX" value={finance.assetAnnualCost?money.format(finance.assetAnnualCost):'—'} detail={`${entity.cmdb.length} prepojených aktív`} tone="amber"/>
    </section>
    {finance.task&&<section className="e360-panel e360-finance-grid">
      <div className="e360-panel-main">
        <header className="e360-panel-head"><div><span>ČERPANIE</span><h3>Mesačný finančný priebeh</h3><p>Klikni na mesiac a zobrazia sa konkrétne platby / auditné riadky.</p></div><button className="button button-secondary" onClick={()=>onGo('itCosts')}><Icon name="capacity" size={16}/> Otvoriť IT náklady</button></header>
        <div className="e360-month-chart">
          {finance.monthly.slice(0,finance.monthsLoaded).map((value,index)=>{const selected=month===index+1;return <button key={index} className={selected?'is-selected':''} onClick={()=>setMonth(current=>current===index+1?null:index+1)} title={`${monthNames[index]} · ${money.format(value)}`}><span className="e360-bar-value">{compactMoney.format(value)}</span><i style={{height:`${Math.max(3,Math.abs(value)/maxMonth*100)}%`}}/><strong>{monthNames[index]}</strong></button>})}
        </div>
        <div className="e360-reconcile"><Icon name={Math.abs(scopedTotal-expected)<0.02?'check':'warning'} size={16}/><span><strong>{month?monthNames[month-1]:'01–'+String(finance.monthsLoaded).padStart(2,'0')}</strong> · podklad {money.format(scopedTotal)} · graf {money.format(expected)}</span><Badge tone={Math.abs(scopedTotal-expected)<0.02?'success':'danger'}>{Math.abs(scopedTotal-expected)<0.02?'Sedí':'Rozdiel'}</Badge></div>
      </div>
      <aside className="e360-finance-side">
        <span>FINANČNÝ KONTEXT</span>
        <div><small>Obdobie</small><strong>{finance.period}</strong></div>
        <div><small>Auditné riadky</small><strong>{scopedRows.length}</strong></div>
        <div><small>Doklady</small><strong>{docs.length}</strong></div>
        <div><small>Centrá / PRACM</small><strong>{unique(scopedRows.map(row=>row.pracm)).length}</strong></div>
        <button className="text-button" onClick={()=>setMonth(null)}>Zobraziť celé obdobie <Icon name="arrow" size={14}/></button>
      </aside>
    </section>}
    {finance.task&&<section className="e360-panel">
      <header className="e360-panel-head"><div><span>DÔKAZNÁ VRSTVA</span><h3>{month?`Platby · ${monthNames[month-1]}`:'Najväčšie platby a doklady'}</h3><p>Doklady sú agregované priamo z auditného ledgeru úlohy {finance.taskCode}.</p></div><Badge tone="info">{docs.length} dokladov</Badge></header>
      <div className="e360-payment-table-wrap"><table className="e360-payment-table"><thead><tr><th>Dátum</th><th>Doklad</th><th>Popis / účel</th><th>KPD / PPD</th><th>PRACM</th><th>Suma</th></tr></thead><tbody>{docs.slice(0,20).map(doc=><tr key={doc.key}><td>{doc.date||'—'}</td><td><strong>{doc.document}</strong><small>{doc.rows.length} riadkov</small></td><td>{doc.notes.slice(0,2).join(' · ')||'—'}</td><td>{doc.codes.slice(0,3).join(', ')||'—'}</td><td>{doc.centers.slice(0,3).join(', ')||'—'}</td><td className="money-cell">{money.format(doc.amount)}</td></tr>)}</tbody></table></div>
    </section>}
  </div>
}

function WorkView({entity,onGo}:{entity:Enterprise360Entity;onGo:Go}){
  const items=[
    ...entity.tasks.map(item=>({kind:'Úloha',title:item.title,status:item.status,owner:item.owner,due:item.due,detail:item.description,go:'work'})),
    ...entity.projects.map(item=>({kind:'Projekt',title:item.name,status:item.status,owner:item.owner,due:item.due,detail:item.description,go:'work'})),
    ...entity.tickets.map(item=>({kind:'Ticket',title:item.title,status:item.status,owner:item.assignee,due:item.due,detail:item.description,go:'helpdesk'})),
    ...entity.changes.map(item=>({kind:'Change',title:item.title,status:item.status,owner:item.owner,due:item.plannedEnd,detail:item.description,go:'changes'})),
    ...entity.problems.map(item=>({kind:'Problem',title:item.title,status:item.status,owner:item.owner,due:item.targetDate,detail:item.description,go:'problems'})),
  ].sort((a,b)=>Number(closed(a.status))-Number(closed(b.status))||(dueDays(a.due)??9999)-(dueDays(b.due)??9999))
  return <section className="e360-panel"><header className="e360-panel-head"><div><span>PRÁCA NAPRIEČ MODULMI</span><h3>Úlohy, projekty, incidenty, problémy a zmeny</h3><p>Jedna fronta práce naviazanej na {entity.title}.</p></div><Badge tone={entity.openWorkCount+entity.openIncidentCount+entity.openProblemCount?'warning':'success'}>{entity.openWorkCount+entity.openIncidentCount+entity.openProblemCount} otvorených</Badge></header>
    <div className="e360-work-list">{items.length?items.map((item,index)=><button key={`${item.kind}-${index}`} onClick={()=>onGo(item.go)}><span className={`e360-work-kind is-${normalize360(item.kind)}`}>{item.kind}</span><div><strong>{item.title}</strong><p>{item.detail||'Bez doplňujúceho popisu.'}</p><small>{item.owner||'Bez vlastníka'}{item.due?` · termín ${item.due}`:''}</small></div><Badge tone={statusTone(item.status)}>{item.status||'Bez stavu'}</Badge><Icon name="arrow" size={15}/></button>):<div className="e360-empty-small"><Icon name="check" size={20}/><strong>Bez prepojenej práce</strong><span>Pre túto entitu sa nenašli súvisiace pracovné záznamy.</span></div>}</div>
  </section>
}

function TechnologyView({entity,onGo}:{entity:Enterprise360Entity;onGo:Go}){
  return <div className="e360-two-col">
    <section className="e360-panel"><header className="e360-panel-head"><div><span>ARCHITEKTÚRA</span><h3>Technický profil</h3><p>{entity.runtimeLocation}</p></div><button className="button button-secondary" onClick={()=>onGo('technology')}><Icon name="systems" size={16}/> Katalóg</button></header>
      <dl className="e360-definition-grid"><div><dt>Prostredie</dt><dd>{entity.environment||'—'}</dd></div><div><dt>Platforma</dt><dd>{entity.platform||'—'}</dd></div><div><dt>Monitoring</dt><dd>{entity.monitoring||'—'}</dd></div><div><dt>Backup</dt><dd>{entity.backup||'—'}</dd></div><div><dt>Kontinuita</dt><dd>{entity.continuity||'—'}</dd></div><div><dt>Sieťové závislosti</dt><dd>{entity.networkDependencies.join(' · ')||'—'}</dd></div></dl>
      <div className="e360-chip-row">{entity.oitDomains.map(item=><span key={item}>{item}</span>)}</div>
    </section>
    <section className="e360-panel"><header className="e360-panel-head"><div><span>ASSET 360</span><h3>Prepojené aktíva</h3><p>CMDB položky a technické komponenty.</p></div><button className="button button-secondary" onClick={()=>onGo('cmdb')}><Icon name="cmdb" size={16}/> Asset register</button></header>
      <div className="e360-asset-list">{entity.cmdb.length?entity.cmdb.map(item=><article key={item.id}><span className="e360-asset-icon"><Icon name="cmdb" size={17}/></span><div><strong>{item.name}</strong><p>{item.hostname||item.type||item.assetClass}</p><small>{item.location||'Lokalita neurčená'} · {item.environment||'prostredie neurčené'}</small></div><Badge tone={item.lifecycle==='Na obnovu'?'warning':'info'}>{item.lifecycle||item.status||'Evidované'}</Badge></article>):<div className="e360-empty-small"><Icon name="cmdb" size={20}/><strong>Bez priamych CMDB väzieb</strong><span>Technický profil existuje, ale konkrétne assety ešte nie sú priradené.</span></div>}</div>
    </section>
  </div>
}

function GovernanceView({entity,onGo}:{entity:Enterprise360Entity;onGo:Go}){
  return <div className="e360-two-col">
    <section className="e360-panel"><header className="e360-panel-head"><div><span>VLASTNÍCTVO A RACI</span><h3>Kto za čo zodpovedá</h3></div><button className="button button-secondary" onClick={()=>onGo('raci')}><Icon name="matrix" size={16}/> RACI</button></header>
      <div className="e360-owner-grid"><article><small>Primárny vlastník</small><strong>{entity.primaryOwner||'Neurčený'}</strong></article><article><small>Business owner</small><strong>{entity.businessOwner||'Neurčený'}</strong></article><article><small>Technický vlastník</small><strong>{entity.technicalOwner||'Neurčený'}</strong></article><article><small>Zástupca</small><strong>{entity.deputy||'Neurčený'}</strong></article></div>
      <div className="e360-oit-owners"><span>OIT vlastníci</span><strong>{entity.oitOwners.join(' · ')||'Neurčení'}</strong></div>
      <div className="e360-raci-list">{entity.raci.map(item=><article key={item.id}><strong>{item.process}</strong><span>{item.output}</span><small>{item.criticality}</small></article>)}</div>
    </section>
    <section className="e360-panel"><header className="e360-panel-head"><div><span>RIZIKÁ A KONTINUITA</span><h3>Čomu treba venovať pozornosť</h3></div><button className="button button-secondary" onClick={()=>onGo('risks')}><Icon name="risk" size={16}/> Riziká</button></header>
      <div className="e360-risk-list">{entity.risks.length?entity.risks.map(risk=><article key={risk.id}><div><strong>{risk.risk}</strong><p>{risk.measure||risk.impact}</p><small>{risk.owner||'Bez vlastníka'} · {risk.due||'bez termínu'}</small></div><Badge tone={statusTone(risk.priority)}>{risk.priority||risk.status}</Badge></article>):<div className="e360-empty-small"><Icon name="check" size={20}/><strong>Bez priamych rizík</strong><span>V registri rizík sa nenašla explicitná väzba.</span></div>}</div>
    </section>
  </div>
}

function RelationsView({entity,onGo}:{entity:Enterprise360Entity;onGo:Go}){
  const nodes=[
    {label:'Služba',value:entity.service?.name||'Bez služby',icon:'services' as const,go:'services'},
    {label:'Ľudia / RACI',value:entity.primaryOwner||entity.oitOwners[0]||'Bez vlastníka',icon:'people' as const,go:'raci'},
    {label:'Technológie',value:`${entity.cmdb.length} assetov · ${entity.oitDomains.length} domén`,icon:'systems' as const,go:'technology'},
    {label:'Financie',value:entity.finance.task?`Úloha ${entity.finance.taskCode} · ${compactMoney.format(entity.finance.spent)}`:'Bez priamej úlohy',icon:'capacity' as const,go:'itCosts'},
    {label:'Dodávatelia',value:entity.suppliers.map(item=>item.supplierName).join(' · ')||'Bez potvrdenej väzby',icon:'database' as const,go:'suppliers'},
    {label:'Zmluvy / SLA',value:entity.contracts.length?`${entity.contracts.length} prepojených zmlúv`:'Bez prepojenej zmluvy',icon:'calendar' as const,go:'contracts'},
    {label:'Práca',value:`${entity.openWorkCount} úloh · ${entity.activeChangeCount} zmien`,icon:'tasks' as const,go:'work'},
    {label:'Riziká',value:`${entity.openRiskCount} otvorených`,icon:'risk' as const,go:'risks'},
  ]
  return <section className="e360-panel"><header className="e360-panel-head"><div><span>RELATIONSHIP MAP</span><h3>{entity.title} ako jeden prepojený objekt</h3><p>Kliknutím na uzol sa otvorí zdrojový modul.</p></div><Badge tone="purple">360° model</Badge></header>
    <div className="e360-relation-map"><div className="e360-relation-center"><span><Icon name="shield" size={25}/></span><strong>{entity.title}</strong><small>{entity.businessLayer}</small></div>{nodes.map(node=><button key={node.label} onClick={()=>onGo(node.go)}><span><Icon name={node.icon} size={19}/></span><div><small>{node.label}</small><strong>{node.value}</strong></div><Icon name="arrow" size={14}/></button>)}</div>
  </section>
}

export default function Enterprise360({state,go}:{state:AppState;go:Go}){
  const entities=useMemo(()=>buildEnterprise360Entities(state),[state])
  const totals=useMemo(()=>enterprisePortfolioTotals(entities),[entities])
  const [query,setQuery]=useState('')
  const [selectedId,setSelectedId]=useState(()=>{
    const params=new URLSearchParams(location.hash.split('?')[1]||'')
    const requested=params.get('entity')||''
    return entities.find(item=>item.id===requested)?.id||entities.find(item=>item.id==='crzp-aps')?.id||entities[0]?.id||''
  })
  const [tab,setTab]=useState<Tab>('overview')
  useEffect(()=>{
    const syncFromHash=()=>{
      const params=new URLSearchParams(location.hash.split('?')[1]||'')
      const requested=params.get('entity')||''
      if(requested&&entities.some(item=>item.id===requested))setSelectedId(requested)
    }
    syncFromHash()
    addEventListener('hashchange',syncFromHash)
    return()=>removeEventListener('hashchange',syncFromHash)
  },[entities])
  const filtered=useMemo(()=>{const q=normalize360(query);return q?entities.filter(entity=>entity.searchText.includes(q)||normalize360(entity.title).includes(q)):entities},[entities,query])
  const selected=entities.find(item=>item.id===selectedId)
  const entity=(query.trim()&&selected&&!filtered.some(item=>item.id===selected.id)?filtered[0]:selected)||filtered[0]||entities[0]
  const selectEntity=(id:string)=>{setSelectedId(id);setTab('overview');history.replaceState(null,'',`#/enterprise360?entity=${encodeURIComponent(id)}`)}
  if(!entity)return <div className="e360-empty-small"><strong>CVTI 360 nemá dostupné entity.</strong></div>
  const spentPct=pct(entity.finance.spent,entity.finance.budget)
  const expiring=entity.contracts.filter(contract=>{const days=dueDays(contract.validTo);return days!==null&&days>=0&&days<=180})
  return <div className="enterprise360">
    <PageHeader eyebrow="CVTI 360 · ENTERPRISE INTELLIGENCE" title="Jeden pohľad na systém, službu a všetky súvislosti" description="Systémy, ľudia, RACI, úlohy, technológie, assety, incidenty, projekty, dodávatelia, zmluvy a financie v jednej 360° vrstve nad existujúcimi modulmi." actions={<button className="button button-secondary" onClick={()=>go('portals')}><Icon name="dashboard" size={16}/> Hlavný panel</button>}/>

    <section className="e360-portfolio-strip">
      <article><span>Systémy a služby</span><strong>{totals.systems}</strong><small>{totals.critical} kritických</small></article>
      <article><span>Presne mapovaný rozpočet</span><strong>{compactMoney.format(totals.budget)}</strong><small>{compactMoney.format(totals.spent)} čerpanie</small></article>
      <article><span>Otvorená práca</span><strong>{totals.openWork}</strong><small>naprieč entitami</small></article>
      <article><span>Otvorené riziká</span><strong>{totals.openRisks}</strong><small>z registrov ORIS/OIT</small></article>
      <article><span>Prepojené assety</span><strong>{totals.assets}</strong><small>CMDB väzby</small></article>
      <article className="is-attention"><span>Attention</span><strong>{totals.attention}</strong><small>entít na kontrolu</small></article>
    </section>

    <div className="e360-layout">
      <aside className="e360-directory">
        <div className="e360-directory-search"><Icon name="search" size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Hľadať CRZP, systém, službu…"/></div>
        <div className="e360-directory-head"><span>PORTFÓLIO</span><strong>{filtered.length} entít</strong></div>
        <div className="e360-directory-list">{filtered.map(item=><button key={item.id} className={item.id===entity.id?'is-active':''} onClick={()=>selectEntity(item.id)}><span className={`e360-directory-score is-${toneForScore(item.readinessScore)}`}>{item.readinessScore}</span><div><strong>{item.title}</strong><small>{item.service?.category||item.businessLayer}</small><p>{item.finance.task?`Úloha ${item.finance.taskCode} · ${compactMoney.format(item.finance.spent)}`:`${item.cmdb.length} assetov · ${item.openWorkCount} úloh`}</p></div>{item.attentionScore>8&&<i>{item.attentionScore}</i>}</button>)}</div>
      </aside>

      <main className="e360-detail">
        <section className="e360-entity-hero">
          <div className="e360-entity-main"><div className="e360-entity-topline"><Badge tone={entity.criticality.toLowerCase().includes('krit')?'danger':'info'}>{entity.criticality}</Badge><span>{entity.confidence}</span><span>{entity.finance.task?`Financie · úloha ${entity.finance.taskCode}`:'Finančné mapovanie chýba'}</span></div><h2>{entity.title}</h2><p>{entity.businessLayer}</p><div className="e360-entity-tags">{entity.aliases.slice(0,5).map(alias=><span key={alias}>{alias}</span>)}</div></div>
          <div className="e360-score-card"><span>360 SKÓRE</span><strong>{entity.readinessScore}</strong><small>úplnosť + otvorené signály</small><div><i style={{width:`${entity.readinessScore}%`}}/></div></div>
        </section>

        <section className="e360-kpi-grid">
          <button onClick={()=>setTab('finance')}><span><Icon name="capacity" size={18}/></span><p><small>ČERPANIE</small><strong>{entity.finance.task?compactMoney.format(entity.finance.spent):'—'}</strong><em>{entity.finance.task?`${number.format(spentPct)} % rozpočtu`:'bez priameho mapovania'}</em></p></button>
          <button onClick={()=>setTab('work')}><span><Icon name="tasks" size={18}/></span><p><small>OTVORENÁ PRÁCA</small><strong>{entity.openWorkCount+entity.openIncidentCount+entity.openProblemCount}</strong><em>{entity.openWorkCount} úloh · {entity.openIncidentCount} ticketov</em></p></button>
          <button onClick={()=>setTab('technology')}><span><Icon name="cmdb" size={18}/></span><p><small>TECHNOLÓGIE</small><strong>{entity.cmdb.length}</strong><em>{entity.oitDomains.length} OIT domén</em></p></button>
          <button onClick={()=>setTab('governance')}><span><Icon name="risk" size={18}/></span><p><small>RIZIKÁ</small><strong>{entity.openRiskCount}</strong><em>{entity.highRiskCount} vysokých / kritických</em></p></button>
          <button onClick={()=>setTab('governance')}><span><Icon name="people" size={18}/></span><p><small>VLASTNÍK</small><strong className="is-text">{entity.primaryOwner||'Neurčený'}</strong><em>{entity.oitOwners.length} OIT väzieb</em></p></button>
          <button onClick={()=>setTab('relations')}><span><Icon name="substitute" size={18}/></span><p><small>VÄZBY</small><strong>{entity.suppliers.length+entity.contracts.length+entity.websites.length}</strong><em>dodávateľ · zmluva · web</em></p></button>
        </section>

        <nav className="e360-tabs">{([
          ['overview','Prehľad','dashboard'],['finance','Financie','capacity'],['work','Práca','tasks'],['technology','Technológie','systems'],['governance','Riadenie','shield'],['relations','Vzťahy','substitute'],
        ] as [Tab,string,'dashboard'|'capacity'|'tasks'|'systems'|'shield'|'substitute'][]).map(([key,label,icon])=><button key={key} className={tab===key?'is-active':''} onClick={()=>setTab(key)}><Icon name={icon} size={16}/>{label}</button>)}</nav>

        {tab==='overview'&&<div className="e360-section-stack">
          <div className="e360-two-col e360-overview-grid">
            <section className="e360-panel"><header className="e360-panel-head"><div><span>ATTENTION CENTER</span><h3>Čomu sa venovať</h3><p>Signály z dátovej úplnosti, rizík, ticketov a problem managementu.</p></div><Badge tone={entity.attentionScore>8?'danger':entity.attentionScore>4?'warning':'success'}>{entity.attentionScore} bodov</Badge></header><Attention entity={entity}/></section>
            <section className="e360-panel"><header className="e360-panel-head"><div><span>EXECUTIVE SNAPSHOT</span><h3>Riadiaci obraz</h3><p>Najdôležitejšie väzby na jednej obrazovke.</p></div><Badge tone={toneForScore(entity.readinessScore)}>360 skóre {entity.readinessScore}</Badge></header>
              <div className="e360-snapshot-grid"><article><small>Prevádzka</small><strong>{entity.runtimeLocation||'—'}</strong><span>{entity.environment||'—'}</span></article><article><small>Dodávatelia</small><strong>{entity.suppliers.length||'—'}</strong><span>{entity.suppliers.slice(0,2).map(item=>item.supplierName).join(' · ')||'väzba nepotvrdená'}</span></article><article><small>Zmluvy</small><strong>{entity.contracts.length}</strong><span>{expiring.length?`${expiring.length} do 180 dní`:'bez blízkej expirácie v dátach'}</span></article><article><small>Web / register</small><strong>{entity.websites.length}</strong><span>{entity.websites[0]?.url||'bez priamej väzby'}</span></article></div>
            </section>
          </div>
          <section className="e360-panel"><header className="e360-panel-head"><div><span>PREKLIKY DO ZDROJOV</span><h3>Otvoriť pôvodný modul</h3><p>CVTI 360 údaje nekopíruje – toto sú zdrojové pracovné priestory.</p></div></header><div className="e360-quick-grid"><QuickLink icon="capacity" label="IT náklady" detail={entity.finance.task?`Úloha ${entity.finance.taskCode} · drill-down platieb`:'Finančný register'} onClick={()=>go('itCosts')}/><QuickLink icon="systems" label="Technologický katalóg" detail="Platforma, služby a infraštruktúra" onClick={()=>go('technology')}/><QuickLink icon="cmdb" label="Asset Management" detail={`${entity.cmdb.length} súvisiacich aktív`} onClick={()=>go('cmdb')}/><QuickLink icon="tasks" label="Riadenie práce" detail="Úlohy, projekty a zmeny" onClick={()=>go('work')}/><QuickLink icon="database" label="Dodávatelia" detail={`${entity.suppliers.length} väzieb`} onClick={()=>go('suppliers')}/><QuickLink icon="shield" label="Service 360" detail="Prevádzkové a manažérske signály" onClick={()=>go('intelligence')}/></div></section>
        </div>}
        {tab==='finance'&&<FinanceView entity={entity} onGo={go}/>} 
        {tab==='work'&&<WorkView entity={entity} onGo={go}/>} 
        {tab==='technology'&&<TechnologyView entity={entity} onGo={go}/>} 
        {tab==='governance'&&<GovernanceView entity={entity} onGo={go}/>} 
        {tab==='relations'&&<RelationsView entity={entity} onGo={go}/>} 
      </main>
    </div>
  </div>
}
