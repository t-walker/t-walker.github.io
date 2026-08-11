type LightboxImage = {
  source: string;
  alt: string;
  caption: string;
};

const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox]');
const display = dialog?.querySelector<HTMLImageElement>('[data-lightbox-image]');
const caption = dialog?.querySelector<HTMLElement>('[data-lightbox-caption]');
const counter = dialog?.querySelector<HTMLElement>('[data-lightbox-counter]');
const previous = dialog?.querySelector<HTMLButtonElement>('[data-lightbox-prev]');
const next = dialog?.querySelector<HTMLButtonElement>('[data-lightbox-next]');
const close = dialog?.querySelector<HTMLButtonElement>('[data-lightbox-close]');

let images: LightboxImage[] = [];
let index = 0;
let returnFocus: HTMLElement | null = null;

function isEligible(image: HTMLImageElement): boolean {
  return image.closest('main') !== null && image.closest('.thumb') === null;
}

function largestSource(image: HTMLImageElement): string {
  const candidates = image.srcset
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/))
    .filter(([source]) => Boolean(source))
    .sort((a, b) => Number.parseInt(a[1] ?? '0', 10) - Number.parseInt(b[1] ?? '0', 10));

  return candidates.at(-1)?.[0] ?? image.currentSrc ?? image.src;
}

function imageCaption(image: HTMLImageElement): string {
  const frame = image.closest<HTMLElement>('.frame');
  if (frame?.dataset.caption) return frame.dataset.caption;

  const work = image.closest<HTMLElement>('.featured-work');
  if (work) {
    const title = work.querySelector('h2')?.textContent?.trim();
    const context = work.querySelector('.featured-work__context')?.textContent?.trim();
    return [title, context].filter(Boolean).join(' — ');
  }

  return image.alt;
}

function groupFor(image: HTMLImageElement): HTMLImageElement[] {
  const gallery = image.closest('film-gallery');
  if (gallery) return Array.from(gallery.querySelectorAll<HTMLImageElement>('.frame img'));

  const sheet = image.closest('.contact-sheet');
  if (sheet) return Array.from(sheet.querySelectorAll<HTMLImageElement>('.contact-sheet__frame img'));

  const featured = image.closest('.featured-grid');
  if (featured) return Array.from(featured.querySelectorAll<HTMLImageElement>('.featured-work__image img'));

  return [image];
}

function show(nextIndex: number): void {
  if (!display || !caption || !counter || images.length === 0) return;

  index = (nextIndex + images.length) % images.length;
  const image = images[index]!;
  display.src = image.source;
  display.alt = image.alt;
  caption.textContent = image.caption;
  caption.hidden = image.caption === '';
  counter.textContent = images.length > 1 ? `${index + 1} / ${images.length}` : '';
  counter.hidden = images.length <= 1;

  const hasMultiple = images.length > 1;
  if (previous) previous.hidden = !hasMultiple;
  if (next) next.hidden = !hasMultiple;
}

function open(image: HTMLImageElement): void {
  if (!dialog || !isEligible(image)) return;

  const group = groupFor(image);
  images = group.map((item) => ({
    source: largestSource(item),
    alt: item.alt,
    caption: imageCaption(item),
  }));
  index = Math.max(0, group.indexOf(image));
  returnFocus = image;
  show(index);
  dialog.showModal();
}

function closeDialog(): void {
  dialog?.close();
  returnFocus?.focus();
}

function prepare(root: ParentNode): void {
  const candidates = [
    ...(root instanceof HTMLImageElement ? [root] : []),
    ...root.querySelectorAll<HTMLImageElement>('img'),
  ];

  candidates.forEach((image) => {
    if (!isEligible(image) || image.dataset.lightboxReady === 'true') return;
    image.dataset.lightboxReady = 'true';
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', `Open ${image.alt || 'photo'} full screen`);
  });
}

document.addEventListener('click', (event) => {
  const image = (event.target as Element | null)?.closest<HTMLImageElement>('main img');
  if (image && isEligible(image)) open(image);
});

document.addEventListener('keydown', (event) => {
  if (dialog?.open) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      show(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      show(index + 1);
    }
    return;
  }

  if (event.key !== 'Enter' && event.key !== ' ') return;
  const image = (event.target as Element | null)?.closest<HTMLImageElement>('main img');
  if (!image || !isEligible(image)) return;
  event.preventDefault();
  open(image);
});

previous?.addEventListener('click', () => show(index - 1));
next?.addEventListener('click', () => show(index + 1));
close?.addEventListener('click', closeDialog);
dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) closeDialog();
});
dialog?.addEventListener('close', () => returnFocus?.focus());

prepare(document);
const main = document.querySelector('main');
if (main) {
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) prepare(node);
      });
    }
  }).observe(main, { childList: true, subtree: true });
}
