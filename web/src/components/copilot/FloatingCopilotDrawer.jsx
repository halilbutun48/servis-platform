import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { getPath, navigate } from "../../router";
import { useSession } from "../../state/session";
import { clearCopilotSelection, copilotSelectionContextKey, copilotSelectionEventName, readCopilotSelection, resolveRouteBoundFinancialSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { companyPath, normalizeCompanyPath } from "../../utils/paths";
import { buildCopilotStarterChips, COPILOT_PERSONA } from "../../utils/copilotFacts";
import { resolveCopilotScreenContext } from "../../copilot/screenRegistry";
import { canUseRouteBoundCopilotContext, routeContextKey, useCopilotRouteContext } from "../../copilot/routeContext";
import { planCenterOverlayLayerEventName, readPlanCenterOverlayLayer, setPlanCenterOverlayLayer } from "../../utils/planCenterOverlayLayer";
import { compactCopilotMessages, copilotAuthScopeKey, copilotSharedStateEventName, readCopilotSharedState, writeCopilotSharedState } from "../../utils/copilotSharedState";
import { captureCopilotUiSurface } from "./uiSurface";
import { getGuidedTarget, setGuidedTarget, subscribeGuidedTarget } from "../../copilot/guidedTargetState";
import SeferAbiAvatar from "./SeferAbiAvatar";
import { resolveSeferAbiWidgetState, SEFER_ABI_WIDGET_STATE_LABELS } from "./SeferAbiWidgetState";
import { resolveSeferAbiContextCue } from "./seferAbiContextCue";
import { humanizeUserFacingText } from "../../utils/terminology";
import { loadActionableEventsBundle, subscribeActionableEventsSnapshot } from "../../utils/dashboardBulk";
import { resolveProactiveBubble } from "./seferAbiProactiveBubble";
import { resizeDrawerFrame } from "./drawerGeometry";
import { getChatScrollbarMetrics, scrollTopFromScrollbarPointer } from "./chatScrollbar";

const STORAGE_KEY = "psv1:copilot:drawer:v4";
const HISTORY_KEY = "psv1:copilot:drawer:history:v4";
const FULL_WORKSPACE_HANDOFF_KEY = "psv1:copilot:full-workspace-handoff:v1";
const SIZE_PRESETS = { S: { width: 440, height: 560 }, M: { width: 560, height: 700 }, L: { width: 700, height: 860 } };
const DEFAULT_DRAWER_SIZE = "S";
const RESULT_READY_DISPLAY_MS = 1400;
const LAUNCHER_PLACEMENT_KEY = "psv1:copilot:launcher-placement:v1";
const LAUNCHER_PLACEMENT_VERSION = 1;
const LAUNCHER_DRAG_THRESHOLD_PX = 7;
const PROACTIVE_DISMISSED_KEY = "psv1:copilot:proactive-actionable-event:v1";

function readProactiveDismissedKey(scopeKey) {
  try {
    if (typeof window === "undefined" || !scopeKey) return "";
    return String(window.localStorage.getItem(`${PROACTIVE_DISMISSED_KEY}:${scopeKey}`) || "");
  } catch {
    return "";
  }
}

function writeProactiveDismissedKey(scopeKey, eventKey) {
  try {
    if (typeof window === "undefined" || !scopeKey) return;
    if (eventKey) window.localStorage.setItem(`${PROACTIVE_DISMISSED_KEY}:${scopeKey}`, eventKey);
    else window.localStorage.removeItem(`${PROACTIVE_DISMISSED_KEY}:${scopeKey}`);
  } catch { /* no-op: local preference is best effort */ }
}

function normalizeLauncherPlacement(value) {
  if (!value || Number(value.version) !== LAUNCHER_PLACEMENT_VERSION) return null;
  const side = value.side === "left" ? "left" : value.side === "right" ? "right" : "";
  if (!side) return null;
  const topRatio = Number(value.topRatio);
  if (!Number.isFinite(topRatio)) return null;
  return { version: LAUNCHER_PLACEMENT_VERSION, side, topRatio: Math.min(1, Math.max(0, topRatio)) };
}

function readLauncherPlacement() {
  try {
    if (typeof window === "undefined") return null;
    return normalizeLauncherPlacement(JSON.parse(window.localStorage.getItem(LAUNCHER_PLACEMENT_KEY) || "null"));
  } catch {
    return null;
  }
}

function writeLauncherPlacement(value) {
  try {
    if (typeof window === "undefined") return;
    if (!value) window.localStorage.removeItem(LAUNCHER_PLACEMENT_KEY);
    else window.localStorage.setItem(LAUNCHER_PLACEMENT_KEY, JSON.stringify(value));
  } catch { /* no-op: local preference is best effort */ }
}

function launcherInsets(width) {
  return width <= 720 ? { top: 14, bottom: 24, side: 14 } : { top: 18, bottom: 18, side: 18 };
}

function placementKey(value) {
  return value ? `${value.side}:${Number(value.topRatio).toFixed(4)}` : "";
}

function rectIntersects(a, b) {
  return Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
}

function launcherProtectedRects() {
  if (typeof document === "undefined") return [];
  return [...document.querySelectorAll(
    '[data-primary-cta="true"], [role="alert"], [role="status"], [role="dialog"], #shell-nav-dock, .shellTop, .tabletQuickGrid button, .roleSignalAction, .roleTaskSummaryCard--next .btn, .shellTopLogout, [data-details="task-workspace"] > summary, [data-details="task-workspace"][open] .roleTaskDetailsBody, [data-map-surface="primary"] [data-map-current-state="true"], [data-map-surface="primary"] [data-map-legacy-state="true"], [data-map-surface="primary"] .mapOperationsDisclosure, [data-map-surface="primary"] .mapViewRouteNotice, [data-map-surface="primary"] .mapViewFooter, [data-map-surface="primary"] .leaflet-marker-icon, [data-map-surface="primary"] .leaflet-control, .roomCommercialWorkspaceFull button, .roomCommercialWorkspaceFull a, .roomCommercialWorkspaceFull input, .roomCommercialWorkspaceFull select, .roomCommercialWorkspaceFull summary, [data-testid="room-monthly-price-reference-primary-summary"], [data-testid="room-platform-price-reference-card"], [data-testid="room-service-cost-missing"] > summary, [data-testid="room-service-cost-missing-item"] button, [data-testid="room-service-cost-breakdown"] > summary, [data-testid="room-service-cost-advanced"] > summary, [data-testid="room-cost-source-toggle"], [data-testid^="room-cost-allocation-form-"] button, [data-testid^="room-cost-allocation-form-"] input, [data-testid^="room-cost-allocation-form-"] select, [data-testid^="room-cost-allocation-form-"] textarea',
  )].filter((element) => !(element.id === "shell-nav-dock" && window.innerWidth <= 720 && element.classList.contains("navDock--mobileClosed"))).map((element) => element.getBoundingClientRect()).filter((box) => box.width > 0 && box.height > 0);
}

function loadDrawerState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {}; } catch { return {}; }
}
function saveDrawerState(next) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* no-op: storage may be unavailable */ } }
function loadHistory(scopeKey = "") {
  try {
    const key = scopeKey ? `${HISTORY_KEY}:${scopeKey}` : HISTORY_KEY;
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { /* no-op: history may be unreadable */ return []; }
}

function loadHydratedMessages(scopeKey = "") {
  const history = loadHistory(scopeKey);
  const shared = readCopilotSharedState(scopeKey);
  const sharedMessages = Array.isArray(shared?.messages) ? shared.messages.slice(-20) : [];
  try {
    const hash = String(window.location?.hash || "").replace(/^#/, "");
    if (/\/copilot$/.test(hash.split("?", 1)[0])) {
      const handoff = JSON.parse(window.localStorage.getItem(FULL_WORKSPACE_HANDOFF_KEY) || "null");
      if (handoff?.scopeKey === scopeKey && Array.isArray(handoff.messages) && handoff.messages.length) {
        return handoff.messages.slice(-20);
      }
    }
  } catch { /* best effort: shared state remains the fallback */ }
  return sharedMessages.length >= history.length ? sharedMessages : history;
}

function normalizeScopePath(path) {
  return String(path || "").split("?")[0];
}

function normalizeDrawerSize(size) {
  return size === "S" || size === "M" ? size : DEFAULT_DRAWER_SIZE;
}

function normalizeCustomDrawerSize(value) {
  if (!value || typeof value !== "object") return null;
  const width = Number(value.width);
  const height = Number(value.height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  // A stale pre-corrective preference must never collapse the chat viewport
  // under the composer. Keep persisted values inside the same desktop bounds
  // used by the live four-corner resize path.
  return {
    width: Math.min(720, Math.max(400, Math.round(width))),
    height: Math.min(860, Math.max(500, Math.round(height))),
  };
}

function normalizeDrawerPlacement(value) {
  if (!value || Number(value.version) !== 1) return null;
  const left = Number(value.left);
  const top = Number(value.top);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  return { version: 1, left, top };
}

function normalizeMobileDrawerFrame(value) {
  if (!value || Number(value.version) !== 1) return null;
  const left = Number(value.left);
  const top = Number(value.top);
  const width = Number(value.width);
  const height = Number(value.height);
  if (![left, top, width, height].every(Number.isFinite)) return null;
  return {
    version: 1,
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function resolveSafeDrawerPlacement(left, top, width, height) {
  const viewportWidth = typeof window === "undefined" ? width + 36 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? height + 36 : window.innerHeight;
  const inset = viewportWidth <= 720 ? 12 : 18;
  const maxLeft = Math.max(inset, viewportWidth - width - inset);
  const maxTop = Math.max(inset, viewportHeight - height - inset);
  const clamp = (x, min, max) => Math.min(max, Math.max(min, x));
  const obstacles = launcherProtectedRects();
  const topObstacleBottom = obstacles.reduce((bottom, obstacle) => (
    obstacle.top <= inset + 4 && obstacle.height <= viewportHeight && obstacle.right > 0 && obstacle.left < viewportWidth
      ? Math.max(bottom, obstacle.bottom)
      : bottom
  ), inset);
  const belowTopObstacles = clamp(Math.ceil(topObstacleBottom + 12), inset, maxTop);
  const centerLeft = Math.round((viewportWidth - width) / 2);
  const centerTop = Math.round((viewportHeight - height) / 2);
  // Keep the user's preferred position first, then search independent
  // horizontal/vertical lanes.  Async task cards can occupy the right rail,
  // so a centered lane is intentionally part of the safe-placement grid.
  const horizontalLanes = [...new Set([left, maxLeft, inset, centerLeft])];
  const shellNavRight = typeof document === "undefined" ? 0 : document.querySelector("#shell-nav-dock")?.getBoundingClientRect?.().right || 0;
  const contentLaneLeft = clamp(Math.ceil(shellNavRight + 18), inset, maxLeft);
  if (!horizontalLanes.includes(contentLaneLeft)) horizontalLanes.push(contentLaneLeft);
  const verticalLanes = [...new Set([top, belowTopObstacles, maxTop, Math.max(inset, maxTop - 60), inset, centerTop])];
  const candidates = horizontalLanes.flatMap((candidateLeft) => verticalLanes.map((candidateTop) => [candidateLeft, candidateTop]));
  const safe = candidates.find(([candidateLeft, candidateTop]) => {
    const box = { left: candidateLeft, top: candidateTop, right: candidateLeft + width, bottom: candidateTop + height };
    return box.left >= inset && box.top >= inset && box.right <= viewportWidth - inset && box.bottom <= viewportHeight - inset && !obstacles.some((obstacle) => rectIntersects(box, obstacle));
  }) || [clamp(Number.isFinite(left) ? left : maxLeft, inset, maxLeft), clamp(Number.isFinite(top) ? top : maxTop, inset, maxTop)];
  return { version: 1, left: Math.round(clamp(safe[0], inset, maxLeft)), top: Math.round(clamp(safe[1], inset, maxTop)) };
}

function scopeFamily(path) {
  return normalizeScopePath(path).split("/").filter(Boolean)[0] || "";
}

function selectionApplies(selection, path) {
  if (!selection) return false;
  const scope = normalizeScopePath(selection.scopeKey || "");
  const current = normalizeScopePath(path);
  if (!scope || scope === current) return true;
  const sameFamily = scopeFamily(scope) && scopeFamily(scope) === scopeFamily(current);
  if (!sameFamily) return false;
  if (/\/copilot$/.test(current)) return true;
  // A record selection belongs to the exact screen that produced it. The
  // shared family is only a valid fallback on the dedicated copilot route;
  // carrying /room/offers into /room/shifts would make the assistant answer
  // from a stale selected-record context.
  return false;
}

function selectionContextIsEnriched(previousKey, nextKey) {
  const previous = String(previousKey || "").split("|");
  const next = String(nextKey || "").split("|");
  if (previous.length < 5 || next.length < 5) return false;
  const sameScopeAndType = previous[0] === next[0] && previous[1] === next[1];
  const previousHasId = Boolean(previous[2] || previous[4]);
  const nextHasId = Boolean(next[2] || next[4]);
  return sameScopeAndType && !previousHasId && nextHasId;
}

function buildSuggestions(path, selection, screenContext, me) {
  const financeSuggestionLimit = normalizeScopePath(path) === "/room/financial-operations" ? 4 : 3;
  return buildCopilotStarterChips({
    screenPath: path,
    selection,
    screenContext,
    role: me?.role || "",
    companyKind: me?.companyKind || "",
  }).slice(0, financeSuggestionLimit);
}

function buildPrompt({ rawText, screenContext }) {
  const q = String(rawText || "").trim();
  if (q) return q;
  return `Bu ekranı kısaca özetle ve güvenli sonraki adımı söyle: ${screenContext.label} (${screenContext.path}).`;
}

function readLiveWorkflowState() {
  if (typeof document === "undefined") return null;
  const node = document.querySelector('[data-copilot-workflow-id]');
  if (!node) return null;
  const workflowId = String(node.getAttribute('data-copilot-workflow-id') || '').trim();
  const activeStepOrdinal = Number(node.getAttribute('data-copilot-workflow-step') || 0) || null;
  if (!workflowId || !activeStepOrdinal) return null;
  return {
    workflowId,
    activeStepOrdinal,
    completedThroughOrdinal: Number(node.getAttribute('data-copilot-workflow-completed-through') || 0) || null,
    currentTargetKey: String(node.getAttribute('data-copilot-workflow-target-key') || '').trim(),
    currentTargetLabel: String(node.getAttribute('data-copilot-workflow-target-label') || '').trim(),
    source: 'LIVE_UI',
  };
}

function selectionSummaryForDisplay(selection) {
  const label = String(selection?.label || '').trim();
  const summary = String(selection?.summary || '').trim();
  if (!summary || !label || summary === label) return summary;
  const prefix = `${label} • `;
  if (summary.startsWith(prefix)) return summary.slice(prefix.length);
  const sentencePrefix = `${label}. `;
  if (summary.startsWith(sentencePrefix)) return summary.slice(sentencePrefix.length);
  if (summary.startsWith(label)) return summary.slice(label.length).replace(/^[\s.•]+/, "").trim();
  const viewMarker = summary.indexOf("Görünüm:");
  if (viewMarker >= 0) return summary.slice(viewMarker).trim();
  return summary;
}

function selectionNeedsApproval(selection) {
  return /onay(?:ınız|ı|ı gerekiyor| bekliyor)|approval_required/i.test(String(selection?.selectedRecordStatus || ""));
}

function selectionNeedsAttention(selection) {
  return /(çevrim dışı|güncel değil|sinyali bekleniyor|sinyali zayıf|görünürlük riski|kontrol bekliyor)/i.test(String(selection?.selectedRecordStatus || ""));
}

const SCREEN_GUIDE_JOB_TYPES = new Set(["SCREEN_MENU_GUIDE", "BUTTON_ACTION_GUIDE", "ROLE_HELP_GUIDE"]);

function attentionBubbleCopy(selection, hasRequestError) {
  if (hasRequestError) return "Yanıt alınamadı. Birlikte tekrar deneyelim.";
  const status = String(selection?.selectedRecordStatus || "");
  if (/çevrim dışı/i.test(status)) return "Konum sinyali çevrim dışı. Birlikte bakalım.";
  if (/güncel değil|bekleniyor|zayıf/i.test(status)) return "Konum bilgisi güncel görünmüyor. Birlikte bakalım.";
  return "Bu kayıtta dikkat edilmesi gereken bir durum var. Birlikte bakalım.";
}

function actionText(action) {
  const kind = guideActionKind(action);
  if (kind === "OPEN_GUIDE") return humanizeUserFacingText(action?.label, "Rehberi aç");
  if (kind === "ASK") return humanizeUserFacingText(action?.label, "Sor");
  if (kind === "COPY_TEXT") return humanizeUserFacingText(action?.label, "Kopyala");
  return humanizeUserFacingText(action?.label, "İlgili yere git");
}

// Guide metadata is the canonical action contract. Older or transformed
// payloads may lose actionKind while retaining the typed guide job; never
// turn that structured guide into a free-text clarification request.
function guideActionKind(action) {
  const explicitKind = String(action?.actionKind || "").trim().toUpperCase();
  const guideJobType = String(action?.guide?.jobType || action?.jobType || "").trim();
  if (guideJobType && explicitKind !== "COPY_TEXT") return "OPEN_GUIDE";
  return explicitKind || "OPEN_ROUTE";
}

function withRouteParams(path, params) {
  const base = String(path || "");
  const rows = Object.entries(params || {}).filter(([, v]) => v != null && `${v}` !== "");
  if (!rows.length) return base;
  const query = rows.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  return `${base}${base.includes("?") ? "&" : "?"}${query}`;
}

function resolveGuideRoute(me, routeKey) {
  const role = String(me?.role || "");
  const key = String(routeKey || "");
  if (!key) return "";
  if (key.startsWith("/")) {
    if (role === "COMPANY") return normalizeCompanyPath(me, key);
    return key;
  }
  if (role === "ROOM") {
    if (key === "ROOM_OFFERS") return "/room/offers";
    if (key === "ROOM_SHIFTS") return "/room/shifts";
    if (key === "ROOM_VEHICLES") return "/room/vehicles";
    if (key === "ROOM_DRIVERS") return "/room/drivers";
    if (key === "ROOM_AGREEMENTS") return "/room/agreements";
    if (key === "ROOM_MAP") return "/room/map";
    if (key === "ROOM_OPERATION_HEALTH") return "/room/operation-health";
    if (key === "ROOM_COPILOT") return "/room/copilot";
  }
  if (role === "COMPANY") {
    if (key === "COMPANY_PLAN" || key === "COMPANY_WORKFLOW") return companyPath(me, "");
    if (key === "COMPANY_SHIFTS") return companyPath(me, "/shifts");
    if (key === "COMPANY_AGREEMENTS") return companyPath(me, "/agreements");
    if (key === "COMPANY_COPILOT") return companyPath(me, "/copilot");
    if (key === "COMPANY_GEOREVIEW") return companyPath(me, "/georeview");
    if (key === "COMPANY_MAP") return companyPath(me, "/map");
    if (key === "COMPANY_SERVICE_EVALUATION") return companyPath(me, "/service-evaluation");
    if (key === "COMPANY_COMMERCIAL_FLOW") return companyPath(me, "/commercial-flow");
    if (key === "COMPANY_REPORTS") return companyPath(me, "/reports");
    if (key === "COMPANY_HUB") return companyPath(me, "/hub");
    if (key === "COMPANY_CHECKIN") return companyPath(me, "/checkin");
  }
  if (role === "DRIVER") {
    if (key === "DRIVER_TODAY") return "/driver/today";
    if (key === "DRIVER_ROUTE") return "/driver/route";
    if (key === "DRIVER_MAP") return "/driver/map";
    if (key === "DRIVER_COPILOT") return "/driver/copilot";
  }
  if (role === "SUPER_ADMIN") {
    if (key === "SUPERADMIN_OVERVIEW") return "/superadmin";
    if (key === "SUPERADMIN_COPILOT") return "/superadmin/copilot";
    if (key === "SUPERADMIN_ONBOARDING_REVIEW") return "/superadmin/onboarding-review";
  }
  return "";
}

function fullWorkspacePath(me) {
  const role = String(me?.role || "").toUpperCase();
  if (role === "ROOM") return "/room/copilot";
  if (role === "COMPANY") return `${companyPath(me, "")}/copilot`;
  if (role === "DRIVER") return "/driver/copilot";
  if (role === "PERSONEL") return "/personel/copilot";
  if (role === "PARENT") return "/parent/copilot";
  if (role === "SCHOOL") return "/school/copilot";
  if (role === "ORGANIZATION") return "/organization/copilot";
  return "/superadmin/copilot";
}

function samePrompt(a, b) {
  return String(a || "").trim().toLocaleLowerCase("tr-TR") === String(b || "").trim().toLocaleLowerCase("tr-TR");
}

function pickPreferredSpeechVoice(synth, lang = "tr-TR") {
  try {
    const voices = typeof synth?.getVoices === "function" ? synth.getVoices() : [];
    if (!Array.isArray(voices) || !voices.length) return null;
    const normalizedLang = String(lang || "").toLocaleLowerCase("tr-TR");
    const scored = voices
      .map((voice) => {
        const name = String(voice?.name || "").toLocaleLowerCase("tr-TR");
        const voiceLang = String(voice?.lang || "").toLocaleLowerCase("tr-TR");
        let score = 0;
        if (voiceLang.startsWith("tr")) score += 100;
        if (voiceLang === normalizedLang) score += 25;
        if (/erkek|male|bariton|deep|low|tok|tenor/u.test(name)) score += 12;
        if (/tr|turk|türk/u.test(name)) score += 8;
        return { voice, score };
      })
      .sort((a, b) => b.score - a.score || String(a.voice?.name || "").localeCompare(String(b.voice?.name || ""), "tr"));
    return scored[0]?.voice || null;
  } catch {
    return null;
  }
}

function filterMessageActions(actions, suggestions, followUpPrompt, me) {
  const rows = Array.isArray(actions) ? actions : [];
  const visible = [];
  for (const action of rows) {
    const kind = guideActionKind(action);
    if (kind === "ASK") {
      const askText = String(action?.askText || action?.label || "").trim();
      if (!askText) continue;
      if (Array.isArray(suggestions) && suggestions.some((chip) => samePrompt(chip, askText))) continue;
      if (followUpPrompt && samePrompt(followUpPrompt, askText)) continue;
    } else if (kind === "COPY_TEXT") {
      const copyText = String(action?.copyText || "").trim();
      if (!copyText) continue;
    } else if (kind === "CLEAR_FILTER") {
      if (!String(action?.targetKey || "").trim()) continue;
    } else if (kind === "OPEN_ROUTE") {
      const rawPath = action?.path || action?.href || resolveGuideRoute(me, action?.routeKey || "");
      if (!String(rawPath || "").trim()) continue;
    }
    const key = `${kind}|${action?.label || ""}|${action?.routeKey || action?.href || action?.path || ""}|${action?.askText || ""}|${action?.guide?.jobType || ""}`;
    if (visible.some((x) => x.__k === key)) continue;
    visible.push({ ...action, __k: key });
  }
  return visible.slice(0, 2).map((item) => {
    const rest = { ...item };
    delete rest.__k;
    return rest;
  });
}

function hasSameMessageTranscript(incomingMessages, currentMessages) {
  const incoming = Array.isArray(incomingMessages) ? incomingMessages : [];
  const current = Array.isArray(currentMessages) ? currentMessages : [];
  const localTail = current.slice(-incoming.length);
  return incoming.length === localTail.length && incoming.every((message, index) => (
    String(message?.role || '') === String(localTail[index]?.role || '')
    && String(message?.text || '') === String(localTail[index]?.text || '')
    && Boolean(message?.system) === Boolean(localTail[index]?.system)
  ));
}

export default function FloatingCopilotDrawer({ path: propPath = "", routeContext: propagatedRouteContext = null }) {
  const { token, me } = useSession();
  const inheritedRouteContext = useCopilotRouteContext();
  const routeContext = propagatedRouteContext || inheritedRouteContext;
  const authScopeKey = copilotAuthScopeKey(token, me);
  const currentPath = String(routeContext?.path || propPath || getPath() || "");
  const initial = useRef(loadDrawerState()).current || {};
  const [open, setOpen] = useState(Boolean(initial.open));
  const [size] = useState(normalizeDrawerSize(initial.size));
  const [customDrawerSize, setCustomDrawerSize] = useState(() => normalizeCustomDrawerSize(initial.customDrawerSize));
  const [drawerMaximized, setDrawerMaximized] = useState(Boolean(initial.maximized));
  const [drawerPlacement, setDrawerPlacement] = useState(() => normalizeDrawerPlacement(initial.drawerPlacement));
  const [mobileDrawerFrame, setMobileDrawerFrame] = useState(() => normalizeMobileDrawerFrame(initial.mobileDrawerFrame));
  const [drawerDragPreview, setDrawerDragPreview] = useState(null);
  const [drawerResizePreview, setDrawerResizePreview] = useState(null);
  // Suggestions stay available in every viewport, but remain a compact
  // disclosure until the user asks for them. This keeps the guided answer
  // and real target visible on desktop as well as mobile.
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadHydratedMessages(authScopeKey));
  // The transcript is not the canonical task state. Preserve the verified
  // server envelope so cost-draft field updates and Devam/Geri/recovery turns
  // keep their previous authorized context.
  const [conversationState, setConversationState] = useState(() => readCopilotSharedState(authScopeKey)?.conversationState || null);
  const [text, setText] = useState(() => String(readCopilotSharedState(authScopeKey)?.draft || ""));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [guidedRecoveryMessage, setGuidedRecoveryMessage] = useState("");
  const [guidedTargetActive, setGuidedTargetActive] = useState(false);
  const [readingIndex, setReadingIndex] = useState(-1);
  const [inputFocused, setInputFocused] = useState(false);
  const [launcherInteraction, setLauncherInteraction] = useState("idle");
  const [launcherPlacement, setLauncherPlacement] = useState(() => readLauncherPlacement());
  const [dragPreview, setDragPreview] = useState(null);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 720 : window.innerHeight,
  }));
  const suggestionPanelId = useId();
  const chatSurfaceId = useId();
  const wasCompactViewportRef = useRef(typeof window !== "undefined" && window.innerWidth <= 720);
  const [panelSide, setPanelSide] = useState("right");
  // Presentation-only phase derived from the existing request lifecycle; shared context remains the sole state owner.
  const [responsePhase, setResponsePhase] = useState("idle");
  const [attentionBubbleVisible, setAttentionBubbleVisible] = useState(false);
  const [actionableEventsSnapshot, setActionableEventsSnapshot] = useState(null);
  const [proactiveDismissedKey, setProactiveDismissedKey] = useState(() => readProactiveDismissedKey(authScopeKey));
  const [mobileDrawerPlacement, setMobileDrawerPlacement] = useState("bottom");
  const [mobileDrawerMaxHeight, setMobileDrawerMaxHeight] = useState(null);
  const selectionContextKeyRef = useRef("");
  const committedSelectionContextKeyRef = useRef("");
  const [selection, setSelection] = useState(() => {
    const initialScreenContext = resolveCopilotScreenContext(currentPath, me);
    const initialSelection = readCopilotSelection();
    const nextSelection = canUseRouteBoundCopilotContext(routeContext, initialScreenContext) && selectionApplies(initialSelection, currentPath) ? initialSelection : null;
    selectionContextKeyRef.current = copilotSelectionContextKey(nextSelection);
    committedSelectionContextKeyRef.current = selectionContextKeyRef.current;
    return nextSelection;
  });
  const scrollRef = useRef(null);
  const chatAtBottomRef = useRef(true);
  const forceScrollToLatestRef = useRef(false);
  const chatScrollbarTrackRef = useRef(null);
  const chatScrollbarDragRef = useRef(null);
  const [chatScrollMetrics, setChatScrollMetrics] = useState({ scrollTop: 0, scrollHeight: 0, clientHeight: 0 });
  const mascotRef = useRef(null);
  const mapAnchorRef = useRef("");
  const dragRef = useRef(null);
  const drawerResizeRef = useRef(null);
  const drawerResizeCleanupRef = useRef(null);
  const drawerResizeHandleRef = useRef(null);
  const composerTextareaRef = useRef(null);
  const drawerDragRef = useRef(null);
  const drawerDragCleanupRef = useRef(null);
  const drawerHeaderRef = useRef(null);
  const suppressLauncherClickRef = useRef(false);
  const restoringMapSafeTopRef = useRef(false);
  const responseTimerRef = useRef(null);
  const attentionBubbleTimerRef = useRef(null);
  const suggestionsCloseTimerRef = useRef(null);
  const suggestionsOpenTimerRef = useRef(null);
  const attentionBubbleKeyRef = useRef("");
  const authScopeRef = useRef(authScopeKey);
  const skipPersistenceRef = useRef(false);
  const requestSequenceRef = useRef(0);
  const activeRequestRef = useRef(null);
  const isMapSurface = /\/map$/.test(currentPath);
  const isFinanceSurface = normalizeScopePath(currentPath) === "/room/financial-operations";
  const isRoleTaskHome = /^\/(company|room|school|organization|driver|personel|parent|superadmin)(?:\/live)?$/.test(currentPath);
  // Task homes use a reserved right rail and the canonical bottom-right anchor.
  // Only map canvases need obstacle-aware placement; keeping this distinction
  // prevents task-home scroll/layout changes from moving the launcher between
  // screen anchors.
  const isSmartPlacementSurface = isMapSurface;
  // Compact task-home layouts have no safe overlay slot above the primary
  // action; keep the attention state on the launcher and reserve the bubble
  // for surfaces where it can be shown without covering task content.
  const suppressCompactTaskHomeBubble = isRoleTaskHome && viewportSize.width <= 720;
  const suppressCompactMapBubble = isMapSurface && viewportSize.width <= 720;
  const [mapSafePosition, setMapSafePosition] = useState(null);
  const lastPathRef = useRef(currentPath);
  const screenContext = useMemo(() => resolveCopilotScreenContext(currentPath, me), [currentPath, me]);
  const canUseRouteBoundContext = canUseRouteBoundCopilotContext(routeContext, screenContext);
  const currentRouteContextKey = routeContextKey(routeContext);
  const routeContextRef = useRef(routeContext);
  routeContextRef.current = routeContext;
  const suggestions = useMemo(() => buildSuggestions(currentPath, selection, screenContext, me), [currentPath, selection, screenContext, me]);
  const isCopilotPage = /\/copilot$/.test(currentPath);
  const dims = SIZE_PRESETS[size] || SIZE_PRESETS.M;
  const compactDesktopDrawer = viewportSize.width > 720 && viewportSize.height <= 760;
  const tabletDesktopDrawer = viewportSize.width > 720 && viewportSize.width <= 1180;
  const financeDesktopDrawer = isFinanceSurface && viewportSize.width > 720;
  const requestedDrawerDims = customDrawerSize || dims;
  // A desktop custom size must not leak into the tablet layout. Without this
  // shared cap, a position saved on a wide screen can leave the right side of
  // the drawer (including the header controls) outside a 768–1180px viewport
  // on offers, agreements, or any other route.
  const drawerDims = tabletDesktopDrawer
    ? {
      ...requestedDrawerDims,
      width: Math.min(requestedDrawerDims.width, 420),
      height: Math.min(requestedDrawerDims.height, Math.max(360, Math.min(500, viewportSize.height - 36))),
    }
    : compactDesktopDrawer
    ? { ...requestedDrawerDims, height: Math.min(requestedDrawerDims.height, Math.max(420, viewportSize.height - 120)) }
    : financeDesktopDrawer
      ? { ...requestedDrawerDims, height: Math.min(requestedDrawerDims.height, Math.max(320, viewportSize.height - 540)) }
    : requestedDrawerDims;
  const [activeOverlayLayer, setActiveOverlayLayer] = useState(() => readPlanCenterOverlayLayer() || "guide");
  const contextCue = useMemo(() => resolveSeferAbiContextCue({ path: currentPath, selection }), [currentPath, selection]);
  const proactiveBubble = useMemo(() => resolveProactiveBubble({
    events: isRoleTaskHome ? actionableEventsSnapshot?.events : [],
    dismissedKey: proactiveDismissedKey,
  }), [actionableEventsSnapshot, isRoleTaskHome, proactiveDismissedKey]);
  const drawerAvatarState = resolveSeferAbiWidgetState({
    busy,
    listening: inputFocused,
    error: Boolean(err) || selectionNeedsAttention(selection) || contextCue?.tone === "warning" || Boolean(proactiveBubble),
    approvalRequired: selectionNeedsApproval(selection),
    responding: responsePhase === "responding",
    resultReady: responsePhase === "result-ready" || contextCue?.kind === "success",
    interaction: launcherInteraction,
  });
  const drawerAvatarStateLabel = SEFER_ABI_WIDGET_STATE_LABELS[drawerAvatarState] || "Hazır";

  useEffect(() => {
    setProactiveDismissedKey(readProactiveDismissedKey(authScopeKey));
  }, [authScopeKey]);

  useEffect(() => {
    setActionableEventsSnapshot(null);
    if (!token || !isRoleTaskHome) return undefined;

    let active = true;
    let hydrated = false;
    const unsubscribe = subscribeActionableEventsSnapshot((snapshot) => {
      if (active && hydrated) setActionableEventsSnapshot(snapshot);
    });
    loadActionableEventsBundle({ token, force: false }).then((snapshot) => {
      if (!active) return;
      hydrated = true;
      setActionableEventsSnapshot(snapshot);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [isRoleTaskHome, token]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const updateViewport = () => {
      const next = { width: window.innerWidth, height: window.innerHeight };
      setViewportSize((previous) => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (viewportSize.width <= 720 && drawerMaximized) setDrawerMaximized(false);
  }, [drawerMaximized, viewportSize.width]);

  useEffect(() => {
    const syncGuidedRecovery = (next) => {
      const status = String(next?.status || "");
      setGuidedTargetActive(status === "FOUND");
      setGuidedRecoveryMessage(status && status !== "FOUND" && status !== "CLEARED"
        ? "Bu hedef artık doğrulanamıyor; ekrandaki güncel durumu birlikte kontrol edelim."
        : "");
    };
    syncGuidedRecovery(getGuidedTarget());
    return subscribeGuidedTarget(syncGuidedRecovery);
  }, []);

  const updateChatScrollMetrics = useCallback(() => {
    const chat = scrollRef.current;
    if (!chat) {
      setChatScrollMetrics({ scrollTop: 0, scrollHeight: 0, clientHeight: 0 });
      return;
    }
    setChatScrollMetrics({ scrollTop: chat.scrollTop, scrollHeight: chat.scrollHeight, clientHeight: chat.clientHeight });
  }, []);

  const resizeComposerInput = useCallback((node) => {
    if (!node) return;
    node.style.height = "auto";
    const compact = viewportSize.width <= 720;
    const minHeight = compact ? 48 : 84;
    const maxHeight = compact ? 120 : 180;
    const contentHeight = String(node.value || "").trim() ? node.scrollHeight : minHeight;
    const nextHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);
    node.style.height = `${nextHeight}px`;
    node.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
    if (compact && chatAtBottomRef.current && typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        if (chatAtBottomRef.current && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      });
    }
  }, [viewportSize.width]);

  useEffect(() => {
    resizeComposerInput(composerTextareaRef.current);
  }, [resizeComposerInput, text]);

  useEffect(() => {
    if (!open) return undefined;
    const chat = scrollRef.current;
    if (!chat) return undefined;
    const updateChatPosition = () => {
      chatAtBottomRef.current = chat.scrollHeight - chat.scrollTop - chat.clientHeight <= 24;
      updateChatScrollMetrics();
    };
    updateChatPosition();
    chat.addEventListener("scroll", updateChatPosition, { passive: true });
    return () => chat.removeEventListener("scroll", updateChatPosition);
  }, [open, updateChatScrollMetrics]);

  useEffect(() => {
    if (!open) return undefined;
    updateChatScrollMetrics();
    const chat = scrollRef.current;
    if (!chat) return undefined;
    const update = () => updateChatScrollMetrics();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(chat);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [drawerMaximized, messages.length, open, suggestionsOpen, updateChatScrollMetrics, viewportSize.width]);

  // Opening or closing the suggestions disclosure changes the chat viewport
  // height. Re-anchor the real conversation scroll after that layout change
  // so the newest user/assistant exchange cannot remain hidden behind the
  // disclosure or the fixed composer.
  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;
    let secondFrame = null;
    const anchorLatestExchange = () => {
      const chat = scrollRef.current;
      if (!chat) return;
      const forceLatest = forceScrollToLatestRef.current;
      if (!forceLatest && !chatAtBottomRef.current) return;
      chat.scrollTop = chat.scrollHeight;
      forceScrollToLatestRef.current = false;
      if (!suggestionsOpen) return;
      const chatRect = chat.getBoundingClientRect?.();
      const newestUser = [...chat.querySelectorAll(".copilotMsg.user")].at(-1);
      if (!chatRect || !newestUser) return;
      const userRect = newestUser.getBoundingClientRect?.();
      if (userRect && userRect.top < chatRect.top) {
        chat.scrollTop = Math.max(0, chat.scrollTop - (chatRect.top - userRect.top));
      }
    };
    const frame = window.requestAnimationFrame(() => {
      anchorLatestExchange();
      secondFrame = window.requestAnimationFrame(anchorLatestExchange);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame);
    };
  }, [messages.length, open, suggestionsOpen]);

  useEffect(() => {
    const compact = viewportSize.width <= 720;
    if (compact !== wasCompactViewportRef.current) {
      // Preserve an intentionally opened accordion while the viewport is
      // stable, but choose the useful default when crossing a breakpoint.
      setSuggestionsOpen(false);
      wasCompactViewportRef.current = compact;
    }
  }, [viewportSize.width]);

  // The mobile disclosure is intentionally transient around user context
  // changes. Keep the composer available, and never leave an old route's
  // suggestions attached to a new screen or selected record.
  useEffect(() => {
    setSuggestionsOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (!suggestionsOpen || typeof document === "undefined") return undefined;

    const closeSuggestions = () => setSuggestionsOpen(false);
    const closeWhenOutside = (event) => {
      if (!event.target?.closest?.(".copilotContextSuggestions")) closeSuggestions();
    };
    const closeWhenTyping = (event) => {
      if (event.target?.closest?.("textarea, input, select")) closeSuggestions();
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeSuggestions();
    };

    document.addEventListener("pointerdown", closeWhenOutside, true);
    document.addEventListener("focusin", closeWhenTyping, true);
    document.addEventListener("keydown", closeOnEscape, true);

    const visualViewport = window.visualViewport;
    const initialViewportHeight = visualViewport?.height || window.innerHeight;
    const closeWhenKeyboardOpens = () => {
      if (visualViewport && visualViewport.height < initialViewportHeight - 80) closeSuggestions();
    };
    visualViewport?.addEventListener("resize", closeWhenKeyboardOpens);

    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside, true);
      document.removeEventListener("focusin", closeWhenTyping, true);
      document.removeEventListener("keydown", closeOnEscape, true);
      visualViewport?.removeEventListener("resize", closeWhenKeyboardOpens);
    };
  }, [suggestionsOpen]);

  useEffect(() => () => {
    if (suggestionsCloseTimerRef.current) window.clearTimeout(suggestionsCloseTimerRef.current);
    if (suggestionsOpenTimerRef.current) window.clearTimeout(suggestionsOpenTimerRef.current);
  }, []);

  function openSuggestionsForDesktopInteraction() {
    if (viewportSize.width <= 720) return;
    if (suggestionsCloseTimerRef.current) window.clearTimeout(suggestionsCloseTimerRef.current);
    if (suggestionsOpenTimerRef.current) window.clearTimeout(suggestionsOpenTimerRef.current);
    suggestionsOpenTimerRef.current = window.setTimeout(() => {
      suggestionsOpenTimerRef.current = null;
      setSuggestionsOpen(true);
    }, 140);
  }

  function scheduleSuggestionsClose() {
    if (viewportSize.width <= 720) return;
    if (suggestionsOpenTimerRef.current) {
      window.clearTimeout(suggestionsOpenTimerRef.current);
      suggestionsOpenTimerRef.current = null;
    }
    if (suggestionsCloseTimerRef.current) window.clearTimeout(suggestionsCloseTimerRef.current);
    suggestionsCloseTimerRef.current = window.setTimeout(() => {
      suggestionsCloseTimerRef.current = null;
      setSuggestionsOpen(false);
    }, 180);
  }

  useEffect(() => {
    if (typeof window === "undefined" || !drawerPlacement || viewportSize.width <= 720) return;
    const width = Math.min(drawerDims.width, Math.max(320, window.innerWidth - 36));
    const height = Math.min(drawerDims.height, Math.max(360, window.innerHeight - 36));
    const safe = resolveSafeDrawerPlacement(drawerPlacement.left, drawerPlacement.top, width, height);
    if (safe.left === drawerPlacement.left && safe.top === drawerPlacement.top) return;
    setDrawerPlacement(safe);
  }, [drawerDims.height, drawerDims.width, drawerPlacement, viewportSize.height, viewportSize.width]);

  const clearResponseTimer = useCallback(() => {
    if (responseTimerRef.current && typeof window !== "undefined") window.clearTimeout(responseTimerRef.current);
    responseTimerRef.current = null;
  }, []);

  const resetResponsePhase = useCallback(() => {
    clearResponseTimer();
    setResponsePhase("idle");
  }, [clearResponseTimer]);

  const markResponseReady = useCallback(() => {
    clearResponseTimer();
    setResponsePhase("responding");
    if (typeof window !== "undefined") {
      responseTimerRef.current = window.setTimeout(() => {
        setResponsePhase("result-ready");
        responseTimerRef.current = window.setTimeout(() => {
          responseTimerRef.current = null;
          setResponsePhase("idle");
        }, RESULT_READY_DISPLAY_MS);
      }, 900);
    }
  }, [clearResponseTimer]);

  useEffect(() => {
    if (authScopeRef.current === authScopeKey) return;
    activeRequestRef.current?.abort?.();
    activeRequestRef.current = null;
    requestSequenceRef.current += 1;
    authScopeRef.current = authScopeKey;
    skipPersistenceRef.current = true;
    const scopedMessages = loadHistory(authScopeKey);
    const scopedState = readCopilotSharedState(authScopeKey);
    // A dedicated full-screen Copilot route is a separate panel instance. It
    // writes the bounded transcript to shared state before returning to the
    // source screen, while the drawer's older local history may still be
    // empty. Prefer the durable same-scope handoff in that case so a return
    // does not silently discard the conversation the user just continued.
    const sharedMessages = Array.isArray(scopedState?.messages) ? scopedState.messages.slice(-20) : [];
    const hydratedMessages = sharedMessages.length >= scopedMessages.length ? sharedMessages : scopedMessages;
    setMessages(hydratedMessages);
    setText(String(scopedState?.draft || ""));
    setConversationState(scopedState?.conversationState || null);
    selectionContextKeyRef.current = "";
    committedSelectionContextKeyRef.current = "";
    setSelection(null);
    setErr("");
    setBusy(false);
    setSuggestionsOpen(viewportSize.width > 720);
    resetResponsePhase();
    clearCopilotSelection();
    // The full-screen Copilot owns the shared transcript while this drawer
    // remains mounted in the shell.  Do not let the hidden drawer's initial
    // empty state overwrite a valid full-screen handoff.
    if (!isCopilotPage) {
      writeCopilotSharedState({
        scopeKey: authScopeKey,
        messages: hydratedMessages,
        screenPath: canUseRouteBoundContext ? screenContext.path : null,
        screenLabel: canUseRouteBoundContext ? screenContext.label : null,
        role: me?.role || "",
        companyKind: me?.companyKind || "",
        selection: null,
        selectedContext: null,
        draft: String(scopedState?.draft || ""),
        routeContextStatus: routeContext.status,
        metadataStatus: screenContext.metadataStatus,
      });
    }
  }, [authScopeKey, canUseRouteBoundContext, isCopilotPage, me?.companyKind, me?.role, resetResponsePhase, routeContext.status, screenContext.label, screenContext.metadataStatus, screenContext.path, viewportSize.width]);

  useEffect(() => {
    saveDrawerState({ open, size, customDrawerSize, maximized: drawerMaximized, drawerPlacement, mobileDrawerFrame });
  }, [customDrawerSize, drawerMaximized, drawerPlacement, mobileDrawerFrame, open, size]);
  useEffect(() => {
    const reopenDrawer = () => {
      setDrawerMaximized(false);
      setOpen(true);
    };
    window.addEventListener("psv1:copilot:drawer-open", reopenDrawer);
    return () => window.removeEventListener("psv1:copilot:drawer-open", reopenDrawer);
  }, []);
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.toggle("copilot-is-open", open);
    return () => document.body.classList.remove("copilot-is-open");
  }, [open]);
  useEffect(() => {
    if (isCopilotPage) return;
    if (skipPersistenceRef.current) {
      skipPersistenceRef.current = false;
      return;
    }
    if (authScopeRef.current !== authScopeKey) return;
    try { localStorage.setItem(`${HISTORY_KEY}:${authScopeKey}`, JSON.stringify(compactCopilotMessages(messages))); } catch { /* no-op: history persistence is best effort */ }
    writeCopilotSharedState({
      scopeKey: authScopeKey,
      messages,
      screenPath: canUseRouteBoundContext ? screenContext.path : null,
      screenLabel: canUseRouteBoundContext ? screenContext.label : null,
      role: me?.role || "",
      companyKind: me?.companyKind || "",
      selection: canUseRouteBoundContext ? selection : null,
      selectedContext: canUseRouteBoundContext ? selection : null,
      draft: text,
      routeContextStatus: routeContext.status,
      metadataStatus: screenContext.metadataStatus,
    });
    if (scrollRef.current && chatAtBottomRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [authScopeKey, canUseRouteBoundContext, guidedRecoveryMessage, isCopilotPage, messages, me?.role, me?.companyKind, routeContext.status, screenContext.label, screenContext.metadataStatus, screenContext.path, selection, text]);
  useEffect(() => {
    function syncSharedState(event) {
      const incoming = event?.detail || readCopilotSharedState(authScopeKey);
      if (!incoming || !Array.isArray(incoming.messages)) return;
      if (incoming.scopeKey && incoming.scopeKey !== authScopeKey) return;
      const next = incoming.messages.slice(-20);
      // Shared history intentionally keeps only safe compact text.  The
      // drawer that produced the event still owns richer current-message UI
      // state such as a verified safe route action.  Do not let the same
      // transcript overwrite that action before the user can use it.
      if (hasSameMessageTranscript(next, messages)) return;
      setMessages(next);
    }
    const eventName = copilotSharedStateEventName();
    window.addEventListener(eventName, syncSharedState);
    return () => window.removeEventListener(eventName, syncSharedState);
  }, [authScopeKey, messages]);
  useEffect(() => () => {
    clearResponseTimer();
    activeRequestRef.current?.abort?.();
    requestSequenceRef.current += 1;
    drawerResizeCleanupRef.current?.();
    drawerDragCleanupRef.current?.();
    if (attentionBubbleTimerRef.current && typeof window !== "undefined") window.clearTimeout(attentionBubbleTimerRef.current);
    try { window.speechSynthesis?.cancel(); } catch { /* no-op: speech synthesis may be unavailable */ }
  }, [clearResponseTimer]);
  useEffect(() => {
    // UNKNOWN/UNAVAILABLE can be a short-lived first-render metadata state;
    // do not discard an already authorized same-route answer for that
    // transient state. Explicit DENY still invalidates the request.
    if (canUseRouteBoundContext || routeContext.status !== "DENY") return;
    activeRequestRef.current?.abort?.();
    activeRequestRef.current = null;
    requestSequenceRef.current += 1;
    setBusy(false);
    setConversationState(null);
    selectionContextKeyRef.current = "";
    committedSelectionContextKeyRef.current = "";
    setSelection(null);
    resetResponsePhase();
  }, [canUseRouteBoundContext, currentRouteContextKey, resetResponsePhase]);
  useEffect(() => {
    const currentError = String(err || "").trim();
    const currentSelectionAttention = selectionNeedsAttention(selection) ? String(selection?.selectedRecordStatus || "").trim() : "";
    const contextCueKey = contextCue ? `${contextCue.kind}:${contextCue.text}` : "";
    const attentionKey = [currentError, currentSelectionAttention, contextCueKey].filter(Boolean).join(" • ");
    if (!attentionKey) {
      attentionBubbleKeyRef.current = "";
      setAttentionBubbleVisible(false);
      return undefined;
    }
    if (open) {
      setAttentionBubbleVisible(false);
      return undefined;
    }
    if (attentionBubbleKeyRef.current === attentionKey) return undefined;
    attentionBubbleKeyRef.current = attentionKey;
    setAttentionBubbleVisible(true);
    if (typeof window !== "undefined") {
      attentionBubbleTimerRef.current = window.setTimeout(() => {
        attentionBubbleTimerRef.current = null;
        setAttentionBubbleVisible(false);
      }, 7000);
    }
    return () => {
      if (attentionBubbleTimerRef.current && typeof window !== "undefined") window.clearTimeout(attentionBubbleTimerRef.current);
      attentionBubbleTimerRef.current = null;
    };
  }, [contextCue, err, open, selection]);
  useEffect(() => {
    if (!open || (!isRoleTaskHome && !isMapSurface && !isFinanceSurface) || typeof window === "undefined") {
      setMobileDrawerPlacement("bottom");
      setMobileDrawerMaxHeight(null);
      return undefined;
    }
    const placeDrawer = () => {
      if (window.innerWidth > 720) {
        setMobileDrawerPlacement("bottom");
        setMobileDrawerMaxHeight(null);
        return;
      }
      if (isMapSurface) {
        // Reserve the real map CTA rectangle. A fixed viewport fraction can
        // cover the action when the map's selected-record card moves upward.
        const safeTop = Math.max(72, (window.visualViewport?.offsetTop || 0) + 64);
        const safeBottom = Math.max(88, (window.visualViewport?.height || window.innerHeight) - window.innerHeight + 88);
        const ctaBoxes = [...document.querySelectorAll('[data-primary-cta="true"]')]
          .map((node) => node.getBoundingClientRect?.())
          .filter((box) => box && box.width > 0 && box.height > 0);
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const nearestTop = ctaBoxes.length ? Math.min(...ctaBoxes.map((box) => box.top)) : viewportHeight * 0.7;
        const farthestBottom = ctaBoxes.length ? Math.max(...ctaBoxes.map((box) => box.bottom)) : viewportHeight * 0.76;
        const topSpace = Math.max(180, Math.floor(nearestTop - safeTop - 12));
        const bottomSpace = Math.max(180, Math.floor(viewportHeight - safeBottom - farthestBottom - 12));
        if (topSpace >= bottomSpace) {
          setMobileDrawerPlacement("map-top");
          setMobileDrawerMaxHeight(topSpace);
        } else {
          setMobileDrawerPlacement("map-bottom");
          setMobileDrawerMaxHeight(bottomSpace);
        }
        return;
      }
      if (isFinanceSurface) {
        // Keep real finance completion controls above the fixed assistant on
        // narrow screens. The compact assistant uses the free upper lane.
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const protectedBoxes = [...document.querySelectorAll(
          '[data-testid="room-service-cost-missing"] > summary, [data-testid="room-service-cost-missing-item"] button, [data-testid="room-service-cost-breakdown"] > summary, [data-testid="room-service-cost-advanced"] > summary, [data-testid="room-cost-source-toggle"], [data-testid^="room-cost-allocation-form-"] button, [data-testid^="room-cost-allocation-form-"] input, [data-testid^="room-cost-allocation-form-"] select, [data-testid^="room-cost-allocation-form-"] textarea',
        )].map((node) => node.getBoundingClientRect?.()).filter((box) => box && box.width > 0 && box.height > 0);
        const drawerHeight = Math.min(300, Math.max(220, Math.floor(viewportHeight * 0.35)));
        const topBox = { left: 12, top: 12, right: window.innerWidth - 12, bottom: 12 + drawerHeight };
        const bottomBox = { left: 12, top: viewportHeight - drawerHeight - 88, right: window.innerWidth - 12, bottom: viewportHeight - 88 };
        const topFree = protectedBoxes.every((box) => !rectIntersects(topBox, box));
        const bottomFree = protectedBoxes.every((box) => !rectIntersects(bottomBox, box));
        setMobileDrawerPlacement(topFree || !bottomFree ? "top" : "bottom");
        setMobileDrawerMaxHeight(null);
        return;
      }
      setMobileDrawerMaxHeight(null);
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const drawerHeight = Math.min(300, Math.max(220, Math.floor(viewportHeight * 0.35)));
      const inset = 12;
      const bottomInset = Math.max(88, (window.visualViewport?.height || window.innerHeight) - window.innerHeight + 78);
      const top = inset;
      const middle = Math.max(inset, Math.round((viewportHeight - drawerHeight) / 2));
      const bottom = Math.max(inset, Math.round(viewportHeight - drawerHeight - bottomInset));
      const candidates = [
        ["top", top],
        ["middle", middle],
        ["bottom", bottom],
      ];
      const protectedBoxes = launcherProtectedRects();
      const drawerBox = (candidateTop) => ({ left: inset, top: candidateTop, right: window.innerWidth - inset, bottom: candidateTop + drawerHeight });
      const safe = candidates.find(([, candidateTop]) => protectedBoxes.every((box) => !rectIntersects(drawerBox(candidateTop), box)));
      setMobileDrawerPlacement(safe?.[0] || "middle");
    };
    const handleMapScroll = () => {
      placeDrawer();
      if (window.innerWidth > 720 || !isMapSurface || !open || window.scrollY <= 1) return;
      if (restoringMapSafeTopRef.current) {
        restoringMapSafeTopRef.current = false;
        return;
      }
      const drawer = document.querySelector(".copilotDrawer");
      const mapSurface = document.querySelector('[data-map-surface="primary"]');
      const drawerBox = drawer?.getBoundingClientRect?.();
      const mapBox = mapSurface?.getBoundingClientRect?.();
      const mapUnderOpenAssistant = drawerBox && mapBox && rectIntersects(drawerBox, mapBox);
      if (mapUnderOpenAssistant || drawerBox) {
        // Release the map as soon as scrolling brings it under the open
        // assistant. A mobile map scroll is itself an intent to interact with
        // the map, even when layout timing has not yet reported a rectangle
        // intersection. Conversation history remains persisted and the
        // launcher stays available for the next question.
        setGuidedTarget(null);
        setOpen(false);
        setMobileDrawerPlacement("bottom");
        setMobileDrawerMaxHeight(null);
      }
    };
    placeDrawer();
    let placementFrame = 0;
    const refreshPlacement = () => {
      if (placementFrame) window.cancelAnimationFrame(placementFrame);
      placementFrame = window.requestAnimationFrame(() => {
        placementFrame = 0;
        placeDrawer();
      });
    };
    const layoutObserver = typeof MutationObserver !== "undefined" ? new MutationObserver(refreshPlacement) : null;
    layoutObserver?.observe(document.body, { childList: true, subtree: true });
    const placementTimers = [160, 520, 1000].map((delay) => window.setTimeout(refreshPlacement, delay));
    window.addEventListener("resize", placeDrawer);
    window.addEventListener("scroll", handleMapScroll, true);
    return () => {
      if (placementFrame) window.cancelAnimationFrame(placementFrame);
      layoutObserver?.disconnect();
      placementTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", placeDrawer);
      window.removeEventListener("scroll", handleMapScroll, true);
    };
  }, [currentPath, isFinanceSurface, isMapSurface, isRoleTaskHome, open]);

  useEffect(() => {
    if (!open || viewportSize.width <= 720 || typeof window === "undefined") return undefined;
    const width = Math.min(drawerDims.width, Math.max(320, window.innerWidth - 36));
    const height = Math.min(drawerDims.height, Math.max(320, window.innerHeight - 36));
    let placementFrame = 0;
    const refreshPlacement = () => {
      if (placementFrame) window.cancelAnimationFrame(placementFrame);
      placementFrame = window.requestAnimationFrame(() => {
        placementFrame = 0;
        setDrawerPlacement((previous) => {
          const defaultLeft = Math.max(18, window.innerWidth - width - 18);
          const defaultTop = Math.max(18, window.innerHeight - height - 18);
          const safe = resolveSafeDrawerPlacement(previous?.left ?? defaultLeft, previous?.top ?? defaultTop, width, height);
          return previous && safe.left === previous.left && safe.top === previous.top ? previous : safe;
        });
      });
    };
    refreshPlacement();
    const layoutObserver = typeof MutationObserver !== "undefined" ? new MutationObserver(refreshPlacement) : null;
    layoutObserver?.observe(document.body, { childList: true, subtree: true });
    const placementTimers = [160, 520, 1000].map((delay) => window.setTimeout(refreshPlacement, delay));
    return () => {
      if (placementFrame) window.cancelAnimationFrame(placementFrame);
      layoutObserver?.disconnect();
      placementTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [drawerDims.height, drawerDims.width, open, viewportSize.height, viewportSize.width]);

  const resolveSafeLauncherPlacement = useCallback((preferredSide, preferredRatio) => {
    const width = typeof window === "undefined" ? viewportSize.width : window.innerWidth;
    const height = typeof window === "undefined" ? viewportSize.height : window.innerHeight;
    const box = mascotRef.current?.getBoundingClientRect?.();
    const buttonWidth = box?.width || (width <= 720 ? 58 : 68);
    const buttonHeight = box?.height || (width <= 720 ? 58 : 68);
    const inset = launcherInsets(width);
    const maxTop = Math.max(inset.top, height - buttonHeight - inset.bottom);
    const ratio = Math.min(1, Math.max(0, Number(preferredRatio) || 0));
    const desiredTop = inset.top + (maxTop - inset.top) * ratio;
    const desiredRatio = maxTop === inset.top ? 0 : (desiredTop - inset.top) / (maxTop - inset.top);
    const sides = preferredSide === "left" ? ["left", "right"] : ["right", "left"];
    const ratios = [desiredRatio, 0.5, 0.14, 0.86, 0.04, 0.96];
    const obstacles = launcherProtectedRects();
    for (const side of sides) {
      for (const candidateRatio of ratios) {
        const top = inset.top + (maxTop - inset.top) * candidateRatio;
        const left = side === "left" ? inset.side : width - buttonWidth - inset.side;
        const candidate = { left, top, right: left + buttonWidth, bottom: top + buttonHeight };
        if (candidate.left >= 0 && candidate.top >= 0 && candidate.right <= width && candidate.bottom <= height && !obstacles.some((obstacle) => rectIntersects(candidate, obstacle))) {
          return { version: LAUNCHER_PLACEMENT_VERSION, side, topRatio: Math.round(candidateRatio * 1000) / 1000 };
        }
      }
    }
    return { version: LAUNCHER_PLACEMENT_VERSION, side: sides[0], topRatio: Math.round(desiredRatio * 1000) / 1000 };
  }, [viewportSize.height, viewportSize.width]);

  useEffect(() => {
    if (!launcherPlacement || open || dragPreview || !mascotRef.current) return;
    const safe = resolveSafeLauncherPlacement(launcherPlacement.side, launcherPlacement.topRatio);
    if (placementKey(safe) === placementKey(launcherPlacement)) return;
    setLauncherPlacement(safe);
    writeLauncherPlacement(safe);
  }, [dragPreview, launcherPlacement, open, resolveSafeLauncherPlacement]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    function onLayerChange(event) {
      const next = String(event?.detail || readPlanCenterOverlayLayer() || "guide").toLowerCase();
      setActiveOverlayLayer(next === "copilot" ? "copilot" : "guide");
    }
    window.addEventListener(planCenterOverlayLayerEventName(), onLayerChange);
    onLayerChange();
    return () => window.removeEventListener(planCenterOverlayLayerEventName(), onLayerChange);
  }, []);

  useEffect(() => {
    const evt = copilotSelectionEventName();
    const shouldPreserveDetailedTranscript = (nextSelectionContextKey) => {
      if (!authScopeKey || !currentPath) return false;
      const shared = readCopilotSharedState(authScopeKey);
      const isDetailedCopilotPath = /\/copilot$/.test(normalizeScopePath(currentPath));
      if (nextSelectionContextKey && !isDetailedCopilotPath) return false;
      return Boolean(
        Array.isArray(shared?.messages)
        && shared.messages.length
        && (isDetailedCopilotPath || normalizeScopePath(shared?.sourceScreenPath) === normalizeScopePath(currentPath)),
      );
    };
    function onSelection(e) {
      const resetConversation = Boolean(e?.detail?.resetConversation);
      const next = resetConversation ? null : (e?.detail || null);
      const previousSelectionContextKey = selectionContextKeyRef.current;
      const nextSelectionContextKey = copilotSelectionContextKey(next);
      const selectionWasEnriched = selectionContextIsEnriched(previousSelectionContextKey, nextSelectionContextKey);
      const preserveDetailedTranscript = shouldPreserveDetailedTranscript(nextSelectionContextKey);
      if (resetConversation || (previousSelectionContextKey && previousSelectionContextKey !== nextSelectionContextKey && !preserveDetailedTranscript && !selectionWasEnriched)) {
        activeRequestRef.current?.abort?.();
        activeRequestRef.current = null;
        requestSequenceRef.current += 1;
        setMessages([]);
        setConversationState(null);
        setText("");
        setErr("");
        setBusy(false);
        resetResponsePhase();
      }
      selectionContextKeyRef.current = nextSelectionContextKey;
      setSelection(canUseRouteBoundContext && selectionApplies(next, currentPath) ? next : null);
    }
    window.addEventListener(evt, onSelection);
    const initialSelection = readCopilotSelection();
    const nextSelection = canUseRouteBoundContext && selectionApplies(initialSelection, currentPath) ? initialSelection : null;
    selectionContextKeyRef.current = copilotSelectionContextKey(nextSelection);
    setSelection(nextSelection);
    return () => window.removeEventListener(evt, onSelection);
  }, [authScopeKey, canUseRouteBoundContext, currentPath, isFinanceSurface, resetResponsePhase, selection]);
  useEffect(() => {
    const nextSelectionContextKey = copilotSelectionContextKey(selection);
    const previousSelectionContextKey = committedSelectionContextKeyRef.current;
    const selectionWasEnriched = selectionContextIsEnriched(previousSelectionContextKey, nextSelectionContextKey);
    const shared = readCopilotSharedState(authScopeKey);
    const isDetailedCopilotPath = /\/copilot$/.test(normalizeScopePath(currentPath));
    const preserveDetailedTranscript = Boolean(
      Array.isArray(shared?.messages)
      && shared.messages.length
      && (isDetailedCopilotPath || normalizeScopePath(shared?.sourceScreenPath) === normalizeScopePath(currentPath)),
    );
    if (previousSelectionContextKey && previousSelectionContextKey !== nextSelectionContextKey && !preserveDetailedTranscript && !selectionWasEnriched) {
      activeRequestRef.current?.abort?.();
      activeRequestRef.current = null;
      requestSequenceRef.current += 1;
      setMessages([]);
      setConversationState(null);
      setText("");
      setText("");
      setErr("");
      setBusy(false);
      resetResponsePhase();
    }
    committedSelectionContextKeyRef.current = nextSelectionContextKey;
  }, [authScopeKey, currentPath, resetResponsePhase, selection]);

  useEffect(() => {
    if (!isSmartPlacementSurface || open || launcherPlacement || dragPreview || typeof window === "undefined") {
      mapAnchorRef.current = "";
      setMapSafePosition(null);
      return undefined;
    }

    let disposed = false;
    const placeMascot = () => {
      const map = isMapSurface
        ? document.querySelector('[data-map-surface="primary"] .leaflet-container')
        : null;
      const button = mascotRef.current;
      if (!button) return;

      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const gap = 18;
      const mapBox = map
        ? map.getBoundingClientRect()
        : { left: 0, top: 0, right: viewport.width, bottom: viewport.height, width: viewport.width, height: viewport.height };
      const buttonBox = button.getBoundingClientRect();
      const candidates = [
        { name: "top-right", left: mapBox.right - buttonBox.width - gap, top: mapBox.top + gap },
        { name: "top-left", left: mapBox.left + gap, top: mapBox.top + gap },
        { name: "bottom-right", left: mapBox.right - buttonBox.width - gap, top: mapBox.bottom - buttonBox.height - gap },
        { name: "bottom-left", left: mapBox.left + gap, top: mapBox.bottom - buttonBox.height - gap },
      ];
      const usableWidth = Math.max(0, mapBox.width - buttonBox.width - gap * 2);
      const usableHeight = Math.max(0, mapBox.height - buttonBox.height - gap * 2);
      for (let row = 1; row <= 5; row += 1) {
        for (let column = 1; column <= 5; column += 1) {
          candidates.push({
            name: `map-grid-${row}-${column}`,
            left: mapBox.left + gap + (usableWidth * column) / 6,
            top: mapBox.top + gap + (usableHeight * row) / 6,
          });
        }
      }
      // When the map shell is below the fold, map-relative candidates are not
      // visible yet. Keep the launcher available in the viewport while still
      // respecting the same obstacle checks; this is a single deterministic
      // fallback, not a second placement loop.
      candidates.push(
        // Compact maps can begin below the fold. These header-safe viewport
        // candidates keep the launcher visible when every visible map slot is
        // occupied by a marker or map control.
        { name: "viewport-safe-right", left: viewport.width - buttonBox.width - gap, top: Math.max(72, gap) },
        { name: "viewport-safe-left", left: gap, top: Math.max(72, gap) },
        { name: "viewport-safe-right-lower", left: viewport.width - buttonBox.width - gap, top: Math.max(96, gap) },
        { name: "viewport-safe-left-lower", left: gap, top: Math.max(96, gap) },
        { name: "viewport-top-right", left: viewport.width - buttonBox.width - gap, top: gap },
        { name: "viewport-top-left", left: gap, top: gap },
        { name: "viewport-bottom-right", left: viewport.width - buttonBox.width - gap, top: viewport.height - buttonBox.height - gap },
        { name: "viewport-bottom-left", left: gap, top: viewport.height - buttonBox.height - gap }
      );
      const obstacles = [...document.querySelectorAll(".leaflet-marker-icon, .leaflet-control, [data-primary-cta=\"true\"], [role=alert], [role=status], [role=dialog], #shell-nav-dock, .shellTop, .roleSignalAction, .roleTaskSummaryCard--next .btn, .shellTopLogout, [data-details=\"task-workspace\"] > summary, [data-details=\"task-workspace\"][open] .roleTaskDetailsBody, [data-map-surface=\"primary\"] [data-map-current-state=\"true\"], [data-map-surface=\"primary\"] [data-map-legacy-state=\"true\"], [data-map-surface=\"primary\"] .mapOperationsDisclosure, [data-map-surface=\"primary\"] .mapViewRouteNotice, [data-map-surface=\"primary\"] .mapViewFooter")]
        .map((element) => element.getBoundingClientRect())
        .filter((box) => box.width > 0 && box.height > 0);
      const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const isSafeCandidate = (candidate) => {
        const box = { left: candidate.left, top: candidate.top, right: candidate.left + buttonBox.width, bottom: candidate.top + buttonBox.height };
        const attentionVisible = !open && attentionBubbleVisible;
        const bubbleWidth = Math.min(240, Math.max(0, viewport.width - 24));
        const bubbleHeight = viewport.width <= 720 ? 88 : 64;
        const below = candidate.top < viewport.height / 2;
        const bubbleLeft = Math.min(viewport.width - 12 - bubbleWidth, Math.max(12, candidate.left + buttonBox.width - bubbleWidth));
        const bubble = attentionVisible
          ? { left: bubbleLeft, top: below ? candidate.top + buttonBox.height + 10 : candidate.top - bubbleHeight - 10, right: bubbleLeft + bubbleWidth, bottom: below ? candidate.top + buttonBox.height + 10 + bubbleHeight : candidate.top - 10 }
          : null;
        return box.left >= 0 && box.top >= 0 && box.right <= viewport.width && box.bottom <= viewport.height && (!bubble || (bubble.top >= 0 && bubble.bottom <= viewport.height)) && !obstacles.some((obstacle) => intersects(box, obstacle) || (bubble && intersects(bubble, obstacle)));
      };
      const anchoredCandidate = candidates.find((candidate) => candidate.name === mapAnchorRef.current);
      const chosen = (anchoredCandidate && isSafeCandidate(anchoredCandidate))
        ? anchoredCandidate
        : candidates.find(isSafeCandidate);

      if (!disposed) {
        if (chosen) mapAnchorRef.current = chosen.name;
        setMapSafePosition((previous) => {
          const next = chosen ? { left: Math.round(chosen.left), top: Math.round(chosen.top), anchor: chosen.name } : null;
          if (previous?.left === next?.left && previous?.top === next?.top && previous?.anchor === next?.anchor) return previous;
          return next;
        });
      }
    };
    let scheduledFrame = null;
    const schedulePlace = () => {
      if (disposed || scheduledFrame !== null) return;
      scheduledFrame = window.requestAnimationFrame(() => {
        scheduledFrame = null;
        placeMascot();
      });
    };

    const map = isMapSurface
      ? document.querySelector('[data-map-surface="primary"] .leaflet-container')
      : null;
    const observer = typeof ResizeObserver === "function" && map ? new ResizeObserver(schedulePlace) : null;
    if (map) observer?.observe(map);
    const mapSurface = document.querySelector('[data-map-surface="primary"]');
    const contentObserver = typeof MutationObserver === "function" && mapSurface ? new MutationObserver(schedulePlace) : null;
    if (mapSurface) contentObserver?.observe(mapSurface, { childList: true, subtree: true });
    window.addEventListener("resize", schedulePlace);
    window.addEventListener("scroll", schedulePlace, true);
    const frame = window.requestAnimationFrame(placeMascot);
    // Leaflet marker geometry can settle after the first frame without a DOM
    // mutation. Recheck twice during initial map layout so the launcher does
    // not keep an early anchor that becomes occupied by a moving marker.
    const settleTimers = [250, 900].map((delay) => window.setTimeout(schedulePlace, delay));
    const settleInterval = window.setInterval(schedulePlace, 200);
    const settleStopTimer = window.setTimeout(() => window.clearInterval(settleInterval), 3200);
    return () => {
      disposed = true;
      observer?.disconnect();
      contentObserver?.disconnect();
      window.cancelAnimationFrame(frame);
      if (scheduledFrame !== null) window.cancelAnimationFrame(scheduledFrame);
      settleTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(settleStopTimer);
      window.clearInterval(settleInterval);
      window.removeEventListener("resize", schedulePlace);
      window.removeEventListener("scroll", schedulePlace, true);
    };
  }, [attentionBubbleVisible, dragPreview, isMapSurface, isSmartPlacementSurface, launcherPlacement, open]);

  useEffect(() => {
    if (!token || lastPathRef.current === currentPath) return;
    const previousPath = lastPathRef.current;
    lastPathRef.current = currentPath;
    setErr("");
    resetResponsePhase();

    // Keep the transcript only across the supported source-screen ↔ detailed
    // copilot handoff. A normal screen-to-screen navigation must not carry
    // route-specific answers into the next screen (for example Personel
    // erişimi answers into Hizmet Alan Firma Konumu).
    const isDetailedCopilotHandoff = /\/copilot$/.test(previousPath) || /\/copilot$/.test(currentPath);
    if (!isDetailedCopilotHandoff) {
      activeRequestRef.current?.abort?.();
      activeRequestRef.current = null;
      requestSequenceRef.current += 1;
      setMessages([]);
      setConversationState(null);
      setText("");
      setSelection(null);
      selectionContextKeyRef.current = "";
      committedSelectionContextKeyRef.current = "";
      try { localStorage.removeItem(`${HISTORY_KEY}:${authScopeKey}`); } catch { /* best effort */ }
      writeCopilotSharedState({
        scopeKey: authScopeKey,
        messages: [],
        screenPath: canUseRouteBoundContext ? screenContext.path : null,
        screenLabel: canUseRouteBoundContext ? screenContext.label : null,
        role: me?.role || "",
        companyKind: me?.companyKind || "",
        selection: null,
        selectedContext: null,
        draft: "",
        routeContextStatus: routeContext.status,
        metadataStatus: screenContext.metadataStatus,
      });
      return;
    }

    if (!canUseRouteBoundContext || isCopilotPage) return;
    setMessages((prev) => [...prev, { role: "assistant", text: `Şimdi ${screenContext.label} ekranındasın. İstersen bu ekranı anlatayım veya seçili kayıt için yardımcı olayım.`, system: true }]);
  }, [authScopeKey, canUseRouteBoundContext, currentPath, isCopilotPage, me?.companyKind, me?.role, resetResponsePhase, routeContext.status, screenContext.label, screenContext.metadataStatus, screenContext.path, token]);

  async function ask(rawText) {
    if (!token) return;
    if (!canUseRouteBoundContext) {
      const recovery = "Bu ekran bağlamını doğrulayamadım; sayfayı yenileyip yetkili bir ekran üzerinden tekrar sorabilirsin.";
      setErr(recovery);
      setMessages((prev) => [...prev, { role: "assistant", text: recovery, system: true }]);
      return;
    }
    const requestScopeKey = authScopeKey;
    // The drawer can receive its first user interaction in the same render
    // turn in which the authenticated scope becomes available. Claim the
    // current scope before starting the request so the hydration effect for
    // the previous (empty) scope cannot replace the live response with an
    // empty transcript. A later real scope change still invalidates the
    // response through authScopeRef and the request guard below.
    if (authScopeRef.current !== requestScopeKey) authScopeRef.current = requestScopeKey;
    const requestPath = currentPath;
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    activeRequestRef.current?.abort?.();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const requestIsCurrent = () => (
      requestScopeKey === authScopeRef.current
      && requestPath === currentPath
      && routeContext.status !== "DENY"
      // A same-screen hydration/route-context refresh may advance the
      // sequence without replacing this request. The controller identity is
      // the stronger ownership signal in that case; a newer request still
      // replaces it and is rejected below.
      && (requestId === requestSequenceRef.current || activeRequestRef.current === controller)
    );
    const question = String(rawText || "").trim();
    if (question) {
      // A user question is an explicit request to follow the newest exchange;
      // do not leave the new row below the current scroll position when the
      // conversation was previously scrolled upward.
      forceScrollToLatestRef.current = true;
      setMessages((prev) => [...prev, { role: "user", text: question }]);
    }
    resetResponsePhase();
    setBusy(true);
    setErr("");
    // A new semantic request owns the visible target/recovery presentation.
    // Clear only the old recovery notice while the canonical response is
    // resolving; the target itself is replaced atomically below.
    setGuidedRecoveryMessage("");
    try {
      const latestSelection = readCopilotSelection();
      const liveSelection = selectionApplies(latestSelection, currentPath) ? latestSelection : null;
      const stateSelection = selectionApplies(selection, currentPath) ? selection : null;
      const requestSelection = liveSelection || stateSelection || null;
      const uiSurface = captureCopilotUiSurface();
      const liveWorkflowState = uiSurface.workflowState || readLiveWorkflowState();
      const recentMessages = messages.slice(-8).map((m) => ({ role: m?.role || '', text: String(m?.text || '').slice(0, 280) }));
      const routeFinancialFacts = resolveRouteBoundFinancialSelection({ path: currentPath });
      const structuredFacts = requestSelection?.facts && typeof requestSelection.facts === "object"
        ? { ...requestSelection.facts, ...(routeFinancialFacts || {}) }
        : routeFinancialFacts
        || (currentPath === "/shared/kvkk" && me?.kvkk && typeof me.kvkk === "object"
          ? {
            screenType: "KVKK",
            kvkkAccess: {
              requiredCount: Number(me.kvkk.requiredCount || 0),
              acceptedCount: Number(me.kvkk.acceptedCount || 0),
              blocking: Boolean(me.kvkk.blocking),
            },
          }
          : null);
      const routeSelectedEntityType = routeFinancialFacts?.selectedEntityType || "";
      const routeSelectedEntityId = routeFinancialFacts?.selectedEntityId || null;
      const selectedEntityType = routeSelectedEntityType || requestSelection?.entityType || "";
      const selectedEntityId = Number(routeSelectedEntityId || requestSelection?.entityId || 0) || null;
      const payload = await api.post("/api/ai/copilot", {
        intent: "CHAT_HELP",
        entityType: "screen",
        entityId: Number(screenContext.screen.id),
        message: buildPrompt({ rawText, screenContext }),
        conversationState: {
          ...(conversationState && typeof conversationState === "object" ? conversationState : {}),
          recentMessages,
          lastScreenPath: screenContext.path,
          lastScreenLabel: screenContext.label,
          selectedLabel: requestSelection?.label || "",
          selectedEntityType,
          selectedEntityId,
          selectedEntitySet: Array.isArray(requestSelection?.entitySet) ? requestSelection.entitySet : [],
          selectedRelatedEntityType: requestSelection?.relatedEntityType || "",
          selectedRelatedEntityId: Number(requestSelection?.relatedEntityId || 0) || null,
          uiSurface,
        },
        screenContext: {
          id: Number(screenContext.screen.id),
          path: screenContext.path,
          label: screenContext.label,
          role: me?.role || "",
          companyKind: me?.companyKind || "",
          selectedLabel: requestSelection?.label || "",
          selectedEntityType,
          selectedEntityId,
          selectedEntitySet: Array.isArray(requestSelection?.entitySet) ? requestSelection.entitySet : [],
          selectedRelatedEntityType: requestSelection?.relatedEntityType || "",
          selectedRelatedEntityId: Number(requestSelection?.relatedEntityId || 0) || null,
          selectedFields: Array.isArray(requestSelection?.fields) ? requestSelection.fields : [],
          selectedBadges: Array.isArray(requestSelection?.badges) ? requestSelection.badges : [],
          structuredFacts,
          uiHints: {
            visibleSuggestions: buildSuggestions(screenContext.path, requestSelection, screenContext, me),
            ...uiSurface,
            workflowState: liveWorkflowState,
          },
        },
        format: "json",
      }, { token, signal: controller.signal });
      if (!requestIsCurrent()) {
        return;
      }
      setConversationState(payload?.conversationState || null);
      forceScrollToLatestRef.current = true;
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: payload?.reply || payload?.summary || "Yardım metni oluşmadı.",
        quickActions: Array.isArray(payload?.quickActions) ? payload.quickActions : [],
        followUpPrompt: payload?.followUpPrompt || "",
        responseSections: Array.isArray(payload?.responseSections) ? payload.responseSections : [],
        costReasoning: payload?.costReasoning || null,
        costAnalysisState: payload?.costAnalysisState || null,
        semanticPlan: payload?.semanticPlan || null,
        queryPlanExecution: payload?.queryPlanExecution || null,
        synthesis: payload?.synthesis || null,
        authorizedProductContext: payload?.authorizedProductContext || null,
        conversationRoute: payload?.conversationRoute || payload?.semanticPlan?.conversationRoute || null,
        dialogueTopic: payload?.dialogueTopic || payload?.semanticPlan?.dialogueTopic || null,
        guidedTarget: payload?.guidedTarget || null,
      }]);
      const nextGuidedTarget = payload?.guidedTarget || null;
      const semanticFamily = String(payload?.semanticPlan?.family || payload?.conversationRoute?.family || "").toUpperCase();
      const continuationAction = String(payload?.semanticPlan?.continuationAction || "").toUpperCase();
      setGuidedTarget(nextGuidedTarget);
      openCanonicalGuidedEntryIfRequired(payload, nextGuidedTarget);
      // A non-targeted request owns the visual state. Only an explicit active
      // workflow recovery may keep a non-FOUND recovery status; SCREEN_CONTEXT,
      // navigation, data, and authorization responses must clear stale target
      // notices instead of inheriting the prior highlight.
      const keepsRecoveryContext = continuationAction === "RECOVER"
        && ["CONTINUE_CURRENT_REASONING", "EXPLAIN_CURRENT_TARGET", "UI_GUIDANCE"].includes(semanticFamily);
      if (!keepsRecoveryContext && (!nextGuidedTarget || nextGuidedTarget.status !== "FOUND")) {
        setGuidedRecoveryMessage("");
        setGuidedTarget(null);
      }
      markResponseReady();
    } catch (e) {
      if (controller.signal.aborted || !requestIsCurrent()) return;
      setErr(String(e?.message || e));
      forceScrollToLatestRef.current = true;
      setMessages((prev) => [...prev, { role: "assistant", text: `Sorgu tamamlanamadı: ${String(e?.message || e)}`, system: true }]);
      resetResponsePhase();
    } finally {
      if (requestIsCurrent()) {
        activeRequestRef.current = null;
        setBusy(false);
      }
    }
  }

  function onSubmit(e) {
    e?.preventDefault?.();
    const q = String(text || "").trim();
    if (!q || busy) return;
    setText("");
    setInputFocused(false);
    ask(q);
  }

  function openCanonicalGuidedEntryIfRequired(payload, target) {
    const workflowIntent = String(
      payload?.semanticPlan?.workflowIntent
      || payload?.conversationRoute?.workflowIntent
      || "",
    ).toUpperCase();
    if (me?.role !== "COMPANY"
      || workflowIntent !== "CREATE_SHIFT"
      || target?.status !== "FOUND"
      || String(target?.targetKey || "").trim() !== "company:guided-plan-start"
      || normalizeCompanyPath(me, screenContext.path) !== "/company") return;

    let attempts = 0;
    const openEntry = () => {
      const entry = Array.from(document.querySelectorAll("[data-copilot-target]"))
        .find((node) => String(node.getAttribute("data-copilot-target") || "").trim() === "company:guided-plan-start");
      if (!entry) {
        attempts += 1;
        if (attempts < 5) window.requestAnimationFrame(openEntry);
        return;
      }
      if (entry.disabled || String(entry.getAttribute("aria-disabled") || "").toLowerCase() === "true") return;
      entry.scrollIntoView?.({ block: "center", inline: "nearest" });
      entry.click();
    };
    window.requestAnimationFrame(openEntry);
  }

  async function clearConversation() {
    if (!token || busy) return;
    activeRequestRef.current?.abort?.();
    activeRequestRef.current = null;
    requestSequenceRef.current += 1;
    // Clear only the authenticated Sefer Abi task state. The visible record
    // selection belongs to the current route and must survive the clear.
    const liveSelection = readCopilotSelection();
    const preservedSelection = selectionApplies(liveSelection, currentPath)
      ? liveSelection
      : selectionApplies(selection, currentPath)
        ? selection
        : null;
    try {
      await api.post("/api/ai/conversation/clear", {}, { token });
      localStorage.removeItem(`${HISTORY_KEY}:${authScopeKey}`);
      setMessages([]);
      setConversationState(null);
      setErr("");
      setGuidedRecoveryMessage("");
      setGuidedTarget(null);
      selectionContextKeyRef.current = copilotSelectionContextKey(preservedSelection);
      committedSelectionContextKeyRef.current = selectionContextKeyRef.current;
      setSelection(preservedSelection);
      writeCopilotSharedState({
        scopeKey: authScopeKey,
        messages: [],
        screenPath: canUseRouteBoundContext ? screenContext.path : null,
        screenLabel: canUseRouteBoundContext ? screenContext.label : null,
        role: me?.role || "",
        companyKind: me?.companyKind || "",
        selection: canUseRouteBoundContext ? preservedSelection : null,
        selectedContext: canUseRouteBoundContext ? preservedSelection : null,
        draft: "",
        routeContextStatus: routeContext.status,
        metadataStatus: screenContext.metadataStatus,
      });
      resetResponsePhase();
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  function dismissDrawer() {
    setGuidedTarget(null);
    setGuidedRecoveryMessage("");
    setOpen(false);
  }

  function openPath(path) { if (!path) return; setGuidedTarget(null); navigate(path); setOpen(false); }

  function openFullWorkspace() {
    try {
      window.localStorage.setItem(FULL_WORKSPACE_HANDOFF_KEY, JSON.stringify({
        scopeKey: authScopeKey,
        messages: compactCopilotMessages(messages),
        draft: text,
      }));
    } catch { /* best effort: shared state remains the fallback */ }
    if (canUseRouteBoundContext && selection) setCopilotSelection(selection);
    writeCopilotSharedState({
      scopeKey: authScopeKey,
      messages,
      draft: text,
      screenPath: canUseRouteBoundContext ? screenContext.path : null,
      sourceScreenPath: canUseRouteBoundContext ? String(selection?.scopeKey || "").split("?", 1)[0] || null : null,
      screenLabel: canUseRouteBoundContext ? screenContext.label : null,
      role: me?.role || "",
      companyKind: me?.companyKind || "",
      selection: canUseRouteBoundContext ? selection : null,
      selectedContext: canUseRouteBoundContext ? selection : null,
      routeContextStatus: routeContext.status,
      metadataStatus: screenContext.metadataStatus,
    });
    const destination = fullWorkspacePath(me);
    const handoff = canUseRouteBoundContext && selection
      ? new URLSearchParams({
        copilotScope: String(selection.scopeKey || ""),
        copilotEntityType: String(selection.entityType || selection.selectedRecordType || ""),
        copilotEntityId: String(selection.entityId || selection.selectedRecordId || ""),
        ...(selection.label ? { copilotLabel: String(selection.label).slice(0, 180) } : {}),
      }).toString()
      : "";
    openPath(handoff ? `${destination}?${handoff}` : destination);
  }

  async function copyText(value) {
    const textToCopy = String(value || "").trim();
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setMessages((prev) => [...prev, { role: "assistant", text: "Metin panoya kopyalandı.", system: true }]);
    } catch {
      setErr("Kopyalama başarısız.");
    }
  }

  async function openGuideAction(guide) {
    if (!token || !canUseRouteBoundContext) return;
    const jobType = guide?.jobType || "BUTTON_ACTION_GUIDE";
    const isScreenGuide = SCREEN_GUIDE_JOB_TYPES.has(String(jobType).toUpperCase());
    const requestScopeKey = authScopeKey;
    const requestPath = currentPath;
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    activeRequestRef.current?.abort?.();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    resetResponsePhase();
    setBusy(true);
    setErr("");
    try {
      const payload = await api.post("/api/ai/copilot", {
        intent: "JOB_GUIDE",
        entityType: isScreenGuide ? "screen" : (selection?.entityType || "screen"),
        entityId: Number(isScreenGuide ? screenContext.screen.id : (selection?.entityId || screenContext.screen.id)),
        jobType,
        guideLevel: guide?.guideLevel || "SHORT",
        screenContext: {
          id: Number(screenContext.screen.id),
          path: screenContext.path,
          label: screenContext.label,
          role: me?.role || "",
          companyKind: me?.companyKind || "",
        },
        format: "json",
      }, { token, signal: controller.signal });
      if (requestId !== requestSequenceRef.current || requestScopeKey !== authScopeRef.current || requestPath !== currentPath) return;
      const guideText = [
        payload?.summary || payload?.plainSummary || payload?.jobPurpose || "Rehber açıldı.",
        payload?.whatToDoNow ? `Şimdi: ${payload.whatToDoNow}` : "",
        payload?.whatToDoNext ? `Sonra: ${payload.whatToDoNext}` : "",
      ].filter(Boolean).join(" ");
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: guideText || "Rehber açıldı.",
        quickActions: Array.isArray(payload?.quickActions) ? payload.quickActions : [],
        followUpPrompt: payload?.whatToDoNext ? "Peki sonra?" : "",
      }]);
      markResponseReady();
    } catch (e) {
      if (controller.signal.aborted || requestId !== requestSequenceRef.current || requestScopeKey !== authScopeRef.current || requestPath !== currentPath) return;
      setErr(String(e?.message || e));
      resetResponsePhase();
    } finally {
      if (requestId === requestSequenceRef.current && requestScopeKey === authScopeRef.current && requestPath === currentPath) {
        activeRequestRef.current = null;
        setBusy(false);
      }
    }
  }

  async function triggerQuickAction(action) {
    const kind = guideActionKind(action);
    if (kind === "ASK") {
      return ask(action?.askText || action?.label || "");
    }
    if (kind === "OPEN_GUIDE") {
      return openGuideAction(action?.guide || action);
    }
    if (kind === "COPY_TEXT") {
      return copyText(action?.copyText || "");
    }
    if (kind === "CLEAR_FILTER") {
      const targetKey = String(action?.targetKey || "").trim();
      const target = Array.from(document.querySelectorAll('[data-copilot-target]'))
        .find((node) => String(node.getAttribute('data-copilot-target') || '').trim() === targetKey);
      if (!target || typeof target.click !== "function") {
        setErr("Bu ekranda canlı filtre temizleme hedefi bulunamadı.");
        return;
      }
      if (target.disabled || String(target.getAttribute('aria-disabled') || '').toLowerCase() === 'true') {
        setErr("Filtre temizleme kontrolü şu anda kullanılamıyor.");
        return;
      }
      target.scrollIntoView?.({ block: "center", inline: "nearest" });
      target.click();
      return;
    }
    const rawPath = action?.path || action?.href || resolveGuideRoute(me, action?.routeKey || "");
    if (!rawPath) {
      setErr("Bu hızlı aksiyon için geçerli bir hedef bulunamadı.");
      return;
    }
    openPath(withRouteParams(rawPath, action?.routeParams));
  }

  function dismissProactiveBubble() {
    const key = proactiveBubble?.key || "";
    setProactiveDismissedKey(key);
    writeProactiveDismissedKey(authScopeKey, key);
  }

  function speak(text, idx) {
    const t = String(text || "").trim(); if (!t) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(t);
      const voiceConfig = COPILOT_PERSONA.voiceReadoutConfig || {};
      u.lang = voiceConfig.lang || "tr-TR";
      u.pitch = Number.isFinite(voiceConfig.pitch) ? voiceConfig.pitch : 0.82;
      u.rate = Number.isFinite(voiceConfig.rate) ? voiceConfig.rate : 0.92;
      u.volume = Number.isFinite(voiceConfig.volume) ? voiceConfig.volume : 1;
      const voice = pickPreferredSpeechVoice(synth, u.lang);
      if (voice) u.voice = voice;
      u.onend = () => setReadingIndex(-1);
      u.onerror = () => setReadingIndex(-1);
      setReadingIndex(idx);
      synth.speak(u);
    } catch { /* no-op: speech synthesis may fail */ }
  }

  if (!token || !me || isCopilotPage) return null;

  function activateCopilotLayer() {
    setPlanCenterOverlayLayer("copilot");
  }

  const launcherSide = dragPreview?.side || launcherPlacement?.side || (mapSafePosition && mapSafePosition.left < viewportSize.width / 2 ? "left" : "right");
  const launcherButtonSize = viewportSize.width <= 720 ? 58 : 68;
  const launcherInset = launcherInsets(viewportSize.width);
  const launcherMaxTop = Math.max(launcherInset.top, viewportSize.height - launcherButtonSize - launcherInset.bottom);
  const launcherTop = launcherInset.top + (launcherMaxTop - launcherInset.top) * (launcherPlacement?.topRatio || 0.84);
  const launcherPositionStyle = { zIndex: 9135 };
  if (dragPreview) {
    launcherPositionStyle.left = dragPreview.left;
    launcherPositionStyle.top = dragPreview.top;
    launcherPositionStyle.right = "auto";
    launcherPositionStyle.bottom = "auto";
  } else if (launcherPlacement) {
    launcherPositionStyle.left = launcherPlacement.side === "left" ? launcherInset.side : "auto";
    launcherPositionStyle.right = launcherPlacement.side === "right" ? launcherInset.side : "auto";
    launcherPositionStyle.top = launcherTop;
    launcherPositionStyle.bottom = "auto";
  } else if (isSmartPlacementSurface && mapSafePosition) {
    launcherPositionStyle.left = mapSafePosition.left;
    launcherPositionStyle.top = mapSafePosition.top;
    launcherPositionStyle.right = "auto";
    launcherPositionStyle.bottom = "auto";
  }
  const activeDrawerPlacement = drawerDragPreview || drawerPlacement;
  const desktopBounds = viewportSize.width > 720 ? drawerResizeBounds() : null;
  const desktopDrawerWidth = drawerMaximized
    ? Math.min(desktopBounds?.maxWidth || Math.max(320, viewportSize.width - 36), Math.max(320, viewportSize.width - 36))
    : Math.min(drawerResizePreview?.width || drawerDims.width, Math.max(320, viewportSize.width - 36));
  const desktopDrawerHeight = drawerMaximized
    ? Math.min(desktopBounds?.maxHeight || Math.max(320, viewportSize.height - 36), Math.max(320, viewportSize.height - 36))
    : Math.min(drawerResizePreview?.height || drawerDims.height, Math.max(320, viewportSize.height - 36));
  // A guided target must remain visible and actionable on short desktop
  // widths. The standard 400px rail can cover the target's right edge when
  // the content area is only tablet-sized, so temporarily use a compact
  // presentation width while preserving the user's saved size and position.
  const guidedDesktopCompact = guidedTargetActive
    && !drawerMaximized
    && viewportSize.width > 720
    && viewportSize.width <= 1100;
  const guidedDesktopWidth = guidedDesktopCompact
    ? Math.min(desktopDrawerWidth, Math.max(320, viewportSize.width - 36))
    : desktopDrawerWidth;
  const defaultDrawerLeft = Math.max(18, viewportSize.width - guidedDesktopWidth - 18);
  const defaultDrawerTop = Math.max(18, viewportSize.height - desktopDrawerHeight - 18);
  const mobileBounds = viewportSize.width <= 720 ? drawerResizeBounds() : null;
  const mobileRawWidth = drawerResizePreview?.width ?? drawerDragPreview?.width ?? mobileDrawerFrame?.width;
  const mobileRawHeight = drawerResizePreview?.height ?? drawerDragPreview?.height ?? mobileDrawerFrame?.height;
  const mobileRawLeft = drawerResizePreview?.left ?? drawerDragPreview?.left ?? mobileDrawerFrame?.left;
  const mobileRawTop = drawerResizePreview?.top ?? drawerDragPreview?.top ?? mobileDrawerFrame?.top;
  const hasMobileFrame = Boolean(
    mobileBounds
    && Number.isFinite(mobileRawWidth)
    && Number.isFinite(mobileRawHeight)
    && Number.isFinite(mobileRawLeft)
    && Number.isFinite(mobileRawTop),
  );
  const clampFrameValue = (value, min, max) => Math.min(max, Math.max(min, value));
  const mobileFrameWidth = hasMobileFrame
    ? clampFrameValue(mobileRawWidth, mobileBounds.minWidth, mobileBounds.maxWidth)
    : null;
  const mobileFrameHeight = hasMobileFrame
    ? clampFrameValue(mobileRawHeight, mobileBounds.minHeight, mobileBounds.maxHeight)
    : null;
  const mobileFrameLeft = hasMobileFrame
    ? clampFrameValue(mobileRawLeft, mobileBounds.inset, Math.max(mobileBounds.inset, viewportSize.width - mobileFrameWidth - mobileBounds.inset))
    : null;
  const mobileFrameTop = hasMobileFrame
    ? clampFrameValue(mobileRawTop, mobileBounds.inset, Math.max(mobileBounds.inset, viewportSize.height - mobileFrameHeight - mobileBounds.inset))
    : null;
  const mobileRenderedPlacement = hasMobileFrame ? { left: mobileFrameLeft, top: mobileFrameTop } : null;
  const renderedDrawerPlacement = viewportSize.width > 720 && drawerResizePreview
    ? { left: drawerResizePreview.left, top: drawerResizePreview.top }
    : viewportSize.width > 720 && drawerDragPreview
    ? { left: drawerDragPreview.left, top: drawerDragPreview.top }
    : viewportSize.width > 720 && drawerMaximized
    ? resolveSafeDrawerPlacement(
      activeDrawerPlacement?.left ?? 18,
      activeDrawerPlacement?.top ?? 18,
      guidedDesktopWidth,
      desktopDrawerHeight,
    )
    : viewportSize.width > 720
    ? resolveSafeDrawerPlacement(
      guidedDesktopCompact ? defaultDrawerLeft : activeDrawerPlacement?.left ?? defaultDrawerLeft,
      activeDrawerPlacement?.top ?? defaultDrawerTop,
      guidedDesktopWidth,
      desktopDrawerHeight,
    )
     : mobileRenderedPlacement;
  const drawerPositionStyle = {
    width: viewportSize.width <= 720 && hasMobileFrame ? mobileFrameWidth : guidedDesktopWidth,
    height: viewportSize.width <= 720 && hasMobileFrame
      ? mobileFrameHeight
      : viewportSize.width <= 720
        ? Math.max(220, Math.min(drawerDims.height, viewportSize.height - 112))
        : desktopDrawerHeight,
    ...(compactDesktopDrawer || financeDesktopDrawer
      ? { minHeight: Math.min(drawerDims.height, Math.max(320, viewportSize.height - 36)) }
      : {}),
    // A live guided target keeps the assistant above ordinary route content,
    // but a real guided modal owns the interaction layer while it is open.
    // The modal publishes the existing "guide" layer, so the drawer must
    // remain underneath it; otherwise its suggestions/composer can intercept
    // the modal's real controls on narrow screens.
    zIndex: activeOverlayLayer === "copilot" || (guidedTargetActive && activeOverlayLayer !== "guide") ? 9130 : 4210,
    ...(renderedDrawerPlacement && (viewportSize.width > 720 || hasMobileFrame)
      ? { left: renderedDrawerPlacement.left, top: renderedDrawerPlacement.top, right: "auto", bottom: "auto" }
      : {}),
    ...(hasMobileFrame
      ? {
        "--copilot-mobile-drawer-left": `${mobileFrameLeft}px`,
        "--copilot-mobile-drawer-top": `${mobileFrameTop}px`,
        "--copilot-mobile-drawer-width": `${mobileFrameWidth}px`,
        "--copilot-mobile-drawer-height": `${mobileFrameHeight}px`,
      }
      : {}),
  };
  const chatScrollbar = getChatScrollbarMetrics({
    scrollTop: chatScrollMetrics.scrollTop,
    scrollHeight: chatScrollMetrics.scrollHeight,
    clientHeight: chatScrollMetrics.clientHeight,
    trackHeight: Math.max(0, chatScrollMetrics.clientHeight - 12),
  });

  function openFromLauncher() {
    // On a mobile map the assistant is a temporary task aid. If the user has
    // scrolled into the map, return to the route's safe top before opening so
    // the panel never opens on top of map controls or markers. The selected
    // record and conversation state stay in the existing owners.
    let restoreMapSafeTop = false;
    if (viewportSize.width <= 720 && isMapSurface && typeof window !== "undefined") {
      const mapSurface = document.querySelector('[data-map-surface="primary"]');
      const mapBox = mapSurface?.getBoundingClientRect?.();
      restoreMapSafeTop = Boolean(mapBox && mapBox.top < window.innerHeight && mapBox.bottom > 0 && window.scrollY > 0);
    }
    setPanelSide(launcherSide);
    setLauncherInteraction("idle");
    if (restoreMapSafeTop && typeof window !== "undefined") {
      // A map scroll event can otherwise see the newly mounted drawer
      // intersecting the map and immediately close the panel again.
      restoringMapSafeTopRef.current = true;
      window.setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "auto" });
        // The listener may mount after the programmatic restore scroll. Do
        // not let that one-time guard swallow the user's next real scroll.
        window.setTimeout(() => { restoringMapSafeTopRef.current = false; }, 0);
      }, 0);
    }
    setOpen(true);
  }

  function drawerResizeBounds() {
    const width = typeof window === "undefined" ? viewportSize.width : window.innerWidth;
    const height = typeof window === "undefined" ? viewportSize.height : window.innerHeight;
    const compact = width <= 720;
    const inset = compact ? 10 : 18;
    // Leave a real touch-safe movement lane on narrow screens.  A mobile
    // drawer that is allowed to consume the whole viewport can technically
    // receive pointer events while still being impossible to move.
    const compactMaxWidth = Math.min(420, Math.max(288, width - 32));
    const maxWidth = compact
      ? compactMaxWidth
      : Math.min(720, Math.max(320, width - inset * 2));
    const maxHeight = Math.min(860, Math.max(compact ? 220 : 360, height - inset * 2));
    return {
      inset,
      // Keep enough horizontal room for the avatar, status text, and the
      // four compact window controls at 390px while still allowing the 320px
      // viewport to use its full safe width.
      minWidth: Math.min(compact ? Math.min(300, compactMaxWidth) : 400, maxWidth),
      minHeight: Math.min(compact ? 220 : 500, maxHeight),
      maxWidth,
      maxHeight,
    };
  }

  function startDrawerDrag(event) {
    // Maximized is still the floating window, not the detailed /copilot
    // workspace. Keep its header draggable and clamp the frame to the
    // viewport in move/finish handling below.
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target?.closest?.("button, details, summary, input, textarea, a, [role=button]")) return;
    const drawer = event.currentTarget.closest?.(".copilotDrawer");
    const box = drawer?.getBoundingClientRect?.();
    if (!box) return;
    drawerDragCleanupRef.current?.();
    drawerDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      originLeft: box.left,
      originTop: box.top,
      width: box.width,
      height: box.height,
    };
    const handleMove = (moveEvent) => moveDrawerDrag(moveEvent);
    const handleUp = (upEvent) => finishDrawerDrag(upEvent);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    window.addEventListener("pointercancel", handleUp, { once: true });
    drawerDragCleanupRef.current = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      drawerDragCleanupRef.current = null;
    };
    drawerHeaderRef.current?.setPointerCapture?.(event.pointerId);
    activateCopilotLayer();
    event.preventDefault();
  }

  function moveDrawerDrag(event) {
    const active = drawerDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    active.lastX = event.clientX;
    active.lastY = event.clientY;
    const width = typeof window === "undefined" ? viewportSize.width : window.innerWidth;
    const height = typeof window === "undefined" ? viewportSize.height : window.innerHeight;
    const inset = width <= 720 ? 10 : 12;
    const left = Math.min(Math.max(inset, active.originLeft + event.clientX - active.startX), Math.max(inset, width - active.width - inset));
    const top = Math.min(Math.max(inset, active.originTop + event.clientY - active.startY), Math.max(inset, height - active.height - inset));
    setDrawerDragPreview({ left, top, width: active.width, height: active.height });
    event.preventDefault();
  }

  function finishDrawerDrag(event) {
    const active = drawerDragRef.current;
    // Pointer capture can deliver the final pointerup/pointercancel through a
    // different target (and some Chromium touch/mouse bridges report a new
    // pointer id). There is only one active drawer drag, so do not discard a
    // valid release merely because that id changed between move and release.
    if (!active) return;
    const releaseX = Number.isFinite(event?.clientX) ? event.clientX : active.lastX;
    const releaseY = Number.isFinite(event?.clientY) ? event.clientY : active.lastY;
    const currentLeft = active.originLeft + releaseX - active.startX;
    const currentTop = active.originTop + releaseY - active.startY;
    const safe = resolveSafeDrawerPlacement(currentLeft, currentTop, active.width, active.height);
    if (viewportSize.width <= 720) {
      setMobileDrawerFrame({ version: 1, left: safe.left, top: safe.top, width: Math.round(active.width), height: Math.round(active.height) });
    } else {
      setDrawerPlacement(safe);
    }
    setDrawerDragPreview(null);
    drawerDragRef.current = null;
    drawerDragCleanupRef.current?.();
    try { drawerHeaderRef.current?.releasePointerCapture?.(event.pointerId); } catch { /* no-op: pointer capture may already be released */ }
  }

  function startChatScrollbarDrag(event) {
    const track = event.currentTarget;
    const chat = scrollRef.current;
    if (!track || !chat || !chatScrollbar.maxScroll || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    event.stopPropagation();
    track.focus?.({ preventScroll: true });
    const trackBox = track.getBoundingClientRect();
    const thumb = track.querySelector(".copilotChatScrollbarThumb");
    const thumbBox = thumb?.getBoundingClientRect?.();
    const clickedThumb = Boolean(thumbBox && event.target.closest?.(".copilotChatScrollbarThumb"));
    const pointerOffset = clickedThumb ? event.clientY - thumbBox.top : chatScrollbar.thumbSize / 2;
    chatScrollbarDragRef.current = {
      pointerId: event.pointerId,
      trackStart: trackBox.top,
      trackHeight: trackBox.height,
      thumbSize: chatScrollbar.thumbSize,
      pointerOffset,
      maxScroll: chatScrollbar.maxScroll,
    };
    track.setPointerCapture?.(event.pointerId);
  }

  function moveChatScrollbarDrag(event) {
    const active = chatScrollbarDragRef.current;
    const chat = scrollRef.current;
    if (!active || active.pointerId !== event.pointerId || !chat) return;
    event.preventDefault();
    event.stopPropagation();
    chat.scrollTop = scrollTopFromScrollbarPointer({
      pointerPosition: event.clientY,
      trackStart: active.trackStart,
      trackHeight: active.trackHeight,
      thumbSize: active.thumbSize,
      pointerOffset: active.pointerOffset,
      maxScroll: active.maxScroll,
    });
    updateChatScrollMetrics();
  }

  function finishChatScrollbarDrag(event) {
    const active = chatScrollbarDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    chatScrollbarDragRef.current = null;
    try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch { /* no-op: pointer capture may already be released */ }
    event.preventDefault();
    event.stopPropagation();
  }

  function handleChatScrollbarKeyDown(event) {
    const chat = scrollRef.current;
    if (!chat) return;
    const pageStep = Math.max(48, chat.clientHeight * 0.8);
    let next = null;
    if (event.key === "ArrowDown") next = chat.scrollTop + 48;
    if (event.key === "ArrowUp") next = chat.scrollTop - 48;
    if (event.key === "PageDown") next = chat.scrollTop + pageStep;
    if (event.key === "PageUp") next = chat.scrollTop - pageStep;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = chat.scrollHeight;
    if (next === null) return;
    event.preventDefault();
    chat.scrollTop = next;
    updateChatScrollMetrics();
  }

  function startDrawerResize(event) {
    if (drawerMaximized || (event.pointerType === "mouse" && event.button !== 0)) return;
    const drawer = event.currentTarget.closest?.(".copilotDrawer");
    const box = drawer?.getBoundingClientRect?.();
    if (!box) return;
    drawerResizeCleanupRef.current?.();
    drawerResizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originWidth: box.width,
      originHeight: box.height,
      originLeft: box.left,
      originTop: box.top,
      corner: String(event.currentTarget.dataset.resizeCorner || "se"),
    };
    setDrawerResizePreview({ left: box.left, top: box.top, width: box.width, height: box.height });
    drawerResizeHandleRef.current = event.currentTarget;
    const handleMove = (moveEvent) => moveDrawerResize(moveEvent);
    const handleUp = (upEvent) => finishDrawerResize(upEvent);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    window.addEventListener("pointercancel", handleUp, { once: true });
    drawerResizeCleanupRef.current = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      drawerResizeCleanupRef.current = null;
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moveDrawerResize(event) {
    const active = drawerResizeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const frame = resizeDrawerFrame({
      corner: active.corner,
      origin: { left: active.originLeft, top: active.originTop, width: active.originWidth, height: active.originHeight },
      delta: { x: event.clientX - active.startX, y: event.clientY - active.startY },
      bounds: drawerResizeBounds(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      inset: drawerResizeBounds().inset,
    });
    setDrawerResizePreview(frame);
    event.preventDefault();
  }

  function finishDrawerResize(event) {
    const active = drawerResizeRef.current;
    if (active?.pointerId !== event.pointerId) return;
    const frame = resizeDrawerFrame({
      corner: active.corner,
      origin: { left: active.originLeft, top: active.originTop, width: active.originWidth, height: active.originHeight },
      delta: { x: event.clientX - active.startX, y: event.clientY - active.startY },
      bounds: drawerResizeBounds(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      inset: drawerResizeBounds().inset,
    });
    setCustomDrawerSize({ width: frame.width, height: frame.height });
    if (viewportSize.width <= 720) {
      setMobileDrawerFrame({ version: 1, left: frame.left, top: frame.top, width: frame.width, height: frame.height });
    } else {
      setDrawerPlacement({ version: 1, left: frame.left, top: frame.top });
    }
    setDrawerResizePreview(null);
    drawerResizeRef.current = null;
    drawerResizeCleanupRef.current?.();
    try { drawerResizeHandleRef.current?.releasePointerCapture?.(event.pointerId); } catch { /* no-op: pointer capture may already be released */ }
    drawerResizeHandleRef.current = null;
  }

  function startLauncherDrag(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: box.left,
      originTop: box.top,
      width: box.width,
      height: box.height,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    activateCopilotLayer();
  }

  function moveLauncherDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < LAUNCHER_DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    const width = typeof window === "undefined" ? viewportSize.width : window.innerWidth;
    const height = typeof window === "undefined" ? viewportSize.height : window.innerHeight;
    const left = Math.min(Math.max(0, drag.originLeft + deltaX), Math.max(0, width - drag.width));
    const top = Math.min(Math.max(0, drag.originTop + deltaY), Math.max(0, height - drag.height));
    setDragPreview({ left, top, side: left + drag.width / 2 < width / 2 ? "left" : "right" });
    event.preventDefault();
  }

  function finishLauncherDrag(event, cancelled = false) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch { /* no-op: pointer capture may already be released */ }
    if (drag.moved) {
      if (!cancelled) {
        const width = typeof window === "undefined" ? viewportSize.width : window.innerWidth;
        const height = typeof window === "undefined" ? viewportSize.height : window.innerHeight;
        const inset = launcherInsets(width);
        const maxTop = Math.max(inset.top, height - drag.height - inset.bottom);
        const currentLeft = Math.min(Math.max(0, drag.originLeft + (event.clientX - drag.startX)), Math.max(0, width - drag.width));
        const currentTop = Math.min(Math.max(0, drag.originTop + (event.clientY - drag.startY)), Math.max(0, height - drag.height));
        const preferredSide = currentLeft + drag.width / 2 < width / 2 ? "left" : "right";
        const preferredRatio = maxTop === inset.top ? 0 : Math.min(1, Math.max(0, (currentTop - inset.top) / (maxTop - inset.top)));
        const safe = resolveSafeLauncherPlacement(preferredSide, preferredRatio);
        setLauncherPlacement(safe);
        writeLauncherPlacement(safe);
      }
      suppressLauncherClickRef.current = true;
      setDragPreview(null);
    }
    dragRef.current = null;
  }

  return !open ? (
    <div
      className={`copilotLauncherStack${isSmartPlacementSurface ? " copilotLauncherStack--smart-safe" : ""}${launcherSide === "left" ? " copilotLauncherStack--left" : ""}`}
      style={launcherPositionStyle}
    >
      <button
        type="button"
        ref={mascotRef}
        className={`copilotFab copilotFab--mascot copilotFab--frameless${isSmartPlacementSurface ? " copilotFab--map-safe copilotFab--smart-safe" : ""}${dragPreview ? " copilotFab--dragging" : ""}`}
        data-map-safe-placement={isSmartPlacementSurface ? (mapSafePosition?.anchor || "pending") : undefined}
        style={{ zIndex: 1 }}
        onPointerDown={startLauncherDrag}
        onPointerMove={moveLauncherDrag}
        onPointerUp={finishLauncherDrag}
        onPointerCancel={(event) => finishLauncherDrag(event, true)}
        onPointerDownCapture={activateCopilotLayer}
        onMouseDownCapture={activateCopilotLayer}
        onFocusCapture={activateCopilotLayer}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          activateCopilotLayer();
          openFromLauncher();
        }}
        onClick={() => {
          if (suppressLauncherClickRef.current) {
            suppressLauncherClickRef.current = false;
            return;
          }
          activateCopilotLayer();
          openFromLauncher();
        }}
        onMouseEnter={() => setLauncherInteraction("hover-focus")}
        onMouseLeave={() => setLauncherInteraction("idle")}
        onFocus={() => setLauncherInteraction("hover-focus")}
        onBlur={() => setLauncherInteraction("idle")}
        title="Sefer Abi’ye Sor — Operasyon yardımcısı"
        aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"
      >
        <span className="copilotMascotAvatar">
          <SeferAbiAvatar state={drawerAvatarState} size={80} frameless />
        </span>
        <span className="copilotMascotLabel">Sefer Abi’ye Sor</span>
      </button>
      {proactiveBubble && !open ? (
        <div
          className="copilotProactiveBubble"
          data-sefer-abi-proactive-bubble="true"
          data-actionable-event-id={proactiveBubble.event?.id || undefined}
          role="status"
          aria-live="polite"
        >
          <div className="copilotProactiveBubbleBody">
            <span className="copilotAttentionBubbleTitle">Sefer Abi</span>
            <span data-actionable-event-message="true">{proactiveBubble.message}</span>
          </div>
          <div className="copilotProactiveBubbleActions">
            <button
              type="button"
              className="copilotProactiveBubbleAction"
              onClick={() => {
                activateCopilotLayer();
                dismissProactiveBubble();
                triggerQuickAction({ path: proactiveBubble.actionPath, label: proactiveBubble.actionLabel });
              }}
            >
              {proactiveBubble.actionLabel}
            </button>
            <button type="button" className="copilotProactiveBubbleClose" onClick={dismissProactiveBubble} aria-label="Öneriyi kapat">×</button>
          </div>
        </div>
      ) : null}
      {attentionBubbleVisible && (contextCue || drawerAvatarState === "attention") && !proactiveBubble && !suppressCompactTaskHomeBubble && !suppressCompactMapBubble ? (
        <button
          type="button"
          className={`copilotAttentionBubble${contextCue?.tone === "success" ? " copilotAttentionBubble--success" : ""}${mapSafePosition?.anchor?.startsWith("top") ? " copilotAttentionBubble--below" : ""}`}
          data-sefer-abi-attention-bubble="true"
          data-sefer-abi-cue={contextCue?.kind || "attention"}
          onClick={() => {
            setAttentionBubbleVisible(false);
            activateCopilotLayer();
            const cuePath = contextCue?.action?.path || "";
            const sameRoute = cuePath && normalizeScopePath(cuePath) === normalizeScopePath(currentPath);
            if (cuePath && !sameRoute) triggerQuickAction(contextCue.action);
            else openFromLauncher();
          }}
          aria-label={contextCue?.action?.label || "Uyarıyı aç ve Sefer Abi ile konuş"}
        >
          <span className="copilotAttentionBubbleTitle">{contextCue?.title || "Dikkat"}</span>
          <span>{contextCue?.text || attentionBubbleCopy(selection, Boolean(err))}</span>
          {contextCue?.suggestion ? <span className="copilotAttentionBubbleSuggestion">{contextCue.suggestion}</span> : null}
        </button>
      ) : null}
    </div>
  ) : (
    <aside
      className={`copilotDrawer${drawerMaximized ? " copilotDrawer--maximized" : ""}${guidedTargetActive ? " copilotDrawer--guided-target" : ""}${mobileDrawerPlacement === "top" || mobileDrawerPlacement === "map-top" ? " copilotDrawer--task-home-top" : ""}${mobileDrawerPlacement === "middle" ? " copilotDrawer--task-home-middle" : ""}${mobileDrawerPlacement === "map-top" ? " copilotDrawer--map-top" : ""}${mobileDrawerPlacement === "map-bottom" ? " copilotDrawer--map-bottom" : ""}${panelSide === "left" ? " copilotDrawer--from-left" : ""}`}
      style={{ ...drawerPositionStyle, ...(mobileDrawerMaxHeight ? { "--copilot-map-safe-height": `${mobileDrawerMaxHeight}px` } : {}) }}
      data-mobile-frame={hasMobileFrame ? "true" : undefined}
      onPointerDownCapture={activateCopilotLayer}
      onMouseDownCapture={activateCopilotLayer}
      onFocusCapture={activateCopilotLayer}
    >
      <div
        ref={drawerHeaderRef}
        className="copilotDrawerHeader"
        data-drawer-drag-handle="true"
        // Capture the header gesture before any route-specific child or
        // guided-layer descendant can stop propagation. The guard inside
        // startDrawerDrag still excludes the four buttons and other controls.
        // This keeps title/avatar dragging identical on every role and size.
        onPointerDownCapture={startDrawerDrag}
        onPointerMove={moveDrawerDrag}
        onPointerUp={finishDrawerDrag}
        onPointerCancel={finishDrawerDrag}
        onLostPointerCapture={finishDrawerDrag}
        title={viewportSize.width > 720 ? "Paneli taşımak için başlıktan sürükle" : undefined}
      >
        <div className="copilotDrawerIdentity">
          <SeferAbiAvatar state={drawerAvatarState} size={112} />
          <div>
            <div className="copilotDrawerTitle">
              <span className="copilotDrawerTitleFull">{COPILOT_PERSONA.drawerTitle}</span>
              <span className="copilotDrawerTitleCompact">Sefer Abi</span>
            </div>
            <div className="copilotDrawerContext">{`${COPILOT_PERSONA.assistantDisplayName} · ${COPILOT_PERSONA.assistantSubtitle}`}</div>
            <div className={`copilotDrawerState copilotDrawerState--${drawerAvatarState}`} aria-live="polite">{drawerAvatarStateLabel}</div>
            <div className="copilotDrawerCompactContext">
              <span>Şu an: <b>{screenContext.label}</b></span>
              {selection?.label ? <span>Seçili kayıt: <b>{humanizeUserFacingText(selection.label)}</b>{selection?.facts?.screenType === "ROOM_FINANCIAL_OPERATIONS" || /Gider defteri kapsamı/i.test(String(selection.label)) ? "" : selectionSummaryForDisplay(selection) ? ` • ${humanizeUserFacingText(selectionSummaryForDisplay(selection))}` : ""}</span> : null}
            </div>
          </div>
        </div>
        <div className="copilotDrawerHeaderActions">
          <button
            type="button"
            className="btn sm copilotToolBtn copilotWindowControl"
            onClick={dismissDrawer}
            title="Küçült"
            aria-label="Küçült"
          >
            <span aria-hidden="true">−</span>
          </button>
          <button
            type="button"
            className="btn sm copilotToolBtn copilotWindowControl copilotMaximizeBtn"
            onClick={() => setDrawerMaximized((previous) => !previous)}
            title={drawerMaximized ? "Geri yükle" : "Büyüt"}
            aria-label={drawerMaximized ? "Geri yükle" : "Büyüt"}
            aria-pressed={drawerMaximized}
          >
            <span aria-hidden="true">□</span>
          </button>
          <button type="button" className="btn sm copilotToolBtn copilotWindowControl copilotFullWorkspaceBtn" onClick={openFullWorkspace} title="Aynı konuşmayı tam ekranda sürdür" aria-label="Tam ekranda aç">
            <span aria-hidden="true">↗</span>
          </button>
          <button type="button" className="btn sm copilotToolBtn copilotToolBtn--close" onClick={dismissDrawer} title="Kapat" aria-label="Kapat">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      {contextCue ? (
        <div className={`copilotContextCue${contextCue.tone === "success" ? " copilotContextCue--success" : ""}`} data-sefer-abi-context-cue={contextCue.kind} role="status" aria-live="polite">
          <div>
            <strong>{contextCue.title}</strong>
            <span>{contextCue.text}</span>
            {contextCue.suggestion ? <small>{contextCue.suggestion}</small> : null}
          </div>
          {contextCue.action ? <button type="button" className="btn sm copilotToolBtn" onClick={() => triggerQuickAction(contextCue.action)}>{contextCue.action.label}</button> : null}
        </div>
      ) : null}

      <div className="copilotChatViewport">
        <div id={chatSurfaceId} className="copilotChatSurface" ref={scrollRef}>
        {guidedRecoveryMessage ? <div className="copilotGuidedRecovery" data-copilot-guided-recovery="true" role="status" aria-live="polite">{guidedRecoveryMessage}</div> : null}
        {messages.length === 0 ? <div className="copilotEmptyState"><div className="copilotEmptyTitle">{COPILOT_PERSONA.emptyStateLead}</div><div className="copilotEmptyText">{COPILOT_PERSONA.emptyStateBody}</div></div> : null}
        {messages.map((m, idx) => <div key={`${m.role}-${idx}`} className={m.role === "user" ? "copilotMsg user" : "copilotMsg assistant"}>
          <div className="copilotMsgHead">{m.role === "user" ? "Sen" : COPILOT_PERSONA.assistantDisplayName}</div>
          <div className="copilotMsgText">{m.role === "assistant" ? humanizeUserFacingText(m.text, "Yardım metni oluşmadı.") : m.text}</div>
          {m.role === "assistant" && m.costReasoning?.version && Array.isArray(m.responseSections) && m.responseSections.length ? (
            <details className="copilotReasoningDetails">
              <summary className="copilotToolBtn">Neden böyle söyledim</summary>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {m.responseSections.map((section, sectionIndex) => (
                  <div key={`${section?.kind || "section"}:${sectionIndex}`} style={{ border: "1px solid #d0d5dd", borderRadius: 10, padding: 10, background: "#fff" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#344054", marginBottom: 5 }}>{humanizeUserFacingText(section?.title)}</div>
                    {section?.text ? <div style={{ fontSize: 12, lineHeight: 1.45 }}>{humanizeUserFacingText(section.text)}</div> : null}
                    {section?.hint ? <div style={{ fontSize: 11, color: "#475467", marginTop: 5 }}>{humanizeUserFacingText(section.hint)}</div> : null}
                    {Array.isArray(section?.items) && section.items.length ? <div style={{ fontSize: 11, color: "#475467", marginTop: 6 }}>{section.items.map(humanizeUserFacingText).join(" • ")}</div> : null}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
          {m.role === "assistant" && !m.system ? <div className="copilotMsgActions">
            <button type="button" className="btn sm copilotToolBtn" onClick={() => speak(m.text, idx)}>{readingIndex === idx ? "Okuyor..." : "Sesli oku"}</button>
            {m.followUpPrompt ? <button type="button" className="btn sm copilotToolBtn copilotMsgPrimaryAction" data-copilot-primary-action="true" onClick={() => ask("Devamını anlat")}>Devamını anlat</button> : null}
            {filterMessageActions(m.quickActions, suggestions, m.followUpPrompt, me).map((a, i) => (
              <button key={`${idx}-${i}-${actionText(a)}`} type="button" className={`btn sm copilotToolBtn${!m.followUpPrompt && i === 0 ? " copilotMsgPrimaryAction" : ""}`} data-copilot-primary-action={!m.followUpPrompt && i === 0 ? "true" : undefined} title={a?.reason || ""} onClick={() => triggerQuickAction(a)}>{actionText(a)}</button>
            ))}
          </div> : null}
        </div>)}
        {busy ? <div className="copilotBusy">Sefer Abi düşünüyor...</div> : null}
        {err ? <div className="copilotError">{err}</div> : null}
        </div>
        {chatScrollbar.maxScroll > 0 ? (
          <div
            ref={chatScrollbarTrackRef}
            className="copilotChatScrollbar"
            role="scrollbar"
            aria-controls={chatSurfaceId}
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={Math.round(chatScrollbar.maxScroll)}
            aria-valuenow={Math.round(chatScrollMetrics.scrollTop)}
            aria-label="Konuşma geçmişi kaydırma çubuğu"
            tabIndex={0}
            onKeyDown={handleChatScrollbarKeyDown}
            onPointerDown={startChatScrollbarDrag}
            onPointerMove={moveChatScrollbarDrag}
            onPointerUp={finishChatScrollbarDrag}
            onPointerCancel={finishChatScrollbarDrag}
          >
            <span
              className="copilotChatScrollbarThumb"
              style={{ height: `${chatScrollbar.thumbSize}px`, transform: `translateY(${chatScrollbar.thumbOffset}px)` }}
            />
          </div>
        ) : null}
      </div>

      {suggestions.length ? (
        <section
          className="copilotContextSuggestions"
          aria-label="Önerilen sorular"
          onPointerEnter={openSuggestionsForDesktopInteraction}
          onPointerLeave={scheduleSuggestionsClose}
          onFocusCapture={openSuggestionsForDesktopInteraction}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) scheduleSuggestionsClose();
          }}
        >
          <button
            type="button"
            className="copilotContextSuggestionsToggle"
            aria-expanded={suggestionsOpen}
            aria-controls={suggestionPanelId}
            onClick={() => setSuggestionsOpen((previous) => !previous)}
          >
            <span className="copilotContextSuggestionsLabel">
              <span className="copilotContextSuggestionsIcon" aria-hidden="true" />
              <span>Önerilen sorular <small>({suggestions.length})</small></span>
            </span>
            <span className="copilotContextSuggestionsChevron" aria-hidden="true">{suggestionsOpen ? "▾" : "▸"}</span>
          </button>
          <div id={suggestionPanelId} className="copilotSuggestionWrap" hidden={!suggestionsOpen}>{suggestions.map((chip, index) => <button key={`${chip}:${index}`} type="button" className="copilotChip" onClick={() => { setSuggestionsOpen(false); ask(chip); }}><span className="copilotChipLabel">{chip}</span><span className="copilotChipArrow" aria-hidden="true">↗</span></button>)}</div>
        </section>
      ) : null}

      <form className="copilotComposer" onSubmit={onSubmit}>
        <div className="copilotComposerInputRow">
          <button type="button" className="copilotComposerIconBtn copilotComposerFutureBtn" disabled title="Dosya ekleme #19'da etkinleşecek" aria-label="Dosya ekleme #19'da etkinleşecek">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.7 12.9 14.8 6.8a3.2 3.2 0 0 1 4.5 4.5l-7.2 7.2a5 5 0 0 1-7.1-7.1l7.4-7.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {(messages.length || err || String(text || "").trim()) ? (
            <button type="button" className="copilotComposerIconBtn copilotComposerClearBtn" onClick={clearConversation} title="Sohbeti temizle" aria-label="Sohbeti temizle">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 7h14M9 7V5h6v2m-8 0 1 12h6l1-12M10 10v6m4-6v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ) : null}
          <textarea ref={composerTextareaRef} value={text} onChange={(e) => setText(e.target.value)} onInput={(e) => resizeComposerInput(e.currentTarget)} onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(e); } }} aria-label="Sefer Abi'ye soru yaz" placeholder="Sefer Abi’ye sor..." rows={2} />
          <button type="button" className="copilotComposerIconBtn copilotComposerFutureBtn" disabled title="Mikrofon #29'dan sonra etkinleşecek" aria-label="Mikrofon #29'dan sonra etkinleşecek">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8.5" y="3.5" width="7" height="11" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
          <button type="submit" className="copilotComposerIconBtn copilotComposerSubmitBtn" disabled={busy || !String(text || "").trim()} title="Sor" aria-label="Sor">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V5m0 0-5 5m5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </form>
      {["nw", "ne", "sw", "se"].map((corner) => (
        <span
          key={corner}
          className={`copilotDrawerResizeHandle copilotDrawerResizeHandle--${corner}`}
          role="separator"
          aria-orientation="both"
          aria-label={`Paneli ${corner} köşesinden boyutlandır`}
          tabIndex={0}
          title="Paneli boyutlandır"
          data-resize-corner={corner}
          onPointerDown={startDrawerResize}
          onPointerMove={moveDrawerResize}
          onPointerUp={finishDrawerResize}
          onPointerCancel={finishDrawerResize}
        />
      ))}
    </aside>
  );
}
