import { useState } from 'react';
import { useAutoBotStorage } from '../hooks/useAutoBotStorage';
import { DEFAULT_SETTINGS } from '@shared/constants';
import AccountManager from './AccountManager.jsx';
import TaskManager from './TaskManager.jsx';
import MonitorCenter from './MonitorCenter.jsx';
import RunControl from './RunControl.jsx';
import PlatformManager from './PlatformManager.jsx';

export default function AutoBotPage() {
  const [activeTab, setActiveTab] = useState('run');
  const store = useAutoBotStorage();

  const tabs = [
    { key: 'run', label: '运行控制', icon: '🚀' },
    { key: 'monitor', label: '监控中心', icon: '📡' },
    { key: 'accounts', label: '账号管理', icon: '👤' },
    { key: 'tasks', label: '任务管理', icon: '📋' },
    { key: 'platforms', label: '平台管理', icon: '🏗️' },
    { key: 'settings', label: '全局设置', icon: '⚙️' },
  ];

  return (
    <div className="autobot-page">
      <aside className="autobot-sidebar">
        <div className="autobot-brand" title="DC AutoBot">🤖</div>
        <nav className="autobot-nav">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={activeTab === t.key ? 'active' : ''}
              onClick={() => setActiveTab(t.key)}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </nav>
        <div className="autobot-sidebar-footer">
          <div className="autobot-status-dot" data-status={store.engineStatus.status} title={store.engineStatus.status} />
          <div style={{fontSize: 10, marginTop: 4}}>
            {store.accounts.filter((a) => a.enabled).length}·
            {store.tasks.filter((t) => t.enabled).length}·
            {store.monitors.filter((m) => m.enabled).length}
          </div>
        </div>
      </aside>

      <main className="autobot-main">
        <header className="autobot-header">
          <h2>{tabs.find((t) => t.key === activeTab)?.label}</h2>
          <div className="autobot-header-desc">数字藏品自动化工具 · 本地运行 · 安全可靠</div>
        </header>

        {activeTab === 'run' && <RunControl {...store} />}
        {activeTab === 'monitor' && <MonitorCenter {...store} />}
        {activeTab === 'accounts' && <AccountManager {...store} />}
        {activeTab === 'tasks' && <TaskManager {...store} />}
        {activeTab === 'platforms' && <PlatformManager {...store} />}
        {activeTab === 'settings' && (
          <div className="autobot-panel">
            <div className="autobot-section">
              <h3>⚙️ 全局设置</h3>
              <SettingsForm settings={store.settings} setSettings={store.setSettings} addLog={store.addLog} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SettingsForm({ settings, setSettings, addLog }) {
  const update = (key, value) => setSettings((s) => ({ ...s, [key]: value }));

  const testNotify = async () => {
    if (!window.electronAPI) { addLog('error', 'Electron API 不可用'); return; }
    addLog('info', '正在发送测试推送...');
    const res = await window.electronAPI.testNotify(settings);
    if (res.success) addLog('success', `测试推送成功：${res.results?.map((r) => r.channel).join('、') || '已发送'}`);
    else addLog('error', `测试推送失败：${res.error}`);
  };

  return (
    <div className="autobot-form" style={{ maxWidth: 560 }}>
      <div className="form-row">
        <label>最小随机延时 (秒)</label>
        <input type="number" step="0.1" min={0} max={10} value={settings.randomDelayMin} onChange={(e) => update('randomDelayMin', Number(e.target.value))} />
      </div>
      <div className="form-row">
        <label>最大随机延时 (秒)</label>
        <input type="number" step="0.1" min={0} max={30} value={settings.randomDelayMax} onChange={(e) => update('randomDelayMax', Number(e.target.value))} />
      </div>
      <div className="form-row">
        <label>监控刷新间隔 (毫秒)</label>
        <input type="number" step={20} min={20} max={10000} value={settings.monitorRefreshMs} onChange={(e) => update('monitorRefreshMs', Number(e.target.value))} />
        <div className="autobot-hint">数值越小刷新越频繁，CPU 占用越高。建议 500-2000ms</div>
      </div>
      <div className="form-row">
        <label>最大并发数</label>
        <input type="number" min={1} max={10} value={settings.maxConcurrency} onChange={(e) => update('maxConcurrency', Number(e.target.value))} />
      </div>
      <div className="form-row">
        <label className="autobot-check-label inline">
          <input type="checkbox" checked={settings.headless} onChange={(e) => update('headless', e.target.checked)} />
          无头模式（后台运行，不显示浏览器窗口）
        </label>
      </div>
      <div className="form-row">
        <label className="autobot-check-label inline">
          <input type="checkbox" checked={settings.screenshotOnSuccess} onChange={(e) => update('screenshotOnSuccess', e.target.checked)} />
          成功时自动截图
        </label>
      </div>
      <div className="form-row">
        <label className="autobot-check-label inline">
          <input type="checkbox" checked={settings.soundNotify} onChange={(e) => update('soundNotify', e.target.checked)} />
          声音提醒
        </label>
      </div>
      <div className="form-row">
        <label className="autobot-check-label inline">
          <input type="checkbox" checked={settings.popupNotify} onChange={(e) => update('popupNotify', e.target.checked)} />
          弹窗提醒
        </label>
      </div>
      <div className="form-row">
        <label>代理地址（可选）</label>
        <input value={settings.proxy} onChange={(e) => update('proxy', e.target.value)} placeholder="http://127.0.0.1:7890" />
      </div>
      <div className="form-row">
        <label>User Data 目录（可选）</label>
        <input value={settings.userDataDir} onChange={(e) => update('userDataDir', e.target.value)} placeholder="C:\\Users\\...\\Profile" />
      </div>

      <div className="autobot-section-divider" />

      <h4 style={{ marginBottom: 12 }}>📲 微信推送配置（可选）</h4>

      <div className="form-row">
        <label className="autobot-check-label inline">
          <input type="checkbox" checked={settings.wechatServerChan} onChange={(e) => update('wechatServerChan', e.target.checked)} />
          启用 Server酱 推送（个人微信）
        </label>
      </div>
      {settings.wechatServerChan && (
        <div className="form-row">
          <label>Server酱 SendKey</label>
          <input value={settings.serverChanKey || ''} onChange={(e) => update('serverChanKey', e.target.value)} placeholder="SCTxxxxx..." />
          <div className="autobot-hint">获取地址：https://sct.ftqq.com</div>
        </div>
      )}

      <div className="form-row">
        <label className="autobot-check-label inline">
          <input type="checkbox" checked={settings.wechatWorkWebhook} onChange={(e) => update('wechatWorkWebhook', e.target.checked)} />
          启用企业微信机器人推送
        </label>
      </div>
      {settings.wechatWorkWebhook && (
        <div className="form-row">
          <label>企业微信 Webhook URL</label>
          <input value={settings.workWebhookUrl || ''} onChange={(e) => update('workWebhookUrl', e.target.value)} placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxx" />
        </div>
      )}

      <div className="form-actions">
        <button className="btn-secondary" onClick={testNotify}>🧪 测试推送</button>
        <button className="btn-secondary" onClick={() => { setSettings(DEFAULT_SETTINGS); addLog('info', '设置已重置'); }}>重置默认</button>
        <button className="btn-primary" onClick={() => addLog('success', '设置已保存')}>保存设置</button>
      </div>
    </div>
  );
}
