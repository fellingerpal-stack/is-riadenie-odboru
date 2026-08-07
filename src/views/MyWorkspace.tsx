import { useMemo } from 'react'
import type { AccessScope, AppRole, AppState } from '../types'
import { Badge, Icon, PageHeader } from '../components/UI'
import './MyWorkspace.css'

type WorkItem = { id:string; title:string; meta:string; due?:string; priority:'critical'|'high'|'normal'; view:string; icon:'tasks'|'helpdesk'|'iam'|'cmdb'|'risk'|'decision'|'projects'|'capacity' }

function norm(value: unknown) { return String(value ?? '').trim().toLocaleLowerCase('sk') }
function samePerson(value: unknown, currentUser: string) {
  const left = norm(value); const right = norm(currentUser)
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
}
function isOpen(status: string, closed: string[]) { return !closed.includes(status) }
function dateKey(value?: string) { if (!value) return Number.POSITIVE_INFINITY; const d=new Date(`${value.slice(0,10)}T23:59:59`); return Number.isNaN(d.getTime())?Number.POSITIVE_INFINITY:d.getTime() }
function daysTo(value?: string) { if (!value) return null; const target=dateKey(value); if (!Number.isFinite(target)) return null; return Math.ceil((target-Date.now())/86_400_000) }
function scopeAllowed(scope: AccessScope, canReadOit: boolean, canReadOris: boolean, canReadShared: boolean) { return scope==='oit'?canReadOit:scope==='oris'?canReadOris:canReadShared }

