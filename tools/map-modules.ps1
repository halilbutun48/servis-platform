param([switch]$VerboseOut)

$ErrorActionPreference="Stop"
$Repo = (Get-Location).Path
$Artifacts = Join-Path $Repo "artifacts"
New-Item -ItemType Directory -Force $Artifacts | Out-Null

function NowTs(){ Get-Date -Format "yyyyMMdd_HHmmss" }
$OutDir = Join-Path $Artifacts ("map_modules_" + (NowTs))
New-Item -ItemType Directory -Force $OutDir | Out-Null

function WriteUtf8NoBom([string]$path,[string]$text){
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path,$text,$enc)
}

$Backend = Join-Path $Repo "backend"
if(-not (Test-Path $Backend)){ throw "backend klasor yok: $Backend" }
# --- 1) backend tree ---
try {
  cmd /c "tree `"$Backend`" /F /A" | Out-File (Join-Path $OutDir "backend_tree.txt") -Encoding utf8
} catch {
  "tree failed: $($_.Exception.Message)" | Out-File (Join-Path $OutDir "backend_tree.txt") -Encoding utf8
}

# --- 2) server mounts ---
$serverCandidates = @(
  ".\backend\server.js",
  ".\backend\src\server.js",
  ".\backend\app.js",
  ".\backend\src\app.js"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if($serverCandidates){
  $serverPath = (Resolve-Path $serverCandidates).Path
  $src = Get-Content -Raw $serverPath
  $mounts = Select-String -Path $serverPath -Pattern 'app\.use\(' -AllMatches |
    ForEach-Object { $_.Line.Trim() }
  WriteUtf8NoBom (Join-Path $OutDir "server_path.txt") $serverPath
  WriteUtf8NoBom (Join-Path $OutDir "server_mounts.txt") (($mounts -join "`r`n") + "`r`n")
} else {
  WriteUtf8NoBom (Join-Path $OutDir "server_path.txt") "NOT FOUND"
  WriteUtf8NoBom (Join-Path $OutDir "server_mounts.txt") "NOT FOUND"
}

# --- 3) list routes ---
$routeDir = Join-Path $Backend "routes"
if(Test-Path $routeDir){
  Get-ChildItem $routeDir -Recurse -File -Include *.js,*.cjs,*.mjs,*.ts |
    Select-Object FullName,Length,LastWriteTime |
    Sort-Object FullName |
    Export-Csv (Join-Path $OutDir "routes_list.csv") -NoTypeInformation -Encoding utf8
} else {
  WriteUtf8NoBom (Join-Path $OutDir "routes_list.csv") "routes dir not found"
}

# --- 4) keyword map per module (heuristic, PS5 safe) ---
$files = Get-ChildItem $Backend -Recurse -File -Include *.js,*.cjs,*.mjs,*.ts -ErrorAction SilentlyContinue | Where-Object { param([switch]$VerboseOut)

$ErrorActionPreference="Stop"
$Repo = (Get-Location).Path
$Artifacts = Join-Path $Repo "artifacts"
New-Item -ItemType Directory -Force $Artifacts | Out-Null

function NowTs(){ Get-Date -Format "yyyyMMdd_HHmmss" }
$OutDir = Join-Path $Artifacts ("map_modules_" + (NowTs))
New-Item -ItemType Directory -Force $OutDir | Out-Null

function WriteUtf8NoBom([string]$path,[string]$text){
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path,$text,$enc)
}

$Backend = Join-Path $Repo "backend"
if(-not (Test-Path $Backend)){ throw "backend klasor yok: $Backend" }
# --- 1) backend tree ---
try {
  cmd /c "tree `"$Backend`" /F /A" | Out-File (Join-Path $OutDir "backend_tree.txt") -Encoding utf8
} catch {
  "tree failed: $($_.Exception.Message)" | Out-File (Join-Path $OutDir "backend_tree.txt") -Encoding utf8
}

