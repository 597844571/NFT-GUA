import { useState } from 'react';
import { useAutoBotStorage } from '../hooks/useAutoBotStorage';
import { DEFAULT_SETTINGS } from '@shared/constants';
import AccountManager from './AccountManager.jsx';
import TaskManager from './TaskManager.jsx';
import MonitorCenter from './MonitorCenter.jsx';
import RunControl from './RunControl.jsx';

export default function AutoBotPage() {
  const [activeTab, setActiveTab] = useState('run');
  const store = useAutoBotStorage();

  const tabs = [
    { key: 'run', label: '运行控制', icon: '🚀' },
    { key: 'monitor', label: '监控中心', icon: '📡' },
    { key: 'accounts', label: '账号管理', icon: '👤' },
    { key: 'tasks', label: '任务管理', icon: '📋' },
    { key: 'settings', label: '全局设置', icon: '⚙️' },
  ];

  return (
    <div className="autobot-page">
      <aside className="autobot-sidebar">
        <div className="autobot-brand">
          <span className="autobot-logo">🤖</span>
          <span>DC AutoBot</span>
        </div>
        <nav className="autobot-nav">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={activeTab === t.key ? 'active' : ''}
              onClick={() => setActiveTab(t.key)}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="autobot-sidebar-footer">
          <div className="autobot-status-dot" data-status={store.engineStatus.status} />
          <span>引擎: {store.engineStatus.status === 'running' ? '运行中' : store.engineStatus.status === 'paused' ? '已暂停' : '已停止'}</span>
          <div className="autobot-mini-stat">
            <div>账号: {store.accounts.filter((a) => a.enabled).length}/{store.accounts.length}</div>
            <div>任务: {store.tasks.filter((t) => t.enabled).length}/{store.tasks.length}</div>
            <div>监控: {store.monitors.filter((m) => m.enabled).length}/{store.monitors.length}</div>
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
      <div className="form-actions">
        <button className="btn-secondary" onClick={() => { setSettings(DEFAULT_SETTINGS); addLog('info', '设置已重置'); }}>重置默认</button>
        <button className="btn-primary" onClick={() => addLog('success', '设置已保存')}>保存设置</button>
      </div>
    </div>
  );
}
