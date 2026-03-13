import { pickTerms } from "./glossary.js";

function button(label, purpose, whenToUse, whatHappens, disabledReason = "Bu ekran veya rol için uygun koşul oluşmadan kapalı kalabilir.", riskNote = "") {
  return { label, purpose, whenToUse, whatHappens, disabledReason, riskNote };
}

function screen(id, path, label, cfg = {}) {
  return {
    id,
    path,
    label,
    menuPurpose: cfg.menuPurpose || "Bu ekran işi doğru sırayla tamamlamak için kullanılır.",
    forWhom: cfg.forWhom || "Bu ekran bu rol için uygundur.",
    firstStep: cfg.firstStep || "Önce listedeki kayıtları kontrol et.",
    nextStep: cfg.nextStep || "Sonra gerekirse ilgili alt ekrana geç.",
    doNotDo: cfg.doNotDo || "Ne yaptığını anlamadan kritik onay verme.",
    stepByStep: cfg.stepByStep || [],
    commonMistakes: cfg.commonMistakes || [],
    doneChecklist: cfg.doneChecklist || [],
    buttonGuides: cfg.buttonGuides || [],
    screenMenus: cfg.screenMenus || [],
    simpleTerms: cfg.simpleTerms || [],
  };
}

const ROOM = [
  screen(1101, "/room/map", "Canlı Takip", {
    menuPurpose: "Araçların ve işlerin canlı durumunu hızlıca görmek için kullanılır.",
    forWhom: "Oda operasyonunu yöneten kullanıcı içindir.",
    firstStep: "Önce haritada doğru aracı veya işi seç.",
    nextStep: "Sorun varsa ilgili vardiya veya araç ekranına geç.",
    doNotDo: "Sadece haritaya bakıp karar verme; gerekirse vardiya detayını da kontrol et.",
    stepByStep: ["Haritadaki aracı seç.", "Durum ve son konumu oku.", "Gerekirse vardiya veya araç ekranına geç."],
    commonMistakes: ["Eski konumu canlı sanmak.", "Yanlış aracı seçmek."],
    doneChecklist: ["Doğru araç seçildi.", "Canlı durum okundu."],
    buttonGuides: [
      button("Aracı aç", "Seçili aracı detaylı incelemeye götürür.", "Belirli bir araç hakkında daha fazla bilgi gerekince kullan.", "Araç detayına veya ilgili akışa geçilir."),
      button("Yenile", "Canlı bilgiyi tekrar yükler.", "Bilginin eski kaldığını düşünüyorsan kullan.", "Ekrandaki durumlar yeniden okunur."),
    ],
    screenMenus: [
      { label: "Vardiyalar", path: "/room/shifts", purpose: "Canlı durumun hangi işten geldiğini görmek için açılır." },
      { label: "Araçlar", path: "/room/vehicles", purpose: "Araç ve cihaz bilgisini kontrol etmek için açılır." },
    ],
    simpleTerms: pickTerms(["telefonGps", "cihazGps", "konumKaynagi"]),
  }),
  screen(1102, "/room/offers", "Teklifler", {
    menuPurpose: "Gelen teklifleri görmek, karşılaştırmak ve karar vermek için kullanılır.",
    forWhom: "Teklif ve pazarlık akışını yöneten oda kullanıcısı içindir.",
    firstStep: "Önce hangi teklifin hangi işe ait olduğunu kontrol et.",
    nextStep: "Karar vermeden önce araç, sürücü ve saat bilgisini karşılaştır.",
    doNotDo: "Teklifin bağlı olduğu işi anlamadan onay verme.",
    stepByStep: ["Teklifi seç.", "İşe bağlı bilgileri kontrol et.", "Uygunsa onay veya red kararı ver."],
    commonMistakes: ["Yanlış işe ait teklifi onaylamak.", "Araç ve sürücüyü kontrol etmeden karar vermek."],
    doneChecklist: ["Doğru teklif seçildi.", "Karar öncesi eksikler kontrol edildi."],
    buttonGuides: [
      button("Teklifi aç", "Teklif satırını detaylı inceler.", "Satırdaki bilgi yetmiyorsa kullan.", "Teklifin bağlı olduğu iş ve detaylar görünür."),
      button("Onay ver", "Seçili teklifi kabul eder.", "Araç, sürücü ve saat uygunsa kullan.", "Teklifin durumu güncellenir.", "Eksik bilgi varsa kapalı kalabilir.", "Yanlış teklifi onaylamak diğer kararları etkileyebilir."),
      button("Reddet", "Seçili teklifi kapatır.", "Teklif uygun değilse kullan.", "Teklif red durumuna geçer."),
    ],
    screenMenus: [
      { label: "Vardiyalar", path: "/room/shifts", purpose: "Teklifin bağlı olduğu işi ayrıntılı görmek için açılır." },
      { label: "Sözleşmeler", path: "/room/agreements", purpose: "İş sözleşmeye bağlıysa önce burayı kontrol et." },
    ],
    simpleTerms: pickTerms(["teklif", "sozlesme", "atama"]),
  }),
  screen(1103, "/room/shifts", "Vardiyalar", {
    menuPurpose: "İşleri, atamaları ve operasyon akışını yönetmek için kullanılır.",
    forWhom: "Odanın günlük işi yöneten kullanıcısı içindir.",
    firstStep: "Önce doğru vardiya kaydını seç.",
    nextStep: "Araç, sürücü ve durak durumunu kontrol et.",
    doNotDo: "Yanlış vardiyayı açıp işlem yapma.",
    stepByStep: ["Vardiyayı seç.", "Durumunu oku.", "Eksik alan varsa ilgili ekrana git."],
    commonMistakes: ["Yanlış vardiya üzerinde işlem yapmak.", "Durak bilgisi eksikken hazır sanmak."],
    doneChecklist: ["Doğru vardiya seçildi.", "Eksik alanlar görüldü."],
    buttonGuides: [
      button("Yeni oluştur", "Yeni iş kaydı açar.", "Yeni bir iş başlatılacaksa kullan.", "Boş bir kayıt akışı açılır."),
      button("Önizle", "Seçili işin özetini gösterir.", "Karar vermeden önce hızlı özet görmek istersen kullan.", "Kısa bilgi açılır."),
      button("Süre uzat", "Seçili işin süresini uzatma akışını açar.", "İş planı uzayacaksa kullan.", "Uzatma akışı açılır."),
    ],
    screenMenus: [
      { label: "Teklifler", path: "/room/offers", purpose: "Teklife bağlı kararları görmek için açılır." },
      { label: "Araçlar", path: "/room/vehicles", purpose: "Araç ve cihaz bilgisi için açılır." },
      { label: "Sürücüler", path: "/room/drivers", purpose: "Sürücü bağlama veya sürücü kontrolü için açılır." },
    ],
    simpleTerms: pickTerms(["atama", "teklif", "sozlesme"]),
  }),
  screen(1104, "/room/vehicles", "Araçlar", {
    menuPurpose: "Araç kayıtlarını, sürücü bağını ve cihaz GPS'i bilgisini yönetmek için kullanılır.",
    forWhom: "Araç ve konum kaynağı tarafını yöneten oda kullanıcısı içindir.",
    firstStep: "Önce doğru aracı seç.",
    nextStep: "Gerekirse sürücü bağı veya cihaz GPS'i bilgisine bak.",
    doNotDo: "Yanlış aracı seçip cihaz işlemi yapma.",
    stepByStep: ["Aracı seç.", "Durum ve bağları kontrol et.", "Gerekirse cihaz veya sürücü tarafına geç."],
    commonMistakes: ["Yanlış araca cihaz eklemek.", "Telefon GPS'i ile cihaz GPS'ini karıştırmak."],
    doneChecklist: ["Doğru araç seçildi.", "Konum kaynağı tarafı kontrol edildi."],
    buttonGuides: [
      button("Yeni araç", "Yeni araç kaydı açar.", "Araç sisteme ilk kez eklenecekse kullan.", "Yeni araç formu açılır."),
      button("Bağla", "Araç ile sürücüyü eşleştirme akışını açar.", "Telefon GPS'i tarafı için sürücü bağı gerekliyse kullan.", "Sürücü bağlama alanı açılır."),
      button("Telematics", "Cihaz GPS'i sekmesini açar.", "Araçtaki mevcut cihazı görmek veya eklemek için kullan.", "Cihaz GPS'i alanı görünür."),
    ],
    screenMenus: [
      { label: "Sürücüler", path: "/room/drivers", purpose: "Telefon GPS'i için bağlı sürücüyü kontrol et." },
      { label: "Vardiyalar", path: "/room/shifts", purpose: "Araç etkisini iş tarafında görmek için açılır." },
    ],
    simpleTerms: pickTerms(["telefonGps", "cihazGps", "konumKaynagi"]),
  }),
  screen(1105, "/room/drivers", "Sürücüler", {
    menuPurpose: "Sürücü kayıtlarını ve araç bağını yönetmek için kullanılır.",
    forWhom: "Sürücü planını yöneten oda kullanıcısı içindir.",
    firstStep: "Önce doğru sürücüyü seç.",
    nextStep: "Gerekirse araç bağını veya aktif işi kontrol et.",
    doNotDo: "Müsait olmayan sürücüyü bağlama.",
    stepByStep: ["Sürücüyü seç.", "Bağlı araç veya iş durumuna bak.", "Gerekirse araç ekranına geç."],
    commonMistakes: ["Yanlış sürücüyü bağlamak.", "Mevcut bağı görmeden yeni bağ yapmak."],
    doneChecklist: ["Doğru sürücü seçildi.", "Bağ durumu kontrol edildi."],
    buttonGuides: [
      button("Yeni sürücü", "Yeni sürücü kaydı açar.", "Yeni bir sürücü sisteme eklenecekse kullan.", "Yeni kayıt formu açılır."),
      button("Araca bağla", "Seçili sürücüyü bir araca bağlar.", "Telefon GPS'i akışı için sürücü ataması gerekiyorsa kullan.", "Bağlama akışı açılır."),
    ],
    screenMenus: [
      { label: "Araçlar", path: "/room/vehicles", purpose: "Sürücünün bağlı olacağı aracı seçmek için açılır." },
      { label: "Vardiyalar", path: "/room/shifts", purpose: "Sürücü etkisini iş ekranında görmek için açılır." },
    ],
    simpleTerms: pickTerms(["telefonGps", "atama"]),
  }),
  screen(1106, "/room/agreements", "Sözleşmeler", {
    menuPurpose: "Sözleşmeye bağlı işleri görmek ve yönetmek için kullanılır.",
    forWhom: "Sözleşmeli iş akışını takip eden oda kullanıcısı içindir.",
    firstStep: "Önce doğru sözleşmeyi seç.",
    nextStep: "İşe etkisini görmek için ilgili vardiyaya geç.",
    doNotDo: "Sözleşmeyi görmeden işe karar verme.",
    stepByStep: ["Sözleşmeyi seç.", "Durumunu ve kapsamını oku.", "Gerekirse vardiya veya teklif ekranına geç."],
    commonMistakes: ["Sözleşmeli işi normal teklif gibi düşünmek."],
    doneChecklist: ["Doğru sözleşme açıldı.", "İşe etkisi görüldü."],
    buttonGuides: [
      button("Onayla", "Seçili sözleşmeyi onaylar.", "Şartlar doğruysa kullan.", "Sözleşme durumu güncellenir."),
      button("İptal et", "Seçili sözleşmeyi pasif hale getirir.", "Sözleşme artık kullanılmayacaksa kullan.", "Durum iptal tarafına geçer.", "Koşullar uygun değilse kapalı kalabilir.", "Canlı işi etkileyebilir; önce bağlı işi kontrol et."),
      button("Uzat", "Sözleşme süresini uzatma akışını açar.", "Aynı iş devam edecekse kullan.", "Uzatma alanı açılır."),
    ],
    screenMenus: [
      { label: "Vardiyalar", path: "/room/shifts", purpose: "Sözleşmenin bağlı olduğu işi görmek için açılır." },
      { label: "Teklifler", path: "/room/offers", purpose: "Sözleşme dışı teklif akışını ayırmak için açılır." },
    ],
    simpleTerms: pickTerms(["sozlesme", "teklif"]),
  }),
  screen(1107, "/room/copilot", "Copilot", {
    menuPurpose: "Sorun yaşadığında rehber almak ve ilgili ekrana hızlı gitmek için kullanılır.",
    forWhom: "Ek yardım isteyen oda kullanıcısı içindir.",
    firstStep: "Önce yapmak istediğin işi seç.",
    nextStep: "Gerekirse bu ekran ne için var veya buton rehberini aç.",
    doNotDo: "İlgili kaydı seçmeden rastgele yorum bekleme.",
    stepByStep: ["İş veya ekran türünü seç.", "Rehberi çalıştır.", "Gerekirse hızlı geçişle ilgili ekrana git."],
    commonMistakes: ["Yanlış kayıt türünü seçmek."],
    doneChecklist: ["Doğru rehber seçildi.", "İlgili ekrana yönlendirme görüldü."],
    buttonGuides: [
      button("Rehberi aç", "Seçilen iş için sade rehber üretir.", "Ne yapacağını bilmiyorsan kullan.", "Adım adım yardım gelir."),
      button("Analiz et", "Gelişmiş copilot analizini çalıştırır.", "Daha derin teknik özet gerektiğinde kullan.", "Gelişmiş sonuç görünür."),
    ],
    screenMenus: [
      { label: "Sözleşmeler", path: "/room/agreements", purpose: "Sözleşme sorularında önce burayı aç." },
      { label: "Araçlar", path: "/room/vehicles", purpose: "Araç ve konum kaynağı sorularında buraya geç." },
    ],
    simpleTerms: pickTerms(["sozlesme", "telefonGps", "cihazGps"]),
  }),
  screen(1108, "/room/hub", "Hub", {
    menuPurpose: "Personelin toplandığı veya bırakıldığı ana noktayı görmek ve yönetmek için kullanılır.",
    forWhom: "Oda operasyonunu yöneten kullanıcı içindir.",
    firstStep: "Önce bu hub'ın hangi iş veya rota için kullanıldığını kontrol et.",
    nextStep: "Gerekirse vardiya veya teklif ekranına geç.",
    doNotDo: "Hub noktasını görmeden yön bilgisini kesin sanma.",
    stepByStep: ["Hub bilgisini oku.", "Konum doğru mu kontrol et.", "Gerekirse bağlı iş ekranına geç."],
    commonMistakes: ["Hub ile durakları karıştırmak.", "Inbound ve outbound yönünü karıştırmak."],
    doneChecklist: ["Hub anlamı netleşti.", "Bağlı iş veya yön kontrol edildi."],
    buttonGuides: [
      button("Hub'ı aç", "Seçili hub bilgisini detaylı görmek için kullanılır.", "Konumu veya bağlı işi görmek istediğinde kullan.", "Hub bilgisi detaylı görünür."),
      button("Haritada göster", "Hub noktasını haritada gösterir.", "Konumun doğru yerde olup olmadığını kontrol edeceğinde kullan.", "Hub haritada açılır."),
    ],
    screenMenus: [
      { label: "Vardiyalar", path: "/room/shifts", purpose: "Hub'ın bağlı olduğu işi görmek için açılır." },
      { label: "Teklifler", path: "/room/offers", purpose: "Hub'a bağlı teklif kararını görmek için açılır." },
    ],
    simpleTerms: pickTerms(["hub", "inbound", "outbound"]),
  }),
  screen(1109, "/room/checkin", "Check-in", {
    menuPurpose: "Biniş, iniş veya doğrulama kayıtlarını görmek için kullanılır.",
    forWhom: "Check-in tarafını takip eden oda kullanıcısı içindir.",
    firstStep: "Önce hangi kayıt veya iş için check-in baktığını seç.",
    nextStep: "Gerekirse vardiya ekranına dön.",
    doNotDo: "Check-in kaydı var diye işin tümü tamam sanma.",
    stepByStep: ["Kayıdı seç.", "Check-in olayını oku.", "Gerekirse bağlı işe dön."],
    commonMistakes: ["Check-in ile yoklamayı karıştırmak."],
    doneChecklist: ["Doğru check-in kaydı görüldü."],
    buttonGuides: [button("Kaydı aç", "Seçili check-in olayını açar.", "Detayı görmek istediğinde kullan.", "Kayıt detayı açılır.")],
    screenMenus: [{ label: "Vardiyalar", path: "/room/shifts", purpose: "Check-in kaydının bağlı olduğu işi görmek için açılır." }],
    simpleTerms: pickTerms(["checkin"]),
  }),
  screen(1110, "/room/auth-invites", "Giriş Davetleri", {
    menuPurpose: "Hesap açtırmak için gönderilen giriş davetlerini yönetmek için kullanılır.",
    forWhom: "Oda tarafında hesap erişimi açan kullanıcı içindir.",
    firstStep: "Önce kime davet gideceğini seç.",
    nextStep: "Daveti gönderip durumunu kontrol et.",
    doNotDo: "Giriş davetini erişim linki ile aynı şey sanma.",
    stepByStep: ["Kişiyi seç.", "Daveti oluştur.", "Durumunu kontrol et."],
    commonMistakes: ["Davet ile linki karıştırmak."],
    doneChecklist: ["Doğru davet üretildi."],
    buttonGuides: [button("Davet oluştur", "Yeni giriş daveti üretir.", "Yeni hesap erişimi vermek istediğinde kullan.", "Davet oluşur.")],
    screenMenus: [{ label: "Copilot", path: "/room/copilot", purpose: "Davet ve link farkını anlamadığında açılır." }],
    simpleTerms: pickTerms(["girisDaveti", "erisimLinki"]),
  }),
  screen(1111, "/shared/notifications", "Bildirimler", {
    menuPurpose: "Kullanıcılara giden uyarı ve haberleri görmek için kullanılır.",
    forWhom: "Bildirim takibi yapan kullanıcı içindir.",
    firstStep: "Önce hangi bildirimin hangi olaydan geldiğini oku.",
    nextStep: "Gerekirse ilgili iş veya kayıt ekranına geç.",
    doNotDo: "Bildirimi işlem kaydı ile aynı sanma.",
    stepByStep: ["Bildirimi seç.", "Ne anlattığını oku.", "Gerekirse ilgili yere git."],
    commonMistakes: ["Bildirimi log kaydı ile karıştırmak."],
    doneChecklist: ["Bildirim anlamı netleşti."],
    buttonGuides: [button("İlgili yere git", "Bildirimin bağlı olduğu ekrana götürür.", "Sorunun kaynağına gitmek istediğinde kullan.", "İlgili ekran açılır.")],
    screenMenus: [{ label: "Loglar", path: "/shared/logs", purpose: "Sistem kaydını karşılaştırmak için açılır." }],
    simpleTerms: pickTerms(["bildirim", "islemKaydi"]),
  }),
  screen(1112, "/shared/logs", "Loglar", {
    menuPurpose: "Sistemde ne olduğunun kayıt altına alınmış halini görmek için kullanılır.",
    forWhom: "İşlem kaydını kontrol eden kullanıcı içindir.",
    firstStep: "Önce hangi olay kaydını aradığını seç.",
    nextStep: "Gerekirse bildirime veya ilgili işe dön.",
    doNotDo: "Log kaydını kullanıcı bildirimi sanma.",
    stepByStep: ["Kayıdı filtrele.", "Olayı oku.", "Gerekirse bağlı ekrana git."],
    commonMistakes: ["Log ile bildirim farkını karıştırmak."],
    doneChecklist: ["İşlem kaydı anlamı netleşti."],
    buttonGuides: [button("Filtre uygula", "Kayıtları daraltır.", "Belirli olayı aradığında kullan.", "Liste daralır.")],
    screenMenus: [{ label: "Bildirimler", path: "/shared/notifications", purpose: "Kullanıcıya giden uyarıyı görmek için açılır." }],
    simpleTerms: pickTerms(["islemKaydi", "bildirim"]),
  }),
];

