/**
 * @file Scrapers.js
 * @description 各情報取得元サイトに対応したスクレイピング・解析処理
 */

const Scrapers = {
  /**
   * 共通HTTP取得関数
   * @param {string} url 取得先URL
   * @return {{ statusCode: number, content: string }}
   */
  fetchUrl(url) {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
      },
      muteHttpExceptions: true
    });

    return {
      statusCode: response.getResponseCode(),
      content: response.getContentText('UTF-8')
    };
  },

  /**
   * サイト設定に応じたスクレイピングを実行
   * @param {Object} site サイト設定
   * @return {Array<Object>} ニュース一覧 [{ date, title, url, siteName }]
   */
  scrapeSite(site) {
    const res = this.fetchUrl(site.url);

    // 1. エラー応答チェック（ステータスコードが200以外）
    if (res.statusCode !== 200) {
      const httpError = new Error(`HTTPステータスコード異常: ${res.statusCode}`);
      httpError.errorType = 'HTTP_STATUS_ERROR';
      throw httpError;
    }

    try {
      // 2. サイト種別に応じたパース処理
      switch (site.id) {
        case 'ipa':
          return this.parseIpa(res.content, site);
        case 'aws_blog':
          return this.parseAwsBlog(res.content, site);
        case 'aws_coming_soon':
          return this.parseAwsComingSoon(res.content, site);
        case 'gcp_blog':
          return this.parseGcpBlog(res.content, site);
        case 'ms_skills_hub':
          return this.parseMsSkillsHub(res.content, site);
        default:
          throw new Error(`未対応のサイトIDです: ${site.id}`);
      }
    } catch (e) {
      if (!e.errorType) {
        e.errorType = 'SCRAPING_PARSE_ERROR';
      }
      throw e;
    }
  },

  /**
   * 1. IPA（情報処理推進機構）のパース
   */
  parseIpa(html, site) {
    const items = [];
    const itemRegex = /<li[^>]*class=["'][^"']*news-list__item[^"']*["'][^>]*>([\s\S]*?)<\/a>\s*<\/li>/gi;
    let match;

    while ((match = itemRegex.exec(html)) !== null) {
      const itemBlock = match[1];

      // URL
      const urlMatch = /<a\s+[^>]*href=["']([^"']+)["']/i.exec(match[0]);
      let link = urlMatch ? urlMatch[1].trim() : '';
      if (link.startsWith('/')) {
        link = 'https://www.ipa.go.jp' + link;
      }

      // カテゴリ
      const catMatch = /<li[^>]*class=["'][^"']*news-list__label[^"']*["'][^>]*>([\s\S]*?)<\/li>/i.exec(itemBlock);
      const category = catMatch ? this._cleanText(catMatch[1]) : '';

      // 日付
      const dateMatch = /<li[^>]*class=["'][^"']*news-list__date[^"']*["'][^>]*>([\s\S]*?)<\/li>/i.exec(itemBlock);
      const date = dateMatch ? this._cleanText(dateMatch[1]) : '';

      // タイトル
      const ttlMatch = /<p[^>]*class=["'][^"']*news-list__ttl[^"']*["'][^>]*>([\s\S]*?)<\/p>/i.exec(itemBlock);
      const title = ttlMatch ? this._cleanText(ttlMatch[1]) : '';

      if (!title || !link) continue;

      // 「試験情報」の絞り込み
      if (site.category && category && category !== site.category) {
        continue;
      }

      items.push({
        date: date,
        title: title,
        url: link,
        siteName: site.name
      });
    }

    return items;
  },

  /**
   * 2. AWS Training and Certification ブログ（日本語）のパース
   */
  parseAwsBlog(html, site) {
    const items = [];
    const articleRegex = /<article class=["'][^"']*blog-post[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi;
    let match;

    while ((match = articleRegex.exec(html)) !== null) {
      const block = match[1];

      // URLの抽出（属性順序に依存しない）
      let link = '';
      const urlMatch = /<a\s+[^>]*?(?:property=["']url["'][^>]*?href=["']([^"']+)["']|href=["']([^"']+)["'][^>]*?property=["']url["']|href=["']([^"']+)["'][^>]*?rel=["']bookmark["'])/i.exec(block);
      if (urlMatch) {
        link = (urlMatch[1] || urlMatch[2] || urlMatch[3] || '').trim();
      } else {
        const fallbackMatch = /<h2[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i.exec(block);
        if (fallbackMatch) link = fallbackMatch[1].trim();
      }

      if (link.startsWith('/')) {
        link = 'https://aws.amazon.com' + link;
      }

      let title = '';
      const nameMatch = /<span property=["']name headline["'][^>]*>([\s\S]*?)<\/span>/i.exec(block);
      if (nameMatch) {
        title = this._cleanText(nameMatch[1]);
      } else {
        const h2Match = /<h2[^>]*blog-post-title[^>]*>([\s\S]*?)<\/h2>/i.exec(block) || /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(block);
        if (h2Match) {
          title = this._cleanText(h2Match[1]);
        }
      }

      // 日付
      let date = '';
      const timeMatch = /<time[^>]*datetime=["']([^"']+)["'][^>]*>([\s\S]*?)<\/time>/i.exec(block) ||
                        /<time[^>]*>([\s\S]*?)<\/time>/i.exec(block);
      if (timeMatch) {
        date = this._cleanText(timeMatch[2] || timeMatch[1]);
      }

      if (title && link) {
        items.push({
          date: date,
          title: title,
          url: link,
          siteName: site.name
        });
      }
    }

    return items;
  },

  /**
   * 3. 近日公開の AWS 認定（AWS Certification Coming Soon）のパース
   */
  parseAwsComingSoon(html, site) {
    const items = [];
    // 「試験の更新: ...」などの見出しと主要な日程を抽出
    const sectionRegex = /<h[23][^>]*>(.*?)<\/h[23]>([\s\S]*?)(?=<h[23]|$)/gi;
    let match;

    while ((match = sectionRegex.exec(html)) !== null) {
      const heading = this._cleanText(match[1]);
      const body = match[2];

      // 試験更新や新試験に関する見出しを対象とする
      if (heading.includes('試験') || heading.includes('認定') || heading.includes('AWS Certified')) {
        // 主要な日程などを本文から抽出
        let date = '';
        const dateMatch = /(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)/.exec(this._cleanText(body));
        if (dateMatch) {
          date = dateMatch[1];
        }

        // URLにアンカーを付けるか、ベースURLを使用
        const itemUrl = site.url;

        items.push({
          date: date || '近日公開',
          title: heading,
          url: itemUrl,
          siteName: site.name
        });
      }
    }

    return items;
  },

  /**
   * 4. Google Cloud 公式ブログ（トレーニングと認定）のパース
   */
  parseGcpBlog(html, site) {
    const items = [];
    // スクリプト内の記事配列から抽出
    // 例: "https://cloud.google.com/blog/ja/topics/training-certifications/..."
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;

    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
      const code = scriptMatch[1];
      if (!code.includes('topics/training-certifications/')) continue;

      // 記事URLとタイトルを含むパターン
      // ["タイトル", ..., "https://cloud.google.com/blog/ja/topics/training-certifications/slug", [timestamp], ...]
      const urlPattern = /"(https:\/\/cloud\.google\.com\/blog\/ja\/topics\/training-certifications\/[^"]+)"/g;
      let urlMatch;
      const foundUrls = new Set();

      while ((urlMatch = urlPattern.exec(code)) !== null) {
        const link = urlMatch[1];
        if (foundUrls.has(link) || link.endsWith('/topics/training-certifications')) continue;
        foundUrls.add(link);

        // 前後のテキストからタイトルやタイムスタンプを検索
        const idx = urlMatch.index;
        const contextStr = code.slice(Math.max(0, idx - 400), Math.min(code.length, idx + 400));

        // タイトル抽出（日本語や文字列）
        let title = '';
        const titleMatch = /"([^"\\]*(?:認定|トレーニング|コース|資格|Google|AI|学習)[^"\\]*)"/i.exec(contextStr);
        if (titleMatch) {
          title = this._cleanText(titleMatch[1]);
        }
        if (!title) {
          // スラッグから簡易タイトル生成
          const slug = link.split('/').pop().replace(/-/g, ' ');
          title = slug;
        }

        // タイムスタンプ抽出 [1795514400]
        let date = '';
        const timeMatch = /\[(\d{10})\]/.exec(contextStr);
        if (timeMatch) {
          const timestampSec = parseInt(timeMatch[1], 10);
          const d = new Date(timestampSec * 1000);
          date = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
        }

        items.push({
          date: date,
          title: title,
          url: link,
          siteName: site.name
        });
      }
    }

    return items;
  },

  /**
   * 5. The Skills Hub Blog（Microsoft Community Hub）のパース
   */
  parseMsSkillsHub(html, site) {
    const items = [];
    const baseHost = 'https://techcommunity.microsoft.com';

    // __NEXT_DATA__ が存在する場合は ApolloState から取得
    const nextDataMatch = /<script id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
    if (nextDataMatch) {
      try {
        const data = JSON.parse(nextDataMatch[1]);
        const apollo = data?.props?.pageProps?.apolloState || {};

        for (const key in apollo) {
          const obj = apollo[key];
          if (obj && obj.__typename === 'BlogTopicMessage' && obj.subject) {
            const title = this._cleanText(obj.subject);
            let date = '';
            if (obj.postTime) {
              const d = new Date(obj.postTime);
              date = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
            }

            // HTML内のリンク検索でこのIDに対応するURLを取得
            const idNum = obj.uid || (obj.id ? obj.id.replace('message:', '') : '');
            let link = `${baseHost}/category/skills-hub/blog/skills-hub-blog`;
            if (idNum) {
              const linkMatch = new RegExp(`href=["']([^"']*${idNum}[^"']*)["']`, 'i').exec(html);
              if (linkMatch) {
                link = linkMatch[1].startsWith('http') ? linkMatch[1] : baseHost + linkMatch[1];
              }
            }

            items.push({
              date: date,
              title: title,
              url: link,
              siteName: site.name
            });
          }
        }

        if (items.length > 0) {
          return items;
        }
      } catch (e) {
        console.warn('Microsoft Skills Hub: __NEXT_DATA__のパースに失敗しました。HTMLパースへフォールバックします。', e);
      }
    }

    // HTMLリンク直接パースへのフォールバック
    const linkRegex = /<a[^>]+href=["'](\/blog\/skills-hub-blog\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    const seenLinks = new Set();

    while ((match = linkRegex.exec(html)) !== null) {
      const linkPath = match[1];
      const linkText = this._cleanText(match[2]);
      const fullUrl = baseHost + linkPath;

      if (!linkText || linkText.length < 5 || seenLinks.has(fullUrl)) continue;
      seenLinks.add(fullUrl);

      items.push({
        date: '',
        title: linkText,
        url: fullUrl,
        siteName: site.name
      });
    }

    return items;
  },

  /**
   * テキストクリーニングヘルパー
   * @private
   */
  _cleanText(text) {
    if (!text) return '';
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
};
