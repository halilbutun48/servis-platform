import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";

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

function formatTRY(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "-";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n) + " ₺";
}

function MetricCard({ title, value, note, accent = "default" }) {
  const accentMap = {
    default: { border: "1px solid rgba(255,255,255,0.08)", title: "#98a2b3", value: "#f8fafc" },
    warm: { border: "1px solid rgba(247,144,9,0.35)", title: "#f7b267", value: "#ffd38a" },
    good: { border: "1px solid rgba(18,183,106,0.35)", title: "#6ce9a6", value: "#d1fadf" },
  };
  const palette = accentMap[accent] || accentMap.default;
  return (
    <div style={{ padding: 14, border: palette.border, borderRadius: 14, flex: "1 1 180px" }}>
      <div className="muted" style={{ marginBottom: 8, color: palette.title, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color: palette.value, letterSpacing: "-0.02em" }}>{value}</div>
      {note ? <div className="muted" style={{ marginTop: 8 }}>{note}</div> : null}
    </div>
  );
}

function StatusBadge({ value }) {
  const normalized = String(value || "").trim().toUpperCase();
  let style = { color: "#d0d5dd", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };
  if (["OPEN", "REQUESTED"].includes(normalized)) style = { color: "#fedf89", background: "rgba(247,144,9,0.16)", border: "1px solid rgba(247,144,9,0.45)" };
  if (["COUNTERED", "PAZARLIK", "NEGOTIATION", "PENDING"].includes(normalized)) style = { color: "#b2ddff", background: "rgba(83,177,253,0.12)", border: "1px solid rgba(83,177,253,0.35)" };
  if (["ACCEPTED", "APPROVED", "ACTIVE"].includes(normalized)) style = { color: "#d1fadf", background: "rgba(18,183,106,0.16)", border: "1px solid rgba(18,183,106,0.45)" };
  if (["CANCELLED", "DONE", "REJECTED"].includes(normalized)) style = { color: "#fecdca", background: "rgba(240,68,56,0.12)", border: "1px solid rgba(240,68,56,0.35)" };
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", ...style }}>{value || "-"}</span>;
}

function offerAmountLabel(offer) {
  const parts = [];
  const company = formatTRY(offer?.amountCompany);
  const room = formatTRY(offer?.amountRoom);
  if (company !== "-") parts.push(`Firma: ${company}`);
  if (room !== "-") parts.push(`Oda: ${room}`);
  return parts.length ? parts.join(" / ") : "-";
}

