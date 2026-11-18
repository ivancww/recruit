(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.RecruitUserPages=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const MAX=12,KEY="__pages";
 const ID=/^user-page-[a-z0-9-]{6,48}$/;
 function clean(input,anchors){
  if(!Array.isArray(input))return[];
  const used=new Set();
  return input.slice(0,MAX).filter(p=>{
   if(!p||typeof p!=="object"||!ID.test(p.id)||used.has(p.id)||
     !anchors.includes(p.after)||typeof p.title!=="string"||!p.title.trim()||
     p.title.length>100||typeof p.text!=="string"||p.text.length>800||
     /[<>\u0000-\u001f]/.test(p.title+p.text))return false;
   used.add(p.id);return true;
  }).map(p=>({id:p.id,after:p.after,title:p.title,text:p.text}));
 }
 function create({document:doc,window:win,shell,toolbar,baseSteps,anchors,currentStep,
   navigate,getSaved,getStaged,markDirty,isEditing,isPreview}){
  const list=()=>isEditing()?getStaged()[KEY]||[]:getSaved()[KEY]||[];
  const sequence=()=>baseSteps.flatMap(step=>[step,...list().filter(p=>p.after===step).map(p=>p.id)]);
  const current=()=>list().find(p=>p.id===currentStep());
  const controls=[
   ["add","新增文字頁"],["up","頁面上移"],["down","頁面下移"],["remove","刪除文字頁"]
  ];
  const buttons={};
  for(const [id,title] of controls){
   const b=doc.createElement("button");b.type="button";b.textContent=title;
   b.id="recruitPage"+id[0].toUpperCase()+id.slice(1);
   toolbar.insertBefore(b,toolbar.querySelector("#recruitEditClear"));
   buttons[id]=b;
  }
  const createSection=entry=>{
   const section=doc.createElement("section");
   section.className="flow-page recruit-user-created-page";
   section.dataset.step=entry.id;
   const nav=doc.createElement("div");nav.className="page-control";
   nav.innerHTML='<button type="button" class="secondary-button" data-back>← 返回</button><span class="page-count" aria-label="當前步驟"></span>';
   const card=doc.createElement("div");card.className="question-card wide";
   const tag=doc.createElement("span");tag.className="step-label";tag.textContent="我的流程 · 自訂文字頁";
   const heading=doc.createElement("h2");heading.className="recruit-custom-title";
   const p=doc.createElement("p");p.className="recruit-custom-body";
   card.append(tag,heading,p);
   const actions=doc.createElement("div");actions.className="flow-actions flow-actions--below";
   const next=doc.createElement("button");next.type="button";next.className="primary-button";
   next.dataset.next="";next.textContent="繼續";
   actions.append(next);section.append(nav,card,actions);
   return section;
  };
  function repaint(){
   const custom=list(),ids=new Set(custom.map(p=>p.id));
   shell.querySelectorAll(".recruit-user-created-page").forEach(el=>{
    if(!ids.has(el.dataset.step))el.remove();
   });
   for(const p of custom){
    let el=Array.from(shell.querySelectorAll(".recruit-user-created-page")).find(x=>x.dataset.step===p.id);
    if(!el){el=createSection(p);shell.appendChild(el)}
    const title=el.querySelector(".recruit-custom-title");
    const body=el.querySelector(".recruit-custom-body");
    if(doc.activeElement!==title||!isEditing()||isPreview())title.textContent=p.title;
    if(doc.activeElement!==body||!isEditing()||isPreview())body.textContent=p.text;
    for(const field of [title,body]){
     const edit=isEditing()&&!isPreview();
     field.contentEditable=String(edit);
     field.classList.toggle("recruit-inline-editable",edit);
     if(edit){field.setAttribute("role","textbox");field.setAttribute("aria-label",field===title?"編輯文字頁標題":"編輯文字頁內容")}
     else{field.removeAttribute("role");field.removeAttribute("aria-label")}
    }
    el.classList.toggle("active",currentStep()===p.id);
   }
   const row=current(),near=row?custom.filter(x=>x.after===row.after):[];
   const at=near.findIndex(x=>x.id===row?.id);
   buttons.add.disabled=!isEditing()||isPreview()||!anchors.includes(currentStep())||custom.length>=MAX;
   buttons.up.disabled=!isEditing()||isPreview()||at<=0;
   buttons.down.disabled=!isEditing()||isPreview()||at<0||at===near.length-1;
   buttons.remove.disabled=!isEditing()||isPreview()||!row;
  }
  shell.addEventListener("input",event=>{
   if(!isEditing()||isPreview())return;
   const el=event.target,section=el.closest(".recruit-user-created-page");
   if(!section||!el.matches(".recruit-inline-editable"))return;
   const record=list().find(x=>x.id===section.dataset.step);
   if(!record)return;
   const field=el.matches(".recruit-custom-title")?"title":"text";
   const value=el.textContent;
   if(value.length>(field==="title"?100:800)||/[<>\u0000-\u001f]/.test(value)){
    el.textContent=record[field];return;
   }
   record[field]=value;markDirty();
  });
  buttons.add.onclick=()=>{
   const after=currentStep();
   if(!anchors.includes(after)||list().length>=MAX)return;
   const id="user-page-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
   getStaged()[KEY]||=[];
   getStaged()[KEY].push({id,after,title:"新增文字頁",text:"點擊此處輸入文字"});
   markDirty();repaint();navigate(id);
  };
  const move=dir=>{
   const row=current();if(!row)return;
   const all=getStaged()[KEY],siblings=all.filter(p=>p.after===row.after);
   const other=siblings[siblings.indexOf(row)+dir];if(!other)return;
   const a=all.indexOf(row),b=all.indexOf(other);
   [all[a],all[b]]=[all[b],all[a]];
   markDirty();repaint();
  };
  buttons.up.onclick=()=>move(-1);
  buttons.down.onclick=()=>move(1);
  buttons.remove.onclick=()=>{
   const row=current();if(!row)return;
   if(!win.confirm("刪除呢個自訂文字頁？未保存前可以取消修改。"))return;
   getStaged()[KEY]=list().filter(x=>x.id!==row.id);
   markDirty();repaint();navigate(row.after);
  };
  return {repaint,sequence,contains:id=>sequence().includes(id)};
 }
 return Object.freeze({KEY,MAX,clean,create});
});
