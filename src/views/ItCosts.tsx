import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { AppState } from '../types'
import { Badge, Icon, PageHeader } from '../components/UI'
import { oitData } from '../data/oitData'
import { splitRaciRoles } from '../lib/raciAnalytics'
import { resolveSupplierName } from '../lib/supplierDirectory'
import data from '../data/itCosts.json'
import fullYearData from '../data/itCostsFullYear.json'
import paymentData from '../data/contractPayments.json'
import ContractSpending from './ContractSpending'
import FinancialOptimization from './FinancialOptimization'
import './ItCosts.css'

type Go = (view:string)=>void
type Confidence = 'vysoká'|'stredná'
type CostMode = 'Prevádzka'|'Rozvoj'

interface CostValue { year:number; amount:number; rowCount:number }
interface CostEvidenceYear { year:number; topDocument:string; documentCount:number; supplierIds:string[]; zakCount:number }
interface CostItem {
  id:string
  kpd:string
  ppd:string
  label:string
  category:string
  mode:CostMode
  entity:string
  confidence:Confidence
  reason:string
  values:CostValue[]
  totalAmount:number
  topDocument:string
  latestDocumentCount:number
  latestZakCount:number
  evidenceByYear?:CostEvidenceYear[]
}
interface PaymentRow {
  supplierId:string
  supplierLabel:string
  document:string
  note:string
  kpd:string
  ppd:string
  amount:number
}
interface PaymentDataset { payments:PaymentRow[] }
interface EvidenceSupplier { key:string; name:string; ico:string; match:'doklad'|'položka'|'none'; multiple:number }

interface CostDataset {
  meta:{
    title:string
    sourceTitle:string
    sourceGeneratedAt:string
    periodLabel:string
    years:number[]
    comparedMonths:number[]
    classificationVersion:string
    validationSourceTitle?:string
    validationPeriod?:string
    validationTotalsMatch?:boolean|null
    method:string
    exclusions:string[]
    coverageNote?:string
  }
  sourceTotals:{year:number;amount:number;rowCount:number}[]
  items:CostItem[]
}

const h1Dataset=data as CostDataset
const fullYearDataset=fullYearData as CostDataset
const paymentDataset=paymentData as PaymentDataset
const money=new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2})
const compactMoney=new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR',notation:'compact',maximumFractionDigits:1})
const number=new Intl.NumberFormat('sk-SK',{maximumFractionDigits:1})

