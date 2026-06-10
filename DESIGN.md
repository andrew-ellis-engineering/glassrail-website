# DESIGN.md — glassrail product website

Design tokens and material recipes. The implementation spec
(`docs/release/product-website-ui.md`) owns page architecture and choreography;
this file owns the values. Copy these verbatim into `src/styles/tokens.css`.

## Law 1 — semantic glass (the system's one big rule)

**Only the engine's artifacts are glass.** Plan nodes, edges (rails), the
terminal window, plan/JSON cards, eval result panes, the approval chip: glass.
Page chrome (headings, body copy, nav at rest, footer, buttons): solid,
opaque, typographic. Transparency appears exactly where the product promises
transparency. This is a committed identity choice, not decorative
glassmorphism; if a surface is not something the engine produced, it is not
glass.

## Law 2 — the iridescence budget

The "rainbow at 5–10%" is enforced, not vibes:

- Iridescent hues appear only via the `--iris-*` tokens below.
- Combined iridescent-painted area ≤ 10% of any viewport. One aura maximum
  per viewport.
- Fills cap at OKLCH chroma 0.09; 1px rims and pulses may reach 0.14.
- Never on body text, never as a large background fill, never via
  `background-clip: text` (banned), never on more than one element type
  simultaneously animating.
- Color is information: iridescence intensifies only at meaning moments
  (materialize completion, decision shimmer, execution pulse, hover, focus,
  task completion). At rest the page is essentially white.

## Color (OKLCH; never pure #fff or #000)

```css
:root {
  /* field */
  --paper:      oklch(98.5% 0.004 240);   /* page */
  --paper-2:    oklch(97.2% 0.006 235);   /* alternate section field */
  --ink:        oklch(21% 0.016 250);     /* primary text */
  --ink-2:      oklch(45% 0.020 245);     /* secondary text */
  --ink-3:      oklch(62% 0.014 240);     /* tertiary, captions */
  --line:       oklch(90% 0.008 235);     /* hairlines */

  /* iris spectrum (Siri-adjacent), used at low alpha */
  --iris-cyan:   oklch(82% 0.10 215);
  --iris-azure:  oklch(75% 0.11 255);
  --iris-violet: oklch(72% 0.11 295);
  --iris-pink:   oklch(78% 0.10 340);
  --iris-amber:  oklch(85% 0.09 80);
  --iris-mint:   oklch(86% 0.09 165);

  /* engine node-status semantics (mirror NodeStatus) */
  --st-pending:   oklch(62% 0.014 240 / 0.35);
  --st-running:   var(--iris-azure);
  --st-completed: oklch(72% 0.10 175);
  --st-skipped:   oklch(62% 0.010 240 / 0.30);
  --st-failed:    oklch(66% 0.13 25);      /* sparing */
  --st-flagged:   var(--iris-amber);
}
```

## Typography

- **Sans (display + UI + body): Switzer** (Fontshare, free license,
  self-hosted variable woff2). One committed family; voice comes from weight
  and tracking contrast: display 560–620 weight at −2.5% tracking, body 400
  at 0, labels 500 small-caps-free.
- **Mono (terminal, event captions, code, stats): Commit Mono** (open,
  self-hosted). Upgrade path: Berkeley Mono if a license is purchased; same
  metrics role.
- Scale (fluid, ratio ≥ 1.25):
  `--t-display: clamp(44px, 7.2vw, 88px)` / `--t-h2: clamp(30px, 4vw, 48px)`
  / `--t-h3: 24px` / `--t-body: 17px/1.6` / `--t-small: 14px` /
  `--t-micro: 12.5px` (mono, captions). Body measure 62–70ch.
- Numerals: `font-variant-numeric: tabular-nums` on all stats and the ticker.

## Space, radius, depth

```css
:root {
  --s1: 4px; --s2: 8px; --s3: 16px; --s4: 24px; --s5: 40px;
  --s6: 64px; --s7: clamp(96px, 12vw, 160px);    /* section rhythm */
  --r-pane: 20px; --r-chip: 10px; --r-pill: 999px;
  --shadow-pane: 0 1px 2px oklch(30% 0.02 250 / 0.05),
                 0 16px 40px -16px oklch(30% 0.03 250 / 0.14);
}
```

Section spacing varies deliberately: hero breathes at `--s7`, dense sections
(evals, quickstart) tighten to `--s6`. Identical padding everywhere is banned.

## Material recipes

### Glass pane (engine artifacts)

```css
.pane {
  position: relative;
  background: linear-gradient(180deg,
    oklch(100% 0 0 / 0.72), oklch(98% 0.005 240 / 0.44));
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid oklch(100% 0 0 / 0.65);
  border-radius: var(--r-pane);
  box-shadow: inset 0 1px 0 oklch(100% 0 0 / 0.85),
              inset 0 -1px 0 oklch(75% 0.03 250 / 0.18),
              var(--shadow-pane);
}
@supports not (backdrop-filter: blur(1px)) {
  .pane { background: oklch(99% 0.004 240 / 0.92); }
}
```

### Iridescent rim (mask-composite ring, never gradient text)

```css
.pane.iris::after {
  content: ""; position: absolute; inset: 0; padding: 1px;
  border-radius: inherit; pointer-events: none;
  background: conic-gradient(from var(--rim-angle, 200deg),
    oklch(82% 0.12 215 / .55), oklch(72% 0.13 295 / .50),
    oklch(78% 0.12 340 / .45), oklch(85% 0.10 80 / .40),
    oklch(86% 0.10 165 / .45), oklch(82% 0.12 215 / .55));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  opacity: 0; transition: opacity .28s var(--ease-glass);
}
/* opacity targets: hover .45 · focus-visible .8 · meaning moments .6 */
```

