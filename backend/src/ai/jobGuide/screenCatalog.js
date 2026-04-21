import { pickTerms } from "./glossary.js";
import { button, inferGuideKeyFromScreen, screen } from "./screenCatalog.shared.js";
import { COMPANY, ROOM } from './screenCatalog.roomCompany.js';

const SCHOOL = COMPANY.map((x) => ({
  ...x,
  path: x.path.replace('/company', '/school'),
  label: x.path === '/company/georeview' ? 'Öğrenci Konum İncele' : x.label,
})).concat([
  screen(2201, '/school/parents', 'Veli Erişimi', {
    menuPurpose: 'Veli tarafı için süreli link, erişim kodu ve PIN üretmek için kullanılır.',
    forWhom: 'Okul yönetimi içindir.',
    firstStep: 'Önce öğrenci seçimini yap.',
    nextStep: 'Süreyi seç ve paylaşım bilgisini kontrol et.',
    doNotDo: 'Yanlış öğrenci için erişim üretme.',
    stepByStep: ['Öğrenciyi seç.', 'Süreyi belirle.', 'Link, kod ve PIN üretip paylaşmadan önce kontrol et.'],
    commonMistakes: ['Yanlış öğrenci için erişim üretmek.'],
    doneChecklist: ['Doğru öğrenci için erişim üretildi.'],
    buttonGuides: [button('Erişim üret', 'Yeni veli erişimi üretir.', 'Yeni paylaşım gerektiğinde kullan.', 'Yeni erişim oluşur.')],
    screenMenus: [{ label: 'Öğrenci Link', path: '/school/access-links', purpose: 'Benzer paylaşım yüzeyini görmek için açılır.' }],
    simpleTerms: pickTerms(["veliErisimi", "erisimLinki"]),
  }),
]);

