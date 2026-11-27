/**
 * @file Scrapers.js
 * @description 各情報取得元サイトに対応したスクレイピング・解析処理
 */

const Scrapers = {
  /**
   * 共通HTTP取得関数
   * @param {string} url 取得先URL
   * @param {Object} [options] 取得オプション { useDefaultUserAgent?: boolean }
   * @return {{ statusCode: number, content: string }}
   */
  fetchUrl(url, options = {}) {
    const headers = {
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
    };
    // 一部サイト（LPI等）は疑似ブラウザのUser-AgentだとWAF等で403を返すため、
    // 必要なサイトのみGAS標準のUser-Agentをそのまま使用できるよう分岐している
    if (!options.useDefaultUserAgent) {
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: headers,
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
   * @return {Array<Object>} ニュース一覧 [{ from, date, title, description, url, siteName }]
   */
  scrapeSite(site) {
    const res = this.fetchUrl(site.url, {
      useDefaultUserAgent: Boolean(site.useDefaultUserAgent)
    });

    // 1. エラー応答チェック（ステータスコードが200以外）
    if (res.statusCode !== 200) {
      const httpError = new Error(`HTTPステータスコード異常: ${res.statusCode}`);
      httpError.errorType = 'HTTP_STATUS_ERROR';
      throw httpError;
    }

    try {
      let items = [];
      // 2. サイト種別に応じたパース処理
      switch (site.id) {
        case 'ipa':
          items = this.parseIpa(res.content, site);
          break;
        case 'aws_blog':
          items = this.parseAwsBlog(res.content, site);
          break;
        case 'aws_coming_soon':
          items = this.parseAwsComingSoon(res.content, site);
          break;
        case 'gcp_blog':
          items = this.parseGcpBlog(res.content, site);
          break;
        case 'ms_skills_hub':
          items = this.parseMsSkillsHub(res.content, site);
          break;
        case 'oracle_news':
          items = this.parseOracleGoogleNewsRss(res.content, site);
          break;
        case 'linuc_news':
          items = this.parseLinuCNews(res.content, site);
          break;
        case 'lpi_articles':
          items = this.parseLpiArticles(res.content, site);
          break;
        case 'cisco_learning':
          items = this.parseCiscoLearningRss(res.content, site);
          break;
        case 'comptia_press':
          items = this.parseCompTiaPressReleases(res.content, site);
          break;
        default:
          throw new Error(`未対応のサイトIDです: ${site.id}`);
      }

      // 3. タイトルフィルタリングの適用（定義されている場合のみ）
      if (typeof site.titleFilter === 'function') {
        items = items.filter(item => site.titleFilter(item.title));
      }

      // 4. from属性の付与
      return items.map(item => ({
        ...item,
        from: site.from || `${site.name}より`
      }));

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
        description: '', // IPA一覧には概要文がないため空文字
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

      // タイトル
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

      // 日付の抽出と書式変換（「D M月 YYYY」から「YYYY年M月D日」へ変更）
      let rawDate = '';
      let datetimeAttr = '';
      const timeMatch = /<time[^>]*datetime=["']([^"']+)["'][^>]*>([\s\S]*?)<\/time>/i.exec(block) ||
                        /<time[^>]*>([\s\S]*?)<\/time>/i.exec(block);
      if (timeMatch) {
        datetimeAttr = timeMatch[1] || '';
        rawDate = this._cleanText(timeMatch[2] || timeMatch[1]);
      }
      const formattedDate = this._formatAwsDate(rawDate, datetimeAttr);

      // 説明（本文抜粋）
      let description = '';
      const pMatch = /<div class=["'][^"']*blog-post-excerpt[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(block) ||
                    /<div class=["'][^"']*lb-rtxt[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(block) ||
                    /<p[^>]*>([\s\S]*?)<\/p>/i.exec(block);
      if (pMatch) {
        description = this._cleanText(pMatch[1]).slice(0, 250);
      }

      if (title && link) {
        items.push({
          date: formattedDate,
          title: title,
          description: description,
          url: link,
          siteName: site.name
        });
      }
    }

    return items;
  },

  /**
   * AWSブログの日付書式を「D M月 YYYY」から「YYYY年M月D日」に変換
   * 例: "10 9月 2026" -> "2026年9月10日"
   * @private
   */
  _formatAwsDate(rawDate, datetimeAttr) {
    if (!rawDate && !datetimeAttr) return '';

    // 1. テキスト「D M月 YYYY」形式のパース（例: "10 9月 2026"）
    const match = /(\d{1,2})\s*(\d{1,2})月\s*(\d{4})/.exec(rawDate);
    if (match) {
      const day = match[1];
      const month = match[2];
      const year = match[3];
      return `${year}年${month}月${day}日`;
    }

    // 2. datetime属性（例: "2026-09-10T08:48:07+09:00"）からの変換フォールバック
    if (datetimeAttr) {
      const isoFormatted = this._formatIsoDate(datetimeAttr);
      if (isoFormatted) return isoFormatted;
    }

    return rawDate;
  },

  /**
   * 3. 近日公開の AWS 認定（AWS Certification Coming Soon）のパース
   */
  parseAwsComingSoon(html, site) {
    const items = [];
    const sectionRegex = /<h[23][^>]*>(.*?)<\/h[23]>([\s\S]*?)(?=<h[23]|$)/gi;
    let match;

    while ((match = sectionRegex.exec(html)) !== null) {
      const heading = this._cleanText(match[1]);
      const body = match[2];

      if (heading.includes('試験') || heading.includes('認定') || heading.includes('AWS Certified')) {
        let date = '';
        const dateMatch = /(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)/.exec(this._cleanText(body));
        if (dateMatch) {
          date = dateMatch[1];
        }

        let description = '';
        const pMatch = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(body);
        if (pMatch) {
          description = this._cleanText(pMatch[1]).slice(0, 250);
        } else {
          description = this._cleanText(body).slice(0, 250);
        }

        items.push({
          date: date || '近日公開',
          title: heading,
          description: description,
          url: site.url,
          siteName: site.name
        });
      }
    }

    return items;
  },

  /**
   * 4. Google Cloud 公式ブログ（トレーニングと認定）のパース
   * docs/sample_gcp.html の構造（DOMアンカータグ）を優先解析
   */
  parseGcpBlog(html, site) {
    const items = [];
    const seenUrls = new Set();

    // 1. DOM上の記事ブロック（sample_gcp.htmlの構造）を解析
    // 例: <a href="https://cloud.google.com/blog/ja/topics/training-certifications/..." ...>
    const linkRegex = /<a[^>]+href=["'](https:\/\/cloud\.google\.com\/blog\/ja\/topics\/training-certifications\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const link = match[1];
      if (seenUrls.has(link) || link.endsWith('/topics/training-certifications')) continue;

      const block = match[2];

      // タイトル: <h5> タグまたは track-name 属性から抽出
      let title = '';
      const hMatch = /<h\d[^>]*>([\s\S]*?)<\/h\d>/i.exec(block);
      if (hMatch) {
        title = this._cleanText(hMatch[1]);
      } else {
        const trackNameMatch = /track-name=["']([^"']+)["']/i.exec(match[0]);
        if (trackNameMatch) {
          title = this._cleanText(trackNameMatch[1]);
        }
      }

      if (!title) continue;
      seenUrls.add(link);

      // 説明: <p> タグ（執筆者や所要時間など）
      let description = '';
      const pMatch = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(block);
      if (pMatch) {
        description = this._cleanText(pMatch[1]);
      }

      // 日付: スクリプト内のタイムスタンプ検索（DOM側に日付要素が出力されないため近傍のUnix秒を利用）
      let date = '';
      const idx = html.indexOf(link);
      if (idx !== -1) {
        const contextStr = html.slice(Math.max(0, idx - 400), Math.min(html.length, idx + 400));
        const timeMatch = /\[(\d{10})\]/.exec(contextStr);
        if (timeMatch) {
          const timestampSec = parseInt(timeMatch[1], 10);
          date = this._formatDateJa(new Date(timestampSec * 1000));
        }
      }

      items.push({
        date: date,
        title: title,
        description: description,
        url: link,
        siteName: site.name
      });
    }

    if (items.length > 0) {
      return items;
    }

    // 2. DOMから抽出できなかった場合のスクリプト解析フォールバック
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;

    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
      const code = scriptMatch[1];
      if (!code.includes('topics/training-certifications/')) continue;

      const urlPattern = /"(https:\/\/cloud\.google\.com\/blog\/ja\/topics\/training-certifications\/[^"]+)"/g;
      let urlMatch;

      while ((urlMatch = urlPattern.exec(code)) !== null) {
        const link = urlMatch[1];
        if (seenUrls.has(link) || link.endsWith('/topics/training-certifications')) continue;
        seenUrls.add(link);

        const idx = urlMatch.index;
        const contextStr = code.slice(Math.max(0, idx - 400), Math.min(code.length, idx + 400));

        let title = '';
        const titleMatch = /"([^"\\]*(?:認定|トレーニング|コース|資格|Google|AI|学習)[^"\\]*)"/i.exec(contextStr);
        if (titleMatch) {
          title = this._cleanText(titleMatch[1]);
        }
        if (!title) {
          const slug = link.split('/').pop().replace(/-/g, ' ');
          title = slug;
        }

        let date = '';
        const timeMatch = /\[(\d{10})\]/.exec(contextStr);
        if (timeMatch) {
          const timestampSec = parseInt(timeMatch[1], 10);
          date = this._formatDateJa(new Date(timestampSec * 1000));
        }

        let description = '';
        const descMatch = /"([^"\\]{20,150})"/g;
        let dMatch;
        while ((dMatch = descMatch.exec(contextStr)) !== null) {
          const textCandidate = this._cleanText(dMatch[1]);
          if (textCandidate !== title && !textCandidate.startsWith('http') && !textCandidate.includes('topics/')) {
            description = textCandidate;
            break;
          }
        }

        items.push({
          date: date,
          title: title,
          description: description,
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
              date = this._formatDateJa(new Date(obj.postTime));
            }

            let description = '';
            for (const prop in obj) {
              if (prop.startsWith('teaser') || prop.startsWith('introduction') || prop.startsWith('body')) {
                if (typeof obj[prop] === 'string' && obj[prop].length > 10) {
                  description = this._cleanText(obj[prop]).slice(0, 250);
                  break;
                }
              }
            }

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
              description: description,
              url: link,
              siteName: site.name
            });
          }
        }

        if (items.length > 0) {
          return items;
        }
      } catch (e) {
        console.warn('Microsoft Skills Hub: __NEXT_DATA__のパースに失敗しました。フォールバックします。', e);
      }
    }

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
        description: '',
        url: fullUrl,
        siteName: site.name
      });
    }

    return items;
  },

  /**
   * 6. Oracle認定資格ニュース（Googleニュース RSS）のパース
   */
  parseOracleGoogleNewsRss(xml, site) {
    // GoogleニュースRSSのdescriptionはタイトル・媒体名リンクのみのため空文字とする
    return this._parseRssItems(xml, site, { includeDescription: false });
  },

  /**
   * 9. Learn with Cisco - Cisco Blogs（RSS）のパース
   */
  parseCiscoLearningRss(xml, site) {
    return this._parseRssItems(xml, site, { includeDescription: true });
  },

  /**
   * RSS 2.0 フィード共通パーサー
   * @private
   * @param {string} xml RSS XML文字列
   * @param {Object} site サイト設定
   * @param {Object} [options] オプション { includeDescription?: boolean }
   * @return {Array<Object>}
   */
  _parseRssItems(xml, site, options = {}) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];

      const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(block);
      const linkMatch = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i.exec(block);
      const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block);

      const title = titleMatch ? this._cleanText(titleMatch[1]) : '';
      const link = linkMatch ? this._cleanText(linkMatch[1]) : '';
      if (!title || !link) continue;

      let date = '';
      if (pubDateMatch) {
        date = this._formatRssDateJst(this._cleanText(pubDateMatch[1]));
      }

      let description = '';
      if (options.includeDescription) {
        const descMatch = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i.exec(block);
        if (descMatch) {
          description = this._cleanText(descMatch[1]).slice(0, 250);
        }
      }

      items.push({
        date: date,
        title: title,
        description: description,
        url: link,
        siteName: site.name
      });
    }

    return items;
  },

  /**
   * 7. LinuC ニュース・トピックス一覧のパース
   */
  parseLinuCNews(html, site) {
    const items = [];
    // HTMLコメント内のダミー要素を除外してからパース
    const cleanedHtml = html.replace(/<!--[\s\S]*?-->/g, '');
    const itemRegex = /<li[^>]*class=["'][^"']*app-news-item[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
    const maxItems = site.maxItems || 30;
    let match;

    while ((match = itemRegex.exec(cleanedHtml)) !== null) {
      if (items.length >= maxItems) break;

      const block = match[1];

      // 日付（例: 2026.11.24 -> 2026年11月24日）
      const dateMatch = /<span[^>]*class=["'][^"']*app-news-date[^"']*["'][^>]*>([\s\S]*?)<\/span>/i.exec(block);
      const rawDate = dateMatch ? this._cleanText(dateMatch[1]) : '';
      const date = this._formatDotDate(rawDate);

      // リンクとタイトル
      const linkMatch = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(block);
      if (!linkMatch) continue;

      let link = linkMatch[1].trim();
      if (link.startsWith('/')) {
        link = 'https://linuc.org' + link;
      }
      const title = this._cleanText(linkMatch[2]);

      if (!title || !link || link === '#') continue;

      items.push({
        date: date,
        title: title,
        description: '', // LinuCニュース一覧には概要文がないため空文字
        url: link,
        siteName: site.name
      });
    }

    return items;
  },

  /**
   * 8. LPI 公式ブログ・記事一覧（日本語）のパース
   */
  parseLpiArticles(html, site) {
    const items = [];
    const seenUrls = new Set();

    // <div class="blog-list"> 配下の各記事ブロック（<div class="text">...</div>）を抽出
    const textBlockRegex = /<div[^>]*class=["'][^"']*\btext\b[^"']*["'][^>]*>([\s\S]*?)(?=<div[^>]*class=["'][^"']*\bitem\b|<div[^>]*class=["'][^"']*(?:pagination|nav-links|pager)[^"']*["']|<\/article>|$)/gi;
    let match;

    while ((match = textBlockRegex.exec(html)) !== null) {
      const block = match[1];

      // タイトルとURL（<h3><a href="...">タイトル</a></h3>）
      const h3Match = /<h3[^>]*>[\s\S]*?<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/i.exec(block);
      if (!h3Match) continue;

      let link = h3Match[1].trim();
      if (link.startsWith('/')) {
        link = 'https://www.lpi.org' + link;
      }
      const title = this._cleanText(h3Match[2]);

      if (!title || !link || seenUrls.has(link)) continue;
      seenUrls.add(link);

      // 日付（一覧に<time>要素が存在する場合のみ抽出）
      let date = '';
      const timeMatch = /<time[^>]*datetime=["']([^"']+)["'][^>]*>([\s\S]*?)<\/time>/i.exec(block) ||
                        /<time[^>]*>([\s\S]*?)<\/time>/i.exec(block);
      if (timeMatch) {
        const dt = timeMatch[1] || '';
        date = this._formatIsoDate(dt) || this._cleanText(timeMatch[2] || timeMatch[1]);
      }

      // 説明（post-excerpt 内の本文抜粋。「Read more」リンクは除外）
      let description = '';
      const excerptMatch = /<div[^>]*class=["'][^"']*post-excerpt[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(block);
      if (excerptMatch) {
        const cleanedExcerpt = excerptMatch[1].replace(/<a[^>]*class=["'][^"']*button-link[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '');
        description = this._cleanText(cleanedExcerpt).slice(0, 250);
      }

      items.push({
        date: date,
        title: title,
        description: description,
        url: link,
        siteName: site.name
      });
    }

    return items;
  },

  /**
   * 10. CompTIA プレスリリース（日本語公式）のパース
   */
  parseCompTiaPressReleases(html, site) {
    const items = [];
    const seenUrls = new Set();
    const maxItems = site.maxItems || 30;

    // 記事一覧は本文エリア（content-page-main-content-area）内に出力されるため、
    // ナビゲーション等のリンク誤抽出を防ぐ目的で対象範囲を絞り込む
    const areaMatch = /data-automation-id=["']content-page-main-content-area["'][^>]*>([\s\S]*?)<\/article>/i.exec(html);
    const targetHtml = areaMatch ? areaMatch[1] : html;

    // <h4><a href="...">タイトル</a></h4> に続いて <p>YYYY年M月D日</p> が並ぶ構造を抽出
    const itemRegex = /<h4[^>]*>[\s\S]*?<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h4>\s*(?:<p[^>]*>([\s\S]*?)<\/p>)?/gi;
    let match;

    while ((match = itemRegex.exec(targetHtml)) !== null) {
      if (items.length >= maxItems) break;

      let link = match[1].trim();
      if (link.startsWith('/')) {
        link = 'https://www.comptia.org' + link;
      }
      const title = this._cleanText(match[2]);
      const dateText = match[3] ? this._cleanText(match[3]) : '';
      // 日付文字列でない段落を誤って日付として扱わないよう年月日形式のみを採用
      const dateMatch = /(\d{4}年\d{1,2}月\d{1,2}日)/.exec(dateText);
      const date = dateMatch ? dateMatch[1] : '';

      if (!title || !link || seenUrls.has(link)) continue;
      seenUrls.add(link);

      items.push({
        date: date,
        title: title,
        description: '', // CompTIA一覧ページには概要文がないため空文字
        url: link,
        siteName: site.name
      });
    }

    return items;
  },

  /**
   * Dateオブジェクトを「YYYY年M月D日」形式に変換
   * @private
   */
  _formatDateJa(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    return `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
  },

  /**
   * ISO形式等の「YYYY-MM-DD」を含む文字列を「YYYY年M月D日」形式に変換
   * @private
   */
  _formatIsoDate(rawDate) {
    if (!rawDate) return '';
    const match = /(\d{4})-(\d{2})-(\d{2})/.exec(rawDate);
    if (!match) return '';
    return `${parseInt(match[1], 10)}年${parseInt(match[2], 10)}月${parseInt(match[3], 10)}日`;
  },

  /**
   * RSSのpubDate文字列をJST基準の「YYYY年M月D日」形式に変換
   * @private
   */
  _formatRssDateJst(rawDate) {
    if (!rawDate) return '';
    const parsed = new Date(rawDate);
    if (isNaN(parsed.getTime())) return rawDate;
    // UTC+9（JST）に変換して年月日を抽出
    const jst = new Date(parsed.getTime() + 9 * 60 * 60 * 1000);
    return `${jst.getUTCFullYear()}年${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日`;
  },

  /**
   * ドット区切りの日付（YYYY.MM.DD）を「YYYY年M月D日」形式に変換
   * @private
   */
  _formatDotDate(rawDate) {
    if (!rawDate) return '';
    const match = /(\d{4})\.(\d{1,2})\.(\d{1,2})/.exec(rawDate);
    if (match) {
      return `${parseInt(match[1], 10)}年${parseInt(match[2], 10)}月${parseInt(match[3], 10)}日`;
    }
    return rawDate;
  },

  /**
   * テキストクリーニングヘルパー
   * @private
   */
  _cleanText(text) {
    if (!text) return '';
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
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
