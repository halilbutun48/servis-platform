import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import PanelKvkkHint from "../shared/PanelKvkkHint";

function Card({ title, children }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, flex: "1 1 220px" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
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
          <h2 style={{ margin: 0 }}>Operasyon Doğrulama</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            Rol bazlı operasyon kontrolünü, kanıt tiplerini ve kısa not kaydını tek ekranda toplar.
          </div>
        </div>
        <div className="muted" style={{ alignSelf: "center" }}>
          {manifest?.totals?.roleCount || 0} rol • {surface?.savedCount || 0} kayıtlı kontrol
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}
      {info ? <div style={{ marginTop: 12, color: "#90f0b1" }}>{info}</div> : null}

      <PanelKvkkHint panelKey="operationVerification" effectiveRole={selectedRole} />

      <div className="muted" style={{ marginTop: 12 }}>
        Bu ekranda kanıt tipi, kısa not ve referans metni kaydedilir. Yazma işlemi için step-up gerekebilir.
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(manifest?.roles || []).map((role) => (
          <button key={role.id} type="button" style={pillStyle(selectedRole === role.id)} onClick={() => setSelectedRole(role.id)}>
            {role.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Seçili rol">
          <div style={{ fontWeight: 700 }}>{surface?.role?.label || "-"}</div>
          <div className="muted" style={{ marginTop: 6 }}>{surface?.goal || "-"}</div>
          <div className="muted" style={{ marginTop: 6 }}>Yüzey: {surface?.role?.surface || "-"}</div>
        </Card>
        <Card title="Durum özeti">
          <div className="muted">Varsayılan karar: {statusMap[surface?.defaultStatus] || surface?.defaultStatus || "-"}</div>
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {(statusOptions || []).map((item) => (
              <div key={item.id}>{item.label}: {surface?.statusCounts?.[item.id] || 0}</div>
            ))}
          </div>
        </Card>
        <Card title="Kanıt türleri">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(surface?.recommendedProofs || []).map((id) => (
              <span key={id} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)" }}>
                {proofMap[id] || id}
              </span>
            ))}
          </div>
          <div className="muted" style={{ marginTop: 8 }}>Kayıtlı kontrol: {surface?.savedCount || 0}</div>
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
                    <div style={{ fontWeight: 600 }}>{item.title}</div>
                    <div className="muted" style={{ marginTop: 6 }}>{item.nextStep || "-"}</div>
                    <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
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





