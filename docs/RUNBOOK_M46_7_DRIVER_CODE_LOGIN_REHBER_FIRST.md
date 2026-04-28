# RUNBOOK — M46.7 Driver Code Login + Rehber First

> **Uyumluluk notu (M79+):** Bu M46 runbook'u artık pilot-era exact versiyon etiketi beklemek yerine, aynı davranışın modern Copilot yüzeyinde hâlâ mevcut olup olmadığını doğrulayan legacy compatibility referansı olarak okunmalıdır.
> Exact `copilotVersion` eşitliği yerine davranışsal / yapısal doğrulama esastır.


Bu adım iki ana ürün kararını resmileştirir:
- NavDock'ta **Rehber** tüm rollerde ilk sıraya çıkar.
- Sürücü hesabı oluştururken sistem otomatik **Sürücü Kodu + Geçici PIN** üretir.

Kapsam:
- ROOM sürücü oluşturma sonrası otomatik giriş bilgisi üretimi
- sürücü için kod + PIN ile giriş
- ilk girişte PIN değiştirme ekranı
- ROOM tarafında yeni geçici PIN üretme
- login kartında `Kullanıcı Adı, E-posta veya Sürücü Kodu` metni

Kontrol komutları:
- `docker compose -f infra/docker-compose.yml exec -T api sh -lc "cd /app/backend && node scripts/m46_7_driver_code_login_rehber_first_check.js"`
- `powershell -ExecutionPolicy Bypass -File tools/check_m46_7_driver_code_login_rehber_first_repo_contract.ps1 -RepoRoot D:\servis-platform`
- `powershell -ExecutionPolicy Bypass -File tools/pack_m46_7_driver_code_login_rehber_first.ps1 -RepoRoot D:\servis-platform`
