<!-- REPO_CONTRACT_MARKER milestone=M85 slug=optional-payment-pilot -->

# RUNBOOK — M85 OPSIYONEL ODEME PILOTU

Bu runbook, `M82.9 -> M82.11` dormant ticari omurgasi ve `M83 -> M84` saha hazirlik/gözlem hattindan sonra acilan **M85 opsiyonel odeme pilotu** kapsam sinirini tanimlar.

## Amac
- `OPTIONAL` moddaki ticari kaynaklari pilot secim listesinde toplamak
- Super Admin'in secili kaynaklari `READY` durumuna alip pilot kapsamina sokmasini saglamak
- gerekirse ayni kaynaklari tekrar `DORMANT` durumuna geri cekmek
- gercek charge / payout acmadan once settlement hazirlik akisini kontrollu gostermek

## Kapsam
- `CommercialCorePanel` icinde M85 opsiyonel odeme pilot bolumu
- backend tarafinda optional pilot status / candidate / activate / deactivate endpoint'leri
- readonly ticari ozetlerde optional pilot hazir/beklemede ipucu
- backend check + tools pack hatti

## Bu milestone neyi yapmaz
- gercek tahsilat baslatmaz
- webhook / reconcile / payout adapter acmaz
- `REQUIRED` rollout acmaz
- M86 zorunlu odeme rollout kararini burada tamamlamaz

## Kanonik komutlar
- `tools\pack_m85_optional_payment_pilot.ps1 -RepoRoot D:\servis-platform`
- `cd backend && npm run m85check`

## Beklenen sonuc
- OPTIONAL moddaki ticari kaynaklar listelenir
- Super Admin kaynaklari `Pilot READY yap` veya `Pilot DORMANT yap` ile yonetir
- agreement/vardiya readonly ozetleri optional pilot durumunu gorunur tasir

## Kabul notu
- M85 green olsa bile gercek para akisi acilmis sayilmaz
- bu faz yalniz kontrollu pilot secimi ve settlement hazirlik gorunurlugudur
- sonraki dogru blok `M86 zorunlu odeme rollout`tur
