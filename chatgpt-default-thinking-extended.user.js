// ==UserScript==
// @name         ChatGPT 默认 Thinking Extended
// @name:en      ChatGPT Default Thinking Extended
// @namespace    https://chatgpt.com/
// @version      0.2.1
// @lastupdated  2026-06-08
// @description  新建 ChatGPT 对话时，通过可见 UI 尝试自动选择 Thinking -> Extended；每次页面加载只执行一次。
// @description:en Once per page load, select Thinking -> Extended on new ChatGPT chats by using the visible model picker UI.
// @author       zouchenzhen
// @license      MIT
// @homepageURL  https://github.com/zouchenzhen/chatgpt-default-thinking-extended-userscript
// @supportURL   https://github.com/zouchenzhen/chatgpt-default-thinking-extended-userscript/issues
// @downloadURL  https://raw.githubusercontent.com/zouchenzhen/chatgpt-default-thinking-extended-userscript/main/chatgpt-default-thinking-extended.user.js
// @updateURL    https://raw.githubusercontent.com/zouchenzhen/chatgpt-default-thinking-extended-userscript/main/chatgpt-default-thinking-extended.user.js
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_VERSION = '0.2.1';
  const SCRIPT_UPDATED_AT = '2026-06-08';
  const INSTANCE_KEY = '__chatgptDefaultThinkingExtendedOnce_v020';

  if (window[INSTANCE_KEY]) return;
  window[INSTANCE_KEY] = true;

  const CONFIG = {
    targetModel: 'Thinking',
    targetThinkingTime: 'Extended',
    applyOnlyOnNewChat: true,
    startDelayMs: 1500,
    waitForPickerMs: 7000,
    pollDelayMs: 250,
    debug: false,
  };

  const state = {
    running: false,
    attempted: false,
  };

  function log(...args) {
    if (CONFIG.debug) console.debug('[ChatGPT Thinking Extended]', ...args);
  }

  function normalize(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function visible(el) {
    if (!el || !(el instanceof Element)) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  function isNewChatRoute() {
    if (!CONFIG.applyOnlyOnNewChat) return true;
    const path = location.pathname;
    return path === '/' || path === '/new' || path === '/?';
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function clickElement(el) {
    if (!el) return false;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
    return true;
  }

  function clickElementPoint(el, xRatio, yRatio) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width * xRatio;
    const y = rect.top + rect.height * yRatio;
    const target = document.elementFromPoint(x, y) || el;

    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      target.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: x,
        clientY: y,
      }));
    }
    return true;
  }

  function hoverElement(el) {
    if (!el) return false;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    for (const type of ['pointerover', 'mouseover', 'pointerenter', 'mouseenter']) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
    return true;
  }

  function allVisible(selector) {
    return [...document.querySelectorAll(selector)].filter(visible);
  }

  function buttonTextLooksLikeModelPicker(text) {
    return /^(Auto|Instant|Thinking|Pro)(\s|$)/i.test(text)
      || /^Latest\s*[·.]/i.test(text)
      || /^GPT[-\s]?\d/i.test(text);
  }

  function findModelPickerButton() {
    const buttons = allVisible('button');
    const candidates = buttons.filter((button) => {
      const text = normalize(button.innerText || button.getAttribute('aria-label'));
      if (!buttonTextLooksLikeModelPicker(text)) return false;
      const aria = normalize(button.getAttribute('aria-haspopup'));
      return aria === 'menu' || aria === 'listbox' || text.length <= 40;
    });

    if (!candidates.length) return null;

    const composer = document.querySelector('form textarea, form [contenteditable="true"], textarea, [contenteditable="true"]');
    if (!composer) return candidates[0];

    const composerRect = composer.getBoundingClientRect();
    return candidates
      .map((button) => {
        const rect = button.getBoundingClientRect();
        const distance = Math.abs(rect.top - composerRect.top) + Math.abs(rect.left - composerRect.right);
        return { button, distance };
      })
      .sort((a, b) => a.distance - b.distance)[0].button;
  }

  function findMenuItemByText(text) {
    const wanted = text.toLowerCase();
    const selectors = [
      '[role="menuitem"]',
      '[role="option"]',
      '[cmdk-item]',
      'button',
      'div[tabindex]',
      'span',
    ];

    for (const el of allVisible(selectors.join(','))) {
      const label = normalize(el.innerText || el.textContent || el.getAttribute('aria-label'));
      if (!label) continue;
      if (label.toLowerCase() === wanted || label.toLowerCase().startsWith(`${wanted} `)) {
        return el.closest('[role="menuitem"], [role="option"], button, [cmdk-item], div[tabindex]') || el;
      }
    }
    return null;
  }

  async function openModelMenu() {
    const picker = findModelPickerButton();
    if (!picker) return false;
    clickElement(picker);
    await sleep(250);
    return true;
  }

  async function waitForModelPicker() {
    const deadline = Date.now() + CONFIG.waitForPickerMs;
    while (Date.now() < deadline) {
      const picker = findModelPickerButton();
      if (picker) return picker;
      await sleep(CONFIG.pollDelayMs);
    }
    return null;
  }

  function findThinkingSettingsButton(thinkingItem) {
    if (!thinkingItem) return null;

    const row = thinkingItem.closest('[role="menuitem"], [role="option"], button, [cmdk-item], div[tabindex]') || thinkingItem;
    const rowRect = row.getBoundingClientRect();

    const nested = [...row.querySelectorAll('button, [role="button"], [aria-haspopup], [data-testid]')]
      .filter((el) => el !== row)
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0)
      .sort((a, b) => b.rect.left - a.rect.left);

    if (nested.length) return nested[0].el;

    const labels = /configure|setting|settings|thinking|reason|effort|standard|extended|sliders/i;
    const nearby = [...document.querySelectorAll('button, [role="button"], [aria-haspopup], [data-testid]')]
      .map((el) => ({
        el,
        rect: el.getBoundingClientRect(),
        label: normalize(el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('data-testid')),
      }))
      .filter(({ el, rect }) => {
        if (el === row || rect.width <= 0 || rect.height <= 0) return false;
        const sameVerticalBand = rect.top < rowRect.bottom && rect.bottom > rowRect.top;
        const onRightSide = rect.left > rowRect.left + rowRect.width * 0.55;
        const nearRightEdge = rect.right <= rowRect.right + 24;
        return sameVerticalBand && onRightSide && nearRightEdge;
      })
      .sort((a, b) => {
        const aLabelScore = labels.test(a.label) ? 0 : 1;
        const bLabelScore = labels.test(b.label) ? 0 : 1;
        return aLabelScore - bLabelScore || b.rect.left - a.rect.left;
      });

    return nearby[0] && nearby[0].el;
  }

  async function openThinkingTimeSubmenu(thinkingItem) {
    hoverElement(thinkingItem);
    await sleep(450);
    if (findMenuItemByText(CONFIG.targetThinkingTime)) return true;

    const settingsButton = findThinkingSettingsButton(thinkingItem);
    if (settingsButton) {
      clickElement(settingsButton);
      await sleep(350);
      if (findMenuItemByText(CONFIG.targetThinkingTime)) return true;
    }

    clickElementPoint(thinkingItem, 0.88, 0.5);
    await sleep(350);
    if (findMenuItemByText(CONFIG.targetThinkingTime)) return true;

    clickElementPoint(thinkingItem, 0.97, 0.5);
    await sleep(350);
    return Boolean(findMenuItemByText(CONFIG.targetThinkingTime));
  }

  async function chooseThinkingExtended() {
    if (!(await openModelMenu())) return false;

    const thinking = findMenuItemByText(CONFIG.targetModel);
    if (!thinking) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return false;
    }

    await openThinkingTimeSubmenu(thinking);
    const extended = findMenuItemByText(CONFIG.targetThinkingTime);

    if (!extended) {
      clickElement(thinking);
      await sleep(250);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      log('Selected Thinking, but Extended was not visible');
      return true;
    }

    clickElement(extended);
    await sleep(250);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    log('Selected', CONFIG.targetModel, CONFIG.targetThinkingTime);
    return true;
  }

  async function applyForCurrentRoute() {
    if (state.running || state.attempted || !isNewChatRoute()) return;

    state.running = true;
    state.attempted = true;
    try {
      if (!(await waitForModelPicker()) || !isNewChatRoute()) return;
      await chooseThinkingExtended();
    } finally {
      state.running = false;
    }
  }

  log(`Loaded v${SCRIPT_VERSION}, updated ${SCRIPT_UPDATED_AT}`);
  setTimeout(applyForCurrentRoute, CONFIG.startDelayMs);
})();
