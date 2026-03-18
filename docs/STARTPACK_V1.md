# SERVIS-PLATFORM — STARTPACK V1/V2 (SSOT)

Tarih: 2026-03-18
Timezone: Europe/Istanbul

Bu dosya repo için kısa çalışma runbook'udur.

## 1) GOLDEN RULES
1. Ana resmi green referans `M54.4` seviyesine kadar doğrulanmış pack çizgisidir.
2. Post-M41 pack script'leri self-only çalışır; tam `M42 -> M54.4` hattının kanonik komutu `tools\pack_post_m41_to_m54_4.ps1 -RepoRoot D:\servis-platform -NoBuild` şeklindedir.
3. `M51–M53 BACKFILL VERIFICATION PACK PASS OK` resmi green çizgisine dahil edilmiştir.
4. `M54.3 DISPATCH APPROVE + REPACK PACK PASS OK` resmi green çizgisine dahildir.
5. `M54.4 DRIVER ROUTE DELIVERY PACK PASS OK` resmi green çizgisine dahildir.
6. `POST-M41 EXTERNAL PACK RUNNER PASS OK` resmi tekrar-koşturma kanıtıdır.
7. `M54.1` preview ve `M54.2` editable preview, `M54.3` green hattı içinde fiilen doğrulanmış kabul edilir.
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
- M45 runbook: `docs\RUNBOOK_M45_RETENTION_BACKUP.md`
- M46.9 pack: `tools\pack_m46_9_session_refresh_security.ps1 -RepoRoot D:\servis-platform`
- M47 pack: `tools\pack_m47_kvkk_notice_consent_framework.ps1 -RepoRoot D:\servis-platform`
- M47.2 pack: `tools\pack_m47_2_capacity_load_baseline.ps1 -RepoRoot D:\servis-platform`
- M47.3 pack: `tools\pack_m47_3_production_resilience_edge_security.ps1 -RepoRoot D:\servis-platform`
- M47.4 — Mobile Readiness Web Pass: `tools\pack_m47_4_mobile_readiness_web_pass.ps1 -RepoRoot D:\servis-platform`
- M48 pack: `tools\pack_m48_driver_mobile_foundation.ps1 -RepoRoot D:\servis-platform`
- M48.5 pack: `tools\pack_m48_5_room_company_tablet_readiness.ps1 -RepoRoot D:\servis-platform`
- M49 pack: `tools\pack_m49_mobile_beta_hardening.ps1 -RepoRoot D:\servis-platform`
- M49.1 pack: `tools\pack_m49_1_driver_voice_guidance_stop_eta.ps1 -RepoRoot D:\servis-platform`
- M50 pack: `tools\pack_m50_mobile_release_readiness.ps1 -RepoRoot D:\servis-platform`
- M51–M53 pack: `tools\pack_m51_53_backfill_verification.ps1 -RepoRoot D:\servis-platform`
- M54.3 pack: `tools\pack_m54_3_dispatch_approve_repack.ps1 -RepoRoot D:\servis-platform`
- M54.4 pack: `tools\pack_m54_4_driver_route_delivery.ps1 -RepoRoot D:\servis-platform`
- M55 pack: `tools\pack_m55_reports_no_show.ps1 -RepoRoot D:\servis-platform`
- Post-M41 external orchestrator: `tools\pack_post_m41_to_m54_4.ps1 -RepoRoot D:\servis-platform -NoBuild`

## 3) Güncel durum özeti
- Resmi green çizgi `M55` seviyesine kadar doğrulanmıştır.
- `M51–M53`, `M54.3`, `M54.4`, `M55` ve dış post-M41 runner pack-green olarak geçmiştir.
- Tek araç yeterli / non-dispatch işlerde paket-kopyala UI kolaylığı korunur.
- Sonraki ana ürün hattı `M56 — KVKK Matrix + ETA/Navigation Quality` olmuştur.

## 4) Yakın rota
- `M56 — KVKK Matrix + ETA/Navigation Quality`
- `M57 — Mobile Hardening`
- `M58 — Final Pilot Readiness`

Ek araçlar:
- M45 tools: `tools\backup_create_m45.ps1`, `tools\backup_restore_m45.ps1`




## M55 — Reports + Gelmedi Kaydı
- Reports endpointleri ve ROOM/COMPANY rapor ekranı iskeleti eklendi.
- Gelmedi kaydı (NO_SHOW) veri modeli ve backend guard açıldı.
- Aktif kayıtlı sürücü approve/apply aşamasında `ACTIVE_NO_SHOW_PENALTY` ile bloklanır.