const COMPANY = [
  screen(2101, "/company", "Planlama Merkezi", {
    menuPurpose: "Şirketin ana planlama durumunu ve günlük işleri topluca görmek için kullanılır.",
    forWhom: "Şirket operasyonunu yöneten kullanıcı içindir.",
    firstStep: "Önce hangi işi veya sözleşmeyi inceleyeceğine karar ver.",
    nextStep: "Gerekirse vardiya veya sözleşme ekranına geç.",
    doNotDo: "Ana özet ekranına bakıp detay kontrolünü atlama.",
    stepByStep: ["Özet kartları oku.", "Gereken başlığa tıkla.", "Detay ekranda karar ver."],
    commonMistakes: ["Özet sayıyı tek başına karar gibi görmek."],
    doneChecklist: ["Doğru başlık seçildi.", "İlgili detay ekranına geçildi."],
    buttonGuides: [
      button("Kartı aç", "Özet kartın ilgili ekrana gitmesini sağlar.", "Bir sayı veya özetin detayını görmek için kullan.", "İlgili menü açılır."),
    ],
    screenMenus: [
      { label: "Vardiyalar", path: "/company/shifts", purpose: "Günlük iş akışını görmek için açılır." },
      { label: "Sözleşmeler", path: "/company/agreements", purpose: "Sözleşmeli işleri görmek için açılır." },
      { label: "Copilot", path: "/company/copilot", purpose: "Yardım ve açıklama için açılır." },
    ],
    simpleTerms: pickTerms(["sozlesme", "teklif", "atama"]),
  }),
  screen(2102, "/company/shifts", "Vardiyalar", {
    menuPurpose: "Şirket işlerini ve atama akışını yönetmek için kullanılır.",
    forWhom: "Şirket tarafında işi planlayan kullanıcı içindir.",
    firstStep: "Önce doğru işi seç.",
    nextStep: "Gerekirse sözleşme veya konum inceleme ekranına geç.",
    doNotDo: "Yanlış kayda işlem yapma.",
    stepByStep: ["İşi seç.", "Durumunu kontrol et.", "Gerekirse ilgili ekrana geç."],
    commonMistakes: ["Yanlış iş üzerinde karar vermek."],
    doneChecklist: ["Doğru iş seçildi.", "Durum okundu."],
    buttonGuides: [
      button("Yeni iş", "Yeni iş akışı açar.", "Yeni plan yapılacaksa kullan.", "Yeni iş formu açılır."),
      button("Önizle", "Seçili işin kısa özetini gösterir.", "Karar öncesi özet istersen kullan.", "Özet açılır."),
      button("Süre uzat", "İş süresini uzatma akışını açar.", "Aynı iş devam edecekse kullan.", "Uzatma alanı açılır."),
    ],
    screenMenus: [
      { label: "Sözleşmeler", path: "/company/agreements", purpose: "Sözleşmeye bağlı işleri ayrı görmek için açılır." },
      { label: "Konum İncele", path: "/company/georeview", purpose: "Konum tarafını görmek için açılır." },
    ],
    simpleTerms: pickTerms(["sozlesme", "atama"]),
  }),
  screen(2103, "/company/agreements", "Sözleşmeler", {
    menuPurpose: "Şirket tarafındaki sözleşmeli işleri görmek ve yönetmek için kullanılır.",
    forWhom: "Sözleşmeli plan akışını yöneten kullanıcı içindir.",
    firstStep: "Önce doğru sözleşmeyi seç.",
    nextStep: "Bağlı işi görmek için vardiya ekranına geç.",
    doNotDo: "Sözleşmeyi görmeden işin tamamını anlamış sayma.",
    stepByStep: ["Sözleşmeyi seç.", "Durumunu oku.", "Bağlı işe geç."],
    commonMistakes: ["Sözleşmeli akışı normal teklif akışıyla karıştırmak."],
    doneChecklist: ["Doğru sözleşme seçildi.", "Bağlı iş görüldü."],
    buttonGuides: [
      button("Oluştur", "Yeni sözleşme kaydı açar.", "Yeni sözleşmeli iş kurulacaksa kullan.", "Yeni sözleşme formu açılır."),
      button("Uzat", "Sözleşme süresini uzatır.", "Aynı sözleşme devam edecekse kullan.", "Uzatma akışı açılır."),
      button("İptal et", "Sözleşmeyi kapatır.", "Geçersiz veya bitmişse kullan.", "Sözleşme durumu kapanır."),
    ],
    screenMenus: [
      { label: "Vardiyalar", path: "/company/shifts", purpose: "Sözleşmenin bağlı olduğu işleri görmek için açılır." },
      { label: "Copilot", path: "/company/copilot", purpose: "Sözleşme hakkında rehber almak için açılır." },
    ],
    simpleTerms: pickTerms(["sozlesme", "teklif"]),
  }),
  screen(2104, "/company/access-links", "Personel Link", {
    menuPurpose: "Personel için paylaşılan erişim linklerini üretmek ve yönetmek için kullanılır.",
    forWhom: "Şirket tarafında bağlantı paylaşan kullanıcı içindir.",
    firstStep: "Önce hangi personel veya grup için link gerektiğini seç.",
    nextStep: "Süre ve paylaşım şeklini netleştir.",
    doNotDo: "Süresini kontrol etmeden link paylaşma.",
    stepByStep: ["Link türünü seç.", "Süreyi belirle.", "Oluşan linki güvenli paylaş."],
    commonMistakes: ["Süresi geçmiş linki kullanmak."],
    doneChecklist: ["Doğru link üretildi.", "Süre kontrol edildi."],
    buttonGuides: [
      button("Link oluştur", "Yeni erişim linki üretir.", "Yeni paylaşım yapılacaksa kullan.", "Yeni link oluşur."),
      button("Kopyala", "Oluşan linki panoya alır.", "Paylaşmadan önce kullan.", "Link kopyalanır."),
      button("İptal et", "Linki pasif hale getirir.", "Artık kullanılmayacaksa kullan.", "Link pasif olur."),
    ],
    screenMenus: [
      { label: "Giriş Davetleri", path: "/company/auth-invites", purpose: "Hesap tabanlı erişimler için açılır." },
      { label: "Copilot", path: "/company/copilot", purpose: "Link türünü anlamıyorsan rehber için aç." },
    ],
    simpleTerms: pickTerms(["girisDaveti", "erisimLinki"]),
  }),
  screen(2105, "/company/copilot", "Copilot", {
    menuPurpose: "Şirket ekranlarında ne yapacağını anlamadığında yardım almak için kullanılır.",
    forWhom: "Şirket kullanıcısı içindir.",
    firstStep: "Önce iş veya ekran rehberini seç.",
    nextStep: "Gerekirse hızlı geçişle ilgili ekrana git.",
    doNotDo: "İlgili ekranı seçmeden genel yorum bekleme.",
    stepByStep: ["Rehber türünü seç.", "Kayıt veya ekranı seç.", "Sonucu oku ve geçişi kullan."],
    commonMistakes: ["Yanlış ekran için rehber açmak."],
    doneChecklist: ["Doğru rehber seçildi.", "Gerekli ekran açıldı."],
    buttonGuides: [
      button("Rehberi aç", "Seçilen rehberi çalıştırır.", "Yol gösterecek sade yardım istediğinde kullan.", "Rehber sonucu görünür."),
      button("Analiz et", "Gelişmiş analizi çalıştırır.", "Detaylı yorum gerektiğinde kullan.", "Gelişmiş sonuç görünür."),
    ],
    screenMenus: [
      { label: "Vardiyalar", path: "/company/shifts", purpose: "İş detaylarını görmek için açılır." },
      { label: "Sözleşmeler", path: "/company/agreements", purpose: "Sözleşmeli işleri görmek için açılır." },
    ],
  }),
  screen(2106, "/company/hub", "Hub", {
    menuPurpose: "Personelin toplandığı veya bırakıldığı ana noktayı yönetmek için kullanılır.",
    forWhom: "Şirket operasyonunu yöneten kullanıcı içindir.",
    firstStep: "Önce hub bilgisinin doğru yerde olup olmadığını kontrol et.",
    nextStep: "Gerekirse ilgili iş veya rota ekranına geç.",
    doNotDo: "Hub olmadan rota ve yön hesabını tamam sanma.",
    stepByStep: ["Hub bilgisini aç.", "Konumu kontrol et.", "Gerekirse bağlı işe dön."],
    commonMistakes: ["Hub ile durağı karıştırmak.", "Inbound ve outbound yönünü karıştırmak."],
    doneChecklist: ["Hub anlamı netleşti.", "Konum kontrol edildi."],
    buttonGuides: [
      button("Kaydet", "Hub noktasını kaydeder.", "Hub bilgisi güncellenecekse kullan.", "Hub verisi kaydedilir."),
      button("Haritada seç", "Hub konumunu haritada seçmeyi açar.", "Noktayı elle seçmek istediğinde kullan.", "Harita seçimi açılır."),
    ],
    screenMenus: [
      { label: "Vardiyalar", path: "/company/shifts", purpose: "Hub'ın bağlı olduğu işi görmek için açılır." },
      { label: "Konum İncele", path: "/company/georeview", purpose: "Konum tarafını kontrol etmek için açılır." },
    ],
    simpleTerms: pickTerms(["hub", "inbound", "outbound"]),
  }),
  screen(2107, "/company/checkin", "Check-in", {
    menuPurpose: "Biniş, iniş veya doğrulama kayıtlarını görmek için kullanılır.",
    forWhom: "Check-in tarafını takip eden şirket kullanıcısı içindir.",
    firstStep: "Önce hangi kayıt için check-in baktığını seç.",
    nextStep: "Gerekirse ilgili iş ekranına dön.",
    doNotDo: "Check-in kaydını tek başına tüm operasyon sanma.",
    stepByStep: ["Kayıdı seç.", "Check-in olayını oku.", "Gerekirse iş ekranına dön."],
    commonMistakes: ["Check-in ile yoklama veya daveti karıştırmak."],
    doneChecklist: ["Doğru check-in kaydı görüldü."],
    buttonGuides: [button("Kaydı aç", "Seçili check-in olayını açar.", "Detay görmek istediğinde kullan.", "Kayıt detayı açılır.")],
    screenMenus: [{ label: "Vardiyalar", path: "/company/shifts", purpose: "Check-in kaydının bağlı olduğu işi görmek için açılır." }],
    simpleTerms: pickTerms(["checkin"]),
  }),
  screen(2108, "/company/auth-invites", "Giriş Davetleri", {
    menuPurpose: "Hesap tabanlı erişim vermek için giriş davetlerini yönetmek için kullanılır.",
    forWhom: "Şirket tarafında hesap erişimi açan kullanıcı içindir.",
    firstStep: "Önce davetin kime gideceğini seç.",
    nextStep: "Davet durumunu ve süresini kontrol et.",
    doNotDo: "Giriş davetini erişim linki ile aynı sanma.",
    stepByStep: ["Kişiyi seç.", "Daveti oluştur.", "Durumunu izle."],
    commonMistakes: ["Davet ile linki karıştırmak."],
    doneChecklist: ["Doğru davet üretildi."],
    buttonGuides: [button("Davet oluştur", "Yeni giriş daveti üretir.", "Yeni hesap erişimi vermek istediğinde kullan.", "Davet oluşur.")],
    screenMenus: [
      { label: "Personel Link", path: "/company/access-links", purpose: "Link ile davet farkını görmek için açılır." },
      { label: "Copilot", path: "/company/copilot", purpose: "Takıldığında açıklama almak için açılır." },
    ],
    simpleTerms: pickTerms(["girisDaveti", "erisimLinki"]),
  }),
  screen(2109, "/company/georeview", "Konum İncele", {
    menuPurpose: "Konum verisinin neden eksik, hatalı veya tutarsız göründüğünü kontrol etmek için kullanılır.",
    forWhom: "Konum tarafında sorun inceleyen şirket kullanıcısı içindir.",
    firstStep: "Önce hangi kayıt veya kişinin konumunu incelediğini seç.",
    nextStep: "Sorunun konum verisi mi, yol hesabı mı, yoksa eşleşme mi olduğunu ayır.",
    doNotDo: "Konum görünmüyor diye hemen tek sebep var sanma.",
    stepByStep: ["Kayıdı seç.", "Konum durumunu oku.", "Gerekirse ilgili iş veya araç ekranına dön."],
    commonMistakes: ["Konum İncele ile canlı haritayı aynı sanmak.", "OSRM ve matrix terimlerini anlamadan karar vermek."],
    doneChecklist: ["Sorun tipi netleşti."],
    buttonGuides: [
      button("Kaydı incele", "Seçili konum kaydını detaylı açar.", "Sorunun kaynağını görmek istediğinde kullan.", "Detay ekranı açılır."),
      button("İlgili işe git", "Sorunun bağlı olduğu iş ekranını açar.", "Sorunu iş bağlamında görmek istediğinde kullan.", "İlgili iş ekranı açılır."),
    ],
    screenMenus: [
      { label: "Vardiyalar", path: "/company/shifts", purpose: "Sorunun bağlı olduğu işi görmek için açılır." },
      { label: "Hub", path: "/company/hub", purpose: "Toplama veya bırakma noktasını kontrol etmek için açılır." },
    ],
    simpleTerms: pickTerms(["konumIncele", "osrm", "matrix", "sureHesabi"]),
  }),
  screen(2110, "/shared/notifications", "Bildirimler", {
    menuPurpose: "Kullanıcılara giden uyarı ve haberleri görmek için kullanılır.",
    forWhom: "Şirket kullanıcısı içindir.",
    firstStep: "Önce bildirimin ne anlattığını oku.",
    nextStep: "Gerekirse ilgili iş veya kayıt ekranına git.",
    doNotDo: "Bildirimi işlem kaydı ile aynı sanma.",
    stepByStep: ["Bildirimi seç.", "İçeriğini oku.", "Gerekirse ilgili yere git."],
    commonMistakes: ["Bildirim ile logu karıştırmak."],
    doneChecklist: ["Bildirim anlamı netleşti."],
    buttonGuides: [button("İlgili yere git", "Bildirimin bağlı olduğu ekrana götürür.", "Sorunun kaynağına gitmek istediğinde kullan.", "İlgili ekran açılır.")],
    screenMenus: [{ label: "Loglar", path: "/shared/logs", purpose: "Sistem kaydını karşılaştırmak için açılır." }],
    simpleTerms: pickTerms(["bildirim", "islemKaydi"]),
  }),
  screen(2111, "/shared/logs", "Loglar", {
    menuPurpose: "Sistemde ne olduğunun kayıt altına alınmış halini görmek için kullanılır.",
    forWhom: "Şirket kullanıcısı içindir.",
    firstStep: "Önce aradığın olayı seç veya filtrele.",
    nextStep: "Gerekirse ilgili bildirim veya iş ekranına dön.",
    doNotDo: "Log kaydını kullanıcı bildirimi sanma.",
    stepByStep: ["Kayıdı filtrele.", "Olayı oku.", "Gerekirse bağlı ekrana git."],
    commonMistakes: ["Log ile bildirimi aynı sanmak."],
    doneChecklist: ["İşlem kaydı anlamı netleşti."],
    buttonGuides: [button("Filtre uygula", "Kayıtları daraltır.", "Belirli olayı aradığında kullan.", "Liste daralır.")],
    screenMenus: [{ label: "Bildirimler", path: "/shared/notifications", purpose: "Kullanıcıya giden uyarıyı görmek için açılır." }],
    simpleTerms: pickTerms(["islemKaydi", "bildirim"]),
  }),
];

