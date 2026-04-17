export function PlanBuilderHeaderBar({ who, busy, onReload }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div>
        <h3 style={{ marginTop: 0 }}>Plan Builder (Stage-3)</h3>
        <div className="muted">
          Stage-0: kişi sayısı + kapasite → araç sayısı, geohash/cluster → taslak dağıtım. • Stage-1/2: OSRM + solver ile rota önerisi. • Stage-3: cluster bazlı ayrı market teklifi üretimi.
        </div>
      </div>
      <button type="button" onClick={onReload} disabled={busy} title={`${who} listesini yenile`}>
        {busy ? "..." : "Yenile"}
      </button>
    </div>
  );
}

export function PlanBuilderWorkflowSection() {
  return (
    <div className="card" style={{ marginTop: 10 }}>
      <h3 style={{ marginTop: 0 }}>İş Akışı</h3>
      <div className="muted">
        <b>Plan Builder</b>: sade akış <b>Rota önerisi oluştur</b> → <b>Ön izle</b> → <b>Ayrı market teklifi oluştur</b>. Nihai araç/sürücü/kapasite kararı Room tarafında netleşir.
        <br />
        <b>Manuel Talep</b>: tekil talep (istisna / düzeltme).
        <br />
        <b>Shift Tools</b>: shift sonrası personel / durak / konum düzeltme (Adresten Bul).
      </div>
    </div>
  );
}

