// ==UserScript==
// @name         ChatGPT 默认 Thinking Extended
// @name:en      ChatGPT Default Thinking Extended
// @namespace    https://chatgpt.com/
// @version      0.3.1
// @lastupdated  2026-07-12
// @description  新建 ChatGPT 对话时，通过可见 UI 自动选择最新旗舰模型与最高可用思考强度；每次页面加载只执行一次。
// @description:en Once per page load, select the latest flagship model and highest available reasoning effort on new ChatGPT chats using the visible UI.
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

  const SCRIPT_VERSION = '0.3.1';
  const SCRIPT_UPDATED_AT = '2026-07-12';
  const INSTANCE_KEY = '__chatgptDefaultThinkingExtendedOnce_v031';

  if (window[INSTANCE_KEY]) return;
  window[INSTANCE_KEY] = true;

  const CONFIG = {
    targetModel: 'GPT-5.6 Sol',
    targetModelAliases: ['GPT-5.6 Sol', 'GPT‑5.6 Sol'],
    targetModelFamilyAliases: ['GPT-5.6 Sol', 'GPT‑5.6 Sol', 'GPT-5.6', 'GPT‑5.6'],
    targetThinkingTime: 'Extra High',
    // The first visible entry wins. High/高 remains the fallback for workspaces
    // whose current ChatGPT rollout does not expose Extra High yet.
    targetThinkingTimeAliases: ['Extra High', 'Very High', 'Maximum', 'Max', '最高', '极高', '極高', '超高', 'High', '高'],
    legacyModelAliases: ['Thinking', '思考'],
    legacyThinkingTimeAliases: ['Extended', '进阶', '进阶思考', '深度思考', '高级思考', '高級思考', '扩展', '擴展'],
    allowRiskyRightEdgeClick: false,
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

  function getElementPoint(el, xRatio = 0.5, yRatio = 0.5) {
    const rect = el.getBoundingClientRect();
    return {
      rect,
      x: rect.left + rect.width * xRatio,
      y: rect.top + rect.height * yRatio,
    };
  }

  function pressEscape() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
  }

  function dispatchPointerMouseEvent(target, type, x, y) {
    const isPointer = type.startsWith('pointer') && typeof PointerEvent === 'function';
    const isPress = type === 'pointerdown' || type === 'mousedown';
    const eventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: x,
      clientY: y,
      screenX: window.screenX + x,
      screenY: window.screenY + y,
      button: 0,
      buttons: isPress ? 1 : 0,
    };

    if (isPointer) {
      target.dispatchEvent(new PointerEvent(type, {
        ...eventInit,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
      }));
      return;
    }

    target.dispatchEvent(new MouseEvent(type, eventInit));
  }

  function clickElementPoint(el, xRatio = 0.5, yRatio = 0.5) {
    if (!el) return false;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const { x, y } = getElementPoint(el, xRatio, yRatio);
    const target = document.elementFromPoint(x, y) || el;

    for (const type of ['pointermove', 'mousemove', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      dispatchPointerMouseEvent(target, type, x, y);
    }
    return true;
  }

  function clickElement(el) {
    return clickElementPoint(el, 0.5, 0.5);
  }

  function hoverElement(el, xRatio = 0.5, yRatio = 0.5) {
    if (!el) return false;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const { x, y } = getElementPoint(el, xRatio, yRatio);
    const target = document.elementFromPoint(x, y) || el;

    for (const type of ['pointerover', 'mouseover', 'pointerenter', 'mouseenter', 'pointermove', 'mousemove']) {
      dispatchPointerMouseEvent(target, type, x, y);
    }
    return true;
  }

  function allVisible(selector) {
    return [...document.querySelectorAll(selector)].filter(visible);
  }

  function buttonTextLooksLikeModelPicker(text) {
    return /^(Auto|Instant|Thinking|Pro|自动|即时|极速|極速|思考|中|高)(\s|$)/i.test(text)
      || /^Latest\s*[·.]/i.test(text)
      || /^最新\s*[·.]/i.test(text)
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

  function menuItemContainer(el) {
    return el && (el.closest('[role="menuitem"], [role="option"], button, [cmdk-item], [data-radix-collection-item], div[tabindex]') || el);
  }

  function elementLabel(el) {
    return normalize(el && (el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('data-testid')));
  }

  function labelMatches(label, text) {
    const normalized = normalize(label).toLowerCase();
    const wanted = text.toLowerCase();
    return normalized === wanted || normalized.startsWith(`${wanted} `);
  }

  function findMenuItemByText(text) {
    const selectors = [
      '[role="menuitem"]',
      '[role="option"]',
      '[cmdk-item]',
      '[data-radix-collection-item]',
      'button',
      'div[tabindex]',
      'span',
    ];

    const seen = new Set();
    for (const el of allVisible(selectors.join(','))) {
      const item = menuItemContainer(el);
      if (!item || seen.has(item)) continue;
      seen.add(item);

      if (labelMatches(elementLabel(item), text) || labelMatches(elementLabel(el), text)) {
        return item;
      }
    }
    return null;
  }

  function findMenuItemByTexts(texts) {
    for (const text of texts) {
      const item = findMenuItemByText(text);
      if (item) return item;
    }
    return null;
  }

  function findMenuItemsByTexts(texts) {
    const selectors = '[role="menuitem"], [role="option"], [cmdk-item], [data-radix-collection-item], button, div[tabindex], span';
    const seen = new Set();
    const matches = [];
    for (const el of allVisible(selectors)) {
      const item = menuItemContainer(el);
      if (!item || seen.has(item)) continue;
      seen.add(item);
      const labels = [elementLabel(item), elementLabel(el)];
      if (texts.some((text) => labels.some((label) => labelMatches(label, text)))) matches.push(item);
    }
    return matches;
  }

  function findTargetModelItem() {
    return findMenuItemByTexts(CONFIG.targetModelAliases || [CONFIG.targetModel]);
  }

  function findRightmostTargetModelItem() {
    return findMenuItemsByTexts(CONFIG.targetModelAliases || [CONFIG.targetModel])
      .sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left)[0] || null;
  }

  function findTargetThinkingTimeItem() {
    return findMenuItemByTexts(CONFIG.targetThinkingTimeAliases || [CONFIG.targetThinkingTime]);
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

    const row = menuItemContainer(thinkingItem);
    const rowRect = row.getBoundingClientRect();

    const nested = [...row.querySelectorAll('button, [role="button"], [aria-haspopup], [data-testid]')]
      .filter((el) => el !== row)
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0)
      .filter(({ rect }) => rect.left > rowRect.left + rowRect.width * 0.55)
      .sort((a, b) => b.rect.left - a.rect.left);

    if (nested.length) return nested[0].el;

    const labels = /configure|setting|settings|thinking|reason|effort|standard|extended|sliders|more|submenu|思考|进阶|標準|標准|高级|高級/i;
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

  async function openThinkingTimeSubmenu(thinkingItem, targetFinder = findTargetThinkingTimeItem) {
    const row = menuItemContainer(thinkingItem);

    for (const xRatio of [0.5, 0.82, 0.92]) {
      hoverElement(row, xRatio, 0.5);
      await sleep(250);
      if (targetFinder()) return true;

      const settingsButton = findThinkingSettingsButton(row);
      if (settingsButton) {
        clickElement(settingsButton);
        await sleep(350);
        if (targetFinder()) return true;
        hoverElement(row, xRatio, 0.5);
        await sleep(150);
      }
    }

    row.focus && row.focus();
    for (const key of ['ArrowRight', 'Enter', ' ']) {
      row.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await sleep(300);
      if (targetFinder()) return true;
    }

    if (CONFIG.allowRiskyRightEdgeClick) {
      for (const xRatio of [0.88, 0.97]) {
        clickElementPoint(row, xRatio, 0.5);
        await sleep(350);
        if (targetFinder()) return true;
      }
    }

    return false;
  }

  async function chooseLatestStrongest() {
    if (!(await openModelMenu())) return false;

    const family = findMenuItemByTexts(CONFIG.targetModelFamilyAliases);
    if (family) {
      const familyRect = family.getBoundingClientRect();
      const modelSubmenuItem = () => findMenuItemsByTexts(CONFIG.targetModelAliases)
        .find((item) => item !== family && item.getBoundingClientRect().left >= familyRect.right - 8);
      await openThinkingTimeSubmenu(family, modelSubmenuItem);
      const exactModel = findRightmostTargetModelItem();
      if (exactModel) {
        clickElement(exactModel);
        await sleep(300);
      }
    }

    // Model selection usually closes the picker, so reopen it for effort.
    if (!findTargetThinkingTimeItem()) await openModelMenu();
    const strongestEffort = findTargetThinkingTimeItem();
    if (strongestEffort) {
      clickElement(strongestEffort);
      await sleep(250);
      pressEscape();
      log('Selected', CONFIG.targetModel, elementLabel(strongestEffort));
      return true;
    }

    // Compatibility fallback for the pre-July-2026 Thinking -> Extended UI.
    const legacyThinking = findMenuItemByTexts(CONFIG.legacyModelAliases);
    if (legacyThinking) {
      await openThinkingTimeSubmenu(legacyThinking);
      const legacyExtended = findMenuItemByTexts(CONFIG.legacyThinkingTimeAliases);
      if (legacyExtended) {
        clickElement(legacyExtended);
        await sleep(250);
        pressEscape();
        log('Selected legacy Thinking Extended fallback');
        return true;
      }
    }

    pressEscape();
    log('No supported model/effort option was visible');
    return Boolean(family);
  }

  async function applyForCurrentRoute() {
    if (state.running || state.attempted || !isNewChatRoute()) return;

    state.running = true;
    state.attempted = true;
    try {
      if (!(await waitForModelPicker()) || !isNewChatRoute()) return;
      await chooseLatestStrongest();
    } finally {
      state.running = false;
    }
  }

  log(`Loaded v${SCRIPT_VERSION}, updated ${SCRIPT_UPDATED_AT}`);
  setTimeout(applyForCurrentRoute, CONFIG.startDelayMs);
})();
