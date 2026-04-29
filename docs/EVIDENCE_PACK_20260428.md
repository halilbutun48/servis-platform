# Evidence Pack - 2026-04-28

## Purpose

This page groups the current synthetic performance evidence, queue durability proof, and the remaining field-evidence checklist into one place.

It does not change production behavior. It only packages proof already present in the repo.

## Synthetic performance evidence

Primary narrative:

- [docs/PERFORMANCE_EVIDENCE_20260427.md](/D:/servis-platform/docs/PERFORMANCE_EVIDENCE_20260427.md)

Key artifacts:

- [artifacts/benchmarks/gps_auto-reached_3000veh_30cycles_2026-04-29T05-12-16-959Z.json](/D:/servis-platform/artifacts/benchmarks/gps_auto-reached_3000veh_30cycles_2026-04-29T05-12-16-959Z.json)
- [artifacts/benchmarks/gps_publish-only_3000veh_30cycles_2026-04-27T10-45-42-254Z.json](/D:/servis-platform/artifacts/benchmarks/gps_publish-only_3000veh_30cycles_2026-04-27T10-45-42-254Z.json)
- [artifacts/benchmarks/gps_publish-only_3000veh_10cycles_2026-04-27T12-10-07-193Z.json](/D:/servis-platform/artifacts/benchmarks/gps_publish-only_3000veh_10cycles_2026-04-27T12-10-07-193Z.json)
- [artifacts/benchmarks/gps_publish-only_3000veh_3cycles_2026-04-27T12-40-01-908Z.json](/D:/servis-platform/artifacts/benchmarks/gps_publish-only_3000veh_3cycles_2026-04-27T12-40-01-908Z.json)
- [artifacts/benchmarks/gps_auto_reached_300veh_1cycle_3000ph_v1.json](/D:/servis-platform/artifacts/benchmarks/gps_auto_reached_300veh_1cycle_3000ph_v1.json)
- [artifacts/benchmarks/gps_auto_reached_500veh_180cycles_readstorm_soak.json](/D:/servis-platform/artifacts/benchmarks/gps_auto_reached_500veh_180cycles_readstorm_soak.json)

Latest long soak summary:

- 3000 araç
- 30 cycle
- readstorm panel profile
- requests: 90000
- ok: 90000
- throttled: 0
- errors: 0
- p50: 1630.2ms
- p95: 1913.94ms
- p99: 2223.84ms
- duration: 2559942ms
- panelRequests: 17201
- panelReloads: 11543
- panelInvalidations: 198764

## Queue durability proof

Canonical proof and drill notes:

- [docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md](/D:/servis-platform/docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md)
- [docs/MILESTONE_M93_QUEUE_DURABILITY_PROOF.md](/D:/servis-platform/docs/MILESTONE_M93_QUEUE_DURABILITY_PROOF.md)

Supporting drill outputs:

- M93 runtime probe
- M93 runtime drill
- Redis down/up drill
- worker restart reclaim drill
- poison item dead-letter drill
- dead-letter requeue / resolve audit path

## Remaining field evidence checklist

Still to capture outside this synthetic pack:

- real Android device
- weak-network run
- driver-phone GPS background run
- permission-off / permission-on split
- operator note and screenshot pack

Prepared capture surface:

- [docs/SAHA_EVIDENCE_PACK_TEMPLATE.md](/D:/servis-platform/docs/SAHA_EVIDENCE_PACK_TEMPLATE.md)
- [docs/MOBILE_FIELD_EVIDENCE_CAPTURE_GUIDE.md](/D:/servis-platform/docs/MOBILE_FIELD_EVIDENCE_CAPTURE_GUIDE.md)

## Reading order

1. [docs/PERFORMANCE_EVIDENCE_20260427.md](/D:/servis-platform/docs/PERFORMANCE_EVIDENCE_20260427.md)
2. [docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md](/D:/servis-platform/docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md)
3. This index for the remaining field checklist
