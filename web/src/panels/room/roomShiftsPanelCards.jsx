import {
  buildCapacityMeta,
  formatShiftDateTimeTR as fmtTR,
  formatTRY,
  roomLabel,
  vehicleMetaLine,
} from "./roomShiftsPanelUtils";

export function AgreementBadge({ agreementId }) {
  const id = Number(agreementId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return (
    <span className="pill" data-status="AGREEMENT" title="Agreement kaynaklı otomatik shift" style={{ marginLeft: 8 }}>
      Agreement #{id}
    </span>
  );
}

export function RoomStatusPill({ status }) {
  const v = String(status || "").toUpperCase();
  return <span className="pill" data-status={v} title={v}>{v}</span>;
}

export function RoomCompanyOfferSummary({ shift, vehiclesById }) {
  const ovId = shift?.companyOfferVehicleId ? Number(shift.companyOfferVehicleId) : null;
  const ov = ovId ? vehiclesById.get(ovId) : null;
  const cAmt = shift?.companyOfferAmount != null ? Number(shift.companyOfferAmount) : null;
  const has = Boolean(ovId || cAmt != null || shift?.companyOfferNote);
  if (!has) return <span className="muted">-</span>;
  return (
    <div className="muted" title={shift?.companyOfferNote || ""}>
      <div><b>C→R Araç:</b> {ovId ? (ov ? `${ov.plate} • ${vehicleMetaLine(ov)}` : `#${ovId}`) : "-"}</div>
      {cAmt != null ? <div className="muted" style={{ marginTop: 4 }}><b>C→R Tutar:</b> {formatTRY(cAmt)} ₺</div> : null}
      {shift?.companyOfferNote ? <div className="muted" style={{ marginTop: 4 }}>{shift.companyOfferNote}</div> : null}
    </div>
  );
}

export function RoomOfferSummary({ shift, vehiclesById }) {
  const rvId = shift?.roomOfferVehicleId ? Number(shift.roomOfferVehicleId) : null;
  const rv = rvId ? vehiclesById.get(rvId) : null;
  const rAmt = shift?.roomOfferAmount != null ? Number(shift.roomOfferAmount) : null;
  const has = Boolean(rvId || rAmt != null || shift?.roomOfferNote || shift?.roomOfferToDriver || shift?.roomOfferDriverNote || shift?.roomOfferDecision || shift?.roomOfferDecisionNote);
  if (!has) return <span className="muted">-</span>;
  const decision = String(shift?.roomOfferDecision || "PENDING");
  const decisionAtText = shift?.roomOfferDecisionAt ? fmtTR(shift.roomOfferDecisionAt) : "";
  return (
    <div className="muted">
      <div><b>R→C Araç:</b> {rvId ? (rv ? `${rv.plate} • ${vehicleMetaLine(rv)}` : `#${rvId}`) : "-"}</div>
      {rAmt != null ? <div className="muted" style={{ marginTop: 4 }}><b>R→C Tutar:</b> {formatTRY(rAmt)} ₺</div> : null}
      {shift?.roomOfferNote ? <div className="muted" style={{ marginTop: 4 }}><b>R→C Not:</b> {shift.roomOfferNote}</div> : null}
      {shift?.roomOfferToDriver ? <div className="muted" style={{ marginTop: 4 }}><b>R→D:</b> evet{shift.roomOfferDriverNote ? ` • ${shift.roomOfferDriverNote}` : ""}</div> : null}
      <div style={{ marginTop: 8 }}><b>Karar:</b> {decision === "PENDING" ? <span className="muted">PENDING</span> : <span className="pill" data-status={decision}>{decision}</span>}{decision !== "PENDING" && decisionAtText ? <span className="muted"> • {decisionAtText}</span> : null}</div>
      {shift?.roomOfferDecisionNote ? <div className="muted" style={{ marginTop: 6 }}><b>Karar Notu:</b> {shift.roomOfferDecisionNote}</div> : null}
    </div>
  );
}

export function RoomAvailabilityLine({ shift, vehicleId, driverId, autoDriverName, availability, selectedVehicle, roomVehicles, roomsById }) {
  const capacity = buildCapacityMeta({ shift, vehicle: selectedVehicle, roomVehicles });
  const missing = !vehicleId || !driverId;
  const conflict = availability?.status === "conflict";
  const ok = availability?.status === "ok";
  const checking = availability?.status === "checking";
  const code = availability?.code || (missing ? "SELECT_REQUIRED" : null);
  const msg = availability?.message || (missing ? "Araç ve driver seç." : "");
  const cs = availability?.conflictingShift || null;
  const csId = cs?.id ? Number(cs.id) : null;
  const csRoom = cs?.roomId ? roomsById.get(Number(cs.roomId)) : null;
  const csCompanyName = cs?.company?.name || (cs?.companyId ? `#${cs.companyId}` : null);
  const csRoomName = csRoom ? roomLabel(csRoom) : (cs?.roomId ? `Room #${cs.roomId}` : null);
  return (
    <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
      <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span><b>Uygunluk:</b> {checking ? <span className="pill" data-status="PENDING">CHECK</span> : ok ? <span className="pill" data-status="OK">OK</span> : conflict ? <span className="pill" data-status="REJECTED">{String(code || "CONFLICT")}</span> : missing ? <span className="pill" data-status="PENDING">SEÇİM</span> : <span className="pill" data-status="REJECTED">ERROR</span>}</span>
        <span className="muted">(Araç driver: {autoDriverName})</span>
        {msg ? <span className="muted">• {msg}</span> : null}
      </div>
      {capacity.requiredPax > 0 ? <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span><b>Yolcu:</b> {capacity.requiredPax}</span><span>• <b>Koltuk:</b> {capacity.vehicleCapacity || "-"}</span>{capacity.insufficient ? <span>• <b>Eksik:</b> {capacity.missingCapacity}</span> : null}{capacity.insufficient && capacity.minVehicleCount ? <span>• <b>Bu araçla min:</b> {capacity.minVehicleCount} araç</span> : null}{capacity.requiredPax > 0 && capacity.roomMaxCapacity > 0 ? <span>• <b>Room max tek araç:</b> {capacity.roomMaxCapacity}</span> : null}</div> : null}
      {capacity.insufficient ? <div className="card" style={{ padding: 10 }}><div className="muted"><b>Kapasite uyarısı:</b> tek araç yetmiyor.</div><div className="muted" style={{ marginTop: 6 }}>Bu seçimle en az <b>{capacity.minVehicleCount || "-"}</b> araç gerekir.{capacity.roomMinVehicleCount ? ` Room havuzundaki en büyük araçla bile min ${capacity.roomMinVehicleCount} araç gerekir.` : ""}</div></div> : null}
      {conflict && csId ? <div className="card" style={{ padding: 10 }}><div className="muted"><b>Çakışan vardiya:</b> #{csId} {cs?.status ? <span className="pill" data-status={cs.status} style={{ marginLeft: 6 }}>{cs.status}</span> : null}</div><div className="muted" style={{ marginTop: 6 }}>{csCompanyName ? <span><b>Company:</b> {csCompanyName}</span> : null}{csRoomName ? <span> • <b>Room:</b> {csRoomName}</span> : null}</div><div className="muted" style={{ marginTop: 6 }}><b>Zaman:</b> {fmtTR(cs.startAt)} → {fmtTR(cs.endAt)}</div></div> : null}
    </div>
  );
}

export function RoomDispatchSuggestionCard({
  sid,
  shift,
  part,
  roomVehicles,
  roomDrivers,
  vehiclesById,
  driversById,
  buildDispatchVirtualShift,
  selectedDispatchVehicleId,
  selectedDispatchDriverId,
  dispatchSelStates,
  setDispatchSelection,
  openDispatchSuggestionPreview,
}) {
  const splitIndex = Number(part?.splitIndex || 0);
  const selectedVehicleId = selectedDispatchVehicleId(sid, part);
  const selectedDriverId = selectedDispatchDriverId(sid, part);
  const selectedVehicle = vehiclesById.get(Number(selectedVehicleId)) || part?.vehicle || null;
  const selectedDriver = driversById.get(Number(selectedDriverId)) || part?.driver || null;
  const selectionState = dispatchSelStates?.[splitIndex] || { status: "missing", message: "Araç ve şoför seç." };
  const eligibleVehicles = roomVehicles.filter((v) => Number(v?.capacity || 0) >= Number(part?.allocatedPax || 0) || Number(v?.id || 0) === Number(selectedVehicleId || 0));
  const eligibleDrivers = roomDrivers.filter((d) => Number(d?.id || 0) === Number(selectedDriverId || 0) || d?.driverOk !== false);
  const splitCapacityMeta = buildCapacityMeta({
    shift: buildDispatchVirtualShift(shift, Number(part?.allocatedPax || 0)),
    vehicle: selectedVehicle,
    roomVehicles,
  });
  return (
    <div key={`dispatch-${sid}-${part.splitIndex}`} className="card" style={{ padding: 10 }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div className="muted">
          <b>Öneri #{part.splitIndex}</b>
        </div>
        <div className="muted">
          <b>Yolcu:</b> {Number(part?.allocatedPax || 0)} / {Number(splitCapacityMeta?.vehicleCapacity || part?.capacity || 0)}
        </div>
      </div>
      <div className="muted" style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span><b>Durak:</b> {Number(part?.stopCount || 0)}</span>
        {Number(part?.totalDistanceM || 0) > 0 ? <span>• <b>Km:</b> {(Number(part.totalDistanceM) / 1000).toFixed(1)}</span> : null}
        {Number(part?.totalDurationSec || 0) > 0 ? <span>• <b>Süre:</b> {Math.round(Number(part.totalDurationSec) / 60)} dk</span> : null}
        <span>• <b>Kaynak:</b> {String(part?.routeSource || "ESTIMATED")}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8, marginTop: 8 }}>
        <label className="muted" style={{ display: "grid", gap: 4 }}>
          <span><b>Araç</b></span>
          <select
            value={selectedVehicleId || ""}
            onChange={(e) => setDispatchSelection(sid, splitIndex, { vehicleId: Number(e.target.value || 0) || "" })}
          >
            <option value="">Araç seç</option>
            {eligibleVehicles.map((v) => (
              <option key={`dispatch-v-${sid}-${splitIndex}-${v.id}`} value={v.id}>
                {v.plate} {v?.capacity ? `• ${v.capacity} koltuk` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="muted" style={{ display: "grid", gap: 4 }}>
          <span><b>Şoför</b></span>
          <select
            value={selectedDriverId || ""}
            onChange={(e) => setDispatchSelection(sid, splitIndex, { driverId: Number(e.target.value || 0) || "" })}
          >
            <option value="">Şoför seç</option>
            {eligibleDrivers.map((d) => (
              <option key={`dispatch-d-${sid}-${splitIndex}-${d.id}`} value={d.id}>
                {d.fullName || `#${d.id}`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="muted" style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span>
          <b>Seçim:</b> {selectedVehicle?.plate || `#${selectedVehicleId || "-"}`}
          {selectedDriver?.fullName ? ` → ${selectedDriver.fullName}` : ""}
        </span>
        <span>
          <b>Durum:</b>{" "}
          {selectionState.status === "ok" ? (
            <span className="pill" data-status="OK">OK</span>
          ) : selectionState.status === "checking" ? (
            <span className="pill" data-status="PENDING">CHECK</span>
          ) : selectionState.status === "missing" ? (
            <span className="pill" data-status="PENDING">SEÇİM</span>
          ) : (
            <span className="pill" data-status="REJECTED">{String(selectionState.code || "CONFLICT")}</span>
          )}
        </span>
        {selectionState?.message ? <span>• {selectionState.message}</span> : null}
      </div>
      {Array.isArray(part?.stops) && part.stops.length ? (
        <div className="muted" style={{ marginTop: 6 }}>
          <b>Duraklar:</b> {part.stops.map((s) => `${s.title || s.name || s.id}${Number(s?.count || 0) > 0 ? ` (${Number(s.count)})` : ""}`).join(" → ")}
        </div>
      ) : (
        <div className="muted" style={{ marginTop: 6 }}>Durak üretilemedi; koordinatı olan kişi/durak sayısını kontrol et.</div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <button type="button" className="btn sm" onClick={() => openDispatchSuggestionPreview(shift, part)}>Haritada Gör</button>
      </div>
    </div>
  );
}
