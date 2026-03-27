# RUNBOOK — M76B LIVING MATRIX + TOOLS CONSOLIDATION

## Amaç
Bu adımın amacı bütün pack/check dosyalarını tek seferde taşımak değildir. Amaç, yaşayan doğrulama girişlerini klasör altında toplamak ve dışarıda yalnızca sade kanonik komutlar bırakmaktır.

## Kanonik girişler
- `tools\pack.ps1 -To 75 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild`

## Tools düzeni
- Faz wrapper'ları: `tools\packs\living\`
- Living check girişleri: `tools\checks\living\`
- Eski root pack/check dosyaları: uyumluluk için korunur

## Doğrulama mantığı
1. root dış girişleri sadeleştir
2. grouped living wrapper'ları oluştur
3. static repo check + M0-M66 static runner + M67-M75 static repo-contract setini bağla
4. matrix raporunu üret

## Çıkış ölçütü
- grouped living girişler vardır
- matrix raporu üretilir
- master pack M67 -> M75 fazını görür
- M76A/M76B manifestte görünür
