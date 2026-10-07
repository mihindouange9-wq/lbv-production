/* Assemble le site publiable dans dist/ (sans outils, charte, archives ni notes). Utilisé par Render. */
import { cp, rm, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const skip = new Set(['tools', 'research', 'source', 'charte', 'brand', 'templates', 'dist', 'node_modules', 'README.md', 'DEPLOIEMENT.md', 'render.yaml', 'netlify.toml', '.git', '.gitignore']);
for (const entry of await readdir(ROOT)) {
  if (skip.has(entry)) continue;
  await cp(join(ROOT, entry), join(OUT, entry), { recursive: true, filter: (src) => !src.endsWith('credits.json') });
}
console.log('dist →', OUT);

/* Version dans l'adresse du style et des scripts : chaque mise en ligne invalide le cache des visiteurs,
   même ceux qui ont gardé les anciens fichiers (cache de sept jours). */
import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
let version = process.env.RENDER_GIT_COMMIT?.slice(0, 7);
if (!version) { try { version = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch { version = String(Date.now()); } }
const page = join(OUT, 'index.html');
let html = await readFile(page, 'utf8');
html = html.replace(/(href|src)="((?:css|js)\/[^"?]+)"/g, (m, attr, file) => `${attr}="${file}?v=${version}"`);
await writeFile(page, html);
console.log('version des fichiers :', version);
