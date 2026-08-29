# ChatGPT 默认最强模型与思考模式

## 功能

新建 ChatGPT 对话时，通过网页端可见模型选择器，自动选择 `GPT-5.6 Sol` 与最高可用思考强度。脚本每次页面加载只启动一轮有限重试，不会持续监听 DOM，也不会反复抢占 UI。

`0.5.0` 已适配 2026 年 8 月底新版界面：打开 `Instant / 极速` 后确认思考强度滑杆，点击当前强度行进入模型列表并选择 `GPT-5.6 Sol`，随后重新打开滑杆并设到最高档。脚本会硬性拒绝麦克风、听写、录音和语音模式控件，不再使用可能误触相邻按钮的全局“附近按钮”兜底。

脚本只操作账号当前可见且有权限选择的菜单项，不会绕过套餐或工作区限制。

## 安全边界

- 不绕过 ChatGPT 账号权限、订阅等级、组织策略或使用额度。
- 不拦截 `fetch`、`XMLHttpRequest` 或 `backend-api` 请求体。
- 不读取、保存或上传聊天内容。
- 不加载远程执行代码。
- 不操作麦克风、听写、录音或语音模式按钮。

## 源码

GitHub: <https://github.com/zouchenzhen/chatgpt-default-thinking-extended-userscript>

安装 / 更新源: <https://raw.githubusercontent.com/zouchenzhen/chatgpt-default-thinking-extended-userscript/main/chatgpt-default-thinking-extended.user.js>

当前版本：`0.5.1`
