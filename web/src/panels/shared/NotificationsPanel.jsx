// web/src/panels/shared/NotificationsPanel.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import FlowSummaryStrip from "../../components/FlowSummaryStrip";
import CollapsibleSection from "../../components/CollapsibleSection";
import { normalizeNotifV1 } from "../../utils/notificationV1";
import { formatRegionOwnership } from "../../utils/regionOwnership";
import { pillKeyFromAny } from "../../utils/uiStatus";
import { formatDateTimeTR } from "../../utils/time";

function fmt(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function fmtAtCompact(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return formatDateTimeTR(d, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtAge(ageSec) {
  if (typeof ageSec !== "number" || Number.isNaN(ageSec)) return "";
  const s = Math.max(0, Math.floor(ageSec));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

function uniq(arr) {
  const s = new Set();
  for (const x of arr) {
    const t = String(x || "").trim();
    if (t) s.add(t);
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

export default function NotificationsPanel() {
  const { token } = useSession();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);

  // Filters
  const [q, setQ] = useState("");
  const [fScope, setFScope] = useState("ALL");
  const [fType, setFType] = useState("ALL");
  const [fStatus, setFStatus] = useState("ALL");

  const load = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api("/api/notifications/my", { token });
      const list = Array.isArray(r) ? r : Array.isArray(r?.items) ? r.items : [];
      setItems(list);
    } catch {
      setErr("Bildirimler şu anda okunamadı. Yenileyip tekrar deneyin.");
      setItems([]);
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useAutoReload("notifications", load);

  const rows = useMemo(() => {
    return (items || []).map((n, idx) => {
      const rawPayload = n?.payloadJson ?? n?.payload ?? null;
      const p = normalizeNotifV1(rawPayload);

      const title = p.title || fmt(n?.type) || "-";
      const message = p.message || "";
      const vehicleId = p.vehicleId ?? n?.vehicleId ?? "";
      const atRaw = p.at ?? n?.createdAt ?? "";
      const at = fmtAtCompact(atRaw);

      // UI text fields
      const type = fmt(n?.type ?? "-");
      const typeLabel = fmt(p.kind ?? n?.type ?? "-"); // önce kind yoksa type
      const kind = fmt(p.kind ?? "");
      const status = fmt(p.status ?? "");
      const regionLabel = formatRegionOwnership(n?.regionOwnership);

      const payloadPretty = JSON.stringify(p, null, 2);

      return {
        key: n?.id ?? idx,
        id: n?.id ?? "-",
        scope: fmt(n?.scope ?? "-"),
        type,
        typeLabel,
        title,
        message,
        vehicleId: fmt(vehicleId),
        kind,
        status,
        regionLabel,
        ageSec: p.ageSec,
        at,
        atRaw: fmt(atRaw),
        payloadPretty,
      };
    });
  }, [items]);

  const scopes = useMemo(() => uniq(rows.map((r) => r.scope)), [rows]);
  const types = useMemo(() => uniq(rows.map((r) => r.typeLabel)), [rows]);
  const statuses = useMemo(() => uniq(rows.map((r) => r.status).filter(Boolean)), [rows]);

  const filteredRows = useMemo(() => {
    const qq = String(q || "").trim().toLowerCase();

    return rows.filter((r) => {
      if (fScope !== "ALL" && r.scope !== fScope) return false;
      if (fType !== "ALL" && r.typeLabel !== fType) return false;
      if (fStatus !== "ALL" && r.status !== fStatus) return false;

      if (!qq) return true;

      const hay = [
        r.id,
        r.scope,
        r.type,
        r.typeLabel,
        r.title,
        r.message,
        r.vehicleId,
        r.kind,
        r.status,
        r.regionLabel,
      ]
        .map((x) => String(x || "").toLowerCase())
        .join(" | ");

      return hay.includes(qq);
    });
  }, [rows, q, fScope, fType, fStatus]);

  function resetFilters() {
    setQ("");
    setFScope("ALL");
    setFType("ALL");
    setFStatus("ALL");
  }

  const visibleStatusText = `${filteredRows.length} / ${rows.length}`;
  const visibleTone = filteredRows.length ? "success" : "warning";

  return (
    <div className="wrap notifWide">
      <style>{`
        .wrap.notifWide { max-width:none !important; width:100% !important; }

        .notifLayout { display:flex; flex-direction:column; gap:12px; min-height: calc(100vh - 120px); }
        .notifTopbar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }

        .notifFilters { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .notifFilters input, .notifFilters select {
          min-height: 44px;
          height: auto;
          padding: 8px 10px;
        }

        .notifTblCard { flex:1; min-height:420px; overflow:hidden; }
        .notifTblWrap { height:100%; overflow-y:auto; overflow-x:auto; }

        .notifTbl { width:max(100%, 1560px); border-collapse:collapse; table-layout:fixed; }
        .notifTbl th, .notifTbl td { padding:10px 12px; vertical-align:top; }
        .notifTbl thead th {
          position:sticky; top:0;
          background: rgba(12,18,28,0.92);
          backdrop-filter: blur(6px);
          z-index:1;
        }

        .notifTbl thead th, .notifTbl .nowrap { white-space:nowrap; }

        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .nowrap { white-space:nowrap; }
        .ellipsis { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        .clamp2{
          display:-webkit-box;
          -webkit-line-clamp:3;
          -webkit-box-orient:vertical;
          overflow:hidden;
        }

        /* Daha kompakt kolonlar */
        .colId { width:60px; }
        .colType { width:170px; }
        .colScope { width:100px; }
        .colRegion { width:190px; }
        .colAt { width:136px; }
        .colTitle { width:250px; }
        .colMsg { width:360px; }
        .colVehicle { width:72px; }
        .colKind { width:170px; }
        .colStatus { width:130px; }
        .colAge { width:72px; }
        .colPayload { width:88px; }

        /* .pill taşmasın */
        .pillEllip {
          display:inline-block;
          max-width: 160px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          vertical-align: top;
        }

        @media (max-width: 1150px){
          .hideMd { display:none; }
        }
        @media (max-width: 980px){
          .hideSm { display:none; }
        }

        @media (max-width: 640px){
          .notifLayout { min-height: auto; }
          .notifTopbar { align-items: stretch; }
          .notifFilters { width: 100%; align-items: stretch; }
          .notifFilters input, .notifFilters select, .notifFilters button {
            width: 100%;
            min-width: 0 !important;
          }
          .notifTblCard { min-height: 320px; }
        }
      `}</style>

      <div className="notifLayout">
        <div className="card">
          <FlowSummaryStrip
            title="Bildirimler"
            description="Son 100 kayıt filtrelenir; detay ve ham veri sadece kontrollü alanda açılır."
            statusText={busy ? "Yükleniyor" : err ? "Bağlantı okunamadı" : visibleStatusText}
            tone={visibleTone}
            steps={[
              `Scope ${scopes.length}`,
              `Tip ${types.length}`,
              `Durum ${statuses.length}`,
            ]}
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 12 }}>
            <div className="card" style={{ margin: 0, padding: 12 }}>
              <div className="muted">Görüntülenen</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{filteredRows.length}</div>
            </div>
            <div className="card" style={{ margin: 0, padding: 12 }}>
              <div className="muted">Toplam kayıt</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{rows.length}</div>
            </div>
            <div className="card" style={{ margin: 0, padding: 12 }}>
              <div className="muted">Scope sayısı</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{scopes.length}</div>
            </div>
            <div className="card" style={{ margin: 0, padding: 12 }}>
              <div className="muted">Tip sayısı</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{types.length}</div>
            </div>
          </div>

          <div className="notifTopbar">
            <div>
              <h3 style={{ margin: 0 }}>Bildirimler</h3>
              <div className="muted">Son 100 kayıt</div>
            </div>

            <div className="notifFilters">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ara: id / tür / başlık / mesaj / araç ..."
                style={{ minWidth: 240 }}
              />

              <select value={fScope} onChange={(e) => setFScope(e.target.value)}>
                <option value="ALL">Kapsam: Tümü</option>
                {scopes.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>

              <select value={fType} onChange={(e) => setFType(e.target.value)} style={{ minWidth: 160 }}>
                <option value="ALL">Tür: Tümü</option>
                {types.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>

              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={{ minWidth: 150 }}>
                <option value="ALL">Durum: Tümü</option>
                {statuses.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>

              <button onClick={resetFilters} type="button">Sıfırla</button>

              <button onClick={load} disabled={busy} type="button">
                {busy ? "..." : "Yenile"}
              </button>
            </div>
          </div>

          <div className="muted" style={{ marginTop: 8 }}>
            Gösterilen: <b>{filteredRows.length}</b> / {rows.length}
          </div>
        </div>

        {err ? <div className="card err">Hata: {err}</div> : null}

        <div className="card notifTblCard">
          <div className="notifTblWrap">
            {filteredRows.length === 0 ? (
              <div className="muted">Bildirim yok (veya filtreler her şeyi eledi).</div>
            ) : (
              <table className="notifTbl">
                <colgroup>
                  <col className="colId" />
                  <col className="colType" />
                  <col className="colScope" />
                  <col className="colRegion" />
                  <col className="colAt" />
                  <col className="colTitle" />
                  <col className="colMsg" />
                  <col className="colVehicle" />
                  <col className="colKind" />
                  <col className="colStatus" />
                  <col className="colAge" />
                  <col className="colPayload" />
                </colgroup>

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tür</th>
                    <th>Kapsam</th>
                    <th>Bölge</th>
                    <th>Tarih</th>
                    <th className="hideSm">Başlık</th>
                    <th>Mesaj</th>
                    <th className="hideMd">Araç</th>
                    <th className="hideMd">Kategori</th>
                    <th className="hideSm">Durum</th>
                    <th className="hideMd">Yaş</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.key}>
                      <td className="mono nowrap">{r.id}</td>

                      <td title={r.typeLabel}>
                        <span className="pill pillEllip" data-status={pillKeyFromAny(r.typeLabel)}>
                          {r.typeLabel}
                        </span>
                      </td>

                      <td className="mono nowrap">{r.scope}</td>

                      <td title={r.regionLabel}>
                        <span className="pill pillEllip" data-status={pillKeyFromAny(r.regionLabel)}>
                          {r.regionLabel}
                        </span>
                      </td>

                      <td className="muted mono nowrap" title={r.atRaw}>
                        {r.at}
                      </td>

                      <td className="hideSm ellipsis" title={r.title}>
                        {r.title}
                      </td>

                      <td className="muted clamp2" title={r.message}>
                        {r.message}
                      </td>

                      <td className="hideMd muted mono nowrap">{r.vehicleId || "-"}</td>

                      <td className="hideMd" title={r.kind || "-"}>
                        {r.kind ? (
                          <span className="pill pillEllip" data-status={pillKeyFromAny(r.kind)}>
                            {r.kind}
                          </span>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>

                      <td className="hideSm" title={r.status || "-"}>
                        {r.status ? (
                          <span className="pill pillEllip" data-status={pillKeyFromAny(r.status)}>
                            {r.status}
                          </span>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>

                      <td className="hideMd muted mono nowrap" title={typeof r.ageSec === "number" ? `${r.ageSec}s` : ""}>
                        {fmtAge(r.ageSec)}
                      </td>

                      <td>
                        <button
                          style={{ padding: "6px 10px" }}
                          onClick={() => setSelected(r)}
                          title="Sistem detayını aç"
                          type="button"
                        >
                          Detay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {selected ? (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(900px, 95vw)", maxHeight: "85vh", overflow: "auto" }}
          >
            <div className="topbar" style={{ marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Notification #{selected.id}</h3>
                <div className="muted mono" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  <span className="pill" data-status={pillKeyFromAny(selected.typeLabel)}>{selected.typeLabel}</span>
                  <span className="pill" data-status={pillKeyFromAny(selected.status || "")}>{selected.status || "-"}</span>
                  <span className="mono">{selected.scope}</span>
                  <span className="mono">{selected.regionLabel}</span>
                  <span className="mono">{selected.at}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} type="button">Kapat</button>
            </div>

            <div className="muted" style={{ marginBottom: 8 }}>
              <b>Title:</b> {selected.title || "-"}
            </div>
            <div className="muted" style={{ marginBottom: 12 }}>
              <b>Message:</b> {selected.message || "-"}
            </div>
            <div className="muted" style={{ marginBottom: 12 }}>
              <b>Bölge:</b> {selected.regionLabel || "-"}
            </div>

            <CollapsibleSection
              title="Sistem kanıtı"
              subtitle="Ham bildirim verisi yalnız ikinci katmanda görünür."
              defaultOpen={false}
              compact
            >
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{selected.payloadPretty}</pre>
            </CollapsibleSection>
          </div>
        </div>
      ) : null}
    </div>
  );
}
