# M74 HOT PATH PHASE 3

Amaç: Company tarafında kalan sıcak uçları daha da sakinleştirmek.

Bu paket şunları yapar:
- company ilk yük take değerlerini bir kademe daha düşürür
- Geo Review ekranını varsayılan olarak sadece incelenecek kayıtlarla açar
- market / vardiya / harita / rapor akışında daha uzun cache kullanır
- company personels ve company offers için kısa response cache ekler
- reports ve provider-score için ayrı read limiter kovaları ekler

Doğrulama:
- `tools/pack_m74_hot_path_phase3.ps1`
- ardından istersen `tools/pack_m67_kurumsal_olcek_hazirlik.ps1`