export function PlanBuilderSummaryParamsSection({
  who,
  stats,
  onlyOk,
  setOnlyOk,
  showAdvanced,
  setShowAdvanced,
  precision,
  setPrecision,
  openShiftToolsGeocode,
}) {
  return (
    <div className="grid" style={{ marginTop: 10 }}>
      <div className="col">
        <div style={{ fontWeight: 800 }}>{who} Özeti</div>
        <div className="muted">
          Toplam: <b>{stats.total}</b> • Hazır: <b>{stats.ok}</b> • İncelenecek: <b>{stats.needs}</b> • Başarısız: <b>{stats.failed}</b> • Konum eksik: <b>{stats.missingLoc}</b>
        </div>
        {stats.needs || stats.failed || stats.missingLoc ? (
          <div className="muted" style={{ marginTop: 6 }}>
            Not: Stage-0 için varsayılan filtre <b>geoStatus=OK</b> ve <b>lat/lng var</b>. Konum kontrolü bitmeden plan doğruluğu düşer.
            <div style={{ marginTop: 8 }}>
              <button type="button" className="btn" onClick={openShiftToolsGeocode}>
                Konumları düzelt (Shift Tools → Adresten Bul)
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="col">
        <div style={{ fontWeight: 800 }}>Parametreler</div>
        <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={onlyOk} onChange={(e) => setOnlyOk(e.target.checked)} />
          Sadece geoStatus=OK
        </label>
        <div className="muted" style={{ marginTop: 6 }}>
          Taslak plan kapasiteye göre bölünmez; sistem konum kümelerine göre taslak grup çıkarır. Nihai araç kapasitesi <b>Room</b> tarafında netleşir.
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="button" className="secondary" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? "Gelişmiş ayarları gizle" : "Gelişmiş ayarları göster"}
          </button>
        </div>

        {showAdvanced ? (
          <div className="grid" style={{ gap: 10, marginTop: 10 }}>
            <div className="col">
              <label className="muted">Konuma göre gruplama hassasiyeti</label>
              <select value={precision} onChange={(e) => setPrecision(e.target.value)}>
                <option value="5">5 (daha geniş)</option>
                <option value="6">6 (öneri)</option>
                <option value="7">7 (daha dar)</option>
                <option value="8">8 (çok dar)</option>
              </select>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PlanBuilderDraftTimingSection({
  baseDate,
  setBaseDate,
  tplKey,
  setTplKey,
  templateOptions,
  range,
  plan,
}) {
  return (
    <div className="grid">
      <div className="col">
        <div style={{ fontWeight: 800 }}>Talep taslağı zamanı</div>
        <div className="grid" style={{ gap: 10 }}>
          <div className="col">
            <label className="muted">Tarih</label>
            <input type="date" value={baseDate} onChange={(e) => setBaseDate(e.target.value)} />
          </div>
          <div className="col">
            <label className="muted">Şablon item</label>
            <select value={tplKey} onChange={(e) => setTplKey(e.target.value)}>
              <option value="">— seç —</option>
              {(templateOptions || []).map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label} ({o.item.startHHMM}–{o.item.endHHMM})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          Önerilen teklif zamanı: Start=<b>{range.startAtLocal || "-"}</b> • End=<b>{range.endAtLocal || "-"}</b>
        </div>
      </div>

      <div className="col">
        <div style={{ fontWeight: 800 }}>Öneri</div>
        <div className="muted">
          Eligible: <b>{plan.total}</b> kişi • Konum kümesi bazlı önerilen market shift: <b>{plan.recommended}</b>
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          Üretilen taslak araç sayısı: <b>{plan.vehicles.length}</b> • Geohash grup sayısı: <b>{plan.groups.length}</b>
        </div>
      </div>
    </div>
  );
}

export function PlanBuilderDraftGroupsSection({
  plan,
  maxWalkM,
  setMaxWalkM,
  autoReorderStops,
  setAutoReorderStops,
  companyDefaultMaxWalkM,
  companyKind,
  mxRes,
  mxBusy,
  solveRes,
  solveBusy,
  previewBusy,
  rowOfferBusy,
  range,
  solveRouteForVehicle,
  openVehiclePreview,
  createMarketOfferForVehicle,
}) {
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>Taslak gruplar ve rota önerisi</div>
      <div className="muted" style={{ marginBottom: 8 }}>
        Bu alan taslak plan ve teklif hazırlığı içindir. <b>Rota önerisi oluştur</b> matrix alma ve çözüm adımını tek akışta yapar. <b>Ön izle</b> stop kümeleri için OSRM+Solver iyileştirmesini uygulayıp modal açar.
      </div>
      <div className="grid" style={{ gap: 10, alignItems: "end", marginBottom: 10 }}>
        <div className="col">
          <label className="muted">Stop üretim maxWalkM (m)</label>
          <input value={maxWalkM} onChange={(e) => setMaxWalkM(e.target.value)} placeholder="250" />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            <button type="button" className="btn sm" onClick={() => setMaxWalkM(String(companyDefaultMaxWalkM))}>
              {companyKind === "SCHOOL" ? "School 50" : "Company 250"}
            </button>
            {companyKind === "SCHOOL" ? null : (
              <button type="button" className="btn sm" onClick={() => setMaxWalkM("50")}>School 50</button>
            )}
          </div>
        </div>
        <div className="col">
          <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
            <input type="checkbox" checked={autoReorderStops} onChange={(e) => setAutoReorderStops(e.target.checked)} />
            Oluşan stop sırasını OSRM+Solver ile iyileştir
          </label>
          <div className="muted">
            Ayrı market teklifi oluşturulduğunda, seçiliyse stop üretimi sonrası OSRM+Solver ile sıralama iyileştirilir.
          </div>
        </div>
      </div>
      {!plan.total ? (
        <div className="muted">Uygun (lat/lng) personel bulunamadı.</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>Kişi</th>
              <th>Geohash grup</th>
              <th>Merkez</th>
              <th>Örnek</th>
              <th>Rota önerisi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {plan.vehicles.map((v, idx) => {
              const c = v.centroid;
              const sample = (v.people || []).slice(0, 6).map((p) => p.fullName).filter(Boolean);
              const mx = mxRes?.[idx];
              const mxIsBusy = !!mxBusy?.[idx];
              const sv = solveRes?.[idx];
              const svIsBusy = !!solveBusy?.[idx];
              const pvIsBusy = !!previewBusy?.[idx];
              return (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td><b>{v.people.length}</b></td>
                  <td className="muted">{v.groupKeys?.size || 0}</td>
                  <td className="muted">{c ? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}` : "-"}</td>
                  <td className="muted" title={(v.people || []).map((p) => p.fullName).join("\n")}>
                    {sample.join(", ")}
                    {(v.people?.length || 0) > sample.length ? " …" : ""}
                  </td>
                  <td className="muted">
                    {mxIsBusy ? (
                      "..."
                    ) : mx?.ok ? (
                      <span title="Ortalama çiftler arası süre/mesafe (yaklaşık)">~{mx.avgMin} dk{mx.avgKm != null ? ` • ~${mx.avgKm} km` : ""}</span>
                    ) : mx ? (
                      <span title={mx.detail || ""}>ERR</span>
                    ) : (
                      "-"
                    )}
                    <div style={{ marginTop: 6 }}>
                      {svIsBusy ? (
                        <span>çözülüyor…</span>
                      ) : sv?.ok ? (
                        <span title={sv.solver === "ortools" ? "OR-Tools" : "Fallback (heuristic)"}>
                          Rota: ~{sv.totalMin ?? "?"} dk{sv.totalKm != null ? ` • ~${sv.totalKm} km` : ""} • {sv.solver}
                        </span>
                      ) : sv ? (
                        <span>VRP ERR</span>
                      ) : null}
                      {sv?.ok && (sv.orderNames?.length || 0) ? (
                        <div className="muted" style={{ marginTop: 4 }} title={(sv.orderNames || []).join("\n")}>
                          {(sv.orderNames || []).slice(0, 6).join(" → ")}
                          {(sv.orderNames?.length || 0) > 6 ? " …" : ""}
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <button type="button" onClick={() => solveRouteForVehicle(v, idx)} disabled={mxIsBusy || svIsBusy || (v.people?.length || 0) < 2}>
                        {mxIsBusy || svIsBusy ? "Oluşturuluyor…" : "Rota önerisi oluştur"}
                      </button>
                    </div>
                    <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>Matrix alma ve çözüm adımı otomatik yapılır.</div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => { void openVehiclePreview(v, idx); }} disabled={pvIsBusy}>
                        {pvIsBusy ? "Hazırlanıyor…" : "Ön izle"}
                      </button>
                      <button
                        type="button"
                        disabled={!range.startAtLocal || !range.endAtLocal || !!rowOfferBusy?.[idx]}
                        onClick={() => createMarketOfferForVehicle(v, idx)}
                      >
                        {rowOfferBusy?.[idx] ? "Oluşturuluyor…" : "Ayrı market teklifi oluştur"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function PlanBuilderBulkOfferModal({ bulkOffer, setBulkOffer, pbRooms, pbRoomsBusy, sendBulkOffers }) {
  if (!bulkOffer.open) return null;
  const filteredRooms = (pbRooms || []).filter((r) => {
    const q = String(bulkOffer.q || "").trim().toLowerCase();
    if (!q) return true;
    return String(r?.name || "").toLowerCase().includes(q);
  });
  return (
    <div className="modal-backdrop">
      <div className="modal card" style={{ maxWidth: 900 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4 }}>Toplu Teklif Gönder</h3>
            <div className="muted">Oluşturulan shift’lere toplu teklif gönder: <b>#{bulkOffer.shiftIds.join(", #")}</b></div>
          </div>
          <button type="button" className="secondary" onClick={() => setBulkOffer((p) => ({ ...p, open: false }))} disabled={bulkOffer.busy}>Kapat</button>
        </div>

        <div className="row" style={{ gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <div className="col" style={{ minWidth: 260 }}>
            <label className="muted">Room ara</label>
            <input value={bulkOffer.q} onChange={(e) => setBulkOffer((p) => ({ ...p, q: e.target.value }))} placeholder="name contains" disabled={bulkOffer.busy} />
            <div className="muted" style={{ marginTop: 8 }}>{pbRoomsBusy ? "Room listesi yükleniyor..." : `Toplam room: ${pbRooms?.length ?? 0}`}</div>
          </div>

          <div className="col" style={{ minWidth: 160 }}>
            <label className="muted">Tutar (opsiyonel)</label>
            <input
              value={bulkOffer.amountCompany}
              onChange={(e) => setBulkOffer((p) => ({ ...p, amountCompany: (() => { const n = Number(e.target.value); return Number.isFinite(n) && n > 0 ? n : undefined; })() }))}
              placeholder="örn. 2500"
              disabled={bulkOffer.busy}
            />
          </div>

          <div className="col" style={{ minWidth: 260 }}>
            <label className="muted">Not (opsiyonel)</label>
            <input
              value={bulkOffer.noteCompany}
              onChange={(e) => setBulkOffer((p) => ({ ...p, noteCompany: (() => { const v = e.target.value; return v == null ? "" : String(v); })() }))}
              placeholder="örn. sabah giriş"
              disabled={bulkOffer.busy}
            />
          </div>
        </div>

        <div className="card" style={{ marginTop: 12, maxHeight: 320, overflow: "auto" }}>
          {filteredRooms.map((r) => (
            <label key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 4px" }}>
              <input
                type="checkbox"
                checked={!!bulkOffer.roomsSel?.[r.id]}
                onChange={(e) => setBulkOffer((p) => ({ ...p, roomsSel: { ...(p.roomsSel || {}), [r.id]: e.target.checked } }))}
                disabled={bulkOffer.busy}
              />
              <span>{r?.name} <span className="muted">#{r.id}</span></span>
              {r?.hasHub ? <span className="pill ok">HUB</span> : null}
            </label>
          ))}
          {!pbRooms?.length ? <div className="muted">Room listesi boş.</div> : null}
        </div>

        {bulkOffer.err ? <div className="err" style={{ marginTop: 10 }}>{bulkOffer.err}</div> : null}
        {bulkOffer.done ? <div className="ok" style={{ marginTop: 10 }}>Gönderildi ✅ (shift sayısı: {bulkOffer.sent})</div> : null}

        <div className="row" style={{ justifyContent: "end", marginTop: 12, gap: 8 }}>
          <button type="button" className="secondary" onClick={() => setBulkOffer((p) => ({ ...p, roomsSel: {} }))} disabled={bulkOffer.busy}>Temizle</button>
          <button type="button" onClick={sendBulkOffers} disabled={bulkOffer.busy}>{bulkOffer.busy ? "Gönderiliyor..." : "Toplu Teklifleri Gönder"}</button>
        </div>
      </div>
    </div>
  );
}
