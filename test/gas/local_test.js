// Node.js環境でのScrapersパース・フィルタ検証スクリプト
const fs = require('fs');
const path = require('path');

const configCode = fs.readFileSync(path.join(__dirname, '../../src/gas/Config.js'), 'utf8');
const scrapersCode = fs.readFileSync(path.join(__dirname, '../../src/gas/Scrapers.js'), 'utf8');

eval(`
${configCode}
${scrapersCode}
global.TARGET_SITES = TARGET_SITES;
global.CONFIG = CONFIG;
global.Scrapers = Scrapers;
`);

console.log('--- 0. Config TARGET_SITES Check ---');
if (TARGET_SITES.length !== 9) {
  throw new Error(`Expected 9 target sites in Config.js, got ${TARGET_SITES.length}`);
}

console.log('--- 1. IPA Parser Test ---');
const ipaHtml = `
<ul class="news-list">
  <li class="news-list__item" data-search="exam">
    <a href="/shiken/fe.html" class="news-list__inner">
      <ul class="news-list__data-box">
        <li class="news-list__label">試験情報</li>
        <li class="news-list__date">2026年11月20日</li>
      </ul>
      <p class="news-list__ttl">基本情報技術者試験の案内</p>
    </a>
  </li>
</ul>
`;
const ipaSite = {
  id: 'ipa',
  name: 'IPA 独立行政法人情報処理推進機構',
  from: 'IPA(情報処理推進機構)の最新情報より',
  category: '試験情報'
};
const ipaItems = Scrapers.parseIpa(ipaHtml, ipaSite).map(it => ({ ...it, from: ipaSite.from }));
console.log('IPA Items:', ipaItems.length);
if (ipaItems.length !== 1 || ipaItems[0].from !== 'IPA(情報処理推進機構)の最新情報より') {
  throw new Error('IPA parser failed');
}

console.log('--- 2. AWS Blog Parser, Date Format & Title Filter Test ---');
const awsHtml = `
<article class="blog-post">
  <a href="/jp/blogs/news/aws-cert-update/" property="url">Link</a>
  <span property="name headline">AWS 認定資格に関するアップデート</span>
  <time datetime="2026-09-10T08:48:07+09:00">10 9月 2026</time>
  <p>AWS が認定試験を更新します。</p>
</article>
<article class="blog-post">
  <a href="/jp/blogs/news/general-post/" property="url">Link</a>
  <span property="name headline">一般的なクラウドトレーニング記事</span>
  <time datetime="2026-09-08T08:48:07+09:00">8 9月 2026</time>
  <p>一般的な記事です。</p>
</article>
`;
const awsSite = {
  id: 'aws_blog',
  name: 'AWS Training and Certification ブログ（日本語）',
  from: 'AWS Training and Certification ブログ（日本語）より',
  titleFilter: (title) => title.includes('AWS 認定') || title.includes('AWS Certified')
};
let awsItems = Scrapers.parseAwsBlog(awsHtml, awsSite);
if (awsSite.titleFilter) {
  awsItems = awsItems.filter(it => awsSite.titleFilter(it.title));
}
awsItems = awsItems.map(it => ({ ...it, from: awsSite.from }));
console.log('AWS Blog Items after filter:', awsItems.length);
console.log('AWS Blog Date format:', awsItems[0].date);
if (awsItems.length !== 1 || awsItems[0].date !== '2026年9月10日' || !awsItems[0].description) {
  throw new Error(`AWS Blog parser, date formatting, or filter failed. Expected '2026年9月10日', got '${awsItems[0].date}'`);
}

console.log('--- 3. AWS Coming Soon Parser Test ---');
const awsSoonHtml = `
<h2>試験の更新: AWS Certified CloudOps Engineer - Associate</h2>
<p>2025 年 9 月 9 日: 試験の登録が開始されます。</p>
`;
const awsSoonSite = {
  id: 'aws_coming_soon',
  name: '近日公開の AWS 認定（AWS Certification Coming Soon）',
  from: '近日公開の AWS 認定より',
  url: 'https://aws.amazon.com/jp/certification/coming-soon/'
};
const awsSoonItems = Scrapers.parseAwsComingSoon(awsSoonHtml, awsSoonSite).map(it => ({ ...it, from: awsSoonSite.from }));
console.log('AWS Coming Soon Items:', awsSoonItems.length);
if (awsSoonItems.length !== 1 || awsSoonItems[0].from !== '近日公開の AWS 認定より' || !awsSoonItems[0].description) {
  throw new Error('AWS Coming Soon parser failed');
}

