VARDIS / PERSONEL SERVİS V1 – PRIMER SSOT (2026-03-29)

KİMLİK
- Marka adı: Vardis
- İç proje/çalışma adı: Personel Servis V1
- Repo: D:\servis-platform
- Branch: main
- STABLE_TO: 78
- Güncel durum: M78 GREEN alındı, M79-Prep auth/docs kapanışı yapıldı

DOĞRU ÜRÜN TANIMI
- Bu proje sadece “personel servisi” değildir.
- Bu proje sadece “öğrenci/veli sistemi” de değildir.
- Bu proje sadece “operasyon sistemi” de değildir.
- Doğru tanım:
  - GPS tabanlı karma servis/taşıma platformu
  - pazar + sözleşme + operasyon + kalite/yönetim omurgası
  - okul ve kurumsal taşıma alanlarını birlikte taşıyan çoklu domain yapı

ÜRÜNÜN BİRLİKTE YAŞAYAN ANA ALANLARI
1) Okul alanı
- school
- student
- parent

2) Kurumsal/personel alanı
- company
- organization
- personel

3) Operasyon alanı
- room
- driver
- vehicle
- shift
- gps
- attendance

4) Ticari alan
- market
- teklif
- pazarlık
- sözleşme
- ticari akış

5) Kalite / yönetim alanı
- hizmet değerlendirme
- trust-quality
- provider score
- raporlar
- admin kontrolü

KISA ÜST ANLATIM
- Vardis, servis taşımacılığında talep, ticari eşleşme, sözleşme, atama ve canlı operasyon süreçlerini tek sistemde birleştiren GPS tabanlı bir platformdur.
- Sistem hem okul/öğrenci/veli hem de company/organization/personel alanlarını birlikte taşıyabilen bir omurgaya sahiptir.
- Ürünün kritik farkı, ticari akış ile operasyonel akışı aynı ürün içinde ama bilinçli şekilde ayrı katmanlar olarak yönetmesidir.

YATIRIMCI / WEB MESAJLAŞMA ÇERÇEVESİ
- Dışarıya dönük marka adı: Vardis
- Yatırımcı/web anlatısında öne çıkacak çerçeve:
  - servis taşımacılığı için pazar + sözleşme + operasyon platformu
- Güçlü kısa anlatım:
  - Vardis, şirket ve kurumların taşıma ihtiyacını uygun servis sağlayıcılarla buluşturan; teklif, pazarlık, sözleşme, atama ve canlı operasyon süreçlerini tek platformda yöneten bir servis teknolojisi altyapısıdır.
- Not:
  - giriş pazarı personel servis taşımacılığı odağıyla anlatılabilir
  - ama ürün altyapısı daha geniştir; okul ve kurumsal taşıma senaryolarını birlikte kaldıran çoklu domain platform mantığı korunmalıdır

ÇALIŞMA TARZI / DEĞİŞMEZ KURALLAR
- Adım adım, kontrollü ilerle.
- Mümkün oldukça tek seferde overlay zip ver.
- Zip açılınca nested root olmasın; tek kökten apply script çalışsın.
- Yanıtlarda en fazla 3 PowerShell komutu ver.
- Başlangıç düzeyi, düşük bilişsel yük, sade Türkçe kullan.
- Gereksiz jargon ve uzun karmaşık açıklamadan kaçın.
- Önce ölç, sonra düzelt, sonra tekrar ölç.
- Green baseline bozulmamalı.

TTL / LINK PRESETLERI
<!-- TTL_PRESETS_PARENT_PUBLIC_LINKS_V1 -->
- Veli Erişimi ve public link presetleri: 1 gün / 1 hafta / 1 ay / 6 ay / 1 yıl

TERİM KURALLARI
- “agreement” yerine “sözleşme”
- “driver GPS” yerine “sürücünün telefon GPS’i”
- Dış metinlerde marka adı daima “Vardis”
- Ürünü “sadece personel projesi” diye daraltma
- Ürünü “sadece operasyon aracı” diye daraltma

GÜNCEL RESMİ DURUM
- MASTER PACK PASS OK (M0 -> M78)
- Repo Audit Master PASS
- exact duplicate groups: 0
- orphan candidates: 0
- STABLE_TO: 78
- living hat açık ve green
- operasyon doğrulama hattı M78.3’e kadar açıldı
- KVKK / retention / export-trail enforcement green
- operasyon doğrulama paneli read-only + kayıt + özet/filtre katmanına kadar doğrulandı

