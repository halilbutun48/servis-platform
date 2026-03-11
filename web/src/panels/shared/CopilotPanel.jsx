import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

const INTENT_OPTIONS = [
  { value: "SHIFT_SUMMARY", label: "Vardiya Özeti", helper: "Genel operasyon özeti", entityType: "shift" },
  { value: "CONFLICT_EXPLAIN", label: "Conflict Açıklama", helper: "Çatışma/risk odağında özet", entityType: "shift" },
  { value: "OPS_NOTE_DRAFT", label: "Operasyon Notu Taslağı", helper: "Paylaşılabilir metin taslağı", entityType: "shift" },
  { value: "ASSIGNMENT_READINESS", label: "Atama Hazırlık Kontrolü", helper: "Araç/sürücü/durak hazır mı", entityType: "shift" },
  { value: "OFFER_DECISION_HELP", label: "Teklif Karar Yardımı", helper: "Offer/decision dar boğazı", entityType: "shift" },
  { value: "TELEMATICS_HEALTH", label: "Telematics Health", helper: "Cihaz ve GPS sağlık özeti", entityType: "vehicle" },
  { value: "GPS_SIGNAL_DIAGNOSIS", label: "GPS Sinyal Teşhisi", helper: "Signal/ingest teşhisi", entityType: "vehicle" },
];

const HISTORY_KEY = "copilot.history.m46_2";

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
    const next = [entry, ...prev.filter((x) => `${x.intent}:${x.entityType}:${x.entityId}` !== `${entry.intent}:${entry.entityType}:${entry.entityId}`)].slice(0, 5);
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

function optionLabel(entityType, item) {
  if (!item) return "";
  if (entityType === "vehicle") {
    return `#${item.id} • ${item.plate || "plate?"} • ${item.status || "-"}`;
  }
  return `#${item.id} • ${item.status || "-"} • ${item.company?.name || item.room?.name || "shift"}`;
}

function filterItems(entityType, list, search) {
  const q = String(search || "").trim().toLowerCase();
  if (!q) return list;
  return (Array.isArray(list) ? list : []).filter((item) => optionLabel(entityType, item).toLowerCase().includes(q));
}

