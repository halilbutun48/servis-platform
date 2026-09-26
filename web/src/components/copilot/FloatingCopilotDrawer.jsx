import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { getPath, navigate } from "../../router";
import { useSession } from "../../state/session";
import { clearCopilotSelection, copilotSelectionEventName, readCopilotSelection } from "../../utils/copilotSelection";
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
import { humanizeUserFacingText } from "../../utils/terminology";

const STORAGE_KEY = "psv1:copilot:drawer:v4";
const HISTORY_KEY = "psv1:copilot:drawer:history:v4";
const SIZE_PRESETS = { S: { width: 440, height: 560 }, M: { width: 560, height: 700 }, L: { width: 700, height: 860 } };
const DEFAULT_DRAWER_SIZE = "S";
const RESULT_READY_DISPLAY_MS = 1400;
const LAUNCHER_PLACEMENT_KEY = "psv1:copilot:launcher-placement:v1";
const LAUNCHER_PLACEMENT_VERSION = 1;
const LAUNCHER_DRAG_THRESHOLD_PX = 7;

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
    '[data-primary-cta="true"], [role="alert"], [role="status"], [role="dialog"], #shell-nav-dock, .shellTop, .roleSignalAction, .roleTaskSummaryCard--next .btn, .shellTopLogout, [data-details="task-workspace"] > summary, [data-details="task-workspace"][open] .roleTaskDetailsBody, [data-map-surface="primary"] [data-map-current-state="true"], [data-map-surface="primary"] [data-map-legacy-state="true"], [data-map-surface="primary"] .mapOperationsDisclosure, [data-map-surface="primary"] .mapViewRouteNotice, [data-map-surface="primary"] .mapViewFooter, [data-map-surface="primary"] .leaflet-marker-icon, [data-map-surface="primary"] .leaflet-control',
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

function normalizeScopePath(path) {
  return String(path || "").split("?")[0];
}

function normalizeDrawerSize(size) {
  return size === "S" || size === "M" ? size : DEFAULT_DRAWER_SIZE;
}

function normalizeDrawerPlacement(value) {
  if (!value || Number(value.version) !== 1) return null;
  const left = Number(value.left);
  const top = Number(value.top);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  return { version: 1, left, top };
}

