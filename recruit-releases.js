(function (root, factory) {
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.RecruitReleases=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const KEY="ava:recruit:release-observed:v1";
  const ACK="ava:recruit:release-acknowledged:v1";
  const GUARD="ava:recruit:shell-update-attempt:v1";
  function numeric(version){
    const m=/^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(version||""));
    return m?m.slice(1).map(Number):null;
  }
  function compare(a,b){
    const left=numeric(a),right=numeric(b);
    if(!left||!right)return null;
    for(let i=0;i<3;i++){if(left[i]!==right[i])return left[i]>right[i]?1:-1}
    return 0;
  }
  function valid(data){
    if(!data||data.appId!=="recruit"||data.schema!=="ava-independent-release-v1"||
      !numeric(data.currentVersion)||!Array.isArray(data.releases))return false;
    const published=data.releases.filter(x=>x.published===true);
    return published.every(x=>x&&typeof x.id==="string"&&
      /^recruit-v\d+\.\d+\.\d+-\d{8}$/.test(x.id)&&numeric(x.version)&&
      typeof x.publishedAt==="string"&&
      typeof x.title==="string"&&x.title.length<=130&&
      Array.isArray(x.changes)&&x.changes.length<=12&&
      x.changes.every(c=>typeof c==="string"&&c.length<=300)) &&
      published.some(x=>x.version===data.currentVersion);
  }
  function create(options){
    const win=options.window,doc=options.document,storage=options.storage;
    const current=options.currentVersion;
    const getEditor=options.getEditor||(()=>null);
    let manifest=null,overlay=null,active=false;
    const historyButton=doc.createElement("button");
    historyButton.type="button";
    historyButton.className="recruit-release-history-button";
    historyButton.textContent="更新紀錄";
    const line=doc.querySelector("#settingsDrawer .version-line");
    if(line)line.appendChild(historyButton);
    const overlayNode=()=>{
      if(overlay)return overlay;
      overlay=doc.createElement("div");
      overlay.className="recruit-release-overlay";
      overlay.hidden=true;
      overlay.innerHTML='<div class="recruit-release-dialog" role="dialog" aria-modal="true" aria-labelledby="recruitReleaseTitle" tabindex="-1"><h2 id="recruitReleaseTitle"></h2><div id="recruitReleaseBody"></div><div id="recruitReleaseButtons"></div></div>';
      doc.body.appendChild(overlay);
      return overlay;
    };
    function dismiss(){
      if(active)return;
      const node=overlayNode();
      node.hidden=true;
    }
    function draw(title,notes,buttons,force=false){
      active=force;
      const node=overlayNode();
      const dialog=node.querySelector(".recruit-release-dialog");
      node.querySelector("#recruitReleaseTitle").textContent=title;
      const body=node.querySelector("#recruitReleaseBody");
      body.replaceChildren();
      const list=doc.createElement("ul");
      notes.slice(0,12).forEach(line=>{
        const li=doc.createElement("li");
        li.textContent=String(line).slice(0,300);
        list.appendChild(li);
      });
      body.appendChild(list);
      const actions=node.querySelector("#recruitReleaseButtons");
      actions.replaceChildren();
      buttons.forEach(x=>{
        const b=doc.createElement("button");
        b.type="button";b.textContent=x.label;
        b.onclick=x.onClick;
        actions.appendChild(b);
      });
      node.hidden=false;
      // Forced update is a verified same-origin Shell change, not a Sheet refresh.
      const shell=doc.getElementById("flowShell");
      if(shell)shell.inert=force;
      dialog.focus();
    }
    function resetLock(){
      active=false;
      const shell=doc.getElementById("flowShell");
      if(shell)shell.inert=false;
      dismiss();
    }
    function releaseHistory(){
      if(!manifest)return;
      const entries=manifest.releases.filter(x=>x.published===true)
        .sort((a,b)=>-compare(a.version,b.version));
      draw("AVA Recruit 更新紀錄",entries.flatMap(x=>
        [x.version+" · "+x.title,...x.changes]),[
          {label:"關閉",onClick:()=>{resetLock()}}
        ],false);
    }
    historyButton.onclick=releaseHistory;
    function onCurrent(data){
      const release=data.releases.find(x=>x.published&&x.version===current);
      if(!release)return;
      const last=storage.getItem(KEY);
      if(!last){
        storage.setItem(KEY,release.id);
        storage.setItem(ACK,release.id);
        return;
      }
      storage.setItem(KEY,release.id);
      if(last===release.id||storage.getItem(ACK)===release.id)return;
      const unseen=data.releases.filter(x=>x.published&&
        compare(x.version,current)!==1&&
        (compare(x.version,(data.releases.find(r=>r.id===last)||{}).version)===1));
      const notes=unseen.length?unseen.flatMap(x=>[x.title,...x.changes]):release.changes;
      draw("更新通知 · AVA Recruit "+current,notes,[
        {label:"了解，開始使用",onClick:()=>{
          storage.setItem(ACK,release.id);resetLock();
        }},
        {label:"更新紀錄",onClick:releaseHistory}
      ]);
    }
    async function forceUpdate(data){
      const release=data.releases.find(x=>x.published&&x.version===data.currentVersion);
      if(!release)return;
      draw("必須更新 · AVA Recruit "+data.currentVersion,
        [release.title,...release.changes],[
          {label:"立即更新",onClick:async()=>{
            const editor=getEditor();
            if(editor&&editor.isDirty&&editor.isDirty()){
              if(!win.confirm("你有未保存嘅流程修改。先保存到本機，然後更新？"))return;
              try{editor.save()}catch(_){return}
            }
            // One attempt per target per browsing session prevents reload storms.
            if(win.sessionStorage.getItem(GUARD)===release.id){
              const msg=overlayNode().querySelector("#recruitReleaseBody");
              const p=doc.createElement("p");
              p.textContent="更新未完成。請檢查網絡，稍後重新開啟 App。";
              msg.appendChild(p);
              return;
            }
            win.sessionStorage.setItem(GUARD,release.id);
            try{
              const registration=await win.navigator.serviceWorker?.getRegistration?.();
              if(registration)await registration.update();
            }catch(_){}
            win.location.reload();
          }}
        ],true);
    }
    async function check(){
      if(!win.navigator.onLine)return "offline";
      try{
        const url=new URL("releases.json",win.location.href);
        if(url.origin!==win.location.origin)return "invalid-origin";
        const response=await win.fetch(url,{cache:"no-store",credentials:"same-origin"});
        if(!response.ok)return "unavailable";
        const data=await response.json();
        if(!valid(data))return "invalid-manifest";
        manifest=data;
        const versionCompare=compare(data.currentVersion,current);
        if(versionCompare===1){await forceUpdate(data);return "update-required"}
        if(versionCompare===0){onCurrent(data);return "current"}
        return "older";
      }catch(_){return "unavailable"}
    }
    const onReturn=()=>{
      if(doc.visibilityState==="visible")check();
    };
    doc.addEventListener("visibilitychange",onReturn);
    win.addEventListener("online",()=>check());
    check();
    return {check,history:releaseHistory};
  }
  return Object.freeze({compare,valid,create,KEY,ACK});
});
