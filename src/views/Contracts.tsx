import { useMemo, useState, type FormEvent } from 'react'
import { Badge, Empty, Field, Icon, Modal, PageHeader } from '../components/UI'
import { buildContractDirectory, emptyContractRecord, type ContractView } from '../lib/contractDirectory'
import { buildSupplierDirectory } from '../lib/supplierDirectory'
import type { AppState, ContractRecord, ContractRenewalType, ContractStatus } from '../types'
import { komisContract } from '../data/komisContract'
import './Contracts.css'

const money = new Intl.NumberFormat('sk-SK', { style:'currency', currency:'EUR', maximumFractionDigits:0 })
const money2 = new Intl.NumberFormat('sk-SK', { style:'currency', currency:'EUR', minimumFractionDigits:2, maximumFractionDigits:2 })
const dateFmt = new Intl.DateTimeFormat('sk-SK')

type ContractTab = 'overview'|'register'|'renewals'|'sla'
type Horizon = 'all'|'expired'|'now'|'90'|'missing'

interface Props {
  state: AppState
  canEdit: boolean
  currentUser: string
  onChange: (records: ContractRecord[]) => void
  go: (view: string) => void
}

function toneForRenewal(value: ContractView['renewalState']) {
  if (value === 'Po termíne') return 'danger' as const
  if (value === 'Začať teraz') return 'warning' as const
  if (value === 'Do 90 dní') return 'info' as const
  if (value === 'Chýba termín') return 'neutral' as const
  return 'success' as const
}

function labelDate(value: string) {
  if (!value || value === 'neuvedené') return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFmt.format(date)
}

function daysLabel(days: number | null) {
  if (days == null) return 'termín chýba'
  if (days < 0) return `${Math.abs(days)} dní po termíne`
  if (days === 0) return 'končí dnes'
  return `${days} dní do konca`
}

function csvCell(value: unknown) { return `"${String(value ?? '').replace(/"/g,'""')}"` }
function downloadCsv(rows: ContractView[]) {
  const header=['Zmluva','Dodávateľ','IČO','Stav','Platnosť do','Renewal stav','Začať obnovu','Čerpanie YTD','Úlohy','Systémy','SLA','Owner','Zdroj']
  const body=rows.map(row=>[
    row.contractNumber,row.supplierName,row.supplierIco,row.status,row.validTo,row.renewalState,row.renewalStart,row.spentYtd,row.tasks.join(', '),row.systemNames.join(', '),row.slaStatus,row.owner,row.source.join(' · ')
  ])
  const text='\ufeff'+[header,...body].map(row=>row.map(csvCell).join(';')).join('\n')
  const blob=new Blob([text],{type:'text/csv;charset=utf-8'})
  const url=URL.createObjectURL(blob)
  const link=document.createElement('a');link.href=url;link.download='zmluvy-sla-renewal.csv';link.click();URL.revokeObjectURL(url)
}

