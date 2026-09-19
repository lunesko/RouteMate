import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readText(relativePath) {
  return readFileSync(path.join(projectDir, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function exists(relativePath) {
  return existsSync(path.join(projectDir, relativePath));
}

function pngSize(relativePath) {
  const buffer = readFileSync(path.join(projectDir, relativePath));
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG", `${relativePath} is not a PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("manifest references packaged extension resources", () => {
  const manifest = readJson("manifest.json");
  const packageJson = readJson("package.json");

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, packageJson.version);
  assert.equal(manifest.minimum_chrome_version, "114");
  assert.deepEqual(manifest.permissions, ["storage", "sidePanel"]);
  assert.deepEqual(manifest.host_permissions, [
    "https://www.google.com/maps/*",
    "https://maps.google.com/*"
  ]);

  assert.ok(exists(manifest.background.service_worker));
  assert.equal(manifest.side_panel.default_path, "sidepanel/index.html");
  assert.ok(exists(manifest.side_panel.default_path));

  for (const script of manifest.content_scripts.flatMap((entry) => entry.js)) {
    assert.ok(exists(script), `${script} is missing`);
  }
  for (const iconPath of Object.values(manifest.icons)) {
    assert.ok(exists(iconPath), `${iconPath} is missing`);
  }
});

test("side panel app references existing DOM elements", () => {
  const html = readText("sidepanel/index.html");
  const app = readText("sidepanel/app.js");
  const idBlock = app.match(/const ids = \[([\s\S]*?)\];/);
  assert.ok(idBlock, "sidepanel/app.js ids array was not found");

  const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const appIds = [...idBlock[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const missing = appIds.filter((id) => !htmlIds.has(id));
  assert.deepEqual(missing, []);
});

test("extension source avoids unsafe runtime patterns", () => {
  const files = [
    "content/maps-capture.js",
    "service-worker.js",
    "shared/route-utils.js",
    "shared/workspace.js",
    "sidepanel/app.js",
    "sidepanel/index.html"
  ];
  const unsafePattern = /\b(?:eval|Function)\s*\(|\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\s*\(/;

  for (const file of files) {
    assert.equal(unsafePattern.test(readText(file)), false, `${file} uses an unsafe runtime pattern`);
  }
});

test("package command uses the cross-platform Node packager", () => {
  const packageJson = readJson("package.json");
  const shellWrapper = readText("scripts/package.sh");

  assert.equal(packageJson.scripts.package, "node scripts/package.mjs");
  assert.ok(exists("scripts/package.mjs"));
  assert.match(shellWrapper, /package\.mjs/);
});

test("Chrome Web Store promotional assets use the expected dimensions", () => {
  assert.deepEqual(pngSize("store/assets/store-icon-128.png"), { width: 128, height: 128 });
  assert.deepEqual(pngSize("store/assets/promo-small-440x280.png"), { width: 440, height: 280 });
  assert.deepEqual(pngSize("store/assets/promo-marquee-1400x560.png"), { width: 1400, height: 560 });
});
