const { chromium } = require('playwright');
const { createAdapter } = require('./platforms');
const Notifier = require('./notifier');

class Engine {
  constructor(config, logger, onStatusChange, onMonitorUpdate) {
    this.config = config;
    this.logger = logger;
    this.onStatusChange = onStatusChange;
    this.onMonitorUpdate = onMonitorUpdate;
    this.notifier = new Notifier(config.global || {});

    this.browser = null;
    this.context = null;
    this.pages = new Map(); // accountId -> page
    this.adapters = new Map(); // platform -> adapter

    this.status = 'stopped'; // stopped | running | paused
    this.runningTasks = new Set();
    this.monitors = new Map(); // monitorId -> monitor config
    this.monitorInterval = null;
    this.monitorResults = new Map(); // monitorId -> latest result

    this.taskTimers = []; // setTimeout handles
  }

  async start() {
    if (this.browser) return;

    this.logger.info('正在启动浏览器...');
    const { global = {} } = this.config;

    this.browser = await chromium.launch({
      headless: global.headless ?? false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      proxy: global.proxy ? { server: global.proxy } : undefined,
    });

    this.status = 'running';
    this._emitStatus();
    this.logger.success('浏览器已启动');
    this.notifier.send('DC AutoBot 启动', '引擎已成功启动，开始执行任务').catch(() => {});

    // 初始化所有账号的页面
    const accounts = (this.config.accounts || []).filter(a => a.enabled);
    for (const account of accounts) {
      try {
        await this._initAccountPage(account);
      } catch (err) {
        this.logger.error(`初始化账号 ${account.name || account.phone} 失败: ${err.message}`);
      }
    }

    // 启动监控中心
    this._startMonitorLoop();

    // 调度所有启用的任务
    this._scheduleTasks();
  }

  async stop() {
    this.status = 'stopped';
    this._emitStatus();

    // 清理定时器
    this.taskTimers.forEach(t => clearTimeout(t));
    this.taskTimers = [];

    // 停止监控
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    // 关闭页面和浏览器
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.pages.clear();
    this.adapters.clear();
    this.logger.info('引擎已停止');
    this.notifier.send('DC AutoBot 停止', '引擎已停止运行').catch(() => {});
  }

  pause() {
    if (this.status === 'running') {
      this.status = 'paused';
      this._emitStatus();
      this.logger.warn('引擎已暂停');
    }
  }

  resume() {
    if (this.status === 'paused') {
      this.status = 'running';
      this._emitStatus();
      this.logger.info('引擎已恢复');
    }
  }

  getStatus() {
    return {
      status: this.status,
      monitors: Array.from(this.monitors.values()),
      monitorResults: Object.fromEntries(this.monitorResults),
      runningTasks: Array.from(this.runningTasks),
    };
  }

