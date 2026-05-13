const YlucAdapter = require('./yluc');

const ADAPTERS = {
  yluc: YlucAdapter,
  // 后续添加其他平台
  // jingtan: require('./jingtan'),
  // huanhe: require('./huanhe'),
};

function createAdapter(platformKey, config = {}) {
  const AdapterClass = ADAPTERS[platformKey];
  if (!AdapterClass) {
    throw new Error(`不支持的平台: ${platformKey}。请先在 platforms/index.js 注册适配器。`);
  }
  return new AdapterClass(config);
}

module.exports = { createAdapter, ADAPTERS };
