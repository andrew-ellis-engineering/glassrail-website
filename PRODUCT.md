# PRODUCT.md — glassrail product website

register: brand

## What this surface is

The public marketing site for Glassrail, a DAG-planning agent runtime.
Single long-scroll page. Design IS the product here: the visitor's 90-second
impression decides whether the project reads as serious AI infrastructure.
The documentation site (MkDocs) is separate; this surface sells the idea and
hands off to docs, GitHub, and PyPI.

## Users

- AI infrastructure engineers at labs, startups, and big tech evaluating
  whether this project is credible. They will view source, grep the repo, and
  distrust hype.
- Agent-framework users frustrated by opaque loop behavior.
- Hiring reviewers assessing the author's systems taste.
- OSS contributors who care about evals, traces, planning, and routing.

They arrive on a bright desktop display in daylight, deciding fast. Light
theme is forced by the scene, and it is also the identity.

## Brand idea

The product is named glass + rail. The whole visual system derives from that:
**transparency is the thesis.** Glassrail's pitch is that agent work should be
inspectable; the site renders the engine's artifacts (plans, nodes, terminal
output, eval results) as literal glass you can see into, while the page itself
stays calm, solid, near-white. Plans surface through the page the way glass
breaches a still liquid viewed from directly overhead: the hero shows a task
rising into a validated graph, sharpening as the surface drains off it, and
executing, driven by the product's real event vocabulary.

## Voice

Three physical-object words: **lab glassware, optical instrument, clean room.**
Confident and measured; evidence over adjectives. "This is the reliability
thesis and here is the evidence so far," never "this solves agents forever."

Copy rules: every word earns its place; no em dashes (use commas, colons,
periods); no exclamation marks; claims link to evidence (eval tables, docs,
source). Use the approved vocabulary from
`docs/release/grassroots-marketing.md`: early, 0.x, reliability
infrastructure, inspectable, validated DAG, fresh context, deterministic
routing, eval-gated. Banned: production-ready, autonomous software engineer,
LangChain killer, solves hallucination, any claim that eval scores generalize
beyond the suites run.

## Anti-references (what this must not look like)

- Dark-mode terminal-aesthetic dev-tool sites (the category reflex).
- Editorial-typographic landing pages (display serif, italic headline, ruled
  columns, mono labels).
- SaaS theater: gradient hero text, big-number metric strips, identical
  icon-card grids, vague AI imagery, purple-to-blue gradients.
- Decorative glassmorphism: frosted cards sprinkled everywhere for style.
  Glass appears only where it means something (see DESIGN.md law 1).

## Strategic principles

1. The dazzle is choreography, not decoration. One extraordinary animated
   artifact (the hero crystallization) carried by an otherwise restrained,
   precise page beats effects everywhere.
2. Honesty is part of the aesthetic. The hero replay is labeled as a replay;
   eval numbers carry dates and suite names; the animation never shows
   behavior the engine does not have (node execution renders sequentially
   until parallel execution ships).
3. Substance per scroll. Every section teaches something true about the
   system; no section exists only to look good.
4. Performance is brand. A site about reliability that janks has failed;
   budgets in the spec are hard requirements.
