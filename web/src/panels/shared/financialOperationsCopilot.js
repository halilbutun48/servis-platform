import { financeUserFacingText } from "./financeUserFacingLabels.js";

function positiveId(value) {
  const id = Number(value || 0);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function finiteOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function minorMoney(value, currencyCode = "TRY") {
  const number = finiteOrNull(value);
  if (number === null) return "Doğrulanmadı";
  const formatted = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(number / 100);
  return String(currencyCode).toUpperCase() === "TRY" ? `${formatted} TL` : `${formatted} ${currencyCode}`;
}

function uniquePositiveIds(rows = []) {
  return [...new Set((Array.isArray(rows) ? rows : [])
    .map((row) => positiveId(row?.entryId || row?.id))
    .filter(Boolean))];
}

// A finance answer is only meaningful for the same operational scope that
// produced it. The drawer uses this stable, non-sensitive key to discard a
// stale transcript when the user changes vehicle, period, service or tab.
export function financialCopilotContextKey(selection) {
  const facts = selection?.facts;
  if (!facts || facts.screenType !== "ROOM_FINANCIAL_OPERATIONS") return "";
  return [
    facts.financeView,
    facts.selectedVehicleId,
    facts.ledgerVehicleId,
    facts.selectedOfferId,
    facts.selectedAgreementId,
    facts.selectedInvoiceId,
    facts.selectedHakedisId,
    facts.selectedShiftId,
    facts.periodStart,
    facts.periodEnd,
    facts.ledgerPeriodStart,
    facts.ledgerPeriodEnd,
  ].map((value) => String(value ?? "")).join("|");
}

function periodFromRows(rows = []) {
  const first = (Array.isArray(rows) ? rows : []).find((row) => row?.periodStart || row?.periodEnd);
  return {
    periodStart: first?.periodStart || null,
    periodEnd: first?.periodEnd || null,
  };
}

function readableLedgerPeriod(periodStart, periodEnd) {
  const format = (value) => {
    const text = String(value || "").trim();
    if (!text) return null;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };
  const start = format(periodStart);
  const end = format(periodEnd);
  if (!start && !end) return null;
  return `${start || "Başlangıç yok"} – ${end || "Bitiş yok"}`;
}

export function buildCompanyFinancialCopilotSelection({
  financeView = "company-budget",
  preview = null,
} = {}) {
  const budgetPlan = preview?.budgetPlan && typeof preview.budgetPlan === "object" ? preview.budgetPlan : {};
  const plan = budgetPlan.current || budgetPlan.draft || budgetPlan.active || null;
  const commitment = preview?.commitmentSummary || preview?.companyBudget?.commitmentSummary || {};
  const agreementIds = [...new Set(
    (Array.isArray(plan?.agreementIds) ? plan.agreementIds : [])
      .map((id) => positiveId(id))
      .filter(Boolean),
  )];
  const budgetPlanId = positiveId(plan?.id);
  const budgetAmountMinor = finiteOrNull(plan?.budgetAmountMinor);
  const committedAmountMinor = finiteOrNull(commitment?.committedAmountMinor);
  const remainingBudgetMinor = finiteOrNull(commitment?.remainingBudgetMinor);
  const evidenceTotals = commitment?.evidenceTotals || {};
  const currencyCode = String(plan?.currencyCode || commitment?.currencyCode || "TRY").toUpperCase();
  const periodStart = plan?.periodStart || null;
  const periodEnd = plan?.periodEnd || null;
  const periodLabel = plan?.periodLabel || (periodStart || periodEnd ? `${periodStart || "-"} – ${periodEnd || "-"}` : "Dönem doğrulanmadı");
  const budgetStatus = String(plan?.status || "UNKNOWN").toUpperCase();
  const budgetLabel = budgetPlanId ? `Bütçe #${budgetPlanId}` : "Bütçe planı seçilmedi";
  const selectedAgreementLabel = agreementIds.length
    ? agreementIds.map((id) => `#${id}`).join(", ")
    : "Bağlı sözleşme yok";
  const commitmentLabel = committedAmountMinor === null
    ? "Taahhüt doğrulanmadı"
    : `Taahhüt ${minorMoney(committedAmountMinor, currencyCode)}`;
  const remainingLabel = remainingBudgetMinor === null
    ? "Kalan bütçe hesaplanamadı"
    : `Kalan bütçe ${minorMoney(remainingBudgetMinor, currencyCode)}`;
  const evidenceLabel = `Hakediş ${minorMoney(evidenceTotals.hakedisAmountMinor, currencyCode)}; Fatura ${minorMoney(evidenceTotals.invoiceAmountMinor, currencyCode)}; Ödenen ${minorMoney(evidenceTotals.paidAmountMinor, currencyCode)}.`;
  const contextSummary = `${budgetLabel} · ${periodLabel} · Sözleşmeler: ${selectedAgreementLabel}`;
  const facts = {
    screenType: "COMPANY_FINANCIAL_OPERATIONS",
    financeView: String(financeView || "company-budget"),
    activeTab: String(financeView || "company-budget"),
    selectedEntityType: "budgetPlan",
    selectedEntityId: budgetPlanId,
    selectedBudgetPlanId: budgetPlanId,
    selectedBudgetPlanVersion: positiveId(plan?.version),
    selectedAgreementId: agreementIds[0] || null,
    selectedAgreementIds: agreementIds,
    budgetPlanId,
    budgetPlanVersion: positiveId(plan?.version),
    budgetAmountMinor,
    committedAmountMinor,
    remainingBudgetMinor,
    budgetCurrencyCode: currencyCode,
    budgetStatus,
    periodStart,
    periodEnd,
    commitmentCount: finiteOrNull(commitment?.commitmentCount),
    contextSummary,
    copilotSummary: `${contextSummary}. ${commitmentLabel}; ${remainingLabel}. ${evidenceLabel} Bu yalnız COMPANY bütçe ve finans kanıtı özetidir; ROOM iç maliyetleri gösterilmez.`,
    copilotSignals: remainingBudgetMinor !== null && remainingBudgetMinor < 0
      ? [{ key: "BÜTÇE_AŞIM_RİSKİ", status: "RISK" }]
      : [],
  };
  return {
    scopeKey: "/company/financial-operations",
    entityType: facts.selectedEntityType,
    entityId: facts.selectedEntityId,
    label: contextSummary,
    summary: facts.copilotSummary,
    fields: [
      { label: "Bütçe", value: budgetPlanId ? `#${budgetPlanId}` : "Seçilmedi", help: "Seçili COMPANY bütçe planı." },
      { label: "Dönem", value: periodLabel, help: "Seçili bütçe dönemi." },
      { label: "Sözleşmeler", value: selectedAgreementLabel, help: "Bu bütçeye yetkili biçimde bağlı sözleşmeler." },
      { label: "Ayrılan bütçe", value: minorMoney(budgetAmountMinor, currencyCode), help: "COMPANY bütçe planındaki tutar." },
      { label: "Sözleşme taahhüdü", value: minorMoney(committedAmountMinor, currencyCode), help: "Onaylı sözleşme taahhüdü; gerçekleşmiş harcama değildir." },
      { label: "Kalan bütçe", value: minorMoney(remainingBudgetMinor, currencyCode), help: "Taahhüt etkisi sonrası görünen bütçe farkı." },
      { label: "Hakediş / fatura / ödeme", value: evidenceLabel, help: "Ayrı finans kanıtıdır; bütçe taahhüdüne ikinci kez eklenmez." },
    ],
    badges: [
      { label: "Görünüm", value: "Bütçe", help: "COMPANY bütçe ve teklif bağlamı." },
      { label: "Durum", value: budgetStatus === "DRAFT" ? "Taslak bütçe" : budgetStatus, help: "Bütçe planının yaşam döngüsü durumu." },
      ...(remainingBudgetMinor !== null && remainingBudgetMinor < 0
        ? [{ label: "Risk", value: "Taahhüt bütçeyi aşıyor", help: "Bu fark gerçekleşmiş zarar veya ödeme değildir." }]
        : []),
    ],
    facts,
  };
}

// COMPANY's financial overview is budget-scoped by default.  When the user
// explicitly opens one visible, tenant-authorized income line, keep that
// choice as an agreement/invoice context so Sefer Abi can answer follow-up
// questions about the selected record without guessing from the budget totals.
export function buildCompanyFinancialInvoiceCopilotSelection({
  baseSelection = null,
  invoiceLink = null,
} = {}) {
  if (!baseSelection || typeof baseSelection !== "object") return baseSelection;
  const agreementId = positiveId(invoiceLink?.agreementId);
  const invoiceId = positiveId(invoiceLink?.invoiceId);
  if (!agreementId || !invoiceId) return baseSelection;
  const hakedisId = positiveId(invoiceLink?.hakedisId);
  const customerLabel = String(invoiceLink?.customerLabel || "Yetkili müşteri").trim();
  const agreementLabel = String(invoiceLink?.agreementLabel || `Sözleşme #${agreementId}`).trim();
  const sourceLabel = String(invoiceLink?.sourceLabel || "").trim();
  const contextLabel = [customerLabel, agreementLabel, `Fatura #${invoiceId}`, hakedisId ? `Hakediş #${hakedisId}` : null]
    .filter(Boolean)
    .join(" · ");
  const facts = {
    ...(baseSelection.facts && typeof baseSelection.facts === "object" ? baseSelection.facts : {}),
    selectedEntityType: "agreement",
    selectedEntityId: agreementId,
    selectedAgreementId: agreementId,
    selectedInvoiceId: invoiceId,
    selectedHakedisId: hakedisId,
    selectedFinanceCustomerLabel: customerLabel,
    selectedFinanceSourceLabel: sourceLabel || null,
    selectedBudgetPlanId: null,
    budgetPlanId: null,
    contextSummary: contextLabel,
    copilotSummary: `${contextLabel}. Bu seçili COMPANY finans kaydı üzerinden fatura ve kalan alacak açıklanabilir.${sourceLabel ? ` ${sourceLabel}` : ""}`,
  };
  return {
    ...baseSelection,
    entityType: "agreement",
    entityId: agreementId,
    label: contextLabel,
    summary: facts.copilotSummary,
    fields: [
      { label: "Müşteri", value: customerLabel, help: "Seçili COMPANY finans kaydının yetkili müşterisi." },
      { label: "Sözleşme", value: agreementLabel, help: "Seçili fatura ile bağlı sözleşme." },
      { label: "Hakediş", value: hakedisId ? `#${hakedisId}` : "Bağlı kayıt yok", help: "Faturanın bağlı hakedişi." },
      { label: "Fatura", value: `#${invoiceId}`, help: "Kullanıcının açıkça seçtiği fatura." },
    ],
    badges: [
      ...(Array.isArray(baseSelection.badges) ? baseSelection.badges : []),
      { label: "Kayıt", value: "Seçili fatura bağlamı", help: sourceLabel || "Yetkili COMPANY finans kaydı." },
    ],
    facts,
  };
}

export function buildFinancialCopilotSelection({
  financeView = "overview",
  roomCostFocus = {},
  preview = null,
  sourceRows = [],
  selectedVehicleLabel = "",
} = {}) {
  const normalizedView = String(financeView || "overview").toLowerCase();
  const normalizedViewLabel = {
    overview: "Genel durum",
    expenses: "Giderlerim",
    "service-cost": "Servis maliyeti",
    vehicle: "Araç karşılaştırma",
    profitability: "Teklif ve kârlılık",
  }[normalizedView] || financeUserFacingText(normalizedView, "Finansal görünüm");
  // Overview and Giderlerim are independent company-ledger surfaces.  The
  // shared financial preview may still contain the last active service/shift
  // snapshot, but that snapshot is not a filter for these views.
  const independentLedgerView = ["overview", "expenses"].includes(normalizedView);
  const snapshot = !independentLedgerView && preview?.snapshot && typeof preview.snapshot === "object"
    ? preview.snapshot
    : {};
  const scope = !independentLedgerView && preview?.serviceCostScope && typeof preview.serviceCostScope === "object"
    ? preview.serviceCostScope
    : {};
  const rows = !independentLedgerView && Array.isArray(preview?.serviceCostSourceEntries) && preview.serviceCostSourceEntries.length
    ? preview.serviceCostSourceEntries
    : (!independentLedgerView && Array.isArray(sourceRows) ? sourceRows : []);
  const contextFocus = independentLedgerView ? {} : roomCostFocus;
  // Genel Durum and Giderlerim remain independent ledger views: these values
  // must not silently become an automatic ledger filter.  They are still
  // live operational context, however, so Sefer Abi can answer an explicit
  // question about the selected vehicle and period without falling back to
  // an unrelated service snapshot.
  const ledgerVehicleId = independentLedgerView ? positiveId(roomCostFocus?.filterVehicleId) : null;
  const ledgerPeriodStart = independentLedgerView ? roomCostFocus?.filterPeriodStart || null : null;
  const ledgerPeriodEnd = independentLedgerView ? roomCostFocus?.filterPeriodEnd || null : null;
  const ledgerVehicleLabel = independentLedgerView && ledgerVehicleId
    ? String(selectedVehicleLabel || `Araç #${ledgerVehicleId}`).trim()
    : null;
  const ledgerPeriodLabel = independentLedgerView
    ? readableLedgerPeriod(ledgerPeriodStart, ledgerPeriodEnd)
    : null;
  const agreementId = positiveId(contextFocus?.agreementId || snapshot.agreementId || scope.selectedAgreementId);
  const shiftId = positiveId(contextFocus?.shiftId || snapshot.shiftId || scope.selectedShiftId);
  const vehicleId = positiveId(contextFocus?.vehicleId || snapshot.vehicleId);
  const selectedOfferId = independentLedgerView ? null : positiveId(contextFocus?.focusOfferId);
  const allocationStatus = String(scope.allocationStatus || "").toUpperCase();
  const actualCostMinor = finiteOrNull(
    allocationStatus === "READY"
      ? scope.provenDistributedAmountMinor ?? scope.grossAmountMinor
      : null,
  );
  const selectedOfferMinor = finiteOrNull(
    preview?.commercialOffer?.amountMinor
      ?? snapshot.currentRoomOfferMinor
      ?? snapshot.currentCommercialAmountMinor,
  );
  const savedQuoteDraft = preview?.quoteFloorDraft?.current
    || preview?.quoteFloorDraft?.draft
    || preview?.quoteFloorDraft?.applied
    || (preview?.quoteFloorDraft?.id ? preview.quoteFloorDraft : null)
    || null;
  const savedPlanningInputs = savedQuoteDraft?.inputSnapshot?.computed?.planningInputs
    || savedQuoteDraft?.inputSnapshot?.payload?.planningInputs
    || savedQuoteDraft?.inputSnapshot?.planningInputs
    || {};
  const savedComputedBaselineMinor = finiteOrNull(savedQuoteDraft?.inputSnapshot?.computed?.baselineOperationalCostMinor);
  const savedTargetContributionBps = finiteOrNull(savedQuoteDraft?.targetContributionBps);
  const savedRiskReserveBps = finiteOrNull(savedQuoteDraft?.riskReserveBps);
  const savedQuoteFloorMinor = finiteOrNull(savedQuoteDraft?.quoteFloorMinor);
  const canonicalPreviewBaselineMinor = finiteOrNull(
    preview?.quoteFloor?.baselineOperationalCostMinor
      ?? preview?.operationalCostModel?.baselineOperationalCostMinor,
  );
  const draftHasExplicitManualBaseline = savedQuoteDraft?.manualBaselineOperationalCostMinor !== null
    && savedQuoteDraft?.manualBaselineOperationalCostMinor !== undefined;
  const draftHasStaleComputedBaseline = String(savedQuoteDraft?.baselineSource || "").trim().toLowerCase() === "incomplete"
    && !draftHasExplicitManualBaseline
    && canonicalPreviewBaselineMinor !== null
    && String(preview?.quoteFloor?.baselineSource || "").trim().toUpperCase() !== "MANUAL_BASELINE_OVERRIDE";
  const effectiveSavedComputedBaselineMinor = draftHasStaleComputedBaseline ? null : savedComputedBaselineMinor;
  const routeDistanceKm = finiteOrNull(snapshot.routeDistanceKm ?? snapshot.plannedDistanceKm);
  const routeDurationMin = finiteOrNull(snapshot.routeDurationMin ?? snapshot.routeDurationMinutes);
  const passengerCount = finiteOrNull(snapshot.passengerCount);
  const vehicleCapacity = finiteOrNull(snapshot.vehicleCapacity);
  const rowPeriod = periodFromRows(rows);
  const period = {
    periodStart: contextFocus?.periodStart || rowPeriod.periodStart,
    periodEnd: contextFocus?.periodEnd || rowPeriod.periodEnd,
  };
  const missingData = [];
  if (!independentLedgerView) {
    if (routeDistanceKm === null || routeDistanceKm <= 0) missingData.push("rota mesafesi");
    if (passengerCount === null || passengerCount < 0) missingData.push("yolcu/katılımcı sayısı");
    if (actualCostMinor === null) missingData.push("kanıtlanmış gerçekleşen maliyet");
    if (!vehicleId && !snapshot.vehicleType) missingData.push("araç bağlamı");
  }
  const dataStatus = independentLedgerView
    ? "LEDGER_SCOPE"
    : actualCostMinor !== null && routeDistanceKm !== null && routeDistanceKm > 0
    ? "READY"
    : "MISSING";
  const companyName = independentLedgerView
    ? (ledgerVehicleLabel ? `Seçili araç · ${ledgerVehicleLabel}` : "Firma geneli")
    : String(snapshot.companyName || snapshot.companyLabel || "Seçili hizmet").trim();
  const selectedOfferLabel = independentLedgerView
    ? null
    : selectedOfferId
      ? `Teklif #${selectedOfferId}`
      : "Teklif seçilmedi";
  const selectedVehicleContextLabel = independentLedgerView
    ? null
    : vehicleId
      ? String(selectedVehicleLabel || snapshot.vehicleLabel || snapshot.vehiclePlate || `Araç #${vehicleId}`).trim()
      : "Araç seçilmedi";
  const labelParts = independentLedgerView
    ? [
      companyName,
      ledgerPeriodLabel ? `Dönem · ${ledgerPeriodLabel}` : "Dönem belirtilmedi",
      "Gider defteri kapsamı",
    ]
    : [
      companyName,
      selectedOfferLabel,
      agreementId ? `Sözleşme #${agreementId}` : "Sözleşme seçilmedi",
      shiftId ? `Vardiya #${shiftId}` : "Vardiya seçilmedi",
      selectedVehicleContextLabel,
    ];
  const fields = [
    { label: independentLedgerView ? "Kapsam" : "Müşteri", value: companyName, help: independentLedgerView ? "Seçili araç varsa araç gider defteri kapsamı." : "Finans bağlamındaki müşteri." },
    ...(independentLedgerView ? [{ label: "Dönem", value: ledgerPeriodLabel || "Belirtilmedi", help: "Gider defteri filtresindeki dönem." }] : []),
    ...(independentLedgerView ? [{ label: "Araç", value: ledgerVehicleLabel || "Tüm araçlar", help: "Seçili araç giderleri; firma geliri bu filtreye otomatik dağıtılmaz." }] : []),
    { label: "Sözleşme", value: independentLedgerView ? "Uygulanmıyor" : agreementId ? `#${agreementId}` : "Belirtilmedi", help: independentLedgerView ? "Firma gider defteri hizmet sözleşmesine göre otomatik daraltılmaz." : "Seçili hizmet sözleşmesi." },
    { label: "Vardiya", value: independentLedgerView ? "Uygulanmıyor" : shiftId ? `#${shiftId}` : "Belirtilmedi", help: independentLedgerView ? "Firma gider defteri vardiyaya göre otomatik daraltılmaz." : "Seçili hizmet vardiyası." },
    { label: "Gerçekleşen maliyet", value: independentLedgerView ? "Firma gider özeti" : actualCostMinor === null ? "Kanıtlanmadı" : `${actualCostMinor} kuruş`, help: independentLedgerView ? "ROOM gider defterinin doğrulanmış özeti." : "Doğrulanmış servis maliyeti kapsamı." },
    { label: "Rota", value: independentLedgerView ? "Bu görünümde uygulanmıyor" : routeDistanceKm === null ? "Belirtilmedi" : `${routeDistanceKm} km`, help: independentLedgerView ? "Rota bilgisi bağımsız gider defteri kapsamına ait değildir." : "Kaydedilmiş rota mesafesi." },
    { label: "Yolcu", value: independentLedgerView ? "Bu görünümde uygulanmıyor" : passengerCount === null ? "Belirtilmedi" : String(passengerCount), help: independentLedgerView ? "Yolcu bilgisi bağımsız gider defteri kapsamına ait değildir." : "Doğrulanmış yolcu/katılımcı sayısı." },
  ];
  const facts = {
    screenType: "ROOM_FINANCIAL_OPERATIONS",
    financeView: String(financeView || "overview"),
    activeTab: String(financeView || "overview"),
    selectedEntityType: independentLedgerView ? "screen" : shiftId ? "shift" : agreementId ? "agreement" : "screen",
    selectedEntityId: independentLedgerView ? null : shiftId || agreementId || null,
    selectedAgreementId: agreementId,
    selectedShiftId: shiftId,
    selectedOfferId,
    selectedOfferLabel,
    selectedVehicleId: vehicleId,
    ledgerVehicleId,
    ledgerVehicleLabel,
    ledgerPeriodStart,
    ledgerPeriodEnd,
    ledgerPeriodLabel,
    selectedVehicleLabel: String(selectedVehicleLabel || snapshot.vehicleLabel || snapshot.vehiclePlate || "").trim() || null,
    manualBaselineOperationalCostMinor: finiteOrNull(contextFocus?.manualBaselineOperationalCostMinor)
      ?? finiteOrNull(savedQuoteDraft?.manualBaselineOperationalCostMinor)
      ?? effectiveSavedComputedBaselineMinor,
    targetContributionBps: finiteOrNull(contextFocus?.targetContributionBps) ?? savedTargetContributionBps,
    riskReserveBps: finiteOrNull(contextFocus?.riskReserveBps) ?? savedRiskReserveBps,
    quoteScenarioAmountMinor: finiteOrNull(contextFocus?.quoteScenarioAmountMinor)
      ?? finiteOrNull(savedPlanningInputs?.quoteScenarioAmountMinor),
    quoteFloorMinor: savedQuoteFloorMinor,
    planningInputs: savedPlanningInputs,
    companyName,
    routeDistanceKm,
    routeDurationMin,
    passengerCount,
    vehicleCapacity,
    vehicleType: snapshot.vehicleType || null,
    actualCostMinor,
    selectedOfferMinor,
    plannedCostMinor: independentLedgerView ? null : canonicalPreviewBaselineMinor,
    allocationStatus: allocationStatus || null,
    dataStatus,
    missingData,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    sourceEntryIds: uniquePositiveIds(rows),
    sourceRefs: [...new Set(rows.map((row) => String(row?.sourceRef || "").trim()).filter(Boolean))],
    sourceEntryCount: Number(scope.sourceEntryCount || rows.length || 0),
    pendingAmountMinor: finiteOrNull(scope.pendingAmountMinor),
    contextSummary: labelParts.join(" · "),
    copilotSummary: `${labelParts.join(" · ")}. Görünüm: ${normalizedViewLabel}.`,
    copilotSignals: missingData.map((item) => ({ key: item, status: "MISSING" })),
  };

  return {
    scopeKey: "/room/financial-operations",
    entityType: facts.selectedEntityType,
    entityId: facts.selectedEntityId,
    label: labelParts.join(" · "),
    summary: facts.copilotSummary,
    fields,
    badges: [
      { label: "Görünüm", value: normalizedViewLabel, help: "Finansal Operasyonlar alt görünümü." },
      ...(dataStatus === "READY" || dataStatus === "LEDGER_SCOPE"
        ? [{ label: "Veri", value: "Doğrulanmış kanıt mevcut", help: "Salt okunur kanıt bağlamı." }]
        : [{ label: "Veri", value: "Tamamlanması gereken alan var", help: missingData.join(", ") || "Eksik veri." }]),
    ],
    facts,
  };
}

// The ROOM overview can expose one and only one authorized invoice link. In
// that case the visible collection surface is a real agreement context, not
// an unscoped ledger screen. Keep the generic screen selection whenever the
// view has zero or multiple invoice links so the assistant never guesses
// which financial record the user means.
export function buildRoomIncomeFinanceCopilotSelection({
  baseSelection = null,
  invoiceLinks = [],
  selectedInvoiceId = null,
} = {}) {
  if (!baseSelection || typeof baseSelection !== "object") return baseSelection;
  const visibleLinks = (Array.isArray(invoiceLinks) ? invoiceLinks : []).filter((link) => (
    positiveId(link?.agreementId) && positiveId(link?.invoiceId)
  ));
  const explicitInvoiceId = positiveId(selectedInvoiceId);
  const selectedLinks = explicitInvoiceId
    ? visibleLinks.filter((link) => positiveId(link?.invoiceId) === explicitInvoiceId)
    : visibleLinks;
  if (selectedLinks.length !== 1) return baseSelection;

  const link = selectedLinks[0];
  const agreementId = positiveId(link.agreementId);
  const invoiceId = positiveId(link.invoiceId);
  const hakedisId = positiveId(link.hakedisId);
  const customerLabel = String(link.customerLabel || "Yetkili müşteri").trim();
  const agreementLabel = String(link.agreementLabel || `Sözleşme #${agreementId}`).trim();
  const invoiceLabel = `Fatura #${invoiceId}`;
  const hakedisLabel = hakedisId ? `Hakediş #${hakedisId}` : null;
  const contextLabel = [customerLabel, agreementLabel, invoiceLabel, hakedisLabel].filter(Boolean).join(" · ");
  const sourceLabel = String(link.sourceLabel || "").trim();
  const facts = {
    ...(baseSelection.facts && typeof baseSelection.facts === "object" ? baseSelection.facts : {}),
    selectedEntityType: "agreement",
    selectedEntityId: agreementId,
    selectedAgreementId: agreementId,
    selectedInvoiceId: invoiceId,
    selectedHakedisId: hakedisId,
    selectedFinanceCustomerLabel: customerLabel,
    selectedFinanceSourceLabel: sourceLabel || null,
    contextSummary: contextLabel,
    copilotSummary: `${contextLabel}. Bu görünür ve yetkili ROOM finans kaydı üzerinden fatura, tahsilat ve kalan alacak açıklanabilir.`,
  };

  return {
    ...baseSelection,
    entityType: "agreement",
    entityId: agreementId,
    label: contextLabel,
    summary: facts.copilotSummary,
    fields: [
      ...(Array.isArray(baseSelection.fields) ? baseSelection.fields : []),
      { label: "Fatura", value: invoiceLabel, help: "Yetkili ROOM finans görünümündeki fatura." },
      ...(hakedisId ? [{ label: "Hakediş", value: hakedisLabel, help: "Faturaya bağlı hakediş kaydı." }] : []),
    ],
    badges: [
      ...(Array.isArray(baseSelection.badges) ? baseSelection.badges : []),
      { label: "Kayıt", value: "Fatura ve tahsilat kapsamı", help: sourceLabel || "Yetkili ROOM finans kaydı." },
    ],
    facts,
  };
}

export function isRoomIncomeFinanceCopilotSelection(selection) {
  const agreementId = Number(selection?.facts?.selectedAgreementId || 0);
  const invoiceId = Number(selection?.facts?.selectedInvoiceId || 0);
  return selection?.scopeKey === "/room/financial-operations"
    && selection?.entityType === "agreement"
    && Number.isSafeInteger(agreementId)
    && agreementId > 0
    && Number.isSafeInteger(invoiceId)
    && invoiceId > 0;
}
