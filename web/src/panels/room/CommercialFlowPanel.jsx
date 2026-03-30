import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";
import { includesFilter, rowSelectionStyle } from "../../utils/listUi";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildCommercialFlowFacts } from "../../utils/copilotFacts";

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
  if (["COUNTERED", "PAZARLIK", "NEGOTIATION"].includes(normalized)) style = { color: "#b2ddff", background: "rgba(83,177,253,0.12)", border: "1px solid rgba(83,177,253,0.35)" };
  if (["ACCEPTED", "APPROVED", "ACTIVE"].includes(normalized)) style = { color: "#d1fadf", background: "rgba(18,183,106,0.16)", border: "1px solid rgba(18,183,106,0.45)" };
  if (["CANCELLED", "DONE", "REJECTED"].includes(normalized)) style = { color: "#fecdca", background: "rgba(240,68,56,0.12)", border: "1px solid rgba(240,68,56,0.35)" };
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", ...style }}>{value || "-"}</span>;
}

export default function CommercialFlowPanel() {
  const { token } = useSession();
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, i] = await Promise.all([
          api("/api/commercial-core/room/summary", { token }),
          api("/api/commercial-core/room/items", { token }),
        ]);
        if (cancelled) return;
        setSummary(s || null);
        setItems(Array.isArray(i?.items) ? i.items : []);
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);


  function openAction(item) {
    if (item?.actionPath === "/room/shifts" && Number(item?.shiftId) > 0) {
      localStorage.setItem("room:focusPendingShiftId", String(item.shiftId));
    }
    navigate(item.actionPath);
  }

  const filteredItems = useMemo(() => items.filter((item) => includesFilter([
    item?.id,
    item?.counterparty,
    item?.flowLabel,
    item?.amountLabel,
    item?.statusLabel,
    item?.status,
    item?.nextStep,
    item?.updatedAt,
  ], filterQ)), [items, filterQ]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId("");
      clearCopilotSelection('/room/commercial-flow');
      return;
    }
    if (!filteredItems.some((item) => String(item?.id || '') === String(selectedId || ''))) {
      setSelectedId(String(filteredItems[0].id || ''));
    }
  }, [filteredItems, selectedId]);

  const selectedItem = useMemo(
    () => filteredItems.find((item) => String(item?.id || '') === String(selectedId || '')) || filteredItems[0] || null,
    [filteredItems, selectedId]
  );

  useEffect(() => {
    if (!selectedItem) return;
    const facts = buildCommercialFlowFacts({
      selectedItem,
      marketCount: summary?.cards?.openOffers || 0,
      acceptedCount: summary?.cards?.acceptedOffers || 0,
      listCount: items.length,
    });
    setCopilotSelection({
      scopeKey: '/room/commercial-flow',
      entityType: selectedItem?.shiftId ? 'shift' : 'commercial',
      entityId: Number(selectedItem?.shiftId || selectedItem?.id || 1115) || 1115,
      label: selectedItem?.counterparty || `Kayıt #${selectedItem?.id || '-'}`,
      summary: [selectedItem?.flowLabel, selectedItem?.statusLabel, selectedItem?.nextStep].filter(Boolean).join(' • '),
      fields: [
        { label: 'Karşı Taraf', value: selectedItem?.counterparty || '-', help: 'Ticari akışın karşı tarafını gösterir.' },
        { label: 'Akış', value: selectedItem?.flowLabel || '-', help: 'Kaydın hangi ticari bölümde olduğunu gösterir.' },
        { label: 'Durum', value: selectedItem?.statusLabel || selectedItem?.status || '-', help: 'Karar veya pazarlık durumunu gösterir.' },
        { label: 'Tutar', value: selectedItem?.amountLabel || '-', help: 'Görünen ticari tutarı gösterir.' },
        { label: 'Sonraki Adım', value: selectedItem?.nextStep || '-', help: 'Buradan sonra önerilen adımı gösterir.' },
      ],
      facts,
    });
  }, [selectedItem, summary, items.length]);

  const cards = useMemo(() => {
    const c = summary?.cards || {};
    return [
      { title: "Acik Teklif", value: c.openOffers ?? "-", note: "Incelenmesi gereken teklifler" },
      { title: "Karsi Teklifim", value: c.counteredOffers ?? "-", note: "Firma cevabi beklenen kayitlar" },
      { title: "Kabul Edilen", value: c.acceptedOffers ?? "-", note: "Bekleyen taleplere inen kayitlar" },
      { title: "Sozlesme Bekleyen", value: c.requestedAgreements ?? "-", note: "Ayrica yonetilen sozlesme kayitlari" },
      { title: "Aktif Sozlesme", value: c.activeAgreements ?? "-", note: "APPROVED / ACTIVE sozlesmeler" },
      { title: "Aktif Operasyon", value: c.approvedOrActiveShifts ?? "-", note: "Sahaya inen işler" },
    ];
  }, [summary]);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Ticari Akisim</h2>
          <div className="muted" style={{ marginTop: 6 }}>Room icin teklif/pazarlik gorunurlugu. Pazarlik markette biter; kabul edilen is bekleyen talep ve sonra vardiyaya iner</div>
        </div>
        <div className="muted">Kapsam: Kendi ticari alaniniz</div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {cards.map((card) => <MetricCard key={card.title} {...card} />)}
      </div>

      <div style={{ marginTop: 16, padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ fontWeight: 700 }}>Ticari Akış Listesi</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <div>
              <div className="muted">Filtre</div>
              <input value={filterQ} onChange={(e) => setFilterQ(e.target.value)} placeholder="Karşı taraf / durum / not" />
            </div>
            <button type="button" onClick={() => navigate("/room/offers")}>Teklifleri ac</button>
            <button type="button" onClick={() => navigate("/room/shifts")}>Vardiyalari ac</button>
          </div>
        </div>
        <div className="muted" style={{ marginBottom: 10 }}>Gösterilen: <b>{filteredItems.length}</b> / Toplam: <b>{items.length}</b></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>Karsi Taraf</th>
                <th>Akis</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Son Guncelleme</th>
                <th>Sonraki Adim</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length ? filteredItems.map((item) => (
                <tr key={item.id} onClick={() => setSelectedId(item.id)} style={rowSelectionStyle(String(selectedId || '') === String(item.id || ''))}>
                  <td>{item.counterparty || "-"}</td>
                  <td>{item.flowLabel || "-"}</td>
                  <td>{item.amountLabel || "-"}</td>
                  <td><StatusBadge value={item.statusLabel || item.status} /></td>
                  <td>{fmtTR(item.updatedAt)}</td>
                  <td>{item.nextStep || "-"}</td>
                  <td>
                    {item.actionPath ? (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); openAction(item); }}>{item.actionLabel || "Ac"}</button>
                    ) : "-"}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: "8px 0" }}>
                    {items.length ? 'Filtreye uyan ticari kayıt yok.' : 'Henüz oda kapsamına düşen ticari kayıt yok. Kural: pazarlık Market/Teklifler ekranında, operasyon hazırlığı Bekleyen Taleplerde ilerler.'}
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

