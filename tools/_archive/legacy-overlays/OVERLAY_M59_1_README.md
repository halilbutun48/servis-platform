# OVERLAY M59.1 (2026-03-06) — UI apply fix

M59 overlay'i web dosyalarında `function toHHMM` anchor'ına takıldığı için bu düzeltme geldi.

Bu script:
- Company/Room Agreements panellerine:
  - (kalan Xg) etiketi
  - 'Vardiyalar' kolonu (Bugün DONE/Toplam, Ufuk 7g APPROVED)
  - Agreement status time-based notu
- Shift stats endpoint çağrısını ekler: `/api/agreements/shift-stats` (backend M59 ile eklendi)

Uygulama:
1) Zip'i repo köküne aç
2) `.	ools\overlay_M59_1_apply.ps1`
3) `.	ools\pack.ps1 -To 41`
