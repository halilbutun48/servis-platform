import { firstNonEmpty, makeAskAction, makeCopyAction, makeGuideAction, makeLinkedGuide, makeQuickAction, uniqueStrings } from './replyShapes.js';

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function ageMinutes(input) {
  if (!input) return null;
  const at = new Date(input).getTime();
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.round((Date.now() - at) / 60000));
}

function contextSummaryForRoleMode(roleMode, screenDefinition, entityLabel, scope, entityType) {
  if (roleMode === 'SIMPLE') {
    return entityType === 'screen' ? `Ekran: ${screenDefinition?.label || '-'}` : firstNonEmpty(entityLabel, screenDefinition?.label, scope?.summary, '');
  }
  return [
    screenDefinition?.label ? `Ekran: ${screenDefinition.label}` : null,
    entityLabel ? `Bağlam: ${entityLabel}` : null,
    scope?.summary || null,
  ].filter(Boolean).join(' • ');
}


function screenMenuActions(screenDefinition) {
  return (Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : []).map((item) => makeQuickAction(item.label, item.path, item.purpose));
}



function findMenu(screenDefinition, labels = [], paths = []) {
  const rows = Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : [];
  return rows.find((item) => {
    const label = normalizeText(item?.label || '');
    const path = normalizeText(item?.path || '');
    return labels.some((x) => label.includes(normalizeText(x))) || paths.some((x) => path.includes(normalizeText(x)));
  }) || null;
}


function currentScreenAction(screenDefinition, context, reason = '') {
  if (!screenDefinition?.path) return null;
  const routeParams = {};
  if (context?.type === 'shift' && context?.id) routeParams.focusShiftId = Number(context.id);
  if (context?.type === 'vehicle' && context?.id) routeParams.focusVehicleId = Number(context.id);
  return makeQuickAction(`${screenDefinition?.label || 'Bu ekran'} ekranını aç`, screenDefinition.path, reason || 'Aynı bağlamı açık ekranda sürdürür.', { routeParams, accent: 'primary' });
}


function menuAction(menu, context, reason = '', extras = {}) {
  if (!menu?.path) return null;
  const routeParams = { ...(extras?.routeParams && typeof extras.routeParams === 'object' ? extras.routeParams : {}) };
  if (context?.type === 'shift' && context?.id && !routeParams.focusShiftId) routeParams.focusShiftId = Number(context.id);
  if (context?.type === 'vehicle' && context?.id && !routeParams.focusVehicleId) routeParams.focusVehicleId = Number(context.id);
  return makeQuickAction(menu.label || 'Buradan aç', menu.path, reason || menu.purpose || '', { routeParams, accent: extras?.accent || 'neutral' });
}


