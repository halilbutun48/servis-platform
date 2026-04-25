import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

function needsGate(role, me) {
  if (me?.kvkk?.requiredCount > 0) return true;
  return role === "PARENT" || role === "DRIVER";
}

export default function KvkkConsentGate() {
  const { token, me, logout, loadMe } = useSession();
  const role = me?.role || "";
  const enabled = token && needsGate(role, me);

  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const loadCurrent = useCallback(async () => {
    if (!enabled) return;
    try {
      setErr("");
      const r = await api.get("/api/kvkk/documents/current", { token });
      setSummary(r || null);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }, [enabled, token]);

  useEffect(() => {
    loadCurrent();
  }, [loadCurrent]);

  const missingDocs = useMemo(() => {
    const items = Array.isArray(summary?.items) ? summary.items : [];
    return items.filter((x) => x.required !== false && !x.accepted);
  }, [summary]);

  if (!enabled) return null;
  if (summary && !summary.blocking && missingDocs.length === 0) return null;

  async function acceptAll() {
    try {
      setBusy(true);
      setErr("");
      await api.post(
        "/api/kvkk/consents/accept-many",
        { items: missingDocs.map((x) => ({ docKey: x.docKey, docVersion: x.docVersion })) },
        { token }
      );
      await loadMe(token);
      await loadCurrent();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div className="card" style={{ width: "min(760px, 95vw)", maxHeight: "88vh", overflow: "auto" }}>
        <div className="card-title">KVKK Onayı Gerekli</div>
        <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
          Devam etmeden önce aşağıdaki metinleri okuyup onaylaman gerekiyor.
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {missingDocs.map((doc) => (
            <div key={`${doc.docKey}:${doc.docVersion}`} className="card" style={{ margin: 0 }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{doc.title}</div>
                  <div className="muted" style={{ marginTop: 4 }}>{doc.summary}</div>
                </div>
                <div className="muted" style={{ whiteSpace: "nowrap" }}>
                  {doc.docKind === "NOTICE" ? "Aydınlatma" : "Açık rıza"} • v{doc.docVersion}
                </div>
              </div>
              <ul style={{ marginTop: 10, paddingLeft: 18 }}>
                {(doc.blocks || []).map((line, idx) => <li key={idx}>{line}</li>)}
              </ul>
            </div>
          ))}
        </div>

        {err ? <div className="muted" style={{ color: "#f87171", marginTop: 10 }}>{err}</div> : null}

        <div className="row" style={{ marginTop: 14, gap: 10, justifyContent: "flex-end" }}>
          <button className="btn" onClick={() => logout()} disabled={busy}>
            Çıkış
          </button>
          <button className="btn primary" onClick={() => acceptAll()} disabled={busy || missingDocs.length === 0}>
            {busy ? "..." : "Okudum, onaylıyorum"}
          </button>
        </div>
      </div>
    </div>
  );
}
