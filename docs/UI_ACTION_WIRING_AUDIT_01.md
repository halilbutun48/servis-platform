# UI Action Wiring Audit 01

Tarih: 2026-05-25  
Repo: `servis-platform`

## Amaç
- Panellerde görünen aktif aksiyonların gerçekten bağlı olduğunu doğrulamak.
- Ölü, handler'sız, yalnızca `console.log`/`alert` üreten, sadece TODO/mock taşıyan veya hedefi çözülemeyen aksiyonları ayıklamak.
- Preview ve readonly yüzeylerde görünür sonuç, loading/error/empty state ve role/permission sınırını korumak.

## Denetlenen Aksiyon Kategorileri
- `Önizle`, `Detay`, `Aç`, `Yenile`, `Kaydet`, `Gönder`, `Davet`, `Kabul`, `Reddet`, `Temizle`, `Filtrele`
- `Rota etkisini önizle`
- `Haritada göster`, `Harita Önizleme`, `Rota Önizleme`, `Mini Harita Önizleme`
- `Sefer Abi’ye Sor` ve quick action / starter chip yüzeyleri

## Yasak Pattern'ler
- Boş handler: `onClick={() => {}}`
- Handler'sız açık aksiyon: `onClick={undefined}`, `onClick={null}`
- Placeholder link: `href="#"`
- Sadece debug davranışı: `console.log(...)`, `alert(...)`
- Aksiyon wiring'ine gömülü `TODO`, `FIXME`, `mock`, `placeholder`
- Hedefi olmayan quick action button'ları

## Role / Permission Standardı
- `Kabul et` / `Reddet` sadece doğru role ve doğru karar sahibi yüzeyinde görünür.
- Yanlış rolde aksiyon gösterilmez; gerekiyorsa açıklayıcı bekleme mesajı gösterilir.
- `COMPANY`, `SCHOOL`, `ORGANIZATION`, `ROOM`, `DRIVER` ayrımı mevcut yapıyla korunur.
- Yeni paralel panel mimarisi açılmaz.

## Readonly / Preview Standardı
- Preview yüzeyi `readonly` kalır.
- `Rota uygulanmaz`.
- `Sürücü rotası yenilenmez`.
- `Bildirim gönderilmez`.
- `SMS/push`, ödeme, fatura, tahsilat, ceza/yaptırım akışı açılmaz.
- Boş durumda büyük placeholder yerine kompakt/tek mesajlı empty state kullanılır.
- `Seçimi temizle` ve loading/error/empty state görünür olur.

## Live Smoke Listesi
- `/#/company/operations`
- `/#/company/agreements`
- `/#/room/operation-health`
- `/#/room/agreements`
- `/#/driver/route`
- `/#/driver/today`
- `/#/parent/live`
- `/#/personel/live`
- `/#/school/operations`
- `/#/organization/operations`
- `/#/superadmin/trust-quality`

## Bilinen Out-of-Scope İşler
- Yeni business flow açma
- Prisma schema / migration
- Ödeme / tahsilat / fatura / platform fee
- Ceza / yaptırım
- SMS / push / bildirim akışı
- Rota apply / driver route refresh execute
- Kalıcı assignment / stop / person / route değişikliği
- Personel / veli boarding-change talep oluşturma arayüzü
- MARKETPLACE-FREE-TO-OPERATE ve PUBLIC-LANDING

## Not
- Bu audit, mevcut aksiyon wiring kalitesini denetler.
- Ürün akışını büyütmek için değil, görünen aksiyonların gerçekten görünür ve güvenli sonuç üretmesini sağlamak için kullanılır.
