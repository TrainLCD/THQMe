import { z } from "zod";
import { MovingStateSchema } from "./state";

const LogDataSchema = z.object({
  device: z.string(),
  id: z.string(),
  level: z.string(),
  message: z.string(),
  timestamp: z.number().min(0),
  type: z.literal("log"),
});

const LocationUpdateDataSchema = z.object({
  coords: z.object({
    accuracy: z.number().min(0).optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    speed: z.number().min(0).optional(),
  }),
  device: z.string(),
  id: z.string(),
  state: MovingStateSchema,
  timestamp: z.number().min(0),
  type: z.literal("location_update"),
});

const UnknownDataSchema = z.object({
  type: z.literal("unknown"),
  raw: z.object({
    error: z.string(),
    raw: z.string(),
  }),
});

export type LocationUpdateData = z.infer<typeof LocationUpdateDataSchema>;
export type LogData = z.infer<typeof LogDataSchema>;
export type UnknownData = z.infer<typeof UnknownDataSchema>;

export const ReceivedDataSchema = z.discriminatedUnion("type", [
  LocationUpdateDataSchema,
  LogDataSchema,
  UnknownDataSchema,
]);
