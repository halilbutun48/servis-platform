# M71 Summary + Hot Path Runbook

Amaç: Company tarafında ilk açılışta tam liste yerine daha hafif özet veri kullanmak, route-preview tekrarlarını kısmak ve sıcak listeleri küçültmek.

## Bu pakette ne var
- `GET /api/company/overview/workflow-summary`
- `GET /api/company/overview/commercial-flow-summary`
- WorkflowPanel ilk açılışta room/agreement/shift/offers full list yerine summary okur
- CommercialFlowPanel summary endpoint ile açılır
- RoutePreviewModal aynı shift için kısa sürede tekrar istek atmaz
- `agreements` ve `offers/company` artık `q + take` destekler
- storm/readiness check scriptleri güncel fetch mimarisine göre ölçer

## Beklenen etki
- Planlama Merkezi ilk açılışında daha az GET
- Ticari Akışım ilk açılışında full offers + shifts yerine tek summary çağrısı
- route-preview aynı vardiyada tekrar aç/kapat akışında daha sakin
- sıcak ilk yüklerde `rooms/offers/agreements/vehicles` baskısı azalır

## Doğrulama
1. `tools/pack_m71_summary_hotpath.ps1`
2. ardından eski karşılaştırma için `tools/pack_m67_kurumsal_olcek_hazirlik.ps1`
3. özellikle `workflow`, `commercial-flow`, `route-preview`, `vehicles`, `offers/company`, `agreements` sıcaklıklarını kıyasla
