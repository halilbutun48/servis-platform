import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";

const COST_LABELS = Object.freeze({
  FUEL: "Yakıt",
  ADBLUE: "AdBlue",
  MAINTENANCE: "Bakım",
  REPAIR: "Onarım",
  TIRE_RIM: "Lastik ve jant",
  TRAFFIC_INSURANCE: "Trafik sigortası",
  CASCO: "Kasko",
  INSPECTION: "Muayene",
  RENT: "Araç kirası",
  CLEANING: "Araç yıkama",
  EMPLOYER_MONTHLY_COST: "Sürücü maliyeti",
  BASE_SALARY: "Sürücü maliyeti",
  BENEFIT: "Sürücü maliyeti",
  OVERTIME: "Fazla mesai",
  OTHER_DRIVER: "Sürücü gideri",
  OTHER_VEHICLE: "Diğer araç gideri",
  SERVICE_DIRECT: "Doğrudan servis gideri",
  ROUTE_FEE: "Güzergâh gideri",
  OPERATIONS_OVERHEAD: "Operasyon gideri",
  OTHER_OPERATION: "Diğer operasyon gideri",
});

const ICONS = Object.freeze({
  FUEL: "↔",
  REPAIR: "⌁",
  MAINTENANCE: "⌁",
  CLEANING: "□",
  EMPLOYER_MONTHLY_COST: "◉",
  BASE_SALARY: "◉",
  DEFAULT: "•",
});

const ALLOCATION_REASON_LABELS = Object.freeze({
  ALLOCATION_EVIDENCE_INCOMPLETE: "Dağıtım dayanağı eksik",
  VAT_UNKNOWN_NET_ROLLUP: "KDV durumu bilinmiyor",
  NOT_CONFIRMED: "Kayıt henüz onaylı değil",
  INCOMPLETE: "Tutar veya para birimi eksik",
  MIXED_CURRENCIES: "Para birimi dönüşümü bekliyor",
  EXCLUDED_FROM_ROLLUP: "Toplam maliyet kapsamı dışında",
});

const MISSING_FIELD_LABELS = Object.freeze({
  vehicleId: "araç",
  driverId: "sürücü",
  shiftId: "vardiya/sefer",
  agreementId: "sözleşme",
  periodStart: "dönem başlangıcı",
  periodEnd: "dönem bitişi",
  allocationQuantity: "dağıtım miktarı",
  allocationUnit: "dağıtım birimi",
  allocationUnitRateMinor: "birim tutarı",
  currencyConversionEvidence: "para birimi dönüşüm kanıtı",
});

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function formatMoneyMinor(value, currencyCode = "TRY") {
  if (value === null || value === undefined || String(value).trim() === "") return "Veri bekleniyor";
  const amount = Number(value);
  if (!Number.isSafeInteger(amount)) return "Veri bekleniyor";
  const major = amount / 100;
  const fractionDigits = amount % 100 === 0 ? 0 : 2;
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  }).format(major);
  return `${formatted} ${String(currencyCode || "TRY").toUpperCase() === "TRY" ? "₺" : String(currencyCode).toUpperCase()}`;
}

function formatDate(value) {
  if (!value) return "Dönem belirtilmedi";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Dönem belirtilmedi" : date.toLocaleDateString("tr-TR");
}

function formatEntryPeriod(entry) {
  if (entry?.periodStart && entry?.periodEnd) return `${formatDate(entry.periodStart)} – ${formatDate(entry.periodEnd)}`;
  return formatDate(entry?.occurredAt);
}

function readableCategory(entry) {
  const sourceLabel = String(entry?.categoryLabel || "").trim();
  if (sourceLabel) return sourceLabel;
  const key = String(entry?.categoryKey || "").trim().toUpperCase();
  return COST_LABELS[key] || "Gider kaydı";
}

function findDirectoryItem(items, id) {
  const requestedId = positiveInteger(id);
  return requestedId ? items.find((item) => Number(item?.id) === requestedId) || null : null;
}

function vehicleLabel(entry, vehicles) {
  const id = positiveInteger(entry?.vehicleId);
  if (!id) return "Araç ilişkisi doğrulanmadı";
  const vehicle = findDirectoryItem(vehicles, id);
  return vehicle?.plate ? `Araç ${vehicle.plate}` : `Araç kaydı #${id}`;
}

function driverLabel(entry, drivers) {
  const id = positiveInteger(entry?.driverId);
  if (!id) return null;
  const driver = findDirectoryItem(drivers, id);
  return driver?.fullName ? `Sürücü ${driver.fullName}` : `Sürücü kaydı #${id}`;
}

