import { z } from "zod";

export const AI_COPILOT_INTENTS = [
  "SHIFT_SUMMARY",
  "CONFLICT_EXPLAIN",
  "OPS_NOTE_DRAFT",
  "ASSIGNMENT_READINESS",
  "OFFER_DECISION_HELP",
  "TELEMATICS_HEALTH",
  "GPS_SIGNAL_DIAGNOSIS",
];

export const AI_COPILOT_ENTITY_TYPES = ["shift", "vehicle"];

const SHIFT_INTENTS = [
  "SHIFT_SUMMARY",
  "CONFLICT_EXPLAIN",
  "OPS_NOTE_DRAFT",
  "ASSIGNMENT_READINESS",
  "OFFER_DECISION_HELP",
];

const VEHICLE_INTENTS = ["TELEMATICS_HEALTH", "GPS_SIGNAL_DIAGNOSIS"];

const requestSchema = z
  .object({
    intent: z.enum(AI_COPILOT_INTENTS),
    entityType: z.enum(AI_COPILOT_ENTITY_TYPES),
    entityId: z.coerce.number().int().positive(),
    format: z.enum(["json"]).optional().default("json"),
  })
  .superRefine((val, ctx) => {
    if (VEHICLE_INTENTS.includes(val.intent) && val.entityType !== "vehicle") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entityType"],
        message: `${val.intent} intent requires entityType=vehicle`,
      });
    }
    if (SHIFT_INTENTS.includes(val.intent) && val.entityType !== "shift") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entityType"],
        message: `${val.intent} intent requires entityType=shift`,
      });
    }
  });

export function parseCopilotRequest(input) {
  return requestSchema.safeParse(input || {});
}
