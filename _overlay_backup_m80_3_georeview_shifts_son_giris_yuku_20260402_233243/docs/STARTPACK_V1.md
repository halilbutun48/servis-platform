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
- M80 altındaki ilk kontrollü daraltma adımı `M80.1` olarak açılır.
- M80 altındaki ikinci kontrollü daraltma adımı `M80.2` olarak açılır.

## Kanonik komutlar
- Son tam master doğrulama: `tools\pack.ps1 -To 79 -RepoDir D:\servis-platform -NoBuild`
- Living master doğrulama: `tools\pack_living.ps1 -To 79 -RepoRoot D:\servis-platform -NoBuild`
- Living static doğrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Living runtime doğrulama: `tools\verify_living_runtime.ps1 -To 79 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- Docs/SSOT sync pack: `tools\pack_docs_ssot.ps1 -RepoRoot D:\servis-platform`
- M79 acceptance: `tools\pack_m79_copilot_acceptance.ps1 -RepoRoot D:\servis-platform`
- M80 kabul kapısı: `tools\pack_m80_final_sert_kabul_yuk_guveni.ps1 -RepoRoot D:\servis-platform`
- M80.1 hot panel daraltma: `tools\pack_m80_1_hot_panel_daraltma.ps1 -RepoRoot D:\servis-platform`
- M80.2 agreements + shifts giriş yükü: `tools\pack_m80_2_agreements_shifts_giris_yuku.ps1 -RepoRoot D:\servis-platform`

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

## M80 final sert kabul ve yuk guveni kapisi
- Komut: `tools\pack_m80_final_sert_kabul_yuk_guveni.ps1`
- Ilk turda yeni feature acmaz; kabul kapisini resmi hale getirir.
- Hot panel gorunurlugu: `ShiftsPanel`, `AgreementsPanel`, `GeoReviewPanel`, `MapPanel`.
- Bu pack PASS verse bile resmi final green icin ek yuk/saha signoff gerekir.

## M80 oncesi hijyen kapisi
- `npm --prefix backend run lint` ile backend syntax taramasi alin.
- File store kullanan modullerde atomik json yazimi korunur.
- Kalan cleanup once guvenli/hijyen odakli tutulur; genis refactor feature turune karistirilmaz.


## Repo contract state
- Makine-okur durum özeti: `tools\repo_contract_state.json`
- State-first docs-contract kuralı: önce `repo_contract_state.json`, sonra markdown anlatımı okunur.


## Root orchestration
- root lint: `npm run lint`
- hot-path smoke: `npm run verify:hot`
- docs/contract smoke: `npm run verify:docs`
- repo audit: `npm run audit:repo`

## M80 öncesi P2 hijyen
- `backend/data` altındaki runtime `.json` ve `.json.bak` dosyaları repoda tutulmaz; uygulama gerektiğinde yeniden üretir.
- Docs-contract ölçümü doğrudan path-ref bağımlılığına göre izlenir.

- yük sıcak noktaları görünür tutulur
- M80.1 içinde `GeoReviewPanel / MapPanel / ShiftsPanel` daraltmaları küçük ve kontrollü yapılır
- M80.2 içinde `AgreementsPanel / ShiftsPanel` giriş yükü küçük ve kontrollü daraltılır
