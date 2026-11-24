/**
 * @file StateService.js
 * @description 連携済み（投稿済み）情報の状態管理
 */

const StateService = {
  PROPERTY_KEY: 'POSTED_NEWS_URLS',

  /**
   * すでにSlackへ投稿済みのURLか判定
   * @param {string} url ニュースのURL
   * @return {boolean} true: 投稿済み, false: 未連携
   */
  isAlreadyPosted(url) {
    if (!url) return true;
    const postedUrls = this.getPostedUrls();
    return postedUrls.includes(url);
  },

  /**
   * 投稿済みURLリストを取得
   * @return {Array<string>}
   */
  getPostedUrls() {
    const props = PropertiesService.getScriptProperties();
    const raw = props.getProperty(this.PROPERTY_KEY);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn('連携済みURLリストのパースに失敗しました。空配列として扱います。', e);
      return [];
    }
  },

  /**
   * URLを投稿済みとして記録
   * @param {string} url 投稿したニュースのURL
   */
  markAsPosted(url) {
    this.markMultipleAsPosted([url]);
  },

  /**
   * 複数のURLを投稿済みとして一括記録
   * @param {Array<string>} urls 投稿したニュースのURL配列
   */
  markMultipleAsPosted(urls) {
    if (!urls || urls.length === 0) return;

    const postedUrls = this.getPostedUrls();
    const set = new Set(postedUrls);

    for (const url of urls) {
      if (url) {
        set.add(url);
      }
    }

    // 最新のMAX_HISTORY_COUNT件のみを保持
    const updatedList = Array.from(set).slice(-CONFIG.MAX_HISTORY_COUNT);
    const props = PropertiesService.getScriptProperties();
    props.setProperty(this.PROPERTY_KEY, JSON.stringify(updatedList));
  },

  /**
   * 状態のリセット（テスト・デバッグ用）
   */
  resetPostedUrls() {
    const props = PropertiesService.getScriptProperties();
    props.deleteProperty(this.PROPERTY_KEY);
  }
};
