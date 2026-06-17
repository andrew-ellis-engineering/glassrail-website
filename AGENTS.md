# Working in this repo

Always keep `AGENTS.md` and `CLAUDE.md` in sync if you make changes.

This repo owns the public product website for Glassrail. The Python runtime,
package docs, roadmap, and releases live in `~/dag-agent`; this repo owns the
marketing surface, visual system, interactive Crystallizer replay, social
assets, and GitHub Pages deployment.

For positioning and design intent, read `PRODUCT.md`, `DESIGN.md`,
`docs/product-website-ui.md`, and `docs/first-draft-review.md`. Do not
duplicate those specs here; this file is the operating manual for working in
the repo.

**Keep `README.md` current.** When a change alters how someone runs, builds,
previews, verifies, or deploys the site, update the README in the same change.
The README is the repo front door, not the product spec or changelog.

## Check sweep — must be green before every commit

Run both:

```bash
npm run format
npm run build
```

For visual or motion changes, also verify in a real browser at `390`, `768`,
and `1440` px. Confirm:

- `document.documentElement.scrollWidth === document.documentElement.clientWidth`
- no important text overlaps, clips, or changes layout after adjacent content
  has already appeared
- `prefers-reduced-motion` renders a coherent static frame
- the Crystallizer replay remains sequential and legible on mobile

`npm run build` may warn that inline font URLs remain document-relative. That
is expected: the inline `@font-face` rules in `index.html` intentionally use
document-relative URLs so the site works under the GitHub Pages base path.

## Conventions

- **Stack:** Vite + TypeScript + vanilla DOM. Do not introduce React, Vue,
  Svelte, Tailwind, CSS-in-JS, or another framework without raising it first.
- **Runtime dependency:** GSAP is reserved for the hero timeline and related
  motion. Keep other interactions small and browser-native.
- **Styles:** plain CSS split under `src/styles/`; tokens live in
  `src/styles/tokens.css`. Use OKLCH for color. Keep the near-white field and
  restrained iris accent discipline from `DESIGN.md`.
- **Assets:** fonts are self-hosted under `public/fonts/`; social preview is
  `public/og.png`. Do not add CDN font dependencies.
- **Deployment:** static `dist/` built by Vite and deployed by
  `.github/workflows/pages.yml`.
- **Generated output:** `dist/` and `node_modules/` are local artifacts. Do not
  hand-edit them or commit them.

## Design and honesty constraints

- Glass is semantic, not decorative. Use glass treatment for engine artifacts:
  plans, nodes, rails, terminal output, eval panes, answer cards, and audit
  surfaces. Regular page structure should stay quiet and solid.
- The product is early 0.x infrastructure. Avoid hype, inflated maturity
  claims, or unsupported security/reliability promises.
- Eval evidence must include suite name, task/trial context, date, and caveats.
  No cherry-picking; held-out misses and all-fail counts stay visible.
- The engine executes nodes sequentially today. Do not depict concurrent node
  execution until the runtime actually supports it.
- Do not put eval-task vocabulary into public replay scripts or marketing copy.
  Replay tasks should use structural product shapes, not phrases copied from
  eval prompts or held-out tasks.
- Keep the docs site and product site linked to each other. Product marketing
  belongs here; runtime/API docs belong in `~/dag-agent`.

## Documentation map

- `README.md` — repo front door: what this repo owns, how to run/build, where
  the source specs live.
- `PRODUCT.md` — positioning, audience, tone, and strategic constraints.
- `DESIGN.md` — visual laws, tokens, material recipes, motion rules, and
  accessibility floors.
- `docs/product-website-ui.md` — implementable UI spec and Crystallizer
  storyboard.
- `docs/first-draft-review.md` — implemented launch review and acceptance bar.
- `AGENTS.md` / `CLAUDE.md` — operating manual for agents and local work.

## Source map

```
src/
├── main.ts
├── lib/
│   ├── crystallizer.ts  hero replay, timing, SVG scene, reduced-motion frame
│   ├── copy.ts          copy-to-clipboard affordances
│   ├── glitch.ts        rare section/stat glitch accents
│   ├── nav.ts           fixed nav scroll state
│   ├── reveal.ts        section reveal observer
│   ├── specular.ts      pane pointer sheen
│   └── terminal.ts      audit terminal typing replay
├── replay/
│   ├── plans.ts         hand-authored, schema-valid recorded replay shapes
│   └── schema.ts        replay event/plan types
└── styles/
    ├── tokens.css
    ├── base.css
    ├── components.css
    └── sections.css
```

`src/lib/crystallizer.ts` is the highest-risk file. Changes there should be
timing-conscious: sample the replay around transition boundaries, especially
where the envelope strip, answer card, node status, or skipped branch changes
layout. The answer card should never appear before the left-side envelope has
settled into its new format.

## Visual verification notes

- Use the dev-only `window.__crystallizer` hook in Vite dev builds for motion
  review: `seek(t)`, `play()`, and `restart()`.
- Check all replay shapes, not just the first one. Timing bugs often appear
  only when a previous replay's final layout differs from the next replay's
  setup.
- On mobile, inspect actual layout metrics as well as screenshots. Decorative
  overflow inside `.hero-stage` is clipped; document-level overflow is not
  acceptable.
- Reduced motion should preserve the story without animation: visible task,
  terminal statuses, honest skipped/completed states, aura hidden, glitch off.

## Commits

- Show the drafted commit message and wait for approval before committing,
  unless Andrew explicitly asks you to commit.
- Message style: plain prose. One summary line, then a short body when useful.
  No `Co-Authored-By` trailer.
- Work on `main` for direct site updates unless Andrew asks for a branch.
  This repo is small and often edited directly for launch work.
