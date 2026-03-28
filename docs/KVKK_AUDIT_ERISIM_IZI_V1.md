# KVKK AUDIT VE ERİŞİM İZİ V1

Tarih: 2026-03-28  
Durum: M77.1 content-foundation

## Amaç
Bu dosya hangi aksiyonların audit izine düşmesi gerektiğini ve bu izin kimlere hangi seviyede açılacağını toplar.

## 1) Temel kural
- Her kritik yazma işlemi audit izine düşmeli.
- Her export / toplu görünürlük / retention tetikleme işlemi ayrıca auditlenmeli.
- Audit izi var diye ham kişisel veri herkes tarafından görülmez.

## 2) Zorunlu audit başlıkları
- login / şüpheli auth denemeleri
- KVKK belge kabul / geri alma
- kullanıcı oluşturma / kapatma / şifre sıfırlama
- parent-child bağlama / çözme
- vardiya onay / atama / başlat / tamamlama
- sürücünün telefon GPS'i ile ilgili kritik state değişimleri
- retention run / export / admin log erişimi
- sözleşme / teklif / karar akışı

## 3) Görünürlük seviyesi
| İz türü | SUPER_ADMIN | ROOM | COMPANY / SCHOOL / ORGANIZATION | DRIVER | PERSONEL | PARENT |
|---|---|---|---|---|---|---|
| sistem audit özeti | evet | hayır | hayır | hayır | hayır | hayır |
| kendi scope operasyon audit'i | evet | evet | sınırlı özet | hayır | hayır | hayır |
| kendi aksiyonunun sonucu | evet | evet | evet | sınırlı | sınırlı | sınırlı |
| ham meta / IP / UA | sınırlı ops | hayır | hayır | hayır | hayır | hayır |

## 4) Meta alanı kuralı
`AuditLog.meta` içine şu alanlar ham şekilde yığılmamalıdır:
- tam ev adresi
- tam GPS geçmişi
- token / pin / TOTP / secret
- export edilen ham kişi listesi

Gerekirse meta içinde yalnız referans kimliği, sayım veya maskelemiş özet tutulur.

## 5) Export ilkesi
- export erişimi ayrıcalıklı işlemdir
- export çağrısı ayrıca auditlenir
- export içeriğinde rol dışı kişi verisi otomatik maskelenir
- export dosya adı, tarih, çağıran kullanıcı ve filtre özeti iz bırakır

## 6) M77.1 çıkışı
Bu belge ile audit tarafı sadece "log var" düzeyinde değil; görünürlük ve maskeleme kuralı düzeyinde tanımlanmış olur.
