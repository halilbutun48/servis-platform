# KVKK VERİ GÖRÜNÜRLÜK MATRİSİ V1

Tarih: 2026-03-28  
Durum: M77.1 content-foundation

## 1) Temel ayrım
Bu repoda **auth role** ile **iş alanı/domain** aynı şey değildir.

### Auth role
- `SUPER_ADMIN`
- `ROOM`
- `COMPANY`
- `DRIVER`
- `PERSONEL`
- `PARENT`

### İş alanı / domain
- `COMPANY`
- `SCHOOL`
- `ORGANIZATION`
- `ROOM`

Önemli not: `SCHOOL` şu an ayrı bir login rolü değildir. Okul alanı, `Company.kind = SCHOOL` olarak taşınır. Bu yüzden KVKK görünürlük kararlarında **rol** ile **domain** ayrı okunmalıdır.

## 2) Karar ilkeleri
1. Her rol sadece işini yapmak için gereken en az veriyi görür.
2. Canlı konum ile tam geçmiş aynı veri değildir; aynı yetkiyle açılmaz.
3. Açık adres, telefon, token, TOTP secret, refresh session, consent IP/UA gibi alanlar yüksek hassastır.
4. Ticari not ile operasyon notu aynı kişilere açılmaz.
5. Veli ve personel tarafı sadece kendisini veya bağlı çocuğu etkileyen özet veriyi görür.

## 3) Rol özeti
| Rol | Temel scope | Canlı konum | Tam GPS geçmişi | Kişi telefonu/adresi | Audit/log |
|---|---|---|---|---|---|
| SUPER_ADMIN | sistem geneli | kısıtlı amaçla | kısıtlı amaçla | kısıtlı / gerektiğinde | özet + kontrollü erişim |
| ROOM | kendi oda operasyonu | evet, operasyon penceresinde | hayır / çok sınırlı | sınırlı | kendi işlem izi |
| COMPANY | kendi firma/okul/organizasyon alanı | evet, sadece bağlı kayıtlar | hayır | kendi personeliyle sınırlı | kendi kapsam özeti |
| DRIVER | kendi vardiyası | evet, kendi verisi | hayır | kendi profili | kendi aksiyon izi |
| PERSONEL | kendisi | araç yaklaşımı özeti | hayır | kendi profili | yok |
| PARENT | bağlı çocuk | araç yaklaşımı özeti | hayır | bağlı çocukla sınırlı özet | yok |

