# tools/overlay_fix_m41_device_binding.ps1
# Fix M41CHECK regression: enforce Driver device binding + ensure RATE_LIMIT_STORE=redis + add /api/auth/refresh.
# Idempotent patch (safe to re-run).
$ErrorActionPreference = "Stop"

function ReadText($p) { [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function WriteText($p, $s) { [System.IO.File]::WriteAllText($p, $s, [System.Text.Encoding]::UTF8) }

Write-Host ""
Write-Host "=== APPLY FIX: M41 device binding + refresh endpoint + RATE_LIMIT_STORE env ===" -ForegroundColor Cyan

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$schema = Join-Path $root "backend\prisma\schema.prisma"
$validators = Join-Path $root "backend\src\validators.js"
$auth = Join-Path $root "backend\src\routes\auth.js"
$compose = Join-Path $root "infra\docker-compose.yml"

# 1) validators.js: allow deviceId in loginSchema
$raw = ReadText $validators
$raw = $raw.Replace("`r`n","`n")
if ($raw -notmatch "deviceId") {
  $needle = "export const loginSchema = z.object({`n  email: z.string().email(),`n  password: z.string().min(3),`n});"
  if ($raw.Contains($needle)) {
    $raw = $raw.Replace($needle, "export const loginSchema = z.object({`n  email: z.string().email(),`n  password: z.string().min(3),`n  deviceId: z.string().trim().min(1).optional(), // ✅ M41`n});")
    WriteText $validators $raw
    Write-Host "✅ Patched: $validators" -ForegroundColor Green
  } else {
    Write-Host "⚠️ loginSchema anchor not found in validators.js (skipped)" -ForegroundColor Yellow
  }
} else {
  Write-Host "ℹ️ validators.js already has deviceId (skip)" -ForegroundColor DarkGray
}

# 2) schema.prisma: add User device fields + RefreshSession model (if missing)
$raw = ReadText $schema
$raw = $raw.Replace("`r`n","`n")
if ($raw -notmatch "deviceId\s+String\?") {
  $userMarker = "model User {"
  $i = $raw.IndexOf($userMarker)
  if ($i -lt 0) { throw "User model not found in schema.prisma" }
  # insert after phone field if exists, otherwise after fullName
  $insertAfter = "  phone        String?"
  if ($raw.IndexOf($insertAfter, $i) -lt 0) { $insertAfter = "  fullName     String" }
  $pos = $raw.IndexOf($insertAfter, $i)
  if ($pos -lt 0) { throw "User insert anchor not found" }
  $pos = $pos + $insertAfter.Length
  $ins = "`n`n  // ✅ M41: device binding (primarily for DRIVER)`n  deviceId         String?`n  deviceBoundAt    DateTime?`n  deviceLastSeenAt DateTime?`n`n  // ✅ M41: refresh sessions (rotating)`n  refreshSessions  RefreshSession[]`n"
  $raw = $raw.Substring(0, $pos) + $ins + $raw.Substring($pos)
  WriteText $schema $raw
  Write-Host "✅ Patched: $schema (User device+refresh fields)" -ForegroundColor Green
} else {
  Write-Host "ℹ️ schema.prisma already has device fields (skip)" -ForegroundColor DarkGray
}

$raw = ReadText $schema
$raw = $raw.Replace("`r`n","`n")
if ($raw -notmatch "model\s+RefreshSession\s+\{") {
  $append = @'

// ✅ M41: refresh token sessions (rotating)
model RefreshSession {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())

  userId Int
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)

  // sha256(refreshTokenRaw)
  tokenHash String  @unique

  deviceId  String?
  expiresAt DateTime
  revokedAt DateTime?

  replacedById Int?
  replacedBy   RefreshSession? @relation("RefreshSessionRotation", fields: [replacedById], references: [id])
  replacedFrom RefreshSession[] @relation("RefreshSessionRotation")

  ip        String?
  userAgent String?

  @@index([userId, createdAt])
  @@index([deviceId])
  @@index([expiresAt])
}

'@
  WriteText $schema ($raw + $append)
  Write-Host "✅ Patched: $schema (RefreshSession model)" -ForegroundColor Green
} else {
  Write-Host "ℹ️ schema.prisma already has RefreshSession (skip)" -ForegroundColor DarkGray
}

# 3) docker-compose: ensure RATE_LIMIT_STORE=redis (so m41check passes later)
$raw = ReadText $compose
$raw = $raw.Replace("`r`n","`n")
if ($raw -notmatch "RATE_LIMIT_STORE") {
  $needle = "      REDIS_URL: redis://redis:6379"
  if ($raw.Contains($needle)) {
    $raw = $raw.Replace($needle, $needle + "`n      RATE_LIMIT_STORE: redis")
    WriteText $compose $raw
    Write-Host "✅ Patched: $compose (RATE_LIMIT_STORE=redis)" -ForegroundColor Green
  } else {
    Write-Host "⚠️ docker-compose.yml anchor not found for REDIS_URL (skipped)" -ForegroundColor Yellow
  }
} else {
  Write-Host "ℹ️ docker-compose.yml already has RATE_LIMIT_STORE (skip)" -ForegroundColor DarkGray
}

# 4) routes/auth.js: add /refresh and device binding enforcement
$raw = ReadText $auth
$raw = $raw.Replace("`r`n","`n")

