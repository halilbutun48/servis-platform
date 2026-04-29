# Ticari Ödeme ve Mutabakat Hazırlık Modeli V1

Tarih: 2026-04-28  
Durum: Hazırlık modeli. Canlı charge / payout devrede değil.

Bu belge devreye alma belgesi değildir. Amaç, ticari akışta ödeme kanallarını, mutabakat akışını ve repo içi hazırlık sınırını tek yerde sabitlemektir.

Aktivasyon anahtarı:
- `PAYMENT_BACKBONE_ENABLED=0` => hazırlık / dormant
- `PAYMENT_BACKBONE_ENABLED=1` => canlı aktivasyon kapısı için uygun zemin

## 1) Resmi amaç
- Ticari akışta ödeme hazırlığını, tahsilat/mutabakat kaydını ve operasyon görünürlüğünü tek omurgada toplamak.
- Canlı sanal POS, banka entegrasyonu veya provider webhook açmadan önce veri modelini ve operasyon sırasını netleştirmek.
- Kart verisini sistem içinde tutmamak; PCI kapsamını mümkün olduğunca dar tutmak.

## 2) Kanal önceliği
Hazırlık aşamasında varsayılan sıra şudur:

1. **FAST / EFT / Havale**
2. **Sanal POS + 3D Secure**
3. Sonraki fazlar: taksit, tekrar eden ödeme, QR, açık bankacılık, iade / chargeback otomasyonu

Bu repo için operasyonel varsayılan, özellikle B2B ve sözleşme tabanlı akışlarda banka transferidir. Kartlı akış ikincil ve kontrollü bir hazırlık kanalıdır.

## 3) Repo içi kanonik model
Mevcut omurga şu halkalarla çalışır:

- `CommercialSource`  
  Ticari kaynağın tekil kaydı. Kaynak tipi bugün `AGREEMENT` veya `SHIFT_SERIES` olabilir.

- `SettlementPlan`  
  Ticari kaynak için hazır mutabakat planı. Toplam, komisyon ve provider net tutarını taşır.

- `SettlementEntry`  
  Planın iş satırları. Bugün şirket tahsilat, platform komisyonu ve provider payout satırlarını temsil eder.

- `SettlementReconciliationRecord`  
  Bekliyor / eşleşti / inceleme gerekli / uyuşmazlık / kapandı durumlarını taşır.

- `PaymentMode = OFF | OPTIONAL | REQUIRED`  
  Omurganın görünürlük ve zorunluluk seviyesini belirler.

- `providerAdapterKey = DORMANT`  
  Bu fazda canlı provider yerine dormant adapter kullanılır.

Bu yapı, ayrı bir ödeme gateway açmadan önce intent / plan / mutabakat modelini hazırlamak için yeterlidir.

## 4) Repo yüzeyleri
Hazırlık modeli şu yüzeylerde görünür:

- `backend/src/routes/commercialCore.js`
- `backend/src/services/paymentBackbone.js`
- `backend/src/ops/commercialCoreManifest.js`
- `backend/src/ops/settlementReconciliationDesk.js`
- `web/src/panels/superadmin/CommercialCorePanel.jsx`
- `GET /api/commercial-core/payment-backbone/sources`
- `GET /api/commercial-core/payment-backbone/sources/export.csv`

İlgili kanonik açıklama zinciri:

- `docs/RUNBOOK_M82_9_DORMANT_PAYMENT_BACKBONE.md`
- `docs/RUNBOOK_M82_11_PAYMENT_READONLY_SURFACE.md`
- `docs/RUNBOOK_M88_SETTLEMENT_OPERATIONS_CONSOLE.md`
- `docs/RUNBOOK_M89_SETTLEMENT_RECONCILIATION_DESK.md`

## 5) Hazırlıkta kalacak şeyler
Bu aşamada şunlar canlıya alınmaz:

- gerçek charge / capture
- gerçek payout
- canlı provider webhook
- kart verisi saklama
- otomatik mutabakat replay / settlement finalize

Bu başlıklar yalnız hazırlık ve operasyon tasarımı düzeyinde kalır.

## 6) Hazırlık checklist
- Ticari kaynaklar doğru oluşuyor mu?
- Settlement plan, entry ve reconciliation kayıtları okunabiliyor mu?
- Ödeme kaynakları listesi ve CSV dışa aktarım yüzeyi okunabiliyor mu?
- Payment account readiness yüzeyi görünür mü?
- Banka transferi ile kartlı ödeme ayrımı net mi?
- Kartlı akışta 3D Secure ve hosted checkout varsayımı korunuyor mu?
- PCI kapsamı dar tutuluyor mu?
- Mutabakat ve audit kayıtları Super Admin yüzeyinde okunabiliyor mu?

## 7) Aktivasyon checklist
Canlı kapı açılmadan önce bu sıra görünür ve okunur kalır:

- `PAYMENT_BACKBONE_ENABLED=0/1` bayrağı tanımlı mı?
- Super Admin yazma yüzeyleri step-up ile korunuyor mu?
- Banka transferi birincil kanal olarak hazır mı?
- Sanal POS + 3D Secure kanalı ikinci fazda bekliyor mu?
- Provider webhook / payout entegrasyonu ayrı kapıda mı?
- Finance / operasyon GO kararı ayrı bir onay noktası mı?
- Rollback / smoke / audit planı erişilebilir mi?
- Ödeme kaynakları CSV export trail audit'e düşüyor mu?

## 8) Repo kararı
Bu repo turunda hedef canlı ödeme açmak değildir.
Hedef, ödeme ve mutabakat sistemini canlıya hazır, fakat dormant / hazırlık modunda tutmaktır.

Bu yüzden:
- banka transferi önce gelir
- sanal POS + 3D Secure ikinci kanaldır
- settlement ve reconciliation ayrı operasyon katmanlarıdır
- M85 / M86 çizgisi bu belgeye göre gelecekteki aktivasyon kapısı olarak kalır

## 9) Kaynaklar
- [TCMB EFT / FAST](https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB%20TR/Main%20Menu/Temel%20Faaliyetler/Odeme%20Sistemleri/Turkiyedeki%20Odeme%20Sistemleri/Elektronik%20Fon%20Transfer%20%28EFT%29%20Sistemi)
- [TCMB FAST FAQ](https://fast.tcmb.gov.tr/wps/wcm/connect/fast/sss?v=1.0.24)
- [PCI DSS](https://www.pcisecuritystandards.org/standards/pci-dss/)
- [BKM 3D Secure kılavuzu](https://bkm.com.tr/wp-content/uploads/2015/06/Kartl%C4%B1-%C3%96deme-Sistemleri-Kurallar%C4%B1-%C3%9Cye-%C4%B0%C5%9Fyeri-K%C4%B1lavuzu.pdf)
