export function createSelectedRuntimeHelpers(deps = {}) {
  const {
    firstNonEmpty,
    normalizeText,
    tokenOverlapScore,
    structuredFacts,
    structuredActionRows,
    dataRules,
  } = deps;

  function selectedFieldRows(screenContext) {
    return (Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields : []).map((row) => ({
      label: firstNonEmpty(row?.label, row?.key, ''),
      value: firstNonEmpty(row?.value, row?.text, '-'),
      help: firstNonEmpty(row?.help, row?.meaning, row?.purpose, ''),
    })).filter((row) => row.label);
  }

  function selectedBadgeRows(screenContext) {
    return (Array.isArray(screenContext?.selectedBadges) ? screenContext.selectedBadges : []).map((row) => ({
      label: firstNonEmpty(row?.label, row?.key, ''),
      value: firstNonEmpty(row?.value, row?.text, '-'),
      help: firstNonEmpty(row?.help, row?.meaning, row?.purpose, ''),
    })).filter((row) => row.label);
  }

  function normalizeSelectedDisplayLabel(label) {
    return firstNonEmpty(label, '')
      .replace(/\bStale\s*\/\s*Offline\b/gi, 'GPS güncel değil / çevrim dışı')
      .replace(/\bStale\b/gi, 'GPS güncel değil')
      .replace(/\bOffline\b/gi, 'çevrim dışı')
      .trim();
  }

  function guideFieldRows(screenDefinition) {
    return (Array.isArray(screenDefinition?.fieldGuides) ? screenDefinition.fieldGuides : []).map((row) => ({
      label: firstNonEmpty(row?.label, row?.key, ''),
      meaning: firstNonEmpty(row?.meaning, row?.help, ''),
      howToRead: firstNonEmpty(row?.howToRead, ''),
      risk: firstNonEmpty(row?.risk, ''),
      actionHint: firstNonEmpty(row?.actionHint, ''),
    })).filter((row) => row.label);
  }

  function guideBadgeRows(screenDefinition) {
    return (Array.isArray(screenDefinition?.badgeGuides) ? screenDefinition.badgeGuides : []).map((row) => ({
      label: firstNonEmpty(row?.label, row?.key, ''),
      meaning: firstNonEmpty(row?.meaning, row?.help, ''),
      howToRead: firstNonEmpty(row?.howToRead, ''),
      risk: firstNonEmpty(row?.risk, ''),
      actionHint: firstNonEmpty(row?.actionHint, ''),
    })).filter((row) => row.label);
  }

  function findGuideRowByMessage(message, rows) {
    const items = Array.isArray(rows) ? rows : [];
    if (!items.length) return null;
    const text = normalizeText(message);
    if (!text) return items[0] || null;
    const best = items
      .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.meaning || ''} ${row?.howToRead || ''} ${row?.risk || ''} ${row?.actionHint || ''}`) }))
      .sort((a, b) => b.score - a.score)[0] || null;
    return best && best.score > 0 ? best.row : null;
  }

  function findGuideByLabel(label, rows) {
    const items = Array.isArray(rows) ? rows : [];
    const target = normalizeText(label);
    if (!target) return null;
    return items
      .map((row) => ({ row, score: tokenOverlapScore(target, `${row?.label || ''} ${row?.meaning || ''} ${row?.howToRead || ''}`) }))
      .sort((a, b) => b.score - a.score)[0]?.row || null;
  }

  function mergeFieldWithGuide(row, screenDefinition) {
    const guide = findGuideByLabel(row?.label, guideFieldRows(screenDefinition));
    if (!guide) return { ...row, meaning: '', howToRead: '', risk: '', actionHint: '' };
    return {
      ...row,
      meaning: guide.meaning || '',
      howToRead: guide.howToRead || '',
      risk: guide.risk || '',
      actionHint: guide.actionHint || '',
      help: firstNonEmpty(row?.help, guide.meaning, guide.howToRead, guide.actionHint, ''),
    };
  }

  function mergeBadgeWithGuide(row, screenDefinition) {
    const guide = findGuideByLabel(row?.label, guideBadgeRows(screenDefinition));
    if (!guide) return { ...row, meaning: '', howToRead: '', risk: '', actionHint: '' };
    return {
      ...row,
      meaning: guide.meaning || '',
      howToRead: guide.howToRead || '',
      risk: guide.risk || '',
      actionHint: guide.actionHint || '',
      help: firstNonEmpty(row?.help, guide.meaning, guide.actionHint, ''),
    };
  }

  function isBlankishValue(value) {
    const text = normalizeText(value);
    return !text || ['-', 'yok', 'boş', 'bos', 'null', 'undefined', 'n/a', 'na', 'henüz puan yok'].includes(text);
  }

  function findSelectedRowByMessage(message, rows) {
    const items = Array.isArray(rows) ? rows : [];
    if (!items.length) return null;
    const text = normalizeText(message);
    if (!text) return items[0] || null;
    const best = items
      .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.value || ''} ${row?.help || ''}`) }))
      .sort((a, b) => b.score - a.score)[0] || null;
    return best && best.score > 0 ? best.row : null;
  }

  function selectedRowReadReply(screenContext, screenDefinition) {
    const fields = selectedFieldRows(screenContext).map((row) => mergeFieldWithGuide(row, screenDefinition));
    const badges = selectedBadgeRows(screenContext).map((row) => mergeBadgeWithGuide(row, screenDefinition));
    const label = firstNonEmpty(screenContext?.selectedLabel, 'Seçili kayıt');
    if (!label || (!fields.length && !badges.length)) return '';
    const fieldText = fields.slice(0, 6).map((row) => (
      (() => {
        const displayLabel = normalizeSelectedDisplayLabel(row.label);
        return /^Eksik bilgi$/i.test(displayLabel) && /^0$/.test(String(row.value || '').trim())
          ? `${displayLabel} ${row.value} görünüyor`
          : `${displayLabel}: ${row.value}`;
      })()
    )).join(' • ');
    const badgeText = badges.slice(0, 4).map((row) => `${row.label}: ${row.value}`).join(' • ');
    const missing = fields.filter((row) => isBlankishValue(row.value)).map((row) => row.label).slice(0, 4);
    const rowHint = firstNonEmpty(screenDefinition?.rowReadHint, '');
    const riskHints = fields.filter((row) => isBlankishValue(row.value) && row.risk).slice(0, 2).map((row) => `${row.label}: ${row.risk}`);
    return [
      `${label} satırını şöyle oku:`,
      rowHint ? `İpucu: ${rowHint}` : '',
      fieldText ? `Alanlar: ${fieldText}.` : '',
      badgeText ? `Rozetler: ${badgeText}.` : '',
      missing.length ? `Eksik veya boş görünen alanlar: ${missing.join(', ')}.` : '',
      riskHints.length ? `Dikkat: ${riskHints.join(' • ')}.` : '',
    ].filter(Boolean).join(' ');
  }

  function selectedFieldReply(message, screenContext, screenDefinition) {
    const genericAsk = ['bu sütun ne demek', 'bu sutun ne demek', 'bu kolon ne demek', 'bu alan ne demek'].some((x) => normalizeText(message).includes(normalizeText(x)));
    const ownershipAsk = ['kim yapabilir', 'kim onaylayacak', 'sorumlu kim', 'bu kayıt kimde', 'kimde'].some((x) => normalizeText(message).includes(normalizeText(x)));
    const ownershipRows = selectedFieldRows(screenContext).filter((row) => /sorumlu|yetki|owner|sahip|atanan|atayan|rol|onay/i.test(normalizeText([row?.label, row?.meaning, row?.help, row?.risk].filter(Boolean).join(' '))));
    const selectedRow = findSelectedRowByMessage(message, selectedFieldRows(screenContext))
      || (ownershipAsk ? ownershipRows[0] || null : null)
      || (genericAsk ? selectedFieldRows(screenContext)[0] || null : null);
    const selected = selectedRow ? mergeFieldWithGuide(selectedRow, screenDefinition) : null;
    const guideOwnershipRows = guideFieldRows(screenDefinition).filter((row) => /sorumlu|yetki|owner|sahip|atanan|atayan|rol|onay/i.test(normalizeText([row?.label, row?.meaning, row?.help, row?.risk].filter(Boolean).join(' '))));
    const guide = findGuideRowByMessage(message, guideFieldRows(screenDefinition))
      || (ownershipAsk ? guideOwnershipRows[0] || null : null)
      || (genericAsk ? guideFieldRows(screenDefinition)[0] || null : null);
    const row = selected || guide;
    if (!row) return '';
    const facts = structuredFacts(screenContext);
    const parts = [];
    if (facts?.counters && typeof facts.counters === 'object') {
      const counterText = Object.entries(facts.counters).filter(([, value]) => value != null && value !== '' && value !== false).slice(0, 5).map(([key, value]) => `${key}: ${value}`).join(' • ');
      if (counterText) parts.push(`Panel verisi: ${counterText}`);
    }
    parts.push(`${normalizeSelectedDisplayLabel(row.label)}: ${firstNonEmpty(row.value, row.meaning, '-')}.`);
    const meaning = firstNonEmpty(row.help, row.meaning, 'Bu alan seçili kaydın aynı başlıktaki gerçek tablo bilgisidir.');
    if (meaning) parts.push(meaning);
    if (row.howToRead) parts.push(`Nasıl okunur: ${row.howToRead}`);
    if (row.risk) parts.push(`Dikkat: ${row.risk}`);
    if (row.actionHint) parts.push(`Ne yap: ${row.actionHint}`);
    return parts.join(' ').trim();
  }

  function selectedBadgeReply(message, screenContext, screenDefinition) {
    const genericAsk = ['bu rozet ne demek', 'bu badge ne demek', 'durum rozeti ne demek', 'bu etiket ne demek'].some((x) => normalizeText(message).includes(normalizeText(x)));
    const selectedRow = findSelectedRowByMessage(message, selectedBadgeRows(screenContext)) || (genericAsk ? selectedBadgeRows(screenContext)[0] || null : null);
    const selected = selectedRow ? mergeBadgeWithGuide(selectedRow, screenDefinition) : null;
    const guide = findGuideRowByMessage(message, guideBadgeRows(screenDefinition)) || (genericAsk ? guideBadgeRows(screenDefinition)[0] || null : null);
    const row = selected || guide;
    if (!row) return '';
    const facts = structuredFacts(screenContext);
    const parts = [];
    if (facts?.counters && typeof facts.counters === 'object') {
      const counterText = Object.entries(facts.counters).filter(([, value]) => value != null && value !== '' && value !== false).slice(0, 5).map(([key, value]) => `${key}: ${value}`).join(' • ');
      if (counterText) parts.push(`Panel verisi: ${counterText}`);
    }
    parts.push(`${normalizeSelectedDisplayLabel(row.label)}: ${firstNonEmpty(row.value, row.meaning, '-')}.`);
    const meaning = firstNonEmpty(row.help, row.meaning, 'Bu rozet seçili kaydın mevcut durumunu veya aşamasını kısa gösterir.');
    if (meaning) parts.push(meaning);
    if (row.howToRead) parts.push(`Nasıl okunur: ${row.howToRead}`);
    if (row.actionHint) parts.push(`Ne yap: ${row.actionHint}`);
    if (row.risk) parts.push(`Dikkat: ${row.risk}`);
    return parts.join(' ').trim();
  }

  function selectedMissingReply(screenContext, screenDefinition) {
    const facts = structuredFacts(screenContext);
    const notes = [];
    const factMissing = Array.isArray(facts?.missing) ? facts.missing.filter(Boolean) : [];
    const factBlockers = Array.isArray(facts?.blockers) ? facts.blockers.filter(Boolean) : [];
    const blocked = structuredActionRows(screenContext, 'blockedActions');
    if (factMissing.length) notes.push(`Eksik görünen alanlar: ${factMissing.join(', ')}.`);
    if (factBlockers.length) notes.push(`Ana blokaj: ${factBlockers.slice(0, 3).join(' • ')}.`);
    if (blocked.length) notes.push(`Kapalı aksiyon ipucu: ${blocked.slice(0, 2).map((row) => `${row.label}${row.reason ? ` (${row.reason})` : ''}`).join(' • ')}.`);
    if (!notes.length) {
      const fields = selectedFieldRows(screenContext).map((row) => mergeFieldWithGuide(row, screenDefinition));
      if (!fields.length) return '';
      const missing = fields.filter((row) => isBlankishValue(row.value));
      const badgeRows = selectedBadgeRows(screenContext).map((row) => mergeBadgeWithGuide(row, screenDefinition));
      const approvedLike = badgeRows.some((row) => ['APPROVED', 'ACCEPTED', 'ACTIVE'].includes(normalizeText(row.value).toUpperCase()));
      if (missing.length) notes.push(`Eksik veya boş alanlar: ${missing.map((row) => row.label).join(', ')}.`);
      const riskNotes = missing.map((row) => firstNonEmpty(row.risk, row.actionHint, '')).filter(Boolean).slice(0, 3);
      if (riskNotes.length) notes.push(`Dikkat: ${riskNotes.join(' • ')}.`);
      if (approvedLike && missing.some((row) => ['araç', 'sürücü', 'surucu'].includes(normalizeText(row.label)))) {
        notes.push('Durum onaylı görünse bile araç veya sürücü boşsa bu kayıt saha için tam hazır sayılmaz.');
      }
    }
    const rules = dataRules(screenDefinition, null, 2);
    if (rules.length) notes.push(`İlgili kural: ${rules[0]}`);
    return notes.join(' ').trim();
  }

  function selectedTermReply(message, screenContext, screenDefinition) {
    return selectedFieldReply(message, screenContext, screenDefinition) || selectedBadgeReply(message, screenContext, screenDefinition) || '';
  }

  function selectedSignalRows(screenContext) {
    const facts = structuredFacts(screenContext);
    const rows = [];
    const directFields = selectedFieldRows(screenContext);
    if (directFields.length) {
      rows.push(...directFields.slice(0, 6).map((row) => ({
        label: firstNonEmpty(row?.label, row?.key, 'Alan'),
        value: firstNonEmpty(row?.value, row?.text, '-'),
        note: firstNonEmpty(row?.help, row?.meaning, row?.purpose, ''),
      })));
    }
    const directBadges = selectedBadgeRows(screenContext);
    if (directBadges.length) {
      rows.push(...directBadges.slice(0, 4).map((row) => ({
        label: firstNonEmpty(row?.label, row?.key, 'Rozet'),
        value: firstNonEmpty(row?.value, row?.text, '-'),
        note: firstNonEmpty(row?.help, row?.meaning, row?.purpose, ''),
      })));
    }
    const selectedRecordStatus = firstNonEmpty(facts?.selectedRecordStatus, '');
    if (selectedRecordStatus) {
      rows.push({
        label: 'Seçili kayıt durumu',
        value: selectedRecordStatus,
        note: 'Seçili satırın ana durumu.',
      });
    }
    const liveFactConfidence = facts?.liveFactConfidence && typeof facts.liveFactConfidence === 'object' ? facts.liveFactConfidence : null;
    if (liveFactConfidence?.summary) {
      rows.push({
        label: 'Ekrandaki sinyal',
        value: liveFactConfidence.summary,
        note: 'Canlı veri değil; ekrandaki özet.',
      });
    }
    if (Array.isArray(liveFactConfidence?.rows)) {
      rows.push(...liveFactConfidence.rows);
    }
    const diagnosticPriority = facts?.diagnosticPriority && typeof facts.diagnosticPriority === 'object' ? facts.diagnosticPriority : null;
    if (diagnosticPriority?.summary) {
      rows.push({
        label: 'Diagnostic öncelik',
        value: diagnosticPriority.summary,
        note: 'Olası neden sırası.',
      });
    }
    if (Array.isArray(diagnosticPriority?.rows)) {
      rows.push(...diagnosticPriority.rows);
    }
    const actionSimulation = firstNonEmpty(
      facts?.actionSimulation?.value,
      facts?.actionSimulation?.summary,
      facts?.actionSimulation,
      '',
    );
    if (actionSimulation) {
      const visibleActionSimulation = String(actionSimulation)
        .replace(/^(?:Önerilen adım|Öneri)\s*:\s*/i, '')
        .replace(/^(?:Önerilen adım|Öneri)\s+/i, '')
        .trim();
      rows.push({
        label: 'Aksiyon simülasyonu',
        value: visibleActionSimulation || String(actionSimulation),
        note: 'Bu sadece rehberliktir; işlem onay olmadan yapılmaz.',
      });
    }
    const signalRows = Array.isArray(facts?.copilotSignals) ? facts.copilotSignals : [];
    rows.push(...signalRows);
    return rows
      .map((row, idx) => ({
        label: firstNonEmpty(row?.label, row?.key, row?.title, `Sinyal ${idx + 1}`),
        value: firstNonEmpty(row?.value, row?.text, row?.status, row?.summary, '-'),
        note: firstNonEmpty(row?.note, row?.help, row?.reason, ''),
      }))
      .filter((row) => row.label);
  }

  function selectedSignalReply(screenContext) {
    const rows = selectedSignalRows(screenContext);
    if (!rows.length) return '';
    const summary = firstNonEmpty(structuredFacts(screenContext)?.copilotSummary, '');
    const top = rows.slice(0, 4).map((row) => `${row.label}: ${row.value}`).join(' • ');
    const notes = rows.filter((row) => row.note).slice(0, 2).map((row) => row.note).join(' • ');
    return [
      summary ? `Sinyal özeti: ${summary}.` : '',
      top ? `Sinyaller: ${top}.` : '',
      notes ? `İlk not: ${notes}.` : '',
    ].filter(Boolean).join(' ');
  }

  return {
    selectedFieldRows,
    selectedBadgeRows,
    selectedRowReadReply,
    selectedFieldReply,
    selectedBadgeReply,
    selectedMissingReply,
    selectedTermReply,
    selectedSignalRows,
    selectedSignalReply,
  };
}
