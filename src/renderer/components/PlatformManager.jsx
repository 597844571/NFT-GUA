import { useState } from 'react';
import { api } from '../api';

const DEFAULT_SELECTORS = {
  loginPhone: '',
  loginPassword: '',
  loginButton: '',
  userAvatar: '',
  logoutButton: '',
  marketSearchInput: '',
  marketSearchButton: '',
  marketItemCard: '',
  marketItemName: '',
  marketItemPrice: '',
  marketItemId: '',
  buyButton: '',
  confirmPrice: '',
  confirmButton: '',
  quantityInput: '',
  payPasswordInput: '',
  finalPayButton: '',
  activityItem: '',
  materialItem: '',
  materialName: '',
  materialQuantityInput: '',
  synthesisCountInput: '',
  synthesisButton: '',
  warehouseItem: '',
  warehouseItemName: '',
  warehouseItemCount: '',
  decomposeEntry: '',
  decomposeCountInput: '',
  decomposeConfirmButton: '',
  noticeItem: '',
  noticeTitle: '',
  noticeTime: '',
  noticeLink: '',
  noticeSummary: '',
};

const SELECTOR_GROUPS = [
  {
    title: '🔐 登录页面',
    items: [
      { key: 'loginPhone', label: '手机号输入框', placeholder: 'input[placeholder="手机号"]' },
      { key: 'loginPassword', label: '密码输入框', placeholder: 'input[type="password"]' },
      { key: 'loginButton', label: '登录按钮', placeholder: 'button:has-text("登录")' },
      { key: 'userAvatar', label: '用户头像（用于判断是否登录成功）', placeholder: '.user-avatar' },
    ],
  },
  {
    title: '🏪 市场页面',
    items: [
      { key: 'marketSearchInput', label: '搜索框', placeholder: 'input[type="search"]' },
      { key: 'marketSearchButton', label: '搜索按钮', placeholder: 'button.search' },
      { key: 'marketItemCard', label: '藏品卡片（列表项）', placeholder: '.item-card' },
      { key: 'marketItemName', label: '藏品名称（在卡片内）', placeholder: '.item-name' },
      { key: 'marketItemPrice', label: '藏品价格（在卡片内）', placeholder: '.item-price' },
      { key: 'marketItemId', label: '藏品编号属性', placeholder: '[data-id]' },
      { key: 'marketTotalCount', label: '挂售总数（页面统计）', placeholder: '.total-count' },
      { key: 'marketLockedCount', label: '锁单数量（页面统计）', placeholder: '.locked-count' },
      { key: 'marketMinPrice', label: '最低挂售价（页面统计）', placeholder: '.min-price' },
      { key: 'marketMaxPrice', label: '最高挂售价（页面统计）', placeholder: '.max-price' },
      { key: 'marketTypeTab', label: '市场类型切换 Tab（寄售/求购）', placeholder: '.tab:has-text("寄售")' },
    ],
  },
  {
    title: '🛒 购买流程',
    items: [
      { key: 'buyButton', label: '购买/立即购买按钮', placeholder: 'button:has-text("购买")' },
      { key: 'confirmPrice', label: '确认页价格显示', placeholder: '.confirm-price' },
      { key: 'confirmButton', label: '确认购买按钮', placeholder: 'button:has-text("确认")' },
      { key: 'quantityInput', label: '数量输入框', placeholder: 'input[name="quantity"]' },
      { key: 'payPasswordInput', label: '支付密码输入框', placeholder: 'input[placeholder="支付密码"]' },
      { key: 'finalPayButton', label: '最终支付按钮', placeholder: 'button:has-text("支付")' },
    ],
  },
  {
    title: '⚗️ 合成页面',
    items: [
      { key: 'activityItem', label: '活动项', placeholder: '.activity-item' },
      { key: 'materialItem', label: '材料项', placeholder: '.material-item' },
      { key: 'materialName', label: '材料名称', placeholder: '.material-name' },
      { key: 'materialQuantityInput', label: '材料数量输入', placeholder: '.material-qty input' },
      { key: 'synthesisCountInput', label: '合成数量输入', placeholder: 'input[name="count"]' },
      { key: 'synthesisButton', label: '合成按钮', placeholder: 'button:has-text("合成")' },
    ],
  },
  {
    title: '🔨 分解页面',
    items: [
      { key: 'warehouseItem', label: '仓库藏品项', placeholder: '.warehouse-item' },
      { key: 'warehouseItemName', label: '仓库藏品名称', placeholder: '.item-name' },
      { key: 'warehouseItemCount', label: '仓库藏品数量', placeholder: '.item-count' },
      { key: 'decomposeEntry', label: '分解入口按钮', placeholder: 'button:has-text("分解")' },
      { key: 'decomposeCountInput', label: '分解数量输入', placeholder: 'input[name="decomposeCount"]' },
      { key: 'decomposeConfirmButton', label: '确认分解按钮', placeholder: 'button:has-text("确认分解")' },
    ],
  },
  {
    title: '📢 公告页面',
    items: [
      { key: 'noticeItem', label: '公告列表项', placeholder: '.notice-list > .item' },
      { key: 'noticeTitle', label: '公告标题', placeholder: '.notice-title' },
      { key: 'noticeTime', label: '公告时间', placeholder: '.notice-time' },
      { key: 'noticeLink', label: '公告链接', placeholder: 'a[href]' },
      { key: 'noticeSummary', label: '公告摘要', placeholder: '.notice-summary' },
    ],
  },
];

