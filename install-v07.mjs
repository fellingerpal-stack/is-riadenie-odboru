import fs from 'node:fs'
import path from 'node:path'

const sourceRoot = 'release-v07'
const files = [
  'package.json',
  'RELEASE_NOTES_0.7.md',
  'STACKBLITZ_UPGRADE_0.7.md',
  'src/App.tsx',
  'src/types.ts',
  'src/components/UI.tsx',
  'src/data/seed.json',
  'src/lib/storage.ts',
  'src/views/ProblemManagement.tsx',
  'src/views/ProblemManagement.css',
  'supabase/schema_problem_management_v07.sql',
]

const missing = files.filter((file) => !fs.existsSync(path.join(sourceRoot, file)))
if (missing.length) {
  console.error('CHYBA: V baliku chybaju subory:')
  missing.forEach((file) => console.error(` - ${file}`))
  process.exit(1)
}

if (!fs.existsSync('src/App.tsx') || !fs.existsSync('package.json')) {
  console.error('CHYBA: Skript spustite v koreni projektu vedla package.json.')
  process.exit(1)
}

const backupRoot = `backup-before-v07-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}`
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
const ui = fs.readFileSync('src/components/UI.tsx', 'utf8')
const storage = fs.readFileSync('src/lib/storage.ts', 'utf8')
const seed = JSON.parse(fs.readFileSync('src/data/seed.json', 'utf8'))
const checks = [
  ['Problem management v menu', app.includes("label:'Problem management'")],
  ['Problem management obrazovka', app.includes("view==='problems'")],
  ['Problem typy', types.includes('export interface ProblemRecord')],
  ['Problem ikona', ui.includes('problem:')],
  ['Migracia problemov', storage.includes('migrateProblem')],
  ['Verzia 0.7.0', seed.meta?.version === '0.7.0'],
  ['Vzorove problemy', Array.isArray(seed.problems) && seed.problems.length > 0],
]

console.log(`\nZaloha povodnych suborov: ${backupRoot}`)
for (const [name, ok] of checks) console.log(`${ok ? 'OK' : 'CHYBA'}: ${name}`)
if (checks.some(([, ok]) => !ok)) process.exit(1)
console.log('\nHOTOVO: release 0.7.0 bol nainstalovany. Spustite npm run dev a obnovte nahlad cez Ctrl + F5.')
