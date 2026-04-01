import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { navigate } from "../../router";

function useAccessToken(path) {
  return useMemo(() => {
    const idx = String(path || "").indexOf("?");
    const search = idx >= 0 ? String(path).slice(idx + 1) : "";
    const qs = new URLSearchParams(search);
    return String(qs.get("token") || "").trim();
  }, [path]);
}

function errCodeOf(e) {
  return String(e?.payload?.error || e?.message || "").trim().toUpperCase();
}

function accessStateMeta(code) {
  const c = String(code || "").trim().toUpperCase();
  if (c === "ACCESS_REVOKED" || c === "INVITE_REVOKED") return { terminal: true, title: "Erişim iptal edilmiş", body: "Bu erişim okul tarafından iptal edilmiş." };
  if (c === "ACCESS_EXPIRED" || c === "INVITE_EXPIRED") return { terminal: true, title: "Erişim süresi dolmuş", body: "Bu erişim artık geçerli değil. Okuldan yeni erişim iste." };
  if (c === "ACCESS_NOT_FOUND" || c === "INVITE_NOT_FOUND") return { terminal: true, title: "Erişim bulunamadı", body: "Bağlantı veya erişim bilgisi geçersiz." };
  if (c === "ACCESS_DISABLED") return { terminal: true, title: "Erişim kapalı", body: "Bu erişim şu an kullanılamıyor." };
  return { terminal: false, title: "", body: "" };
}

export default function AcceptParentInvitePanel({ path }) {
  const accessToken = useAccessToken(path);
  const { setToken } = useSession();
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [accessStateCode, setAccessStateCode] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [pin, setPin] = useState("");
  const [autoTried, setAutoTried] = useState(false);

  useEffect(() => {
    setInfo(null);
    setErr("");
    setAccessStateCode("");
    setAutoTried(false);
    if (!accessToken) return;
    let off = false;
    setLoadingInfo(true);
    api(`/api/auth/parent-invite/info?token=${encodeURIComponent(accessToken)}`)
      .then((r) => {
        if (!off) setInfo(r?.access || null);
      })
      .catch((e) => {
        if (!off) {
          const code = errCodeOf(e);
          setAccessStateCode(code);
          setErr(code || String(e?.message || e));
        }
      })
      .finally(() => {
        if (!off) setLoadingInfo(false);
      });
    return () => {
      off = true;
    };
  }, [accessToken]);

  const stateMeta = accessStateMeta(accessStateCode);
  const formLocked = busy || loadingInfo || stateMeta.terminal;

  async function finishLogin(body) {
    setBusy(true);
    setErr("");
    try {
      const r = await api("/api/auth/parent-invite/accept", { method: "POST", body });
      setToken(r?.token || "");
      navigate("/parent/live");
    } catch (e2) {
      const code = errCodeOf(e2);
      setAccessStateCode(code);
      setErr(code || String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!accessToken) return;
    if (loadingInfo || stateMeta.terminal || busy || autoTried) return;
    setAutoTried(true);
    finishLogin({ token: accessToken });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, loadingInfo, stateMeta.terminal, autoTried]);

  function onCodePinAccess(e) {
    e?.preventDefault?.();
    if (formLocked) return;
    finishLogin({ accessCode, pin });
  }

  return (
    <div className="wrap wrap--fluid">
      <div className="card">
        <div className="title">Veli Erişimi</div>
        <div className="muted" style={{ marginTop: 8 }}>
          {info ? `${info.company?.name || "Okul"} • ${info.child?.fullName || "Öğrenci"}` : "Öğrencinize ait canlı takibe süreli erişim sağlayın."}
        </div>
      </div>

      {err ? <div className="card err" style={{ marginTop: 12 }}>{err}</div> : null}

      {stateMeta.terminal ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="title">{stateMeta.title}</div>
          <div className="muted" style={{ marginTop: 8 }}>{stateMeta.body}</div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" className="secondary" onClick={() => navigate("/")}>Giriş ekranına dön</button>
          </div>
        </div>
      ) : null}

      {!stateMeta.terminal ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="title">Kod + PIN ile giriş</div>
          <div className="muted" style={{ marginTop: 8, marginBottom: 12 }}>
            Okulun verdiği erişim kodu ve PIN ile giriş yapabilirsin.
          </div>
          {accessToken ? (
            <div className="muted" style={{ marginBottom: 12 }}>
              Açtığın erişim linki doğrulanıyor. Otomatik giriş olmazsa aşağıdan Kod + PIN ile devam edebilirsin.
            </div>
          ) : null}
          <form onSubmit={onCodePinAccess} style={{ display: "grid", gap: 10, maxWidth: 420 }}>
            <label className="muted">Erişim Kodu<input value={accessCode} onChange={(e) => setAccessCode(String(e.target.value || "").toUpperCase())} disabled={formLocked} /></label>
            <label className="muted">PIN<input value={pin} onChange={(e) => setPin(String(e.target.value || ""))} disabled={formLocked} /></label>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="submit" disabled={formLocked}>{busy ? "..." : "Giriş yap"}</button>
              <button type="button" className="secondary" onClick={() => navigate("/")}>Giriş ekranına dön</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
