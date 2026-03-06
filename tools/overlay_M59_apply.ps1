# tools/overlay_M59_apply.ps1
# M59 — Agreement UI clarity: remaining days + shift summary (today DONE / horizon APPROVED) + time-based note
# Adds backend endpoint: POST /api/agreements/shift-stats
# Patches:
# - backend/src/routes/agreements.js
# - web/src/panels/company/AgreementsPanel.jsx
# - web/src/panels/room/AgreementsPanel.jsx
# Safe string patching (no git apply, minimal anchors).

$ErrorActionPreference = "Stop"

function ReadText($p) { [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function WriteText($p, $s) { [System.IO.File]::WriteAllText($p, $s, [System.Text.Encoding]::UTF8) }

function EnsureInsertedAfter {
  param(
    [string]$raw,
    [string]$needle,
    [string]$insert,
    [string]$idempotencyToken
  )
  if ($raw.Contains($idempotencyToken)) { return $raw }
  $idx = $raw.IndexOf($needle)
  if ($idx -lt 0) { throw "Anchor not found: $needle" }
  $pos = $idx + $needle.Length
  return $raw.Substring(0, $pos) + $insert + $raw.Substring($pos)
}

function ReplaceOnce {
  param([string]$raw, [string]$from, [string]$to, [string]$why)
  $idx = $raw.IndexOf($from)
  if ($idx -lt 0) { throw "Replace anchor not found ($why)." }
  return $raw.Substring(0, $idx) + $to + $raw.Substring($idx + $from.Length)
}

Write-Host ""
Write-Host "=== APPLY OVERLAY M59: Agreement UI clarity (remaining days + shift stats) ===" -ForegroundColor Cyan

# --------------------------
# 1) backend/src/routes/agreements.js
# --------------------------
$agreementsFile = Join-Path $PSScriptRoot "..\backend\src\routes\agreements.js"
$agreementsFile = [System.IO.Path]::GetFullPath($agreementsFile)
$raw = ReadText $agreementsFile
$raw = $raw.Replace("`r`n","`n")

# 1.1 Import TR time helpers (idempotent)
$importNeedle = 'import { createAndEmitNotification } from "../notifications/service.js";'
$importInsert = "`nimport { ymdTR, addDaysTR, atTR } from `"..\time\tr.js`";`n// ✅ M59: agreement UI shift stats helper endpoint`n"
$raw = EnsureInsertedAfter -raw $raw -needle $importNeedle -insert $importInsert -idempotencyToken "agreement UI shift stats helper endpoint"

# 1.2 Insert endpoint after LIST route
$listEndNeedle = "  });`n`n  // GET by id (debug + checks)"
$endpoint = @'
  // ✅ M59: SHIFT STATS (for UI clarity)
  // Body: { agreementIds: number[], horizonDays?: number }
  // Returns: { byId: { [id]: { todayTotal, todayDone, horizonOpen } } }
  r.post("/shift-stats", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const ids = Array.isArray(req.body?.agreementIds) ? req.body.agreementIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0) : [];
    const horizonDays = Math.min(30, Math.max(1, Number(req.body?.horizonDays ?? 7)));

    if (!ids.length) return res.json({ byId: {} });

    const now = new Date();
    const todayYmd = ymdTR(now);
    const todayStart = atTR(todayYmd, 0);
    const tomorrowStart = atTR(addDaysTR(todayYmd, 1), 0);
    const horizonEnd = atTR(addDaysTR(todayYmd, horizonDays), 0);

    const scope = { agreementId: { in: ids } };
    if (req.user.role === "COMPANY") scope.companyId = req.user.companyId ?? -1;
    if (req.user.role === "ROOM") scope.roomId = req.user.roomId ?? -1;

    const todayWhere = { ...scope, startAt: { gte: todayStart, lt: tomorrowStart } };
    const horizonWhere = { ...scope, startAt: { gte: now, lt: horizonEnd }, status: { in: ["APPROVED", "ACTIVE"] } };

    const [todayTotal, todayDone, horizonOpen] = await Promise.all([
      prisma.shift.groupBy({ by: ["agreementId"], where: todayWhere, _count: { _all: true } }),
      prisma.shift.groupBy({ by: ["agreementId"], where: { ...todayWhere, status: "DONE" }, _count: { _all: true } }),
      prisma.shift.groupBy({ by: ["agreementId"], where: horizonWhere, _count: { _all: true } }),
    ]);

    const byId = {};
    for (const id of ids) byId[id] = { todayTotal: 0, todayDone: 0, horizonOpen: 0 };

    for (const row of (todayTotal || [])) {
      const id = Number(row.agreementId);
      if (!byId[id]) byId[id] = { todayTotal: 0, todayDone: 0, horizonOpen: 0 };
      byId[id].todayTotal = Number(row?._count?._all ?? 0);
    }
    for (const row of (todayDone || [])) {
      const id = Number(row.agreementId);
      if (!byId[id]) byId[id] = { todayTotal: 0, todayDone: 0, horizonOpen: 0 };
      byId[id].todayDone = Number(row?._count?._all ?? 0);
    }
    for (const row of (horizonOpen || [])) {
      const id = Number(row.agreementId);
      if (!byId[id]) byId[id] = { todayTotal: 0, todayDone: 0, horizonOpen: 0 };
      byId[id].horizonOpen = Number(row?._count?._all ?? 0);
    }

    res.json({ byId, meta: { todayStart, tomorrowStart, horizonEnd, horizonDays } });
  });

