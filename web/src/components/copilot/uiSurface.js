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

function uniqueByLabel(rows) {
  const seen = new Set();
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const label = String(row?.label || '').trim();
    if (!label) continue;
    const key = normalizeText(label);
    if (seen.has(key)) continue;
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
  const nodes = Array.from(document.querySelectorAll('button,[role="button"],a[href],input[type="button"],input[type="submit"]'));
  const rows = nodes
    .filter((el) => !isExcluded(el, excludeSelector))
    .filter((el) => isVisibleElement(el))
    .map((el) => {
      const label = textOf(el);
      const disabled = Boolean(el.disabled) || String(el.getAttribute?.('aria-disabled') || '').toLowerCase() === 'true';
      return { label, disabled, reason: disabled ? inferDisabledReason(el, label) : '' };
    })
    .filter((row) => row.label && row.label.length <= 80)
    .filter((row) => !/^(yardım|copilot|sohbet|rehber|gelişmiş|sorunu bul|hızlı cevap|adım adım)$/i.test(row.label));
  return uniqueByLabel(rows).slice(0, 18);
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

export function captureCopilotUiSurface({ excludeSelector = '.copilotDrawer,.copilotFab,.copilotPanel,[data-copilot-ignore="true"]' } = {}) {
  if (typeof document === 'undefined') {
    return { visibleButtons: [], disabledButtons: [], tableHeaders: [], modalTitles: [], activeTabs: [], pageTitles: [] };
  }
  const buttons = collectButtons(excludeSelector);
  const modalTitles = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"], .modal, .dialog'))
    .filter((el) => !isExcluded(el, excludeSelector))
    .filter((el) => isVisibleElement(el))
    .map((el) => ({ label: textOf(el.querySelector('h1,h2,h3,.modal-title,.dialog-title,[data-dialog-title]') || el) }));
  return {
    visibleButtons: buttons.filter((row) => !row.disabled).slice(0, 12),
    disabledButtons: buttons.filter((row) => row.disabled).slice(0, 8),
    tableHeaders: collectTextRows('table th', excludeSelector, 12),
    modalTitles: uniqueByLabel(modalTitles).map((row) => row.label).slice(0, 6),
    activeTabs: collectTextRows('[role="tab"][aria-selected="true"], .tab.active, button[aria-current="page"], [data-active="true"]', excludeSelector, 6),
    pageTitles: collectTextRows('main h1, main h2, .page-title, [data-page-title]', excludeSelector, 4),
  };
}
