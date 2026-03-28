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

function isDirectScreenSteer(text) {
  const value = normalizeText(text);
  if (!value) return false;
  const steerWords = ['doğrudan', 'dogrudan', 'direkt', 'direk', 'sapma olmadan', 'hedef ekran', 'yanlış hedef', 'yanlis hedef'];
  const screenWords = ['vardiya', 'konum', 'lokasyon', 'ticari', 'hizmet', 'planlama', 'merkez', 'harita', 'copilot', 'hub', 'sözleşme', 'sozlesme'];
  return hasAny(value, steerWords) && hasAny(value, screenWords);
}

export function detectQuestionType(message, entityType = 'screen') {
  const text = normalizeText(message);
  if (!text) return 'OPEN';
  if (hasAny(text, ['bu rolde', 'ne yapabilirim', 'rolümde', 'rolumde'])) return 'ROLE_HELP';
  if (hasAny(text, ['kontrol listesi', 'checklist', 'tek tek kontrol', 'kontrol etmem gerekenler'])) return 'CHECKLIST_HELP';
  if (hasAny(text, ['sık hata', 'en sık hata', 'sik hata', 'yaygın hata', 'yaygin hata', 'en çok hata'])) return 'COMMON_MISTAKE_HELP';
  if (hasAny(text, ['hangi ekrana', 'hangi ekrana geçeyim', 'sonra hangi ekrana', 'sonra nereye', 'sonraki ekran', 'hangi menüye', 'en doğru ekran', 'hangi ekranda devam', 'hangi yere geçeyim', 'nereye gitmeliyim', 'nereye geçeyim', 'hangi ekran hangisi']) || isDirectScreenSteer(text)) return 'NEXT_SCREEN';
  if (hasAny(text, ['önce neyi kontrol', 'once neyi kontrol', 'ilk neyi kontrol', 'ilk kontrol', 'ilk bakılacak', 'ilk bakilacak', 'önce neye bakayım', 'once neye bakayim', 'önce neye bakmaliyim', 'once neye bakmaliyim', 'önce neye bakılır', 'once neye bakilir', 'ilk neye bakayım', 'ilk neye bakayim', 'önce nereden bakayım', 'once nereden bakayim'])) return 'FIRST_CONTROL';
  if (hasAny(text, ['detaylı anlat', 'detayli anlat', 'adım adım detay', 'adim adim detay', 'madde madde', 'tek tek anlat', 'sırayla', 'sirayla', 'guided mode', 'guided modede', 'vardiya nasıl oluştur', 'vardiya nasil olustur', 'nasıl vardiya oluştur', 'nasil vardiya olustur', 'yeni iş nasıl kurulur', 'yeni is nasil kurulur', 'plan nasıl kurulur', 'plan nasil kurulur'])) return 'DETAIL_FLOW';
  if (hasAny(text, ['bu satırı nasıl okurum', 'bu satiri nasil okurum', 'bu satır nasıl okunur', 'bu satir nasil okunur', 'bu kaydı nasıl okurum', 'bu kaydi nasil okurum', 'satırı nasıl okurum', 'satiri nasil okurum'])) return 'ROW_HELP';
  if (hasAny(text, ['bu seçili kayıtta eksik ne var', 'bu secili kayitta eksik ne var', 'bu kayıtta ne eksik', 'bu kayitta ne eksik', 'ne eksik', 'eksik ne var', 'eksik alan', 'hangi alan boş', 'hangi alan bos'])) return 'MISSING_DATA_HELP';
  if (hasAny(text, ['hazır mı', 'hazir mi', 'atamaya hazır mı', 'atamaya hazir mi', 'ilerlemeye hazır mı', 'iş hazır mı', 'bu kayıt hazır mı', 'bu kayit hazir mi'])) return 'READINESS_CHECK';
  if (hasAny(text, ['en risksiz sonraki adım', 'en risksiz sonraki adim', 'en güvenli sonraki adım', 'en guvenli sonraki adim', 'en güvenli ne yapayım', 'en guvenli ne yapayim'])) return 'SAFE_NEXT_STEP';
  if (hasAny(text, ['az önce ne değişti', 'az once ne degisti', 'ne değişti', 'ne degisti', 'şimdi neden farklı', 'simdi neden farkli'])) return 'WHAT_CHANGED';
  if (hasAny(text, ['bu sütun ne demek', 'bu sutun ne demek', 'bu kolon ne demek', 'bu alan ne demek', 'hangi sütun', 'hangi sutun'])) return 'FIELD_HELP';
  if (hasAny(text, ['bu rozet ne demek', 'bu badge ne demek', 'durum rozeti ne demek', 'bu etiket ne demek'])) return 'BADGE_HELP';
  if (hasAny(text, ['ne durumda', 'durumu ne', 'kayıt ne durumda', 'kayit ne durumda', 'durum'])) return 'STATUS_HELP';
  if (hasAny(text, ['kaydet ile ok yap farkı', 'kaydet ile ok yap farki', 'kaydet ile ok yap aynı mı', 'kaydet + sonraki ile seç farkı', 'kaydet + sonraki ile sec farki', 'listeyi aç ile marketi aç farkı', 'listeyi ac ile marketi ac farki'])) return 'COMPARE_ITEMS';
  if (hasAny(text, ['ne demek', 'anlamı', 'anlami', 'bu ne demek', 'aynı şey mi', 'ayni sey mi', 'farkı ne', 'farki ne'])) return 'TERM_HELP';
  if (hasAny(text, ['götür', 'gotur', 'aç', 'ac', 'git', 'kısmına', 'kismina'])) return 'GO_TO';
  if (hasAny(text, ['neden kapalı', 'neden kapali', 'kapalı', 'kapali', 'devam edemiyorum', 'neden olmuyor', 'neden görünmüyor', 'neden gorunmuyor'])) return 'WHY_BLOCKED';
  if (hasAny(text, ['buton', 'düğme', 'dugme', 'menü', 'menu', 'kaydet', 'kaydet + sonraki', 'rehberi başlat', 'onay ver', 'önizle', 'analiz et', 'bu buton ne yapar', 'listeyi aç', 'bekleyeni aç', 'marketi aç', 'ok yap', 'büyük haritada işaretle', 'buyuk haritada isaretle', 'tüm adresleri temizle', 'tum adresleri temizle', 'tüm telefonları temizle', 'tum telefonlari temizle'])) return 'BUTTON_HELP';
  if (hasAny(text, ['konum', 'gps', 'telefon gps', "telefon gps'i", 'cihaz gps', 'konum kaynağı', 'konum kaynagi'])) return 'LOCATION_HELP';
  if (hasAny(text, ['peki sonra', 'sonra ne', 'şimdi ne yapayım', 'simdi ne yapayim', 'şimdi ne yapacağım', 'simdi ne yapacagim', 'nasıl yaparım', 'nasil yaparim', 'adım adım', 'adim adim', 'nasıl', 'nasil'])) return 'NEXT_STEP';
  if (hasAny(text, ['bu ekran', 'ne için', 'ne ise yar', 'ne işe yar', 'ekran', 'ne yapılır', 'ne yapilir', 'burada ne yapılır', 'burada ne yapilir'])) return 'SCREEN_PURPOSE';
  if (String(entityType || '') === 'vehicle') return 'LOCATION_HELP';
  if (String(entityType || '') === 'shift') return 'STATUS_HELP';
  return 'SCREEN_PURPOSE';
}

