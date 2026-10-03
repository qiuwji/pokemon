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
  registerable?: boolean;
  price: number;
  contexts: ("field" | "battle")[];
  target: "party" | "enemy" | "field";
  actions?: { id: string; fieldAction: string; input?: Record<string, Json> }[];
  effects: CommonEffect[];
  learningMethod?: string;
  pocket?: string;
  shopStock?: boolean;
  description?: string;
  icon?: string;
  purchaseRequires?: Condition;
}
export type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

/** Policy data, independent of a particular game's native pocket names. */
export interface InventoryPocketDefinition {
  label: string;
  capacity: number;
  stackLimit: number;
  allowDuplicates: boolean;
}
export interface InventorySlot {
  item: string;
  count: number;
}
/** The only persisted inventory truth, shared by adventure and battle controllers. */
export interface InventoryState {
  pockets: Record<string, (InventorySlot | null)[]>;
}
export interface InventorySlotReference {
  pocket: string;
  index: number;
  item: string;
}
export interface InventoryView {
  readonly counts: Readonly<Record<string, number>>;
  readonly pockets: Readonly<
    Record<
      string,
      Readonly<
        InventoryPocketDefinition & {
          used: number;
          slots: readonly (Readonly<InventorySlot> | null)[];
        }
      >
    >
  >;
}
export interface InventoryFailure {
  readonly ok: false;
  readonly code: "full" | "insufficient" | "stale-slot";
  readonly reason: string;
}
export type InventoryOperation =
  | { kind: "add"; item: string; count: number }
  | {
      kind: "remove";
      item: string;
      count: number;
      slot?: InventorySlotReference;
    };
export interface InventoryPlan {
  readonly ok: true;
  readonly changes: readonly Readonly<{
    pocket: string;
    index: number;
    before: Readonly<InventorySlot> | null;
    after: Readonly<InventorySlot> | null;
  }>[];
}

