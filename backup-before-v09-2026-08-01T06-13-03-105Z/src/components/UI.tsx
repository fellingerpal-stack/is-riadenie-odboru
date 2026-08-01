import type { ReactNode } from 'react'

export type IconName =
  | 'dashboard' | 'people' | 'matrix' | 'services' | 'substitute' | 'capacity'
  | 'projects' | 'tasks' | 'helpdesk' | 'change' | 'problem' | 'iam' | 'cmdb' | 'risk' | 'decision' | 'roadmap' | 'menu' | 'close'
  | 'search' | 'plus' | 'download' | 'upload' | 'refresh' | 'edit' | 'check'
  | 'warning' | 'arrow' | 'lock' | 'database' | 'calendar' | 'user' | 'chevron' | 'trash'

const paths: Record<IconName, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
  people: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  matrix: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></>,
  services: <><path d="M12 2l8 4.5v11L12 22l-8-4.5v-11L12 2z"/><path d="M4.5 6.8L12 11l7.5-4.2M12 11v11"/></>,
  substitute: <><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
  capacity: <><path d="M4 19V9M10 19V5M16 19v-8M22 19V2"/><path d="M2 19h22"/></>,
  projects: <><path d="M3 7h6l2 2h10v11H3z"/><path d="M3 7V4h7l2 3"/></>,
  tasks: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M8 15l2 2 5-5"/></>,
  helpdesk: <><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><path d="M4 13h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2zM20 13h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2z"/><path d="M17 19c0 2-2 3-5 3"/></>,
  change: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="5"/><path d="M8.5 8.5l-2.8-2.8M18.3 18.3l-2.8-2.8M15.5 8.5l2.8-2.8M5.7 18.3l2.8-2.8"/></>,
  problem: <><path d="M8 4h8l4 4v8l-4 4H8l-4-4V8z"/><path d="M9 9l6 6M15 9l-6 6"/></>,
  iam: <><path d="M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M18 8h4M20 6v4"/></>,
  cmdb: <><path d="M4 5h16v5H4zM4 14h16v5H4z"/><path d="M8 7.5h.01M8 16.5h.01M12 7.5h5M12 16.5h5"/></>,
  risk: <><path d="M12 3l10 18H2L12 3z"/><path d="M12 9v5M12 18h.01"/></>,
  decision: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.3 2.37c-.9.33-.8 1.13-.8 1.63M12 17h.01"/></>,
  roadmap: <><path d="M5 20V4M5 6h10l-2 3 2 3H5M9 20h10l-2-3 2-3H9"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  close: <path d="M6 6l12 12M18 6L6 18"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 20h16"/></>,
  upload: <><path d="M12 21V9M7 14l5-5 5 5"/><path d="M4 4h16"/></>,
  refresh: <><path d="M20 7h-6V1"/><path d="M20 7a9 9 0 1 0 2 7"/></>,
  edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></>,
  check: <path d="M5 12l4 4L19 6"/>,
  warning: <><path d="M12 3l10 18H2L12 3z"/><path d="M12 9v5M12 18h.01"/></>,
  arrow: <path d="M5 12h14M14 7l5 5-5 5"/>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  chevron: <path d="M9 18l6-6-6-6"/>,
  trash: <><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/></>,
}

export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral'|'success'|'warning'|'danger'|'info'|'purple' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className={`modal ${wide ? 'modal-wide' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
      <header className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Zavrieť"><Icon name="close" /></button></header>
      <div className="modal-body">{children}</div>
    </section>
  </div>
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="page-header">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>
    {actions && <div className="page-actions">{actions}</div>}
  </div>
}

export function Progress({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0))
  return <div className="progress-wrap"><div className="progress-label"><span>{label}</span><strong>{value}{max === 100 ? '%' : ''}</strong></div><div className="progress"><span style={{ width: `${pct}%` }} /></div></div>
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

export function Empty({ title, text }: { title: string; text: string }) {
  return <div className="empty"><div className="empty-icon"><Icon name="search" size={26}/></div><strong>{title}</strong><p>{text}</p></div>
}
