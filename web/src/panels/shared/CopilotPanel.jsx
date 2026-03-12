import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { getPath, navigate } from "../../router";
import { useSession } from "../../state/session";
import { companyPath } from "../../utils/paths";
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
import SuggestedChips from "../../components/copilot/SuggestedChips";

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

const HISTORY_KEY = "copilot.history.m46_6_a";

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


function screenOptionLabel(item) {
  if (!item) return "";
  return `${item.label || "Ekran"} • ${item.path || ""}`;
}

function normalizeRoleGuideKey(me) {
  const role = String(me?.role || "");
  if (role === "COMPANY") {
    const kind = String(me?.companyKind || "").toUpperCase();
    if (kind === "SCHOOL") return "SCHOOL";
    if (kind === "ORGANIZATION") return "ORGANIZATION";
    return "COMPANY";
  }
  return role;
}

function buildScreenOptions(me) {
  const key = normalizeRoleGuideKey(me);
  const defs = {
    ROOM: [
      { id: 1101, path: "/room/map", label: "Canlı Takip" },
      { id: 1102, path: "/room/offers", label: "Teklifler" },
      { id: 1103, path: "/room/shifts", label: "Vardiyalar" },
      { id: 1104, path: "/room/vehicles", label: "Araçlar" },
      { id: 1105, path: "/room/drivers", label: "Sürücüler" },
      { id: 1106, path: "/room/agreements", label: "Sözleşmeler" },
      { id: 1107, path: "/room/copilot", label: "Copilot" },
    ],
    COMPANY: [
      { id: 2101, path: "/company", label: "Planlama Merkezi" },
      { id: 2102, path: "/company/shifts", label: "Vardiyalar" },
      { id: 2103, path: "/company/agreements", label: "Sözleşmeler" },
      { id: 2104, path: "/company/access-links", label: "Personel Link" },
      { id: 2105, path: "/company/copilot", label: "Copilot" },
    ],
    SCHOOL: [
      { id: 2101, path: "/school", label: "Okul Merkezi" },
      { id: 2102, path: "/school/shifts", label: "Vardiyalar" },
      { id: 2103, path: "/school/agreements", label: "Sözleşmeler" },
      { id: 2201, path: "/school/parents", label: "Parent Link" },
      { id: 2105, path: "/school/copilot", label: "Copilot" },
    ],
    ORGANIZATION: [
      { id: 2101, path: "/organization", label: "Organizasyon Merkezi" },
      { id: 2301, path: "/organization/plans", label: "Yer Planları" },
      { id: 2102, path: "/organization/shifts", label: "Vardiyalar" },
      { id: 2103, path: "/organization/agreements", label: "Sözleşmeler" },
      { id: 2105, path: "/organization/copilot", label: "Copilot" },
    ],
    DRIVER: [
      { id: 3101, path: "/driver/today", label: "Bugün" },
      { id: 3102, path: "/driver/route", label: "Rota" },
      { id: 3103, path: "/driver/map", label: "Harita" },
      { id: 3104, path: "/driver/copilot", label: "Copilot" },
    ],
    PERSONEL: [
      { id: 4101, path: "/personel/live", label: "Canlı" },
      { id: 4102, path: "/personel/my", label: "Servisim" },
      { id: 4103, path: "/personel/copilot", label: "Copilot" },
    ],
    PARENT: [
      { id: 5101, path: "/parent/live", label: "Canlı" },
      { id: 5102, path: "/parent/copilot", label: "Copilot" },
    ],
    SUPER_ADMIN: [
      { id: 6101, path: "/superadmin", label: "Overview" },
      { id: 6102, path: "/superadmin/companies", label: "Companies" },
      { id: 6103, path: "/superadmin/audit", label: "Audit" },
      { id: 6104, path: "/superadmin/copilot", label: "Copilot" },
    ],
  };
  return defs[key] || [];
}

function firstList(resp) {
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.items)) return resp.items;
  return [];
}

