// web/src/panels/room/OffersPanel.jsx
import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAutoReload } from "../../live/useAutoReload";

function fmtTR(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTRY(amount) {
  if (amount == null) return "-";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("tr-TR").format(n);
}

function pill(status) {
  const s = String(status || "");
  return (
    <span className="pill" data-status={s} title={s}>
      {s}
    </span>
  );
}

export default function RoomOffersPanel() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // per-offer counter input
  const [counterSel, setCounterSel] = useState({}); // { [offerId]: { amountRoom, noteRoom } }

  function setCounter(offerId, patch) {
    setCounterSel((p) => ({
      ...p,
      [offerId]: { ...(p[offerId] || {}), ...(patch || {}) },
    }));
  }

  async function load() {
    setErr("");
    try {
      const r = await api.get("/api/offers/inbox");
      setItems(r?.items || []);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAutoReload("offers", load, true);

  async function onCounter(offerId) {
    const st = counterSel[offerId] || {};
    const amountRoom = st.amountRoom == null || st.amountRoom === "" ? null : Number(st.amountRoom);
    const noteRoom = String(st.noteRoom || "").trim() || undefined;

    setBusy(true);
    setErr("");
    try {
      await api.put(`/api/offers/${offerId}/counter`, { amountRoom, noteRoom });
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">Offers (Gelen Teklifler)</div>
        <div className="muted">Company tarafının gönderdiği shift teklifleri.</div>
      </div>

      {err ? (
        <div className="card err">{err}</div>
      ) : null}

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="muted">Toplam: {items.length}</div>
          <button disabled={busy} onClick={load}>
            Yenile
          </button>
        </div>
      </div>

      {items.map((o) => {
        const shift = o.shift;
        const company = shift?.company;
        const c = counterSel[o.id] || {};
        const canCounter = o.status !== "CANCELLED" && o.status !== "ACCEPTED";
        return (
          <div className="card" key={o.id}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  Shift #{o.shiftId} — {company?.name || `Company #${shift?.companyId || "?"}`}
                </div>
                <div className="muted">
                  {fmtTR(shift?.startAt)} → {fmtTR(shift?.endAt)}
                </div>
              </div>
              <div>{pill(o.status)}</div>
            </div>

            <hr />

            <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
              <div className="muted">Company: <b>{formatTRY(o.amountCompany)}</b></div>
              <div className="muted">Room: <b>{formatTRY(o.amountRoom)}</b></div>
            </div>

            {o.noteCompany ? <div className="muted">Not (Company): {o.noteCompany}</div> : null}
            {o.noteRoom ? <div className="muted">Not (Room): {o.noteRoom}</div> : null}

            {canCounter ? (
              <>
                <hr />
                <div className="row" style={{ gap: 8, alignItems: "end", flexWrap: "wrap" }}>
                  <div className="col" style={{ minWidth: 160 }}>
                    <label className="muted">Karşı Teklif (TL)</label>
                    <input
                      value={c.amountRoom ?? ""}
                      onChange={(e) => setCounter(o.id, { amountRoom: e.target.value })}
                      placeholder="örn 12500"
                    />
                  </div>
                  <div className="col" style={{ flex: 1, minWidth: 220 }}>
                    <label className="muted">Not</label>
                    <input
                      value={c.noteRoom ?? ""}
                      onChange={(e) => setCounter(o.id, { noteRoom: e.target.value })}
                      placeholder="opsiyonel"
                    />
                  </div>
                  <button disabled={busy} onClick={() => onCounter(o.id)}>
                    Counter Gönder
                  </button>
                </div>
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
