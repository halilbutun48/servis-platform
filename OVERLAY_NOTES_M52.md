# OVERLAY_NOTES — M52

Tarih: 2026-02-28

## Problem
- Agreement (date + startMin/endMin + weekMask) TR saatine göre tanımlanıyor, ama backend hesapları UTC bazlıydı.
- Sonuç: availability/approval conflict hesapları ve agreementShiftGenerator ürettiği shift saatleri **+3 saat kayıyordu**.
- Ayrıca generator yalnızca "bugün" için çalışıyordu (rolling ufuk yoktu).

## Çözüm
1) **TR zaman yardımcıları** eklendi
- `backend/src/time/tr.js`

2) Agreement zaman/çakışma hesapları TR bazlı
- `backend/src/services/agreementConflict.js`
- `backend/src/services/agreementConflictBatch.js`

3) Company shift create sırasında “Agreement varsa room skip” hesabı TR bazlı
- `backend/src/routes/shifts/company.js` içindeki helper blok

4) Agreement shift generator rolling 7 gün + TR
- `backend/src/jobs/agreementShiftGenerator.js`
- “bugün..bugün+6” ufuk içinde, agreement startDate/endDate ve weekMask’e uyan günlerde shift üretir
- status: `APPROVED`
- dedupe: `Shift @@unique([agreementId, startAt])` + precheck

5) Gate check’ler TR semantics
- `backend/scripts/m17check.js`, `m18check.js`, `m20check.js` (ayrıca m22/m23 date helper küçük düzeltme)

## Notlar
- TR offset sabit: **UTC+03:00** (DST yok varsayımı).
- Agreement’da vehicle/driver varsa conflict check uygulanır; yoksa generator conflict bakmadan shift oluşturabilir.
- Sonraki milestone (M53) ile Room AgreementsPanel teklif görünürlüğü + agreement:update refresh tamamlanacak.
