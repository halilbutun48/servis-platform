export function buildPersonelActivationState(me = null) {
  const personelId = Number(me?.personelId || 0) || null;
  const activationPending = Boolean(me?.requirePasswordChange);
  const active = Boolean(personelId) && !activationPending;

  return {
    statusText: active ? "Aktif" : "Aktivasyon bekliyor",
    tone: active ? "ok" : "warn",
    modelLabel: "Kurum daveti",
    firstLoginLabel: activationPending ? "İlk girişte PIN/şifre değişimi gerekli" : "İlk giriş tamamlandı",
    deviceLabel: "Cihaz eşleşmesi korunur",
    closureLabel: "Hesap pasife alınırsa canlı takip kapanır",
    summary: "Personel hesabı kurum davetiyle açılır; ilk girişte erişim kişiselleştirilir.",
    checklist: [
      "Kurum hesabı açılır.",
      "İlk girişte PIN/şifre değişimi yapılır.",
      "Cihaz eşleşmesi korunur.",
      "Hesap pasife alınırsa erişim kapanır.",
    ],
    personelId,
    activationPending,
  };
}
