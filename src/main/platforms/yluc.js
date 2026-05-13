const PlatformAdapter = require('./base');

/**
 * 元初平台适配器
 * ⚠️ 以下 XPath / CSS 选择器需要根据实际页面结构填写
 * 可使用 Playwright 的 codegen 工具辅助获取：
 * npx playwright codegen <网址>
 */
class YlucAdapter extends PlatformAdapter {
  constructor(config = {}) {
    super(config);
    this.name = 'yluc';
    this.urls = {
      home: config.homeUrl || 'https://m.yluc.com',
      login: config.loginUrl || 'https://m.yluc.com/login',
      market: config.marketUrl || 'https://m.yluc.com/market',
      warehouse: config.warehouseUrl || 'https://m.yluc.com/warehouse',
      activity: config.activityUrl || 'https://m.yluc.com/activity',
      ...config.urls,
    };
  }

  async login(page, account) {
    await page.goto(this.urls.login);
    await this.randomDelay(0.5, 1.5);

    // TODO: 根据实际登录页填写选择器
    // 示例（需替换为真实选择器）：
    // await this.safeFill(page, 'input[placeholder="手机号"]', account.phone);
    // await this.safeFill(page, 'input[placeholder="密码"]', account.loginPassword);
    // await this.safeClick(page, 'button:has-text("登录")');

    // 等待登录成功（跳转到首页或出现用户头像）
    // await page.waitForURL(/home|market/, { timeout: 10000 });

    throw new Error('元初登录逻辑未实现，请根据实际页面填写 XPath');
  }

  async navigateTo(page, pageType) {
    const url = this.urls[pageType];
    if (!url) throw new Error(`未知页面类型: ${pageType}`);
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await this.randomDelay(0.5, 1.5);
  }

  async getMarketItems(page, keyword = '') {
    await this.navigateTo(page, 'market');

    // TODO: 如果有搜索框，先输入关键词
    // if (keyword) {
    //   await this.safeFill(page, 'input[type="search"]', keyword);
    //   await page.keyboard.press('Enter');
    //   await page.waitForTimeout(1500);
    // }

    // TODO: 解析市场列表
    // 示例框架：
    // const cards = await page.locator('.market-item-card').all();
    // const items = [];
    // for (const card of cards) {
    //   const name = await card.locator('.item-name').textContent().catch(() => '');
    //   const priceText = await card.locator('.item-price').textContent().catch(() => '0');
    //   const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
    //   const itemId = await card.getAttribute('data-id') || '';
    //   items.push({ name: name.trim(), price, itemId });
    // }
    // return items;

    // 模拟返回（开发测试用，实际使用时删除）
    return [
      { name: '元力胶囊', price: 5.5, itemId: 'demo-1' },
      { name: '神秘宝箱', price: 8.2, itemId: 'demo-2' },
    ];
  }

  async getItemDetail(page, itemId) {
    // TODO: 进入藏品详情页获取完整信息
    return { itemId, name: '', price: 0 };
  }

  async buyItem(page, itemId, maxPrice, quantity) {
    // TODO: 实现购买流程
    // 1. 点击藏品进入详情
    // 2. 点击购买/立即购买
    // 3. 确认价格 <= maxPrice
    // 4. 输入数量
    // 5. 输入支付密码
    // 6. 确认支付
    throw new Error('元初购买逻辑未实现，请根据实际页面填写 XPath');
  }

  async doSynthesis(page, activityName, materials, count) {
    await this.navigateTo(page, 'activity');
    // TODO: 找到对应合成活动，选择材料，执行合成
    throw new Error('元初合成逻辑未实现');
  }

  async doDecomposition(page, targetName, outputs, count) {
    await this.navigateTo(page, 'warehouse');
    // TODO: 找到藏品，进入分解页面，执行分解
    throw new Error('元初分解逻辑未实现');
  }

  async getInventory(page) {
    await this.navigateTo(page, 'warehouse');
    // TODO: 解析仓库列表
    return [];
  }
}

module.exports = YlucAdapter;
