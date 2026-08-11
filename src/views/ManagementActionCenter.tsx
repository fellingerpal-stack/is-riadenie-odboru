import { useMemo, useState } from 'react'
import type { AppState } from '../types'
import { Icon } from '../components/UI'
import { actionCenterDaysUntil, buildActionCenter, type ActionCenterItem, type ActionCenterPriority } from '../lib/actionCenter'
import './ManagementActionCenter.css'

type Props = {
  state: AppState
  currentUser: string
  go: (key: string) => void
}

type QuickFilter = 'all' | 'critical' | 'overdue' | 'soon' | 'unowned' | 'mine'

const PRIORITY_LABEL: Record<ActionCenterPriority, string> = {
  critical: 'Kritické',
  high: 'Vysoké',
  medium: 'Stredné',
  info: 'Informačné',
}

function dueLabel(value: string): string {
  if (!value) return 'Bez termínu'
  const date = new Date(value.length <= 10 ? `${value}T12:00:00` : value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function searchable(item: ActionCenterItem): string {
  return [item.source, item.sourceId, item.title, item.detail, item.owner, item.status, item.reason].join(' ').toLowerCase()
}

export default function ManagementActionCenter({ state, currentUser, go }: Props) {
  const [quick, setQuick] = useState<QuickFilter>('all')
  const [source, setSource] = useState('all')
  const [query, setQuery] = useState('')
  const now = useMemo(() => new Date(), [])
  const items = useMemo(() => buildActionCenter(state, now), [state, now])
  const sources = useMemo(() => [...new Set(items.map(item => item.source))].sort((a, b) => a.localeCompare(b, 'sk')), [items])

  const metrics = useMemo(() => {
    const critical = items.filter(item => item.priority === 'critical').length
    const overdue = items.filter(item => (actionCenterDaysUntil(item.due, now) ?? 0) < 0).length
    const soon = items.filter(item => {
      const days = actionCenterDaysUntil(item.due, now)
      return days != null && days >= 0 && days <= 14
    }).length
    const unowned = items.filter(item => !item.owner).length
    return { critical, overdue, soon, unowned, open: items.length }
  }, [items, now])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const me = currentUser.trim().toLowerCase()
    return items.filter(item => {
      if (source !== 'all' && item.source !== source) return false
      if (q && !searchable(item).includes(q)) return false
      if (quick === 'critical' && item.priority !== 'critical') return false
      if (quick === 'overdue' && !((actionCenterDaysUntil(item.due, now) ?? 0) < 0)) return false
      if (quick === 'soon') {
        const days = actionCenterDaysUntil(item.due, now)
        if (days == null || days < 0 || days > 14) return false
      }
      if (quick === 'unowned' && item.owner) return false
      if (quick === 'mine' && (!me || !item.owner.toLowerCase().includes(me))) return false
      return true
    })
  }, [currentUser, items, now, query, quick, source])

  function toggle(next: QuickFilter) {
    setQuick(current => current === next ? 'all' : next)
  }

  return <div className="mac-page">
    <section className="mac-hero">
      <div>
        <span className="mac-eyebrow">MANAGEMENT ACTION CENTER</span>
        <h1>Čo potrebuje rozhodnutie alebo zásah</h1>
        <p>Jeden prioritizovaný pohľad nad existujúcimi opatreniami, rizikami, úlohami, incidentmi, zmenami, IAM, problémami a aktívami. Zdroj pravdy ostáva v pôvodnom registri.</p>
      </div>
      <div className="mac-hero-note"><Icon name="shield" size={20}/><span><strong>Riadiaca vrstva</strong><small>Signál → dôvod → owner → termín → zdroj</small></span></div>
    </section>

    <section className="mac-kpis" aria-label="Súhrn riadiacich signálov">
      <button className={`mac-kpi mac-kpi-critical ${quick==='critical'?'active':''}`} onClick={()=>toggle('critical')}><span>Kritické</span><strong>{metrics.critical}</strong><small>najvyššia priorita</small></button>
      <button className={`mac-kpi mac-kpi-overdue ${quick==='overdue'?'active':''}`} onClick={()=>toggle('overdue')}><span>Po termíne</span><strong>{metrics.overdue}</strong><small>vyžaduje eskaláciu</small></button>
      <button className={`mac-kpi ${quick==='soon'?'active':''}`} onClick={()=>toggle('soon')}><span>Do 14 dní</span><strong>{metrics.soon}</strong><small>blížiaci sa termín</small></button>
      <button className={`mac-kpi ${quick==='unowned'?'active':''}`} onClick={()=>toggle('unowned')}><span>Bez ownera</span><strong>{metrics.unowned}</strong><small>nejasná zodpovednosť</small></button>
      <button className={`mac-kpi ${quick==='all'?'active':''}`} onClick={()=>setQuick('all')}><span>Otvorené</span><strong>{metrics.open}</strong><small>všetky zdroje</small></button>
    </section>

    <section className="mac-toolbar">
      <label className="mac-search"><Icon name="search" size={17}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Hľadať signál, ownera, ID alebo stav…" /></label>
      <select value={source} onChange={event=>setSource(event.target.value)} aria-label="Zdroj"><option value="all">Všetky zdroje</option>{sources.map(value=><option key={value} value={value}>{value}</option>)}</select>
      <button className={`button button-secondary ${quick==='mine'?'active':''}`} onClick={()=>toggle('mine')}><Icon name="user" size={16}/> Moje</button>
      {(quick!=='all'||source!=='all'||query)&&<button className="button button-ghost" onClick={()=>{setQuick('all');setSource('all');setQuery('')}}>Zrušiť filtre</button>}
      <span className="mac-result-count">{filtered.length} / {items.length}</span>
    </section>

    <section className="mac-list">
      {filtered.length===0&&<div className="mac-empty"><Icon name="check" size={30}/><strong>Žiadny signál v tomto výbere</strong><p>Zmeň filtre alebo pokračuj v práci v zdrojových moduloch.</p></div>}
      {filtered.map(item => {
        const days = actionCenterDaysUntil(item.due, now)
        return <article className={`mac-row mac-priority-${item.priority}`} key={item.id}>
          <div className="mac-severity"><span>{PRIORITY_LABEL[item.priority]}</span><strong>{item.sourceId}</strong></div>
          <div className="mac-main">
            <div className="mac-title-line"><h3>{item.title}</h3><span className="mac-source">{item.source}</span></div>
            {item.detail&&<p>{item.detail}</p>}
            <div className="mac-meta">
              <span><Icon name="user" size={14}/>{item.owner||'Bez ownera'}</span>
              <span className={days!=null&&days<0?'mac-meta-overdue':''}><Icon name="calendar" size={14}/>{dueLabel(item.due)}</span>
              <span><Icon name="tasks" size={14}/>{item.status}</span>
              <span className="mac-reason"><Icon name="warning" size={14}/>{item.reason}</span>
            </div>
          </div>
          <button className="button button-secondary mac-open" onClick={()=>go(item.view)}>Otvoriť zdroj <Icon name="chevron" size={15}/></button>
        </article>
      })}
    </section>

    <section className="mac-method">
      <Icon name="check" size={18}/>
      <div><strong>Bez duplicitnej evidencie</strong><p>Action Center nič neprepisuje a nevytvára samostatný stav opatrení. Prioritu odvodzuje z existujúcich polí, termínov a stavov; zmenu vykonáš v pôvodnom module, kde ostáva aj auditná stopa.</p></div>
    </section>
  </div>
}
