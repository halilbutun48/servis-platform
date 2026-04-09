# MILESTONE REGISTRY V1

## 1) Tarihsel kapatılan resmi hatlar
- `M59 - gozlemleme + saha teshis - open historical gate`
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

## 2) Güncel kapalı upper route
- `M80 - final sert kabul ve yuk guveni - green`
- `M80.1 - hot panel daraltma - green`
- `M80.2 - agreements + shifts giris yuku - green`
- `M80.3 - georeview + shifts son giris yuku - green`
- `M81 - mobil saha sertlestirme - green`
- `M82.1 - backend correctness kilidi - green`
- `M82.8 - verification 2.0 - green`
- `M82.9 - dormant payment backbone - green`
- `M82.10 - super admin ticari ayarlar - green`
- `M82.11 - payment readonly ticari yuzey - green`
- `M83 - saha test hazirlik paketi - green`
- `M84 - saha gozlem / geri bildirim dongusu - green`
- `M85 - odeme opsiyonel pilot - green`
- `M86 - odeme zorunlu rollout - green`
- `M87 - odeme hesabi hazirligi - green`
- `M88 - settlement operasyon masasi - green`
- `M89 - settlement mutabakat masasi - green`

## 3) Sonraki resmi sira
- `M90 - canonical closure / 10-10 kapanis paketi`
  - amac: canonical markdown, state, script-guide, proof-politikasi ve verification orkestrasyonunu tek gercekte toplamak
  - kural: yeni urun ozelligi degil; docs/verify/hijyen hizasi onceliklidir
- `M90B.1 - executable closure gate`
  - amac: `M0->M89 green` bazinin ustune docs/state/pack/verify convergence icin calisan resmi kapanis kapisi koymak
  - komut: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- `M90C.6 - hot-file queue policy`
  - amac: repo-audit large/hot file listesini resmi sinifli queue olarak kilitlemek; justified exception / safe candidate review / acceptance-sensitive-later dagilimini state-first policy ile dogrulamak
  - komut: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`

## 4) Ticari omurga notu
- Ticari kaynak yalniz sozlesme degildir.
- Kisa sureli isler icin `SHIFT_SERIES` de ticari kaynak olabilir.
- Komisyon snapshot'i ticari kaynak olusturuldugu anda alinir.
- Oda bazli override, global varsayilanin ustunde calisir.

## 5) Bu dosyanin okuma yonu
- Once `tools/repo_contract_state.json` okunur.
- Sonra bu dosya okunur.
- Sonra `docs/PRIMER_SSOT.md` okunur.
- Sonra `docs/STARTPACK_V1.md` okunur.
- Sonra detay icin `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md` okunur.

## REPO_CONTRACT_MARKERS_V1
- REGISTRY_ROUTE_M63_M65_V1
- REGISTRY_ROUTE_M80_M89_V1
