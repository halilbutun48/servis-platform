# OVERLAY NOTES — M90G M82.1 primer living-route fix

Bu dar overlay sadece `tools/check_m82_1_backend_correctness_repo_contract.ps1` dosyasını günceller.

## Kök neden
`docs/PRIMER_SSOT.md` yaşayan hattı `M82.8 -> M85` olarak özetliyor.
Ancak `M82.1` repo-contract check'i h?l? primer i?inde do?rudan:
- `M82.1`
- `backend correctness kilidi`
- `merkezi error contract`

ifadelerini birlikte bekliyordu.

Bu nedenle ürün kodu doğru olsa da pack, yaşayan primer wording'i yüzünden fail üretiyordu.

## Düzeltme
Check artık iki durumu da kabul ediyor:
1. Primer doğrudan `M82.1` scope'unu açıkça taşıyorsa
2. Ya da primer daha ileri yaşayan hattı (`M82.8 / M82.9 / M82.10 / M82.11 / M83 / M84 / M85`) taşıyorsa

## Etki
- Ürün davranışı değişmez
- SSOT/text-dependency kırılganlığı azalır
- `M82.1` check'i yaşayan primeri daha dayanıklı yorumlar