M78 GREEN İLE DOĞRULANAN ANA SONUÇLAR
- M76A-1 Minimum Normalization PASS
- M76B Living Matrix + Tools Consolidation PASS
- M76A-2 Final Normalization + Archiving PASS
- M77 KVKK + Uyum Katmanı PASS
- M78 Checklist + Operasyon Doğrulama PASS
- M78.1 Operasyon Doğrulama Yüzeyi PASS
- M78.2 Operasyon Doğrulama Kayıt Katmanı PASS
- M78.3 Operasyon Doğrulama Özet ve Filtre Katmanı PASS
- Repo Audit Master PASS
- Master Pack M0 -> M78 PASS

M79-PREP İLE KAPANAN KRİTİK KÜÇÜK AÇIKLAR
- Login etiketi username-first kararıyla hizalandı:
  - Kullanıcı Adı, E-posta veya Sürücü Kodu
- İlk girişte zorunlu şifre değiştirme hattı UI’a bağlandı
- force-password-change route + redirect doğrulandı
- username-first login hotfix check PASS
- password force change check PASS
- primer öncesi iki küçük ama kritik auth akışı kapatıldı

SON GÜÇLÜ TEKNİK GERÇEK
- M75 green baseline korunmuş durumdadır.
- M76 -> M78 hattı ile doğrulama ve uyum katmanı güçlenmiştir.
- M79-Prep ile auth giriş akışındaki iki küçük ama kritik ürün açığı kapanmıştır.
- Sistem artık yeni özellikten çok kontrollü ürünleşme ve kabul turlarına hazır durumdadır.

BLOKAJ OLMAYAN AMA TAKİP EDİLECEK AUDIT NOTLARI
- pack consolidation groups: 13
- check consolidation groups: 3
- tiny files: 1
- Bunlar blokaj değildir.
- M82 controlled cleanup / consolidation turunda ele alınacaktır.

GENEL DEĞERLENDİRME
- Genel proje puanı artık önceki döneme göre daha yüksektir.
- Teknik omurga güçlüdür.
- Green baseline doğrulanmıştır.
- Operasyon doğrulama ve KVKK hattı belirgin şekilde olgunlaşmıştır.
- Ancak tam profesyonel ürün seviyesi için hâlâ şu başlıklar sıradadır:
  - Copilot güvenilir operasyon rehberi katmanı
  - final acceptance / yüksek yük ve concurrency kanıtı
  - mobil saha sertleştirme
  - kontrollü cleanup / consolidation / büyük dosya refactor

MEVCUT ANA KARAR
- Bu aşamada doğru hareket yeni dağınık özellik açmak değildir.
- Doğru sıra:
  - M79: Copilot’u ürün içi uzman rehbere yükseltme
  - M80: final sert kabul ve yük güveni
  - M81: mobil saha sertleştirme
  - M82: controlled cleanup + consolidation + profesyonelleştirme

M79 STRATEJİK HEDEFİ
- Copilot artık dekoratif yardım paneli gibi kalmayacak.
- M79 sonunda Copilot, Vardis’in içindeki uzman rehber gibi davranmalıdır.
- Hedef davranış:
  - rolü bilir
  - hangi ekranda olunduğunu bilir
  - seçili kayıt/durumu okuyabilir
  - sıradaki doğru adımı önerir
  - neden o adımı önerdiğini sade Türkçe ile açıklar
  - gereksiz ve yanlış yönlendirmeyi azaltır
- Kısa ürün cümlesi:
  - Copilot, Vardis’in içindeki uzman rehber olacak.

M79 AMACI
- Copilot’u güvenilir operasyon rehberi haline getirmek
- Planlama Merkezi / Vardiyalar ayrımını sabitlemek
- Rol bazlı doğru yönlendirme vermek
- Temel operasyon sorularında güvenilirlik sağlamak
- Uygulama içi yardım kalitesini belirgin şekilde yükseltmek
- Gerçek senaryo testleri ile bunu kanıtlamak

M79 TASARIM KURALLARI
- Copilot ekrandan kopuk konuşmamalı.
- Copilot rol dışı öneri vermemeli.
- Copilot bilmediği durumda uydurmamalı.
- Copilot ilk cevapta kısa, net ve eylem odaklı olmalı.
- Copilot gerekirse ikinci adımda detay açmalı.
- Copilot sade Türkçe kullanmalı; teknik jargon ve gereksiz kurumsal dil azaltılmalı.

M79 KAPSAMI
1) Ekran farkındalığı
- aktif route/panel bilgisini dikkate alma
- seçili kayıt / seçili rota / seçili araç bağlamını kullanma
- harita, liste ve detay görünümü farkını anlama

