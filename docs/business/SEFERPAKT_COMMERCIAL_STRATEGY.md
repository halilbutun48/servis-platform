# SeferPakt Ticari Strateji ve Pazara Çıkış Planı

Durum: yaşayan doküman / docs-only
Son gözden geçirme: 2026-10-18

## Authority ve kapsam

Bu belge, kullanıcı tarafından kabul edilen ticari yönü ve pazara çıkış hipotezlerini tek yerde toplar. Ürün davranışını, fiyatlandırma kodunu, billing sistemini veya aktif milestone kapsamını değiştirmez.

Kanonik teknik ve ilerleme sahipleri değişmez:

- Aktif frontier ve ilerleme: [`docs/NEXT_BACKLOG_V1.md`](../NEXT_BACKLOG_V1.md)
- Milestone sözleşmeleri ve freeze provenance: [`docs/MILESTONE_REGISTRY_V1.md`](../MILESTONE_REGISTRY_V1.md)
- Yaşayan ürün/uygulama primeri: [`docs/PRIMER_SSOT.md`](../PRIMER_SSOT.md)
- Marketplace readonly sınırı: [`docs/MARKETPLACE_FREE_TO_OPERATE_01.md`](../MARKETPLACE_FREE_TO_OPERATE_01.md)
- Marketplace/Sefer Abi roadmap kilidi: [`docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md`](../ROADMAP_LOCK_AI_MARKETPLACE_01.md)

Bu belge bunlarla çelişirse mevcut canonical authority'ler geçerlidir.

## 1. Kabul edilmiş ticari yön — DECIDED

SeferPakt, iki taraflı B2B servis operasyon platformudur. ROOM ve COMPANY bağımsız kullanımda değer elde etmelidir.

### ROOM — taşımacılık firması

Ücretsiz veya sınırlı girişte firma profili ve temel tedarik/teklif ağına katılım değerlendirilen başlangıç değeridir. Ücretli değer alanları; operasyon ve vardiya yönetimi, araç/sürücü yönetimi, GPS ve rota optimizasyonu, finansal/kârlılık analizi ve gelişmiş Sefer Abi desteğidir.

### COMPANY — hizmet alan firma

Ücretsiz veya sınırlı girişte servis ihtiyacı oluşturma, teklif alma ve temel teklif karşılaştırma değerlendirilen başlangıç değeridir. Ücretli değer alanları; gelişmiş sözleşme yönetimi, canlı operasyon denetimi, kalite/performans takibi, maliyet/hakediş analizi, raporlama ve gelişmiş Sefer Abi desteğidir.

Bu alanlar değer hipotezidir; kesin paket, limit veya fiyat olarak kodlanmış ürün politikası değildir.

### Marketplace geliri

Yeni iş veya sözleşme platform üzerinden oluştuğunda başarı bazlı gelir modeli ileride değerlendirilebilir. Mevcut müşteri–tedarikçi ilişkilerinin platforma taşınmasını zorlaştıracak zorunlu bir komisyon modeli kararı yoktur.

Komisyon oranı, tahsilat yöntemi, hukuki/vergisel yapı ve uygulanma koşulları henüz kararlaştırılmamıştır. Payment, settlement, billing, contract execute ve otomatik ticari seçim mevcut bu planla açılmaz.

### Altyapı sınırı

İlk yayında backend, PostgreSQL, Redis, GPS/telematik, OSRM, depolama, yedekleme, güvenlik ve yerel Sefer Abi bileşenleri dahil toplam aylık altyapı hedefi 15.000 TL'nin altında tutulur. Bu sınır fiyat veya kapasite garantisi değildir; pilot verisiyle birim ekonomi izlenir.

Harici LLM/API kullanılmaması yönündeki mevcut mimari karar korunur.

## 2. Pazara çıkış yolu

### Faz 1 — Ürün ve gerçek kullanım kabulü — DECIDED

- Teknik milestone ve sekiz rolün gerçek kullanıcı/güvenlik kabulünü tamamla.
- Temel iş akışlarını kararlı, yetkili ve görünür hale getir.
- Gerçek browser/cihaz, role/tenant, KVKK ve business-write sınırlarını koru.

### Faz 2 — Kontrollü pilot — PROPOSED / TO_VALIDATE

Başlangıç hipotezi olarak üç ROOM ve iki COMPANY ile pilot değerlendirilebilir. Mümkünse mevcut ticari ilişkisi bulunan firmalarla başlanır. Pilot kapsamında gerçek teklif, sözleşme, vardiya ve operasyon süreçlerinin tamamlanması değil; güvenli kullanım, değer ve operasyonel etki ölçülür.

Bu sayılar hedef/hipotezdir; kazanılmış müşteri veya satış sonucu değildir.

### Faz 3 — Ücretli modele geçiş — TO_VALIDATE

- Ödeme istekliliğini ve hangi değer alanının satın alma kararını etkilediğini ölç.
- ROOM ve COMPANY için ayrı değer bazlı paket hipotezlerini karşılaştır.
- Abonelik, kullanım limiti ve destek kapsamını pilot bulgularından sonra kesinleştir.
- Gelir, altyapı ve müşteri başına operasyon maliyetini birlikte değerlendir.

