function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function pushIf(rows, condition, value) {
  if (condition && value) rows.push(value);
}

function actionRule({
  key,
  label,
  enabled,
  reason = '',
  purpose = '',
  whenToUse = '',
  whatHappens = '',
  riskNote = '',
  required = [],
  blockedBy = [],
}) {
  const row = {
    key: key || normalizeText(label).replace(/[^a-z0-9çğıöşü]+/gi, '_'),
    label,
    enabled: Boolean(enabled),
    purpose,
    whenToUse,
    whatHappens,
    riskNote,
    required: (Array.isArray(required) ? required : []).filter(Boolean),
    blockedBy: (Array.isArray(blockedBy) ? blockedBy : []).filter(Boolean),
  };
  if (!enabled) row.reason = reason || 'Bu işlem için ön koşullar tamamlanmamış olabilir.';
  if (enabled && reason) row.reason = reason;
  return row;
}

function splitActions(actions = []) {
  const rows = (Array.isArray(actions) ? actions : []).filter((row) => row && row.label);
  return {
    allowedActions: rows.filter((row) => row.enabled !== false),
    blockedActions: rows.filter((row) => row.enabled === false),
  };
}

export function buildGeoReviewFacts({ selected, counts, scopeMode = 'ALL', hasPlanningScope = false }) {
  const hasCoordinates = Number.isFinite(Number(selected?.homeLat)) && Number.isFinite(Number(selected?.homeLng));
  const hasAddress = Boolean(String(selected?.homeAddress || '').trim());
  const status = String(selected?.geoStatus || '').toUpperCase();
  const missing = [];
  const blockers = [];
  pushIf(missing, !hasCoordinates, 'Koordinat yok');
  pushIf(missing, !hasAddress, 'Adres yok');
  pushIf(blockers, !hasCoordinates && !hasAddress, 'Adres ve koordinat birlikte boş; bu kayıt üretime hazır değil.');
  pushIf(blockers, status === 'FAILED', 'Konum üretimi başarısız görünüyor; önce neden alanını okuyup yeniden üretmek gerekir.');
  const canSave = hasCoordinates;
  const actions = [
    actionRule({
      key: 'geo_open_big_map',
      label: 'Büyük Haritada İşaretle',
      enabled: true,
      purpose: 'Küçük önizleme yerine rahat seçim yapmak için büyük harita modalını açar.',
      whenToUse: 'Adres güven vermiyorsa veya lat/lon elle düzeltilecekse kullanılır.',
      whatHappens: 'Büyük haritada pin seçilir; OK Yap ile küçük önizlemeye dönülür.',
      riskNote: 'OK Yap tek başına veritabanına yazmaz; dönüşten sonra Kaydet gerekir.',
    }),
    actionRule({
      key: 'geo_save',
      label: 'Kaydet',
      enabled: canSave,
      reason: 'Kaydetmeden önce lat/lon üretmek veya büyük haritada işaretlemek gerekir.',
      purpose: 'Seçili kişideki koordinatı veritabanına sabitler.',
      whenToUse: 'Sağ panelde doğru kişi seçiliyken ve koordinat görünüyorken kullanılır.',
      whatHappens: 'Mevcut kişideki lat/lon kalıcı hale gelir.',
      riskNote: 'Yanlış kişi seçiliyse doğru koordinat yanlış kayda yazılabilir.',
      required: ['Seçili kişi doğru olmalı', 'Koordinat oluşmuş olmalı'],
      blockedBy: canSave ? [] : ['Koordinat yok'],
    }),
    actionRule({
      key: 'geo_save_next',
      label: 'Kaydet + Sonraki',
      enabled: canSave,
      reason: 'Seri ilerlemek için önce mevcut kişi kaydının koordinatı oluşmalı.',
      purpose: 'Koordinatı kaydeder ve listedeki bir sonraki kişiye geçer.',
      whenToUse: 'Seri kontrol yaparken ve mevcut kayıt doğrulanmışken kullanılır.',
      whatHappens: 'Mevcut kayıt kaydedilir; sonra sıradaki satır seçili hale gelir.',
      riskNote: 'Seçim state’i doğru taşınmıyorsa hangi kişinin seçili olduğuna yeniden bakmak gerekir.',
      required: ['Seçili kişi doğru olmalı', 'Koordinat oluşmuş olmalı'],
      blockedBy: canSave ? [] : ['Koordinat yok'],
    }),
    actionRule({
      key: 'geo_clear_addresses',
      label: 'Tüm Adresleri Temizle',
      enabled: true,
      purpose: 'KVKK için geçici adres metnini toplu temizler.',
      whenToUse: 'Lat/lon üretimi bittiğinde ve metin adres artık gerekmiyorsa kullanılır.',
      whatHappens: 'Görünür kapsamdaki adres metinleri temizlenir; lat/lon kalır.',
      riskNote: 'Adres silindikten sonra metin adres üstünden yeniden üretim yapmak zorlaşır.',
    }),
    actionRule({
      key: 'geo_clear_phones',
      label: 'Tüm Telefonları Temizle',
      enabled: true,
      purpose: 'KVKK için gereksiz telefon bilgisini toplu temizler.',
      whenToUse: 'Telefonun operasyon için artık gerekmediği durumda kullanılır.',
      whatHappens: 'Görünür kapsamdaki telefon alanları temizlenir.',
      riskNote: 'Telefon tekrar gerekecekse önce dış kaynaktan doğrulama gerekir.',
    }),
  ];
  const actionMatrix = splitActions(actions);
  return {
    screenType: 'GEOREVIEW',
    stage: status || '-',
    readinessScore: canSave ? 82 : 38,
    readiness: canSave ? 'REVIEW_NEEDED' : 'NOT_READY',
    missing,
    blockers,
    ...actionMatrix,
    counters: {
      visible: Number(counts?.visible || 0),
      ok: Number(counts?.ok || 0),
      review: Number(counts?.review || 0),
      failed: Number(counts?.failed || 0),
      noCoord: Number(counts?.noCoord || 0),
      planningScope: hasPlanningScope ? (scopeMode === 'SESSION' ? 'SESSION' : 'ALL') : 'ALL',
    },
    evidence: [
      `Durum: ${status || '-'}`,
      `Koordinat: ${hasCoordinates ? `${Number(selected?.homeLat).toFixed(5)}, ${Number(selected?.homeLng).toFixed(5)}` : 'Yok'}`,
      `Adres: ${hasAddress ? 'Var' : 'Yok'}`,
      `Görünür kayıt: ${Number(counts?.visible || 0)}`,
    ],
    reasoningLead: canSave
      ? 'Bu kayıtta ana karar, koordinatın doğru kişide sabitlenip sabitlenmediğidir.'
      : 'Bu kayıtta ana blokaj koordinat eksikliği tarafında görünüyor.',
    nextBestAction: canSave
      ? 'Önce seçili kişi adını doğrula. Sonra Kaydet ile sabitle; seri gidiyorsan Kaydet + Sonraki kullan.'
      : hasAddress
        ? 'Önce büyük haritada pin koy veya adresten bul ile lat/lon üret. Sonra Kaydet de.'
        : 'Önce büyük haritada işaretle. Sonra OK ile dönüp Kaydet de.',
    safestNextStep: 'En risksiz adım, sağ panelde seçili kişi adı ile listede seçili satırın aynı olduğunu doğrulamaktır.',
    compareHint: 'OK Yap yalnız büyük harita seçim modalını onaylar; Kaydet veritabanına yazar.',
  };
}

