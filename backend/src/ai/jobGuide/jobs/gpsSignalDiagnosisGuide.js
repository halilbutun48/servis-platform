import { pickTerms } from "../glossary.js";

function ageText(at) {
  if (!at) return null;
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "çok yeni";
  return `${min} dakika önce`;
}

export function buildGpsSignalDiagnosisGuide(context) {
  const activeDeviceCount = Number(context?.activeDeviceCount || 0);
  const hasDriver = !!context?.driver?.id;
  const lastSeen = ageText(context?.gpsLast?.at);
  const stale = String(context?.gpsState?.lastUiStatus || "") === "STALE";
  const summary = !context?.gpsLast?.at
    ? "Bu araç için son konum görünmüyor. Önce telefon GPS'i ve cihaz GPS'i tarafını ayrı ayrı kontrol et."
    : stale
      ? `Bu araç için son konum ${lastSeen || "görünüyor"} ama veri stale durumda.`
      : `Bu araç için son konum ${lastSeen || "görünüyor"}; önce kaynağın hangi taraftan geldiğini doğrula.`;
  return {
    jobTitle: "GPS sinyal teşhisi",
    jobPurpose: "Bu rehber, konum neden görünmüyor veya neden gecikiyor sorusunu sade adımlarla teşhis etmene yardım eder.",
    plainSummary: summary,
    whatToDoNow: "Önce son konum zamanına ve aktif konum kaynağına bak.",
    whatToDoNext: hasDriver
      ? "Sonra sürücünün telefon GPS'i tarafını kontrol et; gerekirse cihaz GPS'i durumunu karşılaştır."
      : "Sonra cihaz GPS'i aktif mi ve veri geliyor mu kontrol et.",
    doNotDo: "Tek bir kaynağa bakıp diğer konum kaynağını yok sayma.",
    stepByStep: [
      context?.gpsLast?.at ? `Son konum zamanı: ${lastSeen}.` : "Son konum zamanı görünmüyor.",
      hasDriver ? "Bağlı sürücünün telefon GPS'i akışını kontrol et." : "Bağlı sürücü görünmüyorsa telefon GPS'i akışı bekleme.",
      activeDeviceCount > 0 ? `Aktif cihaz GPS'i sayısı: ${activeDeviceCount}.` : "Aktif cihaz GPS'i görünmüyorsa cihaz tarafını önce bağla veya doğrula.",
      stale ? "Veri stale görünüyorsa son ingest ve güncelleme zamanını doğrula." : "Veri görünüyorsa kaynağın doğru araca bağlı olduğunu doğrula.",
    ],
    commonMistakes: [
      "Son konum yokken sadece haritaya bakıp karar vermek.",
      "Telefon GPS'i ile cihaz GPS'i tarafını ayrı kontrol etmemek.",
      "Stale veriyi canlı sanmak.",
    ],
    doneChecklist: [
      "Son konum zamanı görüldü veya yokluğu netleşti.",
      "Telefon GPS'i ve cihaz GPS'i ayrı ayrı kontrol edildi.",
      "Sorunun hangi tarafta olduğu daha net hale geldi.",
    ],
    simpleTerms: pickTerms(["telefonGps", "cihazGps", "konumKaynagi"]),
    screenExplanation: "Bu ekran, konum neden görünmüyor veya neden gecikiyor sorusunu adım adım cevaplamak için kullanılır.",
  };
}
