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
test('Admin Official Read needs record IDs, revision, expected tabs and exact contract',()=>{
 const minimal={success:true,appId:'recruit',contract:'ava-admin-session-v1',
 data:{editable:{'理財工作取捨':['可能得到','需要付出']},
 tabs:Object.fromEntries(Array.from({length:11},(_,i)=>[
 '中文分頁'+i,{columns:['主題','紀錄代碼','修訂版'],
 rows:[{'主題':'示例','紀錄代碼':'07-0001','修訂版':1}]}
 ]))}};
 assert.equal(admin.validateRead(minimal),true);
 assert.equal(admin.validateRead({...minimal,data:{...minimal.data,tabs:{}}}),false);
 assert.equal(admin.validateRead({...minimal,appId:'other'}),false);
 const bad=JSON.parse(JSON.stringify(minimal));
 bad.data.tabs['中文分頁1'].rows[0]['紀錄代碼']='missing';
 assert.equal(admin.validateRead(bad),false);
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
