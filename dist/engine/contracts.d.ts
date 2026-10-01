/** Public content contracts for editors and future TypeScript clients. Runtime validation is separate. */
export type Status = "poison" | "burn" | "paralysis" | "sleep" | "freeze";
export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { flag: string; equals?: boolean | string | number }
  | { event: string }
  | { reward: string };
export interface StoryProgress {
  completed: string[];
  rewards: string[];
}
export interface Reward {
  id: string;
  money?: number;
  items?: Record<string, number>;
  flags?: Record<string, boolean | number | string>;
}
export type CommonEffect =
  | { op: "restoreHP"; amount: number; fraction?: never }
  | { op: "restoreHP"; fraction: number; amount?: never }
  | { op: "cureStatus"; status: Status | "any" }
  | { op: "capture"; bonus: number };
export interface ItemDefinition {
  name: string;
  price: number;
  contexts: ("field" | "battle")[];
  target: "party" | "enemy";
  effects: CommonEffect[];
  description?: string;
  icon?: string;
  purchaseRequires?: Condition;
}
export type BattleAction =
  | { kind: "move" | "switch"; index: number }
  | { kind: "item"; item: string; index?: number }
  | { kind: "run" }
  | { kind: "potion"; index?: number }
  | { kind: "ball" };
export interface EffectStep {
  op: string;
  [parameter: string]: unknown;
}
export interface MoveEffectDefinition {
  target?: "self" | "opponent";
  supported?: boolean;
  reason?: string;
  primary?: EffectStep[];
  beforeDamage?: EffectStep[];
  afterDamage?: EffectStep[];
  secondary?: EffectStep[];
  hits?: number[];
  criticalStage?: number;
  alwaysHits?: boolean;
  minimumHP?: 1;
}
