# GAS（Google Apps Script）セットアップ手順書

本書は、[docs/01_overview.md](file:///c:/repos/CredentialTool/docs/01_overview.md) の最新仕様に基づき作成された資格情報更新確認プログラム（5つの情報取得元サイトのスクレイピング・Slack通知・エラー集約報告）の導入手順書です。

---

## 1. 作成・更新ファイル一覧

- [src/gas/Config.js](file:///c:/repos/CredentialTool/src/gas/Config.js): 5サイトの取得元情報、設定値、スクリプトプロパティ管理
- [src/gas/Scrapers.js](file:///c:/repos/CredentialTool/src/gas/Scrapers.js): 各サイト（IPA、AWS Blog、AWS Coming Soon、Google Cloud Blog、Microsoft Skills Hub）のスクレイピング・解析処理
- [src/gas/SlackService.js](file:///c:/repos/CredentialTool/src/gas/SlackService.js): Slackへの通知（通常通知フォーマット・集約エラー報告）
- [src/gas/StateService.js](file:///c:/repos/CredentialTool/src/gas/StateService.js): 連携済み情報の状態保持・重複投稿防止処理
- [src/gas/Main.js](file:///c:/repos/CredentialTool/src/gas/Main.js): 全サイト巡回メイン処理 `executeDailyCredentialCheck` および平日定期実行トリガー
- [src/gas/IpaScraper.js](file:///c:/repos/CredentialTool/src/gas/IpaScraper.js): 後方互換ラッパー
- [test/gas/TestScrapers.js](file:///c:/repos/CredentialTool/test/gas/TestScrapers.js): GASエディタ上での全サイト取得テスト・エラー通知テスト
- [test/gas/local_test.js](file:///c:/repos/CredentialTool/test/gas/local_test.js): ローカル環境（Node.js）でのパース単体テスト

---

## 2. 情報取得元サイト（計5サイト）

| # | サイト名 | URL |
| :--- | :--- | :--- |
| 1 | IPA 独立行政法人情報処理推進機構 | `https://www.ipa.go.jp/news/index.html?=exam` |
| 2 | AWS Training and Certification ブログ（日本語） | `https://aws.amazon.com/jp/blogs/news/category/aws-training-and-certification/` |
| 3 | 近日公開の AWS 認定（AWS Certification Coming Soon） | `https://aws.amazon.com/jp/certification/coming-soon/` |
| 4 | Google Cloud 公式ブログ（トレーニングと認定） | `https://cloud.google.com/blog/ja/topics/training-certifications` |
| 5 | The Skills Hub Blog（Microsoft Community Hub） | `https://techcommunity.microsoft.com/category/skills-hub/blog/skills-hub-blog` |

---

## 3. Google Apps Script への配置手順

1. [Google Apps Script](https://script.google.com/) を開き、対象プロジェクトを開くか新規作成します。
2. エディタ左側の「ファイル」の `+` ボタンからスクリプトファイルを追加し、`src/gas/` 配下の各ファイルの内容を貼り付けて保存します：
   - `Config.gs`
   - `Scrapers.gs`
   - `SlackService.gs`
   - `StateService.gs`
   - `Main.gs`
   - `IpaScraper.gs`
   - （任意）`TestScrapers.gs`

---

## 4. スクリプトプロパティ（Webhook URL）の設定

1. GASエディタ左メニューの **「プロジェクトの設定」（歯車アイコン）** を開きます。
2. ページ下部の **「スクリプト プロパティ」** で以下を設定して保存します。

| プロパティ名 | 説明 | 投稿先 |
| :--- | :--- | :--- |
| `SLACK_WEBHOOK_URL_NOTIFY` | 周知通知用のIncoming Webhook URL | `#all-資格情報変更通知` チャンネル |
| `SLACK_WEBHOOK_URL_ERROR` | エラー発生時の通知用Incoming Webhook URL | `CWC_堀場義弘` DM宛て |

---

## 5. 投稿フォーマットと動作確認

### 通常通知の投稿スタイル
docs/01_overview.md の指定通り、以下のスタイルで投稿されます：
```text
{日付}
{タイトル}
詳細は<URL|こちら>
```

### 動作確認手順
1. **設定確認:**
   - GASエディタで `checkConfiguration` を実行し、プロパティやサイト一覧が読み込まれていることを確認します。
2. **スクレイピングテスト:**
   - `TestScrapers.gs` の `testScrapeAllSites` を実行し、5サイトすべてのタイトル・日付・URLが取得できていることをログで確認します（Slackへの投稿は行われません）。
3. **エラー通知テスト:**
   - `TestScrapers.gs` の `testAggregatedErrorNotification` を実行し、エラー集約通知が正しく届くかテストできます。
4. **本番実行テスト:**
   - `executeDailyCredentialCheck` を実行すると、全サイトの未連携情報がSlackへ通知されます。

---

## 6. 平日定期実行トリガーの設定

平日朝9:00に自動実行するためのトリガーを設定します。

- **エディタから実行する場合:**
  - `setDailyWeekdayTrigger` を選択して実行します。
  - トリガー起動時に曜日判定を行い、土日は自動スキップして平日（月〜金）のみ更新確認処理が実行されます。
