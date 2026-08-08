import { useEffect, useMemo, useState } from 'react'
import type { AccessScope, AppRole, CmdbItem, DiscoveryCollector, DiscoveryCollectorSecret, DiscoveryDevice, DiscoveryRun } from '../types'
import { Badge, Field, Icon, Modal } from '../components/UI'
import { blankAsset, inferAssetClass } from '../lib/assetImport'
import { createDiscoveryCollector, listDiscoveryCollectors, listDiscoveryDevices, listDiscoveryRuns, rotateDiscoveryCollectorToken, setDiscoveryCollectorEnabled, setDiscoveryDeviceState } from '../lib/discoveryCloud'
import { supabaseConfiguration, supabaseConfigured } from '../lib/supabase'
import './AssetDiscovery.css'

type DiscoveryView = 'devices' | 'print' | 'collectors' | 'runs'
type DiscoveryStatus = 'Všetky' | 'Nové' | 'Zmenené' | 'Spárované' | 'Nevidené' | 'Ignorované' | 'Objavené'

type Match = { asset: CmdbItem; confidence: number; reason: string } | null
const scopeLabels: Record<AccessScope, string> = { oit: '3.1 OIT', oris: '3.2 ORIS', shared: 'Spoločné' }

function norm(value: string) { return value.trim().toLowerCase().replace(/[\s:_-]+/g, '') }
function parseTime(value: string) { const n = Date.parse(value); return Number.isFinite(n) ? n : 0 }
function daysSince(value: string) { const t = parseTime(value); return t ? Math.floor((Date.now() - t) / 86_400_000) : 99999 }
function formatDate(value: string) { return value ? new Date(value).toLocaleString('sk-SK') : '—' }
function text(value: unknown) { return typeof value === 'string' ? value : value == null ? '' : String(value) }
function numberValue(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : 0 }

function deviceStatus(device: DiscoveryDevice): DiscoveryStatus {
  if (device.ignored) return 'Ignorované'
  if (daysSince(device.lastSeenAt) > 30) return 'Nevidené'
  if (device.changedFields.length) return 'Zmenené'
  if (device.matchedCmdbId) return 'Spárované'
  if (daysSince(device.firstSeenAt) <= 7) return 'Nové'
  return 'Objavené'
}

function statusTone(status: DiscoveryStatus): 'neutral'|'success'|'warning'|'danger'|'info'|'purple' {
  if (status === 'Spárované') return 'success'
  if (status === 'Nové') return 'info'
  if (status === 'Zmenené') return 'warning'
  if (status === 'Nevidené') return 'danger'
  if (status === 'Ignorované') return 'neutral'
  return 'purple'
}

function findBestMatch(device: DiscoveryDevice, items: CmdbItem[]): Match {
  let best: Match = null
  const serial = norm(device.serialNumber)
  const mac = norm(device.macAddress)
  const host = norm(device.hostname)
  const ip = device.ipAddress.trim()
  const model = norm(`${device.manufacturer}${device.model}`)

  for (const asset of items) {
    let confidence = 0
    let reason = ''
    if (serial && norm(asset.serialNumber) === serial) { confidence = 100; reason = 'rovnaké sériové číslo' }
    else if (mac && norm(asset.macAddress) === mac) { confidence = 100; reason = 'rovnaká MAC adresa' }
    else if (host && norm(asset.hostname) === host) { confidence = 94; reason = 'rovnaký hostname' }
    else if (ip && asset.ipAddress.trim() === ip) { confidence = 82; reason = 'rovnaká IP adresa' }
    else if (model && norm(`${asset.manufacturer}${asset.model}`) === model && model.length >= 5) { confidence = 64; reason = 'rovnaký výrobca a model' }
    if (confidence && (!best || confidence > best.confidence)) best = { asset, confidence, reason }
  }
  return best
}

