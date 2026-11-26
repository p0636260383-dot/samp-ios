import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] || 'C:/Users/papaa/Documents/Codex/2026-11-09/0/work/SAMP-Mobile-GTA-2.11/app/src/main/cpp/opus');
const destination = path.join(root, 'Sources/RotCityOpus/vendor');
const groups = new Set(['OPUS_SOURCES', 'OPUS_SOURCES_FLOAT', 'CELT_SOURCES', 'SILK_SOURCES', 'SILK_SOURCES_FLOAT']);
const selected = new Set(['COPYING', 'AUTHORS']);
for (const mk of ['opus_sources.mk', 'celt_sources.mk', 'silk_sources.mk']) {
  let group;
  for (const line of fs.readFileSync(path.join(source, mk), 'utf8').split(/\r?\n/)) {
    const assignment = line.match(/^([A-Z0-9_]+)\s*=/);
    if (assignment) group = assignment[1];
    const file = line.match(/^([a-zA-Z0-9_/.-]+\.c)\s*\\?$/);
    if (file && groups.has(group)) selected.add(file[1]);
  }
}
function headers(dir = '') {
  for (const entry of fs.readdirSync(path.join(source, dir), { withFileTypes: true })) {
    if (entry.isDirectory() && ['include', 'celt', 'silk', 'src'].includes(dir.split('/')[0] || entry.name)) headers(dir ? dir + '/' + entry.name : entry.name);
    else if (entry.isFile() && entry.name.endsWith('.h')) selected.add(dir + '/' + entry.name);
  }
}
headers();
for (const file of selected) {
  const target = path.join(destination, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(source, file), target);
}
fs.mkdirSync(path.join(root, 'iOS/Resources/Licenses'), { recursive: true });
fs.copyFileSync(path.join(source, 'COPYING'), path.join(root, 'iOS/Resources/Licenses/Opus.txt'));
console.log(`Vendored ${[...selected].filter(f => f.endsWith('.c')).length} generic Opus C sources from Android; SIMD/assembly are disabled.`);
