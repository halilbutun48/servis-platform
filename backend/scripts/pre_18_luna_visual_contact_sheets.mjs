import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const reportPath = path.join(root, "backend/artifacts/browser-smoke/pre-18-final-visual-foundation-discovery/fresh-public-run/final-discovery-report.json");
const output = path.join(root, "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/ia-addendum/contact-sheets");
const safe = (v) => String(v || "surface").replace(/[^a-z0-9_-]+/giu, "-").slice(0, 80);
async function main() {
  const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  const unique = new Map();
  for (const row of report.surfaces) {
    const key = `${row.role}|${row.route}|${row.viewport}`;
    if (!unique.has(key)) unique.set(key, row);
  }
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1680, height: 960 } });
  for (const viewport of ["desktop", "tablet", "mobile"]) {
    const rows = [...unique.values()].filter((x) => x.viewport === viewport);
    for (let batch = 0; batch < rows.length; batch += 20) {
      const slice = rows.slice(batch, batch + 20);
      const tiles = [];
      for (const row of slice) {
        const file = path.join(root, row.screenshot);
        const data = await fs.readFile(file).catch(() => null);
        if (!data) continue;
        tiles.push(`<figure><img src="data:image/png;base64,${data.toString("base64")}"><figcaption>${row.role} · ${row.route} · ${row.state}</figcaption></figure>`);
      }
      await page.setContent(`<style>body{margin:0;background:#111827;color:#f8fafc;font:14px Arial}main{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:12px}figure{margin:0;background:#1f2937;padding:6px;border-radius:8px;overflow:hidden}img{display:block;width:100%;height:205px;object-fit:cover;object-position:top}figcaption{padding:7px 3px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}</style><main>${tiles.join("")}</main>`);
      await page.screenshot({ path: path.join(output, `${viewport}-${String(batch / 20 + 1).padStart(2, "0")}.png`), fullPage: true });
    }
  }
  await browser.close();
  console.log(JSON.stringify({ output, sheets: (await fs.readdir(output)).length }, null, 2));
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