function entityActionPlan({ entityType, context, screenDefinition, roleMode, questionType, reply }) {
  const rows = [];
  if (entityType === 'shift') {
    const shiftsMenu = findMenu(screenDefinition, ['vardiya'], ['/shifts']);
    const offersMenu = findMenu(screenDefinition, ['teklif', 'offer'], ['/offers']);
    const vehiclesMenu = findMenu(screenDefinition, ['araç', 'vehicle'], ['/vehicles']);
    const driversMenu = findMenu(screenDefinition, ['sürücü', 'driver'], ['/drivers']);
    const agreementsMenu = findMenu(screenDefinition, ['sözleşme', 'agreement'], ['/agreements']);
    rows.push(currentScreenAction(screenDefinition, context, 'Aynı konuşmayı seçili vardiya ile ekranda sürdürür.'));
    if (Number(context?.openOfferCount || 0) > 0 || ['GO_TO', 'WHY_BLOCKED'].includes(questionType)) rows.push(menuAction(offersMenu, context, 'Teklif kararını kapatmak için ilgili listeyi açar.', { accent: 'primary' }));
    if (!context?.vehicleId || questionType === 'NEXT_STEP') rows.push(menuAction(vehiclesMenu, context, 'Araç atamasını veya araç durumunu kontrol etmek için açılır.', { routeParams: context?.vehicleId ? { focusVehicleId: Number(context.vehicleId) } : {}, accent: 'primary' }));
    if (!context?.driverId || questionType === 'NEXT_STEP') rows.push(menuAction(driversMenu, context, 'Sürücü bağını netleştirmek için açılır.', { accent: 'warning' }));
    if (String(context?.agreementId || '') || questionType === 'GO_TO') rows.push(menuAction(agreementsMenu, context, 'Sözleşmeye bağlı akışı kontrol etmek için açılır.'));
    rows.push(makeGuideAction('Atamaya hazır mı rehberini aç', { jobType: 'ASSIGNMENT_READINESS_GUIDE', guideLevel: 'STEP_BY_STEP' }, 'Bu kayıt için eksikleri adım adım sıralar.'));
    rows.push(makeAskAction('Bunu sor: Bu kayıt ne durumda?', 'bu kayıt ne durumda', 'Aynı kayıt için hızlı takip sorusunu tekrar gönderir.'));
    rows.push(makeCopyAction('Kısa özet kopyala', reply, 'Son konuşma cevabını kopyalar.'));
  } else if (entityType === 'vehicle') {
    const vehiclesMenu = findMenu(screenDefinition, ['araç', 'vehicle'], ['/vehicles']);
    const mapMenu = findMenu(screenDefinition, ['canlı', 'harita', 'map'], ['/map', '/live']);
    const driversMenu = findMenu(screenDefinition, ['sürücü', 'driver'], ['/drivers']);
    rows.push(currentScreenAction(screenDefinition, context, 'Aynı aracı açık ekranda incelemek için açılır.'));
    rows.push(menuAction(vehiclesMenu, context, 'Araç detayına dönmek için açılır.', { accent: 'primary' }));
    if (!Number(context?.activeDeviceCount || 0) || ['GO_TO', 'WHY_BLOCKED', 'LOCATION_HELP'].includes(questionType)) rows.push(menuAction(mapMenu, context, 'Canlı konum tarafını tekrar görmek için açılır.', { accent: 'primary' }));
    if (!context?.driver?.id) rows.push(menuAction(driversMenu, context, 'Sürücü bağını netleştirmek için açılır.', { accent: 'warning' }));
    rows.push(makeGuideAction('Konum kaynağı rehberini aç', { jobType: 'LOCATION_SOURCE_GUIDE', guideLevel: 'SHORT' }, 'Telefon GPS\'i ve cihaz GPS\'i farkını açar.'));
    rows.push(makeGuideAction('GPS teşhis rehberini aç', { jobType: 'GPS_SIGNAL_DIAGNOSIS_GUIDE', guideLevel: 'WHY' }, 'Konum neden görünmüyor sorusuna odaklanır.'));
    rows.push(makeAskAction('Bunu sor: Konum neden görünmüyor?', 'konum neden görünmüyor', 'Aynı kayıt için hızlı teşhis sorusu gönderir.'));
    rows.push(makeCopyAction('Kısa özet kopyala', reply, 'Son konuşma cevabını kopyalar.'));
  } else {
    const menus = Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : [];
    rows.push(currentScreenAction(screenDefinition, context, roleMode === 'SIMPLE' ? 'Bu ekrana dönersin.' : 'Bu ekranı tekrar açar.'));
    for (const menu of menus.slice(0, roleMode === 'SIMPLE' ? 1 : 3)) rows.push(menuAction(menu, context, menu.purpose || 'İlgili menüye götürür.', { accent: roleMode === 'SIMPLE' && rows.length <= 1 ? 'primary' : 'neutral' }));
    if (roleMode === 'SIMPLE') {
      rows.push(makeAskAction('Bunu sor: Şimdi ne yapayım?', 'şimdi ne yapayım', 'Daha kısa yönlendirme alırsın.'));
    } else {
      rows.push(makeGuideAction('Ekran rehberini aç', { jobType: 'SCREEN_MENU_GUIDE', guideLevel: 'SHORT' }, 'Ekranın amacını kısa anlatır.'));
      rows.push(makeGuideAction('Buton rehberini aç', { jobType: 'BUTTON_ACTION_GUIDE', guideLevel: 'WHY' }, 'Butonların ne yaptığını sade dille açıklar.'));
      rows.push(makeCopyAction('Kısa özet kopyala', reply, 'Son konuşma cevabını kopyalar.'));
    }
  }
  return rows.filter(Boolean);
}


function nextPromptByEntity(entityType, roleMode) {
  if (entityType === 'shift') return roleMode === 'SIMPLE' ? 'İstersen bir sonraki adımı yine kısa söyleyeyim.' : 'İstersen şimdi hangi ekrana gitmen gerektiğini tek tek açayım.';
  if (entityType === 'vehicle') return roleMode === 'SIMPLE' ? 'İstersen konum tarafını daha kısa söyleyeyim.' : 'İstersen seni araç, canlı ekran veya rehbere yönlendireyim.';
  return roleMode === 'SIMPLE' ? 'Takıldığın sözü veya düğmeyi yaz.' : 'İstersen ilgili menüyü veya rehberi aşağıdan aç.';
}


