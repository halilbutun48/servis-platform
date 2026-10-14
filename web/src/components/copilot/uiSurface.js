import { getGuidedTarget } from '../../copilot/guidedTargetState';

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function isVisibleElement(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(el);
  if (!style || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) === 0) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isTopmostActionable(el) {
  if (!el || typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') return false;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  // A real target may be below the fold. It is still a valid semantic target;
  // the overlay will scroll it into view before highlighting. Occlusion checks
  // apply only while the element intersects the viewport.
  if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) return true;
  const points = [
    [rect.left + rect.width / 2, rect.top + rect.height / 2],
    [rect.left + Math.min(12, rect.width / 2), rect.top + Math.min(12, rect.height / 2)],
  ];
  return points.some(([x, y]) => {
    const top = document.elementFromPoint(x, y);
    return Boolean(top && (top === el || el.contains(top)));
  });
}

function isExcluded(el, excludeSelector) {
  if (!el || !excludeSelector) return false;
  try {
    return Boolean(el.closest(excludeSelector));
  } catch {
    return false;
  }
}

function textOf(el) {
  if (!el) return '';
  const value = [
    el.getAttribute?.('data-copilot-label'),
    el.getAttribute?.('aria-label'),
    el.getAttribute?.('title'),
    el.textContent,
    el.value,
  ].find((x) => String(x || '').trim());
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function semanticTypeOf(el) {
  if (el?.getAttribute?.('role') === 'tab') return 'tab';
  if (el?.matches?.('summary')) return 'disclosure';
  return 'button';
}

function uniqueByLabel(rows) {
  const seen = new Set();
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const label = String(row?.label || '').trim();
    if (!label) continue;
    const key = normalizeText(label);
    if (seen.has(key)) {
      const existingIndex = out.findIndex((item) => normalizeText(item?.label) === key);
      if (existingIndex >= 0
        && row?.identitySource === 'CANONICAL'
        && out[existingIndex]?.identitySource !== 'CANONICAL') {
        out[existingIndex] = row;
      }
      continue;
    }
    seen.add(key);
    out.push(row);
  }
  return out;
}

function inferDisabledReason(el, label) {
  const attrReason = [
    el?.getAttribute?.('data-disabled-reason'),
    el?.getAttribute?.('aria-description'),
    el?.getAttribute?.('data-reason'),
    el?.getAttribute?.('title'),
  ].find((x) => String(x || '').trim());
  if (attrReason) return String(attrReason).trim();
  const wrapped = el?.closest?.('[title],[data-disabled-reason],[aria-description]');
  const wrappedReason = [
    wrapped?.getAttribute?.('data-disabled-reason'),
    wrapped?.getAttribute?.('aria-description'),
    wrapped?.getAttribute?.('title'),
  ].find((x) => String(x || '').trim());
  if (wrappedReason) return String(wrappedReason).trim();
  if (/kaydet/i.test(label)) return 'Kaydetmeden önce seçili kayıt veya gerekli alan tamamlanmamış olabilir.';
  if (/onay|approve/i.test(label)) return 'Onay ön koşulları tamamlanmamış olabilir.';
  if (/listeyi aç|marketi aç|bekleyeni aç/i.test(label)) return 'Seçili kayıt uygun aşamada olmayabilir.';
  return 'Bu butonun ön koşulu tamamlanmamış olabilir.';
}

function collectButtons(excludeSelector) {
  const nodes = Array.from(document.querySelectorAll('button,[role="button"],a[href],input[type="button"],input[type="submit"],summary'));
  const rows = nodes
    .filter((el) => !isExcluded(el, excludeSelector))
    .filter((el) => isVisibleElement(el))
    // Canonical targets remain truthful when the assistant drawer covers the
    // underlying surface; the overlay will reposition safely before drawing.
    .filter((el) => isTopmostActionable(el) || Boolean(el.getAttribute?.('data-copilot-target') || el.getAttribute?.('data-copilot-semantic-id')))
    .map((el) => {
      const label = textOf(el);
      const disabled = Boolean(el.disabled) || String(el.getAttribute?.('aria-disabled') || '').toLowerCase() === 'true';
      return {
        label,
        disabled,
        reason: disabled ? inferDisabledReason(el, label) : '',
        semanticType: semanticTypeOf(el),
        targetKey: el.getAttribute?.('data-copilot-target') || el.getAttribute?.('data-copilot-label') || '',
        identitySource: el.getAttribute?.('data-copilot-target') ? 'CANONICAL' : 'LEGACY_LABEL',
      };
    })
    .filter((row) => row.label && row.label.length <= 80)
    .filter((row) => !/^(yardım|copilot|sohbet|rehber|gelişmiş|sorunu bul|hızlı cevap|adım adım)$/i.test(row.label));
  // Keep the compact context summary bounded, but retain current disclosure
  // targets that appear after the shell navigation in the DOM.
  return uniqueByLabel(rows).slice(0, 48);
}

