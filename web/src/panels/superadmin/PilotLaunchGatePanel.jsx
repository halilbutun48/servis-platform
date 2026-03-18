import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

export default function PilotLaunchGatePanel() {
  const { token } = useSession();
  const [manifest, setManifest] = useState(null);

  useEffect(() => {
    api('/api/pilot-launch-gate/manifest', { token }).then((r) => setManifest(r?.manifest || null)).catch(() => {});
  }, [token]);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>M65 Pilot Launch Gate</h2>
      <div className="muted">Saha öncesi son karar kapısı. M65 green olmadan sahaya çıkılmaz.</div>
      <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        <div className="card"><b>Launch checklist</b><div className="muted">M59-M64 çıktısı tek yerde toplanır.</div></div>
        <div className="card"><b>Kritik risk listesi</b><div className="muted">Bloklayan ve sınırlı riskler burada görünür.</div></div>
        <div className="card"><b>Acceptance özetleri</b><div className="muted">M60 sahadan önceki kabul verilerini özetler.</div></div>
        <div className="card"><b>GO / LIMITED GO / NO-GO</b><div className="muted">Son karar kapısı.</div></div>
      </div>
      {manifest ? <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{JSON.stringify(manifest, null, 2)}</pre> : null}
    </div>
  );
}
