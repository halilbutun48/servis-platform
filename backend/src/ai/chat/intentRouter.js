function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function hasAny(text, patterns) {
  const value = normalizeText(text);
  return (Array.isArray(patterns) ? patterns : []).some((p) => value.includes(normalizeText(p)));
}

function pathHas(path, parts) {
  const value = normalizeText(path);
  return (Array.isArray(parts) ? parts : []).some((p) => value.includes(normalizeText(p)));
}

export function detectQuestionType(message, entityType = 'screen') {
  const text = normalizeText(message);
  if (!text) return 'OPEN';
  if (hasAny(text, ['bu rolde', 'ne yapabilirim', 'rolümde', 'rolumde'])) return 'ROLE_HELP';
  if (hasAny(text, ['ne durumda', 'durumu ne', 'kayıt ne durumda', 'kayit ne durumda', 'durum'])) return 'STATUS_HELP';
  if (hasAny(text, ['ne demek', 'anlamı', 'anlami', 'bu ne demek', 'aynı şey mi', 'ayni sey mi', 'farkı ne', 'farki ne'])) return 'TERM_HELP';
  if (hasAny(text, ['götür', 'gotur', 'aç', 'ac', 'git', 'kısmına', 'kismina'])) return 'GO_TO';
  if (hasAny(text, ['neden kapalı', 'neden kapali', 'kapalı', 'kapali', 'devam edemiyorum', 'neden olmuyor', 'neden görünmüyor', 'neden gorunmuyor'])) return 'WHY_BLOCKED';
  if (hasAny(text, ['buton', 'düğme', 'dugme', 'menü', 'menu'])) return 'BUTTON_HELP';
  if (hasAny(text, ['konum', 'gps', 'telefon gps', "telefon gps'i", 'cihaz gps', 'konum kaynağı', 'konum kaynagi'])) return 'LOCATION_HELP';
  if (hasAny(text, ['şimdi ne yapayım', 'simdi ne yapayim', 'şimdi ne yapacağım', 'simdi ne yapacagim', 'nasıl yaparım', 'nasil yaparim', 'adım adım', 'adim adim', 'nasıl', 'nasil'])) return 'NEXT_STEP';
  if (hasAny(text, ['bu ekran', 'ne için', 'ne ise yar', 'ne işe yar', 'ekran'])) return 'SCREEN_PURPOSE';
  if (String(entityType || '') === 'vehicle') return 'LOCATION_HELP';
  if (String(entityType || '') === 'shift') return 'STATUS_HELP';
  return 'SCREEN_PURPOSE';
}

export function resolveReplyMode(message, questionType, roleMode = 'OPERATIONS') {
  const text = normalizeText(message);
  if (hasAny(text, ['adım adım', 'adim adim'])) return 'STEP_BY_STEP';
  if (questionType === 'WHY_BLOCKED' || hasAny(text, ['neden'])) return 'WHY';
  if (roleMode === 'SIMPLE' && questionType !== 'TERM_HELP') return 'SHORT';
  return 'SHORT';
}

export function selectGuideJobType({ entityType = 'screen', questionType = 'OPEN', message = '', screenPath = '' }) {
  const text = normalizeText(message);
  if (String(entityType) === 'vehicle') {
    if (hasAny(text, ['bağla', 'bagla', 'sürücü', 'surucu'])) return 'VEHICLE_DRIVER_BIND';
    if (hasAny(text, ['görünmüyor', 'gorunmuyor', 'sinyal', 'gecik'])) return 'GPS_SIGNAL_DIAGNOSIS_GUIDE';
    if (hasAny(text, ['cihaz', 'telematics'])) return 'TELEMATICS_DEVICE_CREATE';
    return 'LOCATION_SOURCE_GUIDE';
  }
  if (String(entityType) === 'shift') {
    if (hasAny(text, ['onay', 'teklif'])) return 'OFFER_APPROVAL';
    if (hasAny(text, ['hazır', 'hazir', 'atama'])) return 'ASSIGNMENT_READINESS_GUIDE';
    return 'OFFER_REVIEW';
  }
  if (questionType === 'ROLE_HELP') return 'ROLE_HELP_GUIDE';
  if (questionType === 'BUTTON_HELP' || questionType === 'WHY_BLOCKED') return 'BUTTON_ACTION_GUIDE';
  if (pathHas(screenPath, ['/map', '/live'])) return 'BUTTON_ACTION_GUIDE';
  return 'SCREEN_MENU_GUIDE';
}

