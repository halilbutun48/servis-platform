# SERVIS-PLATFORM — STARTPACK V1/V2 (SSOT)

Tarih: 2026-03-18
Timezone: Europe/Istanbul

Bu dosya repo için kısa çalışma runbook'udur.

## 1) GOLDEN RULES
1. Ana resmi green referans `M50` seviyesine kadar doğrulanmış pack çizgisidir.
2. `M51+` aktif ürün hattıdır; resmi green kutu sayılmaz.
3. `M51–M53` için backfill verification hattı vardır; bu hat resmi green promotion değildir.
4. `M52` import + geo pipeline runtime ile tekrar doğrulanabilir durumdadır.
5. `M53` stop/route productization ve organization/gezi görünürlüğü backfill check kapsamındadır.
6. `M54.1` preview, `M54.2` editable preview ve `M54.3` repack zinciri repo içinde çalışır durumdadır.
7. `M54.4` için explicit shift route endpoint'i ve `Today → Route` deep link'i açılmıştır.
8. Company default `maxWalkM = 250`, School default `maxWalkM = 50`, backend hard limit `50..2000`.
9. Oluşturma için tek kaynak **Planlama Merkezi** olmalıdır.
10. **Vardiyalar** ekranı oluşturma değil, takip / operasyon ekranıdır.
11. **Organizasyon Merkezi** ikinci üretim motoru gibi davranmamalı; Planlama Merkezi içindeki organization/gezi moduna yönlenmelidir.
12. Organization akışı: `Toplanma noktası → Plan paketi → Tahmini kişi sayısı / gidilecek yerler → Ön izleme / teklif → Vardiyalar`.
13. Gidilecek yerler ayrı kart/satır mantığında tutulur; adres bulunamazsa manuel `lat/lng` ve haritadan seçim ile tamamlanır.
14. Koordinat eksiği olan organization planı markete düşmemelidir.
15. Company taslak plan / teklif hazırlar; Room gerçek araç / sürücü / kapasite kararı ile operasyonel planı tamamlar.
16. Tek araç yeterli / dispatch gerektirmeyen işlerde `Araç → Pakete Kopyala` ve `Driver → Pakete Kopyala` UI kolaylığı korunur.
17. Driver login ana akışı `Sürücü Kodu + PIN` olarak korunur.
18. İlk girişte PIN değişimi zorunludur.
19. `driver@demo.com / demo123` hızlı panel kontrol hesabıdır; ana ürün akışı değildir.
20. Ürün içi konum dili `sürücünün telefon GPS'i` olarak korunur.
21. AI hattı read-only / suggestion-first kalır.
22. Değişikliklerde SSOT seti birlikte güncellenir:
   - `tools/PRIMER_SNAPSHOT.md`
   - `docs/PRIMER_SSOT.md`
   - `docs/CHECKLIST_SSOT.md`
   - `tools/CHECKLIST_SSOT.md`
   - `docs/STARTPACK_V1.md`
   - `tools/README.md`
   - gerekirse kök `README.md`
23. Değişiklikler mümkünse tek seferde overlay paket olarak taşınır.
24. Overlay zip extract sonrası doğrudan apply path ile çalışmalı; nested root üretilmez.
25. CHECKLIST'te `[x]` yalnızca pack/check green sonrasında işaretlenir.
26. Repo/tools hijyen check sürekli korunur.

## 2) Kanonik komutlar
- Ana regresyon: `tools\pack.ps1 -To 41`
- M45 pack: `tools\pack_m45_retention_backup.ps1 -RepoRoot D:\servis-platform`
- M46.9 pack: `tools\pack_m46_9_session_refresh_security.ps1 -RepoRoot D:\servis-platform`
- M47 pack: `tools\pack_m47_kvkk_notice_consent_framework.ps1 -RepoRoot D:\servis-platform`
- M47.2 pack: `tools\pack_m47_2_capacity_load_baseline.ps1 -RepoRoot D:\servis-platform`
- M47.3 pack: `tools\pack_m47_3_production_resilience_edge_security.ps1 -RepoRoot D:\servis-platform`
- M47.4 pack: `tools\pack_m47_4_mobile_readiness_web_pass.ps1 -RepoRoot D:\servis-platform`
- M48 pack: `tools\pack_m48_driver_mobile_foundation.ps1 -RepoRoot D:\servis-platform`
- M48.5 pack: `tools\pack_m48_5_room_company_tablet_readiness.ps1 -RepoRoot D:\servis-platform`
- M49 pack: `tools\pack_m49_mobile_beta_hardening.ps1 -RepoRoot D:\servis-platform`
- M49.1 pack: `tools\pack_m49_1_driver_voice_guidance_stop_eta.ps1 -RepoRoot D:\servis-platform`
- M50 pack: `tools\pack_m50_mobile_release_readiness.ps1 -RepoRoot D:\servis-platform`

## 3) Güncel durum özeti
- Resmi green çizgi `M50` seviyesine kadar doğrulanmıştır.
- `M51–M53` için backfill verification hattı eklendi.
- `M54.3` pack kanıtı mevcut, `M54.4` explicit shift route açıldı.
- Tek araç yeterli / non-dispatch işlerde paket-kopyala UI kolaylığı korunur.

## 4) Yakın rota
- `M55 — Reports + No-show`
- `M56 — KVKK Matrix + Mobile Hardening`
- `M57 — Final Pilot Readiness`
