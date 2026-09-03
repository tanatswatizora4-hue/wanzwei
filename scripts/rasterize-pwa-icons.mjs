import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
const tmpDir = join(root, ".tmp", "icon-raster");
mkdirSync(outDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const chrome = chromeCandidates.find((path) => existsSync(path));
if (!chrome) {
  throw new Error("Chrome or Edge is required to rasterize Wanzwei SVG icons.");
}

function fileUrl(path) {
  return `file:///${path.replace(/\\/g, "/")}`;
}

function render(svgFileName, size, dest) {
  const svg = readFileSync(join(outDir, svgFileName), "utf8");
  const htmlPath = join(tmpDir, `${svgFileName}-${size}.html`);
  writeFileSync(
    htmlPath,
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; width: ${size}px; height: ${size}px; background: transparent; overflow: hidden; }
      svg { width: ${size}px; height: ${size}px; display: block; }
    </style>
  </head>
  <body>${svg}</body>
</html>
`,
  );

  const result = spawnSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${size},${size}`,
      `--screenshot=${dest}`,
      "--default-background-color=00000000",
      "--allow-file-access-from-files",
      fileUrl(htmlPath),
    ],
    { stdio: "pipe", encoding: "utf8" },
  );
  if (result.status !== 0 || !existsSync(dest)) {
    throw new Error(
      `Failed to rasterize ${svgFileName} at ${size}px: ${result.stderr || result.stdout || result.status}`,
    );
  }
}

render("icon.svg", 192, join(outDir, "icon-192.png"));
render("icon.svg", 512, join(outDir, "icon-512.png"));
render("maskable.svg", 192, join(outDir, "maskable-192.png"));
render("maskable.svg", 512, join(outDir, "maskable-512.png"));
render("icon.svg", 180, join(outDir, "apple-touch-icon.png"));
render("icon.svg", 32, join(outDir, "favicon-32.png"));

const androidRes = join(root, "android", "app", "src", "main", "res");
const mipmap = [
  ["mipmap-mdpi", 48],
  ["mipmap-hdpi", 72],
  ["mipmap-xhdpi", 96],
  ["mipmap-xxhdpi", 144],
  ["mipmap-xxxhdpi", 192],
];
for (const [folder, size] of mipmap) {
  const dir = join(androidRes, folder);
  mkdirSync(dir, { recursive: true });
  render("icon.svg", size, join(dir, "ic_launcher.png"));
  render("maskable.svg", size, join(dir, "ic_launcher_foreground.png"));
}

const drawable = join(androidRes, "drawable");
mkdirSync(drawable, { recursive: true });
copyFileSync(join(outDir, "maskable-512.png"), join(drawable, "splash.png"));

console.log("Wrote PWA and Android launcher icons from public/icons/*.svg");
