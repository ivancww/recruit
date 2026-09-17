(function (root) {
  "use strict";
  root.RECRUIT_CONTENT = Object.freeze({
    version: "v2.0.0",
    theme: Object.freeze({ name: "AVA Recruit", subtitle: "Career Discovery & Recruitment Conversation System" }),
    idealValues: Object.freeze(["收入有上升空間", "穩定收入", "時間自主", "工作有意義", "發展／晉升空間", "可以建立自己事業", "團隊環境", "專業成長", "Work-Life Balance", "得到認同", "工作穩定", "公司福利"]),
    currentValues: Object.freeze(["穩定收入", "公司福利", "固定工作時間", "清晰晉升制度", "工作穩定", "團隊支援", "專業身份", "固定假期", "熟悉工作環境", "其他"]),
    tradeoffs: Object.freeze({
      "穩定收入": ["每個月知道大概有幾多收入，生活比較容易安排。", "收入通常按薪酬制度、職級及公司調整，而唔係完全隨個人產出同比例增加。"],
      "公司福利": ["公司可能提供醫療、假期、津貼及其他福利。", "部分福利與僱傭關係、年資或職級連結；當工作或公司改變，福利亦可能改變。"],
      "固定工作時間": ["工作與私人時間較容易預先安排。", "固定時間亦可能限制日間處理個人或家庭事情的彈性。"],
      "清晰晉升制度": ["可以理解下一個職級及一般發展要求。", "晉升名額、時機及要求亦可能受公司制度和組織需要影響。"],
      "工作穩定": ["熟悉制度與收入模式，較容易建立安全感。", "穩定通常亦代表改變速度及個人可控制範圍較有限。"],
      "團隊支援": ["有同事分工及既有資源協助完成工作。", "同時需要配合團隊節奏、協作方式及共同決定。"],
      "專業身份": ["累積經驗、資格及業界認受性。", "需要持續學習，並承擔專業標準和工作責任。"],
      "固定假期": ["假期制度清晰，較容易預先規劃。", "可選日期及日數仍需按公司政策和團隊安排。"],
      "熟悉工作環境": ["工作方式、人際關係及要求相對可預期。", "如果想轉變，離開熟悉環境本身亦需要適應成本。"],
      "其他": ["每個人珍惜現職的原因都可以不同。", "任何得到的價值，都值得一併理解維持它所需的投入和限制。"]
    }),
    industryGroups: Object.freeze([
      { title: "個人與家庭保障", items: ["Medical", "Critical Illness", "Life", "Accident", "Saving", "Education", "Retirement"] },
      { title: "一般保險／生活保障", items: ["Travel Insurance", "Home Insurance", "Motor Insurance", "Domestic Helper", "其他實際可處理的一般保險"] },
      { title: "商業／企業需要", items: ["Office Insurance", "Employee Benefits", "Group Medical", "Employees’ Compensation／相關保障", "Commercial Property", "Liability"] }
    ]),
    lifeJourney: Object.freeze(["一個人", "工作", "建立家庭", "小朋友", "置業／資產", "旅遊／汽車／家居", "創業／公司", "僱員／企業保障", "退休"]),
    avaMethods: Object.freeze([
      { title: "Medical／MedicalClaims／MedSave", text: "由現有保障、保障年期、醫療成本改變，到退休後醫療及保費需要，逐步看清現有安排與需要有冇距離。", url: "https://ivancww.github.io/medicalclaims" },
      { title: "Critical Illness／CI", text: "由保障額、停工期間、家庭支出及資產需要，理解保障是否符合實際生活情況。", url: "https://ivancww.github.io/CIApp" },
      { title: "Saving", text: "由目標、時間及現有方法出發，以設定假設呈現長期結果，讓客戶自己判斷距離。", url: "https://ivancww.github.io/5pay" }
    ]),
    careerTradeoffs: Object.freeze([
      ["收入上升空間", "個人業務發展可帶來較大收入增長空間。", "收入未必固定，需要承受業績波動、建立客戶及持續活動。"],
      ["時間自主", "工作時間有較大自行安排空間。", "需要較高自律及時間管理；客戶可配合時間亦未必等於自己的理想時間。"],
      ["管理／晉升", "可由個人業務逐步發展至管理及建立團隊。", "需要學習 Recruitment、Training、Leadership、Management，並承擔團隊責任。"],
      ["建立自己客戶基礎", "長期累積自己的客戶及 Referral Network。", "初期需要主動建立市場、面對拒絕及持續服務。"]
    ]),
    paths: Object.freeze({
      flexible: { title: "漸進發展／Flexible Path", intro: "保留目前主要收入來源，以較彈性方式了解行業、學習專業知識及體驗工作模式，再決定下一步。", gets: ["保留主要收入來源", "Career Change 風險較低", "有時間實際了解行業"], costs: ["可投入時間較少", "發展速度可能較慢", "同時兼顧兩邊", "晚上／週末可能需要分配時間", "需要更高時間管理能力"] },
      fulltime: { title: "全力發展／Full-time Path", intro: "將主要時間投入保險事業，以較完整時間建立專業、客戶基礎及事業發展。", gets: ["投入時間較完整", "集中建立客戶及專業", "較完整參與培訓及團隊活動", "較多時間建立業務基礎"], costs: ["放棄／降低原有固定收入安全感", "初期收入可能波動", "財務壓力可能較大", "需要較高活動量及自律", "Career Change 心理壓力較高"] }
    }),
    reflectionOptions: Object.freeze(["收入模式", "日常工作", "客戶來源", "AVA 工具如何使用", "新人如何開始", "Flexible Path", "Full-time Path", "晉升／管理", "實際挑戰", "福利／要求", "暫時未覺得適合", "想再考慮"]),
    packages: Object.freeze({
      FP12: { name: "FP12", qualification: "高級文憑／副學士／學位畢業生／AIAPA（豁免入息證明）；持學生簽證的全日制非本地研究生；其他人士過去12個月總收入達 HK$108,000。", matching: "FYC 需達目標 MB 的 1.25 倍；第 1 年最多 12 個月並按比例計算。" },
      PA18: { name: "PA18", qualification: "學士至博士畢業生／AIAPA（豁免入息證明）；或過去12個月收入達 HK$120,000。", matching: "FYCC 需達目標 MB 的 1.5 倍；第 1 年最多 12 個月，第 2 年最多 6 個月並按比例計算。" },
      TTFS: { name: "TTFS", qualification: "為持有高才通（TTPS）／優才（QMAS）簽證人士而設；TTFS25／30 級別可豁免入息證明。", matching: "現有正式 Engine 按所選 MB 在首 3 年計算 12 個月津貼；正式資格及最新條款請由 Admin 核實。" }
    })
  });
})(window);
