import RoutePreviewModal from "../../components/RoutePreviewModal";
import PanelFeedbackEntryCard from "../../components/PanelFeedbackEntryCard";
import ShiftReassignModal from "../../components/ShiftReassignModal";
import ShiftOperationEventsModal from "../../components/ShiftOperationEventsModal";
import { RoomDispatchPoolSummary } from "./roomShiftsPanelSections";

export function RoomShiftsOverviewSection({ err }) {
  return (
    <>
      <div className="card">
        <div className="panelSectionTitle">Shifts (ROOM)</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>Company request → Room approve (vehicle+driver) + opsiyonel pazarlık</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <PanelFeedbackEntryCard roleId="ROOM" panelLabel="Room Shifts" relatedPath="/room/shifts" />
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
            ? `Shift #${previewShift.id} — Harita Önizleme${previewLoading ? " (yükleniyor...)" : ""}`
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
