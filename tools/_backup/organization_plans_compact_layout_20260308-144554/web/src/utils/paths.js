// web/src/utils/paths.js

export function companyBase(me) {
  if (me?.companyKind === "SCHOOL") return "/school";
  if (me?.companyKind === "ORGANIZATION") return "/organization";
  return "/company";
}

export function companyPath(me, tail = "") {
  const base = companyBase(me);
  if (!tail) return base;
  if (tail === "/") return base;
  if (tail.startsWith("/")) return base + tail;
  return base + "/" + tail;
}

export function normalizeCompanyPath(me, path) {
  const p = String(path || "");
  const base = companyBase(me);
  if (base === "/school" && p.startsWith("/company")) return p.replace(/^\/company/, "/school");
  if (base === "/company" && p.startsWith("/school")) return p.replace(/^\/school/, "/company");
  return p;
}
