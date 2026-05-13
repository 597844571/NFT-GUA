const PlatformAdapter = require('./base');

/**
 * 通用平台适配器 - 配置驱动
 * 用户通过前端界面配置平台 URL 和 XPath/CSS 选择器
 * 无需编写代码即可适配新平台
 */
class GenericAdapter extends PlatformAdapter {
  constructor(config = {}) {
    super(config);
    this.name = config.name || 'generic';
    this.urls = {
      home: config.homeUrl || '',
      login: config.loginUrl || '',
      market: config.marketUrl || '',
      warehouse: config.warehouseUrl || '',
      activity: config.activityUrl || '',
      sale: config.saleUrl || '',
      ...config.urls,
    };
    this.selectors = config.selectors || {};
  }

  async login(page, account) {
    if (!this.urls.login) throw new Error('未配置登录页 URL');
    await page.goto(this.urls.login);
    await this.randomDelay(0.5, 1.5);

    const s = this.selectors;
    if (s.loginPhone) await this.safeFill(page, s.loginPhone, account.phone);
    if (s.loginPassword) await this.safeFill(page, s.loginPassword, account.loginPassword);
    if (s.loginButton) await this.safeClick(page, s.loginButton);

    // 等待登录成功（出现用户头像/退出按钮/跳转到首页）
    const waitSelectors = [s.userAvatar, s.logoutButton, s.userName].filter(Boolean);
    if (waitSelectors.length > 0) {
      await page.waitForSelector(waitSelectors.join(','), { timeout: 10000 }).catch(() => {});
    } else {
      await page.waitForTimeout(3000);
    }
  }

  async navigateTo(page, pageType) {
    const url = this.urls[pageType];
    if (!url) throw new Error(`未配置 ${pageType} 页面 URL`);
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await this.randomDelay(0.5, 1.5);
  }

  async getMarketItems(page, keyword = '') {
    await this.navigateTo(page, 'market');
    const s = this.selectors;

    // 搜索关键词
    if (keyword && s.marketSearchInput) {
      await this.safeFill(page, s.marketSearchInput, keyword);
      if (s.marketSearchButton) await this.safeClick(page, s.marketSearchButton);
      else await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);
    }

    const items = [];
    if (!s.marketItemCard) {
      console.warn('未配置市场列表项选择器，返回空数组');
      return items;
    }

