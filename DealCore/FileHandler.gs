/* ============================================================
 *  FileHandler.gs — ファイルアップロード + Gemini 文字起こし・議事録生成
 * ============================================================ */

const MAX_FILE_SIZE_MB = 500;

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-1.5-flash';

// 音声・動画 MIME タイプ
const AUDIO_VIDEO_MIMES = {
  'audio/mpeg': true,        // mp3
  'audio/mp4': true,         // m4a
  'audio/x-m4a': true,       // m4a
  'audio/wav': true,         // wav
  'audio/x-wav': true,       // wav
  'video/mp4': true,         // mp4
  'audio/mp3': true,
  'video/mpeg': true         // mpeg-4
};

const MINUTES_PROMPT = [
  '以下の音声を文字起こしして、MA仲介の商談議事録として以下の形式でまとめてください。',
  '',
  '【文字起こし全文】',
  '',
  '【議事録】',
  '■ 日時・参加者',
  '■ 売主の基本情報',
  '■ 売却理由・背景',
  '■ 希望条件（価格・時期・雇用継続等）',
  '■ 懸念点・課題',
  '■ 決定事項',
  '■ 次のアクション（担当者・期限付き）',
  '■ 特記事項'
].join('\n');

/* ============================================================
 *  uploadFile(caseId, base64Data, filename, mimeType)
 *  フロントからbase64でファイルを受け取り、Driveに保存
 *  音声・動画→Geminiで文字起こし+議事録生成→Googleドキュメント保存
 * ============================================================ */
function uploadFile(caseId, base64Data, filename, mimeType) {
  requireAuth_();

  // サイズチェック（base64は約1.33倍）
  const approxSizeMB = (base64Data.length * 3 / 4) / (1024 * 1024);
  if (approxSizeMB > MAX_FILE_SIZE_MB) {
    throw new Error('ファイルサイズが' + MAX_FILE_SIZE_MB + 'MBを超えています（約' + Math.round(approxSizeMB) + 'MB）。');
  }

  // Driveにファイルを保存
  const decoded = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(decoded, mimeType, filename);

  const caseFolderId = getCaseFolderId(caseId);
  if (!caseFolderId) throw new Error('案件フォルダが見つかりません。');

  const uploadsFolder = getOrCreateSubfolder_(
    DriveApp.getFolderById(caseFolderId), 'uploads'
  );
  const driveFile = uploadsFolder.createFile(blob);
  const driveFileId = driveFile.getId();

  // ファイル種別判定
  const isAudioVideo = !!AUDIO_VIDEO_MIMES[mimeType];
  const ext = filename.split('.').pop().toLowerCase();

  let extractedText = '';
  let status = 'uploaded';
  let docUrl = '';

  if (isAudioVideo) {
    // Gemini で文字起こし + 議事録生成
    try {
      extractedText = transcribeWithGemini_(decoded, filename, mimeType);
      status = 'transcribed';

      // Googleドキュメントとして outputs/ に保存
      try {
        docUrl = saveMinutesAsDoc_(caseId, caseFolderId, extractedText);
      } catch (docErr) {
        // ドキュメント保存失敗でも文字起こし自体は成功扱い
        Logger.log('議事録ドキュメント保存エラー: ' + docErr.message);
      }
    } catch (e) {
      status = 'transcription_failed';
      extractedText = '【文字起こしエラー】' + e.message;
    }
  } else if (mimeType === 'text/plain') {
    extractedText = driveFile.getBlob().getDataAsString('UTF-8');
    status = 'text_extracted';
  }

  // filesシートに保存
  const result = createFile({
    case_id: caseId,
    drive_file_id: driveFileId,
    filename: filename,
    filetype: ext,
    extracted_text: extractedText
  });

  return {
    id: result.id,
    driveFileId: driveFileId,
    filename: filename,
    status: status,
    charCount: extractedText.length,
    docUrl: docUrl,
    message: buildStatusMessage_(status, extractedText.length)
  };
}

/* ============================================================
 *  transcribeWithGemini_(fileBytes, filename, mimeType)
 *  Gemini File API でアップロード → generateContent で議事録生成
 * ============================================================ */