function sourceStatus(entry) {
  return String(entry?.lifecycle || "CONFIRMED").toUpperCase() === "CONFIRMED" ? "Kaynak onaylı" : "Kayıt durumu bilinmiyor";
}

function vatStatus(entry) {
  const classification = String(entry?.vatClassification || "UNKNOWN").toUpperCase();
  return classification === "UNKNOWN"
    ? "KDV sınıflandırması bilinmiyor"
    : classification === "DOCUMENTED_VAT"
      ? "Belgeli KDV'li işlem"
      : classification === "OUT_OF_SCOPE"
        ? "KDV kapsamı dışı"
        : classification === "DOCUMENTED_EXEMPT"
          ? "Belgeli KDV istisnası"
          : "Dayanağı doğrulanmış sıfır oran";
}

function shiftStatus(entry) {
  return positiveInteger(entry?.shiftId) ? "Vardiya bağlantısı bağlı" : "Vardiya bağlantısı doğrulanmadı";
}

function periodRange(start, end, fallback = "Dönem belirtilmedi") {
  const startText = start ? formatDate(start) : "";
  const endText = end ? formatDate(end) : "";
  if (startText && endText) return `${startText} – ${endText}`;
  return startText || endText || fallback;
}

function allocationReasonLabel(value) {
  const key = String(value || "").trim().toUpperCase();
  return ALLOCATION_REASON_LABELS[key] || "Ek dağıtım kanıtı bekliyor";
}

function missingEvidenceLabel(item) {
  if (typeof item === "string") return MISSING_FIELD_LABELS[item] || "ilişkili kayıt";
  const fields = Array.isArray(item?.fields) ? item.fields : [];
  return fields.map((field) => MISSING_FIELD_LABELS[field] || "ilişkili kayıt").filter(Boolean).join(", ") || "İlişki veya dönem kanıtı";
}

function entryTimestamp(entry) {
  const value = entry?.occurredAt || entry?.periodEnd || entry?.periodStart || "";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function contextEntryMatches(entry, context = null) {
  if (!context) return true;
  const selectedVehicleId = positiveInteger(context.vehicleId);
  const selectedAgreementId = positiveInteger(context.agreementId);
  const selectedShiftId = positiveInteger(context.shiftId);
  if (selectedVehicleId && positiveInteger(entry?.vehicleId) !== selectedVehicleId) return false;
  if (selectedAgreementId && positiveInteger(entry?.agreementId) !== selectedAgreementId) return false;
  if (selectedShiftId && positiveInteger(entry?.shiftId) !== selectedShiftId) return false;
  return true;
}

function contextEntriesForOverview(evidence, entries = [], context = null) {
  const source = Array.isArray(evidence?.known) && evidence.known.length
    ? evidence.known
    : Array.isArray(evidence?.actual?.known) && evidence.actual.known.length
      ? evidence.actual.known
      : entries;
  return [...new Map(source
    .filter((entry) => String(entry?.recordKind || "ACTUAL").toUpperCase() === "ACTUAL")
    .filter((entry) => String(entry?.lifecycle || "CONFIRMED").toUpperCase() === "CONFIRMED")
    .filter((entry) => contextEntryMatches(entry, context))
    .map((entry) => [String(entry?.entryId || entry?.id || `${entry?.categoryKey}-${entry?.occurredAt}`), entry]))
    .values()];
}

function recentEntriesForOverview(evidence, entries = [], context = null) {
  return contextEntriesForOverview(evidence, entries, context)
    .sort((left, right) => entryTimestamp(right) - entryTimestamp(left))
    .slice(0, 4);
}

function overviewEntryKey(entry) {
  return String(entry?.entryId || entry?.id || `${entry?.categoryKey}-${entry?.occurredAt}`);
}

function actionFocus(missingDataActions = []) {
  const action = missingDataActions[0] || null;
  return action ? {
    costCategory: action.costCategory,
    field: action.field,
  } : {};
}

function statusLabel(value) {
  return {
    ACTIVE: "Aktif",
    APPROVED: "Onaylandı",
    DONE: "Tamamlandı",
    REQUESTED: "Talep edildi",
    SPLIT: "Bölündü",
  }[String(value || "").toUpperCase()] || "Durumu belirtilmedi";
}

function optionDate(value) {
  const text = formatDate(value);
  return text === "Dönem belirtilmedi" ? "Tarih belirtilmedi" : text;
}

function optionVehicleLabel(item) {
  return item?.plate || item?.brand || "Araç kaydı";
}

function agreementOptionLabel(agreement, vehicles) {
  const vehicle = findDirectoryItem(vehicles, agreement?.vehicleId);
  const vehicleText = vehicle?.plate || agreement?.vehicle?.plate || "Araç belirtilmedi";
  return `${vehicleText} · ${optionDate(agreement?.startDate)} · ${statusLabel(agreement?.status)}`;
}

function shiftOptionLabel(shift) {
  const vehicleText = shift?.vehicle?.plate || "Araç belirtilmedi";
  return `${vehicleText} · ${optionDate(shift?.startAt)} · ${statusLabel(shift?.status)}`;
}

function ContextSelect({ label, value, options, onChange, dataAttribute, emptyLabel, optionLabel }) {
  return (
    <label className="finance-v21-context-field">
      <span>{label}</span>
      <select
        aria-label={label}
        {...{ [`data-finance-context-${dataAttribute}`]: "true" }}
        value={value || ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={String(option.id)} value={String(option.id)}>{optionLabel(option)}</option>
        ))}
      </select>
    </label>
  );
}

