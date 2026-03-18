# PERSONEL-SERVIS V1 — PROJECT SPEC (SSOT)
Ürün tanımı ve kapsam (kanonik özet)

## 1. Ürün Tanımı

Servis Platformu; servis aracı sağlayıcıları ile servis ihtiyacı olan firma, okul ve organizasyonları buluşturan; teklif, pazarlık, uzlaşma ve sözleşme süreçlerini yöneten; ardından vardiya, araç, sürücü, rota, canlı takip, kalite ve uyum süreçlerini uçtan uca yöneten bir **B2B servis pazaryeri + operasyon yönetim platformudur**.

Bu ürün yalnızca araç eşleştiren bir pazar yeri değildir. Aynı zamanda:
- hizmet ihtiyacını toplar,
- uygun sağlayıcıları görünür hale getirir,
- teklif ve uzlaşma sürecini kayıt altına alır,
- sözleşme sonrası günlük operasyonu çalıştırır,
- sahadaki hizmeti canlı olarak izler,
- kalite, görünürlük ve güven katmanı sağlar,
- hizmet alan kurumların gerçek hizmet sonrası değerlendirme yapabilmesini destekler.

## 2. Temel Problem

Servis ihtiyacı olan kurumlar ile servis sağlayıcılar arasındaki süreç çoğu zaman dağınık ve manuel yürür:
- ihtiyaç toplama, teklif alma ve pazarlık Excel / telefon / WhatsApp üzerinden ilerler,
- hangi aracın, hangi sürücünün, hangi zaman aralığında uygun olduğu geç anlaşılır,
- sözleşme sonrası operasyon elle vardiyaya çevrilir,
- canlı takip sınırlı veya dağınıktır,
- gecikme, hız ihlali, çevrimdışı kalma ve rota sapmaları geç fark edilir,
- hizmet kalitesi ve saha uygunluğu ölçülebilir değildir,
- hizmet alan kurumların memnuniyeti sistematik biçimde toplanamaz,
- kurum ile sağlayıcı arasındaki güven ilişkisi kayıtlı ve doğrulanabilir biçimde kurulamaz.

## 3. Çözüm

Servis Platformu bu sorunu üç ana katmanda çözer:

### A. Ticari Katman
- ihtiyaç / talep kartı oluşturma
- teklif toplama
- karşı teklif ve pazarlık geçmişi
- uzlaşma özeti
- sözleşme bağlama
- kapasite ve uygunluk kontrolü

### B. Operasyon Katmanı
- günlük vardiya üretimi
- araç / sürücü atama
- dispatch ve rota akışı
- canlı GPS takibi
- durak ve personel akışı
- no-show / kalite / raporlama
- görünür, izlenebilir ve denetlenebilir saha operasyonu

### C. Güven ve Kalite Katmanı
- hizmet kalitesi görünürlüğü
- canlı operasyon sağlığı
- hizmet alan değerlendirmesi
- sağlayıcı güven ve kalite sinyalleri
- uyum, kayıt ve denetlenebilirlik

## 4. Ürünün Ana Değeri

Platformun ana değeri şudur:
- kurum tarafı doğru sağlayıcıya daha hızlı ulaşır,
- sağlayıcı tarafı teklif ve kapasite yönetimini daha düzenli yapar,
- uzlaşılan hizmet sahada kopmadan yürür,
- canlı operasyon ölçülebilir hale gelir,
- kalite, uyum ve güven görünür olur,
- hizmet alan tarafın geri bildirimi gelecekteki ticari kararları besler.

## 5. Hedef Kullanıcılar

### Talep sahibi kurumlar
- COMPANY
- SCHOOL
- ORGANIZATION

Bu roller servis ihtiyacını oluşturur, teklifleri değerlendirir, uzlaşma ve sözleşme sürecini yürütür, hizmet tamamlandıktan sonra kalite değerlendirmesi verebilir.

### Servis sağlayıcı tarafı
- ROOM
- servis aracı sahipleri / oda yapıları / taşıma operasyon ekipleri

Bu taraf teklifleri yönetir, araç ve sürücü uygunluğunu kontrol eder, operasyonu sahaya indirir.

### Saha kullanıcıları
- DRIVER
- PERSONEL
- gerektiğinde PARENT / benzeri düşük sürtünmeli canlı erişim kullanıcıları

### Sistem yönetimi
- SUPER_ADMIN

## 6. Temel İş Akışı

Ürünün kanonik iş akışı aşağıdaki zincirdir:

1. Kurum servis ihtiyacını oluşturur.
2. İhtiyaç uygun sağlayıcılara görünür hale gelir.
3. Teklif / karşı teklif / pazarlık yürütülür.
4. Uzlaşma sağlanır ve sözleşme kaydı oluşur.
5. Sözleşmeden günlük operasyon planı üretilir.
6. Vardiya, araç ve sürücü atamaları yapılır.
7. Dispatch / rota / durak akışı başlatılır.
8. Sahada canlı takip, ETA, kalite ve istisna yönetimi çalışır.
9. Hizmet sonuçları raporlanır.
10. Hizmet alan kurum kalite değerlendirmesi verir.
11. Bu sonuçlar sonraki ticari kararları ve sağlayıcı güven görünürlüğünü besler.

