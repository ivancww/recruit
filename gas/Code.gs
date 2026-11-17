/**
 * AVA Recruit — independent read-only Google Apps Script adapter.
 *
 * Bound source: AVA 招聘及職涯探索｜中文資料庫 (21 Chinese tabs).
 * This file is source only. It has not been deployed or linked to Frontstage.
 *
 * DATA & SECURITY: fail closed. Public reads require explicit Script Properties.
 * Admin authorization is NOT implemented; doPost deliberately denies all writes.
 * Never use ?avaEntry=admin or a client-side password as an authorization token.
 */
const RECRUIT_GAS = Object.freeze({
  appId: 'recruit',
  contractVersion: 'recruit-dataset-v1',
  spreadsheetId: '13kT06kYD5v1pea1wcLc0f0j991VEiKHPq0KOgwiRk30',
  publicContentTabs: Object.freeze([
    '招聘流程', '工作價值選項', '探索提問', '滿足程度選項', '理想工作類型',
    '理財工作內容', '理財工作取捨', '行業前景', '保障服務範疇',
    '職涯發展', '發展方式'
  ]),
  financialTabs: Object.freeze([
    '招聘方案', '津貼金額選項', '佣金計算參數',
    '年終獎勵級距', '專業獎勵級距', '續期佣金規則'
  ]),
  excludedTabs: Object.freeze(['使用說明','參考資料及版本','試算輸入','七年收入試算'])
});

function recruitProperty_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function recruitEnabled_(name) {
  return recruitProperty_(name) === 'true';
}

function recruitResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function recruitError_(code, message) {
  return { ok: false, appId: RECRUIT_GAS.appId,
    contractVersion: RECRUIT_GAS.contractVersion, error: { code: code, message: message } };
}

function recruitTry_(fn) {
  try { return recruitResponse_(fn()); }
  catch (error) {
    // No raw stack trace, spreadsheet IDs or Script Properties in public errors.
    console.error('Recruit GAS request failed: ' + (error && error.message || 'unknown'));
    return recruitResponse_(recruitError_('SERVER_ERROR', '資料服務暫時未能回應'));
  }
}

function recruitAction_(event) {
  const raw = event && event.parameter && event.parameter.action;
  return typeof raw === 'string' ? raw.trim() : '';
}

function recruitReadTab_(sheet, tabName) {
  const target = sheet.getSheetByName(tabName);
  if (!target) throw new Error('Missing required tab: ' + tabName);
  const lastRow = target.getLastRow();
  const lastColumn = target.getLastColumn();
  if (lastRow < 2 || lastColumn < 2 || lastColumn > 20 || lastRow > 2000) {
    throw new Error('Invalid tab dimensions: ' + tabName);
  }
  const values = target.getRange(1, 1, lastRow, lastColumn).getValues();
  const headers = values[0].map(String);
  if (!headers.every(Boolean) || new Set(headers).size !== headers.length) {
    throw new Error('Invalid headers: ' + tabName);
  }
  const items = values.slice(1).filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => Object.fromEntries(headers.map((head, i) => [head, row[i] instanceof Date
      ? Utilities.formatDate(row[i], 'Asia/Hong_Kong', 'yyyy-MM-dd') : row[i]])));
  return { columns: headers, rows: items };
}

function recruitDataset_(includeFinancial) {
  // Exact allowlist prevents disclosure of candidate answers, test inputs,
  // revenue simulation sheets, source references or unrelated future tabs.
  const sheet = SpreadsheetApp.openById(RECRUIT_GAS.spreadsheetId);
  const names = RECRUIT_GAS.publicContentTabs.concat(
    includeFinancial ? RECRUIT_GAS.financialTabs : []
  );
  const tabs = {};
  names.forEach(name => { tabs[name] = recruitReadTab_(sheet, name); });
  const stamp = recruitProperty_('OFFICIAL_DATA_VERSION') || '待核實';
  return {
    ok: true, appId: RECRUIT_GAS.appId,
    contractVersion: RECRUIT_GAS.contractVersion,
    dataVersion: stamp,
    financialIncluded: includeFinancial,
    officialStatus: '非正式公司條款；須以已核實版本為準',
    tabs: tabs
  };
}

/** The only effective GET handler. */
function doGet(e) {
  return recruitTry_(function () {
    const action = recruitAction_(e);
    if (action === 'health') {
      // Deployment readiness is NOT proof of public-data or Admin authorization.
      return { ok: true, appId: RECRUIT_GAS.appId,
        contractVersion: RECRUIT_GAS.contractVersion, status: 'read-only',
        contentEnabled: recruitEnabled_('PUBLIC_CONTENT_ENABLED'),
        financialEnabled: recruitEnabled_('PUBLIC_FINANCIAL_ENABLED') };
    }
    if (action === 'catalog') {
      if (!recruitEnabled_('PUBLIC_CONTENT_ENABLED')) {
        return recruitError_('READ_DISABLED', '招聘內容尚未授權公開讀取');
      }
      return recruitDataset_(false);
    }
    if (action === 'financial') {
      if (!recruitEnabled_('PUBLIC_CONTENT_ENABLED') ||
          !recruitEnabled_('PUBLIC_FINANCIAL_ENABLED')) {
        return recruitError_('FINANCIAL_READ_DISABLED', '招聘待遇資料尚未授權公開讀取');
      }
      return recruitDataset_(true);
    }
    return recruitError_('UNKNOWN_ACTION', '不支援此資料操作');
  });
}

/** The only effective POST handler; no unofficial Admin backdoor. */
function doPost(e) {
  return recruitResponse_(recruitError_('WRITE_FORBIDDEN',
    '官方資料修改必須先通過 AVA Studio 正式授權；目前未啟用寫入'));
}

/** Run manually in the Apps Script editor, not exposed as a web action. */
function recruitDiagnostic() {
  const sheet = SpreadsheetApp.openById(RECRUIT_GAS.spreadsheetId);
  const expected = RECRUIT_GAS.publicContentTabs
    .concat(RECRUIT_GAS.financialTabs, RECRUIT_GAS.excludedTabs);
  const actual = sheet.getSheets().map(tab => tab.getName());
  const missing = expected.filter(name => actual.indexOf(name) < 0);
  const duplicates = expected.filter((name, i) => expected.indexOf(name) !== i);
  const result = {
    appId: RECRUIT_GAS.appId,
    contractVersion: RECRUIT_GAS.contractVersion,
    expectedCount: 21, actualCount: actual.length,
    missing: missing, duplicateNames: duplicates,
    passes: actual.length === 21 && missing.length === 0 && duplicates.length === 0
  };
  console.log(JSON.stringify(result));
  return result;
}
