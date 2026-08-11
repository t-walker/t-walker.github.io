# rolls/

One folder per roll of film. Folder name is the URL slug.

```
rolls/
  2026-05-04-cascade-loop/
    roll.json
    frame-01.jpg
    frame-02.jpg
    ...
```

## roll.json

Every field is optional — an image folder with no `roll.json` still shows up
(title is derived from the folder name).

```json
{
  "title": "Cascade Loop",
  "film": "Kodak Portra 400",
  "camera": "Nikon FM2",
  "lens": "50mm f/1.8 AI-S",
  "date": "2026-05-04",
  "location": "Winthrop, WA",
  "description": "One line about the roll.",
  "draft": false,
  "cover": "frame-03.jpg",
  "order": ["frame-01.jpg", "frame-02.jpg"],
  "hidden": ["frame-11.jpg"],
  "captions": {
    "frame-02.jpg": "Highway 20 at first light. The fog burned off about a minute after this frame."
  }
}
```

Per-image descriptions are optional and per-frame — caption the two frames you
care about and leave the rest blank. They appear under the photo on **Recent
Rolls** and the roll's own page, and double as the image alt text.

| Field | Meaning |
| --- | --- |
| `title` | Display name. Defaults to a title-cased folder name. |
| `film`, `camera`, `lens`, `location` | Shown in the gallery meta line. |
| `date` | `YYYY-MM-DD`. Drives the newest-first ordering on the home page. Falls back to a leading date in the folder name. |
| `description` | Short blurb under the title. |
| `draft` | `true` hides the roll everywhere. |
| `cover` | Filename shown first. |
| `order` | Explicit frame order; anything not listed is appended in natural sort order. |
| `hidden` | Filenames to skip. |
| `captions` | Per-frame description (1–2 sentences), keyed by filename. Shown under the photo in every gallery. `descriptions` works as an alias. |

## Adding a roll

```bash
npm run ingest -- "C:/scans/roll-42" --title "Cascade Loop" --film "Portra 400" --camera "Nikon FM2"
```

The ingest script resizes every scan to 2600px on the long edge, compresses it,
renames frames in shooting order, and writes `roll.json`. Astro then generates
the responsive WebP derivatives at build time, so what visitors download is much
smaller again.

You can also just drop images into a new folder here by hand.
