const TERMS = {
  sozlesme: { term: "sözleşme", meaning: "Planlı ve anlaşmalı iş kaydı", aliases: ["sözleşme", "sozlesme", "agreement"] },
  teklif: { term: "teklif", meaning: "Bu iş için verilen çalışma önerisi", aliases: ["teklif", "offer"] },
  atama: { term: "atama", meaning: "İşe araç veya sürücü bağlama işlemi", aliases: ["atama", "assignment"] },
  telefonGps: { term: "sürücünün telefon GPS'i", meaning: "Sürücünün uygulamasından gelen konum", aliases: ["telefon gps", "telefon gps'i", "surucunun telefon gps", "driver gps", "sürücünün telefon gps'i"] },
  cihazGps: { term: "cihaz GPS'i", meaning: "Araçtaki cihazdan gelen konum", aliases: ["cihaz gps", "device gps", "telematics cihaz", "araç cihazı"] },
  konumKaynagi: { term: "konum kaynağı", meaning: "Konum bilgisinin geldiği yer", aliases: ["konum kaynağı", "konum kaynagi", "location source"] },
  islemKaydi: { term: "işlem kaydı", meaning: "Sistemde ne olduğunun kayıt altına alınmış hali", aliases: ["işlem kaydı", "islem kaydi", "log", "loglar", "audit", "audit log"] },
  bildirim: { term: "bildirim", meaning: "Kullanıcıya giden uyarı veya haber", aliases: ["bildirim", "bildirimler", "notification", "notifications"] },
  yedek: { term: "yedek", meaning: "Geri yükleme için saklanan kopya", aliases: ["yedek", "backup"] },
  saklamaSuresi: { term: "saklama süresi", meaning: "Kayıtların sistemde tutulduğu süre", aliases: ["saklama süresi", "saklama suresi", "retention"] },
  hub: { term: "Hub", meaning: "Personelin toplandığı ya da bırakıldığı ana nokta", aliases: ["hub", "ana nokta", "toplama noktası", "toplanma noktası", "birakma noktasi", "bırakma noktası"] },
  inbound: { term: "Inbound", meaning: "Personeli toplayıp merkeze veya hub'a götüren yön", aliases: ["inbound", "toplama yönü", "toplama yonu"] },
  outbound: { term: "Outbound", meaning: "Hub'dan çıkıp personeli bırakma yönü", aliases: ["outbound", "dağıtım yönü", "dagitim yonu", "bırakma yönü", "birakma yonu"] },
  girisDaveti: { term: "giriş daveti", meaning: "Hesaba giriş oluşturmak için gönderilen davet", aliases: ["giriş daveti", "giris daveti", "hesap daveti", "auth invite", "invite"] },
  erisimLinki: { term: "erişim linki", meaning: "Hesapsız veya hızlı erişim için paylaşılan bağlantı", aliases: ["erişim linki", "erisim linki", "access link", "link"] },
  konumIncele: { term: "Konum İncele", meaning: "Konum verisinin neden eksik veya hatalı göründüğünü kontrol ettiğin ekran", aliases: ["konum incele", "geo review", "georeview", "lokasyon incele", "öğrenci konum incele"] },
  osrm: { term: "OSRM", meaning: "Yol ve süre hesabı yapan servis", aliases: ["osrm", "yol hesabı", "sure hesabi servisi", "rota hesabı"] },
  matrix: { term: "Matrix", meaning: "Birden çok nokta için toplu süre ve mesafe tablosu", aliases: ["matrix", "matris", "süre tablosu", "sure tablosu", "distance matrix"] },
  sureHesabi: { term: "Süre hesabını yenile", meaning: "Seçili noktalar için yol ve süre hesabını yeniden çalıştırma işlemi", aliases: ["matrix al", "matrix çöz", "matrix coz", "süre hesabını yenile", "sure hesabini yenile", "yol hesaplarını çıkar", "yol hesaplarini cikar"] },
  checkin: { term: "Check-in", meaning: "Kişinin araca bindiğini, indiğini veya varlığını doğrulayan kayıt", aliases: ["check-in", "checkin", "indi bindi", "qr giriş", "nfc giriş"] },
};

function normalizeText(value) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR");
}

export function pickTerms(keys) {
  return (Array.isArray(keys) ? keys : [])
    .map((key) => TERMS[String(key || "")])
    .filter(Boolean)
    .map((row) => ({ term: row.term, meaning: row.meaning }));
}

export function explainTermsFromText(text, limit = 4) {
  const value = normalizeText(text);
  if (!value) return [];
  const rows = Object.values(TERMS).filter((row) => (Array.isArray(row.aliases) ? row.aliases : []).some((alias) => value.includes(normalizeText(alias))));
  return rows.slice(0, limit).map((row) => `${row.term}: ${row.meaning}`);
}