  async _initAccountPage(account) {
    const platformConfig = (this.config.platforms || []).find((p) => p.key === account.platform) || {};
    const adapter = createAdapter(account.platform, platformConfig);
    this.adapters.set(account.id, adapter);

    const contextOptions = {};
    if (this.config.global?.userDataDir) {
      contextOptions.storageState = this.config.global.userDataDir;
    }

    const context = await this.browser.newContext(contextOptions);
    const page = await context.newPage();

    // 隐藏自动化特征
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
    });

    this.pages.set(account.id, page);
    this.logger.info(`账号 ${account.name || account.phone} 浏览器已初始化`);

    // 自动登录
    try {
      await adapter.login(page, account);
      this.logger.success(`账号 ${account.name || account.phone} 登录成功`);
    } catch (err) {
      this.logger.error(`账号 ${account.name || account.phone} 登录失败: ${err.message}`);
    }
  }

  // ========== 任务调度 ==========

  _scheduleTasks() {
    const tasks = (this.config.tasks || []).filter(t => t.enabled);
    for (const task of tasks) {
      if (task.type === 'limited_sale') {
        this._scheduleLimitedSale(task);
      }
    }
  }

  _scheduleLimitedSale(task) {
    const startTime = new Date(task.params?.startTime).getTime();
    const now = Date.now();
    const delay = startTime - now;

    if (delay > 0) {
      this.logger.info(`任务 [${task.name}] 已定时，将在 ${Math.round(delay / 1000)} 秒后执行`);
      const timer = setTimeout(() => this._executeTask(task), delay);
      this.taskTimers.push(timer);
    } else {
      this.logger.warn(`任务 [${task.name}] 设定时间已过，立即执行`);
      this._executeTask(task);
    }
  }

  async runTaskNow(taskId) {
    const task = (this.config.tasks || []).find(t => t.id === taskId);
    if (!task) throw new Error('任务不存在');
    await this._executeTask(task);
  }

  async _executeTask(task) {
    if (this.status !== 'running') {
      this.logger.warn(`任务 [${task.name}] 跳过：引擎未运行`);
      return;
    }

    this.runningTasks.add(task.id);
    this._emitStatus();
    this.logger.info(`====== 开始执行任务: ${task.name} ======`);

    try {
      const accountIds = task.accountIds || [];
      for (const accId of accountIds) {
        const account = (this.config.accounts || []).find(a => a.id === accId && a.enabled);
        if (!account) continue;

        const page = this.pages.get(accId);
        const adapter = this.adapters.get(accId);
        if (!page || !adapter) {
          this.logger.warn(`账号 ${account.name || account.phone} 未初始化，跳过`);
          continue;
        }

        await this._runTaskForAccount(task, account, page, adapter);
      }
    } catch (err) {
      this.logger.error(`任务 [${task.name}] 执行异常: ${err.message}`);
    } finally {
      this.runningTasks.delete(task.id);
      this._emitStatus();
    }
  }

  async _runTaskForAccount(task, account, page, adapter) {
    const { type, params } = task;
    this.logger.info(`[${task.name}] 账号: ${account.name || account.phone}`);

    switch (type) {
      case 'limited_sale':
        // 限时发售：导航到发售页 → 等待/刷新 → 点击购买
        await adapter.navigateTo(page, 'sale');
        // TODO: 实现具体抢购逻辑
        this.logger.success(`[${task.name}] 限时发售流程已执行（需补充 XPath）`);
        break;

      case 'market_sniping':
        // 市场抢单：搜索 → 比价 → 购买
        const items = await adapter.getMarketItems(page, params.keyword);
        const target = items.find(i => i.price <= params.maxPrice);
        if (target) {
          this.logger.success(`[${task.name}] 发现目标: ${target.name} ¥${target.price}`);
          await adapter.buyItem(page, target.itemId, params.maxPrice, params.quantity);
        } else {
          this.logger.warn(`[${task.name}] 未找到符合条件的藏品`);
        }
        break;

      case 'synthesis':
        await adapter.doSynthesis(page, params.activityName, params.materials, params.synthesisCount);
        this.logger.success(`[${task.name}] 合成流程已执行`);
        break;

      case 'decomposition':
        await adapter.doDecomposition(page, params.targetName, params.outputs, params.decomposeCount);
        this.logger.success(`[${task.name}] 分解流程已执行`);
        break;

      default:
        this.logger.warn(`[${task.name}] 未知任务类型: ${type}`);
    }

    await adapter.randomDelay(
      this.config.global?.randomDelayMin ?? 0.5,
      this.config.global?.randomDelayMax ?? 2.0
    );
  }

  // ========== 监控中心 (Market Monitor) ==========

  _startMonitorLoop() {
    const intervalMs = this.config.global?.monitorRefreshMs ?? 2000; // 默认2秒
    this.monitorInterval = setInterval(() => this._runMonitorCycle(), intervalMs);
    this.logger.info(`监控中心已启动，刷新间隔: ${intervalMs}ms`);
  }

  async _runMonitorCycle() {
    if (this.status !== 'running') return;

    for (const [id, monitor] of this.monitors) {
      if (!monitor.enabled) continue;
      try {
        await this._checkMonitor(monitor);
      } catch (err) {
        this.logger.error(`监控 [${monitor.keyword}] 检查失败: ${err.message}`);
      }
    }
  }

  async _checkMonitor(monitor) {
    // 找一个该平台的账号来获取页面
    const account = (this.config.accounts || []).find(a => a.platform === monitor.platform && a.enabled);
    if (!account) return;

    const page = this.pages.get(account.id);
    const adapter = this.adapters.get(account.id);
    if (!page || !adapter) return;

    const items = await adapter.getMarketItems(page, monitor.keyword);
    const matched = monitor.itemId
      ? items.find(i => i.itemId === monitor.itemId)
      : items[0];

    const previous = this.monitorResults.get(monitor.id);
    const result = {
      id: monitor.id,
      keyword: monitor.keyword,
      currentPrice: matched?.price ?? null,
      alertPrice: monitor.alertPrice,
      itemId: matched?.itemId ?? '',
      status: matched && matched.price <= monitor.alertPrice ? 'triggered' : 'monitoring',
      lastUpdate: new Date().toLocaleTimeString(),
      autoBuy: monitor.autoBuy,
    };

    // 只有价格变化或触发时才推送
    if (!previous || previous.currentPrice !== result.currentPrice || result.status === 'triggered') {
      this.monitorResults.set(monitor.id, result);
      if (this.onMonitorUpdate) this.onMonitorUpdate(result);
    }

    // 触发提醒
    if (result.status === 'triggered') {
      this.logger.success(`🚨 监控触发 [${monitor.keyword}] 当前价: ¥${result.currentPrice} ≤ 阈值: ¥${monitor.alertPrice}`);

      // 自动抢单
      if (monitor.autoBuy && matched) {
        this.logger.info(`自动抢单启动: ${monitor.keyword}`);
        try {
          await adapter.buyItem(page, matched.itemId, monitor.alertPrice, monitor.buyQuantity);
          this.logger.success(`自动抢单成功: ${monitor.keyword}`);
          result.status = 'bought';
          this.monitorResults.set(monitor.id, result);
          if (this.onMonitorUpdate) this.onMonitorUpdate(result);
        } catch (err) {
          this.logger.error(`自动抢单失败: ${err.message}`);
        }
      }
    }
  }

  addMonitor(item) {
    this.monitors.set(item.id, item);
    this.logger.info(`监控已添加: ${item.keyword}，阈值: ¥${item.alertPrice}`);
    this._emitStatus();
  }

  removeMonitor(id) {
    this.monitors.delete(id);
    this.monitorResults.delete(id);
    this.logger.info(`监控已移除: ${id}`);
    this._emitStatus();
  }

  toggleMonitor(id) {
    const m = this.monitors.get(id);
    if (m) {
      m.enabled = !m.enabled;
      this.logger.info(`监控 [${m.keyword}] 已${m.enabled ? '启用' : '停用'}`);
      this._emitStatus();
    }
  }

  async buyNow(monitorId) {
    const monitor = this.monitors.get(monitorId);
    if (!monitor) throw new Error('监控项不存在');

    const account = (this.config.accounts || []).find(a => a.platform === monitor.platform && a.enabled);
    if (!account) throw new Error('无可用账号');

    const page = this.pages.get(account.id);
    const adapter = this.adapters.get(account.id);
    if (!page || !adapter) throw new Error('页面未初始化');

    const items = await adapter.getMarketItems(page, monitor.keyword);
    const matched = monitor.itemId
      ? items.find(i => i.itemId === monitor.itemId)
      : items[0];

    if (!matched) throw new Error('未找到目标藏品');

    this.logger.info(`手动抢单: ${monitor.keyword}，价格: ¥${matched.price}`);
    await adapter.buyItem(page, matched.itemId, monitor.alertPrice, monitor.buyQuantity);
    this.logger.success(`手动抢单完成: ${monitor.keyword}`);
  }

  _emitStatus() {
    if (this.onStatusChange) {
      this.onStatusChange(this.getStatus());
    }
  }
}

module.exports = Engine;
