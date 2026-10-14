import { evaluateGeneralArithmeticRequest, generalCreativeOutputShape, hasLiveWorkflowGroundingReference, inferCanonicalSemanticRequest, inferRequestedOwnershipScope, isExplicitRoleHelpIntent, isGenericProductHelpIntent, isGeneralArithmeticRequest, isGeneralCreativeOutputVocabularyRequest } from "./canonicalSemanticRequest.js";

export { isExplicitRoleHelpIntent, isGenericProductHelpIntent };

const PRODUCT_WORDS = [
  "vardiya", "sefer", "shift", "araç", "arac", "plaka", "sürücü", "surucu", "şoför", "sofor",
  "gps", "konum", "rota", "durak", "eta", "operasyon", "servis", "teklif", "sözleşme", "sozlesme", "kontrat",
  "anlaşma", "anlasma", "plan", "personel", "öğrenci", "ogrenci", "çocuk", "cocuk", "veli", "talep",
  "maliyet", "bütçe", "butce", "finans", "bildirim", "tenant", "kayıt", "kayit", "ekran", "panel",
  "sistem sağlığı", "sistem sagligi", "platform riski", "yetki", "ticari",
  // A selected product record can be addressed through its visible field
  // semantics without repeating the domain noun (for example, "kartın
  // kararı" or "tarih aralığı"). These are product signals, not generic
  // knowledge terms.
  "karar", "durum", "tarih aralığı", "tarih araligi", "başlangıç", "baslangic", "bitiş", "bitis",
  "tarihleri", "tarihlerini", "saat aralığı", "saat araligi", "zaman aralığı", "zaman araligi",
  "hangi saatler arasında", "hangi saatler arasinda", "seçili kayıt", "seçili kaydın", "seçili kaydin",
  "önemli alan", "onemli alan",
  "bedel", "tutar", "hizmet alanı", "hizmet alani", "hizmet alan firma", "taşımacı", "tasimaci", "nakliyeci", "nakliyatçı", "nakliyatci",
  "taşımacılık firması", "tasimacilik firmasi", "alıcı firmanın yazdığı", "alici firmanin yazdigi", "alıcı tarafın tutarı", "alici tarafi tutari",
  "hizmet alanın yazdığı", "hizmet alanin yazdigi", "firmanın verdiği rakam", "firmanin verdigi rakam", "müşteri tarafı tutarı", "musteri tarafi tutari",
  "taşıyıcının yazdığı", "tasiyicinin yazdigi", "taşımacının yazdığı", "tasimacinin yazdigi", "taşıyıcı firma bedeli", "tasiyici firma bedeli",
  "kalite", "eksik veri", "risk",
  // Protected-field language is still a product request: route it into the
  // canonical field-privacy gate instead of silently treating it as off-topic.
  "ham kişisel", "ham kisisel", "raw personal", "ad soyad", "telefon numarası", "telefon numarasi",
  "e-posta", "email", "tc kimlik", "koordinat", "enlem", "boylam", "latitude", "longitude",
  "şifre", "sifre", "password", "totp", "otp", "api key", "gizli anahtar",
  "telefon", "kişisel", "kisisel", "isim", "isimleri", "ad soyadları", "ad soyadlari", "secret", "token",
  "adres", "ham adres", "gizli konum", "gizli adres",
  "kısaca", "kisaca", "özetle", "ozetle", "madde madde", "tek cümle", "tek cumle", "kanıtıyla", "kanitiyla", "önce sonucu", "once sonucu",
];

const LIVE_EXTERNAL_WORDS = [
  "hava", "hava durumu", "döviz", "doviz", "usd", "eur", "euro", "dolar", "bitcoin", "btc",
  "kripto", "trafik", "kur kaç", "kur kac", "güncel kur", "guncel kur", "şu an kaç", "su an kac",
];

const VAGUE_REFERENCE_WORDS = [
  "şey", "sey", "hani o", "hani az önceki", "hani az onceki", "az önceki", "az onceki", "o neydi", "adı neydi", "adi neydi", "şunu", "sunu", "öteki", "oteki", "diğerini", "digerini",
  "bunu", "bu neydi", "hangisiydi", "neydi",
];

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text, values) {
  return values.some((value) => text.includes(normalize(value)));
}

function hasCommercialFieldAliasSignal(text) {
  return hasAny(text, [
    "hizmet alan tutarı", "hizmet alan tutari", "hizmet alan tarafın tutarı", "hizmet alan tarafin tutari",
    "hizmet alan tarafın girdiği bedel", "hizmet alan tarafin girdigi bedel", "hizmet alanın bedeli", "hizmet alanin bedeli",
    "hizmet alan tarafın parası", "hizmet alan tarafin parasi", "müşteri parası", "musteri parasi",
    "alıcı firmanın yazdığı", "alici firmanin yazdigi", "alıcı taraftaki tutar", "alici taraftaki tutar",
    "alıcı taraf ne yazmış", "alici taraf ne yazmis", "alıcı ne yazmış", "alici ne yazmis", "alıcı tarafın girdiği bedel", "alici tarafin girdigi bedel",
    "hizmet alan ne yazmış", "hizmet alan ne yazmis", "hizmet alanın yazdığı", "hizmet alanin yazdigi",
    "firma kaç para", "firma kac para", "firma kaç yazmış", "firma kac yazmis", "firma ne yazmış", "firma ne yazmis", "firma rakamı", "firma rakami",
    "firma ne girmiş", "firma ne girmis", "firmanın verdiği rakam", "firmanin verdigi rakam",
    "müşterinin yazdığı tutar", "musterinin yazdigi tutar", "müşteri ne yazmış", "musteri ne yazmis",
    "müşteri kaç girmiş", "musteri kac girmis", "müşterinin verdiği rakam", "musterinin verdigi rakam",
    "karşı tarafın yazdığı tutar", "karsi tarafin yazdigi tutar",
    "taşımacının yazdığı", "tasimacinin yazdigi", "taşımacı kaç yazmış", "tasimaci kac yazmis",
    "taşımacının bedeli", "tasimacinin bedeli", "taşıyıcının yazdığı", "tasiyicinin yazdigi",
    "taşıyıcının bedeli", "tasiyicinin bedeli", "taşıyıcı taraf ne girmiş", "tasiyici taraf ne girmis",
    "taşıyıcının rakamı ne", "tasiyicinin rakami ne",
  ]);
}

const COMMERCIAL_BUYER_ACTOR_TERMS = [
  "hizmet alan", "hizmet alan taraf", "alıcı", "alici", "alıcı firma", "alici firma",
  "müşteri", "musteri", "müşteri tarafı", "musteri tarafi", "karşı taraf", "karsi taraf",
];
const COMMERCIAL_CARRIER_ACTOR_TERMS = [
  "taşımacı", "tasimaci", "taşıyıcı", "tasiyici", "taşımacılık firması", "tasimacilik firmasi",
  "taşıyıcı firma", "tasiyici firma", "nakliyeci", "nakliyatçı", "nakliyatci", "nakliyat firması", "nakliyat firmasi",
];
const COMMERCIAL_VALUE_ENTRY_TERMS = [
  "ne girmiş", "ne girmis", "ne yazmış", "ne yazmis", "ne vermiş", "ne vermis", "ne belirtmiş", "ne belirtmis",
  "kaç girmiş", "kac girmis", "kaç yazmış", "kac yazmis", "kaç vermiş", "kac vermis", "ne kadar girmiş", "ne kadar girmis",
  "hangi rakamı girmiş", "hangi rakami girmis", "hangi tutarı yazmış", "hangi tutari yazmis",
  "girdiği ne", "girdigi ne", "yazdığı ne", "yazdigi ne", "verdiği ne", "verdigi ne",
];

