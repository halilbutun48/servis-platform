# Sağlam Merdiven

## Kalıcı Kabul Anayasası ve Paralel Codex Güvenlik Standardı

**Durum:** Dokümantasyon adayı — izole hazırlanmıştır; ana çalışma alanına
henüz entegre değildir.

**Kapsam:** SeferPakt'ın sekiz kullanıcı deneyimi, 11 Finans sekmesi,
Sefer Abi #18 yüzeyleri ve Planlama'dan Kârlılık'a ortak ürün zinciri.

**Otorite sınırı:** Bu belge `AGENTS.md`, `docs/AGENTS.md`,
`docs/PRIMER_SSOT.md`, `docs/NEXT_BACKLOG_V1.md`, `docs/MILESTONE_REGISTRY_V1.md`
ve locked-invariant kayıtlarının yerine geçmez. Onlarla çelişirse mevcut
canonical sahiplik, güvenlik ve milestone sözleşmesi geçerlidir. Bu belge
uygulama kodu, yeni state owner, yeni milestone, ikinci hesaplama motoru veya
paralel kabul sistemi oluşturmaz.

## 1. Temel ürün ilkesi

**İçeride güçlü, dışarıda basit.** Kullanıcı beş saniye içinde ekranın
amacını, mevcut bağlamı ve ilk güvenli adımı anlayabilmelidir. Sistem içeride
hesap, audit, yetki ve veri bütünlüğünü korur; kullanıcıya teknik enum, ham
JSON, iç hata kodu, secret, SQL veya geliştirici terimi göstermez.

Kabul, aşağıdaki zincirin tüm ilgili halkalarını aynı görev üzerinde bağlar:

`Kaynak → canonical runtime → gerçek kullanıcı görevi → backend iş kuralı →
veri/lineage → görünür sonuç → güvenlik negatifleri → responsive → kalıcı
regresyon → checkpoint`.

Bir checker, HTTP 200, API 200, statik test, sayfa açılışı, eski ekran
görüntüsü veya tek başına Sefer Abi cevabı ürün kabulü değildir.

## 2. Kullanıcı deneyimleri ve veri modeli

Kapsam:

1. `SUPER_ADMIN`
2. `ROOM`
3. `COMPANY`
4. `SCHOOL`
5. `ORGANIZATION`
6. `DRIVER`
7. `PERSONEL`
8. `PARENT`

`SCHOOL` ve `ORGANIZATION` ayrı Prisma/backend role enum'ları değildir;
`COMPANY` rolünün `Company.kind` ayrımıdır. Buna rağmen her ikisi de kendi
tenant'ı, sözleşmesi, dönemi, hizmeti ve kullanıcı göreviyle ayrı kabul
edilir. Aynı verinin başka müşteri türüne açılması kabul edilemez.

Her rol için yalnız gerçek yetkili oturum kullanılır. Erişilmeyen ekran
`PASS` değil `NOT_PROVEN`, `BLOCKED` veya `NOT_VISITED` olarak kaydedilir.

## 3. Kabul durumları ve kusur sınıfları

| Durum | Anlamı |
|---|---|
| `PASS_BOUNDED` | Belirlenmiş dar kapsam ve gerçek kanıt geçmiştir; genel ürün kapanışı değildir. |
| `NOT_PROVEN` | İddia için gerekli kaynak, runtime, kullanıcı, veri veya tarayıcı kanıtı yoktur. |
| `NOT_VISITED` | Yüzey keşfedilmiş veya beklenmiş, fakat gerçek kullanıcı ile incelenmemiştir. |
| `BLOCKED` | Güvenlik, erişim, yetki, fixture veya ortam kapısı ilerlemeyi durdurmuştur. |
| `CLOSED` | Kapsam, güvenlik, gerçek kullanıcı, regresyon ve provenance kanıtı birlikte tamamlanmıştır. |

Her bulgu şu sınıflardan biriyle etiketlenir: `PRODUCT_DEFECT`,
`FIXTURE_GAP`, `HARNESS_DEFECT`, `SECURITY_BLOCKER`, `ENVIRONMENT_BLOCK`,
`STALE_RUNTIME`, `NOT_PROVEN`, `PROVEN_CLOSED`.

