/**
 * @file Config.js
 * @description システム設定およびスクリプトプロパティの管理
 */

/**
 * アプリケーション設定オブジェクト
 */
const CONFIG = {
  // IPA新着情報の取得元URL
  IPA_NEWS_URL: 'https://www.ipa.go.jp/news/index.html',
  
  // 抽出対象のカテゴリ（空文字またはnullの場合は全件取得）
  // docs/01_overview.md で「?=exam」が指定されているため、デフォルトは「試験情報」
  TARGET_CATEGORY: '試験情報',

  // 未連携チェックで保持する過去の投稿済みURLの最大保持件数
  MAX_HISTORY_COUNT: 200,

  /**
   * スクリプトプロパティから設定値を取得
   * @param {string} key プロパティ名
   * @param {string} defaultValue デフォルト値（任意）
   * @return {string}
   */
  getProperty(key, defaultValue = '') {
    const props = PropertiesService.getScriptProperties();
    const value = props.getProperty(key);
    return value !== null && value !== '' ? value : defaultValue;
  },

  /**
   * 通知先（#all-資格情報変更通知 チャンネル）のWebhook URLを取得
   * @return {string}
   */
  getNotifyWebhookUrl() {
    return this.getProperty('SLACK_WEBHOOK_URL_NOTIFY');
  },

  /**
   * エラー情報投稿先（CWC_堀場義弘 DM用）のWebhook URLを取得
   * @return {string}
   */
  getErrorWebhookUrl() {
    return this.getProperty('SLACK_WEBHOOK_URL_ERROR');
  }
};
