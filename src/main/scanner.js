const { chromium } = require('playwright');

/**
 * 智能页面扫描器
 * 打开目标页面，分析 DOM 结构，自动识别可监控字段
 */
class Scanner {
  constructor() {
    this.browser = null;
  }

  async scan(url, options = {}) {
    const { pageType = 'auto', timeout = 15000 } = options;

    this.browser = await chromium.launch({ headless: true });
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    });
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout });
      await page.waitForTimeout(2500);

      // 深度扫描：获取页面所有可见元素的详细信息
      const rawElements = await page.evaluate(() => {
        const results = [];
        const tags = ['uni-view', 'uni-input', 'uni-button', 'uni-text', 'uni-image', 'uni-scroll-view', 'div', 'span', 'p', 'input', 'button', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'li'];
        const seen = new Set();
        
        for (const tag of tags) {
          const nodes = document.querySelectorAll(tag);
          for (const node of nodes) {
            const text = (node.innerText || '').trim();
            if (text.length === 0 || text.length > 120) continue;
            
            // 去重：相同文本+相同class视为同一个
            const cls = node.className || '';
            const key = `${tag}|${cls}|${text}`;
            if (seen.has(key)) continue;
            seen.add(key);
            
            const id = node.id || '';
            const type = node.getAttribute('type') || '';
            const placeholder = node.getAttribute('placeholder') || '';
            const href = node.getAttribute('href') || '';
            const dataAttrs = {};
            for (const attr of node.attributes) {
              if (attr.name.startsWith('data-')) dataAttrs[attr.name] = attr.value;
            }
            
            results.push({
              tag: tag.replace('uni-', ''),
              class: cls,
              id,
              text: text.slice(0, 100),
              type,
              placeholder,
              href,
              dataAttrs,
              hasChildren: node.children.length > 0,
              childCount: node.children.length,
            });
          }
        }
        return results;
      });

      // 去重并按类型分组
      const elements = rawElements.slice(0, 150);
      
      // 智能字段识别
      const discovered = this._discoverFields(elements);

      // 获取页面标题
      const title = await page.title().catch(() => '');

      return {
        success: true,
        url,
        title,
        elements: elements.slice(0, 80),
        discovered,
      };
    } catch (err) {
      return { success: false, error: err.message, url };
    } finally {
      await this.browser.close();
      this.browser = null;
    }
  }

  _discoverFields(elements) {
    const fields = [];

    // 1. 价格识别：包含 ¥ 或 数字+元 的文本
    const pricePattern = /¥\s*[\d,]+(\.\d+)?|(\d+(\.\d+)?)\s*元/;
    const priceElements = elements.filter(e => pricePattern.test(e.text) && !e.text.includes('钱包'));
    if (priceElements.length > 0) {
      const best = priceElements[0];
      fields.push({
        category: 'market',
        field: 'marketItemPrice',
        label: '藏品价格',
        selector: this._buildSelector(best),
        sample: best.text,
        confidence: 'high',
      });
    }

    // 2. 数量识别：数字 + 份/个/件/张
    const quantityPattern = /(\d+)\s*(份|个|件|张)/;
    const qtyElements = elements.filter(e => quantityPattern.test(e.text));
    if (qtyElements.length > 0) {
      const best = qtyElements.find(e => e.text.includes('流通') || e.text.includes('发行')) || qtyElements[0];
      fields.push({
        category: 'market',
        field: 'marketTotalCount',
        label: '流通/发行数量',
        selector: this._buildSelector(best),
        sample: best.text,
        confidence: 'medium',
      });
    }

    // 3. Tab 按钮识别：寄售、求购、委托、购买
    const tabKeywords = ['寄售', '求购', '委托', '购买', '出售', 'sale', 'buy', '委托购买'];
    const tabElements = elements.filter(e => 
      tabKeywords.some(k => e.text.includes(k)) && e.tag === 'view' || e.tag === 'button' || e.tag === 'div'
    );
    if (tabElements.length > 0) {
      for (const el of tabElements.slice(0, 3)) {
        fields.push({
          category: 'market',
          field: 'marketTypeTab',
          label: `市场类型切换：${el.text}`,
          selector: this._buildSelector(el),
          sample: el.text,
          confidence: 'high',
        });
      }
    }

    // 4. 列表项识别：重复的同类元素，且包含价格或名称
    const listCandidates = elements.filter(e => 
      e.hasChildren && e.childCount >= 2 && e.childCount <= 8 &&
      (e.class.includes('item') || e.class.includes('card') || e.class.includes('list') || e.tag === 'li')
    );
    if (listCandidates.length > 0) {
      const best = listCandidates[0];
      fields.push({
        category: 'market',
        field: 'marketItemCard',
        label: '藏品列表项（卡片）',
        selector: this._buildSelector(best),
        sample: best.text.slice(0, 30),
        confidence: 'medium',
      });
    }

    // 5. 名称/标题识别：通常是最突出的文字
    const nameElements = elements.filter(e => 
      (e.class.includes('title') || e.class.includes('name')) && 
      e.text.length >= 2 && e.text.length <= 30 &&
      !pricePattern.test(e.text)
    );
    if (nameElements.length > 0) {
      const best = nameElements[0];
      fields.push({
        category: 'market',
        field: 'marketItemName',
        label: '藏品名称',
        selector: this._buildSelector(best),
        sample: best.text,
        confidence: 'medium',
      });
    }

    // 6. 登录相关
    const phoneInputs = elements.filter(e => 
      (e.tag === 'input' || e.tag === 'view') && 
      (e.placeholder.includes('手机') || e.placeholder.includes('phone') || e.class.includes('phone'))
    );
    if (phoneInputs.length > 0) {
      fields.push({
        category: 'login',
        field: 'loginPhone',
        label: '手机号输入框',
        selector: this._buildSelector(phoneInputs[0]),
        sample: phoneInputs[0].placeholder || phoneInputs[0].text,
        confidence: 'high',
      });
    }

    const passwordInputs = elements.filter(e => 
      (e.tag === 'input' && e.type === 'password') || 
      e.placeholder.includes('密码') || e.placeholder.includes('password')
    );
    if (passwordInputs.length > 0) {
      fields.push({
        category: 'login',
        field: 'loginPassword',
        label: '密码输入框',
        selector: this._buildSelector(passwordInputs[0]),
        sample: passwordInputs[0].placeholder || '',
        confidence: 'high',
      });
    }

    const loginBtns = elements.filter(e => 
      e.text.includes('登录') && (e.tag === 'button' || e.tag === 'view' || e.tag === 'div')
    );
    if (loginBtns.length > 0) {
      fields.push({
        category: 'login',
        field: 'loginButton',
        label: '登录按钮',
        selector: this._buildSelector(loginBtns[0]),
        sample: loginBtns[0].text,
        confidence: 'high',
      });
    }

    // 7. 公告相关
    const noticeTitles = elements.filter(e => 
      (e.class.includes('title') || e.class.includes('notice')) &&
      e.text.length > 5 && e.text.length < 60
    );
    if (noticeTitles.length > 0) {
      fields.push({
        category: 'notice',
        field: 'noticeTitle',
        label: '公告标题',
        selector: this._buildSelector(noticeTitles[0]),
        sample: noticeTitles[0].text.slice(0, 40),
        confidence: 'medium',
      });
    }

    const timeElements = elements.filter(e => 
      e.class.includes('time') || e.class.includes('date') || /^\d{4}-\d{2}-\d{2}/.test(e.text)
    );
    if (timeElements.length > 0) {
      fields.push({
        category: 'notice',
        field: 'noticeTime',
        label: '公告时间',
        selector: this._buildSelector(timeElements[0]),
        sample: timeElements[0].text,
        confidence: 'medium',
      });
    }

    // 8. 购买按钮
    const buyBtns = elements.filter(e => 
      (e.text.includes('购买') || e.text.includes('立即购买') || e.text.includes('确认')) &&
      (e.tag === 'button' || e.tag === 'view')
    );
    if (buyBtns.length > 0) {
      fields.push({
        category: 'market',
        field: 'buyButton',
        label: '购买按钮',
        selector: this._buildSelector(buyBtns[0]),
        sample: buyBtns[0].text,
        confidence: 'high',
      });
    }

    // 按分类排序
    const order = { login: 1, market: 2, notice: 3 };
    fields.sort((a, b) => (order[a.category] || 99) - (order[b.category] || 99));

    return fields;
  }

  _buildSelector(el) {
    if (el.class) {
      const classes = el.class.split(' ').filter(c => c && !c.startsWith('data-v-') && !c.match(/^v-/)).join('.');
      if (classes) return `${el.tag}.${classes}`;
    }
    if (el.id) return `#${el.id}`;
    // 尝试用文本定位
    if (el.text && el.text.length < 20) {
      return `${el.tag}:has-text("${el.text}")`;
    }
    return el.tag;
  }
}

module.exports = Scanner;
