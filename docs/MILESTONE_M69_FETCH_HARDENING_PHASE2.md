# M69 – Fetch Hardening Phase-2

## Hedef
Company tarafında M68 sonrası kalan ağır ilk açılış yükünü düşürmek.

## Kapsam
- ShiftsPanel reference-data lazy load
- AgreementsPanel lazy room loading
- route-preview cache reuse
- vehicles endpoint shaping (`take`, `q`)
- trust-quality items shaping (`take`, `q`, `pendingOnly`)
- service evaluation ekranında pending-first yükleme

## PASS ölçütü
- M69 static/runtime check PASS
- Repo contract PASS
- M67 tekrar koşusunda hot endpoint dağılımı daha hafif okunur hale gelmeli
