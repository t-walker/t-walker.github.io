# t-walker.github.io

Film photography site — built with [Astro](https://astro.build), deployed to GitHub Pages.

## Pages

| Path | What it is |
| --- | --- |
| `/` | **Recent Rolls** — infinitely scrolling feed of roll galleries, newest first |
| `/public-work/` | **Public Work** — rolls flagged `"public": true` |
| `/about/` | **About** |
| `/rolls/<slug>/` | A single roll on its own page |
| Instagram icon | Links out to [@twalkerdev](https://www.instagram.com/twalkerdev/) |

Each gallery shows one focused frame with left/right arrows, a clickable
thumbnail rail underneath, keyboard arrow support, and swipe on touch devices.

## Adding a roll

```bash
npm run ingest -- "C:/scans/roll-42" --title "Cascade Loop" --film "Portra 400" --camera "Nikon FM2"
```

The ingest script downsizes and compresses each scan into `rolls/<slug>/`,
names frames in shooting order, and writes a `roll.json` you can hand-edit
afterwards. Run it without flags for interactive prompts.

You can also just make a folder under `rolls/` and drop images in.
See [`rolls/README.md`](rolls/README.md) for the metadata schema.

## Image handling

Two stages of compression, so full rolls stay cheap to host and fast to load:

1. **Ingest** — scans are resized to 2600px on the long edge and re-encoded as
   mozjpeg q86. That's what lives in the repo.
2. **Build** — Astro generates responsive WebP derivatives (720 / 1200 / 1800px
   plus 180px thumbnails) into `dist/`. Visitors only ever download those.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
npm run preview  # serve the built site
```

## Deploying

Push to `main`. `.github/workflows/deploy.yml` builds the site and publishes it
to GitHub Pages.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions.**

## Customising

- Site title, tagline, Instagram URL, feed batch sizes — `src/site.config.ts`
- Colors and type — `src/styles/global.css`
- About / Public Work copy — `src/pages/about.astro`, `src/pages/public-work.astro`
- Self-hosted display font — see [`public/fonts/README.md`](public/fonts/README.md)

## Adding a licensed display font

```bash
npm run font -- "C:/Downloads/Oliver.ttf"
```

Converts a `.ttf`/`.otf` to woff2 in `public/fonts/`. Headings use it as soon as
it exists, falling back to Alfa Slab One otherwise. Font binaries are gitignored
by default — read `public/fonts/README.md` before committing one.