function transcribeWithGemini_(fileBytes, filename, mimeType) {
  const apiKey = PropertiesService.getScriptProperties()
    .getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません。スクリプトプロパティを確認してください。');
  }

  // --- Step 1: Gemini File API にアップロード ---
  var geminiFileUri = uploadToGeminiFileApi_(apiKey, fileBytes, filename, mimeType);

  // --- Step 2: generateContent で文字起こし + 議事録 ---
  var generateUrl = GEMINI_ENDPOINT + '/models/' + GEMINI_MODEL + ':generateContent?key=' + apiKey;

  var payload = {
    contents: [{
      parts: [
        {
          fileData: {
            mimeType: mimeType,
            fileUri: geminiFileUri
          }
        },
        {
          text: MINUTES_PROMPT
        }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192
    }
  };

  var response = UrlFetchApp.fetch(generateUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  var body = JSON.parse(response.getContentText());

  if (code !== 200) {
    var errMsg = (body.error && body.error.message) ? body.error.message : JSON.stringify(body);
    throw new Error('Gemini API エラー (' + code + '): ' + errMsg);
  }

  // レスポンスからテキスト抽出
  if (!body.candidates || !body.candidates[0] || !body.candidates[0].content) {
    throw new Error('Gemini APIから有効なレスポンスがありませんでした。');
  }

  var parts = body.candidates[0].content.parts;
  var resultText = parts.map(function(p) { return p.text || ''; }).join('');

  return resultText;
}

/* ============================================================
 *  uploadToGeminiFileApi_(apiKey, fileBytes, filename, mimeType)
 *  Gemini File API にファイルをアップロードし fileUri を返す
 * ============================================================ */
function uploadToGeminiFileApi_(apiKey, fileBytes, filename, mimeType) {
  // Step 1: 初期リクエスト（resumable upload 開始）
  var initUrl = 'https://generativelanguage.googleapis.com/upload/v1beta/files?key=' + apiKey;

  var initResponse = UrlFetchApp.fetch(initUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      file: { displayName: filename }
    }),
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(fileBytes.length),
      'X-Goog-Upload-Header-Content-Type': mimeType
    },
    muteHttpExceptions: true
  });

  if (initResponse.getResponseCode() !== 200) {
    throw new Error('Gemini File API 初期化エラー (' + initResponse.getResponseCode() + '): ' +
      initResponse.getContentText());
  }

  // アップロードURLを取得
  var uploadUrl = initResponse.getHeaders()['x-goog-upload-url'] ||
                  initResponse.getHeaders()['X-Goog-Upload-URL'];
  if (!uploadUrl) {
    throw new Error('Gemini File API: アップロードURLが取得できませんでした。');
  }

  // Step 2: ファイル本体をアップロード
  var uploadResponse = UrlFetchApp.fetch(uploadUrl, {
    method: 'post',
    payload: fileBytes,
    contentType: mimeType,
    headers: {
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize'
    },
    muteHttpExceptions: true
  });

  if (uploadResponse.getResponseCode() !== 200) {
    throw new Error('Gemini File API アップロードエラー (' + uploadResponse.getResponseCode() + '): ' +
      uploadResponse.getContentText());
  }

  var uploadResult = JSON.parse(uploadResponse.getContentText());
  var fileUri = uploadResult.file && uploadResult.file.uri;
  if (!fileUri) {
    throw new Error('Gemini File API: fileUri が取得できませんでした。');
  }

  // ファイルがアクティブになるまで待機（PROCESSING → ACTIVE）
  var fileName = uploadResult.file.name; // "files/xxxx"
  var statusUrl = GEMINI_ENDPOINT + '/' + fileName + '?key=' + apiKey;
  var maxWait = 60; // 最大60回 × 5秒 = 5分
  for (var i = 0; i < maxWait; i++) {
    Utilities.sleep(5000);
    var statusRes = UrlFetchApp.fetch(statusUrl, { muteHttpExceptions: true });
    if (statusRes.getResponseCode() === 200) {
      var statusBody = JSON.parse(statusRes.getContentText());
      if (statusBody.state === 'ACTIVE') {
        return statusBody.uri;
      }
      if (statusBody.state === 'FAILED') {
        throw new Error('Gemini File API: ファイル処理に失敗しました。');
      }
    }
  }
  throw new Error('Gemini File API: ファイル処理がタイムアウトしました（5分以上）。');
}

/* ============================================================
 *  saveMinutesAsDoc_(caseId, caseFolderId, content)
 *  Googleドキュメントとして outputs/ に保存し、URLを返す
 * ============================================================ */
function saveMinutesAsDoc_(caseId, caseFolderId, content) {
  var outputsFolder = getOrCreateSubfolder_(
    DriveApp.getFolderById(caseFolderId), 'outputs'
  );

  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  var docTitle = '議事録_' + today;

  // Googleドキュメント作成
  var doc = DocumentApp.create(docTitle);
  var docBody = doc.getBody();
  docBody.setText(content);
  doc.saveAndClose();

  // ドキュメントを outputs フォルダに移動
  var docFile = DriveApp.getFileById(doc.getId());
  outputsFolder.addFile(docFile);
  DriveApp.getRootFolder().removeFile(docFile);

  // documentsシートにも登録
  createDocument({
    case_id: caseId,
    doc_type: '議事録',
    drive_file_id: doc.getId(),
    filename: docTitle
  });

  return doc.getUrl();
}