function mapDeviceType(device: DiscoveryDevice) {
  const value = device.deviceType.toLowerCase()
  if (value.includes('mfp') || value.includes('multifunk')) return 'MFP'
  if (value.includes('printer') || value.includes('tlač')) return 'Tlačiareň'
  if (value.includes('notebook') || value.includes('laptop')) return 'Notebook'
  if (value.includes('workstation') || value.includes('windows endpoint') || value.includes('pc')) return 'Pracovná stanica'
  if (value.includes('server')) return 'Fyzický server'
  if (value.includes('switch')) return 'Switch'
  if (value.includes('router')) return 'Router'
  if (value.includes('firewall')) return 'Firewall'
  if (value.includes('wi-fi') || value.includes('access point')) return 'Wi-Fi AP'
  if (value.includes('ups')) return 'UPS'
  if (value.includes('storage')) return 'Storage'
  return 'Sieťový prvok'
}

function withDiscoveryHistory(asset: CmdbItem, actor: string, action: string, detail: string): CmdbItem {
  const now = new Date().toISOString()
  return {
    ...asset,
    updatedAt: now,
    updatedBy: actor,
    history: [...(asset.history ?? []), { id: crypto.randomUUID(), action, actor, detail, createdAt: now }],
  }
}

function mergeDeviceIntoAsset(asset: CmdbItem, device: DiscoveryDevice, collectorName: string, actor: string): CmdbItem {
  const next = {
    ...asset,
    manufacturer: asset.manufacturer || device.manufacturer,
    model: asset.model || device.model,
    serialNumber: asset.serialNumber || device.serialNumber,
    hostname: device.hostname || asset.hostname,
    ipAddress: device.ipAddress || asset.ipAddress,
    macAddress: device.macAddress || asset.macAddress,
    discoveryDeviceId: device.id,
    discoveryFirstSeenAt: device.firstSeenAt || asset.discoveryFirstSeenAt,
    discoveryLastSeenAt: device.lastSeenAt || asset.discoveryLastSeenAt,
    discoveryCollector: collectorName || asset.discoveryCollector,
    inventoryStatus: 'Nájdené',
    lastInventoryDate: new Date().toISOString().slice(0, 10),
    source: asset.source ? `${asset.source} · Network Discovery` : 'Network Discovery',
  }
  return withDiscoveryHistory(next, actor, 'Network Discovery', `Sieťová identita potvrdená z discovery: ${device.ipAddress || 'bez IP'}${device.macAddress ? ` · ${device.macAddress}` : ''}.`)
}

function makeAssetFromDevice(device: DiscoveryDevice, collectorName: string, actor: string): CmdbItem {
  const type = mapDeviceType(device)
  const asset = blankAsset(`AST-DISC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`)
  asset.name = device.hostname || [device.manufacturer, device.model].filter(Boolean).join(' ') || `${type} ${device.ipAddress}`
  asset.type = type
  asset.assetClass = inferAssetClass(type)
  asset.scope = device.scope
  asset.manufacturer = device.manufacturer
  asset.model = device.model
  asset.serialNumber = device.serialNumber
  asset.hostname = device.hostname
  asset.ipAddress = device.ipAddress
  asset.macAddress = device.macAddress
  asset.discoveryDeviceId = device.id
  asset.discoveryFirstSeenAt = device.firstSeenAt
  asset.discoveryLastSeenAt = device.lastSeenAt
  asset.discoveryCollector = collectorName
  asset.inventoryStatus = 'Nájdené'
  asset.lastInventoryDate = new Date().toISOString().slice(0, 10)
  asset.source = `Network Discovery${collectorName ? ` · ${collectorName}` : ''}`
  asset.updatedBy = actor
  return withDiscoveryHistory(asset, actor, 'Network Discovery', `Aktívum vytvorené z objaveného zariadenia ${device.ipAddress || device.hostname}.`)
}

function downloadText(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.href = url; link.download = fileName; link.click(); URL.revokeObjectURL(url)
}

