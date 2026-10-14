const TRACE_TTL_MS = 5 * 60 * 1000;

export const SEFER_ABI_SEMANTIC_TRACE_VERSION = "SEFER-ABI-SEMANTIC-TRACE-V1";

function text(value) {
  return String(value || "").trim();
}

function statusOnly(value) {
  if (!value || typeof value !== "object") return null;
  return {
    status: text(value.status || value.result || value.state) || null,
    reasonCode: text(value.reasonCode || value.reason) || null,
  };
}

function redactAuthScope(authScope) {
  if (!authScope || typeof authScope !== "object") return null;
  return {
    role: text(authScope.role).toUpperCase() || null,
    companyScope: authScope.companyId ? "PRESENT" : "ABSENT",
    roomScope: authScope.roomId ? "PRESENT" : "ABSENT",
  };
}

export function createSemanticTrace({
  requestId,
  authScope,
  canonicalRequest,
  contextResolution,
  entityResolution,
  authorizationDecision,
  groundingSources,
  semanticOutcome,
  targetResolution,
  responseRenderer,
  failureClass,
} = {}) {
  const createdAt = new Date().toISOString();
  const trace = {
    schemaVersion: SEFER_ABI_SEMANTIC_TRACE_VERSION,
    traceId: `trace-${String(requestId || "unknown")}-${Date.now()}`,
    requestId: text(requestId) || null,
    authScope: redactAuthScope(authScope),
    canonicalRequest: canonicalRequest
      ? {
        version: text(canonicalRequest.version) || null,
        operation: text(canonicalRequest.operation) || null,
        domain: text(canonicalRequest.domain) || null,
        capability: text(canonicalRequest.capability) || null,
        semanticScope: text(canonicalRequest.semanticScope?.class) || null,
        semanticAction: canonicalRequest.semanticAction
          ? {
            actionClass: text(canonicalRequest.semanticAction.actionClass) || null,
            objectClass: text(canonicalRequest.semanticAction.objectClass) || null,
            targetCandidate: canonicalRequest.semanticAction.targetCandidate
              ? {
                objectClass: text(canonicalRequest.semanticAction.targetCandidate.objectClass) || null,
                targetKey: text(canonicalRequest.semanticAction.targetCandidate.targetKey) || null,
                semanticId: text(canonicalRequest.semanticAction.targetCandidate.semanticId) || null,
              }
              : null,
            modifiers: canonicalRequest.semanticAction.modifiers && typeof canonicalRequest.semanticAction.modifiers === "object"
              ? {
                new: Boolean(canonicalRequest.semanticAction.modifiers.new),
                current: Boolean(canonicalRequest.semanticAction.modifiers.current),
                next: Boolean(canonicalRequest.semanticAction.modifiers.next),
                explicitTarget: Boolean(canonicalRequest.semanticAction.modifiers.explicitTarget),
              }
              : null,
            resolutionStatus: text(canonicalRequest.semanticAction.resolutionStatus) || null,
            evidence: Array.isArray(canonicalRequest.semanticAction.evidence)
              ? canonicalRequest.semanticAction.evidence.map((item) => text(item)).filter(Boolean).slice(0, 8)
              : [],
          }
          : null,
      }
      : null,
    contextResolution: statusOnly(contextResolution),
    entityResolution: statusOnly(entityResolution),
    authorizationDecision: statusOnly(authorizationDecision),
    groundingSources: Array.isArray(groundingSources)
      ? groundingSources.slice(0, 12).map((item) => statusOnly(item)).filter(Boolean)
      : [],
    semanticOutcome: semanticOutcome && typeof semanticOutcome === "object"
      ? {
        operation: text(semanticOutcome.operation) || null,
        domain: text(semanticOutcome.domain) || null,
        capability: text(semanticOutcome.capability) || null,
      }
      : null,
    targetResolution: statusOnly(targetResolution),
    responseRenderer: statusOnly(responseRenderer),
    failureClass: text(failureClass) || null,
    retention: {
      createdAt,
      expiresAt: new Date(Date.now() + TRACE_TTL_MS).toISOString(),
      access: "INTERNAL_ACCESS_CONTROLLED",
    },
  };
  return Object.freeze(trace);
}

export function isSemanticTraceExpired(trace, now = Date.now()) {
  const expiresAt = Date.parse(trace?.retention?.expiresAt || "");
  return !Number.isFinite(expiresAt) || expiresAt <= now;
}