function collectButtonsWithin(root, excludeSelector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  const nodes = Array.from(root.querySelectorAll('button,[role="button"],a[href],input[type="button"],input[type="submit"],summary'));
  const rows = nodes
    .filter((el) => !isExcluded(el, excludeSelector))
    .filter((el) => isVisibleElement(el))
    .filter((el) => isTopmostActionable(el) || Boolean(el.getAttribute?.('data-copilot-target') || el.getAttribute?.('data-copilot-semantic-id')))
    .map((el) => {
      const label = textOf(el);
      const disabled = Boolean(el.disabled) || String(el.getAttribute?.('aria-disabled') || '').toLowerCase() === 'true';
      return {
        label,
        disabled,
        reason: disabled ? inferDisabledReason(el, label) : '',
        semanticType: semanticTypeOf(el),
        targetKey: el.getAttribute?.('data-copilot-target') || el.getAttribute?.('data-copilot-label') || '',
        identitySource: el.getAttribute?.('data-copilot-target') ? 'CANONICAL' : 'LEGACY_LABEL',
      };
    })
    .filter((row) => row.label && row.label.length <= 80)
    .filter((row) => !/^(yardım|copilot|sohbet|rehber|gelişmiş|sorunu bul|hızlı cevap|adım adım)$/i.test(row.label));
  return uniqueByLabel(rows);
}

function collectTextRows(selector, excludeSelector, limit = 8) {
  const nodes = Array.from(document.querySelectorAll(selector));
  return uniqueByLabel(nodes
    .filter((el) => !isExcluded(el, excludeSelector))
    .filter((el) => isVisibleElement(el))
    .map((el) => ({ label: textOf(el) })))
    .map((row) => row.label)
    .slice(0, limit);
}

function semanticTargetKey(el, label, semanticType) {
  return String(
    el?.getAttribute?.('data-copilot-target')
      || el?.getAttribute?.('data-copilot-label')
      || el?.getAttribute?.('id')
      || el?.getAttribute?.('name')
      || el?.getAttribute?.('aria-controls')
      || `${semanticType}:${normalizeText(label)}`,
  ).trim().slice(0, 160);
}

function fieldLabel(el) {
  if (!el) return '';
  const labelledBy = String(el.getAttribute?.('aria-labelledby') || '').trim();
  const fromIds = labelledBy
    ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)).filter(Boolean).map(textOf).find(Boolean)
    : '';
  const wrapped = el.closest?.('label');
  return String(
    el.getAttribute?.('data-copilot-label')
      || el.getAttribute?.('aria-label')
      || fromIds
      || wrapped?.textContent
      || el.getAttribute?.('placeholder')
      || el.getAttribute?.('name')
      || el.getAttribute?.('id')
      || '',
  ).replace(/\s+/g, ' ').trim();
}

function semanticElementRow(el, semanticType, label = textOf(el)) {
  const cleanLabel = String(label || '').replace(/\s+/g, ' ').trim();
  if (!cleanLabel || cleanLabel.length > 120) return null;
  const expanded = el?.hasAttribute?.('aria-expanded')
    ? String(el.getAttribute('aria-expanded')).toLowerCase() === 'true'
    : null;
  const invalid = el?.matches?.('[aria-invalid="true"],.error,.field-error,.validation-error,[data-error]') || false;
  return {
    semanticType,
    label: cleanLabel,
    targetKey: semanticTargetKey(el, cleanLabel, semanticType),
    identitySource: el?.getAttribute?.('data-copilot-target') || el?.getAttribute?.('data-copilot-semantic-id') ? 'CANONICAL' : 'LEGACY_LABEL',
    required: Boolean(el?.required || el?.getAttribute?.('aria-required') === 'true' || el?.matches?.('[data-required="true"]')),
    expanded,
    invalid: Boolean(invalid),
    source: 'LIVE_UI',
  };
}

