# Spec: First-draft review fixes

Status: Implemented (2026-06-12) — all P0/P1/P2 items landed and verified;
budgets measured at JS 35.3 KB gz, CSS 5.3 KB gz, fonts 68 KB. Accepted
deviations: the tier-routing micro-demo loops a subtle pulse instead of firing
once, and the terminal types its envelope once on first intersection. The
hero's hover behavior is slow-motion (timeScale 0.18), not a hard pause.
Post-implementation revision (2026-06-12): the drain was changed from a
top-to-bottom sweep to a middle-out elliptical reveal (center breaches
first, corners clear last, lobes detach on cue); DESIGN.md and the spec
appendix carry the updated recipe.
Date: 2026-06-11 (review of commit `0f0e185`)
Owner: implementing agent (Sonnet/Opus/GPT class)
Rubric: `docs/product-website-ui.md` (the UI spec), `DESIGN.md` (tokens +
recipes, including the four-phase breach), `PRODUCT.md` (brand + honesty
rules). Read all three in full before touching code; on conflict the UI spec
and DESIGN.md win.

## How this review was done

Full source read (every file in `src/`, `index.html`, build config), claims
checked against the engine repo (`~/dag-agent`: roadmap gate tables, README
quickstart, planner cookbooks, executor branch semantics, eval suites), and
the rendered site inspected at 1440, 768, and 390 px mid-replay. Build,
`tsc`, and Prettier are green; JS is 31.9 KB gzipped (budget 80), CSS 4.6 KB
(budget 30).

## Verdict

The skeleton is genuinely good: the eight-beat page structure, asymmetric
layouts, copy discipline (no em dashes, vocabulary matches
`grassroots-marketing.md`), token fidelity to DESIGN.md, the data-driven
replay schema, and the budgets are all right. What is missing is the layer
the spec calls the reason the site exists: the hero materialize is a
crossfade, not the breach; the glass identity is invisible because the field
behind it is blank white; the tenet micro-demos are inert placeholder boxes;
and there are four launch-blocking honesty/correctness defects. The fix list
below is ordered; P0 items block launch, P1 items are the dazzle, P2 is
polish. Work top to bottom.

---

## P0 — launch blockers (honesty, correctness, mobile)

### P0.1 Replay 3 leaks eval-suite content

`src/replay/plans.ts`, third entry: task "Read a short brief, summarize the
named facts…", answer "Summary preserved the planted date, percentage, and
owner", labels "Read brief / Summarize facts / Check coverage". This is the
engine's eval task family (`eval-framework/suites/glassrail/tasks/
summarize-doc/` and the held-out `heldout-summarize`) reproduced on the
marketing page, complete with "planted", which is internal grader jargon.
The site would be demoing the product on its own test set while §5 sells
eval integrity, and it advertises held-out suite content that the engine
repo deliberately never iterates against.

**Fix.** Replace replay 3 with the web-research shape from the planner's
bundled cookbook (`web_research`: tool search/fetch → summary condenses noisy
sources → result). Suggested script, schema-valid and vocabulary-clean:

- task: `Find the latest release of the queue library and cite the source.`
- nodes: `1 tool "Search release notes"` (layer 0) → `2 summary
"Condense sources"` (layer 1, deps [1]) → `3 result "Answer with citation"`
  (layer 2, deps [2]).
- answer: `Latest release identified and cited from the changelog.`
- Events mirror replay 1's pacing; ticker text for node 1 can be
  `web_search args`.

This also restores the spec's intended cycle order: fan-out compare →
conditional branch → web research. Acceptance: `rg -i "planted|read brief|
summarize facts|check coverage" src/` returns nothing.

### P0.2 Evidence table omits the held-out all-fail and all trial counts

`index.html:254-278`. The roadmap's June 11 confirmation table
(`docs/roadmap.md` in the engine repo) records glassrail-heldout as
**10/12 full-pass (83%), 1 all-fail, 11/12 pass@k**. The site shows
"10/12 full-pass · 11/12 pass@k" — the one all-fail is silently dropped while
the row above advertises "0 all-fail". That is exactly the cherry-pick the
honesty constraints ban. The spec also requires every stat to carry suite,
**trial count**, and date; no row shows trials.

**Fix.**

- Heldout row result: `10/12 full-pass · 1 all-fail · 11/12 pass@k`.
- Add trials to each suite cell, matching the roadmap format: e.g.
  `glassrail-openrouter (23 tasks · 3 trials)`, `harness-mechanics (32 tasks
· 3 trials)`, `node-capability-openrouter (7 tasks · 3 trials)`,
  `glassrail-heldout (12 tasks · 3 trials)`.
