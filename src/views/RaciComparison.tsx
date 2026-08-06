import { useMemo, useState, type ChangeEvent } from 'react'
import { Badge, Icon, Progress } from '../components/UI'
import {
  buildOitRaciAnalytics,
  buildOrisRaciAnalytics,
  type DepartmentRaciAnalytics,
  type RaciAnalyticsPerson,
  type RaciRole,
} from '../lib/raciAnalytics'
import type { Employee, RaciItem } from '../types'
import './RaciComparison.css'

type PeopleSort = 'R' | 'A' | 'spof' | 'participation'

function percentage(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0
}

function metricTone(value: number) {
  return value > 0 ? 'warning' as const : 'success' as const
}

function sortPeople(people: RaciAnalyticsPerson[], sort: PeopleSort) {
  return [...people].sort((a, b) => {
    if (sort === 'spof') return b.uniqueR - a.uniqueR || b.R - a.R || a.name.localeCompare(b.name, 'sk')
    if (sort === 'participation') return b.participation - a.participation || b.R - a.R || a.name.localeCompare(b.name, 'sk')
    return b[sort] - a[sort] || b.participation - a.participation || a.name.localeCompare(b.name, 'sk')
  })
}

function DepartmentSummary({ analytics }: { analytics: DepartmentRaciAnalytics }) {
  const readiness = percentage(analytics.formalComplete, analytics.processes)
  const topExecutor = sortPeople(analytics.people, 'R')[0]

  return <article className={`raci-department-card department-${analytics.code.replace('.', '-')}`}>
    <div className="raci-department-card-head">
      <span className="raci-department-code">{analytics.code}</span>
      <div><small>{analytics.shortName}</small><h3>{analytics.fullName}</h3></div>
      <Badge tone={analytics.formalIssues ? 'warning' : 'success'}>{readiness}% formálne úplné</Badge>
    </div>
    <div className="raci-department-card-kpis">
      <span><small>Procesy</small><strong>{analytics.processes}</strong></span>
      <span><small>Oblasti</small><strong>{analytics.areas.length}</strong></span>
      <span><small>Aktívni ľudia</small><strong>{analytics.activePeople}</strong></span>
      <span><small>Jediný R</small><strong>{analytics.singleR}</strong></span>
    </div>
    <div className="raci-department-highlight">
      <div className="avatar">{topExecutor?.id || analytics.code}</div>
      <div><small>Najviac praktických rolí R</small><strong>{topExecutor?.name || '—'}</strong><span>{topExecutor?.R || 0} procesov · {topExecutor?.participationPercent || 0}% zapojenie</span></div>
    </div>
  </article>
}

export function RaciPeopleCards({
  analytics,
  title,
  description,
}: {
  analytics: DepartmentRaciAnalytics
  title?: string
  description?: string
}) {
  const [sort, setSort] = useState<PeopleSort>('R')
  const [search, setSearch] = useState('')
  const sortedPeople = useMemo(
    () => sortPeople(analytics.people, sort).filter((person) =>
      `${person.name} ${person.area}`.toLowerCase().includes(search.toLowerCase()),
    ),
    [analytics.people, search, sort],
  )

  return <div className="raci-people-view">
    {title || description ? <div className="raci-people-heading">
      <div><span className="eyebrow">Odbor {analytics.code} · {analytics.shortName}</span>{title ? <h2>{title}</h2> : null}{description ? <p>{description}</p> : null}</div>
      <Badge tone="info">{analytics.processes} procesov</Badge>
    </div> : null}
    <div className="filter-panel oit-people-sort raci-comparison-people-filter">
      <label><span>Zoradiť podľa</span><select value={sort} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSort(event.target.value as PeopleSort)}><option value="R">Praktické vykonávanie R</option><option value="A">Formálne vlastníctvo A</option><option value="spof">Jediný vykonávateľ</option><option value="participation">Celkové zapojenie</option></select></label>
      <label><span>Vyhľadávanie</span><div className="search-input"><Icon name="search" size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Meno, pracovisko alebo rola..."/></div></label>
      <span className="result-pill">{sortedPeople.length} pracovníkov</span>
    </div>
    <section className="oit-people-metrics raci-comparison-people-grid">{sortedPeople.map((person) => <article className="panel" key={person.key}>
      <div className="oit-person-title"><div className="avatar">{person.id}</div><div><strong>{person.name}</strong><span>{person.area}</span></div></div>
      <div className="oit-role-metric-grid"><span><small>R · vykonáva</small><b>{person.R}</b></span><span><small>A · zodpovedá</small><b>{person.A}</b></span><span><small>C · konzultuje</small><b>{person.C}</b></span><span><small>I · informovaný</small><b>{person.I}</b></span><span><small>A/R kombinácia</small><b>{person.combinedAR}</b></span><span><small>Jediný R</small><b>{person.uniqueR}</b></span></div>
      <Progress value={person.participationPercent} label="Zapojenie do procesov"/>
    </article>)}</section>
  </div>
}

