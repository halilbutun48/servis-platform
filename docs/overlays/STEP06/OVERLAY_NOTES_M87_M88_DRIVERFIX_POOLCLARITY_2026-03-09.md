M87/M88 hotfix overlay

Kapsam
- Driver create: boş deviceInfo artık 400 üretmez.
- Driver create validation artık okunur message döner; [object Object] kalkar.
- Login hesabı açılacaksa email+password birlikte zorunlu.
- Room havuz özetine araç/driver ayrımı eklendi:
  - availableVehicleCount
  - pairableVehicleCount
  - enoughVehicleCapacity
  - limitingReason
  - driverNeedForCapacity
  - driverShortageCount
  - blockedDrivers
- ROOM Shifts ve ROOM Offers ekranlarında DRIVER YETERSİZ / ARAÇ YETERSİZ ayrımı gösterilir.

Not
- Backend syntax check: OK
- Frontend full build çalıştırılmadı (node_modules yok).
