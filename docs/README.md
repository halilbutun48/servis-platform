# Docs index

## Engineering entrypoint

- **[INDEX.md](INDEX.md)** — #16 canonical engineering knowledge center, architecture, role, capability, operations, checks and integration navigation

## Ana SSOT
- **PRIMER_SSOT.md** — repo gerçeği, ürün tanımı, kapanan işler ve aktif milestone anlamı
- **STARTPACK_V1.md** — hızlı başlangıç ve değişmez kurallar
- **CHECKLIST_SSOT.md** — resmi green kutuları ve marker mantığı
- **MILESTONE_REGISTRY_V1.md** — tarihsel ve yaşayan milestone anlamları
- **SCRIPT_KILAVUZU_MILESTONE_HARITASI.md** — M0→latest tek parça script/milestone rehberi
- **DOCS_SSOT_BRAND_ARTIFACT_CLEANUP_01.md** — docs/brand/overlay/archive cleanup audit
- **[KABUL_KRITERLERI_10_10.md](./KABUL_KRITERLERI_10_10_VARDIS.md)** — 10/10 kalite kapısı (historical evidence)
- **NEXT_BACKLOG_V1.md** — bir sonraki kontrollü iş
- **CONVERSATION_CLOSURE_INDEX_V1.md** — bu sohbetin hizalanan ana bantları ve kalanlar
- **PARENT_ACCESS_FLOW.md** — Veli Erişimi akışının güncel ürün davranışı

## Güncel çalışma omurgası
- Güncel doğrulanmış baz: `MASTER PACK PASS OK (M0->M89)`
- Tarihsel tam master anchor: `MASTER PACK PASS OK (M0->M79)`
- Repo audit: `REPO AUDIT MASTER PASS`
- Sonraki ana iş: `M90 — Canonical Closure / 10-10 kapanış paketi`
- Tek repo kontrol girisi: `npm run verify:repo`
- En son verification spine: `M92 — repo verification spine`
- `tools/STABLE_TO.txt = 78` yalnızca M78.x compatibility marker olarak yaşar; yaşayan üst hattı inkâr etmez.

## Operasyon / test
- **RUNBOOK_MASTER_PACK_AND_REPO_AUDIT.md** — master pack + repo audit akışı
- **SAHA_KABUL_CHECKLISTLERI_V1.md** — saha kabul omurgası
- **ROL_BAZLI_OPERASYON_DOGRULAMA_V1.md** — operasyon doğrulama rol yüzeyi
- **KANIT_PROOF_KONTROL_OMURGASI_V1.md** — kanıt / proof omurgası
- **KABUL_RED_EKSIK_TEKRAR_KONTROL_AKISI_V1.md** — karar akışı
- **REGION_SHARDING_SINGLE_ENTRY_GATE_V1.md** — region sharding tek giriş kapısı
- **REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md** — region next phase open items
- **REGION_NEXT_PHASE_EXECUTION_PACK_V1.md** — region next phase execution pack
- **REGION_FIELD_ROLLOUT_RUNBOOK_V1.md** — saha / altyapi rollout runbook
- **REGION_PHYSICAL_CELL_DEPLOYMENT_V1.md** — fiziksel region cell deployment brief
- **REGION_ZONE_ALT_SHARD_V1.md** — büyük şehir zone / ilçe alt-shard policy
- **REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md** — archive export / manifest / restore
- **REGION_FAILOVER_REBALANCING_DRILL_V1.md** — failover / rebalancing drill runbook
- **MOBILE_SCOPE_BOUNDARY_V1.md** — mobil driver-first kapsam sınırı
- **RUNBOOK_M47_2_CAPACITY_LOAD_BASELINE.md** — kapasite/load baz cizgisi ve tekil infra envelope
- **RUNBOOK_AUTO_REACHED_QUEUE_DURABILITY_V1.md** — auto-reached queue durability sınır notu
- **RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md** — auto-reached queue dayanıklılık kanıtı ve operasyon yüzeyi
- **EVIDENCE_PACK_20260428.md** — performans, queue proof ve saha checklist tek indeks
- **SAHA_EVIDENCE_PACK_TEMPLATE.md** — gerçek cihaz saha kanıtı şablonu
- **MOBILE_FIELD_EVIDENCE_CAPTURE_GUIDE.md** — mobil saha kanıtı toplama rehberi
- **TICARI_ODEME_VE_MUTABAKAT_HAZIRLIK_MODELI_V1.md** — ödeme kanalı hazırlık modeli, kanal sırası ve mutabakat sınırı
- **RUNBOOK_CLEAN_CLONE_VERIFICATION_V1.md** — temiz klon bootstrap + verify akışı

## Overlay / tarihsel notlar
- `docs/overlays/` runtime kaynağı değildir; patch/overlay geçmişidir.
- `docs/overlays/M80`, `M81`, `M82` klasörlerindeki numaralar güncel aktif milestone anlamı değildir.
- Güncel aktif anlam için her zaman `PRIMER_SSOT.md`, `MILESTONE_REGISTRY_V1.md` ve `SCRIPT_KILAVUZU_MILESTONE_HARITASI.md` baz alınır.

## Arşiv
- `docs/_archive/plans/` — eski sprint/epic planları
- `docs/_archive/legacy-notes/` — eski notlar
- `docs/_archive/primer-versions/` — eski primer sürümleri
