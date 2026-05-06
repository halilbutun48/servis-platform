import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL ${message}`);
  console.log(`OK ${message}`);
}

function main() {
  console.log("=== M98-E4B PERSONEL INVITE ROUTER MOUNT CHECK ===");

  const routeMounts = read("backend/src/bootstrap/routeMounts.js");
  const personelAccess = read("backend/src/routes/personelAccess.js");
  const server = read("backend/src/server.js");

  assert(personelAccess.includes("export function personelAccessRouter()"), "personelAccess exports personelAccessRouter");
  assert(personelAccess.includes("export function publicPersonelInviteRouter()"), "personelAccess exports publicPersonelInviteRouter");
  assert(personelAccess.includes('r.get("/info"'), "personel invite public info marker exists");
  assert(personelAccess.includes('r.post("/accept"'), "personel invite public accept marker exists");

  assert(routeMounts.includes("function resolveRouterMount(routeExport)"), "routeMounts defines router mount resolver");
  assert(routeMounts.includes("resolveRouterMount(publicPersonelInviteRouter)"), "routeMounts mounts public personel invite through resolver");
  assert(routeMounts.includes("resolveRouterMount(publicPassengerLiveRouter)"), "routeMounts mounts public passenger live through resolver");
  assert(routeMounts.includes('"/api/auth/personel-invite"'), "routeMounts keeps public personel invite mount marker");
  assert(routeMounts.includes('"/api/company/personel-invites"'), "routeMounts keeps company personel invites mount marker");

  assert(server.includes('pickExport(personelAccessMod, "personelAccessRouter")'), "server resolves personelAccessRouter export");
  assert(server.includes('pickExport(personelAccessMod, "publicPersonelInviteRouter")'), "server resolves publicPersonelInviteRouter export");
  assert(server.includes("assertRouteFactories({"), "server validates route factories");

  console.log("=== M98-E4B PERSONEL INVITE ROUTER MOUNT CHECK PASS ===");
}

main();
