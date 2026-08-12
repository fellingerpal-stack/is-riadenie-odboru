import { useMemo, useState } from 'react'
import { Badge, Icon, Modal } from '../components/UI'
import data from '../data/contractTasks.json'
import ledgerData from '../data/contractTaskLedger.json'
import './ContractSpending.css'

type Granularity = 'monthly' | 'quarterly' | 'cumulative'
type Metric = 'spent' | 'share' | 'remaining'
type DrillView = 'documents' | 'rows'
type DrillSort = 'amount' | 'date'

interface ContractTask {
  code: string
  centers: string[]
  name: string
  description: string
  budget: number
  spent: number
  remaining: number
  monthly: number[]
}
interface ContractDataset {
  meta: { title:string; source:string; period:string; year:number; monthsLoaded:number; method:string }
  tasks: ContractTask[]
}
interface LedgerRow {
  id: string
  sourceRow: string
  task: string
  zak: string
  kpd: string
  ppd: string
  fzd: string
  pgd: string
  pracm: string
  amount: number
  originalZak: string
  column: string
  category: string
  date: string
  month: number
  document: string
  note: string
  dataNote: string
}
interface LedgerDataset {
  meta: {
    title:string
    source:string
    sourceFile:string
    period:string
    year:number
    monthsLoaded:number
    rowCount:number
    rowCountByTask:Record<string,number>
    totalsByTask:Record<string,number>
    method:string
  }
  payments: LedgerRow[]
}
interface SeriesPoint { label:string; value:number; months:number[] }
interface DrilldownState {
  taskCodes:string[]
  months:number[] | null
  title:string
  description:string
}
interface DocumentGroup {
  key:string
  task:string
  date:string
  document:string
  amount:number
  rows:LedgerRow[]
  notes:string[]
  centers:string[]
  codes:string[]
  categories:string[]
}

const dataset = data as ContractDataset
const ledger = ledgerData as LedgerDataset
const money = new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2})
const compactMoney = new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR',notation:'compact',maximumFractionDigits:1})
const pct = new Intl.NumberFormat('sk-SK',{maximumFractionDigits:1})
const dateFormat = new Intl.DateTimeFormat('sk-SK',{day:'2-digit',month:'2-digit',year:'numeric'})
const monthNames = ['Jan','Feb','Mar','Apr','Máj','Jún','Júl','Aug','Sep','Okt','Nov','Dec']
const monthLongNames = ['január','február','marec','apríl','máj','jún','júl','august','september','október','november','december']