function RoleDistribution({ departments }: { departments: DepartmentRaciAnalytics[] }) {
  const roles: { role: RaciRole; label: string }[] = [
    { role: 'R', label: 'Praktické vykonávanie' },
    { role: 'A', label: 'Konečná zodpovednosť' },
    { role: 'C', label: 'Odborná konzultácia' },
    { role: 'I', label: 'Informovanie' },
  ]
  const maxValue = Math.max(1, ...departments.flatMap((department) => roles.map(({ role }) => department.roleTotals[role])))

  return <section className="panel raci-role-comparison">
    <div className="panel-heading"><div><span className="eyebrow">Objem rolí</span><h3>Koľko priradení R, A, C a I obsahujú matice</h3></div><Badge tone="info">normalizované kombinácie A/R a R/A</Badge></div>
    <div className="raci-role-comparison-grid">{roles.map(({ role, label }) => <div className="raci-role-comparison-row" key={role}>
      <span className={`raci-role-letter role-${role.toLowerCase()}`}>{role}</span>
      <div className="raci-role-label"><strong>{label}</strong><small>počet rolí v celej matici</small></div>
      {departments.map((department) => <div className="raci-role-department" key={`${department.code}-${role}`}><span><b>{department.code}</b><strong>{department.roleTotals[role]}</strong></span><i><em style={{ width: `${Math.max(2, (department.roleTotals[role] / maxValue) * 100)}%` }}/></i></div>)}
    </div>)}</div>
  </section>
}

function TopPeople({ analytics }: { analytics: DepartmentRaciAnalytics }) {
  const topR = sortPeople(analytics.people, 'R').slice(0, 5)
  const topA = sortPeople(analytics.people, 'A').slice(0, 5)

  return <article className="panel raci-comparison-ranking">
    <div className="panel-heading"><div><span className="eyebrow">Odbor {analytics.code} · {analytics.shortName}</span><h3>Najsilnejšie roly v matici</h3></div><Badge tone="purple">{analytics.activePeople} aktívnych</Badge></div>
    <div className="raci-comparison-ranking-columns">
      <div><h4>Praktické vykonávanie R</h4>{topR.map((person, index) => <div key={`r-${person.key}`}><span>{index + 1}</span><div><strong>{person.name}</strong><small>{person.participationPercent}% zapojenie · {person.uniqueR}× jediný R</small></div><b>{person.R}</b></div>)}</div>
      <div><h4>Konečná zodpovednosť A</h4>{topA.map((person, index) => <div key={`a-${person.key}`}><span>{index + 1}</span><div><strong>{person.name}</strong><small>{person.combinedAR}× spojené A/R</small></div><b>{person.A}</b></div>)}</div>
    </div>
  </article>
}

