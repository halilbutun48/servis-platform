# ROADMAP-LOCK-AI-MARKETPLACE-01

Tarih: 2026-06-08
Repo: `servis-platform`

## QUALITY-GATE-FINAL-01B sonrası karar
- Final kalite kapısı başarıyla kapandı.
- UX-FIX/BLOCKER/NOT-FOUND 0 bundan sonraki tüm milestone'lar için taban kabul.
- Runtime-data/browser-smoke commit dışı kalacak.
- Backend route/service/schema veya Prisma değişikliği yalnızca açık scope varsa yapılacak.
- Final hardening / release hattı en sona kalacak.
- Quality gate referansı olarak `QUALITY-GATE-FINAL-01B` ve `docs/QUALITY_GATE_FINAL_01.md` korunur.
- Bundan sonraki hat: Marketplace temel hattı + güçlü Sefer Abi AI yol haritası.

## SeferPakt ürün vaadi
SeferPakt, servis tedarikini buluşturan, sözleşmeden vardiyaya otomatik operasyon kuran, canlı GPS ve kanıtla servisi denetleyen, kaliteye göre hakedişi güvenli önizleyen ve yapay zekâ ile maliyet/saha risklerini önceden yakalayan kurumsal servis operasyon platformudur.

## Sefer Abi nihai AI vizyonu
Sefer Abi'nin nihai hedefi:
- ChatGPT benzeri doğal Türkçe konuşur.
- Kullanıcıyla ekran ve rol bağlamına göre sohbet eder.
- "Bu ekranda neye bakmalıyım?", "Bu kayıtta risk var mı?", "Sıradaki işlem ne?" gibi soruları cevaplar.
- Sesli komut alır.
- Web, mobile ve driver yüzeylerinde bağlamı anlar.
- Excel/dosya okuyabilir.
- Excel içindeki ad, soyad, adres, telefon, vardiya, kurum, not gibi kolonları tanır.
- Kolon eşleştirme önerisi yapar.
- Eksik veya belirsiz kolonları kullanıcıya sorar.
- KVKK ve veri güvenliği uyarılarını gösterir.
- Adresleri geocode eder.
- Her adres için güven skoru üretir.
- Düşük güvenli adresleri işaretler.
- OSRM ile mesafe/süre matrisi çıkarır.
- Sabah inbound ve akşam outbound rota mantığını ayırır.
- Sabah: personel durakları -> şirket/kurum hub.
- Akşam: şirket/kurum hub -> personel durakları.
- Kapasite, araç tipi, mesafe, süre ve saha riskine göre rota taslağı üretir.
- Durak sırası, toplam km, tahmini süre, kapasite kullanımı ve risk notlarını gösterir.
- Harita üstünde rota/mini-map/preview gösterebilir.
- RFQ/teklif çağrısı hazırlar.
- Tedarikçi/oda adaylarını kalite, fiyat, mesafe, kapasite, geçmiş performans ve saha riskiyle karşılaştırır.
- Gelen teklifleri analiz eder.
- Pazarlık noktalarını çıkarır.
- En iyi teklifleri gerekçeli sıralar.
- Vardiyadan sözleşme hazırlığı yapar.
- Sözleşmeden vardiya/dispatch hazırlığı yapar.
- Canlı GPS, kanıt, kalite, hakediş ve maliyet sinyallerini yorumlar.
- Riskleri erken görünür kılar.
- Sıradaki en doğru aksiyonu önerir.
- Kritik işlemleri insan onayına sunar.
- Onaydan sonra sadece guard'lı, kayıtlı, izin verilen aksiyonları uygular.
- Sefer Abi, SeferPakt içinde maksimum güçlü AI operasyon zekâsı olacak.
- Bu güç milestone/check/smoke/audit/human approval guard ile sırayla açılır.

