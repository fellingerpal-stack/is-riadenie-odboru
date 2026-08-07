import { oitData } from '../data/oitData'
import type { Employee, RaciItem, Substitution } from '../types'
import { splitRaciRoles, type RaciRole } from './raciAnalytics'

export type IntelligenceDepartmentCode = '3.1' | '3.2'
export type IntelligenceRiskKind = 'operational' | 'governance' | 'mixed'

export interface IntelligenceProcess {
  id: string
  department: IntelligenceDepartmentCode
  area: string
  process: string
  note: string
  criticality: string
  assignments: Record<string, string>
}

export interface IntelligencePerson {
  key: string
  department: IntelligenceDepartmentCode
  name: string
  area: string
  R: number
  A: number
  C: number
  I: number
  combinedAR: number
  uniqueR: number
  participation: number
  participationPercent: number
}

export interface AbsenceSimulation {
  person: IntelligencePerson
  impacted: number
  impactedPercent: number
  missingRAfter: number
  missingAAfter: number
  newMissingR: number
  newMissingA: number
  newSingleR: number
  criticalImpacted: number
  operationalIndex: number
  governanceIndex: number
  totalIndex: number
  riskKind: IntelligenceRiskKind
  examples: IntelligenceProcess[]
}

export interface DepartmentHealth {
  code: IntelligenceDepartmentCode
  label: string
  processes: number
  people: number
  health: number
  integrity: number
  continuity: number
  balance: number
  separation: number
  participation: number
  formalIssues: number
  singleR: number
  combinedAR: number
  topRShare: number
  busFactor50: number
}

export interface DependencyPair {
  department: IntelligenceDepartmentCode
  left: IntelligencePerson
  right: IntelligencePerson
  sharedProcesses: number
  directARLinks: number
  criticalShared: number
  score: number
}

export interface DeputySuggestion {
  department: IntelligenceDepartmentCode
  owner: IntelligencePerson
  candidate: IntelligencePerson | null
  overlapScore: number
  evidenceProcesses: number
  source: 'raci-overlap' | 'registered' | 'none'
  registeredDeputy: string
}

export interface IntelligenceRecommendation {
  id: string
  department: IntelligenceDepartmentCode | 'both'
  priority: 'critical' | 'high' | 'medium'
  title: string
  text: string
  impact: string
  score: number
}

export interface RaciIntelligenceResult {
  processes: IntelligenceProcess[]
  people: IntelligencePerson[]
  health: DepartmentHealth[]
  simulations: AbsenceSimulation[]
  pairs: DependencyPair[]
  deputies: DeputySuggestion[]
  recommendations: IntelligenceRecommendation[]
  executiveSignal: string
  combinedHealth: number
}

const externalOrisParticipants = new Set([
  'Vecný garant / MŠVVaM',
  'Iné útvary CVTI SR',
  'Dodávateľ / partner',
])

function roleCount(assignments: Record<string, string>, role: RaciRole, omittedKey = '') {
  return Object.entries(assignments).filter(([key, value]) => key !== omittedKey && splitRaciRoles(value).includes(role)).length
}

