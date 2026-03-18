# M55 — Reports + Gelmedi Kaydı

Bu paket şu parçaları açar:
- /api/reports/* özet endpointleri
- /api/penalties/no-show oluşturma
- ROOM approve/apply hattında aktif gelmedi kaydı blokajı
- ROOM/COMPANY Raporlar ekranı

Notlar:
- Kullanıcı etiketi "Gelmedi kaydı" olarak görünür.
- Backend blok kodu `ACTIVE_NO_SHOW_PENALTY` olarak döner.
- İlk sürümde CSV export yalnızca vardiya ve sürücü özetleri için açıktır.
