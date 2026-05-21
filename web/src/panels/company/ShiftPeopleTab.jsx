
const normalizeCoord = (value) => {
  const n = safeNum(value);
  return Number.isFinite(n) ? n : null;
};
// web/src/panels/company/ShiftPeopleTab.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { apiOr404Fallback } from "../../utils/apiFallback";
import { personLabel, peopleLabel } from "../../utils/labels";
import { companyPath } from "../../utils/paths";
import { navigate } from "../../router";
import RoutePreviewModal from "../../components/RoutePreviewModal";
import { clearUiDataCache } from "../../utils/uiDataCache";
import { buildShiftPeopleTabActions } from "./shiftPeopleTabActions";

import { getApiErrorMessage } from "../../utils/apiContract";
import {
  writeGuidedResume,
  parseCsv,
  parseSheetRowsToPeople,
  sanitizeAddress,
  safeNum,
  computeGeoMeta,
  computeGeoStatus,
  clusterPeople,
  summarizeWarnings,
  warningLabel,
  stripHubStop,
  withHubStop,
  buildStopSummary,
  readPeopleFromStorage,
  writePeopleToStorage,
  loadPeopleFromBackend as loadPeopleFromBackendApi,
  savePeopleToBackend as savePeopleToBackendApi,
  importPeopleToBackend as importPeopleToBackendApi,
} from "./shiftPeopleTabUtils";
import {
  ShiftPeopleSummarySection,
  ShiftPeopleHubSection,
  ShiftPeopleImportSection,
  ShiftPeopleOverviewSection,
  ShiftPeopleListSection,
} from "./shiftPeopleTabSections";