# --- 2) server mounts ---
$serverCandidates = @(
  ".\backend\server.js",
  ".\backend\src\server.js",
  ".\backend\app.js",
  ".\backend\src\app.js"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if($serverCandidates){
  $serverPath = (Resolve-Path $serverCandidates).Path
  $src = Get-Content -Raw $serverPath
  $mounts = Select-String -Path $serverPath -Pattern 'app\.use\(' -AllMatches |
    ForEach-Object { $_.Line.Trim() }
  WriteUtf8NoBom (Join-Path $OutDir "server_path.txt") $serverPath
  WriteUtf8NoBom (Join-Path $OutDir "server_mounts.txt") (($mounts -join "`r`n") + "`r`n")
} else {
  WriteUtf8NoBom (Join-Path $OutDir "server_path.txt") "NOT FOUND"
  WriteUtf8NoBom (Join-Path $OutDir "server_mounts.txt") "NOT FOUND"
}

# --- 3) list routes ---
$routeDir = Join-Path $Backend "routes"
if(Test-Path $routeDir){
  Get-ChildItem $routeDir -Recurse -File -Include *.js,*.cjs,*.mjs,*.ts |
    Select-Object FullName,Length,LastWriteTime |
    Sort-Object FullName |
    Export-Csv (Join-Path $OutDir "routes_list.csv") -NoTypeInformation -Encoding utf8
} else {
  WriteUtf8NoBom (Join-Path $OutDir "routes_list.csv") "routes dir not found"
}

# --- 4) keyword map per module (heuristic, PS5 safe) ---
$files = Get-ChildItem $Backend -Recurse -File -Include *.js,*.cjs,*.mjs,*.ts -ErrorAction SilentlyContinue | Where-Object { param([switch]$VerboseOut)

$ErrorActionPreference="Stop"
$Repo = (Get-Location).Path
$Artifacts = Join-Path $Repo "artifacts"
New-Item -ItemType Directory -Force $Artifacts | Out-Null

function NowTs(){ Get-Date -Format "yyyyMMdd_HHmmss" }
$OutDir = Join-Path $Artifacts ("map_modules_" + (NowTs))
New-Item -ItemType Directory -Force $OutDir | Out-Null

function WriteUtf8NoBom([string]$path,[string]$text){
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path,$text,$enc)
}

$Backend = Join-Path $Repo "backend"
if(-not (Test-Path $Backend)){ throw "backend klasor yok: $Backend" }
# --- 1) backend tree ---
try {
  cmd /c "tree `"$Backend`" /F /A" | Out-File (Join-Path $OutDir "backend_tree.txt") -Encoding utf8
} catch {
  "tree failed: $($_.Exception.Message)" | Out-File (Join-Path $OutDir "backend_tree.txt") -Encoding utf8
}

# --- 2) server mounts ---
$serverCandidates = @(
  ".\backend\server.js",
  ".\backend\src\server.js",
  ".\backend\app.js",
  ".\backend\src\app.js"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if($serverCandidates){
  $serverPath = (Resolve-Path $serverCandidates).Path
  $src = Get-Content -Raw $serverPath
  $mounts = Select-String -Path $serverPath -Pattern 'app\.use\(' -AllMatches |
    ForEach-Object { $_.Line.Trim() }
  WriteUtf8NoBom (Join-Path $OutDir "server_path.txt") $serverPath
  WriteUtf8NoBom (Join-Path $OutDir "server_mounts.txt") (($mounts -join "`r`n") + "`r`n")
} else {
  WriteUtf8NoBom (Join-Path $OutDir "server_path.txt") "NOT FOUND"
  WriteUtf8NoBom (Join-Path $OutDir "server_mounts.txt") "NOT FOUND"
}

# --- 3) list routes ---
$routeDir = Join-Path $Backend "routes"
if(Test-Path $routeDir){
  Get-ChildItem $routeDir -Recurse -File -Include *.js,*.cjs,*.mjs,*.ts |
    Select-Object FullName,Length,LastWriteTime |
    Sort-Object FullName |
    Export-Csv (Join-Path $OutDir "routes_list.csv") -NoTypeInformation -Encoding utf8
} else {
  WriteUtf8NoBom (Join-Path $OutDir "routes_list.csv") "routes dir not found"
}

# --- 4) keyword map per module (heuristic, PS5 safe) ---
$files = Get-ChildItem $Backend -Recurse -File -Include *.js,*.cjs,*.mjs,*.ts -ErrorAction SilentlyContinue

$modulePatterns = @(
  @{ Name="auth"; Keys=@("jsonwebtoken","JWT","x-auth-token","/api/me","login","roles","RBAC","gen-token","auth") },
  @{ Name="gps"; Keys=@("/api/gps","gps:update","GpsLog","vehicle","lat","lon","speed","heading","gps") },
  @{ Name="ws"; Keys=@("socket.io","io.on","io.emit","join","room","attendance:update","gps:update","redis","ws") },
  @{ Name="notifications"; Keys=@("notify:new","notify","notification","sms","push") },
  @{ Name="attendance"; Keys=@("/api/attendance","attendance/event","attendance/qr","qr-credential","AttendanceEvent") },
  @{ Name="events"; Keys=@("/api/events","events/me","router.get(") },
  @{ Name="audit"; Keys=@("audit","api_requests","audit_log","morgan","PingLog") },
  @{ Name="requests"; Keys=@("/api/requests","request","pickup") }
)

$all = @()

foreach($mp in $modulePatterns){
  $name = $mp.Name
  $keys = $mp.Keys

  foreach($k in $keys){
    $hits = $files | Select-String -Pattern $k -SimpleMatch -ErrorAction SilentlyContinue
    foreach($h in $hits){
      $all += [pscustomobject]@{
        Module = $name
        Key    = $k
        Path   = $h.Path
        Line   = $h.LineNumber
        Text   = ($h.Line.Trim())
      }
    }
  }
}

if($all.Count -gt 0){
  $all | Export-Csv (Join-Path $OutDir "hits_raw.csv") -NoTypeInformation -Encoding utf8

  # file summary
  $fileSummary = $all |
    Group-Object Module,Path |
    ForEach-Object {
      $parts = $_.Name.Split(",")
      [pscustomobject]@{
        Module = $parts[0].Trim()
        Path   = $parts[1].Trim()
        Hits   = $_.Count
      }
    } | Sort-Object Module, @{Expression="Hits";Descending=$true}, Path

  $fileSummary | Export-Csv (Join-Path $OutDir "hits_by_file.csv") -NoTypeInformation -Encoding utf8

  # top files per module
  $md = @()
  $md += "# Module Map (heuristic)"
  $md += ""
  $md += ("Time: " + (Get-Date))
  $md += ("Repo: " + $Repo)
  $md += ("OutDir: " + $OutDir)
  $md += ""
  foreach($m in ($fileSummary | Select-Object -ExpandProperty Module -Unique)){
    $md += ("## " + $m)
    $top = $fileSummary | Where-Object { $_.Module -eq $m } | Select-Object -First 15
    foreach($t in $top){
      $md += ("- " + $t.Hits + " :: " + $t.Path)
    }
    $md += ""
  }
  WriteUtf8NoBom (Join-Path $OutDir "report.md") ($md -join "`r`n")
} else {
  WriteUtf8NoBom (Join-Path $OutDir "hits_raw.csv") "NO HITS"
  WriteUtf8NoBom (Join-Path $OutDir "hits_by_file.csv") "NO HITS"
  WriteUtf8NoBom (Join-Path $OutDir "report.md") "# Module Map`r`n`r`nNo hits found."
}

Write-Host ""
Write-Host ("MAP DIR => " + $OutDir) -ForegroundColor Cyan
Write-Host ("Send me: " + (Join-Path $OutDir "report.md")) -ForegroundColor Yellow.FullName -notmatch '\\node_modules\\|\\dist\\|\\build\\|\\\.next\\|\\coverage\\|\\artifacts\\' }

$modulePatterns = @(
  @{ Name="auth"; Keys=@("jsonwebtoken","JWT","x-auth-token","/api/me","login","roles","RBAC","gen-token","auth") },
  @{ Name="gps"; Keys=@("/api/gps","gps:update","GpsLog","vehicle","lat","lon","speed","heading","gps") },
  @{ Name="ws"; Keys=@("socket.io","io.on","io.emit","join","room","attendance:update","gps:update","redis","ws") },
  @{ Name="notifications"; Keys=@("notify:new","notify","notification","sms","push") },
  @{ Name="attendance"; Keys=@("/api/attendance","attendance/event","attendance/qr","qr-credential","AttendanceEvent") },
  @{ Name="events"; Keys=@("/api/events","events/me","router.get(") },
  @{ Name="audit"; Keys=@("audit","api_requests","audit_log","morgan","PingLog") },
  @{ Name="requests"; Keys=@("/api/requests","request","pickup") }
)

$all = @()

foreach($mp in $modulePatterns){
  $name = $mp.Name
  $keys = $mp.Keys

  foreach($k in $keys){
    $hits = $files | Select-String -Pattern $k -SimpleMatch -ErrorAction SilentlyContinue
    foreach($h in $hits){
      $all += [pscustomobject]@{
        Module = $name
        Key    = $k
        Path   = $h.Path
        Line   = $h.LineNumber
        Text   = ($h.Line.Trim())
      }
    }
  }
}

if($all.Count -gt 0){
  $all | Export-Csv (Join-Path $OutDir "hits_raw.csv") -NoTypeInformation -Encoding utf8

  # file summary
  $fileSummary = $all |
    Group-Object Module,Path |
    ForEach-Object {
      $parts = $_.Name.Split(",")
      [pscustomobject]@{
        Module = $parts[0].Trim()
        Path   = $parts[1].Trim()
        Hits   = $_.Count
      }
    } | Sort-Object Module, @{Expression="Hits";Descending=$true}, Path

  $fileSummary | Export-Csv (Join-Path $OutDir "hits_by_file.csv") -NoTypeInformation -Encoding utf8

  # top files per module
  $md = @()
  $md += "# Module Map (heuristic)"
  $md += ""
  $md += ("Time: " + (Get-Date))
  $md += ("Repo: " + $Repo)
  $md += ("OutDir: " + $OutDir)
  $md += ""
  foreach($m in ($fileSummary | Select-Object -ExpandProperty Module -Unique)){
    $md += ("## " + $m)
    $top = $fileSummary | Where-Object { $_.Module -eq $m } | Select-Object -First 15
    foreach($t in $top){
      $md += ("- " + $t.Hits + " :: " + $t.Path)
    }
    $md += ""
  }
  WriteUtf8NoBom (Join-Path $OutDir "report.md") ($md -join "`r`n")
} else {
  WriteUtf8NoBom (Join-Path $OutDir "hits_raw.csv") "NO HITS"
  WriteUtf8NoBom (Join-Path $OutDir "hits_by_file.csv") "NO HITS"
  WriteUtf8NoBom (Join-Path $OutDir "report.md") "# Module Map`r`n`r`nNo hits found."
}

Write-Host ""
Write-Host ("MAP DIR => " + $OutDir) -ForegroundColor Cyan
Write-Host ("Send me: " + (Join-Path $OutDir "report.md")) -ForegroundColor Yellow.FullName -notmatch '\\node_modules\\|\\dist\\|\\build\\|\\\.next\\|\\coverage\\|\\artifacts\\' } | Where-Object { param([switch]$VerboseOut)

$ErrorActionPreference="Stop"
$Repo = (Get-Location).Path
$Artifacts = Join-Path $Repo "artifacts"
New-Item -ItemType Directory -Force $Artifacts | Out-Null

function NowTs(){ Get-Date -Format "yyyyMMdd_HHmmss" }
$OutDir = Join-Path $Artifacts ("map_modules_" + (NowTs))
New-Item -ItemType Directory -Force $OutDir | Out-Null

function WriteUtf8NoBom([string]$path,[string]$text){
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path,$text,$enc)
}

$Backend = Join-Path $Repo "backend"
if(-not (Test-Path $Backend)){ throw "backend klasor yok: $Backend" }
# --- 1) backend tree ---
try {
  cmd /c "tree `"$Backend`" /F /A" | Out-File (Join-Path $OutDir "backend_tree.txt") -Encoding utf8
} catch {
  "tree failed: $($_.Exception.Message)" | Out-File (Join-Path $OutDir "backend_tree.txt") -Encoding utf8
}

# --- 2) server mounts ---
$serverCandidates = @(
  ".\backend\server.js",
  ".\backend\src\server.js",
  ".\backend\app.js",
  ".\backend\src\app.js"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if($serverCandidates){
  $serverPath = (Resolve-Path $serverCandidates).Path
  $src = Get-Content -Raw $serverPath
  $mounts = Select-String -Path $serverPath -Pattern 'app\.use\(' -AllMatches |
    ForEach-Object { $_.Line.Trim() }
  WriteUtf8NoBom (Join-Path $OutDir "server_path.txt") $serverPath
  WriteUtf8NoBom (Join-Path $OutDir "server_mounts.txt") (($mounts -join "`r`n") + "`r`n")
} else {
  WriteUtf8NoBom (Join-Path $OutDir "server_path.txt") "NOT FOUND"
  WriteUtf8NoBom (Join-Path $OutDir "server_mounts.txt") "NOT FOUND"
}

# --- 3) list routes ---
$routeDir = Join-Path $Backend "routes"
if(Test-Path $routeDir){
  Get-ChildItem $routeDir -Recurse -File -Include *.js,*.cjs,*.mjs,*.ts |
    Select-Object FullName,Length,LastWriteTime |
    Sort-Object FullName |
    Export-Csv (Join-Path $OutDir "routes_list.csv") -NoTypeInformation -Encoding utf8
} else {
  WriteUtf8NoBom (Join-Path $OutDir "routes_list.csv") "routes dir not found"
}

# --- 4) keyword map per module (heuristic, PS5 safe) ---
$files = Get-ChildItem $Backend -Recurse -File -Include *.js,*.cjs,*.mjs,*.ts -ErrorAction SilentlyContinue | Where-Object { param([switch]$VerboseOut)

$ErrorActionPreference="Stop"
$Repo = (Get-Location).Path
$Artifacts = Join-Path $Repo "artifacts"
New-Item -ItemType Directory -Force $Artifacts | Out-Null

function NowTs(){ Get-Date -Format "yyyyMMdd_HHmmss" }
$OutDir = Join-Path $Artifacts ("map_modules_" + (NowTs))
New-Item -ItemType Directory -Force $OutDir | Out-Null

function WriteUtf8NoBom([string]$path,[string]$text){
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path,$text,$enc)
}

$Backend = Join-Path $Repo "backend"
if(-not (Test-Path $Backend)){ throw "backend klasor yok: $Backend" }
# --- 1) backend tree ---
try {
  cmd /c "tree `"$Backend`" /F /A" | Out-File (Join-Path $OutDir "backend_tree.txt") -Encoding utf8
} catch {
  "tree failed: $($_.Exception.Message)" | Out-File (Join-Path $OutDir "backend_tree.txt") -Encoding utf8
}

# --- 2) server mounts ---
$serverCandidates = @(
  ".\backend\server.js",
  ".\backend\src\server.js",
  ".\backend\app.js",
  ".\backend\src\app.js"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if($serverCandidates){
  $serverPath = (Resolve-Path $serverCandidates).Path
  $src = Get-Content -Raw $serverPath
  $mounts = Select-String -Path $serverPath -Pattern 'app\.use\(' -AllMatches |
    ForEach-Object { $_.Line.Trim() }
  WriteUtf8NoBom (Join-Path $OutDir "server_path.txt") $serverPath
  WriteUtf8NoBom (Join-Path $OutDir "server_mounts.txt") (($mounts -join "`r`n") + "`r`n")
} else {
  WriteUtf8NoBom (Join-Path $OutDir "server_path.txt") "NOT FOUND"
  WriteUtf8NoBom (Join-Path $OutDir "server_mounts.txt") "NOT FOUND"
}

# --- 3) list routes ---
$routeDir = Join-Path $Backend "routes"
if(Test-Path $routeDir){
  Get-ChildItem $routeDir -Recurse -File -Include *.js,*.cjs,*.mjs,*.ts |
    Select-Object FullName,Length,LastWriteTime |
    Sort-Object FullName |
    Export-Csv (Join-Path $OutDir "routes_list.csv") -NoTypeInformation -Encoding utf8
} else {
  WriteUtf8NoBom (Join-Path $OutDir "routes_list.csv") "routes dir not found"
}

# --- 4) keyword map per module (heuristic, PS5 safe) ---
$files = Get-ChildItem $Backend -Recurse -File -Include *.js,*.cjs,*.mjs,*.ts -ErrorAction SilentlyContinue | Where-Object { param([switch]$VerboseOut)

$ErrorActionPreference="Stop"
$Repo = (Get-Location).Path
$Artifacts = Join-Path $Repo "artifacts"
New-Item -ItemType Directory -Force $Artifacts | Out-Null

function NowTs(){ Get-Date -Format "yyyyMMdd_HHmmss" }
$OutDir = Join-Path $Artifacts ("map_modules_" + (NowTs))
New-Item -ItemType Directory -Force $OutDir | Out-Null

function WriteUtf8NoBom([string]$path,[string]$text){
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path,$text,$enc)
}

$Backend = Join-Path $Repo "backend"
if(-not (Test-Path $Backend)){ throw "backend klasor yok: $Backend" }
# --- 1) backend tree ---
try {
  cmd /c "tree `"$Backend`" /F /A" | Out-File (Join-Path $OutDir "backend_tree.txt") -Encoding utf8
} catch {
  "tree failed: $($_.Exception.Message)" | Out-File (Join-Path $OutDir "backend_tree.txt") -Encoding utf8
}

# --- 2) server mounts ---
$serverCandidates = @(
  ".\backend\server.js",
  ".\backend\src\server.js",
  ".\backend\app.js",
  ".\backend\src\app.js"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if($serverCandidates){
  $serverPath = (Resolve-Path $serverCandidates).Path
  $src = Get-Content -Raw $serverPath
  $mounts = Select-String -Path $serverPath -Pattern 'app\.use\(' -AllMatches |
    ForEach-Object { $_.Line.Trim() }
  WriteUtf8NoBom (Join-Path $OutDir "server_path.txt") $serverPath
  WriteUtf8NoBom (Join-Path $OutDir "server_mounts.txt") (($mounts -join "`r`n") + "`r`n")
} else {
  WriteUtf8NoBom (Join-Path $OutDir "server_path.txt") "NOT FOUND"
  WriteUtf8NoBom (Join-Path $OutDir "server_mounts.txt") "NOT FOUND"
}

# --- 3) list routes ---
$routeDir = Join-Path $Backend "routes"
if(Test-Path $routeDir){
  Get-ChildItem $routeDir -Recurse -File -Include *.js,*.cjs,*.mjs,*.ts |
    Select-Object FullName,Length,LastWriteTime |
    Sort-Object FullName |
    Export-Csv (Join-Path $OutDir "routes_list.csv") -NoTypeInformation -Encoding utf8
} else {
  WriteUtf8NoBom (Join-Path $OutDir "routes_list.csv") "routes dir not found"
}

# --- 4) keyword map per module (heuristic, PS5 safe) ---
$files = Get-ChildItem $Backend -Recurse -File -Include *.js,*.cjs,*.mjs,*.ts -ErrorAction SilentlyContinue

$modulePatterns = @(
  @{ Name="auth"; Keys=@("jsonwebtoken","JWT","x-auth-token","/api/me","login","roles","RBAC","gen-token","auth") },
  @{ Name="gps"; Keys=@("/api/gps","gps:update","GpsLog","vehicle","lat","lon","speed","heading","gps") },
  @{ Name="ws"; Keys=@("socket.io","io.on","io.emit","join","room","attendance:update","gps:update","redis","ws") },
  @{ Name="notifications"; Keys=@("notify:new","notify","notification","sms","push") },
  @{ Name="attendance"; Keys=@("/api/attendance","attendance/event","attendance/qr","qr-credential","AttendanceEvent") },
  @{ Name="events"; Keys=@("/api/events","events/me","router.get(") },
  @{ Name="audit"; Keys=@("audit","api_requests","audit_log","morgan","PingLog") },
  @{ Name="requests"; Keys=@("/api/requests","request","pickup") }
)

$all = @()

foreach($mp in $modulePatterns){
  $name = $mp.Name
  $keys = $mp.Keys

  foreach($k in $keys){
    $hits = $files | Select-String -Pattern $k -SimpleMatch -ErrorAction SilentlyContinue
    foreach($h in $hits){
      $all += [pscustomobject]@{
        Module = $name
        Key    = $k
        Path   = $h.Path
        Line   = $h.LineNumber
        Text   = ($h.Line.Trim())
      }
    }
  }
}

if($all.Count -gt 0){
  $all | Export-Csv (Join-Path $OutDir "hits_raw.csv") -NoTypeInformation -Encoding utf8

  # file summary
  $fileSummary = $all |
    Group-Object Module,Path |
    ForEach-Object {
      $parts = $_.Name.Split(",")
      [pscustomobject]@{
        Module = $parts[0].Trim()
        Path   = $parts[1].Trim()
        Hits   = $_.Count
      }
    } | Sort-Object Module, @{Expression="Hits";Descending=$true}, Path

  $fileSummary | Export-Csv (Join-Path $OutDir "hits_by_file.csv") -NoTypeInformation -Encoding utf8

  # top files per module
  $md = @()
  $md += "# Module Map (heuristic)"
  $md += ""
  $md += ("Time: " + (Get-Date))
  $md += ("Repo: " + $Repo)
  $md += ("OutDir: " + $OutDir)
  $md += ""
  foreach($m in ($fileSummary | Select-Object -ExpandProperty Module -Unique)){
    $md += ("## " + $m)
    $top = $fileSummary | Where-Object { $_.Module -eq $m } | Select-Object -First 15
    foreach($t in $top){
      $md += ("- " + $t.Hits + " :: " + $t.Path)
    }
    $md += ""
  }
  WriteUtf8NoBom (Join-Path $OutDir "report.md") ($md -join "`r`n")
} else {
  WriteUtf8NoBom (Join-Path $OutDir "hits_raw.csv") "NO HITS"
  WriteUtf8NoBom (Join-Path $OutDir "hits_by_file.csv") "NO HITS"
  WriteUtf8NoBom (Join-Path $OutDir "report.md") "# Module Map`r`n`r`nNo hits found."
}

Write-Host ""
Write-Host ("MAP DIR => " + $OutDir) -ForegroundColor Cyan
Write-Host ("Send me: " + (Join-Path $OutDir "report.md")) -ForegroundColor Yellow.FullName -notmatch '\\node_modules\\|\\dist\\|\\build\\|\\\.next\\|\\coverage\\|\\artifacts\\' }

$modulePatterns = @(
  @{ Name="auth"; Keys=@("jsonwebtoken","JWT","x-auth-token","/api/me","login","roles","RBAC","gen-token","auth") },
  @{ Name="gps"; Keys=@("/api/gps","gps:update","GpsLog","vehicle","lat","lon","speed","heading","gps") },
  @{ Name="ws"; Keys=@("socket.io","io.on","io.emit","join","room","attendance:update","gps:update","redis","ws") },
  @{ Name="notifications"; Keys=@("notify:new","notify","notification","sms","push") },
  @{ Name="attendance"; Keys=@("/api/attendance","attendance/event","attendance/qr","qr-credential","AttendanceEvent") },
  @{ Name="events"; Keys=@("/api/events","events/me","router.get(") },
  @{ Name="audit"; Keys=@("audit","api_requests","audit_log","morgan","PingLog") },
  @{ Name="requests"; Keys=@("/api/requests","request","pickup") }
)

$all = @()

foreach($mp in $modulePatterns){
  $name = $mp.Name
  $keys = $mp.Keys

  foreach($k in $keys){
    $hits = $files | Select-String -Pattern $k -SimpleMatch -ErrorAction SilentlyContinue
    foreach($h in $hits){
      $all += [pscustomobject]@{
        Module = $name
        Key    = $k
        Path   = $h.Path
        Line   = $h.LineNumber
        Text   = ($h.Line.Trim())
      }
    }
  }
}

if($all.Count -gt 0){
  $all | Export-Csv (Join-Path $OutDir "hits_raw.csv") -NoTypeInformation -Encoding utf8

  # file summary
  $fileSummary = $all |
    Group-Object Module,Path |
    ForEach-Object {
      $parts = $_.Name.Split(",")
      [pscustomobject]@{
        Module = $parts[0].Trim()
        Path   = $parts[1].Trim()
        Hits   = $_.Count
      }
    } | Sort-Object Module, @{Expression="Hits";Descending=$true}, Path

  $fileSummary | Export-Csv (Join-Path $OutDir "hits_by_file.csv") -NoTypeInformation -Encoding utf8

  # top files per module
  $md = @()
  $md += "# Module Map (heuristic)"
  $md += ""
  $md += ("Time: " + (Get-Date))
  $md += ("Repo: " + $Repo)
  $md += ("OutDir: " + $OutDir)
  $md += ""
  foreach($m in ($fileSummary | Select-Object -ExpandProperty Module -Unique)){
    $md += ("## " + $m)
    $top = $fileSummary | Where-Object { $_.Module -eq $m } | Select-Object -First 15
    foreach($t in $top){
      $md += ("- " + $t.Hits + " :: " + $t.Path)
    }
    $md += ""
  }
  WriteUtf8NoBom (Join-Path $OutDir "report.md") ($md -join "`r`n")
} else {
  WriteUtf8NoBom (Join-Path $OutDir "hits_raw.csv") "NO HITS"
  WriteUtf8NoBom (Join-Path $OutDir "hits_by_file.csv") "NO HITS"
  WriteUtf8NoBom (Join-Path $OutDir "report.md") "# Module Map`r`n`r`nNo hits found."
}

Write-Host ""
Write-Host ("MAP DIR => " + $OutDir) -ForegroundColor Cyan
Write-Host ("Send me: " + (Join-Path $OutDir "report.md")) -ForegroundColor Yellow.FullName -notmatch '\\node_modules\\|\\dist\\|\\build\\|\\\.next\\|\\coverage\\|\\artifacts\\' }

$modulePatterns = @(
  @{ Name="auth"; Keys=@("jsonwebtoken","JWT","x-auth-token","/api/me","login","roles","RBAC","gen-token","auth") },
  @{ Name="gps"; Keys=@("/api/gps","gps:update","GpsLog","vehicle","lat","lon","speed","heading","gps") },
  @{ Name="ws"; Keys=@("socket.io","io.on","io.emit","join","room","attendance:update","gps:update","redis","ws") },
  @{ Name="notifications"; Keys=@("notify:new","notify","notification","sms","push") },
  @{ Name="attendance"; Keys=@("/api/attendance","attendance/event","attendance/qr","qr-credential","AttendanceEvent") },
  @{ Name="events"; Keys=@("/api/events","events/me","router.get(") },
  @{ Name="audit"; Keys=@("audit","api_requests","audit_log","morgan","PingLog") },
  @{ Name="requests"; Keys=@("/api/requests","request","pickup") }
)

$all = @()

foreach($mp in $modulePatterns){
  $name = $mp.Name
  $keys = $mp.Keys

  foreach($k in $keys){
    $hits = $files | Select-String -Pattern $k -SimpleMatch -ErrorAction SilentlyContinue
    foreach($h in $hits){
      $all += [pscustomobject]@{
        Module = $name
        Key    = $k
        Path   = $h.Path
        Line   = $h.LineNumber
        Text   = ($h.Line.Trim())
      }
    }
  }
}

if($all.Count -gt 0){
  $all | Export-Csv (Join-Path $OutDir "hits_raw.csv") -NoTypeInformation -Encoding utf8

  # file summary
  $fileSummary = $all |
    Group-Object Module,Path |
    ForEach-Object {
      $parts = $_.Name.Split(",")
      [pscustomobject]@{
        Module = $parts[0].Trim()
        Path   = $parts[1].Trim()
        Hits   = $_.Count
      }
    } | Sort-Object Module, @{Expression="Hits";Descending=$true}, Path

  $fileSummary | Export-Csv (Join-Path $OutDir "hits_by_file.csv") -NoTypeInformation -Encoding utf8

  # top files per module
  $md = @()
  $md += "# Module Map (heuristic)"
  $md += ""
  $md += ("Time: " + (Get-Date))
  $md += ("Repo: " + $Repo)
  $md += ("OutDir: " + $OutDir)
  $md += ""
  foreach($m in ($fileSummary | Select-Object -ExpandProperty Module -Unique)){
    $md += ("## " + $m)
    $top = $fileSummary | Where-Object { $_.Module -eq $m } | Select-Object -First 15
    foreach($t in $top){
      $md += ("- " + $t.Hits + " :: " + $t.Path)
    }
    $md += ""
  }
  WriteUtf8NoBom (Join-Path $OutDir "report.md") ($md -join "`r`n")
} else {
  WriteUtf8NoBom (Join-Path $OutDir "hits_raw.csv") "NO HITS"
  WriteUtf8NoBom (Join-Path $OutDir "hits_by_file.csv") "NO HITS"
  WriteUtf8NoBom (Join-Path $OutDir "report.md") "# Module Map`r`n`r`nNo hits found."
}

Write-Host ""
Write-Host ("MAP DIR => " + $OutDir) -ForegroundColor Cyan
Write-Host ("Send me: " + (Join-Path $OutDir "report.md")) -ForegroundColor Yellow.FullName -notmatch '\\node_modules\\|\\dist\\|\\build\\|\\\.next\\|\\coverage\\|\\artifacts\\' }

