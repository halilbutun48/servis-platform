// web/src/panels/company/planBuilderPanelWorkflow.js

export function normalizeMaxWalkM(rawValue, fallback = 250) {
  return Math.min(2000, Math.max(50, Number(rawValue) || fallback));
}

export function haversineMeters(a, b) {
  const toRad = (deg) => (Number(deg) * Math.PI) / 180;
  const lat1 = Number(a?.lat);
  const lng1 = Number(a?.lng);
  const lat2 = Number(b?.lat);
  const lng2 = Number(b?.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return 0;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return Math.round(R * c);
}

export function clusterPreviewStops(people, maxWalkMeters) {
  const remaining = new Map((people || []).map((p) => [String(p.id), p]));
  const distCache = new Map();

  function pairKey(a, b) {
    return String(a.id) < String(b.id) ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
  }

  function dist(a, b) {
    const k = pairKey(a, b);
    const hit = distCache.get(k);
    if (hit != null) return hit;
    const meters = haversineMeters(a, b);
    distCache.set(k, meters);
    return meters;
  }

  const clusters = [];
  while (remaining.size > 0) {
    const seed = remaining.values().next().value;
    const candidates = [];
    for (const p of remaining.values()) {
      if (dist(seed, p) <= maxWalkMeters) candidates.push(p);
    }

    let bestCenter = seed;
    let bestMembers = [seed];
    for (const candidate of candidates) {
      const members = [];
      for (const p of candidates) {
        if (dist(candidate, p) <= maxWalkMeters) members.push(p);
      }
      if (members.length > bestMembers.length) {
        bestCenter = candidate;
        bestMembers = members;
      }
    }

    for (const member of bestMembers) {
      remaining.delete(String(member.id));
    }

    clusters.push({ center: bestCenter, members: bestMembers });
  }

  return clusters;
}

export function orderPreviewStops(clusters, orderIds) {
  if (!Array.isArray(orderIds) || !orderIds.length) return clusters;
  const pos = new Map(orderIds.map((id, i) => [String(id), i]));
  return [...clusters].sort((a, b) => {
    const ai = Math.min(...(a.members || []).map((m) => (pos.has(String(m.id)) ? pos.get(String(m.id)) : Number.MAX_SAFE_INTEGER)));
    const bi = Math.min(...(b.members || []).map((m) => (pos.has(String(m.id)) ? pos.get(String(m.id)) : Number.MAX_SAFE_INTEGER)));
    if (ai !== bi) return ai - bi;
    return (b.members?.length || 0) - (a.members?.length || 0);
  });
}

export function buildPreviewPeople(people) {
  return (people || [])
    .map((p) => ({
      id: String(p.id),
      name: p.fullName || p.name || String(p.id),
      lat: Number(p.homeLat ?? p.lat),
      lng: Number(p.homeLng ?? p.lng),
      geoStatus: p.geoStatus || "",
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

export function buildPreviewStopsFromClusters(orderedClusters, idx) {
  return (orderedClusters || []).map((cluster, i) => ({
    id: `preview-stop-${idx}-${i + 1}`,
    title:
      (cluster.members?.length || 0) > 1
        ? `${cluster.members.length} kişi • Durak ${i + 1}`
        : cluster.members?.[0]?.name || `Durak ${i + 1}`,
    lat: Number(cluster.center?.lat),
    lng: Number(cluster.center?.lng),
    count: cluster.members?.length || 0,
    order: i + 1,
    state: "PENDING",
  }));
}

export function estimatePathDistanceKm(points) {
  const list = Array.isArray(points) ? points : [];
  let totalMeters = 0;
  for (let i = 1; i < list.length; i++) {
    totalMeters += haversineMeters(list[i - 1], list[i]);
  }
  return Number((totalMeters / 1000).toFixed(1));
}

export function buildPreviewPathPoints(stops, hub, options = {}) {
  const stopPoints = (stops || [])
    .map((s) => ({ lat: Number(s?.lat), lng: Number(s?.lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

  const hubLat = Number(hub?.hubLat);
  const hubLng = Number(hub?.hubLng);
  const hasHub =
    Number.isFinite(hubLat) &&
    Number.isFinite(hubLng) &&
    !(Math.abs(hubLat) < 1e-9 && Math.abs(hubLng) < 1e-9);

  if (!hasHub) return stopPoints;

  const hubPoint = { lat: hubLat, lng: hubLng };
  const direction = String(options?.direction || "INBOUND").toUpperCase();
  const pattern = String(options?.pattern || "ONE_WAY").toUpperCase();
  if (pattern === "LOOP") return [hubPoint, ...stopPoints, hubPoint];
  if (direction === "OUTBOUND") return [hubPoint, ...stopPoints];
  return [...stopPoints, hubPoint];
}

export function summarizeMatrix(payload) {
  const dur = payload?.durationsSec;
  const dist = payload?.distancesM;
  const n = Array.isArray(dur) ? dur.length : 0;
  if (!n) return { ok: false, error: "noMatrix" };

  let sumS = 0;
  let sumM = 0;
  let cnt = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const s = dur?.[i]?.[j];
      const m = dist?.[i]?.[j];
      if (typeof s === "number" && s > 0) {
        sumS += s;
        if (typeof m === "number" && m > 0) sumM += m;
        cnt++;
      }
    }
  }
  if (!cnt) return { ok: false, error: "unreachable" };
  const avgMin = Math.round(sumS / cnt / 60);
  const avgKm = sumM ? Number((sumM / cnt / 1000).toFixed(1)) : null;
  return { ok: true, n, avgMin, avgKm };
}

export function fmtMin(sec) {
  const s = Number(sec);
  if (!Number.isFinite(s) || s < 0) return null;
  return Math.max(0, Math.round(s / 60));
}

export function fmtKm(m) {
  const x = Number(m);
  if (!Number.isFinite(x) || x < 0) return null;
  return Number((x / 1000).toFixed(1));
}

export function buildPeopleItemsFromVehicle(vehicle) {
  return (vehicle?.people || []).map((p) => ({
    personelId: p.id,
    fullName: p.fullName,
    lat: p.homeLat,
    lng: p.homeLng,
    geoManualOverride: true,
  }));
}

export function parseShiftStopsResponse(stopsResp) {
  if (Array.isArray(stopsResp)) return stopsResp;
  if (Array.isArray(stopsResp?.items)) return stopsResp.items;
  if (Array.isArray(stopsResp?.stops)) return stopsResp.stops;
  return [];
}
