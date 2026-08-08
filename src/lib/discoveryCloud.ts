import type { AccessScope, DiscoveryCollector, DiscoveryCollectorSecret, DiscoveryDevice, DiscoveryRun } from '../types'
import { supabase } from './supabase'

function asText(value: unknown): string { return typeof value === 'string' ? value : value == null ? '' : String(value) }
function asStringArray(value: unknown): string[] { return Array.isArray(value) ? value.map(asText).filter(Boolean) : [] }
function asNumberArray(value: unknown): number[] { return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [] }
function asObject(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }

function normalizeCollector(row: Record<string, unknown>): DiscoveryCollector {
  return {
    id: asText(row.id),
    name: asText(row.name),
    scope: row.scope === 'oit' || row.scope === 'oris' ? row.scope : 'shared',
    location: asText(row.location),
    enabled: Boolean(row.enabled),
    lastSeenAt: asText(row.last_seen_at),
    createdAt: asText(row.created_at),
    updatedAt: asText(row.updated_at),
  }
}

function normalizeDevice(row: Record<string, unknown>): DiscoveryDevice {
  return {
    id: asText(row.id),
    scope: row.scope === 'oit' || row.scope === 'oris' ? row.scope : 'shared',
    fingerprint: asText(row.fingerprint),
    ipAddress: asText(row.ip_address),
    macAddress: asText(row.mac_address),
    hostname: asText(row.hostname),
    deviceType: asText(row.device_type) || 'Neznáme zariadenie',
    manufacturer: asText(row.manufacturer),
    model: asText(row.model),
    serialNumber: asText(row.serial_number),
    firmware: asText(row.firmware),
    firstSeenAt: asText(row.first_seen_at),
    lastSeenAt: asText(row.last_seen_at),
    seenCount: Number(row.seen_count ?? 0) || 0,
    lastCollectorId: asText(row.last_collector_id),
    lastRunId: asText(row.last_run_id),
    changedFields: asStringArray(row.changed_fields),
    lastChangedAt: asText(row.last_changed_at),
    openPorts: asNumberArray(row.open_ports),
    snmp: asObject(row.snmp),
    details: asObject(row.details),
    matchedCmdbId: asText(row.matched_cmdb_id),
    ignored: Boolean(row.ignored),
    createdAt: asText(row.created_at),
    updatedAt: asText(row.updated_at),
  }
}

function normalizeRun(row: Record<string, unknown>): DiscoveryRun {
  return {
    id: asText(row.id),
    collectorId: asText(row.collector_id),
    startedAt: asText(row.started_at),
    completedAt: asText(row.completed_at),
    status: asText(row.status),
    cidrs: asStringArray(row.cidrs),
    hostsScanned: Number(row.hosts_scanned ?? 0) || 0,
    hostsFound: Number(row.hosts_found ?? 0) || 0,
    acceptedDevices: Number(row.accepted_devices ?? 0) || 0,
    error: asText(row.error),
    createdAt: asText(row.created_at),
  }
}

export async function listDiscoveryCollectors(): Promise<DiscoveryCollector[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('discovery_collectors').select('id,name,scope,location,enabled,last_seen_at,created_at,updated_at').order('name')
  if (error) throw error
  return (data ?? []).map(row => normalizeCollector(row as Record<string, unknown>))
}

export async function listDiscoveryDevices(limit = 3000): Promise<DiscoveryDevice[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('discovery_devices').select('*').order('last_seen_at', { ascending: false }).limit(limit)
  if (error) throw error
  return (data ?? []).map(row => normalizeDevice(row as Record<string, unknown>))
}

export async function listDiscoveryRuns(limit = 100): Promise<DiscoveryRun[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('discovery_runs').select('*').order('started_at', { ascending: false }).limit(limit)
  if (error) throw error
  return (data ?? []).map(row => normalizeRun(row as Record<string, unknown>))
}

export async function createDiscoveryCollector(name: string, scope: AccessScope, location: string): Promise<DiscoveryCollectorSecret> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
  const { data, error } = await supabase.rpc('create_discovery_collector', { p_name: name, p_scope: scope, p_location: location })
  if (error) throw error
  const record = asObject(data)
  const collector = normalizeCollector(asObject(record.collector))
  const token = asText(record.token)
  if (!collector.id || !token) throw new Error('Databáza nevrátila collector ID alebo token.')
  return { collector, token }
}

export async function rotateDiscoveryCollectorToken(collectorId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
  const { data, error } = await supabase.rpc('rotate_discovery_collector_token', { p_collector_id: collectorId })
  if (error) throw error
  const token = asText(asObject(data).token)
  if (!token) throw new Error('Databáza nevrátila nový token.')
  return token
}

export async function setDiscoveryCollectorEnabled(collectorId: string, enabled: boolean): Promise<void> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
  const { error } = await supabase.rpc('set_discovery_collector_enabled', { p_collector_id: collectorId, p_enabled: enabled })
  if (error) throw error
}

export async function setDiscoveryDeviceState(deviceId: string, matchedCmdbId: string | null, ignored: boolean): Promise<void> {
  if (!supabase) throw new Error('Supabase nie je nakonfigurovaný.')
  const { error } = await supabase.rpc('set_discovery_device_state', { p_device_id: deviceId, p_matched_cmdb_id: matchedCmdbId, p_ignored: ignored })
  if (error) throw error
}
