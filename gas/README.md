# AVA Recruit 獨立 GAS｜資料及安全部署說明

**Owner 目前使用嘅 GAS 已部署唯讀 v1**；倉庫 `gas/Code.gs` 現有新增 Admin 功能係**待部署候選源碼**，不能當成現有正式 GAS 已具備 Admin 權限。

- Sheet： https://docs.google.com/spreadsheets/d/13kT06kYD5v1pea1wcLc0f0j991VEiKHPq0KOgwiRk30/edit
- 現有 GAS `/exec`： https://script.google.com/macros/s/AKfycbzgUnyK9bVOovaj7C5tk4MZXIlTOOnv-Dq4f6KLvk-dWkmk66KkR-yJSVpyyTDAcjUIHA/exec
- App Repo： `ivancww/recruit`；獨立版本候選 `v2.1.2`
- 資料協議：`recruit-dataset-v1`

## API（只有一個有效 doGet 與 doPost）

| 操作 | 方法 | 安全約束 |
|---|---|---|
| `health` | GET | 僅回傳唯讀狀態及公開讀取標誌，不披露 Sheet |
| `catalog` | GET | `PUBLIC_CONTENT_ENABLED=true` 才讀招聘內容 11 個指定分頁 |
| `financial` | GET | `PUBLIC_FINANCIAL_ENABLED=true` 且 content 開啟，才容許讀取財務分頁 |
| `exchangeAdminSession` | POST | Platform 驗證一次性 ticket、nonce、browser proof；不能使用本機密碼 |
| `adminRead` | POST | 須持有 Platform 簽發、尚未過期且 appId=recruit 之証明，GAS 每次 Server-to-Server 驗證 |
| `adminUpdate` | POST | Server 驗證授權、文字欄位白名單、穩定「紀錄代碼」、預期「修訂版」；寫入鎖＋ flush＋精確讀回，失敗嘗試回滾 |
| 其他 POST | POST | 拒絕 |

**管理頁：** 11 個招聘內容分頁＋6 個方案及財務參數分頁，共 17 個中文分類。受保護資格、津貼、佣金、計算及工作價值原始標籤全部只讀。只有 `探索提問`、`理財工作內容`、`理財工作取捨`、`行業前景`、`保障服務範疇`、`職涯發展`、`發展方式` 的批准文字欄位可寫。

## Owner 上線前必要步驟

1. 進入**現有** GAS 專案（上述 `/exec` 對應嘅 Script Project），先備份現有 `Code.gs`，記錄原本部署版本及 Script Properties 名稱；不要建立第二個 Recruit GAS 或刪除任何原來服務。
2. 將經 PR 審核的 `gas/Code.gs` 複製到同一專案；按 `gas/appsscript.json` 使用 V8、`Asia/Hong_Kong`、`spreadsheets` 及 `script.external_request` scopes，完成 Google 官方重新授權。
3. 專案設定 → Script Properties 設定以下**屬性名稱**：
   - `AVA_PLATFORM_ADMIN_ENDPOINT` = **AVA Platform 現行正式 GAS `/exec`**（必須核實，唔可以指向 Recruit 自己）
   - `PUBLIC_CONTENT_ENABLED` = `true`（Owner 已驗證招聘內容 GET，按公開範圍保留）
   - `PUBLIC_FINANCIAL_ENABLED` = `false`（未驗證公司條款，不開放公開財務讀取）
   - `OFFICIAL_DATA_VERSION` = `v1.0.0` 或最新正式資料版本（只代表資料版本，與 Shell 版本分開）
4. 手動執行 `recruitDiagnostic()`，確認 21 個中文分頁無缺漏；再檢查所有 17 個候選 Admin 分頁均已有「紀錄代碼／修訂版」且無重複、無錯位。
5. 為**現有** GAS 部署建立新的不可變版本；修改同一個部署，保留原有 `/exec` URL。
6. 先核對 `health`、`catalog`、`financial`、未知 action；確保舊功能無回歸。用匿名 POST 嘗試 `adminRead`／`adminUpdate` 必須拒絕且 Sheet 無任何修改。
7. AVA Platform GAS 須由 Owner 核實 `AVA_ADMIN_APP_IDS` 確實包含 `recruit`，而 App 在 AVA Studio 經一次登入、一次性 ticket、nonce、browser proof、session exchange、授權讀取、授權寫入、logout/revoke 後確實失效。此前 Platform Registry **不能**宣告 `admin:true`。
8. 使用一筆事先指定、可回復的非財務文字資料，在完全授權的前提下測試 Official Write、修訂版 +1、相同資料 read-after-write，再還原；嚴格確認失敗時沒有誤報已保存。
9. 使用 GitHub Pages 正式 App 於 iPad、HONOR Magic V5 展開、瀏覽器及 PWA 測試；GAS ContentService 可能遇到 Redirect/CORS，不能用直接開啟 GET 的成功代替 App 讀取成功。

## 絕對不能做

- 未登入 AVA Studio 直接使用 `?avaEntry=admin`、從網址複製 ticket、GAS direct URL 或瀏覽器存放密碼取得 Admin 權限。
- 將 `AVA_PLATFORM_ADMIN_ENDPOINT`、管理證明、正式 Script Property 值或敏感 Token 發布在前端或 Repo。
- User Edit 修改 Official 層、計算引擎、招聘方案資格和財務計算。
- 當 GAS 模擬測試通過就聲稱 production write 已持久化。
- 未完成獨立 App、GAS、Admin 實機驗證就將 Recruit 加入 Platform 的 Front／User／Admin Registry。

詳細驗收見 `docs/INTEGRATION-VERIFICATION.md`。
