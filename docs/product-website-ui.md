# Spec: Product website UI

Status: Proposed
Priority: release window — launches with or shortly after the PyPI release;
grassroots marketing waits for it.
Depends on: [product-website.md](product-website.md) (positioning, IA,
acceptance — still binding), [grassroots-marketing.md](grassroots-marketing.md)
(messaging guardrails — binding for all site copy).
Implements: the visual/interactive layer. Design tokens and material recipes
live in `website/DESIGN.md`; brand context in `website/PRODUCT.md`. Both are
part of this spec and are written to be consumed by the `impeccable` design
skill.

## Purpose

Build the Glassrail marketing site as a single long-scroll page that genuinely
dazzles a technical reviewer without a single hype sentence. The brief, in one
line: **Apple's Liquid Glass material discipline, the Codex UI's typographic
calm, a Siri-spectrum accent dialed to 5–10%, one breath of glitch-tech, on a
clean near-white field; and a hero where the agent's plan surfaces through
the page itself, each node breaching the screen plane like glass rising
through still liquid viewed from directly overhead, then executes.**

The concept that holds it together: the product is named glass + rail, and its
thesis is that agent work should be inspectable. So the site's one big rule is
**semantic glass** (DESIGN.md law 1): everything the engine produces (nodes,
rails, terminal, plans, eval panes) renders as glass you can see into;
everything else is solid, quiet, near-white. The dazzle is choreography on the
engine's artifacts, never decoration on the page. This is the deliberate,
named exception to the design skill's "no decorative glassmorphism" ban: glass
here is the identity, and it is constrained to surfaces where transparency
_means_ something.

## For the implementing agent: workflow and precedence

1. Read repo `CLAUDE.md`, this spec, `website/PRODUCT.md`, and
   `website/DESIGN.md` in full before writing code.
2. Invoke the `impeccable` design skill with `IMPECCABLE_CONTEXT_DIR=website`
   (or run with `website/` as cwd) so it loads the PRODUCT/DESIGN context.
   Use its `audit` and `polish` passes before calling the site done.
3. **Precedence on conflict:** this spec and `website/DESIGN.md` win over the
   skill's general taste rules; the skill's _absolute bans_ still hold and
   this design already complies (no gradient text, no side-stripe borders, no
   hero-metric template, no identical card grids, no modals, no em dashes in
   copy, OKLCH everywhere, no pure `#fff`/`#000`).
4. **Honesty constraints are design constraints:**
   - The hero is labeled "replay of a recorded run" in the caption strip.
   - Node execution renders **sequentially** (one node in `running` state at
     a time). The engine is sequential today (`CLAUDE.md` architectural
     primitives); the site must not depict concurrency until
     `docs/specs/parallel-execution.md` ships, after which the replay may run
     layer-concurrent.
   - Eval numbers are quoted with suite name, trial count, and date, sourced
     from the roadmap's gate tables. No invented stats, no rounding up.
   - All copy obeys the use/avoid vocabulary in `grassroots-marketing.md`.
5. Verify in a real browser at 390 px, 768 px, and 1440 px; test
   `prefers-reduced-motion`; test Safari (backdrop-filter and mask-composite
   both need `-webkit-` forms and the `@supports` fallbacks in DESIGN.md).

## Tech stack (decided; do not substitute)

- **Vite + TypeScript (strict) + vanilla DOM.** No React/Vue/Svelte: one page,
  and a framework would spend the JS budget on plumbing.
- **GSAP core + ScrollTrigger** is the only runtime dependency. It drives the
  hero timeline (including SVG filter attribute tweens) and scroll reveals.
- Plain CSS with custom properties (tokens from DESIGN.md). No Tailwind, no
  CSS-in-JS. PostCSS only if needed for nesting.
- Fonts self-hosted as subset woff2: Switzer (variable) + Commit Mono per
  DESIGN.md. No font CDNs.
- Prettier for formatting; `tsc --noEmit` must pass; `npm run build` must
  pass. Add a `website` CI job mirroring these once the site lands.

