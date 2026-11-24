// Node.js環境でのIpaScraperパース検証スクリプト
const fs = require('fs');
const path = require('path');

// IpaScraper.js の内容をロード
const scraperCode = fs.readFileSync(path.join(__dirname, '../../src/gas/IpaScraper.js'), 'utf8');

// CONFIGのモック
const CONFIG = {
  IPA_NEWS_URL: 'https://www.ipa.go.jp/news/index.html',
  TARGET_CATEGORY: '試験情報'
};

// 評価用スコープ
const context = {
  CONFIG,
  UrlFetchApp: {},
  console
};

eval(`
${scraperCode}
global.IpaScraper = IpaScraper;
`);

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

const results = global.IpaScraper.parseHtml(mockHtml, '試験情報');
console.log('Filtered items count:', results.length);
if (results.length !== 2) {
  console.error('Test Failed! Expected 2 items');
  process.exit(1);
}
if (results[0].title !== 'ITパスポート試験（令和8年10月実施）の合格者受験番号一覧を掲載しました') {
  console.error('Test Failed! Title mismatch');
  process.exit(1);
}
if (results[1].url !== 'https://www.ipa.go.jp/shiken/mousikomi/cbt_sg_fe.html#cbt04') {
  console.error('Test Failed! Relative URL conversion failed');
  process.exit(1);
}
console.log('All local tests passed successfully!');
