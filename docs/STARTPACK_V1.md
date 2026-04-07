# STARTPACK V1

Tarih: 2026-04-07  
Repo: `servis-platform`  
Amaç: Bu dosya, projenin güncel çalışma kurallarını, aktif milestone hattını ve değişmez mimari kararlarını tek yerde toplar.

## 1) Güncel resmi durum
- Tarihsel saha hazırlık / go-no-go hattında `M59` gozlemleme ile baslar, `M65` launch gate ile saha oncesi karar verilir.
- Bu hatta kanonik girislerden biri `tools\pack_m59_observability_field_diagnostics.ps1` komutudur.
- Saha testi prensibi: **Saha testi M65 ve sonraki green kapilar gorulmeden acilmaz; son karar kullanicidadir.**
- Tarihsel son tam master referansı: `M0→M79`.
- Repo üstünde bunun üstüne gelen yaşayan hat mevcut:
  - `M80`, `M80.1`, `M80.2`, `M80.3`
  - `M81`
  - `M82.1`, `M82.8`, `M82.9`, `M82.10`, `M82.11`
  - `M83`, `M84`, `M85`, `M86`, `M87`, `M88`, `M89`
- Bu üst hat için pack/check/runbook dosyaları repo içindedir.
- Living static/runtime/master doğrulama zinciri bu yaşayan hat için yeniden koşturulmaktadır.

## 2) Değişmez ürün ve mimari kuralları
1. Backend tek kaynak gerçekliktir.
2. Web ve mobile, backend kontratına bağlı istemci katmanlarıdır.
3. Ürün yalnız personel servisi değildir; okul/öğrenci/veli ve company/organization/personel alanlarını birlikte taşır.
4. Marka dili dış anlatımda **Vardis** olarak korunur.
5. Ticari akış ile operasyon akışı aynı omurgada ama ayrı bilinçli katmanlar olarak ele alınır.
6. Araç GPS'i varsa birinci kaynak, sürücünün telefon GPS'i fallback kaynağıdır.
7. Ürün kodu geri alınmaz; check/pack/runbook/docs yeni gerçeğe uydurulur.
8. Overlay standardı tek zip / tek kök / nested root yok şeklinde korunur.
9. Büyük dosyalar kontrollü biçimde bölünür; modülerlik ertelenen kozmetik iş değil, sürdürülebilirlik işidir.
10. Repo hijyen hattı dosya silme aracı değil; kanonik düzen ve senkron denetim hattıdır.

## 3) Link TTL / preset senkronu
- `STARTPACK_PARENT_TTL_PRESETS_V1`
- Veli Erişimi presetleri: **1 gün / 1 hafta / 1 ay / 6 ay / 1 yıl**
- Veli Erişimi backend üst sınırı: **365 gün**
- `STARTPACK_PUBLIC_LINK_TTL_PRESETS_V1`
- Personel/öğrenci public canlı link presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**
- Personel/öğrenci public canlı link backend üst sınırı: **365 gün**
- Personel/öğrenci public canlı linklerinde hard shift-end clamp zorlaması yoktur.

## 4) Ticari omurga kuralları
1. Ödeme omurgası yalnız agreement'e kilitlenmez.
2. İlk ticari kaynak tipleri:
   - `AGREEMENT`
   - `SHIFT_SERIES`
3. Kısa süreli 5 günlük iş gibi durumlarda ticari kaynak `SHIFT_SERIES` olabilir.
4. Payment mode üç kademelidir:
   - `OFF`
   - `OPTIONAL`
   - `REQUIRED`
5. Komisyon oranı Super Admin tarafından yönetilir.
6. Komisyon ilk aşamada:
   - global varsayılan
   - oda bazlı override
   mantığında çalışır.
7. Ticari kaynak oluşturulduğu anda payment/commission snapshot alınır.
8. Sonradan oran değişse bile eski ticari kayıt bozulmaz.

## 5) Güncel aktif sıra
- Tarihsel kalite kapisi referansi: `M59` gozlemleme -> `M60` saha kabul merkezi -> `M63` guven + kalite + hizmet degerlendirme -> `M65` pilot launch gate
- Tarihsel rota notu: `M63 baslangic notu` sonrasinda `M66 operasyonel reassignment`, daha sonra `M75 green baseline` referansi ayni omurganin ileriki kapilaridir.
- `M82.1` Backend correctness kilidi
- `M82.8` Verification 2.0
- `M82.9` Dormant payment backbone (`AGREEMENT | SHIFT_SERIES`)
- `M82.10` Super Admin ticari ayarlar
- `M82.11` Payment readonly ticari yüzey
- `M83` Saha hazırlık paketi
- `M84` Saha gözlem / geri bildirim döngüsü
- `M85` Ödeme opsiyonel pilot
- `M86` Ödeme zorunlu rollout
- `M87` Ödeme hesabı hazırlığı
- `M88` Settlement operasyon masası
- `M89` Settlement mutabakat masası

## 6) Kanonik komut yaklaşımı
Not: Tarihsel pack komutları repo içinde korunur; yaşayan repo hattı için kanonik üst komutlar artık 89 tavanına göre okunur.
- `tools\pack.ps1 -To 89`
- `tools\pack_living.ps1 -To 89`
- `tools\verify_living_static.ps1`
- `tools\verify_living_runtime.ps1 -To 89`
- milestone bazlı kontrollü pack

## 7) Bu dosya ile birlikte okunacak ana belgeler
- `docs/PRIMER_SSOT.md`
- `docs/MILESTONE_REGISTRY_V1.md`
- `docs/KABUL_KRITERLERI_10_10_VARDIS.md`
- `tools/PRIMER_SNAPSHOT.md`
- `tools/CHECKLIST_SSOT.md`

## 8) Tools hijyen ve verify notu
- `STARTPACK_TOOLS_HYGIENE_V1` markerı bu dosyada bilinçli olarak tutulur.
- `repo/tools` hijyen check zinciri, kanonik tools kökü ile STARTPACK metninin senkron kalmasını bekler.
- Ana doğrulama akışında `tools/check_tools_hygiene_m105.ps1`, `tools/check_repo_hygiene_m106.ps1`, `tools/verify_living_static.ps1` ve `tools/verify_living_runtime.ps1` birlikte okunmalıdır.


- M90 — Living Verification & Acceptance Convergence (hazırlık / check-pack-acceptance hizası)
