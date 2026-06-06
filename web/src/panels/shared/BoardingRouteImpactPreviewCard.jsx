import {
  boardingChangeDecisionOwnerLabel,
  boardingChangeDecisionOwnerNote,
  boardingChangePreviewKindLabel,
  boardingChangePreviewStateLabel,
  boardingChangePreviewStateNote,
  boardingChangePreviewStateTone,
} from "./boardingChangeUi";
import ReadableMiniRouteMap from "../../components/map/ReadableMiniRouteMap";
import { resolvePersonDisplayLabel } from "../../utils/labels";
import { formatDateTimeTR } from "../../utils/time";
import { useRef, useState } from "react";

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

function routeLabelForIndex(index, total) {
  if (total <= 1) return "1";
  if (index === 0) return "S";
  if (index === total - 1) return "E";
  return String(index);
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

  const totalRouteStops = routeStops.length;
  const routePoints = routeStops.map((stop, index) => ({
    ...stop,
    label: routeLabelForIndex(index, totalRouteStops),
    tooltip: stop.label,
    kind: totalRouteStops <= 1 ? "route" : (index === 0 ? "start" : index === totalRouteStops - 1 ? "end" : "route"),
  }));

  const assignedStop = findAssignedStop(request, preview);
  const requestedStop = findRequestedStop(request, preview);

  const currentPoint = assignedStop && getStopCoord(assignedStop)
    ? {
      ...getStopCoord(assignedStop),
      label: "Eski",
      tooltip: getStopLabel(assignedStop, preview?.oldStopLabel || "Eski durak"),
      role: "current",
      kind: "current",
    }
    : null;
  const requestedPoint = requestedStop && getStopCoord(requestedStop)
    ? {
      ...getStopCoord(requestedStop),
      label: "Yeni",
      tooltip: getStopLabel(requestedStop, preview?.newStopLabel || "Yeni durak"),
      role: "requested",
      kind: "requested",
    }
    : null;

  const allPoints = [
    ...routePoints,
    currentPoint,
    requestedPoint,
  ].filter((point) => point && Number.isFinite(point.lat) && Number.isFinite(point.lng));

  return {
    routeStops,
    routePoints,
    currentPoint,
    requestedPoint,
    linePoints: routePoints.length >= 2 ? routePoints : (currentPoint && requestedPoint ? [currentPoint, requestedPoint] : []),
    markers: [
      ...routePoints,
      currentPoint,
      requestedPoint,
    ].filter(Boolean),
    allPoints,
    hasCoordinates: allPoints.length > 0,
    oldStopLabel: firstText(preview?.oldStopLabel, getStopLabel(currentPoint, "")),
    newStopLabel: firstText(preview?.newStopLabel, getStopLabel(requestedPoint, "")),
    routeNote: routePoints.length >= 2
      ? "Leaflet mini-harita: rota çizgisi ve duraklar tile arka plan üzerinde gösterilir."
      : "Leaflet mini-harita: koordinat varsa tekil nokta tile arka planında gösterilir.",
    legendItems: routePoints.length > 1
      ? [
        { label: "S", text: "Başlangıç" },
        { label: "1..N", text: "Ara duraklar" },
        { label: "E", text: "Bitiş" },
        { label: "Eski", text: "Mevcut durak" },
        { label: "Yeni", text: "Talep edilen durak" },
      ]
      : [
        { label: "Eski", text: "Mevcut durak" },
        { label: "Yeni", text: "Talep edilen durak" },
      ],
  };
}

function StatTile({ label, value, note, dense = false }) {
  return (
    <div style={{
      padding: dense ? 10 : 12,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.03)",
      minHeight: dense ? 84 : 96,
    }}>
      <div className="panelMeta" style={{ marginBottom: dense ? 4 : 6 }}>{label}</div>
      <div style={{ fontSize: dense ? 16 : 18, fontWeight: 800, lineHeight: 1.2 }}>{value}</div>
      {note ? <div className="panelMeta" style={{ marginTop: dense ? 4 : 6 }}>{note}</div> : null}
    </div>
  );
}

function toneStyle(tone = "info") {
  if (tone === "success") {
    return { color: "#d1fadf", background: "rgba(18,183,106,0.14)", border: "1px solid rgba(18,183,106,0.38)" };
  }
  if (tone === "warning") {
    return { color: "#fedf89", background: "rgba(247,144,9,0.14)", border: "1px solid rgba(247,144,9,0.38)" };
  }
  if (tone === "critical") {
    return { color: "#fecdca", background: "rgba(240,68,56,0.12)", border: "1px solid rgba(240,68,56,0.35)" };
  }
  return { color: "#d0d5dd", background: "rgba(96,165,250,0.10)", border: "1px solid rgba(96,165,250,0.28)" };
}

function previewStatusTonePreview(item = null, preview = null) {
  return boardingChangePreviewStateTone(item || preview || {});
}