`--rim-angle` is a registered `@property` animated only during meaning
moments (decision shimmer, completion), 6s linear, then frozen.

### Aura (the one Siri presence, hero only)

A 900px conic-gradient disc of the six iris tokens at 10–14% alpha,
`filter: blur(80px)`, masked radially to fade by 70% radius, positioned
behind the hero canvas, rotating 360° per 90s via `transform`. Exactly one
per page. Hidden under `prefers-reduced-motion`.

### Field effervescence

Two ultra-soft radial blobs (`--iris-cyan`, `--iris-violet` at 4–5% alpha,
blur 120px) drifting ±24px over 40s behind content, plus a full-page SVG
fractal-noise grain overlay at 2.5% opacity (kills banding on the near-white
field). Both static under reduced motion.

## Motion

```css
:root {
  --ease-glass: cubic-bezier(0.16, 1, 0.3, 1);   /* ease-out-expo family */
  --ease-settle: cubic-bezier(0.22, 1, 0.36, 1); /* quint */
  --d-micro: 180ms; --d-state: 320ms; --d-materialize: 640ms; --d-scene: 1100ms;
}
```

- Glass never bounces: no elastic or back easings anywhere; overshoot ≤ 2%.
- Animate only `transform`, `opacity`, `filter`, and SVG filter attributes.
  Never layout properties; collapses transition `grid-template-rows`.
- Scroll reveals: items materialize once on first intersection (12% margin),
  child stagger 40–70ms, translate ≤ 16px. No parallax beyond 24px.
- Cursor specular: glass panes get a pointer-tracked radial highlight
  (white 8%, radius 240px), updated via CSS vars in `pointermove`
  (rAF-throttled), desktop only.

### Materialize: the breach (the keystone)

The page surface is a still liquid plane and the viewer looks straight down
at it. A node surfaces face-first through that plane; there is no horizon
line anywhere. Approved direction 2026-06-10 (variant B physics, top-down
camera). Each node renders as **two stacked copies of the same content**: a
crisp layer beneath and a liquid layer above (displaced, blurred, milky),
and the animation is the liquid layer leaving. Four phases, GSAP-driven
(markup and timeline sketch in the spec appendix):

1. **Approach (~45% of the cycle).** Group opacity 0 → 1 in the first half,
   scale 0.88 → 1.0 (rising toward the viewer). The liquid layer carries
   feTurbulence + feDisplacementMap at scale ≈ 34 easing to ≈ 22, blur
   ≈ 3px easing to ≈ 2px, and a milk veil inside the filtered group at 48%
   easing to 36%. Text and rules are present but smeared: almost readable,
   deliberately tantalizing.
2. **Breach (at scale 1.0).** The meniscus: a paired rim (soft dark trough,
   5px stroke at blur 3, outside; bright film crest, 2px stroke at blur 1,
   inside) inflates from the node edge to about +6px while both strokes thin
   and fade. Four corner lobes cling ~200ms longer than the rim, then detach
   outward ~4px shrinking to nothing (droplets). One rounded-rect ripple ring
   expands and fades on the page surface.
3. **Drain (~40%).** The liquid layer is masked by a vertical luminance
   gradient whose front travels top to bottom (front softness ≈ 12% of node
   height): crisp content is revealed *behind* the front. A 2px film-edge
   highlight tracks the front inside the node clip. Displacement, blur, and
   milk ease to zero in lockstep with the front. Near the end a single bead
   forms at the bottom rim and sheds. The border and text sharpening behind
   the front is the payoff of the whole effect; never shorten this phase
   below ~35% of the cycle.
4. **Settle.** A 240ms specular sweep and one iris-rim flash at 60% opacity
   decaying to rest. The filter is detached and the liquid layer removed
   from the DOM.

Per-node cycle ≈ 1.4–1.7s in the hero (the chat reference demo runs slower
for inspection). Max 3 nodes mid-materialize concurrently, stagger 90–140ms.

### Submerge (untaken branches)

The reverse of the breach, stopping at a 12% opacity ghost (not 0): the milk
and displacement return, the node sinks back beneath the surface with a brief
re-formed ring, and a `skipped` chip remains. Skipped nodes still exist in
the audit log; honesty is part of the motion design.

### Glitch (the 1% seasoning)

Chromatic aberration only: duplicate layers offset ≤ 1.5px in cyan/pink at
≤ 35% alpha for ≤ 120ms, single fire, never looping. Permitted on exactly
three things: section index numerals on first reveal, the terminal caret
occasionally (≥ 8s apart), and the eval "0 all-fail" stat on hover. Global
rate ≤ 1 event per 4s. Disabled under reduced motion. Anywhere else: no.

## Reduced motion contract

`prefers-reduced-motion: reduce` delivers a complete, designed experience,
not a broken one: hero shows the final crystallized DAG with statuses and a
static caption ("replay of a recorded run, motion paused"), aura and blobs
static, reveals replaced by opacity-only 150ms fades, glitch and ticker off.

## Accessibility floors

Body text contrast ≥ 4.5:1 on `--paper` (the `--ink` ramp satisfies this);
large display ≥ 3:1. Focus visible everywhere via the iris rim at 0.8 opacity
plus a 2px outline fallback. All meaning conveyed by color (node status) is
duplicated by a text chip or icon shape.
