import websiteSeed from '../data/websiteRegistry.seed.json'
import informationSystemSeed from '../data/informationSystems.seed.json'
import { supabase } from './supabase'

export type RegistrySyncState = 'local' | 'loading' | 'saving' | 'synced' | 'error'

export type WebsiteRecord = {
  sourceKey: string
  sourceId: string
  sourceRowWs02: string
  name: string
  url: string
  normalizedDomain: string
  comparisonStatus: string
  matchConfidence: string
  webyIsRows: string
  dnsAliases: string
  publicIp: string
  lbVip: string
  serverIp: string
  technicalSection: string
  technicalOwner: string
  technicalComment: string
  sectionComparison: string
  duplicateGroup: string
  duplicateType: string
  canonicalRecord: string
  recommendedAction: string
  reviewStatus: string
  decisionNote: string
  businessContact: string
  businessUnit: string
  meetingDate: string
  primaryPurpose: string
  targetAudience: string
  contentOwner: string
  updateFrequency: string
  hasOwnBrandManual: string
  brandManualAvailable: string
  platform: string
  activeRelevant: string
  overlappingSite: string
  euFundedOnline: string
  euFundedUntil: string
  developmentPlan: string
  contentTypes: string
  interactiveFunctions: string
  integrationDescription: string
  keyPages: string
  differentUserGroups: string
  largestProblem: string
  desiredChange: string
  successDefinition: string
  analystCategory: string
  analystReason: string
  priority: string
  analystNotes: string
  sourceFile: string
  sourceSheet: string
  sourceRow: number
}

export type InformationSystemRecord = {
  sourceKey: string
  name: string
  area: string
  operationStatus: string
  businessOwner: string
  businessContact: string
  technicalOwner: string
  endUsers: string
  purpose: string
  userCount: string
  criticality: string
  hosting: string
  slaStatus: string
  slaFrom: string
  slaTo: string
  annualSlaPayment: string
  contractValue: string
  supplier: string
  contractNumber: string
  contractEffectiveFrom: string
  contractValidTo: string
  crzLink: string
  adminAccessManager: string
  personalData: string
  notes: string
  reviewStatus: string
  sourceFile: string
  sourceSheet: string
  sourceRow: number
}

const WEBSITE_LOCAL_KEY = 'cvti-website-registry-v013'
const SYSTEM_LOCAL_KEY = 'cvti-information-systems-v013'

function text(value: unknown) { return typeof value === 'string' ? value : value == null ? '' : String(value) }
function numberValue(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0 }

export function normalizeWebsite(value: unknown): WebsiteRecord {
  const source = (value && typeof value === 'object' ? value : {}) as Partial<WebsiteRecord>
  return {
    sourceKey: text(source.sourceKey) || `WEB-${crypto.randomUUID().slice(0, 8)}`,
    sourceId: text(source.sourceId), sourceRowWs02: text(source.sourceRowWs02), name: text(source.name), url: text(source.url),
    normalizedDomain: text(source.normalizedDomain), comparisonStatus: text(source.comparisonStatus), matchConfidence: text(source.matchConfidence),
    webyIsRows: text(source.webyIsRows), dnsAliases: text(source.dnsAliases), publicIp: text(source.publicIp), lbVip: text(source.lbVip),
    serverIp: text(source.serverIp), technicalSection: text(source.technicalSection), technicalOwner: text(source.technicalOwner),
    technicalComment: text(source.technicalComment), sectionComparison: text(source.sectionComparison), duplicateGroup: text(source.duplicateGroup),
    duplicateType: text(source.duplicateType), canonicalRecord: text(source.canonicalRecord), recommendedAction: text(source.recommendedAction),
    reviewStatus: text(source.reviewStatus) || 'Čaká na kontrolu', decisionNote: text(source.decisionNote), businessContact: text(source.businessContact),
    businessUnit: text(source.businessUnit), meetingDate: text(source.meetingDate), primaryPurpose: text(source.primaryPurpose),
    targetAudience: text(source.targetAudience), contentOwner: text(source.contentOwner), updateFrequency: text(source.updateFrequency),
    hasOwnBrandManual: text(source.hasOwnBrandManual), brandManualAvailable: text(source.brandManualAvailable), platform: text(source.platform),
    activeRelevant: text(source.activeRelevant), overlappingSite: text(source.overlappingSite), euFundedOnline: text(source.euFundedOnline),
    euFundedUntil: text(source.euFundedUntil), developmentPlan: text(source.developmentPlan), contentTypes: text(source.contentTypes),
    interactiveFunctions: text(source.interactiveFunctions), integrationDescription: text(source.integrationDescription), keyPages: text(source.keyPages),
    differentUserGroups: text(source.differentUserGroups), largestProblem: text(source.largestProblem), desiredChange: text(source.desiredChange),
    successDefinition: text(source.successDefinition), analystCategory: text(source.analystCategory), analystReason: text(source.analystReason),
    priority: text(source.priority), analystNotes: text(source.analystNotes), sourceFile: text(source.sourceFile), sourceSheet: text(source.sourceSheet),
    sourceRow: numberValue(source.sourceRow),
  }
}