## 7. V1 Kapsamı

### 7.1 Ticari / Pazaryeri Yetkinlikleri
- talep oluşturma
- teklif yaşam döngüsü
- pazarlık / karşı teklif zemini
- pazarlık geçmişi ve uzlaşma özeti
- sözleşme oluşturma
- sözleşme onay / iptal / uzatma
- tekliften sözleşmeye geçiş kapısı
- araç / sürücü / zaman uygunluk kontrolü
- çakışma görünürlüğü

### 7.2 Operasyon Yetkinlikleri
- vardiya oluşturma ve listeleme
- sözleşmeden günlük vardiya üretimi
- araç CRUD
- sürücü CRUD / bağlama / erişim güvenliği
- dispatch preview
- rota önizleme / rota öğrenme
- durak ilerleme akışı
- canlı takip ve GPS durum makinesi
- gecikme / stale / offline görünürlüğü
- raporlar ve gelmedi kaydı yönetimi

### 7.3 Güven / Kalite / Uyum Yetkinlikleri
- rol bazlı yetki ve scope izolasyonu
- audit ve doğrulanabilir işlem izi
- rate limit / edge security / session güvenliği
- KVKK notice / consent / matrix görünürlüğü
- ETA kalite alanları
- notification dedupe
- retention / backup disiplini
- GREEN pack/check doğrulaması
- tamamlanan hizmet sonrası hizmet alan kurum değerlendirmesi
- sağlayıcı kalite ve güven görünürlüğü için geri bildirim zemini

### 7.4 Yardım / Copilot Katmanı
- düşük bilişsel yükle çalışan Türkçe yardım deneyimi
- rehber / sohbet / ekran yardımı
- role göre sadeleştirilmiş açıklama
- read-only / suggestion-first yardım mantığı
- kullanıcının doğru adıma yönlendirilmesi
- daha doğal Türkçe cevap katmanı
- kısa konuşma hafızası ve takipli yardım akışı
- "neden ilerlemiyor?" ve "şimdi ne yapayım?" modları
- "daha basit anlat" seçeneği ve geri bildirim zemini

## 8. Rol Bazlı Ürün Özeti

### ROOM
- operasyon paneli
- teklif değerlendirme ve karar akışı
- araç / sürücü yönetimi
- vardiya onay / atama / başlatma
- dispatch ve canlı takip
- sözleşme conflict yönetimi

### COMPANY / SCHOOL / ORGANIZATION
- servis ihtiyacı oluşturma
- teklif ve sözleşme görünürlüğü
- planlama ve vardiya takibi
- ilgili canlı erişim ve kalite görünürlüğü
- tamamlanan hizmet sonrası değerlendirme ve geri bildirim

### DRIVER
- sürücü kodu + PIN login
- ilk girişte PIN değiştirme
- Today ekranı
- aktif rota ve görev akışı
- sürücünün telefon GPS'i ile canlı publish
- sesli rehber ve ETA
- izin / KVKK / session failure akışları

### PERSONEL / düşük sürtünmeli erişim kullanıcıları
- ihtiyaç / request üretimine veri sağlama
- gerekirse süreli canlı erişim bağlantısı
- düşük sürtünmeli saha görünürlüğü

### SUPER_ADMIN
- şirket / room kurulum ve görünürlük
- sistem düzeyi yönetim
- güvenlik / retention / backup / kontrol yüzeyleri

## 9. Ana Ürün Kararları

- Ürünün ana kimliği **B2B servis pazaryeri + operasyon platformu**dur.
- Sadece vardiya takibi yapan dar bir uygulama olarak konumlanmaz.
- Teklif–pazarlık–uzlaşma–sözleşme zinciri ürünün çekirdek parçasıdır.
- Sözleşme sonrası operasyon akışı aynı platform içinde devam eder.
- Canlı takip, kalite ve güven katmanı ürünün zorunlu bileşenidir.
- Hizmet alan kurum değerlendirmesi güven ve kalite katmanının parçasıdır.
- Planlama Merkezi tek oluşturma kaynağıdır.
- Vardiyalar ekranı oluşturma değil, takip / operasyon ekranıdır.
- DRAFT / REQUESTED ayrımı korunur.
- Room seçip teklif göndermeden iş markete düşmez.
- Guided Mode kullanıcıyı gereksiz draft mantığıyla uğraştırmaz.
- Dispatch preview shift bazlı çalışır.
- Gelmedi kaydı yalnızca yetkili akışta işlenir.
- Aktif gelmedi kaydı olan sürücü, atama / onay hattında server tarafında engellenir.
- Company default `maxWalkM = 250`
- School default `maxWalkM = 50`

## 10. Mimari

