import { useEffect, useState } from "react";
import { api } from "../../api";
import PanelKvkkHint from "../shared/PanelKvkkHint";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";

function Card({ title, children }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, flex: "1 1 280px" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export default function FieldAcceptanceCenter() {
  const [manifest, setManifest] = useState(null);
  const [sessionTemplate, setSessionTemplate] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const [m, s] = await Promise.all([
        api("/api/field-acceptance/manifest"),
        api("/api/field-acceptance/session-template"),
      ]);
      setManifest(m || null);
      setSessionTemplate(s || null);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  };

  useEffect(() => {
    const checklist = Array.isArray(manifest?.checklist) ? manifest.checklist : [];
    const firstPending = checklist.find((item, idx) => String(sessionTemplate?.checklist?.[idx]?.status || 'PENDING').toUpperCase() !== 'PASS') || checklist[0] || null;
    if (!manifest && !sessionTemplate) {
      clearCopilotSelection('/superadmin/acceptance');
      return;
    }
    const pendingCount = checklist.reduce((acc, item, idx) => acc + (String(sessionTemplate?.checklist?.[idx]?.status || 'PENDING').toUpperCase() === 'PASS' ? 0 : 1), 0);
    const facts = {
      screenType: 'FIELD_ACCEPTANCE',
      stage: String(sessionTemplate?.decision || 'PENDING').toUpperCase(),
      readiness: pendingCount === 0 && String(sessionTemplate?.decision || '').toUpperCase() === 'ACCEPT' ? 'READY' : 'REVIEW_NEEDED',
      readinessScore: checklist.length ? Math.max(38, Math.min(92, Math.round(((checklist.length - pendingCount) / checklist.length) * 100))) : 40,
      blockers: pendingCount > 0 ? ['Checklist içinde henüz PASS olmayan maddeler var.'] : [],
      counters: { checklist: checklist.length, pending: pendingCount, decision: sessionTemplate?.decision || '-' },
      evidence: [
        `Karar: ${sessionTemplate?.decision || '-'}`,
        `Checklist: ${checklist.length}`,
        `Bekleyen: ${pendingCount}`,
        firstPending?.label ? `İlk açık madde: ${firstPending.label}` : '',
      ].filter(Boolean),
      reasoningLead: 'Bu ekranda amaç sahaya çıkmadan önce checklist ve test oturumu kararını aynı yerde görmektir.',
      nextBestAction: firstPending?.label
        ? 'Önce PASS olmayan ilk maddeyi netleştir. Sonra karar alanını tekrar değerlendir.'
        : 'Önce test oturumu kararını ve checklist maddelerini birlikte doğrula.',
      safestNextStep: 'En risksiz adım, önce PASS olmayan maddeleri kapatıp kabul kararını en son vermektir.',
      compareHint: 'Checklist PASS olması ile kabul kararının ACCEPT olması aynı şey değildir; ikisi birlikte okunmalıdır.',
    };
    setCopilotSelection({
      scopeKey: '/superadmin/acceptance',
      entityType: 'screen',
      entityId: 6108,
      label: firstPending?.label || 'Saha kabul özeti',
      summary: [sessionTemplate?.decision || null, checklist.length ? `${checklist.length} madde` : null, pendingCount ? `${pendingCount} bekleyen` : 'hepsi PASS'].filter(Boolean).join(' • '),
      fields: [
        { label: 'Karar', value: sessionTemplate?.decision || '-', help: 'Test oturumu için önerilen veya seçili kabul kararını gösterir.' },
        { label: 'Checklist', value: String(checklist.length), help: 'Toplam checklist maddesi sayısını gösterir.' },
        { label: 'Bekleyen', value: String(pendingCount), help: 'Henüz PASS olmayan checklist maddesi sayısını gösterir.' },
        { label: 'Cihaz', value: sessionTemplate?.deviceModel || '-', help: 'Test oturumunda kullanılan cihaz modelini gösterir.' },
        { label: 'Build', value: sessionTemplate?.buildProfile || '-', help: 'Test edilen mobil build profilini gösterir.' },
        { label: 'İlk Açık Madde', value: firstPending?.label || '-', help: 'Henüz tamamlanmamış ilk checklist maddesini örnek odak olarak gösterir.' },
      ],
      badges: [
        { label: 'Alan', value: firstPending?.area || '-', help: 'Açık checklist maddesinin ait olduğu alanı gösterir.' },
      ],
      facts,
    });
    return () => clearCopilotSelection('/superadmin/acceptance');
  }, [manifest, sessionTemplate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, s] = await Promise.all([
          api("/api/field-acceptance/manifest"),
          api("/api/field-acceptance/session-template"),
        ]);
        if (cancelled) return;
        setManifest(m || null);
        setSessionTemplate(s || null);
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Saha Kabul Merkezi</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            Sahaya çıkmadan önce kabul kararı, checklist durumu ve test oturum özetini toplar.
          </div>
        </div>
        <button className="btn" onClick={load}>Yenile</button>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <PanelKvkkHint panelKey="fieldAcceptance" />

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Karar seçenekleri">
          <div className="muted">{(manifest?.decisions || []).join(", ") || "Henüz karar seçeneği yok"}</div>
        </Card>
        <Card title="Checklist özeti">
          <div>{manifest?.checklist?.length ?? 0} madde</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {(manifest?.checklist || []).slice(0, 3).map((item) => item.label).join(" • ") || "Henüz checklist maddesi yok"}
          </div>
        </Card>
        <Card title="Test oturumu özeti">
          <div>Karar: {sessionTemplate?.decision || "-"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Cihaz: {sessionTemplate?.deviceModel || "-"} • Build: {sessionTemplate?.buildProfile || "-"}
          </div>
        </Card>
      </div>

      {!!manifest?.checklist?.length && (
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {manifest.checklist.map((item, idx) => {
            const status = sessionTemplate?.checklist?.[idx]?.status || "PENDING";
            return (
              <div key={item.id || idx} className="card" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.label}</div>
                  <div className="muted" style={{ marginTop: 6 }}>Alan: {item.area || "genel"}</div>
                </div>
                <div className="pill">{status}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
