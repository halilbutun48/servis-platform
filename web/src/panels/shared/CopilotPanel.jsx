import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { getPath, navigate, useHashRoute } from "../../router";
import { useSession } from "../../state/session";
import JobGuideHeader from "../../components/copilot/JobGuideHeader";
import BeforeYouStartCard from "../../components/copilot/BeforeYouStartCard";
import QuickActionsCard from "../../components/copilot/QuickActionsCard";
import LockedReasonCard from "../../components/copilot/LockedReasonCard";
import StepByStepCard from "../../components/copilot/StepByStepCard";
import CommonMistakesCard from "../../components/copilot/CommonMistakesCard";
import DoneChecklistCard from "../../components/copilot/DoneChecklistCard";
import IfStuckCard from "../../components/copilot/IfStuckCard";
import SimpleTermsCard from "../../components/copilot/SimpleTermsCard";
import CopyOutputsCard from "../../components/copilot/CopyOutputsCard";
import MenuPurposeCard from "../../components/copilot/MenuPurposeCard";
import ButtonGuidesCard from "../../components/copilot/ButtonGuidesCard";
import ScreenMenusCard from "../../components/copilot/ScreenMenusCard";
import ChatThread from "../../components/copilot/ChatThread";
import ChatInputBox from "../../components/copilot/ChatInputBox";
import ChatQualitySummary from "../../components/copilot/ChatQualitySummary";
import CopilotAdvancedResultCard from "../../components/copilot/CopilotAdvancedResultCard";
import SuggestedChips from "../../components/copilot/SuggestedChips";
import { captureCopilotUiSurface } from "../../components/copilot/uiSurface";
import { copilotSelectionEventName, readCopilotSelection } from "../../utils/copilotSelection";
import { readCopilotSharedState, writeCopilotSharedState } from "../../utils/copilotSharedState";
import { COPILOT_PERSONA, COPILOT_TERMINAL } from "../../utils/copilotFacts";
import { nowIsoTR } from "../../utils/time";
import { getCopilotScreenOptions } from "../../copilot/screenRegistry";
import { humanizeUserFacingText } from "../../utils/terminology";
import {
  canUseEntityChat,
  defaultChatEntityType,
  filterItems,
  firstList,
  optionLabel,
  resolveGuideRoute,
  safeHistoryLoad,
  saveHistory,
  screenOptionLabel,
  selectionApplies,
} from "../../utils/copilotPanelHelpers";

const COPILOT_TERMINAL_TITLE = COPILOT_TERMINAL.title || "Sefer Abi";

function entityTypeLabel(value) {
  return {
    shift: "Vardiya",
    vehicle: "Araç",
    screen: "Ekran",
  }[String(value || "").trim().toLowerCase()] || "İlgili kayıt";
}

function intentLabel(value) {
  return INTENT_OPTIONS.find((x) => x.value === String(value || "").trim())?.label || humanizeUserFacingText(value, "Yardım konusu");
}

function guideLevelLabel(value) {
  return GUIDE_LEVEL_OPTIONS.find((x) => x.value === String(value || "").trim())?.label || humanizeUserFacingText(value, "Kısa anlat");
}

const PANEL_MODES = [
  { value: "CHAT", label: "Sohbet" },
  { value: "GUIDE", label: "Rehber" },
  { value: "ADVANCED", label: "Gelişmiş" },
];

const GUIDE_JOB_OPTIONS = [
  { value: "OFFER_REVIEW", label: "Teklifi inceleme", helper: "Teklifi okumaya yardım eder", entityType: "shift" },
  { value: "OFFER_APPROVAL", label: "Teklifi onaylama", helper: "Onay öncesi kontrol rehberi", entityType: "shift" },
  { value: "ASSIGNMENT_READINESS_GUIDE", label: "Atamaya hazır mı", helper: "Araç, sürücü ve durak hazır mı", entityType: "shift" },
  { value: "VEHICLE_DRIVER_BIND", label: "Araç ile sürücüyü bağlama", helper: "Araç ve sürücü bağlantısı için rehber", entityType: "vehicle" },
  { value: "TELEMATICS_DEVICE_CREATE", label: "Cihaz GPS'i ekleme", helper: "Araçtaki cihaz GPS'ini ekleme veya kontrol etme rehberi", entityType: "vehicle" },
  { value: "LOCATION_SOURCE_GUIDE", label: "Konum kaynağı rehberi", helper: "Telefon GPS'i ve cihaz GPS'i farkını sade dille açıklar", entityType: "vehicle" },
  { value: "GPS_SIGNAL_DIAGNOSIS_GUIDE", label: "GPS sinyal teşhisi", helper: "Konum neden görünmüyor veya gecikiyor sorusuna rehberlik eder", entityType: "vehicle" },
  { value: "SCREEN_MENU_GUIDE", label: "Bu ekran ne için var?", helper: "Seçili menünün ne işe yaradığını sade dille açıklar", entityType: "screen" },
  { value: "BUTTON_ACTION_GUIDE", label: "Bu ekrandaki butonlar", helper: "Seçili ekrandaki önemli butonların ne yaptığını açıklar", entityType: "screen" },
  { value: "ROLE_HELP_GUIDE", label: "Bu rolde ne yapabilirim?", helper: "Bu rolde hangi menüleri kullanabileceğini gösterir", entityType: "screen" },
];

const GUIDE_LEVEL_OPTIONS = [
  { value: "SHORT", label: "Kısa anlat" },
  { value: "STEP_BY_STEP", label: "Adım adım anlat" },
  { value: "WHY", label: "Neden böyle" },
];

