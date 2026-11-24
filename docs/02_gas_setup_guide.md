# GAS（Google Apps Script）セットアップ手順書

本書は、[docs/01_overview.md](file:///c:/repos/CredentialTool/docs/01_overview.md) の仕様に基づき作成された資格情報更新確認プログラム（IPA新着情報スクレイピングおよびSlack通知）の導入手順書です。

---

## 1. 作成ファイル一覧

- [src/gas/Config.js](file:///c:/repos/CredentialTool/src/gas/Config.js): 設定値およびスクリプトプロパティ管理
- [src/gas/SlackService.js](file:///c:/repos/CredentialTool/src/gas/SlackService.js): Slackへの通知（通常・エラー）送信処理
- [src/gas/IpaScraper.js](file:///c:/repos/CredentialTool/src/gas/IpaScraper.js): IPA公式サイトのHTML取得およびニュース抽出
- [src/gas/StateService.js](file:///c:/repos/CredentialTool/src/gas/StateService.js): 連携済み情報の状態保持・重複投稿防止処理
- [src/gas/Main.js](file:///c:/repos/CredentialTool/src/gas/Main.js): メイン処理エントリポイントおよび定期実行トリガー設定
- [test/gas/TestIpaScraper.js](file:///c:/repos/CredentialTool/test/gas/TestIpaScraper.js): 動作確認・テスト用関数

---

## 2. Google Apps Script への配置手順

1. [Google Apps Script](https://script.google.com/) を開き、「新しいプロジェクト」を作成します（または対象のスプレッドシートの「拡張機能」>「Apps Script」を開きます）。
2. プロジェクト名を `CredentialTool` など任意の名前に変更します。
3. エディタ左側の「ファイル」横の `+` ボタンからスクリプトファイルを追加し、`src/gas/` 配下の各ファイルの内容をコピー＆ペーストして保存します：
   - `Config.gs`
   - `SlackService.gs`
   - `IpaScraper.gs`
   - `StateService.gs`
   - `Main.gs`
   - （任意）`TestIpaScraper.gs`

---

## 3. スクリプトプロパティ（Webhook URL）の設定

SlackのIncoming Webhook URLをスクリプトプロパティに登録します。

1. GASエディタ左メニューの **「プロジェクトの設定」（歯車アイコン）** をクリックします。
2. ページ下部の **「スクリプト プロパティ」** セクションで「スクリプト プロパティを追加」をクリックし、以下の2つを設定して「スクリプト プロパティを保存」を押します。

| プロパティ名 | 説明 | 投稿先 |
| :--- | :--- | :--- |
| `SLACK_WEBHOOK_URL_NOTIFY` | 周知通知用のIncoming Webhook URL | `#all-資格情報変更通知` チャンネル |
| `SLACK_WEBHOOK_URL_ERROR` | エラー発生時の通知用Incoming Webhook URL | `CWC_堀場義弘` DM宛て等 |

---

## 4. 動作確認

1. GASエディタで `Main.gs` を選択します。
2. 上部ツールバーの実行関数から `checkConfiguration` を選択して「実行」ボタンをクリックします。
   - スクリプトプロパティが正しく取得できているかログで確認します。
3. 同様に `testFetchIpaNewsLive`（`TestIpaScraper.gs`）を実行すると、IPAから最新の試験情報が正しく抽出できているか確認できます。
4. `checkIpaNewsUpdates` を実行すると、未連携の情報がSlack（#all-資格情報変更通知）に通知されます。

---

## 5. 定期実行トリガーの設定

平日朝9:00に自動実行するためのトリガーを設定します。

- **自動設定する場合:**
  - GASエディタで `setDailyTrigger` を選択して実行します。
- **手動設定する場合:**
  - GASエディタ左メニューの **「トリガー」（時計アイコン）** をクリックします。
  - 「トリガーを追加」をクリックし、以下を設定して保存します：
    - 実行する関数: `checkIpaNewsUpdates`
    - イベントのソース: `時間主導型`
    - タイプ: `日ベースのタイマー`
    - 時間: `午前 9 時 ～ 10 時`
