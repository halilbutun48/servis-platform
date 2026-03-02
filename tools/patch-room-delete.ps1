param(
  [string]$RepoRoot = (Get-Location).Path
)

$roomsPath = Join-Path $RepoRoot "backend\src\routes\rooms.js"
if (!(Test-Path $roomsPath)) {
  Write-Host "rooms.js not found at $roomsPath" -ForegroundColor Yellow
  exit 1
}

$src = Get-Content $roomsPath -Raw -Encoding UTF8
if ($src -match 'r\.delete\(\s*["'']\/:id["'']') {
  Write-Host "rooms.js already has DELETE /:id route. No change." -ForegroundColor Green
  exit 0
}

# Insert a SUPER_ADMIN soft-delete route before "return r;" in roomsRouter.
$insert = @'
  // SOFT DELETE (SUPER_ADMIN only)
  r.delete("/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const item0 = await prisma.room.findUnique({ where: { id } });
    if (!item0 || item0.status === "DELETED") return res.status(404).json({ error: "Room not found" });

    const item = await prisma.room.update({ where: { id }, data: { status: "DELETED" } });
    return res.json(item);
  });

'@

if ($src -notmatch 'return r;\s*\n\}') {
  Write-Host "Could not find insertion point (return r;). Please patch manually." -ForegroundColor Red
  exit 2
}

$src2 = $src -replace 'return r;\s*\n\}', ($insert + "  return r;`n}")
Set-Content $roomsPath $src2 -Encoding UTF8
Write-Host "Patched: added DELETE /api/rooms/:id soft delete route." -ForegroundColor Green
