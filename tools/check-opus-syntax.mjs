// Uses an existing Android NDK only; checks the exact shared codec C sources.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ndk = process.argv[2];
if (!ndk) throw new Error('Pass the installed NDK directory as the first argument');
const prebuilt = path.join(ndk, 'toolchains/llvm/prebuilt/windows-x86_64');
const compiler = path.join(prebuilt, 'bin/clang.exe');
const codec = path.join(root, 'Sources/RotCityOpus');
const sources = [];
function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.c')) sources.push(full);
  }
}
walk(codec);
const args = ['--target=aarch64-linux-android26', '--sysroot=' + path.join(prebuilt, 'sysroot'), '-fsyntax-only', '-std=c99',
  '-DOPUS_BUILD', '-DVAR_ARRAYS', '-DHAVE_LRINTF', '-DHAVE_LRINT',
  ...['include', 'vendor/include', 'vendor/celt', 'vendor/silk', 'vendor/silk/float', 'vendor/src'].map(dir => '-I' + path.join(codec, dir)), ...sources];
const result = spawnSync(compiler, args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
if (result.error) throw result.error;
if (result.stdout) console.log(result.stdout);
if (result.stderr) console.error(result.stderr);
if (result.status !== 0) process.exit(result.status || 1);
console.log(`Syntax checked ${sources.length} shared Opus C files for ARM64. This does not replace an Xcode/iOS build.`);
