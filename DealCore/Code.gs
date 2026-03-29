/* ============================================================
 *  Code.gs — doGet() ルーティング + API エンドポイント
 * ============================================================ */

/** WebApp エントリポイント */
function doGet(e) {
  const email = Session.getActiveUser().getEmail();
  if (!email || !email.endsWith('@' + ALLOWED_DOMAIN)) {
    return HtmlService.createHtmlOutput(
      '<h2 style="color:red;">アクセス拒否</h2>' +
      '<p>@' + ALLOWED_DOMAIN + ' アカウントでログインしてください。</p>' +
      '<p>現在のアカウント: ' + (email || '不明') + '</p>'
    ).setTitle('DealCore - アクセス拒否');
  }

  const page = (e && e.parameter && e.parameter.page) || 'index';

  switch (page) {
    case 'case_detail':
      return serveWithParams_('case_detail', e);
    case 'case_chat':
      return serveWithParams_('case_chat', e);
    case 'chat':
      return serve_('chat_sidebar');
    default:
      return serve_('index');
  }
}

function serve_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
    .setTitle('DealCore - MA仲介支援')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function serveWithParams_(filename, e) {
  var template = HtmlService.createTemplateFromFile(filename);
  template.caseId = (e && e.parameter && e.parameter.id) || '';
  template.tab = (e && e.parameter && e.parameter.tab) || '';
  return template.evaluate()
    .setTitle('DealCore - MA仲介支援')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ============================================================
 *  API エンドポイント（google.script.run から呼ばれる）
 * ============================================================ */

/** ログインユーザー取得 */
function getCurrentUserEmail() {
  return requireAuth_();
}

/** WebApp URL 取得 */
function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

/** ---- 案件 ---- */
function apiGetCases() {
  return getCases();
}

function apiGetCaseById(caseId) {
  return getCaseById(caseId);
}

function apiCreateCase(data) {
  return createCase(data);
}

function apiUpdateCase(caseId, data) {
  return updateCase(caseId, data);
}

function apiDeleteCase(caseId) {
  return deleteCase(caseId);
}

/** ---- ファイル ---- */
function apiGetFilesByCase(caseId) {
  return getFilesByCase(caseId);
}

function apiCreateFile(data) {
  return createFile(data);
}

function apiDeleteFile(fileId) {
  return deleteFile(fileId);
}

function apiUploadFile(caseId, base64Data, filename, mimeType) {
  return uploadFile(caseId, base64Data, filename, mimeType);
}

/** _音声アップロードフォルダの最新ファイルから議事録作成 */
function apiTranscribeFromDrive(caseId) {
  return transcribeFromDrive(caseId);
}

/** ---- ドキュメント ---- */
function apiGetDocumentsByCase(caseId) {
  return getDocumentsByCase(caseId);
}

function apiCreateDocument(data) {
  return createDocument(data);
}

function apiDeleteDocument(docId) {
  return deleteDocument(docId);
}

/** ---- ナレッジ ---- */
function apiGetKnowledgeStats() {
  return getKnowledgeStats();
}

function apiRunIncrementalSync() {
  return incrementalSync();
}

function apiRunFullIndex() {
  return indexAllKnowledge();
}

function apiSearchKnowledge(query, maxChars) {
  requireAuth_();
  return searchKnowledge(query, maxChars);
}

/** ---- 資料作成チャット ---- */
function apiSendChatMessage(caseId, userMessage) {
  return sendChatMessage(caseId, userMessage);
}

function apiGetDocChatHistory(caseId) {
  return getDocChatHistory(caseId);
}

/** ---- 営業方針アドバイザー ---- */
function apiGetAdvice(caseId, userMessage) {
  return getAdvice(caseId, userMessage);
}

function apiGetCaseDiagnosis(caseId) {
  return getCaseDiagnosis(caseId);
}

function apiGetAdvisorHistory(caseId) {
  return getAdvisorHistory(caseId);
}
