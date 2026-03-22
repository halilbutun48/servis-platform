# backend/indexes

Bu klasör **büyük / üretilmiş index** dosyaları içindir.

Örnekler:
- ETA için yol ağı grafiği / tile / routing index (OSRM / Valhalla / GraphHopper gibi)
- Ortak durak önerisi için clustering index'leri

Kurallar:
- Repo'ya commitlenmez (gitignore).
- Docker'da volume ile mount edilir.
- API process hafızasını şişirmemek için (lazy load) ihtiyaç oldukça okunur.
