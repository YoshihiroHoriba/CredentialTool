/**
 * @file SlackService.js
 * @description Slackへのメッセージ投稿サービス
 */

const SlackService = {
  /**
   * 新着情報をSlack（#all-資格情報変更通知）に投稿
   * docs/01_overview.md の要件:
   * 「投稿内容は、日付、タイトル、詳細は[こちら](URL) のスタイルで投稿する」
   * 
   * @param {Object} newsItem 新着情報オブジェクト { date, title, url, siteName }
   */
  postNews(newsItem) {
    const webhookUrl = CONFIG.getNotifyWebhookUrl();
    if (!webhookUrl) {
      throw new Error('通知用のSlack Webhook URL（SLACK_WEBHOOK_URL_NOTIFY）が設定されていません。');
    }

    // 指定のフォーマット:
    // 日付
    // タイトル
    // 詳細は<URL|こちら>
    const formattedDate = newsItem.date || '日付不明';
    const textMessage = `${formattedDate}\n${newsItem.title}\n詳細は<${newsItem.url}|こちら>`;

    const payload = {
      text: textMessage,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: textMessage
          }
        }
      ]
    };

    this._sendRequest(webhookUrl, payload);
  },

  /**
   * 収集したエラー群をまとめてSlack（CWC_堀場義弘宛てDM等のWebhook）に投稿
   * docs/01_overview.md の要件:
   * 「エラー応答（ステータスコードが200以外）は、まとめてエラー情報投稿先に投稿する」
   * 「スクレイピングエラーもまとめて情報取得元も含めてエラー情報投稿先に投稿する」
   * 
   * @param {Array<Object>} errors エラー情報の配列 [{ siteName, url, errorType, message }]
   */
  postAggregatedErrors(errors) {
    if (!errors || errors.length === 0) return;

    const webhookUrl = CONFIG.getErrorWebhookUrl();
    if (!webhookUrl) {
      console.error('エラー通知用のSlack Webhook URL（SLACK_WEBHOOK_URL_ERROR）が未設定です。ログのみ出力します。', errors);
      return;
    }

    let summaryText = `⚠️ 【資格情報更新確認】以下の情報取得元でエラーが発生しました（計 ${errors.length} 件）:\n\n`;
    const fields = [];

    errors.forEach((err, index) => {
      const errDetail = `*${index + 1}. ${err.siteName}*\nURL: ${err.url}\nエラー種別: ${err.errorType}\n詳細: \`${err.message.slice(0, 300)}\`\n`;
      summaryText += errDetail + '\n';
    });

    const payload = {
      text: summaryText,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ 資格情報更新確認ツール エラー集約報告',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*発生日時:* ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n*エラー発生件数:* ${errors.length} 件`
          }
        },
        {
          type: 'divider'
        }
      ]
    };

    // 各エラーの詳細ブロックを追加（Slackブロック数制限50を考慮）
    errors.slice(0, 10).forEach((err, index) => {
      payload.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${index + 1}. ${err.siteName}*\n• *URL:* <${err.url}|${err.url}>\n• *種別:* ${err.errorType}\n• *エラー内容:*\n\`\`\`${err.message.slice(0, 500)}\`\`\``
        }
      });
    });

    try {
      this._sendRequest(webhookUrl, payload);
    } catch (e) {
      console.error('集約エラー通知の送信に失敗しました:', e);
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
