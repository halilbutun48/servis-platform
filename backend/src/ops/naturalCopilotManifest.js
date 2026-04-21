export const NATURAL_COPILOT_CAPABILITIES = [
  { id: "natural_reply", label: "Doğal Türkçe cevap katmanı", status: "ACTIVE" },
  { id: "short_memory", label: "Kısa konuşma hafızası", status: "ACTIVE" },
  { id: "why_blocked", label: "Neden ilerlemiyor modu", status: "PLANNED" },
  { id: "next_step", label: "Şimdi ne yapayım modu", status: "PLANNED" },
  { id: "simplify", label: "Daha basit anlat seçeneği", status: "PLANNED" },
  { id: "feedback", label: "Copilot geri bildirim zemini", status: "PLANNED" },
];

export const NATURAL_COPILOT_RULES = [
  "Copilot read-only suggestion-first cizgisinde kalir.",
  "Dogal dil katmani karar motorunu degistirmez; sadece daha anlasilir sunar.",
  "Kisa konusma hafizasi ayni konuda takipli yardim icin kullanilir.",
  "M64 green olmadan M65 acilmaz.",
];

export function getNaturalCopilotManifest() {
  return {
    activeMilestone: "M64",
    title: "Doğal Copilot Yol Haritası",
    capabilities: NATURAL_COPILOT_CAPABILITIES,
    rules: NATURAL_COPILOT_RULES,
  };
}

export function buildNaturalReplyTemplate() {
  return {
    activeMilestone: "M64",
    sections: ["durum", "ana-sebep", "simdi-ne-yap", "sonraki-adim", "gerekirse-daha-basit-anlat"],
    summary: "M64 yol haritası için cevap iskeleti.",
  };
}

export function buildCopilotFeedbackTemplate() {
  return {
    activeMilestone: "M64",
    options: ["ise-yaradi", "ise-yaramadi", "cok-teknikti", "yanlis-anladi", "daha-basit-anlat"],
    summary: "M64 yol haritası için geri bildirim iskeleti.",
  };
}
