# OVERLAY M58 — Agreement Extend Request/Counter + Driver DONE WS Refresh

Bu overlay şunları düzeltir:

1) **Agreement uzatma artık “direkt extend” değil** → Company `extend-request` gönderir, Room `accept/reject/counter` yapar, Company counter'ı `accept/reject` eder.
2) **Room/Company ekranlarında uzatma talepleri görünmeme** problemi çözülür (UI + backend aynı sözleşme alanlarına bağlanır).
3) **Driver “Görevi Bitir” sonrası Company/Room’da shift hala ACTIVE** görünmesi: `shift:update` WS emiti eklendi (listeler otomatik refresh).

## Uygulama

1. Zip’i repo köküne aç:
- `Expand-Archive -Force .\OVERLAY_M58_...zip .\`

2. Patch’i uygula:
- `.\tools\overlay_M58_apply.ps1`

3. Gate/Pack:
- `.\tools\pack.ps1 -To 41`

Not: Container start komutu zaten `prisma db push` çalıştırdığı için yeni alanlar DB’ye otomatik eklenir.
