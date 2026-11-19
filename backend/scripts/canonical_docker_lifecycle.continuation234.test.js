import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const composePath = path.join(root, "infra/docker-compose.clean-demo.yml");
const deployPath = path.join(root, "tools/deploy_clean_demo.ps1");

test("clean-demo API ve frontend kararlı Compose sahipliğine sahip", () => {
  const compose = fs.readFileSync(composePath, "utf8");
  assert.match(compose, /api:\s*[\s\S]*container_name:\s*seferpakt-api/);
  assert.match(compose, /frontend:\s*[\s\S]*container_name:\s*seferpakt-frontend/);
  assert.match(compose, /api:\s*[\s\S]*restart:\s*unless-stopped/);
  assert.match(compose, /frontend:\s*[\s\S]*restart:\s*unless-stopped/);
  assert.match(compose, /com\.seferpakt\.lifecycle:\s*canonical-compose-v1/);
});

test("canonical deployment yalnız API/frontend'i no-deps ile günceller ve yıkıcı komut içermez", () => {
  assert.ok(fs.existsSync(deployPath), "canonical deployment script must exist");
  const deploy = fs.readFileSync(deployPath, "utf8");
  assert.match(deploy, /-p\s+seferpakt/);
  assert.match(deploy, /docker-compose\.clean-demo\.yml/);
  assert.match(deploy, /--no-deps/);
  assert.match(deploy, /\bapi\b/);
  assert.match(deploy, /\bfrontend\b/);
  assert.match(deploy, /dbOk/);
  assert.match(deploy, /localPublicAssetParity|public.*asset|asset.*public/i);
  assert.doesNotMatch(deploy, /docker\s+system\s+prune|volume\s+prune|compose\s+down|--remove-orphans/i);
});
