import { useCallback, useEffect, useState } from "react";
import { getTotpStatus, setupTotp, enableTotp, verifyTotp } from "../../api";
import { useSession } from "../../state/session";

export default function TotpStepUpCard() {
  const { token, me, setToken } = useSession();
  const role = String(me?.role || "");
  const isStepUpEnabled = String(import.meta.env.VITE_STEP_UP_ENABLED ?? "1").trim() !== "0";
  const shouldShow = isStepUpEnabled && (role === "ROOM" || role === "SUPER_ADMIN" || role === "COMPANY");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  const refreshStatus = useCallback(async () => {
    if (!token || !shouldShow) return;
    try {
      const r = await getTotpStatus(token);
      setStatus(r);
      setErr("");
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }, [shouldShow, token]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  if (!token || !shouldShow) return null;
  if (!status?.required) return null;

  async function onSetup() {
    setBusy(true);
    setErr("");
    try {
      const r = await setupTotp(token);
      setSetupData(r);
      await refreshStatus();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function onEnable() {
    setBusy(true);
    setErr("");
    try {
      await enableTotp(token, code);
      setSetupData(null);
      setCode("");
      await refreshStatus();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    setBusy(true);
    setErr("");
    try {
      const r = await verifyTotp(token, code);
      if (r?.token) setToken(r.token);
      setCode("");
      await refreshStatus();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  const enabled = !!status?.enabled;
  const steppedUp = !!status?.stepUpSatisfied;
  const needsSetup = !enabled;

  return (
    <div className="card" style={{ marginBottom: 12, borderColor: steppedUp ? "#1f7a1f" : "#8a6d1f" }}>
      <div className="title">Güvenlik — TOTP Step-up</div>
      <div className="muted" style={{ marginTop: 6 }}>
        {needsSetup
          ? "Bu rol için TOTP kurulumu zorunlu. Kritik ROOM / COMPANY / SUPER_ADMIN işlemleri kurulum tamamlanmadan açılmaz."
          : steppedUp
          ? "Step-up aktif. Kritik işlemler bu oturumda açık."
          : "TOTP kurulu ama step-up doğrulaması yapılmamış. Kritik işlemler için kod doğrulayın."}
      </div>

      {!enabled ? (
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {!setupData ? (
            <button className="btn sm" disabled={busy} onClick={onSetup}>{busy ? "..." : "Kurulum Başlat"}</button>
          ) : (
            <>
              <div className="muted">Manual Key</div>
              <code style={{ whiteSpace: "pre-wrap" }}>{setupData.manualEntryKey || setupData.secretBase32}</code>
              <div className="muted">otpauth URL</div>
              <code style={{ whiteSpace: "pre-wrap" }}>{setupData.otpauthUrl}</code>
              <label className="muted">
                Uygulamadaki 6 haneli kod
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn sm" disabled={busy} onClick={onEnable}>{busy ? "..." : "Kurulumu Doğrula"}</button>
                <button className="btn sm" disabled={busy} onClick={onSetup}>Yeni Secret Üret</button>
              </div>
            </>
          )}
        </div>
      ) : !steppedUp ? (
        <div style={{ marginTop: 10, display: "grid", gap: 8, maxWidth: 360 }}>
          <label className="muted">
            6 haneli kod
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          </label>
          <button className="btn sm" disabled={busy} onClick={onVerify}>{busy ? "..." : "Step-up Doğrula"}</button>
        </div>
      ) : null}

      {err ? <div className="muted" style={{ color: "crimson", marginTop: 8 }}>{err}</div> : null}
    </div>
  );
}
