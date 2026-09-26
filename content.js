(() => {
  'use strict';
  const POST = 'article[data-testid="tweet"]';
  const CELL = '[data-testid="cellInnerDiv"]';
  let enabled = true, stream = null, scheduled = false;
  const records = new Map();
  const laneAssignments = new Map();
  let blockSequence = 0;
  const mounted = new Map();
  const bindings = new WeakMap();
  const sizes = new WeakMap();
  const hiddenStates = new WeakMap();
  const dirtyCells = new Set();
  let structureDirty = true;
  // Read native inline translation only: no computed style/layout query.
  function nativeTop(cell) {
    const transform = cell.style.transform;
    if (!transform || transform === 'none') return null;
    try {
      const matrix = new DOMMatrixReadOnly(transform);
      if (!matrix.is2D || matrix.a !== 1 || matrix.d !== 1 || matrix.b || matrix.c) return null;
      const top = cell.style.top;
      if (top && top !== 'auto' && !/^-?[\d.]+px$/.test(top)) return null;
      return matrix.m42 + (parseFloat(top) || 0);
    } catch { return null; }
  }
  function syncNativeTop(cell) {
    const top = nativeTop(cell);
    if (top !== null) setStyle(cell, '--x3t-native-top', top + 'px');
  }
  const discovery = new MutationObserver(() => { if (active()) schedule(); });
  const lifecycle = new MutationObserver(() => {
    if (!stream?.isConnected || !active()) schedule();
  });
  function invalidate(cell) {
    if (cell?.parentElement === stream) { dirtyCells.add(cell); schedule(); }
  }
  const mutations = new MutationObserver(changes => {
    for (const change of changes) {
      if (change.target === stream) {
        // Native total-height updates do not add/remove posts. Rebuilding on
        // these style changes would turn every lane resize into a full scan.
        if (change.type === 'childList') { structureDirty = true; schedule(); }
        continue;
      }
      const cell = change.target.closest?.(CELL);
      if (!cell || cell.parentElement !== stream) continue;
      if (change.type === 'attributes') {
        const strip = value => (value || '').replace(/\bx3t-[\w-]+\b/g, '').trim();
        if (change.attributeName === 'class' && strip(change.oldValue) === strip(change.target.getAttribute('class'))) continue;
        if (change.target === cell && change.attributeName === 'style') {
          // X can reposition a cell without resizing its content. Correct the
          // translation immediately, including when its ResizeObserver lags.
          const position = value => (value || '').match(/(?:^|;)\s*(?:transform|top)\s*:[^;]*/g)?.join('') || '';
          if (position(change.oldValue) !== position(cell.getAttribute('style'))) syncNativeTop(cell);
          const visibility = value => (value || '').match(/(?:^|;)\s*(?:display|visibility)\s*:[^;]*/g)?.join('') || '';
          if (visibility(change.oldValue) === visibility(cell.getAttribute('style'))) continue;
        }
      }
      invalidate(cell);
    }
  });
  const resize = new ResizeObserver(entries => {
    for (const entry of entries) {
      const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.offsetHeight;
      if (sizes.get(entry.target) === height) continue;
      sizes.set(entry.target, height);
      invalidate(entry.target.parentElement);
    }
  });
  function active() {
    return enabled && (/^\/home\/?$/.test(location.pathname) || ['localhost', '127.0.0.1'].includes(location.hostname));
  }
  function cleanCell(cell, content) {
    resize.unobserve(content);
    const record = bindings.get(cell);
    if (record?.cell === cell) { record.cell = null; record.content = null; }
    bindings.delete(cell);
    cell.classList.remove('x3t-item', 'x3t-empty');
    for (const name of ['--x3t-share', '--x3t-offset', '--x3t-column', '--x3t-native-top']) cell.style.removeProperty(name);
    content.classList.remove('x3t-card');
    mounted.delete(cell);
  }
  function clear() {
    mutations.disconnect();
    lifecycle.disconnect();
    for (const [cell, content] of mounted) cleanCell(cell, content);
    document.querySelectorAll('.x3t-path').forEach(el => el.classList.remove('x3t-path'));
    stream?.classList.remove('x3t-stream');
    stream = null;
    records.clear();
    laneAssignments.clear();
    blockSequence = 0;
    dirtyCells.clear();
    structureDirty = true;
    discovery.observe(document.body, {childList: true, subtree: true});
  }
  function keyFor(cell) {
    return cell.querySelector(POST)?.querySelector('time')?.closest('a')?.getAttribute('href') || cell;
  }
  function setStyle(cell, name, value) {
    if (cell.style.getPropertyValue(name) !== value) cell.style.setProperty(name, value);
  }
  function apply() {
    scheduled = false;
    document.documentElement.classList.toggle('x3t-active', active());
    X3Reading.sync(active());
    if (!active()) { clear(); return; }
    if (!stream?.isConnected) {
      const primary = document.querySelector('[data-testid="primaryColumn"]');
      const first = primary?.querySelector(CELL + ':has(' + POST + ')');
      if (!first) { if (stream) clear(); return; }
      clear();
      stream = first.parentElement;
      discovery.disconnect();
      stream.classList.add('x3t-stream');
      for (let el = stream.parentElement; el && el !== primary; el = el.parentElement) el.classList.add('x3t-path');
      mutations.observe(stream, {childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['style', 'class', 'hidden']});
      // Direct child lists only: detect replaced containers without observing
      // notifications, menus or other unrelated subtrees.
      for (let el = stream.parentElement; el; el = el.parentElement) lifecycle.observe(el, {childList: true});
    }
    const changed = new Set(dirtyCells);
    X3Reading.beforeLayout();
    dirtyCells.clear();
    let rebuild = structureDirty;
    structureDirty = false;
    for (const cell of changed) {
      const record = bindings.get(cell);
      if (mounted.get(cell) !== cell.firstElementChild || (record && record.key !== keyFor(cell))) rebuild = true;
    }
    if (rebuild) for (const [cell, content] of mounted) if (!stream.contains(cell)) cleanCell(cell, content);
    // Check the actual article, not just the existence of its DOM node.
    // Do not use opacity: X temporarily fades posts while measuring them.
    const hidden = { has: cell => hiddenStates.get(cell) === true };
    let visibilityChanged = false;
    const articles = new Map();
    // Batch media class writes before any article geometry reads. Reuse the
    // lookup and invalidate only heights affected by these writes.
    for (const cell of rebuild ? stream.children : changed) {
      if (cell.parentElement !== stream) continue;
      if (!cell.matches(CELL) || cell.children.length !== 1) continue;
      const article = cell.querySelector(POST);
      articles.set(cell, article);
      if (article && X3Reading.refresh(cell)) sizes.delete(cell.firstElementChild);
    }
    for (const [cell, article] of articles) {
      if (!article) {
        // Some blockers remove the article instead of hiding it.
        if (mounted.has(cell) && !cell.textContent.trim() && !cell.querySelector('img,video,button,[role="progressbar"]')) {
          if (hiddenStates.get(cell) !== true) visibilityChanged = true;
          hiddenStates.set(cell, true);
        }
        continue;
      }
      const style = getComputedStyle(article);
      const absent = article.offsetHeight === 0 ||
        style.visibility === 'hidden' || style.visibility === 'collapse';
      if (hiddenStates.has(cell) && hiddenStates.get(cell) !== absent) visibilityChanged = true;
      hiddenStates.set(cell, absent);
    }
    // Rare visibility transitions must release the old slot and regroup.
    // This is not run for ordinary scrolls or image height changes.
    if (visibilityChanged) { records.clear(); rebuild = true; }
    let row = null;
    const visibleRows = new Set();
    if (!rebuild) for (const cell of changed) {
      const record = bindings.get(cell);
      if (record && cell.parentElement === stream) visibleRows.add(record.row);
    }
    for (const cell of rebuild ? stream.children : []) {
      if (!cell.matches(CELL) || (!cell.querySelector(POST) && !hidden.has(cell)) || cell.children.length !== 1) { row = null; continue; }
      const content = cell.firstElementChild;
      if (hidden.has(cell)) {
        const previous = bindings.get(cell);
        if (previous?.cell === cell) { previous.cell = null; previous.content = null; }
        bindings.delete(cell);
        if (mounted.get(cell) !== content) {
          if (mounted.has(cell)) cleanCell(cell, mounted.get(cell));
          mounted.set(cell, content);
          resize.observe(content);
        }
        cell.classList.toggle('x3t-item', true);
        cell.classList.toggle('x3t-empty', true);
        content.classList.toggle('x3t-card', true);
        setStyle(cell, '--x3t-share', '0px');
        setStyle(cell, '--x3t-offset', '0px');
        continue;
      }
      cell.classList.toggle('x3t-empty', false);
      const key = keyFor(cell);
      let record = records.get(key);
      if (!record) {
        // Keep a bounded candidate block open for incremental arrivals.
        // Only append directly after the retained tail, never into the middle
        // of a recycled block or across a native full-width module.
        let next = row?.items.at(-1)?.cell?.nextElementSibling;
        while (next && hidden.has(next)) next = next.nextElementSibling;
        if (!X3Layout.canAppend(row) || next !== cell) {
          const previousBlock = next === cell ? row : null;
          row = { items: [], limit: 30, sequence: blockSequence++, previous: previousBlock, carry: previousBlock?.endCarry ?? [0,0,0] };
          if (previousBlock) previousBlock.next = row;
        }
        record = { key, row, column: laneAssignments.get(key), height: 0 };
        row.items.push(record);
        records.set(key, record);
      } else row = record.row;
      visibleRows.add(row);
      const previous = bindings.get(cell);
      if (previous && previous !== record && previous.cell === cell) {
        previous.cell = null;
        previous.content = null;
      }
      if (mounted.get(cell) !== content) {
        if (mounted.has(cell)) cleanCell(cell, mounted.get(cell));
        cell.classList.add('x3t-item');
        content.classList.add('x3t-card');
        setStyle(cell, '--x3t-column', String(record.column ?? 0));
        mounted.set(cell, content);
        resize.observe(content);
      }
      record.cell = cell;
      record.content = content;
      bindings.set(cell, record);
    }
    // Read natural card heights before writes. X still owns cell positions,
    // list height, recycling and pagination; never jump or hide the page.
    for (const row of visibleRows) {
      for (const item of row.items) {
        if (item.cell?.isConnected) item.height = sizes.get(item.content) ?? item.content.offsetHeight;
      }
    }
    // Propagate cached lane ends through subsequent blocks. No extra DOM reads
    // are needed for unchanged successors, even across the 30-item boundary.
    for (const row of visibleRows) if (row.next) visibleRows.add(row.next);
    // Include mounted block origins, without remeasuring unchanged heights.
    // Linked blocks share one coordinate system, not independent native bases.
    for (const cell of mounted.keys()) {
      const record = bindings.get(cell);
      if (record?.cell === cell) visibleRows.add(record.row);
    }
    const orderedRows = [...visibleRows].sort((a,b) => a.sequence-b.sequence);
    const origins = new Map();
    for (const row of orderedRows) {
      const firstIndex = row.items.findIndex(item => item.cell?.isConnected);
      const firstTop = firstIndex < 0 ? null : nativeTop(row.items[firstIndex].cell);
      const previousEnd = origins.get(row.previous);
      const origin = previousEnd ?? (firstTop === null ? null : firstTop - (row.slots?.[firstIndex]?.share ?? 0) * firstIndex);
      const heights = row.items.map(item => item.height);
      if (!row.layoutHeights || !row.layoutCarry || row.carry.some((value,index) => value !== row.layoutCarry[index]) ||
          heights.length !== row.layoutHeights.length ||
          heights.some((height, index) => height !== row.layoutHeights[index])) {
        const result = X3Layout.masonry(heights, row.items.map(item => item.column), row.carry);
        row.slots = result.slots;
        row.endCarry = result.carry;
        row.items.forEach((item,index) => {
          item.column = result.columns[index];
          laneAssignments.set(item.key, item.column);
        });
        row.layoutHeights = heights;
        row.layoutCarry = [...row.carry];
      }
      if (row.next) row.next.carry = row.endCarry;
      const slots = row.slots;
      if (origin !== null) origins.set(row, origin + (slots[0]?.share ?? 0) * slots.length);
      for (const [index, item] of row.items.entries()) {
        if (!item.cell?.isConnected) continue;
        setStyle(item.cell, '--x3t-column', String(slots[index].column));
        setStyle(item.cell, '--x3t-share', slots[index].share + 'px');
        const top = nativeTop(item.cell);
        if (origin !== null && top !== null) {
          setStyle(item.cell, '--x3t-native-top', top + 'px');
          setStyle(item.cell, '--x3t-offset', (origin + slots[index].share * index + slots[index].offset) + 'px');
        } else {
          item.cell.style.removeProperty('--x3t-native-top');
          setStyle(item.cell, '--x3t-offset', slots[index].offset + 'px');
        }
      }
    }
    // Bound retained row identities used when X recycles DOM nodes.
    X3Reading.afterLayout();
    if (rebuild && records.size > 600) for (const [key, item] of records) {
      if (!item.row.items.some(member => member.cell?.isConnected)) { records.delete(key); laneAssignments.delete(key); }
      if (records.size <= 450) break;
    }
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }
  async function start() {
    try {
      if (globalThis.chrome?.storage?.local) enabled = (await chrome.storage.local.get('x3tEnabled')).x3tEnabled !== false;
    } catch { /* Keep the default if extension storage is unavailable. */ }
    discovery.observe(document.body, {childList: true, subtree: true});
    window.addEventListener('popstate', schedule);
    window.navigation?.addEventListener('navigatesuccess', schedule);
    if (globalThis.chrome?.storage?.onChanged) chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.x3tEnabled) { enabled = changes.x3tEnabled.newValue !== false; schedule(); }
    });
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