/** A learning pathway may be item-backed or a tutor; ordinary replacement respects registered protected moves. */
export interface LearningMethodDefinition {
  move: string;
  item?: string;
  consume: number;
  species?: string[];
  protectMove?: boolean;
  friendship?: boolean;
  eligible?: (
    context: Readonly<{
      mon: DeepReadonly<Creature>;
      party: readonly DeepReadonly<Creature>[];
      position: Readonly<{
        map: string;
        x: number;
        y: number;
        dir: string;
        elevation?: number;
        previousElevation?: number;
      }> | null;
      flags: Readonly<Record<string, boolean | number | string>>;
      species: Readonly<{
        machineMoves?: readonly string[];
        [key: string]: unknown;
      }>;
    }>,
  ) => boolean;
}
export interface LearningPlan {
  ok: true;
  uid: string;
  method: string;
  move: string;
  requiresReplacement: boolean;
  replaceable: readonly number[];
  cost: Readonly<{ item: string | null; count: number }>;
}
export type BattleAction = {
  seat?: string;
  actor?: string;
  target?: TargetRef;
} & (
  | { kind: "move"; index: number; augment?: string }
  | { kind: "switch"; index: number }
  | {
      kind: "item";
      item: string;
      index?: number;
      slot?: InventorySlotReference;
    }
  | { kind: "form"; form: string }
  | { kind: "run" | "cancel" }
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
  bag?: InventoryState;
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
  elevation?: number;
  previousElevation?: number;
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
export interface ItemShortcut {
  item: string;
  action: string;
}
export interface AdventureState {
  position: Position;
  forms?: Record<string, { id: string }>;
  party: Creature[];
  box: Creature[];
  bag: InventoryState;
  registeredItem: ItemShortcut | null;
  flags: Record<string, boolean | number | string>;
  story: StoryProgress;
  money: number;
  seen: string[];
  caught: string[];
  randomSeed: number;
  playSeconds: number;
  clock?: WorldClockState;
  schedule?: WorldScheduleState;
  devices?: FieldDeviceState;
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
  | "inventoryPockets"
  | "learningMethods"
  | "weather"
  | "battleWeather"
  | "abilities"
  | "heldItems"
  | "moveEffects"
  | "battleAugments"
  | "movement"
  | "movementInputs"
  | "timeTasks"
  | "crops"
  | "berryPlots"
  | "actorTemplates"
  | "actorSchedules"
  | "npcPoses"
  | "terrainRules"
  | "fieldActions"
  | "fieldEffects"
  | "fieldLinks"
  | "fieldMechanisms"
  | "fieldDevices"
  | "destinations"
  | "resources"
  | "mapExtensions"
  | "growthConditions"
  | "npcBehaviors"
  | "trainers"
  | "facilities"
  | "facilityActivities"
  | "encounters"
  | "encounterPolicies"
  | "battleStrategies"
  | "conditionQueries"
  | "battleStates"
  | "forms";
export type EncounterArea = "land" | "water" | "fishing" | "rock";
export interface EncounterPolicyContext {
  readonly position: Readonly<Position>;
  readonly steps: number;
  readonly lastEncounterSteps: number;
  readonly mode: string;
  readonly cell: Readonly<{
    behavior: number;
    collision: number;
    elevation: number;
    block: number;
  }> | null;
  readonly party: readonly DeepReadonly<Creature>[];
  readonly flags: Readonly<Record<string, Json>>;
  readonly dialog: boolean;
  readonly weather: Readonly<Json>;
}
export interface EncounterPolicyDefinition {
  channel: string;
  priority?: number;
  when?: (context: EncounterPolicyContext) => boolean;
  decide(
    context: EncounterPolicyContext,
  ): {
    area: EncounterArea;
    checkRate?: boolean;
    checkSelection?: boolean;
    checkPermission?: boolean;
  } | null;
}
export interface WorldCellView {
  readonly x: number;
  readonly y: number;
  readonly block: number;
  readonly behavior: number;
  readonly collision: number;
  readonly elevation: number;
  readonly warp: boolean;
  readonly occupants: readonly {
    readonly id: string;
    readonly elevation: number;
    readonly reserved: boolean;
  }[];
}
export interface WorldRegionView {
  readonly map: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly WorldCellView[];
}
export interface FieldContactView {
  readonly sequence: number;
  readonly kind: "bump" | "request";
  readonly direction: Direction;
  readonly interaction: string | null;
  readonly subject: Readonly<{
    id: string;
    map: string;
    x: number;
    y: number;
    elevation: number;
  }>;
  readonly target: FieldContactView["subject"];
}
export interface EncounterTicketView {
  readonly id: string;
  readonly actor: string;
  readonly map: string;
  readonly area: EncounterArea;
  readonly table: string | null;
  readonly species: string;
  readonly level: number;
  readonly claimed: boolean;
}
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
  | "select"
  | "input"
  | "checkbox"
  | "radio"
  | "slider"
  | "tabs"
  | "list"
  | "table"
  | "divider"
  | "form"
  | "component";
export interface LayoutNode {
  kind: LayoutKind;
  key?: string;
  name?: string;
  submit?: boolean;
  placeholder?: string;
  maxLength?: number;
  min?: number;
  step?: number;
  component?: string;
  props?: Record<string, Json>;
  columns?: string[];
  rows?: (string | number)[][];
  style?: {
    gap?: number;
    padding?: number;
    columns?: number;
    align?: "start" | "center" | "end" | "stretch";
    justify?: "start" | "center" | "end" | "between";
    width?: "auto" | "full";
    fontSize?: number;
  };
  text?: string;
  src?: string;
  alt?: string;
  label?: string;
  theme?: string;
  action?: string;
  input?: Record<string, Json>;
  disabled?: boolean;
  children?: LayoutNode[];
  value?: number | string | boolean;
  max?: number;
  options?: { label: string; value: string }[];
}
export type UISlot =
  | "menu"
  | "monster.detail"
  | "monster.content"
  | "bag.actions"
  | "bag.content"
  | "party.actions"
  | "party.content"
  | "shop.actions"
  | "shop.content"
  | "battle.actions"
  | "facility.actions"
  | "facility.content";
export interface PluginUIView {
  context: Readonly<Record<string, Json>>;
  query(): Readonly<Json>;
  store: { get(key: string): Readonly<Json> };
  states: { list(uid: string): Readonly<Json> };
}
export interface UIRegionDefinition {
  slot: UISlot;
  priority?: number;
  when?: (view: PluginUIView) => boolean;
  render(view: PluginUIView): LayoutNode;
}
export interface UIComponentDefinition {
  schema: Json;
  render(props: Readonly<Record<string, Json>>, view: PluginUIView): LayoutNode;
}
export interface UITheme {
  background?: string;
  foreground?: string;
  border?: string;
  accent?: string;
  fontSize?: number;
  spacing?: number;
  borderWidth?: number;
  duration?: number;
}
export type AnimationEasing =
  | "linear"
  | "in-quad"
  | "out-quad"
  | "in-out-quad"
  | "smoothstep"
  | "step-end";
export interface AnimationKeyframe {
  at: number;
  values: Record<string, number>;
  easing?: AnimationEasing;
}
export interface AnimationTiming {
  anchor: "actor" | "targets" | "field";
  start: number;
  end: number;
  easing?: AnimationEasing;
  when?: "always" | "hit" | "miss";
  keyframes?: AnimationKeyframe[];
}
export interface MoveAnimation {
  duration: number;
  lunge?: number;
  tracks: (AnimationTiming & {
    effect: string;
    parameters?: Record<string, Json>;
  })[];
  poses?: (Omit<AnimationTiming, "anchor" | "keyframes"> & {
    anchor: "actor" | "targets";
    keyframes: (Omit<AnimationKeyframe, "values"> & {
      values: Partial<Record<"x" | "y" | "scale" | "opacity", number>>;
    })[];
  })[];
}
export interface BattleAnimationDefinition {
  kind: string;
  match?: Record<string, string | number | boolean | null>;
  priority?: number;
  mode?: "replace" | "append";
  animation: MoveAnimation;
}
export interface AudioCue {
  kind: "music" | "sound";
  volume: number;
  loop: boolean;
  source: string;
  loopStart?: number;
  loopEnd?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  maxVoices?: number;
}
export interface NPCIntent {
  interaction?: { target: string; kind: string };
  goal?: {
    map: string;
    x: number;
    y: number;
    adjacent?: boolean;
    elevation?: number;
  };
  state?: Json;
  dir?: Direction;
  move: boolean;
  pose: string;
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
    region(id: string, definition: UIRegionDefinition): string;
    component(id: string, definition: UIComponentDefinition): string;
    theme(id: string, definition: UITheme): string;
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
    battle(id: string, definition: BattleAnimationDefinition): string;
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
    sound(id: string): void;
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
  validateData?: (data: Readonly<Record<string, Json>>) => void;
}
export interface MovementTechnique {
  name: string;
  pose: string;
  jump?: boolean;
  keepFacing?: boolean;
  freezeAnimation?: boolean;
  oneStep?: boolean;
  menu?: boolean;
  turnAt?: number;
  liftFrames?: number[];
}
export interface TerrainContext {
  readonly actor?: Readonly<{
    elevation: number;
    previousElevation: number;
  }> | null;
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
  after?(context: TerrainContext):
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
  inputRule?: string;
  ledge?: { durationMs: number; liftFrames: number[] };
  durations: number[];
  allowed?: (context: Readonly<Json>) => boolean;
  traverse?: (context: Readonly<Json>) => boolean;
  afterStep?: (context: Readonly<Json>) => Json;
}
export interface LogicalMovementInput {
  direction: Direction | null;
  secondary: boolean;
  running: boolean;
}
export interface MovementInputAction {
  kind: "step" | "turn" | "pose";
  direction: Direction;
  durationMs?: number;
  technique?: string;
}
export interface MovementInputDefinition {
  schema?: DataSchema;
  initialState?: Json;
  decide(
    context: Readonly<{
      mode: string;
      state: Readonly<Json>;
      timeMs: number;
      input: Readonly<LogicalMovementInput>;
      previousInput: Readonly<LogicalMovementInput>;
      busy: boolean;
      blocked: boolean;
      position: Readonly<Position>;
      cell: Readonly<{
        block: number;
        behavior: number;
        collision: number;
        elevation: number;
      }>;
      momentum: Readonly<{
        mode: string | null;
        direction: Direction | null;
        steps: number;
      }>;
    }>,
  ): { state: Json; action?: MovementInputAction | null };
}
export type WorldPatchScope = "permanent" | "visit";
export type WorldOperation =
  | {
      kind: "tile";
      map: string;
      x: number;
      y: number;
      block?: number;
      behavior?: number;
      appearance?: number | null;
      scope?: WorldPatchScope;
    }
  | {
      kind: "object";
      map: string;
      id: string;
      changes?: Record<string, Json>;
      hidden?: boolean;
      spawn?: boolean;
      scope?: WorldPatchScope;
    };
export type FieldOperation =
  | { kind: "movement"; mode: string }
  | {
      kind: "effect";
      id: string;
      data?: Record<string, Json>;
      remove?: boolean;
    }
  | {
      kind: "displace";
      object: string;
      direction: Direction;
      follow: boolean;
      mode: string;
      scope: WorldPatchScope;
      duration: number;
    }
  | { kind: "world"; operations: WorldOperation[]; encounter?: "rock" }
  | {
      kind: "travel";
      position: { map: string; x: number; y: number; dir: string };
      mode: string;
    }
  | { kind: "route"; directions: string[]; mode: string }
  | { kind: "fishing"; rod: "old" | "good" | "super" };
export interface FieldActionContext {
  readonly effects: Readonly<{
    revision: number;
    activeMap: string | null;
    records: Readonly<
      Record<
        string,
        Readonly<{ data: Record<string, Json>; map: string | null }>
      >
    >;
  }>;
  readonly position: Readonly<{
    map: string;
    x: number;
    y: number;
    dir: "up" | "down" | "left" | "right";
    elevation?: number;
    previousElevation?: number;
  }>;
  readonly mode: string;
  readonly revision: number;
  readonly flags: Readonly<Record<string, boolean | number | string>>;
  readonly bag: Readonly<Record<string, number>>;
  readonly map: Readonly<{
    darkness?: Readonly<{
      radius: number;
      illuminatedRadius: number;
      opacity?: number;
    }> | null;
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
    elevation?: number;
    reserved: readonly Readonly<{ x: number; y: number; elevation?: number }>[];
  }>[];
  readonly links: readonly FieldLinkDefinition[];
  readonly devices: FieldDeviceView;
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
  triggers?: ("interact" | "blocked")[];
  priority?: number;
  menu?: boolean;
  avatar?: MoveAnimation["poses"];
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
export interface FieldEffectDefinition {
  scope: "visit" | "world";
  schema: DataSchema;
  retain?(
    context: Readonly<{
      from: string | null;
      to: string;
      reason: string;
      map: Readonly<{
        id: string;
        indoor: boolean;
        darkness: Json;
        presentation: Json;
      }>;
    }>,
    data: Readonly<Record<string, Json>>,
  ): boolean;
  presentation?(
    data: Readonly<Record<string, Json>>,
    context: Readonly<Record<string, Json>> | null,
  ): Json;
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

/** Frame-local work; distinct from world RTC and offline schedule. */
export interface FieldDeviceState {
  revision: number;
  elapsedMs: number;
  records: Record<string, Json>;
  timers: Record<string, Record<string, { dueMs: number; payload: Json }>>;
  requests: Record<
    string,
    Record<string, { action: string; input: Record<string, Json> }>
  >;
}
export interface FieldDeviceDefinition {
  footprint?: { dx: number; dy: number }[];
  map: string;
  x: number;
  y: number;
  elevation?: number;
  mechanism: string;
  config?: Record<string, Json>;
}
export interface FieldDeviceView {
  readonly records: Readonly<Record<string, Json>>;
  readonly pending: Readonly<FieldDeviceState["requests"]>;
  readonly devices: Readonly<
    Record<string, FieldDeviceDefinition & { id: string }>
  >;
}
export interface FieldDeviceContext {
  readonly objects: readonly Readonly<{
    id: string;
    x: number;
    y: number;
    elevation?: number;
    kind?: string;
    reserved?: readonly Readonly<{
      x: number;
      y: number;
      elevation?: number;
    }>[];
  }>[];
  readonly device: Readonly<
    FieldDeviceDefinition & { id: string; config: Record<string, Json> }
  >;
  readonly state: Readonly<Json>;
  readonly event: Readonly<{
    phase:
      | "activate"
      | "enter"
      | "leave"
      | "settle"
      | "timer"
      | "interact"
      | "occupancy";
    payload: Json;
  }>;
  readonly position: Readonly<Position>;
  readonly tile: Readonly<{ block: number; behavior: number }>;
  readonly tiles: readonly Readonly<{
    x: number;
    y: number;
    block: number;
    behavior: number;
  }>[];
  readonly mode: string;
  readonly durationMs: number;
  readonly input: Readonly<LogicalMovementInput & { blocked: boolean }>;
}
export interface FieldDeviceDecision {
  state?: Json;
  operations?: WorldOperation[];
  timers?: { key: string; delayMs: number; payload?: Json }[];
  cancelTimers?: string[];
  requests?: { key: string; action: string; input?: Record<string, Json> }[];
  cancelRequests?: string[];
  facts?: { kind: string; data?: Json }[];
}
export interface FieldMechanismDefinition {
  scope: "visit" | "permanent";
  schema?: DataSchema;
  initialState?: Json;
  configSchema?: DataSchema;
  activate?: (context: FieldDeviceContext) => FieldDeviceDecision;
  enter?: (context: FieldDeviceContext) => FieldDeviceDecision;
  leave?: (context: FieldDeviceContext) => FieldDeviceDecision;
  settle?: (context: FieldDeviceContext) => FieldDeviceDecision;
  timer?: (context: FieldDeviceContext) => FieldDeviceDecision;
  interact?: (context: FieldDeviceContext) => FieldDeviceDecision;
  occupancy?: (context: FieldDeviceContext) => FieldDeviceDecision;
}

export interface WorldClockState {
  initialized: boolean;
  localMs: number;
  wallMs: number | null;
  playMs: number;
  processedMinute: number;
  processedDay: number;
}
export interface TimeTaskDefinition {
  schema?: DataSchema;
  intervalMs?: number;
  catchUp?: "all" | "aggregate" | "latest";
}
export interface WorldScheduleState {
  sequence: number;
  tasks: Record<string, { definition: string; dueMs: number; data: Json }>;
}

export interface CropDefinition {
  item: string;
  name: string;
  durationMinutes: number;
  minYield: number;
  maxYield: number;
}
export interface BerryPlotDefinition {
  map: string;
  objectId: string;
}

export interface ActorScheduleDefinition {
  offscreen?: "hold" | "relocate";
  entries: {
    id: string;
    start: number;
    days?: number[];
    position: {
      map: string;
      x: number;
      y: number;
      dir: Direction;
      elevation?: number;
    };
    radius?: number;
    behavior?: string;
    config?: Record<string, Json>;
    pose?: string;
  }[];
}

export interface ActorTemplateDefinition {
  name: string;
  actor: string;
  behavior: string;
  config?: Record<string, Json>;
  schema?: DataSchema;
  initialState?: Json;
  perceptionRadius?: number;
  schedule?: string;
}

export interface NPCPoseDefinition {
  inPlace?: boolean;
  height?: number;
  periodMs?: number;
  stepPeriodMs?: number;
  actor?: string;
}

/** Sprite frames are presentation data, independent of movement and gameplay. */
export interface SpriteFrame {
  index: number;
  durationMs: number;
}
export interface SpriteSequence {
  loop: boolean;
  directions: Record<Direction, SpriteFrame[]>;
}
export interface SpriteAnimationCatalog {
  [pose: string]: { idle: SpriteSequence; move?: SpriteSequence };
}

/** A world selection may have a different battle identity or none. Cycles select saved day or foreground phase. */
export interface WeatherDefinition {
  label: string;
  visual?: string;
  battle?: string;
  cycle?: readonly string[];
  periodMs?: number;
}
export interface BattleWeatherDefinition {
  visual?: string;
  weatherBall?: string;
  residual?: { divisor: number; immuneTypes: readonly string[] };
}
export interface MapWeatherDefinition {
  default: string;
  regions?: readonly {
    x: number;
    y: number;
    width?: number;
    height?: number;
    elevation?: number;
    weather: string;
  }[];
}
export interface WeatherView {
  readonly map: string;
  readonly kind: string;
  readonly selection: string;
  readonly source: "map" | "override" | "coordinate" | "script";
  readonly label: string;
  readonly visual: string | null;
  readonly battle: string | null;
  readonly day: number;
  readonly revision: number;
}

/** Facility rules return detached plans; RNG samples and economy commits belong to the host. */
export interface FacilityTransfer {
  money?: number;
  items?: Record<string, number>;
}
export interface FacilityTransition {
  data: Json;
  cost?: FacilityTransfer;
  reward?: FacilityTransfer;
  pendingReward?: FacilityTransfer;
  battle?: { trainerId: string; weather?: string | null };
  outcome?: "win" | "loss" | "quit";
}
export interface FacilityActivityContext {
  readonly parameters: Json;
  readonly data: Json;
  readonly input: Json;
  readonly rolls: readonly number[];
  readonly world: Readonly<Json>;
}
export interface FacilityActivityDefinition {
  parameters: DataSchema;
  state: DataSchema;
  initial: Json;
  actions: Record<
    string,
    {
      label: string;
      schema: DataSchema;
      draws?: number[];
      decide(context: Readonly<FacilityActivityContext>): FacilityTransition;
    }
  >;
  onBattle?(
    context: Readonly<FacilityActivityContext>,
    result: "win" | "loss",
  ): FacilityTransition;
  validate?(
    definition: Readonly<FacilityDefinition>,
    references: Readonly<Json>,
  ): void;
}
export interface FacilityDefinition {
  name: string;
  activity: string;
  parameters: Json;
  requires?: Condition;
  team?: {
    min: number;
    max: number;
    levelCap?: number;
    uniqueSpecies?: boolean;
    uniqueHeldItems?: boolean;
    bannedSpecies?: string[];
    heldItems?: boolean;
    items?: boolean;
    healBetween?: boolean;
  };
}

export interface BattleAugmentDefinition {
  name: string;
  moves: readonly string[];
  select(context: Readonly<BattleAugmentContext>): string;
  requires?(context: Readonly<BattleAugmentContext>): boolean;
  limit?: {
    scope: "battle" | "alliance" | "controller" | "creature";
    key?: string;
    max: number;
  };
  cost?: { pp?: number; item?: string; count?: number };
}
export interface BattleAugmentContext {
  actor: DeepReadonly<Creature & { types: readonly string[] }>;
  sourceMove: Readonly<{
    id: string;
    name: string;
    power: number;
    accuracy: number;
    pp: number;
    type: string;
    effect: string;
    priority: number;
    chance?: number;
    target?: string;
  }>;
  seat: string;
  controller: Readonly<{
    id: string;
    alliance: string;
    bag: Readonly<Record<string, number>>;
  }>;
  turn: number;
  weather: string | null;
}