function hasGenericCommercialValueLookupSignal(text) {
  const carrierActor = hasAny(text, COMMERCIAL_CARRIER_ACTOR_TERMS);
  const buyerActor = hasAny(text, COMMERCIAL_BUYER_ACTOR_TERMS) || (hasAny(text, ["firma"]) && !carrierActor);
  const valueEntry = hasAny(text, COMMERCIAL_VALUE_ENTRY_TERMS)
    || /\b(?:ne|kac|hangi)\s+(?:\p{L}+\s+){0,2}(?:girmis|yazmis|vermis|belirtmis|girdi|yazdi|verdi|belirtti)\b/iu.test(text)
    || /\b(?:girdigi|yazdigi|verdigi|belirttigi)\s+(?:\p{L}+\s+){0,2}(?:bedel|tutar|rakam|fiyat|para|miktar|meblag)\b/iu.test(text);
  const amountNoun = hasAny(text, ["bedel", "tutar", "rakam", "fiyat", "para", "miktar", "meblağ", "meblag"]);
  return (valueEntry || amountNoun) && (buyerActor || carrierActor);
}

function hasOfferContext(conversationState, screenContext) {
  const path = String(screenContext?.path || "").toLowerCase();
  const selectedType = String(conversationState?.selectedEntityType || screenContext?.selectedEntityType || "").toLowerCase();
  const previousPlan = conversationState?.authorizedProductContext?.semanticPlan
    || conversationState?.lastProductSemanticPlan
    || conversationState?.lastSemanticPlan;
  return /\/offers\b|commercial-flow/.test(path)
    || selectedType.includes("offer") || selectedType.includes("teklif")
    || previousPlan?.requestedDomains?.includes("OFFERS")
    || previousPlan?.entities?.some((entity) => entity?.type === "offer");
}

function hasProductEntity(text) {
  return /(?:vardiya|sefer|shift|teklif|sözleşme|sozlesme|anlaşma|anlasma|kontrat|plan)\s*#?\s*\d+/iu.test(text)
    || /\b\d{2}\s*[A-ZÇĞİÖŞÜ]{1,3}\s*\d{2,4}\b/iu.test(text);
}

