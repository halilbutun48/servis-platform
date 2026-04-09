export function button(label, purpose, whenToUse, whatHappens, disabledReason = "Bu ekran veya rol için uygun koşul oluşmadan kapalı kalabilir.", riskNote = "") {
  return { label, purpose, whenToUse, whatHappens, disabledReason, riskNote };
}

export function screen(id, path, label, cfg = {}) {
  return {
    id,
    path,
    label,
    menuPurpose: cfg.menuPurpose || "Bu ekran işi doğru sırayla tamamlamak için kullanılır.",
    forWhom: cfg.forWhom || "Bu ekran bu rol için uygundur.",
    firstStep: cfg.firstStep || "Önce listedeki kayıtları kontrol et.",
    nextStep: cfg.nextStep || "Sonra gerekirse ilgili alt ekrana geç.",
    doNotDo: cfg.doNotDo || "Ne yaptığını anlamadan kritik onay verme.",
    stepByStep: cfg.stepByStep || [],
    commonMistakes: cfg.commonMistakes || [],
    doneChecklist: cfg.doneChecklist || [],
    buttonGuides: cfg.buttonGuides || [],
    screenMenus: cfg.screenMenus || [],
    simpleTerms: cfg.simpleTerms || [],
    firstControls: cfg.firstControls || [],
    stuckChecks: cfg.stuckChecks || [],
    workflowStages: cfg.workflowStages || [],
    nextScreens: cfg.nextScreens || [],
    chatQuestions: cfg.chatQuestions || [],
    dataRules: cfg.dataRules || [],
    fieldGuides: cfg.fieldGuides || [],
    badgeGuides: cfg.badgeGuides || [],
    rowReadHint: cfg.rowReadHint || '',
  };
}

export function inferGuideKeyFromScreen(screenContext = {}) {
  const path = String(screenContext?.path || '').split('?')[0].trim().toLowerCase();
  const kind = String(screenContext?.companyKind || '').trim().toUpperCase();
  if (kind === 'SCHOOL') return 'SCHOOL';
  if (kind === 'ORGANIZATION') return 'ORGANIZATION';
  if (path.startsWith('/organization')) return 'ORGANIZATION';
  if (path.startsWith('/school')) return 'SCHOOL';
  if (path.startsWith('/company')) return 'COMPANY';
  if (path.startsWith('/room')) return 'ROOM';
  if (path.startsWith('/driver')) return 'DRIVER';
  if (path.startsWith('/personel')) return 'PERSONEL';
  if (path.startsWith('/parent')) return 'PARENT';
  if (path.startsWith('/superadmin')) return 'SUPER_ADMIN';
  return '';
}
