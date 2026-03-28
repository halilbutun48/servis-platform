# KVKK RETENTION / SİLME / ANONİMLEŞTİRME V1

Tarih: 2026-03-28  
Durum: M77.1 content-foundation

## 1) Mevcut repo gerçekleri
Backend tarafında bugün görünen ana retention politika özeti:
- `API_REQUEST_RETENTION_DAYS = 730`
- `AUDIT_LOG_RETENTION_DAYS = 730`
- `NOTIFICATION_RETENTION_DAYS = 0` (kapalıysa otomatik silme yok)
- `GPS_POINT_RETENTION_DAYS = 0` (kapalıysa otomatik silme yok)
- history gate: `TELEMATICS_HISTORY_MIN_SEC = 30`, `TELEMATICS_HISTORY_MIN_METERS = 50`

Yani bu repoda bazı alanlarda gerçek retention var, bazı alanlarda ise hâlâ karar ve enforcement açığı var.

## 2) Hedef veri sınıfları
| Veri sınıfı | Örnek model/alan | Hedef davranış |
|---|---|---|
| Güvenlik ve işlem izi | `AuditLog`, `ApiRequest` | sakla, süre dolunca toplu temizle |
| Canlı operasyon | `GpsLast`, `ShiftProgress`, `Notification` | operasyon boyunca göster, sonra özetle |
| Ham geçmiş iz | `GpsPoint` | kısa süreli sakla veya kapalı tut; gerekmezse anonimleştir / temizle |
| Kişisel profil | `User`, `Personel`, `Driver`, `ParentChild` | aktif kayıt boyunca tut, ilişki bitince gözden geçir |
| Davranışsal delil | `Consent`, `CheckinEvent` | hukuki/operasyonel gerekçeyle sakla, export sınırı koy |
| Tek seferlik erişim | invite / live link token verisi | süresi dolunca iptal et, ham token'ı asla açık bırakma |

## 3) Hedef politika matrisi
| Varlık | Tutma yaklaşımı | Süre dolunca |
|---|---|---|
| `ApiRequest` | mevcut policy ile tut | otomatik cleanup |
| `AuditLog` | mevcut policy ile tut | otomatik cleanup |
| `Notification` | karar açığı var | payload PII azalt + ihtiyaca göre cleanup |
| `GpsLast` | aktif operasyon state | son durum kalabilir, geçmiş trail'e dönmez |
| `GpsPoint` | varsayılan kısa / kapalı | toplu temizle veya anonimleştir |
| `PassengerLiveLink`, `Invite`, `ParentInvite` | expiry odaklı | `revoked/expired` sonrası temizleme kuyruğu |
| `Consent` | hukuki iz | kabul/revoke kaydı saklı kalır, ama export'ta maskelenir |
| `CheckinEvent` | operasyon + delil izi | rapor ihtiyacı bitince özet / arşiv kararı |
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
- hangi tablo için cleanup, hangi tablo için anonymize job gerektiğini ayrı listele
- admin/export yüzeylerinde maskeleme kuralı yaz
