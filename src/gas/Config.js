/**
 * @file Config.js
 * @description システム設定およびスクリプトプロパティの管理
 */

/**
 * 情報取得元サイトの定義
 * docs/01_overview.md の最新仕様に基づく設定
 */
const TARGET_SITES = [
  {
    id: 'ipa',
    name: 'IPA 独立行政法人情報処理推進機構',
    from: 'IPA(情報処理推進機構)の最新情報より',
    // クエリパラメータ (?=exam) はクライアント側JSフィルタ用のため、実HTML取得元にはベースURLを指定する
    url: 'https://www.ipa.go.jp/news/index.html',
    category: '試験情報' // ?=exam に相当するカテゴリでプログラム側で絞り込む
  },
  {
    id: 'aws_blog',
    name: 'AWS Training and Certification ブログ（日本語）',
    from: 'AWS Training and Certification ブログ（日本語）より',
    url: 'https://aws.amazon.com/jp/blogs/news/category/aws-training-and-certification/',
    // タイトルに「AWS 認定」または「AWS Certified」の表記があるもののみ
    titleFilter: (title) => title.includes('AWS 認定') || title.includes('AWS Certified')
  },
  {
    id: 'aws_coming_soon',
    name: '近日公開の AWS 認定（AWS Certification Coming Soon）',
    from: '近日公開の AWS 認定より',
    url: 'https://aws.amazon.com/jp/certification/coming-soon/'
  },
  {
    id: 'gcp_blog',
    name: 'Google Cloud 公式ブログ（トレーニングと認定）',
    from: 'Google Cloud 公式ブログ（トレーニングと認定）より',
    url: 'https://cloud.google.com/blog/ja/topics/training-certifications'
    // docs/01_overview.md の修正に伴いタイトルフィルタは設定なし（全件対象）
  },
  {
    id: 'ms_skills_hub',
    name: 'The Skills Hub Blog（Microsoft Community Hub）',
    from: 'The Skills Hub Blog（Microsoft Community Hub）より',
    url: 'https://techcommunity.microsoft.com/category/skills-hub/blog/skills-hub-blog',
    // タイトルに「Microsoft Certified」の表記があるもののみ
    titleFilter: (title) => title.includes('Microsoft Certified')
  },
  {
    id: 'oracle_news',
    name: 'Oracle認定資格ニュース from Googleニュース',
    from: 'Oracle認定資格のニュースより',
    url: 'https://news.google.com/rss/search?q=%22ORACLE%20MASTER%22%20OR%20%22Oracle%20%E8%AA%8D%E5%AE%9A%E8%B3%87%E6%A0%BC%22%20OR%20%22Oracle%20Cloud%20Infrastructure%20%E8%AA%8D%E5%AE%9A%22&hl=ja&gl=JP&ceid=JP:ja'
  },
  {
    id: 'linuc_news',
    name: 'LinuC ニュース・トピックス一覧',
    from: 'LinuC ニュース・トピックス一覧より',
    url: 'https://linuc.org/news/',
    // 全期間（1000件以上）が1ページに掲載されているため最新件数に制限
    maxItems: 30
  },
  {
    id: 'lpi_articles',
    name: 'LPI 公式ブログ・記事一覧（日本語）',
    from: 'LPI 公式ブログ・記事一覧（日本語）より',
    url: 'https://www.lpi.org/ja/articles/region/japan-ja/',
    // カスタムUser-Agentでは403になるためGAS標準のUser-Agentを使用
    useDefaultUserAgent: true
  },
  {
    id: 'cisco_learning',
    name: 'Learn with Cisco - Cisco Blogs',
    from: 'Learn with Cisco - Cisco Blogsより',
    url: 'https://blogs.cisco.com/learning/feed'
  },
  {
    id: 'comptia_press',
    name: 'CompTIA プレスリリース（日本語公式）',
    from: 'CompTIA プレスリリース（日本語公式）より',
    url: 'https://www.comptia.org/ja-jp/about-us/news/press-releases/',
    // 全期間のプレスリリース（100件以上）が1ページに掲載されているため最新件数に制限
    maxItems: 30
  }
];

const CONFIG = {
  // 情報取得元サイト一覧
  TARGET_SITES: TARGET_SITES,

  // 未連携チェックで保持する過去の投稿済みキーの最大保持件数
  // GAS ScriptProperties の容量制限（1プロパティ9KB / 全体500KB）を超過しないよう上限を設けています
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
