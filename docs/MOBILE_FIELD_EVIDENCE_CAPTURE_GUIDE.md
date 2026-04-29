# Mobil Saha Kanıt Toplama Rehberi

Bu rehber, mobil GPS akışının gerçek cihazda ve zayıf ağ altında doğrulanması için kısa bir operasyon akışı verir.

## Hazırlık

1. Uygulamayı üretim benzeri build ile çalıştır.
2. Gerçek Android cihaz kullan.
3. Pil tasarrufu ve agresif arka plan kısıtlarını not et.
4. Telefon GPS'ini aç.
5. KVKK ve gerekli izinleri doğrula.

## Toplanacak senaryolar

- Uygulama açıkken GPS gönderimi
- Ekran kapalıyken GPS gönderimi
- Zayıf ağ altında retry davranışı
- Oturum yenileme sırasında GPS akışı
- İzin kapalıyken blok davranışı
- İzin açıkken recovery davranışı

## Kanıt formatı

- En az 3 ekran görüntüsü
- En az 1 kısa video
- Log çıktı özeti
- Operatör gözlem notu

## Raporlama

Toplanan kanıtı `docs/SAHA_EVIDENCE_PACK_TEMPLATE.md` şablonuna işleyip ilgili benchmark ve runbook bağlantılarıyla birlikte sakla.
