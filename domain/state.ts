import * as z from "zod";

export const MOVING_STATE = {
  ARRIVED: "arrived",
  APPROACHING: "approaching",
  PASSING: "passing",
  MOVING: "moving",
} as const;

export const MovingStateSchema = z.enum(MOVING_STATE);
export type MovingState = z.infer<typeof MovingStateSchema>;
