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

test("career exploration completes before financial planning prospects and rank overview", () => {
  const match=app.match(/const steps = \[([^\]]+)\]/);
  assert.ok(match);
  const steps=Array.from(match[1].matchAll(/"([^"]+)"/g),x=>x[1]);
  assert.ok(steps.indexOf("financial-tradeoff") < steps.indexOf("discovery-recap"));
  assert.ok(steps.indexOf("discovery-recap") < steps.indexOf("industry-prospects"));
  assert.ok(steps.indexOf("industry-prospects") < steps.indexOf("career-ladder"));
  assert.ok(steps.indexOf("career-ladder") < steps.indexOf("package-guide"));
  assert.match(app,/function renderDiscoveryRecap\(/);
  assert.match(app,/你最重視嘅 Top 3/);
  assert.match(app,/未核實嘅職級名稱/);
});
test("three-phase rail tracks career discovery, prospects and packages", () => {
  assert.match(app,/id="journeyPhase"/);
  assert.match(app,/aria-current="step"/);
  assert.match(app,/職業探索","行業前景／職級","方案及收入/);
});

test("career discovery uses exactly ten values, Top 3 reasons and fit assessment", () => {
  const values=content.match(/idealValues: Object.freeze\(\[([^\]]+)\]\)/);
  assert.ok(values);
  assert.equal(Array.from(values[1].matchAll(/"([^"]+)"/g)).length,10);
  const stepList=app.match(/const steps = \[([^\]]+)\]/)[1];
  const steps=Array.from(stepList.matchAll(/"([^"]+)"/g),m=>m[1]);
  const required=["ideal","why-three","employment","satisfaction","stay-reason","desired-work","change-interest","financial-work","financial-tradeoff","discovery-recap"];
  for(let i=1;i<required.length;i++)assert.ok(steps.indexOf(required[i-1])<steps.indexOf(required[i]));
  assert.match(app,/state\.reasons\[v\]/);
  assert.match(app,/state\.satisfaction\[v\]/);
  assert.match(app,/function renderWhyThree\(/);
  assert.match(app,/function renderSatisfaction\(/);
  assert.match(app,/function renderInterviewSingle\(/);
  assert.match(app,/function renderDiscoveryRecap\(/);
  assert.match(app,/點解你依然選擇做呢份工/);
});
test("non-employed respondents skip current-job questions without losing Top 3",()=>{
  assert.match(app,/step==="employment"&&state\.employment!=="employed"/);
  assert.match(app,/steps\.indexOf\("desired-work"\)-1/);
  assert.match(app,/step==="desired-work"&&state\.employment!=="employed"/);
  assert.match(app,/state\.ideal\.map/);
});
