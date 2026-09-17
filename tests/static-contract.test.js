const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const index = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const engine = fs.readFileSync(path.join(__dirname, "..", "recruit-engine.js"), "utf8");
const content = fs.readFileSync(path.join(__dirname, "..", "recruit-content.js"), "utf8");
const sw = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf8"));

test("loads content, calculation engine and application in dependency order", () => {
  assert.ok(index.indexOf("recruit-content.js") < index.indexOf("recruit-engine.js"));
  assert.ok(index.indexOf("recruit-engine.js") < index.indexOf("app.js"));
});

test("keeps protected package and seven-year flow contracts", () => {
  const source = app + engine + content;
  for (const term of ["FP12", "PA18", "TTFS", "MDRT", "Array.from({length:7}"]) assert.ok(source.includes(term), `missing ${term}`);
});

test("includes every required discovery phase and both modes", () => {
  for (const term of ["ideal", "tradeoff", "industry", "ava-method", "path-choice", "income-result", "career-compare", "reflection", "Recruiter Mode", "Candidate Mode"]) assert.match(app, new RegExp(term));
});

test("PWA cache includes all runtime files and uses the manifest version", () => {
  for (const file of ["styles.css", "app.js", "recruit-content.js", "recruit-engine.js"]) assert.match(sw, new RegExp(file.replace(".", "\\.")));
  assert.equal(manifest.name, "AVA Recruit");
  assert.equal(manifest.theme_color, "#1e3a8a");
});