/* ============================================================
 *  ヘルパー
 * ============================================================ */
function buildStatusMessage_(status, charCount) {
  switch (status) {
    case 'transcribed':
      return '議事録作成完了: ' + charCount.toLocaleString() + '文字';
    case 'transcription_failed':
      return '文字起こしに失敗しました。';
    case 'text_extracted':
      return 'テキスト抽出完了: ' + charCount.toLocaleString() + '文字';
    case 'uploaded':
      return 'アップロード完了';
    default:
      return '完了';
  }
}

/* ============================================================
 *  transcribeFromDrive(caseId)
 *  「_音声アップロード」フォルダの最新ファイルを取得して
 *  Geminiで文字起こし＋議事録生成
 *  ファイルサイズ制限なし（base64転送を回避）
 * ============================================================ */
function transcribeFromDrive(caseId) {
  requireAuth_();

  // DealCoreルートフォルダ内の「_音声アップロード」フォルダを取得/作成
  var props = PropertiesService.getScriptProperties();
  var rootId = props.getProperty(PROP_ROOT_FOLDER);
  if (!rootId) throw new Error('DealCoreルートフォルダが見つかりません。initDB()を実行してください。');
  var rootFolder = DriveApp.getFolderById(rootId);
  var uploadFolder = getOrCreateSubfolder_(rootFolder, '_音声アップロード');

  // フォルダ内の最新ファイルを取得
  var files = uploadFolder.getFiles();
  var latestFile = null;
  var latestDate = null;
  while (files.hasNext()) {
    var f = files.next();
    var created = f.getDateCreated();
    if (!latestDate || created > latestDate) {
      latestDate = created;
      latestFile = f;
    }
  }

  if (!latestFile) {
    throw new Error('「_音声アップロード」フォルダにファイルがありません。\nGoogleドライブの DealCore → _音声アップロード フォルダに音声ファイルを入れてください。');
  }

  var filename = latestFile.getName();
  var mimeType = latestFile.getMimeType();
  var fileId = latestFile.getId();
  var ext = filename.split('.').pop().toLowerCase();

  // 音声・動画ファイルかチェック
  if (!AUDIO_VIDEO_MIMES[mimeType]) {
    throw new Error('最新ファイル「' + filename + '」は音声/動画ファイルではありません（' + mimeType + '）。\nMP3, MP4, M4A, WAV ファイルを配置してください。');
  }

  var caseFolderId = getCaseFolderId(caseId);
  if (!caseFolderId) throw new Error('案件フォルダが見つかりません。');

  // Gemini で文字起こし + 議事録生成（DriveからBlobを直接取得）
  var blob = latestFile.getBlob();
  var fileBytes = blob.getBytes();
  var extractedText = '';
  var status = 'uploaded';
  var docUrl = '';

  try {
    extractedText = transcribeWithGemini_(fileBytes, filename, mimeType);
    status = 'transcribed';

    // Googleドキュメントとして保存
    try {
      docUrl = saveMinutesAsDoc_(caseId, caseFolderId, extractedText);
    } catch (docErr) {
      Logger.log('議事録ドキュメント保存エラー: ' + docErr.message);
    }
  } catch (e) {
    status = 'transcription_failed';
    extractedText = '【文字起こしエラー】' + e.message;
  }

  // filesシートに記録
  var result = createFile({
    case_id: caseId,
    drive_file_id: fileId,
    filename: filename,
    filetype: ext,
    extracted_text: extractedText
  });

  return {
    id: result.id,
    driveFileId: fileId,
    filename: filename,
    status: status,
    charCount: extractedText.length,
    docUrl: docUrl,
    message: buildStatusMessage_(status, extractedText.length)
  };
}

/* ============================================================
 *  getFileTypeIcon_(ext) — 拡張子からアイコン名を返す
 * ============================================================ */
function getFileTypeLabel_(ext) {
  const map = {
    'mp3': '🎵 音声', 'mp4': '🎬 動画', 'm4a': '🎵 音声',
    'wav': '🎵 音声', 'txt': '📄 テキスト', 'pdf': '📄 PDF',
    'doc': '📄 Word', 'docx': '📄 Word', 'xls': '📊 Excel',
    'xlsx': '📊 Excel', 'ppt': '📊 PPT', 'pptx': '📊 PPT'
  };
  return map[ext] || '📎 ファイル';
}
