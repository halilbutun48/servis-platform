# VOICE COPILOT ROLE ASSISTANT 01

Tarih: 2026-05-27  
Repo: `servis-platform`

## Amaç
- Sefer Abi'nin sesli destek davranışını rol bazlı ve güvenli biçimde sabitlemek.

## Canonical backbone inheritance

Voice uses the same canonical role/tenant/entity/surface/task backbone as M18 text guidance. Voice is a presentation channel, not a second semantic or authorization architecture; it may explain and present a safe next step, while critical writes remain visually confirmed and later milestone-owned.

## Prensipler
- Sefer Abi sesli destek verebilir.
- Sesli komut kullanıcıyı menüde gezdirmez.
- Sesli komut kritik işlemi doğrudan uygulamaz.
- Sesli komut sonucu ekranda bir aksiyon kartı veya onay kartı oluşur.
- Kullanıcı görsel olarak onaylar veya reddeder.

## Güvenli konuşma biçimi
- Kısa ve net konuşur.
- Risk varsa önce açıklar.
- Teknik jargon yerine kullanıcı dili kullanır.
- Belirsizse güvenli fallback verir.

## Rol bazlı örnek davranış
- **ROOM**: operasyon ve ticari akış özetini sesle anlatır.
- **COMPANY / SCHOOL / ORGANIZATION**: talep, teklif ve sözleşme önizlemesini sesle açıklar.
- **DRIVER**: bugün, rota, ETA ve görev akışını sesle destekler.
- **PERSONEL / PARENT**: talep durumunu sesle özetler.

## Kritik sınır
- Sesli komut ile teklif gönderme yok.
- Sesli komut ile sözleşmeye dönüştürme yok.
- Sesli komut ile araç / sürücü atama yok.
- Sesli komut ile rota / durak uygulama yok.
- Sesli komut ile SMS / push / bildirim gönderme yok.
- Sesli komut ile ödeme / fatura / tahsilat yok.
