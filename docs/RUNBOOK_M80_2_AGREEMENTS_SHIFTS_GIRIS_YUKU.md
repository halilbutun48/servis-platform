# RUNBOOK — M80.2 AGREEMENTS + SHIFTS GİRİŞ YÜKÜ

## 1) Amaç
M80 kabul kapısı ve M80.1 daraltması sonrası, kalan giriş yükü baskısını özellikle `AgreementsPanel` ve `ShiftsPanel` üzerinde küçük ve güvenli adımlarla azaltmak.

## 2) Bu turdaki kapsam
### AgreementsPanel
- ilk liste yükü tek effect altında toplanır
- mount ve filtre etkileri ayrı ayrı aynı yükü tetiklemez
- `shift-stats` çağrısı kısa süreli anahtar-cache ile tekrar yükte yeniden POST üretmez
- liste helper TTL biraz daha genişletilir

### ShiftsPanel
- commercial summary yükü tek yardımcı ve kısa süreli cache ile yürür
- wizard sonrası auto-open niyetleri tek effect içinde toplanır
- room seçim persist + fallback seçimi aynı yerde sadeleştirilir

## 3) Kanonik komut
`tools\pack_m80_2_agreements_shifts_giris_yuku.ps1 -RepoRoot D:\servis-platform`

## 4) Beklenen işaretler
- `scale_readiness_check` içinde `AgreementsPanel` artık warn vermemeli
- `AgreementsPanel` useEffect sayısı eşik altına inmeli
- `AgreementsPanel` stats cache izi görünür olmalı
- `ShiftsPanel` commercial summary helper/cached akış kullanmalı
- `ShiftsPanel` auto intent yükleri tek effect altında toplanmış olmalı

## 5) Sınır
Bu tur yeni UI açmaz, veri modeli değiştirmez, mobil alanına geçmez, büyük refactor yapmaz.