export function resolveReplyMode(message, questionType, roleMode = 'OPERATIONS') {
  const text = normalizeText(message);
  if (questionType === 'DETAIL_FLOW' || hasAny(text, ['adım adım', 'adim adim', 'madde madde', 'tek tek'])) return 'STEP_BY_STEP';
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
  if ((screenPath === '/company' || screenPath === '/organization' || screenPath === '/school') && ['DETAIL_FLOW', 'NEXT_STEP', 'SCREEN_PURPOSE'].includes(questionType)) return 'SCREEN_MENU_GUIDE';
  if (['BUTTON_HELP', 'WHY_BLOCKED', 'CHECKLIST_HELP', 'COMMON_MISTAKE_HELP', 'FIRST_CONTROL', 'NEXT_SCREEN', 'DETAIL_FLOW', 'READINESS_CHECK', 'SAFE_NEXT_STEP', 'WHAT_CHANGED', 'COMPARE_ITEMS'].includes(questionType)) return 'BUTTON_ACTION_GUIDE';
  if (pathHas(screenPath, ['/map', '/live'])) return 'BUTTON_ACTION_GUIDE';
  return 'SCREEN_MENU_GUIDE';
}

function simpleScreenChipsByPath(screenPath = '') {
  if (pathHas(screenPath, ['/georeview'])) {
    return ['Konum İncele ne demek?', 'OSRM nedir?', 'Matrix nedir?', 'Şimdi ne yapayım?'];
  }
  if (pathHas(screenPath, ['/commercial-flow', '/service-evaluation', '/shifts'])) {
    return ['Bu satırı nasıl okurum?', 'Bu sütun ne demek?', 'Bu rozet ne demek?', 'Şimdi ne yapayım?'];
  }
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
  return ['Bu ekran ne için var?', 'Önce neyi kontrol edeyim?', 'Bu buton ne yapar?', 'Bu neden kapalı?'];
}

