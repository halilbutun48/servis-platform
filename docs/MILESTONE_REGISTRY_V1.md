# MILESTONE REGISTRY V1

## Aktif kanonik hat
- M75 - living baseline
- M76A-1 - minimum normalization
- M76B - living matrix + tools consolidation
- M76A-2 - final normalization + archiving
- M77 - KVKK + Uyum Katmanı - response-hardening + retention/export-trail-enforcement

## Compatibility marker notu
- M75 - green-baseline
- M76A-1 - minimum-normalization - active


## M77.1 notu
- M77.1 rol/business domain ayrımını yazılı hale getirir
- görünürlük matrisi, aydınlatma envanteri, retention ve audit izi kanonik belge olur

## M77.2 notu
- M77.2 enforcement skeleton ile parent child, canlı araç ve session meta yüzeyi ilk helper katmanına bağlanır
- live vehicle GPS masking ve me/sessions IP-UA masking burada görünür hale gelir

## M77.3 notu
- M77.3 payload daraltma / redaction turudur
- school domain davet yüzeyi masked hale gelir
- company kind SCHOOL listelerinde iletişim alanı daraltılır
- rol/business domain çizgisi log/export redaction katmanına taşınır

## M77.4 notu
- M77.4 role/payload response daraltma turudur
- auth invite, vehicle, shift ve export filtre yüzeyleri daha sert daraltılır

## M77.5 notu
- M77.5 retention / export trail enforcement turudur
- retention run, log export ve admin log export audit izi sanitize helper üstünden yazılır
- `GET /api/kvkk/retention` policy + anonymize hedeflerini görünür hale getirir
