/* ============================================================
 *  DB.gs — SpreadsheetDB CRUD + Drive フォルダ初期化
 * ============================================================ */

const ALLOWED_DOMAIN = 'accs-c.co.jp';

/** ドメイン認証チェック（全公開関数の先頭で呼ぶ） */
function requireAuth_() {
  const email = Session.getActiveUser().getEmail();
  if (!email || !email.endsWith('@' + ALLOWED_DOMAIN)) {
    throw new Error('アクセス権限がありません。@' + ALLOWED_DOMAIN + ' アカウントでログインしてください。');
  }
  return email;
}

/* ---------- プロパティキー ---------- */
const PROP_SS_ID        = 'DEALCORE_SS_ID';
const PROP_ROOT_FOLDER  = 'DEALCORE_ROOT_FOLDER_ID';
const PROP_CASES_FOLDER = 'DEALCORE_CASES_FOLDER_ID';
const PROP_TPL_FOLDER   = 'DEALCORE_TPL_FOLDER_ID';
const PROP_DB_FOLDER    = 'DEALCORE_DB_FOLDER_ID';

/* ---------- シート名定数 ---------- */
const SHEET_CASES     = 'cases';
const SHEET_FILES     = 'files';
const SHEET_DOCS      = 'documents';
const SHEET_KNOWLEDGE = 'knowledge_index';
// chat_history / advisor_history は CaseChat.gs / Advisor.gs で定義

/* ============================================================
 *  initDB() — 初回セットアップ（手動実行）
 * ============================================================ */
function initDB() {
  requireAuth_();

  const props = PropertiesService.getScriptProperties();

  // --- Driveフォルダ作成 ---
  let rootFolder;
  const rootId = props.getProperty(PROP_ROOT_FOLDER);
  if (rootId) {
    rootFolder = DriveApp.getFolderById(rootId);
  } else {
    rootFolder = DriveApp.createFolder('DealCore');
    props.setProperty(PROP_ROOT_FOLDER, rootFolder.getId());
  }

  const dbFolder    = getOrCreateSubfolder_(rootFolder, '_DB');
  const tplFolder   = getOrCreateSubfolder_(rootFolder, '_Templates');
  const casesFolder = getOrCreateSubfolder_(rootFolder, 'cases');

  props.setProperty(PROP_DB_FOLDER, dbFolder.getId());
  props.setProperty(PROP_TPL_FOLDER, tplFolder.getId());
  props.setProperty(PROP_CASES_FOLDER, casesFolder.getId());

  // テンプレートサブフォルダ
  ['nonname', 'im', 'top-meeting', 'basic-agreement', 'final-contract']
    .forEach(name => getOrCreateSubfolder_(tplFolder, name));

  // --- スプレッドシート作成 ---
  let ss;
  const ssId = props.getProperty(PROP_SS_ID);
  if (ssId) {
    ss = SpreadsheetApp.openById(ssId);
  } else {
    ss = SpreadsheetApp.create('DealCore_DB');
    const file = DriveApp.getFileById(ss.getId());
    file.moveTo(dbFolder);
    props.setProperty(PROP_SS_ID, ss.getId());
  }

  // --- シート作成 ---
  ensureSheet_(ss, SHEET_CASES,
    ['id', 'name', 'seller_name', 'industry', 'phase',
     'summary', 'created_at', 'updated_at']);
  ensureSheet_(ss, SHEET_FILES,
    ['id', 'case_id', 'drive_file_id', 'filename',
     'filetype', 'extracted_text', 'created_at']);
  ensureSheet_(ss, SHEET_DOCS,
    ['id', 'case_id', 'doc_type', 'drive_document_id', 'created_at']);
  ensureSheet_(ss, SHEET_KNOWLEDGE,
    ['id', 'drive_file_id', 'filename', 'folder_path',
     'full_text', 'last_indexed', 'char_count', 'file_modified_time']);
  ensureSheet_(ss, 'chat_history',
    ['id', 'case_id', 'role', 'content', 'created_at']);
  ensureSheet_(ss, 'advisor_history',
    ['id', 'case_id', 'role', 'content', 'advice_type', 'created_at']);

  // デフォルト Sheet1 を削除
  const defSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('シート1');
  if (defSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defSheet);
  }

  Logger.log('initDB 完了: SS=' + ss.getId() + ' Root=' + rootFolder.getId());
  return { ssId: ss.getId(), rootFolderId: rootFolder.getId() };
}

/* ---------- ヘルパー ---------- */