function ReferenceList({ data }) {
  const entries = Object.entries(data || {});
  if (!entries.length) return <div className="muted">Reference görünmüyor.</div>;
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

export default function CopilotPanel() {
  const { token, me } = useSession();
  const [intent, setIntent] = useState("SHIFT_SUMMARY");
  const [entityType, setEntityType] = useState("shift");
  const [entityId, setEntityId] = useState("");
  const [pickerSearch, setPickerSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [recentShifts, setRecentShifts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [history, setHistory] = useState([]);
  const [copyMsg, setCopyMsg] = useState("");

  useEffect(() => {
    setHistory(safeHistoryLoad());
  }, []);

  useEffect(() => {
    const selected = INTENT_OPTIONS.find((x) => x.value === intent);
    setEntityType(selected?.entityType || "shift");
    setPickerSearch("");
  }, [intent]);

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
  const targetOptions = useMemo(() => (entityType === "vehicle" ? vehicles : recentShifts), [entityType, vehicles, recentShifts]);
  const filteredOptions = useMemo(() => filterItems(entityType, targetOptions, pickerSearch), [entityType, pickerSearch, targetOptions]);
  const selectedItem = useMemo(() => targetOptions.find((x) => String(x.id) === String(entityId)) || null, [targetOptions, entityId]);

  async function onRun(e) {
    e?.preventDefault?.();
    setBusy(true);
    setErr("");
    setCopyMsg("");
    setResult(null);
    try {
      const payload = await api.post(
        "/api/ai/copilot",
        {
          intent,
          entityType,
          entityId: Number(entityId),
          format: "json",
        },
        { token }
      );
      setResult(payload);
      setHistory(saveHistory({
        at: new Date().toISOString(),
        intent,
        entityType,
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

  return (
    <div className="wrap" style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div className="title">Copilot</div>
        <div className="muted" style={{ marginTop: 6 }}>
          Read-only / suggestion-first foundation. Scope dışı veri okunmaz, write aksiyonu yapılmaz.
        </div>
      </div>

      <div className="card">
        <form onSubmit={onRun} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label className="muted">
              Intent
              <select value={intent} onChange={(e) => setIntent(e.target.value)}>
                {INTENT_OPTIONS.map((x) => (
                  <option key={x.value} value={x.value}>{x.label}</option>
                ))}
              </select>
            </label>

            <label className="muted">
              Entity Type
              <input value={entityType} readOnly />
            </label>

            <label className="muted">
              Entity ID
              <input value={entityId} onChange={(e) => setEntityId(e.target.value.replace(/[^0-9]/g, ""))} placeholder={entityType === "vehicle" ? "vehicleId" : "shiftId"} />
            </label>
          </div>

          <div className="muted" style={{ marginTop: -4 }}>
            <b>{selectedIntent.label}</b> — {selectedIntent.helper}
          </div>

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label className="muted">
              Hızlı seçim arama {loadingRefs ? "(yükleniyor...)" : ""}
              <input value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder={entityType === "vehicle" ? "plaka / status ara" : "status / şirket / room ara"} />
            </label>

            <label className="muted">
              Hızlı seçim
              <select value={entityId} onChange={(e) => setEntityId(e.target.value)}>
                <option value="">Seç...</option>
                {filteredOptions.map((x) => (
                  <option key={x.id} value={x.id}>
                    {optionLabel(entityType, x)}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" disabled={busy || !entityId} style={{ alignSelf: "end" }}>
              {busy ? "Çalışıyor..." : "Analiz Et"}
            </button>
          </div>

          {selectedItem ? (
            <div className="muted">
              Seçili kayıt: <b>{optionLabel(entityType, selectedItem)}</b>
            </div>
          ) : null}

          <div className="muted">
            Desteklenen roller: ROOM / COMPANY / SUPER_ADMIN. ROOM ve SUPER_ADMIN için step-up gerekir.
          </div>

          {err ? <div className="muted" style={{ color: "crimson" }}>{err}</div> : null}
        </form>
      </div>

      {result ? (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div>
            <div className="title">Sonuç</div>
            <div className="muted" style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span>Provider: <b>{result.provider || "-"}</b></span>
              <span>Mode: <b>{result.mode || "-"}</b></span>
              <span>Scope: <b>{result.scope?.role || me?.role || "-"}</b></span>
              <span>Versiyon: <b>{result.copilotVersion || "-"}</b></span>
              <span>Oluşturma: <b>{result.generatedAt ? new Date(result.generatedAt).toLocaleString("tr-TR") : "-"}</b></span>
              <span style={{ ...severityStyle(result.severity), padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>{result.severity || "-"}</span>
            </div>
          </div>

          <div className="muted" style={{ display: "grid", gap: 4 }}>
            <div><b>{result.intentLabel || result.intent || "-"}</b></div>
            <div>{result.entityLabel || `${result.entityType || "entity"} #${result.entityId || "-"}`}</div>
            <div>{result.scope?.summary || "-"}</div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => copyText(result.summary || "")}>Kopyala özet</button>
            {result.noteDraft ? <button type="button" onClick={() => copyText(result.noteDraft || "")}>Kopyala not</button> : null}
            {copyMsg ? <span className="muted">{copyMsg}</span> : null}
          </div>

          <div style={{ fontSize: 16, fontWeight: 700 }}>{result.summary || "-"}</div>

          {result.highlights?.length ? (
            <div>
              <div className="title" style={{ fontSize: 16 }}>Highlights</div>
              <ul>
                {result.highlights.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Facts</div>
              <ul>
                {(result.facts || []).map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Risks</div>
              {result.risks?.length ? <ul>{result.risks.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="muted">Risk görünmüyor.</div>}
            </div>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Suggestions</div>
              {result.suggestions?.length ? <ul>{result.suggestions.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="muted">Öneri yok.</div>}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Blocks</div>
              {result.blocks?.length ? <ul>{result.blocks.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="muted">Bloklayıcı görünmüyor.</div>}
            </div>
            <div>
              <div className="title" style={{ fontSize: 16 }}>Next Checks</div>
              {result.nextChecks?.length ? <ul>{result.nextChecks.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="muted">Ek kontrol önerisi yok.</div>}
            </div>
            <div>
              <div className="title" style={{ fontSize: 16 }}>References</div>
              <ReferenceList data={result.references} />
            </div>
          </div>

          {result.noteDraft ? (
            <div>
              <div className="title" style={{ fontSize: 16 }}>Note Draft</div>
              <textarea readOnly value={result.noteDraft} rows={8} style={{ width: "100%", marginTop: 8 }} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="card">
        <div className="title" style={{ fontSize: 16 }}>Son 5 analiz</div>
        {history.length ? (
          <ul style={{ marginTop: 8 }}>
            {history.map((x, i) => (
              <li key={`${x.intent}:${x.entityType}:${x.entityId}:${i}`}>
                <button type="button" onClick={() => { setIntent(x.intent); setEntityType(x.entityType); setEntityId(String(x.entityId)); }}>
                  {x.intent} • {x.entityType} #{x.entityId}
                </button>
                <span className="muted"> {x.severity ? `(${x.severity})` : ""} {x.summary ? `- ${x.summary}` : ""}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="muted" style={{ marginTop: 8 }}>Henüz analiz geçmişi yok.</div>
        )}
      </div>

      <div className="card">
        <div className="title" style={{ fontSize: 16 }}>Kısa Not</div>
        <div className="muted" style={{ marginTop: 8 }}>
          Bu intent expansion sürümü deterministic çalışır; structured JSON döndürür, read-only / suggestion-first kalır, audit log’a <code>AI_COPILOT_QUERY</code> yazar ve ROOM / SUPER_ADMIN için step-up çizgisini korur.
        </div>
      </div>
    </div>
  );
}
