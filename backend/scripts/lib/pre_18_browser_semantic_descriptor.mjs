/*
 * Browser-side raw semantic descriptor projection.
 *
 * This is deliberately a single source shared by current-DOM enumeration and
 * physical locator binding.  Node-side resolver policy remains in the hybrid
 * executor; this function only reports current browser facts.
 */
function projectBrowserSemanticControl(node, context = {}) {
  const compact = (value) => String(value || "").replace(/\s+/gu, " ").trim();
  const textOf = (target) => compact(target?.innerText || target?.textContent || "");
  const labelledBy = (target) => compact(String(target.getAttribute("aria-labelledby") || "").split(/\s+/u).map((id) => document.getElementById?.(id)?.textContent || "").join(" "));
  const labelText = (label) => compact([...label?.childNodes || []].map((child) => {
    if (child.nodeType === Node.TEXT_NODE) return child.textContent || "";
    if (child.nodeType !== Node.ELEMENT_NODE || child.matches("input,select,textarea,button,option,[aria-hidden='true']")) return "";
    return child.textContent || "";
  }).join(" "));
  const controlLabelDetails = (target) => {
    const ariaLabel = compact(target.getAttribute("aria-label") || "");
    const title = compact(target.getAttribute("title") || "");
    const ariaLabelledBy = labelledBy(target);
    const explicit = compact(ariaLabel || title || ariaLabelledBy);
    if (explicit) return { name: explicit, nameSource: ariaLabel ? "aria-label" : title ? "title" : "aria-labelledby", ariaLabel, ariaLabelledBy, labelText: "" };
    const linked = target.id ? document.querySelector(`label[for="${CSS.escape(target.id)}"]`) : null;
    const linkedText = labelText(linked);
    const wrappingText = labelText(target.closest("label"));
    const placeholder = compact(target.getAttribute("placeholder") || "");
    const name = linkedText || wrappingText || placeholder;
    return { name, nameSource: linkedText ? "linked-label" : wrappingText ? "wrapping-label" : placeholder ? "placeholder" : "none", ariaLabel, ariaLabelledBy, labelText: linkedText || wrappingText || "" };
  };
  const collapsibleSectionStructure = (target) => {
    const title = textOf(target.querySelector(".collapsibleSectionTitle"));
    const subtitle = textOf(target.querySelector(".collapsibleSectionSubtitle"));
    const badge = textOf(target.querySelector(".collapsibleSectionBadge"));
    return title || subtitle ? { title, subtitle, badge } : null;
  };
  const visibleButtonText = (target, structure = collapsibleSectionStructure(target)) => {
    const semanticParts = [structure?.title, structure?.subtitle].filter(Boolean);
    return compact(semanticParts.join(" ") || textOf(target));
  };
  // A selected tab is a target-scoped semantic surface fact. Never recover it
  // from the merged descendant textContent: PanelSegmentTabs renders dynamic
  // badges as separate presentation children. Prefer its accessibility label
  // or explicit label node, then direct/non-presentation label children.
  const tabSemanticLabel = (tab) => {
    if (!tab) return "";
    const ariaLabel = compact(tab.getAttribute("aria-label") || "");
    const ariaLabelledBy = labelledBy(tab);
    const explicitLabel = compact(tab.querySelector(".panelSegmentTabLabel")?.innerText || tab.querySelector(".panelSegmentTabLabel")?.textContent || "");
    if (ariaLabel || ariaLabelledBy || explicitLabel) return ariaLabel || ariaLabelledBy || explicitLabel;
    const directText = compact([...tab.childNodes || []]
      .filter((child) => child.nodeType === Node.TEXT_NODE)
      .map((child) => child.textContent || "").join(" "));
    if (directText) return directText;
    return compact([...tab.children || []]
      .filter((child) => child.getAttribute?.("aria-hidden") !== "true" && !child.matches?.(".panelSegmentTabBadge"))
      .map((child) => textOf(child)).join(" "));
  };
  const roleOf = (target) => {
    const explicit = compact(target.getAttribute("role")); if (explicit) return explicit;
    const tag = target.tagName.toLowerCase(); const type = String(target.getAttribute("type") || "").toLowerCase();
    if (tag === "a") return "link"; if (tag === "button" || tag === "summary") return "button"; if (tag === "select") return "combobox"; if (tag === "textarea") return "textbox";
    if (tag === "input") return context.implicitInputRoles?.[type] || context.implicitInputRoles?.default || "";
    return "";
  };
  const visible = (target) => {
    const style = getComputedStyle(target); const box = target.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && box.width > 0 && box.height > 0;
  };
  const nameOf = (target) => {
    const tag = target.tagName.toLowerCase();
    if (["input", "select", "textarea"].includes(tag)) return controlLabelDetails(target).name;
    return compact(target.getAttribute("aria-label") || target.getAttribute("title") || visibleButtonText(target) || target.querySelector("svg title")?.textContent || "");
  };
  const role = roleOf(node);
  const collapsible = collapsibleSectionStructure(node);
  const controlLabelMetadata = controlLabelDetails(node);
  const name = nameOf(node);
  const type = compact(node.getAttribute("type") || node.tagName.toLowerCase());
  const href = compact(node.getAttribute("href"));
  const ownerCandidates = window.__pre18CollectOwnerCandidates ? window.__pre18CollectOwnerCandidates(node, name, context.selector, { route: context.route, businessTarget: context.businessTarget || null }) : [];
  const localNavigation = Boolean(node.closest(".navItem,.navToggle,.navDockItems,.navAdvanced"));
  const explicitLogout = /^çıkış$/iu.test(name);
  const unsafe = Boolean((explicitLogout || !localNavigation) && node.disabled === false && (/(^|\s)(sil|silme|delete|öde|ödeme|tahsil|kabul et|onayla|gönder|kaydet|oluştur|ekle|davet|çalıştır|başlat|tamamla|devre dışı|aktif et|pasif et|şifre|pin değiştir|yayınla|iptal et|reddet|ata|güncelle|çıkış)(\s|$)/iu.test(name) || node.matches("button[type='submit'],input[type='submit']")));
  const inDialog = Boolean(node.closest("[role='dialog'],.modal"));
  const inDrawer = Boolean(node.closest("[data-drawer],.copilotDrawer"));
  const activeTab = [...document.querySelectorAll("[role='tab'][aria-selected='true']")].find((tab) => visible(tab));
  const activeTabSemanticLabel = tabSemanticLabel(activeTab);
  const systemToggle = node.closest(".navAdvanced")?.querySelector(":scope > .navToggle");
  const systemNavigationDisclosure = systemToggle ? (/▾/u.test(textOf(systemToggle)) ? "SİSTEM_OPEN" : "SİSTEM_CLOSED") : "";
  return {
    action: { role: role || "button", name: name || null, userMeaning: name || null, expectedEffectClass: role === "tab" ? "ACTIVE_TAB_CHANGE" : role === "link" ? "ROUTE_OR_ANCHOR_TRANSITION" : type === "checkbox" || type === "radio" ? "CONTROL_STATE_CHANGE" : node.tagName === "SUMMARY" ? "DISCLOSURE_CHANGE" : inDialog ? "MODAL_OR_DIALOG_TRANSITION" : inDrawer ? "DRAWER_TRANSITION" : "RENDERED_TRANSITION", safetyClass: unsafe ? "UNSAFE" : "SAFE" },
    control: { accessibleName: name || null, visibleText: textOf(node), href, type, unsafe, tag: node.tagName, dataTestId: compact(node.getAttribute("data-testid") || "") || null, ariaLabel: controlLabelMetadata.ariaLabel || null, ariaLabelledBy: controlLabelMetadata.ariaLabelledBy || null, labelText: controlLabelMetadata.labelText || null, nameSource: ["input", "select", "textarea"].includes(node.tagName.toLowerCase()) ? controlLabelMetadata.nameSource : "visible-or-aria", descriptorOrdinal: context.descriptorOrdinal ?? null, collapsibleSectionStructure: collapsible },
    ownerCandidates,
    businessContext: compact(ownerCandidates.find((candidate) => candidate?.businessContext)?.businessContext || ""),
    overlayScope: inDialog ? "MODAL" : inDrawer ? "DRAWER" : "NONE",
    materialState: { activeTab: activeTabSemanticLabel, disclosure: compact(node.getAttribute("aria-expanded") || ""), detailsOpen: Boolean(node.closest("details")?.open), modalOpen: Boolean(node.closest("[role='dialog'],.modal")), modalTitle: compact(node.closest("[role='dialog'],.modal")?.querySelector("h1,h2,h3,h4,h5,h6,[role='heading']")?.textContent), drawerOpen: Boolean(node.closest("[data-drawer],.copilotDrawer")), drawerTitle: compact(node.closest("[data-drawer],.copilotDrawer")?.querySelector("h1,h2,h3,h4,h5,h6,[role='heading']")?.textContent), systemNavigationDisclosure, filterSignature: compact([...document.querySelectorAll("input,select,textarea")].map((item) => `${item.name || item.placeholder || item.id}:${item.value || item.checked || ""}`).join("|")) },
    visible: visible(node),
    enabled: !(node.disabled || node.getAttribute("aria-disabled") === "true"),
  };
}

export const browserSemanticDescriptorSource = `(${projectBrowserSemanticControl.toString()})`;
