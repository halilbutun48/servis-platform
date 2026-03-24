import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { getPath, navigate } from "../../router";
import { useSession } from "../../state/session";
import { copilotSelectionEventName, readCopilotSelection } from "../../utils/copilotSelection";

const STORAGE_KEY = "psv1:copilot:drawer:v4";
const HISTORY_KEY = "psv1:copilot:drawer:history:v4";
const SIZE_PRESETS = { S: { width: 440, height: 560 }, M: { width: 560, height: 700 }, L: { width: 700, height: 860 } };

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
      { id: 1107, path: "/room/copilot", label: "Copilot Test" },
      { id: 1108, path: "/room/hub", label: "Hub" },
      { id: 1109, path: "/room/checkin", label: "Check-in" },
      { id: 1110, path: "/room/auth-invites", label: "Giriş Davetleri" },
      { id: 1111, path: "/shared/notifications", label: "Bildirimler" },
      { id: 1112, path: "/shared/logs", label: "Log Export" },
      { id: 1113, path: "/shared/kvkk", label: "KVKK" },
      { id: 1114, path: "/room/operation-health", label: "Operasyon Sağlığı" },
    ],
    COMPANY: [
      { id: 2101, path: "/company", label: "Planlama Merkezi" },
      { id: 2102, path: "/company/shifts", label: "Vardiyalar" },
      { id: 2103, path: "/company/agreements", label: "Sözleşmeler" },
      { id: 2104, path: "/company/access-links", label: "Personel Link" },
      { id: 2105, path: "/company/copilot", label: "Copilot Test" },
      { id: 2106, path: "/company/hub", label: "Hub" },
      { id: 2107, path: "/company/checkin", label: "Check-in" },
      { id: 2108, path: "/company/auth-invites", label: "Giriş Davetleri" },
      { id: 2109, path: "/company/georeview", label: "Personel Konum Seçici" },
      { id: 2110, path: "/shared/notifications", label: "Bildirimler" },
      { id: 2111, path: "/shared/logs", label: "Log Export" },
      { id: 2112, path: "/shared/kvkk", label: "KVKK" },
      { id: 2113, path: "/company/map", label: "Harita" },
      { id: 2114, path: "/company/service-evaluation", label: "Hizmet Değerlendirme" },
      { id: 2115, path: "/company/commercial-flow", label: "Ticari Akışım" },
      { id: 2116, path: "/company/reports", label: "Raporlar" },
    ],
    SCHOOL: [
      { id: 2201, path: "/school", label: "Okul Merkezi" },
      { id: 2202, path: "/school/shifts", label: "Vardiyalar" },
      { id: 2203, path: "/school/agreements", label: "Sözleşmeler" },
      { id: 2204, path: "/school/access-links", label: "Öğrenci Link" },
      { id: 2205, path: "/school/copilot", label: "Copilot Test" },
      { id: 2206, path: "/school/hub", label: "Hub" },
      { id: 2207, path: "/school/checkin", label: "Check-in" },
      { id: 2208, path: "/school/auth-invites", label: "Hesap Davetleri" },
      { id: 2209, path: "/school/georeview", label: "Öğrenci Konum Seçici" },
      { id: 2210, path: "/school/parents", label: "Parent Link" },
      { id: 2211, path: "/shared/notifications", label: "Bildirimler" },
      { id: 2212, path: "/shared/logs", label: "Log Export" },
      { id: 2213, path: "/shared/kvkk", label: "KVKK" },
      { id: 2214, path: "/school/map", label: "Harita" },
      { id: 2215, path: "/school/service-evaluation", label: "Hizmet Değerlendirme" },
      { id: 2216, path: "/school/reports", label: "Raporlar" },
    ],
  };
  return defs[key] || [];
}

function resolveScreenContext(path, me) {
  const clean = String(path || "").split("?")[0];
  const rows = buildScreenOptions(me);
  const current = rows.find((x) => x.path === clean) || rows[0] || null;
  return { screen: current, label: current?.label || clean || "Ekran", path: clean };
}

function loadDrawerState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {}; } catch { return {}; }
}
function saveDrawerState(next) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {} }
function loadHistory() { try { const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }

function selectionApplies(selection, path) {
  if (!selection) return false;
  const scope = String(selection.scopeKey || "");
  return !scope || scope === path;
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
  if (p.includes("/map")) pathExtra.push("Seçili araç ne durumda?", "GPS neden görünmüyor?");
  if (p.includes("/commercial-flow")) pathExtra.push("Bu kayıt hangi aşamada?", "Buradan sonra hangi ekrana gitmeliyim?");
  if (p.includes("/service-evaluation")) pathExtra.push("Değerlendirme ne zaman açılır?", "Bu hizmette sonraki adım ne?");
  if (p.includes("/georeview")) pathExtra.push("Konum nasıl düzeltilir?", "Planlama akışına nasıl dönerim?");
  if (selection?.label) pathExtra.unshift(`Seçili kayıt ne durumda?`);
  return uniqueStrings([...common, ...pathExtra]).slice(0, 5);
}

function buildPrompt({ mode, rawText, screenContext, selection }) {
  const meta = modeMeta(mode);
  const q = String(rawText || "").trim();
  const base = [
    `${meta.instruction}`,
    `Şu ekran: ${screenContext.label} (${screenContext.path}).`,
    selection?.summary ? `Seçili kayıt: ${selection.summary}.` : "Seçili kayıt yok veya okunmadı.",
  ];
  if (q) {
    base.push(`Kullanıcının sorusu: ${q}`);
  } else if (mode === "DIAGNOSE") {
    base.push("Kullanıcı soru yazmadı. Bu ekran için en olası takılma nedenlerini anlat.");
  } else if (mode === "SHORT") {
    base.push("Kullanıcı soru yazmadı. Bu ekranı kısa özetle ve şimdi ne yapacağını söyle.");
  } else {
    base.push("Kullanıcı soru yazmadı. Bu ekranı sıfırdan öğretir gibi anlat.");
  }
  return base.join(" ");
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
  const screenContext = useMemo(() => resolveScreenContext(currentPath, me), [currentPath, me?.role, me?.companyKind]);
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
      const payload = await api.post("/api/ai/copilot", {
        intent: "CHAT_HELP",
        entityType: selection?.entityType || "screen",
        entityId: Number(selection?.entityId || screenContext.screen.id),
        message: buildPrompt({ mode, rawText, screenContext, selection }),
        screenContext: {
          id: Number(screenContext.screen.id),
          path: screenContext.path,
          label: screenContext.label,
          role: me?.role || "",
          companyKind: me?.companyKind || "",
          selectedLabel: selection?.label || "",
          selectedSummary: selection?.summary || "",
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
            {Array.isArray(m.quickActions) ? m.quickActions.slice(0, 2).map((a, i) => <button key={`${idx}-${i}`} type="button" className="btn sm copilotToolBtn" onClick={() => openPath(a?.path || a?.href || "")}>{a?.label || a?.title || "İlgili yere götür"}</button>) : null}
          </div> : null}
        </div>)}
        {busy ? <div className="copilotBusy">Copilot düşünüyor...</div> : null}
        {err ? <div className="copilotError">{err}</div> : null}
      </div>

      <form className="copilotComposer" onSubmit={onSubmit}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Sorunu yaz. Örnek: burada neden devam edemiyorum, bu ekran ne işe yarar, seçili araç ne durumda, şimdi ne yapacağım" rows={4} />
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
