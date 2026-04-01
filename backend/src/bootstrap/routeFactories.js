// backend/src/bootstrap/routeFactories.js

/**
 * mod export'lari 3 tip olabilir:
 * 1) export function xxxRouter(io){...}  => factory
 * 2) export default function (io){...}  => factory
 * 3) export default router               => Router objesi
 *
 * Server tarafinda her zaman xxxRouter(...) cagrisi yapmak istiyoruz.
 * Bu yuzden Router objesi gelirse factory wrapper'a sarilir.
 */
export function pickExport(mod, preferredName) {
  const picked = mod?.[preferredName] ?? mod?.default;
  if (!picked) return null;
  if (typeof picked === "function") return picked;
  return (..._args) => picked;
}

export function assertRouteFactories(routeFactories) {
  for (const [name, fn] of Object.entries(routeFactories)) {
    if (!fn) throw new Error(`Route export missing: ${name} (check named/default export)`);
  }
  return routeFactories;
}
