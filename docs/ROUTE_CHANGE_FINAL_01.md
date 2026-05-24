# ROUTE-CHANGE-FINAL-01

Bu milestone, sözleşme veya firma personel değişikliği kaynaklı rota güncelleme final kabul akışını readonly ve kontrollü şekilde tarif eder.

## Kapsam
- `Company / Sözleşmeler` tarafında rota güncelleme etkisi preview olarak görünür.
- `Room / Sözleşmeler` tarafında teklif, kabul, red ve tekrar kontrol görünürlüğü okunur.
- Eski rota, yeni rota, kişi farkı, durak farkı, km farkı ve süre farkı birlikte gösterilir.
- Uygulanan rota geçmişi ayrıca okunabilir olur.

## Sınırlar
- Otomatik kalıcı route apply yoktur.
- Driver route refresh yoktur.
- SMS veya push notification yoktur.
- Ödeme / hakediş işlemi yoktur.
- Schema / migration yoktur.
- Harici kayıt yazımı yoktur.
- Kalıcı rota, durak veya personel ataması değiştirilmez.

## Copilot sınırı
- Sefer Abi bu akışta teklif / önizleme, kabul / red ve uygulandı / uygulanmadı ayrımını güvenli dille anlatır.
- operasyon kanıtı ya da iç teknik ayrıntılar görünmez.
- `Bu rota uygulanmadı` ve `driver route refresh bu milestone’da yok` sınırı korunur.

## Not
- Bu akış, boarding preview ve boarding application milestone’larının üstünde ayrı bir sözleşmeli rota değişikliği kabul yüzeyidir.
