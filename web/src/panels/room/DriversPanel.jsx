import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";

export default function DriversPanel() {
  const { token } = useSession();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function load() {
    setErr("");
    try {
      const r = await api("/api/drivers", { token });
      setItems(Array.isArray(r) ? r : []);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line
  useAutoReload("drivers", load);

  async function createDriver(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        deviceInfo: deviceInfo.trim(),
      };
      if (email.trim() && password.trim()) {
        body.email = email.trim();
        body.password = password.trim();
      }
      await api("/api/drivers", { method: "POST", token, body });
      setFullName("");
      setPhone("");
      setDeviceInfo("");
      setEmail("");
      setPassword("");
      await load();
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Drivers</h3>
        <div className="muted">ROOM: sürücü ekle/listele (opsiyonel login hesabı)</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="card">
        <h3>Yeni Sürücü</h3>
        <form onSubmit={createDriver} className="grid">
          <div className="col">
            <label className="muted">Ad Soyad</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ali Veli" />
          </div>
          <div className="col">
            <label className="muted">Telefon</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx..." />
          </div>
          <div className="col">
            <label className="muted">Cihaz</label>
            <input value={deviceInfo} onChange={(e) => setDeviceInfo(e.target.value)} placeholder="Android / iOS / tracker" />
          </div>

          <div className="col">
            <label className="muted">Login e-posta (opsiyonel)</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="driver2@demo.com" />
          </div>
          <div className="col">
            <label className="muted">Login şifre (opsiyonel)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="demo123" />
          </div>
          <div className="col" style={{ justifyContent: "end" }}>
            <button disabled={busy} type="submit">{busy ? "..." : "Ekle"}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Liste</h3>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Ad Soyad</th>
              <th>Telefon</th>
              <th>Cihaz</th>
              <th>Backup</th>
              <th>Login</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.fullName}</td>
                <td>{d.phone}</td>
                <td className="muted">{d.deviceInfo || "-"}</td>
                <td className="muted">{d.backupDriver ? d.backupDriver.fullName : "-"}</td>
                <td className="muted">{d.user ? d.user.email : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
