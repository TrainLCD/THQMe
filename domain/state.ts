import { z } from "zod";

export const MOVING_STATE = {
  ARRIVED: "arrived",
  APPROACHING: "approaching",
  PASSING: "passing",
  MOVING: "moving",
} as const;

export const MovingStateSchema = z.enum([
  MOVING_STATE.ARRIVED,
  MOVING_STATE.APPROACHING,
  MOVING_STATE.PASSING,
  MOVING_STATE.MOVING,
]);
export type MovingState = z.infer<typeof MovingStateSchema>;
