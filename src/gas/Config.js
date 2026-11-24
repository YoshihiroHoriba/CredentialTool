/**
 * @file Config.js
 * @description システム設定およびスクリプトプロパティの管理
 */

/**
 * 情報取得元サイトの定義
 */
const TARGET_SITES = [
  {
    id: 'ipa',
    name: 'IPA 独立行政法人情報処理推進機構',
    url: 'https://www.ipa.go.jp/news/index.html',
    category: '試験情報' // docs/01_overview.md の ?=exam に対応
  },
  {
    id: 'aws_blog',
    name: 'AWS Training and Certification ブログ（日本語）',
    url: 'https://aws.amazon.com/jp/blogs/news/category/aws-training-and-certification/'
  },
  {
    id: 'aws_coming_soon',
    name: '近日公開の AWS 認定（AWS Certification Coming Soon）',
    url: 'https://aws.amazon.com/jp/certification/coming-soon/'
  },
  {
    id: 'gcp_blog',
    name: 'Google Cloud 公式ブログ（トレーニングと認定）',
    url: 'https://cloud.google.com/blog/ja/topics/training-certifications'
  },
  {
    id: 'ms_skills_hub',
    name: 'The Skills Hub Blog（Microsoft Community Hub）',
    url: 'https://techcommunity.microsoft.com/category/skills-hub/blog/skills-hub-blog'
  }
];

const CONFIG = {
  // 情報取得元サイト一覧
  TARGET_SITES: TARGET_SITES,

  // 未連携チェックで保持する過去の投稿済みURLの最大保持件数
  MAX_HISTORY_COUNT: 500,

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
