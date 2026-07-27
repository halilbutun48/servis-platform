const normalizeText = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();

const roleKey = (value) => normalizeText(value).toUpperCase() || 'DEFAULT';

const surfaceKey = (value) => normalizeText(value);

const freezeSurface = (surface) => Object.freeze({
  ...surface,
  visibleToRoles: Object.freeze([...(surface.visibleToRoles || [])]),
  reuseCapabilities: Object.freeze([...(surface.reuseCapabilities || [])]),
  excludedScope: Object.freeze([...(surface.excludedScope || [])]),
  readOnlyActions: Object.freeze([...(surface.readOnlyActions || [])]),
});

export const FINANCIAL_OPERATIONS_BLOCK_NAME = 'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01';

export const FINANCIAL_OPERATIONS_NEXT_MILESTONE = 'OPERATIONAL-COST-MODEL-01';

export const FINANCIAL_OPERATIONS_MILESTONES = Object.freeze([
  'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01',
  'OPERATIONAL-COST-MODEL-01',
  'ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01',
  'COMPANY-BUDGET-AND-SERVICE-COST-01',
  'HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01',
  'COST-SCENARIO-FORECAST-AND-SAVINGS-01',
  'SEFER-ABI-COST-ANALYSIS-ASSISTANT-01',
  'ACCOUNTING-EXPORT-AND-INTEGRATION-CONTRACT-01',
]);

export const FINANCIAL_OPERATIONS_SCOPE_BOUNDARY = Object.freeze([
  'read-only preview only',
  'RBAC enforced',
  'tenant isolation preserved',
  'no write-action',
  'no payment/hakediş execute',
  'no invoice create/update/delete',
  'no accounting posting',
  'no ERP live integration',
  'no DB write',
  'no backend write route',
]);

export const FINANCIAL_OPERATIONS_EXCLUDED_SCOPE = Object.freeze([
  'maliyet motoru',
  'kârlılık hesaplaması',
  'minimum teklif tabanı',
  'bütçe sapması',
  'hakediş/fatura reconciliation',
  'senaryo/forecast',
  'muhasebe export formatı',
  'ERP entegrasyonu',
  'e-Fatura',
  'e-Defter',
  'vergi programı',
  'payment/hakediş execute',
  'invoice create/update/delete',
  'accounting posting',
  'DB migration',
  'backend write route',
  'provider credential read/write/use',
  'dispatch apply',
  'route apply',
  'driver/vehicle assignment',
  'message/email/SMS/push',
]);

