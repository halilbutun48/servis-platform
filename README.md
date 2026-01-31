# servis-platform — Personel Servis V1

Bu repo: **öğrenci/parent olmayan** GPS tabanlı “personel servisi” platformunun backend + web uygulamasını içerir.

## Milestone referansı
- Tag: `v1-m12-green` (PACK M0..M12 + FULLCHECK + SMOKE PASS)

## Bileşenler
- **backend/**: Node.js (ESM) + Express + Prisma
- **web/**: Vite + React (role-based routing)
- **infra/**: Docker Compose (Postgres + Redis + API)
- **docs/**: SSOT dokümantasyon (spec’ler + primer)
- **tools/**: Gate/Pack script’leri + PRIMER snapshot

## Dokümantasyon
- Başlangıç: `docs/README.md`
- Yapıştır & devam et (kısa): `tools/PRIMER_SNAPSHOT.md`
- SSOT (detay): `docs/PRIMER_SSOT.md`
- Seed kullanıcılar: `docs/SEED_USERS.md`

## Gate / doğrulama standardı
Milestone ilerlerken her adımda “GREEN” almak hedef:
- `tools/pack.(ps1|cmd)` → M0..M12 + fullcheck + smoke
- Yeni referans noktasını tag ile sabitle (örn. `v1-m13-green`)

> Not: Bu ZIP paket `.git/` içermez. Git ile çalışmak için repo’yu klonlayıp bu dosyaları üzerine alabilirsiniz.
