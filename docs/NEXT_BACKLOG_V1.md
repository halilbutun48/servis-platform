# NEXT BACKLOG V1

Tarih: 2026-03-20
Timezone: Europe/Istanbul

Current direction: **post-M66 functional -> full M0-M66 rerun -> live smoke -> field validation -> deep repo cleanup**

## 1) Resmi durum
- `M59 -> M65` green taban mevcut
- `M66` fonksiyonel çekirdek mevcut
- Tam milestone kapanışı için `M59 -> M66` yeniden kontrol gereklidir
- Büyük cleanup / duplicate / dead code / performance sadeleştirmesi henüz yapılmadı

## 2) Hemen sonraki ana faz
1. `M0 -> M66` master pack ile baştan sona yeniden koşum
2. eksik fonksiyonel noktaların kapatılması
3. canlı smoke / saha akışı doğrulaması
4. derin repo cleanup
5. performans ve ölçek hazırlığı

## 3) Kanonik komutlar
- `tools\pack.ps1 -To 66 -RepoDir D:\servis-platform -NoBuild`
- `tools\reset-and-pack.ps1 -To 66 -NoBuild`
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`

## 4) Cleanup fazında odak alanları
- duplicate pack/check iskeletleri
- legacy / orphan adayları
- dead code
- gereksiz listener / interval / duplicate fetch yüzeyleri
- archive/live gölge dosya çiftleri
- backend/frontend/mobile tarafında gereksiz yük üreten paralel akışlar

## 5) İlk cümle
Repo şu an post-M66 functional durumda. M66 operasyonel reassignment çekirdeği ve verification pack'i eklendi. Ancak M59–M66 için baştan aşağı kontrol, saha testi ve sonrasında derin repo cleanup fazına geçmemiz gerekiyor.

## M57 -> M58 geçiş markerları
- M57 green
- M57.4 Android preview/internal build disiplini green
- Sonraki adım M58.
- M58 hazirlik komutu: `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`
- pilot kabul formu ile GO / NO-GO kararı verilir.

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
