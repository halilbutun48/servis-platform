// web/src/panels/company/PlanBuilderPanel.jsx


import { useEffect, useMemo, useState, useRef as _useRef, useCallback as _useCallback } from "react";
import { api } from "../../api";
import { getApiErrorMessage } from "../../utils/apiContract";
import RoutePreviewModal from "../../components/RoutePreviewModal";
import { personLabel } from "../../utils/labels";
import { useSession } from "../../state/session";
import {
  avgLatLng,
  buildLocalRangeFromItem,
  encodeGeohash,
  istanbulLocalToUtcIso as _istanbulLocalToUtcIso,
  todayYmdLocal,
} from "./planBuilderPanelUtils";
import {
  applyPlanBuilderToShifts,
  computePlanBuilderMatrix,
  createPlanBuilderMarketOffer,
  ensurePlanBuilderRoomsLoaded,
  openPlanBuilderVehiclePreview,
  sendPlanBuilderBulkOffers,
  solvePlanBuilderRoute,
} from "./planBuilderPanelActions";
import {
  PlanBuilderBulkOfferModal,
  PlanBuilderDraftGroupsSection,
  PlanBuilderHeaderBar,
  PlanBuilderWorkflowSection,
  PlanBuilderSummaryParamsSection,
  PlanBuilderDraftTimingSection,
} from "./planBuilderPanelSections";

