export type NodeType = "tool" | "decision" | "synthesis" | "think" | "summary" | "result";

export interface ReplayNode {
  id: number;
  type: NodeType;
  label: string;
  layer: number;
  deps: number[];
}

export interface ReplayPlan {
  nodes: ReplayNode[];
}

export interface ReplayEvent {
  t: number;
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
  text?: string;
}

export interface Replay {
  task: string;
  answer: string;
  plan: ReplayPlan;
  events: ReplayEvent[];
}