function criticalityWeight(value: string) {
  const normalized = value.toLowerCase()
  if (normalized.includes('krit')) return 4
  if (normalized.includes('vysok')) return 3
  if (normalized.includes('stred')) return 2
  return 1
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function personInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function buildProcesses(orisItems: RaciItem[]): IntelligenceProcess[] {
  const oitProcesses = oitData.raciAreas.flatMap((area) => area.rows.map((row) => ({
    id: row.id,
    department: '3.1' as const,
    area: area.title,
    process: row.process,
    note: row.note,
    criticality: 'Neurčená',
    assignments: row.assignments,
  })))

  const orisProcesses = orisItems.map((item) => ({
    id: item.id,
    department: '3.2' as const,
    area: item.area,
    process: item.process,
    note: item.note,
    criticality: item.criticality || 'Neurčená',
    assignments: Object.fromEntries(Object.entries(item.assignments).map(([key, value]) => [key, String(value ?? '')])),
  }))

  return [...oitProcesses, ...orisProcesses]
}

function buildPeople(processes: IntelligenceProcess[], orisEmployees: Employee[]): IntelligencePerson[] {
  const oitPeople = oitData.people.map((person) => ({ key: person.id, name: person.name, area: person.area }))
  const orisEmployeeMap = new Map(orisEmployees.map((employee) => [employee.name, employee]))
  const orisKeys = new Set<string>()
  processes.filter((process) => process.department === '3.2').forEach((process) => {
    Object.keys(process.assignments).forEach((key) => {
      if (!externalOrisParticipants.has(key)) orisKeys.add(key)
    })
  })
  const orisPeople = Array.from(orisKeys).map((name) => {
    const employee = orisEmployeeMap.get(name)
    return {
      key: name,
      name,
      area: [employee?.position, employee?.roleType].filter(Boolean).join(' · ') || 'Odbor 3.2 · RACI',
    }
  })

  const calculate = (
    department: IntelligenceDepartmentCode,
    person: { key: string; name: string; area: string },
  ): IntelligencePerson => {
    const rows = processes.filter((process) => process.department === department)
    const values = rows.map((row) => row.assignments[person.key] ?? '')
    const has = (value: string, role: RaciRole) => splitRaciRoles(value).includes(role)
    const participation = values.filter((value) => splitRaciRoles(value).length > 0).length
    return {
      key: person.key,
      department,
      name: person.name,
      area: person.area,
      R: values.filter((value) => has(value, 'R')).length,
      A: values.filter((value) => has(value, 'A')).length,
      C: values.filter((value) => has(value, 'C')).length,
      I: values.filter((value) => has(value, 'I')).length,
      combinedAR: values.filter((value) => has(value, 'A') && has(value, 'R')).length,
      uniqueR: rows.filter((row) => has(row.assignments[person.key] ?? '', 'R') && roleCount(row.assignments, 'R') === 1).length,
      participation,
      participationPercent: rows.length ? Math.round((participation / rows.length) * 100) : 0,
    }
  }

  return [
    ...oitPeople.map((person) => calculate('3.1', person)),
    ...orisPeople.map((person) => calculate('3.2', person)),
  ]
}

function buildHealth(processes: IntelligenceProcess[], people: IntelligencePerson[]): DepartmentHealth[] {
  return (['3.1', '3.2'] as IntelligenceDepartmentCode[]).map((code) => {
    const rows = processes.filter((process) => process.department === code)
    const departmentPeople = people.filter((person) => person.department === code)
    const formalIssues = rows.filter((row) => roleCount(row.assignments, 'A') !== 1 || roleCount(row.assignments, 'R') < 1).length
    const singleR = rows.filter((row) => roleCount(row.assignments, 'R') === 1).length
    const combinedAR = rows.filter((row) => Object.values(row.assignments).some((value) => {
      const roles = splitRaciRoles(value)
      return roles.includes('A') && roles.includes('R')
    })).length
    const totalR = departmentPeople.reduce((sum, person) => sum + person.R, 0)
    const topR = Math.max(0, ...departmentPeople.map((person) => person.R))
    const topRShare = totalR ? Math.round((topR / totalR) * 100) : 0
    const activePeople = departmentPeople.filter((person) => person.participation > 0).length
    const uniqueRLoads = departmentPeople.map((person) => person.uniqueR).filter((value) => value > 0).sort((a, b) => b - a)
    const busTarget = Math.max(1, Math.ceil(singleR * .5))
    let busCovered = 0
    let busFactor50 = 0
    for (const load of uniqueRLoads) {
      if (busCovered >= busTarget) break
      busCovered += load
      busFactor50 += 1
    }
    const integrity = clamp(100 - (formalIssues / Math.max(1, rows.length)) * 100)
    const continuity = clamp(100 - (singleR / Math.max(1, rows.length)) * 100)
    const balance = clamp(100 - Math.max(0, topRShare - 15) * 1.5)
    const separation = clamp(100 - (combinedAR / Math.max(1, rows.length)) * 70)
    const participation = clamp((activePeople / Math.max(1, departmentPeople.length)) * 100)
    const health = clamp(integrity * .30 + continuity * .35 + balance * .12 + separation * .10 + participation * .13)

    return {
      code,
      label: code === '3.1' ? 'OIT · infraštruktúra' : 'ORIS · IS a projekty',
      processes: rows.length,
      people: departmentPeople.length,
      health,
      integrity,
      continuity,
      balance,
      separation,
      participation,
      formalIssues,
      singleR,
      combinedAR,
      topRShare,
      busFactor50,
    }
  })
}

function simulateAbsence(processes: IntelligenceProcess[], person: IntelligencePerson): AbsenceSimulation {
  const rows = processes.filter((process) => process.department === person.department)
  const impactedRows = rows.filter((row) => splitRaciRoles(row.assignments[person.key] ?? '').length > 0)
  const missingRAfter = rows.filter((row) => roleCount(row.assignments, 'R', person.key) === 0).length
  const missingAAfter = rows.filter((row) => roleCount(row.assignments, 'A', person.key) === 0).length
  const baselineMissingR = rows.filter((row) => roleCount(row.assignments, 'R') === 0).length
  const baselineMissingA = rows.filter((row) => roleCount(row.assignments, 'A') === 0).length
  const newMissingR = Math.max(0, missingRAfter - baselineMissingR)
  const newMissingA = Math.max(0, missingAAfter - baselineMissingA)
  const newSingleR = rows.filter((row) => roleCount(row.assignments, 'R') > 1 && roleCount(row.assignments, 'R', person.key) === 1).length
  const criticalImpacted = impactedRows.filter((row) => criticalityWeight(row.criticality) >= 3).length
  const operationalIndex = clamp(
    (newMissingR / Math.max(1, rows.length)) * 130 +
    (newSingleR / Math.max(1, rows.length)) * 55 +
    (criticalImpacted / Math.max(1, rows.length)) * 25,
  )
  const governanceIndex = clamp((newMissingA / Math.max(1, rows.length)) * 100)
  const totalIndex = clamp(operationalIndex * .72 + governanceIndex * .28)
  const riskKind: IntelligenceRiskKind = operationalIndex >= governanceIndex * 1.35
    ? 'operational'
    : governanceIndex >= operationalIndex * 1.35
      ? 'governance'
      : 'mixed'
  const examples = [...impactedRows]
    .sort((a, b) => criticalityWeight(b.criticality) - criticalityWeight(a.criticality) || a.process.localeCompare(b.process, 'sk'))
    .slice(0, 6)

  return {
    person,
    impacted: impactedRows.length,
    impactedPercent: rows.length ? Math.round((impactedRows.length / rows.length) * 100) : 0,
    missingRAfter,
    missingAAfter,
    newMissingR,
    newMissingA,
    newSingleR,
    criticalImpacted,
    operationalIndex,
    governanceIndex,
    totalIndex,
    riskKind,
    examples,
  }
}

function buildPairs(processes: IntelligenceProcess[], people: IntelligencePerson[]): DependencyPair[] {
  const pairs: DependencyPair[] = []
  for (const code of ['3.1', '3.2'] as IntelligenceDepartmentCode[]) {
    const rows = processes.filter((process) => process.department === code)
    const departmentPeople = people.filter((person) => person.department === code && person.participation > 0)
    for (let leftIndex = 0; leftIndex < departmentPeople.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < departmentPeople.length; rightIndex += 1) {
        const left = departmentPeople[leftIndex]
        const right = departmentPeople[rightIndex]
        let sharedProcesses = 0
        let directARLinks = 0
        let criticalShared = 0
        rows.forEach((row) => {
          const leftRoles = splitRaciRoles(row.assignments[left.key] ?? '')
          const rightRoles = splitRaciRoles(row.assignments[right.key] ?? '')
          if (!leftRoles.length || !rightRoles.length) return
          const operationalShared =
            (leftRoles.includes('R') && (rightRoles.includes('R') || rightRoles.includes('C'))) ||
            (rightRoles.includes('R') && (leftRoles.includes('R') || leftRoles.includes('C')))
          if (operationalShared) sharedProcesses += 1
          if ((leftRoles.includes('A') && rightRoles.includes('R')) || (rightRoles.includes('A') && leftRoles.includes('R'))) directARLinks += 1
          if (operationalShared && criticalityWeight(row.criticality) >= 3) criticalShared += 1
        })
        if (!sharedProcesses) continue
        pairs.push({
          department: code,
          left,
          right,
          sharedProcesses,
          directARLinks,
          criticalShared,
          score: sharedProcesses * 2 + directARLinks * .5 + criticalShared * 2,
        })
      }
    }
  }
  return pairs.sort((a, b) => b.score - a.score || b.sharedProcesses - a.sharedProcesses).slice(0, 24)
}

