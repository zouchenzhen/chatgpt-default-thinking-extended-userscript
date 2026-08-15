# ChatGPT Default Thinking Extended Userscript

A small userscript for the ChatGPT web app. On a new chat page, it uses the visible model picker UI to select `GPT-5.6 Sol` and the highest available reasoning effort (preferring `Extra High`, otherwise `High`). It does not intercept requests, modify backend payloads, or bypass account permissions.

[中文 README](README.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Firefox-lightgrey.svg)
![Userscript](https://img.shields.io/badge/userscript-Tampermonkey%20%7C%20Violentmonkey-orange.svg)
![ChatGPT](https://img.shields.io/badge/target-ChatGPT-10A37F.svg)
![Version](https://img.shields.io/badge/version-0.4.1-6366f1.svg)

---

## Quick Install

Install a userscript manager first:

- [Tampermonkey](https://www.tampermonkey.net/)
- [Violentmonkey](https://violentmonkey.github.io/)

Then install the script from GitHub Raw:

- [Install chatgpt-default-thinking-extended.user.js](https://raw.githubusercontent.com/zouchenzhen/chatgpt-default-thinking-extended-userscript/main/chatgpt-default-thinking-extended.user.js)

After installation, refresh a new chat page on `https://chatgpt.com/`. The script waits for the model picker and performs one selection attempt per page load.

## Features

- Selects `GPT-5.6 Sol` and the highest available reasoning effort on new ChatGPT chats.
- Starts one selection cycle per page load and retries up to three times while ChatGPT's client-side UI settles; it does not continuously watch DOM mutations.
- Supports the current English and Chinese two-level path: `Instant / 极速` → `Advanced / 高级` → `Model / 模型` and `Effort / 推理强度`.
- Prefers `Extra High`; when a K12 / Teachers workspace exposes only the current three levels, it selects `High / 高`.
- Keeps the legacy `Thinking -> Extended` picker as a compatibility fallback.
- Does not modify `fetch`, `XMLHttpRequest`, `backend-api`, or any private request payload.

## Why This Exists

This script comes from my own K12 / ChatGPT for Teachers workflow: every new chat starts from `Instant / 极速`, and the web app does not preserve the previous selection. I had to open the menu, switch to the flagship `GPT-5.6 Sol`, and then choose the highest available reasoning effort every time.

This script solves a narrow interaction problem: reducing repeated clicks in the ChatGPT web UI. It is not a model unlocker and does not bypass usage limits.

## How It Works

This is **visible UI automation driven by DOM inspection**: the script finds controls in the page and simulates the hover/click interactions a user would perform. It does not move the operating system's physical mouse cursor, blindly click screenshot coordinates, or rewrite the model parameters sent to ChatGPT's backend.

The implementation has two parts:

- **Locate UI elements:** inspect visible text, `aria-label`, `aria-haspopup`, `role`, `data-testid`, and screen geometry to identify the model picker near the composer, model menu rows, and reasoning-effort options. Matching rules cover English, Chinese, and several current DOM variants.
- **Trigger UI interactions:** call `scrollIntoView()`, calculate the target with `getBoundingClientRect()` and `document.elementFromPoint()`, then dispatch `pointermove → mousemove → pointerdown → mousedown → pointerup → mouseup → click`. For submenus, it also dispatches hover events and uses `ArrowRight / Enter / Space` as keyboard fallbacks.

These are synthetic DOM events inside the browser page; they do not occupy or move your physical mouse. The script sends a complete pointer/mouse sequence instead of relying only on `element.click()` because ChatGPT's React menus may depend on hover state and the full event chain.

The complete flow is:

1. Runs only on `chatgpt.com` and `chat.openai.com`.
2. Runs only on new chat routes by default.
3. Waits for the model picker after page load.
4. Opens the speed/model control beside the composer, such as `Instant / 极速`.
5. Opens `Advanced / 高级`, then `Model / 模型`, and selects `GPT-5.6 Sol`.
6. Reopens `Advanced / 高级` after model selection closes the popups, then opens `Effort / 推理强度`.
7. Selects the first visible highest-effort alias such as `Extra High`, `Very High`, or `Maximum`.
8. Falls back to `High / 高` when higher levels are unavailable; on the legacy UI it tries `Thinking -> Extended`.

If ChatGPT's client-side UI is still rendering, the script retries at one-second intervals, up to three times. It stops after success or after the retry limit; it does not continuously scan the page or keep taking over the menu.

### What It Is Not

- Not an operating-system mouse macro and does not use fixed absolute screen coordinates.
- Not screenshot recognition or OCR; it adapts to zoom and window size primarily through DOM geometry.
- Not request injection; it does not intercept `fetch` or `XMLHttpRequest`, or rewrite backend payloads.
- Not a model unlocker; it can select only options that are visible and authorized for the current account.

## Safety Boundaries

This repository intentionally does not:

- Bypass ChatGPT account permissions, subscription tiers, workspace policy, or usage limits.
- Call private ChatGPT backend endpoints to force a model switch.
- Read, save, or upload your chat content.
- Load remote executable code.
- Send data to third-party servers.

Because the ChatGPT web DOM can change at any time, selector updates may be needed.

## How It Differs From Older Model Switchers

Many older userscripts modify request payloads, inject old model IDs, or try to access models that the account cannot select in the UI.

This script is narrower and safer:

| Dimension | Older model switchers | This script |
|---|---|---|
| Core method | Request modification or model ID injection | Visible UI automation |
| Permission boundary | May try unavailable models | Selects only visible options |
| Goal | Switch arbitrary models | Default new chats to `GPT-5.6 Sol` and the highest available reasoning effort |
| Trigger | Persistent watchers or request hooks | One attempt per page load |
| Risk | Fragile and prone to abnormal behavior | Still DOM-dependent, but clearer in scope |

## Repository Structure

```text
.
├── chatgpt-default-thinking-extended.user.js
├── CHANGELOG.md
├── LICENSE
├── README.md
└── README.en.md
```

## Configuration

You can adjust `CONFIG` near the top of the script:

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

Common tweaks:

- Increase `waitForPickerMs` if the page loads slowly.
- Set `applyOnlyOnNewChat: false` if you want the script to run outside new chat pages.
- Reorder `targetThinkingTimeAliases` to change effort preference; the first visible item wins.
- Set `allowRiskyRightEdgeClick: true` if your UI only opens the submenu by clicking the far right of the row.
- Set `debug: true` to inspect behavior in the browser console.

## FAQ

### Why did it select High instead of Extra High?

The script can select only levels actually visible to the current account. It prefers `Extra High` and related localized aliases, but if a workspace exposes only `Instant / Medium / High` (`极速 / 中 / 高`), it selects the strongest visible option, `High / 高`.

### Why not bypass the UI and modify backend requests?

ChatGPT web backend endpoints are not public APIs. Modifying private payloads is fragile and may cross account, workspace, or usage-limit boundaries. This script is intentionally limited to visible UI automation.

### Why does the script run only once?

Earlier DOM-watching behavior could repeatedly open the model menu and interrupt typing. The current version performs one selection attempt per page load.

### Does it support ChatGPT for Teachers / Plus / Business?

It should work when the account can manually see and select the target model and reasoning level in the web UI. Entitlements, workspace policy, and rollout state can differ; the script cannot unlock hidden or disabled options.

## Distribution

- GitHub Raw: direct install and auto-update.
- GitHub Gist: backup install source.
- Greasy Fork: requires a logged-in Greasy Fork session and form submission.
- OpenUserJS: requires a logged-in OpenUserJS session and web import/publish.

Currently published:

- GitHub repository: <https://github.com/zouchenzhen/chatgpt-default-thinking-extended-userscript>
- GitHub Raw: <https://raw.githubusercontent.com/zouchenzhen/chatgpt-default-thinking-extended-userscript/main/chatgpt-default-thinking-extended.user.js>
- GitHub Gist: <https://gist.github.com/zouchenzhen/3c4b41481c53542047df5cdb3d053bad>

## Community

[LINUX DO — Chinese Developer Community](https://linux.do/)

This project recognizes and appreciates the value of the LINUX DO community in Chinese-language open-source exchange, project sharing, and technical discussion. Unless explicitly stated by the community, this is an acknowledgement and link only, not an official endorsement.

## Version

- Current version: `0.4.1`
- Updated: `2026-08-15`

## License

[MIT License](LICENSE)