Bir checker sonucunu ürün sonucuna dönüştürmek, assertion silmek, testi skip
etmek, toleransı kanıtsız artırmak veya eksik kanıtı fixture verisiyle gizlemek
yasaktır.

## 4. Ortak kabul matrisi

Her gerçek kullanıcı görevi için en az şu alanlar kaydedilir:

| Alan | Zorunlu içerik |
|---|---|
| Kimlik | Görev, checkpoint, kaynak snapshot SHA, frontend/API image ve bundle kimliği |
| Kullanıcı | Rol, kullanıcı, tenant, yetki kapsamı ve Company.kind |
| Konum | Route, ana menü, alt menü, sekme, modal/drawer/accordion, seçili kayıt, vardiya ve dönem |
| Amaç | Gerçek kullanıcının Türkçe görevi ve beş saniyelik ilk eylemi |
| Beklenti | Beklenen UI, backend kuralı, yetkili veri ve ekonomik sonuç |
| Kaynak | Canonical tablo/endpoint, lineage, kayıt oluşturma yolu ve kaynak zaman/snapshot |
| Sefer Abi | Öneri çipi, serbest soru, intent, rol/tenant/record bağlamı ve çok turlu geçmiş |
| Sonuç | Türkçe cevap, doğru ekran/kayıt yönlendirmesi, görünen değer ve kullanıcı görevinin tamamlanması |
| Güvenlik | Yanlış tenant, yanlış rol, stale kayıt, KVKK ve yetkisiz eylem negatifleri |
| Ekran | 1440, 1024, 390, 320; gerçek Chromium/device screenshot, DOM/trace/video gerektiğinde |
| Kalıcılık | Yenileme, yeniden giriş, context restore, idempotency ve audit sonucu |
| Provenance | Test/fixture/harness kaynak ID, aynı-build public kanıtı ve runtime tazeliği |
| Karar | `PASS_BOUNDED`, `PASS`, `FAIL`, `NOT_PROVEN`, `BLOCKED`, sınıf, kanıt yolları ve checkpoint |

Kanıtı olmayan alan boş bırakılmaz; `NOT_PROVEN` olarak yazılır.

## 5. Frontend + backend + Sefer Abi ortak kabulü

Bir özellik ancak üç katmanın aynı görevi taşımasıyla kapanır:

- **Frontend:** Kullanıcı doğru menü, kayıt, alan ve aksiyonu bulur; filtre,
  modal, drawer, tablo, boş/hata/belirsiz durum ve responsive davranış çalışır.
- **Backend:** Tenant/RBAC/KVKK, gerçek kayıt ilişkisi, iş kuralı,
  idempotency, audit, error contract ve kalıcı veri sonucu doğrudur.
- **Sefer Abi:** `ANLA → BAĞLAMI KORU → ANLAT → GÖSTER → YÖNLENDİR` zinciriyle
  Türkçe niyeti çözer, seçili kayıt/dönem/rol/tenant'ı kaybetmez, uygun
  menü/alanı açar ve yetkisiz bilgiyi uydurmaz.

Yazmalı eylemler, hazırlık/önizleme ve gerçek uygulama olarak ayrılır.
Önizleme gerçek sözleşme, fatura, ödeme veya maliyet kaydı üretmez. Onay
gereken eylem kullanıcı onayı olmadan uygulanmaz.

## 6. Finans 11 sekme ve ortak ekonomik kaynak

### 6.1 Kapsam

- **ROOM (5):** `Genel Durum`, `Giderlerim`, `Servis Maliyeti`,
  `Araç Karşılaştır`, `Teklif ve Kârlılık`.
- **COMPANY (2):** `Bütçe ve Servis Giderleri`, `Teklif ve Fiyat Rehberi`.
- **SCHOOL (2):** aynı canonical buyer-finance yolunun rol/tenant bağlamlı iki
  bölümü.
- **ORGANIZATION (2):** aynı canonical buyer-finance yolunun rol/tenant
  bağlamlı iki bölümü.

Ekran adları veya alt yüzeyler kaynakta yoksa uydurulmaz; gerçek route/DOM
envanteri kaydedilir.

### 6.2 Ekonomik zorunluluklar

