# UX-SMOKE-PASS-MINUS-EVIDENCE-01

Tarih: 2026-06-02
Repo: `servis-platform`

## 1) Amaç

Bu milestone'un amacı `PASS-` bucket'ını hardcoded launcher-secondary baseline yerine evidence-based smoke classification ile açıklamaktır.

Bu belge:
- smoke runner'ın PASS- kararını hangi sinyallerin ürettiğini açıklar,
- `Sefer Abi launcher secondary copilot olarak görünür.` notunun tek başına PASS- nedeni olmadığını netleştirir,
- `Harita / canlı takip dili görünür.` notunun tek başına PASS- nedeni olmadığını netleştirir,
- final premium kabul öncesi PASS- bucket'ını route / panel / role bazında okunur hale getirir.

Bu milestone:
- UI değiştirmez,
- backend route / service davranışını değiştirmez,
- fail policy'yi gevşetmez.

## 2) PASS- Karar Standardı

PASS- classification standardı evidence-based olarak çalışır.

PASS- yalnızca evidence varsa verilir.

Kabul edilen PASS- kanıtları:
- review queue action eksikliği,
- room route preview kısa karar kartı,
- room dispatch apply evidence,
- company vardiya -> sözleşme taslağı geçişi,
- commercial accepted/applied bucket görünürlüğü,
- uzun live-map yüzeyleri,
- parent console noise.

Kabul edilmeyen tekil sinyaller:
- `Sefer Abi launcher secondary copilot olarak görünür.` tek başına PASS- nedeni değildir.
- `Harita / canlı takip dili görünür.` tek başına PASS- nedeni değildir.

## 3) Current Smoke Snapshot

Bu milestone'un referans aldığı canlı smoke snapshot:

| Metric | Value |
| --- | ---: |
| PASS | `59` |
| PASS- | `23` |
| UX-FIX | `0` |
| BLOCKER | `0` |
| AUTH-BLOCKED | `0` |
| NOT-FOUND | `0` |
| Route checks | `82` |
| Screenshot sayısı | `164` |

## 4) PASS- Evidence Inventory

| Route / yüzey | Role | Viewport | PASS- evidence | Not |
| --- | --- | --- | --- | --- |
| `/#/superadmin/onboarding-review` | superadmin | desktop + mobile | review actions incomplete | Read-only review queue, write flow değil. |
| `/#/room/shifts` | room | desktop | dispatch apply button enabled on seeded selection | Enable edilmiş dispatch aksiyonu görünür; PASS- fakat evidence-based. |
| `/#/room/operation-health` | room | desktop + mobile | route preview compact card | Mobile click fail olsa bile kompakt karar kartı görünür. |
| `/#/room/commercial-flow` | room | desktop + mobile | commercial accepted/applied bucket | Ticari bucket görünürlüğü evidence sağlar. |
| `/#/company/shifts` | company | desktop + mobile | convertToAgreement draft transition | Dönüşüm akışı liste ekranında kalmaz. |
| `/#/company/commercial-flow` | company | desktop + mobile | commercial accepted/applied bucket | Ticari bucket görünürlüğü evidence sağlar. |
| `/#/school/commercial-flow` | school | desktop + mobile | commercial accepted/applied bucket | Ticari bucket görünürlüğü evidence sağlar. |
| `/#/organization/commercial-flow` | organization | desktop + mobile | commercial accepted/applied bucket | Ticari bucket görünürlüğü evidence sağlar. |
| `/#/room/live` / `/#/room/map` | room | mobile | long live-map surface | Desktop yüzeyler PASS kalabilir. |
| `/#/company/map` | company | desktop | console noise | Console error count 1. |
| `/#/company/map` | company | mobile | long live-map surface | Desktop yüzey PASS kalabilir. |
| `/#/personel/live` | personel | mobile | long live-map surface | Desktop yüzey PASS kalabilir. |
| `/#/parent/live` | parent | desktop + mobile | console noise | UI kırığı değil; gürültü sinyali. |
| `/#/parent` | parent | desktop + mobile | console noise | UI kırığı değil; gürültü sinyali. |

## 5) UX-FIX ile Ayrım

UX-FIX halen gerçek kullanıcı problemi için kullanılır:
- dispatch apply butonu görünmüyor,
- agreement detail okunur değil veya click navDock tarafından intercept ediliyor,
- kullanıcı-facing token/hash/stale/debug görünür,
- gerçek panel boşluğu veya yanlış route/panel,
- gerçek blocker / 404.

## 6) Final Hedef

Final premium kabul için hedef hâlâ:
- `PASS- 0`
- `UX-FIX 0`
- `BLOCKER 0`
- `NOT-FOUND 0`
- backend lint `0 warning`
- web lint `0 warning`
- `verify:final PASS`

Bu milestone sadece PASS- bucket'ını evidence-based hale getirir; kabul kapısını gevşetmez.
