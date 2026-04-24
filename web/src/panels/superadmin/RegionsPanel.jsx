import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";

export default function RegionsPanel() {
  const [items, setItems] = useState([]);
  const [nextPhase, setNextPhase] = useState(null);
  const [deploymentBlueprint, setDeploymentBlueprint] = useState(null);
  const [failoverDrill, setFailoverDrill] = useState(null);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null); // {id,name}
  const [busy, setBusy] = useState(false);
  const [drillBusy, setDrillBusy] = useState(false);
  const [err, setErr] = useState("");
  const [drillErr, setDrillErr] = useState("");

  async function load() {
    setErr("");
    try {
      const [res, pack, blueprint, drill] = await Promise.all([
        api("/api/admin/regions", {}),
        api("/api/admin/regions/next-phase", {}).catch(() => null),
        api("/api/admin/regions/deployment-blueprint", {}).catch(() => null),
        api("/api/admin/regions/failover-drill", {}).catch(() => null),
      ]);
      setItems(res.items || []);
      setNextPhase(pack || null);
      setDeploymentBlueprint(blueprint || null);
      setFailoverDrill(drill || null);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const view = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items || [];
    return (items || []).filter((r) => String(r?.name || "").toLowerCase().includes(qq) || String(r?.id || "").includes(qq));
  }, [items, q]);

  const totals = useMemo(() => {
    return (items || []).reduce(
      (acc, r) => {
        acc.regions += 1;
        acc.companies += Number(r.companyCount || 0);
        acc.rooms += Number(r.roomCount || 0);
        acc.vehicles += Number(r.vehicleCount || 0);
        acc.activeVehicles += Number(r.activeVehicleCount || 0);
        acc.drivers += Number(r.driverCount || 0);
        acc.openShifts += Number(r.openShiftCount || 0);
        acc.activeShifts += Number(r.activeShiftCount || 0);
        return acc;
      },
      { regions: 0, companies: 0, rooms: 0, vehicles: 0, activeVehicles: 0, drivers: 0, openShifts: 0, activeShifts: 0 }
    );
  }, [items]);

  async function create() {
    const n = name.trim();
    if (!n) return setErr("İl adı gerekli");

    setBusy(true);
    setErr("");
    try {
      await api("/api/admin/regions", { method: "POST", body: { name: n } });
      setName("");
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!edit?.id) return;
    const n = (edit.name || "").trim();
    if (!n) return setErr("İl adı gerekli");

    setBusy(true);
    setErr("");
    try {
      await api(`/api/admin/regions/${edit.id}`, { method: "PUT", body: { name: n } });
      setEdit(null);
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    const ok = window.confirm(`#${id} ili silinsin mi? (boş olmalı)`);
    if (!ok) return;

    setBusy(true);
    setErr("");
    try {
      await api(`/api/admin/regions/${id}`, { method: "DELETE" });
      if (edit?.id === id) setEdit(null);
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runFailoverDrill() {
    setDrillErr("");
    setDrillBusy(true);
    try {
      await api("/api/admin/regions/failover-drill/run", {
        method: "POST",
        body: {
          scenarioId: failoverDrill?.manifest?.scenarios?.[0]?.id || null,
          note: "Super-admin dry-run",
        },
      });
      await load();
    } catch (e) {
      setDrillErr(e?.message || String(e));
    } finally {
      setDrillBusy(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <div className="panelTitle" style={{ marginBottom: 6 }}>İller (Region)</div>
          <div className="panelMeta">SUPER_ADMIN illeri tanımlar. Company/Room tarafındaki ilçe/zone alanı bu tanımın alt kırılımı olarak görünür.</div>
        </div>
        <div className="saActions">
          <span className="pill" data-status="COUNT">
            {view.length} kayıt
          </span>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="toolbar">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="İl adı (örn: İstanbul)" style={{ minWidth: 260 }} />
          <button className="btn" onClick={create} disabled={busy}>
            Ekle
          </button>

          <div style={{ flex: 1 }} />

          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara (id / ad)" style={{ minWidth: 260 }} />
          <button className="btn" onClick={load} disabled={busy}>
            Yenile
          </button>
        </div>

        {err ? <div style={{ color: "#ff7b7b", marginTop: 12, whiteSpace: "pre-wrap" }}>{err}</div> : null}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span className="pill" data-status="COUNT">İl: {totals.regions}</span>
          <span className="pill" data-status="COUNT">Şirket: {totals.companies}</span>
          <span className="pill" data-status="COUNT">Oda: {totals.rooms}</span>
          <span className="pill" data-status="COUNT">Araç: {totals.vehicles} / Aktif {totals.activeVehicles}</span>
          <span className="pill" data-status="COUNT">Şoför: {totals.drivers}</span>
          <span className="pill" data-status="COUNT">Vardiya: {totals.openShifts} / Aktif {totals.activeShifts}</span>
        </div>
        {nextPhase?.items?.length ? (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div className="panelMeta">Region next phase execution pack</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {nextPhase.items.map((item) => (
                <span key={item.key} className="pill" data-status={item.status === "READY" ? "PASS" : "WARN"}>
                  {item.title}: {item.status}
                </span>
              ))}
            </div>
            <div className="panelMeta" style={{ lineHeight: 1.4 }}>
              {nextPhase.items.map((item) => item.note).join(" • ")}
            </div>
          </div>
        ) : null}

        {deploymentBlueprint ? (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div className="panelMeta">Physical region cell deployment blueprint</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="pill" data-status="COUNT">Region: {deploymentBlueprint.summary?.regionCount || 0}</span>
              <span className="pill" data-status="COUNT">Multi-cell: {deploymentBlueprint.summary?.multiCellRegions || 0}</span>
              <span className="pill" data-status="COUNT">Cells: {deploymentBlueprint.summary?.totalCells || 0}</span>
            </div>
            <div className="panelMeta" style={{ lineHeight: 1.4 }}>
              Control plane: {deploymentBlueprint.controlPlane?.services?.join(", ") || "-"}
            </div>
          </div>
        ) : null}

        {failoverDrill ? (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div className="panelMeta">Failover / rebalancing drill</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="pill" data-status="COUNT">Senaryo: {failoverDrill.scenarioCount || 0}</span>
              <span className="pill" data-status={failoverDrill.latestRun?.status === "DRY_RUN_OK" ? "PASS" : "ROLE"}>
                Son run: {failoverDrill.latestRun?.status || "Yok"}
              </span>
              <button className="btn sm primary" disabled={drillBusy} onClick={runFailoverDrill}>
                Dry-run çalıştır
              </button>
            </div>
            {drillErr ? <div style={{ color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{drillErr}</div> : null}
            <div className="panelMeta" style={{ lineHeight: 1.4 }}>
              {failoverDrill.manifest?.scenarios?.map((s) => `${s.title}`).join(" • ") || "-"}
            </div>
          </div>
        ) : null}
      </div>

      <div className="saTable">
        <div className="saHead" style={{ display: "grid", gridTemplateColumns: "80px 1fr 220px 260px 240px", padding: "10px 12px" }}>
          <div>ID</div>
          <div>Ad</div>
          <div>İlçe / Zone</div>
          <div>Kapasite</div>
          <div>Aksiyon</div>
        </div>

        {(view || []).map((r) => (
          <div key={r.id} className="saRow" style={{ display: "grid", gridTemplateColumns: "80px 1fr 220px 260px 240px", padding: "10px 12px", alignItems: "center" }}>
            <div style={{ opacity: 0.85 }}>{r.id}</div>
            <div>
              {edit?.id === r.id ? (
                <input value={edit.name} onChange={(e) => setEdit((x) => ({ ...x, name: e.target.value }))} style={{ width: "100%" }} />
              ) : (
                r.name
              )}
            </div>
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="pill" data-status={(Number(r.companyCount || 0) + Number(r.roomCount || 0)) > 0 ? "COUNT" : "ROLE"}>
                  Ş:{r.companyCount || 0} / O:{r.roomCount || 0} / Z:{r.zoneCount || 0}
                </span>
                {(r.zoneSamples || []).length ? (
                  <div className="panelMeta" style={{ lineHeight: 1.3 }}>
                    {(r.zoneSamples || [])
                      .map((z) => `${z.name}${z.count ? ` (${z.count})` : ""}`)
                      .join(", ")}
                  </div>
                ) : (
                  <div className="panelMeta" style={{ opacity: 0.6 }}>İlçe/zone yok</div>
                )}
              </div>
            </div>
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="pill" data-status={(Number(r.activeShiftCount || 0) + Number(r.openShiftCount || 0)) > 0 ? "COUNT" : "ROLE"}>
                  A:{r.activeVehicleCount || 0} / T:{r.vehicleCount || 0}
                </span>
                <div className="panelMeta" style={{ lineHeight: 1.3 }}>
                  Ş:{r.driverCount || 0} · V:{r.openShiftCount || 0} / Aktif:{r.activeShiftCount || 0}
                </div>
              </div>
            </div>

            <div className="saActions">
              {edit?.id === r.id ? (
                <>
                  <button className="btn sm primary" disabled={busy} onClick={saveEdit}>
                    Kaydet
                  </button>
                  <button className="btn sm" disabled={busy} onClick={() => setEdit(null)}>
                    İptal
                  </button>
                </>
              ) : (
                <>
                  <button className="btn sm" disabled={busy} onClick={() => setEdit({ id: r.id, name: r.name })}>
                    Düzenle
                  </button>
                  <button
                    className="btn sm"
                    title={Number(r.companyCount || 0) + Number(r.roomCount || 0) > 0 ? "Önce bağlı company/room kayıtlarını boşaltın" : ""}
                    disabled={busy || Number(r.companyCount || 0) + Number(r.roomCount || 0) > 0}
                    onClick={() => del(r.id)}
                  >
                    Sil
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {(!view || view.length === 0) && <div style={{ padding: 12, opacity: 0.75 }}>Kayıt yok</div>}
      </div>

      <div className="muted" style={{ marginTop: 12 }}>
        Not: Bir ili silebilmek için o ile bağlı ACTIVE/PASSIVE Company/Room olmamalı.
      </div>
    </div>
  );
}