1. Kabul edilmiş fiyatın tek canonical kaynağı korunur; eski teklif snapshot'ı
   kesin sözleşme borcu gibi kullanılmaz.
2. Tamamlanmış ve kanıtlanmış hizmet, hakedişin kaynağıdır. Seed edilmiş
   hakediş/fatura/tahsilat, otomatik operasyon kökeni kanıtı sayılmaz.
3. Fatura ve tahsilat ayrı ekonomik anlamlardır; aynı gelir iki kez toplanmaz.
4. COMPANY borcu ve ROOM alacağı aynı gerçek ticari ilişki/fatura üzerinden,
   yetkili rol görünümüyle hesaplanır.
5. Kullanıcı ödeme beyanı, otomatik hesaplanan bakiye ve karşı taraf/banka
   doğrulaması ayrı durumlardır; beyan otomatik tahsilat veya kesin hesaplama
   değildir. Kısmi, fazla, reddedilmiş, bekleyen ve mükerrer ödeme ayrı test edilir.
6. Gider, dağıtım, araç/sürücü maliyeti, bütçe ve teklif maliyeti aynı ekonomik
   olayı ikinci kez saymaz. Dağıtılan + bekleyen tutar kaynak gideri aşamaz.
7. KDV veya dönem bilinmiyorsa net maliyet/kâr kesinmiş gibi sunulmaz.
8. Mesafe, süre, boş kilometre veya maliyet bilinmiyorsa sıfır gibi gösterilmez;
   kullanıcıya açıklanır ve düzeltilecek canonical kayda yönlendirilir.
9. Geçici sonuç, eksik maliyet ve teklif varsayımı kesin net kâr diye etiketlenmez.
10. Sistemde bulunan bilgi tekrar kullanıcıdan istenmez; zorunlu alanın gerçek
    kullanıcı amacı açıklanabilir olmalıdır.

Her finans ekranı için başlangıç değeri, kullanıcı işlemi, bağımsız beklenen
değer, gerçek değer, diğer ekran yansıması, yenileme sonrası kalıcılık,
API/DB kaynağı ve güvenlik sonucu birlikte kaydedilir.

## 7. Sefer Abi #18 kabul standardı

Her rolün erişilebilir tüm menüleri, alt menüleri, sekmeleri, tabloları,
kartları, kayıt detayları, modalları, drawer'ları, filtreleri ve öneri çipleri
envanterlenir. İlk ekran veya çip sayfasının açılması tam kabul değildir.

Her çip ve serbest soruda şu bilgiler bulunur:

- niyet ve Türkçe varyantı;
- aktif rol, tenant, sayfa, sekme, kayıt, vardiya ve dönem;
- yetkili backend veri kaynağı;
- doğal Türkçe cevap;
- doğru menü/alan/kayıt yönlendirmesi;
- `Devam`, `Geri`, `Bulamadım`, düzeltme ve çok turlu devam davranışı;
- yanlış tenant, olmayan kayıt, stale bağlam, eksik veri ve yetkisiz işlem reddi;
- serbest soru ile öneri çipinin aynı yetkili sonucu üretmesi;
- 1440/1024/390/320 gerçek ekran kanıtı.

Gerekli bir öneri çipi yoksa bu doğrudan kabul boşluğudur; uydurma menü veya
veri eklenmez. Harici LLM/API/SDK veya kullanıcı konuşmasını dış servise
gönderen semantic fallback kabul edilmez.

## 8. Gerçek veri zinciri ve operasyonel fixture disiplini

Kapsamlı kabul şu zinciri izler:

`Personel/öğrenci → Planlama → Teklif/pazarlık → Kabul → Sözleşme → Vardiya →
Araç/sürücü → Rota/durak → Gerçekleşen hizmet → Hakediş → Fatura →
Ödeme/tahsilat → Maliyet/kârlılık`.

Fixture şu kurallara uyar:

- Ürün akışıyla üretilebilen kayıtlar doğrudan business SQL ile saklanmaz.
- DB'ye doğrudan yazım yalnız güvenlik/şema/izolasyon testinin açıkça gerekli
  olduğu teknik fixture sınırında kalır.
