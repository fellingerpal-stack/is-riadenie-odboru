import { useMemo, useState } from 'react'
import type { AccessScope, AppState } from '../types'
import { Icon, type IconName } from './UI'
import { buildSupplierDirectory } from '../lib/supplierDirectory'
import { buildContractDirectory } from '../lib/contractDirectory'
import './GlobalSearch.css'

type ViewKey = 'portals'|'technology'|'intelligence'|'itCosts'|'contracts'|'suppliers'|'dashboard'|'people'|'raci'|'services'|'substitutions'|'webs'|'informationSystems'|'capacity'|'work'|'helpdesk'|'changes'|'problems'|'iam'|'cmdb'|'risks'|'decisions'|'roadmap'|'users'|'oit'|'oitRaci'|'oitDc'|'oitNetwork'|'oitSystems'|'oitOperations'|'oitRelations'|'architecture'|'oitArchitecture'|'myWorkspace'|'dataQuality'

type SearchResult = {
  id: string
  title: string
  subtitle: string
  kind: string
  icon: IconName
  view: ViewKey
  assetId?: string
}

const shortcuts: SearchResult[] = [
  { id:'shortcut-my', title:'Moje centrum', subtitle:'Moje úlohy, aktíva a signály', kind:'Navigácia', icon:'dashboard', view:'myWorkspace' },
  { id:'shortcut-control', title:'Riadiace centrum IT', subtitle:'Control Tower a Service 360', kind:'Navigácia', icon:'shield', view:'intelligence' },
  { id:'shortcut-tech', title:'Technologický katalóg', subtitle:'Technológie, služby a infraštruktúra', kind:'Navigácia', icon:'systems', view:'technology' },
  { id:'shortcut-assets', title:'Asset management', subtitle:'Register aktív a inventarizácia', kind:'Navigácia', icon:'cmdb', view:'cmdb' },
  { id:'shortcut-costs', title:'IT náklady', subtitle:'RUN / CHANGE, úlohy a finančné opatrenia', kind:'Navigácia', icon:'capacity', view:'itCosts' },
  { id:'shortcut-contracts', title:'Zmluvy a SLA', subtitle:'Platnosť, čerpanie, SLA a obnova', kind:'Navigácia', icon:'calendar', view:'contracts' },
  { id:'shortcut-quality', title:'Kvalita dát', subtitle:'Chýbajúce väzby, vlastníctvo a duplicity', kind:'Navigácia', icon:'check', view:'dataQuality' },
]

function text(value: unknown) { return String(value ?? '').toLowerCase() }
function matches(query: string, ...values: unknown[]) { return values.some(value => text(value).includes(query)) }
function scopeAllowed(scope: AccessScope, canReadOit: boolean, canReadOris: boolean, canReadShared: boolean) {
  if (scope === 'oit') return canReadOit
  if (scope === 'oris') return canReadOris
  return canReadShared
}

