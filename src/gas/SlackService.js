/**
 * @file SlackService.js
 * @description Slackへのメッセージ投稿サービス
 */

const SlackService = {
  /**
   * 新着情報（試験情報など）をSlack（#all-資格情報変更通知）に投稿
   * @param {Object} newsItem 新着情報オブジェクト { date, title, url, category }
   */
  postNews(newsItem) {
    const webhookUrl = CONFIG.getNotifyWebhookUrl();
    if (!webhookUrl) {
      throw new Error('通知用のSlack Webhook URL（SLACK_WEBHOOK_URL_NOTIFY）が設定されていません。');
    }

    const message = {
      text: `【IPA新着情報】${newsItem.title}\n${newsItem.url}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📢 資格情報 新着通知 (IPA)',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*日付:*\n${newsItem.date || '日付不明'}`
            },
            {
              type: 'mrkdwn',
              text: `*カテゴリ:*\n${newsItem.category || '試験情報'}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*タイトル:*\n<${newsItem.url}|${newsItem.title}>`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `取得元: <${newsItem.url}|${newsItem.url}>`
            }
          ]
        }
      ]
    };

    this._sendRequest(webhookUrl, message);
  },

  /**
   * エラー情報をSlack（CWC_堀場義弘宛てDM等のWebhook）に投稿
   * @param {string} targetUrl スクレイピングまたは処理対象のアドレス
   * @param {Error|string} error 発生したエラー
   */
  postError(targetUrl, error) {
    const webhookUrl = CONFIG.getErrorWebhookUrl();
    if (!webhookUrl) {
      console.error('エラー通知用のSlack Webhook URL（SLACK_WEBHOOK_URL_ERROR）が設定されていません。ログのみ出力します。', error);
      return;
    }

    const errorMessage = error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error);
    const message = {
      text: `⚠️ [エラー報告] 資格情報更新確認処理でエラーが発生しました。\n対象: ${targetUrl}\n内容: ${errorMessage}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ 資格情報更新確認ツール エラー発生',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*発生日時:*\n${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
            },
            {
              type: 'mrkdwn',
              text: `*対象アドレス:*\n${targetUrl || 'N/A'}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*エラー詳細:*\n\`\`\`${errorMessage.slice(0, 1500)}\`\`\``
          }
        }
      ]
    };

    try {
      this._sendRequest(webhookUrl, message);
    } catch (e) {
      console.error('エラー通知の送信自体に失敗しました:', e);
    }
  },

  /**
   * Webhook URLへHTTP POSTリクエストを送信
   * @private
   * @param {string} url Webhook URL
   * @param {Object} payload 送信データ
   */
  _sendRequest(url, payload) {
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    if (responseCode !== 200) {
      throw new Error(`Slackへの投稿に失敗しました。HTTPステータス: ${responseCode}, レスポンス: ${response.getContentText()}`);
    }
  }
};
