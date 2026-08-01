import fs from 'node:fs'

const target = 'src/App.tsx'
const source = 'App.helpdesk.tsx'
const required = [
  target,
  source,
  'src/views/Helpdesk.tsx',
  'src/views/Helpdesk.css',
]

const missing = required.filter((file) => !fs.existsSync(file))
if (missing.length > 0) {
  console.error('CHYBA: Chybaju tieto subory:')
  for (const file of missing) console.error(` - ${file}`)
  console.error('Spustite skript v koreni projektu, vedla package.json.')
  process.exit(1)
}

const replacement = fs.readFileSync(source, 'utf8')
const checks = [
  ["import Helpdesk", replacement.includes("import Helpdesk from './views/Helpdesk'")],
  ["ViewKey helpdesk", replacement.includes("|'helpdesk'|")],
  ["menu Helpdesk", replacement.includes("label:'Helpdesk / ServiceDesk'")],
  ["render Helpdesk", replacement.includes("view==='helpdesk'")],
]

if (checks.some(([, ok]) => !ok)) {
  console.error('CHYBA: Dodany App.helpdesk.tsx nie je kompletny.')
  for (const [name, ok] of checks) console.error(`${ok ? 'OK' : 'CHYBA'}: ${name}`)
  process.exit(1)
}

const backup = 'src/App.tsx.before-helpdesk-04e.bak'
fs.copyFileSync(target, backup)
fs.writeFileSync(target, replacement, 'utf8')

console.log('HOTOVO: src/App.tsx bol nahradeny verziou s Helpdeskom.')
console.log(`Zaloha povodneho suboru: ${backup}`)
for (const [name, ok] of checks) console.log(`${ok ? 'OK' : 'CHYBA'}: ${name}`)
console.log('Teraz pockajte na Vite reload alebo spustite: npm run dev')