### Maksimum güçlü AI hedefi
- Sefer Abi bu projede maksimum güçlü AI operasyon zekâsı olacak.
- Hedef, kullanıcının sadece denetleyen/onaylayan kişi konumuna gelmesi; Sefer Abi'nin ise her panelde, her rolde, tüm görünür ve geçmiş verileri analiz edip en doğru seçenekleri hazırlaması, açıklaması, önermesi ve insan onayıyla güvenli şekilde uygulamaya hazırlamasıdır.
- Her paneli anlar.
- Her rolün bağlamını bilir.
- Kullanıcının hangi ekranda olduğunu, hangi kaydı seçtiğini, hangi aksiyonların mümkün olduğunu anlar.
- Tüm operasyon verilerini analiz eder.
- Riskleri bulur.
- Eksikleri tespit eder.
- En doğru seçeneği önerir.
- Alternatifleri karşılaştırır.
- Gerekçeli karar önerisi sunar.
- Kullanıcının komutunu anlar.
- Kullanıcının istediği sonucu oluşturmak için gerekli hazırlıkları yapar.
- Kritik işlemleri kullanıcı onayına sunar.
- Kullanıcı onayladıktan sonra sadece izinli, guard'lı ve audit log'lu aksiyonları uygular.

### Kullanıcının hedef deneyimi
- “Bu talebi en iyi nasıl çözeriz?”
- “Bu Excel’den servis planı çıkar.”
- “En uygun tedarikçileri sırala.”
- “Bu vardiyayı sözleşmeye hazırla.”
- “Bugünkü riskleri söyle.”
- “Sürücü tarafında sorun var mı?”
- “En doğru aksiyonu öner.”
- “Bunu onaylıyorum, hazırla/uygula.”
- Kullanıcı verileri analiz etmek zorunda kalmaz; Sefer Abi analiz eder, özetler ve önerir.
- Eksik bilgi varsa önce sorar.
- Sonucu hazırlarken maliyet, kalite ve saha etkisini görünür kılar.

### Her panel / her rol hedefi
1. Super Admin
- Sistem genelini analiz eder.
- Oda/şirket/tedarikçi/kalite/operasyon risklerini görür.
- Sahaya çıkış uygunluğunu yorumlar.
- Audit/log/KVKK risklerini açıklar.
- Sistem genelinde en kritik aksiyonları önerir.

2. Room
- Araç, sürücü, vardiya, sözleşme, dispatch, kalite ve saha risklerini analiz eder.
- Hangi vardiyanın önce ele alınması gerektiğini söyler.
- Eksik araç/sürücü/rota/kanıt/görev risklerini bulur.
- Teklif/sözleşme/dispatch hazırlığını önerir.

3. Company
- Talep, sözleşme, vardiya, personel erişimi ve rota değişikliği süreçlerini analiz eder.
- En uygun sözleşme/vardiya aksiyonunu önerir.
- Personel verisi, adresler ve servis ihtiyaçlarından operasyon taslağı çıkarır.
- Şirket için maliyet, kalite ve saha etkisini özetler.

4. Driver
- Sesli komut alır.
- Görev, rota, durak, check-in, kanıt ve GPS durumunu açıklar.
- Sürücüye kısa, net, güvenli öneri sunar.
- “Sıradaki durağım neresi?”, “Görev neden başlamıyor?”, “Check-in için ne yapmalıyım?”, “Rota dışına mı çıktım?” gibi soruları cevaplar.
- Gerektiğinde sesli uyarı verir.
- Kritik işlemleri otomatik yapmaz; teyit ister.

5. Personel / Parent
- Servisin nerede olduğunu ve neden görünmediğini açıklar.
- Canlı takip, durak değişikliği, biniş/iniş ve rota etkisini sade dille anlatır.
- Belirsizlik varsa güvenli fallback verir.
- Kullanıcıya doğru sonraki adımı önerir.

