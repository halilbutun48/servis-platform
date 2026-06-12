# UX-SMOKE-PASS-MINUS-ZERO-01

Tarih: 2026-06-12
Repo: `servis-platform`

## 1) Amaç

Bu milestone'un amacı premium browser smoke raporunda `PASS-` sayısını sıfıra indirdiğimizi doğrulamaktır.

Bu belge:
- `PASS-` sınıfının artık evidence/backlog yerine sıfır hedefiyle izlendiğini açıklar,
- UX-FIX rows are tracked separately ve `PASS-` sıfır standardını bozmadığını netleştirir,
- `BLOCKER`, `AUTH-BLOCKED` ve `NOT-FOUND` sınıflarının da `0` hedefiyle korunduğunu netleştirir,
- smoke runner'ın görünür etiketleri yeni nötr UX diline taşıdığını doğrulayan canonical referanstır.

Bu milestone:
- runtime davranışını gevşetmez,
- write-action, route apply, contract execute veya tool execution açmaz,
- browser smoke artifact'ini commit alanına taşımaz.

## 2) Kabul Kriteri

Kabul hedefi:
- `PASS- 0`
- `BLOCKER 0`
- `AUTH-BLOCKED 0`
- `NOT-FOUND 0`

Smoke snapshot ayrıca:
- route count tutarlı olmalı,
- premium smoke raporu güncel olmalı,
- `UX-FIX` satırları ayrı backlog olarak raporlanabilir,
- mobile ve desktop yüzeylerde eski `kabul / onay / uygula` görünür metinleri bırakılmamalıdır.

## 3) UX-FIX Backlog

Bu snapshot'ta `UX-FIX` satırı yok. Önceki backlog kapatıldı ve hard gate artık `PASS- 0` üzerinde duruyor.

| Role | Route | Viewport | Bucket | Not |
| --- | --- | --- | --- | --- |
| - | - | - | - | UX-FIX backlog yok; premium smoke şu an 82 PASS / 0 PASS- / 0 UX-FIX. |

## 4) Referans

- Check alias: `check:uxsmokepassminuszero01`
- Check command: `node backend\scripts\ux_smoke_pass_minus_zero_01_check.js`
- Smoke runner: `node backend\scripts\ux_live_panel_premium_smoke_01.mjs`
- Smoke report: `backend/artifacts/browser-smoke/UX_LIVE_PANEL_PREMIUM_SMOKE_01/report.json`

## 5) Scope

Bu milestone:
- yeni AI action açmaz,
- tool execution açmaz,
- write-action dispatcher eklemez,
- route apply / dispatch apply / agreement execute çağrısı eklemez,
- browser smoke artifacts'ini stage etmez.
