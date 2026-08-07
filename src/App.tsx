import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppRole, AppState, CloudSnapshot, SyncState } from './types'
import { exportState, importState, loadRole, loadState, migrateState, resetState, saveRole, saveState } from './lib/storage'
import { loadCurrentSnapshot, saveCurrentSnapshot } from './lib/cloud'
import { loadWorkData, subscribeToWorkData, syncWorkProjects, syncWorkTasks, type WorkDatabaseState } from './lib/workCloud'
import { loadHelpdeskData, subscribeToHelpdeskData, syncServiceQueues, syncServiceSlaPolicies, syncServiceTickets, type HelpdeskDatabaseState } from './lib/helpdeskCloud'
import { loadIamData, subscribeToIamData, syncIamCampaigns, syncIamCatalog, syncIamRequests, type IamDatabaseState } from './lib/iamCloud'
import { useAuth } from './auth/AuthContext'
import AuthScreen from './auth/AuthScreen'
import CloudSetupScreen from './auth/CloudSetupScreen'
import { Badge, Field, Icon, Modal, type IconName } from './components/UI'
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
import WebRegistry from './views/WebRegistry'
import InformationSystems from './views/InformationSystems'
import Risks from './views/Risks'
import Decisions from './views/Decisions'
import Roadmap from './views/Roadmap'
import Users from './views/Users'
import DepartmentPortal from './views/DepartmentPortal'
import { OitDashboard, OitDataCenter, OitNetwork, OitOperations, OitRaci, OitSystems } from './views/OitPortal'
import OitRelations from './views/OitRelations'
import ServiceArchitecture from './views/ServiceArchitecture'
import TechnologyCatalog from './views/TechnologyCatalog'
import ItCosts from './views/ItCosts'
import OperationsIntelligence from './views/OperationsIntelligence'
import Suppliers from './views/Suppliers'

type ViewKey='portals'|'technology'|'intelligence'|'itCosts'|'suppliers'|'dashboard'|'people'|'raci'|'services'|'substitutions'|'webs'|'informationSystems'|'capacity'|'work'|'helpdesk'|'changes'|'problems'|'iam'|'cmdb'|'risks'|'decisions'|'roadmap'|'users'|'oit'|'oitRaci'|'oitDc'|'oitNetwork'|'oitSystems'|'oitOperations'|'oitRelations'|'architecture'|'oitArchitecture'