6. School / Organization
- Kurum planları, duraklar, personel/öğrenci adresleri ve servis planlarını analiz eder.
- Mini-map/rota/durak önizlemesini yorumlar.
- Excel’den gelen adres/ad-soyad verisiyle rota taslağı hazırlama hedefini destekler.

### Maksimum AI yetenek hedefleri
A) Doğal konuşma
- ChatGPT benzeri doğal Türkçe konuşur.
- Rol ve ekran bağlamına göre cevap verir.
- Kullanıcıyla çok turlu konuşur.
- Eksik bilgi varsa sorar.
- Kendi önerisini gerekçelendirir.

B) Sesli komut
- Web/mobile/driver yüzeylerinde sesli komut alabilir.
- Kullanıcı komutunu niyet olarak anlar.
- Sürücüye, şirket yetkilisine, oda yetkilisine ve admin'e rol bazlı cevap verir.
- Sesli uyarı ve sesli öneri verebilir.
- Kritik işlemler için sesli teyit ister.

C) Sesli uyarı / bildirim
- Sadece yazılı bildirim değil, uygun yüzeylerde sesli uyarı da hedeflenir.
- Örnekler:
  - “GPS sinyali zayıf.”
  - “Sıradaki durak yaklaşıyor.”
  - “Check-in kanıtı eksik.”
  - “Bu vardiyada araç ataması yok.”
  - “Rota sapması riski var.”
  - “Sözleşme taslağı için onay bekleniyor.”
- Sesli uyarılar rahatsız edici olmayacak; rol, önem seviyesi ve kullanıcı ayarına göre çalışacak.

D) Excel / dosya analizi
- Excel’deki ad, soyad, adres, telefon, vardiya, kurum, not kolonlarını tanır.
- Kolon eşleştirme önerir.
- Eksik veya hatalı verileri işaretler.
- KVKK uyarısı gösterir.
- Kalıcı işlem yapmadan önce önizleme üretir.

E) Adres / geocode / OSRM rota zekâsı
- Adresleri geocode eder.
- Her adres için güven skoru üretir.
- Düşük güvenli adresleri kullanıcıya sorar.
- OSRM ile mesafe/süre matrisi çıkarır.
- Sabah inbound ve akşam outbound mantığını ayırır.
- Durak sırası, toplam km, tahmini süre, kapasite kullanımı ve risk notlarını gösterir.
- Harita/mini-map/rota preview üretir.
- Rota apply/vardiya create insan onayı olmadan yapılmaz.

F) Marketplace ve teklif zekâsı
- Tedarikçi/oda adaylarını karşılaştırır.
- Kapasite, kalite, geçmiş performans, mesafe, fiyat ve saha riskiyle sıralama önerir.
- RFQ hazırlar.
- Gelen teklifleri analiz eder.
- Pazarlık noktalarını çıkarır.
- En doğru teklifleri gerekçeli önerir.
- Tedarikçiyi otomatik kesin seçmez; insan onayı ister.

G) Sözleşme / vardiya / dispatch zekâsı
- Talebi sözleşme taslağına hazırlar.
- Sözleşmeden vardiya taslağı çıkarır.
- Vardiyadan dispatch hazırlığı yapar.
- Eksik araç/sürücü/rota/kanıt risklerini gösterir.
- Uygulama adımında insan onayı ister.

H) Proaktif risk zekâsı
- Saha, maliyet, kalite, kanıt, GPS, kapasite ve hakediş risklerini önceden yakalar.
- Kullanıcı sormadan risk kartı önerebilir.
- “Sıradaki en doğru aksiyon” önerisi sunar.
- Alert-to-action card üretir.

### Güvenli aksiyon modeli
Her güçlü AI işlemi şu modelle ilerler:
Anla -> Analiz et -> En iyi seçenekleri sun -> Riskleri açıkla -> İnsan onayı al -> Guard'lı uygula -> Audit log yaz

