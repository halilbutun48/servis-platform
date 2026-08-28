# COST-SCENARIO-FORECAST-AND-SAVINGS-01

## Amaç ve sahiplik

Bu milestone, SeferPakt içindeki doğrulanmış operasyon maliyet girdileriyle mevcut planı alternatif bir what-if senaryoyla karşılaştıran salt-okunur karar desteği yüzeyidir. Kanonik hesap sahibi `backend/src/finance/operationalCostModel.js` ve `backend/src/finance/operationalCostMath.js` olarak kalır; bu hat ikinci bir maliyet motoru kurmaz.

- Model sürümü: `COST-SCENARIO-FORECAST-AND-SAVINGS-01`
- API sahibi: `backend/src/routes/costScenario.js`
- UI sahibi: `web/src/panels/shared/CostScenarioWorkspacePanel.jsx`
- API: `GET /api/cost-scenarios/baseline`, `POST /api/cost-scenarios/preview`
- Odaklı check: `npm run check:costscenarioforecastandsavings01`
- Gerçek kabul: `npm run accept:costscenarioforecastandsavings01`
- Browser kabulü: `npm run smoke:costscenarioforecastandsavings01`

## Kapsam

Karşılaştırılabilen boyutlar araç sayısı/tipi/kapasitesi, yolcu sayısı, durak sayısı, mesafe, rota süresi, hizmet günü, sefer, yakıt ve açık maliyet varsayımlarıdır. Sonuçta `Mevcut Plan`, `Alternatif Senaryo`, `Tahmini Maliyet`, `Tahmini Tasarruf`, `Tahmini Ek Maliyet`, fark yüzdesi, bileşen kırılımı, eksik veri, uyarı, güven ve provenance görünür.

Araç kapasitesi yetersizse sonuç güvenli biçimde durur. Planlanan maliyet tabanı yalnızca açıkça girilmişse ve desteklenen araç/hizmet günü oranı uygulanabiliyorsa kullanılır; mesafe, yakıt veya başka bir etkiden tasarruf uydurulmaz. Para alanları güvenli integer kuruş değerleriyle taşınır; karışık para birimi karşılaştırması engellenir.

## Veri sınıfları ve provenance

Mevcut plan verisi tenant kapsamındaki `INTERNAL_ACTUAL` veya `INTERNAL_PLANNED` kaynağıyla etiketlenir. Kullanıcının alternatif değerleri `USER_SCENARIO_OVERRIDE`, türetilen tutarlar `DERIVED`, dış kaynaklar `EXTERNAL_REFERENCE` olarak kalır. Dış referansın kaynağı, provider'ı, kapsamı, as-of tarihi, güncellik ve güveni korunur; `EXTERNAL_REFERENCE` hiçbir zaman gerçekleşen maliyet veya muhasebe gerçeği değildir.

Güncel dış yakıt referansı forecast girdisini tamamlayabilir. Eski referans güveni düşürür; süresi dolmuş, bilinmeyen veya para birimi uyuşmayan referans maliyet hesabına alınmaz.

## RBAC ve tenant sınırı

- `COMPANY`: yalnız kendi şirketi; normal `COMPANY` için bütçe yaşam döngüsünden bağımsız senaryo önizlemesi.
- `ROOM`: yalnız kendi taşımacılık firması kapsamı.
- `SUPER_ADMIN`: açıkça seçilmiş company/room kapsamı.
- `SCHOOL` ve `ORGANIZATION`: şirket rolünün planlama bağlamında senaryo yüzeyi; normal finans/bütçe yaşam döngüsü açılmaz.
- `DRIVER`, `PERSONEL`, `PARENT`: erişim yok.

Her istekte bağlı tenant sunucuda çözülür; client tarafından gönderilen yabancı company/room kimliği reddedilir. `baselineReferenceId` güncel planla eşleşmiyorsa tekrar hesaplama istenir.

## Yazmama ve canlı mutasyon sınırı

Senaryo sonucu ephemeral'dır: DB modeli, audit kaydı, geçmiş senaryo kaydı veya kullanıcıya bildirim oluşturulmaz. `readOnly`, `previewOnly`, `writeAction:false`, `notPersisted`, `noLiveMutation`, `noBudgetChange`, `noShiftChange`, `noVehicleAssignmentChange`, `notInvoiced`, `notPaid` ve `notPostedToAccounting` kontratları korunur.

Bu milestone araç/sürücü ataması, rota uygulama, vardiya, sözleşme, bütçe, hakediş, fatura, ödeme, muhasebe, ERP veya export işlemi başlatmaz. #3 `HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01` ve #2 dış referans hattının mevcut sahipleri değiştirilmez.

## Bilinçli sonraki sınırlar

Planlanan maliyet ile gerçekleşen maliyetin otomatik mutabakatı, uzun dönem senaryo geçmişi, gerçek provider edinimi, otomatik optimizasyon ve Sefer Abi'nin maliyet açıklama/öneri katmanı bu milestone'un parçası değildir. Bunlar sırasıyla mevcut reconciliation, #2 provider, gelecekteki optimizasyon ve `SEFER-ABI-COST-ANALYSIS-ASSISTANT-01` sınırlarında ele alınır.
