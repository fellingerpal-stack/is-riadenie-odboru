import fs from 'node:fs'
import path from 'node:path'

const sourceRoot = 'release-v05'
const files = [
  'package.json',
  'RELEASE_NOTES_0.5.md',
  'STACKBLITZ_UPGRADE_0.5.md',
  'src/App.tsx',
  'src/types.ts',
  'src/data/seed.json',
  'src/lib/storage.ts',
  'src/views/Helpdesk.tsx',
  'src/views/Helpdesk.css',
  'src/styles.css',
  'supabase/schema_servicedesk_v05.sql',
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

const backupRoot = `backup-before-v05-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}`
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

const app = fs.readFileSync('src/App.tsx', 'utf8')
const types = fs.readFileSync('src/types.ts', 'utf8')
const seed = JSON.parse(fs.readFileSync('src/data/seed.json', 'utf8'))
const checks = [
  ['Helpdesk v menu', app.includes("label:'Helpdesk / ServiceDesk'")],
  ['SLA props', app.includes('slaPolicies={state.slaPolicies}')],
  ['ServiceDesk typy', types.includes('export interface SlaPolicy')],
  ['Verzia 0.5.0', seed.meta?.version === '0.5.0'],
  ['Fronty', Array.isArray(seed.supportQueues) && seed.supportQueues.length > 0],
]

console.log(`\nZáloha pôvodných súborov: ${backupRoot}`)
for (const [name, ok] of checks) console.log(`${ok ? 'OK' : 'CHYBA'}: ${name}`)
if (checks.some(([, ok]) => !ok)) process.exit(1)
console.log('\nHOTOVO: release 0.5.0 bol nainštalovaný. Spustite npm run dev a obnovte náhľad.')