function guideLinksForEntity(entityType) {
  if (String(entityType) === 'vehicle') {
    return [
      makeLinkedGuide('LOCATION_SOURCE_GUIDE', 'Konum kaynağı rehberini aç', 'SHORT', 'Telefon GPS\'i ve cihaz GPS\'i farkını açar.'),
      makeLinkedGuide('GPS_SIGNAL_DIAGNOSIS_GUIDE', 'GPS sinyal teşhisini aç', 'WHY', 'Konum neden görünmüyor sorusuna odaklanır.'),
      makeLinkedGuide('VEHICLE_DRIVER_BIND', 'Araç-sürücü bağlama rehberini aç', 'STEP_BY_STEP', 'Bağlama adımlarını sade dille gösterir.'),
    ];
  }
  if (String(entityType) === 'shift') {
    return [
      makeLinkedGuide('OFFER_REVIEW', 'Teklifi inceleme rehberini aç', 'SHORT', 'Kayıt özetini rehber modunda açar.'),
      makeLinkedGuide('OFFER_APPROVAL', 'Teklifi onaylama rehberini aç', 'WHY', 'Onay öncesi dikkat noktalarını açar.'),
      makeLinkedGuide('ASSIGNMENT_READINESS_GUIDE', 'Atamaya hazır mı rehberini aç', 'STEP_BY_STEP', 'Hazırlık eksiklerini sıralar.'),
    ];
  }
  return [
    makeLinkedGuide('SCREEN_MENU_GUIDE', 'Ekran rehberini aç', 'SHORT', 'Bu ekranın amacını açar.'),
    makeLinkedGuide('BUTTON_ACTION_GUIDE', 'Buton rehberini aç', 'WHY', 'Bu ekrandaki butonları açıklar.'),
    makeLinkedGuide('ROLE_HELP_GUIDE', 'Rol yardımını aç', 'SHORT', 'Bu rolde nereye gideceğini gösterir.'),
  ];
}


function shiftStatusText(context) {
  return `Bu vardiya ${context?.status || '-'} durumda. Araç: ${context?.vehicle?.plate || 'yok'}. Sürücü: ${context?.driver?.fullName || 'yok'}. Durak: ${Number(context?.stopCount || 0)}. Açık teklif: ${Number(context?.openOfferCount || 0)}.`;
}


function shiftBlockers(context) {
  const items = [];
  if (!context?.vehicleId) items.push('Araç ataması görünmüyor.');
  if (!context?.driverId) items.push('Sürücü ataması görünmüyor.');
  if (!Number(context?.stopCount || 0)) items.push('Durak verisi görünmüyor.');
  if (String(context?.status || '') === 'APPROVED' && !context?.roomId) items.push('Onaylı işte oda ataması görünmüyor.');
  if (Number(context?.openOfferCount || 0) > 0 && !context?.roomOfferDecision) items.push('Teklif kararı net görünmüyor.');
  return uniqueStrings(items);
}


function shiftNextStep(context) {
  const blockers = shiftBlockers(context);
  if (blockers[0]) return blockers[0].replace('.', '') + ' Önce bunu tamamla.';
  if (Number(context?.openOfferCount || 0) > 0) return 'Önce teklif kararını netleştir. Sonra araç ve sürücüyü tekrar kontrol et.';
  if (String(context?.status || '') === 'REQUESTED') return 'Önce uygun teklif veya atama hattını aç. Sonra işin bağlı olacağı odayı netleştir.';
  return 'Önce araç, sürücü ve durak bilgisini birlikte kontrol et. Sonra ilgili ekrandan ilerle.';
}


function vehicleSourceText(context) {
  const hasDevice = Number(context?.activeDeviceCount || 0) > 0;
  const hasDriver = Number(context?.driver?.id || 0) > 0;
  const lastUi = String(context?.gpsState?.lastUiStatus || 'UNKNOWN');
  const age = ageMinutes(context?.gpsLast?.at);
  const lastPart = age == null ? 'Son konum zamanı görünmüyor.' : `Son konum yaklaşık ${age} dakika önce geldi.`;
  if (hasDevice && hasDriver) return `Bu araçta hem cihaz GPS'i kaydı hem de sürücü bağı görünüyor. Ana kaynak kullanımına göre ikisi de devreye girebilir. ${lastPart} UI durumu: ${lastUi}.`;
  if (hasDevice) return `Bu araçta aktif cihaz GPS'i görünüyor. Sürücü bağı ${hasDriver ? 'de var' : 'görünmüyor'}. ${lastPart} UI durumu: ${lastUi}.`;
  if (hasDriver) return `Bu araçta sürücünün telefon GPS'i tarafı için sürücü bağı görünüyor. Aktif cihaz GPS'i görünmüyor. ${lastPart} UI durumu: ${lastUi}.`;
  return `Bu araçta şu an ne aktif cihaz GPS'i ne de sürücü bağı net görünüyor. ${lastPart}`;
}


