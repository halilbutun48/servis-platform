import CommercialReadonlySummary from "../../components/CommercialReadonlySummary";
import { navigate } from "../../router";
import { rowSelectionStyle } from "../../utils/listUi";
import {
  buildCapacityMeta,
  formatShiftDateTimeTR as fmtTR,
  formatTRY,
  vehicleMetaLine,
} from "./roomShiftsPanelUtils";
import { formatRegionOwnership, hasRegionOwnership } from "../../utils/regionOwnership";
import {
  AgreementBadge,
  RoomAvailabilityLine,
  RoomCompanyOfferSummary,
  RoomOfferSummary,
  RoomStatusPill,
} from "./roomShiftsPanelCards";
import { displayStatusLabel } from "../../utils/displayStatus";

export function RoomPendingShiftRow({ shift, offersByShiftId, effectiveShiftRoomId, vehiclesForRoom, assignSel, vehiclesById, showAvailableOnly, isVehicleAvailableForShift, driversById, driverSel, avail, busy, openRoutePreview, renderPoolSummary, setAssignSel, setDriverSel, drivers, uiCopyVehicleToPkg, uiCopyDriverToPkg, toggleAvailable, roomsById, approveShift, rejectShift, setFocusedTrackShiftId, copilotShiftId }) {
  const sid = Number(shift.id);
  const marketOffer = offersByShiftId.get(sid) || null;
  const effectiveRoomId = effectiveShiftRoomId(shift, marketOffer);
  const isAgreement = Number(shift?.agreementId) > 0;
  const roomVehicles = vehiclesForRoom(effectiveRoomId);
  const selectedVehicleId = assignSel[sid] || "";
  const vId = selectedVehicleId ? Number(selectedVehicleId) : null;
  const selectedVehicle = vId ? vehiclesById.get(vId) : null;
  const room = effectiveRoomId ? roomsById?.get(Number(effectiveRoomId)) || null : null;
  const onlyAvail = Boolean(showAvailableOnly[sid]);
  const availVehicles = roomVehicles.filter((v) => isVehicleAvailableForShift(v.id, shift));
  const dropdownVehicles = onlyAvail ? availVehicles : roomVehicles;
  const availCount = availVehicles.length;
  const autoDriverId = selectedVehicle?.driverId ? Number(selectedVehicle.driverId) : null;
  const autoDriverName = autoDriverId && driversById.get(autoDriverId) ? driversById.get(autoDriverId).fullName : autoDriverId ? `Sürücü ID ${autoDriverId}` : "-";
  const selD = driverSel[sid] ?? "";
  const manualDriverId = selD ? Number(selD) : null;
  const effDriverId = manualDriverId ?? autoDriverId ?? null;
  const capacityMeta = buildCapacityMeta({ shift, vehicle: selectedVehicle, roomVehicles });
  const availability = avail[sid];
  const approveDisabled = busy || !vId || !effDriverId || capacityMeta.insufficient || availability?.status === "checking" || availability?.status === "conflict" || availability?.status === "error";
  return (
    <tr key={shift.id} onClick={() => setFocusedTrackShiftId(Number(shift?.id || 0) || null)} style={rowSelectionStyle(Number(copilotShiftId || 0) === Number(shift?.id || 0))}>
      <td>{shift.id}<AgreementBadge agreementId={shift.agreementId} /><CommercialReadonlySummary item={shift.commercialBackbone} compact /></td>
      <td className="muted">
        <div>{shift.company?.name || `Firma ID ${shift.companyId}`}</div>
        {hasRegionOwnership(room) ? <div style={{ fontSize: 12 }}>{formatRegionOwnership(room)}</div> : null}
      </td>
      <td className="muted" title={String(shift.startAt)}>{fmtTR(shift.startAt)}</td>
      <td className="muted" title={String(shift.endAt)}>{fmtTR(shift.endAt)}</td>
      <td><div style={{ display: "grid", gap: 6 }}><button type="button" className="btn sm" disabled={busy} onClick={(e) => { e.stopPropagation(); openRoutePreview(shift); }} title="Rota ve durakları haritada önizle">Rota Önizleme</button><div className="muted" style={{ fontSize: 12 }}>Önizleme: rota verisi yalnızca harita üzerinden okunur.</div></div></td>
      <td><div style={{ display: "grid", gap: 6 }}>{isAgreement ? <div className="card" style={{ marginTop: 6 }} title={Number(shift?.agreementId) > 0 ? `Sözleşme ID ${shift.agreementId}` : ""}><div style={{ fontWeight: 800 }}>Sözleşmeli vardiya</div><div className="muted" style={{ marginTop: 6 }}>Sözleşmeli vardiya — pazarlık kapalı.</div></div> : null}{!isAgreement ? <div>{marketOffer ? <div className="card" style={{ marginTop: 6 }} title="Market teklifleri burada teklif özeti ve rota bilgisi olarak görünür."><div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><div style={{ fontWeight: 800 }}>Market Teklifi</div><RoomStatusPill status={marketOffer.status} /></div><div className="muted" style={{ marginTop: 6 }}>Firma: <b>{formatTRY(marketOffer.amountCompany)} ₺</b> • Oda: <b>{formatTRY(marketOffer.amountRoom)} ₺</b></div>{marketOffer.noteCompany ? <div className="muted" style={{ marginTop: 6 }}>Not (Firma): {marketOffer.noteCompany}</div> : null}{marketOffer.noteRoom ? <div className="muted" style={{ marginTop: 4 }}>Not (Oda): {marketOffer.noteRoom}</div> : null}<div className="muted" style={{ marginTop: 8 }}>Pazarlık Market / Teklifler ekranında yapılır. Burada teklif özeti ve rota önizlemesi kalır; araç + sürücü seçimi ise yalnızca bu ekranda yapılır.</div></div> : <div><RoomCompanyOfferSummary shift={shift} vehiclesById={vehiclesById} /></div>}</div> : null}{!isAgreement ? <div style={{ display: "grid", gap: 8 }}><div className="muted" style={{ marginTop: 6 }}>Pazarlık yalnızca Market / Teklifler ekranında yapılır. Bu ekranda rota önizleme ve operasyon hazırlığı kalır.</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" className="btn sm" disabled={busy} onClick={() => navigate("/room/offers")}>Tekliflere Git</button></div>{!marketOffer ? <div className="muted" style={{ marginTop: 2 }}>Bu kayıtta eski doğrudan teklif alanları görünüyor olabilir; yeni karşı teklif üretimi artık Teklifler ekranında yapılır.</div> : null}</div> : null}</div></td>
      <td>{capacityMeta.dispatchRequired ? <div style={{ display: "grid", gap: 8 }}><div className="card" style={{ padding: 10 }}><div className="muted"><b>Bölme modu aktif</b></div><div className="muted" style={{ marginTop: 6 }}>Bu kayıt çok araçlı plan gerektiriyor. Araç ve şoför seçimini aşağıdaki öneri kartlarından yap.</div></div>{renderPoolSummary(shift, capacityMeta, effectiveRoomId)}</div> : <div style={{ display: "grid", gap: 6 }}><select value={selectedVehicleId} onChange={async (e) => { const val = e.target.value; setAssignSel((p) => ({ ...p, [sid]: val })); const hadManual = Boolean(driverSel[sid]); if (!hadManual) { const vid = val ? Number(val) : null; const vv = vid ? vehiclesById.get(vid) : null; if (vv?.driverId) setDriverSel((p) => ({ ...p, [sid]: String(vv.driverId) })); } }} disabled={busy}><option value="">— araç seç —</option>{dropdownVehicles.map((v) => <option key={v.id} value={String(v.id)}>{v.plate} • {vehicleMetaLine(v)}{hasRegionOwnership(v) ? ` • ${formatRegionOwnership(v).replace(/^Bölge:\s*/, "")}` : ""} (Araç ID {v.id})</option>)}</select><div className="row" style={{ marginTop: 6, alignItems: "center" }}><label className="muted" style={{ minWidth: 80 }}>Şoför</label><select value={driverSel[sid] ?? ""} onChange={(e) => setDriverSel((p) => ({ ...p, [sid]: e.target.value }))} disabled={busy}><option value="">Seç (opsiyonel)</option>{drivers.filter((d) => !d?.roomId || Number(d.roomId) === Number(shift.roomId)).map((d) => <option key={d.id} value={String(d.id)}>{d.fullName || d.name || `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || `Şoför ID ${d.id}`}{hasRegionOwnership(d) ? ` • ${formatRegionOwnership(d).replace(/^Bölge:\s*/, "")}` : ""}</option>)}</select></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" disabled={busy || !selectedVehicleId} onClick={() => uiCopyVehicleToPkg(shift, selectedVehicleId)} title="Seçili aracı aynı paket içindeki diğer satırlara kopyalar (sadece UI)">Araç → Pakete Kopyala</button><button type="button" disabled={busy || !(driverSel[sid] ?? "")} onClick={() => uiCopyDriverToPkg(shift, driverSel[sid] ?? "")} title="Seçili şoförü aynı paket içindeki diğer satırlara kopyalar (sadece UI)">Şoför → Pakete Kopyala</button></div><div className="muted" style={{ fontSize: 12 }}>Not: Bu butonlar sadece dropdown değerlerini kopyalar; backend’e kayıt atmaz.</div><button type="button" disabled={busy} onClick={() => toggleAvailable(sid)}>{onlyAvail ? `Tüm Araçları Göster (${roomVehicles.length})` : `Müsait Araçları Göster (${availCount})`}</button><RoomAvailabilityLine shift={shift} vehicleId={vId} driverId={effDriverId} autoDriverName={autoDriverName} availability={availability || null} selectedVehicle={selectedVehicle || null} roomVehicles={roomVehicles} roomsById={roomsById} /></div>}</td>
      <td>{capacityMeta.insufficient ? <div className="muted" style={{ fontSize: 12 }}>Onay bu modda aşağıdaki bölme önizleme kartından verilir.</div> : <button type="button" disabled={approveDisabled} onClick={() => approveShift(shift)} title={!vId ? "Araç seç" : !effDriverId ? "Sürücü seç (veya araçta bağlı sürücü olsun)" : capacityMeta.blockCode ? capacityMeta.blockMessage : availability?.status === "checking" ? "Kontrol ediliyor" : availability?.status === "conflict" ? "Çakışma var" : availability?.status === "error" ? "Uygunluk hatası" : ""}>{busy ? "..." : "Kabul Et"}</button>}</td>
      <td><button type="button" disabled={busy} onClick={() => rejectShift(shift)}>{busy ? "..." : "Reddet"}</button></td>
    </tr>
  );
}

export function RoomAllShiftRow({ shift, offersByShiftId, vehiclesById, roomsById, driversById, setFocusedTrackShiftId, copilotShiftId, extendNoteSel, setExtendNote, busy, decideExtend, openOpsEvents, openReassignModal, openRoutePreview }) {
  const marketOffer = offersByShiftId.get(Number(shift.id));
  const room = shift.room || (shift.roomId ? roomsById?.get(Number(shift.roomId)) || null : null);
  const vehicle = shift.vehicle || (shift.vehicleId ? vehiclesById.get(Number(shift.vehicleId)) || null : null);
  const driver = shift.driver || (shift.driverId ? driversById?.get(Number(shift.driverId)) || null : null);
  return (
    <tr key={shift.id} onClick={() => setFocusedTrackShiftId(Number(shift?.id || 0) || null)} style={rowSelectionStyle(Number(copilotShiftId || 0) === Number(shift?.id || 0))}>
      <td>{shift.id}<AgreementBadge agreementId={shift.agreementId} /><CommercialReadonlySummary item={shift.commercialBackbone} compact />{Number(shift.splitRootId || 0) > 0 ? <div className="muted" style={{ marginTop: 4 }}>Paket ID {shift.splitRootId}{Number(shift.splitIndex || 0) > 0 && Number(shift.splitTotal || 0) > 0 ? ` • ${shift.splitIndex}/${shift.splitTotal}` : ""}</div> : null}</td>
      <td><span className="pill" data-status={shift.status}>{displayStatusLabel(shift.status)}</span></td>
      <td className="muted">
        <div>{shift.company?.name || `Firma ID ${shift.companyId}`}</div>
        {hasRegionOwnership(room) ? <div style={{ fontSize: 12 }}>{formatRegionOwnership(room)}</div> : null}
      </td>
      <td>{Number(shift?.agreementId) > 0 ? <div className="card" style={{ marginTop: 0 }}><div style={{ fontWeight: 800 }}>Sözleşmeli vardiya</div><div className="muted" style={{ marginTop: 6 }}>Pazarlık/teklif kapalı (sözleşme kaynaklı).</div></div> : <div style={{ display: "grid", gap: 8 }}>{marketOffer ? <div className="card" style={{ marginTop: 0 }} title="Market teklifi burada teklif özeti ve rota bilgisi olarak görünür."><div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><div style={{ fontWeight: 800 }}>Market Teklifi</div><RoomStatusPill status={marketOffer.status} /></div><div className="muted" style={{ marginTop: 6 }}>Firma: <b>{formatTRY(marketOffer.amountCompany)} ₺</b> • Oda: <b>{formatTRY(marketOffer.amountRoom)} ₺</b></div></div> : null}<div><b>Firma→Oda</b><div style={{ marginTop: 4 }}><RoomCompanyOfferSummary shift={shift} vehiclesById={vehiclesById} /></div></div><div><b>Oda→Firma</b><div style={{ marginTop: 4 }}><RoomOfferSummary shift={shift} vehiclesById={vehiclesById} /></div></div></div>}</td>
      <td className="muted">
        <div>{vehicle?.plate || (shift.vehicleId ? `Araç ID ${shift.vehicleId}` : "-")}</div>
        {hasRegionOwnership(vehicle) ? <div style={{ fontSize: 12 }}>{formatRegionOwnership(vehicle)}</div> : null}
      </td>
      <td className="muted">
        <div>{driver?.fullName || (shift.driverId ? `Sürücü ID ${shift.driverId}` : "-")}</div>
        {hasRegionOwnership(driver) ? <div style={{ fontSize: 12 }}>{formatRegionOwnership(driver)}</div> : null}
      </td>
      <td className="muted" title={String(shift.startAt)}>{fmtTR(shift.startAt)}</td>
      <td className="muted" title={String(shift.endAt)}>{fmtTR(shift.endAt)}</td>
      <td>{shift.extendRequestedEndAt && String(shift.extendDecision || "PENDING") === "PENDING" ? <div style={{ display: "grid", gap: 6 }}><div className="muted" title={String(shift.extendRequestedEndAt)}>Talep: <b>{fmtTR(shift.extendRequestedEndAt)}</b></div><input placeholder="Not (opsiyonel)" value={extendNoteSel[Number(shift.id)] || ""} onChange={(e) => setExtendNote(shift.id, e.target.value)} /><div className="row" style={{ gap: 8, flexWrap: "wrap" }}><button type="button" disabled={busy} onClick={() => decideExtend(shift.id, "ACCEPTED")}>Kabul</button><button type="button" disabled={busy} onClick={() => decideExtend(shift.id, "REJECTED")}>Reddet</button></div></div> : <span className="muted">-</span>}</td>
      <td><div style={{ display: "grid", gap: 8 }}><button type="button" className="btn sm" disabled={busy} onClick={(e) => { e.stopPropagation(); openRoutePreview?.(shift); }}>Rota Önizleme</button><button type="button" className="btn sm" disabled={busy} onClick={(e) => { e.stopPropagation(); openOpsEvents(shift.id); }}>İşlem Kaydı</button>{String(shift.status || "").toUpperCase() === "APPROVED" || String(shift.status || "").toUpperCase() === "ACTIVE" ? <button type="button" className="btn sm primary" disabled={busy} onClick={(e) => { e.stopPropagation(); openReassignModal(shift); }}>Atamayı Değiştir</button> : null}</div></td>
    </tr>
  );
}