function registeredDeputyFor(person: IntelligencePerson, employees: Employee[], substitutions: Substitution[]) {
  if (person.department !== '3.2') return ''
  const employee = employees.find((entry) => entry.name === person.name)
  const substitution = substitutions.find((entry) => entry.owner === person.name)
  return substitution?.confirmedDeputy || substitution?.proposedDeputy || employee?.deputy || ''
}

function buildDeputies(
  processes: IntelligenceProcess[],
  people: IntelligencePerson[],
  employees: Employee[],
  substitutions: Substitution[],
): DeputySuggestion[] {
  return people
    .filter((person) => person.uniqueR > 0)
    .map((owner) => {
      const rows = processes.filter((process) => process.department === owner.department && splitRaciRoles(process.assignments[owner.key] ?? '').includes('R'))
      const candidates = people
        .filter((person) => person.department === owner.department && person.key !== owner.key)
        .map((candidate) => {
          let overlapScore = 0
          let evidenceProcesses = 0
          rows.forEach((row) => {
            const roles = splitRaciRoles(row.assignments[candidate.key] ?? '')
            if (!roles.length) return
            evidenceProcesses += 1
            if (roles.includes('R')) overlapScore += 6
            if (roles.includes('C')) overlapScore += 4
            if (roles.includes('A')) overlapScore += 3
            if (roles.includes('I')) overlapScore += 1
          })
          return { candidate, overlapScore, evidenceProcesses }
        })
        .sort((a, b) => b.overlapScore - a.overlapScore || b.evidenceProcesses - a.evidenceProcesses)
      const best = candidates[0]
      const registeredDeputy = registeredDeputyFor(owner, employees, substitutions)
      return {
        department: owner.department,
        owner,
        candidate: best?.candidate ?? null,
        overlapScore: best?.overlapScore ?? 0,
        evidenceProcesses: best?.evidenceProcesses ?? 0,
        source: registeredDeputy ? 'registered' as const : best?.overlapScore ? 'raci-overlap' as const : 'none' as const,
        registeredDeputy,
      }
    })
    .sort((a, b) => b.owner.uniqueR - a.owner.uniqueR || b.overlapScore - a.overlapScore)
}

