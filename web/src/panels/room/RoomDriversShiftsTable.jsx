import { formatRegionOwnership, hasRegionOwnership } from "../../utils/regionOwnership";

export default function RoomDriversShiftsTable({
  filteredDrivers,
  focusDriverId,
  setFocusDriverId,
  driverStatus,
  fmtTR,
  pickCurrentNext,
  rowSelectionStyle,
}) {
  return (
    <div className="card">
      <h3>Vardiyalar (Sürücü Bazlı)</h3>

      <table className="tbl">
        <thead>
          <tr>
            <th>Sürücü</th>
            <th>Araç</th>
            <th>Mevcut</th>
            <th>Sonraki</th>
          </tr>
        </thead>
        <tbody>
          {filteredDrivers.map((d) => {
            const stat = driverStatus(d.id);
            const bv = stat?.vehicle ?? null;

            const shifts = d.currentShift || d.nextShift ? [] : (Array.isArray(bv?.shifts) ? bv.shifts : []);
            const curNext = d.currentShift || d.nextShift
              ? { current: d.currentShift ?? null, next: d.nextShift ?? null }
              : pickCurrentNext(shifts);

            const curText = curNext.current
              ? `${curNext.current.company?.name || "-"} • ${fmtTR(curNext.current.startAt)}–${fmtTR(curNext.current.endAt)} • ${curNext.current.status}`
              : "-";

            const nextText = curNext.next
              ? `${curNext.next.company?.name || "-"} • ${fmtTR(curNext.next.startAt)}–${fmtTR(curNext.next.endAt)} • ${curNext.next.status}`
              : "-";

            return (
              <tr
                key={d.id}
                data-selected={Number(focusDriverId || 0) === Number(d.id || 0) ? "true" : undefined}
                onClick={() => setFocusDriverId(Number(d.id) || 0)}
                style={rowSelectionStyle(Number(focusDriverId || 0) === Number(d.id || 0))}
              >
                <td>
                  <b>{d.fullName}</b>
                  <div className="muted" style={{ fontSize: 12 }}>Sürücü kaydı</div>
                  {hasRegionOwnership(d) ? <div className="muted" style={{ fontSize: 12 }}>{formatRegionOwnership(d)}</div> : null}
                </td>
                <td className="muted">{bv ? bv.plate : "-"}</td>
                <td className="muted">{curText}</td>
                <td className="muted">{nextText}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="muted" style={{ marginTop: 10 }}>
        Gecici not: vardiya listesi su an bagli aracin <code>shifts[]</code> alanindan okunuyor. Sonraki adimda surucu bazli endpoint ile guclenecek.
      </div>
    </div>
  );
}