function safeHistoryLoad() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entry) {
  try {
    const prev = safeHistoryLoad();
    const dedupeKey = `${entry.panelMode}:${entry.intent || "-"}:${entry.jobType || "-"}:${entry.entityType}:${entry.entityId}`;
    const next = [entry, ...prev.filter((x) => `${x.panelMode}:${x.intent || "-"}:${x.jobType || "-"}:${x.entityType}:${x.entityId}` !== dedupeKey)].slice(0, 5);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

function severityStyle(severity) {
  const map = {
    CRITICAL: { color: "#fff", background: "#b42318" },
    WARN: { color: "#fff", background: "#b54708" },
    INFO: { color: "#fff", background: "#175cd3" },
    OK: { color: "#fff", background: "#027a48" },
  };
  return map[severity] || { color: "#fff", background: "#667085" };
}

function signalStyle(state) {
  const map = {
    GOOD: { color: "#027a48", border: "1px solid #12b76a", background: "#ecfdf3" },
    WARN: { color: "#b54708", border: "1px solid #f79009", background: "#fffaeb" },
    BLOCKED: { color: "#b42318", border: "1px solid #f04438", background: "#fef3f2" },
    INFO: { color: "#175cd3", border: "1px solid #53b1fd", background: "#eff8ff" },
  };
  return map[state] || { color: "#344054", border: "1px solid #d0d5dd", background: "#f8fafc" };
}

function decisionTone(value) {
  if (["OK", "READY", "FRESH", "SUFFICIENT"].includes(String(value || ""))) return signalStyle("GOOD");
  if (["ATTENTION", "REVIEW_NEEDED", "STALE", "PARTIAL"].includes(String(value || ""))) return signalStyle("WARN");
  if (["BLOCKED", "NOT_READY", "WEAK"].includes(String(value || ""))) return signalStyle("BLOCKED");
  return signalStyle("INFO");
}

function confidencePct(value) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "-";
}

function optionLabel(entityType, item) {
  if (!item) return "";
  if (entityType === "screen") return screenOptionLabel(item);
  if (entityType === "vehicle") {
    return `#${item.id} • ${item.plate || "plaka?"} • ${item.status || "-"}`;
  }
  return `#${item.id} • ${item.status || "-"} • ${item.company?.name || item.room?.name || "vardiya"}`;
}

function filterItems(entityType, list, search) {
  const q = String(search || "").trim().toLowerCase();
  if (!q) return list;
  return (Array.isArray(list) ? list : []).filter((item) => optionLabel(entityType, item).toLowerCase().includes(q));
}

function ReferenceList({ data }) {
  const entries = Object.entries(data || {});
  if (!entries.length) return <div className="muted">Referans görünmüyor.</div>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {entries.map(([k, v]) => (
        <li key={k}>
          <b>{k}</b>: {Array.isArray(v) ? (v.length ? v.join(", ") : "-") : (v ?? "-").toString()}
        </li>
      ))}
    </ul>
  );
}

function DecisionBadge({ label, value }) {
  return (
    <div style={{ borderRadius: 999, padding: "6px 10px", fontWeight: 700, display: "inline-flex", gap: 6, alignItems: "center", ...decisionTone(value) }}>
      <span>{label}</span>
      <span>{value || "-"}</span>
    </div>
  );
}

function priorityTone(score) {
  if (Number(score || 0) >= 85) return signalStyle("BLOCKED");
  if (Number(score || 0) >= 60) return signalStyle("WARN");
  return signalStyle("GOOD");
}

function actionPriorityLabel(action) {
  const score = Number(action?.priorityScore || 0);
  return `${action?.priority || "-"} • ${score || 0}`;
}

