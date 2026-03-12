function item(label, status, detail) {
  return { label, status, detail };
}

function summarizeState(beforeYouStart, canProceed) {
  const items = Array.isArray(beforeYouStart) ? beforeYouStart : [];
  const hasMissing = items.some((x) => String(x?.status || '') === 'MISSING');
  const hasWarn = items.some((x) => String(x?.status || '') === 'WARN');
  if (!canProceed || hasMissing) {
    return {
      precheckState: 'BLOCKED',
      precheckLabel: 'Bu yüzden devam edemezsin',
    };
  }
  if (hasWarn) {
    return {
      precheckState: 'NEEDS_ATTENTION',
      precheckLabel: 'Eksik var',
    };
  }
  return {
    precheckState: 'READY',
    precheckLabel: 'Hazır',
  };
}

function shiftBaseChecks(context) {
  const hasVehicle = !!context?.vehicleId;
  const hasDriver = !!context?.driverId;
  const hasStops = Number(context?.stopCount || 0) > 0;
  return {
    hasVehicle,
    hasDriver,
    hasStops,
    items: [
      item('Araç bilgisi var mı?', hasVehicle ? 'OK' : 'MISSING', hasVehicle ? 'Araç seçili görünüyor.' : 'Önce araç seçilmesi gerekiyor.'),
      item('Sürücü bilgisi var mı?', hasDriver ? 'OK' : 'MISSING', hasDriver ? 'Sürücü bağlı görünüyor.' : 'Önce sürücü bağlanması gerekiyor.'),
      item('Durak bilgisi var mı?', hasStops ? 'OK' : 'MISSING', hasStops ? `Durak sayısı: ${Number(context?.stopCount || 0)}.` : 'Önce durak bilgisi oluşturulmalı.'),
    ],
  };
}

function buildOfferReviewPrecheck(context) {
  const openOfferCount = Number(context?.openOfferCount || 0);
  const checks = shiftBaseChecks(context);
  const beforeYouStart = [
    item('Aktif teklif var mı?', openOfferCount > 0 ? 'OK' : 'WARN', openOfferCount > 0 ? `Açık teklif sayısı: ${openOfferCount}.` : 'Açık teklif görünmüyor; önce kayıt durumunu kontrol et.'),
    ...checks.items,
  ];
  const whyBlocked = [];
  const lockedActionReasons = [];
  if (openOfferCount <= 0) {
    whyBlocked.push('Aktif teklif görünmediği için karar adımı zayıf görünüyor.');
    lockedActionReasons.push({ action: 'Karar ver', reason: 'Önce aktif teklif veya kayıt durumu doğrulanmalı.' });
  }
  const canProceed = openOfferCount > 0;
  return { beforeYouStart, canProceed, whyBlocked, lockedActionReasons, ...summarizeState(beforeYouStart, canProceed) };
}

function buildOfferApprovalPrecheck(context) {
  const checks = shiftBaseChecks(context);
  const pendingDecision = String(context?.roomOfferDecision || '') === 'PENDING';
  const beforeYouStart = [
    ...checks.items,
    item('Bekleyen karar var mı?', pendingDecision ? 'OK' : 'WARN', pendingDecision ? 'Bekleyen karar görünüyor.' : 'Bekleyen karar görünmüyor; kayıt durumunu tekrar kontrol et.'),
  ];
  const whyBlocked = [];
  const lockedActionReasons = [];
  if (!checks.hasVehicle) {
    whyBlocked.push('Araç eksik olduğu için onay adımı güvenli değil.');
    lockedActionReasons.push({ action: 'Onay ver', reason: 'Önce uygun araç seçilmelidir.' });
  }
  if (!checks.hasDriver) {
    whyBlocked.push('Sürücü eksik olduğu için onay adımı güvenli değil.');
    lockedActionReasons.push({ action: 'Onay ver', reason: 'Önce sürücü bağlanmalıdır.' });
  }
  if (!checks.hasStops) {
    whyBlocked.push('Durak bilgisi eksik olduğu için işin akışı tamam görünmüyor.');
    lockedActionReasons.push({ action: 'Onay ver', reason: 'Önce durak bilgisi tamamlanmalıdır.' });
  }
  const canProceed = checks.hasVehicle && checks.hasDriver && checks.hasStops;
  return { beforeYouStart, canProceed, whyBlocked, lockedActionReasons, ...summarizeState(beforeYouStart, canProceed) };
}

