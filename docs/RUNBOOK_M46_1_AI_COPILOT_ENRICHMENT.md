# RUNBOOK_M46_1_AI_COPILOT_ENRICHMENT

> **Uyumluluk notu (M79+):** Bu M46 runbook'u artık pilot-era exact versiyon etiketi beklemek yerine, aynı davranışın modern Copilot yüzeyinde hâlâ mevcut olup olmadığını doğrulayan legacy compatibility referansı olarak okunmalıdır.
> Exact `copilotVersion` eşitliği yerine davranışsal / yapısal doğrulama esastır.


Tarih: 2026-03-11  
Timezone: Europe/Istanbul

## Amaç
M46.1, mevcut read-only Copilot foundation'ı operasyon açısından daha kullanışlı hale getirir.

Bu sürümde eklenenler:
- `copilotVersion`
- `generatedAt`
- `severity`
- `blocks`
- `nextChecks`
- `references`
- panelde kopyala aksiyonları
- panelde son 5 analiz geçmişi

## Response ek alanları
```json
{
  "copilotVersion": "M46.1",
  "generatedAt": "2026-03-11T18:00:00.000Z",
  "severity": "WARN",
  "blocks": ["VEHICLE_MISSING"],
  "nextChecks": ["Araç atama ekranını aç"],
  "references": { "shiftId": 10, "vehicleId": null }
}
```

## Severity mantığı
- `CRITICAL` → bloklayıcı durum var
- `WARN` → birden çok görünür risk var
- `INFO` → dikkat isteyen ama bloklayıcı olmayan durum
- `OK` → belirgin bloklayıcı/risk görünmüyor

## UI notları
- `Kopyala özet`
- `Kopyala not`
- `Son 5 analiz`
- `Blocks`
- `Next Checks`

## Çalıştırma
- `tools\pack_m46_1_ai_copilot_enrichment.ps1 -RepoRoot D:\servis-platform`
- `tools\check_m46_1_ai_copilot_enrichment_repo_contract.ps1 -RepoRoot D:\servis-platform`
