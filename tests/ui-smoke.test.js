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

test("User Edit can add, preview, reorder, persist and remove custom Frontstage pages",async()=>{
 if(!browserAvailable)return test.skip("Playwright Chromium unavailable");
 const page=await browser.newPage({viewport:{width:768,height:1024}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(baseUrl+"/index.html?avaEntry=user");
 await page.click("#recruitPageAdd");
 assert.equal(await page.locator(".recruit-user-created-page.active").count(),1);
 const title=page.locator(".recruit-user-created-page.active .recruit-custom-title");
 await title.fill("招聘前先思考");
 await page.locator(".recruit-user-created-page.active .recruit-custom-body").fill("這是本機自訂文字頁");
 await page.click("#recruitEditToggle");
 assert.equal(await title.getAttribute("contenteditable"),"false");
 assert.equal(await title.innerText(),"招聘前先思考");
 await page.click("#recruitEditToggle");
 await page.click("#recruitEditSave");
 const firstId=await page.locator(".recruit-user-created-page.active").getAttribute("data-step");
 await page.reload();
 await page.click('[data-step="welcome"] [data-next]');
 assert.equal(await page.locator(".recruit-user-created-page.active").getAttribute("data-step"),firstId);
 assert.equal(await page.locator(".recruit-user-created-page.active .recruit-custom-title").innerText(),"招聘前先思考");
 await page.locator('.recruit-user-created-page.active [data-next]').click();
 assert.equal(await page.locator('[data-step="ideal"].active').count(),1);
 await page.goto(baseUrl+"/index.html?avaEntry=user");
 await page.click("#recruitPageAdd");
 const secondId=await page.locator(".recruit-user-created-page.active").getAttribute("data-step");
 assert.notEqual(secondId,firstId);
 await page.click("#recruitEditSave");
 await page.reload();
 await page.click('[data-step="welcome"] [data-next]');
 assert.equal(await page.locator(".recruit-user-created-page").count(),2);
 assert.equal(await page.locator(".recruit-user-created-page.active").getAttribute("data-step"),firstId);
 await page.click("#recruitEditToggle");
 await page.click("#recruitEditToggle");
 await page.click("#recruitPageDown");
 await page.click("#recruitEditSave");
 await page.reload();
 await page.click('[data-step="welcome"] [data-next]');
 assert.equal(await page.locator(".recruit-user-created-page.active").getAttribute("data-step"),secondId);
 await page.click("#recruitEditToggle");
 await page.click("#recruitEditToggle");
 page.once("dialog",dialog=>dialog.accept());
 await page.click("#recruitPageRemove");
 await page.click("#recruitEditSave");
 await page.reload();
 assert.equal(await page.locator(".recruit-user-created-page").count(),1);
 assert.deepEqual(errors,[]);
 await page.close();
});

test("AVA Studio Admin browser proof opens authorized Chinese Official editor and verifies real UI readback",async()=>{
 if(!browserAvailable)return test.skip("Playwright Chromium unavailable");
 const page=await browser.newPage({viewport:{width:768,height:1024}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 const names=["招聘流程","工作價值選項","探索提問","滿足程度選項","理想工作類型",
 "理財工作內容","理財工作取捨","行業前景","保障服務範疇",
 "職涯發展","發展方式","招聘方案","津貼金額選項","佣金計算參數",
 "年終獎勵級距","專業獎勵級距","續期佣金規則"];
 const editable={"探索提問":["問題","備註"],"理財工作內容":["工作內容","實際要求"],
 "理財工作取捨":["可能得到","需要付出"],"行業前景":["說明","提示"],
 "保障服務範疇":["範疇","資格提示"],"職涯發展":["主要工作","資格說明"],
 "發展方式":["可能得到","需要承擔"]};
 let newText="原始說明",writeCount=0;
 function dataset(){
  return {success:true,appId:"recruit",contract:"ava-admin-session-v1",
   data:{editable,tabs:Object.fromEntries(names.map((name,i)=>{
    const columns=["主題",...(editable[name]||[]),"紀錄代碼","修訂版"];
    return [name,{columns,rows:[Object.fromEntries(columns.map(field=>[
     field,field==="紀錄代碼"?String(i+1).padStart(2,"0")+"-0001":
     field==="修訂版"?(name==="理財工作取捨"&&writeCount?2:1):
     field==="可能得到"?newText:"測試資料"
    ]))]}]
   }))}};
 }
 await page.route("**/macros/s/**/exec",async route=>{
  if(route.request().method()!=="POST")return route.fulfill({status:405,body:"not allowed"});
  const body=route.request().postDataJSON();
  let payload;
  if(body.action==="exchangeAdminSession")
   payload={success:true,appId:"recruit",contract:"ava-admin-session-v1",
    adminSessionProof:"server-issued-browser-bound-proof",
    expiresAt:new Date(Date.now()+60000).toISOString()};
  else if(body.action==="adminRead")payload=dataset();
  else if(body.action==="adminUpdate"){
   assert.equal(body.appId,"recruit");
   assert.equal(body.tab,"理財工作取捨");
   assert.equal(body.recordId,"07-0001");
   assert.equal(body.expectedRevision,1);
   newText=body.fields["可能得到"];writeCount++;
   payload={success:true,appId:"recruit",contract:"ava-admin-session-v1",
    data:{tab:body.tab,recordId:body.recordId,recordRevision:2,
     fields:body.fields,verifiedFields:["可能得到"],authoritative:true,
     persisted:true,readAfterWrite:true}};
  }else payload={ok:false,error:{code:"UNKNOWN_ACTION"}};
  await route.fulfill({status:200,contentType:"application/json",
   headers:{"access-control-allow-origin":"*"},body:JSON.stringify(payload)});
 });
 const ticket="acceptance-ticket",nonce="acceptance-nonce";
 await page.goto("about:blank");
 await page.evaluate(([ticket,nonce])=>{
  window.name="ava-admin-session-v1:"+JSON.stringify({
   type:"ava-admin-session-context",appId:"recruit",launchTicket:ticket,
   launchNonce:nonce,browserProof:"browser-proof",expiresAt:new Date(Date.now()+60000).toISOString(),
   contract:"ava-admin-session-v1"
  });
 },[ticket,nonce]);
 await page.goto(baseUrl+"/index.html?avaEntry=admin&avaAdminLaunch="+ticket+"&avaAdminLaunchNonce="+nonce);
 await page.getByRole("tab",{name:"理財工作取捨"}).click();
 await page.getByRole("combobox",{name:"選擇官方紀錄"}).selectOption("07-0001");
 await page.getByRole("textbox",{name:"可能得到"}).fill("已驗證文字更新");
 await page.getByRole("button",{name:"確認發佈官方修改"}).click();
 await page.getByRole("status").filter({hasText:"重新讀取核對"}).waitFor({timeout:10000});
 assert.equal(writeCount,1);
 assert.equal(await page.getByRole("textbox",{name:"可能得到"}).inputValue(),"已驗證文字更新");
 assert.equal(new URL(page.url()).searchParams.has("avaAdminLaunch"),false);
 assert.deepEqual(errors,[]);
 await page.close();
});

for(const viewport of [
 {name:"phone",width:390,height:844},
 {name:"foldable-unfolded",width:717,height:768},
 {name:"ipad-portrait",width:768,height:1024},
 {name:"ipad-landscape",width:1024,height:768}
]){
 test("Frontstage has no settings or User Edit controls; return sits above the main card: "+viewport.name,async()=>{
  if(!browserAvailable)return test.skip("Chromium unavailable");
  const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto(baseUrl+"/index.html?avaEntry=frontend");
  assert.equal(await page.locator("body").getAttribute("data-ava-mode"),"frontend");
  for(const id of ["settingsButton","sessionsButton","modeButton"]){
   assert.equal(await page.locator("#"+id).isVisible(),false,id+" must be hidden from Frontstage");
  }
  assert.equal(await page.locator(".recruit-user-edit-toolbar").isVisible(),false);
  const outside=await page.evaluate(()=>{
   const button=document.getElementById("avaReturnButton");
   const card=document.querySelector(".flow-page.active .hero-card");
   const nav=button.closest(".recruit-global-nav");
   const rect=button.getBoundingClientRect(),cardRect=card.getBoundingClientRect();
   return {outside:!!nav&&!card.contains(button)&&!document.querySelector(".app-header").contains(button),
     above:rect.bottom<=cardRect.top,contained:rect.left>=0&&rect.right<=innerWidth,
     touch:rect.height>=44,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.equal(outside.outside,true);
  assert.equal(outside.above,true);
  assert.equal(outside.contained,true);
  assert.equal(outside.touch,true);
  assert.equal(outside.overflow,false);
  await page.locator('[data-step="welcome"] [data-next]').click();
  assert.equal(await page.locator('[data-step="ideal"].active .page-control [data-back]').count(),1);
  const pageBack=await page.locator('[data-step="ideal"].active').evaluate(el=>{
   const back=el.querySelector(".page-control [data-back]");
   const card=el.querySelector(".question-card");
   return back.getBoundingClientRect().bottom<=card.getBoundingClientRect().top;
  });
  assert.equal(pageBack,true);
  await page.locator('[data-step="ideal"].active [data-back]').click();
  assert.equal(await page.locator('[data-step="welcome"].active').count(),1);
  assert.deepEqual(errors,[]);
  await page.close();
 });
}
test("User entry retains same Frontstage with in-place editor while Admin entry stays isolated",async()=>{
 if(!browserAvailable)return test.skip("Chromium unavailable");
 const page=await browser.newPage({viewport:{width:768,height:1024}});
 await page.goto(baseUrl+"/index.html?avaEntry=user");
 assert.equal(await page.locator("body").getAttribute("data-ava-mode"),"user");
 assert.equal(await page.locator(".recruit-user-edit-toolbar").isVisible(),true);
 assert.equal(await page.locator("#settingsButton").isVisible(),true);
 assert.equal(await page.locator("#avaReturnButton").getAttribute("href"),
   "https://ivancww.github.io/avaplatform/?avaSurface=user");
 await page.goto(baseUrl+"/index.html?avaEntry=frontend");
 assert.equal(await page.locator(".recruit-user-edit-toolbar").count(),0);
 await page.close();
});
