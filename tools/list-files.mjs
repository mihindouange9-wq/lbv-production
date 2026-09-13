import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
const out = {}; let total = 0;
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const fp = join(d, f);
    if (statSync(fp).isDirectory()) { if (!['tools', 'research', 'node_modules', '.git'].includes(f)) walk(fp); continue; }
    const rel = relative('.', fp).split(sep).join('/');
    if (rel === 'index.html' || rel.endsWith('.md') || rel === 'netlify.toml' || rel === '.gitignore') continue;
    out[rel] = rel; total += statSync(fp).size;
  }
};
walk('.');
writeFileSync('tools/files.json', JSON.stringify(out));
console.log(Object.keys(out).length, 'fichiers', (total / 1e6).toFixed(1), 'Mo');
