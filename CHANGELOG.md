# Changelog

## 0.4.0 - 2026-08-15

- Adapt to the current two-level composer picker: `Instant / 极速` → `Advanced / 高级` → `Model / 模型` and `Effort / 推理强度`.
- Select `GPT-5.6 Sol`, reopen the current picker, then select the highest visible effort. This supports the English `Instant / Medium / High` and Chinese `极速 / 中 / 高` menus shown by current ChatGPT workspaces.
- Prevent the currently selected composer label (`High / 高`) from being mistaken for the effort option in the submenu.

## 0.3.2 - 2026-07-12

- Match compact Chinese picker text such as `极速5.5` in addition to `极速 5.5`.
- Detect both native buttons and elements using `role="button"`, including Chinese model-picker aria labels.
- Retry the visible-UI selection a few times when ChatGPT's client-side UI is still settling.

## 0.3.1 - 2026-07-12

- Recognize the new Chinese model-picker labels `极速 / 極速`, `中`, and `高`.
- Fix the script not opening the picker when a Chinese ChatGPT page starts in `极速 5.5` mode.

## 0.3.0 - 2026-07-12

- Adapt to ChatGPT's July 2026 model picker and select `GPT-5.6 Sol` by default.
- Select the highest visible reasoning effort, preferring `Extra High` and falling back to `High / 高`.
- Keep compatibility with the older `Thinking -> Extended` picker.

## 0.2.2 - 2026-07-02

- Improve `Thinking -> Extended` submenu opening for different viewport sizes and UI variants.
- Dispatch pointer/mouse events with coordinates and try keyboard submenu expansion.
- Match Chinese labels such as `思考` and `进阶思考` in addition to English labels.
- Stop falling back to standard `Thinking` by default when `Extended` is not found.

## 0.2.1 - 2026-06-08

- Make Chinese the primary userscript metadata language for Greasy Fork zh-CN publishing.
- Move English metadata to localized `@name:en` and `@description:en` fields.

## 0.2.0 - 2026-06-08

- Add one-attempt-per-page-load behavior to avoid repeatedly taking over the UI.
- Add a global instance lock.
- Try hovering the `Thinking` row before clicking the hidden settings control.
- Add metadata for open-source distribution and userscript auto-update.
- Add Chinese and English README files.

## 0.1.0 - 2026-06-08

- Initial userscript.
- Try to select `Thinking -> Extended` from the ChatGPT model picker.
