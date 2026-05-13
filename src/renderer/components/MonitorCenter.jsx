import { useState } from 'react';
import { api } from '../api';

export default function MonitorCenter({ accounts, monitors, setMonitors, platforms, monitorResults, addLog, engineStatus }) {
  const [form, setForm] = useState({
    type: 'market',
    keyword: '',
    itemId: '',
    alertPrice: '',
    autoBuy: false,
    buyQuantity: 1,
    platform: 'yluc',
    refreshInterval: 2,
  });

  const isMarket = form.type === 'market';

  const addMonitor = async () => {
    if (isMarket) {
      if (!form.keyword.trim() || !form.alertPrice) { addLog('warn', '请填写藏品名称和阈值价格'); return; }
    } else {
      if (!form.keyword.trim()) { addLog('warn', '请填写监控关键词'); return; }
    }
    const item = {
      id: `mon-${Date.now()}`,
      ...form,
      alertPrice: isMarket ? Number(form.alertPrice) : undefined,
      enabled: true,
    };
    setMonitors((prev) => [item, ...prev]);
    if (engineStatus.status === 'running') {
      await api.monitorAdd(item);
    }
    addLog('success', `监控已添加: ${item.keyword} [${isMarket ? '市场' : '公告'}]`);
    setForm({ type: 'market', keyword: '', itemId: '', alertPrice: '', autoBuy: false, buyQuantity: 1, platform: 'yluc', refreshInterval: 2 });
  };

  const removeMonitor = async (id) => {
    setMonitors((prev) => prev.filter((m) => m.id !== id));
    await api.monitorRemove(id);
    addLog('info', '监控已移除');
  };

  const toggleMonitor = async (id) => {
    setMonitors((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)));
    await api.monitorToggle(id);
  };

  const buyNow = async (monId) => {
    addLog('info', '正在执行手动抢单...');
    const res = await api.buyNow(monId);
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
        <div className="autobot-form" style={{ maxWidth: 800 }}>
          <div className="form-row" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <label>监控类型</label>
            <select value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}>
              <option value="market">📈 市场价格监控</option>
              <option value="announcement">📢 活动公告监控</option>
            </select>
            <div className="autobot-hint">
              {isMarket ? '监控市场藏品价格，低于阈值时提醒/自动抢单' : '监控平台公告列表，出现含关键词的新公告时推送'}
            </div>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: isMarket ? '1fr 1fr 120px 120px' : '1fr 120px', gap: 10 }}>
            <div>
              <label>{isMarket ? '藏品名称 *' : '关键词 *'}</label>
              <input
                value={form.keyword}
                onChange={(e) => setForm((s) => ({ ...s, keyword: e.target.value }))}
                placeholder={isMarket ? '如：元力胶囊' : '如：合成,空投,抽奖,元力胶囊'}
              />
              {!isMarket && <div className="autobot-hint">多个关键词用逗号分隔，匹配公告标题或摘要</div>}
            </div>
            {isMarket && (
              <>
                <div><label>编号（可选）</label><input value={form.itemId} onChange={(e) => setForm((s) => ({ ...s, itemId: e.target.value }))} placeholder="#82310" /></div>
                <div><label>阈值价格 *</label><input type="number" step="0.01" value={form.alertPrice} onChange={(e) => setForm((s) => ({ ...s, alertPrice: e.target.value }))} placeholder="5.00" /></div>
              </>
            )}
            <div><label>平台</label>
              <select value={form.platform} onChange={(e) => setForm((s) => ({ ...s, platform: e.target.value }))}>
                <option value="">请选择平台</option>
                {(platforms || []).map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {isMarket && (
            <div className="form-row" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <label className="autobot-check-label inline"><input type="checkbox" checked={form.autoBuy} onChange={(e) => setForm((s) => ({ ...s, autoBuy: e.target.checked }))} />达到阈值自动抢单</label>
              <div><label>抢单数量</label><input type="number" min={1} max={99} value={form.buyQuantity} onChange={(e) => setForm((s) => ({ ...s, buyQuantity: Number(e.target.value) }))} style={{ width: 80 }} /></div>
            </div>
          )}

          <div className="form-actions"><button className="btn-primary" onClick={addMonitor}>➕ 添加监控</button></div>
        </div>
      </div>

      <div className="autobot-section">
        <h3>📊 实时监控列表 ({monitors.length})</h3>
        {monitors.length === 0 ? <div className="autobot-empty">暂无监控项，请在上方添加</div> : (
          <div className="autobot-table-wrap">
            <table className="autobot-table">
              <thead>
                <tr>
                  <th>类型</th>
                  <th>状态</th>
                  <th>关键词</th>
                  {monitors.some(m => m.type !== 'announcement') && <th>编号</th>}
                  {monitors.some(m => m.type !== 'announcement') && <th>当前价</th>}
                  {monitors.some(m => m.type !== 'announcement') && <th>阈值</th>}
                  {monitors.some(m => m.type !== 'announcement') && <th>挂售/锁单</th>}
                  {monitors.some(m => m.type !== 'announcement') && <th>最低/最高</th>}
                  {monitors.some(m => m.type === 'announcement') && <th>匹配公告</th>}
                  {monitors.some(m => m.type !== 'announcement') && <th>自动抢单</th>}
                  <th>最后更新</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {monitors.map((m) => {
                  const result = monitorResults[m.id];
                  const isAnn = m.type === 'announcement';
                  return (
                    <tr key={m.id} className={result?.status === 'triggered' ? 'triggered-row' : ''}>
                      <td>{isAnn ? '📢 公告' : '📈 市场'}</td>
                      <td>{statusIcon(result)} {statusLabel(result)}</td>
                      <td><strong>{m.keyword}</strong></td>
                      {!isAnn && <td>{m.itemId || '-'}</td>}
                      {!isAnn && <td className="price-cell">{result?.currentPrice != null ? `¥${result.currentPrice}` : '-'}</td>}
                      {!isAnn && <td>¥{m.alertPrice}</td>}
                      {!isAnn && (
                        <td style={{ fontSize: 12 }}>
                          {result?.stats ? (
                            <div>
                              <div style={{ color: 'var(--success)' }}>挂售 {result.stats.totalCount}</div>
                              {result.stats.lockedCount > 0 && (
                                <div style={{ color: 'var(--danger)', fontSize: 11 }}>锁单 {result.stats.lockedCount}</div>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                      )}
                      {!isAnn && (
                        <td style={{ fontSize: 12 }}>
                          {result?.stats ? (
                            <div>
                              <div style={{ color: 'var(--info)' }}>低 ¥{result.stats.minPrice}</div>
                              <div style={{ color: 'var(--warn)', fontSize: 11 }}>高 ¥{result.stats.maxPrice}</div>
                            </div>
                          ) : '-'}
                        </td>
                      )}
                      {isAnn && (
                        <td>
                          {result?.matchedCount > 0 ? (
                            <div>
                              <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{result.matchedCount} 条匹配</span>
                              {result.announcements?.map((a, i) => (
                                <div key={i} style={{ fontSize: 12, marginTop: 4 }}>
                                  {a.title}
                                  {a.url && <a href={a.url} target="_blank" rel="noreferrer" style={{ marginLeft: 6, color: '#1890ff' }}>🔗</a>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      )}
                      {!isAnn && <td>{m.autoBuy ? '✅ 是' : '❌ 否'}</td>}
                      <td>{result?.lastUpdate || '-'}</td>
                      <td>
                        <div className="autobot-table-actions">
                          {!isAnn && result?.status === 'triggered' && <button className="btn-primary" onClick={() => buyNow(m.id)}>立即抢单</button>}
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