function vehicleBlockers(context) {
  const items = [];
  if (!Number(context?.activeDeviceCount || 0) && !context?.driver?.id) items.push('Konum verecek kaynak net görünmüyor.');
  if (!Number(context?.activeDeviceCount || 0)) items.push("Aktif cihaz GPS'i görünmüyor.");
  if (!context?.gpsLast?.at) items.push('Son GPS zamanı görünmüyor.');
  if (!context?.driver?.id) items.push('Sürücü bağı görünmüyor.');
  if (String(context?.gpsState?.lastUiStatus || '') === 'STALE') items.push('Konum verisi eski görünüyor.');
  return uniqueStrings(items);
}


function vehicleNextStep(context) {
  const blockers = vehicleBlockers(context);
  if (blockers[0]) return blockers[0].replace('.', '') + ' Önce bunu düzelt.';
  if (Number(context?.activeDeviceCount || 0) > 0) return 'Önce cihaz GPS\'i son sinyalini kontrol et. Sonra canlı ekrandan tekrar bak.';
  return "Önce sürücü bağını ve konum kaynağını kontrol et. Sonra canlı konum ekranına dön.";
}



function shiftReadinessReply(context) {
  const blockers = shiftBlockers(context);
  const ready = blockers.length === 0 && Number(context?.openOfferCount || 0) === 0 && Boolean(context?.vehicleId) && Boolean(context?.driverId);
  const score = ready ? 92 : blockers.length ? 46 : 72;
  const label = ready ? 'hazır' : blockers.length ? 'hazır değil' : 'kontrollü ilerlemeli';
  return `${shiftStatusText(context)} Bu kayıt şu an ${label} (${score}/100). ${blockers[0] ? `Ana blokaj: ${blockers[0]}` : 'Kritik eksik görünmüyor.'} Şimdi yap: ${shiftNextStep(context)}`.trim();
}


function shiftMissingDataReply(context) {
  const blockers = shiftBlockers(context);
  if (!blockers.length) return `${shiftStatusText(context)} Belirgin eksik görünmüyor. Şimdi yap: ${shiftNextStep(context)}`.trim();
  const more = blockers.slice(1, 3);
  return `Ana blokaj: ${blockers[0]} ${more.length ? `Diğer dikkatler: ${more.join(' • ')}` : ''} Şimdi yap: ${shiftNextStep(context)}`.trim();
}


function vehicleReadinessReply(context) {
  const blockers = vehicleBlockers(context);
  const ready = blockers.length === 0;
  const score = ready ? 88 : 44;
  return `${vehicleSourceText(context)} Bu kayıt şu an ${ready ? 'hazır' : 'hazır değil'} (${score}/100). ${blockers[0] ? `Ana blokaj: ${blockers[0]}` : 'Kritik eksik görünmüyor.'} Şimdi yap: ${vehicleNextStep(context)}`.trim();
}


function vehicleMissingDataReply(context) {
  const blockers = vehicleBlockers(context);
  if (!blockers.length) return `${vehicleSourceText(context)} Belirgin eksik görünmüyor. Şimdi yap: ${vehicleNextStep(context)}`.trim();
  const more = blockers.slice(1, 3);
  return `Ana blokaj: ${blockers[0]} ${more.length ? `Diğer dikkatler: ${more.join(' • ')}` : ''} Şimdi yap: ${vehicleNextStep(context)}`.trim();
}


function termComparisonReply(message) {
  const text = normalizeText(message);
  const hasLog = /log|audit|işlem kaydı|islem kaydi/.test(text);
  const hasNotification = /bildirim|notification/.test(text);
  const hasInvite = /giriş daveti|giris daveti|hesap daveti|invite/.test(text);
  const hasAccessLink = /erişim linki|erisim linki|access link|personel link|öğrenci linki|ogrenci linki|veli linki|student link/.test(text);
  const hasParentAccess = /veli erişimi|veli erisimi|parent access/.test(text);
  const hasInbound = /inbound|toplama yönü|toplama yonu/.test(text);
  const hasOutbound = /outbound|dağıtım yönü|dagitim yonu|bırakma yönü|birakma yonu/.test(text);
  const hasOsrm = /osrm|yol hesabı|rota hesabı/.test(text);
  const hasMatrix = /matrix|matris|süre tablosu|sure tablosu/.test(text);
  const asksDiff = /aynı şey mi|ayni sey mi|farkı ne|farki ne/.test(text);
  if (asksDiff && hasLog && hasNotification) return 'Aynı şey değil. Bildirim kullanıcıya giden uyarıdır. İşlem kaydı ise sistemde ne olduğunun kayıt altına alınmış halidir.';
  if (asksDiff && ((hasInvite && hasAccessLink) || (hasParentAccess && hasAccessLink))) return 'Aynı şey değil. Eski giriş daveti akışı kaldırıldı. Yeni yapıda okul Veli Erişimi üretir; erişim linki, erişim kodu ve PIN aynı süre boyunca kullanılabilir.';
  if (asksDiff && hasInbound && hasOutbound) return "Aynı yön değil. Inbound toplama yönüdür; personeli merkeze veya hub'a getirir. Outbound ise hub'dan çıkıp personeli bırakma yönüdür.";
  if ((hasOsrm && hasMatrix) || (asksDiff && (hasOsrm || hasMatrix))) return 'OSRM yol ve süre hesabı yapan servistir. Matrix ise birden çok nokta için toplu süre ve mesafe tablosudur.';
  return '';
}



