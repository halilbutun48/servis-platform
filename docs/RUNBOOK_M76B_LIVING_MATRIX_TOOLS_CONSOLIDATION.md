# RUNBOOK — M76B LIVING MATRIX + TOOLS CONSOLIDATION

> Tarihsel not: Bu runbook M76B anindaki canonical varsayilanlari anlatir. Guncel yasayan varsayilanlar icin `tools/repo_contract_state.json`, `tools/README.md` ve `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md` baz alinmalidir.

## Amaç
Bu adımın amacı bütün pack/check dosyalarını tek seferde taşımak değildir. Amaç, yaşayan doğrulama girişlerini klasör altında toplamak ve dışarıda yalnızca sade kanonik komutlar bırakmaktır.

## M76B anındaki kanonik girişler
- `tools\pack.ps1 -To 75 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild`

## Guncel okuma notu
- Bu komutlar tarihsel M76B baglamini anlatir.
- Guncel yasayan rota icin `-To 89` hatlari kullanilir.