## 4) Alan bazlı karar matrisi
| Varlık / alan | SUPER_ADMIN | ROOM | COMPANY / SCHOOL / ORGANIZATION | DRIVER | PERSONEL | PARENT | Kural |
|---|---|---|---|---|---|---|---|
| `User.email`, `User.fullName`, `User.phone`, `User.role` | tam | scope içi | scope içi | kendi kaydı | kendi kaydı | kendi kaydı | temel hesap görünürlüğü |
| `User.passwordHash`, `User.totpSecretBase32`, `User.totpPendingSecretBase32` | hayır | hayır | hayır | hayır | hayır | hayır | UI/API dışı, sadece backend gizli alan |
| `RefreshSession`, `sessionVersion`, identity provider detayları | kısıtlı ops | hayır | hayır | kendi özetini bile ham görmez | hayır | hayır | sadece güvenlik/ops yüzeyi |
| `User.deviceId`, `deviceBoundAt`, `deviceLastSeenAt` | kısıtlı ops | sadece bağlı sürücüde özet | hayır | kendi cihazı özeti | hayır | hayır | cihaz bağı verisi yayılmaz |
| `Company.name`, `kind`, `district`, `status` | tam | bağlı firma/okul | kendi alanı | bağlı vardiya özeti | bağlı vardiya özeti | bağlı çocuk vardiya özeti | ticari üst bilgi |
| `Company.legalName`, `taxNo`, `taxOffice` | kısıtlı | hayır | kendi alanı | hayır | hayır | hayır | ticari/kurumsal veri, son kullanıcıya açılmaz |
| `Company.addressLine`, `contactName`, `contactPhone`, `contactEmail` | kısıtlı | bağlı firma/okul kadar | kendi alanı | hayır | hayır | hayır | iletişim verisi amaç sınırlı |
| `Room.name`, `district`, `status` | tam | kendi alanı | bağlı room özeti | bağlı vardiya özeti | hayır | hayır | oda/firma eşleşme görünürlüğü |
| `Room.addressLine`, `contactPhone`, `contactEmail` | kısıtlı | kendi alanı | bağlı operasyon kadar | hayır | hayır | hayır | açık adres son kullanıcıya açılmaz |
| `Driver.fullName`, `phone` | kısıtlı | kendi sürücüleri | bağlı vardiyaya atanmış sürücü özeti | kendi kaydı | sınırlı ad/araç yaklaşımı bağlamı | sınırlı ad gerekmiyorsa gizli | gereksiz telefon görünmez |
| `Driver.driverCode`, `pinTemporary`, `deviceInfo` | kısıtlı ops | kendi sürücülerinde sınırlı | hayır | kendi kod özetini bile ham gösterme | hayır | hayır | kimlik doğrulama alanı |
| `Vehicle.plate`, `capacity`, `type`, `brand`, `model`, `status` | tam | kendi araçları | bağlı vardiya özeti | kendi aracı | özet | özet | operasyon için gerekli alan |
| `Vehicle.vin`, `insuranceDueAt`, `cascoDueAt`, `odometerKm` | kısıtlı ops | kendi araçlarında bakım amaçlı | hayır | hayır | hayır | hayır | hassas operasyon alanı |
| `Personel.fullName`, `phone` | kısıtlı | atanmış shift/personel kadar | kendi personeli | sadece kendi yolcu listesi kadar | kendi kaydı | sadece bağlı çocuk özeti | kişi verisi scope'lu |
| `Personel.homeAddress`, `homeLat`, `homeLng` | kısıtlı | sadece durak üretim/operasyon penceresinde | kendi personel planlaması kadar | hayır | kendi kaydı dışında hayır | hayır | açık adres en hassas alanlardan |
| `Personel.geoStatus`, `geoManualOverride`, `geoNote` | kısıtlı | gerekli ise | kendi personeli | hayır | kendi özetini görür, ham notu değil | hayır | iç operasyon notu sınırlı |
| `ParentChild`, `ParentInvite` | kısıtlı | hayır | kendi firma/okul alanında | hayır | kendi link özetini görmez | kendi bağlı çocuk linki | veli bağı sadece ilgili tarafa |
| `Shift.startAt`, `endAt`, `status`, `direction`, `pattern` | tam | kendi scope | kendi scope | kendi vardiyası | kendi vardiyası | bağlı çocuğun vardiyası | temel operasyon verisi |
| `Shift.companyOffer*`, `roomOffer*`, `extend*` | tam | ilgili room | ilgili company/school/org | hayır | hayır | hayır | ticari pazarlık son kullanıcıya açılmaz |
| `Stop.name`, `order`, `state`, `reachedAt`, `skippedAt` | tam | kendi scope | kendi scope özeti | kendi vardiyası | kendi kalan durak özeti | bağlı çocuğun kalan durak özeti | tam rota yerine özet tercih edilir |
| `GpsLast.lat`, `GpsLast.lng`, `GpsLast.at`, `speed` | kısıtlı | operasyon penceresinde | bağlı vardiya / kendi personeli kadar | kendi verisi | araç yaklaşımı / ETA özeti | araç yaklaşımı / ETA özeti | tam koordinat sadece ihtiyaç halinde |
| `GpsPoint` geçmiş izi | kısıtlı | varsayılan hayır | hayır | hayır | hayır | hayır | geçmiş trail ayrı sıkı alan |
| `PassengerLiveLink.tokenHash`, `expiresAt` | kısıtlı ops | hayır | ilgili oluşturan kapsamda sayısal özet | hayır | kendi linkinde ham token yok | kendi linkinde ham token yok | token hash asla ham dönmez |
| `CheckinEvent`, `PersonelCredential` | kısıtlı | own-room summary | own-company summary | kendi aksiyon özetleri | kendi check-in özeti | bağlı çocuk check-in özetleri | ham token/hash görünmez |
| `Consent.docKey`, `acceptedAt`, `revokedAt` | tam özet | kendi kullanıcıları için özet | kendi kullanıcıları için özet | kendi kaydı | kendi kaydı | kendi kaydı | IP/UA ayrı hassas alan |
| `Consent.ip`, `Consent.userAgent` | kısıtlı ops | hayır | hayır | hayır | hayır | hayır | yalnız güvenlik incelemesi |
| `Notification.payloadJson` | kısıtlı | kendi scope | kendi scope | kendi scope | kendi scope | kendi scope | payload içi PII minimize edilir |
| `ApiRequest.ip`, `userAgent` | kısıtlı ops | hayır | hayır | hayır | hayır | hayır | güvenlik/kapasite yüzeyi |
| `AuditLog.action`, `entity`, `entityId`, `meta` | tam ama amaç sınırlı | kendi aksiyon izi | scope bazlı özet | kendi kritik aksiyon özetleri UI'da olabilir | yok | yok | meta içinde PII minimizasyonu gerekir |

## 5) Özel kırmızı alanlar
Bu alanlar varsayılan olarak ekrana ve genel API cevabına açılmamalıdır:
- `passwordHash`
- `totpSecretBase32`
- `totpPendingSecretBase32`
- refresh token / session hash
- `PassengerLiveLink.tokenHash`
- `PersonelCredential.tokenHash`
- consent IP / user-agent
- tam `GpsPoint` izi
- açık ev adresi + açık ev koordinatı

## 6) Uygulama sırası
1. Önce doküman ve matris kanonikleşir.
2. Sonra UI panel / API payload bazlı enforcement listesi çıkar.
3. Sonra test/check yazılır.
4. En son export / rapor / maskeleme sertleştirilir.