function compactCapacityLabel(capacity = {}) {
  const status = String(capacity?.status || "").toUpperCase();
  if (status === "OK") return "Uygun";
  if (status === "NEAR") return "Riskli";
  if (status === "OVER") return "Yetersiz";
  return "Bilinmiyor";
}

function compactReliabilityLabel(reliability = {}, warnings = []) {
  if (reliability?.ok === false) return "ETA hesaplanamıyor";
  if (String(reliability?.displayMode || "").toLowerCase() === "not-current" || String(reliability?.label || "").toLowerCase().includes("güncel değil")) {
    return "ETA güncel değil";
  }
  if (Array.isArray(warnings) && warnings.length) return "Yaklaşık hesap";
  return "Rota önizlemesi";
}

function compactRiskLabel({ capacity = {}, reliability = {}, warnings = [] } = {}) {
  if (capacity?.status === "OVER" || reliability?.ok === false) return "Yüksek";
  if (capacity?.status === "NEAR" || String(reliability?.displayMode || "").toLowerCase() === "not-current" || (Array.isArray(warnings) && warnings.length)) {
    return "Orta";
  }
  return "Düşük";
}

function buildDecisionSentence(preview = null, request = null, personLabel = "") {
  const name = String(personLabel || "").trim() || "Seçili kişi";
  const changeType = String(preview?.changeType || request?.requestKind || request?.kind || "").toUpperCase();
  if (changeType === "NO_SERVICE_TODAY") return `${name} bugün servisi kullanmayacak.`;
  if (changeType === "ALTERNATE_STOP_TODAY") return `${name} bugün ${String(preview?.newStopLabel || "yeni durak").trim()} noktasından binecek.`;
  if (changeType === "TEMPORARY_BOARDING_NOTE") return `${name} için geçici biniş notu var.`;
  return `${name} için rota etkisi önizleniyor.`;
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
  const decisionOwnerChip = decisionOwnerLabelText || "Hizmet alan taraf";
  const decisionOwnerNoteVisible = decisionOwnerNoteText && decisionOwnerNoteText !== selectionNoteText;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsRef = useRef(null);

  if (error) {
    return (
      <div className="card" style={{ borderColor: "rgba(240, 68, 56, 0.35)", background: "rgba(255,255,255,0.03)" }}>
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
      <div className="card" style={{ borderColor: "rgba(96, 165, 250, 0.28)", background: "rgba(255,255,255,0.03)" }} aria-live="polite">
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
  const stopDelta = Number(preview.previewStopCount || 0) - Number(preview.currentStopCount || 0);
  const distanceDeltaKm = Number(preview.distanceDeltaKm || 0);
  const durationDeltaMin = Number(preview.durationDeltaMin || 0);
  const previewStateLabel = boardingChangePreviewStateLabel(request || preview);
  const previewStateTone = previewStatusTonePreview(request, preview);
  const previewStateNote = boardingChangePreviewStateNote(request || preview);
  const capacityLabel = compactCapacityLabel(capacity);
  const reliabilityLabel = compactReliabilityLabel(reliability, warnings);
  const riskLabel = compactRiskLabel({ capacity, reliability, warnings });
  const decisionSentence = buildDecisionSentence(preview, request, previewPersonLabel);
  const detailsHint = String(preview.summaryLine || `${changeTypeLabel} · ${previewPersonLabel}`);
  const tone = toneStyle(previewStateTone);
  const statusStatus = previewStateTone === "success" ? "OK" : previewStateTone === "warning" ? "WARN" : previewStateTone === "critical" ? "WARN" : "INFO";
  const riskStatus = riskLabel === "Yüksek" ? "WARN" : riskLabel === "Orta" ? "WARN" : "OK";
  const reliabilityStatus = previewStateTone === "critical" || reliability.ok === false ? "WARN" : previewStateTone === "warning" || String(reliability?.displayMode || "").toLowerCase() === "not-current" ? "WARN" : "OK";
  const handleToggleDetails = () => setDetailsOpen((value) => !value);
  const handleShowMap = () => {
    setDetailsOpen(true);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 0);
  };

  return (
    <div
      className="card"
      style={{
        borderColor: tone.border,
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div className="panelSectionTitle">{title}</div>
            <div className="panelMeta" style={{ marginTop: 4 }}>{safePreviewNote}</div>
            {hasSelection ? <div className="panelMeta" style={{ marginTop: 6 }}>Seçili satır: {selectionLabelText}</div> : null}
            {selectionNoteText ? <div className="panelMeta" style={{ marginTop: 4 }}>{selectionNoteText}</div> : null}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span className="pill" data-status={statusStatus}>{changeTypeLabel}</span>
            <span className="pill" data-status={statusStatus}>{previewStateLabel}</span>
            {onClearSelection && hasSelection ? (
              <button type="button" className="btn sm" onClick={onClearSelection}>Seçimi temizle</button>
            ) : null}
          </div>
        </div>

        <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
          <div className="panelMeta">Kısa karar</div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, lineHeight: 1.35 }}>{decisionSentence}</div>
          {decisionOwnerNoteVisible ? <div className="panelMeta" style={{ marginTop: 6 }}>{decisionOwnerNoteVisible}</div> : null}
        </div>

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          <StatTile dense label="Kişi" value={previewPersonLabel} note={String(preview.currentPeopleCount || 0) ? `Mevcut: ${formatNumber(preview.currentPeopleCount)}` : "Mevcut kişi sayısı bilinmiyor"} />
          <StatTile dense label="Durak farkı" value={formatDelta(stopDelta)} note={`${String(preview.oldStopLabel || "-")} → ${String(preview.newStopLabel || "-")}`} />
          <StatTile dense label="Km etkisi" value={`${formatDelta(distanceDeltaKm, 2)} km`} note={`${formatNumber(preview.currentDistanceKm, 2)} → ${formatNumber(preview.previewDistanceKm, 2)} km`} />
          <StatTile dense label="Süre etkisi" value={`${formatDelta(durationDeltaMin)} dk`} note={`${formatNumber(preview.currentDurationMin)} → ${formatNumber(preview.previewDurationMin)} dk`} />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="pill" data-status="INFO">Kapasite: {capacityLabel}</span>
          <span className="pill" data-status={reliabilityStatus}>Güvenilirlik: {reliabilityLabel}</span>
          <span className="pill" data-status={riskStatus}>Risk: {riskLabel}</span>
          <span className="pill" data-status="INFO">Bekleyen taraf: {decisionOwnerChip}</span>
          {selectionTime ? <span className="panelMeta">Zaman: {formatSelectionTime(selectionTime) || "-"}</span> : null}
        </div>

        {previewStateNote ? <div className="panelMeta">{previewStateNote}</div> : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn sm" onClick={handleToggleDetails}>
            {detailsOpen ? "Detayı gizle" : "Detayı aç"}
          </button>
          <button type="button" className="btn sm ghost" onClick={handleShowMap}>
            {detailsOpen ? "Haritada odakla" : "Haritada göster"}
          </button>
        </div>

        {detailsOpen ? (
          <div ref={detailsRef} style={{ display: "grid", gap: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="panelMeta">Detay analiz</div>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <StatTile dense label="Eski durak" value={String(preview.oldStopLabel || "-")} note={`Yeni/alternatif durak: ${String(preview.newStopLabel || "-")}`} />
              <StatTile dense label="Kişi etkisi" value={`${formatNumber(preview.currentPeopleCount)} → ${formatNumber(preview.previewPeopleCount)}`} note={`Fark ${formatDelta(Number(preview.previewPeopleCount || 0) - Number(preview.currentPeopleCount || 0))}`} />
              <StatTile dense label="Durak etkisi" value={`${formatNumber(preview.currentStopCount)} → ${formatNumber(preview.previewStopCount)}`} note={`Fark ${formatDelta(stopDelta)}`} />
              <StatTile dense label="Km/süre hesap açıklaması" value={`${formatNumber(preview.currentDistanceKm, 2)} km / ${formatNumber(preview.currentDurationMin)} dk`} note={`Önizleme: ${formatNumber(preview.previewDistanceKm, 2)} km / ${formatNumber(preview.previewDurationMin)} dk`} />
            </div>

            {/* compact mini map height: 160 */}
            <ReadableMiniRouteMap
              title="Mini harita önizlemesi"
              subtitle="Readonly önizleme — rota uygulanmaz"
              linePoints={mapModel.linePoints}
              markers={mapModel.markers}
              legendItems={mapModel.legendItems}
              fallbackText="Harita önizlemesi için durak koordinatı eksik. Harita için yeterli koordinat yok. Rota etkisi metinsel olarak önizleniyor."
              footerText={`Bu değişiklik için rota etkisi metinsel olarak önizleniyor. • Eski durak: ${mapModel.oldStopLabel || "-"} • Yeni/alternatif durak: ${mapModel.newStopLabel || "-"}`}
              height={160}
              minHeight={160}
            />

            {warnings.length ? (
              <div style={{ marginTop: 2, padding: 12, borderRadius: 12, border: "1px solid rgba(245, 158, 11, 0.28)", background: "rgba(245, 158, 11, 0.10)" }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Uyarılar</div>
                <ul style={{ margin: 0, paddingInlineStart: 18, display: "grid", gap: 4 }}>
                  {warnings.slice(0, 4).map((warning, index) => (
                    <li key={`${index}-${warning}`}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
              <div className="panelMeta">Sıradaki önerilen işlem</div>
              <div style={{ marginTop: 4, fontWeight: 700 }}>{String(preview.nextBestAction || "Önizlemeyi doğrula.")}</div>
            </div>

            <div className="panelMeta">Hesap özeti: {detailsHint}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