- Hero badge (`index.html:60-64`): name the suite. Layout allowing:
  `glassrail-openrouter` / `20/23 full-pass` / `0 all-fail · 3 trials ·
Jun 11, 2026`.
- Set the result numerals in mono (`.mono` on the result cells); the spec
  asks for mono numerals in this table.

### P0.3 Mobile viewport blows out (page renders zoomed-out with sideways pan)

At 390 px the layout viewport inflates to ~825 px: `document.scrollingElement
.scrollWidth` is 825 vs `clientWidth` 390. Cause: unclipped fixed/absolute
decoration — `.aura` is a hard 900×900 px box (`sections.css:54-75`) and both
`.field-blob`s have `min-width: 420px` with negative offsets
(`base.css:156-181`). Real phones load the page zoomed out with horizontal
scroll; the nav links sit half off-screen.

**Fix.**

- `html, body { overflow-x: clip; }` (clip, not hidden — keeps any future
  sticky working and avoids creating a scroll container).
- Size the aura responsively: `width: min(900px, 120vw)` (same for height),
  and let the hero stage clip it on small screens if needed.
- Acceptance, run at 390/768/1440 in the console:
  `document.scrollingElement.scrollWidth === document.documentElement.clientWidth`.

### P0.4 Replay 2's plan shape is not real plan grammar

`src/replay/plans.ts`, second entry: the result node declares `deps: [3]`
(the think branch only). Plans are accepted before execution; a planner
cannot know the branch in advance, so a result depending only on one branch
is a plan that could never complete on the other branch. The engine's
executor explicitly supports merge nodes: a node runs when at least one
non-decision input completed (`executor.py`, `_only_uses_skipped_content` —
"a merge node with one completed branch and one skipped branch runs").

**Fix.** `result` deps become `[2, 3]`. Bonus: the rendered graph then shows
a rail from the skipped ghost into the result — a literal picture of
"skipped nodes still exist in the audit log."

---

## P1 — the hero gap (the keystone effect, in dependency order)

The spec calls the Crystallizer "the centerpiece and the reason the site
exists." What is implemented is a competent node-by-node fade-in; the breach
(DESIGN.md "Materialize: the breach", spec appendix markup + timeline) is
not there. The appendix in `docs/product-website-ui.md` is the authoritative
recipe — phases, proportions (~45% approach, breach at scale 1.0, ~40% drain,
never below ~35%), and the two-layer technique. Implement it exactly; the
2026-06-10 chat demo it encodes is the approved reference for feel.

### P1.1 The two-layer drain does not exist

`crystallizer.ts:267-304` (`materialize`). Today the liquid copy just fades
(`liquid.opacity → 0` at +1.2 s). There is no drain mask, no traveling front,
no film-edge highlight — so the payoff moment (border and text snapping crisp
_behind_ a visible front) never happens, and the whole effect reads as a
blurry crossfade. Per the appendix: give each node a `<mask>` driven by a
two-stop vertical gradient; animate the front from −0.12 to 1.12 with
`power2.inOut` over the drain phase; track a 2px film-edge highlight inside a
node clip; ease displacement scale, blur stdDeviation, and milk fill-opacity
to zero in lockstep with the front.

Related correctness bug to fix while in here: the milk rect is created with
alpha baked into `fill` and **no opacity attribute**, then tweened via
`attr: { opacity: 0 }` (`crystallizer.ts:174-179, 301`). Use
`fill-opacity="0.48"` at creation and tween that attribute, per the recipe.

### P1.2 Breach furniture: meniscus, corner lobes, ripple, bead, settle

