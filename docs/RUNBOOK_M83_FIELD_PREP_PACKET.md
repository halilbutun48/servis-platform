# RUNBOOK — M83 SAHA HAZIRLIK PAKETI

Bu runbook, M82 sertlestirme hattindan sonra sahaya plansiz cikmamak icin acilan **M83 saha hazirlik paketi** kapsam sinirini tanimlar.

## Amac
- saha gununu kaotik degil kontrollu yapmak
- canli ortam / release / rol / cihaz on kontrollerini tek ekranda toplamak
- operatorun hangi adimi hangi sirayla kosacagini sade dille vermek
- saha test senaryolarini daginik not olmaktan cikarmak

## Kapsam
- `Sahaya Cikis Kontrolu` panelinde saha hazirlik paketi gorunurlugu
- canli ortam ve release kontrol listesi
- operator uygulama sirasi
- gercek saha senaryo listesi
- rol ve cihaz checklisti
- backend check + tools pack hatti

## Bu milestone neyi yapmaz
- gercek saha testini kendisi kosmaz
- otomatik GO karari vermez
- mobil build pipeline'ini burada yeniden kurmaz
- M84 geri bildirim siniflamasini acmaz

## Kanonik komutlar
- `tools\pack_m83_field_prep_packet.ps1 -RepoRoot D:\servis-platform`
- `cd backend && npm run m83check`

## Beklenen sonuc
- Super Admin, saha gunu oncesi tek ekranda bloklari, uyarilari ve operator sirasini gorur
- Driver / Room / Company / Super Admin icin minimum hazirlik checklisti okunur
- release/env ve cihaz kontrolu manuel teyit gerektiren alanlarla birlikte acikca listelenir

## Kabul notu
- M83 green olsa bile bu dogrudan gercek saha testinin bittigi anlamina gelmez
- yine de plansiz saha cikisini engelleyen hazirlik paketi olusur
- sonraki dogru blok `M84 saha gozlem / geri bildirim dongusu` olur
