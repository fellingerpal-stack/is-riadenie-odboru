import { useEffect, useMemo, useState } from 'react'
import { Badge, Field, Icon, Modal, PageHeader } from '../components/UI'
import type { AppState, ContractDevelopmentRequest, EnterpriseGovernanceOverride } from '../types'
import { buildEnterprise360Entities, enterprisePortfolioTotals, normalize360, type Enterprise360Entity, type EnterpriseLedgerRow } from '../lib/enterprise360'
import { komisContract, type KomisContractModule } from '../data/komisContract'
import './Enterprise360.css'

type Tab='overview'|'finance'|'development'|'work'|'technology'|'governance'|'relations'
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

function sumKomis(modules:KomisContractModule[],key:'slaMonthlyNet'|'slaMonthlyGross'|'slaQuarterlyNet'|'slaQuarterlyGross'|'sla84Gross'|'developmentGross'){
  return modules.reduce((sum,item)=>sum+Number(item[key]||0),0)
}

function KomisContractPanel({entity,onSelectEntity}:{entity:Enterprise360Entity;onSelectEntity:(id:string)=>void}){
  const modules=entity.komisModules
  if(!modules.length)return null
  const quarterlyNet=sumKomis(modules,'slaQuarterlyNet')
  const quarterlyGross=sumKomis(modules,'slaQuarterlyGross')
  const monthlyNet=sumKomis(modules,'slaMonthlyNet')
  const monthlyGross=sumKomis(modules,'slaMonthlyGross')
  const supportGross=sumKomis(modules,'sla84Gross')
  const developmentGross=sumKomis(modules,'developmentGross')
  const portfolio=entity.id==='komis'
  return <section className="e360-panel e360-komis-panel">
    <header className="e360-panel-head"><div><span>KOMIS · ZMLUVNÁ FINANČNÁ VRSTVA</span><h3>{portfolio?'Kvartálne SLA platby všetkých modulov':'Kvartálne SLA a rozvoj vybraného modulu'}</h3><p>Zmluvná podpora sa platí kvartálne. Mesačný údaj je len orientačný ekvivalent kvartálnej ceny / 3.</p></div><a className="button button-secondary" href={komisContract.sourceUrl} target="_blank" rel="noreferrer"><Icon name="calendar" size={16}/> CRZ zmluva</a></header>
    <div className="e360-komis-summary">
      <MiniStat label="SLA / KVARTÁL S DPH" value={money.format(quarterlyGross)} detail={`${money.format(quarterlyNet)} bez DPH`} tone="teal"/>
      <MiniStat label="MESAČNÝ EKVIVALENT" value={money.format(monthlyGross)} detail={`${money.format(monthlyNet)} bez DPH · kvartál / 3`} tone="blue"/>
      <MiniStat label="PODPORA · 84 MESIACOV" value={money.format(supportGross)} detail={`${modules.length} ${modules.length===1?'modul':'modulov'} · 28 kvartálov`} tone="purple"/>
      <MiniStat label="VYBUDOVANIE / ROZVOJ" value={money.format(developmentGross)} detail="statická zmluvná hodnota s DPH" tone="amber"/>
      {portfolio&&<MiniStat label="CELÁ ZMLUVA KOMIS" value={money.format(komisContract.contractGross)} detail={`${money.format(komisContract.contractNet)} bez DPH`} tone="amber"/>}
    </div>
    <div className="e360-komis-module-grid">
      {modules.map(module=>{
        const target=module.entityIds.find(id=>id!==entity.id)||module.entityIds[0]||''
        const canOpen=Boolean(target&&target!==entity.id)
        const content=<><div className="e360-komis-module-head"><span>{module.code}</span>{canOpen?<Badge tone="info">360° karta</Badge>:<Badge tone="neutral">zmluvná položka</Badge>}</div><strong>{money.format(module.slaQuarterlyGross)}</strong><small>SLA / kvartál s DPH · {money.format(module.slaQuarterlyNet)} bez DPH</small><dl><div><dt>Mesačný ekvivalent</dt><dd>{money.format(module.slaMonthlyGross)}</dd></div><div><dt>Podpora 84 mes.</dt><dd>{money.format(module.sla84Gross)}</dd></div><div><dt>Rozvoj · staticky</dt><dd>{money.format(module.developmentGross)}</dd></div></dl><p>{module.title}</p></>
        return canOpen?<button key={module.id} className="e360-komis-module" onClick={()=>onSelectEntity(target)}>{content}<span className="e360-komis-open">Otvoriť 360° kartu <Icon name="arrow" size={13}/></span></button>:<article key={module.id} className="e360-komis-module">{content}</article>
      })}
    </div>
    {portfolio&&<div className="e360-komis-contract-foot"><span><strong>Rozvojový rámec CR:</strong> {komisContract.operationsFrameworkHours.toLocaleString('sk-SK')} človekohodín × {money.format(komisContract.operationsFrameworkHourlyNet)} bez DPH = {money.format(komisContract.operationsFrameworkGross)} s DPH.</span><span><strong>Kontrola súčtu:</strong> rozvoj + 84-mesačná podpora + rámec úprav = {money.format(komisContract.contractGross)} s DPH.</span></div>}
  </section>
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

function FinanceView({entity,onGo,onSelectEntity}:{entity:Enterprise360Entity;onGo:Go;onSelectEntity:(id:string)=>void}){
  const [month,setMonth]=useState<number|null>(null)
  const finance=entity.finance
  const scopedRows=useMemo(()=>month?finance.rows.filter(row=>row.month===month):finance.rows,[finance.rows,month])
  const docs=useMemo(()=>groupDocuments(scopedRows),[scopedRows])
  const scopedTotal=scopedRows.reduce((sum,row)=>sum+Number(row.amount||0),0)
  const expected=month?Number(finance.monthly[month-1]||0):finance.spent
  const maxMonth=Math.max(1,...finance.monthly.map(value=>Math.abs(value)))
  return <div className="e360-section-stack">
    <KomisContractPanel entity={entity} onSelectEntity={onSelectEntity}/>
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

function normalizeHeader(value:unknown){return normalize360(value).replace(/\s+/g,' ')}
function toNumber(value:unknown){
  if(typeof value==='number')return Number.isFinite(value)?value:0
  const text=String(value??'').trim().replace(/\s/g,'').replace(',','.').replace(/[^0-9.-]/g,'')
  const parsed=Number(text);return Number.isFinite(parsed)?parsed:0
}
function excelDate(value:unknown){
  if(value instanceof Date&&!Number.isNaN(value.getTime()))return value.toISOString().slice(0,10)
  if(typeof value==='number'&&value>20000){const base=new Date(Date.UTC(1899,11,30));base.setUTCDate(base.getUTCDate()+Math.floor(value));return base.toISOString().slice(0,10)}
  const text=String(value??'').trim();if(!text)return ''
  const direct=new Date(text);if(!Number.isNaN(direct.getTime()))return direct.toISOString().slice(0,10)
  const match=text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);return match?`${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`:text
}
function blankDevelopmentRequest(currentUser:string,contractKey:string,contractNumber:string,moduleCode=''):ContractDevelopmentRequest{
  return {id:`cr-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,contractKey,contractNumber,reference:'',title:'',moduleCode,status:'Návrh',requestDate:new Date().toISOString().slice(0,10),dueDate:'',owner:'',requestedHours:0,approvedHours:0,usedHours:0,note:'',source:'manuálne',importedAt:'',updatedAt:new Date().toISOString(),updatedBy:currentUser}
}
function DevelopmentView({entity,allRequests,canEdit,currentUser,onChange}:{entity:Enterprise360Entity;allRequests:ContractDevelopmentRequest[];canEdit:boolean;currentUser:string;onChange:(items:ContractDevelopmentRequest[])=>void}){
  const [query,setQuery]=useState('')
  const [status,setStatus]=useState('')
  const [module,setModule]=useState('')
  const [editing,setEditing]=useState<ContractDevelopmentRequest|null>(null)
  const [importMessage,setImportMessage]=useState('')
  const requests=entity.developmentRequests
  const isKomis=entity.id==='komis'
  const komisLinked=isKomis||entity.komisModules.length>0
  const contractKey=komisLinked?'komis':entity.contracts[0]?.id||entity.id
  const contractNumber=komisLinked?'KOMIS':entity.contracts[0]?.contractNumber||entity.title
  const defaultModule=isKomis?'':entity.komisModules[0]?.code||''
  const limitHours=isKomis?komisContract.operationsFrameworkHours:0
  const requested=requests.reduce((sum,item)=>sum+Number(item.requestedHours||0),0)
  const approved=requests.reduce((sum,item)=>sum+Number(item.approvedHours||0),0)
  const used=requests.reduce((sum,item)=>sum+Number(item.usedHours||0),0)
  const remaining=limitHours?Math.max(0,limitHours-used):0
  const reserved=Math.max(0,approved-used)
  const usedNet=used*komisContract.operationsFrameworkHourlyNet
  const usedGross=usedNet*(1+komisContract.vatRate)
  const modules=unique(requests.map(item=>item.moduleCode).filter(Boolean))
  const filtered=requests.filter(item=>{
    const q=normalize360(query);return (!q||normalize360(`${item.reference} ${item.title} ${item.moduleCode} ${item.owner} ${item.note}`).includes(q))&&(!status||item.status===status)&&(!module||item.moduleCode===module)
  }).sort((a,b)=>(b.requestDate||b.updatedAt).localeCompare(a.requestDate||a.updatedAt))
  function saveDraft(item:ContractDevelopmentRequest){
    const now=new Date().toISOString();const next={...item,contractKey:item.contractKey||contractKey,contractNumber:item.contractNumber||contractNumber,updatedAt:now,updatedBy:currentUser}
    const exists=allRequests.some(row=>row.id===next.id);onChange(exists?allRequests.map(row=>row.id===next.id?next:row):[...allRequests,next]);setEditing(null)
  }
  function removeDraft(item:ContractDevelopmentRequest){if(!confirm(`Vymazať ${item.reference||item.title||'CR požiadavku'}?`))return;onChange(allRequests.filter(row=>row.id!==item.id));setEditing(null)}
  async function importExcel(file:File){
    setImportMessage('Načítavam Excel…')
    try{
      const XLSX=await import('xlsx');const buffer=await file.arrayBuffer();const workbook=XLSX.read(buffer,{type:'array',cellDates:true});const sheet=workbook.Sheets[workbook.SheetNames[0]];if(!sheet)throw new Error('Excel neobsahuje pracovný hárok.')
      const raw=XLSX.utils.sheet_to_json<Record<string,unknown>>(sheet,{defval:''})
      const now=new Date().toISOString();let skipped=0
      const imported=raw.map((row,index)=>{
        const normalized=new Map(Object.entries(row).map(([key,value])=>[normalizeHeader(key),value]))
        const pick=(names:string[])=>{for(const name of names){const value=normalized.get(normalizeHeader(name));if(value!==undefined&&String(value).trim()!=='')return value}return ''}
        const reference=String(pick(['CR','CR ID','ID','Číslo','Číslo CR','Požiadavka ID','Reference'])).trim()
        const title=String(pick(['Názov','Názov požiadavky','Popis','Požiadavka','Title','Description'])).trim()
        if(!reference&&!title){skipped+=1;return null}
        return {id:reference?`${normalize360(contractKey).replace(/ /g,'-')}-${normalize360(reference).replace(/ /g,'-')}`:`${normalize360(contractKey).replace(/ /g,'-')}-import-${Date.now()}-${index}`,contractKey,contractNumber:String(pick(['Zmluva','Číslo zmluvy','Contract'])).trim()||contractNumber,reference,title:title||reference,moduleCode:String(pick(['Modul','Systém','System','Module'])).trim()||defaultModule,status:String(pick(['Stav','Status'])).trim()||'Návrh',requestDate:excelDate(pick(['Dátum','Dátum požiadavky','Request date'])),dueDate:excelDate(pick(['Termín','Deadline','Due date'])),owner:String(pick(['Vlastník','Gestor','Zodpovedný','Owner'])).trim(),requestedHours:toNumber(pick(['Požadované hodiny','Odhad hodín','Odhad','Requested hours','Estimate'])),approvedHours:toNumber(pick(['Schválené hodiny','Approved hours','Schválené'])),usedHours:toNumber(pick(['Čerpané hodiny','Spotrebované hodiny','Realizované hodiny','Used hours','Čerpanie'])),note:String(pick(['Poznámka','Komentár','Note'])).trim(),source:file.name,importedAt:now,updatedAt:now,updatedBy:currentUser} satisfies ContractDevelopmentRequest
      }).filter((item):item is ContractDevelopmentRequest=>Boolean(item))
      const merged=[...allRequests]
      imported.forEach(item=>{const idx=merged.findIndex(row=>row.contractKey===contractKey&&((item.reference&&row.reference===item.reference)||row.id===item.id));if(idx>=0)merged[idx]={...merged[idx],...item,id:merged[idx].id};else merged.push(item)})
      onChange(merged);setImportMessage(`Importované: ${imported.length} · preskočené prázdne riadky: ${skipped}.`)
    }catch(error){setImportMessage(error instanceof Error?error.message:'Import Excelu zlyhal.')}
  }
  const statusOptions=unique(requests.map(item=>item.status).filter(Boolean))
  return <div className="e360-section-stack">
    <section className="e360-panel e360-development-hero"><header className="e360-panel-head"><div><span>CR · ROZVOJOVÉ POŽIADAVKY</span><h3>{isKomis?'Čerpanie rámca 7 000 človekohodín':'Rozvojové požiadavky zmluvy'}</h3><p>{isKomis?'Zmluva umožňuje počas podpory čerpať 7 000 odsúhlasených človekohodín na zmenové požiadavky, špecifické nastavenia a súvisiace práce.':'Register CR požiadaviek naviazaných na zmluvu alebo systém.'}</p></div>{canEdit&&<div className="e360-development-actions"><button className="button button-secondary" onClick={()=>setEditing(blankDevelopmentRequest(currentUser,contractKey,contractNumber,defaultModule))}><Icon name="tasks" size={16}/> Nové CR</button>{<label className="button button-primary e360-import-button"><Icon name="upload" size={16}/> Importovať Excel<input type="file" accept=".xlsx,.xls" onChange={event=>{const file=event.target.files?.[0];if(file)void importExcel(file);event.currentTarget.value=''}}/></label>}</div>}</header>
      {isKomis&&<div className="e360-development-kpis"><MiniStat label="ZMLUVNÝ LIMIT" value={`${limitHours.toLocaleString('sk-SK')} h`} detail={`${money.format(komisContract.operationsFrameworkHourlyNet)} / h bez DPH`} tone="blue"/><MiniStat label="VYČERPANÉ" value={`${number.format(used)} h`} detail={`${money.format(usedGross)} s DPH`} tone={used/limitHours>0.8?'red':'teal'}/><MiniStat label="ZOSTÁVA" value={`${number.format(remaining)} h`} detail={`${number.format(pct(remaining,limitHours))} % rámca`} tone="green"/><MiniStat label="SCHVÁLENÉ · NEVYČERPANÉ" value={`${number.format(reserved)} h`} detail={`${number.format(approved)} h schválených spolu`} tone="amber"/><MiniStat label="POŽADOVANÉ" value={`${number.format(requested)} h`} detail={`${requests.length} CR záznamov`} tone="purple"/></div>}
      {isKomis&&<div className="e360-framework-progress"><div><span>Čerpanie rámca</span><strong>{number.format(pct(used,limitHours))} %</strong></div><i><b style={{width:`${Math.min(100,pct(used,limitHours))}%`}}/></i><small>Čerpanie sa počíta zo stĺpca „Čerpané hodiny“. Schválené a požadované hodiny sú evidované samostatne.</small></div>}
      {importMessage&&<div className="e360-import-message"><Icon name="check" size={15}/>{importMessage}</div>}
    </section>
    <section className="e360-panel"><header className="e360-panel-head"><div><span>REGISTER CR</span><h3>Rozvojové požiadavky a čerpanie</h3><p>Excel môže obsahovať stĺpce CR/ID, názov, modul, stav, požadované/schválené/čerpané hodiny, dátum, termín, vlastník a poznámka.</p></div><Badge tone="info">{filtered.length} / {requests.length}</Badge></header>
      <div className="e360-development-filters"><label><span>Hľadať</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="CR, názov, vlastník…"/></label><label><span>Modul</span><select value={module} onChange={e=>setModule(e.target.value)}><option value="">Všetky</option>{modules.map(item=><option key={item}>{item}</option>)}</select></label><label><span>Stav</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Všetky</option>{statusOptions.map(item=><option key={item}>{item}</option>)}</select></label></div>
      <div className="e360-payment-table-wrap"><table className="e360-payment-table e360-development-table"><thead><tr><th>CR</th><th>Modul</th><th>Názov</th><th>Stav</th><th>Požad.</th><th>Schvál.</th><th>Čerpané</th><th>Zostáva zo schv.</th><th>Vlastník</th><th>Termín</th></tr></thead><tbody>{filtered.map(item=><tr key={item.id} className={canEdit?'is-clickable':''} onClick={()=>canEdit&&setEditing(item)}><td><strong>{item.reference||'—'}</strong><small>{item.requestDate||''}</small></td><td>{item.moduleCode||'—'}</td><td><strong>{item.title}</strong><small>{item.note}</small></td><td><Badge tone={statusTone(item.status)}>{item.status}</Badge></td><td>{number.format(item.requestedHours)} h</td><td>{number.format(item.approvedHours)} h</td><td><strong>{number.format(item.usedHours)} h</strong></td><td>{number.format(Math.max(0,item.approvedHours-item.usedHours))} h</td><td>{item.owner||'—'}</td><td>{item.dueDate||'—'}</td></tr>)}</tbody></table>{!filtered.length&&<div className="e360-empty-small"><Icon name="tasks" size={20}/><strong>Zatiaľ bez CR požiadaviek</strong><span>Pridaj záznam ručne alebo importuj Excel.</span></div>}</div>
    </section>
    {editing&&<Modal title={editing.reference?`CR · ${editing.reference}`:'Nová rozvojová požiadavka'} onClose={()=>setEditing(null)}><div className="form-grid"><Field label="CR / referencia"><input value={editing.reference} onChange={e=>setEditing({...editing,reference:e.target.value})}/></Field><Field label="Modul"><input list="komis-module-options" value={editing.moduleCode} onChange={e=>setEditing({...editing,moduleCode:e.target.value})}/><datalist id="komis-module-options">{komisContract.modules.map(item=><option key={item.id} value={item.code}/>)}</datalist></Field><Field label="Názov požiadavky"><input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/></Field><Field label="Stav"><select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value})}>{['Návrh','Na posúdenie','Schválená','Realizácia','Dokončená','Pozastavená','Zamietnutá'].map(item=><option key={item}>{item}</option>)}</select></Field><Field label="Dátum požiadavky"><input type="date" value={editing.requestDate} onChange={e=>setEditing({...editing,requestDate:e.target.value})}/></Field><Field label="Termín"><input type="date" value={editing.dueDate} onChange={e=>setEditing({...editing,dueDate:e.target.value})}/></Field><Field label="Vlastník / gestor"><input value={editing.owner} onChange={e=>setEditing({...editing,owner:e.target.value})}/></Field><Field label="Požadované hodiny"><input type="number" min="0" step="0.5" value={editing.requestedHours} onChange={e=>setEditing({...editing,requestedHours:toNumber(e.target.value)})}/></Field><Field label="Schválené hodiny"><input type="number" min="0" step="0.5" value={editing.approvedHours} onChange={e=>setEditing({...editing,approvedHours:toNumber(e.target.value)})}/></Field><Field label="Čerpané hodiny"><input type="number" min="0" step="0.5" value={editing.usedHours} onChange={e=>setEditing({...editing,usedHours:toNumber(e.target.value)})}/></Field><Field label="Poznámka"><textarea value={editing.note} onChange={e=>setEditing({...editing,note:e.target.value})}/></Field></div><div className="modal-actions">{allRequests.some(row=>row.id===editing.id)&&<button className="button button-danger" onClick={()=>removeDraft(editing)}>Vymazať</button>}<button className="button button-secondary" onClick={()=>setEditing(null)}>Zrušiť</button><button className="button button-primary" disabled={!editing.title.trim()} onClick={()=>saveDraft(editing)}>Uložiť CR</button></div></Modal>}
  </div>
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

function GovernanceView({entity,onGo,canEdit,currentUser,employeeNames,onSave}:{entity:Enterprise360Entity;onGo:Go;canEdit:boolean;currentUser:string;employeeNames:string[];onSave:(item:EnterpriseGovernanceOverride)=>void}){
  const [editing,setEditing]=useState(false)
  const [draft,setDraft]=useState({primaryOwner:entity.primaryOwner,businessOwner:entity.businessOwner,technicalOwner:entity.technicalOwner,deputy:entity.deputy,oitOwners:entity.oitOwners.join(', ')})
  useEffect(()=>{setDraft({primaryOwner:entity.primaryOwner,businessOwner:entity.businessOwner,technicalOwner:entity.technicalOwner,deputy:entity.deputy,oitOwners:entity.oitOwners.join(', ')});setEditing(false)},[entity.id])
  const completeness=[entity.primaryOwner,entity.businessOwner,entity.technicalOwner,entity.deputy].filter(Boolean).length/4*100
  function save(){onSave({entityId:entity.id,primaryOwner:draft.primaryOwner.trim(),businessOwner:draft.businessOwner.trim(),technicalOwner:draft.technicalOwner.trim(),deputy:draft.deputy.trim(),oitOwners:draft.oitOwners.split(/[,;\n]/).map(item=>item.trim()).filter(Boolean),updatedAt:new Date().toISOString(),updatedBy:currentUser});setEditing(false)}
  return <div className="e360-two-col">
    <section className="e360-panel"><header className="e360-panel-head"><div><span>VLASTNÍCTVO A RACI</span><h3>Kto za čo zodpovedá</h3><p>Governance údaje sa dajú doplniť priamo v CVTI 360 bez prepisovania zdrojového RACI.</p></div><div className="e360-governance-actions"><Badge tone={completeness===100?'success':completeness>=50?'warning':'danger'}>{number.format(completeness)} % úplnosť</Badge>{canEdit&&<button className="button button-primary" onClick={()=>setEditing(value=>!value)}><Icon name="people" size={16}/>{editing?'Zrušiť':'Upraviť'}</button>}<button className="button button-secondary" onClick={()=>onGo('raci')}><Icon name="matrix" size={16}/> RACI</button></div></header>
      {editing?<div className="e360-governance-form"><datalist id="e360-employee-options">{employeeNames.map(name=><option key={name} value={name}/>)}</datalist><label><span>Primárny vlastník</span><input list="e360-employee-options" value={draft.primaryOwner} onChange={e=>setDraft({...draft,primaryOwner:e.target.value})}/></label><label><span>Business owner</span><input list="e360-employee-options" value={draft.businessOwner} onChange={e=>setDraft({...draft,businessOwner:e.target.value})}/></label><label><span>Technický vlastník</span><input list="e360-employee-options" value={draft.technicalOwner} onChange={e=>setDraft({...draft,technicalOwner:e.target.value})}/></label><label><span>Zástupca</span><input list="e360-employee-options" value={draft.deputy} onChange={e=>setDraft({...draft,deputy:e.target.value})}/></label><label className="is-wide"><span>OIT vlastníci</span><textarea value={draft.oitOwners} onChange={e=>setDraft({...draft,oitOwners:e.target.value})} placeholder="Mená oddelené čiarkou"/></label><div className="e360-governance-save"><button className="button button-secondary" onClick={()=>setEditing(false)}>Zrušiť</button><button className="button button-primary" onClick={save}>Uložiť zodpovednosti</button></div></div>:<><div className="e360-owner-grid"><article><small>Primárny vlastník</small><strong>{entity.primaryOwner||'Neurčený'}</strong></article><article><small>Business owner</small><strong>{entity.businessOwner||'Neurčený'}</strong></article><article><small>Technický vlastník</small><strong>{entity.technicalOwner||'Neurčený'}</strong></article><article><small>Zástupca</small><strong>{entity.deputy||'Neurčený'}</strong></article></div><div className="e360-oit-owners"><span>OIT vlastníci</span><strong>{entity.oitOwners.join(' · ')||'Neurčení'}</strong></div>{entity.governanceUpdatedAt&&<div className="e360-governance-meta"><Icon name="check" size={14}/> Ručne aktualizované {new Date(entity.governanceUpdatedAt).toLocaleString('sk-SK')} · {entity.governanceUpdatedBy||'používateľ'}</div>}</>}
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

export default function Enterprise360({state,go,canEdit,currentUser,onGovernanceChange,onDevelopmentRequestsChange}:{state:AppState;go:Go;canEdit:boolean;currentUser:string;onGovernanceChange:(items:EnterpriseGovernanceOverride[])=>void;onDevelopmentRequestsChange:(items:ContractDevelopmentRequest[])=>void}){
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
  const komisMonthlyGross=sumKomis(entity.komisModules,'slaMonthlyGross')
  const komisQuarterlyGross=sumKomis(entity.komisModules,'slaQuarterlyGross')
  const expiring=entity.contracts.filter(contract=>{const days=dueDays(contract.validTo);return days!==null&&days>=0&&days<=180})
  return <div className="enterprise360">
    <PageHeader eyebrow="CVTI 360 · ENTERPRISE INTELLIGENCE" title="Jeden pohľad na systém, službu a všetky súvislosti" description="Systémy, ľudia, RACI, úlohy, technológie, assety, incidenty, projekty, dodávatelia, zmluvy a financie v jednej 360° vrstve nad existujúcimi modulmi." actions={<button className="button button-secondary" onClick={()=>go('portals')}><Icon name="dashboard" size={16}/> Hlavný panel</button>}/>

    <section className="e360-portfolio-strip">
      <article><span>Systémy a služby</span><strong>{totals.systems}</strong><small>{totals.critical} kritických</small></article>
      <article className="is-komis"><span>KOMIS SLA / kvartál</span><strong>{compactMoney.format(totals.komisQuarterlySlaGross)}</strong><small>12 modulov · s DPH · mesačne {compactMoney.format(totals.komisMonthlySlaGross)}</small></article>
      <article className="is-komis"><span>KOMIS CR RÁMEC</span><strong>{number.format(totals.komisDevelopmentUsedHours)} / {komisContract.operationsFrameworkHours.toLocaleString('sk-SK')} h</strong><small>{totals.komisDevelopmentRequests} CR požiadaviek · 55 € / h bez DPH</small></article>
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
        <div className="e360-directory-list">{filtered.map(item=><button key={item.id} className={item.id===entity.id?'is-active':''} onClick={()=>selectEntity(item.id)}><span className={`e360-directory-score is-${toneForScore(item.readinessScore)}`}>{item.readinessScore}</span><div><strong>{item.title}</strong><small>{item.service?.category||item.businessLayer}</small><p>{item.finance.task?`Úloha ${item.finance.taskCode} · ${compactMoney.format(item.finance.spent)}`:item.komisModules.length?`KOMIS SLA · ${compactMoney.format(sumKomis(item.komisModules,'slaQuarterlyGross'))}/kv.`:`${item.cmdb.length} assetov · ${item.openWorkCount} úloh`}</p></div>{item.attentionScore>8&&<i>{item.attentionScore}</i>}</button>)}</div>
      </aside>

      <main className="e360-detail">
        <section className="e360-entity-hero">
          <div className="e360-entity-main"><div className="e360-entity-topline"><Badge tone={entity.criticality.toLowerCase().includes('krit')?'danger':'info'}>{entity.criticality}</Badge><span>{entity.confidence}</span><span>{entity.finance.task?`Financie · úloha ${entity.finance.taskCode}`:'Finančné mapovanie čerpania chýba'}</span>{entity.komisModules.length>0&&<span>KOMIS SLA · {compactMoney.format(komisQuarterlyGross)}/kv. s DPH</span>}</div><h2>{entity.title}</h2><p>{entity.businessLayer}</p><div className="e360-entity-tags">{entity.aliases.slice(0,5).map(alias=><span key={alias}>{alias}</span>)}</div></div>
          <div className="e360-score-card"><span>360 SKÓRE</span><strong>{entity.readinessScore}</strong><small>úplnosť + otvorené signály</small><div><i style={{width:`${entity.readinessScore}%`}}/></div></div>
        </section>

        <section className="e360-kpi-grid">
          <button onClick={()=>setTab('finance')}><span><Icon name="capacity" size={18}/></span><p><small>{entity.finance.task?'ČERPANIE':'FINANCIE / SLA'}</small><strong>{entity.finance.task?compactMoney.format(entity.finance.spent):komisQuarterlyGross?compactMoney.format(komisQuarterlyGross):'—'}</strong><em>{entity.finance.task?`${number.format(spentPct)} % rozpočtu${komisQuarterlyGross?` · SLA ${compactMoney.format(komisQuarterlyGross)}/kv.`:''}`:komisQuarterlyGross?`KOMIS kvartál s DPH · mesačne ${compactMoney.format(komisMonthlyGross)}`:'bez priameho mapovania'}</em></p></button>
          <button onClick={()=>setTab('work')}><span><Icon name="tasks" size={18}/></span><p><small>OTVORENÁ PRÁCA</small><strong>{entity.openWorkCount+entity.openIncidentCount+entity.openProblemCount}</strong><em>{entity.openWorkCount} úloh · {entity.openIncidentCount} ticketov</em></p></button>
          <button onClick={()=>setTab('technology')}><span><Icon name="cmdb" size={18}/></span><p><small>TECHNOLÓGIE</small><strong>{entity.cmdb.length}</strong><em>{entity.oitDomains.length} OIT domén</em></p></button>
          <button onClick={()=>setTab('governance')}><span><Icon name="risk" size={18}/></span><p><small>RIZIKÁ</small><strong>{entity.openRiskCount}</strong><em>{entity.highRiskCount} vysokých / kritických</em></p></button>
          <button onClick={()=>setTab('governance')}><span><Icon name="people" size={18}/></span><p><small>VLASTNÍK</small><strong className="is-text">{entity.primaryOwner||'Neurčený'}</strong><em>{entity.oitOwners.length} OIT väzieb</em></p></button>
          <button onClick={()=>setTab('relations')}><span><Icon name="substitute" size={18}/></span><p><small>VÄZBY</small><strong>{entity.suppliers.length+entity.contracts.length+entity.websites.length}</strong><em>dodávateľ · zmluva · web</em></p></button>
        </section>

        <nav className="e360-tabs">{([
          ['overview','Prehľad','dashboard'],['finance','Financie','capacity'],...(entity.id==='komis'||entity.contracts.length||entity.developmentRequests.length?[['development','Rozvoj / CR','tasks'] as const]:[]),['work','Práca','tasks'],['technology','Technológie','systems'],['governance','Riadenie','shield'],['relations','Vzťahy','substitute'],
        ] as [Tab,string,'dashboard'|'capacity'|'tasks'|'systems'|'shield'|'substitute'][]).map(([key,label,icon])=><button key={key} className={tab===key?'is-active':''} onClick={()=>setTab(key)}><Icon name={icon} size={16}/>{label}</button>)}</nav>

        {tab==='overview'&&<div className="e360-section-stack">
          <div className="e360-two-col e360-overview-grid">
            <section className="e360-panel"><header className="e360-panel-head"><div><span>ATTENTION CENTER</span><h3>Čomu sa venovať</h3><p>Signály z dátovej úplnosti, rizík, ticketov a problem managementu.</p></div><Badge tone={entity.attentionScore>8?'danger':entity.attentionScore>4?'warning':'success'}>{entity.attentionScore} bodov</Badge></header><Attention entity={entity}/></section>
            <section className="e360-panel"><header className="e360-panel-head"><div><span>EXECUTIVE SNAPSHOT</span><h3>Riadiaci obraz</h3><p>Najdôležitejšie väzby na jednej obrazovke.</p></div><Badge tone={toneForScore(entity.readinessScore)}>360 skóre {entity.readinessScore}</Badge></header>
              <div className="e360-snapshot-grid"><article><small>Prevádzka</small><strong>{entity.runtimeLocation||'—'}</strong><span>{entity.environment||'—'}</span></article><article><small>Dodávatelia</small><strong>{entity.suppliers.length||'—'}</strong><span>{entity.suppliers.slice(0,2).map(item=>item.supplierName).join(' · ')||'väzba nepotvrdená'}</span></article><article><small>Zmluvy</small><strong>{entity.contracts.length}</strong><span>{expiring.length?`${expiring.length} do 180 dní`:'bez blízkej expirácie v dátach'}</span></article><article><small>Web / register</small><strong>{entity.websites.length}</strong><span>{entity.websites[0]?.url||'bez priamej väzby'}</span></article>{entity.komisModules.length>0&&<article><small>KOMIS SLA / kvartál</small><strong>{money.format(komisQuarterlyGross)}</strong><span>{entity.komisModules.length} ${entity.komisModules.length===1?'modul':'modulov'} · mesačne {money.format(komisMonthlyGross)}</span></article>}</div>
            </section>
          </div>
          <section className="e360-panel"><header className="e360-panel-head"><div><span>PREKLIKY DO ZDROJOV</span><h3>Otvoriť pôvodný modul</h3><p>CVTI 360 údaje nekopíruje – toto sú zdrojové pracovné priestory.</p></div></header><div className="e360-quick-grid"><QuickLink icon="capacity" label="IT náklady" detail={entity.finance.task?`Úloha ${entity.finance.taskCode} · drill-down platieb`:'Finančný register'} onClick={()=>go('itCosts')}/><QuickLink icon="systems" label="Technologický katalóg" detail="Platforma, služby a infraštruktúra" onClick={()=>go('technology')}/><QuickLink icon="cmdb" label="Asset Management" detail={`${entity.cmdb.length} súvisiacich aktív`} onClick={()=>go('cmdb')}/><QuickLink icon="tasks" label="Riadenie práce" detail="Úlohy, projekty a zmeny" onClick={()=>go('work')}/><QuickLink icon="database" label="Dodávatelia" detail={`${entity.suppliers.length} väzieb`} onClick={()=>go('suppliers')}/><QuickLink icon="shield" label="Service 360" detail="Prevádzkové a manažérske signály" onClick={()=>go('intelligence')}/></div></section>
        </div>}
        {tab==='finance'&&<FinanceView entity={entity} onGo={go} onSelectEntity={selectEntity}/>} 
        {tab==='development'&&<DevelopmentView entity={entity} allRequests={state.contractDevelopmentRequests||[]} canEdit={canEdit} currentUser={currentUser} onChange={onDevelopmentRequestsChange}/>}
        {tab==='work'&&<WorkView entity={entity} onGo={go}/>} 
        {tab==='technology'&&<TechnologyView entity={entity} onGo={go}/>} 
        {tab==='governance'&&<GovernanceView entity={entity} onGo={go} canEdit={canEdit} currentUser={currentUser} employeeNames={state.employees.map(item=>item.name)} onSave={item=>onGovernanceChange([...(state.enterpriseGovernance||[]).filter(row=>row.entityId!==item.entityId),item])}/>} 
        {tab==='relations'&&<RelationsView entity={entity} onGo={go}/>} 
      </main>
    </div>
  </div>
}
