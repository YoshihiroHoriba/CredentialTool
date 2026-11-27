# 処理概要

## 処理内容

- GASで平日9:00に1回実行する
- 以下全ての情報取得元に対して処理を行う
  - 情報取得元から新着情報を取得し、ニュースの日付、タイトル、詳細情報URLを取得する
  - 解析方法はサイトごとに異なるため、同様に日付、タイトル、詳細情報URLを取得する
  - エラー応答（ステータスコードが200以外）は、まとめてエラー情報投稿先に投稿する
  - 投稿内容は、from、> *タイトル*、> 日付、> 説明、> 詳細は[こちら](URL) のスタイルで投稿する
  - 取得した情報がSlackへ未連携の情報であれば、Slackに投稿する
  - スクレイピングエラーもまとめて情報取得元も含めてエラー情報投稿先に投稿する

## 情報取得元

- IPA独立行政法人情報処理推進機構の[新着情報](https://www.ipa.go.jp/news/index.html?=exam)
  - fromを「IPA(情報処理推進機構)の最新情報より」とする
- [AWS Training and Certification ブログ（日本語）](https://aws.amazon.com/jp/blogs/news/category/aws-training-and-certification/)
  - fromを「AWS Training and Certification ブログ（日本語）より」とする
  - タイトルに「AWS 認定」または「AWS Certified」の表記があるもののみSlackに投稿する
  - 日付書式を「D M月 YYYY」から「YYYY年M月D日」に変更する
- [近日公開の AWS 認定（AWS Certification Coming Soon）](https://aws.amazon.com/jp/certification/coming-soon/)
  - fromを「近日公開の AWS 認定より」とする
- [Google Cloud 公式ブログ（トレーニングと認定）](https://cloud.google.com/blog/ja/topics/training-certifications)
  - fromを「Google Cloud 公式ブログ（トレーニングと認定）より」とする
- [The Skills Hub Blog（Microsoft Community Hub）](https://techcommunity.microsoft.com/category/skills-hub/blog/skills-hub-blog)
  - fromを「The Skills Hub Blog（Microsoft Community Hub）より」とする
  - タイトルに「Microsoft Certified」の表記があるもののみをSlackに投稿する
- [Oracle認定資格ニュース from Googleニュース](https://news.google.com/rss/search?q=%22ORACLE%20MASTER%22%20OR%20%22Oracle%20%E8%AA%8D%E5%AE%9A%E8%B3%87%E6%A0%BC%22%20OR%20%22Oracle%20Cloud%20Infrastructure%20%E8%AA%8D%E5%AE%9A%22&hl=ja&gl=JP&ceid=JP:ja)
  - fromを「Oracle認定資格のニュースより」とする
- [LinuC ニュース・トピックス一覧](https://linuc.org/news/)
  - fromを「LinuC ニュース・トピックス一覧より」とする
- [LPI 公式ブログ・記事一覧（日本語）](https://www.lpi.org/ja/articles/region/japan-ja/)
  - fromを「LPI 公式ブログ・記事一覧（日本語）より」とする


## 投稿先

- #all-資格情報変更通知 チャンネルに投稿する

## エラー情報投稿先

- CWC_堀場義弘 にDMを投稿する

## GCPの確認方法について

- @docs/sample_gcp.html の解析結果、1件目のタイトルは「AI にプロンプトを入力するだけではなく、AI を設計する - Professional Agentic Architect 認定資格のご紹介」、URLは「https://cloud.google.com/blog/ja/topics/training-certifications/google-cloud-agentic-architect-certification-dont-just-prompt-ai-design-it」
