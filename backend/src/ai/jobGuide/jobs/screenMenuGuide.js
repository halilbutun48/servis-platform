import { getScreenDefinitionForUser } from "../screenCatalog.js";

export function buildScreenMenuGuide({ user, screenContext, entityId }) {
  const screen = getScreenDefinitionForUser(user, screenContext, entityId);
  if (!screen) {
    return {
      jobTitle: 'Ekran rehberi',
      jobPurpose: 'Bu rehber seçili ekranın ne işe yaradığını açıklar.',
      plainSummary: 'Önce doğru ekranı seçmen gerekiyor.',
      whatToDoNow: 'Önce doğru ekranı seç.',
      whatToDoNext: 'Sonra rehberi tekrar aç.',
      doNotDo: 'Ekran seçmeden yorum bekleme.',
      stepByStep: ['Ekranı seç.', 'Rehberi aç.'],
      commonMistakes: ['Yanlış ekran seçmek.'],
      doneChecklist: ['Doğru ekran seçildi.'],
      screenExplanation: 'Bu rehber, ekrandaki işin ne için olduğunu açıklar.',
      menuPurpose: null,
      buttonGuides: [],
      screenMenus: [],
      simpleTerms: [],
    };
  }
  return {
    jobTitle: `${screen.label} ekranı rehberi`,
    jobPurpose: screen.menuPurpose,
    plainSummary: `${screen.label} ekranı ${screen.menuPurpose.toLowerCase()}`,
    whatToDoNow: screen.firstStep,
    whatToDoNext: screen.nextStep,
    doNotDo: screen.doNotDo,
    stepByStep: screen.stepByStep,
    commonMistakes: screen.commonMistakes,
    doneChecklist: screen.doneChecklist,
    screenExplanation: screen.menuPurpose,
    menuPurpose: {
      title: screen.label,
      description: screen.menuPurpose,
      forWhom: screen.forWhom,
      firstStep: screen.firstStep,
    },
    buttonGuides: screen.buttonGuides,
    screenMenus: screen.screenMenus,
    simpleTerms: screen.simpleTerms,
  };
}
