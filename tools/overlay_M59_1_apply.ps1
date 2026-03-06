# tools/overlay_M59_1_apply.ps1
# M59.1 — Fix overlay apply: add agreement remaining days + shift summary columns
# Works with current repo layout (agreementUi helpers are imported, no local toHHMM function).
# Safe, idempotent string-based patching.

$ErrorActionPreference = "Stop"

function ReadText($p) { [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function WriteText($p, $s) { [System.IO.File]::WriteAllText($p, $s, [System.Text.Encoding]::UTF8) }

function InsertAfter {
  param([string]$raw, [string]$needle, [string]$insert, [string]$token)
  if ($raw.Contains($token)) { return $raw }
  $idx = $raw.IndexOf($needle)
  if ($idx -lt 0) { throw "Anchor not found: $needle" }
  return $raw.Substring(0, $idx + $needle.Length) + $insert + $raw.Substring($idx + $needle.Length)
}

function ReplaceOnce {
  param([string]$raw, [string]$from, [string]$to, [string]$why)
  $idx = $raw.IndexOf($from)
  if ($idx -lt 0) { throw "Replace anchor not found ($why): $from" }
  return $raw.Substring(0, $idx) + $to + $raw.Substring($idx + $from.Length)
}

Write-Host ""
Write-Host "=== APPLY OVERLAY M59.1: Agreement UI clarity (web panels) ===" -ForegroundColor Cyan

# --------------------------
# Company panel
# --------------------------
$companyFile = Join-Path $PSScriptRoot "..\web\src\panels\company\AgreementsPanel.jsx"
$companyFile = [System.IO.Path]::GetFullPath($companyFile)
$raw = ReadText $companyFile
$raw = $raw.Replace("`r`n","`n")

# Add shiftStats state
if ($raw -notmatch 'const \[shiftStats, setShiftStats\]') {
  $raw = ReplaceOnce -raw $raw -from 'const [items, setItems] = useState([]);' -to "const [items, setItems] = useState([]);`n  const [shiftStats, setShiftStats] = useState({}); // ✅ M59`n" -why "shiftStats state"
}

# Insert helpers after agreementUi import
$importNeedle = '} from "../../utils/agreementUi";'
$helpers = @"


// ✅ M59 helpers
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

"@
$raw = InsertAfter -raw $raw -needle $importNeedle -insert $helpers -token "// ✅ M59 helpers"

# Fetch stats after loading agreements
if ($raw -notmatch '"/api/agreements/shift-stats"') {
  $raw = $raw.Replace(
'      const resp = await api(`/api/agreements?${qs.toString()}`, { token });' + "`n" + '      setItems(resp?.items ?? []);',
'      const resp = await api(`/api/agreements?${qs.toString()}`, { token });
      const list = resp?.items ?? [];
      setItems(list);

      // ✅ M59: shift stats (today/horizon) for UI clarity
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
'
  )
}

# Add header column
if (-not $raw.Contains('<th>Vardiyalar</th>')) {
  $raw = $raw.Replace('<th>Room Karşı</th>' + "`n" + '              <th>Actions</th>',
                      '<th>Room Karşı</th>' + "`n" + '              <th>Vardiyalar</th>' + "`n" + '              <th>Actions</th>')
}

# Add remaining days in date cell
if ($raw -notmatch 'kalan \${left}g') {
  $raw = $raw.Replace(
'                  {String(a.startDate || "").slice(0, 10)} → {String(a.endDate || "").slice(0, 10)}',
'                  {String(a.startDate || "").slice(0, 10)} → {String(a.endDate || "").slice(0, 10)} {(() => { const endYmd = String(a.endDate || "").slice(0,10); const left = daysLeftYmd(endYmd); return Number.isFinite(left) ? ` (kalan ${left}g)` : ""; })()}'
  )
}

# Add summary cell between roomOffer and actions
if (-not $raw.Contains('<td><ShiftSummary st={shiftStats?.[a.id]} /></td>')) {
  $raw = $raw.Replace('</td>' + "`n" + '                <td>' + "`n" + '                  <div className="row"',
                      '</td>' + "`n" + '                <td><ShiftSummary st={shiftStats?.[a.id]} /></td>' + "`n" + '                <td>' + "`n" + '                  <div className="row"')
}

# Add time-based note
if ($raw -notmatch 'Agreement status time-based') {
  $raw = $raw.Replace('Sözleşme (Agreement) rota/durak üretmez.', 'Sözleşme (Agreement) rota/durak üretmez. Agreement status time-based: ACTIVE/DONE, endDate+endMin zamanına göre değişir (vardiya bitince değil).')
}

WriteText $companyFile $raw
Write-Host "✅ Patched: $companyFile" -ForegroundColor Green

# --------------------------
# Room panel
# --------------------------
$roomFile = Join-Path $PSScriptRoot "..\web\src\panels\room\AgreementsPanel.jsx"
$roomFile = [System.IO.Path]::GetFullPath($roomFile)
$raw = ReadText $roomFile
$raw = $raw.Replace("`r`n","`n")
$raw = $raw.Replace("\\r\\n","")

# Add shiftStats state
if ($raw -notmatch 'const \[shiftStats, setShiftStats\]') {
  $raw = ReplaceOnce -raw $raw -from 'const [others, setOthers] = useState([]);' -to "const [others, setOthers] = useState([]);\n  const [shiftStats, setShiftStats] = useState({}); // ✅ M59\n" -why "room shiftStats state"
}

# Insert helpers after agreementUi import
$roomImportNeedle = 'import { toHHMM, weekMaskToText } from "../../utils/agreementUi";'
$raw = InsertAfter -raw $raw -needle $roomImportNeedle -insert $helpers -token "// ✅ M59 helpers"

# Fetch stats after items are loaded
if ($raw -notmatch '"/api/agreements/shift-stats"') {
  $raw = $raw.Replace(
'      const all = await api("/api/agreements?take=200", { token });' + "`n" + '      const items = all?.items ?? [];',
'      const all = await api("/api/agreements?take=200", { token });
      const items = all?.items ?? [];

      // ✅ M59: shift stats (today/horizon) for UI clarity
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
'
  )
}

# Add header column to "Diğer Kayıtlar" table
if (-not $raw.Contains('<th>Vardiyalar</th>')) {
  $raw = $raw.Replace('<th>Dir/Pat</th>' + "`n" + '                <th>Hub</th>',
                      '<th>Dir/Pat</th>' + "`n" + '                <th>Vardiyalar</th>' + "`n" + '                <th>Hub</th>')
}

# Add remaining days to date range
if ($raw -notmatch 'kalan \${left}g') {
  $raw = $raw.Replace(
'                    {String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)}',
'                    {String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)} {(() => { const endYmd = String(a.endDate || "").slice(0,10); const left = daysLeftYmd(endYmd); return Number.isFinite(left) ? ` (kalan ${left}g)` : ""; })()}'
  )
}

# Insert summary cell after Dir/Pat td in rows
$dirTd = '                    {String(a.direction || "INBOUND")}/{String(a.pattern || "ONE_WAY")}'
if (-not $raw.Contains('ShiftSummary st={shiftStats?.[a.id]}')) {
  $raw = $raw.Replace(
'                  <td className="muted">' + "`n" + '                    {String(a.direction || "INBOUND")}/{String(a.pattern || "ONE_WAY")}' + "`n" + '                  </td>',
'                  <td className="muted">' + "`n" + '                    {String(a.direction || "INBOUND")}/{String(a.pattern || "ONE_WAY")}' + "`n" + '                  </td>' + "`n" + '                  <td><ShiftSummary st={shiftStats?.[a.id]} /></td>'
  )
}

# Add time-based note
if ($raw -notmatch 'Agreement status time-based') {
  $raw = $raw.Replace('Pending onay (REQUESTED) + Uzatma talepleri burada.', 'Pending onay (REQUESTED) + Uzatma talepleri burada. Agreement status time-based: ACTIVE/DONE, endDate+endMin zamanına göre değişir.')
}

WriteText $roomFile $raw
Write-Host "✅ Patched: $roomFile" -ForegroundColor Green

Write-Host ""
Write-Host "DONE ✅  Now run: .\tools\pack.ps1 -To 41" -ForegroundColor Cyan