    const cards = await page.locator(s.marketItemCard).all();
    for (const card of cards) {
      const name = s.marketItemName
        ? await card.locator(s.marketItemName).first().textContent().catch(() => '')
        : '';
      const priceText = s.marketItemPrice
        ? await card.locator(s.marketItemPrice).first().textContent().catch(() => '0')
        : '0';
      const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
      const itemId = s.marketItemId
        ? await card.locator(s.marketItemId).first().getAttribute('data-id').catch(() => '')
        : '';
      items.push({ name: name.trim(), price, itemId });
    }
    return items;
  }

  async getItemDetail(page, itemId) {
    // 如果有详情页 URL 模板，可以跳转获取
    return { itemId, name: '', price: 0 };
  }

  async buyItem(page, itemId, maxPrice, quantity) {
    const s = this.selectors;
    if (!s.buyButton) throw new Error('未配置购买按钮选择器');

    // 1. 点击购买
    await this.safeClick(page, s.buyButton);
    await this.randomDelay(0.5, 1.0);

    // 2. 确认价格不超过 maxPrice
    if (s.confirmPrice) {
      const priceText = await page.locator(s.confirmPrice).first().textContent().catch(() => '0');
      const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
      if (price > maxPrice) throw new Error(`价格 ¥${price} 超过阈值 ¥${maxPrice}`);
    }

    // 3. 输入数量
    if (quantity > 1 && s.quantityInput) {
      await this.safeFill(page, s.quantityInput, String(quantity));
    }

    // 4. 确认购买
    if (s.confirmButton) {
      await this.safeClick(page, s.confirmButton);
      await this.randomDelay(0.5, 1.0);
    }

    // 5. 输入支付密码
    if (s.payPasswordInput) {
      // 这里需要 account.payPassword，但基类没有直接传入
      // 由 engine 层在调用前处理
    }

    // 6. 最终确认
    if (s.finalPayButton) {
      await this.safeClick(page, s.finalPayButton);
    }

    await this.randomDelay(1.0, 2.0);
    return { success: true, message: '购买流程已执行' };
  }

  async doSynthesis(page, activityName, materials, count) {
    await this.navigateTo(page, 'activity');
    const s = this.selectors;

    // 查找活动
    if (s.activityItem && activityName) {
      const activities = await page.locator(s.activityItem).all();
      for (const act of activities) {
        const name = await act.textContent().catch(() => '');
        if (name.includes(activityName)) {
          await act.click();
          break;
        }
      }
    }

    // 选择材料
    for (const mat of materials) {
      if (s.materialItem) {
        // 根据材料名称找到对应项并设置数量
        const mats = await page.locator(s.materialItem).all();
        for (const m of mats) {
          const name = await m.locator(s.materialName || '.').first().textContent().catch(() => '');
          if (name.includes(mat.name)) {
            if (s.materialQuantityInput) {
              await m.locator(s.materialQuantityInput).fill(String(mat.quantity));
            }
            break;
          }
        }
      }
    }

    // 设置合成数量
    if (s.synthesisCountInput) {
      await this.safeFill(page, s.synthesisCountInput, String(count));
    }

    // 点击合成
    if (s.synthesisButton) {
      await this.safeClick(page, s.synthesisButton);
    }

    return { success: true };
  }

  async doDecomposition(page, targetName, outputs, count) {
    await this.navigateTo(page, 'warehouse');
    const s = this.selectors;

    // 查找目标藏品
    if (s.warehouseItem) {
      const items = await page.locator(s.warehouseItem).all();
      for (const item of items) {
        const name = await item.locator(s.warehouseItemName || '.').first().textContent().catch(() => '');
        if (name.includes(targetName)) {
          // 点击分解入口
          if (s.decomposeEntry) await item.locator(s.decomposeEntry).click();
          else await item.click();
          break;
        }
      }
    }

    // 设置分解数量
    if (s.decomposeCountInput) {
      await this.safeFill(page, s.decomposeCountInput, String(count));
    }

    // 确认分解
    if (s.decomposeConfirmButton) {
      await this.safeClick(page, s.decomposeConfirmButton);
    }

    return { success: true };
  }

  async getInventory(page) {
    await this.navigateTo(page, 'warehouse');
    const s = this.selectors;
    const items = [];

    if (s.warehouseItem) {
      const cards = await page.locator(s.warehouseItem).all();
      for (const card of cards) {
        const name = s.warehouseItemName
          ? await card.locator(s.warehouseItemName).first().textContent().catch(() => '')
          : '';
        const count = s.warehouseItemCount
          ? await card.locator(s.warehouseItemCount).first().textContent().catch(() => '0')
          : '0';
        items.push({ name: name.trim(), count: parseInt(count) || 0 });
      }
    }
    return items;
  }

  async getAnnouncements(page) {
    const s = this.selectors;
    const items = [];

    // 优先使用配置的 noticeUrl，否则尝试 activityUrl
    const noticeUrl = this.urls.notice || this.urls.activity || '';
    if (!noticeUrl) {
      console.warn('未配置公告页 URL，返回空数组');
      return items;
    }

    await page.goto(noticeUrl);
    await page.waitForLoadState('networkidle');
    await this.randomDelay(0.5, 1.5);

    if (!s.noticeItem) {
      console.warn('未配置公告列表项选择器，返回空数组');
      return items;
    }

    const cards = await page.locator(s.noticeItem).all();
    for (const card of cards) {
      const title = s.noticeTitle
        ? await card.locator(s.noticeTitle).first().textContent().catch(() => '')
        : '';
      const time = s.noticeTime
        ? await card.locator(s.noticeTime).first().textContent().catch(() => '')
        : '';
      const summary = s.noticeSummary
        ? await card.locator(s.noticeSummary).first().textContent().catch(() => '')
        : '';

      // 尝试获取链接：href 属性 或 data-url 属性
      let url = '';
      if (s.noticeLink) {
        url = await card.locator(s.noticeLink).first().getAttribute('href').catch(() => '');
        if (!url) {
          url = await card.locator(s.noticeLink).first().getAttribute('data-url').catch(() => '');
        }
      }
      // 如果 card 本身是链接元素，尝试从 card 取
      if (!url) {
        url = await card.getAttribute('href').catch(() => '');
      }
      if (!url) {
        url = await card.getAttribute('data-url').catch(() => '');
      }

      // 相对路径转绝对路径
      if (url && url.startsWith('/')) {
        const base = new URL(noticeUrl);
        url = `${base.origin}${url}`;
      }
      // uni-app 路由如果是 #/pages/... 这种，可能需要拼接完整 URL
      if (url && url.startsWith('#')) {
        const base = new URL(noticeUrl);
        url = `${base.origin}/${url}`;
      }

      items.push({
        title: title.trim(),
        time: time.trim(),
        summary: summary.trim(),
        url: url.trim(),
      });
    }
    return items;
  }
}

module.exports = GenericAdapter;
