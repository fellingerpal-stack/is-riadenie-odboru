import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Badge, Empty, Icon, Modal, PageHeader, Progress } from '../components/UI'
import { oitData, type OitRaciRow, type OitRackItem } from '../data/oitData'
import { loadOitTopologyDocuments, type OitTopologyDocuments } from '../lib/oitDocuments'
import type { Employee, RaciItem, Substitution } from '../types'
import RaciDepartmentComparison from './RaciComparison'
import RaciIntelligence from './RaciIntelligence'

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

interface OitRaciInsightSettings {
  responsibleLimitPercent: number
  includeSingleResponsible: boolean
  flagCombinedAR: boolean
}

const OIT_RACI_SETTINGS_KEY = 'cvti-oit-raci-insight-settings-v1'
const defaultOitRaciSettings: OitRaciInsightSettings = {
  responsibleLimitPercent: 35,
  includeSingleResponsible: true,
  flagCombinedAR: true,
}

function loadOitRaciSettings(): OitRaciInsightSettings {
  try {
    const raw = localStorage.getItem(OIT_RACI_SETTINGS_KEY)
    if (!raw) return defaultOitRaciSettings
    const parsed = JSON.parse(raw) as Partial<OitRaciInsightSettings>
    return {
      responsibleLimitPercent: typeof parsed.responsibleLimitPercent === 'number' ? Math.min(60, Math.max(20, parsed.responsibleLimitPercent)) : defaultOitRaciSettings.responsibleLimitPercent,
      includeSingleResponsible: typeof parsed.includeSingleResponsible === 'boolean' ? parsed.includeSingleResponsible : defaultOitRaciSettings.includeSingleResponsible,
      flagCombinedAR: typeof parsed.flagCombinedAR === 'boolean' ? parsed.flagCombinedAR : defaultOitRaciSettings.flagCombinedAR,
    }
  } catch {
    return defaultOitRaciSettings
  }
}

export function OitDashboard({go}:{go:Go}){
  const processes=oitData.raciAreas.reduce((sum,a)=>sum+a.rows.length,0)
  const activeDevices=oitData.rackInventory.filter(i=>i.device&&!i.device.toLowerCase().includes('voln')&&i.status.toLowerCase().includes('zive')).length
  const areaSummary=oitData.raciAreas.map(area=>({id:area.id,title:area.title,count:area.rows.length}))
  const maxAreaCount=Math.max(...areaSummary.map(area=>area.count),1)
  const modules=[
    {view:'oitRaci',number:'01',title:'RACI a kompetencie',description:'Komplexná RACI matica OIT podľa konkrétnych pracovníkov, oblastí a procesov.',tags:[`${processes} procesov`,`${oitData.people.length} pracovníkov`,'Rizikové medzery'],icon:'matrix' as const,tone:'blue'},
    {view:'oitDc',number:'02',title:'Dátové centrá a serverovne',description:'Oddelený pohľad na DC VaV Žilina a serverovňu Lamačská cesta vrátane rackov a kapacít.',tags:['2 lokality',`${new Set(oitData.rackInventory.map(i=>i.rack).filter(Boolean)).size} rackov DC VaV`,`${new Set(oitData.lamacskaRackInventory.map(i=>i.rack).filter(Boolean)).size} rackov Lamačská`],icon:'database' as const,tone:'green'},
    {view:'oitNetwork',number:'03',title:'Sieťová architektúra',description:'Topológie DC VaV, OOB siete a serverovne Lamačská spolu s katalógom serverového softvéru.',tags:['4 chránené dokumenty','OOB','Lamačská'],icon:'web' as const,tone:'purple'},
    {view:'oitSystems',number:'04',title:'Systémy a projekty',description:'Zdrojový register projektov a systémov prevádzkovaných v dátovom centre.',tags:[`${oitData.projects.length} položiek`,'Vyhľadávanie','Prevádzkový stav'],icon:'systems' as const,tone:'gold'},
    {view:'oitOperations',number:'05',title:'Prevádzka a riziká',description:'Non-IT technológie, servisný režim a zariadenia určené na obnovu alebo vyradenie.',tags:['UPS a napájanie','Chladenie','Životný cyklus'],icon:'risk' as const,tone:'red'},
    {view:'oitRelations',number:'06',title:'Prevádzkové väzby',description:'Spoločný pohľad OIT na služby, CMDB, ServiceDesk, problémy, zmeny, projekty, riziká a RACI.',tags:['CMDB a služby','ITSM workflow','Krytie a medzery'],icon:'substitute' as const,tone:'purple'},
    {view:'oitArchitecture',number:'07',title:'Architektúra služieb',description:'Prepojenie služieb a projektov odboru 3.2 s lokalitami, platformami, monitoringom a zálohami odboru 3.1.',tags:['ORIS ↔ OIT','Lokality a platformy','Závislosti'],icon:'services' as const,tone:'blue'},
  ]
  return <>
    <PageHeader eyebrow="OIT · manažérsky rozcestník" title="3.1 Odbor správy a prevádzky IT infraštruktúry" description="Sedem samostatných pohľadov vytvorených zo zdrojovej RACI matice, inventárov oboch serverových lokalít, prevádzkového reportu, sieťových topológií a spoločných ITSM registrov."/>
    <section className="oit-overview-grid">
      <article className="panel oit-process-distribution">
        <div className="panel-heading"><div><span className="eyebrow">Rozloženie procesov OIT</span><h3>Odborné oblasti podľa zdrojovej matice</h3></div><Badge tone="info">{processes} procesov</Badge></div>
        <div className="oit-horizontal-chart">{areaSummary.map(area=><button key={area.id} onClick={()=>go('oitRaci')} title={`${area.title}: ${area.count} procesov`}>
          <span className="oit-chart-label">{area.title}</span>
          <span className="oit-chart-track"><i style={{width:`${Math.max(10,(area.count/maxAreaCount)*100)}%`}}/></span>
          <strong>{area.count}</strong>
        </button>)}</div>
        <div className="oit-chart-axis"><span>0</span><span>Počet procesov</span><span>{maxAreaCount}</span></div>
      </article>
      <article className="panel oit-module-summary">
        <div className="panel-heading"><div><span className="eyebrow">Moduly OIT</span><h3>Rýchly vstup</h3></div></div>
        <div>{modules.map(module=><button key={module.view} onClick={()=>go(module.view)}><span className={`oit-module-icon oit-tone-${module.tone}`}><Icon name={module.icon} size={19}/></span><span><strong>{module.title}</strong><small>{module.description}</small></span><Icon name="chevron" size={17}/></button>)}</div>
      </article>
    </section>
    <section className="oit-app-grid">{modules.map(m=><article className={`oit-app-card oit-tone-${m.tone}`} key={m.view}>
      <div className="oit-app-head"><div className="oit-app-icon"><Icon name={m.icon} size={24}/></div><span>APLIKÁCIA {m.number}</span></div>
      <h2>{m.title}</h2><p>{m.description}</p>
      <div className="oit-app-tags">{m.tags.map(t=><span key={t}>{t}</span>)}</div>
      <button onClick={()=>go(m.view)}>Otvoriť modul <Icon name="arrow" size={17}/></button>
    </article>)}</section>
  </>
}

