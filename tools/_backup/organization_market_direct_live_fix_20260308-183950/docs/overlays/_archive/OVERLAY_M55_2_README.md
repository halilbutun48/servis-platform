# OVERLAY M55.2 — Guided Mode: Tarih aralığı + Günler (weekMask) guard

## Problem
Guided Mode'da başlangıç tarihi hafta sonu iken gün filtresi "Hafta içi" seçili kalırsa,
seçili tarih aralığında **0 geçerli gün** oluşabiliyor. Bu, sonraki adımlarda room tarafında
beklenmeyen UI durumlarına/hatalara yol açabiliyor.

## Çözüm
- `countMatchingDaysInRange(start,end,weekMask)` ile seçili aralıkta kaç gün eşleştiği hesaplanır.
- Eğer `0` ise:
  - UI'da kırmızı uyarı gösterilir
  - "Taslak shift oluştur" butonu disable edilir
  - Kullanıcıya "Başlangıcı <nextValidStart> yap" kısayolu sunulur

## Dosyalar
- web/src/utils/agreementUi.js
- web/src/panels/company/GuidedPlanModal.jsx
