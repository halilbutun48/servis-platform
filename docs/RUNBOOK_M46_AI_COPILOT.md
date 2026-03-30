# RUNBOOK_M46_AI_COPILOT

> **Uyumluluk notu (M79+):** Bu M46 runbook'u artık pilot-era exact versiyon etiketi beklemek yerine, aynı davranışın modern Copilot yüzeyinde hâlâ mevcut olup olmadığını doğrulayan legacy compatibility referansı olarak okunmalıdır.
> Exact `copilotVersion` eşitliği yerine davranışsal / yapısal doğrulama esastır.


Tarih: 2026-03-11  
Timezone: Europe/Istanbul

## Amaç
M46, **read-only / suggestion-first** Copilot foundation hattıdır.

Bu sürümde Copilot:
- veri okur
- özet çıkarır
- conflict açıklar
- telematics health özetler
- operasyon notu taslağı üretir
- **write aksiyonu yapmaz**

## Route
- `POST /api/ai/copilot`

## Erişim
- roller: `SUPER_ADMIN`, `ROOM`, `COMPANY`
- `ROOM` + `SUPER_ADMIN` için step-up zorunludur
- `DRIVER` / `PERSONEL` / `PARENT` erişemez

## Request örneği
```json
{
  "intent": "SHIFT_SUMMARY",
  "entityType": "shift",
  "entityId": 123,
  "format": "json"
}
```

## Desteklenen intent'ler
- `SHIFT_SUMMARY` → shift özeti
- `CONFLICT_EXPLAIN` → shift üzerindeki görünür gerilim/riskleri açıklar
- `TELEMATICS_HEALTH` → vehicle telematics sağlık özeti
- `OPS_NOTE_DRAFT` → paylaşılabilir kısa operasyon notu taslağı

## Entity tipi kuralları
- `SHIFT_SUMMARY` → `entityType=shift`
- `CONFLICT_EXPLAIN` → `entityType=shift`
- `OPS_NOTE_DRAFT` → `entityType=shift`
- `TELEMATICS_HEALTH` → `entityType=vehicle`

## Response şekli
```json
{
  "ok": true,
  "intent": "SHIFT_SUMMARY",
  "entityType": "shift",
  "entityId": 123,
  "provider": "local-foundation",
  "mode": "RULE_BASED",
  "scope": {
    "role": "ROOM",
    "roomId": 1,
    "companyId": null
  },
  "summary": "...",
  "facts": ["..."],
  "risks": ["..."],
  "suggestions": ["..."],
  "noteDraft": null
}
```

## Güvenlik ilkeleri
- scope dışı entity okunmaz
- audit action: `AI_COPILOT_QUERY`
- structured JSON döner
- write endpoint tetiklemez

## Çalıştırma
- pack: `tools\pack_m46_ai_copilot.ps1 -RepoRoot D:\servis-platform`
- repo-contract: `tools\check_m46_ai_copilot_repo_contract.ps1 -RepoRoot D:\servis-platform`

## Not
Bu ilk foundation sürümü **deterministic / rule-based** çalışır.
İleride LLM provider eklenirse aynı route ve aynı structured response kontratı korunmalıdır.