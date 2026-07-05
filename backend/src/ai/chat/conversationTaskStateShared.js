import { firstNonEmpty, uniqueStrings } from './replyShapes.js';

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeLooseText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeVisibleReplyFragment(value) {
  return firstNonEmpty(value, '')
    .replace(/\bPlan\s*Builder\b/gi, 'Planlama Merkezi')
    .replace(/^(?:Önce|Once)\s*:\s*/i, '')
    .replace(/^(?:Önce|Once)\s+/i, '')
    .replace(/^(?:Şimdi(?:\s+yap)?|Simdi(?:\s+yap)?)\s*:\s*/i, '')
    .replace(/^(?:Şimdi(?:\s+yap)?|Simdi(?:\s+yap)?)\s+/i, '')
    .replace(/^(?:Sonra|Sonraki)\s*:\s*/i, '')
    .replace(/^(?:Sonra|Sonraki)\s+/i, '')
    .replace(/^(?:İlk bakılacak yer|Ilk bakilacak yer)\s*:\s*/i, '')
    .replace(/^(?:İlk bakılacak yer|Ilk bakilacak yer)\s+/i, '')
    .replace(/\bblokajı\b/gi, 'engeli')
    .replace(/\bblokaj\b/gi, 'engel')
    .replace(/\bengelı\b/gi, 'engeli')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([.,!?;:]){2,}/g, '$1')
    .trim();
}

export function ensureVisibleSentence(value) {
  const text = normalizeVisibleReplyFragment(value);
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

export function asText(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'object') {
    return firstNonEmpty(item.text, item.label, item.title, item.action, item.purpose, item.reason, '');
  }
  return String(item || '');
}

export function normalizeRoleKey(value) {
  return normalizeText(value).replace(/\s+/g, '').replace(/_/g, '');
}

export function prettyRoleName(roleKey) {
  const map = {
    company: 'Şirket',
    room: 'Oda',
    driver: 'Sürücü',
    parent: 'Veli',
    personel: 'Personel',
    school: 'Okul',
    organization: 'Organizasyon',
    superadmin: 'Süper Yönetici',
  };
  return firstNonEmpty(map[normalizeRoleKey(roleKey)], roleKey ? String(roleKey).trim() : '');
}

export function turkishRoleName(normalizedRole, fallbackRole = '') {
  const map = {
    company: 'Şirket',
    organization: 'Organizasyon',
    room: 'Oda',
    driver: 'Sürücü',
    personel: 'Personel',
    parent: 'Veli',
    school: 'Okul',
    super_admin: 'Süper Yönetici',
    superadmin: 'Süper Yönetici',
    default: '',
  };
  return firstNonEmpty(map[normalizeRoleKey(normalizedRole)], prettyRoleName(fallbackRole), prettyRoleName(normalizedRole));
}

