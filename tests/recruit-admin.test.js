const test=require('node:test');
const assert=require('node:assert/strict');
const admin=require('../recruit-admin.js');
const fs=require('node:fs');
const path=require('node:path');
const read=path=>fs.readFileSync(require('node:path').join(__dirname,'..',path),'utf8');
const future=()=>new Date(Date.now()+120000).toISOString();
const exchange=()=>({success:true,appId:'recruit',contract:'ava-admin-session-v1',
 adminSessionProof:'verified-opaque-server-proof',expiresAt:future()});
test('AVA Studio Admin accepts only exact app identity, contract, expiry, server proof',()=>{
 assert.equal(admin.validateExchange(exchange()),true);
 for(const changed of [
  {appId:'medical'},{contract:'ava-legacy-app-grant-v1'},
  {expiresAt:'2020-01-01T00:00:00Z'},{adminSessionProof:''},
  {success:false}]){
  assert.equal(admin.validateExchange({...exchange(),...changed}),false);
 }
});
test('Admin Official Read requires all 17 approved tabs, exact text-field allowlist, unique IDs and revisions',()=>{
 const names=['招聘流程','工作價值選項','探索提問','滿足程度選項','理想工作類型',
 '理財工作內容','理財工作取捨','行業前景','保障服務範疇','職涯發展','發展方式',
 '招聘方案','津貼金額選項','佣金計算參數','年終獎勵級距','專業獎勵級距','續期佣金規則'];
 const editable={'探索提問':['問題','備註'],'理財工作內容':['工作內容','實際要求'],
 '理財工作取捨':['可能得到','需要付出'],'行業前景':['說明','提示'],
 '保障服務範疇':['範疇','資格提示'],'職涯發展':['主要工作','資格說明'],
 '發展方式':['可能得到','需要承擔']};
 const minimal={success:true,appId:'recruit',contract:'ava-admin-session-v1',
  data:{editable,tabs:Object.fromEntries(names.map((name,i)=>[name,{
   columns:['主題','紀錄代碼','修訂版'],
   rows:[{'主題':'示例','紀錄代碼':String(i+1).padStart(2,'0')+'-0001','修訂版':1}]
  }]))}};
 assert.equal(admin.validateRead(minimal),true);
 const clone=()=>JSON.parse(JSON.stringify(minimal));
 const missing=clone();delete missing.data.tabs['招聘流程'];
 assert.equal(admin.validateRead(missing),false);
 const injected=clone();injected.data.editable['招聘方案']=['每月津貼'];
 assert.equal(admin.validateRead(injected),false);
 const different=clone();different.data.editable['探索提問']=['紀錄代碼'];
 assert.equal(admin.validateRead(different),false);
 const bad=clone();bad.data.tabs['理財工作取捨'].rows[0]['紀錄代碼']='missing';
 assert.equal(admin.validateRead(bad),false);
 const duplicate=clone();duplicate.data.tabs['理財工作取捨'].rows.push(
  {...duplicate.data.tabs['理財工作取捨'].rows[0]});
 assert.equal(admin.validateRead(duplicate),false);
 assert.equal(admin.validateRead({...minimal,appId:'other'}),false);
});
test('Official Write must confirm record ID, revision, persisted fields and readback',()=>{
 const request={tab:'理財工作取捨',recordId:'07-0001',expectedRevision:2,
  fields:{'可能得到':'清晰說明'}};
 const response={success:true,appId:'recruit',contract:'ava-admin-session-v1',
  data:{tab:request.tab,recordId:request.recordId,recordRevision:3,
   fields:request.fields,verifiedFields:['可能得到'],
   authoritative:true,persisted:true,readAfterWrite:true}};
 assert.equal(admin.validatePersisted(response,request),true);
 for(const delta of [{recordRevision:2},{readAfterWrite:false},{persisted:false},
  {recordId:'07-0002'},{fields:{'可能得到':'錯誤'}}]){
  assert.equal(admin.validatePersisted({...response,data:{...response.data,...delta}},request),false);
 }
});
test('Copied URL, expired window.name and mismatched app binding always reject',async()=>{
 assert.throws(()=>admin.browserBinding('ticket','nonce',{name:'',opener:null}),/AVA Studio/);
 const fake={type:'ava-admin-session-context',appId:'other',
  launchTicket:'ticket',launchNonce:'nonce',browserProof:'x',
  expiresAt:future(),contract:'ava-admin-session-v1'};
 const win={name:'ava-admin-session-v1:'+JSON.stringify(fake),opener:null};
 assert.throws(()=>admin.browserBinding('ticket','nonce',win),/過期或不相符/);
 assert.equal(win.name,'');
});
test('independent shell loads Admin module but never trusts old local password',()=>{
 assert.match(read('index.html'),/src="recruit-admin.js"/);
 assert.match(read('sw.js'),/recruit-admin.js/);
 assert.doesNotMatch(read('app.js'),/!==\s*"8888"/);
 assert.match(read('app.js'),/window\.RecruitAdmin\.open/);
 assert.match(read('gas/Code.gs'),/function recruitVerifyAdmin_/);
 assert.match(read('gas/Code.gs'),/function recruitAdminUpdate_/);
});