function amountFor(item:CostItem,year:number){return item.values.find(value=>value.year===year)?.amount??0}
function evidenceForYear(item:CostItem,year:number){return item.evidenceByYear?.find(entry=>entry.year===year)}
function documentForYear(item:CostItem,year:number){return evidenceForYear(item,year)?.topDocument||item.topDocument||'—'}
function percent(value:number,total:number){return total?value/total*100:0}
function norm(value:string){return value.toLocaleLowerCase('sk-SK').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function normalizedCode(value:string){return String(value||'').replace(/^0+/,'')||'0'}
function evidenceSupplierFor(item:CostItem,year:number,state:AppState):EvidenceSupplier{
  const direct=item.evidenceByYear?.find(entry=>entry.year===year)
  if(direct?.supplierIds?.length){
    const primary=direct.supplierIds[0]
    const rawIco=String(primary||'').replace(/\D/g,'')
    const ico=rawIco?rawIco.padStart(8,''):''
    const fallback=ico?`Firma / IČO ${ico}`:'Bez IČO / interné položky'
    return {
      key:primary,
      name:resolveSupplierName(state,primary,fallback),
      ico,
      match:direct.topDocument&&direct.topDocument!=='—'?'doklad':'položka',
      multiple:Math.max(0,direct.supplierIds.length-1),
    }
  }
  if(year!==2026)return {key:'',name:'',ico:'',match:'none',multiple:0}
  const exactDocument=String(documentForYear(item,year)||'').trim()
  let candidates=exactDocument&&exactDocument!=='—'
    ? paymentDataset.payments.filter(payment=>payment.document===exactDocument)
    : []
  let match:EvidenceSupplier['match']=candidates.length?'doklad':'none'
  if(!candidates.length){
    const label=norm(item.label)
    candidates=paymentDataset.payments.filter(payment=>
      norm(payment.note)===label&&
      normalizedCode(payment.kpd)===normalizedCode(item.kpd)&&
      normalizedCode(payment.ppd)===normalizedCode(item.ppd)
    )
    if(candidates.length)match='položka'
  }
  if(!candidates.length)return {key:'',name:'',ico:'',match:'none',multiple:0}
  const grouped=new Map<string,number>()
  candidates.forEach(payment=>{
    const id=String(payment.supplierId||'bez-ico')
    grouped.set(id,(grouped.get(id)||0)+Math.abs(Number(payment.amount)||0))
  })
  const suppliers=[...grouped.entries()].sort((a,b)=>b[1]-a[1])
  const primary=suppliers[0]?.[0]||''
  if(!primary)return {key:'',name:'',ico:'',match:'none',multiple:0}
  const rawIco=primary.replace(/\D/g,'')
  const ico=primary==='bez-ico'?'':rawIco.length>8?rawIco:rawIco.padStart(8,'0')
  const fallback=primary==='bez-ico'?'Bez IČO / interné položky':`Firma / IČO ${primary}`
  return {
    key:primary,
    name:resolveSupplierName(state,primary,fallback),
    ico,
    match,
    multiple:Math.max(0,suppliers.length-1),
  }
}

function signedPct(value:number){return `${value>0?'+':''}${number.format(value)} %`}
function roleCount(assignments:Record<string,unknown>,role:'R'|'A'){return Object.values(assignments).filter(value=>splitRaciRoles(value).includes(role)).length}

const entityAliases:Record<string,string[]>={
  'DC VaV':['dc vav','dcvav','dátové centrum','datove centrum'],
  'KOMIS':['komis'],
  'CRZP/APS':['crzp','aps'],
  'CREPČ/CREUČ':['crepč','creuč','crepc','creuc'],
  'DMS / Fabasoft':['dms','fabasoft','registratúra','registratura'],
  'VEMA':['vema'],
  'MUVV':['muvv','mvl'],
  'KIS DAWINCI':['dawinci'],
  'ERAPORTÁL':['eraportál','eraportal'],
  'ESET':['eset','era'],
  'Mitel':['mitel'],
}

function relatedRoute(entity:string,category:string){
  if(entity==='DC VaV')return 'oitDc'
  if(entity==='KOMIS')return 'oitSystems'
  if(['CRZP/APS','CREPČ/CREUČ','DMS / Fabasoft','VEMA','MUVV','KIS DAWINCI','ERAPORTÁL'].includes(entity))return 'informationSystems'
  if(entity==='ESET'||entity==='Mitel'||category==='Bezpečnosť a sieť')return 'technology'
  if(category==='Telekomunikácie'||category==='Konektivita a hosting'||category==='Sieť a telekomunikačná technika')return 'oitNetwork'
  if(category==='HW a koncové zariadenia'||category==='Servis a údržba IT')return 'cmdb'
  if(category==='Licencie, softvér a cloud')return 'technology'
  return ''
}

function raciContext(entity:string,state:AppState){
  const aliases=entityAliases[entity]??[]
  if(!aliases.length)return {oris:0,oit:0,singleR:0,missingA:0}
  const match=(value:string)=>{const text=norm(value);return aliases.some(alias=>text.includes(norm(alias)))}
  const orisRows=state.raci.filter(row=>match(`${row.area} ${row.process} ${row.output} ${row.note}`))
  const oitRows=oitData.raciAreas.flatMap(area=>area.rows.map(row=>({area:area.title,row}))).filter(({area,row})=>match(`${area} ${row.process} ${row.note}`))
  const all=[...orisRows.map(row=>row.assignments),...oitRows.map(({row})=>row.assignments)]
  return {
    oris:orisRows.length,
    oit:oitRows.length,
    singleR:all.filter(assignments=>roleCount(assignments,'R')===1).length,
    missingA:all.filter(assignments=>roleCount(assignments,'A')===0).length,
  }
}

function downloadCsv(filename:string,rows:string[][]){
  const csv=rows.map(row=>row.map(cell=>`"${String(cell).replaceAll('"','""')}"`).join(';')).join('\n')
  const blob=new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8'})
  const url=URL.createObjectURL(blob)
  const link=document.createElement('a')
  link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url)
}