console.log('--- 4. Google Cloud Blog Parser Test with sample_gcp.html ---');
const sampleGcpPath = path.join(__dirname, '../../docs/sample_gcp.html');
const sampleGcpHtml = fs.readFileSync(sampleGcpPath, 'utf8');
const gcpSite = {
  id: 'gcp_blog',
  name: 'Google Cloud 公式ブログ（トレーニングと認定）',
  from: 'Google Cloud 公式ブログ（トレーニングと認定）より'
};
const gcpItems = Scrapers.parseGcpBlog(sampleGcpHtml, gcpSite);
console.log('GCP Items extracted from sample_gcp.html:', gcpItems.length);
if (gcpItems.length === 0) {
  throw new Error('GCP parser failed on sample_gcp.html');
}
const firstGcpItem = gcpItems[0];
console.log('First GCP Item Title:', firstGcpItem.title);
console.log('First GCP Item URL:', firstGcpItem.url);

const expectedTitle = 'AI にプロンプトを入力するだけではなく、AI を設計する - Professional Agentic Architect 認定資格のご紹介';
const expectedUrl = 'https://cloud.google.com/blog/ja/topics/training-certifications/google-cloud-agentic-architect-certification-dont-just-prompt-ai-design-it';

if (firstGcpItem.title !== expectedTitle) {
  throw new Error(`GCP 1st item title mismatch!\nExpected: "${expectedTitle}"\nGot:      "${firstGcpItem.title}"`);
}
if (firstGcpItem.url !== expectedUrl) {
  throw new Error(`GCP 1st item URL mismatch!\nExpected: "${expectedUrl}"\nGot:      "${firstGcpItem.url}"`);
}
console.log('GCP 1st item matches overview.md specification exactly!');

console.log('\n--- 5. Microsoft Skills Hub Parser & Filter Test ---');
const msHtml = `
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "apolloState": {
        "BlogTopicMessage:1": {
          "__typename": "BlogTopicMessage",
          "subject": "New Microsoft Certified Exam Available",
          "uid": 1,
          "postTime": "2026-11-17T12:00:03Z",
          "teaser@stripHtml": "Learn about the new Microsoft Certified path."
        },
        "BlogTopicMessage:2": {
          "__typename": "BlogTopicMessage",
          "subject": "Community updates for November",
          "uid": 2,
          "postTime": "2026-11-16T12:00:03Z"
        }
      }
    }
  }
}
</script>
<a href="/blog/skills-hub-blog/new-exam/1">Link</a>
`;
const msSite = {
  id: 'ms_skills_hub',
  name: 'The Skills Hub Blog（Microsoft Community Hub）',
  from: 'The Skills Hub Blog（Microsoft Community Hub）より',
  titleFilter: (title) => title.includes('Microsoft Certified')
};
let msItems = Scrapers.parseMsSkillsHub(msHtml, msSite);
if (msSite.titleFilter) {
  msItems = msItems.filter(it => msSite.titleFilter(it.title));
}
msItems = msItems.map(it => ({ ...it, from: msSite.from }));
console.log('MS Skills Hub Items after filter:', msItems.length);
if (msItems.length !== 1 || msItems[0].from !== 'The Skills Hub Blog（Microsoft Community Hub）より' || !msItems[0].description) {
  throw new Error('MS Skills Hub parser or filter failed');
}

console.log('\n--- 6. Oracle Google News RSS Parser Test ---');
const oracleXml = `
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>ORACLE MASTER Platinum DBA 2019 実技試験ハンズオン体験会を開催！ - Oracle Blogs</title>
      <link>https://news.google.com/rss/articles/sample1?oc=5</link>
      <pubDate>Wed, 14 Oct 2026 07:00:00 GMT</pubDate>
      <description>&lt;a href="https://news.google.com/rss/articles/sample1?oc=5"&gt;ORACLE MASTER&lt;/a&gt;</description>
      <source url="https://blogs.oracle.com">Oracle Blogs</source>
    </item>
  </channel>
</rss>
`;
const oracleSite = TARGET_SITES.find(s => s.id === 'oracle_news');
const oracleItems = Scrapers.parseOracleGoogleNewsRss(oracleXml, oracleSite).map(it => ({ ...it, from: oracleSite.from }));
console.log('Oracle RSS Items:', oracleItems.length, '| Date:', oracleItems[0]?.date);
if (oracleItems.length !== 1 ||
    oracleItems[0].from !== 'Oracle認定資格のニュースより' ||
    oracleItems[0].date !== '2026年10月14日' ||
    oracleItems[0].url !== 'https://news.google.com/rss/articles/sample1?oc=5') {
  throw new Error('Oracle Google News RSS parser failed');
}

