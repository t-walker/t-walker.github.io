# public/fonts/

Self-hosted web fonts. Anything here is served as-is at `/fonts/<name>.woff2`.

## Adding Oliver

Oliver / Olivera by Pentagonistudio is **free for personal use** — commercial use
requires a licence from [Creative Market](https://creativemarket.com/Pentagonistudio/10215363-Olivera-Chic-Modern-Serif).
The font file is deliberately not committed by this repo's tooling; add it
yourself once you're happy with the licensing.

1. Download the family from <https://www.1001fonts.com/oliver-font.html>.
2. Convert the `.ttf` or `.otf` to woff2:

   ```bash
   npm run font -- "C:/Downloads/Oliver.ttf"
   ```

   That writes `public/fonts/oliver.woff2`.
3. Restart `npm run dev`. Headings switch over automatically.

Nothing else to configure — `src/styles/fonts.css` already declares the
`@font-face`, and `--font-display` in `src/styles/global.css` lists Oliver first
with Alfa Slab One as the fallback, so the site renders fine before the file
exists.

To use a different face, pass `--name`:

```bash
npm run font -- "C:/Downloads/Something.otf" --name something
```

then add a matching `@font-face` block in `src/styles/fonts.css`.

## Note on deploying

`.gitignore` excludes font binaries in this folder by default, so a licensed
font you drop here works locally but **will not ship to the live site**. Serving
a font publicly is redistribution — only commit it once you hold a licence that
allows webfont embedding. To commit it, delete the `public/fonts/*` lines from
`.gitignore` and `git add public/fonts/oliver.woff2`.