function uniqueSemanticElements(rows) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).filter(Boolean).filter((row) => {
    const key = `${row.semanticType}|${normalizeText(row.label)}|${normalizeText(row.targetKey)}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 160);
}

function collectSemanticBlocks(excludeSelector) {
  const nodes = Array.from(document.querySelectorAll('[data-copilot-block-key]'))
    .filter((el) => !isExcluded(el, excludeSelector) && isVisibleElement(el));
  const seen = new Set();
  return nodes.map((el) => {
    const blockKey = String(el.getAttribute('data-copilot-block-key') || '').trim();
    const semanticId = String(el.getAttribute('data-copilot-semantic-id') || '').trim();
    const label = String(
      el.getAttribute('data-copilot-label')
      || el.getAttribute('data-section-title')
      || el.getAttribute('data-card-title')
      || el.querySelector?.('h1,h2,h3,h4,[data-section-title],[data-card-title]')?.textContent
      || textOf(el),
    ).replace(/\s+/g, ' ').trim();
    const identity = blockKey || semanticId;
    if (!identity || !label || seen.has(identity)) return null;
    seen.add(identity);
    return {
      semanticId,
      blockKey,
      label,
      order: Number(el.getAttribute('data-copilot-block-order') || 0) || 0,
      controlSemanticIds: String(el.getAttribute('data-copilot-block-controls') || '').split(',').map((value) => value.trim()).filter(Boolean),
      source: 'LIVE_UI',
    };
  }).filter(Boolean).slice(0, 48);
}

function collectAuthorizedMenuTargets() {
  const nav = document.querySelector('#shell-nav-dock[role="navigation"]');
  if (!nav) return [];
  return Array.from(nav.querySelectorAll('button.navItem[data-copilot-target]'))
    .map((el) => ({
      label: textOf(el),
      targetKey: el.getAttribute('data-copilot-target') || '',
      semanticType: 'button',
      identitySource: 'CANONICAL',
      source: 'LIVE_UI_AUTHORIZED_NAVIGATION',
    }))
    .filter((row) => row.label && row.targetKey)
    .slice(0, 48);
}

function collectSemanticElements(excludeSelector) {
  const fields = Array.from(document.querySelectorAll('input:not([type="hidden"]),select,textarea,[contenteditable="true"]'))
    .filter((el) => !isExcluded(el, excludeSelector) && isVisibleElement(el))
    .map((el) => semanticElementRow(el, 'field', fieldLabel(el)));
  const disclosures = Array.from(document.querySelectorAll('summary,[aria-expanded="true"],[aria-expanded="false"]'))
    .filter((el) => !isExcluded(el, excludeSelector) && isVisibleElement(el))
    .map((el) => semanticElementRow(el, el.getAttribute('role') === 'tab' ? 'tab' : 'disclosure'));
  const sections = Array.from(document.querySelectorAll('main section,main article,[role="region"],main [class*="card"],[data-copilot-target],[data-copilot-semantic-id]'))
    .filter((el) => !isExcluded(el, excludeSelector) && isVisibleElement(el))
    .map((el) => semanticElementRow(el, el.matches('article,[class*="card"]') ? 'card' : 'section', textOf(el.querySelector('h1,h2,h3,h4,[data-section-title],[data-card-title]') || el)));
  const validation = Array.from(document.querySelectorAll('[role="alert"],[aria-live="assertive"],[aria-invalid="true"],.error,.field-error,.validation-error,[data-error]'))
    .filter((el) => !isExcluded(el, excludeSelector) && isVisibleElement(el))
    .map((el) => semanticElementRow(el, 'validation', textOf(el)));
  const modalDrawers = Array.from(document.querySelectorAll('[role="dialog"],[aria-modal="true"],.modal,.dialog,.drawer,[data-drawer-title]'))
    .filter((el) => !isExcluded(el, excludeSelector) && isVisibleElement(el))
    .map((el) => semanticElementRow(el, el.matches('.drawer,[data-drawer-title]') ? 'drawer' : 'modal', textOf(el.querySelector('h1,h2,h3,.modal-title,.dialog-title,[data-dialog-title],[data-drawer-title]') || el)));
  return uniqueSemanticElements([
    ...fields,
    ...disclosures,
    ...sections,
    ...validation,
    ...modalDrawers,
  ]);
}

export function captureCopilotUiSurface({ excludeSelector = '.copilotDrawer,.copilotFab,.copilotPanel,[data-copilot-ignore="true"]' } = {}) {
  if (typeof document === 'undefined') {
    return { visibleButtons: [], disabledButtons: [], tableHeaders: [], modalTitles: [], activeTabs: [], pageTitles: [], semanticElements: [], semanticBlocks: [], workflowState: null, currentTarget: null, guidedDraftAvailability: null, foregroundSurface: null };
  }
  const modalRoots = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"], .modal, .dialog'))
    .filter((el) => !isExcluded(el, excludeSelector))
    .filter((el) => isVisibleElement(el))
    ;
  const modalTitles = modalRoots
    .map((el) => ({ label: textOf(el.querySelector('h1,h2,h3,.modal-title,.dialog-title,[data-dialog-title]') || el) }));
  const buttons = uniqueByLabel([
    ...modalRoots.flatMap((root) => collectButtonsWithin(root, excludeSelector)),
    ...collectButtons(excludeSelector),
  ]);
  const workflowNode = document.querySelector('[data-copilot-workflow-id]');
  const workflowState = workflowNode
    ? {
      workflowId: workflowNode.getAttribute('data-copilot-workflow-id') || '',
      activeStepOrdinal: Number(workflowNode.getAttribute('data-copilot-workflow-step') || 0) || null,
      completedThroughOrdinal: Number(workflowNode.getAttribute('data-copilot-workflow-completed-through') || 0) || null,
      currentTargetKey: workflowNode.getAttribute('data-copilot-workflow-target-key') || '',
      currentTargetLabel: workflowNode.getAttribute('data-copilot-workflow-target-label') || '',
      source: 'LIVE_UI',
    }
    : null;
  const guidedDraftNode = document.querySelector('[data-copilot-guided-draft-state]');
  const guidedDraftAvailability = guidedDraftNode
    ? {
      state: guidedDraftNode.getAttribute('data-copilot-guided-draft-state') || 'UNKNOWN',
      count: Number(guidedDraftNode.getAttribute('data-copilot-guided-draft-count') || 0) || 0,
      maxResumeStep: Number(guidedDraftNode.getAttribute('data-copilot-guided-draft-max-resume-step') || 0) || null,
      source: guidedDraftNode.getAttribute('data-copilot-guided-draft-source') || 'SERVER_GUIDED_DRAFTS',
    }
    : null;
  const foregroundSurfaceNode = document.querySelector('[data-copilot-foreground-surface]');
  const foregroundSurface = foregroundSurfaceNode
    ? {
      key: foregroundSurfaceNode.getAttribute('data-copilot-foreground-surface') || '',
      kind: foregroundSurfaceNode.getAttribute('data-copilot-foreground-surface-kind') || '',
      source: 'LIVE_UI',
    }
    : null;
  const visibleMenus = collectAuthorizedMenuTargets();
  const rawCurrentTarget = getGuidedTarget?.();
  const currentTarget = rawCurrentTarget && rawCurrentTarget.status === 'FOUND'
    ? {
      status: 'FOUND',
      targetKind: rawCurrentTarget.targetKind || 'CONTROL',
      targetKey: rawCurrentTarget.targetKey || '',
      semanticId: rawCurrentTarget.semanticId || '',
      blockKey: rawCurrentTarget.blockKey || '',
      label: rawCurrentTarget.label || '',
      semanticType: rawCurrentTarget.semanticType || '',
      screenPath: rawCurrentTarget.screenPath || '',
      role: rawCurrentTarget.role || '',
    }
    : null;
  return {
    visibleButtons: buttons.filter((row) => !row.disabled).slice(0, 48),
    visibleMenus,
    disabledButtons: buttons.filter((row) => row.disabled).slice(0, 8),
    tableHeaders: collectTextRows('table th', excludeSelector, 12),
    modalTitles: uniqueByLabel(modalTitles).map((row) => row.label).slice(0, 6),
    activeTabs: collectTextRows('[role="tab"][aria-selected="true"], .tab.active, button[aria-current="page"], [data-active="true"]', excludeSelector, 6),
    pageTitles: collectTextRows('main h1, main h2, .page-title, [data-page-title]', excludeSelector, 4),
    semanticElements: collectSemanticElements(excludeSelector),
    semanticBlocks: collectSemanticBlocks(excludeSelector),
    workflowState,
    currentTarget,
    guidedDraftAvailability,
    foregroundSurface,
  };
}
