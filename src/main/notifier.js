class Notifier {
  constructor(config = {}) {
    this.config = {
      wechatServerChan: false,
      serverChanKey: '',
      wechatWorkWebhook: false,
      workWebhookUrl: '',
      ...config,
    };
  }

  async send(title, message, options = {}) {
    const results = [];

    if (this.config.wechatServerChan && this.config.serverChanKey) {
      results.push(this._serverChan(title, message).catch((err) => ({ ok: false, channel: 'Server酱', error: err.message })));
    }

    if (this.config.wechatWorkWebhook && this.config.workWebhookUrl) {
      results.push(this._workWebhook(title, message, options).catch((err) => ({ ok: false, channel: '企业微信', error: err.message })));
    }

    if (results.length === 0) return [];
    return Promise.all(results);
  }

  // Server酱（https://sct.ftqq.com/）
  async _serverChan(title, message) {
    const key = this.config.serverChanKey;
    const url = `https://sapi.ftqq.com/${key}.send?title=${encodeURIComponent(title)}&desp=${encodeURIComponent(message)}`;
    const res = await fetch(url, { method: 'GET' });
    const data = await res.json();
    if (data.code !== 0 && data.errno !== 0 && data.data?.errno !== 0) {
      throw new Error(data.errmsg || data.message || 'Server酱 推送失败');
    }
    return { ok: true, channel: 'Server酱' };
  }

  // 企业微信机器人
  async _workWebhook(title, message, options = {}) {
    const url = this.config.workWebhookUrl;
    const body = {
      msgtype: 'markdown',
      markdown: {
        content: `**${title}**\n> ${message}\n> 时间：${new Date().toLocaleString()}\n${options.link ? `> [点击查看详情](${options.link})` : ''}`,
      },
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.errcode !== 0) {
      throw new Error(data.errmsg || '企业微信推送失败');
    }
    return { ok: true, channel: '企业微信' };
  }
}

module.exports = Notifier;
