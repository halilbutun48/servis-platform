# RUNBOOK — M46.6-D AI CHAT SHELL

> **Uyumluluk notu (M79+):** Bu M46 runbook'u art?k pilot-era exact versiyon etiketi beklemek yerine, ayn? davran???n modern Copilot y?zeyinde h?l? mevcut olup olmad???n? do?rulayan legacy compatibility referans? olarak okunmal?d?r.
> Exact `copilotVersion` eşitliği yerine davranışsal / yapısal doğrulama esastır.


Bu paket şunları ekler:
- sohbet sekmesi
- ekran bağlamıyla kısa cevap
- hızlı soru chip'leri
- cevap içi yönlendirme butonları
- rehbere geçiş butonları

## Yeni intent
- `CHAT_HELP`

## Hedef
Kullanıcı Copilot ekranında kısa soru yazabilsin; sistem seçili ekranı bilsin, sade Türkçe cevap versin ve gerekirse ilgili yere götürsün.

## İlk kapsam
- ekran bazlı sohbet kabuğu
- açılış mesajı
- 3–5 öneri chip'i
- rehber motorunu chat cevabına sarma
- DRIVER / PERSONEL / PARENT için sade sohbet erişimi

## Pack
```powershell
.\tools\pack_m46_6_d_ai_chat_shell.ps1 -RepoRoot D:\servis-platform
```