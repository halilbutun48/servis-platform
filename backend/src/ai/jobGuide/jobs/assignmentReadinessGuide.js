import { pickTerms } from "../glossary.js";

export function buildAssignmentReadinessGuide(context) {
  const hasVehicle = !!context?.vehicleId;
  const hasDriver = !!context?.driverId;
  const hasStops = Number(context?.stopCount || 0) > 0;
  const assignmentCount = Number(context?.assignmentCount || 0);
  const peopleCount = Number(context?.peopleCount || 0);
  const missing = [!hasVehicle ? "araç" : null, !hasDriver ? "sürücü" : null, !hasStops ? "durak" : null].filter(Boolean);
  return {
    jobTitle: "Atamaya hazır mı",
    jobPurpose: "Bu rehber, işin atamaya hazır olup olmadığını sade şekilde gösterir.",
    plainSummary: missing.length
      ? `Bu iş henüz tam hazır görünmüyor. Eksik alanlar: ${missing.join(", ")}.`
      : "Bu iş atama için büyük ölçüde hazır görünüyor.",
    whatToDoNow: missing.length
      ? `Önce şu eksikleri tamamla: ${missing.join(", ")}.`
      : "Önce son durumu gözden geçir, sonra atama kararına geç.",
    whatToDoNext: missing.length
      ? "Eksikler tamamlanınca tekrar kontrol et."
      : "Uygunsa atama adımına geç.",
    doNotDo: "Hazır kontrolü yapılmadan işi tamam sanma.",
    stepByStep: [
      hasVehicle ? "Araç bilgisi tamam görünüyor." : "Araç atamasını yap.",
      hasDriver ? "Sürücü bilgisi tamam görünüyor." : "Sürücü atamasını yap.",
      hasStops ? "Durak bilgisi görünüyor." : "Durak bilgisini oluştur veya kontrol et.",
      `Atama sayısı ${assignmentCount}, personel sayısı ${peopleCount}.`,
      "Her şey tamamsa atamaya geç.",
    ],
    commonMistakes: [
      "Durak bilgisi olmadan atamaya hazır sanmak.",
      "Araç bağlı ama sürücü yokken devam etmek.",
      "Sadece durum etiketine bakıp eksikleri görmemek.",
    ],
    doneChecklist: [
      "Araç bilgisi görüldü.",
      "Sürücü bilgisi görüldü.",
      "Durak bilgisi görüldü.",
      "Atama için eksik kalmadıysa sonraki adıma geçilebilir.",
    ],
    simpleTerms: pickTerms(["atama", "teklif"]),
    screenExplanation: "Bu ekran, atama öncesi işin eksiklerini hızlıca görmen için kullanılır.",
  };
}
