import { useMemo, useState } from 'react'
import type { Employee } from '../types'
import { Badge, Empty, Field, Icon, Modal, PageHeader } from '../components/UI'

function tone(status: string) {
  return status === 'Schválené' ? 'success' : status.includes('opravu') ? 'danger' : 'warning'
}

export default function People({ employees, canEdit, onChange }: { employees: Employee[]; canEdit: boolean; onChange: (employees: Employee[]) => void }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Employee | null>(null)
  const [editing, setEditing] = useState<Employee | null>(null)
  const filtered = useMemo(() => employees.filter(e => `${e.name} ${e.position} ${e.roleType} ${e.systems} ${e.responsibilities}`.toLowerCase().includes(search.toLowerCase())), [employees, search])

  function save() {
    if (!editing) return
    onChange(employees.map(e => e.id === editing.id ? editing : e))
    setSelected(editing)
    setEditing(null)
  }

  return <>
    <PageHeader eyebrow="Organizácia" title="Ľudia, roly a kompetencie" description="Jednotný register zodpovedností, rozhodovacích právomocí, výstupov a zastupovania." />
    <div className="toolbar"><div className="search-box"><Icon name="search" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Hľadať osobu, rolu, systém alebo projekt…"/></div><Badge tone="info">{filtered.length} z {employees.length}</Badge></div>
    {filtered.length === 0 ? <Empty title="Nič sa nenašlo" text="Skús upraviť vyhľadávanie."/> : <div className="people-grid">
      {filtered.map(employee => <button className="person-card" key={employee.id} onClick={() => setSelected(employee)}>
        <div className="person-top"><div className="avatar">{employee.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><Badge tone={tone(employee.status)}>{employee.status}</Badge></div>
        <h3>{employee.name}</h3><p>{employee.position || employee.roleType || 'Rola zatiaľ nepotvrdená'}</p>
        <div className="person-meta"><span><Icon name="projects" size={15}/>{employee.systems || 'Systémy nedoplnené'}</span><span><Icon name="substitute" size={15}/>{employee.deputy || 'Zástupca neurčený'}</span></div>
        <div className="card-link">Zobraziť profil <Icon name="arrow" size={15}/></div>
      </button>)}
    </div>}

    {selected && <Modal title={selected.name} onClose={() => setSelected(null)} wide>
      <div className="profile-header"><div className="avatar avatar-large">{selected.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><Badge tone={tone(selected.status)}>{selected.status}</Badge><h3>{selected.position || 'Pozícia nepotvrdená'}</h3><p>{selected.roleType}</p></div>{canEdit && <button className="button button-secondary profile-edit" onClick={() => setEditing({...selected})}><Icon name="edit"/> Upraviť</button>}</div>
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
        <Field label="Formálna pozícia"><input value={editing.position} onChange={e=>setEditing({...editing,position:e.target.value})}/></Field>
        <Field label="Typ roly"><input value={editing.roleType} onChange={e=>setEditing({...editing,roleType:e.target.value})}/></Field>
        <Field label="Stav potvrdenia"><select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value})}><option>Na potvrdenie</option><option>Rozpracované</option><option>Schválené</option><option>Vrátiť na opravu</option></select></Field>
        <Field label="Priamy nadriadený"><input value={editing.manager} onChange={e=>setEditing({...editing,manager:e.target.value})}/></Field>
        <Field label="Zástupca"><input value={editing.deputy} onChange={e=>setEditing({...editing,deputy:e.target.value})}/></Field>
        <Field label="Dokumentácia"><input value={editing.documentation} onChange={e=>setEditing({...editing,documentation:e.target.value})}/></Field>
        <Field label="Hlavné zodpovednosti"><textarea value={editing.responsibilities} onChange={e=>setEditing({...editing,responsibilities:e.target.value})}/></Field>
        <Field label="Systémy / projekty"><textarea value={editing.systems} onChange={e=>setEditing({...editing,systems:e.target.value})}/></Field>
        <Field label="Samostatne rozhoduje o"><textarea value={editing.decides} onChange={e=>setEditing({...editing,decides:e.target.value})}/></Field>
        <Field label="Vyžaduje schválenie pri"><textarea value={editing.needsApproval} onChange={e=>setEditing({...editing,needsApproval:e.target.value})}/></Field>
        <Field label="Hlavné výstupy"><textarea value={editing.outputs} onChange={e=>setEditing({...editing,outputs:e.target.value})}/></Field>
        <Field label="Poznámka"><textarea value={editing.note} onChange={e=>setEditing({...editing,note:e.target.value})}/></Field>
      </div>
      <div className="modal-actions"><button className="button button-ghost" onClick={()=>setEditing(null)}>Zrušiť</button><button className="button button-primary" onClick={save}><Icon name="check"/> Uložiť</button></div>
    </Modal>}
  </>
}
