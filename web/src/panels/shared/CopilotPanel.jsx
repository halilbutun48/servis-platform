import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

const INTENT_OPTIONS = [
  { value: "SHIFT_SUMMARY", label: "Vardiya Özeti", entityType: "shift" },
  { value: "CONFLICT_EXPLAIN", label: "Conflict Açıklama", entityType: "shift" },
  { value: "OPS_NOTE_DRAFT", label: "Operasyon Notu Taslağı", entityType: "shift" },
  { value: "TELEMATICS_HEALTH", label: "Telematics Health", entityType: "vehicle" },
];

function firstList(resp) {
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.items)) return resp.items;
  return [];
}

export default function CopilotPanel() {
  const { token, me } = useSession();
  const [intent, setIntent] = useState("SHIFT_SUMMARY");
  const [entityType, setEntityType] = useState("shift");
  const [entityId, setEntityId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [recentShifts, setRecentShifts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  useEffect(() => {
    const selected = INTENT_OPTIONS.find((x) => x.value === intent);
    setEntityType(selected?.entityType || "shift");
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

  const targetOptions = useMemo(() => (entityType === "vehicle" ? vehicles : recentShifts), [entityType, vehicles, recentShifts]);

  async function onRun(e) {
    e?.preventDefault?.();
    setBusy(true);
    setErr("");
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
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
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

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr auto" }}>
            <label className="muted">
              Hızlı seçim {loadingRefs ? "(yükleniyor...)" : ""}
              <select value={entityId} onChange={(e) => setEntityId(e.target.value)}>
                <option value="">Seç...</option>
                {targetOptions.map((x) => (
                  <option key={x.id} value={x.id}>
                    {entityType === "vehicle"
                      ? `#${x.id} • ${x.plate || "plate?"}`
                      : `#${x.id} • ${x.status || "-"} • ${x.company?.name || x.room?.name || "shift"}`}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" disabled={busy || !entityId} style={{ alignSelf: "end" }}>
              {busy ? "Çalışıyor..." : "Analiz Et"}
            </button>
          </div>

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
            <div className="muted" style={{ marginTop: 6 }}>
              Provider: <b>{result.provider || "-"}</b> • Mode: <b>{result.mode || "-"}</b> • Scope: <b>{result.scope?.role || me?.role || "-"}</b>
            </div>
          </div>

          <div style={{ fontSize: 16, fontWeight: 700 }}>{result.summary || "-"}</div>

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

          {result.noteDraft ? (
            <div>
              <div className="title" style={{ fontSize: 16 }}>Note Draft</div>
              <textarea readOnly value={result.noteDraft} rows={8} style={{ width: "100%", marginTop: 8 }} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="card">
        <div className="title" style={{ fontSize: 16 }}>Kısa Not</div>
        <div className="muted" style={{ marginTop: 8 }}>
          Bu foundation sürümü deterministic çalışır; structured JSON döndürür ve audit log’a <code>AI_COPILOT_QUERY</code> yazar.
        </div>
      </div>
    </div>
  );
}
