OVERLAY: M52 — Agreement -> Rolling 7 Gün Shift Generator (TR saat)

Neler var?

- backend: Agreement schedule hesapları TR (+03:00) bazlı olacak şekilde düzeltildi.
- backend: agreementShiftGenerator artık **bugün..bugün+6** rolling ufukta shift üretir (status=APPROVED).
- backend: Agreement overlap helper’ları (market teklif skip) TR bazlı.
- gate: M17/M18/M20 agreement check script’leri TR semantics ile güncellendi.

Apply:
- ZIP’i repo root’a (D:\servis-platform) extract et → overwrite.

DoD quick:
- Agreement APPROVED → rolling 7 gün içinde, agreement range + weekMask’e uyan günlerde shift oluşur.
- Aynı gün/slot tekrar üretilmez (Shift @@unique([agreementId,startAt])).
