(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RecruitUserEdit = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const KEY = "ava:recruit:user-flow-overrides:v1";
  const PAGES = typeof module==="object" && module.exports ? require("./recruit-user-pages.js") : globalThis.RecruitUserPages;
  const EDITABLE = Object.freeze([
    "welcome","ideal","why-three","employment","satisfaction","stay-reason",
    "desired-work","change-interest","financial-work","financial-tradeoff",
    "discovery-recap","industry-prospects","industry","ava-method","career-ladder",
    "career-tradeoff","path-choice","paths","income-intro","package-guide",
    "career-compare","reflection","complete"
  ]);
  const PAGE_ANCHORS = Object.freeze(EDITABLE.filter(step=>step!=="complete"));
  // Financial simulation/input/output and protected package parameters are
  // deliberately NOT editable. User Edit must never mutate Recruit Engine.
  const MAX_TITLE = 100, MAX_SUPPORT = 500, MAX_EXTRA = 800;
  const isRecord = v => !!v && typeof v === "object" && !Array.isArray(v);
  const safeText = (v,limit) => typeof v === "string" &&
    v.length <= limit && !/[<>\u0000-\u001f]/.test(v);
  function normalise(input) {
    if (!isRecord(input)) return {};
    const result = {};
    EDITABLE.forEach(step => {
      const row = input[step];
      if (!isRecord(row)) return;
      const clean = {};
      if (safeText(row.title, MAX_TITLE) && row.title.trim()) clean.title = row.title.trim();
      if (safeText(row.support, MAX_SUPPORT)) clean.support = row.support;
      if (safeText(row.extra, MAX_EXTRA)) clean.extra = row.extra;
      if (Object.keys(clean).length) result[step] = clean;
    });
    result.__pages = PAGES ?
      PAGES.clean(input.__pages,PAGE_ANCHORS) : [];
    return result;
  }
  function create(options) {
    const win = options.window, doc = options.document, storage = options.storage;
    const goStep = options.currentStep;
    const navigateStep = options.navigateStep || (()=>{});
    const baseSteps = options.baseSteps || EDITABLE;
    let saved = {}, staged = {}, enabled = false, preview = false, dirty = false;
    try { saved = normalise(JSON.parse(storage.getItem(KEY) || "{}")); } catch (_) {}
    staged = JSON.parse(JSON.stringify(saved));
    const original = {};
    const shell = doc.getElementById("flowShell");
    const toolbar = doc.createElement("div");
    toolbar.className = "recruit-user-edit-toolbar";
    toolbar.hidden = true;
    toolbar.setAttribute("role","toolbar");
    toolbar.setAttribute("aria-label","我的流程編輯");
    toolbar.innerHTML = '<strong>我的流程 · 原畫面編輯</strong>' +
      '<span id="recruitEditStatus">已保存版本</span>' +
      '<button type="button" id="recruitEditToggle">預覽</button>' +
      '<button type="button" id="recruitEditExtra">新增文字</button>' +
      '<button type="button" id="recruitEditClear">重設此頁</button>' +
      '<button type="button" id="recruitEditSave">一次過保存</button>' +
      '<button type="button" id="recruitEditExit">完成</button>';
    shell.parentNode.insertBefore(toolbar,shell);
    let userPages=null;

    function locate(step) {
      if (!EDITABLE.includes(step)) return null;
      const page = Array.from(doc.querySelectorAll(".flow-page"))
        .find(node => node.dataset.step === step);
      if (!page) return null;
      const card = page.querySelector(".question-card") || page.querySelector(".hero-card");
      if (!card) return null;
      return { page,card,title:card.querySelector("h2, h1"), support:card.querySelector("p") };
    }
    function capture(step, target) {
      if (!original[step] && target) {
        original[step] = {
          title: target.title ? target.title.textContent : "",
          support: target.support ? target.support.textContent : ""
        };
      }
    }
    function repaint() {
      if(userPages)userPages.repaint();
      doc.querySelectorAll(".flow-page").forEach(node => {
        const step = node.dataset.step, target = locate(step);
        if (!target) return;
        capture(step,target);
        const row = (enabled ? staged : saved)[step] || {};
        if (target.title) target.title.textContent = row.title === undefined ? original[step].title : row.title;
        if (target.support) {
          target.support.textContent = row.support === undefined ? original[step].support : row.support;
          target.support.hidden = !target.support.textContent;
        }
        let extra = target.card.querySelector(":scope > .recruit-user-extra");
        if (row.extra && !extra) {
          extra = doc.createElement("p");
          extra.className = "recruit-user-extra";
          // Extra content is User Layer text, not HTML.
          target.card.appendChild(extra);
        }
        if (extra) {
          extra.textContent = row.extra || "";
          extra.hidden = !row.extra;
        }
        const editable = enabled && !preview;
        [target.title,target.support,extra].filter(Boolean).forEach(el => {
          el.contentEditable = String(editable);
          el.classList.toggle("recruit-inline-editable",editable);
          if (editable) {
            el.setAttribute("role","textbox");
            el.setAttribute("aria-label",el===target.title?"編輯標題":el===target.support?"編輯說明":"編輯自訂文字");
          } else {
            el.removeAttribute("role");
            el.removeAttribute("aria-label");
          }
        });
      });
      toolbar.hidden = !enabled;
      const current = goStep();
      const canEdit = EDITABLE.includes(current) && !!locate(current);
      toolbar.querySelector("#recruitEditToggle").textContent = preview ? "返回編輯" : "預覽";
      toolbar.querySelector("#recruitEditExtra").disabled = !canEdit || preview;
      toolbar.querySelector("#recruitEditClear").disabled = !canEdit || preview;
      toolbar.querySelector("#recruitEditSave").disabled = !dirty;
      toolbar.querySelector("#recruitEditStatus").textContent =
        dirty ? "有未保存修改" : preview ? "預覽中" : "已保存版本";
    }
    function stage(step,key,value) {
      if (!EDITABLE.includes(step) || !safeText(value,key==="title"?MAX_TITLE:key==="support"?MAX_SUPPORT:MAX_EXTRA)) return false;
      staged[step] = Object.assign({},staged[step],{[key]:value});
      dirty = true;
      return true;
    }
    function save() {
      const cleaned = normalise(staged);
      storage.setItem(KEY,JSON.stringify(cleaned));
      saved = cleaned;
      staged = JSON.parse(JSON.stringify(saved));
      dirty = false;
      preview = true;
      repaint();
      return true;
    }
    function start() {
      enabled = true;
      preview = false;
      staged = JSON.parse(JSON.stringify(saved));
      dirty = false;
      repaint();
    }
    function close() {
      if (dirty && !win.confirm("有未保存嘅修改，確定放棄？")) return false;
      enabled = false;
      preview = false;
      staged = JSON.parse(JSON.stringify(saved));
      dirty = false;
      repaint();
      return true;
    }
    // A user is editing the real Frontstage, not a parallel settings page.
    shell.addEventListener("input",e => {
      if (!enabled || preview) return;
      const el = e.target, page = el.closest(".flow-page");
      if (!page || !el.matches(".recruit-inline-editable")) return;
      const target = locate(page.dataset.step);
      if (!target) return;
      const key = el===target.title?"title":el===target.support?"support":"extra";
      if (!stage(page.dataset.step,key,el.textContent)) {
        el.textContent = ((staged[page.dataset.step]||{})[key] || "");
      }
      toolbar.querySelector("#recruitEditStatus").textContent = dirty ? "有未保存修改" : "已保存版本";
      toolbar.querySelector("#recruitEditSave").disabled = !dirty;
    });
    toolbar.querySelector("#recruitEditToggle").onclick = () => {preview=!preview;repaint()};
    toolbar.querySelector("#recruitEditExtra").onclick = () => {
      const step=goStep(),target=locate(step);
      if (!target) return;
      stage(step,"extra",(staged[step]||{}).extra||"請在這裡輸入文字");
      repaint();
      const extra=target.card.querySelector(".recruit-user-extra");
      if (extra) extra.focus();
    };
    toolbar.querySelector("#recruitEditClear").onclick = () => {
      const step=goStep();
      if (!EDITABLE.includes(step)) return;
      delete staged[step];
      dirty = true;
      repaint();
    };
    if(PAGES){
      userPages=PAGES.create({
        document:doc,window:win,shell,toolbar,baseSteps,anchors:PAGE_ANCHORS,
        currentStep:goStep,navigate:navigateStep,
        getSaved:()=>saved,getStaged:()=>staged,
        markDirty:()=>{dirty=true;
          toolbar.querySelector("#recruitEditSave").disabled=false;
          toolbar.querySelector("#recruitEditStatus").textContent="有未保存修改";},
        isEditing:()=>enabled,isPreview:()=>preview
      });
    }
    toolbar.querySelector("#recruitEditSave").onclick = save;
    toolbar.querySelector("#recruitEditExit").onclick = close;
    win.addEventListener("beforeunload",e=>{
      if (!dirty) return;
      e.preventDefault();
      e.returnValue="";
    });
    repaint();
    return { start,close,save,afterRender:repaint,isEnabled:()=>enabled,isDirty:()=>dirty,
      getSaved:()=>JSON.parse(JSON.stringify(saved)),allowedSteps:EDITABLE,
      sequence:()=>userPages?userPages.sequence():baseSteps,
      containsStep:id=>userPages?userPages.contains(id):baseSteps.includes(id) };
  }
  return Object.freeze({ KEY, EDITABLE, normalise, create });
});