function buildAssignmentReadinessPrecheck(context) {
  const checks = shiftBaseChecks(context);
  const peopleCount = Number(context?.peopleCount || 0);
  const assignmentCount = Number(context?.assignmentCount || 0);
  const beforeYouStart = [
    ...checks.items,
    item('Atama sayısı yeterli mi?', assignmentCount > 0 ? 'OK' : 'WARN', `Atama sayısı: ${assignmentCount}, personel sayısı: ${peopleCount}.`),
  ];
  const whyBlocked = [];
  const lockedActionReasons = [];
  if (!checks.hasVehicle || !checks.hasDriver || !checks.hasStops) {
    whyBlocked.push('Araç, sürücü ve durak tam olmadan atamaya hazır görünmez.');
    lockedActionReasons.push({ action: 'Atamaya geç', reason: 'Önce araç, sürücü ve durak bilgisi tamamlanmalıdır.' });
  }
  const canProceed = checks.hasVehicle && checks.hasDriver && checks.hasStops;
  return { beforeYouStart, canProceed, whyBlocked, lockedActionReasons, ...summarizeState(beforeYouStart, canProceed) };
}


function vehicleLocationChecks(context) {
  const hasDriver = !!context?.driver?.id;
  const activeDeviceCount = Number(context?.activeDeviceCount || 0);
  const hasGpsLast = !!context?.gpsLast?.at;
  const activeShiftCount = Number((context?.currentShiftIds || []).length || 0);
  return {
    hasDriver,
    activeDeviceCount,
    hasGpsLast,
    activeShiftCount,
    items: [
      item("Araç seçili mi?", context?.id ? "OK" : "MISSING", context?.id ? `Araç ID: ${context.id}.` : "Önce araç seçilmelidir."),
      item("Sürücünün telefon GPS'i için bağlı sürücü var mı?", hasDriver ? "OK" : "WARN", hasDriver ? "Bağlı sürücü görünüyor." : "Bağlı sürücü görünmüyor; telefon GPS'i hattı zayıf kalabilir."),
      item("Cihaz GPS'i aktif mi?", activeDeviceCount > 0 ? "OK" : "WARN", activeDeviceCount > 0 ? `Aktif cihaz sayısı: ${activeDeviceCount}.` : "Aktif cihaz GPS'i görünmüyor."),
      item("Son konum zamanı var mı?", hasGpsLast ? "OK" : "WARN", hasGpsLast ? "Son konum zamanı görünüyor." : "Son konum zamanı görünmüyor."),
      item("Aktif iş var mı?", activeShiftCount > 0 ? "WARN" : "OK", activeShiftCount > 0 ? `Aktif iş sayısı: ${activeShiftCount}.` : "Aktif iş görünmüyor."),
    ],
  };
}

function buildTelematicsDeviceCreatePrecheck(context) {
  const checks = vehicleLocationChecks(context);
  const beforeYouStart = checks.items;
  const whyBlocked = [];
  const lockedActionReasons = [];
  if (!context?.id) {
    whyBlocked.push("Araç seçilmeden cihaz GPS'i ekleme adımı tamamlanamaz.");
    lockedActionReasons.push({ action: "Cihaz kaydı aç", reason: "Önce araç seçilmelidir." });
  }
  const canProceed = !!context?.id;
  return { beforeYouStart, canProceed, whyBlocked, lockedActionReasons, ...summarizeState(beforeYouStart, canProceed) };
}

function buildLocationSourceGuidePrecheck(context) {
  const checks = vehicleLocationChecks(context);
  const beforeYouStart = checks.items;
  const whyBlocked = [];
  const lockedActionReasons = [];
  if (!context?.id) {
    whyBlocked.push("Araç seçilmeden konum kaynağı netleştirilemez.");
    lockedActionReasons.push({ action: "Kaynağı incele", reason: "Önce araç seçilmelidir." });
  }
  const canProceed = !!context?.id;
  return { beforeYouStart, canProceed, whyBlocked, lockedActionReasons, ...summarizeState(beforeYouStart, canProceed) };
}

function buildGpsSignalDiagnosisGuidePrecheck(context) {
  const checks = vehicleLocationChecks(context);
  const beforeYouStart = checks.items;
  const whyBlocked = [];
  const lockedActionReasons = [];
  if (!context?.id) {
    whyBlocked.push("Araç seçilmeden GPS sinyal teşhisi yapılamaz.");
    lockedActionReasons.push({ action: "Teşhisi çalıştır", reason: "Önce araç seçilmelidir." });
  }
  const canProceed = !!context?.id;
  return { beforeYouStart, canProceed, whyBlocked, lockedActionReasons, ...summarizeState(beforeYouStart, canProceed) };
}

