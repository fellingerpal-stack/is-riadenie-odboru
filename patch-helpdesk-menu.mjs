import fs from 'node:fs'

const path = 'src/App.tsx'
if (!fs.existsSync(path)) {
  console.error('CHYBA: Nenasiel som src/App.tsx. Spustite skript v koreni projektu.')
  process.exit(1)
}
if (!fs.existsSync('src/views/Helpdesk.tsx')) {
  console.error('CHYBA: Chyba src/views/Helpdesk.tsx. Najprv nahrajte Helpdesk.tsx a Helpdesk.css.')
  process.exit(1)
}

let s = fs.readFileSync(path, 'utf8')
const before = s

if (!s.includes("import Helpdesk from './views/Helpdesk'")) {
  s = s.replace("import Work from './views/Work'", "import Work from './views/Work'\nimport Helpdesk from './views/Helpdesk'")
}

if (!s.includes("|'helpdesk'")) {
  s = s.replace("|'work'|'risks'", "|'work'|'helpdesk'|'risks'")
}

if (!s.includes("key:'helpdesk'")) {
  const workItem = "{key:'work',label:'Projekty a úlohy',icon:'projects',badge:s=>s.tasks.filter(t=>t.status!=='Hotovo').length}"
  const helpdeskItem = "{key:'helpdesk',label:'Helpdesk / ServiceDesk',icon:'services',badge:s=>(((s as any).tickets??[]).filter((t:any)=>!['Vyriešená','Uzatvorená','Zrušená'].includes(t.status)).length)}"
  if (s.includes(workItem)) {
    s = s.replace(workItem, `${workItem},${helpdeskItem}`)
  } else {
    console.error('CHYBA: Nenasiel som polozku Projekty a ulohy v navigacii. App.tsx ma inu strukturu.')
    process.exit(1)
  }
}

if (!s.includes("view==='helpdesk'")) {
  const workRender = "{view==='work'&&<Work projects={state.projects} tasks={state.tasks} employees={state.employees} canEdit={canEdit} onProjectsChange={projects=>setState({...state,projects})} onTasksChange={tasks=>setState({...state,tasks})}/>}"
  const helpdeskRender = "{view==='helpdesk'&&<Helpdesk tickets={((state as any).tickets??[])} services={state.services} employees={state.employees} tasks={state.tasks} canEdit={canEdit} currentUser={displayName} onTicketsChange={(tickets:any)=>setState({...state,tickets} as any)} onTasksChange={tasks=>setState({...state,tasks})}/>}"
  if (s.includes(workRender)) {
    s = s.replace(workRender, `${workRender}\n        ${helpdeskRender}`)
  } else {
    console.error('CHYBA: Nenasiel som vykreslenie modulu Projekty a ulohy. App.tsx ma inu strukturu.')
    process.exit(1)
  }
}

if (s === before) {
  console.log('Helpdesk uz je v src/App.tsx zapisany. Skontrolujte ulozenie a restart Vite.')
} else {
  fs.copyFileSync(path, `${path}.before-helpdesk.bak`)
  fs.writeFileSync(path, s)
  console.log('HOTOVO: src/App.tsx bol upraveny. Zaloha: src/App.tsx.before-helpdesk.bak')
}

const checks = [
  ["import", s.includes("import Helpdesk from './views/Helpdesk'")],
  ["ViewKey", s.includes("|'helpdesk'")],
  ["menu", s.includes("key:'helpdesk'")],
  ["render", s.includes("view==='helpdesk'")],
]
for (const [name, ok] of checks) console.log(`${ok ? 'OK' : 'CHYBA'}: ${name}`)
if (checks.some(([, ok]) => !ok)) process.exit(1)