interface NavItem { key:ViewKey; label:string; icon:IconName; badge?: (s:AppState)=>number; roles?:AppRole[] }
const allRoles:AppRole[]=['admin','manager','resolver','employee','viewer']
const managementRoles:AppRole[]=['admin','manager']
const resolverRoles:AppRole[]=['admin','manager','resolver']
const employeeRoles:AppRole[]=['admin','manager','resolver','employee']
const orisNavGroups:{label:string;items:NavItem[]}[]=[
  {label:'Portál',items:[{key:'portals',label:'Hlavný panel',icon:'dashboard',roles:allRoles}]},
  {label:'Spoločné',items:[
    {key:'technology',label:'Technologický katalóg',icon:'systems',roles:['admin','manager','resolver','viewer']},
    {key:'intelligence',label:'Riadiace centrum IT',icon:'shield',roles:['admin','manager','resolver','viewer']},
    {key:'itCosts',label:'IT náklady',icon:'capacity',roles:['admin','manager','resolver','viewer']},
    {key:'suppliers',label:'Dodávatelia',icon:'database',roles:allRoles},
  ]},
  {label:'Prehľad ORIS',items:[{key:'dashboard',label:'Dashboard ORIS',icon:'dashboard',roles:allRoles}]},
  {label:'Organizácia',items:[
    {key:'people',label:'Ľudia a výkon rolí',icon:'people',roles:['admin','manager','resolver','viewer']},
    {key:'raci',label:'RACI matica',icon:'matrix',roles:['admin','manager','resolver','viewer']},
    {key:'services',label:'Služby a systémy',icon:'services',roles:['admin','manager','resolver','viewer']},
    {key:'architecture',label:'Architektúra a závislosti',icon:'substitute',roles:['admin','manager','resolver','viewer']},
    {key:'substitutions',label:'Zastupiteľnosť',icon:'substitute',roles:['admin','manager','resolver','viewer']},
  ]},
  {label:'Digitálne portfólio',items:[
    {key:'webs',label:'Weby CVTI SR',icon:'web',roles:['admin','manager','resolver','viewer']},
    {key:'informationSystems',label:'Informačné systémy',icon:'systems',roles:['admin','manager','resolver','viewer']},
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
    {key:'roadmap',label:'Roadmap a nastavenia',icon:'roadmap',roles:['admin']},
  ]},
]
const oitNavGroups:{label:string;items:NavItem[]}[]=[
  {label:'Portál',items:[{key:'portals',label:'Hlavný panel',icon:'dashboard',roles:allRoles}]},
  {label:'Spoločné',items:[
    {key:'technology',label:'Technologický katalóg',icon:'systems',roles:['admin','manager','resolver','viewer']},
    {key:'intelligence',label:'Riadiace centrum IT',icon:'shield',roles:['admin','manager','resolver','viewer']},
    {key:'itCosts',label:'IT náklady',icon:'capacity',roles:['admin','manager','resolver','viewer']},
    {key:'suppliers',label:'Dodávatelia',icon:'database',roles:allRoles},
  ]},
  {label:'OIT',items:[
    {key:'oit',label:'Prehľad OIT',icon:'dashboard',roles:['admin','manager','resolver','viewer']},
    {key:'oitRaci',label:'RACI OIT',icon:'matrix',roles:['admin','manager','resolver','viewer']},
    {key:'oitDc',label:'Dátové centrá',icon:'database',roles:['admin','manager','resolver','viewer']},
    {key:'oitNetwork',label:'Sieťová architektúra',icon:'web',roles:['admin','manager','resolver','viewer']},
    {key:'oitSystems',label:'Systémy a projekty',icon:'systems',roles:['admin','manager','resolver','viewer']},
    {key:'oitOperations',label:'Prevádzka a riziká',icon:'risk',roles:['admin','manager','resolver','viewer']},
    {key:'oitRelations',label:'Prevádzkové väzby',icon:'substitute',roles:['admin','manager','resolver','viewer']},
    {key:'oitArchitecture',label:'Architektúra služieb',icon:'services',roles:['admin','manager','resolver','viewer']},
  ]},
  {label:'Systém',items:[
    {key:'users',label:'Používatelia',icon:'user',roles:['admin']},
    {key:'roadmap',label:'Roadmap a nastavenia',icon:'roadmap',roles:['admin']},
  ]},
]
const portalNavGroups:{label:string;items:NavItem[]}[]=[
  {label:'Portál',items:[
    {key:'portals',label:'Hlavný panel',icon:'dashboard',roles:allRoles},
    {key:'technology',label:'Technologický katalóg',icon:'systems',roles:['admin','manager','resolver','viewer']},
    {key:'intelligence',label:'Riadiace centrum IT',icon:'shield',roles:['admin','manager','resolver','viewer']},
    {key:'itCosts',label:'IT náklady',icon:'capacity',roles:['admin','manager','resolver','viewer']},
    {key:'suppliers',label:'Dodávatelia',icon:'database',roles:allRoles},
  ]},
  {label:'Systém',items:[
    {key:'users',label:'Používatelia',icon:'user',roles:['admin']},
    {key:'roadmap',label:'Roadmap a nastavenia',icon:'roadmap',roles:['admin']},
  ]},
]
const allNavGroups=[...orisNavGroups,...oitNavGroups,...portalNavGroups]

