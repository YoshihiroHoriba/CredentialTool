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

console.log('--- 6. Oracle Master / OCI RSS Feed Parser Test ---');
const mockRssXml = `
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Oracle Master 公式ブログ</title>
    <link>https://blogs.oracle.com/oraclemaster/</link>
    <item>
      <title><![CDATA[新試験 ORACLE MASTER Silver DBA 2026 リリース]]></title>
      <link>https://blogs.oracle.com/oraclemaster/post/silver-dba-2026</link>
      <pubDate>Wed, 20 Nov 2026 09:00:00 GMT</pubDate>
      <description><![CDATA[ORACLE MASTER Silver DBA 2026 認定試験が新たに提供開始されました。]]></description>
    </item>
    <item>
      <title>Oracle Cloud Infrastructure 2026 認定資格のポイント</title>
      <link>https://blogs.oracle.com/cloud-infrastructure/post/oci-2026-cert</link>
      <pubDate>Mon, 18 Nov 2026 00:00:00 GMT</pubDate>
      <description>OCI 2026認定試験の最新アップデートをお届けします。</description>
    </item>
  </channel>
</rss>
`;

const oracleMasterSite = {
  id: 'oracle_master_blog',
  name: 'Oracle Master公式ブログ',
  from: 'Oracle Master公式ブログより',
  url: 'https://blogs.oracle.com/oraclemaster/rss',
  isRss: true
};
const oracleOciSite = {
  id: 'oracle_oci_blog',
  name: 'Oracle cloud-infrastructure 公式ブログ',
  from: 'Oracle loud-infrastructure公式ブログより',
  url: 'https://blogs.oracle.com/cloud-infrastructure/rss',
  isRss: true
};

const masterItems = Scrapers.parseRssFeed(mockRssXml, oracleMasterSite).map(it => ({ ...it, from: oracleMasterSite.from }));
const ociItems = Scrapers.parseRssFeed(mockRssXml, oracleOciSite).map(it => ({ ...it, from: oracleOciSite.from }));

console.log('Oracle Master from:', masterItems[0].from);
console.log('Oracle OCI from:', ociItems[0].from);

if (masterItems[0].from !== 'Oracle Master公式ブログより') {
  throw new Error('Oracle Master from mismatch');
}
if (ociItems[0].from !== 'Oracle loud-infrastructure公式ブログより') {
  throw new Error('Oracle OCI from mismatch');
}

console.log('\n--- 7. Slack Message Format Preview Test ---');
const sampleItem = ociItems[0];
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

console.log('\nAll 7 Sources Scraper, Date format, Filter, and Slack format tests passed successfully!');
