import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const { PNG } = require(path.join(repoRoot, "web", "node_modules", "pngjs"));
const sourcePath = process.env.SPRITE_PATH || "C:/Users/halil/OneDrive/Desktop/proje/Sefer Abi İfade Sprite Seti.png";
const artifactRoot = path.join(repoRoot, "output", "playwright", "sefer-abi-sprite-blink-spike-06");
const frameRoot = path.join(artifactRoot, "frames");
const cleanFrameRoot = path.join(artifactRoot, "frames-clean");
const compositeFrameRoot = path.join(artifactRoot, "frames-eye-composite");
const videoRoot = path.join(artifactRoot, "video");
const edges = [0, 314, 627, 941, 1254];
const blinkSequence = [
  { row: 1, col: 1, label: "open" },
  { row: 1, col: 2, label: "half-close" },
  { row: 1, col: 3, label: "closed" },
  { row: 1, col: 2, label: "half-open" },
  { row: 1, col: 1, label: "open-return" },
];

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function crop(source, x, y, width, height) {
  const target = new PNG({ width, height });
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const sourceIndex = ((y + row) * source.width + x + col) * 4;
      const targetIndex = (row * width + col) * 4;
      target.data[targetIndex] = source.data[sourceIndex];
      target.data[targetIndex + 1] = source.data[sourceIndex + 1];
      target.data[targetIndex + 2] = source.data[sourceIndex + 2];
      target.data[targetIndex + 3] = source.data[sourceIndex + 3];
    }
  }
  return target;
}

function alphaMetrics(image) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  let fringePixels = 0;
  let opaquePixels = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const index = (y * image.width + x) * 4;
      const red = image.data[index];
      const green = image.data[index + 1];
      const blue = image.data[index + 2];
      const alpha = image.data[index + 3];
      if (alpha > 16) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      if (alpha >= 16 && alpha < 230) {
        if (isColorFringe(red, green, blue, alpha)) fringePixels += 1;
      }
      if (alpha === 255) opaquePixels += 1;
    }
  }
  return {
    bbox: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
    fringePixels,
    opaquePixels,
  };
}

function isColorFringe(red, green, blue, alpha) {
  if (alpha < 16 || alpha >= 253) return false;
  return (red > green * 1.65 && red > blue * 1.35 && red > 90)
    || (blue > red * 1.35 && blue > green * 1.35 && blue > 90);
}

function decontaminateEdge(image) {
  const clean = new PNG({ width: image.width, height: image.height });
  clean.data.set(image.data);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const index = (y * image.width + x) * 4;
      const alpha = image.data[index + 3];
      if (!isColorFringe(image.data[index], image.data[index + 1], image.data[index + 2], alpha)) continue;

      // Strongly translucent color spill is background matting, not character
      // detail. Remove it instead of smearing a guessed replacement into the
      // portrait; only the more opaque edge pixels are color-decontaminated.
      if (alpha < 220) {
        clean.data[index] = 0;
        clean.data[index + 1] = 0;
        clean.data[index + 2] = 0;
        clean.data[index + 3] = 0;
        continue;
      }

      let best = null;
      for (let radius = 1; radius <= 5 && !best; radius += 1) {
        for (let dy = -radius; dy <= radius && !best; dy += 1) {
          for (let dx = -radius; dx <= radius; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= image.width || ny >= image.height) continue;
            const neighborIndex = (ny * image.width + nx) * 4;
            const neighborAlpha = image.data[neighborIndex + 3];
            if (neighborAlpha >= 250 && !isColorFringe(image.data[neighborIndex], image.data[neighborIndex + 1], image.data[neighborIndex + 2], neighborAlpha)) {
              best = neighborIndex;
              break;
            }
          }
        }
      }
      if (best !== null) {
        clean.data[index] = image.data[best];
        clean.data[index + 1] = image.data[best + 1];
        clean.data[index + 2] = image.data[best + 2];
      }
    }
  }
  return clean;
}

function compositeEyeFrame(base, overlay) {
  const result = new PNG({ width: base.width, height: base.height });
  result.data.set(base.data);
  const masks = [
    { cx: 115, cy: 139, rx: 29, ry: 25 },
    { cx: 199, cy: 139, rx: 29, ry: 25 },
  ];
  for (let y = 0; y < base.height; y += 1) {
    for (let x = 0; x < base.width; x += 1) {
      const normalized = masks.reduce((max, mask) => {
        const distance = Math.sqrt(((x - mask.cx) / mask.rx) ** 2 + ((y - mask.cy) / mask.ry) ** 2);
        const feather = Math.max(0, Math.min(1, (1 - distance) / 0.24));
        return Math.max(max, feather);
      }, 0);
      if (normalized <= 0) continue;

      const index = (y * base.width + x) * 4;
      const baseAlpha = base.data[index + 3] / 255;
      const overlayAlpha = (overlay.data[index + 3] / 255) * normalized;
      const outputAlpha = overlayAlpha + baseAlpha * (1 - overlayAlpha);
      if (outputAlpha <= 0) continue;
      result.data[index] = Math.round((overlay.data[index] * overlayAlpha + base.data[index] * baseAlpha * (1 - overlayAlpha)) / outputAlpha);
      result.data[index + 1] = Math.round((overlay.data[index + 1] * overlayAlpha + base.data[index + 1] * baseAlpha * (1 - overlayAlpha)) / outputAlpha);
      result.data[index + 2] = Math.round((overlay.data[index + 2] * overlayAlpha + base.data[index + 2] * baseAlpha * (1 - overlayAlpha)) / outputAlpha);
      result.data[index + 3] = Math.round(outputAlpha * 255);
    }
  }
  return result;
}

