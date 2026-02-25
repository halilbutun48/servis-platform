# PERSONEL SERVİS V1 — PRIMER (SSOT)

Tarih: 2026-02-25  
Timezone: Europe/Istanbul

## Repo & doğrulama
- Repo path: `D:\servis-platform`
- Green referans: ✅ `GATE PASS (M0→M32)` + ✅ `PACK PASS (M0→M32)`
- Doğrulama: `tools\pack.ps1 -To 32`

## Çalışma prensipleri
- “Green” = Pack PASS.
- Değişiklikler mümkün olduğunca tek seferde overlay (zip).
- UI tarafında büyük dosyalarda copy/merge hatalarını azaltmak için component ayrıştırma tercih edilir.

## Güncel ürün akışı (özet)
- COMPANY: plan → (market shift) → offers → accept
- ROOM: offers → counter → approve/start
- DRIVER: route → reached → done
- PERSONEL: ride/request

## Yol haritası (kısa)
### M34 — Company Guided Flow (mevcut akış üstünden)
Wizard yeni baştan yazılmaz; mevcut akış stepper/guided moda alınır. Wizard finalinde “Gönderildi” ekranı + “Bekleyen Talepler’e Git (filtreli)” yönlendirmesi.

### M34.1 — ROOM Shifts birleşimi
ROOM Shifts içinde offered + assigned birleştirilir; preview+counter Shifts içinde yapılır. Offers ekranı secondary/debug kalır.
