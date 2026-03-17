PERSONEL SERVİS V1 — PRIMER SNAPSHOT (2026-03-15)

Repo: servis-platform
Branch: main
Current HEAD: 58afa12

Resmi / repo-verified durum ayrımı

Resmi son green tag doğrulandı: v1-m50-green

main branch şu anda M50 sonrasındaki SSOT / roadmap refresh commit’ini de içeriyor.

Yani resmi green referansı v1-m50-green, güncel çalışma ucu ise bunun üstünde 58afa12.

Kesin green / resmi durum

M41 ana green taban korunuyor

M42 optional green

Step 0.6 stabil green

Step 1 Security green

Step 1 TOTP green

M43 Google Auth + Invite Gate green

M44 Telematics green

M45 Retention + Backup green

M46 AI Copilot zinciri green

M46.7 Driver Code Login + Rehber First green

M46.8 Driver Access Hardening green

M46.9 Session & Refresh Security green

M47 KVKK Notice / Consent Framework green

M47.2 Capacity & Load Baseline green

M47.3 Production Resilience + Edge Security green

M47.4 Mobile Readiness Web Pass green

M47.4-R Clean Rerun / Repro Fix green

M48 Driver Mobile Foundation green

M48.5 Room / Company Tablet Readiness green

M49 Mobile Beta Hardening green

M49.1 Driver Voice Guidance + Stop ETA green

M50 Mobile Release Readiness green

M47.4-R ile netleşenler

Ayrı ürün özelliği değil; clean rerun / repro uyum düzeltmesidir

Demo seed rerun’da demo123 tekrar yazılabilir

Driver compat login hattı bound deviceId reuse eder

M41 device binding check rerun-uyumlu çalışır

M48 ile netleşenler

mobile/ altında Expo SDK 54 tabanlı sürücü mobil iskeleti açık

Mobil login hattı Sürücü Kodu + PIN

Refresh + deviceId uyumu var

requirePinChange varsa doğrudan PIN değişim ekranı açılır

Bugün ekranı vardiya özeti, rota özeti, sonraki durak, haritada aç ve GPS hazırlık kartını içerir

M48.5 ile netleşenler

Room / Company tablet hazırlığı ayrı native app değil, aynı web uygulaması içinde

TabletOpsQuickBar ile hızlı işlem / harita / kaydırmasız erişim kabuğu eklendi

Tablet odaklı shell ve grid düzeni web tarafında tanımlandı

Ayrı native room/company tablet uygulaması henüz yok

M49 ile netleşenler

Foreground active olduğunda otomatik veri yenileme var

30 saniyelik periyodik yenileme var

Backend health pingi görünürlüğü var

Beta durum kartında API tabanı, Device ID, son senkron ve son hata görünür

Güvenli çıkış akışı refresh revoke denemesiyle desteklenir

M49.1 ile netleşenler

expo-speech tabanlı sesli rehber mobilde açık

Sürücü mobilde Sıradaki durağı oku ve ETA oku çalıştırabilir

Sesli rehber açık/kapalı tercihi saklanır

Aynı durak/ETA için tekrar anonslarını azaltan temel dedupe vardır

M50 ile netleşenler

Mobil release readiness için runtimeVersion ve updates politikası tanımlı

eas.json içinde preview ve production build profilleri var

Release hazırlığı kartı sürüm, hedef, build profilleri ve Expo Go durumunu gösterir

.env.example ve release metadata akışı mobil yayın öncesi kontrol için hazırlandı

Ürün kararları

Driver ana ürün girişi: Sürücü Kodu + PIN

İlk girişte PIN değişimi zorunlu

driver@demo.com / demo123 sadece hızlı panel / smoke hesabı olarak kalabilir

Driver için birincil hedef telefon uygulaması

Room / Company için tablet güçlü hedef, telefonda temel kullanım korunur

sürücünün telefon GPS'i ifadesi korunur

Parent / öğrenci scope sistemde vardır; eski “yok” varsayımı geçerli değildir

TTL / public link özeti

Presetler:

1 hafta

1 ay

6 ay

1 yıl

Ana kanıt komutları

tools\pack.ps1 -To 41

tools\pack_m47_4_mobile_readiness_web_pass.ps1 -RepoRoot D:\servis-platform

tools\pack_m48_driver_mobile_foundation.ps1 -RepoRoot D:\servis-platform

tools\pack_m48_5_room_company_tablet_readiness.ps1 -RepoRoot D:\servis-platform

tools\pack_m49_mobile_beta_hardening.ps1 -RepoRoot D:\servis-platform

tools\pack_m49_1_driver_voice_guidance_stop_eta.ps1 -RepoRoot D:\servis-platform

tools\pack_m50_mobile_release_readiness.ps1 -RepoRoot D:\servis-platform

SSOT dosyaları

tools/PRIMER_SNAPSHOT.md

docs/PRIMER_SSOT.md

docs/CHECKLIST_SSOT.md

tools/CHECKLIST_SSOT.md

docs/STARTPACK_V1.md

docs/NEXT_BACKLOG_V1.md

tools/README.md

Tools hijyen notu

Tek seferlik eski apply_overlay_* script’leri artık tools kökte değil

Arşiv yeri: tools/_archive/legacy-overlays/

tools/check_tools_hygiene_m105.ps1 bu kuralı artık denetliyor

Overlay / çalışma kuralı

Değişiklikleri mümkün olduğunca tek seferde overlay zip ile taşı

Zip açıldığında nested root olmasın

Apply script doğrudan bulunup çalıştırılabilsin

Yanıtlarda en fazla 3 PowerShell komutu ver

Post-M50 doğru durum

“M50 resmi tag var mı?” sorusu kapanmıştır: evet, var

Post-M50 release/tag belirsizliği kapandı

Şu an doğru iş: yeni büyük rota kararı + roadmap/backlog’u o rotaya göre açmak

Kanonik next-route token

POST-M50 NEXT ROUTE PLANNING

Yeni sohbette ilk cümle

Repo şu an v1-m50-green resmi green tag’i doğrulanmış durumda; main ise bunun üstünde 58afa12 commit’i ile post-M50 SSOT, roadmap refresh ve tools hijyen temizliğini içeriyor. Şu anki doğru iş yeni büyük rota kararını netleştirip backlog’u o rota üzerinden açmak.