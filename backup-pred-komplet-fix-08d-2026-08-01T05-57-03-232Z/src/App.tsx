import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppRole, AppState, CloudSnapshot, SyncState } from './types'
import { exportState, importState, loadRole, loadState, migrateState, resetState, saveRole, saveState } from './lib/storage'
import { loadCurrentSnapshot, saveCurrentSnapshot } from './lib/cloud'
import { useAuth } from './auth/AuthContext'
import AuthScreen from './auth/AuthScreen'
import { Icon, type IconName } from './components/UI'
import Dashboard from './views/Dashboard'
import People from './views/People'
import Raci from './views/Raci'
import Services from './views/Services'
import Substitutions from './views/Substitutions'
import Capacity from './views/Capacity'
import Work from './views/Work'
import Helpdesk from './views/Helpdesk'
import Risks from './views/Risks'
import Decisions from './views/Decisions'
import Roadmap from './views/Roadmap'
import Users from './views/Users'

type ViewKey='dashboard'|'people'|'raci'|'services'|'substitutions'|'capacity'|'work'|'helpdesk'|'risks'|'decisions'|'roadmap'|'users'

interface NavItem { key:ViewKey; label:string; icon:IconName; badge?: (s:AppState)=>number; adminOnly?:boolean }
const navGroups:{label:string;items:NavItem[]}[]=[
  {label:'Prehľad',items:[{key:'dashboard',label:'Dashboard',icon:'dashboard'}]},
  {label:'Organizácia',items:[{key:'people',label:'Ľudia a roly',icon:'people'},{key:'raci',label:'RACI matica',icon:'matrix'},{key:'services',label:'Služby a systémy',icon:'services'},{key:'substitutions',label:'Zastupiteľnosť',icon:'substitute'}]},
  {label:'Riadenie práce',items:[{key:'capacity',label:'Kapacity',icon:'capacity'},{key:'work',label:'Projekty a úlohy',icon:'projects',badge:s=>s.tasks.filter(t=>t.status!=='Hotovo').length},{key:'helpdesk',label:'Helpdesk / ServiceDesk',icon:'services',badge:s=>s.tickets.filter(t=>!['Vyriešená','Uzatvorená','Zrušená'].includes(t.status)).length},{key:'risks',label:'Riziká',icon:'risk',badge:s=>s.risks.filter(r=>r.status!=='Ukončené').length},{key:'decisions',label:'Rozhodnutia',icon:'decision',badge:s=>s.decisions.filter(d=>d.status!=='Schválené').length}]},
  {label:'Systém',items:[{key:'users',label:'Používatelia',icon:'user',adminOnly:true},{key:'roadmap',label:'Roadmap a nastavenia',icon:'roadmap'}]},
]