export const FINANCIAL_OPERATIONS_SURFACES = Object.freeze([
  freezeSurface({
    id: 'financial_overview',
    title: 'Finansal operasyon özeti',
    summary: 'Finansal operasyon bloğu için read-only giriş kartı.',
    visibleToRoles: ['SUPER_ADMIN', 'ROOM', 'COMPANY'],
    phase: 'current',
    nextMilestone: 'OPERATIONAL-COST-MODEL-01',
    reuseCapabilities: ['Dynamic Savings', 'Hakediş önizlemesi', 'Payment/quality bridge'],
    excludedScope: ['maliyet motoru', 'payment execute', 'accounting posting'],
    readOnlyActions: ['overview', 'summary', 'surface', 'read'],
  }),
  freezeSurface({
    id: 'room_profitability',
    title: 'Room profitability preview',
    summary: 'Oda bazlı kârlılık önizlemesi.',
    visibleToRoles: ['SUPER_ADMIN', 'ROOM'],
    phase: 'current',
    nextMilestone: 'ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01',
    reuseCapabilities: ['Dynamic Savings', 'Teklif analizi', 'Km / rota maliyet yardımcıları'],
    excludedScope: ['minimum teklif tabanı', 'maliyet motoru', 'write-action'],
    readOnlyActions: ['profitability', 'preview', 'compare', 'summary'],
  }),
  freezeSurface({
    id: 'quote_floor_preview',
    title: 'Quote floor preview',
    summary: 'Teklif tabanı için yalnızca önizleme yüzeyi.',
    visibleToRoles: ['SUPER_ADMIN', 'ROOM'],
    phase: 'future-shell',
    nextMilestone: 'ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01',
    reuseCapabilities: ['Teklif analizi', 'Teklif önerisi', 'Pazarlık hazırlığı'],
    excludedScope: ['minimum teklif tabanı hesaplaması', 'supplier selection', 'offer accept/reject'],
    readOnlyActions: ['quote_floor', 'preview', 'compare'],
  }),
  freezeSurface({
    id: 'route_cost_preview',
    title: 'Route cost preview',
    summary: 'Km, süre ve rota etkisi için read-only önizleme.',
    visibleToRoles: ['SUPER_ADMIN', 'ROOM'],
    phase: 'current',
    nextMilestone: 'OPERATIONAL-COST-MODEL-01',
    reuseCapabilities: ['Km / rota maliyet yardımcıları', 'Dynamic Savings', 'Sefer Abi maliyet cevapları'],
    excludedScope: ['route apply', 'dispatch apply', 'DB write'],
    readOnlyActions: ['route_cost', 'preview', 'summary', 'compare'],
  }),
  freezeSurface({
    id: 'vehicle_cost_preview',
    title: 'Vehicle cost preview',
    summary: 'Araç ve sürücü maliyet alanları için önizleme.',
    visibleToRoles: ['SUPER_ADMIN', 'ROOM'],
    phase: 'current',
    nextMilestone: 'OPERATIONAL-COST-MODEL-01',
    reuseCapabilities: ['Araç/sürücü maliyet alanları', 'Dashboard maliyet kartları'],
    excludedScope: ['driver/vehicle assignment', 'payment execute', 'accounting posting'],
    readOnlyActions: ['vehicle_cost', 'preview', 'card', 'summary'],
  }),
  freezeSurface({
    id: 'agreement_margin_preview',
    title: 'Agreement margin preview',
    summary: 'Sözleşme fiyatı ve marj etkisi için önizleme.',
    visibleToRoles: ['SUPER_ADMIN', 'ROOM'],
    phase: 'current',
    nextMilestone: 'ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01',
    reuseCapabilities: ['Sözleşme fiyatları', 'Teklif analizi', 'Pazarlık hazırlığı'],
    excludedScope: ['agreement execute', 'contract execute', 'dispatch apply'],
    readOnlyActions: ['agreement_margin', 'preview', 'compare', 'summary'],
  }),
  freezeSurface({
    id: 'company_budget',
    title: 'Company budget preview',
    summary: 'Şirket bütçesi için read-only karar destek yüzeyi.',
    visibleToRoles: ['SUPER_ADMIN', 'COMPANY'],
    phase: 'current',
    nextMilestone: 'COMPANY-BUDGET-AND-SERVICE-COST-01',
    reuseCapabilities: ['Dashboard maliyet kartları', 'Sefer Abi maliyet cevapları'],
    excludedScope: ['budget write', 'accounting posting', 'ERP integration'],
    readOnlyActions: ['budget', 'overview', 'summary', 'preview'],
  }),
  freezeSurface({
    id: 'company_service_cost',
    title: 'Company service cost preview',
    summary: 'Servis maliyeti ve birim maliyet önizlemesi.',
    visibleToRoles: ['SUPER_ADMIN', 'COMPANY'],
    phase: 'current',
    nextMilestone: 'COMPANY-BUDGET-AND-SERVICE-COST-01',
    reuseCapabilities: ['Araç/sürücü maliyet alanları', 'Dashboard maliyet kartları', 'Dynamic Savings'],
    excludedScope: ['service cost write', 'invoice create', 'payment execute'],
    readOnlyActions: ['service_cost', 'preview', 'compare', 'summary'],
  }),
  freezeSurface({
    id: 'cost_per_person',
    title: 'Cost per person preview',
    summary: 'Kişi başı maliyet için read-only önizleme.',
    visibleToRoles: ['SUPER_ADMIN', 'COMPANY'],
    phase: 'current',
    nextMilestone: 'COMPANY-BUDGET-AND-SERVICE-COST-01',
    reuseCapabilities: ['Dashboard maliyet kartları', 'Sefer Abi maliyet cevapları'],
    excludedScope: ['personnel write', 'payment execute', 'accounting posting'],
    readOnlyActions: ['cost_per_person', 'preview', 'summary', 'compare'],
  }),
  freezeSurface({
    id: 'supplier_price_quality_compare',
    title: 'Supplier price / quality compare',
    summary: 'Tedarikçi fiyat/kalite karşılaştırma önizlemesi.',
    visibleToRoles: ['SUPER_ADMIN', 'ROOM', 'COMPANY'],
    phase: 'current',
    nextMilestone: 'COPILOT-OFFER-ANALYSIS-01',
    reuseCapabilities: ['Teklif analizi', 'Teklif önerisi', 'Pazarlık hazırlığı', 'Offer ranking quality'],
    excludedScope: ['supplier selection', 'offer accept/reject', 'RFQ send'],
    readOnlyActions: ['supplier_compare', 'preview', 'compare', 'summary'],
  }),
  freezeSurface({
    id: 'hakedis_invoice_reconciliation_preview',
    title: 'Hakediş / invoice reconciliation preview',
    summary: 'Hakediş-fatura uyuşmazlığı için yalnızca önizleme.',
    visibleToRoles: ['SUPER_ADMIN', 'ROOM', 'COMPANY'],
    phase: 'future-shell',
    nextMilestone: 'HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01',
    reuseCapabilities: ['Hakediş önizlemesi', 'Kalite kesintisi', 'Payment/quality bridge'],
    excludedScope: ['invoice create/update/delete', 'payment execute', 'accounting posting'],
    readOnlyActions: ['reconciliation', 'preview', 'summary', 'missing'],
  }),
  freezeSurface({
    id: 'scenario_forecast_savings',
    title: 'Scenario forecast / savings preview',
    summary: 'Tasarruf senaryosu ve forecast için önizleme.',
    visibleToRoles: ['SUPER_ADMIN', 'ROOM', 'COMPANY'],
    phase: 'future-shell',
    nextMilestone: 'COST-SCENARIO-FORECAST-AND-SAVINGS-01',
    reuseCapabilities: ['Dynamic Savings', 'Km / rota maliyet yardımcıları', 'Sefer Abi maliyet cevapları'],
    excludedScope: ['forecast motoru', 'budget write', 'accounting posting'],
    readOnlyActions: ['forecast', 'savings', 'preview', 'compare'],
  }),
  freezeSurface({
    id: 'accounting_export_contract',
    title: 'Accounting export contract',
    summary: 'Muhasebe / ERP dışa aktarma kontratı için gelecek yüzey.',
    visibleToRoles: ['SUPER_ADMIN'],
    phase: 'future-only',
    nextMilestone: 'ACCOUNTING-EXPORT-AND-INTEGRATION-CONTRACT-01',
    reuseCapabilities: ['Excel / CSV dışa aktarma', 'Sefer Abi maliyet cevapları'],
    excludedScope: ['accounting export format', 'ERP integration', 'invoice create/update/delete'],
    readOnlyActions: ['export_contract', 'preview', 'policy', 'summary'],
  }),
]);

