const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
let server, browser, baseUrl;
const browserAvailable = fs.existsSync(chromium.executablePath());

test.before(async () => {
  if (!browserAvailable) return;
  server = http.createServer((req, res) => {
    const requested = req.url === "/" ? "index.html" : req.url.split("?")[0].slice(1);
    const target = path.resolve(root, requested);
    if (!target.startsWith(root) || !fs.existsSync(target)) { res.writeHead(404).end(); return; }
    const type = target.endsWith(".js") ? "text/javascript" : target.endsWith(".css") ? "text/css" : target.endsWith(".json") ? "application/json" : "text/html";
    res.writeHead(200, { "content-type": type });
    fs.createReadStream(target).pipe(res);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

test.after(async () => { if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); });

test("guided flow reaches income result without console errors", async () => {
  if (!browserAvailable) return test.skip("Playwright Chromium executable is not installed in this environment");
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(baseUrl);
  await page.click('[data-step="welcome"] [data-next]');
  for (let i = 0; i < 3; i += 1) await page.locator("#idealOptions .option").nth(i).click();
  await page.click('[data-step="ideal"] [data-next]');
  await page.fill("#reasonInput0","重視收入");
  await page.click('[data-step="why-three"] [data-next]');
  await page.click('#employmentOptions [data-value="not-employed"]');
  await page.click('[data-step="employment"] [data-next]');
  await page.click('#desiredOptions [data-value="professional"]');
  await page.click('[data-step="desired-work"] [data-next]');
  await page.click('#interestOptions [data-value="maybe"]');
  await page.click('[data-step="change-interest"] [data-next]');
  for (const step of ["financial-work","financial-tradeoff","discovery-recap","industry-prospects","industry","ava-method","career-ladder","career-tradeoff"]) await page.click(`[data-step="${step}"] [data-next]`);
  await page.click('#pathOptions [data-value="flexible"]');
  await page.click('[data-step="path-choice"] [data-next]');
  await page.click('[data-step="paths"] [data-next]');
  await page.click('[data-step="income-intro"] [data-next]');
  await page.click('[data-step="package-guide"] [data-next]');
  await page.fill("#medInput", "600000");
  await page.click('[data-step="income-input"] [data-next]');
  assert.match(await page.locator("#incomeSummary").innerText(), /模擬總收入/);
  fs.mkdirSync(path.join(root,"ui-snapshots"),{recursive:true});
  await page.screenshot({path:path.join(root,"ui-snapshots","income-result-ipad-landscape.png"),fullPage:true});
  assert.equal(errors.length, 0, errors.join("\n"));
  await page.close();
});

for (const viewport of [{ name: "iPhone", width: 390, height: 844 }, { name: "Foldable", width: 717, height: 768 }, { name: "iPad portrait", width: 768, height: 1024 }, { name: "iPad landscape", width: 1024, height: 768 }, { name: "Desktop", width: 1440, height: 900 }]) {
  test(`no horizontal overflow at ${viewport.name}`, async () => {
    if (!browserAvailable) return test.skip("Playwright Chromium executable is not installed in this environment");
    const page = await browser.newPage({ viewport });
    await page.goto(baseUrl);
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    assert.ok(dimensions.scroll <= dimensions.client, `${dimensions.scroll} > ${dimensions.client}`);
    await page.close();
  });
}

for (const viewport of [
  {name:"Phone",width:390,height:844},
  {name:"Foldable unfolded",width:717,height:768},
  {name:"iPad portrait",width:768,height:1024},
  {name:"iPad landscape",width:1024,height:768}
]){
  test(`canonical AVA presentation primitives at ${viewport.name}`,async()=>{
    if (!browserAvailable) return test.skip("Playwright Chromium executable unavailable");
    const page=await browser.newPage({viewport});
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.goto(baseUrl);
    const shell=await page.evaluate(()=>{
      const root=getComputedStyle(document.documentElement);
      const body=getComputedStyle(document.body);
      const header=getComputedStyle(document.querySelector(".app-header"));
      const returnButton=document.getElementById("avaReturnButton");
      const control=getComputedStyle(returnButton);
      return {
        background:body.backgroundColor,
        text:body.color,
        font:body.fontFamily,
        officialBackground:root.getPropertyValue("--ava-color-background").trim(),
        officialText:root.getPropertyValue("--ava-color-text").trim(),
        header:header.backgroundColor,
        returnHeight:returnButton.getBoundingClientRect().height,
        returnWidth:returnButton.getBoundingClientRect().width,
        returnVisible:returnButton.getBoundingClientRect().width>0,
        returnLabel:returnButton.innerText.trim(),
        returnFocus:control.outlineStyle,
        scroll:document.documentElement.scrollWidth,
        client:document.documentElement.clientWidth
      };
    });
    assert.equal(shell.officialBackground,"#f6f8fb");
    assert.equal(shell.officialText,"#172033");
    assert.equal(shell.background,"rgb(246, 248, 251)");
    assert.equal(shell.text,"rgb(23, 32, 51)");
    assert.match(shell.font,/PingFang HK/);
    assert.equal(shell.header,"rgb(255, 255, 255)");
    assert.ok(shell.returnHeight>=44,`Return to AVA touch height: ${shell.returnHeight}`);
    assert.ok(shell.returnWidth>=44);
    assert.ok(shell.returnVisible);
    assert.match(shell.returnLabel,/返回 AVA/);
    assert.ok(shell.scroll<=shell.client,`shell overflow ${shell.scroll} > ${shell.client}`);
    await page.click('[data-step="welcome"] [data-next]');
    const card=await page.locator('[data-step="ideal"] .question-card').evaluate(el=>{
      const css=getComputedStyle(el);return{background:css.backgroundColor,radius:css.borderTopLeftRadius,width:el.getBoundingClientRect().width};
    });
    assert.equal(card.background,"rgb(255, 255, 255)");
    assert.equal(card.radius,"16px");
    assert.ok(card.width>280);
    fs.mkdirSync(path.join(root,"ui-snapshots"),{recursive:true});
    await page.screenshot({path:path.join(root,"ui-snapshots",`career-values-${viewport.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.png`),fullPage:true});
    for(let i=0;i<3;i++)await page.locator("#idealOptions .option").nth(i).click();
    const selected=await page.locator("#idealOptions .option[aria-pressed='true']").count();
    assert.equal(selected,3);
    await page.click('[data-step="ideal"] [data-next]');
    assert.ok(await page.locator("#whyThreeFields textarea").count()===3);
    const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
    assert.ok(dimensions.scroll<=dimensions.client,`interactive overflow ${dimensions.scroll} > ${dimensions.client}`);
    assert.deepEqual(errors,[]);
    await page.close();
  });
}

test("User Edit is the actual Frontstage, stages Preview and commits one local Save",async()=>{
 if(!browserAvailable) return test.skip("Playwright Chromium executable is not installed");
 const page=await browser.newPage({viewport:{width:768,height:1024}});
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await page.goto(baseUrl+"/index.html?avaEntry=user");
 assert.equal(await page.locator(".recruit-user-edit-toolbar").isVisible(),true);
 await page.click('[data-step="welcome"] [data-next]');
 const title=page.locator('[data-step="ideal"] .question-card h2');
 const original=await title.innerText();
 await title.fill("我最重視嘅三項工作價值");
 await page.click("#recruitEditToggle");
 assert.equal(await title.innerText(),"我最重視嘅三項工作價值");
 assert.equal(await title.getAttribute("contenteditable"),"false");
 await page.click("#recruitEditToggle");
 await page.click("#recruitEditSave");
 await page.reload();
 await page.click('[data-step="welcome"] [data-next]');
 assert.equal(await page.locator('[data-step="ideal"] .question-card h2').innerText(),"我最重視嘅三項工作價值");
 await page.goto(baseUrl+"/index.html?avaEntry=frontend");
 await page.click('[data-step="welcome"] [data-next]');
 assert.equal(await page.locator('[data-step="ideal"] .question-card h2').innerText(),"我最重視嘅三項工作價值");
 assert.notEqual(original,"我最重視嘅三項工作價值");
 assert.deepEqual(errors,[]);
 await page.close();
});

test("Direct Admin URL cannot unlock local preview or protected official dataset",async()=>{
 if(!browserAvailable) return test.skip("Playwright Chromium executable is not installed");
 const page=await browser.newPage({viewport:{width:1024,height:768}});
 await page.goto(baseUrl+"/index.html?avaEntry=admin");
 await page.click("#settingsButton");
 assert.equal(await page.locator('[data-settings-tab="admin"]').isVisible(),false);
 assert.equal(await page.locator("#adminEditor").isVisible(),false);
 const local=await page.evaluate(()=>Object.keys(localStorage).filter(x=>x.includes("admin")));
 assert.deepEqual(local,[]);
 await page.close();
});
