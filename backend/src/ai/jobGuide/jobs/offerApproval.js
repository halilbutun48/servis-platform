import { pickTerms } from "../glossary.js";

export function buildOfferApprovalGuide(context) {
  const hasVehicle = !!context?.vehicleId;
  const hasDriver = !!context?.driverId;
  const hasStops = Number(context?.stopCount || 0) > 0;
  const pendingDecision = String(context?.roomOfferDecision || "") === "PENDING";
  const hasAgreement = !!context?.agreementId;
  const missing = [!hasVehicle ? "araç" : null, !hasDriver ? "sürücü" : null, !hasStops ? "durak" : null].filter(Boolean);
  return {
    jobTitle: "Teklifi onaylama",
    jobPurpose: "Bu rehber, onay vermeden önce eksik bilgi olup olmadığını hızlıca görmen için kullanılır.",
    plainSummary: missing.length
      ? `Onay vermeden önce şu eksikleri kontrol et: ${missing.join(", ")}.`
      : "Onay vermeden önce saat, araç ve sürücü bilgisini son kez kontrol et.",
    whatToDoNow: missing.length
      ? `Önce eksik görünen alanları tamamla: ${missing.join(", ")}.`
      : "Önce saat ve araç bilgisini son kez doğrula.",
    whatToDoNext: pendingDecision
      ? "Her şey uygunsa teklifi onayla ve bekleyen kararı kapat."
      : "Her şey uygunsa onay ver.",
    doNotDo: hasAgreement
      ? "Sözleşmeli işte pazarlık açıkmış gibi ikinci kez teklif verme."
      : "Eksik bilgi varken onay verme.",
    stepByStep: [
      "Saat bilgisini kontrol et.",
      hasVehicle ? "Seçili aracın doğru olduğundan emin ol." : "Önce uygun aracı seç.",
      hasDriver ? "Sürücünün doğru bağlı olduğundan emin ol." : "Önce sürücüyü bağla.",
      hasStops ? "Durak sayısını kontrol et." : "Durak bilgisi yoksa önce onu tamamla.",
      "Eksik kalmadıysa onay ver.",
    ],
    commonMistakes: [
      "Araç seçmeden onay vermeye çalışmak.",
      "Sürücü bağlı değilken işi hazır sanmak.",
      "Saati kontrol etmeden acele karar vermek.",
    ],
    doneChecklist: [
      "Durum güncellendi.",
      "Onay sonrası kayıt yeni haliyle göründü.",
      pendingDecision ? "Bekleyen karar kapandı." : "İşlem tamamlandı.",
    ],
    simpleTerms: pickTerms(["teklif", "atama", hasAgreement ? "sozlesme" : null]),
    screenExplanation: "Bu ekran, teklifi güvenli şekilde onaylaman için son kontrol adımını gösterir.",
  };
}
