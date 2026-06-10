# Glassrail Website

Standalone product website workspace for Glassrail.

This repo owns the public marketing site for Glassrail. The agent runtime,
package docs, and release planning live in
`andrew-ellis-engineering/glassrail`; this repo owns the visual and interactive
website implementation.

## Current State

The first commit carries the website design brief and implementation spec:

- `PRODUCT.md` defines positioning, audience, voice, and strategic constraints.
- `DESIGN.md` defines the semantic-glass visual system, tokens, material
  recipes, motion rules, and accessibility floors.
- `docs/product-website-ui.md` defines the one-page site architecture and
  Crystallizer hero animation.

Implementation should start from these files and keep the site honest to the
runtime: real vocabulary, dated eval evidence, sequential node execution until
parallel execution ships, and no unsupported product claims.
