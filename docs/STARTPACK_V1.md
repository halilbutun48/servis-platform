# STARTPACK V1

<!-- STARTPACK_TOOLS_HYGIENE_V1 -->
<!-- STARTPACK_PARENT_TTL_PRESETS_V1 -->
<!-- STARTPACK_PUBLIC_LINK_TTL_PRESETS_V1 -->

## Temel kurallar
1. Monorepo modüler yapıda ilerler: `backend / web / mobile / infra / docs / tools`.
2. Ürün kimliği **Vardis** markası altında çalışan karma taşıma platformudur; sadece personel ürünü diye daraltılmaz.
3. Ticari akış ile operasyon akışı aynı ürün içinde ama ayrı katmanlar olarak korunur.
4. Driver login ana akışı `Sürücü Kodu + PIN` olarak korunur.
5. İlk girişte PIN değişimi zorunludur.
6. Ürün içi konum dili `sürücünün telefon GPS'i` olarak korunur.
7. Company default `maxWalkM = 250`, School default `maxWalkM = 50`.
8. Parent Access akışı hesap daveti değildir; öğrenci + süre + erişim linki + erişim kodu + PIN mantığıyla çalışır.
9. Oluşturma için tek kaynak **Planlama Merkezi** olmalıdır.
10. **Vardiyalar** ekranı oluşturma değil, takip / operasyon ekranı olarak kalmalıdır.
11. Ürün kodu geri alınmaz; pack/check/runbook/doc yeni gerçeğe uydurulur.
12. Overlay standardı: **tek zip / tek kök klasör / nested root yok**.
13. Checklist’te `[x]` yalnızca pack/check green sonrası işaretlenir.
14. Önce ölç, sonra düzelt, sonra tekrar ölç.

## Güncel dürüst durum
- Son temiz doğrulama: `MASTER PACK PASS OK (M0->M79)`
- Repo audit: `REPO AUDIT MASTER PASS`
- `M79` acceptance kapalıdır.
- `tools/STABLE_TO.txt = 78` değeri M78.x compatibility marker olarak korunur.
- Parent Access / public live / personel public live yüzeyleri güncel ürün gerçeğine hizalıdır.
- OSRM kodu repoda kalır; default compose modu fallback çalışır.
- Bundan sonraki aktif ana iş `M80`’dir.

## Kanonik komutlar
- Son tam master doğrulama: `tools\pack.ps1 -To 79 -RepoDir D:\servis-platform -NoBuild`
- Living master doğrulama: `tools\pack_living.ps1 -To 79 -RepoRoot D:\servis-platform -NoBuild`
- Living static doğrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Living runtime doğrulama: `tools\verify_living_runtime.ps1 -To 79 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- Docs/SSOT sync pack: `tools\pack_docs_ssot.ps1 -RepoRoot D:\servis-platform`
- M79 acceptance: `tools\pack_m79_copilot_acceptance.ps1 -RepoRoot D:\servis-platform`

## Master pack notu
`tools\pack.ps1 -To 79` güncel tam master doğrulama referansıdır.

Ek not:
- `M78.1`, `M78.2`, `M78.3` repo-contract kontrolleri içinde `STABLE_TO = 78` beklentisi bilinçli olarak korunur.
- Bu yüzden `STABLE_TO 78` ile `MASTER PACK PASS OK (M0->M79)` birlikte doğru olabilir.

## TTL kısa not
- Veli Erişimi presetleri: **1 gün / 1 hafta / 1 ay / 6 ay / 1 yıl**
- Personel/öğrenci public canlı link presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**
- Backend üst sınırı: **365 gün**

## Tarihsel overlay notu
- `docs/overlays/M80`, `M81`, `M82` klasörleri aktif milestone anlamı değildir.
- Güncel aktif anlam için `PRIMER_SSOT.md` ve `MILESTONE_REGISTRY_V1.md` baz alınır.

## M58 final pilot readiness
- Komut: `tools\pack_m58_final_pilot_readiness.ps1`
- M58 final pilot readiness paketi repo hazırlığını doğrular.
- Official green still requires manual pilot acceptance / field signoff.
- Manual pilot acceptance gate korunur.

<!-- REPO_CONTRACT_COMPAT_STARTPACK_V2
pack_m58_final_pilot_readiness.ps1
M58 hazirlik komutu
manuel pilot kabul
M59
pack_m59_observability_field_diagnostics.ps1
Saha testi
M62 — Ticari Omurga Güçlendirme
M62 başlangıç notu
M63 — Güven + Kalite + Hizmet Değerlendirme
M63 başlangıç notu
M63` bitmeden `M64
M64 — Doğal Copilot Katmanı
M64 başlangıç notu
M64` bitmeden `M65
M65 — Pilot Launch Gate
M66
tools\pack_docs_ssot.ps1
pack_m66_operation_reassignment.ps1
tools\pack.ps1 -To 66
tools\pack.ps1 -To 76
check_repo_audit_master.ps1
post-M66 functional
M75 green baseline
M76A-1
M77
M78
REPO_CONTRACT_COMPAT_STARTPACK_V2 -->

<!-- REPO_CONTRACT_COMPAT_M78_STARTPACK_V1
pack.ps1 -to 78
M78 checklist + operasyon dogrulama
M78 iskeleti
REPO_CONTRACT_COMPAT_M78_STARTPACK_V1 -->

<!-- REPO_CONTRACT_COMPAT_M78_STARTPACK_V2
tools\pack.ps1 -To 78
M78 checklist / operasyon doğrulama iskeleti
REPO_CONTRACT_COMPAT_M78_STARTPACK_V2 -->

## M77 KVKK enforcement özeti
- retention/export trail enforcement helper katmanı
- Referans: `KVKK_RETENTION_ENFORCEMENT_V1.md`
- Referans: `KVKK_ROLE_PAYLOAD_DARALTMA_V1.md`

## M78.3 operasyon doğrulama özet ve filtre katmanı
- M78.3 operasyon doğrulama özet ve filtre katmanı
- pack: `tools\pack_m78_3_operasyon_dogrulama_ozet_filtre_katmani.ps1`
- filtre / son güncelleme / export görünürlüğü
