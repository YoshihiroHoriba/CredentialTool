/**
 * @file TestIpaScraper.js
 * @description IpaScraperモジュールのテストコード（GAS実行用）
 */

/**
 * モックHTMLを使用したIpaScraper.parseHtmlのテスト
 */
function testIpaScraperParseHtml() {
  const mockHtml = `
  <div class="news-list__wrap">
    <ul class="news-list">
      <li class="news-list__item" data-search="exam">
        <a href="https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/pass.html" class="news-list__inner icon--out" target="_blank">
          <ul class="news-list__data-box">
            <li class="news-list__label label --info-cat --exam">試験情報</li>
            <li class="news-list__date">2026年11月20日</li>
          </ul>
          <p class="news-list__ttl">ITパスポート試験（令和8年10月実施）の合格者受験番号一覧を掲載しました</p>
        </a>
      </li>
      <li class="news-list__item" data-search="exam">
        <a href="/shiken/mousikomi/cbt_sg_fe.html#cbt04" class="news-list__inner ">
          <ul class="news-list__data-box">
            <li class="news-list__label label --info-cat --exam">試験情報</li>
            <li class="news-list__date">2026年11月20日</li>
          </ul>
          <p class="news-list__ttl">情報セキュリティマネジメント試験・基本情報技術者試験（令和8年10月実施）の合格者受験番号一覧を掲載しました</p>
        </a>
      </li>
      <li class="news-list__item" data-search="digital">
        <a href="/digital/ai/test.html" class="news-list__inner ">
          <ul class="news-list__data-box">
            <li class="news-list__label label --info-cat --digital">デジタル</li>
            <li class="news-list__date">2026年11月17日</li>
          </ul>
          <p class="news-list__ttl">AI関連のガイドラインを公開しました</p>
        </a>
      </li>
    </ul>
  </div>
  `;

  console.log('--- テスト1: 「試験情報」カテゴリのみ抽出 ---');
  const examItems = IpaScraper.parseHtml(mockHtml, '試験情報');
  console.log('取得件数:', examItems.length);
  if (examItems.length !== 2) {
    throw new Error(`アサーション失敗: 期待件数 2, 実際 ${examItems.length}`);
  }
  if (!examItems[1].url.startsWith('https://www.ipa.go.jp/shiken/')) {
    throw new Error(`アサーション失敗: 相対パスが絶対URLに変換されていません: ${examItems[1].url}`);
  }
  console.log('テスト1 成功: パース結果:', JSON.stringify(examItems, null, 2));

  console.log('--- テスト2: カテゴリ絞り込みなし（全件） ---');
  const allItems = IpaScraper.parseHtml(mockHtml, '');
  if (allItems.length !== 3) {
    throw new Error(`アサーション失敗: 期待件数 3, 実際 ${allItems.length}`);
  }
  console.log('テスト2 成功: 全件取得件数:', allItems.length);
}

/**
 * 実際にIPAサイトにアクセスして取得・パース結果をログ表示するテスト
 * （Slack投稿や状態更新は行いません）
 */
function testFetchIpaNewsLive() {
  console.log('--- ライブフェッチテスト開始 ---');
  // 引数省略時は Config.js の IPA 設定（URL・カテゴリ）が自動的に使用される
  const items = IpaScraper.fetchNews();
  console.log(`取得成功: 合計 ${items.length} 件`);

  // 最新3件をプレビュー表示
  const preview = items.slice(0, 3);
  for (let i = 0; i < preview.length; i++) {
    const it = preview[i];
    console.log(`[${i + 1}] 日付: ${it.date} | 取得元: ${it.from}`);
    console.log(`    タイトル: ${it.title}`);
    console.log(`    URL: ${it.url}`);
  }
}
