export const TRUST_QUALITY_DIMENSIONS = [
  { id: "service_receiver_feedback", label: "Hizmet alan degerlendirmesi", status: "ACTIVE" },
  { id: "provider_quality_summary", label: "Saglayici kalite ozeti", status: "ACTIVE" },
  { id: "eta_quality_signal", label: "ETA kalite sinyali", status: "PLANNED" },
  { id: "no_show_compliance", label: "No-show ve uyum gorunurlugu", status: "PLANNED" },
  { id: "decision_support", label: "Karar destek yuzeyi", status: "PLANNED" },
];

export const TRUST_QUALITY_RULES = [
  "Degerlendirme mantigi tamamlanan hizmet sonrasi acilacak sekilde kurgulanir.",
  "Saglayici kalite sinyali gelecek teklif ve secim kararlarini destekler.",
  "No-show, iptal, uyum ve ETA kalite alanlari kalite ozetini besler.",
  "M63 green olmadan M64 acilmaz.",
];

export function getTrustQualityManifest() {
  return {
    activeMilestone: "M63",
    title: "Guven + Kalite + Hizmet Degerlendirme",
    dimensions: TRUST_QUALITY_DIMENSIONS,
    rules: TRUST_QUALITY_RULES,
  };
}

export function buildServiceEvaluationTemplate() {
  return {
    activeMilestone: "M63",
    fields: ["zamaninda-baslama", "arac-uygunlugu", "surucu-davranisi", "operasyon-duzeni", "canli-takip-guveni", "genel-memnuniyet"],
    summary: "Hizmet alan kurumlarin tamamlanan hizmet sonrasi kalite degerlendirmesi icin iskelet.",
  };
}

export function buildProviderSignalTemplate() {
  return {
    activeMilestone: "M63",
    signals: ["hizmet-alan-puani", "no-show", "iptal", "uyum", "eta-kalite"],
    summary: "Saglayici kalite ve guven gorunurlugu icin ozet sinyal seti.",
  };
}
