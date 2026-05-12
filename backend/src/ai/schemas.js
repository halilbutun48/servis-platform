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
  "CHAT_HELP",
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

const SHORT_SCREEN_PURPOSE_PHRASES = [
  "bura ne",
  "burası ne",
  "burasi ne",
  "bu ne",
  "ne bu",
  "burda ne var",
  "burada ne var",
  "burası ne işe yarıyor",
  "burasi ne ise yariyor",
  "bu ekran ne",
  "bu ekran ne için",
  "bu ekran ne icin",
  "burda ne yapılıyor",
  "burada ne yapılıyor",
  "burda ne yapiliyor",
  "burada ne yapiliyor",
  "burada ne yapacağım",
  "burada ne yapacagim",
  "burda ne yapacağım",
  "burda ne yapacagim",
  "burada ne yapayım",
  "burda ne yapayım",
  "ne işe yarıyor",
  "ne ise yariyor",
];

const SHORT_FIRST_CONTROL_PHRASES = [
  "ilk neye bakayım",
  "ilk neye bakayim",
  "ilk kontrol",
  "ilk bakılacak",
  "ilk bakilacak",
  "önce neye bakayım",
  "once neye bakayim",
  "önce neye bakmaliyim",
  "once neye bakmaliyim",
];

const SHORT_NEXT_STEP_PHRASES = [
  "ne yapayım",
  "ne yapayim",
  "şimdi ne",
  "simdi ne",
  "şimdi ne yapayım",
  "simdi ne yapayim",
  "şimdi ne yapmalıyım",
  "simdi ne yapmaliyim",
  "sıradaki doğru işlem ne",
  "siradaki dogru islem ne",
];

function isShortNaturalScreenPrompt(message) {
  const text = normalizeLooseText(message);
  if (!text) return false;
  return matchesStandalonePhrase(text, SHORT_SCREEN_PURPOSE_PHRASES) || matchesStandalonePhrase(text, SHORT_FIRST_CONTROL_PHRASES) || matchesStandalonePhrase(text, SHORT_NEXT_STEP_PHRASES);
}

function normalizeLooseText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesStandalonePhrase(text, phrases) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return (Array.isArray(phrases) ? phrases : []).some((phrase) => {
    const normalized = normalizeLooseText(phrase);
    if (!normalized) return false;
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(normalized)}(?:$|[^\\p{L}\\p{N}])`, "iu");
    return pattern.test(value);
  });
}

export function normalizeCopilotShortPrompt(message) {
  const raw = String(message || "").trim();
  if (!raw) return raw;
  const text = raw.toLocaleLowerCase("tr-TR");
  if (matchesStandalonePhrase(text, SHORT_SCREEN_PURPOSE_PHRASES)) return "Bu ekran ne için?";
  if (matchesStandalonePhrase(text, SHORT_FIRST_CONTROL_PHRASES)) return "İlk neye bakayım?";
  if (matchesStandalonePhrase(text, SHORT_NEXT_STEP_PHRASES)) return "Şimdi ne yapayım?";
  return raw;
}

export function normalizeCopilotRequestInput(input) {
  const normalized = input && typeof input === "object" && !Array.isArray(input) ? { ...input } : {};
  normalized.message = normalizeCopilotShortPrompt(normalized.message);
  const shortNaturalPrompt = isShortNaturalScreenPrompt(normalized.message);

  if (shortNaturalPrompt && !AI_COPILOT_INTENTS.includes(String(normalized.intent || ""))) {
    normalized.intent = "CHAT_HELP";
  }
  if (shortNaturalPrompt && !AI_COPILOT_ENTITY_TYPES.includes(String(normalized.entityType || ""))) {
    normalized.entityType = "screen";
  }

  if (String(normalized.intent || "") === "CHAT_HELP" && String(normalized.entityType || "") === "screen") {
    const screenId = Number(normalized.entityId || normalized.screenContext?.id || normalized.conversationState?.lastScreenId || 0);
    normalized.entityId = Number.isFinite(screenId) && screenId >= 0 ? screenId : 0;
  }

  return normalized;
}

const requestSchema = z
  .object({
    intent: z.enum(AI_COPILOT_INTENTS),
    entityType: z.enum(AI_COPILOT_ENTITY_TYPES),
    entityId: z.preprocess((value) => {
      if (value == null || value === "") return 0;
      const num = Number(value);
      return Number.isFinite(num) ? num : value;
    }, z.number().int().nonnegative()),
    format: z.enum(["json"]).optional().default("json"),
    jobType: z.enum(JOB_GUIDE_TYPES).optional(),
    guideLevel: z.enum(GUIDE_LEVELS).optional().default("SHORT"),
    screenContext: z.any().optional(),
    message: z.string().trim().max(500).optional().default(""),
    conversationState: z.any().optional(),
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
    if (val.entityType === "screen" && !["JOB_GUIDE", "CHAT_HELP"].includes(val.intent)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entityType"],
        message: "screen entityType only supports JOB_GUIDE or CHAT_HELP",
      });
    }
    if (val.intent !== "CHAT_HELP" && val.entityId <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entityId"],
        message: "entityId must be positive",
      });
    }
    if (val.intent === "CHAT_HELP" && val.entityType === "screen" && val.entityId < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entityId"],
        message: "screen chat entityId cannot be negative",
      });
    }
  });

export function parseCopilotRequest(input) {
  return requestSchema.safeParse(normalizeCopilotRequestInput(input || {}));
}
