import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const src = join(root, 'src')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const expectedVersion = '0.57.3'
const errors = []

if (pkg.version !== expectedVersion) console.warn(`[v0.57.3 verify] WARNING package.json version=${pkg.version}, expected=${expectedVersion}; build continues because this is metadata only`)
for (const required of [
  'src/App.tsx',
  'src/types.ts',
  'src/lib/projectCloud.ts',
  'src/lib/entityFinanceCloud.ts',
  'src/lib/enterprise360.ts',
  'src/views/Enterprise360.tsx',
  'src/views/Enterprise360.css',
  'src/views/ProjectManagement.tsx',
  'src/views/ProjectManagement.css',
  'src/lib/storage.ts',
  'src/data/seed.json',
  'src/data/contractTasks.json',
  'src/data/contractTaskLedger.json',
  'supabase/migration_project_finance_v056.sql',
  'supabase/migration_entity_finance_allocation_v0562.sql',
  'tsconfig.app.json',
]) {
  if (!existsSync(join(root, required))) errors.push(`missing ${required}`)
}

const allowedRootTs = new Set(['types.ts', 'vite-env.d.ts'])
for (const entry of readdirSync(src, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.ts') && !allowedRootTs.has(entry.name)) {
    errors.push(`legacy root TypeScript file remains: src/${entry.name}`)
  }
}

const sourceFiles = []
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) sourceFiles.push(full)
  }
}
walk(src)

const candidates = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.tsx', '/index.js']
function targetExists(base) {
  return candidates.some((suffix) => {
    const p = base + suffix
    return existsSync(p) && statSync(p).isFile()
  })
}

const patterns = [
  /(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g,
  /import\(\s*['"](\.[^'"]+)['"]\s*\)/g,
]
for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8')
  for (const pattern of patterns) {
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(text))) {
      const spec = match[1]
      if (!targetExists(resolve(dirname(file), spec))) errors.push(`unresolved import ${file.replace(root + '/', '')} -> ${spec}`)
    }
  }
}

if (errors.length) {
  console.error('[v0.57.3 verify] FAILED')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
console.log(`[v0.57.3 verify] OK; sourceFiles=${sourceFiles.length}; version=${pkg.version}`)
