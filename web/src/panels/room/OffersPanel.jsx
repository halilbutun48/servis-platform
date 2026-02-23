// web/src/panels/room/OffersPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";

const STATUS_ORDER = { COUNTERED: 0, OPEN: 1, ACCEPTED: 2, CANCELLED: 3 };

function sortOffers(items) {
  return [...items].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 9;
    const sb = STATUS_ORDER[b.status] ?? 9;
    if (sa !== sb) return sa - sb;
    const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return tb - ta;
  });
}

function fmtTR(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  } catch {
    return String(iso);
  }
}

function fmtMoney(x) {
  if (x == null) return "-";
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x);
  return new Intl.NumberFormat("tr-TR").format(n);
}

function trimOrNull(s) {
  const t = String(s ?? "").trim();
  return t ? t : null;
}

function parseTryInput(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/\./g, "").replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function OffersPanel() {
  const { token } = useSession();

  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("ACTIVE"); // ACTIVE | ACCEPTED | CANCELLED | ALL
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [counter, setCounter] = useState({
    open: false,
    offerId: null,
    amountRoom: "",
    noteRoom: "",
  });

  // ✅ M25: WS invalidate('offers') gelince otomatik yenile
  useAutoReload("offers");

  async function load() {
    setErr("");
    setBusy(true);
    try {
      let status = "";
      if (filter === "ACTIVE") status = "OPEN,COUNTERED";
      if (filter === "ACCEPTED") status = "ACCEPTED";
      if (filter === "CANCELLED") status = "CANCELLED";

      const q = status ? `?status=${encodeURIComponent(status)}` : "";
      const r = await api(`/api/offers/inbox${q}`, { method: "GET", token });
      const list = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
      setItems(list);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const sorted = useMemo(() => sortOffers(items), [items]);

  async function doCounter() {
    setErr("");
    const offerId = Number(counter.offerId);
    if (!offerId) return;

    const amountRoom = parseTryInput(counter.amountRoom);
    const noteRoom = trimOrNull(counter.noteRoom);

    setBusy(true);
    try {
      await api(`/api/offers/${offerId}/counter`, {
        method: "PUT",
        token,
        body: { amountRoom: amountRoom ?? null, noteRoom: noteRoom ?? null },
      });

      setCounter({ open: false, offerId: null, amountRoom: "", noteRoom: "" });
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Offers (ROOM)</h3>
        <div className="muted">Gelen teklifler • Karşı teklif verebilir, kabul edilen/iptal edilenleri takip edebilirsin.</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label className="muted">
              Durum:&nbsp;
              <select value={filter} onChange={(e) => setFilter(e.target.value)} disabled={busy}>
                <option value="ACTIVE">Açık + Karşı Teklif</option>
                <option value="ACCEPTED">Kabul Edilen</option>
                <option value="CANCELLED">İptal Edilen</option>
                <option value="ALL">Hepsi</option>
              </select>
            </label>

            <button type="button" disabled={busy} onClick={load}>
              Yenile
            </button>

            {busy ? <span className="muted">Yükleniyor…</span> : null}
          </div>

          <div className="muted" style={{ fontSize: 12 }}>
            Varsayılan sıralama: COUNTERED → OPEN → ACCEPTED → CANCELLED (updatedAt desc)
          </div>
        </div>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="tbl" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Shift</th>
              <th>Company Teklif</th>
              <th>Room Teklif</th>
              <th>Güncelleme</th>
              <th>İşlem</th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((o) => (
              <tr key={o.id}>
                <td>
                  <span className="pill" data-status={o.status}>
                    {o.status}
                  </span>
                </td>

                <td style={{ whiteSpace: "nowrap" }}>
                  <div>
                    <b>Shift #{o.shiftId}</b>
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {o.shift?.startAt ? fmtTR(o.shift.startAt) : "-"} → {o.shift?.endAt ? fmtTR(o.shift.endAt) : "-"}
                  </div>
                  {o.shift?.company?.name ? (
                    <div className="muted" style={{ fontSize: 12 }}>
                      Company: {o.shift.company.name}
                    </div>
                  ) : null}
                </td>

                <td className="muted" title={o.noteCompany || ""}>
                  <div>{fmtMoney(o.amountCompany)} ₺</div>
                  {o.noteCompany ? <div style={{ fontSize: 12 }}>{o.noteCompany}</div> : null}
                </td>

                <td className="muted" title={o.noteRoom || ""}>
                  <div>{fmtMoney(o.amountRoom)} ₺</div>
                  {o.noteRoom ? <div style={{ fontSize: 12 }}>{o.noteRoom}</div> : null}
                </td>

                <td className="muted" style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                  {o.updatedAt ? fmtTR(o.updatedAt) : "-"}
                </td>

                <td>
                  {(o.status === "OPEN" || o.status === "COUNTERED") ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setCounter({
                          open: true,
                          offerId: o.id,
                          amountRoom: o.amountRoom != null ? String(o.amountRoom) : "",
                          noteRoom: o.noteRoom ?? "",
                        })
                      }
                    >
                      Karşı Teklif
                    </button>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}

            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Kayıt yok.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {counter.open ? (
        <div className="card" style={{ border: "1px solid #ddd" }}>
          <h3>Karşı Teklif</h3>

          <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <div className="col" style={{ minWidth: 160 }}>
              <label className="muted">Tutar (₺)</label>
              <input
                value={counter.amountRoom}
                onChange={(e) => setCounter((s) => ({ ...s, amountRoom: e.target.value }))}
                placeholder="örn. 22000"
                disabled={busy}
              />
            </div>

            <div className="col" style={{ flex: 1, minWidth: 240 }}>
              <label className="muted">Not (opsiyonel)</label>
              <input
                value={counter.noteRoom}
                onChange={(e) => setCounter((s) => ({ ...s, noteRoom: e.target.value }))}
                placeholder="opsiyonel"
                disabled={busy}
              />
            </div>

            <button type="button" disabled={busy} onClick={doCounter}>
              {busy ? "..." : "Gönder"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setCounter({ open: false, offerId: null, amountRoom: "", noteRoom: "" })}
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}