import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { getPath, navigate } from "../../router";
import { useSession } from "../../state/session";
import { copilotSelectionEventName, readCopilotSelection } from "../../utils/copilotSelection";
import { companyPath, normalizeCompanyPath } from "../../utils/paths";
import { buildCopilotStarterChips, COPILOT_PERSONA } from "../../utils/copilotFacts";
import { resolveCopilotScreenContext } from "../../copilot/screenRegistry";
import { captureCopilotUiSurface } from "./uiSurface";

const STORAGE_KEY = "psv1:copilot:drawer:v4";
const HISTORY_KEY = "psv1:copilot:drawer:history:v4";
const SIZE_PRESETS = { S: { width: 440, height: 560 }, M: { width: 560, height: 700 }, L: { width: 700, height: 860 } };
const DEFAULT_DRAWER_SIZE = "S";

function loadDrawerState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {}; } catch { return {}; }
}
function saveDrawerState(next) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* no-op: storage may be unavailable */ } }
function loadHistory() { try { const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { /* no-op: history may be unreadable */ return []; } }

function normalizeScopePath(path) {
  return String(path || "").split("?")[0];
}

function normalizeDrawerSize(size) {
  return size === "S" || size === "M" ? size : DEFAULT_DRAWER_SIZE;
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
  const entityType = String(selection?.entityType || "");
  return ["shift", "vehicle"].includes(entityType);
}

function modeMeta(mode) {
  if (mode === "DIAGNOSE") return { label: "Sorunu bul", instruction: "Sorunu bul. En olası 3 nedeni kısa maddelerle söyle. Sonunda önce neyi kontrol etmem gerektiğini yaz." };
  if (mode === "SHORT") return { label: "Hızlı cevap", instruction: "Kısa cevap ver. Önce 1 cümle özet yaz, sonra en fazla 2 adım ver." };
  return { label: "Adım adım", instruction: "Hiç bilmeyen biri için çok sade Türkçe ile adım adım anlat. Teknik jargonu azalt." };
}

function buildSuggestions(path, _mode, selection, screenContext, me) {
  return buildCopilotStarterChips({
    screenPath: path,
    selection,
    screenContext,
    role: me?.role || "",
    companyKind: me?.companyKind || "",
  }).slice(0, 4);
}

function buildPrompt({ mode, rawText, screenContext, selection }) {
  const q = String(rawText || "").trim();
  if (q) return q;
  const meta = modeMeta(mode);
  const base = [
    `${meta.instruction}`,
    `Şu ekran: ${screenContext.label} (${screenContext.path}).`,
    selection?.summary ? `Seçili kayıt: ${selection.summary}.` : "Seçili kayıt yok veya okunmadı.",
  ];
  if (mode === "DIAGNOSE") {
    base.push("Kullanıcı soru yazmadı. Bu ekran için en olası takılma nedenlerini anlat.");
  } else if (mode === "SHORT") {
    base.push("Kullanıcı soru yazmadı. Bu ekranı kısa özetle ve şimdi ne yapacağını söyle.");
  } else {
    base.push("Kullanıcı soru yazmadı. Bu ekranı sıfırdan öğretir gibi anlat.");
  }
  return base.join(" ");
}

function actionText(action) {
  const kind = String(action?.actionKind || "OPEN_ROUTE");
  if (kind === "OPEN_GUIDE") return action?.label || "Rehberi aç";
  if (kind === "ASK") return action?.label || "Sor";
  if (kind === "COPY_TEXT") return action?.label || "Kopyala";
  return action?.label || "İlgili yere git";
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
  }
  return "";
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

export default function FloatingCopilotDrawer({ path: propPath = "" }) {
  const { token, me } = useSession();
  const currentPath = String(propPath || getPath() || "").split("?")[0];
  const initial = useRef(loadDrawerState()).current || {};
  const [open, setOpen] = useState(Boolean(initial.open));
  const [mode, setMode] = useState(initial.mode || "STEP");
  const [size, setSize] = useState(normalizeDrawerSize(initial.size));
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [messages, setMessages] = useState(loadHistory());
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [readingIndex, setReadingIndex] = useState(-1);
  const [selection, setSelection] = useState(() => selectionApplies(readCopilotSelection(), currentPath) ? readCopilotSelection() : null);
  const scrollRef = useRef(null);
  const lastPathRef = useRef(currentPath);
  const screenContext = useMemo(() => resolveCopilotScreenContext(currentPath, me), [currentPath, me]);
  const suggestions = useMemo(() => buildSuggestions(currentPath, mode, selection, screenContext, me), [currentPath, mode, selection, screenContext, me]);
  const isCopilotPage = /\/copilot$/.test(currentPath);
  const dims = SIZE_PRESETS[size] || SIZE_PRESETS.M;

  useEffect(() => { saveDrawerState({ open, mode, size }); }, [open, mode, size]);
  useEffect(() => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-20))); } catch { /* no-op: history persistence is best effort */ } if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* no-op: speech synthesis may be unavailable */ } }, []);

  useEffect(() => {
    const evt = copilotSelectionEventName();
    function onSelection(e) {
      const next = e?.detail || null;
      setSelection(selectionApplies(next, currentPath) ? next : null);
    }
    window.addEventListener(evt, onSelection);
    setSelection(selectionApplies(readCopilotSelection(), currentPath) ? readCopilotSelection() : null);
    return () => window.removeEventListener(evt, onSelection);
  }, [currentPath]);

  useEffect(() => {
    if (!open || !token || isCopilotPage) return;
    if (lastPathRef.current !== currentPath) {
      lastPathRef.current = currentPath;
      setErr("");
      setShowSuggestions(false);
      setMessages((prev) => [...prev, { role: "assistant", text: `Şimdi ${screenContext.label} ekranındasın. İstersen bu ekranı anlatayım veya seçili kayıt için yardımcı olayım.`, system: true }]);
    }
  }, [currentPath, open, token, isCopilotPage, screenContext.label]);

  async function ask(rawText) {
    if (!token || !screenContext.screen) return;
    const question = String(rawText || "").trim();
    if (question) setMessages((prev) => [...prev, { role: "user", text: question }]);
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
        message: buildPrompt({ mode, rawText, screenContext, selection: requestSelection }),
        conversationState: {
          recentMessages,
          drawerMode: mode,
          lastScreenPath: screenContext.path,
          lastScreenLabel: screenContext.label,
          selectedLabel: requestSelection?.label || "",
          selectedEntityType: requestSelection?.entityType || "",
          // Legacy selection carry guard: selectedEntityId: Number(selection?.entityId || 0) || null
          selectedEntityId: Number(requestSelection?.entityId || 0) || null,
          selectedSummary: requestSelection?.summary || "",
          selectedRecordSummary: requestSelection?.selectedRecordSummary || requestSelection?.summary || "",
          selectedRecordStatus: requestSelection?.selectedRecordStatus || "",
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
          uiHints: {
            drawerMode: mode,
            visibleSuggestions: buildSuggestions(screenContext.path, mode, requestSelection, screenContext, me),
            ...uiSurface,
          },
        },
        format: "json",
      }, { token });
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: payload?.reply || payload?.summary || "Yardım metni oluşmadı.",
        quickActions: Array.isArray(payload?.quickActions) ? payload.quickActions : [],
        followUpPrompt: payload?.followUpPrompt || "",
      }]);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e) {
    e?.preventDefault?.();
    const q = String(text || "").trim();
    if (!q || busy) return;
    setText("");
    ask(q);
  }

  function openPath(path) { if (!path) return; navigate(path); setOpen(false); }

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
    if (!token || !screenContext.screen) return;
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
      }, { token });
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
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
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

  return !open ? (
    <button
      type="button"
      className="copilotFab"
      onClick={() => setOpen(true)}
      title="Sefer Abi’ye Sor — Operasyon yardımcısı"
      aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"
    >
      <span className="copilotFabBadge" aria-hidden="true">SA</span>
      <span className="copilotFabBody">
        <span className="copilotFabTitle">Sefer Abi’ye Sor</span>
        <span className="copilotFabSubtitle">Operasyon yardımcısı</span>
      </span>
      <span className="copilotFabStatus"><span className="copilotFabDot" />hazır</span>
    </button>
  ) : (
    <aside className="copilotDrawer" style={{ width: dims.width, height: dims.height }}>
      <div className="copilotDrawerHeader">
        <div>
          <div className="copilotDrawerTitle">{COPILOT_PERSONA.drawerTitle}</div>
          <div className="copilotDrawerContext">{`${COPILOT_PERSONA.assistantDisplayName} · ${COPILOT_PERSONA.assistantSubtitle}`}</div>
          <div className="copilotDrawerContext">Bulunduğun ekranda kısa destek verir.</div>
          <div className="copilotDrawerContext">Şu an: {screenContext.label}</div>
          {selection?.label ? <div className="copilotDrawerContext">Seçili kayıt: <b>{selection.label}</b>{selection?.summary && selection.summary !== selection.label ? ` • ${selection.summary}` : ""}</div> : null}
        </div>
        <div className="copilotDrawerTools">
          <button
            type="button"
            className={size === "S" ? "btn sm primary copilotToolBtn" : "btn sm copilotToolBtn"}
            onClick={() => setSize("S")}
            aria-pressed={size === "S"}
            title="Küçük"
          >
            <span className="copilotToolIcon" aria-hidden="true">−</span><span>Küçük</span>
          </button>
          <button
            type="button"
            className={size === "M" ? "btn sm primary copilotToolBtn" : "btn sm copilotToolBtn"}
            onClick={() => setSize("M")}
            aria-pressed={size === "M"}
            title="Orta"
          >
            <span className="copilotToolIcon" aria-hidden="true">▢</span><span>Orta</span>
          </button>
          <button
            type="button"
            className={size === "L" ? "btn sm primary copilotToolBtn" : "btn sm copilotToolBtn"}
            onClick={() => setSize("L")}
            aria-pressed={size === "L"}
            title="Büyük"
          >
            <span className="copilotToolIcon" aria-hidden="true">＋</span><span>Büyük</span>
          </button>
          <button type="button" className="btn sm copilotToolBtn copilotToolBtn--close" onClick={() => setOpen(false)} title="Kapat">
            Kapat
          </button>
        </div>
      </div>

      <div className="copilotDrawerModeRow">
        <button type="button" className={mode === "STEP" ? "btn sm primary copilotToolBtn" : "btn sm copilotToolBtn"} onClick={() => setMode("STEP")}>Adım adım</button>
        <button type="button" className={mode === "DIAGNOSE" ? "btn sm primary copilotToolBtn" : "btn sm copilotToolBtn"} onClick={() => setMode("DIAGNOSE")}>Sorunu bul</button>
        <button type="button" className={mode === "SHORT" ? "btn sm primary copilotToolBtn" : "btn sm copilotToolBtn"} onClick={() => setMode("SHORT")}>Hızlı cevap</button>
        <button type="button" className="btn sm copilotToolBtn" onClick={() => setShowSuggestions((p) => !p)}>{showSuggestions ? "Önerileri gizle" : `Öneriler (${suggestions.length})`}</button>
      </div>

      {showSuggestions && messages.length > 0 ? <div className="copilotSuggestionWrap">{suggestions.map((chip) => <button key={chip} type="button" className="copilotChip" onClick={() => ask(chip)}>{chip}</button>)}</div> : null}

      <div className="copilotChatSurface" ref={scrollRef}>
        {messages.length === 0 ? <div className="copilotEmptyState"><div className="copilotEmptyTitle">{COPILOT_PERSONA.emptyStateLead}</div><div className="copilotEmptyText">{COPILOT_PERSONA.emptyStateBody}</div><div className="copilotSuggestionWrap">{suggestions.map((chip) => <button key={chip} type="button" className="copilotChip" onClick={() => ask(chip)}>{chip}</button>)}</div></div> : null}
        {messages.map((m, idx) => <div key={`${m.role}-${idx}`} className={m.role === "user" ? "copilotMsg user" : "copilotMsg assistant"}>
          <div className="copilotMsgHead">{m.role === "user" ? "Sen" : COPILOT_PERSONA.assistantDisplayName}</div>
          <div className="copilotMsgText">{m.text}</div>
          {m.role === "assistant" && !m.system ? <div className="copilotMsgActions">
            <button type="button" className="btn sm copilotToolBtn" onClick={() => speak(m.text, idx)}>{readingIndex === idx ? "Okuyor..." : "Sesli oku"}</button>
            {m.followUpPrompt ? <button type="button" className="btn sm copilotToolBtn" onClick={() => ask(m.followUpPrompt)}>Devamını anlat</button> : null}
            {filterMessageActions(m.quickActions, suggestions, m.followUpPrompt, me).map((a, i) => (
              <button key={`${idx}-${i}-${actionText(a)}`} type="button" className="btn sm copilotToolBtn" title={a?.reason || ""} onClick={() => triggerQuickAction(a)}>{actionText(a)}</button>
            ))}
          </div> : null}
        </div>)}
        {busy ? <div className="copilotBusy">Copilot düşünüyor...</div> : null}
        {err ? <div className="copilotError">{err}</div> : null}
      </div>

      <form className="copilotComposer" onSubmit={onSubmit}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(e); } }} placeholder="Sorunu yaz. Örnek: burada neden devam edemiyorum, bu ekran ne işe yarar, seçili araç ne durumda, şimdi ne yapacağım" rows={4} />
        <div className="copilotComposerRow">
          <div className="muted">Bağlam: <b>{screenContext.label}</b>{selection?.label ? ` • ${selection.label}` : ""}</div>
          <div className="copilotComposerButtons">
            <button type="button" className="btn sm copilotToolBtn" onClick={() => { setMessages([]); setErr(""); }}>Temizle</button>
            <button type="submit" className="btn sm primary copilotToolBtn" disabled={busy || !String(text || "").trim()}>Sor</button>
          </div>
        </div>
      </form>
    </aside>
  );
}
