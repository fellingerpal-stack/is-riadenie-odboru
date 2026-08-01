import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const source = path.join(root, 'release-v08-menu', 'src', 'App.tsx')
const target = path.join(root, 'src', 'App.tsx')
const backup = path.join(root, 'src', 'App.tsx.before-v08-menu.bak')

const required = [
  'src/views/ChangeManagement.tsx',
  'src/views/ProblemManagement.tsx',
  'src/views/IamManagement.tsx',
  'src/components/UI.tsx',
  'src/types.ts',
]

if (!fs.existsSync(source)) {
  console.error('CHYBA: Chyba release-v08-menu/src/App.tsx.')
  process.exit(1)
}

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)))
if (missing.length) {
  console.error('CHYBA: Pred instalaciou chybaju tieto subory:')
  for (const file of missing) console.error(` - ${file}`)
  console.error('Najprv ich nahraj z balika v0.8 LEN_ZMENENE_SUBORY.')
  process.exit(1)
}

if (fs.existsSync(target)) fs.copyFileSync(target, backup)
fs.copyFileSync(source, target)

const content = fs.readFileSync(target, 'utf8')
const checks = [
  ['Change management', content.includes("label:'Change management'")],
  ['Problem management', content.includes("label:'Problem management'")],
  ['IAM / Pristupy', content.includes("label:'IAM / Prístupy'")],
  ['render IAM', content.includes("view==='iam'")],
]

console.log('HOTOVO: src/App.tsx bol nahradeny navigaciou verzie 0.8.')
console.log(`Zaloha: ${path.relative(root, backup)}`)
for (const [name, ok] of checks) console.log(`${ok ? 'OK' : 'CHYBA'}: ${name}`)
if (checks.some(([, ok]) => !ok)) process.exit(1)
