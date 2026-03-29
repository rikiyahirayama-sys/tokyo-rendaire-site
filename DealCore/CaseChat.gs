/* ============================================================
 *  CaseChat.gs — 案件チャット（資料作成モード）バックエンド
 * ============================================================ */

const SHEET_CHAT_HISTORY = 'chat_history';

const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL    = 'claude-sonnet-4-20250514';
const CLAUDE_MAX_TOKENS = 4000;

const SYSTEM_PROMPT_DOCUMENT = 
  'あなたはアックスコンサルティングのMA仲介専門AIアシスタントです。\n' +
  '税理士事務所・社労士事務所・会計事務所の事業承継・M&A仲介に精通しています。\n' +
  '売主（譲渡希望者）の立場を基準として、正確・丁寧・専門的な資料と回答を日本語で作成してください。\n' +
  '過去の成約事例・ヒアリングシート・契約書・IM・セミナー資料などのナレッジを最大限活用して回答の質を高めてください。';

/* ============================================================
 *  buildCaseContext(caseId) — 案件の全情報をテキスト化
 * ============================================================ */
function buildCaseContext(caseId) {
  const caseData = getCaseById(caseId);
  if (!caseData) return '案件情報が見つかりません。';

  const PHASES = {
    '1': 'ノンネーム', '2': 'IM', '3': 'TOP面談',
    '4': '基本合意', '5': '最終契約'
  };

  let ctx = '■ 案件基本情報\n';
  ctx += '案件名: ' + caseData.name + '\n';
  ctx += '売主名: ' + (caseData.seller_name || '未設定') + '\n';
  ctx += '業種: ' + (caseData.industry || '未設定') + '\n';
  ctx += 'フェーズ: ' + (PHASES[String(caseData.phase)] || caseData.phase) + '\n';
  ctx += '概要: ' + (caseData.summary || 'なし') + '\n';
  ctx += '作成日: ' + caseData.created_at + '\n';
  ctx += '最終更新: ' + caseData.updated_at + '\n\n';

  // アップロード済みファイル
  const files = getFilesByCase(caseId);
  if (files.length > 0) {
    ctx += '■ アップロード済みファイル (' + files.length + '件)\n';
    files.forEach(f => {
      ctx += '- ' + f.filename + ' (' + f.filetype + ')\n';
      if (f.extracted_text) {
        const preview = String(f.extracted_text).substring(0, 2000);
        ctx += '  内容: ' + preview + '\n';
      }
    });
    ctx += '\n';
  }

  // 生成済み資料
  const docs = getDocumentsByCase(caseId);
  if (docs.length > 0) {
    ctx += '■ 生成済み資料 (' + docs.length + '件)\n';
    docs.forEach(d => {
      ctx += '- タイプ: ' + d.doc_type + ' (ID: ' + d.drive_document_id + ')\n';
    });
    ctx += '\n';
  }

  return ctx;
}

/* ============================================================
 *  callClaude_(systemPrompt, messages) — Claude API 呼び出し
 * ============================================================ */
function callClaude_(systemPrompt, messages) {
  const apiKey = PropertiesService.getScriptProperties()
    .getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY が設定されていません。スクリプトプロパティを確認してください。');
  }

  const payload = {
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    system: systemPrompt,
    messages: messages
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(CLAUDE_ENDPOINT, options);
  const code = response.getResponseCode();
  const body = JSON.parse(response.getContentText());

  if (code !== 200) {
    const errMsg = body.error ? body.error.message : JSON.stringify(body);
    throw new Error('Claude API エラー (' + code + '): ' + errMsg);
  }

  return body.content[0].text;
}

/* ============================================================
 *  sendChatMessage(caseId, userMessage) — 資料作成チャット
 * ============================================================ */
function sendChatMessage(caseId, userMessage) {
  requireAuth_();

  // 案件コンテキスト
  const caseCtx = buildCaseContext(caseId);

  // ナレッジ検索
  const knowledge = searchKnowledge(userMessage, 4000);

  // 過去の会話履歴（直近10往復）
  const history = getChatHistory_(SHEET_CHAT_HISTORY, caseId, 10);

  // システムプロンプト構築
  const system = SYSTEM_PROMPT_DOCUMENT + '\n\n' +
    '【案件情報】\n' + caseCtx +
    (knowledge ? '\n【参考ナレッジ】\n' + knowledge : '');

  // メッセージ組み立て
  const messages = history.concat([
    { role: 'user', content: userMessage }
  ]);

  const reply = callClaude_(system, messages);

  // 履歴保存
  saveChatEntry_(SHEET_CHAT_HISTORY, caseId, 'user', userMessage);
  saveChatEntry_(SHEET_CHAT_HISTORY, caseId, 'assistant', reply);

  return { reply: reply };
}

/* ============================================================
 *  チャット履歴ヘルパー（chat_history / advisor_history 共用）
 * ============================================================ */
function getChatHistory_(sheetName, caseId, maxPairs) {
  const sheet = getSheet_(sheetName);
  if (!sheet) return [];
  const rows = sheetToObjects_(sheet)
    .filter(r => r.case_id === caseId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // 直近 maxPairs 往復 = maxPairs * 2 メッセージ
  const recent = rows.slice(-(maxPairs * 2));
  return recent.map(r => ({
    role: r.role,
    content: r.content
  }));
}

function saveChatEntry_(sheetName, caseId, role, content, adviceType) {
  const sheet = getSheet_(sheetName);
  const id = generateId_();
  const row = [id, caseId, role, content];
  if (sheetName === 'advisor_history') {
    row.push(adviceType || 'general');
  }
  row.push(nowISO_());
  sheet.appendRow(row);
}

function getChatHistoryForDisplay_(sheetName, caseId) {
  const sheet = getSheet_(sheetName);
  if (!sheet) return [];
  return sheetToObjects_(sheet)
    .filter(r => r.case_id === caseId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}
