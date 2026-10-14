// Reserved fixture provenance is not a user-authored offer note.  Keep this
// boundary explicit so ordinary notes remain unchanged and no broad text
// sanitizer can erase legitimate commercial content.
const RESERVED_FIXTURE_NOTE_PREFIX = "M18_DEMO_ROOM_FINANCE_FOUNDATION_V1:";

export function sanitizeUserFacingOfferNote(value) {
  if (value == null) return null;
  const text = String(value);
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith(RESERVED_FIXTURE_NOTE_PREFIX)) return null;
  return text;
}

export { RESERVED_FIXTURE_NOTE_PREFIX };
