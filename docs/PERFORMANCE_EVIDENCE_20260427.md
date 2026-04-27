# Performance Evidence - 2026-04-27

## Scope

This evidence records local benchmark results for the Vardis / Servis Platform GPS publish path and panel readstorm profile.

The goal is to preserve the scale-test proof without changing production behavior.

## Environment

- Repo: `D:\servis-platform`
- Benchmark script: `backend/scripts/bench_gps_publish_only.js`
- Scenario: `publish-only`
- Base URL: `http://127.0.0.1:3000`
- Interval: `120000ms`
- Panel profile: `none` and `readstorm`
- Date: `2026-04-27`

## Important interpretation note

The repeated `PASSWORD_CHANGE_REQUIRED` errors are test-data/auth hygiene errors, not load or throughput failures. The error pattern is stable and maps to the same seed users across cycles.

## Evidence summary

### 3000 vehicles / publish-only / 30 cycles

Command:

```powershell
node backend/scripts/bench_gps_publish_only.js --vehicles=3000 --cycles=30 --intervalMs=120000 --noPanels
```

Result:

- Requests: `90000`
- OK: `89760`
- Errors: `240`
- Throttled: `0`
- p50: `23.65ms`
- p95: `27.66ms`
- p99: `32.5ms`
- Duration: `3866218ms` (~64.4 minutes)
- Report: `artifacts/benchmarks/gps_publish-only_3000veh_30cycles_2026-04-27T10-45-42-254Z.json`

Interpretation:

- GPS publish-only path is stable at 3000 vehicles with 120s cadence.
- No throttling occurred.
- Latency remained low for the full soak window.

### 3000 vehicles / readstorm / 5 cycles

Command:

```powershell
node backend/scripts/bench_gps_publish_only.js --vehicles=3000 --cycles=5 --intervalMs=120000 --panelProfile=readstorm
```

Result:

- Requests: `15000`
- OK: `14960`
- Errors: `40`
- Throttled: `0`
- p50: `26.15ms`
- p95: `38.12ms`
- p99: `46.96ms`
- Duration: `890191ms`
- Panel requests: `337`
- Panel reloads: `290`
- Panel invalidations: `224491`
- Report: `artifacts/benchmarks/gps_publish-only_3000veh_5cycles_2026-04-27T11-32-52-777Z.json`

Interpretation:

- Readstorm profile started successfully after panel token-source fix.
- WS invalidation and panel read pressure were active.
- No throttling occurred.

### 3000 vehicles / readstorm / 10 cycles

Command:

```powershell
node backend/scripts/bench_gps_publish_only.js --vehicles=3000 --cycles=10 --intervalMs=120000 --panelProfile=readstorm
```

Result:

- Requests: `30000`
- OK: `29920`
- Errors: `80`
- Throttled: `0`
- p50: `24ms`
- p95: `27.39ms`
- p99: `31.19ms`
- Duration: `1476585ms` (~24.6 minutes)
- Panel requests: `654`
- Panel reloads: `567`
- Panel invalidations: `523405`
- Report: `artifacts/benchmarks/gps_publish-only_3000veh_10cycles_2026-04-27T12-10-07-193Z.json`

Interpretation:

- 3000 vehicles with panel readstorm remained stable.
- Panel invalidation volume exceeded 523k without throttling.
- p95 stayed below 30ms.

## Current scale-readiness conclusion

The platform is stable for:

- 3000 vehicles
- 120s GPS publish cadence
- publish-only soak
- readstorm profile with active panel sessions and WS invalidation pressure

This evidence supports the current conclusion that the system is rate-bound rather than vehicle-count-bound.

## Remaining caveats

- The benchmark harness still exposes fixed auth/test-data hygiene errors (`PASSWORD_CHANGE_REQUIRED`) for a small seed-user subset.
- The next performance proof should either clear the password-change state for benchmark users or record that these errors are excluded from throughput interpretation.
- Hot-file debt remains tracked separately under M90C.6.
- Field/pilot evidence remains separate from synthetic benchmark evidence.
## BENCH_CLEAN_READSTORM_3000_3CYCLES_20260427

- Tarih: 2026-04-27
- Senaryo: 3000 araç, 3 cycle, 120s cadence, eadstorm panel profili.
- Komut: 
ode backend/scripts/bench_gps_publish_only.js --vehicles=3000 --cycles=3 --intervalMs=120000 --panelProfile=readstorm
- Sonuç: 9000 / 9000 OK, throttled 0, errors 0.
- Latency: p50 24.03ms, p95 33.21ms, p99 42.1ms.
- Panel yükü: panelRequests 210, panelReloads 179, panelInvalidations 125282.
- Rapor: rtifacts/benchmarks/gps_publish-only_3000veh_3cycles_2026-04-27T12-40-01-908Z.json.
- Not: PASSWORD_CHANGE_REQUIRED seed-user hijyen hatası kapandı; önceki hatalar throughput problemi değildi.
