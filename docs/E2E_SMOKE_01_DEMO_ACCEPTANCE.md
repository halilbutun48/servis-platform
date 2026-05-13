# E2E-SMOKE-01 Demo Acceptance Pack

## Amaç
Bu paket, manuel ya da yarı-manuel hazırlanan demo veriyle uçtan uca kabul / smoke hazırlığını tek checklist altında toplar.

Bu paket:
- runtime davranışını değiştirmez
- otomatik seed çalıştırmaz
- canlı veritabanı üzerinde işlem yapmaz
- `backend/src`, `web/src`, `mobile/src`, `prisma/migrations` kapsamına girmez
- `backend/artifacts/runtime-data` dosyalarını değiştirmez
- backend/src, web/src, mobile/src, prisma/migrations alanlarında runtime değişikliği gerektirmez

Görünürlük:
- `docs/NEXT_BACKLOG_V1.md` içinde `P1` olarak izlenir
- bu doküman sadece kabul hazırlığını anlatır

## Kapsam
- DEMO Firma
- DEMO Oda
- DEMO Araç
- DEMO Sürücü
- 5-6 DEMO Personel
- 1 DEMO sözleşme
- sözleşmeden üretilmiş en az 1 vardiya
- en az 1 onaylı / atanmış DEMO vardiya
- COP-03C-FIX-02 canlı kabul turunun 5 referans sorusu

Kapsam dışı:
- ürün runtime davranışı
- auth / security middleware değişikliği
- aktif ödeme
- settlement akışı
- database reset
- otomatik veri üretimi

## Ön Koşullar
- Demo kullanıcıları UI üzerinden manuel hazırlanmış olmalı.
- Demo firma, oda, araç ve sürücü kaydı görünür olmalı.
- Copilot canlı kabul turu aynı anda çalıştırılabilir durumda olmalı.
- Panel / mobile / backend tarafında ek patch beklenmemeli.

## Kullanılacak Hesaplar
- Super Admin
- DEMO Firma
- DEMO Oda
- DEMO Sürücü
- DEMO Personel
- DEMO Veli / Parent varsa

## Demo Veri Kontrol Listesi
- DEMO Firma var.
- DEMO Oda var.
- DEMO Araç var.
- DEMO Sürücü var.
- 5-6 DEMO Personel var.
- DEMO sözleşme var.
- Sözleşmeden üretilmiş en az 1 vardiya var.
- En az 1 onaylı / atanmış vardiya var.

## Manuel Smoke Akışı

### 1) Firma akışı
- Firma servis / vardiya talebini görebiliyor.
- Personel listesi doğru görünüyor.
- Rota / durak / ETA bilgisi görünüyor.
- Sözleşme ekranında DEMO sözleşme görünüyor.
- Sözleşmeden vardiya üretim sinyali yorumlanabiliyor.

Beklenen:
- veri tutarlı
- eksik alan varsa açıkça görünüyor
- Copilot soruları bu veriyle uyumlu yorumlanabiliyor

### 2) Oda akışı
- Oda DEMO Firma işini / vardiyasını görebiliyor.
- DEMO araç ve DEMO sürücü atanmış durumda.
- Vardiya onaylı / atanmış durumda.
- Rota / durak bilgisi görünüyor.
- Operasyon başlatma için gerekli eksikler açık görünüyor.

Beklenen:
- atama durumu okunur
- görev / vardiya / araç / sürücü bağlantısı izlenebilir
- eksikler kapatılmadan başlatma sorunu anlaşılır

### 3) Super Admin / operasyon akışı
- Operasyon sağlığı ekranı açılıyor.
- Harita / canlı takip ekranı açılıyor.
- Araç görünürlük / GPS sinyali okunabiliyor.
- Ticari Akış / Hakediş önizlemesi ekranı açılıyor.
- Hakediş readonly preview mantığı korunuyor.

Beklenen:
- readonly preview var
- aktif ödeme yok
- settlement execute yok
- araç görünürlüğü canlı sinyalle yorumlanabiliyor

### 4) Mobil / rol akışı
- Sürücü hesabı bugünkü / atanmış görevi görebiliyor.
- Personel canlı takip yüzeyi test edilebilir.
- Veli / öğrenci varsa canlı takip yüzeyi test edilebilir.
- Veli / personel gerçek cihaz kabulü gerekiyorsa not düşülür.

Beklenen:
- rol kapsamı aşılmaz
- görünürlük sadece ilgili kullanıcı kapsamıyla sınırlı kalır
- gerekirse gerçek cihaz kabulüne bırakılacak eksikler açık not edilir

## Copilot Canlı Kabul Soruları
E2E-SMOKE-01 aşağıdaki 5 canlı kabul sorusuna bağlanır:

1. Bu vardiya neden başlayamıyor?
2. Bu araç neden haritada görünmüyor?
3. Bu hakediş neden hazır değil?
4. Bu sözleşmeden bugün vardiya üretildi mi?
5. Operasyon Sağlığı: sorun ne?

Beklenen bağlantı:
- Copilot ekran amacıyla başlamaz
- seçili kayıt / screen facts / diagnostic signals üzerinden kısa teşhis verir
- veri yoksa uydurmaz
- rol / yetki sınırını korur

## GPS Sınırı
Görünür dilde şu ifade korunur:
- Sürücünün telefon GPS’i

İlgili sözler:
- Araç GPS’i
- GPS bekleniyor
- GPS eski kaynak
- son GPS

## KVKK / Rol Sınırı
- Personel yalnız kendi kapsamındaki canlı takip bilgisini görür.
- Veli yalnız kendi öğrenci / servis kapsamını görür.
- Rol dışı yönetim aksiyonu önerilmez.
- KVKK / yetki sınırı görünür kalır.

## Hakediş / Ödeme Sınırı
- readonly hakediş önizlemesi vardır
- aktif ödeme yok
- settlement execute yok
- hakediş hazırlığı sadece preview ve eksik bilgi kontrolüyle değerlendirilir

## Fail Durumunda Kanıt Formatı
Her fail için şu alanlar toplanır:

- ekran adı
- seçili kayıt
- sorulan soru
- görülen sinyal
- beklenen sinyal
- ekran görüntüsü / not
- tarih / saat
- rol
- kısa yorum

## Kabul Tablosu

| Alan | Durum | Not |
| --- | --- | --- |
| Veri sağlığı | PASS / FAIL / BLOCKED / NOT_TESTED | DEMO veri kontrolü |
| Firma akışı | PASS / FAIL / BLOCKED / NOT_TESTED | servis / vardiya / sözleşme görünürlüğü |
| Oda akışı | PASS / FAIL / BLOCKED / NOT_TESTED | atama / rota / eksik sinyal |
| Super Admin / operasyon | PASS / FAIL / BLOCKED / NOT_TESTED | health / live / readonly preview |
| Mobil / rol akışı | PASS / FAIL / BLOCKED / NOT_TESTED | driver / personel / parent kapsamı |
| Copilot kabul soruları | PASS / FAIL / BLOCKED / NOT_TESTED | 5 canlı soru referansı |
| Hakediş / ödeme sınırı | PASS / FAIL / BLOCKED / NOT_TESTED | readonly preview only |
| GPS sınırı | PASS / FAIL / BLOCKED / NOT_TESTED | araç GPS’i / Sürücünün telefon GPS’i |
| KVKK / rol sınırı | PASS / FAIL / BLOCKED / NOT_TESTED | görünürlük ve kapsam |

## Not
Bu doküman demo kabul hazırlığı içindir; ürün davranışını, auth akışını veya veri üretimini değiştirmez.