function screenChipsByPath(screenPath = '', roleMode = 'OPERATIONS') {
  const chips = [];
  if (pathHas(screenPath, ['/georeview'])) {
    chips.push('Konum İncele ekranı ne için var?', 'Geo Review gerekli ne demek?', 'OSRM nedir?', 'Matrix nedir?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/commercial-flow', '/service-evaluation', '/shifts'])) {
    chips.push('Bu satırı nasıl okurum?', 'Bu sütun ne demek?', 'Bu rozet ne demek?', 'Bu buton ne yapar?', 'Bu neden kapalı?', 'Bu seçili kayıtta eksik ne var?', 'Atamaya hazır mı?', 'En risksiz sonraki adım ne?');
  } else if (pathHas(screenPath, ['/offers'])) {
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
    chips.push('Bu ekran ne için var?', 'Şimdi ne yapayım?', 'Bu ne demek?', 'En risksiz sonraki adım ne?', 'İlgili yere götür');
  } else {
    chips.push('Bu ekran ne için var?', 'Önce neyi kontrol edeyim?', 'Kontrol listesi ver', 'Sık hata ne?', 'Bu seçili kayıtta eksik ne var?', 'Atamaya hazır mı?', 'En risksiz sonraki adım ne?', 'Bu kayıt için en doğru ekran hangisi?');
  }

  if (roleMode === 'SIMPLE') {
    return Array.from(new Set(simpleScreenChipsByPath(screenPath))).slice(0, 4);
  }

  return Array.from(new Set(chips.concat(['Bu rolde ne yapabilirim?']))).slice(0, 6);
}

export function buildSuggestedChips({ entityType = 'screen', questionType = 'OPEN', roleMode = 'OPERATIONS', screenPath = '', context = null }) {
  const base = [];
  if (String(entityType) === 'vehicle') {
    base.push('Bu araçta ne eksik?', 'Konum neden görünmüyor?', "Bu araçta sürücünün telefon GPS'i mi cihaz GPS'i mi var?", 'Önce neyi kontrol edeyim?', 'Kontrol listesi ver');
  } else if (String(entityType) === 'shift') {
    base.push('Bu kayıt ne durumda?', 'Atamaya hazır mı?', 'Önce neyi kontrol edeyim?', 'Kontrol listesi ver', 'Bu seçili kayıtta eksik ne var?', 'En risksiz sonraki adım ne?', 'Hangi ekrana geçeyim?', 'Bu kayıt için en doğru ekran hangisi?');
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