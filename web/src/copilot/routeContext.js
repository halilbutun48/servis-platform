import { createContext, useContext } from "react";

export const ROUTE_CONTEXT_STATUSES = Object.freeze({
  ALLOW: "ALLOW",
  DENY: "DENY",
  UNKNOWN: "UNKNOWN",
  UNAVAILABLE: "UNAVAILABLE",
});

const DEFAULT_ROUTE_CONTEXT = Object.freeze({
  status: ROUTE_CONTEXT_STATUSES.UNAVAILABLE,
  path: "",
});

export const CopilotRouteContext = createContext(DEFAULT_ROUTE_CONTEXT);

export function createCopilotRouteContext({ status, path } = {}) {
  const normalizedStatus = Object.values(ROUTE_CONTEXT_STATUSES).includes(status)
    ? status
    : ROUTE_CONTEXT_STATUSES.UNAVAILABLE;
  return Object.freeze({
    status: normalizedStatus,
    path: String(path || ""),
  });
}

export function useCopilotRouteContext() {
  return useContext(CopilotRouteContext) || DEFAULT_ROUTE_CONTEXT;
}

export function routeContextKey(routeContext = {}) {
  return `${String(routeContext.status || ROUTE_CONTEXT_STATUSES.UNAVAILABLE)}|${String(routeContext.path || "")}`;
}

export function canUseRouteBoundCopilotContext(routeContext = {}, metadata = null) {
  return routeContext?.status === ROUTE_CONTEXT_STATUSES.ALLOW && metadata?.metadataStatus === "FOUND" && Boolean(metadata?.screen);
}

export function routeContextClearsBoundState(routeContext = {}, metadata = null) {
  return routeContext?.status !== ROUTE_CONTEXT_STATUSES.ALLOW || metadata?.metadataStatus !== "FOUND";
}
