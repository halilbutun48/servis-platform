# M56.3 ETA Skip / Reroute Behavior

Bu overlay resmi green milestone değildir; M56 devam turudur.

Eklenen davranışlar:
- ETA payload içinde `skippedStops`, `lastCompletedStop`, `rerouteSuggested`, `rerouteReason`, `nextAction`
- Personel ekranlarında daha sade yönlendirme:
  - Atlanan durak sonrası aktif hedef
  - GPS gecikmeli / GPS çok eski
  - Rota tamamlandı / atlanan duraklar için oda ile görüşün
- Atlanan durak isimleri kısa özet olarak gösterilir.

Uygulama sonrası öneri:
- API restart
- Personel Live ve MyRide ekranında örnek aktif vardiya ile kontrol
