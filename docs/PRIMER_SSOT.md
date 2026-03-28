VARDIS / PERSONEL SERVİS V1 – FULL PRIMER SNAPSHOT (2026-03-27)

KİMLİK
- Marka adı: Vardis
- İç proje/çalışma adı: Personel Servis V1
- Repo: D:\servis-platform
- Branch: main
- Durum: güncel patch uygulanmış repo

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
- Parent invite ve public link presetleri: 1 hafta / 1 ay / 6 ay / 1 yıl

TERİM KURALLARI
- “agreement” yerine “sözleşme”
- “driver GPS” yerine “sürücünün telefon GPS’i”
- Dış metinlerde marka adı daima “Vardis”
- Ürünü “sadece personel projesi” diye daraltma
- Ürünü “sadece operasyon aracı” diye daraltma

SON GÜÇLÜ TEKNİK DURUM
- M0 -> M41 master pack PASS
- M42 -> M58 geçmiş baseline tamam
- M59 -> M66 role rollout / operasyon hattı geçmiş baseline tamam
- M67 -> M75 kurumsal ölçek hazırlık ve hot-path sertleştirme hattı çalışıldı
- M75 sonunda kritik sert storm test profilinde:
  - 429 = 0
  - 5xx = 0
  - toplam 117 adet 200
- Bu durum “M75 green baseline” olarak kabul edilir

M67 -> M75 ARASINDA YAPILAN ANA İŞLER
1) Ölçüm / teşhis katmanı
- company_fetch_storm_check
- scale_readiness_check
- kurumsal ölçek runbook/check yapısı

2) Frontend fetch sertleştirme
- ortak companyDataHub
- kısa TTL cache
- in-flight dedupe
- visible-only / lazy loading
- first-frame yük azaltma
- search-first / selection-first yaklaşımı
- route-preview sakinleştirme

3) Backend sıcak uç azaltma
- workflow summary
- commercial flow summary
- reports summary cache
- route-preview backend cache
- trust-quality / provider score hafifletme
- endpoint sınıfına göre ayrı read limiter kovaları
- offers / people / live shift / reports / preview / directory ayrımı

4) UI hotfix zinciri
- ShiftsPanel marketItems initialization kırığı düzeltildi
- WorkflowPanel loadSummary/loadStats kırığı düzeltildi
- Room.title Prisma crash hattı kapatıldı
- GeoReviewPanel token kırığı düzeltildi
- helper / repo-contract uyumsuzlukları düzeltildi

MEVCUT TEKNİK GERÇEK
- Runtime sonucu iyi: mevcut sert test profilinde 429 yok, 5xx yok.
- Sistem artık daha öngörülebilir davranıyor.
- Ancak statik tarafta hâlâ şu uyarılar kalabiliyor:
  - ShiftsPanel initialLoadCalls=12
  - AgreementsPanel initialLoadCalls=8
- Bunlar şu an blocker değil.
- Runtime green daha önemli.
- Cleanup/refactor sırasında azaltılması hedeflenmeli.

GENEL DEĞERLENDİRME
- Genel proje puanı: yaklaşık 7.5/10
- Teknik/altyapı yönü daha yüksek
- Tamamlanmış ürün olgunluğu daha düşük
- En büyük açık başlıklar:
  - Copilot tamam değil
  - cleanup tamam değil
  - KVKK/uyum katmanı tamam değil
  - checklist/operasyon doğrulama tamam değil
  - final daha sert kabul testleri yapılmadı
  - mobil saha sertleştirme ayrı ele alınmalı

10/10 İÇİN EKSİK ANA BAŞLIKLAR
1) Copilot tamamlama
2) KVKK / uyum katmanı
3) kod cleanup
4) checklist / operasyon doğrulama
5) daha sert final yük testi
6) mobil saha sertleştirme
7) son kabul paketi

CHECK / RUNBOOK TARAFINDA DOĞRU YAKLAŞIM
- Tüm M0-M80 hattı baştan yazılmayacak.
- Doğru yaklaşım:
  - normalizasyon
  - yaşayan seti ayırma
  - ortak helper standardı
  - aktif / legacy / archive ayrımı
- Yani ihtiyaç:
  - rewrite değil
  - consolidation + standardization

YENİ PLAN / MİLESTONE SIRASI
- M76A-1: minimum check/runbook normalizasyonu
- M76B: kod cleanup
- M76A-2: final normalizasyon ve arşivleme
- M77: KVKK / uyum katmanı
- M78: checklist / operasyon doğrulama
- M79: Copilot tamamlama
- M80: final kabul / daha sert yük testi
- M81: mobil saha sertleştirme ve pilot hazırlık

M76A-1 AMACI
- Cleanup başlamadan önce doğrulama hattını güvenilir hale getirmek
- Aktif pack listesini çıkarmak
- Helper isimlerini sabitlemek
- Yanlış alarm üreten repo-contract kırıklarını temizlemek
- Yaşayan seti belirlemek

