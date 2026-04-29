export function buildShiftPeopleTabActions(ctx) {
  const {
    api,
    apiOr404Fallback,
    buildStopSummary,
    clearUiDataCache,
    companyPath,
    computeGeoMeta,
    computeGeoStatus,
    clusterPeople,
    getApiErrorMessage,
    importMode,
    importPeopleToBackendApi,
    loadPeopleFromBackendApi,
    mirrorIds,
    navigate,
    parseCsv,
    parseSheetRowsToPeople,
    people,
    peopleBackend,
    peopleStorageKey,
    savePeopleToBackendApi,
    sanitizeAddress,
    selectedShift,
    selectedShiftId,
    maxWalkM,
    setImportQuickBusy,
    setBusy,
    setDraftStops,
    setErr,
    setImportQuickStats,
    setImportSummary,
    setImportWarnings,
    setInfo,
    setPeople,
    setPeopleBackend,
    setPAddress,
    setPLat,
    setPLng,
    setPName,
    setRowGeocodeBusyId,
    setStopSummary,
    setStopActionBusy,
    setShiftPatchById,
    stripHubStop,
    summarizeWarnings,
    token,
    withHubStop,
    writeGuidedResume,
    writePeopleToStorage,
  } = ctx;

  async function openGuidedGeoPicker(personId = null) {
    const basePath = companyPath(ctx.me, "");
    try {
      if (selectedShiftId && peopleBackend !== "off") {
        const ids = (mirrorIds.length ? mirrorIds : [Number(selectedShiftId || 0)])
          .map((x) => Number(x || 0))
          .filter((x) => Number.isFinite(x) && x > 0);
        for (const sid of ids) {
          await savePeopleToBackendApi(api, token, String(sid), people);
        }
        clearUiDataCache("/api/company/personels");
        setPeopleBackend("on");
      }
    } catch (e) {
      setErr(getApiErrorMessage(e));
    }
    writeGuidedResume({
      basePath,
      step: 2,
      personId: Number(personId || 0) || null,
      source: "shift-people-tab",
    });
    try {
      localStorage.setItem("psv1:georeview:openMode:v1", JSON.stringify({ mode: "SESSION", source: "shift-people-tab", forceRefresh: true, ts: Date.now() }));
    } catch {
      // ignore
    }
    navigate(companyPath(ctx.me, "/georeview"));
  }

  async function generateStopsOnBackend(shiftId, maxWalkMValue) {
    const mw = Number(maxWalkMValue);
    return api(`/api/shifts/${shiftId}/stops/generate?mode=REPLACE&maxWalkM=${encodeURIComponent(String(mw))}`, {
      method: "POST",
      token,
    });
  }

  async function generateStopsBatchOnBackend(shiftIds, maxWalkMValue) {
    const mw = Number(maxWalkMValue);
    const ids = Array.from(new Set((Array.isArray(shiftIds) ? shiftIds : []).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)));
    return api(`/api/shifts/stops/generate-batch`, {
      method: "POST",
      token,
      body: { shiftIds: ids, mode: "REPLACE", maxWalkM: mw },
    });
  }

  async function geocodeHubAddress() {
    setErr("");
    setInfo("");
    const q = sanitizeAddress(ctx.hubAddress);
    if (!q) {
      setErr("Adres gir.");
      return;
    }
    setBusy(true);
    try {
      const r = await api("/api/geocode", { token, method: "POST", body: { q, country: "tr" } });
      setPLat(String(r?.lat ?? ""));
      setPLng(String(r?.lng ?? ""));
      if (typeof r?.lat === "number" && typeof r?.lng === "number") {
        setInfo(`Hub konumu bulundu: ${Number(r.lat).toFixed(6)}, ${Number(r.lng).toFixed(6)}.`);
      } else {
        setInfo("Hub konumu bulundu. Lat/Lng alanlarını kontrol et.");
      }
    } catch (e) {
      const m = e?.payload?.error === "notfound" ? "Geocode başarısız: notfound" : e?.message || String(e);
      setErr(m);
    } finally {
      setBusy(false);
    }
  }

  async function saveHubToShift() {
    setErr("");
    setInfo("");
    const sid = Number(selectedShiftId || 0);
    if (!sid) {
      setErr("Shift seç.");
      return;
    }

    const lat = ctx.normalizeCoord(ctx.hubLat, "lat");
    const lng = ctx.normalizeCoord(ctx.hubLng, "lng");
    if (lat == null || lng == null) {
      setErr("Hub Lat/Lng zorunlu. (Adresten Bul ile doldurabilirsin)");
      return;
    }

    const dir = String(ctx.hubDirection || "INBOUND").toUpperCase();
    setBusy(true);
    try {
      const updated = await api(`/api/shifts/${sid}`, {
        token,
        method: "PUT",
        body: { hubLat: lat, hubLng: lng, direction: dir },
      });

      setShiftPatchById((prev) => ({
        ...(prev || {}),
        [String(sid)]: {
          hubLat: updated?.hubLat ?? lat,
          hubLng: updated?.hubLng ?? lng,
          direction: updated?.direction ?? dir,
        },
      }));

      // Draft durak listesine hub'ı ekle (OUTBOUND: başa, INBOUND: sona)
      const baseStops = stripHubStop(ctx.draftStops);
      const withHub = withHubStop(baseStops, { ...(selectedShift || {}), hubLat: lat, hubLng: lng, direction: dir });
      setDraftStops(withHub);

      setInfo(`Hub kaydedildi. Liste pozisyonu: ${ctx.hubPosLabel}`);
    } catch (e) {
      setErr(String(e?.payload?.message || e?.payload?.error || e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function clearHubOnShift() {
    setErr("");
    setInfo("");
    const sid = Number(selectedShiftId || 0);
    if (!sid) return;
    setBusy(true);
    try {
      await api(`/api/shifts/${sid}`, { token, method: "PUT", body: { hubLat: null, hubLng: null } });
      setShiftPatchById((prev) => ({ ...(prev || {}), [String(sid)]: { ...(prev?.[String(sid)] || {}), hubLat: null, hubLng: null } }));
      setPLat("");
      setPLng("");
      setDraftStops(stripHubStop(ctx.draftStops));
      setInfo("Hub temizlendi.");
    } catch (e) {
      setErr(String(e?.payload?.message || e?.payload?.error || e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function geocodeManualAddress() {
    setErr("");
    setInfo("");

    const q = sanitizeAddress(ctx.pAddress);
    if (!q) {
      setErr("Adres gir.");
      return;
    }

    setBusy(true);
    try {
      const r = await api("/api/geocode", { token, method: "POST", body: { q, country: "tr" } });
      setPLat(String(r?.lat ?? ""));
      setPLng(String(r?.lng ?? ""));
      if (typeof r?.lat === "number" && typeof r?.lng === "number") {
        setInfo(`Konum bulundu: ${Number(r.lat).toFixed(6)}, ${Number(r.lng).toFixed(6)}.`);
      } else {
        setInfo("Konum bulundu. Lat/Lng alanlarını kontrol et.");
      }
    } catch (e) {
      const m = e?.payload?.error === "notfound" ? "Geocode başarısız: notfound" : e?.message || String(e);
      setErr(m);
    } finally {
      setBusy(false);
    }
  }

  function addPersonManual(e) {
    e.preventDefault();
    setErr("");
    setInfo("");

    const name = String(ctx.pName || "").trim();
    const address = String(ctx.pAddress || "").trim();
    const lat = ctx.normalizeCoord(ctx.pLat, "lat");
    const lng = ctx.normalizeCoord(ctx.pLng, "lng");

    if (!name) {
      setErr("Ad Soyad zorunlu.");
      return;
    }
    if ((String(ctx.pLat || "").trim() && lat === null) || (String(ctx.pLng || "").trim() && lng === null)) {
      setErr("Lat/Lng sayı olmalı (opsiyonel). Örn: 37.12345 veya 37,12345");
      return;
    }

    const row = {
      id: `p_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name,
      address,
      lat,
      lng,
      ...computeGeoMeta({ address, lat, lng }),
    };

    setPeople((prev) => [row, ...(prev || [])]);
    setPName("");
    setPAddress("");
    setPLat("");
    setPLng("");
  }

  async function importCsvFile(file) {
    const text = await file.text();
    const rows = parseCsv(text);
    return rows;
  }

  async function importExcelFile(file) {
    // `xlsx` dependency web tarafında kurulu olmalı (npm i xlsx)
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows2d = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    return parseSheetRowsToPeople(rows2d);
  }

  async function parsePeopleFile(file) {
    const name = String(file?.name || "").toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      return importExcelFile(file);
    }
    if (name.endsWith(".csv")) {
      return importCsvFile(file);
    }
    throw new Error("Desteklenen dosyalar: .xlsx, .xls, .csv");
  }

  async function importFile(file) {
    setErr("");
    setInfo("");
    setImportSummary(null);
    setImportWarnings([]);
    setImportQuickStats({ found: 0, notFound: 0, error: 0 });
    if (!file) return;

    try {
      const rows = await parsePeopleFile(file);
      if (!rows.length) {
        setErr("Dosyada okunabilir satır bulunamadı.");
        return;
      }

      const normalizedRows = rows.map((r) => ({
        fullName: String(r.name || "").trim(),
        phone: String(r.phone || "").trim() || null,
        address: String(r.address || "").trim() || null,
        lat: ctx.normalizeCoord(r.lat, "lat"),
        lng: ctx.normalizeCoord(r.lng, "lng"),
      }));

      if (selectedShiftId && peopleBackend !== "off") {
        try {
          const sid = Number(selectedShiftId);
          const ids = mirrorIds.length ? mirrorIds : [sid];
          let firstResp = null;
          await apiOr404Fallback(
            async () => {
              for (const id of ids) {
                const resp = await importPeopleToBackendApi(api, token, String(id), normalizedRows, importMode);
                if (!firstResp) firstResp = resp;
              }
              setPeopleBackend("on");
              return true;
            },
            async () => {
              setPeopleBackend("off");
              return false;
            }
          );

          if (firstResp?.summary) setImportSummary(firstResp.summary);
          const warnings = Array.isArray(firstResp?.warnings) ? firstResp.warnings : [];
          setImportWarnings(warnings);
          const warningCount = warnings.length;
          setInfo(`Import tamamlandı: ${firstResp?.summary?.acceptedRows ?? 0}/${firstResp?.summary?.totalRows ?? normalizedRows.length} satır işlendi${warningCount ? ` • ${warningCount} uyarı` : ""}`);
          const fresh = await loadPeopleFromBackendApi(api, token, String(sid));
          setPeople(fresh);
          return;
        } catch (e) {
          const payload = e?.payload || {};
          if (payload?.summary) setImportSummary(payload.summary);
          const warnings = Array.isArray(payload?.warnings) ? payload.warnings : [];
          setImportWarnings(warnings);
          const first = Array.isArray(payload?.firstErrors) ? payload.firstErrors[0] : null;
          if (first?.rowNo) {
            setErr(`${payload?.error || e?.message || String(e)}${first?.rowNo ? ` (İlk sorun satır ${first.rowNo}: ${first.message})` : ""}`.trim());
          } else {
            setErr(String(payload?.error || e?.message || e));
          }
          return;
        }
      }

      if (!normalizedRows.length) {
        setErr("Dosyada geçerli satır bulunamadı (Ad Soyad zorunlu; adres veya koordinat olmalı).");
        return;
      }

      const mapped = normalizedRows.map((row, idx) => {
        const meta = computeGeoMeta({ address: row.address, lat: row.lat, lng: row.lng });
        return {
          id: `imp_${Date.now()}_${idx}`,
          name: row.fullName,
          address: row.address,
          lat: row.lat,
          lng: row.lng,
          ...meta,
        };
      });

      setPeople((prev) => (importMode === "REPLACE" ? mapped : [...mapped, ...(prev || [])]));
      const localWarnings = [];
      const warnings = summarizeWarnings(localWarnings);
      setImportWarnings(localWarnings);
      setImportSummary({
        totalRows: mapped.length,
        acceptedRows: mapped.length,
        rejectedRows: 0,
        warnings,
      });
      const geoCounts = mapped.reduce((acc, item) => {
        const k = computeGeoStatus(item);
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});
      setInfo(`İçe aktarıldı: ${mapped.length} kayıt (${peopleBackend === "off" ? "yerel mod" : "önizleme"})`);
      void geoCounts;
      writePeopleToStorage(peopleStorageKey, mapped);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    }
  }

  function removePerson(id) {
    setPeople((prev) => (prev || []).filter((p) => p.id !== id));
  }

  function updatePerson(id, patch) {
    setPeople((prev) =>
      (prev || []).map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...patch };
        const meta = computeGeoMeta(next);
        next.geoStatus = meta.geoStatus;
        next.geoReason = meta.geoReason;
        next.geoReasonText = meta.geoReasonText;
        return next;
      })
    );
  }

  async function geocodePersonAddress(id) {
    const target = (ctx.people || []).find((p) => p.id === id);
    if (!target) return;
    const query = sanitizeAddress(target.address || "");
    if (!query) {
      setErr("Adres boş. Önce adresi gir.");
      return;
    }

    setErr("");
    setInfo("");
    setRowGeocodeBusyId(id);
    try {
      const resp = await api(`/api/geocode`, { method: "POST", body: { q: query, country: "tr" }, token });
      const lat = ctx.normalizeCoord(resp?.lat, "lat");
      const lng = ctx.normalizeCoord(resp?.lng, "lng");
      if (typeof lat !== "number" || typeof lng !== "number") {
        throw new Error("Adres için geçerli koordinat bulunamadı.");
      }

      setPeople((prev) =>
        (prev || []).map((p) => {
          if (p.id !== id) return p;
          const next = { ...p, lat, lng };
          const meta = computeGeoMeta(next);
          next.geoStatus = meta.geoStatus;
          next.geoReason = meta.geoReason;
          next.geoReasonText = meta.geoReasonText;
          return next;
        })
      );
      setInfo("Adres bulundu. Koordinatlar satıra işlendi; devam etmeden önce Kaydet ile listeyi kaydet.");
    } catch (e) {
      if (e?.status === 404) {
        setErr("Adresten Bul başarısız: Adres bulunamadı.");
      } else if (e?.status === 400) {
        setErr("Adresten Bul başarısız: Geocode isteği eksik veya hatalı.");
      } else {
        setErr(`Adresten Bul başarısız: ${getApiErrorMessage(e)}`);
      }
    } finally {
      setRowGeocodeBusyId("");
    }
  }

  async function runImportQuickGeocode() {
    const candidates = (ctx.people || []).filter((p) => {
      const reason = String(p?.geoReason || "");
      const hasAddress = Boolean(String(p?.address || "").trim());
      const hasCoords = typeof p?.lat === "number" && typeof p?.lng === "number";
      return hasAddress && !hasCoords && (reason === "ADDRESS_ONLY" || reason === "INVALID_COORD");
    });

    if (!candidates.length) {
      setInfo("Toplu geocode için uygun review kaydı yok.");
      setImportQuickStats({ found: 0, notFound: 0, error: 0 });
      return;
    }

    setImportQuickBusy(true);
    setErr("");
    setInfo("");
    let found = 0;
    let notFound = 0;
    let error = 0;

    let nextPeople = [...(ctx.people || [])];
    for (const item of candidates) {
      const q = sanitizeAddress(item.address || "");
      if (!q) {
        notFound += 1;
        continue;
      }
      try {
        const resp = await api(`/api/geocode`, { method: "POST", body: { q, country: "tr" }, token });
        const lat = ctx.normalizeCoord(resp?.lat, "lat");
        const lng = ctx.normalizeCoord(resp?.lng, "lng");
        if (typeof lat !== "number" || typeof lng !== "number") {
          error += 1;
          continue;
        }
        nextPeople = nextPeople.map((p) => {
          if (p.id !== item.id) return p;
          const next = { ...p, lat, lng };
          const meta = computeGeoMeta(next);
          next.geoStatus = meta.geoStatus;
          next.geoReason = meta.geoReason;
          next.geoReasonText = meta.geoReasonText;
          return next;
        });
        found += 1;
      } catch (e) {
        if (e?.status === 404) notFound += 1;
        else error += 1;
      }
    }

    setPeople(nextPeople);
    setImportQuickStats({ found, notFound, error });
    const remainingReview = nextPeople.filter((p) => p.geoStatus === "NEEDS_REVIEW").length;
    setImportSummary((prev) => (prev ? { ...prev, needsReviewRows: remainingReview } : prev));
    setInfo(`Toplu geocode tamamlandı: bulundu ${found}, bulunamadı ${notFound}, hata ${error}. Değişiklikleri kalıcı yapmak için Kaydet ile listeyi kaydet.`);
    setImportQuickBusy(false);
  }

  async function runStopAction(action) {
    if (ctx.stopActionBusy) return null;
    setStopActionBusy(true);
    try {
      return await action();
    } finally {
      setStopActionBusy(false);
    }
  }

  async function generateDraftStopsInternal() {
    setErr("");
    setInfo("");

    const mw = Number(maxWalkM);
    if (!Number.isFinite(mw) || mw <= 0) {
      setErr("maxWalkM pozitif sayi olmali.");
      return false;
    }

    // Prefer backend: generate + persist stops (wizard Step-4 needs persisted stops)
    // Guided Mode: outbound/inbound taslak shift'lerin hepsine ayni stop setini uret.
    if (selectedShiftId && ctx.peopleBackend !== "off") {
      setBusy(true);
      try {
        const ids = mirrorIds.length ? mirrorIds : [Number(selectedShiftId)];
        const ok = await apiOr404Fallback(
          async () => {
            let firstResp = null;
            if (ids.length > 1) {
              const resp = await generateStopsBatchOnBackend(ids, mw);
              firstResp = resp?.first || (Array.isArray(resp?.items) ? resp.items[0] : null);
            } else {
              firstResp = await generateStopsOnBackend(String(ids[0]), mw);
            }
            const shiftCount = ids.length;
            setDraftStops([]);
            setStopSummary(buildStopSummary({
              base: {
                maxWalkM: mw,
                stopCount: Number(firstResp?.stopCount || 0),
                coveredCount: Number(firstResp?.assignmentCount || 0),
                skippedCount: Number(firstResp?.skippedCount || 0),
                hubApplied: Boolean(firstResp?.hubApplied),
              },
              stopsInput: [],
              peopleInput: ctx.people,
              computeGeoStatus,
            }));
            setInfo(
              shiftCount > 1
                ? `Durak üretimi tamamlandı: ${shiftCount} vardiya için stop üretildi. Sonraki adım: Shiftten Durakları Çek.`
                : `Durak üretimi tamamlandı: ${Number(firstResp?.stopCount || 0)} durak. Sonraki adım: Shiftten Durakları Çek.`
            );
            setPeopleBackend("on");
            return true;
          },
          async () => {
            setPeopleBackend("off");
            return false;
          }
        );

        return Boolean(ok);
      } catch (e) {
        setErr(getApiErrorMessage(e));
        return false;
      } finally {
        setBusy(false);
      }
    }

    // Fallback: UI-only preview (does not persist)
    const stops = clusterPeople(ctx.people, mw);
    const withHub = withHubStop(stops, selectedShift);
    setDraftStops(withHub);
    setStopSummary(buildStopSummary({
      base: { maxWalkM: mw, hubApplied: Boolean(selectedShift?.hubLat && selectedShift?.hubLng) },
      stopsInput: withHub,
      peopleInput: ctx.people,
      computeGeoStatus,
    }));
    setInfo(stops.length ? `Draft durak oluşturuldu: ${stops.length} durak` : "OK koordinatlı kayıt yok - durak oluşturulamadı.");
    return true;
  }

  async function generateDraftStops() {
    return runStopAction(() => generateDraftStopsInternal());
  }

  async function prepareDraftStops() {
    return runStopAction(async () => {
      const ok = await generateDraftStopsInternal();
      if (!ok) return false;
      if (selectedShiftId && ctx.peopleBackend !== "off") {
        await loadShiftStopsFromApiInternal({ quiet: true });
      }
      return true;
    });
  }

  async function loadShiftStopsFromApiInternal(options = {}) {
    const { quiet = false } = options;
    if (!selectedShiftId) return null;
    setBusy(true);
    setErr("");
    setInfo("");
    setImportSummary(null);
    setImportWarnings([]);
    try {
      const sid = Number(selectedShiftId);
      const resp = await api(`/api/shifts/${sid}/stops`, { token });
      const list = Array.isArray(resp) ? resp : resp?.items ?? resp?.stops ?? [];
      const mapped = (list || [])
        .filter((s) => typeof s?.lat === "number" && typeof s?.lng === "number")
        .map((s, i) => ({
          id: String(s.id ?? `api_${i}`),
          title: String(s.title || s.name || `Durak ${i + 1}`),
          lat: s.lat,
          lng: s.lng,
          count: s.assignmentCount ?? null,
          memberIds: [],
        }));
      const withHub = withHubStop(mapped, selectedShift);
      setDraftStops(withHub);
      setStopSummary(buildStopSummary({
        base: {},
        stopsInput: withHub,
        peopleInput: ctx.people,
        computeGeoStatus,
      }));
      setInfo(`Shift durakları yüklendi: ${withHub.length}`);
      return withHub;
    } catch (e) {
      if (!quiet) setErr(`Shift durakları yüklenemedi: ${getApiErrorMessage(e)}`);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function loadShiftStopsFromApi(options = {}) {
    return runStopAction(() => loadShiftStopsFromApiInternal(options));
  }

  return {
    addPersonManual,
    clearHubOnShift,
    generateStopsBatchOnBackend,
    generateStopsOnBackend,
    geocodeHubAddress,
    geocodeManualAddress,
    importCsvFile,
    importExcelFile,
    importFile,
    openGuidedGeoPicker,
    parsePeopleFile,
    saveHubToShift,
    removePerson,
    updatePerson,
    geocodePersonAddress,
    runImportQuickGeocode,
    runStopAction,
    generateDraftStopsInternal,
    generateDraftStops,
    prepareDraftStops,
    loadShiftStopsFromApiInternal,
    loadShiftStopsFromApi,
  };
}