function KomisContractSlaPanel(){
  return <section className="panel komis-contract-sla-panel">
    <div className="panel-heading"><div><span className="eyebrow">KOMIS · ZMLUVNÉ SLA</span><h3>Kvartálne platby podpory podľa modulov</h3><p>Zmluva definuje podporu kvartálne na 84 mesiacov. Kvartálna platba je hlavný zmluvný údaj; mesačný ekvivalent / 3 je uvedený len orientačne.</p></div><a className="button button-secondary" href={komisContract.sourceUrl} target="_blank" rel="noreferrer"><Icon name="calendar" size={16}/> Otvoriť CRZ</a></div>
    <div className="komis-contract-summary">
      <article><span>MODULY</span><strong>{komisContract.modules.length}</strong><small>samostatných SLA položiek</small></article>
      <article><span>SLA / KVARTÁL</span><strong>{money2.format(komisContract.modules.reduce((sum,item)=>sum+item.slaQuarterlyGross,0))}</strong><small>{money2.format(komisContract.modules.reduce((sum,item)=>sum+item.slaQuarterlyNet,0))} bez DPH · mesačne {money2.format(komisContract.slaMonthlyGross)}</small></article>
      <article><span>PODPORA 84 MES.</span><strong>{money2.format(komisContract.sla84Gross)}</strong><small>{money2.format(komisContract.sla84Net)} bez DPH</small></article>
      <article><span>ROZVOJ / VYBUDOVANIE</span><strong>{money2.format(komisContract.developmentGross)}</strong><small>statická hodnota s DPH</small></article>
    </div>
    <div className="komis-contract-table-wrap"><table className="contract-table komis-contract-table"><thead><tr><th>Modul</th><th>SLA / kvartál</th><th>Mesačný ekvivalent</th><th>Podpora 84 mes.</th><th>Rozvoj / vybudovanie</th></tr></thead><tbody>{komisContract.modules.map(module=><tr key={module.id}><td><strong>{module.code}</strong><small>{module.title}</small></td><td><strong>{money2.format(module.slaQuarterlyGross)}</strong><small>{money2.format(module.slaQuarterlyNet)} bez DPH</small></td><td><strong>{money2.format(module.slaMonthlyGross)}</strong><small>{money2.format(module.slaMonthlyNet)} bez DPH · ekvivalent / 3</small></td><td><strong>{money2.format(module.sla84Gross)}</strong><small>{money2.format(module.sla84Net)} bez DPH</small></td><td><strong>{money2.format(module.developmentGross)}</strong><small>{money2.format(module.developmentNet)} bez DPH · staticky</small></td></tr>)}</tbody></table></div>
    <div className="komis-contract-note"><span><strong>Rámec prevádzkových úprav:</strong> {komisContract.operationsFrameworkHours.toLocaleString('sk-SK')} hod. × {money2.format(komisContract.operationsFrameworkHourlyNet)} = {money2.format(komisContract.operationsFrameworkGross)} s DPH.</span><span><strong>Celá zmluva:</strong> {money2.format(komisContract.contractGross)} s DPH.</span></div>
  </section>
}

