#!/usr/bin/env node
/**
 * Roll ingest agent.
 *
 * Takes a folder of raw scans, downsizes + compresses them, files them into
 * rolls/<slug>/ in shooting order, and writes a roll.json metadata stub.
 *
 *   npm run ingest -- <source-folder> [options]
 *
 * Options:
 *   --slug <slug>       Folder name under rolls/ (default: derived from date + title)
 *   --title <text>      Roll title
 *   --film <text>       Film stock, e.g. "Kodak Portra 400"
 *   --camera <text>     Camera body
 *   --lens <text>       Lens
 *   --date <YYYY-MM-DD> Shoot date (default: EXIF date, else today)
 *   --location <text>   Where it was shot
 *   --description <text>
 *   --public            Also feature this roll on /public-work
 *   --max <px>          Longest edge of the stored image (default 2600)
 *   --quality <1-100>   JPEG quality (default 86)
 *   --keep-names        Keep original filenames instead of frame-01, frame-02, ...
 *   --dry-run           Show what would happen, write nothing
 *   --yes               Never prompt; accept defaults for anything not passed
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import exifr from 'exifr';

const ROOT = path.resolve(import.meta.dirname, '..');
const ROLLS_DIR = path.join(ROOT, 'rolls');
const SOURCE_EXT = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp']);

function parseArgs(argv) {
  const flags = {
    max: 2600,
    quality: 86,
    public: false,
    'keep-names': false,
    'dry-run': false,
    yes: false,
  };
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (['public', 'keep-names', 'dry-run', 'yes'].includes(key)) {
      flags[key] = true;
    } else {
      flags[key] = argv[++i];
    }
  }

  return { flags, positional };
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

async function listSourceImages(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && SOURCE_EXT.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => collator.compare(path.basename(a), path.basename(b)))
    .reverse(); // oldest file (highest sequence number in a descending scan) → frame-01
}

async function readExif(file) {
  try {
    return (await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate', 'Model', 'Make', 'LensModel'] })) ?? {};
  } catch {
    return {};
  }
}

function isoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const source = positional[0];

  if (!source) {
    console.error('Usage: npm run ingest -- <source-folder> [--title "..."] [--film "..."] [--camera "..."]');
    process.exit(1);
  }

  const sourceDir = path.resolve(process.cwd(), source);
  if (!existsSync(sourceDir)) {
    console.error(`Source folder not found: ${sourceDir}`);
    process.exit(1);
  }

  const files = await listSourceImages(sourceDir);
  if (files.length === 0) {
    console.error(`No images (${[...SOURCE_EXT].join(', ')}) found in ${sourceDir}`);
    process.exit(1);
  }

  const exif = await readExif(files[0]);
  const exifDate = isoDate(exif.DateTimeOriginal ?? exif.CreateDate);
  const exifCamera = [exif.Make, exif.Model].filter(Boolean).join(' ').trim() || undefined;

  const rl = flags.yes ? null : createInterface({ input: stdin, output: stdout });
  const ask = async (label, fallback = '') => {
    if (!rl) return fallback;
    const answer = (await rl.question(fallback ? `${label} [${fallback}]: ` : `${label}: `)).trim();
    return answer || fallback;
  };

  console.log(`\nFound ${files.length} images in ${sourceDir}\n`);

  const title = flags.title ?? (await ask('Title', path.basename(sourceDir).replace(/[-_]+/g, ' ')));
  const film = flags.film ?? (await ask('Film stock'));
  const camera = flags.camera ?? (await ask('Camera', exifCamera ?? ''));
  const lens = flags.lens ?? (await ask('Lens', exif.LensModel ?? ''));
  const date = flags.date ?? (await ask('Date (YYYY-MM-DD)', exifDate ?? new Date().toISOString().slice(0, 10)));
  const location = flags.location ?? (await ask('Location'));
  const description = flags.description ?? (await ask('Description'));
  await rl?.close();

  const slug = flags.slug ?? `${date}-${slugify(title) || 'roll'}`;
  const destDir = path.join(ROLLS_DIR, slug);
  const maxEdge = Number(flags.max) || 2600;
  const quality = Number(flags.quality) || 86;

  console.log(`\n→ rolls/${slug}/  (${files.length} frames, max ${maxEdge}px, q${quality})`);

  if (flags['dry-run']) {
    files.forEach((file, i) => console.log(`   ${path.basename(file)} → frame-${String(i + 1).padStart(2, '0')}.jpg`));
    console.log('\nDry run — nothing written.');
    return;
  }

  await fs.mkdir(destDir, { recursive: true });

  let totalIn = 0;
  let totalOut = 0;
  const written = [];

  for (const [i, file] of files.entries()) {
    const name = flags['keep-names']
      ? `${path.parse(file).name}.jpg`
      : `frame-${String(i + 1).padStart(2, '0')}.jpg`;
    const dest = path.join(destDir, name);

    const { size: inSize } = await fs.stat(file);
    await sharp(file)
      .rotate()
      .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toFile(dest);
    const { size: outSize } = await fs.stat(dest);

    totalIn += inSize;
    totalOut += outSize;
    written.push(name);
    process.stdout.write(
      `   ${name}  ${(inSize / 1e6).toFixed(1)}MB → ${(outSize / 1e6).toFixed(2)}MB\n`,
    );
  }

  const metaPath = path.join(destDir, 'roll.json');
  const existing = existsSync(metaPath) ? JSON.parse(await fs.readFile(metaPath, 'utf8')) : {};

  const meta = {
    ...existing,
    title,
    ...(film ? { film } : {}),
    ...(camera ? { camera } : {}),
    ...(lens ? { lens } : {}),
    date,
    ...(location ? { location } : {}),
    ...(description ? { description } : {}),
    public: flags.public || existing.public === true,
    order: written,
  };

  await fs.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

  console.log(
    `\n✓ ${written.length} frames — ${(totalIn / 1e6).toFixed(1)}MB in, ${(totalOut / 1e6).toFixed(1)}MB stored ` +
      `(${Math.round((1 - totalOut / totalIn) * 100)}% smaller)`,
  );
  console.log(`✓ rolls/${slug}/roll.json written`);
  console.log('\nNext: npm run dev  —  then commit and push to publish.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
