# NEXT BACKLOG V1

Tarih: 2026-04-05
Timezone: Europe/Istanbul

Current direction: **M61→M81 green -> aktif correctness kilidi M82.1**

## 1) Resmi durum
- Son temiz historical master doğrulama: `MASTER PACK PASS OK (M0->M79)`
- Repo audit: `REPO AUDIT MASTER PASS`
- `M61→M81` zinciri green kabul edilir
- Aktif correctness kilidi: `M82.1` Backend correctness kilidi
- `tools/STABLE_TO.txt = 78` M78.x compatibility marker olarak korunur
- Parent Access akışı legacy invite değildir; öğrenci + süre + erişim linki + erişim kodu + PIN mantığıyla çalışır
- OSRM kodu repoda vardır ama default compose modu fallback davranır

## 2) Hemen sonraki ana faz
1. `M82.1` Backend correctness kilidini pack/guard ile resmi hatta bağla
2. `M82.2` Web UI + API kontrat sertleştirme + büyük dosyaları parçalama
3. `M82.3` Mobil gerçek kullanım tamamlama
4. `M82.4` Background GPS / offline davranış sertleştirme
5. `M82.5` canlı konum kaynak önceliği
6. `M82.6` release / env / acceptance
7. `M82.7` cleanup / hygiene
8. `M82.8` verification 2.0
9. `M82.9` dormant payment backbone
10. `M82.10` super admin ticari ayarlar
11. `M82.11` payment readonly ticari yüzey
12. `M83` saha hazırlık paketi
13. `M84` saha gözlem / geri bildirim döngüsü
14. saha testi ve geri bildirim turunu `M83` sonrası kullanıcı koşsun

## 3) Bu turun çalışma kuralı
- ürün davranışını bozma
- geniş refactor yapma
- önce docs/SSOT hizasını düzelt
- exact-string kırıklarında önce ilgili pack’i çöz
- master rerun’ı sona bırak

## 4) Kanonik komutlar
- `tools\pack.ps1 -To 82 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 82 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 82 -RepoRoot D:\servis-platform -NoBuild`
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m82_1_backend_correctness.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m82_9_dormant_payment_backbone.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m82_10_super_admin_commercial_settings.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m82_11_payment_readonly_surface.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m83_field_prep_packet.ps1 -RepoRoot D:\servis-platform`

## 5) Açık hizalama notu
- `docs/overlays/M80`, `M81`, `M82` klasörleri güncel milestone anlamı değildir.
- Güncel aktif anlam:
  - `M80`: final sert kabul ve yük güveni
  - `M81`: mobil saha sertleştirme
  - `M82.1`: Backend correctness kilidi
  - `M82`: controlled cleanup + consolidation

## 6) İlk cümle
Repo şu an `M61→M81` green kabul edilir; aktif ana correctness hattı `M82.1` backend correctness kilididir. Saha testi `M82` sonrası kullanıcı tarafından yapılacaktır.

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

- M80.1 — yük sıcak noktalarında daraltma / sadeleme (`GeoReviewPanel`, `MapPanel`, `ShiftsPanel`)
- M80.2 — AgreementsPanel + ShiftsPanel giriş yükü daraltma
- M80.3 — GeoReviewPanel + ShiftsPanel son giriş yükü daraltma

- M81 mobil saha sertlestirme: tools\pack_m81_mobile_saha_sertlestirme.ps1 -RepoRoot D:\servis-platform


- M82.1 backend correctness: tools\pack_m82_1_backend_correctness.ps1 -RepoRoot D:\servis-platform
- M84 field feedback loop notu: saha gözlemleri backend runtime store içinde tutulur; local not resmi kayıt değildir.

- M85 opsiyonel ödeme pilotu notu: OPTIONAL moddaki ticari kaynaklar pilot listesine alinir; READY durumu gercek tahsilat degil kontrollu hazirlik anlamina gelir.
- M86 zorunlu odeme rollout notu: REQUIRED moddaki ticari kaynaklar rollout listesinde ACTIVE/DISABLED akisi ile yonetilir; ACTIVE durumu gercek provider entegrasyonundan once finans operasyon hazirligini temsil eder.
- M87 odeme hesabi hazirligi notu: OPTIONAL/REQUIRED kapsamdaki sirket ve oda taraflari icin payment account metadata/readiness ozeti Super Admin tarafinda yonetilir; bu faz gercek charge/payout acmaz ama finans operasyon hazirligini gorunur kilar.
- M88 settlement operasyon masasi notu: READY/PLANNED/EXECUTED settlement entry satirlari Super Admin tarafinda manuel operasyon kuyruugu olarak gorunur; finans hazir degilse satir bloklu isaretlenir.
- M89 settlement mutabakat masasi notu: PLANNED/EXECUTED settlement satirlari icin manuel mutabakat izi tutulur; eslesti / inceleme gerekli / uyusmazlik / kapandi akisi Super Admin tarafinda yonetilir.


- M90 — Living Verification & Acceptance Convergence (hazırlık / check-pack-acceptance hizası)
