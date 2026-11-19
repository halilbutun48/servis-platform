export function resolvePassengerLinksCopilotScopeKey(pathname = "") {
  return String(pathname || "").startsWith("/school/access-links")
    ? "/school/access-links"
    : "/company/access-links";
}