export function OitRaci({orisItems,orisEmployees=[],substitutions=[]}:{orisItems:RaciItem[];orisEmployees?:Employee[];substitutions?:Substitution[]}){
  const [area,setArea]=useState('all')
  const [query,setQuery]=useState('')
  const [issue,setIssue]=useState('all')
  const [tab,setTab]=useState<'overview'|'intelligence'|'matrix'|'risks'|'people'|'compare'|'rules'>('overview')
  const [peopleSort,setPeopleSort]=useState<'R'|'A'|'spof'|'participation'>('R')
  const [settings,setSettings]=useState<OitRaciInsightSettings>(loadOitRaciSettings)
  const rows=useMemo(()=>oitData.raciAreas.flatMap(a=>a.rows.map(row=>({...row,areaId:a.id,areaTitle:a.title}))),[])
  const filtered=rows.filter(row=>(area==='all'||row.areaId===area)&&(issue==='all'||(issue==='ok'?!raciIssue(row):raciIssue(row)===issue))&&`${row.process} ${row.note} ${row.areaTitle}`.toLowerCase().includes(query.toLowerCase()))
  const structuralIssues=rows.filter(row=>['Chýba A','Viac A','Chýba R'].includes(raciIssue(row)))
  const continuityIssues=rows.filter(row=>roleCount(row,'R')===1)
  const combinedRows=rows.filter(row=>Object.values(row.assignments).some(value=>splitRoles(value).includes('A')&&splitRoles(value).includes('R')))
  const missingA=rows.filter(r=>roleCount(r,'A')===0).length
  const noR=rows.filter(r=>roleCount(r,'R')===0).length
  const singleR=continuityIssues.length
  const peopleStats=oitData.people.map(person=>{
    const values=rows.map(row=>row.assignments[person.id]||'')
    const has=(role:string,value:string)=>splitRoles(value).includes(role)
    return {person,
      A:values.filter(value=>has('A',value)).length,
      R:values.filter(value=>has('R',value)).length,
      C:values.filter(value=>has('C',value)).length,
      I:values.filter(value=>has('I',value)).length,
      combinedAR:values.filter(value=>has('A',value)&&has('R',value)).length,
      pureR:values.filter(value=>value==='R').length,
      participation:values.filter(Boolean).length,
      uniqueR:rows.filter(row=>has('R',row.assignments[person.id]||'')&&roleCount(row,'R')===1).length,
    }
  })
  const sortedPeople=[...peopleStats].sort((a,b)=>peopleSort==='spof'?b.uniqueR-a.uniqueR:peopleSort==='participation'?b.participation-a.participation:b[peopleSort]-a[peopleSort]||a.person.name.localeCompare(b.person.name,'sk'))
  const topExecutor=[...peopleStats].sort((a,b)=>b.R-a.R)[0]
  const accountable=[...peopleStats].sort((a,b)=>b.A-a.A)
  const concentratedExecutors=peopleStats.filter(stat=>rows.length&&Math.round(stat.R/rows.length*100)>=settings.responsibleLimitPercent).sort((a,b)=>b.R-a.R)
  const signals=rows.map(row=>{
    const issues:string[]=[]
    const formal=raciIssue(row)
    if(['Chýba A','Viac A','Chýba R'].includes(formal))issues.push(formal)
    if(settings.includeSingleResponsible&&roleCount(row,'R')===1)issues.push('Jediný R')
    if(settings.flagCombinedAR&&Object.values(row.assignments).some(value=>splitRoles(value).includes('A')&&splitRoles(value).includes('R')))issues.push('Spojené A/R')
    const score=issues.reduce((sum,value)=>sum+(value==='Chýba A'||value==='Viac A'||value==='Chýba R'?8:value==='Jediný R'?4:2),0)
    return {...row,issues,score}
  }).filter(row=>row.issues.length).sort((a,b)=>b.score-a.score||a.process.localeCompare(b.process,'sk'))
  const penalty=structuralIssues.length*12+(settings.includeSingleResponsible?singleR:0)+(settings.flagCombinedAR?combinedRows.length:0)+concentratedExecutors.length*3
  const readiness=Math.max(0,Math.min(100,100-penalty))

  function updateSettings(patch:Partial<OitRaciInsightSettings>){
    const next={...settings,...patch}
    setSettings(next)
    localStorage.setItem(OIT_RACI_SETTINGS_KEY,JSON.stringify(next))
  }
  function resetSettings(){setSettings(defaultOitRaciSettings);localStorage.setItem(OIT_RACI_SETTINGS_KEY,JSON.stringify(defaultOitRaciSettings))}

  return <>
    <PageHeader eyebrow="Odbor 3.1 · zodpovednosti" title="RACI odboru správy a prevádzky IT infraštruktúry" description="Matica oddeľuje formálnu konečnú zodpovednosť A od praktického vykonávania R. Manažérsky pohľad vyhodnocuje formálne medzery, zastupiteľnosť a koncentráciu technického výkonu."/>
    <div className="raci-reading-note"><Icon name="warning" size={19}/><div><strong>Prečo má riaditeľ 79 rolí A?</strong><span>V zdrojovej matici je riaditeľ formálne Accountable za všetkých 79 procesov. Praktickú prácu však vyjadruje rola R: tú majú podľa oblasti viacerí odborní pracovníci. Manažérsky pohľad preto samostatne hodnotí výkon R, formálne A a kontinuitné riziká.</span></div></div>
    <section className="kpi-grid oit-kpi-grid">
      <article className="kpi-card"><span>PROCESY</span><strong>{rows.length}</strong><small>{oitData.raciAreas.length} odborných oblastí</small></article>
      <article className="kpi-card"><span>ŠTRUKTURÁLNE MEDZERY</span><strong>{structuralIssues.length}</strong><small>chýba A/R alebo je viac A</small></article>
      <article className="kpi-card"><span>JEDINÝ VYKONÁVATEĽ</span><strong>{singleR}</strong><small>kontinuitné riziko, nie chyba RACI</small></article>
      <article className="kpi-card"><span>NAJVIAC R</span><strong>{topExecutor?.R||0}</strong><small>{topExecutor?.person.name||'—'} · praktické vykonávanie</small></article>
    </section>
    <div className="raci-view-tabs oit-raci-view-tabs" role="tablist" aria-label="Pohľady RACI OIT">
      <button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}><Icon name="dashboard" size={18}/>Manažérsky pohľad <span>{signals.length}</span></button>
      <button className={tab==='intelligence'?'active':''} onClick={()=>setTab('intelligence')}><Icon name="decision" size={18}/>RACI Intelligence</button>
      <button className={tab==='matrix'?'active':''} onClick={()=>setTab('matrix')}><Icon name="matrix" size={18}/>RACI matica <span>{rows.length}</span></button>
      <button className={tab==='risks'?'active':''} onClick={()=>setTab('risks')}><Icon name="risk" size={18}/>Riadenie a kontinuita <span>{singleR}</span></button>
      <button className={tab==='people'?'active':''} onClick={()=>setTab('people')}><Icon name="people" size={18}/>Ľudia a výkon rolí</button>
      <button className={tab==='compare'?'active':''} onClick={()=>setTab('compare')}><Icon name="substitute" size={18}/>Porovnanie 3.1 / 3.2</button>
      <button className={tab==='rules'?'active':''} onClick={()=>setTab('rules')}><Icon name="shield" size={18}/>Pravidlá</button>
    </div>

    {tab==='intelligence'&&<RaciIntelligence orisItems={orisItems} orisEmployees={orisEmployees} substitutions={substitutions}/>}

    {tab==='overview'&&<div className="raci-insight-view oit-raci-insight-view">
      <section className="raci-insight-hero"><div><div className="raci-insight-eyebrow">Riadiaci signál OIT</div><h2>{structuralIssues.length?`${structuralIssues.length} procesov má formálnu medzeru v R alebo A.`:'Matica je formálne úplná; hlavnou témou je zastupiteľnosť a koncentrácia know-how.'}</h2><p>Výsledok nehodnotí odpracované hodiny. Zobrazuje, kde chýba vlastník alebo vykonávateľ, kde je iba jeden R a kde sa veľká časť praktického výkonu koncentruje na jedného pracovníka.</p></div><div className={`raci-readiness readiness-${readiness>=75?'good':readiness>=55?'watch':'risk'}`}><span>Orientačná pripravenosť</span><strong>{readiness}%</strong><small>podľa aktívnych pravidiel</small></div></section>
      <div className="raci-insight-kpis"><article><span className="raci-kpi-icon tone-success"><Icon name="check" size={20}/></span><div><small>Formálne úplné</small><strong>{rows.length-structuralIssues.length}/{rows.length}</strong><p>presne jeden A a minimálne jeden R</p></div></article><article><span className="raci-kpi-icon tone-warning"><Icon name="people" size={20}/></span><div><small>Jediný vykonávateľ</small><strong>{singleR}</strong><p>procesy bez druhej výkonovej roly</p></div></article><article><span className="raci-kpi-icon tone-info"><Icon name="substitute" size={20}/></span><div><small>Spojené A/R</small><strong>{combinedRows.length}</strong><p>výkon a schválenie na jednej osobe</p></div></article><article><span className="raci-kpi-icon tone-purple"><Icon name="capacity" size={20}/></span><div><small>Koncentrácia R</small><strong>{concentratedExecutors.length}</strong><p>nad nastaveným limitom {settings.responsibleLimitPercent}%</p></div></article></div>
      <div className="raci-insight-layout"><section className="raci-insight-panel raci-risk-panel"><div className="raci-panel-heading"><div><span>Priorita preverenia</span><h3>Procesy s najsilnejším prevádzkovým signálom</h3></div><Badge tone={signals.length?'warning':'success'}>{signals.length} procesov</Badge></div>{signals.length?<div className="raci-risk-list">{signals.slice(0,12).map(signal=><button type="button" key={signal.id} className={`raci-risk-item risk-${signal.score>=8?'danger':signal.score>=4?'warning':'info'}`} onClick={()=>{setArea(signal.areaId);setQuery(signal.process);setTab('matrix')}}><span className="raci-risk-rank">{signal.score}</span><span className="raci-risk-main"><span className="raci-risk-meta">{signal.areaTitle}</span><strong>{signal.process}</strong><span className="raci-risk-tags">{signal.issues.map(value=><em key={value} className={value.includes('Chýba')||value.includes('Viac')?'issue-danger':value==='Jediný R'?'issue-warning':'issue-info'}>{value}</em>)}</span><small>{signal.note||'Bez doplňujúcej poznámky.'}</small></span><Icon name="chevron" size={18}/></button>)}</div>:<div className="raci-all-good"><Icon name="check" size={28}/><strong>Bez identifikovaných medzier</strong><p>Aktívne pravidlá nenašli proces vyžadujúci preverenie.</p></div>}</section>
      <div className="raci-insight-side"><section className="raci-insight-panel"><div className="raci-panel-heading compact"><div><span>Koncentrácia výkonu</span><h3>Najviac rolí R</h3></div><Badge tone={concentratedExecutors.length?'warning':'success'}>limit {settings.responsibleLimitPercent}%</Badge></div><div className="raci-owner-load">{[...peopleStats].sort((a,b)=>b.R-a.R).slice(0,7).map(stat=>{const percent=rows.length?Math.round(stat.R/rows.length*100):0;return <div key={stat.person.id} className={percent>=settings.responsibleLimitPercent?'over-limit':''}><span className="raci-owner-avatar">{stat.person.id}</span><span className="raci-owner-data"><span><strong>{stat.person.name}</strong><em>{percent}%</em></span><span className="raci-owner-bar"><i style={{width:`${Math.min(100,percent)}%`}}/></span><small>{stat.R}× R · {stat.uniqueR}× jediný R</small></span></div>})}</div></section>
      <section className="raci-insight-panel"><div className="raci-panel-heading compact"><div><span>Odporúčané kroky</span><h3>Čo riešiť ako prvé</h3></div></div><div className="raci-action-list">{structuralIssues.length>0&&<article className="action-danger"><strong>{structuralIssues.length}</strong><div><h4>Uzavrieť formálne medzery</h4><p>Každý proces musí mať presne jedného A a aspoň jedného R.</p></div></article>}{singleR>0&&<article className="action-warning"><strong>{singleR}</strong><div><h4>Doplniť zastupiteľnosť</h4><p>Procesy s jediným R potrebujú sekundárneho vykonávateľa alebo potvrdený runbook.</p></div></article>}{concentratedExecutors.length>0&&<article className="action-info"><strong>{concentratedExecutors.length}</strong><div><h4>Preveriť koncentráciu know-how</h4><p>Pracovníci nad limitom R potrebujú kapacitnú kontrolu a prenos znalostí.</p></div></article>}{!structuralIssues.length&&!singleR&&!concentratedExecutors.length&&<div className="raci-all-good small"><Icon name="check" size={22}/><strong>Bez otvorených krokov</strong></div>}</div></section></div></div>
    </div>}

    {tab==='matrix'&&<>
      <div className="filter-panel oit-filter"><label><span>Vyhľadávanie</span><div className="search-input"><Icon name="search" size={17}/><input value={query} onChange={(e:ChangeEvent<HTMLInputElement>)=>setQuery(e.target.value)} placeholder="Proces, poznámka alebo oblasť..."/></div></label><label><span>Oblasť</span><select value={area} onChange={(e:ChangeEvent<HTMLSelectElement>)=>setArea(e.target.value)}><option value="all">Všetky oblasti</option>{oitData.raciAreas.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label><label><span>Kontrola</span><select value={issue} onChange={(e:ChangeEvent<HTMLSelectElement>)=>setIssue(e.target.value)}><option value="all">Všetky riadky</option><option value="ok">Bez medzery</option><option>Chýba A</option><option>Viac A</option><option>Chýba R</option><option>Jediný R</option></select></label><span className="result-pill">{filtered.length} procesov</span></div>
      <div className="oit-raci-legend"><span><b className="raci-r">R</b> Prakticky vykonáva</span><span><b className="raci-a">A</b> Konečne zodpovedá / schvaľuje</span><span><b className="raci-c">C</b> Povinne konzultovaný</span><span><b className="raci-i">I</b> Informovaný</span></div>
      <div className="oit-table-shell"><table className="oit-raci-table"><thead><tr><th>Proces / oblasť</th><th>Kontrola</th>{oitData.people.map(p=><th key={p.id}><span>{p.id}</span><small>{p.name.split(' ').slice(-1)}</small></th>)}</tr></thead><tbody>{filtered.map(row=>{const gap=raciIssue(row);return <tr key={row.id}><td><small>{row.areaTitle}</small><strong>{row.process}</strong><p>{row.note}</p></td><td>{gap?<Badge tone={gap==='Jediný R'?'warning':'danger'}>{gap}</Badge>:<Badge tone="success">OK</Badge>}</td>{oitData.people.map(p=>{const val=row.assignments[p.id]||'·';return <td key={p.id}><span className={`raci-cell ${toneForRaci(val)}`}>{val}</span></td>})}</tr>})}</tbody></table>{!filtered.length&&<Empty title="Bez výsledkov" text="Zmeňte vyhľadávanie alebo filtre."/>}</div>
    </>}
    {tab==='risks'&&<section className="oit-raci-management">
      <div className="oit-risk-cards"><article><span>Chýba vlastník A</span><strong>{missingA}</strong><small>formálne riadenie</small></article><article><span>Chýba vykonávateľ R</span><strong>{noR}</strong><small>praktické vykonanie</small></article><article><span>Jediný vykonávateľ R</span><strong>{singleR}</strong><small>riziko zastupiteľnosti</small></article></div>
      <div className="oit-raci-management-grid"><article className="panel"><div className="panel-heading"><div><span className="eyebrow">Praktické vykonávanie</span><h3>Najviac procesov s rolou R</h3></div><Badge tone="info">pracovné zapojenie</Badge></div><div className="oit-ranking">{[...peopleStats].sort((a,b)=>b.R-a.R).slice(0,7).map((x,i)=><div key={x.person.id}><span>{i+1}</span><div><strong>{x.person.name}</strong><small>{x.person.area}</small></div><b>{x.R}</b></div>)}</div></article>
      <article className="panel"><div className="panel-heading"><div><span className="eyebrow">Formálne vlastníctvo</span><h3>Konečná zodpovednosť A</h3></div><Badge tone="purple">governance</Badge></div><div className="oit-accountability-explainer"><div className="avatar avatar-large">MK</div><div><strong>{accountable[0]?.person.name}</strong><span>{accountable[0]?.A} z {rows.length} procesov má formálne A</span><p>Ide o riaditeľskú konečnú zodpovednosť a schválenie, nie o tvrdenie, že riaditeľ všetky procesy vykonáva. Vykonávanie sa hodnotí cez R.</p><small>Z toho {accountable[0]?.combinedAR} procesov obsahuje kombinovanú rolu A/R.</small></div></div></article>
      <article className="panel"><div className="panel-heading"><div><span className="eyebrow">Single point of failure</span><h3>Procesy, kde je osoba jediným R</h3></div></div><div className="oit-ranking">{[...peopleStats].sort((a,b)=>b.uniqueR-a.uniqueR).filter(x=>x.uniqueR>0).map((x,i)=><div key={x.person.id}><span>{i+1}</span><div><strong>{x.person.name}</strong><small>{x.person.area}</small></div><b>{x.uniqueR}</b></div>)}</div></article>
      <article className="panel"><div className="panel-heading"><div><span className="eyebrow">Kontinuitné riziká</span><h3>Procesy s jediným vykonávateľom</h3></div></div><div className="oit-gap-list">{continuityIssues.map(row=><div key={row.id}><Badge tone="warning">Jediný R</Badge><span><strong>{row.process}</strong><small>{row.areaTitle} · {Object.entries(row.assignments).find(([,value])=>splitRoles(value).includes('R'))?.[0]}</small></span></div>)}</div></article></div>
    </section>}
    {tab==='people'&&<><div className="filter-panel oit-people-sort"><label><span>Zoradiť podľa</span><select value={peopleSort} onChange={(e:ChangeEvent<HTMLSelectElement>)=>setPeopleSort(e.target.value as typeof peopleSort)}><option value="R">Praktické vykonávanie R</option><option value="A">Formálne vlastníctvo A</option><option value="spof">Jediný vykonávateľ</option><option value="participation">Celkové zapojenie</option></select></label><span className="result-pill">{sortedPeople.length} pracovníkov</span></div><section className="oit-people-metrics">{sortedPeople.map(stat=><article className="panel" key={stat.person.id}><div className="oit-person-title"><div className="avatar">{stat.person.id}</div><div><strong>{stat.person.name}</strong><span>{stat.person.area}</span></div></div><div className="oit-role-metric-grid"><span><small>R · vykonáva</small><b>{stat.R}</b></span><span><small>A · zodpovedá</small><b>{stat.A}</b></span><span><small>C · konzultuje</small><b>{stat.C}</b></span><span><small>I · informovaný</small><b>{stat.I}</b></span><span><small>A/R kombinácia</small><b>{stat.combinedAR}</b></span><span><small>Jediný R</small><b>{stat.uniqueR}</b></span></div><Progress value={Math.round(stat.participation/rows.length*100)} label="Zapojenie do procesov"/></article>)}</section></>}

    {tab==='compare'&&<RaciDepartmentComparison orisItems={orisItems} orisEmployees={orisEmployees}/>}

    {tab==='rules'&&<div className="raci-rules-view"><section className="raci-rules-settings"><div className="raci-panel-heading"><div><span>Nastavenie pohľadu</span><h3>Pravidlá manažérskeho hodnotenia OIT</h3><p>Zmeny sa ukladajú iba pre tento prehliadač a nemenia zdrojovú RACI maticu.</p></div><button type="button" className="button button-secondary" onClick={resetSettings}><Icon name="refresh" size={16}/> Obnoviť predvolené</button></div><div className="raci-settings-grid"><label className="raci-range-setting"><span><strong>Limit koncentrácie výkonu R</strong><em>{settings.responsibleLimitPercent}%</em></span><input type="range" min="20" max="60" step="5" value={settings.responsibleLimitPercent} onChange={(event:ChangeEvent<HTMLInputElement>)=>updateSettings({responsibleLimitPercent:Number(event.target.value)})}/><small>Pracovník s podielom R nad limitom sa zobrazí ako kapacitná alebo znalostná závislosť.</small></label><label className="raci-switch-setting"><input type="checkbox" checked={settings.includeSingleResponsible} onChange={(event:ChangeEvent<HTMLInputElement>)=>updateSettings({includeSingleResponsible:event.target.checked})}/><span><strong>Hodnotiť jediného vykonávateľa</strong><small>Proces s jedným R sa považuje za kontinuitné riziko.</small></span></label><label className="raci-switch-setting"><input type="checkbox" checked={settings.flagCombinedAR} onChange={(event:ChangeEvent<HTMLInputElement>)=>updateSettings({flagCombinedAR:event.target.checked})}/><span><strong>Upozorniť na spojené A/R</strong><small>Zvýrazní procesy, kde výkon aj konečné schválenie zostávajú na jednej osobe.</small></span></label></div></section><div className="raci-rule-cards"><article className="rule-danger"><span>01</span><div><h3>Formálna integrita</h3><p>Každý proces musí mať presne jedného A a minimálne jedného R.</p></div></article><article className="rule-warning"><span>02</span><div><h3>Zastupiteľnosť</h3><p>Jediný R nie je chyba zápisu, ale vyžaduje sekundárnu rolu, runbook alebo potvrdený záskok.</p></div></article><article className="rule-info"><span>03</span><div><h3>Koncentrácia výkonu</h3><p>Vysoký podiel R na jednej osobe signalizuje kapacitné riziko a koncentráciu technického know-how.</p></div></article><article className="rule-purple"><span>04</span><div><h3>Riaditeľské A</h3><p>Formálne A riaditeľa je governance zodpovednosť; pracovné zaťaženie sa vyhodnocuje cez R a celkové zapojenie.</p></div></article></div></div>}
  </>
}