const SURFACE_INDEX = new Map(FINANCIAL_OPERATIONS_SURFACES.map((surface) => [surface.id, surface]));

const ROLE_SURFACE_IDS = Object.freeze({
  SUPER_ADMIN: Object.freeze(FINANCIAL_OPERATIONS_SURFACES.map((surface) => surface.id)),
  ROOM: Object.freeze([
    'financial_overview',
    'room_profitability',
    'quote_floor_preview',
    'route_cost_preview',
    'vehicle_cost_preview',
    'agreement_margin_preview',
    'supplier_price_quality_compare',
    'hakedis_invoice_reconciliation_preview',
    'scenario_forecast_savings',
  ]),
  COMPANY: Object.freeze([
    'financial_overview',
    'company_budget',
    'company_service_cost',
    'cost_per_person',
    'supplier_price_quality_compare',
    'hakedis_invoice_reconciliation_preview',
    'scenario_forecast_savings',
  ]),
  DRIVER: Object.freeze([]),
  PERSONEL: Object.freeze([]),
  PARENT: Object.freeze([]),
  SCHOOL: Object.freeze([]),
  ORGANIZATION: Object.freeze([]),
  DEFAULT: Object.freeze([]),
});

function buildRoleAccess(role, summaryText, denialText, nextAction, policyNotes = []) {
  const key = roleKey(role);
  const visibleSurfaceIds = ROLE_SURFACE_IDS[key] || ROLE_SURFACE_IDS.DEFAULT;
  return Object.freeze({
    role: key,
    summaryText,
    denialText,
    nextAction,
    tenantIsolationText: 'Tenant isolation korunur; ham veri role göre daraltılır.',
    visibleSurfaceIds,
    visibleSurfaceTitles: Object.freeze(visibleSurfaceIds.map((id) => SURFACE_INDEX.get(id)?.title || id)),
    policyNotes: Object.freeze([...(policyNotes || [])]),
  });
}

