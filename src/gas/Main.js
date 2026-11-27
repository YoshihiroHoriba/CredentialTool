/**
 * @file Main.js
 * @description メイン処理および定期実行トリガー設定
 */

/**
 * 全情報取得元の新着情報更新確認およびSlack通知のメイン関数
 * 平日朝9:00の定期実行トリガーから呼び出されます。
 */
function executeDailyCredentialCheck() {
  console.log('[開始] 全資格情報サイトの更新確認処理を開始します。');

  const sites = CONFIG.TARGET_SITES;
  const collectedErrors = [];
  const unpostedItems = [];

  // 1. すべての情報取得元に対して処理を行う
  for (const site of sites) {
    console.log(`[取得処理中] ${site.name} (${site.url})`);

    try {
      const items = Scrapers.scrapeSite(site);
      console.log(`-> 取得成功: ${items.length} 件`);

      // 未連携情報の抽出
      for (const item of items) {
        if (!StateService.isAlreadyPosted(item)) {
          unpostedItems.push(item);
        }
      }
    } catch (err) {
      console.error(`-> エラー発生 [${site.name}]:`, err);
      // エラー情報（ステータス異常またはスクレイピングエラー）を集約リストに蓄積
      collectedErrors.push({
        siteName: site.name,
        url: site.url,
        errorType: err.errorType || 'SYSTEM_ERROR',
        message: err.message || String(err)
      });
    }

    // 連続アクセスによる相手先サーバーへの負荷軽減およびレート制限回避のため0.5秒待機する
    Utilities.sleep(500);
  }

  // 2. 未連携の新着情報をSlack（#all-資格情報変更通知）へ投稿
  console.log(`未連携の新着情報件数: ${unpostedItems.length} 件`);
  if (unpostedItems.length > 0) {
    const postedItems = [];
    // サイト上は新しい順で並んでいるため、Slackへ時系列（古い順）に流れるよう反転して投稿する
    const itemsToPost = unpostedItems.slice().reverse();

    for (const item of itemsToPost) {
      try {
        console.log(`Slackへ投稿中: [${item.siteName}] ${item.title}`);
        SlackService.postNews(item);
        postedItems.push(item);
        // Slack Incoming Webhook のレートリミット（原則1秒あたり1リクエスト）対策
        Utilities.sleep(500);
      } catch (postErr) {
        console.error(`投稿失敗: ${item.title}`, postErr);
        collectedErrors.push({
          siteName: item.siteName,
          url: item.url,
          errorType: 'SLACK_POST_ERROR',
          message: `新着情報のSlack投稿に失敗: ${postErr.message}`
        });
      }
    }

    // 投稿成功したアイテムを連携済みとして一括記録
    StateService.markMultipleAsPosted(postedItems);
    console.log(`[投稿完了] ${postedItems.length} 件の情報をSlackへ投稿し、連携済みに更新しました。`);
  }

  // 3. 発生したエラーがあれば、まとめてエラー情報投稿先へ通知
  if (collectedErrors.length > 0) {
    console.warn(`エラーが ${collectedErrors.length} 件発生したため、エラー情報投稿先へ集約通知を送信します。`);
    SlackService.postAggregatedErrors(collectedErrors);
  } else {
    console.log('すべてのサイトでエラーなく処理が完了しました。');
  }

  console.log('[終了] 全資格情報サイトの更新確認処理が完了しました。');
}

/**
 * 過去互換用エントリポイント
 */
function checkIpaNewsUpdates() {
  executeDailyCredentialCheck();
}

/**
 * 平日朝9:00〜10:00に自動実行するトリガーを登録
 * （土日は除外する平日実行フィルタ付きトリガー設定）
 */
function setDailyWeekdayTrigger() {
  deleteTriggers();

  // 毎日午前9時台に実行するトリガーを作成
  // （関数内で平日判定を行うことで平日のみ実行を担保）
  ScriptApp.newTrigger('triggerHandler')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  console.log('毎朝9時台に実行する定期トリガーを設定しました（平日のみ実行されます）。');
}

/**
 * トリガーから起動されるハンドラー関数
 * 平日（月曜日〜金曜日）のみメイン処理を実行します。
 */
function triggerHandler() {
  const dayOfWeek = new Date().getDay(); // 0: 日曜日, 6: 土曜日
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    console.log('本日は土日のため、処理をスキップします。');
    return;
  }

  executeDailyCredentialCheck();
}

/**
 * 登録済みトリガーをすべて削除
 */
function deleteTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    const fn = trigger.getHandlerFunction();
    if (fn === 'triggerHandler' || fn === 'checkIpaNewsUpdates' || fn === 'executeDailyCredentialCheck') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  console.log('既存の定期実行トリガーを削除しました。');
}

/**
 * 手動設定確認用関数
 */
function checkConfiguration() {
  const notifyUrl = CONFIG.getNotifyWebhookUrl();
  const errorUrl = CONFIG.getErrorWebhookUrl();

  console.log('--- 設定確認 ---');
  console.log('通知用Webhook (SLACK_WEBHOOK_URL_NOTIFY):', notifyUrl ? '設定済み' : '未設定 ⚠️');
  console.log('エラー通知用Webhook (SLACK_WEBHOOK_URL_ERROR):', errorUrl ? '設定済み' : '未設定 ⚠️');
  console.log('対象サイト数:', CONFIG.TARGET_SITES.length);
  CONFIG.TARGET_SITES.forEach((s, i) => {
    console.log(`  [${i + 1}] ${s.name}: ${s.url}`);
  });
  console.log('連携済みキー保持数:', StateService.getPostedKeys().length);
}
