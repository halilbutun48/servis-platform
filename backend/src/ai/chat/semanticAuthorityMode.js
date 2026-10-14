const VALID_SEMANTIC_AUTHORITY_MODES = new Set(["OLD", "SHADOW", "NEW"]);
// The typed specificity composition path is the sole production authority.
// OLD/SHADOW remain explicit diagnostic modes for historical comparison, but
// an unset or invalid production configuration must never silently re-enable
// a shadow authority.
const DEFAULT_SEMANTIC_AUTHORITY_MODE = "NEW";

export function getSemanticAuthorityMode({ env = process.env } = {}) {
  const configured = env?.SEFER_ABI_SEMANTIC_AUTHORITY_MODE
    ?? env?.SEMANTIC_AUTHORITY_MODE
    ?? env?.M18_SEMANTIC_AUTHORITY_MODE
    ?? DEFAULT_SEMANTIC_AUTHORITY_MODE;
  const mode = String(configured).trim().toUpperCase();
  return VALID_SEMANTIC_AUTHORITY_MODES.has(mode)
    ? mode
    : DEFAULT_SEMANTIC_AUTHORITY_MODE;
}

export { VALID_SEMANTIC_AUTHORITY_MODES, DEFAULT_SEMANTIC_AUTHORITY_MODE };