export default function PlanBuilderPanel({
  token,
  templateOptions,
  rangeOverride,
  hideDraftTransferUI = false,
  directionOverride,
  patternOverride,
  onAfterApply,
}) {
  const { me } = useSession();
  const who = personLabel(me);
  const companyDefaultMaxWalkM = me?.companyKind === "SCHOOL" ? 50 : 250;

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
  const [previewBusy, setPreviewBusy] = useState({}); // { [idx]: true }

  // Stage-3: apply (create shifts + people + stops + reorder)
  const [_applyBusy, setApplyBusy] = useState(false);
  const [_applyRes, setApplyRes] = useState(null); // { ok, created:[{shiftId, seatDemand, stopCount, solver?}] }

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
    return ensurePlanBuilderRoomsLoaded({ api, token, pbRooms, setPbRoomsBusy, setPbRooms });
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
    return sendPlanBuilderBulkOffers({
      api,
      token,
      bulkOffer,
      setBulkOffer,
      dispatchWindow: typeof window !== "undefined" ? window : null,
      closeDelayMs: 150,
    });
  }
  // --- /M33.6b ---
  const [maxWalkM, setMaxWalkM] = useState(() => String(me?.companyKind === "SCHOOL" ? 50 : 250));
  const [autoReorderStops, setAutoReorderStops] = useState(true);

  // Inputs
  const [onlyOk, setOnlyOk] = useState(true);
  // Company tarafında nihai araç kapasitesi belirlenmez; Stage-3 taslak gruplama kapasite ile bölünmez.
  const [precision, setPrecision] = useState("6");
  const [baseDate, setBaseDate] = useState(() => todayYmdLocal());
  const [tplKey, setTplKey] = useState(() => (templateOptions?.[0]?.key ? String(templateOptions[0].key) : ""));
  const _transferAsMarket = true;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rowOfferBusy, setRowOfferBusy] = useState({});
  const [routePreview, setRoutePreview] = useState({
    open: false,
    title: "",
    stops: [],
    people: [],
    previewSummary: null,
    previewPathPoints: null,
    previewSource: null,
    previewShift: null,
  });

  useEffect(() => {
    if (tplKey) return;
    if (templateOptions?.[0]?.key) setTplKey(String(templateOptions[0].key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateOptions?.length]);

  useEffect(() => {
    setMaxWalkM((prev) => {
      const current = Number(prev);
      if (!String(prev || "").trim() || current === 50 || current === 250) {
        return String(companyDefaultMaxWalkM);
      }
      return prev;
    });
  }, [companyDefaultMaxWalkM]);

  async function load() {
    setErr("");
    setBusy(true);
    try {
      const res = await api("/api/company/personels", { token });
      const list = Array.isArray(res) ? res : res?.items ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(getApiErrorMessage(e));
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
    const prec = Math.max(1, Math.min(12, Number(precision) || 6));

    const groups = new Map(); // geohash -> people[]
    for (const p of eligible) {
      const key = encodeGeohash(p.homeLat, p.homeLng, prec);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }

    const entries = Array.from(groups.entries()).sort((a, b) => (b[1]?.length || 0) - (a[1]?.length || 0));

    const vehicles = entries.map(([key, people]) => ({
      people: [...people],
      groupKeys: new Set([key]),
      centroid: avgLatLng(people),
    }));

    const recommended = vehicles.length;

    return {
      prec,
      groups: entries,
      vehicles,
      recommended,
      total: eligible.length,
    };
  }, [eligible, precision]);

  const planVehicleSignature = useMemo(
    () => JSON.stringify((plan?.vehicles || []).map((v) => (v?.people || []).map((p) => String(p?.id ?? "")))),
    [plan]
  );

  useEffect(() => {
    setMxBusy({});
    setMxRes({});
    setMxPayload({});
    setSolveBusy({});
    setSolveRes({});
    setRowOfferBusy({});
    setPreviewBusy({});
  }, [planVehicleSignature, rangeOverride?.startAtLocal, rangeOverride?.endAtLocal, tplKey, baseDate, onlyOk, precision]);

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

  async function openVehiclePreview(v, idx) {
    return openPlanBuilderVehiclePreview({
      api,
      token,
      vehicle: v,
      idx,
      solveRes,
      maxWalkM,
      companyDefaultMaxWalkM,
      direction: activeDirection,
      pattern: activePattern,
      setRoutePreview,
      setErr,
      setPreviewBusy,
    });
  }

  async function createMarketOfferForVehicle(v, idx) {
    return createPlanBuilderMarketOffer({
      api,
      token,
      vehicle: v,
      idx,
      range,
      direction: activeDirection,
      pattern: activePattern,
      maxWalkM,
      companyDefaultMaxWalkM,
      autoReorderStops,
      setErr,
      setRowOfferBusy,
      openBulkOfferModal,
    });
  }

  async function computeMatrixForVehicle(v, idx) {
    return computePlanBuilderMatrix({
      api,
      token,
      vehicle: v,
      idx,
      setErr,
      setMxRes,
      setMxPayload,
      setMxBusy,
    });
  }

  async function solveRouteForVehicle(v, idx) {
    return solvePlanBuilderRoute({
      api,
      token,
      vehicle: v,
      idx,
      mxPayload,
      computeMatrixForVehicle,
      setErr,
      setSolveRes,
      setSolveBusy,
    });
  }

  async function _applyPlanToShifts() {
    return applyPlanBuilderToShifts({
      api,
      token,
      plan,
      range,
      direction: activeDirection,
      pattern: activePattern,
      maxWalkM,
      companyDefaultMaxWalkM,
      autoReorderStops,
      setErr,
      setApplyRes,
      setApplyBusy,
      openBulkOfferModal,
      onAfterApply,
    });
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
    } catch { /* no-op */ }
  };
 return (
    <div className="card">
      <PlanBuilderHeaderBar who={who} busy={busy} onReload={load} />

      {err ? <div className="card err">{err}</div> : null}

      <PlanBuilderWorkflowSection />

      <PlanBuilderSummaryParamsSection
        who={who}
        stats={stats}
        onlyOk={onlyOk}
        setOnlyOk={setOnlyOk}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        precision={precision}
        setPrecision={setPrecision}
        openShiftToolsGeocode={openShiftToolsGeocode}
      />

      <hr />

      {!hideDraftTransferUI ? (
        <PlanBuilderDraftTimingSection
          baseDate={baseDate}
          setBaseDate={setBaseDate}
          tplKey={tplKey}
          setTplKey={setTplKey}
          templateOptions={templateOptions}
          range={range}
          plan={plan}
        />
      ) : null}

      <PlanBuilderDraftGroupsSection
        plan={plan}
        maxWalkM={maxWalkM}
        setMaxWalkM={setMaxWalkM}
        autoReorderStops={autoReorderStops}
        setAutoReorderStops={setAutoReorderStops}
        companyDefaultMaxWalkM={companyDefaultMaxWalkM}
        companyKind={me?.companyKind}
        mxRes={mxRes}
        mxBusy={mxBusy}
        solveRes={solveRes}
        solveBusy={solveBusy}
        previewBusy={previewBusy}
        rowOfferBusy={rowOfferBusy}
        range={range}
        solveRouteForVehicle={solveRouteForVehicle}
        openVehiclePreview={openVehiclePreview}
        createMarketOfferForVehicle={createMarketOfferForVehicle}
      />

      <RoutePreviewModal
        open={routePreview.open}
        onClose={() =>
          setRoutePreview({
            open: false,
            title: "",
            stops: [],
            people: [],
            previewSummary: null,
            previewPathPoints: null,
            previewSource: null,
            previewShift: null,
          })
        }
        title={routePreview.title}
        stops={routePreview.stops}
        people={routePreview.people}
        previewSummary={routePreview.previewSummary}
        previewPathPoints={routePreview.previewPathPoints}
        previewSource={routePreview.previewSource}
        previewShift={routePreview.previewShift}
      />

          {/* --- M33.6b BULK OFFER MODAL UI --- */}
      <PlanBuilderBulkOfferModal
        bulkOffer={bulkOffer}
        setBulkOffer={setBulkOffer}
        pbRooms={pbRooms}
        pbRoomsBusy={pbRoomsBusy}
        sendBulkOffers={sendBulkOffers}
      />
      {/* --- /M33.6b --- */}
</div>
  );
}



