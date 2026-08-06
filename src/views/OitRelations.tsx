import { useMemo, useState } from 'react'
import { Badge, Empty, Icon, PageHeader, Progress } from '../components/UI'
import { oitData } from '../data/oitData'
import { matchesOitDomain, oitRelationDomains, relationText, type OitRelationDomain } from '../data/oitRelations'
import type { AppState, ChangeRequest, CmdbItem, ProblemRecord, Risk, Service, Ticket } from '../types'

type Go = (view: string) => void
type Tab = 'map' | 'gaps' | 'flow'

const closedTicketStatuses = ['Vyriešená', 'Uzatvorená', 'Zrušená']
const closedChangeStatuses = ['Dokončená', 'Zamietnutá', 'Rollback', 'Zrušená']
const closedProblemStatuses = ['Vyriešený', 'Uzatvorený']

function recordMatches(domain: OitRelationDomain, values: unknown[]) {
  return matchesOitDomain(domain, relationText(...values))
}

function cmdbText(item: CmdbItem) {
  return [item.name, item.type, item.category, item.status, item.criticality, item.businessOwner, item.technicalOwner, item.custodian, item.environment, item.location, item.supplier, item.hostname, item.ipAddress, item.monitoring, item.backup, item.documentation, item.lifecycle, item.note]
}

function serviceText(item: Service) {
  return [item.name, item.category, item.criticality, item.businessOwner, item.technicalOwner, item.primary, item.deputy, item.runbook, item.repository, item.monitoring, item.backup, item.supplierSla, item.note]
}

function ticketText(item: Ticket, service?: Service) {
  return [item.title, item.description, item.category, item.subcategory, item.priority, item.impact, item.assignee, item.internalNote, service?.name, service?.category]
}

function changeText(item: ChangeRequest, service?: Service) {
  return [item.title, item.description, item.category, item.priority, item.risk, item.impact, item.reason, item.affectedSystems, item.implementationPlan, item.rollbackPlan, service?.name, service?.category]
}

function problemText(item: ProblemRecord, service?: Service) {
  return [item.title, item.description, item.team, item.priority, item.impact, item.symptom, item.recurringPattern, item.rootCause, item.workaround, item.permanentSolution, service?.name, service?.category]
}

function riskText(item: Risk) {
  return [item.area, item.risk, item.trigger, item.impact, item.owner, item.measure, item.evidence, item.managementDecision, item.note]
}

function completeness(values: unknown[]) {
  if (!values.length) return 0
  return Math.round(values.filter((value) => String(value ?? '').trim()).length / values.length * 100)
}

function cmdbCompleteness(item: CmdbItem) {
  return completeness([item.technicalOwner, item.location, item.monitoring, item.backup, item.documentation, item.supportEnd])
}

function serviceCompleteness(item: Service) {
  return completeness([item.technicalOwner, item.deputy, item.rto, item.runbook, item.monitoring, item.backup])
}

function relationScore(cmdb: CmdbItem[], services: Service[], tickets: Ticket[], changes: ChangeRequest[], problems: ProblemRecord[], risks: Risk[], relationshipCount: number) {
  const records = [...cmdb.map(cmdbCompleteness), ...services.map(serviceCompleteness)]
  const coverage = records.length ? records.reduce((sum, value) => sum + value, 0) / records.length : 0
  const linkage = Math.min(24, cmdb.length * 2 + services.length * 4 + relationshipCount * 2)
  const penalty = Math.min(35, tickets.length * 2 + problems.length * 6 + risks.length * 5 + changes.filter(change => ['Vysoké', 'Kritické'].includes(change.risk)).length * 3)
  return Math.max(0, Math.min(100, Math.round(20 + coverage * 0.62 + linkage - penalty)))
}

function scoreTone(score: number): 'success' | 'info' | 'warning' | 'danger' {
  if (score >= 75) return 'success'
  if (score >= 55) return 'info'
  if (score >= 35) return 'warning'
  return 'danger'
}

function missingCmdbFields(item: CmdbItem) {
  return [
    !item.technicalOwner && 'technický vlastník',
    !item.location && 'lokalita',
    !item.monitoring && 'monitoring',
    !item.backup && 'zálohovanie',
    !item.documentation && 'dokumentácia',
    !item.supportEnd && 'koniec podpory',
  ].filter(Boolean) as string[]
}

