# ROL BAZLI OPERASYON DOGRULAMA V1

M78 ilk turunda doğrulama yüzeyi aşağıdaki roller için ayrı okunur:
- `SUPER_ADMIN`
- `ROOM`
- `COMPANY`
- `DRIVER`
- `PERSONEL`
- `PARENT`

## Rol bazlı bakış
### SUPER_ADMIN
- sistem sağlığı
- manifest / pack görünürlüğü
- denetim ve kanıt izi

### ROOM
- teklif / atama / operasyon akışı
- seçili kayıt ve canlılık okuma
- saha operatörüne basit yönlendirme

### COMPANY
- talep, teklif, sözleşme ve vardiya görünürlüğü
- operasyon sonucu ile ticari sonucun ayrılması

### DRIVER
- sürücünün telefon GPS'i görünürlüğü
- vardiya teslimi ve rota okuması
- hata anında sade yönlendirme

### PERSONEL
- kendi iş / servis görünürlüğü
- canlı bağlantı ve basit durum okuması

### PARENT
- çocuk / servis görünürlüğü
- gizlilik daraltmalarıyla güvenli takip

## Ortak doğrulama sorusu
Her rol için ana soru aynıdır:
**Doğru kişi, doğru ekranda, doğru bilgiyle, doğru karara yönlenebiliyor mu?**
