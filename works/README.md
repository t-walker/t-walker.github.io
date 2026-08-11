# works/

Standalone photographs featured on the **Public Work** page. These are separate
from film rolls and never appear in the Recent Rolls feed.

Each work has its own folder containing one image and a `work.json` file:

```text
works/
  2025-example/
    image.jpg
    work.json
```

```json
{
  "title": "Example, Seattle, 2025",
  "medium": "CineStill 800T",
  "camera": "Nikon F3",
  "lens": "85mm f/2.8",
  "date": "2025",
  "location": "Seattle, WA",
  "description": "Displayed at Example Gallery.",
  "image": "image.jpg"
}
```

All fields except `title` and `image` are optional. Works are sorted newest
first by `date`, then by folder name.