export function buildShiftFacts({ shift, itemCount = 0 }) {
  const status = String(shift?.status || '-').toUpperCase();
  const hasVehicle = Boolean(shift?.vehicle?.plate || Number(shift?.vehicleId || 0));
  const hasDriver = Boolean(shift?.driver?.fullName || Number(shift?.driverId || 0));
  const stopCount = Array.isArray(shift?.stops) ? shift.stops.length : 0;
  const offerCount = Number(shift?.offers?.length || shift?.openOfferCount || 0);
  const approvedLike = ['APPROVED', 'ACCEPTED', 'ACTIVE'].includes(status);
  const missing = [];
  const blockers = [];
  pushIf(missing, !hasVehicle, 'Araç yok');
  pushIf(missing, !hasDriver, 'Sürücü yok');
  pushIf(missing, stopCount <= 0, 'Durak yok');
  pushIf(blockers, approvedLike && (!hasVehicle || !hasDriver), 'Durum onaylı görünse de araç veya sürücü boş; saha için tam hazır değil.');
  pushIf(blockers, offerCount > 0 && !approvedLike, 'Teklif/karar tarafı açık görünüyor; atama yorumu erken olabilir.');
  const actions = [
    actionRule({
      key: 'shift_open_list',
      label: 'Listeyi aç',
      enabled: Boolean(shift?.id),
      reason: 'Önce seçili bir vardiya gerekir.',
      purpose: 'Seçili vardiyanın detay veya bağlı akış ekranını açar.',
      whenToUse: 'Satır seçiliyse ve detay okumak gerekiyorsa kullanılır.',
      whatHappens: 'İlgili vardiya için daha detaylı görünüm veya bağlı liste açılır.',
      required: ['Seçili vardiya'],
    }),
    actionRule({
      key: 'shift_open_offers',
      label: 'Teklifleri aç',
      enabled: offerCount > 0,
      reason: 'Bu kayıtta görünen açık teklif yok.',
      purpose: 'Bu vardiyaya bağlı teklif veya karar akışını açar.',
      whenToUse: 'Karar kapanmadıysa ve room/company teklifi incelenecekse kullanılır.',
      whatHappens: 'Teklif listesi veya teklif modalı açılır.',
      required: ['Görünen teklif olmalı'],
      blockedBy: offerCount > 0 ? [] : ['Açık teklif yok'],
    }),
    actionRule({
      key: 'shift_assign_vehicle',
      label: 'Araç ata',
      enabled: Boolean(shift?.id) && !hasVehicle,
      reason: 'Araç alanı zaten doluysa yeniden araç ata öncelikli değildir.',
      purpose: 'Vardiyaya araç bağı ekler veya eksik aracı tamamlatır.',
      whenToUse: 'Araç alanı boşsa kullanılır.',
      whatHappens: 'Seçili vardiyaya araç seçme akışı açılır.',
      required: ['Seçili vardiya'],
      blockedBy: !hasVehicle ? [] : ['Araç zaten bağlı'],
    }),
    actionRule({
      key: 'shift_assign_driver',
      label: 'Sürücü ata',
      enabled: Boolean(shift?.id) && !hasDriver,
      reason: 'Sürücü alanı zaten doluysa bu adım zorunlu değildir.',
      purpose: 'Vardiyaya sürücü bağı ekler veya eksik sürücüyü tamamlatır.',
      whenToUse: 'Sürücü alanı boşsa kullanılır.',
      whatHappens: 'Seçili vardiyaya sürücü seçme akışı açılır.',
      required: ['Seçili vardiya'],
      blockedBy: !hasDriver ? [] : ['Sürücü zaten bağlı'],
    }),
    actionRule({
      key: 'shift_operate',
      label: 'Operasyona geç',
      enabled: approvedLike && hasVehicle && hasDriver && stopCount > 0,
      reason: offerCount > 0 && !approvedLike
        ? 'Teklif/karar tarafı kapanmadan operasyon yorumu erken olur.'
        : stopCount <= 0
          ? 'Durak olmadan operasyon güvenilir ilerlemez.'
          : (!hasVehicle || !hasDriver)
            ? 'Araç ve sürücü bağı tamamlanmadan operasyona geçmek risklidir.'
            : 'Bu kayıt henüz operasyon için tam hazır görünmüyor.',
      purpose: 'Vardiyayı saha akışına taşımak için son hazırlık kontrolünü temsil eder.',
      whenToUse: 'Durum onaylı, araç-sürücü dolu ve duraklar hazır olduğunda anlamlıdır.',
      whatHappens: 'Kayıt operasyon veya canlı takip tarafında okunabilir hale gelir.',
      riskNote: 'Durum onaylı olsa bile araç veya sürücü boşsa sahada zincir kırılır.',
      required: ['Durum onaylı olmalı', 'Araç bağlı olmalı', 'Sürücü bağlı olmalı', 'Durak olmalı'],
      blockedBy: [
        ...(!approvedLike ? ['Durum henüz onaylı değil'] : []),
        ...(!hasVehicle ? ['Araç yok'] : []),
        ...(!hasDriver ? ['Sürücü yok'] : []),
        ...(stopCount <= 0 ? ['Durak yok'] : []),
      ],
    }),
  ];
  const actionMatrix = splitActions(actions);
  return {
    screenType: 'SHIFTS',
    stage: status,
    readinessScore: approvedLike && hasVehicle && hasDriver ? (stopCount > 0 ? 88 : 74) : 42,
    readiness: approvedLike && hasVehicle && hasDriver && stopCount > 0 ? 'READY' : blockers.length ? 'NOT_READY' : 'REVIEW_NEEDED',
    missing,
    blockers,
    ...actionMatrix,
    counters: { visible: Number(itemCount || 0), offers: offerCount, stops: stopCount },
    evidence: [
      `Durum: ${status}`,
      `Araç: ${hasVehicle ? (shift?.vehicle?.plate || `#${shift?.vehicleId}`) : 'Yok'}`,
      `Sürücü: ${hasDriver ? (shift?.driver?.fullName || `#${shift?.driverId}`) : 'Yok'}`,
      `Durak: ${stopCount}`,
      `Teklif: ${offerCount}`,
    ],
    reasoningLead: blockers.length
      ? 'Bu vardiyada ana blokaj atama veya teklif tarafında görünüyor.'
      : 'Bu vardiyada önce durum, sonra araç-sürücü bağı ve durak hazır mı ona bakılır.',
    nextBestAction: blockers.length
      ? (offerCount > 0 && !approvedLike ? 'Önce teklif kararını kapat. Sonra araç ve sürücü alanlarını tekrar kontrol et.' : 'Önce araç ve sürücü bağını tamamla. Sonra durak ve sonraki adım alanlarını yeniden oku.')
      : 'Önce seçili vardiyanın araç, sürücü ve durak alanlarını birlikte kontrol et.',
    safestNextStep: 'En risksiz adım, seçili satırda araç ve sürücü gerçekten dolu mu onu doğrulamaktır.',
    compareHint: 'APPROVED ile tam atama aynı şey değildir; araç veya sürücü boşsa iş saha için eksiktir.',
  };
}

