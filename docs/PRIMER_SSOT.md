# SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER SNAPSHOT

Tarih: 2026-03-20
Timezone: Europe/Istanbul
Repo: `D:\servis-platform`
Branch: `main`

## 0) Genel durum

- `M59 -> M65` saha öncesi sertleştirme hattı **green taban** olarak duruyor.
- Ancak `M59 -> M65` için tam uçtan uca yeniden kontrol ve saha testi **henüz tamamlanmış sayılmaz**.
- Şu an repo **post-M66 functional** durumdadır.
- `M66` fonksiyonel geliştirme olarak eklendi; fakat tam milestone kapanışı için canlı smoke + saha testi + yeniden doğrulama gereklidir.
- Repo cleanup / duplicate code cleanup / dead code cleanup / büyük performans sadeleştirmesi **henüz yapılmadı**.

## 1) M66 güncel durum

- `M66-A1` çekirdek çalışıyor:
  - ROOM, `APPROVED/ACTIVE` vardiyada araç/sürücü atamasını değiştirebiliyor.
  - değişiklik audit + notification + operation event olarak yazılıyor.
  - COMPANY tarafında Vardiyalar / Liste içinde operasyon kaydı görülebiliyor.
- `M66-A2b` polish yapıldı:
  - buton dili: **Değişikliği Kaydet ve Paketi Yenile**
  - yeni sürücüye `shift:update + route:plan` zinciri
  - eski sürücüye removal zinciri
- operation event reason metinleri kullanıcı diliyle gösteriliyor.
- verification katmanı eklendi:
  - `backend/scripts/m66check.js`
  - `tools/pack_m66_operation_reassignment.ps1`
  - `tools/check_m66_operation_reassignment_repo_contract.ps1`
  - `docs/RUNBOOK_M66_OPERATION_REASSIGNMENT.md`
- `tools/pack_m45_retention_backup.ps1`
- `docs/RUNBOOK_M45_RETENTION_BACKUP.md`
- `tools/pack_m46_ai_copilot.ps1`
- `tools/check_m46_ai_copilot_repo_contract.ps1`
- `docs/RUNBOOK_M46_AI_COPILOT.md`

## 2) Dürüst saha öncesi durum

- `M59 -> M65` için green taban var.
- Ama **"tam saha hazır ve her şey yeniden doğrulandı"** denemez.
- Özellikle baştan aşağı kontrol gerekecek:
  - yönlendirmeler
  - tarih / saat akışları
  - role-based rollout
  - market / pazarlık / bekleyen / liste akışları
  - bildirim ve ws zinciri
  - operasyon görünürlüğü
  - hizmet değerlendirme
  - admin / observability / launch gate yüzeyleri
  - `M66` operasyonel reassignment canlı zinciri

## 3) Yeni tek komut hattı

Kanonik tam komut artık:

- `tools\pack.ps1 -To 66 -RepoDir D:\servis-platform -NoBuild`

Bu master pack:
- statik repo check'leri koşturur,
- `M0 -> M41` gate hattını koşturur,
- `M42 -> M66` pack zincirini koşturur,
- sonunda repo audit raporu üretir.

Repo audit wrapper:
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`

Audit raporu:
- `artifacts/repo-audit/repo_audit_latest.json`

## 4) Büyük cleanup fazı (sonraki ana faz)

1. `M0 -> M66` baştan aşağı kontrol / eksik fonksiyonel noktaları kapatma
2. saha testi / canlı akış doğrulama
3. büyük repo cleanup
   - duplicate kod
   - eski / legacy / orphan parçalar
   - dead code
   - ortak helper/domain grouping
   - backend/frontend/mobile gereksiz yük üreten parçaların temizliği
4. performans ve ölçek hazırlığı
   - 2000 eşzamanlı kullanıcı hedefi için gereksiz render / fetch / listener / interval / paralel akışların azaltılması

## 5) Yeni sohbet için ilk cümle

Repo şu an post-M66 functional durumda. M66 operasyonel reassignment çekirdeği ve verification pack'i eklendi. Ancak M59–M66 için baştan aşağı kontrol, saha testi ve sonrasında derin repo cleanup fazına geçmemiz gerekiyor. Öncelik artık eksik fonksiyonel noktaları kapatmak, sonra canlı doğrulama ve ardından duplicate/legacy/dead code temizliği yapmak.

- Parent invite ve personel/öğrenci public link süre presetleri 1 hafta / 1 ay / 6 ay / 1 yıl.

## M56 -> M58 markerları
- M56 KVKK MATRIX + ETA QUALITY PACK PASS OK
- M58 hazirlik komutu: `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`
- M58 resmi green değildir; manuel pilot kabul / saha kabul gerekir.

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