function ContractEditor({record,suppliers,onSave,onClose}:{record:ContractRecord;suppliers:ReturnType<typeof buildSupplierDirectory>;onSave:(record:ContractRecord)=>void;onClose:()=>void}){
  const [draft,setDraft]=useState(record)
  const update=<K extends keyof ContractRecord>(key:K,value:ContractRecord[K])=>setDraft(current=>({...current,[key]:value}))
  const supplierOptions=suppliers.filter(item=>item.ico||item.record?.name)
  function selectSupplier(value:string){
    const selected=supplierOptions.find(item=>item.key===value)
    setDraft(current=>({...current,supplierKey:value,supplierIco:selected?.ico||'',supplierName:selected?.name||''}))
  }
  function submit(event:FormEvent){event.preventDefault();onSave(draft)}
  return <Modal title="Správa zmluvy" onClose={onClose} wide>
    <form className="contract-form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Číslo zmluvy"><input value={draft.contractNumber} onChange={e=>update('contractNumber',e.target.value)} placeholder="napr. 109/2020"/></Field>
        <Field label="Názov / predmet"><input value={draft.title} onChange={e=>update('title',e.target.value)} placeholder="Technická podpora KOMIS"/></Field>
        <Field label="Dodávateľ"><select value={draft.supplierKey} onChange={e=>selectSupplier(e.target.value)}><option value="">— vyberte —</option>{supplierOptions.map(item=><option key={item.key} value={item.key}>{item.name} {item.ico?`· ${item.ico}`:''}</option>)}</select></Field>
        <Field label="Stav"><select value={draft.status} onChange={e=>update('status',e.target.value as ContractStatus)}>{(['Aktívna','Príprava obnovy','Na obstaranie','Ukončená','Pozastavená'] as ContractStatus[]).map(value=><option key={value}>{value}</option>)}</select></Field>
        <Field label="Platnosť od"><input type="date" value={draft.validFrom} onChange={e=>update('validFrom',e.target.value)}/></Field>
        <Field label="Platnosť do"><input type="date" value={draft.validTo} onChange={e=>update('validTo',e.target.value)}/></Field>
        <Field label="Výpovedná lehota (dni)"><input type="number" min="0" value={draft.noticePeriodDays} onChange={e=>update('noticePeriodDays',Number(e.target.value)||0)}/></Field>
        <Field label="Lead time obstarávania (dni)"><input type="number" min="0" value={draft.procurementLeadDays} onChange={e=>update('procurementLeadDays',Number(e.target.value)||0)}/></Field>
        <Field label="Spôsob obnovy"><select value={draft.renewalType} onChange={e=>update('renewalType',e.target.value as ContractRenewalType)}>{(['Manuálne rozhodnutie','Automatická obnova','Nové obstarávanie','Bez obnovy'] as ContractRenewalType[]).map(value=><option key={value}>{value}</option>)}</select></Field>
        <Field label="Owner / garant"><input value={draft.owner} onChange={e=>update('owner',e.target.value)} placeholder="Zodpovedná osoba"/></Field>
        <Field label="Úloha 10 / 22 / 25"><input value={draft.task} onChange={e=>update('task',e.target.value)} placeholder="10"/></Field>
        <Field label="Ročná hodnota (€)"><input type="number" min="0" step="0.01" value={draft.annualValue||''} onChange={e=>update('annualValue',Number(e.target.value)||0)}/></Field>
        <Field label="Celková hodnota (€)"><input type="number" min="0" step="0.01" value={draft.totalValue||''} onChange={e=>update('totalValue',Number(e.target.value)||0)}/></Field>
        <Field label="SLA"><select value={draft.slaRequired?'yes':'no'} onChange={e=>update('slaRequired',e.target.value==='yes')}><option value="no">Nevyžaduje sa / neurčené</option><option value="yes">Vyžaduje sa</option></select></Field>
        <Field label="SLA cieľ"><input value={draft.slaTarget} onChange={e=>update('slaTarget',e.target.value)} placeholder="napr. 99,9 % / P1 4h"/></Field>
        <Field label="SLA stav"><input value={draft.slaStatus} onChange={e=>update('slaStatus',e.target.value)} placeholder="Platné / preveriť"/></Field>
        <Field label="CRZ URL"><input value={draft.crzUrl} onChange={e=>update('crzUrl',e.target.value)}/></Field>
        <Field label="DMS URL"><input value={draft.dmsUrl} onChange={e=>update('dmsUrl',e.target.value)}/></Field>
        <Field label="Systémy / moduly" hint="Oddeľte čiarkou"><input value={draft.systemNames.join(', ')} onChange={e=>update('systemNames',e.target.value.split(',').map(v=>v.trim()).filter(Boolean))}/></Field>
      </div>
      <Field label="Poznámka"><textarea rows={4} value={draft.note} onChange={e=>update('note',e.target.value)}/></Field>
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Zrušiť</button><button className="button button-primary" type="submit"><Icon name="check" size={16}/> Uložiť zmluvu</button></div>
    </form>
  </Modal>
}

