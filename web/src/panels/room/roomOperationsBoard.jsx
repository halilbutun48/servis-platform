import { useMemo } from "react";
import { displayStatusLabel } from "../../utils/displayStatus";
import { boardingChangeDecisionLabel, boardingChangeKindLabel } from "../shared/boardingChangeUi";

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
  const normalized = String(value || "-").trim().toUpperCase();
  const style = normalized === "OPEN"
    ? { color: "#fedf89", background: "rgba(247,144,9,0.16)", border: "1px solid rgba(247,144,9,0.45)" }
    : normalized === "ACTIVE"
      ? { color: "#d1fadf", background: "rgba(18,183,106,0.16)", border: "1px solid rgba(18,183,106,0.45)" }
      : { color: "#d0d5dd", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        ...style,
      }}
    >
      {displayStatusLabel(value)}
    </span>
  );
}

function lineLabel(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

export default function RoomOperationsBoard({ roomSummary, roomData }) {
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
  const roomIssueCount = Number(roomSummary?.cards?.openIssues || 0);

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
    const openRequests = requests.length;
    const locationRequests = requests.filter((item) => item?.lat != null && item?.lng != null).length;
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
      locationRequests,
      totalShifts,
      activeShifts,
      approvedShifts,
      vehicleCount,
      totalVehicleLoad,
      avgVehicleLoad,
      noShowCount,
    };
  }, [driverSignals, requests, shiftSummary, vehicleSummary, driverSummary]);

  const requestItems = useMemo(() => {
    return requests.slice(0, 5).map((item) => {
      const personelName = item?.personel?.fullName || item?.personel?.name || `Personel #${item?.personelId || "-"}`;
      const shiftId = item?.shift?.id || item?.shiftId || "-";
      const kindLabel = boardingChangeKindLabel(item?.requestKind || item?.kind);
      const decisionState = String(item?.decisionState || item?.status || "").trim().toUpperCase();
      return {
        id: item?.id || `${shiftId}-${personelName}`,
        title: personelName,
        detail: `${kindLabel} • shift #${shiftId}`,
        decisionText: item?.decisionText || boardingChangeDecisionLabel(decisionState),
        status: item?.status || "OPEN",
        decisionState,
      };
    });
  }, [requests]);

  const summaryRows = useMemo(() => [
    {
      label: "Bugün binmeyecek",
      value: lineLabel(metrics.noShowCount),
      note: "No-show kayıtlarından türetilir.",
    },
    {
      label: "Farklı duraktan binecek",
      value: lineLabel(metrics.locationRequests),
      note: "Konumlu istekler üzerinden okunur.",
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
          <MiniCard title="Riskli / onay bekleyen istekler" value={metrics.locationRequests} note="Konumlu talepler ilk sırada okunur." />
        </div>
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
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700 }}>{item.title}</div>
                  <StatusPill value={item.status} />
                </div>
                <div className="muted" style={{ marginTop: 6 }}>{item.detail}</div>
                <div className="muted" style={{ marginTop: 4 }}>{item.decisionText}</div>
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
      </div>
    </div>
  );
}
