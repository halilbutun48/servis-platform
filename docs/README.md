# Docs index

## Ana SSOT
- **PRIMER_SSOT.md** — repo gerçeği, ürün tanımı, kapanan işler ve aktif milestone anlamı
- **PROJECT_SPEC_V1.md** — ürün kapsamı ve ana kurallar
- **API_SPEC_V1.md** — REST + WS sözleşmeleri
- **DB_SCHEMA_V1.md** — şema ve tablolar
- **UI_SPEC_V1.md** — UI route/roller/ekranlar
- **STARTPACK_V1.md** — hızlı başlangıç noktası
- **MILESTONE_REGISTRY_V1.md** — aktif milestone anlamları ve tarihsel hizalama notu
- **PARENT_ACCESS_FLOW.md** — Veli Erişimi akışının güncel ürün davranışı

## Güncel çalışma omurgası
- Son temiz doğrulama: `MASTER PACK PASS OK (M0->M79)`
- Repo audit: `REPO AUDIT MASTER PASS`
- M79 acceptance kapalı, sonraki ana iş `M80`
- `tools/STABLE_TO.txt = 78` sadece M78.x compatibility marker olarak kalır
- Parent Access akışı artık legacy auth invite değildir
- OSRM default compose modunda kapalı/fallback davranır; bilinçli açılınca aktif olur

## Operasyon / test
- **CHECKLIST_SSOT.md** — resmi green kutuları ve master marker’lar
- **NEXT_BACKLOG_V1.md** — M79 sonrası aktif yön ve M80 başlangıç çerçevesi
- **RUNBOOK_MASTER_PACK_AND_REPO_AUDIT.md** — master pack + repo audit akışı
- **RUNBOOK_M79_COPILOT_ACCEPTANCE.md** — M79 kabul paketi
- **SAHA_KABUL_CHECKLISTLERI_V1.md** — saha kabul omurgası
- **ROL_BAZLI_OPERASYON_DOGRULAMA_V1.md** — operasyon doğrulama rol yüzeyi
- **KANIT_PROOF_KONTROL_OMURGASI_V1.md** — kanıt / proof omurgası
- **KABUL_RED_EKSIK_TEKRAR_KONTROL_AKISI_V1.md** — karar akışı

## Overlay / tarihsel notlar
- `docs/overlays/` runtime kaynağı değildir; patch/overlay geçmişidir.
- `docs/overlays/M80`, `M81`, `M82` klasörlerindeki numaralar güncel aktif milestone anlamı değildir.
- Güncel aktif anlamlar için her zaman `PRIMER_SSOT.md` ve `MILESTONE_REGISTRY_V1.md` baz alınır.

## Arşiv
- `_archive/plans/` — eski sprint/epic planları
- `_archive/legacy-notes/` — eski notlar
- `_archive/primer-versions/` — eski primer sürümleri
