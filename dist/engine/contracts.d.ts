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
  holdable?: boolean;
  price: number;
  contexts: ("field" | "battle")[];
  target: "party" | "enemy";
  effects: CommonEffect[];
  description?: string;
  icon?: string;
  purchaseRequires?: Condition;
}
export type BattleAction = {
  seat?: string;
  actor?: string;
  target?: TargetRef;
} & (
  | { kind: "move" | "switch"; index: number }
  | { kind: "item"; item: string; index?: number }
  | { kind: "run" | "cancel" }
  | { kind: "potion"; index?: number }
  | { kind: "ball" }
);
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
  requiresStatus?: Status;
}

/** UID identifies a creature; seat ID identifies a place, surviving replacements. */
export type TargetRef =
  | { kind: "self" }
  | { kind: "seat"; id: string }
  | { kind: "side"; id: string }
  | { kind: "field" };
export interface BattleMonster {
  uid: string;
  species: string;
  level: number;
  gender: string;
  hp: number;
  stats: { hp: number; spe: number; [stat: string]: number };
  status: Status | null;
  exp: number;
  moves: { id: string; pp: number }[];
}
export interface BattleController {
  id: string;
  kind: "human" | "ai";
  party: BattleMonster[];
  bag?: Record<string, number>;
}
export interface BattleSeat {
  id: string;
  controllerId: string;
  /** -1 represents an empty seat; omitted selects the next eligible creature. */
  index?: number;
}
export interface BattleSide {
  id: string;
  allianceId: string;
  controllers: BattleController[];
  seats: BattleSeat[];
}
export interface BattleTopology {
  sides: BattleSide[];
}
export type MonsterView = Pick<
  BattleMonster,
  "uid" | "species" | "level" | "gender" | "hp" | "status" | "exp"
> & { stats: { hp: number } };
export interface CombatantView {
  seatId: string;
  sideId: string;
  controllerId: string;
  monster: MonsterView | null;
}
export interface BattleSnapshot {
  combatants: CombatantView[];
  sides: { id: string; allianceId: string; total: number; remaining: number }[];
}
export interface BattleEvent extends BattleSnapshot {
  kind: string;
  text: string;
  sequence: number;
  round: number;
  actionId: string | null;
  phase: string;
  actorSeat?: string;
  actorUid?: string | null;
  targetSeat?: string;
  targetUid?: string | null;
}

/** Versioned rule interfaces: trusted internal adapters own mutation; plugin adapters expose queries/intents. */
export interface RuleHook<C> {
  id: string;
  phase: string;
  priority?: number;
  when?: (context: Readonly<C>) => boolean;
  apply?: (context: C) => void;
  modify?: (value: number, context: Readonly<C>) => number;
}
export interface AttachedRule<C> extends Omit<RuleHook<C>, "id"> {
  role: "actor" | "target" | "owner" | "all";
  effects?: EffectStep[] | ((context: Readonly<C>) => EffectStep[]);
}
export interface TraitDefinition<C> {
  hooks: AttachedRule<C>[];
  holdEffect?: string;
  parameter?: number;
}
export interface EggState {
  cycles: number;
  ready: boolean;
  parents: string[];
}
export type EvolutionTrigger = "level" | "item" | "trade";
export interface GrowthCondition {
  type: string;
  [parameter: string]: unknown;
}
export interface EvolutionDefinition {
  id: string;
  to: string;
  trigger: EvolutionTrigger;
  conditions: GrowthCondition[];
  consumeHeld?: boolean;
  extra?: string;
}