export const FINANCIAL_OPERATIONS_ROLE_ACCESS = Object.freeze({
  SUPER_ADMIN: buildRoleAccess(
    'SUPER_ADMIN',
    'Genel finansal operasyon özeti, policy ve reuse map görünür.',
    'Tenant-safe olmayan detaylar gösterilmez.',
    'Önce blok girişini ve reuse map’i oku.',
    ['read-only overview', 'policy/readiness visible', 'tenant-safe preview only'],
  ),
  ROOM: buildRoleAccess(
    'ROOM',
    'Room tarafında kârlılık, teklif tabanı ve rota maliyeti önizleme görünür.',
    'Company budget ham detayları kapalıdır.',
    'Room profitability ve quote floor önizlemesini kontrol et.',
    ['company budget hidden', 'supplier credential hidden'],
  ),
  COMPANY: buildRoleAccess(
    'COMPANY',
    'Company tarafında bütçe, servis maliyeti ve reconciliation önizleme görünür.',
    'Room iç marj ve teklif tabanı ham detayları kapalıdır.',
    'Bütçe ve servis maliyeti kartlarını kontrol et.',
    ['room internal margin hidden', 'supplier credential hidden'],
  ),
  DRIVER: buildRoleAccess(
    'DRIVER',
    'Bu rol için finansal operasyon yüzeyi görünmez.',
    'Driver rolü finansal operasyon alanına erişemez.',
    'Operasyon ekranına geri dön.',
    ['no finance surface'],
  ),
  PERSONEL: buildRoleAccess(
    'PERSONEL',
    'Bu rol için finansal operasyon yüzeyi görünmez.',
    'Personel rolü finansal operasyon alanına erişemez.',
    'Yetkili rol ile tekrar aç.',
    ['no finance surface'],
  ),
  PARENT: buildRoleAccess(
    'PARENT',
    'Bu rol için finansal operasyon yüzeyi görünmez.',
    'Parent rolü finansal operasyon alanına erişemez.',
    'Yetkili rol ile tekrar aç.',
    ['no finance surface'],
  ),
  SCHOOL: buildRoleAccess(
    'SCHOOL',
    'Bu rol için finansal operasyon yüzeyi görünmez.',
    'School rolü finansal operasyon alanına erişemez.',
    'Yetkili rol ile tekrar aç.',
    ['no finance surface'],
  ),
  ORGANIZATION: buildRoleAccess(
    'ORGANIZATION',
    'Bu rol için finansal operasyon yüzeyi görünmez.',
    'Organization rolü finansal operasyon alanına erişemez.',
    'Yetkili rol ile tekrar aç.',
    ['no finance surface'],
  ),
  DEFAULT: buildRoleAccess(
    'DEFAULT',
    'Tanımsız rol için finansal yüzey kapalıdır.',
    'Tanımsız rol finansal operasyon alanına erişemez.',
    'İlgili rolü doğrula.',
    ['default deny'],
  ),
});

function normalizeSurfaceId(value) {
  return surfaceKey(value);
}

export function getFinancialOperationsAccessForRole(role) {
  return FINANCIAL_OPERATIONS_ROLE_ACCESS[roleKey(role)] || FINANCIAL_OPERATIONS_ROLE_ACCESS.DEFAULT;
}

export function canViewFinancialSurface(role, surface) {
  const key = normalizeSurfaceId(surface);
  if (!key) return false;
  const surfaceEntry = SURFACE_INDEX.get(key);
  if (!surfaceEntry) return false;
  return getFinancialOperationsAccessForRole(role).visibleSurfaceIds.includes(surfaceEntry.id);
}

export function listFinancialSurfacesForRole(role) {
  const access = getFinancialOperationsAccessForRole(role);
  return access.visibleSurfaceIds
    .map((id) => SURFACE_INDEX.get(id))
    .filter(Boolean);
}

