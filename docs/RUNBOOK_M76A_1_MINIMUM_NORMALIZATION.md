# RUNBOOK — M76A-1 MINIMUM NORMALIZATION

Tarih: 2026-03-27

## Ne zaman kullanılır
- cleanup öncesi yaşayan doğrulama omurgasını netleştirmek istediğinde
- master pack'in M75 gerçeğini görüp görmediğini doğrulamak istediğinde
- SSOT yüzeylerinin post-M66 dilinde kalıp kalmadığını hızlıca toparlamak istediğinde

## Kanonik komut
- `tools\pack_m76a_1_minimum_normalization.ps1 -RepoRoot D:\servis-platform`

## Beklenen çıktı
- repo contract PASS
- `backend/scripts/m76a_1_minimum_normalization_check.js` PASS
- rapor: `artifacts/normalization/m76a_1_normalization_latest.json`

## Hızlı kontrol listesi
1. `tools\pack.ps1` görünür faz satırında `M67 -> M75 | M76A-1` görünmeli.
2. `tools\milestone_pack_manifest.json` içinde `67..76` grupları bulunmalı.
3. `docs\LIVING_BASELINE_M75.md` yaşayan omurgayı ve hedefli hotfix pack'lerini ayırmalı.
4. `tools\pack_m71_workflow_loadsummary_hotfix.ps1` artık sabit `D:\servis-platform` varsayımına dayanmamalı.

## Sonraki adım
- Bu pack green olduktan sonra sıradaki iş `M76B` cleanup fazıdır.
