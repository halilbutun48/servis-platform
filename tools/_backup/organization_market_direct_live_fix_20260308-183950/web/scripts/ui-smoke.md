# UI Smoke — Agreements (M17.3)

## Amaç
Company ↔ Room Agreement lifecycle UI test (manuel, deterministic).

## Adımlar

1) Company login: `company@demo.com`
- Agreements → Yeni Agreement oluştur (08:00–10:00, weekMask 127, 1 ay)
- Beklenen: Listede `REQUESTED`

2) Room login: `room@demo.com`
- Agreements → Pending listesinde kayıt görünmeli (Yenile demeden geliyorsa WS invalidate OK)
- Approve → vehicle+driver seç → Onayla
- Beklenen: Pending’den düşer

3) Company ekranı
- Beklenen: Agreement satırı auto-refresh ile `APPROVED/ACTIVE` ve `v:/d:` dolu

4) Conflict
- Company: aynı saat penceresinde ikinci agreement oluştur
- Room: aynı v/d ile approve dene
- Beklenen: 409 conflict kutusu (AGREEMENT_*_CONFLICT) + conflictingAgreement detayları

5) Extend
- Company: “Tarih ile Uzat” → prompt’a `YYYY-MM-DD` gir
- Beklenen: endDate güncellenir, auto-refresh çalışır

6) Cancel
- Company: İptal
- Beklenen: status `CANCELLED`

## Not
- Bu smoke test Gate’e dahil değildir; PR/Release öncesi hızlı kontrol içindir.