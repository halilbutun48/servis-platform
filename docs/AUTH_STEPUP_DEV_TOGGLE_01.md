# AUTH STEPUP DEV TOGGLE 01

Tarih: 2026-05-25  
Repo: `servis-platform`

## Amaç

Local/dev/test ortamlarında TOTP / step-up davranışını tek bir merkezî env toggle ile açıp kapatmak.

## Davranış

- `STEP_UP_ENABLED=0`
  - Step-up kontrolleri devre dışı kalır.
  - `STEP_UP_REQUIRED` üreten guard'lar bypass edilir.
  - ROOM / SUPER_ADMIN / COMPANY ve step-up korumalı diğer yüzeylerde ek doğrulama istenmez.

- `STEP_UP_ENABLED=1`
  - Mevcut step-up davranışı korunur.
  - ROOM, SUPER_ADMIN ve step-up korumalı diğer yüzeylerde guard çalışır.

- `STEP_UP_ENABLED` tanımsızsa
  - Güvenli default olarak step-up açık kabul edilir.

## Kullanım

- Local/dev/test için geçici bypass:
  - `STEP_UP_ENABLED=0`
- Tekrar korumalı moda dönüş:
  - `STEP_UP_ENABLED=1`

## Güvenlik sınırı

- TOTP sistemi silinmez.
- Production için kalıcı bypass eklenmez.
- Role bazlı gizli bypass eklenmez.
- Hardcoded bypass eklenmez.
- `.env` dosyası commit'e alınmaz.

## Out-of-scope

- TOTP'yi uygulamadan kaldırma
- Production bypass
- Role bazlı gizli bypass
- Audit / security sistemini silme