export default function PlatformManager({ platforms, setPlatforms, addLog }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', key: '', homeUrl: '', loginUrl: '', marketUrl: '', warehouseUrl: '', activityUrl: '', saleUrl: '', noticeUrl: '',
    selectors: { ...DEFAULT_SELECTORS },
  });
  const [activeGroup, setActiveGroup] = useState(0);

  // 扫描器状态
  const [scanUrl, setScanUrl] = useState('');
  const [scanType, setScanType] = useState('auto');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const reset = () => {
    setEditing(null);
    setForm({ name: '', key: '', homeUrl: '', loginUrl: '', marketUrl: '', warehouseUrl: '', activityUrl: '', saleUrl: '', noticeUrl: '', selectors: { ...DEFAULT_SELECTORS } });
    setActiveGroup(0);
    setScanResult(null);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.key.trim()) return;
    const payload = { ...form, id: editing || `plat-${Date.now()}` };
    setPlatforms((prev) => {
      const exists = prev.find((p) => p.id === payload.id);
      if (exists) return prev.map((p) => (p.id === payload.id ? payload : p));
      return [...prev, payload];
    });
    addLog('success', editing ? `平台已更新: ${payload.name}` : `平台已添加: ${payload.name}`);
    reset();
  };

  const onEdit = (plat) => {
    setEditing(plat.id);
    setForm({
      name: plat.name, key: plat.key,
      homeUrl: plat.homeUrl || '', loginUrl: plat.loginUrl || '', marketUrl: plat.marketUrl || '',
      warehouseUrl: plat.warehouseUrl || '', activityUrl: plat.activityUrl || '', saleUrl: plat.saleUrl || '',
      noticeUrl: plat.noticeUrl || '',
      selectors: { ...DEFAULT_SELECTORS, ...(plat.selectors || {}) },
    });
  };

  const onDelete = (id) => {
    if (!window.confirm('确定删除该平台配置？')) return;
    setPlatforms((prev) => prev.filter((p) => p.id !== id));
    addLog('warn', '平台已删除');
  };

  const updateSelector = (key, value) => {
    setForm((s) => ({ ...s, selectors: { ...s.selectors, [key]: value } }));
  };

  const importFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const data = JSON.parse(text);
      if (data.selectors || data.loginUrl) {
        setForm((s) => ({
          ...s,
          name: data.name || s.name,
          key: data.key || s.key,
          homeUrl: data.homeUrl || s.homeUrl,
          loginUrl: data.loginUrl || s.loginUrl,
          marketUrl: data.marketUrl || s.marketUrl,
          warehouseUrl: data.warehouseUrl || s.warehouseUrl,
          activityUrl: data.activityUrl || s.activityUrl,
          saleUrl: data.saleUrl || s.saleUrl,
          noticeUrl: data.noticeUrl || s.noticeUrl,
          selectors: { ...DEFAULT_SELECTORS, ...(data.selectors || {}) },
        }));
        addLog('success', '已从剪贴板导入配置');
      }
    } catch {
      addLog('error', '剪贴板内容不是有效的 JSON');
    }
  };

  const runScan = async () => {
    if (!scanUrl.trim()) { addLog('warn', '请输入要扫描的 URL'); return; }
    setScanning(true);
    setScanResult(null);
    addLog('info', `开始扫描: ${scanUrl}`);
    try {
      const result = await api.scanPage(scanUrl, scanType);
      if (result.success) {
        addLog('success', `扫描完成，发现 ${result.elements?.length || 0} 个元素`);
        setScanResult(result);
      } else {
        addLog('error', `扫描失败: ${result.error}`);
      }
    } catch (err) {
      addLog('error', `扫描异常: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const applyScanSuggestion = (field, value) => {
    updateSelector(field, value);
    addLog('success', `已应用选择器: ${field}`);
    // 自动切换到对应分组
    const groupMap = {
      loginPhone: 0, loginPassword: 0, loginButton: 0,
      marketSearchInput: 1, marketSearchButton: 1, marketItemCard: 1, marketItemName: 1, marketItemPrice: 1, marketItemId: 1,
      marketTotalCount: 1, marketLockedCount: 1, marketMinPrice: 1, marketMaxPrice: 1, marketTypeTab: 1,
      buyButton: 2, confirmPrice: 2, confirmButton: 2, quantityInput: 2, payPasswordInput: 2, finalPayButton: 2,
      activityItem: 3, materialItem: 3, materialName: 3, materialQuantityInput: 3, synthesisCountInput: 3, synthesisButton: 3,
      warehouseItem: 4, warehouseItemName: 4, warehouseItemCount: 4, decomposeEntry: 4, decomposeCountInput: 4, decomposeConfirmButton: 4,
      noticeItem: 5, noticeTitle: 5, noticeTime: 5, noticeLink: 5, noticeSummary: 5,
    };
    const groupIndex = groupMap[field];
    if (groupIndex !== undefined) setActiveGroup(groupIndex);
  };

  const applyAllScanSuggestions = () => {
    if (!scanResult?.discovered) return;
    let count = 0;
    for (const item of scanResult.discovered) {
      if (item.confidence === 'high' && !form.selectors[item.field]) {
        updateSelector(item.field, item.selector);
        count++;
      }
    }
    addLog('success', `已自动回填 ${count} 个高置信度选择器`);
  };

  return (
    <div className="autobot-panel">
      <div className="autobot-section">
        <h3>🏗️ 平台管理 ({platforms.length})</h3>
        <div className="autobot-toolbar">
          <button className="btn-primary" onClick={reset}>➕ 添加平台</button>
        </div>

        {platforms.length === 0 ? (
          <div className="autobot-empty">
            暂无平台配置，点击上方按钮添加<br />
            <span style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              💡 提示：用「自动扫描」功能一键获取选择器
            </span>
          </div>
        ) : (
          <div className="autobot-grid">
            {platforms.map((plat) => (
              <div key={plat.id} className="autobot-card">
                <div className="autobot-card-header">
                  <strong>{plat.name}</strong>
                  <span className="autobot-badge">{plat.key}</span>
                </div>
                <div className="autobot-card-body">
                  <div>🏠 {plat.homeUrl || '未配置首页'}</div>
                  <div>🔐 {plat.loginUrl || '未配置登录页'}</div>
                  <div>🏪 {plat.marketUrl || '未配置市场页'}</div>
                  <div>📢 {plat.noticeUrl || '未配置公告页'}</div>
                  <div>
                    🔧 选择器: {Object.values(plat.selectors || {}).filter((v) => v).length} / {Object.keys(DEFAULT_SELECTORS).length}
                  </div>
                </div>
                <div className="autobot-card-actions">
                  <button onClick={() => onEdit(plat)}>✏️ 编辑</button>
                  <button onClick={() => {
                    const blob = new Blob([JSON.stringify(plat, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `${plat.key}-config.json`; a.click();
                  }}>📤 导出</button>
                  <button onClick={() => onDelete(plat.id)}>🗑 删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="autobot-section">
        <h3>{editing ? '✏️ 编辑平台' : '➕ 添加平台'}</h3>
        <form className="autobot-form" onSubmit={submit} style={{ maxWidth: 720 }}>
          <div className="autobot-card" style={{ marginBottom: 20 }}>
            <h4 style={{ marginBottom: 16, fontSize: 14 }}>📋 基础信息</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-row"><label>平台名称 *</label><input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="如：元初" required /></div>
              <div className="form-row"><label>平台标识 *</label><input value={form.key} onChange={(e) => setForm((s) => ({ ...s, key: e.target.value }))} placeholder="如：yluc（英文，用于系统识别）" required /></div>
              <div className="form-row"><label>首页 URL</label><input value={form.homeUrl} onChange={(e) => setForm((s) => ({ ...s, homeUrl: e.target.value }))} placeholder="https://..." /></div>
              <div className="form-row"><label>登录页 URL</label><input value={form.loginUrl} onChange={(e) => setForm((s) => ({ ...s, loginUrl: e.target.value }))} placeholder="https://.../login" /></div>
              <div className="form-row"><label>市场页 URL</label><input value={form.marketUrl} onChange={(e) => setForm((s) => ({ ...s, marketUrl: e.target.value }))} placeholder="https://.../market" /></div>
              <div className="form-row"><label>仓库页 URL</label><input value={form.warehouseUrl} onChange={(e) => setForm((s) => ({ ...s, warehouseUrl: e.target.value }))} placeholder="https://.../warehouse" /></div>
              <div className="form-row"><label>活动页 URL</label><input value={form.activityUrl} onChange={(e) => setForm((s) => ({ ...s, activityUrl: e.target.value }))} placeholder="https://.../activity" /></div>
              <div className="form-row"><label>发售页 URL</label><input value={form.saleUrl} onChange={(e) => setForm((s) => ({ ...s, saleUrl: e.target.value }))} placeholder="https://.../sale" /></div>
              <div className="form-row" style={{ gridColumn: '1 / -1' }}><label>公告页 URL</label><input value={form.noticeUrl} onChange={(e) => setForm((s) => ({ ...s, noticeUrl: e.target.value }))} placeholder="https://.../notice" /></div>
            </div>
          </div>

          {/* 自动扫描区域 */}
          <div className="autobot-card" style={{ marginBottom: 20, border: '1px solid var(--accent-soft)' }}>
            <h4 style={{ marginBottom: 12, fontSize: 14, color: 'var(--accent)' }}>🔍 自动扫描选择器（实验性）</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 120px', gap: 10, alignItems: 'end' }}>
              <div className="form-row">
                <label>页面 URL</label>
                <input value={scanUrl} onChange={(e) => setScanUrl(e.target.value)} placeholder="https://h5.yluc.cn/#/pages/notice/index" />
              </div>
              <div className="form-row">
                <label>页面类型</label>
                <select value={scanType} onChange={(e) => setScanType(e.target.value)}>
                  <option value="auto">🤖 自动识别</option>
                  <option value="login">🔐 登录页</option>
                  <option value="market">🏪 市场页</option>
                  <option value="notice">📢 公告页</option>
                </select>
              </div>
              <button type="button" className="btn-primary" onClick={runScan} disabled={scanning}>
                {scanning ? '⏳ 扫描中...' : '🔍 开始扫描'}
              </button>
            </div>

            {scanResult && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                    扫描结果：<strong>{scanResult.title}</strong>（发现 {scanResult.discovered?.length || 0} 个可监控字段）
                  </div>
                  {scanResult.discovered?.length > 0 && (
                    <button type="button" className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={applyAllScanSuggestions}>
                      ⚡ 一键回填高置信度字段
                    </button>
                  )}
                </div>

                {/* 发现的字段 */}
                {scanResult.discovered?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {scanResult.discovered.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '10px 14px', borderRadius: 10,
                            border: '1px solid var(--border)',
                            background: form.selectors[item.field] ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: 10,
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: form.selectors[item.field] ? 'var(--success)' : 'var(--text)' }}>
                              {item.label}
                              {item.confidence === 'high' && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)' }}>● 高置信</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.selector}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-sub)', marginTop: 2 }}>
                              样例：{item.sample?.slice(0, 30)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => applyScanSuggestion(item.field, item.selector)}
                            style={{
                              padding: '5px 12px', borderRadius: 8, border: 'none',
                              background: form.selectors[item.field] ? 'var(--success-soft)' : 'var(--accent-soft)',
                              color: form.selectors[item.field] ? 'var(--success)' : 'var(--accent)',
                              fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                            }}
                          >
                            {form.selectors[item.field] ? '✓ 已填' : '填入'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 原始元素列表 */}
                <details>
                  <summary style={{ fontSize: 12, color: 'var(--text-sub)', cursor: 'pointer', padding: '6px 0' }}>
                    查看原始页面元素（{scanResult.elements?.length || 0} 个）
                  </summary>
                  <div style={{ maxHeight: 240, overflow: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 10, marginTop: 8 }}>
                    {scanResult.elements?.slice(0, 50).map((el, i) => (
                      <div key={i} style={{ fontSize: 11, padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 8 }}>
                        <span style={{ color: 'var(--accent)', minWidth: 60 }}>&lt;{el.tag}&gt;</span>
                        <span style={{ color: 'var(--text-sub)', minWidth: 120 }}>{el.class?.slice(0, 30) || '-'}</span>
                        <span style={{ color: 'var(--text-main)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{el.text}</span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>

          <div className="autobot-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ fontSize: 14 }}>🔧 页面元素选择器（XPath / CSS）</h4>
              <button type="button" className="btn-secondary" onClick={importFromClipboard}>📥 从剪贴板导入</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {SELECTOR_GROUPS.map((g, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveGroup(i)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: 12, background: activeGroup === i ? 'var(--accent-soft)' : 'rgba(255,255,255,0.05)',
                    color: activeGroup === i ? 'var(--accent)' : 'var(--text-sub)',
                  }}
                >
                  {g.title}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {SELECTOR_GROUPS[activeGroup].items.map((item) => (
                <div key={item.key} className="form-row">
                  <label>{item.label}</label>
                  <input
                    value={form.selectors[item.key] || ''}
                    onChange={(e) => updateSelector(item.key, e.target.value)}
                    placeholder={item.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">{editing ? '保存修改' : '添加平台'}</button>
            {editing && <button type="button" className="btn-secondary" onClick={reset}>取消</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
