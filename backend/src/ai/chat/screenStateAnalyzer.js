function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function uniqueStrings(list) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    const text = String(item || '').trim();
    if (!text) continue;
    const key = normalizeText(text);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function selectedFieldRows(screenContext) {
  return (Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields : []).map((row) => ({
    label: firstNonEmpty(row?.label, row?.key, ''),
    value: firstNonEmpty(row?.value, row?.text, '-'),
    help: firstNonEmpty(row?.help, row?.meaning, row?.purpose, ''),
  })).filter((row) => row.label);
}

function selectedBadgeRows(screenContext) {
  return (Array.isArray(screenContext?.selectedBadges) ? screenContext.selectedBadges : []).map((row) => ({
    label: firstNonEmpty(row?.label, row?.key, ''),
    value: firstNonEmpty(row?.value, row?.text, '-'),
    help: firstNonEmpty(row?.help, row?.meaning, row?.purpose, ''),
  })).filter((row) => row.label);
}



function structuredFacts(screenContext) {
  const facts = screenContext?.structuredFacts;
  return facts && typeof facts === 'object' ? facts : null;
}

function structuredActionRows(screenContext, key) {
  const facts = structuredFacts(screenContext);
  const rows = Array.isArray(facts?.[key]) ? facts[key] : [];
  return rows.map((row) => typeof row === 'string'
    ? { label: row, reason: '', disabled: key === 'blockedActions', purpose: '', required: [], blockedBy: [] }
    : {
        label: firstNonEmpty(row?.label, row?.title, row?.text, ''),
        reason: firstNonEmpty(row?.reason, row?.help, row?.disabledReason, ''),
        purpose: firstNonEmpty(row?.purpose, row?.meaning, ''),
        required: Array.isArray(row?.required) ? row.required.filter(Boolean) : [],
        blockedBy: Array.isArray(row?.blockedBy) ? row.blockedBy.filter(Boolean) : [],
        disabled: key === 'blockedActions' || row?.enabled === false,
      }).filter((row) => row.label);
}

function applyStructuredFacts(result, screenContext) {
  const facts = structuredFacts(screenContext);
  if (!facts) return;
  result.reasoningLead = firstNonEmpty(facts?.reasoningLead, result.reasoningLead, '');
  result.nextBestAction = firstNonEmpty(facts?.nextBestAction, result.nextBestAction, '');
  result.safestNextStep = firstNonEmpty(facts?.safestNextStep, result.safestNextStep, '');
  result.changedHint = firstNonEmpty(facts?.changedHint, result.changedHint, '');
  result.compareHint = firstNonEmpty(facts?.compareHint, result.compareHint, '');
  if (Number.isFinite(Number(facts?.readinessScore))) { result.readinessScore = Math.max(18, Math.min(97, Math.round(Number(facts.readinessScore)))); result.explicitScore = true; }
  if (facts?.readiness) { result.readiness = String(facts.readiness); result.explicitReadiness = true; }
  if (Number.isFinite(Number(facts?.healthScore))) { result.healthScore = Math.max(0.18, Math.min(0.97, Number(facts.healthScore))); result.explicitHealth = true; }
  result.blockers.push(...(Array.isArray(facts?.blockers) ? facts.blockers : []));
  result.missingData.push(...(Array.isArray(facts?.missing) ? facts.missing : []));
  result.evidence.push(...(Array.isArray(facts?.evidence) ? facts.evidence : []));
  const counters = facts?.counters && typeof facts.counters === 'object' ? facts.counters : null;
  if (counters) {
    const parts = Object.entries(counters)
      .filter(([, value]) => value != null && value !== '' && value !== false)
      .slice(0, 6)
      .map(([key, value]) => `${key}: ${value}`);
    if (parts.length) result.evidence.push(`Panel verisi: ${parts.join(' • ')}`);
  }
  const blocked = structuredActionRows(screenContext, 'blockedActions');
  const allowed = structuredActionRows(screenContext, 'allowedActions');
  if (blocked.length) {
    result.disabledHints.push(...blocked.map((row) => {
      const tail = [row.reason, ...(row.blockedBy || [])].filter(Boolean).join(' • ');
      return `${row.label}${tail ? `: ${tail}` : ''}`;
    }));
    const firstBlocked = blocked[0];
    if (firstBlocked?.purpose) result.evidence.push(`Kapalı aksiyon amacı: ${firstBlocked.label} → ${firstBlocked.purpose}`);
  }
  if (allowed.length) {
    result.evidence.push(`İzinli aksiyonlar: ${allowed.slice(0, 4).map((row) => row.label).join(', ')}`);
    const firstAllowed = allowed[0];
    if (firstAllowed?.required?.length) result.evidence.push(`Aksiyon ön koşulu: ${firstAllowed.required.slice(0, 3).join(' • ')}`);
  }
}

