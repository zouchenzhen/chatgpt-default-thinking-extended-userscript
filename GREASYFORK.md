# ChatGPT 默认 Thinking Extended

## 功能

新建 ChatGPT 对话时，通过网页端可见模型选择器，尝试自动选择 `Thinking -> Extended`。脚本每次页面加载只执行一次，不会持续监听 DOM，也不会反复抢占 UI。

`0.2.2` 起增强了 `Extended` 子菜单展开逻辑：脚本会尝试悬停 `Thinking` 行、点击右侧隐藏控件、使用键盘展开子菜单，并匹配 `Extended`、`进阶思考`、`高级思考`、`扩展` 等中英文界面文案。

如果仍然找不到 `Extended`，默认会关闭菜单并退出，不再自动降级选择标准 `Thinking`。如需旧行为，可在脚本顶部配置 `selectThinkingWhenExtendedMissing: true`。

## 安全边界

- 不绕过 ChatGPT 账号权限、订阅等级、组织策略或使用额度。
- 不拦截 `fetch`、`XMLHttpRequest` 或 `backend-api` 请求体。
- 不读取、保存或上传聊天内容。
- 不加载远程执行代码。

## 源码

GitHub: <https://github.com/zouchenzhen/chatgpt-default-thinking-extended-userscript>

安装 / 更新源: <https://raw.githubusercontent.com/zouchenzhen/chatgpt-default-thinking-extended-userscript/main/chatgpt-default-thinking-extended.user.js>

当前版本：`0.2.2`
