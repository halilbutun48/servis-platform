import { pickTerms } from "../glossary.js";

export function buildLocationSourceGuide(context) {
  const hasDriver = !!context?.driver?.id;
  const activeDeviceCount = Number(context?.activeDeviceCount || 0);
  const hasGpsLast = !!context?.gpsLast?.at;
  const shiftCount = Number((context?.currentShiftIds || []).length || 0);
  const sourceSummary = hasDriver && activeDeviceCount > 0
    ? "Bu araçta hem sürücünün telefon GPS'i hem cihaz GPS'i birlikte düşünülebilir."
    : hasDriver
      ? "Bu araçta ana konum kaynağı sürücünün telefon GPS'i gibi görünüyor."
      : activeDeviceCount > 0
        ? "Bu araçta cihaz GPS'i görünür durumda; telefon GPS'i bağı zayıf veya görünmüyor olabilir."
        : "Bu araçta ne telefon GPS'i ne de aktif cihaz GPS'i net görünüyor.";
  return {
    jobTitle: "Konum kaynağı rehberi",
    jobPurpose: "Bu rehber, bu araçta konum bilgisinin sürücünün telefon GPS'inden mi yoksa cihaz GPS'inden mi beklendiğini sade dille açıklar.",
    plainSummary: sourceSummary,
    whatToDoNow: "Önce bu araçta ana konum kaynağının ne olduğunu kontrol et.",
    whatToDoNext: activeDeviceCount > 0
      ? "Cihaz GPS'i bağlıysa test verisinin bu araçta göründüğünü doğrula."
      : "İstersen cihaz GPS'ini ek konum kaynağı olarak bağlamayı değerlendir.",
    doNotDo: "Cihaz GPS'i eklendi diye sürücünün telefon GPS'i artık hiç kullanılmaz diye düşünme.",
    stepByStep: [
      hasDriver ? "Bu araçta bağlı sürücü görünüyor; telefon GPS'i hattını buna göre düşün." : "Bağlı sürücü görünmüyorsa telefon GPS'i hattı zayıf kalabilir.",
      activeDeviceCount > 0 ? `Aktif cihaz GPS'i sayısı: ${activeDeviceCount}.` : "Aktif cihaz GPS'i görünmüyor; cihaz tarafı henüz bağlı olmayabilir.",
      hasGpsLast ? "Son konum zamanı görünüyor; kaynağın güncel kalıp kalmadığını kontrol et." : "Son konum görünmüyorsa hem telefon hem cihaz tarafını ayrı ayrı kontrol et.",
      shiftCount > 0 ? `Aktif iş sayısı: ${shiftCount}. Canlı iş varken konum kaynağı daha kritik hale gelir.` : "Aktif iş görünmüyorsa önce temel bağlantıyı netleştir.",
    ],
    commonMistakes: [
      "Sistemin ana akışını cihaz GPS'i sanmak.",
      "Telefon GPS'i ile cihaz GPS'ini aynı şeymiş gibi düşünmek.",
      "Cihaz bağlı değilken veri beklemek.",
    ],
    doneChecklist: [
      "Bu araçta hangi konum kaynağının kullanıldığı netleşti.",
      "Cihaz GPS'i varsa araçla ilişkisi doğrulandı.",
      "Canlı iş varsa konum beklentisi buna göre kontrol edildi.",
    ],
    simpleTerms: pickTerms(["telefonGps", "cihazGps", "konumKaynagi"]),
    screenExplanation: "Bu ekran, konumun hangi kaynaktan beklendiğini anlaman için kullanılır.",
  };
}
