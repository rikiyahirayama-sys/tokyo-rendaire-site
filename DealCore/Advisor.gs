/* ============================================================
 *  Advisor.gs — 営業方針AIアドバイザー バックエンド
 * ============================================================ */

const SHEET_ADVISOR_HISTORY = 'advisor_history';

const SYSTEM_PROMPT_ADVISOR =
  'あなたはアックスコンサルティングのMA仲介営業の上席コンサルタントです。\n' +
  '税理士事務所・社労士事務所・会計事務所のM&A仲介に豊富な経験を持ちます。\n\n' +
  '以下は現在担当している案件の全情報です。\n' +
  'この情報を完全に把握した上で、担当営業に対して実践的なアドバイスをしてください。\n\n' +
  'アドバイスの方針:\n' +
  '・具体的かつ実践的であること\n' +
  '・「なぜそうすべきか」理由を必ず述べること\n' +
  '・過去の成約事例があれば積極的に引用すること\n' +
  '・リスクがある場合は正直に指摘すること\n' +
  '・回答は簡潔に、箇条書きを活用すること\n' +
  '・売主の利益を最優先に考えること';

// advice_type 自動判定用キーワード
const ADVICE_TYPE_PATTERNS_ = [
  { type: 'next_action',     keywords: ['次のアクション', '次にやる', '何をすべき', '次の一手', '今やるべき', 'アクション'] },
  { type: 'risk_analysis',   keywords: ['リスク', '懸念', 'DD', 'デューデリ', '問題点', '注意点', '危険'] },
  { type: 'buyer_matching',  keywords: ['買主', '買い手', 'マッチング', 'どんな相手', '合いそう', 'シナジー'] },
  { type: 'negotiation',     keywords: ['交渉', '説得', '価格', 'トーク', '迷って', '対応', '提案'] },
  { type: 'phase_judgment',  keywords: ['フェーズ', '移行', 'IM送', 'タイミング', '進めて', 'そろそろ'] },
  { type: 'seller_analysis', keywords: ['売主', '懸念点', '整理', '状況', 'ヒアリング', '要望'] }
];

/* ============================================================
 *  getAdvice(caseId, userMessage) — アドバイス取得
 * ============================================================ */
function getAdvice(caseId, userMessage) {
  requireAuth_();

  // 1. 案件コンテキスト
  const caseCtx = buildCaseContext(caseId);

  // 2. ナレッジ検索
  const knowledge = searchKnowledge(userMessage, 6000);

  // 3. 直近10往復の会話履歴
  const history = getChatHistory_(SHEET_ADVISOR_HISTORY, caseId, 10);

  // 4. システムプロンプト構築
  const system = SYSTEM_PROMPT_ADVISOR + '\n\n' +
    '【案件情報】\n' + caseCtx +
    (knowledge ? '\n【参考：過去の成約事例・ナレッジ】\n' + knowledge : '');

  // 5. メッセージ組み立て
  const messages = history.concat([
    { role: 'user', content: userMessage }
  ]);

  const reply = callClaude_(system, messages);

  // 6. advice_type 自動判定
  const adviceType = detectAdviceType_(userMessage + ' ' + reply);

  // 7. 履歴保存
  saveChatEntry_(SHEET_ADVISOR_HISTORY, caseId, 'user', userMessage, adviceType);
  saveChatEntry_(SHEET_ADVISOR_HISTORY, caseId, 'assistant', reply, adviceType);

  return { reply: reply, adviceType: adviceType };
}

/* ============================================================
 *  getCaseDiagnosis(caseId) — 案件現状診断レポート
 * ============================================================ */
function getCaseDiagnosis(caseId) {
  requireAuth_();

  const caseCtx = buildCaseContext(caseId);
  const knowledge = searchKnowledge('案件診断 リスク 買主 スケジュール', 6000);

  const diagnosisPrompt =
    '以下の案件について、現状の診断レポートを作成してください。\n' +
    '必ず以下の6項目すべてに回答してください：\n\n' +
    '## 1. 現在のフェーズと進捗状況\n' +
    '現フェーズの完了度合いと残タスクを整理\n\n' +
    '## 2. 売主の主要な懸念点\n' +
    'アップロード済みファイルやヒアリング内容から抽出\n\n' +
    '## 3. DDで想定されるリスクポイント\n' +
    '財務・法務・人事・事業面のリスクを洗い出し\n\n' +
    '## 4. 理想的な買主像\n' +
    '業種・規模・地域・シナジーの観点から具体的に記述\n\n' +
    '## 5. 推奨する次の3アクション（優先順位付き）\n' +
    '最も優先度の高い順に、理由とともに提示\n\n' +
    '## 6. 想定クローズまでのスケジュール感\n' +
    '月単位の大まかなマイルストーンを提示';

  const system = SYSTEM_PROMPT_ADVISOR + '\n\n' +
    '【案件情報】\n' + caseCtx +
    (knowledge ? '\n【参考：過去の成約事例・ナレッジ】\n' + knowledge : '');

  const messages = [
    { role: 'user', content: diagnosisPrompt }
  ];

  const reply = callClaude_(system, messages);

  // 診断結果を履歴にも保存
  saveChatEntry_(SHEET_ADVISOR_HISTORY, caseId, 'user', '【案件診断レポート依頼】', 'diagnosis');
  saveChatEntry_(SHEET_ADVISOR_HISTORY, caseId, 'assistant', reply, 'diagnosis');

  return { reply: reply, adviceType: 'diagnosis' };
}

/* ============================================================
 *  getAdvisorHistory(caseId) — 表示用 履歴取得
 * ============================================================ */
function getAdvisorHistory(caseId) {
  requireAuth_();
  return getChatHistoryForDisplay_(SHEET_ADVISOR_HISTORY, caseId);
}

/* ============================================================
 *  getDocChatHistory(caseId) — 資料作成チャット 履歴取得
 * ============================================================ */
function getDocChatHistory(caseId) {
  requireAuth_();
  return getChatHistoryForDisplay_(SHEET_CHAT_HISTORY, caseId);
}

/* ============================================================
 *  advice_type 自動判定
 * ============================================================ */
function detectAdviceType_(text) {
  const lower = text.toLowerCase();
  let best = { type: 'general', score: 0 };

  for (const pattern of ADVICE_TYPE_PATTERNS_) {
    let score = 0;
    for (const kw of pattern.keywords) {
      if (lower.indexOf(kw) !== -1) score++;
    }
    if (score > best.score) {
      best = { type: pattern.type, score: score };
    }
  }
  return best.type;
}
