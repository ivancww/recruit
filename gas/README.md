# AVA Recruit 專用 GAS（待部署）

## 對應資料來源
- 新建中文 Google Sheet： https://docs.google.com/spreadsheets/d/13kT06kYD5v1pea1wcLc0f0j991VEiKHPq0KOgwiRk30/edit
- App 原始碼：`ivancww/recruit`，現有 Draft PR #3
- 系統代號：`recruit`
- 資料協議：`recruit-dataset-v1`
- 使用繁體中文分頁名、欄位名和展示資料。方案識別代碼 FP12／PA18／TTFS 為既有技術契約，不可直接翻譯成其他 ID。

## Owner 提供的正式連結（2026-11-17）

- GAS Web App：`https://script.google.com/macros/s/AKfycbzgUnyK9bVOovaj7C5tk4MZXIlTOOnv-Dq4f6KLvk-dWkmk66KkR-yJSVpyyTDAcjUIHA/exec`
- 直接測試 GET：在網址後加入 `?action=health`、`?action=catalog` 或 `?action=financial`。
- 對應 Google Sheet：`https://docs.google.com/spreadsheets/d/13kT06kYD5v1pea1wcLc0f0j991VEiKHPq0KOgwiRk30/edit`
- 資料表已確認 21 個繁體中文分頁，與 `recruitDiagnostic` 白名單相符。
- **驗證狀態：BLOCKED**。目前外部瀏覽工具無法存取 `script.google.com`，未能核實正式 GAS 回應、部署權限、Google Redirect 或 source/deployment equivalence；不能把部署 URL 視為正式讀取成功。
- **現有 App 仍使用本地內容及引擎**；不要因為已登記 URL 而啟用跨域讀取或宣稱已同步。
- 正式環境需取得 URL 的 `health` 和 `catalog` 回應，以及確認 `PUBLIC_CONTENT_ENABLED`／`PUBLIC_FINANCIAL_ENABLED` 指令碼屬性值，才可決定下一階段接駁。

## GAS 程式架構
- `Code.gs`：**只有一個有效 `doGet` 及 `doPost`**。
- `GET?action=health`：只回報唯讀狀態，不回傳工作表內容。
- `GET?action=catalog`：在明確開啟 `PUBLIC_CONTENT_ENABLED=true` 後只讀十一個白名單招聘流程分頁。
- `GET?action=financial`：同時要求 `PUBLIC_CONTENT_ENABLED=true` 和 `PUBLIC_FINANCIAL_ENABLED=true`；才讀招聘方案、津貼及六個財務參數分頁。
- `POST`：全部拒絕；**未實作** `ava-admin-session-v1`，不允許用網址、前端密碼或查詢參數代替 AVA Studio 授權。
- 永不讀取「試算輸入」、「七年收入試算」、「使用說明」、「參考資料及版本」或任何求職者私人資料。

## GAS 正式設定（必須由擁有者操作）
1. 已有 Owner 提供的獨立 GAS Web App 網址。先進入該 GAS 專案核實部署版本及編輯器原始碼是否與此倉庫 `gas/Code.gs` 完全一致；不可直接覆蓋現有程式。
2. 若 GAS 原始碼未更新，透過正式專案編輯器以版本管理方式更新，並確認 `gas/appsscript.json` 內 V8、香港時區及唯讀試算表 scope。不要覆蓋其他 App 的 GAS。
3. 在「專案設定 → 指令碼屬性」設定：
   - `PUBLIC_CONTENT_ENABLED=false`（預設不公開）
   - `PUBLIC_FINANCIAL_ENABLED=false`（未核實財務條款不可公開）
   - `OFFICIAL_DATA_VERSION=待核實`
4. 在編輯器手動執行 `recruitDiagnostic()`，按 Google 官方授權流程授權唯讀存取，確認 `passes:true` 及二十一個分頁無缺漏。檢查執行記錄。
5. 先用受限制的測試部署測試 `health`、未知 action、`catalog` 拒絕、`financial` 拒絕及所有 POST 拒絕。不要直接公開部署。
6. 正式招聘文案獲批准後，可以明確開啟 `PUBLIC_CONTENT_ENABLED=true`；財務相關值須完成公司條款／資料來源核對、合規檢查及 Product Owner 授權，先考慮開啟 `PUBLIC_FINANCIAL_ENABLED=true`。
7. 若需要由 GitHub Pages 前端直接讀 GAS，必須實測 ContentService Redirect、CORS／跨域、PWA 快取和資料版本；**不能**因為 GET 測試成功就認定瀏覽器已整合。未測試前，App 繼續使用現有本地資料和計算引擎，不進行假連線或無聲 fallback 改官方參數。

## 資料更新政策
- Sheet 係候選的獨立官方資料來源，**尚未**成為 App 已部署之 Official Layer。
- 調整 Sheet 數據不等於更新正在執行的 Recruit Engine；需要資料契約驗證、版本記錄和計算對照，禁止靜默重寫公式、招聘資格、津貼或佣金。
- 現有 Sheet 所列資格、津貼及獎勵只係原 App 的示範數據，已標示「待官方核實」，不得自稱 AIA 官方現行條款。
- 候選人 Top 3、原因、轉工意向等私人回答保存在設備本機；此 GAS 沒有寫入求職者資料的 endpoint。

## Mother Standard 實施闸口
| 驗收項目 | 狀態 |
|---|---|
| GAS 程式源碼／分頁白名單／JSON 資料契約 | 已加入 PR，待測試 |
| Sheet 分頁名稱與內容 | 已由 Google Sheets 讀取驗證 |
| GAS 專案建立及 Google 授權 | 尚未執行 |
| 真正 GAS 部署版本及 URL | 尚未執行 |
| `doGet`／`doPost` 線上真實路由 | 尚未執行 |
| AVA Studio 一次性授權票據、服務端核實、重播防護 | 未實作，寫入封鎖 |
| 跨域 App 實機讀取、更新／User Layer 保存 | 尚未執行 |

沒有完成所有對應 Gate 之前，唔可以將 Recruit GAS 或 Platform Admin 能力標記為「已正式整合」。
