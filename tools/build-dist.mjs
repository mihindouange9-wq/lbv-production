/* Assemble le site publiable dans dist/ (sans outils, charte, archives ni notes). Utilisé par Render. */
import { cp, rm, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const skip = new Set(['tools', 'research', 'source', 'charte', 'brand', 'dist', 'node_modules', 'README.md', 'DEPLOIEMENT.md', 'render.yaml', 'netlify.toml', '.git', '.gitignore']);
for (const entry of await readdir(ROOT)) {
  if (skip.has(entry)) continue;
  await cp(join(ROOT, entry), join(OUT, entry), { recursive: true, filter: (src) => !src.endsWith('credits.json') });
}
console.log('dist →', OUT);
