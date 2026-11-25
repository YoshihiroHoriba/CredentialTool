// Node.js環境でのScrapersパース・フィルタ検証スクリプト
const fs = require('fs');
const path = require('path');

const scrapersCode = fs.readFileSync(path.join(__dirname, '../../src/gas/Scrapers.js'), 'utf8');

eval(`
${scrapersCode}
global.Scrapers = Scrapers;
`);

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

console.log('--- 5. Microsoft Skills Hub Parser & Filter Test ---');
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

console.log('--- 6. Oracle University Japan News Parser Test ---');
const oracleHtml = `
<h3 id="y20261124">新資格 Oracle Certified Java Programmer, Silver SE 25 リリース (2026/11/24) </h3>
<p>2026年11月24日より、以下の認定試験の提供を開始します。</p>
<hr>
<h3 id="y20261102">2026年版 Oracle Cloud Applications 認定試験の提供開始のお知らせ (2026/11/2) </h3>
<p>認定試験の日本語版の提供を開始します。</p>
`;
const oracleSite = {
  id: 'oracle_news',
  name: 'Oracle University Japan 新着ニュース',
  from: 'Oracle University Japan 新着ニュースより',
  url: 'https://www.oracle.com/jp/education/news/'
};
const oracleItems = Scrapers.parseOracleNews(oracleHtml, oracleSite).map(it => ({ ...it, from: oracleSite.from }));
console.log('Oracle Items:', oracleItems.length);
if (oracleItems.length !== 2) {
  throw new Error('Oracle parser failed: expected 2 items');
}
console.log('Oracle Item 1:', oracleItems[0]);
if (oracleItems[0].title !== '新資格 Oracle Certified Java Programmer, Silver SE 25 リリース') {
  throw new Error(`Oracle title mismatch: got "${oracleItems[0].title}"`);
}
if (oracleItems[0].date !== '2026年11月24日') {
  throw new Error(`Oracle date mismatch: got "${oracleItems[0].date}"`);
}
if (oracleItems[0].url !== 'https://www.oracle.com/jp/education/news/#y20261124') {
  throw new Error(`Oracle URL mismatch: got "${oracleItems[0].url}"`);
}
if (!oracleItems[0].description) {
  throw new Error('Oracle description missing');
}

console.log('\n--- 7. Slack Message Format Preview Test ---');
const sampleItem = oracleItems[0];
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

console.log('\nAll 6 Sites Scraper, Date format, Filter, and Slack format tests passed successfully!');
