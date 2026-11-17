(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RecruitAdmin = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const APP_ID = "recruit";
  const PLATFORM_ORIGIN = "https://ivancww.github.io";
  const CONTRACT = "ava-admin-session-v1";
  const ENDPOINT = "https://script.google.com/macros/s/AKfycbzgUnyK9bVOovaj7C5tk4MZXIlTOOnv-Dq4f6KLvk-dWkmk66KkR-yJSVpyyTDAcjUIHA/exec";
  function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }
  function validateExchange(value, now = Date.now()) {
    const expiry = Date.parse(value && value.expiresAt || "");
    return Boolean(value && value.success === true && value.appId === APP_ID &&
      value.contract === CONTRACT && typeof value.adminSessionProof === "string" &&
      value.adminSessionProof.length > 10 && Number.isFinite(expiry) && expiry > now);
  }
  function validateRead(value) {
    if (!isObject(value) || value.success !== true || value.appId !== APP_ID ||
        value.contract !== CONTRACT || !isObject(value.data) ||
        !isObject(value.data.tabs) || !isObject(value.data.editable)) return false;
    const names = Object.keys(value.data.tabs);
    return names.length >= 11 && names.length <= 17 && names.every(name => {
      const tab = value.data.tabs[name];
      return isObject(tab) && Array.isArray(tab.columns) && Array.isArray(tab.rows) &&
        tab.columns.includes("紀錄代碼") && tab.columns.includes("修訂版") &&
        tab.rows.every(row => isObject(row) && typeof row["紀錄代碼"] === "string" &&
          /^\d{2}-\d{4}$/.test(row["紀錄代碼"]) &&
          Number.isInteger(Number(row["修訂版"])) &&
          Number(row["修訂版"]) >= 1);
    });
  }
  function validatePersisted(value, request) {
    const data = value && value.data;
    return Boolean(value && value.success === true && value.appId === APP_ID &&
      value.contract === CONTRACT && data &&
      data.tab === request.tab && data.recordId === request.recordId &&
      Number(data.recordRevision) === request.expectedRevision + 1 &&
      data.authoritative === true && data.persisted === true &&
      data.readAfterWrite === true && isObject(data.fields) &&
      Object.keys(request.fields).every(key =>
        Object.prototype.hasOwnProperty.call(data.fields,key) &&
        data.fields[key] === request.fields[key] &&
        Array.isArray(data.verifiedFields) && data.verifiedFields.includes(key)));
  }
  async function post(request, impl = fetch) {
    const response = await impl(ENDPOINT, {
      method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(request),cache:"no-store",credentials:"omit",redirect:"follow"
    });
    if (!response.ok) throw new Error("GAS HTTP "+response.status);
    const payload = await response.json();
    if (!payload || typeof payload !== "object") throw new Error("GAS 無效回應");
    return payload;
  }
  function browserBinding(ticket,nonce,win = window) {
    let value="";
    try {value=String(win.name||"");win.name="";} catch (_) {}
    if (value.startsWith("ava-admin-session-v1:")) {
      let candidate;
      try {candidate=JSON.parse(value.slice("ava-admin-session-v1:".length));}
      catch (_){throw new Error("Admin browser context 格式不正確");}
      const expiry=Date.parse(candidate && candidate.expiresAt||"");
      if (candidate.type !== "ava-admin-session-context" ||
          candidate.appId !== APP_ID || candidate.contract !== CONTRACT ||
          candidate.launchTicket !== ticket || candidate.launchNonce !== nonce ||
          typeof candidate.browserProof !== "string" || !candidate.browserProof ||
          !Number.isFinite(expiry) || expiry <= Date.now()) {
        throw new Error("Admin browser context 已過期或不相符");
      }
      return Promise.resolve(candidate.browserProof);
    }
    if (!win.opener) throw new Error("請由 AVA Studio 正式開啟 Admin");
    return new Promise((resolve,reject) => {
      let done=false;
      const timer=win.setTimeout(()=>finish(new Error("Admin 授權逾時")),15000);
      const finish=(err,proof)=>{
        if(done)return;done=true;win.clearTimeout(timer);
        win.removeEventListener("message",handler);
        err?reject(err):resolve(proof);
      };
      const handler=event=>{
        if(event.source!==win.opener || event.origin!==PLATFORM_ORIGIN)return;
        const x=event.data||{};
        if(x.type!=="ava-admin-session-response" || x.appId!==APP_ID ||
           x.launchTicket!==ticket || x.launchNonce!==nonce)return;
        if(x.contract!==CONTRACT || typeof x.browserProof!=="string" || !x.browserProof) {
          finish(new Error("Browser proof 格式不正確"));return;
        }
        finish(null,x.browserProof);
      };
      win.addEventListener("message",handler);
      win.opener.postMessage({
        type:"ava-admin-session-request",appId:APP_ID,
        launchTicket:ticket,launchNonce:nonce
      },PLATFORM_ORIGIN);
    });
  }

  function open(win = window, doc = document) {
    const params=new URLSearchParams(win.location.search);
    if(params.get("avaEntry")!=="admin")return null;
    const shell=doc.getElementById("flowShell");
    shell.style.display="none";
    const panel=doc.createElement("section");
    panel.className="recruit-admin-workspace";
    panel.setAttribute("aria-label","Recruit 官方管理");
    shell.parentNode.insertBefore(panel,shell);
    const header=doc.createElement("header");
    header.className="recruit-admin-head";
    const heading=doc.createElement("h1");
    heading.textContent="Recruit 官方資料管理";
    const status=doc.createElement("p");
    status.setAttribute("role","status");
    status.textContent="正在核對 AVA Studio 授權……";
    header.append(heading,status);
    const tabs=doc.createElement("div");
    tabs.className="recruit-admin-tabs";
    tabs.setAttribute("role","tablist");
    tabs.setAttribute("aria-label","官方資料分類");
    const content=doc.createElement("div");
    content.className="recruit-admin-content";
    panel.append(header,tabs,content);
    let proof=null,expiresAt=0,remote=null,currentTab="",recordId="",dirty=false;
    let draft={},original={};
    const setStatus=(message)=>{status.textContent=message};
    function guard(){
      if(!proof || Date.now()>=expiresAt){
        proof=null;setStatus("Admin 授權已過期，請返回 AVA Studio 重新登入");
        throw new Error("Admin 授權已過期");
      }
    }
    function retainDraft(){
      if(!dirty)return true;
      return win.confirm("有未保存嘅官方資料修改，確定放棄？");
    }
    function renderTabs(){
      tabs.replaceChildren();
      const names=Object.keys(remote.data.tabs);
      names.forEach((name,index)=>{
        const button=doc.createElement("button");
        button.type="button";
        button.setAttribute("role","tab");
        button.setAttribute("aria-selected",String(currentTab===name));
        button.textContent=name;
        button.tabIndex=currentTab===name?0:-1;
        button.onclick=()=>switchTab(name);
        button.onkeydown=e=>{
          const keys=["ArrowRight","ArrowLeft","Home","End"];
          if(!keys.includes(e.key))return;
          e.preventDefault();
          const next=e.key==="Home"?0:e.key==="End"?names.length-1:
            (index+(e.key==="ArrowRight"?1:-1)+names.length)%names.length;
          if(switchTab(names[next]))tabs.querySelectorAll('[role="tab"]')[next].focus();
        };
        tabs.appendChild(button);
      });
    }
    function switchTab(name){
      if(!remote.data.tabs[name] || !retainDraft())return false;
      currentTab=name;recordId="";dirty=false;draft={};original={};
      renderTabs();renderRecords();return true;
    }
    function renderRecords(){
      content.replaceChildren();
      const tab=remote.data.tabs[currentTab];
      if(!tab)return;
      const label=doc.createElement("label");
      label.textContent="選擇紀錄";
      const select=doc.createElement("select");
      select.setAttribute("aria-label","選擇官方紀錄");
      tab.rows.forEach(row=>{
        const option=doc.createElement("option");
        option.value=row["紀錄代碼"];
        const short=tab.columns.find(key=>key!=="紀錄代碼"&&key!=="修訂版");
        option.textContent=row["紀錄代碼"]+" · "+String(row[short]||"").slice(0,70);
        select.appendChild(option);
      });
      select.onchange=()=>{
        if(!retainDraft()){select.value=recordId;return}
        recordId=select.value;dirty=false;renderFields();
      };
      label.append(select);
      content.appendChild(label);
      if(!tab.rows.length){setStatus("此分頁尚未有資料");return}
      recordId=recordId||tab.rows[0]["紀錄代碼"];
      select.value=recordId;
      renderFields();
    }
    function renderFields(){
      for(const old of [...content.querySelectorAll(".recruit-admin-record")])old.remove();
      const tab=remote.data.tabs[currentTab];
      const row=tab.rows.find(r=>r["紀錄代碼"]===recordId);
      if(!row)return;
      const editing=new Set(remote.data.editable[currentTab]||[]);
      draft={};original={};
      const area=doc.createElement("div");
      area.className="recruit-admin-record";
      area.setAttribute("role","tabpanel");
      const info=doc.createElement("p");
      info.textContent="紀錄代碼："+row["紀錄代碼"]+" ／ 修訂版："+row["修訂版"]+
        (editing.size?"　·　可修改已批准欄位":"　·　此分頁唯讀");
      area.appendChild(info);
      for(const field of tab.columns){
        if(field==="紀錄代碼"||field==="修訂版")continue;
        const label=doc.createElement("label");
        label.textContent=field;
        const cell=doc.createElement(editing.has(field)?"textarea":"input");
        cell.value=String(row[field]??"");
        cell.setAttribute("aria-label",field);
        cell.dataset.field=field;
        if(!editing.has(field)){cell.readOnly=true;cell.setAttribute("aria-readonly","true")}
        else {
          original[field]=String(row[field]??"");
          cell.maxLength=800;
          cell.rows=2;
          cell.oninput=()=>{
            draft[field]=cell.value;
            dirty=Object.keys(draft).some(key=>draft[key]!==original[key]);
            area.querySelector(".recruit-admin-save").disabled=!dirty;
            setStatus(dirty?"未保存草稿 · 官方資料仍未改動":"已載入官方資料");
          };
        }
        label.appendChild(cell);
        area.appendChild(label);
      }
      const save=doc.createElement("button");
      save.className="recruit-admin-save";
      save.textContent="確認發佈官方修改";
      save.disabled=true;
      save.onclick=async()=>{
        if(!dirty)return;
        try{
          guard();
          const fields=Object.fromEntries(
            Object.entries(draft).filter(([key,value])=>value!==original[key]));
          if(!Object.keys(fields).length)return;
          save.disabled=true;setStatus("正在核實權限及保存官方修改……");
          const request={action:"adminUpdate",appId:APP_ID,
            adminSessionProof:proof,tab:currentTab,recordId,
            expectedRevision:Number(row["修訂版"]),fields};
          const response=await post(request);
          if(!validatePersisted(response,request))throw new Error("官方寫入確認資料不完整");
          // Verify via fresh authoritative read. Never trust just HTTP 200.
          const check=await post({action:"adminRead",appId:APP_ID,
            adminSessionProof:proof});
          if(!validateRead(check))throw new Error("無法重新讀取官方資料");
          const verified=check.data.tabs[currentTab].rows.find(r=>r["紀錄代碼"]===recordId);
          if(!verified || Number(verified["修訂版"])!==request.expectedRevision+1 ||
             !Object.keys(fields).every(key=>verified[key]===fields[key])){
            throw new Error("官方資料重讀不相符");
          }
          remote=check;dirty=false;
          setStatus("官方資料已保存，並完成重新讀取核對");
          renderTabs();renderRecords();
        }catch(error){
          // Keep input fields and unsaved draft intact for recovery.
          setStatus("保存未確認："+String(error.message||"請重新核對"));
          save.disabled=false;
        }
      };
      area.appendChild(save);
      content.appendChild(area);
    }
    win.addEventListener("beforeunload",e=>{
      if(!dirty)return;e.preventDefault();e.returnValue="";
    });
    const ticket=params.get("avaAdminLaunch");
    const nonce=params.get("avaAdminLaunchNonce");
    if(!ticket||!nonce){
      setStatus("未獲授權。請由 AVA Studio 登入並開啟 Recruit Admin。");
      return {authorized:false};
    }
    (async()=>{
      try{
        const browserProof=await browserBinding(ticket,nonce,win);
        const result=await post({action:"exchangeAdminSession",
          appId:APP_ID,launchTicket:ticket,launchNonce:nonce,browserProof});
        if(!validateExchange(result))throw new Error("Admin Session 驗證失敗");
        proof=result.adminSessionProof;
        expiresAt=Date.parse(result.expiresAt);
        // Ticket and nonce must never remain in URLs, reloads or backups.
        const clean=new URL(win.location.href);
        clean.searchParams.delete("avaAdminLaunch");
        clean.searchParams.delete("avaAdminLaunchNonce");
        win.history.replaceState(null,"",clean.pathname+clean.search+clean.hash);
        guard();
        const response=await post({action:"adminRead",appId:APP_ID,adminSessionProof:proof});
        if(!validateRead(response))throw new Error("官方資料格式或授權不正確");
        remote=response;
        setStatus("AVA Studio 已授權 · 官方資料已載入");
        switchTab(Object.keys(remote.data.tabs)[0]);
      }catch(error){
        proof=null;setStatus("Admin 未通過驗證："+String(error.message||"請返回 AVA Studio"));
      }
    })();
    return {authorized:false,isDirty:()=>dirty};
  }
  return Object.freeze({APP_ID,CONTRACT,ENDPOINT,validateExchange,validateRead,validatePersisted,browserBinding,open});
});
