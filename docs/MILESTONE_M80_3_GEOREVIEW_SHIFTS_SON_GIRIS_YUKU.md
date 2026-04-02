# MILESTONE — M80.3 GEOREVIEW + SHIFTS SON GİRİŞ YÜKÜ

## Amaç
M80 kabul kapısı, M80.1 ve M80.2 sonrası halen warning üreten `GeoReviewPanel` ve `ShiftsPanel` giriş yükünü bir kademe daha daraltmak.

## Kapsam
- `GeoReviewPanel` içindeki state/effect yoğunluğunu azaltmak
- `ShiftsPanel` içindeki düşük riskli effect yoğunluğunu azaltmak
- Ürün davranışını bozmadan son saha signoff öncesi yük yüzeyini sadeleştirmek

## Dosya seti
- `docs/RUNBOOK_M80_3_GEOREVIEW_SHIFTS_SON_GIRIS_YUKU.md`
- `tools/pack_m80_3_georeview_shifts_son_giris_yuku.ps1`
- `tools/check_m80_3_georeview_shifts_son_giris_yuku_repo_contract.ps1`
- `backend/scripts/m80_3_georeview_shifts_son_giris_yuku_check.js`

## Kabul notu
Bu pack'in geçmesi, M80.3 daraltma setinin repo içine alındığını gösterir.
Bu yine **resmi final green değildir**; M80 final kabul için ek saha/signoff gerekir.