function uiHintRows(screenContext, key) {
  return (Array.isArray(screenContext?.uiHints?.[key]) ? screenContext.uiHints[key] : []).map((row) => {
    if (typeof row === 'string') return { label: row, value: row, reason: '' };
    return {
      label: firstNonEmpty(row?.label, row?.title, row?.text, ''),
      value: firstNonEmpty(row?.value, row?.text, row?.label, ''),
      reason: firstNonEmpty(row?.reason, row?.help, ''),
      disabled: Boolean(row?.disabled),
    };
  }).filter((row) => row.label);
}

function findValue(rows, labels) {
  const wanted = (Array.isArray(labels) ? labels : [labels]).map((x) => normalizeText(x));
  const hit = (Array.isArray(rows) ? rows : []).find((row) => wanted.some((label) => normalizeText(row?.label).includes(label)));
  return hit ? String(hit.value || '').trim() : '';
}

function hasBlankish(value) {
  const text = normalizeText(value);
  return !text || ['-', 'yok', 'boş', 'bos', 'null', 'undefined', 'n/a', 'na', 'henüz puan yok'].includes(text);
}

function hasOldGps(value) {
  const text = normalizeText(value);
  if (!text) return false;
  return /stale|eski|dakika|dk|saat|unknown|bilinmiyor/.test(text) && !/şimdi|simdi|az önce|az once|1 dk|0 dk/.test(text);
}

function badgeHas(badges, labelsOrValues) {
  const wanted = (Array.isArray(labelsOrValues) ? labelsOrValues : [labelsOrValues]).map((x) => normalizeText(x));
  return (Array.isArray(badges) ? badges : []).some((row) => wanted.some((val) => normalizeText(row?.label).includes(val) || normalizeText(row?.value).includes(val)));
}

function classifyScreenPath(path = '') {
  const p = normalizeText(path);
  if (p.includes('/georeview')) return 'GEOREVIEW';
  if (p.includes('/commercial-flow')) return 'COMMERCIAL_FLOW';
  if (p.includes('/service-evaluation')) return 'SERVICE_EVALUATION';
  if (p.includes('/shifts')) return 'SHIFTS';
  if (p === '/company' || p === '/organization' || p === '/school') return 'PLANNING_CENTER';
  if (p.includes('/driver/today')) return 'DRIVER_TODAY';
  if (p.includes('/driver/map') || p.includes('/driver/route')) return 'DRIVER_MAP';
  if (p.includes('/map') || p.includes('/live')) return 'MAP';
  return 'GENERIC';
}

function makeResult(type, screenContext, screenDefinition) {
  return {
    type,
    screenPath: String(screenDefinition?.path || screenContext?.path || ''),
    screenLabel: firstNonEmpty(screenDefinition?.label, screenContext?.label, 'Ekran'),
    selectedLabel: firstNonEmpty(screenContext?.selectedLabel, ''),
    healthScore: 0.72,
    readinessScore: 72,
    readiness: 'REVIEW_NEEDED',
    confidence: 0.76,
    reasoningLead: '',
    blockers: [],
    missingData: [],
    evidence: [],
    nextBestAction: '',
    safestNextStep: '',
    changedHint: '',
    compareHint: '',
    disabledHints: [],
    explicitReadiness: false,
    explicitScore: false,
    explicitHealth: false,
  };
}

