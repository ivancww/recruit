const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../gas/Code.gs'),'utf8');
function environment(){
 const values=[
  ['主題','可能得到','需要付出','紀錄代碼','修訂版'],
  ['收入上升空間','原本優勢','原本代價','07-0001',1],
  ['時間自主','時間自主優勢','時間自主代價','07-0002',1]
 ];
 let platformCalls=[],locks=0,writeCalls=0,authorized=true;
 const sheet={
  getDataRange(){return{getValues:()=>values.map(x=>[...x])}},
  getRange(row,col,height=1,width=1){return{
    getValue(){return values[row-1][col-1]},
    getFormula(){return ''},
    setValue(value){writeCalls++;values[row-1][col-1]=value},
    getValues(){return Array.from({length:height},(_,i)=>
      values[row-1+i].slice(col-1,col-1+width))}
  }}
 };
 const sandbox={
  console:{error(){},log(){}},
  ContentService:{MimeType:{JSON:'application/json'},createTextOutput(body){
   return{body,setMimeType(){return this}}
  }},
  PropertiesService:{getScriptProperties(){return{getProperty(key){
   if(key==='AVA_PLATFORM_ADMIN_ENDPOINT')
    return 'https://script.google.com/macros/s/AKfycbz123456/exec';
   return null;
  }}}},
  UrlFetchApp:{fetch(_url,options){
   const request=JSON.parse(options.payload);platformCalls.push(request);
   const response=!authorized?{success:false,error:'Unauthorized'}:
    request.action==='exchangeAdminSession'?
     {success:true,appId:'recruit',contract:'ava-admin-session-v1',
      adminSessionProof:'opaque-proof-from-platform',expiresAt:new Date(Date.now()+60000).toISOString()}:
     {success:true,appId:'recruit',contract:'ava-admin-session-v1',
      operation:request.operation,expiresAt:new Date(Date.now()+60000).toISOString()};
   return{getResponseCode:()=>200,getContentText:()=>JSON.stringify(response)}
  }},
  LockService:{getScriptLock(){return{waitLock(){locks++},releaseLock(){locks--}}}},
  SpreadsheetApp:{
   openById(id){assert.equal(id,'13kT06kYD5v1pea1wcLc0f0j991VEiKHPq0KOgwiRk30');
    return{getSheetByName(name){return name==='理財工作取捨'?sheet:null}}},
   flush(){}
  },
  Utilities:{formatDate:()=>''}
 };
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 const post=request=>JSON.parse(sandbox.doPost({postData:{contents:JSON.stringify(request)}}).body);
 return{values,post,getCalls:()=>platformCalls,getWrites:()=>writeCalls,getLocks:()=>locks,setAuthorized:v=>authorized=v};
}
test('browser-bound one-time session proof is exchanged server-to-server only',()=>{
 const x=environment();
 const value=x.post({action:'exchangeAdminSession',appId:'recruit',
  launchTicket:'ticket',launchNonce:'nonce',browserProof:'browser-proof'});
 assert.equal(value.success,true);
 assert.equal(value.contract,'ava-admin-session-v1');
 assert.equal(x.getCalls()[0].action,'exchangeAdminSession');
 assert.equal(x.getWrites(),0);
});
test('Official Update verifies platform scope, stable ID, revision and persisted readback',()=>{
 const x=environment();
 const request={action:'adminUpdate',appId:'recruit',adminSessionProof:'proof',
  tab:'理財工作取捨',recordId:'07-0001',expectedRevision:1,
  fields:{'可能得到':'修訂後的新說明'}};
 const value=x.post(request);
 assert.equal(value.success,true);
 assert.equal(value.data.persisted,true);
 assert.equal(value.data.readAfterWrite,true);
 assert.equal(value.data.recordId,'07-0001');
 assert.equal(value.data.recordRevision,2);
 assert.equal(x.values[1][1],'修訂後的新說明');
 assert.equal(x.values[1][4],2);
 assert.equal(x.values[2][1],'時間自主優勢');
 assert.equal(x.getLocks(),0);
 assert.equal(x.getCalls()[0].operation,'recruit:official-write:理財工作取捨');
 const stale=x.post(request);
 assert.equal(stale.ok,false);
 assert.equal(stale.error.code,'ADMIN_STALE_REVISION');
 assert.equal(x.values[1][4],2);
});
test('no arbitrary financial writes, field substitutions or authorization bypass',()=>{
 const x=environment();
 const samples=[
  {tab:'佣金計算參數',fields:{'參數數值':'10000'}},
  {tab:'理財工作取捨',fields:{'主題':'竄改'}},
  {tab:'理財工作取捨',fields:{'可能得到':'<script>alert(1)</script>'}},
  {tab:'理財工作取捨',fields:{'可能得到':'=IMPORTXML("https://example.invalid","//")'}},
  {tab:'理財工作取捨',fields:{'可能得到':'+SUM(1,1)'}},
  {tab:'理財工作取捨',fields:{'可能得到':' @SUM(1,1)'}},
  {tab:'理財工作取捨',fields:{}}
 ];
 for(const delta of samples){
  const before=x.getWrites();
  const value=x.post({action:'adminUpdate',appId:'recruit',
    adminSessionProof:'proof',recordId:'07-0001',expectedRevision:1,...delta});
  assert.equal(value.ok,false);
  assert.equal(x.getWrites(),before);
 }
 x.setAuthorized(false);
 const denied=x.post({action:'adminUpdate',appId:'recruit',adminSessionProof:'fake',
  recordId:'07-0001',tab:'理財工作取捨',expectedRevision:1,
  fields:{'可能得到':'未經授權'}});
 assert.equal(denied.ok,false);
 assert.equal(x.getWrites(),0);
});
