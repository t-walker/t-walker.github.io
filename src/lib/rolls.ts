import type { ImageMetadata } from 'astro';

export interface RollMeta {
  /** Display title for the roll. */
  title?: string;
  /** e.g. "Kodak Portra 400" */
  film?: string;
  /** e.g. "Nikon FM2" */
  camera?: string;
  /** e.g. "50mm f/1.8 AI-S" */
  lens?: string;
  /** ISO date (YYYY-MM-DD) or free text. Used for sorting when parseable. */
  date?: string;
  location?: string;
  description?: string;
  /** When true the roll is skipped everywhere. */
  draft?: boolean;
  /** Filenames, in the order you want them shown. Anything not listed is appended alphabetically. */
  order?: string[];
  /** Filenames to skip. */
  hidden?: string[];
  /** filename -> a one or two sentence description shown under the photo. */
  captions?: Record<string, string>;
  /** Alias for `captions`, if you prefer the longer name. */
  descriptions?: Record<string, string>;
  /** Filename to use as the lead frame (moved to position 1). */
  cover?: string;
}

export interface RollFrame {
  file: string;
  image: ImageMetadata;
  caption?: string;
  alt: string;
}

export interface Roll extends RollMeta {
  slug: string;
  title: string;
  frames: RollFrame[];
  /** Sortable timestamp; falls back to 0 when the date is unparseable. */
  timestamp: number;
}

const metaModules = import.meta.glob<{ default: RollMeta }>('../../rolls/*/roll.json', {
  eager: true,
});

const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  '../../rolls/*/*.{jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP,avif,AVIF,tif,TIF,tiff,TIFF}',
  { eager: true },
);

function slugFromPath(path: string): string {
  const match = path.match(/rolls\/([^/]+)\//);
  return match ? match[1]! : path;
}

function fileFromPath(path: string): string {
  return path.split('/').pop()!;
}

function titleize(slug: string): string {
  return slug
    .replace(/^\d{4}-\d{2}-\d{2}[-_]?/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Natural sort so frame-2 comes before frame-10. */
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function dateFromSlug(slug: string): string | undefined {
  const match = slug.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : undefined;
}

function buildRolls(): Roll[] {
  const framesBySlug = new Map<string, { file: string; image: ImageMetadata }[]>();

  for (const [path, mod] of Object.entries(imageModules)) {
    const slug = slugFromPath(path);
    const list = framesBySlug.get(slug) ?? [];
    list.push({ file: fileFromPath(path), image: mod.default });
    framesBySlug.set(slug, list);
  }

  const metaBySlug = new Map<string, RollMeta>();
  for (const [path, mod] of Object.entries(metaModules)) {
    metaBySlug.set(slugFromPath(path), mod.default ?? {});
  }

  const slugs = new Set([...framesBySlug.keys(), ...metaBySlug.keys()]);
  const rolls: Roll[] = [];

  for (const slug of slugs) {
    const meta = metaBySlug.get(slug) ?? {};
    if (meta.draft) continue;

    const hidden = new Set(meta.hidden ?? []);
    let files = (framesBySlug.get(slug) ?? []).filter((f) => !hidden.has(f.file));
    if (files.length === 0) continue;

    const explicitOrder = [...(meta.cover ? [meta.cover] : []), ...(meta.order ?? [])];
    const rank = new Map(explicitOrder.map((file, i) => [file, i]));

    files = files.sort((a, b) => {
      const ra = rank.get(a.file);
      const rb = rank.get(b.file);
      if (ra !== undefined && rb !== undefined) return ra - rb;
      if (ra !== undefined) return -1;
      if (rb !== undefined) return 1;
      return collator.compare(a.file, b.file);
    });

    const title = meta.title ?? titleize(slug);
    const date = meta.date ?? dateFromSlug(slug);
    const parsed = date ? Date.parse(date) : NaN;

    rolls.push({
      ...meta,
      slug,
      title,
      date,
      timestamp: Number.isNaN(parsed) ? 0 : parsed,
      frames: files.map(({ file, image }) => {
        const caption = meta.captions?.[file] ?? meta.descriptions?.[file];
        return {
          file,
          image,
          caption,
          alt: caption ?? `${title} — ${file}`,
        };
      }),
    });
  }

  // Newest first; undated rolls fall back to reverse-alphabetical slug order.
  return rolls.sort((a, b) => b.timestamp - a.timestamp || collator.compare(b.slug, a.slug));
}

export const rolls: Roll[] = buildRolls();

export function getRoll(slug: string): Roll | undefined {
  return rolls.find((roll) => roll.slug === slug);
}

export function formatDate(date?: string): string | undefined {
  if (!date) return undefined;
  if (/^\d{4}$/.test(date)) return date;
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) return date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: /^\d{4}-\d{2}$/.test(date) ? undefined : 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

export function rollMetaLine(roll: Roll): string {
  return [roll.camera, roll.lens, roll.film, roll.location, formatDate(roll.date)]
    .filter(Boolean)
    .join(' · ');
}