export function describeFinancialSurface(surface, role = 'DEFAULT') {
  const surfaceId = normalizeSurfaceId(surface);
  const entry = SURFACE_INDEX.get(surfaceId);
  const access = getFinancialOperationsAccessForRole(role);
  if (!entry) {
    return Object.freeze({
      exists: false,
      allowed: false,
      role: roleKey(role),
      surfaceId,
      title: 'Bilinmeyen finans yüzeyi',
      summaryText: 'Bu yüzey registry içinde tanımlı değil.',
      rbacText: 'Yüzey tanımsız olduğu için gösterilmez.',
      nextAction: 'Surface registry güncelle.',
      previewOnly: true,
    });
  }
  const allowed = access.visibleSurfaceIds.includes(entry.id);
  return Object.freeze({
    exists: true,
    allowed,
    role: roleKey(role),
    surfaceId: entry.id,
    title: entry.title,
    summaryText: entry.summary,
    rbacText: allowed ? access.summaryText : access.denialText,
    nextAction: allowed ? access.nextAction : access.nextAction,
    previewOnly: true,
    phase: entry.phase,
    nextMilestone: entry.nextMilestone,
    reuseCapabilities: entry.reuseCapabilities,
    excludedScope: entry.excludedScope,
  });
}

export function buildFinancialOperationsRbacDenial(role, surface) {
  const description = describeFinancialSurface(surface, role);
  return Object.freeze({
    title: description.title,
    allowed: false,
    role: roleKey(role),
    surfaceId: description.surfaceId,
    summaryText: `${description.rbacText} Bu alan read-only/preview olarak kalır.`,
    nextAction: description.nextAction,
    readOnly: true,
    tenantIsolationText: getFinancialOperationsAccessForRole(role).tenantIsolationText,
  });
}

export function buildFinancialOperationsEmptyState(role, surface) {
  const description = describeFinancialSurface(surface, role);
  if (!description.allowed) {
    return buildFinancialOperationsRbacDenial(role, surface);
  }
  return Object.freeze({
    title: description.title,
    allowed: true,
    role: roleKey(role),
    surfaceId: description.surfaceId,
    summaryText: `${description.title} için henüz veri yok. Bu yüzey sadece read-only/preview olarak hazırlanır.`,
    nextAction: `Sonraki aşama: ${FINANCIAL_OPERATIONS_NEXT_MILESTONE}.`,
    readOnly: true,
    tenantIsolationText: getFinancialOperationsAccessForRole(role).tenantIsolationText,
  });
}

