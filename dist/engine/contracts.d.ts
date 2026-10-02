/** Public content contracts for editors and future TypeScript clients. Runtime validation is separate. */
export type Status =
  | "toxic"
  | "poison"
  | "burn"
  | "paralysis"
  | "sleep"
  | "freeze";
export type Condition =
  | {
      compare: {
        query: { id: string; input?: Record<string, Json> };
        op: "eq" | "ne" | "gt" | "gte" | "lt" | "lte";
        value: string | number | boolean | null;
      };
    }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { flag: string; equals?: boolean | string | number }
  | { event: string }
  | { reward: string };
export interface StoryProgress {
  variables?: Record<string, string | number | boolean | null>;
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
  | { op: "capture"; bonus: number }
  | {
      op: "feed";
      flavors: Partial<
        Record<"cool" | "beauty" | "cute" | "smart" | "tough", number>
      >;
      feel: number;
    };
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
  | { kind: "form"; form: string }
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
  requiresUserStatus?: Status;
  usableAsleep?: boolean;
  thawsUser?: boolean;
  hitPowers?: number[];
  accuracyEachHit?: boolean;
  action?: {
    kind: "charge" | "repeat" | "recharge";
    minTurns?: number;
    maxTurns?: number;
    confuseAfter?: boolean;
    stopOnFailure?: boolean;
    hidden?: "air" | "underground" | "underwater";
    hiddenByMove?: Record<string, "air" | "underground" | "underwater">;
    skipWeather?: string;
  };
  onCharge?: EffectStep[];
  onMiss?: EffectStep[];
  hitsHidden?: ("air" | "underground" | "underwater")[];
  hiddenMultiplier?: number;
  bypassHitChecks?: boolean;
  noCritical?: boolean;
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

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };
export type StatKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe";
export type StatValues = Record<StatKey, number>;
export type Direction = "up" | "down" | "left" | "right";
export interface Position {
  map: string;
  x: number;
  y: number;
  dir: Direction;
}
export interface Creature extends Omit<BattleMonster, "gender" | "stats"> {
  gender: "♂" | "♀" | "—";
  stats: StatValues;
  iv: StatValues;
  ev: StatValues;
  nature: number;
  personality: number;
  originalTrainer: string;
  sleep?: number;
  heldItem: string | null;
  ability: string;
  friendship: number;
  egg?: EggState;
  pendingMoves?: string[];
  pendingEvolution?: number;
  evolutionSkipped?: number;
  growthCompanions?: string[];
  cool?: number;
  beauty?: number;
  cute?: number;
  smart?: number;
  tough?: number;
  sheen?: number;
}
export interface PluginRecord {
  version: number;
  data: Record<string, Json>;
  states: Record<string, Record<string, { remaining: number; data: Json }>>;
}
export interface AdventureState {
  position: Position;
  forms?: Record<string, { id: string }>;
  party: Creature[];
  box: Creature[];
  bag: Record<string, number>;
  flags: Record<string, boolean | number | string>;
  story: StoryProgress;
  money: number;
  seen: string[];
  caught: string[];
  randomSeed: number;
  playSeconds: number;
  movement: { mode: string; visited: string[] };
  friendshipSteps: number;
  growth: { hatchTick: number };
  daycare: {
    slots: { mon: Creature; initialLevel: number; steps: number }[];
    steps: number;
    egg?: Creature | null;
  };
  tradePartner: Creature[];
  extensions: Record<string, PluginRecord>;
  contentDependencies: string[];
}
export interface SaveEnvelope<S = AdventureState> {
  version: number;
  pack?: string;
  savedAt: number;
  state: S;
}
export type CommandSource = "ui" | "plugin" | "network" | "system";
/** Supported strict schema subset. Runtime rejects extra object keys and unsupported schema features. */
export type DataSchema = {
  type:
    | "object"
    | "array"
    | "string"
    | "integer"
    | "number"
    | "boolean"
    | "null";
  properties?: Record<string, DataSchema>;
  required?: string[];
  additionalProperties?: false;
  items?: DataSchema;
  enum?: Json[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
};
export interface CommandDefinition<I extends Json = Json, O = unknown> {
  schema: DataSchema;
  run: (input: I) => O | Promise<O>;
  mode?: "instant" | "async";
  network?: boolean;
  plugin?: boolean;
  permission?: string;
  concurrent?: boolean;
  maxInputBytes?: number;
  ready?: (source: CommandSource, input: I) => boolean;
}
export interface CommandPort {
  execute(id: string, input: Json, source?: CommandSource): Promise<unknown>;
  executeSync(id: string, input: Json, source?: CommandSource): unknown;
}
export interface NetworkHello {
  protocol: 1;
  type: "hello";
  session: string;
  nextSequence: number;
}
export interface NetworkCommand {
  protocol: 1;
  type: "command";
  session: string;
  id: string;
  sequence: number;
  command: string;
  input: Record<string, Json>;
  policy?: "reject" | "wait";
}
export interface NetworkResult {
  protocol: 1;
  type: "result";
  session: string;
  id: string;
  sequence: number;
  ok: boolean;
  result?: Json;
  error?: { code: string; message: string };
}
export interface NetworkTransport {
  send(message: string): void;
  onMessage(listener: (message: string) => void): () => void;
  onClose(listener: () => void): () => void;
  close(): void;
}
export type ContentKind =
  | "species"
  | "moves"
  | "maps"
  | "tilesets"
  | "actors"
  | "evolutions"
  | "items"
  | "abilities"
  | "heldItems"
  | "moveEffects"
  | "movement"
  | "terrainRules"
  | "fieldActions"
  | "fieldLinks"
  | "destinations"
  | "resources"
  | "mapExtensions"
  | "growthConditions"
  | "npcBehaviors"
  | "trainers"
  | "encounters"
  | "battleStrategies"
  | "conditionQueries"
  | "battleStates"
  | "forms";
export interface PluginStateDefinition {
  clock: "step" | "round" | "manual" | "permanent";
  schema: DataSchema;
  onApply?: (context: PluginTransaction, state: Readonly<Json>) => void;
  onTick?: (context: PluginTransaction, state: Readonly<Json>) => void;
  onRemove?: (context: PluginTransaction, state: Readonly<Json>) => void;
}
export interface PluginTransaction {
  query(): Readonly<Json>;
  store: {
    get(key: string): Readonly<Json>;
    set(key: string, value: Json): void;
  };
  states: {
    list(uid: string): Readonly<Json>;
    attach(
      id: string,
      uid: string,
      options?: { duration?: number; data?: Json },
    ): Readonly<Json>;
    update(
      id: string,
      uid: string,
      options?: { duration?: number; data?: Json },
    ): Readonly<Json>;
    remove(id: string, uid: string): boolean;
  };
  intent(value: Json): void;
  emit(type: string, payload?: Json): void;
  feedback(id: string, payload?: Json): void;
}
export type LayoutKind =
  | "text"
  | "heading"
  | "image"
  | "button"
  | "row"
  | "grid"
  | "panel"
  | "meter"
  | "select";
export interface LayoutNode {
  kind: LayoutKind;
  text?: string;
  src?: string;
  alt?: string;
  label?: string;
  theme?: string;
  action?: string;
  input?: Record<string, Json>;
  disabled?: boolean;
  children?: LayoutNode[];
  value?: number | string;
  max?: number;
  options?: { label: string; value: string }[];
}
export interface MoveAnimation {
  duration: number;
  lunge?: number;
  tracks: {
    effect: string;
    anchor: "actor" | "targets" | "field";
    start: number;
    end: number;
    parameters?: Record<string, Json>;
  }[];
}
export interface AudioCue {
  kind: "music" | "sound";
  volume: number;
  loop: boolean;
  source?: string;
  notes?: [number, number][];
}
export interface NPCIntent {
  dir?: Direction;
  move: boolean;
  pose: "still" | "walk" | "jog" | "hop" | "spin" | "sleep" | "cheer";
  duration?: number;
}
export interface PluginAPI {
  readonly version: 1;
  readonly id: string;
  content: { register(kind: ContentKind, id: string, value: unknown): string };
  states: { register(id: string, definition: PluginStateDefinition): string };
  actions: {
    register(
      id: string,
      definition: {
        schema: DataSchema;
        network?: boolean;
        run: (context: PluginTransaction, input: Readonly<Json>) => Json | void;
      },
    ): string;
  };
  events: {
    on(type: string, listener: (payload: Readonly<Json>) => void): void;
  };
  query(): Readonly<Json>;
  store: { get(key: string): Readonly<Json> };
  commands: {
    dispatch(id: string, input?: Record<string, Json>): Promise<unknown>;
  };
  rules: { register(id: string, definition: unknown): string };
  story: { register(id: string, definition: unknown): string };
  ui: {
    page(id: string, definition: unknown): string;
    entry(id: string, definition: unknown): string;
    hud(id: string, definition: unknown): string;
    theme(
      id: string,
      definition: Partial<
        Record<"background" | "foreground" | "border" | "accent", string>
      >,
    ): string;
  };
  presentation: {
    register(
      id: string,
      definition: {
        duration: number;
        scope?: "page" | "field" | "battle";
        draw: (
          context: unknown,
          frame: Readonly<Json>,
          assets: unknown,
        ) => void;
      },
    ): string;
    play(id: string, payload?: Record<string, Json>): void;
    effect(
      id: string,
      definition: { draw: (context: unknown, frame: Readonly<Json>) => void },
    ): string;
    move(
      id: string,
      definition: { moveId: string; animation: MoveAnimation },
    ): string;
    scene(
      id: string,
      definition: {
        duration: number;
        schema: DataSchema;
        sound?: string;
        draw: (
          context: unknown,
          frame: Readonly<Json>,
          assets: unknown,
        ) => void;
      },
    ): string;
    transition(
      id: string,
      definition: { draw: (context: unknown, frame: Readonly<Json>) => void },
    ): string;
    audio(id: string, definition: AudioCue): string;
  };
}
export interface PluginManifest {
  id: string;
  apiVersion: 1;
  version: string;
  dataVersion: number;
  permissions: string[];
  dependencies?: Record<string, number | string>;
  setup(api: PluginAPI): void;
  migrate?: (record: Readonly<PluginRecord>, version: number) => PluginRecord;
  validateData?: (data: Readonly<Record<string, Json>>) => void;
}
export interface MovementTechnique {
  name: string;
  pose: string;
  jump?: boolean;
  keepFacing?: boolean;
  freezeAnimation?: boolean;
  oneStep?: boolean;
}
export interface TerrainContext {
  readonly from: Readonly<{ map: string; x: number; y: number; dir: string }>;
  readonly map: Readonly<{
    id: string;
    width: number;
    height: number;
    indoor: boolean;
    underwater: boolean;
    allowRunning: boolean;
    allowBike: boolean;
  }>;
  readonly cell: Readonly<{
    behavior: number;
    collision: number;
    elevation: number;
    block: number;
  }>;
  readonly sourceCell: Readonly<{
    behavior: number;
    collision: number;
    elevation: number;
  }>;
  readonly mode: string;
  readonly technique: string;
  readonly dir: "up" | "down" | "left" | "right";
  readonly momentum: Readonly<{
    mode?: string | null;
    direction?: string | null;
    steps?: number;
  }>;
}
export interface TerrainVisual {
  duration?: number;
  jump?: boolean;
  keepFacing?: boolean;
  freezeAnimation?: boolean;
  pose?: string;
}
export interface TerrainRuleDefinition {
  priority?: number;
  when(context: TerrainContext): boolean;
  before?(
    context: TerrainContext,
  ): (TerrainVisual & { allowed?: boolean }) | null;
  after?(
    context: TerrainContext,
  ):
    | (TerrainVisual & {
        direction: TerrainContext["dir"];
        resetMomentum?: boolean;
        mode?: string;
      })
    | null;
}
export interface MovementDefinition {
  name?: string;
  actor: string;
  surface?: "land" | "water" | "both";
  mapRequires?: Record<string, string | number | boolean>;
  techniques?: Record<string, MovementTechnique>;
  durations: number[];
  allowed?: (context: Readonly<Json>) => boolean;
  traverse?: (context: Readonly<Json>) => boolean;
  afterStep?: (context: Readonly<Json>) => Json;
}
export type FieldOperation =
  | { kind: "world"; operations: Json[]; encounter?: "rock" }
  | {
      kind: "travel";
      position: { map: string; x: number; y: number; dir: string };
      mode: string;
    }
  | { kind: "route"; directions: string[]; mode: string }
  | { kind: "fishing"; rod: "old" | "good" | "super" };
export interface FieldActionContext {
  readonly position: Readonly<{
    map: string;
    x: number;
    y: number;
    dir: "up" | "down" | "left" | "right";
  }>;
  readonly mode: string;
  readonly revision: number;
  readonly flags: Readonly<Record<string, boolean | number | string>>;
  readonly bag: Readonly<Record<string, number>>;
  readonly map: Readonly<{
    width: number;
    height: number;
    blocks: readonly number[];
    behavior: readonly number[];
  }>;
  readonly party: readonly Readonly<{
    uid: string;
    hp: number;
    egg: boolean;
    ability: string | null;
    moves: readonly Readonly<{ id: string }>[];
  }>[];
  readonly objects: readonly Readonly<{
    id: string;
    kind: string;
    x: number;
    y: number;
    reserved: readonly Readonly<{ x: number; y: number }>[];
  }>[];
  readonly links: readonly FieldLinkDefinition[];
}
export interface FieldLinkDefinition {
  readonly map: string;
  readonly x: number;
  readonly y: number;
  readonly action: "dive" | "surface";
  readonly to: Readonly<{
    map: string;
    x: number;
    y: number;
    dir: "up" | "down" | "left" | "right";
  }>;
}
export interface FieldActionDefinition<T extends Json = Record<string, Json>> {
  name: string;
  cue: string;
  duration: number;
  schema?: DataSchema;
  allowed(
    context: FieldActionContext,
    input: Readonly<Record<string, Json>>,
  ): boolean | { reason: string };
  target(
    context: FieldActionContext,
    input: Readonly<Record<string, Json>>,
  ): T | null;
  plan(
    context: FieldActionContext,
    target: Readonly<T>,
    input: Readonly<Record<string, Json>>,
  ): FieldOperation;
}
export type PresentationCommand = {
  type: "presentation";
  id: string;
  payload?: Record<string, Json>;
};
export type FieldActionCommand = {
  type: "fieldAction";
  id: string;
  input?: Record<string, Json>;
  variable?: string;
};