function percent(value:number,total:number){ return total ? value / total * 100 : 0 }
function sum(values:number[]){ return values.reduce((total,value)=>total+value,0) }
function runRate(task:ContractTask){ return dataset.meta.monthsLoaded ? task.spent / dataset.meta.monthsLoaded * 12 : 0 }
function budgetTone(value:number){ return value >= 100 ? 'danger' as const : value >= 80 ? 'warning' as const : 'success' as const }
function loadedPeriodCode(){ return `01–${String(dataset.meta.monthsLoaded).padStart(2,'0')}` }
function unloadedPeriodText(){
  if(dataset.meta.monthsLoaded>=12)return 'Celý rok je načítaný.'
  const start=monthNames[dataset.meta.monthsLoaded]||`M${dataset.meta.monthsLoaded+1}`
  return `${start}–Dec nie sú v tomto snapshote nulové – zatiaľ nie sú načítané.`
}
function centerLabel(centers:string[]){
  if(!centers.length)return 'bez evidovaného strediska'
  if(centers.length<=3)return `stredisko ${centers.join(' / ')}`
  return `strediská ${centers.slice(0,3).join(' / ')} +${centers.length-3}`
}
function quarterBuckets(values:number[]):SeriesPoint[]{
  const count=Math.ceil(values.length/3)
  return Array.from({length:count},(_,index)=>{
    const start=index*3
    const slice=values.slice(start,start+3)
    const months=slice.map((_,offset)=>start+offset+1)
    const partial=slice.length<3
    return {label:`Q${index+1}${partial?' · priebežne':''}`,value:sum(slice),months}
  })
}
function normalize(value:string){
  return String(value||'').toLocaleLowerCase('sk-SK').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
}
function formatDate(value:string){
  const parsed=new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime())?value:dateFormat.format(parsed)
}
function unique(values:string[]){ return [...new Set(values.filter(Boolean))] }
function monthScopeLabel(months:number[]|null){
  if(!months?.length)return `01–${String(dataset.meta.monthsLoaded).padStart(2,'0')}/${dataset.meta.year}`
  if(months.length===1)return `${monthLongNames[months[0]-1]} ${dataset.meta.year}`
  const contiguous=months.every((month,index)=>index===0||month===months[index-1]+1)
  if(contiguous)return `${monthLongNames[months[0]-1]} – ${monthLongNames[months[months.length-1]-1]} ${dataset.meta.year}`
  return months.map(month=>monthNames[month-1]).join(', ')
}
function documentGroups(rows:LedgerRow[]):DocumentGroup[]{
  const groups=new Map<string,DocumentGroup>()
  rows.forEach(row=>{
    const key=`${row.task}|${row.date}|${row.document||'bez-dokladu'}`
    const current=groups.get(key)??{
      key,
      task:row.task,
      date:row.date,
      document:row.document||'Bez dokladu',
      amount:0,
      rows:[],
      notes:[],
      centers:[],
      codes:[],
      categories:[],
    }
    current.amount+=row.amount
    current.rows.push(row)
    current.notes=unique([...current.notes,row.note])
    current.centers=unique([...current.centers,row.pracm])
    current.codes=unique([...current.codes,`${row.kpd}${row.ppd?`/${row.ppd}`:''}`])
    current.categories=unique([...current.categories,row.category])
    groups.set(key,current)
  })
  return [...groups.values()].map(group=>({...group,amount:Math.round(group.amount*100)/100}))
}
function expectedScopeTotal(taskCodes:string[],months:number[]|null){
  return sum(dataset.tasks.filter(task=>taskCodes.includes(task.code)).map(task=>{
    if(!months?.length)return task.spent
    return sum(months.map(month=>task.monthly[month-1]||0))
  }))
}

function downloadCsv(filename:string, rows:string[][]){
  const csv=rows.map(row=>row.map(cell=>`"${String(cell).replaceAll('"','""')}"`).join(';')).join('\n')
  const blob=new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8'})
  const url=URL.createObjectURL(blob)
  const link=document.createElement('a')
  link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url)
}

