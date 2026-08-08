import { useMemo } from 'react'
import type { AccessScope, AppState } from '../types'
import { Badge, Icon, PageHeader } from '../components/UI'
import { buildSupplierDirectory } from '../lib/supplierDirectory'
import { buildContractDirectory } from '../lib/contractDirectory'
import './DataQuality.css'

type QualitySignal = { id:string; title:string; detail:string; count:number; severity:'danger'|'warning'|'info'; view:string; icon:'cmdb'|'services'|'database'|'matrix'|'iam'|'tasks'|'risk'|'calendar' }
function scopeAllowed(scope:AccessScope, oit:boolean, oris:boolean, shared:boolean){return scope==='oit'?oit:scope==='oris'?oris:shared}
function dateDays(value:string){if(!value)return null;const d=new Date(`${value.slice(0,10)}T23:59:59`);if(Number.isNaN(d.getTime()))return null;return Math.ceil((d.getTime()-Date.now())/86_400_000)}

export default function DataQuality({state,canReadOit,canReadOris,canReadShared,go}:{state:AppState;canReadOit:boolean;canReadOris:boolean;canReadShared:boolean;go:(view:string)=>void}){
  const signals=useMemo<QualitySignal[]>(()=>{
    const result:QualitySignal[]=[]
    const assets=canReadShared?state.cmdbItems.filter(item=>scopeAllowed(item.scope,canReadOit,canReadOris,canReadShared)):[]
    if(assets.length){
      const noOwner=assets.filter(item=>!item.businessOwner&&!item.technicalOwner&&!item.assignedTo).length
      const noId=assets.filter(item=>!item.assetTag&&!item.serialNumber&&!item.hostname).length
      const inventory=assets.filter(item=>['Neoverené','Nenájdené','Nezhoda'].includes(item.inventoryStatus)).length
      const noService=assets.filter(item=>!item.serviceId).length
      const lifecycle=assets.filter(item=>item.lifecycle==='Na obnovu'||[item.warrantyEnd,item.supportEnd,item.licenseEnd,item.contractEnd].some(value=>{const d=dateDays(value);return d!==null&&d<=90})).length
      const keys=new Map<string,number>(); assets.forEach(item=>[item.assetTag&&`TAG:${item.assetTag.toLowerCase()}`,item.serialNumber&&`SN:${item.serialNumber.toLowerCase()}`,item.hostname&&`HOST:${item.hostname.toLowerCase()}`].filter(Boolean).forEach(key=>keys.set(key as string,(keys.get(key as string)||0)+1)))
      const duplicates=[...keys.values()].filter(value=>value>1).length
      if(noOwner)result.push({id:'asset-owner',title:'Aktíva bez vlastníctva',detail:'Chýba vecný/technický owner aj pridelená osoba.',count:noOwner,severity:'danger',view:'cmdb',icon:'cmdb'})
      if(noId)result.push({id:'asset-id',title:'Aktíva bez identifikátora',detail:'Chýba inventárne číslo, sériové číslo aj hostname.',count:noId,severity:'warning',view:'cmdb',icon:'cmdb'})
      if(inventory)result.push({id:'asset-inv',title:'Inventúrne položky na preverenie',detail:'Neoverené, nenájdené alebo nezhoda.',count:inventory,severity:'warning',view:'cmdb',icon:'cmdb'})
      if(noService)result.push({id:'asset-service',title:'Aktíva bez väzby na službu',detail:'Asset existuje, ale nie je priradený k službe.',count:noService,severity:'info',view:'cmdb',icon:'services'})
      if(lifecycle)result.push({id:'asset-life',title:'Lifecycle / termínové riziká',detail:'Obnova alebo záruka/podpora/licencia/zmluva do 90 dní.',count:lifecycle,severity:'warning',view:'cmdb',icon:'cmdb'})
      if(duplicates)result.push({id:'asset-dup',title:'Možné duplicitné identifikátory',detail:'Rovnaké inventárne číslo, S/N alebo hostname.',count:duplicates,severity:'danger',view:'cmdb',icon:'cmdb'})
    }
    if(canReadOris){
      const serviceOwner=state.services.filter(item=>!item.businessOwner||!item.technicalOwner).length
      const continuity=state.services.filter(item=>!item.deputy||!item.runbook||!item.monitoring||!item.backup).length
      const raciGap=state.raci.filter(item=>!Object.values(item.assignments||{}).some(value=>String(value).includes('A'))||!Object.values(item.assignments||{}).some(value=>String(value).includes('R'))).length
      const openWithoutOwner=state.tasks.filter(item=>!['Hotovo','Zrušené'].includes(item.status)&&!item.owner).length
      if(serviceOwner)result.push({id:'service-owner',title:'Služby s neúplným vlastníctvom',detail:'Chýba business alebo technický vlastník.',count:serviceOwner,severity:'danger',view:'services',icon:'services'})
      if(continuity)result.push({id:'service-cont',title:'Služby s medzerou kontinuity',detail:'Chýba zástupca, runbook, monitoring alebo backup.',count:continuity,severity:'warning',view:'intelligence',icon:'services'})
      if(raciGap)result.push({id:'raci-gap',title:'RACI bez A alebo R',detail:'Proces nemá zodpovedného A alebo vykonávateľa R.',count:raciGap,severity:'danger',view:'raci',icon:'matrix'})
      if(openWithoutOwner)result.push({id:'task-owner',title:'Otvorené úlohy bez ownera',detail:'Úloha je otvorená, ale nemá priradeného vlastníka.',count:openWithoutOwner,severity:'warning',view:'work',icon:'tasks'})
    }
    if(canReadShared){
      const suppliers=buildSupplierDirectory(state)
      const supplierNames=suppliers.filter(item=>!item.verifiedName&&!item.record?.name&&item.ico).length
      const supplierCandidates=suppliers.reduce((sum,item)=>sum+item.relationships.filter(relation=>relation.status==='Na preverenie').length,0)
      if(supplierNames)result.push({id:'suppliers',title:'Dodávatelia na doplnenie',detail:'IČO je známe, ale karta nemá spoľahlivý názov alebo profil.',count:supplierNames,severity:'info',view:'suppliers',icon:'database'})
      if(supplierCandidates)result.push({id:'supplier-links',title:'Dodávateľské väzby na potvrdenie',detail:'Odvodené väzby na systém alebo modul čakajú na potvrdenie administrátorom.',count:supplierCandidates,severity:'warning',view:'suppliers',icon:'database'})
      const contracts=buildContractDirectory(state)
      const contractValidity=contracts.filter(item=>item.renewalState==='Chýba termín').length
      const renewals=contracts.filter(item=>item.renewalState==='Po termíne'||item.renewalState==='Začať teraz').length
      const slaGaps=contracts.filter(item=>item.slaRequired&&!item.slaStatus.trim()).length
      if(renewals)result.push({id:'contract-renewal',title:'Zmluvy vyžadujú renewal rozhodnutie',detail:'Zmluva je po termíne alebo už vstúpila do lead-time obnovy/obstarávania.',count:renewals,severity:'danger',view:'contracts',icon:'calendar'})
      if(contractValidity)result.push({id:'contract-validity',title:'Zmluvy bez termínu platnosti',detail:'Bez dátumu platnosti nie je možné spoľahlivo riadiť obnovu.',count:contractValidity,severity:'warning',view:'contracts',icon:'calendar'})
      if(slaGaps)result.push({id:'contract-sla',title:'SLA na doplnenie',detail:'Pri spravovanej zmluve sa SLA vyžaduje, ale chýba jeho stav.',count:slaGaps,severity:'warning',view:'contracts',icon:'calendar'})
    }
    return result.sort((a,b)=>({danger:0,warning:1,info:2}[a.severity] - {danger:0,warning:1,info:2}[b.severity]) || b.count-a.count)
  },[state,canReadOit,canReadOris,canReadShared])

  const issueCount=signals.reduce((sum,item)=>sum+item.count,0)
  const visibleAssetCount=canReadShared?state.cmdbItems.filter(item=>scopeAllowed(item.scope,canReadOit,canReadOris,canReadShared)).length:0
  const denominator=Math.max(1,issueCount+visibleAssetCount+(canReadOris?state.services.length+state.tasks.length:0))
  const quality=Math.max(0,Math.min(100,Math.round((1-issueCount/denominator)*100)))

  return <div className="data-quality-page"><PageHeader eyebrow="Data Quality Center" title="Kvalita a úplnosť dát" description="Jedna pracovná obrazovka pre chýbajúce vlastníctvo, identifikátory, väzby, kontinuitu a možné duplicity. Každý signál vedie priamo do modulu, kde sa dá opraviť." actions={<button className="button button-secondary" onClick={()=>go('myWorkspace')}><Icon name="dashboard" size={16}/>Moje centrum</button>}/>
    <section className="quality-hero"><div><span>KVALITA DÁT</span><strong>{quality}/100</strong><p>{issueCount} evidovaných medzier v dostupnom scope. Skóre je orientačný indikátor úplnosti registra, nie audit kvality zdrojových systémov.</p></div><div className={`quality-ring ${quality<70?'bad':quality<85?'warn':''}`}><b>{quality}</b><small>%</small></div></section>
    <div className="quality-kpis"><article><span>Kritické medzery</span><strong>{signals.filter(i=>i.severity==='danger').reduce((s,i)=>s+i.count,0)}</strong><small>vlastníctvo, duplicity, RACI</small></article><article><span>Na doplnenie</span><strong>{signals.filter(i=>i.severity==='warning').reduce((s,i)=>s+i.count,0)}</strong><small>kontinuita, inventúra, termíny</small></article><article><span>Informačné</span><strong>{signals.filter(i=>i.severity==='info').reduce((s,i)=>s+i.count,0)}</strong><small>väzby a profily</small></article><article><span>Typov kontrol</span><strong>{signals.length}</strong><small>len kontroly relevantné pre tvoj scope</small></article></div>
    <section className="panel quality-panel"><div className="panel-heading"><div><span className="eyebrow">Opraviť</span><h3>Prioritizované medzery</h3></div><Badge tone={signals.some(i=>i.severity==='danger')?'danger':signals.length?'warning':'success'}>{signals.length} kontrol</Badge></div><div className="quality-list">{signals.length?signals.map(signal=><button key={signal.id} className={`quality-row ${signal.severity}`} onClick={()=>go(signal.view)}><span className="quality-icon"><Icon name={signal.icon} size={18}/></span><span><strong>{signal.title}</strong><small>{signal.detail}</small></span><b>{signal.count}</b><span className="quality-open">Opraviť <Icon name="chevron" size={14}/></span></button>):<div className="quality-empty"><Icon name="check" size={28}/><strong>Bez zistených medzier</strong><span>V aktuálne dostupnom scope nie je aktívna žiadna z kontrolovaných medzier.</span></div>}</div></section>
  </div>
}
