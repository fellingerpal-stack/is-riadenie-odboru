import type { AccessScope, CmdbItem } from '../types'

export interface AssetImportTable {
  fileName: string
  headers: string[]
  rows: Record<string, string>[]
}

export interface AssetImportField {
  key: keyof CmdbItem
  label: string
  aliases: string[]
  required?: boolean
}

export interface AssetImportResult {
  assets: CmdbItem[]
  skippedEmpty: number
  warnings: string[]
}

export const ASSET_IMPORT_FIELDS: AssetImportField[] = [
  { key: 'id', label: 'ID aktíva', aliases: ['id', 'asset id', 'ci id', 'cislo zaznamu', 'číslo záznamu'] },
  { key: 'name', label: 'Názov', required: true, aliases: ['nazov', 'názov', 'name', 'asset name', 'zariadenie', 'device'] },
  { key: 'type', label: 'Typ', aliases: ['typ', 'type', 'typ zariadenia', 'device type', 'kategoria', 'kategória'] },
  { key: 'scope', label: 'Scope / odbor', aliases: ['scope', 'odbor', 'utvar', 'útvar', 'department scope'] },
  { key: 'assetTag', label: 'Inventárne číslo', aliases: ['inventarne cislo', 'inventárne číslo', 'inventar', 'inventory', 'asset tag', 'assettag', 'evidencne cislo', 'evidenčné číslo'] },
  { key: 'serialNumber', label: 'Sériové číslo', aliases: ['seriove cislo', 'sériové číslo', 'serial', 'serial number', 'sn', 's/n'] },
  { key: 'manufacturer', label: 'Výrobca', aliases: ['vyrobca', 'výrobca', 'manufacturer', 'vendor'] },
  { key: 'model', label: 'Model', aliases: ['model', 'produkt', 'product'] },
  { key: 'assignedTo', label: 'Pridelené osobe', aliases: ['pridelene', 'pridelené', 'assigned to', 'user', 'uzivatel', 'užívateľ', 'pouzivatel', 'používateľ', 'zamestnanec'] },
  { key: 'department', label: 'Oddelenie / odbor', aliases: ['oddelenie', 'department', 'organizacna jednotka', 'organizačná jednotka', 'stredisko'] },
  { key: 'location', label: 'Lokalita', aliases: ['lokalita', 'location', 'budova', 'site'] },
  { key: 'room', label: 'Miestnosť', aliases: ['miestnost', 'miestnosť', 'room', 'kancelaria', 'kancelária'] },
  { key: 'costCenter', label: 'Nákladové stredisko', aliases: ['nakladove stredisko', 'nákladové stredisko', 'cost center', 'costcentre', 'pracm'] },
  { key: 'businessOwner', label: 'Vecný vlastník', aliases: ['vecny vlastnik', 'vecný vlastník', 'business owner', 'owner'] },
  { key: 'technicalOwner', label: 'Technický vlastník', aliases: ['technicky vlastnik', 'technický vlastník', 'technical owner', 'spravca', 'správca'] },
  { key: 'supplier', label: 'Dodávateľ', aliases: ['dodavatel', 'dodávateľ', 'supplier', 'firma'] },
  { key: 'supplierIco', label: 'IČO dodávateľa', aliases: ['ico', 'ičo', 'ico dodavatela', 'ičo dodávateľa', 'supplier ico'] },
  { key: 'contractRef', label: 'Zmluva', aliases: ['zmluva', 'contract', 'contract ref', 'csml'] },
  { key: 'contractTask', label: 'Úloha 10/22/25', aliases: ['uloha', 'úloha', 'task', 'kontraktova uloha', 'kontraktová úloha'] },
  { key: 'purchaseDate', label: 'Dátum nákupu', aliases: ['datum nakupu', 'dátum nákupu', 'purchase date', 'datum obstarania', 'dátum obstarania'] },
  { key: 'warrantyEnd', label: 'Koniec záruky', aliases: ['koniec zaruky', 'koniec záruky', 'warranty end', 'zaruka do', 'záruka do'] },
  { key: 'plannedReplacementDate', label: 'Plán obnovy', aliases: ['plan obnovy', 'plán obnovy', 'replacement date', 'obnova'] },
  { key: 'purchasePrice', label: 'Obstarávacia cena', aliases: ['obstaravacia cena', 'obstarávacia cena', 'purchase price', 'cena', 'hodnota'] },
  { key: 'status', label: 'Stav', aliases: ['stav', 'status'] },
  { key: 'lifecycle', label: 'Lifecycle', aliases: ['lifecycle', 'zivotny cyklus', 'životný cyklus'] },
  { key: 'criticality', label: 'Kritickosť', aliases: ['kritickost', 'kritickosť', 'criticality'] },
  { key: 'serviceId', label: 'ID služby', aliases: ['service id', 'serviceid', 'sluzba id', 'služba id'] },
  { key: 'hostname', label: 'Hostname', aliases: ['hostname', 'host', 'dns'] },
  { key: 'ipAddress', label: 'IP adresa', aliases: ['ip', 'ip adresa', 'ip address'] },
  { key: 'macAddress', label: 'MAC adresa', aliases: ['mac', 'mac adresa', 'mac address', 'ethernet address'] },
  { key: 'note', label: 'Poznámka', aliases: ['poznamka', 'poznámka', 'note', 'comment'] },
]

