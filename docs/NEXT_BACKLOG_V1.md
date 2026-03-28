# NEXT BACKLOG V1

Tarih: 2026-03-27
Timezone: Europe/Istanbul

Current direction: **M75 living baseline -> M76A/M76B normalizasyon + tools consolidation -> living rerun -> smoke -> cleanup -> KVKK/uyum**

## 1) Resmi durum
- `M75` yaşayan teknik taban olarak kabul edilir.
- Eski hatların tamamı güncel repo üzerinde tek tek yeniden doğrulanmış varsayılmaz.
- Önce living matrix kurulacak, sonra kontrollü rerun yapılacaktır.

## 2) Hemen sonraki ana faz
1. `M76A-1` minimum normalizasyonu sabitle
2. `M76B` living matrix + tools consolidation katmanını kur
3. `M0 -> M75` için yaşayan static doğrulamayı çalıştır
4. `M0 -> M75` için yaşayan runtime doğrulamayı çalıştır
5. çıkan gerçek kırıkları güncel repoya göre düzelt
6. derin cleanup / duplicate / dead code / performans sadeleştirmesine geç

## 3) Kanonik komutlar
- `tools\pack.ps1 -To 75 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild`
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`

## 4) Cleanup fazında odak alanları
- duplicate pack/check iskeletleri
- legacy / orphan adayları
- dead code
- gereksiz listener / interval / duplicate fetch yüzeyleri
- archive/live gölge dosya çiftleri
- backend/frontend/mobile tarafında gereksiz yük üreten paralel akışlar

## 5) İlk cümle
Repo şu an M75 living baseline üstünde duruyor. Önce yaşayan doğrulama matrisi ve tools konsolidasyon girişi kurulacak; sonra M0–M75 static/runtime rerun ile gerçek kırıklar ölçülecek ve cleanup buna göre yapılacak.

## Tarihsel uyumluluk notu
- `M58 — Final Pilot Readiness` komutu: `tools\pack_m58_final_pilot_readiness.ps1`
- M58 kapanışı tarihsel pilot kapısıdır; yaşayan rota artık M75 baseline ve M76A/B normalizasyon hattıdır.

M63 guven + kalite + hizmet degerlendirme rotasi aktif. Komut: .\tools\pack_m63_trust_quality_service_evaluation.ps1 -RepoRoot .

- m63 - guven + kalite + hizmet degerlendirme
- komut: .\tools\pack_m63_trust_quality_service_evaluation.ps1 -RepoRoot .

- m64 - dogal copilot katmani


- M76A-2 final normalization ve archiving
- Komut: .\tools\pack_m76a_2_final_normalization_archiving.ps1 -RepoRoot .
