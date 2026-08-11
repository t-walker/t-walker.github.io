import type { ImageMetadata } from 'astro';
import { formatDate } from './rolls';

export interface WorkMeta {
  title?: string;
  medium?: string;
  camera?: string;
  lens?: string;
  date?: string;
  location?: string;
  description?: string;
  image?: string;
  alt?: string;
  draft?: boolean;
}

export interface Work extends WorkMeta {
  slug: string;
  title: string;
  image: ImageMetadata;
  timestamp: number;
}

const metaModules = import.meta.glob<{ default: WorkMeta }>('../../works/*/work.json', {
  eager: true,
});

const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  '../../works/*/*.{jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP,avif,AVIF,tif,TIF,tiff,TIFF}',
  { eager: true },
);

function slugFromPath(path: string): string {
  return path.match(/works\/([^/]+)\//)?.[1] ?? path;
}

function fileFromPath(path: string): string {
  return path.split('/').pop()!;
}

function titleize(slug: string): string {
  return slug
    .replace(/^\d{4}(?:-\d{2}-\d{2})?[-_]?/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildWorks(): Work[] {
  const imagesBySlug = new Map<string, Map<string, ImageMetadata>>();

  for (const [path, module] of Object.entries(imageModules)) {
    const slug = slugFromPath(path);
    const images = imagesBySlug.get(slug) ?? new Map<string, ImageMetadata>();
    images.set(fileFromPath(path), module.default);
    imagesBySlug.set(slug, images);
  }

  const works: Work[] = [];

  for (const [path, module] of Object.entries(metaModules)) {
    const slug = slugFromPath(path);
    const meta = module.default ?? {};
    if (meta.draft) continue;

    const images = imagesBySlug.get(slug);
    const image = meta.image ? images?.get(meta.image) : images?.values().next().value;
    if (!image) continue;

    const title = meta.title ?? titleize(slug);
    const parsedDate = meta.date ? Date.parse(meta.date) : NaN;

    works.push({
      ...meta,
      slug,
      title,
      image,
      timestamp: Number.isNaN(parsedDate) ? 0 : parsedDate,
      alt: meta.alt ?? title,
    });
  }

  return works.sort((a, b) => b.timestamp - a.timestamp || b.slug.localeCompare(a.slug));
}

export const works = buildWorks();

export function workMetaLine(work: Work): string {
  return [work.camera, work.lens, work.medium, work.location, formatDate(work.date)]
    .filter(Boolean)
    .join(' · ');
}
