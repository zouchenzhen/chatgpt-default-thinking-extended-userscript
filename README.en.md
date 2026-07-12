# ChatGPT Default Thinking Extended Userscript

A small userscript for the ChatGPT web app. On a new chat page, it uses the visible model picker UI to select `GPT-5.6 Sol` and the highest available reasoning effort (preferring `Extra High`, otherwise `High`). It does not intercept requests, modify backend payloads, or bypass account permissions.

[中文 README](README.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Firefox-lightgrey.svg)
![Userscript](https://img.shields.io/badge/userscript-Tampermonkey%20%7C%20Violentmonkey-orange.svg)
![ChatGPT](https://img.shields.io/badge/target-ChatGPT-10A37F.svg)
![Version](https://img.shields.io/badge/version-0.3.0-6366f1.svg)

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
- Runs once per page load. It does not watch DOM mutations or repeatedly take over the UI.
- Hovers the `Thinking` row first, then tries to click the hidden settings button on the right to reveal `Standard / Extended`.
- Clicks only after `Extended` is found by default; it no longer falls back to standard `Thinking` automatically.
- Does not modify `fetch`, `XMLHttpRequest`, `backend-api`, or any private request payload.

## Why This Exists

This script comes from my own K12 / ChatGPT for Teachers account workflow: every new chat starts from `Instant`, and the web app does not preserve the model choice from the previous chat. I had to open the model menu every time and manually switch to the highest mode available to my account, `Thinking -> Extended`.

This script solves a narrow interaction problem: reducing repeated clicks in the ChatGPT web UI. It is not a model unlocker and does not bypass usage limits.

## How It Works

The script uses a conservative UI automation flow:

1. Runs only on `chatgpt.com` and `chat.openai.com`.
2. Runs only on new chat routes by default.
3. Waits for the model picker after page load.
4. Opens the model menu.
5. Finds the `Thinking` menu item.
6. Hovers the row and tries to click the settings control on the right.
7. Clicks `Extended` if it appears.
8. Falls back to `Thinking` if `Extended` does not appear.

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
| Goal | Switch arbitrary models | Default new chats to `Thinking -> Extended` |
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
  targetModel: 'Thinking',
  targetModelAliases: ['Thinking', '思考'],
  targetThinkingTime: 'Extended',
  targetThinkingTimeAliases: ['Extended', '进阶', '进阶思考', '深度思考', '高级思考', '高級思考', '扩展', '擴展'],
  selectThinkingWhenExtendedMissing: false,
  allowRiskyRightEdgeClick: false,
  applyOnlyOnNewChat: true,
  startDelayMs: 1500,
  waitForPickerMs: 7000,
  pollDelayMs: 250,
  debug: false,
};
```

Common tweaks:

- Increase `waitForPickerMs` if the page loads slowly.
- Set `applyOnlyOnNewChat: false` if you want the script to run outside new chat pages.
- Set `selectThinkingWhenExtendedMissing: true` if you prefer falling back to standard `Thinking` when `Extended` is not found.
- Set `allowRiskyRightEdgeClick: true` if your UI only opens the submenu by clicking the far right of the row.
- Set `debug: true` to inspect behavior in the browser console.

## FAQ

### Why did it select Thinking but not Extended?

Older versions fell back to clicking `Thinking` when `Extended` was not found, so the result could look like the script only selected standard thinking. Since `0.2.2`, the default behavior no longer downgrades automatically: the script hovers the `Thinking` row, tries the hidden right-side control, tries keyboard submenu expansion, matches English and Chinese labels, and closes the menu if `Extended` still is not found.

### Why not bypass the UI and modify backend requests?

ChatGPT web backend endpoints are not public APIs. Modifying private payloads is fragile and may cross account, workspace, or usage-limit boundaries. This script is intentionally limited to visible UI automation.

### Why does the script run only once?

Earlier DOM-watching behavior could repeatedly open the model menu and interrupt typing. The current version performs one selection attempt per page load.

### Does it support ChatGPT for Teachers / Plus / Business?

It should work only when the account can manually see and select `Thinking -> Extended` in the web UI. Account entitlements, workspace policy, and rollout state can differ.

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

- Current version: `0.3.0`
- Updated: `2026-07-02`

## License

[MIT License](LICENSE)