export default function RaciDepartmentComparison({
  orisItems,
  orisEmployees = [],
}: {
  orisItems: RaciItem[]
  orisEmployees?: Employee[]
}) {
  const oit = useMemo(() => buildOitRaciAnalytics(), [])
  const oris = useMemo(() => buildOrisRaciAnalytics(orisItems, orisEmployees), [orisItems, orisEmployees])
  const departments = [oit, oris]
  const [peopleDepartment, setPeopleDepartment] = useState<'3.1' | '3.2'>('3.1')
  const selectedPeople = peopleDepartment === '3.1' ? oit : oris

  const comparisonRows = [
    { label: 'Procesy / agendy', oit: oit.processes, oris: oris.processes, note: 'Rozsah evidencie v zdrojovej RACI matici.' },
    { label: 'Odborné oblasti', oit: oit.areas.length, oris: oris.areas.length, note: 'Tematické členenie procesov.' },
    { label: 'Interní pracovníci', oit: oit.internalPeople, oris: oris.internalPeople, note: 'Ľudia zahrnutí do osobného pohľadu.' },
    { label: 'Formálne úplné', oit: `${oit.formalComplete}/${oit.processes}`, oris: `${oris.formalComplete}/${oris.processes}`, note: 'Presne jeden A a minimálne jeden R.' },
    { label: 'Chýba A', oit: oit.missingA, oris: oris.missingA, note: 'Proces bez konečného vlastníka.' },
    { label: 'Viac A', oit: oit.multipleA, oris: oris.multipleA, note: 'Nejednoznačná konečná zodpovednosť.' },
    { label: 'Chýba R', oit: oit.missingR, oris: oris.missingR, note: 'Proces bez praktického vykonávateľa.' },
    { label: 'Jediný R', oit: oit.singleR, oris: oris.singleR, note: 'Kontinuitné riziko a závislosť od jednotlivca.' },
    { label: 'Spojené A/R', oit: oit.combinedAR, oris: oris.combinedAR, note: 'Výkon aj konečná zodpovednosť na jednej osobe.' },
  ]

  return <div className="raci-comparison-view">
    <section className="raci-comparison-hero">
      <div><span>Spoločný pohľad RACI</span><h2>Porovnanie odborov 3.1 a 3.2</h2><p>Obe matice používajú rovnakú logiku RACI, ale opisujú odlišný typ práce. OIT 3.1 ide viac do detailu infraštruktúrnych procesov; ORIS 3.2 pokrýva portfólio informačných systémov, webov, projektov a riadenia.</p></div>
      <div><strong>{oit.processes + oris.processes}</strong><span>procesov spolu</span><small>{oit.activePeople + oris.activePeople} aktívnych interných účastníkov</small></div>
    </section>

    <section className="raci-department-summary-grid"><DepartmentSummary analytics={oit}/><DepartmentSummary analytics={oris}/></section>

    <section className="panel raci-comparison-table-panel">
      <div className="panel-heading"><div><span className="eyebrow">Porovnávacia tabuľka</span><h3>Čo majú oba odbory v rámci RACI</h3></div><Badge tone="info">aktuálne dáta aplikácie</Badge></div>
      <div className="raci-comparison-table-shell"><table className="raci-comparison-table"><thead><tr><th>Ukazovateľ</th><th>3.1 · OIT</th><th>3.2 · ORIS</th><th>Význam</th></tr></thead><tbody>{comparisonRows.map((row) => <tr key={row.label}><td><strong>{row.label}</strong></td><td>{row.label === 'Chýba A' || row.label === 'Viac A' || row.label === 'Chýba R' ? <Badge tone={metricTone(Number(row.oit))}>{row.oit}</Badge> : <b>{row.oit}</b>}</td><td>{row.label === 'Chýba A' || row.label === 'Viac A' || row.label === 'Chýba R' ? <Badge tone={metricTone(Number(row.oris))}>{row.oris}</Badge> : <b>{row.oris}</b>}</td><td>{row.note}</td></tr>)}</tbody></table></div>
    </section>

    <RoleDistribution departments={departments}/>

    <section className="raci-comparison-areas-grid">{departments.map((department) => <article className="panel" key={department.code}><div className="panel-heading"><div><span className="eyebrow">Odbor {department.code}</span><h3>Oblasti v RACI matici</h3></div><Badge tone="neutral">{department.areas.length} oblastí</Badge></div><div className="raci-area-chip-list">{department.areas.map((area) => <span key={area}>{area}</span>)}</div>{department.externalAssignments > 0 ? <p className="raci-external-note"><Icon name="substitute" size={16}/> Matica obsahuje {department.externalAssignments} priradení na externých alebo medziútvarových účastníkov.</p> : null}</article>)}</section>

    <section className="raci-comparison-ranking-grid"><TopPeople analytics={oit}/><TopPeople analytics={oris}/></section>

    <section className="raci-comparison-people-section">
      <div className="raci-comparison-people-switch">
        <div><span className="eyebrow">Detail podľa pracovníkov</span><h2>Rovnaký pohľad na ľudí v oboch odboroch</h2><p>Prepnite odbor a porovnajte praktické vykonávanie R, vlastníctvo A, konzultácie C, informovanie I a procesy s jediným vykonávateľom.</p></div>
        <div role="tablist" aria-label="Výber odboru pre osobný pohľad"><button className={peopleDepartment === '3.1' ? 'active' : ''} onClick={() => setPeopleDepartment('3.1')}>3.1 · OIT <span>{oit.activePeople}</span></button><button className={peopleDepartment === '3.2' ? 'active' : ''} onClick={() => setPeopleDepartment('3.2')}>3.2 · ORIS <span>{oris.activePeople}</span></button></div>
      </div>
      <RaciPeopleCards analytics={selectedPeople}/>
    </section>
  </div>
}