- En az bir gerçek çok duraklı senaryo bulunur; `rota/durak: 0` tam kabul değildir.
- Araç/sürücü değişikliği, rota değişimi, iptal/gecikme, eksik veri, retry,
  başarısız işlem, yeniden giriş ve idempotency sınırları ayrı görülür.
- Seed edilmiş finans kayıtları, tamamlanmış vardiyadan otomatik hakediş
  kanıtı olarak etiketlenmez.
- Canonical DEMO/production dışı hedef yeniden doğrulanmadan iş yazılmaz;
  canlı/ana DB'de kabul için rastgele finans yazımı yapılmaz.

## 9. Güvenlik, privacy ve çalışma zamanı

Her görevde aktif rol/tenant, backend yetkisi ve KVKK sınırı test edilir.
UI'da gizlenmiş buton backend güvenliği değildir. Açık adres, telefon,
öğrenci/veli/personel verisi, token, parola, secret, ham GPS ve iç not
gereksiz yere gösterilmez veya kanıta yazılmaz. PARENT rızası ve DRIVER cihaz
bağlama gibi korumalı işlemler yalnız açıkça yetkili fixture'da denenir.

Kaynak, frontend bundle, API image, DB/Redis ve public runtime aynı kanıt
epoch'unda bağlanır. Eski artifact, eski fixture veya başkasının screenshot'ı
güncel kanıt sayılmaz. Public same-build yoksa public iddiası `NOT_PROVEN`dir.

Aşağıdakiler ayrıca kontrol edilir: app/worker DB rol ayrımı, migration sahibi,
Redis fail-closed ve freeze, Socket.IO auth/tenant, queue/worker yan etkisi,
audit/idempotency, connection drain, backup/restore, rollback ve aylık toplam
altyapı maliyetinin 15.000 TL altında kalması. Bir kapı çalıştırılmadıysa
`NOT_PROVEN` olarak bırakılır.

### DRIVER cihaz yönetimi

- İzole DRIVER kabulünde kullanıcıdan manuel cihaz/PIN sıfırlaması istenmez.
- Cihaz bağlama veya sıfırlama gerekiyorsa yalnız ROOM'un yetkili ürün akışı
  kullanılır; açık onay, doğru tenant ve rol, audit kaydı, eski token'ın iptali
  ve yeni cihaz eşleşmesi birlikte doğrulanır.
- Doğrudan DB temizliği, cihaz akışındaki bir ürün eksikliğini gizlemek için
  kullanılamaz. Canonical gerçek cihaz eşleşmesi izinsiz değiştirilemez.
- Ürün akışı, approval, token iptali veya audit kanıtlanamıyorsa sonuç
  `NOT_PROVEN`/`BLOCKED` kalır; bu durum cihazı zorla sıfırlayarak kapatılmaz.

## 10. Parallel Codex güvenlik protokolü

Paralel veya art arda Codex işi başlarken:

1. Root ve nested `AGENTS.md`, aktif frontier ve son somut checkpoint okunur.
2. Çalışan Part B/C/D worktree, fixture, container ve artifact'leri listelenir.
3. Yeni iş ayrı worktree, ayrı fixture, ayrı port, ayrı secret, ayrı artifact
   ve ayrı checkpoint kimliği kullanır.
4. Başka işin dirty dosyası kopyalanmaz; `reset`, `clean`, `stash`, overwrite,
   merge, cherry-pick, commit, tag veya push yapılmaz.
5. Canonical 5273/3300, PostgreSQL, Redis, public tunnel ve devam eden Part D
   işine yazılmaz veya restart verilmez.
6. Ürün kodu/testi istenmiyorsa yalnız governance dokümanları değiştirilir.
7. Her bounded parça source/runtime/scope/evidence/status/next frontier içeren
   kalıcı checkpoint üretir.

Çalışma sonunda bu üç durum açıkça ayrılır:

- `DOCUMENTATION_PREPARED_ISOLATED`
- `MAIN_REPO_INTEGRATION_PENDING`
- `PART_D_UNCHANGED`

Bu üç durum hiçbir zaman `GOVERNANCE_FULLY_INSTALLED` anlamına gelmez.

## 11. Rapor ve checkpoint şablonu

