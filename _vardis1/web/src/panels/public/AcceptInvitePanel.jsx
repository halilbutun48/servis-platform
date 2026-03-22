import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { navigate } from "../../router";
import GoogleLoginButton from "../../components/GoogleLoginButton";

function useInviteToken(path) {
  return useMemo(() => {
    const idx = String(path || "").indexOf("?");
    const search = idx >= 0 ? String(path).slice(idx + 1) : "";
    const qs = new URLSearchParams(search);
    return String(qs.get("token") || "").trim();
  }, [path]);
}

function errCodeOf(e) {
  return String(e?.payload?.error || e?.payload?.code || e?.message || "").trim().toUpperCase();
}

function inviteStateMeta(code) {
  const c = String(code || "").trim().toUpperCase();
  if (c === "INVITE_REVOKED") return { terminal: true, title: "Link iptal edilmiş", body: "Bu giriş daveti iptal edilmiş. Yeni link iste." };
  if (c === "INVITE_CONSUMED") return { terminal: true, title: "Link kullanılmış", body: "Bu davet daha önce kullanılmış. Aynı link ikinci kez kullanılamaz." };
  if (c === "INVITE_EXPIRED") return { terminal: true, title: "Link süresi dolmuş", body: "Bu davetin süresi dolmuş. Yeni link iste." };
  if (c === "INVITE_NOT_FOUND") return { terminal: true, title: "Link bulunamadı", body: "Invite token geçersiz veya sistemde yok." };
  return { terminal: false, title: "", body: "" };
}

function nextPathForRole(role) {
  const r = String(role || "").toUpperCase();
  if (r === "ROOM") return "/room/map";
  if (r === "COMPANY") return "/company";
  if (r === "DRIVER") return "/driver/today";
  if (r === "PERSONEL") return "/personel/live";
  if (r === "PARENT") return "/parent/live";
  return "/";
}

export default function AcceptInvitePanel({ path }) {
  const inviteToken = useInviteToken(path);
  const { setToken } = useSession();
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);

  useEffect(() => {
    setInfo(null);
    setErr("");
    setInviteCode("");
    if (!inviteToken) {
      setErr("Invite token bulunamadı.");
      setInviteCode("INVITE_NOT_FOUND");
      return;
    }
    let off = false;
    setLoadingInfo(true);
    api(`/api/auth/invite/info?token=${encodeURIComponent(inviteToken)}`)
      .then((r) => {
        if (off) return;
        setInfo(r?.invite || null);
      })
      .catch((e) => {
        if (off) return;
        const code = errCodeOf(e);
        setInviteCode(code);
        setErr(code || String(e?.message || e));
      })
      .finally(() => {
        if (!off) setLoadingInfo(false);
      });
    return () => {
      off = true;
    };
  }, [inviteToken]);

  const stateMeta = inviteStateMeta(inviteCode);

  return (
    <div className="wrap">
      <div className="card">
        <div className="muted">Vardis</div>
        <div className="title" style={{ marginTop: 6 }}>Giriş Daveti</div>
        <div className="muted" style={{ marginTop: 8 }}>
          {info ? `${info.title || "Giriş Daveti"}${info.company?.name ? ` • ${info.company.name}` : info.room?.name ? ` • ${info.room.name}` : ""}` : "Davet bilgisi okunuyor..."}
        </div>
      </div>

      {err ? <div className="card err" style={{ marginTop: 12 }}>{err}</div> : null}

      {stateMeta.terminal ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="title">{stateMeta.title}</div>
          <div className="muted" style={{ marginTop: 8 }}>{stateMeta.body}</div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" className="secondary" onClick={() => navigate("/")}>Login ekranına dön</button>
          </div>
        </div>
      ) : null}

      {!stateMeta.terminal ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="title">Google ile giriş yap</div>
          <div className="muted" style={{ marginTop: 6 }}>Vardis hesabına erişim daveti</div>
          <div className="muted" style={{ marginTop: 8, marginBottom: 12 }}>
            {loadingInfo
              ? "Davet doğrulanıyor..."
              : info?.role === "DRIVER"
              ? "Bu davet bir sürücü hesabı açar. Google hesabındaki doğrulanmış e-posta davet e-postasıyla aynı olmalı."
              : info?.role === "PERSONEL"
              ? "Bu davet personel hesabını Google ile açar. Şifre dağıtımı yerine davet + doğrulanmış Google e-postası kullanılır."
              : info?.role === "PARENT"
              ? "Bu davet parent hesabını Google ile açar ve çocuk bağlantısını otomatik bağlar."
              : "Davetteki e-postayla aynı Google hesabını kullan."}
          </div>

          {info ? (
            <div className="muted" style={{ marginBottom: 12 }}>
              <div><b>Rol:</b> {info.role || "-"}</div>
              {info.email ? <div><b>E-posta:</b> {info.email}</div> : null}
              {info.personel?.fullName ? <div><b>Profil:</b> {info.personel.fullName}</div> : null}
              {info.driver?.fullName ? <div><b>Profil:</b> {info.driver.fullName}</div> : null}
              {info.child?.fullName ? <div><b>Çocuk:</b> {info.child.fullName}</div> : null}
              {info.expiresAt ? <div><b>Biter:</b> {new Date(info.expiresAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</div> : null}
            </div>
          ) : null}

          {!loadingInfo ? (
            <GoogleLoginButton
              inviteToken={inviteToken}
              onSuccess={(r) => {
                setToken(r?.token || "");
                navigate(nextPathForRole(r?.user?.role));
              }}
              onError={(e) => {
                const code = errCodeOf(e);
                setInviteCode(code);
                setErr(code || String(e?.message || e));
              }}
            />
          ) : null}

          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" className="secondary" onClick={() => navigate("/")}>Login ekranına dön</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
