# ChatGPT Default Thinking Extended Userscript

一个用于 ChatGPT 网页端的轻量 userscript。它会在新建对话页加载后，通过页面上可见的模型选择器，自动选择 `GPT-5.6 Sol` 与最高可用思考强度（优先 `Extra High`，否则选择 `High / 高`）。脚本只模拟你账号界面里已经可见、已授权的 UI 操作，不拦截请求，不修改 ChatGPT 后台接口 payload。

[English README](README.en.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Firefox-lightgrey.svg)
![Userscript](https://img.shields.io/badge/userscript-Tampermonkey%20%7C%20Violentmonkey-orange.svg)
![ChatGPT](https://img.shields.io/badge/target-ChatGPT-10A37F.svg)
![Version](https://img.shields.io/badge/version-0.4.1-6366f1.svg)

---

## 一分钟安装

推荐先安装一个 userscript 管理器：

- [Tampermonkey](https://www.tampermonkey.net/)
- [Violentmonkey](https://violentmonkey.github.io/)

然后点击 GitHub Raw 安装链接：

- [安装 chatgpt-default-thinking-extended.user.js](https://raw.githubusercontent.com/zouchenzhen/chatgpt-default-thinking-extended-userscript/main/chatgpt-default-thinking-extended.user.js)

安装后刷新 `https://chatgpt.com/` 的新建对话页。脚本会在页面加载后等待模型按钮出现，然后只执行一次自动选择。

## 功能

- 在 ChatGPT 新建对话页自动选择 `GPT-5.6 Sol` 与最高可用思考强度。
- 每次页面加载只启动一轮选择；如果 ChatGPT 界面仍在加载，会有限重试三次，不持续监听 DOM。
- 兼容新版英文和中文两级入口：`Instant / 极速` 按钮 → `Advanced / 高级` → `Model / 模型` 与 `Effort / 推理强度`。
- 优先选择 `Extra High`；当前 K12 / Teachers 界面没有该档位时选择 `High / 高`。
- 保留旧版 `Thinking -> Extended` 菜单作为兼容兜底。
- 不修改 `fetch`、`XMLHttpRequest`、`backend-api` 或任何未公开接口请求体。

## 为什么需要这个脚本

这个脚本来自我自己的 K12 / ChatGPT for Teachers 账号使用场景：新建对话会默认回到 `Instant / 极速`，不会保存上一次对话里的选择。每次都需要手动打开菜单，切换到旗舰模型 `GPT-5.6 Sol`，再选择最高可用思考强度。

这个脚本解决的是一个很窄的问题：在网页端新建对话时，减少重复点击模型菜单的操作。它不是模型解锁工具，也不是额度绕过工具。

## 工作原理

它属于**基于 DOM 定位的可见 UI 自动化**，可以理解为“脚本找到网页按钮后，模拟用户在网页里的悬停与点击”。它不会移动操作系统里的真实鼠标指针，也不是通过截图识别坐标盲点；更不会直接修改 ChatGPT 发往服务器的模型参数。

具体实现分为两部分：

- **定位 UI 元素**：读取当前可见元素的文字、`aria-label`、`aria-haspopup`、`role`、`data-testid` 和屏幕位置，识别输入框附近的模型选择按钮、模型菜单行以及思考强度选项。中英文标签和部分新版 DOM 变体都包含在匹配规则中。
- **触发 UI 操作**：先用 `scrollIntoView()` 保证元素可见，再根据 `getBoundingClientRect()` 和 `document.elementFromPoint()` 找到实际点击目标，依次派发 `pointermove → mousemove → pointerdown → mousedown → pointerup → mouseup → click` 事件。需要展开子菜单时还会派发悬停事件，并用 `ArrowRight / Enter / Space` 作为键盘兜底。

这里的“模拟点击”是浏览器页面内部的合成 DOM 事件，不会占用或移动你的物理鼠标。之所以不只调用简单的 `element.click()`，是因为 ChatGPT 的 React 菜单可能依赖完整的 pointer/mouse 事件链和悬停状态。

完整流程如下：

1. 只在 `chatgpt.com` 和 `chat.openai.com` 页面运行。
2. 只在新建对话路由上尝试执行。
3. 页面加载后等待模型选择按钮出现。
4. 打开输入框右侧的速度/模型按钮（如 `Instant / 极速`）。
5. 进入 `Advanced / 高级`，再打开 `Model / 模型` 并选择 `GPT-5.6 Sol`。
6. 模型选择使菜单关闭后，重新打开 `Advanced / 高级`，进入 `Effort / 推理强度`。
7. 按优先级选择 `Extra High / Very High / Maximum / 最高 / 极高 / 超高`。
8. 如果账号未开放上述档位，选择 `High / 高`；旧 UI 则尝试 `Thinking -> Extended`。

如果 ChatGPT 的客户端界面仍在渲染，脚本会间隔一秒有限重试，最多三次。成功或重试结束后即停止，不会常驻扫描页面或持续抢占菜单。

### 它不是什么

- 不是操作系统级鼠标宏，不使用固定的绝对屏幕坐标。
- 不是截图识别或 OCR；页面缩放和窗口大小主要通过 DOM 几何位置适配。
- 不是接口注入；不拦截 `fetch`、`XMLHttpRequest`，也不改写后台请求 payload。
- 不是模型解锁工具；只有菜单中当前可见、账号有权点击的选项才能被选择。

## 安全边界

本仓库刻意不做以下事情：

- 不绕过 ChatGPT 的账号权限、订阅等级、组织策略或使用额度。
- 不调用未公开的 ChatGPT 后台接口来强行切换模型。
- 不读取、保存或上传你的聊天内容。
- 不使用远程脚本加载器。
- 不向第三方服务器发送数据。

由于 ChatGPT 网页端 DOM 会随时变化，脚本可能需要随页面结构更新而调整选择器。

## 与旧版 model switcher 的区别

很多旧 userscript 会修改请求体、注入旧模型 ID，或者尝试访问当前账号并未授权的模型。这样的方式维护成本高，也容易触发异常。

本脚本的目标更保守：

| 维度 | 旧 model switcher | 本脚本 |
|---|---|---|
| 核心方式 | 修改请求或注入模型 ID | 模拟可见 UI 点击 |
| 权限边界 | 可能尝试不可用模型 | 只选择页面已有选项 |
| 目标 | 切换任意模型 | 新对话默认选 `GPT-5.6 Sol` 和最高可用思考强度 |
| 触发方式 | 常驻监听或拦截请求 | 页面加载后一次性执行 |
| 风险 | 易失效、易触发异常 | 仍可能因 DOM 改版失效，但边界更清楚 |

## 仓库结构

```text
.
├── chatgpt-default-thinking-extended.user.js
├── CHANGELOG.md
├── LICENSE
├── README.md
└── README.en.md
```

## 配置

脚本顶部的 `CONFIG` 可以手动调整：

```javascript
const CONFIG = {
  targetModel: 'GPT-5.6 Sol',
  targetModelAliases: ['GPT-5.6 Sol', 'GPT‑5.6 Sol'],
  targetModelFamilyAliases: ['GPT-5.6 Sol', 'GPT‑5.6 Sol', 'GPT-5.6', 'GPT‑5.6'],
  targetThinkingTime: 'Extra High',
  targetThinkingTimeAliases: ['Extra High', 'Very High', 'Maximum', 'Max', '最高', '极高', '極高', '超高', 'High', '高'],
  legacyModelAliases: ['Thinking', '思考'],
  legacyThinkingTimeAliases: ['Extended', '进阶', '进阶思考', '高级思考', '扩展'],
  allowRiskyRightEdgeClick: false,
  applyOnlyOnNewChat: true,
  maxAttempts: 3,
  retryDelayMs: 1000,
  startDelayMs: 1500,
  waitForPickerMs: 7000,
  pollDelayMs: 250,
  debug: false,
};
```

常用调整：

- 如果页面加载慢，增大 `waitForPickerMs`。
- 如果想在非新建对话页也触发，改成 `applyOnlyOnNewChat: false`。
- 如果要更改思考强度优先级，调整 `targetThinkingTimeAliases` 的排列顺序；脚本选择第一个可见项。
- 如果你的界面只能靠点击行最右侧展开子菜单，可以尝试 `allowRiskyRightEdgeClick: true`。
- 如果需要调试选择器，改成 `debug: true` 后查看浏览器控制台。

## 常见问题

### 为什么只选择了 High / 高，没有选择 Extra High？

脚本只能选择当前账号菜单里实际可见的档位。它会优先寻找 `Extra High / 最高 / 极高 / 超高`，若工作区只提供截图中的 `Instant / Medium / High`（中文为 `极速 / 中 / 高`），就选择其中最强的 `High / 高`。

### 为什么不直接绕过 UI 改后台请求？

ChatGPT 网页端后台接口不是公开 API。直接改 payload 容易随版本变化失效，也可能触碰账号权限、组织策略和风控边界。本脚本只做可见 UI 自动化。

### 为什么脚本只执行一次？

早期版本使用 DOM 监听，容易在页面更新时反复打开菜单，影响正常输入。当前版本改成页面加载后一次性执行。

### 支持 ChatGPT for Teachers / Plus / Business 吗？

只要账号页面上能手动看到并选择目标模型和思考强度，脚本就有机会工作。不同账号、组织策略和灰度 UI 可能不同；脚本不会解锁被隐藏或禁用的选项。

## 发布渠道

- GitHub Raw：适合直接安装和自动更新。
- GitHub Gist：适合作为备用安装来源。
- Greasy Fork：需要登录 Greasy Fork 后通过 prefill/网页表单提交。
- OpenUserJS：需要登录 OpenUserJS 后通过网页导入/发布。

当前已发布：

- GitHub 仓库：<https://github.com/zouchenzhen/chatgpt-default-thinking-extended-userscript>
- GitHub Raw：<https://raw.githubusercontent.com/zouchenzhen/chatgpt-default-thinking-extended-userscript/main/chatgpt-default-thinking-extended.user.js>
- GitHub Gist：<https://gist.github.com/zouchenzhen/3c4b41481c53542047df5cdb3d053bad>

## 社区

[LINUX DO — 中文开发者社区](https://linux.do/)

本项目认可并感谢 LINUX DO 社区在中文开发者开源交流、项目分享和技术讨论中的价值。除非社区另有明确说明，此处仅为社区致谢和链接，不代表官方背书。

## 版本

- 当前版本：`0.4.1`
- 更新时间：`2026-08-15`

## 许可证

[MIT License](LICENSE)
