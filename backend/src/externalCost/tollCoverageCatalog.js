const KGM_TARIFF_URL = "https://www.kgm.gov.tr/Sayfalar/KGM/SiteTr/Otoyollar/UcretlerYeni.aspx";
const KGM_CALCULATOR_URL = "https://vatandas.kgm.gov.tr/";
const KGM_TARIFF_DOCUMENT_ROOT = "https://www.kgm.gov.tr/SiteCollectionDocuments/KGMdocuments/Otoyollar/OtoyolKopruUcret/";

const KGM_DOCUMENT_FILES = Object.freeze({
  1: "1-15Temmuz-FSM.pdf",
  2: "2-Osmangazi.pdf",
  3: "3-YSSKoprusu.pdf",
  4: "4-1915Canakkale.pdf",
  5: "5-AnadoluOtoyoluCamlica-Akinci.pdf",
  6: "6-Izmir-Cesme.pdf",
  7: "7-Izmir-Aydin.pdf",
  8: "8-CukurovaOtoyoluAdana-Gaziantep.pdf",
  9: "9-CukurovaOtoyoluGaziantep-Sanliurfa.pdf",
  10: "10-CukurovaOtoyoluNigde-Mersin-Adana.pdf",
  11: "11-AvrupaOtoyoluMahmutbey-Edirne.pdf",
  12: "12-Gebze-Orhangazi-Izmir.pdf",
  13: "13-YSSKuzeyCevreYolu.pdf",
  14: "14-KMOAvrupaKinali-Odayeri.pdf",
  15: "15-KMOAnadoluKurtkoy-Akyazi.pdf",
  16: "16-Menemen-Aliaga-Candarli.pdf",
  17: "17-Ankara-Nigde.pdf",
  18: "18-Malkara-Canakkale.pdf",
  19: "19-Aydin-Denizli.pdf",
  20: "20-Cesmeli-KizkalesiTR.pdf",
});

const KGM_ROWS = [
  [1, "KGM-01-15TEMMUZ-FSM", "15 Temmuz Şehitler ve Fatih Sultan Mehmet köprüleri", null],
  [2, "KGM-02-OSMANGAZI", "Osmangazi Köprüsü", null],
  [3, "KGM-03-YSS", "Yavuz Sultan Selim Köprüsü", null],
  [4, "KGM-04-1915", "1915 Çanakkale Köprüsü", null],
  [5, "KGM-05-ANADOLU", "Anadolu Otoyolu", 10],
  [6, "KGM-06-IZMIR-CESME", "İzmir–Çeşme Otoyolu", 60],
  [7, "KGM-07-IZMIR-AYDIN", "İzmir–Aydın Otoyolu", 50],
  [8, "KGM-08-CUKUROVA-ADANA-GAZIANTEP", "Çukurova Otoyolları Adana Doğu–Gaziantep Batı", 31],
  [9, "KGM-09-CUKUROVA-GAZIANTEP-SANLIURFA", "Çukurova Otoyolları Gaziantep Doğu–Şanlıurfa", 36],
  [10, "KGM-10-NIGDE-MERSIN-ADANA", "Niğde–Mersin–Adana Batı Otoyolu", 40],
  [11, "KGM-11-AVRUPA", "Avrupa Otoyolu Mahmutbey–Edirne", 20],
  [12, "KGM-12-GEBZE-ORHANGAZI-IZMIR", "Gebze–Orhangazi–İzmir Otoyolu", null],
  [13, "KGM-13-YSS-KUZEY-CEVRE", "Yavuz Sultan Selim Köprüsü ve Kuzey Çevre Otoyolu", null],
  [14, "KGM-14-KMO-AVRUPA", "Kuzey Marmara Avrupa Otoyolu Kınalı–Odayeri", null],
  [15, "KGM-15-KMO-ANADOLU", "Kuzey Marmara Anadolu Otoyolu Kurtköy–Akyazı", null],
  [16, "KGM-16-MENEMEN-ALIAGA-CANDARLI", "Menemen–Aliağa–Çandarlı Otoyolu", null],
  [17, "KGM-17-ANKARA-NIGDE", "Ankara–Niğde Otoyolu", null],
  [18, "KGM-18-MALKARA-CANAKKALE", "Malkara–Çanakkale Otoyolu ve 1915 Çanakkale Köprüsü", null],
  [19, "KGM-19-AYDIN-DENIZLI", "Aydın–Denizli Otoyolu", null],
  [20, "KGM-20-CESMELI-KIZKALESI", "Çeşmeli–Kızkalesi kesimi", null],
];

