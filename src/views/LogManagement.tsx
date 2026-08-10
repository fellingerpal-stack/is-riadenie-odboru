import { useEffect, useMemo, useState } from 'react'
import { Badge, Icon, Modal, PageHeader } from '../components/UI'
import {
  auditActionLabel,
  auditCategoryLabel,
  auditModuleLabel,
  loadAuditFeed,
  type AuditCategory,
  type AuditLogEntry,
} from '../lib/auditCloud'
import './LogManagement.css'

type PeriodFilter = '24h' | '7d' | '30d' | '90d' | 'all' | 'custom'
type StatusFilter = 'all' | 'success' | 'warning' | 'error'

function timeValue(value: string): number {
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDateTime(value: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('sk-SK', { dateStyle: 'short', timeStyle: 'medium' })
}

function csvCell(value: unknown): string {
  const text = typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value)
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCsv(entries: AuditLogEntry[]) {
  const header = ['čas', 'používateľ', 'e-mail', 'kategória', 'modul', 'akcia', 'objekt', 'súhrn', 'stav', 'zdroj', 'snapshot', 'IP']
  const rows = entries.map((entry) => [
    entry.createdAt,
    entry.actorName,
    entry.actorEmail,
    auditCategoryLabel(entry.category),
    auditModuleLabel(entry.module),
    auditActionLabel(entry.action),
    entry.entityLabel || entry.entityId,
    entry.summary,
    entry.status,
    entry.source,
    entry.snapshotVersion ?? '',
    entry.requestIp,
  ])
  const csv = '\ufeff' + [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `cvti_log_management_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function categoryTone(category: AuditCategory): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple' {
  if (category === 'security') return 'warning'
  if (category === 'user_admin') return 'purple'
  if (category === 'data_change') return 'info'
  if (category === 'integration') return 'success'
  return 'neutral'
}

function statusTone(status: AuditLogEntry['status']): 'success' | 'warning' | 'danger' {
  return status === 'error' ? 'danger' : status === 'warning' ? 'warning' : 'success'
}

function periodStart(period: PeriodFilter): number {
  const now = Date.now()
  if (period === '24h') return now - 24 * 60 * 60 * 1000
  if (period === '7d') return now - 7 * 24 * 60 * 60 * 1000
  if (period === '30d') return now - 30 * 24 * 60 * 60 * 1000
  if (period === '90d') return now - 90 * 24 * 60 * 60 * 1000
  return 0
}

function stringDetails(entry: AuditLogEntry): string {
  try {
    return JSON.stringify(entry.details ?? {}, null, 2)
  } catch {
    return '{}'
  }
}

function DetailModal({ entry, onClose }: { entry: AuditLogEntry; onClose: () => void }) {
  const changedModules = Array.isArray(entry.details?.changed_modules) ? entry.details.changed_modules.map(String) : []
  const delta = entry.details?.delta && typeof entry.details.delta === 'object' ? entry.details.delta as Record<string, unknown> : null
  return <Modal title="Detail auditnej udalosti" onClose={onClose} wide>
    <div className="log-detail-hero">
      <div className={`log-detail-icon log-status-${entry.status}`}><Icon name={entry.category === 'security' ? 'lock' : entry.category === 'user_admin' ? 'user' : 'shield'} size={24}/></div>
      <div><div className="log-detail-badges"><Badge tone={categoryTone(entry.category)}>{auditCategoryLabel(entry.category)}</Badge><Badge tone={statusTone(entry.status)}>{entry.status === 'success' ? 'úspech' : entry.status === 'warning' ? 'upozornenie' : 'chyba'}</Badge>{entry.snapshotVersion && <Badge tone="neutral">snapshot v{entry.snapshotVersion}</Badge>}</div><h3>{entry.summary || auditActionLabel(entry.action)}</h3><p>{auditActionLabel(entry.action)} · {auditModuleLabel(entry.module)}</p></div>
    </div>
    <div className="log-detail-grid">
      <article><span>Kto</span><strong>{entry.actorName || 'Systém'}</strong><small>{entry.actorEmail || entry.actorId || 'bez používateľského účtu'}</small></article>
      <article><span>Kedy</span><strong>{formatDateTime(entry.createdAt)}</strong><small>{entry.requestIp ? `IP ${entry.requestIp}` : 'IP nie je dostupná'}</small></article>
      <article><span>Modul</span><strong>{auditModuleLabel(entry.module)}</strong><small>{entry.scope || 'scope neurčený'}</small></article>
      <article><span>Objekt</span><strong>{entry.entityLabel || entry.entityId || '—'}</strong><small>{entry.entityType || 'záznam'}</small></article>
      <article><span>Zdroj</span><strong>{entry.source || 'application'}</strong><small>{entry.id}</small></article>
      <article><span>User agent</span><strong>{entry.userAgent ? 'zaznamenaný' : '—'}</strong><small>{entry.userAgent || 'bez údajov'}</small></article>
    </div>
    {changedModules.length > 0 && <section className="log-changed-modules"><header><span className="section-kicker">Rozsah zmeny</span><h3>Zmenené moduly</h3></header><div>{changedModules.map((module) => <Badge key={module} tone="info">{auditModuleLabel(module)}</Badge>)}</div></section>}
    {delta && <section className="log-delta-section"><header><span className="section-kicker">Delta</span><h3>Čo sa zmenilo</h3></header><div className="log-delta-grid">{Object.entries(delta).map(([module, value]) => {
      const record = value && typeof value === 'object' ? value as Record<string, unknown> : {}
      return <article key={module}><strong>{auditModuleLabel(module)}</strong><div className="log-delta-counts"><span>+ {String(record.added_count ?? 0)}</span><span>~ {String(record.updated_count ?? 0)}</span><span>− {String(record.removed_count ?? 0)}</span></div>{Array.isArray(record.updated) && record.updated.length > 0 && <small>Upravené: {record.updated.map(String).slice(0, 8).join(', ')}</small>}{Array.isArray(record.added) && record.added.length > 0 && <small>Pridané: {record.added.map(String).slice(0, 8).join(', ')}</small>}{Array.isArray(record.removed) && record.removed.length > 0 && <small>Odstránené: {record.removed.map(String).slice(0, 8).join(', ')}</small>}</article>
    })}</div></section>}
    <section className="log-json-section"><header><span className="section-kicker">Technický detail</span><h3>Audit payload</h3></header><pre>{stringDetails(entry)}</pre></section>
    <div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Zavrieť</button></div>
  </Modal>
}

export default function LogManagement({ configured }: { configured: boolean }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [available, setAvailable] = useState(configured)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState<PeriodFilter>('30d')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [actor, setActor] = useState('all')
  const [module, setModule] = useState('all')
  const [category, setCategory] = useState<'all' | AuditCategory>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<AuditLogEntry | null>(null)

  async function reload() {
    setLoading(true)
    setError('')
    try {
      const result = await loadAuditFeed(1200)
      setEntries(result.entries)
      setAvailable(result.available)
      setError(result.error)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Auditné logy sa nepodarilo načítať.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  const actors = useMemo(() => [...new Set(entries.map((entry) => entry.actorName || 'Systém'))].sort((a, b) => a.localeCompare(b, 'sk')), [entries])
  const modules = useMemo(() => [...new Set(entries.map((entry) => entry.module).filter(Boolean))].sort((a, b) => auditModuleLabel(a).localeCompare(auditModuleLabel(b), 'sk')), [entries])

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('sk')
    const fixedStart = periodStart(period)
    const customStart = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : 0
    const customEnd = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : Number.MAX_SAFE_INTEGER
    return entries.filter((entry) => {
      const time = timeValue(entry.createdAt)
      if (period !== 'all' && period !== 'custom' && time < fixedStart) return false
      if (period === 'custom' && (time < customStart || time > customEnd)) return false
      if (actor !== 'all' && (entry.actorName || 'Systém') !== actor) return false
      if (module !== 'all' && entry.module !== module) return false
      if (category !== 'all' && entry.category !== category) return false
      if (status !== 'all' && entry.status !== status) return false
      if (!needle) return true
      const haystack = [entry.actorName, entry.actorEmail, entry.action, entry.module, auditModuleLabel(entry.module), entry.entityId, entry.entityLabel, entry.summary, entry.source, entry.requestIp, JSON.stringify(entry.details)].join(' ').toLocaleLowerCase('sk')
      return haystack.includes(needle)
    })
  }, [entries, period, fromDate, toDate, actor, module, category, status, query])

  const now = Date.now()
  const last24 = entries.filter((entry) => timeValue(entry.createdAt) >= now - 24 * 60 * 60 * 1000)
  const last30 = entries.filter((entry) => timeValue(entry.createdAt) >= now - 30 * 24 * 60 * 60 * 1000)
  const activeActors = new Set(last30.map((entry) => entry.actorName || 'Systém')).size
  const dataChanges = last30.filter((entry) => entry.category === 'data_change').length
  const securityEvents = last30.filter((entry) => entry.category === 'security' || entry.category === 'user_admin').length
  const destructive = last30.filter((entry) => entry.action.includes('delete') || entry.action.includes('cancel') || entry.summary.toLocaleLowerCase('sk').includes('zruš')).length

  const dayBuckets = useMemo(() => {
    const buckets: { label: string; count: number }[] = []
    for (let offset = 13; offset >= 0; offset -= 1) {
      const day = new Date()
      day.setHours(0, 0, 0, 0)
      day.setDate(day.getDate() - offset)
      const next = day.getTime() + 24 * 60 * 60 * 1000
      buckets.push({
        label: day.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit' }),
        count: entries.filter((entry) => { const time = timeValue(entry.createdAt); return time >= day.getTime() && time < next }).length,
      })
    }
    return buckets
  }, [entries])
  const maxDay = Math.max(1, ...dayBuckets.map((item) => item.count))

  return <div className="log-management-page">
    <PageHeader eyebrow="Správa · Audit" title="Log management" description="Nemenná história administrátorských a dátových zmien: kto, kedy, v ktorom module a čo zmenil. Audit spája snapshot verzie, samostatné databázové registre a správu používateľov." actions={<><button className="button button-secondary" disabled={!filtered.length} onClick={() => downloadCsv(filtered)}><Icon name="download" size={17}/> CSV export</button><button className="button button-primary" disabled={loading} onClick={() => void reload()}><Icon name="refresh" size={17}/> Obnoviť</button></>}/>

    {!configured && <div className="inline-alert inline-alert-warning"><Icon name="warning" size={18}/><span><strong>Lokálny režim.</strong> Centrálne auditné logy sú dostupné iba pri Supabase režime.</span></div>}
    {configured && !available && <div className="log-install-banner"><Icon name="database" size={23}/><div><strong>Auditná databázová vrstva ešte nie je aktívna.</strong><span>V Supabase SQL Editore spustite <code>IS_Riadenie_odboru_v0.34.0_LOG_MANAGEMENT.sql</code>. Existujúce snapshoty sa pri migrácii automaticky doplnia do historického auditu.</span></div></div>}
    {error && available && <div className="inline-alert inline-alert-error"><Icon name="warning" size={18}/><span>{error}</span></div>}

    <div className="log-kpi-grid">
      <article><span>Udalosti 24 h</span><strong>{last24.length}</strong><small>všetky auditné udalosti</small></article>
      <article><span>Zmeny dát 30 dní</span><strong>{dataChanges}</strong><small>snapshoty a databázové registre</small></article>
      <article><span>Aktívni používatelia</span><strong>{activeActors}</strong><small>aktéri v audite za 30 dní</small></article>
      <article><span>IAM / bezpečnosť</span><strong>{securityEvents}</strong><small>účty, prihlásenie, heslá</small></article>
      <article className={destructive ? 'is-warning' : ''}><span>Deštruktívne zmeny</span><strong>{destructive}</strong><small>odstránenia alebo zrušenia</small></article>
    </div>

    <section className="panel log-activity-panel">
      <div className="panel-heading"><div><span className="eyebrow">14 dní</span><h3>Aktivita zmien</h3></div><Badge tone="neutral">{entries.length} načítaných</Badge></div>
      <div className="log-activity-bars">{dayBuckets.map((item) => <div key={item.label} title={`${item.label}: ${item.count}`}><span><i style={{ height: `${Math.max(5, Math.round(item.count / maxDay * 100))}%` }}/></span><small>{item.label}</small><strong>{item.count}</strong></div>)}</div>
    </section>

    <section className="panel log-filter-panel">
      <div className="log-filter-grid">
        <label><span>Obdobie</span><select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)}><option value="24h">Posledných 24 hodín</option><option value="7d">7 dní</option><option value="30d">30 dní</option><option value="90d">90 dní</option><option value="all">Celá história</option><option value="custom">Vlastný interval</option></select></label>
        {period === 'custom' && <><label><span>Od</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)}/></label><label><span>Do</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)}/></label></>}
        <label><span>Používateľ</span><select value={actor} onChange={(event) => setActor(event.target.value)}><option value="all">Všetci</option>{actors.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>Modul</span><select value={module} onChange={(event) => setModule(event.target.value)}><option value="all">Všetky moduly</option>{modules.map((item) => <option key={item} value={item}>{auditModuleLabel(item)}</option>)}</select></label>
        <label><span>Kategória</span><select value={category} onChange={(event) => setCategory(event.target.value as 'all' | AuditCategory)}><option value="all">Všetky kategórie</option><option value="data_change">Zmena dát</option><option value="user_admin">Správa používateľov</option><option value="security">Bezpečnosť</option><option value="system">Systém</option><option value="integration">Integrácia</option></select></label>
        <label><span>Stav</span><select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}><option value="all">Všetky stavy</option><option value="success">Úspech</option><option value="warning">Upozornenie</option><option value="error">Chyba</option></select></label>
        <label className="log-search-field"><span>Hľadať</span><div><Icon name="search" size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="meno, modul, objekt, text zmeny…"/></div></label>
      </div>
      <div className="log-filter-footer"><span>{filtered.length} z {entries.length} udalostí</span><button className="text-button" onClick={() => { setPeriod('30d'); setFromDate(''); setToDate(''); setActor('all'); setModule('all'); setCategory('all'); setStatus('all'); setQuery('') }}>Vyčistiť filtre</button></div>
    </section>

    <section className="panel log-table-panel">
      <div className="panel-heading"><div><span className="eyebrow">Audit trail</span><h3>Kto · kedy · čo</h3></div><Badge tone="info">{filtered.length}</Badge></div>
      {loading ? <div className="loading-block">Načítavam auditnú históriu…</div> : filtered.length ? <div className="table-scroll log-table-scroll" role="region" aria-label="Auditná história" tabIndex={0}><table className="data-table log-table"><thead><tr><th>Čas</th><th>Používateľ</th><th>Modul</th><th>Akcia</th><th>Zmena / objekt</th><th>Stav</th><th></th></tr></thead><tbody>{filtered.map((entry) => <tr key={entry.id} onClick={() => setSelected(entry)}><td><strong>{formatDateTime(entry.createdAt)}</strong>{entry.snapshotVersion && <small>snapshot v{entry.snapshotVersion}</small>}</td><td><div className="log-actor-cell"><div className="avatar avatar-small">{(entry.actorName || 'S').split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}</div><span><strong>{entry.actorName || 'Systém'}</strong><small>{entry.actorEmail || entry.requestIp || entry.source}</small></span></div></td><td><strong>{auditModuleLabel(entry.module)}</strong><small>{entry.scope || auditCategoryLabel(entry.category)}</small></td><td><Badge tone={categoryTone(entry.category)}>{auditActionLabel(entry.action)}</Badge><small>{auditCategoryLabel(entry.category)}</small></td><td><strong>{entry.entityLabel || entry.summary || '—'}</strong><small>{entry.entityLabel ? entry.summary : entry.entityId}</small></td><td><Badge tone={statusTone(entry.status)}>{entry.status === 'success' ? 'OK' : entry.status === 'warning' ? 'WARN' : 'ERROR'}</Badge></td><td><button className="icon-button" title="Detail" onClick={(event) => { event.stopPropagation(); setSelected(entry) }}><Icon name="eye" size={17}/></button></td></tr>)}</tbody></table></div> : <div className="empty"><div className="empty-icon"><Icon name="shield" size={26}/></div><strong>Pre zvolený filter nie sú udalosti</strong><p>Zmeňte obdobie alebo filtre. Ak je release práve nasadený, nové udalosti vzniknú pri ďalšej zmene dát.</p></div>}
    </section>

    {selected && <DetailModal entry={selected} onClose={() => setSelected(null)}/>} 
  </div>
}