function resolveGuideRoute(me, routeKey) {
  const role = String(me?.role || "");
  const key = String(routeKey || "");
  if (key.startsWith("/")) return key;
  if (role === "ROOM") {
    if (key === "ROOM_OFFERS") return "/room/offers";
    if (key === "ROOM_SHIFTS") return "/room/shifts";
    if (key === "ROOM_VEHICLES") return "/room/vehicles";
    if (key === "ROOM_DRIVERS") return "/room/drivers";
    if (key === "ROOM_AGREEMENTS") return "/room/agreements";
    if (key === "ROOM_COPILOT") return "/room/copilot";
  }
  if (role === "COMPANY") {
    if (key === "COMPANY_SHIFTS") return companyPath(me, "/shifts");
    if (key === "COMPANY_AGREEMENTS") return companyPath(me, "/agreements");
    if (key === "COMPANY_COPILOT") return companyPath(me, "/copilot");
  }
  if (role === "SUPER_ADMIN") {
    if (key === "SUPERADMIN_OVERVIEW") return "/superadmin";
    if (key === "SUPERADMIN_COPILOT") return "/superadmin/copilot";
  }
  return "";
}


export default function CopilotPanel() {
  const { token, me } = useSession();
  const [panelMode, setPanelMode] = useState("CHAT");
  const [intent, setIntent] = useState("SHIFT_SUMMARY");
  const [jobType, setJobType] = useState("OFFER_REVIEW");
  const [guideLevel, setGuideLevel] = useState("SHORT");
  const [entityType, setEntityType] = useState("shift");
  const [entityId, setEntityId] = useState("");
  const [pickerSearch, setPickerSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [recentShifts, setRecentShifts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [screenOptions, setScreenOptions] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [history, setHistory] = useState([]);
  const [copyMsg, setCopyMsg] = useState("");
  const [chatScreenId, setChatScreenId] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatErr, setChatErr] = useState("");
  const [chatConversationState, setChatConversationState] = useState(null);
  const [chatSuggestedChips, setChatSuggestedChips] = useState([]);

  useEffect(() => {
    setHistory(safeHistoryLoad());
  }, []);

  useEffect(() => {
    const opts = buildScreenOptions(me);
    setScreenOptions(opts);
    const current = String(getPath() || "").split("?")[0];
    if (opts.some((x) => x.path === current) && activeEntityType === "screen") {
      const match = opts.find((x) => x.path === current);
      if (match) setEntityId(String(match.id));
    }
  }, [me?.role, me?.companyKind]);
  useEffect(() => {
    const opts = buildScreenOptions(me);
    const current = String(getPath() || "").split("?")[0];
    const match = opts.find((x) => x.path === current) || opts[0] || null;
    if (match) setChatScreenId((prev) => prev || String(match.id));
  }, [me?.role, me?.companyKind]);

  useEffect(() => {
    setChatMessages([]);
    setChatConversationState(null);
    setChatSuggestedChips([]);
    setChatErr("");
  }, [chatScreenId]);

  useEffect(() => {
    if (panelMode === "GUIDE") {
      const selected = GUIDE_JOB_OPTIONS.find((x) => x.value === jobType) || GUIDE_JOB_OPTIONS[0];
      const nextType = selected?.entityType || "shift";
      setEntityType(nextType);
      setPickerSearch("");
      if (nextType === "screen") {
        const current = String(getPath() || "").split("?")[0];
        const match = buildScreenOptions(me).find((x) => x.path === current);
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
  }, [panelMode, intent, jobType]);

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

  const selectedIntent = useMemo(() => INTENT_OPTIONS.find((x) => x.value === intent) || INTENT_OPTIONS[0], [intent]);
  const selectedJob = useMemo(() => GUIDE_JOB_OPTIONS.find((x) => x.value === jobType) || GUIDE_JOB_OPTIONS[0], [jobType]);
  const activeEntityType = panelMode === "GUIDE" ? selectedJob.entityType : selectedIntent.entityType;
  const targetOptions = useMemo(() => (activeEntityType === "vehicle" ? vehicles : activeEntityType === "screen" ? screenOptions : recentShifts), [activeEntityType, vehicles, recentShifts, screenOptions]);
  const filteredOptions = useMemo(() => filterItems(activeEntityType, targetOptions, pickerSearch), [activeEntityType, pickerSearch, targetOptions]);
  const selectedItem = useMemo(() => targetOptions.find((x) => String(x.id) === String(entityId)) || null, [targetOptions, entityId]);
  const selectedChatScreen = useMemo(() => screenOptions.find((x) => String(x.id) === String(chatScreenId)) || null, [screenOptions, chatScreenId]);

  async function runChat(messageText = "") {
    if (!token || !selectedChatScreen) return;
    setChatBusy(true);
    setChatErr("");
    try {
      if (String(messageText || "").trim()) {
        setChatMessages((prev) => [...prev, { role: "user", text: String(messageText || "").trim() }]);
      }
      const payload = await api.post("/api/ai/copilot", {
        intent: "CHAT_HELP",
        entityType: "screen",
        entityId: Number(selectedChatScreen.id),
        message: String(messageText || ""),
        conversationState: chatConversationState || undefined,
        screenContext: {
          path: selectedChatScreen.path,
          label: selectedChatScreen.label,
          role: me?.role || "",
          companyKind: me?.companyKind || "",
        },
        format: "json",
      }, { token });
      setChatConversationState(payload?.conversationState || null);
      setChatSuggestedChips(Array.isArray(payload?.suggestedChips) ? payload.suggestedChips : []);
      setChatMessages((prev) => [...prev, {
        role: "assistant",
        text: payload?.reply || payload?.summary || "Yardım metni oluşmadı.",
        contextSummary: payload?.contextSummary || "",
        replyMode: payload?.replyMode || "SHORT",
        followUpPrompt: payload?.followUpPrompt || "",
        quickActions: payload?.quickActions || [],
        linkedGuides: payload?.linkedGuides || [],
      }]);
    } catch (e2) {
      setChatErr(String(e2?.message || e2));
    } finally {
      setChatBusy(false);
    }
  }

  useEffect(() => {
    if (panelMode === "CHAT" && selectedChatScreen && !chatMessages.length && !chatBusy) {
      runChat("");
    }
  }, [panelMode, selectedChatScreen?.id, token]);

  function openChatGuide(guide) {
    setPanelMode("GUIDE");
    setJobType(guide?.jobType || "SCREEN_MENU_GUIDE");
    setGuideLevel(guide?.guideLevel || "SHORT");
    setEntityId(String(chatScreenId || ""));
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
        at: new Date().toISOString(),
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


  function openGuideAction(action) {
    const path = resolveGuideRoute(me, action?.routeKey);
    if (!path) {
      setCopyMsg("Bu bağlantı bu rolde açılamıyor.");
      setTimeout(() => setCopyMsg(""), 1800);
      return;
    }
    navigate(path);
  }

  return (
    <div className="wrap" style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div className="title">Copilot</div>
        <div className="muted" style={{ marginTop: 6 }}>
          Sohbet modu kısa cevap verir ve ilgili yere götürür. Rehber modu çok sade Türkçe ile adım gösterir. Gelişmiş mod mevcut copilot analizini korur. Sistem read-only / suggestion-first kalır.
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
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
          <div style={{ display: "grid", gap: 12 }}>
            <div className="muted">
              Sohbet modu seçtiğin ekranı bilir, kısa cevap verir ve gerekirse ilgili yere götürür.
            </div>

            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
              <label className="muted">
                Hangi ekran hakkında konuşalım?
                <select value={chatScreenId} onChange={(e) => setChatScreenId(e.target.value)}>
                  {screenOptions.map((x) => (
                    <option key={x.id} value={x.id}>{screenOptionLabel(x)}</option>
                  ))}
                </select>
              </label>
              <div className="muted" style={{ alignSelf: "end" }}>
                Seçili bağlam: <b>{selectedChatScreen ? screenOptionLabel(selectedChatScreen) : "-"}</b>
              </div>
            </div>

            <SuggestedChips items={chatSuggestedChips} busy={chatBusy} onPick={runChat} />
            <ChatThread messages={chatMessages} onOpen={openGuideAction} onGuide={openChatGuide} />
            <ChatInputBox busy={chatBusy} onSend={runChat} />
            {chatErr ? <div className="muted" style={{ color: "crimson" }}>{chatErr}</div> : null}
          </div>
        ) : (

        <form onSubmit={onRun} style={{ display: "grid", gap: 12 }}>
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
                  <input value={activeEntityType} readOnly />
                </label>

                <label className="muted">
                  Kayıt ID
                  <input value={entityId} onChange={(e) => setEntityId(e.target.value.replace(/[^0-9]/g, ""))} placeholder={activeEntityType === "vehicle" ? "vehicleId" : "shiftId"} />
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
                  <input value={activeEntityType} readOnly />
                </label>

                <label className="muted">
                  Kayıt ID
                  <input value={entityId} onChange={(e) => setEntityId(e.target.value.replace(/[^0-9]/g, ""))} placeholder={activeEntityType === "vehicle" ? "vehicleId" : "shiftId"} />
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
              <input value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder={activeEntityType === "vehicle" ? "plaka / durum ara" : activeEntityType === "screen" ? "ekran / menü ara" : "durum / şirket / room ara"} />
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

          <div className="muted">
            Desteklenen roller: ROOM / COMPANY / SCHOOL / ORGANIZATION / SUPER_ADMIN. DRIVER / PERSONEL / PARENT için ekran ve buton rehberi sade modda açıktır. ROOM ve SUPER_ADMIN için ek güvenlik doğrulaması gerekir.
          </div>

          {err ? <div className="muted" style={{ color: "crimson" }}>{err}</div> : null}
        </form>
        )}
      </div>

      {result?.mode === "JOB_GUIDE" ? (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div>
            <div className="title">Rehber Sonucu</div>
            <div className="muted" style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span>Provider: <b>{result.provider || "-"}</b></span>
              <span>Versiyon: <b>{result.copilotVersion || "-"}</b></span>
              <span>Seviye: <b>{result.guideLevel || "-"}</b></span>
              <span>Kayıt: <b>{result.entityLabel || `${result.entityType || "entity"} #${result.entityId || "-"}`}</b></span>
            </div>
          </div>

          <JobGuideHeader result={result} />

          {result.screenExplanation ? (
            <div>
              <div className="title" style={{ fontSize: 16 }}>Bu ekran ne için var?</div>
              <div className="muted" style={{ marginTop: 8 }}>{result.screenExplanation}</div>
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
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div>
            <div className="title">Sonuç</div>
            <div className="muted" style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span>Provider: <b>{result.provider || "-"}</b></span>
              <span>Mode: <b>{result.mode || "-"}</b></span>
              <span>Scope: <b>{result.scope?.role || me?.role || "-"}</b></span>
              <span>Versiyon: <b>{result.copilotVersion || "-"}</b></span>
              <span>Oluşturma: <b>{result.generatedAt ? new Date(result.generatedAt).toLocaleString("tr-TR") : "-"}</b></span>
              <span>Güven: <b>{confidencePct(result.confidence)}</b></span>
              <span style={{ ...severityStyle(result.severity), padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>{result.severity || "-"}</span>
            </div>
            {result.providerSummary ? (
              <div className="muted" style={{ marginTop: 6 }}>{result.providerSummary}</div>
            ) : null}
          </div>

          <div className="muted" style={{ display: "grid", gap: 4 }}>
            <div><b>{result.intentLabel || result.intent || "-"}</b></div>
            <div>{result.entityLabel || `${result.entityType || "entity"} #${result.entityId || "-"}`}</div>
            <div>{result.scope?.summary || "-"}</div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <DecisionBadge label="Genel Durum" value={result.overallStatus} />
            <DecisionBadge label="Hazırlık" value={result.actionability} />
            <DecisionBadge label="Tazelik" value={result.dataFreshness} />
            <DecisionBadge label="Kapsam" value={result.coverage} />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => copyText(result.summary || "")}>Kopyala özet</button>
            {result.noteDraft ? <button type="button" onClick={() => copyText(result.noteDraft || "")}>Kopyala not</button> : null}
            {copyMsg ? <span className="muted">{copyMsg}</span> : null}
          </div>

          <div style={{ fontSize: 16, fontWeight: 700 }}>{result.summary || "-"}</div>

          {result.explanation ? (
            <div>
              <div className="title" style={{ fontSize: 16 }}>Açıklama</div>
              <div className="muted" style={{ marginTop: 8 }}>{result.explanation}</div>
            </div>
          ) : null}

          {result.recommendedFirstAction ? (
            <div style={{ borderRadius: 12, padding: 12, ...priorityTone(result.recommendedFirstAction.priorityScore) }}>
              <div className="title" style={{ fontSize: 16 }}>İlk Önerilen Adım</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                <div style={{ fontWeight: 700 }}>{result.recommendedFirstAction.title || "-"}</div>
                <div style={{ borderRadius: 999, padding: "2px 8px", ...priorityTone(result.recommendedFirstAction.priorityScore) }}>
                  {actionPriorityLabel(result.recommendedFirstAction)}
                </div>
              </div>
              <div className="muted" style={{ marginTop: 8 }}><b>Neden şimdi:</b> {result.recommendedFirstAction.whyNow || "-"}</div>
              {result.actionPlanSummary ? <div className="muted" style={{ marginTop: 8 }}>{result.actionPlanSummary}</div> : null}
              {result.recommendedFirstAction.blockedBy?.length ? <div style={{ marginTop: 8 }}><b>Engeller:</b> {result.recommendedFirstAction.blockedBy.join(" • ")}</div> : null}
              {result.recommendedFirstAction.evidenceLinks?.length ? <div style={{ marginTop: 8 }}><b>Kanıt bağları:</b> {result.recommendedFirstAction.evidenceLinks.join(" • ")}</div> : null}
              {result.recommendedFirstAction.referenceLinks?.length ? <div style={{ marginTop: 8 }}><b>Referans bağları:</b> {result.recommendedFirstAction.referenceLinks.join(", ")}</div> : null}
            </div>
          ) : null}

          {result.calibrationNotes?.length ? (
            <div>
              <div className="title" style={{ fontSize: 16 }}>Kalibrasyon Notları</div>
              <ul>
                {result.calibrationNotes.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>
          ) : null}

          {result.highlights?.length ? (
            <div>
              <div className="title" style={{ fontSize: 16 }}>Öne Çıkanlar</div>
              <ul>
                {result.highlights.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>
          ) : null}

          <div>
            <div className="title" style={{ fontSize: 16 }}>Önerilen Adımlar</div>
            {result.recommendedActions?.length ? (
              <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                {result.recommendedActions.map((x, i) => (
                  <div key={`${x.title || 'action'}:${i}`} style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{x.title || "-"}</div>
                      <div style={{ borderRadius: 999, padding: "2px 8px", ...priorityTone(x.priorityScore) }}>
                        {actionPriorityLabel(x)}
                      </div>
                    </div>
                    <div className="muted">{x.reason || "-"}</div>
                    {x.whyNow ? <div><b>Neden şimdi:</b> {x.whyNow}</div> : null}
                    {x.preconditions?.length ? <div><b>Ön koşullar:</b> {x.preconditions.join(" • ")}</div> : null}
                    {x.dependsOn?.length ? <div><b>Bağlı olduğu şeyler:</b> {x.dependsOn.join(" • ")}</div> : null}
                    {x.blockedBy?.length ? <div><b>Engeller:</b> {x.blockedBy.join(" • ")}</div> : null}
                    {x.evidenceLinks?.length ? <div><b>Kanıt bağları:</b> {x.evidenceLinks.join(" • ")}</div> : null}
                    {x.referenceLinks?.length ? <div><b>Referans bağları:</b> {x.referenceLinks.join(", ")}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted" style={{ marginTop: 8 }}>Önerilen adım görünmüyor.</div>
            )}
          </div>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Gerçekler</div>
              <ul>
                {(result.facts || []).map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Riskler</div>
              {result.risks?.length ? <ul>{result.risks.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="muted">Risk görünmüyor.</div>}
            </div>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Öneriler</div>
              {result.suggestions?.length ? <ul>{result.suggestions.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="muted">Öneri yok.</div>}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Engeller</div>
              {result.blockers?.length ? <ul>{result.blockers.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="muted">Açıklanmış engel görünmüyor.</div>}
            </div>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Eksik Veri</div>
              {result.missingData?.length ? <ul>{result.missingData.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="muted">Eksik veri görünmüyor.</div>}
            </div>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Blok Kodları</div>
              {result.blocks?.length ? <ul>{result.blocks.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="muted">Kod seviyesinde blok görünmüyor.</div>}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Sonraki Kontroller</div>
              {result.nextChecks?.length ? <ul>{result.nextChecks.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="muted">Ek kontrol önerisi yok.</div>}
            </div>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Referanslar</div>
              <ReferenceList data={result.references} />
            </div>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Kanıtlar</div>
              {result.evidence?.length ? <ul>{result.evidence.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="muted">Kanıt görünmüyor.</div>}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Karar Sinyalleri</div>
              {result.decisionSignals?.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {result.decisionSignals.map((x, i) => (
                    <div key={`${x.label || "signal"}:${i}`} style={{ borderRadius: 10, padding: 10, ...signalStyle(x.state) }}>
                      <div style={{ fontWeight: 700 }}>{x.label || "-"}</div>
                      <div>{x.detail || "-"}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">Karar sinyali görünmüyor.</div>
              )}
            </div>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Tutarlılık Kontrolleri</div>
              {result.consistencyChecks?.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {result.consistencyChecks.map((x, i) => (
                    <div key={`${x.label || "check"}:${i}`} style={{ borderRadius: 10, padding: 10, ...signalStyle(x.status) }}>
                      <div style={{ fontWeight: 700 }}>{x.label || "-"}</div>
                      <div>{x.detail || "-"}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">Tutarlılık kontrolü görünmüyor.</div>
              )}
            </div>
          </div>

          {result.noteDraft ? (
            <div>
              <div className="title" style={{ fontSize: 16 }}>Not Taslağı</div>
              <textarea readOnly value={result.noteDraft} rows={8} style={{ width: "100%", marginTop: 8 }} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="card">
        <div className="title" style={{ fontSize: 16 }}>Son 5 çalışma</div>
        {history.length ? (
          <ul style={{ marginTop: 8 }}>
            {history.map((x, i) => (
              <li key={`${x.panelMode}:${x.intent}:${x.jobType}:${x.entityType}:${x.entityId}:${i}`}>
                <button type="button" onClick={() => restoreHistory(x)}>
                  {x.panelMode === "GUIDE" ? (GUIDE_JOB_OPTIONS.find((g) => g.value === x.jobType)?.label || x.jobType) : x.intent} • {x.entityType} #{x.entityId}
                </button>
                <span className="muted"> {x.severity ? `(${x.severity})` : ""} {x.summary ? `- ${x.summary}` : ""}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="muted" style={{ marginTop: 8 }}>Henüz geçmiş yok.</div>
        )}
      </div>

      <div className="card">
        <div className="title" style={{ fontSize: 16 }}>Kısa Not</div>
        <div className="muted" style={{ marginTop: 8 }}>
          Rehber modu M46.6-A ile eklendi. Copilot çekirdeği yerinde durur; üstüne sade Türkçe iş rehberi gelir. Sistem read-only / suggestion-first kalır ve audit log’a <code>AI_COPILOT_QUERY</code> yazar.
        </div>
      </div>
    </div>
  );
}

// M46.6 compat markers: Gelişmiş | İş Rehberi | Başlamadan önce kontrol | Buradan aç | Bu neden kapalı? | Takıldıysan buraya git | Hazır metin



// M46.6-T compat markers: Konum kaynağı rehberi | Cihaz GPS'i ekleme | GPS sinyal teşhisi | sürücünün telefon GPS'i | cihaz GPS'i | konum kaynağı

// M46.6-C compat markers: Bu ekran ne için var? | Bu ekrandaki butonlar | Bu menü ne için var? | SCREEN_MENU_GUIDE | BUTTON_ACTION_GUIDE | ROLE_HELP_GUIDE | Copilot