console.log('\n--- 7. LinuC News Parser Test ---');
const linucHtml = `
<section class="container app-news-index">
  <!-- <ul>
    <li class="app-news-item">
      <span class="app-news-date">2018.02.23</span>
      <span class="app-news-body"><a href="#" target="_blank">ダミーお知らせ</a></span>
    </li>
  </ul> -->
  <ul>
    <li class="app-news-item">
      <span class="app-news-date">2026.11.24</span>
      <span class="app-news-body"><a href="https://linuc.org/study/samples/8727/" target="_blank">
        Linux技術者認定試験 LinuCレベル２ 201試験に関するサンプル問題を追加しました。
      </a></span>
    </li>
    <li class="app-news-item">
      <span class="app-news-date">2026.10.26</span>
      <span class="app-news-body"><a href="/campaign/202610.html" target="_blank">
        LinuC レベル3・4 再受験無料キャンペーン実施中！
      </a></span>
    </li>
  </ul>
</section>
`;
const linucSite = TARGET_SITES.find(s => s.id === 'linuc_news');
const linucItems = Scrapers.parseLinuCNews(linucHtml, linucSite).map(it => ({ ...it, from: linucSite.from }));
console.log('LinuC Items:', linucItems.length, '| First Date:', linucItems[0]?.date);
if (linucItems.length !== 2 ||
    linucItems[0].from !== 'LinuC ニュース・トピックス一覧より' ||
    linucItems[0].date !== '2026年11月24日' ||
    linucItems[1].url !== 'https://linuc.org/campaign/202610.html') {
  throw new Error('LinuC News parser failed');
}

console.log('\n--- 8. LPI Articles Parser Test ---');
const lpiHtml = `
<div class="blog-list">
  <div class="item d-md-flex">
    <div class="image"><a href="https://www.lpi.org/ja/articles/sample-1/" class="img-bg"></a></div>
    <div class="text">
      <h3><a href="https://www.lpi.org/ja/articles/sample-1/">LPIの「Security Essentials」がISVマップに掲載</a></h3>
      <div class="post-excerpt page-body">
        <p>Linux Professional Institute（LPI）が提供する認定 &#8230; <a href="https://www.lpi.org/ja/articles/sample-1/" class="button-link">Read more</a></p>
      </div>
    </div>
  </div>
</div>
`;
const lpiSite = TARGET_SITES.find(s => s.id === 'lpi_articles');
const lpiItems = Scrapers.parseLpiArticles(lpiHtml, lpiSite).map(it => ({ ...it, from: lpiSite.from }));
console.log('LPI Items:', lpiItems.length, '| Desc:', lpiItems[0]?.description);
if (lpiItems.length !== 1 ||
    lpiItems[0].from !== 'LPI 公式ブログ・記事一覧（日本語）より' ||
    lpiItems[0].title !== 'LPIの「Security Essentials」がISVマップに掲載' ||
    lpiItems[0].description.includes('Read more') ||
    !lpiItems[0].description.includes('…')) {
  throw new Error('LPI Articles parser failed');
}

console.log('\n--- 9. Learn with Cisco - Cisco Blogs RSS Parser Test ---');
const ciscoXml = `
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Your Year-End Guide to Cisco U. Learning Deals</title>
      <link>https://blogs.cisco.com/learning/learning-deals-2026/</link>
      <pubDate>Sat, 21 Nov 2026 00:16:36 +0000</pubDate>
      <description><![CDATA[Cisco U. Learning Deals offer significant year-end savings on various Cisco learning products.]]></description>
    </item>
  </channel>
</rss>
`;
const ciscoSite = TARGET_SITES.find(s => s.id === 'cisco_learning');
const ciscoItems = Scrapers.parseCiscoLearningRss(ciscoXml, ciscoSite).map(it => ({ ...it, from: ciscoSite.from }));
console.log('Cisco RSS Items:', ciscoItems.length, '| Date:', ciscoItems[0]?.date);
if (ciscoItems.length !== 1 ||
    ciscoItems[0].from !== 'Learn with Cisco - Cisco Blogsより' ||
    ciscoItems[0].date !== '2026年11月21日' ||
    !ciscoItems[0].description.includes('Cisco U. Learning Deals') ||
    ciscoItems[0].url !== 'https://blogs.cisco.com/learning/learning-deals-2026/') {
  throw new Error('Cisco Learning RSS parser failed');
}

console.log('\n--- 10. Slack Message Format Preview Test ---');
const sampleItem = awsItems[0];
const lines = [
  sampleItem.from,
  `> *${sampleItem.title}*`,
  `> ${sampleItem.date}`
];
if (sampleItem.description) {
  lines.push(`> ${sampleItem.description}`);
}
lines.push(`> 詳細は<${sampleItem.url}|こちら>`);

const previewText = lines.join('\n');
console.log(previewText);

if (!previewText.includes('> *AWS 認定資格に関するアップデート*') ||
    !previewText.includes('> 2026年9月10日') ||
    !previewText.includes('> AWS が認定試験を更新します。') ||
    !previewText.includes('> 詳細は<https://aws.amazon.com/jp/blogs/news/aws-cert-update/|こちら>')) {
  throw new Error('Slack message format verification failed');
}

console.log('\nAll Scraper, Date format, Filter, and Slack format tests passed successfully!');
