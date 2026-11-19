function isEditableTarget(target) {
  if (!target) return false;
  if (target.isContentEditable === true) return true;

  const tagName = String(target.tagName || "").toUpperCase();
  if (["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) return true;

  return typeof target.getAttribute === "function" && target.getAttribute("role") === "textbox";
}

export function shouldIgnoreGlobalEnterShortcut(event) {
  if (!event || event.key !== "Enter" || event.defaultPrevented) return true;
  return isEditableTarget(event.target);
}
