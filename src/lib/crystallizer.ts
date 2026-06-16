import { gsap } from "gsap";
import { replays } from "../replay/plans";
import type { Replay, ReplayEvent, ReplayNode } from "../replay/schema";

const NS = "http://www.w3.org/2000/svg";

// Breach phase offsets within one node's materialize, in seconds.
// Approach ~45%, breach at scale 1.0, drain ~40%, settle. Per DESIGN.md the
// drain is the payoff and never compresses below ~35% of the cycle.
const APPROACH = 0.62;
const DRAIN_AT = 0.7;
const DRAIN_DUR = 0.64;
const SETTLE_AT = DRAIN_AT + DRAIN_DUR; // 1.34
const NODE_DONE = SETTLE_AT + 0.04; // rails may draw once the pane is crisp
const LIQUID_GONE = 1.42; // keeps ≤ 3 displacement filters attached at once
const ANSWER_REVEAL_DELAY = 0.28; // let the completed envelope reflow before the answer paints

interface Metrics {
  width: number;
  height: number;
  nodeW: number;
  nodeH: number;
  mobile: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface NodeView {
  node: ReplayNode;
  group: SVGGElement;
  rect: SVGRectElement;
  liquid: SVGGElement;
  liquidInner: SVGGElement;
  milk: SVGRectElement;
  stopBlack: SVGStopElement;
  stopWhite: SVGStopElement;
  filmRing: SVGEllipseElement;
  crest: SVGRectElement;
  sweep: SVGRectElement;
  irisFlash: SVGRectElement;
  veil: SVGRectElement;
  displacement: SVGElement;
  blur: SVGElement;
  chipText: SVGTextElement;
  chipRect: SVGRectElement;
  filterId: string;
  fEnd: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RailView {
  dep: number;
  target: number;
  path: SVGPathElement;
  core: SVGPathElement;
  pulse: SVGPathElement;
}

interface Scene {
  root: HTMLElement;
  svg: SVGSVGElement;
  ticker: HTMLDivElement;
  taskPane: HTMLDivElement;
  taskText: HTMLSpanElement;
  answer: HTMLDivElement;
  envelope: HTMLDivElement;
  under: SVGGElement;
  over: SVGGElement;
  nodeViews: Map<number, NodeView>;
  rails: RailView[];
  metrics: Metrics;
  doneCount: number;
}

function svgEl<T extends SVGElement>(tag: string, attrs: Record<string, string> = {}): T {
  const element = document.createElementNS(NS, tag) as T;
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }
  return element;
}

function htmlEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text = ""
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getMetrics(root: HTMLElement): Metrics {
  const mobile = root.clientWidth < 560;
  return mobile
    ? { width: 360, height: 560, nodeW: 220, nodeH: 74, mobile }
    : { width: 780, height: 560, nodeW: 170, nodeH: 70, mobile };
}

function terminalStatuses(replay: Replay): Map<number, "completed" | "skipped"> {
  const statuses = new Map<number, "completed" | "skipped">();
  for (const event of replay.events) {
    if (event.e === "node_finished" && event.node) {
      statuses.set(event.node, event.status === "skipped" ? "skipped" : "completed");
    }
  }
  return statuses;
}

// Compact stages show the plan's spine: one node per layer (prefer the node
// that actually ran, then decision/result), at most four layers, chained so
// rails never cross a sibling node.
function spineNodes(replay: Replay): ReplayNode[] {
  const statuses = terminalStatuses(replay);
  const byLayer = new Map<number, ReplayNode[]>();
  for (const node of replay.plan.nodes) {
    const layer = byLayer.get(node.layer) ?? [];
    layer.push(node);
    byLayer.set(node.layer, layer);
  }
  const layers = [...byLayer.keys()].sort((a, b) => a - b);
  const picked = layers.map((layer) => {
    const candidates = byLayer.get(layer) ?? [];
    return [...candidates].sort((a, b) => {
      const ran = (n: ReplayNode) => (statuses.get(n.id) === "completed" ? 0 : 1);
      const kind = (n: ReplayNode) => (n.type === "decision" || n.type === "result" ? 0 : 1);
      return ran(a) - ran(b) || kind(a) - kind(b) || a.id - b.id;
    })[0];
  });
  let kept = picked;
  if (picked.length > 4) {
    const mid = Math.floor((picked.length - 1) / 2);
    kept = [picked[0], picked[mid], picked[picked.length - 2], picked[picked.length - 1]];
  }
  return kept.map((node, index) => ({
    ...node,
    layer: index,
    deps: index === 0 ? [] : [kept[index - 1].id]
  }));
}

function layoutNodes(nodes: ReplayNode[], metrics: Metrics): Map<number, Point> {
  const positions = new Map<number, Point>();
  if (metrics.mobile) {
    const ordered = [...nodes].sort((a, b) => a.layer - b.layer);
    const span = metrics.height - 132 - metrics.nodeH;
    const gap = ordered.length > 1 ? span / (ordered.length - 1) : 0;
    ordered.forEach((node, index) => {
      positions.set(node.id, {
        x: (metrics.width - metrics.nodeW) / 2,
        y: 96 + index * gap
      });
    });
    return positions;
  }

  const byLayer = new Map<number, ReplayNode[]>();
  for (const node of nodes) {
    const layer = byLayer.get(node.layer) ?? [];
    layer.push(node);
    byLayer.set(node.layer, layer);
  }
  const maxLayer = Math.max(...nodes.map((node) => node.layer));
  const layerGap = maxLayer > 0 ? 372 / maxLayer : 160;
  for (const [layer, layerNodes] of byLayer) {
    const gap = metrics.width / (layerNodes.length + 1);
    layerNodes.forEach((node, index) => {
      positions.set(node.id, {
        x: gap * (index + 1) - metrics.nodeW / 2,
        y: 76 + layer * layerGap
      });
    });
  }
  return positions;
}

function nodeColor(type: ReplayNode["type"], alpha = 0.68): string {
  const colors: Record<ReplayNode["type"], string> = {
    tool: `oklch(75% 0.11 255 / ${alpha})`,
    decision: `oklch(85% 0.09 80 / ${alpha})`,
    synthesis: `oklch(86% 0.09 165 / ${alpha})`,
    think: `oklch(82% 0.1 215 / ${alpha})`,
    summary: `oklch(72% 0.11 295 / ${alpha})`,
    result: `oklch(72% 0.1 175 / ${alpha})`
  };
  return colors[type];
}

function truncateLabel(label: string, limit: number): string {
  return label.length > limit ? `${label.slice(0, limit - 1)}…` : label;
}

function appendSharedDefs(defs: SVGDefsElement): void {
  const iris = svgEl<SVGLinearGradientElement>("linearGradient", {
    id: "iris-grad",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0.35"
  });
  const irisStops: Array<[string, string]> = [
    ["0", "oklch(82% 0.12 215 / 0.8)"],
    ["0.22", "oklch(72% 0.13 295 / 0.7)"],
    ["0.45", "oklch(78% 0.12 340 / 0.65)"],
    ["0.68", "oklch(85% 0.1 80 / 0.6)"],
    ["0.86", "oklch(86% 0.1 165 / 0.65)"],
    ["1", "oklch(82% 0.12 215 / 0.8)"]
  ];
  for (const [offset, color] of irisStops) {
    iris.append(svgEl("stop", { offset, "stop-color": color }));
  }
  const sweep = svgEl<SVGLinearGradientElement>("linearGradient", {
    id: "sweep-grad",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0"
  });
  sweep.append(
    svgEl("stop", { offset: "0", "stop-color": "oklch(100% 0 0 / 0)" }),
    svgEl("stop", { offset: "0.5", "stop-color": "oklch(100% 0 0 / 0.42)" }),
    svgEl("stop", { offset: "1", "stop-color": "oklch(100% 0 0 / 0)" })
  );
  defs.append(iris, sweep);
}

// All per-node defs use the node's LOCAL coordinate space (the group is
// translated to its position), so masks and gradients track the group through
// its transforms. Absolute coordinates here double the offset and strand the
// mask away from the node.
function buildNode(
  node: ReplayNode,
  point: Point,
  metrics: Metrics,
  defs: SVGDefsElement
): NodeView {
  const w = metrics.nodeW;
  const h = metrics.nodeH;
  const filterId = `lq-${node.id}`;

  const filter = svgEl<SVGFilterElement>("filter", {
    id: filterId,
    x: "-30%",
    y: "-30%",
    width: "160%",
    height: "160%"
  });
  const turbulence = svgEl("feTurbulence", {
    type: "fractalNoise",
    baseFrequency: "0.016 0.04",
    numOctaves: "2",
    seed: String(node.id + 3),
    result: "noise"
  });
  const displacement = svgEl("feDisplacementMap", {
    in: "SourceGraphic",
    in2: "noise",
    scale: "34",
    xChannelSelector: "R",
    yChannelSelector: "G"
  });
  const blur = svgEl("feGaussianBlur", { stdDeviation: "3" });
  filter.append(turbulence, displacement, blur);

  // Middle-out drain: a unit radial gradient stretched to an ellipse matched
  // to the node's proportions. The slab's center breaches first and the film
  // retreats toward the rim; edge midpoints clear near the end and the
  // corners last of all, which is exactly when the corner lobes detach.
  // The corner's distance in gradient units depends on the node's aspect
  // ratio, so the front's end value is derived per node (fEnd) rather than
  // hardcoded — wider mobile nodes push corners past a fixed 1.12.
  const cornerParam = Math.hypot(w / 2 / (w / 2 + 10), h / 2 / (h / 2 + 10));
  const fEnd = cornerParam + 0.08;
  const gradient = svgEl<SVGRadialGradientElement>("radialGradient", {
    id: `drain-grad-${node.id}`,
    gradientUnits: "userSpaceOnUse",
    cx: "0",
    cy: "0",
    r: "1",
    gradientTransform: `translate(${w / 2} ${h / 2}) scale(${w / 2 + 10} ${h / 2 + 10})`
  });
  const stopBlack = svgEl<SVGStopElement>("stop", { offset: "0", "stop-color": "#000" });
  const stopWhite = svgEl<SVGStopElement>("stop", { offset: "0", "stop-color": "#fff" });
  gradient.append(stopBlack, stopWhite);

  const mask = svgEl<SVGMaskElement>("mask", {
    id: `drain-${node.id}`,
    maskUnits: "userSpaceOnUse",
    x: "-22",
    y: "-22",
    width: String(w + 44),
    height: String(h + 44)
  });
  mask.append(
    svgEl("rect", {
      x: "-22",
      y: "-22",
      width: String(w + 44),
      height: String(h + 44),
      fill: `url(#drain-grad-${node.id})`
    })
  );

  const clip = svgEl<SVGClipPathElement>("clipPath", { id: `clip-${node.id}` });
  clip.append(svgEl("rect", { width: String(w), height: String(h), rx: "18" }));
  defs.append(filter, gradient, mask, clip);

  const group = svgEl<SVGGElement>("g", {
    class: "replay-node",
    transform: `translate(${point.x} ${point.y})`,
    opacity: "0"
  });

  // Crisp copy: never filtered, razor sharp the moment the front passes.
  const rect = svgEl<SVGRectElement>("rect", {
    width: String(w),
    height: String(h),
    rx: "18",
    fill: "oklch(100% 0 0 / 0.66)",
    stroke: nodeColor(node.type),
    "stroke-width": "1.35"
  });
  const topSheen = svgEl<SVGRectElement>("rect", {
    x: "1",
    y: "1",
    width: String(w - 2),
    height: String(h * 0.46),
    rx: "17",
    fill: "oklch(100% 0 0 / 0.2)"
  });
  const topLine = svgEl<SVGLineElement>("line", {
    x1: "16",
    y1: "1.5",
    x2: String(w - 16),
    y2: "1.5",
    stroke: "oklch(100% 0 0 / 0.75)",
    "stroke-width": "1",
    "stroke-linecap": "round"
  });
  const title = svgEl<SVGTextElement>("text", {
    x: "14",
    y: "26",
    fill: "oklch(21% 0.016 250)",
    "font-size": metrics.mobile ? "13" : "12.5",
    "font-weight": "650"
  });
  title.textContent = `${node.id} ${node.type}`;
  const label = svgEl<SVGTextElement>("text", {
    x: "14",
    y: String(h - 18),
    fill: "oklch(45% 0.02 245)",
    "font-size": metrics.mobile ? "11.5" : "11"
  });
  label.textContent = truncateLabel(node.label, metrics.mobile ? 26 : 20);

  const chipGroup = svgEl<SVGGElement>("g", { transform: `translate(${w - 70} 11)` });
  const chipRect = svgEl<SVGRectElement>("rect", {
    width: "58",
    height: "17",
    rx: "8.5",
    fill: "oklch(100% 0 0 / 0.6)",
    stroke: "oklch(62% 0.014 240 / 0.26)"
  });
  const chipText = svgEl<SVGTextElement>("text", {
    x: "29",
    y: "12",
    fill: "oklch(52% 0.014 240)",
    "font-size": "8.5",
    "text-anchor": "middle"
  });
  chipText.textContent = "pending";
  chipGroup.append(chipRect, chipText);

  // Liquid copy: identical content under a near-opaque film, displaced and
  // blurred, masked by the drain gradient. The crisp copy stays hidden
  // beneath it until the front reveals it.
  const liquid = svgEl<SVGGElement>("g", { mask: `url(#drain-${node.id})` });
  const liquidInner = svgEl<SVGGElement>("g");
  const liquidRect = svgEl<SVGRectElement>("rect", {
    width: String(w),
    height: String(h),
    rx: "18",
    fill: "oklch(100% 0 0)",
    "fill-opacity": "0.94",
    stroke: nodeColor(node.type, 0.8),
    "stroke-width": "1.6"
  });
  const liquidTitle = title.cloneNode(true) as SVGTextElement;
  const liquidLabel = label.cloneNode(true) as SVGTextElement;
  const liquidChip = chipGroup.cloneNode(true) as SVGGElement;
  const milk = svgEl<SVGRectElement>("rect", {
    x: "-6",
    y: "-6",
    width: String(w + 12),
    height: String(h + 12),
    rx: "22",
    fill: "oklch(100% 0 0)",
    "fill-opacity": "0.5"
  });
  liquidInner.append(liquidRect, liquidTitle, liquidLabel, liquidChip, milk);
  liquid.append(liquidInner);

  // In-group breach furniture, clipped or bounded to the pane.
  // The film ring is the bright edge of the receding liquid, expanding from
  // the center with the drain front; the node clip keeps it inside the pane.
  const filmRing = svgEl<SVGEllipseElement>("ellipse", {
    cx: String(w / 2),
    cy: String(h / 2),
    rx: "0",
    ry: "0",
    fill: "none",
    stroke: "oklch(100% 0 0 / 0.85)",
    "stroke-width": "2",
    "clip-path": `url(#clip-${node.id})`,
    opacity: "0"
  });
  const crest = svgEl<SVGRectElement>("rect", {
    x: "2",
    y: "2",
    width: String(w - 4),
    height: String(h - 4),
    rx: "16",
    fill: "none",
    stroke: "oklch(100% 0 0 / 0.85)",
    "stroke-width": "2",
    opacity: "0"
  });
  const sweep = svgEl<SVGRectElement>("rect", {
    x: String(-44),
    y: "-4",
    width: "34",
    height: String(h + 8),
    fill: "url(#sweep-grad)",
    transform: "skewX(-16)",
    "clip-path": `url(#clip-${node.id})`,
    opacity: "0"
  });
  const irisFlash = svgEl<SVGRectElement>("rect", {
    x: "-1",
    y: "-1",
    width: String(w + 2),
    height: String(h + 2),
    rx: "19",
    fill: "none",
    stroke: "url(#iris-grad)",
    "stroke-width": "1.5",
    opacity: "0"
  });
  const veil = svgEl<SVGRectElement>("rect", {
    width: String(w),
    height: String(h),
    rx: "18",
    fill: "oklch(98% 0.004 240)",
    "fill-opacity": "0",
    "pointer-events": "none"
  });

  group.append(
    rect,
    topSheen,
    topLine,
    title,
    label,
    chipGroup,
    liquid,
    crest,
    filmRing,
    sweep,
    irisFlash,
    veil
  );
  gsap.set(group, { transformOrigin: `${w / 2}px ${h / 2}px`, scale: 0.9 });

  return {
    node,
    group,
    rect,
    liquid,
    liquidInner,
    milk,
    stopBlack,
    stopWhite,
    filmRing,
    crest,
    sweep,
    irisFlash,
    veil,
    displacement,
    blur,
    chipText,
    chipRect,
    filterId,
    fEnd,
    x: point.x,
    y: point.y,
    w,
    h
  };
}

function railPath(from: NodeView, to: NodeView): string {
  const startX = from.x + from.w / 2;
  const startY = from.y + from.h;
  const endX = to.x + to.w / 2;
  const endY = to.y;
  const midY = (startY + endY) / 2;
  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
}

function buildRail(source: NodeView, target: NodeView): RailView {
  const d = railPath(source, target);
  const path = svgEl<SVGPathElement>("path", {
    d,
    fill: "none",
    stroke: "oklch(75% 0.11 255 / 0.55)",
    "stroke-width": "2",
    "stroke-linecap": "round",
    opacity: "0"
  });
  const core = svgEl<SVGPathElement>("path", {
    d,
    fill: "none",
    stroke: "oklch(100% 0 0 / 0.3)",
    "stroke-width": "1",
    "stroke-linecap": "round",
    opacity: "0"
  });
  const pulse = svgEl<SVGPathElement>("path", {
    d,
    fill: "none",
    stroke: "oklch(86% 0.09 165 / 0.55)",
    "stroke-width": "2.5",
    "stroke-linecap": "round",
    opacity: "0"
  });
  return { dep: source.node.id, target: target.node.id, path, core, pulse };
}

function buildScene(root: HTMLElement, replay: Replay): Scene {
  root.innerHTML = "";
  const metrics = getMetrics(root);
  const nodes = metrics.mobile ? spineNodes(replay) : replay.plan.nodes;

  const ticker = htmlEl("div", "crystallizer-ticker mono", "planning_started");
  ticker.setAttribute("aria-hidden", "true");
  const taskPane = htmlEl("div", "task-pane pane mono");
  taskPane.setAttribute("aria-hidden", "true");
  const prompt = htmlEl("span", "task-prompt", "");
  const caret = htmlEl("span", "task-caret", "");
  taskPane.append(prompt, caret);

  const svg = svgEl<SVGSVGElement>("svg", {
    viewBox: `0 0 ${metrics.width} ${metrics.height}`,
    preserveAspectRatio: "xMidYMid meet",
    role: "img",
    "aria-label":
      "Replay of a recorded Glassrail run where a task becomes a validated DAG and executes sequentially."
  });
  if (metrics.mobile) {
    svg.style.maxWidth = "440px";
    svg.style.margin = "0 auto";
  }
  const answer = htmlEl("div", "answer-card pane", replay.answer);
  const envelope = htmlEl("div", "envelope-strip mono", '"status": "planning"');
  envelope.setAttribute("aria-hidden", "true");

  const defs = svgEl<SVGDefsElement>("defs");
  appendSharedDefs(defs);
  const under = svgEl<SVGGElement>("g", { class: "breach-under" });
  const railsLayer = svgEl<SVGGElement>("g", { class: "rails" });
  const nodesLayer = svgEl<SVGGElement>("g", { class: "nodes" });
  const over = svgEl<SVGGElement>("g", { class: "breach-over" });
  svg.append(defs, under, railsLayer, nodesLayer, over);

  const positions = layoutNodes(nodes, metrics);
  const nodeViews = new Map<number, NodeView>();
  for (const node of nodes) {
    const point = positions.get(node.id);
    if (!point) continue;
    const view = buildNode(node, point, metrics, defs);
    nodeViews.set(node.id, view);
    nodesLayer.append(view.group);
  }

  const rails: RailView[] = [];
  for (const node of nodes) {
    const target = nodeViews.get(node.id);
    if (!target) continue;
    for (const dep of node.deps) {
      const source = nodeViews.get(dep);
      if (!source) continue;
      const rail = buildRail(source, target);
      railsLayer.append(rail.path, rail.core, rail.pulse);
      rails.push(rail);
    }
  }

  root.append(ticker, taskPane, svg, answer, envelope);
  return {
    root,
    svg,
    ticker,
    taskPane,
    taskText: prompt,
    answer,
    envelope,
    under,
    over,
    nodeViews,
    rails,
    metrics,
    doneCount: 0
  };
}

// The drain front: -0.12 fully liquid, 1.12 fully drained. f is the radius
// of the drained ellipse in gradient units; the paired stops keep a soft
// ±0.07 front. The film ring rides the front from the center outward.
function makeSetFront(view: NodeView): (f: number) => void {
  return (f: number) => {
    const ring = Math.max(0, f);
    view.stopBlack.setAttribute("offset", String(clamp(f - 0.07, 0, 1)));
    view.stopWhite.setAttribute("offset", String(clamp(f + 0.07, 0, 1)));
    view.filmRing.setAttribute("rx", String(ring * (view.w / 2 + 10)));
    view.filmRing.setAttribute("ry", String(ring * (view.h / 2 + 10)));
  };
}

function scheduleBreachFurniture(
  scene: Scene,
  view: NodeView,
  at: number,
  timeline: gsap.core.Timeline
): void {
  // Meniscus trough: a soft dark double-stroke just outside the rim,
  // surfacing as the slab reaches the plane, then inflating away.
  const troughA = svgEl<SVGRectElement>("rect", {
    x: String(view.x - 3),
    y: String(view.y - 3),
    width: String(view.w + 6),
    height: String(view.h + 6),
    rx: "21",
    fill: "none",
    stroke: "oklch(32% 0.018 250 / 0.12)",
    "stroke-width": "4",
    opacity: "0"
  });
  const troughB = svgEl<SVGRectElement>("rect", {
    x: String(view.x - 5),
    y: String(view.y - 5),
    width: String(view.w + 10),
    height: String(view.h + 10),
    rx: "23",
    fill: "none",
    stroke: "oklch(32% 0.018 250 / 0.06)",
    "stroke-width": "7",
    opacity: "0"
  });
  const ripple = svgEl<SVGRectElement>("rect", {
    x: String(view.x),
    y: String(view.y),
    width: String(view.w),
    height: String(view.h),
    rx: "18",
    fill: "none",
    stroke: "oklch(75% 0.11 255 / 0.25)",
    "stroke-width": "1.4",
    opacity: "0"
  });
  const bead = svgEl<SVGCircleElement>("circle", {
    cx: String(view.x + view.w * 0.58),
    cy: String(view.y + view.h + 1),
    r: "0",
    fill: "oklch(100% 0 0 / 0.75)"
  });
  scene.under.append(troughB, troughA, ripple, bead);

  // Corner lobes: cling to the corners ~200 ms after the rim lets go, then
  // detach outward and shrink to droplets.
  const inset = 6;
  const lobeSpecs: Array<[number, number, number, number]> = [
    [view.x + inset, view.y + inset, -1, -1],
    [view.x + view.w - inset, view.y + inset, 1, -1],
    [view.x + inset, view.y + view.h - inset, -1, 1],
    [view.x + view.w - inset, view.y + view.h - inset, 1, 1]
  ];
  const lobes = lobeSpecs.map(([cx, cy]) =>
    svgEl<SVGCircleElement>("circle", {
      cx: String(cx),
      cy: String(cy),
      r: "0",
      fill: "oklch(100% 0 0 / 0.62)",
      opacity: "0"
    })
  );
  scene.under.append(...lobes);

  timeline
    // Breach: trough + crest surface together as scale hits 1.0…
    .to([troughA, troughB], { opacity: 1, duration: 0.12 }, at + 0.5)
    .to(view.crest, { opacity: 1, duration: 0.1 }, at + 0.52)
    // …then the rim inflates outward, thins, and lets go.
    .to(
      troughA,
      {
        attr: {
          x: view.x - 9,
          y: view.y - 9,
          width: view.w + 18,
          height: view.h + 18,
          "stroke-width": 1.5
        },
        opacity: 0,
        duration: 0.5,
        ease: "power2.out"
      },
      at + 0.62
    )
    .to(
      troughB,
      {
        attr: {
          x: view.x - 12,
          y: view.y - 12,
          width: view.w + 24,
          height: view.h + 24
        },
        opacity: 0,
        duration: 0.56,
        ease: "power2.out"
      },
      at + 0.62
    )
    .to(
      view.crest,
      { attr: { "stroke-width": 0.6 }, opacity: 0, duration: 0.46, ease: "power2.out" },
      at + 0.64
    )
    .to(ripple, { opacity: 1, duration: 0.08 }, at + 0.6)
    .to(
      ripple,
      {
        attr: {
          x: view.x - 22,
          y: view.y - 22,
          width: view.w + 44,
          height: view.h + 44
        },
        opacity: 0,
        duration: 0.85,
        ease: "power2.out"
      },
      at + 0.64
    )
    // Lobes appear with the rim, then swell as the middle-out front pushes
    // the remaining film into the corners, and detach as it clears them.
    .to(lobes, { attr: { r: 3.5 }, opacity: 1, duration: 0.14, stagger: 0.02 }, at + 0.56)
    .to(
      lobes,
      { attr: { r: 5.5 }, duration: DRAIN_DUR * 0.36, ease: "power1.in" },
      at + DRAIN_AT + DRAIN_DUR * 0.55
    );
  lobeSpecs.forEach(([cx, cy, dx, dy], index) => {
    timeline.to(
      lobes[index],
      {
        attr: { cx: cx + dx * 5, cy: cy + dy * 5, r: 0 },
        opacity: 0,
        duration: 0.34,
        ease: "power2.in"
      },
      at + DRAIN_AT + DRAIN_DUR * 0.92 + index * 0.035
    );
  });
  timeline
    // A single bead forms at the bottom rim as the front reaches it and sheds.
    .to(bead, { attr: { r: 3.2 }, duration: 0.14 }, at + DRAIN_AT + DRAIN_DUR * 0.85)
    .to(
      bead,
      { attr: { cy: view.y + view.h + 12, r: 0.5 }, opacity: 0, duration: 0.36 },
      at + DRAIN_AT + DRAIN_DUR * 0.85 + 0.16
    )
    .call(
      () => {
        for (const el of [troughA, troughB, ripple, bead, ...lobes]) el.remove();
      },
      [],
      at + 2.0
    );
}

function materialize(
  scene: Scene,
  view: NodeView,
  at: number,
  timeline: gsap.core.Timeline
): number {
  const front = { f: -0.12 };
  const setFront = makeSetFront(view);
  setFront(front.f);
  scheduleBreachFurniture(scene, view, at, timeline);

  timeline
    // Approach: rises toward the viewer already liquid — smeared, milky,
    // almost readable — and calms as it nears the surface.
    .set(view.liquidInner, { attr: { filter: `url(#${view.filterId})` } }, at)
    .to(view.group, { opacity: 1, duration: 0.3, ease: "power1.out" }, at)
    .to(view.group, { scale: 1, duration: APPROACH, ease: "expo.out" }, at)
    .to(view.displacement, { attr: { scale: 22 }, duration: APPROACH, ease: "power1.out" }, at)
    .to(view.blur, { attr: { stdDeviation: 2 }, duration: APPROACH, ease: "power1.out" }, at)
    .to(view.milk, { attr: { "fill-opacity": 0.38 }, duration: APPROACH, ease: "power1.out" }, at)
    // Drain: the film recedes from the center outward; crisp content is
    // revealed inside the front while the filter calms to zero in lockstep.
    // Edge midpoints clear near the end, corners last.
    .to(view.filmRing, { opacity: 0.9, duration: 0.1 }, at + DRAIN_AT)
    .to(
      front,
      {
        f: view.fEnd,
        duration: DRAIN_DUR,
        ease: "power2.inOut",
        onUpdate: () => setFront(front.f)
      },
      at + DRAIN_AT
    )
    .to(
      view.displacement,
      { attr: { scale: 0 }, duration: DRAIN_DUR, ease: "power2.inOut" },
      at + DRAIN_AT
    )
    .to(
      view.blur,
      { attr: { stdDeviation: 0 }, duration: DRAIN_DUR, ease: "power2.inOut" },
      at + DRAIN_AT
    )
    .to(
      view.milk,
      { attr: { "fill-opacity": 0 }, duration: DRAIN_DUR, ease: "power2.inOut" },
      at + DRAIN_AT
    )
    .to(view.filmRing, { opacity: 0, duration: 0.16 }, at + SETTLE_AT - 0.06)
    // Settle: one specular sweep, one iris-rim flash, then the liquid layer
    // and its filter leave the DOM entirely.
    .to(view.sweep, { opacity: 1, duration: 0.06 }, at + SETTLE_AT + 0.02)
    .to(
      view.sweep,
      { attr: { x: view.w + 44 }, duration: 0.26, ease: "power1.inOut" },
      at + SETTLE_AT + 0.04
    )
    .to(view.sweep, { opacity: 0, duration: 0.08 }, at + SETTLE_AT + 0.26)
    .to(view.irisFlash, { opacity: 0.6, duration: 0.1 }, at + SETTLE_AT + 0.1)
    .to(view.irisFlash, { opacity: 0, duration: 0.5, ease: "power2.out" }, at + SETTLE_AT + 0.22)
    .call(
      () => {
        view.liquidInner.removeAttribute("filter");
        view.liquid.remove();
        view.crest.remove();
      },
      [],
      at + LIQUID_GONE
    );
  return at + NODE_DONE;
}

function scheduleRailDraw(rail: RailView, at: number, timeline: gsap.core.Timeline): void {
  const length = rail.path.getTotalLength();
  gsap.set([rail.path, rail.core, rail.pulse], {
    strokeDasharray: length,
    strokeDashoffset: length
  });
  timeline
    .to([rail.path, rail.core], { opacity: 1, duration: 0.12 }, at)
    .to([rail.path, rail.core], { strokeDashoffset: 0, duration: 0.72, ease: "power2.out" }, at)
    .set(
      rail.pulse,
      { opacity: 1, strokeDasharray: `28 ${length}`, strokeDashoffset: length },
      at + 0.08
    )
    .to(rail.pulse, { strokeDashoffset: 0, duration: 0.62, ease: "power1.inOut" }, at + 0.08)
    .to(rail.pulse, { opacity: 0, duration: 0.2 }, at + 0.6);
}

function pulseInbound(
  scene: Scene,
  nodeId: number,
  at: number,
  timeline: gsap.core.Timeline
): void {
  const inbound = scene.rails.filter((rail) => rail.target === nodeId);
  for (const rail of inbound) {
    const length = rail.pulse.getTotalLength();
    timeline
      .set(
        rail.pulse,
        { opacity: 1, strokeDasharray: `34 ${length}`, strokeDashoffset: length },
        at
      )
      .to(rail.pulse, { strokeDashoffset: 0, duration: 0.72, ease: "power1.inOut" }, at)
      .to(rail.pulse, { opacity: 0, duration: 0.18 }, at + 0.64);
  }
}

function statusStroke(
  view: NodeView,
  status: "pending" | "running" | "completed" | "skipped"
): string {
  const stroke: Record<typeof status, string> = {
    pending: nodeColor(view.node.type),
    running: "oklch(75% 0.11 255 / 0.92)",
    completed: "oklch(72% 0.1 175 / 0.9)",
    skipped: "oklch(62% 0.01 240 / 0.36)"
  };
  return stroke[status];
}

// Skipped nodes still exist in the audit log: the pane submerges to a 12%
// ghost, and a fully legible skipped chip stays on the surface beside it.
function addSurfaceChip(scene: Scene, view: NodeView, animate: boolean): void {
  const chip = svgEl<SVGGElement>("g", {
    transform: `translate(${view.x + view.w - 70} ${view.y + 11})`,
    opacity: animate ? "0" : "0.85"
  });
  const chipRect = svgEl<SVGRectElement>("rect", {
    width: "58",
    height: "17",
    rx: "8.5",
    fill: "oklch(99% 0.004 240 / 0.92)",
    stroke: "oklch(62% 0.014 240 / 0.4)"
  });
  const chipText = svgEl<SVGTextElement>("text", {
    x: "29",
    y: "12",
    fill: "oklch(45% 0.02 245)",
    "font-size": "8.5",
    "text-anchor": "middle"
  });
  chipText.textContent = "skipped";
  chip.append(chipRect, chipText);
  scene.over.append(chip);
  if (animate) {
    gsap.to(chip, { opacity: 0.85, duration: 0.4, delay: 0.32 });
  }
}

function submerge(scene: Scene, view: NodeView): void {
  const ring = svgEl<SVGRectElement>("rect", {
    x: String(view.x - 2),
    y: String(view.y - 2),
    width: String(view.w + 4),
    height: String(view.h + 4),
    rx: "20",
    fill: "none",
    stroke: "oklch(62% 0.01 240 / 0.3)",
    "stroke-width": "2",
    opacity: "0"
  });
  scene.under.append(ring);
  addSurfaceChip(scene, view, true);
  gsap
    .timeline({ onComplete: () => ring.remove() })
    .to(view.veil, { attr: { "fill-opacity": 0.55 }, duration: 0.46, ease: "power2.inOut" }, 0)
    .to(view.group, { opacity: 0.12, scale: 0.955, duration: 0.52, ease: "power2.inOut" }, 0.04)
    .to(ring, { opacity: 1, duration: 0.14 }, 0.1)
    .to(
      ring,
      {
        attr: { x: view.x - 8, y: view.y - 8, width: view.w + 16, height: view.h + 16 },
        opacity: 0,
        duration: 0.5,
        ease: "power2.out"
      },
      0.26
    );
}

function setNodeStatus(
  scene: Scene,
  view: NodeView,
  status: "pending" | "running" | "completed" | "skipped",
  animate = true
): void {
  view.rect.setAttribute("stroke", statusStroke(view, status));
  view.chipText.textContent = status;
  view.chipRect.setAttribute(
    "stroke",
    status === "skipped" ? "oklch(62% 0.01 240 / 0.32)" : "oklch(72% 0.1 175 / 0.38)"
  );
  if (status === "skipped") {
    if (!animate) {
      view.group.setAttribute("opacity", "0.12");
      addSurfaceChip(scene, view, false);
      return;
    }
    submerge(scene, view);
  }
}

// The iris rim shimmer while the decision's condition is being evaluated.
function decisionShimmer(scene: Scene, view: NodeView): void {
  const ring = svgEl<SVGRectElement>("rect", {
    x: String(view.x - 2),
    y: String(view.y - 2),
    width: String(view.w + 4),
    height: String(view.h + 4),
    rx: "20",
    fill: "none",
    stroke: "url(#iris-grad)",
    "stroke-width": "1.8",
    opacity: "0"
  });
  scene.over.append(ring);
  gsap
    .timeline({ onComplete: () => ring.remove() })
    .to(ring, { opacity: 0.75, duration: 0.16 })
    .to(ring, { opacity: 0.3, duration: 0.3, yoyo: true, repeat: 2 }, 0.2)
    .to(ring, { opacity: 0, duration: 0.26 }, 1.1);
}

function scheduleValidationPulse(scene: Scene, at: number, timeline: gsap.core.Timeline): void {
  const views = [...scene.nodeViews.values()];
  const minX = Math.min(...views.map((v) => v.x)) - 10;
  const minY = Math.min(...views.map((v) => v.y)) - 10;
  const maxX = Math.max(...views.map((v) => v.x + v.w)) + 10;
  const maxY = Math.max(...views.map((v) => v.y + v.h)) + 10;
  const ring = svgEl<SVGRectElement>("rect", {
    x: String(minX),
    y: String(minY),
    width: String(maxX - minX),
    height: String(maxY - minY),
    rx: "30",
    fill: "none",
    stroke: "oklch(100% 0 0 / 0.85)",
    "stroke-width": "2",
    opacity: "0"
  });
  const label = svgEl<SVGTextElement>("text", {
    x: String((minX + maxX) / 2),
    y: String(Math.max(16, minY - 12)),
    fill: "oklch(45% 0.02 245)",
    "font-size": "12",
    "font-weight": "650",
    "text-anchor": "middle",
    opacity: "0"
  });
  label.textContent = "validated · acyclic";
  scene.over.append(ring, label);
  timeline
    .to([ring, label], { opacity: 1, duration: 0.14 }, at)
    .to(
      ring,
      {
        attr: {
          x: minX - 16,
          y: minY - 16,
          width: maxX - minX + 32,
          height: maxY - minY + 32
        },
        opacity: 0,
        duration: 0.72,
        ease: "power2.out"
      },
      at + 0.08
    )
    .to(label, { opacity: 0, duration: 0.3 }, at + 0.66)
    .call(() => [ring, label].forEach((el) => el.remove()), [], at + 1.05);
}

function envelopeForNode(scene: Scene, event: ReplayEvent): string {
  const tier = event.node ? (scene.nodeViews.get(event.node)?.node.type === "tool" ? 0 : 1) : 1;
  return `"status": "executing" · "nodes_done": ${scene.doneCount}/${scene.nodeViews.size}\n"node": ${event.node ?? "null"} · "tier_used": ${tier}`;
}

function applyEvent(scene: Scene, event: ReplayEvent): void {
  scene.ticker.textContent = event.text ?? event.e;
  if (event.e === "plan_ready") {
    scene.envelope.textContent = `"status": "executing" · "nodes": ${scene.nodeViews.size}`;
  }
  if (event.e === "node_started" && event.node) {
    const view = scene.nodeViews.get(event.node);
    if (view) {
      setNodeStatus(scene, view, "running");
      scene.envelope.textContent = envelopeForNode(scene, event);
    }
  }
  if (event.e === "node_finished" && event.node) {
    const view = scene.nodeViews.get(event.node);
    if (view) {
      setNodeStatus(scene, view, event.status === "skipped" ? "skipped" : "completed");
      scene.doneCount += 1;
      scene.envelope.textContent = envelopeForNode(scene, event);
    }
  }
  if (event.e === "branch_decided" && event.node) {
    const view = scene.nodeViews.get(event.node);
    if (view) {
      view.chipText.textContent = `branch · ${event.branch ?? "set"}`;
      view.rect.setAttribute("stroke", "oklch(85% 0.09 80 / 0.95)");
      decisionShimmer(scene, view);
      scene.envelope.textContent = `"branch_taken": "${event.branch ?? "set"}"\n"status": "executing"`;
    }
  }
  if (event.e === "task_completed") {
    scene.envelope.textContent = '"status": "completed"\n"final_output": recorded';
  }
}

function typeTask(scene: Scene, replay: Replay, timeline: gsap.core.Timeline): void {
  timeline.set(scene.taskText, { textContent: "" }, 0);
  [...replay.task].forEach((_, index) => {
    timeline.call(
      () => {
        scene.taskText.textContent = replay.task.slice(0, index + 1);
      },
      [],
      0.16 + index * 0.021
    );
  });
}

function runReplay(root: HTMLElement, replay: Replay, onDone: () => void): gsap.core.Timeline {
  const scene = buildScene(root, replay);
  const timeline = gsap.timeline({ onComplete: onDone });
  const settleTimes = new Map<number, number>();
  const nodes = [...scene.nodeViews.values()].sort(
    (a, b) => a.node.layer - b.node.layer || a.node.id - b.node.id
  );

  scene.answer.style.opacity = "0";
  scene.answer.style.transform = "translateY(12px)";
  timeline.set(scene.envelope, { textContent: '"status": "planning"\n"plan": null' }, 0);
  typeTask(scene, replay, timeline);

  // Surfacing must finish (plus the validation pulse) before the first
  // node_started event in the script; derive the stagger from that window.
  // The lower bound keeps ≤ 3 displacement filters live at once.
  const firstStart = Math.min(
    ...replay.events.filter((e) => e.e === "node_started").map((e) => e.t / 1000)
  );
  const count = nodes.length;
  const stagger =
    count > 1 ? clamp((firstStart - 0.55 - 1.62 - NODE_DONE) / (count - 1), 0.49, 0.62) : 0.6;

  let maxSettle = 0;
  nodes.forEach((view, index) => {
    const settledAt = materialize(scene, view, 1.62 + index * stagger, timeline);
    settleTimes.set(view.node.id, settledAt);
    maxSettle = Math.max(maxSettle, settledAt);
  });

  for (const rail of scene.rails) {
    const sourceSettle = settleTimes.get(rail.dep) ?? 2;
    const targetSettle = settleTimes.get(rail.target) ?? 2;
    scheduleRailDraw(rail, Math.max(sourceSettle, targetSettle) + 0.06, timeline);
  }

  // One clean ring crosses the whole graph once every pane is crisp.
  scheduleValidationPulse(scene, maxSettle + 0.12, timeline);

  for (const event of replay.events) {
    const at = event.t / 1000;
    timeline.call(() => applyEvent(scene, event), [], at);
    if (event.e === "node_started" && event.node && scene.nodeViews.has(event.node)) {
      pulseInbound(scene, event.node, at, timeline);
    }
  }

  const taskCompletedTimes = replay.events
    .filter((event) => event.e === "task_completed")
    .map((event) => event.t / 1000);
  const taskCompletedAt = taskCompletedTimes.length
    ? Math.max(...taskCompletedTimes)
    : Math.max(...replay.events.map((event) => event.t / 1000));

  timeline.to(
    scene.answer,
    { opacity: 1, y: 0, duration: 0.62, ease: "expo.out" },
    taskCompletedAt + ANSWER_REVEAL_DELAY
  );
  timeline.to(
    [scene.svg, scene.taskPane],
    { opacity: 0.12, duration: 0.9, ease: "power2.inOut" },
    "+=1.2"
  );
  timeline.to(scene.answer, { opacity: 0, y: -6, duration: 0.42 }, "<");
  return timeline;
}

function renderReduced(root: HTMLElement): void {
  const replay = replays[1];
  const scene = buildScene(root, replay);
  const statuses = terminalStatuses(replay);
  scene.ticker.textContent = "replay of a recorded run, motion paused";
  scene.taskText.textContent = replay.task;
  for (const view of scene.nodeViews.values()) {
    view.group.setAttribute("opacity", "1");
    gsap.set(view.group, { scale: 1 });
    view.liquid.remove();
    setNodeStatus(scene, view, statuses.get(view.node.id) ?? "completed", false);
  }
  for (const rail of scene.rails) {
    rail.path.setAttribute("opacity", "1");
    rail.core.setAttribute("opacity", "1");
  }
  scene.envelope.textContent = '"status": "completed"\n"motion": "paused"';
  scene.answer.style.opacity = "1";
}

export function initCrystallizer(): void {
  const root = document.querySelector<HTMLElement>("[data-crystallizer]");
  if (!root) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    renderReduced(root);
    return;
  }

