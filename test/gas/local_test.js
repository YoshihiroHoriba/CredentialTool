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

console.log('--- 2. AWS Blog Parser & Title Filter Test ---');
const awsHtml = `
<article class="blog-post">
  <a href="/jp/blogs/news/aws-cert-update/" property="url">Link</a>
  <span property="name headline">AWS 認定資格に関するアップデート</span>
  <time datetime="2026-09-10">10 9月 2026</time>
  <p>AWS が認定試験を更新します。</p>
</article>
<article class="blog-post">
  <a href="/jp/blogs/news/general-post/" property="url">Link</a>
  <span property="name headline">一般的なクラウドトレーニング記事</span>
  <time datetime="2026-09-08">8 9月 2026</time>
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
if (awsItems.length !== 1 || awsItems[0].from !== 'AWS Training and Certification ブログ（日本語）より' || !awsItems[0].description) {
  throw new Error('AWS Blog parser or filter failed');
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

console.log('--- 4. Google Cloud Blog Filter Test ---');
const gcpSite = {
  id: 'gcp_blog',
  name: 'Google Cloud 公式ブログ（トレーニングと認定）',
  from: 'Google Cloud 公式ブログ（トレーニングと認定）より',
  titleFilter: (title) => title.includes('認定資格')
};
const mockGcpItems = [
  { title: '新しい Google Cloud Agentic Architect 認定資格のご紹介', url: 'https://example.com/1' },
  { title: 'ホリデーシーズンの無償AIトレーニング', url: 'https://example.com/2' }
].filter(it => gcpSite.titleFilter(it.title)).map(it => ({ ...it, from: gcpSite.from }));
console.log('GCP filtered items:', mockGcpItems.length);
if (mockGcpItems.length !== 1 || mockGcpItems[0].title !== '新しい Google Cloud Agentic Architect 認定資格のご紹介') {
  throw new Error('GCP filter failed');
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

console.log('\n--- 6. Slack Message Format Preview Test ---');
const sampleItem = awsItems[0];
const sampleFrom = sampleItem.from;
const sampleTitle = sampleItem.title;
const sampleDate = sampleItem.date;
const sampleDesc = sampleItem.description;
const sampleUrl = sampleItem.url;

let previewText = `${sampleFrom}\n*${sampleTitle}*\n> ${sampleDate}`;
if (sampleDesc) {
  previewText += `\n${sampleDesc}`;
}
previewText += `\n詳細は<${sampleUrl}|こちら>`;

console.log(previewText);
console.log('\nAll Scraper and Filter tests passed successfully!');
