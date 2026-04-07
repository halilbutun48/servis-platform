import { httpError } from "./errors/http.js";

// backend/src/z.js
// Small Zod helper(s) shared by route modules.
// Keeping this in a tiny file avoids repeating safeParse boilerplate.

/**
 * Validate `input` with a Zod schema.
 *
 * Returns parsed data on success.
 * Throws an Error with `status = 400` on validation failure.
 */
export function validateWithZod(schema, input) {
  if (!schema || typeof schema.safeParse !== "function") {
    throw httpError(500, "ZOD_SCHEMA_MISSING", "Zod schema missing");
  }

  const parsed = schema.safeParse(input ?? {});
  if (parsed.success) return parsed.data;

  let details = undefined;
  try {
    details = parsed.error.flatten();
  } catch {
    details = undefined;
  }
  throw httpError(400, "VALIDATION_ERROR", "Validation failed", details);
}