export default function GlobalSearch({
  state,
  onClose,
  go,
  canReadOit,
  canReadOris,
  canReadShared,
}: {
  state: AppState
  onClose: () => void
  go: (view: ViewKey) => void
  canReadOit: boolean
  canReadOris: boolean
  canReadShared: boolean
}) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()

  const results = useMemo<SearchResult[]>(() => {
    if (!normalized) {
      return shortcuts.filter(item => {
        if (['technology','intelligence','itCosts','contracts','suppliers','cmdb','dataQuality'].includes(item.view)) return canReadShared || item.view === 'dataQuality'
        return true
      })
    }

    const found: SearchResult[] = []
    if (canReadShared) {
      state.cmdbItems.filter(item => scopeAllowed(item.scope, canReadOit, canReadOris, canReadShared) && matches(normalized, item.name, item.id, item.assetTag, item.serialNumber, item.hostname, item.supplier, item.location, item.assignedTo)).slice(0,12).forEach(item => found.push({
        id:`asset-${item.id}`, title:item.name, subtitle:`${item.type} · ${item.assetTag || item.id} · ${item.location || 'bez lokality'}`, kind:'Aktívum', icon:'cmdb', view:'cmdb', assetId:item.id,
      }))
      buildSupplierDirectory(state).filter(item => matches(normalized, item.name, item.ico, item.record?.category, item.record?.salesContact, item.relationships.map(relation => `${relation.targetName} ${relation.parentSystem} ${relation.role}`).join(' '))).slice(0,8).forEach(item => found.push({
        id:`supplier-${item.key}`, title:item.name || `IČO ${item.ico}`, subtitle:`Dodávateľ · IČO ${item.ico || '—'} · ${item.relationships.filter(relation => relation.status !== 'Zamietnuté').length} väzieb`, kind:'Dodávateľ', icon:'database', view:'suppliers',
      }))
      buildContractDirectory(state).filter(item => matches(normalized, item.contractNumber, item.aliases.join(' '), item.title, item.supplierName, item.supplierIco, item.owner, item.systemNames.join(' '), item.tasks.join(' '))).slice(0,8).forEach(item => found.push({
        id:`contract-${item.canonicalKey}`, title:item.contractNumber || item.title || 'Zmluva', subtitle:`Zmluva · ${item.supplierName || 'bez dodávateľa'} · ${item.validTo || 'bez termínu'}`, kind:'Zmluva', icon:'calendar', view:'contracts',
      }))
    }
    if (canReadOris) {
      state.services.filter(item => matches(normalized, item.name, item.category, item.businessOwner, item.technicalOwner, item.primary)).slice(0,10).forEach(item => found.push({
        id:`service-${item.id}`, title:item.name, subtitle:`Služba · ${item.category} · ${item.criticality}`, kind:'Služba', icon:'services', view:'services',
      }))
      state.tasks.filter(item => matches(normalized, item.title, item.id, item.owner, item.status, item.projectId)).slice(0,10).forEach(item => found.push({
        id:`task-${item.id}`, title:item.title, subtitle:`Úloha · ${item.owner || 'bez ownera'} · ${item.status}`, kind:'Úloha', icon:'tasks', view:'work',
      }))
      state.tickets.filter(item => matches(normalized, item.title, item.id, item.requester, item.assignee, item.category)).slice(0,10).forEach(item => found.push({
        id:`ticket-${item.id}`, title:item.title, subtitle:`${item.type} · ${item.status} · ${item.priority}`, kind:'Helpdesk', icon:'helpdesk', view:'helpdesk',
      }))
      state.risks.filter(item => matches(normalized, item.risk, item.area, item.owner, item.priority)).slice(0,8).forEach(item => found.push({
        id:`risk-${item.id}`, title:item.risk, subtitle:`Riziko · ${item.area} · ${item.priority}`, kind:'Riziko', icon:'risk', view:'risks',
      }))
      state.projects.filter(item => matches(normalized, item.name, item.owner, item.sponsor, item.status)).slice(0,8).forEach(item => found.push({
        id:`project-${item.id}`, title:item.name, subtitle:`Projekt · ${item.owner} · ${item.status}`, kind:'Projekt', icon:'projects', view:'work',
      }))
      state.accessRequests.filter(item => matches(normalized, item.subjectName, item.subjectEmail, item.requestedAccess, item.status, item.assignee)).slice(0,8).forEach(item => found.push({
        id:`iam-${item.id}`, title:`${item.subjectName} · ${item.requestedAccess}`, subtitle:`IAM · ${item.status} · ${item.assignee || 'bez riešiteľa'}`, kind:'IAM', icon:'iam', view:'iam',
      }))
    }

    shortcuts.filter(item => matches(normalized, item.title, item.subtitle)).forEach(item => found.unshift(item))
    return found.slice(0,32)
  }, [state, normalized, canReadOit, canReadOris, canReadShared])

  const open = (result: SearchResult) => {
    go(result.view)
    if (result.assetId) window.setTimeout(() => { location.hash = `/cmdb?asset=${encodeURIComponent(result.assetId!)}` }, 10)
    onClose()
  }

  return <div className="global-search-backdrop" onMouseDown={onClose}>
    <section className="global-search" onMouseDown={event => event.stopPropagation()}>
      <div className="global-search-input"><Icon name="search" size={20}/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Hľadať službu, aktívum, človeka, dodávateľa, úlohu…"/><kbd>ESC</kbd></div>
      <div className="global-search-meta"><span>{normalized ? `${results.length} výsledkov` : 'Rýchle skratky'}</span><span>Ctrl+K otvorí hľadanie odkiaľkoľvek</span></div>
      <div className="global-search-results">
        {results.length ? results.map(result => <button key={result.id} onClick={() => open(result)}>
          <span className="global-search-icon"><Icon name={result.icon} size={18}/></span>
          <span className="global-search-copy"><strong>{result.title}</strong><small>{result.subtitle}</small></span>
          <span className="global-search-kind">{result.kind}</span><Icon name="chevron" size={16}/>
        </button>) : <div className="global-search-empty"><Icon name="search" size={28}/><strong>Nič som nenašiel</strong><span>Skús názov služby, inventárne číslo, IČO, človeka alebo číslo úlohy.</span></div>}
      </div>
    </section>
  </div>
}
