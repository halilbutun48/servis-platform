import {
  buildCapacityMeta,
  formatShiftDateTimeTR as fmtTR,
  formatTRY,
  roomLabel,
  vehicleMetaLine,
} from "./roomShiftsPanelUtils";
import { displayStatusLabel } from "../../utils/displayStatus";
import { formatRegionOwnership, hasRegionOwnership } from "../../utils/regionOwnership";

export function AgreementBadge({ agreementId }) {
  const id = Number(agreementId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return (
    <span className="pill" data-status="AGREEMENT" title="Sözleşme kaynaklı otomatik vardiya" style={{ marginLeft: 8 }}>
      Sözleşme ID {id}
    </span>
  );
}

export function RoomStatusPill({ status }) {
  const v = String(status || "").toUpperCase();
  return <span className="pill" data-status={v} title={displayStatusLabel(v)}>{displayStatusLabel(v)}</span>;
}

export function RoomCompanyOfferSummary({ shift, vehiclesById }) {
  const ovId = shift?.companyOfferVehicleId ? Number(shift.companyOfferVehicleId) : null;
  const ov = ovId ? vehiclesById.get(ovId) : null;
  const cAmt = shift?.companyOfferAmount != null ? Number(shift.companyOfferAmount) : null;
  const has = Boolean(ovId || cAmt != null || shift?.companyOfferNote);
  if (!has) return <span className="muted">-</span>;
  return (
    <div className="muted" title={shift?.companyOfferNote || ""}>
      <div><b>Hizmet Alan Firma → Taşımacılık Firması aracı:</b> {ovId ? (ov ? `${ov.plate} • ${vehicleMetaLine(ov)}` : `Araç ID ${ovId}`) : "-"}</div>
      {cAmt != null ? <div className="muted" style={{ marginTop: 4 }}><b>Hizmet Alan Firma → Taşımacılık Firması tutarı:</b> {formatTRY(cAmt)} ₺</div> : null}
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
      <div><b>Taşımacılık Firması → Hizmet Alan Firma aracı:</b> {rvId ? (rv ? `${rv.plate} • ${vehicleMetaLine(rv)}` : `Araç ID ${rvId}`) : "-"}</div>
      {rAmt != null ? <div className="muted" style={{ marginTop: 4 }}><b>Taşımacılık Firması → Hizmet Alan Firma tutarı:</b> {formatTRY(rAmt)} ₺</div> : null}
      {shift?.roomOfferNote ? <div className="muted" style={{ marginTop: 4 }}><b>Taşımacılık Firması → Hizmet Alan Firma notu:</b> {shift.roomOfferNote}</div> : null}
      {shift?.roomOfferToDriver ? <div className="muted" style={{ marginTop: 4 }}><b>Taşımacılık Firması → Sürücü:</b> evet{shift.roomOfferDriverNote ? ` • ${shift.roomOfferDriverNote}` : ""}</div> : null}
      <div style={{ marginTop: 8 }}><b>Karar:</b> {decision === "PENDING" ? <span className="muted">Bekliyor</span> : <span className="pill" data-status={decision}>{displayStatusLabel(decision)}</span>}{decision !== "PENDING" && decisionAtText ? <span className="muted"> • {decisionAtText}</span> : null}</div>
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
  const msg = availability?.message || (missing ? "Araç ve şoför seç." : "");
  const cs = availability?.conflictingShift || null;
  const csId = cs?.id ? Number(cs.id) : null;
  const csRoom = cs?.roomId ? roomsById.get(Number(cs.roomId)) : null;
  const csCompanyName = cs?.company?.name || (cs?.companyId ? `Firma ID ${cs.companyId}` : null);
  const csRoomName = csRoom ? roomLabel(csRoom) : (cs?.roomId ? `Taşımacılık Firması ID ${cs.roomId}` : null);
  return (
    <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
      <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span><b>Uygunluk:</b> {checking ? <span className="pill" data-status="PENDING">Kontrol</span> : ok ? <span className="pill" data-status="OK">Hazır</span> : conflict ? <span className="pill" data-status="REJECTED">{String(code || "Uyarı")}</span> : missing ? <span className="pill" data-status="PENDING">Araç/şoför seç</span> : <span className="pill" data-status="REJECTED">Hata</span>}</span>
        <span className="muted">(Araç / şoför: {autoDriverName})</span>
        {msg ? <span className="muted">• {msg}</span> : null}
      </div>
      {capacity.requiredPax > 0 ? <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span><b>Yolcu:</b> {capacity.requiredPax}</span><span>• <b>Koltuk:</b> {capacity.vehicleCapacity || "-"}</span>{capacity.insufficient ? <span>• <b>Eksik:</b> {capacity.missingCapacity}</span> : null}{capacity.insufficient && capacity.minVehicleCount ? <span>• <b>Bu araçla min:</b> {capacity.minVehicleCount} araç</span> : null}{capacity.requiredPax > 0 && capacity.roomMaxCapacity > 0 ? <span>• <b>Taşımacılık Firması tek araç üst sınırı:</b> {capacity.roomMaxCapacity}</span> : null}</div> : null}
      {capacity.insufficient ? <div className="card" style={{ padding: 10 }}><div className="muted"><b>Kapasite uyarısı:</b> tek araç yetmiyor.</div><div className="muted" style={{ marginTop: 6 }}>Bu seçimle en az <b>{capacity.minVehicleCount || "-"}</b> araç gerekir.{capacity.roomMinVehicleCount ? ` Taşımacılık Firması havuzundaki en büyük araçla bile en az ${capacity.roomMinVehicleCount} araç gerekir.` : ""}</div></div> : null}
      {conflict && csId ? <div className="card" style={{ padding: 10 }}><div className="muted"><b>Çakışan vardiya:</b> Vardiya ID {csId} {cs?.status ? <span className="pill" data-status={String(cs.status || "").toUpperCase()} style={{ marginLeft: 6 }}>{displayStatusLabel(String(cs.status || "").toUpperCase())}</span> : null}</div><div className="muted" style={{ marginTop: 6 }}>{csCompanyName ? <span><b>Firma:</b> {csCompanyName}</span> : null}{csRoomName ? <span> • <b>Taşımacılık Firması:</b> {csRoomName}</span> : null}</div>{hasRegionOwnership(csRoom) ? <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>{formatRegionOwnership(csRoom)}</div> : null}<div className="muted" style={{ marginTop: 6 }}><b>Zaman:</b> {fmtTR(cs.startAt)} → {fmtTR(cs.endAt)}</div></div> : null}
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
          <b>Öneri {splitIndex + 1}</b>
        </div>
        <div className="muted">
          <b>Yolcu:</b> {Number(part?.allocatedPax || 0)} / {Number(splitCapacityMeta?.vehicleCapacity || part?.capacity || 0)}
        </div>
      </div>
      <div className="muted" style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span><b>Durak:</b> {Number(part?.stopCount || 0)}</span>
        {Number(part?.totalDistanceM || 0) > 0 ? <span>• <b>Km:</b> {(Number(part.totalDistanceM) / 1000).toFixed(1)}</span> : null}
        {Number(part?.totalDurationSec || 0) > 0 ? <span>• <b>Süre:</b> {Math.round(Number(part.totalDurationSec) / 60)} dk</span> : null}
        <span>• <b>Kaynak:</b> {String(part?.routeSource || "ESTIMATED").toUpperCase() === "ESTIMATED" ? "Tahmini rota" : String(part?.routeSource || "").toUpperCase() === "OSRM" ? "Yol ağı rotası" : "Belirtilmemiş"}</span>
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
                {v.plate} {v?.capacity ? `• ${v.capacity} koltuk` : ""}{hasRegionOwnership(v) ? ` • ${formatRegionOwnership(v).replace(/^Bölge:\s*/, "")}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="muted" style={{ display: "grid", gap: 4 }}>
          <span><b>Sürücü</b></span>
          <select
            value={selectedDriverId || ""}
            onChange={(e) => setDispatchSelection(sid, splitIndex, { driverId: Number(e.target.value || 0) || "" })}
          >
            <option value="">Sürücü seç</option>
            {eligibleDrivers.map((d) => (
              <option key={`dispatch-d-${sid}-${splitIndex}-${d.id}`} value={d.id}>
                {d.fullName || `Sürücü ID ${d.id}`}{hasRegionOwnership(d) ? ` • ${formatRegionOwnership(d).replace(/^Bölge:\s*/, "")}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="muted" style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span>
          <b>Seçim:</b> {selectedVehicle?.plate || (selectedVehicleId ? `Araç ID ${selectedVehicleId}` : "-")}
          {selectedDriver?.fullName ? ` → ${selectedDriver.fullName}` : ""}
        </span>
        <span>
          <b>Durum:</b>{" "}
          {selectionState.status === "ok" ? (
            <span className="pill" data-status="OK">Hazır</span>
          ) : selectionState.status === "checking" ? (
            <span className="pill" data-status="PENDING">Kontrol</span>
          ) : selectionState.status === "missing" ? (
            <span className="pill" data-status="PENDING">Araç/şoför seç</span>
          ) : (
            <span className="pill" data-status="REJECTED">{String(selectionState.code || "Uyarı")}</span>
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
