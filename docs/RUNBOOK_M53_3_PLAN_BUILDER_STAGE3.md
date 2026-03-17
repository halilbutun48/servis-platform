# RUNBOOK — M53.3 Plan Builder Stage-3

## 1) Kullanıcı akışı
Plan Builder Stage-3 ekranı teknik buton koleksiyonu gibi görünmemelidir.
Aşağıdaki iki ana çıkış ayrılmalıdır:
- **Talep taslağına aktar**
- **Uygula: N market shift oluştur**

## 2) Parametrelerin anlamı
### Sadece geoStatus=OK
Sadece koordinatı hazır kayıtlarla planlama yapar.

### Araç kapasitesi
Bir araç / market shift için kaç kişi taşınacağını etkiler.

### Geohash precision
Gruplama hassasiyetidir.
- düşük = daha geniş grup
- yüksek = daha dar grup

### Shift oluştururken stop üretim maxWalkM
Bu alan OSRM sıralaması için değil, **oluşturulan shift içinde stop üretimi** için kullanılır.

### Stops'u OSRM+Solver ile sırala
Shift oluştuktan sonra stop sırasını optimize etmeyi dener.

## 3) Butonların anlamı
### Talep taslağına aktar
Şu an sınırlı aktarım yapar:
- zaman aralığı
- seat demand
- template key
- market mode

Henüz tam stop sırası / durak taslağı / kapasite analizi taşımıyorsa bu dürüstçe belirtilmelidir.

### Uygula: N market shift oluştur
Gerçek üretim aksiyonudur:
- shift oluşturur
- personelleri bağlar
- stop üretir
- opsiyonel reorder yapar

## 4) M53.3 UX hedefi
- parametreler sadeleşmeli
- teknik alanlar açıklanmalı
- kullanıcı hangi butonun taslak, hangisinin gerçek üretim olduğunu anlamalı
