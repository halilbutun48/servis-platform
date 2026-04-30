function resolveRoleKey(role) {
  const key = String(role || '').trim().toUpperCase();
  if (key === 'PERSONEL' || key === 'PARENT') return key;
  return 'PERSONEL';
}

function cleanText(value, fallback = '') {
  const text = String(value || fallback || '').replace(/\s+/g, ' ').trim();
  return text || fallback || '';
}

export function buildLinkAccessState({
  role = 'PERSONEL',
  roleLive = null,
} = {}) {
  const key = resolveRoleKey(role);
  const kvkkBlocked = Boolean(roleLive?.blocked);
  const current = roleLive?.current || null;
  const activeService = Boolean(current);
  const visibilityReady = Boolean(activeService && !kvkkBlocked);
  const visibilityLabel = key === 'PARENT' ? 'Bağlı öğrenci için görünür' : 'Bağlı servis için görünür';

  return {
    role: key,
    title: key === 'PARENT' ? 'Veli link süresi ve takip yetkisi' : 'Personel link süresi ve takip yetkisi',
    subtitle: 'Davet bağlantısı, takip süresi ve görünürlük kuralları burada özetlenir.',
    statusText: kvkkBlocked ? 'KVKK kapalı' : activeService ? 'Takip açık' : 'Takip bekliyor',
    tone: kvkkBlocked ? 'warn' : activeService ? 'ok' : 'info',
    scopeLabel: key === 'PARENT' ? 'Veli erişimi' : 'Personel erişimi',
    linkLabel: 'Davet bağlantısı 7 gün geçerlidir.',
    lifetimeLabel: 'Aktivasyon sonrası ilişki aktif kaldıkça sürer.',
    expiryLabel: 'Davet bağlantısı tek kullanımlıktır ve iptal edilebilir.',
    trackingLabel: visibilityReady
      ? (key === 'PARENT'
        ? 'Takip yalnız bağlı öğrenci için görünür.'
        : 'Takip yalnız bağlı servis için görünür.')
      : (key === 'PARENT'
        ? 'Takip yalnız bağlı öğrenci için görünür ama görünürlük bekleniyor.'
        : 'Takip yalnız bağlı servis için görünür ama görünürlük bekleniyor.'),
    activeServiceLabel: activeService ? 'Aktif servis bulundu.' : 'Aktif servis bulunmuyor.',
    kvkkLabel: kvkkBlocked ? 'KVKK engeli var.' : 'KVKK hazır.',
    summary: key === 'PARENT'
      ? 'Veli erişimi bağlı öğrenci ve aktif servis ile sınırlıdır.'
      : 'Personel erişimi bağlı servis ve aktif vardiya ile sınırlıdır.',
    checklist: [
      'Davet bağlantısı tek kullanımlıktır.',
      'Varsayılan süre 7 gündür.',
      'Aktivasyon sonrası ilişki aktif kaldıkça sürer.',
      'KVKK kapalıysa takip görünmez.',
    ],
    currentChildName: cleanText(current?.childName || current?.name || '-', '-'),
    currentShiftLabel: cleanText(current?.shiftStatus || current?.statusText || '-', '-'),
  };
}
