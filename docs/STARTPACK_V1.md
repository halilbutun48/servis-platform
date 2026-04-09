# STARTPACK V1

Tarih: 2026-04-08  
Repo: `servis-platform`  
Amaç: Bu dosya, projenin güncel çalışma kurallarını, aktif milestone hattını ve değişmez mimari kararlarını tek yerde toplar.

## 1) Güncel resmi durum
- Güncel doğrulanmış baz: `MASTER PACK PASS OK (M0->M89)`
- Tarihsel tam master anchor korunur: `M0->M79`
- Repo üstünde canonical üst hat kapalıdır:
  - `M80`, `M80.1`, `M80.2`, `M80.3`
  - `M81`
  - `M82.1`, `M82.8`, `M82.9`, `M82.10`, `M82.11`
  - `M83`, `M84`, `M85`, `M86`, `M87`, `M88`, `M89`
- Sonraki kontrollü iş: `M90 — Canonical Closure / 10-10 kapanış paketi`
- Living static/runtime/master doğrulama zinciri bu hat için okunur.

## 2) Değişmez ürün ve mimari kuralları
1. Backend tek kaynak gerçekliktir.
2. Web ve mobile, backend kontratına bağlı istemci katmanlarıdır.
3. Ürün yalnız personel servisi değildir; okul/öğrenci/veli ve company/organization/personel alanlarını birlikte taşır.
4. Marka dili dış anlatımda **Vardis** olarak korunur.
5. Ticari akış ile operasyon akışı aynı omurgada ama ayrı bilinçli katmanlar olarak ele alınır.
6. Araç GPS'i varsa birinci kaynak, sürücünün telefon GPS'i fallback kaynağıdır.
7. Ürün kodu geri alınmaz; check/pack/runbook/docs yeni gerçeğe uydurulur.
8. Overlay standardı tek zip / tek kök / nested root yok şeklinde korunur.
9. Büyük dosyalar kontrollü biçimde bölünür.
10. Repo hijyen hattı dosya silme aracı değil; kanonik düzen ve senkron denetim hattıdır.

## 3) Ticari omurga kuralları
1. Ödeme omurgası yalnız sözleşmeye kilitlenmez.
2. İlk ticari kaynak tipleri: `AGREEMENT`, `SHIFT_SERIES`
3. Kısa süreli işlerde ticari kaynak `SHIFT_SERIES` olabilir.
4. Payment mode üç kademelidir: `OFF`, `OPTIONAL`, `REQUIRED`
5. Komisyon oranı Super Admin tarafından yönetilir.
6. Global varsayılan + oda bazlı override birlikte çalışır.
7. Ticari kaynak oluşturulduğu anda payment/commission snapshot alınır.
8. Sonradan oran değişse bile eski ticari kayıt bozulmaz.

## 4) Proof / kabul ilkesi
- Screenshot ana kanıt değildir.
- Ana kanıt sırası: state/marker -> check çıktısı -> log/export -> panel manifest izi -> screenshot.
- Screenshot, görsel destek veya layout/regresyon kanıtı olarak tutulur.
- Metin eşleme bağımlılığı olan screenshot kabulü tek başına yeterli sayılmaz.

## 5) Güncel aktif sıra
- `M80` Final sert kabul / yük güveni
- `M81` Mobil saha sertleştirme
- `M82.1` Backend correctness kilidi
- `M82.8` Verification 2.0
- `M82.9` Dormant payment backbone (`AGREEMENT | SHIFT_SERIES`)
- `M82.10` Super Admin ticari ayarlar
- `M82.11` Payment readonly ticari yüzey
- `M83` Saha hazırlık paketi
- `M84` Saha gözlem / geri bildirim döngüsü
- `M85` Ödeme opsiyonel pilotu
- `M86` Ödeme zorunlu rollout
- `M87` Ödeme hesabı hazırlığı
- `M88` Settlement operasyon masası
- `M89` Settlement mutabakat masası
- `M90` Canonical Closure / 10-10 kapanış paketi

## 6) Kanonik okuma sırası
1. `tools/repo_contract_state.json`
2. `docs/PRIMER_SSOT.md`
3. `docs/MILESTONE_REGISTRY_V1.md`
4. `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
5. `docs/CHECKLIST_SSOT.md`
6. `docs/NEXT_BACKLOG_V1.md`

## REPO_CONTRACT_MARKERS_V1
- STARTPACK_LIVING_ROUTE_M59_M89_V1
- STARTPACK_ROUTE_M63_V1
- STARTPACK_ROUTE_M64_V1
- STARTPACK_ROUTE_M65_V1
- STARTPACK_PARENT_TTL_PRESETS_V1
- STARTPACK_PUBLIC_LINK_TTL_PRESETS_V1
- NO_FIELD_TEST_BEFORE_CONTROLLED_SIGNOFF_V1
- STARTPACK_TOOLS_HYGIENE_V1

## 7) STARTPACK_TOOLS_HYGIENE_V1
- Repo/tools hijyen check hattı marker-first okunur.
- Kanonik tools düzeni ve startpack senkronu sabit marker ile doğrulanır.

## STARTPACK_WARN_CLEANUP_M90D_V1
- STARTPACK_ROUTE_M45_RETENTION_BACKUP_V1
- STARTPACK_ROUTE_M47_4_MOBILE_READINESS_V1
- STARTPACK_ROUTE_M57_MOBILE_HARDENING_V1
- STARTPACK_ROUTE_M60_FIELD_ACCEPTANCE_V1
- STARTPACK_ROUTE_M62_COMMERCIAL_CORE_V1
