/**
 * @file IpaScraper.js
 * @description IPA（独立行政法人情報処理推進機構）新着情報のスクレイピング処理
 */

const IpaScraper = {
  /**
   * IPAの新着情報ページからニュース一覧を取得
   * @param {string} [url] 取得元URL（省略時はCONFIG.IPA_NEWS_URL）
   * @param {string} [targetCategory] 絞り込み対象カテゴリ（省略時はCONFIG.TARGET_CATEGORY）
   * @return {Array<Object>} ニュースオブジェクトの配列 [{ date, title, url, category }]
   */
  fetchNews(url = CONFIG.IPA_NEWS_URL, targetCategory = CONFIG.TARGET_CATEGORY) {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    if (statusCode !== 200) {
      throw new Error(`IPA新着情報の取得に失敗しました。HTTPステータス: ${statusCode}`);
    }

    const html = response.getContentText('UTF-8');
    return this.parseHtml(html, targetCategory);
  },

  /**
   * 取得したHTML文字列を解析してニュースアイテムを抽出
   * @param {string} html ページのHTML文字列
   * @param {string} [targetCategory] 絞り込みカテゴリ名（例: '試験情報'）
   * @return {Array<Object>} ニュースオブジェクトの配列
   */
  parseHtml(html, targetCategory = '') {
    const items = [];
    // <li class="news-list__item" ...> から </li> までのブロックを抽出
    const itemRegex = /<li[^>]*class=["'][^"']*news-list__item[^"']*["'][^>]*>([\s\S]*?)<\/a>\s*<\/li>/gi;
    let match;

    while ((match = itemRegex.exec(html)) !== null) {
      const itemBlock = match[1];

      // 1. リンク先URLの抽出
      const urlMatch = /<a\s+[^>]*href=["']([^"']+)["']/i.exec(match[0]);
      let link = urlMatch ? urlMatch[1].trim() : '';
      if (link.startsWith('/')) {
        link = 'https://www.ipa.go.jp' + link;
      }

      // 2. カテゴリの抽出
      const catMatch = /<li[^>]*class=["'][^"']*news-list__label[^"']*["'][^>]*>([\s\S]*?)<\/li>/i.exec(itemBlock);
      const category = catMatch ? this._cleanText(catMatch[1]) : '';

      // 3. 日付の抽出
      const dateMatch = /<li[^>]*class=["'][^"']*news-list__date[^"']*["'][^>]*>([\s\S]*?)<\/li>/i.exec(itemBlock);
      const date = dateMatch ? this._cleanText(dateMatch[1]) : '';

      // 4. タイトルの抽出
      const ttlMatch = /<p[^>]*class=["'][^"']*news-list__ttl[^"']*["'][^>]*>([\s\S]*?)<\/p>/i.exec(itemBlock);
      const title = ttlMatch ? this._cleanText(ttlMatch[1]) : '';

      // 必須情報が取得できているか確認
      if (!title || !link) {
        continue;
      }

      // カテゴリ絞り込み判定
      if (targetCategory && category && category !== targetCategory) {
        continue;
      }

      items.push({
        date: date,
        category: category,
        title: title,
        url: link
      });
    }

    return items;
  },

  /**
   * HTMLタグや余分な空白・特殊文字を除去・デコード
   * @private
   * @param {string} text 対象文字列
   * @return {string}
   */
  _cleanText(text) {
    if (!text) return '';
    return text
      .replace(/<[^>]+>/g, '') // HTMLタグ削除
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }
};
