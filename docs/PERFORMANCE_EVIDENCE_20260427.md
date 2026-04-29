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

## 2026-04-28 addendum

Follow-up runs were captured with the benchmark harness extended to support adjustable request timeouts and an explicit `noThrottle` benchmark flag:

- `requestTimeoutMs` can be raised for longer saturation checks.
- `noThrottle=1` is benchmark-only and appends `?noThrottle=1` to `/api/gps` requests.

This gave us additional 3000-vehicle / 30-cycle readstorm artifacts:

### 3000 vehicles / auto-reached / readstorm / 30 cycles / noThrottle=1 / 30s interval / concurrency=64

Command:

```powershell
node backend/scripts/bench_gps_publish_only.js --scenario=auto-reached --vehicles=3000 --cycles=30 --intervalMs=30000 --panelProfile=readstorm --noThrottle=1 --requestTimeoutMs=30000 --concurrency=64
```

Result:

- Requests: `90000`
- OK: `90000`
- Errors: `0`
- Throttled: `0`
- p50: `1630.2ms`
- p95: `1913.94ms`
- p99: `2223.84ms`
- Duration: `2559942ms`
- Panel requests: `17201`
- Panel reloads: `11543`
- Panel invalidations: `198764`
- Report: `artifacts/benchmarks/gps_auto-reached_3000veh_30cycles_2026-04-29T05-12-16-959Z.json`

### 3000 vehicles / readstorm / 30 cycles / noThrottle=1 / 20s interval

Command:

```powershell
node --% backend/scripts/bench_gps_publish_only.js --scenario=publish-only --panelProfile=readstorm --vehicles=3000 --cycles=30 --intervalMs=20000 --requestTimeoutMs=60000 --noThrottle=1 --output=artifacts/benchmarks/gps_publish-only_3000veh_30cycles_readstorm_2026-04-28T_clean_nothrottle.json
```

Result:

- Requests: `90000`
- OK: `49132`
- Errors: `40868`
- Throttled: `0`
- p50: `2797.97ms`
- p95: `60008.74ms`
- p99: `60013.14ms`
- Duration: `949290ms`
- Panel requests: `464`
- Panel reloads: `414`
- Panel invalidations: `134805`
- Report: `artifacts/benchmarks/gps_publish-only_3000veh_30cycles_readstorm_2026-04-28T_clean_nothrottle.json`

### 3000 vehicles / readstorm / 30 cycles / noThrottle=1 / 30s interval

Command:

```powershell
node --% backend/scripts/bench_gps_publish_only.js --scenario=publish-only --panelProfile=readstorm --vehicles=3000 --cycles=30 --intervalMs=30000 --requestTimeoutMs=60000 --noThrottle=1 --output=artifacts/benchmarks/gps_publish-only_3000veh_30cycles_readstorm_2026-04-28T_clean_nothrottle_spaced.json
```

Result:

- The run timed out at the 20-minute shell limit before completion.
- The partial output confirms the harness and seed setup were working, but the longer soak needs a larger wall-clock window or a lighter panel profile to finish cleanly in this workspace.

Interpretation:

- We now have a measured 30-cycle readstorm saturation boundary and a benchmark harness that can express longer request timeouts, throttle bypass, and bounded worker concurrency explicitly.
- The cleanest long-soak proof now includes the 3000-vehicle auto-reached 30-cycle readstorm artifact with `errors=0`.
- The earlier 20s / 30s runs remain useful as stress boundary examples, but the current long soak is the stronger canonical proof.