export const FINANCIAL_OPERATIONS_REUSE_MAP = Object.freeze([
  Object.freeze({
    capability: 'Dynamic Savings',
    milestone: 'DYNAMIC-SAVINGS-01',
    sourceFiles: Object.freeze([
      'web/src/utils/routePreviewSummary.js',
      'web/src/panels/shared/DynamicSavingsPreviewCard.jsx',
      'web/src/utils/agreementCopilotFacts.js',
    ]),
    surfaces: Object.freeze(['financial_overview', 'room_profitability', 'scenario_forecast_savings']),
    note: 'readonly tasarruf önizlemesi',
  }),
  Object.freeze({
    capability: 'Hakediş önizlemesi',
    milestone: 'PAY-01B / QLT-PAY-BRIDGE-01',
    sourceFiles: Object.freeze([
      'backend/src/ops/paymentPreview.js',
      'backend/src/ops/qualityReviewDecision.js',
      'backend/src/ops/qualityDraftScore.js',
      'web/src/components/PaymentPreviewReadonlyCard.jsx',
      'web/src/panels/company/CommercialFlowPanel.jsx',
      'web/src/panels/superadmin/CommercialCorePanel.jsx',
    ]),
    surfaces: Object.freeze(['financial_overview', 'hakedis_invoice_reconciliation_preview']),
    note: 'payment başlatmaz',
  }),
  Object.freeze({
    capability: 'Kalite kesintisi',
    milestone: 'QLT-PAY-BRIDGE-01 / QLT-03',
    sourceFiles: Object.freeze([
      'backend/src/ops/qualityReviewDecision.js',
      'backend/src/ops/qualityDraftScore.js',
      'web/src/components/QualityReviewDecisionCard.jsx',
      'web/src/components/QualityDraftScoreCard.jsx',
    ]),
    surfaces: Object.freeze(['hakedis_invoice_reconciliation_preview']),
    note: 'hakediş etkisi için preview',
  }),
  Object.freeze({
    capability: 'Payment/quality bridge',
    milestone: 'QLT-PAY-BRIDGE-01',
    sourceFiles: Object.freeze([
      'backend/src/services/qualityPaymentBridgeService.js',
      'web/src/panels/shared/QualityPaymentBridgePreviewCard.jsx',
      'web/src/panels/company/companyAgreementsBridgeSection.jsx',
      'web/src/panels/room/roomAgreementsBridgeSection.jsx',
    ]),
    surfaces: Object.freeze(['financial_overview', 'hakedis_invoice_reconciliation_preview']),
    note: 'read-only kalite / hakediş köprüsü',
  }),
  Object.freeze({
    capability: 'Teklif analizi',
    milestone: 'COPILOT-OFFER-ANALYSIS-01',
    sourceFiles: Object.freeze([
      'backend/src/ai/chat/copilotOfferAnalysis.js',
      'docs/COPILOT_OFFER_ANALYSIS_01.md',
    ]),
    surfaces: Object.freeze(['supplier_price_quality_compare']),
    note: 'comparison matrix ve risk summary',
  }),
  Object.freeze({
    capability: 'Teklif önerisi',
    milestone: 'COPILOT-OFFER-RECOMMENDATION-01',
    sourceFiles: Object.freeze([
      'backend/src/ai/chat/copilotOfferRecommendation.js',
      'docs/COPILOT_OFFER_RECOMMENDATION_01.md',
    ]),
    surfaces: Object.freeze(['supplier_price_quality_compare']),
    note: 'read-only recommendation draft',
  }),
  Object.freeze({
    capability: 'Pazarlık hazırlığı',
    milestone: 'COPILOT-NEGOTIATION-ASSIST-01',
    sourceFiles: Object.freeze([
      'backend/src/ai/chat/copilotNegotiationAssist.js',
      'docs/COPILOT_NEGOTIATION_ASSIST_01.md',
    ]),
    surfaces: Object.freeze(['supplier_price_quality_compare']),
    note: 'counteroffer prep',
  }),
  Object.freeze({
    capability: 'Sözleşme fiyatları',
    milestone: 'COPILOT-SHIFT-TO-AGREEMENT-PREP-01 / COPILOT-DISPATCH-ACTION-PREP-01',
    sourceFiles: Object.freeze([
      'backend/src/ai/chat/copilotShiftToAgreementPrep.js',
      'backend/src/ai/chat/copilotDispatchActionPrep.js',
      'web/src/utils/agreementCopilotFacts.js',
      'web/src/panels/company/CommercialCorePanel.jsx',
    ]),
    surfaces: Object.freeze(['agreement_margin_preview', 'accounting_export_contract']),
    note: 'only preview, no agreement execute',
  }),
  Object.freeze({
    capability: 'Kilometre / rota maliyet yardımcıları',
    milestone: 'DYNAMIC-SAVINGS-01 / ROUTE PREVIEW',
    sourceFiles: Object.freeze([
      'web/src/utils/routePreviewSummary.js',
      'backend/src/ops/operationProof.js',
    ]),
    surfaces: Object.freeze(['route_cost_preview', 'scenario_forecast_savings']),
    note: 'km / süre / kapasite preview',
  }),
  Object.freeze({
    capability: 'Araç / sürücü maliyet alanları',
    milestone: 'COMMERCIAL PANELS',
    sourceFiles: Object.freeze([
      'web/src/panels/company/CommercialCorePanel.jsx',
      'web/src/panels/room/CommercialCorePanel.jsx',
      'web/src/panels/shared/OfferQualityRankingCard.jsx',
      'web/src/utils/copilotFacts.js',
    ]),
    surfaces: Object.freeze(['vehicle_cost_preview', 'agreement_margin_preview']),
    note: 'read-only fields',
  }),
  Object.freeze({
    capability: 'Dashboard maliyet kartları',
    milestone: 'COMMERCIAL / SUPERADMIN PANELS',
    sourceFiles: Object.freeze([
      'web/src/panels/superadmin/CommercialCorePanel.jsx',
      'web/src/panels/company/CommercialFlowPanel.jsx',
      'web/src/panels/room/CommercialFlowPanel.jsx',
    ]),
    surfaces: Object.freeze(['financial_overview', 'company_budget', 'room_profitability']),
    note: 'summary cards only',
  }),
  Object.freeze({
    capability: 'Excel / CSV dışa aktarma',
    milestone: 'PAY-01D / PAY-01E',
    sourceFiles: Object.freeze([
      'backend/src/ops/paymentPreview.js',
      'backend/src/routes/commercialCore.js',
      'web/src/components/PaymentPreviewReadonlyCard.jsx',
    ]),
    surfaces: Object.freeze(['financial_overview', 'accounting_export_contract']),
    note: 'audit trail only',
  }),
  Object.freeze({
    capability: 'Sefer Abi maliyet cevapları',
    milestone: 'SEFER-ABI-REASONING-ASSISTANT-01',
    sourceFiles: Object.freeze([
      'backend/src/ai/chat/seferAbiReasoningAssistant.js',
      'backend/src/ai/chat/helpComposer.js',
      'backend/src/ai/chat/intentRouterCore.js',
      'web/src/utils/copilotFacts.js',
      'web/src/utils/agreementCopilotFacts.js',
    ]),
    surfaces: Object.freeze(['financial_overview', 'company_budget', 'room_profitability']),
    note: 'explain / recommend only',
  }),
]);

