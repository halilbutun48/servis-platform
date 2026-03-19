import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

export default function PilotLaunchGatePanel() {
  const { token } = useSession();
  const [manifest, setManifest] = useState(null);

  useEffect(() => {
    api('/api/pilot-launch-gate/manifest', { token })
      .then((r) => setManifest(r?.manifest || null))
      .catch(() => setManifest(null));
  }, [token]);

  const sections = useMemo(() => Array.isArray(manifest?.sections) ? manifest.sections : [], [manifest]);

  const descriptions = {
    checklist: 'M59-M64 çıktısı tek yerde toplanır.',
    risks: 'Bloklayan ve sınırlı riskler burada görünür.',
    acceptance: 'M60 sahadan önceki kabul verilerini özetler.',
    health: 'Gözlemleme sağlık özeti burada toplanır.',
    deviceMatrix: 'Build / cihaz uygunluk matrisi burada görünür.',
    decision: 'Son karar kapısı.'
  };

  const fallbackCards = [
    { key: 'checklist', title: 'Launch checklist' },
    { key: 'risks', title: 'Kritik risk listesi' },
    { key: 'acceptance', title: 'Acceptance özetleri' },
    { key: 'decision', title: 'GO / LIMITED GO / NO-GO' }
  ];

  const cards = sections.length ? sections : fallbackCards;

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>M65 Pilot Launch Gate</h2>
      <div className="muted">Saha öncesi son karar kapısı. M65 green olmadan sahaya çıkılmaz.</div>
      <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        {cards.map((section) => (
          <div key={section.key || section.title} className="card">
            <b>{section.title}</b>
            <div className="muted">{descriptions[section.key] || 'Bu bölüm sahaya çıkış kararını destekler.'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
