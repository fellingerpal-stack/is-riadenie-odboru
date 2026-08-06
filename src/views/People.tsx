import { useMemo, useState, type ChangeEvent } from 'react'
import type { CapacityRow, Employee, RaciItem } from '../types'
import { Badge, Empty, Field, Icon, Modal, PageHeader, Progress } from '../components/UI'

function tone(status: string) {
  return status === 'Schválené' ? 'success' : status.includes('opravu') ? 'danger' : 'warning'
}

function splitRoles(value: string) {
  return value.split('/').map(part => part.trim()).filter(Boolean)
}

function roleCount(item: RaciItem, role: string) {
  return Object.values(item.assignments).filter(value => splitRoles(String(value)).includes(role)).length
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('')
}

type View = 'profiles' | 'performance'
type SortKey = 'R' | 'A' | 'spof' | 'participation'

export default function People({
  employees,
  raci,
  capacity,
  canEdit,
  onChange,
}: {
  employees: Employee[]
  raci: RaciItem[]
  capacity: CapacityRow[]
  canEdit: boolean
  onChange: (employees: Employee[]) => void
}) {
  const [view, setView] = useState<View>('performance')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('R')
  const [selected, setSelected] = useState<Employee | null>(null)
  const [editing, setEditing] = useState<Employee | null>(null)
  const filtered = useMemo(() => employees.filter(employee => `${employee.name} ${employee.position} ${employee.roleType} ${employee.systems} ${employee.responsibilities}`.toLowerCase().includes(search.toLowerCase())), [employees, search])

  const roleStats = useMemo(() => employees.map(employee => {
    const values = raci.map(item => String(item.assignments[employee.name] || ''))
    const has = (role: string, value: string) => splitRoles(value).includes(role)
    const capacityRow = capacity.find(row => row.employee === employee.name)
    return {
      employee,
      A: values.filter(value => has('A', value)).length,
      R: values.filter(value => has('R', value)).length,
      C: values.filter(value => has('C', value)).length,
      I: values.filter(value => has('I', value)).length,
      combinedAR: values.filter(value => has('A', value) && has('R', value)).length,
      uniqueR: raci.filter(item => has('R', String(item.assignments[employee.name] || '')) && roleCount(item, 'R') === 1).length,
      participation: values.filter(Boolean).length,
      capacityRow,
    }
  }), [employees, raci, capacity])

  const sortedRoleStats = useMemo(() => [...roleStats]
    .filter(stat => `${stat.employee.name} ${stat.employee.position} ${stat.employee.roleType}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'spof' ? b.uniqueR - a.uniqueR : sort === 'participation' ? b.participation - a.participation : b[sort] - a[sort] || a.employee.name.localeCompare(b.employee.name, 'sk')), [roleStats, search, sort])

  const topExecutor = [...roleStats].sort((a, b) => b.R - a.R)[0]
  const singlePoints = roleStats.reduce((sum, stat) => sum + stat.uniqueR, 0)
  const activeParticipants = roleStats.filter(stat => stat.participation > 0).length

  function save() {
    if (!editing) return
    onChange(employees.map(employee => employee.id === editing.id ? editing : employee))
    setSelected(editing)
    setEditing(null)
  }

  return <>
    <PageHeader eyebrow="Odbor 3.2 · organizácia" title="Ľudia a výkon rolí ORIS" description="Profily pracovníkov sú prepojené s RACI maticou. Pohľad oddeľuje formálnu zodpovednosť A od praktického vykonávania R, konzultovania C a informovania I." />
    <div className="view-tabs people-view-tabs">
      <button className={view === 'performance' ? 'active' : ''} onClick={() => setView('performance')}><Icon name="matrix"/>Ľudia a výkon rolí <b>{activeParticipants}</b></button>
      <button className={view === 'profiles' ? 'active' : ''} onClick={() => setView('profiles')}><Icon name="people"/>Profily pracovníkov <b>{employees.length}</b></button>
    </div>

    {view === 'profiles' && <>
      <div className="toolbar"><div className="search-box"><Icon name="search" size={18}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Hľadať osobu, rolu, systém alebo projekt…"/></div><Badge tone="info">{filtered.length} z {employees.length}</Badge></div>
      {filtered.length === 0 ? <Empty title="Nič sa nenašlo" text="Skús upraviť vyhľadávanie."/> : <div className="people-grid">
        {filtered.map(employee => <button className="person-card" key={employee.id} onClick={() => setSelected(employee)}>
          <div className="person-top"><div className="avatar">{initials(employee.name)}</div><Badge tone={tone(employee.status)}>{employee.status}</Badge></div>
          <h3>{employee.name}</h3><p>{employee.position || employee.roleType || 'Rola zatiaľ nepotvrdená'}</p>
          <div className="person-meta"><span><Icon name="projects" size={15}/>{employee.systems || 'Systémy nedoplnené'}</span><span><Icon name="substitute" size={15}/>{employee.deputy || 'Zástupca neurčený'}</span></div>
          <div className="card-link">Zobraziť profil <Icon name="arrow" size={15}/></div>
        </button>)}
      </div>}
    </>}

    {view === 'performance' && <>
      <div className="raci-reading-note people-role-note"><Icon name="warning" size={19}/><div><strong>Počty rolí nie sú odpracované hodiny</strong><span>R vyjadruje praktické vykonávanie procesu, A konečnú zodpovednosť, C konzultáciu a I informovanie. Pohľad pomáha nájsť koncentráciu know-how, preťažené roly a procesy s jediným vykonávateľom.</span></div></div>
      <section className="kpi-grid oit-kpi-grid people-role-kpis">
        <article className="kpi-card"><span>RACI PROCESY</span><strong>{raci.length}</strong><small>procesy odboru 3.2</small></article>
        <article className="kpi-card"><span>AKTÍVNI ÚČASTNÍCI</span><strong>{activeParticipants}</strong><small>pracovníci s aspoň jednou rolou</small></article>
        <article className="kpi-card"><span>NAJVIAC R</span><strong>{topExecutor?.R || 0}</strong><small>{topExecutor?.employee.name || '—'}</small></article>
        <article className="kpi-card"><span>JEDINÝ VYKONÁVATEĽ</span><strong>{singlePoints}</strong><small>potenciálne kontinuitné riziká</small></article>
      </section>
      <div className="filter-panel oit-people-sort people-role-filter">
        <label><span>Zoradiť podľa</span><select value={sort} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSort(event.target.value as SortKey)}><option value="R">Praktické vykonávanie R</option><option value="A">Formálne vlastníctvo A</option><option value="spof">Jediný vykonávateľ</option><option value="participation">Celkové zapojenie</option></select></label>
        <label><span>Vyhľadávanie</span><div className="search-input"><Icon name="search" size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Meno, pozícia alebo rola..."/></div></label>
        <span className="result-pill">{sortedRoleStats.length} pracovníkov</span>
      </div>
      <section className="oit-people-metrics oris-people-metrics">{sortedRoleStats.map(stat => {
        const plan = stat.capacityRow
        const planTotal = plan ? plan.management + plan.operations + plan.projects + plan.helpdesk + plan.other : 0
        return <article className="panel" key={stat.employee.id}>
          <div className="oit-person-title"><div className="avatar">{initials(stat.employee.name)}</div><div><strong>{stat.employee.name}</strong><span>{stat.employee.position || stat.employee.roleType || 'Pozícia na potvrdenie'}</span></div></div>
          <div className="oit-role-metric-grid"><span><small>R · vykonáva</small><b>{stat.R}</b></span><span><small>A · zodpovedá</small><b>{stat.A}</b></span><span><small>C · konzultuje</small><b>{stat.C}</b></span><span><small>I · informovaný</small><b>{stat.I}</b></span><span><small>A/R kombinácia</small><b>{stat.combinedAR}</b></span><span><small>Jediný R</small><b>{stat.uniqueR}</b></span></div>
          <Progress value={raci.length ? Math.round(stat.participation / raci.length * 100) : 0} label="Zapojenie do procesov"/>
          {plan && <div className="people-capacity-strip"><small>Kapacitný plán {planTotal}%</small><span><b>Riadenie {plan.management}%</b><b>Prevádzka {plan.operations}%</b><b>Projekty {plan.projects}%</b><b>Helpdesk {plan.helpdesk}%</b></span></div>}
          <button className="text-button people-role-profile" onClick={() => setSelected(stat.employee)}>Otvoriť profil <Icon name="arrow" size={14}/></button>
        </article>
      })}</section>
    </>}

    {selected && <Modal title={selected.name} onClose={() => setSelected(null)} wide>
      <div className="profile-header"><div className="avatar avatar-large">{initials(selected.name)}</div><div><Badge tone={tone(selected.status)}>{selected.status}</Badge><h3>{selected.position || 'Pozícia nepotvrdená'}</h3><p>{selected.roleType}</p></div>{canEdit && <button className="button button-secondary profile-edit" onClick={() => setEditing({...selected})}><Icon name="edit"/> Upraviť</button>}</div>
      <div className="detail-grid">
        <section><h4>Hlavné zodpovednosti</h4><p>{selected.responsibilities || 'Nedoplnené'}</p></section>
        <section><h4>Systémy a projekty</h4><p>{selected.systems || 'Nedoplnené'}</p></section>
        <section><h4>Samostatne rozhoduje o</h4><p>{selected.decides || 'Nedoplnené'}</p></section>
        <section><h4>Schválenie vyžaduje pri</h4><p>{selected.needsApproval || 'Nedoplnené'}</p></section>
        <section><h4>Hlavné výstupy</h4><p>{selected.outputs || 'Nedoplnené'}</p></section>
        <section><h4>Zástupca</h4><p>{selected.deputy || 'Neurčený'}</p></section>
        <section className="full"><h4>Manažérska poznámka</h4><p>{selected.note || 'Bez poznámky'}</p></section>
      </div>
    </Modal>}

    {editing && <Modal title={`Upraviť profil: ${editing.name}`} onClose={() => setEditing(null)} wide>
      <div className="form-grid">
        <Field label="Formálna pozícia"><input value={editing.position} onChange={event => setEditing({...editing, position: event.target.value})}/></Field>
        <Field label="Typ roly"><input value={editing.roleType} onChange={event => setEditing({...editing, roleType: event.target.value})}/></Field>
        <Field label="Stav potvrdenia"><select value={editing.status} onChange={event => setEditing({...editing, status: event.target.value})}><option>Na potvrdenie</option><option>Rozpracované</option><option>Schválené</option><option>Vrátiť na opravu</option></select></Field>
        <Field label="Priamy nadriadený"><input value={editing.manager} onChange={event => setEditing({...editing, manager: event.target.value})}/></Field>
        <Field label="Zástupca"><input value={editing.deputy} onChange={event => setEditing({...editing, deputy: event.target.value})}/></Field>
        <Field label="Dokumentácia"><input value={editing.documentation} onChange={event => setEditing({...editing, documentation: event.target.value})}/></Field>
        <Field label="Hlavné zodpovednosti"><textarea value={editing.responsibilities} onChange={event => setEditing({...editing, responsibilities: event.target.value})}/></Field>
        <Field label="Systémy / projekty"><textarea value={editing.systems} onChange={event => setEditing({...editing, systems: event.target.value})}/></Field>
        <Field label="Samostatne rozhoduje o"><textarea value={editing.decides} onChange={event => setEditing({...editing, decides: event.target.value})}/></Field>
        <Field label="Vyžaduje schválenie pri"><textarea value={editing.needsApproval} onChange={event => setEditing({...editing, needsApproval: event.target.value})}/></Field>
        <Field label="Hlavné výstupy"><textarea value={editing.outputs} onChange={event => setEditing({...editing, outputs: event.target.value})}/></Field>
        <Field label="Poznámka"><textarea value={editing.note} onChange={event => setEditing({...editing, note: event.target.value})}/></Field>
      </div>
      <div className="modal-actions"><button className="button button-ghost" onClick={() => setEditing(null)}>Zrušiť</button><button className="button button-primary" onClick={save}><Icon name="check"/> Uložiť</button></div>
    </Modal>}
  </>
}
