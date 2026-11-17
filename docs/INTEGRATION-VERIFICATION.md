# AVA Recruit — Front / User Edit / Admin 接入驗收

**獨立 App：** `ivancww/recruit`（本倉庫持有所有 UI、招聘流程及收入計算）

**官方 Google Sheet：** https://docs.google.com/spreadsheets/d/13kT06kYD5v1pea1wcLc0f0j991VEiKHPq0KOgwiRk30/edit

**現有 GAS Web App：** https://script.google.com/macros/s/AKfycbzgUnyK9bVOovaj7C5tk4MZXIlTOOnv-Dq4f6KLvk-dWkmk66KkR-yJSVpyyTDAcjUIHA/exec

**平台：** `ivancww/avaplatform`；Mother Rules `docs/MOTHER-RULES.md`

**目前 Recruit PR：** #3；**App 版本候選：** v2.1.2；**狀態：未 Merge／未部署，未批准正式整合。**

## 獨立 App 三個入口

| 入口 | 地址 | 設定／實際狀態 |
|---|---|---|
| Front | `https://ivancww.github.io/recruit/index.html?avaEntry=frontend` | 原生顧客招聘流程；不顯示 User 草稿工具或 Admin 權限 |
| User Edit | `https://ivancww.github.io/recruit/index.html?avaEntry=user` | 同一 Frontstage 原畫面修改：標題、說明、自訂文字，預覽、一次 Save Local、重開保留 |
| Admin | `https://ivancww.github.io/recruit/index.html?avaEntry=admin` | 單獨網址只顯示「未獲授權」。須由 AVA Studio 票據、nonce 及 browser proof 進入，後端驗證。**未正式部署驗證** |

## User Edit / Official / Candidate 資料邊界

- User Edit 將修改暫存於記憶體；「預覽」先查看草稿，「一次過保存」後才將 User Overrides 寫入 `ava:recruit:user-flow-overrides:v1`，與求職者 Sessions、正式 Google Sheet 無關。
- 受保護的收入輸入、收入結果、正式方案資格、Recruit Engine 及 GAS 設定不能經 User Edit 修改。新增的是頁內文字，而不是第二套 Frontstage。
- 求職者答案、Session 及個人設定在 App 本機，GAS 不接受求職者資料上載。
- 招聘內容 `catalog` 只讀指定 11 個中文分頁；缺少正式核實的財務參數繼續只使用 App 既有計算。

## Admin 正式接入契約（只適用新 GAS 候選源碼）

1. `ava-admin-session-v1`：使用 AVA Studio 一次登入，帶 appId=`recruit` 的單次 ticket、nonce 及 exact-opener browser proof。
2. Browser 將完整 browser-bound 證據 POST 給 Recruit GAS；GAS 透過 `UrlFetchApp` server-to-server 向 Platform GAS 執行 `exchangeAdminSession`，取得有期限之 proof，Browser 僅保存在記憶體。
3. 每次 `adminRead`、`adminUpdate` 必須由 GAS server-to-server 執行 `verifyAdminSession`，嚴格比對 App ID、contract、operation、expiry。
4. 官方寫入只容許招聘內容中的特定中文欄位。受保護工作價值標籤、方案資格、津貼選項、佣金及所有收入計算欄位皆只讀。
5. 每筆 Google Sheet 官方內容有「紀錄代碼」「修訂版」；寫入由 Script Lock 保護，驗證欄位白名單、穩定 ID、預期修訂版，寫入後 `flush`，再次讀回同筆資料及版號，任何不一致回傳失敗並嘗試回滾。
6. 管理介面以繁體中文分類 tabs、單一紀錄編輯器、草稿變更提示及發佈確認構成；不使用複製 JSON 作編輯器，也不使用額外密碼。
7. Owner 必須先將倉庫 `gas/Code.gs`、`gas/appsscript.json` 部署到**同一個現有 GAS 專案**，設定 Script Property `AVA_PLATFORM_ADMIN_ENDPOINT` 為正式 AVA Platform GAS `/exec`，並在 Platform GAS `AVA_ADMIN_APP_IDS` allowlist 加入 `recruit`，始可做實機 Admin 驗證。**不可公開密碼／Token／Script Property 值。**

## QA 閘口（不得混淆 source / mock / production）

| 閘口 | 狀態 | 證據 / 未完成原因 |
|---|---|---|
| Frontstage 舊 UI 與收入計算 | 自動測試通過（之前版本） | GitHub CI Playwright 路徑與 Recruit Engine 單元測試 |
| Same-Frontstage User Edit / Preview / Save Local | 自動測試通過（之前版本） | Browser 測試在模擬 iPad 運作；真機仍待驗 |
| 本機權限隔離 / 直接 Admin URL 拒絕 | SOURCE 已實作；瀏覽器驗證待最新 CI | 無證據不進 Admin |
| Google Sheet 21 中文分頁 | PASS | 已透過 Google Sheet Connector 讀取 |
| Google Sheet 17 個官方內容/方案分頁 ID 與修訂欄 | PASS（Sheet 來源核對） | 新增「紀錄代碼」「修訂版」；未更動計算公式 |
| GAS catalog | Owner 提供正面測試；跨域仍 BLOCKED | Owner 已確認可以讀；Chat 工具不能確認 production CORS redirect |
| GAS Admin source | SOURCE 已實作，CI mock 測試中 | 尚未部署到現有實際 GAS 版本 |
| GAS production source / deployment version 對照 | BLOCKED | 無 Apps Script 編輯／版本工具和正式授權 |
| Admin 平台 allowlist / session exchange / verifier | NOT TESTED | `AVA_ADMIN_APP_IDS=recruit` 未核實 |
| Admin 官方寫入讀回、版號及回滾 | BLOCKED | 不得用 mock 代表真實 Google Sheet persistence |
| iPad 真機 / HONOR Magic V5 展開 / PWA | NOT VERIFIED | 需要真正部署及實機檢查 |
| 強制更新 / 更新通知 / 紀錄 | SOURCE 已實作；真機未驗 | 使用 App 本身 `releases.json` |
| Platform Registry | **未修改** | 依 Mother Rules，獨立 App 合併、部署與驗收後才註冊 |

## 下一階段

1. PR #3 完成最新 CI、源碼安全審核。
2. Owner 審查後批准 Merge，獨立 GitHub Pages 部署，驗證三入口、User Edit／PWA。
3. Owner 在現有 GAS 專案貼上正式新 Admin 程式及新 Scope，更新同一部署版本，核對 GET/POST 以及 17 個中文 Admin 分頁。
4. Platform GAS 設定 `AVA_ADMIN_APP_IDS` 及伺服器端 live proof 驗證；以可逆、非破壞性資料列驗證 Official Read/Write。
5. 全部 Gate 通過，**才在 AVA Platform 開獨立 PR**，註冊唯一 `recruit` App，按已驗證能力設定 `frontend: true`、`user: true`、`admin: true`；若 Admin 未通過則必須維持 `admin: false`。
6. Platform CI／Browser／實機驗證及獨立 PR Owner 批核；不在未驗證時自行 merge 或 deploy。