function StatusPill({ children, tone = "neutral" }) {
  return <span className={`finance-v21-status finance-v21-status--${tone}`}>{children}</span>;
}

function EmptyState({ title, description }) {
  return (
    <div className="finance-v21-empty" role="status">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

export default function RoomFinanceOverviewPanel({
  token,
  preview,
  loading = false,
  err = "",
  roomCostFocus = {},
  missingDataActions = [],
  onNavigate,
  onViewChange,
  onContextChange,
  canManageExpenses = true,
}) {
  const [directory, setDirectory] = useState({ vehicles: [], drivers: [], entries: [], shifts: [], agreements: [] });
  const [directoryUnavailable, setDirectoryUnavailable] = useState(false);
  const [contextOpen, setContextOpen] = useState(() => typeof window === "undefined" || window.innerWidth > 640);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [selectedRecentEntryId, setSelectedRecentEntryId] = useState(null);

  useEffect(() => {
    if (!token || !canManageExpenses) return undefined;
    let active = true;
    Promise.allSettled([
      api.get("/api/vehicles", { token }),
      api.get("/api/drivers", { token }),
      api.get("/api/shifts?take=200&includeOffered=1", { token }),
      api.get("/api/agreements?take=200", { token }),
      api.get("/api/commercial-core/room/financial-operations/costs?includeSalary=true", { token }),
    ]).then(([vehicleResult, driverResult, shiftsResult, agreementsResult, costsResult]) => {
      if (!active) return;
      const vehicles = vehicleResult.status === "fulfilled" ? vehicleResult.value : null;
      const drivers = driverResult.status === "fulfilled" ? driverResult.value : null;
      const shifts = shiftsResult.status === "fulfilled" ? shiftsResult.value : null;
      const agreements = agreementsResult.status === "fulfilled" ? agreementsResult.value : null;
      const costs = costsResult.status === "fulfilled" ? costsResult.value : null;
      setDirectory({
        vehicles: Array.isArray(vehicles?.items) ? vehicles.items : (Array.isArray(vehicles) ? vehicles : []),
        drivers: Array.isArray(drivers?.items) ? drivers.items : (Array.isArray(drivers) ? drivers : []),
        shifts: Array.isArray(shifts?.items) ? shifts.items : (Array.isArray(shifts) ? shifts : []),
        agreements: Array.isArray(agreements?.items) ? agreements.items : (Array.isArray(agreements) ? agreements : []),
        entries: Array.isArray(costs?.items)
          ? costs.items
          : (Array.isArray(costs?.entries) ? costs.entries : []),
      });
      setDirectoryUnavailable(
        vehicleResult.status !== "fulfilled"
          || shiftsResult.status !== "fulfilled"
          || agreementsResult.status !== "fulfilled",
      );
    });
    return () => { active = false; };
  }, [canManageExpenses, token]);

  const snapshot = preview?.snapshot || {};
  const roomProfitability = preview?.roomProfitability || {};
  const evidence = preview?.roomCostPlanningEvidence || null;
  const actual = evidence?.actual || null;
  const selectedShiftId = positiveInteger(roomCostFocus?.shiftId) || positiveInteger(snapshot?.shiftId);
  const selectedAgreementId = positiveInteger(roomCostFocus?.agreementId) || positiveInteger(snapshot?.agreementId);
  const selectedShift = useMemo(
    () => findDirectoryItem(directory.shifts, selectedShiftId),
    [directory.shifts, selectedShiftId],
  );
  const selectedAgreement = useMemo(
    () => findDirectoryItem(directory.agreements, selectedAgreementId),
    [directory.agreements, selectedAgreementId],
  );
  const selectedVehicleId = positiveInteger(roomCostFocus?.vehicleId)
    || positiveInteger(selectedShift?.vehicleId)
    || positiveInteger(selectedAgreement?.vehicleId);
  const selectedVehicle = useMemo(
    () => findDirectoryItem(directory.vehicles, selectedVehicleId),
    [directory.vehicles, selectedVehicleId],
  );
  const selectedVehicleText = selectedVehicle?.plate
    ? selectedVehicle.plate
    : selectedVehicleId
      ? "Araç kaydı doğrulanmadı"
      : "Seçili araç doğrulanmadı";
  const selectedServiceText = selectedAgreement
    ? agreementOptionLabel(selectedAgreement, directory.vehicles)
    : selectedAgreementId
      ? "Servis kaydı doğrulanmadı"
      : "Seçili servis doğrulanmadı";
  const selectedShiftText = selectedShift
    ? shiftOptionLabel(selectedShift)
    : selectedShiftId
      ? "Vardiya kaydı doğrulanmadı"
      : "Seçili vardiya doğrulanmadı";
  const selectedShiftVehicleId = positiveInteger(selectedShift?.vehicleId)
    || positiveInteger(selectedShift?.vehicle?.id);
  const selectedShiftDriverId = positiveInteger(selectedShift?.driverId)
    || positiveInteger(selectedShift?.driver?.id);
  const selectedShiftDriver = useMemo(
    () => findDirectoryItem(directory.drivers, selectedShiftDriverId),
    [directory.drivers, selectedShiftDriverId],
  );
  const selectedShiftDriverText = selectedShift?.driver?.fullName
    || selectedShiftDriver?.fullName
    || (selectedShiftDriverId ? "Sürücü kaydı doğrulanmadı" : "Sürücü bağlantısı doğrulanmadı");
  const selectedShiftPeriod = selectedShift
    ? periodRange(selectedShift.startAt, selectedShift.endAt)
    : selectedAgreement
      ? periodRange(selectedAgreement.startDate, selectedAgreement.endDate)
      : "Dönem belirtilmedi";
  const selectedAgreementVehicleId = positiveInteger(selectedAgreement?.vehicleId)
    || positiveInteger(selectedAgreement?.vehicle?.id);
  const explicitContextFocus = Boolean(
    positiveInteger(roomCostFocus?.vehicleId)
      || positiveInteger(roomCostFocus?.agreementId)
      || positiveInteger(roomCostFocus?.shiftId),
  );
  const contextFilter = useMemo(
    () => (explicitContextFocus
      ? { vehicleId: selectedVehicleId, agreementId: selectedAgreementId, shiftId: selectedShiftId }
      : null),
    [explicitContextFocus, selectedAgreementId, selectedShiftId, selectedVehicleId],
  );
  const contextEvidenceEntries = useMemo(
    () => contextEntriesForOverview(evidence, directory.entries, contextFilter),
    [contextFilter, directory.entries, evidence],
  );
  const recentEntries = useMemo(
    () => recentEntriesForOverview(evidence, directory.entries, contextFilter),
    [contextFilter, directory.entries, evidence],
  );

  useEffect(() => {
    setSelectedRecentEntryId(null);
  }, [contextFilter]);
  const vehicleShiftStatus = !selectedShift
    ? "Vardiya bağlantısı doğrulanmadı"
    : !selectedShiftVehicleId
      ? "Vardiyada araç bağlantısı yok"
      : selectedVehicleId && selectedShiftVehicleId === selectedVehicleId
        ? "Doğrulandı"
        : "Seçim uyuşmuyor; dağıtım bekliyor";
  const vehicleServiceStatus = !selectedAgreement
    ? "Servis bağlantısı doğrulanmadı"
    : !selectedAgreementVehicleId || !selectedVehicleId
      ? "Servis aracı doğrulanmadı"
      : selectedAgreementVehicleId === selectedVehicleId
        ? "Doğrulandı"
        : "Seçim uyuşmuyor; dağıtım bekliyor";
  const serviceShiftStatus = !selectedShift || !selectedAgreement
    ? "Servis–vardiya bağlantısı doğrulanmadı"
    : !positiveInteger(selectedShift?.agreementId)
      ? "Vardiyanın servis bağlantısı yok"
      : Number(selectedShift.agreementId) === Number(selectedAgreementId)
        ? "Doğrulandı"
        : "Seçim uyuşmuyor; dağıtım bekliyor";
  const excludedEntries = useMemo(() => {
    const excluded = Array.isArray(evidence?.excluded) ? evidence.excluded : [];
    return excluded.slice(0, 6).map((item) => ({
      ...item,
      entry: directory.entries.find((candidate) => Number(candidate?.id ?? candidate?.entryId) === Number(item?.entryId)) || null,
    }));
  }, [directory.entries, evidence]);
  const actualGrossMinor = Number.isSafeInteger(Number(actual?.grossAmountMinor))
    ? Number(actual.grossAmountMinor)
    : null;
  const actualCount = Number.isSafeInteger(Number(actual?.entryCount)) ? Number(actual.entryCount) : null;
  const operationPreviewMinor = !explicitContextFocus
    && positiveInteger(snapshot?.shiftId)
    && Number.isSafeInteger(Number(roomProfitability?.actualOperationalCostMinor))
    ? Number(roomProfitability.actualOperationalCostMinor)
    : null;
  const plannedQuoteMinor = Number.isSafeInteger(Number(snapshot?.currentRoomOfferMinor))
    ? Number(snapshot.currentRoomOfferMinor)
    : Number.isSafeInteger(Number(snapshot?.currentCommercialAmountMinor))
      ? Number(snapshot.currentCommercialAmountMinor)
      : null;
  const netProfitProven = String(roomProfitability?.profitabilityStatus || "").toUpperCase() === "CONFIRMED"
    && roomProfitability?.netRollupBlocked !== true
    && Number.isSafeInteger(Number(roomProfitability?.confirmedProfitMinor));
  const firstMissingFocus = actionFocus(missingDataActions);
  const netProfitText = netProfitProven ? formatMoneyMinor(roomProfitability.confirmedProfitMinor) : "Doğrulama bekliyor";
  const actualNote = actualGrossMinor == null
    ? "Onaylı gerçekleşen gider verisi bekleniyor"
    : `${actualCount == null ? "Kayıt sayısı belirtilmedi" : `${actualCount} onaylı gerçek gider`} · brüt kapsam`;
  const operationNote = explicitContextFocus
    ? "Seçili bağlama özel operasyon önizlemesi mevcut değil; genel önizleme gizlendi."
    : operationPreviewMinor == null
      ? "Operasyon kapsamı kanıtlanmadı"
      : "Genel operasyon · kısmi kapsam; seçili vardiyaya dağıtılmış maliyet değildir";
  const netProfitNote = netProfitProven
    ? "Doğrulanmış net maliyet ve teklif kanıtlandı"
    : "KDV veya vardiya dağıtım kanıtı eksik";
  const contextSummary = `${selectedVehicleText} · ${selectedServiceText} · ${selectedShiftText}`;
  const updateContext = (key, value) => onContextChange?.({
    ...roomCostFocus,
    [key]: value,
  });
  const openExpenses = () => (canManageExpenses
    ? onNavigate?.({ ...roomCostFocus })
    : onViewChange?.("service-cost"));
  const openMissingData = (action = missingDataActions[0]) => onNavigate?.({
    ...roomCostFocus,
    ...(action ? { costCategory: action.costCategory, field: action.field } : firstMissingFocus),
  });
  const openVehicleComparison = () => {
    if (typeof onViewChange === "function") {
      onViewChange?.("vehicle-comparison");
      return;
    }
    navigate("/room/financial-operations?view=vehicle-comparison");
  };

  return (
    <section className="pre18-finance-overview-v21" data-finance-overview-v21 data-finance-state={preview ? "ready" : loading ? "loading" : "empty"}>
      <div className="finance-v21-page-head">
        <div>
          <div className="finance-v21-eyebrow">Finansal çalışma alanı</div>
          <h1>Maliyet Kontrol Merkezi</h1>
          <p>Önce kapsamı görün, sonra eksik bağlantıyı tamamlayın.</p>
        </div>
        {canManageExpenses ? (
          <button type="button" className="btn primary finance-v21-add" onClick={openExpenses} disabled={loading}>
            <span aria-hidden="true">＋</span> Gider Ekle
          </button>
        ) : null}
      </div>

      <details
        className="finance-v21-context-shell"
        data-finance-context
        open={contextOpen}
        onToggle={(event) => setContextOpen(event.currentTarget.open)}
      >
        <summary>
          <span>Seçili bağlam</span>
          <strong>{contextSummary}</strong>
          <span aria-hidden="true">＋</span>
        </summary>
        <div className="finance-v21-scope-grid" data-finance-scope-summary>
          <div className="finance-v21-scope-item">
            <span>Ana kapsam</span>
            <strong>Firma geneli</strong>
            <small>Tüm kayıt dönemleri</small>
          </div>
          <div className="finance-v21-scope-item">
            {canManageExpenses ? (
              <ContextSelect
                label="Seçili araç"
                value={selectedVehicleId}
                options={directory.vehicles}
                onChange={(value) => updateContext("vehicleId", value)}
                dataAttribute="vehicle"
                emptyLabel={directoryUnavailable ? "Araç listesi okunamadı" : "Araç seçin"}
                optionLabel={optionVehicleLabel}
              />
            ) : (
              <><span>Seçili araç</span><strong>Salt okunur kapsam</strong></>
            )}
            <small>Araç giderleri</small>
          </div>
          <div className="finance-v21-scope-item">
            {canManageExpenses ? (
              <ContextSelect
                label="Seçili servis"
                value={selectedAgreementId}
                options={directory.agreements}
                onChange={(value) => updateContext("agreementId", value)}
                dataAttribute="service"
                emptyLabel={directoryUnavailable ? "Servis listesi okunamadı" : "Servis seçin"}
                optionLabel={(option) => agreementOptionLabel(option, directory.vehicles)}
              />
            ) : (
              <><span>Seçili servis</span><strong>Salt okunur kapsam</strong></>
            )}
            <small>Servis sözleşmesi kaynağı</small>
          </div>
          <div className="finance-v21-scope-item">
            {canManageExpenses ? (
              <ContextSelect
                label="Seçili vardiya"
                value={selectedShiftId}
                options={directory.shifts}
                onChange={(value) => updateContext("shiftId", value)}
                dataAttribute="shift"
                emptyLabel={directoryUnavailable ? "Vardiya listesi okunamadı" : "Vardiya seçin"}
                optionLabel={shiftOptionLabel}
              />
            ) : (
              <><span>Seçili vardiya</span><strong>Salt okunur kapsam</strong></>
            )}
            <small>Vardiya kanıt kaynağı</small>
          </div>
          <div className={`finance-v21-scope-item ${vehicleShiftStatus === "Doğrulandı" ? "" : "finance-v21-scope-item--warning"}`}>
            <span>Araç–vardiya ilişkisi</span>
            <strong>{vehicleShiftStatus}</strong>
            <small>{vehicleShiftStatus === "Doğrulandı" ? "Seçili araç ve vardiya aynı kaynakta" : "Vardiya numarası uydurulmadı"}</small>
          </div>
        </div>
      </details>

      <div className="finance-v21-actual-layout">
        <div className="finance-v21-actual-copy">
          <div className="finance-v21-section-label">Ne harcadım?</div>
          <p>
            {actualGrossMinor == null
              ? "Firma geneli gerçekleşen gider verisi bekleniyor. Seçili operasyon kapsamı ayrıca doğrulanır."
              : `${formatMoneyMinor(actualGrossMinor)} firma geneli gerçekleşen giderdir. Seçili operasyon önizlemesi bununla aynı kapsam değildir.`}
          </p>
          <button type="button" className="btn sm" onClick={openExpenses}>Kapsamı gör</button>
        </div>
        <div className="finance-v21-actual-card" data-finance-gross-total>
          <span>Gerçekleşen brüt gider</span>
          <strong>{formatMoneyMinor(actualGrossMinor)}</strong>
          <small>Firma geneli · tüm kayıt dönemleri · {actualNote}</small>
        </div>
      </div>

      <div className="finance-v21-summary-strip">
        <div data-finance-operation-preview>
          <span>Operasyon önizlemesi</span>
          <strong>{formatMoneyMinor(operationPreviewMinor)}</strong>
          <small>{operationNote}</small>
        </div>
        <div data-finance-planned-quote>
          <span>Planlanan teklif</span>
          <strong>{formatMoneyMinor(plannedQuoteMinor)}</strong>
          <small>Gerçekleşmiş gelir değildir</small>
        </div>
        <div>
          <span>Net kârlılık</span>
          <strong className={netProfitProven ? "finance-v21-positive" : "finance-v21-warning"}>{netProfitText}</strong>
          <small>{netProfitNote}</small>
        </div>
      </div>

      {err ? <div className="finance-v21-alert" role="alert">{err}</div> : null}

      <div className="finance-v21-lower-grid">
        <section className="finance-v21-card" data-finance-recent-expenses>
          <div className="finance-v21-card-head">
            <div>
              <h2>Son giderler</h2>
              <p>Son giderler — toplam giderin tamamı değildir. Geçerlilik, KDV ve vardiya durumu ayrı gösterilir.</p>
            </div>
            <button type="button" className="btn sm" onClick={openExpenses}>Tümünü gör</button>
          </div>
          {recentEntries.length ? (
            <div className="finance-v21-expense-list">
              {recentEntries.map((entry) => {
                const driver = driverLabel(entry, directory.drivers);
                const entryKey = overviewEntryKey(entry);
                const recordKind = String(entry?.recordKind || "ACTUAL").toUpperCase();
                const recordKindLabel = {
                  ACTUAL: "Gerçekleşen",
                  BUDGET: "Bütçe",
                  FORECAST: "Tahmin",
                  ACCRUAL: "Karşılık",
                }[recordKind] || "Kayıt";
                const detailOpen = selectedRecentEntryId === entryKey;
                return (
                  <div
                    className={`finance-v21-expense-row ${detailOpen ? "finance-v21-expense-row--detail-open" : ""}`}
                    data-finance-overview-expense-row={entryKey}
                    aria-expanded={detailOpen ? "true" : "false"}
                    key={entryKey}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      if (event.target.closest(".finance-v21-expense-inline-detail")) return;
                      setSelectedRecentEntryId((current) => (current === entryKey ? null : entryKey));
                    }}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedRecentEntryId((current) => (current === entryKey ? null : entryKey));
                      }
                    }}
                  >
                    <span className="finance-v21-expense-icon" aria-hidden="true">{ICONS[String(entry?.categoryKey || "").toUpperCase()] || ICONS.DEFAULT}</span>
                    <div className="finance-v21-expense-main">
                      <strong>{readableCategory(entry)}</strong>
                      <span>{driver || vehicleLabel(entry, directory.vehicles)} · {formatEntryPeriod(entry)}</span>
                      <div className="finance-v21-status-row">
                        <StatusPill tone="positive">{sourceStatus(entry)}</StatusPill>
                        <StatusPill tone={String(entry?.vatClassification || "UNKNOWN").toUpperCase() === "UNKNOWN" ? "warning" : "positive"}>{vatStatus(entry)}</StatusPill>
                        <StatusPill tone={positiveInteger(entry?.shiftId) ? "positive" : "warning"}>{shiftStatus(entry)}</StatusPill>
                      </div>
                    </div>
                    <strong className="finance-v21-expense-amount">{formatMoneyMinor(entry?.amountMinor, entry?.currencyCode)}</strong>
                    {detailOpen ? (
                      <div className="finance-v21-expense-inline-detail" data-finance-overview-expense-detail aria-label="Gider ayrıntısı">
                        <div className="finance-v21-detail-grid">
                          <div><span>Bağlı kayıt</span><strong>{driver || vehicleLabel(entry, directory.vehicles)}</strong></div>
                          <div><span>Tutar</span><strong>{formatMoneyMinor(entry?.amountMinor, entry?.currencyCode)}</strong></div>
                          <div><span>Dönem</span><strong>{formatEntryPeriod(entry)}</strong></div>
                          <div><span>Kayıt türü</span><strong>{recordKindLabel}</strong></div>
                          <div><span>KDV durumu</span><strong>{vatStatus(entry)}</strong></div>
                          <div><span>Vardiya durumu</span><strong>{shiftStatus(entry)}</strong></div>
                        </div>
                        <div className="finance-v21-evidence-note">
                          <strong>Dağıtım kanıtı</strong>
                          <span>{positiveInteger(entry?.shiftId)
                            ? "Bu gider için vardiya bağlantısı kaynakta bulunuyor; dağıtım payı kanıtı ilgili maliyet görünümünde okunur."
                            : "Vardiya bağlantısı doğrulanmadı; bu gider tek bir vardiyaya otomatik olarak yüklenmez."}</span>
                          <span>{entry?.description || "Bu kayıt için ek açıklama bulunmuyor."}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={explicitContextFocus ? "Seçili bağlama bağlı onaylı gider bulunmuyor" : "Onaylı gerçek gider bulunmuyor"}
              description={explicitContextFocus
                ? "Firma geneli toplam ayrı gösterilir; bu araç, servis veya vardiya için doğrudan gider kanıtı yok."
                : "Toplam brüt gider yalnızca doğrulanmış gerçekleşen kayıt bulunduğunda gösterilir."}
            />
          )}
        </section>

        <section className="finance-v21-card" data-finance-vehicle-evidence>
          <div className="finance-v21-card-head">
            <div>
              <h2>Araç maliyeti</h2>
              <p>{actualGrossMinor == null ? "Doğrulanmış araç maliyeti kaydı bekleniyor." : "Kayıt var; dağıtılmış servis toplamı henüz kanıtlanmadı."}</p>
            </div>
            <button
              type="button"
              className="btn sm"
              data-finance-missing-connection
              aria-expanded={evidenceOpen ? "true" : "false"}
              onClick={() => setEvidenceOpen((open) => !open)}
            >
              {evidenceOpen ? "Kanıtı kapat" : "Kanıtı incele"}
            </button>
          </div>
          <div className="finance-v21-vehicle-summary">
            <strong>{selectedVehicleText} · Tüm dönemler</strong>
            <b>Toplam doğrulanmıyor</b>
            <span>{actualGrossMinor == null ? "Araç gideri kaynağı bekleniyor" : "Bakım, yakıt ve yıkama kayıtları mevcut olabilir; vardiya dağıtımı ayrı kanıtlanır."}</span>
          </div>
          <div className="finance-v21-evidence-list">
            <div><span>Servis maliyeti</span><b>{operationPreviewMinor == null ? "Dağıtım bekliyor" : "Kısmi kapsam"}</b></div>
                    <div><span>Vardiya bağlantısı</span><b>{vehicleShiftStatus}</b></div>
                  <div><span>Servis–vardiya bağlantısı</span><b>{serviceShiftStatus}</b></div>
                  <div><span>Araç–servis bağlantısı</span><b>{vehicleServiceStatus}</b></div>
            <div><span>Araç karşılaştırması</span><b>Kanıt eksik</b></div>
          </div>
          <div className="finance-v21-card-actions">
            {missingDataActions.length ? <button type="button" className="btn sm" onClick={() => openMissingData()}>Bilgileri tamamla</button> : null}
            <button type="button" className="btn sm" onClick={openVehicleComparison}>Araçları karşılaştır</button>
          </div>
          {evidenceOpen ? (
            <div className="finance-v21-evidence-drawer" data-finance-evidence-drawer role="region" aria-label="Maliyet bağlantı kanıtı">
              <div className="finance-v21-card-head">
                <div>
                  <h3>Bağlantı kanıtı</h3>
                  <p>Gerçek kaynakta bulunmayan araç, sürücü veya vardiya ilişkisi tamamlanmış kabul edilmez.</p>
                </div>
                <button type="button" className="btn sm" onClick={() => setEvidenceOpen(false)}>Kapat</button>
              </div>
              <div className="finance-v21-evidence-grid">
                <div><span>İncelenen araç</span><b>{selectedVehicleText}</b></div>
                <div><span>İlgili servis</span><b>{selectedServiceText}</b></div>
                <div><span>İlgili vardiya</span><b>{selectedShiftText}</b></div>
                <div><span>Dönem</span><b>{selectedShiftPeriod}</b></div>
                <div><span>Araç–vardiya bağlantısı</span><b>{vehicleShiftStatus}</b></div>
                  <div><span>Servis–vardiya bağlantısı</span><b>{serviceShiftStatus}</b></div>
                  <div><span>Araç–servis bağlantısı</span><b>{vehicleServiceStatus}</b></div>
                <div><span>Sürücü bağlantısı</span><b>{selectedShiftDriverText}</b></div>
              </div>
              <div className="finance-v21-evidence-note">
                <strong>Bu bilgi neden gerekli?</strong>
                <span>Gideri tek bir vardiyaya yazmadan önce araç, sürücü ve dönem bağının aynı yetkili kayıtta doğrulanması gerekir.</span>
              </div>
              <div className="finance-v21-evidence-note">
                <strong>Dağıtım bekleyen gider</strong>
                {explicitContextFocus ? (
                  <span>
                    {contextEvidenceEntries.length
                      ? `${contextEvidenceEntries.length} onaylı gider seçili bağlamla eşleşiyor; vardiya dağıtımı ayrıca kanıtlanır.`
                      : "Seçili araç, servis ve vardiya bağlamına bağlı onaylı gider kanıtı bulunamadı; dağıtım sonucu gösterilmedi."}
                  </span>
                ) : excludedEntries.length ? (
                  <div className="finance-v21-evidence-list">
                    {excludedEntries.map((item, index) => (
                      <div key={`${item.entryId || "missing"}-${index}`}>
                        <span>{item.entry ? `${readableCategory(item.entry)} · ${formatMoneyMinor(item.entry.amountMinor, item.entry.currencyCode)}` : "Gider kaydı"}</span>
                        <b>{allocationReasonLabel(item.reason)}</b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span>Bu kapsamda dağıtılmamış gider satırı görünmüyor; vardiya bağlantısı yine de doğrulanmadı.</span>
                )}
                {evidence?.missing?.length ? <span>Eksik alan: {[...new Set(evidence.missing.map(missingEvidenceLabel))].join(", ")}.</span> : null}
              </div>
              {missingDataActions.length ? (
                <div className="finance-v21-evidence-note">
                  <strong>Tamamlanabilir bilgi</strong>
                  <div className="finance-v21-card-actions">
                    {missingDataActions.map((action) => (
                      <button key={action.actionLabel} type="button" className="btn sm" onClick={() => openMissingData(action)}>{action.actionLabel}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="finance-v21-evidence-note">
                  <strong>Sonraki adım</strong>
                  <span>Bu eksiklik için kullanıcı tarafından açılabilen doğrulanmış bir form bulunamadı; sahte kayıt veya vardiya eşleşmesi oluşturulmadı.</span>
                </div>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
