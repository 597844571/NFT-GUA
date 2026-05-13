import { useState } from 'react';
import { TASK_TYPES } from '@shared/constants';

const DEFAULT_PARAMS = {
  limited_sale: { keyword: '', startTime: '', quantity: 1 },
  market_sniping: { keyword: '', maxPrice: '', quantity: 1 },
  synthesis: { activityName: '', materials: [{ name: '', quantity: 1 }], synthesisCount: 1 },
  decomposition: { targetName: '', outputs: [{ name: '', quantity: 1 }, { name: '', quantity: 1 }], decomposeCount: 1 },
  custom: { description: '', steps: [{ action: 'click', target: '' }] },
};

export default function TaskManager({ accounts, tasks, setTasks, platforms, addLog }) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ type: 'limited_sale', name: '', platform: 'yluc', accountIds: [], params: { ...DEFAULT_PARAMS.limited_sale }, priority: 1, enabled: true });

  const resetForm = (type = 'limited_sale') => {
    setForm({ type, name: '', platform: 'yluc', accountIds: [], params: { ...DEFAULT_PARAMS[type] }, priority: 1, enabled: true });
    setStep(1); setEditingId(null);
  };

  const openWizard = (type = 'limited_sale') => { resetForm(type); setWizardOpen(true); };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = { ...form, id: editingId || `task-${Date.now()}` };
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === payload.id);
      if (exists) return prev.map((t) => (t.id === payload.id ? payload : t));
      return [payload, ...prev];
    });
    addLog('success', editingId ? `任务已更新: ${payload.name}` : `任务已创建: ${payload.name}`);
    setWizardOpen(false); resetForm();
  };

  const onEdit = (task) => {
    setEditingId(task.id);
    setForm({ type: task.type, name: task.name, platform: task.platform, accountIds: task.accountIds || [], params: { ...DEFAULT_PARAMS[task.type], ...task.params }, priority: task.priority || 1, enabled: task.enabled ?? true });
    setStep(3); setWizardOpen(true);
  };

  const onDelete = (id) => { if (!window.confirm('确定删除该任务？')) return; setTasks((prev) => prev.filter((t) => t.id !== id)); addLog('warn', '任务已删除'); };
  const onToggle = (id) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)));

  const typeLabel = (k) => TASK_TYPES.find((t) => t.key === k)?.label || k;
  const typeIcon = (k) => TASK_TYPES.find((t) => t.key === k)?.icon || '📋';

  const updateParam = (key, value) => setForm((s) => ({ ...s, params: { ...s.params, [key]: value } }));
  const updateMaterial = (idx, field, value) => setForm((s) => { const mats = [...(s.params.materials || [])]; mats[idx] = { ...mats[idx], [field]: value }; return { ...s, params: { ...s.params, materials: mats } }; });
  const addMaterial = () => setForm((s) => ({ ...s, params: { ...s.params, materials: [...(s.params.materials || []), { name: '', quantity: 1 }] } }));
  const removeMaterial = (idx) => setForm((s) => ({ ...s, params: { ...s.params, materials: (s.params.materials || []).filter((_, i) => i !== idx) } }));
  const updateOutput = (idx, field, value) => setForm((s) => { const outs = [...(s.params.outputs || [])]; outs[idx] = { ...outs[idx], [field]: value }; return { ...s, params: { ...s.params, outputs: outs } }; });

  const renderParams = () => {
    const { type, params } = form;
    switch (type) {
      case 'limited_sale': return (
        <>
          <div className="form-row"><label>藏品名称 *</label><input value={params.keyword || ''} onChange={(e) => updateParam('keyword', e.target.value)} placeholder="如：元力胶囊" required /></div>
          <div className="form-row"><label>开始时间 *</label><input type="datetime-local" value={params.startTime || ''} onChange={(e) => updateParam('startTime', e.target.value)} required /></div>
          <div className="form-row"><label>抢购数量</label><input type="number" min={1} max={99} value={params.quantity || 1} onChange={(e) => updateParam('quantity', Number(e.target.value))} /></div>
        </>);
      case 'market_sniping': return (
        <>
          <div className="form-row"><label>藏品名称 *</label><input value={params.keyword || ''} onChange={(e) => updateParam('keyword', e.target.value)} placeholder="如：元力胶囊" required /></div>
          <div className="form-row"><label>最高可接受价格 *</label><input type="number" step="0.01" value={params.maxPrice || ''} onChange={(e) => updateParam('maxPrice', e.target.value)} placeholder="5.00" required /></div>
          <div className="form-row"><label>抢单数量</label><input type="number" min={1} max={99} value={params.quantity || 1} onChange={(e) => updateParam('quantity', Number(e.target.value))} /></div>
        </>);
      case 'synthesis': return (
        <>
          <div className="form-row"><label>活动名称 *</label><input value={params.activityName || ''} onChange={(e) => updateParam('activityName', e.target.value)} placeholder="如：五一合成活动" required /></div>
          <div className="form-row"><label>合成材料</label>{(params.materials || []).map((m, i) => (
            <div key={i} className="form-inline-row">
              <input value={m.name} onChange={(e) => updateMaterial(i, 'name', e.target.value)} placeholder="藏品名称" />
              <input type="number" min={1} value={m.quantity} onChange={(e) => updateMaterial(i, 'quantity', Number(e.target.value))} style={{ width: 80 }} />
              <button type="button" className="btn-icon-sm" onClick={() => removeMaterial(i)}>✕</button>
            </div>
          ))}<button type="button" className="btn-secondary" onClick={addMaterial}>+ 添加材料</button></div>
          <div className="form-row"><label>合成数量</label><input type="number" min={1} value={params.synthesisCount || 1} onChange={(e) => updateParam('synthesisCount', Number(e.target.value))} /></div>
        </>);
      case 'decomposition': return (
        <>
          <div className="form-row"><label>目标藏品 *</label><input value={params.targetName || ''} onChange={(e) => updateParam('targetName', e.target.value)} placeholder="要分解的藏品名称" required /></div>
          <div className="form-row"><label>分解产物 A</label><div className="form-inline-row"><input value={params.outputs?.[0]?.name || ''} onChange={(e) => updateOutput(0, 'name', e.target.value)} placeholder="产物名称" /><input type="number" min={1} value={params.outputs?.[0]?.quantity || 1} onChange={(e) => updateOutput(0, 'quantity', Number(e.target.value))} style={{ width: 80 }} /></div></div>
          <div className="form-row"><label>分解产物 B</label><div className="form-inline-row"><input value={params.outputs?.[1]?.name || ''} onChange={(e) => updateOutput(1, 'name', e.target.value)} placeholder="产物名称（可选）" /><input type="number" min={1} value={params.outputs?.[1]?.quantity || 1} onChange={(e) => updateOutput(1, 'quantity', Number(e.target.value))} style={{ width: 80 }} /></div></div>
          <div className="form-row"><label>分解套数</label><input type="number" min={1} value={params.decomposeCount || 1} onChange={(e) => updateParam('decomposeCount', Number(e.target.value))} /></div>
        </>);
      default: return <div className="autobot-hint">自定义任务需在生成的脚本中手动编辑操作步骤</div>;
    }
  };

  return (
    <div className="autobot-panel">
      <div className="autobot-section">
        <h3>📋 任务列表 ({tasks.length})</h3>
        <div className="autobot-toolbar"><button className="btn-primary" onClick={() => openWizard()}>➕ 新建任务</button></div>
        {tasks.length === 0 ? <div className="autobot-empty">暂无任务，点击上方按钮创建</div> : (
          <div className="autobot-list">
            {tasks.map((task) => (
              <div key={task.id} className={`autobot-card ${!task.enabled ? 'disabled' : ''}`}>
                <div className="autobot-card-header">
                  <strong>{typeIcon(task.type)} {task.name}</strong>
                  <span className="autobot-badge">{typeLabel(task.type)}</span>
                  <span className="autobot-badge">{(platforms || []).find((p) => p.key === task.platform)?.name || task.platform}</span>
                </div>
                <div className="autobot-card-body">
                  <div>👤 执行账号: {(task.accountIds || []).length} 个</div>
                  {task.params?.keyword && <div>🔍 关键词: {task.params.keyword}</div>}
                  {task.params?.startTime && <div>⏰ 时间: {new Date(task.params.startTime).toLocaleString()}</div>}
                  {task.params?.maxPrice && <div>💰 最高价: ¥{task.params.maxPrice}</div>}
                  {task.params?.quantity && <div>📦 数量: {task.params.quantity}</div>}
                  {task.params?.activityName && <div>⚗️ 活动: {task.params.activityName}</div>}
                  {task.params?.targetName && <div>🔨 分解: {task.params.targetName}</div>}
                </div>
                <div className="autobot-card-actions">
                  <button onClick={() => onToggle(task.id)}>{task.enabled ? '⏸ 停用' : '▶ 启用'}</button>
                  <button onClick={() => onEdit(task)}>✏️ 编辑</button>
                  <button onClick={() => onDelete(task.id)}>🗑 删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {wizardOpen && (
        <div className="autobot-modal-overlay" onClick={() => setWizardOpen(false)}>
          <div className="autobot-modal" onClick={(e) => e.stopPropagation()}>
            <div className="autobot-modal-head"><h3>{editingId ? '✏️ 编辑任务' : '➕ 新建任务'}</h3><button onClick={() => setWizardOpen(false)}>✕</button></div>
            <div className="autobot-wizard-steps"><span className={step >= 1 ? 'active' : ''}>1.选择类型</span><span className={step >= 2 ? 'active' : ''}>2.基础信息</span><span className={step >= 3 ? 'active' : ''}>3.任务参数</span></div>
            <form onSubmit={onSubmit}>
              {step === 1 && (
                <div className="autobot-type-grid">
                  {TASK_TYPES.map((t) => (
                    <div key={t.key} className={`autobot-type-card ${form.type === t.key ? 'selected' : ''}`} onClick={() => { resetForm(t.key); setForm((s) => ({ ...s, type: t.key })); }}>
                      <div className="autobot-type-icon">{t.icon}</div>
                      <div className="autobot-type-label">{t.label}</div>
                      <div className="autobot-type-desc">{t.desc}</div>
                    </div>
                  ))}
                </div>
              )}
              {step === 2 && (
                <>
                  <div className="form-row"><label>任务名称 *</label><input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="给任务起个名字" required /></div>
                  <div className="form-row"><label>目标平台 *</label><select value={form.platform} onChange={(e) => setForm((s) => ({ ...s, platform: e.target.value }))}>{PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
                  <div className="form-row"><label>执行账号</label><div className="autobot-account-select">{accounts.length === 0 ? <span className="autobot-hint">请先添加账号</span> : accounts.map((acc) => (
                    <label key={acc.id} className="autobot-check-label"><input type="checkbox" checked={form.accountIds.includes(acc.id)} onChange={(e) => { const ids = new Set(form.accountIds); if (e.target.checked) ids.add(acc.id); else ids.delete(acc.id); setForm((s) => ({ ...s, accountIds: Array.from(ids) })); }} />{acc.name || acc.phone}</label>
                  ))}</div></div>
                  <div className="form-row"><label>优先级</label><input type="number" min={1} max={10} value={form.priority} onChange={(e) => setForm((s) => ({ ...s, priority: Number(e.target.value) }))} /></div>
                </>
              )}
              {step === 3 && renderParams()}
              <div className="form-actions">
                {step > 1 && <button type="button" className="btn-secondary" onClick={() => setStep((s) => s - 1)}>上一步</button>}
                {step < 3 ? <button type="button" className="btn-primary" onClick={() => setStep((s) => s + 1)}>下一步</button> : <button type="submit" className="btn-primary">{editingId ? '保存修改' : '创建任务'}</button>}
                <button type="button" className="btn-secondary" onClick={() => setWizardOpen(false)}>取消</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