export function OitDataCenter(){
  const [site,setSite]=useState<'zilina'|'lamacska'>('zilina')
  const [tab,setTab]=useState<'overview'|'racks'|'support'>('overview')
  const [rack,setRack]=useState('all')
  const [query,setQuery]=useState('')

  useEffect(()=>{setTab('overview');setRack('all');setQuery('')},[site])

  const inventory:OitRackItem[]=site==='zilina'?oitData.rackInventory:oitData.lamacskaRackInventory
  const devices=inventory.filter(item=>item.device&&!/voln|voľn/i.test(item.device))
  const racks=Array.from(new Set(inventory.map(item=>item.rack).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'sk',{numeric:true}))
  const oldLive=devices.filter(item=>item.generation.toLowerCase().includes('stare')&&item.status.toLowerCase().includes('zive')).length
  const retirement=devices.filter(item=>/vypinat|vypnúť|moze sa vypnut|môže sa vypnúť|do skladu|preverit|preveriť/i.test(`${item.status} ${item.note}`)).length
  const identified=devices.filter(item=>item.code&&item.code!=='?').length
  const filtered=inventory.filter(item=>(rack==='all'||item.rack===rack)&&`${item.rack} ${item.device} ${item.code} ${item.position} ${item.status} ${item.note}`.toLowerCase().includes(query.toLowerCase()))

  return <>
    <PageHeader eyebrow="OIT · infraštruktúra" title="Dátové centrá a serverovne" description="Oddelený prevádzkový pohľad na Dátové centrum VaV Žilina a serverovňu na Lamačskej ceste."/>
    <section className="oit-location-switch">
      <button className={site==='zilina'?'active':''} onClick={()=>setSite('zilina')}><span><Icon name="database" size={23}/></span><div><strong>DC VaV Žilina</strong><small>Kapacity, HPC, racky R1–R5 a podporné technológie</small></div><Badge tone={site==='zilina'?'success':'neutral'}>{new Set(oitData.rackInventory.map(i=>i.rack).filter(Boolean)).size} rackov</Badge></button>
      <button className={site==='lamacska'?'active':''} onClick={()=>setSite('lamacska')}><span><Icon name="systems" size={23}/></span><div><strong>Serverovňa Lamačská cesta</strong><small>Rackové osadenie, sieť, virtualizácia a serverový softvér</small></div><Badge tone={site==='lamacska'?'success':'neutral'}>{new Set(oitData.lamacskaRackInventory.map(i=>i.rack).filter(Boolean)).size} rackov</Badge></button>
    </section>
    <section className="kpi-grid oit-kpi-grid">
      <article className="kpi-card"><span>RACKY</span><strong>{racks.length}</strong><small>{site==='zilina'?'evidované pozície R1–R5':'evidované racky Lamačská'}</small></article>
      <article className="kpi-card"><span>ZARIADENIA / POLOŽKY</span><strong>{devices.length}</strong><small>bez voľných pozícií</small></article>
      <article className="kpi-card"><span>{site==='zilina'?'STARÉ A ŽIVÉ':'S IDENTIFIKÁTOROM'}</span><strong>{site==='zilina'?oldLive:identified}</strong><small>{site==='zilina'?'priorita životného cyklu':'položky s označením zariadenia'}</small></article>
      <article className="kpi-card"><span>NA PREVERENIE</span><strong>{retirement}</strong><small>vyradenie, sklad alebo kontrola</small></article>
    </section>
    <div className="view-tabs oit-tabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}><Icon name="dashboard"/> Prehľad</button><button className={tab==='racks'?'active':''} onClick={()=>setTab('racks')}><Icon name="cmdb"/> Rack inventár</button><button className={tab==='support'?'active':''} onClick={()=>setTab('support')}><Icon name="shield"/> {site==='zilina'?'Podporné technológie':'Serverový softvér'}</button></div>

    {tab==='overview'&&site==='zilina'&&<><section className="oit-capacity-grid">{oitData.capacity.map(c=><article className="panel" key={c.name}><span className="eyebrow">Kapacita {c.name}</span><h3>{c.used} využité</h3><Progress value={c.percent} label={`${c.percent}% z ${c.total}`}/><div><span>Voľné</span><strong>{c.free}</strong></div></article>)}</section><section className="panel oit-hpc"><div className="panel-heading"><div><span className="eyebrow">Výpočtová infraštruktúra</span><h3>HPC Cluster</h3></div><Badge tone="info">Zdroj 2023</Badge></div><div>{oitData.hpc.map(x=><span key={x}><Icon name="systems" size={17}/>{x}</span>)}</div></section></>}

    {tab==='overview'&&site==='lamacska'&&<><section className="oit-lamacska-overview"><article className="panel"><div className="panel-heading"><div><span className="eyebrow">Lokalita</span><h3>Serverovňa Lamačská cesta</h3></div><Badge tone="success">OIT</Badge></div><p>Samostatná serverová lokalita pre Active Directory, SQL Server, DNS, RADIUS, SMTP, bezpečnostné nástroje, monitoring a VMware infraštruktúru. Lokalita je sieťovo prepojená s DC VaV Žilina.</p><div className="oit-site-facts"><span><Icon name="shield"/>FortiManager a FortiAnalyzer</span><span><Icon name="database"/>Microsoft SQL Server</span><span><Icon name="systems"/>VMware vSphere a vCenter</span><span><Icon name="risk"/>Zabbix a SCOM</span></div></article><article className="panel"><div className="panel-heading"><div><span className="eyebrow">Kvalita inventára</span><h3>Stav rackových údajov</h3></div></div><div className="oit-inventory-quality"><div><span>Identifikované zariadenia</span><strong>{identified}</strong></div><div><span>Bez označenia</span><strong>{Math.max(devices.length-identified,0)}</strong></div><div><span>Na preverenie / sklad</span><strong>{retirement}</strong></div><div><span>Zdrojové racky</span><strong>{racks.length}</strong></div></div></article></section><section className="panel oit-software-preview"><div className="panel-heading"><div><span className="eyebrow">Katalóg serverového softvéru</span><h3>Technologické oblasti oboch lokalít</h3></div><Badge tone="info">{oitData.serverSoftwareCatalog.length} kategórií</Badge></div><div>{oitData.serverSoftwareCatalog.slice(0,5).map(group=><span key={group.category}><strong>{group.category}</strong><small>{group.items.slice(0,2).join(' · ')}</small></span>)}</div></section></>}

    {tab==='racks'&&<><div className="filter-panel oit-filter"><label><span>Vyhľadávanie</span><div className="search-input"><Icon name="search" size={17}/><input value={query} onChange={(e:ChangeEvent<HTMLInputElement>)=>setQuery(e.target.value)} placeholder="Rack, zariadenie, označenie, pozícia alebo stav..."/></div></label><label><span>Rack</span><select value={rack} onChange={(e:ChangeEvent<HTMLSelectElement>)=>setRack(e.target.value)}><option value="all">Všetky racky</option>{racks.map(value=><option key={value}>{value}</option>)}</select></label><span className="result-pill">{filtered.length} položiek</span></div><div className="oit-table-shell"><table className="oit-registry-table"><thead><tr><th>Rack</th><th>Zariadenie</th><th>Označenie</th><th>Pozícia</th><th>Generácia</th><th>Stav / poznámka</th></tr></thead><tbody>{filtered.map((item,index)=><tr key={`${item.rack}-${item.code}-${item.position}-${index}`}><td><strong>{item.rack||item.row}</strong><small>{item.size}</small></td><td>{item.device||'—'}</td><td>{item.code||'—'}</td><td>{item.position||'—'} <small>{item.units}</small></td><td>{item.generation?<Badge tone={item.generation.toLowerCase().includes('stare')?'warning':'success'}>{item.generation}</Badge>:'—'}</td><td><Badge tone={statusTone(item.status)}>{item.status||'Neurčený'}</Badge>{item.note&&<small>{item.note}</small>}</td></tr>)}</tbody></table>{!filtered.length&&<Empty title="Bez výsledkov" text="Zmeňte vyhľadávanie alebo filter racku."/>}</div></>}

    {tab==='support'&&site==='zilina'&&<><section className="oit-support-grid">{oitData.nonIt.map(group=><article className="panel" key={group.category}><div className="panel-heading"><div><span className="eyebrow">Non-IT infraštruktúra</span><h3>{group.category}</h3></div><Badge tone="info">{group.items.length}</Badge></div><p>{group.summary}</p><div>{group.items.map(item=><span key={item}><Icon name="check" size={16}/>{item}</span>)}</div></article>)}</section><article className="panel oit-workflow"><div className="panel-heading"><div><span className="eyebrow">Prevádzkový postup</span><h3>Režim servisných zásahov</h3></div></div><p>{oitData.serviceWorkflow}</p></article></>}

    {tab==='support'&&site==='lamacska'&&<section className="oit-software-grid">{oitData.serverSoftwareCatalog.map((group,index)=><article className="panel" key={group.category}><div className="oit-software-title"><span>{String(index+1).padStart(2,'0')}</span><h3>{group.category}</h3></div><div>{group.items.map(item=><span key={item}><Icon name="check" size={15}/>{item}</span>)}</div></article>)}</section>}
  </>
}

