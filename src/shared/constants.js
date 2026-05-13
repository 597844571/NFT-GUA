export const TASK_TYPES = [
  { key: 'limited_sale', label: '限时发售', icon: '⏰', desc: '指定时间自动抢购' },
  { key: 'market_sniping', label: '市场抢单', icon: '🎯', desc: '监控市场低价自动抢单' },
  { key: 'synthesis', label: '活动合成', icon: '⚗️', desc: '按配方消耗材料合成' },
  { key: 'decomposition', label: '藏品分解', icon: '🔨', desc: '将藏品分解为材料' },
  { key: 'custom', label: '自定义任务', icon: '🔧', desc: '自定义点击/等待流程' },
];

export const PLATFORMS = [
  { key: 'yluc', label: '元初', homeUrl: 'https://m.yluc.com' },
  { key: 'jingtan', label: '鲸探', homeUrl: '' },
  { key: 'huanhe', label: '幻核', homeUrl: '' },
  { key: 'xmeta', label: 'X Meta', homeUrl: '' },
  { key: 'custom', label: '自定义平台', homeUrl: '' },
];

export const DEFAULT_SETTINGS = {
  randomDelayMin: 0.5,
  randomDelayMax: 2.0,
  headless: false,
  screenshotOnSuccess: true,
  soundNotify: true,
  popupNotify: true,
  autoRestart: true,
  browser: 'chromium',
  userDataDir: '',
  proxy: '',
  monitorRefreshMs: 2000, // 监控刷新间隔（毫秒）
  maxConcurrency: 3,
};
