import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { displayStatusLabel } from "../../utils/displayStatus";
import { resolvePersonDisplayLabel } from "../../utils/labels";
import {
  boardingChangeApplyBoundaryNote,
  boardingChangeApplyButtonLabel,
  boardingChangeApplySuccessNote,
  boardingChangeApplicationStatusLabel,
  boardingChangeDecisionLabel,
  boardingChangeDecisionOwnerLabel,
  boardingChangeDecisionOwnerNote,
  boardingChangeKindLabel,
  boardingChangeRouteRefreshLabel,
  boardingChangeRouteRefreshNote,
} from "../shared/boardingChangeUi";
import { statusBadgeInlineStyle } from "../../utils/statusBadge";
import BoardingRouteImpactPreviewCard from "../shared/BoardingRouteImpactPreviewCard";

function cardStyle() {
  return {
    padding: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    flex: "1 1 180px",
    minWidth: 180,
    background: "rgba(255,255,255,0.02)",
  };
}

function MiniCard({ title, value, note }) {
  return (
    <div style={cardStyle()}>
      <div className="muted" style={{ marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
      {note ? <div className="muted" style={{ marginTop: 8 }}>{note}</div> : null}
    </div>
  );
}

function SummaryRow({ label, value, note }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      padding: "10px 12px",
      borderRadius: 8,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div>
        <div style={{ fontWeight: 700 }}>{label}</div>
        {note ? <div className="muted" style={{ marginTop: 4 }}>{note}</div> : null}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function StatusPill({ value }) {
  return <span style={statusBadgeInlineStyle(value)}>{displayStatusLabel(value)}</span>;
}

function lineLabel(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function isDifferentStopRequest(item = {}) {
  const kind = String(item?.requestKind || item?.kind || "").toUpperCase();
  const label = boardingChangeKindLabel(item?.requestKind || item?.kind);
  return kind.includes("ALTERNATE_STOP") || kind.includes("DIFFERENT_STOP") || String(label || "").includes("Farklı durak");
}

export default function RoomOperationsBoard({
  roomSummary,
  roomData,
  onApplyAcceptedRequest = null,
  applyingRequestId = null,
}) {
  const data = roomData || {};
  const driverSignals = useMemo(
    () => (Array.isArray(data.driverSignals) ? data.driverSignals : []),
    [data.driverSignals]
  );
  const shiftSummary = data.shiftSummary || null;
  const vehicleSummary = data.vehicleSummary || null;
  const driverSummary = data.driverSummary || null;
  const requests = useMemo(
    () => (Array.isArray(data.requests) ? data.requests : []),
    [data.requests]
  );
  const openRequestItems = useMemo(() => requests.filter((item) => {
    const status = String(item?.status || "").toUpperCase();
    return ["REQUESTED", "OPEN", "PENDING", "COUNTERED"].includes(status) || item?.lat != null || item?.lng != null;
  }), [requests]);
  const acceptedRequestItems = useMemo(() => requests.filter((item) => String(item?.status || "").toUpperCase() === "ACCEPTED"), [requests]);
  const [selectedPreviewRequestId, setSelectedPreviewRequestId] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSelectionNonce, setPreviewSelectionNonce] = useState(0);
  const roomIssueCount = Number(roomSummary?.cards?.openIssues || 0);
  const previewCardRef = useRef(null);

  const metrics = useMemo(() => {
    const liveCount = driverSignals.filter((item) => String(item?.liveState || "").toUpperCase() === "LIVE").length;
    const staleCount = driverSignals.filter((item) => String(item?.liveState || "").toUpperCase() === "STALE").length;
    const offlineCount = driverSignals.filter((item) => String(item?.liveState || "").toUpperCase() === "OFFLINE").length;
    const onlineCount = driverSignals.filter((item) => String(item?.ops?.connectionState || "").toUpperCase() === "ONLINE").length;
    const availableDrivers = driverSignals.filter((item) => (
      String(item?.ops?.connectionState || "").toUpperCase() === "ONLINE"
      && String(item?.ops?.assignmentState || "").toUpperCase() === "NONE"
    )).length;
    const restingDrivers = driverSignals.filter((item) => (
      String(item?.ops?.connectionState || "").toUpperCase() !== "ONLINE"
      && String(item?.ops?.assignmentState || "").toUpperCase() === "NONE"
    )).length;
    const readyForJobDrivers = driverSignals.filter((item) => (
      String(item?.ops?.connectionState || "").toUpperCase() === "ONLINE"
      && String(item?.ops?.assignmentState || "").toUpperCase() !== "ACTIVE"
    )).length;
    const openRequests = openRequestItems.length;
    const differentStopRequests = requests.filter((item) => isDifferentStopRequest(item)).length;
    const locationRequests = openRequestItems.filter((item) => item?.lat != null && item?.lng != null).length;
    const acceptedRequests = acceptedRequestItems.length;
    const totalShifts = Number(shiftSummary?.total || 0);
    const activeShifts = Number(shiftSummary?.byStatus?.ACTIVE || 0);
    const approvedShifts = Number(shiftSummary?.byStatus?.APPROVED || 0);
    const vehicleRows = Array.isArray(vehicleSummary?.rows) ? vehicleSummary.rows : [];
    const vehicleCount = Number(vehicleSummary?.total || 0);
    const totalVehicleLoad = vehicleRows.reduce((sum, row) => sum + Number(row?.personelCount || 0), 0);
    const avgVehicleLoad = vehicleRows.length ? Math.round((totalVehicleLoad / vehicleRows.length) * 10) / 10 : 0;
    const noShowCount = Array.isArray(driverSummary?.rows)
      ? driverSummary.rows.reduce((sum, row) => sum + Number(row?.noShowCount || 0), 0)
      : 0;

    return {
      liveCount,
      staleCount,
      offlineCount,
      onlineCount,
      availableDrivers,
      restingDrivers,
      readyForJobDrivers,
      openRequests,
      differentStopRequests,
      acceptedRequests,
      locationRequests,
      totalShifts,
      activeShifts,
      approvedShifts,
      vehicleCount,
      totalVehicleLoad,
      avgVehicleLoad,
      noShowCount,
    };
  }, [acceptedRequestItems, driverSignals, openRequestItems, requests, shiftSummary, vehicleSummary, driverSummary]);

  const requestItems = useMemo(() => {
    return openRequestItems.slice(0, 5).map((item) => {
      const personelName = item?.personel?.fullName || item?.personel?.name || `Personel #${item?.personelId || "-"}`;
      const shiftId = item?.shift?.id || item?.shiftId || "-";
      const kindLabel = boardingChangeKindLabel(item?.requestKind || item?.kind);
      const decisionState = String(item?.decisionState || item?.status || "").trim().toUpperCase();
      return {
        id: item?.id || `${shiftId}-${personelName}`,
        title: personelName,
        detail: `${kindLabel} • shift #${shiftId}`,
        decisionText: item?.decisionText || boardingChangeDecisionLabel(decisionState),
        decisionOwnerRole: item?.decisionOwnerRole || "COMPANY",
        decisionOwnerLabel: boardingChangeDecisionOwnerLabel(item),
        decisionOwnerNote: boardingChangeDecisionOwnerNote(item),
        status: item?.status || "OPEN",
        decisionState,
        personelId: item?.personelId || item?.personel?.id || null,
        shiftRecord: item?.shift || null,
        requestKind: item?.requestKind || item?.kind || null,
        lat: item?.lat ?? null,
        lng: item?.lng ?? null,
        nearestStop: item?.nearestStop || null,
        preview: item?.routeImpactPreview || null,
        routeRefreshState: item?.boardingChangeRouteRefreshState || "NONE",
        routeRefreshLabel: item?.boardingChangeRouteRefreshLabel || boardingChangeRouteRefreshLabel(item),
        routeRefreshNote: item?.boardingChangeRouteRefreshNote || boardingChangeRouteRefreshNote(item),
      };
    });
  }, [openRequestItems]);
  const acceptedRequestCards = useMemo(() => acceptedRequestItems.slice(0, 5).map((item) => {
    const personelName = item?.personel?.fullName || item?.personel?.name || `Personel #${item?.personelId || "-"}`;
    const shiftId = item?.shift?.id || item?.shiftId || "-";
    const kindLabel = boardingChangeKindLabel(item?.requestKind || item?.kind);
    const applicationStatus = String(item?.boardingChangeApplicationStatus || "READY").trim().toUpperCase();
    return {
      id: item?.id || `${shiftId}-${personelName}`,
      title: personelName,
      detail: item?.boardingChangeApplicationText || item?.decisionText || `${kindLabel} • shift #${shiftId}`,
      decisionOwnerRole: item?.decisionOwnerRole || "COMPANY",
      decisionOwnerLabel: boardingChangeDecisionOwnerLabel(item),
      decisionOwnerNote: boardingChangeDecisionOwnerNote(item),
      status: item?.status || "ACCEPTED",
      decisionState: String(item?.decisionState || item?.status || "").trim().toUpperCase(),
      personelId: item?.personelId || item?.personel?.id || null,
      shiftRecord: item?.shift || null,
      requestKind: item?.requestKind || item?.kind || null,
      lat: item?.lat ?? null,
      lng: item?.lng ?? null,
      nearestStop: item?.nearestStop || null,
      preview: item?.routeImpactPreview || null,
      applicationStatus,
      applicationText: item?.boardingChangeApplicationText || "",
      boundaryNote: item?.boardingChangeApplicationBoundaryNote || "",
      routeRefreshState: item?.boardingChangeRouteRefreshState || "NONE",
      routeRefreshLabel: item?.boardingChangeRouteRefreshLabel || boardingChangeRouteRefreshLabel(item),
      routeRefreshNote: item?.boardingChangeRouteRefreshNote || boardingChangeRouteRefreshNote(item),
      createdAt: item?.createdAt || null,
      appliedAt: item?.boardingChangeAppliedAt || null,
    };
  }), [acceptedRequestItems]);
  const requestSelectionCards = useMemo(() => [...requestItems, ...acceptedRequestCards], [acceptedRequestCards, requestItems]);

  const handlePreviewRequestSelect = useCallback((item) => {
    const id = Number(item?.id || 0) || null;
    if (!id) return;
    setSelectedPreviewRequestId(id);
    setPreviewLoading(true);
    setPreviewSelectionNonce((value) => value + 1);
  }, []);

  const handlePreviewSelectionClear = useCallback(() => {
    setSelectedPreviewRequestId(null);
    setPreviewLoading(false);
    setPreviewSelectionNonce((value) => value + 1);
  }, []);

  const selectedPreviewRequest = useMemo(() => {
    if (!requestSelectionCards.length) return null;
    const desiredId = Number(selectedPreviewRequestId || 0);
    if (desiredId > 0) {
      const hit = requestSelectionCards.find((item) => Number(item?.id || 0) === desiredId);
      if (hit) return hit;
    }
    if (!openRequestItems.length) return acceptedRequestCards[0] || null;
    return null;
  }, [acceptedRequestCards, openRequestItems.length, requestSelectionCards, selectedPreviewRequestId]);

  const selectedPreview = useMemo(() => selectedPreviewRequest?.preview || null, [selectedPreviewRequest]);

  useEffect(() => {
    if (!selectedPreviewRequestId) return undefined;
    const timer = setTimeout(() => {
      try {
        previewCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        previewCardRef.current?.focus?.({ preventScroll: true });
      } catch {
        /* no-op */
      }
      setPreviewLoading(false);
    }, 80);
    return () => clearTimeout(timer);
  }, [previewSelectionNonce, selectedPreviewRequestId]);

  const previewSelectionLabel = useMemo(() => {
    if (!selectedPreviewRequest) return "";
    const personLabel = resolvePersonDisplayLabel(selectedPreviewRequest, selectedPreview, "Kişi bilgisi eksik");
    return `${boardingChangeKindLabel(selectedPreviewRequest?.requestKind || selectedPreviewRequest?.kind)} • ${personLabel}`;
  }, [selectedPreview, selectedPreviewRequest]);

  const previewSelectionNote = useMemo(() => {
    if (!requestSelectionCards.length) return "";
    if (!selectedPreviewRequestId && selectedPreviewRequest) {
      return "Açık istek yok; ilk kabul edilen kayıt gösteriliyor.";
    }
    if (selectedPreviewRequestId && selectedPreviewRequest) {
      return selectedPreviewRequest?.decisionOwnerNote || selectedPreviewRequest?.routeRefreshNote || selectedPreviewRequest?.routeRefreshLabel || "Readonly önizleme seçildi.";
    }
    return "Seçili satırın readonly önizlemesi burada gösterilir.";
  }, [requestSelectionCards.length, selectedPreviewRequest, selectedPreviewRequestId]);

  const summaryRows = useMemo(() => [
    {
      label: "Bugün binmeyecek",
      value: lineLabel(metrics.noShowCount),
      note: "No-show kayıtlarından türetilir.",
    },
    {
      label: "Farklı duraktan binecek",
      value: lineLabel(metrics.differentStopRequests),
      note: "Açık ve kabul edilen isteklerden okunur.",
    },
    {
      label: "Konumdan alınma isteği onay bekliyor",
      value: lineLabel(metrics.openRequests),
      note: "Açık biniş değişikliği sayısı.",
    },
  ], [metrics]);

  return (
    <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
      <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Oda Operasyon Özeti</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Mola ve uygunluk sayıları canlı sürücü, bağlantı ve görev sinyallerinden türetilir. Açık sorun: {roomIssueCount}
            </div>
          </div>
          <div className="muted">Kapsam: Room canlı operasyon görünümü</div>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <MiniCard title="Bugünkü görevler" value={metrics.totalShifts} note={`Aktif ${metrics.activeShifts} • Onaylı ${metrics.approvedShifts}`} />
          <MiniCard title="Aktif servisler" value={metrics.activeShifts} note={`Bugün planlı servis: ${metrics.totalShifts}`} />
          <MiniCard title="Sürücü durumu" value={metrics.liveCount} note={`STALE ${metrics.staleCount} • OFFLINE ${metrics.offlineCount}`} />
          <MiniCard title="Araç durumu" value={metrics.vehicleCount} note={`Toplam yük ${metrics.totalVehicleLoad} • Ortalama ${metrics.avgVehicleLoad}`} />
          <MiniCard title="Müsait sürücüler" value={metrics.availableDrivers} note={`Canlı bağlı: ${metrics.onlineCount}`} />
          <MiniCard title="Moladaki sürücüler" value={metrics.restingDrivers} note="Görev dışı sinyallerden türetilir." />
          <MiniCard title="Yeni iş alabilir sürücüler" value={metrics.readyForJobDrivers} note="Aktif vardiyada olmayan canlı sürücüler." />
          <MiniCard title="Biniş değişiklikleri" value={metrics.openRequests} note="Açık istekler ve onay bekleyen kayıtlar." />
          <MiniCard title="Kabul edilenler" value={metrics.acceptedRequests} note="Günlük atamaya işlenebilir ya da işlendi." />
          <MiniCard title="Riskli / onay bekleyen istekler" value={metrics.locationRequests} note="Konumlu talepler ilk sırada okunur." />
        </div>
      </div>

      <div ref={previewCardRef} tabIndex={-1} style={{ scrollMarginTop: 16, outline: "none" }}>
        <BoardingRouteImpactPreviewCard
          preview={previewLoading ? null : selectedPreview}
          request={selectedPreviewRequest}
          loading={previewLoading}
          emptyText={selectedPreviewRequestId ? "Bu değişiklik için rota etkisi hesaplanamadı / yeterli veri yok." : ""}
          selectionLabel={previewSelectionLabel}
          selectionNote={previewSelectionNote}
          decisionOwnerLabel={selectedPreviewRequest?.decisionOwnerLabel || boardingChangeDecisionOwnerLabel(selectedPreviewRequest)}
          decisionOwnerNote={selectedPreviewRequest?.decisionOwnerNote || boardingChangeDecisionOwnerNote(selectedPreviewRequest)}
          onClearSelection={selectedPreviewRequestId ? handlePreviewSelectionClear : null}
          title="Rota etkisi önizlemesi"
        />
      </div>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Biniş Değişiklikleri</div>
          <div style={{ display: "grid", gap: 10 }}>
            {requestItems.length ? requestItems.map((item) => (
              <div key={item.id} style={{
                padding: 12,
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                ...(Number(selectedPreviewRequestId || 0) === Number(item.id || 0) ? { boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.22)", background: "rgba(59, 130, 246, 0.10)" } : {}),
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700 }}>{item.title}</div>
                  <StatusPill value={item.status} />
                </div>
                <div className="muted" style={{ marginTop: 6 }}>{item.detail}</div>
                <div className="muted" style={{ marginTop: 4 }}>{item.decisionText}</div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{item.decisionOwnerNote}</div>
                <button
                  type="button"
                  className="btn sm"
                  style={{
                    marginTop: 8,
                    ...(Number(selectedPreviewRequestId || 0) === Number(item.id || 0)
                      ? { borderColor: "rgba(59, 130, 246, 0.55)", boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.18)" }
                      : {}),
                  }}
                  aria-pressed={Number(selectedPreviewRequestId || 0) === Number(item.id || 0)}
                  onClick={() => handlePreviewRequestSelect(item)}
                >
                  {previewLoading && Number(selectedPreviewRequestId || 0) === Number(item.id || 0) ? "Önizleniyor..." : "Rota etkisini önizle"}
                </button>
              </div>
            )) : <div className="muted">Bekleyen biniş değişikliği yok.</div>}
          </div>
        </div>

        <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Biniş Değişikliği Özeti</div>
          <div style={{ display: "grid", gap: 10 }}>
            {summaryRows.map((row) => (
              <SummaryRow key={row.label} {...row} />
            ))}
          </div>
        </div>

        <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Riskli / Onay Bekleyen İstekler</div>
          <div className="muted" style={{ marginBottom: 10 }}>
            Konumlu talepler ve açık istekler burada birlikte görünür.
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {requestItems.length ? requestItems.map((item) => (
              <div key={`risk-${item.id}`} style={{
                padding: 12,
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700 }}>{item.title}</div>
                  <StatusPill value={item.status} />
                </div>
                <div className="muted" style={{ marginTop: 6 }}>{item.detail}</div>
                <div className="muted" style={{ marginTop: 4 }}>{item.decisionText}</div>
              </div>
            )) : <div className="muted">Riskli ya da onay bekleyen istek yok.</div>}
          </div>
        </div>

        <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Kabul edilen değişiklikler</div>
              <div className="muted" style={{ marginBottom: 10 }}>{boardingChangeApplyBoundaryNote()}</div>
            </div>
            <div className="muted">{acceptedRequestCards.length} kayıt</div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {acceptedRequestCards.length ? acceptedRequestCards.map((item) => {
              const isApplying = Number(applyingRequestId || 0) === Number(item.id || 0);
              const canApply = String(item.applicationStatus || "").toUpperCase() === "READY";
              return (
                <div key={`accepted-${item.id}`} style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700 }}>{item.title}</div>
                    <StatusPill value={item.status} />
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>{item.detail}</div>
                  <div className="muted" style={{ marginTop: 4 }}>{boardingChangeApplicationStatusLabel(item.applicationStatus || "READY")}</div>
                  {item.routeRefreshLabel ? <div className="panelMeta" style={{ marginTop: 4 }}>{item.routeRefreshLabel}</div> : null}
                  {item.routeRefreshNote ? <div className="panelMeta" style={{ marginTop: 4 }}>{item.routeRefreshNote}</div> : null}
                  {item.boundaryNote ? <div className="panelMeta" style={{ marginTop: 4 }}>{item.boundaryNote}</div> : null}
                  <div style={{ marginTop: 8 }}>
                    {canApply ? (
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => onApplyAcceptedRequest?.(item.id)}
                        disabled={isApplying}
                      >
                        {isApplying ? "..." : boardingChangeApplyButtonLabel()}
                      </button>
                    ) : (
                      <span className="muted">{item.applicationText || boardingChangeApplySuccessNote()}</span>
                    )}
                  </div>
                </div>
              );
            }) : <div className="muted">Kabul edilen değişiklik yok.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
