function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function positiveInt(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function cleanText(value, fallback = '') {
  const text = String(value || fallback || '').replace(/\s+/g, ' ').trim();
  return text || fallback || '';
}

export function buildParentActivationState({
  roleLive = null,
  selectedChildId = null,
} = {}) {
  const children = Array.isArray(roleLive?.children) ? roleLive.children.filter(isPlainObject) : [];
  const childCount = children.length;
  const selectedId = positiveInt(selectedChildId);
  const selectedChild = selectedId
    ? children.find((item) => Number(item?.id || 0) === selectedId) || children[0] || null
    : children[0] || null;
  const active = childCount > 0;

  return {
    title: 'Veli aktivasyon modeli',
    subtitle: 'Davet, ilk giriş ve ilişki kapanışı burada özetlenir. Kullanıcı kodu ve PIN ile giriş yapılır.',
    statusText: active ? 'Aktif' : 'Aktivasyon bekliyor',
    tone: active ? 'ok' : 'warn',
    modelLabel: 'Veli daveti',
    inviteLabel: 'Davet bağlantısı ilk aktivasyon içindir.',
    firstLoginLabel: 'İlk girişte PIN/şifre değişimi gerekli.',
    deviceLabel: 'Veli oturumu tek cihazda korunur.',
    closureLabel: 'İlişki kaldırılırsa takip kapanır.',
    accessScopeLabel: 'Canlı takip yetkisi rolüne göre açılır.',
    childCount,
    selectedChildName: cleanText(selectedChild?.fullName || selectedChild?.name || '-', '-'),
    selectedChildCompany: cleanText(selectedChild?.company?.name || selectedChild?.companyName || '-', '-'),
    summary: active
      ? `${childCount} bağlı öğrenci için veli erişimi açık.`
      : 'Bağlı öğrenci görünmeden veli erişimi açılmaz.',
    checklist: [
      'Kullanıcı kodu ve PIN ile giriş yapılır.',
      'İlk girişte şifre değiştirme ekranı açılır.',
      'Canlı takip yetkisi rolüne göre açılır.',
      'Bağlı öğrenci seçilince takip açılır.',
      'İlişki kaldırılırsa takip kapanır.',
      'Davet bağlantısı iptal edilebilir.',
    ],
  };
}
