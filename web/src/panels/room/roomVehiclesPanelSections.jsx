import ListSelectionBanner from "../../components/ListSelectionBanner";
import { navigate } from "../../router";
import { rowSelectionStyle } from "../../utils/listUi";
import {
  VEHICLE_TEMPLATES_TR,
  VEHICLE_TYPES,
  fmtDate,
  fmtDriverHuman,
  gpsAtLabel,
  hasGpsFix,
  setSelMany,
} from "./roomVehiclesPanelUtils";
import {
  RoomTelematicsDeviceRow,
  RoomVehicleAssignmentRow,
  RoomVehicleAvailabilityRow,
} from "./roomVehiclesPanelRows";
import {
  RoomDeviceTokenRevealCard,
  RoomVehicleEditModal,
  RoomVehicleLinkSection,
} from "./roomVehiclesPanelCards";
import { formatRegionOwnership, hasRegionOwnership } from "../../utils/regionOwnership";


export function RoomVehicleManageSection({
  showArchived,
  setShowArchived,
  templateId,
  applyTemplate,
  plate,
  setPlate,
  capacity,
  setCapacity,
  type,
  setType,
  speedLimitKmh,
  setSpeedLimitKmh,
  inspectionDueAt,
  setInspectionDueAt,
  odometerKm,
  setOdometerKm,
  brand,
  setBrand,
  model,
  setModel,
  modelYear,
  setModelYear,
  lastServiceAt,
  setLastServiceAt,
  lastServiceKm,
  setLastServiceKm,
  serviceIntervalKm,
  setServiceIntervalKm,
  color,
  setColor,
  vin,
  setVin,
  note,
  setNote,
  createVehicle,
  busy,
  items,
  focusVehicle,
  focusDriverLabel,
  focusVehicleId,
  setFocusVehicleId,
  setTab,
  setErr,
  openEdit,
  deleteVehicle,
  unbindDriver,
  driversById,
}) {
  return (
    <div>
      <div className="card">
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(Boolean(e.target.checked))}
            disabled={busy}
          />
          <span>Arşivi göster</span>
        </label>
        <div className="muted" style={{ marginTop: 6 }}>
          Kapalıyken arşivli araçlar listelenmez. Açınca arşiv dahil tüm araçlar gelir.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.75fr", gap: 12, alignItems: "start" }}>
        <div className="card">
          <h3>Yeni Araç</h3>
          <form onSubmit={createVehicle} className="grid">
            <div className="col" style={{ gridColumn: "1 / -1" }}>
              <label className="muted">Hazır Şablon (TR)</label>
              <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
                <option value="">— Şablon seç (opsiyonel) —</option>
                {VEHICLE_TEMPLATES_TR.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} • {t.type} • {t.capacity}
                  </option>
                ))}
              </select>
            </div>

            <div className="col">
              <label className="muted">Plaka</label>
              <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="34 ABC 123" />
            </div>

            <div className="col">
              <label className="muted">Kapasite</label>
              <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>

            <div className="col">
              <label className="muted">Tip</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {VEHICLE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col">
              <label className="muted">Hız limit</label>
              <input type="number" value={speedLimitKmh} onChange={(e) => setSpeedLimitKmh(e.target.value)} />
            </div>

            <div className="col">
              <label className="muted">Muayene</label>
              <input type="date" value={inspectionDueAt} onChange={(e) => setInspectionDueAt(e.target.value)} />
            </div>

            <div className="col">
              <label className="muted">Km</label>
              <input type="number" value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} placeholder="123456" />
            </div>

            <div className="col">
              <label className="muted">Marka</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ford" />
            </div>

            <div className="col">
              <label className="muted">Model</label>
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Transit" />
            </div>

            <div className="col">
              <label className="muted">Model yılı</label>
              <input type="number" value={modelYear} onChange={(e) => setModelYear(e.target.value)} placeholder="2021" />
            </div>

            <div className="col">
              <label className="muted">Son bakım</label>
              <input type="date" value={lastServiceAt} onChange={(e) => setLastServiceAt(e.target.value)} />
            </div>

            <div className="col">
              <label className="muted">Son bakım km</label>
              <input type="number" value={lastServiceKm} onChange={(e) => setLastServiceKm(e.target.value)} placeholder="110000" />
            </div>

            <div className="col">
              <label className="muted">Bakım periyodu</label>
              <input type="number" value={serviceIntervalKm} onChange={(e) => setServiceIntervalKm(e.target.value)} />
            </div>

            <div className="col">
              <label className="muted">Renk</label>
              <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Beyaz" />
            </div>

            <div className="col">
              <label className="muted">VIN</label>
              <input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="Şasi No" />
            </div>

            <div className="col" style={{ gridColumn: "1 / -1" }}>
              <label className="muted">Not</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Araçla ilgili not..." />
            </div>

            <div className="col" style={{ justifyContent: "end" }}>
              <button disabled={busy} type="submit">
                {busy ? "..." : "Ekle"}
              </button>
            </div>
          </form>
        </div>

        <div className="card" style={{ overflowX: "auto" }}>
          <h3>Liste</h3>
          <ListSelectionBanner
            selectedLabel={focusVehicle?.plate || ""}
            selectedSummary={[focusVehicle?.brand, focusVehicle?.model, focusDriverLabel].filter(Boolean).join(" • ")}
            visibleCount={items.length}
            totalCount={items.length}
            helper="Copilot seçili araç kartını kullanır."
          />

          <table className="tbl" style={{ whiteSpace: "nowrap", fontSize: 12, marginTop: 10 }}>
            <thead>
              <tr>
                <th>Plaka</th>
                <th>Kapasite</th>
                <th>Tip</th>
                <th>Hız limit</th>
                <th>Muayene</th>
                <th>Km / Bakım</th>
                <th>Not</th>
                <th>Bağlı sürücü</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => {
                const nextKm = v.lastServiceKm != null && v.serviceIntervalKm != null ? v.lastServiceKm + v.serviceIntervalKm : null;
                const remainingKm = nextKm != null && v.odometerKm != null ? nextKm - v.odometerKm : null;
                const drvId = Number(v.driver?.id || v.driverId || 0);
                const drvObj = v.driver || (drvId ? driversById.get(drvId) : null);
                const driverLabel = drvObj ? fmtDriverHuman(drvObj) : (drvId ? `#${drvId}` : "-");
                const isArchived = Boolean(v.archivedAt);
                const hasDriver = Boolean(drvId);
                const gpsOk = hasGpsFix(v);

                return (
                  <tr key={v.id} onClick={() => setFocusVehicleId(Number(v.id) || 0)} style={{ ...rowSelectionStyle(Number(focusVehicleId || 0) === Number(v.id || 0)), ...(isArchived ? { opacity: 0.65 } : {}) }}>
                    <td title={!gpsOk ? "GPS verisi yok (haritada görünmez)" : ""}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span>{v.plate}</span>
                        {isArchived ? <span className="pill" data-status="PASSIVE">Arşivde</span> : null}
                      </div>
                      {hasRegionOwnership(v) ? <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{formatRegionOwnership(v)}</div> : null}
                      {!gpsOk ? <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>📡 GPS yok</div> : null}
                    </td>
                    <td className="muted">{v.capacity}</td>
                    <td className="muted">{v.type ?? "-"}</td>
                    <td className="muted">{v.speedLimitKmh ?? "-"}</td>
                    <td className="muted">{fmtDate(v.inspectionDueAt)}</td>
                    <td className="muted">{v.odometerKm != null ? `${v.odometerKm} km` : "-"}{remainingKm != null ? ` • kalan ${remainingKm} km` : ""}</td>
                    <td className="muted">{v.note ? String(v.note) : "-"}</td>
                    <td>
                      <div className="muted">{driverLabel}{drvId ? ` (id=${drvId})` : ""}</div>
                      {hasRegionOwnership(v) ? <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{formatRegionOwnership(v)}</div> : null}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                        <button
                          type="button"
                          disabled={busy || isArchived}
                          onClick={() => {
                            setFocusVehicleId(Number(v.id));
                            setTab("link");
                            setErr("");
                          }}
                        >
                          Bağlı sürücüyü yönet
                        </button>

                        <button type="button" disabled={busy || isArchived || !hasDriver} onClick={() => unbindDriver(v.id)} title="Bağlantıyı kaldır">
                          Ayır
                        </button>
                      </div>
                    </td>

                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" disabled={busy || isArchived} onClick={(e) => { e.stopPropagation(); setFocusVehicleId(Number(v.id) || 0); openEdit(v); }}>
                        Düzenle
                      </button>

                      <button type="button" disabled={busy || isArchived} onClick={() => deleteVehicle(v)}>
                        Sil/Arşivle
                      </button>
                      <button type="button" disabled={busy} onClick={() => navigate(`/shared/logs?kind=bundle_vehicle&targetType=vehicle&targetId=${v.id}&format=txt`)}>
                        Log TXT
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="muted" style={{ marginTop: 8 }}>
            “Sil/Arşivle”: Shift bağlıysa backend arşivler, değilse siler.
          </div>
        </div>
      </div>
    </div>
  );
}