Kullanıcının sadece onaylayacağı hedef doğru; ancak onaydan önce Sefer Abi şunları yapmak zorunda:
- Ne yapacağını açıkça özetlemek.
- Hangi veriye dayanarak önerdiğini göstermek.
- Riskleri söylemek.
- Geri alınamaz veya kritik etkileri belirtmek.
- Yetkili rolün onayını almak.
- Audit log üretmek.

İnsan onayı olmadan yapılmayacak kritik işlemler:
- tedarikçi kesin seçimi
- sözleşme kesin bağlama
- ödeme/hakediş kesinleştirme
- rota apply
- vardiya create/apply
- sürücü/araç atama değiştirme
- durak atlama/tamamlama
- kanıt oluşturma
- sürücüye saha talimatı gönderme
- SMS/push gönderimi
- üyelik/davet/doğrulama kararı
- KVKK/security etkisi olan işlem

### Public marketing guard özeti
- Dışarıda “AI her şeyi kendi yapar” denmeyecek.
- Ama içeride roadmap hedefi net olacak: Sefer Abi, SeferPakt içindeki tüm operasyonu anlayan, öneren, hazırlayan, sesli/yazılı komut alan, Excel/OSRM/teklif/kalite/risk/saha verilerini analiz eden maksimum güçlü operasyon AI katmanıdır.

### AI Promise Strategy / Güven Stratejisi
- "Underpromise, overdeliver" ilkesi uygulanır.
- SeferPakt AI kabiliyetlerini pazarlarken abartılı ve kanıtlanmamış otomasyon iddiaları kurmaz.
- Kullanıcıya vaat edilen şey, ürünün kesin olarak yaptığı, testle kanıtlanmış ve milestone, check, smoke, acceptance ile kanıtlanmış kabiliyetlerden oluşur.
- Vaat edilen kabiliyet testle kanıtlanmış olmalı; Sefer Abi içeride daha fazlasını yaparsa bu güveni artırır.
- Sefer Abi'nin iç ürün hedefi maksimum güçlü operasyon AI'ıdır.
- Public vaatler yalnızca milestone, check, smoke, acceptance ve human approval guard ile kanıtlanmış kabiliyetlerden oluşur.
- Eğer ürün vaat ettiğinden daha azını yaparsa güven zedelenir.
- Eğer ürün vaat ettiğinden fazlasını güvenli şekilde yaparsa güven artar.
- Sefer Abi içeride daha fazlasını yaparsa bu güveni artırır.
- Public marketing için doğru yaklaşım:
  - "Sefer Abi operasyon risklerini erken görünür kılar."
  - "Sefer Abi teklif, rota, vardiya ve saha sinyallerini analiz ederek en doğru seçenekleri hazırlar."
  - "Kritik aksiyonlar human approval ile güvenli şekilde ilerler."
  - "Sefer Abi kullanıcıya karar desteği sunar ve onaylanan adımları guard'lı şekilde hazırlar."
- Kullanılmayacak cümleler:
  - "Her şeyi yapay zekâ yapar."
  - "İnsan gerekmeden tüm servis operasyonu tamamlanır."
  - "AI otomatik tedarikçi seçer."
  - "AI otomatik ödeme/sözleşme kesinleştirir."
  - "Excel'i yükleyin, tüm operasyon kendiliğinden biter."
- İç ürün hedefi:
  - Her paneli ve her rolü anlayacak.
  - Verileri analiz edecek.
  - En doğru seçenekleri sunacak.
  - Kullanıcıya sadece onay/ret kararını bırakacak seviyeye yaklaşacak.
  - Sesli komut, sesli uyarı, Excel analizi, OSRM rota taslağı, tedarikçi/teklif analizi, risk tahmini ve aksiyon hazırlığı kabiliyetleri milestone'larla sırayla açılacak.
  - Tüm kritik işlemler human approval, guard ve audit log ile ilerleyecek.

