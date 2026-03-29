# KABUL / RED / EKSIK / TEKRAR KONTROL AKISI V1

Bu belge M78 ile açılan karar dilini standartlaştırır.

## Karar sınıfları
- **KABUL**: Beklenen davranış net olarak görüldü.
- **RED**: Beklenen davranış sağlanmadı.
- **EKSİK**: İnceleme için gerekli bilgi, kanıt veya ekran tamam değil.
- **TEKRAR KONTROL**: Sonuç sınırda; düzeltme veya yeni testten sonra tekrar bakılmalı.

## Basit akış
1. kontrol maddesi açılır
2. kanıt / proof eklenir
3. kısa not girilir
4. karar seçilir
5. gerekiyorsa tekrar kontrol işareti bırakılır

## Kapanış mantığı
- aynı kayıt hem KABUL hem RED olmaz
- EKSİK sonucu, kararın henüz net olmadığını gösterir
- TEKRAR KONTROL sonucu, işin yeniden ölçülmesi gerektiğini gösterir