'@

if ($raw -notmatch 'r\.post\("/shift-stats"') {
  $raw = ReplaceOnce -raw $raw -from $listEndNeedle -to ("  });`n`n" + $endpoint + "  // GET by id (debug + checks)") -why "insert /shift-stats"
}
WriteText $agreementsFile $raw
Write-Host "✅ Patched: $agreementsFile" -ForegroundColor Green

# --------------------------
# 2) web/src/panels/company/AgreementsPanel.jsx
# --------------------------
$companyFile = Join-Path $PSScriptRoot "..\web\src\panels\company\AgreementsPanel.jsx"
$companyFile = [System.IO.Path]::GetFullPath($companyFile)
$raw = ReadText $companyFile
$raw = $raw.Replace("`r`n","`n")

# 2.1 Add shiftStats state once
if ($raw -notmatch 'const \[shiftStats, setShiftStats\]') {
  $needle = 'const [items, setItems] = useState([]);'
  $insert = "const [items, setItems] = useState([]);`n  const [shiftStats, setShiftStats] = useState({}); // ✅ M59`n"
  $raw = ReplaceOnce -raw $raw -from $needle -to $insert -why "add shiftStats state"
}

# 2.2 Add helper functions (daysLeft + render summary) near existing helpers
if ($raw -notmatch 'function daysLeftYmd') {
  $needle = 'function toHHMM(min) {'
  $helper = @'
function daysLeftYmd(ymd) {
  if (!ymd || String(ymd).length < 10) return null;
  const end = new Date(String(ymd).slice(0, 10) + "T23:59:59.999");
  const diff = end.getTime() - Date.now();
  const d = Math.ceil(diff / 86400000);
  return Number.isFinite(d) ? d : null;
}

function ShiftSummary({ st }) {
  const tTot = Number(st?.todayTotal ?? 0);
  const tDone = Number(st?.todayDone ?? 0);
  const h = Number(st?.horizonOpen ?? 0);

  return (
    <div className="muted" style={{ lineHeight: 1.2 }}>
      <div>Bugün: {tTot ? `${tDone}/${tTot} DONE` : "-"}</div>
      <div>Ufuk: {h ? `${h} APPROVED` : "-"}</div>
    </div>
  );
}

'@
  $raw = EnsureInsertedAfter -raw $raw -needle $needle -insert ($helper + "`n") -idempotencyToken "function daysLeftYmd"
}