2) Rol farkındalığı
- COMPANY, ROOM, DRIVER, PERSONEL, SCHOOL/ADMIN için farklı yönlendirme mantığı
- kullanıcının erişemeyeceği ekranı veya işlemi önermeme
- rol bazlı ilk açılış ve “buradan başla” mantığını netleştirme

3) Planlama Merkezi / Vardiyalar ayrımı
- hangi iş hangi ekranda yapılır netleştirme
- CTA ve başlık dilini ayrıştırma
- aynı işi iki yerde yaptıran yüzeyleri azaltma
- Copilot önerilerinde bu ayrımı zorunlu hale getirme

4) Durum okuma ve sonraki adım motoru
- “bu kayıt ne durumda?” sorusuna daha güvenilir cevap
- teklif / sözleşme / atama / canlılık / operasyon doğrulama durumunu özetleyebilme
- “şimdi ne yapayım?” sorusunda tek net sonraki adım verebilme
- önerinin nedenini kısa ve sade şekilde açıklama

5) Yardım ve açıklama kalitesi
- “bu ekran ne işe yarıyor?”
- “bu buton neden pasif?”
- “neden burada işlem yapamıyorum?”
- “önce nereye gitmeliyim?”
- “bu kayıt riskli mi?”
- bu soru tiplerinde güvenilir ve sade cevap üretme

6) Copilot karar güvenilirliği
- temel operasyon sorularında daha tutarlı öneri
- yanlış ekran önerilerini azaltma
- selected entity / selected route bağlamını güçlendirme
- eminlik düşükse daha temkinli cevap verme

7) Gerçek senaryo testleri
- teklif
- sözleşme
- atama
- canlılık
- anlaşmalı iş / teklifli iş farkı
- harita sonrası doğru sonraki ekran
- buton pasifliği / eksik atama / eksik sürücü gibi gerçek yardım senaryoları

M79 BAŞARI GÖSTERGELERİ
- Kullanıcı “şimdi ne yapayım?” dediğinde tek net yön bulur.
- Kullanıcı “bu kayıt ne durumda?” dediğinde Copilot boş konuşmaz.
- Kullanıcı “neden bu buton pasif?” dediğinde anlaşılır gerekçe alır.
- Aynı soru tiplerinde yönlendirme tutarlılığı belirgin şekilde artar.
- Copilot, programla ilgili bir ChatGPT hissi verir; ama uyduran değil, bağlam bilen rehber gibi davranır.

M79 KABUL KRİTERİ
- Rol bazlı açılışlar deterministik olur.
- Copilot temel soru tiplerinde daha tutarlı öneri verir.
- Copilot rol dışı ve yanlış ekran önerisini belirgin şekilde azaltır.
- Planlama Merkezi / Vardiyalar görev ayrımı netleşir.
- gerçek senaryo doğrulama paketi PASS verir.
- Kullanıcı yardım sorularında Copilot ilk cevapta kısa, net ve işe yarar yönlendirme sunar.



M65/M66 TARİHSEL SSOT REFERANSI
- M65 — Pilot Launch Gate green aşaması ürünün saha öncesi karar kapısı olarak tarihsel olarak doğrulanmıştır.
- M66 — Operasyonel Reassignment hattı fonksiyonel açılış / tekrar test hattı olarak tarihsel referansını korur.
- Tarihsel araç referansı: tools\pack_m66_operation_reassignment.ps1
- Bu primerin güncel resmi odağı M78/M79 olsa da, M65 green ve M66 functional geçmişi SSOT uyumluluğu için korunur.

M79 GÜNCEL İLERLEME (2026-03-29)
- A1 Copilot SSOT + scope PASS
- A2 intent quality PASS
- A3 screen context PASS
- A4 quality pack PASS
- A5 chat UX PASS
- A6 acceptance score PASS
- B1 edge cases PASS
- B2 follow-up memory PASS
- B3 uncertainty PASS
- B4 route chain PASS
- C1 plain language PASS
- C2 shorter first answer PASS
- C3 real user phrasing PASS
- C4 primary concern PASS
- D1 Copilot acceptance pack, M79 için resmi teknik kapanış kapısıdır.

M79 RESMİ KAPANIŞ KURALI
- `tools/pack_m79_copilot_acceptance.ps1` PASS vermelidir.
- golden acceptance overall score en az `0.95` olmalıdır.
- tüm rol skorları en az `0.90` olmalıdır.
- `NEXT_SCREEN`, `STATUS_HELP`, `WHY_BLOCKED`, `ROLE_HELP` skorları en az `0.90` olmalıdır.
- weakest case floor en az `0.875` olmalıdır.
- Copilot, belirsiz durumda uydurmak yerine kontrollü doğrulama davranışı göstermelidir.
- Bu kapı geçmeden M79 resmi green ilan edilmez.