## ChatGPT benzeri doğal konuşma hedefi
- Sefer Abi, kullanıcıyla doğal Türkçe konuşabilen operasyon asistanı olacak.
- Genel amaçlı "her konuda ChatGPT" gibi pazarlanmayacak.
- SeferPakt operasyon domain'ine odaklı olacak.
- Kullanıcının rolünü, ekranını, seçili kaydı ve görünür sinyalleri anlayacak.
- Yanıtları rol bazlı olacak:
  - Sürücüde kısa, sakin, görev/rota/check-in odaklı.
  - Web Copilot'ta daha analitik ve açıklayıcı.
  - Veli/personel tarafında güven verici ve sade.
  - Super Admin/Room/Company tarafında operasyon/risk/aksiyon odaklı.

## Driver Voice Copilot / Sürücü Sesli Sefer Abi
Sefer Abi sadece ofis/web Copilot değil; sürücü tarafında da sesli komut alan, konuşarak yardımcı olan, görev/rota/check-in/kanıt süreçlerinde öneri sunan saha asistanı olacak.

Driver Voice Copilot nihai hedefi:
- Sürücüyle doğal Türkçe konuşur.
- Sürücü sesli komut verebilir.
- "Sıradaki durağım neresi?"
- "Görev neden başlamıyor?"
- "Check-in için ne yapmalıyım?"
- "Rota dışına mı çıktım?"
- "Bu yolculukta eksik kanıt var mı?"
- "Servis tamamlanabilir mi?"
- "Bir sonraki personel kim?"
- "Haritayı aç"
- "Sonraki durağı göster"
- "Kanıt ekranını aç"
  gibi komutları ve soruları anlayabilir.

Sürücü tarafında yardımcı olacağı alanlar:

### A) Görev başlangıcı
- Görev başlamıyorsa nedenini açıklar.
- Araç/sürücü/vardiya/konum/GPS/aktif zaman penceresi gibi eksikleri söyler.
- "Önce konum iznini kontrol et", "Atanmış araç görünmüyor", "Vardiya henüz aktif değil" gibi güvenli öneriler verir.

### B) Rota ve durak yardımı
- Sıradaki durağı söyler.
- Durak sırası ve ETA hakkında güvenli bilgi verir.
- ETA belirsizse "tahmini / güven düşük" diye açıklar.
- OSRM/rota verisi varsa rota yönlendirme önizlemesi sunar.
- Rota dışı kalma, GPS zayıf, stale/offline gibi riskleri açıklar.

### C) Check-in / kanıt yardımı
- QR/kamera/check-in ekranında sürücüye adım adım yardımcı olur.
- Eksik kanıtları açıklar.
- Kamera/QR sorununda fallback adımı önerir.
- Kanıtı otomatik uydurmaz veya tamamlanmış gibi göstermez.

### D) Canlı saha riskleri
- GPS zayıf/offline/stale durumunu açıklar.
- Gecikme veya rota sapması riskini söyler.
- Sıradaki doğru adımı önerir.
- Gerektiğinde "operasyon merkeziyle iletişime geç" önerisi verir.

### E) Güvenli sesli komut modeli
Sürücü sesli komut verdiğinde:
Dinle -> Anla -> Ekran/görev bağlamıyla eşleştir -> Güvenli özetle -> Gerekirse teyit iste -> Guard'lı aksiyon öner

Sürücü sesli komutuyla otomatik yapılmayacak işlemler:
- görev tamamlama
- durak atlama
- kanıt oluşturma
- rota değiştirme
- sürücü/araç atama
- ödeme/hakediş işlemi
- sözleşme işlemi
- SMS/push gönderimi
- disiplin/yaptırım/ceza işlemi

Bu işlemler varsa:
- önce özetlenecek
- riskleri gösterilecek
- ilgili yetkili rol veya sürücüden açık teyit alınacak
- audit log üretilecek
- milestone guard olmadan runtime action açılmayacak