# 2.3 Extend load() to fetch stats after agreements
if ($raw -notmatch '\/api\/agreements\/shift-stats') {
  $from = '      const resp = await api(`/api/agreements?${qs.toString()}`, { token });\n      setItems(resp?.items ?? []);'
  $to = @'
      const resp = await api(`/api/agreements?${qs.toString()}`, { token });
      const list = resp?.items ?? [];
      setItems(list);

      // ✅ M59: pull shift stats for UI (today/horizon)
      try {
        const ids = list.map((x) => x?.id).filter(Boolean);
        if (ids.length) {
          const st = await api("/api/agreements/shift-stats", { token, method: "POST", body: { agreementIds: ids, horizonDays: 7 } });
          setShiftStats(st?.byId ?? {});
        } else {
          setShiftStats({});
        }
      } catch {
        setShiftStats({});
      }
'@
  $raw = ReplaceOnce -raw $raw -from $from -to $to -why "extend load() with shift-stats"
}

# 2.4 Add note (time-based) to the info card text if present
if ($raw -notmatch 'Agreement status time-based') {
  $noteNeedle = 'Sözleşme (Agreement) rota/durak üretmez.'
  if ($raw.Contains($noteNeedle)) {
    $raw = $raw.Replace($noteNeedle, $noteNeedle + ' Agreement status time-based: ACTIVE/DONE, endDate+endMin zamanına göre değişir (vardiya bitince değil).')
  }
}

# 2.5 Insert table column header "Vardiya" before Actions
$hdrFrom = '<th>Room Karşı</th>\n              <th>Actions</th>'
$hdrTo   = '<th>Room Karşı</th>\n              <th>Vardiyalar</th>\n              <th>Actions</th>'
if ($raw.Contains($hdrFrom) -and -not $raw.Contains('<th>Vardiyalar</th>')) {
  $raw = $raw.Replace($hdrFrom, $hdrTo)
}

# 2.6 Insert row cell for summary + add remaining days in date cell
$rowDateFrom = '{String(a.startDate || "").slice(0, 10)} → {String(a.endDate || "").slice(0, 10)}'
if ($raw.Contains($rowDateFrom) -and -not $raw.Contains('kalan')) {
  $raw = $raw.Replace($rowDateFrom, '{String(a.startDate || "").slice(0, 10)} → {String(a.endDate || "").slice(0, 10)} {(() => { const endYmd = String(a.endDate || "").slice(0,10); const left = daysLeftYmd(endYmd); return Number.isFinite(left) ? ` (kalan ${left}g)` : ""; })()}')
}

$rowInsertAnchor = '</td>\n                <td className="muted" title={a.roomOfferNote ? `📝 ${a.roomOfferNote}` : ""}>'
if (-not $raw.Contains('ShiftSummary') -and $raw.Contains($rowInsertAnchor)) {
  # Insert summary cell right after roomOffer cell closes. We'll patch after roomOffer <td> block.
  # Safer: add a new <td> right after the roomOffer <td> block end.
  $marker = '</td>\n                <td>\n                  <div className="row"'
  if ($raw.Contains($marker)) {
    $raw = $raw.Replace($marker, '</td>\n                <td><ShiftSummary st={shiftStats?.[a.id]} /></td>\n                <td>\n                  <div className="row"')
  }
}

WriteText $companyFile $raw
Write-Host "✅ Patched: $companyFile" -ForegroundColor Green

# --------------------------
# 3) web/src/panels/room/AgreementsPanel.jsx
# --------------------------
$roomFile = Join-Path $PSScriptRoot "..\web\src\panels\room\AgreementsPanel.jsx"
$roomFile = [System.IO.Path]::GetFullPath($roomFile)
$raw = ReadText $roomFile
$raw = $raw.Replace("`r`n","`n")
$raw = $raw.Replace("\\r\\n","")

# 3.1 Add shiftStats state
if ($raw -notmatch 'const \[shiftStats, setShiftStats\]') {
  $needle = 'const [others, setOthers] = useState([]);'
  $insert = "const [others, setOthers] = useState([]);`n  const [shiftStats, setShiftStats] = useState({}); // ✅ M59`n"
  $raw = ReplaceOnce -raw $raw -from $needle -to $insert -why "add shiftStats state (room)"
}

