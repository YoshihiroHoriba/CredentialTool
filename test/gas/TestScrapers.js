/**
 * @file TestScrapers.js
 * @description 各情報取得元サイトのスクレイパーテストコード（GAS実行用）
 */

/**
 * 全サイトの取得・フィルタテスト（Slack投稿は行わず、ログ出力のみ）
 */
function testScrapeAllSites() {
  console.log('=== 全サイト スクレイピング & フィルタ テスト開始 ===');

  for (const site of CONFIG.TARGET_SITES) {
    console.log(`\n--- テスト対象: ${site.name} ---`);
    console.log(`  from文言: ${site.from}`);
    console.log(`  URL: ${site.url}`);
    try {
      const items = Scrapers.scrapeSite(site);
      console.log(`取得成功（フィルタ適用後）: ${items.length} 件`);

      // 先頭2件をプレビュー
      items.slice(0, 2).forEach((it, idx) => {
        console.log(` [${idx + 1}] タイトル: ${it.title}`);
        console.log(`     日付: ${it.date}`);
        console.log(`     説明: ${it.description || '(なし)'}`);
        console.log(`     URL: ${it.url}`);
        console.log(`     --- Slack投稿スタイル ---`);
        const lines = [
          it.from,
          `> *${it.title}*`,
          `> ${it.date || '日付不明'}`
        ];
        if (it.description) {
          lines.push(`> ${it.description}`);
        }
        lines.push(`> 詳細は<${it.url}|こちら>`);
        console.log(lines.join('\n'));
      });
    } catch (err) {
      console.error(`テスト失敗: ${site.name}`, err);
    }
  }

  console.log('\n=== 全サイト スクレイピング & フィルタ テスト終了 ===');
}

/**
 * 集約エラー通知のテスト（モックエラーをSlackに送信）
 */
function testAggregatedErrorNotification() {
  console.log('集約エラー通知テストを実行します。');
  const mockErrors = [
    {
      siteName: 'テスト対象サイトA',
      url: 'https://example.com/api',
      errorType: 'HTTP_STATUS_ERROR',
      message: 'HTTPステータスコード異常: 500'
    },
    {
      siteName: 'テスト対象サイトB',
      url: 'https://example.com/news',
      errorType: 'SCRAPING_PARSE_ERROR',
      message: 'HTMLパースエラー: 要素 <article> が見つかりませんでした。'
    }
  ];

  SlackService.postAggregatedErrors(mockErrors);
  console.log('集約エラー通知を送信しました。Slackで表示を確認してください。');
}
