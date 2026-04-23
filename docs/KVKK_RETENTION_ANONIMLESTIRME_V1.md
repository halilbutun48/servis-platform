# KVKK RETENTION / SİLME / ANONİMLEŞTİRME V1

Tarih: 2026-04-23  
Durum: M77.6 content-foundation

## 1) Mevcut repo gerçekleri
Backend tarafında bugün görünen ana retention politika özeti:
- `API_REQUEST_RETENTION_DAYS = 730`
- `AUDIT_LOG_RETENTION_DAYS = 730`
- `NOTIFICATION_RETENTION_DAYS = 180`
- `CHECKIN_EVENT_RETENTION_DAYS = 180`
- `GPS_POINT_RETENTION_DAYS = 30`
- `BACKUP_LOCAL_RETENTION_DAYS = 730`
- history gate: `TELEMATICS_HISTORY_MIN_SEC = 30`, `TELEMATICS_HISTORY_MIN_METERS = 50`

Bu repoda artık bazı alanlar hot retention ile yönetiliyor, bazıları ise archive snapshot ile korunuyor.

## 2) Hedef veri sınıfları
| Veri sınıfı | Örnek model/alan | Hedef davranış |
|---|---|---|
| Güvenlik ve işlem izi | `AuditLog`, `ApiRequest` | 730 gün hot sakla |
| Canlı operasyon | `GpsLast`, `ShiftProgress`, `VehicleGpsState` | current state olarak tut |
| Operasyon bildirimi | `Notification` | 180 gün hot + archive snapshot |
| Ham geçmiş iz | `GpsPoint` | 30 gün hot + archive snapshot |
| Kişisel profil | `User`, `Personel`, `Driver`, `ParentChild` | aktif kayıt boyunca tut, ilişki bitince gözden geçir |
| Davranışsal delil | `Consent`, `CheckinEvent` | sakla, hot window + archive snapshot ile koru |
| Tek seferlik erişim | invite / live link token verisi | süresi dolunca iptal et, ham token'ı asla açık bırakma |

## 3) Hedef politika matrisi
| Varlık | Tutma yaklaşımı | Süre dolunca |
|---|---|---|
| `ApiRequest` | 730 gün hot | otomatik cleanup |
| `AuditLog` | 730 gün hot | otomatik cleanup |
| `Notification` | 180 gün hot + archive snapshot | hot pencereden sonra archive'a devret |
| `CheckinEvent` | 180 gün hot + archive snapshot | hot pencereden sonra archive'a devret |
| `GpsPoint` | 30 gün hot + archive snapshot | hot pencereden sonra archive'a devret |
| `GpsLast` | aktif operasyon state | geçmiş trail'e dönmez |
| `PassengerLiveLink`, `Invite`, `ParentInvite` | expiry odaklı | `revoked/expired` sonrası temizleme kuyruğu |
| `Consent` | retain-proof / archive snapshot | kabul/revoke kaydı saklı kalır |
| `Personel.homeAddress`, `homeLat`, `homeLng` | aktif planlama süresince | ilişki bitince değerlendirme / anonimleştirme |

## 4) Silme ile anonimleştirme ayrımı
### Silme
Aşağıdaki veri sınıflarında öncelikli yaklaşım tam silmedir:
- expiry geçmiş invite/live-link kayıtları
- geçici güvenlik snapshot'ları
- süre dolmuş GPS trail

### Anonimleştirme
Aşağıdaki veri sınıflarında doğrudan silme yerine anonimleştirme daha uygun olabilir:
- performans / kapasite ölçümü için tutulan request özetleri
- rota kalite ve ETA kalite analizi için kişi kimliğinden ayrıştırılabilen veriler
- hizmet kalite trendleri

## 5) Kırmızı kural
Aşağıdaki alanlarda "sonsuz sakla" yaklaşımı olmamalı:
- tam GPS trail
- açık ev adresi / ev koordinatı
- consent IP / user-agent
- token hash ile ilişkili geçici link kayıtları

## 6) Sonraki teknik adım
- retention tablosunu kod tarafındaki gerçek job'larla birebir eşleştir
- hangi tablo için hot cleanup, hangi tablo için archive snapshot gerektiğini ayrı listele
- admin/export yüzeylerinde maskeleme kuralı yaz