M76A-1 KAPSAMI
1) aktif pack envanteri
2) ortak helper standardı
3) repo-contract kırık taraması
4) minimum runbook standardı
5) living baseline listesi

M76B AMACI
- Davranışı bozmadan kod cleanup yapmak
- Duplicate fetch/helper temizliği
- Eski hotfix izi gibi duran kodları toplamak
- Company panellerini sadeleştirmek
- Backend route/helper tekrarlarını azaltmak
- M75 green davranışını korumak

M76A-2 AMACI
- Cleanup sonrası final runbook/pack normalizasyonu
- Legacy/archive ayrımı
- Primer / startpack / checklist güncellemesi

M77 AMACI
- KVKK/uyum katmanını tamamlamak
- Aydınlatma metinleri
- Veri görünürlük matrisi
- Retention / silme / anonimleştirme yaklaşımı
- Audit ve erişim izi uyumu

M78 AMACI
- Operasyon/checklist/runbook katmanını güçlendirmek
- Release checklist
- Saha öncesi checklist
- Smoke test listesi
- Backup/restore doğrulama
- Incident runbook

M79 AMACI
- Copilot’u güvenilir operasyon rehberi haline getirmek
- Planlama Merkezi / Vardiyalar ayrımını sabitlemek
- Rol bazlı doğru yönlendirme
- Temel operasyon sorularında güvenilirlik
- Gerçek senaryo testleri

M80 AMACI
- Final sert kabul
- 5 tur yük testi
- Daha yüksek concurrency
- Websocket bağlı kullanıcı profili
- Çoklu room/company senaryosu
- Final acceptance pack

M81 AMACI
- Mobil saha sertleştirme
- Sürücünün telefon GPS’i kararlılığı
- Offline/online toparlama
- Zayıf internet testi
- Arka plan davranışı
- Pil/veri tüketimi
- Mobil saha smoke test
- Pilot hazırlık

MOBİLİN KATMANI
- Mobil yazılım bu projede saha/istemci katmanıdır.
- Backend = sistemin beyni
- Web = operasyon masası
- Mobil = saha eli/ayağı
- Bu yüzden mobil ana çekirdek ve operasyon akışları oturduktan sonra M81’de ele alınacaktır.

MEVCUT GREEN BASELINE KURALI
- Yeni iş yapılırken M75 green baseline bozulmamalı.
- Ölçüm/check hattı güvenilir kalmalı.
- Önce ölç, sonra düzelt, sonra tekrar ölç kuralı korunmalı.

MARKA / YATIRIMCI / WEB KULLANIMI
- Marka adı daima Vardis
- Pitch deck kapağı mantığı:
  - Vardis
  - Servis taşımacılığı için pazar + sözleşme + operasyon platformu
- Web hero mantığı:
  - Vardis ile servis taşımacılığını uçtan uca yönetin
- Kısa yatırımcı anlatımı:
  - Vardis, servis taşımacılığında talep, ticari eşleşme, sözleşme, atama ve canlı operasyon süreçlerini tek sistemde birleştiren GPS tabanlı bir platformdur.
- Ürün anlatılırken:
  - ticari akış + operasyon birlikte
  - ama bilinçli şekilde ayrı katmanlar olarak vurgulanmalı

YENİ SOHBETTE DOĞRU BAŞLANGIÇ
- Önce M76A-1 ile minimum check/runbook normalizasyonu yapalım.
- Sonra M76B cleanup’a geçelim.
- Cleanup sonrası M76A-2 ile final normalizasyon yapalım.
- Sonra M77 -> M78 -> M79 -> M80 -> M81 sırasıyla ilerleyelim.

YENİ SOHBETTE İLK BEKLENTİ
- Güncel repo üzerinden:
  1) aktif pack envanteri çıkar
  2) ortak helper standardını belirle
  3) repo-contract kırık taraması yap
  4) M76A-1 için tek overlay hazırla
- Yine tek zip ve sade apply akışı kullan
- M75 green baseline’ı bozma

ÖNEMLİ UYARI
- Projeyi bundan sonra “sadece personel servisi” diye anlatma
- “sadece okul sistemi” diye de anlatma
- “sadece operasyon aracı” diye de anlatma
- Doğru anlatım:
  - çoklu domain
  - pazar + sözleşme + operasyon
  - karma servis/taşıma platformu
M58 final pilot readiness için komut: .\tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot . Resmi green, saha/manual acceptance signoff sonrası kabul edilir.

M63 guven + kalite + hizmet degerlendirme rotasi aktif. Komut: .\tools\pack_m63_trust_quality_service_evaluation.ps1 -RepoRoot .

M64 dogal copilot katmani rotasi aktif. Komut: .\tools\pack_m64_natural_copilot_layer.ps1 -RepoRoot .
