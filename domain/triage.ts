import { z } from "zod";

export const LocationTriageKindSchema = z.enum(["high", "moderate", "low"]);
export type LocationTriageKind = z.infer<typeof LocationTriageKindSchema>;
