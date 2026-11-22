(function () {
  "use strict";
  const C = window.RECRUIT_CONTENT, E = window.RecruitEngine;
  let cloudCatalog = null;
  let cloudStatus = "pending";
  const KEYS = { sessions: "ava:recruit:sessions:v2", active: "ava:recruit:active-session:v2", settings: "ava:recruit:user-settings:v2", admin: "ava:recruit:admin-preview:v2" };
  const steps = ["welcome","ideal","why-three","employment","satisfaction","stay-reason","desired-work","change-interest","financial-work","financial-tradeoff","discovery-recap","industry-prospects","industry","ava-method","career-ladder","career-tradeoff","path-choice","paths","income-intro","package-guide","income-input","income-result","career-compare","reflection","complete"];
  const pages = {
    welcome:`<div class="hero-card"><span class="eyebrow">CAREER DISCOVERY</span><h1>先了解你想要嘅工作，<br>再了解保險業。</h1><p>呢個流程唔係要證明你適合。可能適合，亦可能唔適合；重點係將工作內容、可能得到嘅嘢同需要承擔嘅代價一齊看清楚。</p><div class="hero-actions"><button class="primary-button" data-next>開始探索</button><button class="secondary-button" id="resumeButton" hidden>繼續上次進度</button></div></div>`,
    ideal:q("01 · 我的理想工作","如果唔考慮工種，你理想中一份工作最重要係啲乜？","先揀最重要 3 項。選項只係幫你表達自己，冇標準答案。",`<div class="option-grid" id="idealOptions"></div><div class="selection-status" id="idealStatus">已選 0／3</div>`,true,"講下點解重要"),
    employment:q("02 · 現時工作","你而家有冇一份主要工作？","",`<div class="single-options" id="employmentOptions"><button class="choice-card" data-value="employed">有，目前有主要工作</button><button class="choice-card" data-value="not-employed">暫時冇／情況不同</button></div>`,true,"繼續"),
    "why-three":q("01 · 最重要嘅三點","點解你揀呢三樣？","逐項講吓原因，等我哋真正了解對你嚟講有乜意義。",`<div id="whyThreeFields" class="interview-questions"></div>`,false,"了解現職情況",true),
    satisfaction:q("02 · 現時工作","而家份工，能唔能夠滿足你呢三個要求？","逐項睇吓現況，唔係為你評分。",`<div id="satisfactionFields" class="interview-questions"></div>`,false,"點解仍然做呢份工？",true),
    "stay-reason":q("02 · 現時工作","點解你依然選擇做呢份工？","即使未能完全滿足，可能都有其他值得保留嘅原因。",`<label class="interview-label" for="stayReasonInput">主要原因（可留空，面談討論）</label><textarea id="stayReasonInput" rows="4" maxlength="800" placeholder="例如收入穩定、家庭責任、同事、暫時未有其他機會……"></textarea>`,false,"探索改變意願",true),
    "change-interest":q("03 · 轉變意願","如果有工作更接近呢三點，你會唔會想了解？","唔需要即刻決定轉工，冇標準答案。",`<div class="single-options" id="interestOptions"><button class="choice-card" data-value="yes">想，願意了解新機會</button><button class="choice-card" data-value="maybe">未決定，想了解多啲</button><button class="choice-card" data-value="no">暫時唔想轉變</button></div>`,true,"了解理財策劃工作"),
    "desired-work":q("03 · 理想工作","真係搵嘅話，邊種類型嘅工作最吸引你？","由你想要嘅工作出發，唔預設理財行業一定適合。",`<div class="single-options" id="desiredOptions"><button class="choice-card" data-value="employee">受僱工作，制度及職責清晰</button><button class="choice-card" data-value="professional">專業顧問，以知識服務客戶</button><button class="choice-card" data-value="business">自主經營，建立個人事業</button><button class="choice-card" data-value="flexible">工作時間較靈活，逐步發展</button><button class="choice-card" data-value="unsure">仲未有特定方向</button></div><label class="interview-label" for="desiredDetailInput">你心目中嘅工作（可選填）</label><textarea id="desiredDetailInput" rows="3" maxlength="600" placeholder="例如想去邊個行業、想有乜唔同……"></textarea>`,false,"看看有冇興趣了解新機會",true),
    "financial-work":q("04 · 理財策劃工作","理財策劃工作，實際上係做乜？","認識工作內容後，再判斷有冇機會符合你嘅三項要求。",`<div class="prospect-grid"><article class="prospect-card"><h3>了解客戶</h3><p>聆聽人生目標、家庭需要及現有財務保障。</p></article><article class="prospect-card"><h3>分析及規劃</h3><p>理解醫療、危疾、儲蓄及退休需要，按規定提供合適方案。</p></article><article class="prospect-card"><h3>長期服務</h3><p>定期保障檢視、跟進變化、協助索償及維繫關係。</p></article></div><p class="disclaimer">工作亦涉及主動開拓客戶、專業學習、合規要求同不穩定收入。</p>`,false,"睇得到同付出",true),
    "financial-tradeoff":q("04 · 理財工作嘅取捨","可能得到啲乜？又需要付出啲乜？","同樣用「得到 × 代價」去了解理財工作，不預設你一定適合。",`<div id="firstCareerTradeoffs" class="comparison-grid"></div><p class="disclaimer">你可以選擇繼續了解，亦可以維持現況，唔需要作招聘承諾。</p>`,false,"整理探索結果",true),
    "discovery-recap":q("第一階段 · 職業探索","先整理你想要嘅工作，再了解另一個選擇","你所重視嘅價值，會係接落嚟判斷理財策劃工作係咪適合自己嘅參考，而唔係由 App 幫你評分。",`<div class="discovery-journey" aria-label="職業探索流程"><div class="discovery-node">理想工作<span>選出你最重視嘅三項</span></div><div class="discovery-node">現時工作<span>你已經擁有啲乜</span></div><div class="discovery-node">取捨分析<span>得到同代價一齊睇</span></div></div><div id="discoveryRecap" class="discovery-recap"></div><p class="disclaimer">以上係你自己嘅探索答案，冇自動配對結論。下一階段只係了解行業前景、職級及工作模式，唔代表轉工決定。</p>`,false,"了解理財策劃行業前景",true),
    "industry-prospects":q("第二階段 · 行業前景","理財策劃，點解有長期發展空間？","由客戶人生需要、專業角色同事業累積角度理解行業；以下係工作模式分析，唔係市場增長或收入保證。",`<div class="prospect-grid"><article class="prospect-card"><span class="step-label">01 · NEEDS</span><h3>人生不同階段，都有唔同需要</h3><p>由個人保障、家庭、教育、醫療，到退休同企業風險，需求會隨人生階段改變。</p></article><article class="prospect-card"><span class="step-label">02 · SERVICE</span><h3>一次投保以外，仲有持續服務</h3><p>保障檢視、情況改變、索償支援同退休規劃，帶來持續與客戶溝通嘅工作機會。</p></article><article class="prospect-card"><span class="step-label">03 · SKILLS</span><h3>專業能力可以逐步累積</h3><p>產品理解、風險分析、客戶溝通、轉介服務與團隊合作，都需要時間建立。</p></article></div><div class="prospect-caution"><strong>發展空間 ≠ 保證成功</strong><p>客戶開拓、合規、持續學習、收入波動及個人投入，都係必須一併了解嘅現實。</p></div>`,false,"了解實際理財業務",true),
    industry:q("04 · 真正了解保險業","保險工作，實際服務緊邊啲需要？","工作唔只係介紹一種產品，而係理解個人、家庭、生活及企業面對嘅不同風險。個別產品／服務能否正式提供，仍以公司最新制度及 Admin 核實內容為準。",`<div class="story-grid" id="industryGroups"></div><h3>人生同需要會一路改變</h3><div class="journey" id="lifeJourney"></div><p class="callout">有保單 ≠ 所有需要都已經處理好。專業工作係了解現況 → Review → 分析 → 發現需要 → 呈現差距，再由客戶自己決定。</p>`,false,"睇 AVA 工作方法",true),
    "ava-method":q("04 · AVA 方法","將複雜問題，變成客戶容易理解嘅一步一步","AVA 唔只係 Apps；佢係由現況、目標、數字差距到自主決定嘅工作方法。",`<div class="method-grid" id="methodCards"></div>`,false,"了解職業發展路線",true),
    "career-ladder":q("第二階段 · 職級及發展","由學習專業，到個人業務，再到管理發展","先理解工作發展嘅方向，避免用未核實嘅職級名稱、晉升年期或收入承諾。",`<div class="career-ladder" id="careerLadder"><div class="ladder-step"><div class="ladder-index">01</div><div><h3>新人入門 · New Agent</h3><p>完成適用培訓及資格要求，學習產品、服務流程、客戶溝通與業務紀律。</p></div></div><div class="ladder-step"><div class="ladder-index">02</div><div><h3>個人業務發展</h3><p>建立客戶基礎、持續跟進、保障檢視、累積轉介及個人專業能力。</p></div></div><div class="ladder-step"><div class="ladder-index">03</div><div><h3>管理方向 · AUM／團隊發展</h3><p>有意向並符合公司正式要求，可進一步了解團隊、招聘、培訓與管理責任。</p></div></div></div><p class="disclaimer">以上為職涯里程碑，唔代表完整 AIA 官方職級階梯。AUM 以外嘅正式職級、晉升條件、年資及待遇，必須待官方資料核實後先展示。</p>`,false,"比較行業機會同挑戰",true),
    "career-tradeoff":q("05 · 得到 × 代價","保險事業都要用同一把尺去看","唔只講可能得到嘅嘢，亦同時睇背後需要承擔嘅要求。",`<div class="comparison-grid" id="careerTradeoffs"></div>`,false,"睇如何開始",true),
    "path-choice":q("06 · 如何開始","如果你覺得呢個行業有值得了解嘅地方，你比較想用咩方式探索？","",`<div class="single-options" id="pathOptions"><button class="choice-card" data-value="flexible"><strong>漸進發展／Flexible Path</strong><small>保留主要收入來源，邊學習、邊體驗，再決定下一步。</small></button><button class="choice-card" data-value="fulltime"><strong>全力發展／Full-time Path</strong><small>將主要時間投入專業、客戶基礎及事業發展。</small></button><button class="choice-card" data-value="unknown"><strong>我仲未知道</strong><small>先用相同框架比較兩種模式。</small></button></div>`,true,"比較 Career Path"),
    paths:q("06 · 雙 Career Path","兩種投入方式，冇高低之分","",`<div class="path-grid" id="pathCards"></div><div id="availabilityPanel" class="availability-panel" hidden><h3>Flexible Path 現實時間盤點</h3><div class="field-grid"><label>每星期可投入時間<input id="hoursInput" type="number" min="0" max="80" inputmode="numeric" placeholder="例如 8"></label><label>平日晚間<select id="eveningInput"><option value="">請選擇</option><option>大部分可以</option><option>部分日子可以</option><option>較難安排</option></select></label><label>週末<select id="weekendInput"><option value="">請選擇</option><option>大部分可以</option><option>部分時間可以</option><option>較難安排</option></select></label><label>個人／家庭限制<input id="constraintInput" maxlength="120" placeholder="可選填"></label></div><div class="mini-timeline">${["現在","探索期","學習","建立基礎","評估點","再決定"].map(x=>`<span>${x}</span>`).join("")}</div></div>`,false,"了解收入模式",true),
    "income-intro":q("07 · Income Simulator","收入由邊度形成？","",`<div class="income-formula"><span>個人業務</span><b>＋</b><span>適用津貼</span><b>＋</b><span>持續發展收入</span><b>＋</b><span>適用獎勵／管理發展</span></div><p class="disclaimer">具體項目按現有正式 Recruit Engine、所選計劃及輸入假設計算。模擬結果並非收入保證。</p>`,false,"建立簡單情境"),
    "package-guide":q("07 · Recruitment Packages","三個招聘方案，先了解再選擇","比較津貼選項、入職資格與計算方式。以下根據現有 Recruit 資料展示，並非已核實的最新公司招聘條款。",`<div class="package-grid" id="packageCards" aria-label="招聘方案選擇"></div><div class="package-comparison"><h3>三個方案比較</h3><div class="table-wrap" tabindex="0" aria-label="招聘方案比較表"><table><thead><tr><th>項目</th><th>FP12</th><th>PA18</th><th>TTFS</th></tr></thead><tbody><tr><th>每月 MB 選項</th><td>$10k／$15k／$20k／$30k</td><td>$10k／$15k／$20k／$30k／$40k／$50k</td><td>$25k／$40k／$60k／$80k</td></tr><tr><th>引擎計算年期</th><td>第 1 年，最多 12 個月</td><td>第 1 年 12 個月；第 2 年 6 個月</td><td>首 3 年，每年 12 個月</td></tr><tr><th>配對規則</th><td>FYC／1.25 上限</td><td>FYC／1.5 上限</td><td>引擎按 MB 直接計算</td></tr></tbody></table></div></div><p class="disclaimer">注意：方案資格須另經正式核實，程式不會自動判斷申請人是否合資格。TTFS 目前引擎未完整建模相關門檻與批核條件。所有金額只作情境示範，非收入承諾。</p>`,false,"使用所選方案計算",true),
    "income-input":q("07 · Simple Scenario","先建立第 1 年情境","預設唔放入任何收入假設，由你按實際情況輸入；如要保留原有逐年控制，可展開 7 年詳細設定。",`<div class="sim-grid"><label>Recruitment Package<select id="packageInput"></select></label><label>目標每月津貼（MB）<select id="mbInput"></select></label><label>醫療保費<input id="medInput" inputmode="numeric" value="0"></label><label>危疾保費<input id="ciInput" inputmode="numeric" value="0"></label><label>儲蓄保費<input id="savInput" inputmode="numeric" value="0"></label></div><div id="requirementSummary" class="callout"></div><div class="check-row"><label><input id="continuousInput" type="checkbox"> 連續 MDRT 額外花紅</label><label><input id="excellentInput" type="checkbox"> 卓越顧問花紅</label></div><details id="yearEditor"><summary>查看／設定 7 年詳細業務</summary><div class="table-wrap"><table><thead><tr><th>年份</th><th>醫療</th><th>危疾</th><th>儲蓄</th></tr></thead><tbody id="yearInputs"></tbody></table></div></details>`,false,"計算情境",true),
    "income-result":q("07 · 模擬結果 × 形成條件","結果同要求，要一齊睇","按目前輸入及假設計算的模擬結果，並非收入保證。",`<div id="incomeSummary" class="summary-grid"></div><div id="incomeBreakdown" class="income-breakdown" aria-live="polite"></div><div id="incomeRequirements" class="callout"></div><button class="text-button" id="longViewButton">睇現有正式 7 年預測期</button><div id="longView" hidden><div class="chart" id="incomeChart"></div><details><summary>查看詳細計算</summary><div class="table-wrap"><table><thead><tr><th>年份</th><th>FYC</th><th>MB</th><th>YEB</th><th>MDRT</th><th>續保</th><th>總收入</th><th>累積</th></tr></thead><tbody id="incomeTable"></tbody></table></div></details></div>`,false,"比較 Career Path",true,"修改情境"),
    "career-compare":q("08 · Career Path Comparison","唔只比較人工，亦比較發展結構","",`<div class="salary-inputs"><label>目前月薪<input id="salaryInput" type="number" min="0" inputmode="numeric" placeholder="可選填"></label><label>每年薪酬增長假設 %<input id="growthInput" type="number" min="-100" max="100" step="0.1" value="0"></label><label>每年 Bonus（月數）<input id="bonusInput" type="number" min="0" max="24" step="0.1" value="0"></label></div><div id="careerComparison" class="career-comparison"></div><p class="disclaimer">非量化項目只以 Milestone／Trade-off 描述，不設虛假分數。保險職級名稱只採用現有正式資料已列出的 AUM；其他階段使用工作里程碑描述。</p>`,false,"最後整理",true),
    reflection:q("09 · Reflection","回到你最重視嘅三樣嘢","",`<div id="idealRecap" class="rank-list compact"></div><div id="reflectionFrame" class="reflection-frame"></div><h3>睇完之後，你覺得邊一部分最值得再了解？</h3><div class="option-grid" id="reflectionOptions"></div>`,false,"保存今次探索",true),
    complete:`<div class="hero-card"><span class="eyebrow">REFLECTION SAVED</span><h1>可能適合，亦可能唔適合。</h1><p>你已經保存今次探索。下次可以由目前進度繼續，亦可以切換 Flexible／Full-time Path，前面嘅理想工作與現職資料會保留。</p><div class="hero-actions"><button class="primary-button" id="reviewButton">查看我的整理</button><button class="secondary-button" id="newSessionButton">建立另一個 Session</button></div></div>`
  };
  function q(label,title,support,body,disabled,next,wide,back="返回"){return `<div class="page-control"><button class="secondary-button" data-back>← ${back}</button><span class="page-count" aria-label="當前步驟"></span></div><div class="question-card${wide?" wide":""}"><span class="step-label">${label}</span><h2>${title}</h2>${support?`<p>${support}</p>`:""}${body}</div><div class="flow-actions flow-actions--below"><button class="primary-button" data-next ${disabled?"disabled":""}>${next}</button></div>`}
  const shell=document.getElementById("flowShell"); shell.innerHTML=`<div id="journeyPhase" class="journey-phase" aria-label="招聘探索階段"></div>`+steps.map(s=>`<section class="flow-page" data-step="${s}">${pages[s]}</section>`).join("");
  let sessions=read(KEYS.sessions,[]), activeId=localStorage.getItem(KEYS.active), mode="recruiter", step="welcome", rankPick=null, result=null;
  let state=fresh();
  let userEditor=null;
  function fresh(){return {id:`candidate-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name:"Candidate",updatedAt:new Date().toISOString(),step:"welcome",ideal:[],employment:"",current:[],reasons:{},satisfaction:{},stayReason:"",changeInterest:"",desiredType:"",desiredDetail:"",path:"",availability:{},income:{packageId:"PA18",mbAmount:10000,years:Array.from({length:7},()=>({med:0,ci:0,sav:0})),continuousMdrt:false,excellentAgent:false},salary:{monthly:0,growth:0,bonus:0},reflection:[]}}
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
  function save(show=false){state.step=step;state.updatedAt=new Date().toISOString();const at=sessions.findIndex(s=>s.id===state.id);if(at>=0)sessions[at]=state;else sessions.unshift(state);localStorage.setItem(KEYS.sessions,JSON.stringify(sessions));localStorage.setItem(KEYS.active,state.id);activeId=state.id;if(show)toast("進度已保存喺呢部裝置")}
  function escape(s){const d=document.createElement("div");d.textContent=String(s??"");return d.innerHTML}
  function money(n){return "$"+Math.round(Number(n)||0).toLocaleString("en-US")}
  function flowSteps(){return userEditor?userEditor.sequence():steps;}
  function go(target){
    const flow=flowSteps();
    if(!flow.includes(target))return;
    step=target;
    const at=flow.indexOf(step);
    const anchor=steps.includes(step)?step:flow.slice(0,at).reverse().find(x=>steps.includes(x))||"welcome";
    const phase=document.getElementById("journeyPhase");
    const phaseIndex=steps.indexOf(anchor)<steps.indexOf("industry-prospects")?0:steps.indexOf(anchor)<steps.indexOf("income-intro")?1:2;
    phase.hidden=step==="welcome"||step==="complete";
    phase.innerHTML=["職業探索","行業前景／職級","方案及收入"].map((name,i)=>
      `<span class="journey-phase-item${i===phaseIndex?" current":""}${i<phaseIndex?" finished":""}"${i===phaseIndex?' aria-current="step"':""}>${i+1}. ${name}</span>`).join("");
    document.querySelectorAll(".flow-page").forEach(p=>p.classList.toggle("active",p.dataset.step===step));
    document.querySelectorAll(`[data-step="${step}"] .page-count`).forEach(el=>{el.textContent=`${at} / ${flow.length-2}`});
    document.getElementById("progressFill").style.width=`${Math.max(0,at)/(flow.length-2)*100}%`;
    render();if(userEditor)userEditor.afterRender();save();window.scrollTo({top:0,behavior:"smooth"});
  }
  function next(){
    const flow=flowSteps(),i=flow.indexOf(step);
    if(step==="employment"&&state.employment!=="employed"){go("desired-work");return}
    if(step==="income-input")compute();
    go(flow[Math.min(i+1,flow.length-1)]);
  }
  function back(){
    const flow=flowSteps(),i=flow.indexOf(step);
    if(step==="desired-work"&&state.employment!=="employed"){go("employment");return}
    go(flow[Math.max(i-1,0)]);
  }
  function optionButtons(items,selected){return items.map(x=>`<button class="option${selected.includes(x)?" selected":""}" data-value="${escape(x)}" aria-pressed="${selected.includes(x)}">${escape(x)}</button>`).join("")}
  function render(){
    if(step==="welcome"){const b=document.getElementById("resumeButton");b.hidden=!activeId;b.onclick=()=>{const s=sessions.find(x=>x.id===activeId);if(s){state=s;go(s.step==="complete"?"reflection":s.step)}}}
    if(step==="ideal")renderMulti("idealOptions",cloudCatalog ? cloudCatalog.idealValues : C.idealValues,state.ideal,"idealStatus");
    if(step==="employment")renderSingle("employmentOptions",state.employment);
    if(step==="why-three")renderWhyThree();
    if(step==="satisfaction")renderSatisfaction();
    if(step==="stay-reason")bindInterviewText("stayReasonInput","stayReason");
    if(step==="change-interest")renderInterviewSingle("interestOptions","changeInterest");
    if(step==="desired-work"){renderInterviewSingle("desiredOptions","desiredType");bindInterviewText("desiredDetailInput","desiredDetail");}
    if(step==="financial-tradeoff")document.getElementById("firstCareerTradeoffs").innerHTML=(cloudCatalog ? cloudCatalog.careerTradeoffs : C.careerTradeoffs).map(([title,gain,cost])=>`<article class="comparison-card"><h3>${escape(title)}</h3><p class="gain"><strong>可能得到：</strong>${escape(gain)}</p><p class="cost"><strong>需要付出：</strong>${escape(cost)}</p></article>`).join("");
    if(step==="industry"){document.getElementById("industryGroups").innerHTML=C.industryGroups.map(g=>`<article class="story-card"><h3>${g.title}</h3><ul>${g.items.map(x=>`<li>${x}</li>`).join("")}</ul></article>`).join("");document.getElementById("lifeJourney").innerHTML=C.lifeJourney.map(x=>`<span>${x}</span>`).join("")}
    if(step==="ava-method")document.getElementById("methodCards").innerHTML=C.avaMethods.map(x=>`<article class="method-card"><h3>${x.title}</h3><p>${x.text}</p><a href="${x.url}" target="_blank" rel="noopener">開啟獨立 AVA Module ↗</a></article>`).join("");
    if(step==="career-tradeoff")document.getElementById("careerTradeoffs").innerHTML=C.careerTradeoffs.map(x=>`<article class="comparison-card"><h3>${x[0]}</h3><p class="gain"><strong>可能得到：</strong><br>${x[1]}</p><p class="cost"><strong>需要承擔：</strong><br>${x[2]}</p></article>`).join("");
    if(step==="path-choice")renderSingle("pathOptions",state.path);
    if(step==="paths")renderPaths();
    if(step==="package-guide")renderPackageGuide();
    if(step==="discovery-recap")renderDiscoveryRecap();
    if(step==="income-input")renderIncomeInput();
    if(step==="income-result")renderIncomeResult();
    if(step==="career-compare")renderCareer();
    if(step==="reflection")renderReflection();
    bindPage();
  }
  function renderMulti(id,items,selected,statusId){const box=document.getElementById(id);box.innerHTML=optionButtons(items,selected);document.getElementById(statusId).textContent=`已選 ${selected.length}／3`;document.querySelector(`[data-step="${step}"] [data-next]`).disabled=selected.length!==3;box.querySelectorAll(".option").forEach(b=>b.onclick=()=>{const v=b.dataset.value,i=selected.indexOf(v);if(i>=0)selected.splice(i,1);else if(selected.length<3)selected.push(v);render();save()})}
  function renderSingle(id,value){const box=document.getElementById(id);box.querySelectorAll("[data-value]").forEach(b=>{b.classList.toggle("selected",b.dataset.value===value);b.setAttribute("aria-pressed",String(b.dataset.value===value));b.onclick=()=>{if(id==="employmentOptions")state.employment=b.dataset.value;else state.path=b.dataset.value;render();save()}});document.querySelector(`[data-step="${step}"] [data-next]`).disabled=!value}
  function renderWhyThree(){
    state.reasons ||= {};
    const box=document.getElementById("whyThreeFields");
    box.innerHTML=state.ideal.map((v,i)=>`<div class="interview-question"><h3>Top ${i+1} · ${escape(v)}</h3><label for="reasonInput${i}">點解呢點對你最重要？</label><textarea id="reasonInput${i}" data-reason-index="${i}" rows="3" maxlength="600" placeholder="可以喺面談時再補充"></textarea></div>`).join("");
    box.querySelectorAll("[data-reason-index]").forEach(el=>{const v=state.ideal[Number(el.dataset.reasonIndex)];el.value=state.reasons[v]||"";el.oninput=()=>{state.reasons[v]=el.value;save()};});
  }
  function renderSatisfaction(){
    state.satisfaction ||= {};
    const box=document.getElementById("satisfactionFields");
    const options=[["yes","能夠滿足"],["partial","部分滿足"],["no","未能滿足"],["unsure","未確定"]];
    box.innerHTML=state.ideal.map((v,i)=>`<fieldset class="interview-question"><legend>Top ${i+1} · ${escape(v)}</legend><p>${escape(state.reasons?.[v]||"你可以根據實際工作情況選擇。")}</p><div class="satisfaction-options">${options.map(([id,label])=>`<label><input type="radio" name="satisfaction${i}" value="${id}" data-satisfaction-index="${i}" ${state.satisfaction[v]===id?"checked":""}><span>${label}</span></label>`).join("")}</div></fieldset>`).join("");
    const next=document.querySelector('[data-step="satisfaction"] [data-next]');
    const validate=()=>{next.disabled=state.ideal.some(v=>!state.satisfaction[v])};
    box.querySelectorAll("[data-satisfaction-index]").forEach(el=>el.onchange=()=>{state.satisfaction[state.ideal[Number(el.dataset.satisfactionIndex)]]=el.value;validate();save()});
    validate();
  }
  function bindInterviewText(id,key){
    const el=document.getElementById(id);el.value=state[key]||"";el.oninput=()=>{state[key]=el.value;save()};
  }
  function renderInterviewSingle(id,key){
    const box=document.getElementById(id);
    box.querySelectorAll("[data-value]").forEach(button=>{const selected=state[key]===button.dataset.value;button.classList.toggle("selected",selected);button.setAttribute("aria-pressed",String(selected));button.onclick=()=>{state[key]=button.dataset.value;renderInterviewSingle(id,key);save()};});
    if(step==="change-interest")document.querySelector('[data-step="change-interest"] [data-next]').disabled=!state[key];
  }
  function renderPaths(){document.getElementById("pathCards").innerHTML=Object.entries(C.paths).map(([id,p])=>`<article class="path-card${state.path===id?" active":""}"><h3>${p.title}</h3><p>${p.intro}</p><div class="two-sides"><div><strong>可能得到</strong><ul>${p.gets.map(x=>`<li>${x}</li>`).join("")}</ul></div><div><strong>需要交換</strong><ul>${p.costs.map(x=>`<li>${x}</li>`).join("")}</ul></div></div><button class="secondary-button full" data-path-switch="${id}">查看呢條 Path</button></article>`).join("");const panel=document.getElementById("availabilityPanel");panel.hidden=state.path==="fulltime";["hours","evening","weekend","constraint"].forEach(k=>{const el=document.getElementById(k+"Input");if(el){el.value=state.availability[k]||"";el.onchange=()=>{state.availability[k]=el.value;save()}}})}
  function renderPackageGuide(){
    const box=document.getElementById("packageCards");
    box.innerHTML=Object.entries(C.packages).map(([id,p])=>{
      const amounts=E.MB_OPTIONS[id];
      const selected=state.income.packageId===id;
      return `<article class="package-card${selected?" selected":""}"><div class="package-card-heading"><span class="step-label">RECRUITMENT PACKAGE</span><h3>${escape(p.name)}</h3></div><p class="package-eyebrow">每月 MB 可選金額</p><strong class="package-amount">${money(amounts[0])} – ${money(amounts[amounts.length-1])}</strong><p class="package-caption">以程式現有 MB 選項作展示，並非可獲批津貼。</p><h4>入職資格（待官方核實）</h4><p>${escape(p.qualification)}</p><h4>計算方式</h4><p>${escape(p.matching)}</p><button type="button" class="${selected?"primary-button":"secondary-button"} package-select" data-package="${id}" aria-pressed="${selected}" aria-label="選擇 ${id} 方案">${selected?"✓ 已選擇":"選擇此方案"}</button></article>`;
    }).join("");
    box.querySelectorAll("[data-package]").forEach(button=>button.onclick=()=>{
      const id=button.dataset.package;
      state.income.packageId=id;
      if(!E.MB_OPTIONS[id].includes(state.income.mbAmount))state.income.mbAmount=E.MB_OPTIONS[id][0];
      save();renderPackageGuide();
    });
  }
  function renderDiscoveryRecap(){
    const box=document.getElementById("discoveryRecap");
    if(!box)return;
    const labels={yes:"能夠滿足",partial:"部分滿足",no:"未能滿足",unsure:"未確定"};
    const desire={employee:"受僱工作",professional:"專業顧問",business:"自主經營",flexible:"靈活工作",unsure:"未有特定方向"};
    const interest={yes:"願意了解新機會",maybe:"想再了解",no:"暫時唔想轉變"};
    box.innerHTML=`<div class="recap-column"><h3>你最重視嘅 Top 3</h3>${(state.ideal||[]).map((v,i)=>`<p><strong>Top ${i+1} · ${escape(v)}</strong><span class="recap-detail">${escape(state.reasons?.[v]||"未填寫原因")}</span></p>`).join("")}</div><div class="recap-column"><h3>現職實況與下一步</h3>${state.employment==="employed"?(state.ideal||[]).map(v=>`<p><strong>${escape(v)}</strong>：${escape(labels[state.satisfaction?.[v]]||"未選擇")}</p>`).join("")+`<p><strong>繼續做嘅原因：</strong>${escape(state.stayReason||"面談補充")}</p>`:"<p>目前未有主要工作／情況不同</p>"}<p><strong>轉變意願：</strong>${escape(interest[state.changeInterest]||"未選擇")}</p><p><strong>偏好工作：</strong>${escape(desire[state.desiredType]||"未選擇")}</p>${state.desiredDetail?`<p>${escape(state.desiredDetail)}</p>`:""}</div>`;
  }
  function renderIncomeInput(){const p=document.getElementById("packageInput");p.innerHTML=Object.keys(E.MB_OPTIONS).map(x=>`<option>${x}</option>`).join("");p.value=state.income.packageId;p.onchange=()=>{state.income.packageId=p.value;state.income.mbAmount=E.MB_OPTIONS[p.value][0];renderIncomeInput();save()};const mb=document.getElementById("mbInput");mb.innerHTML=E.MB_OPTIONS[p.value].map(x=>`<option value="${x}">${money(x)}</option>`).join("");mb.value=state.income.mbAmount;mb.onchange=()=>{state.income.mbAmount=Number(mb.value);requirements();save()};[["medInput","med"],["ciInput","ci"],["savInput","sav"]].forEach(([id,k])=>{const el=document.getElementById(id);el.value=state.income.years[0][k];el.oninput=()=>{state.income.years[0][k]=Number(el.value.replace(/\D/g,""))||0;requirements();save()}});[["continuousInput","continuousMdrt"],["excellentInput","excellentAgent"]].forEach(([id,k])=>{const el=document.getElementById(id);el.checked=state.income[k];el.onchange=()=>{state.income[k]=el.checked;save()}});const rows=document.getElementById("yearInputs");rows.innerHTML=state.income.years.map((y,i)=>`<tr><td>第 ${i+1} 年</td>${["med","ci","sav"].map(k=>`<td><input data-year="${i}" data-kind="${k}" inputmode="numeric" value="${y[k]||0}" aria-label="第 ${i+1} 年 ${k}"></td>`).join("")}</tr>`).join("");rows.querySelectorAll("input").forEach(el=>el.oninput=()=>{const y=Number(el.dataset.year),k=el.dataset.kind;state.income.years[y][k]=Number(el.value.replace(/\D/g,""))||0;if(y===0){document.getElementById(k==="med"?"medInput":k==="ci"?"ciInput":"savInput").value=state.income.years[y][k]}save()});requirements()}
  function requirements(){const p=state.income.packageId,mb=state.income.mbAmount;document.getElementById("requirementSummary").innerHTML=`<strong>${p} 形成條件</strong><br>${C.packages[p].matching}<br>目前所選 MB：${money(mb)}。<br><small>入職資格：${C.packages[p].qualification}</small>`}
  function compute(){const first={...state.income.years[0]};state.income.years=state.income.years.map((x,i)=>i===0?first:((x.med||x.ci||x.sav)?x:{...first}));result=E.calculate(state.income);save()}
  function renderIncomeResult(){if(!result)compute();const y=result.yearly[1],renew=y.rc+y.renewalBonus;document.getElementById("incomeSummary").innerHTML=[["第 1 年模擬總收入",y.total],["個人業務 FYC",y.fyc],["適用津貼 MB",y.mb],["獎勵及續保",y.yeb+y.mdrt+renew]].map(x=>`<article class="summary-card"><span>${x[0]}</span><strong>${money(x[1])}</strong></article>`).join("");document.getElementById("incomeBreakdown").innerHTML=`<h3>收入組成（第 1 年）</h3><div class="breakdown-grid">${[["FYC 佣金",y.fyc],["MB 津貼",y.mb],["YEB 獎金",y.yeb],["MDRT 獎勵",y.mdrt],["續期佣金",y.rc],["續期獎金",y.renewalBonus]].map(([name,amount])=>`<div class="breakdown-item"><span>${name}</span><strong>${money(amount)}</strong></div>`).join("")}</div><p class="disclaimer">FYC 權重：醫療 25%／危疾 50%／儲蓄 25%。以上係現有引擎模擬，並非實際可獲批佣金、獎勵或津貼。</p>`;const inputs=state.income.years[0];document.getElementById("incomeRequirements").innerHTML=`<strong>形成呢個結果嘅輸入及條件</strong><br>醫療 ${money(inputs.med)} ／ 危疾 ${money(inputs.ci)} ／ 儲蓄 ${money(inputs.sav)}；按正式權重形成 FYC ${money(y.fyc)}。${C.packages[state.income.packageId].matching}`;const max=Math.max(...result.yearly.slice(1).map(x=>x.total),1);document.getElementById("incomeChart").innerHTML=result.yearly.slice(1).map((x,i)=>`<div class="bar-wrap"><small>${money(x.total)}</small><div class="bar" style="height:${x.total/max*170}px"></div><span>Y${i+1}</span></div>`).join("");document.getElementById("incomeTable").innerHTML=result.yearly.slice(1).map((x,i)=>`<tr><td>第 ${i+1} 年</td>${[x.fyc,x.mb,x.yeb,x.mdrt,x.rc+x.renewalBonus,x.total,x.cumulative].map(n=>`<td>${money(n)}</td>`).join("")}</tr>`).join("");document.getElementById("longViewButton").onclick=()=>document.getElementById("longView").hidden=!document.getElementById("longView").hidden}
  function renderCareer(){if(!result)compute();const salary=state.salary.monthly||0,g=state.salary.growth/100,b=state.salary.bonus;const employed=n=>salary*Math.pow(1+g,n-1)*(12+b);document.getElementById("careerComparison").innerHTML=`<article class="career-column"><h3>目前工作</h3><p><strong>Today</strong><br>${salary?money(employed(1))+"／年":"可輸入目前月薪"}</p><p><strong>2 Years</strong><br>${salary?money(employed(2))+"／年":"按現職制度發展"}</p><p><strong>5 Years</strong><br>${salary?money(employed(5))+"／年":"按現職制度發展"}</p><small>較穩定收入結構；時間、晉升及福利受僱傭制度影響。</small></article><article class="career-column"><h3>Flexible Path</h3><p><strong>探索</strong><br>保留主要收入來源</p><p><strong>建立基礎</strong><br>學習、客戶服務與活動並行</p><p><strong>評估點</strong><br>維持／增加投入／全職／停止</p><small>投入較少、速度可能較慢，需要同時管理兩邊時間。</small></article><article class="career-column"><h3>Full-time Path</h3><p><strong>New Agent</strong><br>集中建立專業與客戶基礎</p><p><strong>個人業務</strong><br>發展穩定活動及服務</p><p><strong>Management</strong><br>符合正式要求後可探索 AUM／團隊發展</p><small>第 1 年模擬：${money(result.yearly[1].total)}；收入會波動，並非保證。</small></article>`;[["salaryInput","monthly"],["growthInput","growth"],["bonusInput","bonus"]].forEach(([id,k])=>{const el=document.getElementById(id);el.value=state.salary[k]||0;el.oninput=()=>{state.salary[k]=Number(el.value)||0;renderCareer();save()}})}
  function renderReflection(){document.getElementById("idealRecap").innerHTML=state.ideal.map((x,i)=>`<div class="rank-item"><span class="rank-number">Top ${i+1}</span><strong>${escape(x)}</strong></div>`).join("");document.getElementById("reflectionFrame").innerHTML=`<div><strong>目前工作</strong><p>以你現時得到嘅價值、制度與相應 Trade-off 作判斷。</p></div><div><strong>Flexible Path</strong><p>保留主要收入來源，透過探索期實際驗證。</p></div><div><strong>Full-time Path</strong><p>集中投入，同時承擔收入波動及轉職壓力。</p></div>`;document.getElementById("reflectionOptions").innerHTML=optionButtons(C.reflectionOptions,state.reflection);document.querySelectorAll("#reflectionOptions .option").forEach(b=>b.onclick=()=>{const i=state.reflection.indexOf(b.dataset.value);i>=0?state.reflection.splice(i,1):state.reflection.push(b.dataset.value);renderReflection();save()})}
  function bindPage(){document.querySelectorAll(`[data-step="${step}"] [data-next]`).forEach(b=>b.onclick=next);document.querySelectorAll(`[data-step="${step}"] [data-back]`).forEach(b=>b.onclick=back);document.querySelectorAll(".reveal-card button").forEach(b=>b.onclick=()=>b.parentElement.classList.toggle("revealed"));document.querySelectorAll("[data-rank]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.rank);if(rankPick===null)rankPick=i;else{[state.ideal[rankPick],state.ideal[i]]=[state.ideal[i],state.ideal[rankPick]];rankPick=null;save()}render()});document.querySelectorAll("[data-path-switch]").forEach(b=>b.onclick=()=>{state.path=b.dataset.pathSwitch;renderPaths();save()});const review=document.getElementById("reviewButton");if(review)review.onclick=()=>go("reflection");const newer=document.getElementById("newSessionButton");if(newer)newer.onclick=newSession}
  function openDrawer(id){document.getElementById("drawerBackdrop").hidden=false;document.getElementById(id).classList.add("open");document.getElementById(id).setAttribute("aria-hidden","false");if(id==="sessionDrawer")renderSessions()}
  function closeDrawers(){document.getElementById("drawerBackdrop").hidden=true;document.querySelectorAll(".drawer").forEach(x=>{x.classList.remove("open");x.setAttribute("aria-hidden","true")})}
  function renderSessions(){const box=document.getElementById("sessionList");box.innerHTML=sessions.map(s=>`<article class="session-card"><strong>${escape(s.name||"Candidate")}</strong><small>${new Date(s.updatedAt).toLocaleString("zh-HK")} · ${escape(s.step)}</small><div class="session-actions"><button data-load="${s.id}">繼續</button><button data-rename="${s.id}">改名</button><button data-delete="${s.id}">刪除</button></div></article>`).join("")||"<p>未有已保存 Session。</p>";box.querySelectorAll("[data-load]").forEach(b=>b.onclick=()=>{state=sessions.find(s=>s.id===b.dataset.load);activeId=state.id;closeDrawers();go(state.step)});box.querySelectorAll("[data-rename]").forEach(b=>b.onclick=()=>{const s=sessions.find(x=>x.id===b.dataset.rename),n=prompt("Session 名稱",s.name);if(n){s.name=n.trim().slice(0,50)||s.name;save();renderSessions()}});box.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{if(confirm("刪除呢個本機 Session？")){sessions=sessions.filter(s=>s.id!==b.dataset.delete);localStorage.setItem(KEYS.sessions,JSON.stringify(sessions));renderSessions()}})}
  function newSession(){state=fresh();result=null;activeId=state.id;save();closeDrawers();go("welcome")}
  function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
  document.getElementById("modeButton").onclick=()=>{mode=mode==="recruiter"?"candidate":"recruiter";document.getElementById("modeButton").textContent=mode==="recruiter"?"Recruiter Mode":"Candidate Mode";toast(mode==="recruiter"?"適合 iPad 面對面逐步講解":"內容改以自行探索方式顯示")};document.getElementById("sessionsButton").onclick=()=>openDrawer("sessionDrawer");document.getElementById("settingsButton").onclick=()=>openDrawer("settingsDrawer");document.getElementById("drawerBackdrop").onclick=closeDrawers;document.querySelectorAll(".drawer-close").forEach(b=>b.onclick=closeDrawers);document.getElementById("addSessionButton").onclick=newSession;
  document.querySelectorAll("[data-settings-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-settings-tab]").forEach(x=>x.classList.toggle("active",x===b));document.getElementById("userSettings").hidden=b.dataset.settingsTab!=="user";document.getElementById("adminSettings").hidden=b.dataset.settingsTab!=="admin"});
  const userSettings=read(KEYS.settings,{themeName:C.theme.name,defaultMode:"recruiter"});document.getElementById("brandName").textContent=userSettings.themeName;document.getElementById("themeNameInput").value=userSettings.themeName;document.getElementById("defaultModeInput").value=userSettings.defaultMode;mode=userSettings.defaultMode;document.getElementById("modeButton").textContent=mode==="recruiter"?"Recruiter Mode":"Candidate Mode";document.getElementById("versionText").textContent=C.version;document.getElementById("headerVersion").textContent=C.version;
  document.getElementById("saveUserSettings").onclick=()=>{const x={themeName:document.getElementById("themeNameInput").value.trim()||C.theme.name,defaultMode:document.getElementById("defaultModeInput").value};localStorage.setItem(KEYS.settings,JSON.stringify(x));document.getElementById("brandName").textContent=x.themeName;toast("個人設定已保存")};document.getElementById("resetUserSettings").onclick=()=>{localStorage.removeItem(KEYS.settings);document.getElementById("brandName").textContent=C.theme.name;document.getElementById("themeNameInput").value=C.theme.name;toast("已恢復系統預設")};
  document.getElementById("exportButton").onclick=()=>{const blob=new Blob([JSON.stringify({type:"ava-recruit-backup",version:C.version,sessions,userOverrides:userEditor?userEditor.getSaved():{}},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="ava-recruit-backup.json";a.click();URL.revokeObjectURL(a.href)};document.getElementById("importInput").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(d.type!=="ava-recruit-backup"||!Array.isArray(d.sessions))throw Error();sessions=d.sessions;localStorage.setItem(KEYS.sessions,JSON.stringify(sessions));if(d.userOverrides&&window.RecruitUserEdit){const cleaned=window.RecruitUserEdit.normalise(d.userOverrides);localStorage.setItem(window.RecruitUserEdit.KEY,JSON.stringify(cleaned));}toast("本機備份已匯入");window.location.reload()}catch{toast("備份檔案格式不正確")}};r.readAsText(f)};
  // Never expose local-only password previews as AVA Studio authorization.
  // Official Admin is disabled until server-side ava-admin-session-v1 verification
  // is implemented and production tested. ?avaEntry=admin is not a credential.
  const adminTab=document.querySelector('[data-settings-tab="admin"]');
  adminTab.hidden=true;
  document.getElementById("adminSettings").hidden=true;
  document.getElementById("unlockAdminButton").disabled=true;
  document.getElementById("saveAdminPreview").disabled=true;
  let worker;if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").then(reg=>reg.addEventListener("updatefound",()=>{worker=reg.installing;worker.addEventListener("statechange",()=>{if(worker.state==="installed"&&navigator.serviceWorker.controller)document.getElementById("updateBanner").hidden=false})})).catch(()=>{}));document.getElementById("updateButton").onclick=()=>worker&&worker.postMessage({action:"skipWaiting"});
  if (window.RecruitUserEdit) {
    userEditor=window.RecruitUserEdit.create({
      window,document,storage:localStorage,currentStep:()=>step,
      navigateStep:target=>go(target),baseSteps:steps
    });
  }
  if(activeId){const found=sessions.find(s=>s.id===activeId);if(found)state=found}render();go("welcome");
  const avaEntry=new URLSearchParams(window.location.search).get("avaEntry");
  if(window.RecruitReleases){
    window.RecruitReleases.create({
      window,document,storage:localStorage,
      currentVersion:C.version,
      getEditor:()=>userEditor
    });
  }
  // Cloud data may refresh presentation text only; it never changes Engine,
  // protected package rules, candidate answers, local overrides or the UI shell.
  if (window.RecruitCloud && typeof window.RecruitCloud.load === "function") {
    window.RecruitCloud.load(C).then(snapshot => {
      cloudStatus = snapshot.state;
      if (snapshot.state === "ready") {
        cloudCatalog = snapshot.data;
        if (step === "ideal" || step === "financial-tradeoff") render();
      }
      // Do not show a false "cloud synced" badge while CORS or live data
      // verification remains blocked. Status is for non-visual diagnostics.
      window.RECRUIT_CLOUD_STATUS = cloudStatus;
    }).catch(() => { window.RECRUIT_CLOUD_STATUS = "unavailable"; });
  }
  if(["frontend","user","admin"].includes(avaEntry)){
    const returnButton=document.getElementById("avaReturnButton");
    returnButton.hidden=false;
    returnButton.href=avaEntry==="frontend"?"https://ivancww.github.io/avaplatform/":`https://ivancww.github.io/avaplatform/?avaSurface=${avaEntry}`;
    if(avaEntry==="user" && userEditor) userEditor.start();
    if(avaEntry==="admin"){
      // No role or authority comes from this query string. RecruitAdmin
      // must exchange a one-time, browser-bound AVA Studio proof with GAS.
      if(window.RecruitAdmin)window.RecruitAdmin.open(window,document);
      else toast("Admin 授權模組未能載入");
    }
  }
})();
