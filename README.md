# ChatGPT Default Thinking Extended Userscript

一个用于 ChatGPT 网页端的轻量 userscript。它会在新建对话页加载后，通过页面上可见的模型选择器，尝试自动选择 `Thinking -> Extended`。脚本只模拟你账号界面里已经可见、已授权的 UI 操作，不拦截请求，不修改 ChatGPT 后台接口 payload。

[English README](README.en.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Firefox-lightgrey.svg)
![Userscript](https://img.shields.io/badge/userscript-Tampermonkey%20%7C%20Violentmonkey-orange.svg)
![ChatGPT](https://img.shields.io/badge/target-ChatGPT-10A37F.svg)
![Version](https://img.shields.io/badge/version-0.2.0-6366f1.svg)

---

## 一分钟安装

推荐先安装一个 userscript 管理器：

- [Tampermonkey](https://www.tampermonkey.net/)
- [Violentmonkey](https://violentmonkey.github.io/)

然后点击 GitHub Raw 安装链接：

- [安装 chatgpt-default-thinking-extended.user.js](https://raw.githubusercontent.com/zouchenzhen/chatgpt-default-thinking-extended-userscript/main/chatgpt-default-thinking-extended.user.js)

安装后刷新 `https://chatgpt.com/` 的新建对话页。脚本会在页面加载后等待模型按钮出现，然后只执行一次自动选择。

## 功能

- 在 ChatGPT 新建对话页尝试自动选择 `Thinking -> Extended`。
- 每次页面加载只触发一次，不监听 DOM 变化，不反复抢 UI。
- 先悬停 `Thinking` 行，再尝试点击右侧隐藏的设置按钮以展开 `Standard / Extended`。
- 如果当前页面没有出现 `Extended`，脚本会退化为选择 `Thinking` 后退出。
- 不修改 `fetch`、`XMLHttpRequest`、`backend-api` 或任何未公开接口请求体。

## 为什么需要这个脚本

部分 ChatGPT 账号的新建对话会默认回到 `Instant`。即使上一次对话手动选择了 `Thinking -> Extended`，新对话也可能不会沿用该选择。

这个脚本解决的是一个很窄的问题：在网页端新建对话时，减少重复点击模型菜单的操作。它不是模型解锁工具，也不是额度绕过工具。

## 工作原理

脚本采用保守的 UI 自动化流程：

1. 只在 `chatgpt.com` 和 `chat.openai.com` 页面运行。
2. 只在新建对话路由上尝试执行。
3. 页面加载后等待模型选择按钮出现。
4. 打开模型菜单。
5. 查找 `Thinking` 菜单项。
6. 悬停 `Thinking` 行，尝试点击右侧设置按钮。
7. 如果出现 `Extended`，点击它。
8. 如果没有出现 `Extended`，选择 `Thinking` 后退出。

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
| 目标 | 切换任意模型 | 新对话默认选 `Thinking -> Extended` |
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
  targetModel: 'Thinking',
  targetThinkingTime: 'Extended',
  applyOnlyOnNewChat: true,
  startDelayMs: 1500,
  waitForPickerMs: 7000,
  pollDelayMs: 250,
  debug: false,
};
```

常用调整：

- 如果页面加载慢，增大 `waitForPickerMs`。
- 如果想在非新建对话页也触发，改成 `applyOnlyOnNewChat: false`。
- 如果需要调试选择器，改成 `debug: true` 后查看浏览器控制台。

## 常见问题

### 为什么只选到了 Thinking，没有选到 Extended？

ChatGPT 当前 UI 需要先悬停 `Thinking` 行，右侧隐藏设置按钮出现后再点击，才会展开 `Standard / Extended`。脚本已经按这个交互尝试处理，但如果页面 DOM 或按钮标签变了，可能需要更新选择器。

### 为什么不直接绕过 UI 改后台请求？

ChatGPT 网页端后台接口不是公开 API。直接改 payload 容易随版本变化失效，也可能触碰账号权限、组织策略和风控边界。本脚本只做可见 UI 自动化。

### 为什么脚本只执行一次？

早期版本使用 DOM 监听，容易在页面更新时反复打开菜单，影响正常输入。当前版本改成页面加载后一次性执行。

### 支持 ChatGPT for Teachers / Plus / Business 吗？

只要账号页面上能手动看到并选择 `Thinking -> Extended`，脚本就有机会工作。不同账号、组织策略和灰度 UI 可能不同。

## 发布渠道

- GitHub Raw：适合直接安装和自动更新。
- Greasy Fork：计划发布。
- OpenUserJS：计划发布。

## 版本

- 当前版本：`0.2.0`
- 更新时间：`2026-06-08`

## 许可证

[MIT License](LICENSE)
