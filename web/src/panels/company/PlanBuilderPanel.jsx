// web/src/panels/company/PlanBuilderPanel.jsx


import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { personLabel } from "../../utils/labels";

// Tiny geohash encoder (no deps)
const GEOHASH_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
function encodeGeohash(lat, lng, precision = 6) {
  const p = Math.max(1, Math.min(12, Number(precision) || 6));
  let latitude = [-90.0, 90.0];
  let longitude = [-180.0, 180.0];
  let isEven = true;
  let bit = 0;
  let ch = 0;
  let hash = "";

  while (hash.length < p) {
    if (isEven) {
      const mid = (longitude[0] + longitude[1]) / 2;
      if (lng > mid) {
        ch |= 1 << (4 - bit);
        longitude[0] = mid;
      } else {
        longitude[1] = mid;
      }
    } else {
      const mid = (latitude[0] + latitude[1]) / 2;
      if (lat > mid) {
        ch |= 1 << (4 - bit);
        latitude[0] = mid;
      } else {
        latitude[1] = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      hash += GEOHASH_BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}
function todayYmdLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDaysYmd(ymd, deltaDays) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return todayYmdLocal();
  const Y = Number(m[1]);
  const M = Number(m[2]);
  const D = Number(m[3]);
  const dt = new Date(Y, M - 1, D, 12, 0, 0);
  dt.setDate(dt.getDate() + Number(deltaDays || 0));
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}
function minutesOf(hhmm) {
  const m = String(hhmm || "").match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (![hh, mm].every(Number.isFinite)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}
function buildLocalRangeFromItem(baseYmd, item) {

  const baseDate = String(baseYmd || "").match(/^\d{4}-\d{2}-\d{2}$/) ? baseYmd : todayYmdLocal();
  const sMin = minutesOf(item?.startHHMM);
  const eMin = minutesOf(item?.endHHMM);
  if (sMin == null || eMin == null) return { startAtLocal: "", endAtLocal: "" };

  const startAtLocal = `${baseDate}T${item.startHHMM}`;
  const endDate = eMin <= sMin ? addDaysYmd(baseDate, 1) : baseDate;
  const endAtLocal = `${endDate}T${item.endHHMM}`;
  return { startAtLocal, endAtLocal };
}

// datetime-local (Istanbul local) -> UTC ISO
const IST_OFFSET_MIN = 180;
function istanbulLocalToUtcIso(dtLocal) {

  if (!dtLocal) return null;
  const [d, t] = String(dtLocal).split("T");
  if (!d || !t) return null;

  const [Y, M, D] = d.split("-").map(Number);
  const [h, m] = t.split(":").map(Number);
  if (![Y, M, D, h, m].every(Number.isFinite)) return null;

  const utcMs = Date.UTC(Y, M - 1, D, h, m, 0) - IST_OFFSET_MIN * 60 * 1000;
  return new Date(utcMs).toISOString();
}


function avgLatLng(list) {
  if (!list?.length) return null;
  let sumLat = 0;
  let sumLng = 0;
  let n = 0;
  for (const p of list) {
    const lat = Number(p?.homeLat);
    const lng = Number(p?.homeLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    sumLat += lat;
    sumLng += lng;
    n++;
  }
  if (!n) return null;
  return { lat: sumLat / n, lng: sumLng / n };
}

export default function PlanBuilderPanel({
  token,
  templateOptions,
  rangeOverride,
  hideDraftTransferUI = false,
  directionOverride,
  patternOverride,
  onUseDraft,
  onAfterApply,
}) {
  const { me } = useSession();
  const who = personLabel(me);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  // Stage-1: OSRM matrix per draft-vehicle
  const [mxBusy, setMxBusy] = useState({}); // { [idx]: true }
  const [mxRes, setMxRes] = useState({}); // { [idx]: { ok, n, avgMin, avgKm, error } }
  const [mxPayload, setMxPayload] = useState({}); // { [idx]: { durationsSec, distancesM, points } }

  // Stage-2: route solve (OR-Tools optional)
  const [solveBusy, setSolveBusy] = useState({}); // { [idx]: true }
  const [solveRes, setSolveRes] = useState({}); // { [idx]: { ok, solver, totalMin, totalKm, orderIds, orderNames } }

  // Stage-3: apply (create shifts + people + stops + reorder)
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyRes, setApplyRes] = useState(null); // { ok, created:[{shiftId, seatDemand, stopCount, solver?}] }

  // --- M33.6b BULK OFFER MODAL (PlanBuilder) ---
  const [pbRooms, setPbRooms] = useState([]);
  const [pbRoomsBusy, setPbRoomsBusy] = useState(false);

  const [bulkOffer, setBulkOffer] = useState({
    open: false,
    shiftIds: [],
    q: "",
    roomsSel: {}, // { [roomId]: true }
    amountCompany: (() => { const n = Number(""); return Number.isFinite(n) && n > 0 ? n : undefined; })(),
    noteCompany: (() => { const v = (""); return (v === null || v === undefined) ? "" : String(v); })(),
    busy: false,
    err: "",
    done: false,
    sent: 0,
    info: "",
    skippedRoomIds: [],
  });

  async function ensureRoomsLoaded() {
    if (pbRooms?.length) return;
    setPbRoomsBusy(true);
    try {
      const r = await api("/api/rooms?take=500", { method: "GET", token });
      setPbRooms(Array.isArray(r?.items) ? r.items : (Array.isArray(r) ? r : []));
    } catch (e) {
      // keep silent, modal shows error on send
      console.warn("rooms load failed", e);
    } finally {
      setPbRoomsBusy(false);
    }
  }

  function openBulkOfferModal(shiftIds) {
    const ids = Array.isArray(shiftIds) ? shiftIds.filter(Boolean) : [];
    if (!ids.length) return;
    setBulkOffer((p) => ({
      ...p,
      open: true,
      shiftIds: ids,
      roomsSel: {},
      q: "",
      amountCompany: (() => { const n = Number(""); return Number.isFinite(n) && n > 0 ? n : undefined; })(),
      noteCompany: (() => { const v = (""); return (v === null || v === undefined) ? "" : String(v); })(),
      busy: false,
      err: "",
      done: false,
      sent: 0,
    info: "",
    skippedRoomIds: [],
    }));
    ensureRoomsLoaded();
  }

  async function sendBulkOffers() {
    const roomIds = Object.entries(bulkOffer.roomsSel || {})
      .filter(([_, v]) => !!v)
      .map(([k]) => Number(k))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (!bulkOffer.shiftIds?.length) return;
    if (!roomIds.length) {
      setBulkOffer((p) => ({ ...p, err: "En az 1 room seç." }));
      return;
    }

    setBulkOffer((p) => ({ ...p, busy: true, err: "", info: "", done: false, sent: 0, skippedRoomIds: [] }));
    try {
      const amt = String(bulkOffer.amountCompany || "").trim();
      const note = String(bulkOffer.noteCompany || "").trim();
      const amountCompany = amt ? Number(amt) : null;

      let sent = 0;
      const skipped = new Set();

      for (const sid of bulkOffer.shiftIds) {
        const resp = await api("/api/shifts/" + sid + "/offers", {
          method: "POST",
          token,
          body: {
            roomIds,
            amountCompany: (() => {
              const n = Number(Number.isFinite(amountCompany) ? amountCompany : null);
              return Number.isFinite(n) && n > 0 ? n : undefined;
            })(),
            noteCompany: (() => {
              const v = note || null;
              return v == null ? "" : String(v);
            })(),
          },
        });

        if (resp && Array.isArray(resp.skippedRoomIds)) {
          for (const rid of resp.skippedRoomIds) {
            const n = Number(rid);
            if (Number.isFinite(n) && n > 0) skipped.add(n);
          }
        }

        sent++;
        setBulkOffer((p) => ({ ...p, sent }));
      }

      const skippedRoomIds = Array.from(skipped);
      const info = skippedRoomIds.length
        ? `Not: ${skippedRoomIds.length} room teklif atlandı (aktif sözleşme çakışması).`
        : "";

      setBulkOffer((p) => ({ ...p, done: true, busy: false, info, skippedRoomIds }));

      // ✅ Akış: teklif gönderimi bittikten sonra Market Shifts'e odakla (menü gezdirmesin)
      try {
        window.dispatchEvent(
          new CustomEvent("company:shifts:focus", {
            detail: { section: "market", shiftIds: bulkOffer.shiftIds },
          })
        );
      } catch {}

      // modal'ı kapat (ekranı serbest bırak)
      setTimeout(() => {
        setBulkOffer((p) => ({ ...p, open: false }));
      }, 150);
    } catch (e) {
      setBulkOffer((p) => ({ ...p, err: String(e?.message || e) }));
    } finally {
      setBulkOffer((p) => ({ ...p, busy: false }));
    }
  }
  // --- /M33.6b ---
  const [maxWalkM, setMaxWalkM] = useState("400");
  const [autoReorderStops, setAutoReorderStops] = useState(true);

  // Inputs
  const [onlyOk, setOnlyOk] = useState(true);
  const [capacity, setCapacity] = useState("16");
  const [precision, setPrecision] = useState("6");
  const [baseDate, setBaseDate] = useState(() => todayYmdLocal());
  const [tplKey, setTplKey] = useState(() => (templateOptions?.[0]?.key ? String(templateOptions[0].key) : ""));
  const [transferAsMarket, setTransferAsMarket] = useState(true);

  useEffect(() => {
    if (tplKey) return;
    if (templateOptions?.[0]?.key) setTplKey(String(templateOptions[0].key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateOptions?.length]);

  async function load() {
    setErr("");
    setBusy(true);
    try {
      const res = await api("/api/company/personels", { token });
      const list = Array.isArray(res) ? res : res?.items ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    let total = 0;
    let ok = 0;
    let needs = 0;
    let failed = 0;
    let missingLoc = 0;

    for (const p of items || []) {
      total++;
      const lat = Number(p?.homeLat);
      const lng = Number(p?.homeLng);
      const hasLoc = Number.isFinite(lat) && Number.isFinite(lng);
      if (!hasLoc) missingLoc++;

      if (p?.geoStatus === "OK") ok++;
      else if (p?.geoStatus === "NEEDS_REVIEW") needs++;
      else if (p?.geoStatus === "FAILED") failed++;
    }
    return { total, ok, needs, failed, missingLoc };
  }, [items]);

  const eligible = useMemo(() => {
    return (items || [])
      .filter((p) => {
        const lat = Number(p?.homeLat);
        const lng = Number(p?.homeLng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
        if (onlyOk) return p?.geoStatus === "OK";
        return true;
      })
      .map((p) => ({
        id: p.id,
        fullName: p.fullName,
        homeLat: Number(p.homeLat),
        homeLng: Number(p.homeLng),
        geoStatus: p.geoStatus,
      }));
  }, [items, onlyOk]);

  const plan = useMemo(() => {
    const cap = Math.max(1, Number(capacity) || 1);
    const prec = Math.max(1, Math.min(12, Number(precision) || 6));

    const groups = new Map(); // geohash -> people[]
    for (const p of eligible) {
      const key = encodeGeohash(p.homeLat, p.homeLng, prec);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }

    const entries = Array.from(groups.entries()).sort((a, b) => (b[1]?.length || 0) - (a[1]?.length || 0));

    const vehicles = []; // [{people:[], groupKeys:Set, centroid:{lat,lng}}]
    for (const [key, people] of entries) {
      const remaining = [...people];
      while (remaining.length) {
        let v = vehicles.find((x) => (x.people?.length || 0) < cap);
        if (!v) {
          v = { people: [], groupKeys: new Set() };
          vehicles.push(v);
        }
        const space = cap - v.people.length;
        const take = Math.min(space, remaining.length);
        v.people.push(...remaining.splice(0, take));
        v.groupKeys.add(key);
      }
    }

    for (const v of vehicles) {
      v.centroid = avgLatLng(v.people);
    }

    const recommended = Math.ceil((eligible.length || 0) / cap);

    return {
      cap,
      prec,
      groups: entries,
      vehicles,
      recommended,
      total: eligible.length,
    };
  }, [eligible, capacity, precision]);

  const selectedTpl = useMemo(() => templateOptions?.find((x) => x.key === tplKey) || null, [templateOptions, tplKey]);

  const range = useMemo(() => {
    // If parent provides a range (Step-1: Şablon & Zaman), trust it.
    const s = String(rangeOverride?.startAtLocal || "").trim();
    const e = String(rangeOverride?.endAtLocal || "").trim();
    if (s && e) return { startAtLocal: s, endAtLocal: e };
    return buildLocalRangeFromItem(baseDate, selectedTpl?.item);
  }, [rangeOverride?.startAtLocal, rangeOverride?.endAtLocal, baseDate, selectedTpl]);

  const activeDirection = useMemo(() => {
    const raw = String(directionOverride || selectedTpl?.item?.direction || "INBOUND").toUpperCase();
    return raw === "OUTBOUND" ? "OUTBOUND" : "INBOUND";
  }, [directionOverride, selectedTpl]);

  const activePattern = useMemo(() => {
    const raw = String(patternOverride || selectedTpl?.item?.pattern || "ONE_WAY").toUpperCase();
    return raw === "LOOP" ? "LOOP" : "ONE_WAY";
  }, [patternOverride, selectedTpl]);

  function transferVehicleToRequest(v) {
    if (!onUseDraft) return;
    const seatDemand = v?.people?.length || 0;
    onUseDraft({
      startAtLocal: range.startAtLocal,
      endAtLocal: range.endAtLocal,
      seatDemand,
      templateKey: tplKey,
      marketMode: transferAsMarket,
    });
  }

  function summarizeMatrix(payload) {
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

  async function computeMatrixForVehicle(v, idx) {
    setErr("");
    setMxRes((p) => ({ ...p, [idx]: null }));
    setMxPayload((p) => ({ ...p, [idx]: null }));
    setMxBusy((p) => ({ ...p, [idx]: true }));
    try {
      const points = (v?.people || []).map((p) => ({ id: p.id, lat: p.homeLat, lng: p.homeLng }));
      const out = await api("/api/plan-builder/osrm-table", {
        method: "POST",
        token,
        body: { points, profile: "driving" },
      });
      if (!out?.ok) {
        setMxRes((p) => ({ ...p, [idx]: { ok: false, error: out?.error || "osrmError", detail: out?.detail } }));
        return null;
      }
      setMxPayload((p) => ({ ...p, [idx]: out }));
      const s = summarizeMatrix(out);
      setMxRes((p) => ({ ...p, [idx]: s.ok ? s : { ok: false, error: s.error } }));
      return out;
    } catch (e) {
      setMxRes((p) => ({ ...p, [idx]: { ok: false, error: e?.message || String(e) } }));
      return null;
    } finally {
      setMxBusy((p) => {
        const nx = { ...p };
        delete nx[idx];
        return nx;
      });
    }
  }

  function fmtMin(sec) {
    const s = Number(sec);
    if (!Number.isFinite(s) || s < 0) return null;
    return Math.max(0, Math.round(s / 60));
  }
  function fmtKm(m) {
    const x = Number(m);
    if (!Number.isFinite(x) || x < 0) return null;
    return Number((x / 1000).toFixed(1));
  }

  async function solveRouteForVehicle(v, idx) {
    setErr("");
    setSolveRes((p) => ({ ...p, [idx]: null }));
    setSolveBusy((p) => ({ ...p, [idx]: true }));
    try {
      let payload = mxPayload?.[idx];
      if (!payload?.ok) {
        // auto-fetch matrix if missing
        payload = await computeMatrixForVehicle(v, idx);
      }
      if (!payload?.ok) {
        setSolveRes((p) => ({ ...p, [idx]: { ok: false, error: "matrixMissing" } }));
        return;
      }

      const pointIds = (payload.points || []).map((p) => p.id);

      const out = await api("/api/plan-builder/solve-vrp", {
        method: "POST",
        token,
        body: {
          durationsSec: payload.durationsSec,
          distancesM: payload.distancesM,
          pointIds,
          depotIndex: 0,
          returnToDepot: false,
          preferOrtools: true,
        },
      });

      if (!out?.ok) {
        setSolveRes((p) => ({ ...p, [idx]: { ok: false, error: out?.error || "solveError" } }));
        return;
      }

      const orderIds = Array.isArray(out.orderPointIds) ? out.orderPointIds : null;
      const byId = new Map((v?.people || []).map((p) => [p.id, p.fullName]));
      const orderNames = orderIds ? orderIds.map((id) => byId.get(id) || String(id)) : [];

      setSolveRes((p) => ({
        ...p,
        [idx]: {
          ok: true,
          solver: out.solver,
          totalMin: fmtMin(out.totalDurationSec),
          totalKm: fmtKm(out.totalDistanceM),
          orderIds,
          orderNames,
        },
      }));
    } catch (e) {
      setSolveRes((p) => ({ ...p, [idx]: { ok: false, error: e?.message || String(e) } }));
    } finally {
      setSolveBusy((p) => {
        const nx = { ...p };
        delete nx[idx];
        return nx;
      });
    }
  }


  async function applyPlanToShifts() {
    setErr("");
    setApplyRes(null);

    const startAt = istanbulLocalToUtcIso(range.startAtLocal);
    const endAt = istanbulLocalToUtcIso(range.endAtLocal);
    if (!startAt || !endAt) {
      setErr("Start/End geçersiz. Şablon + tarih seç.");
      return;
    }

    const mw = Math.min(2000, Math.max(50, Number(maxWalkM) || 250));

    setApplyBusy(true);
    try {
      // Company hub (optional but recommended for route preview / INBOUND end anchor)
      let hubLat = null;
      let hubLng = null;
      try {
        const hub = await api("/api/company/hub", { method: "GET", token });
        hubLat = typeof hub?.hubLat === "number" ? hub.hubLat : null;
        hubLng = typeof hub?.hubLng === "number" ? hub.hubLng : null;
      } catch {
        // ignore (hub optional)
      }

      const created = [];
      const vehicles = plan?.vehicles || [];

      for (let idx = 0; idx < vehicles.length; idx++) {
        const v = vehicles[idx];
        const seatDemand = v?.people?.length || 0;
        if (!seatDemand) continue;

        try {
          // 1) create market shift (roomId null)
          const shift = await api("/api/shifts", {
            method: "POST",
            token,
            body: { startAt, endAt, status: "REQUESTED", hubLat, hubLng, direction: activeDirection, pattern: activePattern },
          });

          const shiftId = Number(shift?.id);
          if (!shiftId) throw new Error("shiftCreateFailed");

          // 2) attach people
          const peopleItems = (v.people || []).map((p) => ({
            personelId: p.id,
            fullName: p.fullName,
            lat: p.homeLat,
            lng: p.homeLng,
            geoManualOverride: true,
          }));

          await api(`/api/shifts/${shiftId}/people?mode=REPLACE`, {
            method: "PUT",
            token,
            body: { items: peopleItems },
          });

          // 3) generate stops (COMMON clusters + assignments)
          await api(`/api/shifts/${shiftId}/stops/generate?mode=REPLACE&maxWalkM=${mw}`, {
            method: "POST",
            token,
            body: {},
          });

          let stopCount = null;
          let solver = null;
          let totalMin = null;
          let totalKm = null;

          if (autoReorderStops) {
            // 4) fetch shift stops
            const stopsResp = await api(`/api/shifts/${shiftId}/stops`, { method: "GET", token });
            const stops = Array.isArray(stopsResp) ? stopsResp : (Array.isArray(stopsResp?.items) ? stopsResp.items : (Array.isArray(stopsResp?.stops) ? stopsResp.stops : []));
            stopCount = stops.length;

            if (stops.length >= 2) {
              const points = stops.map((s) => ({ id: s.id, lat: Number(s.lat), lng: Number(s.lng) }));
              const mx = await api("/api/plan-builder/osrm-table", {
                method: "POST",
                token,
                body: { points, profile: "driving" },
              });

              if (mx?.ok) {
                const pointIds = points.map((x) => x.id);
                const sv = await api("/api/plan-builder/solve-vrp", {
                  method: "POST",
                  token,
                  body: {
                    durationsSec: mx.durationsSec,
                    distancesM: mx.distancesM,
                    pointIds,
                    depotIndex: 0,
                    returnToDepot: false,
                    preferOrtools: true,
                  },
                });

                if (sv?.ok && Array.isArray(sv.orderPointIds) && sv.orderPointIds.length === pointIds.length) {
                  await api(`/api/shifts/${shiftId}/stops/reorder`, {
                    method: "PUT",
                    token,
                    body: { idsInOrder: sv.orderPointIds },
                  });

                  solver = sv.solver;
                  totalMin = fmtMin(sv.totalDurationSec);
                  totalKm = fmtKm(sv.totalDistanceM);
                }
              }
            }
          }

          created.push({ ok: true, shiftId, seatDemand, stopCount, solver, totalMin, totalKm });
        } catch (e) {
          created.push({ ok: false, idx, error: String(e?.message || e) });
        }
      }

      setApplyRes({ ok: true, created });
      // M33.6b: open bulk offer modal automatically after apply
      try {
        const okShiftIds = (created || []).filter((x) => x && x.ok && x.shiftId).map((x) => x.shiftId);
        openBulkOfferModal(okShiftIds);
      } catch (e) {}      if (typeof onAfterApply === "function") onAfterApply(created);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setApplyBusy(false);
    }
  }
   const openShiftToolsGeocode = () => {
    try {
      const btn = Array.from(document.querySelectorAll("button")).find(
        (b) => (b.textContent || "").trim() === "Shift Tools"
      );
      if (btn) btn.click();
      setTimeout(() => {
        const el = document.getElementById("shift-tools-geocode");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (e) {}
  };
 return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ marginTop: 0 }}>Plan Builder (Stage-3)</h3>
          <div className="muted">
            Stage-0: kişi sayısı + kapasite → araç sayısı, geohash/cluster → taslak dağıtım. • Stage-1: OSRM Table. • Stage-2: rota sırası (OR-Tools varsa) / fallback: basit heuristic.
          </div>
        </div>
        <button type="button" onClick={load} disabled={busy} title={`${who} listesini yenile`}>
          {busy ? "..." : "Yenile"}
        </button>
      </div>

      {err ? <div className="card err">{err}</div> : null}

            <div className="card" style={{ marginTop: 10 }}>
        <h3 style={{ marginTop: 0 }}>İş Akışı</h3>
        <div className="muted">
          <b>Plan Builder</b>: toplu üretim (cluster/OSRM/OR-Tools) → <b>Uygula</b> → market shift(ler).
          <br />
          <b>Manuel Talep</b>: tekil talep (istisna/düzeltme).
          <br />
          <b>Shift Tools</b>: shift sonrası personel/durak/konum düzeltme (Adresten Bul).
        </div>
      </div>
<div className="grid" style={{ marginTop: 10 }}>
        <div className="col">
          <div style={{ fontWeight: 800 }}>{who} Özeti</div>
          <div className="muted">
            Toplam: <b>{stats.total}</b> • OK: <b>{stats.ok}</b> • NEEDS_REVIEW: <b>{stats.needs}</b> • FAILED: <b>{stats.failed}</b> • Konum eksik: <b>{stats.missingLoc}</b>
          </div>
          {stats.needs || stats.failed || stats.missingLoc ? (
            <div className="muted" style={{ marginTop: 6 }}>
              Not: Stage-0 için varsayılan filtre <b>geoStatus=OK</b> ve <b>lat/lng var</b>. Geo Review bitmeden plan doğruluğu düşer.              <div style={{ marginTop: 8 }}>
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

          <div className="grid" style={{ gap: 10 }}>
            <div className="col">
              <label className="muted">Araç kapasitesi (koltuk)</label>
              <input value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="örn. 16" />
            </div>
            <div className="col">
              <label className="muted">Geohash precision</label>
              <select value={precision} onChange={(e) => setPrecision(e.target.value)}>
                <option value="5">5 (daha geniş)</option>
                <option value="6">6 (öneri)</option>
                <option value="7">7 (daha dar)</option>
                <option value="8">8 (çok dar)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <hr />

      {!hideDraftTransferUI ? (
        <div className="grid">
        <div className="col">
          <div style={{ fontWeight: 800 }}>Taslak Vardiya Zamanı (Talep ekranına aktarım için)</div>
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
          <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <input type="checkbox" checked={transferAsMarket} onChange={(e) => setTransferAsMarket(e.target.checked)} />
            Talep ekranına Market modunda aktar
          </label>
          <div className="muted" style={{ marginTop: 6 }}>
            Aktarım sonucu: Start=<b>{range.startAtLocal || "-"}</b> • End=<b>{range.endAtLocal || "-"}</b>
          </div>
        </div>

        <div className="col">
          <div style={{ fontWeight: 800 }}>Öneri</div>
          <div className="muted">
            Eligible: <b>{plan.total}</b> kişi • Kapasite: <b>{plan.cap}</b> → Önerilen araç: <b>{plan.recommended}</b>
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Üretilen taslak araç sayısı: <b>{plan.vehicles.length}</b> • Geohash grup sayısı: <b>{plan.groups.length}</b>
          </div>
        </div>
      </div>
      ) : null}

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Araç / Cluster Önizleme</div>
        <div className="muted" style={{ marginBottom: 8 }}>
          OSRM matrisi için infra’da OSRM servisini çalıştırabilirsin (docker compose profile: <b>osrm</b>). OSRM yoksa buton hata döndürür ama UI bozulmaz.
        </div>
        <div className="grid" style={{ gap: 10, alignItems: "end", marginBottom: 10 }}>
          <div className="col">
            <label className="muted">Stops generate maxWalkM (m)</label>
            <input value={maxWalkM} onChange={(e) => setMaxWalkM(e.target.value)} placeholder="250" />
          </div>
          <div className="col">
            <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
              <input type="checkbox" checked={autoReorderStops} onChange={(e) => setAutoReorderStops(e.target.checked)} />
              Stops’u OSRM+Solver ile sırala
            </label>
            <div className="muted">
              Uygula: Yeni Talep’e girmeden direkt market shift(ler) oluşturur; personelleri bağlar, stop üretir (COMMON) ve (opsiyonel) stop sırasını optimize eder.
            </div>
          </div>
          <div className="col" style={{ justifyContent: "end" }}>
            <button type="button" disabled={applyBusy || !plan.total || !range.startAtLocal || !range.endAtLocal} onClick={applyPlanToShifts}>
              {applyBusy ? "Uygulanıyor…" : "Uygula: N market shift oluştur"}
            </button>
          </div>
        </div>
        {applyRes?.ok ? (
          <div className="muted" style={{ marginBottom: 8 }}>
            Oluşturulan: <b>{(applyRes.created || []).filter((x) => x.ok).length}</b> • Hata: <b>{(applyRes.created || []).filter((x) => !x.ok).length}</b>
          </div>
        ) : null}
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
                <th>OSRM</th>
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
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <b>{v.people.length}</b>
                    </td>
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
                        <span title="Ortalama çiftler arası süre/mesafe (yaklaşık)">
                          ~{mx.avgMin} dk{mx.avgKm != null ? ` • ~${mx.avgKm} km` : ""}
                        </span>
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
                        <button type="button" onClick={() => computeMatrixForVehicle(v, idx)} disabled={mxIsBusy || (v.people?.length || 0) < 2}>
                          Matris al
                        </button>
                        <button
                          type="button"
                          style={{ marginLeft: 6 }}
                          onClick={() => solveRouteForVehicle(v, idx)}
                          disabled={svIsBusy || (v.people?.length || 0) < 2}
                          title="Stage-2: rota sırası çöz (OR-Tools varsa)"
                        >
                          Çöz
                        </button>
                      </div>
                    </td>
                    <td>
                      <button type="button" disabled={!range.startAtLocal || !range.endAtLocal} onClick={() => transferVehicleToRequest(v)}>
                        Talep ekranına aktar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
          {/* --- M33.6b BULK OFFER MODAL UI --- */}
      {bulkOffer.open ? (
        <div className="modal-backdrop">
          <div className="modal card" style={{ maxWidth: 900 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: 4 }}>Toplu Teklif Gönder</h3>
                <div className="muted">
                  Oluşturulan shift’lere toplu teklif gönder: <b>#{bulkOffer.shiftIds.join(", #")}</b>
                </div>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => setBulkOffer((p) => ({ ...p, open: false }))}
                disabled={bulkOffer.busy}
              >
                Kapat
              </button>
            </div>

            <div className="row" style={{ gap: 12, marginTop: 12, flexWrap: "wrap" }}>
              <div className="col" style={{ minWidth: 260 }}>
                <label className="muted">Room ara</label>
                <input
                  value={bulkOffer.q}
                  onChange={(e) => setBulkOffer((p) => ({ ...p, q: e.target.value }))}
                  placeholder="name contains"
                  disabled={bulkOffer.busy}
                />
                <div className="muted" style={{ marginTop: 8 }}>
                  {pbRoomsBusy ? "Room listesi yükleniyor..." : ("Toplam room: " + ((pbRooms?.length ?? 0)))}
                </div>
              </div>

              <div className="col" style={{ minWidth: 160 }}>
                <label className="muted">Tutar (opsiyonel)</label>
                <input
                  value={bulkOffer.amountCompany}
                  onChange={(e) => setBulkOffer((p) => ({ ...p, amountCompany: (() => { const n = Number(e.target.value ); return Number.isFinite(n) && n > 0 ? n : undefined; })()}))}
                  placeholder="örn. 2500"
                  disabled={bulkOffer.busy}
                />
              </div>

              <div className="col" style={{ minWidth: 260 }}>
                <label className="muted">Not (opsiyonel)</label>
                <input
                  value={bulkOffer.noteCompany}
                  onChange={(e) => setBulkOffer((p) => ({ ...p, noteCompany: (() => { const v = (e.target.value ); return (v === null || v === undefined) ? "" : String(v); })()}))}
                  placeholder="örn. sabah giriş"
                  disabled={bulkOffer.busy}
                />
              </div>
            </div>

            <div className="card" style={{ marginTop: 12, maxHeight: 320, overflow: "auto" }}>
              {(pbRooms || [])
                .filter((r) => {
                  const q = String(bulkOffer.q || "").trim().toLowerCase();
                  if (!q) return true;
                  return String(r?.name || "").toLowerCase().includes(q);
                })
                .map((r) => (
                  <label key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 4px" }}>
                    <input
                      type="checkbox"
                      checked={!!bulkOffer.roomsSel?.[r.id]}
                      onChange={(e) =>
                        setBulkOffer((p) => ({ ...p, roomsSel: { ...(p.roomsSel || {}), [r.id]: e.target.checked } }))
                      }
                      disabled={bulkOffer.busy}
                    />
                    <span>
                      {r?.name} <span className="muted">#{r.id}</span>
                    </span>
                    {r?.hasHub ? <span className="pill ok">HUB</span> : null}
                  </label>
                ))}
              {!pbRooms?.length ? <div className="muted">Room listesi boş.</div> : null}
            </div>

            {bulkOffer.err ? <div className="err" style={{ marginTop: 10 }}>{bulkOffer.err}</div> : null}
            {bulkOffer.done ? (
              <div className="ok" style={{ marginTop: 10 }}>
                Gönderildi ✅ (shift sayısı: {bulkOffer.sent})
              </div>
            ) : null}

            <div className="row" style={{ justifyContent: "end", marginTop: 12, gap: 8 }}>
              <button type="button" className="secondary"
                onClick={() => setBulkOffer((p) => ({ ...p, roomsSel: {} }))}
                disabled={bulkOffer.busy}
              >
                Temizle
              </button>
              <button type="button" onClick={sendBulkOffers} disabled={bulkOffer.busy}>
                {bulkOffer.busy ? "Gönderiliyor..." : "Toplu Teklifleri Gönder"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {/* --- /M33.6b --- */}
</div>
  );
}



