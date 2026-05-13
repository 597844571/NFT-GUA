const { chromium } = require('playwright');

/**
 * 页面选择器扫描器
 * 用 Playwright 打开目标页面，分析 DOM 结构，返回建议的选择器
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
      await page.waitForTimeout(2000);

      // 通用扫描：获取页面所有可见元素及其 class
      const elements = await page.evaluate(() => {
        const results = [];
        const tags = ['uni-view', 'uni-input', 'uni-button', 'uni-text', 'uni-image', 'uni-scroll-view', 'div', 'span', 'input', 'button', 'a'];
        
        for (const tag of tags) {
          const nodes = document.querySelectorAll(tag);
          for (const node of nodes) {
            const text = (node.innerText || '').trim();
            if (text.length === 0 || text.length > 100) continue;
            
            const cls = node.className || '';
            const id = node.id || '';
            const type = node.getAttribute('type') || '';
            const placeholder = node.getAttribute('placeholder') || '';
            
            results.push({
              tag: tag.replace('uni-', ''),
              class: cls,
              id,
              text: text.slice(0, 80),
              type,
              placeholder,
              rect: node.getBoundingClientRect ? {
                width: node.getBoundingClientRect().width,
                height: node.getBoundingClientRect().height,
              } : null,
            });
          }
        }
        return results;
      });

      // 智能分析：根据页面类型给出建议
      const suggestions = this._analyze(elements, pageType);

      // 获取页面标题
      const title = await page.title().catch(() => '');

      return {
        success: true,
        url,
        title,
        elements: elements.slice(0, 100),
        suggestions,
      };
    } catch (err) {
      return { success: false, error: err.message, url };
    } finally {
      await this.browser.close();
      this.browser = null;
    }
  }

  _analyze(elements, pageType) {
    const suggestions = {
      login: {},
      market: {},
      notice: {},
    };

    // 登录页分析
    const phoneInputs = elements.filter(e => 
      (e.tag === 'input' || e.tag === 'view') && 
      (e.placeholder.includes('手机') || e.placeholder.includes('phone') || e.class.includes('phone'))
    );
    const passwordInputs = elements.filter(e => 
      (e.tag === 'input' && e.type === 'password') || 
      e.placeholder.includes('密码') || e.placeholder.includes('password')
    );
    const loginBtns = elements.filter(e => 
      e.text.includes('登录') || e.text.includes('Login') || e.class.includes('login')
    );

    if (phoneInputs.length > 0) suggestions.login.phoneInput = this._buildSelector(phoneInputs[0]);
    if (passwordInputs.length > 0) suggestions.login.passwordInput = this._buildSelector(passwordInputs[0]);
    if (loginBtns.length > 0) suggestions.login.loginButton = this._buildSelector(loginBtns[0]);

    // 公告页分析
    const listContainers = elements.filter(e => 
      e.class.includes('paging') || e.class.includes('list') || e.class.includes('container')
    );
    const titleElements = elements.filter(e => 
      e.class.includes('title') || e.class.includes('name')
    );
    const timeElements = elements.filter(e => 
      e.class.includes('time') || e.class.includes('date')
    );

    if (listContainers.length > 0) suggestions.notice.noticeItem = `${this._buildSelector(listContainers[0])} > uni-view`;
    if (titleElements.length > 0) suggestions.notice.noticeTitle = this._buildSelector(titleElements[0]);
    if (timeElements.length > 0) suggestions.notice.noticeTime = this._buildSelector(timeElements[0]);

    return suggestions;
  }

  _buildSelector(el) {
    // 优先用 class，其次用 tag
    if (el.class) {
      const classes = el.class.split(' ').filter(c => c && !c.startsWith('data-v-')).join('.');
      if (classes) return `${el.tag}.${classes}`;
    }
    if (el.id) return `#${el.id}`;
    return el.tag;
  }
}

module.exports = Scanner;
