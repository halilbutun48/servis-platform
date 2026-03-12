# M46.6-D2 — AI Context-Aware Chat

Bu adımda sohbet kabuğu ekran bağlamının üstüne seçili kayıt bağlamını da ekler.

## Gelen yeni yetenekler
- Sohbet artık `screen / shift / vehicle` bağlamı ile çalışabilir.
- Aynı ekran içinde seçili vardiya veya araç için ayrı cevap üretebilir.
- Cevap içinde ekran etiketi, seçili kayıt ve rol modu görünür.
- DRIVER / PERSONEL / PARENT tarafı sade modda kalır.
- Hızlı soru chip'leri ekran yoluna ve kayıt türüne göre değişir.

## Ana kurallar
- Write action yok.
- Scope dışı veri yok.
- Basit roller sadece sade ekran sohbeti kullanır.
- Operasyon rolleri seçili kayıtla konuşabilir.

## Kontrol
- `tools/pack_m46_6_d2_ai_context_chat.ps1`
- runtime check: `backend/scripts/m46_6_d2_ai_context_chat_check.js`
- repo contract: `tools/check_m46_6_d2_ai_context_chat_repo_contract.ps1`