## Excel'den OSRM rota taslağı
Kullanıcı Excel dosyası yüklediğinde Sefer Abi şu akışı hedefler:
Excel yükle -> Kolonları tanı -> Ad/soyad/adres/telefon/vardiya/kurum verisini ayrıştır -> KVKK uyarısı göster -> Adresleri geocode et -> Güven skoru üret -> Düşük güvenli adresleri kullanıcıya sor -> OSRM ile mesafe/süre matrisi çıkar -> Sabah/akşam yönünü ayır -> Kapasite/araç tipi/süre/mesafe riskini hesapla -> Durak sırası ve rota taslağı öner -> Haritada önizle -> İnsan onayı al -> Guard'lı draft oluştur

Detaylar:
- Excel içeriğinden doğrudan kalıcı işlem yapılmaz.
- Önce kolon eşleştirme ve veri önizleme yapılır.
- Düşük güvenli adreslerle otomatik rota apply yapılmaz.
- OSRM rota taslağı sadece önizleme/draft olarak başlar.
- Vardiya create/apply insan onayı ve milestone guard olmadan yapılmaz.
- Rota çizgisi, durak sırası, toplam km, tahmini süre, kapasite kullanımı ve risk notları gösterilir.

## Sefer Abi güvenli aksiyon modeli
Her kritik işlem şu modelle ilerler:
Anla -> Analiz et -> En iyi seçenekleri sun -> Riskleri açıkla -> İnsan onayı al -> Guard'lı uygula -> Audit log yaz

İnsan onayı olmadan yapılmayacak işlemler:
- tedarikçi kesin seçimi
- sözleşme kesin bağlama
- ödeme/hakediş kesinleştirme
- rota apply
- vardiya create/apply
- sürücüye saha talimatı
- SMS/push gönderimi
- kullanıcı/davet/üyelik/doğrulama kararı
- KVKK/security etkisi olan işlem

## Public marketing claim guard
Kullanılabilir cümleler:
- "Sefer Abi, servis operasyonundaki riskleri erken görünür kılar, tekliften vardiyaya akışı hazırlar ve kritik aksiyonları insan onayıyla güvenli hale getirir."
- "Sefer Abi, dosya, adres, rota, teklif ve saha sinyallerini anlayarak operasyonu önizler, riskleri açıklar ve güvenli aksiyon önerir."
- "Sefer Abi, sürücüye görev, rota, check-in ve saha risklerinde sesli yardımcı olur; kritik adımları güvenli teyitle ilerletir."
- "Kritik işlemler insan onayıyla ilerler."

Kullanılmayacak cümleler:
- "AI her şeyi kendi yapar."
- "İnsan gerekmeden servis operasyonunu tamamlar."
- "Excel'i yükleyin, tüm sözleşme ve ödeme otomatik bitsin."
- "En iyi tedarikçiyi otomatik seçer."
- "Ödemeyi otomatik kesinleştirir."
- "Sözleşmeyi otomatik bağlar."
- "Sahadaki tüm sorunları kesin yakalar."
- "AI sürücünün yerine tüm görevi tamamlar."
- "Kanıtları otomatik oluşturur."
- "İnsan onayı olmadan rota/servis/görev kararlarını verir."

## Invite-based membership guard
- `INVITE-BASED-MEMBERSHIP-01` `ONBOARDING-REVIEW-01 FINAL AUDIT` sonrasında gelir.
- Public lead'ler otomatik olarak kullanıcı hesabına dönüşmez.
- İnsan onayı olmadan kullanıcı oluşturma yok.
- Self-service signup veya automatic membership açılmaz.
- Automatic company / room membership açılmaz.
- Payment, billing, collection, settlement ve contract execute açılmaz.
- Verified supplier veya supplier verification auto akışı açılmaz.
- Email, SMS ve push açılmaz.
- Human approval, guard ve audit log zorunludur.
- Invite draft / pending invite yalnızca güvenli user-creation altyapısı zaten varsa planlanır; bu roadmap/check runtime davranış açmaz.

