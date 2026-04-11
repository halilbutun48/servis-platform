
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
import ShiftPersonelTable from "../../components/ShiftPersonelTable";
import { clearUiDataCache } from "../../utils/uiDataCache";

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
} from "./shiftPeopleTabUtils";
import {
  ShiftPeopleSummarySection,
  ShiftPeopleHubSection,
  ShiftPeopleImportSection,
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
          await savePeopleToBackend(String(sid), people);
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

  // ✅ M51.B: Shift Hub (Toplanma/Dağıtım)
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

  function loadPeopleFromStorage() {
    try {
      const raw = localStorage.getItem(peopleStorageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((x) => ({
          id: String(x?.id || ""),
          name: String(x?.name || ""),
          phone: String(x?.phone || ""),
          address: String(x?.address || ""),
          lat: typeof x?.lat === "number" ? x.lat : null,
          lng: typeof x?.lng === "number" ? x.lng : null,
          geoStatus: String(x?.geoStatus || ""),
          geoReason: String(x?.geoReason || ""),
          geoReasonText: String(x?.geoReasonText || ""),
        }))
        .filter((x) => x.id);
    } catch {
      return [];
    }
  }

  function savePeopleToStorage(list) {
    try {
      localStorage.setItem(peopleStorageKey, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  function mapBackendPeopleToUi(items) {
    const list = Array.isArray(items) ? items : [];
    return list
      .map((p) => ({
        id: String(p?.id ?? ""),
        personelId: Number(p?.id ?? 0) || null,
        name: String(p?.fullName ?? ""),
        phone: String(p?.phone ?? ""),
        address: String(p?.homeAddress ?? ""),
        lat: typeof p?.homeLat === "number" ? p.homeLat : null,
        lng: typeof p?.homeLng === "number" ? p.homeLng : null,
        geoStatus: String(p?.geoStatus ?? ""),
        geoReason: String(p?.geoReason ?? p?.geoNote ?? ""),
        geoReasonText: String(p?.geoReasonText ?? ""),
        geoManualOverride: Boolean(p?.geoManualOverride),
      }))
      .filter((x) => x.id);
  }

  function mapUiPeopleToBackend(list) {
    const arr = Array.isArray(list) ? list : [];
    return arr.map((p) => ({
      personelId: p.personelId || (String(p.id).match(/^\d+$/) ? Number(p.id) : undefined),
      fullName: String(p.name || "").trim(),
      phone: String(p.phone || "").trim() || null,
      address: String(p.address || "").trim() || null,
      lat: typeof p.lat === "number" ? p.lat : null,
      lng: typeof p.lng === "number" ? p.lng : null,
      geoManualOverride: Boolean(p.geoManualOverride),
      geoReason: String(p.geoReason || "") || null,
    }));
  }

  async function loadPeopleFromBackend(shiftId) {
    const r = await api(`/api/shifts/${shiftId}/people`, { token });
    return mapBackendPeopleToUi(r?.items);
  }

  async function savePeopleToBackend(shiftId, list) {
    const items = mapUiPeopleToBackend(list);
    return api(`/api/shifts/${shiftId}/people?mode=REPLACE`, {
      method: "PUT",
      body: { items },
      token,
    });
  }

  async function importPeopleToBackend(shiftId, fileName, rows, mode) {
    return api(`/api/shifts/${shiftId}/people/import?mode=${encodeURIComponent(String(mode || "REPLACE"))}`, {
      method: "POST",
      body: { fileName, rows },
      token,
    });
  }

  function summarizeWarnings(list) {
    const items = Array.isArray(list) ? list : [];
    const counts = new Map();
    for (const item of items) {
      const key = String(item?.code || "UNKNOWN");
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([code, count]) => ({ code, count }));
  }

  function warningLabel(code) {
    const c = String(code || "");
    if (c === "MISSING_NAME") return "Ad Soyad eksik";
    if (c === "MISSING_ADDRESS_OR_COORDS") return "Adres/koordinat eksik";
    if (c === "INVALID_COORD") return "Koordinat geçersiz";
    if (c === "DUPLICATE_ROW") return "Tekrar satır";
    if (c === "GEO_NEEDS_REVIEW") return "Geo review gerekir";
    if (c === "INVALID_ROW") return "Satır okunamadı";
    return c || "Uyarı";
  }

  async function generateStopsOnBackend(shiftId, maxWalkMValue) {
    const mw = Number(maxWalkMValue);
    return api(`/api/shifts/${shiftId}/stops/generate?mode=REPLACE&maxWalkM=${encodeURIComponent(String(mw))}`, {
      method: "POST",
      token,
    });
  }

  function withHubStop(stops, shift) {
    const list = Array.isArray(stops) ? [...stops] : [];
    const hubLat = typeof shift?.hubLat === "number" ? shift.hubLat : null;
    const hubLng = typeof shift?.hubLng === "number" ? shift.hubLng : null;
    if (hubLat == null || hubLng == null) return list;

    const hub = {
      id: "hub",
      title: "Hub",
      lat: hubLat,
      lng: hubLng,
      count: null,
      memberIds: [],
      _virtual: true,
    };

    const dir = String(shift?.direction || "").toUpperCase();
    if (dir === "OUTBOUND") return [hub, ...list];
    // INBOUND (Toplama → Hub): rota hub'da bitmeli
    return [...list, hub];
  }

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
            const data = await loadPeopleFromBackend(sid);
            setPeopleBackend("on");
            return data;
          },
          async () => {
            setPeopleBackend("off");
            return loadPeopleFromStorage();
          }
        );

        if (!alive) return;
        setPeople(list);
        setDraftStops([]);
        setInfo("");
      } catch (e) {
        if (!alive) return;
        setErr(getApiErrorMessage(e));
        setPeople(loadPeopleFromStorage());
      } finally {
        if (alive) setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peopleStorageKey, selectedShiftId, validShiftIdSet]);

  // keep localStorage in sync + (soft) persist to backend
  useEffect(() => {
    if (!selectedShiftId) return;
    if (!validShiftIdSet.has(Number(selectedShiftId || 0))) return;

    // always keep local fallback updated
    savePeopleToStorage(people);

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
              await savePeopleToBackend(String(id), people);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, selectedShiftId, peopleBackend, mirrorIds, validShiftIdSet]);

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

  function buildStopSummary(base = {}, stopsInput = draftStops, peopleInput = people) {
    const allStops = Array.isArray(stopsInput) ? stopsInput : [];
    const realStops = stripHubStop(allStops);
    const hubIncluded = allStops.some((x) => String(x?.id || "") === "hub");
    const totalPeople = Number(base.totalPeople ?? (Array.isArray(peopleInput) ? peopleInput.length : 0));
    const reviewCount = Number(base.reviewCount ?? (Array.isArray(peopleInput) ? peopleInput.filter((p) => (p.geoStatus || computeGeoStatus(p)) === "NEEDS_REVIEW").length : 0));
    const coveredCount = Number(base.coveredCount ?? realStops.reduce((sum, s) => sum + Number(s?.count || 0), 0));
    const singletonCount = Number(base.singletonCount ?? realStops.filter((s) => Number(s?.count || 0) === 1).length);
    const stopCountWithoutHub = Number(base.stopCountWithoutHub ?? base.stopCount ?? realStops.length);
    const stopCountWithHub = Number(base.stopCountWithHub ?? (stopCountWithoutHub + (hubIncluded ? 1 : 0)));
    const skippedCount = Number(base.skippedCount ?? Math.max(0, totalPeople - coveredCount - reviewCount));
    const stopLoads = realStops.map((s, i) => ({ title: String(s?.title || `Durak ${i + 1}`), count: Number(s?.count || 0) }));
    return {
      ...base,
      totalPeople,
      reviewCount,
      coveredCount,
      singletonCount,
      stopCount: stopCountWithoutHub,
      stopCountWithoutHub,
      stopCountWithHub,
      hubIncluded,
      skippedCount,
      stopLoads,
    };
  }

  function stripHubStop(list) {
    const arr = Array.isArray(list) ? list : [];
    return arr.filter((x) => String(x?.id || "") !== "hub");
  }

  // ✅ M51.B: selected shift değişince hub formunu doldur
  useEffect(() => {
    if (!selectedShift) return;
    const dir = String(selectedShift?.direction || "INBOUND").toUpperCase();
    setHubDirection(dir === "OUTBOUND" ? "OUTBOUND" : "INBOUND");
    setHubLat(typeof selectedShift?.hubLat === "number" ? String(selectedShift.hubLat) : "");
    setHubLng(typeof selectedShift?.hubLng === "number" ? String(selectedShift.hubLng) : "");
    setHubAddress("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShiftId]);

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
        setInfo(`Hub konumu bulundu: ${Number(r.lat).toFixed(6)}, ${Number(r.lng).toFixed(6)}.`);
      } else {
        setInfo("Hub konumu bulundu. Lat/Lng alanlarını kontrol et.");
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
      setErr("Hub Lat/Lng zorunlu. (Adresten Bul ile doldurabilirsin)");
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

      // Draft durak listesine hub'ı ekle (OUTBOUND: başa, INBOUND: sona)
      const baseStops = stripHubStop(draftStops);
      const withHub = withHubStop(baseStops, { ...(selectedShift || {}), hubLat: lat, hubLng: lng, direction: dir });
      setDraftStops(withHub);

      setInfo(`Hub kaydedildi. Liste pozisyonu: ${hubPosLabel}`);
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
                const resp = await importPeopleToBackend(String(id), file.name || null, normalizedRows, importMode);
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

          const fresh = await loadPeopleFromBackend(String(sid));
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
          localWarnings.push({ rowNo, code: "GEO_NEEDS_REVIEW", message: "Koordinat eksik; kayıt review gerektiriyor.", level: "warning" });
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
    const target = (people || []).find((p) => p.id === id);
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
      const lat = normalizeCoord(resp?.lat, "lat");
      const lng = normalizeCoord(resp?.lng, "lng");
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
    const candidates = (people || []).filter((p) => {
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

    let nextPeople = [...(people || [])];
    for (const item of candidates) {
      const q = sanitizeAddress(item.address || "");
      if (!q) {
        notFound += 1;
        continue;
      }
      try {
        const resp = await api(`/api/geocode`, { method: "POST", body: { q, country: "tr" }, token });
        const lat = normalizeCoord(resp?.lat, "lat");
        const lng = normalizeCoord(resp?.lng, "lng");
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
    setImportSummary((prev) => prev ? { ...prev, needsReviewRows: remainingReview } : prev);
    setInfo(`Toplu geocode tamamlandı: bulundu ${found}, bulunamadı ${notFound}, hata ${error}. Değişiklikleri kalıcı yapmak için Kaydet ile listeyi kaydet.`);
    setImportQuickBusy(false);
  }

  async function generateDraftStops() {
    setErr("");
    setInfo("");

    const mw = Number(maxWalkM);
    if (!Number.isFinite(mw) || mw <= 0) {
      setErr("maxWalkM pozitif sayi olmali.");
      return;
    }

    // Prefer backend: generate + persist stops (wizard Step-4 needs persisted stops)
    // Guided Mode: outbound/inbound taslak shift'lerin hepsine aynı stop setini üret.
    if (selectedShiftId && peopleBackend !== "off") {
      try {
        const ids = mirrorIds.length ? mirrorIds : [Number(selectedShiftId)];
        await apiOr404Fallback(
          async () => {
            let firstResp = null;
            for (const id of ids) {
              const resp = await generateStopsOnBackend(String(id), mw);
              if (!firstResp) firstResp = resp;
            }
            const loadedStops = await loadShiftStopsFromApi();
            setStopSummary(buildStopSummary({
              maxWalkM: mw,
              stopCount: Number(firstResp?.stopCount || 0),
              coveredCount: Number(firstResp?.assignmentCount || 0),
              skippedCount: Number(firstResp?.skippedCount || 0),
              hubApplied: Boolean(firstResp?.hubApplied),
            }, loadedStops, people));
            setPeopleBackend("on");
            return true;
          },
          async () => {
            setPeopleBackend("off");
            return false;
          }
        );

        return;
      } catch (e) {
        setErr(getApiErrorMessage(e));
      }
    }

    // Fallback: UI-only preview (does not persist)
    const stops = clusterPeople(people, mw);
    const withHub = withHubStop(stops, selectedShift);
    setDraftStops(withHub);
    setStopSummary(buildStopSummary({ maxWalkM: mw, hubApplied: Boolean(selectedShift?.hubLat && selectedShift?.hubLng) }, withHub, people));
    setInfo(stops.length ? `Draft durak uretildi: ${stops.length} durak` : "OK koordinatli kayit yok - durak uretilemedi.");
  }

  async function prepareDraftStops() {
    await generateDraftStops();
    if (selectedShiftId && peopleBackend !== "off") {
      await loadShiftStopsFromApi({ quiet: true });
    }
  }

  async function loadShiftStopsFromApi(options = {}) {
    const { quiet = false } = options;
    if (!selectedShiftId) return;
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
      setStopSummary(buildStopSummary({}, withHub, people));
      setInfo(`Shift durakları yüklendi: ${withHub.length}`);
      return withHub;
    } catch (e) {
      if (!quiet) setErr(`Shift durakları yüklenemedi: ${getApiErrorMessage(e)}`);
      return null;
    } finally {
      setBusy(false);
    }
  }

  const roomText = useMemo(() => {
    if (!selectedShift) return "-";
    const r = roomsById?.get ? roomsById.get(Number(selectedShift.roomId)) : null;
    return r ? `${r.name || r.title || `Room #${r.id}`} (#${r.id})` : `#${selectedShift.roomId}`;
  }, [selectedShift, roomsById]);

  const importWarningSummary = useMemo(() => summarizeWarnings(importWarnings), [importWarnings]);
  const geoReviewPath = companyPath(me, "/georeview");

  return (
    <div className="card">
      <h3>Shift Tools</h3>
      <div className="muted">
        Shift bazlı araçlar: personel ekle/import → durakları hazırla → rota/durak önizleme (mini-map). “Durakları Hazırla” önce durak üretir, ardından varsa shift duraklarını yükler.
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
            companyKind={me?.companyKind}
            onPrepareDraftStops={prepareDraftStops}
            onOpenPreview={() => setPreviewOpen(true)}
            roomText={roomText}
            who={who}
            geoStats={geoStats}
            hideGeoReviewLinks={hideGeoReviewLinks}
            onOpenGuidedGeoPicker={openGuidedGeoPicker}
            geoReviewPath={geoReviewPath}
            draftStopsLength={draftStops.length}
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
            onGeocodeHubAddress={geocodeHubAddress}
            hubLat={hubLat}
            setHubLat={setHubLat}
            hubLng={hubLng}
            setHubLng={setHubLng}
            selectedShiftId={selectedShiftId}
            onSaveHubToShift={saveHubToShift}
            onClearHubOnShift={clearHubOnShift}
            hubPosLabel={hubPosLabel}
            selectedShift={selectedShift}
          />
        </div>

        {/* Manual add / import */}
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
          onAddPersonManual={addPersonManual}
          onGeocodeManualAddress={geocodeManualAddress}
          importMode={importMode}
          setImportMode={setImportMode}
          onImportFile={importFile}
          importSummary={importSummary}
          hideGeoReviewLinks={hideGeoReviewLinks}
          geoReviewPath={geoReviewPath}
          onOpenGuidedGeoPicker={openGuidedGeoPicker}
          onRunImportQuickGeocode={runImportQuickGeocode}
          importQuickBusy={importQuickBusy}
          importQuickStats={importQuickStats}
          importWarnings={importWarnings}
          importWarningSummary={importWarningSummary}
          warningLabel={warningLabel}
        />
      </div>

      {/* People table */}
      <div className="card" style={{ marginTop: 12, overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Shift {who} Listesi</h3>
        <ShiftPersonelTable
          people={people}
          onRemove={removePerson}
          onUpdate={updatePerson}
          onGeocodeAddress={geocodePersonAddress}
          onOpenGeoPicker={guidedMode ? openGuidedGeoPicker : null}
          geocodeBusyId={rowGeocodeBusyId}
          emptyLabel={`Henüz ${who.toLowerCase()} yok.`}
        />
      </div>

      <RoutePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={selectedShift ? `Shift #${selectedShift.id} — Rota/Durak Önizleme` : "Rota/Durak Önizleme"}
        stops={draftStops}
        people={people}
      />
    </div>
  );
}

