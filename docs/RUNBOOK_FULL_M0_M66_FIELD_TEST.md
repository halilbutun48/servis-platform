# RUNBOOK — Full M0→M66 Field Test (Repo: servis-platform)

> Goal: Before saha we want **end-to-end validation** of M0→M66.
> This repo now has two canonical verification roofs:
>
> 1) **Master Pack** → `tools\pack.ps1 -To 66 -RepoDir D:\servis-platform -NoBuild`
> 2) **Docs / SSOT Pack** → `tools\pack_docs_ssot.ps1 -RepoRoot D:\servis-platform`

---

## 0) One-time prerequisites
- Docker Desktop / docker compose
- Postgres via `infra/docker-compose.yml`
- Seed baseline in `backend/prisma/seed.js`

---

## 1) Recommended order
1. Run master pack.
2. Review failures milestone by milestone.
3. Run docs / ssot pack again if documents changed.
4. Do live smoke / ws / notification validation.
5. Record saha evidence.

---

## 2) Canonical master command
- `tools\pack.ps1 -To 66 -RepoDir D:\servis-platform -NoBuild`

What it does:
- `M0 -> M41` via `gate.ps1`
- `M42 -> M66` via manifest-driven existing pack scripts
- then `pack_docs_ssot.ps1` unless skipped

Optional:
- `-SkipDocsPack` if only runtime chain is desired temporarily

---

## 3) Docs / SSOT command
- `tools\pack_docs_ssot.ps1 -RepoRoot D:\servis-platform`

It validates:
- runbook
- checklist
- milestone registry
- primer
- tools readme
- master manifest links

---

## 4) Practical saha definition
Before saha:
- master pack is green on a clean environment
- docs / ssot pack is green
- M66 operational reassignment is verified end-to-end
- WS + notif chains are checked on real devices
- acceptance evidence is recorded

---

## 5) Honest note
- `M59 -> M65` green base exists.
- `M66` is functionally present.
- But without full rerun + live smoke + saha test, repo is **not** called fully ready.