Her kapanış raporu şu sırayı kullanır:

1. Problem, kapsam ve kapsam dışı alanlar.
2. Kaynak repo, branch, HEAD, worktree ve dirty durum.
3. Okunan AGENTS/standard/checkpoint kaynakları.
4. Role/route/surface/çip sayıları ve gerçekten ziyaret edilenler.
5. Gerçek kullanıcı görevi, beklenen/gerçekleşen ekonomik sonuç ve lineage.
6. Frontend/backend/Sefer Abi, security/tenant/KVKK, responsive ve public
   same-build kanıtları.
7. Test/fixture/harness/runtime sınıflandırması.
8. Değişen dosyalar, regresyonlar ve deployment sınırı.
9. `PASS`, `FAIL`, `NOT_PROVEN`, `BLOCKED` ve kusur sınıfları.
10. Kalan kesin engel ve yalnız bir sonraki en küçük iş.

Checkpoint asgari olarak source identity, isolated worktree, changed files,
evidence paths, no-shared-modification proof, Part D unchanged proof,
integration conditions ve status fields'i taşır.

## 12. Gelecek Codex görevinin açılış kontrolü

Gelecek görev bu belgeyi okuduğunu ve şu beş soruya cevap verdiğini yazmadan
uygulamaya geçmez:

- Tek gerçek kullanıcı problemi ve başarı ölçütü nedir?
- Hangi role/tenant/surface/record/period kapsamındadır?
- Hangi kanıt zaten kapanmıştır ve somut regresyon olmadan yeniden açılmayacaktır?
- Hangi worktree/fixture/runtime güvenle kullanılabilir?
- Hangi yazma, secret, deployment, migration, consent veya cihaz işlemi açıkça
  kapsam dışıdır?

Kapsam kapanmadan genel `GREEN`, `FULL D-LEVEL CLOSED`, `SAFE_TO_PROMOTE` veya
`CANONICAL_CUTOVER READY` ilan edilmez.

Finans 11-sekme kabulü ve Sefer Abi #18 kabulü ayrı kararlar olarak raporlanır;
aynı gerçek kullanıcı kanıtı aynı source/runtime ve aynı kayıt bağlamında
geçerliyse iki matriste yeniden kullanılabilir, fakat birinin kapanması diğeri
için otomatik kapanış değildir. Yeni milestone'lar yalnız gerçek bağımlılıkları
zorunlu tutar; ilgisiz kusur veya kanıtlanmamış kapsam nedeniyle yol haritası
genel olarak kilitlenmez.

## 13. #18 sonrası Repository Exit ve Test Altyapısı Kalibrasyonu

Bu, Sağlam Merdiven'in **#18 FULL D-LEVEL kabulünden sonra** yürütülecek ayrı
bir kapanış aşamasıdır. `#18 FULL_D_LEVEL_CLOSED` olmadan aktif frontier
değildir; B/C-3 veya devam eden rol/Finans/Sefer Abi çalışmasını kesmez,
yeniden başlatmaz ve önceliğini değiştirmez. Bu bölüm yol haritasına gelecek
faz olarak kayıtlıdır; mevcut repository temizliğini şimdi başlatma izni
vermez.

### 13.1 Başlangıç kapısı ve sınır

Başlangıçta güncel source/runtime kimliği, #18 checkpoint'i, `AGENTS.md`
hiyerarşisi, NEW-01 kanıtı, active frontier ve dirty worktree sahipliği
okunur. NEW-01 sonrasında oluşan ağacın yalnız gerçek güncel durumu incelenir;
NEW-01 temizliği baştan çalıştırılmaz. Tracked, untracked ve ilgili ignored
dosyalar; çalışan Part D veya başka bir görevin worktree, fixture, container,
volume, secret ve artifact'leriyle karıştırılmaz.

Bu fazda da `git reset --hard`, kontrolsüz `git clean`, kör checkout/restore,
kontrolsüz silme, başka işin dosyasını overwrite etme, canonical DB/Redis/
runtime değiştirme ve kanıt olmadan ürün kodu silme yasaktır. Her silme veya
retirement adımı önce sahiplik, tüketici, provenance, geri dönüş ve yeni
regresyon kanıtıyla karar haline gelir.