function relative(file) {
  return path.relative(repoRoot, file).replace(/\\/g, "/");
}

async function writeFrame(source, row, col) {
  const x = edges[col - 1];
  const y = edges[row - 1];
  const width = edges[col] - x;
  const height = edges[row] - y;
  const image = crop(source, x, y, width, height);
  const cleanImage = decontaminateEdge(image);
  const file = path.join(frameRoot, `frame-r${row}-c${col}.png`);
  const cleanFile = path.join(cleanFrameRoot, `frame-r${row}-c${col}.png`);
  await fs.writeFile(file, PNG.sync.write(image));
  await fs.writeFile(cleanFile, PNG.sync.write(cleanImage));
  return {
    row,
    col,
    file: relative(file),
    cleanFile: relative(cleanFile),
    width,
    height,
    ...alphaMetrics(image),
    cleanMetrics: alphaMetrics(cleanImage),
  };
}

async function createPreview(sourceBuffer, suffix) {
  await fs.mkdir(videoRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: videoRoot, size: { width: 1440, height: 900 } },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const spriteBase64 = sourceBuffer.toString("base64");
  await page.setContent(`<!doctype html>
    <html lang="tr"><head><meta charset="utf-8"><style>
      :root { color-scheme: dark; font-family: Segoe UI, sans-serif; }
      body { margin:0; min-height:100vh; display:grid; place-items:center; background:#08152b; color:#e5eefc; }
      main { display:flex; gap:48px; align-items:center; padding:42px; }
      section { display:grid; gap:14px; justify-items:center; }
      canvas { background:#102847; border:1px solid rgba(227,183,91,.72); border-radius:50%; }
      #close { width:360px; height:360px; }
      #normal { width:80px; height:80px; }
      small { color:#9db4d3; }
    </style></head><body>
      <main><section><canvas id="normal" width="80" height="80"></canvas><strong>Gerçek boyut · 80 px</strong><small data-label>open</small></section>
      <section><canvas id="close" width="360" height="360"></canvas><strong>Yakın plan</strong><small data-label>open</small></section></main>
      <script>
        const sprite = new Image();
        const xs = [0, 314, 627, 941, 1254];
        const ys = [0, 314, 627, 941, 1254];
        const sequence = ${JSON.stringify(blinkSequence)};
        let step = 0;
        const draw = () => {
          const frame = sequence[step % sequence.length];
          const sx = xs[frame.col - 1], sy = ys[frame.row - 1];
          const sw = xs[frame.col] - sx, sh = ys[frame.row] - sy;
          for (const [id, size] of [['normal', 80], ['close', 360]]) {
            const canvas = document.getElementById(id);
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, size, size);
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.drawImage(sprite, sx, sy, sw, sh, 0, 0, size, size);
          }
          document.querySelectorAll('[data-label]').forEach((node) => { node.textContent = frame.label; });
          document.body.dataset.frame = frame.label;
          step += 1;
        };
        sprite.onload = () => { draw(); setInterval(draw, 260); };
        sprite.src = 'data:image/png;base64,${spriteBase64}';
      </script></body></html>`, { waitUntil: "load" });
  await page.waitForFunction(() => document.body.dataset.frame === "open");
  const screenshots = [];
  for (const [name, frame] of [["open", "open"], ["half-close", "half-close"], ["closed", "closed"]]) {
    await page.waitForFunction((expected) => document.body.dataset.frame === expected, frame, { timeout: 3_000 });
    const file = path.join(artifactRoot, `preview-${suffix}-${name}.png`);
    await page.screenshot({ path: file });
    screenshots.push(relative(file));
  }
  await page.waitForTimeout(2_000);
  const video = page.video();
  await context.close();
  await browser.close();
  return { screenshots, video: video ? relative(await video.path()) : null };
}

