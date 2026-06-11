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
npm run dev
npm run build
```

The original planning documents remain in this repo:

- `PRODUCT.md` defines positioning, audience, voice, and strategic constraints.
- `DESIGN.md` defines the semantic-glass visual system, tokens, material
  recipes, motion rules, and accessibility floors.
- `docs/product-website-ui.md` defines the one-page site architecture and
  Crystallizer hero animation.

Keep the site honest to the runtime: real vocabulary, dated eval evidence,
sequential node execution until parallel execution ships, and no unsupported
product claims.
