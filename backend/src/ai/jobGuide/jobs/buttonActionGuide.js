import { getScreenDefinitionForUser } from "../screenCatalog.js";

export function buildButtonActionGuide({ user, screenContext, entityId }) {
  const screen = getScreenDefinitionForUser(user, screenContext, entityId);
  if (!screen) {
    return {
      jobTitle: 'Buton rehberi',
      jobPurpose: 'Bu rehber ekrandaki önemli butonların ne işe yaradığını açıklar.',
      plainSummary: 'Önce doğru ekranı seçmek gerekiyor.',
      whatToDoNow: 'Önce doğru ekranı seç.',
      whatToDoNext: 'Sonra buton rehberini yeniden aç.',
      doNotDo: 'Yanlış ekran için buton açıklaması bekleme.',
      stepByStep: ['Ekranı seç.', 'Buton rehberini aç.'],
      commonMistakes: ['Yanlış ekranı seçmek.'],
      doneChecklist: ['Doğru ekran seçildi.'],
      screenExplanation: 'Bu rehber kritik butonların ne yaptığını sade dille açıklar.',
      menuPurpose: null,
      buttonGuides: [],
      screenMenus: [],
      simpleTerms: [],
    };
  }
  return {
    jobTitle: `${screen.label} buton rehberi`,
    jobPurpose: 'Bu rehber seçili ekrandaki önemli butonların ne yaptığını, ne zaman kullanıldığını ve neden kapalı kalabileceğini açıklar.',
    plainSummary: `${screen.label} ekranındaki önemli butonların ne işe yaradığını burada görebilirsin.`,
    whatToDoNow: 'Önce hangi butona basmak istediğini seç.',
    whatToDoNext: 'Buton açıklamasını okuyup sonra ilgili işlemi yap.',
    doNotDo: 'Butonun ne yaptığını anlamadan kritik işlem başlatma.',
    stepByStep: [
      'Ekrandaki ana butonu bul.',
      'Ne zaman kullanılacağını oku.',
      'Kapalıysa sebebini kontrol et.',
    ],
    commonMistakes: [
      'Yanlış butona basmak.',
      'Kapalı butonu hata sanmak.',
      'Onay vermeden önce sonucu okumamak.',
    ],
    doneChecklist: [
      'Doğru butonun ne yaptığı anlaşıldı.',
      'Gerekirse ilgili ekrana geçiş hazırlandı.',
    ],
    screenExplanation: `${screen.label} ekranında hangi butonun ne işe yaradığını anlamak için kullanılır.`,
    menuPurpose: {
      title: screen.label,
      description: screen.menuPurpose,
      forWhom: screen.forWhom,
      firstStep: 'Önce ekrandaki buton listesini oku.',
    },
    buttonGuides: screen.buttonGuides,
    screenMenus: screen.screenMenus,
    simpleTerms: screen.simpleTerms,
  };
}
