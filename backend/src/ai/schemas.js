import { z } from "zod";

export const AI_COPILOT_INTENTS = [
  "SHIFT_SUMMARY",
  "CONFLICT_EXPLAIN",
  "TELEMATICS_HEALTH",
  "OPS_NOTE_DRAFT",
];

export const AI_COPILOT_ENTITY_TYPES = ["shift", "vehicle"];

const requestSchema = z
  .object({
    intent: z.enum(AI_COPILOT_INTENTS),
    entityType: z.enum(AI_COPILOT_ENTITY_TYPES),
    entityId: z.coerce.number().int().positive(),
    format: z.enum(["json"]).optional().default("json"),
  })
  .superRefine((val, ctx) => {
    if (val.intent === "TELEMATICS_HEALTH" && val.entityType !== "vehicle") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entityType"],
        message: "TELEMATICS_HEALTH intent requires entityType=vehicle",
      });
    }
    if (["SHIFT_SUMMARY", "CONFLICT_EXPLAIN", "OPS_NOTE_DRAFT"].includes(val.intent) && val.entityType !== "shift") {
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