# 3.2 Add helper functions if missing
if ($raw -notmatch 'function daysLeftYmd') {
  $needle = 'function toHHMM(min) {'
  $helper = @'
function daysLeftYmd(ymd) {
  if (!ymd || String(ymd).length < 10) return null;
  const end = new Date(String(ymd).slice(0, 10) + "T23:59:59.999");
  const diff = end.getTime() - Date.now();
  const d = Math.ceil(diff / 86400000);
  return Number.isFinite(d) ? d : null;
}

function ShiftSummary({ st }) {
  const tTot = Number(st?.todayTotal ?? 0);
  const tDone = Number(st?.todayDone ?? 0);
  const h = Number(st?.horizonOpen ?? 0);
  return (
    <div className="muted" style={{ lineHeight: 1.2 }}>
      <div>Bugün: {tTot ? `${tDone}/${tTot} DONE` : "-"}</div>
      <div>Ufuk: {h ? `${h} APPROVED` : "-"}</div>
    </div>
  );
}

'@
  $raw = EnsureInsertedAfter -raw $raw -needle $needle -insert ($helper + "`n") -idempotencyToken "function daysLeftYmd"
}

# 3.3 Extend loadAll() to fetch stats
if ($raw -notmatch '\/api\/agreements\/shift-stats') {
  $from = '      const all = await api("/api/agreements?take=200", { token });\n      const items = all?.items ?? [];'
  $to = @'
      const all = await api("/api/agreements?take=200", { token });
      const items = all?.items ?? [];

      // ✅ M59: pull shift stats for UI (today/horizon)
      try {
        const ids = items.map((x) => x?.id).filter(Boolean);
        if (ids.length) {
          const st = await api("/api/agreements/shift-stats", { token, method: "POST", body: { agreementIds: ids, horizonDays: 7 } });
          setShiftStats(st?.byId ?? {});
        } else {
          setShiftStats({});
        }
      } catch {
        setShiftStats({});
      }
'@
  $raw = ReplaceOnce -raw $raw -from $from -to $to -why "extend loadAll with shift-stats (room)"
}

# 3.4 Add note to header line (time-based)
if ($raw -notmatch 'Agreement status time-based') {
  $needle = 'Pending onay (REQUESTED) + Uzatma talepleri burada.'
  if ($raw.Contains($needle)) {
    $raw = $raw.Replace($needle, $needle + ' Agreement status time-based: ACTIVE/DONE, endDate+endMin zamanına göre değişir.')
  }
}

# 3.5 Add column header and row cell in "Diğer Kayıtlar" table
$hdrFrom = '<th>Dir/Pat</th>\n                <th>Company Teklif</th>'
$hdrTo   = '<th>Dir/Pat</th>\n                <th>Vardiyalar</th>\n                <th>Company Teklif</th>'
if ($raw.Contains($hdrFrom) -and -not $raw.Contains('<th>Vardiyalar</th>')) {
  $raw = $raw.Replace($hdrFrom, $hdrTo)
}

# Date cell: add remaining days
$dateFrom = '{String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)}'
if ($raw.Contains($dateFrom) -and -not $raw.Contains('kalan')) {
  $raw = $raw.Replace($dateFrom, '{String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)} {(() => { const endYmd = String(a.endDate || "").slice(0,10); const left = daysLeftYmd(endYmd); return Number.isFinite(left) ? ` (kalan ${left}g)` : ""; })()}')
}

# Insert summary cell after Dir/Pat td
$dirTd = '<td className="muted">{String(a.direction || "INBOUND")}/{String(a.pattern || "ONE_WAY")}</td>'
if ($raw.Contains($dirTd) -and -not $raw.Contains('ShiftSummary st={shiftStats?.[a.id]}')) {
  $raw = $raw.Replace($dirTd, $dirTd + '\n                  <td><ShiftSummary st={shiftStats?.[a.id]} /></td>')
}

WriteText $roomFile $raw
Write-Host "✅ Patched: $roomFile" -ForegroundColor Green

Write-Host ""
Write-Host "DONE ✅  Now run: .\tools\pack.ps1 -To 41" -ForegroundColor Cyan
