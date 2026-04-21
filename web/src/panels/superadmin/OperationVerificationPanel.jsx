import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import PanelKvkkHint from "../shared/PanelKvkkHint";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";

function Card({ title, children }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, flex: "1 1 220px" }}>
      <div className="panelSectionTitle" style={{ marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function pillStyle(active) {
  return {
    padding: "8px 12px",
    borderRadius: 999,
    border: active ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.08)",
    background: active ? "rgba(255,255,255,0.08)" : "transparent",
    cursor: "pointer",
  };
}

function inputStyle() {
  return {
    width: "100%",
    background: "rgba(255,255,255,0.03)",
    color: "inherit",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "8px 10px",
  };
}

export default function OperationVerificationPanel() {
  const { token } = useSession();
  const [manifest, setManifest] = useState(null);
  const [surface, setSurface] = useState(null);
  const [statusOptions, setStatusOptions] = useState([]);
  const [proofOptions, setProofOptions] = useState([]);
  const [selectedRole, setSelectedRole] = useState("SUPER_ADMIN");
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, s, p] = await Promise.all([
          api("/api/operation-verification/manifest", { token }),
          api("/api/operation-verification/status-options", { token }),
          api("/api/operation-verification/proof-options", { token }),
        ]);
        if (cancelled) return;
        setManifest(m || null);
        setStatusOptions(s?.items || []);
        setProofOptions(p?.items || []);
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    setErr("");
    setInfo("");
    (async () => {
      try {
        const payload = await api(`/api/operation-verification/role-surface?role=${encodeURIComponent(selectedRole)}`, { token });
        if (cancelled) return;
        setSurface(payload || null);
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedRole, token]);

  useEffect(() => {
    const nextDrafts = {};
    for (const item of surface?.checks || []) {
      nextDrafts[item.id] = {
        status: item.status || surface?.defaultStatus || "TEKRAR_KONTROL",
        proofType: item.proofTypes?.[0] || "",
        note: item.note || "",
        evidenceRef: item.evidenceRef || "",
      };
    }
    setDrafts(nextDrafts);
  }, [surface]);

  const proofMap = useMemo(() => Object.fromEntries((proofOptions || []).map((item) => [item.id, item.label])), [proofOptions]);
  const statusMap = useMemo(() => Object.fromEntries((statusOptions || []).map((item) => [item.id, item.label])), [statusOptions]);
  const copilotCheck = useMemo(() => (surface?.checks || [])[0] || null, [surface]);
  const coreRoles = useMemo(() => {
    const roles = Array.isArray(manifest?.roles) ? manifest.roles : [];
    return roles.filter((item) => ["SUPER_ADMIN", "ROOM", "COMPANY", "DRIVER"].includes(item.id));
  }, [manifest]);
  const extendedRoles = useMemo(() => {
    const roles = Array.isArray(manifest?.roles) ? manifest.roles : [];
    return roles.filter((item) => ["PERSONEL", "PARENT"].includes(item.id));
  }, [manifest]);

  useEffect(() => {
    if (!surface && !manifest) {
      clearCopilotSelection('/superadmin/operation-verification');
      return;
    }
    const facts = {
      screenType: 'OPERATION_VERIFICATION',
      stage: String(surface?.defaultStatus || '').toUpperCase() || 'TEKRAR_KONTROL',
      readiness: Number(surface?.savedCount || 0) >= Number(surface?.checks?.length || 0) && Number(surface?.checks?.length || 0) > 0 ? 'READY' : 'REVIEW_NEEDED',
      readinessScore: Number(surface?.checks?.length || 0) > 0 ? Math.max(42, Math.min(90, Math.round((Number(surface?.savedCount || 0) / Number(surface?.checks?.length || 1)) * 100))) : 40,
      blockers: Number(surface?.checks?.length || 0) > Number(surface?.savedCount || 0) ? ['Tüm kontroller kayıt altına alınmadan rol yüzeyi tamam sayılmaz.'] : [],
      counters: {
        roles: Number(manifest?.totals?.roleCount || 0),
        coreRoles: coreRoles.length,
        extendedRoles: extendedRoles.length,
        checks: Number(surface?.checks?.length || 0),
        saved: Number(surface?.savedCount || 0),
        defaults: String(surface?.defaultStatus || '-'),
      },
      evidence: [
        `Rol: ${surface?.role?.label || selectedRole}`,
        `Kayıtlı kontrol: ${Number(surface?.savedCount || 0)}`,
        `Toplam kontrol: ${Number(surface?.checks?.length || 0)}`,
        copilotCheck?.title ? `İlk kontrol: ${copilotCheck.title}` : '',
      ].filter(Boolean),
      reasoningLead: 'Bu ekranda amaç rol bazlı operasyon kontrolünü kanıt tipi ve kısa notla kayıt altına almaktır.',
      nextBestAction: copilotCheck?.title
        ? 'Önce seçili rol için ilk kontrol maddesinin durumunu, kanıt tipini ve notunu netleştir.'
        : 'Önce rol seç. Sonra her kontrol maddesinde durum, kanıt ve not alanını tamamla.',
      safestNextStep: 'En risksiz adım, önce seçili rolü netleştirip tek tek kontrol maddelerini kaydetmektir.',
      compareHint: 'Varsayılan karar ile manuel kayıt aynı şey değildir; manuel kayıt yapıldıysa son kaydedilen durum esas alınır.',
    };
    setCopilotSelection({
      scopeKey: '/superadmin/operation-verification',
      entityType: 'screen',
      entityId: 6109,
      label: surface?.role?.label || selectedRole || 'Operasyon doğrulama',
      summary: [statusMap[surface?.defaultStatus] || surface?.defaultStatus || null, `${Number(surface?.savedCount || 0)}/${Number(surface?.checks?.length || 0)} kayıt`, copilotCheck?.title || null].filter(Boolean).join(' • '),
      fields: [
        { label: 'Rol', value: surface?.role?.label || selectedRole || '-', help: 'Şu an kontrol edilen rol yüzeyini gösterir.' },
        { label: 'Yüzey', value: surface?.role?.surface || '-', help: 'Seçili rolün operasyon yüzeyi tanımını gösterir.' },
        { label: 'Varsayılan Karar', value: statusMap[surface?.defaultStatus] || surface?.defaultStatus || '-', help: 'Kayıt yoksa baz alınan varsayılan karar bilgisini gösterir.' },
        { label: 'Kayıtlı Kontrol', value: String(surface?.savedCount || 0), help: 'Şu an kaydedilmiş kontrol sayısını gösterir.' },
        { label: 'Toplam Kontrol', value: String(surface?.checks?.length || 0), help: 'Seçili rol yüzeyindeki toplam kontrol sayısını gösterir.' },
        { label: 'İlk Kontrol', value: copilotCheck?.title || '-', help: 'Tablodaki ilk kontrol maddesini örnek odak olarak gösterir.' },
      ],
      badges: [
        { label: 'Önerilen Kanıt', value: (surface?.recommendedProofs || []).slice(0, 2).map((id) => proofMap[id] || id).join(', ') || '-', help: 'Bu rol için öne çıkan kanıt tiplerini gösterir.' },
      ],
      facts,
    });
    return () => clearCopilotSelection('/superadmin/operation-verification');
  }, [manifest, surface, selectedRole, statusMap, proofMap, copilotCheck, coreRoles.length, extendedRoles.length]);


  function setDraft(checkId, patch) {
    setDrafts((prev) => ({
      ...prev,
      [checkId]: {
        ...(prev[checkId] || {}),
        ...patch,
      },
    }));
  }

  async function saveCheck(item) {
    const draft = drafts[item.id] || {};
    setSavingId(item.id);
    setErr("");
    setInfo("");
    try {
      const result = await api("/api/operation-verification/records/upsert", {
        method: "POST",
        token,
        body: {
          roleId: selectedRole,
          checkId: item.id,
          status: draft.status,
          proofType: draft.proofType,
          note: draft.note,
          evidenceRef: draft.evidenceRef,
        },
      });
      setSurface(result?.surface || null);
      setInfo("Kayıt kaydedildi.");
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="panelTitle">Operasyon Doğrulama</div>
          <div className="panelSubtitle" style={{ marginTop: 6 }}>
            M78.1 Operasyon Doğrulama Yüzeyi. Rol bazlı operasyon kontrolünü, kanıt türlerini ve kısa not kaydını tek ekranda toplar. STABLE_TO yine 78.
          </div>
        </div>
        <div className="panelMeta" style={{ alignSelf: "center" }}>
          {manifest?.totals?.roleCount || 0} rol • {surface?.savedCount || 0} kayıtlı kontrol
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}
      {info ? <div style={{ marginTop: 12, color: "#90f0b1" }}>{info}</div> : null}

      <PanelKvkkHint panelKey="operationVerification" effectiveRole={selectedRole} />

      <div className="panelMeta" style={{ marginTop: 12 }}>
        Bu ekranda kanıt türleri, kısa not ve referans metni kaydedilir. Yazma işlemi için step-up gerekebilir.
      </div>

      <div className="panelSectionTitle" style={{ marginTop: 18 }}>Aktif operasyon</div>
      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(manifest?.roles || []).map((role) => (
          <button key={role.id} type="button" style={pillStyle(selectedRole === role.id)} onClick={() => setSelectedRole(role.id)}>
            {role.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Seçili rol">
          <div className="panelStatValue">{surface?.role?.label || "-"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>{surface?.goal || "-"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Yüzey: {surface?.role?.surface || "-"}</div>
        </Card>
        <Card title="Durum özeti">
          <div className="panelMeta">Varsayılan karar: {statusMap[surface?.defaultStatus] || surface?.defaultStatus || "-"}</div>
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {(statusOptions || []).map((item) => (
              <div key={item.id}>{item.label}: {surface?.statusCounts?.[item.id] || 0}</div>
            ))}
          </div>
        </Card>
        <Card title="Kanıt türleri">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(surface?.recommendedProofs || []).map((id) => (
              <span key={id} className="pill">
                {proofMap[id] || id}
              </span>
            ))}
          </div>
          <div className="panelMeta" style={{ marginTop: 8 }}>Kayıtlı kontrol: {surface?.savedCount || 0}</div>
        </Card>
      </div>

      <div className="panelSectionTitle" style={{ marginTop: 18 }}>Gelecek faz</div>
      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Genişleyen saha yüzeyleri">
          <div className="panelBody">{extendedRoles.length ? extendedRoles.map((item) => item.label).join(" • ") : "Ek yüzey yok"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {extendedRoles.map((item) => item.summary).join(" • ") || "Personel ve veli doğrulama hattı genişledikçe burada detaylanır."}
          </div>
        </Card>
        <Card title="Çekirdek doğrulama">
          <div className="panelBody">{coreRoles.length ? coreRoles.map((item) => item.label).join(" • ") : "Çekirdek rol yok"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Operasyon doğrulama ana akışı bu rollerle sürer.
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Kontrol</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Durum</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Kanıt</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Not</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Referans</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Kaydet</th>
            </tr>
          </thead>
          <tbody>
            {(surface?.checks || []).map((item) => {
              const draft = drafts[item.id] || {};
              return (
                <tr key={item.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <td style={{ padding: "10px 8px", minWidth: 240 }}>
                    <div className="panelSectionTitle">{item.title}</div>
                    <div className="panelMeta" style={{ marginTop: 6 }}>{item.nextStep || "-"}</div>
                    <div className="panelMeta" style={{ marginTop: 6 }}>
                      Kaynak: {item.statusOrigin === "MANUAL" ? "manuel kayıt" : "varsayılan"}
                      {item.updatedAt ? ` • ${new Date(item.updatedAt).toLocaleString("tr-TR")}` : ""}
                    </div>
                  </td>
                  <td style={{ padding: "10px 8px", minWidth: 150 }}>
                    <select value={draft.status || item.status || "TEKRAR_KONTROL"} onChange={(e) => setDraft(item.id, { status: e.target.value })} style={inputStyle()}>
                      {(statusOptions || []).map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "10px 8px", minWidth: 180 }}>
                    <select value={draft.proofType || ""} onChange={(e) => setDraft(item.id, { proofType: e.target.value })} style={inputStyle()}>
                      <option value="">Seç</option>
                      {(proofOptions || []).map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "10px 8px", minWidth: 220 }}>
                    <input value={draft.note || ""} onChange={(e) => setDraft(item.id, { note: e.target.value })} style={inputStyle()} placeholder="Kısa operasyon notu" />
                  </td>
                  <td style={{ padding: "10px 8px", minWidth: 180 }}>
                    <input value={draft.evidenceRef || ""} onChange={(e) => setDraft(item.id, { evidenceRef: e.target.value })} style={inputStyle()} placeholder="Link / export / build" />
                  </td>
                  <td style={{ padding: "10px 8px", minWidth: 110 }}>
                    <button type="button" className="btn sm" disabled={savingId === item.id} onClick={() => saveCheck(item)}>
                      {savingId === item.id ? "Kaydediliyor" : "Kaydet"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}







