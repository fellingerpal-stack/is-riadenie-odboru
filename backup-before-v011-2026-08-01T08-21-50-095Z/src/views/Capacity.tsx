import type { CapacityRow } from '../types'
import { Badge, Icon, PageHeader, Progress } from '../components/UI'

const fields: {key:keyof CapacityRow; label:string}[]=[{key:'management',label:'Riadenie'},{key:'operations',label:'Prevádzka'},{key:'projects',label:'Projekty'},{key:'helpdesk',label:'Helpdesk'},{key:'other',label:'Iné'}]

export default function Capacity({ rows, canEdit, onChange }: { rows:CapacityRow[]; canEdit:boolean; onChange:(rows:CapacityRow[])=>void }) {
  function update(employee:string,key:keyof CapacityRow,value:string){const n=Math.max(0,Math.min(200,Number(value)||0));onChange(rows.map(r=>r.employee===employee?{...r,[key]:n}:r))}
  return <>
    <PageHeader eyebrow="FTE a plánovanie" title="Kapacitná matica" description="Orientačné rozdelenie kapacity medzi riadenie, bežnú prevádzku, projekty, Helpdesk a ostatné činnosti." />
    <div className="capacity-summary"><div><Icon name="capacity" size={26}/><span><strong>{rows.filter(r=>r.management+r.operations+r.projects+r.helpdesk+r.other>100).length}</strong> ľudí nad 100 %</span></div><p>Hodnoty sú pracovné odhady. Sezónne špičky a neplánovanú prácu treba evidovať samostatne.</p></div>
    <div className="capacity-list">{rows.map(row=>{const total=row.management+row.operations+row.projects+row.helpdesk+row.other;return <article className={`capacity-card ${total>100?'capacity-over':''}`} key={row.employee}><div className="capacity-person"><div className="avatar">{row.employee.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><h3>{row.employee}</h3><p>{row.note}</p></div><Badge tone={total>100?'danger':total===100?'success':total===0?'warning':'info'}>{total}%</Badge></div><div className="capacity-inputs">{fields.map(f=><label key={String(f.key)}><span>{f.label}</span><div><input disabled={!canEdit} type="number" min="0" max="200" value={Number(row[f.key])||0} onChange={e=>update(row.employee,f.key,e.target.value)}/><small>%</small></div></label>)}</div><Progress value={Math.min(total,100)} label={total>100?`Prekročenie o ${total-100} %`:`Rozdelené ${total} %`}/>{total===0&&<div className="inline-warning"><Icon name="warning" size={16}/> Kapacita zatiaľ nebola vyčíslená.</div>}</article>})}</div>
  </>
}
