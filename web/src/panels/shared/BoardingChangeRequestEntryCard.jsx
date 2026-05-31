import { useEffect, useMemo, useState } from "react";
import { api, createBoardingChangeRequest, getBoardingChangeRequestContext, listMyBoardingChangeRequests } from "../../api";
import { getApiErrorInfo, getApiErrorMessage } from "../../utils/apiContract";
import { resolvePersonDisplayLabel } from "../../utils/labels";
import {
  getLiveTrackingGeoErrorMessage,
  getLiveTrackingGeoUnsupportedMessage,
  getLiveTrackingServiceContextReason,
} from "../../utils/liveTrackingCopy";
import GeoLocationPicker from "../../components/geo/GeoLocationPicker";
import BoardingRouteImpactPreviewCard from "./BoardingRouteImpactPreviewCard";
import {
  boardingChangeDecisionOwnerNote,
  boardingChangeRequestEntryKindLabel,
  boardingChangeRequestStatusLabel,
  boardingChangeRequestStatusTone,
} from "./boardingChangeUi";

const REQUEST_KIND_OPTIONS = {
  PERSONEL: [
    { value: "NO_SHOW", label: "Bugün binmeyeceğim" },
    { value: "DIFFERENT_STOP", label: "Aynı rota üzerindeki başka duraktan bineceğim" },
    { value: "PICKUP_FROM_LOCATION", label: "Farklı konumdan alınmak istiyorum" },
  ],
  PARENT: [
    { value: "NO_SHOW", label: "Çocuğum bugün binmeyecek" },
    { value: "DIFFERENT_STOP", label: "Çocuğum başka duraktan binecek" },
    { value: "PICKUP_FROM_LOCATION", label: "Çocuğum şu konumdan alınsın" },
  ],
};

function todayIsoTR() {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function sortLatestFirst(list = []) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
}

function normalizeStop(stop) {
  if (!stop || typeof stop !== "object") return null;
  const lat = Number(stop?.lat ?? stop?.location?.lat);
  const lng = Number(stop?.lng ?? stop?.location?.lng);
  return {
    id: stop?.id ?? null,
    name: String(stop?.name || stop?.title || `Durak #${stop?.order || "-"}`).trim(),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    order: stop?.order ?? null,
  };
}

