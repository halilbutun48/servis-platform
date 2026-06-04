import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useAutoReload } from "../../live/useAutoReload";
import { useSession } from "../../state/session";
import { includesFilter, rowSelectionStyle } from "../../utils/listUi";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildCommercialFlowFacts } from "../../utils/copilotFacts";
import ListSelectionBanner from "../../components/ListSelectionBanner";
import { displayStatusLabel } from "../../utils/displayStatus";
import PanelChrome from "../../components/PanelChrome";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import CollapsibleSection from "../../components/CollapsibleSection";

const ROOM_FLOW_TABS = [
  { key: "settlement", label: "Hakediş" },
  { key: "contractShift", label: "Sözleşme & Vardiya" },
  { key: "offers", label: "Teklifler" },
  { key: "quality", label: "Kalite / Kanıt" },
  { key: "payment", label: "Ödeme & Komisyon" },
  { key: "history", label: "Geçmiş" },
];

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

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function uniqueById(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter((item) => {
    const id = String(item?.id || "");
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function isOfferItem(item) {
  const flow = normalizeText(item?.flowLabel);
  const section = normalizeText(item?.section);
  return (
    section === "market"
    || flow.includes("teklif")
    || flow.includes("pazarlik")
    || flow.includes("karsi teklif")
    || flow.includes("kabul")
  );
}

function isContractShiftItem(item) {
  const flow = normalizeText(item?.flowLabel);
  const section = normalizeText(item?.section);
  const status = normalizeText(item?.statusLabel || item?.status);
  return (
    flow.includes("sozlesme")
    || flow === "operasyon"
    || section === "pending"
    || section === "list"
    || ["approved", "active", "done", "rejected", "split"].includes(status)
  );
}

function MetricCard({ title, value, note, accent = "default" }) {
  const accentMap = {
    default: { border: "1px solid rgba(255,255,255,0.08)", title: "#98a2b3", value: "#f8fafc" },
    warm: { border: "1px solid rgba(247,144,9,0.35)", title: "#f7b267", value: "#ffd38a" },
    good: { border: "1px solid rgba(18,183,106,0.35)", title: "#6ce9a6", value: "#d1fadf" },
  };
  const palette = accentMap[accent] || accentMap.default;
  return (
    <div style={{ padding: 14, border: palette.border, borderRadius: 8, flex: "1 1 180px", minWidth: 0 }}>
      <div className="panelSectionTitle" style={{ marginBottom: 8, color: palette.title }}>{title}</div>
      <div className="panelStatValue" style={{ color: palette.value }}>{value}</div>
      {note ? <div className="panelMeta" style={{ marginTop: 8 }}>{note}</div> : null}
    </div>
  );
}

function FlowSummaryStrip({ summary, selectedItem, selectedSummaryText }) {
  const activeCount = Number(summary?.cards?.approvedOrActiveShifts || 0);
  const contractCount = Number(summary?.cards?.activeAgreements || 0);
  const requestCount = Number(summary?.cards?.requestedAgreements || 0);
  const currentNextStep = selectedItem?.nextStep || "Detay için kayıt seç";
  return (
    <div className="card" style={{ padding: 14, display: "grid", gap: 12 }}>
      <div className="panelSectionTitle">Ticari Akış Özeti</div>
      <div className="panelMeta">Özet üstte; detaylar sekmelerde ve collapsible alanlarda kalır.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <MetricCard title="Kritik özet" value={selectedSummaryText || "Kayıt seçildiğinde görünür"} note="Seçili satırın kısa özeti" />
        <MetricCard title="Sözleşme bekleyen" value={requestCount || "-"} note="Hakedişe giden yol" accent={requestCount ? "warm" : "default"} />
        <MetricCard title="Aktif sözleşme" value={contractCount || "-"} note="Devam eden ticari bağ" accent={contractCount ? "good" : "default"} />
        <MetricCard title="Aktif operasyon" value={activeCount || "-"} note="Sahaya inen işler" accent={activeCount ? "good" : "default"} />
      </div>
      <div className="panelMeta">Sonraki adım: {currentNextStep}</div>
    </div>
  );
}

function StatusBadge({ value }) {
  const normalized = String(value || "").trim().toUpperCase();
  let style = { color: "#d0d5dd", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };
  if (["OPEN", "REQUESTED"].includes(normalized)) style = { color: "#fedf89", background: "rgba(247,144,9,0.16)", border: "1px solid rgba(247,144,9,0.45)" };
  if (["COUNTERED", "PAZARLIK", "NEGOTIATION"].includes(normalized)) style = { color: "#b2ddff", background: "rgba(83,177,253,0.12)", border: "1px solid rgba(83,177,253,0.35)" };
  if (["ACCEPTED", "APPROVED", "ACTIVE", "SPLIT"].includes(normalized)) style = { color: "#d1fadf", background: "rgba(18,183,106,0.16)", border: "1px solid rgba(18,183,106,0.45)" };
  if (["CANCELLED", "DONE", "REJECTED"].includes(normalized)) style = { color: "#fecdca", background: "rgba(240,68,56,0.12)", border: "1px solid rgba(240,68,56,0.35)" };
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", ...style }}>{displayStatusLabel(value)}</span>;
}

function CommercialFlowTable({ items, selectedId, onSelect, onAction, emptyText, actionLabel = "Aç" }) {
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) {
    return <div className="panelMeta" style={{ padding: "6px 0" }}>{emptyText}</div>;
  }

  return (
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
          {rows.map((item) => (
            <tr
              key={item.id}
              onClick={() => onSelect?.(item)}
              style={{ ...rowSelectionStyle(String(selectedId || "") === String(item.id || "")), cursor: "pointer" }}
            >
              <td>{item.counterparty || "-"}</td>
              <td>{item.flowLabel || "-"}</td>
              <td>{item.amountLabel || "-"}</td>
              <td><StatusBadge value={item.statusLabel || item.status} /></td>
              <td>{fmtTR(item.updatedAt)}</td>
              <td>{item.nextStep || "-"}</td>
              <td>
                {item.actionPath ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect?.(item);
                      onAction?.(item);
                    }}
                  >
                    {item.actionLabel || actionLabel}
                  </button>
                ) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CommercialFlowPanel() {
  const { token } = useSession();
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [viewMode, setViewMode] = useState("contractShift");
  const [filterQ, setFilterQ] = useState("");
  const [counterpartyQ, setCounterpartyQ] = useState("");
  const [flowQ, setFlowQ] = useState("");
  const [amountQ, setAmountQ] = useState("");
  const [statusQ, setStatusQ] = useState("");
  const [nextStepQ, setNextStepQ] = useState("");
  const [preferredId, setPreferredId] = useState("");

  const loadCommercialFlow = useCallback(async ({ signal } = {}) => {
    const [s, i] = await Promise.all([
      api("/api/commercial-core/room/summary", { token, signal }),
      api("/api/commercial-core/room/items", { token, signal }),
    ]);
    return {
      summary: s || null,
      items: Array.isArray(i?.items) ? i.items : [],
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const data = await loadCommercialFlow({ signal: controller.signal });
        if (cancelled) return;
        setErr("");
        setSummary(data.summary);
        setItems(data.items);
      } catch (e) {
        if (cancelled || e?.name === "AbortError") return;
        setErr(e?.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [loadCommercialFlow]);

  useAutoReload("shifts", () => {
    loadCommercialFlow()
      .then((data) => {
        setErr("");
        setSummary(data.summary);
        setItems(data.items);
      })
      .catch(() => {});
  }, Boolean(token));

  function openAction(item) {
    if (item?.actionPath === "/room/shifts" && Number(item?.shiftId) > 0) {
      localStorage.setItem("room:focusPendingShiftId", String(item.shiftId));
    }
    navigate(item.actionPath);
  }

  const flowOptions = useMemo(() => Array.from(new Set(items.map((item) => String(item?.flowLabel || "").trim()).filter(Boolean))), [items]);
  const statusOptions = useMemo(() => Array.from(new Set(items.map((item) => String(item?.statusLabel || item?.status || "").trim()).filter(Boolean))), [items]);

  const filteredItems = useMemo(() => items.filter((item) => {
    const statusValue = item?.statusLabel || item?.status || "";
    const matchesGeneral = includesFilter([
      item?.id,
      item?.counterparty,
      item?.flowLabel,
      item?.amountLabel,
      item?.statusLabel,
      item?.status,
      item?.nextStep,
      item?.updatedAt,
    ], filterQ);
    const matchesCounterparty = includesFilter([item?.counterparty], counterpartyQ);
    const matchesFlow = !flowQ || String(item?.flowLabel || "").trim() === flowQ;
    const matchesAmount = includesFilter([item?.amountLabel], amountQ);
    const matchesStatus = !statusQ || String(statusValue).trim() === statusQ;
    const matchesNextStep = includesFilter([item?.nextStep], nextStepQ);
    return matchesGeneral && matchesCounterparty && matchesFlow && matchesAmount && matchesStatus && matchesNextStep;
  }), [items, filterQ, counterpartyQ, flowQ, amountQ, statusQ, nextStepQ]);

  const selectedItem = useMemo(() => {
    if (!items.length) return null;
    return items.find((item) => String(item?.id || "") === String(preferredId || "")) || items[0] || null;
  }, [items, preferredId]);

  useEffect(() => {
    if (!selectedItem) {
      clearCopilotSelection("/room/commercial-flow");
      return;
    }
    const facts = buildCommercialFlowFacts({
      selectedItem,
      marketCount: summary?.cards?.openOffers || 0,
      acceptedCount: summary?.cards?.acceptedOffers || 0,
      listCount: items.length,
    });
    setCopilotSelection({
      scopeKey: "/room/commercial-flow",
      entityType: selectedItem?.shiftId ? "shift" : "commercial",
      entityId: Number(selectedItem?.shiftId || selectedItem?.id || 1115) || 1115,
      label: selectedItem?.counterparty || `Kayıt ID ${selectedItem?.id || "-"}`,
      summary: [selectedItem?.flowLabel, selectedItem?.statusLabel, selectedItem?.nextStep].filter(Boolean).join(" • "),
      fields: [
        { label: "Karşı Taraf", value: selectedItem?.counterparty || "-", help: "Ticari akışın karşı tarafını gösterir." },
        { label: "Akış", value: selectedItem?.flowLabel || "-", help: "Kaydın hangi ticari bölümde olduğunu gösterir." },
        { label: "Durum", value: selectedItem?.statusLabel || selectedItem?.status || "-", help: "Karar veya pazarlık durumunu gösterir." },
        { label: "Tutar", value: selectedItem?.amountLabel || "-", help: "Görünen ticari tutarı gösterir." },
        { label: "Sonraki Adım", value: selectedItem?.nextStep || "-", help: "Buradan sonra önerilen adımı gösterir." },
      ],
      facts,
    });
  }, [selectedItem, summary, items.length]);

  const cards = useMemo(() => {
    const c = summary?.cards || {};
    return [
      { title: "Açık Teklif", value: c.openOffers ?? "-", note: "İncelenmesi gereken teklifler" },
      { title: "Karşı Teklifim", value: c.counteredOffers ?? "-", note: "Firma cevabı beklenen kayıtlar" },
      { title: "Kabul Edilen", value: c.acceptedOffers ?? "-", note: "Bekleyen taleplere inen kayıtlar" },
      { title: "Sözleşme Bekleyen", value: c.requestedAgreements ?? "-", note: "Ayrı yönetilen sözleşme kayıtları" },
      { title: "Aktif Sözleşme", value: c.activeAgreements ?? "-", note: "Kabul edilen / aktif sözleşmeler" },
      { title: "Aktif Operasyon", value: c.approvedOrActiveShifts ?? "-", note: "Sahaya inen işler" },
    ];
  }, [summary]);

  const offerItems = useMemo(() => items.filter(isOfferItem), [items]);
  const contractShiftItems = useMemo(() => uniqueById(items.filter(isContractShiftItem)), [items]);
  const settlementItems = useMemo(() => uniqueById([
    ...items.filter((item) => normalizeText(item?.flowLabel).includes("sozlesme")),
    ...items.filter((item) => ["REQUESTED", "APPROVED", "ACTIVE"].includes(normalizeText(item?.statusLabel || item?.status))),
  ]), [items]);
  const historyItems = useMemo(() => filteredItems, [filteredItems]);

  const settlementCount = Number(summary?.cards?.requestedAgreements || 0)
    + Number(summary?.cards?.activeAgreements || 0)
    + Number(summary?.cards?.approvedOrActiveShifts || 0);
  const qualityCount = Number(summary?.cards?.counteredOffers || 0) + Number(summary?.cards?.openOffers || 0);
  const paymentCount = Number(summary?.cards?.activeAgreements || 0) + Number(summary?.cards?.approvedOrActiveShifts || 0);
  const selectedSummaryText = selectedItem
    ? [selectedItem.flowLabel, selectedItem.statusLabel || selectedItem.status, selectedItem.nextStep].filter(Boolean).join(" • ")
    : "";

  const tabs = useMemo(() => ROOM_FLOW_TABS.map((tab) => {
    let badge = null;
    if (tab.key === "settlement") badge = settlementCount ? String(settlementCount) : null;
    if (tab.key === "contractShift") badge = contractShiftItems.length ? String(contractShiftItems.length) : null;
    if (tab.key === "offers") badge = offerItems.length ? String(offerItems.length) : null;
    if (tab.key === "quality") badge = qualityCount ? String(qualityCount) : null;
    if (tab.key === "payment") badge = paymentCount ? String(paymentCount) : null;
    if (tab.key === "history") badge = items.length ? String(items.length) : null;
    return { ...tab, badge };
  }), [items.length, settlementCount, contractShiftItems.length, offerItems.length, qualityCount, paymentCount]);

  const renderActionButtons = () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={() => navigate("/room/offers")}>Teklifleri aç</button>
      <button type="button" onClick={() => navigate("/room/agreements")}>Sözleşmeleri aç</button>
      <button type="button" onClick={() => navigate("/room/shifts")}>Vardiyaları aç</button>
      <button type="button" onClick={() => navigate("/room/operation-health")}>Operasyon Sağlığı</button>
    </div>
  );

  const mainContent = (() => {
    if (viewMode === "settlement") {
      return (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ padding: 14, display: "grid", gap: 12 }}>
            <div className="panelSectionTitle">Hakediş</div>
            <div className="panelMeta">
              Bu sekme hakediş yolunu özetler; ödeme başlatmaz. Sözleşme ve aktif operasyon sinyalleri birlikte okunur.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <MetricCard title="Sözleşme Bekleyen" value={summary?.cards?.requestedAgreements ?? "-"} note="Hakedişe giden kayıtlar" accent={summary?.cards?.requestedAgreements ? "warm" : "default"} />
              <MetricCard title="Aktif Sözleşme" value={summary?.cards?.activeAgreements ?? "-"} note="Devam eden ticari bağ" accent={summary?.cards?.activeAgreements ? "good" : "default"} />
              <MetricCard title="Aktif Operasyon" value={summary?.cards?.approvedOrActiveShifts ?? "-"} note="Sahaya inen işler" accent={summary?.cards?.approvedOrActiveShifts ? "good" : "default"} />
            </div>
            {renderActionButtons()}
          </div>

          <CollapsibleSection
            title="Hakediş notları"
            subtitle="İkincil açıklamalar kapalı başlayabilir"
            badge={settlementItems.length ? `${settlementItems.length}` : "0"}
            compact
          >
            <div style={{ display: "grid", gap: 8 }}>
              <div className="panelMeta">• Oda tarafında hakediş görünürlüğü, sözleşme ve aktif operasyon bağlantısıyla okunur.</div>
              <div className="panelMeta">• Kesin ödeme / komisyon ayrıntısı başka omurgada kalır; bu ekran sadece yolu gösterir.</div>
              <div className="panelMeta">• Kullanıcı bu sekmede ödeme başlatmaz, yalnızca özet ve bağlantı görür.</div>
            </div>
          </CollapsibleSection>
        </div>
      );
    }

    if (viewMode === "contractShift") {
      return (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ padding: 14, display: "grid", gap: 12 }}>
            <div className="panelSectionTitle">Sözleşme & Vardiya</div>
            <div className="panelMeta">
              Sözleşme kaynaklı kayıtlar ve operasyon tarafı aynı sekmede okunur. Tablo kısa tutulur, ayrıntı gerekirse geçmişe geçilir.
            </div>
            <ListSelectionBanner
              selectedLabel={selectedItem?.counterparty || ""}
              selectedSummary={selectedSummaryText}
              visibleCount={contractShiftItems.length}
              totalCount={items.length}
              filterValue={viewMode}
              onClearFilter={() => setPreferredId("")}
              helper="Copilot seçili sözleşme / vardiya kaydını kullanır."
            />
            <CommercialFlowTable
              items={contractShiftItems.slice(0, 8)}
              selectedId={selectedItem?.id}
              onSelect={(item) => setPreferredId(String(item?.id || ""))}
              onAction={openAction}
              emptyText="Sözleşme veya operasyon kaydı bulunamadı."
              actionLabel="Aç"
            />
            {contractShiftItems.length > 8 ? <div className="panelMeta">İlk 8 kayıt gösteriliyor. Tüm kayıtlar için Geçmiş sekmesini aç.</div> : null}
            {renderActionButtons()}
          </div>

          <CollapsibleSection
            title="Sözleşme / vardiya rehberi"
            subtitle="Kapanması uygun ikincil açıklamalar"
            badge={contractShiftItems.length ? `${contractShiftItems.length}` : "0"}
            compact
          >
            <div style={{ display: "grid", gap: 8 }}>
              <div className="panelMeta">• Sözleşme ve vardiya birbirini takip eden iki eş düzey iş akışıdır.</div>
              <div className="panelMeta">• Pazarlık bittiğinde kayıt operasyona iner; burada hem sözleşme hem vardiya okunur.</div>
              <div className="panelMeta">• Ayrıntılı geri bakış için Geçmiş sekmesi kullanılır.</div>
            </div>
          </CollapsibleSection>
        </div>
      );
    }

    if (viewMode === "offers") {
      return (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ padding: 14, display: "grid", gap: 12 }}>
            <div className="panelSectionTitle">Teklifler</div>
            <div className="panelMeta">
              Market / karşı teklif akışı burada kısa tutulur. Filtre yerine sekme ile ayrışır, satır detayları gerekiyorsa geçmişe iner.
            </div>
            <ListSelectionBanner
              selectedLabel={selectedItem?.counterparty || ""}
              selectedSummary={selectedSummaryText}
              visibleCount={offerItems.length}
              totalCount={items.length}
              filterValue={viewMode}
              onClearFilter={() => setPreferredId("")}
              helper="Copilot seçili teklifi kullanır."
            />
            <CommercialFlowTable
              items={offerItems.slice(0, 8)}
              selectedId={selectedItem?.id}
              onSelect={(item) => setPreferredId(String(item?.id || ""))}
              onAction={openAction}
              emptyText="Bu oda için teklif satırı bulunamadı."
              actionLabel="Teklifleri aç"
            />
            {offerItems.length > 8 ? <div className="panelMeta">İlk 8 kayıt gösteriliyor. Daha uzun bakış için Geçmiş sekmesine geç.</div> : null}
            {renderActionButtons()}
          </div>

          <CollapsibleSection
            title="Teklif akışı notları"
            subtitle="Pazarlık ve teklif yorumları kısa kalsın"
            badge={offerItems.length ? `${offerItems.length}` : "0"}
            compact
          >
            <div style={{ display: "grid", gap: 8 }}>
              <div className="panelMeta">• Teklif, karşı teklif ve kabul aşamaları aynı iş akışının parçalarıdır.</div>
              <div className="panelMeta">• Kritik kararlar özet kartlarda, satır detayları geçmişte tutulur.</div>
            </div>
          </CollapsibleSection>
        </div>
      );
    }

    if (viewMode === "quality") {
      return (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ padding: 14, display: "grid", gap: 12 }}>
            <div className="panelSectionTitle">Kalite / Kanıt</div>
            <div className="panelMeta">
              Bu sekme kalite ve kanıt tarafını kısa tutar; operasyon sağlığı ve geri bildirim ayrı yüzeylerde okunur.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <MetricCard title="Karşı Teklif" value={summary?.cards?.counteredOffers ?? "-"} note="Kalite sinyali gibi izlenen pazarlık sayısı" accent={summary?.cards?.counteredOffers ? "warm" : "default"} />
              <MetricCard title="Kabul Edilen" value={summary?.cards?.acceptedOffers ?? "-"} note="Operasyona geçen kayıtlar" accent={summary?.cards?.acceptedOffers ? "good" : "default"} />
              <MetricCard title="Açık Teklif" value={summary?.cards?.openOffers ?? "-"} note="Takibe açık kayıtlar" accent={summary?.cards?.openOffers ? "warm" : "default"} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => navigate("/room/operation-health")}>Operasyon Sağlığı</button>
              <button type="button" onClick={() => navigate("/shared/feedback")}>Geri Bildirim</button>
              <button type="button" onClick={() => navigate("/room/reports")}>Raporlar</button>
            </div>
          </div>

          <CollapsibleSection
            title="Kalite / kanıt rehberi"
            subtitle="İkincil kalite açıklamaları kapanabilir"
            badge={qualityCount ? `${qualityCount}` : "0"}
            compact
          >
            <div style={{ display: "grid", gap: 8 }}>
              <div className="panelMeta">• Kanıt ve kalite yorumları operasyon akışını yormadan ayrı kalır.</div>
              <div className="panelMeta">• Operasyon sağlığı ve geri bildirim yüzeyi daha derin notlar için kullanılır.</div>
            </div>
          </CollapsibleSection>
        </div>
      );
    }

    if (viewMode === "payment") {
      return (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ padding: 14, display: "grid", gap: 12 }}>
            <div className="panelSectionTitle">Ödeme & Komisyon</div>
            <div className="panelMeta">
              Bu oda ekranı ödeme başlatmaz; ödeme / komisyon yolu yalnızca okuma ve yönlendirme için özetlenir.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <MetricCard title="Aktif Sözleşme" value={summary?.cards?.activeAgreements ?? "-"} note="Komisyon yolunun bağlı olduğu kayıtlar" accent={summary?.cards?.activeAgreements ? "good" : "default"} />
              <MetricCard title="Aktif Operasyon" value={summary?.cards?.approvedOrActiveShifts ?? "-"} note="Hesap yoluna inen işler" accent={summary?.cards?.approvedOrActiveShifts ? "good" : "default"} />
              <MetricCard title="Sözleşme Bekleyen" value={summary?.cards?.requestedAgreements ?? "-"} note="Ödeme öncesi bağlantı durumu" accent={summary?.cards?.requestedAgreements ? "warm" : "default"} />
            </div>
            {renderActionButtons()}
          </div>

          <CollapsibleSection
            title="Ödeme / komisyon notları"
            subtitle="Read-only görünür kural ve ilişkiler"
            badge={paymentCount ? `${paymentCount}` : "0"}
            compact
          >
            <div style={{ display: "grid", gap: 8 }}>
              <div className="panelMeta">• Ödeme ve komisyon kararı bu ekranda başlatılmaz; yalnızca bağlı kayıtlar görünür.</div>
              <div className="panelMeta">• Sözleşme ve operasyon ilişkisinin netliği, ödeme tarafını okumayı kolaylaştırır.</div>
              <div className="panelMeta">• Gerektiğinde Sözleşme ve Vardiya sekmesi ile Geçmiş sekmesi referans alınır.</div>
            </div>
          </CollapsibleSection>
        </div>
      );
    }

    if (viewMode === "history") {
      return (
      <div style={{ display: "grid", gap: 14 }}>
        <div className="card" style={{ padding: 14, display: "grid", gap: 12 }}>
          <div className="panelSectionTitle">Geçmiş kayıtlar</div>
          <div className="panelMeta">
            Tüm oda ticari kayıtları bu sekmede filtrelenir. İlk açılışta kısa ve okunur görünüm, detaylı taramada ise tam tablo vardır.
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div className="panelMeta">Filtreler ve tablo aynı bölümde; ikincil notlar accordion altında kalır.</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
                <div>
                  <div className="panelMeta">Filtre</div>
                  <input value={filterQ} onChange={(e) => setFilterQ(e.target.value)} placeholder="Karşı taraf / durum / not" />
                </div>
                <button type="button" onClick={() => navigate("/room/offers")}>Teklifleri aç</button>
                <button type="button" onClick={() => navigate("/room/shifts")}>Vardiyaları aç</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
              <div>
                <div className="panelMeta">Karşı taraf</div>
                <input
                  value={counterpartyQ}
                  onChange={(e) => setCounterpartyQ(e.target.value)}
                  placeholder="Karşı taraf"
                  style={{ width: "100%", minWidth: 140 }}
                />
              </div>
              <div>
                <div className="panelMeta">Akış</div>
                <select value={flowQ} onChange={(e) => setFlowQ(e.target.value)} style={{ width: "100%", minWidth: 120 }}>
                  <option value="">Tüm akışlar</option>
                  {flowOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div>
                <div className="panelMeta">Tutar</div>
                <input
                  value={amountQ}
                  onChange={(e) => setAmountQ(e.target.value)}
                  placeholder="Tutar"
                  style={{ width: "100%", minWidth: 120 }}
                />
              </div>
              <div>
                <div className="panelMeta">Durum</div>
                <select value={statusQ} onChange={(e) => setStatusQ(e.target.value)} style={{ width: "100%", minWidth: 120 }}>
                  <option value="">Tüm durumlar</option>
                  {statusOptions.map((value) => <option key={value} value={value}>{displayStatusLabel(value)}</option>)}
                </select>
              </div>
              <div>
                <div className="panelMeta">Sonraki adım</div>
                <input
                  value={nextStepQ}
                  onChange={(e) => setNextStepQ(e.target.value)}
                  placeholder="Sonraki adım"
                  style={{ width: "100%", minWidth: 180 }}
                />
              </div>
            </div>
          </div>
          <ListSelectionBanner
            selectedLabel={selectedItem?.counterparty || ""}
            selectedSummary={selectedSummaryText}
            visibleCount={filteredItems.length}
            totalCount={items.length}
            filterValue={filterQ}
            onClearFilter={() => setFilterQ("")}
            helper="Copilot seçili ticari kaydı kullanır."
          />
          <CommercialFlowTable
            items={historyItems}
            selectedId={selectedItem?.id}
            onSelect={(item) => setPreferredId(String(item?.id || ""))}
            onAction={openAction}
            emptyText={items.length ? "Filtreye uyan ticari kayıt yok." : "Henüz oda kapsamına düşen ticari kayıt yok. Kural: pazarlık Market/Teklifler ekranında, operasyon hazırlığı Bekleyen Taleplerde ilerler."}
            actionLabel="Aç"
          />
        </div>

        <CollapsibleSection
          title="Geçmiş filtre notları"
          subtitle="Arama ve filtreler kısa ipuçlarıyla açık kalsın"
          badge={`${filteredItems.length}/${items.length}`}
          compact
        >
          <div style={{ display: "grid", gap: 8 }}>
            <div className="panelMeta">• Karşı taraf, akış, tutar, durum ve sonraki adım filtreleri yalnızca geçmiş taramada kullanılır.</div>
            <div className="panelMeta">• Daha uzun inceleme gerekiyorsa ilgili alt sekmeye geç ve sonra geçmişe dön.</div>
          </div>
        </CollapsibleSection>
      </div>
      );
    }

    return null;
  })();

  return (
      <div className="roomCommercialWorkspaceFull">
      <PanelChrome
        title="Ticari Akışım"
        subtitle="Room için ticari görünüm artık kısa özet + sekmeli bölümlerle açılıyor. Hakediş, sözleşme, teklif, kalite, ödeme ve geçmiş ayrı okunur; kritik özet hep açık kalır."
        actions={<div className="panelMeta">Kapsam: Kendi ticari alanınız</div>}
        style={{ width: "100%" }}
      />

      <PanelSegmentTabs
        ariaLabel="Ticari akış bölümleri"
        tabs={tabs}
        value={viewMode}
        onChange={setViewMode}
      />

      <FlowSummaryStrip summary={summary} selectedItem={selectedItem} selectedSummaryText={selectedSummaryText} />

        {err ? <div style={{ color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, width: "100%" }}>
        {cards.map((card) => <MetricCard key={card.title} {...card} />)}
        </div>

        <div className="roomCommercialWorkspaceFullSplit">
          <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
            {mainContent}
          </div>

          <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
            <div className="card" style={{ padding: 14, display: "grid", gap: 10 }}>
              <div className="panelSectionTitle">Seçili kayıt</div>
              {selectedItem ? (
                <div style={{ display: "grid", gap: 6 }}>
                  <div><b>{selectedItem.counterparty || "-"}</b></div>
                  <div className="panelMeta">Akış: {selectedItem.flowLabel || "-"}</div>
                  <div className="panelMeta">Durum: <StatusBadge value={selectedItem.statusLabel || selectedItem.status} /></div>
                  <div className="panelMeta">Tutar: {selectedItem.amountLabel || "-"}</div>
                  <div className="panelMeta">Son Güncelleme: {fmtTR(selectedItem.updatedAt)}</div>
                  <div className="panelMeta">Sonraki Adım: {selectedItem.nextStep || "-"}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {selectedItem.actionPath ? (
                      <button type="button" onClick={() => openAction(selectedItem)}>{selectedItem.actionLabel || "Aç"}</button>
                    ) : null}
                    {selectedItem.section === "list" ? (
                      <button type="button" className="btn sm" onClick={() => navigate("/room/shifts")}>Vardiyaları aç</button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="panelMeta">Bir satır seçildiğinde detay burada görünür.</div>
              )}
            </div>

            <div className="card" style={{ padding: 14, display: "grid", gap: 10 }}>
              <div className="panelSectionTitle">Hızlı erişim</div>
              <div className="panelMeta">Sık kullanılan oda yüzeylerine kısa yol.</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => navigate("/room/offers")}>Teklifler</button>
                <button type="button" onClick={() => navigate("/room/agreements")}>Sözleşmeler</button>
                <button type="button" onClick={() => navigate("/room/shifts")}>Vardiyalar</button>
                <button type="button" onClick={() => navigate("/room/operation-health")}>Operasyon Sağlığı</button>
                <button type="button" onClick={() => navigate("/shared/feedback")}>Geri Bildirim</button>
              </div>
            </div>

            <CollapsibleSection
              title="Sekme rehberi"
              subtitle="Hangi bölümde ne beklenir?"
              badge={`${ROOM_FLOW_TABS.length} sekme`}
              compact
            >
              <div style={{ display: "grid", gap: 8 }}>
                <div className="panelMeta">• Hakediş: ödeme yolu ve sözleşme bağlantısı.</div>
                <div className="panelMeta">• Sözleşme & Vardiya: operasyon bağlantılı kayıtlar.</div>
                <div className="panelMeta">• Teklifler: market ve pazarlık kayıtları.</div>
                <div className="panelMeta">• Kalite / Kanıt: kalite ve destek yönlendirmesi.</div>
                <div className="panelMeta">• Ödeme & Komisyon: read-only ödeme yolu.</div>
                <div className="panelMeta">• Geçmiş: filtreli tam tablo.</div>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>
  );
}

