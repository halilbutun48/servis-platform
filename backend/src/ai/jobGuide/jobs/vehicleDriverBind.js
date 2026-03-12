import { pickTerms } from "../glossary.js";

export function buildVehicleDriverBindGuide(context) {
  const hasDriver = !!context?.driver?.id;
  const hasActiveShift = Number((context?.currentShiftIds || []).length) > 0;
  return {
    jobTitle: "Araç ile sürücüyü bağlama",
    jobPurpose: "Bu rehber, araç ile sürücünün doğru bağlanıp bağlanmadığını kontrol ederek ilerlemen için kullanılır.",
    plainSummary: hasDriver
      ? "Bu araçta sürücü bağı görünüyor. Değişiklik yapmadan önce doğru kişi mi kontrol et."
      : "Bu araçta sürücü bağı görünmüyor. Önce uygun sürücüyü bağla.",
    whatToDoNow: hasDriver
      ? "Önce bağlı sürücünün doğru kişi olup olmadığını kontrol et."
      : "Önce bu araca uygun sürücüyü seç.",
    whatToDoNext: hasActiveShift
      ? "Bağ değişirse aktif iş etkilenir mi kontrol et."
      : "Bağ tamamlanınca kayıt durumunu tekrar kontrol et.",
    doNotDo: "Yanlış sürücüyü bağlayıp aktif işi etkileme.",
    stepByStep: [
      `Araç plakasını kontrol et: ${context?.plate || "-"}.`,
      hasDriver ? "Bağlı sürücünün doğru kişi olduğunu doğrula." : "Bağlanacak sürücüyü seç.",
      hasActiveShift ? "Aktif iş varsa etkisini gözden geçir." : "Bağ sonrası araç durumunu tekrar kontrol et.",
      "Kaydetmeden önce son kez doğrula.",
    ],
    commonMistakes: [
      "Yanlış araca yanlış sürücüyü bağlamak.",
      "Aktif iş varken değişikliğin etkisini kontrol etmemek.",
      "Eski bağı görmeden yeni bağ yapmak.",
    ],
    doneChecklist: [
      "Araç doğru seçildi.",
      "Sürücü doğru seçildi.",
      "Bağ sonrası kayıt güncellendi.",
    ],
    simpleTerms: pickTerms(["atama", "telefonGps", "cihazGps"]),
    screenExplanation: "Bu ekran, araç ile sürücüyü doğru şekilde bağlamak için kullanılır.",
  };
}