async function run() {
  await fs.rm(artifactRoot, { recursive: true, force: true });
  await fs.mkdir(frameRoot, { recursive: true });
  await fs.mkdir(cleanFrameRoot, { recursive: true });
  await fs.mkdir(compositeFrameRoot, { recursive: true });
  const sourceBuffer = await fs.readFile(sourcePath);
  const source = PNG.sync.read(sourceBuffer);
  const frames = [];
  for (let row = 1; row <= 4; row += 1) {
    for (let col = 1; col <= 4; col += 1) frames.push(await writeFrame(source, row, col));
  }
  const firstRow = frames.filter((frame) => frame.row === 1);
  const firstRowBboxes = firstRow.map((frame) => frame.bbox);
  const alignment = {
    xSpread: Math.max(...firstRowBboxes.map((box) => box.x)) - Math.min(...firstRowBboxes.map((box) => box.x)),
    ySpread: Math.max(...firstRowBboxes.map((box) => box.y)) - Math.min(...firstRowBboxes.map((box) => box.y)),
    widthSpread: Math.max(...firstRowBboxes.map((box) => box.width)) - Math.min(...firstRowBboxes.map((box) => box.width)),
    heightSpread: Math.max(...firstRowBboxes.map((box) => box.height)) - Math.min(...firstRowBboxes.map((box) => box.height)),
  };
  const cleanSheet = new PNG({ width: source.width, height: source.height });
  for (const frame of frames) {
    const cleanImage = PNG.sync.read(await fs.readFile(path.join(repoRoot, frame.cleanFile)));
    const x = edges[frame.col - 1];
    const y = edges[frame.row - 1];
    for (let row = 0; row < cleanImage.height; row += 1) {
      for (let col = 0; col < cleanImage.width; col += 1) {
        const sourceIndex = (row * cleanImage.width + col) * 4;
        const targetIndex = ((y + row) * cleanSheet.width + x + col) * 4;
        cleanSheet.data[targetIndex] = cleanImage.data[sourceIndex];
        cleanSheet.data[targetIndex + 1] = cleanImage.data[sourceIndex + 1];
        cleanSheet.data[targetIndex + 2] = cleanImage.data[sourceIndex + 2];
        cleanSheet.data[targetIndex + 3] = cleanImage.data[sourceIndex + 3];
      }
    }
  }
  const cleanSheetBuffer = PNG.sync.write(cleanSheet);
  const cleanSheetFile = path.join(artifactRoot, "sprite-cleaned.png");
  await fs.writeFile(cleanSheetFile, cleanSheetBuffer);
  const cleanFirst = PNG.sync.read(await fs.readFile(path.join(repoRoot, firstRow[0].cleanFile)));
  const cleanHalf = PNG.sync.read(await fs.readFile(path.join(repoRoot, firstRow[1].cleanFile)));
  const cleanClosed = PNG.sync.read(await fs.readFile(path.join(repoRoot, firstRow[2].cleanFile)));
  const compositeFrames = {
    1: cleanFirst,
    2: compositeEyeFrame(cleanFirst, cleanHalf),
    3: compositeEyeFrame(cleanFirst, cleanClosed),
    4: cleanFirst,
  };
  for (const [col, image] of Object.entries(compositeFrames)) {
    await fs.writeFile(path.join(compositeFrameRoot, `frame-r1-c${col}.png`), PNG.sync.write(image));
  }
  const compositeSheet = PNG.sync.read(cleanSheetBuffer);
  for (const [col, image] of Object.entries(compositeFrames)) {
    const x = edges[Number(col) - 1];
    for (let row = 0; row < image.height; row += 1) {
      for (let cellCol = 0; cellCol < image.width; cellCol += 1) {
        const sourceIndex = (row * image.width + cellCol) * 4;
        const targetIndex = (row * compositeSheet.width + x + cellCol) * 4;
        compositeSheet.data[targetIndex] = image.data[sourceIndex];
        compositeSheet.data[targetIndex + 1] = image.data[sourceIndex + 1];
        compositeSheet.data[targetIndex + 2] = image.data[sourceIndex + 2];
        compositeSheet.data[targetIndex + 3] = image.data[sourceIndex + 3];
      }
    }
  }
  const compositeSheetBuffer = PNG.sync.write(compositeSheet);
  await fs.writeFile(path.join(artifactRoot, "sprite-eye-composite.png"), compositeSheetBuffer);
  const rawPreview = await createPreview(sourceBuffer, "raw");
  const cleanPreview = await createPreview(cleanSheetBuffer, "clean");
  const compositePreview = await createPreview(compositeSheetBuffer, "composite");
  const report = {
    generatedAt: new Date().toISOString(),
    sourcePath,
    sourceSha256: sha256(sourceBuffer),
    sourceDimensions: { width: source.width, height: source.height },
    cellEdges: edges,
    frameCount: frames.length,
    frames,
    blinkSequence,
    firstRowAlignment: alignment,
    firstRowFringePixels: firstRow.map((frame) => ({
      row: frame.row,
      col: frame.col,
      raw: frame.fringePixels,
      cleaned: frame.cleanMetrics.fringePixels,
    })),
    preview: { raw: rawPreview, clean: cleanPreview, eyeComposite: compositePreview },
    decision: {
      rawFrameSplit: "PASS",
      firstRowGeometryAlignment: alignment.xSpread <= 1 && alignment.ySpread <= 1 && alignment.widthSpread <= 2 && alignment.heightSpread <= 1 ? "PASS" : "NOT_PROVEN",
      cleanEdges: firstRow.every((frame) => frame.cleanMetrics.fringePixels === 0) ? "PASS" : "FAIL",
      eyeOnlyComposite: "NOT_PROVEN",
      productDeployment: "NOT_PERFORMED",
    },
    note: "Throwaway local candidate preview only. r12 static fallback remains canonical; no product asset or runtime was changed.",
  };
  await fs.writeFile(path.join(artifactRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
