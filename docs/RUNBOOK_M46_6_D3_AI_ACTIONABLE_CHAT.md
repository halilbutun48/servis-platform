# M46.6-D3 — AI Actionable Chat

> **Uyumluluk notu (M79+):** Bu M46 runbook'u artık pilot-era exact versiyon etiketi beklemek yerine, aynı davranışın modern Copilot yüzeyinde hâlâ mevcut olup olmadığını doğrulayan legacy compatibility referansı olarak okunmalıdır.
> Exact `copilotVersion` eşitliği yerine davranışsal / yapısal doğrulama esastır.


Bu adımda sohbet cevabı artık sadece açıklama vermez; aynı zamanda seçili kayıt için daha doğru açılabilir aksiyonlar üretir.

## Gelen farklar
- route / guide / ask / copy türünde chat aksiyonları
- seçili vardiya veya araç için route param taşıma
- konuşma durumunda son aksiyonların tutulması
- chat balonunda aksiyon başlığı gösterimi

## Beklenen davranış
- `ilgili yere götür` sorusunda route aksiyonları görünür
- `konum neden görünmüyor` sorusunda araç için canlı ekran / rehber aksiyonları görünür
- sade rollerde aksiyon yoğunluğu düşük kalır
- write action yine yoktur

## Kanıt
- `backend/scripts/m46_6_d3_ai_actionable_chat_check.js`
- `tools/check_m46_6_d3_ai_actionable_chat_repo_contract.ps1`
- `tools/pack_m46_6_d3_ai_actionable_chat.ps1`