const SCHOOL = COMPANY.map((x) => ({
  ...x,
  path: x.path.replace('/company', '/school'),
  label: x.path === '/company/auth-invites' ? 'Hesap Davetleri' : x.path === '/company/georeview' ? 'Öğrenci Konum İncele' : x.label,
})).concat([
  screen(2201, '/school/parents', 'Parent Link', {
    menuPurpose: 'Parent tarafı için bağlantı ve davet akışını yönetmek için kullanılır.',
    forWhom: 'Okul yönetimi içindir.',
    firstStep: 'Önce hangi öğrenci veya veli için link gerektiğini seç.',
    nextStep: 'Süreyi ve paylaşımı kontrol et.',
    doNotDo: 'Yanlış veliye link gönderme.',
    stepByStep: ['Kayıtı seç.', 'Link üret.', 'Paylaşmadan önce kontrol et.'],
    commonMistakes: ['Yanlış öğrenci/veli eşlemesi.'],
    doneChecklist: ['Doğru link üretildi.'],
    buttonGuides: [button('Link oluştur', 'Yeni parent bağlantısı üretir.', 'Yeni paylaşım gerektiğinde kullan.', 'Yeni bağlantı oluşur.')],
    screenMenus: [{ label: 'Hesap Davetleri', path: '/school/auth-invites', purpose: 'Hesap tarafı için açılır.' }],
  }),
]);

