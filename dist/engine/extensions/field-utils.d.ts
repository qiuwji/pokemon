import type { Position } from "../contracts.js";
export declare function frontCell(
  position: Readonly<Pick<Position, "map" | "x" | "y" | "dir">>,
): Readonly<{ map: string; x: number; y: number }>;
