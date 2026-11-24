/**
 * @file IpaScraper.js
 * @description IPAスクレイピングの後方互換ラッパー
 */

const IpaScraper = {
  fetchNews(url = CONFIG.TARGET_SITES[0].url, category = CONFIG.TARGET_SITES[0].category) {
    return Scrapers.scrapeSite({
      id: 'ipa',
      name: 'IPA 独立行政法人情報処理推進機構',
      url: url,
      category: category
    });
  },

  parseHtml(html, targetCategory = '') {
    return Scrapers.parseIpa(html, {
      name: 'IPA',
      category: targetCategory
    });
  }
};