const ORGANIZATION = COMPANY.map((x) => ({ ...x, path: x.path.replace('/company', '/organization'), label: x.path === '/company/georeview' ? 'Lokasyon İncele' : x.label === 'Planlama Merkezi' ? 'Organizasyon Merkezi' : x.label })).concat([
  screen(2301, '/organization/plans', 'Yer Planları', {
    menuPurpose: 'Organizasyon yer ve plan kayıtlarını yönetmek için kullanılır.',
    forWhom: 'Organizasyon yönetimi içindir.',
    firstStep: 'Önce doğru planı seç.',
    nextStep: 'Gerekirse iş akışına dön.',
    doNotDo: 'Yanlış plan üzerinde değişiklik yapma.',
    stepByStep: ['Planı seç.', 'Detayı incele.', 'Gerekli değişikliği yap.'],
    commonMistakes: ['Yanlış planı açmak.'],
    doneChecklist: ['Doğru plan açıldı.'],
    buttonGuides: [button('Planı aç', 'Seçili planın detayını açar.', 'Detay görmek için kullan.', 'Plan detayı açılır.')],
    screenMenus: [{ label: 'Organizasyon Merkezi', path: '/organization', purpose: 'Genel özet için açılır.' }],
  }),
]);

const DRIVER = [
  screen(3101, '/driver/today', 'Bugün', {
    menuPurpose: 'Sürücünün bugün ne yapacağını sade şekilde görmek için kullanılır.',
    forWhom: 'Sürücü içindir.',
    firstStep: 'Önce bugün için atanmış işi kontrol et.',
    nextStep: 'Gerekirse rota veya harita ekranına geç.',
    doNotDo: 'Bugün ekranını görmeden yola çıkma.',
    stepByStep: ['Bugünkü işi oku.', 'Saat ve görev durumunu kontrol et.', 'Gerekirse rota ekranına geç.'],
    commonMistakes: ['Göreve bakmadan doğrudan haritaya gitmek.'],
    doneChecklist: ['Bugünkü görev okundu.', 'Sonraki adım netleşti.'],
    buttonGuides: [
      button('Rota aç', 'Bugünkü işin rota ekranını açar.', 'Nereye gideceğini görmek için kullan.', 'Rota ekranı açılır.'),
      button('Harita aç', 'Canlı konum ve harita ekranını açar.', 'Canlı konum görmek için kullan.', 'Harita ekranı açılır.'),
    ],
    screenMenus: [
      { label: 'Rota', path: '/driver/route', purpose: 'Durak sırasını görmek için açılır.' },
      { label: 'Harita', path: '/driver/map', purpose: 'Canlı konumu görmek için açılır.' },
      { label: 'Copilot', path: '/driver/copilot', purpose: 'Takıldığında yardım almak için açılır.' },
    ],
  }),
  screen(3102, '/driver/route', 'Rota', {
    menuPurpose: 'Durak sırasını ve rota akışını görmek için kullanılır.',
    forWhom: 'Sürücü içindir.',
    firstStep: 'Önce sıradaki durağı kontrol et.',
    nextStep: 'Gerekirse harita ekranına geç.',
    doNotDo: 'Sıradaki durağı okumadan yola devam etme.',
    stepByStep: ['Durakları sırayla oku.', 'Sıradaki durağı netleştir.', 'Gerekirse haritaya geç.'],
    commonMistakes: ['Yanlış durağı sıradaki sanmak.'],
    doneChecklist: ['Sıradaki durak netleşti.'],
    buttonGuides: [button('Harita aç', 'Rota için haritayı açar.', 'Yol ve konum görmek için kullan.', 'Harita ekranı açılır.')],
    screenMenus: [{ label: 'Bugün', path: '/driver/today', purpose: 'Görev özetine dönmek için açılır.' }],
  }),
  screen(3103, '/driver/map', 'Harita', {
    menuPurpose: 'Sürücünün canlı konumunu ve işi harita üzerinde görmek için kullanılır.',
    forWhom: 'Sürücü içindir.',
    firstStep: 'Önce konumun güncel görünüp görünmediğine bak.',
    nextStep: 'Sorun varsa Copilot rehberine geç.',
    doNotDo: 'Eski konumu canlı sanma.',
    stepByStep: ['Harita açıldı mı kontrol et.', 'Konum güncelliğine bak.', 'Sorun varsa yardım aç.'],
    commonMistakes: ['Eski konumu yeni sanmak.'],
    doneChecklist: ['Konum kontrol edildi.'],
    buttonGuides: [button('Yardım aç', 'Konum görünmüyorsa rehber ekranını açar.', 'Takıldığında kullan.', 'Copilot ekranı açılır.')],
    screenMenus: [{ label: 'Copilot', path: '/driver/copilot', purpose: 'Konum sorularında rehber almak için açılır.' }],
    simpleTerms: pickTerms(['telefonGps', 'cihazGps', 'konumKaynagi']),
  }),
  screen(3104, '/driver/checkin', 'Check-in', {
    menuPurpose: 'Sürücünün check-in veya doğrulama tarafını görmek için kullanılır.',
    forWhom: 'Sürücü içindir.',
    firstStep: 'Önce hangi doğrulama adımında olduğunu kontrol et.',
    nextStep: 'Gerekirse Bugün ekranına dön.',
    doNotDo: 'Check-in yapılınca tüm görevin bittiğini sanma.',
    stepByStep: ['Kayıdı aç.', 'Check-in durumunu oku.', 'Gerekirse görev ekranına dön.'],
    commonMistakes: ['Check-in ile görevin tamamını karıştırmak.'],
    doneChecklist: ['Check-in anlamı netleşti.'],
    buttonGuides: [button('Yardım aç', 'Check-in ne demek sorusuna sade yardım açar.', 'Takıldığında kullan.', 'Copilot ekranı açılır.')],
    screenMenus: [{ label: 'Bugün', path: '/driver/today', purpose: 'Görev özetine dönmek için açılır.' }],
    simpleTerms: pickTerms(['checkin']),
  }),
  screen(3105, '/driver/copilot', 'Copilot', {
    menuPurpose: 'Sürücünün ekranda ne yapacağını anlaması için sade yardım verir.',
    forWhom: 'Sürücü içindir.',
    firstStep: 'Önce hangi ekranı anlamak istediğini seç.',
    nextStep: 'Gerekirse ilgili ekrana hızlı geçiş kullan.',
    doNotDo: 'Görev ekranını görmeden genel yorumla yetinme.',
    stepByStep: ['Ekranı seç.', 'Rehberi aç.', 'Sonucu uygula.'],
    commonMistakes: ['Yanlış ekranı seçmek.'],
    doneChecklist: ['İlgili ekran rehberi açıldı.'],
    buttonGuides: [button('Rehberi aç', 'Ekran rehberini çalıştırır.', 'Ne yapacağını bilmiyorsan kullan.', 'Sade yardım görünür.')],
  }),
];

