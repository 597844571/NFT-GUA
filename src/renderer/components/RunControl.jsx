import { useState, useRef, useEffect } from 'react';
import { api } from '../api';

export default function RunControl({ accounts, tasks, settings, monitors, platforms, logs, addLog, clearLogs, engineStatus }) {
  const [isExporting, setIsExporting] = useState(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const enabledAccounts = accounts.filter((a) => a.enabled);
  const enabledTasks = tasks.filter((t) => t.enabled);
  const enabledMonitors = monitors.filter((m) => m.enabled);

  const startEngine = async () => {
    if (!enabledAccounts.length) { addLog('warn', '没有启用的账号'); return; }
    if (!enabledTasks.length && !enabledMonitors.length) { addLog('warn', '没有启用的任务或监控'); return; }

    addLog('info', '正在启动引擎...');
    const config = {
      global: settings,
      accounts,
      tasks,
      monitors,
      platforms: platforms || [],
    };
    const res = await api.startEngine(config);
    if (res.success) addLog('success', '引擎启动成功');
    else addLog('error', `引擎启动失败: ${res.error}`);
  };

  const stopEngine = async () => {
    addLog('info', '正在停止引擎...');
    await api.stopEngine();
    addLog('success', '引擎已停止');
  };

  const pauseEngine = async () => {
    await api.pauseEngine();
    addLog('warn', '引擎已暂停');
  };

  const resumeEngine = async () => {
    await api.resumeEngine();
    addLog('info', '引擎已恢复');
  };

  const exportConfig = async () => {
    const config = { global: settings, accounts, tasks, monitors };
    await api.exportConfig(config);
    addLog('info', '配置已导出');
  };

  const runTaskNow = async (taskId) => {
    if (engineStatus.status !== 'running') { addLog('warn', '请先启动引擎'); return; }
    addLog('info', '手动执行任务...');
    const res = await api.runTask(taskId);
    if (res.success) addLog('success', '任务执行完成');
    else addLog('error', res.error);
  };

  return (
    <div className="autobot-panel">
      <div className="autobot-section">
        <h3>🚀 运行控制</h3>
        <div className="autobot-run-stats">
          <div className="stat-box"><div className="stat-value">{enabledAccounts.length}</div><div className="stat-label">可用账号</div></div>
          <div className="stat-box"><div className="stat-value">{enabledTasks.length}</div><div className="stat-label">启用任务</div></div>
          <div className="stat-box"><div className="stat-value">{enabledMonitors.length}</div><div className="stat-label">监控项</div></div>
          <div className="stat-box"><div className="stat-value">{engineStatus.status === 'running' ? '▶' : engineStatus.status === 'paused' ? '⏸' : '⏹'}</div><div className="stat-label">引擎状态</div></div>
        </div>

        <div className="autobot-toolbar">
          {engineStatus.status !== 'running' ? (
            <button className="btn-primary" onClick={startEngine}>▶ 启动引擎</button>
          ) : (
            <>
              <button className="btn-danger" onClick={stopEngine}>⏹ 停止引擎</button>
              <button className="btn-secondary" onClick={pauseEngine}>⏸ 暂停</button>
            </>
          )}
          {engineStatus.status === 'paused' && <button className="btn-primary" onClick={resumeEngine}>▶ 恢复</button>}
          <button className="btn-secondary" onClick={exportConfig}>📥 导出配置</button>
        </div>

        <div className="autobot-hint">
          💡 首次启动会自动安装 Chromium 浏览器（Playwright 内置）。安装完成后即可自动操作页面。
        </div>
      </div>

      {enabledTasks.length > 0 && (
        <div className="autobot-section">
          <h3>📋 快捷执行任务</h3>
          <div className="autobot-list">
            {enabledTasks.map((task) => (
              <div key={task.id} className="autobot-card">
                <div className="autobot-card-header"><strong>{task.name}</strong><span className="autobot-badge">{task.type}</span></div>
                <div className="autobot-card-body">{task.params?.keyword && <div>🔍 {task.params.keyword}</div>}</div>
                <div className="autobot-card-actions"><button className="btn-primary" onClick={() => runTaskNow(task.id)}>立即执行</button></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="autobot-section">
        <div className="autobot-log-header"><h3>📜 运行日志 ({logs.length})</h3><button className="btn-secondary" onClick={clearLogs}>🗑 清空</button></div>
        <div className="autobot-log-window">
          {logs.length === 0 ? <div className="autobot-empty">暂无日志</div> : (
            <>
              {[...logs].reverse().map((log) => (
                <div key={log.id} className={`autobot-log-line autobot-log-${log.level}`}>
                  <span className="log-time">{log.time}</span>
                  <span className={`log-level log-level-${log.level}`}>{log.level.toUpperCase()}</span>
                  <span className="log-msg">{log.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
