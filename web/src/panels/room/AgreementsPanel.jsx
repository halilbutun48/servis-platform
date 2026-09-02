import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { navigate } from "../../router";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { toHHMM, weekMaskToText } from "../../utils/agreementUi";
import { ymdTR } from "../../utils/time";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { includesFilter, rowSelectionStyle } from "../../utils/listUi";
import CommercialReadonlySummary from "../../components/CommercialReadonlySummary";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import { getShiftRoutePreview } from "../../utils/shiftRoutePreview";
import { buildDynamicSavingsPreview, routeDiffText, routeSummaryText, summarizeRoutePreview } from "../../utils/routePreviewSummary";
import { buildAgreementCopilotFacts } from "../../utils/agreementCopilotFacts";
import { cachedGet } from "../../utils/uiDataCache";
import { getAgreementPlatformFeePreview, getAgreementQualityPaymentBridgePreview, getAgreementSeferScorePreview } from "../../api";
import RoutePreviewModal from "../../components/RoutePreviewModal";
import {
  OfferCell,
  RoomAgreementsExtendRequestsSection,
  RoomAgreementsRouteRefreshAcceptedSection,
  RoomAgreementsRouteRefreshPendingSection,
} from "./roomAgreementsPanelSections";
import RoomAgreementsBridgeSection from "./roomAgreementsBridgeSection";
import ReconciliationPreviewCard from "../../components/ReconciliationPreviewCard";
import {
  daysLeftYmd,
  moneyTry,
  parseTryInput,
  pill,
  resolveRoomAgreementsDefaultTab,
  ShiftSummary,
} from "./roomAgreementsPanelHelpers";

const EMPTY_QUALITY_BRIDGE_LIST = [];
const ROOM_AGREEMENT_TABS = [
  { key: "bridge", label: "Operasyon Köprüsü" },
  { key: "route", label: "Rota Talepleri" },
  { key: "applied", label: "Uygulanan Rota" },
  { key: "extend", label: "Uzatma Talepleri" },
  { key: "pending", label: "Bekleyen" },
  { key: "other", label: "Diğer Sözleşmeler" },
];