function analyzerEvidenceText(analysis) {
  const rows = Array.isArray(analysis?.evidence) ? analysis.evidence.slice(0, 3) : [];
  return rows.length ? `Bunu şuradan anlıyorum: ${rows.join(' • ')}.` : '';
}


function analyzerReadinessLabel(analysis) {
  const val = String(analysis?.readiness || 'REVIEW_NEEDED');
  const score = Number(analysis?.readinessScore || Math.round(Number(analysis?.healthScore || 0.72) * 100));
  if (val === 'READY') return `hazır (${score}/100)`;
  if (val === 'NOT_READY') return `hazır değil (${score}/100)`;
  return `kontrollü ilerlemeli (${score}/100)`;
}


function analyzerReply(analysis, mode = 'DIAGNOSIS') {
  if (!analysis) return '';
  const lead = firstNonEmpty(analysis.reasoningLead, 'Bu kayıtta önce seçili veriyi net okumak gerekiyor.');
  const evidence = analyzerEvidenceText(analysis);
  const blocker = analysis?.blockers?.[0] ? `Ana blokaj: ${analysis.blockers[0]}` : '';
  const missing = analysis?.missingData?.[0] ? `Eksik veri: ${analysis.missingData[0]}` : '';
  const disabled = analysis?.disabledHints?.[0] ? `Pasif buton ipucu: ${analysis.disabledHints[0]}` : '';
  const next = analysis?.nextBestAction ? `Şimdi yap: ${analysis.nextBestAction}` : '';
  const safest = analysis?.safestNextStep ? `En risksiz adım: ${analysis.safestNextStep}` : '';
  const changed = analysis?.changedHint ? `Not: ${analysis.changedHint}` : '';
  if (mode === 'READINESS') return `${lead} Bu kayıt şu an ${analyzerReadinessLabel(analysis)}. ${blocker || missing || disabled} ${evidence} ${next}`.trim();
  if (mode === 'SAFE_NEXT') return `${lead} ${evidence} ${safest || next}`.trim();
  if (mode === 'MISSING') return `${lead} ${missing || blocker || disabled || 'Belirgin eksik veri görünmüyor.'} ${evidence} ${next}`.trim();
  if (mode === 'CHANGED') return `${lead} ${changed || 'Ekranda gerçekten neyin değiştiğini anlamak için aynı satırın durum, rozet ve sonraki adım alanlarını birlikte karşılaştır.'} ${evidence}`.trim();
  if (mode === 'COMPARE') return `${analysis?.compareHint || lead} ${evidence}`.trim();
  if (mode === 'EVIDENCE') return `${evidence || 'Bu yorum seçili alan, rozet ve ekrandaki görünen ipuçlarına dayanıyor.'} ${disabled}`.trim();
  if (mode === 'SHORT') return `${lead} ${blocker || missing || disabled || ''} ${next}`.trim();
  return `${lead} ${blocker} ${missing} ${disabled} ${evidence} ${next}`.trim();
}


export {
  contextSummaryForRoleMode,
  screenMenuActions,
  findMenu,
  currentScreenAction,
  menuAction,
  entityActionPlan,
  nextPromptByEntity,
  guideLinksForEntity,
  shiftStatusText,
  shiftBlockers,
  shiftNextStep,
  vehicleSourceText,
  vehicleBlockers,
  vehicleNextStep,
  shiftReadinessReply,
  shiftMissingDataReply,
  vehicleReadinessReply,
  vehicleMissingDataReply,
  termComparisonReply,
  analyzerEvidenceText,
  analyzerReadinessLabel,
  analyzerReply
};
