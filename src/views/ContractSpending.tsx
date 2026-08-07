import { useMemo, useState } from 'react'
import { Badge, Icon } from '../components/UI'
import data from '../data/contractTasks.json'
import './ContractSpending.css'

type Granularity = 'monthly' | 'quarterly' | 'cumulative'
type Metric = 'spent' | 'share' | 'remaining'

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

const dataset = data as ContractDataset
const money = new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2})
const compactMoney = new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR',notation:'compact',maximumFractionDigits:1})
const pct = new Intl.NumberFormat('sk-SK',{maximumFractionDigits:1})
const monthNames = ['Jan','Feb','Mar','Apr','Máj','Jún','Júl','Aug','Sep','Okt','Nov','Dec']

function percent(value:number,total:number){ return total ? value / total * 100 : 0 }
function sum(values:number[]){ return values.reduce((total,value)=>total+value,0) }
function runRate(task:ContractTask){ return dataset.meta.monthsLoaded ? task.spent / dataset.meta.monthsLoaded * 12 : 0 }
function budgetTone(value:number){ return value >= 100 ? 'danger' as const : value >= 80 ? 'warning' as const : 'success' as const }

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

  const series=useMemo(()=>{
    if(granularity==='quarterly'){
      const q1=sum(aggregate.monthly.slice(0,3))
      const q2=sum(aggregate.monthly.slice(3,6))
      return [{label:'Q1',value:q1},{label:'Q2 · priebežne',value:q2}]
    }
    if(granularity==='cumulative'){
      let running=0
      return aggregate.monthly.map((value,index)=>({label:monthNames[index],value:(running+=value)}))
    }
    return aggregate.monthly.map((value,index)=>({label:monthNames[index],value}))
  },[aggregate.monthly,granularity])

  const displaySeries=series.map(point=>{
    if(metric==='share') return {...point,value:percent(point.value,aggregate.budget)}
    if(metric==='remaining') return {...point,value:Math.max(0,aggregate.budget-point.value)}
    return point
  })
  const maxValue=Math.max(...displaySeries.map(point=>Math.abs(point.value)),1)
  const selectedLabel=taskCode==='all'?'Úlohy 10 + 22 + 25':`Úloha ${taskCode}`

  function exportContract(){
    downloadCsv(`sit-cerpanie-${taskCode}-${dataset.meta.year}.csv`,[
      ['Úloha','Názov','Strediská','Rozpočet','Vyčerpané','Zostatok','Čerpanie %','Jan','Feb','Mar','Apr','Máj'],
      ...selectedTasks.map(task=>[task.code,task.name,task.centers.join(', '),String(task.budget),String(task.spent),String(task.remaining),String(percent(task.spent,task.budget)),...task.monthly.map(String)]),
    ])
  }

  return <div className="contract-spending">
    <section className="contract-source-note"><Icon name="database" size={20}/><div><strong>{dataset.meta.title}</strong><span>{dataset.meta.source} · {dataset.meta.period}. Jún až december nie sú v tomto snapshote nulové – zatiaľ nie sú načítané.</span></div><Badge tone="info">SIT {dataset.meta.year}</Badge></section>

    <section className="contract-task-grid">
      {dataset.tasks.map(task=>{
        const used=percent(task.spent,task.budget)
        const forecastValue=runRate(task)
        return <button key={task.code} className={`contract-task-card ${taskCode===task.code?'active':''}`} onClick={()=>setTaskCode(current=>current===task.code?'all':task.code)}>
          <span className="contract-task-code">ÚLOHA {task.code}</span>
          <strong>{task.name}</strong>
          <small>{task.centers.length?`stredisko ${task.centers.join(' / ')}`:'bez fixného strediska'}</small>
          <div className="contract-task-numbers"><span><b>{money.format(task.spent)}</b>čerpanie</span><span><b>{money.format(task.remaining)}</b>zostatok</span></div>
          <div className="contract-progress"><i style={{width:`${Math.min(100,used)}%`}}/></div>
          <footer><span>{pct.format(used)} % rozpočtu</span><Badge tone={budgetTone(percent(forecastValue,task.budget))}>run-rate {pct.format(percent(forecastValue,task.budget))} %</Badge></footer>
        </button>
      })}
    </section>

    <section className="panel contract-control-panel">
      <div className="contract-control-copy"><span className="eyebrow">KONTRAKTOVÉ ČERPANIE</span><h3>{selectedLabel}</h3><p>Prepínaj úlohu, časové členenie a metriku bez zmeny zdrojových údajov.</p></div>
      <div className="contract-controls">
        <label><span>Úloha</span><select value={taskCode} onChange={event=>setTaskCode(event.target.value)}><option value="all">10 + 22 + 25 spolu</option>{dataset.tasks.map(task=><option value={task.code} key={task.code}>Úloha {task.code}</option>)}</select></label>
        <label><span>Čas</span><select value={granularity} onChange={event=>setGranularity(event.target.value as Granularity)}><option value="monthly">Mesačne</option><option value="quarterly">Kvartálne</option><option value="cumulative">Kumulatívne</option></select></label>
        <label><span>Metrika</span><select value={metric} onChange={event=>setMetric(event.target.value as Metric)}><option value="spent">Čerpanie €</option><option value="share">Podiel rozpočtu %</option><option value="remaining">Zostatok €</option></select></label>
        <button className="button button-secondary" onClick={exportContract}><Icon name="download" size={16}/>CSV</button>
      </div>
    </section>

    <section className="contract-kpis">
      <article className="primary"><span>Rozpočet</span><strong>{money.format(aggregate.budget)}</strong><small>{selectedLabel}</small></article>
      <article><span>Vyčerpané do mája</span><strong>{money.format(aggregate.spent)}</strong><small>{pct.format(spentShare)} % rozpočtu</small></article>
      <article><span>Zostatok</span><strong>{money.format(aggregate.remaining)}</strong><small>{pct.format(100-spentShare)} % rozpočtu</small></article>
      <article><span>Priemer / mesiac</span><strong>{money.format(avgMonthly)}</strong><small>z {dataset.meta.monthsLoaded} načítaných mesiacov</small></article>
      <article className={forecastDelta>0?'risk':''}><span>Jednoduchý run-rate</span><strong>{money.format(forecast)}</strong><small>{forecastDelta>0?`+${money.format(forecastDelta)} nad rozpočet`:`${money.format(Math.abs(forecastDelta))} pod rozpočet`} · nie oficiálna prognóza</small></article>
    </section>

    <section className="contract-main-grid">
      <article className="panel contract-chart-card">
        <div className="panel-heading"><div><span className="eyebrow">TREND ČERPANIA</span><h3>{granularity==='monthly'?'Mesačné čerpanie':granularity==='quarterly'?'Kvartálne čerpanie':'Kumulatívne čerpanie'}</h3><p>Aktuálny snapshot pokrýva január až máj 2026.</p></div><Badge tone={budgetTone(spentShare)}>{pct.format(spentShare)} % vyčerpané</Badge></div>
        <div className="contract-chart">
          {displaySeries.map(point=><div className="contract-bar" key={point.label}><span>{point.label}</span><div><i style={{height:`${Math.max(3,Math.abs(point.value)/maxValue*100)}%`}}/><b>{metric==='share'?`${pct.format(point.value)} %`:compactMoney.format(point.value)}</b></div></div>)}
        </div>
        <div className="contract-chart-axis"><span>0</span><span>{metric==='share'?`${pct.format(maxValue)} %`:compactMoney.format(maxValue)}</span></div>
      </article>

      <aside className="panel contract-intelligence-card">
        <div className="panel-heading"><div><span className="eyebrow">RIADIACI SIGNÁL</span><h3>Tempo vs. rozpočet</h3></div></div>
        <div className="contract-gauge"><div><i style={{width:`${Math.min(100,spentShare)}%`}}/><em style={{left:`${Math.min(100,timeElapsed)}%`}}/></div><footer><span>čerpanie {pct.format(spentShare)} %</span><span>čas {pct.format(timeElapsed)} %</span></footer></div>
        <div className="contract-signal-list">
          <div><Icon name={forecastDelta>0?'warning':'check'} size={18}/><span><strong>{forecastDelta>0?'Tempo smeruje nad rozpočet':'Tempo je pod lineárnym rozpočtom'}</strong><small>Run-rate pri zachovaní priemeru: {money.format(forecast)}.</small></span></div>
          <div><Icon name="calendar" size={18}/><span><strong>Najsilnejší mesiac</strong><small>{monthNames[aggregate.monthly.indexOf(Math.max(...aggregate.monthly))]} · {money.format(Math.max(...aggregate.monthly))}</small></span></div>
          <div><Icon name="shield" size={18}/><span><strong>Metodika</strong><small>Run-rate je jednoduchá analytická extrapolácia 5 mesiacov, nie schválený forecast.</small></span></div>
        </div>
      </aside>
    </section>

    <section className="panel contract-detail-panel">
      <div className="panel-heading"><div><span className="eyebrow">DETAIL ÚLOH</span><h3>Rozpočet a čerpanie po úlohe</h3><p>Presné hodnoty zo súhrnného hárku čerpania SIT.</p></div><Badge tone="neutral">dáta do mája</Badge></div>
      <div className="contract-table-wrap"><table className="contract-table"><thead><tr><th>Úloha</th><th>Názov</th><th>Stredisko</th><th className="number">Rozpočet</th><th className="number">Vyčerpané</th><th className="number">Zostatok</th><th className="number">%</th><th className="number">Q1</th><th className="number">Q2 priebežne</th></tr></thead><tbody>{selectedTasks.map(task=><tr key={task.code}><td><strong>{task.code}</strong></td><td><strong>{task.name}</strong><small>{task.description}</small></td><td>{task.centers.join(' / ')}</td><td className="number">{money.format(task.budget)}</td><td className="number"><strong>{money.format(task.spent)}</strong></td><td className="number">{money.format(task.remaining)}</td><td className="number"><Badge tone={budgetTone(percent(task.spent,task.budget))}>{pct.format(percent(task.spent,task.budget))} %</Badge></td><td className="number">{money.format(sum(task.monthly.slice(0,3)))}</td><td className="number">{money.format(sum(task.monthly.slice(3,5)))}</td></tr>)}</tbody></table></div>
    </section>

    <section className="contract-method panel"><Icon name="shield" size={22}/><div><h3>Dôležitá hranica mapovania</h3><p>{dataset.meta.method} Detailné priradenie jednotlivých platieb k úlohe 25 sa tu zámerne neprepočítava podľa „ostatných stredísk“. Kontrolný zdroj toto pravidlo označuje ako metodické rozhodnutie, ktoré treba potvrdiť; manažérsky pohľad preto používa autoritatívny súhrn úloh.</p></div></section>
  </div>
}
