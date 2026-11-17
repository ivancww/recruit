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

/**
 * AVA Studio Admin uses the native browser-bound ava-admin-session-v1 contract.
 * No client password, query flag or direct GAS URL grants authorization.
 * Scripts Properties: AVA_PLATFORM_ADMIN_ENDPOINT (Platform GAS /exec).
 */
const RECRUIT_ADMIN_EDITABLE = Object.freeze({
  '探索提問': Object.freeze(['問題','備註']),
  '理財工作內容': Object.freeze(['工作內容','實際要求']),
  '理財工作取捨': Object.freeze(['可能得到','需要付出']),
  '行業前景': Object.freeze(['說明','提示']),
  '保障服務範疇': Object.freeze(['範疇','資格提示']),
  '職涯發展': Object.freeze(['主要工作','資格說明']),
  '發展方式': Object.freeze(['可能得到','需要承擔'])
});

function recruitPlatformRequest_(request) {
  const url = recruitProperty_('AVA_PLATFORM_ADMIN_ENDPOINT');
  if (!url || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) {
    throw new Error('PLATFORM_ADMIN_ENDPOINT_NOT_CONFIGURED');
  }
  const raw = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'text/plain;charset=utf-8',
    payload: JSON.stringify(request), muteHttpExceptions: true,
    followRedirects: true
  });
  if (raw.getResponseCode() !== 200) throw new Error('PLATFORM_UNAVAILABLE');
  let parsed;
  try { parsed = JSON.parse(raw.getContentText()); }
  catch (_) { throw new Error('PLATFORM_RESPONSE_INVALID'); }
  if (!parsed || parsed.success !== true) throw new Error('ADMIN_UNAUTHORIZED');
  return parsed;
}

function recruitExchangeAdmin_(body) {
  if (body.appId !== RECRUIT_GAS.appId ||
      !body.launchTicket || !body.launchNonce || !body.browserProof ||
      ![body.launchTicket,body.launchNonce,body.browserProof].every(value =>
        typeof value === 'string' && value.length <= 500)) {
    throw new Error('ADMIN_LAUNCH_PROOF_REQUIRED');
  }
  const result = recruitPlatformRequest_({
    action: 'exchangeAdminSession', appId: RECRUIT_GAS.appId,
    launchTicket: body.launchTicket, launchNonce: body.launchNonce,
    browserProof: body.browserProof
  });
  const expiry = Date.parse(result.expiresAt || '');
  if (result.contract !== 'ava-admin-session-v1' ||
      result.appId !== RECRUIT_GAS.appId ||
      typeof result.adminSessionProof !== 'string' || !result.adminSessionProof ||
      !Number.isFinite(expiry) || expiry <= Date.now()) {
    throw new Error('ADMIN_UNAUTHORIZED');
  }
  return {
    success: true, appId: RECRUIT_GAS.appId,
    contract: 'ava-admin-session-v1',
    adminSessionProof: result.adminSessionProof,
    expiresAt: result.expiresAt
  };
}

function recruitVerifyAdmin_(body, operation) {
  if (body.appId !== RECRUIT_GAS.appId ||
      typeof body.adminSessionProof !== 'string' ||
      !body.adminSessionProof || body.adminSessionProof.length > 3000) {
    throw new Error('ADMIN_UNAUTHORIZED');
  }
  const result = recruitPlatformRequest_({
    action: 'verifyAdminSession',
    appId: RECRUIT_GAS.appId,
    operation: operation,
    adminSessionProof: body.adminSessionProof
  });
  const expiry = Date.parse(result.expiresAt || '');
  if (result.appId !== RECRUIT_GAS.appId ||
      result.operation !== operation ||
      result.contract !== 'ava-admin-session-v1' ||
      !Number.isFinite(expiry) || expiry <= Date.now()) {
    throw new Error('ADMIN_UNAUTHORIZED');
  }
  return result;
}

function recruitAdminRead_(body) {
  recruitVerifyAdmin_(body, 'recruit:official-read');
  const book = SpreadsheetApp.openById(RECRUIT_GAS.spreadsheetId);
  const tabs = {};
  RECRUIT_GAS.publicContentTabs
    .concat(RECRUIT_GAS.financialTabs)
    .forEach(name => { tabs[name] = recruitReadTab_(book,name); });
  return {
    success: true, appId: RECRUIT_GAS.appId,
    contract: 'ava-admin-session-v1',
    data: {
      tabs: tabs,
      editable: RECRUIT_ADMIN_EDITABLE,
      dataVersion: recruitProperty_('OFFICIAL_DATA_VERSION') || '待核實',
      financialReadonly: true
    }
  };
}

