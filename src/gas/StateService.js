/**
 * @file StateService.js
 * @description 連携済み（投稿済み）情報の状態管理
 */

const StateService = {
  PROPERTY_KEY: 'POSTED_NEWS_KEYS',

  /**
   * ニュースアイテムから一意なキーを生成
   * （URLが同一でもタイトルが変わるページに対応するため、URLとタイトルの組み合わせ）
   * @param {Object|string} itemOrUrl ニュースアイテム { url, title } または URL文字列
   * @return {string}
   */
  generateKey(itemOrUrl) {
    if (typeof itemOrUrl === 'string') {
      return itemOrUrl;
    }
    if (!itemOrUrl || !itemOrUrl.url) return '';
    return `${itemOrUrl.url}::${itemOrUrl.title || ''}`;
  },

  /**
   * すでにSlackへ投稿済みのアイテムか判定
   * @param {Object|string} itemOrUrl ニュースアイテムまたはURL
   * @return {boolean} true: 投稿済み, false: 未連携
   */
  isAlreadyPosted(itemOrUrl) {
    const key = this.generateKey(itemOrUrl);
    if (!key) return true;

    const postedKeys = this.getPostedKeys();
    // 完全一致、または過去のURLのみ保持しているデータとの互換性チェック
    const rawUrl = typeof itemOrUrl === 'string' ? itemOrUrl : itemOrUrl.url;
    return postedKeys.includes(key) || postedKeys.includes(rawUrl);
  },

  /**
   * 投稿済みキー一覧を取得
   * @return {Array<string>}
   */
  getPostedKeys() {
    const props = PropertiesService.getScriptProperties();
    const raw = props.getProperty(this.PROPERTY_KEY);
    if (!raw) {
      // 過去のプロパティキーとの互換性
      const legacyRaw = props.getProperty('POSTED_NEWS_URLS');
      if (legacyRaw) {
        try {
          return JSON.parse(legacyRaw);
        } catch (e) {
          return [];
        }
      }
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn('連携済みキーリストのパースに失敗しました。空配列として扱います。', e);
      return [];
    }
  },

  /**
   * アイテムを投稿済みとして記録
   * @param {Object|string} itemOrUrl ニュースアイテムまたはURL
   */
  markAsPosted(itemOrUrl) {
    this.markMultipleAsPosted([itemOrUrl]);
  },

  /**
   * 複数のアイテムを一括で投稿済みとして記録
   * @param {Array<Object|string>} items ニュースアイテム配列
   */
  markMultipleAsPosted(items) {
    if (!items || items.length === 0) return;

    const postedKeys = this.getPostedKeys();
    const set = new Set(postedKeys);

    for (const item of items) {
      const key = this.generateKey(item);
      if (key) {
        set.add(key);
      }
    }

    // 最新のMAX_HISTORY_COUNT件のみを保持
    const maxCount = CONFIG.MAX_HISTORY_COUNT || 500;
    const updatedList = Array.from(set).slice(-maxCount);
    const props = PropertiesService.getScriptProperties();
    props.setProperty(this.PROPERTY_KEY, JSON.stringify(updatedList));
  },

  /**
   * 状態のリセット（テスト・デバッグ用）
   */
  resetPostedKeys() {
    const props = PropertiesService.getScriptProperties();
    props.deleteProperty(this.PROPERTY_KEY);
    props.deleteProperty('POSTED_NEWS_URLS');
  }
};
