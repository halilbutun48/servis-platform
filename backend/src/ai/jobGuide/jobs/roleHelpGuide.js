import { buildRoleHelpSummary, getScreenDefinitionForUser } from "../screenCatalog.js";

export function buildRoleHelpGuide({ user, screenContext, entityId }) {
  const roleInfo = buildRoleHelpSummary(user);
  const screen = getScreenDefinitionForUser(user, screenContext, entityId);
  return {
    jobTitle: `${roleInfo.roleLabel} için yardım`,
    jobPurpose: 'Bu rehber, bu rolde hangi ekranların ne için kullanıldığını ve nereden başlanacağını açıklar.',
    plainSummary: `${roleInfo.roleLabel} rolünde en çok kullanacağın ekranları burada görebilirsin.`,
    whatToDoNow: screen?.firstStep || 'Önce yapmak istediğin işe uygun ekranı seç.',
    whatToDoNext: 'Sonra ekran rehberi veya buton rehberi aç.',
    doNotDo: 'Yetkin dışındaki işi yapmaya çalışma.',
    stepByStep: [
      'Önce yapmak istediğin işi düşün.',
      'O işe uygun ekranı seç.',
      'Gerekirse ekran veya buton rehberini aç.',
    ],
    commonMistakes: [
      'Yanlış menüye girmek.',
      'Detay ekranı yerine özet ekranda çözüm aramak.',
    ],
    doneChecklist: [
      'Kullanılacak ekran netleşti.',
      'Sıradaki adım anlaşıldı.',
    ],
    screenExplanation: `${roleInfo.roleLabel} rolünde hangi ekranın ne için olduğunu sade dille açıklar.`,
    menuPurpose: {
      title: `${roleInfo.roleLabel} menü rehberi`,
      description: 'Bu rolde kullanabileceğin ana ekranların kısa açıklaması.',
      forWhom: `${roleInfo.roleLabel} rolü içindir.`,
      firstStep: 'Önce işine uygun ekranı seç.',
    },
    screenMenus: roleInfo.screens,
    buttonGuides: screen?.buttonGuides || [],
    simpleTerms: screen?.simpleTerms || [],
  };
}
