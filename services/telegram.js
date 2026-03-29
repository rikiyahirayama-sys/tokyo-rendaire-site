// ============================================
// Telegram Bot サービス
// チャンネル投稿（テキスト・画像）
// ============================================
require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

let BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
let CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '';

// 再初期化
function reinitialize() {
    require('dotenv').config();
    BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
    CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '';
}

// Telegram API URL
function apiUrl(method) {
    return `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
}

// チャンネルに投稿
async function postToChannel(text, imagePath) {
    try {
        if (!BOT_TOKEN || !CHANNEL_ID) {
            return { success: false, error: 'Telegram Bot TokenまたはChannel IDが設定されていません' };
        }

        if (imagePath) {
            const fullPath = path.resolve(imagePath);
            if (fs.existsSync(fullPath)) {
                // 画像付き投稿
                const form = new FormData();
                form.append('chat_id', CHANNEL_ID);
                form.append('caption', text);
                form.append('parse_mode', 'Markdown');
                form.append('photo', fs.createReadStream(fullPath));

                const res = await fetch(apiUrl('sendPhoto'), { method: 'POST', body: form });
                const data = await res.json();
                if (!data.ok) return { success: false, error: data.description };
                return { success: true, messageId: String(data.result.message_id) };
            }
        }

        // テキストのみ投稿
        const res = await fetch(apiUrl('sendMessage'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHANNEL_ID,
                text: text,
                parse_mode: 'Markdown'
            })
        });
        const data = await res.json();
        if (!data.ok) return { success: false, error: data.description };
        return { success: true, messageId: String(data.result.message_id) };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// Bot情報取得（接続テスト用）
async function getMe() {
    try {
        if (!BOT_TOKEN) {
            return { success: false, error: 'Telegram Bot Tokenが設定されていません' };
        }
        const res = await fetch(apiUrl('getMe'));
        const data = await res.json();
        if (!data.ok) return { success: false, error: data.description };
        return { success: true, data: data.result };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { postToChannel, getMe, reinitialize };
