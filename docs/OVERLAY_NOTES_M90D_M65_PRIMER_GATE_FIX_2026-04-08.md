# OVERLAY NOTES — M90D M65 PRIMER GATE FIX

Tarih: 2026-04-08

## Amaç
M65 repo-contract check içinde `docs/PRIMER_SSOT.md` için yalnız eski `M65/M66` wording beklentisini kabul eden kırılgan kontrolü gevşetmek.

## Kök neden
`tools/check_m65_pilot_launch_gate_repo_contract.ps1` dosyası, primer için yaşayan `M80→M89` hattını kabul etmiyordu.
Bu yüzden ürün tarafı sağlam olsa bile `PRIMER_SSOT` içinde yalnız güncel yaşayan sıra yer alıyorsa check fail oluyordu.

## Yapılan değişiklik
- `tools/check_m65_pilot_launch_gate_repo_contract.ps1`
  - primer kontrolü artık şu iki resmi de kabul eder:
    - tarihsel `M65/M66` hattı
    - güncel yaşayan `M75/M76A-1/M77/M82.8/M83→M89` hattı

## Sınıflandırma
- Fail tipi: **3) SSOT / text-dependency / exact-string kırılganlığı**
- Ürün davranışı değişmedi.