## Roadmap sırası
### A) MARKETPLACE TEMELİ
- PUBLIC-LANDING-01 final promise check
- ONBOARDING-REVIEW-01 final audit
- INVITE-BASED-MEMBERSHIP-01
- VERIFIED-SUPPLIER-01
- UX-MARKETPLACE-PANELS-01

### B) SAHA / KALİTE / TEKLİF MOTORU
- M44-TELEMATICS-T1-T5
- SAFE-DRIVE-01
- OFFER-RANKING-QUALITY-01

### C) COPILOT STRATEJİ VE GUARDRAIL
- COPILOT-ROLE-TASK-MATRIX-01
- COPILOT-AI-ACTION-ROADMAP-01
- COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01
- COPILOT-HUMAN-APPROVAL-01

### D) EXCEL / ADRES / OSRM ROTA TASLAĞI HATTI
- COPILOT-EXCEL-DEMAND-IMPORT-01
- ADDRESS-GEOCODING-CONFIDENCE-01
- COPILOT-STOP-ROUTE-DRAFT-01
- OSRM-ROUTE-DRAFT-FROM-EXCEL-01
- COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01

### E) COPILOT OPERASYON AKIŞI
- COPILOT-DEMAND-INTAKE-01
- COPILOT-RFQ-PREP-01
- SUPPLIER-MATCHING-01
- SUPPLIER-OFFER-COLLECT-01
- COPILOT-OFFER-ANALYSIS-01
- COPILOT-NEGOTIATION-ASSIST-01
- COPILOT-OFFER-RECOMMENDATION-01
- COPILOT-SHIFT-TO-AGREEMENT-PREP-01
- COPILOT-DISPATCH-ACTION-PREP-01
- COPILOT-ACTION-PREP-01

### F) VOICE / PROACTIVE / AUTOPILOT
- VOICE-COPILOT-ROLE-ASSISTANT-01
- VOICE-COPILOT-COMMANDS-01
- VOICE-COPILOT-CONFIRMATION-01
- DRIVER-VOICE-COPILOT-01
- DRIVER-VOICE-ROUTE-ASSIST-01
- DRIVER-VOICE-CHECKIN-ASSIST-01
- DRIVER-VOICE-RISK-ALERTS-01
- PROACTIVE-COPILOT-01
- COPILOT-NEXT-BEST-ACTION-01
- COPILOT-ALERT-TO-ACTION-CARD-01
- COPILOT-SAFE-AUTOPILOT-01

### G) FINAL HARDENING / RELEASE - EN SON
- PERF-REGRESSION-01
- SECURITY-KVKK-FINAL-01
- PROD-HARDENING-01
- FIELD-ACCEPTANCE-01
- RELEASE-CANDIDATE-01

## Marketplace write boundary
- Lead capture var ama self-service membership yoksa açık yaz.
- Invite-based membership ayrı milestone olmadan üyelik açılmayacak.
- Verified supplier ayrı milestone olmadan tedarikçi doğrulama iddiası yok.
- Offer ranking quality ayrı milestone olmadan otomatik tedarikçi sıralama iddiası yok.
- Payment/settlement execute yok.
- Contract/agreement execute yok.
- Route apply yok.
- SMS/push yok.
- Hepsi milestone guard ve insan onayıyla açılacak.

## Her yeni milestone acceptance standardı
Her milestone için:
- check script
- docs
- product-extensions chain
- verify:final
- backend/web lint 0 warning
- smoke gerekiyorsa fresh smoke
- runtime-data/browser-smoke commit dışı
- backend route/service/schema değişikliği açık scope olmadıkça yok
- Prisma/migration açık scope olmadıkça yok
- UX-FIX/BLOCKER/NOT-FOUND 0

## Kısa not
Bu doküman docs/check milestone'udur; runtime feature açmaz ve stage/commit/tag/push içermez.
