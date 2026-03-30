import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { getPath, navigate } from "../../router";
import { useSession } from "../../state/session";
import { copilotSelectionEventName, readCopilotSelection } from "../../utils/copilotSelection";
import { companyPath, normalizeCompanyPath } from "../../utils/paths";
import { resolveCopilotScreenContext } from "../../copilot/screenRegistry";
import { captureCopilotUiSurface } from "./uiSurface";

const STORAGE_KEY = "psv1:copilot:drawer:v4";
const HISTORY_KEY = "psv1:copilot:drawer:history:v4";
const SIZE_PRESETS = { S: { width: 440, height: 560 }, M: { width: 560, height: 700 }, L: { width: 700, height: 860 } };

function loadDrawerState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {}; } catch { return {}; }
}
function saveDrawerState(next) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {} }
function loadHistory() { try { const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }

function normalizeScopePath(path) {
  return String(path || "").split("?")[0];
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

function uniqueStrings(list) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    const val = String(item || "").trim();
    if (!val) continue;
    const key = val.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(val);
  }
  return out;
}

function buildSuggestions(path, mode, selection) {
  const p = String(path || "").split("?")[0];
  const common = mode === "DIAGNOSE"
    ? ["Neden devam edemiyorum?", "En sık hata ne?", "Önce neyi kontrol etmeliyim?"]
    : mode === "SHORT"
      ? ["Bu ekran ne için var?", "Şimdi ne yapayım?", "Kısa özet ver"]
      : ["Bu ekranda sırayla ne yaparım?", "İlk adım ne olmalı?", "Burada hangi sırayla ilerlerim?"];
  const pathExtra = [];
  if (p.includes("/room/map") || p.includes("/company/map") || p.includes("/school/map") || p.includes("/organization/map")) pathExtra.push("Seçili araç ne durumda?", "GPS neden eski görünüyor?", "Buradan sonra hangi ekrana geçeyim?");
  else if (p.includes("/shifts")) pathExtra.push("Bu kayıtta önce neye bakayım?", "Bu iş neden ilerlemiyor?", "Kontrol listesi ver");
  else if (p.includes("/commercial-flow")) pathExtra.push("Bu kayıt hangi aşamada?", "Bu satırı nasıl okurum?", "Bu rozet ne demek?", "Buradan sonra hangi ekrana gitmeliyim?");
  else if (p.includes("/service-evaluation")) pathExtra.push("Değerlendirme ne zaman açılır?", "Bu hizmette sonraki adım ne?", "Bu satırı nasıl okurum?", "Bu rozet ne demek?");
  else if (p.includes("/georeview")) pathExtra.push("Konum nasıl düzeltilir?", "Kaydet + Sonraki ne yapar?", "Planlama akışına nasıl dönerim?", "Bu satırı nasıl okurum?");
  if (selection?.label) pathExtra.unshift(`Seçili kayıt ne durumda?`);
  if ((selection?.fields?.length || selection?.badges?.length) && !p.includes("/map")) pathExtra.push("Bu satırı nasıl okurum?", "Bu sütun ne demek?", "Bu rozet ne demek?");
  return uniqueStrings([...common, ...pathExtra]).slice(0, 4);
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

function filterMessageActions(actions, suggestions, followUpPrompt) {
  const rows = Array.isArray(actions) ? actions : [];
  const visible = [];
  for (const action of rows) {
    const kind = String(action?.actionKind || "OPEN_ROUTE");
    if (kind === "ASK") {
      const askText = String(action?.askText || action?.label || "").trim();
      if (!askText) continue;
      if (Array.isArray(suggestions) && suggestions.some((chip) => samePrompt(chip, askText))) continue;
      if (followUpPrompt && samePrompt(followUpPrompt, askText)) continue;
    }
    const key = `${kind}|${action?.label || ""}|${action?.routeKey || action?.href || action?.path || ""}|${action?.askText || ""}|${action?.guide?.jobType || ""}`;
    if (visible.some((x) => x.__k === key)) continue;
    visible.push({ ...action, __k: key });
  }
  return visible.slice(0, 2).map(({ __k, ...rest }) => rest);
}

export default function FloatingCopilotDrawer({ path: propPath = "" }) {
  const { token, me } = useSession();
  const currentPath = String(propPath || getPath() || "").split("?")[0];
  const initial = useRef(loadDrawerState()).current || {};
  const [open, setOpen] = useState(Boolean(initial.open));
  const [mode, setMode] = useState(initial.mode || "STEP");
  const [size, setSize] = useState(initial.size || "M");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [messages, setMessages] = useState(loadHistory());
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [readingIndex, setReadingIndex] = useState(-1);
  const [selection, setSelection] = useState(() => selectionApplies(readCopilotSelection(), currentPath) ? readCopilotSelection() : null);
  const scrollRef = useRef(null);
  const lastPathRef = useRef(currentPath);
  const screenContext = useMemo(() => resolveCopilotScreenContext(currentPath, me), [currentPath, me?.role, me?.companyKind]);
  const suggestions = useMemo(() => buildSuggestions(currentPath, mode, selection), [currentPath, mode, selection]);
  const isCopilotPage = /\/copilot$/.test(currentPath);
  const dims = SIZE_PRESETS[size] || SIZE_PRESETS.M;

  useEffect(() => { saveDrawerState({ open, mode, size }); }, [open, mode, size]);
  useEffect(() => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-20))); } catch {} if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch {} }, []);

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
    if (!messages.length) ask("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token, isCopilotPage]);

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
      const uiSurface = captureCopilotUiSurface();
      const recentMessages = messages.slice(-8).map((m) => ({ role: m?.role || '', text: String(m?.text || '').slice(0, 280) }));
      const payload = await api.post("/api/ai/copilot", {
        intent: "CHAT_HELP",
        entityType: selection?.entityType || "screen",
        entityId: Number(selection?.entityId || screenContext.screen.id),
        message: buildPrompt({ mode, rawText, screenContext, selection }),
        conversationState: {
          recentMessages,
          drawerMode: mode,
          lastScreenPath: screenContext.path,
          lastScreenLabel: screenContext.label,
          selectedLabel: selection?.label || "",
          selectedEntityType: selection?.entityType || "",
          selectedEntityId: Number(selection?.entityId || 0) || null,
          uiSurface,
        },
        screenContext: {
          id: Number(screenContext.screen.id),
          path: screenContext.path,
          label: screenContext.label,
          role: me?.role || "",
          companyKind: me?.companyKind || "",
          selectedLabel: selection?.label || "",
          selectedEntityType: selection?.entityType || "",
          selectedEntityId: Number(selection?.entityId || 0) || null,
          selectedSummary: selection?.summary || "",
          selectedFields: Array.isArray(selection?.fields) ? selection.fields : [],
          selectedBadges: Array.isArray(selection?.badges) ? selection.badges : [],
          structuredFacts: selection?.facts && typeof selection.facts === "object" ? selection.facts : null,
          uiHints: {
            drawerMode: mode,
            visibleSuggestions: buildSuggestions(screenContext.path, mode, selection),
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
    if (!rawPath) return;
    openPath(withRouteParams(rawPath, action?.routeParams));
  }

  function speak(text, idx) {
    const t = String(text || "").trim(); if (!t) return;
    try { const synth = window.speechSynthesis; if (!synth) return; synth.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = "tr-TR"; u.rate = 0.95; u.onend = () => setReadingIndex(-1); setReadingIndex(idx); synth.speak(u); } catch {}
  }

  if (!token || !me || isCopilotPage) return null;

  return !open ? (
    <button type="button" className="copilotFab" onClick={() => setOpen(true)} title="Yardım ve copilot">
      <span>Yardım</span><span className="copilotFabDot" />
    </button>
  ) : (
    <aside className="copilotDrawer" style={{ width: dims.width, height: dims.height }}>
      <div className="copilotDrawerHeader">
        <div>
          <div className="copilotDrawerTitle">Copilot</div>
          <div className="copilotDrawerContext">Şu an: {screenContext.label}</div>
          {selection?.label ? <div className="copilotDrawerContext">Seçili kayıt: <b>{selection.label}</b>{selection?.summary && selection.summary !== selection.label ? ` • ${selection.summary}` : ""}</div> : null}
        </div>
        <div className="copilotDrawerTools">
          <button type="button" className={size === "S" ? "btn sm primary copilotToolBtn" : "btn sm copilotToolBtn"} onClick={() => setSize("S")}>−</button>
          <button type="button" className={size === "M" ? "btn sm primary copilotToolBtn" : "btn sm copilotToolBtn"} onClick={() => setSize("M")}>□</button>
          <button type="button" className={size === "L" ? "btn sm primary copilotToolBtn" : "btn sm copilotToolBtn"} onClick={() => setSize("L")}>＋</button>
          <button type="button" className="btn sm copilotToolBtn" onClick={() => setOpen(false)}>Kapat</button>
        </div>
      </div>

      <div className="copilotDrawerModeRow">
        <button type="button" className={mode === "STEP" ? "btn sm primary copilotToolBtn" : "btn sm copilotToolBtn"} onClick={() => setMode("STEP")}>Adım adım</button>
        <button type="button" className={mode === "DIAGNOSE" ? "btn sm primary copilotToolBtn" : "btn sm copilotToolBtn"} onClick={() => setMode("DIAGNOSE")}>Sorunu bul</button>
        <button type="button" className={mode === "SHORT" ? "btn sm primary copilotToolBtn" : "btn sm copilotToolBtn"} onClick={() => setMode("SHORT")}>Hızlı cevap</button>
        <button type="button" className="btn sm copilotToolBtn" onClick={() => setShowSuggestions((p) => !p)}>{showSuggestions ? "Önerileri gizle" : `Öneriler (${suggestions.length})`}</button>
      </div>

      {showSuggestions ? <div className="copilotSuggestionWrap">{suggestions.map((chip) => <button key={chip} type="button" className="copilotChip" onClick={() => ask(chip)}>{chip}</button>)}</div> : null}

      <div className="copilotChatSurface" ref={scrollRef}>
        {messages.length === 0 ? <div className="copilotEmptyState"><div className="copilotEmptyTitle">Bulunduğun ekranda soru sorabilirsin.</div><div className="copilotEmptyText">Yazı alanı altta. Hazır öneriler istersen açılır. Seçili kayıt varsa onu da konuşmaya katmaya çalışırım.</div></div> : null}
        {messages.map((m, idx) => <div key={`${m.role}-${idx}`} className={m.role === "user" ? "copilotMsg user" : "copilotMsg assistant"}>
          <div className="copilotMsgHead">{m.role === "user" ? "Sen" : "Copilot"}</div>
          <div className="copilotMsgText">{m.text}</div>
          {m.role === "assistant" && !m.system ? <div className="copilotMsgActions">
            <button type="button" className="btn sm copilotToolBtn" onClick={() => speak(m.text, idx)}>{readingIndex === idx ? "Okuyor..." : "Sesli oku"}</button>
            {m.followUpPrompt ? <button type="button" className="btn sm copilotToolBtn" onClick={() => ask(m.followUpPrompt)}>Devamını anlat</button> : null}
            {filterMessageActions(m.quickActions, suggestions, m.followUpPrompt).map((a, i) => (
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
