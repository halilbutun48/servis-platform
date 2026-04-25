
const normalizeCoord = (value) => {
  const n = safeNum(value);
  return Number.isFinite(n) ? n : null;
};
// web/src/panels/company/ShiftPeopleTab.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { apiOr404Fallback } from "../../utils/apiFallback";
import { personLabel, peopleLabel } from "../../utils/labels";
import { companyPath } from "../../utils/paths";
import { navigate } from "../../router";
import RoutePreviewModal from "../../components/RoutePreviewModal";
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

  // Ã¢Å“â€¦ M51.B: Shift Hub (Toplanma/DaÃ„Å¸Ã„Â±tÃ„Â±m)
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

  // Guided Mode: aynÃ„Â± personel/stop setini birden fazla taslak shift'e aynala
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

  const loadPeopleFromStorage = useCallback(() => {
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
  }, [peopleStorageKey]);

  const savePeopleToStorage = useCallback((list) => {
    try {
      localStorage.setItem(peopleStorageKey, JSON.stringify(list));
    } catch {
      // ignore
    }
  }, [peopleStorageKey]);

  const mapBackendPeopleToUi = useCallback((items) => {
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
  }, []);

  const mapUiPeopleToBackend = useCallback((list) => {
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
  }, []);

  const loadPeopleFromBackend = useCallback(async (shiftId) => {
    const r = await api(`/api/shifts/${shiftId}/people`, { token });
    return mapBackendPeopleToUi(r?.items);
  }, [mapBackendPeopleToUi, token]);

  const savePeopleToBackend = useCallback(async (shiftId, list) => {
    const items = mapUiPeopleToBackend(list);
    return api(`/api/shifts/${shiftId}/people?mode=REPLACE`, {
      method: "PUT",
      body: { items },
      token,
    });
  }, [mapUiPeopleToBackend, token]);

  async function importPeopleToBackend(shiftId, fileName, rows, mode) {
    return api(`/api/shifts/${shiftId}/people/import?mode=${encodeURIComponent(String(mode || "REPLACE"))}`, {
      method: "POST",
      body: { fileName, rows },
      token,
    });
  }

  const loadPeopleFromStorageRef = useRef(loadPeopleFromStorage);
  const loadPeopleFromBackendRef = useRef(loadPeopleFromBackend);
  const savePeopleToStorageRef = useRef(savePeopleToStorage);
  const savePeopleToBackendRef = useRef(savePeopleToBackend);

  useEffect(() => {
    loadPeopleFromStorageRef.current = loadPeopleFromStorage;
    loadPeopleFromBackendRef.current = loadPeopleFromBackend;
    savePeopleToStorageRef.current = savePeopleToStorage;
    savePeopleToBackendRef.current = savePeopleToBackend;
  }, [loadPeopleFromStorage, loadPeopleFromBackend, savePeopleToStorage, savePeopleToBackend]);

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
    if (c === "INVALID_COORD") return "Koordinat geÃƒÂ§ersiz";
    if (c === "DUPLICATE_ROW") return "Tekrar satÃ„Â±r";
    if (c === "GEO_NEEDS_REVIEW") return "Konum kontrolÃƒÂ¼ gerekir";
    if (c === "INVALID_ROW") return "SatÃ„Â±r okunamadÃ„Â±";
    return c || "UyarÃ„Â±";
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
    // INBOUND (Toplama Ã¢â€ â€™ Hub): rota hub'da bitmeli
    return [...list, hub];
  }

  // init selected shift
  useEffect(() => {
    const pid = Number(preferredShiftId || 0);
    if (!pid) return;
    if (!shiftOptions?.length) return;

    const exists = shiftOptions.some((s) => Number(s.id) === pid);
    if (!exists) return;

    // KullanÃ„Â±cÃ„Â± elle baÃ…Å¸ka shift seÃƒÂ§mediyse otomatik seÃƒÂ§
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
            const data = await loadPeopleFromBackendRef.current(sid);
            setPeopleBackend("on");
            return data;
          },
          async () => {
            setPeopleBackend("off");
            return loadPeopleFromStorageRef.current();
          }
        );

        if (!alive) return;
        setPeople(list);
        setDraftStops([]);
        setInfo("");
      } catch (e) {
        if (!alive) return;
        setErr(getApiErrorMessage(e));
        setPeople(loadPeopleFromStorageRef.current());
      } finally {
        if (alive) setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [peopleStorageKey, selectedShiftId, validShiftIdSet]);

  // keep localStorage in sync + (soft) persist to backend
  useEffect(() => {
    if (!selectedShiftId) return;
    if (!validShiftIdSet.has(Number(selectedShiftId || 0))) return;

    // always keep local fallback updated
    savePeopleToStorageRef.current(people);

    // debounce backend save; only if backend not known as missing
    if (peopleBackend === "off") return;

    const sid = String(selectedShiftId);
    const t = setTimeout(async () => {
      try {
        await apiOr404Fallback(
          async () => {
            // Guided Mode: aynÃ„Â± listeyi taslak shift'lerin hepsine yaz
            const ids = (mirrorIds.length ? mirrorIds : [Number(sid)]).filter((id) => validShiftIdSet.has(Number(id || 0)));
            if (!ids.length) return false;
            for (const id of ids) {
              await savePeopleToBackendRef.current(String(id), people);
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

  // Ã¢Å“â€¦ M51.B: selected shift deÃ„Å¸iÃ…Å¸ince hub formunu doldur
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
        setInfo(`Hub konumu bulundu: ${Number(r.lat).toFixed(6)}, ${Number(r.lng).toFixed(6)}.`);
      } else {
        setInfo("Hub konumu bulundu. Lat/Lng alanlarÃ„Â±nÃ„Â± kontrol et.");
      }
    } catch (e) {
      const m = e?.payload?.error === "notfound" ? "Geocode baÃ…Å¸arÃ„Â±sÃ„Â±z: notfound" : e?.message || String(e);
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
      setErr("Shift seÃƒÂ§.");
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

      // Draft durak listesine hub'Ã„Â± ekle (OUTBOUND: baÃ…Å¸a, INBOUND: sona)
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
        setInfo("Konum bulundu. Lat/Lng alanlarÃ„Â±nÃ„Â± kontrol et.");
      }
    } catch (e) {
      const m = e?.payload?.error === "notfound" ? "Geocode baÃ…Å¸arÃ„Â±sÃ„Â±z: notfound" : e?.message || String(e);
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
      setErr("Lat/Lng sayÃ„Â± olmalÃ„Â± (opsiyonel). Ãƒâ€“rn: 37.12345 veya 37,12345");
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
    // `xlsx` dependency web tarafÃ„Â±nda kurulu olmalÃ„Â± (npm i xlsx)
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
        setErr("Dosyada okunabilir satÃ„Â±r bulunamadÃ„Â±.");
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
          setInfo(`Import tamamlandÃ„Â±: ${firstResp?.summary?.acceptedRows ?? 0}/${firstResp?.summary?.totalRows ?? normalizedRows.length} satÃ„Â±r iÃ…Å¸lendi${warningCount ? ` Ã¢â‚¬Â¢ ${warningCount} uyarÃ„Â±` : ""}`);

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
            setErr(`${payload?.error || e?.message || String(e)}${first?.rowNo ? ` (Ã„Â°lk sorun satÃ„Â±r ${first.rowNo}: ${first.message})` : ""}`.trim());
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
        setErr("Dosyada geÃƒÂ§erli satÃ„Â±r bulunamadÃ„Â± (Ad Soyad zorunlu; adres veya koordinat olmalÃ„Â±).");
        return;
      }

      setPeople((prev) => (importMode === "REPLACE" ? mapped : [...mapped, ...(prev || [])]));
      const localWarnings = [];
      normalizedRows.forEach((r, index) => {
        const rowNo = index + 1;
        if (!r.fullName) localWarnings.push({ rowNo, code: "MISSING_NAME", message: "Ad soyad boÃ…Å¸ olduÃ„Å¸u iÃƒÂ§in satÃ„Â±r atlandÃ„Â±.", level: "error" });
        else if (!r.address && !(typeof r.lat === "number" && typeof r.lng === "number")) {
          localWarnings.push({ rowNo, code: "MISSING_ADDRESS_OR_COORDS", message: "Adres veya geÃƒÂ§erli koordinat olmadÃ„Â±Ã„Å¸Ã„Â± iÃƒÂ§in satÃ„Â±r atlandÃ„Â±.", level: "error" });
        } else if ((r.lat == null) !== (r.lng == null)) {
          localWarnings.push({ rowNo, code: "INVALID_COORD", message: "Enlem/boylam eksik veya geÃƒÂ§ersiz; adres varsa review akÃ„Â±Ã…Å¸Ã„Â±na dÃƒÂ¼Ã…Å¸ecek.", level: "warning" });
        } else if (!(typeof r.lat === "number" && typeof r.lng === "number")) {
          localWarnings.push({ rowNo, code: "GEO_NEEDS_REVIEW", message: "Koordinat eksik; kayÃ„Â±t konum kontrolÃƒÂ¼ gerektiriyor.", level: "warning" });
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
      setInfo(`Ã„Â°ÃƒÂ§e aktarÃ„Â±ldÃ„Â±: ${mapped.length} kayÃ„Â±t (${peopleBackend === "off" ? "yerel mod" : "ÃƒÂ¶nizleme"})`);
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
      setErr("Adres boÃ…Å¸. Ãƒâ€“nce adresi gir.");
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
        throw new Error("Adres iÃƒÂ§in geÃƒÂ§erli koordinat bulunamadÃ„Â±.");
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
      setInfo("Adres bulundu. Koordinatlar satÃ„Â±ra iÃ…Å¸lendi; devam etmeden ÃƒÂ¶nce Kaydet ile listeyi kaydet.");
    } catch (e) {
      if (e?.status === 404) {
        setErr("Adresten Bul baÃ…Å¸arÃ„Â±sÃ„Â±z: Adres bulunamadÃ„Â±.");
      } else if (e?.status === 400) {
        setErr("Adresten Bul baÃ…Å¸arÃ„Â±sÃ„Â±z: Geocode isteÃ„Å¸i eksik veya hatalÃ„Â±.");
      } else {
        setErr(`Adresten Bul baÃ…Å¸arÃ„Â±sÃ„Â±z: ${getApiErrorMessage(e)}`);
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
      setInfo("Toplu geocode iÃƒÂ§in uygun review kaydÃ„Â± yok.");
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
    setInfo(`Toplu geocode tamamlandÃ„Â±: bulundu ${found}, bulunamadÃ„Â± ${notFound}, hata ${error}. DeÃ„Å¸iÃ…Å¸iklikleri kalÃ„Â±cÃ„Â± yapmak iÃƒÂ§in Kaydet ile listeyi kaydet.`);
    setImportQuickBusy(false);
  }

  async function runStopAction(action) {
    if (stopActionBusy) return null;
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
    if (selectedShiftId && peopleBackend !== "off") {
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
              maxWalkM: mw,
              stopCount: Number(firstResp?.stopCount || 0),
              coveredCount: Number(firstResp?.assignmentCount || 0),
              skippedCount: Number(firstResp?.skippedCount || 0),
              hubApplied: Boolean(firstResp?.hubApplied),
            }, [], people));
            setInfo(
              shiftCount > 1
                ? `Durak uretimi tamamlandi: ${shiftCount} vardiya icin stop uretildi. Sonraki adim: Shiftten Duraklari Cek.`
                : `Durak uretimi tamamlandi: ${Number(firstResp?.stopCount || 0)} durak. Sonraki adim: Shiftten Duraklari Cek.`
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
    const stops = clusterPeople(people, mw);
    const withHub = withHubStop(stops, selectedShift);
    setDraftStops(withHub);
    setStopSummary(buildStopSummary({ maxWalkM: mw, hubApplied: Boolean(selectedShift?.hubLat && selectedShift?.hubLng) }, withHub, people));
    setInfo(stops.length ? `Draft durak uretildi: ${stops.length} durak` : "OK koordinatli kayit yok - durak uretilemedi.");
    return true;
  }

  async function generateDraftStops() {
    return runStopAction(() => generateDraftStopsInternal());
  }

  async function prepareDraftStops() {
    return runStopAction(async () => {
      const ok = await generateDraftStopsInternal();
      if (!ok) return false;
      if (selectedShiftId && peopleBackend !== "off") {
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
      setStopSummary(buildStopSummary({}, withHub, people));
      setInfo(`Shift duraklarÃ„Â± yÃƒÂ¼klendi: ${withHub.length}`);
      return withHub;
    } catch (e) {
      if (!quiet) setErr(`Shift duraklarÃ„Â± yÃƒÂ¼klenemedi: ${getApiErrorMessage(e)}`);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function loadShiftStopsFromApi(options = {}) {
    return runStopAction(() => loadShiftStopsFromApiInternal(options));
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
        title={selectedShift ? `Shift #${selectedShift.id} Ã¢â‚¬â€ Rota/Durak Ãƒâ€“nizleme` : "Rota/Durak Ãƒâ€“nizleme"}
        stops={draftStops}
        people={people}
      />
    </div>
  );
}
