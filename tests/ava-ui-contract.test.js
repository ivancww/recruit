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
test("canonical design source is included and loads before app-specific CSS",()=>{
  const files=["styles.css","design-system/tokens.css","design-system/components.css","ava-recruit-ui.css"];
  let previous=-1;
  for(const file of files){const index=html.indexOf('href="'+file+'"');assert.ok(index>previous,file+" load order");previous=index;}
  assert.doesNotMatch(html,/fonts\.googleapis\.com/);
  const tokens=load("design-system/tokens.css");
  const components=load("design-system/components.css");
  assert.match(tokens,/--ava-font-family:/);
  assert.match(tokens,/--ava-type-page:/);
  assert.match(tokens,/--ava-touch-target:/);
  assert.match(components,/\.ava-card/);
  assert.match(components,/\.ava-button/);
  assert.doesNotMatch(css,/--ava-color-primary\s*:/);
  assert.doesNotMatch(css,/--ava-font-family\s*:/);
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

test("PWA owns its shell and never purges other applications",()=>{
 const sw=load("sw.js");
 assert.match(sw,/ava-recruit-shell/);
 assert.match(sw,/startsWith\("ava-recruit-"\)/);
 assert.match(sw,/cache:"no-store"/);
 assert.match(sw,/design-system\/tokens\.css/);
 assert.match(sw,/design-system\/components\.css/);
 assert.doesNotMatch(sw,/cache-v\d/);
});

test("all navigation affordances use canonical outlined SVG icons",()=>{
  assert.match(html,/id="sessionsButton"[^>]*><svg class="ava-icon"/);
  assert.match(html,/id="settingsButton"[^>]*><svg class="ava-icon"/);
  assert.match(html,/drawer-close" aria-label="關閉"><svg class="ava-icon"/);
  assert.doesNotMatch(html,/aria-label="設定">⚙/);
  assert.doesNotMatch(html,/aria-label="候選人進度">☰/);
});