function recruitAdminUpdate_(body) {
  const tabName = String(body.tab || '');
  const fields = body.fields;
  const allowed = RECRUIT_ADMIN_EDITABLE[tabName];
  if (!allowed || !fields || typeof fields !== 'object' ||
      Array.isArray(fields) || !Object.keys(fields).length ||
      Object.keys(fields).some(key => allowed.indexOf(key) === -1 ||
        typeof fields[key] !== 'string' || !fields[key].trim() ||
        fields[key].length > 800 || /[<>\u0000-\u001f]/.test(fields[key]))) {
    throw new Error('ADMIN_FIELDS_REJECTED');
  }
  const recordId = String(body.recordId || '');
  const expectedRevision = Number(body.expectedRevision);
  if (!/^\d{2}-\d{4}$/.test(recordId) ||
      !Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
    throw new Error('ADMIN_RECORD_INVALID');
  }
  // Validate actual Platform authorization before requesting any Sheet lock.
  recruitVerifyAdmin_(body,'recruit:official-write:'+tabName);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = SpreadsheetApp.openById(RECRUIT_GAS.spreadsheetId).getSheetByName(tabName);
    if (!sheet) throw new Error('ADMIN_TAB_MISSING');
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(String);
    const idCol = headers.indexOf('紀錄代碼');
    const revisionCol = headers.indexOf('修訂版');
    if (idCol === -1 || revisionCol === -1 ||
        allowed.some(field => headers.indexOf(field) === -1)) {
      throw new Error('ADMIN_SCHEMA_MISMATCH');
    }
    const matches = [];
    for (let i=1;i<values.length;i++) if (String(values[i][idCol]) === recordId) matches.push(i);
    if (matches.length !== 1) throw new Error('ADMIN_RECORD_AMBIGUOUS');
    const row = matches[0] + 1;
    if (Number(values[matches[0]][revisionCol]) !== expectedRevision) {
      throw new Error('ADMIN_STALE_REVISION');
    }
    const keys = Object.keys(fields);
    const snapshots = keys.map(key => {
      const col = headers.indexOf(key)+1;
      const cell = sheet.getRange(row,col);
      if (cell.getFormula()) throw new Error('ADMIN_FORMULA_PROTECTED');
      return {key,col,value:cell.getValue()};
    });
    const revisionCell = sheet.getRange(row,revisionCol+1);
    if (revisionCell.getFormula()) throw new Error('ADMIN_REVISION_PROTECTED');
    const previousRevision = revisionCell.getValue();
    let attempted = false;
    try {
      attempted = true;
      snapshots.forEach(snapshot =>
        sheet.getRange(row,snapshot.col).setValue(fields[snapshot.key]));
      revisionCell.setValue(expectedRevision+1);
      SpreadsheetApp.flush();
      const verified = sheet.getRange(row,1,1,headers.length).getValues()[0];
      const match = String(verified[idCol])===recordId &&
        Number(verified[revisionCol]) === expectedRevision+1 &&
        keys.every(key => String(verified[headers.indexOf(key)]) === fields[key]);
      if (!match) throw new Error('ADMIN_READBACK_MISMATCH');
      return {
        success:true, appId:RECRUIT_GAS.appId,
        contract:'ava-admin-session-v1',
        data:{
          tab:tabName, recordId:recordId,
          recordRevision:expectedRevision+1,
          fields:fields, verifiedFields:keys,
          authoritative:true, persisted:true, readAfterWrite:true
        }
      };
    } catch (error) {
      if (attempted) {
        try {
          snapshots.forEach(snapshot =>
            sheet.getRange(row,snapshot.col).setValue(snapshot.value));
          revisionCell.setValue(previousRevision);
          SpreadsheetApp.flush();
          const restored=sheet.getRange(row,1,1,headers.length).getValues()[0];
          const ok=Number(restored[revisionCol])===Number(previousRevision) &&
            snapshots.every(x=>String(restored[x.col-1])===String(x.value));
          if (!ok) throw new Error('rollback readback mismatch');
        } catch (_) { throw new Error('ADMIN_ROLLBACK_UNVERIFIED'); }
      }
      throw new Error('ADMIN_WRITE_ROLLED_BACK');
    }
  } finally {
    lock.releaseLock();
  }
}

/** The only effective POST handler. Everything else fails closed. */
function doPost(e) {
  let body;
  try { body = JSON.parse(e && e.postData && e.postData.contents || ''); }
  catch (_) { return recruitResponse_(recruitError_('INVALID_JSON','要求格式不正確')); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return recruitResponse_(recruitError_('INVALID_BODY','要求格式不正確'));
  }
  try {
    if (body.action === 'exchangeAdminSession') {
      return recruitResponse_(recruitExchangeAdmin_(body));
    }
    if (body.action === 'adminRead') {
      return recruitResponse_(recruitAdminRead_(body));
    }
    if (body.action === 'adminUpdate') {
      return recruitResponse_(recruitAdminUpdate_(body));
    }
    return recruitResponse_(recruitError_('WRITE_FORBIDDEN',
      '尚未授權官方資料操作'));
  } catch (error) {
    console.error('Recruit official admin operation rejected: ' + (error && error.message || 'unknown'));
    const text = String(error && error.message || '');
    const code = /^ADMIN_[A-Z_]+$/.test(text) ? text : 'ADMIN_REQUEST_REJECTED';
    return recruitResponse_(recruitError_(code,'Admin 驗證或資料更新未能完成'));
  }
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
