# CredentialTool
資格情報の更新確認ツール

## 前提条件・準備

- **Google Sheets プラグイン (`antigravity-plugins-official/plugin/gsheets`)**:
  - 対象資格一覧のスプレッドシートはアクセス権限が管理されているため、AIエージェントから直接スプレッドシートの参照や同期・更新を行うには、Antigravity の **Google Sheets プラグイン** を追加し、対象シートへのアクセス権を持つ Google アカウントでサインイン（連携）する必要があります。

## フォルダー構成

```text
src/       アプリケーションソース
src/gas/   Google Apps Script ソース
test/      テスト全般
test/gas/  Google Apps Script テスト
docs/      設計・運用ドキュメント
```
