import ShiftPersonelTable from "../../components/ShiftPersonelTable";

export function ShiftPeopleSummarySection({
  busy,
  selectedShiftId,
  setSelectedShiftId,
  shiftOptions,
  maxWalkM,
  setMaxWalkM,
  companyKind,
  stopActionBusy,
  onPrepareDraftStops,
  onGenerateDraftStops,
  onLoadShiftStops,
  onOpenPreview,
  roomText,
  who,
  geoStats,
  hideGeoReviewLinks,
  onOpenGuidedGeoPicker,
  geoReviewPath,
  draftStopsLength,
  stopSummary,
  maxWalkMValue,
  whoPlural,
}) {
  return (
    <div className="card" style={{ margin: 0 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <div style={{ minWidth: 280, flex: 1 }}>
          <label className="muted">Vardiya</label>
          <select value={String(selectedShiftId || "")} onChange={(e) => setSelectedShiftId(e.target.value)} disabled={busy}>
            {shiftOptions.map((s) => (
              <option key={s.id} value={String(s.id)}>
                #{s.id} • {String(s.status)} • Oda {s.roomId} • {new Date(s.startAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 140 }}>
          <label className="muted">Yürüme sınırı (m)</label>
          <input type="number" value={maxWalkM} onChange={(e) => setMaxWalkM(e.target.value)} disabled={busy} />
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn" disabled={busy} onClick={() => setMaxWalkM(String(companyKind === "SCHOOL" ? 50 : 250))}>
            {companyKind === "SCHOOL" ? "Okul 50" : "Şirket 250"}
          </button>
          {companyKind === "SCHOOL" ? null : (
            <button type="button" className="btn" disabled={busy} onClick={() => setMaxWalkM("50")}>Okul 50</button>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            disabled={busy || stopActionBusy || !selectedShiftId}
            onClick={onPrepareDraftStops}
            title="Önce durak üretir, sonra vardiya duraklarını alır"
          >
            {stopActionBusy ? "Hazırlanıyor..." : "Durakları Hazırla"}
          </button>

          <button type="button" className="btn sm" disabled={busy || stopActionBusy || !selectedShiftId} onClick={onGenerateDraftStops}>
            1. Durak Üret
          </button>

          <button type="button" className="btn sm" disabled={busy || stopActionBusy || !selectedShiftId} onClick={() => onLoadShiftStops({ quiet: false })}>
            2. Vardiyadan Durakları Çek
          </button>

          <button type="button" disabled={busy || stopActionBusy || !selectedShiftId} onClick={onOpenPreview}>
            Önizle
          </button>
        </div>
      </div>

      <div className="muted" style={{ marginTop: 10 }}>
        <b>Oda:</b> {roomText}
      </div>

      <div className="muted" style={{ marginTop: 6 }}>
        <b>{who}:</b> {geoStats.total} • Hazır: {geoStats.ok} • İncelenecek: {geoStats.review} • Başarısız: {geoStats.failed}
        {geoStats.review > 0 || geoStats.failed > 0 ? (
          <span style={{ marginLeft: 10 }}>
            {hideGeoReviewLinks ? (
              <button type="button" className="btn sm" onClick={() => onOpenGuidedGeoPicker(null)}>Konum seçiciye git</button>
            ) : (
              <a href={"#" + geoReviewPath}>Konum seçiciye git</a>
            )}
          </span>
        ) : null}
      </div>

      <div className="muted" style={{ marginTop: 6 }}>
        <b>Taslak durak:</b> {draftStopsLength}
      </div>

      {stopSummary ? (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="muted"><b>Durak üretim özeti</b></div>
          <div className="muted" style={{ marginTop: 6 }}>
            Yürüme sınırı: <b>{stopSummary.maxWalkM ?? maxWalkMValue}</b> • Durak (toplanma konumu hariç): <b>{stopSummary.stopCountWithoutHub ?? stopSummary.stopCount}</b> • Durak (toplanma konumu dahil): <b>{stopSummary.stopCountWithHub ?? stopSummary.stopCount}</b>
          </div>
          <div className="muted" style={{ marginTop: 4 }}>
            Toplam kişi: <b>{stopSummary.totalPeople}</b> • Kapsanan: <b>{stopSummary.coveredCount}</b> • Tekil: <b>{stopSummary.singletonCount}</b> • İncelenecek: <b>{stopSummary.reviewCount}</b> • Dışarıda/atlanan: <b>{stopSummary.skippedCount}</b>
            {stopSummary.hubApplied ? <span> • Toplanma konumu uygulandı</span> : null}
          </div>
          {(stopSummary.stopCountWithHub ?? stopSummary.stopCount) !== (stopSummary.stopCountWithoutHub ?? stopSummary.stopCount) ? (
            <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
              Toplanma konumu sayıya ayrı eklenir: preview ve draft sayaçlarında toplanma konumu dahil sayı bir fazla görünebilir.
            </div>
          ) : null}
          {Array.isArray(stopSummary.stopLoads) && stopSummary.stopLoads.length ? (
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              {stopSummary.stopLoads.slice(0, 8).map((s) => `${s.title}: ${s.count}`).join(" • ")}
              {stopSummary.stopLoads.length > 8 ? " • ..." : ""}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
        Önerilen sıra: <b>Durakları Hazırla</b> kullan. Gerekirse adımları ayrı ayrı da çalıştırabilirsin: <b>1. Durak Üret</b> → <b>2. Vardiyadan Durakları Çek</b>. Üretim yalnızca koordinatı olan {whoPlural.toLowerCase()} kayıtlarda çalışır.
        {stopActionBusy ? <span> İşlem sürerken butonlar geçici olarak kilitlenir.</span> : null}
      </div>
    </div>
  );
}

export function ShiftPeopleHubSection({
  busy,
  hubDirection,
  setHubDirection,
  hubAddress,
  setHubAddress,
  onGeocodeHubAddress,
  hubLat,
  setHubLat,
  hubLng,
  setHubLng,
  selectedShiftId,
  onSaveHubToShift,
  onClearHubOnShift,
  hubPosLabel,
  selectedShift,
}) {
  return (
        <div className="card" style={{ margin: 0 }}>
      <h3 style={{ marginTop: 0 }}>Vardiya Toplanma / Dağıtım Konumu</h3>
      <div className="muted" style={{ marginTop: -6 }}>
        Gidiş yönünde toplanma konumu <b>son durak</b> olur. Dönüş yönünde toplanma konumu <b>1. durak</b> olur.
      </div>

      <div className="grid" style={{ marginTop: 8 }}>
        <div className="col">
          <label className="muted">Yön</label>
          <select value={hubDirection} onChange={(e) => setHubDirection(e.target.value)} disabled={busy}>
            <option value="INBOUND">Toplama → Toplanma Konumu</option>
            <option value="OUTBOUND">Toplanma Konumu → Dağıtım</option>
          </select>
        </div>

        <div className="col" style={{ gridColumn: "1 / -1" }}>
          <label className="muted">Adres</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={hubAddress}
              onChange={(e) => setHubAddress(e.target.value)}
            placeholder="örn. Fabrika / Ofis / Toplanma konumu"
              disabled={busy}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn sm" onClick={onGeocodeHubAddress} disabled={busy || !String(hubAddress || "").trim()}>
              Adresten Bul
            </button>
          </div>
        </div>

        <div className="col">
          <label className="muted">Toplanma konumu enlem</label>
          <input value={hubLat} onChange={(e) => setHubLat(e.target.value)} placeholder="41.0..." disabled={busy} />
        </div>
        <div className="col">
          <label className="muted">Toplanma konumu boylam</label>
          <input value={hubLng} onChange={(e) => setHubLng(e.target.value)} placeholder="29.0..." disabled={busy} />
        </div>

        <div className="col" style={{ justifyContent: "end", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" disabled={busy || !selectedShiftId} onClick={onSaveHubToShift}>
            Kaydet
          </button>
          <button type="button" className="btn" disabled={busy || (!hubLat && !hubLng)} onClick={onClearHubOnShift}>
            Temizle
          </button>
        </div>
      </div>

      <div className="muted" style={{ marginTop: 8 }}>
        <b>Liste pozisyonu:</b> {hubPosLabel}
        {selectedShift?.hubLat != null && selectedShift?.hubLng != null ? (
          <span style={{ marginLeft: 10 }}>
            <b>Mevcut Toplanma Konumu:</b> {Number(selectedShift.hubLat).toFixed(6)}, {Number(selectedShift.hubLng).toFixed(6)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ShiftPeopleImportSection({
  who,
  busy,
  pName,
  setPName,
  pAddress,
  setPAddress,
  pLat,
  setPLat,
  pLng,
  setPLng,
  onAddPersonManual,
  onGeocodeManualAddress,
  importMode,
  setImportMode,
  onImportFile,
  importSummary,
  hideGeoReviewLinks,
  geoReviewPath,
  onOpenGuidedGeoPicker,
  onRunImportQuickGeocode,
  importQuickBusy,
  importQuickStats,
  importWarnings,
  importWarningSummary,
  warningLabel,
}) {
  return (
    <div className="card" style={{ margin: 0 }}>
      <h3 style={{ marginTop: 0 }}>{who} Ekle / İçe aktar</h3>

      <form onSubmit={onAddPersonManual} className="grid">
        <div className="col">
          <label className="muted">Ad Soyad</label>
          <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="örn. Ali Veli" disabled={busy} />
        </div>
        <div className="col" style={{ gridColumn: "1 / -1" }}>
          <label className="muted">Adres</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={pAddress}
              onChange={(e) => setPAddress(e.target.value)}
              placeholder="örn. Mahalle / Sokak / İlçe"
              disabled={busy}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn sm" onClick={onGeocodeManualAddress} disabled={busy || !String(pAddress || "").trim()}>
              Adresten Bul
            </button>
          </div>
        </div>
        <div className="col">
          <label className="muted">Enlem (ops.)</label>
          <input value={pLat} onChange={(e) => setPLat(e.target.value)} placeholder="41.0..." disabled={busy} />
        </div>
        <div className="col">
          <label className="muted">Boylam (ops.)</label>
          <input value={pLng} onChange={(e) => setPLng(e.target.value)} placeholder="29.0..." disabled={busy} />
        </div>

        <div className="col" style={{ justifyContent: "end" }}>
          <button type="submit" disabled={busy}>
            Ekle
          </button>
        </div>
      </form>

      <div className="card" style={{ marginTop: 10 }}>
        <div className="muted">
          <b>Excel/CSV içe aktarma</b> — kolonlar: <code>ad,adres,enlem,boylam</code> (header opsiyonel)
          <div style={{ marginTop: 6, fontSize: 12 }}>
            Excel başlıkları (TR) da olur: <code>ad / ad soyad / adres / enlem / boylam</code>. Dosyada telefon kolonu olsa bile bu adımda kullanılmaz.
          </div>
          <div style={{ marginTop: 6, fontSize: 12 }}>
            Kural: <b>Ad Soyad</b> zorunlu; ayrıca <b>adres</b> veya birlikte <b>enlem/boylam</b> olmalı.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap", marginTop: 8 }}>
          <div style={{ minWidth: 220 }}>
            <label className="muted">İçe aktarma modu</label>
            <select value={importMode} onChange={(e) => setImportMode(e.target.value)} disabled={busy}>
              <option value="REPLACE">Değiştir — mevcut listeyi yenile</option>
              <option value="MERGE">Birleştir — mevcut listeyi koru, yenileri ekle</option>
            </select>
          </div>
        </div>

        <input
          type="file"
          accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          disabled={busy}
          onChange={(e) => onImportFile(e.target.files?.[0])}
          style={{ marginTop: 8 }}
        />

        {importSummary ? (
          <div className="card" style={{ marginTop: 10 }}>
            <div className="muted"><b>İçe aktarma özeti</b></div>
            <div className="muted" style={{ marginTop: 6 }}>
              Toplam: {importSummary.totalRows} • Kabul: {importSummary.acceptedRows} • Vardiyaya bağlanan: {importSummary.linkedToShift}
            </div>
            <div className="muted" style={{ marginTop: 4 }}>
              Oluşan: {importSummary.createdPersonels} • Güncellenen: {importSummary.updatedPersonels} • İncelenecek: {importSummary.needsReviewRows}
            </div>
            <div className="muted" style={{ marginTop: 4 }}>
              Atlanan: {importSummary.skippedRows} • Hatalı: {importSummary.failedRows}
            </div>
            {importSummary.needsReviewRows > 0 ? (
              <>
                <div className="muted" style={{ marginTop: 6 }}>
                  {hideGeoReviewLinks ? (
                    <>Rehberli Mod'da tek tıkla konum seçiciye geçebilir, işi bitirince aynı adıma geri dönebilirsin. İstersen burada satır bazlı da düzeltebilirsin.</>
                  ) : (
                    <>Konum kontrolü gerektiren kayıtlar için <a href={"#" + geoReviewPath}>Konum seçici</a> ekranını kullan.</>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {hideGeoReviewLinks ? (
                    <button type="button" className="btn" onClick={() => onOpenGuidedGeoPicker(null)}>Konum seçiciye git</button>
                  ) : <a className="btn" href={"#" + geoReviewPath}>Konum seçiciye git</a>}
                  <button type="button" className="btn" onClick={onRunImportQuickGeocode} disabled={importQuickBusy || busy}>
                    {importQuickBusy ? "Çalışıyor..." : "İncelenecek kayıtları topluca bul"}
                  </button>
                </div>
                <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                  Hızlı toplu bulma sadece <b>Adres var, koordinat yok</b> ve <b>Koordinat eksik/geçersiz</b> kayıtları dener.
                </div>
                {(importQuickStats.found || importQuickStats.notFound || importQuickStats.error) ? (
                  <div className="muted" style={{ marginTop: 6 }}>
                    Bulundu: <b>{importQuickStats.found}</b> • Bulunamadı: <b>{importQuickStats.notFound}</b> • Hata: <b>{importQuickStats.error}</b>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}

        {importWarnings?.length ? (
          <div className="card" style={{ marginTop: 10 }}>
            <div className="muted"><b>İçe aktarma uyarıları</b> — {importWarnings.length} kayıt</div>
            <div className="muted" style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {importWarningSummary.map((item) => (
                <span key={item.code} className="badge">{warningLabel(item.code)}: {item.count}</span>
              ))}
            </div>
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {importWarnings.slice(0, 12).map((w, idx) => (
                <div key={`${w.code || "warn"}-${w.rowNo || idx}-${idx}`} className="muted" style={{ fontSize: 12 }}>
                  <b>Satır {w.rowNo || "?"}</b> • {warningLabel(w.code)} — {w.message}
                </div>
              ))}
            </div>
            {importWarnings.length > 12 ? (
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                İlk 12 uyarı gösteriliyor. Daha fazla satır uyarısı backend summary/warnings içinde mevcut.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ShiftPeopleOverviewSection({
  err,
  info,
  busy,
  selectedShiftId,
  setSelectedShiftId,
  shiftOptions,
  maxWalkM,
  setMaxWalkM,
  companyKind,
  stopActionBusy,
  onPrepareDraftStops,
  onGenerateDraftStops,
  onLoadShiftStops,
  onOpenPreview,
  roomText,
  who,
  whoPlural,
  geoStats,
  hideGeoReviewLinks,
  onOpenGuidedGeoPicker,
  geoReviewPath,
  draftStopsLength,
  stopSummary,
  hubDirection,
  setHubDirection,
  hubAddress,
  setHubAddress,
  onGeocodeHubAddress,
  hubLat,
  setHubLat,
  hubLng,
  setHubLng,
  onSaveHubToShift,
  onClearHubOnShift,
  hubPosLabel,
  selectedShift,
  pName,
  setPName,
  pAddress,
  setPAddress,
  pLat,
  setPLat,
  pLng,
  setPLng,
  onAddPersonManual,
  onGeocodeManualAddress,
  importMode,
  setImportMode,
  onImportFile,
  importSummary,
  onRunImportQuickGeocode,
  importQuickBusy,
  importQuickStats,
  importWarnings,
  importWarningSummary,
  warningLabel,
}) {
  return (
    <>
      <h3>Vardiya araçları</h3>
      <div className="muted">
        Vardiya bazlı araçlar: kişi ekle/içe aktar → durak üret → vardiya duraklarını al → rota/durak önizleme. “Durakları Hazırla” bu iki adımı sırayla çalıştırır.
      </div>

      {err ? (
        <div className="card err" style={{ marginTop: 10 }}>
          {err}
        </div>
      ) : null}
      {info ? (
        <div className="card" style={{ marginTop: 10 }}>
          {info}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start", marginTop: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ShiftPeopleSummarySection
            busy={busy}
            selectedShiftId={selectedShiftId}
            setSelectedShiftId={setSelectedShiftId}
            shiftOptions={shiftOptions}
            maxWalkM={maxWalkM}
            setMaxWalkM={setMaxWalkM}
            companyKind={companyKind}
            stopActionBusy={stopActionBusy}
            onPrepareDraftStops={onPrepareDraftStops}
            onGenerateDraftStops={onGenerateDraftStops}
            onLoadShiftStops={onLoadShiftStops}
            onOpenPreview={onOpenPreview}
            roomText={roomText}
            who={who}
            geoStats={geoStats}
            hideGeoReviewLinks={hideGeoReviewLinks}
            onOpenGuidedGeoPicker={onOpenGuidedGeoPicker}
            geoReviewPath={geoReviewPath}
            draftStopsLength={draftStopsLength}
            stopSummary={stopSummary}
            maxWalkMValue={maxWalkM}
            whoPlural={whoPlural}
          />

          <ShiftPeopleHubSection
            busy={busy}
            hubDirection={hubDirection}
            setHubDirection={setHubDirection}
            hubAddress={hubAddress}
            setHubAddress={setHubAddress}
            onGeocodeHubAddress={onGeocodeHubAddress}
            hubLat={hubLat}
            setHubLat={setHubLat}
            hubLng={hubLng}
            setHubLng={setHubLng}
            selectedShiftId={selectedShiftId}
            onSaveHubToShift={onSaveHubToShift}
            onClearHubOnShift={onClearHubOnShift}
            hubPosLabel={hubPosLabel}
            selectedShift={selectedShift}
          />
        </div>

        <ShiftPeopleImportSection
          who={who}
          whoPlural={whoPlural}
          busy={busy}
          pName={pName}
          setPName={setPName}
          pAddress={pAddress}
          setPAddress={setPAddress}
          pLat={pLat}
          setPLat={setPLat}
          pLng={pLng}
          setPLng={setPLng}
          onAddPersonManual={onAddPersonManual}
          onGeocodeManualAddress={onGeocodeManualAddress}
          importMode={importMode}
          setImportMode={setImportMode}
          onImportFile={onImportFile}
          importSummary={importSummary}
          hideGeoReviewLinks={hideGeoReviewLinks}
          geoReviewPath={geoReviewPath}
          onOpenGuidedGeoPicker={onOpenGuidedGeoPicker}
          onRunImportQuickGeocode={onRunImportQuickGeocode}
          importQuickBusy={importQuickBusy}
          importQuickStats={importQuickStats}
          importWarnings={importWarnings}
          importWarningSummary={importWarningSummary}
          warningLabel={warningLabel}
        />
      </div>
    </>
  );
}

export function ShiftPeopleListSection({
  who,
  people,
  onRemove,
  onUpdate,
  onGeocodeAddress,
  onOpenGeoPicker,
  geocodeBusyId,
}) {
  return (
    <div className="card" style={{ marginTop: 12, overflowX: "auto" }}>
      <h3 style={{ marginTop: 0 }}>Vardiya {who} listesi</h3>
      <ShiftPersonelTable
        people={people}
        onRemove={onRemove}
        onUpdate={onUpdate}
        onGeocodeAddress={onGeocodeAddress}
        onOpenGeoPicker={onOpenGeoPicker}
        geocodeBusyId={geocodeBusyId}
        emptyLabel={`Henüz ${who.toLowerCase()} yok.`}
      />
    </div>
  );
}
