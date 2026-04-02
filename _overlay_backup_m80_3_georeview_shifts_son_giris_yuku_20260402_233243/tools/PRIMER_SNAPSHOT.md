# PRIMER SNAPSHOT

<!-- TTL_PRESETS_PARENT_PUBLIC_LINKS_V1 -->

- Repo: `servis-platform`
- Branch: `main`
- Marka: `Vardis`
- Ürün: okul/öğrenci/veli ve personel/şirket/organizasyon alanlarını birlikte taşıyan karma servis platformu
- Son temiz durum: `MASTER PACK PASS OK (M0->M79)`
- Repo audit: `REPO AUDIT MASTER PASS`
- `M79` acceptance kapalıdır
- `tools/STABLE_TO.txt`: `78` (**M78.x compatibility marker**)
- Operasyonel master doğrulama: `tools\pack.ps1 -To 79 -RepoDir D:\servis-platform -NoBuild`
- Living master doğrulama: `tools\pack_living.ps1 -To 79 -RepoRoot D:\servis-platform -NoBuild`
- Parent Access: öğrenci + süre + erişim linki + erişim kodu + PIN
- Veli Erişimi TTL presetleri: `1 gün / 1 hafta / 1 ay / 6 ay / 1 yıl`
- Personel/öğrenci public canlı link presetleri: `1 hafta / 1 ay / 6 ay / 1 yıl`
- Sonraki odak: `M80` kabul kapısını koş, `M80.1` daraltmayı koru ve ardından `M80.2` Agreements/Shifts giriş yükü daraltmasına geç
- M80 pack komutu: `tools\pack_m80_final_sert_kabul_yuk_guveni.ps1 -RepoRoot D:\servis-platform`
- M80.1 pack komutu: `tools\pack_m80_1_hot_panel_daraltma.ps1 -RepoRoot D:\servis-platform`
- M80.2 pack komutu: `tools\pack_m80_2_agreements_shifts_giris_yuku.ps1 -RepoRoot D:\servis-platform`
- M80 ilk PASS notu: kapı açılır; resmi green değildir
- M80.1 odak: hot panel daraltma
- M80.2 odak: Agreements/Shifts giriş yükü daraltma
- Tarihsel not: `docs/overlays/M80`, `M81`, `M82` klasörleri aktif milestone anlamı değildir

<!-- REPO_CONTRACT_COMPAT_TOOLS_PRIMER_V2
pack_m58_final_pilot_readiness.ps1
M58 hazirlik komutu
resmi green
M59
pack_m59_observability_field_diagnostics.ps1
M65
M65 — Pilot Launch Gate
M66
post-M66 functional
fonksiyonel
M75 green baseline
M76A-1
M77
M78
DB anonymize
REPO_CONTRACT_COMPAT_TOOLS_PRIMER_V2 -->

<!-- REPO_CONTRACT_COMPAT_M78_TOOLS_PRIMER_V1
M78.1
M78.2 ilk yazılabilir kayıt katmanı
M78.3 özet + filtre katmanı
sonraki odak: M79
tools/STABLE_TO.txt: 78
m78 checklist + operasyon dogrulama
REPO_CONTRACT_COMPAT_M78_TOOLS_PRIMER_V1 -->

<!-- REPO_CONTRACT_COMPAT_M78_TOOLS_PRIMER_V2
`tools/STABLE_TO.txt`: `78`
REPO_CONTRACT_COMPAT_M78_TOOLS_PRIMER_V2 -->
