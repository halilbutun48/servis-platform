# M93 Queue Durability Proof

## Kapsam

M93, sürücünün telefon GPS'i sonrası çalışan `autoReachedQueue` omurgasının saha öncesi dayanıklılık kanıt paketidir.

## Eklenenler

- Queue threshold evaluator
- Dead-letter read-only snapshot
- Combined queue proof snapshot
- Super admin read-only admin endpoints
- Static proof check
- Optional runtime probe
- Redis down/up ve worker restart reclaim runbook

## Bilinçli sınırlar

- Queue processing davranışı değiştirilmedi.
- Redis durdurma/başlatma otomatik yapılmadı.
- Worker kill otomatik yapılmadı.
- Runtime drill operatör kontrollü kalır.

## Kabul

- `tools/pack_m93_queue_durability_proof.ps1` PASS.
- Runtime probe, token verildiğinde admin queue endpoint'lerini okuyabilir.
- Manual drill sonuçları saha kanıtına eklenir.
