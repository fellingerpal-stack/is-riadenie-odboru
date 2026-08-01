import type { AppState } from '../types'
import { Badge, Icon, PageHeader, Progress } from '../components/UI'

function riskTone(priority: string) {
  return priority === 'Kritická' ? 'danger' : priority === 'Vysoká' ? 'warning' : 'info'
}

function daysFromToday(value: string) {
  if (!value) return null
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00`)
  const due = new Date(`${value}T12:00:00`)
  if (Number.isNaN(due.getTime())) return null
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

function taskDueLabel(due: string) {
  const days = daysFromToday(due)
  if (days === null) return 'bez termínu'
  if (days < 0) return `${Math.abs(days)} d. po termíne`
  if (days === 0) return 'termín dnes'
  if (days <= 7) return `o ${days} dní`
  return new Date(`${due}T12:00:00`).toLocaleDateString('sk-SK')
}

export default function Dashboard({ state, go }: { state: AppState; go: (view: string) => void }) {
  const raciIssues = state.raci.filter((item) => {
    const vals = Object.values(item.assignments)
    const a = vals.filter((v) => v === 'A' || v === 'R/A').length
    const r = vals.filter((v) => v === 'R' || v === 'R/A').length
    return a !== 1 || r === 0
  }).length
  const criticalServices = state.services.filter((s) => s.criticality === 'Kritická')
  const withoutDeputy = criticalServices.filter((s) => !s.deputy).length
  const openRisks = state.risks.filter((r) => r.status !== 'Ukončené')
  const overloaded = state.capacity.filter((c) => c.management + c.operations + c.projects + c.helpdesk + c.other > 100).length
  const activeTasks = state.tasks.filter((t) => t.status !== 'Hotovo')
  const openTasks = activeTasks.length
  const overdueTasks = activeTasks.filter((t) => {
    const days = daysFromToday(t.due)
    return days !== null && days < 0
  })
  const dueSoonTasks = activeTasks.filter((t) => {
    const days = daysFromToday(t.due)
    return days !== null && days >= 0 && days <= 7
  })
  const confirmedEmployees = state.employees.filter((e) => e.status === 'Schválené').length
  const topRisks = [...openRisks].sort((a,b) => (b.probability*b.impactScore)-(a.probability*a.impactScore)).slice(0,4)
  const recentTasks = [...activeTasks]
    .sort((a, b) => {
      const aDays = daysFromToday(a.due)
      const bDays = daysFromToday(b.due)
      return (aDays ?? 99999) - (bDays ?? 99999)
    })
    .slice(0, 5)

  const kpis = [
    { label: 'Zamestnanci', value: state.employees.length, detail: `${confirmedEmployees} potvrdených profilov`, icon: 'people' as const, view: 'people', tone: 'blue' },
    { label: 'RACI procesy', value: state.raci.length, detail: `${raciIssues} riadkov na kontrolu`, icon: 'matrix' as const, view: 'raci', tone: raciIssues ? 'orange' : 'green' },
    { label: 'Kritické služby', value: criticalServices.length, detail: `${withoutDeputy} bez zástupcu`, icon: 'services' as const, view: 'services', tone: withoutDeputy ? 'red' : 'green' },
    { label: 'Otvorené riziká', value: openRisks.length, detail: `${openRisks.filter(r => r.priority === 'Kritická').length} kritických`, icon: 'risk' as const, view: 'risks', tone: 'red' },
    { label: 'Aktívne úlohy', value: openTasks, detail: `${overdueTasks.length} po termíne · ${dueSoonTasks.length} do 7 dní`, icon: 'tasks' as const, view: 'work', tone: overdueTasks.length ? 'orange' : 'purple' },
    { label: 'Kapacita nad 100 %', value: overloaded, detail: overloaded ? 'vyžaduje korekciu' : 'bez prekročenia', icon: 'capacity' as const, view: 'capacity', tone: overloaded ? 'orange' : 'green' },
  ]

  return <>
    <PageHeader eyebrow="Manažérsky cockpit" title="Riadenie odboru v jednom obraze" description="RACI, vlastníctvo služieb, zastupiteľnosť, kapacity, riziká a realizácia opatrení." actions={<button className="button button-primary" onClick={() => go('work')}><Icon name="plus"/> Nová úloha</button>} />

    <section className="hero-panel">
      <div>
        <Badge tone="info">Pracovný návrh • stav k {new Date(state.meta.sourceDate).toLocaleDateString('sk-SK')}</Badge>
        <h2>Najväčšou prioritou je odstrániť závislosť kritických služieb od jednotlivcov.</h2>
        <p>Údaje vychádzajú z manažérskej syntézy fungovania odboru a predvyplnenej RACI matice. V aplikácii ich možno priebežne potvrdzovať, meniť a dopĺňať.</p>
      </div>
      <div className="hero-score">
        <span>Pripravenosť riadenia</span>
        <strong>{Math.max(18, 100 - raciIssues*2 - withoutDeputy*5 - openRisks.filter(r=>r.priority==='Kritická').length*3)}%</strong>
        <small>orientačný indikátor podľa otvorených medzier</small>
      </div>
    </section>

    <section className="kpi-grid">
      {kpis.map((kpi) => <button key={kpi.label} className={`kpi-card kpi-${kpi.tone}`} onClick={() => go(kpi.view)}>
        <div className="kpi-icon"><Icon name={kpi.icon} size={22}/></div>
        <div><span>{kpi.label}</span><strong>{kpi.value}</strong><small>{kpi.detail}</small></div>
        <Icon name="chevron" className="kpi-arrow"/>
      </button>)}
    </section>

    <section className="dashboard-grid">
      <article className="panel span-7">
        <div className="panel-heading"><div><span className="eyebrow">Priorita vedenia</span><h3>Najvyššie riziká</h3></div><button className="text-button" onClick={() => go('risks')}>Všetky riziká <Icon name="arrow" size={16}/></button></div>
        <div className="risk-list">
          {topRisks.map((risk) => <div className="risk-row" key={risk.id}>
            <div className="risk-score">{risk.probability * risk.impactScore}</div>
            <div className="risk-main"><div><Badge tone={riskTone(risk.priority)}>{risk.priority}</Badge><span className="muted">{risk.area}</span></div><strong>{risk.risk}</strong><small>{risk.owner || 'Vlastník neurčený'}</small></div>
          </div>)}
        </div>
      </article>

      <article className="panel span-5">
        <div className="panel-heading"><div><span className="eyebrow">Realizácia</span><h3>Otvorené úlohy</h3></div><button className="text-button" onClick={() => go('work')}>Backlog <Icon name="arrow" size={16}/></button></div>
        <div className="task-mini-list">
          {recentTasks.map((task) => {
            const overdue = (daysFromToday(task.due) ?? 0) < 0
            return <div className={`task-mini ${overdue ? 'task-mini-overdue' : ''}`} key={task.id}><span className={`priority-dot priority-${task.priority.toLowerCase()}`}/><div><strong>{task.title}</strong><small>{task.owner || 'Bez vlastníka'} · {taskDueLabel(task.due)}</small></div></div>
          })}
        </div>
      </article>

      <article className="panel span-7">
        <div className="panel-heading"><div><span className="eyebrow">Kontinuita</span><h3>Zastupiteľnosť kritických agend</h3></div><button className="text-button" onClick={() => go('substitutions')}>Detail <Icon name="arrow" size={16}/></button></div>
        <div className="substitution-overview">
          {state.substitutions.slice(0,5).map((item) => {
            const points = [Boolean(item.confirmedDeputy), Boolean(item.runbook), Boolean(item.location), Boolean(item.testDate)].filter(Boolean).length
            return <div key={item.id} className="substitution-line"><div><strong>{item.agenda}</strong><small>{item.owner}</small></div><Progress value={points*25} label={item.currentState}/></div>
          })}
        </div>
      </article>

      <article className="panel span-5">
        <div className="panel-heading"><div><span className="eyebrow">Rozhodovanie</span><h3>Otvorené rozhodnutia</h3></div><button className="text-button" onClick={() => go('decisions')}>Prehľad <Icon name="arrow" size={16}/></button></div>
        <div className="decision-list">
          {state.decisions.slice(0,4).map((d) => <div className="decision-row" key={d.id}><span>{d.id}</span><div><strong>{d.topic}</strong><small>{d.question}</small></div></div>)}
        </div>
      </article>
    </section>
  </>
}