function stripDiacritics(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function normalizeHeader(value: string) {
  return stripDiacritics(String(value ?? ''))
    .trim()
    .toLowerCase()
    .replace(/[._/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function normalizeCell(value: unknown) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

function detectDelimiter(text: string) {
  const first = text.split(/\r?\n/).find((line) => line.trim()) ?? ''
  const candidates = [';', ',', '\t']
  return candidates
    .map((delimiter) => ({ delimiter, count: first.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ';'
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        quoted = !quoted
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

function csvToTable(text: string, fileName: string): AssetImportTable {
  const delimiter = detectDelimiter(text)
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  if (!lines.length) return { fileName, headers: [], rows: [] }
  const headers = parseCsvLine(lines[0], delimiter).map((header, index) => header || `Stĺpec ${index + 1}`)
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  })
  return { fileName, headers, rows }
}

export async function readAssetImportFile(file: File): Promise<AssetImportTable> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    return csvToTable(await file.text(), file.name)
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) return { fileName: file.name, headers: [], rows: [] }
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '', raw: false })
    const headers = rawRows.length ? Object.keys(rawRows[0]) : []
    return {
      fileName: file.name,
      headers,
      rows: rawRows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeCell(value)]))),
    }
  }
  throw new Error('Podporovaný je CSV, TXT, XLSX alebo XLS súbor.')
}

export function autoMapAssetHeaders(headers: string[]) {
  const normalized = headers.map((header) => ({ header, normalized: normalizeHeader(header) }))
  const mapping: Partial<Record<keyof CmdbItem, string>> = {}
  ASSET_IMPORT_FIELDS.forEach((field) => {
    const candidates = [field.label, ...field.aliases].map(normalizeHeader)
    const exact = normalized.find((item) => candidates.includes(item.normalized))
    const partial = exact ?? normalized.find((item) => candidates.some((candidate) => item.normalized.includes(candidate) || candidate.includes(item.normalized)))
    if (partial) mapping[field.key] = partial.header
  })
  return mapping
}

