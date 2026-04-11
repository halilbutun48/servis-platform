import DriverPenaltyBadge from "../../components/driver/DriverPenaltyBadge";
import { rowSelectionStyle } from "../../utils/listUi";

export default function RoomDriversStatusTable({
  visibleStatusDrivers,
  focusDriverId,
  setFocusDriverId,
  statusColFilter,
  setStatusColFilter,
  clearStatusColumnFilters,
  driverStatus,
  penaltiesByDriverId,
  fmtTR,
  driverOps,
  connectionBadgeStatus,
  assignmentBadgeStatus,
  gpsBadgeStatus,
}) {
  return (
    <div className="card">
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Operasyon Durumu</h3>
        <button type="button" className="btn sm ghost" onClick={clearStatusColumnFilters}>Sütun filtrelerini temizle</button>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Sürücü</th>
            <th>Telefon</th>
            <th>Bağlantı</th>
            <th>Görev</th>
            <th>Araç</th>
            <th>GPS</th>
            <th>Son GPS</th>
            <th>Konum</th>
          </tr>
          <tr>
            <th><input value={statusColFilter.driver} onChange={(e) => setStatusColFilter((p) => ({ ...p, driver: e.target.value }))} placeholder="Ad / kod / id" /></th>
            <th><input value={statusColFilter.phone} onChange={(e) => setStatusColFilter((p) => ({ ...p, phone: e.target.value }))} placeholder="Telefon" /></th>
            <th>
              <select value={statusColFilter.connection} onChange={(e) => setStatusColFilter((p) => ({ ...p, connection: e.target.value }))}>
                <option value="ALL">Hepsi</option>
                <option value="ONLINE">Bağlı</option>
                <option value="OFFLINE">Bağlı değil</option>
              </select>
            </th>
            <th>
              <select value={statusColFilter.task} onChange={(e) => setStatusColFilter((p) => ({ ...p, task: e.target.value }))}>
                <option value="ALL">Hepsi</option>
                <option value="ACTIVE">Aktif vardiya</option>
                <option value="ASSIGNED">Vardiya atandı</option>
                <option value="ASSIGNED_NO_VEHICLE">Araç bekleniyor</option>
                <option value="NONE">Görev yok</option>
              </select>
            </th>
            <th><input value={statusColFilter.vehicle} onChange={(e) => setStatusColFilter((p) => ({ ...p, vehicle: e.target.value }))} placeholder="Plaka" /></th>
            <th>
              <select value={statusColFilter.gps} onChange={(e) => setStatusColFilter((p) => ({ ...p, gps: e.target.value }))}>
                <option value="ALL">Hepsi</option>
                <option value="LIVE">Canlı</option>
                <option value="STALE">Pasif</option>
                <option value="WAITING">Bekliyor</option>
                <option value="OFFLINE">Kapalı</option>
                <option value="IDLE">GPS pasif</option>
              </select>
            </th>
            <th className="muted">Görüntü</th>
            <th className="muted">Görüntü</th>
          </tr>
        </thead>
        <tbody>
          {visibleStatusDrivers.length ? visibleStatusDrivers.map((d) => {
            const stat = driverStatus(d.id);
            const bv = stat?.vehicle ?? d?.boundVehicle ?? null;
            const ops = driverOps(d);
            const isSelected = Number(focusDriverId || 0) === Number(d.id || 0);

            return (
              <tr
                key={d.id}
                data-selected={isSelected ? "true" : undefined}
                onClick={() => setFocusDriverId(Number(d.id) || 0)}
                style={rowSelectionStyle(isSelected)}
              >
                <td>
                  <b>{d.fullName}</b> <DriverPenaltyBadge item={penaltiesByDriverId[d.id]} />
                  <div className="muted">#{d.id}</div>
                </td>
                <td>{d.phone}</td>
                <td>
                  <span className="pill" data-status={connectionBadgeStatus(ops)}>{ops.connectionLabel}</span>
                  <div className="muted">{fmtTR(d?.user?.deviceLastSeenAt)}</div>
                </td>
                <td>
                  <span className="pill" data-status={assignmentBadgeStatus(ops)}>{ops.assignmentLabel}</span>
                  <div className="muted">{d?.currentShift ? `Current #${d.currentShift.id}` : d?.nextShift ? `Next #${d.nextShift.id}` : '-'}</div>
                </td>
                <td className="muted">{bv ? bv.plate : '-'}</td>
                <td>
                  <span className="pill" data-status={gpsBadgeStatus(ops, stat)}>{ops.gpsLabel}</span>
                </td>
                <td className="muted">{bv?.gpsLast?.at ? fmtTR(bv.gpsLast.at) : '-'}</td>
                <td className="muted">{bv?.gpsLast?.lat != null && bv?.gpsLast?.lng != null ? `${Number(bv.gpsLast.lat).toFixed(5)}, ${Number(bv.gpsLast.lng).toFixed(5)}` : '-'}</td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={8} className="muted">Bu filtreye uyan sürücü görünmüyor.</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="muted" style={{ marginTop: 8 }}>
        Not: Baglanti, gorev ve GPS durumu artik ayri gosterilir. GPS yok olmasi surucunun giris yapmadigi anlamina gelmez.
      </div>
    </div>
  );
}