  let index = 0;
  let timeline: gsap.core.Timeline | null = null;
  let mobile = getMetrics(root).mobile;
  const playNext = () => {
    timeline?.kill();
    mobile = getMetrics(root).mobile;
    const replay = replays[index % replays.length];
    index += 1;
    timeline = runReplay(root, replay, playNext);
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!timeline) return;
      if (entry.isIntersecting) timeline.resume();
      else timeline.pause();
    },
    { threshold: 0.08 }
  );

  // Hover drops the replay into slow motion for inspection; it never fully
  // freezes, so a parked cursor cannot stall the scene.
  root.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse" || !timeline) return;
    gsap.to(timeline, { timeScale: 0.18, duration: 0.4, overwrite: "auto" });
  });
  root.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "mouse" || !timeline) return;
    gsap.to(timeline, { timeScale: 1, duration: 0.3, overwrite: "auto" });
  });

  // If the stage crosses the mobile/desktop threshold, restart the replay
  // with the right layout rather than letting one mode's viewBox stretch.
  let resizeTimer = 0;
  const resizeObserver = new ResizeObserver(() => {
    if (getMetrics(root).mobile === mobile) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(playNext, 250);
  });
  resizeObserver.observe(root);

  playNext();
  observer.observe(root);

  if (import.meta.env.DEV) {
    // Dev-only motion review hook; Vite eliminates this branch in builds.
    (window as unknown as Record<string, unknown>).__crystallizer = {
      seek: (t: number) => timeline?.seek(t, false).pause(),
      play: () => timeline?.play(),
      restart: () => playNext()
    };
  }
}
