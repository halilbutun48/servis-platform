function resolveRoleKey(role) {
  const key = String(role || '').trim().toUpperCase();
  if (key === 'DRIVER' || key === 'PERSONEL' || key === 'PARENT' || key === 'COMPANY' || key === 'SCHOOL' || key === 'ROOM' || key === 'SUPER_ADMIN') {
    return key;
  }
  return 'PERSONEL';
}

const BASE_ROWS = [
  {
    role: 'DRIVER',
    roleLabel: 'Sürücü',
    visibility: 'Kendi atanmış görev ve rotası',
    gate: "Aktif vardiya + yetkili oturum",
    note: "Sürücünün telefon GPS'i yalnız kendi görevinde görünür.",
  },
  {
    role: 'PERSONEL',
    roleLabel: 'Personel',
    visibility: 'Kendi atanmış servisi',
    gate: 'Bağlı servis + aktif atama',
    note: 'Bağlı servis dışı görünmez.',
  },
  {
    role: 'PARENT',
    roleLabel: 'Veli',
    visibility: 'Bağlı öğrenci / çocuk',
    gate: 'Bağlı öğrenci + aktif servis',
    note: 'Başka çocuklar görünmez.',
  },
  {
    role: 'COMPANY',
    roleLabel: 'Hizmet Alan Firma',
    visibility: 'Kendi personel servisleri',
    gate: 'Firma kapsamı + atama',
    note: 'Sözleşme ve vardiya ilişkisiyle sınırlıdır.',
  },
  {
    role: 'SCHOOL',
    roleLabel: 'Okul',
    visibility: 'Kendi öğrenci servisleri',
    gate: 'Okul kapsamı + atama',
    note: 'Bağlı öğrenciler görünür.',
  },
  {
    role: 'ROOM',
    roleLabel: 'Taşımacılık Firması',
    visibility: 'Kendi operasyon alanı',
    gate: 'Taşımacılık Firması kapsamı + yetki',
    note: 'Operasyon izleme amaçlıdır.',
  },
  {
    role: 'SUPER_ADMIN',
    roleLabel: 'Super Admin',
    visibility: 'Denetim ve audit',
    gate: 'Rol + step-up + audit',
    note: 'Günlük operasyon yönetmez.',
  },
];

export function buildKvkkVisibilityMatrixState({
  role = 'PERSONEL',
  roleLive = null,
} = {}) {
  const currentRole = resolveRoleKey(role);
  const blocked = Boolean(roleLive?.blocked);
  const rows = BASE_ROWS.map((item) => ({
    ...item,
    current: item.role === currentRole,
  }));

  return {
    title: 'KVKK görünürlük matrisi',
    subtitle: 'Rol bazlı takip görünürlüğü ve kapı kuralları burada özetlenir.',
    currentRole,
    blocked,
    blockedLabel: blocked ? 'KVKK kapalı' : 'KVKK hazır',
    summary: 'Atama yoksa takip yok. Aktif servis yoksa takip yok. KVKK kapalıysa GPS yok.',
    rows,
  };
}
