# AUTH-STEPUP-PROVIDER-LOCAL-DEFAULT-01

Tarih: 2026-05-26  
Kapsam: Local/dev Docker ortamında step-up davranışını merkezi provider/env toggle ile güvenli biçimde kapatıp açmak.

## Amaç
- Local/dev smoke sırasında step-up hiçbir rolde ve hiçbir işlemde kendiliğinden istemesin.
- Backend Docker container içinde env passthrough ile aynı davranış görülsün.
- TOTP sistemi silinmesin.
- İleride SMS provider seçeneği için yer hazır kalsın.

## Varsayılan davranış
- `STEP_UP_ENABLED=0` ise step-up kapalıdır.
- `STEP_UP_PROVIDER=none` ise step-up kapalıdır.
- `STEP_UP_TOTP_ENABLED=0` ise TOTP provider hazır değildir.
- Local/dev Docker için güvenli varsayılan:
  - `STEP_UP_ENABLED=0`
  - `STEP_UP_PROVIDER=none`
  - `STEP_UP_TOTP_ENABLED=0`

## Açma örneği
Local/dev smoke için step-up tekrar açmak istersen:

```env
STEP_UP_ENABLED=1
STEP_UP_PROVIDER=totp
STEP_UP_TOTP_ENABLED=1
```

Web tarafı için:

```env
VITE_STEP_UP_ENABLED=1
VITE_STEP_UP_PROVIDER=totp
VITE_STEP_UP_TOTP_ENABLED=1
```

## Kapatma örneği
Tekrar güvenli local default'a dönmek için:

```env
STEP_UP_ENABLED=0
STEP_UP_PROVIDER=none
STEP_UP_TOTP_ENABLED=0
```

Web tarafı için:

```env
VITE_STEP_UP_ENABLED=0
VITE_STEP_UP_PROVIDER=none
VITE_STEP_UP_TOTP_ENABLED=0
```

## SMS provider notu
- `STEP_UP_PROVIDER=sms` ileride provider seçimi için ayrılmıştır.
- Bu milestone'da SMS gönderimi yoktur.
- SMS provider seçili ama bağlı değilse güvenli fallback döner; fake SMS gönderilmez.

## Production güvenlik notu
- Production ortamında step-up açık veya kapalı olacaksa bu karar açık env ile yönetilmelidir.
- Production default kapalı olarak bırakılmamalıdır.
- `STEP_UP_ENABLED`, `STEP_UP_PROVIDER` ve provider'a bağlı readiness flag'leri birlikte açıkça tanımlanmalıdır.

## Out-of-scope
- TOTP kaldırma yok.
- Production bypass yok.
- Role bazlı gizli bypass yok.
- Audit / security sistemi silinmez.
- `backend/.env`, `.env`, `web/.env` commit'e alınmaz.
