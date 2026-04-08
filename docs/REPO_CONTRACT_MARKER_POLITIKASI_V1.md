# REPO CONTRACT MARKER POLITIKASI V1

## Amaç
Repo-contract check'lerinde serbest anlatım/prose bağımlılığını azaltmak ve kanonik dokümanları sabit marker'lar üzerinden doğrulanabilir hale getirmek.

## Kural
- Check script'leri mümkün olduğunca serbest cümle değil marker arar.
- Marker adları sabit ve sürümlüdür (`*_V1`).
- Prose değişebilir; marker anahtarı değişmez.
- Screenshot ana kanıt değildir; marker + state + check çıktısı önce gelir.

## Örnek marker tipleri
- `README_LIVING_ROUTE_M59_M89_V1`
- `STARTPACK_PARENT_TTL_PRESETS_V1`
- `TOOLS_README_STATE_FIRST_ROUTE_V1`
- `PROJECT_SPEC_M65_LAUNCH_GATE_V1`

## Uygulama sırası
1. Marker kanonik dosyaya eklenir.
2. Repo-contract check marker-first hale çevrilir.
3. Gerekirse legacy prose fallback uyarı seviyesinde bırakılır.
