import { useMemo, useState } from 'react'
import type { ActionItem, AppState } from '../types'
import { Badge, Icon } from '../components/UI'
import { oitData } from '../data/oitData'
import './FinancialOptimization.css'

const money=new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2})
const number=new Intl.NumberFormat('sk-SK',{maximumFractionDigits:1})

type Go=(view:string)=>void
export interface OptimizationEntity {
  name:string
  category:string
  amount:number
  modeRun:number
  modeChange:number
  raciLinks:number
  singleR:number
  route:string
}
export interface RunTrendPoint { year:number; amount:number }

function parseLocaleNumber(value:string){
  const match=String(value||'').replace(/\s/g,'').match(/-?\d+(?:[.,]\d+)?/)
  return match?Number(match[0].replace(',','.')):0
}
function isoDate(date:Date){return date.toISOString().slice(0,10)}
function dueIn(days:number){const date=new Date();date.setDate(date.getDate()+days);return isoDate(date)}
function actionKey(type:string,subject:string){return `FIN25:${type}:${subject}`}
function actionMatches(action:ActionItem,key:string){return String(action.note||'').includes(`[${key}]`)}
function actionTone(status:string){
  if(status==='Ukončené')return 'success' as const
  if(status==='Blokované')return 'danger' as const
  if(status==='Rieši sa'||status==='Schválené')return 'info' as const
  return 'warning' as const
}

