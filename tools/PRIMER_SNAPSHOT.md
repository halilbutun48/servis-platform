# VARDIS / PERSONEL SERVİS V1 — PRIMER SNAPSHOT

Tarih: 2026-03-27  
Timezone: Europe/Istanbul  
Repo: `D:\servis-platform`  
Branch: `main`

## Genel durum
- Ürün sadece personel servisi değildir; okul ve kurumsal taşıma alanlarını birlikte taşıyan GPS tabanlı karma platformdur.
- M75 sonunda kurumsal ölçek + hot-path sertleştirme hattı green baseline kabul edilir.
- Ancak güncel repo üzerinde tam güven için living static + living runtime yeniden koşum gerekir.
- Aktif düzenleme hedefi: `M76A-1 minimum normalizasyon` ve `M76B living matrix + tools consolidation`.

## Kanonik komutlar
- `tools\pack.ps1 -To 75 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild`
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`

## M75 living baseline özeti
- M0 -> M41 gate PASS
- M42 -> M58 geçmiş baseline tamam
- M59 -> M66 role rollout / operasyon hattı geçmiş baseline tamam
- M67 -> M75 kurumsal ölçek ve hot-path sertleştirme hattı çalıştı
- Sert storm profilinde 429 = 0, 5xx = 0, toplam 117 adet 200 görüldü

## M76A-1 hedefi
- aktif pack envanterini görünür kılmak
- master pack / manifest hizasını düzeltmek
- minimum runbook ve helper standardını sabitlemek

## M76B hedefi
- yaşayan doğrulama matrisini tek raporda göstermek
- tools girişlerini klasör altında toplamak
- root pack/check adlarını kırmadan wrapper uyumluluğu kurmak
- tek komut static/runtime girişlerini netleştirmek

## Büyük sonraki faz
1. living static rerun
2. living runtime rerun
3. çıkan gerçek kırıkları düzeltme
4. derin cleanup / duplicate / dead code / performans sadeleştirmesi
5. KVKK / uyum / branding / checklist doğrulamaları

- Parent invite ve personel/öğrenci public link süre presetleri 1 hafta / 1 ay / 6 ay / 1 yıl.

M58 final pilot readiness için komut: .\tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot . Resmi green, saha/manual acceptance signoff sonrası kabul edilir.
