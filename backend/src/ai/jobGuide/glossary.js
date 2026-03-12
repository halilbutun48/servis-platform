const TERMS = {
  sozlesme: { term: "sözleşme", meaning: "Planlı ve anlaşmalı iş kaydı" },
  teklif: { term: "teklif", meaning: "Bu iş için verilen çalışma önerisi" },
  atama: { term: "atama", meaning: "İşe araç veya sürücü bağlama işlemi" },
  telefonGps: { term: "sürücünün telefon GPS'i", meaning: "Sürücünün uygulamasından gelen konum" },
  cihazGps: { term: "cihaz GPS'i", meaning: "Araçtaki cihazdan gelen konum" },
  konumKaynagi: { term: "konum kaynağı", meaning: "Konum bilgisinin geldiği yer" },
  islemKaydi: { term: "işlem kaydı", meaning: "Sistemde yapılan işlemin kaydı" },
  yedek: { term: "yedek", meaning: "Geri yükleme için saklanan kopya" },
  saklamaSuresi: { term: "saklama süresi", meaning: "Kayıtların sistemde tutulduğu süre" },
};

export function pickTerms(keys) {
  return (Array.isArray(keys) ? keys : [])
    .map((key) => TERMS[String(key || "")])
    .filter(Boolean);
}
