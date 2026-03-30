# M79 COPILOT ACCEPTANCE PACK

Amaç: Copilot'un M79 sonunda gerçekten ürün içi uzman rehber seviyesine gelip gelmediğini tek yerden doğrulamak.

## Bu pack neyi ölçer?
- Copilot omurgası ve ortak screen registry var mı?
- Plain language, follow-up, uncertainty ve route-chain davranışları korunuyor mu?
- Golden question pack skoru yeterince yüksek mi?
- Rol bazlı kalite seviyesi kabul eşiğini geçiyor mu?
- Temel soru tiplerinde yanlış yönlendirme belirgin şekilde düşmüş mü?

## Resmi kabul eşiği
- overall score >= 0.95
- role score >= 0.90
- NEXT_SCREEN >= 0.90
- STATUS_HELP >= 0.90
- WHY_BLOCKED >= 0.90
- ROLE_HELP >= 0.90
- weakest case floor >= 0.875

## Çalıştırma
```powershell
.\tools\pack_m79_copilot_acceptance.ps1 -RepoRoot D:\servis-platform
```

## Beklenen sonuç
- `PASS M79 D1 copilot acceptance pack`
- ardından `=== M79 COPILOT ACCEPTANCE PACK PASS ===`

## Not
Bu pack PASS verdiğinde M79'un teknik acceptance zemini oluşur. Resmi green kararı yine repo pack disiplini ve kullanıcı gözlemi ile birlikte verilmelidir.
