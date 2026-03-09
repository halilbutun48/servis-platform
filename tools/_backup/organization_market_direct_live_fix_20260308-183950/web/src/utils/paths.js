// web/src/utils/paths.js

export function companyBase(me) {
  const kind = String(me?.companyKind || "");
  if (kind === "SCHOOL") return "/school";
  if (kind === "ORGANIZATION") return "/organization";
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

  if (base === "/school") {
    return p
      .replace(/^\/company(?=\/|$)/, "/school")
      .replace(/^\/organization(?=\/|$)/, "/school");
  }

  if (base === "/organization") {
    return p
      .replace(/^\/company(?=\/|$)/, "/organization")
      .replace(/^\/school(?=\/|$)/, "/organization");
  }

  if (base === "/company") {
    return p
      .replace(/^\/school(?=\/|$)/, "/company")
      .replace(/^\/organization(?=\/|$)/, "/company");
  }

  return p;
}