# OVERLAY NOTES — M44.6 Telematics ROOM UI

Tarih: 2026-03-10  
Timezone: Europe/Istanbul

## Amaç
M44 backend telematics hattı sonrası, ROOM kullanıcısının cihaz provisioning ve temel yönetim işlemlerini doğrudan `Vehicles` panelinden yapabilmesini sağlamak.

## Bu overlay ne ekler?
- `ROOM > Vehicles` içine yeni `Telematics` sekmesi
- araç seçip telematics device create
- mevcut device listesi görüntüleme
- label / status update
- token rotate
- create/rotate sonrası ham token tek seferlik gösterim + kopyalama
- `docs/UI_SPEC_V1.md` içinde Vehicles sekmeleri güncellemesi

## Bilinçli sınırlar
- yeni route eklemez; mevcut M44 backend endpointlerini kullanır
- ayrı yeni menü açmaz; mevcut Vehicles paneline gömülür
- vendor webhook test ekranı eklemez
- token geçmişi tutmaz; backend davranışına uygun şekilde sadece son create/rotate anında gösterir

## Beklenen kullanım
1. ROOM kullanıcı `Vehicles > Telematics` sekmesine girer.
2. Araç seçer.
3. Vendor + serial + opsiyonel label ile device oluşturur.
4. Dönen token cihaz tarafına yazılır.
5. Gerektiğinde aynı ekrandan status update veya token rotate yapılır.
