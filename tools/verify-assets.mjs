import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resources = path.join(root, 'iOS/Resources');
const manifest = JSON.parse(fs.readFileSync(path.join(resources, 'android-ui-manifest.json'), 'utf8'));
for (const file of manifest.files) {
  const bytes = fs.readFileSync(path.join(resources, 'rot-ui', file.path));
  assert.equal(bytes.length, file.size, file.path);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
}
const registry = JSON.parse(fs.readFileSync(path.join(resources, 'rot-ui/pages.json'), 'utf8'));
assert.equal(Object.keys(registry).length, manifest.pages);
for (const [page, prefixes] of Object.entries(registry)) {
  assert(fs.existsSync(path.join(resources, 'rot-ui', page)), page);
  assert(prefixes.split(',').every(prefix => prefix.trim().length > 0), page);
}
console.log(`Verified ${manifest.files.length} exact Android assets and ${manifest.pages} registered pages.`);
