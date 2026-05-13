import { useState } from 'react';
export default function MonitorCenter({ accounts, monitors, setMonitors, platforms, monitorResults, addLog, engineStatus }) {
  const [form, setForm] = useState({ keyword: '', itemId: '', alertPrice: '', autoBuy: false, buyQuantity: 1, platform: 'yluc', refreshInterval: 2 });

  const addMonitor = async () => {
    if (!form.keyword.trim() || !form.alertPrice) { addLog('warn', '请填写关键词和阈值价格'); return; }
    const item = { id: `mon-${Date.now()}`, ...form, alertPrice: Number(form.alertPrice), enabled: true };
    setMonitors((prev) => [item, ...prev]);
    if (window.electronAPI && engineStatus.status === 'running') {
      await window.electronAPI.monitorAdd(item);
    }
    addLog('success', `监控已添加: ${item.keyword} 阈值 ¥${item.alertPrice}`);
    setForm({ keyword: '', itemId: '', alertPrice: '', autoBuy: false, buyQuantity: 1, platform: 'yluc', refreshInterval: 2 });
  };

  const removeMonitor = async (id) => {
    setMonitors((prev) => prev.filter((m) => m.id !== id));
    if (window.electronAPI) await window.electronAPI.monitorRemove(id);
    addLog('info', '监控已移除');
  };

  const toggleMonitor = async (id) => {
    setMonitors((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)));
    if (window.electronAPI) await window.electronAPI.monitorToggle(id);
  };

  const buyNow = async (monId) => {
    if (!window.electronAPI) { addLog('error', 'Electron API 不可用'); return; }
    addLog('info', '正在执行手动抢单...');
    const res = await window.electronAPI.buyNow(monId);
    if (res.success) addLog('success', '手动抢单已提交');
    else addLog('error', `抢单失败: ${res.error}`);
  };

  const statusIcon = (result) => {
    if (!result) return '🟡';
    if (result.status === 'bought') return '✅';
    if (result.status === 'triggered') return '🔴';
    return '🟢';
  };

  const statusLabel = (result) => {
    if (!result) return '等待数据';
    if (result.status === 'bought') return '已抢单';
    if (result.status === 'triggered') return '已触发';
    return '监控中';
  };

  return (
    <div className="autobot-panel">
      <div className="autobot-section">
        <h3>📡 添加监控项</h3>
        <div className="autobot-form" style={{ maxWidth: 700 }}>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px', gap: 10 }}>
            <div><label>藏品名称 *</label><input value={form.keyword} onChange={(e) => setForm((s) => ({ ...s, keyword: e.target.value }))} placeholder="如：元力胶囊" /></div>
            <div><label>编号（可选）</label><input value={form.itemId} onChange={(e) => setForm((s) => ({ ...s, itemId: e.target.value }))} placeholder="#82310" /></div>
            <div><label>阈值价格 *</label><input type="number" step="0.01" value={form.alertPrice} onChange={(e) => setForm((s) => ({ ...s, alertPrice: e.target.value }))} placeholder="5.00" /></div>
            <div><label>平台</label><select value={form.platform} onChange={(e) => setForm((s) => ({ ...s, platform: e.target.value }))}><option value="">请选择平台</option>{(platforms || []).map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}</select></div>
          </div>
          <div className="form-row" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <label className="autobot-check-label inline"><input type="checkbox" checked={form.autoBuy} onChange={(e) => setForm((s) => ({ ...s, autoBuy: e.target.checked }))} />达到阈值自动抢单</label>
            <div><label>抢单数量</label><input type="number" min={1} max={99} value={form.buyQuantity} onChange={(e) => setForm((s) => ({ ...s, buyQuantity: Number(e.target.value) }))} style={{ width: 80 }} /></div>
          </div>
          <div className="form-actions"><button className="btn-primary" onClick={addMonitor}>➕ 添加监控</button></div>
        </div>
      </div>

      <div className="autobot-section">
        <h3>📊 实时监控列表 ({monitors.length})</h3>
        {monitors.length === 0 ? <div className="autobot-empty">暂无监控项，请在上方添加</div> : (
          <div className="autobot-table-wrap">
            <table className="autobot-table">
              <thead><tr><th>状态</th><th>藏品名称</th><th>编号</th><th>当前价</th><th>阈值</th><th>自动抢单</th><th>最后更新</th><th>操作</th></tr></thead>
              <tbody>
                {monitors.map((m) => {
                  const result = monitorResults[m.id];
                  return (
                    <tr key={m.id} className={result?.status === 'triggered' ? 'triggered-row' : ''}>
                      <td>{statusIcon(result)} {statusLabel(result)}</td>
                      <td><strong>{m.keyword}</strong></td>
                      <td>{m.itemId || '-'}</td>
                      <td className="price-cell">{result?.currentPrice != null ? `¥${result.currentPrice}` : '-'}</td>
                      <td>¥{m.alertPrice}</td>
                      <td>{m.autoBuy ? '✅ 是' : '❌ 否'}</td>
                      <td>{result?.lastUpdate || '-'}</td>
                      <td>
                        <div className="autobot-table-actions">
                          {result?.status === 'triggered' && <button className="btn-primary" onClick={() => buyNow(m.id)}>立即抢单</button>}
                          <button onClick={() => toggleMonitor(m.id)}>{m.enabled ? '⏸' : '▶'}</button>
                          <button onClick={() => removeMonitor(m.id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
