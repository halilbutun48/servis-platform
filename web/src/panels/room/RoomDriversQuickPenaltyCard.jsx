import DriverPenaltyBadge from "../../components/driver/DriverPenaltyBadge";
import DriverPenaltyForm from "../../components/driver/DriverPenaltyForm";
import { rowSelectionStyle } from "../../utils/listUi";

export default function RoomDriversQuickPenaltyCard({
  filteredDrivers,
  focusDriverId,
  setFocusDriverId,
  penaltiesByDriverId,
  penaltyOpenDriverId,
  setPenaltyOpenDriverId,
  busy,
  createNoShow,
}) {
  return (
    <div className="card">
      <h3>Hızlı Gelmedi Kaydı</h3>
      <div className="muted">İlk 12 sürücü üzerinden hızlı kayıt ekleme</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {filteredDrivers.slice(0, 12).map((d) => (
          <div
            key={`pen-${d.id}`}
            onClick={() => setFocusDriverId(Number(d.id) || 0)}
            style={{
              ...rowSelectionStyle(Number(focusDriverId || 0) === Number(d.id || 0)),
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              borderBottom: "1px solid var(--line, #eee)",
              paddingBottom: 8,
              borderRadius: 10,
              paddingLeft: 8,
              paddingRight: 8,
            }}
          >
            <b>{d.fullName}</b>
            <span className="muted">{d.phone || "-"}</span>
            <DriverPenaltyBadge item={penaltiesByDriverId[d.id]} />
            <button
              type="button"
              className="btn"
              onClick={(e) => {
                e.stopPropagation();
                setFocusDriverId(Number(d.id) || 0);
                setPenaltyOpenDriverId((p) => (p === Number(d.id) ? 0 : Number(d.id)));
              }}
            >
              Gelmedi kaydı
            </button>
            {penaltyOpenDriverId === Number(d.id) ? (
              <div style={{ width: "100%" }}>
                <DriverPenaltyForm driver={d} busy={busy} onSubmit={(payload) => createNoShow(d, payload)} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