function getOrCreateSubfolder_(parent, name) {
  const iter = parent.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : parent.createFolder(name);
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getSheet_(name) {
  const ssId = PropertiesService.getScriptProperties().getProperty(PROP_SS_ID);
  if (!ssId) throw new Error('DBが未初期化です。initDB()を実行してください。');
  return SpreadsheetApp.openById(ssId).getSheetByName(name);
}

function generateId_() {
  return Utilities.getUuid();
}

function nowISO_() {
  return new Date().toISOString();
}

/* ============================================================
 *  cases CRUD
 * ============================================================ */
function createCase(data) {
  requireAuth_();
  const sheet = getSheet_(SHEET_CASES);
  const id = generateId_();
  const now = nowISO_();
  sheet.appendRow([
    id,
    data.name        || '',
    data.seller_name || '',
    data.industry    || '',
    data.phase       || '1',
    data.summary     || '',
    now, now
  ]);

  // 案件フォルダ作成
  const casesFolderId = PropertiesService.getScriptProperties()
    .getProperty(PROP_CASES_FOLDER);
  if (casesFolderId) {
    const casesFolder = DriveApp.getFolderById(casesFolderId);
    const caseFolder = casesFolder.createFolder(id);
    caseFolder.createFolder('uploads');
    caseFolder.createFolder('outputs');
  }
  return { id: id, created_at: now };
}

function getCases() {
  requireAuth_();
  return sheetToObjects_(getSheet_(SHEET_CASES));
}

function getCaseById(caseId) {
  requireAuth_();
  const rows = sheetToObjects_(getSheet_(SHEET_CASES));
  return rows.find(r => r.id === caseId) || null;
}

function updateCase(caseId, data) {
  requireAuth_();
  const sheet = getSheet_(SHEET_CASES);
  const rows  = sheet.getDataRange().getValues();
  const headers = rows[0];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === caseId) {
      Object.keys(data).forEach(key => {
        const col = headers.indexOf(key);
        if (col >= 0) sheet.getRange(i + 1, col + 1).setValue(data[key]);
      });
      sheet.getRange(i + 1, headers.indexOf('updated_at') + 1)
        .setValue(nowISO_());
      return true;
    }
  }
  return false;
}

function deleteCase(caseId) {
  requireAuth_();
  return deleteRowById_(getSheet_(SHEET_CASES), caseId);
}

/* ============================================================
 *  files CRUD
 * ============================================================ */
function createFile(data) {
  requireAuth_();
  const sheet = getSheet_(SHEET_FILES);
  const id = generateId_();
  sheet.appendRow([
    id,
    data.case_id        || '',
    data.drive_file_id  || '',
    data.filename       || '',
    data.filetype       || '',
    data.extracted_text || '',
    nowISO_()
  ]);
  return { id: id };
}

function getFilesByCase(caseId) {
  requireAuth_();
  return sheetToObjects_(getSheet_(SHEET_FILES))
    .filter(r => r.case_id === caseId);
}

function deleteFile(fileId) {
  requireAuth_();
  return deleteRowById_(getSheet_(SHEET_FILES), fileId);
}

/* ============================================================
 *  documents CRUD
 * ============================================================ */
function createDocument(data) {
  requireAuth_();
  const sheet = getSheet_(SHEET_DOCS);
  const id = generateId_();
  sheet.appendRow([
    id,
    data.case_id           || '',
    data.doc_type          || '',
    data.drive_document_id || '',
    nowISO_()
  ]);
  return { id: id };
}

function getDocumentsByCase(caseId) {
  requireAuth_();
  return sheetToObjects_(getSheet_(SHEET_DOCS))
    .filter(r => r.case_id === caseId);
}

function deleteDocument(docId) {
  requireAuth_();
  return deleteRowById_(getSheet_(SHEET_DOCS), docId);
}

/* ============================================================
 *  knowledge_index CRUD
 * ============================================================ */
function upsertKnowledgeEntry(data) {
  // 内部関数なので認証は呼び出し元で担保
  const sheet = getSheet_(SHEET_KNOWLEDGE);
  const rows  = sheet.getDataRange().getValues();
  const headers = rows[0];
  const driveFileIdCol = headers.indexOf('drive_file_id');

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][driveFileIdCol] === data.drive_file_id) {
      // 更新
      Object.keys(data).forEach(key => {
        const col = headers.indexOf(key);
        if (col >= 0) sheet.getRange(i + 1, col + 1).setValue(data[key]);
      });
      return 'updated';
    }
  }
  // 新規
  const id = generateId_();
  sheet.appendRow([
    id,
    data.drive_file_id     || '',
    data.filename          || '',
    data.folder_path       || '',
    data.full_text         || '',
    data.last_indexed      || nowISO_(),
    data.char_count        || 0,
    data.file_modified_time || ''
  ]);
  return 'added';
}

function deleteKnowledgeByFileId(driveFileId) {
  const sheet = getSheet_(SHEET_KNOWLEDGE);
  const rows  = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][1] === driveFileId) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function getAllKnowledgeIndex() {
  return sheetToObjects_(getSheet_(SHEET_KNOWLEDGE));
}

/* ============================================================
 *  汎用ヘルパー
 * ============================================================ */
function sheetToObjects_(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function deleteRowById_(sheet, id) {
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

/* ============================================================
 *  案件フォルダパス取得
 * ============================================================ */
function getCaseFolderId(caseId) {
  requireAuth_();
  const casesFolderId = PropertiesService.getScriptProperties()
    .getProperty(PROP_CASES_FOLDER);
  if (!casesFolderId) return null;
  const iter = DriveApp.getFolderById(casesFolderId)
    .getFoldersByName(caseId);
  return iter.hasNext() ? iter.next().getId() : null;
}
