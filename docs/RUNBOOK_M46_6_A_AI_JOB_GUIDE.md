# M46.6-A — AI Job Guide Runbook

## Amaç

M46.6-A, mevcut Copilot hattını bozmadan üstüne sade Türkçe **İş Rehberi** katmanı ekler.

Bu paket ile:
- `POST /api/ai/copilot` korunur
- yeni `intent=JOB_GUIDE` açılır
- Copilot panelinde **Rehber / Gelişmiş** ayrımı gelir
- ilk 4 iş için çok sade Türkçe rehber üretilir

## İlk iş türleri

- `OFFER_REVIEW`
- `OFFER_APPROVAL`
- `ASSIGNMENT_READINESS_GUIDE`
- `VEHICLE_DRIVER_BIND`

## Dil kuralları

Kullanıcıya görünen yerde İngilizce yerine Türkçe tercih edilir.

Örnekler:
- agreement → sözleşme
- offer → teklif
- assignment → atama
- driver GPS → sürücünün telefon GPS'i
- device GPS → cihaz GPS'i

## Response alanları

M46.6-A rehber hattı şu alanları döner:
- `jobTitle`
- `jobPurpose`
- `plainSummary`
- `whatToDoNow`
- `whatToDoNext`
- `doNotDo`
- `stepByStep`
- `commonMistakes`
- `doneChecklist`
- `simpleTerms`
- `screenExplanation`

## Web davranışı

Copilot panelinde iki görünüm vardır:
- **Rehber** → varsayılan, sade anlatım
- **Gelişmiş** → mevcut M46.5 analiz görünümü

## Çalıştırma

```powershell
.\tools\pack_m46_6_a_ai_job_guide.ps1 -RepoRoot D:\servis-platform
```

## Repo contract

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\check_m46_6_a_ai_job_guide_repo_contract.ps1 -RepoRoot D:\servis-platform
```
