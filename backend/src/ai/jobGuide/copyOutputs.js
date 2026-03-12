export function buildCopyOutputs({ jobType, context, precheck }) {
  const label = precheck?.precheckLabel || 'Hazır';
  const blockers = Array.isArray(precheck?.whyBlocked) ? precheck.whyBlocked : [];
  const first = blockers[0] || 'Belirgin engel görünmüyor.';
  const entityText = context?.type === 'vehicle'
    ? `Araç #${context?.id || '-'} ${context?.plate || ''}`.trim()
    : context?.type === 'screen'
      ? `${context?.label || 'Ekran'} ekranı`
      : `Vardiya #${context?.id || '-'}`;
  return {
    opsNote: `${entityText} için ${jobType} rehberi çalıştırıldı. Durum: ${label}. ${first}`,
    supportDraft: `Merhaba, ${entityText} için rehber kontrolünde şu durum görüldü: ${label}. ${first}`,
  };
}