export default function ShiftPeopleTab({ token, me, shifts, roomsById, mirrorShiftIds, preferredShiftId, guidedMode = false, hideGeoReviewLinks = false, onSummaryChange = null }) {
  const who = personLabel(me);
  const whoPlural = peopleLabel(me);
  const companyKey = String(me?.companyId ?? me?.id ?? "unknown");

  async function openGuidedGeoPicker(personId = null) {
    const basePath = companyPath(me, "");
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
    navigate(companyPath(me, "/georeview"));
  }

  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [maxWalkM, setMaxWalkM] = useState(me?.companyKind === "SCHOOL" ? 50 : 250);

  // M51.B: Shift Toplanma Konumu (Toplanma/Dağıtım)
  const [hubDirection, setHubDirection] = useState("INBOUND");
  const [hubAddress, setHubAddress] = useState("");
  const [hubLat, setHubLat] = useState("");
  const [hubLng, setHubLng] = useState("");

  // manual add form
  const [pName, setPName] = useState("");
  const [pAddress, setPAddress] = useState("");
  const [pLat, setPLat] = useState("");
  const [pLng, setPLng] = useState("");

  const [people, setPeople] = useState([]);
  const [draftStops, setDraftStops] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [stopSummary, setStopSummary] = useState(null);

  const [busy, setBusy] = useState(false);
  const [stopActionBusy, setStopActionBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [importMode, setImportMode] = useState("REPLACE");
  const [importSummary, setImportSummary] = useState(null);
  const [importWarnings, setImportWarnings] = useState([]);
  const [rowGeocodeBusyId, setRowGeocodeBusyId] = useState("");
  const [importQuickBusy, setImportQuickBusy] = useState(false);
  const [importQuickStats, setImportQuickStats] = useState({ found: 0, notFound: 0, error: 0 });

  // M16.2 soft-switch: backend varsa kullan; endpoint yoksa (404) localStorage fallback
  const [peopleBackend, setPeopleBackend] = useState("unknown"); // unknown | on | off
  const [shiftPatchById, setShiftPatchById] = useState({});

  const shiftOptions = useMemo(() => {
    const list = Array.isArray(shifts) ? shifts : [];
    const sorted = [...list].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
    return sorted;
  }, [shifts]);
  const validShiftIdSet = useMemo(() => new Set(shiftOptions.map((s) => Number(s?.id || 0)).filter((x) => Number.isFinite(x) && x > 0)), [shiftOptions]);


  const selectedShiftBase = useMemo(() => {
    const sid = Number(selectedShiftId || 0);
    return shiftOptions.find((s) => Number(s.id) === sid) || null;
  }, [shiftOptions, selectedShiftId]);

  const selectedShift = useMemo(() => {
    if (!selectedShiftBase) return null;
    const key = String(selectedShiftBase.id);
    const patch = shiftPatchById?.[key];
    return patch ? { ...selectedShiftBase, ...patch } : selectedShiftBase;
  }, [selectedShiftBase, shiftPatchById]);

  // Guided Mode: aynı personel/stop setini birden fazla taslak shift'e aynala
  const mirrorIds = useMemo(() => {
    const base = Array.isArray(mirrorShiftIds) ? mirrorShiftIds : [];
    const ids = [Number(selectedShiftId || 0), ...base.map((x) => Number(x || 0))]
      .filter((x) => Number.isFinite(x) && x > 0);
    return Array.from(new Set(ids));
  }, [mirrorShiftIds, selectedShiftId]);

  const peopleStorageKey = useMemo(() => {
    const sid = String(selectedShiftId || "");
    return `psv1:company:${companyKey}:shift:${sid}:people:v1`;
  }, [companyKey, selectedShiftId]);

  // init selected shift
  useEffect(() => {
    const pid = Number(preferredShiftId || 0);
    if (!pid) return;
    if (!shiftOptions?.length) return;

    const exists = shiftOptions.some((s) => Number(s.id) === pid);
    if (!exists) return;

    // Kullanıcı elle başka shift seçmediyse otomatik seç
    setSelectedShiftId((cur) => (cur ? cur : String(pid)));
  }, [preferredShiftId, shiftOptions]);

  useEffect(() => {
    if (selectedShiftId) return;
    if (shiftOptions.length) setSelectedShiftId(String(shiftOptions[0].id));
  }, [shiftOptions, selectedShiftId]);

  useEffect(() => {
    if (!selectedShiftId) return;
    const sid = Number(selectedShiftId || 0);
    if (validShiftIdSet.has(sid)) return;
    setSelectedShiftId(shiftOptions.length ? String(shiftOptions[0].id) : "");
  }, [selectedShiftId, shiftOptions, validShiftIdSet]);

  // load people on shift change (backend first; 404 => localStorage fallback)
  useEffect(() => {
    if (!selectedShiftId) return;
    if (!validShiftIdSet.has(Number(selectedShiftId || 0))) return;

    let alive = true;
    setBusy(true);
    setErr("");
    setInfo("");
    setImportSummary(null);
    setImportWarnings([]);
    setStopSummary(null);
    setImportQuickStats({ found: 0, notFound: 0, error: 0 });

    const sid = String(selectedShiftId);

    (async () => {
      try {
        const list = await apiOr404Fallback(
          async () => {
            const data = await loadPeopleFromBackendApi(api, token, sid);
            setPeopleBackend("on");
            return data;
          },
          async () => {
            setPeopleBackend("off");
            return readPeopleFromStorage(peopleStorageKey);
          }
        );

        if (!alive) return;
        setPeople(list);
        setDraftStops([]);
        setInfo("");
      } catch (e) {
        if (!alive) return;
        setErr(getApiErrorMessage(e));
        setPeople(readPeopleFromStorage(peopleStorageKey));
      } finally {
        if (alive) setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [peopleStorageKey, selectedShiftId, validShiftIdSet, token]);

  // keep localStorage in sync + (soft) persist to backend
  useEffect(() => {
    if (!selectedShiftId) return;
    if (!validShiftIdSet.has(Number(selectedShiftId || 0))) return;

    // always keep local fallback updated
    writePeopleToStorage(peopleStorageKey, people);

    // debounce backend save; only if backend not known as missing
    if (peopleBackend === "off") return;

    const sid = String(selectedShiftId);
    const t = setTimeout(async () => {
      try {
        await apiOr404Fallback(
          async () => {
            // Guided Mode: aynı listeyi taslak shift'lerin hepsine yaz
            const ids = (mirrorIds.length ? mirrorIds : [Number(sid)]).filter((id) => validShiftIdSet.has(Number(id || 0)));
            if (!ids.length) return false;
            for (const id of ids) {
              await savePeopleToBackendApi(api, token, String(id), people);
            }
            setPeopleBackend("on");
            return true;
          },
          async () => {
            setPeopleBackend("off");
            return false;
          }
        );
      } catch (e) {
        if (Number(e?.status || 0) === 404) {
          setPeopleBackend("off");
          return;
        }
        // Do not overwrite UI; just show error
        setErr(getApiErrorMessage(e));
      }
    }, 500);

    return () => clearTimeout(t);
  }, [people, selectedShiftId, peopleBackend, mirrorIds, validShiftIdSet, peopleStorageKey, token]);

  const geoStats = useMemo(() => {
    let ok = 0,
      review = 0,
      failed = 0;
    for (const p of people) {
      const st = p.geoStatus || computeGeoStatus(p);
      if (st === "OK") ok++;
      else if (st === "NEEDS_REVIEW") review++;
      else failed++;
    }
    return { ok, review, failed, total: people.length };
  }, [people]);

  useEffect(() => {
    if (typeof onSummaryChange !== "function") return;
    onSummaryChange({
      selectedShiftId: Number(selectedShiftId || 0) || null,
      geoStats,
      stopSummary,
      blocking: Number(geoStats.review || 0) > 0 || Number(geoStats.failed || 0) > 0,
      ready: Number(geoStats.review || 0) === 0 && Number(geoStats.failed || 0) === 0,
    });
  }, [onSummaryChange, selectedShiftId, geoStats, stopSummary]);

  // M51.B: selected shift değişince toplanma konumu formunu doldur
  useEffect(() => {
    if (!selectedShift) return;
    const dir = String(selectedShift?.direction || "INBOUND").toUpperCase();
    setHubDirection(dir === "OUTBOUND" ? "OUTBOUND" : "INBOUND");
    setHubLat(typeof selectedShift?.hubLat === "number" ? String(selectedShift.hubLat) : "");
    setHubLng(typeof selectedShift?.hubLng === "number" ? String(selectedShift.hubLng) : "");
    setHubAddress("");
  }, [selectedShift]);

  const hubPosLabel = useMemo(() => {
    const dir = String(hubDirection || "").toUpperCase();
    const n = stripHubStop(draftStops).length;
    if (dir === "OUTBOUND") return "1. durak";
    return `${n + 1}. durak`;
  }, [hubDirection, draftStops]);

  async function geocodeHubAddress() {
    setErr("");
    setInfo("");
    const q = sanitizeAddress(hubAddress);
    if (!q) {
      setErr("Adres gir.");
      return;
    }
    setBusy(true);
    try {
      const r = await api("/api/geocode", { token, method: "POST", body: { q, country: "tr" } });
      setHubLat(String(r?.lat ?? ""));
      setHubLng(String(r?.lng ?? ""));
      if (typeof r?.lat === "number" && typeof r?.lng === "number") {
        setInfo(`Toplanma konumu bulundu: ${Number(r.lat).toFixed(6)}, ${Number(r.lng).toFixed(6)}.`);
      } else {
        setInfo("Toplanma konumu bulundu. Lat/Lng alanlarını kontrol et.");
      }
    } catch (e) {
      const m = e?.payload?.error === "notfound" ? "Geocode başarısız: notfound" : e?.message || String(e);
      setErr(m);
    } finally {
      setBusy(false)
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

    const lat = normalizeCoord(hubLat, "lat");
    const lng = normalizeCoord(hubLng, "lng");
    if (lat == null || lng == null) {
      setErr("Toplanma Konumu Lat/Lng zorunlu. (Adresten Bul ile doldurabilirsin)");
      return;
    }

    const dir = String(hubDirection || "INBOUND").toUpperCase();
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

      // Draft durak listesine toplanma konumunu ekle (OUTBOUND: başa, INBOUND: sona)
      const baseStops = stripHubStop(draftStops);
      const withHub = withHubStop(baseStops, { ...(selectedShift || {}), hubLat: lat, hubLng: lng, direction: dir });
      setDraftStops(withHub);

      setInfo(`Toplanma konumu kaydedildi. Liste pozisyonu: ${hubPosLabel}`);
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
      setHubLat("");
      setHubLng("");
      setDraftStops(stripHubStop(draftStops));
      setInfo("Toplanma konumu temizlendi.");
    } catch (e) {
      setErr(String(e?.payload?.message || e?.payload?.error || e?.message || e));
    } finally {
      setBusy(false);
    }
  }



  async function geocodeManualAddress() {
    setErr("");
    setInfo("");

    const q = sanitizeAddress(pAddress);
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

    const name = String(pName || "").trim();
    const address = String(pAddress || "").trim();
    const lat = normalizeCoord(pLat, "lat");
    const lng = normalizeCoord(pLng, "lng");

    if (!name) {
      setErr("Ad Soyad zorunlu.");
      return;
    }
    if ((String(pLat || "").trim() && lat === null) || (String(pLng || "").trim() && lng === null)) {
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
        lat: normalizeCoord(r.lat, "lat"),
        lng: normalizeCoord(r.lng, "lng"),
      }));

      if (selectedShiftId && peopleBackend !== "off") {
        try {
          const sid = Number(selectedShiftId);
          const ids = mirrorIds.length ? mirrorIds : [sid];
          let firstResp = null;
          await apiOr404Fallback(
            async () => {
              for (const id of ids) {
                const resp = await importPeopleToBackendApi(api, token, String(id), file.name || null, normalizedRows, importMode);
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
          const payload = e?.payload;
          if (payload?.summary) setImportSummary(payload.summary);
          const warnings = Array.isArray(payload?.warnings) ? payload.warnings : [];
          setImportWarnings(warnings);
          if (warnings.length) {
            const first = warnings[0];
            setErr(`${payload?.error || e?.message || String(e)}${first?.rowNo ? ` (İlk sorun satır ${first.rowNo}: ${first.message})` : ""}`.trim());
          } else {
            setErr(String(payload?.error || e?.message || e));
          }
          return;
        }
      }

      const mapped = normalizedRows
        .map((r) => ({
          id: `p_${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random().toString(16).slice(2)}`,
          name: String(r.fullName || "").trim(),
          phone: String(r.phone || "").trim(),
          address: String(r.address || "").trim(),
          lat: typeof r.lat === "number" ? r.lat : null,
          lng: typeof r.lng === "number" ? r.lng : null,
          ...computeGeoMeta({ address: r.address, lat: r.lat, lng: r.lng }),
        }))
        .filter((x) => x.name && (x.address || (typeof x.lat === "number" && typeof x.lng === "number")));

      if (!mapped.length) {
        setErr("Dosyada geçerli satır bulunamadı (Ad Soyad zorunlu; adres veya koordinat olmalı).");
        return;
      }

      setPeople((prev) => (importMode === "REPLACE" ? mapped : [...mapped, ...(prev || [])]));
      const localWarnings = [];
      normalizedRows.forEach((r, index) => {
        const rowNo = index + 1;
        if (!r.fullName) localWarnings.push({ rowNo, code: "MISSING_NAME", message: "Ad soyad boş olduğu için satır atlandı.", level: "error" });
        else if (!r.address && !(typeof r.lat === "number" && typeof r.lng === "number")) {
          localWarnings.push({ rowNo, code: "MISSING_ADDRESS_OR_COORDS", message: "Adres veya geçerli koordinat olmadığı için satır atlandı.", level: "error" });
        } else if ((r.lat == null) !== (r.lng == null)) {
          localWarnings.push({ rowNo, code: "INVALID_COORD", message: "Enlem/boylam eksik veya geçersiz; adres varsa review akışına düşecek.", level: "warning" });
        } else if (!(typeof r.lat === "number" && typeof r.lng === "number")) {
          localWarnings.push({ rowNo, code: "GEO_NEEDS_REVIEW", message: "Koordinat eksik; kayıt konum kontrolü gerektiriyor.", level: "warning" });
        }
      });
      setImportWarnings(localWarnings);
      setImportSummary({
        totalRows: normalizedRows.length,
        acceptedRows: mapped.length,
        createdPersonels: 0,
        updatedPersonels: 0,
        linkedToShift: mapped.length,
        skippedRows: Math.max(0, normalizedRows.length - mapped.length),
        needsReviewRows: mapped.filter((x) => x.geoStatus === "NEEDS_REVIEW").length,
        failedRows: Math.max(0, normalizedRows.length - mapped.length),
      });
      setInfo(`İçe aktarıldı: ${mapped.length} kayıt (${peopleBackend === "off" ? "yerel mod" : "önizleme"})`);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    }
  }

  const shiftPeopleActions = buildShiftPeopleTabActions({
    api,
    apiOr404Fallback,
    buildStopSummary,
    clearUiDataCache,
    companyPath,
    clusterPeople,
    computeGeoMeta,
    computeGeoStatus,
    draftStops,
    getApiErrorMessage,
    hubAddress,
    hubDirection,
    hubLat,
    hubLng,
    hubPosLabel,
    importMode,
    importPeopleToBackendApi,
    loadPeopleFromBackendApi,
    me,
    mirrorIds,
    maxWalkM,
    navigate,
    normalizeCoord,
    pAddress,
    pLat,
    pLng,
    pName,
    parseCsv,
    parseSheetRowsToPeople,
    people,
    peopleBackend,
    peopleStorageKey,
    savePeopleToBackendApi,
    sanitizeAddress,
    selectedShift,
    selectedShiftId,
    setBusy,
    setDraftStops,
    setErr,
    setImportQuickBusy,
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
    setShiftPatchById,
    setStopActionBusy,
    stripHubStop,
    summarizeWarnings,
    stopActionBusy,
    token,
    withHubStop,
    writeGuidedResume,
    writePeopleToStorage,
  });
  const {
    removePerson,
    updatePerson,
    geocodePersonAddress,
    runImportQuickGeocode,
    generateDraftStops,
    prepareDraftStops,
    loadShiftStopsFromApi,
  } = shiftPeopleActions;


  const roomText = useMemo(() => {
    if (!selectedShift) return "-";
    const r = roomsById?.get ? roomsById.get(Number(selectedShift.roomId)) : null;
    return r ? `${r.name || r.title || `Room #${r.id}`} (#${r.id})` : `#${selectedShift.roomId}`;
  }, [selectedShift, roomsById]);

  const importWarningSummary = useMemo(() => summarizeWarnings(importWarnings), [importWarnings]);
  const geoReviewPath = companyPath(me, "/georeview");

  return (
    <div className="card">
      <ShiftPeopleOverviewSection
        err={err}
        info={info}
        busy={busy}
        selectedShiftId={selectedShiftId}
        setSelectedShiftId={setSelectedShiftId}
        shiftOptions={shiftOptions}
        maxWalkM={maxWalkM}
        setMaxWalkM={setMaxWalkM}
        companyKind={me?.companyKind}
        stopActionBusy={stopActionBusy}
        onPrepareDraftStops={prepareDraftStops}
        onGenerateDraftStops={generateDraftStops}
        onLoadShiftStops={loadShiftStopsFromApi}
        onOpenPreview={() => setPreviewOpen(true)}
        roomText={roomText}
        who={who}
        whoPlural={whoPlural}
        geoStats={geoStats}
        hideGeoReviewLinks={hideGeoReviewLinks}
        onOpenGuidedGeoPicker={openGuidedGeoPicker}
        geoReviewPath={geoReviewPath}
        draftStopsLength={draftStops.length}
        stopSummary={stopSummary}
        hubDirection={hubDirection}
        setHubDirection={setHubDirection}
        hubAddress={hubAddress}
        setHubAddress={setHubAddress}
        onGeocodeHubAddress={geocodeHubAddress}
        hubLat={hubLat}
        setHubLat={setHubLat}
        hubLng={hubLng}
        setHubLng={setHubLng}
        onSaveHubToShift={saveHubToShift}
        onClearHubOnShift={clearHubOnShift}
        hubPosLabel={hubPosLabel}
        selectedShift={selectedShift}
        pName={pName}
        setPName={setPName}
        pAddress={pAddress}
        setPAddress={setPAddress}
        pLat={pLat}
        setPLat={setPLat}
        pLng={pLng}
        setPLng={setPLng}
        onAddPersonManual={addPersonManual}
        onGeocodeManualAddress={geocodeManualAddress}
        importMode={importMode}
        setImportMode={setImportMode}
        onImportFile={importFile}
        importSummary={importSummary}
        onRunImportQuickGeocode={runImportQuickGeocode}
        importQuickBusy={importQuickBusy}
        importQuickStats={importQuickStats}
        importWarnings={importWarnings}
        importWarningSummary={importWarningSummary}
        warningLabel={warningLabel}
      />

      <ShiftPeopleListSection
        who={who}
        people={people}
        onRemove={removePerson}
        onUpdate={updatePerson}
        onGeocodeAddress={geocodePersonAddress}
        onOpenGeoPicker={guidedMode ? openGuidedGeoPicker : null}
        geocodeBusyId={rowGeocodeBusyId}
      />

      <RoutePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
    title={selectedShift ? `Shift #${selectedShift.id} - Rota/Durak önizleme` : "Rota/Durak önizleme"}
        stops={draftStops}
        people={people}
      />
    </div>
  );
}
