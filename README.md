# MAISON ROUGE — LP Website

外国人向けデリヘルLP（ランディングページ）サイト。Next.js 14 + Tailwind CSS + next-intl で構築。

## 技術スタック

| 技術 | 用途 |
|------|------|
| **Next.js 14** (App Router) | フレームワーク |
| **Tailwind CSS** | スタイリング |
| **next-intl** | 多言語対応 (EN/ZH → HI/FR/ES予定) |
| **Stripe** | クレジットカード決済 |
| **Google Calendar API** | キャスト出勤管理 |
| **WhatsApp Business API** | 自動応答・予約受付 |
| **WeChat Official Account** | 中国語圏問い合わせ対応 |

## セットアップ

### 1. 依存関係インストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` を `.env.local` にコピーし、各キーを設定:

```bash
cp .env.example .env.local
```

必要なAPI鍵:
- **Stripe**: [dashboard.stripe.com](https://dashboard.stripe.com) でアカウント作成 → API Keys
- **Google Calendar**: GCPコンソールでサービスアカウント作成 → Calendar APIを有効化
- **WhatsApp**: [Meta Business Suite](https://business.facebook.com) → WhatsApp Business API
- **WeChat**: [WeChat Official Account Platform](https://mp.weixin.qq.com) でアカウント申請

### 3. 開発サーバー起動

```bash
npm run dev
```

`http://localhost:3000` でアクセス。自動的に `/en` にリダイレクトされます。

### 4. Stripe Webhookの設定（ローカル開発）

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

### 5. 本番デプロイ

```bash
npm run build
npm start
```

Vercel へのデプロイ推奨（Next.jsとの相性最良）。

## サイト構成

### 顧客向けページ

| パス | ページ | 説明 |
|------|--------|------|
| `/[locale]` | ホーム (六本木LP) | ヒーロー、キャスト紹介、料金、問い合わせCTA |
| `/[locale]/cast` | キャスト一覧 | 全キャスト表示（出勤状態付き） |
| `/[locale]/cast/[id]` | キャスト詳細 | 個人プロフィール・予約ボタン |
| `/[locale]/system` | 料金・コース | 料金表、延長料金、注意事項 |
| `/[locale]/booking` | 予約フロー | 5ステップ予約 → Stripe決済 |
| `/[locale]/contact` | 問い合わせ | WhatsApp/WeChatリンク |
| `/[locale]/recruit` | キャスト求人 | 条件・応募方法 |

### APIエンドポイント

| パス | メソッド | 説明 |
|------|---------|------|
| `/api/booking` | POST | 予約作成 → Stripe Checkout Session生成 |
| `/api/calendar` | GET | Googleカレンダーから今日の出勤情報取得 |
| `/api/webhook/stripe` | POST | Stripe支払い完了Webhook |
| `/api/webhook/whatsapp` | GET/POST | WhatsApp認証・メッセージ受信・自動応答 |
| `/api/webhook/wechat` | GET/POST | WeChat認証・メッセージ受信・自動応答 |

## 主要機能

### 多言語対応
- 現在: 英語 (en)、中国語 (zh)
- 今後追加予定: ヒンディー語 (hi)、フランス語 (fr)、スペイン語 (es)
- `src/messages/` に翻訳JSONを追加、`src/lib/i18n/config.ts` に言語を追加するだけ

### 出勤管理（Googleカレンダー連携）
1. Googleカレンダーにキャストの出勤予定を登録
2. イベントタイトルは `キャスト名 - Available` 形式
3. LPがAPI経由でリアルタイム取得 → 出勤中キャストを自動表示

### 決済フロー（Stripe）
1. 顧客がコース選択 → 情報入力 → Stripe Checkoutへ
2. 決済完了 → Webhook → WhatsAppで確認メッセージ自動送信
3. **Stripe Japan**: 最短翌日入金（週次サイクル設定可）

### 自動応答（WhatsApp/WeChat）
- 受信メッセージのキーワード検出（"book", "price", "予約", "价格"）
- 自動で料金情報・予約リンクを返信
- パターン不一致の場合 → オーナーにアラート通知

### オーナー通知
- 新規予約時: 全詳細をWhatsAppで即時通知
- 未対応メッセージ: アラート通知
- 決済失敗: エラー通知
- キャンセル: 通知

## キャスト報酬体系

| 項目 | 条件 |
|------|------|
| バック率 | 60% |
| 支払いタイミング | 翌日銀行振込 |
| 交通費（タクシー代） | 全額支給・月末精算 |
| インセンティブ | 別途相談 |
| 待機場所 | 完全在宅（自宅待機） |
| 移動 | タクシーで現地へ直行・解散 |

## エリア展開計画

1. ✅ **六本木・赤坂** (初期リリース)
2. 🔜 新宿
3. 🔜 渋谷
4. 🔜 歌舞伎町
5. 🔜 銀座
6. 🔜 池袋

エリア追加は `src/lib/data.ts` の `areas` 配列に追加。

## カスタマイズ箇所

### 必ず変更が必要な箇所

1. **`.env.local`** — 全API鍵の設定
2. **`src/lib/data.ts`** — キャスト情報、料金設定をリアルデータに差し替え
3. **`src/components/Footer.tsx`** — WhatsApp番号、WeChat IDの設定
4. **`src/components/WhatsAppButton.tsx`** — WhatsApp番号の設定
5. **`public/images/cast/`** — キャスト写真を配置

### 料金変更

`src/lib/data.ts` の `courses` 配列を編集。

### 新言語追加

1. `src/messages/` に `hi.json`（ヒンディー語）等を追加
2. `src/lib/i18n/config.ts` の `locales` 配列に追加
3. `middleware.ts` は自動対応