export default function MyWorkspace({ state, currentUser, role, canReadOit, canReadOris, canReadShared, go }: { state:AppState; currentUser:string; role:AppRole; canReadOit:boolean; canReadOris:boolean; canReadShared:boolean; go:(view:string)=>void }) {
  const personal = useMemo<WorkItem[]>(() => {
    const rows: WorkItem[] = []
    if (canReadOris) {
      state.tasks.filter(item => samePerson(item.owner,currentUser) && isOpen(item.status,['Hotovo','Zrušené'])).forEach(item => rows.push({ id:`task-${item.id}`, title:item.title, meta:`Úloha · ${item.status}${item.projectId?` · ${item.projectId}`:''}`, due:item.due, priority:(daysTo(item.due) ?? 999) < 0?'critical':item.priority==='Kritická'||item.priority==='Vysoká'?'high':'normal', view:'work', icon:'tasks' }))
      state.tickets.filter(item => (samePerson(item.assignee,currentUser)||samePerson(item.requester,currentUser)) && isOpen(item.status,['Vyriešená','Uzatvorená','Zrušená'])).forEach(item => rows.push({ id:`ticket-${item.id}`, title:item.title, meta:`${item.type} · ${item.status} · ${item.priority}`, due:item.resolutionDueAt||item.due, priority:item.priority==='Kritická'||item.priority==='Vysoká'?'high':'normal', view:'helpdesk', icon:'helpdesk' }))
      state.accessRequests.filter(item => (samePerson(item.assignee,currentUser)||samePerson(item.requester,currentUser)||samePerson(item.manager,currentUser)) && isOpen(item.status,['Dokončená','Zamietnutá','Zrušená'])).forEach(item => rows.push({ id:`iam-${item.id}`, title:`${item.subjectName} · ${item.requestedAccess}`, meta:`IAM · ${item.status}`, due:item.dueDate, priority:item.privileged?'high':'normal', view:'iam', icon:'iam' }))
      state.actions.filter(item => (samePerson(item.confirmedOwner,currentUser)||samePerson(item.proposedOwner,currentUser)) && isOpen(item.status,['Ukončené','Hotovo'])).forEach(item => rows.push({ id:`action-${item.id}`, title:item.title, meta:`Opatrenie · ${item.status} · ${item.kpi||'bez KPI'}`, due:item.due, priority:(daysTo(item.due) ?? 999) < 0?'critical':'normal', view:'itCosts', icon:'capacity' }))
    }
    if (canReadShared) {
      state.cmdbItems.filter(item => scopeAllowed(item.scope,canReadOit,canReadOris,canReadShared) && (samePerson(item.assignedTo,currentUser)||samePerson(item.businessOwner,currentUser)||samePerson(item.technicalOwner,currentUser))).filter(item => item.lifecycle==='Na obnovu'||['Neoverené','Nenájdené','Nezhoda'].includes(item.inventoryStatus)||Boolean(item.warrantyEnd && (daysTo(item.warrantyEnd) ?? 999) <= 90)).forEach(item => rows.push({ id:`asset-${item.id}`, title:item.name, meta:`Aktívum · ${item.type} · ${item.inventoryStatus}`, due:item.plannedReplacementDate||item.warrantyEnd, priority:['Nenájdené','Nezhoda'].includes(item.inventoryStatus)?'critical':item.lifecycle==='Na obnovu'?'high':'normal', view:'cmdb', icon:'cmdb' }))
    }
    return rows.sort((a,b) => ({critical:0,high:1,normal:2}[a.priority] - {critical:0,high:1,normal:2}[b.priority]) || dateKey(a.due)-dateKey(b.due)).slice(0,24)
  },[state,currentUser,canReadOit,canReadOris,canReadShared])

  const managementSignals = useMemo<WorkItem[]>(() => {
    if (!['admin','manager'].includes(role)) return []
    const rows: WorkItem[]=[]
    if (canReadShared) {
      const ownerGaps=state.cmdbItems.filter(item=>scopeAllowed(item.scope,canReadOit,canReadOris,canReadShared)&&!item.businessOwner&&!item.technicalOwner&&!item.assignedTo).length
      if(ownerGaps) rows.push({id:'signal-owner',title:`${ownerGaps} aktív bez jasného vlastníctva`,meta:'Asset Management · ownership gap',priority:'high',view:'cmdb',icon:'cmdb'})
      const lifecycle=state.cmdbItems.filter(item=>scopeAllowed(item.scope,canReadOit,canReadOris,canReadShared)&&(item.lifecycle==='Na obnovu'||Boolean(item.warrantyEnd && (daysTo(item.warrantyEnd) ?? 999) <= 90))).length
      if(lifecycle) rows.push({id:'signal-life',title:`${lifecycle} lifecycle / záručných rizík`,meta:'Asset Management · termín do 90 dní alebo obnova',priority:'high',view:'cmdb',icon:'cmdb'})
    }
    if(canReadOris){
      const criticalRisks=state.risks.filter(item=>isOpen(item.status,['Ukončené'])&&(item.priority==='Kritická'||item.priority==='Vysoká')).length
      if(criticalRisks) rows.push({id:'signal-risk',title:`${criticalRisks} vysokých alebo kritických rizík`,meta:'Riadenie rizík',priority:'critical',view:'risks',icon:'risk'})
      const pendingDecisions=state.decisions.filter(item=>item.status!=='Schválené').length
      if(pendingDecisions) rows.push({id:'signal-decisions',title:`${pendingDecisions} rozhodnutí čaká na uzavretie`,meta:'Rozhodnutia vedenia',priority:'normal',view:'decisions',icon:'decision'})
      const overdueTasks=state.tasks.filter(item=>isOpen(item.status,['Hotovo','Zrušené'])&&(daysTo(item.due) ?? 999) < 0).length
      if(overdueTasks) rows.push({id:'signal-tasks',title:`${overdueTasks} úloh po termíne`,meta:'Projekty a úlohy',priority:'critical',view:'work',icon:'tasks'})
    }
    return rows
  },[state,role,canReadOit,canReadOris,canReadShared])

  const today=personal.filter(item => (daysTo(item.due)??99)<=0)
  const week=personal.filter(item => { const d=daysTo(item.due); return d!==null&&d>0&&d<=7 })
  const later=personal.filter(item => { const d=daysTo(item.due); return d===null||d>7 })
  const myAssets=canReadShared?state.cmdbItems.filter(item=>scopeAllowed(item.scope,canReadOit,canReadOris,canReadShared)&&(samePerson(item.assignedTo,currentUser)||samePerson(item.businessOwner,currentUser)||samePerson(item.technicalOwner,currentUser))).length:0

  const Row=({item}:{item:WorkItem})=><button className={`workspace-row priority-${item.priority}`} onClick={()=>go(item.view)}><span className="workspace-row-icon"><Icon name={item.icon} size={17}/></span><span><strong>{item.title}</strong><small>{item.meta}</small></span><span className="workspace-row-due">{item.due?new Date(`${item.due.slice(0,10)}T00:00:00`).toLocaleDateString('sk-SK'):'Otvoriť'}<Icon name="chevron" size={14}/></span></button>

  return <div className="my-workspace-page">
    <PageHeader eyebrow="Smart Workspace" title={`Moje centrum · ${currentUser}`} description="Personalizovaný pracovný pohľad. Na jednom mieste sú položky, ktoré sú priradené tebe, čakajú na tvoju reakciu alebo potrebujú manažérsku pozornosť." actions={<button className="button button-secondary" onClick={()=>go('dataQuality')}><Icon name="check" size={16}/>Kvalita dát</button>}/>
    <section className="workspace-hero"><div><span>DNEŠNÝ BRIEFING</span><strong>{today.length?`${today.length} položiek potrebuje reakciu dnes alebo je po termíne`:'Dnes bez kritickej osobnej položky'}</strong><p>{week.length} položiek do 7 dní · {personal.length} otvorených položiek vo vašom pracovnom fronte · {myAssets} aktív s väzbou na vás.</p></div><div className="workspace-hero-score"><b>{personal.length}</b><span>moje otvorené</span></div></section>
    <div className="workspace-kpis"><button onClick={()=>document.getElementById('workspace-today')?.scrollIntoView({behavior:'smooth'})}><span>Dnes / po termíne</span><strong>{today.length}</strong><small>najvyššia priorita</small></button><button onClick={()=>document.getElementById('workspace-week')?.scrollIntoView({behavior:'smooth'})}><span>Do 7 dní</span><strong>{week.length}</strong><small>blízke termíny</small></button><button onClick={()=>go('cmdb')}><span>Moje aktíva</span><strong>{myAssets}</strong><small>owner / technický správca / pridelenie</small></button><button onClick={()=>go('helpdesk')}><span>Moja práca</span><strong>{personal.filter(i=>['tasks','helpdesk','iam'].includes(i.icon)).length}</strong><small>úlohy, Helpdesk, IAM</small></button></div>

    {managementSignals.length>0&&<section className="panel workspace-management"><div className="panel-heading"><div><span className="eyebrow">Action Center</span><h3>Manažérske signály</h3></div><Badge tone={managementSignals.some(i=>i.priority==='critical')?'danger':'warning'}>{managementSignals.length} signálov</Badge></div><div className="workspace-list">{managementSignals.map(item=><Row key={item.id} item={item}/>)}</div></section>}

    <div className="workspace-columns"><section id="workspace-today" className="panel"><div className="panel-heading"><div><span className="eyebrow">Dnes</span><h3>Treba riešiť teraz</h3></div><Badge tone={today.length?'danger':'success'}>{today.length}</Badge></div><div className="workspace-list">{today.length?today.map(item=><Row key={item.id} item={item}/>):<p className="muted">Žiadna osobná položka nie je po termíne ani splatná dnes.</p>}</div></section><section id="workspace-week" className="panel"><div className="panel-heading"><div><span className="eyebrow">Tento týždeň</span><h3>Blízke termíny</h3></div><Badge tone={week.length?'warning':'success'}>{week.length}</Badge></div><div className="workspace-list">{week.length?week.map(item=><Row key={item.id} item={item}/>):<p className="muted">Najbližších sedem dní je bez osobného termínu.</p>}</div></section></div>
    {later.length>0&&<section className="panel workspace-later"><div className="panel-heading"><div><span className="eyebrow">Na sledovanie</span><h3>Ďalšie otvorené položky</h3></div><Badge tone="info">{later.length}</Badge></div><div className="workspace-list workspace-list-grid">{later.slice(0,12).map(item=><Row key={item.id} item={item}/>)}</div></section>}
  </div>
}
