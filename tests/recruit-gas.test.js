const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.resolve(__dirname,'../gas/Code.gs'),'utf8');
const manifest = require('../gas/appsscript.json');

function make({properties={},data={}}={}) {
  let sheetReads=0,openCount=0;
  const sandbox={
    console:{error(){},log(){}},
    ContentService:{
      MimeType:{JSON:'application/json'},
      createTextOutput(body){
        return {body,setMimeType(mime){this.mime=mime;return this}};
      }
    },
    PropertiesService:{
      getScriptProperties(){
        return {getProperty(key){return properties[key]||null}};
      }
    },
    SpreadsheetApp:{
      openById(id){
        openCount++;
        assert.equal(id,'13kT06kYD5v1pea1wcLc0f0j991VEiKHPq0KOgwiRk30');
        return {
          getSheetByName(name){
            if (!(name in data)) return null;
            return {
              getLastRow(){return data[name].length},
              getLastColumn(){return data[name][0].length},
              getRange(){
                sheetReads++;
                return {getValues(){return data[name]}};
              }
            };
          },
          getSheets(){return Object.keys(data).map(name=>({getName:()=>name}))}
        };
      }
    },
    Utilities:{formatDate:()=> '2026-11-17'}
  };
  vm.createContext(sandbox);
  vm.runInContext(script,sandbox);
  return {sandbox,getReads:()=>sheetReads,getOpens:()=>openCount,
    reply:(action)=>JSON.parse(sandbox.doGet({parameter:{action}}).body)};
}
test('single effective GET and POST handlers; no changes to Recruit Engine',()=>{
  assert.equal((script.match(/function doGet\(/g)||[]).length,1);
  assert.equal((script.match(/function doPost\(/g)||[]).length,1);
  assert.equal(manifest.runtimeVersion,'V8');
  assert.deepEqual(manifest.oauthScopes,['https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/script.external_request']);
  assert.match(script,/function recruitVerifyAdmin_\(/);
  assert.match(script,/function recruitAdminUpdate_\(/);
  assert.doesNotMatch(script,/appendRow\(|deleteSheet\(|setValues\(/);
});
test('default GET is fail-closed and reveals no Google Sheet',()=>{
  const ctx=make();
  assert.equal(ctx.reply('health').status,'read-only');
  assert.equal(ctx.reply('health').financialEnabled,false);
  assert.equal(ctx.reply('catalog').error.code,'READ_DISABLED');
  assert.equal(ctx.reply('financial').error.code,'FINANCIAL_READ_DISABLED');
  assert.equal(ctx.reply('unknown').error.code,'UNKNOWN_ACTION');
  assert.equal(ctx.getOpens(),0);
});
test('POST is denied even with spoofed admin flag or token',()=>{
  const ctx=make();
  const reply=JSON.parse(ctx.sandbox.doPost({parameter:{avaEntry:'admin',token:'fake'},postData:{contents:'{"action":"write"}'}}).body);
  assert.equal(reply.ok,false);
  assert.equal(reply.error.code,'WRITE_FORBIDDEN');
  assert.equal(ctx.getOpens(),0);
});
test('public catalog requires exact Chinese tabs; disallows arbitrary user-supplied tab',()=>{
  const expected=['招聘流程','工作價值選項','探索提問','滿足程度選項','理想工作類型','理財工作內容',
    '理財工作取捨','行業前景','保障服務範疇','職涯發展','發展方式'];
  const data=Object.fromEntries(expected.map(name=>[name,[['項目','說明'],['示例','可見']]]));
  data['試算輸入']=[['私人','紀錄'],['候選人','不可讀']];
  const ctx=make({properties:{PUBLIC_CONTENT_ENABLED:'true',OFFICIAL_DATA_VERSION:'初始測試'},data});
  const result=ctx.sandbox.doGet({parameter:{action:'catalog',tab:'試算輸入'}});
  const reply=JSON.parse(result.body);
  assert.equal(result.mime,'application/json');
  assert.equal(reply.ok,true);
  assert.equal(reply.dataVersion,'初始測試');
  assert.equal(reply.financialIncluded,false);
  assert.deepEqual(Object.keys(reply.tabs),expected);
  assert.equal(reply.tabs['試算輸入'],undefined);
  assert.equal(ctx.getReads(),11);
});
test('financial data requires an independent explicit feature flag',()=>{
  const ctx=make({properties:{PUBLIC_CONTENT_ENABLED:'true',PUBLIC_FINANCIAL_ENABLED:'false'}});
  assert.equal(ctx.reply('financial').error.code,'FINANCIAL_READ_DISABLED');
  assert.equal(ctx.getOpens(),0);
});
test('missing approved tab fails safely without leaking internal error',()=>{
  const ctx=make({properties:{PUBLIC_CONTENT_ENABLED:'true'}});
  const reply=ctx.reply('catalog');
  assert.equal(reply.error.code,'SERVER_ERROR');
  assert.equal(JSON.stringify(reply).includes('Missing required tab'),false);
});
test('diagnostic verifies 21 expected Chinese tab names',()=>{
 const names=['招聘流程','工作價值選項','探索提問','滿足程度選項','理想工作類型','理財工作內容',
 '理財工作取捨','行業前景','保障服務範疇','職涯發展','發展方式',
 '招聘方案','津貼金額選項','佣金計算參數','年終獎勵級距','專業獎勵級距','續期佣金規則',
 '使用說明','參考資料及版本','試算輸入','七年收入試算'];
 const data=Object.fromEntries(names.map(name=>[name,[['A','B'],[1,2]]]));
 const ctx=make({data});
 const diag=ctx.sandbox.recruitDiagnostic();
 assert.equal(diag.passes,true);
 assert.equal(diag.actualCount,21);
});

test('Owner deployment settings are registered but never silently enable unverified cloud reads',()=>{
  const deployment=require('../gas/deployment.json');
  assert.equal(deployment.appId,'recruit');
  assert.equal(deployment.contractVersion,'recruit-dataset-v1');
  assert.equal(deployment.sheetUrl,'https://docs.google.com/spreadsheets/d/13kT06kYD5v1pea1wcLc0f0j991VEiKHPq0KOgwiRk30/edit');
  assert.equal(deployment.gasWebAppUrl,'https://script.google.com/macros/s/AKfycbzgUnyK9bVOovaj7C5tk4MZXIlTOOnv-Dq4f6KLvk-dWkmk66KkR-yJSVpyyTDAcjUIHA/exec');
  assert.equal(deployment.runtimeIntegrationEnabled,false);
  assert.equal(deployment.officialReadEnabled,false);
  assert.equal(deployment.financialReadEnabled,false);
});

test('all protected POST routes reject missing browser proof or Platform authorization',()=>{
 const ctx=make();
 const send=body=>JSON.parse(ctx.sandbox.doPost({postData:{contents:JSON.stringify(body)}}).body);
 const cases=[
  {action:'exchangeAdminSession',appId:'recruit',launchTicket:'spoofed',launchNonce:'nonce'},
  {action:'adminRead',appId:'recruit',adminSessionProof:'made-up'},
  {action:'adminUpdate',appId:'recruit',adminSessionProof:'made-up',
   tab:'理財工作取捨',recordId:'07-0001',expectedRevision:1,fields:{'可能得到':'非法改寫'}}
 ];
 for(const request of cases){const result=send(request);assert.equal(result.ok,false);}
 assert.equal(ctx.getOpens(),0);
});