```
website/
├── index.html
├── PRODUCT.md            (exists — skill context)
├── DESIGN.md             (exists — tokens + recipes)
├── package.json          (vite, typescript, gsap, prettier)
├── vite.config.ts
├── public/               favicons, og.png (1200×630), fonts/
└── src/
    ├── main.ts
    ├── styles/           tokens.css · base.css · components.css · sections.css
    ├── replay/           plans.ts (three plan scripts) · schema.ts
    └── lib/              crystallizer.ts · materialize.ts · ticker.ts ·
                          specular.ts · glitch.ts · reveal.ts
```

Deployment: static `dist/`; host on Cloudflare Pages or Vercel under the
canonical domain (open decision flagged in product-website.md — ask Andrew).
GitHub Pages remains the MkDocs documentation site; the two link to each
other.

## The hero: the Crystallizer

The centerpiece and the reason the site exists. A live SVG scene (not video,
not WebGL) in which a task becomes a validated plan and executes, rendered in
the product's real vocabulary.

### Storyboard (one cycle ≈ 24 s, then next plan shape; 3 shapes loop)

1. **Prompt (0–1.5 s).** A minimal glass input pane types a real task, e.g.
   "Compare three datastores for a high-write event stream and recommend
   one." Caption ticker (mono, `--t-micro`): `planning_started`.
2. **Surfacing (1.5–6 s).** Nodes breach the page surface from directly
   beneath it, in topological order, using the breach recipe (DESIGN.md):
   each rises as a smeared, milky, refracted version of itself, breaks the
   plane with a meniscus ring and corner droplets, then drains crisp, its
   border and text sharpening behind the drain front. Edges (the _rails_)
   draw on between them with a faint light running their length. Ticker:
   `plan_ready`. Then a single clean white ring pulse crosses the whole graph
   with the microcopy `validated · acyclic`.
3. **Execution (6–18 s).** Strictly one node at a time (see honesty
   constraints): ticker `node_started`, a pulse travels the inbound rail, the
   node's border takes `--st-running`, then `--st-completed` with
   `node_finished`. Tool nodes flash a tiny args chip; summary/synthesis nodes
   shimmer a line of streaming text. At the decision node the iris rim
   shimmers while the condition shows, then `branch_decided · yes`; the
   untaken branch **submerges** to 12% ghosts with `skipped` chips (they
   stay visible: skipped nodes still exist in the audit log).
4. **Result (18–22 s).** The result node breaches brighter and emits the
   final answer into a glass answer card; ticker `task_completed`. The side
   strip shows two lines of the real `--json` envelope.
5. **Dissolve (22–24 s).** The graph submerges; the next plan shape begins. Cycle order: compare/aggregate fan-out → conditional branch
   → web research. The shapes are taken from the planner's bundled cookbook
   skeletons (`src/glassrail/planner/cookbooks/`) so the demo shows real plan
   grammar.

A small "replay of a recorded run" label sits under the ticker, always
visible. Pause on hover; pause when offscreen (IntersectionObserver); the
page never scroll-jacks.

### Replay script schema (`src/replay/schema.ts`)

The animation is data-driven, not hand-keyframed, so it stays honest and
extensible. Event names mirror the engine's real event types so a future
version can be generated from an actual captured run:

```ts
interface ReplayPlan {
  nodes: {
    id: number;
    type: "tool" | "decision" | "synthesis" | "think" | "summary" | "result";
    label: string;
    layer: number;
    deps: number[];
  }[];
}
interface ReplayEvent {
  t: number; // ms offset in the cycle
  e:
    | "planning_started"
    | "plan_ready"
    | "node_started"
    | "node_finished"
    | "branch_decided"
    | "task_completed";
  node?: number;
  branch?: string;
  status?: "completed" | "skipped";
  text?: string; // streamed snippet / final output
}
interface Replay {
  task: string;
  plan: ReplayPlan;
  events: ReplayEvent[];
}
```

`crystallizer.ts` builds one GSAP timeline per cycle from a `Replay`. The
three scripts in `plans.ts` are hand-authored but schema-valid; timings are
compressed (a real run takes minutes).

### Technical notes

