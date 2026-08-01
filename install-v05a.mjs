import fs from 'node:fs'
import path from 'node:path'

const sourceRoot = 'release-v05a'
const files = [
  'src/App.tsx',
  'src/lib/storage.ts',
  'src/views/Helpdesk.tsx',
]

const missing = files.filter((file) => !fs.existsSync(path.join(sourceRoot, file)))
if (missing.length) {
  console.error('CHYBA: V balíku chýbajú súbory:')
  missing.forEach((file) => console.error(` - ${file}`))
  process.exit(1)
}

if (!fs.existsSync('src/App.tsx') || !fs.existsSync('package.json')) {
  console.error('CHYBA: Skript spustite v koreni projektu vedľa package.json.')
  process.exit(1)
}

const backupRoot = `backup-before-v05a-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}`
fs.mkdirSync(backupRoot, { recursive: true })

for (const file of files) {
  const source = path.join(sourceRoot, file)
  const target = file
  if (fs.existsSync(target)) {
    const backup = path.join(backupRoot, file)
    fs.mkdirSync(path.dirname(backup), { recursive: true })
    fs.copyFileSync(target, backup)
  }
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(source, target)
  console.log(`OK: ${target}`)
}

const helpdesk = fs.readFileSync('src/views/Helpdesk.tsx', 'utf8')
const storage = fs.readFileSync('src/lib/storage.ts', 'utf8')
const app = fs.readFileSync('src/App.tsx', 'utf8')
const checks = [
  ['Ochrana Helpdesku', helpdesk.includes('fallbackPolicies') && helpdesk.includes('tickets = Array.isArray(tickets)')],
  ['Bezpečná migrácia', storage.includes("CURRENT_VERSION = '0.5.1'") && storage.includes('const source = (ticket ?? {})')],
  ['Bezpečné props', app.includes('tickets={Array.isArray(state.tickets)?state.tickets:[]}')],
]

console.log(`\nZáloha pôvodných súborov: ${backupRoot}`)
for (const [name, ok] of checks) console.log(`${ok ? 'OK' : 'CHYBA'}: ${name}`)
if (checks.some(([, ok]) => !ok)) process.exit(1)
console.log('\nHOTOVO: FIX 0.5A bol nainštalovaný. Spustite npm run dev a vykonajte tvrdé obnovenie Ctrl+F5.')
