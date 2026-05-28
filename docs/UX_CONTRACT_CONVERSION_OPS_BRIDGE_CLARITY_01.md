# UX_CONTRACT_CONVERSION_OPS_BRIDGE_CLARITY_01

## Problem

Company tarafında `Vardiyayı sözleşmeye dönüştür` aksiyonu kullanıcıyı liste ekranında bırakmamalı. Aynı zamanda Room / Operasyon Köprüsü fazla kalabalık görünmemeli; kullanıcı ilk bakışta ne oldu, risk ne ve sıradaki işlem ne sorularının cevabını hızlı almalı.

## Hedef

- `Vardiyayı sözleşmeye dönüştür` aksiyonu doğrudan sözleşme yazım / taslak ekranını açar.
- Seçili vardiya bağlamı taslağa taşınır.
- Room Operasyon Köprüsü summary-first görünür.
- Detaylar varsayılan olarak accordion / drawer altında saklanır.
- Kullanıcı ilk 5 saniyede karar özetini ve sıradaki işlemi görür.

## Company Akışı

- Vardiya seçildiğinde `Sözleşmeye Dönüştür` aksiyonu doğrudan sözleşme hazırlık ekranını açar.
- Liste ekranında bırakmaz.
- Taslakta görünür olması gereken alanlar:
  - şirket / firma
  - başlangıç / bitiş
  - rota / bölge
  - araç / sürücü
  - teklif / pazarlık bilgisi
  - kabul / dispatch durumu
- Kullanıcıya net yönlendirme verilir:
  - `Sözleşme taslağını gözden geçir`
  - `Eksik alanları tamamla`
  - `Onaya hazırla`

## Room Akışı

- Operasyon Köprüsü kısa karar kartı olarak açılır.
- Üstte kısa karar, durum, risk ve sıradaki işlem görünür.
- Detaylar gerektiğinde `Detayı aç` ile görünür.
- Son kayıt varsa `Operasyon kaydını aç` aksiyonu kullanılabilir.
- Sözleşme hazırlığı, teklif / pazarlık, kanıt / kalite ve geçmiş detayları varsayılan olarak açık gelmez.
- Detaylar gerektiğinde açılır.

## Summary-First Yapı

- Kim?
- Ne değişti?
- Ne kadar etki var?
- Risk var mı?
- Sıradaki doğru işlem ne?

## Detay Görünüm

- Eski / yeni kayıt bağlantıları
- Rota / dispatch detayları
- Teklif / pazarlık detayları
- Kanıt / kalite detayları
- Tarihçe / geçmiş

## Readonly Sınırı

Bu milestone yalnızca yönlendirme ve görünüm sadeliği sağlar.

- payment execute yok
- billing execute yok
- collection execute yok
- contract execute/sign yok
- invite send yok
- user create yok
- supplier verification auto yok
- settlement execute yok