- One `<svg>` scene; each node is a `<g>` containing a foreignObject-free
  rounded rect "pane" styled per DESIGN.md (SVG equivalents: white fills at
  0.5–0.7 alpha, 1px light stroke, drop-shadow filter used sparingly). The
  page-level backdrop blur does not apply inside SVG; fake the glass depth
  with layered fills, and reserve true `backdrop-filter` panes for HTML
  components (terminal, answer card).
- Materialize uses the filter in the appendix; apply the filter attribute to
  a node group only for the duration of its tween, then remove it. Never
  more than 3 nodes carrying an active displacement filter.
- Rails are `<path>` elements; draw-on via `stroke-dashoffset`; the traveling
  pulse is a short high-opacity dash segment animated along the same path.
- The Siri aura (DESIGN.md) sits behind the SVG as an HTML element, the only
  aura on the page.
- Target 60 fps on Apple Silicon, graceful at 30 fps elsewhere: if
  `matchMedia('(prefers-reduced-motion)')` is set, render the final frame of
  cycle 1 statically; if `navigator.deviceMemory ≤ 4`, halve concurrent
  materializes and drop the frost-mask layer.
- Mobile (≤ 768 px): the scene reflows to a vertical 3-layer excerpt of the
  plan (fewer nodes), same choreography, height-capped to 70vh.

## Page architecture

One scroll, eight beats. Section rhythm and spacing per DESIGN.md; copy is
drawn from existing sources (README, `docs/index.md`,
`docs/release/product-website.md`) and tightened; never invent claims.
Asymmetric layout throughout: no centered-stack hero, no identical card rows.

1. **Nav.** Wordmark `glassrail` (Switzer, lowercase, with a 2px iridescent
   rail underline that draws on load, the one logo gesture), links: GitHub ·
   Docs · Install. Transparent at top; becomes a veil-glass bar after 80 px
   scroll (nav is chrome, but after scroll it floats _over_ engine artifacts,
   which justifies the material).
2. **Hero.** Left 40%: H1 "Agentic workflows you can see through." (display,
   −2.5% tracking), category line "Reliability infrastructure for agentic
   workflows", two sentences of what it is, the install pill
   `uvx glassrail run "…"` with a copy affordance, GitHub link, and the eval
   badge (suite · score · date, links to §6). Right 60%, bleeding to the
   viewport edge: the Crystallizer.
3. **Why plans, not loops.** Two-column contrast on `--paper-2`: left, an
   opaque-loop vignette — a small murky frosted tangle where text is
   illegible _because_ the pane is fogged (the one place frost means
   confusion); right, the same task as a crisp three-node plan. Five
   failure-mode lines and five bet lines from product-website.md, set as two
   plain lists, no cards.
4. **Core tenets.** Six tenets in a varied-span grid (2-1 / 1-2 rhythm, not
   six equal cards), each a glass pane _because each demo is an engine
   artifact_, each with a 2–3 sentence explanation and a ≤ 2 s in-view
   micro-demo, static final frame under reduced motion:
   - _Plan as document_ — a plan JSON crossfades into its rendered graph.
   - _Fresh context per node_ — one node's two declared inputs illuminate;
     every other upstream pane stays frosted.
   - _Validated before it runs_ — a cycle edge attempts to form and is
     declined with a clean snap-back and `cycle rejected` chip.
   - _Deterministic tier routing_ — a pulse drops through four tier shelves,
     settling at the configured one; a second pulse falls through an
     unavailable tier.
   - _Branching is explicit_ — a three-node decision demo, untaken side
     ghosting.
   - _Eval-gated releases_ — twin bars filling: pass@k (capability) vs pass^k
     (reliability), with the one-line distinction.
5. **The audit log replays.** Full-width glass terminal (HTML pane, true
   backdrop blur) replaying `glassrail run --json` with a real envelope
   excerpt; caret blinks; one permitted glitch site. Copy: plan as document,
   replayable, inspectable from headless runs.
