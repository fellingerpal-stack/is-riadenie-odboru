import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppRole, AppState, CloudSnapshot, SyncState } from './types'
import { exportState, importState, loadRole, loadState, migrateState, resetState, saveRole, saveState } from './lib/storage'
import { loadCurrentSnapshot, saveCurrentSnapshot } from './lib/cloud'
import { loadWorkData, subscribeToWorkData, syncWorkProjects, syncWorkTasks, type WorkDatabaseState } from './lib/workCloud'
import { useAuth } from './auth/AuthContext'
import AuthScreen from './auth/AuthScreen'
import CloudSetupScreen from './auth/CloudSetupScreen'
import { Icon, type IconName } from './components/UI'
import Dashboard from './views/Dashboard'
import People from './views/People'
import Raci from './views/Raci'
import Services from './views/Services'
import Substitutions from './views/Substitutions'
import Capacity from './views/Capacity'
import Work from './views/Work'
import Helpdesk from './views/Helpdesk'
import ChangeManagement from './views/ChangeManagement'
import ProblemManagement from './views/ProblemManagement'
import IamManagement from './views/IamManagement'
import Cmdb from './views/Cmdb'
import Risks from './views/Risks'
import Decisions from './views/Decisions'
import Roadmap from './views/Roadmap'
import Users from './views/Users'

type ViewKey='dashboard'|'people'|'raci'|'services'|'substitutions'|'capacity'|'work'|'helpdesk'|'changes'|'problems'|'iam'|'cmdb'|'risks'|'decisions'|'roadmap'|'users'

interface NavItem { key:ViewKey; label:string; icon:IconName; badge?: (s:AppState)=>number; roles?:AppRole[] }
const allRoles:AppRole[]=['admin','manager','resolver','employee','viewer']
const managementRoles:AppRole[]=['admin','manager']
const resolverRoles:AppRole[]=['admin','manager','resolver']
const employeeRoles:AppRole[]=['admin','manager','resolver','employee']
const navGroups:{label:string;items:NavItem[]}[]=[
  {label:'Prehľad',items:[{key:'dashboard',label:'Dashboard',icon:'dashboard',roles:allRoles}]},
  {label:'Organizácia',items:[
    {key:'people',label:'Ľudia a roly',icon:'people',roles:['admin','manager','resolver','viewer']},
    {key:'raci',label:'RACI matica',icon:'matrix',roles:['admin','manager','resolver','viewer']},
    {key:'services',label:'Služby a systémy',icon:'services',roles:['admin','manager','resolver','viewer']},
    {key:'substitutions',label:'Zastupiteľnosť',icon:'substitute',roles:['admin','manager','resolver','viewer']},
  ]},
  {label:'Riadenie práce',items:[
    {key:'capacity',label:'Kapacity',icon:'capacity',roles:['admin','manager','resolver','viewer']},
    {key:'work',label:'Projekty a úlohy',icon:'projects',roles:resolverRoles,badge:s=>s.tasks.filter(t=>t.status!=='Hotovo').length},
    {key:'helpdesk',label:'Helpdesk / ServiceDesk',icon:'helpdesk',roles:employeeRoles,badge:s=>(Array.isArray(s.tickets)?s.tickets:[]).filter(t=>!['Vyriešená','Uzatvorená','Zrušená'].includes(t.status)).length},
    {key:'changes',label:'Change management',icon:'change',roles:resolverRoles,badge:s=>(Array.isArray(s.changes)?s.changes:[]).filter(c=>!['Dokončená','Zamietnutá','Rollback','Zrušená'].includes(c.status)).length},
    {key:'problems',label:'Problem management',icon:'problem',roles:resolverRoles,badge:s=>(Array.isArray(s.problems)?s.problems:[]).filter(p=>!['Vyriešený','Uzatvorený'].includes(p.status)).length},
    {key:'iam',label:'IAM / Prístupy',icon:'iam',roles:employeeRoles,badge:s=>(Array.isArray(s.accessRequests)?s.accessRequests:[]).filter(r=>!['Dokončená','Zamietnutá','Zrušená'].includes(r.status)).length},
    {key:'cmdb',label:'CMDB / Aktíva',icon:'cmdb',roles:['admin','manager','resolver','viewer'],badge:s=>(Array.isArray(s.cmdbItems)?s.cmdbItems:[]).filter(i=>!i.businessOwner||!i.technicalOwner||i.lifecycle==='Na obnovu').length},
    {key:'risks',label:'Riziká',icon:'risk',roles:['admin','manager','resolver','viewer'],badge:s=>s.risks.filter(r=>r.status!=='Ukončené').length},
    {key:'decisions',label:'Rozhodnutia',icon:'decision',roles:['admin','manager','viewer'],badge:s=>s.decisions.filter(d=>d.status!=='Schválené').length},
  ]},
  {label:'Systém',items:[
    {key:'users',label:'Používatelia',icon:'user',roles:['admin']},
    {key:'roadmap',label:'Roadmap a nastavenia',icon:'roadmap',roles:allRoles},
  ]},
]

