# FIELD-LAUNCH-PACK-01 Runbook

## Amaç
Bu runbook, saha/pilot öncesi launch hazırlığını tek resmi kontrol akışında toplar.

Bu doküman:
- ürün runtime davranışını değiştirmez
- otomatik seed çalıştırmaz
- canlı veritabanını değiştirmez
- `backend/src`, `web/src`, `mobile/src`, `prisma/migrations` alanlarında değişiklik gerektirmez
- `backend/artifacts/runtime-data` dosyalarını commit'e aldırmaz

## Kapsam
- demo veri sağlığı
- backend health
- git / release durumu
- E2E-SMOKE-01 referansı
- COP-03C-FIX-02 canlı kabul referansı
- mobil gerçek cihaz kanıtı
- readonly hakediş sınırı
- KVKK / rol sınırı
- GPS kaynak dili
- rollback / no-go kararı

## Ön Koşullar
- `E2E-SMOKE-01` demo acceptance paketi hazır olmalı.
- COP-03C-FIX-02 canlı kabul turu için UI testi planlanmış olmalı.
- Demo Firma, DEMO Oda, DEMO Araç, DEMO Sürücü ve DEMO Personel görünür olmalı.
- En az 1 DEMO sözleşme ve sözleşmeden üretilmiş vardiya görünür olmalı.
- Super Admin hesabı erişilebilir olmalı.

## Demo Veri Gereksinimleri
- DEMO Firma
- DEMO Oda
- DEMO Araç
- DEMO Sürücü
- 5-6 DEMO Personel
- 1 DEMO sözleşme
- sözleşmeden üretilmiş 1 vardiya
- 1 onaylı / atanmış vardiya
- gerekiyorsa DEMO Veli / Parent

## Kullanılacak Hesaplar
- Super Admin
- DEMO Firma
- DEMO Oda
- DEMO Sürücü
- DEMO Personel
- DEMO Veli / Parent varsa

## Saha / Pilot Öncesi Health Kontrolü

### Backend health
```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
```

Beklenen:
- `ok` true
- API canlı
- temel health kontrolü geçiyor

### Git / release kontrolü
```powershell
git status --short
git log -1 --oneline
git tag --points-at HEAD
```

Beklenen:
- çalışma ağacı kontrollü
- beklenen commit/tag doğrulanabiliyor
- yanlış tag üzerinde kalınmıyor

## E2E-SMOKE-01 Referansı
- Referans doküman: `docs/E2E_SMOKE_01_DEMO_ACCEPTANCE.md`
- Bu runbook, demo smoke adımlarını tekrar etmez; onları launch kararına bağlar.
- E2E smoke PASS olmadan launch kararına geçilmez.

## COP-03C-FIX-02 Canlı Kabul Referansı
- Canlı kabul soruları:
  - Bu vardiya neden başlayamıyor?
  - Bu araç neden haritada görünmüyor?
  - Bu hakediş neden hazır değil?
  - Bu sözleşmeden bugün vardiya üretildi mi?
  - Operasyon Sağlığı: sorun ne?
- Bu runbook bu soruların yanıtını değiştirmez; launch öncesi kanıt toplama alanı açar.

## Mobil / Android Gerçek Cihaz Kanıtı
- Gerçek cihaz cihaz/model notu alınır.
- Android sürümü not edilir.
- API base gerçek cihaz için geçerli olmalıdır.
- Emulator ile gerçek cihaz kanıtı karıştırılmaz.
- Konum, bildirim ve giriş akışları için ayrı kanıt tutulur.

## Telematics / Traccar Notu
- Telematics / Traccar hattı ileride formal olarak kapanacaktır.
- Bu runbook bugün için launch öncesi visible risk olarak bırakır.
- Telematics verisi varsa kanıt notuna eklenir; yoksa no-go olarak işaretlenir.

## Hakediş / Ödeme Sınırı
- readonly hakediş önizlemesi olabilir
- aktif ödeme yok
- settlement execute yok
- ödeme başlatma aksiyonu launch öncesi görünmemelidir

## KVKK / Rol Sınırı
- Personel yalnız kendi kapsamındaki bilgiyi görmelidir.
- Veli yalnız kendi öğrencisi / servisi kapsamında kalmalıdır.
- Rol dışı yönetim aksiyonu önerilmemelidir.
- KVKK görünürlüğü açık sınırla doğrulanmalıdır.

## GPS Kaynak Dili
Dokümanda ve kanıtlarda şu dil korunur:
- Araç GPS’i
- Sürücünün telefon GPS’i
- GPS bekleniyor
- GPS eski

## Pilot Öncesi Karar Tablosu

| Alan | Durum | Not |
| --- | --- | --- |
| Backend health | PASS / FAIL / BLOCKED | `/health` sonucu |
| Git / release | PASS / FAIL / BLOCKED | status / log / tag |
| Demo veri sağlığı | PASS / FAIL / BLOCKED | firma / oda / araç / sürücü / vardiya |
| E2E-SMOKE-01 | PASS / FAIL / BLOCKED | demo acceptance referansı |
| COP-03C-FIX-02 canlı kabul | PASS / FAIL / BLOCKED | 5 Copilot sorusu |
| Mobil gerçek cihaz | PASS / FAIL / BLOCKED | Android kanıtı |
| Hakediş / ödeme sınırı | PASS / FAIL / BLOCKED | readonly preview only |
| KVKK / rol sınırı | PASS / FAIL / BLOCKED | görünürlük sınırı |
| GPS kaynak dili | PASS / FAIL / BLOCKED | araç / telefon GPS dili |
| Telemetics / Traccar notu | PASS / FAIL / BLOCKED | ileride formal kapanış |

## Kısa Sonuç Kuralı
- `PASS`: launch hazırlığı tamam
- `FAIL`: kritik açık var, düzeltme gerekir
- `BLOCKED`: dış bağımlı veya eksik veri