export default function ItCosts({state,go,canEdit,currentUser,onActionsChange}:{state:AppState;go:Go;canEdit:boolean;currentUser:string;onActionsChange:(actions:AppState['actions'])=>void}){
  const [period,setPeriod]=useState<'h1'|'fullYear'>('h1')
  const dataset=period==='fullYear'?fullYearDataset:h1Dataset
  const years=dataset.meta.years
  const [year,setYear]=useState(h1Dataset.meta.years.at(-1)??2026)
  const [mode,setMode]=useState('Všetko')
  const [category,setCategory]=useState('Všetko')
  const [confidence,setConfidence]=useState('Všetko')
  const [search,setSearch]=useState('')
  const [financeView,setFinanceView]=useState<'costs'|'contracts'>('costs')
  const [evidenceSearch,setEvidenceSearch]=useState('')
  const [evidenceEntity,setEvidenceEntity]=useState('Všetko')
  const [evidenceSupplier,setEvidenceSupplier]=useState('Všetko')
  const [evidenceSort,setEvidenceSort]=useState<'amount'|'name'|'code'|'supplier'>('amount')
  const [evidenceLimit,setEvidenceLimit]=useState(100)
  const [evidenceDense,setEvidenceDense]=useState(true)
  useEffect(()=>{if(!years.includes(year))setYear(years.at(-1)??2026)},[period,year,years])
  const categories=useMemo(()=>Array.from(new Set(dataset.items.map(item=>item.category))).sort((a,b)=>a.localeCompare(b,'sk')),[period])

  const baseFiltered=useMemo(()=>dataset.items.filter(item=>{
    if(mode!=='Všetko'&&item.mode!==mode)return false
    if(category!=='Všetko'&&item.category!==category)return false
    if(confidence!=='Všetko'&&item.confidence!==confidence)return false
    if(search&&!norm(`${item.label} ${item.entity} ${item.category} ${item.kpd} ${item.ppd} ${documentForYear(item,year)}`).includes(norm(search)))return false
    return true
  }),[mode,category,confidence,search,period])

  const rows=useMemo(()=>baseFiltered.filter(item=>Math.abs(amountFor(item,year))>0.004).sort((a,b)=>Math.abs(amountFor(b,year))-Math.abs(amountFor(a,year))),[baseFiltered,year])
  const selectedTotal=rows.reduce((sum,item)=>sum+amountFor(item,year),0)
  const runTotal=rows.filter(item=>item.mode==='Prevádzka').reduce((sum,item)=>sum+amountFor(item,year),0)
  const changeTotal=rows.filter(item=>item.mode==='Rozvoj').reduce((sum,item)=>sum+amountFor(item,year),0)
  const highConfidence=rows.filter(item=>item.confidence==='vysoká').reduce((sum,item)=>sum+amountFor(item,year),0)
  const sourceTotal=dataset.sourceTotals.find(item=>item.year===year)?.amount??0

  const trend=years.map(trendYear=>({year:trendYear,amount:baseFiltered.reduce((sum,item)=>sum+amountFor(item,trendYear),0)}))
  const maxTrend=Math.max(...trend.map(item=>Math.abs(item.amount)),1)
  const previous=trend.find(item=>item.year===year-1)?.amount??0
  const yearChange=previous?((selectedTotal/previous)-1)*100:null

  const categoryTotals=Array.from(rows.reduce((map,item)=>{
    const current=map.get(item.category)??0;map.set(item.category,current+amountFor(item,year));return map
  },new Map<string,number>())).map(([name,amount])=>({name,amount})).sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount))
  const maxCategory=Math.max(...categoryTotals.map(item=>Math.abs(item.amount)),1)

  const entityTotals=Array.from(rows.reduce((map,item)=>{
    const current=map.get(item.entity)??{amount:0,category:item.category,modeRun:0,modeChange:0,activeYears:new Set<number>()}
    const amount=amountFor(item,year)
    current.amount+=amount
    if(item.mode==='Prevádzka')current.modeRun+=amount;else current.modeChange+=amount
    item.values.filter(value=>Math.abs(value.amount)>0.004).forEach(value=>current.activeYears.add(value.year))
    map.set(item.entity,current);return map
  },new Map<string,{amount:number;category:string;modeRun:number;modeChange:number;activeYears:Set<number>}>())).map(([name,value])=>({name,...value})).sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount))

  const topEntities=entityTotals.filter(item=>Math.abs(item.amount)>0.004).slice(0,8)
  const entityContexts=new Map(entityTotals.map(item=>[item.name,raciContext(item.name,state)]))
  const topTwoShare=percent(topEntities.slice(0,2).reduce((sum,item)=>sum+item.amount,0),selectedTotal)
  const sourceShare=percent(selectedTotal,sourceTotal)
  const runShare=percent(runTotal,selectedTotal)
  const highShare=percent(highConfidence,selectedTotal)
  const largestCategory=categoryTotals[0]
  const raciMappedAmount=entityTotals.reduce((sum,item)=>{const context=entityContexts.get(item.name);return sum+((context?.oris??0)+(context?.oit??0)>0?item.amount:0)},0)
  const raciMappedShare=percent(raciMappedAmount,selectedTotal)
  const singleRExposure=entityTotals.reduce((sum,item)=>sum+((entityContexts.get(item.name)?.singleR??0)>0?item.amount:0),0)
  const singleRExposureShare=percent(singleRExposure,selectedTotal)
  const evidenceEntities=useMemo(()=>Array.from(new Set(rows.map(item=>item.entity))).sort((a,b)=>a.localeCompare(b,'sk')),[rows])
  const evidenceSupplierMeta=useMemo(()=>new Map(rows.map(item=>[item.id,evidenceSupplierFor(item,year,state)])),[rows,year,state])
  const evidenceSuppliers=useMemo(()=>{
    const unique=new Map<string,string>()
    evidenceSupplierMeta.forEach(value=>{if(value.key)unique.set(value.key,value.name)})
    return [...unique.entries()].sort((a,b)=>a[1].localeCompare(b[1],'sk'))
  },[evidenceSupplierMeta])
  const evidenceRows=useMemo(()=>{
    const result=rows.filter(item=>{
      const supplier=evidenceSupplierMeta.get(item.id)??{key:'',name:'',ico:'',match:'none',multiple:0}
      if(evidenceEntity!=='Všetko'&&item.entity!==evidenceEntity)return false
      if(evidenceSupplier!=='Všetko'&&supplier.key!==evidenceSupplier)return false
      if(evidenceSearch&&!norm(`${item.label} ${item.reason} ${item.entity} ${item.category} ${item.kpd} ${item.ppd} ${documentForYear(item,year)} ${supplier.name} ${supplier.ico}`).includes(norm(evidenceSearch)))return false
      return true
    })
    return [...result].sort((a,b)=>{
      if(evidenceSort==='name')return a.label.localeCompare(b.label,'sk')
      if(evidenceSort==='code')return `${a.kpd}/${a.ppd}`.localeCompare(`${b.kpd}/${b.ppd}`,'sk')
      if(evidenceSort==='supplier')return (evidenceSupplierMeta.get(a.id)?.name||'ZZZ').localeCompare(evidenceSupplierMeta.get(b.id)?.name||'ZZZ','sk')
      return Math.abs(amountFor(b,year))-Math.abs(amountFor(a,year))
    })
  },[rows,evidenceEntity,evidenceSupplier,evidenceSearch,evidenceSort,year,evidenceSupplierMeta])

  const managementSignals=[
    {
      title:'RUN dominuje rozpočtu',
      value:`${number.format(runShare)} %`,
      text:`Prevádzka tvorí ${money.format(runTotal)} z klasifikovaného IT objemu. Rozvoj/obnova predstavuje ${money.format(changeTotal)}.`,
      tone:runShare>=85?'warning':'info',
    },
    {
      title:'Koncentrácia nákladov',
      value:`${number.format(topTwoShare)} %`,
      text:topEntities.length>=2?`Dve najväčšie oblasti – ${topEntities[0].name} a ${topEntities[1].name} – tvoria väčšinu nákladov vo vybranom roku.`:'Nedostatok dát pre porovnanie.',
      tone:topTwoShare>=70?'danger':'info',
    },
    {
      title:'Najväčší nákladový blok',
      value:largestCategory?compactMoney.format(largestCategory.amount):'—',
      text:largestCategory?`${largestCategory.name} tvorí ${number.format(percent(largestCategory.amount,selectedTotal))} % vybraného IT objemu.`:'Bez dát.',
      tone:'info',
    },
    {
      title:'Dôvera klasifikácie',
      value:`${number.format(highShare)} %`,
      text:`Podiel nákladov s explicitnou IT/DC väzbou. Zvyšok vychádza z jednoznačných ekonomických podpoložiek (stredná dôvera).`,
      tone:highShare>=75?'success':'warning',
    },
    {
      title:'Pokrytie COST × RACI',
      value:`${number.format(raciMappedShare)} %`,
      text:`${money.format(raciMappedAmount)} z vybraného objemu je možné priamo spojiť s existujúcimi procesmi RACI 3.1/3.2 podľa názvov systémov a služieb.`,
      tone:raciMappedShare>=70?'success':'warning',
    },
    {
      title:'Náklad v single-R riziku',
      value:`${number.format(singleRExposureShare)} %`,
      text:`${money.format(singleRExposure)} je naviazaných na oblasti, kde aspoň jedna nájdená RACI väzba stojí na jedinom vykonávateľovi R.`,
      tone:singleRExposureShare>=50?'danger':singleRExposureShare>=25?'warning':'success',
    },
  ] as const

  const runTrend=years.map(trendYear=>({
    year:trendYear,
    amount:dataset.items.filter(item=>{
      if(item.mode!=='Prevádzka')return false
      if(category!=='Všetko'&&item.category!==category)return false
      if(confidence!=='Všetko'&&item.confidence!==confidence)return false
      if(search&&!norm(`${item.label} ${item.entity} ${item.category} ${item.kpd} ${item.ppd} ${documentForYear(item,year)}`).includes(norm(search)))return false
      return true
    }).reduce((sum,item)=>sum+amountFor(item,trendYear),0),
  }))
  const optimizationEntities=entityTotals.map(entity=>{
    const context=entityContexts.get(entity.name)??raciContext(entity.name,state)
    return {
      name:entity.name,
      category:entity.category,
      amount:entity.amount,
      modeRun:entity.modeRun,
      modeChange:entity.modeChange,
      raciLinks:context.oris+context.oit,
      singleR:context.singleR,
      route:relatedRoute(entity.name,entity.category),
    }
  })

  function exportCurrent(){
    downloadCsv(`it-naklady-${year}-${period==='fullYear'?'jan-dec':'jan-jun'}.csv`,[
      ['Rok','Režim','Kategória','Entita','Dodávateľ','IČO','KPD','PPD','Položka','Suma','Dôvera','TOP doklad','Dôvod klasifikácie'],
      ...rows.map(item=>{const supplier=evidenceSupplierFor(item,year,state);return [String(year),item.mode,item.category,item.entity,supplier.name,supplier.ico,item.kpd,item.ppd,item.label,String(amountFor(item,year)),item.confidence,documentForYear(item,year),item.reason]}),
    ])
  }

  return <div className="itc-page">
    <PageHeader eyebrow="Spoločný finančný pohľad 3.1 × 3.2" title={financeView==='costs'?"IT náklady · prevádzka, rozvoj a infraštruktúra":"SIT 2026 · čerpanie kontraktových úloh IT"} description={financeView==='costs'?`Klasifikovaný IT výrez za roky ${years[0]}–${years.at(-1)} · obdobie ${dataset.meta.periodLabel}. Prepínač obdobia mení KPI, RUN/CHANGE, COST × RACI aj Financial Actions; rok 2026 sa ako celý rok nezobrazuje, kým zdroj nemá júl–december.`:"Samostatný manažérsky pohľad na rozpočet, mesačné a kvartálne čerpanie úloh 10, 22 a 25. Zdrojový snapshot pokrýva január až máj 2026."} actions={<><button className="button button-secondary" onClick={()=>go('intelligence')}><Icon name="shield" size={17}/> Riadiace centrum</button>{financeView==='costs'&&<button className="button button-primary" onClick={exportCurrent}><Icon name="download" size={17}/> Export CSV</button>}</>} />

    <div className="itc-module-switch" role="tablist" aria-label="Finančné pohľady"><button className={financeView==='costs'?'active':''} onClick={()=>setFinanceView('costs')}><Icon name="capacity" size={17}/>IT náklady</button><button className={financeView==='contracts'?'active':''} onClick={()=>setFinanceView('contracts')}><Icon name="tasks" size={17}/>Úlohy 10 / 22 / 25</button></div>

    {financeView==='contracts'?<ContractSpending/>:<>{/* IT cost intelligence */}
    <section className="itc-source-note"><Icon name="database" size={20}/><div><strong>Zdroj: {dataset.meta.sourceTitle}</strong><span>vytvorené {dataset.meta.sourceGeneratedAt} · klasifikácia v{dataset.meta.classificationVersion} · {dataset.items.length} klasifikovaných vecných položiek{dataset.meta.validationTotalsMatch?' · ročné súčty overené proti druhému dashboardu':''}</span></div><Badge tone="purple">{dataset.meta.periodLabel}</Badge></section>

    <section className="itc-filters panel">
      <label><span>Obdobie</span><select value={period} onChange={event=>setPeriod(event.target.value as 'h1'|'fullYear')}><option value="h1">Jan–Jún · porovnateľné H1</option><option value="fullYear">Jan–Dec · celý rok</option></select></label>
      <label><span>Rok</span><select value={year} onChange={event=>setYear(Number(event.target.value))}>{years.map(value=><option key={value}>{value}</option>)}</select></label>
      <label><span>RUN / CHANGE</span><select value={mode} onChange={event=>setMode(event.target.value)}><option>Všetko</option><option>Prevádzka</option><option>Rozvoj</option></select></label>
      <label><span>Kategória</span><select value={category} onChange={event=>setCategory(event.target.value)}><option>Všetko</option>{categories.map(value=><option key={value}>{value}</option>)}</select></label>
      <label><span>Dôvera</span><select value={confidence} onChange={event=>setConfidence(event.target.value)}><option>Všetko</option><option>vysoká</option><option>stredná</option></select></label>
      <label className="itc-search"><span>Hľadať</span><div><Icon name="search" size={17}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="KOMIS, DC VaV, licencia, doklad…"/></div></label>
      <button className="button button-ghost" onClick={()=>{setMode('Všetko');setCategory('Všetko');setConfidence('Všetko');setSearch('')}}>Vyčistiť</button>
    </section>

    <section className="itc-kpis">
      <article className="itc-kpi itc-kpi-primary"><span>IT náklady {year}</span><strong>{money.format(selectedTotal)}</strong><small>{number.format(sourceShare)} % zo zdrojového objemu</small></article>
      <article className="itc-kpi"><span>RUN · prevádzka</span><strong>{money.format(runTotal)}</strong><small>{number.format(runShare)} % IT nákladov</small></article>
      <article className="itc-kpi"><span>CHANGE · rozvoj / obnova</span><strong>{money.format(changeTotal)}</strong><small>{number.format(percent(changeTotal,selectedTotal))} % IT nákladov</small></article>
      <article className="itc-kpi"><span>Medziročná zmena</span><strong className={yearChange!==null&&yearChange>0?'itc-up':'itc-down'}>{yearChange===null?'—':signedPct(yearChange)}</strong><small>{previous?`${money.format(previous)} → ${money.format(selectedTotal)}`:'bez predchádzajúceho roku'}</small></article>
      <article className="itc-kpi"><span>Vysoká dôvera</span><strong>{number.format(highShare)} %</strong><small>{money.format(highConfidence)} explicitne priradených</small></article>
    </section>

    <section className="itc-grid-main">
      <article className="panel itc-trend-card">
        <div className="panel-heading"><div><span className="eyebrow">{period==='fullYear'?'CELOROČNÝ TREND':'5-ROČNÝ POROVNATEĽNÝ TREND'}</span><h3>Vývoj klasifikovaných IT nákladov</h3><p>Filter RUN/CHANGE, kategórie, dôvery a vyhľadávania sa premieta aj do trendu.</p></div></div>
        <div className="itc-trend-list">{trend.map(item=><button key={item.year} className={`itc-trend-row ${item.year===year?'active':''}`} onClick={()=>setYear(item.year)}><span>{item.year}</span><div><i style={{width:`${Math.max(1,Math.abs(item.amount)/maxTrend*100)}%`}}/></div><strong>{money.format(item.amount)}</strong></button>)}</div>
      </article>
      <article className="panel">
        <div className="panel-heading"><div><span className="eyebrow">RUN / CHANGE</span><h3>Štruktúra výdavkov</h3></div></div>
        <div className="itc-donut" style={{'--run-share':`${Math.max(0,Math.min(100,runShare))}%`} as CSSProperties}><div><strong>{number.format(runShare)} %</strong><span>RUN</span></div></div>
        <div className="itc-mode-legend"><span><i className="run"/>Prevádzka <strong>{money.format(runTotal)}</strong></span><span><i className="change"/>Rozvoj / obnova <strong>{money.format(changeTotal)}</strong></span></div>
      </article>
    </section>

    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">NÁKLADOVÉ DOMÉNY</span><h3>Za čo reálne platíme</h3><p>Členenie kombinuje ekonomickú klasifikáciu s explicitnými názvami služieb, systémov a infraštruktúry.</p></div></div>
      <div className="itc-category-list">{categoryTotals.map(item=><button key={item.name} onClick={()=>setCategory(item.name)}><div><strong>{item.name}</strong><small>{number.format(percent(item.amount,selectedTotal))} % z výberu</small></div><span><i style={{width:`${Math.max(2,Math.abs(item.amount)/maxCategory*100)}%`}}/></span><em>{money.format(item.amount)}</em></button>)}</div>
    </section>

    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">COST × SERVICE × RACI</span><h3>Najväčšie finančné väzby</h3><p>Nákladová entita je doplnená o nájdené RACI procesy v 3.2 a 3.1. Preklik smeruje na najbližší existujúci register v aplikácii.</p></div></div>
      <div className="itc-entity-grid">{topEntities.map(entity=>{const context=entityContexts.get(entity.name)??raciContext(entity.name,state);const route=relatedRoute(entity.name,entity.category);return <article key={entity.name} className="itc-entity-card"><div className="itc-entity-head"><div><span>{entity.category}</span><h4>{entity.name}</h4></div><strong>{money.format(entity.amount)}</strong></div><div className="itc-entity-meta"><span><b>{number.format(percent(entity.amount,selectedTotal))} %</b> podiel</span><span><b>{entity.activeYears.size}/{years.length}</b> aktívne roky</span><span><b>{context.oris+context.oit}</b> RACI väzieb</span><span className={context.singleR>0?'warn':''}><b>{context.singleR}</b> jediný R</span></div>{route&&<button className="text-button" onClick={()=>go(route)}>Otvoriť súvisiaci pohľad <Icon name="arrow" size={15}/></button>}</article>})}</div>
    </section>

    <section className="panel itc-intelligence">
      <div className="panel-heading"><div><span className="eyebrow">FINANČNÁ INTELIGENCIA</span><h3>Riadiace signály nad nákladmi</h3><p>Vysvetliteľné pravidlá nad aktuálnym výberom – bez externého AI API a bez odosielania ekonomických údajov mimo aplikácie.</p></div></div>
      <div className="itc-signal-grid">{managementSignals.map(signal=><article key={signal.title} className={`itc-signal ${signal.tone}`}><span>{signal.title}</span><strong>{signal.value}</strong><p>{signal.text}</p></article>)}</div>
    </section>

    <FinancialOptimization state={state} year={year} periodLabel={dataset.meta.periodLabel} periodMode={period} runTrend={runTrend} selectedTotal={selectedTotal} runTotal={runTotal} changeTotal={changeTotal} entities={optimizationEntities} canEdit={canEdit} currentUser={currentUser} onActionsChange={onActionsChange} go={go}/>

    {period==='h1'?<section className="panel itc-evidence-panel">
      <div className="panel-heading"><div><span className="eyebrow">DÔKAZNÁ VRSTVA</span><h3>Položky zahrnuté do IT nákladov · {year}</h3><p>Kompaktný auditovateľný detail s vlastným filtrovaním. Suma je čistá vrátane mínusových korekcií.</p></div><Badge tone="info">{evidenceRows.length} / {rows.length}</Badge></div>
      <div className="itc-evidence-toolbar">
        <label className="itc-evidence-search"><span>Hľadať v tabuľke</span><div><Icon name="search" size={15}/><input value={evidenceSearch} onChange={event=>setEvidenceSearch(event.target.value)} placeholder="položka, doklad, KPD, entita…"/></div></label>
        <label><span>Entita</span><select value={evidenceEntity} onChange={event=>setEvidenceEntity(event.target.value)}><option>Všetko</option>{evidenceEntities.map(value=><option key={value}>{value}</option>)}</select></label>
        <label><span>Dodávateľ</span><select value={evidenceSupplier} onChange={event=>setEvidenceSupplier(event.target.value)}><option>Všetko</option>{evidenceSuppliers.map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
        <label><span>Zoradiť</span><select value={evidenceSort} onChange={event=>setEvidenceSort(event.target.value as typeof evidenceSort)}><option value="amount">Podľa sumy</option><option value="name">Podľa názvu</option><option value="supplier">Podľa dodávateľa</option><option value="code">Podľa KPD / PPD</option></select></label>
        <label><span>Riadkov</span><select value={evidenceLimit} onChange={event=>setEvidenceLimit(Number(event.target.value))}><option value={50}>50</option><option value={100}>100</option><option value={250}>250</option><option value={1000}>Všetky</option></select></label>
        <button className={`itc-density-button ${evidenceDense?'active':''}`} onClick={()=>setEvidenceDense(value=>!value)}><Icon name="matrix" size={15}/>{evidenceDense?'Kompaktné':'Vzdušné'}</button>
        <button className="itc-density-button" onClick={()=>{setEvidenceSearch('');setEvidenceEntity('Všetko');setEvidenceSupplier('Všetko');setEvidenceSort('amount')}}>Reset</button>
      </div>
      <div className={`itc-evidence-shell ${evidenceDense?'dense':''}`}>
        <table className="itc-table"><colgroup><col className="itc-col-item"/><col className="itc-col-code"/><col className="itc-col-mode"/><col className="itc-col-category"/><col className="itc-col-supplier"/><col className="itc-col-confidence"/><col className="itc-col-document"/><col className="itc-col-amount"/></colgroup><thead><tr><th>Položka</th><th>KPD / PPD</th><th>RUN/CHANGE</th><th>Kategória / entita</th><th>Dodávateľ</th><th>Dôvera</th><th>TOP doklad</th><th className="number">{year}</th></tr></thead><tbody>{evidenceRows.slice(0,evidenceLimit).map(item=>{const supplier=evidenceSupplierMeta.get(item.id)??{key:'',name:'',ico:'',match:'none',multiple:0};return <tr key={item.id}><td><strong>{item.label}</strong><small>{item.reason}</small></td><td className="itc-code-cell"><strong>{item.kpd} / {item.ppd||'—'}</strong></td><td><Badge tone={item.mode==='Prevádzka'?'info':'purple'}>{item.mode}</Badge></td><td><strong>{item.category}</strong><small>{item.entity}</small></td><td className="itc-supplier-cell">{supplier.key?<><strong>{supplier.name}{supplier.multiple?` +${supplier.multiple}`:''}</strong><small>{supplier.ico?`IČO ${supplier.ico}`:'bez IČO'} · {supplier.match==='doklad'?'zhoda dokladu':'zhoda položky'}</small></>:<><strong>—</strong><small>bez spoľahlivej zhody</small></>}</td><td><Badge tone={item.confidence==='vysoká'?'success':'warning'}>{item.confidence}</Badge></td><td className="itc-document-cell"><strong>{documentForYear(item,year)}</strong></td><td className={`number ${amountFor(item,year)<0?'itc-negative':''}`}><strong>{money.format(amountFor(item,year))}</strong></td></tr>})}</tbody></table>
      </div>
      <div className="itc-table-note">Zobrazených {Math.min(evidenceRows.length,evidenceLimit)} z {evidenceRows.length} položiek. Hlavička aj pravý stĺpec so sumou zostávajú pri rolovaní viditeľné; na menších obrazovkách sa tabuľka roluje iba vo vlastnom paneli.</div>
    </section>:<section className="panel itc-full-year-evidence-note"><Icon name="shield" size={22}/><div><span className="eyebrow">CELÝ ROK · DÔKAZNOSŤ</span><h3>Celoročný pohľad je manažérsky agregát</h3><p>Pre roky 2023–2025 sú v zdrojovej dátovej bráne potvrdené mesiace január až december. Full-year IT výrez je konzervatívny: explicitné IT/DC VaV položky a priame IT KPD/PPD sú zahrnuté, generické položky bez bezpečnej IT väzby nie. Detailná dokladová tabuľka ostáva dostupná v režime Jan–Jún, kde máme auditovateľné položky po dokladoch.</p></div></section>}

    <section className="itc-method panel"><Icon name="shield" size={22}/><div><h3>Metodika a hranice pohľadu</h3><p>{dataset.meta.method} Nejde o účtovnú preklasifikáciu ani o náhradu hlavnej knihy; ide o manažérsky IT výrez z dodaných dát.</p>{dataset.meta.coverageNote&&<p><strong>Pokrytie:</strong> {dataset.meta.coverageNote}</p>}<ul>{dataset.meta.exclusions.map(item=><li key={item}>{item}</li>)}</ul></div></section>
    </>}
  </div>
}
