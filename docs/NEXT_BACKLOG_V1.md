# NEXT BACKLOG V1

Tarih: 2026-04-01
Timezone: Europe/Istanbul

Current direction: **M79 green doğrulandı -> docs/SSOT repo gerçeğine hizalanıyor -> M80 küçük ve kontrollü başlangıç**

## 1) Resmi durum
- Son temiz doğrulama: `MASTER PACK PASS OK (M0->M79)`
- Repo audit: `REPO AUDIT MASTER PASS`
- `M79` Copilot acceptance turu kapalı kabul edilir
- `tools/STABLE_TO.txt = 78` M78.x compatibility marker olarak korunur
- Parent Access akışı legacy invite değildir; öğrenci + süre + erişim linki + erişim kodu + PIN mantığıyla çalışır
- OSRM kodu repoda vardır ama default compose modu fallback davranır

## 2) Hemen sonraki ana faz
1. `M80` ile final sert kabul ve yük güveni hattını başlat
2. M80 öncesi tüm load-bearing `.md` dosyalarını primer gerçeğine hizala
3. milestone anlam çakışmalarını görünür şekilde temizle
4. M80 için küçük pack/check/runbook omurgası planla
5. full `M0->M79` sadece final teyitte tekrar koş

## 3) Bu turun çalışma kuralı
- ürün davranışını bozma
- geniş refactor yapma
- önce docs/SSOT hizasını düzelt
- exact-string kırıklarında önce ilgili pack’i çöz
- master rerun’ı sona bırak

## 4) Kanonik komutlar
- `tools\pack.ps1 -To 79 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 79 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 79 -RepoRoot D:\servis-platform -NoBuild`
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m79_copilot_acceptance.ps1 -RepoRoot D:\servis-platform`

## 5) Açık hizalama notu
- `docs/overlays/M80`, `M81`, `M82` klasörleri güncel milestone anlamı değildir.
- Güncel aktif anlam:
  - `M80`: final sert kabul ve yük güveni
  - `M81`: mobil saha sertleştirme
  - `M82`: controlled cleanup + consolidation

## 6) İlk cümle
Repo şu an `M79`’a kadar doğrulanmış durumdadır. Bir sonraki doğru iş, mevcut repo gerçeğini bozmadan `M80` için küçük ve kontrollü başlangıç hazırlamaktır.

<!-- REPO_CONTRACT_COMPAT_BACKLOG_V2
M57 green
M58
Android preview/internal build disiplini green
pack_m58_final_pilot_readiness.ps1
pilot kabul formu
GO
NO-GO
Tarihsel uyumluluk notu
M58 — Final Pilot Readiness
M59
pack_m59_observability_field_diagnostics.ps1
M60
full M0-M66 rerun
deep repo cleanup
post-M66 functional
M76A-1
minimum normalizasyon
M77
M77.5
M78
DB anonymize
db anonymize backlog
retention/export-trail
REPO_CONTRACT_COMPAT_BACKLOG_V2 -->

<!-- REPO_CONTRACT_COMPAT_M78_BACKLOG_V1
m78 checklist / operasyon dogrulama iskeleti green
M79
m0 -> m78
M78.1
M78.2
M78.3
REPO_CONTRACT_COMPAT_M78_BACKLOG_V1 -->

<!-- REPO_CONTRACT_COMPAT_M78_BACKLOG_V2
operasyon doğrulama iskeleti
REPO_CONTRACT_COMPAT_M78_BACKLOG_V2 -->


## Repo contract state
- Makine-okur durum özeti: `tools\repo_contract_state.json`
- State-first docs-contract kuralı: önce `repo_contract_state.json`, sonra markdown anlatımı okunur.
