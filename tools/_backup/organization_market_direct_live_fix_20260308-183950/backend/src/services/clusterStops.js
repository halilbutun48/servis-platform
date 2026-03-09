import { haversineKm } from "../geo.js";

function haversineM(a, b) {
  return Math.round(haversineKm(a.lat, a.lng, b.lat, b.lng) * 1000);
}

function key(aId, bId) {
  const x = Number(aId);
  const y = Number(bId);
  return x < y ? `${x}|${y}` : `${y}|${x}`;
}

/**
 * Cluster points into stop-centers such that every member is within maxWalkM
 * of its assigned center. Center is chosen as a medoid (one of the members).
 *
 * points: [{ personelId:number, lat:number, lng:number }]
 *
 * returns: [{
 *   center: { personelId, lat, lng },
 *   members: [{ personelId, lat, lng }],
 *   walkMByPersonelId: Map(personelId -> walkM)
 * }]
 */
export function clusterStops(points, maxWalkM) {
  const remaining = new Map(points.map((p) => [p.personelId, p]));
  const distCache = new Map(); // key(id1,id2) -> meters

  function dist(a, b) {
    const k = key(a.personelId, b.personelId);
    const hit = distCache.get(k);
    if (hit != null) return hit;
    const m = haversineM(a, b);
    distCache.set(k, m);
    return m;
  }

  const clusters = [];

  while (remaining.size > 0) {
    const seed = remaining.values().next().value;

    // candidates are all remaining within maxWalkM of seed
    const candidates = [];
    for (const p of remaining.values()) {
      if (dist(seed, p) <= maxWalkM) candidates.push(p);
    }

    // pick best medoid: covers maximum members within maxWalkM
    let bestCenter = seed;
    let bestMembers = [seed];

    for (const c of candidates) {
      const members = [];
      for (const p of candidates) {
        if (dist(c, p) <= maxWalkM) members.push(p);
      }
      if (members.length > bestMembers.length) {
        bestCenter = c;
        bestMembers = members;
      }
    }

    // finalize cluster
    const walkMByPersonelId = new Map();
    for (const m of bestMembers) {
      walkMByPersonelId.set(m.personelId, dist(bestCenter, m));
      remaining.delete(m.personelId);
    }

    clusters.push({
      center: bestCenter,
      members: bestMembers,
      walkMByPersonelId,
    });
  }

  return clusters;
}
