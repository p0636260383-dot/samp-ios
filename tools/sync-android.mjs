import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] || 'C:/Users/papaa/Documents/Codex/2026-11-09/0/work/SAMP-Mobile-GTA-2.11');
const assets = path.join(source, 'app/src/main/assets/rot-ui');
const output = path.join(root, 'iOS/Resources/rot-ui');
if (!fs.existsSync(path.join(assets, 'pages.json'))) throw new Error('Missing Android UI registry');
const files = [];
function walk(relative = '') {
  for (const entry of fs.readdirSync(path.join(assets, relative), { withFileTypes: true })) {
    const name = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink not supported: ${name}`);
    if (entry.isDirectory()) walk(name);
    else if (entry.isFile()) {
      const bytes = fs.readFileSync(path.join(assets, name));
      const target = path.join(output, name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, bytes);
      files.push({ path: name.replaceAll('\\', '/'), size: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
    }
  }
}
walk();
const registry = JSON.parse(fs.readFileSync(path.join(output, 'pages.json'), 'utf8'));
for (const page of Object.keys(registry)) if (!fs.existsSync(path.join(output, page))) throw new Error(`Missing page ${page}`);
const brandRoot = path.join(root, 'iOS/Resources/Brand');
fs.mkdirSync(brandRoot, { recursive: true });
for (const directory of ['drawable', 'drawable-nodpi']) {
  for (const name of ['rotcity_cover.webp', 'rotcity_logo.webp', 'rotcity_logo.png', 'rotcity_cover.png']) {
    const candidate = path.join(source, 'app/src/main/res', directory, name);
    if (fs.existsSync(candidate)) fs.copyFileSync(candidate, path.join(brandRoot, name));
  }
}
fs.writeFileSync(path.join(root, 'iOS/Resources/android-ui-manifest.json'), JSON.stringify({
  source: 'SAMP-Mobile-GTA-2.11/app/src/main/assets/rot-ui',
  server: { host: 'diamond1412.thddns.net', port: 6160 },
  pages: Object.keys(registry).length, files
}, null, 2) + '\n');
console.log(`Imported ${files.length} unchanged files, ${Object.keys(registry).length} registered pages (${files.reduce((sum, f) => sum + f.size, 0)} bytes)`);