export function RoomVehicleStatusSection({
  plateQuery,
  setPlateQuery,
  statusFilter,
  setStatusFilter,
  busy,
  focusVehicle,
  focusUi,
  focusDriverLabel,
  statusRows,
  items,
  focusVehicleId,
  onSelectVehicle,
}) {
  return (
    <div className="card">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <label className="muted">Plaka ara</label>
          <input value={plateQuery} onChange={(e) => setPlateQuery(e.target.value)} placeholder="34 ABC..." />
        </div>
        <div>
          <label className="muted">Durum</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} disabled={busy}>
            <option value="ALL">Hepsi</option>
            <option value="LIVE">ONLINE</option>
            <option value="STALE">STALE</option>
            <option value="OFFLINE">OFFLINE</option>
          </select>
        </div>
        <div className="muted" style={{ marginLeft: "auto" }}>
          Durum görünümü
        </div>
      </div>

      <ListSelectionBanner
        selectedLabel={focusVehicle?.plate || ""}
        selectedSummary={[focusUi?.label, focusDriverLabel, focusVehicle?.type].filter(Boolean).join(" • ")}
        visibleCount={statusRows.length}
        totalCount={items.filter((v) => !v.archivedAt).length}
        filterValue={`${plateQuery} ${statusFilter}`.trim()}
        onClearFilter={() => {
          setPlateQuery("");
          setStatusFilter("ALL");
        }}
        helper="Copilot seçili aracı kullanır."
      />

      <table className="tbl" style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th>Plaka</th>
            <th>Durum</th>
            <th>Son GPS</th>
            <th>Hız</th>
            <th>Konum</th>
            <th>GPS Durumu</th>
          </tr>
        </thead>
        <tbody>
          {statusRows.map(({ v, ui, pillKey }) => {
            const hasGps = hasGpsFix(v);
            return (
              <tr key={v.id} onClick={() => onSelectVehicle(Number(v.id) || 0)} style={rowSelectionStyle(Number(focusVehicleId || 0) === Number(v.id || 0))}>
                <td>
                  <div>{v.plate}</div>
                  {hasRegionOwnership(v) ? <div className="muted" style={{ fontSize: 12 }}>{formatRegionOwnership(v)}</div> : null}
                  {!hasGps ? <div className="muted" style={{ fontSize: 12 }}>📡 GPS yok</div> : null}
                </td>
                <td>
                  <span className="pill" data-status={pillKey}>{ui}</span>
                </td>
                <td className="muted">{gpsAtLabel(v)}</td>
                <td className="muted">{v.gpsLast?.speed != null ? `${v.gpsLast.speed} km/h` : "-"}</td>
                <td className="muted">{hasGps ? `${v.gpsLast.lat.toFixed(4)}, ${v.gpsLast.lng.toFixed(4)}` : "📡 GPS yok"}</td>
                <td className="muted">{v.gpsLast?.status ? String(v.gpsLast.status) : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="muted" style={{ marginTop: 8 }}>
        Not: Araç haritada marker olarak görünmesi için en az 1 kez GPS (lat/lng) gelmelidir.
      </div>
    </div>
  );
}

export function RoomVehicleAssignmentsSection({
  assignRows,
  assignQuery,
  setAssignQuery,
  assignFilter,
  setAssignFilter,
  assignSort,
  setAssignSort,
  assignRangeDays,
  setAssignRangeDays,
  busy,
  onReload,
  focusVehicleId,
  onSelectVehicle,
  shiftExp,
  setShiftExp,
}) {
  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ marginBottom: 0 }}>Atama görünümü</h3>
          <div className="muted" style={{ marginTop: 6 }}>
            Araç bazlı <b>mevcut</b> ve <b>sıradaki</b> shift özeti. (Kaynak: <code>/api/vehicles</code> içindeki kabul edilmiş / aktif vardiyalar)
          </div>
        </div>
        <div style={{ marginLeft: "auto" }} className="muted">
          Gösterilen: <b>{assignRows.length}</b>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ minWidth: 240 }}>
          <label className="muted">Plaka ara</label>
          <input value={assignQuery} onChange={(e) => setAssignQuery(e.target.value)} placeholder="34ABC123" />
        </div>
        <div>
          <label className="muted">Filtre</label>
          <select value={assignFilter} onChange={(e) => setAssignFilter(e.target.value)}>
            <option value="ALL">Hepsi</option>
            <option value="HAS_CURRENT">Sadece “Şu an” olanlar</option>
            <option value="HAS_NEXT">Sadece “Sıradaki” olanlar</option>
            <option value="AGREEMENT_ONLY">Sadece sözleşmeli olanlar</option>
          </select>
        </div>
        <div>
          <label className="muted">Sıralama</label>
          <select value={assignSort} onChange={(e) => setAssignSort(e.target.value)}>
            <option value="PLATE_ASC">Plaka (A→Z)</option>
            <option value="PLATE_DESC">Plaka (Z→A)</option>
            <option value="CURRENT_SOON">Şu an (yakın başlama)</option>
            <option value="NEXT_SOON">Sıradaki (yakın başlama)</option>
          </select>
        </div>
        <div>
          <label className="muted">Pencere</label>
          <select value={assignRangeDays} onChange={(e) => setAssignRangeDays(Number(e.target.value || 7))}>
            <option value={1}>Bugün</option>
            <option value={3}>3 gün</option>
            <option value={7}>7 gün</option>
            <option value={14}>14 gün</option>
          </select>
        </div>
        <button type="button" disabled={busy} onClick={() => onReload()}>
          Yenile
        </button>
      </div>

      <div style={{ marginTop: 12, overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", minWidth: 1180, tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "20%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "29%" }} />
            <col style={{ width: "29%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ padding: "12px 14px", textAlign: "left" }}>Araç</th>
              <th style={{ padding: "12px 14px", textAlign: "left" }}>Sürücü</th>
              <th style={{ padding: "12px 14px", textAlign: "left" }}>Şu an</th>
              <th style={{ padding: "12px 14px", textAlign: "left" }}>Sıradaki</th>
            </tr>
          </thead>
          <tbody>
            {assignRows.map(({ v, cur, next }) => (
              <RoomVehicleAssignmentRow
                key={v.id}
                v={v}
                cur={cur}
                next={next}
                focusVehicleId={focusVehicleId}
                onSelectVehicle={onSelectVehicle}
                shiftExp={shiftExp}
                setShiftExp={setShiftExp}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
        Not: Bu tablo <code>/api/vehicles</code> içindeki <b>kabul edilmiş / aktif</b> vardiya setini kullanır. Bekleyen (henüz atanmadı) burada görünmez.
      </div>
    </div>
  );
}

export function RoomVehicleAvailabilitySection({
  availRows,
  availSel,
  setAvailSel,
  availQuery,
  setAvailQuery,
  availFilter,
  setAvailFilter,
  availStartAt,
  setAvailStartAt,
  availEndAt,
  setAvailEndAt,
  availBusy,
  busy,
  checkAvailabilityAll,
  setAvailMap,
  focusVehicleId,
  onSelectVehicle,
}) {
  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ marginBottom: 0 }}>Uygunluk</h3>
          <div className="muted" style={{ marginTop: 6 }}>
            Seçilen zaman penceresinde araç/sürücü uygunluğu. (Kaynak: <code>/api/availability/bulk</code> — agreement-first)
          </div>
        </div>
        <div style={{ marginLeft: "auto" }} className="muted">
          Gösterilen: <b>{availRows.length}</b> • Seçili: <b>{availRows.filter((r) => !!availSel[r.v.id]).length}</b>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ minWidth: 240 }}>
          <label className="muted">Plaka ara</label>
          <input value={availQuery} onChange={(e) => setAvailQuery(e.target.value)} placeholder="34ABC123" disabled={availBusy} />
        </div>
        <div>
          <label className="muted">Filtre</label>
          <select value={availFilter} onChange={(e) => setAvailFilter(e.target.value)} disabled={availBusy}>
            <option value="ALL">Hepsi</option>
            <option value="ONLY_UNCHECKED">Sadece kontrol edilmemiş</option>
            <option value="ONLY_OK">Sadece OK</option>
            <option value="ONLY_CONFLICT">Sadece CONFLICT</option>
            <option value="ONLY_WITH_DRIVER">Sadece sürücüsü bağlı</option>
          </select>
        </div>
        <div>
          <label className="muted">Start</label>
          <input type="datetime-local" value={availStartAt} onChange={(e) => setAvailStartAt(e.target.value)} disabled={availBusy} />
        </div>
        <div>
          <label className="muted">End</label>
          <input type="datetime-local" value={availEndAt} onChange={(e) => setAvailEndAt(e.target.value)} disabled={availBusy} />
        </div>
        <button type="button" disabled={availBusy || busy} onClick={() => checkAvailabilityAll(false)}>
          {availBusy ? "Kontrol..." : "Tümünü Kontrol Et"}
        </button>
        <button type="button" disabled={availBusy || busy} onClick={() => checkAvailabilityAll(true)} title="Sadece seçili araçları kontrol eder">
          Seçiliyi Kontrol Et
        </button>
        <button type="button" disabled={availBusy || busy} onClick={() => setSelMany(setAvailSel, availRows.map((r) => r.v.id), true)}>
          Hepsini Seç
        </button>
        <button type="button" disabled={availBusy || busy} onClick={() => setAvailSel({})}>
          Seçimi Temizle
        </button>
        <button type="button" disabled={availBusy || busy} onClick={() => setAvailMap({})}>
          Sonuçları Temizle
        </button>
      </div>

      <div style={{ marginTop: 12, overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", minWidth: 1180, tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "24%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>
                <input
                  type="checkbox"
                  title="Görünenlerin hepsini seç/çöz"
                  checked={availRows.length > 0 && availRows.every((r) => !!availSel[r.v.id])}
                  onChange={(e) => setSelMany(setAvailSel, availRows.map((r) => r.v.id), e.target.checked)}
                  disabled={availBusy}
                />
              </th>
              <th style={{ padding: "12px 14px", textAlign: "left" }}>Araç</th>
              <th style={{ padding: "12px 14px", textAlign: "left" }}>Sürücü</th>
              <th style={{ padding: "12px 14px", textAlign: "left" }}>Araç uygun mu?</th>
              <th style={{ padding: "12px 14px", textAlign: "left" }}>Sürücü uygun mu?</th>
            </tr>
          </thead>
          <tbody>
            {availRows.map(({ v, row, quickBusy, hasDriver }) => (
              <RoomVehicleAvailabilityRow
                key={v.id}
                v={v}
                row={row}
                quickBusy={quickBusy}
                hasDriver={hasDriver}
                focusVehicleId={focusVehicleId}
                onSelectVehicle={onSelectVehicle}
                availSel={availSel}
                setAvailSel={setAvailSel}
                availBusy={availBusy}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
        İpucu: Agreement → Daily Shift (M18) aynı pencereye shift ürettiyse bile <code>/api/availability/bulk</code> önce agreement conflict döner (deterministik).
      </div>
    </div>
  );
}

export function RoomVehicleTelematicsSection({
  focusVehicleId,
  setFocusVehicleId,
  setErr,
  busy,
  deviceBusy,
  deviceSaving,
  items,
  deviceForm,
  setDeviceForm,
  focusArchived,
  createDevice,
  tokenReveal,
  copyToken,
  focusVehicle,
  telematicsCounts,
  loadDevices,
  telematicsRows,
  deviceDrafts,
  setDeviceDrafts,
  saveDevice,
  rotateDeviceToken,
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1.45fr", gap: 12, alignItems: "start" }}>
      <div className="card">
        <h3>Telematics cihaz yönetimi</h3>
        <div className="muted">ROOM &gt; Vehicles içinde araç bazlı GPS cihazı yönetimi</div>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div>
            <label className="muted">Araç</label>
            <select
              value={String(focusVehicleId || "")}
              onChange={(e) => {
                const nextId = Number(e.target.value || 0);
                setFocusVehicleId(nextId);
                setErr("");
              }}
              disabled={busy || deviceBusy || deviceSaving}
            >
              {items.map((v) => (
                <option key={v.id} value={v.id} disabled={Boolean(v.archivedAt)}>
                  {v.plate} (#{v.id}){hasRegionOwnership(v) ? ` • ${formatRegionOwnership(v).replace(/^Bölge:\s*/, "")}` : ""}{v.archivedAt ? " • Arşivde" : ""}
                </option>
              ))}
            </select>
          </div>
          <form onSubmit={createDevice} style={{ display: "grid", gap: 10 }}>
            <div>
              <label className="muted">Provider</label>
              <select value={deviceForm.vendor} onChange={(e) => setDeviceForm((p) => ({ ...p, vendor: e.target.value }))} disabled={deviceSaving || focusArchived}>
                <option value="GENERIC">GENERIC</option>
                <option value="TRACCAR">TRACCAR</option>
              </select>
            </div>
            <div>
              <label className="muted">Serial</label>
              <input value={deviceForm.serial} onChange={(e) => setDeviceForm((p) => ({ ...p, serial: e.target.value }))} placeholder="örn: TRK-34-0001" disabled={deviceSaving || focusArchived} />
            </div>
            <div>
              <label className="muted">Label (opsiyonel)</label>
              <input value={deviceForm.label} onChange={(e) => setDeviceForm((p) => ({ ...p, label: e.target.value }))} placeholder="örn: Ön cam cihazı" disabled={deviceSaving || focusArchived} />
            </div>
            <button type="submit" disabled={deviceSaving || focusArchived || !focusVehicleId || !String(deviceForm.serial || "").trim()}>
              Device ekle
            </button>
          </form>
          <div className="muted" style={{ fontSize: 12 }}>
            Not: Create / update / rotate işlemleri step-up write guard altındadır. Ham token sadece create/rotate anında bir kez gösterilir.
          </div>
        </div>
        <RoomDeviceTokenRevealCard tokenReveal={tokenReveal} copyToken={copyToken} />
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0 }}>Araç cihazları</h3>
            <div className="muted">Seçili araç: <b>{focusVehicle?.plate || "-"}</b> • Toplam cihaz: {telematicsCounts[Number(focusVehicleId)] || 0}</div>
          </div>
          <button type="button" disabled={deviceBusy || deviceSaving} onClick={() => loadDevices()}>
            Yenile
          </button>
        </div>
        {focusArchived ? <div className="card" style={{ marginTop: 12 }}>Arşivli araçta telematics yönetimi kapalıdır.</div> : null}
        {!focusArchived && !telematicsRows.length ? <div className="muted" style={{ marginTop: 12 }}>Bu araç için telematics cihazı yok.</div> : null}
        {!focusArchived && telematicsRows.length ? (
          <table className="tbl" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Vendor</th>
                <th>Serial</th>
                <th>Label</th>
                <th>Durum</th>
                <th>Son Seen</th>
                <th>Son Ingest</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {telematicsRows.map((d) => (
                <RoomTelematicsDeviceRow
                  key={d.id}
                  d={d}
                  deviceDrafts={deviceDrafts}
                  setDeviceDrafts={setDeviceDrafts}
                  deviceSaving={deviceSaving}
                  saveDevice={saveDevice}
                  rotateDeviceToken={rotateDeviceToken}
                />
              ))}
            </tbody>
          </table>
        ) : null}
        <div className="muted" style={{ marginTop: 12, fontSize: 12, display: "grid", gap: 4 }}>
          <div><code>POST /api/telematics/push</code> → device token ile direkt cihaz push</div>
          <div><code>POST /api/telematics/vendor/:provider</code> → vendor cloud webhook</div>
        </div>
      </div>
    </div>
  );
}

export { RoomVehicleLinkSection, RoomVehicleEditModal } from "./roomVehiclesPanelCards";
