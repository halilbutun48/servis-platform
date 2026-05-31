import FlowSummaryStrip from "../../components/FlowSummaryStrip";
import RoutePreviewModal from "../../components/RoutePreviewModal";
import ShiftReassignModal from "../../components/ShiftReassignModal";
import ShiftOperationEventsModal from "../../components/ShiftOperationEventsModal";
import { RoomDispatchPoolSummary } from "./roomShiftsPanelSections";

export function RoomShiftsOverviewSection({
  err,
  pendingCount = 0,
  contractCount = 0,
  otherCount = 0,
  onGoPending = null,
  onGoContract = null,
  onGoOther = null,
}) {
  return (
    <>
      <div className="card" style={{ display: "grid", gap: 12 }}>
        <FlowSummaryStrip
          title="Shifts (ROOM) · Room / Vardiyalar"
          description="Özet üstte; karar, dispatch ve rota önizleme tablarda kalır."
          statusText={pendingCount > 0 ? `${pendingCount} bekleyen karar` : "Akış dengede"}
          tone={pendingCount > 0 ? "warn" : "good"}
          steps={[
            `Bekleyen ${pendingCount}`,
            `Sözleşmeden ${contractCount}`,
            `Diğer ${otherCount}`,
          ]}
        />
        <div className="panelMeta">Firma talebi → Room onayı → operasyon takibi aynı akışta okunur.</div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn sm" onClick={onGoPending}>Bekleyen Talepler</button>
          <button type="button" className="btn sm" onClick={onGoContract}>Sözleşmeden Üretilen</button>
          <button type="button" className="btn sm" onClick={onGoOther}>Diğer Vardiyalar</button>
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}
    </>
  );
}

export function RoomShiftsDispatchPoolSection(props) {
  return <RoomDispatchPoolSummary {...props} />;
}

export function RoomShiftsModalSection({
  previewOpen,
  previewErr,
  previewShift,
  previewSubtitle,
  previewStops,
  previewPeople,
  previewSummary,
  previewPathPoints,
  previewSource,
  previewLoading,
  onClosePreview,
  reassignModal,
  reassignSubtitle,
  vehicles,
  drivers,
  busy,
  onCloseReassign,
  onSubmitReassign,
  opsEventsModal,
  opsEventsSubtitle,
  onCloseOpsEvents,
}) {
  return (
    <>
      {previewOpen && previewErr ? (
        <div className="card err" style={{ marginTop: 10 }}>
          Harita Önizleme: {previewErr}
        </div>
      ) : null}

      <ShiftReassignModal
        open={reassignModal.open}
        shift={reassignModal.shift}
        subtitle={reassignSubtitle}
        vehicles={vehicles}
        drivers={drivers}
        busy={busy}
        onClose={onCloseReassign}
        onSubmit={onSubmitReassign}
      />

      <ShiftOperationEventsModal
        open={opsEventsModal.open}
        shiftId={opsEventsModal.shiftId}
        subtitle={opsEventsSubtitle}
        onClose={onCloseOpsEvents}
      />

      <RoutePreviewModal
        open={previewOpen}
        onClose={onClosePreview}
        title={
          previewShift
            ? `Vardiya ID ${previewShift.id} — Harita Önizleme${previewLoading ? " (yükleniyor...)" : ""}`
            : `Harita Önizleme${previewLoading ? " (yükleniyor...)" : ""}`
        }
        subtitle={previewSubtitle}
        shiftId={typeof previewShift?.id === "number" ? previewShift?.id : null}
        stops={previewStops}
        people={previewPeople}
        previewSummary={previewSummary}
        previewPathPoints={previewPathPoints}
        previewSource={previewSource}
        previewShift={previewShift}
      />
    </>
  );
}