function resolveSafeDrawerPlacement(left, top, width, height) {
  const viewportWidth = typeof window === "undefined" ? width + 36 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? height + 36 : window.innerHeight;
  const inset = viewportWidth <= 720 ? 12 : 18;
  const maxLeft = Math.max(inset, viewportWidth - width - inset);
  const maxTop = Math.max(inset, viewportHeight - height - inset);
  const clamp = (x, min, max) => Math.min(max, Math.max(min, x));
  const candidates = [
    [left, top],
    [maxLeft, top],
    [inset, top],
    [left, maxTop],
    [maxLeft, maxTop],
    [inset, maxTop],
    [maxLeft, inset],
    [inset, inset],
  ];
  const obstacles = launcherProtectedRects();
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

function buildSuggestions(path, selection, screenContext, me) {
  return buildCopilotStarterChips({
    screenPath: path,
    selection,
    screenContext,
    role: me?.role || "",
    companyKind: me?.companyKind || "",
  }).slice(0, 3);
}

function buildPrompt({ rawText, screenContext }) {
  const q = String(rawText || "").trim();
  if (q) return q;
  return `Bu ekranı kısaca özetle ve güvenli sonraki adımı söyle: ${screenContext.label} (${screenContext.path}).`;
}

function selectionSummaryForDisplay(selection) {
  const label = String(selection?.label || '').trim();
  const summary = String(selection?.summary || '').trim();
  if (!summary || !label || summary === label) return summary;
  const prefix = `${label} • `;
  return summary.startsWith(prefix) ? summary.slice(prefix.length) : summary;
}

function selectionNeedsApproval(selection) {
  return /onay(?:ınız|ı|ı gerekiyor| bekliyor)|approval_required/i.test(String(selection?.selectedRecordStatus || ""));
}

function selectionNeedsAttention(selection) {
  return /(çevrim dışı|güncel değil|sinyali bekleniyor|sinyali zayıf|görünürlük riski|kontrol bekliyor)/i.test(String(selection?.selectedRecordStatus || ""));
}

function attentionBubbleCopy(selection, hasRequestError) {
  if (hasRequestError) return "Yanıt alınamadı. Birlikte tekrar deneyelim.";
  const status = String(selection?.selectedRecordStatus || "");
  if (/çevrim dışı/i.test(status)) return "Konum sinyali çevrim dışı. Birlikte bakalım.";
  if (/güncel değil|bekleniyor|zayıf/i.test(status)) return "Konum bilgisi güncel görünmüyor. Birlikte bakalım.";
  return "Bu kayıtta dikkat edilmesi gereken bir durum var. Birlikte bakalım.";
}

function actionText(action) {
  const kind = String(action?.actionKind || "OPEN_ROUTE");
  if (kind === "OPEN_GUIDE") return humanizeUserFacingText(action?.label, "Rehberi aç");
  if (kind === "ASK") return humanizeUserFacingText(action?.label, "Sor");
  if (kind === "COPY_TEXT") return humanizeUserFacingText(action?.label, "Kopyala");
  return humanizeUserFacingText(action?.label, "İlgili yere git");
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
    const kind = String(action?.actionKind || "OPEN_ROUTE");
    if (kind === "ASK") {
      const askText = String(action?.askText || action?.label || "").trim();
      if (!askText) continue;
      if (Array.isArray(suggestions) && suggestions.some((chip) => samePrompt(chip, askText))) continue;
      if (followUpPrompt && samePrompt(followUpPrompt, askText)) continue;
    } else if (kind === "COPY_TEXT") {
      const copyText = String(action?.copyText || "").trim();
      if (!copyText) continue;
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
  const [size, setSize] = useState(normalizeDrawerSize(initial.size));
  const [customDrawerSize, setCustomDrawerSize] = useState(null);
  const [drawerPlacement, setDrawerPlacement] = useState(() => normalizeDrawerPlacement(initial.drawerPlacement));
  const [drawerDragPreview, setDrawerDragPreview] = useState(null);
  // Suggestions stay available in every viewport, but remain a compact
  // disclosure until the user asks for them. This keeps the guided answer
  // and real target visible on desktop as well as mobile.
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadHistory(authScopeKey));
  const [text, setText] = useState("");
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
  const wasCompactViewportRef = useRef(typeof window !== "undefined" && window.innerWidth <= 720);
  const [panelSide, setPanelSide] = useState("right");
  // Presentation-only phase derived from the existing request lifecycle; shared context remains the sole state owner.
  const [responsePhase, setResponsePhase] = useState("idle");
  const [attentionBubbleVisible, setAttentionBubbleVisible] = useState(false);
  const [mobileDrawerPlacement, setMobileDrawerPlacement] = useState("bottom");
  const [mobileDrawerMaxHeight, setMobileDrawerMaxHeight] = useState(null);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [selection, setSelection] = useState(() => {
    const initialScreenContext = resolveCopilotScreenContext(currentPath, me);
    const initialSelection = readCopilotSelection();
    return canUseRouteBoundCopilotContext(routeContext, initialScreenContext) && selectionApplies(initialSelection, currentPath) ? initialSelection : null;
  });
  const scrollRef = useRef(null);
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
  const drawerDims = customDrawerSize || dims;
  const [activeOverlayLayer, setActiveOverlayLayer] = useState(() => readPlanCenterOverlayLayer() || "guide");
  const drawerAvatarState = resolveSeferAbiWidgetState({
    busy,
    listening: inputFocused,
    error: Boolean(err) || selectionNeedsAttention(selection),
    approvalRequired: selectionNeedsApproval(selection),
    responding: responsePhase === "responding",
    resultReady: responsePhase === "result-ready",
    interaction: launcherInteraction,
  });
  const drawerAvatarStateLabel = SEFER_ABI_WIDGET_STATE_LABELS[drawerAvatarState] || "Hazır";

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
    if (!open || viewportSize.width > 720) setMobileExpanded(false);
  }, [open, viewportSize.width]);

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
    if (compact && typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      });
    }
  }, [viewportSize.width]);

  useEffect(() => {
    resizeComposerInput(composerTextareaRef.current);
  }, [resizeComposerInput, text]);

  useEffect(() => {
    const compact = viewportSize.width <= 720;
    if (compact !== wasCompactViewportRef.current) {
      // Preserve an intentionally opened accordion while the viewport is
      // stable, but choose the useful default when crossing a breakpoint.
      setSuggestionsOpen(false);
      wasCompactViewportRef.current = compact;
    }
  }, [viewportSize.width]);

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
    setMessages(scopedMessages);
    setSelection(null);
    setText("");
    setErr("");
    setBusy(false);
    setSuggestionsOpen(viewportSize.width > 720);
    resetResponsePhase();
    clearCopilotSelection();
    writeCopilotSharedState({
      scopeKey: authScopeKey,
      messages: scopedMessages,
      screenPath: canUseRouteBoundContext ? screenContext.path : null,
      screenLabel: canUseRouteBoundContext ? screenContext.label : null,
      role: me?.role || "",
      companyKind: me?.companyKind || "",
      selection: null,
      selectedContext: null,
      routeContextStatus: routeContext.status,
      metadataStatus: screenContext.metadataStatus,
    });
  }, [authScopeKey, canUseRouteBoundContext, me?.companyKind, me?.role, resetResponsePhase, routeContext.status, screenContext.label, screenContext.metadataStatus, screenContext.path, viewportSize.width]);

  useEffect(() => { saveDrawerState({ open, size, drawerPlacement }); }, [open, size, drawerPlacement]);
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.toggle("copilot-is-open", open);
    return () => document.body.classList.remove("copilot-is-open");
  }, [open]);
  useEffect(() => {
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
      routeContextStatus: routeContext.status,
      metadataStatus: screenContext.metadataStatus,
    });
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [authScopeKey, canUseRouteBoundContext, guidedRecoveryMessage, messages, me?.role, me?.companyKind, routeContext.status, screenContext.label, screenContext.metadataStatus, screenContext.path, selection]);
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
    if (canUseRouteBoundContext) return;
    activeRequestRef.current?.abort?.();
    activeRequestRef.current = null;
    requestSequenceRef.current += 1;
    setBusy(false);
    setSelection(null);
    resetResponsePhase();
  }, [canUseRouteBoundContext, currentRouteContextKey, resetResponsePhase]);
  useEffect(() => {
    const currentError = String(err || "").trim();
    const currentSelectionAttention = selectionNeedsAttention(selection) ? String(selection?.selectedRecordStatus || "").trim() : "";
    const attentionKey = [currentError, currentSelectionAttention].filter(Boolean).join(" • ");
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
  }, [err, open, selection]);
  useEffect(() => {
    if (!open || (!isRoleTaskHome && !isMapSurface) || typeof window === "undefined") {
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
      setMobileDrawerMaxHeight(null);
      const primaryCta = document.querySelector('[data-primary-cta="true"]');
      const box = primaryCta?.getBoundingClientRect?.();
      const shouldStayAboveCta = box && box.top > window.innerHeight * 0.52;
      setMobileDrawerPlacement(shouldStayAboveCta ? "top" : "bottom");
    };
    placeDrawer();
    window.addEventListener("resize", placeDrawer);
    window.addEventListener("scroll", placeDrawer, true);
    return () => {
      window.removeEventListener("resize", placeDrawer);
      window.removeEventListener("scroll", placeDrawer, true);
    };
  }, [currentPath, isMapSurface, isRoleTaskHome, open]);
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
    function onSelection(e) {
      const next = e?.detail || null;
      setSelection(canUseRouteBoundContext && selectionApplies(next, currentPath) ? next : null);
    }
    window.addEventListener(evt, onSelection);
    setSelection(canUseRouteBoundContext && selectionApplies(readCopilotSelection(), currentPath) ? readCopilotSelection() : null);
    return () => window.removeEventListener(evt, onSelection);
  }, [canUseRouteBoundContext, currentPath]);

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
    if (!open || !token || isCopilotPage) return;
    if (lastPathRef.current !== currentPath) {
      lastPathRef.current = currentPath;
      setErr("");
      resetResponsePhase();
      if (!canUseRouteBoundContext) return;
      setMessages((prev) => [...prev, { role: "assistant", text: `Şimdi ${screenContext.label} ekranındasın. İstersen bu ekranı anlatayım veya seçili kayıt için yardımcı olayım.`, system: true }]);
    }
  }, [canUseRouteBoundContext, currentPath, open, token, isCopilotPage, screenContext.label, resetResponsePhase]);

  async function ask(rawText) {
    if (!token) return;
    if (!canUseRouteBoundContext) {
      const recovery = "Bu ekran bağlamını doğrulayamadım; sayfayı yenileyip yetkili bir ekran üzerinden tekrar sorabilirsin.";
      setErr(recovery);
      setMessages((prev) => [...prev, { role: "assistant", text: recovery, system: true }]);
      return;
    }
    const requestScopeKey = authScopeKey;
    const requestRouteContextKey = currentRouteContextKey;
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    activeRequestRef.current?.abort?.();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const question = String(rawText || "").trim();
    if (question) setMessages((prev) => [...prev, { role: "user", text: question }]);
    resetResponsePhase();
    setBusy(true);
    setErr("");
    try {
      const latestSelection = readCopilotSelection();
      const liveSelection = selectionApplies(latestSelection, currentPath) ? latestSelection : selection;
      const requestSelection = liveSelection || selection || null;
      const uiSurface = captureCopilotUiSurface();
      const recentMessages = messages.slice(-8).map((m) => ({ role: m?.role || '', text: String(m?.text || '').slice(0, 280) }));
      const payload = await api.post("/api/ai/copilot", {
        intent: "CHAT_HELP",
        entityType: "screen",
        entityId: Number(screenContext.screen.id),
        message: buildPrompt({ rawText, screenContext }),
        conversationState: {
          recentMessages,
          lastScreenPath: screenContext.path,
          lastScreenLabel: screenContext.label,
          selectedLabel: requestSelection?.label || "",
          selectedEntityType: requestSelection?.entityType || "",
          selectedEntityId: Number(requestSelection?.entityId || 0) || null,
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
          selectedEntityType: requestSelection?.entityType || "",
          selectedEntityId: Number(requestSelection?.entityId || 0) || null,
          selectedEntitySet: Array.isArray(requestSelection?.entitySet) ? requestSelection.entitySet : [],
          selectedRelatedEntityType: requestSelection?.relatedEntityType || "",
          selectedRelatedEntityId: Number(requestSelection?.relatedEntityId || 0) || null,
          uiHints: {
            visibleSuggestions: buildSuggestions(screenContext.path, requestSelection, screenContext, me),
            ...uiSurface,
          },
        },
        format: "json",
      }, { token, signal: controller.signal });
      if (requestId !== requestSequenceRef.current || requestScopeKey !== authScopeRef.current || requestRouteContextKey !== routeContextKey(routeContextRef.current)) return;
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
      setGuidedTarget(payload?.guidedTarget || null);
      const replyText = String(payload?.reply || payload?.summary || "");
      if (viewportSize.width <= 720 && !payload?.guidedTarget && (replyText.length > 360 || (Array.isArray(payload?.responseSections) && payload.responseSections.length > 1))) {
        setMobileExpanded(true);
      }
      markResponseReady();
    } catch (e) {
      if (controller.signal.aborted || requestId !== requestSequenceRef.current || requestScopeKey !== authScopeRef.current || requestRouteContextKey !== routeContextKey(routeContextRef.current)) return;
      setErr(String(e?.message || e));
      setMessages((prev) => [...prev, { role: "assistant", text: `Sorgu tamamlanamadı: ${String(e?.message || e)}`, system: true }]);
      resetResponsePhase();
    } finally {
      if (requestId === requestSequenceRef.current && requestScopeKey === authScopeRef.current && requestRouteContextKey === routeContextKey(routeContextRef.current)) {
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

  function openPath(path) { if (!path) return; navigate(path); setOpen(false); }

  function openFullWorkspace() {
    writeCopilotSharedState({
      scopeKey: authScopeKey,
      messages,
      screenPath: canUseRouteBoundContext ? screenContext.path : null,
      screenLabel: canUseRouteBoundContext ? screenContext.label : null,
      role: me?.role || "",
      companyKind: me?.companyKind || "",
      selection: canUseRouteBoundContext ? selection : null,
      selectedContext: canUseRouteBoundContext ? selection : null,
      routeContextStatus: routeContext.status,
      metadataStatus: screenContext.metadataStatus,
    });
    openPath(fullWorkspacePath(me));
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
    const requestScopeKey = authScopeKey;
    const requestRouteContextKey = currentRouteContextKey;
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
        entityType: selection?.entityType || "screen",
        entityId: Number(selection?.entityId || screenContext.screen.id),
        jobType: guide?.jobType || "BUTTON_ACTION_GUIDE",
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
      if (requestId !== requestSequenceRef.current || requestScopeKey !== authScopeRef.current || requestRouteContextKey !== routeContextKey(routeContextRef.current)) return;
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
      if (controller.signal.aborted || requestId !== requestSequenceRef.current || requestScopeKey !== authScopeRef.current || requestRouteContextKey !== routeContextKey(routeContextRef.current)) return;
      setErr(String(e?.message || e));
      resetResponsePhase();
    } finally {
      if (requestId === requestSequenceRef.current && requestScopeKey === authScopeRef.current && requestRouteContextKey === routeContextKey(routeContextRef.current)) {
        activeRequestRef.current = null;
        setBusy(false);
      }
    }
  }

  async function triggerQuickAction(action) {
    const kind = String(action?.actionKind || "OPEN_ROUTE");
    if (kind === "ASK") {
      return ask(action?.askText || action?.label || "");
    }
    if (kind === "OPEN_GUIDE") {
      return openGuideAction(action?.guide || action);
    }
    if (kind === "COPY_TEXT") {
      return copyText(action?.copyText || "");
    }
    const rawPath = action?.path || action?.href || resolveGuideRoute(me, action?.routeKey || "");
    if (!rawPath) {
      setErr("Bu hızlı aksiyon için geçerli bir hedef bulunamadı.");
      return;
    }
    openPath(withRouteParams(rawPath, action?.routeParams));
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
  const renderedDrawerPlacement = activeDrawerPlacement && viewportSize.width > 720
    ? resolveSafeDrawerPlacement(
      activeDrawerPlacement.left,
      activeDrawerPlacement.top,
      Math.min(drawerDims.width, Math.max(320, viewportSize.width - 36)),
      Math.min(drawerDims.height, Math.max(360, viewportSize.height - 36)),
    )
    : activeDrawerPlacement;
  const drawerPositionStyle = {
    width: drawerDims.width,
    height: drawerDims.height,
    // A live guided target is an active #18 conversation state. Keep the
    // assistant above safe guided modals so the user can continue, recover,
    // or go back without losing the real target context. The modal still
    // remains the interaction surface everywhere outside the drawer.
    zIndex: guidedTargetActive || activeOverlayLayer === "copilot" ? 9130 : 4210,
    ...(renderedDrawerPlacement && viewportSize.width > 720
      ? { left: renderedDrawerPlacement.left, top: renderedDrawerPlacement.top, right: "auto", bottom: "auto" }
      : {}),
  };

  function openFromLauncher() {
    setPanelSide(launcherSide);
    setLauncherInteraction("idle");
    setMobileExpanded(false);
    setOpen(true);
  }

  function chooseDrawerSize(nextSize) {
    setCustomDrawerSize(null);
    if (nextSize === "S") setSize("S");
    else if (nextSize === "M") setSize("M");
    else if (nextSize === "L") setSize("L");
  }

  function drawerResizeBounds() {
    const width = typeof window === "undefined" ? viewportSize.width : window.innerWidth;
    const height = typeof window === "undefined" ? viewportSize.height : window.innerHeight;
    const maxWidth = Math.min(720, Math.max(320, width - 36));
    const maxHeight = Math.min(860, Math.max(360, height - 36));
    return {
      minWidth: Math.min(400, maxWidth),
      minHeight: Math.min(500, maxHeight),
      maxWidth,
      maxHeight,
    };
  }

  function startDrawerDrag(event) {
    if (viewportSize.width <= 720 || (event.pointerType === "mouse" && event.button !== 0)) return;
    if (event.target?.closest?.("button, details, summary, input, textarea, a, [role=button]")) return;
    const drawer = event.currentTarget.closest?.(".copilotDrawer");
    const box = drawer?.getBoundingClientRect?.();
    if (!box) return;
    drawerDragCleanupRef.current?.();
    drawerDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
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
    const width = typeof window === "undefined" ? viewportSize.width : window.innerWidth;
    const height = typeof window === "undefined" ? viewportSize.height : window.innerHeight;
    const left = Math.min(Math.max(12, active.originLeft + event.clientX - active.startX), Math.max(12, width - active.width - 12));
    const top = Math.min(Math.max(12, active.originTop + event.clientY - active.startY), Math.max(12, height - active.height - 12));
    setDrawerDragPreview({ left, top });
    event.preventDefault();
  }

  function finishDrawerDrag(event) {
    const active = drawerDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const currentLeft = active.originLeft + event.clientX - active.startX;
    const currentTop = active.originTop + event.clientY - active.startY;
    const safe = resolveSafeDrawerPlacement(currentLeft, currentTop, active.width, active.height);
    setDrawerPlacement(safe);
    setDrawerDragPreview(null);
    drawerDragRef.current = null;
    drawerDragCleanupRef.current?.();
    try { drawerHeaderRef.current?.releasePointerCapture?.(event.pointerId); } catch { /* no-op: pointer capture may already be released */ }
  }

  function startDrawerResize(event) {
    if (viewportSize.width <= 720 || (event.pointerType === "mouse" && event.button !== 0)) return;
    const drawer = event.currentTarget.parentElement;
    const box = drawer?.getBoundingClientRect?.();
    if (!box) return;
    drawerResizeCleanupRef.current?.();
    drawerResizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originWidth: box.width,
      originHeight: box.height,
    };
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
    const bounds = drawerResizeBounds();
    const width = Math.min(bounds.maxWidth, Math.max(bounds.minWidth, active.originWidth + (event.clientX - active.startX)));
    const height = Math.min(bounds.maxHeight, Math.max(bounds.minHeight, active.originHeight + (event.clientY - active.startY)));
    setCustomDrawerSize({ width: Math.round(width), height: Math.round(height) });
    setDrawerPlacement(resolveSafeDrawerPlacement(active.originLeft, active.originTop, width, height));
    event.preventDefault();
  }

  function finishDrawerResize(event) {
    const active = drawerResizeRef.current;
    if (active?.pointerId !== event.pointerId) return;
    const bounds = drawerResizeBounds();
    const nextWidth = Math.min(bounds.maxWidth, Math.max(bounds.minWidth, active.originWidth + (event.clientX - active.startX)));
    const nextHeight = Math.min(bounds.maxHeight, Math.max(bounds.minHeight, active.originHeight + (event.clientY - active.startY)));
    const safe = resolveSafeDrawerPlacement(active.originLeft, active.originTop, nextWidth, nextHeight);
    setDrawerPlacement(safe);
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
        className={`copilotFab copilotFab--mascot${isSmartPlacementSurface ? " copilotFab--map-safe copilotFab--smart-safe" : ""}${dragPreview ? " copilotFab--dragging" : ""}`}
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
          <SeferAbiAvatar state={drawerAvatarState} size={54} />
        </span>
        <span className="copilotMascotLabel">Sefer Abi’ye Sor</span>
      </button>
      {attentionBubbleVisible && drawerAvatarState === "attention" && !suppressCompactTaskHomeBubble && !suppressCompactMapBubble ? (
        <button
          type="button"
          className={`copilotAttentionBubble${mapSafePosition?.anchor?.startsWith("top") ? " copilotAttentionBubble--below" : ""}`}
          data-sefer-abi-attention-bubble="true"
          onClick={() => {
            setAttentionBubbleVisible(false);
            activateCopilotLayer();
            openFromLauncher();
          }}
          aria-label="Uyarıyı aç ve Sefer Abi ile konuş"
        >
          <span className="copilotAttentionBubbleTitle">Dikkat</span>
          <span>{attentionBubbleCopy(selection, Boolean(err))}</span>
        </button>
      ) : null}
    </div>
  ) : (
    <aside
      className={`copilotDrawer${mobileExpanded ? " copilotDrawer--mobile-expanded" : ""}${guidedTargetActive ? " copilotDrawer--guided-target" : ""}${mobileDrawerPlacement === "top" || mobileDrawerPlacement === "map-top" ? " copilotDrawer--task-home-top" : ""}${mobileDrawerPlacement === "map-top" ? " copilotDrawer--map-top" : ""}${mobileDrawerPlacement === "map-bottom" ? " copilotDrawer--map-bottom" : ""}${panelSide === "left" ? " copilotDrawer--from-left" : ""}`}
      style={{ ...drawerPositionStyle, ...(mobileDrawerMaxHeight ? { "--copilot-map-safe-height": `${mobileDrawerMaxHeight}px` } : {}) }}
      onPointerDownCapture={activateCopilotLayer}
      onMouseDownCapture={activateCopilotLayer}
      onFocusCapture={activateCopilotLayer}
    >
      <div
        ref={drawerHeaderRef}
        className="copilotDrawerHeader"
        data-drawer-drag-handle="true"
        onPointerDown={startDrawerDrag}
        onPointerMove={moveDrawerDrag}
        onPointerUp={finishDrawerDrag}
        onPointerCancel={finishDrawerDrag}
        title={viewportSize.width > 720 ? "Paneli taşımak için başlıktan sürükle" : undefined}
      >
        <div className="copilotDrawerIdentity">
          <SeferAbiAvatar state={drawerAvatarState} size={44} />
          <div>
            <div className="copilotDrawerTitle">{COPILOT_PERSONA.drawerTitle}</div>
            <div className="copilotDrawerContext">{`${COPILOT_PERSONA.assistantDisplayName} · ${COPILOT_PERSONA.assistantSubtitle}`}</div>
            <div className={`copilotDrawerState copilotDrawerState--${drawerAvatarState}`} aria-live="polite">{drawerAvatarStateLabel}</div>
            <div className="copilotDrawerCompactContext">
              <span>Şu an: <b>{screenContext.label}</b></span>
              {selection?.label ? <span>Seçili kayıt: <b>{selection.label}</b>{selectionSummaryForDisplay(selection) ? ` • ${selectionSummaryForDisplay(selection)}` : ""}</span> : null}
            </div>
          </div>
        </div>
        <div className="copilotDrawerHeaderActions">
          <button
            type="button"
            className="btn sm copilotToolBtn copilotMobileExpandBtn"
            onClick={() => setMobileExpanded((previous) => !previous)}
            aria-expanded={mobileExpanded}
            title={mobileExpanded ? "Paneli küçült" : "Paneli büyüt"}
          >
            {mobileExpanded ? "Küçült" : "Büyüt"}
          </button>
          <details className="copilotDrawerMore">
            <summary aria-label="Sefer Abi seçenekleri" title="Seçenekler"><span aria-hidden="true">⋯</span></summary>
            <div className="copilotDrawerMoreMenu">
              <div className="copilotDrawerPresets" aria-label="Panel boyutu">
                <span className="copilotDrawerMoreLabel">Panel boyutu</span>
                <button
                  type="button"
                  className={size === "S" ? "btn sm primary copilotToolBtn" : "btn sm copilotToolBtn"}
                  onClick={() => chooseDrawerSize("S")}
                  aria-pressed={size === "S"}
                  title="Küçük"
                >
                  <span className="copilotToolIcon" aria-hidden="true">−</span><span>Küçük</span>
                </button>
                <button
                  type="button"
                  className={size === "M" ? "btn sm primary copilotToolBtn" : "btn sm copilotToolBtn"}
                  onClick={() => chooseDrawerSize("M")}
                  aria-pressed={size === "M"}
                  title="Orta"
                >
                  <span className="copilotToolIcon" aria-hidden="true">▢</span><span>Orta</span>
                </button>
                <button
                  type="button"
                  className={size === "L" ? "btn sm primary copilotToolBtn" : "btn sm copilotToolBtn"}
                  onClick={() => chooseDrawerSize("L")}
                  aria-pressed={size === "L"}
                  title="Büyük"
                >
                  <span className="copilotToolIcon" aria-hidden="true">＋</span><span>Büyük</span>
                </button>
              </div>
              <button type="button" className="btn sm copilotToolBtn" onClick={openFullWorkspace} title="Aynı konuşmayı tam ekranda sürdür">
                Tam ekranda aç
              </button>
            </div>
          </details>
          <button type="button" className="btn sm copilotToolBtn copilotToolBtn--close" onClick={() => setOpen(false)} title="Kapat" aria-label="Kapat">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      {suggestions.length ? (
        <section
          className="copilotContextSuggestions"
          aria-label="Bağlama uygun öneriler"
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
            onClick={() => {
              setSuggestionsOpen((previous) => {
                const next = !previous;
                if (next && viewportSize.width <= 720) setMobileExpanded(true);
                return next;
              });
            }}
          >
            <span>Öneriler ({suggestions.length})</span>
            <span className="copilotContextSuggestionsChevron" aria-hidden="true">{suggestionsOpen ? "▾" : "▸"}</span>
          </button>
          <div id={suggestionPanelId} className="copilotSuggestionWrap" hidden={!suggestionsOpen}>{suggestions.map((chip, index) => <button key={`${chip}:${index}`} type="button" className="copilotChip" onClick={() => ask(chip)}>{chip}</button>)}</div>
        </section>
      ) : null}

      <div className="copilotChatSurface" ref={scrollRef}>
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
            {m.followUpPrompt ? <button type="button" className="btn sm copilotToolBtn" onClick={() => ask("Devamını anlat")}>Devamını anlat</button> : null}
            {filterMessageActions(m.quickActions, suggestions, m.followUpPrompt, me).map((a, i) => (
              <button key={`${idx}-${i}-${actionText(a)}`} type="button" className="btn sm copilotToolBtn" title={a?.reason || ""} onClick={() => triggerQuickAction(a)}>{actionText(a)}</button>
            ))}
          </div> : null}
        </div>)}
        {busy ? <div className="copilotBusy">Sefer Abi düşünüyor...</div> : null}
        {err ? <div className="copilotError">{err}</div> : null}
      </div>

      <form className="copilotComposer" onSubmit={onSubmit}>
        <textarea ref={composerTextareaRef} value={text} onChange={(e) => setText(e.target.value)} onInput={(e) => resizeComposerInput(e.currentTarget)} onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(e); } }} placeholder="Sorunu yaz. Örnek: burada neden devam edemiyorum, bu ekran ne işe yarar, seçili araç ne durumda, şimdi ne yapacağım" rows={2} />
        <div className="copilotComposerRow">
          <div className="copilotComposerButtons">
            {(messages.length || err || String(text || "").trim()) ? <button type="button" className="btn sm copilotToolBtn" onClick={() => { setMessages([]); setErr(""); }}>Temizle</button> : null}
            <button type="submit" className="btn sm primary copilotToolBtn" disabled={busy || !String(text || "").trim()}>Sor</button>
          </div>
        </div>
      </form>
      <span
        className="copilotDrawerResizeHandle"
        role="separator"
        aria-orientation="both"
        aria-label="Panel boyutunu ayarla"
        tabIndex={0}
        title="Panel boyutunu ayarla"
        onPointerDown={startDrawerResize}
        onPointerMove={moveDrawerResize}
        onPointerUp={finishDrawerResize}
        onPointerCancel={finishDrawerResize}
      />
    </aside>
  );
}
