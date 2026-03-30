# RUNBOOK — M46.6-D4 Simple Role Mode

> **Uyumluluk notu (M79+):** Bu M46 runbook'u artık pilot-era exact versiyon etiketi beklemek yerine, aynı davranışın modern Copilot yüzeyinde hâlâ mevcut olup olmadığını doğrulayan legacy compatibility referansı olarak okunmalıdır.
> Exact `copilotVersion` eşitliği yerine davranışsal / yapısal doğrulama esastır.


Bu adım DRIVER / PERSONEL / PARENT için sohbet yardımını daha kısa, daha sade ve daha yönlendirmeli hale getirir.

Kapsam:
- sade rol modunda daha kısa cevap
- daha az chip ve daha az hızlı aksiyon
- route-first öncelik
- daha sade konuşma alt metni
- C2 ekran kapsamasının panel tarafında da görünmesi

Ana ürün etkisi:
- sürücü, personel ve veli daha az teknik metin görür
- bir ekranda takılınca daha hızlı doğru yere yönlenir
- C2 ekranları panel seçicisinde görünür hale gelir

Kontrol komutları:
- `docker compose -f infra/docker-compose.yml exec -T api sh -lc "cd /app/backend && node scripts/m46_6_d4_simple_role_mode_check.js"`
- `powershell -ExecutionPolicy Bypass -File tools/check_m46_6_d4_simple_role_mode_repo_contract.ps1 -RepoRoot D:\servis-platform`
- `powershell -ExecutionPolicy Bypass -File tools/pack_m46_6_d4_simple_role_mode.ps1 -RepoRoot D:\servis-platform`