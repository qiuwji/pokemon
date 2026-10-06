import type { Condition, FacilityDefinition, Json, PluginAPI } from "../contracts.js";
export interface TemplateReward { money: number; items?: { id: string; count: number }[]; }
export interface ScoreContestParameters {
  rounds: number;
  appeals: { id: string; label: string; points: number; jam?: number; crowd?: number;
    comboFrom?: string[]; comboBonus?: number; repeatPenalty?: number }[];
  opponents: { name: string; scores: number[] }[];
  crowdThreshold?: number;
  crowdBonus?: number;
  prizes: { rank: number; reward: TemplateReward }[];
}
export interface ReelMachineParameters {
  stake: number; reels: string[][]; lines: number[][];
  payouts: { pattern: string[]; multiplier: number }[];
}
export type JSONFacilityDefinition = {
  id: string; name: string; requires?: Condition; team?: FacilityDefinition["team"];
} & (
  { template: "score-contest"; parameters: ScoreContestParameters } |
  { template: "reel-machine"; parameters: ReelMachineParameters } |
  { template: "battle-sequence"; parameters: { trainers: string[]; money: number; item?: string } }
);
export interface FacilityContentPack {
  version: 1;
  trainers?: { id: string; definition: Json }[];
  facilities: JSONFacilityDefinition[];
}
/** Registration is staged by PluginHost. Bounds and references are validated at runtime. */
export function registerFacilityContent(api: Pick<PluginAPI, "content">, pack: FacilityContentPack): void;