function buildRecommendations(
  health: DepartmentHealth[],
  simulations: AbsenceSimulation[],
  deputies: DeputySuggestion[],
  pairs: DependencyPair[],
): IntelligenceRecommendation[] {
  const recommendations: IntelligenceRecommendation[] = []
  health.forEach((department) => {
    if (department.formalIssues > 0) recommendations.push({
      id: `${department.code}-integrity`, department: department.code, priority: 'critical', score: 100 + department.formalIssues,
      title: `Uzavrieť ${department.formalIssues} formálnych medzier`,
      text: `V odbore ${department.code} sú procesy bez jednoznačného A alebo bez R. Toto je prvá vec, ktorú treba opraviť pred ďalšou optimalizáciou.`,
      impact: `zvýšenie integrity z ${department.integrity}% smerom k 100%`,
    })
    if (department.singleR > 0) recommendations.push({
      id: `${department.code}-continuity`, department: department.code, priority: 'high', score: 70 + department.singleR,
      title: `Znížiť ${department.singleR} závislostí na jedinom R`,
      text: `Procesy s jediným vykonávateľom predstavujú najväčší kontinuitný problém odboru ${department.code}.`,
      impact: `zlepšenie kontinuitného skóre, aktuálne ${department.continuity}%`,
    })
    if (department.topRShare >= 25) recommendations.push({
      id: `${department.code}-balance`, department: department.code, priority: 'high', score: 60 + department.topRShare,
      title: `Preveriť koncentráciu výkonu R v odbore ${department.code}`,
      text: `Najvyťaženejší vykonávateľ nesie ${department.topRShare}% všetkých priradení R. Overte kapacitu, dokumentáciu a prenos know-how.`,
      impact: `zniženie personálnej koncentrácie a lepší bus factor`,
    })
  })

  const highestOperational = [...simulations].sort((a, b) => b.operationalIndex - a.operationalIndex)[0]
  if (highestOperational && highestOperational.operationalIndex > 0) recommendations.push({
    id: 'highest-spof', department: highestOperational.person.department, priority: 'critical', score: 120 + highestOperational.operationalIndex,
    title: `Najvyšší prevádzkový dopad: ${highestOperational.person.name}`,
    text: `Simulácia neprítomnosti vytvorí ${highestOperational.newMissingR} nových procesov bez R a ${highestOperational.newSingleR} nových procesov s jediným R.`,
    impact: `operačný index dopadu ${highestOperational.operationalIndex}/100`,
  })

  const uncovered = deputies.filter((entry) => entry.owner.uniqueR > 0 && !entry.registeredDeputy && entry.overlapScore === 0)
  if (uncovered.length) recommendations.push({
    id: 'uncovered-deputies', department: 'both', priority: 'high', score: 85 + uncovered.length,
    title: `Pre ${uncovered.length} kľúčových ľudí nie je viditeľný vhodný zástupca`,
    text: 'RACI neukazuje dostatočný prekryv rolí a zároveň nie je evidovaný návrh zastupovania. Vyžaduje sa vedomý cross-training alebo doplnenie roly.',
    impact: 'priame zníženie single-point-of-failure rizika',
  })

  const highestGovernance = [...simulations].sort((a, b) => b.governanceIndex - a.governanceIndex)[0]
  if (highestGovernance && highestGovernance.governanceIndex >= 50) recommendations.push({
    id: 'governance-dependency', department: highestGovernance.person.department, priority: 'medium', score: 75 + highestGovernance.governanceIndex,
    title: `Governance závislosť: ${highestGovernance.person.name}`,
    text: `Po odobratí formálnej roly vznikne ${highestGovernance.newMissingA} nových procesov bez A. Pri OIT ide najmä o formálnu riaditeľskú zodpovednosť, nie o pracovné zaťaženie.`,
    impact: 'formálne delegovanie, zastupovanie a rozhodovacie limity',
  })

  const analyticalDeputies = deputies.filter((entry) => entry.owner.uniqueR >= 2 && !entry.registeredDeputy && entry.overlapScore > 0)
  if (analyticalDeputies.length) recommendations.push({
    id: 'formalize-deputies', department: 'both', priority: 'high', score: 82 + analyticalDeputies.length,
    title: `Formálne potvrdiť zástupcov pre ${analyticalDeputies.length} kľúčových vykonávateľov`,
    text: 'RACI ukazuje vhodný znalostný prekryv, ale nejde o potvrdené zastupovanie. Kandidát musí mať prístupy, dokumentáciu a prakticky overený rozsah.',
    impact: 'premena analytického kandidáta na reálnu kontinuitu služby',
  })

  const concentratedPair = pairs[0]
  if (concentratedPair && concentratedPair.sharedProcesses >= 8) recommendations.push({
    id: 'pair-concentration', department: concentratedPair.department, priority: 'medium', score: 45 + concentratedPair.score,
    title: `Silná väzba ${concentratedPair.left.name} ↔ ${concentratedPair.right.name}`,
    text: `Dvojica sa stretáva v ${concentratedPair.sharedProcesses} procesoch; ${concentratedPair.directARLinks} z nich tvorí priamu väzbu A↔R.`,
    impact: 'preverenie dvojitej personálnej závislosti a odovzdávacích bodov',
  })

  const priorityRank = { critical: 3, high: 2, medium: 1 } as const
  return recommendations.sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || b.score - a.score).slice(0, 8)
}

