# RUNBOOK — M46.7 Driver Code Login + Rehber First

Bu adım iki ana ürün kararını resmileştirir:
- NavDock'ta **Rehber** tüm rollerde ilk sıraya çıkar.
- Sürücü hesabı oluştururken sistem otomatik **Sürücü Kodu + Geçici PIN** üretir.

Kapsam:
- ROOM sürücü oluşturma sonrası otomatik giriş bilgisi üretimi
- sürücü için kod + PIN ile giriş
- ilk girişte PIN değiştirme ekranı
- ROOM tarafında yeni geçici PIN üretme
- login kartında `E-posta veya Sürücü Kodu` metni

Kontrol komutları:
- `docker compose -f infra/docker-compose.yml exec -T api sh -lc "cd /app/backend && node scripts/m46_7_driver_code_login_rehber_first_check.js"`
- `powershell -ExecutionPolicy Bypass -File tools/check_m46_7_driver_code_login_rehber_first_repo_contract.ps1 -RepoRoot D:\servis-platform`
- `powershell -ExecutionPolicy Bypass -File tools/pack_m46_7_driver_code_login_rehber_first.ps1 -RepoRoot D:\servis-platform`