M80 AMACI
- Final sert kabul
- 5 tur yük testi
- Daha yüksek concurrency
- Websocket bağlı kullanıcı profili
- Çoklu room/company senaryosu
- Final acceptance pack

M80 KAPSAMI
1) Acceptance yüzeyi standardı
- final acceptance paketi
- kritik ekranlarda ürün dili ve güven hissi

2) Yük ve concurrency
- 5 tur yük testi
- daha yüksek eşzamanlı kullanıcı
- çoklu room/company veri baskısı altında davranış

3) Websocket profili
- topic/room bağlı kullanıcı görünümü
- reconnect ve invalidate davranışı
- gereksiz refresh / event yükünü izleme

4) Çoklu tenant senaryosu
- scope sızıntısı var mı
- yanlış veri görünürlüğü oluşuyor mu
- çoklu room/company operasyon kararlılığı

5) Minimum kalite otomasyonu
- backend lint hattı
- web build/lint smoke
- auth-flow smoke
- role-route smoke
- repo audit tekrar

M80 KABUL KRİTERİ
- 5 tur yük testi kabul edilir
- concurrency altında kritik yüzeyler bozulmaz
- websocket davranışı kabul edilebilir olur
- scope sızıntısı görülmez
- final acceptance pack PASS verir

M81 AMACI
- Mobil saha sertleştirme
- Sürücünün telefon GPS’i kararlılığı
- Offline/online toparlama
- Zayıf internet testi
- Arka plan davranışı
- Pil/veri tüketimi
- Mobil saha smoke test
- Pilot hazırlık

M81 KAPSAMI
1) Sürücünün telefon GPS’i kararlılığı
- foreground / background publish kararlılığı
- boş publish / sapma / hız davranışı

2) Offline/online toparlama
- bağlantı kesilip geri geldiğinde toparlama
- duplicate / burst / kayıp veri analizi

3) Zayıf internet ve arka plan davranışı
- düşük sinyal
- ağ geçişleri
- ekran kapalıyken davranış

4) Pil ve veri tüketimi
- publish sıklığına göre pil/veri dengesi
- gereksiz trafik azaltma

5) Mobil ürünleşme polish
- demo/test hissini azaltma
- daha sade Türkçe
- sürücü ekranı güven hissi
- icon/splash/app adı düzeni

M81 KABUL KRİTERİ
- GPS akışı kararlı olur
- offline/online toparlama kabul edilir
- zayıf internet altında kritik kırılma olmaz
- mobil saha smoke PASS verir
- pilot hazırlığı tamamlanır

M82 AMACI
- Controlled cleanup
- consolidation
- büyük dosya refactor
- repo profesyonelleştirme
- son ürün polish

M82 KAPSAMI
1) Pack/check consolidation
- pack consolidation groups: 13
- check consolidation groups: 3
- compatibility alias’ları kontrollü azaltma
- living hattı tek ana kaynak yaklaşımı

2) Büyük dosya parçalama
- web/src/App.jsx
- web/src/panels/company/ShiftsPanel.jsx
- web/src/panels/room/ShiftsPanel.jsx
- web/src/panels/company/GuidedPlanModal.jsx
- web/src/panels/shared/CopilotPanel.jsx

3) Repo hijyeni
- .gitignore stratejisi
- .env / .env.example standardı
- stale docs temizliği
- gereksiz demo/test izlerini azaltma

4) Marka ve son kullanıcı dili
- Vardis marka çizgisini tüm yüzeylerde sabitleme
- teknik/helper dilini azaltma
- KVKK metinlerini sadeleştirme
- checklist / acceptance metinlerini ürün diliyle hizalama

M82 KABUL KRİTERİ
- tools/check katmanı daha sade ve okunur olur
- büyük dosyalarda kontrollü parçalama tamamlanır
- repo hijyeni profesyonel seviyeye yaklaşır
- ürün dili daha tutarlı hale gelir

MOBİLİN KATMANI
- Mobil yazılım bu projede saha/istemci katmanıdır.
- Backend = sistemin beyni
- Web = operasyon masası
- Mobil = saha eli/ayağı
- Bu yüzden mobil ana çekirdek ve operasyon akışları oturduktan sonra M81’de ele alınacaktır.

MEVCUT GREEN BASELINE KURALI
- Yeni iş yapılırken M78 green baseline bozulmamalı.
- M79-Prep ile kapanan auth akışları geri bozulmamalı.
- Ölçüm/check hattı güvenilir kalmalı.
- Önce ölç, sonra düzelt, sonra tekrar ölç kuralı korunmalı.
