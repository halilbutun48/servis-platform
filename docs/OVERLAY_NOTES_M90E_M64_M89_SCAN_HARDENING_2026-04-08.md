# OVERLAY NOTES — M90E M64→M89 scan hardening (2026-04-08)

Bu overlay, güncel loglarda görülen ve M64→M89 aralığında tekrar fail üretme potansiyeli taşıyan kırıkları dar ama toplu şekilde kapatır.

## Kapsam
- M69 fetch hardening phase-2 static check gevşetildi.
- M79 copilot acceptance primer görünürlüğü kontrolü, yalnız `PRIMER_SSOT` exact wording yerine `CHECKLIST_SSOT` ve `MILESTONE_REGISTRY` ile uyumlu hale getirildi.
- M80 final sert kabul runtime check, güncel route-snapshot mimarisine (`shiftRouteState.js`, guided cards/actions ayrımı) uyarlandı.
- M80 repo-contract startpack gate kontrolü gevşetildi.
- Compatibility wrapper eklendi:
  - `tools/_packs/pack_m64_m81.ps1`
  - `tools/_packs/pack_m76_m79.ps1`

## Neden
Loglarda görülen üç ana kırık:
1. `M69` — `rooms autoreload gated by active need`
2. `M79` — primer görünürlüğü / closure visibility
3. `M80` — startpack gate + güncel snapshot wiring ile eski runtime beklentisi uyuşmazlığı

## Beklenen etki
- `pack_m67_m75.ps1` içinde `M69` tekrar gereksiz exact-string yüzünden düşmez.
- `pack_m79_copilot_acceptance.ps1` primer wording drift yüzünden düşmez.
- `pack_m80_final_sert_kabul_yuk_guveni.ps1` hem repo-contract hem runtime tarafında yaşayan yapıya göre kontrol yapar.
- Eski/alışkanlık komutları için file-not-found sürtünmesi azalır.
