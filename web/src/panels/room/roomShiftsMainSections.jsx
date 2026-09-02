import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import { RoomShiftsDispatchPoolSection } from "./roomShiftsOverviewSection";
import { RoomFinalListSection, RoomPendingSection } from "./roomShiftsPanelSections";

function roomShiftsTabLabel(tabKey) {
  if (tabKey === "pending") return "Bekleyen Talepler";
  if (tabKey === "contract") return "Sözleşmeden Üretilen";
  return "Diğer Vardiyalar";
}

export function RoomShiftsMainSections({
  activeTab,
  onChangeTab,
  tabCounts,
  pendingStatus,
  setPendingStatus,
  pendingQ,
  setPendingQ,
  pendingFiltered,
  contractQ,
  setContractQ,
  contractFiltered,
  otherQ,
  setOtherQ,
  otherFiltered,
  items,
  offersByShiftId,
  effectiveShiftRoomId,
  vehiclesForRoom,
  assignSel,
  vehiclesById,
  showAvailableOnly,
  isDriverAvailableForShift,
  isVehicleAvailableForShift,
  driversById,
  driverSel,
  avail,
  busy,
  openRoutePreview,
  setAssignSel,
  setDriverSel,
  drivers,
  uiCopyVehicleToPkg,
  uiCopyDriverToPkg,
  toggleAvailable,
  roomsById,
  approveShift,
  rejectShift,
  setFocusedTrackShiftId,
  copilotShiftId,
  poolSummary,
  dispatchPreview,
  dispatchEditSel,
  getDispatchSelectionStates,
  driversForRoom,
  selectedDispatchVehicleId,
  selectedDispatchDriverId,
  buildDispatchVirtualShift,
  setDispatchSelection,
  openDispatchSuggestionPreview,
  loadPoolSummary,
  loadDispatchPreview,
  autoSplitApprove,
  copilotShift,
  extendNoteSel,
  setExtendNote,
  decideExtend,
  openOpsEvents,
  openReassignModal,
}) {
  const activeLabel = roomShiftsTabLabel(activeTab);
  const activeCounts = tabCounts || { pending: 0, contract: 0, other: 0 };
  const renderPoolSummary = (shift, capacityMeta, effectiveRoomId) => (
    <RoomShiftsDispatchPoolSection
      shift={shift}
      capacityMeta={capacityMeta}
      effectiveRoomId={effectiveRoomId}
      poolSummary={poolSummary}
      dispatchPreview={dispatchPreview}
      dispatchEditSel={dispatchEditSel}
      getDispatchSelectionStates={getDispatchSelectionStates}
      vehiclesForRoom={vehiclesForRoom}
      driversForRoom={driversForRoom}
      selectedDispatchVehicleId={selectedDispatchVehicleId}
      selectedDispatchDriverId={selectedDispatchDriverId}
      vehiclesById={vehiclesById}
      driversById={driversById}
      items={items}
      isDriverAvailableForShift={isDriverAvailableForShift}
      isVehicleAvailableForShift={isVehicleAvailableForShift}
      buildDispatchVirtualShift={buildDispatchVirtualShift}
      setDispatchSelection={setDispatchSelection}
      openDispatchSuggestionPreview={openDispatchSuggestionPreview}
      loadPoolSummary={loadPoolSummary}
      loadDispatchPreview={loadDispatchPreview}
      autoSplitApprove={autoSplitApprove}
      busy={busy}
    />
  );

  return (
    <>
      <div className="card roomShiftsTabCard" style={{ marginTop: 10 }}>
        <PanelSegmentTabs
          ariaLabel="Taşımacılık Firması vardiya bölümleri"
          tabs={[
            { key: "pending", label: "Bekleyen Talepler", badge: activeCounts.pending || 0 },
            { key: "contract", label: "Sözleşmeden Üretilen", badge: activeCounts.contract || 0 },
            { key: "other", label: "Diğer Vardiyalar", badge: activeCounts.other || 0 },
          ]}
          value={activeTab}
          onChange={onChangeTab}
          compact
        />
        <div className="muted roomShiftsTabHint" style={{ marginTop: 6 }}>
          {activeLabel === "Bekleyen Talepler"
            ? "Hizmet Alan Firma talebi, Taşımacılık Firması onayı ve karar bekleyen vardiyalar."
            : activeLabel === "Sözleşmeden Üretilen"
              ? "Sözleşme kaynaklı vardiyalar; sözleşme kartları burada toplanır."
              : "Sözleşmeye bağlı olmayan normal, rehberli ve elle oluşturulan vardiyalar."}
        </div>
      </div>

      {activeTab === "pending" ? (
        <RoomPendingSection
          showTitle={false}
          pendingStatus={pendingStatus}
          setPendingStatus={setPendingStatus}
          pendingQ={pendingQ}
          setPendingQ={setPendingQ}
          pendingFiltered={pendingFiltered}
          renderPoolSummary={renderPoolSummary}
          offersByShiftId={offersByShiftId}
          effectiveShiftRoomId={effectiveShiftRoomId}
          vehiclesForRoom={vehiclesForRoom}
          assignSel={assignSel}
          vehiclesById={vehiclesById}
          showAvailableOnly={showAvailableOnly}
          isVehicleAvailableForShift={isVehicleAvailableForShift}
          driversById={driversById}
          driverSel={driverSel}
          avail={avail}
          busy={busy}
          openRoutePreview={openRoutePreview}
          setAssignSel={setAssignSel}
          setDriverSel={setDriverSel}
          drivers={drivers}
          uiCopyVehicleToPkg={uiCopyVehicleToPkg}
          uiCopyDriverToPkg={uiCopyDriverToPkg}
          toggleAvailable={toggleAvailable}
          roomsById={roomsById}
          approveShift={approveShift}
          rejectShift={rejectShift}
          setFocusedTrackShiftId={setFocusedTrackShiftId}
          copilotShiftId={copilotShiftId}
          poolSummary={poolSummary}
          dispatchPreview={dispatchPreview}
          dispatchEditSel={dispatchEditSel}
          getDispatchSelectionStates={getDispatchSelectionStates}
          driversForRoom={driversForRoom}
          selectedDispatchVehicleId={selectedDispatchVehicleId}
          selectedDispatchDriverId={selectedDispatchDriverId}
          buildDispatchVirtualShift={buildDispatchVirtualShift}
          setDispatchSelection={setDispatchSelection}
          openDispatchSuggestionPreview={openDispatchSuggestionPreview}
          loadPoolSummary={loadPoolSummary}
          loadDispatchPreview={loadDispatchPreview}
          autoSplitApprove={autoSplitApprove}
        />
      ) : activeTab === "contract" ? (
        <RoomFinalListSection
          showTitle={false}
          title="Sözleşmeden Üretilen"
          description="Sözleşmeye bağlı vardiyalar burada görünür."
          listQ={contractQ}
          setListQ={setContractQ}
          copilotShift={copilotShift}
          listFiltered={contractFiltered}
          items={items}
          emptyText="Sözleşmeden üretilen vardiya yok."
          searchPlaceholder="Ara (kayıt no / firma / plaka / sürücü / not)"
          offersByShiftId={offersByShiftId}
          vehiclesById={vehiclesById}
          roomsById={roomsById}
          driversById={driversById}
          setFocusedTrackShiftId={setFocusedTrackShiftId}
          copilotShiftId={copilotShiftId}
          extendNoteSel={extendNoteSel}
          setExtendNote={setExtendNote}
          busy={busy}
          decideExtend={decideExtend}
          openOpsEvents={openOpsEvents}
          openReassignModal={openReassignModal}
          openRoutePreview={openRoutePreview}
        />
      ) : activeTab === "other" ? (
        <RoomFinalListSection
          showTitle={false}
          title="Diğer Vardiyalar"
          description="Sözleşmeye bağlı olmayan normal / rehberli / elle oluşturulan vardiyalar burada görünür."
          listQ={otherQ}
          setListQ={setOtherQ}
          copilotShift={copilotShift}
          listFiltered={otherFiltered}
          items={items}
          emptyText="Diğer vardiya yok."
          searchPlaceholder="Ara (kayıt no / firma / plaka / sürücü / not)"
          offersByShiftId={offersByShiftId}
          vehiclesById={vehiclesById}
          roomsById={roomsById}
          driversById={driversById}
          setFocusedTrackShiftId={setFocusedTrackShiftId}
          copilotShiftId={copilotShiftId}
          extendNoteSel={extendNoteSel}
          setExtendNote={setExtendNote}
          busy={busy}
          decideExtend={decideExtend}
          openOpsEvents={openOpsEvents}
          openReassignModal={openReassignModal}
          openRoutePreview={openRoutePreview}
        />
      ) : null}
    </>
  );
}
