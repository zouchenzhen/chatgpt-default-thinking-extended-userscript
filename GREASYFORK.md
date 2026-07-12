# ChatGPT 默认最强模型与思考模式

## 功能

新建 ChatGPT 对话时，通过网页端可见模型选择器，自动选择 `GPT-5.6 Sol` 与最高可用思考强度（优先 `Extra High`，当前 K12 界面回退为 `High / 高`）。脚本每次页面加载只执行一次，不会持续监听 DOM，也不会反复抢占 UI。

`0.3.0` 已适配 2026 年 7 月新版二维菜单，并保留旧版 `Thinking -> Extended` 界面兜底。

脚本只操作账号当前可见且有权限选择的菜单项，不会绕过套餐或工作区限制。

## 安全边界

- 不绕过 ChatGPT 账号权限、订阅等级、组织策略或使用额度。
- 不拦截 `fetch`、`XMLHttpRequest` 或 `backend-api` 请求体。
- 不读取、保存或上传聊天内容。
- 不加载远程执行代码。

## 源码

GitHub: <https://github.com/zouchenzhen/chatgpt-default-thinking-extended-userscript>

安装 / 更新源: <https://raw.githubusercontent.com/zouchenzhen/chatgpt-default-thinking-extended-userscript/main/chatgpt-default-thinking-extended.user.js>

当前版本：`0.3.2`
