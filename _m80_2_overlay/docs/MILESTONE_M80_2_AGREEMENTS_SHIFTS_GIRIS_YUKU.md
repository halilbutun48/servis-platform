# MILESTONE — M80.2 AGREEMENTS + SHIFTS GİRİŞ YÜKÜ

Tarih: 2026-04-02
Durum: aktif alt adım

## Amaç
M80 altında kalan giriş yükü sıcak noktalarını ürün davranışını bozmadan küçük ve kontrollü şekilde daraltmak.

Bu adım yeni ürün özelliği açmaz.
Bu adım yalnızca mevcut giriş yükü ve tekrar eden liste/özet isteklerini daha kontrollü hale getirir.

## Bu turdaki odak
- `AgreementsPanel` giriş yükünü eşik altına indirir
- `AgreementsPanel` tekrar eden shift-stats isteğini kısa süreli cache ile yumuşatır
- `ShiftsPanel` ticari özet yükünü tek yardımcıda toplar ve tekrar eden open-intent etkilerini sadeleştirir

## Kanonik dosyalar
- `tools/pack_m80_2_agreements_shifts_giris_yuku.ps1`
- `tools/check_m80_2_agreements_shifts_giris_yuku_repo_contract.ps1`
- `backend/scripts/m80_2_agreements_shifts_giris_yuku_check.js`
- `docs/RUNBOOK_M80_2_AGREEMENTS_SHIFTS_GIRIS_YUKU.md`

## Kanonik komut
- `tools\pack_m80_2_agreements_shifts_giris_yuku.ps1 -RepoRoot D:\servis-platform`

## Green yorumu
Bu pack geçerse:
- M80.2 daraltma seti repo içine alınmış olur
- `AgreementsPanel` giriş yükü kontrol altına alınmış olur
- `ShiftsPanel` tarafında tekrar eden özet/intent yükleri sadeleştirilmiş olur

Bu pack geçmesi yine tek başına resmi final green değildir.