export default function CompanyCommercialFlowPanel() {
  const { token } = useSession();
  const [offers, setOffers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [offerRes, shiftRes] = await Promise.all([
          api("/api/offers/company?take=400", { token }).catch(() => ({ items: [] })),
          api("/api/shifts?take=300", { token }).catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
        setOffers(Array.isArray(offerRes?.items) ? offerRes.items : []);
        setShifts(Array.isArray(shiftRes?.items) ? shiftRes.items : Array.isArray(shiftRes) ? shiftRes : []);
      } catch (e) {
        if (cancelled) return;
        setErr(String(e?.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const FINAL_STATUSES = useMemo(() => new Set(["APPROVED", "ACTIVE", "DONE", "REJECTED"]), []);

  const marketOffers = useMemo(
    () => offers.filter((o) => ["OPEN", "COUNTERED"].includes(String(o?.status || "").toUpperCase())),
    [offers]
  );
  const acceptedOffers = useMemo(
    () => offers.filter((o) => String(o?.status || "").toUpperCase() === "ACCEPTED"),
    [offers]
  );
  const finalItems = useMemo(
    () => shifts.filter((s) => FINAL_STATUSES.has(String(s?.status || "").toUpperCase())),
    [shifts, FINAL_STATUSES]
  );

  const cards = useMemo(() => {
    const activeOps = finalItems.filter((s) => ["APPROVED", "ACTIVE"].includes(String(s?.status || "").toUpperCase())).length;
    return [
      { title: "Market Teklifi", value: marketOffers.length, note: "Gerçek teklif / karşı teklif kayıtları", accent: marketOffers.length ? "warm" : "default" },
      { title: "Karşı Teklif", value: marketOffers.filter((o) => String(o?.status || "").toUpperCase() === "COUNTERED").length, note: "Room cevabı bekleyen kayıtlar", accent: marketOffers.some((o) => String(o?.status || "").toUpperCase() === "COUNTERED") ? "warm" : "default" },
      { title: "Kabul Edilen", value: acceptedOffers.length, note: "Pazarlığı bitip bekleyen taleplere inen kayıtlar", accent: acceptedOffers.length ? "good" : "default" },
      { title: "Liste", value: finalItems.length, note: "APPROVED / ACTIVE / DONE / REJECTED" },
      { title: "Aktif Operasyon", value: activeOps, note: "Sahaya inen işler", accent: activeOps ? "good" : "default" },
    ];
  }, [marketOffers, acceptedOffers, finalItems]);

  const flowItems = useMemo(() => {
    const offerRows = offers.map((o) => {
      const status = String(o?.status || "").toUpperCase();
      const flowLabel = status === "OPEN" ? "Teklif" : status === "COUNTERED" ? "Karşı teklif" : status === "ACCEPTED" ? "Kabul" : "Kapanan teklif";
      const nextStep = status === "ACCEPTED"
        ? "Pazarlık bitti; Bekleyen Taleplerde operasyon hazırlığını takip et"
        : "Pazarlığı Market / Teklifler ekranında sürdür";
      return {
        id: `offer-${o.id}`,
        shiftId: Number(o?.shiftId || o?.shift?.id || 0) || null,
        counterparty: o?.room?.name || o?.room?.title || (Number(o?.roomId || 0) > 0 ? `Room #${o.roomId}` : "Room"),
        flowLabel,
        amountLabel: offerAmountLabel(o),
        statusLabel: status,
        updatedAt: o?.updatedAt || o?.createdAt || o?.shift?.updatedAt || null,
        nextStep,
        section: status === "ACCEPTED" ? "pending" : "market",
      };
    });

    const finalRows = finalItems.map((s) => ({
      id: `shift-${s.id}`,
      shiftId: Number(s.id) || null,
      counterparty: s?.room?.name || s?.room?.title || (Number(s?.roomId || 0) > 0 ? `Room #${s.roomId}` : "Room"),
      flowLabel: "Operasyon",
      amountLabel: "-",
      statusLabel: String(s?.status || "-").toUpperCase(),
      updatedAt: s?.updatedAt || s?.startAt || null,
      nextStep: "Vardiya / hizmet tarafını aç",
      section: "list",
    }));

    return [...offerRows, ...finalRows]
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 12);
  }, [offers, finalItems]);

  function openShifts(section, shiftId) {
    navigate("/company/shifts");
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent("company:shifts:focus", {
          detail: { section, shiftIds: shiftId ? [Number(shiftId)] : [] },
        }));
      } catch (_) {}
    }, 60);
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Ticari Akışım</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            Company için ticari görünüm artık gerçek market tekliflerinden beslenir. Vardiya üstündeki eski room-offer alanları burada referans alınmaz.
          </div>
        </div>
        <div className="muted">Kapsam: Kendi ticari alanınız</div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {cards.map((card) => <MetricCard key={card.title} {...card} />)}
      </div>

      <div style={{ marginTop: 16, padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 700 }}>Ticari Akış Listesi</div>
            <div className="muted" style={{ marginTop: 4 }}>Market, kabul ve operasyona inen kayıtların tek kanonik özeti</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => navigate("/company/planning")}>Planlama Merkezi'ni aç</button>
            <button type="button" onClick={() => openShifts("market")}>Marketi aç</button>
            <button type="button" onClick={() => navigate("/company/service-evaluation")}>Hizmet Değerlendirme</button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>Karşı Taraf</th>
                <th>Akış</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Son Güncelleme</th>
                <th>Sonraki Adım</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {flowItems.length ? flowItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.counterparty}</td>
                  <td>{item.flowLabel}</td>
                  <td>{item.amountLabel}</td>
                  <td><StatusBadge value={item.statusLabel} /></td>
                  <td>{fmtTR(item.updatedAt)}</td>
                  <td>{item.nextStep}</td>
                  <td>
                    <button type="button" onClick={() => openShifts(item.section || "market", item.shiftId)}>
                      {item.section === "list" ? "Listeyi aç" : item.section === "pending" ? "Bekleyeni aç" : "Marketi aç"}
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: "8px 0" }}>
                    Henüz company kapsamına düşen ticari kayıt yok. Kural: pazarlık Market'te, operasyon hazırlığı Bekleyen Taleplerde, onaylı işler Liste'de.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
