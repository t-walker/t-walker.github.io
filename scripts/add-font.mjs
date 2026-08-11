#!/usr/bin/env node
/**
 * Convert a downloaded desktop font (.ttf / .otf) into a web-ready .woff2 in
 * public/fonts/, which src/styles/fonts.css picks up automatically.
 *
 *   npm run font -- "C:/Downloads/Oliver.ttf"
 *   npm run font -- "C:/Downloads/Oliver.ttf" --name oliver
 *
 * You are responsible for holding a licence that permits self-hosting the font.
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { compress } from 'wawoff2';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'fonts');

const argv = process.argv.slice(2);
const source = argv.find((arg) => !arg.startsWith('--'));
const nameFlag = argv.indexOf('--name');
const name = nameFlag !== -1 ? argv[nameFlag + 1] : 'oliver';

if (!source) {
  console.error('Usage: npm run font -- <path-to-font.ttf|otf> [--name oliver]');
  process.exit(1);
}

const sourcePath = path.resolve(process.cwd(), source);
if (!existsSync(sourcePath)) {
  console.error(`Font not found: ${sourcePath}`);
  process.exit(1);
}

const ext = path.extname(sourcePath).toLowerCase();
if (!['.ttf', '.otf'].includes(ext)) {
  console.error(`Expected a .ttf or .otf file, got "${ext}".`);
  process.exit(1);
}

await fs.mkdir(OUT_DIR, { recursive: true });

const input = await fs.readFile(sourcePath);
const output = await compress(input);
const dest = path.join(OUT_DIR, `${name}.woff2`);
await fs.writeFile(dest, output);

console.log(
  `✓ public/fonts/${name}.woff2  (${(input.length / 1024).toFixed(0)}KB → ${(output.length / 1024).toFixed(0)}KB)`,
);
console.log('Run `npm run dev` — the display font will pick it up automatically.');