function parseMoney(value: string) {
  const cleaned = value.replace(/\s/g, '').replace(/€/g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeDate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const iso = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  const sk = trimmed.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/)
  if (sk) return `${sk[3]}-${sk[2].padStart(2, '0')}-${sk[1].padStart(2, '0')}`
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

export function normalizeAssetScope(value: string, fallback: AccessScope = 'shared'): AccessScope {
  const normalized = normalizeHeader(value)
  if (normalized.includes('3.1') || normalized === '3 1' || normalized === 'oit' || normalized.includes('odbor 3 1')) return 'oit'
  if (normalized.includes('3.2') || normalized === '3 2' || normalized === 'oris' || normalized.includes('odbor 3 2')) return 'oris'
  if (normalized.includes('spol') || normalized.includes('shared') || normalized.includes('central')) return 'shared'
  return fallback
}

export function inferAssetClass(type: string) {
  const value = normalizeHeader(type)
  if (['notebook', 'pracovna stanica', 'monitor', 'dokovacia stanica', 'tlaciaren', 'mfp', 'skener', 'ups', 'mobilny telefon', 'tablet', 'externy disk'].some((token) => value.includes(token))) return 'Koncové zariadenie / periféria'
  if (['server', 'storage', 'switch', 'router', 'firewall', 'sietovy prvok', 'wi fi'].some((token) => value.includes(token))) return 'Infraštruktúra'
  if (['licencia', 'saas', 'softver'].some((token) => value.includes(token))) return 'Softvér / licencia'
  if (['virtual', 'databaza', 'cloud', 'aplikacia', 'informacny system'].some((token) => value.includes(token))) return 'Digitálne aktívum / CI'
  return 'Iné aktívum'
}

export function blankAsset(id = ''): CmdbItem {
  const now = new Date().toISOString()
  return {
    id,
    name: '',
    type: 'Notebook',
    assetClass: 'Koncové zariadenie / periféria',
    scope: 'shared',
    category: '',
    status: 'V prevádzke',
    criticality: 'Stredná',
    serviceId: '',
    businessOwner: '',
    technicalOwner: '',
    custodian: '',
    assignedTo: '',
    department: '',
    environment: 'Produkcia',
    location: '',
    room: '',
    costCenter: '',
    supplier: '',
    supplierIco: '',
    contractRef: '',
    contractTask: '',
    manufacturer: '',
    model: '',
    version: '',
    hostname: '',
    ipAddress: '',
    macAddress: '',
    discoveryDeviceId: '',
    discoveryFirstSeenAt: '',
    discoveryLastSeenAt: '',
    discoveryCollector: '',
    serialNumber: '',
    assetTag: '',
    purchaseDate: '',
    warrantyEnd: '',
    licenseEnd: '',
    contractEnd: '',
    supportEnd: '',
    plannedReplacementDate: '',
    retirementDate: '',
    acquisitionMethod: '',
    purchasePrice: 0,
    annualOperatingCost: 0,
    licenseCostAnnual: 0,
    currency: 'EUR',
    cost: 0,
    dataClassification: 'Interné',
    monitoring: '',
    backup: '',
    documentation: '',
    lifecycle: 'V prevádzke',
    inventoryStatus: 'Neoverené',
    lastInventoryDate: '',
    inventoryNote: '',
    source: 'Manuálna evidencia',
    qrCode: '',
    linkedTicketIds: [],
    linkedChangeIds: [],
    history: [],
    note: '',
    createdAt: now,
    updatedAt: now,
    updatedBy: '',
  }
}

export function buildImportedAssets(
  table: AssetImportTable,
  mapping: Partial<Record<keyof CmdbItem, string>>,
  fallbackScope: AccessScope,
  actor: string,
): AssetImportResult {
  let skippedEmpty = 0
  const warnings: string[] = []
  const now = new Date().toISOString()
  const assets = table.rows.flatMap((row, index) => {
    const pick = (key: keyof CmdbItem) => {
      const header = mapping[key]
      return header ? normalizeCell(row[header]) : ''
    }
    const name = pick('name')
    const assetTag = pick('assetTag')
    const serialNumber = pick('serialNumber')
    const hostname = pick('hostname')
    if (!name && !assetTag && !serialNumber && !hostname) {
      skippedEmpty += 1
      return []
    }
    const type = pick('type') || 'Iné'
    const asset = blankAsset(pick('id') || `AST-${Date.now().toString(36).toUpperCase()}-${String(index + 1).padStart(4, '0')}`)
    asset.name = name || modelName(pick('manufacturer'), pick('model'), assetTag, serialNumber) || `Importované aktívum ${index + 1}`
    asset.type = type
    asset.assetClass = inferAssetClass(type)
    asset.scope = normalizeAssetScope(pick('scope'), fallbackScope)
    asset.assetTag = assetTag
    asset.serialNumber = serialNumber
    asset.manufacturer = pick('manufacturer')
    asset.model = pick('model')
    asset.assignedTo = pick('assignedTo')
    asset.department = pick('department')
    asset.location = pick('location')
    asset.room = pick('room')
    asset.costCenter = pick('costCenter')
    asset.businessOwner = pick('businessOwner')
    asset.technicalOwner = pick('technicalOwner')
    asset.supplier = pick('supplier')
    asset.supplierIco = pick('supplierIco').replace(/\D/g, '')
    asset.contractRef = pick('contractRef')
    asset.contractTask = pick('contractTask')
    asset.purchaseDate = normalizeDate(pick('purchaseDate'))
    asset.warrantyEnd = normalizeDate(pick('warrantyEnd'))
    asset.plannedReplacementDate = normalizeDate(pick('plannedReplacementDate'))
    asset.purchasePrice = parseMoney(pick('purchasePrice'))
    asset.cost = asset.purchasePrice
    asset.status = pick('status') || 'V prevádzke'
    asset.lifecycle = pick('lifecycle') || 'V prevádzke'
    asset.criticality = pick('criticality') || 'Stredná'
    asset.serviceId = pick('serviceId')
    asset.hostname = hostname
    asset.ipAddress = pick('ipAddress')
    asset.macAddress = pick('macAddress')
    asset.note = pick('note')
    asset.source = `Hromadný import · ${table.fileName}`
    asset.createdAt = now
    asset.updatedAt = now
    asset.updatedBy = actor
    asset.history = [{ id: crypto.randomUUID(), action: 'Import', actor, createdAt: now, detail: `Importované zo súboru ${table.fileName}` }]
    if (!asset.assetTag && !asset.serialNumber && !asset.hostname) warnings.push(`Riadok ${index + 2}: ${asset.name} nemá inventárne číslo, S/N ani hostname.`)
    return [asset]
  })
  return { assets, skippedEmpty, warnings }
}

function modelName(manufacturer: string, model: string, assetTag: string, serialNumber: string) {
  return [manufacturer, model].filter(Boolean).join(' ') || assetTag || serialNumber
}

export function assetDuplicateKey(asset: CmdbItem) {
  if (asset.assetTag.trim()) return `tag:${normalizeHeader(asset.assetTag)}`
  if (asset.serialNumber.trim()) return `serial:${normalizeHeader(asset.serialNumber)}`
  if (asset.hostname.trim()) return `host:${normalizeHeader(asset.hostname)}`
  return `id:${normalizeHeader(asset.id)}`
}

export function csvTemplate() {
  const headers = ASSET_IMPORT_FIELDS.map((field) => field.label)
  const example = ['AST-0001', 'Notebook Lenovo', 'Notebook', '3.2', 'INV-12345', 'SN123456', 'Lenovo', 'ThinkPad T14', 'Meno Priezvisko', 'Odbor 3.2', 'Lamačská cesta', '312', '345', '', '', 'Dodávateľ', '12345678', '123/2026', '25', '2026-01-15', '2029-01-15', '2029-12-31', '1250,00', 'V prevádzke', 'V prevádzke', 'Stredná', '', 'nb-user01', '', 'aa:bb:cc:dd:ee:ff', '']
  const quote = (value: string) => `"${String(value).replace(/"/g, '""')}"`
  return `${headers.map(quote).join(';')}\n${example.map(quote).join(';')}\n`
}
