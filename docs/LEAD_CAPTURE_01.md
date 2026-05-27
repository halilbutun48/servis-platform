# LEAD-CAPTURE-01 — kontrollü public lead toplama

Bu milestone, public landing üzerinden gelen CTA'ları kontrollü lead toplama akışına bağlar. Amaç, ziyaretçiden yalnızca güvenli ve sınırlı başvuru bilgisi almak; otomatik üyelik, ödeme veya operasyon başlatmadan Super Admin inceleme kuyruğu hazırlamaktır.

## Amaç
- Demo talebi almak.
- Canlı destek veya iletişim talebi almak.
- Servis ihtiyacını güvenli şekilde toplamak.
- Tedarikçi başvurusu niyeti bırakmak.
- Başvuruları ekip incelemesine hazırlamak.

## Public CTA -> lead form akışı
- `/#/landing` ve `/#/public/landing` üzerindeki CTA'lar lead formunu açar.
- CTA seçimi form tipini otomatik doldurur.
- Kullanıcı isterse form tipi değiştirebilir.
- Gönderim sonrası sonuç JSON olarak döner.
- Başarılı başvuruda kullanıcıya sade Türkçe başarı mesajı gösterilir.

## Lead tipleri
- `DEMO_REQUEST`
- `LIVE_SUPPORT_REQUEST`
- `SERVICE_NEED`
- `SUPPLIER_APPLICATION`

## Form alanları
### Ortak alanlar
- Ad Soyad
- Telefon
- E-posta
- Kurum / firma adı
- Rol / başvuru tipi
- İl / ilçe
- Mesaj / not
- KVKK onay checkbox
- İletişim izni checkbox

### Servis ihtiyacı ek alanları
- Hizmet türü
- Yaklaşık kişi sayısı
- Başlangıç bölgesi
- Varış bölgesi
- Servis günü / saat bilgisi
- "Personel/öğrenci listesi sonra paylaşılacak" notu

### Tedarikçi başvurusu ek alanları
- Araç sayısı
- Hizmet verdiği bölgeler
- Araç tipleri
- Yetkili kişi
- Kısa kapasite notu
- "Doğrulama sonrası davetli üyelik açılır" açıklaması

## KVKK ve validation
- KVKK onayı olmadan submit kabul edilmez.
- İletişim izni zorunlu değildir.
- `name` zorunludur.
- Telefon veya e-postadan en az biri zorunludur.
- `type` allowlist dışı değer kabul etmez.
- Mesaj uzunluğu limitlidir.
- Telefon ve e-posta basic format kontrolünden geçer.
- Input'lar normalize edilir ve HTML/script benzeri içerik temizlenir.
- Honeypot alanı ve basit server-side rate limit bot/sahte gönderiyi yumuşatır.

## Storage yaklaşımı
- Prisma migration yok.
- Yeni DB tablosu yok.
- Lead kayıtları runtime JSON store standardı ile tutulur.
- Önerilen dosya: `backend/artifacts/runtime-data/public-leads.json`
- Bu dosya commit'e alınmaz.
- Örnek lead verisi repo'ya eklenmez.

## Lead kayıt özeti
Lead kaydı pratikte şu alanları taşır:
- `id`
- `createdAt`
- `type`
- `status: "RECEIVED"`
- `source: "PUBLIC_LANDING"`
- `name`
- `phone`
- `email`
- `organizationName`
- `city`
- `district`
- `role`
- `message`
- `serviceNeed`
- `supplierInfo`
- `kvkkAccepted`
- `contactPermission`
- `ipMasked` veya `ipHash` benzeri güvenli özet
- `userAgentSummary`

## Out-of-scope
- Self-service signup
- Automatic membership
- Automatic company / school / organization hesabı
- Automatic Room / tedarikçi hesabı
- Payment / invoice / collection
- Settlement execute
- Onboarding review UI
- Supplier verification UI
- Invite sending
- Auth route değişikliği
- Prisma schema / migration

## Güvenli sınır
- Bu milestone sadece lead kaydı ve inceleme kuyruğu hazırlığı yapar.
- Otomatik hesap açma, davet gönderme veya ödeme başlatma iddiası yoktur.
- Review UI sonraki `ONBOARDING-REVIEW-01` adımına bırakılır.
