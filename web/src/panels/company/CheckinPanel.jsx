import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import QrCanvas from "../../components/checkin/QrCanvas";
import { formatDateTimeTR } from "../../utils/time";
import { nowIsoTR } from "../../utils/time";
import { displayStatusLabel } from "../../utils/displayStatus";

function fmt(dt) {
  try {
    return formatDateTimeTR(dt);
  } catch {
    return String(dt || "-");
  }
}

function statusPill(status) {
  const key = String(status || "COUNT").toUpperCase();
  return <span className="pill" data-status={key}>{displayStatusLabel(key)}</span>;
}

export default function CompanyCheckinPanel() {
  const { token, me } = useSession();
  const featureOn = true;

  const [items, setItems] = useState([]);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [people, setPeople] = useState([]);
  const [events, setEvents] = useState([]);
  const [counts, setCounts] = useState({ BOARD: 0, ALIGHT: 0 });
  const [credMap, setCredMap] = useState({});
  const [busyMap, setBusyMap] = useState({});
  const [lastIssued, setLastIssued] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedShift = useMemo(
    () => items.find((x) => String(x.id) === String(selectedShiftId)) || null,
    [items, selectedShiftId]
  );

  const loadShifts = useCallback(async () => {
    if (!featureOn) return;
    const sh = await api("/api/shifts?take=200&status=APPROVED,ACTIVE,DONE", { token });
    const list = Array.isArray(sh) ? sh : sh?.items ?? [];
    list.sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
    setItems(list);
    setSelectedShiftId((prev) => {
      if (prev && list.some((x) => String(x.id) === String(prev))) return prev;
      const active = list.find((x) => x.status === "ACTIVE") || list[0] || null;
      return active ? String(active.id) : "";
    });
  }, [featureOn, token]);

  const loadShiftDetail = useCallback(async (shiftId) => {
    if (!featureOn || !shiftId) {
      setPeople([]);
      setEvents([]);
      setCounts({ BOARD: 0, ALIGHT: 0 });
      setCredMap({});
      return;
    }

    const [peopleResp, eventsResp] = await Promise.all([
      api(`/api/shifts/${shiftId}/people`, { token }),
      api(`/api/checkin/shifts/${shiftId}/events`, { token }),
    ]);

    const plist = Array.isArray(peopleResp) ? peopleResp : peopleResp?.items ?? [];
    const eitems = Array.isArray(eventsResp) ? eventsResp : eventsResp?.items ?? [];
    setPeople(plist);
    setEvents(eitems);
    setCounts(eventsResp?.counts ?? { BOARD: 0, ALIGHT: 0 });

    const results = await Promise.all(
      plist.map(async (p) => {
        try {
          const r = await api(`/api/checkin/company/personels/${p.personelId || p.id}/credentials`, { token });
          return [String(p.personelId || p.id), r?.items ?? []];
        } catch {
          return [String(p.personelId || p.id), []];
        }
      })
    );

    setCredMap(Object.fromEntries(results));
  }, [featureOn, token]);

  const loadAll = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      await loadShifts();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [loadShifts]);

  useEffect(() => {
    loadAll();
  }, [loadAll, featureOn, me?.companyId, me?.companyKind]);

  useEffect(() => {
    if (!selectedShiftId || !featureOn) return;
    setErr("");
    setLoading(true);
    loadShiftDetail(selectedShiftId)
      .catch((e) => setErr(String(e?.message || e)))
      .finally(() => setLoading(false));
  }, [selectedShiftId, featureOn, loadShiftDetail]);

  useAutoReload("shifts", async () => {
    await loadShifts();
    if (selectedShiftId) await loadShiftDetail(selectedShiftId);
  }, featureOn);

  useAutoReload("checkin", async () => {
    if (selectedShiftId) await loadShiftDetail(selectedShiftId);
  }, featureOn);

  async function issueCredential(personelId, type) {
    const key = `${personelId}:${type}`;
    setBusyMap((p) => ({ ...p, [key]: true }));
    setErr("");
    try {
      const r = await api(`/api/checkin/company/personels/${personelId}/credentials/issue`, {
        method: "POST",
        token,
        body: { type },
      });
      setLastIssued({
        personelId,
        type,
        token: r?.token || "",
        at: nowIsoTR(),
      });
      if (selectedShiftId) await loadShiftDetail(selectedShiftId);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusyMap((p) => ({ ...p, [key]: false }));
    }
  }

  async function revokeAll(personelId) {
    const key = `${personelId}:REVOKE`;
    setBusyMap((p) => ({ ...p, [key]: true }));
    setErr("");
    try {
      await api(`/api/checkin/company/personels/${personelId}/credentials/revoke`, {
        method: "POST",
        token,
        body: {},
      });
      if (selectedShiftId) await loadShiftDetail(selectedShiftId);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusyMap((p) => ({ ...p, [key]: false }));
    }
  }

  async function copyToken() {
    try {
      if (!lastIssued?.token) return;
      await navigator.clipboard.writeText(lastIssued.token);
    } catch { /* no-op: clipboard copy is best-effort */ }
  }


  return (
    <div>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0 }}>{me?.companyKind === "SCHOOL" ? "Öğrenci / Personel Check-in" : "Personel Check-in"}</h3>
            <div className="muted" style={{ marginTop: 6 }}>
              M42 opsiyonel paneli: vardiya içi kişi listesi üzerinden QR/NFC credential üret, revoke et ve canlı biniş/iniş eventlerini izle.
            </div>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="pill" data-status="COUNT">Opsiyonel check-in</span>
            <button type="button" className="btn" onClick={loadAll} disabled={loading}>{loading ? "..." : "Yenile"}</button>
          </div>
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      {lastIssued?.token ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Son üretilen credential</h3>
          <div className="muted" style={{ marginBottom: 8 }}>
            Personel #{lastIssued.personelId} • {lastIssued.type} • {fmt(lastIssued.at)}
          </div>
          <div className="grid" style={{ alignItems: "start" }}>
            <div>
              <textarea readOnly value={lastIssued.token} rows={3} style={{ width: "100%", resize: "vertical", background: "#0c1322", color: "#e7eefc", border: "1px solid #2b3d64", borderRadius: 10, padding: 10 }} />
              <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn" onClick={copyToken}>Token kopyala</button>
                <button type="button" className="secondary" onClick={() => setLastIssued(null)}>Temizle</button>
              </div>
            </div>
            <div>
              <QrCanvas value={lastIssued.token} size={220} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="row" style={{ gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <label className="col" style={{ minWidth: 320, flex: 1 }}>
            <span className="muted">Vardiya seç</span>
            <select value={selectedShiftId} onChange={(e) => setSelectedShiftId(e.target.value)}>
              <option value="">Vardiya seç</option>
              {items.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id} • {displayStatusLabel(s.status)} • {fmt(s.startAt)}
                </option>
              ))}
            </select>
          </label>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="pill" data-status="COUNT">BOARD {counts.BOARD || 0}</span>
            <span className="pill" data-status="COUNT">ALIGHT {counts.ALIGHT || 0}</span>
            {selectedShift ? statusPill(selectedShift.status) : null}
          </div>
        </div>
        {selectedShift ? (
          <div className="muted" style={{ marginTop: 10 }}>
            Shift #{selectedShift.id} • Araç {selectedShift.vehicle?.plate || "-"} • Sürücü {selectedShift.driver?.fullName || "-"}
          </div>
        ) : null}
      </div>

      <div className="grid">
        <div className="card" style={{ overflowX: "auto" }}>
          <h3 style={{ marginTop: 0 }}>Vardiya kişileri</h3>
          <div className="muted" style={{ marginBottom: 10 }}>
            QR/NFC üretimi seçili vardiyadaki kişi listesiyle sınırlı tutulur. Token yalnızca üretildiği anda görünür. QR çıktısı da aynı kartta gösterilir.
          </div>
          <table className="tbl" style={{ whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th>Kişi</th>
                <th>ID</th>
                <th>Credential</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {people.length ? people.map((p) => {
                const pid = Number(p.personelId || p.id);
                const creds = credMap[String(pid)] || [];
                const active = creds.filter((x) => x.status === "ACTIVE");
                return (
                  <tr key={pid}>
                    <td>{p.fullName || p.name || `Personel #${pid}`}</td>
                    <td>#{pid}</td>
                    <td>
                      {active.length ? active.map((x) => <span key={x.id} className="pill" data-status="ACTIVE" style={{ marginRight: 6 }}>{displayStatusLabel(x.type)}</span>) : <span className="muted">Aktif credential yok</span>}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        <button type="button" className="btn sm" disabled={busyMap[`${pid}:QR`]} onClick={() => issueCredential(pid, "QR")}>{busyMap[`${pid}:QR`] ? "..." : "QR Üret"}</button>
                        <button type="button" className="btn sm" disabled={busyMap[`${pid}:NFC`]} onClick={() => issueCredential(pid, "NFC")}>{busyMap[`${pid}:NFC`] ? "..." : "NFC Üret"}</button>
                        <button type="button" className="secondary" disabled={busyMap[`${pid}:REVOKE`]} onClick={() => revokeAll(pid)}>{busyMap[`${pid}:REVOKE`] ? "..." : "Tümünü Revoke"}</button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={4} className="muted">Seçili vardiyada kişi bulunamadı.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ overflowX: "auto" }}>
          <h3 style={{ marginTop: 0 }}>Check-in eventleri</h3>
          <div className="muted" style={{ marginBottom: 10 }}>
            ROOM ve DRIVER tarafında aynı event akışı okunur. Bu panel WS invalidate ile kendi kendine tazelenir.
          </div>
          <table className="tbl" style={{ whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Kişi</th>
                <th>Tip</th>
                <th>Kaynak</th>
              </tr>
            </thead>
            <tbody>
              {events.length ? events.map((it) => (
                <tr key={it.id}>
                  <td>{fmt(it.at)}</td>
                  <td>{it.personel?.fullName || `#${it.personelId}`}</td>
                  <td>{statusPill(it.eventType)}</td>
                  <td>{it.source || "-"}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="muted">Henüz event yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