function applyUiSurface(result, screenContext) {
  const disabled = [...structuredActionRows(screenContext, 'blockedActions'), ...uiHintRows(screenContext, 'disabledButtons')];
  const visible = [...structuredActionRows(screenContext, 'allowedActions'), ...uiHintRows(screenContext, 'visibleButtons')];
  const headers = uiHintRows(screenContext, 'tableHeaders').map((row) => row.label);
  const modals = uiHintRows(screenContext, 'modalTitles').map((row) => row.label);
  const tabs = uiHintRows(screenContext, 'activeTabs').map((row) => row.label);
  const pages = uiHintRows(screenContext, 'pageTitles').map((row) => row.label);
  if (disabled.length) {
    result.disabledHints = disabled.slice(0, 4).map((row) => `${row.label}${row.reason ? `: ${row.reason}` : ''}`);
    const first = disabled[0];
    result.evidence.push(`Pasif buton: ${first.label}`);
    if (first.reason) result.evidence.push(`Pasif sebep: ${first.reason}`);
  }
  if (visible.length) result.evidence.push(`Görünen butonlar: ${visible.slice(0, 4).map((row) => row.label).join(', ')}`);
  if (headers.length) result.evidence.push(`Tablo başlıkları: ${headers.slice(0, 4).join(', ')}`);
  if (modals.length) result.evidence.push(`Açık modal: ${modals.slice(0, 2).join(', ')}`);
  if (tabs.length) result.evidence.push(`Aktif sekme: ${tabs.slice(0, 2).join(', ')}`);
  if (pages.length) result.evidence.push(`Sayfa başlığı: ${pages.slice(0, 2).join(', ')}`);
}

function finalize(result) {
  const blockerCount = result.blockers.length;
  const missingCount = result.missingData.length;
  const disabledCount = result.disabledHints.length;
  const penalty = blockerCount * 0.18 + missingCount * 0.08 + Math.min(0.12, disabledCount * 0.03);
  if (!result.explicitHealth) result.healthScore = Math.max(0.18, Math.min(0.97, Number((0.92 - penalty).toFixed(2))));
  if (!result.explicitScore) result.readinessScore = Math.max(18, Math.min(97, Math.round(result.healthScore * 100)));
  if (!result.explicitReadiness) {
    if (blockerCount >= 2) result.readiness = 'NOT_READY';
    else if (blockerCount || missingCount) result.readiness = 'REVIEW_NEEDED';
    else result.readiness = 'READY';
  }
  result.confidence = Math.max(0.58, Math.min(0.94, Number((0.62 + Math.min(0.24, result.evidence.length * 0.04)).toFixed(2))));
  result.evidence = uniqueStrings(result.evidence).slice(0, 6);
  result.blockers = uniqueStrings(result.blockers).slice(0, 5);
  result.missingData = uniqueStrings(result.missingData).slice(0, 5);
  result.disabledHints = uniqueStrings(result.disabledHints).slice(0, 4);
  return result;
}