const PERSONEL = [
  screen(4101, '/personel/live', 'Canlı', {
    menuPurpose: 'Servisin canlı durumunu görmek için kullanılır.',
    forWhom: 'Personel içindir.',
    firstStep: 'Önce konum ve durum bilgisini oku.',
    nextStep: 'Gerekirse Servisim ekranına geç.',
    doNotDo: 'Eski bilgiyi canlı sanma.',
    stepByStep: ['Canlı bilgiyi oku.', 'Konum güncel mi bak.', 'Gerekirse diğer ekrana geç.'],
    commonMistakes: ['Eski bilgiye göre hareket etmek.'],
    doneChecklist: ['Canlı durum okundu.'],
    buttonGuides: [button('Servisimi aç', 'Kendi servis detayını açar.', 'Daha fazla bilgi gerektiğinde kullan.', 'Servisim ekranı açılır.')],
    screenMenus: [{ label: 'Servisim', path: '/personel/my', purpose: 'Kendi servis detayın için açılır.' }, { label: 'Copilot', path: '/personel/copilot', purpose: 'Takıldığında yardım için açılır.' }],
  }),
  screen(4102, '/personel/my', 'Servisim', {
    menuPurpose: 'Kendi servis bilgini görmek için kullanılır.',
    forWhom: 'Personel içindir.',
    firstStep: 'Önce hangi servise bağlı olduğunu kontrol et.',
    nextStep: 'Gerekirse canlı ekrana dön.',
    doNotDo: 'Başka kişiye ait bilgi bekleme.',
    stepByStep: ['Kayıt bilgisini oku.', 'Araç ve durum bilgisini kontrol et.', 'Gerekirse canlı ekrana dön.'],
    commonMistakes: ['Bu ekranı canlı takip ekranı sanmak.'],
    doneChecklist: ['Kendi servis bilgisi okundu.'],
    buttonGuides: [button('Canlı aç', 'Canlı takip ekranına döner.', 'Konum görmek istediğinde kullan.', 'Canlı ekran açılır.')],
    screenMenus: [{ label: 'Canlı', path: '/personel/live', purpose: 'Canlı duruma dönmek için açılır.' }, { label: 'Copilot', path: '/personel/copilot', purpose: 'Rehber almak için açılır.' }],
  }),
  screen(4103, '/personel/copilot', 'Copilot', {
    menuPurpose: 'Personel kullanıcısına çok sade ekran yardımı verir.',
    forWhom: 'Personel içindir.',
    firstStep: 'Önce anlamak istediğin ekranı seç.',
    nextStep: 'Gerekirse ilgili ekrana git.',
    doNotDo: 'Yanlış ekrana göre yardım alma.',
    stepByStep: ['Ekranı seç.', 'Rehberi aç.', 'Yönlendirmeyi uygula.'],
    commonMistakes: ['Canlı ile Servisim ekranını karıştırmak.'],
    doneChecklist: ['Doğru yardım açıldı.'],
    buttonGuides: [button('Rehberi aç', 'Sade ekran yardımını çalıştırır.', 'Takıldığında kullan.', 'Yardım sonucu görünür.')],
  }),
];

