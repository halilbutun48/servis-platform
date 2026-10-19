import { useEffect, useMemo, useState } from "react";

export function getPath() {
  const h = (window.location.hash || "").replace(/^#/, "");
  const routePath = h.split("?", 1)[0];
  return routePath.startsWith("/") ? routePath : routePath ? `/${routePath}` : "/";
}

export function navigate(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  window.location.hash = p;
}

export function useHashRoute() {
  const [path, setPath] = useState(getPath());

  useEffect(() => {
    const onHash = () => setPath(getPath());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return useMemo(() => ({ path }), [path]);
}
