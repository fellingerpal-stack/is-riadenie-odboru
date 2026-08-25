import { readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const srcDir = new URL('../src/', import.meta.url)
const keep = new Set(['types.ts', 'vite-env.d.ts'])
let removed = 0

for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
  if (!entry.isFile()) continue
  if (!entry.name.endsWith('.ts')) continue
  if (keep.has(entry.name)) continue
  rmSync(join(srcDir.pathname, entry.name), { force: true })
  console.log(`[v0.54.0 prebuild] removed legacy duplicate src/${entry.name}`)
  removed += 1
}

console.log(`[v0.54.0 prebuild] legacy cleanup complete; removed=${removed}`)