export function buildMapFacts({ selected, selectedShift, selectedNext, selectedEta, selectedStats, gpsStatus, gpsAge, vehicleCount = 0 }) {
  const status = String(selectedShift?.status || '-').toUpperCase();
  const etaReady = Number.isFinite(Number(selectedEta));
  const nextReady = Boolean(selectedNext?.name);
  const gpsFresh = !/eski|stale|unknown|bilinmiyor|offline/i.test(String(gpsAge || '') + ' ' + String(gpsStatus || ''));
  const hasShift = Boolean(selectedShift?.id);
  const hasSelectedVehicle = Boolean(selected?.id || selected?.plate);
  const totalStops = Number(selectedStats?.total || 0);
  const missing = [];
  const blockers = [];
  pushIf(missing, !hasSelectedVehicle, 'Seçili araç yok');
  pushIf(missing, !nextReady, 'Sıradaki durak yok');
  pushIf(missing, !etaReady, 'ETA yok');
  pushIf(blockers, !hasSelectedVehicle, "Önce marker'dan araç seçilmeden bu kaydı başka ekranla karşılaştırmak erken olur.");
  pushIf(blockers, !gpsFresh, 'Son GPS eski görünüyor; canlı karar vermeden önce veri akışı doğrulanmalı.');
  pushIf(blockers, hasSelectedVehicle && !hasShift, 'Araç seçili olsa bile bağlı aktif vardiya görünmüyor.');
  const actions = [
    actionRule({
      key: 'map_show_all',
      label: 'Tümünü Göster',
      enabled: true,
      purpose: 'Haritayı tüm rota ve araç görünümüyle yeniden çerçeveler.',
      whenToUse: 'Manuel sürükleme sonrası harita dağınık kaldıysa kullanılır.',
      whatHappens: 'Harita görünümü tekrar genel kapsama alınır.',
    }),
    actionRule({
      key: 'map_next_navigation',
      label: 'Sonraki durağa navigasyon',
      enabled: nextReady,
      reason: 'Önce sıradaki durak oluşmalı.',
      purpose: 'Sıradaki durak için dış navigasyonu başlatır.',
      whenToUse: 'Sıradaki durak net ve GPS canlı ise kullanılır.',
      whatHappens: 'Haritadan dış navigasyon uygulamasına geçilir.',
      required: ['Sıradaki durak olmalı'],
      blockedBy: nextReady ? [] : ['Sıradaki durak yok'],
    }),
    actionRule({
      key: 'map_open_full_route',
      label: 'Tam rotayı dış navigasyonda aç',
      enabled: hasShift,
      reason: 'Önce vardiya ve rota görünmeli.',
      purpose: 'Bağlı vardiyanın tam rota çizgisini dış navigasyona verir.',
      whenToUse: 'Aktif vardiya ve rota bağının doğrulandığı durumda kullanılır.',
      whatHappens: 'Tam rota dış navigasyon uygulamasında açılır.',
      required: ['Bağlı vardiya'],
      blockedBy: hasShift ? [] : ['Bağlı vardiya yok'],
    }),
    actionRule({
      key: 'map_eta_follow',
      label: 'ETA takibi',
      enabled: etaReady && gpsFresh,
      reason: !gpsFresh ? 'GPS eskiyse ETA güven vermeyebilir.' : 'ETA bilgisi güncel değil.',
      purpose: 'ETA zincirinin güvenilir okunup okunmadığını temsil eder.',
      whenToUse: 'Canlı konum akışı sürüyor ve sonraki durak doluysa anlamlıdır.',
      whatHappens: 'Kullanıcı ETA ve kalan durak bilgisini karar için baz alır.',
      required: ['GPS güncel olmalı', 'ETA görünmeli'],
      blockedBy: [
        ...(!gpsFresh ? ['Son GPS eski'] : []),
        ...(!etaReady ? ['ETA yok'] : []),
      ],
    }),
  ];
  const actionMatrix = splitActions(actions);
  return {
    screenType: 'MAP',
    stage: status,
    hasSelectedVehicle,
    hasShift,
    gpsFresh,
    etaReady,
    nextReady,
    totalStops,
    emptyState: !hasSelectedVehicle || (!hasShift && totalStops <= 0 && !nextReady),
    readinessScore: hasSelectedVehicle && gpsFresh && nextReady ? 84 : 46,
    readiness: hasSelectedVehicle && gpsFresh && nextReady ? 'READY' : blockers.length ? 'NOT_READY' : 'REVIEW_NEEDED',
    missing,
    blockers,
    ...actionMatrix,
    counters: {
      vehicles: Number(vehicleCount || 0),
      totalStops: Number(selectedStats?.total || 0),
      remainingStops: Number(selectedStats?.remaining || 0),
      completedStops: Number(selectedStats?.completed || 0),
    },
    evidence: [
      `Araç: ${selected?.plate || `#${selected?.id || '-'}`}`,
      `Son GPS: ${gpsAge || gpsStatus || '-'}`,
      `Sıradaki durak: ${selectedNext?.name || 'Yok'}`,
      `ETA: ${etaReady ? `${Number(selectedEta)} dk` : 'Yok'}`,
      `Kalan durak: ${Number(selectedStats?.remaining || 0)}`,
    ],
    reasoningLead: !hasSelectedVehicle
      ? 'Bu haritada önce seçili araç oluşmadan sonraki ekran kararı vermek erken olur.'
      : blockers.length
        ? 'Bu haritadaki ana sorun canlılık veya rota bağının eksik görünmesi.'
        : 'Bu haritada önce canlılık, sonra sıradaki durak ve ETA birlikte okunmalı.',
    nextBestAction: !hasSelectedVehicle
      ? "Önce marker'a tıklayıp aracı seç. Sonra üst kartta Shift, Son GPS ve Sıradaki durak dolu mu bak."
      : blockers.length
        ? (!gpsFresh ? 'Önce Son GPS zamanını kontrol et. Sonra aynı kaydı Vardiyalar ekranında açıp atama/rota bağını doğrula.' : 'Önce bağlı vardiyayı açıp rota ve durak bilgisini kontrol et.')
        : 'Önce seçili araç için Son GPS, ETA ve kalan durak sayısını birlikte kontrol et.',
    safestNextStep: !hasSelectedVehicle
      ? "En risksiz adım, önce marker'dan doğru aracı seçmektir."
      : 'En risksiz adım, doğru aracı seçip Son GPS eski mi değil mi onu doğrulamaktır.',
    compareHint: 'Mavi aktif sıradaki parçayı, yeşil geçilen kısmı gösterir; görsel yorumla canlı karar yorumunu karıştırmamak gerekir.',
  };
}

