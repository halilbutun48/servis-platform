# RUNBOOK — M46.6-B AI JOB GUIDE PRECHECK

Amaç: M46.6-A rehber katmanının üstüne kullanıcıyı takıldığı yerde yönlendiren ön kontrol katmanını eklemek.

Bu pakette gelenler:
- Başlamadan önce kontrol
- Hazır / Eksik var / Bu yüzden devam edemezsin etiketi
- Bu neden kapalı? açıklaması
- Buradan aç hızlı geçişleri
- Takıldıysan buraya git alanı
- Hazır metin (operasyon notu / destek metni)

Doğrulama sırası:
1. `tools/pack_m46_6_a_ai_job_guide.ps1`
2. `tools/pack_m46_6_b_ai_job_guide_precheck.ps1`

Beklenen sonuç:
- `POST /api/ai/copilot` `JOB_GUIDE` modunda yeni ön kontrol alanlarını döner.
- Copilot panelindeki Rehber görünümü yeni blokları gösterir.
- ROOM/COMPANY/SUPER_ADMIN akışları bozulmaz.
