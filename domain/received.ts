import { z } from "zod";
import { MovingStateSchema } from "./state";

const LogDataSchema = z.object({
  device: z.string().nullish(),
  id: z.string().nullish(),
  level: z.string().nullish(),
  message: z.string().nullish(),
  timestamp: z.number().min(0),
  type: z.literal("log"),
});

const LocationUpdateDataSchema = z.object({
  coords: z.object({
    accuracy: z.number().min(0).nullish(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    speed: z.union([z.number().nonnegative(), z.literal(-1)]).nullish(),
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
