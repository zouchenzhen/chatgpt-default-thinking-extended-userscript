// ==UserScript==
// @name         ChatGPT 默认 Thinking Extended
// @name:en      ChatGPT Default Thinking Extended
// @namespace    https://chatgpt.com/
// @version      0.4.0
// @lastupdated  2026-08-15
// @description  新建 ChatGPT 对话时，通过可见 UI 自动选择 GPT-5.6 Sol 与最高可用推理强度；每次页面加载只执行一次。
// @description:en Once per page load, select GPT-5.6 Sol and the highest available reasoning effort on new ChatGPT chats using the visible UI.
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

  const SCRIPT_VERSION = '0.4.0';
  const SCRIPT_UPDATED_AT = '2026-08-15';
  const INSTANCE_KEY = '__chatgptDefaultThinkingExtendedOnce_v040';

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
    advancedAliases: ['Advanced', '高级', '高級'],
    modelSettingAliases: ['Model', '模型'],
    effortSettingAliases: ['Effort', 'Reasoning effort', '推理强度', '推理強度', '思考强度', '思考強度'],
    legacyModelAliases: ['Thinking', '思考'],
    legacyThinkingTimeAliases: ['Extended', '进阶', '进阶思考', '深度思考', '高级思考', '高級思考', '扩展', '擴展'],
    allowRiskyRightEdgeClick: false,
    applyOnlyOnNewChat: true,
    startDelayMs: 1500,
    waitForPickerMs: 7000,
    pollDelayMs: 250,
    maxAttempts: 3,
    retryDelayMs: 1000,
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
    const label = normalize(text);
    return /^(Auto|Instant|Thinking|Pro|自动|即时|极速|極速|思考|中|高)(?=\s|\d|$)/i.test(label)
      || /^Latest\s*[·.]/i.test(text)
      || /^最新\s*[·.]/i.test(text)
      || /^GPT[-\s]?\d/i.test(text)
      || /选择.*(模型|模式)|選擇.*(模型|模式)|model.*(select|picker|mode)/i.test(label);
  }

  function findModelPickerButton() {
    const buttons = allVisible('button, [role="button"]');
    const candidates = buttons.filter((button) => {
      const text = normalize([
        button.innerText,
        button.textContent,
        button.getAttribute('aria-label'),
        button.getAttribute('data-testid'),
      ].filter(Boolean).join(' '));
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

      if (labelMatches(elementLabel(item), text) || labelMatches(elementLabel(el), text)) {
        seen.add(item);
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
      const labels = [elementLabel(item), elementLabel(el)];
      if (texts.some((text) => labels.some((label) => labelMatches(label, text)))) {
        seen.add(item);
        matches.push(item);
      }
    }
    return matches;
  }

  // The August 2026 picker has two levels.  Its first popup only contains an
  // "Advanced / 高级" action; the actual Model and Effort rows are in the
  // second popup.  Keep this path deliberately semantic so class-name churn
  // in the React/Radix implementation does not matter.
  function findExactChoiceByTexts(texts) {
    const selectors = '[role="menuitem"], [role="option"], [cmdk-item], [data-radix-collection-item], button, div[tabindex], span';
    const seen = new Set();
    const picker = findModelPickerButton();

    for (const el of allVisible(selectors)) {
      const item = menuItemContainer(el);
      if (!item || seen.has(item)) continue;
      seen.add(item);

      // Once High/高 is selected, the composer control itself has that exact
      // label.  It is a menu opener, not the High/高 option in the submenu.
      if (picker && (item === picker || item.contains(picker) || picker.contains(item))) continue;

      const itemLabel = elementLabel(item);
      if (texts.some((text) => labelMatches(itemLabel, text))) return item;
    }
    return null;
  }

  async function waitForFinder(finder, timeout = CONFIG.waitForPickerMs) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const found = finder();
      if (found) return found;
      await sleep(CONFIG.pollDelayMs);
    }
    return null;
  }

  async function openAdvancedSettings() {
    const advanced = findMenuItemByTexts(CONFIG.advancedAliases);
    if (!advanced) return false;

    clickElement(advanced);
    return Boolean(await waitForFinder(() => findMenuItemByTexts([
      ...CONFIG.modelSettingAliases,
      ...CONFIG.effortSettingAliases,
    ]), 1500));
  }

  async function chooseFromAdvancedRow(rowAliases, choiceAliases) {
    const row = findMenuItemByTexts(rowAliases);
    if (!row) return false;

    clickElement(row);
    const choice = await waitForFinder(() => findExactChoiceByTexts(choiceAliases), 1500);
    if (!choice) return false;

    clickElement(choice);
    await sleep(300);
    return true;
  }

  async function chooseWithAdvancedPicker() {
    if (!(await openModelMenu())) return { modelSelected: false, effortSelected: false, supported: false };
    if (!(await openAdvancedSettings())) {
      pressEscape();
      return { modelSelected: false, effortSelected: false, supported: false };
    }

    const modelSelected = await chooseFromAdvancedRow(
      CONFIG.modelSettingAliases,
      CONFIG.targetModelAliases || [CONFIG.targetModel],
    );

    // Selecting a model normally closes all popups.  Reopen from the current
    // composer control before navigating to the separate Effort submenu.
    pressEscape();
    await sleep(150);
    if (!(await openModelMenu()) || !(await openAdvancedSettings())) {
      return { modelSelected, effortSelected: false, supported: true };
    }

    const effortSelected = await chooseFromAdvancedRow(
      CONFIG.effortSettingAliases,
      CONFIG.targetThinkingTimeAliases || [CONFIG.targetThinkingTime],
    );
    pressEscape();
    return { modelSelected, effortSelected, supported: true };
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
    // Current ChatGPT UI: speed button -> Advanced/高级 -> Model + Effort.
    // This is intentionally first, because the top-level speed label itself
    // may be Instant/极速 or High/高 and is no longer a model-family menu.
    const advancedResult = await chooseWithAdvancedPicker();
    if (advancedResult.effortSelected) {
      log('Selected through Advanced picker', CONFIG.targetModel, CONFIG.targetThinkingTime);
      return true;
    }

    // The rest is retained for workspaces that have not received the current
    // two-level picker, or are still serving the previous model submenu.
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
    if (!findExactChoiceByTexts(CONFIG.targetThinkingTimeAliases || [CONFIG.targetThinkingTime])) await openModelMenu();
    const strongestEffort = findExactChoiceByTexts(CONFIG.targetThinkingTimeAliases || [CONFIG.targetThinkingTime]);
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
    return advancedResult.modelSelected || Boolean(family);
  }

  async function applyForCurrentRoute() {
    if (state.running || state.attempted || !isNewChatRoute()) return;

    state.running = true;
    state.attempted = true;
    try {
      if (!(await waitForModelPicker()) || !isNewChatRoute()) return;
      for (let attempt = 1; attempt <= CONFIG.maxAttempts; attempt += 1) {
        if (await chooseLatestStrongest()) return;
        if (attempt < CONFIG.maxAttempts) {
          pressEscape();
          await sleep(CONFIG.retryDelayMs);
        }
      }
    } finally {
      state.running = false;
    }
  }

  log(`Loaded v${SCRIPT_VERSION}, updated ${SCRIPT_UPDATED_AT}`);
  setTimeout(applyForCurrentRoute, CONFIG.startDelayMs);
})();
