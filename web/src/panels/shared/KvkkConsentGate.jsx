// web/src/panels/shared/KvkkConsentGate.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

const DOC_KEY = "LOCATION_CONSENT";
const DOC_VERSION = "1";

function needsGate(role) {
  return role === "PARENT" || role === "DRIVER";
}

export default function KvkkConsentGate() {
  const { token, me, logout } = useSession();
  const role = me?.role || "";
  const enabled = token && needsGate(role);

  const [required, setRequired] = useState([]);
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!enabled) return;
    (async () => {
      try {
        setErr("");
        const r1 = await api.get("/api/kvkk/required", { token });
        const r2 = await api.get("/api/kvkk/consents/my", { token });
        setRequired(r1?.items || []);
        setMine(r2?.items || []);
      } catch (e) {
        setErr(e?.message || String(e));
      }
    })();
  }, [enabled, token]);

  const hasLocation = useMemo(() => {
    return (mine || []).some((x) => x.docKey === DOC_KEY && x.docVersion === DOC_VERSION && !x.revokedAt);
  }, [mine]);

  if (!enabled) return null;
  if (hasLocation) return null;

  async function accept() {
    try {
      setBusy(true);
      setErr("");
      await api.post("/api/kvkk/consents/accept", { docKey: DOC_KEY, docVersion: DOC_VERSION }, { token });
      const r2 = await api.get("/api/kvkk/consents/my", { token });
      setMine(r2?.items || []);
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
      <div className="card" style={{ width: "min(720px, 95vw)" }}>
        <div className="card-title">KVKK Onayı Gerekli</div>
        <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
          Bu ekranı kullanabilmek için <b>Konum Takibi Açık Rıza</b> onayı vermen gerekiyor.
          <br />
          (docKey: <code>{DOC_KEY}</code> v{DOC_VERSION})
        </div>

        <div className="muted" style={{ marginTop: 10 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Konum verisi (GPS) hassas veridir.</li>
            <li>Sadece operasyon amaçlı ve zaman penceresinde kullanılır.</li>
            <li>Dilediğinde rızanı geri alabilirsin (sonrasında canlı takip kapanır).</li>
          </ul>
        </div>

        {err ? <div className="muted" style={{ color: "#f87171", marginTop: 10 }}>{err}</div> : null}

        <div className="row" style={{ marginTop: 14, gap: 10, justifyContent: "flex-end" }}>
          <button className="btn" onClick={() => logout()} disabled={busy}>
            Çıkış
          </button>
          <button className="btn primary" onClick={() => accept()} disabled={busy}>
            {busy ? "..." : "Onayla"}
          </button>
        </div>
      </div>
    </div>
  );
}