function analyzeGeoReview(screenContext, screenDefinition, conversationState) {
  const result = makeResult('GEOREVIEW', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  const coord = findValue(fields, ['koordinat', 'lat', 'lng']);
  const address = findValue(fields, ['adres']);
  const status = findValue(fields, ['durum']);
  const reason = findValue(fields, ['neden']);
  if (!result.selectedLabel) result.blockers.push('Önce listeden bir kişi seçilmeden sağ panel güvenilir okunmaz.');
  if (hasBlankish(coord)) result.missingData.push('Koordinat boş görünüyor.');
  if (hasBlankish(coord) && hasBlankish(address)) result.blockers.push('Hem adres hem koordinat boşsa otomatik üretim ve manuel kaydetme akışı ilerlemez.');
  if (badgeHas(badges, ['needs_review', 'failed']) || /review|incele/.test(normalizeText(status))) result.reasoningLead = 'Bu kayıt hâlâ konum doğrulama istiyor.';
  else result.reasoningLead = 'Bu kayıtta ana karar koordinatın gerçekten doğrulanıp kaydedilmediği.';
  if (coord) result.evidence.push(`Koordinat: ${coord}`);
  if (address) result.evidence.push(`Adres: ${address}`);
  if (status) result.evidence.push(`Durum: ${status}`);
  if (reason) result.evidence.push(`Neden: ${reason}`);
  const lastQuestion = normalizeText(conversationState?.lastUserMessage || '');
  if (/kaydet \+ sonraki|kaydet ve sonraki|siradaki/.test(lastQuestion) && result.selectedLabel) result.changedHint = 'Az önce seri ilerleme konuşulduysa Seç butonu ile aktif kişinin gerçekten değiştiğini doğrulamak gerekir.';
  result.nextBestAction = hasBlankish(coord)
    ? (address ? 'Önce büyük haritada noktayı işaretle veya adresten bul ile koordinat üret. Sonra Kaydet de.' : 'Önce büyük haritada noktayı işaretle. Sonra OK ile dönüp Kaydet de.')
    : 'Koordinat doğruysa Kaydet ile sabitle. Seri gidiyorsan sonra Kaydet + Sonraki kullan.';
  result.safestNextStep = 'En risksiz adım, seçili kişi adını sağ panelde doğrulayıp sadece o kayıt üzerinde işaretleme yapmak.';
  result.compareHint = 'Kaydet veritabanına yazar. OK Yap yalnız büyük harita seçim modalını onaylar.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeMap(screenContext, screenDefinition, conversationState) {
  const result = makeResult('MAP', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  const gps = findValue(fields, ['son gps', 'gps']);
  const eta = findValue(fields, ['eta']);
  const nextStop = findValue(fields, ['sıradaki durak', 'siradaki durak', 'sonraki durak']);
  const remaining = findValue(fields, ['kalan']);
  const totalStops = findValue(fields, ['toplam durak']);
  if (!result.selectedLabel) result.blockers.push('Önce araç veya vardiya seçilmeden üst kart ve Copilot bağlamı eksik kalır.');
  if (hasBlankish(nextStop)) result.missingData.push('Sıradaki durak boş görünüyor.');
  if (hasBlankish(eta) && !hasBlankish(nextStop)) result.missingData.push('ETA boş veya güncel değil görünüyor.');
  if (hasOldGps(gps) || badgeHas(badges, ['stale', 'old'])) result.blockers.push('Son GPS eski görünüyor; bu ekrana bakarak tek başına canlı karar vermek riskli.');
  if (gps) result.evidence.push(`Son GPS: ${gps}`);
  if (eta) result.evidence.push(`ETA: ${eta}`);
  if (nextStop) result.evidence.push(`Sıradaki durak: ${nextStop}`);
  if (remaining) result.evidence.push(`Kalan: ${remaining}`);
  if (totalStops) result.evidence.push(`Toplam durak: ${totalStops}`);
  result.reasoningLead = result.blockers.length ? 'Bu haritadaki ana sorun canlılığın zayıf veya eksik görünmesi.' : 'Bu haritada önce canlılık, sonra sıradaki durak ve ETA birlikte okunmalı.';
  result.nextBestAction = result.blockers.length
    ? 'Önce Son GPS zamanını ve seçili aracı doğrula. Sonra gerekirse Vardiyalar ekranından aynı kaydı aç.'
    : (hasBlankish(eta) ? 'Önce hareket geldikçe ETA yenileniyor mu kontrol et. Sonra sıradaki durak navigasyonunu gerekirse aç.' : 'Önce seçili araç için son GPS, ETA ve kalan durak sayısını birlikte kontrol et.');
  result.safestNextStep = 'En risksiz adım, doğru aracı seçip Son GPS eski mi değil mi onu kontrol etmektir.';
  const lastQuestion = normalizeText(conversationState?.lastUserMessage || '');
  if (/neden mavi|legend|altta/.test(lastQuestion)) result.changedHint = 'Az önce rota renkleri veya alt legend konuşulduysa görsel yorumla canlı karar yorumunu karıştırmamak gerekir.';
  result.compareHint = 'Mavi aktif sıradaki parçayı, yeşil geçilen kısmı gösterir; tek renk görmek her zaman hata anlamına gelmez.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeShifts(screenContext, screenDefinition, conversationState) {
  const result = makeResult('SHIFTS', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  const status = findValue(fields, ['durum', 'status']);
  const vehicle = findValue(fields, ['araç', 'arac']);
  const driver = findValue(fields, ['sürücü', 'surucu']);
  const stops = findValue(fields, ['durak']);
  const offer = findValue(fields, ['room teklifi', 'teklif']);
  const nextStep = findValue(fields, ['sonraki adım', 'sonraki adim']);
  if (!result.selectedLabel) result.blockers.push('Önce listeden bir vardiya seçmeden yorum genel kalır.');
  if (hasBlankish(vehicle)) result.missingData.push('Araç alanı boş görünüyor.');
  if (hasBlankish(driver)) result.missingData.push('Sürücü alanı boş görünüyor.');
  if (hasBlankish(stops)) result.missingData.push('Durak bilgisi boş görünüyor.');
  if ((/approved|accepted|onay/i.test(status) || badgeHas(badges, ['approved', 'accepted'])) && (hasBlankish(vehicle) || hasBlankish(driver))) result.blockers.push('Kayıt onaylı görünse de araç veya sürücü boşsa saha için tam hazır değildir.');
  if (/pending|bekliyor|open|counter/i.test(normalizeText(offer))) result.blockers.push('Teklif kararı kapanmadan atama yorumu yarım kalır.');
  if (status) result.evidence.push(`Durum: ${status}`);
  if (vehicle) result.evidence.push(`Araç: ${vehicle}`);
  if (driver) result.evidence.push(`Sürücü: ${driver}`);
  if (offer) result.evidence.push(`Teklif: ${offer}`);
  if (nextStep) result.evidence.push(`Sonraki adım: ${nextStep}`);
  result.reasoningLead = result.blockers.length ? 'Bu vardiyada ana blokaj atama veya teklif tarafında görünüyor.' : 'Bu vardiyada önce durum, sonra araç-sürücü bağı, en son sonraki adım okunmalı.';
  if (result.blockers.length) {
    result.nextBestAction = result.blockers[0].includes('Teklif') ? 'Önce teklif kararını kapat. Sonra araç ve sürücü alanını tekrar kontrol et.' : 'Önce araç ve sürücü bağını tamamla. Sonra durak ve sonraki adım alanını tekrar oku.';
  } else {
    result.nextBestAction = nextStep || 'Önce seçili vardiyanın araç, sürücü ve durak alanlarını birlikte kontrol et.';
  }
  result.safestNextStep = 'En risksiz adım, seçili satırda araç ve sürücü gerçekten dolu mu onu doğrulamaktır.';
  const lastQuestion = normalizeText(conversationState?.lastUserMessage || '');
  if (/kayıt ne durumda|hazır mı|atama/.test(lastQuestion)) result.changedHint = 'Az önce hazır mı sorulduysa yalnız durum rozetine değil araç-sürücü boşluklarına da bakmak gerekir.';
  result.compareHint = 'APPROVED ile tam atama aynı şey değildir; araç ve sürücü boşsa iş hâlâ saha için eksiktir.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeCommercialFlow(screenContext, screenDefinition) {
  const result = makeResult('COMMERCIAL_FLOW', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  const flow = findValue(fields, ['akış', 'akis']);
  const status = findValue(fields, ['durum']);
  const nextStep = findValue(fields, ['sonraki adım', 'sonraki adim']);
  const counterparty = findValue(fields, ['karşı taraf', 'karsi taraf', 'sağlayıcı', 'saglayici']);
  const amount = findValue(fields, ['tutar', 'fiyat']);
  if (!result.selectedLabel) result.blockers.push('Önce ticari satır seçilmeden hangi aşamada olduğunu net okumak zordur.');
  if (hasBlankish(nextStep)) result.missingData.push('Sonraki Adım boş görünüyor.');
  if (/open|countered|market|teklif/.test(normalizeText(status + ' ' + flow))) {
    result.reasoningLead = 'Bu kayıt henüz market veya pazarlık tarafında görünüyor.';
    result.nextBestAction = 'Önce Marketi aç veya Bekleyeni aç ile karar tarafını netleştir.';
  } else if (/accepted|approved/.test(normalizeText(status + ' ' + flow))) {
    result.reasoningLead = 'Bu kayıt kabul edilmiş ama operasyon hazırlığı kontrol edilmelidir.';
    result.nextBestAction = 'Önce Listeyi aç ile bağlı vardiyayı aç. Sonra atama ve operasyon alanlarını kontrol et.';
  } else if (/active|done/.test(normalizeText(status + ' ' + flow))) {
    result.reasoningLead = 'Bu kayıt artık operasyon veya sonuç tarafına inmiş görünüyor.';
    result.nextBestAction = 'Önce Listeyi aç ile bağlı işi gör. Bitti ise Hizmet Değerlendirme ekranına geç.';
  } else {
    result.reasoningLead = 'Bu kayıtta önce akış, sonra durum, en son sonraki adım okunmalı.';
    result.nextBestAction = nextStep || 'Önce akış ve durum sütununu birlikte oku.';
  }
  if (flow) result.evidence.push(`Akış: ${flow}`);
  if (status) result.evidence.push(`Durum: ${status}`);
  if (counterparty) result.evidence.push(`Karşı taraf: ${counterparty}`);
  if (amount) result.evidence.push(`Tutar: ${amount}`);
  if (nextStep) result.evidence.push(`Sonraki adım: ${nextStep}`);
  result.safestNextStep = 'En risksiz adım, akış ve durum alanını okuyup uygun butonu ona göre açmaktır.';
  result.compareHint = 'Marketi aç pazarlık tarafına gider. Listeyi aç ise kayıt operasyon/liste tarafına ilerlediyse doğru ekrana götürür.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeServiceEvaluation(screenContext, screenDefinition) {
  const result = makeResult('SERVICE_EVALUATION', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  const service = findValue(fields, ['hizmet']);
  const provider = findValue(fields, ['sağlayıcı', 'saglayici']);
  const score = findValue(fields, ['puan']);
  const nextStep = findValue(fields, ['sonraki adım', 'sonraki adim']);
  const status = findValue(fields, ['durum']);
  if (!result.selectedLabel) result.blockers.push('Önce hizmet satırı seçilmeden kalite yorumu genelde yüzeyde kalır.');
  if (hasBlankish(nextStep)) result.missingData.push('Sonraki Adım boş görünüyor.');
  if (!service) result.missingData.push('Hizmet alanı boş görünüyor.');
  if (service) result.evidence.push(`Hizmet: ${service}`);
  if (provider) result.evidence.push(`Sağlayıcı: ${provider}`);
  if (score) result.evidence.push(`Puan: ${score}`);
  if (status) result.evidence.push(`Durum: ${status}`);
  if (nextStep) result.evidence.push(`Sonraki adım: ${nextStep}`);
  result.reasoningLead = 'Bu ekranda önce hizmet sonucu, sonra değerlendirme ve sonraki adım birlikte okunur.';
  result.nextBestAction = nextStep || (badgeHas(badges, ['done']) ? 'Önce değerlendirme veya sonuç alanını netleştir. Gerekirse bağlı vardiyayı aç.' : 'Önce hizmet durumu bitmiş mi kontrol et.');
  result.safestNextStep = 'En risksiz adım, seçili hizmet satırında durum ve sonraki adımı birlikte okumaktır.';
  result.compareHint = 'Bu ekran kalite takibidir; yeni plan veya pazarlık başlatma ekranı değildir.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzePlanningCenter(screenContext, screenDefinition) {
  const result = makeResult('PLANNING_CENTER', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  const focus = firstNonEmpty(findValue(fields, ['seçili kayıt', 'secili kayit', 'plan', 'paket']), screenContext?.selectedLabel, '');
  const needsReview = badgeHas(badges, ['needs_review']) || badgeHas(badges, ['review']) || (Array.isArray(fields) && fields.some((row) => /needs_review|incele|eksik koordinat|konum sorunu/i.test(String(row?.value || ''))));
  if (focus) result.evidence.push(`Seçili odak: ${focus}`);
  if (needsReview) result.blockers.push('Konum veya veri sorunu çözülmeden plan çıktısı güvenilmez.');
  result.reasoningLead = 'Planlama Merkezi yeni iş veya vardiya kurma ekranıdır; mevcut işin teklif ve operasyon takibi Vardiyalar ekranında yapılır.';
  result.nextBestAction = needsReview
    ? 'Önce Konum İncele ekranında eksik koordinat veya review gerektiren kayıtları düzelt. Sonra Rehberi Başlat ile plan akışını aç.'
    : 'Önce Rehberi Başlat ile plan akışını aç. Paket, tarih ve günleri seç; çözüm ve tekliften sonra takibi Vardiyalar ekranında sürdür.';
  result.safestNextStep = needsReview
    ? 'En risksiz adım, plan kurmadan önce konum sorunlarını kapatmaktır.'
    : 'En risksiz adım, Guided/Rehber akışı ile planı kurup çıktıyı sonra Vardiyalar ekranında takip etmektir.';
  result.compareHint = 'Planlama Merkezi yeni iş kurar; Vardiyalar mevcut işin teklif, atama ve operasyon takibini yapar.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeDriver(screenContext, screenDefinition) {
  const result = makeResult(classifyScreenPath(screenDefinition?.path || screenContext?.path || ''), screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  const nextStop = findValue(fields, ['sıradaki durak', 'siradaki durak']);
  const eta = findValue(fields, ['eta']);
  const gps = findValue(fields, ['gps', 'son gps']);
  const task = findValue(fields, ['görev', 'gorev', 'iş', 'is']);
  if (!result.selectedLabel && !task) result.blockers.push('Aktif görev veya seçili kayıt görünmüyor.');
  if (hasBlankish(nextStop)) result.missingData.push('Sıradaki durak görünmüyor.');
  if (hasBlankish(eta) && !hasBlankish(nextStop)) result.missingData.push('ETA güncel görünmüyor.');
  if (hasOldGps(gps) || badgeHas(badges, ['stale'])) result.blockers.push('Konum akışı eski görünüyor.');
  if (task) result.evidence.push(`Görev: ${task}`);
  if (nextStop) result.evidence.push(`Sıradaki durak: ${nextStop}`);
  if (eta) result.evidence.push(`ETA: ${eta}`);
  if (gps) result.evidence.push(`GPS: ${gps}`);
  result.reasoningLead = result.blockers.length ? 'Sürücü tarafında ana risk canlı konum zincirinin zayıflaması.' : 'Sürücü ekranında önce aktif görev, sonra sıradaki durak ve ETA okunmalı.';
  result.nextBestAction = result.blockers.length ? 'Önce konum akışı sürüyor mu kontrol et. Sonra bugünkü iş ekranına dönüp sıradaki durağı tekrar doğrula.' : 'Önce sıradaki durağı ve ETA bilgisini kontrol et. Sonra navigasyon veya görev akışına devam et.';
  result.safestNextStep = 'En risksiz adım, aktif görev açık mı ve sıradaki durak dolu mu bunu doğrulamaktır.';
  result.compareHint = 'Sürücünün telefon GPS\'i akmıyorsa ETA ve reached zinciri de geri düşebilir.';
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeGeneric(screenContext, screenDefinition) {
  const result = makeResult('GENERIC', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  if (!result.selectedLabel && !fields.length && !badges.length) result.blockers.push('Henüz seçili kayıt bağlamı görünmüyor.');
  const blankLabels = fields.filter((row) => hasBlankish(row.value)).map((row) => row.label);
  if (blankLabels.length) result.missingData.push(`${blankLabels.slice(0, 3).join(', ')} alanları boş görünüyor.`);
  result.evidence = fields.slice(0, 3).map((row) => `${row.label}: ${row.value}`).concat(badges.slice(0, 2).map((row) => `${row.label}: ${row.value}`));
  result.reasoningLead = 'Bu ekranda önce seçili kayıt ve boş alanlar okunmalı.';
  result.nextBestAction = 'Önce seçili kayıt veya ana alanları doğrula. Sonra buton veya sonraki ekran kararını ver.';
  result.safestNextStep = 'En risksiz adım, yorum yapmadan önce seçili satırı gerçekten değiştirdiğini kontrol etmektir.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

export function analyzeScreenState({ screenContext = null, screenDefinition = null, conversationState = null }) {
  const path = String(screenDefinition?.path || screenContext?.path || '');
  const type = classifyScreenPath(path);
  if (type === 'GEOREVIEW') return analyzeGeoReview(screenContext, screenDefinition, conversationState);
  if (type === 'MAP') return analyzeMap(screenContext, screenDefinition, conversationState);
  if (type === 'SHIFTS') return analyzeShifts(screenContext, screenDefinition, conversationState);
  if (type === 'COMMERCIAL_FLOW') return analyzeCommercialFlow(screenContext, screenDefinition, conversationState);
  if (type === 'SERVICE_EVALUATION') return analyzeServiceEvaluation(screenContext, screenDefinition, conversationState);
  if (type === 'PLANNING_CENTER') return analyzePlanningCenter(screenContext, screenDefinition, conversationState);
  if (type === 'DRIVER_TODAY' || type === 'DRIVER_MAP') return analyzeDriver(screenContext, screenDefinition, conversationState);
  return analyzeGeneric(screenContext, screenDefinition, conversationState);
}