function kgmRow([catalogId, coverageKey, label, highwayId]) {
  const notOpenOrNoTariff = catalogId === 20;
  const openForTariff = Number.isSafeInteger(highwayId) && !notOpenOrNoTariff;
  const tariffDocumentFile = KGM_DOCUMENT_FILES[catalogId] || null;
  return {
    coverageKey,
    authority: "KGM",
    operator: "Karayolları Genel Müdürlüğü",
    label,
    family: label.toLocaleLowerCase("tr-TR").includes("köprü") ? "BRIDGE" : "TOLL",
    providerKey: openForTariff ? "KGM_TOLL" : null,
    highwayId: openForTariff ? highwayId : null,
    officialCatalogId: catalogId,
    adapterStatus: notOpenOrNoTariff ? "NOT_OPEN_OR_NO_TARIFF" : openForTariff ? "SUPPORTED" : "CATALOG_ONLY",
    pricePublication: openForTariff ? "SUPPORTED_IF_ROUTE_AND_TARIFF_MATCH" : "NOT_PROVEN",
    tariffSourceUrl: KGM_TARIFF_URL,
    tariffDocumentFile,
    tariffDocumentUrl: tariffDocumentFile ? `${KGM_TARIFF_DOCUMENT_ROOT}2026Gecis_Ucret/${tariffDocumentFile}` : null,
    calculatorUrl: openForTariff ? KGM_CALCULATOR_URL : null,
    tariffEffectiveDatePolicy: "PARSE_OFFICIAL_SOURCE_OR_CURRENT_DOCUMENT_COLLECTION",
    sourceScope: "TURKEY",
  };
}
const OPERATOR_ROWS = [
  {
    coverageKey: "OTOYOL-O5-GEBZE-ORHANGAZI-IZMIR",
    authority: "OTOYOL_AS",
    operator: "Otoyol Yatırım ve İşletme A.Ş.",
    label: "İstanbul–İzmir Otoyolu (O5)",
    family: "TOLL",
    providerKey: "OTOYOL_A5",
    adapterStatus: "SUPPORTED",
    pricePublication: "SUPPORTED_IF_ROUTE_AND_TARIFF_MATCH",
    tariffSourceUrl: "https://isletme.otoyolas.com.tr/gecis-ucreti-hesapla/",
    calculatorUrl: "https://isletme.otoyolas.com.tr/gecis-ucreti-hesapla/",
    tariffEffectiveDatePolicy: "REQUIRE_OFFICIAL_DATE",
    sourceScope: "TURKEY",
  },
  {
    coverageKey: "KMO-AVRUPA",
    authority: "KMO",
    operator: "Kuzey Marmara Otoyolu / Avrupa Otoyol İşletmesi",
    label: "Kuzey Marmara Avrupa Otoyolu",
    family: "TOLL",
    providerKey: null,
    adapterStatus: "CATALOG_ONLY",
    pricePublication: "NOT_PROVEN",
    tariffSourceUrl: "https://www.kuzeymarmaraotoyolu.com/ucret-tarifeleri",
    calculatorUrl: "https://www.avrupaotoyolisletmesi.com/",
    tariffEffectiveDatePolicy: "MANUAL_OFFICIAL_DATE_REQUIRED",
    sourceScope: "TURKEY",
  },
  {
    coverageKey: "KMO-ANADOLU",
    authority: "KMO",
    operator: "Kuzey Marmara Otoyolu / Anadolu Otoyol İşletmesi",
    label: "Kuzey Marmara Anadolu Otoyolu",
    family: "TOLL",
    providerKey: null,
    adapterStatus: "CATALOG_ONLY",
    pricePublication: "NOT_PROVEN",
    tariffSourceUrl: "https://www.kuzeymarmaraotoyolu.com/ucret-tarifeleri",
    calculatorUrl: "https://www.anadoluotoyolisletmesi.com/",
    tariffEffectiveDatePolicy: "MANUAL_OFFICIAL_DATE_REQUIRED",
    sourceScope: "TURKEY",
  },
  {
    coverageKey: "YSS-KUZEY-CEVRE",
    authority: "ICA_KMO",
    operator: "Yavuz Sultan Selim Köprüsü ve Kuzey Çevre Otoyolu işletmesi",
    label: "Yavuz Sultan Selim Köprüsü ve Kuzey Çevre Otoyolu",
    family: "BRIDGE",
    providerKey: null,
    adapterStatus: "CATALOG_ONLY",
    pricePublication: "NOT_PROVEN",
    tariffSourceUrl: KGM_TARIFF_URL,
    calculatorUrl: null,
    tariffEffectiveDatePolicy: "MANUAL_OFFICIAL_DATE_REQUIRED",
    sourceScope: "TURKEY",
  },
  {
    coverageKey: "1915-CANAKKALE",
    authority: "1915_CANAKKALE",
    operator: "1915 Çanakkale Otoyolu İşletmesi",
    label: "Malkara–Çanakkale Otoyolu ve 1915 Çanakkale Köprüsü",
    family: "BRIDGE",
    providerKey: null,
    adapterStatus: "CATALOG_ONLY",
    pricePublication: "NOT_PROVEN",
    tariffSourceUrl: "https://www.1915canakkale.com/online-islemler/gecis-ucreti-sorgulama",
    calculatorUrl: "https://www.1915canakkale.com/online-islemler/gecis-ucreti-sorgulama",
    tariffEffectiveDatePolicy: "MANUAL_OFFICIAL_DATE_REQUIRED",
    sourceScope: "TURKEY",
  },
  {
    coverageKey: "AVRASYA-TUNNEL",
    authority: "AVRASYA_TUNNEL",
    operator: "Avrasya Tüneli İşletme İnşaat ve Yatırım A.Ş.",
    label: "Avrasya Tüneli",
    family: "TUNNEL",
    providerKey: null,
    adapterStatus: "CATALOG_ONLY",
    pricePublication: "NOT_PROVEN",
    tariffSourceUrl: "https://www.avrasyatuneli.com/ucretlendirme/",
    calculatorUrl: null,
    tariffEffectiveDatePolicy: "MANUAL_OFFICIAL_DATE_REQUIRED",
    sourceScope: "TURKEY",
  },
  {
    coverageKey: "CESMELI-KIZKALESI",
    authority: "MERSIN_OTOYOL",
    operator: "Mersin Otoyolu Yatırım ve İşletme A.Ş.",
    label: "Çeşmeli–Kızkalesi kesimi",
    family: "TOLL",
    providerKey: null,
    adapterStatus: "NOT_OPEN_OR_NO_TARIFF",
    pricePublication: "NOT_PROVEN",
    tariffSourceUrl: "https://www.kgm.gov.tr/Sayfalar/KGM/SiteTr/Projeler/OtoyolProjeleri/CesmeliKizkalesi.aspx",
    calculatorUrl: null,
    tariffEffectiveDatePolicy: "NO_CURRENT_TARIFF_PROVEN",
    sourceScope: "TURKEY",
  },
];

const CATALOG = Object.freeze([
  ...KGM_ROWS.map(kgmRow),
  ...OPERATOR_ROWS,
].map((row) => Object.freeze(row)));

export function listTurkeyTollCoverage() {
  return CATALOG.map((row) => ({ ...row }));
}

export function findTurkeyTollCoverage(coverageKey) {
  const key = String(coverageKey || "").trim().toUpperCase();
  const row = CATALOG.find((item) => item.coverageKey.toUpperCase() === key);
  return row ? { ...row } : null;
}

export function findTurkeyTollCoverageByHighwayId(highwayId) {
  const id = Number(highwayId);
  const row = CATALOG.find((item) => item.highwayId === id);
  return row ? { ...row } : null;
}