const INTENT_OPTIONS = [
  { value: "SHIFT_SUMMARY", label: "Vardiya Özeti", helper: "Genel operasyon özeti", entityType: "shift" },
  { value: "CONFLICT_EXPLAIN", label: "Çatışma Açıklaması", helper: "Çatışma ve risk odağında özet", entityType: "shift" },
  { value: "OPS_NOTE_DRAFT", label: "Operasyon Notu Taslağı", helper: "Paylaşılabilir metin taslağı", entityType: "shift" },
  { value: "ASSIGNMENT_READINESS", label: "Atama Hazırlık Kontrolü", helper: "Araç, sürücü ve durak hazır mı", entityType: "shift" },
  { value: "OFFER_DECISION_HELP", label: "Teklif Karar Yardımı", helper: "Teklif dar boğazlarını gösterir", entityType: "shift" },
  { value: "TELEMATICS_HEALTH", label: "Cihaz GPS'i Sağlığı", helper: "Cihaz ve GPS sağlık özeti", entityType: "vehicle" },
  { value: "GPS_SIGNAL_DIAGNOSIS", label: "GPS Sinyal Teşhisi", helper: "Sinyal ve veri akışı teşhisi", entityType: "vehicle" },
];

const ENTRY_HINT_KEY = "room:operationHealthHint";


// Legacy repo-contract compatibility markers (M46.1 → M46.5 checks)
const LEGACY_COMPAT_MARKERS = {
  recentAnalyses: "Son 5 analiz",
  blocks: "Blocks",
  nextChecks: "Next Checks",
  highlights: "Highlights",
  evidence: "Evidence",
  decisionSignals: "Decision Signals",
  recommendedActions: "Recommended Actions",
  consistencyChecks: "Consistency Checks",
  missingData: "Missing Data",
  firstAction: "First Action",
  calibrationNotes: "Calibration Notes",
  evidenceLinks: "Evidence links",
  referenceLinks: "Reference links",
};

const GUIDE_BLOCK_MARKERS = {
  beforeYouStart: "Başlamadan önce kontrol",
  quickActions: "Buradan aç",
  lockedReasons: "Bu neden kapalı?",
  ifStuck: "Takıldıysan buraya git",
  copyOutputs: "Hazır metin",
};


function buildScreenOptions(me) {
  return getCopilotScreenOptions(me);
}

function selectionSummaryForDisplay(selection) {
  const label = String(selection?.label || "").trim();
  const summary = String(selection?.summary || "").trim();
  if (!summary || !label || summary === label) return humanizeUserFacingText(summary);
  const prefix = `${label} • `;
  return humanizeUserFacingText(summary.startsWith(prefix) ? summary.slice(prefix.length) : summary);
}