export default function ContractSpending(){
  const [taskCode,setTaskCode]=useState('all')
  const [granularity,setGranularity]=useState<Granularity>('monthly')
  const [metric,setMetric]=useState<Metric>('spent')
  const [drilldown,setDrilldown]=useState<DrilldownState|null>(null)
  const [drillSearch,setDrillSearch]=useState('')
  const [drillView,setDrillView]=useState<DrillView>('documents')
  const [drillSort,setDrillSort]=useState<DrillSort>('amount')

  const selectedTasks=taskCode==='all'?dataset.tasks:dataset.tasks.filter(task=>task.code===taskCode)
  const aggregate=useMemo(()=>({
    budget:sum(selectedTasks.map(task=>task.budget)),
    spent:sum(selectedTasks.map(task=>task.spent)),
    remaining:sum(selectedTasks.map(task=>task.remaining)),
    monthly:Array.from({length:dataset.meta.monthsLoaded},(_,index)=>sum(selectedTasks.map(task=>task.monthly[index]||0))),
  }),[taskCode])
  const spentShare=percent(aggregate.spent,aggregate.budget)
  const avgMonthly=dataset.meta.monthsLoaded?aggregate.spent/dataset.meta.monthsLoaded:0
  const forecast=avgMonthly*12
  const forecastDelta=forecast-aggregate.budget
  const timeElapsed=dataset.meta.monthsLoaded/12*100
  const detailQuarters=quarterBuckets(Array.from({length:dataset.meta.monthsLoaded},()=>0))

  const series=useMemo<SeriesPoint[]>(()=>{
    if(granularity==='quarterly')return quarterBuckets(aggregate.monthly)
    if(granularity==='cumulative'){
      let running=0
      return aggregate.monthly.map((value,index)=>({label:monthNames[index],value:(running+=value),months:Array.from({length:index+1},(_,month)=>month+1)}))
    }
    return aggregate.monthly.map((value,index)=>({label:monthNames[index],value,months:[index+1]}))
  },[aggregate.monthly,granularity])

  const displaySeries=series.map(point=>{
    if(metric==='share') return {...point,value:percent(point.value,aggregate.budget)}
    if(metric==='remaining') return {...point,value:Math.max(0,aggregate.budget-point.value)}
    return point
  })
  const maxValue=Math.max(...displaySeries.map(point=>Math.abs(point.value)),1)
  const selectedLabel=taskCode==='all'?'Úlohy 10 + 22 + 25':`Úloha ${taskCode}`
  const selectedTaskCodes=selectedTasks.map(task=>task.code)

  const scopeRows=useMemo(()=>{
    if(!drilldown)return []
    return ledger.payments.filter(row=>drilldown.taskCodes.includes(row.task)&&(!drilldown.months?.length||drilldown.months.includes(row.month)))
  },[drilldown])
  const searchedRows=useMemo(()=>{
    const query=normalize(drillSearch.trim())
    if(!query)return scopeRows
    return scopeRows.filter(row=>normalize([
      row.task,row.zak,row.kpd,row.ppd,row.fzd,row.pgd,row.pracm,row.category,row.date,row.document,row.note,row.dataNote,
    ].join(' ')).includes(query))
  },[scopeRows,drillSearch])
  const groupedDocuments=useMemo(()=>{
    const groups=documentGroups(searchedRows)
    return groups.sort((left,right)=>drillSort==='amount'?right.amount-left.amount:right.date.localeCompare(left.date))
  },[searchedRows,drillSort])
  const sortedRows=useMemo(()=>[...searchedRows].sort((left,right)=>drillSort==='amount'?right.amount-left.amount:right.date.localeCompare(left.date)),[searchedRows,drillSort])
  const scopeTotal=sum(scopeRows.map(row=>row.amount))
  const filteredTotal=sum(searchedRows.map(row=>row.amount))
  const expectedTotal=drilldown?expectedScopeTotal(drilldown.taskCodes,drilldown.months):0
  const reconciliationDifference=Math.round((scopeTotal-expectedTotal)*100)/100
  const scopeDocumentCount=new Set(scopeRows.map(row=>row.document).filter(Boolean)).size
  const scopeCenterCount=new Set(scopeRows.map(row=>row.pracm).filter(Boolean)).size

  function openDrilldown(taskCodes:string[],months:number[]|null,title:string,description:string){
    setDrillSearch('')
    setDrillView('documents')
    setDrillSort('amount')
    setDrilldown({taskCodes,months,title,description})
  }

  function openTask(task:ContractTask){
    setTaskCode(task.code)
    openDrilldown([task.code],null,`Úloha ${task.code} · ${task.name}`,`Čo tvorí vyčerpanú sumu ${money.format(task.spent)} za obdobie ${dataset.meta.period}.`)
  }

  function openSelectedSpent(){
    openDrilldown(selectedTaskCodes,null,`${selectedLabel} · vyčerpané`, `Riadkový rozpad čerpania ${money.format(aggregate.spent)} za obdobie ${dataset.meta.period}.`)
  }

  function openSeriesPoint(point:SeriesPoint){
    const scope=monthScopeLabel(point.months)
    const rawValue=sum(point.months.map(month=>aggregate.monthly[month-1]||0))
    openDrilldown(selectedTaskCodes,point.months,`${selectedLabel} · ${scope}`,`Položky čerpania, ktoré tvoria ${money.format(rawValue)} v zvolenom období.`)
  }

  function exportContract(){
    downloadCsv(`sit-cerpanie-${taskCode}-${dataset.meta.year}.csv`,[
      ['Úloha','Názov','Strediská','Rozpočet','Vyčerpané','Zostatok','Čerpanie %',...monthNames.slice(0,dataset.meta.monthsLoaded)],
      ...selectedTasks.map(task=>[task.code,task.name,task.centers.join(', '),String(task.budget),String(task.spent),String(task.remaining),String(percent(task.spent,task.budget)),...task.monthly.map(String)]),
    ])
  }

  function exportDrilldown(){
    if(!drilldown)return
    const suffix=`${drilldown.taskCodes.join('-')}-${drilldown.months?.join('-')||'01-'+String(dataset.meta.monthsLoaded).padStart(2,'0')}`
    if(drillView==='documents'){
      downloadCsv(`sit-doklady-${suffix}-${dataset.meta.year}.csv`,[
        ['Úloha','Dátum','Doklad','Popis','Suma','Strediská','KPD/PPD','Kategórie','Počet riadkov'],
        ...groupedDocuments.map(group=>[group.task,group.date,group.document,group.notes.join(' | '),String(group.amount),group.centers.join(', '),group.codes.join(', '),group.categories.join(', '),String(group.rows.length)]),
      ])
      return
    }
    downloadCsv(`sit-riadky-${suffix}-${dataset.meta.year}.csv`,[
      ['Riadok','Úloha','Dátum','Doklad','Popis','Suma','ZAK','KPD','PPD','FZD','PGD','PRACM','Kategória','Pôvodná ZAK','Stĺpec','Dátová poznámka'],
      ...sortedRows.map(row=>[row.sourceRow,row.task,row.date,row.document,row.note,String(row.amount),row.zak,row.kpd,row.ppd,row.fzd,row.pgd,row.pracm,row.category,row.originalZak,row.column,row.dataNote]),
    ])
  }

  return <div className="contract-spending">
    <section className="contract-source-note"><Icon name="database" size={20}/><div><strong>{dataset.meta.title}</strong><span>{dataset.meta.source} · {dataset.meta.period}. {unloadedPeriodText()}</span></div><Badge tone="info">SIT {dataset.meta.year}</Badge></section>

    <section className="contract-task-grid">
      {dataset.tasks.map(task=>{
        const used=percent(task.spent,task.budget)
        const forecastValue=runRate(task)
        return <button key={task.code} className={`contract-task-card ${taskCode===task.code?'active':''}`} onClick={()=>openTask(task)} title="Otvoriť platby a doklady tejto úlohy">
          <span className="contract-task-code">ÚLOHA {task.code}</span>
          <strong>{task.name}</strong>
          <small>{centerLabel(task.centers)}</small>
          <div className="contract-task-numbers"><span><b>{money.format(task.spent)}</b>čerpanie</span><span><b>{money.format(task.remaining)}</b>zostatok</span></div>
          <div className="contract-progress"><i style={{width:`${Math.min(100,used)}%`}}/></div>
          <footer><span>{pct.format(used)} % rozpočtu · klik = platby</span><Badge tone={budgetTone(percent(forecastValue,task.budget))}>run-rate {pct.format(percent(forecastValue,task.budget))} %</Badge></footer>
        </button>
      })}
    </section>

    <section className="panel contract-control-panel">
      <div className="contract-control-copy"><span className="eyebrow">KONTRAKTOVÉ ČERPANIE</span><h3>{selectedLabel}</h3><p>Prepínaj úlohu, časové členenie a metriku. Klik na stĺpec grafu otvorí jeho podkladové platby.</p></div>
      <div className="contract-controls">
        <label><span>Úloha</span><select value={taskCode} onChange={event=>setTaskCode(event.target.value)}><option value="all">10 + 22 + 25 spolu</option>{dataset.tasks.map(task=><option value={task.code} key={task.code}>Úloha {task.code}</option>)}</select></label>
        <label><span>Čas</span><select value={granularity} onChange={event=>setGranularity(event.target.value as Granularity)}><option value="monthly">Mesačne</option><option value="quarterly">Kvartálne</option><option value="cumulative">Kumulatívne</option></select></label>
        <label><span>Metrika</span><select value={metric} onChange={event=>setMetric(event.target.value as Metric)}><option value="spent">Čerpanie €</option><option value="share">Podiel rozpočtu %</option><option value="remaining">Zostatok €</option></select></label>
        <button className="button button-secondary" onClick={exportContract}><Icon name="download" size={16}/>CSV</button>
      </div>
    </section>

    <section className="contract-kpis">
      <article className="primary"><span>Rozpočet</span><strong>{money.format(aggregate.budget)}</strong><small>{selectedLabel}</small></article>
      <button className="contract-kpi-button" onClick={openSelectedSpent} title="Otvoriť podkladové platby"><span>Vyčerpané {loadedPeriodCode()}</span><strong>{money.format(aggregate.spent)}</strong><small>{pct.format(spentShare)} % rozpočtu · otvoriť platby</small></button>
      <article><span>Zostatok</span><strong>{money.format(aggregate.remaining)}</strong><small>{pct.format(100-spentShare)} % rozpočtu</small></article>
      <article><span>Priemer / mesiac</span><strong>{money.format(avgMonthly)}</strong><small>z {dataset.meta.monthsLoaded} načítaných mesiacov</small></article>
      <article className={forecastDelta>0?'risk':''}><span>Jednoduchý run-rate</span><strong>{money.format(forecast)}</strong><small>{forecastDelta>0?`+${money.format(forecastDelta)} nad rozpočet`:`${money.format(Math.abs(forecastDelta))} pod rozpočet`} · nie oficiálna prognóza</small></article>
    </section>

    <section className="contract-main-grid">
      <article className="panel contract-chart-card">
        <div className="panel-heading"><div><span className="eyebrow">TREND ČERPANIA</span><h3>{granularity==='monthly'?'Mesačné čerpanie':granularity==='quarterly'?'Kvartálne čerpanie':'Kumulatívne čerpanie'}</h3><p>Klikni na stĺpec a otvor podkladové platby. Snapshot pokrýva {dataset.meta.period}.</p></div><Badge tone={budgetTone(spentShare)}>{pct.format(spentShare)} % vyčerpané</Badge></div>
        <div className="contract-chart">
          {displaySeries.map(point=><button type="button" className="contract-bar" key={point.label} onClick={()=>openSeriesPoint(point)} title={`Otvoriť platby: ${point.label}`}><span>{point.label}</span><div><i style={{height:`${Math.max(3,Math.abs(point.value)/maxValue*100)}%`}}/><b>{metric==='share'?`${pct.format(point.value)} %`:compactMoney.format(point.value)}</b></div></button>)}
        </div>
        <div className="contract-chart-axis"><span>0</span><span>{metric==='share'?`${pct.format(maxValue)} %`:compactMoney.format(maxValue)}</span></div>
      </article>

      <aside className="panel contract-intelligence-card">
        <div className="panel-heading"><div><span className="eyebrow">RIADIACI SIGNÁL</span><h3>Tempo vs. rozpočet</h3></div></div>
        <div className="contract-gauge"><div><i style={{width:`${Math.min(100,spentShare)}%`}}/><em style={{left:`${Math.min(100,timeElapsed)}%`}}/></div><footer><span>čerpanie {pct.format(spentShare)} %</span><span>čas {pct.format(timeElapsed)} %</span></footer></div>
        <div className="contract-signal-list">
          <div><Icon name={forecastDelta>0?'warning':'check'} size={18}/><span><strong>{forecastDelta>0?'Tempo smeruje nad rozpočet':'Tempo je pod lineárnym rozpočtom'}</strong><small>Run-rate pri zachovaní priemeru: {money.format(forecast)}.</small></span></div>
          <button type="button" className="contract-signal-action" onClick={()=>{const index=aggregate.monthly.indexOf(Math.max(...aggregate.monthly));openSeriesPoint({label:monthNames[index],value:aggregate.monthly[index],months:[index+1]})}}><Icon name="calendar" size={18}/><span><strong>Najsilnejší mesiac</strong><small>{monthNames[aggregate.monthly.indexOf(Math.max(...aggregate.monthly))]} · {money.format(Math.max(...aggregate.monthly))} · otvoriť platby</small></span></button>
          <div><Icon name="shield" size={18}/><span><strong>Metodika</strong><small>Run-rate je jednoduchá analytická extrapolácia {dataset.meta.monthsLoaded} načítaných mesiacov, nie schválený forecast.</small></span></div>
        </div>
      </aside>
    </section>

    <section className="panel contract-detail-panel">
      <div className="panel-heading"><div><span className="eyebrow">DETAIL ÚLOH</span><h3>Rozpočet a čerpanie po úlohe</h3><p>Hodnoty sú agregované z filtrovaného auditu. Tlačidlo Platby otvorí riadkový podklad.</p></div><Badge tone="neutral">dáta {loadedPeriodCode()}</Badge></div>
      <div className="contract-table-wrap"><table className="contract-table"><thead><tr><th>Úloha</th><th>Názov</th><th>Strediská</th><th className="number">Rozpočet</th><th className="number">Vyčerpané</th><th className="number">Zostatok</th><th className="number">%</th>{detailQuarters.map(item=><th className="number" key={item.label}>{item.label}</th>)}<th>Podklad</th></tr></thead><tbody>{selectedTasks.map(task=><tr key={task.code}><td><strong>{task.code}</strong></td><td><strong>{task.name}</strong><small>{task.description}</small></td><td>{task.centers.join(' / ')}</td><td className="number">{money.format(task.budget)}</td><td className="number"><strong>{money.format(task.spent)}</strong></td><td className="number">{money.format(task.remaining)}</td><td className="number"><Badge tone={budgetTone(percent(task.spent,task.budget))}>{pct.format(percent(task.spent,task.budget))} %</Badge></td>{quarterBuckets(task.monthly).map(item=><td className="number" key={item.label}>{money.format(item.value)}</td>)}<td><button className="contract-inline-drill" type="button" onClick={()=>openTask(task)}>Platby</button></td></tr>)}</tbody></table></div>
    </section>

    <section className="contract-method panel"><Icon name="shield" size={22}/><div><h3>Dôležitá hranica dát</h3><p>{dataset.meta.method} Drill-down používa {ledger.meta.rowCount} zdrojových riadkov z toho istého auditu a pri generovaní sa povinne kontroluje proti súhrnu úloh. Dodávateľský Supplier 360 zostáva samostatnou dátovou vrstvou.</p></div></section>

    {drilldown&&<Modal title={drilldown.title} onClose={()=>setDrilldown(null)} wide>
      <div className="contract-drilldown">
        <div className="contract-drill-intro">
          <Icon name="database" size={22}/>
          <div><strong>{drilldown.description}</strong><span>{monthScopeLabel(drilldown.months)} · zdroj: {ledger.meta.sourceFile}</span></div>
          <Badge tone={Math.abs(reconciliationDifference)<=0.01?'success':'danger'}>{Math.abs(reconciliationDifference)<=0.01?'Súčet sedí':'Rozdiel'}</Badge>
        </div>

        <div className="contract-drill-summary">
          <article><span>Čerpanie</span><strong>{money.format(scopeTotal)}</strong><small>kontrolná suma {money.format(expectedTotal)}</small></article>
          <article><span>Doklady</span><strong>{scopeDocumentCount}</strong><small>unikátne čísla dokladov</small></article>
          <article><span>Riadky</span><strong>{scopeRows.length}</strong><small>položky filtrovaného auditu</small></article>
          <article><span>Strediská</span><strong>{scopeCenterCount}</strong><small>{unique(scopeRows.map(row=>row.pracm)).slice(0,5).join(' / ')||'—'}</small></article>
        </div>

        <div className="contract-reconciliation-row">
          <span><Icon name={Math.abs(reconciliationDifference)<=0.01?'check':'warning'} size={17}/><strong>Reconciliácia s grafom</strong></span>
          <b>{money.format(scopeTotal)} vs. {money.format(expectedTotal)}</b>
          <em>rozdiel {money.format(reconciliationDifference)}</em>
        </div>

        <div className="contract-drill-toolbar">
          <label className="contract-drill-search"><Icon name="search" size={16}/><input value={drillSearch} onChange={event=>setDrillSearch(event.target.value)} placeholder="Doklad, popis, KPD/PPD, PRACM, FZD, PGD..."/></label>
          <div className="contract-view-toggle"><button className={drillView==='documents'?'active':''} onClick={()=>setDrillView('documents')}>Doklady</button><button className={drillView==='rows'?'active':''} onClick={()=>setDrillView('rows')}>Riadky</button></div>
          <label className="contract-drill-sort"><span>Zoradiť</span><select value={drillSort} onChange={event=>setDrillSort(event.target.value as DrillSort)}><option value="amount">Suma ↓</option><option value="date">Dátum ↓</option></select></label>
          <button className="button button-secondary" onClick={exportDrilldown}><Icon name="download" size={16}/>CSV detail</button>
        </div>

        {drillSearch&&<div className="contract-filter-result"><span>Zobrazené: <strong>{drillView==='documents'?groupedDocuments.length:sortedRows.length}</strong></span><span>Suma filtra: <strong>{money.format(filteredTotal)}</strong></span></div>}

        {drillView==='documents'?<div className="contract-drill-table-shell"><table className="contract-drill-table contract-document-table"><thead><tr><th>Dátum</th><th>Úloha</th><th>Doklad / čo bolo platené</th><th>KPD/PPD</th><th>PRACM</th><th className="number">Suma</th><th>Riadky</th></tr></thead><tbody>{groupedDocuments.map(group=><tr key={group.key}><td>{formatDate(group.date)}</td><td><Badge tone="info">{group.task}</Badge></td><td><strong>{group.document}</strong><small>{group.notes.slice(0,3).join(' · ')||'Bez popisu'}{group.notes.length>3?` · +${group.notes.length-3}`:''}</small><em>{group.categories.join(' · ')}</em></td><td>{group.codes.join(', ')||'—'}</td><td>{group.centers.join(' / ')||'—'}</td><td className="number"><strong>{money.format(group.amount)}</strong></td><td>{group.rows.length}</td></tr>)}</tbody></table>{!groupedDocuments.length&&<div className="contract-drill-empty">Pre zadaný filter nie sú žiadne doklady.</div>}</div>:
        <div className="contract-drill-table-shell"><table className="contract-drill-table contract-row-table"><thead><tr><th>Riadok</th><th>Dátum</th><th>Úloha</th><th>Doklad / popis</th><th>KPD/PPD</th><th>FZD</th><th>PGD</th><th>PRACM</th><th className="number">Suma</th></tr></thead><tbody>{sortedRows.map(row=><tr key={row.id}><td>{row.sourceRow}</td><td>{formatDate(row.date)}</td><td><Badge tone="info">{row.task}</Badge></td><td><strong>{row.document||'—'}</strong><small>{row.note||'Bez popisu'}</small><em>{row.category||'—'} · ZAK {row.zak||'—'}</em></td><td>{row.kpd||'—'}{row.ppd?` / ${row.ppd}`:''}</td><td>{row.fzd||'—'}</td><td>{row.pgd||'—'}</td><td>{row.pracm||'—'}</td><td className="number"><strong>{money.format(row.amount)}</strong></td></tr>)}</tbody></table>{!sortedRows.length&&<div className="contract-drill-empty">Pre zadaný filter nie sú žiadne riadky.</div>}</div>}
      </div>
    </Modal>}
  </div>
}
