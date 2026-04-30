import { useEffect, useMemo, useState } from "react";
import { getPath, navigate } from "../../router";
import { resolveRuntimeScopeKey } from "../../copilot/screenRegistry";
import { useSession } from "../../state/session";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildCommercialFlowFacts } from "../../utils/copilotFacts";
import { displayStatusLabel } from "../../utils/displayStatus";
import { getCompanyCommercialFlowSummary } from "../../utils/companyDataHub";
import PanelChrome from "../../components/PanelChrome";
import { statusBadgeInlineStyle } from "../../utils/statusBadge";

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


function pickCount(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function MetricCard({ title, value, note, accent = "default" }) {
  const accentMap = {
    default: { border: "1px solid rgba(255,255,255,0.08)", title: "#98a2b3", value: "#f8fafc" },
    warm: { border: "1px solid rgba(247,144,9,0.35)", title: "#f7b267", value: "#ffd38a" },
    good: { border: "1px solid rgba(18,183,106,0.35)", title: "#6ce9a6", value: "#d1fadf" },
  };
  const palette = accentMap[accent] || accentMap.default;
  return (
    <div style={{ padding: 14, border: palette.border, borderRadius: 8, flex: "1 1 180px" }}>
      <div className="panelSectionTitle" style={{ marginBottom: 8, color: palette.title }}>{title}</div>
      <div className="panelStatValue" style={{ color: palette.value }}>{value}</div>
      {note ? <div className="panelMeta" style={{ marginTop: 8 }}>{note}</div> : null}
    </div>
  );
}

function StatusBadge({ value }) {
  return <span style={statusBadgeInlineStyle(value)}>{displayStatusLabel(value)}</span>;
}


export default function CompanyCommercialFlowPanel() {
  const { token } = useSession();
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [flowFilter, setFlowFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      (async () => {
        try {
          const resp = await getCompanyCommercialFlowSummary(token, { signal: controller.signal });
          if (cancelled) return;
          setSummary(resp || null);
        } catch (e) {
          if (cancelled || e?.name === "AbortError") return;
          setErr(String(e?.message || e));
        }
      })();
    }, 320);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [token]);

  const counts = useMemo(() => {
    const c = summary?.cards || {};
    return {
      market: pickCount(c.marketShiftCount, c.marketOffers, 0),
      counter: pickCount(c.counterShiftCount, c.counterOffers, 0),
      pending: pickCount(c.pendingShiftCount, c.acceptedOffers, 0),
      final: pickCount(c.finalShiftCount, c.listCount, 0),
      active: pickCount(c.activeShiftCount, c.activeOps, 0),
    };
  }, [summary]);

  const cards = useMemo(() => {
    return [
      { title: "Market Teklifi", value: counts.market, note: "Room seçilmemiş, pazarlığı açık market talepleri", accent: counts.market ? "warm" : "default" },
      { title: "Karşı Teklif", value: counts.counter, note: "Karşı teklif sinyali taşıyan aktif pazarlık kayıtları", accent: counts.counter ? "warm" : "default" },
      { title: "Bekleyen", value: counts.pending, note: "Room atanmış, operasyon hazırlığı bekleyen talepler", accent: counts.pending ? "good" : "default" },
      { title: "Liste", value: counts.final, note: "kabul edildi / aktif / tamamlandı / reddedildi" },
      { title: "Aktif Operasyon", value: counts.active, note: "Kabul edildi + aktif sahaya inen işler", accent: counts.active ? "good" : "default" },
    ];
  }, [counts]);

  const flowItems = useMemo(() => Array.isArray(summary?.items) ? summary.items : [], [summary]);
  const flowOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(flowItems.map((item) => String(item?.flowLabel || "-").trim()).filter(Boolean)))],
    [flowItems]
  );
  const statusOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(flowItems.map((item) => String(item?.statusLabel || "-").trim()).filter(Boolean)))],
    [flowItems]
  );
  const filteredFlowItems = useMemo(() => {
    return flowItems.filter((item) => {
      const flowOk = flowFilter === "ALL" || String(item?.flowLabel || "-").trim() === flowFilter;
      const statusOk = statusFilter === "ALL" || String(item?.statusLabel || "-").trim() === statusFilter;
      return flowOk && statusOk;
    });
  }, [flowItems, flowFilter, statusFilter]);
  const marketOffers = useMemo(() => ({ length: counts.market }), [counts]);
  const acceptedOffers = useMemo(() => ({ length: counts.pending }), [counts]);
  const finalItems = useMemo(() => ({ length: counts.final }), [counts]);

  const effectiveSelectedId = useMemo(() => {
    const rawSelectedId = String(selectedId || "");
    if (!rawSelectedId) return "";
    return filteredFlowItems.some((item) => String(item.id) === rawSelectedId) ? rawSelectedId : "";
  }, [filteredFlowItems, selectedId]);

  const selectedItem = useMemo(
    () => flowItems.find((item) => String(item.id) === effectiveSelectedId) || null,
    [flowItems, effectiveSelectedId]
  );

  const copilotScopeKey = useMemo(() => resolveRuntimeScopeKey(getPath(), "/company/commercial-flow"), []);

  useEffect(() => {
    if (!selectedItem) {
      clearCopilotSelection(copilotScopeKey);
      return;
    }
    const facts = buildCommercialFlowFacts({
      selectedItem,
      marketCount: marketOffers.length,
      acceptedCount: acceptedOffers.length,
      listCount: finalItems.length,
    });

    setCopilotSelection({
      scopeKey: copilotScopeKey,
      entityType: selectedItem?.shiftId ? 'shift' : 'screen',
      entityId: Number(selectedItem?.shiftId || 2115) || 2115,
      label: `${selectedItem?.counterparty || 'Kayıt'} • ${selectedItem?.flowLabel || '-'}`,
      summary: [selectedItem?.statusLabel || null, selectedItem?.nextStep || null].filter(Boolean).join(' • '),
      fields: [
        { label: 'Karşı Taraf', value: selectedItem?.counterparty || '-', help: 'Bu kaydın karşı tarafındaki oda veya operasyon birimini gösterir.' },
        { label: 'Akış', value: selectedItem?.flowLabel || '-', help: 'Kayıdın market, kabul veya operasyon tarafında olup olmadığını gösterir.' },
        { label: 'Tutar', value: selectedItem?.amountLabel || '-', help: 'Teklif tutarını veya ticari özet bedelini gösterir.' },
        { label: 'Son Güncelleme', value: fmtTR(selectedItem?.updatedAt), help: 'Bu ticari kaydın en son ne zaman değiştiğini gösterir.' },
        { label: 'Sonraki Adım', value: selectedItem?.nextStep || '-', help: 'Bu kayıttan sonra hangi operasyon veya ticari adıma geçileceğini anlatır.' },
      ],
      facts,
      badges: [
        { label: 'Durum', value: selectedItem?.statusLabel || '-', help: 'Durum rozeti kaydın anlık ticari statüsünü gösterir.' },
        { label: 'Bölüm', value: selectedItem?.section === 'list' ? 'Liste' : selectedItem?.section === 'pending' ? 'Bekleyen' : 'Market', help: 'Kayıdın hangi alt görünümde açılacağını gösterir.' },
      ],
    });
    return () => clearCopilotSelection(copilotScopeKey);
  }, [selectedItem, marketOffers.length, acceptedOffers.length, finalItems.length, copilotScopeKey]);

  function openShifts(section, shiftId) {
    navigate("/company/shifts");
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent("company:shifts:focus", {
          detail: { section, shiftIds: shiftId ? [Number(shiftId)] : [] },
        }));
      } catch { /* no-op: focus event is best effort */ }
    }, 60);
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <PanelChrome
        title="Ticari Akışım"
        subtitle="Company için ticari görünüm artık gerçek market tekliflerinden beslenir. Vardiya üstündeki eski room-offer alanları burada referans alınmaz."
        actions={<div className="panelMeta">Kapsam: Kendi ticari alanınız</div>}
      />

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {cards.map((card) => <MetricCard key={card.title} {...card} />)}
      </div>

      <div style={{ marginTop: 16, padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <div>
            <div className="panelSectionTitle">Ticari Akış Listesi</div>
            <div className="panelMeta" style={{ marginTop: 4 }}>Market, bekleyen ve operasyona inen kayıtların tek kanonik özeti</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={flowFilter} onChange={(e) => setFlowFilter(e.target.value)} aria-label="Akış filtresi" title="Akış filtresi">
              {flowOptions.map((value) => <option key={value} value={value}>{value === "ALL" ? "Tüm akışlar" : value}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Durum filtresi" title="Durum filtresi">
              {statusOptions.map((value) => <option key={value} value={value}>{value === "ALL" ? "Tüm durumlar" : displayStatusLabel(value)}</option>)}
            </select>
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
              {filteredFlowItems.length ? filteredFlowItems.map((item) => (
                <tr key={item.id} onClick={() => setSelectedId(item.id)} style={{ cursor: 'pointer', background: String(effectiveSelectedId || '') === String(item.id) ? 'rgba(61, 122, 255, 0.10)' : 'transparent' }}>
                  <td>{item.counterparty}</td>
                  <td>{item.flowLabel}</td>
                  <td>{item.amountLabel}</td>
                  <td><StatusBadge value={item.statusLabel} /></td>
                  <td>{fmtTR(item.updatedAt)}</td>
                  <td>{item.nextStep}</td>
                  <td>
                    <button type="button" onClick={() => { setSelectedId(item.id); openShifts(item.section || "market", item.shiftId); }}>
                      {item.section === "list" ? "Listeyi aç" : item.section === "pending" ? "Bekleyeni aç" : "Marketi aç"}
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="panelMeta" style={{ padding: "8px 0" }}>
                    Bu filtrede firma kapsamına düşen ticari kayıt yok. Kural: pazarlık Market'te, operasyon hazırlığı Bekleyen Taleplerde, onaylı işler Liste'de.
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