const ORGANIZATION = COMPANY.map((x) => {
  const mapped = { ...x, path: x.path.replace('/company', '/organization'), label: x.path === '/company/georeview' ? 'Lokasyon İncele' : x.label === 'Planlama Merkezi' ? 'Organizasyon Merkezi' : x.label };

  if (x.path === '/company') {
    return screen(2101, '/organization', 'Gezi / Planlama Merkezi', {
      menuPurpose: 'Yeni gezi veya organizasyon işini burada kurarsın. Toplanma noktasını, plan paketini, tahmini kişi sayısını, gidilecek yerleri ve dönüş tipini burada tamamlarsın.',
      forWhom: 'Organizasyon tarafında gezi, tur veya toplu etkinlik işi kuran kullanıcı içindir.',
      firstStep: 'Önce toplanma noktasını ve gidilecek yerlerin koordinat durumunu kontrol et. Eksik koordinat varsa önce tamamla.',
      nextStep: 'Taslak plan tamam olduktan sonra ön izleme ve teklif adımına geç; takip için sonra Vardiyalar ekranını kullan.',
      doNotDo: 'Company/School planı gibi kişi-durak çözümünü zorunlu sanma veya eksik planı markete düşürmeye çalışma.',
      stepByStep: ['Toplanma noktasını kaydet.', 'Rehberi Başlat ile plan akışını aç.', 'Plan paketi, tarih ve günleri seç.', 'Tahmini kişi sayısını, gidilecek yerleri ve dönüş tipini gir.', 'Eksik koordinat varsa tamamla, sonra ön izleme ve rota sıralamayı kontrol et.', 'Plan tamamsa teklifi gönder; takip için Vardiyalar ekranına geç.'],
      commonMistakes: ['Toplanma noktasını kaydetmeden devam etmek.', 'Gidilecek yerleri eksik koordinatla bırakmak.', 'Takip ekranını yeni plan kurma ekranı sanmak.'],
      doneChecklist: ['Toplanma noktası kaydedildi.', 'Tahmini kişi sayısı girildi.', 'Gidilecek yerler ve dönüş tipi tamamlandı.', 'Teklif veya plan çıktısı üretildi.'],
      buttonGuides: [
        button('Rehberi Başlat', 'Gezi planlama akışını adım adım açar.', 'Yeni gezi veya organizasyon işi kuracaksan kullan.', 'Toplanma noktası → plan paketi → kişi sayısı / yerler → ön izleme akışı açılır.'),
        button('Konum kontrol et', 'Toplanma noktası ve gidilecek yerlerin konum sorunlarını düzeltmeye yardım eder.', 'Koordinat eksik veya hatalıysa kullan.', 'Eksik konumları tamamlayıp plana geri dönersin.'),
        button('Vardiyalar', 'Kurulan işin teklif ve operasyon takibine götürür.', 'Plan çıktıktan sonra kullan.', 'Vardiyalar ekranı açılır.'),
      ],
      screenMenus: [
        { label: 'Vardiyalar', path: '/organization/shifts', purpose: 'Kurulan gezi/organizasyon işinin teklif ve operasyon takibini yapmak için açılır.' },
        { label: 'Lokasyon İncele', path: '/organization/georeview', purpose: 'Konum sorunu olan kayıtları düzeltmek için açılır.' },
        { label: 'Copilot', path: '/organization/copilot', purpose: 'Takıldığında organization rehberi almak için açılır.' },
      ],
      simpleTerms: pickTerms(['teklif', 'atama']),
    });
  }

  if (x.path === '/company/shifts') {
    return screen(2102, '/organization/shifts', 'Vardiyalar', {
      menuPurpose: 'Bu ekranın ana işi takip etmektir. Burada açılmış gezi/organizasyon işlerini, teklifleri ve operasyon durumunu izlersin.',
      forWhom: 'Organizasyon tarafında oluşturulmuş işi takip eden kullanıcı içindir.',
      firstStep: 'Önce doğru planı veya takip sekmesini seç.',
      nextStep: "Yeni gezi kuracaksan Gezi / Planlama Merkezi'ne dön; mevcut işin takibini burada sürdür.",
      doNotDo: 'Vardiyalar ekranını yeni gezi planı kurmanın ana yeri sanma veya plan eksikse burada düzeltmeye çalışma.',
      stepByStep: ["Takip edeceğin işi seç.", "Market, Bekleyen veya Liste bölümünde durumu oku.", "Gerekirse önizleme, teklif detayı veya rota ekranını aç.", "Plan eksikse Gezi / Planlama Merkezi'ne dön."],
      commonMistakes: ['Yeni geziyi bu ekrandan kurmaya çalışmak.', 'Eksik koordinatı takip ekranında çözmeye çalışmak.', 'Takip ekranını plan kurma ekranı sanmak.'],
      doneChecklist: ['Doğru iş seçildi.', 'Teklif ve takip durumu okundu.', 'Gerekli takip adımı açıldı.'],
      buttonGuides: [
        button('Takip', 'Gezi/organizasyon işlerini takip görünümünde açar.', 'Mevcut işlerin durumunu izlemek istediğinde kullan.', 'Market, Bekleyen ve Liste alanları görünür.'),
        button('Önizle', 'Seçili işin rota ve özet bilgisini gösterir.', 'Karar öncesi kısa kontrol gerektiğinde kullan.', 'Vardiya özeti açılır.'),
        button('Süre uzat', 'Mevcut işin süresini uzatma akışını açar.', 'Aynı iş devam edecekse kullan.', 'Uzatma alanı açılır.'),
      ],
      screenMenus: [
        { label: 'Gezi / Planlama Merkezi', path: '/organization', purpose: 'Yeni gezi veya organizasyon işi kurmak için açılır.' },
        { label: 'Lokasyon İncele', path: '/organization/georeview', purpose: 'Konum sorunu olan kayıtları düzeltmek için açılır.' },
      ],
      simpleTerms: pickTerms(['atama']),
    });
  }

  if (x.path === '/company/copilot') {
    return screen(2105, '/organization/copilot', 'Copilot', {
      menuPurpose: 'Organizasyon ekranlarında ne yapacağını anlamadığında sade ve adım adım yardım almak için kullanılır.',
      forWhom: 'Organizasyon kullanıcısı içindir.',
      firstStep: 'Önce hangi ekran veya hangi iş hakkında konuşacağını seç.',
      nextStep: 'Gerekirse hızlı geçişle Gezi / Planlama Merkezi, Vardiyalar veya Lokasyon İncele ekranına git.',
      doNotDo: 'Company ekranı gibi kişi-durak çözümü bekleme veya organization işini company metniyle yorumlamaya çalışma.',
      stepByStep: ["Ekranı veya kaydı seç.", "Toplanma noktası, tahmini kişi sayısı, gidilecek yerler ve dönüş tipi adımlarına göre cevabı oku.", "Plan eksikse önce Gezi / Planlama Merkezi'ne dön; plan tamamsa takip için Vardiyalar'a geç."],
      commonMistakes: ['Planlama ve takip ekranlarını karıştırmak.', 'Eksik koordinatı tamamlamadan teklif göndermeye çalışmak.', 'Copilot seçili ekranı company sanmak.'],
      doneChecklist: ['Doğru rehber seçildi.', 'Gerekli ekran açıldı.', 'Sıradaki adım netleşti.'],
      buttonGuides: [
        button('Rehberi aç', 'Seçilen organization rehberini çalıştırır.', 'Yol gösterecek sade yardım istediğinde kullan.', 'Rehber sonucu görünür.'),
        button('Analiz et', 'Gelişmiş analizi çalıştırır.', 'Detaylı yorum gerektiğinde kullan.', 'Gelişmiş sonuç görünür.'),
      ],
      screenMenus: [
        { label: 'Gezi / Planlama Merkezi', path: '/organization', purpose: 'Yeni gezi veya organizasyon işi kurmak için açılır.' },
        { label: 'Vardiyalar', path: '/organization/shifts', purpose: 'İş detaylarını ve takibi görmek için açılır.' },
        { label: 'Lokasyon İncele', path: '/organization/georeview', purpose: 'Konum sorunlarını düzeltmek için açılır.' },
      ],
    });
  }

  return mapped;
}).concat([
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
    firstControls: ['Önce bugün için atanmış görev var mı bak.', 'Araç, saat ve durum alanı dolu mu kontrol et.', 'Görev yoksa boş ekranı canlı görev sanma.'],
    stuckChecks: ['Görev görünmüyorsa bugün atanmış vardiya olmayabilir.', 'Bugün ekranını rota ekranı sanma.', 'Canlı takibe geçmeden önce görev özeti okunmalı.'],
    workflowStages: [
      { key: 'DRIVER_TODAY_READ', title: 'Bugünkü görevi oku', action: 'Görev kartındaki iş, saat ve araç bilgisini kontrol et.', doneWhen: 'Nereye ve hangi araçla çıkacağını biliyorsun.', ifBlocked: 'Atama yoksa room/company tarafında sürücü bağı kontrol edilmeli.' },
      { key: 'DRIVER_TODAY_MOVE', title: 'Doğru ekrana geç', action: 'Durak sırası için Rota, canlı konum için Harita ekranına geç.', doneWhen: 'İhtiyacın olan sürücü ekranı açık.', ifBlocked: 'Yanlış ekrana geçersen eksik bilgi ararsın.' },
    ],
    nextScreens: [
      { label: 'Rota', path: '/driver/route', reason: 'Durak sırası ve bir sonraki durak için.' },
      { label: 'Harita', path: '/driver/map', reason: 'Canlı konum, ETA ve sesli destek için.' },
    ],
    dataRules: ['Bugün ekranı görev özetidir; canlı haritanın yerine geçmez.', 'Bugün boşsa sürücüye atanmış aktif vardiya olmayabilir.', 'Araç veya saat bilgisi eksikse room/company tarafında atama bağı kontrol edilmelidir.'],
    chatQuestions: ['Bugün önce neyi kontrol edeyim?', 'Bu seçili kayıtta eksik ne var?', 'Hangi ekrana geçeyim?', 'Bu buton ne yapar?'],
    fieldGuides: [
      { label: 'Görev', meaning: 'Bugün yapacağın işin özet başlığıdır.' },
      { label: 'Araç', meaning: 'Göreve bağlı araç bilgisidir.', risk: 'Boşsa atama eksik olabilir.' },
      { label: 'Saat', meaning: 'İşe çıkış veya başlangıç zamanını gösterir.', risk: 'Eksikse sürücü hazırlığı net değildir.' },
      { label: 'Durum', meaning: 'Bugünkü görevin hangi aşamada olduğunu gösterir.' },
    ],
    badgeGuides: [
      { label: 'ACTIVE', meaning: 'Görev bugün aktif ilerliyor olabilir.' },
      { label: 'APPROVED', meaning: 'Görev onaylıdır fakat sürücü açısından detay yine okunmalıdır.' },
      { label: 'YOK', meaning: 'Bugün atanmış görev görünmüyor olabilir.', actionHint: 'Room/company tarafında sürücü atamasını kontrol et.' },
    ],
    rowReadHint: 'Önce görev ve araç bilgisini oku. Sonra saat ve durum alanıyla bugün ne yapacağını netleştir. Eksik alan varsa rota veya haritaya geçmeden önce atama tarafını kontrol et.',
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
    buttonGuides: [
      button('Yenile', 'Harita ve görev verisini yeniden yükler.', 'Bilgi eski kaldıysa kullan.', 'Araç, durak ve rota özeti tekrar çekilir.'),
      button('Sonraki Durağa Navigasyon', 'Sıradaki durak için dış navigasyonu açar.', 'Sıradaki durağa gitmek istediğinde kullan.', 'Telefon navigasyonu sıradaki durağa göre açılır.'),
      button('Tam Rotayı Dış Navigasyonda Aç', 'Tüm durakları dış navigasyonda açar.', 'Mini önizleme yerine tam yol tarifi istediğinde kullan.', 'Harici navigasyon tam rota ile açılır.'),
      button('Yardım aç', 'Konum görünmüyorsa rehber ekranını açar.', 'Takıldığında kullan.', 'Copilot ekranı açılır.'),
    ],
    screenMenus: [{ label: 'Copilot', path: '/driver/copilot', purpose: 'Konum sorularında rehber almak için açılır.' }],
    simpleTerms: pickTerms(['telefonGps', 'cihazGps', 'konumKaynagi']),
    dataRules: ['Sıradaki durak, mesafe ve ETA hareket ettikçe değişmelidir; sabit kalıyorsa rota yenilenmiyor olabilir.', 'Ekran kapanınca canlılık düşüyorsa background location zinciri kontrol edilmelidir.', 'Auto reached durak yakınlığına ve aktif görev bağlamına göre çalışır; yalnız haritaya bakarak anlaşılmaz.', 'Sesli destek operasyonu yönlendirmek içindir; yalnız konuşması değil doğru anda konuşması önemlidir.'],
    fieldGuides: [
      { label: 'Son GPS', meaning: 'Konum bilgisinin en son ne zaman geldiğini gösterir.', risk: 'Eskiyse canlılık yanıltıcı olabilir.' },
      { label: 'Sıradaki Durak', meaning: 'Sıradaki hedef durağı gösterir.' },
      { label: 'Mesafe', meaning: 'Sıradaki durağa kalan yaklaşık yolu gösterir.' },
      { label: 'ETA', meaning: 'Sıradaki durağa tahmini kalan süredir.', risk: 'Sabit kalıyorsa rota yenilenmiyor olabilir.' },
      { label: 'Alınacak Yolcu', meaning: 'Sıradaki durakta alınması beklenen yolcu sayısıdır.' },
    ],
    badgeGuides: [
      { label: 'ONLINE', meaning: 'Canlı GPS akışı geliyor.' },
      { label: 'OFFLINE', meaning: 'Canlı GPS akışı görünmüyor olabilir.', actionHint: 'İzin, bağlantı ve background GPS zincirini kontrol et.' },
      { label: 'ACTIVE', meaning: 'Görev aktif ilerliyor.' },
      { label: 'REACHED', meaning: 'Durak ulaşıldı olarak işaretlenmiş olabilir.' },
    ],
    firstControls: ['Önce konum güncel mi bak.', 'Sıradaki durak, mesafe ve ETA değişiyor mu kontrol et.', 'Ekran kapanınca canlılık sürüyor mu test et.'],
    stuckChecks: ['Harita var ama konum akmıyorsa background GPS izni veya yayın zinciri düşmüş olabilir.', 'ETA sabit kalıyorsa rota tekrar çekilmiyor olabilir.', 'Auto reached çalışmıyorsa mesafe eşiği veya aktif görev bağını kontrol et.'],
    workflowStages: [
      { key: 'DRIVER_MAP_SIGNAL', title: 'Canlılığı doğrula', action: 'Harita açıldıktan sonra araç pininin ve son GPS zamanının hareket ettikçe değiştiğini kontrol et.', doneWhen: 'Konum akışı canlı görünüyor.', ifBlocked: 'Ekran kapanınca akış düşüyorsa background location akışını kontrol et.' },
      { key: 'DRIVER_MAP_STOP', title: 'Durak otomasyonunu izle', action: 'Sıradaki durak, mesafe ve auto reached davranışını takip et.', doneWhen: 'Durak gelince reached olur ve sonraki durak bilgisi güncellenir.', ifBlocked: 'ETA veya mesafe değişmiyorsa rota refresh zincirini kontrol et.' },
      { key: 'DRIVER_MAP_VOICE', title: 'Sesli desteği doğrula', action: 'Durak yaklaşınca alınacak yolcu sayısı ve sonraki durak ETA bilgisinin okunup okunmadığını dinle.', doneWhen: 'Sesli destek operasyonu gerçekten yönlendirir.', ifBlocked: 'Sesli destek yalnız ön planda çalışıyorsa cihaz güç yönetimini ve speech akışını kontrol et.' },
    ],
    nextScreens: [
      { label: 'Bugün', path: '/driver/today', reason: 'Görev özetine dönmek için.' },
      { label: 'Copilot', path: '/driver/copilot', reason: 'Canlılık veya ETA sorununu adım adım teşhis etmek için.' },
    ],
    chatQuestions: ['Konum neden güncellenmiyor?', 'Önce neyi kontrol edeyim?', 'Auto reached neden olmuyor?', 'Sesli destek ne zaman konuşur?'],
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
    firstControls: ['Önce hangi ekran veya kayıt hakkında konuşacağını seç.', 'Seçili vardiya/araç bağlamı varsa doğru geldi mi kontrol et.', 'Kısa soru yerine bağlamı söyleyen soru sor.'],
    stuckChecks: ['Yanlış ekran seçiliyse cevap genel kalır.', 'Seçili kayıt yoksa copilot yalnız ekran seviyesinde yanıt verir.', 'Kısa takip sorularında önceki bağlamı korumak için aynı sohbeti sürdür.'],
    workflowStages: [
      { key: 'COPILOT_SCOPE', title: 'Bağlamı netleştir', action: 'Önce ekranı ve varsa seçili kaydı doğrula.', doneWhen: 'Copilot üstünde doğru ekran ve seçili kayıt görünür.', ifBlocked: 'Yanlış scope varsa ilgili ekrana dönüp kaydı yeniden seç.' },
      { key: 'COPILOT_ASK', title: 'Doğru soru tipini sor', action: 'Önce neyi kontrol edeyim, kontrol listesi ver, sık hata ne, hangi ekrana geçeyim gibi sorular kullan.', doneWhen: 'Cevap operasyonel ve adım adım gelir.', ifBlocked: 'Soru çok genelse daha spesifik ekran veya kayıt belirt.' },
      { key: 'COPILOT_APPLY', title: 'Cevabı ekrana uygula', action: 'Quick action veya önerilen ekran geçişini aç.', doneWhen: 'Konuşma ekranda bir sonraki adıma dönüşür.', ifBlocked: 'Yalnız sohbet edip ekrana dönmüyorsan değer üretemez.' },
    ],
    nextScreens: [
      { label: 'Bugün', path: '/driver/today', reason: 'Görev özetine dönmek için.' },
      { label: 'Harita', path: '/driver/map', reason: 'Canlılık, ETA ve rota takibi için.' },
      { label: 'Rota', path: '/driver/route', reason: 'Durak sırasını görmek için.' },
    ],
    chatQuestions: ['Bu ekranda önce neyi kontrol edeyim?', 'Kontrol listesi ver', 'Sık hata ne?', 'Hangi ekrana geçeyim?'],
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
  screen(6105, '/superadmin/rooms', 'Rooms', {
    menuPurpose: 'Oda kayıtlarını, bağlantılarını ve kapsama alanını yönetmek için kullanılır.',
    forWhom: 'Super admin içindir.',
    firstStep: 'Önce doğru odayı seç.',
    nextStep: 'Gerekirse şirkete, kullanıcıya veya kalite ekranına geç.',
    doNotDo: 'Oda bağlantısını hangi şirkete ait olduğunu okumadan değiştirme.',
    stepByStep: ['Odayı seç.', 'Bağlı şirket ve kapsamı kontrol et.', 'Gerekirse ilişkili yönetim ekranına geç.'],
    commonMistakes: ['Yanlış odayı açmak.', 'Kapsamı görmeden karar vermek.'],
    doneChecklist: ['Doğru oda seçildi.', 'Bağlantı bilgisi okundu.'],
    buttonGuides: [button('Odayı aç', 'Seçili odayı detaylı incelemeye götürür.', 'Bağlantı ve kapsamı görmek istediğinde kullan.', 'Oda detay akışı açılır.')],
    screenMenus: [{ label: 'Companies', path: '/superadmin/companies', purpose: 'Bağlı şirketi kontrol etmek için açılır.' }, { label: 'Users', path: '/superadmin/users', purpose: 'Yetkili kullanıcıları görmek için açılır.' }, { label: 'Operasyon Doğrulama', path: '/superadmin/operation-verification', purpose: 'Rol ve operasyon yüzeyini doğrulamak için açılır.' }],
  }),
  screen(6106, '/superadmin/users', 'Users', {
    menuPurpose: 'Kullanıcı kayıtlarını, rollerini ve erişim durumunu yönetmek için kullanılır.',
    forWhom: 'Super admin içindir.',
    firstStep: 'Önce doğru kullanıcıyı veya rol filtresini seç.',
    nextStep: 'Gerekirse oda, şirket veya güven ekranına geç.',
    doNotDo: 'Rol ve erişim kapsamını okumadan kullanıcı üzerinde karar verme.',
    stepByStep: ['Kullanıcıyı veya rolü seç.', 'Erişim ve rol bilgisini oku.', 'Gerekirse ilişkili yönetim ekranına geç.'],
    commonMistakes: ['Yanlış kullanıcı üzerinde işlem yapmak.', 'Rol ile şirket/oda kapsamını karıştırmak.'],
    doneChecklist: ['Doğru kullanıcı veya rol filtresi seçildi.', 'Erişim durumu okundu.'],
    buttonGuides: [button('Kullanıcıyı aç', 'Seçili kullanıcıyı detaylı incelemeye götürür.', 'Rol veya erişim durumunu netleştirmek istediğinde kullan.', 'Kullanıcı detay akışı açılır.')],
    screenMenus: [{ label: 'Rooms', path: '/superadmin/rooms', purpose: 'Kullanıcının bağlı olduğu oda tarafını görmek için açılır.' }, { label: 'Companies', path: '/superadmin/companies', purpose: 'Kullanıcının bağlı olduğu şirketi görmek için açılır.' }, { label: 'Güven ve Kalite', path: '/superadmin/trust-quality', purpose: 'Kritik rol ve kalite sinyalini birlikte okumak için açılır.' }],
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
  screen(6107, '/superadmin/observability', 'Canlı İzleme', {
    menuPurpose: 'Canlı sağlık, GPS güveni ve son olayları tek ekranda okumak için kullanılır.',
    forWhom: 'Super admin içindir.',
    firstStep: 'Önce canlı durum ve GPS güven skorunu oku.',
    nextStep: 'Sonra son canlı olaylara ve cihaz riskine in.',
    doNotDo: 'GPS skoru ile canlı durumu aynı şey sanma.',
    stepByStep: ['Canlı durum kartını oku.', 'GPS güven notlarını kontrol et.', 'Son olay ve cihaz riskini birlikte değerlendir.'],
    commonMistakes: ['Tek bir event ile genel sağlık kararı vermek.', 'Son sync ve son GPS zamanını atlamak.'],
    doneChecklist: ['Canlı durum okundu.', 'Risk alanı belirlendi.'],
    buttonGuides: [button('Yenile', 'Canlı sağlık özetini tekrar yükler.', 'Verinin eski kaldığını düşünüyorsan kullan.', 'Özet, event type ve son olay listesi güncellenir.')],
    screenMenus: [{ label: 'Operasyon Doğrulama', path: '/superadmin/operation-verification', purpose: 'Kanıt ve kayıt tarafına geçmek için açılır.' }, { label: 'Kabul Merkezi', path: '/superadmin/acceptance', purpose: 'Saha kabul kararına etkisini görmek için açılır.' }],
  }),
  screen(6108, '/superadmin/acceptance', 'Kabul Merkezi', {
    menuPurpose: 'Saha kabul kararı, checklist ve test oturumu özetini birlikte okumak için kullanılır.',
    forWhom: 'Super admin içindir.',
    firstStep: 'Önce PASS olmayan checklist maddelerini belirle.',
    nextStep: 'Sonra kabul kararını tekrar değerlendir.',
    doNotDo: 'Checklist kapanmadan ACCEPT kararını kesin sanma.',
    stepByStep: ['Checklist maddelerini oku.', 'Bekleyenleri kapat.', 'En son karar alanını gözden geçir.'],
    commonMistakes: ['Checklist ile kabul kararını birbirinin yerine koymak.'],
    doneChecklist: ['Açık maddeler belirlendi.', 'Karar yeniden gözden geçirildi.'],
    buttonGuides: [button('Yenile', 'Manifest ve test oturumu özetini tekrar çeker.', 'Checklist veya karar yeni değiştiyse kullan.', 'Kabul merkezi güncel veriyle tekrar yüklenir.')],
    screenMenus: [{ label: 'Canlı İzleme', path: '/superadmin/observability', purpose: 'Saha sağlığını acceptance öncesi görmek için açılır.' }, { label: 'Pilot Launch Gate', path: '/superadmin/pilot-launch-gate', purpose: 'Sahaya çıkış kararını görmek için açılır.' }],
  }),
  screen(6109, '/superadmin/operation-verification', 'Operasyon Doğrulama', {
    menuPurpose: 'Rol bazlı operasyon kontrollerini kanıt tipi ve kısa notla kayıt altına almak için kullanılır.',
    forWhom: 'Super admin içindir.',
    firstStep: 'Önce kontrol edilecek rolü seç.',
    nextStep: 'Sonra her kontrol maddesinde durum, kanıt ve notu tamamla.',
    doNotDo: 'Sadece varsayılan karara bakıp manuel kayıt ihtiyacını atlama.',
    stepByStep: ['Rolü seç.', 'Kontrol maddelerini sırayla oku.', 'Kanıt tipini ve notu kaydet.'],
    commonMistakes: ["Rol değişince eski draftı doğru sanmak.", "Kanıt tipini boş bırakmak."],
    doneChecklist: ['Doğru rol seçildi.', 'Kontroller kaydedildi.'],
    buttonGuides: [button('Kaydet', 'Seçili kontrol maddesi için durum, kanıt ve notu kayıt altına alır.', 'Kontrol maddesini netleştirdiğinde kullan.', 'Kayıt, role surface üzerinde görünür hale gelir.')],
    screenMenus: [{ label: 'Canlı İzleme', path: '/superadmin/observability', purpose: 'Canlı kanıt ve saha sinyalini desteklemek için açılır.' }, { label: 'Kabul Merkezi', path: '/superadmin/acceptance', purpose: 'Saha kabul checklisti ile birlikte okumak için açılır.' }],
  }),
  screen(6113, '/superadmin/trust-quality', 'Güven ve Kalite', {
    menuPurpose: 'Hizmet değerlendirmesi ve sağlayıcı kalite sinyalini birlikte görmek için kullanılır.',
    forWhom: 'Super admin içindir.',
    firstStep: 'Önce kalite özeti ile sağlayıcı sinyalini birlikte oku.',
    nextStep: 'Gerekirse hizmet değerlendirme veya ticari akış tarafına in.',
    doNotDo: 'Tek bir puan ile tüm güven kararını verme.',
    stepByStep: ['Kalite özetini oku.', 'Sinyal setini gözden geçir.', 'Gerekirse bağlı hizmet ekranına geç.'],
    commonMistakes: ['Hizmet puanı ile sağlayıcı sinyalini karıştırmak.'],
    doneChecklist: ['Kalite sinyali okundu.'],
    screenMenus: [{ label: 'Operasyon Doğrulama', path: '/superadmin/operation-verification', purpose: 'Kalite ve güven kontrolünü role surface tarafında desteklemek için açılır.' }],
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

export function resolveRoleGuideKey(user, screenContext = {}) {
  const hinted = inferGuideKeyFromScreen(screenContext);
  if (hinted) return hinted;
  const role = String(user?.role || '');
  if (role === 'COMPANY') {
    const kind = String(user?.companyKind || '').toUpperCase();
    if (kind === 'SCHOOL') return 'SCHOOL';
    if (kind === 'ORGANIZATION') return 'ORGANIZATION';
    return 'COMPANY';
  }
  return role || 'ROOM';
}

export function listScreensForUser(user, screenContext = {}) {
  const key = resolveRoleGuideKey(user, screenContext);
  return (SCREEN_CATALOG[key] || []).map((x) => ({ id: x.id, path: x.path, label: x.label }));
}

export function getScreenDefinitionForUser(user, screenContext = {}, entityId = null) {
  const key = resolveRoleGuideKey(user, screenContext);
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

export function buildRoleHelpSummary(user, screenContext = {}) {
  const key = resolveRoleGuideKey(user, screenContext);
  const list = SCREEN_CATALOG[key] || [];
  const first = list[0] || null;
  return {
    roleKey: key,
    roleLabel: key === 'SCHOOL' ? 'OKUL' : key === 'ORGANIZATION' ? 'ORGANİZASYON' : key,
    screens: list.map((x) => ({ label: x.label, path: x.path, purpose: x.menuPurpose })),
    firstPath: first?.path || '',
  };
}
