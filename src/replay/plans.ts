import type { Replay } from "./schema";

export const replays: Replay[] = [
  {
    task: "Compare datastores for a high-write event stream and recommend one.",
    answer: "Kafka for the event stream, with the trade-off recorded.",
    plan: {
      nodes: [
        { id: 1, type: "think", label: "Frame criteria", layer: 0, deps: [] },
        { id: 2, type: "tool", label: "Check Kafka fit", layer: 1, deps: [1] },
        { id: 3, type: "tool", label: "Check OLTP fit", layer: 1, deps: [1] },
        { id: 4, type: "summary", label: "Compress findings", layer: 2, deps: [2, 3] },
        { id: 5, type: "synthesis", label: "Compare trade-offs", layer: 3, deps: [4] },
        { id: 6, type: "result", label: "Recommendation", layer: 4, deps: [5] }
      ]
    },
    events: [
      { t: 0, e: "planning_started", text: "planning_started" },
      { t: 1650, e: "plan_ready", text: "plan_ready · validated · acyclic" },
      { t: 6200, e: "node_started", node: 1, text: "node_started · think" },
      { t: 7600, e: "node_finished", node: 1, status: "completed", text: "node_finished" },
      { t: 8300, e: "node_started", node: 2, text: "tool args · kafka" },
      { t: 9600, e: "node_finished", node: 2, status: "completed", text: "node_finished" },
      { t: 10100, e: "node_started", node: 3, text: "tool args · oltp" },
      { t: 11400, e: "node_finished", node: 3, status: "completed", text: "node_finished" },
      { t: 12100, e: "node_started", node: 4, text: "streaming summary" },
      { t: 13400, e: "node_finished", node: 4, status: "completed", text: "node_finished" },
      { t: 14100, e: "node_started", node: 5, text: "synthesis" },
      { t: 15800, e: "node_finished", node: 5, status: "completed", text: "node_finished" },
      { t: 16600, e: "node_started", node: 6, text: "result" },
      { t: 18200, e: "node_finished", node: 6, status: "completed", text: "node_finished" },
      { t: 19600, e: "task_completed", text: "task_completed" }
    ]
  },
  {
    task: "If the request needs live data, ask for approval. Otherwise answer directly.",
    answer: "Answered directly, no live lookup required.",
    plan: {
      nodes: [
        { id: 1, type: "decision", label: "Needs live data?", layer: 0, deps: [] },
        { id: 2, type: "tool", label: "Request approval", layer: 1, deps: [1] },
        { id: 3, type: "think", label: "Closed-book answer", layer: 1, deps: [1] },
        { id: 4, type: "result", label: "Final answer", layer: 2, deps: [3] }
      ]
    },
    events: [
      { t: 0, e: "planning_started", text: "planning_started" },
      { t: 1450, e: "plan_ready", text: "plan_ready · validated · acyclic" },
      { t: 5700, e: "node_started", node: 1, text: "node_started · decision" },
      { t: 7600, e: "branch_decided", node: 1, branch: "no", text: "branch_decided · no" },
      { t: 8200, e: "node_finished", node: 1, status: "completed", text: "node_finished" },
      { t: 8800, e: "node_finished", node: 2, status: "skipped", text: "skipped" },
      { t: 9300, e: "node_started", node: 3, text: "node_started · think" },
      { t: 11100, e: "node_finished", node: 3, status: "completed", text: "node_finished" },
      { t: 12100, e: "node_started", node: 4, text: "result" },
      { t: 14400, e: "node_finished", node: 4, status: "completed", text: "node_finished" },
      { t: 16000, e: "task_completed", text: "task_completed" }
    ]
  },
  {
    task: "Read a short brief, summarize the named facts, then return the answer.",
    answer: "Summary preserved the planted date, percentage, and owner.",
    plan: {
      nodes: [
        { id: 1, type: "tool", label: "Read brief", layer: 0, deps: [] },
        { id: 2, type: "summary", label: "Summarize facts", layer: 1, deps: [1] },
        { id: 3, type: "synthesis", label: "Check coverage", layer: 2, deps: [2] },
        { id: 4, type: "result", label: "Return answer", layer: 3, deps: [3] }
      ]
    },
    events: [
      { t: 0, e: "planning_started", text: "planning_started" },
      { t: 1500, e: "plan_ready", text: "plan_ready · validated · acyclic" },
      { t: 5600, e: "node_started", node: 1, text: "file_read args" },
      { t: 7400, e: "node_finished", node: 1, status: "completed", text: "node_finished" },
      { t: 8300, e: "node_started", node: 2, text: "summary streaming" },
      { t: 10300, e: "node_finished", node: 2, status: "completed", text: "node_finished" },
      { t: 11200, e: "node_started", node: 3, text: "coverage check" },
      { t: 13200, e: "node_finished", node: 3, status: "completed", text: "node_finished" },
      { t: 14200, e: "node_started", node: 4, text: "result" },
      { t: 16200, e: "node_finished", node: 4, status: "completed", text: "node_finished" },
      { t: 17800, e: "task_completed", text: "task_completed" }
    ]
  }
];
