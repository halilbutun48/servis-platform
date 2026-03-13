import { useState } from "react";
import { changeDriverPin } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";

function firstErr(err) {
  return String(err?.payload?.message || err?.payload?.error || err?.message || err || "İşlem başarısız");
}

export default function PinChangePanel() {
  const { token, loadMe } = useSession();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    if (String(newPin).trim().length < 4) return setErr("Yeni PIN en az 4 hane olmalı");
    if (!/^\d{4,8}$/.test(String(newPin).trim())) return setErr("Yeni PIN sadece rakam olmalı");
    if (String(newPin) !== String(newPin2)) return setErr("Yeni PIN tekrarı aynı olmalı");

    setBusy(true);
    try {
      await changeDriverPin(String(currentPin).trim(), String(newPin).trim(), token);
      setOk("PIN güncellendi. Şimdi devam edebilirsin.");
      setCurrentPin("");
      setNewPin("");
      setNewPin2("");
      await loadMe(token);
      navigate("/driver/today");
    } catch (e2) {
      setErr(firstErr(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h3>Yeni PIN belirle</h3>
      <div className="muted" style={{ marginBottom: 10 }}>
        İlk girişte geçici PIN yerine sadece sana ait yeni bir PIN belirlemelisin.
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label className="muted">
          Geçici PIN
          <input inputMode="numeric" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} placeholder="Geçici PIN" />
        </label>
        <label className="muted">
          Yeni PIN
          <input inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="4-8 hane" />
        </label>
        <label className="muted">
          Yeni PIN tekrar
          <input inputMode="numeric" value={newPin2} onChange={(e) => setNewPin2(e.target.value)} placeholder="Tekrar yaz" />
        </label>

        <button type="submit" disabled={busy}>{busy ? "Kaydediliyor..." : "PIN'i Kaydet"}</button>
      </form>

      {err ? <div className="card err" style={{ marginTop: 10 }}>{err}</div> : null}
      {ok ? <div className="card" style={{ marginTop: 10, borderLeft: "4px solid #16a34a" }}>{ok}</div> : null}
    </div>
  );
}
