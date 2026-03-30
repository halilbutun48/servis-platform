# RUNBOOK — M46.3 AI Copilot Quality + Evidence

> **Uyumluluk notu (M79+):** Bu M46 runbook'u artık pilot-era exact versiyon etiketi beklemek yerine, aynı davranışın modern Copilot yüzeyinde hâlâ mevcut olup olmadığını doğrulayan legacy compatibility referansı olarak okunmalıdır.
> Exact `copilotVersion` eşitliği yerine davranışsal / yapısal doğrulama esastır.


Amaç: M46.2 üzerindeki read-only / suggestion-first hattı bozmadan, copilot cevabının açıklanabilirliğini ve operasyon güvenini artırmak.

## Kapsam
- `copilotVersion` → `M46.3`
- yeni structured alanlar:
  - `confidence`
  - `explanation`
  - `evidence`
  - `decisionSignals`
- UI:
  - confidence görünümü
  - explanation bölümü
  - evidence bölümü
  - decision signals bölümü

## Korunan kurallar
- write action yok
- audit devam
- ROOM / SUPER_ADMIN için step-up guard korunur
- scope dışı entity okunmaz
- M46.1 ve M46.2 check zinciri ileri uyumlu olacak şekilde korunur

## Kanıt komutları
- `tools\pack_m46_3_ai_copilot_quality_evidence.ps1 -RepoRoot D:\servis-platform`
- `tools\check_m46_3_ai_copilot_quality_evidence_repo_contract.ps1 -RepoRoot D:\servis-platform`
- `backend\scripts\m46_3_ai_copilot_quality_evidence_check.js`