function missingServiceFields(item: Service) {
  return [
    !item.technicalOwner && 'technický vlastník',
    !item.deputy && 'zástupca',
    !item.rto && 'RTO',
    !item.runbook && 'runbook',
    !item.monitoring && 'monitoring',
    !item.backup && 'zálohovanie',
  ].filter(Boolean) as string[]
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function OitRelations({ state, go }: { state: AppState; go: Go }) {
  const [tab, setTab] = useState<Tab>('map')
  const [query, setQuery] = useState('')
  const services = Array.isArray(state.services) ? state.services : []
  const cmdbItems = Array.isArray(state.cmdbItems) ? state.cmdbItems : []
  const tickets = Array.isArray(state.tickets) ? state.tickets : []
  const changes = Array.isArray(state.changes) ? state.changes : []
  const problems = Array.isArray(state.problems) ? state.problems : []
  const risks = Array.isArray(state.risks) ? state.risks : []
  const projects = Array.isArray(state.projects) ? state.projects : []
  const tasks = Array.isArray(state.tasks) ? state.tasks : []
  const serviceById = useMemo(() => new Map(services.map(service => [service.id, service])), [services])
  const cmdbById = useMemo(() => new Map(cmdbItems.map(item => [item.id, item])), [cmdbItems])

  const domains = useMemo(() => oitRelationDomains.map(domain => {
    const domainCmdb = cmdbItems.filter(item => recordMatches(domain, cmdbText(item)))
    const domainServices = services.filter(item => recordMatches(domain, serviceText(item)))
    const serviceIds = new Set(domainServices.map(item => item.id))
    const domainTickets = tickets.filter(item => !closedTicketStatuses.includes(item.status) && (serviceIds.has(item.serviceId) || recordMatches(domain, ticketText(item, serviceById.get(item.serviceId)))))
    const domainChanges = changes.filter(item => !closedChangeStatuses.includes(item.status) && (serviceIds.has(item.serviceId) || recordMatches(domain, changeText(item, serviceById.get(item.serviceId)))))
    const domainProblems = problems.filter(item => !closedProblemStatuses.includes(item.status) && (serviceIds.has(item.serviceId) || recordMatches(domain, problemText(item, serviceById.get(item.serviceId)))))
    const domainRisks = risks.filter(item => item.status !== 'Ukončené' && recordMatches(domain, riskText(item)))
    const domainProjects = projects.filter(item => recordMatches(domain, [item.name, item.type, item.owner, item.sponsor, item.status, item.priority, item.description, item.note]))
    const cmdbIds = new Set(domainCmdb.map(item => item.id))
    const relationshipCount = state.cmdbRelationships.filter(relation => cmdbIds.has(relation.sourceId) || cmdbIds.has(relation.targetId)).length
    const sourceProcesses = oitData.raciAreas.flatMap(area => area.rows).filter(row => recordMatches(domain, [row.process, row.note])).length
    const sourceProjects = oitData.projects.filter(item => recordMatches(domain, [item.name, item.category, item.description, item.note])).length
    const sourceDevices = [...oitData.rackInventory, ...oitData.lamacskaRackInventory].filter(item => item.device && !/voln|voľn/i.test(item.device) && recordMatches(domain, [item.device, item.code, item.rack, item.status, item.note])).length
    const owners = oitData.people.filter(person => domain.ownerIds.includes(person.id))
    const score = relationScore(domainCmdb, domainServices, domainTickets, domainChanges, domainProblems, domainRisks, relationshipCount)
    return { domain, cmdb: domainCmdb, services: domainServices, tickets: domainTickets, changes: domainChanges, problems: domainProblems, risks: domainRisks, projects: domainProjects, relationshipCount, sourceProcesses, sourceProjects, sourceDevices, owners, score }
  }), [changes, cmdbItems, problems, projects, risks, serviceById, services, state.cmdbRelationships, tickets])

  const filteredDomains = domains.filter(item => relationText(item.domain.title, item.domain.description, item.domain.location, item.owners.map(owner => owner.name)).includes(relationText(query)))
  const relevantCmdb = Array.from(new Map(domains.flatMap(domain => domain.cmdb).map(item => [item.id, item])).values())
  const relevantServices = Array.from(new Map(domains.flatMap(domain => domain.services).map(item => [item.id, item])).values())
  const openTickets = Array.from(new Map(domains.flatMap(domain => domain.tickets).map(item => [item.id, item])).values())
  const activeChanges = Array.from(new Map(domains.flatMap(domain => domain.changes).map(item => [item.id, item])).values())
  const openProblems = Array.from(new Map(domains.flatMap(domain => domain.problems).map(item => [item.id, item])).values())
  const highRisks = Array.from(new Map(domains.flatMap(domain => domain.risks.filter(risk => risk.priority === 'Kritická' || risk.priority === 'Vysoká' || risk.probability * risk.impactScore >= 12)).map(item => [item.id, item])).values())
  const averageScore = Math.round(domains.reduce((sum, domain) => sum + domain.score, 0) / Math.max(domains.length, 1))
  const cmdbGaps = relevantCmdb.map(item => ({ item, missing: missingCmdbFields(item) })).filter(entry => entry.missing.length)
  const serviceGaps = relevantServices.map(item => ({ item, missing: missingServiceFields(item) })).filter(entry => entry.missing.length)
  const changeGaps = activeChanges.map(item => ({ item, missing: [!item.implementationPlan && 'implementačný plán', !item.testPlan && 'testovací plán', !item.rollbackPlan && 'rollback plán', !item.communicationPlan && 'komunikačný plán'].filter(Boolean) as string[] })).filter(entry => entry.missing.length)
  const unmanagedRisks = highRisks.filter(item => !item.owner || !item.measure || !item.due)
  const linkedCmdbCount = relevantCmdb.filter(item => item.serviceId || item.linkedTicketIds.length || item.linkedChangeIds.length || state.cmdbRelationships.some(relation => relation.sourceId === item.id || relation.targetId === item.id)).length

  function exportGapRegister() {
    const rows: string[][] = [['Typ', 'ID', 'Názov', 'Chýbajúce údaje', 'Odporúčaný modul']]
    cmdbGaps.forEach(({ item, missing }) => rows.push(['CMDB', item.id, item.name, missing.join(', '), 'CMDB / Aktíva']))
    serviceGaps.forEach(({ item, missing }) => rows.push(['Služba', item.id, item.name, missing.join(', '), 'Služby a systémy']))
    changeGaps.forEach(({ item, missing }) => rows.push(['Zmena', item.id, item.title, missing.join(', '), 'Change management']))
    unmanagedRisks.forEach(item => rows.push(['Riziko', item.id, item.risk, [!item.owner && 'vlastník', !item.measure && 'opatrenie', !item.due && 'termín'].filter(Boolean).join(', '), 'Riziká']))
    downloadCsv('OIT_prevadzkove_medzery.csv', rows)
  }

  return <>
    <PageHeader
      eyebrow="OIT · spoločný prevádzkový model"
      title="Prevádzkové väzby OIT"
      description="Automatický manažérsky pohľad prepája zdrojovú RACI, obe serverové lokality a portfólio OIT so službami, CMDB, ServiceDeskom, problémami, zmenami, projektmi a rizikami v spoločnej aplikácii."
      actions={<button className="button button-secondary" onClick={exportGapRegister}><Icon name="download" size={17}/> Export medzier CSV</button>}
    />

    <section className="oit-link-kpis">
      <article><span>PREPOJENÉ CMDB</span><strong>{relevantCmdb.length}</strong><small>{linkedCmdbCount} má aspoň jednu explicitnú väzbu</small></article>
      <article><span>PREPOJENÉ SLUŽBY</span><strong>{relevantServices.length}</strong><small>automatická zhoda podľa názvov a údajov</small></article>
      <article><span>OTVORENÁ PREVÁDZKA</span><strong>{openTickets.length + openProblems.length + activeChanges.length}</strong><small>{openTickets.length} ticketov · {openProblems.length} problémov · {activeChanges.length} zmien</small></article>
      <article><span>VYSOKÉ RIZIKÁ</span><strong>{highRisks.length}</strong><small>{unmanagedRisks.length} bez úplného riadenia</small></article>
      <article><span>SKÓRE PREPOJENIA</span><strong>{averageScore}%</strong><small>priemer piatich prevádzkových domén</small></article>
    </section>

    <div className="view-tabs oit-tabs oit-link-tabs">
      <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}><Icon name="dashboard"/> Mapa väzieb</button>
      <button className={tab === 'gaps' ? 'active' : ''} onClick={() => setTab('gaps')}><Icon name="warning"/> Krytie a medzery <b>{cmdbGaps.length + serviceGaps.length + changeGaps.length + unmanagedRisks.length}</b></button>
      <button className={tab === 'flow' ? 'active' : ''} onClick={() => setTab('flow')}><Icon name="substitute"/> Prevádzkový tok</button>
    </div>

    {tab === 'map' && <>
      <div className="filter-panel oit-link-search"><label><span>Vyhľadávanie domény</span><div className="search-input"><Icon name="search" size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Sieť, identity, monitoring, lokalita alebo vlastník..."/></div></label><span className="result-pill">{filteredDomains.length} domén</span></div>
      <section className="oit-relation-grid">{filteredDomains.map(item => <article className={`panel oit-relation-card oit-tone-${item.domain.tone}`} key={item.domain.id}>
        <div className="oit-relation-head"><span className="oit-relation-icon"><Icon name={item.domain.icon} size={23}/></span><div><span className="eyebrow">{item.domain.location}</span><h3>{item.domain.title}</h3></div><Badge tone={scoreTone(item.score)}>{item.score}%</Badge></div>
        <p>{item.domain.description}</p>
        <Progress value={item.score} label="Pripravenosť prepojenia"/>
        <div className="oit-relation-counts">
          <span><b>{item.sourceDevices + item.sourceProjects + item.sourceProcesses}</b> zdrojových položiek</span>
          <span><b>{item.cmdb.length}</b> CMDB</span>
          <span><b>{item.services.length}</b> služieb</span>
          <span><b>{item.tickets.length}</b> ticketov</span>
          <span><b>{item.problems.length}</b> problémov</span>
          <span><b>{item.changes.length}</b> zmien</span>
          <span><b>{item.risks.length}</b> rizík</span>
          <span><b>{item.projects.length}</b> projektov</span>
        </div>
        <div className="oit-relation-owners"><small>Odporúčaní technickí vlastníci z RACI OIT</small><div>{item.owners.map(owner => <span key={owner.id}><b>{owner.id}</b>{owner.name}</span>)}</div></div>
        <div className="oit-relation-actions">{item.domain.targetViews.map(target => <button key={target.view} onClick={() => go(target.view)}><Icon name={target.icon} size={15}/>{target.label}</button>)}</div>
      </article>)}</section>
      {!filteredDomains.length && <Empty title="Bez výsledkov" text="Zmeňte vyhľadávanie domény alebo vlastníka."/>}
    </>}

    {tab === 'gaps' && <section className="oit-gap-dashboard">
      <article className="panel"><div className="panel-heading"><div><span className="eyebrow">CMDB</span><h3>Aktíva s neúplnou prevádzkovou evidenciou</h3></div><button className="button button-secondary button-small" onClick={() => go('cmdb')}>Otvoriť CMDB</button></div><div className="oit-gap-register">{cmdbGaps.slice(0, 12).map(({ item, missing }) => <div key={item.id}><span className="oit-gap-type"><Icon name="cmdb" size={16}/></span><span><strong>{item.name}</strong><small>{item.type} · {item.location || 'lokalita neurčená'}</small></span><Badge tone="warning">{missing.join(', ')}</Badge></div>)}</div>{!cmdbGaps.length && <Empty title="CMDB krytie je úplné" text="Pre identifikované OIT aktíva nechýbajú sledované prevádzkové údaje."/>}</article>
      <article className="panel"><div className="panel-heading"><div><span className="eyebrow">Služby</span><h3>Služby bez pripravenosti a zastupovania</h3></div><button className="button button-secondary button-small" onClick={() => go('services')}>Otvoriť služby</button></div><div className="oit-gap-register">{serviceGaps.slice(0, 12).map(({ item, missing }) => <div key={item.id}><span className="oit-gap-type"><Icon name="services" size={16}/></span><span><strong>{item.name}</strong><small>{item.criticality} · {item.technicalOwner || 'vlastník neurčený'}</small></span><Badge tone="warning">{missing.join(', ')}</Badge></div>)}</div>{!serviceGaps.length && <Empty title="Služby sú pripravené" text="Pre identifikované OIT služby nechýbajú sledované údaje."/>}</article>
      <article className="panel"><div className="panel-heading"><div><span className="eyebrow">Change management</span><h3>Aktívne zmeny bez povinných plánov</h3></div><button className="button button-secondary button-small" onClick={() => go('changes')}>Otvoriť zmeny</button></div><div className="oit-gap-register">{changeGaps.slice(0, 12).map(({ item, missing }) => <div key={item.id}><span className="oit-gap-type"><Icon name="change" size={16}/></span><span><strong>{item.title}</strong><small>{item.status} · {item.owner || 'vlastník neurčený'}</small></span><Badge tone="danger">{missing.join(', ')}</Badge></div>)}</div>{!changeGaps.length && <Empty title="Zmenové plány sú doplnené" text="Aktívnym OIT zmenám nechýbajú sledované plány."/>}</article>
      <article className="panel"><div className="panel-heading"><div><span className="eyebrow">Riziká</span><h3>Významné riziká bez úplného riadenia</h3></div><button className="button button-secondary button-small" onClick={() => go('risks')}>Otvoriť riziká</button></div><div className="oit-gap-register">{unmanagedRisks.slice(0, 12).map(item => <div key={item.id}><span className="oit-gap-type"><Icon name="risk" size={16}/></span><span><strong>{item.risk}</strong><small>{item.area} · skóre {item.probability * item.impactScore}</small></span><Badge tone="danger">{[!item.owner && 'vlastník', !item.measure && 'opatrenie', !item.due && 'termín'].filter(Boolean).join(', ')}</Badge></div>)}</div>{!unmanagedRisks.length && <Empty title="Riziká sú riadené" text="Významným OIT rizikám nechýba vlastník, opatrenie ani termín."/>}</article>
    </section>}

    {tab === 'flow' && <>
      <section className="panel oit-flow-panel"><div className="panel-heading"><div><span className="eyebrow">End-to-end model</span><h3>Od technického zdroja po riadiace rozhodnutie</h3></div><Badge tone="info">automatický pohľad</Badge></div><p>Release nevytvára duplicitnú databázu. Zobrazuje, ako majú existujúce registre spolupracovať: technický zdroj OIT sa priradí k službe a CMDB, prevádzkové udalosti sa riadia cez ServiceDesk a Problem management, realizácia cez Change management a projekty a zodpovednosť sa kontroluje cez riziká a RACI.</p><div className="oit-flow-line">
        <button onClick={() => go('oitDc')}><Icon name="database"/><span><strong>Zdroj OIT</strong><small>{oitData.rackInventory.length + oitData.lamacskaRackInventory.length} rackových riadkov · {oitData.projects.length} systémov</small></span></button><i>→</i>
        <button onClick={() => go('services')}><Icon name="services"/><span><strong>Služba</strong><small>{relevantServices.length} rozpoznaných služieb</small></span></button><i>→</i>
        <button onClick={() => go('cmdb')}><Icon name="cmdb"/><span><strong>CMDB</strong><small>{relevantCmdb.length} aktív · {state.cmdbRelationships.length} vzťahov celkom</small></span></button><i>→</i>
        <button onClick={() => go('helpdesk')}><Icon name="helpdesk"/><span><strong>Prevádzka</strong><small>{openTickets.length} ticketov · {openProblems.length} problémov</small></span></button><i>→</i>
        <button onClick={() => go('changes')}><Icon name="change"/><span><strong>Zmena a realizácia</strong><small>{activeChanges.length} zmien · {projects.length} projektov · {tasks.length} úloh</small></span></button><i>→</i>
        <button onClick={() => go('oitRaci')}><Icon name="matrix"/><span><strong>RACI a riziko</strong><small>{highRisks.length} vysokých rizík · {oitData.people.length} OIT rolí</small></span></button>
      </div></section>
      <section className="oit-flow-principles"><article><Icon name="check"/><div><strong>Jeden názov služby</strong><span>Rovnaký názov alebo ID používajte v službe, CMDB, tickete, probléme a zmene.</span></div></article><article><Icon name="check"/><div><strong>Technický vlastník z RACI</strong><span>Každé kritické aktívum a služba majú mať vlastníka a zástupcu zodpovedajúceho RACI OIT.</span></div></article><article><Icon name="check"/><div><strong>Zmena s dopadom na aktíva</strong><span>Každá významná zmena má uvádzať dotknuté systémy, test, rollback a komunikáciu.</span></div></article><article><Icon name="check"/><div><strong>Riziko s dôkazom</strong><span>Riziko sa uzatvára až po doplnení opatrenia, termínu a prevádzkového dôkazu.</span></div></article></section>
    </>}
  </>
}
