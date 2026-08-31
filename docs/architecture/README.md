# Architecture docs

The canonical engineering entrypoint is [../INDEX.md](../INDEX.md). This folder contains the architecture and codebase maps owned by #16.

Bu klasor, PERSONEL SERVIS V1 icin mimari ve is akisi dokumanlarini toplar.

## Giris noktasi
- `../SYSTEM_ARCHITECTURE_V1.md` — katmanli sistem mimarisi (kanonik ana belge)

## Konsolide is akisi girisi
- `workflows/WORKFLOW_OVERVIEW_V1.md` — uc'tan uca ortak is akisi
- `workflows/roles/ROLE_WORKFLOW_SUPER_ADMIN_V1.md` — ust rol akis detayi
- `workflows/roles/ROLE_WORKFLOW_ROOM_V1.md` — operasyon merkezi rol akisi
- `workflows/roles/ROLE_WORKFLOW_COMPANY_V1.md` — sirket rol akisi
- `workflows/roles/ROLE_WORKFLOW_DRIVER_V1.md` — surucu rol akisi
- `workflows/roles/ROLE_WORKFLOW_PERSONEL_V1.md` — personel rol akisi

## Amaç
Bu agaç, su iki ihtiyaci birlikte karsilar:
- sistemin teknik yapisini sade ve gorsel anlatmak
- rol rol operasyon akisini repo icinde kalici tutmak

## Not
`workflows/README.md` ve `workflows/roles/README.md` katmanlari bu dosyada birlestirildi.
Alt klasorlerde asil icerik ayrik kalir; sadece ara README katmani kaldirildi.