function isViewKey(value:string):value is ViewKey{return navGroups.flatMap(g=>g.items).some(i=>i.key===value)}
function initialView():ViewKey{
  const h=location.hash.replace('#/','').split('?')[0]
  return isViewKey(h)?h:'dashboard'
}
function initials(name:string){return name.split(/\s|@/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'IS'}
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
  const lastCloudPayload=useRef<string>('')
  const cloudInitialized=useRef(false)
  const cloudHasSnapshot=useRef(false)

  const role:AppRole=auth.configured?(auth.profile?.role??'viewer'):demoRole
  const canEdit=role!=='viewer'
  const displayName=auth.configured?(auth.profile?.fullName||auth.user?.email||'Používateľ'):'Pavol Horváth'
  const resetMode=new URLSearchParams(location.search).get('reset')==='1'||location.hash.startsWith('#/reset-password')

  useEffect(()=>{saveState(state)},[state])
  useEffect(()=>{if(!auth.configured)saveRole(demoRole)},[demoRole,auth.configured])
  useEffect(()=>{
    const onHash=()=>{
      const next=initialView()
      if(next==='users'&&role!=='admin')setView('dashboard')
      else setView(next)
    }
    addEventListener('hashchange',onHash)
    return()=>removeEventListener('hashchange',onHash)
  },[role])

  useEffect(()=>{
    if(!auth.configured){setSync('local');return}
    if(!auth.profile){cloudInitialized.current=false;return}
    if(cloudInitialized.current)return
    cloudInitialized.current=true
    void loadCloud(true)
  },[auth.configured,auth.profile?.id])

  useEffect(()=>{
    if(!auth.configured||!auth.profile||!cloudInitialized.current||sync==='loading'||sync==='saving'||sync==='error')return
    const serialized=JSON.stringify(state)
    if(serialized===lastCloudPayload.current)setSync(cloudHasSnapshot.current?'synced':'empty')
    else setSync('dirty')
  },[state,auth.configured,auth.profile,sync])

  const currentLabel=useMemo(()=>navGroups.flatMap(g=>g.items).find(i=>i.key===view)?.label||'Dashboard',[view])
  const visibleGroups=useMemo(()=>navGroups.map(group=>({...group,items:group.items.filter(item=>!item.adminOnly||role==='admin')})).filter(group=>group.items.length),[role])

  function go(next:string){
    const key=next as ViewKey
    if(key==='users'&&role!=='admin')return
    setView(key);location.hash=`/${key}`;setSidebarOpen(false);window.scrollTo({top:0,behavior:'smooth'})
  }
  function reset(){if(confirm('Obnoviť pôvodné vzorové dáta? Všetky lokálne zmeny sa vymažú.'))setState(resetState())}
  async function importFile(file:File){setState(await importState(file))}

  async function loadCloud(silent=false){
    if(!auth.configured)return
    setSync('loading');setSyncError('')
    try{
      const loaded=await loadCurrentSnapshot()
      setSnapshot(loaded)
      if(loaded){
        const migrated=migrateState(loaded.payload)
        setState(migrated)
        lastCloudPayload.current=JSON.stringify(loaded.payload)
        cloudHasSnapshot.current=true
        setSync(JSON.stringify(loaded.payload)===JSON.stringify(migrated)?'synced':'dirty')
      }else{
        lastCloudPayload.current=JSON.stringify(state)
        cloudHasSnapshot.current=false
        setSync('empty')
      }
    }catch(e){
      setSync('error');setSyncError(e instanceof Error?e.message:'Dáta sa nepodarilo načítať.')
      if(!silent)alert('Načítanie z databázy zlyhalo.')
    }
  }

  async function saveCloud(){
    if(!canEdit||!auth.configured)return
    setSync('saving');setSyncError('')
    try{
      const saved=await saveCurrentSnapshot(state)
      setSnapshot(saved)
      lastCloudPayload.current=JSON.stringify(state)
      cloudHasSnapshot.current=true
      setSync('synced')
    }catch(e){
      setSync('error');setSyncError(e instanceof Error?e.message:'Dáta sa nepodarilo uložiť.')
    }
  }

  if(auth.loading)return <div className="app-loading"><div className="loading-logo">IS</div><strong>Načítavam aplikáciu…</strong><span>Overujem prihlásenie a oprávnenia</span></div>
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
        {auth.configured&&<div className="sync-actions"><button className="icon-button" title="Načítať z databázy" disabled={sync==='loading'||sync==='saving'} onClick={()=>void loadCloud()}><Icon name="download" size={17}/></button>{canEdit&&<button className="icon-button" title="Uložiť do databázy" disabled={sync==='loading'||sync==='saving'||sync==='synced'} onClick={()=>void saveCloud()}><Icon name="upload" size={17}/></button>}</div>}
        <div className={`data-mode data-mode-${sync}`} title={syncError||syncLabel(sync)}><Icon name="database" size={16}/><span>{syncLabel(sync)}</span></div>
        <button className="top-user" onClick={()=>go('roadmap')}><div className="avatar avatar-small">{initials(displayName)}</div><div><strong>{displayName}</strong><small>{role==='admin'?'Administrátor':role==='manager'?'Manažér':'Čitateľ'}</small></div><Icon name="chevron" size={16}/></button>
      </div></header>
      <main className="content">
        {syncError&&<div className="inline-alert inline-alert-error sync-alert"><Icon name="warning" size={18}/><span>{syncError}</span></div>}
        {view==='dashboard'&&<Dashboard state={state} go={go}/>} 
        {view==='people'&&<People employees={state.employees} canEdit={canEdit} onChange={employees=>setState({...state,employees})}/>} 
        {view==='raci'&&<Raci items={state.raci} canEdit={canEdit} onChange={raci=>setState({...state,raci})}/>} 
        {view==='services'&&<Services services={state.services} canEdit={canEdit} onChange={services=>setState({...state,services})}/>} 
        {view==='substitutions'&&<Substitutions items={state.substitutions} canEdit={canEdit} onChange={substitutions=>setState({...state,substitutions})}/>} 
        {view==='capacity'&&<Capacity rows={state.capacity} canEdit={canEdit} onChange={capacity=>setState({...state,capacity})}/>} 
        {view==='work'&&<Work projects={state.projects} tasks={state.tasks} employees={state.employees} canEdit={canEdit} onProjectsChange={projects=>setState({...state,projects})} onTasksChange={tasks=>setState({...state,tasks})}/>} 
        {view==='helpdesk'&&<Helpdesk tickets={state.tickets} services={state.services} employees={state.employees} tasks={state.tasks} canEdit={canEdit} currentUser={displayName} onTicketsChange={tickets=>setState({...state,tickets})} onTasksChange={tasks=>setState({...state,tasks})}/>} 
        {view==='risks'&&<Risks risks={state.risks} canEdit={canEdit} onChange={risks=>setState({...state,risks})}/>} 
        {view==='decisions'&&<Decisions items={state.decisions} canEdit={canEdit} onChange={decisions=>setState({...state,decisions})}/>} 
        {view==='users'&&role==='admin'&&auth.profile&&<Users currentUserId={auth.profile.id}/>} 
        {view==='roadmap'&&<Roadmap state={state} role={role} configured={auth.configured} profile={auth.profile} sync={sync} snapshot={snapshot} onRoleChange={setDemoRole} onExport={()=>exportState(state)} onImport={importFile} onReset={reset} onLoadCloud={()=>loadCloud()} onSaveCloud={saveCloud} onSignOut={()=>auth.signOut()}/>} 
      </main>
    </div>
  </div>
}