function simpleScreenChipsByPath(screenPath = '') {
  if (pathHas(screenPath, ['/hub'])) {
    return ['Hub ne demek?', 'Inbound ne demek?', 'Outbound ne demek?', 'Şimdi ne yapayım?'];
  }
  if (pathHas(screenPath, ['/auth-invites'])) {
    return ['Giriş daveti ne demek?', 'Erişim linki ile farkı ne?', 'Bu ekran ne için var?', 'Şimdi ne yapayım?'];
  }
  if (pathHas(screenPath, ['/georeview'])) {
    return ['Konum İncele ne demek?', 'OSRM nedir?', 'Matrix nedir?', 'Şimdi ne yapayım?'];
  }
  if (pathHas(screenPath, ['/notifications'])) {
    return ['Bildirim ne demek?', 'Log ile farkı ne?', 'Bu ekran ne için var?', 'Şimdi ne yapayım?'];
  }
  if (pathHas(screenPath, ['/logs'])) {
    return ['İşlem kaydı ne demek?', 'Bildirimle farkı ne?', 'Bu ekran ne için var?', 'Şimdi ne yapayım?'];
  }
  if (pathHas(screenPath, ['/checkin'])) {
    return ['Check-in ne demek?', 'Bu ekran ne için var?', 'Şimdi ne yapayım?', 'Bu rolde ne yapabilirim?'];
  }
  if (pathHas(screenPath, ['/today', '/live', '/my', '/route', '/map'])) {
    return ['Bu ekran ne için var?', 'Şimdi ne yapayım?', 'Bu ne demek?', 'Bu rolde ne yapabilirim?'];
  }
  return ['Bu ekran ne için var?', 'Şimdi ne yapayım?', 'Bu buton ne yapar?', 'Bu rolde ne yapabilirim?'];
}

function screenChipsByPath(screenPath = '', roleMode = 'OPERATIONS') {
  const chips = [];
  if (pathHas(screenPath, ['/offers'])) {
    chips.push('Bu ekran ne için var?', 'Teklifi nasıl incelerim?', 'Neden kapalı?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/agreements'])) {
    chips.push('Sözleşme burada ne işe yarıyor?', 'Şimdi ne yapacağım?', 'Neden kapalı?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/hub'])) {
    chips.push('Hub ne demek?', 'Inbound ne demek?', 'Outbound ne demek?', 'Bu ekran ne için var?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/auth-invites'])) {
    chips.push('Giriş daveti ne için kullanılır?', 'Erişim linki ile farkı ne?', 'Bu ekran ne için var?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/georeview'])) {
    chips.push('Konum İncele ekranı ne için var?', 'Geo Review gerekli ne demek?', 'OSRM nedir?', 'Matrix nedir?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/notifications'])) {
    chips.push('Bildirim ne demek?', 'Log ile farkı ne?', 'Bu ekran ne için var?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/logs'])) {
    chips.push('İşlem kaydı ne demek?', 'Bildirimle farkı ne?', 'Bu ekran ne için var?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/checkin'])) {
    chips.push('Check-in ne demek?', 'Bu ekran ne için var?', 'Şimdi ne yapacağım?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/vehicles', '/map'])) {
    chips.push('Konum neden görünmüyor?', "Bu araçta sürücünün telefon GPS'i mi cihaz GPS'i mi var?", 'Şimdi ne yapacağım?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/today', '/live'])) {
    chips.push('Bu ekran ne için var?', 'Şimdi ne yapayım?', 'Bu ne demek?', 'İlgili yere götür');
  } else {
    chips.push('Bu ekran ne için var?', 'Bu buton ne yapar?', 'Neden kapalı?', 'Şimdi ne yapacağım?', 'İlgili yere götür');
  }

  if (roleMode === 'SIMPLE') {
    return Array.from(new Set(simpleScreenChipsByPath(screenPath))).slice(0, 4);
  }

  return Array.from(new Set(chips.concat(['Bu rolde ne yapabilirim?']))).slice(0, 6);
}

export function buildSuggestedChips({ entityType = 'screen', questionType = 'OPEN', roleMode = 'OPERATIONS', screenPath = '', context = null }) {
  const base = [];
  if (String(entityType) === 'vehicle') {
    base.push('Bu araçta ne eksik?', 'Konum neden görünmüyor?', "Bu araçta sürücünün telefon GPS'i mi cihaz GPS'i mi var?", 'Sürücüyü nasıl bağlarım?', 'Şimdi ne yapacağım?');
  } else if (String(entityType) === 'shift') {
    base.push('Bu kayıt ne durumda?', 'Atamaya hazır mı?', 'Neden devam edemiyorum?', 'Şimdi ne yapacağım?', 'İlgili yere götür');
    if (Number(context?.openOfferCount || 0) > 0) base.unshift('Teklif tarafında ne eksik?');
  } else {
    return screenChipsByPath(screenPath, roleMode);
  }

  if (roleMode === 'SIMPLE') {
    return Array.from(new Set(base.concat(['Bu rolde ne yapabilirim?']))).slice(0, 4);
  }

  if (questionType !== 'ROLE_HELP') base.push('Bu rolde ne yapabilirim?');
  return Array.from(new Set(base)).slice(0, 6);
}