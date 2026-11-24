/**
 * @file Main.js
 * @description メイン処理および定期実行トリガー設定
 */

/**
 * IPA新着情報の更新確認およびSlack通知のメイン関数
 * 平日定期実行トリガーから呼び出されます。
 */
function checkIpaNewsUpdates() {
  const targetUrl = CONFIG.IPA_NEWS_URL;
  console.log(`[開始] IPA新着情報の確認処理を開始します。取得元: ${targetUrl}`);

  try {
    // 1. IPA新着情報を取得
    const newsList = IpaScraper.fetchNews(targetUrl, CONFIG.TARGET_CATEGORY);
    console.log(`取得件数: ${newsList.length} 件`);

    // 2. 未連携（Slack未投稿）の情報を抽出
    const unpostedNews = newsList.filter(item => !StateService.isAlreadyPosted(item.url));
    console.log(`未連携件数: ${unpostedNews.length} 件`);

    if (unpostedNews.length === 0) {
      console.log('未連携の新着情報はありませんでした。');
      return;
    }

    // 3. 時系列順（古い順）に投稿するため、リストを反転
    const itemsToPost = unpostedNews.slice().reverse();
    const postedUrls = [];

    for (const item of itemsToPost) {
      console.log(`Slackへ投稿中: [${item.date}] ${item.title}`);
      SlackService.postNews(item);
      postedUrls.push(item.url);
      
      // 連続投稿時のAPIレートリミットを考慮してわずかに待機（0.5秒）
      Utilities.sleep(500);
    }

    // 4. 投稿済みURLを記録
    StateService.markMultipleAsPosted(postedUrls);
    console.log(`[完了] ${postedUrls.length} 件の新着情報をSlackへ投稿し、連携済みに更新しました。`);

  } catch (error) {
    console.error('新着情報更新確認処理中にエラーが発生しました:', error);
    // 5. エラー情報をSlack（CWC_堀場義弘宛てDM等のWebhook）へ通知
    SlackService.postError(targetUrl, error);
  }
}

/**
 * 平日朝9:00〜10:00に自動実行するトリガーを登録
 * （Google Apps Scriptの時間主導型トリガー）
 */
function setDailyTrigger() {
  // 既存の同名トリガーを削除して重複を防ぐ
  deleteTriggers();

  ScriptApp.newTrigger('checkIpaNewsUpdates')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  console.log('毎朝9時台に実行するトリガーを設定しました。');
}

/**
 * checkIpaNewsUpdates の既存トリガーをすべて削除
 */
function deleteTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'checkIpaNewsUpdates') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  console.log('既存のトリガーを削除しました。');
}

/**
 * 手動テスト用：スクリプトプロパティの確認
 */
function checkConfiguration() {
  const notifyUrl = CONFIG.getNotifyWebhookUrl();
  const errorUrl = CONFIG.getErrorWebhookUrl();

  console.log('--- 設定確認 ---');
  console.log('通知用Webhook URL (SLACK_WEBHOOK_URL_NOTIFY):', notifyUrl ? '設定済み' : '未設定 ⚠️');
  console.log('エラー通知用Webhook URL (SLACK_WEBHOOK_URL_ERROR):', errorUrl ? '設定済み' : '未設定 ⚠️');
  console.log('IPA新着情報URL:', CONFIG.IPA_NEWS_URL);
  console.log('対象カテゴリ:', CONFIG.TARGET_CATEGORY);
  console.log('過去に連携済みのURL数:', StateService.getPostedUrls().length);
}
