# Glassrail Website

Standalone product website workspace for Glassrail.

This repo owns the public marketing site for Glassrail. The agent runtime,
package docs, and release planning live in
`andrew-ellis-engineering/glassrail`; this repo owns the visual and interactive
website implementation.

## Current State

The site is implemented as a Vite + TypeScript single-page product site. It
keeps the docs site separate while giving Glassrail a public product surface:
positioning, the Crystallizer replay hero, architecture, eval evidence,
quickstart, and known limits.

```bash
npm install
npm run dev      # local dev server
npm run format   # prettier check (CI runs this)
npm run build    # tsc --noEmit + vite build
```

Fonts are self-hosted latin subsets in `public/fonts/` (Switzer variable,
Commit Mono 400/700), declared inline in `index.html`.

The original planning documents remain in this repo:

- `PRODUCT.md` defines positioning, audience, voice, and strategic constraints.
- `DESIGN.md` defines the semantic-glass visual system, tokens, material
  recipes, motion rules, and accessibility floors.
- `docs/product-website-ui.md` defines the one-page site architecture and
  Crystallizer hero animation.
- `docs/first-draft-review.md` is the implemented review of the first build;
  its acceptance criteria are the maintenance bar for changes.

Keep the site honest to the runtime: real vocabulary, dated eval evidence,
sequential node execution until parallel execution ships, and no unsupported
product claims.
