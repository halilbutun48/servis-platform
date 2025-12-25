const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "web", "src", "pages", "GpsFollowLayer.jsx");
let s = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");

const re = /\/\/\s*Poll GPS last[^\n]*\n\s*useEffect\(\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[vehicleId,\s*pollMs\]\s*\)\s*;\s*/m;
if (!re.test(s)) {
  console.error("PATCH FAIL: Poll GPS last useEffect block not found in " + p);
  process.exit(1);
}

const replacement = `// Poll GPS last (fallback) - adaptive backoff + pause when tab hidden
  useEffect(() => {
    let alive = true;
    let t = null;

    // backoff starts at pollMs, grows on errors up to 30s
    let delay = pollMs;

    const schedule = (ms) => {
      if (!alive) return;
      if (t) clearTimeout(t);
      t = setTimeout(run, ms);
    };

    const run = async () => {
      if (!alive) return;

      // If tab is hidden, do not hammer the API
      if (typeof document !== "undefined" && document.hidden) {
        schedule(pollMs);
        return;
      }

      const controller = new AbortController();
      const kill = setTimeout(() => controller.abort(), 4000);

      try {
        const r = await fetch(\`/api/gps/last?vehicleId=\${vehicleId}\`, {
          signal: controller.signal,
          cache: "no-store",
        });

        clearTimeout(kill);

        if (!r.ok) throw new Error("HTTP_" + r.status);
        const j = await r.json();
        if (!alive) return;

        if (j && j.ok) setLast(j.last || null);

        // success -> reset delay
        delay = pollMs;
        schedule(pollMs);
      } catch (e) {
        clearTimeout(kill);
        if (!alive) return;

        // failure -> exponential backoff (max 30s)
        delay = Math.min(Math.max(pollMs, delay * 2), 30000);
        schedule(delay);
      }
    };

    const onVis = () => {
      if (!alive) return;
      if (typeof document !== "undefined" && !document.hidden) schedule(0);
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
    }

    schedule(0);

    return () => {
      alive = false;
      if (t) clearTimeout(t);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
    };
  }, [vehicleId, pollMs]);

`;

s = s.replace(re, replacement);
fs.writeFileSync(p, s, "utf8");
console.log("OK: gps poll throttle patched:", p);