- **Backend:** Node.js (ESM) + Express + Prisma
- **DB:** PostgreSQL
- **Redis:** monitor + dedupe + jobs
- **Realtime:** Socket.IO
- **Route engine:** OSRM
- **Web:** Vite + React
- **Mobile:** React Native / Expo tabanlı sürücü uygulaması
- **Monorepo:** `backend/`, `web/`, `mobile/`, `infra/`, `docs/`, `tools/`

## 11. Ana Teknik Yetkinlikler

### Canlı Takip
- GPS state machine: `LIVE → STALE → OFFLINE → LIVE`
- dedupe edilmiş bildirimler
- sürücünün telefon GPS'i publish hattı
- aktif rota görünürlüğü

### Uygunluk ve Çakışma
- aynı driver aynı zaman aralığında iki shift'e atanamaz
- aynı vehicle aynı zaman aralığında iki shift'e atanamaz
- sözleşme rezervasyonları availability hesabına dahil edilir
- conflict raporu deterministik biçimde üretilir

### Sözleşmeden Operasyona Geçiş
- onaylı sözleşmelerden günlük vardiya üretimi
- duplicate guard
- sözleşme badge görünürlüğü
- sözleşme conflict kontrolü

### Rota Yetkinliği
- estimated route
- learned route
- gerçek GPS verisiyle rota doğrulama
- preview ve operasyon görünürlüğü

## 12. GREEN Disiplini

Bu repoda “tamamlandı” demek yalnızca kod yazmak değildir.

Bir iş ancak şu şartlarla tamam sayılır:
- ilgili pack/check hattı geçer,
- repo-contract doğrulanır,
- SSOT güncellenir,
- checklist resmi green olduktan sonra işaretlenir.

Kanonik yaklaşım:
- `tools/pack.ps1 -To <hedef>`
- ilgili milestone pack/check script'leri
- runbook + milestone + checklist senkronu

## 13. Ürün Dili Kararları

- agreement yerine **sözleşme**
- offer yerine **teklif**
- assignment yerine **atama**
- driver GPS yerine **sürücünün telefon GPS'i**
- sade Türkçe, düşük bilişsel yük, adım adım yönlendirme

## 14. Yardım / Copilot İlkeleri

Copilot ve yardım katmanı ürünün çekirdeğini bozmaz; onu açıklanabilir ve kullanılabilir hale getirir.

Kurallar:
- read-only / suggestion-first kalır
- scope dışı bilgi vermez
- kullanıcıyı doğru ekrana ve doğru adıma yönlendirir
- rol bazlı sade dil kullanır
- operasyon kullanıcıları için daha derin, sürücü/personel için daha basit anlatım sunar
- doğal Türkçe açıklama katmanı ile aynı kararı daha anlaşılır sunar
- kısa konuşma hafızası ile aynı konuda takipli yardım verir
- geri bildirim sinyali toplayarak iyileştirme zemini oluşturur

Operasyon Copilot rolleri:
- `SUPER_ADMIN`
- `ROOM`
- `COMPANY`
- `SCHOOL`
- `ORGANIZATION`

Basit rehber rolleri:
- `DRIVER`
- `PERSONEL`
- `PARENT`

## 15. V1 Başarı Kriteri

V1 başarılı sayılırsa:
- talep sahibi kurum ile sağlayıcı arasında tekliften sözleşmeye giden akış çalışır,
- sözleşmeden günlük operasyona geçiş kopmaz,
- vardiya / araç / sürücü / rota zinciri sahada işletilebilir olur,
- canlı takip ve istisna yönetimi görünürdür,
- kalite ve güven katmanı temel seviyede çalışır,
- hizmet alan kurum tamamlanan hizmete ilişkin temel kalite değerlendirmesi verebilir,
- rol bazlı kullanım sade ve anlaşılırdır,
- resmi green pack disiplini korunur.

## 16. Gelecek Güçlendirme Yönü

Ürünün saha öncesi profesyonelleşme yönü şu başlıklarda büyütülmelidir:
- gözlemleme ve saha teşhis katmanı,
- saha acceptance merkezi,
- milestone / SSOT hizası,
- daha doğal ve bağlamlı copilot,
- copilot geri bildirim ve doğal dil katmanı,
- cihaz sağlık görünürlüğü,
- GPS güven skoru,
- vardiya olay zaman çizgisi,
- operasyon kalite paneli,
- hizmet alan kurum değerlendirme sistemi,
- sağlayıcı kalite / güven puanı,
- ticari omurga görünürlüğü (talep kartı, teklif yaşam döngüsü, pazarlık geçmişi, uzlaşma özeti).

Saha testi keşif aşaması değildir; son doğrulama aşamasıdır. Bu nedenle saha öncesi sertleştirme hattı (`M59 → M65`) tamamlanmadan gerçek saha testine çıkılmaz.

Bu başlıklar V1 çekirdeğini değiştirmez; ürünü daha güçlü, daha güvenilir ve daha profesyonel hale getirir.


## 17. Pilot Launch Gate

`M65 — Pilot Launch Gate`, acceptance, gözlemleme, kalite ve cihaz/build uygunluk verilerini tek GO / LIMITED GO / NO-GO kapısında toplar.
