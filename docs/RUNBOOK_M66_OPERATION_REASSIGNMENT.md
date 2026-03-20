# RUNBOOK — M66 OPERATION REASSIGNMENT

## Amaç
APPROVED / ACTIVE vardiyada oda operasyon yetkisiyle araç ve/veya sürücü atamasını değiştirmek; değişikliği şirket tarafında operasyonel olay olarak görünür kılmak.

## Kapsam
- ROOM → Vardiyalar → Atamayı Değiştir
- COMPANY → Vardiyalar → Operasyon Kaydı
- reassign sonrası audit kaydı
- yeni sürücüye görev / rota paketi yenileme bildirimi
- eski sürücüye görev kaldırma bildirimi

## Kanonik akış
- Pazarlık markette biter.
- Bekleyen Talepler operasyon hazırlığıdır.
- Liste / Tüm Shiftler onaylı veya aktif işi gösterir.
- Operasyonel atama değişikliği ticari pazarlık değildir.

## ROOM akışı
1. ROOM, APPROVED / ACTIVE vardiyada `Atamayı Değiştir` açar.
2. Yeni araç ve/veya yeni sürücü seçer.
3. Neden ve opsiyonel not girer.
4. `Değişikliği Kaydet ve Paketi Yenile` ile işlemi tamamlar.

## Beklenen sistem davranışı
- Shift yeni vehicleId / driverId ile güncellenir.
- Audit log `SHIFT_REASSIGN` kaydı oluşur.
- Operation events içinde önce / sonra görünür.
- Yeni sürücüye `shift:update` ve `route:plan` gider.
- Eski sürücüye `shift:update` ve `route:plan` kaldırma sinyali gider.
- COMPANY tarafında `Operasyon Kaydı` içinde değişiklik görünür.

## Manuel smoke adımları
1. ROOM ile onaylı veya aktif vardiya aç.
2. Araç veya sürücüyü değiştir.
3. ROOM tarafında İşlem Kaydı aç; önce / sonra görünmeli.
4. COMPANY tarafında aynı vardiyada Operasyon Kaydı aç; aynı kayıt görünmeli.
5. Yeni sürücüde görev / rota görünmeli.
6. Eski sürücüde görev düşmeli.

## Green yorumu
M66 fonksiyonel olarak geçmesi için:
- reassign endpoint çalışmalı
- room/company operasyon kaydı görünmeli
- yeni/eski sürücü handoff zinciri çalışmalı

## Bu turda bilerek yapılmayanlar
- geniş repo cleanup
- milestone sonrası tam canlı saha doğrulaması
- dead code temizliği