export function hasCrossTenantBoundarySignal(value) {
  const text = normalize(value);
  if (!text) return false;
  if (inferRequestedOwnershipScope(text).explicitExternalScope) return true;
  const scope = "(?:tenant|şirket|sirket|firma|kurum|hesap|organizasyon|okul|sürücü|surucu|şoför|sofor|personel|öğrenci|ogrenci|veli|çocuk|cocuk|kişi|kisi)";
  const otherOwner = new RegExp(`(?:başka|baska|diğer|diger|farklı|farkli)\\s+(?:(?:bir|birer|herhangi\\s+bir)\\s+)?${scope}(?:in|un|nin|nun)\\b|(?:harici|external|başkasının|baskasinin|someone else's)\\s+${scope}`, "iu");
  const possessedTarget = /(?:başkasının|baskasinin|someone else's)\s+(?:araç|arac|vardiya|sefer|sözleşme|sozlesme|teklif|kayıt|kayit|operasyon)/iu;
  const outsideOwner = new RegExp(`(?:${scope}).{0,34}(?:dış(?:ı|ı?ndaki|ında|inda)|dis(?:indaki|inda)|ait olmayan|bize ait olmayan|bizim dışımızdaki|bizim disimizdaki|kapsam dışı|kapsam disi|hesap dışı|hesap disi)`, "iu");
  const accountOutside = new RegExp(`(?:bu|bizim|mevcut|kendi).{0,24}(?:hesap|şirket|sirket|tenant|firma|kurum).{0,32}(?:dış|dis|harici|ait olmayan|ötesi|otesi)`, "iu");
  const explicitOutsideOwner = new RegExp(`(?:bize ait olmayan|bizim dışımızdaki|bizim disimizdaki|kapsam dışı|kapsam disi)\\s+${scope}`, "iu");
  const ownershipNegation = /(?:bağlı\s+olmadığım|bagli\s+olmadigim|bağlı\s+olmayan|bagli\s+olmayan|bana\s+bağlı\s+olmayan|bana\s+bagli\s+olmayan|kendi\s+görevim\s+olmayan|kendi\s+gorevim\s+olmayan|bana\s+ait\s+olmayan|benim\s+olmayan|not\s+mine|not\s+assigned\s+to\s+me|outside\s+my\s+(?:company|account|scope)|outside\s+our\s+(?:company|account|scope)|other\s+(?:company|account|legal\s+entity)|previous\s+account|başka\s+tüzel|baska\s+tuzel)/iu;
  return otherOwner.test(text) || possessedTarget.test(text) || outsideOwner.test(text) || accountOutside.test(text) || explicitOutsideOwner.test(text) || ownershipNegation.test(text)
    || hasAny(text, ["başka tenant", "baska tenant", "diğer tenant", "diger tenant", "farklı tenant", "farkli tenant", "tenant dışı", "tenant disi", "başka şirketin", "baska sirketin", "başka firmanın", "baska firmanin"]);
}

function hasLiveExternalSignal(text) {
  return hasAny(text, LIVE_EXTERNAL_WORDS)
    && !hasAny(text, ["bildirim", "kayıt", "kayit", "operasyon", "vardiya", "sözleşme", "sozlesme"]);
}

function hasVagueReferenceOnly(text) {
  if (!text) return false;
  const compact = text.replace(/[?!.,;:]+/g, " ").replace(/\s+/g, " ").trim();
  if (compact.length > 64) return hasAny(compact, ["şey", "sey", "hani o", "adı neydi", "adi neydi"]);
  return hasAny(compact, VAGUE_REFERENCE_WORDS)
    || /^(?:ya )?(?:o|şey|sey|şunu|sunu|öteki|oteki)(?:\s+ne(?:ydi|dir))?$/iu.test(compact);
}

function hasSmallTalk(text) {
  return hasAny(text, [
    "merhaba", "selam", "günaydın", "gunaydin", "iyi akşamlar", "iyi aksamlar", "nasılsın", "nasilsin",
    "şaka", "saka", "espri", "fıkra", "fikra", "pizza", "yemek", "kahve", "çay", "cay", "film", "müzik", "muzik",
  ]);
}

function hasGeneralKnowledgeSignal(text) {
  return (hasAny(text, [
    "kaç eder", "kac eder", "hesapla", "topla", "çıkar", "cikar", "çarp", "carp", "böl", "bol",
    "nedir", "kimdir", "nasıl yapılır", "nasil yapilir", "ne anlama gelir", "genel olarak", "tarihçe", "tarihce",
  ]) || /^(?:neden|niye|nasıl|nasil)\b\s+\S+(?:\s+\S+)+/iu.test(text)) && !hasAny(text, PRODUCT_WORDS);
}

const CREATIVE_TASK_TOPICS = [
  "şaka", "saka", "espri", "fıkra", "fikra", "hikaye", "hikâye", "mesaj", "tebrik", "dilek", "gülelim", "gulelim", "güldür", "guldur",
  "kahve", "çay", "cay", "pizza", "yemek", "film", "müzik", "muzik", "şiir", "siir", "atasözü", "atasozu", "bilmece", "metin",
  "not", "toplantı", "toplanti", "teşekkür", "tesekkur", "kutlama",
];

const CREATIVE_TASK_VERBS = [
  "anlat", "bahset", "yaz", "yap", "söyle", "soyle", "hazırla", "hazirla", "üret", "uret", "öner", "oner",
  "paylaş", "paylas", "ver", "güldür", "guldur", "uydur", "açıkla", "acikla", "kur", "oluştur", "olustur", "hazırla", "hazirla",
];

function hasCreativeTaskSignal(text) {
  return hasAny(text, CREATIVE_TASK_TOPICS) && hasAny(text, CREATIVE_TASK_VERBS);
}

function hasExplicitTopicAbandonmentSignal(text) {
  if (/\b(?:birakma|bosverme|gecme|unutma|kapatma)\b/iu.test(normalize(text))) return false;
  const abandonment = hasAny(text, [
    "bırak", "birak", "boşver", "bosver", "geç", "gec", "unut", "kapat", "rafa kaldır", "rafa kaldir", "sonra konuşuruz", "sonra konusuruz",
  ]);
  const productTarget = hasAny(text, [
    "teklif", "vardiya", "sefer", "rota", "araç", "arac", "gps", "durak", "sözleşme", "sozlesme", "kontrat", "kayıt", "kayit", "ekran", "panel", "kart", "ürün", "urun", "firma", "müşteri", "musteri", "rakam", "para", "ticari",
    "bunu", "bunu sonra", "onu", "bunları", "bunlari", "bu konuyu", "bu ekranı", "bu ekrani", "bu kaydı", "bu kaydi",
  ]);
  const explicitPivot = hasAny(text, ["şimdi başka bir şey", "simdi baska bir sey", "başka bir şey soracağım", "baska bir sey soracagim"]);
  return (abandonment && productTarget) || explicitPivot;
}

function hasClearlyNonProductTask(text) {
  const generalWritingTask = /\b(?:bir|iki|uc|dort|bes|\d+)\s+(?:cumle|cumlelik|satir|satirlik|madde|maddelik|paragraf)\p{L}*.{0,36}\b(?:yaz|olustur|hazirla|uret|kur)\p{L}*/iu.test(normalize(text));
  const generalTask = hasAny(text, ["genel bilgi", "genel kültür", "genel kultur"])
    && hasAny(text, ["anlat", "açıkla", "acikla", "ver", "söyle", "soyle", "paylaş", "paylas"]);
  const arithmeticTask = hasAny(text, ["hesap", "hesaplama", "kaç eder", "kac eder"])
    && hasAny(text, ["yap", "çöz", "coz", "hesapla", "anlat", "ver"]);
  return generalWritingTask
    || hasCreativeTaskSignal(text)
    || generalTask
    || arithmeticTask
    || isGeneralArithmeticRequest(text);
}

// Generic words such as "çocuk", "plan", "not" and "rakam" occur in
// harmless requests as well as in product conversations.  A general task is
// blocked only by a concrete product anchor or an explicit product operation,
// not by a broad vocabulary hit.  This keeps a topic-abandonment request from
// being reclaimed by the previous screen context.
function hasExplicitProductTaskAnchor(text) {
  return hasProductEntity(text)
    || hasAny(text, [
      "vardiya", "sefer", "teklif", "sözleşme", "sozlesme", "anlaşma", "anlasma", "araç", "arac", "plaka",
      "sürücü", "surucu", "gps", "rota", "durak", "operasyon", "servis kaydı", "servis kaydi", "ekran",
      "panel", "seçili kayıt", "seçili kaydın", "secilen kayıt", "secilen kayit", "ürün kaydı", "urun kaydi",
      "risk durumu", "teklif durumu", "vardiya durumu", "bağlı vardiya", "bagli vardiya", "taşımacı bedeli",
      "tasimaci bedeli", "hizmet alan tutarı", "hizmet alan tutari",
    ]);
}

// A style word can be embedded in a complete non-product request.  It is a
// modifier of that request, not evidence that the user is transforming the
// previous product answer.  Keep this semantic-family check separate from the
// product vocabulary so a retained screen/record context cannot steal a new
// conversational task.
function hasCompleteGeneralTask(text) {
  const metaLanguageTask = /\b\p{L}+\s+(?:kelime(?:si|sini)?|sozcuk(?:u|unu)?)\p{L}*\s*(?:ile|hakkinda)?.{0,24}(?:ornek\s+cumle|cumle\s+(?:kur|yaz)|anlamini\s+anlat|tanimla)\p{L}*/iu.test(text)
    // A complete definition request may carry presentation modifiers such as
    // "iki cümlelik kısa" between the subject and its task.  Those modifiers
    // do not turn the request into a transform of the previous product result.
    || /\b\p{L}+\s+hakkinda(?:\s+\p{L}+){0,5}\s+(?:tanim|aciklama)\p{L}*/iu.test(text);
  if (metaLanguageTask) return true;
  return isGeneralCreativeOutputVocabularyRequest(text)
    || (hasCreativeTaskSignal(text) && !hasExplicitProductTaskAnchor(text));
}

function hasInternalMaterialRequest(text) {
  const normalized = normalize(text);
  const material = hasAny(normalized, [
    "debug json", "hata detayı", "hata detayi", "sunucu detayı", "sunucu detayi",
    "internal context", "iç context", "ic context", "gizli değer", "gizli deger",
    "secret değer", "secret deger", "api key", "token", "şifre", "sifre",
  ])
    || /(?:sunucu|server|sistem)\s+(?:hata|error|exception)\p{L}*.{0,28}(?:detay|ayrinti|rapor|log)\p{L}*/iu.test(normalized)
    || /(?:hata|error|exception)\p{L}*.{0,28}(?:detay|ayrinti|rapor|log)\p{L}*/iu.test(normalized)
    || /(?:ic|internal)\s+(?:baglam|context|durum|state)\p{L}*/iu.test(normalized)
    || /(?:gizli|secret|token|sifre|password|api\s+key)\p{L}*/iu.test(normalized);
  const disclosure = hasAny(text, ["ver", "göster", "goster", "dök", "dok", "paylaş", "paylas", "çıkar", "cikar"]);
  return material && disclosure;
}

function hasGeneralHistoryTask(text, { hasContext = false } = {}) {
  const historyTopic = hasAny(text, [
    "dünya tarihi", "dunya tarihi", "dünya tarihinden", "dunya tarihinden", "osmanlı tarihi", "osmanli tarihi",
    "tarih bilimi", "tarih hakkında", "tarih hakkinda", "tarih dersi", "geçmiş tarihi", "gecmis tarihi",
  ]) || (hasAny(text, ["tarih", "tarihi"]) && hasAny(text, ["dünya", "dunya", "osmanlı", "osmanli", "bilim", "hakkında", "hakkinda", "genel"]));
  const knowledgeOperation = hasAny(text, [
    "nedir", "ne anlama gelir", "neyi inceler", "anlat", "bahset", "bilgi ver", "açıkla", "acikla", "özetle", "ozetle",
  ]);
  // A bare "tarihi ne?" remains eligible for a valid selected-record
  // continuation. General history wins only when the utterance itself names
  // a history concept, or when there is no product context at all.
  return historyTopic && knowledgeOperation && (!hasContext || hasAny(text, [
    "dünya", "dunya", "osmanlı", "osmanli", "tarih bilimi", "tarih hakkında", "tarih hakkinda",
  ]));
}

function classifyExplicitGeneralTask(text, { hasContext = false } = {}) {
  if (isGeneralArithmeticRequest(text)) {
    return { route: "GENERAL_KNOWLEDGE", primaryTask: "OFF_TOPIC_GENERAL_REQUEST", styleModifier: hasStyleSignal(text) ? "SHORT" : null };
  }
  if (hasGeneralHistoryTask(text, { hasContext })) {
    return { route: "GENERAL_KNOWLEDGE", primaryTask: "OFF_TOPIC_GENERAL_REQUEST", styleModifier: hasStyleSignal(text) ? "SHORT" : null };
  }
  if (hasCompleteGeneralTask(text)) {
    return { route: "OFF_TOPIC_SAFE", primaryTask: "OFF_TOPIC_GENERAL_REQUEST", styleModifier: hasStyleSignal(text) ? "SHORT" : null };
  }
  return null;
}

function hasRetainedProductContext(conversationState, screenContext) {
  const previousPlan = conversationState?.authorizedProductContext?.semanticPlan
    || conversationState?.lastProductSemanticPlan
    || conversationState?.lastSemanticPlan;
  const selectedId = Number(conversationState?.selectedEntityId || screenContext?.selectedEntityId || 0);
  return Boolean(previousPlan?.requestedDomains?.length || previousPlan?.entities?.length || (selectedId > 0));
}

function hasProductActionSignal(text) {
  return hasAny(text, [
    "sorun", "problem", "sıkıntı", "sikinti", "risk", "riskleri", "öncelik", "oncelik",
    "tehlike", "tehlikeli", "en tehlikeli", "risk görünür", "risk gorunur", "riskleri karşılaştır", "riskleri karsilastir",
    "çöz", "coz", "ne yap", "ne yapmal", "ne yapalım", "ne yapalim", "nasıl çö",
    "nasil co", "nasıl halled", "nasil halled", "sıradaki", "siradaki", "doğru işlem",
    "dogru islem", "doğru adım", "dogru adim", "sonraki adım", "sonraki adim", "sonra",
    "bundan sonra", "devam et", "devam edelim", "nereden devam", "önce neyi", "once neyi",
    "ilk ne", "ilk hang", "ilk adım", "ilk adim", "ilk kontrol", "birinci kontrol", "kontrol adayı", "sırada ne var", "sirada ne var", "bir sonraki",
    "neyle başlay", "neyle baslay", "hangi işi önce", "hangi isi once", "hangisinden başlay", "hangisinden baslay", "nereden başlay", "nereden baslay", "neden", "niye",
    "başka ne", "baska ne", "başka hangi", "baska hangi", "başka sorun", "baska sorun", "başka risk", "baska risk", "devamını anlat", "devamini anlat", "biraz daha anlat", "detaylandır", "detaylandir", "düzelt", "duzelt", "hallet",
    "ters gidiyor", "ters giden", "aksayan", "aksak", "uygulanacak", "çözüm sırası", "cozum sirasi", "çözüm yolu", "cozum yolu",
    "hangi sırayla", "hangi sirayla", "toparla", "toparlay", "en acil", "aciliyet", "öncelikli", "oncelikli", "şimdi hangi işi", "simdi hangi isi",
    "sırada hangi", "sirada hangi", "sıradaki güvenli", "siradaki guvenli", "sonraki güvenli", "sonraki guvenli", "bir sonraki işlem", "bir sonraki islem",
    "kısaca", "kisaca", "özetle", "ozetle", "madde madde", "tek cümle", "tek cumle", "kanıtıyla", "kanitiyla", "önce sonucu", "once sonucu",
  ]);
}

function hasCurrentAssignmentSignal(text) {
  return hasAny(text, [
    "aktif görev", "aktif gorev", "mevcut görev", "mevcut gorev", "görevim", "gorevim",
    "aktif vardiyam", "mevcut vardiyam", "bağlı araç", "bagli arac", "hangi araca bağlı", "hangi araca bagli", "aracım hangisi", "aracim hangisi", "aktif aracım", "aktif aracim",
    "mevcut aracım", "mevcut aracim", "plakam", "servis aracım", "servis aracim", "rotam",
    "duraklarım", "duraklarim", "şimdi hangi araç", "simdi hangi arac", "bugün hangi araç", "bugun hangi arac",
  ]);
}

function hasContextualReasonSignal(text) {
  return /^(?:neden|niye)\s+(?:o|bu|bunu|şunu|sunu|önce|once|böyle|boyle|seçtin|sectin|bu adım|bu adim|bu iş|bu is|bu kayıt|bu kayit|bu nokta)/iu.test(String(text || "").trim());
}

function hasStyleSignal(text) {
  const normalized = normalize(text);
  const explicitStyleSignal = hasAny(text, [
    "daha kısa", "daha kisa", "kısa anlat", "kisa anlat", "kısa cevap", "kisa cevap",
    "iki satır", "iki satırlık", "iki satir", "iki satirlik", "minicik", "ufacık", "ufacik",
    "özetle", "ozetle", "madde madde", "maddeler halinde", "tek cümle", "tek cumle",
    "çocuk gibi", "cocuk gibi", "çocukça", "cocukca", "sade anlat", "basit anlat",
    "kolay anlat", "anlaşılır anlat", "anlasilir anlat", "kanıtıyla", "kanitiyla",
    "sadece sonucu", "yalnızca sonucu", "yalnizca sonucu", "özet geç", "ozet gec",
    "biraz aç", "biraz ac", "biraz açar mısın", "biraz acar misin", "biraz detay",
    "detaylandır", "detaylandir", "başka türlü anlat", "baska turlu anlat", "farklı anlat", "farkli anlat",
  ]);
  // Natural Turkish style requests are compositional: a readability or
  // sentence-shape modifier plus a rewrite verb.  Keep this separate from
  // product vocabulary so a prior record cannot steal a new writing task.
  const readabilityRewrite = /(?:daha|biraz)\s+(?:anlasilir|sade|net|basit|acik)\s+(?:yaz|anlat|aktar|soyle|hale\s+getir)|\b(?:anlasilir|sade|net|basit|acik)\s+(?:bir\s+sekilde\s+)?(?:yaz|anlat|aktar)\b/u.test(normalized)
    || /\b(?:bunu|sun[u]?|onu)\s+(?:sadelestir|basitlestir|netlestir|yeniden\s+yaz|farkli\s+anlat)\b/u.test(normalized);
  const sentenceShapeRewrite = /\b(?:bir|iki|tek)\s+cumle(?:ye|lik)?\s+(?:indir|cevir|yap|kur|hale\s+getir)\b/u.test(normalized)
    || /\b(?:iki|bir)\s+cumle\s+(?:ile|olarak)\s+(?:yaz|anlat)\b/u.test(normalized);
  const numberedBulletRewrite = /\b(?:\d+|bir|iki|uc|dort|bes)\s+madde(?:ye|lik)?\s+(?:ayir|bol|yap|cevir|hale\s+getir)\b/u.test(normalized);
  return explicitStyleSignal || readabilityRewrite || sentenceShapeRewrite || numberedBulletRewrite || /\b(?:daha\s+(?:da\s+)?)?kisa(?:ca)?\b/u.test(normalized);
}

function styleModifierFor(text) {
  const normalized = normalize(text);
  if (hasAny(text, [
    "kısaca", "kisaca", "kısa", "kisa", "iki satır", "iki satırlık", "iki satir", "iki satirlik", "minicik", "ufacık", "ufacik",
  ]) || /\b(?:bir|iki)\s+cumle(?:ye|lik)?\s+(?:indir|cevir|yap|hale\s+getir)\b/u.test(normalized)) return "SHORT";
  if (hasAny(text, ["madde madde", "maddeler halinde", "tek tek", "sırayla", "sirayla"])) return "BULLET_STEPS";
  if (hasAny(text, ["tek cümle", "tek cumle", "bir cümle", "bir cumle"])) return "SINGLE_SENTENCE";
  if (hasAny(text, ["çocuk gibi", "cocuk gibi", "çocukça", "cocukca", "sade anlat", "basit anlat", "kolay anlat", "anlaşılır anlat", "anlasilir anlat"])) return "CHILD_FRIENDLY";
  if (hasAny(text, ["kanıtıyla", "kanitiyla", "kanıtla", "kanitla"])) return "EVIDENCE_FIRST";
  if (hasAny(text, ["önce sonucu", "once sonucu", "sonucu önce", "sonucu once"])) return "RESULT_FIRST";
  if (hasAny(text, ["sadece sonucu", "yalnızca sonucu", "yalnizca sonucu"])) return "RESULT_ONLY";
  if (hasAny(text, ["biraz aç", "biraz ac", "biraz açar mısın", "biraz acar misin", "biraz detay", "detaylandır", "detaylandir"])) return "EXPANDED";
  if (hasAny(text, ["başka türlü anlat", "baska turlu anlat", "farklı anlat", "farkli anlat"])) return "REPHRASED";
  if (/(?:daha|biraz)\s+(?:anlasilir|sade|net|basit|acik)\s+(?:yaz|anlat|aktar|soyle|hale\s+getir)|\b(?:anlasilir|sade|net|basit|acik)\s+(?:bir\s+sekilde\s+)?(?:yaz|anlat|aktar)\b|\b(?:bunu|sun[u]?|onu)\s+(?:sadelestir|basitlestir|netlestir|yeniden\s+yaz|farkli\s+anlat)\b/u.test(normalized)) return "REPHRASED";
  return null;
}

function hasConversationalOverride(text) {
  return hasAny(text, ["boşver", "bosver", "ürün kaydı istemiyorum", "urun kaydi istemiyorum"])
    && hasAny(text, ["mesaj yaz", "mesaj", "sakin", "iki satır", "iki satir", "kısa bir", "kisa bir"]);
}

function creativeVocabularyTerms(text) {
  return generalCreativeOutputShape(text).requiredOutputTerms || [];
}

function creativeOutputSatisfies(output, { requiredTerms = [], forbiddenTerms = [], requestedFormat = "", sentenceCount = null } = {}) {
  const normalizedOutput = normalize(output);
  const termsSatisfied = requiredTerms.every((term) => normalizedOutput.includes(normalize(term)))
    && forbiddenTerms.every((term) => !normalizedOutput.includes(normalize(term)));
  const actualSentenceCount = String(output || "").split(/[.!?]+/u).map((part) => part.trim()).filter(Boolean).length;
  const formatSatisfied = requestedFormat === "JOKE" ? /saka|şaka|g[üu]l|komik/iu.test(output)
    : requestedFormat === "RHYME" ? /tekerleme|ritim|kafiye/iu.test(output)
    : requestedFormat === "MINI_STORY" ? /hikâye|hikaye/iu.test(output)
      : requestedFormat === "SHORT_NOTE" ? /not:/iu.test(output)
        : requestedFormat === "SHORT_MESSAGE" ? /mesaj:/iu.test(output)
          : true;
  return termsSatisfied && formatSatisfied && (!sentenceCount || actualSentenceCount === sentenceCount);
}

function buildGeneralCreativeReply(message, semanticPlan = null) {
  const text = normalize(message);
  const typedRequest = semanticPlan?.typedRequest || {};
  const typedTerms = Array.isArray(typedRequest.requiredOutputTerms)
    ? typedRequest.requiredOutputTerms.map((term) => String(term || "").trim()).filter(Boolean)
    : [];
  const forbiddenTerms = Array.isArray(typedRequest.forbiddenOutputTerms)
    ? typedRequest.forbiddenOutputTerms.map((term) => String(term || "").trim()).filter(Boolean)
    : [];
  const forbiddenNormalized = new Set(forbiddenTerms.map((term) => normalize(term)));
  const extractedTerms = typedTerms.length ? typedTerms : creativeVocabularyTerms(String(message || ""));
  const terms = extractedTerms.filter((term) => !forbiddenNormalized.has(normalize(term)));
  const defaultTerms = ["fikir", "neşe"].filter((term) => !forbiddenNormalized.has(normalize(term)));
  const outputTerms = terms.length ? terms : defaultTerms;
  const outputTermText = outputTerms.map((term, index) => {
    const title = term.charAt(0).toLocaleUpperCase("tr-TR") + term.slice(1);
    if (index === 0) return title;
    return index === outputTerms.length - 1 ? `ve ${title}` : title;
  }).join(outputTerms.length > 2 ? ", " : " ");
  let output;
  if (typedRequest.requestedFormat === "JOKE" || hasAny(text, ["şaka", "saka", "espri", "fıkra", "fikra"])) {
    output = `Kısa şaka: ${outputTermText} neden gülümsedi? Çünkü cümleye neşe katmayı başardı.`;
  } else if (Number(typedRequest.sentenceCount || 0) === 1) {
    output = `${typedRequest.requestedFormat === "SHORT_MESSAGE" ? "Kısa mesaj: " : ""}${outputTermText} ile günün küçük ve yaratıcı notu hazır.`;
  } else if (typedRequest.requestedFormat === "RHYME" || hasAny(text, ["tekerleme", "kafiye", "kafiyeli"])) {
    output = `Küçük tekerleme: ${outputTermText} tıkır tıkır dile gelir, ritimle neşe verir. ${outputTermText} söylenince sözler gülümseyip yoluna gider.`;
  } else if (typedRequest.requestedFormat === "MINI_STORY" || hasAny(text, ["hikaye", "hikâye"])) {
    output = `Minicik hikâye: ${outputTermText} yola çıkınca birbirine eşlik etti. Birlikte günün küçük sevincini buldular.`;
  } else if (Number(typedRequest.sentenceCount || 0) === 2 || hasAny(text, ["iki cümle", "iki cumle"])) {
    output = `${outputTermText} güne hazırdı. Birlikte güne neşeyle eşlik ettiler.`;
  } else if (typedRequest.requestedFormat === "SHORT_NOTE" || hasAny(text, ["not"])) {
    output = `Kısa not: ${outputTermText} ile günün enerjisini paylaşalım.`;
  } else if (typedRequest.requestedFormat === "SHORT_MESSAGE" || hasAny(text, ["mesaj"])) {
    output = `Kısa mesaj: ${outputTermText} ile günün enerjisini paylaşalım.`;
  } else {
    output = `Kısa yaratıcı metin: ${outputTermText} yan yana gelince sıcak bir cümle doğdu.`;
  }
  // The final reply is the contract boundary.  If a template ever drops a
  // requested term or reintroduces a forbidden one, use a deterministic
  // constrained response built from the already typed output vocabulary;
  // never fall back into product retrieval.
  const constraints = { requiredTerms: typedTerms, forbiddenTerms, requestedFormat: typedRequest.requestedFormat, sentenceCount: typedRequest.sentenceCount };
  if (creativeOutputSatisfies(output, constraints)) return output;
  const requiredPart = typedTerms.join(" ve ") || "Yaratıcı metin";
  const formatPrefix = typedRequest.requestedFormat === "JOKE"
    ? "Kısa şaka"
    : typedRequest.requestedFormat === "RHYME"
    ? "Küçük tekerleme"
    : typedRequest.requestedFormat === "MINI_STORY"
      ? "Minicik hikâye"
      : typedRequest.requestedFormat === "SHORT_NOTE"
        ? "Kısa not"
        : typedRequest.requestedFormat === "SHORT_MESSAGE"
          ? "Kısa mesaj"
          : "Kısa yaratıcı metin";
  // Build the recovery answer from the frozen constraint contract rather than
  // returning a generic acknowledgement.  Format and sentence count must be
  // jointly satisfiable; a two-sentence note is still a note.
  const constrained = Number(typedRequest.sentenceCount || 0) === 2
    ? `${formatPrefix}: ${requiredPart} ile kısa bir çalışma hazırlandı. İstenen biçim korunarak tamamlandı.`
    : `${formatPrefix}: ${requiredPart} ile tamamlandı.`;
  if (creativeOutputSatisfies(constrained, constraints)) return constrained;
  // This branch is deliberately still deterministic and constraint-derived:
  // it must never discard the user supplied vocabulary or consult product
  // context as a recovery mechanism.
  const finalConstrained = `${formatPrefix}: ${requiredPart}${Number(typedRequest.sentenceCount || 0) === 2 ? " için kısa bir çalışma hazırlandı. İstenen biçim korunarak tamamlandı." : " için kısa bir çalışma hazırlandı."}`;
  return finalConstrained;
}

function hasProductContext(conversationState, screenContext) {
  const selectedId = Number(conversationState?.selectedEntityId || screenContext?.selectedEntityId || 0);
  const selectedType = String(conversationState?.selectedEntityType || screenContext?.selectedEntityType || "").trim();
  const previousPlan = conversationState?.authorizedProductContext?.semanticPlan
    || conversationState?.lastProductSemanticPlan
    || conversationState?.lastSemanticPlan;
  return Boolean(screenContext?.path || (selectedId > 0 && selectedType) || previousPlan?.requestedDomains?.length || previousPlan?.entities?.length);
}

function resolveCanonicalConversationRoute({ canonicalRequest, canonicalShape, hasContext, hasRetainedContext } = {}) {
  const request = canonicalRequest?.request || (canonicalRequest?.version ? canonicalRequest : null);
  // V2 stays transport-compatible but cannot establish a V3 semantic action.
  // It therefore fails into the existing safe clarification route instead of
  // triggering a raw-text re-interpretation in a downstream adapter.
  if (!request || !["SEFER-ABI-CANONICAL-REQUEST-V2", "SEFER-ABI-CANONICAL-REQUEST-V3"].includes(request.version)) return null;
  if (request.version === "SEFER-ABI-CANONICAL-REQUEST-V2") {
    return { route: "UNCLEAR_OR_AMBIGUOUS", dialogueTopic: "UNCLEAR", reason: "V2_TRANSPORT_REQUIRES_V3_SEMANTIC_ACTION", hasContext };
  }
  if (request.semanticScope?.class === "OFF_TOPIC_GENUINE") {
    return {
      route: "OFF_TOPIC_SAFE",
      dialogueTopic: "OFF_TOPIC",
      reason: "CANONICAL_GENUINE_OFF_TOPIC_SCOPE",
      hasContext,
      productContextHint: hasContext ? "SUSPEND_AND_PRESERVE" : "NONE",
      topicTransition: hasContext ? "TEMPORARY_LEAVE_PRODUCT" : null,
      suspendProductContext: Boolean(hasContext),
      retrieveProductData: false,
    };
  }
  if (["PRODUCT_AMBIGUOUS", "UNRESOLVED"].includes(request.semanticScope?.class)) {
    return { route: "UNCLEAR_OR_AMBIGUOUS", dialogueTopic: "UNCLEAR", reason: "CANONICAL_SCOPE_REQUIRES_CLARIFICATION", hasContext };
  }
  if (canonicalRequest?.validation?.status === "SEMANTIC_UNRESOLVED" || request.ambiguity?.status === "UNRESOLVED") {
    return { route: "UNCLEAR_OR_AMBIGUOUS", dialogueTopic: "UNCLEAR", reason: "CANONICAL_REQUEST_UNRESOLVED", hasContext };
  }
  const canonicalGeneralProductHelp = request.operation === "GENERAL_INFORMATION"
    && request.semanticAction?.actionClass === "EXPLAIN"
    && request.semanticAction?.objectClass === "SURFACE";
  const canonicalSituatedSurfaceHelp = canonicalGeneralProductHelp
    && Boolean(canonicalShape?.screenContextIntent || canonicalShape?.screenKnowledgeIntent)
    && !canonicalShape?.generalProductHelpIntent;
  const explicitProductNavigation = Boolean(
    canonicalShape?.explicitUiGuidance
      || canonicalShape?.workflowIntent
      || ["NAVIGATE", "VIEW", "CREATE", "UPDATE", "DELETE", "SEND", "COMPARE"].includes(String(request.semanticAction?.actionClass || "").toUpperCase()),
  );
  if (canonicalSituatedSurfaceHelp) {
    return {
      route: "RETURN_TO_PRODUCT_TASK",
      dialogueTopic: "PRODUCT",
      reason: "CANONICAL_SITUATED_SURFACE_HELP",
      hasContext,
      primaryTask: "SCREEN_CONTEXT",
      productContextHint: "ACTIVE_PRODUCT_CONTEXT",
      retrieveProductData: false,
    };
  }
  if ((canonicalShape?.generalProductHelpIntent && !explicitProductNavigation) || canonicalGeneralProductHelp) {
    return {
      route: "GENERIC_PRODUCT_HELP",
      dialogueTopic: "GENERIC_PRODUCT_HELP",
      reason: "CANONICAL_GENERIC_PRODUCT_HELP",
      hasContext,
      primaryTask: "GENERIC_PRODUCT_HELP",
      productContextHint: "PRESERVE_SUSPENDED_SAME_AUTH",
      topicTransition: "TEMPORARY_LEAVE_PRODUCT",
      suspendProductContext: true,
      retrieveProductData: false,
    };
  }
  if (request.operation === "GENERAL_INFORMATION") {
    return { route: "GENERAL_KNOWLEDGE", dialogueTopic: "GENERAL_KNOWLEDGE", reason: "CANONICAL_GENERAL_INFORMATION", hasContext, productContextHint: hasContext ? "SUSPEND_AND_PRESERVE" : "NONE", retrieveProductData: false };
  }
  if (canonicalShape?.taskType === "OFF_TOPIC" && !explicitProductNavigation) {
    return {
      route: canonicalShape.generalCreativeIntent ? "OFF_TOPIC_SAFE" : "GENERAL_KNOWLEDGE",
      dialogueTopic: canonicalShape.generalCreativeIntent ? "OFF_TOPIC" : "GENERAL_KNOWLEDGE",
      reason: "CANONICAL_OFF_TOPIC_REQUEST",
      hasContext,
      productContextHint: hasContext ? "SUSPEND_AND_PRESERVE" : "NONE",
      topicTransition: hasContext ? "TEMPORARY_LEAVE_PRODUCT" : null,
      suspendProductContext: Boolean(hasContext),
      retrieveProductData: false,
    };
  }
  if (canonicalShape?.liveWorkflowGrounded || canonicalShape?.workflowIntent || request.workflowRef) {
    return { route: "RETURN_TO_PRODUCT_TASK", dialogueTopic: "PRODUCT", reason: "CANONICAL_LIVE_WORKFLOW", hasContext, primaryTask: "CREATE_SHIFT", productContextHint: "ACTIVE_PRODUCT_CONTEXT", retrieveProductData: false };
  }
  if (canonicalShape?.taskType === "CLARIFY") {
    return { route: "UNCLEAR_OR_AMBIGUOUS", dialogueTopic: "UNCLEAR", reason: "CANONICAL_AMBIGUITY", hasContext };
  }
  if (canonicalShape?.explicitUserTarget || request.candidateEntityRefs?.length || hasContext || hasRetainedContext) {
    return { route: hasContext ? "RETURN_TO_PRODUCT_TASK" : "PRODUCT_TASK", dialogueTopic: "PRODUCT", reason: "CANONICAL_TYPED_REQUEST", hasContext, productContextHint: "ACTIVE_PRODUCT_CONTEXT", retrieveProductData: request.groundingRequirement !== "NONE" };
  }
  return { route: "UNCLEAR_OR_AMBIGUOUS", dialogueTopic: "UNCLEAR", reason: "CANONICAL_CONTEXT_REQUIRED", hasContext };
}

export function resolveConversationRoute({ message, user: _user, conversationState = null, screenContext = null, canonicalShape: providedCanonicalShape = null, canonicalRequest = null } = {}) {
  const text = normalize(message);
  const hasContext = hasProductContext(conversationState, screenContext);
  const hasRetainedContext = hasRetainedProductContext(conversationState, screenContext);
  const canonicalRequestValue = canonicalRequest?.request?.version
    ? canonicalRequest.request
    : canonicalRequest?.version
      ? canonicalRequest
      : null;
  const hasCanonicalV3Request = canonicalRequestValue?.version === "SEFER-ABI-CANONICAL-REQUEST-V3";
  const canonicalShape = providedCanonicalShape
    || (hasCanonicalV3Request ? null : inferCanonicalSemanticRequest({ message, screenContext, conversationState }));
  const canonicalRoute = resolveCanonicalConversationRoute({ canonicalRequest, canonicalShape, hasContext, hasRetainedContext });
  if (canonicalRoute) return canonicalRoute;
  const commercialFieldAlias = hasCommercialFieldAliasSignal(text);
  const genericCommercialValueLookup = hasGenericCommercialValueLookupSignal(text);
  const offerContext = hasOfferContext(conversationState, screenContext);
  if (hasInternalMaterialRequest(text)) {
    return {
      route: "OFF_TOPIC_SAFE",
      dialogueTopic: "OFF_TOPIC",
      reason: "INTERNAL_OR_SECRET_MATERIAL_REQUEST",
      hasContext,
      primaryTask: "INTERNAL_UNAVAILABLE",
      productContextHint: hasContext ? "SUSPEND_AND_PRESERVE" : "NONE",
      topicTransition: "TEMPORARY_LEAVE_PRODUCT",
      suspendProductContext: Boolean(hasContext),
      retrieveProductData: false,
    };
  }
  if (hasCrossTenantBoundarySignal(text)) {
    return { route: "AUTHORIZATION_NEGATIVE", dialogueTopic: "PRODUCT_AUTHORIZATION", reason: "CROSS_TENANT_SCOPE_LANGUAGE", hasContext };
  }
  if (isGenericProductHelpIntent(message)
    && !canonicalShape.liveWorkflowGrounded
    && !hasLiveWorkflowGroundingReference(message, screenContext, conversationState)) {
    return {
      route: "GENERIC_PRODUCT_HELP",
      dialogueTopic: "GENERIC_PRODUCT_HELP",
      reason: "GENERIC_PRODUCT_HELP_TEXT_SIGNAL",
      hasContext,
      primaryTask: "GENERIC_PRODUCT_HELP",
      productContextHint: "PRESERVE_SUSPENDED_SAME_AUTH",
      topicTransition: "TEMPORARY_LEAVE_PRODUCT",
      suspendProductContext: true,
      retrieveProductData: false,
    };
  }
  // A live guided workflow state is current UI evidence. Keep deictic and
  // current-step follow-ups on the authorized product route before the
  // broad live-data classifier (which also recognizes “şu an kaç”).
  if (canonicalShape.liveWorkflowGrounded) {
    return {
      route: "RETURN_TO_PRODUCT_TASK",
      dialogueTopic: "PRODUCT",
      reason: "LIVE_WORKFLOW_GROUNDING",
      hasContext,
      primaryTask: "CREATE_SHIFT",
      productContextHint: "ACTIVE_PRODUCT_CONTEXT",
      retrieveProductData: false,
    };
  }
  if (hasLiveExternalSignal(text)) {
    return { route: "LIVE_EXTERNAL_DATA", dialogueTopic: "LIVE_EXTERNAL_DATA", reason: "LIVE_SOURCE_REQUEST", hasContext };
  }
  // This is a product request with a presentation result: a selected,
  // authorized record fact is an explicit dependency of the message.  It
  // must enter the normal product path before generic off-topic heuristics.
  if (canonicalShape.productGroundedWritingIntent) {
    return {
      route: "PRODUCT_TASK",
      dialogueTopic: "PRODUCT",
      reason: "PRODUCT_GROUNDED_WRITING",
      hasContext,
      primaryTask: "PRODUCT_GROUNDED_WRITING",
      productContextHint: "ACTIVE_PRODUCT_CONTEXT",
      retrieveProductData: true,
    };
  }
  if (canonicalShape.taskType === "OFF_TOPIC" && canonicalShape.generalCreativeIntent) {
    return {
      route: "OFF_TOPIC_SAFE",
      dialogueTopic: "OFF_TOPIC",
      reason: "GENERAL_CREATIVE_OUTPUT_VOCABULARY",
      hasContext,
      primaryTask: "OFF_TOPIC_GENERAL_REQUEST",
      productContextHint: hasContext ? "SUSPEND_AND_PRESERVE" : "NONE",
      topicTransition: hasContext ? "TEMPORARY_LEAVE_PRODUCT" : null,
      suspendProductContext: Boolean(hasContext),
      retrieveProductData: false,
    };
  }
  if (canonicalShape.taskType === "OFF_TOPIC" && canonicalShape.generalInformationIntent) {
    return {
      route: "GENERAL_KNOWLEDGE",
      dialogueTopic: "GENERAL_KNOWLEDGE",
      reason: "EXPLICIT_GENERAL_INFORMATION",
      hasContext,
      primaryTask: "OFF_TOPIC_GENERAL_REQUEST",
      productContextHint: hasContext ? "SUSPEND_AND_PRESERVE" : "NONE",
      topicTransition: hasContext ? "TEMPORARY_LEAVE_PRODUCT" : null,
      suspendProductContext: Boolean(hasContext),
      retrieveProductData: false,
    };
  }
  if (hasExplicitTopicAbandonmentSignal(text) && hasClearlyNonProductTask(text)) {
    return {
      route: "OFF_TOPIC_SAFE",
      dialogueTopic: "OFF_TOPIC",
      reason: "EXPLICIT_TOPIC_ABANDONMENT",
      hasContext,
      primaryTask: "OFF_TOPIC_GENERAL_REQUEST",
      styleModifier: hasStyleSignal(text) ? styleModifierFor(text) : null,
      productContextHint: hasContext ? "SUSPEND_AND_PRESERVE" : "NONE",
      topicTransition: "TEMPORARY_LEAVE_PRODUCT",
      suspendProductContext: true,
      retrieveProductData: false,
    };
  }
  if (hasConversationalOverride(text)) {
    return { route: "OFF_TOPIC_SAFE", dialogueTopic: "OFF_TOPIC", reason: "EXPLICIT_CONVERSATIONAL_OVERRIDE", hasContext };
  }
  const explicitGeneralTask = classifyExplicitGeneralTask(text, { hasContext });
  if (explicitGeneralTask) {
    return {
      route: explicitGeneralTask.route,
      dialogueTopic: explicitGeneralTask.route === "GENERAL_KNOWLEDGE" ? "GENERAL_KNOWLEDGE" : "OFF_TOPIC",
      reason: "EXPLICIT_COMPLETE_GENERAL_TASK",
      hasContext,
      primaryTask: explicitGeneralTask.primaryTask,
      styleModifier: explicitGeneralTask.styleModifier,
      productContextHint: hasContext ? "SUSPEND_AND_PRESERVE" : "NONE",
    };
  }
  if (canonicalShape.taskType === "CLARIFY") {
    return { route: "UNCLEAR_OR_AMBIGUOUS", dialogueTopic: "UNCLEAR", reason: canonicalShape.ambiguity || "SEMANTIC_REFERENT_AMBIGUOUS", hasContext };
  }
  // Short contextual requests are still product tasks when the live UI can
  // supply the referent. Keep this before the generic no-signal fallback so a
  // bare screen or selected-record question cannot be mistaken for small talk.
  if (hasContext && ["SCREEN_CONTEXT", "SELECTED_RECORD_CONTEXT", "RECORD_DETAILS", "CONTINUE_CURRENT_REASONING", "EXPLAIN_CURRENT_TARGET"].includes(canonicalShape.taskType)) {
    return { route: "RETURN_TO_PRODUCT_TASK", dialogueTopic: "PRODUCT", reason: `CANONICAL_${canonicalShape.taskType}`, hasContext };
  }
  if (["COUNT", "FIELD_LOOKUP", "RELATION_LOOKUP", "RECORD_DETAILS", "CONTINUE_CURRENT_REASONING", "RETURN_TO_PRODUCT", "COMPARISON", "SITUATION", "STATUS", "ISSUE", "RISK", "PRIORITY", "NEXT_ACTION", "CAUSE", "RESOLUTION", "SHIFT_START_READINESS", "FRESHNESS_CHECK", "UNCERTAINTY_CHECK", "EVIDENCE_SUFFICIENCY", "STYLE"].includes(canonicalShape.taskType) && (canonicalShape.explicitUserTarget || hasContext || hasRetainedContext)) {
    return { route: hasContext ? "RETURN_TO_PRODUCT_TASK" : "PRODUCT_TASK", dialogueTopic: "PRODUCT", reason: "CANONICAL_TYPED_REQUEST", hasContext };
  }
  if (hasCurrentAssignmentSignal(text)) {
    return { route: hasContext ? "RETURN_TO_PRODUCT_TASK" : "PRODUCT_TASK", dialogueTopic: "PRODUCT", reason: "CURRENT_ASSIGNMENT_STATE", hasContext };
  }
  if (hasStyleSignal(text)) {
    return { route: hasContext || hasRetainedContext ? "PRODUCT_FOLLOW_UP" : "OFF_TOPIC_SAFE", dialogueTopic: hasContext || hasRetainedContext ? "PRODUCT" : "OFF_TOPIC", reason: hasContext || hasRetainedContext ? "STYLE_FOLLOW_UP" : "STYLE_WITHOUT_PRODUCT_CONTEXT", hasContext, primaryTask: hasContext || hasRetainedContext ? "STYLE" : "OFF_TOPIC_GENERAL_REQUEST", styleModifier: styleModifierFor(text), productContextHint: hasContext || hasRetainedContext ? "TRANSFORM_LAST_SETTLED_RESULT" : "NONE" };
  }
  if (hasVagueReferenceOnly(text) && !hasProductEntity(text) && !hasRetainedContext && !hasProductActionSignal(text)) {
    return { route: "UNCLEAR_OR_AMBIGUOUS", dialogueTopic: "UNCLEAR", reason: "INSUFFICIENT_REFERENTIAL_EVIDENCE", hasContext };
  }
  if (hasProductEntity(text) || hasAny(text, PRODUCT_WORDS) || (commercialFieldAlias && hasContext) || (genericCommercialValueLookup && offerContext)) {
    return { route: hasContext ? "RETURN_TO_PRODUCT_TASK" : "PRODUCT_TASK", dialogueTopic: "PRODUCT", reason: hasContext ? "PRODUCT_CONTEXT_REJOINED" : "PRODUCT_SIGNAL", hasContext };
  }
  if (hasVagueReferenceOnly(text) && !hasRetainedContext && !hasProductActionSignal(text)) {
    return { route: "UNCLEAR_OR_AMBIGUOUS", dialogueTopic: "UNCLEAR", reason: "VAGUE_REFERENCE", hasContext };
  }
  if (hasRetainedContext && hasVagueReferenceOnly(text)) {
    return { route: "PRODUCT_FOLLOW_UP", dialogueTopic: "PRODUCT", reason: "REFERENTIAL_FOLLOW_UP", hasContext };
  }
  const retainedProductStatusSignal = hasAny(text, [
    "durum", "görev", "gorev", "iş", "is", "servis", "kayıt", "kayit", "vardiya", "sefer", "operasyon",
  ]);
  if (hasGeneralKnowledgeSignal(text) && !hasContextualReasonSignal(text) && !(hasRetainedContext && (hasProductActionSignal(text) || retainedProductStatusSignal))) {
    return { route: "GENERAL_KNOWLEDGE", dialogueTopic: "GENERAL_KNOWLEDGE", reason: "NON_PRODUCT_KNOWLEDGE", hasContext };
  }
  if (hasProductActionSignal(text) && (hasContext || hasAny(text, ["sorun", "problem", "sıkıntı", "sikinti", "risk", "riskleri", "vardiya", "sefer", "araç", "arac", "plaka", "gps", "konum"]))) {
    return { route: hasContext ? "PRODUCT_FOLLOW_UP" : "PRODUCT_TASK", dialogueTopic: "PRODUCT", reason: hasContext ? "SEMANTIC_PRODUCT_FOLLOW_UP" : "SEMANTIC_PRODUCT_TASK", hasContext };
  }
  if (hasContext && (commercialFieldAlias || hasAny(text, ["gerekçe", "gerekce", "durum", "tarih", "başlangıç", "baslangic", "plaka", "araç", "arac", "sürücü", "surucu", "eta", "konum", "gps", "rota", "durak"]))) {
    return { route: "PRODUCT_FOLLOW_UP", dialogueTopic: "PRODUCT", reason: "SCREEN_OR_CONVERSATION_PRODUCT_FOLLOW_UP", hasContext };
  }
  if (hasSmallTalk(text)) {
    return { route: "OFF_TOPIC_SAFE", dialogueTopic: "OFF_TOPIC", reason: "SMALL_TALK", hasContext };
  }
  if (!text) return { route: "UNCLEAR_OR_AMBIGUOUS", dialogueTopic: "UNCLEAR", reason: "EMPTY_INPUT", hasContext };
  if (hasContext && /^(?:peki|sonra|devam|neden|niye|o|bu|şu|su)\b/iu.test(text)) {
    return { route: "PRODUCT_FOLLOW_UP", dialogueTopic: "PRODUCT", reason: "REFERENTIAL_FOLLOW_UP", hasContext };
  }
  return { route: "OFF_TOPIC_SAFE", dialogueTopic: "OFF_TOPIC", reason: "NO_PRODUCT_SIGNAL", hasContext };
}

export function buildConversationRoutingResponse({ route, message, semanticPlan = null, routingReason = "" } = {}) {
  const text = normalize(message);
  if (route === "LIVE_EXTERNAL_DATA") {
    return "Bu oturumda canlı hava, kur, kripto veya trafik kaynağı bağlı değil; güncel sayısal değer veremem. Bu soruyu ürün kayıtlarına çevirmiyor ve GPS, vardiya ya da maliyet özetiyle yanıtlamıyorum.";
  }
  if (route === "UNCLEAR_OR_AMBIGUOUS") {
    const canonicalRequest = semanticPlan?.canonicalRequest || semanticPlan?.request || null;
    const typedEvidence = canonicalRequest?.typedEvidence || semanticPlan?.typedEvidence || null;
    const financialReferenceAmbiguity = String(canonicalRequest?.domain || "").toUpperCase() === "FINANCE"
      && (
        String(typedEvidence?.object?.value || typedEvidence?.object || "").toUpperCase() === "FINANCIAL"
        || String(canonicalRequest?.primaryTask || "").toUpperCase() === "FINANCIAL_REFERENCE_CLARIFICATION"
        || String(canonicalRequest?.capability || "").toUpperCase() === "CLARIFY"
      )
      && (
        String(typedEvidence?.reference?.value || typedEvidence?.reference || "").toUpperCase() === "AMBIGUOUS"
        || String(typedEvidence?.reference?.value || typedEvidence?.reference || "").toUpperCase() === "ABSENT"
      )
      && String(canonicalRequest?.ambiguity?.status || "").toUpperCase() === "UNRESOLVED";
    if (financialReferenceAmbiguity) {
      return "Finans ekranında birden fazla tutar var: planlanan teklif, tahmini maliyet, önerilen minimum teklif/teklif tabanı ve tahmini kâr/zarar. Hangisinin kaynağını açıklayayım?";
    }
    return "Hangi kayıt veya konuyu kastettiğini biraz netleştirir misin? Kayıt türünü, görünen adını ya da numarasını yazabilirsin.";
  }
  const arithmeticResult = evaluateGeneralArithmeticRequest(message);
  if (route === "GENERAL_KNOWLEDGE" && Number.isFinite(arithmeticResult)) {
    return `Bu basit hesaplamanın sonucu ${arithmeticResult}. Bu yanıt ürün kayıtlarından alınmadı.`;
  }
  if (route === "OFF_TOPIC_SAFE") {
    if (routingReason === "INTERNAL_OR_SECRET_MATERIAL_REQUEST") return "İç tanılama, hata ayrıntısı veya gizli değerleri paylaşamam. Bu isteği ürün kaydı, sayı veya başka bir özetle değiştirmiyorum.";
    if (routingReason === "GENERAL_CREATIVE_OUTPUT_VOCABULARY") return buildGeneralCreativeReply(message, semanticPlan);
    if (hasAny(text, ["merhaba", "selam", "günaydın", "gunaydin", "nasılsın", "nasilsin"])) return "Merhaba. Ürün kayıtlarını etkilemeden kısa bir sohbet edebiliriz; bir kayıt veya ekran hakkında yardım istersen hazırım.";
    if (hasAny(text, ["şaka", "saka", "espri", "fıkra", "fikra"]) && hasCreativeTaskSignal(text)) return "Takvim neden toplantıya geç kalmış? Çünkü yaprak dökümünü uzatmış. Böylece herkes gülümseyip işine dönmüş.";
    if (hasAny(text, ["hikaye", "hikâye"]) && hasCreativeTaskSignal(text)) return "Kısa hikâye: Küçük bir pusula, yönünü bulamayan yolcuya önce durup çevresine bakmasını söyledi. Yolcu işaretleri fark edince doğru patikayı sakince seçti.";
    if (hasAny(text, ["mesaj", "tebrik", "dilek"]) && hasCreativeTaskSignal(text)) return "Kısa mesaj taslağı: Merhaba, umarım günün güzel geçiyordur. Uygun olduğunda kısa bir dönüş yapabilir misin? Teşekkür ederim.";
    if (hasAny(text, ["not", "toplantı", "toplanti"]) && hasCreativeTaskSignal(text)) return "Kısa not taslağı: Bugünkü görüşmede alınan kararları ve sonraki adımları netleştirip paylaşacağım. Katılımınız için teşekkür ederim.";
    return "Bu soru mevcut ürün kapsamının dışında; güvenli biçimde kısa sohbet edebilirim, ancak yetkili vardiya, araç, sözleşme veya mali kayıtları bu soruya karıştırmıyorum.";
  }
  if (route === "GENERAL_KNOWLEDGE") {
    if (hasAny(text, ["oncelik", "öncelik", "aciliyet", "önce", "ilk", "sonraki", "guvenli", "güvenli", "risk", "etki", "kanıt", "kanit", "sıra", "sira", "karar"])) {
      return "Genel öncelik sırası; etkisi yüksek olanı, zaman açısından acil olanı ve güvenli biçimde geri döndürülebilir ilk adımı birlikte değerlendirerek belirlenir. Belirsiz durumda önce kanıtı doğrulamak, sonra etkisi en büyük işi ele almak uygundur.";
    }
    // A recognized general-information speech act still deserves a useful
    // answer.  Give a domain-neutral method rather than a product fallback
    // or a permission clarification when vocabulary happens to be adjacent to
    // planning, routes, shifts or service work.
    return "Genel yöntemde önce amaç ve kapsam netleştirilir; ardından zaman, kaynak, kısıt ve olası riskler birlikte değerlendirilir. Uygulanabilir küçük bir plan oluşturup kontrol noktaları belirlemek, değişiklik oldukça varsayımları yeniden gözden geçirmek gerekir.";
  }
  return "Bu isteği güvenli biçimde yönlendiremedim; hangi kayıt, alan veya ekranı kastettiğini netleştirir misin?";
}

export { normalize as normalizeConversationText };
