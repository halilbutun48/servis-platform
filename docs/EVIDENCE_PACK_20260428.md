# Evidence Pack - 2026-04-28

## Purpose

This page groups the current synthetic performance evidence, queue durability proof, and the remaining field-evidence checklist into one place.

It does not change production behavior. It only packages proof already present in the repo.

## Synthetic performance evidence

Primary narrative:

- [docs/PERFORMANCE_EVIDENCE_20260427.md](/D:/servis-platform/docs/PERFORMANCE_EVIDENCE_20260427.md)

Key artifacts:

- [artifacts/benchmarks/gps_publish-only_3000veh_30cycles_2026-04-27T10-45-42-254Z.json](/D:/servis-platform/artifacts/benchmarks/gps_publish-only_3000veh_30cycles_2026-04-27T10-45-42-254Z.json)
- [artifacts/benchmarks/gps_publish-only_3000veh_10cycles_2026-04-27T12-10-07-193Z.json](/D:/servis-platform/artifacts/benchmarks/gps_publish-only_3000veh_10cycles_2026-04-27T12-10-07-193Z.json)
- [artifacts/benchmarks/gps_publish-only_3000veh_3cycles_2026-04-27T12-40-01-908Z.json](/D:/servis-platform/artifacts/benchmarks/gps_publish-only_3000veh_3cycles_2026-04-27T12-40-01-908Z.json)
- [artifacts/benchmarks/gps_auto_reached_300veh_1cycle_3000ph_v1.json](/D:/servis-platform/artifacts/benchmarks/gps_auto_reached_300veh_1cycle_3000ph_v1.json)
- [artifacts/benchmarks/gps_auto_reached_500veh_180cycles_readstorm_soak.json](/D:/servis-platform/artifacts/benchmarks/gps_auto_reached_500veh_180cycles_readstorm_soak.json)

## Queue durability proof

Canonical proof and drill notes:

- [docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md](/D:/servis-platform/docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md)
- [docs/MILESTONE_M93_QUEUE_DURABILITY_PROOF.md](/D:/servis-platform/docs/MILESTONE_M93_QUEUE_DURABILITY_PROOF.md)

Supporting drill outputs:

- M93 runtime probe
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

## Reading order

1. [docs/PERFORMANCE_EVIDENCE_20260427.md](/D:/servis-platform/docs/PERFORMANCE_EVIDENCE_20260427.md)
2. [docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md](/D:/servis-platform/docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md)
3. This index for the remaining field checklist
