# RUNBOOK — PANELDEN SUPER ADMIN'E GERI BILDIRIM HUNISI

Bu runbook, tum panel ailelerinden Super Admin tarafina tek bir gorus / oneri / sikayet akisinin nasil acilabilecegini tanimlar.

## Hedef
- daginik panel notlarini tek kayit akisina almak
- rol ve yuzeye gore geri bildirim yogunlugunu gormek
- Super Admin icin tek bir inceleme / durum guncelleme noktasi acmak

## Mevcut zemin
- store:
  - `backend/src/ops/fieldFeedbackLoop.js`
- route:
  - `backend/src/routes/pilotLaunchGate.js`
- mevcut Super Admin yuzeyi:
  - `web/src/panels/superadmin/PilotLaunchGatePanel.jsx`

## Bugunku gercek
Su an mevcut kayit modeli zaten asagidaki rolleri kabul ediyor:
- `SUPER_ADMIN`
- `ROOM`
- `COMPANY`
- `DRIVER`
- `PERSONEL`
- `PARENT`

Bu nedenle sifirdan yeni bir geri bildirim omurgasi acmak yerine, mevcut M84 kayit modeli genisletilmelidir.

## Onerilen minimum urun yonu
Her ana panel ailesine tek bir mini buton veya drawer girisi eklenir:
- `Gorus bildir`
- `Oneri gonder`
- `Sikayet / sorun bildir`

Ilk kapsam icin bu giriler `#/room/drivers` ve `#/company/access-links` gibi yuzeylerde de gorunur; böylece geri bildirim akisi tek bir Super Admin kuyruğuna toplanir.

## Onerilen alanlar
- `title`
- `detail`
- `reportedByRole`
- `surface`
- `relatedPath`
- `severity`
- `tags` icinde category izi

## Onerilen category degerleri
- `GORUS`
- `ONERI`
- `SIKAYET`
- `SAHA_SORUNU`
- `UX_NOTU`

## Bugunku minimum urun kapsami
- `ROOM`
- `COMPANY`
- `DRIVER`
- `PERSONEL`
- `PARENT`
- `SUPER_ADMIN`

## Yonetim modeli
- ilk fazda mevcut `PilotLaunchGatePanel` icindeki M84 bolumu inbox gibi kullanilir
- ikinci fazda ayri bir `SuperAdmin Feedback Inbox` paneli acilabilir

## Kural
- local state notu resmi geri bildirim yerine gecmez
- kayit backend tek kaynak gerceklik olarak tutulur
- durum akisi M84 ile ayni kalir: `GORULDU -> TEKRARLANDI -> COZULDU -> KAPANDI`

## Neden bu yon
- yeni veri modeli acmadan ilerler
- mevcut M84 altyapisini yeniden kullanir
- panel-geneli geri bildirim ihtiyacini minimum riskle acar
