import { gsap } from "gsap";
import { replays } from "../replay/plans";
import type { Replay, ReplayEvent, ReplayNode } from "../replay/schema";

const NS = "http://www.w3.org/2000/svg";
const WIDTH = 780;
const HEIGHT = 560;
const NODE_W = 154;
const NODE_H = 64;

interface Point {
  x: number;
  y: number;
}

interface NodeView {
  node: ReplayNode;
  g: SVGGElement;
  rect: SVGRectElement;
  liquid: SVGGElement;
  milk: SVGRectElement;
  displacement: SVGElement;
  blur: SVGElement;
  chip: SVGTextElement;
  x: number;
  y: number;
}

interface RailView {
  dep: number;
  target: number;
  path: SVGPathElement;
  pulse: SVGPathElement;
}

interface Scene {
  root: HTMLElement;
  svg: SVGSVGElement;
  ticker: HTMLDivElement;
  answer: HTMLDivElement;
  envelope: HTMLDivElement;
  nodeViews: Map<number, NodeView>;
  rails: RailView[];
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

function layoutNodes(nodes: ReplayNode[]): Map<number, Point> {
  const byLayer = new Map<number, ReplayNode[]>();
  for (const node of nodes) {
    const layer = byLayer.get(node.layer) ?? [];
    layer.push(node);
    byLayer.set(node.layer, layer);
  }

  const positions = new Map<number, Point>();
  const maxLayer = Math.max(...nodes.map((node) => node.layer));
  const layerGap = maxLayer > 0 ? 380 / maxLayer : 160;

  for (const [layer, layerNodes] of byLayer) {
    const count = layerNodes.length;
    const gap = WIDTH / (count + 1);
    layerNodes.forEach((node, index) => {
      positions.set(node.id, {
        x: gap * (index + 1) - NODE_W / 2,
        y: 78 + layer * layerGap
      });
    });
  }
  return positions;
}

function nodeColor(type: ReplayNode["type"]): string {
  const colors: Record<ReplayNode["type"], string> = {
    tool: "oklch(75% 0.11 255 / 0.62)",
    decision: "oklch(85% 0.09 80 / 0.7)",
    synthesis: "oklch(86% 0.09 165 / 0.62)",
    think: "oklch(82% 0.1 215 / 0.6)",
    summary: "oklch(72% 0.11 295 / 0.52)",
    result: "oklch(72% 0.1 175 / 0.74)"
  };
  return colors[type];
}

function buildNode(node: ReplayNode, point: Point, defs: SVGDefsElement): NodeView {
  const filterId = `lq-${node.id}`;
  const filter = svgEl<SVGFilterElement>("filter", {
    id: filterId,
    x: "-25%",
    y: "-25%",
    width: "150%",
    height: "150%"
  });
  const turbulence = svgEl<SVGFETurbulenceElement>("feTurbulence", {
    type: "fractalNoise",
    baseFrequency: "0.016 0.04",
    numOctaves: "2",
    seed: String(node.id + 3),
    result: "n"
  });
  const displacement = svgEl<SVGFEDisplacementMapElement>("feDisplacementMap", {
    in: "SourceGraphic",
    in2: "n",
    scale: "34",
    xChannelSelector: "R",
    yChannelSelector: "G"
  });
  const blur = svgEl<SVGFEGaussianBlurElement>("feGaussianBlur", { stdDeviation: "3" });
  filter.append(turbulence, displacement, blur);
  defs.append(filter);

  const g = svgEl<SVGGElement>("g", {
    class: "replay-node",
    transform: `translate(${point.x} ${point.y})`,
    opacity: "0"
  });
  const rect = svgEl<SVGRectElement>("rect", {
    width: String(NODE_W),
    height: String(NODE_H),
    rx: "18",
    fill: "oklch(100% 0 0 / 0.58)",
    stroke: nodeColor(node.type),
    "stroke-width": "1.25"
  });
  const title = svgEl<SVGTextElement>("text", {
    x: "16",
    y: "25",
    fill: "oklch(21% 0.016 250)",
    "font-size": "12.5",
    "font-weight": "650"
  });
  title.textContent = `${node.id} ${node.type}`;
  const label = svgEl<SVGTextElement>("text", {
    x: "16",
    y: "45",
    fill: "oklch(45% 0.02 245)",
    "font-size": "11.5"
  });
  label.textContent = node.label;
  const chip = svgEl<SVGTextElement>("text", {
    x: String(NODE_W - 16),
    y: String(NODE_H - 12),
    fill: "oklch(62% 0.014 240)",
    "font-size": "10",
    "text-anchor": "end"
  });
  chip.textContent = "pending";

  const liquid = svgEl<SVGGElement>("g", {
    filter: `url(#${filterId})`,
    opacity: "0.78"
  });
  const liquidRect = rect.cloneNode(false) as SVGRectElement;
  liquidRect.setAttribute("fill", "oklch(100% 0 0 / 0.5)");
  const liquidTitle = title.cloneNode(true) as SVGTextElement;
  const liquidLabel = label.cloneNode(true) as SVGTextElement;
  const milk = svgEl<SVGRectElement>("rect", {
    width: String(NODE_W),
    height: String(NODE_H),
    rx: "18",
    fill: "oklch(100% 0 0 / 0.48)"
  });
  liquid.append(liquidRect, liquidTitle, liquidLabel, milk);
  g.append(rect, title, label, chip, liquid);

  gsap.set(g, { transformOrigin: `${NODE_W / 2}px ${NODE_H / 2}px`, scale: 0.88 });

  return {
    node,
    g,
    rect,
    liquid,
    milk,
    displacement,
    blur,
    chip,
    x: point.x,
    y: point.y
  };
}

function railPath(from: NodeView, to: NodeView): string {
  const startX = from.x + NODE_W / 2;
  const startY = from.y + NODE_H;
  const endX = to.x + NODE_W / 2;
  const endY = to.y;
  const midY = (startY + endY) / 2;
  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
}

function buildScene(root: HTMLElement, replay: Replay): Scene {
  root.innerHTML = "";
  const ticker = htmlEl("div", "crystallizer-ticker mono", "planning_started");
  const svg = svgEl<SVGSVGElement>("svg", {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    role: "img",
    "aria-label":
      "Replay of a recorded Glassrail run where a task becomes a validated DAG and executes sequentially."
  });
  const answer = htmlEl("div", "answer-card pane", replay.answer);
  const envelope = htmlEl("div", "envelope-strip mono", '"status": "planning"');
  const defs = svgEl<SVGDefsElement>("defs");
  const railsLayer = svgEl<SVGGElement>("g", { class: "rails" });
  const nodesLayer = svgEl<SVGGElement>("g", { class: "nodes" });
  svg.append(defs, railsLayer, nodesLayer);

  const positions = layoutNodes(replay.plan.nodes);
  const nodeViews = new Map<number, NodeView>();
  for (const node of replay.plan.nodes) {
    const point = positions.get(node.id);
    if (!point) continue;
    const nodeView = buildNode(node, point, defs);
    nodeViews.set(node.id, nodeView);
    nodesLayer.append(nodeView.g);
  }

  const rails: RailView[] = [];
  for (const node of replay.plan.nodes) {
    const target = nodeViews.get(node.id);
    if (!target) continue;
    for (const dep of node.deps) {
      const source = nodeViews.get(dep);
      if (!source) continue;
      const d = railPath(source, target);
      const path = svgEl<SVGPathElement>("path", {
        d,
        fill: "none",
        stroke: "oklch(75% 0.11 255 / 0.36)",
        "stroke-width": "1.5",
        "stroke-linecap": "round",
        opacity: "0"
      });
      const pulse = svgEl<SVGPathElement>("path", {
        d,
        fill: "none",
        stroke: "oklch(86% 0.09 165 / 0.72)",
        "stroke-width": "2.5",
        "stroke-linecap": "round",
        opacity: "0"
      });
      railsLayer.append(path, pulse);
      rails.push({ dep, target: node.id, path, pulse });
    }
  }

  root.append(ticker, svg, answer, envelope);
  return { root, svg, ticker, answer, envelope, nodeViews, rails };
}

function materialize(view: NodeView, at: number, timeline: gsap.core.Timeline): void {
  const ring = svgEl<SVGRectElement>("rect", {
    x: String(view.x),
    y: String(view.y),
    width: String(NODE_W),
    height: String(NODE_H),
    rx: "18",
    fill: "none",
    stroke: "oklch(82% 0.1 215 / 0.32)",
    "stroke-width": "5",
    opacity: "0"
  });
  view.g.parentElement?.insertBefore(ring, view.g);

  timeline
    .to(view.g, { opacity: 1, scale: 1, duration: 0.64, ease: "expo.out" }, at)
    .to(view.displacement, { attr: { scale: 18 }, duration: 0.62, ease: "power2.out" }, at)
    .to(view.blur, { attr: { stdDeviation: 1.6 }, duration: 0.62, ease: "power2.out" }, at)
    .to(ring, { opacity: 1, duration: 0.18 }, at + 0.44)
    .to(
      ring,
      {
        x: view.x - 8,
        y: view.y - 8,
        width: NODE_W + 16,
        height: NODE_H + 16,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out"
      },
      at + 0.52
    )
    .to(view.displacement, { attr: { scale: 0 }, duration: 0.72, ease: "power2.inOut" }, at + 0.7)
    .to(view.blur, { attr: { stdDeviation: 0 }, duration: 0.72, ease: "power2.inOut" }, at + 0.7)
    .to(view.milk, { attr: { opacity: 0 }, duration: 0.72, ease: "power2.inOut" }, at + 0.7)
    .to(view.liquid, { opacity: 0, duration: 0.32 }, at + 1.2)
    .set(ring, { display: "none" }, at + 1.52);
}

function drawRails(scene: Scene, at: number, timeline: gsap.core.Timeline): void {
  scene.rails.forEach((rail, index) => {
    const length = rail.path.getTotalLength();
    gsap.set([rail.path, rail.pulse], {
      strokeDasharray: length,
      strokeDashoffset: length
    });
    timeline.to(
      rail.path,
      { opacity: 1, strokeDashoffset: 0, duration: 0.7, ease: "power2.out" },
      at + index * 0.08
    );
  });
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

function setNodeStatus(
  view: NodeView,
  status: "pending" | "running" | "completed" | "skipped"
): void {
  const stroke: Record<typeof status, string> = {
    pending: nodeColor(view.node.type),
    running: "oklch(75% 0.11 255 / 0.9)",
    completed: "oklch(72% 0.1 175 / 0.88)",
    skipped: "oklch(62% 0.01 240 / 0.34)"
  };
  view.rect.setAttribute("stroke", stroke[status]);
  view.chip.textContent = status;
  if (status === "skipped") {
    view.g.setAttribute("opacity", "0.18");
  }
}

function applyEvent(scene: Scene, event: ReplayEvent): void {
  scene.ticker.textContent = event.text ?? event.e;
  if (event.e === "node_started" && event.node) {
    const view = scene.nodeViews.get(event.node);
    if (view) setNodeStatus(view, "running");
  }
  if (event.e === "node_finished" && event.node) {
    const view = scene.nodeViews.get(event.node);
    if (view) setNodeStatus(view, event.status === "skipped" ? "skipped" : "completed");
  }
  if (event.e === "branch_decided" && event.node) {
    const view = scene.nodeViews.get(event.node);
    if (view) {
      view.chip.textContent = `branch ${event.branch ?? "set"}`;
      view.rect.setAttribute("stroke", "oklch(85% 0.09 80 / 0.95)");
    }
  }
  if (event.e === "task_completed") {
    scene.envelope.textContent = '"status": "completed" · "final_output": recorded';
    scene.answer.classList.add("is-visible");
  }
}

function runReplay(root: HTMLElement, replay: Replay, onDone: () => void): gsap.core.Timeline {
  const scene = buildScene(root, replay);
  const timeline = gsap.timeline({ onComplete: onDone });
  scene.answer.style.opacity = "0";
  scene.answer.style.transform = "translateY(12px)";

  timeline.set(scene.envelope, { textContent: '"status": "planning" · "plan": null' }, 0);
  replay.plan.nodes.forEach((node, index) => {
    const view = scene.nodeViews.get(node.id);
    if (view) materialize(view, 1.45 + index * 0.48, timeline);
  });
  drawRails(scene, 5.25, timeline);

  for (const event of replay.events) {
    const at = event.t / 1000;
    timeline.call(() => applyEvent(scene, event), [], at);
    if (event.e === "node_started" && event.node) {
      pulseInbound(scene, event.node, at, timeline);
    }
  }

  timeline.to(
    scene.answer,
    { opacity: 1, y: 0, duration: 0.62, ease: "expo.out" },
    Math.max(...replay.events.map((event) => event.t)) / 1000 - 0.4
  );
  timeline.to(scene.svg, { opacity: 0.12, duration: 0.9, ease: "power2.inOut" }, "+=1.2");
  timeline.to(scene.answer, { opacity: 0, y: -6, duration: 0.42 }, "<");
  return timeline;
}

function renderReduced(root: HTMLElement): void {
  const scene = buildScene(root, replays[0]);
  scene.ticker.textContent = "replay of a recorded run, motion paused";
  for (const view of scene.nodeViews.values()) {
    view.g.setAttribute("opacity", "1");
    setNodeStatus(view, "completed");
    gsap.set(view.g, { scale: 1 });
    view.liquid.setAttribute("opacity", "0");
  }
  for (const rail of scene.rails) {
    rail.path.setAttribute("opacity", "1");
  }
  scene.envelope.textContent = '"status": "completed" · "motion": "paused"';
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
  const playNext = () => {
    timeline?.kill();
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

  playNext();
  observer.observe(root);
}