export default function FinancialOptimization({
  state,year,periodLabel,periodMode,runTrend,selectedTotal,runTotal,changeTotal,entities,canEdit,currentUser,onActionsChange,go,
}:{
  state:AppState
  year:number
  periodLabel:string
  periodMode:'h1'|'fullYear'
  runTrend:RunTrendPoint[]
  selectedTotal:number
  runTotal:number
  changeTotal:number
  entities:OptimizationEntity[]
  canEdit:boolean
  currentUser:string
  onActionsChange:(actions:ActionItem[])=>void
  go:Go
}){
  const [tab,setTab]=useState<'actions'|'run'|'owners'|'dc'|'singleR'>('actions')
  const financialActions=useMemo(()=>state.actions.filter(action=>String(action.note||'').includes('[FIN25:')),[state.actions])
  const baseline=runTrend.find(point=>Math.abs(point.amount)>0.004)?.amount||0
  const maxRun=Math.max(...runTrend.map(point=>Math.abs(point.amount)),1)
  const ownerEntities=entities.filter(entity=>Math.abs(entity.amount)>0.004).slice(0,8)
  const singleREntities=entities.filter(entity=>entity.singleR>0).sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount))
  const singleRTotal=singleREntities.reduce((sum,entity)=>sum+entity.amount,0)
  const dc=entities.find(entity=>entity.name==='DC VaV')
  const dcCost=dc?.amount||0
  const racks=new Set(oitData.rackInventory.map(item=>item.rack).filter(Boolean)).size
  const devices=oitData.rackInventory.filter(item=>item.device&&!/voľn|voln/i.test(item.device)).length
  const storage=oitData.capacity.find(item=>item.name==='Primárne úložisko')
  const storageUsed=parseLocaleNumber(storage?.used||'')
  const storageTotal=parseLocaleNumber(storage?.total||'')
  const cpu=oitData.capacity.find(item=>item.name==='CPU')
  const memory=oitData.capacity.find(item=>item.name==='Pamäť')

  function createAction(config:{type:string;subject:string;title:string;output:string;kpi:string;dependency:string;owner:string;decision:string;days?:number}){
    const key=actionKey(config.type,config.subject)
    if(state.actions.some(action=>actionMatches(action,key)))return
    const now=new Date()
    const action:ActionItem={
      id:`FIN-${now.getTime().toString().slice(-8)}`,
      horizon:config.days&&config.days<=30?'0–30 dní':config.days&&config.days<=90?'0–90 dní':'3–12 mesiacov',
      title:config.title,
      expectedOutput:config.output,
      proposedOwner:config.owner,
      confirmedOwner:'',
      start:isoDate(now),
      due:dueIn(config.days??90),
      status:'Navrhnuté',
      dependency:config.dependency,
      kpi:config.kpi,
      directorDecision:config.decision,
      note:`[${key}] Vytvorené z Financial Actions & Optimization v0.26 · ${year} · ${periodLabel} · ${currentUser}`,
    }
    onActionsChange([...state.actions,action])
  }
  function updateAction(id:string,patch:Partial<ActionItem>){onActionsChange(state.actions.map(action=>action.id===id?{...action,...patch}:action))}

  const quickActions=[
    {
      type:'RUN',subject:'BASELINE',title:'Zaviesť a schváliť RUN baseline IT prevádzky',
      output:'Potvrdený RUN baseline, medziročná indexácia a pravidlo oddelenia RUN od CHANGE.',
      kpi:'RUN baseline €; medziročná zmena %; podiel RUN/CHANGE',dependency:'Finančné dáta IT nákladov a rozpočtové rozhodnutie',owner:'Cost-owner IT prevádzky – určiť',decision:'Schváliť baseline a pravidlo jeho ročnej aktualizácie.',days:60,
    },
    {
      type:'OWNER',subject:'TOP_COSTS',title:'Určiť cost-ownerov pre najväčšie IT nákladové oblasti',
      output:'Pre TOP nákladové oblasti je potvrdený cost-owner, SLA/KPI a optimalizačný plán.',
      kpi:'Pokrytie TOP nákladov cost-ownerom ≥ 90 %',dependency:'RACI, služby, zmluvy a register dodávateľov',owner:'Vedúci odborov 3.1/3.2',decision:'Potvrdiť vlastníkov nákladov a KPI.',days:90,
    },
    {
      type:'DC',subject:'UNIT_ECONOMICS',title:'Zaviesť jednotkové náklady DC VaV',
      output:'Pravidelne sledované €/rack, €/evidované zariadenie a €/TB spolu s využitím kapacity.',
      kpi:'€/rack; €/zariadenie; €/TB; využitie CPU/RAM/storage',dependency:'IT náklady DC VaV + kapacitný snapshot + dostupnosť/energia',owner:'Cost-owner DC VaV – určiť',decision:'Schváliť sadu jednotkových KPI a periodicitu reportingu.',days:90,
    },
    {
      type:'RACI',subject:'SINGLE_R',title:'Znížiť finančnú expozíciu služieb so single-R rizikom',
      output:'Najdrahšie služby so single-R majú potvrdenú zastupiteľnosť alebo akceptované riziko.',
      kpi:'€ v single-R riziku; počet single-R väzieb; pokrytie zástupcom',dependency:'COST × SERVICE × RACI a matica zastupiteľnosti',owner:'Vedúci služieb / RACI vlastníci',decision:'Prioritizovať zastupiteľnosť podľa finančného dopadu.',days:90,
    },
    {
      type:'CAPEX',subject:'7XX',title:'Doplniť CAPEX/7xx zdroj pre úplný IT TCO',
      output:'Do finančného modelu je doplnený samostatný kapitálový pohľad bez miešania s bežnými 632–637.',
      kpi:'Pokrytie RUN + CHANGE + CAPEX; kontrolný rozdiel voči zdroju',dependency:'Dostupnosť a metodické potvrdenie 7xx dát',owner:'Financie + IT – určiť',decision:'Potvrdiť zdroj a metodiku CAPEX.',days:180,
    },
  ]

  return <section className="panel finopt-panel">
    <div className="panel-heading"><div><span className="eyebrow">FINANCIAL ACTIONS & OPTIMIZATION</span><h3>Od odporúčania k riadeniu</h3><p>RUN baseline, cost-owneri, DC VaV unit economics a finančne prioritizované RACI riziká. Výpočty rešpektujú aktuálny rok aj obdobie <strong>{periodLabel}</strong>.</p></div><Badge tone={financialActions.some(a=>a.status!=='Ukončené')?'warning':'success'}>{financialActions.filter(a=>a.status!=='Ukončené').length} otvorených</Badge></div>
    <div className="finopt-tabs">
      <button className={tab==='actions'?'active':''} onClick={()=>setTab('actions')}><Icon name="tasks" size={16}/> Riadiace opatrenia</button>
      <button className={tab==='run'?'active':''} onClick={()=>setTab('run')}><Icon name="capacity" size={16}/> RUN baseline</button>
      <button className={tab==='owners'?'active':''} onClick={()=>setTab('owners')}><Icon name="user" size={16}/> Cost-owneri</button>
      <button className={tab==='dc'?'active':''} onClick={()=>setTab('dc')}><Icon name="database" size={16}/> DC VaV</button>
      <button className={tab==='singleR'?'active':''} onClick={()=>setTab('singleR')}><Icon name="risk" size={16}/> COST × single-R</button>
    </div>

    {tab==='actions'&&<div className="finopt-actions-layout">
      <div className="finopt-action-catalog">{quickActions.map(item=>{const key=actionKey(item.type,item.subject);const existing=state.actions.find(action=>actionMatches(action,key));return <article key={key} className="finopt-action-card"><div><Badge tone={existing?actionTone(existing.status):'neutral'}>{existing?existing.status:'Návrh'}</Badge><h4>{item.title}</h4><p>{item.output}</p><small>KPI: {item.kpi}</small></div>{existing?<button className="button button-secondary button-small" onClick={()=>setTab(item.type==='RUN'?'run':item.type==='DC'?'dc':item.type==='RACI'?'singleR':'owners')}>Otvoriť detail</button>:canEdit?<button className="button button-primary button-small" onClick={()=>createAction(item)}><Icon name="plus" size={14}/> Vytvoriť opatrenie</button>:<span className="finopt-readonly">vytvára admin/manager</span>}</article>})}</div>
      <aside className="finopt-tracked"><h4>Evidované finančné opatrenia</h4>{financialActions.length===0?<p className="muted-copy">Zatiaľ nebolo vytvorené žiadne finančné opatrenie.</p>:financialActions.map(action=><article key={action.id}><div><Badge tone={actionTone(action.status)}>{action.status}</Badge><strong>{action.title}</strong><small>{action.kpi}</small></div>{canEdit?<div className="finopt-action-edit"><select value={action.status} onChange={(e:any)=>updateAction(action.id,{status:e.target.value})}><option>Navrhnuté</option><option>Schválené</option><option>Rieši sa</option><option>Blokované</option><option>Ukončené</option></select><input value={action.confirmedOwner} onChange={(e:any)=>updateAction(action.id,{confirmedOwner:e.target.value})} placeholder="Potvrdený vlastník"/><input type="date" value={action.due} onChange={(e:any)=>updateAction(action.id,{due:e.target.value})}/></div>:<small>{action.confirmedOwner||action.proposedOwner} · do {action.due||'—'}</small>}</article>)}</aside>
    </div>}

    {tab==='run'&&<div className="finopt-run-grid">
      <div className="finopt-metric-card"><span>RUN {year} · {periodLabel}</span><strong>{money.format(runTotal)}</strong><small>{selectedTotal?number.format(runTotal/selectedTotal*100):'0'} % aktuálneho IT výberu</small></div>
      <div className="finopt-metric-card"><span>CHANGE {year} · {periodLabel}</span><strong>{money.format(changeTotal)}</strong><small>držané oddelene od RUN baseline</small></div>
      <div className="finopt-run-chart">{runTrend.map(point=>{const index=baseline?point.amount/baseline*100:0;return <div key={point.year} className="finopt-run-row"><b>{point.year}</b><span><i style={{width:`${Math.max(1,Math.abs(point.amount)/maxRun*100)}%`}}/></span><strong>{money.format(point.amount)}</strong><em>{baseline?`index ${number.format(index)}`:'—'}</em></div>})}</div>
      <div className="finopt-note"><Icon name="shield" size={18}/><p><strong>Interpretácia:</strong> baseline je pracovný manažérsky ukazovateľ pre obdobie {periodLabel}, nie schválený rozpočet. {periodMode==='fullYear'?'Celoročný režim používa konzervatívny full-year IT výrez 2023–2025.':'H1 režim je auditovateľný detail január–jún 2022–2026.'} Pri zmene rozsahu dát alebo služieb treba baseline metodicky prepočítať.</p></div>
    </div>}

    {tab==='owners'&&<div className="finopt-owner-table"><div className="finopt-owner-head"><span>Oblasť</span><span>Náklad</span><span>Podiel</span><span>RACI</span><span>Riadenie</span></div>{ownerEntities.map(entity=>{const key=actionKey('OWNER',entity.name);const existing=state.actions.find(a=>actionMatches(a,key));return <div className="finopt-owner-row" key={entity.name}><div><strong>{entity.name}</strong><small>{entity.category}</small></div><b>{money.format(entity.amount)}</b><span>{selectedTotal?number.format(entity.amount/selectedTotal*100):'0'} %</span><span className={entity.singleR?'danger-text':''}>{entity.raciLinks} väzieb · {entity.singleR} single-R</span><div>{entity.route&&<button className="text-button" onClick={()=>go(entity.route)}>Detail</button>}{existing?<Badge tone={actionTone(existing.status)}>{existing.status}</Badge>:canEdit&&<button className="text-button" onClick={()=>createAction({type:'OWNER',subject:entity.name,title:`Určiť cost-ownera: ${entity.name}`,output:`Potvrdený vlastník nákladov, SLA/KPI a optimalizačný plán pre ${entity.name}.`,kpi:'Ročný náklad; SLA/KPI; odchýlka od baseline',dependency:'Finančné dáta + služba/zmluva/RACI',owner:'Cost-owner – určiť',decision:'Potvrdiť vlastníka a KPI.',days:90})}>+ Opatrenie</button>}</div></div>})}</div>}

    {tab==='dc'&&<div className="finopt-dc-grid">
      <article><span>Náklad DC VaV · {year} · {periodLabel}</span><strong>{money.format(dcCost)}</strong><small>klasifikovaný nákladový výrez</small></article>
      <article><span>€/rack</span><strong>{racks?money.format(dcCost/racks):'—'}</strong><small>{racks} evidovaných rackov v DC VaV</small></article>
      <article><span>€/evidované zariadenie</span><strong>{devices?money.format(dcCost/devices):'—'}</strong><small>{devices} neprázdnych inventárnych položiek</small></article>
      <article><span>€/TB využitého storage</span><strong>{storageUsed?money.format(dcCost/storageUsed):'—'}</strong><small>{storageUsed?`${number.format(storageUsed)} TB využitých`:'kapacita nedostupná'}</small></article>
      <article><span>Storage využitie</span><strong>{storage?`${number.format(storage.percent)} %`:'—'}</strong><small>{storage?`${storage.used} / ${storage.total}`:'—'}</small></article>
      <article><span>CPU / RAM využitie</span><strong>{cpu&&memory?`${number.format(cpu.percent)} / ${number.format(memory.percent)} %`:'—'}</strong><small>CPU / pamäť podľa kapacitného snapshotu</small></article>
      <div className="finopt-note span-all"><Icon name="warning" size={18}/><p><strong>Orientačné unit economics:</strong> finančný a kapacitný snapshot nemusia mať rovnaký referenčný okamih a nejde o plný TCO. €/rack, €/zariadenie a €/TB slúžia na trend a diskusiu; pred rozhodnutím treba potvrdiť metodiku denominatorov, energiu, dostupnosť a rozsah CAPEX.</p></div>
    </div>}

    {tab==='singleR'&&<div className="finopt-single"><div className="finopt-single-summary"><article><span>Finančná expozícia</span><strong>{money.format(singleRTotal)}</strong><small>{selectedTotal?number.format(singleRTotal/selectedTotal*100):'0'} % výberu</small></article><article><span>Dotknuté oblasti</span><strong>{singleREntities.length}</strong><small>min. jedna RACI väzba s jediným R</small></article></div><div className="finopt-risk-list">{singleREntities.map(entity=>{const key=actionKey('RACI',entity.name);const existing=state.actions.find(a=>actionMatches(a,key));return <article key={entity.name}><div><Badge tone={entity.amount/Math.max(selectedTotal,1)>.2?'danger':'warning'}>{entity.singleR}× single-R</Badge><h4>{entity.name}</h4><p>{money.format(entity.amount)} · {selectedTotal?number.format(entity.amount/selectedTotal*100):'0'} % finančného výberu · {entity.raciLinks} RACI väzieb</p></div><div>{entity.route&&<button className="button button-secondary button-small" onClick={()=>go(entity.route)}>Otvoriť</button>}{existing?<Badge tone={actionTone(existing.status)}>{existing.status}</Badge>:canEdit&&<button className="button button-primary button-small" onClick={()=>createAction({type:'RACI',subject:entity.name,title:`Znížiť single-R riziko: ${entity.name}`,output:`Potvrdená zastupiteľnosť alebo manažérske akceptovanie rizika pre ${entity.name}.`,kpi:'Počet single-R; € expozícia; pokrytie zástupcom',dependency:'RACI + zastupiteľnosť + služba',owner:'Vlastník služby/RACI – určiť',decision:'Určiť zástupcu alebo akceptovať riziko.',days:60})}>+ Opatrenie</button>}</div></article>})}</div></div>}

    <div className="finopt-capex-note"><Icon name="warning" size={18}/><div><strong>CHANGE ≠ úplný CAPEX obraz.</strong><span>Zdrojový IT výrez pokrýva najmä bežné položky 632–637. Kapitálové 7xx sa bez samostatného zdroja do TCO nepripočítavajú.</span></div></div>
  </section>
}
