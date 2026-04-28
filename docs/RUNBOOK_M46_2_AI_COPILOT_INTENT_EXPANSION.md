# RUNBOOK_M46_2_AI_COPILOT_INTENT_EXPANSION

> **Uyumluluk notu (M79+):** Bu M46 runbook'u artık pilot-era exact versiyon etiketi beklemek yerine, aynı davranışın modern Copilot yüzeyinde hâlâ mevcut olup olmadığını doğrulayan legacy compatibility referansı olarak okunmalıdır.
> Exact `copilotVersion` eşitliği yerine davranışsal / yapısal doğrulama esastır.


Tarih: 2026-03-11  
Timezone: Europe/Istanbul

## Amaç
M46.2, mevcut read-only Copilot hattını write aksiyonu eklemeden daha operasyonel hale getirir.

Bu sürümde eklenenler:
- yeni intentler:
  - `ASSIGNMENT_READINESS`
  - `OFFER_DECISION_HELP`
  - `GPS_SIGNAL_DIAGNOSIS`
- `intentLabel`
- `entityLabel`
- `scope.summary`
- `highlights`
- daha zengin `references`
- panelde hızlı seçim araması
- panelde intent yardımcı metni

## Intent özeti
- `ASSIGNMENT_READINESS` → araç / sürücü / durak / kapasite hazırlık görünürlüğü
- `OFFER_DECISION_HELP` → teklif / karar darboğazı ve agreement uyumu
- `GPS_SIGNAL_DIAGNOSIS` → active device / gps signal / stale state teşhisi

## Response örneği
```json
{
  "copilotVersion": "M46.2",
  "intent": "ASSIGNMENT_READINESS",
  "intentLabel": "Atama Hazırlık Kontrolü",
  "entityLabel": "Shift #10 • APPROVED • Demo Company",
  "scope": {
    "role": "ROOM",
    "summary": "ROOM scope içinde shift #10 okundu (roomId=1)."
  },
  "highlights": [
    "Bloklayıcı: DRIVER_MISSING",
    "Durum: APPROVED"
  ],
  "references": {
    "shiftId": 10,
    "vehicleId": 2,
    "openOfferCount": 1,
    "offeredRoomIds": [1]
  }
}
```

## Korunan ilkeler
- read-only / suggestion-first
- write action yok
- audit `AI_COPILOT_QUERY` devam
- ROOM ve SUPER_ADMIN için step-up guard devam
- scope dışı veri okunmaz

## Çalıştırma
- `tools\pack_m46_2_ai_copilot_intent_expansion.ps1 -RepoRoot D:\servis-platform`
- `tools\check_m46_2_ai_copilot_intent_expansion_repo_contract.ps1 -RepoRoot D:\servis-platform`