export function prettyScreenLabel(label) {
  const text = String(label || '').trim();
  if (!text) return '';
  return text
    .replace(/\bPlan\s*Builder\b/gi, 'Planlama Merkezi')
    .replace(/\bCompany\b/gi, 'Şirket')
    .replace(/\bRoom\b/gi, 'Oda')
    .replace(/\bDriver\b/gi, 'Sürücü')
    .replace(/\bParent\b/gi, 'Veli')
    .replace(/\bPersonel\b/gi, 'Personel')
    .replace(/\bSchool\b/gi, 'Okul')
    .replace(/\bOrganization\b/gi, 'Organizasyon')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectReferencedRole(message, fallbackRole = '') {
  const text = normalizeText(message);
  if (/\bsuper\s*admin\b|\bsuperadmin\b|\bsüper\s*admin\b/.test(text)) return 'superadmin';
  if (/\bcompany\b|\bşirket\b/.test(text)) return 'company';
  if (/\broom\b|\boda\b/.test(text)) return 'room';
  if (/\bdriver\b|\bsürücü\b|\bsurucu\b/.test(text)) return 'driver';
  if (/\bparent\b|\bveli\b/.test(text)) return 'parent';
  if (/\bpersonel\b|\bçalışan\b|\bcalisan\b/.test(text)) return 'personel';
  if (/\bschool\b|\bokul\b/.test(text)) return 'school';
  if (/\borganization\b|\borganizasyon\b/.test(text)) return 'organization';
  return normalizeRoleKey(fallbackRole);
}

export function roleExplanationSentence(roleKey) {
  const normalized = normalizeRoleKey(roleKey);
  const map = {
    company: 'teklif, sözleşme ve vardiya planını yönetirsin.',
    organization: 'teklif, sözleşme ve vardiya planını yönetirsin.',
    room: 'operasyon, sürücü ve araç akışını takip edersin.',
    driver: 'kendi rotanı, günlük görevini ve canlı durumunu görürsün.',
    parent: 'öğrencinin servisini canlı izlersin.',
    personel: 'kendi servis akışını ve durumunu takip edersin.',
    school: 'okul tarafındaki servis ve operasyon işlerini yönetirsin.',
    superadmin: 'tüm yüzeyleri, kaliteyi ve kanıt akışını denetlersin.',
  };
  return firstNonEmpty(map[normalized], 'kendi alanına ait ekranları ve onay adımlarını görürsün.');
}

export function stepFlowSentence(steps, limit = 3) {
  const labels = ['Önce', 'Sonra', 'Ardından'];
  return uniqueStrings((Array.isArray(steps) ? steps : []).filter(Boolean).slice(0, limit))
    .map((step, index) => `${labels[index] || 'Sonra'} ${stripStepLead(step)}`)
    .join('. ')
    .replace(/\.\s*$/u, '')
    .trim();
}

export function stripStepLead(text) {
  return String(text || '')
    .replace(/^(Önce|Sonra|Ardından|İlk bakılacak yer:)\s*/iu, '')
    .trim();
}

export function matchesStandalonePhrase(text, phrases) {
  const normalized = normalizeText(text);
  return (Array.isArray(phrases) ? phrases : []).some((phrase) => normalized === normalizeText(phrase));
}

export function looksLikeOnboardingStartQuestion(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return /(?:ne yapmam lazım|ne yapmam gerekiyor|nereden başlamalıyım|nereden başlamam gerekiyor|nereden başlayacağım|başlangıç yolu|ilk adım ne|ilk adımı ne|ilk bakılacak|nasıl başlayacağım|nasıl başlamalıyım|buradan sonra ne yapacağım|buradan sonra ne yapmam gerekiyor)/.test(value);
}

export function looksLikeScreenStartQuestion(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  if (/(buton|düğme|dugme|alan|rozet|badge|sütun|sutun|kolon|terim|kanıt|kanit)/.test(value)) return false;
  if (/(bu ekran ne işe yarar|bu ekran ne ise yarar|bu ekran ne işe yarıyor|bu ekran ne ise yarıyor|bu ekran ne için|bu ekran ne icin|bu panel neyi gösteriyor|bu panel neyi gosteriyor|bu panel ne işe yarıyor|bu panel ne ise yarıyor|bu sayfa ne işe yarar|bu sayfa ne ise yarar|bu sayfa ne işe yarıyor|bu sayfa ne ise yarıyor|ekranın amacı ne|ekranin amaci ne|burada ne yapıyorum|burada ne yapiyorum)/.test(value)) return true;
  return /(plan builder|planlama merkezi|vardiya|teklif|sözleşme|sozlesme|servis durumu|canlı takip|canli takip|harita|rota|audit|konum incele|my ride|plan oluştur|plan olustur)/.test(value)
    && /(ne işe yarar|ne ise yarar|ne işe yarıyor|ne ise yarıyor|ne yapacağım|ne yapacagım|ne yapmalıyım|ne yapmaliyim|burada ne yapıyorum|burada ne yapiyorum)/.test(value);
}

export function looksLikeDetailContinuationRequest(message) {
  const text = normalizeText(message);
  if (!text) return false;
  return /(devamını anlat|devamini anlat|detayını anlat|detayini anlat|biraz daha aç|biraz daha ac|biraz aç|biraz ac|daha detay|daha ayrıntı|daha ayrinti|biraz daha detay|biraz daha ayrıntı|biraz daha ayrinti)/.test(text);
}

export function looksLikeNextBestActionQuestion(message) {
  const text = normalizeText(message);
  if (!text) return false;
  return matchesStandalonePhrase(text, [
    'sıradaki doğru işlem',
    'siradaki dogru islem',
    'bir sonraki doğru işlem',
    'bir sonraki dogru islem',
    'bir sonraki adım ne',
    'bir sonraki adim ne',
    'şu an en doğru adım',
    'su an en dogru adim',
    'şimdi en doğru işlem',
    'simdi en dogru islem',
    'bundan sonra ne yapayım',
    'bundan sonra ne yapmaliyim',
    'bundan sonra ne yapmalıyım',
    'nereden devam edeyim',
    'hangi adıma geçeceğim',
    'hangi adima gececegim',
    'devamında ne var',
    'devaminda ne var',
    'burada sıradaki adım hangisi',
    'burada siradaki adim hangisi',
    'ne ile başlamalıyım',
    'ne ile baslamaliyim',
    'bu kayıt için ne yapmam gerekiyor',
    'bu kayit icin ne yapmam gerekiyor',
    'sırada hangi işlem var',
    'sirada hangi islem var',
    'iş akışında sıradaki adım nedir',
    'is akisinda siradaki adim nedir',
    'burada önce neyi tamamlayayım',
    'burada once neyi tamamlayayim',
    'burada devam etmek için ne eksik',
    'burada devam etmek icin ne eksik',
    'sonra ne olacak',
    'şimdi hangi butona basacağım',
    'simdi hangi butona basacagim',
    'hangi butona basacağım',
    'hangi butona basacagim',
    'hangi butona basmalıyım',
    'hangi butona basmaliyim',
  ]);
}

export function looksLikeClarifyingQuestionRequest(message) {
  const text = normalizeLooseText(message);
  if (!text) return false;
  return matchesStandalonePhrase(text, [
    'İlgili durumu sor',
    'Netleştirmek için ne sorarsın',
    'Eksik bilgi ne',
    'Hangi kayıt için bakayım',
    'Hangi kaydı için bakayım',
    'Hangi kayıt için bakmamı istiyorsun',
    'Hangi kayıt üzerinde ilerlediğini seç',
    'Hangi kayıt üzerinde ilerleyeyim',
    'Hangi plan, vardiya, talep veya sözleşme kaydı için bakmamı istiyorsun',
    'Hangi vardiya, talep ya da sözleşme için bakayım',
    'Hangi vardiya, talep ya da sözleşme için bakmamı istiyorsun',
    'Hangi plan ya da operasyon kaydı için bakayım',
  ]) || /\bhangi\b.*\b(bakay[ıi]m|bakmam[ıi]\s+istiyorsun|bakmam[ıi])\b/.test(text);
}

export function looksLikeCompanyPlanningSurfaceText(value) {
  const text = normalizeLooseText(value);
  if (!text) return false;
  return /(planlama merkezi|yeni plan oluştur|rehberi başlat|rehberli mod|rehber|yeni plan|planlama ve teklif hazırlığı|planlama|guided plan|plan builder|plan hazırlığı|plan akışı)/.test(text);
}

export function companyPlanningUiSurfaceText(conversationState = null) {
  const uiSurface = conversationState?.uiSurface && typeof conversationState.uiSurface === 'object' ? conversationState.uiSurface : null;
  if (!uiSurface) return '';
  return uniqueStrings([
    ...(Array.isArray(uiSurface.modalTitles) ? uiSurface.modalTitles : []),
    ...(Array.isArray(uiSurface.pageTitles) ? uiSurface.pageTitles : []),
    ...(Array.isArray(uiSurface.activeTabs) ? uiSurface.activeTabs : []),
    ...(Array.isArray(uiSurface.visibleButtons) ? uiSurface.visibleButtons.map(asText) : []),
    ...(Array.isArray(uiSurface.disabledButtons) ? uiSurface.disabledButtons.map(asText) : []),
  ]).join(' • ');
}

export function companyPlanningCenterSurfaceText({ screenPath = '', screenDefinition = null, screenContext = null, sourceScreenDefinition = null, sourceScreenContext = null, conversationState = null } = {}) {
  const path = normalizeLooseText(firstNonEmpty(
    screenPath,
    screenDefinition?.path,
    screenContext?.path,
    sourceScreenDefinition?.path,
    sourceScreenContext?.path,
    '',
  ));
  if (path === '/company') return 'planlama merkezi';
  return normalizeLooseText(uniqueStrings([
    screenDefinition?.label,
    screenContext?.label,
    sourceScreenDefinition?.label,
    sourceScreenContext?.label,
    screenDefinition?.menuPurpose,
    screenContext?.menuPurpose,
    sourceScreenDefinition?.menuPurpose,
    sourceScreenContext?.menuPurpose,
    companyPlanningUiSurfaceText(conversationState),
  ]).join(' • '));
}

export function isPlanningCenterPath(value) {
  const text = normalizeLooseText(value);
  if (!text) return false;
  return /\/(company|school|organization)(?:\/|$)/.test(text)
    && /(planning|workflow|plan|guided|operations|modal)/.test(text);
}

export function companyPlanningCenterNextBestActionReply() {
  return [
    'Yeni işi kurma ve planlama için Planlama Merkezi\'nde sıradaki doğru işlem planın durumuna bağlıdır.',
    'Henüz planı başlatmadıysan Yeni Plan Oluştur veya Rehberi Başlat\'a bas.',
    'Plan başladıysa önce paket, tarih, saat, servis yönü ve kapsamı kontrol et.',
    'Personel eklendiyse adres ve konum eksiklerini tamamla.',
    'Konumlar tamamsa durakları hazırla ve rota önizlemesini kontrol et.',
    'Plan uygunsa oluşan vardiyayı Vardiyalar ekranında takip et, sonra teklif ve sözleşme hazırlığına geç.',
  ].join(' ');
}

export function companyPlanningCenterPurposeReply() {
  return [
    'Planlama Merkezi yeni işi kurma ve planlama akışını yönetmek için kullanılır.',
    'Burada paket, tarih, saat, servis yönü, kapsam, personel, adres / konum, durak ve rota önizlemesini kontrol edersin.',
    'Yeni Plan Oluştur veya Rehberi Başlat ile yeni akışı açarsın.',
    'Plan netleşince Vardiyalar ekranında takip edersin, sonra teklif ve sözleşme hazırlığına geçersin.',
  ].join(' ');
}

export function companyPlanningCenterDetailReply() {
  return [
    'Planlama Merkezi > Yeni Plan Oluştur / Rehberi Başlat.',
    'Paket, tarih, saat, servis yönü ve kapsam.',
    'Şirket konumunu ve servis başlangıç noktasını.',
    'Excel ile toplu ekle ya da tek tek.',
    'Personel Konum Seçici ile haritada mevcut konumu düzelt.',
    'Adres / konum doğruluğunu kontrol et.',
    'Durakları hazırla; yakın adresleri uygun duraklarda topla; rota önizlemesini kontrol et.',
    'Taslak vardiyayı oluştur.',
    'Vardiyalar ekranında takip et.',
    'Oda veya sağlayıcıdan teklif alma hazırlığı.',
    'Sözleşme hazırlığı.',
  ].join(' ');
}
