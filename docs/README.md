# Docs index

## Ana SSOT
- **PRIMER_SSOT.md** — repo gerçeği, ürün tanımı, kapanan işler ve aktif milestone anlamı
- **STARTPACK_V1.md** — hızlı başlangıç ve değişmez kurallar
- **CHECKLIST_SSOT.md** — resmi green kutuları ve marker mantığı
- **MILESTONE_REGISTRY_V1.md** — tarihsel ve yaşayan milestone anlamları
- **SCRIPT_KILAVUZU_MILESTONE_HARITASI.md** — M0→M89 tek parça script/milestone rehberi
- **KABUL_KRITERLERI_10_10_VARDIS.md** — 10/10 kalite kapısı
- **NEXT_BACKLOG_V1.md** — bir sonraki kontrollü iş
- **PARENT_ACCESS_FLOW.md** — Veli Erişimi akışının güncel ürün davranışı

## Güncel çalışma omurgası
- Güncel doğrulanmış baz: `MASTER PACK PASS OK (M0->M89)`
- Tarihsel tam master anchor: `MASTER PACK PASS OK (M0->M79)`
- Repo audit: `REPO AUDIT MASTER PASS`
- Sonraki ana iş: `M90 — Canonical Closure / 10-10 kapanış paketi`
- `tools/STABLE_TO.txt = 78` yalnızca M78.x compatibility marker olarak yaşar; yaşayan üst hattı inkâr etmez.

## Operasyon / test
- **RUNBOOK_MASTER_PACK_AND_REPO_AUDIT.md** — master pack + repo audit akışı
- **SAHA_KABUL_CHECKLISTLERI_V1.md** — saha kabul omurgası
- **ROL_BAZLI_OPERASYON_DOGRULAMA_V1.md** — operasyon doğrulama rol yüzeyi
- **KANIT_PROOF_KONTROL_OMURGASI_V1.md** — kanıt / proof omurgası
- **KABUL_RED_EKSIK_TEKRAR_KONTROL_AKISI_V1.md** — karar akışı

## Overlay / tarihsel notlar
- `docs/overlays/` runtime kaynağı değildir; patch/overlay geçmişidir.
- `docs/overlays/M80`, `M81`, `M82` klasörlerindeki numaralar güncel aktif milestone anlamı değildir.
- Güncel aktif anlam için her zaman `PRIMER_SSOT.md`, `MILESTONE_REGISTRY_V1.md` ve `SCRIPT_KILAVUZU_MILESTONE_HARITASI.md` baz alınır.

## Arşiv
- `docs/_archive/plans/` — eski sprint/epic planları
- `docs/_archive/legacy-notes/` — eski notlar
- `docs/_archive/primer-versions/` — eski primer sürümleri
