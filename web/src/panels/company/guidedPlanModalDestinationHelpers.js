import { buildGoogleNavUrl } from "../../utils/navigation";
import { coordNum, emptyDestination, fmtCoord, hasCoord } from "./guidedPlanModalUtils";
import { geocodeGuidedLocation } from "./guidedPlanModalActions";

export function setDestinationFieldInList(prev, idx, field, value) {
  return (prev || []).map((item, i) =>
    i === idx
      ? {
          ...item,
          [field]: value,
          ...((field === "title" || field === "address") ? { status: "idle", foundText: "", lat: "", lng: "" } : {}),
        }
      : item
  );
}

export function setDestinationCoordFieldInList(prev, idx, field, value) {
  return (prev || []).map((item, i) => {
    if (i !== idx) return item;
    const next = { ...item, [field]: value };
    const lat = coordNum(field === "lat" ? value : next.lat);
    const lng = coordNum(field === "lng" ? value : next.lng);
    if (hasCoord(lat, lng)) {
      return {
        ...next,
        lat: fmtCoord(lat),
        lng: fmtCoord(lng),
        status: "manual",
        foundText: "Koordinat hazır",
      };
    }
    if (String(item?.status || "") === "manual") {
      return { ...next, status: "idle", foundText: "" };
    }
    return next;
  });
}

export function buildDestinationMapPickerBasePoint({ item, hubLat, hubLng }) {
  const lat = coordNum(item?.lat);
  const lng = coordNum(item?.lng);
  const hubLatNum = coordNum(hubLat);
  const hubLngNum = coordNum(hubLng);
  return hasCoord(lat, lng)
    ? [lat, lng]
    : hasCoord(hubLatNum, hubLngNum)
    ? [hubLatNum, hubLngNum]
    : [41.0082, 28.9784];
}

export function applyDestinationMapPointToList(prev, mapPickIdx, mapPickPoint) {
  if (mapPickIdx == null || !Array.isArray(mapPickPoint)) return prev;
  const [lat, lng] = mapPickPoint;
  return (prev || []).map((item, i) =>
    i === mapPickIdx
      ? {
          ...item,
          lat: fmtCoord(lat),
          lng: fmtCoord(lng),
          status: "manual",
          foundText: "Haritadan seçildi",
        }
      : item
  );
}

export function buildDestinationNavigationTarget({ dest, hubLat, hubLng }) {
  const lat = coordNum(dest?.lat);
  const lng = coordNum(dest?.lng);
  if (!hasCoord(lat, lng)) {
    return { error: "Navigasyon için konum koordinatı gerekli." };
  }
  const hLat = coordNum(hubLat);
  const hLng = coordNum(hubLng);
  const url = buildGoogleNavUrl({
    origin: hasCoord(hLat, hLng) ? { lat: hLat, lng: hLng } : null,
    destination: { lat, lng },
  });
  if (!url) {
    return { error: "Navigasyon linki oluşturulamadı." };
  }
  return { url };
}

export function buildShiftNavigationTarget({ shift }) {
  const stops = (Array.isArray(shift?.stops) ? shift.stops : [])
    .map((s) => ({ lat: coordNum(s?.lat), lng: coordNum(s?.lng) }))
    .filter((x) => hasCoord(x.lat, x.lng));
  if (!stops.length) {
    return { error: "Navigasyon için en az 1 durak gerekli." };
  }

  const hLat = coordNum(shift?.hubLat);
  const hLng = coordNum(shift?.hubLng);
  let origin = hasCoord(hLat, hLng) ? { lat: hLat, lng: hLng } : null;
  let destination = null;
  let waypoints = [];
  const loop = String(shift?.pattern || "").toUpperCase() === "LOOP";
  if (loop && origin) {
    destination = origin;
    waypoints = stops;
  } else if (origin) {
    destination = stops[stops.length - 1] || null;
    waypoints = stops.slice(0, -1);
  } else {
    if (stops.length < 2) {
      return { error: "Navigasyon için toplanma konumu veya en az 2 durak gerekli." };
    }
    origin = stops[0];
    destination = stops[stops.length - 1];
    waypoints = stops.slice(1, -1);
  }

  const url = buildGoogleNavUrl({ origin, destination, waypoints });
  if (!url) {
    return { error: "Navigasyon linki oluşturulamadı." };
  }
  return { url };
}

export function addDestinationToList(prev) {
  return [...(prev || []), emptyDestination()];
}

export function removeDestinationFromList(prev, idx) {
  const next = (prev || []).filter((_, i) => i !== idx);
  return next.length ? next : [emptyDestination()];
}

export function moveDestinationInList(prev, idx, dir) {
  const next = [...(prev || [])];
  const to = idx + dir;
  if (to < 0 || to >= next.length) return next;
  const tmp = next[idx];
  next[idx] = next[to];
  next[to] = tmp;
  return next;
}

export async function geocodeGuidedDestinationAtIndex({
  token,
  idx,
  orgDestinations,
  setOrgDestinations,
  setErr,
  setInfo,
}) {
  if (typeof setErr === "function") setErr("");
  if (typeof setInfo === "function") setInfo("");
  if (!token) return;
  const item = (orgDestinations || [])[idx];
  const q = String(item?.address || item?.title || "").trim();
  if (q.length < 3) {
    if (typeof setErr === "function") setErr("Konum için en az 3 karakterlik ad veya adres gir.");
    return;
  }
  setOrgDestinations((prev) => (prev || []).map((x, i) => (i === idx ? { ...x, status: "loading", foundText: "" } : x)));
  try {
    const r = await geocodeGuidedLocation({ token, q });
    if (r?.ok) {
      setOrgDestinations((prev) =>
        (prev || []).map((x, i) =>
          i === idx
            ? {
                ...x,
                lat: String(r.lat),
                lng: String(r.lng),
                status: "ok",
                foundText: String(r.displayName || q),
                title: String(x.title || "").trim() || String(r.displayName || q).split(",")[0],
              }
            : x
        )
      );
    } else {
      setOrgDestinations((prev) => (prev || []).map((x, i) => (i === idx ? { ...x, status: "error", foundText: "Bulunamadı" } : x)));
    }
  } catch (e) {
    setOrgDestinations((prev) => (prev || []).map((x, i) => (i === idx ? { ...x, status: "error", foundText: String(e?.message || "Bulunamadı") } : x)));
  }
}

export function buildOrganizationNoteSummary({
  organization,
  orgEstimatedPax,
  orgGatheringName,
  orgFilledDestinations,
  orgReturnType,
}) {
  const pax = String(orgEstimatedPax || "").trim();
  const gathering = String(orgGatheringName || "").trim();
  const places = (Array.isArray(orgFilledDestinations) ? orgFilledDestinations : [])
    .map((d) => String(d.title || d.address || "").trim())
    .filter(Boolean);
  const returnText = orgReturnType === "RETURN_TO_START" ? "Başlangıç noktasına dön" : "Son noktada bitir";
  const parts = [];
  if (gathering) parts.push(`Toplanma Konumu: ${gathering}`);
  if (pax) parts.push(`Tahmini kişi: ${pax}`);
  if (places.length) parts.push(`Konumlar: ${places.join(" • ")}`);
  parts.push(`Dönüş: ${returnText}`);
  return organization ? `[Gezi planı] ${parts.join(" | ")}` : "";
}
