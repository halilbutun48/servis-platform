import { useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import { changePassword } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";

function Rule({ children }) {
  return <li style={{ opacity: 0.86, marginBottom: 6 }}>{children}</li>;
}

export default function ForcePasswordChangePanel() {
  const { token, me, setToken, loadMe, logout } = useSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const policyText = useMemo(() => {
    return me?.passwordPolicy?.helpText || "Yeni şifre en az 10 karakter olmalı. Büyük harf, küçük harf, rakam ve özel karakterden en az 3 tür içermelidir.";
  }, [me?.passwordPolicy]);

  async function submit(e) {
    e?.preventDefault?.();
    setErr("");
    setBusy(true);
    try {
      const r = await changePassword({ token, newPassword, confirmPassword });
      if (!r?.token) throw new Error("Yeni oturum alınamadı.");
      setToken(r.token);
      await loadMe(r.token);
      navigate("/");
    } catch (error) {
      setErr(String(error?.message || error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <BrandMark size={44} />
          <div>
            <div className="panelTitle">Şifrenizi değiştirin</div>
            <div className="panelMeta">Bu hesap için geçici şifre kullanıldı. Devam etmek için yeni şifre belirleyin.</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Şifre kuralları</div>
          <div className="muted" style={{ marginBottom: 8 }}>{policyText}</div>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            <Rule>E-posta veya ad bilgilerinizi içermesin.</Rule>
            <Rule>Çok kolay tahmin edilen şifreler kabul edilmez.</Rule>
            <Rule>Geçici şifre ile aynı olamaz.</Rule>
          </ul>
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <label className="muted">
            Yeni şifre
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </label>
          <label className="muted">
            Yeni şifre (tekrar)
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </label>

          {err ? <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</div> : null}

          <div className="saActions">
            <button type="submit" className="btn primary" disabled={busy}>{busy ? "Kaydediliyor..." : "Şifreyi Kaydet"}</button>
            <button type="button" className="btn" onClick={logout} disabled={busy}>Çıkış</button>
          </div>
        </form>
      </div>
    </div>
  );
}
