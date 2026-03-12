# M46.6-D3 — AI Actionable Chat

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