export default function AssetDiscovery({
  items,
  role,
  currentUser,
  canWriteOit,
  canWriteOris,
  canWriteShared,
  onItemsChange,
  onOpenAsset,
}: {
  items: CmdbItem[]
  role: AppRole
  currentUser: string
  canWriteOit: boolean
  canWriteOris: boolean
  canWriteShared: boolean
  onItemsChange: (items: CmdbItem[]) => void
  onOpenAsset: (asset: CmdbItem) => void
}) {
  const [view, setView] = useState<DiscoveryView>('devices')
  const [devices, setDevices] = useState<DiscoveryDevice[]>([])
  const [collectors, setCollectors] = useState<DiscoveryCollector[]>([])
  const [runs, setRuns] = useState<DiscoveryRun[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<DiscoveryStatus>('Všetky')
  const [scope, setScope] = useState<'Všetky'|AccessScope>('Všetky')
  const [createOpen, setCreateOpen] = useState(false)
  const [collectorDraft, setCollectorDraft] = useState({ name: '', scope: 'shared' as AccessScope, location: '' })
  const [secret, setSecret] = useState<DiscoveryCollectorSecret | null>(null)
  const [busyId, setBusyId] = useState('')

  const canWriteScope = (assetScope: AccessScope) => role === 'admin' || (['manager','resolver'].includes(role) && (assetScope === 'oit' ? canWriteOit : assetScope === 'oris' ? canWriteOris : canWriteShared))
  const collectorMap = useMemo(() => new Map(collectors.map(item => [item.id, item.name])), [collectors])

  const refresh = async () => {
    if (!supabaseConfigured) return
    setLoading(true); setError('')
    try {
      const [nextDevices, nextCollectors, nextRuns] = await Promise.all([listDiscoveryDevices(), listDiscoveryCollectors(), listDiscoveryRuns()])
      setDevices(nextDevices); setCollectors(nextCollectors); setRuns(nextRuns)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Discovery dáta sa nepodarilo načítať.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [])

  const matches = useMemo(() => new Map(devices.map(device => [device.id, findBestMatch(device, items)])), [devices, items])
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return devices.filter(device => {
      const currentStatus = deviceStatus(device)
      const haystack = `${device.ipAddress} ${device.macAddress} ${device.hostname} ${device.deviceType} ${device.manufacturer} ${device.model} ${device.serialNumber} ${device.firmware}`.toLowerCase()
      return (!needle || haystack.includes(needle)) && (status === 'Všetky' || currentStatus === status) && (scope === 'Všetky' || device.scope === scope)
    })
  }, [devices, search, status, scope])

  const printDevices = useMemo(() => filtered.filter(device => {
    const type = device.deviceType.toLowerCase()
    return type.includes('printer') || type.includes('tlač') || type.includes('mfp') || Boolean(device.details.printer)
  }), [filtered])

  const counts = useMemo(() => ({
    all: devices.filter(device => !device.ignored).length,
    new: devices.filter(device => deviceStatus(device) === 'Nové').length,
    changed: devices.filter(device => deviceStatus(device) === 'Zmenené').length,
    linked: devices.filter(device => deviceStatus(device) === 'Spárované').length,
    stale: devices.filter(device => deviceStatus(device) === 'Nevidené').length,
    print: devices.filter(device => { const t=device.deviceType.toLowerCase(); return t.includes('printer')||t.includes('tlač')||t.includes('mfp')||Boolean(device.details.printer) }).length,
  }), [devices])

  const createCollector = async () => {
    if (!collectorDraft.name.trim()) return
    setError(''); setBusyId('create')
    try {
      const created = await createDiscoveryCollector(collectorDraft.name.trim(), collectorDraft.scope, collectorDraft.location.trim())
      setSecret(created); setCreateOpen(false); setCollectorDraft({ name: '', scope: 'shared', location: '' }); await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Collector sa nepodarilo vytvoriť.') }
    finally { setBusyId('') }
  }

  const rotate = async (collector: DiscoveryCollector) => {
    if (!window.confirm(`Vygenerovať nový token pre ${collector.name}? Starý token okamžite prestane fungovať.`)) return
    setBusyId(collector.id); setError('')
    try { const token = await rotateDiscoveryCollectorToken(collector.id); setSecret({ collector, token }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Token sa nepodarilo otočiť.') }
    finally { setBusyId('') }
  }

  const toggleCollector = async (collector: DiscoveryCollector) => {
    setBusyId(collector.id); setError('')
    try { await setDiscoveryCollectorEnabled(collector.id, !collector.enabled); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Stav collectora sa nepodarilo zmeniť.') }
    finally { setBusyId('') }
  }

  const linkToAsset = async (device: DiscoveryDevice, asset: CmdbItem) => {
    if (!canWriteScope(asset.scope)) return
    setBusyId(device.id); setError(''); setMessage('')
    try {
      const collectorName = collectorMap.get(device.lastCollectorId) || ''
      const merged = mergeDeviceIntoAsset(asset, device, collectorName, currentUser)
      onItemsChange(items.map(item => item.id === asset.id ? merged : item))
      await setDiscoveryDeviceState(device.id, asset.id, false)
      setMessage(`${device.ipAddress || device.hostname} je spárované s aktívom ${asset.name}.`)
      await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Zariadenie sa nepodarilo spárovať.') }
    finally { setBusyId('') }
  }

  const createAsset = async (device: DiscoveryDevice) => {
    if (!canWriteScope(device.scope)) return
    setBusyId(device.id); setError(''); setMessage('')
    try {
      const asset = makeAssetFromDevice(device, collectorMap.get(device.lastCollectorId) || '', currentUser)
      onItemsChange([asset, ...items])
      await setDiscoveryDeviceState(device.id, asset.id, false)
      setMessage(`Vytvorené aktívum ${asset.name}.`)
      await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Aktívum sa nepodarilo vytvoriť.') }
    finally { setBusyId('') }
  }

  const ignore = async (device: DiscoveryDevice) => {
    if (!canWriteScope(device.scope)) return
    setBusyId(device.id); setError('')
    try { await setDiscoveryDeviceState(device.id, null, !device.ignored); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Stav zariadenia sa nepodarilo zmeniť.') }
    finally { setBusyId('') }
  }

  const confirmExactMatches = async () => {
    const candidates = devices.map(device => ({ device, match: matches.get(device.id) ?? null })).filter(row => !row.device.ignored && !row.device.matchedCmdbId && row.match && row.match.confidence >= 94 && canWriteScope(row.match.asset.scope)) as {device:DiscoveryDevice;match:NonNullable<Match>}[]
    if (!candidates.length || !window.confirm(`Potvrdiť ${candidates.length} jednoznačných zhôd podľa S/N, MAC alebo hostname?`)) return
    let next = [...items]
    setBusyId('bulk'); setError('');
    try {
      for (const row of candidates) {
        const collectorName = collectorMap.get(row.device.lastCollectorId) || ''
        const assetIndex = next.findIndex(item => item.id === row.match.asset.id)
        if (assetIndex >= 0) next[assetIndex] = mergeDeviceIntoAsset(next[assetIndex], row.device, collectorName, currentUser)
        await setDiscoveryDeviceState(row.device.id, row.match.asset.id, false)
      }
      onItemsChange(next); setMessage(`Potvrdených ${candidates.length} discovery zhôd.`); await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Hromadné párovanie sa nepodarilo dokončiť.') }
    finally { setBusyId('') }
  }

  if (!supabaseConfigured) return <section className="panel discovery-empty"><Icon name="database" size={34}/><strong>Network Discovery vyžaduje Supabase režim</strong><p>Lokálny prototyp nemá centrálnu discovery databázu. Po pripojení Supabase sa tu zobrazia collectory, skeny a objavené zariadenia.</p></section>

  const tableDevices = view === 'print' ? printDevices : filtered
  const projectUrl = supabaseConfiguration.projectHost ? `https://${supabaseConfiguration.projectHost}` : 'https://YOUR-PROJECT.supabase.co'

  return <div className="discovery-page">
    <section className="discovery-hero">
      <div><span>NETWORK DISCOVERY · TOTAL ASSET INVENTORY</span><strong>{counts.all} aktívnych discovery zariadení</strong><p>Objavené zariadenia zostávajú v staging vrstve, kým ich nepotvrdíš alebo nespáruješ s Asset registrom. Discovery nikdy automaticky nevytvára oficiálne aktívum.</p></div>
      <div className="discovery-hero-actions"><button className="button button-secondary" disabled={loading} onClick={()=>void refresh()}><Icon name="refresh" size={16}/>{loading?'Načítavam…':'Obnoviť'}</button>{role==='admin'&&<button className="button button-primary" onClick={()=>setCreateOpen(true)}><Icon name="plus" size={16}/>Nový collector</button>}</div>
    </section>

    {error&&<div className="inline-alert inline-alert-error"><Icon name="warning" size={17}/><span>{error}</span></div>}
    {message&&<div className="inline-alert inline-alert-success"><Icon name="check" size={17}/><span>{message}</span></div>}

    <div className="discovery-kpis">
      <button onClick={()=>{setView('devices');setStatus('Nové')}}><span>Nové</span><strong>{counts.new}</strong><small>prvýkrát ≤ 7 dní</small></button>
      <button onClick={()=>{setView('devices');setStatus('Zmenené')}}><span>Zmenené</span><strong>{counts.changed}</strong><small>IP / hostname / model / firmware</small></button>
      <button onClick={()=>{setView('devices');setStatus('Spárované')}}><span>Spárované</span><strong>{counts.linked}</strong><small>väzba na Asset 360</small></button>
      <button onClick={()=>{setView('devices');setStatus('Nevidené')}}><span>Nevidené &gt;30 dní</span><strong>{counts.stale}</strong><small>overiť vyradenie alebo sieť</small></button>
      <button onClick={()=>{setView('print');setStatus('Všetky')}}><span>Print Fleet</span><strong>{counts.print}</strong><small>tlačiarne a MFP</small></button>
      <button onClick={()=>setView('collectors')}><span>Collectory</span><strong>{collectors.filter(c=>c.enabled).length}</strong><small>{collectors.length} nakonfigurovaných</small></button>
    </div>

    <div className="tabs discovery-tabs">
      <button className={view==='devices'?'active':''} onClick={()=>setView('devices')}>Objavené zariadenia</button>
      <button className={view==='print'?'active':''} onClick={()=>setView('print')}>Print Fleet</button>
      <button className={view==='collectors'?'active':''} onClick={()=>setView('collectors')}>Collectory</button>
      <button className={view==='runs'?'active':''} onClick={()=>setView('runs')}>História skenov</button>
    </div>

    {(view==='devices'||view==='print')&&<>
      <section className="discovery-toolbar panel"><label className="search-box"><Icon name="search" size={16}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="IP, MAC, hostname, model, S/N…"/></label><select value={scope} onChange={event=>setScope(event.target.value as 'Všetky'|AccessScope)}><option>Všetky</option><option value="oit">3.1 OIT</option><option value="oris">3.2 ORIS</option><option value="shared">Spoločné</option></select><select value={status} onChange={event=>setStatus(event.target.value as DiscoveryStatus)}><option>Všetky</option><option>Nové</option><option>Zmenené</option><option>Spárované</option><option>Nevidené</option><option>Ignorované</option><option>Objavené</option></select><button className="button button-secondary" onClick={()=>{setSearch('');setStatus('Všetky');setScope('Všetky')}}>Reset</button>{view==='devices'&&<button className="button button-primary" disabled={busyId==='bulk'} onClick={()=>void confirmExactMatches()}><Icon name="check" size={15}/>Potvrdiť jednoznačné zhody</button>}</section>
      <div className="table-shell discovery-table-shell"><table className="data-table discovery-table"><thead><tr><th>Zariadenie</th><th>Sieťová identita</th><th>Typ / scope</th><th>Discovery</th>{view==='print'&&<th>Print Fleet</th>}<th>Zhoda s registrom</th><th></th></tr></thead><tbody>{tableDevices.map(device=>{
        const currentStatus=deviceStatus(device); const match=matches.get(device.id)??null; const linked=items.find(item=>item.id===device.matchedCmdbId); const supplies=Array.isArray(device.details.supplies)?device.details.supplies as Record<string,unknown>[]:[]
        return <tr key={device.id} className={currentStatus==='Nevidené'?'discovery-stale':''}><td><div className="discovery-device"><span className="asset-ci-icon"><Icon name={view==='print'?'capacity':'cmdb'} size={17}/></span><span><strong>{device.hostname||device.model||device.ipAddress||'Neznáme zariadenie'}</strong><small>{[device.manufacturer,device.model,device.serialNumber&&`S/N ${device.serialNumber}`].filter(Boolean).join(' · ')||device.fingerprint.slice(0,12)}</small></span></div></td><td><strong>{device.ipAddress||'—'}</strong><small>{device.macAddress||'bez MAC'} · porty {device.openPorts.length?device.openPorts.join(', '):'—'}</small></td><td><strong>{device.deviceType}</strong><small>{scopeLabels[device.scope]}{device.firmware?` · FW ${device.firmware}`:''}</small></td><td><Badge tone={statusTone(currentStatus)}>{currentStatus}</Badge><small>first {formatDate(device.firstSeenAt)}<br/>last {formatDate(device.lastSeenAt)} · {device.seenCount}×</small>{device.changedFields.length>0&&<small className="discovery-changed">Δ {device.changedFields.join(', ')}</small>}</td>{view==='print'&&<td><strong>{numberValue(device.details.page_count)?`${numberValue(device.details.page_count).toLocaleString('sk-SK')} strán`:'bez počítadla'}</strong><div className="print-supplies">{supplies.slice(0,4).map((supply,index)=>{const pct=numberValue(supply.percent);return <span key={`${text(supply.name)}-${index}`} title={text(supply.name)}><i style={{width:`${Math.max(0,Math.min(100,pct))}%`}}/><b>{text(supply.name)||`Supply ${index+1}`} {pct?`${pct}%`:''}</b></span>})}</div></td>}<td>{linked?<button className="discovery-match linked" onClick={()=>onOpenAsset(linked)}><Icon name="check" size={14}/><span><strong>{linked.name}</strong><small>potvrdená väzba</small></span></button>:match?<div className="discovery-match"><span><strong>{match.asset.name}</strong><small>{match.confidence}% · {match.reason}</small></span>{canWriteScope(match.asset.scope)&&<button className="button button-secondary" disabled={busyId===device.id} onClick={()=>void linkToAsset(device,match.asset)}>Potvrdiť</button>}</div>:<span className="muted">bez kandidáta</span>}</td><td><div className="discovery-actions">{!linked&&!match&&canWriteScope(device.scope)&&<button className="button button-primary" disabled={busyId===device.id} onClick={()=>void createAsset(device)}>Vytvoriť asset</button>}{!linked&&canWriteScope(device.scope)&&<button className="button button-ghost" disabled={busyId===device.id} onClick={()=>void ignore(device)}>{device.ignored?'Obnoviť':'Ignorovať'}</button>}{linked&&<button className="icon-button" title="Otvoriť Asset 360" onClick={()=>onOpenAsset(linked)}><Icon name="eye" size={16}/></button>}</div></td></tr>
      })}</tbody></table></div><div className="asset-table-footer"><span>{tableDevices.length} zariadení v pohľade</span><span>Discovery staging ≠ oficiálna majetková evidencia.</span></div>
    </>}

    {view==='collectors'&&<section className="panel discovery-collectors"><div className="panel-heading"><div><span className="eyebrow">LOKÁLNE SENZORY</span><h3>CVTI Asset Collectory</h3></div>{role==='admin'&&<button className="button button-primary" onClick={()=>setCreateOpen(true)}><Icon name="plus" size={15}/>Nový collector</button>}</div><p className="discovery-note">Collector beží v internej sieti a komunikuje iba outbound HTTPS so Supabase. Každý collector má vlastný token a pevný scope 3.1 / 3.2 / Spoločné.</p><div className="collector-grid">{collectors.map(collector=><article key={collector.id}><div><Badge tone={collector.enabled?'success':'neutral'}>{collector.enabled?'Aktívny':'Vypnutý'}</Badge><strong>{collector.name}</strong><small>{scopeLabels[collector.scope]} · {collector.location||'bez lokality'}</small></div><dl><dt>Naposledy online</dt><dd>{formatDate(collector.lastSeenAt)}</dd><dt>Collector ID</dt><dd>{collector.id}</dd></dl>{role==='admin'&&<footer><button className="button button-secondary" disabled={busyId===collector.id} onClick={()=>void rotate(collector)}>Nový token</button><button className="button button-ghost" disabled={busyId===collector.id} onClick={()=>void toggleCollector(collector)}>{collector.enabled?'Vypnúť':'Zapnúť'}</button></footer>}</article>)}</div>{!collectors.length&&<p className="muted">Zatiaľ nie je vytvorený žiadny collector.</p>}</section>}

    {view==='runs'&&<section className="panel"><div className="panel-heading"><div><span className="eyebrow">AUDIT DISCOVERY</span><h3>História skenov</h3></div></div><div className="table-shell"><table className="data-table"><thead><tr><th>Čas</th><th>Collector</th><th>CIDR</th><th>Skenované</th><th>Nájdené</th><th>Prijaté</th><th>Stav</th></tr></thead><tbody>{runs.map(run=><tr key={run.id}><td><strong>{formatDate(run.startedAt)}</strong><small>{run.completedAt?`do ${formatDate(run.completedAt)}`:''}</small></td><td>{collectorMap.get(run.collectorId)||run.collectorId.slice(0,8)}</td><td>{run.cidrs.join(', ')||'—'}</td><td>{run.hostsScanned}</td><td>{run.hostsFound}</td><td>{run.acceptedDevices}</td><td><Badge tone={run.status==='completed'?'success':run.status==='error'?'danger':'warning'}>{run.status||'—'}</Badge>{run.error&&<small>{run.error}</small>}</td></tr>)}</tbody></table></div></section>}

    {createOpen&&<Modal title="Nový CVTI Asset Collector" onClose={()=>setCreateOpen(false)}><div className="form-grid"><Field label="Názov collectora"><input value={collectorDraft.name} onChange={e=>setCollectorDraft({...collectorDraft,name:e.target.value})} placeholder="BA-DC01 / Lamačská / Printer VLAN"/></Field><Field label="Scope"><select value={collectorDraft.scope} onChange={e=>setCollectorDraft({...collectorDraft,scope:e.target.value as AccessScope})}><option value="oit">3.1 OIT</option><option value="oris">3.2 ORIS</option><option value="shared">Spoločné</option></select></Field><Field label="Lokalita"><input value={collectorDraft.location} onChange={e=>setCollectorDraft({...collectorDraft,location:e.target.value})} placeholder="DC VaV / Lamačská cesta"/></Field></div><div className="modal-actions"><button className="button button-ghost" onClick={()=>setCreateOpen(false)}>Zrušiť</button><button className="button button-primary" disabled={!collectorDraft.name.trim()||busyId==='create'} onClick={()=>void createCollector()}>Vytvoriť collector</button></div></Modal>}

    {secret&&<Modal wide title="Collector token · zobrazí sa iba teraz" onClose={()=>setSecret(null)}><div className="collector-secret"><div className="inline-alert inline-alert-warning"><Icon name="warning" size={17}/><span>Token ulož do bezpečného secret store. Po zatvorení ho aplikácia už nevie zobraziť; vie iba vygenerovať nový.</span></div><Field label="Collector ID"><input readOnly value={secret.collector.id}/></Field><Field label="Collector token"><textarea readOnly rows={3} value={secret.token}/></Field><div className="collector-config"><strong>Minimálny config collectora</strong><pre>{JSON.stringify({supabase_url:projectUrl,supabase_anon_key_env:'CVTI_SUPABASE_ANON_KEY',collector_id:secret.collector.id,collector_token_env:'CVTI_DISCOVERY_TOKEN',cidrs:['10.0.0.0/24'],tcp_ports:[22,80,443,445,515,631,9100,3389],workers:48,timeout_ms:350,snmp:{enabled:false,community_env:'CVTI_SNMP_COMMUNITY'}},null,2)}</pre></div><div className="modal-actions"><button className="button button-secondary" onClick={()=>downloadText(`collector-${secret.collector.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.json`,JSON.stringify({supabase_url:projectUrl,supabase_anon_key_env:'CVTI_SUPABASE_ANON_KEY',collector_id:secret.collector.id,collector_token_env:'CVTI_DISCOVERY_TOKEN',cidrs:['10.0.0.0/24'],tcp_ports:[22,80,443,445,515,631,9100,3389],workers:48,timeout_ms:350,snmp:{enabled:false,community_env:'CVTI_SNMP_COMMUNITY'}},null,2))}><Icon name="download" size={15}/>Stiahnuť config</button><button className="button button-primary" onClick={()=>setSecret(null)}>Hotovo</button></div></div></Modal>}
  </div>
}
