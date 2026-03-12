# M46.6-T — AI Konum Kaynağı Rehberi

Bu paket, Copilot içindeki İş Rehberi hattına araç odaklı 3 yeni job ekler:

- **Cihaz GPS'i ekleme**
- **Konum kaynağı rehberi**
- **GPS sinyal teşhisi**

## Amaç

Sistem ana akış olarak **sürücünün telefon GPS'i** mantığını korur.
İstenirse **cihaz GPS'i** ek konum kaynağı olarak dahil edilebilir.
Bu rehber, kullanıcıya bu ayrımı çok sade Türkçe ile anlatır.

## Gelen alanlar

- `beforeYouStart`
- `quickActions`
- `ifStuck`
- `simpleTerms`
- `screenExplanation`

## Doğrulama

```powershell
.\tools\pack_m46_6_t_ai_location_source_guide.ps1 -RepoRoot D:\servis-platform
```
