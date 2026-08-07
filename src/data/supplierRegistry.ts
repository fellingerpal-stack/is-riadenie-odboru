export interface KnownSupplierIdentity {
  ico: string
  name: string
  source: string
}

export const knownSupplierRegistry: Record<string, KnownSupplierIdentity> = {
  '35763469': { ico: '35763469', name: 'Slovak Telekom, a.s.', source: 'ORSR' },
  '00397610': { ico: '00397610', name: 'Technická univerzita v Košiciach', source: 'RÚZ' },
  '00397563': { ico: '00397563', name: 'Žilinská univerzita v Žiline', source: 'RÚZ' },
  '35697270': { ico: '35697270', name: 'Orange Slovensko, a.s.', source: 'ORSR/RÚZ' },
  '36237337': { ico: '36237337', name: 'Seyfor Slovensko, a.s.', source: 'ORSR/RÚZ' },
  '43953794': { ico: '43953794', name: 'DICIT spol. s r. o.', source: 'ORSR' },
  '36383431': { ico: '36383431', name: 'INFOkey, s. r. o.', source: 'RÚZ/FinStat' },
  '36817864': { ico: '36817864', name: 'CellQoS, a.s.', source: 'RÚZ/FinStat' },
  '50412329': { ico: '50412329', name: 'ESMO s. r. o.', source: 'ORSR' },
  '31609139': { ico: '31609139', name: 'STOPKRIMI, s.r.o.', source: 'ORSR' },
  '35763329': { ico: '35763329', name: 'RIMI-SK, s.r.o.', source: 'RÚZ/FinStat' },
  '36562939': { ico: '36562939', name: 'Alza.sk s. r. o.', source: 'RÚZ/FinStat' },
  '45310106': { ico: '45310106', name: 'COPY PRINT GROUP, a.s.', source: 'RÚZ/FinStat' },
  '35728531': { ico: '35728531', name: 'InterWay, a. s.', source: 'RÚZ/FinStat' },
  '36795488': { ico: '36795488', name: 'PYROSTOP Huliak s.r.o.', source: 'RÚZ/FinStat' },
  '00004208': { ico: '00004208', name: 'Mailchimp / zahraničná online služba', source: 'poznámka v Exceli' },
}

export function normalizeSupplierIco(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length > 8) return digits
  return digits.padStart(8, '0')
}

export function knownSupplierByIco(value: unknown): KnownSupplierIdentity | undefined {
  return knownSupplierRegistry[normalizeSupplierIco(value)]
}