export function buildCommercialFlowFacts({ selectedItem, marketCount = 0, acceptedCount = 0, listCount = 0 }) {
  const status = String(selectedItem?.statusLabel || '-').toUpperCase();
  const section = String(selectedItem?.section || 'market');
  const isMarket = section === 'market';
  const isPending = section === 'pending';
  const isList = section === 'list';
  const blockers = [];
  pushIf(blockers, isMarket, 'Ticari karar henüz market/pazarlık tarafında; operasyon yorumu erken olabilir.');
  pushIf(blockers, isPending, 'Pazarlık bitmiş olsa bile operasyon bağlantısı ayrıca doğrulanmalıdır.');
  const actions = [
    actionRule({
      key: 'commercial_open_market',
      label: 'Marketi aç',
      enabled: isMarket,
      reason: 'Kayıt market aşamasında değil.',
      purpose: 'Pazarlık ve teklif karşılaştırma tarafını açar.',
      whenToUse: 'Kayıt hâlâ market bölümündeyse kullanılır.',
      whatHappens: 'Market satırları veya ilgili teklif görünümü açılır.',
      blockedBy: isMarket ? [] : ['Kayıt market aşamasında değil'],
    }),
    actionRule({
      key: 'commercial_open_pending',
      label: 'Bekleyeni aç',
      enabled: isPending,
      reason: 'Kayıt kabul edilmiş bekleyen aşamada değil.',
      purpose: 'Kabul edilmiş ama operasyona tam bağlanmamış kayıtları açar.',
      whenToUse: 'Kayıt pending/bekleyen bölümündeyse kullanılır.',
      whatHappens: 'Bekleyenler görünümü açılır.',
      blockedBy: isPending ? [] : ['Kayıt bekleyen aşamada değil'],
    }),
    actionRule({
      key: 'commercial_open_list',
      label: 'Listeyi aç',
      enabled: isList || Boolean(selectedItem?.shiftId),
      reason: 'Bağlı vardiya görünmüyor.',
      purpose: 'Bağlı operasyon veya vardiya listesini açar.',
      whenToUse: 'Kayıt operasyon/liste tarafına geçtiyse kullanılır.',
      whatHappens: 'Bağlı vardiya veya operasyon kaydı açılır.',
      blockedBy: isList || selectedItem?.shiftId ? [] : ['Bağlı vardiya yok'],
    }),
  ];
  const actionMatrix = splitActions(actions);
  return {
    screenType: 'COMMERCIAL_FLOW',
    stage: `${section}:${status}`,
    readinessScore: isList ? 82 : isPending ? 61 : 39,
    readiness: isList ? 'READY' : isPending ? 'REVIEW_NEEDED' : 'NOT_READY',
    missing: [],
    blockers,
    ...actionMatrix,
    counters: { market: Number(marketCount || 0), accepted: Number(acceptedCount || 0), list: Number(listCount || 0) },
    evidence: [
      `Karşı taraf: ${selectedItem?.counterparty || '-'}`,
      `Akış: ${selectedItem?.flowLabel || '-'}`,
      `Durum: ${status}`,
      `Sonraki adım: ${selectedItem?.nextStep || '-'}`,
    ],
    reasoningLead: isMarket
      ? 'Bu kayıt hâlâ ticari pazarlık tarafında görünüyor.'
      : isPending
        ? 'Bu kayıt kabul edilmiş ama operasyon hazırlığı ayrıca kontrol edilmelidir.'
        : 'Bu kayıt operasyon tarafına geçmiş görünüyor.',
    nextBestAction: isMarket
      ? 'Önce Marketi aç veya teklif tarafını tamamla. Sonra operasyon hazırlığına bak.'
      : isPending
        ? 'Önce Bekleyeni aç ve bağlı vardiyayı kontrol et. Araç-sürücü ataması tamam mı bak.'
        : 'Önce Listeyi aç ve bağlı vardiyanın hazır olup olmadığını kontrol et.',
    safestNextStep: 'En risksiz adım, önce bu kaydın market mi kabul mü liste mi olduğuna bakmaktır.',
    compareHint: 'Marketi aç pazarlık tarafını gösterir; Listeyi aç operasyon tarafına götürür.',
  };
}

