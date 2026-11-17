const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const load=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const html=load("index.html");
const app=load("app.js");
const css=load("ava-recruit-ui.css");
const legacy=load("styles.css");
test("independent customer-facing shell uses AVA frontstage semantics and visible return",()=>{
  assert.match(html,/<body class="ava-front" data-ava-mode="use">/);
  assert.match(html,/class="app-header ava-header"/);
  assert.match(html,/id="avaReturnButton"[^>]+href="https:\/\/ivancww\.github\.io\/avaplatform\/"/);
  assert.match(html,/返回 AVA/);
  assert.doesNotMatch(html,/id="avaReturnButton"[^>]*hidden/);
  assert.match(html,/id="headerVersion"/);
  assert.match(html,/class="ava-icon"/);
});
test("app-specific UI layer loads after legacy styling and uses the canonical font stack",()=>{
  assert.ok(html.indexOf('href="styles.css"')<html.indexOf('href="ava-recruit-ui.css"'));
  assert.doesNotMatch(html,/fonts\.googleapis\.com/);
  assert.match(css,/--ava-font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang HK","Noto Sans TC",sans-serif/);
  for(const token of ["--ava-color-background","--ava-color-text","--ava-color-border","--ava-color-primary","--ava-type-page","--ava-touch-target"])assert.ok(css.includes(token));
});
test("canonical responsive and safe-area conventions are present",()=>{
  assert.match(css,/@media\(max-width:650px\)/);
  assert.match(css,/@media\(min-width:651px\) and \(max-width:1000px\)/);
  assert.match(css,/@media\(min-width:1001px\)/);
  assert.match(css,/safe-area-inset-left/);
  assert.match(css,/safe-area-inset-right/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
test("internal journey provides separate back and actual step progress",()=>{
  assert.match(app,/class="page-control"/);
  assert.match(app,/class="page-count"/);
  assert.match(app,/steps\.indexOf\(step\)/);
  assert.match(app,/flow-actions--below/);
  assert.match(app,/aria-pressed=/);
  assert.match(app,/setAttribute\("aria-pressed"/);
});
test("selected and focus states are not color-only, calculations remain independent",()=>{
  assert.match(css,/aria-pressed="true"\]::before/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/min-height:var\(--ava-touch-target\)/);
  assert.ok(legacy.includes(".package-grid"));
  assert.ok(app.includes("E.calculate(state.income)"));
});