Only a single expanding rect-ring exists today (`materialize`'s `ring`).
Missing, all specced in DESIGN.md phases 2–4: the paired meniscus rim (dark
trough outside + bright film crest inside, inflating ~6px while thinning),
the four corner lobes that cling ~200 ms longer then detach as droplets (the
surface-tension signature this whole design was approved for), the
rounded-rect ripple on the page surface, the single bottom bead near drain
end, and the settle (240 ms specular sweep + one iris-rim flash at 0.6
decaying). Implement as small helper timelines (`meniscusRing`,
`cornerLobes`, `rippleRing`, `bottomBead`, `specularSweep`, `irisRimFlash`)
added at the appendix's offsets.

### P1.3 Filters must detach; liquid layers must leave the DOM

Every node keeps its `feTurbulence + feDisplacementMap + feGaussianBlur`
filter attached for the whole cycle and the liquid group stays mounted at
opacity 0. The budget says: displacement live on ≤ 3 groups at once,
**detached after each tween**. On settle: remove the `filter` attribute and
`liquid.remove()` (the appendix timeline does this in `onComplete`).

### P1.4 The task prompt is never shown

`replay.task` is dead data — `buildScene` (`crystallizer.ts:208-265`) never
renders it, so a viewer watches a graph solve an unknown problem and then an
answer card appears for a question they never saw. Storyboard beat 1: a
minimal glass input pane types the task (0–1.5 s), then planning starts.
Implement a small HTML pane at the top of the stage that types `replay.task`
(character interval ~18–24 ms, mono caret), stays visible during the cycle,
and submerges with the graph at dissolve.

### P1.5 Validation pulse at `plan_ready`

The ticker says "plan_ready · validated · acyclic" but nothing happens
visually. Storyboard beat 2 ends with a single clean white ring pulse
crossing the whole graph with the microcopy `validated · acyclic`. One
expanding circle (SVG, stroke white 0.8 → 0, scale to cover the graph) timed
to the `plan_ready` event is enough.

### P1.6 Rails: presence and choreography

`crystallizer.ts:306-319`. All rails draw in one batch at a hardcoded 5.25 s,
regardless of when their endpoint nodes finish breaching, and at
`oklch(75% 0.11 255 / 0.36)` × 1.5 px they are nearly invisible — the brand
is glass + **rail**; the rails must read. Fixes: draw each rail when both its
endpoints have settled (schedule per-rail inside the materialize bookkeeping
rather than one `drawRails` call); raise presence (2 px, alpha ~0.55, plus a
1 px white core); send a faint light along each rail as it draws (the
existing dash-segment pulse technique, low alpha).

### P1.7 Decision shimmer and animated submerge

- Decision: at `branch_decided` the node's stroke snaps amber
  (`applyEvent`, `crystallizer.ts:368-374`). Spec: while the condition shows,
  the node gets the iris rim shimmer (animate a conic rim rotation on an
  SVG ring or reuse the rect stroke with a hue sweep ≤ chroma 0.14), then the
  chip reads `branch · no`.
- Submerge: skipped nodes currently snap to opacity 0.18 via `setAttribute`
  (`setNodeStatus`, `crystallizer.ts:341-356`). Spec: animated reverse of the
  breach — milk and displacement return, node sinks to a **12%** ghost with a
  brief re-formed ring, `skipped` chip remains legible.

### P1.8 Envelope strip must track the run

`crystallizer.ts:387` sets `"status": "planning" · "plan": null` at t=0 and
nothing updates it until `task_completed` — it spends the entire execution
lying. Drive it from events: `plan_ready` → `"status": "executing" ·
"nodes": N`; each `node_finished` → e.g. `"tier_used": 0/1` (the spec wants
two lines of the real `--json` envelope; match the engine's field names from
the terminal pane in §4). Also: at ≤ 980 px it overlaps the bottom node
(seen at 768) — anchor it under the SVG or hide below 980 instead of
absolute-positioning over the scene.

### P1.9 SVG nodes must look like glass, and chips must not collide

- Nodes are flat: one 0.58-alpha white fill + hairline stroke. SVG can't
  backdrop-blur, but the spec's substitute is layered fills: add an inner
  top highlight (1 px white line or a top-half white 0.25 overlay rect), a
  slightly stronger fill, and one soft `drop-shadow` filter on the **group
  layer**, not per node (shared, cheap). Status color stays on the stroke.
- The status chip is bare `<text>` end-anchored at the label baseline
  (`buildNode`, `crystallizer.ts:157-164`): every long label collides with it
  ("Compare trade-offs" + "completed", "Summarize facts" + "pending" — seen at
  every width). Make it a real chip (small rounded rect + text) docked
  top-right of the node, and move the label to its own line with available
  width = NODE_W − 24; widen NODE_W to ~170 if needed.

### P1.10 Hero lifecycle: idle start, hover pause, honest reduced frame

- Start the replay after `requestIdleCallback` (spec LCP note), not
  synchronously in `main.ts`.
- Pause on hover (spec): `pointerenter`/`pointerleave` on the stage →
  `timeline.pause()/resume()`, alongside the existing IntersectionObserver.
- `renderReduced` (`crystallizer.ts:412-426`) marks **every** node completed
  — including replay 1's untaken-branch-free plan, fine, but switch the
  static frame to a replay with a decision (or apply each replay's terminal
  statuses from its events) so the frame doesn't misrepresent skipped nodes
  as completed. Statuses in the final frame must match the recorded events.

### P1.11 Make the glass visible: the field is too white

At 1440 the pane interior is indistinguishable from the page; the aura
contributes nothing (confirmed by inspection; at 768 it faintly works). The
glass identity needs something behind it:

- `.crystallizer`'s own background (`sections.css:86-88`) starts with a
  white radial at 0.74 alpha — it veils the aura. Drop that layer's alpha to
  ~0.45 and the linear layer to 0.5/0.3.
- Raise aura stop alphas from 0.10–0.12 to 0.14–0.16 (still well inside
  Law 2: one aura, low chroma).
- Reposition `.field-blob-a` so it sits partially behind the hero pane at
  desktop widths, and add `transform: translateZ(0)` only if repaint cost
  shows up.
- Sanity check against Law 2 after tuning: iridescent area ≤ 10% per
  viewport, fills ≤ 0.09 chroma.

### P1.12 Mobile hero reflow

At ≤ 768 the full 780×560 viewBox scales down and node text lands around
6 px (illegible, confirmed at 390). The spec's answer: a vertical excerpt.
Implement a second layout path in `layoutNodes` for narrow stages: single
column, first ~4 nodes of the plan (or the plan's spine: layer-0 node,
decision/middle, result), NODE_W ~200 at viewBox width ~260, height-capped
70vh. Same choreography. Cheap heuristic: if stage clientWidth < 480, use
the column layout.

---

## P2 — page polish (order within is flexible)

1. **Tenet micro-demos are inert placeholders.** The six demo strips render
   as empty bordered boxes (context/branch demos), a stray dashed ellipse
   (cycle), static bars. Spec: each tenet runs a ≤ 2 s in-view micro-demo,
   static final frame under reduced motion. Minimum implementation, all
   IntersectionObserver-triggered, CSS-only where possible:
   - _Plan as document_: JSON slice crossfades to a 3-node mini graph.
   - _Fresh context_: two of four upstream boxes illuminate (opacity+rim),
     others stay fogged — add tiny mono labels so the static state reads.
   - _Validated_: a dashed edge tries to close a cycle and snaps back;
     `cycle rejected` chip blinks once. (The current lone ellipse reads as a
     mistake; even the static frame needs the two nodes + rejected edge.)
   - _Routing_: a dot drops through four shelves, falls through a dimmed
     tier 2 to tier 3 on the second pass.
   - _Branching_: taken edge brightens, untaken side dims to ghost + chip.
   - _Eval-gated_: the two bars fill to 100% (23/23 pass@k) and 87% (20/23
     full-pass) **with tiny mono labels naming them** — unlabeled bars are
     decoration, and these numbers must stay tied to the June 11 run.
2. **Tenet chips render full-width** (`.chip` stretches inside the flex
   column — every tenet shows an input-looking bar). `align-self:
flex-start` on `.chip` (`components.css:206`).
3. **Section numerals collide with content.** "06" sits on top of
   "ARCHITECTURE" (and every constrained section stacks the numeral on the
   eyebrow); full-bleed sections put it at the page edge instead —
   inconsistent. Give `.section-index` one rule: outside the content column
   at wide viewports (`left: calc(-1 * clamp(40px, 5vw, 72px))` on the
   relative section), top-aligned with the eyebrow baseline; keep hidden
   ≤ 760 px. Then make first-reveal the glitch trigger (spec: numerals
   glitch on first reveal; hover stays only for the `0 all-fail` stat) and
   gate `initGlitch` on `prefers-reduced-motion`.
4. **Terminal is static.** Add the blinking caret (mono block, 1.1 s steps)
   as the second permitted glitch site (single chromatic flick ≥ 8 s apart),
   and type the envelope lines once on first intersection (~12 ms/char, then
   stay). Keep it HTML; it already has true backdrop blur.
5. **Backdrop-filter budget.** Six `.pane` tenets + two §2 panes each carry
   live `backdrop-filter` (budget: ≤ 4 per viewport). Over flat paper the
   blur does nothing anyway: give `.tenet.pane` and the §2 artifacts the
   `@supports`-fallback background (`oklch(99% 0.004 240 / 0.92)`) via a
   `.pane--still` modifier with no backdrop-filter, reserving live blur for
   the crystallizer, ticker, terminal, eval pane, and scrolled nav.
6. **Links have no rest-state affordance.** `.text-link` and `.nav-links a`
   are bare inherited-color text until hover ("View source", "Read the
   roadmap" are invisible as links). Give text links a 1 px underline at
   rest (`text-decoration-color` at ink-3, full ink on hover) — also a WCAG
   1.4.1 fix.
7. **Fonts are not loaded.** `base.css` declares Switzer/Commit Mono but no
   `@font-face` exists and `public/fonts/` is absent — every visitor gets
   system fallbacks while DESIGN.md specs self-hosted subset woff2 (≤ 130 KB
   total, budget currently unspent; JS is at 32 of 80 KB). Add
   latin-subset variable woff2 for both, `font-display: swap`, preload the
   text face, and `size-adjust`ed fallbacks to hold CLS ≤ 0.02.
8. **Social card is an SVG with a relative URL.** `og:image` is `./og.svg`
   (`index.html:18`): scrapers (Twitter/Slack/Discord/LinkedIn) need an
   absolute URL and most reject SVG. Render `public/og.png` (1200×630) and
   set the absolute URL; add `twitter:card = summary_large_image`.
9. **Reduced-motion blanket kills the designed fades.** `base.css:195-204`
   forces `transition-duration: 0.001ms !important` on everything, defeating
   the contract's 150 ms opacity reveals (`components.css:254-259`). Scope
   the blanket (exclude `.reveal`, or drop `transition-duration` from it and
   rely on per-component rules). Also hide `.aura` entirely under reduced
   motion (DESIGN says hidden, not just frozen).
10. **Copy nits.** §3 H2 "The rails are concrete." contradicts the material
    system (rails are glass; concrete is the wrong substance) — suggest
    "The rails are load-bearing." Fix `body::selection` →
    `::selection` (`base.css:29`, currently matches nothing). Wordmark
    underline draw-on should run on the header only, not re-fire in the
    footer (`components.css:116-127` applies to both).
11. **Small mechanics.** rAF-throttle the specular `pointermove` writes
    (`specular.ts`); add `npm run format` to the Pages workflow next to the
    build; mark the ticker/envelope `aria-hidden="true"` and keep the scene's
    single `aria-label` as the text alternative (screen readers should get
    one coherent description, not a stream of event fragments).

## Accepted deviations (do not churn)

- `pip install glassrail` pill matching the README beats the spec's `uvx`
  example — keep.
- IntersectionObserver for reveals instead of ScrollTrigger — keep (cheaper;
  GSAP stays for the hero only).
- Eval table "Release bar" column as text instead of drawn bars — keep.
- `materialize.ts`/`ticker.ts` folded into `crystallizer.ts` — keep the
  monolith if it stays under ~700 lines after P1; split only if it helps.

## Acceptance criteria

- `npm run build` (tsc + vite) and `npm run format` green; JS ≤ 80 KB gz,
  CSS ≤ 30 KB gz, fonts ≤ 130 KB total.
- `rg -i "planted|read brief|summarize facts|check coverage" src/` → empty.
- Evidence table shows trials on all four rows and `1 all-fail` on the
  held-out row; hero badge names the suite; numbers still match the engine
  repo's `docs/roadmap.md` June 11 confirmation table exactly.
- At 390, 768, 1440: `scrollWidth === clientWidth` on the scrolling element;
  no element paints outside the viewport except intentionally clipped decor.
- Hero: task types in; nodes breach with meniscus + corner lobes + ripple;
  drain front reveals crisp text behind it; filters detached and liquid
  groups removed post-settle (`document.querySelectorAll('[filter]')` inside
  the scene returns only mid-breach nodes, ≤ 3); rails draw per-edge after
  endpoints settle; decision shimmers; skipped branch submerges to a 12%
  ghost with chip; envelope strip tracks planning → executing → completed.
- Mobile hero shows the column excerpt with legible labels (≥ 11 px
  effective).
- Reduced motion: static final frame with statuses matching the recorded
  events, label visible, aura hidden, glitch off, reveals 150 ms
  opacity-only.
- Live `backdrop-filter` count ≤ 4 in any viewport (tenets use the still
  variant).
- Lighthouse mobile ≥ 90 / desktop ≥ 95 / a11y ≥ 95, recorded in the PR.
- The `impeccable` skill's `audit` and `polish` passes run with
  `IMPECCABLE_CONTEXT_DIR` pointed at this repo root (PRODUCT.md/DESIGN.md
  here), findings addressed or explicitly waived in the PR description.

## Suggested implementation order

P0.1–P0.4 (one commit, launch-safe immediately) → P1.1–P1.3 (the breach,
behind a clean `breach(node)` helper mirroring the appendix) → P1.4–P1.8
(narrative beats) → P1.9–P1.12 (presence + mobile) → P2. Keep each step
buildable; screenshot the hero after P1.3 and compare against the appendix
phase descriptions before moving on.
