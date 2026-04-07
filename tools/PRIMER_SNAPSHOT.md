# PRIMER SNAPSHOT

Tarih: 2026-04-07

## Aktif durum
- Tarihsel son tam master referansı: `M0→M79`
- Repo üstünde yaşayan hat: `M80 → M89`
- Living verify zinciri yeniden koşturuluyor

## Link TTL / preset özeti
- `TTL_PRESETS_PARENT_PUBLIC_LINKS_V1`
- Veli Erişimi ve personel/öğrenci public link süre presetleri `1 gün / 1 hafta / 1 ay / 6 ay / 1 yıl`.
- Backend maksimum TTL: `365 gün`.
- Personel/öğrenci public linklerinde shift-end clamp zorlaması yok; `ttlDays` doğrudan `expiresAt` üretir.

## Güncel yaşayan sıra
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

## Ticari omurga özeti
- paymentMode: `OFF | OPTIONAL | REQUIRED`
- ticari kaynak: `AGREEMENT | SHIFT_SERIES`
- komisyon: global + oda bazlı override
- snapshot: ticari kaynak anında alınır


## M82.1 resmi pack yolu
- `tools\pack.ps1 -To 82`
- `tools\pack_m82_1_backend_correctness.ps1 -RepoRoot D:\servis-platform`


## M80-M83 yaşayan komut notu
- M80.1 hot panel daraltma
- M80.2 agreements + shifts giriş yükü
- M80.3 geo review + shifts son giriş yükü
- M80 final sert kabul yük güveni
- M81 mobil saha sertleştirme
- M82.8 Verification 2.0
- M83 saha hazırlık paketi
- m83check

## Kanonik doğrulama
- `tools\pack.ps1 -To 89`
- `tools\pack_living.ps1 -To 89`
- `tools\verify_living_static.ps1`
- `tools\verify_living_runtime.ps1 -To 89`

## Tarihsel not
- `M79` historical compatibility korunur.
- `M80→M89` repo içi yaşayan hat olarak ayrıca görünür tutulur.


- M90 — Living Verification & Acceptance Convergence (hazırlık / check-pack-acceptance hizası)

## Tarihsel rota notu
- `M59` gözlemleme + saha teşhis rotası yaşayan tarihsel kalite hattında görünür tutulur.
- Resmi pack yolu: `tools\pack_m59_observability_field_diagnostics.ps1`
- Saha testi için kesin kapı: `M65`
- Tarihsel güvenli referans: `M75 green baseline`