export default function Contracts({state,canEdit,currentUser,onChange,go}:Props){
  const [tab,setTab]=useState<ContractTab>('overview')
  const [search,setSearch]=useState('')
  const [supplier,setSupplier]=useState('all')
  const [horizon,setHorizon]=useState<Horizon>('all')
  const [editing,setEditing]=useState<ContractRecord|null>(null)
  const directory=useMemo(()=>buildContractDirectory(state),[state])
  const suppliers=useMemo(()=>buildSupplierDirectory(state),[state])
  const supplierNames=useMemo(()=>[...new Set(directory.map(item=>item.supplierName).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'sk')),[directory])
  const q=search.trim().toLowerCase()
  const filtered=useMemo(()=>directory.filter(item=>{
    if(supplier!=='all'&&item.supplierName!==supplier)return false
    if(horizon==='expired'&&item.renewalState!=='Po termíne')return false
    if(horizon==='now'&&item.renewalState!=='Začať teraz')return false
    if(horizon==='90'&&item.renewalState!=='Do 90 dní')return false
    if(horizon==='missing'&&item.renewalState!=='Chýba termín')return false
    if(q&&!`${item.contractNumber} ${item.aliases.join(' ')} ${item.supplierName} ${item.supplierIco} ${item.systemNames.join(' ')} ${item.tasks.join(' ')} ${item.owner}`.toLowerCase().includes(q))return false
    return true
  }),[directory,supplier,horizon,q])

  const totalSpend=directory.reduce((sum,item)=>sum+item.spentYtd,0)
  const renewNow=directory.filter(item=>item.renewalState==='Po termíne'||item.renewalState==='Začať teraz').length
  const missingValidity=directory.filter(item=>item.renewalState==='Chýba termín').length
  const slaGaps=directory.filter(item=>item.slaRequired&&!item.slaStatus.trim()).length

  function saveRecord(record:ContractRecord){
    const now=new Date().toISOString()
    const next={...record,updatedAt:now,updatedBy:currentUser}
    const exists=state.contractRecords.some(item=>item.id===record.id)
    onChange(exists?state.contractRecords.map(item=>item.id===record.id?next:item):[...state.contractRecords,next])
    setEditing(null)
  }
  function removeRecord(record:ContractRecord){
    if(!confirm(`Odstrániť spravovanú vrstvu zmluvy ${record.contractNumber||record.title}? Zdrojový záznam môže zostať zobrazený.`))return
    onChange(state.contractRecords.filter(item=>item.id!==record.id))
  }

  const renewalRows=directory.filter(item=>item.renewalState!=='Neskôr').slice(0,20)
  const slaRows=directory.filter(item=>item.slaRequired||item.slaStatus||item.systemNames.length).sort((a,b)=>Number(Boolean(a.slaStatus))-Number(Boolean(b.slaStatus)))

  return <div className="contracts-page">
    <PageHeader eyebrow="ZMLUVY · SLA · OBNOVA" title="Contract & Renewal Control" description="Jedno miesto pre dodávateľské zmluvy, platnosť, SLA, čerpanie, výpovedné lehoty a prípravu obnovy alebo obstarávania. Zdrojové zmluvné referencie sa spájajú s dodávateľmi, systémami a platbami." actions={<><button className="button button-secondary" onClick={()=>downloadCsv(filtered)}><Icon name="download" size={17}/> CSV</button>{canEdit&&<button className="button button-primary" onClick={()=>setEditing(emptyContractRecord())}><Icon name="plus" size={17}/> Nová zmluva</button>}</>}/>

    <section className="contract-kpis">
      <button onClick={()=>{setHorizon('all');setTab('register')}}><span>ZMLUVY / REFERENCIE</span><strong>{directory.length}</strong><small>{state.contractRecords.length} spravovaných</small></button>
      <button onClick={()=>{setHorizon('all');setTab('register')}}><span>ČERPANIE 2026</span><strong>{money.format(totalSpend)}</strong><small>SIT 01–05/2026 podľa zmluvnej referencie</small></button>
      <button className={renewNow?'alert':''} onClick={()=>{setHorizon('now');setTab('renewals')}}><span>OBNOVA · RIEŠIŤ</span><strong>{renewNow}</strong><small>po termíne alebo už v lead-time</small></button>
      <button className={missingValidity?'warn':''} onClick={()=>{setHorizon('missing');setTab('register')}}><span>CHÝBA PLATNOSŤ</span><strong>{missingValidity}</strong><small>doplniť termín pre renewal radar</small></button>
      <button className={slaGaps?'warn':''} onClick={()=>setTab('sla')}><span>SLA MEDZERY</span><strong>{slaGaps}</strong><small>vyžaduje sa, ale chýba stav</small></button>
    </section>

    <div className="contract-tabs">
      <button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Prehľad</button>
      <button className={tab==='register'?'active':''} onClick={()=>setTab('register')}>Register zmlúv</button>
      <button className={tab==='renewals'?'active':''} onClick={()=>setTab('renewals')}>Renewal radar</button>
      <button className={tab==='sla'?'active':''} onClick={()=>setTab('sla')}>SLA kontrola</button>
    </div>

    {tab==='overview'&&<div className="contract-overview-grid">
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">NAJBLIŽŠIE ROZHODNUTIA</span><h3>Obnova a obstarávanie</h3><p>Lead-time = maximum výpovednej lehoty a času potrebného na obstarávanie.</p></div></div><div className="renewal-list">{renewalRows.length?renewalRows.slice(0,8).map(item=><button key={item.canonicalKey} onClick={()=>{setSearch(item.contractNumber);setTab('register')}}><Badge tone={toneForRenewal(item.renewalState)}>{item.renewalState}</Badge><span><strong>{item.contractNumber}</strong><small>{item.supplierName} · {daysLabel(item.daysToEnd)}</small></span><b>{item.renewalStart?`štart ${labelDate(item.renewalStart)}`:'termín doplniť'}</b></button>):<Empty title="Žiadny renewal signál" text="Po doplnení dátumov platnosti sa tu zobrazia termíny obnovy."/>}</div></section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">KONCENTRÁCIA</span><h3>Najvyššie čerpanie podľa zmluvy</h3></div></div><div className="contract-spend-list">{[...directory].sort((a,b)=>b.spentYtd-a.spentYtd).filter(item=>item.spentYtd).slice(0,8).map(item=><button key={item.canonicalKey} onClick={()=>{setSearch(item.contractNumber);setTab('register')}}><span><strong>{item.contractNumber}</strong><small>{item.supplierName}</small></span><b>{money.format(item.spentYtd)}</b></button>)}</div></section>
      <section className="panel span-all"><div className="panel-heading"><div><span className="eyebrow">RIADIACI MODEL</span><h3>Zmluva → dodávateľ → služba → náklad → renewal</h3><p>Spravovaná karta zmluvy dopĺňa zdrojové referencie bez prepisovania pôvodných platieb alebo registra IS.</p></div><button className="button button-secondary" onClick={()=>go('suppliers')}>Dodávatelia →</button></div><div className="contract-flow"><span>Zmluva</span><i>→</i><span>Dodávateľ</span><i>→</i><span>IS / modul</span><i>→</i><span>SLA</span><i>→</i><span>€ čerpanie</span><i>→</i><span>Obnova</span></div></section>
      <section className="panel span-all komis-contract-overview"><div className="panel-heading"><div><span className="eyebrow">KOMIS · INTERWAY</span><h3>12 modulov · SLA {money2.format(komisContract.modules.reduce((sum,item)=>sum+item.slaQuarterlyGross,0))} / kvartál s DPH</h3><p>CRZ štruktúrovaný rozpočet: podpora 84 mesiacov + statické náklady na vybudovanie/rozvoj jednotlivých modulov.</p></div><button className="button button-primary" onClick={()=>setTab('sla')}>Rozpad SLA podľa modulov →</button></div></section>
    </div>}

    {tab==='register'&&<>
      <section className="contract-toolbar"><div className="search-box"><Icon name="search" size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Zmluva, dodávateľ, IČO, systém, úloha…"/></div><select value={supplier} onChange={e=>setSupplier(e.target.value)}><option value="all">Všetci dodávatelia</option>{supplierNames.map(name=><option key={name}>{name}</option>)}</select><select value={horizon} onChange={e=>setHorizon(e.target.value as Horizon)}><option value="all">Všetky termíny</option><option value="expired">Po termíne</option><option value="now">Začať teraz</option><option value="90">Do 90 dní</option><option value="missing">Chýba termín</option></select><button className="button button-secondary" onClick={()=>{setSearch('');setSupplier('all');setHorizon('all')}}>Reset</button></section>
      <section className="contract-table-shell"><table className="contract-table"><thead><tr><th>Zmluva</th><th>Dodávateľ</th><th>Platnosť / obnova</th><th>Systémy / úlohy</th><th>SLA</th><th>Čerpanie</th><th>Zdroj</th><th></th></tr></thead><tbody>{filtered.map(item=><tr key={item.canonicalKey}><td><strong>{item.contractNumber}</strong><small>{item.title||item.topNotes[0]||item.aliases.filter(alias=>alias!==item.contractNumber).join(' · ')||'Zmluvná referencia'}</small>{item.managed&&<Badge tone="success">spravované</Badge>}</td><td><strong>{item.supplierName}</strong><small>{item.supplierIco?`IČO ${item.supplierIco}`:'IČO neurčené'}</small></td><td><Badge tone={toneForRenewal(item.renewalState)}>{item.renewalState}</Badge><small>do {labelDate(item.validTo)} · {daysLabel(item.daysToEnd)}</small>{item.renewalStart&&<small>štart obnovy {labelDate(item.renewalStart)}</small>}</td><td><strong>{item.systemNames.slice(0,2).join(', ')||'—'}</strong><small>{item.tasks.length?`Úloha ${item.tasks.join(', ')}`:'bez väzby na úlohu'}</small></td><td><strong>{item.slaStatus||'—'}</strong><small>{item.slaTarget|| (item.slaRequired?'SLA doplniť':'neurčené')}</small></td><td><strong>{item.spentYtd?money.format(item.spentYtd):'—'}</strong><small>{item.paymentCount?`${item.paymentCount} platieb`:'bez platby v SIT'}</small></td><td><small>{item.source.join(' · ')||'spravovaná evidencia'}</small></td><td><div className="row-actions">{canEdit&&<button className="icon-button" title={item.managed?'Upraviť':'Spravovať zmluvu'} onClick={()=>setEditing(emptyContractRecord(item))}><Icon name="edit" size={16}/></button>}{canEdit&&item.managed&&<button className="icon-button danger" title="Odstrániť spravovanú vrstvu" onClick={()=>removeRecord(item.managed!)}><Icon name="trash" size={16}/></button>}</div></td></tr>)}</tbody></table>{!filtered.length&&<Empty title="Žiadne zmluvy" text="Zmeňte filtre alebo vytvorte spravovanú kartu zmluvy."/>}</section>
    </>}

    {tab==='renewals'&&<section className="panel renewal-radar"><div className="panel-heading"><div><span className="eyebrow">LIFECYCLE ZMLÚV</span><h3>Renewal radar</h3><p>Termín „začať obnovu“ sa počíta spätne od platnosti podľa dlhšieho z: výpovedná lehota / lead-time obstarávania.</p></div></div><div className="renewal-columns">{(['Po termíne','Začať teraz','Do 90 dní','Chýba termín','Neskôr'] as ContractView['renewalState'][]).map(group=><section key={group}><header><Badge tone={toneForRenewal(group)}>{group}</Badge><b>{directory.filter(item=>item.renewalState===group).length}</b></header>{directory.filter(item=>item.renewalState===group).slice(0,12).map(item=><button key={item.canonicalKey} onClick={()=>{setSearch(item.contractNumber);setTab('register')}}><strong>{item.contractNumber}</strong><span>{item.supplierName}</span><small>{item.validTo?`do ${labelDate(item.validTo)}`:'bez dátumu'}{item.renewalStart?` · štart ${labelDate(item.renewalStart)}`:''}</small></button>)}</section>)}</div></section>}

    {tab==='sla'&&<div className="contract-sla-stack"><KomisContractSlaPanel/><section className="contract-table-shell"><table className="contract-table"><thead><tr><th>Zmluva</th><th>Dodávateľ</th><th>Systémy</th><th>SLA stav</th><th>SLA cieľ</th><th>Platnosť</th><th>Akcia</th></tr></thead><tbody>{slaRows.map(item=><tr key={item.canonicalKey}><td><strong>{item.contractNumber}</strong></td><td><strong>{item.supplierName}</strong><small>{item.supplierIco}</small></td><td><span>{item.systemNames.join(', ')||'—'}</span></td><td><Badge tone={item.slaStatus?'success':item.slaRequired?'warning':'neutral'}>{item.slaStatus|| (item.slaRequired?'doplniť':'neurčené')}</Badge></td><td>{item.slaTarget||'—'}</td><td>{labelDate(item.validTo)}</td><td>{canEdit?<button className="button button-secondary button-small" onClick={()=>setEditing(emptyContractRecord(item))}>Doplniť</button>:<span>Read-only</span>}</td></tr>)}</tbody></table></section></div>}

    {editing&&<ContractEditor record={editing} suppliers={suppliers} onSave={saveRecord} onClose={()=>setEditing(null)}/>} 
  </div>
}