export function buildFinancialOperationsReuseSummary() {
  return Object.freeze({
    title: 'Mevcut capability reuse map',
    summaryText: 'Dynamic savings, hakediş önizlemesi, kalite kesintisi, teklif analizi ve Sefer Abi cost cevapları yeniden kullanılır.',
    items: FINANCIAL_OPERATIONS_REUSE_MAP,
    nextAction: `Ortak cost motoru sonraki milestone olan ${FINANCIAL_OPERATIONS_NEXT_MILESTONE} ile gelir.`,
  });
}

export function getFinancialOperationsReuseSummary() {
  return buildFinancialOperationsReuseSummary();
}

export function buildFinancialOperationsNextMilestoneSummary() {
  return Object.freeze({
    title: 'Next milestone summary',
    summaryText: `Sonraki aşama: ${FINANCIAL_OPERATIONS_NEXT_MILESTONE}. Bu aşamada ortak cost motoru gelir; bu milestone yalnızca scope/RBAC/surface registry kurar.`,
    currentMilestone: FINANCIAL_OPERATIONS_BLOCK_NAME,
    nextMilestone: FINANCIAL_OPERATIONS_NEXT_MILESTONE,
    milestoneOrder: FINANCIAL_OPERATIONS_MILESTONES,
    noWriteBoundary: FINANCIAL_OPERATIONS_SCOPE_BOUNDARY,
  });
}

const BLOCKED_ACTION_KEYWORDS = Object.freeze([
  'payment execute',
  'hakediş execute',
  'hakedis execute',
  'invoice create',
  'invoice update',
  'invoice delete',
  'accounting posting',
  'muhasebe posting',
  'erp integration',
  'erp live integration',
  'fatura create',
  'fatura update',
  'fatura delete',
  'db write',
  'backend write route',
  'route apply',
  'dispatch apply',
  'shift create',
  'shift update',
  'driver assign',
  'vehicle assign',
  'provider credential',
  'message send',
  'email send',
  'sms send',
  'push send',
]);

const READ_ONLY_ACTION_KEYWORDS = Object.freeze([
  'overview',
  'summary',
  'surface',
  'preview',
  'read',
  'compare',
  'policy',
  'rbac',
  'card',
  'shell',
  'profitability',
  'quote_floor',
  'route_cost',
  'vehicle_cost',
  'agreement_margin',
  'budget',
  'service_cost',
  'cost_per_person',
  'supplier_price_quality_compare',
  'hakedis_invoice_reconciliation_preview',
  'scenario_forecast_savings',
  'accounting_export_contract',
  'financial',
]);

export function isAccountingExecutionBlocked(action) {
  const normalized = normalizeText(action);
  if (!normalized) return false;
  return BLOCKED_ACTION_KEYWORDS.some((needle) => normalized.includes(normalizeText(needle)));
}

export function isFinancialOperationReadOnlyAction(action) {
  const normalized = normalizeText(action);
  if (!normalized) return false;
  if (isAccountingExecutionBlocked(normalized)) return false;
  if (SURFACE_INDEX.has(normalized)) return true;
  return READ_ONLY_ACTION_KEYWORDS.some((needle) => normalized.includes(normalizeText(needle)));
}