export default function AgreementsPanel() {
  const { token } = useSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pending, setPending] = useState([]);
  const [others, setOthers] = useState([]);
  const [shiftStats, setShiftStats] = useState({}); // ✅ M59
  const [opsBridge, setOpsBridge] = useState({});
  const [routeRefreshItems, setRouteRefreshItems] = useState([]);
  const [routeRefreshPreviewById, setRouteRefreshPreviewById] = useState({});
  const [qualityPaymentBridgePreview, setQualityPaymentBridgePreview] = useState({ loading: false, data: null, err: "" });
  const [platformFeePreview, setPlatformFeePreview] = useState({ loading: false, data: null, err: "" });
  const [seferScorePreview, setSeferScorePreview] = useState({ loading: false, data: null, err: "" });
  const [previewModal, setPreviewModal] = useState({ open: false, shiftId: null, title: "Rota Önizleme" });

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [approveId, setApproveId] = useState(null);
  const [selVehicle, setSelVehicle] = useState("");
  const [selDriver, setSelDriver] = useState("");
  const [conflict, setConflict] = useState(null);

  const [counterId, setCounterId] = useState(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNote, setCounterNote] = useState("");
  const [routeRefreshCounterId, setRouteRefreshCounterId] = useState(null);
  const [routeRefreshCounterAmount, setRouteRefreshCounterAmount] = useState("");
  const [routeRefreshCounterNote, setRouteRefreshCounterNote] = useState("");

  // ✅ M57: agreement extend negotiation (Room side)
  const [extendItems, setExtendItems] = useState([]);
  const [extendCounterId, setExtendCounterId] = useState(null);
  const [extendCounterAmount, setExtendCounterAmount] = useState("");
  const [extendCounterNote, setExtendCounterNote] = useState("");
  const [selectedAgreementId, setSelectedAgreementId] = useState(null);
  const [filterQ, setFilterQ] = useState("");
  const [viewMode, setViewMode] = useState("bridge");
  const [bridgeDetailsRequested, setBridgeDetailsRequested] = useState(false);
  const viewModeInitializedRef = useRef(false);

  const approveTarget = useMemo(() => pending.find((x) => x.id === approveId), [pending, approveId]);
  const counterTarget = useMemo(() => pending.find((x) => x.id === counterId), [pending, counterId]);
  const extendCounterTarget = useMemo(() => extendItems.find((x) => x.id === extendCounterId), [extendItems, extendCounterId]);
  const selectedAgreement = useMemo(() => {
    const wanted = Number(selectedAgreementId || 0);
    if (!wanted) return null;
    return pending.find((x) => Number(x.id) === wanted) || others.find((x) => Number(x.id) === wanted) || extendItems.find((x) => Number(x.id) === wanted) || null;
  }, [selectedAgreementId, pending, others, extendItems]);
  const copilotAgreementTarget = useMemo(() => selectedAgreement || approveTarget || counterTarget || extendCounterTarget || pending[0] || others[0] || null, [selectedAgreement, approveTarget, counterTarget, extendCounterTarget, pending, others]);
  const filteredExtendItems = useMemo(() => extendItems.filter((a) => includesFilter([
    a?.id, a?.status, a?.extendStatus, a?.startDate, a?.endDate, a?.extendRequestedEndDate, a?.extendRequestedEndAt,
    a?.companyOfferAmount, a?.roomOfferAmount, a?.extendOfferAmount, a?.extendCounterAmount,
    a?.companyOfferNote, a?.roomOfferNote, a?.extendOfferNote, a?.extendCounterNote, weekMaskToText(a?.weekMask),
  ], filterQ)), [extendItems, filterQ]);
  const filteredPending = useMemo(() => pending.filter((a) => includesFilter([
    a?.id, a?.status, a?.startDate, a?.endDate, a?.companyOfferAmount, a?.roomOfferAmount, a?.companyOfferNote, a?.roomOfferNote,
    a?.direction, a?.pattern, a?.hubLat, a?.hubLng, weekMaskToText(a?.weekMask),
  ], filterQ)), [pending, filterQ]);
  const filteredOthers = useMemo(() => others.filter((a) => includesFilter([
    a?.id, a?.status, a?.startDate, a?.endDate, a?.companyOfferAmount, a?.roomOfferAmount, a?.companyOfferNote, a?.roomOfferNote,
    a?.direction, a?.pattern, a?.hubLat, a?.hubLng, weekMaskToText(a?.weekMask),
  ], filterQ)), [others, filterQ]);
  const pendingRouteRefreshItems = useMemo(() => routeRefreshItems.filter((item) => ["PENDING", "COUNTERED"].includes(String(item?.status || '').toUpperCase())), [routeRefreshItems]);
  const acceptedRouteRefreshItems = useMemo(() => routeRefreshItems.filter((item) => String(item?.status || '').toUpperCase() === 'ACCEPTED'), [routeRefreshItems]);
  const filteredRouteRefreshItems = useMemo(() => pendingRouteRefreshItems.filter((item) => includesFilter([
    item?.id,
    item?.agreementId,
    item?.status,
    item?.startDate,
    item?.endDate,
    item?.companyOfferAmount,
    item?.companyOfferNote,
    item?.initialCompanyOfferAmount,
    item?.initialCompanyOfferNote,
    item?.roomCounterAmount,
    item?.roomCounterNote,
    item?.peopleCount,
    item?.stopCount,
  ], filterQ)), [pendingRouteRefreshItems, filterQ]);
  const filteredAcceptedRouteRefreshItems = useMemo(() => acceptedRouteRefreshItems.filter((item) => includesFilter([
    item?.id,
    item?.agreementId,
    item?.status,
    item?.startDate,
    item?.endDate,
    item?.companyOfferAmount,
    item?.companyOfferNote,
    item?.initialCompanyOfferAmount,
    item?.initialCompanyOfferNote,
    item?.roomCounterAmount,
    item?.roomCounterNote,
    item?.finalAcceptedAmount,
    item?.finalAcceptedNote,
    item?.peopleCount,
    item?.stopCount,
    item?.decidedAt,
  ], filterQ)), [acceptedRouteRefreshItems, filterQ]);
  const routeRefreshPreviewList = useMemo(
    () => filteredRouteRefreshItems.map((item) => ({
      ...item,
      sourceShiftId: 0,
      draftShiftIds: [],
    })),
    [filteredRouteRefreshItems]
  );
  const acceptedRouteRefreshPreviewList = useMemo(
    () => filteredAcceptedRouteRefreshItems.map((item) => ({
      ...item,
      sourceShiftId: 0,
      draftShiftIds: [],
    })),
    [filteredAcceptedRouteRefreshItems]
  );
  const roomAgreementsNotice = useMemo(() => {
    if (pendingRouteRefreshItems.length > 0) {
      return {
        tone: "warning",
        title: "Yeni rota güncelleme talebi var",
        detail: `${pendingRouteRefreshItems.length} kayıt`,
        actionLabel: "Rota Taleplerine git",
        actionTab: "route",
      };
    }
    if (pending.length > 0) {
      return {
        tone: "info",
        title: "Karar bekleyen sözleşme teklifi var",
        detail: `${pending.length} kayıt`,
        actionLabel: "Operasyon Köprüsünü aç",
        actionTab: "bridge",
      };
    }
    if (extendItems.length > 0) {
      return {
        tone: "warning",
        title: "Uzatma talebi geldi",
        detail: `${extendItems.length} kayıt`,
        actionLabel: "Uzatma Taleplerine git",
        actionTab: "extend",
      };
    }
    return null;
  }, [extendItems.length, pending.length, pendingRouteRefreshItems.length]);
  const roomAgreementTabs = useMemo(() => ROOM_AGREEMENT_TABS.map((tab) => ({
    ...tab,
    badge:
      tab.key === "bridge" ? (pending.length ? String(pending.length) : null) :
      tab.key === "route" ? (filteredRouteRefreshItems.length ? String(filteredRouteRefreshItems.length) : null) :
      tab.key === "applied" ? (filteredAcceptedRouteRefreshItems.length ? String(filteredAcceptedRouteRefreshItems.length) : null) :
      tab.key === "extend" ? (filteredExtendItems.length ? String(filteredExtendItems.length) : null) :
      tab.key === "pending" ? (filteredPending.length ? String(filteredPending.length) : null) :
      tab.key === "other" ? (filteredOthers.length ? String(filteredOthers.length) : null) :
      null,
  })), [
    filteredAcceptedRouteRefreshItems.length,
    filteredExtendItems.length,
    filteredOthers.length,
    filteredPending.length,
    filteredRouteRefreshItems.length,
    pending.length,
  ]);
  const agreementById = useMemo(() => {
    const map = {};
    [...pending, ...others, ...extendItems].forEach((item) => {
      const id = Number(item?.id || 0);
      if (id > 0 && !map[String(id)]) map[String(id)] = item;
    });
    return map;
  }, [pending, others, extendItems]);
  const selectedRouteRefreshAgreementId = Number(copilotAgreementTarget?.id || selectedAgreement?.id || 0);
  const selectedRouteRefreshItem = useMemo(() => (
    selectedRouteRefreshAgreementId > 0
      ? routeRefreshItems.find((item) => Number(item?.agreementId || 0) === selectedRouteRefreshAgreementId) || null
      : null
  ), [routeRefreshItems, selectedRouteRefreshAgreementId]);
  const selectedRouteRefreshPreview = useMemo(() => (
    selectedRouteRefreshItem
      ? routeRefreshPreviewById[String(selectedRouteRefreshItem.id)] || { loading: false, current: null, proposed: null, err: "" }
      : null
  ), [selectedRouteRefreshItem, routeRefreshPreviewById]);
  const selectedRouteRefreshStatus = String(selectedRouteRefreshItem?.status || "").toUpperCase();
  const selectedRouteRefreshCountered = selectedRouteRefreshStatus === "COUNTERED";
  const selectedRouteRefreshSummaryText = selectedRouteRefreshItem
    ? `Talep ID ${selectedRouteRefreshItem.id} • ${String(selectedRouteRefreshItem.startDate || "").slice(0, 10)} → ${String(selectedRouteRefreshItem.endDate || "").slice(0, 10)} • ${Number(selectedRouteRefreshItem.shiftCount || 0)} taslak vardiya`
    : "";
  const selectedRouteRefreshCurrentText = routeSummaryText(selectedRouteRefreshPreview?.current, {
    peopleCount: Number(selectedRouteRefreshItem?.peopleCount || 0),
    stopCount: Number(selectedRouteRefreshItem?.stopCount || 0),
    distanceM: Number(selectedRouteRefreshItem?.currentDistanceM || 0),
    durationSec: Number(selectedRouteRefreshItem?.currentDurationSec || 0),
  });
  const selectedRouteRefreshProposedText = routeSummaryText(selectedRouteRefreshPreview?.proposed, {
    peopleCount: Number(selectedRouteRefreshItem?.peopleCount || 0),
    stopCount: Number(selectedRouteRefreshItem?.stopCount || 0),
    distanceM: Number(selectedRouteRefreshItem?.proposedDistanceM || 0),
    durationSec: Number(selectedRouteRefreshItem?.proposedDurationSec || 0),
  });
  const selectedRouteRefreshDiffText = routeDiffText(
    selectedRouteRefreshPreview?.current || null,
    selectedRouteRefreshPreview?.proposed || null,
    { emptyText: "Personel / durak değişikliği yok", showNegativeMetricSign: false }
  );
  const selectedRouteRefreshCurrentAmount = Number(selectedRouteRefreshItem?.initialCompanyOfferAmount ?? selectedRouteRefreshItem?.companyOfferAmount ?? 0);
  const selectedRouteRefreshNextAmount = Number(
    selectedRouteRefreshCountered
      ? selectedRouteRefreshItem?.roomCounterAmount ?? selectedRouteRefreshItem?.companyOfferAmount ?? selectedRouteRefreshCurrentAmount
      : selectedRouteRefreshItem?.companyOfferAmount ?? selectedRouteRefreshCurrentAmount
  );
  const selectedRouteRefreshPriceImpactText = `${moneyTry(selectedRouteRefreshCurrentAmount)} → ${moneyTry(selectedRouteRefreshNextAmount)} (${selectedRouteRefreshNextAmount - selectedRouteRefreshCurrentAmount > 0 ? "+" : ""}${moneyTry(selectedRouteRefreshNextAmount - selectedRouteRefreshCurrentAmount)})`;
  const selectedRouteRefreshRoomCounterText = selectedRouteRefreshCountered
    ? `${moneyTry(selectedRouteRefreshItem?.roomCounterAmount)}${selectedRouteRefreshItem?.roomCounterNote ? ` — ${selectedRouteRefreshItem.roomCounterNote}` : ""}`
    : "";
  const selectedDynamicSavingsPreview = buildDynamicSavingsPreview({
    currentSummary: selectedRouteRefreshPreview?.current || {
      peopleCount: Number(selectedRouteRefreshItem?.peopleCount || 0),
      stopCount: Number(selectedRouteRefreshItem?.stopCount || 0),
      distanceM: Number(selectedRouteRefreshItem?.currentDistanceM || 0),
      durationSec: Number(selectedRouteRefreshItem?.currentDurationSec || 0),
    },
    proposedSummary: selectedRouteRefreshPreview?.proposed || {
      peopleCount: Number(selectedRouteRefreshItem?.peopleCount || 0),
      stopCount: Number(selectedRouteRefreshItem?.stopCount || 0),
      distanceM: Number(selectedRouteRefreshItem?.proposedDistanceM || 0),
      durationSec: Number(selectedRouteRefreshItem?.proposedDurationSec || 0),
    },
  });
  const qualityBridgePreview = useMemo(() => qualityPaymentBridgePreview.data || null, [qualityPaymentBridgePreview.data]);
  const qualityBridgeStatusText = useMemo(() => String(qualityBridgePreview?.qualityStatus || "").trim().toUpperCase(), [qualityBridgePreview]);
  const qualityBridgeProofCompleteness = Number(qualityBridgePreview?.proofCompleteness ?? NaN);
  const qualityBridgeSettlementReadiness = useMemo(() => String(qualityBridgePreview?.settlementReadiness || "").trim().toUpperCase(), [qualityBridgePreview]);
  const qualityBridgeImpactStatus = useMemo(() => String(qualityBridgePreview?.paymentPreviewImpact?.status || "").trim().toUpperCase(), [qualityBridgePreview]);
  const qualityBridgeImpactReason = useMemo(() => String(qualityBridgePreview?.paymentPreviewImpact?.reason || "").trim(), [qualityBridgePreview]);
  const qualityBridgeMissingProofs = useMemo(() => (
    Array.isArray(qualityBridgePreview?.missingProofs) ? qualityBridgePreview.missingProofs : EMPTY_QUALITY_BRIDGE_LIST
  ), [qualityBridgePreview]);
  const qualityBridgeRiskReasons = useMemo(() => (
    Array.isArray(qualityBridgePreview?.riskReasons) ? qualityBridgePreview.riskReasons : EMPTY_QUALITY_BRIDGE_LIST
  ), [qualityBridgePreview]);
  const qualityBridgeNextAction = useMemo(() => String(qualityBridgePreview?.nextBestAction || "").trim(), [qualityBridgePreview]);
  const qualityBridgeSummaryText = useMemo(() => String(qualityBridgePreview?.summaryText || qualityBridgePreview?.previewOnlyNote || "").trim(), [qualityBridgePreview]);
  const seferScorePreviewData = useMemo(() => seferScorePreview.data || null, [seferScorePreview.data]);
  const seferScoreValue = Number(seferScorePreviewData?.score ?? NaN);
  const seferScoreMax = Number(seferScorePreviewData?.scoreMax ?? 5) || 5;
  const seferScoreLevel = useMemo(() => String(seferScorePreviewData?.level || "").trim().toUpperCase(), [seferScorePreviewData]);
  const seferScoreConfidence = useMemo(() => String(seferScorePreviewData?.confidence || "").trim().toUpperCase(), [seferScorePreviewData]);
  const seferScoreStatus = useMemo(() => String(seferScorePreviewData?.status || "").trim().toUpperCase(), [seferScorePreviewData]);
  const seferScoreSummaryText = useMemo(() => String(seferScorePreviewData?.summaryText || seferScorePreviewData?.safeExplanation || "").trim(), [seferScorePreviewData]);
  const seferScoreSupplierLabel = useMemo(() => String(seferScorePreviewData?.supplierLabel || "").trim(), [seferScorePreviewData]);
  const seferScorePositiveReasons = useMemo(() => (
    Array.isArray(seferScorePreviewData?.positiveReasons) ? seferScorePreviewData.positiveReasons : EMPTY_QUALITY_BRIDGE_LIST
  ), [seferScorePreviewData]);
  const seferScoreRiskReasons = useMemo(() => (
    Array.isArray(seferScorePreviewData?.riskReasons) ? seferScorePreviewData.riskReasons : EMPTY_QUALITY_BRIDGE_LIST
  ), [seferScorePreviewData]);
  const seferScoreMissingSignals = useMemo(() => (
    Array.isArray(seferScorePreviewData?.missingSignals) ? seferScorePreviewData.missingSignals : EMPTY_QUALITY_BRIDGE_LIST
  ), [seferScorePreviewData]);
  const seferScoreNextAction = useMemo(() => String(seferScorePreviewData?.nextBestAction || "").trim(), [seferScorePreviewData]);
  const seferScoreSafeExplanation = useMemo(() => String(seferScorePreviewData?.safeExplanation || "").trim(), [seferScorePreviewData]);
  const platformFeePreviewData = useMemo(() => platformFeePreview.data || null, [platformFeePreview.data]);
  const platformFeeSourceType = useMemo(() => String(platformFeePreviewData?.agreementSource || "").trim(), [platformFeePreviewData]);
  const platformFeeSourceLabel = useMemo(() => String(platformFeePreviewData?.agreementSourceLabel || "Yetersiz lineage").trim(), [platformFeePreviewData]);
  const platformFeeSourceConfidence = useMemo(() => String(platformFeePreviewData?.sourceConfidence || "LOW").trim(), [platformFeePreviewData]);
  const platformFeeLicenseFeeText = useMemo(() => String(platformFeePreviewData?.licenseFeeText || "0 TL").trim(), [platformFeePreviewData]);
  const platformFeeAmountText = useMemo(() => String(platformFeePreviewData?.agreementAmountText || "Tutar bulunamadı").trim(), [platformFeePreviewData]);
  const platformFeeRateLabel = useMemo(() => String(platformFeePreviewData?.successShareRateLabel || "Başarı payı doğmaz").trim(), [platformFeePreviewData]);
  const platformFeeEstimatedShareText = useMemo(() => String(platformFeePreviewData?.estimatedSuccessShareText || "Tutar bulunamadı").trim(), [platformFeePreviewData]);
  const platformFeeSummaryText = useMemo(() => String(platformFeePreviewData?.summaryText || "").trim(), [platformFeePreviewData]);
  const platformFeeSafeExplanation = useMemo(() => String(platformFeePreviewData?.safeExplanation || "").trim(), [platformFeePreviewData]);
  const platformFeeLineageSummary = useMemo(() => String(platformFeePreviewData?.lineageSummary || "").trim(), [platformFeePreviewData]);
  const platformFeeReason = useMemo(() => String(platformFeePreviewData?.reason || "").trim(), [platformFeePreviewData]);
  const platformFeeScoreText = useMemo(() => {
    const score = Number(platformFeePreviewData?.seferScoreUsed?.score ?? NaN);
    const scoreMax = Number(platformFeePreviewData?.seferScoreUsed?.scoreMax ?? 5) || 5;
    return Number.isFinite(score) ? `${score.toFixed(2)} / ${scoreMax.toFixed(0)}` : String(platformFeePreviewData?.seferScoreUsed?.summaryText || "").trim();
  }, [platformFeePreviewData]);
  const platformFeeEvidence = useMemo(() => (
    Array.isArray(platformFeePreviewData?.sourceEvidence) ? platformFeePreviewData.sourceEvidence : EMPTY_QUALITY_BRIDGE_LIST
  ), [platformFeePreviewData]);
  const platformFeeSignals = useMemo(() => (
    platformFeePreviewData?.sourceSignals && typeof platformFeePreviewData.sourceSignals === 'object'
      ? platformFeePreviewData.sourceSignals
      : {}
  ), [platformFeePreviewData]);
  useEffect(() => {
    const item = copilotAgreementTarget;
    if (!item) {
      clearCopilotSelection('/room/agreements');
      return;
    }
    const facts = buildAgreementCopilotFacts(item, {
      pendingCount: pending.length,
      otherCount: others.length,
      extendCount: extendItems.length,
      shiftCount: Number(shiftStats?.[item.id]?.todayTotal || 0) + Number(shiftStats?.[item.id]?.horizonOpen || 0),
      routeRefreshState: selectedRouteRefreshItem ? selectedRouteRefreshStatus : '',
      routeRefreshRequestId: Number(selectedRouteRefreshItem?.id || 0),
      routeRefreshLabel: selectedRouteRefreshItem ? `Rota güncelleme ID ${selectedRouteRefreshItem.id}` : '',
      routeRefreshNote: selectedRouteRefreshItem
        ? (selectedRouteRefreshStatus === 'ACCEPTED'
          ? 'Kabul edildi'
          : selectedRouteRefreshStatus === 'REJECTED'
            ? 'Reddedildi'
            : selectedRouteRefreshCountered
              ? 'Karşı teklif'
              : 'Bekliyor')
        : '',
      routeRefreshChangeType: selectedRouteRefreshItem?.changeType || '',
      routeRefreshCurrentText: selectedRouteRefreshCurrentText,
      routeRefreshProposedText: selectedRouteRefreshProposedText,
      routeRefreshDiffText: selectedRouteRefreshDiffText,
      routeRefreshPriceImpactText: selectedRouteRefreshPriceImpactText,
      routeRefreshRoomCounterText: selectedRouteRefreshRoomCounterText,
      routeRefreshSummaryText: selectedRouteRefreshSummaryText,
      dynamicSavingsPreview: selectedDynamicSavingsPreview,
      qualityPaymentBridgePreview: qualityBridgePreview,
      qualityPaymentBridgeSummaryText: qualityBridgeSummaryText,
      qualityPaymentBridgeStatus: qualityBridgeStatusText,
      qualityPaymentBridgeProofCompleteness: qualityBridgeProofCompleteness,
      qualityPaymentBridgeSettlementReadiness: qualityBridgeSettlementReadiness,
      qualityPaymentBridgeImpactStatus: qualityBridgeImpactStatus,
      qualityPaymentBridgeImpactReason: qualityBridgeImpactReason,
      qualityPaymentBridgeMissingProofs: qualityBridgeMissingProofs,
      qualityPaymentBridgeRiskReasons: qualityBridgeRiskReasons,
      qualityPaymentBridgeNextAction: qualityBridgeNextAction,
      seferScorePreview: seferScorePreviewData,
      seferScoreSummaryText,
      seferScoreValue,
      seferScoreMax,
      seferScoreLevel,
      seferScoreConfidence,
      seferScoreStatus,
      seferScoreSupplierLabel,
      seferScorePositiveReasons,
      seferScoreRiskReasons,
      seferScoreMissingSignals,
      seferScoreNextAction,
      seferScoreSafeExplanation,
      platformFeePreview: platformFeePreviewData,
      platformFeeSummaryText,
      platformFeeSourceType,
      platformFeeSourceLabel,
      platformFeeSourceConfidence,
      platformFeeLicenseFeeText,
      platformFeeAmountText,
      platformFeeRateLabel,
      platformFeeEstimatedShareText,
      platformFeeSafeExplanation,
      platformFeeLineageSummary,
      platformFeeReason,
      platformFeeScoreText,
      platformFeeEvidence,
      platformFeeSignals,
    });
    setCopilotSelection({
      scopeKey: '/room/agreements',
      entityType: item?.shiftId ? 'shift' : 'screen',
      entityId: Number(item?.shiftId || 1106) || 1106,
      label: `Sözleşme ID ${item.id}`,
      summary: [String(item?.status || '').toUpperCase() || '-', ymdTR(item?.startDate), ymdTR(item?.endDate), qualityBridgeSummaryText, seferScoreSummaryText, platformFeeSummaryText].filter(Boolean).join(' • '),
      fields: [
        { label: 'Durum', value: String(item?.status || '-').toUpperCase(), help: 'Sözleşmenin karar veya aktiflik durumunu gösterir.' },
        { label: 'Başlangıç', value: ymdTR(item?.startDate), help: 'Sözleşmenin başlangıç tarihini gösterir.' },
        { label: 'Bitiş', value: ymdTR(item?.endDate), help: 'Sözleşmenin bitiş tarihini gösterir.' },
        { label: 'Tutar', value: moneyTry(item?.companyOfferAmount ?? item?.amount ?? '-'), help: 'Şirkete ait teklif veya sözleşme tutarını gösterir.' },
        { label: 'Araç', value: item?.vehicleId ? `Araç ID ${item.vehicleId}` : '-', help: 'Onay sırasında seçilen aracı gösterir.' },
        { label: 'Sürücü', value: item?.driverId ? `Sürücü ID ${item.driverId}` : '-', help: 'Onay sırasında seçilen sürücüyü gösterir.' },
        qualityBridgePreview ? {
          label: 'Kalite durumu',
          value: qualityBridgeStatusText || '-',
          help: 'Sadece kalite değerlendirmesi; ödeme başlatılmaz.',
        } : null,
        qualityBridgePreview ? {
          label: 'Kanıt tamlığı',
          value: Number.isFinite(qualityBridgeProofCompleteness) ? `${Math.max(0, Math.min(100, Math.round(qualityBridgeProofCompleteness)))}%` : '-',
          help: 'Eksik kanıt varsa önce tamamlanmalı.',
        } : null,
        qualityBridgePreview ? {
          label: 'Önizleme etkisi',
          value: qualityBridgeImpactStatus || '-',
          help: qualityBridgeImpactReason || 'Hakediş önizleme etkisi sadece okunur.',
        } : null,
        qualityBridgePreview ? {
          label: 'Hazırlık',
          value: qualityBridgeSettlementReadiness || '-',
          help: 'Mutabakat hazırlığı yalnızca salt okunur görünür.',
        } : null,
        qualityBridgePreview ? {
          label: 'Sıradaki işlem',
          value: qualityBridgeNextAction || '-',
          help: 'Sadece öneri gösterilir; ödeme başlatılmaz.',
        } : null,
        seferScorePreviewData ? {
          label: 'SeferPuanı',
          value: Number.isFinite(seferScoreValue) ? `${seferScoreValue.toFixed(2)} / ${seferScoreMax.toFixed(0)}` : '-',
          help: seferScoreSummaryText || 'Sadece önizleme — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.',
        } : null,
        seferScorePreviewData ? {
          label: 'Seviye',
          value: seferScoreLevel || '-',
          help: 'Elit / İyi / Standart / Riskli / Kritik.',
        } : null,
        seferScorePreviewData ? {
          label: 'Güven',
          value: seferScoreConfidence || '-',
          help: 'Önizleme güven seviyesini gösterir.',
        } : null,
        seferScorePreviewData ? {
          label: 'Sıradaki Sefer adımı',
          value: seferScoreNextAction || '-',
          help: 'Sadece okunur yönlendirme gösterir.',
        } : null,
        platformFeePreviewData ? {
          label: 'Lisans ücreti',
          value: platformFeeLicenseFeeText || '-',
          help: 'Lisans ücreti daima 0 TL sadece önizlemedir.',
        } : null,
        platformFeePreviewData ? {
          label: 'Kaynak durumu',
          value: platformFeeSourceLabel || '-',
          help: platformFeeSummaryText || platformFeeSafeExplanation || 'Sadece kaynak önizlemesi.',
        } : null,
        platformFeePreviewData ? {
          label: 'Başarı payı oranı',
          value: platformFeeRateLabel || '-',
          help: platformFeeReason || 'Başarı payı yalnızca önizlenir.',
        } : null,
        platformFeePreviewData ? {
          label: 'Tahmini başarı payı',
          value: platformFeeEstimatedShareText || '-',
          help: `Tutar: ${platformFeeAmountText || '-'}`,
        } : null,
        platformFeePreviewData ? {
          label: 'Tahsilat / fatura',
          value: 'Kapalı',
          help: 'Sadece önizleme — tahsilat/fatura oluşturulmaz.',
        } : null,
        platformFeePreviewData ? {
          label: 'Kaynak zinciri',
          value: platformFeeSignals?.hasLineageSignal ? 'Sinyal var' : 'Yok',
          help: platformFeeLineageSummary || 'Kaynak vardiya / market shift sinyali görünmüyor.',
        } : null,
        selectedRouteRefreshItem ? {
          label: 'Rota güncellemesi',
          value: selectedRouteRefreshStatus === 'ACCEPTED'
            ? 'Kabul edildi'
            : selectedRouteRefreshStatus === 'REJECTED'
              ? 'Reddedildi'
              : selectedRouteRefreshCountered
                ? 'Karşı teklif'
                : 'Bekliyor',
          help: selectedRouteRefreshSummaryText || 'Sözleşmeye bağlı rota güncelleme talebi.',
        } : null,
        { label: 'Bugün / Ufuk', value: `${Number(shiftStats?.[item.id]?.todayDone || 0)}/${Number(shiftStats?.[item.id]?.todayTotal || 0)} tamamlandı • ${Number(shiftStats?.[item.id]?.horizonOpen || 0)} kabul edildi`, help: 'Bugünkü ilerlemeyi ve 7 günlük ufuktaki üretilmiş vardiya sayısını gösterir.' },
      ],
      badges: [
        { label: 'Liste', value: pending.some((x) => x.id === item.id) ? 'Bekleyen' : others.some((x) => x.id === item.id) ? 'Diğer' : 'Uzatma', help: 'Sözleşmenin şu an hangi bölümde göründüğünü gösterir.' },
        { label: 'Kalan Gün', value: daysLeftYmd(item?.endDate) == null ? '-' : `${daysLeftYmd(item?.endDate)} gün`, help: 'Bitiş tarihine kaç gün kaldığını özetler.' },
        qualityBridgePreview ? { label: 'Sadece önizleme', value: 'Ödeme başlatılmaz', help: qualityBridgePreview?.previewOnlyNote || 'Tahsilat/fatura oluşturulmaz.' } : null,
        platformFeePreviewData ? { label: 'Platform', value: 'Sadece önizleme', help: platformFeeSafeExplanation || 'Sadece önizleme — tahsilat/fatura oluşturulmaz.' } : null,
      ],
      facts,
    });
    return () => clearCopilotSelection('/room/agreements');
  }, [
    copilotAgreementTarget,
    pending,
    others,
    extendItems,
    shiftStats,
    routeRefreshItems,
    routeRefreshPreviewById,
    selectedRouteRefreshItem,
    selectedRouteRefreshStatus,
    selectedRouteRefreshCountered,
    selectedRouteRefreshSummaryText,
    selectedRouteRefreshCurrentText,
    selectedRouteRefreshProposedText,
    selectedRouteRefreshDiffText,
    selectedRouteRefreshPriceImpactText,
    selectedRouteRefreshRoomCounterText,
    selectedDynamicSavingsPreview,
    qualityPaymentBridgePreview,
    qualityBridgePreview,
    qualityBridgeStatusText,
    qualityBridgeProofCompleteness,
    qualityBridgeSettlementReadiness,
    qualityBridgeImpactStatus,
    qualityBridgeImpactReason,
    qualityBridgeMissingProofs,
    qualityBridgeRiskReasons,
    qualityBridgeNextAction,
    qualityBridgeSummaryText,
    seferScorePreviewData,
    seferScoreValue,
    seferScoreMax,
    seferScoreLevel,
    seferScoreConfidence,
    seferScoreStatus,
    seferScoreSummaryText,
    seferScoreSupplierLabel,
    seferScorePositiveReasons,
    seferScoreRiskReasons,
    seferScoreMissingSignals,
    seferScoreNextAction,
    seferScoreSafeExplanation,
    platformFeePreviewData,
    platformFeeSourceType,
    platformFeeSourceLabel,
    platformFeeSourceConfidence,
    platformFeeLicenseFeeText,
    platformFeeAmountText,
    platformFeeRateLabel,
    platformFeeEstimatedShareText,
    platformFeeSummaryText,
    platformFeeSafeExplanation,
    platformFeeLineageSummary,
    platformFeeReason,
    platformFeeScoreText,
    platformFeeEvidence,
    platformFeeSignals,
  ]);

  useEffect(() => {
    let cancelled = false;
    const agreementId = Number(copilotAgreementTarget?.id || 0);
    if (!token || !agreementId) {
      setQualityPaymentBridgePreview({ loading: false, data: null, err: "" });
      setPlatformFeePreview({ loading: false, data: null, err: "" });
      setSeferScorePreview({ loading: false, data: null, err: "" });
      return () => {
        cancelled = true;
      };
    }

    const controller = new AbortController();
    setQualityPaymentBridgePreview((prev) => ({ ...prev, loading: true, err: "" }));
    setPlatformFeePreview((prev) => ({ ...prev, loading: true, err: "" }));
    setSeferScorePreview((prev) => ({ ...prev, loading: true, err: "" }));

    (async () => {
      const [qualityResult, platformResult, seferResult] = await Promise.allSettled([
        getAgreementQualityPaymentBridgePreview(agreementId, { token, signal: controller.signal }),
        getAgreementPlatformFeePreview(agreementId, { token, signal: controller.signal }),
        getAgreementSeferScorePreview(agreementId, { token, signal: controller.signal }),
      ]);
      if (cancelled) return;
      setQualityPaymentBridgePreview(
        qualityResult.status === "fulfilled"
          ? { loading: false, data: qualityResult.value, err: "" }
          : { loading: false, data: null, err: qualityResult.reason?.message || "Sadece önizleme yüklenemedi" }
      );
      setPlatformFeePreview(
        platformResult.status === "fulfilled"
          ? { loading: false, data: platformResult.value, err: "" }
          : { loading: false, data: null, err: platformResult.reason?.message || "Sadece platform önizlemesi yüklenemedi" }
      );
      setSeferScorePreview(
        seferResult.status === "fulfilled"
          ? { loading: false, data: seferResult.value, err: "" }
          : { loading: false, data: null, err: seferResult.reason?.message || "Sadece puan önizlemesi yüklenemedi" }
      );
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token, copilotAgreementTarget?.id]);

  function openAgreementShift(shiftId) {
    const sid = Number(shiftId || 0);
    if (!sid) return;
    try { localStorage.setItem("room:focusShiftId", String(sid)); } catch (e) { void e; }
    navigate("/room/shifts");
  }

  function openAgreementPreview(shiftId, options = {}) {
    const sid = Number(shiftId || 0);
    if (!sid) return;
    const nextTitle = String(options?.title || "").trim();
    setPreviewModal({
      open: true,
      shiftId: sid,
      title: nextTitle || `Vardiya ID ${sid} — Harita Önizleme`,
    });
  }

  function openAgreementDetail(agreement) {
    const id = Number(agreement?.id || 0);
    if (!id) return;
    setSelectedAgreementId(id);
    setBridgeDetailsRequested(true);
    setViewMode("bridge");
  }

  function agreementPreviewShiftId(agreement) {
    const agreementId = Number(agreement?.id || 0);
    const bridge = agreementId > 0 ? opsBridge?.[String(agreementId)] || null : null;
    const lastShiftId = Number(bridge?.lastShift?.id || 0);
    if (lastShiftId > 0) return lastShiftId;
    const sourceShiftId = Number(
      bridge?.sourceShiftId ||
      bridge?.sourceShift?.id ||
      agreement?.commercialBackbone?.shiftRootId ||
      agreement?.commercialBackbone?.sourceShiftId ||
      0
    );
    return sourceShiftId > 0 ? sourceShiftId : 0;
  }

  useEffect(() => {
    if (!token || !routeRefreshItems.length || viewMode !== "route") {
      setRouteRefreshPreviewById({});
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const items = routeRefreshItems.slice(0, 4);
    const loadingMap = Object.fromEntries(items.map((item) => [String(item.id), { loading: true, current: null, proposed: null, err: "" }]));
    setRouteRefreshPreviewById(loadingMap);
    (async () => {
      const results = await Promise.all(items.map(async (item) => {
        const requestId = Number(item?.id || 0);
        const sourceShiftId = Number(item?.sourceShiftId || 0);
        const draftShiftId = Number((item?.draftShiftIds || [])[0] || 0);
        try {
          const [currentRaw, proposedRaw] = await Promise.all([
            sourceShiftId > 0 ? getShiftRoutePreview(token, sourceShiftId, { signal: controller.signal, force: true, ttlMs: 0, delayMs: 0 }) : null,
            draftShiftId > 0 ? getShiftRoutePreview(token, draftShiftId, { signal: controller.signal, force: true, ttlMs: 0, delayMs: 0 }) : null,
          ]);
          return [String(requestId), {
            loading: false,
            current: summarizeRoutePreview(currentRaw),
            proposed: summarizeRoutePreview(proposedRaw),
            err: "",
          }];
        } catch (error) {
          return [String(requestId), {
            loading: false,
            current: null,
            proposed: null,
            err: error?.message || "Rota özeti yüklenemedi.",
          }];
        }
      }));
      if (cancelled) return;
      setRouteRefreshPreviewById(Object.fromEntries(results));
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token, routeRefreshItems, viewMode]);

  const loadAll = useCallback(async ({ force = false } = {}) => {
    if (!token) return;
    setErr("");
    try {
      const all = await cachedGet("/api/agreements?take=200", { token, force, ttlMs: 10 * 60 * 1000, delayMs: 90 });
      const items = all?.items ?? [];

      // ✅ M59: shift stats (today/horizon) for UI clarity
      try {
        const ids = items.map((x) => x?.id).filter(Boolean);
        if (ids.length) {
          const [st, bridge, routeRefresh] = await Promise.all([
            api("/api/agreements/shift-stats", { token, method: "POST", body: { agreementIds: ids, horizonDays: 7 } }),
            api("/api/agreements/ops-bridge", { token, method: "POST", body: { agreementIds: ids } }),
            cachedGet("/api/agreements/route-refresh", { token, force, ttlMs: 10 * 60 * 1000, delayMs: 120 }).catch(() => ({ items: [] })),
          ]);
          setShiftStats(st?.byId ?? {});
          setOpsBridge(bridge?.byId ?? {});
          setRouteRefreshItems(Array.isArray(routeRefresh?.items) ? routeRefresh.items : []);
        } else {
          setShiftStats({});
          setOpsBridge({});
          setRouteRefreshItems([]);
        }
      } catch {
        setShiftStats({});
        setOpsBridge({});
        setRouteRefreshItems([]);
      }


      // ✅ M58.3: robust extend request detection (handles older/variant field names)
      const extend = items.filter((x) => {
        const es = String(x?.extendStatus || "NONE").toUpperCase();
        const reqEnd = x?.extendRequestedEndDate ?? x?.extendRequestedEndAt ?? x?.extendRequestedEnd ?? null;
        // REQUESTED/COUNTERED are canonical. PENDING is tolerated as alias for safety.
        return !!reqEnd && ["REQUESTED", "COUNTERED", "PENDING"].includes(es);
      });
      setExtendItems(extend);
      setPending(items.filter((x) => String(x.status || "").toUpperCase() === "REQUESTED"));
      setOthers(items.filter((x) => String(x.status || "").toUpperCase() !== "REQUESTED"));

      const v = await api("/api/vehicles", { token });
      setVehicles(v?.items ?? v ?? []);

      const d = await api("/api/drivers", { token });
      setDrivers(d?.items ?? d ?? []);
    } catch (e) {
      setErr(e?.message || "Load failed");
    }
  }, [token]);

  // ✅ WS invalidate → agreements topic gelince reload
  useAutoReload("agreements", () => loadAll({ force: true }), !!token);

  useEffect(() => {
    if (!token) return;
    loadAll();
  }, [loadAll, token]);

  useEffect(() => {
    if (viewMode !== "bridge") {
      setBridgeDetailsRequested(false);
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewModeInitializedRef.current) return;
    if (!pendingRouteRefreshItems.length && !pending.length && !others.length && !extendItems.length) return;
    setViewMode(resolveRoomAgreementsDefaultTab({
      routeRefreshPendingCount: pendingRouteRefreshItems.length,
      pendingCount: pending.length,
      extendCount: extendItems.length,
      otherCount: others.length,
    }));
    viewModeInitializedRef.current = true;
  }, [extendItems.length, others.length, pending.length, pendingRouteRefreshItems.length]);

  async function approve() {
    setConflict(null);
    setErr("");

    if (!approveId) return;
    const vehicleId = Number(selVehicle);
    const driverId = Number(selDriver);
    if (!vehicleId || !driverId) return setErr("vehicle+driver seçmelisin");

    setBusy(true);
    try {
      await api(`/api/agreements/${approveId}/approve`, {
        token,
        method: "PUT",
        body: { vehicleId, driverId },
      });

      setApproveId(null);
      setSelVehicle("");
      setSelDriver("");
      await loadAll({ force: true });
    } catch (e) {
      const status = e?.status ?? null;
      const payload = e?.payload ?? null;

      if (status === 409) {
        setConflict(payload || { code: "CONFLICT", message: e?.message || "Conflict" });
      } else {
        setErr(e?.message || "Approve failed");
      }
    } finally {
      setBusy(false);
    }
  }

  async function counter() {
    setErr("");
    if (!counterId) return;
    const amount = parseTryInput(counterAmount);
    if (!amount) return setErr("Karşı teklif amount gerekli");

    setBusy(true);
    try {
      await api(`/api/agreements/${counterId}/counter`, {
        token,
        method: "PUT",
        body: { roomOfferAmount: amount, roomOfferNote: String(counterNote || "").trim() || null },
      });

      setCounterId(null);
      setCounterAmount("");
      setCounterNote("");
      await loadAll({ force: true });
    } catch (e) {
      setErr(e?.message || "Counter failed");
    } finally {
      setBusy(false);
    }
  }

  async function rejectAgreement(id) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/reject`, { token, method: "PUT", body: {} });
      if (Number(counterId || 0) === Number(id)) {
        setCounterId(null);
        setCounterAmount("");
        setCounterNote("");
      }
      if (Number(approveId || 0) === Number(id)) {
        setApproveId(null);
        setSelVehicle("");
        setSelDriver("");
        setConflict(null);
      }
      await loadAll({ force: true });
    } catch (e) {
      setErr(e?.message || "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  async function decideRouteRefresh(requestId, decision) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/route-refresh/${requestId}/decision`, {
        token,
        method: "PUT",
        body: { decision },
      });
      setRouteRefreshCounterId(null);
      setRouteRefreshCounterAmount("");
      setRouteRefreshCounterNote("");
      await loadAll({ force: true });
    } catch (e) {
      setErr(e?.message || "Rota güncelleme kararı kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function counterRouteRefresh() {
    setErr("");
    if (!routeRefreshCounterId) return;
    const amount = parseTryInput(routeRefreshCounterAmount);
    if (!amount) return setErr("Rota güncelleme karşı teklif tutarı gerekli");
    setBusy(true);
    try {
      await api(`/api/agreements/route-refresh/${routeRefreshCounterId}/counter`, {
        token,
        method: "PUT",
        body: {
          roomCounterAmount: amount,
          roomCounterNote: String(routeRefreshCounterNote || "").trim() || null,
        },
      });
      setRouteRefreshCounterId(null);
      setRouteRefreshCounterAmount("");
      setRouteRefreshCounterNote("");
      await loadAll({ force: true });
    } catch (e) {
      setErr(e?.message || "Rota güncelleme karşı teklif gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function extendDecision(id, decision) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/extend-decision`, { token, method: "PUT", body: { decision } });
      await loadAll({ force: true });
    } catch (e) {
      setErr(e?.message || "Extend decision failed");
    } finally {
      setBusy(false);
    }
  }

  async function extendCounter() {
    setErr("");
    if (!extendCounterId) return;
    const amount = parseTryInput(extendCounterAmount);
    if (!amount) return setErr("Uzatma karşı teklif amount gerekli");

    setBusy(true);
    try {
      await api(`/api/agreements/${extendCounterId}/extend-counter`, {
        token,
        method: "PUT",
        body: { extendCounterAmount: amount, extendCounterNote: String(extendCounterNote || "").trim() || null },
      });

      setExtendCounterId(null);
      setExtendCounterAmount("");
      setExtendCounterNote("");
      await loadAll({ force: true });
    } catch (e) {
      setErr(e?.message || "Extend counter failed");
    } finally {
      setBusy(false);
    }
  }

  function startRouteRefreshCounter(item) {
    setRouteRefreshCounterId(Number(item?.id || 0));
    setRouteRefreshCounterAmount(String(item?.roomCounterAmount || item?.companyOfferAmount || ""));
    setRouteRefreshCounterNote(String(item?.roomCounterNote || ""));
  }

  function cancelRouteRefreshCounter() {
    setRouteRefreshCounterId(null);
    setRouteRefreshCounterAmount("");
    setRouteRefreshCounterNote("");
  }

  function startExtendCounter(item) {
    setExtendCounterId(item.id);
    setExtendCounterAmount(String(item.extendCounterAmount ?? item.extendOfferAmount ?? item.companyOfferAmount ?? ""));
    setExtendCounterNote(String(item.extendCounterNote ?? ""));
  }

  function cancelExtendCounter() {
    setExtendCounterId(null);
    setExtendCounterAmount("");
    setExtendCounterNote("");
  }


  return (
    <div className="card roomCriticalFixScope">
      <div className="topbar">
        <div>
          <div className="title">Taşımacılık Firması / Sözleşmeler</div>
          <div className="muted">Bekleyen sözleşmeler burada karar bekler. Taşımacılık Firması bu ekranda kabul / karşı teklif / red kararını verir. Not: sözleşme durumu zaman bazlıdır. Sürücü vardiyayı bitirse bile sözleşme bitiş tarihine kadar devam ediyor görünebilir. Uzatma talepleri de burada yönetilir.</div>
        </div>
        <button type="button" className="btn sm ghost" disabled={busy} onClick={loadAll}>
          Yenile
        </button>
      </div>

      {err ? <div className="card err">{String(err)}</div> : null}

      {roomAgreementsNotice ? (
        <div
          className="card"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            border: roomAgreementsNotice.tone === "warning" ? "1px solid rgba(250,204,21,.42)" : "1px solid rgba(88,166,255,.32)",
            background: roomAgreementsNotice.tone === "warning" ? "rgba(250,204,21,.06)" : "rgba(88,166,255,.06)",
          }}
        >
          <div style={{ minWidth: 240 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Yeni gelen talep</div>
            <div style={{ fontWeight: 900 }}>{roomAgreementsNotice.title}</div>
            <div className="muted" style={{ marginTop: 4 }}>{roomAgreementsNotice.detail}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {copilotAgreementTarget ? (
              <button type="button" className="btn sm" onClick={() => openAgreementDetail(copilotAgreementTarget)}>
                Detayı aç
              </button>
            ) : null}
            <button type="button" className="btn sm primary" onClick={() => setViewMode(roomAgreementsNotice.actionTab)}>
              {roomAgreementsNotice.actionLabel}
            </button>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <div className="muted">Filtre</div>
          <input value={filterQ} onChange={(e) => setFilterQ(e.target.value)} placeholder="Kayıt no / durum / teklif / tarih / not" />
        </div>
        <div className="muted">Gösterilen: <b>{filteredRouteRefreshItems.length + filteredAcceptedRouteRefreshItems.length + filteredPending.length + filteredOthers.length + filteredExtendItems.length}</b> / Toplam: <b>{routeRefreshItems.length + pending.length + others.length + extendItems.length}</b></div>
      </div>

      <PanelSegmentTabs
        tabs={roomAgreementTabs}
        value={viewMode}
        onChange={setViewMode}
        compact
      />

      {viewMode === "bridge" ? (
        <ReconciliationPreviewCard agreementId={copilotAgreementTarget?.id} token={token} style={{ marginTop: 12 }} />
      ) : null}

      {viewMode === "bridge" ? (
        <RoomAgreementsBridgeSection
          busy={busy}
          copilotAgreementTarget={copilotAgreementTarget}
          opsBridge={opsBridge}
          bridgeDetailsRequested={bridgeDetailsRequested}
          onRequestBridgeDetails={() => setBridgeDetailsRequested(true)}
          onOpenShift={openAgreementShift}
          onOpenPreview={openAgreementPreview}
          qualityPaymentBridgePreview={qualityPaymentBridgePreview}
          seferScorePreviewData={seferScorePreviewData}
          seferScorePreview={seferScorePreview}
          platformFeePreviewData={platformFeePreviewData}
          platformFeePreview={platformFeePreview}
          counterTarget={counterTarget}
          counterAmount={counterAmount}
          counterNote={counterNote}
          onChangeCounterAmount={setCounterAmount}
          onChangeCounterNote={setCounterNote}
          onCounterSubmit={counter}
          onCounterCancel={() => {
            setCounterId(null);
            setCounterAmount("");
            setCounterNote("");
          }}
          approveTarget={approveTarget}
          vehicles={vehicles}
          drivers={drivers}
          selVehicle={selVehicle}
          selDriver={selDriver}
          onChangeVehicle={setSelVehicle}
          onChangeDriver={setSelDriver}
          onApproveSubmit={approve}
          onApproveCancel={() => {
            setApproveId(null);
            setSelVehicle("");
            setSelDriver("");
            setConflict(null);
          }}
          conflict={conflict}
          onClearConflict={() => setConflict(null)}
        />
      ) : null}

      {viewMode === "route" ? (
        <RoomAgreementsRouteRefreshPendingSection
          items={routeRefreshPreviewList}
          agreementById={agreementById}
          routeRefreshPreviewById={routeRefreshPreviewById}
          opsBridge={opsBridge}
          selectedAgreementId={selectedAgreementId}
          onSelectAgreement={setSelectedAgreementId}
          onOpenPreview={openAgreementPreview}
          busy={busy}
          routeRefreshCounterId={routeRefreshCounterId}
          routeRefreshCounterAmount={routeRefreshCounterAmount}
          routeRefreshCounterNote={routeRefreshCounterNote}
          onStartCounter={startRouteRefreshCounter}
          onChangeCounterAmount={setRouteRefreshCounterAmount}
          onChangeCounterNote={setRouteRefreshCounterNote}
          onCancelCounter={cancelRouteRefreshCounter}
          onSubmitCounter={counterRouteRefresh}
          onDecision={decideRouteRefresh}
        />
      ) : null}

      {viewMode === "applied" ? (
        <RoomAgreementsRouteRefreshAcceptedSection
          items={acceptedRouteRefreshPreviewList}
          agreementById={agreementById}
          routeRefreshPreviewById={routeRefreshPreviewById}
          selectedAgreementId={selectedAgreementId}
          onSelectAgreement={setSelectedAgreementId}
          onOpenPreview={openAgreementPreview}
        />
      ) : null}

      {viewMode === "extend" ? (
        <RoomAgreementsExtendRequestsSection
          items={filteredExtendItems}
          selectedAgreementId={selectedAgreementId}
          onSelectAgreement={setSelectedAgreementId}
          busy={busy}
          extendCounterId={extendCounterId}
          extendCounterAmount={extendCounterAmount}
          extendCounterNote={extendCounterNote}
          onDecision={extendDecision}
          onStartCounter={startExtendCounter}
          onChangeCounterAmount={setExtendCounterAmount}
          onChangeCounterNote={setExtendCounterNote}
          onSubmitCounter={extendCounter}
          onCancelCounter={cancelExtendCounter}
        />
      ) : null}

      {viewMode === "pending" ? (
        <div className="card">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Bekleyen Sözleşmeler</div>
          <div className="muted" style={{ marginBottom: 12 }}>
            Yeni gelen teklif, karşı teklif ve karar bekleyen kayıtlar burada listelenir. Operasyon köprüsü üstteki tek CTA ile açılır; detaylar burada tekrar edilmez.
          </div>
          <div className="tableWrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tarih</th>
                  <th>Saat</th>
                  <th>Günler</th>
                  <th>Dir/Pat</th>
                  <th>Vardiyalar</th>
                  <th>Toplanma Konumu</th>
                  <th>Hizmet Alan Firma Teklifi</th>
                  <th>Taşımacılık Firması Karşı Teklifi</th>
                  <th>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.map((a) => (
                  <tr key={a.id} onClick={() => setSelectedAgreementId(a.id)} style={rowSelectionStyle(Number(selectedAgreementId || 0) === Number(a.id || 0))}>
                    <td><div>{a.id}</div><CommercialReadonlySummary item={a.commercialBackbone} compact /></td>
                    <td className="muted">
                      {String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)} {(() => { const endYmd = String(a.endDate || "").slice(0,10); const left = daysLeftYmd(endYmd); return Number.isFinite(left) ? ` (kalan ${left}g)` : ""; })()}
                    </td>
                    <td className="muted">
                      {toHHMM(a.startMin)} → {toHHMM(a.endMin)} {a.endMin < a.startMin ? <span title="midnight">🌙</span> : null}
                    </td>
                    <td className="muted" title={`weekMask=${a.weekMask}`}>{weekMaskToText(a.weekMask)}</td>
                    <td className="muted">
                      {String(a.direction || "INBOUND")}/{String(a.pattern || "ONE_WAY")}
                    </td>
                    <td><ShiftSummary st={shiftStats?.[a.id]} /></td>
                    <td className="muted">
                      {typeof a.hubLat === "number" && typeof a.hubLng === "number" ? `${a.hubLat.toFixed(4)}, ${a.hubLng.toFixed(4)}` : "-"}
                    </td>
                    <td><OfferCell amount={a.companyOfferAmount} note={a.companyOfferNote} /></td>
                    <td><OfferCell amount={a.roomOfferAmount} note={a.roomOfferNote} /></td>
                    <td>
                      <button
                        type="button"
                        className="btn sm primary roomActionCTA"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAgreementDetail(a);
                        }}
                      >
                        Detayı aç
                      </button>
                      <button
                        type="button"
                        className="btn sm ghost roomActionCTA"
                        disabled={!agreementPreviewShiftId(a)}
                        onClick={(e) => {
                          e.stopPropagation();
                          openAgreementPreview(agreementPreviewShiftId(a), { title: `Sözleşme ID ${a.id} — Rota Önizleme` });
                        }}
                      >
                        Rota Önizle
                      </button>
                      <button
                        type="button"
                        className="btn sm ghost"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAgreementId(a.id);
                          setCounterId(a.id);
                          setApproveId(null);
                          setConflict(null);
                          setCounterAmount(String(a.roomOfferAmount ?? a.companyOfferAmount ?? ""));
                          setCounterNote(String(a.roomOfferNote ?? ""));
                          setViewMode("bridge");
                        }}
                      >
                        Karşı Teklif
                      </button>
                      <button
                        type="button"
                        className="btn sm ghost"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          rejectAgreement(a.id);
                        }}
                      >
                        Reddet
                      </button>
                      <button
                        type="button"
                        className="btn sm"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAgreementId(a.id);
                          setApproveId(a.id);
                          setCounterId(null);
                          setConflict(null);
                          setViewMode("bridge");
                        }}
                      >
                        Kabul Et
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredPending.length ? (
                  <tr>
                    <td colSpan={10} className="muted">Bekleyen sözleşme yok.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {viewMode === "other" ? (
        <div className="card">
          <div className="topbar" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 900 }}>Diğer Sözleşmeler</div>
            <div className="muted">Kabul edildi / devam ediyor / tamamlandı / iptal edildi...</div>
          </div>

          <div className="tableWrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                  <th>Saat</th>
                  <th>Günler</th>
                  <th>Dir/Pat</th>
                  <th>Hizmet Alan Firma Teklifi</th>
                  <th>Taşımacılık Firması Karşı Teklifi</th>
                  <th>Araç</th>
                  <th>Sürücü</th>
                  <th>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {filteredOthers.map((a) => (
                  <tr key={a.id} onClick={() => setSelectedAgreementId(a.id)} style={rowSelectionStyle(Number(selectedAgreementId || 0) === Number(a.id || 0))}>
                    <td>{a.id}</td>
                    <td>{pill(a.status)}</td>
                    <td className="muted">
                      {String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)} {(() => { const endYmd = String(a.endDate || "").slice(0,10); const left = daysLeftYmd(endYmd); return Number.isFinite(left) ? ` (kalan ${left}g)` : ""; })()}
                    </td>
                    <td className="muted">
                      {toHHMM(a.startMin)} → {toHHMM(a.endMin)} {a.endMin < a.startMin ? <span title="midnight">🌙</span> : null}
                    </td>
                    <td className="muted" title={`weekMask=${a.weekMask}`}>{weekMaskToText(a.weekMask)}</td>
                    <td className="muted">{String(a.direction || "INBOUND")}/{String(a.pattern || "ONE_WAY")}</td>
                    <td><OfferCell amount={a.companyOfferAmount} note={a.companyOfferNote} /></td>
                    <td><OfferCell amount={a.roomOfferAmount} note={a.roomOfferNote} /></td>
                    <td className="muted">{a.vehicle?.plate ?? a.vehicleId ?? "-"}</td>
                    <td className="muted">{a.driver?.fullName ?? a.driverId ?? "-"}</td>
                    <td>
                      <button
                        type="button"
                        className="btn sm primary roomActionCTA"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAgreementDetail(a);
                        }}
                      >
                        Detayı aç
                      </button>
                      <button
                        type="button"
                        className="btn sm ghost roomActionCTA"
                        disabled={!agreementPreviewShiftId(a)}
                        onClick={(e) => {
                          e.stopPropagation();
                          openAgreementPreview(agreementPreviewShiftId(a), { title: `Sözleşme ID ${a.id} — Rota Önizleme` });
                        }}
                      >
                        Rota Önizle
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredOthers.length ? (
                  <tr>
                    <td colSpan={11} className="muted">Kayıt yok.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {previewModal.open ? (
        <RoutePreviewModal
          open={previewModal.open}
          onClose={() => setPreviewModal({ open: false, shiftId: null, title: "Rota Önizleme" })}
          title={previewModal.title || (previewModal.shiftId ? `Vardiya ID ${previewModal.shiftId} — Harita Önizleme` : "Rota Önizleme")}
          shiftId={previewModal.shiftId}
        />
      ) : null}
    </div>
  );
}