function isViewKey(value:string):value is ViewKey{return allNavGroups.flatMap(g=>g.items).some(i=>i.key===value)}
function initialView():ViewKey{
  const h=location.hash.replace('#/','').split('?')[0]
  return isViewKey(h)?h:'portals'
}
function initials(name:string){return name.split(/\s|@/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'IS'}
function roleLabel(role:AppRole){
  if(role==='admin')return 'Administrátor'
  if(role==='manager')return 'Riaditeľ / manažér'
  if(role==='resolver')return 'Riešiteľ'
  if(role==='employee')return 'Zamestnanec'
  return 'Čitateľ'
}


function AccountProfileModal({onClose}:{onClose:()=>void}){
  const auth=useAuth()
  const profile=auth.profile
  const [changePassword,setChangePassword]=useState(false)
  const [password,setPassword]=useState('')
  const [confirmPassword,setConfirmPassword]=useState('')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')

  async function savePassword(){
    setMessage('');setError('')
    if(password.length<10){setError('Nové heslo musí mať aspoň 10 znakov.');return}
    if(password!==confirmPassword){setError('Zadané heslá sa nezhodujú.');return}
    setBusy(true)
    try{
      await auth.updatePassword(password)
      setPassword('');setConfirmPassword('');setChangePassword(false)
      setMessage('Heslo bolo úspešne zmenené. Pri ďalšom prihlásení použite nové heslo.')
    }catch(caught){
      setError(caught instanceof Error?caught.message:'Heslo sa nepodarilo zmeniť.')
    }finally{setBusy(false)}
  }

  const name=profile?.fullName||auth.user?.email||'Používateľ'
  return <Modal title="Môj profil" onClose={onClose}>
    <div className="user-edit-header"><div className="avatar avatar-large">{initials(name)}</div><div><strong>{name}</strong><span>{profile?.email||auth.user?.email||''}</span><Badge tone="info">{roleLabel(profile?.role??'viewer')}</Badge></div></div>
    <div className="user-detail-grid">
      <article><span>Útvar</span><strong>{profile?.department||'Neurčený'}</strong><small>{profile?.jobTitle||'Pozícia neurčená'}</small></article>
      <article><span>Telefón</span><strong>{profile?.phone||'Nedoplnený'}</strong><small>Kontaktný údaj</small></article>
      <article><span>Prístup</span><strong>{profile?.isActive?'Povolený':'Zablokovaný'}</strong><small>Stav používateľského účtu</small></article>
      <article><span>Posledné prihlásenie</span><strong>{profile?.lastLoginAt?new Date(profile.lastLoginAt).toLocaleString('sk-SK'):'—'}</strong><small>Aktivita účtu</small></article>
    </div>
    {!changePassword&&<div className="password-guidance"><Icon name="lock" size={20}/><div><strong>Zmena vlastného hesla</strong><span>Heslo si môže každý prihlásený používateľ zmeniť bez e-mailu a bez SMTP.</span><button className="button button-primary button-small" onClick={()=>{setChangePassword(true);setMessage('');setError('')}}><Icon name="lock" size={16}/> Zmeniť moje heslo</button></div></div>}
    {changePassword&&<><div className="password-guidance"><Icon name="shield" size={20}/><div><strong>Nové bezpečné heslo</strong><span>Použite aspoň 10 znakov. Zmena sa zapíše priamo do Supabase Auth.</span></div></div><div className="form-grid form-grid-single"><Field label="Nové heslo"><input type="password" autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)} placeholder="Minimálne 10 znakov"/></Field><Field label="Zopakujte nové heslo"><input type="password" autoComplete="new-password" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} placeholder="Zadajte heslo znova"/></Field></div></>}
    {(message||error)&&<div className={error?'inline-alert inline-alert-error compact-alert':'inline-alert inline-alert-success compact-alert'}><Icon name={error?'warning':'check'} size={17}/><span>{error||message}</span></div>}
    <div className="modal-actions"><button className="button button-secondary" onClick={changePassword?()=>{setChangePassword(false);setPassword('');setConfirmPassword('');setError('')}:onClose}>{changePassword?'Späť':'Zavrieť'}</button>{changePassword&&<button className="button button-primary" disabled={busy||!password||!confirmPassword} onClick={()=>void savePassword()}>{busy?'Ukladám…':'Uložiť nové heslo'}</button>}</div>
  </Modal>
}