const PARENT = [
  screen(5101, '/parent/live', 'Canlı', {
    menuPurpose: 'Çocuğun canlı durumunu ve yol bilgisini görmek için kullanılır.',
    forWhom: 'Veli içindir.',
    firstStep: 'Önce canlı bilgi ve zaman bilgisini oku.',
    nextStep: 'Sorun varsa yardım ekranına geç.',
    doNotDo: 'Eski bilgiyi canlı sanma.',
    stepByStep: ['Canlı bilgiyi aç.', 'Zaman ve durum bilgisini oku.', 'Gerekirse yardım aç.'],
    commonMistakes: ['Eski canlı veriyi güncel sanmak.'],
    doneChecklist: ['Canlı bilgi okundu.'],
    buttonGuides: [button('Yardım aç', 'Bu ekranın ne anlattığını açıklar.', 'Bilginin ne olduğunu anlamıyorsan kullan.', 'Copilot ekranı açılır.')],
    screenMenus: [{ label: 'Copilot', path: '/parent/copilot', purpose: 'Sade yardım almak için açılır.' }],
  }),
  screen(5102, '/parent/copilot', 'Copilot', {
    menuPurpose: 'Veliye canlı ekranı sade dille açıklar ve doğru yere yönlendirir.',
    forWhom: 'Veli içindir.',
    firstStep: 'Önce hangi ekranı anlamak istediğini seç.',
    nextStep: 'Sonra gerekirse canlı ekrana dön.',
    doNotDo: 'Canlı veri ile tahmini zamanı aynı şey sanma.',
    stepByStep: ['Ekranı seç.', 'Rehberi aç.', 'Gerekirse canlı ekrana dön.'],
    commonMistakes: ['Canlı ile tahmini zamanı karıştırmak.'],
    doneChecklist: ['Ekran daha anlaşılır hale geldi.'],
    buttonGuides: [button('Rehberi aç', 'Seçili ekran için sade yardım üretir.', 'Ne gördüğünü anlamıyorsan kullan.', 'Sade yardım görünür.')],
  }),
];