$modulePatterns = @(
  @{ Name="auth"; Keys=@("jsonwebtoken","JWT","x-auth-token","/api/me","login","roles","RBAC","gen-token","auth") },
  @{ Name="gps"; Keys=@("/api/gps","gps:update","GpsLog","vehicle","lat","lon","speed","heading","gps") },
  @{ Name="ws"; Keys=@("socket.io","io.on","io.emit","join","room","attendance:update","gps:update","redis","ws") },
  @{ Name="notifications"; Keys=@("notify:new","notify","notification","sms","push") },
  @{ Name="attendance"; Keys=@("/api/attendance","attendance/event","attendance/qr","qr-credential","AttendanceEvent") },
  @{ Name="events"; Keys=@("/api/events","events/me","router.get(") },
  @{ Name="audit"; Keys=@("audit","api_requests","audit_log","morgan","PingLog") },
  @{ Name="requests"; Keys=@("/api/requests","request","pickup") }
)

$all = @()

foreach($mp in $modulePatterns){
  $name = $mp.Name
  $keys = $mp.Keys

  foreach($k in $keys){
    $hits = $files | Select-String -Pattern $k -SimpleMatch -ErrorAction SilentlyContinue
    foreach($h in $hits){
      $all += [pscustomobject]@{
        Module = $name
        Key    = $k
        Path   = $h.Path
        Line   = $h.LineNumber
        Text   = ($h.Line.Trim())
      }
    }
  }
}

