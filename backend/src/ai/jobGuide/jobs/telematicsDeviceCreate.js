import { pickTerms } from "../glossary.js";

export function buildTelematicsDeviceCreateGuide(context) {
  const activeDeviceCount = Number(context?.activeDeviceCount || 0);
  const hasDriver = !!context?.driver?.id;
  const hasGpsLast = !!context?.gpsLast?.at;
  const companyBits = Array.isArray(context?.currentCompanyNames) && context.currentCompanyNames.length
    ? context.currentCompanyNames.join(", ")
    : "aktif iş görünmüyor";
  return {
    jobTitle: "Cihaz GPS'i ekleme",
    jobPurpose: "Bu rehber, araçtaki cihaz GPS'ini sisteme eklemek veya mevcut cihaz kaydını kontrol etmek için kullanılır.",
    plainSummary: activeDeviceCount > 0
      ? "Bu araçta cihaz GPS'i zaten görünüyor. Önce mevcut cihazı kontrol et, gerekirse yeni kayıt aç."
      : "Bu araçta aktif cihaz GPS'i görünmüyor. Önce araç için cihaz kaydı açıp aktif duruma getir.",
    whatToDoNow: activeDeviceCount > 0
      ? "Önce mevcut cihazın doğru araçta ve aktif durumda olduğundan emin ol."
      : "Önce cihaz türünü ve araç bilgisini netleştir, sonra cihaz kaydı aç.",
    whatToDoNext: hasGpsLast
      ? "Kaydı kontrol ettikten sonra test verisinin gelmeye devam ettiğini doğrula."
      : "Kaydı açtıktan sonra test verisinin geldiğini doğrula.",
    doNotDo: "Çalışan cihaz varken aynı araç için gereksiz ikinci aktif kayıt açma.",
    stepByStep: [
      `Araç plakasını kontrol et: ${context?.plate || "-"}.`,
      activeDeviceCount > 0 ? `Aktif cihaz sayısına bak: ${activeDeviceCount}.` : "Yeni cihaz için sağlayıcı veya bağlantı tipini seç.",
      "Cihaz kaydını araçla eşleştir ve aktif duruma getir.",
      hasGpsLast ? "Son konum zamanının güncellendiğini kontrol et." : "Test verisi geldikten sonra son konum zamanını kontrol et.",
      `Bu araç şu an şu şirketlerle ilişkili görünüyor: ${companyBits}.`,
    ],
    commonMistakes: [
      "Çalışan cihaz varken gereksiz yeni aktif cihaz açmak.",
      "Araç eşleştirmesini yanlış yapıp veriyi başka araca göndermek.",
      "Test verisi gelmeden kurulum tamam sanmak.",
    ],
    doneChecklist: [
      "Araç için cihaz kaydı göründü.",
      "Cihaz durumu aktif olarak görüldü.",
      "Son konum veya test verisi görülüyorsa kurulum çalışıyor demektir.",
    ],
    simpleTerms: pickTerms(["cihazGps", "konumKaynagi", hasDriver ? "telefonGps" : null]),
    screenExplanation: "Bu ekran, araçtaki cihaz GPS'ini sisteme eklemek ve doğru araca bağlı olduğunu doğrulamak için kullanılır.",
  };
}
