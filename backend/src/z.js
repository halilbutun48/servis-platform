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
    const e = new Error("Zod schema missing");
    e.status = 500;
    throw e;
  }

  const parsed = schema.safeParse(input ?? {});
  if (parsed.success) return parsed.data;

  const e = new Error("Validation failed");
  e.status = 400;
  // Keep details handy (some routes stringify e.message; others may inspect e.details).
  try {
    e.details = parsed.error.flatten();
    // Make message at least slightly informative for current catch blocks.
    e.message = JSON.stringify(e.details);
  } catch {
    // ignore
  }
  throw e;
}
