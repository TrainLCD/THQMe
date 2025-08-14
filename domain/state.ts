export const MOVING_STATE = {
  ARRIVED: "arrived",
  APPROACHING: "approaching",
  PASSING: "passing",
  MOVING: "moving",
} as const

export type MovingState = (typeof MOVING_STATE)[keyof typeof MOVING_STATE];