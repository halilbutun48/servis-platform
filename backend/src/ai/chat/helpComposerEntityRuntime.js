export function createEntityRuntimeHelpers({
  firstNonEmpty,
  normalizeText,
  pickTerms,
  composeSimpleScreenReply,
  roleLead,
  shiftStatusText,
  shiftNextStep,
  vehicleSourceText,
  vehicleNextStep,
  vehicleBlockers,
}) {
  function vehicleReadinessReply(context) {
    const blockers = vehicleBlockers(context);
    const ready = blockers.length === 0;
    const score = ready ? 88 : 44;
    return `${vehicleSourceText(context)} Bu kayıt şu an ${ready ? 'hazır' : 'hazır değil'} (${score}/100). ${blockers[0] ? `Ana blokaj: ${blockers[0]}` : 'Kritik eksik görünmüyor.'} Şimdi yap: ${vehicleNextStep(context)}`.trim();
  }

  function vehicleMissingDataReply(context) {
    const blockers = vehicleBlockers(context);
    if (!blockers.length) return `${vehicleSourceText(context)} Belirgin eksik görünmüyor. Şimdi yap: ${vehicleNextStep(context)}`.trim();
    const more = blockers.slice(1, 3);
    return `Ana blokaj: ${blockers[0]} ${more.length ? `Diğer dikkatler: ${more.join(' • ')}` : ''} Şimdi yap: ${vehicleNextStep(context)}`.trim();
  }

  function prefersSelectedEntity(questionType, sourceEntityType, context) {
    if (sourceEntityType !== 'screen') return false;
    if (!['shift', 'vehicle'].includes(String(context?.type || ''))) return false;
    return ['STATUS_HELP', 'READINESS_CHECK', 'MISSING_DATA_HELP', 'SAFE_NEXT_STEP', 'WHY_BLOCKED'].includes(String(questionType || ''));
  }

  function isShiftTrackingScreen(screenDefinition) {
    return String(screenDefinition?.path || '').includes('/shifts');
  }

  function shiftScreenNoSelectionReply(questionType, screenDefinition) {
    const lead = `${screenDefinition?.label || 'Vardiyalar'} ekranı mevcut shiftlerin teklif, anlaşma, atama ve operasyon takibini gösterir. Yeni plan bu ekranda kurulmaz; yeni iş gerekiyorsa Planlama Merkezi'ne dönülür.`;
    if (questionType === 'READINESS_CHECK') {
      return `${lead} Atamaya hazır mı sorusunu burada ilgili vardiya seçiliyken okuruz. Önce Market, Bekleyen veya Liste bölümünden ilgili vardiyayı aç. Sonra durum, araç, sürücü ve açık teklif alanlarını birlikte kontrol et.`;
    }
    if (questionType === 'MISSING_DATA_HELP') {
      return `${lead} Seçili vardiya olmadan net eksik söylemem doğru olmaz. Bu ekranda önce araç, sürücü, durak ve teklif kararı alanlarına bakılır.`;
    }
    if (questionType === 'STATUS_HELP') {
      return `${lead} Net durum söylemek için önce ilgili vardiyayı seçmek gerekir. Vardiya seçildiğinde durum, araç, sürücü, açık teklif ve sonraki adım birlikte okunur.`;
    }
    if (questionType === 'SAFE_NEXT_STEP') {
      return `${lead} En risksiz adım önce ilgili vardiyayı seçip durum, araç, sürücü ve teklif bilgisini birlikte okumaktır.`;
    }
    if (questionType === 'WHY_BLOCKED') {
      return `${lead} Ana blokajı net söylemek için önce ilgili vardiyayı seç. Bu ekranda en sık blokajlar araç, sürücü, durak veya teklif kararı eksikleridir.`;
    }
    return lead;
  }

  function openingReply({ entityType, context, guide, screenDefinition, roleMode }) {
    if (entityType === 'shift') {
      return `${roleLead(roleMode)} ${shiftStatusText(context)} ${shiftNextStep(context)}`;
    }
    if (entityType === 'vehicle') {
      return `${roleLead(roleMode)} ${vehicleSourceText(context)} ${vehicleNextStep(context)}`;
    }
    if (roleMode === 'SIMPLE') {
      return composeSimpleScreenReply({ questionType: 'OPEN', guide, message: '', screenDefinition });
    }
    return `${firstNonEmpty(screenDefinition?.menuPurpose, guide.plainSummary, guide.summary)} ${firstNonEmpty(screenDefinition?.firstStep, guide.whatToDoNow, 'İstersen şimdi ne yapacağını da anlatayım.')}`;
  }

  function termComparisonReply(message) {
    const text = normalizeText(message);
    const hasLog = /log|audit|işlem kaydı|islem kaydi/.test(text);
    const hasNotification = /bildirim|notification/.test(text);
    const hasInvite = /giriş daveti|giris daveti|hesap daveti|invite/.test(text);
    const hasAccessLink = /erişim linki|erisim linki|access link|personel link|öğrenci linki|ogrenci linki|veli linki|student link/.test(text);
    const hasParentAccess = /veli erişimi|veli erisimi|parent access/.test(text);
    const hasInbound = /inbound|toplama yönü|toplama yonu/.test(text);
    const hasOutbound = /outbound|dağıtım yönü|dagitim yonu|bırakma yönü|birakma yonu/.test(text);
    const hasOsrm = /osrm|yol hesabı|rota hesabı/.test(text);
    const hasMatrix = /matrix|matris|süre tablosu|sure tablosu/.test(text);
    const asksDiff = /aynı şey mi|ayni sey mi|farkı ne|farki ne/.test(text);
    if (asksDiff && hasLog && hasNotification) return 'Aynı şey değil. Bildirim kullanıcıya giden uyarıdır. İşlem kaydı ise sistemde ne olduğunun kayıt altına alınmış halidir.';
    if (asksDiff && ((hasInvite && hasAccessLink) || (hasParentAccess && hasAccessLink))) return 'Aynı şey değil. Eski giriş daveti akışı kaldırıldı. Yeni yapıda okul Veli Erişimi üretir; erişim linki, erişim kodu ve PIN aynı süre boyunca kullanılabilir.';
    if (asksDiff && hasInbound && hasOutbound) return "Aynı yön değil. Inbound toplama yönüdür; personeli merkeze veya hub'a getirir. Outbound ise hub'dan çıkıp personeli bırakma yönüdür.";
    if ((hasOsrm && hasMatrix) || (asksDiff && (hasOsrm || hasMatrix))) return 'OSRM yol ve süre hesabı yapan servistir. Matrix ise birden çok nokta için toplu süre ve mesafe tablosudur.';
    return '';
  }

  function analyzerEvidenceText(analysis) {
    const rows = Array.isArray(analysis?.evidence) ? analysis.evidence.slice(0, 3) : [];
    return rows.length ? `Bunu şuradan anlıyorum: ${rows.join(' • ')}.` : '';
  }

  function analyzerReadinessLabel(analysis) {
    const val = String(analysis?.readiness || 'REVIEW_NEEDED');
    const score = Number(analysis?.readinessScore || Math.round(Number(analysis?.healthScore || 0.72) * 100));
    if (val === 'READY') return `hazır (${score}/100)`;
    if (val === 'NOT_READY') return `hazır değil (${score}/100)`;
    return `kontrollü ilerlemeli (${score}/100)`;
  }

  function analyzerReply(analysis, mode = 'DIAGNOSIS') {
    if (!analysis) return '';
    const lead = firstNonEmpty(analysis.reasoningLead, 'Bu kayıtta önce seçili veriyi net okumak gerekiyor.');
    const evidence = analyzerEvidenceText(analysis);
    const blocker = analysis?.blockers?.[0] ? `Ana blokaj: ${analysis.blockers[0]}` : '';
    const missing = analysis?.missingData?.[0] ? `Eksik veri: ${analysis.missingData[0]}` : '';
    const disabled = analysis?.disabledHints?.[0] ? `Pasif buton ipucu: ${analysis.disabledHints[0]}` : '';
    const next = analysis?.nextBestAction ? `Şimdi yap: ${analysis.nextBestAction}` : '';
    const safest = analysis?.safestNextStep ? `En risksiz adım: ${analysis.safestNextStep}` : '';
    const changed = analysis?.changedHint ? `Not: ${analysis.changedHint}` : '';
    if (mode === 'READINESS') return `${lead} Bu kayıt şu an ${analyzerReadinessLabel(analysis)}. ${blocker || missing || disabled} ${evidence} ${next}`.trim();
    if (mode === 'SAFE_NEXT') return `${lead} ${evidence} ${safest || next}`.trim();
    if (mode === 'MISSING') return `${lead} ${missing || blocker || disabled || 'Belirgin eksik veri görünmüyor.'} ${evidence} ${next}`.trim();
    if (mode === 'CHANGED') return `${lead} ${changed || 'Ekranda gerçekten neyin değiştiğini anlamak için aynı satırın durum, rozet ve sonraki adım alanlarını birlikte karşılaştır.'} ${evidence}`.trim();
    if (mode === 'COMPARE') return `${analysis?.compareHint || lead} ${evidence}`.trim();
    if (mode === 'EVIDENCE') return `${evidence || 'Bu yorum seçili alan, rozet ve ekrandaki görünen ipuçlarına dayanıyor.'} ${disabled}`.trim();
    if (mode === 'SHORT') return `${lead} ${blocker || missing || disabled || ''} ${next}`.trim();
    return `${lead} ${blocker} ${missing} ${disabled} ${evidence} ${next}`.trim();
  }

  function composeScreenLocationReply({ guide, screenDefinition }) {
    const terms = pickTerms(guide.simpleTerms || screenDefinition?.simpleTerms, 3);
    const lines = [];
    lines.push("Konum tarafında genelde iki kaynak vardır: sürücünün telefon GPS'i ve cihaz GPS'i.");
    if (terms.length) lines.push(`Kısa anlamlar: ${terms.join(' • ')}`);
    lines.push(firstNonEmpty(guide.whatToDoNow, screenDefinition?.firstStep, 'Önce araç veya canlı takip bilgisini kontrol et.'));
    return lines.join(' ');
  }

  function roleHelpReply({ guide, screenDefinition, roleMode }) {
    const menus = Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : guide.screenMenus || [];
    if (roleMode === 'SIMPLE') {
      return composeSimpleScreenReply({ questionType: 'ROLE_HELP', guide, message: '', screenDefinition });
    }
    return `${firstNonEmpty(guide.plainSummary, guide.summary)} ${menus.length ? `Bu rolde en sık kullanacağın yerler: ${menus.slice(0, 3).map((x) => x.label).join(', ')}.` : ''}`;
  }



  return {
    vehicleReadinessReply,
    vehicleMissingDataReply,
    prefersSelectedEntity,
    isShiftTrackingScreen,
    shiftScreenNoSelectionReply,
    openingReply,
    termComparisonReply,
    analyzerEvidenceText,
    analyzerReply,
    composeScreenLocationReply,
    roleHelpReply,
  };
}
