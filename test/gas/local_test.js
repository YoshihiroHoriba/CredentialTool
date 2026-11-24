// Node.js環境でのScrapersパース検証スクリプト
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
const ipaItems = Scrapers.parseIpa(ipaHtml, { category: '試験情報', name: 'IPA' });
console.log('IPA Items:', ipaItems.length);
if (ipaItems.length !== 1 || ipaItems[0].url !== 'https://www.ipa.go.jp/shiken/fe.html') {
  throw new Error('IPA parser failed');
}

console.log('--- 2. AWS Blog Parser Test ---');
const awsHtml = `
<article class="blog-post">
  <a href="/jp/blogs/news/aws-cert-update/" property="url">Link</a>
  <span property="name headline">AWS 認定資格に関するアップデート</span>
  <time datetime="2026-09-10">10 9月 2026</time>
</article>
`;
const awsItems = Scrapers.parseAwsBlog(awsHtml, { name: 'AWS Blog' });
console.log('AWS Blog Items:', awsItems.length);
if (awsItems.length !== 1 || awsItems[0].title !== 'AWS 認定資格に関するアップデート' || awsItems[0].url !== 'https://aws.amazon.com/jp/blogs/news/aws-cert-update/') {
  throw new Error('AWS Blog parser failed');
}

console.log('--- 3. AWS Coming Soon Parser Test ---');
const awsSoonHtml = `
<h2>試験の更新: AWS Certified CloudOps Engineer - Associate</h2>
<p>2025 年 9 月 9 日: 試験の登録が開始されます。</p>
`;
const awsSoonItems = Scrapers.parseAwsComingSoon(awsSoonHtml, { name: 'AWS Coming Soon', url: 'https://aws.amazon.com/jp/certification/coming-soon/' });
console.log('AWS Coming Soon Items:', awsSoonItems.length);
if (awsSoonItems.length !== 1 || !awsSoonItems[0].title.includes('CloudOps') || awsSoonItems[0].date !== '2025 年 9 月 9 日') {
  throw new Error('AWS Coming Soon parser failed');
}

console.log('--- 4. Microsoft Skills Hub Parser Test ---');
const msHtml = `
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "apolloState": {
        "BlogTopicMessage:4494135": {
          "__typename": "BlogTopicMessage",
          "subject": "Heard it at Ignite? Let’s get into it.",
          "uid": 4494135,
          "postTime": "2026-11-17T12:00:03Z"
        }
      }
    }
  }
}
</script>
<a href="/blog/skills-hub-blog/heard-it-at-ignite/4494135">Link</a>
`;
const msItems = Scrapers.parseMsSkillsHub(msHtml, { name: 'MS Skills Hub' });
console.log('MS Skills Hub Items:', msItems.length);
if (msItems.length !== 1 || msItems[0].title !== 'Heard it at Ignite? Let’s get into it.') {
  throw new Error('MS Skills Hub parser failed');
}

console.log('All Scraper tests passed successfully!');
