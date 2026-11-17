const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const engine = require("../recruit-engine.js");

const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const content = fs.readFileSync(path.join(__dirname, "../recruit-content.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

test("package guide occurs before income simulator, with accessible selection", () => {
  assert.match(app, /"income-intro","package-guide","income-input"/);
  assert.match(app, /function renderPackageGuide\(/);
  assert.match(app, /aria-pressed=/);
  assert.match(app, /data-package=/);
  assert.match(app, /package-comparison/);
});
test("all three packages expose guarded qualifications and package matching text", () => {
  for(const id of ["FP12", "PA18", "TTFS"]){
    assert.ok(engine.MB_OPTIONS[id].length > 0);
    assert.match(content, new RegExp(id + ': \\{ name:'));
  }
  assert.match(app, /資格須另經正式核實/);
  assert.match(app, /TTFS 目前引擎未完整建模/);
});
test("income result breaks down commissions, MB, bonus without modifying engine", () => {
  assert.match(app, /incomeBreakdown/);
  assert.match(app, /續期佣金/);
  const inputs={packageId:"PA18",mbAmount:10000,years:[{med:100000,ci:100000,sav:100000}]};
  const result=engine.calculate(inputs);
  const y=result.yearly[1];
  assert.equal(y.fyc,100000);
  assert.equal(y.total,y.fyc+y.mb+y.yeb+y.rc+y.renewalBonus+y.mdrt);
});
test("header retains independent version and persistent Return to AVA", () => {
  assert.match(html, /id="headerVersion"/);
  assert.match(html, /返回 AVA/);
  assert.match(app, /headerVersion/);
});