export function buildRaciIntelligence(
  orisItems: RaciItem[],
  orisEmployees: Employee[] = [],
  substitutions: Substitution[] = [],
): RaciIntelligenceResult {
  const processes = buildProcesses(orisItems)
  const people = buildPeople(processes, orisEmployees)
  const health = buildHealth(processes, people)
  const simulations = people.map((person) => simulateAbsence(processes, person)).sort((a, b) => b.totalIndex - a.totalIndex || b.impacted - a.impacted)
  const pairs = buildPairs(processes, people)
  const deputies = buildDeputies(processes, people, orisEmployees, substitutions)
  const recommendations = buildRecommendations(health, simulations, deputies, pairs)
  const combinedHealth = health.length ? Math.round(health.reduce((sum, entry) => sum + entry.health, 0) / health.length) : 0
  const topOperational = [...simulations].sort((a, b) => b.operationalIndex - a.operationalIndex)[0]
  const weakestHealth = [...health].sort((a, b) => a.health - b.health)[0]
  const executiveSignal = topOperational && topOperational.operationalIndex > 0
    ? `Najväčší simulovaný prevádzkový dopad má neprítomnosť osoby ${topOperational.person.name} v odbore ${topOperational.person.department}. Najslabší spoločný rozmer je aktuálne odbor ${weakestHealth?.code ?? '—'} so skóre ${weakestHealth?.health ?? 0}/100.`
    : `RACI matice nemajú identifikovaný okamžitý prevádzkový výpadok po odobratí jednotlivca. Spoločné skóre pripravenosti je ${combinedHealth}/100.`

  return {
    processes,
    people,
    health,
    simulations,
    pairs,
    deputies,
    recommendations,
    executiveSignal,
    combinedHealth,
  }
}

export function intelligenceInitials(person: IntelligencePerson) {
  return person.department === '3.1' ? person.key : personInitials(person.name)
}
