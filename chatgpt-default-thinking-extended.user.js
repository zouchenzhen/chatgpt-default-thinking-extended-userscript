// ==UserScript==
// @name         ChatGPT 默认 Thinking Extended
// @name:en      ChatGPT Default Thinking Extended
// @namespace    https://chatgpt.com/
// @version      0.5.1
// @lastupdated  2026-08-29
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

  const SCRIPT_VERSION = '0.5.1';
  const SCRIPT_UPDATED_AT = '2026-08-29';
  const INSTANCE_KEY = '__chatgptDefaultThinkingExtendedOnce_v051';

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
    currentEffortAliases: ['Instant', 'Medium', 'High', '极速', '極速', '中', '高'],
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

  function controlLabel(el) {
    if (!el) return '';
    const parts = [...new Set([
      el.innerText,
      el.textContent,
      el.getAttribute && el.getAttribute('aria-label'),
      el.getAttribute && el.getAttribute('title'),
      el.getAttribute && el.getAttribute('data-testid'),
    ].filter(Boolean).map(normalize))];
    return normalize(parts.join(' '));
  }

  function isVoiceOrRecordingControl(el) {
    if (!el || !(el instanceof Element)) return false;
    const control = el.closest('button, [role="button"]') || el;
    return /voice|dictat|microphone|\bmic\b|record(?:ing)?|语音|語音|麦克风|麥克風|录音|錄音/i.test(controlLabel(control));
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

  function pointTargetBelongsToElement(el, pointTarget) {
    if (!pointTarget || !(pointTarget instanceof Element)) return null;
    if (pointTarget === el || el.contains(pointTarget)) return pointTarget;

    // Dispatching to an ancestor is less reliable for React controls, so keep
    // the originally identified target in that case.  Never accept body/html:
    // they contain every element and would defeat this safety check.
    if (pointTarget !== document.body
      && pointTarget !== document.documentElement
      && pointTarget.contains(el)) return el;

    return null;
  }

  function getSafePointTarget(el, x, y) {
    if (!el || !el.isConnected || !visible(el)) return null;
    if (isVoiceOrRecordingControl(el)) {
      log('Blocked click/hover on a voice or recording control');
      return null;
    }
    const pointTarget = document.elementFromPoint(x, y);
    const safeTarget = pointTargetBelongsToElement(el, pointTarget);
    if (safeTarget && isVoiceOrRecordingControl(safeTarget)) {
      log('Blocked click/hover because the point resolved to a voice or recording control');
      return null;
    }
    if (!safeTarget) log('Skipped click/hover: point target is unrelated to selected control');
    return safeTarget;
  }

  function clickElementPoint(el, xRatio = 0.5, yRatio = 0.5) {
    if (!el || !el.isConnected || !visible(el)) return false;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const { x, y } = getElementPoint(el, xRatio, yRatio);
    const target = getSafePointTarget(el, x, y);
    if (!target) return false;

    for (const type of ['pointermove', 'mousemove', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      dispatchPointerMouseEvent(target, type, x, y);
    }
    return true;
  }

  function clickElement(el) {
    return clickElementPoint(el, 0.5, 0.5);
  }

  function hoverElement(el, xRatio = 0.5, yRatio = 0.5) {
    if (!el || !el.isConnected || !visible(el)) return false;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const { x, y } = getElementPoint(el, xRatio, yRatio);
    const target = getSafePointTarget(el, x, y);
    if (!target) return false;

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
      || /^(Thinking effort|Reasoning effort|思考强度|思考強度|推理强度|推理強度)$/i.test(label)
      || /^Latest\s*[·.]/i.test(text)
      || /^最新\s*[·.]/i.test(text)
      || /^GPT[-\s]?\d/i.test(text)
      || /选择.*(模型|模式)|選擇.*(模型|模式)|model.*(select|picker|mode)/i.test(label);
  }

  function findModelPickerButton() {
    const buttons = allVisible('button, [role="button"]');
    const candidates = buttons.filter((button) => {
      if (isVoiceOrRecordingControl(button)) return false;
      const text = controlLabel(button);
      if (!buttonTextLooksLikeModelPicker(text)) return false;
      const aria = normalize(button.getAttribute('aria-haspopup'));
      return aria === 'menu' || aria === 'listbox' || text.length <= 40;
    });

    const composer = document.querySelector('form textarea, form [contenteditable="true"], textarea, [contenteditable="true"]');
    const composerForm = composer && composer.closest('form');
    const scopedCandidates = composerForm
      ? candidates.filter((button) => composerForm.contains(button))
      : [];
    const eligibleCandidates = scopedCandidates.length ? scopedCandidates : candidates;

    if (!eligibleCandidates.length) return null;
    if (!composer) return eligibleCandidates[0];

    const composerRect = composer.getBoundingClientRect();
    return eligibleCandidates
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

    if (!clickElement(advanced)) return false;
    return Boolean(await waitForFinder(() => findMenuItemByTexts([
      ...CONFIG.modelSettingAliases,
      ...CONFIG.effortSettingAliases,
    ]), 1500));
  }

  async function chooseFromAdvancedRow(rowAliases, choiceAliases) {
    const row = findMenuItemByTexts(rowAliases);
    if (!row) return false;

    if (!clickElement(row)) return false;
    const choice = await waitForFinder(() => findExactChoiceByTexts(choiceAliases), 1500);
    if (!choice) return false;

    if (!clickElement(choice)) return false;
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

  function findEffortSlider() {
    const sliders = allVisible('[role="slider"], input[type="range"]')
      .filter((slider) => !isVoiceOrRecordingControl(slider));
    if (!sliders.length) return null;

    const picker = findModelPickerButton();
    if (!picker) return sliders[0];
    const pickerRect = picker.getBoundingClientRect();
    return sliders
      .map((slider) => {
        const rect = slider.getBoundingClientRect();
        const distance = Math.abs(rect.top - pickerRect.bottom) + Math.abs(rect.right - pickerRect.right);
        return { slider, distance };
      })
      .sort((a, b) => a.distance - b.distance)[0].slider;
  }

  function findSliderTrack(slider) {
    let current = slider;
    for (let depth = 0; current && depth < 5; depth += 1, current = current.parentElement) {
      const rect = current.getBoundingClientRect();
      if (rect.width >= 100 && rect.width <= 500 && rect.height > 0 && rect.height <= 80) return current;
    }
    return null;
  }

  async function setEffortSliderToMaximum(slider) {
    if (!slider || isVoiceOrRecordingControl(slider)) return false;

    if (slider instanceof HTMLInputElement && slider.type === 'range') {
      const max = slider.max || slider.getAttribute('max');
      if (max !== null && max !== '') {
        const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (valueSetter) valueSetter.call(slider, max);
        else slider.value = max;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(300);
        return slider.value === String(max);
      }
    }

    slider.focus && slider.focus();
    for (const type of ['keydown', 'keyup']) {
      slider.dispatchEvent(new KeyboardEvent(type, {
        key: 'End',
        code: 'End',
        bubbles: true,
        cancelable: true,
      }));
    }
    await sleep(200);

    const isAtMaximum = (candidate = slider) => {
      const valueNowRaw = candidate && candidate.getAttribute('aria-valuenow');
      const valueMaxRaw = candidate && candidate.getAttribute('aria-valuemax');
      const valueNow = Number(valueNowRaw);
      const valueMax = Number(valueMaxRaw);
      return valueNowRaw !== null && valueMaxRaw !== null
        && Number.isFinite(valueNow) && Number.isFinite(valueMax) && valueNow >= valueMax;
    };
    if (isAtMaximum()) return true;

    // Custom React/Radix sliders consistently handle ArrowRight even when
    // their current implementation ignores a synthetic End key.
    for (let step = 0; step < 12 && !isAtMaximum(); step += 1) {
      for (const type of ['keydown', 'keyup']) {
        slider.dispatchEvent(new KeyboardEvent(type, {
          key: 'ArrowRight',
          code: 'ArrowRight',
          bubbles: true,
          cancelable: true,
        }));
      }
      await sleep(40);
    }
    if (isAtMaximum()) return true;

    const track = findSliderTrack(slider);
    if (!track || isVoiceOrRecordingControl(track)) return false;
    if (!clickElementPoint(track, 0.98, 0.5)) return false;
    await sleep(300);

    // Some rollout variants omit numeric ARIA values. In that case a safely
    // constrained pointer action inside the verified track is the strongest
    // observable success signal available. If values exist, require max.
    const activeSlider = findEffortSlider() || slider;
    const hasNumericAria = activeSlider.getAttribute('aria-valuenow') !== null
      && activeSlider.getAttribute('aria-valuemax') !== null;
    return hasNumericAria ? isAtMaximum(activeSlider) : true;
  }

  async function chooseWithSliderPicker() {
    if (!(await openModelMenu())) return { modelSelected: false, effortSelected: false, supported: false };

    const slider = await waitForFinder(findEffortSlider, 1200);
    if (!slider) {
      pressEscape();
      return { modelSelected: false, effortSelected: false, supported: false };
    }

    // Set effort first while the verified slider popup is definitely open.
    // Selecting an already-active model may close only the nested model list,
    // so reopening the composer trigger afterward could accidentally toggle
    // the root popup closed instead of opening it.
    const effortSelected = await setEffortSliderToMaximum(slider);
    if (!effortSelected) {
      pressEscape();
      return { modelSelected: false, effortSelected: false, supported: true };
    }

    let currentEffort = findExactChoiceByTexts(CONFIG.currentEffortAliases);
    if (!currentEffort && !findEffortSlider()) {
      // A rollout may commit the slider value by closing the popup. Reopen it
      // once before looking for the row that leads to the model submenu.
      if (await openModelMenu()) {
        await waitForFinder(findEffortSlider, 800);
        currentEffort = findExactChoiceByTexts(CONFIG.currentEffortAliases);
      }
    }
    if (!currentEffort || !clickElement(currentEffort)) {
      pressEscape();
      return { modelSelected: false, effortSelected, supported: true };
    }

    const modelChoice = await waitForFinder(
      () => findExactChoiceByTexts(CONFIG.targetModelAliases || [CONFIG.targetModel]),
      1500,
    );
    const modelSelected = Boolean(modelChoice && clickElement(modelChoice));
    if (!modelSelected) {
      pressEscape();
      return { modelSelected: false, effortSelected, supported: true };
    }
    await sleep(300);
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
    if (!clickElement(picker)) return false;
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

    // Never guess a submenu trigger by scanning globally for a button merely
    // near this row. Composer controls such as microphone and voice mode sit
    // next to the picker and must remain outside the candidate set.
    return null;
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
    // Late-August 2026 UI: the first popup contains an effort slider, while
    // clicking its current effort row opens the model list.
    const sliderResult = await chooseWithSliderPicker();
    if (sliderResult.modelSelected && sliderResult.effortSelected) {
      log('Selected through slider picker', CONFIG.targetModel, 'maximum effort');
      return true;
    }
    // A recognized slider UI is handled only by this path. If either step
    // fails, let the bounded outer retry start from a clean popup state rather
    // than reporting success after changing only the model.
    if (sliderResult.supported) return false;

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
      if (exactModel && clickElement(exactModel)) {
        await sleep(300);
      }
    }

    // Model selection usually closes the picker, so reopen it for effort.
    if (!findExactChoiceByTexts(CONFIG.targetThinkingTimeAliases || [CONFIG.targetThinkingTime])) await openModelMenu();
    const strongestEffort = findExactChoiceByTexts(CONFIG.targetThinkingTimeAliases || [CONFIG.targetThinkingTime]);
    if (strongestEffort) {
      if (!clickElement(strongestEffort)) {
        pressEscape();
        return advancedResult.modelSelected || Boolean(family);
      }
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
      if (legacyExtended && clickElement(legacyExtended)) {
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
