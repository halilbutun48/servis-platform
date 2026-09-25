// Browser-side candidate collection only.  Node-side ranking remains in
// pre_18_hybrid_surface_state_executor.mjs so browser capture and replay share
// the same durable contextual-owner policy.
function collectBrowserOwnerCandidates(node, actionName, selector, context = {}) {
  const compact = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const textOf = (target) => compact(target?.innerText || target?.textContent || "");
  const directLabelText = (target) => compact([...target?.childNodes || []].map((child) => {
    if (child.nodeType === Node.TEXT_NODE) return child.textContent || "";
    if (child.nodeType !== Node.ELEMENT_NODE || child.matches("input,select,textarea,button,option,[aria-hidden='true']")) return "";
    return child.textContent || "";
  }).join(" "));
  const labelledByText = (target) => compact(String(target?.getAttribute("aria-labelledby") || "").split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" "));
  const directHeading = (target) => textOf(target?.querySelector(":scope > h1,:scope > h2,:scope > h3,:scope > h4,:scope > h5,:scope > h6,:scope > legend,:scope > caption,:scope > summary,:scope > .panelSectionTitle,:scope > [role='heading']"));
  const semanticLabel = (target) => compact(target?.getAttribute("aria-label") || labelledByText(target) || directHeading(target) || (target?.matches("label") ? directLabelText(target) : ""));
  const roleCount = (target) => target ? target.querySelectorAll(selector).length : 0;
  const navigationCount = (target) => target ? target.querySelectorAll(".navItem,[role='menuitem'],nav a[href],[role='navigation'] a[href]").length : 0;
  const businessTargetFor = (target) => {
    if (!target) return null;
    const isInlineGridRow = (candidate) => Boolean(candidate
      && candidate.style?.display === "grid"
      && candidate.children.length >= 4
      && candidate.querySelector("button,a[href],[role='button']"));
    let row = target.closest("tr,[role='row'],.tableRow,.dataRow,.pre18-responsive-list-row");
    if (!row) {
      let current = target.closest("div");
      while (current && !isInlineGridRow(current)) current = current.parentElement;
      row = current;
    }
    if (!row || row.style?.display !== "grid") return null;
    const firstCell = compact(row.children?.[0]?.textContent || "");
    const id = firstCell.match(/^\s*(\d+)\b/u)?.[1] || null;
    if (!id) return null;
    const route = compact(context.route || "");
    return { type: /\/superadmin\/companies/iu.test(route) ? "COMPANY" : "ROW", id };
  };
  const typeOf = (target) => {
    if (!target) return "surface";
    if (target.matches("[role='dialog'],.modal")) return "modal";
    if (target.matches("[data-drawer]")) return "drawer";
    if (target.matches("tr,[role='row'],.tableRow,.dataRow")) return "table-row";
    // Some product tables use an inline CSS-grid row without a table-row
    // class.  A multi-column grid with a local action descendant is a bounded
    // structural row context, not an application-wide layout container.
    if (target.style?.display === "grid" && target.children.length >= 4 && target.querySelector("button,a[href],[role='button']")) return "table-row";
    if (target.matches("label")) return "field";
    if (target.matches("form,fieldset")) return "form";
    if (target.matches(".card,[data-card]")) return "card";
    if (target.matches("nav,[role='navigation']")) return "landmark";
    if (target.matches("article,section,.navSection")) return target.matches(".navSection") ? "navigation" : "section";
    if (semanticLabel(target)) return "section";
    return "surface";
  };
  const candidates = [];
  const navDock = node.closest("#shell-nav-dock,[role='navigation'],nav");
  const navAction = node.closest(".navItem,.navToggle,[role='menuitem']");
  if (navDock && navAction) {
    const group = navAction.closest(".navSection");
    const title = textOf(group?.querySelector(":scope > .navSectionTitle"));
    const groupLabel = title || (navAction.closest(".navAdvanced") ? "SİSTEM" : "Ana menü");
    const itemLabel = compact(actionName || navAction.getAttribute("aria-label") || navAction.getAttribute("title") || textOf(navAction));
    candidates.push({ type: "navigation", semanticLabel: compact(`${groupLabel} › ${itemLabel}`), localNavigation: true, interactiveDescendantCount: 1, navigationDescendantCount: 1, textLength: itemLabel.length, depth: 0 });
  }
  let ancestor = node.parentElement;
  let depth = 1;
  while (ancestor && depth <= 12) {
    const type = typeOf(ancestor);
    const local = semanticLabel(ancestor);
    const rawText = textOf(ancestor);
    const isLocalRow = type === "table-row" || type === "form";
    candidates.push({
      type,
      semanticLabel: local || null,
      localText: !local && isLocalRow ? rawText.slice(0, 220) : null,
      interactiveDescendantCount: roleCount(ancestor),
      navigationDescendantCount: navigationCount(ancestor),
      textLength: rawText.length,
      globalNavigation: ancestor.matches("#shell-nav-dock,[role='navigation'],nav"),
      applicationShell: ancestor.matches("#root,#app,[data-app-shell]"),
      businessTarget: businessTargetFor(ancestor),
      depth,
    });
    ancestor = ancestor.parentElement;
    depth += 1;
  }
  return candidates;
}

export const browserOwnerCandidateCollectorSource = `(${collectBrowserOwnerCandidates.toString()})`;
