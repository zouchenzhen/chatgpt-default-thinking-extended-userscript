# Changelog

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
