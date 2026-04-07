# MILESTONE REGISTRY V1

## 1) Tarihsel kapatilan resmi hatlar
- `M59 - gozlemleme + saha teshis - green`
- `M60 - saha acceptance merkezi - green`
- `M61 - ssot + milestone hizasi - green`
- `M62 - ticari omurga guclendirme - green`
- `M63 - guven + kalite + hizmet degerlendirme - green-base`
- `M64 - dogal copilot katmani - green`
- `M65 - pilot launch gate - green`
- `M67->M75 - living baseline / hot-path daraltma hatti - green`
- `M78 - operasyon dogrulama living hatti - green-base`
- `M78.1 - operasyon dogrulama yuzeyi - active-history`
- `M78.2 - operasyon dogrulama kayit katmani - active-history`
- `M78.3 - operasyon dogrulama ozet ve filtre katmani - active-history`
- `M79 - living verification toplama hatti - green`

## 2) Guncel aktif sertlestirme hatti
- `M80 - final sert kabul ve yuk guveni kapisi (resmi green degil)`
- `M80.1 - hot panel daraltma`
- `M80.2 - agreements + shifts giris yuku`
- `M80.3 - georeview + shifts son giris yuku`
- `M80.final - final sert kabul ve yuk guveni`
- `M81 - mobil saha sertlestirme`
- `M82 - saha oncesi cekirdek sertlestirme + controlled cleanup`
- `M82.1 - backend correctness kilidi`
- `M82.2 - web ui + api kontrat sertlestirme + buyuk dosyalari parcalama`
- `M82.3 - mobil gercek kullanim tamamlama`
- `M82.4 - mobil background gps / offline davranis sertlestirme`
- `M82.5 - canli konum kaynak onceligi`
- `M82.6 - release / env / acceptance sertlestirme`
- `M82.7 - repo hygiene + controlled cleanup`
- `M82.8 - verification 2.0`
- `M82.9 - dormant payment backbone`
- `M82.10 - super admin ticari ayarlar`
- `M82.11 - payment readonly ticari yuzey`

## 3) Sonraki resmi sira
- `M83 - saha test hazirlik paketi`
- `M84 - saha gozlem / geri bildirim dongusu`
- `M85 - odeme opsiyonel pilot`
- `M86 - odeme zorunlu rollout`
- `M87 - odeme hesabi hazirligi`
- `M88 - settlement operasyon masasi`
- `M89 - settlement mutabakat masasi`

## 4) Living verification convergence note
- `M90 - living verification & acceptance convergence (hazirlik / takip notu)`
  - amac: yasayan repo gercegi ile check / pack / acceptance / ssot hattini hizalamak
  - kural: yeni urun ozelligi degil, dogrulama ve kabul hizasi onceliklidir

## 5) Ticari omurga notu
- Ticari kaynak yalniz agreement degildir.
- Kisa sureli isler icin `SHIFT_SERIES` de ticari kaynak olabilir.
- Komisyon snapshot'i ticari kaynak olusturuldugu anda alinir.
- Oda bazli override, global varsayilanin ustunde calisir.

## 6) Bu dosyanin okuma yonu
- Once bu dosya okunur.
- Sonra `PRIMER_SSOT.md`.
- Sonra `STARTPACK_V1.md`.
- Sonra detay icin `SCRIPT_KILAVUZU_MILESTONE_HARITASI_V2_UPDATED.md`.
