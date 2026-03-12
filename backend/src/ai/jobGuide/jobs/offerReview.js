import { pickTerms } from "../glossary.js";

export function buildOfferReviewGuide(context) {
  const companyName = context?.company?.name || "şirket";
  const openOfferCount = Number(context?.openOfferCount || 0);
  const hasVehicle = !!context?.vehicleId;
  const hasDriver = !!context?.driverId;
  const hasAgreement = !!context?.agreementId;
  return {
    jobTitle: "Teklifi inceleme",
    jobPurpose: `Bu rehber, ${companyName} için açılmış teklifi hızlıca okuyup doğru karar hazırlığı yapman için kullanılır.`,
    plainSummary: openOfferCount > 1
      ? "Önce açık teklifleri karşılaştır, sonra araç ve sürücü durumunu kontrol et."
      : "Önce teklifin temel bilgilerini kontrol et, sonra eksik var mı bak.",
    whatToDoNow: openOfferCount > 0
      ? "Önce teklifte araç, saat ve kapsam bilgilerini kontrol et."
      : "Önce bu iş için gerçekten aktif teklif var mı kontrol et.",
    whatToDoNext: hasVehicle && hasDriver
      ? "Eksik görünmüyorsa karar vermeye geç."
      : "Araç veya sürücü eksikse önce onları netleştir.",
    doNotDo: hasAgreement
      ? "Sözleşmeli işte pazarlık açıkmış gibi düşünme."
      : "Tek ayrıntıya bakıp hemen karar verme.",
    stepByStep: [
      "Saat ve yön bilgisini kontrol et.",
      "Araç ve sürücü bilgisi var mı bak.",
      openOfferCount > 1 ? "Açık teklifleri birbiriyle karşılaştır." : "Eksik bilgi varsa not et.",
      hasAgreement ? "Bu iş sözleşmeye bağlıysa buna göre ilerle." : "Her şey uygunsa karar adımına geç.",
    ],
    commonMistakes: [
      "Araç bilgisine bakmadan teklifi değerlendirmek.",
      "Sürücü eksikken iş hazır sanmak.",
      hasAgreement ? "Sözleşmeli işi normal teklif gibi okumak." : "Saat bilgisini kontrol etmeden karar vermek.",
    ],
    doneChecklist: [
      "Teklifin hangi iş için açıldığı netleşti.",
      "Araç ve sürücü durumu görüldü.",
      "Karar vermeden önce eksikler not edildi.",
    ],
    simpleTerms: pickTerms(["teklif", "atama", hasAgreement ? "sozlesme" : null]),
    screenExplanation: "Bu ekran, teklifi anlaman ve hemen ardından doğru karara geçmen için kullanılır.",
  };
}
