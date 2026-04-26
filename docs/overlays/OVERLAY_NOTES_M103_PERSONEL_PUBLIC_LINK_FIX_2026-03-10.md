# OVERLAY NOTES — M103 PERSONEL PUBLIC LINK FIX (2026-03-10)

## Amaç
M102 sonrası panelde görülen iki UI tutarsızlığını düzeltmek:
- s?resi dolmu? / revoke edilmi? linklerin h?l? aktif gibi g?r?nmesi
- vardiya değişince veya revoke sonrası eski ham URL’nin ekranda kalması

## Değişiklikler
- `web/src/panels/company/PassengerLinksPanel.jsx`
  - yalnızca gerçekten kullanılabilir linkleri aktif kabul eder
  - fresh link cache anahtarı `shiftId:personelId` oldu
  - vardiya değişince fresh link cache temizlenir
  - revoke sonrası ilgili fresh link cache temizlenir
  - backend token döndürmezse net hata verir

## Beklenen sonuç
- expired/revoked link “aktif link” gibi görünmez
- yanlış vardiyadan kalan URL ekranda taşınmaz
- revoke sonrası kullanıcıya ölü link gösterilmez
