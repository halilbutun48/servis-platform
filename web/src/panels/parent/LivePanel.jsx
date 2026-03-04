// web/src/panels/parent/LivePanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import { navigate } from "../../router";

function etaText(v) {
  const m = v?.etaToChildMin;
  if (typeof m !== "number" || !Number.isFinite(m)) return "—";
  if (m <= 1) return "1 dk";
  return `${m} dk`;
}

function stopTitle(s) {
  if (!s?.name) return "—";
  const ord = typeof s.order === "number" ? s.order : null;
  return ord ? `${ord}. ${s.name}` : s.name;
}

function numText(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return String(n);
}

export default function ParentLivePanel() {
  const { token } = useSession();

  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function loadChildren() {
    const r = await api("/api/parent/children", { token });
    const items = Array.isArray(r?.items) ? r.items : [];
    setChildren(items);
    if (!childId && items[0]?.id) setChildId(String(items[0].id));
    return items;
  }

  async function loadVehicles(cid) {
    const qs = new URLSearchParams();
    if (cid) qs.set("childId", String(cid));
    const r = await api(`/api/parent/live/vehicles?${qs.toString()}`, { token });
    const items = Array.isArray(r) ? r : Array.isArray(r?.items) ? r.items : [];
    setVehicles(items);
    return items;
  }

  async function loadAll() {
    setBusy(true);
    setErr("");
    try {
      const kids = await loadChildren();
      const cid = childId || (kids[0]?.id ? String(kids[0].id) : "");
      await loadVehicles(cid);
    } catch (e) {
      setErr(e?.message || String(e));
      setVehicles([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WS auto refresh (lightweight)
  useAutoReload("gps", () => loadVehicles(childId).catch(() => {}));
  useAutoReload("vehicles", () => loadVehicles(childId).catch(() => {}));
  useAutoReload("shifts", () => loadVehicles(childId).catch(() => {}));

  const selected = useMemo(() => children.find((c) => String(c.id) === String(childId)) || null, [children, childId]);

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">Veli • Canlı Takip</div>
        <div className="muted">
          KVKK kuralı: Canlı konum sadece <b>vardiya saat aralığında</b> gösterilir.
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Çocuk
            <select value={childId} onChange={(e) => setChildId(e.target.value)} style={{ minWidth: 240 }}>
              <option value="">Seç</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.id} {c.fullName}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr("");
              try {
                await loadVehicles(childId);
              } catch (e) {
                setErr(e?.message || String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "..." : "Yenile"}
          </button>

          <div className="muted">
            Araç: <b>{vehicles.length}</b>
          </div>

          {selected?.company?.name ? (
            <div className="muted">
              Okul/Şirket: <b>{selected.company.name}</b>
            </div>
          ) : null}
        </div>

        {err ? (
          <div className="card err" style={{ marginTop: 12 }}>
            {err}
          </div>
        ) : null}

        {!vehicles.length ? (
          <div className="muted" style={{ marginTop: 12 }}>
            Şu an canlı konum yok. (Vardiya saatinde ve araç ataması varsa görünür.)
          </div>
        ) : null}

        {vehicles.length ? (
          <div className="card" style={{ marginTop: 12, padding: 12 }}>
            <div className="muted" style={{ marginBottom: 8 }}>
              Canlı durum (ETA + durak):
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {vehicles.map((v) => (
                <div key={v.id} style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <div>
                    Araç <b>#{v.id}</b> • <b>{v.plate}</b>
                  </div>
<button
  type="button"
  className="btn"
  onClick={() =>
    navigate(
      `/shared/logs?kind=bundle_vehicle&targetType=vehicle&targetId=${v.id}&childId=${childId}&format=txt`
    )
  }
  title="Araç için TXT log export (GPS + hız + bildirim)"
>
  Log TXT
</button>


                  <div className="muted">
                    ETA: <b>{etaText(v)}</b>
                  </div>

                  {v?.etaTarget?.type === "STOP" ? (
                    <div className="muted">
                      Çocuk durağı: <b>{v.etaTarget.stopName}</b>
                    </div>
                  ) : null}

                  {v?.etaToChildKm != null ? (
                    <div className="muted">
                      Mesafe: <b>{v.etaToChildKm} km</b>
                    </div>
                  ) : null}

                  <div className="muted">
                    Sonraki: <b>{stopTitle(v.nextStop)}</b>
                  </div>

                  {v?.remainingStopsToChild != null ? (
                    <div className="muted">
                      Çocuğa kalan: <b>{numText(v.remainingStopsToChild)}</b>
                    </div>
                  ) : (
                    <div className="muted">
                      Çocuğa kalan: <b>—</b>
                    </div>
                  )}

                  {v?.remainingStopsTotal != null ? (
                    <div className="muted">
                      Toplam kalan: <b>{numText(v.remainingStopsTotal)}</b>
                    </div>
                  ) : null}

                  {v?.childStopReached ? (
                    <div className="muted">
                      Durum: <b>Ulaşıldı</b>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 12 }}>
          <MapView vehicles={vehicles} stops={[]} />
        </div>
      </div>
    </div>
  );
}
