# RUNBOOK — M46.6-C2 Screen Coverage + Terminology Expansion

> **Uyumluluk notu (M79+):** Bu M46 runbook'u artık pilot-era exact versiyon etiketi beklemek yerine, aynı davranışın modern Copilot yüzeyinde hâlâ mevcut olup olmadığını doğrulayan legacy compatibility referansı olarak okunmalıdır.
> Exact `copilotVersion` eşitliği yerine davranışsal / yapısal doğrulama esastır.


Bu adım ekran kapsamasını ve kullanıcı diliyle terim açıklamalarını genişletir.

Kapsam:
- room/company/school/organization hub ekranlarının açıklaması
- shared notifications ve shared logs açıklaması
- company/school/organization georeview açıklaması
- school parent access / veli erişimi açıklaması
- room/company check-in ve driver check-in açıklaması
- Hub / Inbound / Outbound / Erişim Linki / Veli Erişimi / Bildirim / İşlem Kaydı / Konum İncele / OSRM / Matrix / Check-in terimleri

Ana ürün etkisi:
- chat içinde terim soruları daha iyi anlaşılır
- ekran rehberi menü kapsaması genişler
- kullanıcı teknik ifadeleri daha sade Türkçe ile görür

Kontrol komutları:
- `docker compose -f infra/docker-compose.yml exec -T api sh -lc "cd /app/backend && node scripts/m46_6_c2_screen_coverage_terminology_check.js"`
- `powershell -ExecutionPolicy Bypass -File tools/check_m46_6_c2_screen_coverage_terminology_repo_contract.ps1 -RepoRoot D:\servis-platform`
- `powershell -ExecutionPolicy Bypass -File tools/pack_m46_6_c2_screen_coverage_terminology.ps1 -RepoRoot D:\servis-platform`
