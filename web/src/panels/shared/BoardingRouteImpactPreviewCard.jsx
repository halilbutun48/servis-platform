import { boardingChangeDecisionOwnerLabel, boardingChangeDecisionOwnerNote, boardingChangePreviewKindLabel } from "./boardingChangeUi";
import { resolvePersonDisplayLabel } from "../../utils/labels";
import { formatDateTimeTR } from "../../utils/time";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function firstText(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function formatSelectionTime(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    return formatDateTimeTR(text);
  } catch {
    return text;
  }
}

function formatNumber(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return Number.isInteger(n) ? String(n) : n.toFixed(digits);
}

function formatDelta(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  const sign = n > 0 ? "+" : "";
  return `${sign}${Number.isInteger(n) ? String(n) : n.toFixed(digits)}`;
}

function getStopCoord(stop) {
  if (!stop || typeof stop !== "object") return null;
  const lat = toNumber(stop.lat ?? stop.latitude ?? stop.y);
  const lng = toNumber(stop.lng ?? stop.lon ?? stop.longitude ?? stop.x);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function getStopLabel(stop, fallback = "") {
  if (!stop || typeof stop !== "object") return firstText(fallback);
  const coord = getStopCoord(stop);
  return firstText(
    stop.name,
    stop.label,
    stop.stopName,
    stop.title,
    stop.code,
    stop.stationName,
    stop.address,
    toNumber(stop.id) != null ? `Durak #${stop.id}` : "",
    coord ? `Durak ${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}` : "",
    fallback,
  );
}

function sameStop(a, b) {
  const left = getStopCoord(a);
  const right = getStopCoord(b);
  if (!left || !right) return false;
  return Math.abs(left.lat - right.lat) < 1e-6 && Math.abs(left.lng - right.lng) < 1e-6;
}

function findStopByLabel(stops = [], label = "") {
  const target = normalizeText(label);
  if (!target) return null;
  for (const stop of Array.isArray(stops) ? stops : []) {
    const candidate = normalizeText(getStopLabel(stop));
    if (!candidate) continue;
    if (candidate === target || candidate.includes(target) || target.includes(candidate)) {
      return stop;
    }
  }
  return null;
}

function findAssignedStop(request = null, preview = null) {
  const shift = request?.shiftRecord || request?.shift || null;
  const personId = toNumber(request?.personelId ?? request?.personel?.id ?? request?.person?.id ?? request?.selectedPersonId ?? null);
  const assignments = Array.isArray(shift?.assignments) ? shift.assignments : Array.isArray(request?.assignments) ? request.assignments : [];

  if (personId != null) {
    for (const assignment of assignments) {
      if (toNumber(assignment?.personelId) !== personId) continue;
      if (assignment?.stop && typeof assignment.stop === "object") return assignment.stop;
      if (assignment?.stopId != null) {
        return {
          id: assignment.stopId,
          name: assignment?.stop?.name || assignment?.stopName || assignment?.name || "",
          lat: assignment?.stop?.lat ?? assignment?.lat ?? null,
          lng: assignment?.stop?.lng ?? assignment?.lng ?? null,
          order: assignment?.stop?.order ?? assignment?.order ?? null,
        };
      }
    }
  }

  const stops = Array.isArray(shift?.stops) ? shift.stops : [];
  return findStopByLabel(stops, preview?.oldStopLabel || request?.oldStopLabel || request?.boardingChangeApplicationText || request?.detail || "");
}

function findRequestedStop(request = null, preview = null) {
  const shift = request?.shiftRecord || request?.shift || null;
  const fromMeta = request?.nearestStop && typeof request.nearestStop === "object" ? request.nearestStop : null;
  const fromAlt = request?.newStop && typeof request.newStop === "object" ? request.newStop : null;
  const fromLatLng = Number.isFinite(Number(request?.lat)) && Number.isFinite(Number(request?.lng))
    ? {
      lat: Number(request.lat),
      lng: Number(request.lng),
      name: request?.stopName || request?.requestReason || preview?.newStopLabel || "Yeni durak",
    }
    : null;
  const stops = Array.isArray(shift?.stops) ? shift.stops : [];
  const fromStops = findStopByLabel(stops, preview?.newStopLabel || request?.newStopLabel || request?.boardingChangeApplicationText || request?.detail || "");
  return fromMeta || fromAlt || fromLatLng || fromStops || null;
}

function buildMapModel(request = null, preview = null) {
  const shift = request?.shiftRecord || request?.shift || null;
  const routeStops = (Array.isArray(shift?.stops) ? shift.stops : [])
    .map((stop, index) => {
      const coord = getStopCoord(stop);
      if (!coord) return null;
      return {
        id: String(stop?.id ?? index),
        index: index + 1,
        label: getStopLabel(stop, `Durak ${index + 1}`),
        lat: coord.lat,
        lng: coord.lng,
      };
    })
    .filter(Boolean);

  const assignedStop = findAssignedStop(request, preview);
  const requestedStop = findRequestedStop(request, preview);

  const currentPoint = assignedStop && getStopCoord(assignedStop)
    ? { ...getStopCoord(assignedStop), label: getStopLabel(assignedStop, preview?.oldStopLabel || "Eski durak"), role: "current" }
    : null;
  const requestedPoint = requestedStop && getStopCoord(requestedStop)
    ? { ...getStopCoord(requestedStop), label: getStopLabel(requestedStop, preview?.newStopLabel || "Yeni durak"), role: "requested" }
    : null;

  const allPoints = [
    ...routeStops,
    currentPoint,
    requestedPoint,
  ].filter((point) => point && Number.isFinite(point.lat) && Number.isFinite(point.lng));

  return {
    routeStops,
    currentPoint,
    requestedPoint,
    allPoints,
    hasCoordinates: allPoints.length > 0,
    oldStopLabel: firstText(preview?.oldStopLabel, getStopLabel(currentPoint, "")),
    newStopLabel: firstText(preview?.newStopLabel, getStopLabel(requestedPoint, "")),
    routeNote: routeStops.length >= 2 ? "Duraklar ve rota çizgisi gösterilir." : "Koordinat varsa tekil durak marker'ı gösterilir.",
  };
}

function MiniMapPreview({ model }) {
  if (!model?.hasCoordinates) {
    return (
      <div style={{
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}>
        <div style={{ fontWeight: 800 }}>Harita önizlemesi için durak koordinatı eksik.</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>Bu değişiklik için rota etkisi metinsel olarak önizleniyor.</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>
          Eski durak: {model?.oldStopLabel || "-"} • Yeni/alternatif durak: {model?.newStopLabel || "-"}
        </div>
      </div>
    );
  }

  const pad = 18;
  const w = 320;
  const h = 180;
  const minLat = Math.min(...model.allPoints.map((p) => p.lat));
  const maxLat = Math.max(...model.allPoints.map((p) => p.lat));
  const minLng = Math.min(...model.allPoints.map((p) => p.lng));
  const maxLng = Math.max(...model.allPoints.map((p) => p.lng));
  const latSpan = Math.max(0.0001, maxLat - minLat);
  const lngSpan = Math.max(0.0001, maxLng - minLng);

  const scale = (point) => ({
    x: pad + ((point.lng - minLng) / lngSpan) * (w - pad * 2),
    y: h - pad - ((point.lat - minLat) / latSpan) * (h - pad * 2),
  });

  const routePoints = model.routeStops.map((point) => ({ ...point, ...scale(point) }));
  const currentPoint = model.currentPoint ? { ...model.currentPoint, ...scale(model.currentPoint) } : null;
  const requestedPoint = model.requestedPoint ? { ...model.requestedPoint, ...scale(model.requestedPoint) } : null;
  const linePoints = routePoints.length >= 2
    ? routePoints
    : (currentPoint && requestedPoint ? [currentPoint, requestedPoint] : []);

  return (
    <div style={{
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.03)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "10px 12px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800 }}>Mini harita önizlemesi</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>Readonly önizleme — rota uygulanmaz</div>
        </div>
        <span className="pill" data-status="INFO">Sadece etki analizi</span>
      </div>

      <div style={{ position: "relative", padding: 0 }}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 180, display: "block", background: "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(17,24,39,0.82))" }}>
          <defs>
            <pattern id="routePreviewGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={w} height={h} fill="url(#routePreviewGrid)" />

          {linePoints.length >= 2 ? (
            <polyline
              points={linePoints.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="rgba(96,165,250,0.9)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {routePoints.map((point, index) => (
            <g key={point.id || `${point.label}-${index}`}>
              <circle cx={point.x} cy={point.y} r="5" fill="rgba(255,255,255,0.80)" stroke="rgba(15,23,42,0.75)" strokeWidth="2" />
              <circle cx={point.x} cy={point.y} r="10" fill="transparent" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <text x={point.x + 8} y={point.y - 8} fontSize="10" fill="rgba(255,255,255,0.82)">
                {point.index}
              </text>
            </g>
          ))}

          {currentPoint ? (
            <g>
              <circle cx={currentPoint.x} cy={currentPoint.y} r="9" fill="rgba(245,158,11,0.96)" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
              <text x={currentPoint.x} y={currentPoint.y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="white">M</text>
            </g>
          ) : null}

          {requestedPoint ? (
            <g>
              <circle cx={requestedPoint.x} cy={requestedPoint.y} r="9" fill="rgba(59,130,246,0.96)" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
              <text x={requestedPoint.x} y={requestedPoint.y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="white">Y</text>
            </g>
          ) : null}

          {currentPoint && requestedPoint && !(sameStop(currentPoint, requestedPoint)) ? (
            <line
              x1={currentPoint.x}
              y1={currentPoint.y}
              x2={requestedPoint.x}
              y2={requestedPoint.y}
              stroke="rgba(34,197,94,0.72)"
              strokeWidth="2"
              strokeDasharray="6 5"
            />
          ) : null}
        </svg>

        <div style={{ position: "absolute", left: 10, top: 10 }}>
          <span className="pill" data-status="INFO">Readonly önizleme — rota uygulanmaz</span>
        </div>
      </div>

      <div style={{ padding: 12, display: "grid", gap: 6 }}>
        <div className="panelMeta">{model.routeNote}</div>
        <div className="panelMeta">
          Eski durak: {model.oldStopLabel || "-"} • Yeni/alternatif durak: {model.newStopLabel || "-"}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, note }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
      <div className="panelMeta" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>{value}</div>
      {note ? <div className="panelMeta" style={{ marginTop: 6 }}>{note}</div> : null}
    </div>
  );
}

export default function BoardingRouteImpactPreviewCard({
  preview = null,
  request = null,
  title = "Rota etkisi önizlemesi",
  loading = false,
  emptyText = "Seçim yapınca burada rota/durak etkisi görünür.",
  error = "",
  selectionLabel = "",
  selectionNote = "",
  decisionOwnerLabel = "",
  decisionOwnerNote = "",
  onClearSelection = null,
}) {
  const selectionLabelText = String(selectionLabel || "").trim();
  const selectionNoteText = String(selectionNote || "").trim();
  const decisionOwnerLabelText = firstText(decisionOwnerLabel, request?.decisionOwnerLabel, boardingChangeDecisionOwnerLabel(request));
  const decisionOwnerNoteText = firstText(decisionOwnerNote, request?.decisionOwnerNote, boardingChangeDecisionOwnerNote(request));
  const previewPersonLabel = resolvePersonDisplayLabel(preview, "Kişi bilgisi eksik");
  const safePreviewNote = String(preview?.previewOnlyNote || "Bu sadece önizlemedir. Rota/atama uygulanmadı. Readonly önizleme — rota uygulanmaz, sürücü rotası yenilenmez, bildirim gönderilmez; sadece etki analizi gösterilir.");
  const hasSelection = Boolean(selectionLabelText);
  const mapModel = buildMapModel(request, preview);
  const selectionTime = firstText(
    request?.createdAt,
    request?.at,
    request?.applicationAt,
    request?.boardingChangeAppliedAt,
    request?.boardingChangeRouteRefreshUpdatedAt,
  );
  const selectionDecision = firstText(
    request?.decisionText,
    request?.decision,
    request?.boardingChangeApplicationStatus,
    request?.status,
  );
  const decisionOwnerChip = decisionOwnerLabelText || "Hizmet alan taraf";
  const decisionOwnerNoteVisible = decisionOwnerNoteText && decisionOwnerNoteText !== selectionNoteText;

  if (error) {
    return (
      <div className="card" style={{ borderColor: "rgba(240, 68, 56, 0.35)", background: "rgba(240, 68, 56, 0.10)" }}>
        <div className="panelSectionTitle">{title}</div>
        {hasSelection ? <div className="panelMeta" style={{ marginTop: 6 }}>Seçili satır: {selectionLabelText}</div> : null}
        {selectionNoteText ? <div className="panelMeta" style={{ marginTop: 4 }}>{selectionNoteText}</div> : null}
        <div style={{ marginTop: 10, fontWeight: 700 }}>Önizleme gösterilemedi</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>{error}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card" style={{ borderColor: "rgba(96, 165, 250, 0.28)", background: "rgba(96, 165, 250, 0.08)" }} aria-live="polite">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div className="panelSectionTitle">{title}</div>
            {hasSelection ? <div className="panelMeta" style={{ marginTop: 6 }}>Seçili satır: {selectionLabelText}</div> : null}
            {selectionNoteText ? <div className="panelMeta" style={{ marginTop: 4 }}>{selectionNoteText}</div> : null}
          </div>
          <span className="pill" data-status="PENDING">Yükleniyor</span>
        </div>
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: "1px solid rgba(96, 165, 250, 0.22)", background: "rgba(255,255,255,0.03)" }}>
          <div style={{ fontWeight: 800 }}>Önizleme açılıyor…</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Readonly sonuç hazırlanıyor. Rota uygulanmaz, sürücü rotası yenilenmez, bildirim gönderilmez.</div>
        </div>
      </div>
    );
  }

  if (!preview) {
    if (!hasSelection) {
      return (
        <div
          className="panelMeta"
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            padding: "4px 2px",
            minHeight: 28,
          }}
          aria-live="polite"
        >
          <span className="pill" data-status="INFO">Readonly önizleme</span>
          <span>Bir satır seçince rota/durak etkisi burada görünür.</span>
        </div>
      );
    }

    return (
      <div className="card" style={{ borderColor: "rgba(255,255,255,0.08)" }} aria-live="polite">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div className="panelSectionTitle">{title}</div>
            {hasSelection ? <div className="panelMeta" style={{ marginTop: 6 }}>Seçili satır: {selectionLabelText}</div> : null}
            {selectionNoteText ? <div className="panelMeta" style={{ marginTop: 4 }}>{selectionNoteText}</div> : null}
          </div>
          {onClearSelection && hasSelection ? (
            <button type="button" className="btn sm" onClick={onClearSelection}>Seçimi temizle</button>
          ) : null}
        </div>
        <div className="panelMeta" style={{ marginTop: 10 }}>{emptyText}</div>
      </div>
    );
  }

  const changeTypeLabel = String(preview.changeTypeLabel || boardingChangePreviewKindLabel(preview.changeType) || "Biniş değişikliği önizlemesi");
  const capacity = preview.capacityImpact && typeof preview.capacityImpact === "object" ? preview.capacityImpact : {};
  const reliability = preview.reliability && typeof preview.reliability === "object" ? preview.reliability : {};
  const warnings = Array.isArray(preview.warnings) ? preview.warnings : [];
  const capacityAfter = capacity.availableAfter != null ? formatNumber(capacity.availableAfter) : "Bilinmiyor";
  const capacityBefore = capacity.availableBefore != null ? formatNumber(capacity.availableBefore) : "Bilinmiyor";
  const statusTone = reliability.ok === false ? "rgba(240, 68, 56, 0.22)" : "rgba(18, 183, 106, 0.18)";
  const borderTone = reliability.ok === false ? "rgba(240, 68, 56, 0.35)" : "rgba(18, 183, 106, 0.35)";

  return (
    <div className="card" style={{ borderColor: borderTone, background: statusTone }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">{title}</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>{safePreviewNote}</div>
          {hasSelection ? <div className="panelMeta" style={{ marginTop: 6 }}>Seçili satır: {selectionLabelText}</div> : null}
          {selectionNoteText ? <div className="panelMeta" style={{ marginTop: 4 }}>{selectionNoteText}</div> : null}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span className="pill" data-status={reliability.ok === false ? "WARN" : "OK"}>{changeTypeLabel}</span>
          {onClearSelection && hasSelection ? (
            <button type="button" className="btn sm" onClick={onClearSelection}>Seçimi temizle</button>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="pill" data-status={reliability.ok === false ? "WARN" : "OK"}>Kişi: {previewPersonLabel}</span>
          <span className="pill" data-status="COUNT">Tür: {changeTypeLabel}</span>
          <span className="pill" data-status="INFO">Karar: {selectionDecision || "Önizleme"}</span>
          <span className="pill" data-status="INFO">Bekleyen taraf: {decisionOwnerChip}</span>
          <span className="pill" data-status="INFO">Zaman: {formatSelectionTime(selectionTime) || "-"}</span>
        </div>
        {decisionOwnerNoteVisible ? <div className="panelMeta">{decisionOwnerNoteVisible}</div> : null}
      </div>

      <div className="panelBody" style={{ marginTop: 12 }}>
        {String(preview.summaryLine || `${changeTypeLabel} · ${previewPersonLabel}`)}
      </div>

      <div style={{ marginTop: 12 }}>
        <MiniMapPreview model={mapModel} />
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatTile label="Etkilenen kişi" value={previewPersonLabel} note={`Değişiklik: ${changeTypeLabel}`} />
        <StatTile label="Eski durak" value={String(preview.oldStopLabel || "-")} note={`Yeni/geçici durak: ${String(preview.newStopLabel || "-")}`} />
        <StatTile label="Kişi etkisi" value={`${formatNumber(preview.currentPeopleCount)} → ${formatNumber(preview.previewPeopleCount)}`} note={`Fark ${formatDelta(Number(preview.previewPeopleCount || 0) - Number(preview.currentPeopleCount || 0))}`} />
        <StatTile label="Durak etkisi" value={`${formatNumber(preview.currentStopCount)} → ${formatNumber(preview.previewStopCount)}`} note={`Fark ${formatDelta(Number(preview.previewStopCount || 0) - Number(preview.currentStopCount || 0))}`} />
        <StatTile label="Km etkisi" value={`${formatNumber(preview.currentDistanceKm, 2)} → ${formatNumber(preview.previewDistanceKm, 2)}`} note={`Fark ${formatDelta(preview.distanceDeltaKm, 2)} km`} />
        <StatTile label="Süre etkisi" value={`${formatNumber(preview.currentDurationMin)} → ${formatNumber(preview.previewDurationMin)}`} note={`Fark ${formatDelta(preview.durationDeltaMin)} dk`} />
        <StatTile label="Kapasite" value={capacity.status || "UNKNOWN"} note={`Önceki yük: ${formatNumber(capacity.currentLoad)} • Önizleme yükü: ${formatNumber(capacity.previewLoad)} • Boş koltuk: ${capacityBefore} → ${capacityAfter}`} />
        <StatTile label="Güvenilirlik" value={String(reliability.label || "ETA hesaplanamıyor")} note={String(reliability.note || "ETA hesaplanamıyor")} />
      </div>

      {warnings.length ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: "1px solid rgba(245, 158, 11, 0.28)", background: "rgba(245, 158, 11, 0.10)" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Uyarılar</div>
          <ul style={{ margin: 0, paddingInlineStart: 18, display: "grid", gap: 4 }}>
            {warnings.slice(0, 4).map((warning, index) => (
              <li key={`${index}-${warning}`}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
        <div className="panelMeta">Sıradaki önerilen işlem</div>
        <div style={{ marginTop: 4, fontWeight: 700 }}>{String(preview.nextBestAction || "Önizlemeyi doğrula.")}</div>
      </div>
    </div>
  );
}
