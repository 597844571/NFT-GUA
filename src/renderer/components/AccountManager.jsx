import { useState } from 'react';
import { api } from '../api';
import { PLATFORMS } from '@shared/constants';

export default function AccountManager({ accounts, setAccounts, platforms, addLog }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', platform: 'yluc', phone: '', loginPassword: '', payPassword: '',
    defaultQuantity: 1, enabled: true, tags: '', note: '',
  });

  const reset = () => {
    setEditing(null);
    setForm({ name: '', platform: 'yluc', phone: '', loginPassword: '', payPassword: '', defaultQuantity: 1, enabled: true, tags: '', note: '' });
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.phone.trim()) return;
    const payload = { ...form, id: editing || `acc-${Date.now()}`, tags: form.tags.split(/[,，]/).map((s) => s.trim()).filter(Boolean) };
    setAccounts((prev) => {
      const exists = prev.find((a) => a.id === payload.id);
      if (exists) return prev.map((a) => (a.id === payload.id ? payload : a));
      return [payload, ...prev];
    });
    addLog('success', editing ? `账号已更新: ${payload.name || payload.phone}` : `账号已添加: ${payload.name || payload.phone}`);
    reset();
  };

  const onEdit = (acc) => { setEditing(acc.id); setForm({ ...acc, tags: (acc.tags || []).join(', ') }); };
  const onDelete = (id) => { if (!window.confirm('确定删除该账号？')) return; setAccounts((prev) => prev.filter((a) => a.id !== id)); addLog('warn', '账号已删除'); };
  const onToggle = (id) => setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(accounts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `accounts-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
    addLog('info', '账号 JSON 已导出');
  };

  const importJson = async () => {
    const res = await api.importConfig();
    if (res.success && Array.isArray(res.data.accounts)) {
      setAccounts(res.data.accounts);
      addLog('success', `已导入 ${res.data.accounts.length} 个账号`);
    }
  };

  const exportExcel = async () => {
    await api.exportExcel({ accounts });
    addLog('info', '账号 Excel 已导出');
  };

  const importExcel = async () => {
    const res = await api.importExcel();
    if (res.success && Array.isArray(res.data)) {
      const mapped = res.data.map((row, i) => ({
        id: `acc-import-${Date.now()}-${i}`,
        name: row['名称'] || row['name'] || '',
        platform: row['平台'] || row['platform'] || 'yluc',
        phone: String(row['手机号'] || row['phone'] || ''),
        loginPassword: String(row['登录密码'] || row['loginPassword'] || ''),
        payPassword: String(row['支付密码'] || row['payPassword'] || ''),
        defaultQuantity: Number(row['默认数量'] || row['defaultQuantity'] || 1),
        enabled: true,
        tags: [],
        note: row['备注'] || row['note'] || '',
      })).filter((a) => a.phone);
      setAccounts((prev) => [...mapped, ...prev]);
      addLog('success', `已导入 ${mapped.length} 个账号`);
    }
  };

  return (
    <div className="autobot-panel">
      <div className="autobot-section">
        <h3>📋 账号列表 ({accounts.length})</h3>
        <div className="autobot-toolbar">
          <button className="btn-primary" onClick={reset}>➕ 新增账号</button>
          <button className="btn-secondary" onClick={importJson}>📥 导入 JSON</button>
          <button className="btn-secondary" onClick={exportJson} disabled={!accounts.length}>📤 导出 JSON</button>
          <button className="btn-secondary" onClick={importExcel}>📥 导入 Excel</button>
          <button className="btn-secondary" onClick={exportExcel} disabled={!accounts.length}>📤 导出 Excel</button>
        </div>

        {accounts.length === 0 ? (
          <div className="autobot-empty">暂无账号，点击上方按钮添加</div>
        ) : (
          <div className="autobot-list">
            {accounts.map((acc) => (
              <div key={acc.id} className={`autobot-card ${!acc.enabled ? 'disabled' : ''}`}>
                <div className="autobot-card-header">
                  <strong>{acc.name || acc.phone}</strong>
                  <span className="autobot-badge">{(platforms || []).find((p) => p.key === acc.platform)?.name || acc.platform}</span>
                  {acc.tags?.map((t) => <span key={t} className="autobot-tag">{t}</span>)}
                </div>
                <div className="autobot-card-body">
                  <div>📱 {acc.phone}</div>
                  <div>🔢 默认数量: {acc.defaultQuantity}</div>
                  {acc.note && <div className="autobot-note">📝 {acc.note}</div>}
                </div>
                <div className="autobot-card-actions">
                  <button onClick={() => onToggle(acc.id)}>{acc.enabled ? '⏸ 停用' : '▶ 启用'}</button>
                  <button onClick={() => onEdit(acc)}>✏️ 编辑</button>
                  <button onClick={() => onDelete(acc.id)}>🗑 删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="autobot-section">
        <h3>{editing ? '✏️ 编辑账号' : '➕ 新增账号'}</h3>
        <form className="autobot-form" onSubmit={submit}>
          <div className="form-row"><label>名称</label><input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="如：主力号" /></div>
          <div className="form-row"><label>平台 *</label>
            <select value={form.platform} onChange={(e) => setForm((s) => ({ ...s, platform: e.target.value }))}>
              {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div className="form-row"><label>手机号 *</label><input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} placeholder="13800138000" required /></div>
          <div className="form-row"><label>登录密码</label><input type="password" value={form.loginPassword} onChange={(e) => setForm((s) => ({ ...s, loginPassword: e.target.value }))} /></div>
          <div className="form-row"><label>支付密码</label><input type="password" value={form.payPassword} onChange={(e) => setForm((s) => ({ ...s, payPassword: e.target.value }))} /></div>
          <div className="form-row"><label>默认抢购数量</label><input type="number" min={1} max={99} value={form.defaultQuantity} onChange={(e) => setForm((s) => ({ ...s, defaultQuantity: Number(e.target.value) }))} /></div>
          <div className="form-row"><label>标签</label><input value={form.tags} onChange={(e) => setForm((s) => ({ ...s, tags: e.target.value }))} placeholder="主力号, 小号（逗号分隔）" /></div>
          <div className="form-row"><label>备注</label><input value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} /></div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{editing ? '保存修改' : '添加账号'}</button>
            {editing && <button type="button" className="btn-secondary" onClick={reset}>取消</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