### Faz 4 — Kontrollü büyüme — PROPOSED

Referans müşteriler, standart satış/destek süreçleri ve genişleyen tedarik ağı oluşturulur. Marketplace gelir modeli ancak pilotta doğrulanır ve ayrı hukuki/vergisel/ürün guard'larıyla değerlendirilir.

## 3. Ölçüm planı

Gerçek veri yoksa rakam veya benchmark uydurulmaz. Pilot başlangıcında ölçüm tanımları ve veri sahibi belirlenir.

| Gösterge | Hesaplama | Kullanım |
|---|---|---|
| Pilot aktif kullanım oranı | Dönem içinde en az bir anlamlı görev tamamlayan aktif pilot hesabı / pilot hesabı | Gerçek kullanım |
| Ücretli müşteriye dönüşüm | Ücretli plana geçen pilot hesabı / ücretli modele uygun pilot hesabı | Fiyatlama sinyali |
| MRR | Dönemsel yinelenen abonelik gelirlerinin toplamı | Gelir görünümü |
| CAC | Satış ve edinim harcaması / kazanılan müşteri | Kanal verimliliği |
| Churn | Dönemde kaybedilen ücretli müşteri / dönem başı ücretli müşteri | Tutundurma |
| Müşteri başına operasyon maliyeti | Destek, altyapı ve işletim maliyeti / aktif müşteri | Birim ekonomi |
| Brüt kâr marjı | (Gelir - doğrudan hizmet maliyeti) / gelir | Sürdürülebilirlik |
| Rota/planlama süresi tasarrufu | Önceki yöntem süresi - SeferPakt süresi | Ürün değeri |
| Operasyon hatası azalması | Önceki dönem hata oranı - pilot dönem hata oranı | Kalite etkisi |
| Tekliften sözleşmeye dönüşüm | Sözleşmeye dönüşen teklif / geçerli teklif | Marketplace/ürün değeri |

Tanımlar pilotta veri erişimi, örneklem ve dönemle birlikte yeniden doğrulanır; ölçüm sonucu ürünün mevcut özelliğiymiş gibi sunulmaz.

## 4. Ticari karar sınıfları

- **DECIDED:** İki taraflı B2B platform yönü; ROOM ve COMPANY'nin bağımsız değer üretmesi; kontrollü ürün-kabulünden sonra pilot; ilk yayında 15.000 TL aylık altyapı hedefi; harici LLM/API mimari kararının korunması.
- **PROPOSED:** Üç ROOM + iki COMPANY başlangıç pilotu; mevcut ilişkilere öncelik; referans müşteri ve standart destek/satış akışı.
- **TO_VALIDATE:** Ödeme istekliliği, değer alanları, müşteri dönüşümü, kullanım yoğunluğu, destek maliyeti, kapasite, rota/operasyon tasarrufu ve marketplace gelirinin gerçek etkisi.
- **UNDECIDED:** Ücretsiz özellik limitleri, ücretli paket içerikleri, fiyatlar, deneme süresi, komisyon yüzdesi, tahsilat şekli, hukuki/vergisel model, destek SLA'sı ve genel yayın tarihi.

## 5. Fiyatlandırmadan önce cevaplanacak sorular

1. ROOM ve COMPANY hangi tekil problemi bugün alternatiflerden anlamlı biçimde daha iyi çözüyor?
2. Hangi özellik veya sonuç ödeme istekliliğini doğrudan etkiliyor?
3. Ücretsiz giriş için güvenli ve sürdürülebilir kullanım sınırı nedir?
4. Ücretli paket hangi role özgü maliyet veya değer metriğine bağlanacak?
5. 15.000 TL aylık altyapı hedefi hangi müşteri ve kullanım kapasitesine kadar korunuyor?
6. Destek, onboarding, güvenlik ve KVKK işletim maliyeti müşteri başına nedir?
7. Marketplace başarı payı için yeni/yenilenen platform ilişkisi nasıl kanıtlanacak?
8. Komisyonun hukuki, vergisel, tahsilat ve mevcut müşteri ilişkilerine etkisi nedir?
9. Pilotun başarılı sayılması için hangi dönem, örneklem ve ölçüm eşikleri önceden belirlenecek?

## 6. Guardrail ve güncelleme kuralı

Bu plan docs-only'dir. M18'in guidance/navigation ve `M18_NO_BUSINESS_WRITE` sınırını, insan onayı gerekliliklerini, role/tenant/KVKK izolasyonunu veya mevcut milestone sahiplerini değiştirmez. #19/#20 ve sonraki write/approval/marketplace milestone'ları bu belgeyle öne çekilmez.

Yeni ticari kararlar önce bu belgede uygun karar sınıfıyla kaydedilir; ürün veya roadmap davranışına dönüşmesi için ilgili canonical milestone, backlog ve teknik authority güncellenir. Pilot verisi gelmeden fiyat, paket, komisyon, müşteri sayısı, gelir veya pazar başarısı kesin gerçek olarak yazılmaz.

Bu belge yaşayan ticari plandır. Güncellemeler mevcut source precedence, immutable evidence ve governance kurallarına uygun bounded dokümantasyon değişikliği olarak yapılır.
