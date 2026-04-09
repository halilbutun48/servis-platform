# PRIMER SNAPSHOT

## Güncel baz
- Repo: `servis-platform`
- Branch: `main`
- Güncel doğrulanmış baz: `M0->M89 green`
- Tarihsel anchor: `M0->M79`
- Sonraki kontrollü iş: `M90 canonical closure`

## Repo üstünde yaşayan hat
- `M80 -> M89`

## Kısa ürün çerçevesi
- Vardis, okul/öğrenci/veli ile şirket/personel taşıma alanlarını aynı omurgada taşır.
- Konumlama: pazar + sözleşme + operasyon.
- Ödeme omurgası dormant/feature-flag mantığında ilerler.

## Resmi üst hat
1. `M82.1` Backend correctness kilidi
2. `M82.8` Verification 2.0
3. `M82.9` Dormant payment backbone
4. `M82.10` Super Admin ticari ayarlar
5. `M82.11` Payment readonly yüzey
6. `M83` Saha hazırlık paketi
7. `M84` Saha geri bildirim döngüsü
8. `M85` Opsiyonel ödeme pilotu
9. `M86` Zorunlu ödeme rollout
10. `M87` Ödeme hesabı hazırlığı
11. `M88` Settlement operasyon masası
12. `M89` Settlement mutabakat masası

## M82.1 resmi pack yolu
- `tools\pack_m82_1_backend_correctness.ps1 -RepoRoot D:\servis-platform`
- `tools\pack.ps1 -To 82 -RepoDir D:\servis-platform -NoBuild`

## M80-M89 yaşayan komut notu
- `tools\pack.ps1 -To 89 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`

## M90 yönü
- canonical markdown hizası
- state/pack/verify convergence
- tek parça script rehberi
- screenshot bağımlılığını azaltan proof reformu
- repo hijyen kapanışı

## REPO_CONTRACT_MARKERS_V1
- TOOLS_PRIMER_LIVING_ROUTE_M59_M89_V1
- TOOLS_PRIMER_ROUTE_M63_V1
- TOOLS_PRIMER_ROUTE_M64_V1
- TOOLS_PRIMER_ROUTE_M65_V1
- M75_GREEN_BASELINE_MARKER_V1
- LIVING_ROUTE_M82_TO_M89_MARKER_V1
- TTL_PRESETS_PARENT_PUBLIC_LINKS_V1

## TTL_PRESETS_PARENT_PUBLIC_LINKS_V1
- Veli erişimi ve personel/öğrenci public link presetleri marker-first okunur.
- Süre presetleri: 1 gün / 1 hafta / 1 ay / 6 ay / 1 yıl.
- Maksimum süre: 365 gün.

## TOOLS_PRIMER_WARN_CLEANUP_M90D_V1
- TOOLS_PRIMER_ROUTE_M45_RETENTION_BACKUP_V1
- TOOLS_PRIMER_ROUTE_M57_MOBILE_HARDENING_V1
- TOOLS_PRIMER_ROUTE_M60_FIELD_ACCEPTANCE_V1
- TOOLS_PRIMER_ROUTE_M62_COMMERCIAL_CORE_V1

## M47_4_MOBILE_READINESS_ROUTE_V1
- M47.3 PRODUCTION RESILIENCE + EDGE SECURITY PACK PASS OK
- M47.4 MOBILE READINESS WEB PASS
- Marker-first route: mobile readiness web pass canonical bridge after m47.3.

