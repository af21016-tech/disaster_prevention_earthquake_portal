# Cloudflare Workersを活用したログ収集プロキシ導入手順書

本ポータルサイトから送信されるユーザーログを安全かつ信頼性高く収集するため、**Cloudflare Workers** をAPIゲートウェイ（プロキシ）として導入し、ログの宛先である **Google Apps Script (GAS)** のURLを秘匿化する手順について説明します。

---

## 1. システムアーキテクチャ概要

本対策を適用したシステムのデータ収集経路は以下の通りです。

```
[クライアント（ブラウザ）]  <-- GitHub Pages (https://<your-username>.github.io)
       │
       │ (1) POSTリクエスト（ログ一括送信）
       ▼
[Cloudflare Workers]   <-- CORSチェック / レート制限 / GAS URLの秘匿
       │
       │ (2) バックエンドへの転送（サーバー間通信）
       ▼
[Google Apps Script]  <-- 受け取ったデータをバリデーション
       │
       │ (3) 記録
       ▼
[Google スプレッドシート]
```

### 学術的観点（論文・修士論文）での本構成の記述例
> **「2.3 ログ収集におけるセキュリティおよびデータ完全性の担保」**
> 実験データの収集にあたり、Google Apps Script (GAS) を用いたログ収集バックエンドを構築した。しかし、静的サイトホスティング（GitHub Pages）の制約上、クライアントサイドにデータベースやAPIの接続先URLが露出する脆弱性が存在する。
> これによるデータの改ざんや第三者によるスパム送信（Data Poisoning）を防ぐため、本研究ではサーバーレスプラットフォームである Cloudflare Workers をAPIゲートウェイとして導入した。
> ゲートウェイ上で同一オリジンポリシー（CORS）によるアクセス制限および通信のルーティングを行うことで、バックエンド（GAS）のURLを完全に隠蔽し、収集される実験データの完全性と信頼性を確保している。

---

## 2. Cloudflare Workers のセットアップ手順

### ステップ 1: Cloudflare アカウントの作成
1. [Cloudflare 公式サイト](https://www.cloudflare.com/) にアクセスし、無料アカウントを作成します。

### ステップ 2: Workers & Pages で新しいWorkerを作成
1. ダッシュボードにログイン後、左側メニューの **「Workers & Pages」** を選択します。
2. **「Create (作成)」** ボタンをクリックします。
3. **「Create Worker (Worker の作成)」** をクリックします。
4. Workerの名前（例: `disaster-portal-logger`）を入力し、**「Deploy (デプロイ)」** をクリックします。

### ステップ 3: 中継コードの書き換え
1. デプロイ完了画面で **「Edit code (コードの編集)」** をクリックします。
2. 左メニューでデフォルトで作成されている `worker.js` の中身をすべて削除し、プロジェクト内の [cloudflare_worker_template.js](file:///c:/Users/tsous/Desktop/disaster_prevention_earthquake_portal/cloudflare_worker_template.js) の中身をそのままコピー＆ペーストします。
3. ペースト後、コード内の `ALLOWED_ORIGINS` 配列（12行目付近）にある `https://your-github-username.github.io` を、**ご自身の本番GitHub PagesのURL** に書き換えます。
   ```javascript
   const ALLOWED_ORIGINS = [
     "http://localhost:5500", 
     "http://127.0.0.1:5500",
     "https://<あなたのGitHubユーザー名>.github.io" // ★ここに差し替える
   ];
   ```
4. 画面右上の **「Save and deploy (保存してデプロイ)」** をクリックします。

### ステップ 4: 環境変数（GAS_URL）の登録
1. Workersの設定画面（Edit codeの画面から戻る場合は左上のWorkers名をクリック）へ移動します。
2. Workerの管理タブから **「Settings (設定)」** -> **「Variables (変数)」** タブを選択します。
3. **「Environment Variables (環境変数)」** の項目で **「Add variable (変数の追加)」** をクリックします。
4. 以下の通りに入力します：
   - **Variable name (変数名)**: `GAS_URL`
   - **Value (値)**: 露出を防止したい元のGAS Web App URLを入力します（例: `https://script.google.com/macros/s/AKfycbzy.../exec`）
   - **Type (タイプ)**: 必要に応じて「Encrypt (暗号化)」を選択して保存します。
5. **「Save and deploy (保存してデプロイ)」** をクリックします。

---

## 3. フロントエンド（logger.js）の修正

1. Workersの管理画面のトップに表示されている `https://<Worker名>.<サブドメイン>.workers.dev` という形式のURLをコピーします。
2. プロジェクト内の [js/logger.js](file:///c:/Users/tsous/Desktop/disaster_prevention_earthquake_portal/js/logger.js) を開き、最上部にある `PROXY_API_URL` の値をコピーしたURLに差し替えます。
   ```javascript
   // 例
   const PROXY_API_URL = "https://disaster-portal-logger.tsous.workers.dev";
   ```
3. ファイルを保存し、リポジトリにコミット＆プッシュ（GitHub Pagesに反映）します。

---

## 4. 動作テスト方法

1. **ローカル環境テスト**:
   - VSCode の `Live Server` などでローカルサーバー（`http://127.0.0.1:5500` 等）を立ち上げます。
   - ブラウザでデベロッパーツール（F12）の 「Console (コンソール)」と「Network (ネットワーク)」を開きます。
   - 何らかのアクション（クイズの回答や地図の操作など）を行い、ページ遷移や一括送信トリガー時に `Network` タブを確認します。
   - `fetch` のリクエスト先が GASのURL ではなく `https://<あなたのWorker名>...workers.dev` になっており、ステータスコード `200` を返していることを確認します。
2. **本番環境テスト**:
   - GitHub Pagesにアップロード後、実際の公開サイトから操作し、Googleスプレッドシート側にデータが正常に蓄積されていれば成功です。
