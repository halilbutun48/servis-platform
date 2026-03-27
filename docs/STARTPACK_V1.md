# STARTPACK V1

## Temel kurallar
1. Monorepo modüler yapıda ilerler: `backend / web / mobile / infra / docs / tools`.
2. Ürün kimliği **B2B servis pazaryeri + operasyon platformu**dur.
3. Driver login ana akışı `Sürücü Kodu + PIN` olarak korunur.
4. İlk girişte PIN değişimi zorunludur.
5. Ürün içi konum dili `sürücünün telefon GPS'i` olarak korunur.
6. Company default `maxWalkM = 250`, School default `maxWalkM = 50`.
7. Oluşturma için tek kaynak **Planlama Merkezi** olmalıdır.
8. **Vardiyalar** ekranı oluşturma değil, takip / operasyon ekranı olarak kalmalıdır.
9. Room seçip teklif göndermeden iş markete düşmemelidir.
10. Guided Mode kullanıcıyı gereksiz draft mantığıyla uğraştırmamalıdır.
11. Overlay standardı: **tek zip / tek kök klasör / nested root yok**.
12. Checklist'te `[x]` yalnızca pack/check green sonrası işaretlenir.

## Güncel dürüst durum
- `M59 -> M65` sertleştirme hattı green taban olarak vardır.
- Ama `M59 -> M66` için tam uçtan uca yeniden kontrol, smoke ve saha testi henüz kapanmamıştır.
- Repo şu an **post-M66 functional** durumdadır.
- Büyük repo cleanup / duplicate cleanup / dead code cleanup / performans sadeleştirmesi sonraki ana fazdır.

## Kanonik komutlar
- Tam master hat: `tools\pack.ps1 -To 66 -RepoDir D:\servis-platform -NoBuild`
- Reset + full hat: `tools\reset-and-pack.ps1 -To 66 -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- M66 özel pack: `tools\pack_m66_operation_reassignment.ps1 -RepoRoot D:\servis-platform`

## Master pack
`tools\pack.ps1 -To 66` artık tek çatı girişidir.

Bu komut:
- `M104 / M105 / M106` statik repo check'lerini çalıştırır,
- `M0 -> M41` gate hattını koşturur,
- `M42 -> M66` pack zincirini sırayla koşturur,
- sonda repo audit raporu üretir.


## TTL kısa not
- Parent invite presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**
- Personel/öğrenci public canlı link presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**
- Parent invite backend üst sınırı: **365 gün**
- Personel/öğrenci public canlı link backend üst sınırı: **365 gün**

## Repo audit kapsamı
- duplicate dosyalar
- benzer pack/check script grupları
- orphan / legacy adayları
- tiny / boş dosyalar
- archive/live shadow çiftleri
- temel performans kokuları (`useEffect`, `setInterval`, `addEventListener`, backend `.on(`)

## M66 kısa not
- ROOM operasyon yetkisiyle araç/sürücü reassignment yapar.
- COMPANY bunu ticari değil operasyonel olay olarak görür.
- Yeni sürücüye görev/rota paketi gider.
- Eski sürücü aktif görevden düşer.
- M66 fonksiyonel olarak eklidir; tam kapanış için smoke + saha doğrulaması gerekir.

- repo/tools hijyen check: tools\check_tools_hygiene_m105.ps1 -RepoRoot D:\servis-platform

## M45 markerları
- pack: `tools\pack_m45_retention_backup.ps1 -RepoRoot D:\servis-platform`
- runbook: `docs/RUNBOOK_M45_RETENTION_BACKUP.md`

## M46 markerları
- pack: `tools\pack_m46_ai_copilot.ps1 -RepoRoot D:\servis-platform`
- repo-contract: `tools\check_m46_ai_copilot_repo_contract.ps1 -RepoRoot D:\servis-platform`
- runbook: `docs/RUNBOOK_M46_AI_COPILOT.md`

## M47.4 + M57 + M58 markerları
- M47.4 Mobile Readiness Web Pass: `tools\pack_m47_4_mobile_readiness_web_pass.ps1 -RepoRoot D:\servis-platform`
- M57 full phase rerun: `tools\_packs\pack_m42_m58.ps1 -To 57 -RepoRoot D:\servis-platform -NoBuild`
- M57 scaffold komutu: `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform -ScaffoldOnly`
- M58 hazirlik komutu: `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`
- M58 resmi green değildir; manuel pilot kabul gerekir.

## M59 -> M65 repo-contract markerları
- `M59 — Gözlemleme + Saha Teşhis` pack: `tools\pack_m59_observability_field_diagnostics.ps1`
- `M59 — Gözlemleme + Saha Teşhis` resmi green oldu; aktif hat `M60`.
- `M60 — Saha Acceptance Merkezi` pack: `tools\pack_m60_field_acceptance_center.ps1`
- M60 green olmadan M61 acilmaz.
- `M61 — SSOT + Milestone Hizası` pack: `tools\pack_m61_ssot_milestone_alignment.ps1`
- Docs/SSOT pack: `tools\pack_docs_ssot.ps1`
- M61 SSOT + Milestone Hizası PACK PASS OK.
- `M62 — Ticari Omurga Güçlendirme` pack: `tools\pack_m62_commercial_core_strengthening.ps1`
- M62 green olmadan M63 acilmaz.
- `M63 — Güven + Kalite + Hizmet Değerlendirme` pack: `tools\pack_m63_trust_quality_service_evaluation.ps1`
- `M64 — Doğal Copilot Katmanı` pack: `tools\pack_m64_natural_copilot_layer.ps1`
- `M65 — Pilot Launch Gate` pack: `tools\pack_m65_pilot_launch_gate.ps1`