function buildVehicleDriverBindPrecheck(context) {
  const hasDriver = !!context?.driver?.id;
  const activeShiftCount = Number((context?.currentShiftIds || []).length || 0);
  const activeDeviceCount = Number(context?.activeDeviceCount || 0);
  const beforeYouStart = [
    item('Araç seçili mi?', context?.id ? 'OK' : 'MISSING', context?.id ? `Araç ID: ${context.id}.` : 'Önce araç seçilmeli.'),
    item('Bağlı sürücü var mı?', hasDriver ? 'OK' : 'WARN', hasDriver ? 'Araçta bağlı sürücü görünüyor.' : 'Bağ yapılacak sürücü henüz görünmüyor.'),
    item('Aktif iş var mı?', activeShiftCount > 0 ? 'WARN' : 'OK', activeShiftCount > 0 ? `Aktif iş sayısı: ${activeShiftCount}.` : 'Aktif iş görünmüyor.'),
    item("Cihaz GPS'i var mı?", activeDeviceCount > 0 ? "OK" : "WARN", activeDeviceCount > 0 ? `Aktif cihaz sayısı: ${activeDeviceCount}.` : "Aktif cihaz GPS'i görünmüyor."),
  ];
  const whyBlocked = [];
  const lockedActionReasons = [];
  if (!context?.id) {
    whyBlocked.push('Araç seçilmeden bağlama adımı yapılamaz.');
    lockedActionReasons.push({ action: 'Bağlantıyı kaydet', reason: 'Önce araç seçilmelidir.' });
  }
  const canProceed = !!context?.id;
  return { beforeYouStart, canProceed, whyBlocked, lockedActionReasons, ...summarizeState(beforeYouStart, canProceed) };
}


function buildScreenGuidePrecheck(jobType, context) {
  const hasScreen = !!context?.path;
  const hasButtons = Array.isArray(context?.buttonGuides) && context.buttonGuides.length > 0;
  const hasMenus = Array.isArray(context?.screenMenus) && context.screenMenus.length > 0;
  const beforeYouStart = [
    item('Doğru ekran seçildi mi?', hasScreen ? 'OK' : 'MISSING', hasScreen ? `${context?.label || 'Ekran'} seçili.` : 'Önce açıklanacak ekran seçilmelidir.'),
    item('Bu ekran senin rolüne uygun mu?', hasScreen ? 'OK' : 'MISSING', hasScreen ? `${context?.roleLabel || context?.roleKey || 'Rol'} için uygun ekran görünüyor.` : 'Rolüne uygun ekran seçilmelidir.'),
    item('Ana buton açıklamaları var mı?', hasButtons ? 'OK' : 'WARN', hasButtons ? `Açıklanan buton sayısı: ${context.buttonGuides.length}.` : 'Bu ekranda belirgin ana buton açıklaması az görünüyor.'),
    item('İlgili menüler listelenmiş mi?', hasMenus ? 'OK' : 'WARN', hasMenus ? `İlgili menü sayısı: ${context.screenMenus.length}.` : 'Yardımcı menü listesi kısa görünüyor.'),
  ];
  const canProceed = hasScreen;
  const whyBlocked = hasScreen ? [] : ['Doğru ekran seçilmeden ekran rehberi üretilemez.'];
  const lockedActionReasons = hasScreen ? [] : [{ action: 'Rehberi aç', reason: 'Önce doğru ekran seçilmelidir.' }];
  return { beforeYouStart, canProceed, whyBlocked, lockedActionReasons, ...summarizeState(beforeYouStart, canProceed) };
}

export function buildJobPrecheck({ jobType, context }) {
  const key = String(jobType || '');
  if (key === 'OFFER_REVIEW') return buildOfferReviewPrecheck(context);
  if (key === 'OFFER_APPROVAL') return buildOfferApprovalPrecheck(context);
  if (key === 'ASSIGNMENT_READINESS_GUIDE') return buildAssignmentReadinessPrecheck(context);
  if (key === 'VEHICLE_DRIVER_BIND') return buildVehicleDriverBindPrecheck(context);
  if (key === 'TELEMATICS_DEVICE_CREATE') return buildTelematicsDeviceCreatePrecheck(context);
  if (key === 'LOCATION_SOURCE_GUIDE') return buildLocationSourceGuidePrecheck(context);
  if (key === 'GPS_SIGNAL_DIAGNOSIS_GUIDE') return buildGpsSignalDiagnosisGuidePrecheck(context);
  if (key === 'SCREEN_MENU_GUIDE' || key === 'BUTTON_ACTION_GUIDE' || key === 'ROLE_HELP_GUIDE') return buildScreenGuidePrecheck(key, context);
  return { beforeYouStart: [], canProceed: true, whyBlocked: [], lockedActionReasons: [], precheckState: 'READY', precheckLabel: 'Hazır' };
}

// M46.6-B precheck label: Başlamadan önce kontrol

