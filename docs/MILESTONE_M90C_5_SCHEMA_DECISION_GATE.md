# M90C.5 — SCHEMA.PRISMA DECISION GATE

Amaç: `backend/prisma/schema.prisma` için “bölelim mi / exception mı?” belirsizliğini kapatmak.

## Karar
- `backend/prisma/schema.prisma` M90 hattında **justified exception** olarak korunur.
- Bu dosyada sırf satır sayısı düşsün diye path/split refactor yapılmayacaktır.
- Bu karar, schema üzerinde çalışma yasağı değildir.

## Gerekçe
- Şema tek dosyada migration, seed ve Prisma client üretiminin ortak sözleşmesidir.
- Repo-contract ve check hattında schema tek path üzerinden okunmaktadır.
- Tarihsel olarak schema üzerinde onarım/hotfix geçmişi vardır; kapanış hattında yapısal split riski yüksektir.
- M90 kapanışı yeni acceptance değeri üretmek yerine kanonik repo hizasını korumayı hedefler.

## İzin verilen değişiklikler
- migration-safe model/alan/enum ekleri
- relation / index / constraint tamiri
- acceptance-safe lokal şema düzeltmeleri
- gerekli olduğunda yeni migration ile desteklenen kontrollü genişleme

## Bu hatta yapılmayacaklar
- sırf line-count için schema split
- tool/check/doc hattını yeni path düzenine zorlayacak geniş refactor
- M90 kapanışında migration/seed/client akışını gereksiz yere yerinden oynatma

## Yeniden değerlendirme tetikleyicileri
- M90 sonrası planlı tooling hazırlığı
- split için açık kabul değeri üreten ihtiyaç
- repo-contract/check hattının önceden yeni yapıya hazırlanması
- schema üzerinde domain-bazlı gerçek sahiplik ve bakım ihtiyacının netleşmesi

## Sonraki resmi iş
- `M90C.6 — hot-file queue policy`
