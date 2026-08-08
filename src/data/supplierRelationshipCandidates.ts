import type { SupplierRelationship } from '../types'

const INTERWAY_ICO = '35728531'
const SOURCE = 'Manažérske zhrnutie ORIS / IS KOMIS'
const EVIDENCE = 'Zdroj zaraďuje cieľ do rodiny IS KOMIS alebo CRZP/APS. Pri konkrétnom module však neuvádza priamo dodávateľa, preto ide o kandidátsku väzbu na potvrdenie administrátorom.'

export const supplierRelationshipCandidates: SupplierRelationship[] = [
  {
    id: 'candidate-interway-iss', supplierKey: INTERWAY_ICO, supplierIco: INTERWAY_ICO, supplierName: 'InterWay, a. s.',
    targetType: 'Modul', targetId: 'S12', targetName: 'ISS', parentSystem: 'IS KOMIS', role: 'Aplikačný dodávateľ / technická podpora',
    contractNumber: '', validFrom: '', validTo: '', source: SOURCE, evidence: EVIDENCE,
    confidence: 'Odvodené', status: 'Na preverenie', note: 'Kandidát odvodený z príslušnosti modulu ISS do IS KOMIS.', updatedAt: '', updatedBy: '',
  },
  {
    id: 'candidate-interway-skcris', supplierKey: INTERWAY_ICO, supplierIco: INTERWAY_ICO, supplierName: 'InterWay, a. s.',
    targetType: 'Modul', targetId: '', targetName: 'SKCRIS', parentSystem: 'IS KOMIS', role: 'Aplikačný dodávateľ / technická podpora',
    contractNumber: '', validFrom: '', validTo: '', source: SOURCE, evidence: EVIDENCE,
    confidence: 'Odvodené', status: 'Na preverenie', note: 'Kandidát odvodený z príslušnosti modulu SKCRIS do IS KOMIS.', updatedAt: '', updatedBy: '',
  },
  {
    id: 'candidate-interway-scidap', supplierKey: INTERWAY_ICO, supplierIco: INTERWAY_ICO, supplierName: 'InterWay, a. s.',
    targetType: 'Modul', targetId: 'S11', targetName: 'SCIDAP', parentSystem: 'IS KOMIS', role: 'Aplikačný dodávateľ / technická podpora',
    contractNumber: '', validFrom: '', validTo: '', source: SOURCE, evidence: EVIDENCE,
    confidence: 'Odvodené', status: 'Na preverenie', note: 'Kandidát odvodený z príslušnosti modulu SCIDAP do IS KOMIS.', updatedAt: '', updatedBy: '',
  },
  {
    id: 'candidate-interway-svd', supplierKey: INTERWAY_ICO, supplierIco: INTERWAY_ICO, supplierName: 'InterWay, a. s.',
    targetType: 'Modul', targetId: 'S11', targetName: 'SVD', parentSystem: 'IS KOMIS', role: 'Aplikačný dodávateľ / technická podpora',
    contractNumber: '', validFrom: '', validTo: '', source: SOURCE, evidence: EVIDENCE,
    confidence: 'Odvodené', status: 'Na preverenie', note: 'Kandidát odvodený z príslušnosti modulu SVD do IS KOMIS.', updatedAt: '', updatedBy: '',
  },
  {
    id: 'candidate-interway-crzp', supplierKey: INTERWAY_ICO, supplierIco: INTERWAY_ICO, supplierName: 'InterWay, a. s.',
    targetType: 'Modul', targetId: 'S01', targetName: 'CRZP', parentSystem: 'CRZP / APS', role: 'Aplikačný dodávateľ / technická podpora',
    contractNumber: '', validFrom: '', validTo: '', source: SOURCE, evidence: EVIDENCE,
    confidence: 'Odvodené', status: 'Na preverenie', note: 'Kandidát odvodený zo skupiny CRZP/APS; technická dokumentácia zároveň eviduje rolu SVOP, preto je potrebné potvrdiť presnú rolu InterWay.', updatedAt: '', updatedBy: '',
  },
  {
    id: 'candidate-interway-antiplag', supplierKey: INTERWAY_ICO, supplierIco: INTERWAY_ICO, supplierName: 'InterWay, a. s.',
    targetType: 'Modul', targetId: 'S01', targetName: 'APS / Antiplag', parentSystem: 'CRZP / APS', role: 'Aplikačný dodávateľ / technická podpora',
    contractNumber: '', validFrom: '', validTo: '', source: SOURCE, evidence: EVIDENCE,
    confidence: 'Odvodené', status: 'Na preverenie', note: 'Kandidát odvodený zo skupiny CRZP/APS; presnú dodávateľskú rolu treba potvrdiť.', updatedAt: '', updatedBy: '',
  },
]