if($all.Count -gt 0){
  $all | Export-Csv (Join-Path $OutDir "hits_raw.csv") -NoTypeInformation -Encoding utf8

  # file summary
  $fileSummary = $all |
    Group-Object Module,Path |
    ForEach-Object {
      $parts = $_.Name.Split(",")
      [pscustomobject]@{
        Module = $parts[0].Trim()
        Path   = $parts[1].Trim()
        Hits   = $_.Count
      }
    } | Sort-Object Module, @{Expression="Hits";Descending=$true}, Path

  $fileSummary | Export-Csv (Join-Path $OutDir "hits_by_file.csv") -NoTypeInformation -Encoding utf8

  # top files per module
  $md = @()
  $md += "# Module Map (heuristic)"
  $md += ""
  $md += ("Time: " + (Get-Date))
  $md += ("Repo: " + $Repo)
  $md += ("OutDir: " + $OutDir)
  $md += ""
  foreach($m in ($fileSummary | Select-Object -ExpandProperty Module -Unique)){
    $md += ("## " + $m)
    $top = $fileSummary | Where-Object { $_.Module -eq $m } | Select-Object -First 15
    foreach($t in $top){
      $md += ("- " + $t.Hits + " :: " + $t.Path)
    }
    $md += ""
  }
  WriteUtf8NoBom (Join-Path $OutDir "report.md") ($md -join "`r`n")
} else {
  WriteUtf8NoBom (Join-Path $OutDir "hits_raw.csv") "NO HITS"
  WriteUtf8NoBom (Join-Path $OutDir "hits_by_file.csv") "NO HITS"
  WriteUtf8NoBom (Join-Path $OutDir "report.md") "# Module Map`r`n`r`nNo hits found."
}

Write-Host ""
Write-Host ("MAP DIR => " + $OutDir) -ForegroundColor Cyan
Write-Host ("Send me: " + (Join-Path $OutDir "report.md")) -ForegroundColor Yellow