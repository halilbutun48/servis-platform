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

Earlier `PASSWORD_CHANGE_REQUIRED` errors were test-data/auth hygiene errors, not load or throughput failures. After the seed-user hygiene fix, the clean readstorm proof below records `errors=0`.

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
- The repeated errors in this historical run came from seed-user password-change hygiene, not throughput.

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
- The repeated errors in this historical run came from seed-user password-change hygiene, not throughput.

### 3000 vehicles / readstorm / 3 cycles / clean seed hygiene

Command:

```powershell
node backend/scripts/bench_gps_publish_only.js --vehicles=3000 --cycles=3 --intervalMs=120000 --panelProfile=readstorm
```

Result:

- Requests: `9000`
- OK: `9000`
- Errors: `0`
- Throttled: `0`
- p50: `24.03ms`
- p95: `33.21ms`
- p99: `42.1ms`
- Duration: `638950ms`
- Panel requests: `210`
- Panel reloads: `179`
- Panel invalidations: `125282`
- Report: `artifacts/benchmarks/gps_publish-only_3000veh_3cycles_2026-04-27T12-40-01-908Z.json`

Interpretation:

- Seed-user password-change hygiene is clean.
- Readstorm starts with driver, company and room panel sessions.
- GPS publish + panel read + WS invalidation pressure stays stable.
- No throttling and no application errors were observed.

## Current scale-readiness conclusion

The platform is stable for:

- 3000 vehicles
- 120s GPS publish cadence
- publish-only soak
- readstorm profile with active panel sessions and WS invalidation pressure
- clean seed-user hygiene with `errors=0`

This evidence supports the current conclusion that the system is rate-bound rather than vehicle-count-bound.

## Remaining caveats

- The clean readstorm proof is 3 cycles; a clean 30-cycle readstorm soak can be added later for enterprise evidence.
- Hot-file debt remains tracked separately under M90C.6.
- Field/pilot evidence remains separate from synthetic benchmark evidence.
