# Agent instructions

Static photography site (Astro → GitHub Pages). Full-res-ish film scans live in
`rolls/`; Astro generates all optimised derivatives at build time.

## Layout

```
rolls/<slug>/roll.json + frame-NN.jpg   photo content + metadata (see rolls/README.md)
src/lib/rolls.ts                        globs and sorts film rolls
src/lib/works.ts                        globs standalone featured photographs from works/
src/components/Gallery.astro            one roll: focused frame, arrows, thumbnail rail
src/scripts/gallery.ts                  <film-gallery> custom element behaviour
src/scripts/feed.ts                     infinite scroll on the home page
src/pages/fragments/rolls/[slug].astro  pre-rendered gallery fragments the feed fetches
src/site.config.ts                      title, tagline, Instagram URL, batch sizes
scripts/ingest-roll.mjs                 roll ingest CLI
works/<slug>/work.json + image          standalone Public Work entries
```

## Ingesting a roll (the common task)

```bash
npm run ingest -- <source-folder> \
  --title "..." --film "..." --camera "..." --lens "..." \
  --date YYYY-MM-DD --location "..." --description "..." [--public] --yes
```

Rules when doing this on the user's behalf:

- Always pass `--yes` in non-interactive contexts, and pass every field you know
  so the script doesn't fall back to prompts.
- Use `--dry-run` first if the source folder contents are uncertain.
- Slug defaults to `<date>-<slugified-title>`; keep the leading date.
- Never commit unprocessed originals — only run images through the ingest script
  (or match its output: long edge ≤ 2600px, JPEG q86).
- After ingesting, run `npm run build` to confirm the roll renders.
- Frames are ordered by `order` in `roll.json`; reordering means editing that
  array, not renaming files.

## Conventions

- Any new gallery markup must keep the class names `gallery`, `stage`,
  `stage__nav--prev/next`, `stage__counter`, `frame`, `caption`, `rail__scroll`,
  `thumb`, `rail__nav--prev/next` — `src/scripts/gallery.ts` binds to them.
- Fragment pages must render `Gallery` with no layout; the feed injects their
  HTML directly.
- Colors come from the CSS custom properties at the top of
  `src/styles/global.css` (warm cream paper, ink brown, tomato / mustard /
  patch-blue / avocado accents). Don't hardcode hex values elsewhere.
- Verify changes with `npm run build`, and `npm run preview` for a visual check.