function isViewKey(value:string):value is ViewKey{return navGroups.flatMap(g=>g.items).some(i=>i.key===value)}
function initialView():ViewKey{
  const h=location.hash.replace('#/','').split('?')[0]
  return isViewKey(h)?h:'dashboard'
}
function initials(name:string){return name.split(/\s|@/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'IS'}
function roleLabel(role:AppRole){
  if(role==='admin')return 'Administrátor'
  if(role==='manager')return 'Riaditeľ / manažér'
  if(role==='resolver')return 'Riešiteľ'
  if(role==='employee')return 'Zamestnanec'
  return 'Čitateľ'
}

function serializeSnapshotScope(state:AppState){
  return JSON.stringify({...state,projects:[],tasks:[]})
}

function syncLabel(sync:SyncState){
  if(sync==='saving')return 'Ukladám do DB'
  if(sync==='loading')return 'Načítavam z DB'
  if(sync==='synced')return 'Dáta synchronizované'
  if(sync==='dirty')return 'Neuložené zmeny'
  if(sync==='empty')return 'DB bez dát'
  if(sync==='error')return 'Chyba synchronizácie'
  return 'Lokálne dáta'
}

export default function App(){
  const auth=useAuth()
  const [state,setState]=useState<AppState>(()=>loadState())
  const [demoRole,setDemoRole]=useState<AppRole>(()=>loadRole())
  const [view,setView]=useState<ViewKey>(()=>initialView())
  const [sidebarOpen,setSidebarOpen]=useState(false)
  const [sync,setSync]=useState<SyncState>(auth.configured?'loading':'local')
  const [syncError,setSyncError]=useState('')
  const [snapshot,setSnapshot]=useState<CloudSnapshot|null>(null)
  const [workSync,setWorkSync]=useState<WorkDatabaseState>(auth.configured?'loading':'local')
  const [workError,setWorkError]=useState('')
  const lastCloudPayload=useRef<string>('')
  const cloudInitialized=useRef(false)
  const cloudHasSnapshot=useRef(false)
  const stateRef=useRef(state)
  const workWriteQueue=useRef<Promise<void>>(Promise.resolve())
  const workPendingWrites=useRef(0)
  const workReloadTimer=useRef<number|undefined>(undefined)

  const role:AppRole=auth.configured?(auth.profile?.role??'viewer'):demoRole
  const canManage=role==='admin'||role==='manager'
  const canResolve=canManage||role==='resolver'
  const canSubmit=canResolve||role==='employee'
  const displayName=auth.configured?(auth.profile?.fullName||auth.user?.email||'Používateľ'):'Pavol Horváth'
  const resetMode=auth.recoveryMode||new URLSearchParams(location.search).get('reset')==='1'||location.hash.startsWith('#/reset-password')

  useEffect(()=>{stateRef.current=state;saveState(state)},[state])
  useEffect(()=>{if(!auth.configured)saveRole(demoRole)},[demoRole,auth.configured])
  useEffect(()=>{
    const onHash=()=>{
      const next=initialView()
      const allowed=navGroups.flatMap(group=>group.items).find(item=>item.key===next)?.roles?.includes(role)??false
      if(!allowed){setView('dashboard');location.hash='/dashboard'}
      else setView(next)
    }
    addEventListener('hashchange',onHash)
    return()=>removeEventListener('hashchange',onHash)
  },[role])

  useEffect(()=>{
    const allowed=navGroups.flatMap(group=>group.items).find(item=>item.key===view)?.roles?.includes(role)??false
    if(!allowed){setView('dashboard');location.hash='/dashboard'}
  },[role,view])

  useEffect(()=>{
    if(!auth.configured){setSync('local');return}
    if(!auth.profile){cloudInitialized.current=false;return}
    if(cloudInitialized.current)return
    cloudInitialized.current=true
    void loadCloud(true)
  },[auth.configured,auth.profile?.id])

  useEffect(()=>{
    if(!auth.configured||!auth.profile||!cloudInitialized.current||sync==='loading'||sync==='saving'||sync==='error')return
    const serialized=serializeSnapshotScope(state)
    if(serialized===lastCloudPayload.current)setSync(cloudHasSnapshot.current?'synced':'empty')
    else setSync('dirty')
  },[state,auth.configured,auth.profile,sync])

  useEffect(()=>{
    if(!auth.configured||!auth.profile||!canResolve||sync!=='dirty')return
    const timer=window.setTimeout(()=>void saveCloud(),1400)
    return()=>window.clearTimeout(timer)
  },[sync,state,auth.configured,auth.profile?.id,canResolve])

  useEffect(()=>{
    if(!auth.configured||!auth.profile?.organizationId)return
    const unsubscribe=subscribeToWorkData(auth.profile.organizationId,()=>{
      if(workReloadTimer.current)window.clearTimeout(workReloadTimer.current)
      workReloadTimer.current=window.setTimeout(()=>void reloadWorkData(true),350)
    })
    return()=>{
      if(workReloadTimer.current)window.clearTimeout(workReloadTimer.current)
      unsubscribe()
    }
  },[auth.configured,auth.profile?.organizationId])

  const currentLabel=useMemo(()=>navGroups.flatMap(g=>g.items).find(i=>i.key===view)?.label||'Dashboard',[view])
  const visibleGroups=useMemo(()=>navGroups.map(group=>({...group,items:group.items.filter(item=>item.roles?.includes(role))})).filter(group=>group.items.length),[role])

  function go(next:string){
    const key=next as ViewKey
    const allowed=navGroups.flatMap(group=>group.items).find(item=>item.key===key)?.roles?.includes(role)??false
    if(!allowed)return
    setView(key);location.hash=`/${key}`;setSidebarOpen(false);window.scrollTo({top:0,behavior:'smooth'})
  }
  function reset(){if(confirm('Obnoviť pôvodné vzorové dáta? Všetky lokálne zmeny sa vymažú.'))setState(resetState())}
  async function importFile(file:File){setState(await importState(file))}

  async function reloadWorkData(silent=false){
    if(!auth.configured){setWorkSync('local');return}
    setWorkSync('loading');setWorkError('')
    try{
      const work=await loadWorkData()
      setState(current=>({...current,projects:work.projects,tasks:work.tasks}))
      setWorkSync('synced')
    }catch(e){
      const message=e instanceof Error?e.message:'Projekty a úlohy sa nepodarilo načítať.'
      setWorkSync('error');setWorkError(message)
      if(!silent)alert(message)
    }
  }

  function enqueueWorkWrite(operation:()=>Promise<void>){
    if(!auth.configured)return
    workPendingWrites.current+=1
    setWorkSync('saving');setWorkError('')
    const run=workWriteQueue.current.then(operation)
    workWriteQueue.current=run.catch(()=>undefined)
    void run.then(()=>{
      workPendingWrites.current-=1
      if(workPendingWrites.current===0)setWorkSync('synced')
    }).catch(e=>{
      workPendingWrites.current-=1
      setWorkSync('error')
      setWorkError(e instanceof Error?e.message:'Zápis Projektov a úloh zlyhal.')
    })
  }

  function commitProjects(projects:AppState['projects']){
    const previous=stateRef.current.projects
    const nextState={...stateRef.current,projects}
    stateRef.current=nextState
    setState(nextState)
    if(!auth.configured){setWorkSync('local');return}
    enqueueWorkWrite(()=>syncWorkProjects(previous,projects))
  }

  function commitTasks(tasks:AppState['tasks']){
    const previous=stateRef.current.tasks
    const nextState={...stateRef.current,tasks}
    stateRef.current=nextState
    setState(nextState)
    if(!auth.configured){setWorkSync('local');return}
    enqueueWorkWrite(()=>syncWorkTasks(previous,tasks))
  }

  async function loadCloud(silent=false){
    if(!auth.configured)return
    setSync('loading');setSyncError('');setWorkSync('loading');setWorkError('')
    try{
      const loaded=await loadCurrentSnapshot()
      setSnapshot(loaded)
      let nextState=loaded?migrateState(loaded.payload):stateRef.current

      if(loaded){
        lastCloudPayload.current=serializeSnapshotScope(nextState)
        cloudHasSnapshot.current=true
      }else{
        lastCloudPayload.current=serializeSnapshotScope(nextState)
        cloudHasSnapshot.current=false
      }

      try{
        const work=await loadWorkData()
        nextState={...nextState,projects:work.projects,tasks:work.tasks}
        setWorkSync('synced')
      }catch(workFailure){
        setWorkSync('error')
        setWorkError(workFailure instanceof Error?workFailure.message:'Projekty a úlohy sa nepodarilo načítať.')
      }

      stateRef.current=nextState
      setState(nextState)
      setSync(loaded?'synced':'empty')
    }catch(e){
      setSync('error');setSyncError(e instanceof Error?e.message:'Dáta sa nepodarilo načítať.')
      if(!silent)alert('Načítanie z databázy zlyhalo.')
    }
  }

  async function saveCloud(){
    if(!canResolve||!auth.configured)return
    setSync('saving');setSyncError('')
    try{
      const payload=stateRef.current
      const saved=await saveCurrentSnapshot(payload)
      setSnapshot(saved)
      lastCloudPayload.current=serializeSnapshotScope(payload)
      cloudHasSnapshot.current=true
      setSync('synced')
    }catch(e){
      setSync('error');setSyncError(e instanceof Error?e.message:'Dáta sa nepodarilo uložiť.')
    }
  }

  if(auth.loading)return <div className="app-loading"><div className="loading-logo">IS</div><strong>Načítavam aplikáciu…</strong><span>Overujem prihlásenie a oprávnenia</span></div>
  if(auth.cloudRequired&&!auth.configured)return <CloudSetupScreen />
  if(auth.configured&&resetMode&&auth.session)return <AuthScreen resetMode />
  if(auth.configured&&!auth.session)return <AuthScreen />
  if(auth.configured&&auth.session&&!auth.profile)return <div className="access-error"><div className="access-error-card"><Icon name="warning" size={42}/><h1>Profil nie je pripravený</h1><p>{auth.error||'Prihlásenie prebehlo, ale používateľ nemá aktívny profil v organizácii.'}</p><button className="button button-primary" onClick={()=>void auth.refreshProfile()}>Skúsiť znova</button><button className="button button-secondary" onClick={()=>void auth.signOut()}>Odhlásiť sa</button></div></div>

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen?'sidebar-open':''}`}>
      <div className="brand"><div className="brand-mark">IS</div><div><strong>Riadenie odboru</strong><small>CVTI SR · Odbor 3.2</small></div><button className="icon-button sidebar-close" onClick={()=>setSidebarOpen(false)}><Icon name="close"/></button></div>
      <nav>{visibleGroups.map(group=><section className="nav-group" key={group.label}><span>{group.label}</span>{group.items.map(item=>{const badge=item.badge?.(state);return <button key={item.key} className={view===item.key?'active':''} onClick={()=>go(item.key)}><Icon name={item.icon}/><span>{item.label}</span>{badge!==undefined&&badge>0?<b>{badge}</b>:null}</button>})}</section>)}</nav>
      <div className="sidebar-footer"><div className={`mode-dot mode-${sync}`}/><div><strong>{auth.configured?'Supabase režim':'Pracovný prototyp'}</strong><small>{syncLabel(sync)} · v{state.meta.version}</small></div></div>
    </aside>
    {sidebarOpen&&<button className="sidebar-overlay" onClick={()=>setSidebarOpen(false)} aria-label="Zavrieť menu"/>}
    <div className="app-main">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={()=>setSidebarOpen(true)}><Icon name="menu"/></button><div><small>IS Riadenie odboru</small><strong>{currentLabel}</strong></div></div><div className="topbar-right">
        {auth.configured&&<div className="sync-actions"><button className="icon-button" title="Načítať z databázy" disabled={sync==='loading'||sync==='saving'} onClick={()=>void loadCloud()}><Icon name="download" size={17}/></button>{canResolve&&<button className="icon-button" title="Uložiť do databázy" disabled={sync==='loading'||sync==='saving'||sync==='synced'} onClick={()=>void saveCloud()}><Icon name="upload" size={17}/></button>}</div>}
        <div className={`data-mode data-mode-${sync}`} title={syncError||syncLabel(sync)}><Icon name="database" size={16}/><span>{syncLabel(sync)}</span></div>
        <button className="top-user" onClick={()=>go(role==='admin'?'users':'roadmap')}><div className="avatar avatar-small">{initials(displayName)}</div><div><strong>{displayName}</strong><small>{roleLabel(role)}</small></div><Icon name="chevron" size={16}/></button>{auth.configured&&<button className="icon-button top-logout" title="Odhlásiť sa" onClick={()=>void auth.signOut()}><Icon name="logout" size={18}/></button>}
      </div></header>
      <main className="content">
        {syncError&&<div className="inline-alert inline-alert-error sync-alert"><Icon name="warning" size={18}/><span>{syncError}</span></div>}
        {view==='dashboard'&&<Dashboard state={state} go={go}/>} 
        {view==='people'&&<People employees={state.employees} canEdit={canManage} onChange={employees=>setState(current=>({...current,employees}))}/>} 
        {view==='raci'&&<Raci items={state.raci} canEdit={canManage} onChange={raci=>setState(current=>({...current,raci}))}/>} 
        {view==='services'&&<Services services={state.services} canEdit={canManage} onChange={services=>setState(current=>({...current,services}))}/>} 
        {view==='substitutions'&&<Substitutions items={state.substitutions} canEdit={canManage} onChange={substitutions=>setState(current=>({...current,substitutions}))}/>} 
        {view==='capacity'&&<Capacity rows={state.capacity} canEdit={canManage} onChange={capacity=>setState(current=>({...current,capacity}))}/>} 
        {view==='work'&&<Work projects={state.projects} tasks={state.tasks} employees={state.employees} canEdit={canResolve} databaseMode={auth.configured?'cloud':'local'} databaseState={workSync} databaseError={workError} onReload={()=>void reloadWorkData()} onProjectsChange={commitProjects} onTasksChange={commitTasks}/>} 
        {view==='helpdesk'&&<Helpdesk tickets={Array.isArray(state.tickets)?state.tickets:[]} services={Array.isArray(state.services)?state.services:[]} employees={Array.isArray(state.employees)?state.employees:[]} tasks={Array.isArray(state.tasks)?state.tasks:[]} supportQueues={Array.isArray(state.supportQueues)?state.supportQueues:[]} slaPolicies={Array.isArray(state.slaPolicies)?state.slaPolicies:[]} canEdit={canSubmit} currentUser={displayName} onTicketsChange={tickets=>setState(current=>({...current,tickets}))} onTasksChange={commitTasks} onSupportQueuesChange={supportQueues=>setState(current=>({...current,supportQueues}))} onSlaPoliciesChange={slaPolicies=>setState(current=>({...current,slaPolicies}))}/>} 
        {view==='changes'&&<ChangeManagement changes={Array.isArray(state.changes)?state.changes:[]} services={Array.isArray(state.services)?state.services:[]} employees={Array.isArray(state.employees)?state.employees:[]} tickets={Array.isArray(state.tickets)?state.tickets:[]} projects={Array.isArray(state.projects)?state.projects:[]} tasks={Array.isArray(state.tasks)?state.tasks:[]} canEdit={canResolve} currentUser={displayName} onChangesChange={changes=>setState(current=>({...current,changes}))} onTasksChange={commitTasks}/>} 
        {view==='problems'&&<ProblemManagement problems={Array.isArray(state.problems)?state.problems:[]} services={Array.isArray(state.services)?state.services:[]} employees={Array.isArray(state.employees)?state.employees:[]} tickets={Array.isArray(state.tickets)?state.tickets:[]} changes={Array.isArray(state.changes)?state.changes:[]} projects={Array.isArray(state.projects)?state.projects:[]} tasks={Array.isArray(state.tasks)?state.tasks:[]} canEdit={canResolve} currentUser={displayName} onProblemsChange={problems=>setState(current=>({...current,problems}))} onTasksChange={commitTasks}/>} 
        {view==='iam'&&<IamManagement accessRequests={Array.isArray(state.accessRequests)?state.accessRequests:[]} accessCatalog={Array.isArray(state.accessCatalog)?state.accessCatalog:[]} recertificationCampaigns={Array.isArray(state.recertificationCampaigns)?state.recertificationCampaigns:[]} services={Array.isArray(state.services)?state.services:[]} employees={Array.isArray(state.employees)?state.employees:[]} tasks={Array.isArray(state.tasks)?state.tasks:[]} canEdit={canSubmit} currentUser={displayName} onAccessRequestsChange={accessRequests=>setState(current=>({...current,accessRequests}))} onAccessCatalogChange={accessCatalog=>setState(current=>({...current,accessCatalog}))} onRecertificationCampaignsChange={recertificationCampaigns=>setState(current=>({...current,recertificationCampaigns}))} onTasksChange={commitTasks}/>} 
        {view==='cmdb'&&<Cmdb items={Array.isArray(state.cmdbItems)?state.cmdbItems:[]} relationships={Array.isArray(state.cmdbRelationships)?state.cmdbRelationships:[]} services={Array.isArray(state.services)?state.services:[]} tickets={Array.isArray(state.tickets)?state.tickets:[]} changes={Array.isArray(state.changes)?state.changes:[]} canEdit={canResolve} onItemsChange={cmdbItems=>setState(current=>({...current,cmdbItems}))} onRelationshipsChange={cmdbRelationships=>setState(current=>({...current,cmdbRelationships}))}/>} 
        {view==='risks'&&<Risks risks={state.risks} canEdit={canManage} onChange={risks=>setState(current=>({...current,risks}))}/>} 
        {view==='decisions'&&<Decisions items={state.decisions} canEdit={canManage} onChange={decisions=>setState(current=>({...current,decisions}))}/>} 
        {view==='users'&&role==='admin'&&<Users currentUserId={auth.profile?.id??'local-admin'} currentUserName={displayName} configured={auth.configured}/>} 
        {view==='roadmap'&&<Roadmap state={state} role={role} configured={auth.configured} profile={auth.profile} sync={sync} snapshot={snapshot} onRoleChange={setDemoRole} onExport={()=>exportState(state)} onImport={importFile} onReset={reset} onLoadCloud={()=>loadCloud()} onSaveCloud={saveCloud} onSignOut={()=>auth.signOut()}/>} 
      </main>
    </div>
  </div>
}
 
