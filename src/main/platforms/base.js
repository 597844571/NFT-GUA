// 平台适配器基类 - 所有平台必须实现
class PlatformAdapter {
  constructor(config = {}) {
    this.name = 'base';
    this.config = config;
    // 可配置的基础 URL
    this.urls = config.urls || {};
  }

  // 登录
  async login(page, account) {
    throw new Error('login() 必须在子类实现');
  }

  // 导航到指定页面
  async navigateTo(page, pageType) {
    // pageType: market / warehouse / activity / sale / profile
    throw new Error('navigateTo() 必须在子类实现');
  }

  // 获取市场列表
  async getMarketItems(page, keyword = '') {
    throw new Error('getMarketItems() 必须在子类实现');
  }

  // 获取单个藏品详情
  async getItemDetail(page, itemId) {
    throw new Error('getItemDetail() 必须在子类实现');
  }

  // 购买藏品
  async buyItem(page, itemId, maxPrice, quantity) {
    throw new Error('buyItem() 必须在子类实现');
  }

  // 执行合成
  async doSynthesis(page, activityName, materials, count) {
    throw new Error('doSynthesis() 必须在子类实现');
  }

  // 执行分解
  async doDecomposition(page, targetName, outputs, count) {
    throw new Error('doDecomposition() 必须在子类实现');
  }

  // 获取仓库藏品
  async getInventory(page) {
    throw new Error('getInventory() 必须在子类实现');
  }

  // 获取公告/活动列表
  async getAnnouncements(page) {
    throw new Error('getAnnouncements() 必须在子类实现');
  }

  // 辅助方法：随机延时
  async randomDelay(min, max) {
    const ms = Math.floor((min + Math.random() * (max - min)) * 1000);
    await new Promise(r => setTimeout(r, ms));
  }

  // 辅助方法：安全点击（自动等待+重试）
  async safeClick(page, selector, options = {}) {
    const { timeout = 5000, retries = 3 } = options;
    for (let i = 0; i < retries; i++) {
      try {
        const el = page.locator(selector).first();
        await el.waitFor({ state: 'visible', timeout });
        await el.click({ timeout });
        return true;
      } catch (e) {
        if (i === retries - 1) throw e;
        await page.waitForTimeout(500);
      }
    }
    return false;
  }

  // 辅助方法：安全填充
  async safeFill(page, selector, value, options = {}) {
    const { timeout = 5000 } = options;
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout });
    await el.fill(value);
  }
}

module.exports = PlatformAdapter;