6. **Evidence.** The eval gate table (suites, results, bars, dates) from the
   roadmap, rendered as a glass pane with mono numerals; one sentence of
   method and links to `docs/evals.md` and the eval-integrity spec. The
   "0 all-fail" stat is the second permitted glitch site. No generalization
   claims.
7. **Architecture + quickstart.** Left: the layered architecture as stacked
   glass shelves (from `docs/architecture.md`), labels solid. Right: three
   steps — install, point a tier at a model, run — each a copyable mono
   block. Link out to docs for everything deeper.
8. **Footer.** Status honesty strip ("early, 0.x, APIs unstable; here is
   what is deliberately not built yet" linking the roadmap), then Apache-2.0,
   GitHub, PyPI, docs, changelog. Section index numerals (01–08) in the
   left margin throughout are the third glitch site, on first reveal only.

## Component inventory

`pane` (glass artifact surface, HTML) · `pane.iris` rim · SVG node pane ·
rail path · status chip (mirrors NodeStatus colors + text) · caption ticker ·
terminal window (traffic-light-free; title bar shows the command) · copy
button (mono, click feedback: brief iris rim, no toast) · eval bar pair ·
install pill · nav veil · section numeral · answer card · footer. Buttons and
links are solid ink on paper with iris focus rims; primary CTA is the install
pill, not a colored button.

## Budgets (hard requirements)

- JS ≤ 80 KB gzipped total including GSAP; CSS ≤ 30 KB; fonts ≤ 130 KB
  (subset latin); zero images above the fold except `og.png` (unused on
  page); no video.
- LCP ≤ 2.0 s (the H1, not the canvas — the Crystallizer starts after
  `requestIdleCallback`); CLS ≤ 0.02; Lighthouse ≥ 90 performance mobile,
  ≥ 95 desktop, ≥ 95 accessibility.
- ≤ 4 elements with live `backdrop-filter` per viewport; displacement filter
  on ≤ 3 SVG groups at once and detached after each tween; all animation on
  `transform`/`opacity`/`filter`/SVG filter attributes only; everything
  pauses offscreen.
- Works without JS: content, copy, eval table, and quickstart are server-
  rendered HTML in `index.html`; only the Crystallizer, ticker, reveals, and
  glitch require JS.

## Acceptance criteria

- `npm run build` and `tsc --noEmit` green; Prettier clean.
- Budgets above measured and met (record Lighthouse numbers in the PR).
- The semantic-glass rule audits clean: no glass surface that is not an
  engine artifact (nav-after-scroll exempt as specced), and the iridescence
  budget (DESIGN.md law 2) holds in screenshots at all three widths.
- Reduced-motion pass: complete designed experience, nothing broken or
  missing; hero shows the final crystallized frame with its label.
- Safari, Chrome, Firefox: glass fallbacks render acceptably where
  `backdrop-filter`/`mask-composite` are absent or prefixed.
- Copy audit against `grassroots-marketing.md` use/avoid lists; every stat
  carries suite + date and matches the roadmap tables; the sequential-
  execution constraint is respected in the replay.
- Keyboard: all interactive elements reachable, iris focus rims visible;
  the Crystallizer has an aria-label and a text alternative describing the
  replayed run.
- `impeccable audit` and `polish` passes run, findings addressed.

## Non-goals

- No CMS, blog, dark mode (the white field is the identity; revisit
  post-launch), WebGL, analytics beyond a privacy-respecting counter, or
  multi-page IA. No live backend demo: the replay is recorded by design.
- Not a docs replacement: depth links out to MkDocs.

## Appendix: the breach (two-layer drain) markup + timeline sketch

Each node is two stacked copies of the same content. The liquid copy sits on
top, displaced and milky, masked by a radial luminance gradient stretched to
an ellipse matched to the node's proportions; draining means growing the
gradient front from the center outward while the filter calms (the slab's
center breaches first, the film retreats to the rim, corners clear last —
which is when the corner lobes detach). The crisp copy needs no filter at
any point, which is what keeps text razor-sharp the instant the front
passes it.

```html
<g class="node">
  <g class="crisp"><rect … /><text … />…</g>
  <g class="liquid" mask="url(#drain-7)">
    <g filter="url(#lq-7)">
      <rect … /><text … />…
      <!-- identical content -->
      <rect class="milk" fill-opacity="0.48" />
    </g>
  </g>
  <ellipse class="film-ring" cx="W/2" cy="H/2" rx="0" ry="0" clip-path="url(#nodeclip-7)" />
  <!-- 2px white stroke -->
</g>

<filter id="lq-7" x="-25%" y="-25%" width="150%" height="150%">
  <feTurbulence type="fractalNoise" baseFrequency="0.016 0.04" numOctaves="2" seed="7" result="n" />
  <feDisplacementMap
    in="SourceGraphic"
    in2="n"
    scale="34"
    xChannelSelector="R"
    yChannelSelector="G"
  />
  <feGaussianBlur stdDeviation="3" />
</filter>
<radialGradient
  id="drain-grad-7"
  gradientUnits="userSpaceOnUse"
  cx="0"
  cy="0"
  r="1"
  gradientTransform="translate(W/2 H/2) scale(W/2+10 H/2+10)"
>
  <stop offset="0" stop-color="#000" />
  <!-- inside front: drained -->
  <stop offset="0" stop-color="#fff" />
  <!-- outside front: liquid -->
</radialGradient>
<mask id="drain-7"><rect fill="url(#drain-grad-7)" … /></mask>
```

All per-node defs (gradient, mask, clip) use the node's local coordinate
space — the group is translated to its position, so absolute coordinates in
a `userSpaceOnUse` mask land at double the offset and strand the mask.

```ts
function breach(node: NodeRefs) {
  const f = { v: -0.12 }; // drained-ellipse radius
  // The corner's distance in gradient units depends on aspect ratio, so the
  // front's end value is derived per node; a fixed end strands corner slivers
  // on wide (mobile) nodes.
  const fEnd = Math.hypot(node.w / 2 / (node.w / 2 + 10), node.h / 2 / (node.h / 2 + 10)) + 0.08;
  const setFront = () => {
    node.stopBlack.setAttribute("offset", String(clamp(f.v - 0.07, 0, 1)));
    node.stopWhite.setAttribute("offset", String(clamp(f.v + 0.07, 0, 1)));
    const r = Math.max(0, f.v);
    node.filmRing.setAttribute("rx", String(r * (node.w / 2 + 10)));
    node.filmRing.setAttribute("ry", String(r * (node.h / 2 + 10)));
  };
  return (
    gsap
      .timeline({ onComplete: () => node.liquid.remove() })
      // approach: rise toward the viewer, almost readable
      .fromTo(
        node.g,
        { opacity: 0, scale: 0.88 },
        { opacity: 1, scale: 1, duration: 0.6, ease: "expo.out" },
        0
      )
      .to(node.disp, { attr: { scale: 22 }, duration: 0.6 }, 0)
      // breach: meniscus rim inflates + thins, corner lobes form, ripple
      .add(meniscusRing(node), 0.55)
      .add(cornerLobes(node), 0.62) // swell mid-drain, detach as corners clear
      .add(rippleRing(node), 0.68)
      // drain, middle out: the front reveals the crisp layer center-first;
      // filter calms in lockstep; corners clear last
      .to(f, { v: fEnd, duration: 0.62, ease: "power2.inOut", onUpdate: setFront }, 0.7)
      .to(node.disp, { attr: { scale: 0 }, duration: 0.62 }, 0.7)
      .to(node.blur, { attr: { stdDeviation: 0 }, duration: 0.62 }, 0.7)
      .to(node.milk, { attr: { "fill-opacity": 0 }, duration: 0.62 }, 0.7)
      .add(bottomBead(node), 1.12)
      // settle
      .add(specularSweep(node), 1.34)
      .add(irisRimFlash(node), 1.4)
  );
}
```

Each node gets its own filter, gradient, and mask instance (unique ids and
seeds) to avoid shared-filter repaints. Submerge runs the approach tweens in
reverse to opacity 0.12 with a brief re-formed ring and leaves the `skipped`
chip. The 2026-06-10 chat demo is the approved visual reference for feel and
phase proportions.
