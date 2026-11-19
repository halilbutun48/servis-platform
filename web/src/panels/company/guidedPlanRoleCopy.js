export function guidedPlanStepTitle(step, who, { organization = false, school = false } = {}) {
  if (organization) {
    if (step === 0) return "1) Toplanma Konumu";
    if (step === 1) return "2) Plan paketi";
    if (step === 2) return "3) Kişi sayısı + yerler";
    if (step === 3) return "4) Ön izleme + teklif";
    return "";
  }
  if (step === 0) return school ? "1) Okul konumu" : "1) Şirket konumu";
  if (step === 1) return "2) Plan paketi";
  if (step === 2) return `3) ${who} + Durak`;
  if (step === 3) return "4) Ön izleme + teklif";
  return "";
}

export function guidedPlanHubSavedMessage({ organization = false, school = false } = {}) {
  if (organization) return "Toplanma konumu kaydedildi.";
  if (school) return "Okul konumu kaydedildi.";
  return "Firma konumu kaydedildi.";
}

export function guidedPlanHubCopy({ organization = false, school = false } = {}) {
  if (organization) {
    return {
      description: "1. adımda gezi için toplanma konumunu ayarla. Bu nokta turun başlangıç merkezi olur.",
      placeholder: "Toplanma konumu adresi (örn. Denizli Forum önü)",
      latitude: "Toplanma konumu enlemi",
      longitude: "Toplanma konumu boylamı",
      loading: "Toplanma Konumu okunuyor...",
      save: "Toplanma konumunu kaydet",
    };
  }
  if (school) {
    return {
      description: "1. adımda okulun hizmet konumunu ayarla.",
      placeholder: "Okul konumu adresi (örn. Ankara Çankaya ...)",
      latitude: "Okul konumu enlemi",
      longitude: "Okul konumu boylamı",
      loading: "Okul konumu okunuyor...",
      save: "İleri",
    };
  }
  return {
    description: "1. adımda firma kendi konumunu ayarlar.",
    placeholder: "Adresten konum al (örn. Ankara Çankaya ...)",
    latitude: "Firma konumu enlemi",
    longitude: "Firma konumu boylamı",
    loading: "Firma Konumu okunuyor...",
    save: "İleri",
  };
}
