const GenericAdapter = require('./generic');
const YlucAdapter = require('./yluc');

// 保留原有适配器作为兼容，新平台全部走 GenericAdapter
const LEGACY_ADAPTERS = {
  yluc: YlucAdapter,
};

function createAdapter(platformKey, config = {}) {
  // 如果有 legacy 适配器且用户没有配置选择器，使用 legacy
  const LegacyClass = LEGACY_ADAPTERS[platformKey];
  if (LegacyClass && !config.selectors) {
    return new LegacyClass(config);
  }
  // 否则走通用适配器（配置驱动）
  return new GenericAdapter(config);
}

module.exports = { createAdapter, LEGACY_ADAPTERS };
