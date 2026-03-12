import { z } from "zod";
import { GUIDE_LEVELS } from "./jobGuide/levels.js";
import { JOB_GUIDE_TYPES, getJobGuideDefinition } from "./jobGuide/registry.js";

export const AI_COPILOT_INTENTS = [
  "SHIFT_SUMMARY",
  "CONFLICT_EXPLAIN",
  "OPS_NOTE_DRAFT",
  "ASSIGNMENT_READINESS",
  "OFFER_DECISION_HELP",
  "TELEMATICS_HEALTH",
  "GPS_SIGNAL_DIAGNOSIS",
  "JOB_GUIDE",
];

export const AI_COPILOT_ENTITY_TYPES = ["shift", "vehicle", "screen"];

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
    jobType: z.enum(JOB_GUIDE_TYPES).optional(),
    guideLevel: z.enum(GUIDE_LEVELS).optional().default("SHORT"),
    screenContext: z.any().optional(),
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
    if (val.intent === "JOB_GUIDE") {
      if (!val.jobType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["jobType"],
          message: "JOB_GUIDE intent requires jobType",
        });
      }
      const def = getJobGuideDefinition(val.jobType);
      if (def && def.entityType !== val.entityType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entityType"],
          message: `${val.jobType} jobType requires entityType=${def.entityType}`,
        });
      }
    }
    if (val.entityType === "screen" && val.intent !== "JOB_GUIDE") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entityType"],
        message: "screen entityType only supports JOB_GUIDE",
      });
    }
  });

export function parseCopilotRequest(input) {
  return requestSchema.safeParse(input || {});
}
