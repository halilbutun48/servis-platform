function normalizeText(value) {
  return String(value || "").trim();
}

export function getProactiveActionableEventKey(event) {
  if (!event || typeof event !== "object") return "";
  return [
    normalizeText(event.id),
    normalizeText(event.sourceType),
    normalizeText(event.sourceId),
    normalizeText(event.title),
    normalizeText(event.actionPath),
  ].filter(Boolean).join("|");
}

export function resolveProactiveBubble({ events = [], dismissedKey = "" } = {}) {
  const event = Array.isArray(events)
    ? events.find((candidate) => {
      const key = getProactiveActionableEventKey(candidate);
      return Boolean(key && normalizeText(candidate?.title) && normalizeText(candidate?.actionPath) && key !== dismissedKey);
    })
    : null;
  if (!event) return null;

  return {
    event,
    key: getProactiveActionableEventKey(event),
    message: normalizeText(event.title),
    actionLabel: normalizeText(event.actionLabel) || "İncele",
    actionPath: normalizeText(event.actionPath),
    avatarState: "attention",
  };
}