export default function CopilotPanel() {
  const { token, me } = useSession();
  const { path: hashPath } = useHashRoute();
  const [panelMode, setPanelMode] = useState("CHAT");
  const [intent, setIntent] = useState("SHIFT_SUMMARY");
  const [jobType, setJobType] = useState("OFFER_REVIEW");
  const [guideLevel, setGuideLevel] = useState("SHORT");
  const [_entityType, setEntityType] = useState("shift");
  const [entityId, setEntityId] = useState("");
  const [pickerSearch, setPickerSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [recentShifts, setRecentShifts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [screenOptions, setScreenOptions] = useState([]);
  const screenOptionsFromMe = useMemo(() => buildScreenOptions({ role: me?.role, companyKind: me?.companyKind }), [me?.role, me?.companyKind]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [history, setHistory] = useState([]);
  const [copyMsg, setCopyMsg] = useState("");
  const [chatScreenId, setChatScreenId] = useState("");
  const [chatEntityType, setChatEntityType] = useState(defaultChatEntityType(me?.role));
  const [chatEntityId, setChatEntityId] = useState("");
  const [sharedContext] = useState(() => readCopilotSharedState());
  const [chatMessages, setChatMessages] = useState(() => Array.isArray(sharedContext?.messages) ? sharedContext.messages.slice(-20) : []);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatErr, setChatErr] = useState("");
  const [chatConversationState, setChatConversationState] = useState(() => sharedContext?.conversationState || null);
  const [chatSuggestedChips, setChatSuggestedChips] = useState([]);
  const [entryHint, setEntryHint] = useState(null);
  const [autoChatBusy, setAutoChatBusy] = useState(false);
  const chatRequestInFlightRef = useRef(false);
  const lastAutoRunKeyRef = useRef("");
  const userChangedChatContextRef = useRef(false);

  const selectedIntent = useMemo(() => INTENT_OPTIONS.find((x) => x.value === intent) || INTENT_OPTIONS[0], [intent]);
  const selectedJob = useMemo(() => GUIDE_JOB_OPTIONS.find((x) => x.value === jobType) || GUIDE_JOB_OPTIONS[0], [jobType]);
  const activeEntityType = panelMode === "GUIDE" ? selectedJob.entityType : selectedIntent.entityType;

  useEffect(() => {
    setHistory(safeHistoryLoad());
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ENTRY_HINT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && String(parsed.source || "") === "ROOM_OPERATION_HEALTH") setEntryHint(parsed);
    } catch { /* no-op */ }
  }, []);

  useEffect(() => {
    setChatEntityType((prev) => {
      if (canUseEntityChat(me?.role)) return prev || defaultChatEntityType(me?.role);
      return "screen";
    });
  }, [me?.role]);

  useEffect(() => {
    setScreenOptions(screenOptionsFromMe);
    const current = String(getPath() || "").split("?")[0];
    const preferredPath = sharedContext?.screenPath || current;
    if (screenOptionsFromMe.some((x) => x.path === preferredPath) && activeEntityType === "screen") {
      const match = screenOptionsFromMe.find((x) => x.path === preferredPath);
      if (match) setEntityId(String(match.id));
    }
  }, [screenOptionsFromMe, activeEntityType, sharedContext?.screenPath]);
  useEffect(() => {
    const current = String(hashPath || getPath() || "").split("?")[0];
    const carriedPath = sharedContext?.screenPath === "/room" ? "/room/map" : sharedContext?.screenPath;
    const match = screenOptionsFromMe.find((x) => x.path === carriedPath) || screenOptionsFromMe.find((x) => x.path === current) || screenOptionsFromMe[0] || null;
    if (match) setChatScreenId(String(match.id));
  }, [hashPath, screenOptionsFromMe, sharedContext?.screenPath]);

  useEffect(() => {
    if (!userChangedChatContextRef.current) return;
    userChangedChatContextRef.current = false;
    setChatMessages([]);
    setChatConversationState(null);
    setChatSuggestedChips([]);
    setChatErr("");
  }, [chatScreenId, chatEntityType, chatEntityId]);

  useEffect(() => {
    if (panelMode === "GUIDE") {
      const selected = GUIDE_JOB_OPTIONS.find((x) => x.value === jobType) || GUIDE_JOB_OPTIONS[0];
      const nextType = selected?.entityType || "shift";
      setEntityType(nextType);
      setPickerSearch("");
      if (nextType === "screen") {
        const current = String(getPath() || "").split("?")[0];
        const match = screenOptionsFromMe.find((x) => x.path === current);
        setEntityId(match ? String(match.id) : "");
      } else {
        setEntityId("");
      }
      return;
    }
    const selected = INTENT_OPTIONS.find((x) => x.value === intent) || INTENT_OPTIONS[0];
    setEntityType(selected?.entityType || "shift");
    setPickerSearch("");
    setEntityId("");
  }, [panelMode, intent, jobType, screenOptionsFromMe]);

  useEffect(() => {
    let ignore = false;
    async function loadRefs() {
      setLoadingRefs(true);
      try {
        const shiftPath = me?.role === "ROOM" ? "/api/shifts?includeOffered=1&take=20" : "/api/shifts?take=20";
        const [shiftsResp, vehiclesResp] = await Promise.all([
          api.get(shiftPath, { token }).catch(() => ({ items: [] })),
          api.get("/api/vehicles", { token }).catch(() => []),
        ]);
        if (ignore) return;
        setRecentShifts(firstList(shiftsResp));
        setVehicles(firstList(vehiclesResp));
      } catch {
        if (!ignore) {
          setRecentShifts([]);
          setVehicles([]);
        }
      } finally {
        if (!ignore) setLoadingRefs(false);
      }
    }
    if (token && me?.role && ["ROOM", "COMPANY", "SUPER_ADMIN"].includes(String(me.role || ""))) {
      loadRefs();
    }
    return () => {
      ignore = true;
    };
  }, [token, me?.role]);

  useEffect(() => {
    if (chatEntityType === "screen") {
      setChatEntityId("");
      return;
    }
    if (chatEntityType === "shift" && !chatEntityId && recentShifts.length) {
      setChatEntityId(String(recentShifts[0].id));
      return;
    }
    if (chatEntityType === "vehicle" && !chatEntityId && vehicles.length) {
      setChatEntityId(String(vehicles[0].id));
    }
  }, [chatEntityType, chatEntityId, recentShifts, vehicles]);

  const targetOptions = useMemo(() => (activeEntityType === "vehicle" ? vehicles : activeEntityType === "screen" ? screenOptions : recentShifts), [activeEntityType, vehicles, recentShifts, screenOptions]);
  const filteredOptions = useMemo(() => filterItems(activeEntityType, targetOptions, pickerSearch), [activeEntityType, pickerSearch, targetOptions]);
  const selectedItem = useMemo(() => targetOptions.find((x) => String(x.id) === String(entityId)) || null, [targetOptions, entityId]);
  const selectedChatScreen = useMemo(() => screenOptions.find((x) => String(x.id) === String(chatScreenId)) || null, [screenOptions, chatScreenId]);
  const [chatSelection, setChatSelection] = useState(() => {
    const current = readCopilotSelection() || sharedContext?.selection || null;
    const path = sharedContext?.screenPath || screenOptions.find((x) => String(x.id) === String(chatScreenId))?.path || "";
    return selectionApplies(current, path) ? current : null;
  });
  const chatTargetOptions = useMemo(() => (chatEntityType === "vehicle" ? vehicles : chatEntityType === "shift" ? recentShifts : screenOptions), [chatEntityType, vehicles, recentShifts, screenOptions]);
  const selectedChatItem = useMemo(() => {
    if (chatEntityType === "screen") return selectedChatScreen;
    return chatTargetOptions.find((x) => String(x.id) === String(chatEntityId)) || null;
  }, [chatEntityType, chatTargetOptions, chatEntityId, selectedChatScreen]);
  useEffect(() => {
    const path = selectedChatScreen?.path || "";
    const sync = () => {
      const current = readCopilotSelection() || (sharedContext?.screenPath === path ? sharedContext?.selection : null);
      const next = selectionApplies(current, path) ? current : null;
      setChatSelection(next);
      if (next && canUseEntityChat(me?.role)) {
        const nextType = String(next.entityType || "");
        const nextId = Number(next.entityId || 0);
        if (["shift", "vehicle"].includes(nextType) && nextId > 0) {
          setChatEntityType(nextType);
          setChatEntityId(String(nextId));
          return;
        }
      }
      if (current == null && canUseEntityChat(me?.role)) {
        setChatEntityType((prev) => (prev === "screen" ? defaultChatEntityType(me?.role) : prev));
      }
    };
    sync();
    const evt = copilotSelectionEventName();
    window.addEventListener(evt, sync);
    return () => window.removeEventListener(evt, sync);
  }, [selectedChatScreen?.path, me?.role, sharedContext?.screenPath, sharedContext?.selection]);

  useEffect(() => {
    if (!chatMessages.length && !sharedContext?.screenPath) return;
    writeCopilotSharedState({
      messages: chatMessages,
      screenPath: selectedChatScreen?.path || sharedContext?.screenPath || hashPath,
      screenLabel: selectedChatScreen?.label || sharedContext?.screenLabel || "",
      role: me?.role || "",
      companyKind: me?.companyKind || "",
      selection: chatSelection || sharedContext?.selection || null,
      conversationState: chatConversationState,
    });
  }, [chatMessages, selectedChatScreen?.path, selectedChatScreen?.label, chatSelection, chatConversationState, hashPath, me?.role, me?.companyKind, sharedContext]);
  const effectiveChatEntityId = chatEntityType === "screen" ? chatScreenId : chatEntityId;
  const autoRunKey = useMemo(() => {
    if (panelMode !== "CHAT" || !selectedChatScreen || !effectiveChatEntityId) return "";
    return `${selectedChatScreen.id}|${selectedChatScreen.path}|${chatEntityType}|${effectiveChatEntityId}`;
  }, [panelMode, selectedChatScreen, effectiveChatEntityId, chatEntityType]);

  const runChat = useCallback(async (messageText = "", options = {}) => {
    const isAuto = Boolean(options?.auto);
    if (!token || !selectedChatScreen || !effectiveChatEntityId || chatRequestInFlightRef.current) return;
    chatRequestInFlightRef.current = true;
    if (isAuto) setAutoChatBusy(true);
    else setChatBusy(true);
    setChatErr("");
    try {
      if (String(messageText || "").trim()) {
        setChatMessages((prev) => [...prev, { role: "user", text: String(messageText || "").trim() }]);
      }
      const latestSelection = readCopilotSelection();
      const liveSelection = selectionApplies(latestSelection, selectedChatScreen?.path || "") ? latestSelection : chatSelection;
      const requestSelection = liveSelection || chatSelection || null;
      const uiSurface = captureCopilotUiSurface();
      const chatDiagnosticSignals = Array.isArray(requestSelection?.facts?.copilotSignals) ? requestSelection.facts.copilotSignals : [];
      const chatDiagnosticSummary = String(requestSelection?.facts?.copilotSummary || "");
      const chatDiagnosticSignalsVisible = Boolean(requestSelection?.facts && Array.isArray(requestSelection.facts.copilotSignals));
      const payload = await api.post("/api/ai/copilot", {
        intent: "CHAT_HELP",
        entityType: "screen",
        entityId: Number(selectedChatScreen.id),
        message: String(messageText || ""),
        conversationState: {
          ...(chatConversationState || {}),
          recentMessages: [
            ...chatMessages.slice(-7).map((m) => ({ role: m?.role || '', text: String(m?.text || '').slice(0, 280) })),
            ...(String(messageText || '').trim() ? [{ role: 'user', text: String(messageText || '').trim().slice(0, 280) }] : []),
          ].slice(-8),
          uiSurface,
          lastScreenPath: selectedChatScreen.path,
          lastScreenLabel: selectedChatScreen.label,
          // Legacy selection carry guard: selectedEntityType: chatSelection?.entityType || ""
          selectedLabel: requestSelection?.label || "",
          selectedEntityType: requestSelection?.entityType || "",
          // Legacy selection carry guard: selectedEntityId: Number(chatSelection?.entityId || 0) || null
          selectedEntityId: Number(requestSelection?.entityId || 0) || null,
          selectedSummary: requestSelection?.summary || "",
          selectedRecordSummary: requestSelection?.selectedRecordSummary || requestSelection?.summary || "",
          selectedRecordStatus: requestSelection?.selectedRecordStatus || "",
        },
        screenContext: {
          id: Number(selectedChatScreen.id),
          path: selectedChatScreen.path,
          label: selectedChatScreen.label,
          role: me?.role || "",
          companyKind: me?.companyKind || "",
          selectedLabel: requestSelection?.label || "",
          selectedSummary: requestSelection?.summary || "",
          selectedRecordSummary: requestSelection?.selectedRecordSummary || requestSelection?.summary || "",
          selectedRecordStatus: requestSelection?.selectedRecordStatus || "",
          selectedRecordLabel: requestSelection?.selectedRecordLabel || requestSelection?.label || "",
          helpContextSummary: requestSelection?.helpContextSummary || requestSelection?.summary || "",
          contextSummary: requestSelection?.contextSummary || requestSelection?.summary || "",
          selectedFields: Array.isArray(requestSelection?.fields) ? requestSelection.fields : [],
          selectedBadges: Array.isArray(requestSelection?.badges) ? requestSelection.badges : [],
          structuredFacts: requestSelection?.facts && typeof requestSelection.facts === "object" ? requestSelection.facts : null,
          liveFacts: requestSelection?.facts && typeof requestSelection.facts === "object" ? requestSelection.facts : null,
          selectedEntityType: requestSelection?.entityType || "",
          selectedEntityId: Number(requestSelection?.entityId || 0) || null,
          uiHints: uiSurface,
        },
        format: "json",
      }, { token });
      setChatConversationState(payload?.conversationState || null);
      const contextualSuggestedChips = Array.isArray(payload?.contextualSuggestedChips) && payload.contextualSuggestedChips.length
        ? payload.contextualSuggestedChips
        : Array.isArray(payload?.suggestedChips) ? payload.suggestedChips : [];
      setChatSuggestedChips(contextualSuggestedChips);
      setChatMessages((prev) => [...prev, {
        role: "assistant",
        text: payload?.reply || payload?.summary || "Yardım metni oluşmadı.",
        contextSummary: payload?.contextSummary || "",
        replyMode: payload?.replyMode || "SHORT",
        followUpPrompt: payload?.followUpPrompt || "",
        quickActions: payload?.quickActions || [],
        linkedGuides: payload?.linkedGuides || [],
        suggestedChips: payload?.suggestedChips || [],
        contextualSuggestedChips,
        questionType: payload?.questionType || "",
        questionLabel: payload?.questionLabel || "",
        intentConfidence: Number(payload?.intentConfidence || 0),
        intentSignals: payload?.intentSignals || [],
        qualityHints: payload?.qualityHints || null,
        uncertaintyMeta: payload?.uncertaintyMeta || null,
        responseSections: payload?.responseSections || [],
        costReasoning: payload?.costReasoning || null,
        continuity: payload?.continuity || null,
        routePlan: payload?.routePlan || null,
        actionPlanLabel: payload?.actionPlanLabel || '',
        contextPriority: payload?.contextPriority || null,
        evidenceConfidence: payload?.evidenceConfidence || "",
        activeTopic: payload?.activeTopic || "",
        activeTopicLabel: payload?.activeTopicLabel || "",
        roleBoundary: payload?.roleBoundary || "",
        sameRecordLikely: Boolean(payload?.sameRecordLikely),
        needsSelection: Boolean(payload?.needsSelection),
        bestNextAction: payload?.bestNextAction || "",
        activeEntityLabel: payload?.activeEntityLabel || payload?.entityLabel || "",
        screenLabel: payload?.screenLabel || selectedChatScreen?.label || "",
        generatedAt: payload?.generatedAt || "",
        roleMode: payload?.roleMode || "",
        diagnosticSignals: chatDiagnosticSignals,
        diagnosticSignalSummary: chatDiagnosticSummary,
        diagnosticSignalsVisible: chatDiagnosticSignalsVisible,
        diagnosticSignalEmptyText: "Bu ekranda ek kanıt sinyali yok",
      }]);
    } catch (e2) {
      setChatErr(String(e2?.message || e2));
    } finally {
      if (isAuto) setAutoChatBusy(false);
      else setChatBusy(false);
      chatRequestInFlightRef.current = false;
    }
  }, [token, selectedChatScreen, effectiveChatEntityId, chatConversationState, chatMessages, chatSelection, me?.role, me?.companyKind]);

  const shouldAutoRunChat = panelMode === "CHAT" && Boolean(selectedChatScreen) && Boolean(effectiveChatEntityId) && chatMessages.length === 0 && !chatBusy && !autoChatBusy && Boolean(autoRunKey) && lastAutoRunKeyRef.current !== autoRunKey;

  useEffect(() => {
    if (!shouldAutoRunChat || !autoRunKey) return;
    lastAutoRunKeyRef.current = autoRunKey;
    runChat("", { auto: true });
  }, [shouldAutoRunChat, autoRunKey, runChat]);

  useEffect(() => {
    if (panelMode !== "CHAT") {
      lastAutoRunKeyRef.current = "";
      setAutoChatBusy(false);
    }
  }, [panelMode]);

  function openChatGuide(guide) {
    setPanelMode("GUIDE");
    setJobType(guide?.jobType || "SCREEN_MENU_GUIDE");
    setGuideLevel(guide?.guideLevel || "SHORT");
    setEntityId(String(effectiveChatEntityId || chatScreenId || ""));
    setResult(null);
    setErr("");
  }

  async function onRun(e) {
    e?.preventDefault?.();
    setBusy(true);
    setErr("");
    setCopyMsg("");
    setResult(null);
    try {
      const body = panelMode === "GUIDE"
        ? {
            intent: "JOB_GUIDE",
            entityType: activeEntityType,
            entityId: Number(entityId),
            jobType,
            guideLevel,
            screenContext: activeEntityType === "screen" ? { path: selectedItem?.path || String(getPath() || "").split("?")[0], label: selectedItem?.label || "Ekran", role: me?.role || "", companyKind: me?.companyKind || "" } : undefined,
            format: "json",
          }
        : {
            intent,
            entityType: activeEntityType,
            entityId: Number(entityId),
            format: "json",
          };
      const payload = await api.post("/api/ai/copilot", body, { token });
      setResult(payload);
      setHistory(saveHistory({
        at: nowIsoTR(),
        panelMode,
        intent: panelMode === "GUIDE" ? "JOB_GUIDE" : intent,
        jobType: panelMode === "GUIDE" ? jobType : null,
        entityType: activeEntityType,
        entityId: Number(entityId),
        summary: payload?.summary || "",
        severity: payload?.severity || "",
      }));
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  function restoreHistory(entry) {
    if (entry?.panelMode === "GUIDE") {
      setPanelMode("GUIDE");
      setJobType(entry.jobType || "OFFER_REVIEW");
      setGuideLevel("SHORT");
    } else {
      setPanelMode("ADVANCED");
      setIntent(entry.intent || "SHIFT_SUMMARY");
    }
    setEntityType(entry.entityType || "shift");
    setEntityId(String(entry.entityId || ""));
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setCopyMsg("Kopyalandı.");
      setTimeout(() => setCopyMsg(""), 1500);
    } catch {
      setCopyMsg("Kopyalama başarısız.");
      setTimeout(() => setCopyMsg(""), 1500);
    }
  }


  function withRouteParams(path, params) {
    const base = String(path || '');
    const rows = Object.entries(params || {}).filter(([, v]) => v != null && `${v}` !== '');
    if (!rows.length) return base;
    const query = rows.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    return `${base}${base.includes('?') ? '&' : '?'}${query}`;
  }

  function runAskAction(text) {
    const message = String(text || '').trim();
    if (!message) return;
    runChat(message);
  }



  function openGuideAction(action) {
    const path = resolveGuideRoute(me, action?.routeKey);
    if (!path) {
      setCopyMsg("Bu bağlantı bu rolde açılamıyor.");
      setTimeout(() => setCopyMsg(""), 1800);
      return;
    }
    navigate(withRouteParams(path, action?.routeParams));
  }

  function clearEntryHint() {
    try { sessionStorage.removeItem(ENTRY_HINT_KEY); } catch { /* no-op */ }
    setEntryHint(null);
  }

  function entryHintQuickActions(hint) {
    const actions = [];
    const title = String(hint?.title || "");
    if (hint?.suggestedRouteKey) {
      actions.push({ label: "İlgili ekrana git", routeKey: hint.suggestedRouteKey });
    }
    if (hint?.vehicleId || /konum|canlılık/i.test(title)) {
      actions.push({ label: "Canlı Takibi aç", routeKey: "ROOM_MAP" });
    }
    if (hint?.driverId || /oturum|izin/i.test(title)) {
      actions.push({ label: "Sürücüleri aç", routeKey: "ROOM_DRIVERS" });
    }
    if (hint?.vehicleId) {
      actions.push({ label: "Araçları aç", routeKey: "ROOM_VEHICLES" });
    }
    return actions.filter((x, idx, arr) => arr.findIndex((y) => y.routeKey === x.routeKey && y.label === x.label) === idx);
  }

  function roomHintPrompt(mode = "explain") {
    if (!entryHint) return "";
    const title = String(entryHint.title || "Operasyon sağlığı uyarısı");
    const detail = String(entryHint.detail || "");
    if (mode === "note") return `Operasyon Sağlığı ekranından geldim. Başlık: ${title}. Detay: ${detail}. Taşımacılık Firması için paylaşılabilir kısa operasyon notu hazırla.`;
    if (mode === "driver") return `Operasyon Sağlığı ekranından geldim. Başlık: ${title}. Detay: ${detail}. Sürücüye sade Türkçe ile ne söylemem gerektiğini yaz.`;
    if (mode === "next") return `Operasyon Sağlığı ekranından geldim. Başlık: ${title}. Detay: ${detail}. Şimdi ne yapmam gerektiğini sade Türkçe ile söyle.`;
    return `Operasyon Sağlığı ekranından geldim. Başlık: ${title}. Detay: ${detail}. Bunun ne anlama geldiğini sade Türkçe ile açıkla.`;
  }

  function askEntryHint(mode = "explain") {
    if (!entryHint) return;
    setPanelMode("CHAT");
    runChat(roomHintPrompt(mode));
  }

  return (
    <div className="wrap wrap--fluid" style={{ display: "grid", gap: 10 }}>
      <div className="card">
        <div className="title">{COPILOT_TERMINAL_TITLE}</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 700 }}>
          {COPILOT_PERSONA.assistantDisplayName} · {COPILOT_PERSONA.assistantSubtitle}
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          {COPILOT_TERMINAL.subtitle}
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          {COPILOT_TERMINAL.readonlyBoundary}
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          {COPILOT_TERMINAL.drawerSeparationNote}
        </div>
      </div>

      {entryHint ? (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>Operasyon Sağlığından geldin</div>
          <div className="muted">{entryHint.title || "Operasyon sağlığı uyarısı"}</div>
          <div>{entryHint.detail || "Kısa açıklama yok."}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => askEntryHint("explain")}>Bunu açıkla</button>
            <button type="button" onClick={() => askEntryHint("next")}>Şimdi ne yapayım?</button>
            <button type="button" onClick={() => askEntryHint("driver")}>Sürücüye ne söyleyeyim?</button>
            <button type="button" onClick={() => askEntryHint("note")}>Taşımacılık Firması notu hazırla</button>
            <button type="button" onClick={clearEntryHint}>Kapat</button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {entryHintQuickActions(entryHint).map((action) => (
              <button key={`${action.routeKey}:${action.label}`} type="button" onClick={() => openGuideAction(action)}>{action.label}</button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PANEL_MODES.map((x) => (
            <button
              key={x.value}
              type="button"
              onClick={() => { setPanelMode(x.value); setResult(null); setErr(""); }}
              style={panelMode === x.value ? { background: "#175cd3", color: "#fff" } : {}}
            >
              {x.label}
            </button>
          ))}
        </div>

        {panelMode === "CHAT" ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div className="muted">
              Sohbet modu önce soruyu alır. Bağlam mümkünse otomatik okunur; gerekirse aşağıdaki düğmeyle gelişmiş ayarlardan değiştirirsin.
            </div>

            {!chatMessages.length ? (
              <div className="card" style={{ display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 800 }}>Başlangıç soruları</div>
                <div className="muted">Sadece önizleme analizi için kısa bir başlangıç seçebilirsin.</div>
                <SuggestedChips items={COPILOT_TERMINAL.starterChips} busy={chatBusy || autoChatBusy} onPick={runChat} />
              </div>
            ) : null}

            <div className="card" style={{ padding: 12, display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
              <div className="muted" style={{ display: "grid", gap: 4 }}>
                <div><b>Bağlam:</b> {selectedChatScreen ? humanizeUserFacingText(screenOptionLabel(selectedChatScreen)) : "-"}{chatSelection?.label ? ` • ${humanizeUserFacingText(chatSelection.label)}${selectionSummaryForDisplay(chatSelection) ? ` • ${selectionSummaryForDisplay(chatSelection)}` : ""}` : selectedChatItem && chatEntityType !== "screen" ? ` • ${humanizeUserFacingText(optionLabel(chatEntityType, selectedChatItem))}` : ""}</div>
                <div>Mevcut ekran ve seçili kayıt otomatik okunur. Gerekirse gelişmiş sekmesinden değiştir.</div>
              </div>
              <button type="button" onClick={() => setPanelMode("ADVANCED")}>Bağlamı değiştir</button>
            </div>

            <ChatThread messages={chatMessages} onOpen={openGuideAction} onGuide={openChatGuide} onAsk={runAskAction} onCopy={copyText} />
            {autoChatBusy && !chatBusy ? <div className="muted">Bağlam okunuyor. Birkaç saniye sonra gönderebilirsin.</div> : null}
            <ChatInputBox busy={chatBusy || autoChatBusy} sending={chatBusy} onSend={runChat} />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {chatMessages.length ? (
                <details>
                  <summary style={{ cursor: "pointer" }}>Kalite özeti</summary>
                  <div style={{ marginTop: 8 }}>
                    <ChatQualitySummary roleMode={me?.role} messages={chatMessages} currentScreenLabel={selectedChatScreen?.label || ""} />
                  </div>
                </details>
              ) : null}
              {chatSuggestedChips.length ? (
                <details>
                  <summary style={{ cursor: "pointer" }}>Takip önerileri</summary>
                  <div style={{ marginTop: 8 }}>
                    <SuggestedChips items={chatSuggestedChips} busy={chatBusy || autoChatBusy} onPick={runChat} />
                  </div>
                </details>
              ) : null}
            </div>

            {chatErr ? <div className="muted" style={{ color: "crimson" }}>{chatErr}</div> : null}
          </div>
        ) : (

        <form onSubmit={onRun} style={{ display: "grid", gap: 10 }}>
          {panelMode === "ADVANCED" ? (
            <div className="card" style={{ display: "grid", gap: 8 }}>
              <div className="title" style={{ fontSize: 16 }}>Sohbet bağlamı</div>
              <div className="muted">Sohbet sekmesi bu seçimleri otomatik kullanır. Gerekirse burada değiştir.</div>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <label className="muted">
                  Ekran
                  <select value={chatScreenId} onChange={(e) => { userChangedChatContextRef.current = true; setChatScreenId(e.target.value); }}>
                    {screenOptions.map((x) => (
                      <option key={x.id} value={x.id}>{screenOptionLabel(x)}</option>
                    ))}
                  </select>
                </label>

                {canUseEntityChat(me?.role) ? (
                  <label className="muted">
                    Kayıt türü
                    <select value={chatEntityType} onChange={(e) => { userChangedChatContextRef.current = true; setChatEntityType(e.target.value); setChatEntityId(""); }}>
                      <option value="shift">Vardiya</option>
                      <option value="vehicle">Araç</option>
                      <option value="screen">Sadece ekran</option>
                    </select>
                  </label>
                ) : null}

                {chatEntityType !== "screen" ? (
                  <label className="muted">
                    Kayıt
                    <select value={chatEntityId} onChange={(e) => { userChangedChatContextRef.current = true; setChatEntityId(e.target.value); }}>
                      <option value="">Seç...</option>
                      {chatTargetOptions.map((x) => (
                        <option key={x.id} value={x.id}>{optionLabel(chatEntityType, x)}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}

          {panelMode === "GUIDE" ? (
            <>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <label className="muted">
                  Hangi işi yapıyorsun?
                  <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
                    {GUIDE_JOB_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                </label>

                <label className="muted">
                  Nasıl anlatalım?
                  <select value={guideLevel} onChange={(e) => setGuideLevel(e.target.value)}>
                    {GUIDE_LEVEL_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                </label>

                <label className="muted">
                  Kayıt türü
                  <input value={entityTypeLabel(activeEntityType)} readOnly />
                </label>

                <label className="muted">
                  Kayıt numarası
                  <input value={entityId} onChange={(e) => setEntityId(e.target.value.replace(/[^0-9]/g, ""))} placeholder={activeEntityType === "vehicle" ? "Araç numarası" : "Vardiya numarası"} />
                </label>
              </div>

              <div className="muted" style={{ marginTop: -4 }}>
                <b>{selectedJob.label}</b> — {selectedJob.helper}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <label className="muted">
                  Analiz türü
                  <select value={intent} onChange={(e) => setIntent(e.target.value)}>
                    {INTENT_OPTIONS.map((x) => (
                      <option key={x.value} value={x.value}>{x.label}</option>
                    ))}
                  </select>
                </label>

                <label className="muted">
                  Kayıt türü
                  <input value={entityTypeLabel(activeEntityType)} readOnly />
                </label>

                <label className="muted">
                  Kayıt numarası
                  <input value={entityId} onChange={(e) => setEntityId(e.target.value.replace(/[^0-9]/g, ""))} placeholder={activeEntityType === "vehicle" ? "Araç numarası" : "Vardiya numarası"} />
                </label>
              </div>

              <div className="muted" style={{ marginTop: -4 }}>
                <b>{selectedIntent.label}</b> — {selectedIntent.helper}
              </div>
            </>
          )}

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label className="muted">
              Hızlı seçim arama {loadingRefs ? "(yükleniyor...)" : ""}
              <input value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder={activeEntityType === "vehicle" ? "plaka / durum ara" : activeEntityType === "screen" ? "ekran / menü ara" : "durum / firma / taşımacılık firması ara"} />
            </label>

            <label className="muted">
              Hızlı seçim
              <select value={entityId} onChange={(e) => setEntityId(e.target.value)}>
                <option value="">Seç...</option>
                {filteredOptions.map((x) => (
                  <option key={x.id} value={x.id}>
                    {optionLabel(activeEntityType, x)}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" disabled={busy || !entityId} style={{ alignSelf: "end" }}>
              {busy ? "Çalışıyor..." : panelMode === "GUIDE" ? "Rehberi Aç" : "Analiz Et"}
            </button>
          </div>

          {selectedItem ? (
            <div className="muted">
              Seçili kayıt: <b>{optionLabel(activeEntityType, selectedItem)}</b>
            </div>
          ) : null}
          {chatSelection?.label ? (
            <div className="muted">
              Ekrandan gelen seçim: <b>{chatSelection.label}</b>{chatSelection?.summary && chatSelection.summary !== chatSelection.label ? ` • ${chatSelection.summary}` : ""}
            </div>
          ) : null}

          <div className="muted">
            Desteklenen alanlar: Taşımacılık Firması, Hizmet Alan Firma, okul, organizasyon ve yönetim. Sürücü, personel ve veli için ekran ve buton rehberi sade modda açıktır. Yönetim alanı için ek güvenlik doğrulaması gerekir.
          </div>

          {err ? <div className="muted" style={{ color: "crimson" }}>{err}</div> : null}
        </form>
        )}
      </div>

      {result?.mode === "JOB_GUIDE" ? (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div>
            <div className="title">Rehber Sonucu</div>
            <div className="muted" style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span>Yanıt kaynağı: <b>Sefer Abi</b></span>
              <span>Anlatım düzeyi: <b>{guideLevelLabel(result.guideLevel)}</b></span>
              <span>Kayıt: <b>{humanizeUserFacingText(result.entityLabel, `${entityTypeLabel(result.entityType)} ${result.entityId ? `#${result.entityId}` : ""}`)}</b></span>
            </div>
          </div>

          <JobGuideHeader result={result} />

          {result.screenExplanation ? (
            <div>
              <div className="title" style={{ fontSize: 16 }}>Bu ekran ne için var?</div>
              <div className="muted" style={{ marginTop: 8 }}>{humanizeUserFacingText(result.screenExplanation)}</div>
            </div>
          ) : null}

          <MenuPurposeCard data={result.menuPurpose} />
          <BeforeYouStartCard label={result.precheckLabel} state={result.precheckState} items={result.beforeYouStart} />
          <QuickActionsCard items={result.quickActions} onOpen={openGuideAction} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => copyText(result.summary || "")}>Kopyala özet</button>
            {copyMsg ? <span className="muted">{copyMsg}</span> : null}
          </div>

          <StepByStepCard steps={result.stepByStep} />
          <ButtonGuidesCard items={result.buttonGuides} />
          <ScreenMenusCard items={result.screenMenus} onOpen={openGuideAction} />
          <LockedReasonCard items={result.lockedActionReasons} />
          <CommonMistakesCard items={result.commonMistakes} />
          <DoneChecklistCard items={result.doneChecklist} />
          <IfStuckCard items={result.ifStuck} onOpen={openGuideAction} />
          <SimpleTermsCard items={result.simpleTerms} />
          <CopyOutputsCard data={result.copyOutputs} onCopy={copyText} />
        </div>
      ) : null}

      {result && result.mode !== "JOB_GUIDE" ? (
        <CopilotAdvancedResultCard
          result={result}
          role={me?.role}
          copyText={copyText}
          copyMsg={copyMsg}
        />
      ) : null}

      <div className="card">
        <details>
          <summary className="title" style={{ fontSize: 16, cursor: "pointer" }}>Son 5 çalışma</summary>
          {history.length ? (
            <ul style={{ marginTop: 8 }}>
              {history.map((x, i) => (
                <li key={`${x.panelMode}:${x.intent}:${x.jobType}:${x.entityType}:${x.entityId}:${i}`}>
                  <button type="button" onClick={() => restoreHistory(x)}>
                    {x.panelMode === "GUIDE" ? (GUIDE_JOB_OPTIONS.find((g) => g.value === x.jobType)?.label || humanizeUserFacingText(x.jobType)) : intentLabel(x.intent)} • {entityTypeLabel(x.entityType)} {x.entityId ? `#${x.entityId}` : ""}
                  </button>
                  <span className="muted"> {x.severity ? `(${x.severity})` : ""} {x.summary ? `- ${x.summary}` : ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="muted" style={{ marginTop: 8 }}>Henüz geçmiş yok.</div>
          )}
        </details>
      </div>

      {panelMode === "ADVANCED" ? (
        <div className="card">
          <details>
            <summary className="title" style={{ fontSize: 16, cursor: "pointer" }}>Kısa Not</summary>
            <div className="muted" style={{ marginTop: 8 }}>
              Rehber modu, Sefer Abi’nin sade Türkçe iş rehberidir. Sistem salt okunur ve öneri odaklı kalır; yapılan yardım sorgusu işlem kaydına eklenir.
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}

// M46.6 compat markers: Gelişmiş | İş Rehberi | Başlamadan önce kontrol | Buradan aç | Bu neden kapalı? | Takıldıysan buraya git | Hazır metin



// M46.6-T compat markers: Konum kaynağı rehberi | Cihaz GPS'i ekleme | GPS sinyal teşhisi | sürücünün telefon GPS'i | cihaz GPS'i | konum kaynağı

// M46.6-C compat markers: Bu ekran ne için var? | Bu ekrandaki butonlar | Bu menü ne için var? | SCREEN_MENU_GUIDE | BUTTON_ACTION_GUIDE | ROLE_HELP_GUIDE | Copilot