function serializeSnapshotScope(state:AppState){
  return JSON.stringify({...state,projects:[],tasks:[],tickets:[],supportQueues:[],slaPolicies:[],accessRequests:[],accessCatalog:[],recertificationCampaigns:[]})
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


function errorMessage(error:unknown,fallback:string){
  if(error instanceof Error&&error.message.trim())return error.message.trim()
  if(typeof error==='string'&&error.trim())return error.trim()
  if(error&&typeof error==='object'){
    const record=error as Record<string,unknown>
    const values=['message','details','hint','code','error_description']
      .map(key=>record[key])
      .filter((value):value is string=>typeof value==='string'&&value.trim().length>0)
    if(values.length)return values.join(' · ')
    try{
      const serialized=JSON.stringify(error)
      if(serialized&&serialized!=='{}')return serialized
    }catch{/* nepodarilo sa serializovať */}
  }
  return fallback
}

export default function App(){
  const auth=useAuth()
  const [state,setState]=useState<AppState>(()=>loadState())
  const [demoRole,setDemoRole]=useState<AppRole>(()=>loadRole())
  const [view,setView]=useState<ViewKey>(()=>initialView())
  const [sidebarOpen,setSidebarOpen]=useState(false)
  const [profileOpen,setProfileOpen]=useState(false)
  const [sync,setSync]=useState<SyncState>(auth.configured?'loading':'local')
  const [syncError,setSyncError]=useState('')
  const [snapshot,setSnapshot]=useState<CloudSnapshot|null>(null)
  const [workSync,setWorkSync]=useState<WorkDatabaseState>(auth.configured?'loading':'local')
  const [workError,setWorkError]=useState('')
  const [helpdeskSync,setHelpdeskSync]=useState<HelpdeskDatabaseState>(auth.configured?'loading':'local')
  const [helpdeskError,setHelpdeskError]=useState('')
  const [iamSync,setIamSync]=useState<IamDatabaseState>(auth.configured?'loading':'local')
  const [iamError,setIamError]=useState('')
  const lastCloudPayload=useRef<string>('')
  const cloudInitialized=useRef(false)
  const cloudHasSnapshot=useRef(false)
  const stateRef=useRef(state)
  const workWriteQueue=useRef<Promise<void>>(Promise.resolve())
  const workPendingWrites=useRef(0)
  const workReloadTimer=useRef<number|undefined>(undefined)
  const helpdeskWriteQueue=useRef<Promise<void>>(Promise.resolve())
  const helpdeskPendingWrites=useRef(0)
  const helpdeskReloadTimer=useRef<number|undefined>(undefined)
  const iamWriteQueue=useRef<Promise<void>>(Promise.resolve())
  const iamPendingWrites=useRef(0)
  const iamReloadTimer=useRef<number|undefined>(undefined)

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
      const allowed=allNavGroups.flatMap(group=>group.items).find(item=>item.key===next)?.roles?.includes(role)??false
      if(!allowed){setView('portals');location.hash='/portals'}
      else setView(next)
    }
    addEventListener('hashchange',onHash)
    return()=>removeEventListener('hashchange',onHash)
  },[role])

  useEffect(()=>{
    const allowed=allNavGroups.flatMap(group=>group.items).find(item=>item.key===view)?.roles?.includes(role)??false
    if(!allowed){setView('portals');location.hash='/portals'}
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

  useEffect(()=>{
    if(!auth.configured||!auth.profile?.organizationId)return
    const unsubscribe=subscribeToHelpdeskData(auth.profile.organizationId,()=>{
      if(helpdeskReloadTimer.current)window.clearTimeout(helpdeskReloadTimer.current)
      helpdeskReloadTimer.current=window.setTimeout(()=>void reloadHelpdeskData(true),350)
    })
    return()=>{
      if(helpdeskReloadTimer.current)window.clearTimeout(helpdeskReloadTimer.current)
      unsubscribe()
    }
  },[auth.configured,auth.profile?.organizationId])

  useEffect(()=>{
    if(!auth.configured||!auth.profile?.organizationId)return
    const unsubscribe=subscribeToIamData(auth.profile.organizationId,()=>{
      if(iamReloadTimer.current)window.clearTimeout(iamReloadTimer.current)
      iamReloadTimer.current=window.setTimeout(()=>void reloadIamData(true),350)
    })
    return()=>{
      if(iamReloadTimer.current)window.clearTimeout(iamReloadTimer.current)
      unsubscribe()
    }
  },[auth.configured,auth.profile?.organizationId])

  const workspace=view==='portals'||view==='technology'||view==='intelligence'||view==='itCosts'||view==='suppliers'?'portal':view.startsWith('oit')?'oit':'oris'
  const activeNavGroups=workspace==='oit'?oitNavGroups:workspace==='portal'?portalNavGroups:orisNavGroups
  const currentLabel=useMemo(()=>allNavGroups.flatMap(g=>g.items).find(i=>i.key===view)?.label||'Hlavný panel',[view])
  const visibleGroups=useMemo(()=>activeNavGroups.map(group=>({...group,items:group.items.filter(item=>item.roles?.includes(role))})).filter(group=>group.items.length),[role,workspace])
  const workspaceName=workspace==='oit'?'Odbor 3.1':workspace==='oris'?'Odbor 3.2':'Portál odborov'
  const workspaceDetail=workspace==='oit'?'Správa a prevádzka IT infraštruktúry':workspace==='oris'?'Prevádzka a rozvoj IS · projektové riadenie':'CVTI SR · odbory 3.1 a 3.2'

  function go(next:string){
    const key=next as ViewKey
    const allowed=allNavGroups.flatMap(group=>group.items).find(item=>item.key===key)?.roles?.includes(role)??false
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


  async function reloadHelpdeskData(silent=false){
    if(!auth.configured){setHelpdeskSync('local');return}
    setHelpdeskSync('loading');setHelpdeskError('')
    try{
      const helpdesk=await loadHelpdeskData()
      setState(current=>({...current,...helpdesk}))
      setHelpdeskSync('synced')
    }catch(e){
      const message=e instanceof Error?e.message:'Helpdesk sa nepodarilo načítať.'
      setHelpdeskSync('error');setHelpdeskError(message)
      if(!silent)alert(message)
    }
  }

  function enqueueHelpdeskWrite(operation:()=>Promise<void>){
    if(!auth.configured)return
    helpdeskPendingWrites.current+=1
    setHelpdeskSync('saving');setHelpdeskError('')
    const run=helpdeskWriteQueue.current.then(operation)
    helpdeskWriteQueue.current=run.catch(()=>undefined)
    void run.then(()=>{
      helpdeskPendingWrites.current-=1
      if(helpdeskPendingWrites.current===0)setHelpdeskSync('synced')
    }).catch(e=>{
      helpdeskPendingWrites.current-=1
      setHelpdeskSync('error')
      setHelpdeskError(e instanceof Error?e.message:'Zápis Helpdesku zlyhal.')
    })
  }

  function commitTickets(tickets:AppState['tickets']){
    const previous=stateRef.current.tickets
    const nextState={...stateRef.current,tickets}
    stateRef.current=nextState
    setState(nextState)
    if(!auth.configured){setHelpdeskSync('local');return}
    enqueueHelpdeskWrite(()=>syncServiceTickets(previous,tickets))
  }

  function commitSupportQueues(supportQueues:AppState['supportQueues']){
    const previous=stateRef.current.supportQueues
    const nextState={...stateRef.current,supportQueues}
    stateRef.current=nextState
    setState(nextState)
    if(!auth.configured){setHelpdeskSync('local');return}
    enqueueHelpdeskWrite(()=>syncServiceQueues(previous,supportQueues))
  }

  function commitSlaPolicies(slaPolicies:AppState['slaPolicies']){
    const previous=stateRef.current.slaPolicies
    const nextState={...stateRef.current,slaPolicies}
    stateRef.current=nextState
    setState(nextState)
    if(!auth.configured){setHelpdeskSync('local');return}
    enqueueHelpdeskWrite(()=>syncServiceSlaPolicies(previous,slaPolicies))
  }

  async function reloadIamData(silent=false){
    if(!auth.configured){setIamSync('local');return}
    setIamSync('loading');setIamError('')
    try{
      const iam=await loadIamData()
      setState(current=>({...current,...iam}))
      setIamSync('synced')
    }catch(e){
      const message=errorMessage(e,'IAM sa nepodarilo načítať.')
      setIamSync('error');setIamError(message)
      if(!silent)alert(message)
    }
  }

  function enqueueIamWrite(operation:()=>Promise<void>){
    if(!auth.configured)return
    iamPendingWrites.current+=1
    setIamSync('saving');setIamError('')
    const run=iamWriteQueue.current.then(operation)
    iamWriteQueue.current=run.catch(()=>undefined)
    void run.then(()=>{
      iamPendingWrites.current-=1
      if(iamPendingWrites.current===0)setIamSync('synced')
    }).catch(e=>{
      iamPendingWrites.current-=1
      setIamSync('error')
      setIamError(errorMessage(e,'Zápis IAM zlyhal.'))
    })
  }

  function commitAccessRequests(accessRequests:AppState['accessRequests']){
    const previous=stateRef.current.accessRequests
    const nextState={...stateRef.current,accessRequests}
    stateRef.current=nextState
    setState(nextState)
    if(!auth.configured){setIamSync('local');return}
    enqueueIamWrite(()=>syncIamRequests(previous,accessRequests))
  }

  function commitAccessCatalog(accessCatalog:AppState['accessCatalog']){
    const previous=stateRef.current.accessCatalog
    const nextState={...stateRef.current,accessCatalog}
    stateRef.current=nextState
    setState(nextState)
    if(!auth.configured){setIamSync('local');return}
    enqueueIamWrite(()=>syncIamCatalog(previous,accessCatalog))
  }

  function commitRecertificationCampaigns(recertificationCampaigns:AppState['recertificationCampaigns']){
    const previous=stateRef.current.recertificationCampaigns
    const nextState={...stateRef.current,recertificationCampaigns}
    stateRef.current=nextState
    setState(nextState)
    if(!auth.configured){setIamSync('local');return}
    enqueueIamWrite(()=>syncIamCampaigns(previous,recertificationCampaigns))
  }

  async function loadCloud(silent=false){
    if(!auth.configured)return
    setSync('loading');setSyncError('');setWorkSync('loading');setWorkError('');setHelpdeskSync('loading');setHelpdeskError('');setIamSync('loading');setIamError('')
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

      try{
        const helpdesk=await loadHelpdeskData()
        nextState={...nextState,...helpdesk}
        setHelpdeskSync('synced')
      }catch(helpdeskFailure){
        setHelpdeskSync('error')
        setHelpdeskError(helpdeskFailure instanceof Error?helpdeskFailure.message:'Helpdesk sa nepodarilo načítať.')
      }

      try{
        const iam=await loadIamData()
        nextState={...nextState,...iam}
        setIamSync('synced')
      }catch(iamFailure){
        setIamSync('error')
        setIamError(errorMessage(iamFailure,'IAM sa nepodarilo načítať.'))
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
      <div className="brand"><div className="brand-mark">IS</div><div><strong>{workspaceName}</strong><small>{workspaceDetail}</small></div><button className="icon-button sidebar-close" onClick={()=>setSidebarOpen(false)}><Icon name="close"/></button></div>
      <nav>{visibleGroups.map(group=><section className="nav-group" key={group.label}><span>{group.label}</span>{group.items.map(item=>{const badge=item.badge?.(state);return <button key={item.key} className={view===item.key?'active':''} onClick={()=>go(item.key)}><Icon name={item.icon}/><span>{item.label}</span>{badge!==undefined&&badge>0?<b>{badge}</b>:null}</button>})}</section>)}</nav>
      <div className="sidebar-footer"><div className={`mode-dot mode-${sync}`}/><div><strong>{auth.configured?'Supabase režim':'Pracovný prototyp'}</strong><small>{syncLabel(sync)} · v{state.meta.version}</small></div></div>
    </aside>
    {sidebarOpen&&<button className="sidebar-overlay" onClick={()=>setSidebarOpen(false)} aria-label="Zavrieť menu"/>}
    <div className="app-main">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={()=>setSidebarOpen(true)}><Icon name="menu"/></button><div><small>{workspaceName}</small><strong>{currentLabel}</strong></div></div><div className="topbar-right">
        {auth.configured&&<div className="sync-actions"><button className="icon-button" title="Načítať z databázy" disabled={sync==='loading'||sync==='saving'} onClick={()=>void loadCloud()}><Icon name="download" size={17}/></button>{canResolve&&<button className="icon-button" title="Uložiť do databázy" disabled={sync==='loading'||sync==='saving'||sync==='synced'} onClick={()=>void saveCloud()}><Icon name="upload" size={17}/></button>}</div>}
        <div className={`data-mode data-mode-${sync}`} title={syncError||syncLabel(sync)}><Icon name="database" size={16}/><span>{syncLabel(sync)}</span></div>
        <button className="top-user" title="Môj profil a zmena hesla" onClick={()=>setProfileOpen(true)}><div className="avatar avatar-small">{initials(displayName)}</div><div><strong>{displayName}</strong><small>{roleLabel(role)}</small></div><Icon name="chevron" size={16}/></button>{auth.configured&&<button className="icon-button top-logout" title="Odhlásiť sa" onClick={()=>void auth.signOut()}><Icon name="logout" size={18}/></button>}
      </div></header>
      <main className="content">
        {syncError&&<div className="inline-alert inline-alert-error sync-alert"><Icon name="warning" size={18}/><span>{syncError}</span></div>}
        {view==='portals'&&<DepartmentPortal go={go}/>}
        {view==='technology'&&<TechnologyCatalog state={state} go={go}/>}
        {view==='intelligence'&&<OperationsIntelligence state={state} go={go}/>}
        {view==='itCosts'&&<ItCosts state={state} go={go} canEdit={canManage} currentUser={displayName} onActionsChange={actions=>setState(current=>({...current,actions}))}/>}
        {view==='suppliers'&&<Suppliers state={state} canEdit={role==='admin'} currentUser={displayName} role={role} onChange={supplierRecords=>setState(current=>({...current,supplierRecords}))} go={go}/>}
        {view==='oit'&&<OitDashboard go={go}/>}
        {view==='oitRaci'&&<OitRaci orisItems={state.raci} orisEmployees={state.employees} substitutions={state.substitutions}/>}
        {view==='oitDc'&&<OitDataCenter/>}
        {view==='oitNetwork'&&<OitNetwork/>}
        {view==='oitSystems'&&<OitSystems/>}
        {view==='oitOperations'&&<OitOperations/>}
        {view==='oitRelations'&&<OitRelations state={state} go={go}/>}
        {view==='oitArchitecture'&&<ServiceArchitecture state={state} go={go} perspective="oit" canEdit={canResolve} currentUser={displayName} onArchitectureChange={architectureOverrides=>setState(current=>({...current,architectureOverrides}))}/>}
        {view==='architecture'&&<ServiceArchitecture state={state} go={go} perspective="oris" canEdit={canResolve} currentUser={displayName} onArchitectureChange={architectureOverrides=>setState(current=>({...current,architectureOverrides}))}/>}
        {view==='dashboard'&&<Dashboard state={state} go={go}/>} 
        {view==='people'&&<People employees={state.employees} raci={state.raci} capacity={state.capacity} canEdit={canManage} onChange={employees=>setState(current=>({...current,employees}))}/>} 
        {view==='raci'&&<Raci items={state.raci} employees={state.employees} substitutions={state.substitutions} canEdit={canManage} onChange={raci=>setState(current=>({...current,raci}))}/>} 
        {view==='services'&&<Services services={state.services} canEdit={canManage} onChange={services=>setState(current=>({...current,services}))}/>} 
        {view==='substitutions'&&<Substitutions items={state.substitutions} canEdit={canManage} onChange={substitutions=>setState(current=>({...current,substitutions}))}/>} 
        {view==='capacity'&&<Capacity rows={state.capacity} canEdit={canManage} onChange={capacity=>setState(current=>({...current,capacity}))}/>} 
        {view==='work'&&<Work projects={state.projects} tasks={state.tasks} employees={state.employees} canEdit={canResolve} databaseMode={auth.configured?'cloud':'local'} databaseState={workSync} databaseError={workError} onReload={()=>void reloadWorkData()} onProjectsChange={commitProjects} onTasksChange={commitTasks}/>} 
        {view==='helpdesk'&&<Helpdesk tickets={Array.isArray(state.tickets)?state.tickets:[]} services={Array.isArray(state.services)?state.services:[]} employees={Array.isArray(state.employees)?state.employees:[]} tasks={Array.isArray(state.tasks)?state.tasks:[]} supportQueues={Array.isArray(state.supportQueues)?state.supportQueues:[]} slaPolicies={Array.isArray(state.slaPolicies)?state.slaPolicies:[]} canEdit={canSubmit} canConfigure={canResolve} currentUser={displayName} databaseMode={auth.configured?'cloud':'local'} databaseState={helpdeskSync} databaseError={helpdeskError} onReload={()=>void reloadHelpdeskData()} onTicketsChange={commitTickets} onTasksChange={commitTasks} onSupportQueuesChange={commitSupportQueues} onSlaPoliciesChange={commitSlaPolicies}/>} 
        {view==='changes'&&<ChangeManagement changes={Array.isArray(state.changes)?state.changes:[]} services={Array.isArray(state.services)?state.services:[]} employees={Array.isArray(state.employees)?state.employees:[]} tickets={Array.isArray(state.tickets)?state.tickets:[]} projects={Array.isArray(state.projects)?state.projects:[]} tasks={Array.isArray(state.tasks)?state.tasks:[]} canEdit={canResolve} currentUser={displayName} onChangesChange={changes=>setState(current=>({...current,changes}))} onTasksChange={commitTasks}/>} 
        {view==='problems'&&<ProblemManagement problems={Array.isArray(state.problems)?state.problems:[]} services={Array.isArray(state.services)?state.services:[]} employees={Array.isArray(state.employees)?state.employees:[]} tickets={Array.isArray(state.tickets)?state.tickets:[]} changes={Array.isArray(state.changes)?state.changes:[]} projects={Array.isArray(state.projects)?state.projects:[]} tasks={Array.isArray(state.tasks)?state.tasks:[]} canEdit={canResolve} currentUser={displayName} onProblemsChange={problems=>setState(current=>({...current,problems}))} onTasksChange={commitTasks}/>} 
        {view==='iam'&&<IamManagement accessRequests={Array.isArray(state.accessRequests)?state.accessRequests:[]} accessCatalog={Array.isArray(state.accessCatalog)?state.accessCatalog:[]} recertificationCampaigns={Array.isArray(state.recertificationCampaigns)?state.recertificationCampaigns:[]} services={Array.isArray(state.services)?state.services:[]} employees={Array.isArray(state.employees)?state.employees:[]} tasks={Array.isArray(state.tasks)?state.tasks:[]} canEdit={canSubmit} canConfigure={canResolve} currentUser={displayName} databaseMode={auth.configured?'cloud':'local'} databaseState={iamSync} databaseError={iamError} onReload={()=>void reloadIamData()} onAccessRequestsChange={commitAccessRequests} onAccessCatalogChange={commitAccessCatalog} onRecertificationCampaignsChange={commitRecertificationCampaigns} onTasksChange={commitTasks}/>} 
        {view==='cmdb'&&<Cmdb items={Array.isArray(state.cmdbItems)?state.cmdbItems:[]} relationships={Array.isArray(state.cmdbRelationships)?state.cmdbRelationships:[]} services={Array.isArray(state.services)?state.services:[]} tickets={Array.isArray(state.tickets)?state.tickets:[]} changes={Array.isArray(state.changes)?state.changes:[]} canEdit={canResolve} onItemsChange={cmdbItems=>setState(current=>({...current,cmdbItems}))} onRelationshipsChange={cmdbRelationships=>setState(current=>({...current,cmdbRelationships}))}/>} 
        {view==='webs'&&<WebRegistry canEdit={canResolve} databaseMode={auth.configured?'cloud':'local'} organizationId={auth.profile?.organizationId}/>} 
        {view==='informationSystems'&&<InformationSystems canEdit={canResolve} databaseMode={auth.configured?'cloud':'local'} organizationId={auth.profile?.organizationId}/>} 
        {view==='risks'&&<Risks risks={state.risks} canEdit={canManage} onChange={risks=>setState(current=>({...current,risks}))}/>} 
        {view==='decisions'&&<Decisions items={state.decisions} canEdit={canManage} onChange={decisions=>setState(current=>({...current,decisions}))}/>} 
        {view==='users'&&role==='admin'&&<Users currentUserId={auth.profile?.id??'local-admin'} currentUserName={displayName} configured={auth.configured}/>} 
        {view==='roadmap'&&role==='admin'&&<Roadmap state={state} role={role} configured={auth.configured} profile={auth.profile} sync={sync} snapshot={snapshot} onRoleChange={setDemoRole} onExport={()=>exportState(state)} onImport={importFile} onReset={reset} onLoadCloud={()=>loadCloud()} onSaveCloud={saveCloud} onSignOut={()=>auth.signOut()}/>} 
      </main>
    </div>
    {profileOpen&&<AccountProfileModal onClose={()=>setProfileOpen(false)}/>}
  </div>
}
