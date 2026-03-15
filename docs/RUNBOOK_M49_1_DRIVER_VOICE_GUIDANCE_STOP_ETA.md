# RUNBOOK — M49.1 DRIVER VOICE GUIDANCE + STOP ETA

Tarih: 2026-03-15  
Timezone: Europe/Istanbul

## Amaç
`M49.1`, mevcut sürücü mobil beta katmanına **voice guidance** ve **stop ETA** görünürlüğü ekler.

Bu adımın hedefi:
- `Sürücü Kodu + PIN` / `Surucu Kodu + PIN` akışını bozmadan sesli rehber eklemek
- siradaki duragi telefonda okuyabilmek
- durak ETA bilgisini sesli olarak tekrar edebilmek
- istenirse sesli rehberi ac/kapat tercihini cihazda saklamak
- rota yenilendikce ayni durak/eta icin gereksiz tekrar anonsunu azaltmak

Bu adımda secilen mobil teknik:
- `expo-speech` ile metinden sese okuma
- mevcut Expo Go / SDK 54 hattini koruma
- ayni mobil uygulama icinde card + buton bazli dusuk riskli genisleme

Bu adım henüz şunları tam açmaz:
- arka plan voice navigation
- turn-by-turn yol tarifi
- foreground service
- rafine stop ETA modeli
- release store hazirliklari

## Dosyalar
- `mobile/App.js`
- `mobile/package.json`
- `mobile/src/lib/storage.js`
- `mobile/src/lib/voice.js`
- `mobile/src/screens/TodayScreen.js`
- `mobile/scripts/m49_1_driver_voice_guidance_stop_eta_check.js`
- `tools/pack_m49_1_driver_voice_guidance_stop_eta.ps1`
- `tools/check_m49_1_driver_voice_guidance_stop_eta_repo_contract.ps1`
- `docs/RUNBOOK_M49_1_DRIVER_VOICE_GUIDANCE_STOP_ETA.md`

## Ne değişti?
- `Sesli rehber` karti eklendi.
- `Siradaki duragi oku` butonu eklendi.
- `ETA oku` butonu eklendi.
- sesli rehber ac/kapat tercihi cihazda saklanir.
- rota yenilenince, yeni durak / yeni ETA bucket gelirse otomatik anons yapilabilir.
- `expo-speech` ile Turkce (`tr-TR`) okuma denenir.

## Kurulum notu
`mobile` klasorunde bagimliliklar guncellenecekse:

```powershell
cd D:\servis-platform\mobile
npx expo install expo-speech
```

## Kanıt komutu
```powershell
.\tools\pack_m49_1_driver_voice_guidance_stop_eta.ps1 -RepoRoot D:\servis-platform
```

## Kapsam sınırı
Bu adım uygulamayi daha kullanilabilir beta hale getirir.
`M50` tarafinda acilacaklar:
- release readiness
- cihaz saha checklist
- son mobil polish
