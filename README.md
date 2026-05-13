# DC AutoBot 数字藏品自动化工具

## 功能概述

- **限时发售抢购**：定时自动抢购指定藏品
- **市场低价抢单**：持续监控市场，低于设定价格自动抢单
- **活动合成**：按配方自动消耗材料合成
- **藏品分解**：自动分解藏品获取材料
- **实时监控中心**：监控藏品价格变化，触发提醒+一键抢单
- **多账号管理**：支持多平台、多账号分组管理
- **Excel 导入导出**：账号数据支持 Excel/JSON 导入导出

## 技术栈

- **前端**：React + Vite
- **桌面端**：Electron
- **浏览器自动化**：Playwright（内置 Chromium，无需额外安装 Chrome）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

安装过程中会自动下载 Playwright 所需的 Chromium 浏览器。

### 2. 开发模式

```bash
npm run dev
```

这会同时启动 Vite 前端开发服务器和 Electron 窗口。

### 3. 打包成 exe

```bash
npm run build
```

打包后的安装程序位于 `release/` 目录下。

## 使用流程

1. **添加账号**：在"账号管理"页添加你的平台账号（手机号、密码）
2. **创建任务**：在"任务管理"页选择任务类型并填写参数
3. **添加监控**（可选）：在"监控中心"添加要实时监控的藏品
4. **启动引擎**：在"运行控制"页点击"启动引擎"
5. **观察日志**：实时查看浏览器操作日志

## 平台适配器开发

当前已提供 **元初(yluc)** 平台的适配器模板，位于 `src/main/platforms/yluc.js`。

**如何适配新平台：**

1. 复制 `src/main/platforms/template.js`（如果没有，复制 yluc.js 改名）
2. 修改 `name` 和 `urls`
3. 使用 Playwright Codegen 获取 XPath：
   ```bash
   npx playwright codegen https://你的平台网址
   ```
4. 在 `src/main/platforms/index.js` 中注册新适配器
5. 在前端 `src/shared/constants.js` 的 `PLATFORMS` 中添加平台选项

## 重要提示

- **密码安全**：密码存储在本地 localStorage 中，不会上传到任何服务器
- **风控建议**：
  - 首次使用请用小号测试
  - 建议设置随机延时（0.5~2秒）
  - 不要设置过短的监控刷新间隔（建议 500ms 以上）
- **浏览器可见性**：默认显示浏览器窗口，可在设置中开启无头模式

## 项目结构

```
DC-AutoBot/
├── main.js                 # Electron 主进程
├── preload.js              # 安全预加载脚本
├── src/
│   ├── main/               # 后端引擎（Node.js + Playwright）
│   │   ├── engine.js       # 核心引擎（任务调度 + 监控中心）
│   │   ├── logger.js       # 日志系统
│   │   └── platforms/      # 平台适配器
│   ├── renderer/           # 前端（React）
│   │   ├── components/     # 页面组件
│   │   ├── hooks/          # 状态管理
│   │   └── styles/         # 样式
│   └── shared/             # 共享常量
└── dist / dist-electron    # 构建输出
```

## 监控中心说明

监控中心支持两种模式：
- **手动模式**：价格达到阈值时弹窗+声音提醒，用户点击"立即抢单"
- **自动模式**：价格达到阈值时自动执行抢单（需勾选"达到阈值自动抢单"）

刷新间隔可在"全局设置"中调整（默认 2000ms，最小 20ms）。