export function buildServiceEvaluationFacts({ item, summary }) {
  const status = String(item?.statusLabel || '-').toUpperCase();
  const evalStatus = String(item?.evaluationStatus || '-').toUpperCase();
  const hasProviderScore = Number(item?.providerScore?.evaluationCount || 0) > 0;
  const canEvaluate = /BEK|PENDING|DEĞERLENDIR|DEGERLENDIR/.test(evalStatus) || /DONE|COMPLETED/.test(status);
  const blockers = [];
  pushIf(blockers, !/DONE|COMPLETED|ACTIVE|APPROVED/.test(status), 'Hizmet operasyon durumu değerlendirme için net görünmüyor.');
  pushIf(blockers, !canEvaluate, 'Değerlendirme durumu henüz puan vermeye açık görünmüyor.');
  const actions = [
    actionRule({
      key: 'service_evaluate',
      label: 'Değerlendir',
      enabled: canEvaluate,
      reason: 'Bu kayıt için değerlendirme akışı açık görünmüyor.',
      purpose: 'Seçili hizmet için puan ve kısa değerlendirme kaydı açar.',
      whenToUse: 'Hizmet tamamlandıysa ve değerlendirme rozeti uygunsa kullanılır.',
      whatHappens: 'Puan ve not kaydı alınır.',
      blockedBy: canEvaluate ? [] : ['Değerlendirme durumu açık değil'],
    }),
    actionRule({
      key: 'service_open_services',
      label: 'Hizmetleri aç',
      enabled: true,
      purpose: 'Bağlı hizmet veya operasyon kayıtlarını açar.',
      whenToUse: 'Sonucun kaynağını görmek gerektiğinde kullanılır.',
      whatHappens: 'İlgili hizmet listesi açılır.',
    }),
    actionRule({
      key: 'service_open_agreements',
      label: 'Sözleşmeleri aç',
      enabled: true,
      purpose: 'Bağlı sözleşme veya ilişkiyi doğrulamak için ilgili görünümü açar.',
      whenToUse: 'Hizmetin ticari kaynağını görmek gerektiğinde kullanılır.',
      whatHappens: 'Sözleşme tarafına geçilir.',
    }),
  ];
  const actionMatrix = splitActions(actions);
  return {
    screenType: 'SERVICE_EVALUATION',
    stage: `${status}:${evalStatus}`,
    readinessScore: canEvaluate ? 79 : 44,
    readiness: canEvaluate ? 'REVIEW_NEEDED' : 'NOT_READY',
    missing: [],
    blockers,
    ...actionMatrix,
    counters: {
      completedServices: Number(summary?.cards?.completedServices || 0),
      pendingEvaluation: Number(summary?.cards?.pendingEvaluation || 0),
      activeServices: Number(summary?.cards?.activeServices || 0),
    },
    evidence: [
      `Sağlayıcı: ${item?.providerName || '-'}`,
      `Hizmet: ${item?.serviceLabel || '-'}`,
      `Durum: ${status}`,
      `Değerlendirme: ${evalStatus}`,
      `Sağlayıcı puanı: ${hasProviderScore ? `${Number(item?.providerScore?.averageScore || 0).toFixed(1)} ★` : 'Henüz puan yok'}`,
    ],
    reasoningLead: canEvaluate
      ? 'Bu kayıtta ana karar, değerlendirmenin gerçekten açılıp açılmayacağı tarafında.'
      : 'Bu kayıtta değerlendirme akışı henüz net hazır görünmüyor.',
    nextBestAction: canEvaluate
      ? 'Önce hizmet satırını aç. Sonra Değerlendir ile kısa puan ve notu kaydet.'
      : 'Önce hizmetin operasyon durumu ve değerlendirme rozetini kontrol et. Gerekirse Hizmetleri aç ile bağlı kayda git.',
    safestNextStep: 'En risksiz adım, seçili hizmet satırında değerlendirme rozetini ve tarih bilgisini birlikte doğrulamaktır.',
    compareHint: 'Durum rozeti hizmetin operasyon halini, Değerlendirme rozeti puan verilebilir mi bilgisini gösterir.',
  };
}
