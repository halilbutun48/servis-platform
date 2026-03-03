OVERLAY — M20CHECK time-window flake fix (endMin > startMin)

Problem:
- M20CHECK used now+20m .. now+50m for query window.
- If run near TR midnight, qEnd crosses to next TR day -> endMin < startMin -> ASSERT_FAIL "endMin > startMin".

Fix:
- Choose deterministic future window: next TR 10:00 (or tomorrow if already passed).
- Ensure blocker shift overlaps query window (v1/d1) using the same baseMs.

Files:
- backend/scripts/m20check.js

Apply (2 commands):
1) Expand-Archive -Force .\OVERLAY_M20CHECK_TIMEWINDOW_FIX_2026-03-03.zip .
2) .\tools\pack.ps1 -To 20
