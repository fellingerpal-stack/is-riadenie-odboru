import { oitData } from '../data/oitData'
import type { Employee, RaciItem } from '../types'

export type RaciRole = 'R' | 'A' | 'C' | 'I'

export interface RaciAnalyticsPerson {
  key: string
  id: string
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

export interface DepartmentRaciAnalytics {
  code: '3.1' | '3.2'
  shortName: string
  fullName: string
  processLabel: string
  processes: number
  areas: string[]
  matrixParticipants: number
  internalPeople: number
  activePeople: number
  formalComplete: number
  formalIssues: number
  missingA: number
  multipleA: number
  missingR: number
  singleR: number
  combinedAR: number
  externalAssignments: number
  roleTotals: Record<RaciRole, number>
  people: RaciAnalyticsPerson[]
}

const externalOrisParticipants = new Set([
  'Vecný garant / MŠVVaM',
  'Iné útvary CVTI SR',
  'Dodávateľ / partner',
])

export function splitRaciRoles(value: unknown): RaciRole[] {
  return String(value ?? '')
    .split('/')
    .map((part) => part.trim().toUpperCase())
    .filter((part): part is RaciRole => part === 'R' || part === 'A' || part === 'C' || part === 'I')
}

function rowRoleCount(assignments: Record<string, unknown>, role: RaciRole) {
  return Object.values(assignments).filter((value) => splitRaciRoles(value).includes(role)).length
}

function buildAnalytics({
  code,
  shortName,
  fullName,
  processLabel,
  rows,
  areas,
  people,
  externalKeys,
}: {
  code: DepartmentRaciAnalytics['code']
  shortName: string
  fullName: string
  processLabel: string
  rows: { assignments: Record<string, unknown> }[]
  areas: string[]
  people: { key: string; id: string; name: string; area: string }[]
  externalKeys?: Set<string>
}): DepartmentRaciAnalytics {
  const matrixKeys = new Set<string>()
  rows.forEach((row) => Object.keys(row.assignments).forEach((key) => matrixKeys.add(key)))

  const roleTotals: Record<RaciRole, number> = { R: 0, A: 0, C: 0, I: 0 }
  rows.forEach((row) => {
    Object.values(row.assignments).forEach((value) => {
      splitRaciRoles(value).forEach((role) => {
        roleTotals[role] += 1
      })
    })
  })

  const peopleStats = people.map((person) => {
    const values = rows.map((row) => row.assignments[person.key] ?? '')
    const has = (role: RaciRole, value: unknown) => splitRaciRoles(value).includes(role)
    const participation = values.filter((value) => splitRaciRoles(value).length > 0).length

    return {
      key: person.key,
      id: person.id,
      name: person.name,
      area: person.area,
      R: values.filter((value) => has('R', value)).length,
      A: values.filter((value) => has('A', value)).length,
      C: values.filter((value) => has('C', value)).length,
      I: values.filter((value) => has('I', value)).length,
      combinedAR: values.filter((value) => has('A', value) && has('R', value)).length,
      uniqueR: rows.filter(
        (row) => has('R', row.assignments[person.key]) && rowRoleCount(row.assignments, 'R') === 1,
      ).length,
      participation,
      participationPercent: rows.length ? Math.round((participation / rows.length) * 100) : 0,
    }
  })

  const missingA = rows.filter((row) => rowRoleCount(row.assignments, 'A') === 0).length
  const multipleA = rows.filter((row) => rowRoleCount(row.assignments, 'A') > 1).length
  const missingR = rows.filter((row) => rowRoleCount(row.assignments, 'R') === 0).length
  const formalIssues = rows.filter(
    (row) => rowRoleCount(row.assignments, 'A') !== 1 || rowRoleCount(row.assignments, 'R') < 1,
  ).length
  const singleR = rows.filter((row) => rowRoleCount(row.assignments, 'R') === 1).length
  const combinedAR = rows.filter((row) =>
    Object.values(row.assignments).some((value) => {
      const roles = splitRaciRoles(value)
      return roles.includes('A') && roles.includes('R')
    }),
  ).length
  const externalAssignments = externalKeys
    ? rows.reduce(
        (sum, row) =>
          sum +
          Object.entries(row.assignments).filter(
            ([key, value]) => externalKeys.has(key) && splitRaciRoles(value).length > 0,
          ).length,
        0,
      )
    : 0

  return {
    code,
    shortName,
    fullName,
    processLabel,
    processes: rows.length,
    areas,
    matrixParticipants: matrixKeys.size,
    internalPeople: peopleStats.length,
    activePeople: peopleStats.filter((person) => person.participation > 0).length,
    formalComplete: rows.length - formalIssues,
    formalIssues,
    missingA,
    multipleA,
    missingR,
    singleR,
    combinedAR,
    externalAssignments,
    roleTotals,
    people: peopleStats,
  }
}

function personInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function buildOrisRaciAnalytics(
  items: RaciItem[],
  employees: Employee[] = [],
): DepartmentRaciAnalytics {
  const participants = Object.keys(items[0]?.assignments ?? {}).filter(
    (participant) => !externalOrisParticipants.has(participant),
  )
  const employeeMap = new Map(employees.map((employee) => [employee.name, employee]))
  const people = participants.map((name) => {
    const employee = employeeMap.get(name)
    const area = [employee?.position, employee?.roleType].filter(Boolean).join(' · ')

    return {
      key: name,
      id: personInitials(name),
      name,
      area: area || 'Odbor 3.2 · rola podľa RACI matice',
    }
  })

  return buildAnalytics({
    code: '3.2',
    shortName: 'ORIS',
    fullName: 'Odbor prevádzky, rozvoja informačných systémov a projektové riadenie',
    processLabel: 'procesov a agend',
    rows: items,
    areas: Array.from(new Set(items.map((item) => item.area))).sort((a, b) => a.localeCompare(b, 'sk')),
    people,
    externalKeys: externalOrisParticipants,
  })
}

export function buildOitRaciAnalytics(): DepartmentRaciAnalytics {
  const rows = oitData.raciAreas.flatMap((area) => area.rows)

  return buildAnalytics({
    code: '3.1',
    shortName: 'OIT',
    fullName: 'Odbor správy a prevádzky IT infraštruktúry',
    processLabel: 'infraštruktúrnych procesov',
    rows,
    areas: oitData.raciAreas.map((area) => area.title),
    people: oitData.people.map((person) => ({
      key: person.id,
      id: person.id,
      name: person.name,
      area: person.area,
    })),
  })
}