### 13.2 Repository exit envanteri

Her aday için şu sınıflandırma zorunludur:

- tracked, untracked ve ilgili ignored dosya;
- eski/kullanılmayan/mükerrer/geçici/sahipsiz dosya;
- route, endpoint, model, servis, feature flag ve dependency;
- checker, runner, harness, fixture, snapshot ve runtime kanıtı;
- dirty worktree değişikliği, sahibi, çakışması ve korunma kararı.

Bir dosya veya kod yolu kullanılmıyor denmeden import/call graph, route/package
registry, package script, Docker/runtime tüketicisi, Git geçmişi ve gerçek
regresyon sonucu birlikte değerlendirilir. Belirsiz tüketim korunur ve
`NOT_PROVEN`/karar bekliyor olarak kalır.

Ödeme aracılığı, payout ve settlement kalıntıları mevcut kesin ürün
politikasına göre karşılaştırılır. Manuel ödeme beyanı, ROOM tahsilat onayı,
audit, idempotency, canonical fatura/tahsilat ve finansal mutabakat korunur.
Kullanılmadığı iddia edilen bir yol, bu korunan zincirlerin yerine geçen veya
onları etkileyen bir yolsa ayrıca ürün sahibi kararı olmadan kaldırılamaz.

### 13.3 Test altyapısı kalibrasyonu

Checker, runner, harness ve fixture beklentileri gerçek son ürün davranışına
göre güncellenir; testleri zayıflatmak için assertion silme, skip, kanıtsız
tolerans, sahte fixture, eski ekran görüntüsü veya stale artifact kullanılamaz.

Her eski beklenti için önce `PRODUCT_DEFECT`, `FIXTURE_GAP`,
`HARNESS_DEFECT`, `STALE_RUNTIME`, `NOT_PROVEN` veya `PROVEN_CLOSED`
sınıflandırması yapılır. Gerçek kullanıcı kabul ve güvenlik kapıları checker
kalibrasyonuyla ortadan kaldırılamaz. Test değişikliğinden sonra etkilenen
ürün akışları aynı release adayında yeniden doğrulanır.

### 13.4 Tek aday ve kapanış kanıtı

Gerekli kaynak/test düzeltmeleri tek izlenebilir adayda birleştirilir. Aday
üzerinde en az şu kanıtlar aynı source/runtime epoch'una bağlanır:

1. birleşik backend/frontend regresyonu ve build/lint;
2. API/worker/Redis/Socket.IO, tenant/RBAC/KVKK ve audit/idempotency;
3. sekiz rolün kritik gerçek kullanıcı akışları;
4. ROOM 5 + COMPANY/SCHOOL/ORGANIZATION 6 Finans sekmesinin matematiği;
5. Sefer Abi #18 menü/çip/serbest Türkçe/çok turlu bağlamı;
6. 1440/1024/390/320 gerçek Chromium ve responsive kanıtı;
7. canonical/public same-build, provenance, backup/rollback ve dirty-tree
   sınırları.

Her kanıtın kaynak snapshot'ı, API/frontend artifact'i, fixture/harness kimliği,
kanıt yolu ve `PASS/FAIL/NOT_PROVEN/BLOCKED` kararı yazılır. #18 kapanmadan
bu kapanış fazına ait sonuçlar üretilmez; #18 sonrasında bile bir kapı
kanıtlanmamışsa `REPOSITORY_EXIT_NOT_PROVEN` korunur.

### 13.5 Git kapanış sınırı ve devir

Yalnız tüm uygulanabilir ürün, güvenlik, test, provenance ve repository-exit
kapıları geçtikten sonra, ayrıca yetkili kullanıcı kararıyla commit, uygun tag
ve push yapılabilir. Bu governance kaydı tek başına Git kapanış yetkisi
vermez. Kapanış raporu; repository exit checkpoint'i, test kalibrasyon
raporu, dirty worktree uzlaştırması, son birleşik kabul matrisi ve Git
kapanış kanıtını taşır.

Bu fazın sonraki görev adı:
`SEFERPAKT — #18 SONRASI REPOSITORY EXIT VE TEST ALTYAPISI KALİBRASYONU`.