export function OitNetwork(){
  const [image,setImage]=useState<{src:string;title:string}|null>(null)
  const [urls,setUrls]=useState<OitTopologyDocuments>({topologyUrl:'',oobUrl:'',lamacskaTopologyUrl:'',softwareCatalogUrl:'',missing:[]})
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
    {src:urls.topologyUrl,title:'DC VaV Žilina – hlavná topológia',description:'Komplexný pohľad na prepínače, firewally, load balancery, servery a prepojenia.',file:'topologia.png'},
    {src:urls.oobUrl,title:'DC VaV Žilina – OOB topológia',description:'Samostatný pohľad na internetové pripojenie, HA firewally, routre, ACS a OOB prepínače.',file:'oob.png'},
    {src:urls.lamacskaTopologyUrl,title:'Lamačská cesta – sieťová topológia',description:'Topológia serverovne Lamačská: core prvky, firewally, load balancery, Wi-Fi a pripojenia.',file:'topologia-la.png'},
    {src:urls.softwareCatalogUrl,title:'Katalóg serverového softvéru',description:'Architektúra prostredia a prehľad serverových softvérových kategórií pre obe lokality.',file:'sw-serverovna.png'},
  ]
  return <>
    <PageHeader eyebrow="OIT · sieť a bezpečnosť" title="Sieťová architektúra a dokumentácia lokalít" description="Štyri oddelené dokumenty pre DC VaV Žilina a serverovňu Lamačská uložené v privátnom Supabase Storage."/>
    {error&&<div className="inline-alert inline-alert-error"><Icon name="warning" size={18}/><span>{error}</span><button className="button button-secondary button-small" onClick={()=>void loadDocuments()}>Obnoviť</button></div>}
    {!error&&urls.missing.length>0&&<div className="inline-alert oit-document-warning"><Icon name="warning" size={18}/><span>V privátnom buckete chýbajú: {urls.missing.join(', ')}. Ostatné dostupné dokumenty sa zobrazili.</span><button className="button button-secondary button-small" onClick={()=>void loadDocuments()}>Obnoviť</button></div>}
    <section className="oit-topology-grid">{cards.map(card=><article className="panel" key={card.title}><div className="panel-heading"><div><span className="eyebrow">Privátny dokument · {card.file}</span><h3>{card.title}</h3></div><Badge tone={card.src?'success':loading?'warning':'danger'}>{card.src?'Načítaný':loading?'Načítavam':'Nedostupný'}</Badge></div><p>{card.description}</p>{card.src?<button className="topology-preview" onClick={()=>setImage({src:card.src,title:card.title})}><img src={card.src} alt={card.title}/></button>:<div className="topology-placeholder"><Icon name="lock" size={32}/><strong>Chránený dokument</strong><span>Nahrajte súbor {card.file} do privátneho bucketu oit-documents.</span></div>}</article>)}</section>
    <section className="panel oit-network-notes"><div className="panel-heading"><div><span className="eyebrow">Manažérsky pohľad</span><h3>Spoločná evidencia oboch lokalít</h3></div></div><div><span><Icon name="cmdb"/>väzby zariadení na CMDB položky</span><span><Icon name="user"/>technický vlastník každého prvku</span><span><Icon name="calendar"/>termín obnovy a servisnej podpory</span><span><Icon name="risk"/>kritické prepojenia bez alternatívnej trasy</span></div></section>
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
