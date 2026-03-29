/* ============================================================
 *  KnowledgeLoader.gs — Drive ナレッジ自動インデックス
 * ============================================================ */

// ① 固定ナレッジフォルダID
const KNOWLEDGE_FOLDER_IDS = [
  '0B5CM66BMyQwjYWdzYkZuY25YMnM',  // メインMAナレッジ
];

// ② キーワード動的検索
const KNOWLEDGE_FOLDER_KEYWORDS = [
  '新規営業', 'IM', 'TOP面談', '面談後',
  'DD', 'デューデリ', '基本合意', '最終契約', '譲渡契約',
  '契約書', '成約', '事例集', 'ヒアリング',
  '売主', '買主', '買い手', '売り手',
  'MAセミナー', 'M&A事例', 'ナレッジ',
  'パンフ', 'アプローチ'
];

// 対応MIMEタイプ
const INDEXABLE_MIMES = [
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
  'text/plain'
];

/* ============================================================
 *  1. indexAllKnowledge() — 全件インデックス
 * ============================================================ */
function indexAllKnowledge() {
  requireAuth_();
  const stats = { added: 0, updated: 0, deleted: 0, errors: 0 };

  // 走査対象フォルダを収集
  const folderIds = new Set();
  KNOWLEDGE_FOLDER_IDS.forEach(id => folderIds.add(id));

  // キーワードで動的にフォルダ検索
  KNOWLEDGE_FOLDER_KEYWORDS.forEach(keyword => {
    try {
      const iter = DriveApp.searchFolders(
        'title contains "' + keyword.replace(/"/g, '\\"') + '"'
      );
      while (iter.hasNext()) {
        folderIds.add(iter.next().getId());
      }
    } catch (e) {
      Logger.log('フォルダ検索エラー (' + keyword + '): ' + e.message);
    }
  });

  Logger.log('走査対象フォルダ数: ' + folderIds.size);

  // 走査してファイル一覧を取得
  const foundFileIds = new Set();
  folderIds.forEach(fid => {
    try {
      const folder = DriveApp.getFolderById(fid);
      crawlFolder_(folder, folder.getName(), foundFileIds, stats);
    } catch (e) {
      Logger.log('フォルダアクセスエラー (ID: ' + fid + '): ' + e.message);
      stats.errors++;
    }
  });

  // knowledge_index に残っているが Drive から消えたファイルを削除
  const existing = getAllKnowledgeIndex();
  existing.forEach(entry => {
    if (!foundFileIds.has(entry.drive_file_id)) {
      deleteKnowledgeByFileId(entry.drive_file_id);
      stats.deleted++;
    }
  });

  Logger.log('indexAllKnowledge 完了: ' + JSON.stringify(stats));
  return stats;
}

/* ============================================================
 *  2. incrementalSync() — 差分更新（過去24時間）
 * ============================================================ */
function incrementalSync() {
  requireAuth_();
  const stats = { added: 0, updated: 0, deleted: 0, errors: 0 };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sinceStr = Utilities.formatDate(since, 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ss");

  // 走査対象フォルダ
  const folderIds = new Set();
  KNOWLEDGE_FOLDER_IDS.forEach(id => folderIds.add(id));
  KNOWLEDGE_FOLDER_KEYWORDS.forEach(keyword => {
    try {
      const iter = DriveApp.searchFolders(
        'title contains "' + keyword.replace(/"/g, '\\"') + '"'
      );
      while (iter.hasNext()) folderIds.add(iter.next().getId());
    } catch (e) { /* skip */ }
  });

  // 更新ファイルだけ処理
  folderIds.forEach(fid => {
    try {
      const folder = DriveApp.getFolderById(fid);
      crawlFolderIncremental_(folder, folder.getName(), sinceStr, stats);
    } catch (e) {
      stats.errors++;
    }
  });

  // 最終同期日時を記録
  PropertiesService.getScriptProperties()
    .setProperty('KNOWLEDGE_LAST_SYNC', nowISO_());

  Logger.log('incrementalSync 完了: ' + JSON.stringify(stats));
  return stats;
}

/* ============================================================
 *  3. searchKnowledge(query, maxChars)
 * ============================================================ */
function searchKnowledge(query, maxChars) {
  maxChars = maxChars || 8000;
  const entries = getAllKnowledgeIndex();
  if (!entries.length) return '';

  const queryTerms = query.toLowerCase().split(/[\s　]+/).filter(Boolean);
  const CONTEXT_WINDOW = 500;
  const results = [];
  let totalChars = 0;

  for (const entry of entries) {
    const text = String(entry.full_text || '');
    if (!text) continue;
    const textLower = text.toLowerCase();

    // スコア計算（一致語数ベース）
    let score = 0;
    const matchPositions = [];
    for (const term of queryTerms) {
      let idx = textLower.indexOf(term);
      while (idx !== -1) {
        score++;
        matchPositions.push(idx);
        idx = textLower.indexOf(term, idx + 1);
      }
    }
    if (score === 0) continue;

    // マッチ周辺のチャンクを抽出
    const chunks = [];
    const seen = new Set();
    matchPositions.sort((a, b) => a - b);
    for (const pos of matchPositions) {
      const start = Math.max(0, pos - CONTEXT_WINDOW);
      const end   = Math.min(text.length, pos + CONTEXT_WINDOW);
      const key   = Math.floor(start / CONTEXT_WINDOW);
      if (seen.has(key)) continue;
      seen.add(key);
      chunks.push(text.substring(start, end));
    }

    const snippet = chunks.join('\n...\n');
    results.push({ score, filename: entry.filename, snippet });
  }

  // スコア降順ソート
  results.sort((a, b) => b.score - a.score);

  // maxChars以内に収める
  const output = [];
  for (const r of results) {
    const block = '【' + r.filename + '】\n' + r.snippet + '\n';
    if (totalChars + block.length > maxChars) break;
    output.push(block);
    totalChars += block.length;
  }

  return output.join('\n---\n');
}

/* ============================================================
 *  4. getKnowledgeStats()
 * ============================================================ */
function getKnowledgeStats() {
  requireAuth_();
  const entries = getAllKnowledgeIndex();
  const totalChars = entries.reduce((sum, e) => sum + (Number(e.char_count) || 0), 0);
  const lastSync = PropertiesService.getScriptProperties()
    .getProperty('KNOWLEDGE_LAST_SYNC') || '未同期';
  return {
    fileCount: entries.length,
    totalChars: totalChars,
    lastSync: lastSync
  };
}

/* ============================================================
 *  トリガー設定（初回手動実行）
 * ============================================================ */
function initTriggers() {
  requireAuth_();

  // 既存トリガーをクリア
  ScriptApp.getProjectTriggers().forEach(t => {
    const fn = t.getHandlerFunction();
    if (fn === 'incrementalSync' || fn === 'indexAllKnowledge') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 毎日 午前2:00〜3:00 差分インデックス
  ScriptApp.newTrigger('incrementalSync')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();

  // 毎週日曜 午前3:00〜4:00 全件再確認
  ScriptApp.newTrigger('indexAllKnowledge')
    .timeBased()
    .atHour(3)
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .create();

  Logger.log('トリガー設定完了');
}

/* ============================================================
 *  内部ヘルパー — フォルダ再帰走査
 * ============================================================ */
function crawlFolder_(folder, pathPrefix, foundFileIds, stats) {
  // ファイル走査
  const fileIter = folder.getFiles();
  while (fileIter.hasNext()) {
    const file = fileIter.next();
    const mime = file.getMimeType();
    if (INDEXABLE_MIMES.indexOf(mime) === -1) continue;

    const fileId = file.getId();
    foundFileIds.add(fileId);

    try {
      const lastMod = file.getLastUpdated().toISOString();
      const existing = findKnowledgeByFileId_(fileId);

      if (existing && existing.file_modified_time === lastMod) {
        continue; // 未変更
      }

      const text = extractText_(file, mime);
      const result = upsertKnowledgeEntry({
        drive_file_id: fileId,
        filename: file.getName(),
        folder_path: pathPrefix,
        full_text: text,
        last_indexed: nowISO_(),
        char_count: text.length,
        file_modified_time: lastMod
      });
      stats[result]++;
    } catch (e) {
      Logger.log('ファイル処理エラー (' + file.getName() + '): ' + e.message);
      stats.errors++;
    }
  }

  // サブフォルダ再帰
  const folderIter = folder.getFolders();
  while (folderIter.hasNext()) {
    const sub = folderIter.next();
    crawlFolder_(sub, pathPrefix + '/' + sub.getName(), foundFileIds, stats);
  }
}

function crawlFolderIncremental_(folder, pathPrefix, sinceStr, stats) {
  const fileIter = folder.getFiles();
  while (fileIter.hasNext()) {
    const file = fileIter.next();
    const mime = file.getMimeType();
    if (INDEXABLE_MIMES.indexOf(mime) === -1) continue;

    const lastMod = file.getLastUpdated();
    if (lastMod < new Date(sinceStr)) continue;

    try {
      const text = extractText_(file, mime);
      const result = upsertKnowledgeEntry({
        drive_file_id: file.getId(),
        filename: file.getName(),
        folder_path: pathPrefix,
        full_text: text,
        last_indexed: nowISO_(),
        char_count: text.length,
        file_modified_time: lastMod.toISOString()
      });
      stats[result]++;
    } catch (e) {
      Logger.log('差分処理エラー (' + file.getName() + '): ' + e.message);
      stats.errors++;
    }
  }

  const folderIter = folder.getFolders();
  while (folderIter.hasNext()) {
    const sub = folderIter.next();
    crawlFolderIncremental_(sub, pathPrefix + '/' + sub.getName(), sinceStr, stats);
  }
}

/* ============================================================
 *  テキスト抽出
 * ============================================================ */
function extractText_(file, mime) {
  switch (mime) {
    case 'application/vnd.google-apps.document':
      return DocumentApp.openById(file.getId()).getBody().getText();

    case 'application/vnd.google-apps.spreadsheet': {
      const ss = SpreadsheetApp.openById(file.getId());
      return ss.getSheets().map(sheet => {
        const vals = sheet.getDataRange().getValues();
        return vals.map(row => row.join('\t')).join('\n');
      }).join('\n\n');
    }

    case 'application/vnd.google-apps.presentation': {
      const pres = SlidesApp.openById(file.getId());
      return pres.getSlides().map((slide, i) => {
        const title = slide.getPageElements()
          .filter(el => el.getPageElementType() === SlidesApp.PageElementType.SHAPE)
          .map(el => {
            try { return el.asShape().getText().asString(); }
            catch (_) { return ''; }
          })
          .filter(Boolean)
          .join(' ');
        const notes = slide.getNotesPage()
          ? slide.getNotesPage().getPlaceholder(SlidesApp.PlaceholderType.BODY)
          : null;
        const notesText = notes ? notes.getText().asString() : '';
        return 'Slide ' + (i + 1) + ': ' + title +
          (notesText ? '\nNotes: ' + notesText : '');
      }).join('\n\n');
    }

    case 'text/plain':
      return file.getBlob().getDataAsString('UTF-8');

    default:
      return '';
  }
}

/* ---------- knowledge_index 検索ヘルパー ---------- */
function findKnowledgeByFileId_(driveFileId) {
  const entries = getAllKnowledgeIndex();
  return entries.find(e => e.drive_file_id === driveFileId) || null;
}