# Ensure crypto import + verifyToken
if ($raw -notmatch 'import\s+crypto\s+from\s+"crypto"') {
  $raw = $raw.Replace('import bcrypt from "bcryptjs";', 'import bcrypt from "bcryptjs";' + "`nimport crypto from `"crypto`";")
}
if ($raw -notmatch "verifyToken") {
  # jwt.js already exports verifyToken
  $raw = $raw.Replace('import { signToken } from "../auth/jwt.js";', 'import { signToken, verifyToken } from "../auth/jwt.js";')
}

# Add helpers if missing
if ($raw -notmatch "function hashToken") {
  $helpers = @'

function hashToken(raw) {
  return crypto.createHash("sha256").update(String(raw || ""), "utf8").digest("hex");
}

function newRefreshToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function pickDeviceId(req) {
  const d = String(req.body?.deviceId || "").trim();
  return d ? d : null;
}

async function enforceDriverDeviceBinding({ req, user }) {
  // For DRIVER: deviceId is mandatory and sticky.
  if (String(user?.role || "") !== "DRIVER") return { ok: true, user };

  const deviceId = pickDeviceId(req);
  if (!deviceId) return { ok: false, status: 400, body: { error: "deviceId required", code: "DEVICE_ID_REQUIRED" } };

  // If not yet bound => bind now
  if (!user.deviceId) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { deviceId, deviceBoundAt: new Date(), deviceLastSeenAt: new Date() },
    });
    return { ok: true, user: updated };
  }

  // Bound but mismatch => reject
  if (String(user.deviceId) !== deviceId) {
    return { ok: false, status: 403, body: { error: "DEVICE_MISMATCH", code: "DEVICE_MISMATCH" } };
  }

  // Match => update lastSeen
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { deviceLastSeenAt: new Date() },
  });
  return { ok: true, user: updated };
}

async function issueTokens({ req, user }) {
  const token = signToken({ userId: user.id, role: user.role });

  const refreshToken = newRefreshToken();
  const tokenHash = hashToken(refreshToken);

  // default 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash,
      deviceId: pickDeviceId(req),
      expiresAt,
      ip: getReqIp(req),
      userAgent: req.headers["user-agent"]?.toString() || null,
    },
  });

  return { token, refreshToken };
}

'@
  # place helpers after recordLoginAudit
  $marker = "async function recordLoginAudit"
  $k = $raw.IndexOf($marker)
  if ($k -ge 0) {
    # insert after recordLoginAudit function end by finding next "export const authRouter"
    $m = $raw.IndexOf("export const authRouter", $k)
    if ($m -gt 0) {
      $raw = $raw.Substring(0, $m) + $helpers + "`n" + $raw.Substring($m)
    }
  }
}

# Patch login handler to enforce device binding and return refreshToken as well
if ($raw -notmatch "refreshToken") {
  $raw = $raw.Replace("  const token = signToken({ userId: user.id, role: user.role });",
@'
  // ✅ M41: device binding for DRIVER
  const dev = await enforceDriverDeviceBinding({ req, user });
  if (!dev.ok) {
    await recordLoginAudit({ req, email, user, action: "AUTH_LOGIN_FAIL", reason: dev.body?.code || "DEVICE_BIND_FAIL" });
    return res.status(dev.status).json(dev.body);
  }
  const boundUser = dev.user;

  const { token, refreshToken } = await issueTokens({ req, user: boundUser });
'@
)
  $raw = $raw.Replace("  return res.json({",
@'
  return res.json({
    token,
    refreshToken,
'@
)
}

# Add refresh endpoint if missing
if ($raw -notmatch 'authRouter\.post\("/refresh"') {
  $inject = @'

authRouter.post("/refresh", async (req, res) => {
  const refreshToken = String(req.body?.refreshToken || "").trim();
  if (!refreshToken) return res.status(400).json({ error: "refreshToken required" });

  const tokenHash = hashToken(refreshToken);
  const session = await prisma.refreshSession.findUnique({ where: { tokenHash } });
  if (!session) return res.status(401).json({ error: "invalid refresh", code: "REFRESH_INVALID" });
  if (session.revokedAt) return res.status(401).json({ error: "revoked refresh", code: "REFRESH_REVOKED" });
  if (new Date(session.expiresAt).getTime() <= Date.now()) return res.status(401).json({ error: "expired refresh", code: "REFRESH_EXPIRED" });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return res.status(401).json({ error: "invalid user" });

  // Driver device binding still applies on refresh
  const dev = await enforceDriverDeviceBinding({ req, user });
  if (!dev.ok) return res.status(dev.status).json(dev.body);
  const boundUser = dev.user;

  // rotate: revoke old, create new
  const nextRefresh = newRefreshToken();
  const nextHash = hashToken(nextRefresh);
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  const created = await prisma.refreshSession.create({
    data: {
      userId: boundUser.id,
      tokenHash: nextHash,
      deviceId: pickDeviceId(req),
      expiresAt,
      ip: getReqIp(req),
      userAgent: req.headers["user-agent"]?.toString() || null,
    },
  });

  await prisma.refreshSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date(), replacedById: created.id },
  });

  const token = signToken({ userId: boundUser.id, role: boundUser.role });
  return res.json({ token, refreshToken: nextRefresh });
});

authRouter.post("/logout", async (req, res) => {
  const refreshToken = String(req.body?.refreshToken || "").trim();
  if (!refreshToken) return res.json({ ok: true });

  const tokenHash = hashToken(refreshToken);
  const session = await prisma.refreshSession.findUnique({ where: { tokenHash } });
  if (!session) return res.json({ ok: true });

  await prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  return res.json({ ok: true });
});

'@
  # append before end of file
  $raw = $raw.TrimEnd() + "`n" + $inject + "`n"
}

WriteText $auth $raw
Write-Host "✅ Patched: $auth" -ForegroundColor Green

Write-Host ""
Write-Host "DONE ✅  Now run: .\tools\pack.ps1 -To 41" -ForegroundColor Cyan
