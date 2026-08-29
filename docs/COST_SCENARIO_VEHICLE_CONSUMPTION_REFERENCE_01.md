# #4 Vehicle Consumption Reference Contract

This document records the versioned, reviewable technical fallback used by the
existing `COST-SCENARIO-FORECAST-AND-SAVINGS-01` calculation engine. It does not
introduce a second calculator or a synthetic market aggregate.

## Authority and precedence

For a vehicle class, the resolver uses the first applicable layer in this order:

1. `USER_ACTUAL` — an explicitly provided authorized actual value.
2. `PLATFORM_OBSERVED_REFERENCE` — a privacy-safe SeferPakt reference that has
   the declared minimum sample threshold.
3. `TECHNICAL_CLASS_REFERENCE` — the sourced class fallback below.
4. `NO_DATA` — no value is fabricated.

An actual value never overwrites the technical reference. A vehicle-class change
does not carry an actual consumption value from the previous class unless the
user explicitly supplies a new actual value.

## Approved technical fallback

| Class | Sourced description | Fuel type | Raw value | Normalized unit | Confidence | Applicability limit |
| --- | --- | --- | --- | --- | --- | --- |
| `MINIBUS` | Ford Minibüs | Diesel-specific | 7.9 L/100 km | `L_PER_100_KM` | Medium | Official procurement decision class example; model, load, traffic and duty cycle can change actual consumption. |
| `MIDIBUS` | Otokar Sultan Midibüs | Diesel-specific | 21 L/100 km | `L_PER_100_KM` | Medium | Official procurement decision class example; Sultan submodel, load, traffic and duty cycle can change actual consumption. |
| `OTOBUS` | MAN otobüs | Diesel-specific | 29 L/100 km | `L_PER_100_KM` | Low | The bus subtype, capacity and duty cycle are not known; this is not a universal bus value. |

Primary source: [Kamu İhale Kurulu Kararı 2021/UH.II-2065](https://ekap.kik.gov.tr/EKAP/Vatandas/KurulKararGoster.aspx?KararId=1f3b68fb33ea4ee19851b5923a7523ec90bdcd52bee219b9be6424d9f3190a70&KararMetni=cf7848d477927f460e0fe86415953ca75bffaf21b349eebfe3bc7aedc148508c), dated 2021-11-11. The decision records 7.9 L/100 km for Ford minibus, 21 L/100 km for Otokar Sultan midibus and 29 L/100 km for MAN bus, based on authorized-service evidence in that procurement context.

Corroborating applicability references:

- [Ford Transit Minibüs technical brochure](https://www.ford.com.tr/getmedia/8595b24b-d82e-4e35-8df9-a5677ed8adfe/transit-minibus-2018-temmuz-teknik-brosur.pdf.aspx?ext=.pdf) distinguishes type-test consumption from an individual vehicle's actual consumption.
- [Otokar Sultan Comfort official product page](https://commercial.otokar.com.tr/otobus/turizm-servis-araci/sultan-comfort-otobus) identifies the service/personnel-transport product as diesel and documents capacity variation.

## Review metadata

- Reference version: `SEFERPAKT-VEHICLE-CONSUMPTION-REFERENCE-V1`
- Unit: `L_PER_100_KM`
- Reviewed at: `2026-08-29`
- Source kind: `TECHNICAL_CLASS_REFERENCE`
- The resolver exposes source identity, source URL, source date, version,
  confidence, geography and applicability limits in the #4 preview evidence.

Fuel price remains owned by #2. #4 reads an approved #2 external reference by
provider, region and freshness; it does not call EPDK or scrape the web.