function sanitizeAddress(input) {
  let s = String(input ?? "").trim();
  if (!s) return "";
  s = s.replace(/[/]+/g, " ");
  s = s.replace(/\b(no|no\.|numara|daire|apt|kat)\b\s*[:#-]?\s*\S+/gi, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (!/türkiye|turkiye|tr\b/i.test(s)) s = `${s} Türkiye`;
  return s;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatLocationSummary({ lat, lng, addressText = "" } = {}) {
  const latNum = toNumber(lat);
  const lngNum = toNumber(lng);
  const address = String(addressText || "").trim();
  if (latNum != null && lngNum != null && !(latNum === 0 && lngNum === 0)) {
    return `${latNum.toFixed(5)}, ${lngNum.toFixed(5)}`;
  }
  if (address) return address;
  return "";
}

function buildShiftLabel(shift = null) {
  if (!shift) return "Planlı servis bağlamı bulunamadı";
  const parts = [
    shift?.id ? `Vardiya #${shift.id}` : null,
    shift?.vehicle?.plate ? `Araç ${shift.vehicle.plate}` : null,
    shift?.driver?.fullName ? `Sürücü ${shift.driver.fullName}` : null,
    shift?.room?.name ? `Oda ${shift.room.name}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" • ") : "Aktif servis";
}

function buildDisabledReason({ shift, mode, childId, requestKind, contextReason = "", locationBlockReason = "" }) {
  if (mode === "PARENT" && !childId) return "Önce bir çocuk seç.";
  if (!shift?.id) return contextReason || "Seçili tarih için planlı servis bağlamı bulunamadı.";
  if (locationBlockReason) return locationBlockReason;
  if (requestKind === "DIFFERENT_STOP" && !Array.isArray(shift?.stops) && !Array.isArray(shift?.shiftStops)) {
    return "Bu servis için durak listesi hazır değil.";
  }
  return "";
}

function useLatestRequestPreview(requests, selectedRequestId) {
  return useMemo(() => {
    const rows = sortLatestFirst(requests);
    if (!rows.length) return null;
    if (selectedRequestId) {
      const hit = rows.find((item) => String(item?.id || "") === String(selectedRequestId));
      if (hit) return hit;
    }
    return rows[0] || null;
  }, [requests, selectedRequestId]);
}

export default function BoardingChangeRequestEntryCard({
  token,
  mode = "PERSONEL",
  shift = null,
  childId = null,
  childLabel = "",
  selectedStop = null,
  stops = [],
  onRequestCreated = null,
  heading = "",
  intro = "",
  compact = false,
  entryMode = "full",
  onOpenEntry = null,
  summaryActionLabel = "Canlı ekranda talep oluştur",
}) {
  const normalizedMode = String(mode || "PERSONEL").toUpperCase() === "PARENT" ? "PARENT" : "PERSONEL";
  const normalizedEntryMode = String(entryMode || "full").toLowerCase() === "summary" ? "summary" : "full";
  const isSummaryMode = normalizedEntryMode === "summary";
  const options = REQUEST_KIND_OPTIONS[normalizedMode] || REQUEST_KIND_OPTIONS.PERSONEL;
  const [requestKind, setRequestKind] = useState(options[0]?.value || "NO_SHOW");
  const [requestDate, setRequestDate] = useState(todayIsoTR());
  const [note, setNote] = useState("");
  const [selectedStopId, setSelectedStopId] = useState(String(selectedStop?.id || ""));
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [serviceContext, setServiceContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState("");
  const [requestedLat, setRequestedLat] = useState("");
  const [requestedLng, setRequestedLng] = useState("");
  const [requestedAddressText, setRequestedAddressText] = useState("");
  const [requestedLocationMode, setRequestedLocationMode] = useState("");
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");

  useEffect(() => {
    setSelectedStopId(String(selectedStop?.id || ""));
  }, [selectedStop?.id]);

  useEffect(() => {
    if (!options.some((item) => item.value === requestKind)) {
      setRequestKind(options[0]?.value || "NO_SHOW");
    }
  }, [options, requestKind]);

  useEffect(() => {
    if (requestKind !== "PICKUP_FROM_LOCATION") {
      setLocationError("");
      setLocationMessage("");
      setLocationBusy(false);
    }
  }, [requestKind]);

  const requestDateValue = requestDate || todayIsoTR();
  const resolvedShift = useMemo(() => {
    if (shift?.id) return shift;
    return serviceContext?.shift || null;
  }, [serviceContext?.shift, shift]);
  const resolvedStops = useMemo(() => {
    const sourceStops = Array.isArray(stops) && stops.length ? stops : Array.isArray(serviceContext?.stops) ? serviceContext.stops : [];
    return sourceStops.map(normalizeStop).filter(Boolean);
  }, [serviceContext?.stops, stops]);
  const selectedStopRow = useMemo(() => {
    if (!selectedStopId) return resolvedStops[0] || null;
    return resolvedStops.find((stop) => String(stop.id) === String(selectedStopId)) || resolvedStops[0] || null;
  }, [resolvedStops, selectedStopId]);
  const previewRequest = useLatestRequestPreview(requests, selectedRequestId);
  const shiftLabel = useMemo(() => buildShiftLabel(resolvedShift), [resolvedShift]);
  const statusLine = previewRequest ? boardingChangeRequestStatusLabel(previewRequest) : "";
  const statusTone = previewRequest ? boardingChangeRequestStatusTone(previewRequest) : "info";
  const ownerNote = previewRequest ? boardingChangeDecisionOwnerNote(previewRequest) : "";
  const currentKindLabel = boardingChangeRequestEntryKindLabel(requestKind);
  const requestedLatNum = toNumber(requestedLat);
  const requestedLngNum = toNumber(requestedLng);
  const hasRequestedCoords = Number.isFinite(requestedLatNum) && Number.isFinite(requestedLngNum) && !(requestedLatNum === 0 && requestedLngNum === 0);
  const requestedAddress = String(requestedAddressText || "").trim();
  const requestedLocationSummary = useMemo(() => formatLocationSummary({
    lat: hasRequestedCoords ? requestedLatNum : null,
    lng: hasRequestedCoords ? requestedLngNum : null,
    addressText: requestedAddress,
  }), [hasRequestedCoords, requestedLatNum, requestedLngNum, requestedAddress]);
  const requestedLocationModeLabel = useMemo(() => {
    if (requestedLocationMode === "CURRENT") return "Konumumu al";
    if (requestedLocationMode === "MAP") return "Büyük haritada konum seç";
    if (requestedLocationMode === "ADDRESS") return "Adresten konum bul";
    return "";
  }, [requestedLocationMode]);
  const requestedLocationWarning = useMemo(() => {
    if (requestKind !== "PICKUP_FROM_LOCATION") return "";
    if (hasRequestedCoords || requestedAddress) return "";
    return "Haritadan konum seçin veya açıklama alanına net tarif yazın.";
  }, [hasRequestedCoords, requestedAddress, requestKind]);
  const serviceContextReason = useMemo(() => {
    if (serviceContext?.available && !serviceContext?.liveVehicleAvailable) {
      return getLiveTrackingServiceContextReason(normalizedMode);
    }
    return String(serviceContext?.reason || "").trim();
  }, [normalizedMode, serviceContext]);
  const noLiveVehicleCopy = normalizedMode === "PARENT"
    ? "Bu çocuk için şu an canlı araç görünmüyor. Talep oluşturma, planlı servis bilgisine göre yapılır."
    : "Bu servis için şu an canlı araç görünmüyor. Talep oluşturma, planlı servis bilgisine göre yapılır.";

  const disabledReason = useMemo(() => buildDisabledReason({
    shift: resolvedShift,
    mode: normalizedMode,
    childId,
    requestKind,
    contextReason: serviceContextReason,
    locationBlockReason: requestKind === "PICKUP_FROM_LOCATION" && requestedLocationWarning && !note.trim()
      ? requestedLocationWarning
      : "",
  }), [resolvedShift, normalizedMode, childId, requestKind, serviceContextReason, requestedLocationWarning, note]);

  const previewRequestBody = useMemo(() => {
    const targetStop = requestKind === "DIFFERENT_STOP" ? selectedStopRow : null;
    const body = {
      shiftId: Number(resolvedShift?.id || 0),
      kind: requestKind,
      reason: note.trim() || currentKindLabel,
      note: note.trim(),
      requestDate: requestDateValue,
      ...(normalizedMode === "PARENT" && childId ? { childId: Number(childId) } : {}),
      locationProvided: false,
    };

    if (requestKind === "DIFFERENT_STOP" && targetStop) {
      body.targetStopId = Number(targetStop.id || 0) || undefined;
      body.targetStopName = targetStop.name || undefined;
      if (Number.isFinite(Number(targetStop.lat)) && Number.isFinite(Number(targetStop.lng))) {
        body.targetStopLat = Number(targetStop.lat);
        body.targetStopLng = Number(targetStop.lng);
        body.locationProvided = true;
      }
    } else if (requestKind === "PICKUP_FROM_LOCATION") {
      if (hasRequestedCoords) {
        body.requestedLat = Number(requestedLatNum);
        body.requestedLng = Number(requestedLngNum);
        body.lat = Number(requestedLatNum);
        body.lng = Number(requestedLngNum);
        body.locationProvided = true;
      } else {
        body.requestedLat = null;
        body.requestedLng = null;
        body.lat = 0;
        body.lng = 0;
        body.locationProvided = Boolean(requestedAddress);
      }
      body.requestedAddressText = requestedAddress || undefined;
      body.requestedLocationMode = requestedLocationMode || undefined;
    } else if (requestKind === "NO_SHOW") {
      body.locationProvided = false;
    }

    return body;
  }, [requestKind, note, currentKindLabel, requestDateValue, resolvedShift?.id, normalizedMode, childId, selectedStopRow, hasRequestedCoords, requestedLatNum, requestedLngNum, requestedAddress, requestedLocationMode]);

  function clearRequestedLocation() {
    setRequestedLat("");
    setRequestedLng("");
    setRequestedAddressText("");
    setRequestedLocationMode("");
    setLocationError("");
    setLocationMessage("");
  }

  function applyRequestedCoords(latValue, lngValue, mode = "MAP", message = "") {
    const latText = Number(latValue);
    const lngText = Number(lngValue);
    if (!Number.isFinite(latText) || !Number.isFinite(lngText)) return;
    setRequestedLat(String(latText));
    setRequestedLng(String(lngText));
    setRequestedLocationMode(mode);
    setLocationError("");
    setLocationMessage(message || `${mode === "CURRENT" ? "Konum alındı" : mode === "ADDRESS" ? "Adres bulundu" : "Haritada seçildi"}: ${latText.toFixed(6)}, ${lngText.toFixed(6)}.`);
  }

  async function handleUseCurrentLocation() {
    setLocationError("");
    setLocationMessage("");
    if (typeof navigator === "undefined" || !navigator?.geolocation) {
      setLocationError(getLiveTrackingGeoUnsupportedMessage(normalizedMode));
      return;
    }
    setLocationBusy(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          (e) => reject(e),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      });
      const latValue = pos?.coords?.latitude;
      const lngValue = pos?.coords?.longitude;
      if (!Number.isFinite(Number(latValue)) || !Number.isFinite(Number(lngValue))) {
        throw new Error("Konum okunamadı");
      }
      setRequestedAddressText("");
      applyRequestedCoords(latValue, lngValue, "CURRENT", `Konum alındı: ${Number(latValue).toFixed(6)}, ${Number(lngValue).toFixed(6)}. Bu konum sadece bu biniş değişikliği talebi için kullanılır.`);
    } catch (e) {
      const code = e?.code;
      const fallback = "Konum izni verilmedi. Büyük haritadan konum seçebilir veya adresten arayabilirsiniz.";
      const message =
        code === 1
          ? getLiveTrackingGeoErrorMessage(e, normalizedMode)
          : code === 2
            ? getLiveTrackingGeoErrorMessage(e, normalizedMode)
            : code === 3
              ? getLiveTrackingGeoErrorMessage(e, normalizedMode)
              : getLiveTrackingGeoErrorMessage(e, normalizedMode) || fallback;
      setLocationError(message);
    } finally {
      setLocationBusy(false);
    }
  }

  async function handleGeocodeAddress() {
    setLocationError("");
    setLocationMessage("");
    const q = sanitizeAddress(requestedAddressText);
    if (!q) {
      setLocationError("Adres gir.");
      return;
    }
    setLocationBusy(true);
    try {
      const resp = await api("/api/geocode", { method: "POST", token, body: { q, country: "tr" } });
      if (!Number.isFinite(Number(resp?.lat)) || !Number.isFinite(Number(resp?.lng))) {
        throw new Error("Geocode isteği eksik veya hatalı.");
      }
      setRequestedLocationMode("ADDRESS");
      setLocationMessage(`Adres bulundu: ${Number(resp.lat).toFixed(6)}, ${Number(resp.lng).toFixed(6)}. Onaylamak için büyük haritadaki "Bu konumu kullan" düğmesini seç.`);
      return resp;
    } catch (e) {
      const apiError = getApiErrorInfo(e, "");
      if (apiError.status === 404) {
        setLocationError("Adresten konum bulma henüz bağlı değil. Büyük haritadan konum seçebilir veya açıklama yazabilirsiniz.");
      } else if (apiError.status === 400) {
        setLocationError("Geocode isteği eksik veya hatalı. Büyük haritadan konum seçebilir veya açıklama yazabilirsiniz.");
      } else if (e?.payload?.error === "notfound") {
        setLocationError("Adres bulunamadı. Büyük haritadan konum seçebilir veya açıklama yazabilirsiniz.");
      } else {
        setLocationError(getApiErrorMessage(e, "Adresten konum bulma henüz bağlı değil. Büyük haritadan konum seçebilir veya açıklama yazabilirsiniz."));
      }
    } finally {
      setLocationBusy(false);
    }
  }

  useEffect(() => {
    if (!token) {
      setServiceContext(null);
      setContextError("");
      setContextLoading(false);
      return;
    }
    if (normalizedMode === "PARENT" && !childId) {
      setServiceContext(null);
      setContextError("");
      setContextLoading(false);
      return;
    }

    let cancelled = false;
    setContextLoading(true);
    setContextError("");
    getBoardingChangeRequestContext({
      mode: normalizedMode,
      childId: normalizedMode === "PARENT" && childId ? Number(childId) : undefined,
      requestDate: requestDateValue,
      ...(requestDateValue === todayIsoTR() && resolvedShift?.id ? { shiftId: Number(resolvedShift.id) } : {}),
    }, { token })
      .then((result) => {
        if (cancelled) return;
        setServiceContext(result || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setServiceContext(null);
        setContextError(getApiErrorMessage(err, "Talep durumu şu an okunamadı. Lütfen tekrar deneyin."));
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, normalizedMode, childId, requestDateValue, resolvedShift?.id]);

  const loadRequests = async () => {
    if (!token || !resolvedShift?.id) {
      setRequests([]);
      return;
    }
    setListLoading(true);
    try {
      const result = await listMyBoardingChangeRequests({
        shiftId: Number(resolvedShift.id),
        ...(normalizedMode === "PARENT" && childId ? { childId: Number(childId) } : {}),
      }, { token });
      const rows = Array.isArray(result?.items) ? result.items : Array.isArray(result) ? result : [];
      setRequests(rows);
      if (rows.length && !selectedRequestId) {
        setSelectedRequestId(String(rows[0].id || ""));
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Talep listesi şu an okunamıyor. Lütfen tekrar deneyin."));
      setRequests([]);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, resolvedShift?.id, childId, normalizedMode]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token || !resolvedShift?.id || loading || disabledReason) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        ...previewRequestBody,
      };
      const result = await createBoardingChangeRequest(payload, { token });
      const createdKindLabel = boardingChangeRequestEntryKindLabel(result?.requestKind || requestKind);
      const createdOwnerNote = result?.decisionOwnerNote
        || result?.routeImpactPreview?.decisionOwnerNote
        || ownerNote
        || "Karar sahibi akışa eklendi.";
      setSuccess(result?.decisionState === "NO_SHOW"
        ? "Talep alındı. No-show bildirimi ayrı akışta görünecek."
        : `${createdKindLabel} talebi alındı. ${createdOwnerNote}`);
      setNote("");
      await loadRequests();
      if (typeof onRequestCreated === "function") {
        onRequestCreated(result);
      }
      if (result?.id) {
        setSelectedRequestId(String(result.id));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Talep gönderilemedi. Lütfen tekrar deneyin."));
    } finally {
      setLoading(false);
    }
  }

  const selectedStopSummary = selectedStopRow
    ? `${selectedStopRow.name}${Number.isFinite(Number(selectedStopRow.lat)) && Number.isFinite(Number(selectedStopRow.lng)) ? ` • ${Number(selectedStopRow.lat).toFixed(5)}, ${Number(selectedStopRow.lng).toFixed(5)}` : ""}`
    : "Durak seçilmedi; talep açıklama üzerinden ilerleyecek.";
  return (
    <div className="card" style={{ marginTop: compact ? 8 : 14 }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <div className="panelSectionTitle">{heading || (normalizedMode === "PARENT" ? "Veli talep girişi" : "Personel talep girişi")}</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            {intro || "Bu form yalnızca boarding-change request kaydı oluşturur. Rota uygulanmaz, sürücü rotası yenilenmez."}
          </div>
        </div>
        <span className="pill" data-status={statusTone}>{normalizedMode === "PARENT" ? "Veli" : "Personel"} • Readonly akış</span>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div className="muted">Servis: <b>{shiftLabel}</b></div>
        {normalizedMode === "PARENT" ? <div className="muted">Çocuk: <b>{resolvePersonDisplayLabel(childLabel, "Çocuk bilgisi")}</b></div> : null}
        {contextLoading ? <div className="muted">Planlı servis bağlamı kontrol ediliyor...</div> : null}
        {contextError ? <div className="card err" style={{ padding: 12 }}>{contextError}</div> : null}
        {serviceContext?.available && !serviceContext?.liveVehicleAvailable ? <div className="card" style={{ padding: 12, background: "rgba(59,130,246,.06)", border: "1px solid rgba(59,130,246,.18)" }}>{noLiveVehicleCopy}</div> : null}
        <div className="muted">Seçili durak: <b>{selectedStopSummary}</b></div>
        {requestKind === "PICKUP_FROM_LOCATION" ? (
          <div className="muted">Seçilen konum: <b>{requestedLocationSummary || "Henüz seçilmedi"}</b></div>
        ) : null}
        {!resolvedShift?.id && serviceContextReason ? <div className="card err" style={{ padding: 12 }}>{serviceContextReason}</div> : null}
      </div>

      {isSummaryMode ? (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div className="card" style={{ padding: 12, background: "rgba(59,130,246,.06)", border: "1px solid rgba(59,130,246,.18)" }}>
            <div className="muted" style={{ fontWeight: 700 }}>Talep özeti</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Bu ekranda tam form gösterilmez. Talep oluşturmak için canlı ekrana geç.
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
              <button type="button" disabled={Boolean(disabledReason) || typeof onOpenEntry !== "function"} onClick={() => { if (typeof onOpenEntry === "function") onOpenEntry(); }}>
                {summaryActionLabel}
              </button>
              <div className="muted">Talep yoksa burada sadece son durum ve özet görünür.</div>
            </div>
            {disabledReason ? <div className="card err" style={{ padding: 12, marginTop: 10 }}>{disabledReason}</div> : null}
          </div>
          {success ? <div className="card" style={{ padding: 12, border: "1px solid rgba(16,185,129,.35)", background: "rgba(16,185,129,.08)" }}>{success}</div> : null}
          {error ? <div className="card err" style={{ padding: 12 }}>{error}</div> : null}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <label className="muted" style={{ flex: "1 1 240px", minWidth: 220 }}>
              Talep tipi
              <select value={requestKind} onChange={(e) => setRequestKind(e.target.value)} style={{ width: "100%", marginTop: 6 }}>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="muted" style={{ flex: "0 0 190px", minWidth: 170 }}>
              Tarih
              <input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} style={{ width: "100%", marginTop: 6 }} />
            </label>
          </div>

          {requestKind === "DIFFERENT_STOP" ? (
            resolvedStops.length ? (
              <label className="muted">
                Durak seç
                <select value={selectedStopId} onChange={(e) => setSelectedStopId(e.target.value)} style={{ width: "100%", marginTop: 6 }}>
                  <option value="">Durak seç</option>
                  {resolvedStops.map((stop) => (
                    <option key={String(stop.id)} value={String(stop.id)}>
                      {stop.name}{Number.isFinite(Number(stop.lat)) && Number.isFinite(Number(stop.lng)) ? ` • ${Number(stop.lat).toFixed(5)}, ${Number(stop.lng).toFixed(5)}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="muted">Bu servis için koordinatlı durak bulunamadı; talep açıklama üzerinden iletilecek.</div>
            )
          ) : null}

          {requestKind === "PICKUP_FROM_LOCATION" ? (
            <GeoLocationPicker
              title="Konum seçimi"
              subtitle="Konumumu al, büyük haritada konum seç veya adresten konum bul. Bu konum sadece bu biniş değişikliği talebi için kullanılır."
              selectedLabelText="Seçilen konum"
              selectedName={requestedLocationSummary || "Henüz seçilmedi"}
              address={requestedAddressText}
              onAddressChange={(value) => {
                setRequestedAddressText(value);
                setRequestedLocationMode("ADDRESS");
              }}
              lat={requestedLat}
              lng={requestedLng}
              onPick={(latValue, lngValue) => applyRequestedCoords(latValue, lngValue, requestedLocationMode === "ADDRESS" ? "ADDRESS" : "MAP", `${requestedLocationMode === "ADDRESS" ? "Adresten seçildi" : "Haritada seçildi"}: ${Number(latValue).toFixed(6)}, ${Number(lngValue).toFixed(6)}. Bu konum sadece bu biniş değişikliği talebi için kullanılır.`)}
              onLatChange={(value) => {
                setRequestedLat(value);
                if (String(value || "").trim() || String(requestedLng || "").trim()) setRequestedLocationMode("MAP");
              }}
              onLngChange={(value) => {
                setRequestedLng(value);
                if (String(value || "").trim() || String(requestedLat || "").trim()) setRequestedLocationMode("MAP");
              }}
              onGeocode={handleGeocodeAddress}
              onLocateMe={handleUseCurrentLocation}
              onOpenPicker={() => setRequestedLocationMode("MAP")}
              onClear={clearRequestedLocation}
              busy={loading || locationBusy}
              locateMeBusy={locationBusy}
              geoBusy={locationBusy}
              statusLabel={requestedLocationModeLabel || (hasRequestedCoords ? "Konum seçildi" : "Konum bekleniyor")}
              reasonLabel={locationError || locationMessage || requestedLocationWarning || "Konum seçimi için üç yol var."}
              compact
              previewHeight={220}
              locateMeLabel="Konumumu al"
              mapButtonLabel="Büyük haritada konum seç"
              geocodeButtonLabel="Adresten konum bul"
              confirmButtonLabel="Bu konumu kullan"
              clearButtonLabel="Konumu temizle"
              kvkkText="Bu konum sadece bu biniş değişikliği talebi için kullanılır."
              geocodeUnavailableText="Adresten konum bulma henüz bağlı değil. Büyük haritadan konum seçebilir veya açıklama yazabilirsiniz."
              locateMeFallbackText="Konum izni verilmedi. Büyük haritadan konum seçebilir veya adresten arayabilirsiniz."
            />
          ) : null}

          {requestedLocationWarning ? (
            <div className="card" style={{ padding: 12, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.28)" }}>
              {requestedLocationWarning}
            </div>
          ) : null}

          <label className="muted">
            Not
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={requestKind === "NO_SHOW"
                ? "Örn. Bugün binmeyeceğim, yarın normal devam."
                : requestKind === "DIFFERENT_STOP"
                  ? "Örn. Yarın X durağından bineceğim."
                  : "Örn. Site girişinden alınmak istiyorum."}
              style={{ width: "100%", marginTop: 6, resize: "vertical" }}
            />
          </label>

          <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="submit" disabled={loading || Boolean(disabledReason)}>{loading ? "Gönderiliyor..." : "Talep oluştur"}</button>
            <div className="muted">Readonly önizleme - talep oluşturulur, rota uygulanmaz.</div>
          </div>
          {disabledReason ? <div className="card err" style={{ padding: 12 }}>{disabledReason}</div> : null}
          {success ? <div className="card" style={{ padding: 12, border: "1px solid rgba(16,185,129,.35)", background: "rgba(16,185,129,.08)" }}>{success}</div> : null}
          {error ? <div className="card err" style={{ padding: 12 }}>{error}</div> : null}
        </form>
      )}

      <div style={{ marginTop: 18 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div className="panelSectionTitle" style={{ fontSize: 16 }}>Talep durumun</div>
          <span className="pill" data-status={statusTone}>{statusLine || "Henüz talep yok"}</span>
        </div>
        {listLoading ? <div className="muted" style={{ marginTop: 8 }}>Talep durumları yükleniyor...</div> : null}
        {!listLoading && !requests.length ? (
          <div className="muted" style={{ marginTop: 8 }}>Henüz gönderilmiş talep yok. Gönderdiğinde burada alındığını ve kimde beklediğini görürsün.</div>
        ) : null}
        {requests.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {sortLatestFirst(requests).slice(0, 4).map((request) => {
              const ownerLine = boardingChangeDecisionOwnerNote(request);
              const active = String(selectedRequestId || "") === String(request?.id || "");
              return (
                <button
                  key={request.id}
                  type="button"
                  className="card"
                  onClick={() => setSelectedRequestId(String(request.id || ""))}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    border: active ? "1px solid rgba(59,130,246,.45)" : "1px solid rgba(255,255,255,0.08)",
                    background: active ? "rgba(59,130,246,.08)" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 800 }}>{boardingChangeRequestEntryKindLabel(request?.requestKind || request?.kind)}</div>
                    <span className="pill" data-status={boardingChangeRequestStatusTone(request)}>{boardingChangeRequestStatusLabel(request)}</span>
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {request?.requestReason || request?.decisionText || "Talep detayı yok"} • {ownerLine}
                  </div>
                  {request?.locationSummary ? <div className="muted" style={{ marginTop: 6 }}>{request.locationSummary}</div> : null}
                  {request?.requestNote ? <div className="muted" style={{ marginTop: 6 }}>{request.requestNote}</div> : null}
                  <div className="muted" style={{ marginTop: 6 }}>
                    {request?.createdAt ? new Date(request.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }) : "-"}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {previewRequest ? (
        <div style={{ marginTop: 18 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <div className="panelSectionTitle" style={{ fontSize: 16 }}>Readonly önizleme</div>
            <button type="button" className="ghostButton" onClick={() => setSelectedRequestId("")}>Seçimi temizle</button>
          </div>
          <BoardingRouteImpactPreviewCard
            key={`${previewRequest?.id || previewRequest?.routeImpactPreview?.changeType || "boarding-route-impact-preview"}`}
            request={previewRequest}
            preview={previewRequest?.routeImpactPreview || null}
            title="Talep önizlemesi"
            loading={listLoading}
            onClearSelection={() => setSelectedRequestId("")}
          />
        </div>
      ) : (
        <div className="muted" style={{ marginTop: 18 }}>
          Talep seçilince readonly önizleme burada görünür.
        </div>
      )}
    </div>
  );
}
