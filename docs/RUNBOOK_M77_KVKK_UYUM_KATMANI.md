# RUNBOOK — M77 KVKK + UYUM KATMANI

## Amaç
Bu fazın amacı KVKK/uyum tarafını tek seferde hukuki finale taşımak değildir. Amaç, M77 altında yaşayan, ölçülebilir ve koda bağlanan bir omurga kurmaktır.

## M77.1 bu turda somutlaşan içerik
- auth role ile business domain ayrımı netleştirildi
- veri görünürlük matrisi alan bazında yazıya döküldü
- aydınlatma envanterinde bugün aktif olan belge akışı ile planlanan belge akışı ayrıldı
- retention / silme / anonimleştirme yaklaşımı repo gerçekleri üstünden toplandı
- audit ve erişim izi için görünürlük + maskeleme ilkeleri yazıldı
- `/api/kvkk/matrix` tarafında `PARENT` satırı ve domain ayrımı görünür hale getirildi

## M77.2 enforcement skeleton
- `parent/children` yüzeyinde ham `phone` ve `homeAddress` yerine masked alanlar
- canlı araç payload'ında role göre GPS exact / masked ayrımı
- `me/sessions` yüzeyinde `ip` ve `userAgent` ham verilmez
- enforcement helper omurgası `/api/kvkk/matrix` içine özet olarak bağlanır

## M77.3 payload daraltma + redaction
- school domain davet listesinde email / phone masked döner
- `Company.kind = SCHOOL` için company personel listesinde açık iletişim alanı daraltılır
- `GET /api/shifts/:id/operation-events` meta alanı sanitize edilir
- `GET /api/logs/preview` ve `GET /api/logs/export` text/meta redaction uygular
- `GET /api/admin/logs/preview` ve `GET /api/admin/logs/export` ham IP / ham email göstermez

## M77.5 retention / anonymize / export trail
- `backend/src/kvkk/retention.js` ile retention ve export audit izi tek helper katmanına bağlandı
- `GET /api/kvkk/retention` ile policy + anonymize hedefleri görünür hale geldi
- `POST /api/admin/retention/run` audit meta artık sanitize özet taşır
- `GET /api/logs/export` ve `GET /api/admin/logs/export` audit izi ham filtreleri olduğu gibi tekrar yazmaz

## Bu turda özellikle yapılmayanlar
- tüm ekranlarda final metin yerleşimi
- driver/parent dışındaki roller için zorunlu consent enforcement
- tüm tablo ve endpoint'lerde final maskeleme kodu
- tüm business tablolar için çalışan DB anonymize batch job

## Yeni ana belgeler
- `docs\KVKK_VERI_GORUNURLUK_MATRISI_V1.md`
- `docs\KVKK_AYDINLATMA_ENVANTERI_V1.md`
- `docs\KVKK_RETENTION_ANONIMLESTIRME_V1.md`
- `docs\KVKK_AUDIT_ERISIM_IZI_V1.md`
- `docs\KVKK_ENFORCEMENT_YUZEYI_V1.md`
- `docs\KVKK_REDACTION_ENFORCEMENT_V1.md`
- `docs\KVKK_RETENTION_ENFORCEMENT_V1.md`
- `docs\KVKK_EXPORT_ERISIM_IZI_V1.md`

## Repo gerçeği notu
- Auth role seti: `SUPER_ADMIN / ROOM / COMPANY / DRIVER / PERSONEL / PARENT`
- `SCHOOL` ve `ORGANIZATION` ayrı login role değildir; `Company.kind` üstünden business domain olarak taşınır.
- Bugün gerçekten aktif KVKK belge enforcement'ı ağırlıklı olarak `DRIVER` ve `PARENT` için görünürdür.
- Derin KVKK işi bundan sonra payload daraltma, export redaction ve scope enforcement ile ilerleyecektir.

## Kanonik komut
- `tools\pack_m77_kvkk_uyum_katmani.ps1 -RepoRoot D:\servis-platform`

## Sonraki alt adım
1. company / room / school tarafında kalan kritik payload yüzeylerini daralt
2. admin / export / audit redaction'ı daha derin hale getir
3. retention ve anonymize işlerini tablo bazında gerçek batch/job seviyesine indir
4. export / erişim izi için oran, alarm ve gözlem katmanı ekle
5. sonra M78 checklist / operasyon doğrulama fazına geç