export function normalizeInformationSystem(value: unknown): InformationSystemRecord {
  const source = (value && typeof value === 'object' ? value : {}) as Partial<InformationSystemRecord>
  return {
    sourceKey: text(source.sourceKey) || `IS-${crypto.randomUUID().slice(0, 8)}`,
    name: text(source.name), area: text(source.area), operationStatus: text(source.operationStatus), businessOwner: text(source.businessOwner),
    businessContact: text(source.businessContact), technicalOwner: text(source.technicalOwner), endUsers: text(source.endUsers), purpose: text(source.purpose),
    userCount: text(source.userCount), criticality: text(source.criticality), hosting: text(source.hosting), slaStatus: text(source.slaStatus),
    slaFrom: text(source.slaFrom), slaTo: text(source.slaTo), annualSlaPayment: text(source.annualSlaPayment), contractValue: text(source.contractValue),
    supplier: text(source.supplier), contractNumber: text(source.contractNumber), contractEffectiveFrom: text(source.contractEffectiveFrom),
    contractValidTo: text(source.contractValidTo), crzLink: text(source.crzLink), adminAccessManager: text(source.adminAccessManager),
    personalData: text(source.personalData), notes: text(source.notes), reviewStatus: text(source.reviewStatus), sourceFile: text(source.sourceFile),
    sourceSheet: text(source.sourceSheet), sourceRow: numberValue(source.sourceRow),
  }
}

function parseLocal<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as T[] : fallback
  } catch { return fallback }
}

export function loadLocalWebsites() { return parseLocal<WebsiteRecord>(WEBSITE_LOCAL_KEY, (websiteSeed as WebsiteRecord[]).map(normalizeWebsite)).map(normalizeWebsite) }
export function saveLocalWebsites(items: WebsiteRecord[]) { localStorage.setItem(WEBSITE_LOCAL_KEY, JSON.stringify(items)) }
export function loadLocalInformationSystems() { return parseLocal<InformationSystemRecord>(SYSTEM_LOCAL_KEY, (informationSystemSeed as InformationSystemRecord[]).map(normalizeInformationSystem)).map(normalizeInformationSystem) }
export function saveLocalInformationSystems(items: InformationSystemRecord[]) { localStorage.setItem(SYSTEM_LOCAL_KEY, JSON.stringify(items)) }

function cloudError(prefix: string, error: { message?: string; details?: string; hint?: string; code?: string } | null) {
  const detail = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(' · ')
  return new Error(detail ? `${prefix}: ${detail}` : prefix)
}

export async function loadWebsites(databaseMode: 'local' | 'cloud'): Promise<WebsiteRecord[]> {
  if (databaseMode === 'local' || !supabase) return loadLocalWebsites()
  const { data, error } = await supabase.from('website_registry').select('payload').order('name', { ascending: true })
  if (error) throw cloudError('Register webov sa nepodarilo načítať', error)
  return (data ?? []).map((row) => normalizeWebsite(row.payload))
}

export async function upsertWebsite(item: WebsiteRecord, databaseMode: 'local' | 'cloud') {
  if (databaseMode === 'local' || !supabase) return
  const { error } = await supabase.rpc('upsert_website_registry', { p_item: item })
  if (error) throw cloudError('Web sa nepodarilo uložiť', error)
}

export async function deleteWebsite(sourceKey: string, databaseMode: 'local' | 'cloud') {
  if (databaseMode === 'local' || !supabase) return
  const { error } = await supabase.rpc('delete_website_registry', { p_source_key: sourceKey })
  if (error) throw cloudError('Web sa nepodarilo odstrániť', error)
}

export async function loadInformationSystems(databaseMode: 'local' | 'cloud'): Promise<InformationSystemRecord[]> {
  if (databaseMode === 'local' || !supabase) return loadLocalInformationSystems()
  const { data, error } = await supabase.from('information_system_registry').select('payload').order('name', { ascending: true })
  if (error) throw cloudError('Register informačných systémov sa nepodarilo načítať', error)
  return (data ?? []).map((row) => normalizeInformationSystem(row.payload))
}

export async function upsertInformationSystem(item: InformationSystemRecord, databaseMode: 'local' | 'cloud') {
  if (databaseMode === 'local' || !supabase) return
  const { error } = await supabase.rpc('upsert_information_system_registry', { p_item: item })
  if (error) throw cloudError('Informačný systém sa nepodarilo uložiť', error)
}

export async function deleteInformationSystem(sourceKey: string, databaseMode: 'local' | 'cloud') {
  if (databaseMode === 'local' || !supabase) return
  const { error } = await supabase.rpc('delete_information_system_registry', { p_source_key: sourceKey })
  if (error) throw cloudError('Informačný systém sa nepodarilo odstrániť', error)
}

export function subscribeToWebsiteRegistry(organizationId: string, onChange: () => void) {
  const client = supabase
  if (!client) return () => undefined
  const channel = client.channel(`website-registry-${organizationId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'website_registry', filter: `organization_id=eq.${organizationId}` }, onChange)
    .subscribe()
  return () => { void client.removeChannel(channel) }
}

export function subscribeToInformationSystemRegistry(organizationId: string, onChange: () => void) {
  const client = supabase
  if (!client) return () => undefined
  const channel = client.channel(`information-system-registry-${organizationId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'information_system_registry', filter: `organization_id=eq.${organizationId}` }, onChange)
    .subscribe()
  return () => { void client.removeChannel(channel) }
}