const SUPER_ADMIN = [
  screen(6101, '/superadmin', 'Overview', {
    menuPurpose: 'Sistem genelini üst seviyede görmek için kullanılır.',
    forWhom: 'Super admin içindir.',
    firstStep: 'Önce hangi alana ineceğine karar ver.',
    nextStep: 'Gerekirse şirket, oda veya kullanıcı ekranına geç.',
    doNotDo: 'Özet ekranı detay ekranı sanma.',
    stepByStep: ['Özet kartları oku.', 'İlgili yönetim ekranına geç.', 'Detayı orada incele.'],
    commonMistakes: ['Özet bilgiyi detay sanmak.'],
    doneChecklist: ['Doğru yönetim alanı seçildi.'],
    buttonGuides: [button('Alanı aç', 'Özetten ilgili yönetim alanına geçer.', 'Detaya inmek istediğinde kullan.', 'İlgili ekran açılır.')],
    screenMenus: [{ label: 'Companies', path: '/superadmin/companies', purpose: 'Şirket yönetimi için açılır.' }, { label: 'Rooms', path: '/superadmin/rooms', purpose: 'Oda yönetimi için açılır.' }, { label: 'Copilot', path: '/superadmin/copilot', purpose: 'Yardım için açılır.' }],
  }),
  screen(6102, '/superadmin/companies', 'Companies', {
    menuPurpose: 'Şirket kayıtlarını yönetmek için kullanılır.',
    forWhom: 'Super admin içindir.',
    firstStep: 'Önce doğru şirketi seç.',
    nextStep: 'Gerekirse kullanıcı veya oda tarafına geç.',
    doNotDo: 'Yanlış şirket üzerinde değişiklik yapma.',
    stepByStep: ['Şirketi seç.', 'Detayı incele.', 'Gerekirse diğer yönetime geç.'],
    commonMistakes: ['Yanlış şirketi açmak.'],
    doneChecklist: ['Doğru şirket seçildi.'],
    buttonGuides: [button('Şirketi aç', 'Şirket detayını açar.', 'Detay görmek için kullan.', 'Detay alanı açılır.')],
    screenMenus: [{ label: 'Rooms', path: '/superadmin/rooms', purpose: 'Oda bağlantısını görmek için açılır.' }, { label: 'Users', path: '/superadmin/users', purpose: 'Kullanıcı bağlantısını görmek için açılır.' }],
  }),
  screen(6103, '/superadmin/audit', 'Audit', {
    menuPurpose: 'İşlem kayıtlarını ve izleri görmek için kullanılır.',
    forWhom: 'Super admin içindir.',
    firstStep: 'Önce neyi aradığını netleştir.',
    nextStep: 'Gerekirse log export veya Copilot ekranına geç.',
    doNotDo: 'Log ile audit kaydını aynı şey sanma.',
    stepByStep: ['Filtreyi seç.', 'Kayıtları incele.', 'Gerekirse dışa aktar.'],
    commonMistakes: ['Yanlış zaman aralığı ile arama yapmak.'],
    doneChecklist: ['İlgili kayıt bulundu.'],
    buttonGuides: [button('Filtrele', 'İşlem kayıtlarını daraltır.', 'Belirli işlem ararken kullan.', 'Liste daha anlamlı hale gelir.')],
    screenMenus: [{ label: 'Log Export', path: '/superadmin/logexport', purpose: 'Dışa aktarım için açılır.' }, { label: 'Copilot', path: '/superadmin/copilot', purpose: 'Kayıtları açıklatmak için açılır.' }],
    simpleTerms: pickTerms(['islemKaydi']),
  }),
  screen(6104, '/superadmin/copilot', 'Copilot', {
    menuPurpose: 'Sistem genelinde rehber ve açıklama almak için kullanılır.',
    forWhom: 'Super admin içindir.',
    firstStep: 'Önce iş veya ekran rehberini seç.',
    nextStep: 'Gerekirse ilgili yönetim ekranına geç.',
    doNotDo: 'Detayı seçmeden genel yorumla yetinme.',
    stepByStep: ['Rehberi seç.', 'Sonucu oku.', 'Gerekirse yönetim ekranına geç.'],
    commonMistakes: ['Yanlış kapsam için rehber açmak.'],
    doneChecklist: ['Doğru rehber seçildi.'],
    buttonGuides: [button('Rehberi aç', 'Seçili yardım akışını çalıştırır.', 'Ekran veya iş açıklaması gerektiğinde kullan.', 'Sonuç görünür.')],
  }),
];

