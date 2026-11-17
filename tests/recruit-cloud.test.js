const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const cloud=require("../recruit-cloud.js");
const app=fs.readFileSync(require("node:path").join(__dirname,"../app.js"),"utf8");
const html=fs.readFileSync(require("node:path").join(__dirname,"../index.html"),"utf8");
const content=require("node:fs").readFileSync(require("node:path").join(__dirname,"../recruit-content.js"),"utf8");
const defaults={idealValues:["收入有上升空間","穩定收入","時間自主","工作有意義","發展／晉升空間","可以建立自己事業","團隊環境","專業成長","Work-Life Balance","公司福利"],
 careerTradeoffs:[["收入上升空間","",""],["時間自主","",""],["管理／晉升","",""],["建立自己客戶基礎","",""]]};
const valueSheet=()=>["收入有上升空間","穩定收入","時間自主","工作有意義","發展／晉升空間","可以建立自己事業","團隊環境","專業成長","工作與生活平衡","公司福利"].map(x=>({"工作價值":x}));
const fixture=()=>({ok:true,appId:"recruit",contractVersion:"recruit-dataset-v1",dataVersion:"v1.0.0",financialIncluded:false,tabs:{"工作價值選項":{rows:valueSheet()},"理財工作取捨":{rows:[1,2,3,4].map(i=>({"可能得到":"優勢"+i,"需要付出":"代價"+i}))}}});
test("valid published 21-tab Chinese Sheet catalog maps safely to existing choices",()=>{
 const value=cloud.parseCatalog(fixture(),defaults);
 assert.equal(value.dataVersion,"v1.0.0");
 assert.deepEqual(value.idealValues,defaults.idealValues);
 assert.equal(value.careerTradeoffs[0][1],"優勢1");
 assert.equal(value.careerTradeoffs[2][0],"管理／晉升");
});
test("strict contract rejects protected financial access, malicious markup or changed choices",()=>{
 for(const mutate of [
  p=>p.financialIncluded=true,
  p=>p.appId="other-app",
  p=>p.contractVersion="other",
  p=>p.tabs["工作價值選項"].rows[0]["工作價值"]="任意替換選擇",
  p=>p.tabs["理財工作取捨"].rows[0]["可能得到"]="<img src=x>",
  p=>p.tabs["理財工作取捨"].rows.splice(1,1)
 ]){const p=fixture();mutate(p);assert.equal(cloud.parseCatalog(p,defaults),null);}
});
test("API errors, HTTP failure, non-JSON and network outage never block rendering",async()=>{
 const ok={ok:true,text:async()=>JSON.stringify(fixture())};
 assert.equal((await cloud.load(defaults,async()=>ok)).state,"ready");
 assert.equal((await cloud.load(defaults,async()=>({ok:false}))).state,"http-error");
 assert.equal((await cloud.load(defaults,async()=>({ok:true,text:async()=>"{invalid"}))).state,"unavailable");
 assert.equal((await cloud.load(defaults,async()=>{throw Error("CORS blocked")})).state,"unavailable");
});
test("read-only, same UI, no writes and financial Engine unchanged",()=>{
 assert.match(html,/src="recruit-cloud\.js"/);
 assert.match(app,/window\.RecruitCloud\.load\(C\)/);
 assert.match(app,/cloudCatalog \? cloudCatalog\.idealValues : C\.idealValues/);
 assert.match(app,/E\.calculate\(state\.income\)/);
 assert.doesNotMatch(cloud.load.toString(),/POST|PUT|PATCH|DELETE/);
 assert.match(content,/version: "v2\.1\.2"/);
 assert.match(html,/v2\.1\.2/);
 assert.match(fs.readFileSync(require("node:path").join(__dirname,"../sw.js"),"utf8"),/recruit-cloud\.js/);
});
