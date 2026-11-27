/**
 * @file IpaScraper.js
 * @description IPAスクレイピングの後方互換ラッパー
 *
 * 複数サイト対応に伴いスクレイピング本体は Scrapers.js へ統合しましたが、
 * 既存のGASトリガーや旧テストコードから IpaScraper 経由で呼び出されても
 * 動作し続けるように互換用ラッパーとして維持しています。
 */

const IpaScraper = {
  /**
   * IPAの新着情報を取得・パースする
   * @param {string} [url] 取得対象URL（省略時は Config.js の IPA 設定を使用）
   * @param {string} [category] 絞り込み対象カテゴリ（省略時は '試験情報'）
   * @return {Array<Object>}
   */
  fetchNews(url = CONFIG.TARGET_SITES[0].url, category = CONFIG.TARGET_SITES[0].category) {
    // Config.js の基本設定を引き継ぎつつ、引数で渡された URL・カテゴリで上書きして実行する
    const baseSite = CONFIG.TARGET_SITES[0];
    return Scrapers.scrapeSite({
      ...baseSite,
      url: url,
      category: category
    });
  },

  /**
   * HTML文字列からIPAニュースを抽出する
   * @param {string} html HTML文字列
   * @param {string} [targetCategory] 絞り込みカテゴリ
   * @return {Array<Object>}
   */
  parseHtml(html, targetCategory = '') {
    return Scrapers.parseIpa(html, {
      name: CONFIG.TARGET_SITES[0].name,
      category: targetCategory
    });
  }
};