const SCREEN_CATALOG = { ROOM, COMPANY, SCHOOL, ORGANIZATION, DRIVER, PERSONEL, PARENT, SUPER_ADMIN };

export function resolveRoleGuideKey(user) {
  const role = String(user?.role || '');
  if (role === 'COMPANY') {
    const kind = String(user?.companyKind || '').toUpperCase();
    if (kind === 'SCHOOL') return 'SCHOOL';
    if (kind === 'ORGANIZATION') return 'ORGANIZATION';
    return 'COMPANY';
  }
  return role || 'ROOM';
}

export function listScreensForUser(user) {
  const key = resolveRoleGuideKey(user);
  return (SCREEN_CATALOG[key] || []).map((x) => ({ id: x.id, path: x.path, label: x.label }));
}

export function getScreenDefinitionForUser(user, screenContext = {}, entityId = null) {
  const key = resolveRoleGuideKey(user);
  const list = SCREEN_CATALOG[key] || [];
  const rawPath = String(screenContext?.path || '').split('?')[0] || '';
  let found = null;
  if (rawPath) found = list.find((x) => x.path === rawPath) || null;
  if (!found && entityId != null) found = list.find((x) => Number(x.id) === Number(entityId)) || null;
  if (!found) found = list[0] || null;
  if (!found) return null;
  return {
    type: 'screen',
    id: Number(entityId || found.id || 0),
    roleKey: key,
    roleLabel: key === 'SCHOOL' ? 'OKUL' : key === 'ORGANIZATION' ? 'ORGANİZASYON' : key,
    label: found.label,
    ...found,
  };
}

export function buildRoleHelpSummary(user) {
  const key = resolveRoleGuideKey(user);
  const list = SCREEN_CATALOG[key] || [];
  const first = list[0] || null;
  return {
    roleKey: key,
    roleLabel: key === 'SCHOOL' ? 'OKUL' : key === 'ORGANIZATION' ? 'ORGANİZASYON' : key,
    screens: list.map((x) => ({ label: x.label, path: x.path, purpose: x.menuPurpose })),
    firstPath: first?.path || '',
  };
}
