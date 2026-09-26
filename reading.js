// Small, event-driven reading aids. No polling, extra requests or scroll handler.
(() => {
  'use strict';
  const root = document.documentElement;
  let menu, bottomNav, opened = false;
  const navItems = [
    ['ホーム', 'a[href="/home"]', 'M3 10l9-7 9 7v11h-6v-7H9v7H3z'],
    ['検索', 'a[href="/explore"]', 'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0'],
    ['通知', 'a[href="/notifications"]', 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4'],
    ['チャット', 'a[data-testid="AppTabBar_DirectMessage_Link"],a[href="/i/chat"],a[href="/messages"]', 'M3 4h18v13H9l-6 4zM7 8h10M7 12h7'],
    ['プロフィール', 'a[data-testid="AppTabBar_Profile_Link"]', 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 6 0 0 1 16 0v2']
  ];
  function syncNav() {
    const header = document.querySelector('header[role="banner"]');
    for (const [index, [, selector]] of navItems.entries()) {
      const link = bottomNav.querySelectorAll('a')[index];
      const source = header?.querySelector(selector);
      const href = source?.getAttribute('href');
      if (href && link.getAttribute('href') !== href) link.setAttribute('href', href);
      if (href) link.removeAttribute('aria-disabled');
    }
  }
  function createNav() {
    bottomNav = document.createElement('nav');
    bottomNav.className = 'x3t-bottom-nav';
    bottomNav.setAttribute('aria-label', 'Xのメニュー');
    bottomNav.append(menu);
    navItems.forEach(([label, selector, path], index) => {
      const link = document.createElement('a');
      link.setAttribute('aria-disabled', 'true');
      if (index === 0) link.setAttribute('aria-current', 'page');
      link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg><span>'+label+'</span>';
      link.onclick = event => {
        const source = document.querySelector('header[role="banner"]')?.querySelector(selector);
        if (!source) { event.preventDefault(); return; }
        // Preserve native SPA navigation; modified clicks retain link behavior.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        source.click();
      };
      bottomNav.append(link);
    });
    syncNav();
    document.body.append(bottomNav);
  }
  let anchor = null, frame = 0, inputVersion = 0;
  const mediaNodes = new Set();

  function closeMenu(focus = false) {
    opened = false;
    root.classList.remove('x3t-nav-open');
    menu?.setAttribute('aria-expanded', 'false');
    if (focus) menu?.focus({preventScroll: true});
  }
  function cancelAnchor() {
    inputVersion++;
    anchor = null;
    cancelAnimationFrame(frame);
    frame = 0;
  }
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    window.addEventListener(event, cancelAnchor, {passive: true, capture: true});
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && opened) { closeMenu(true); event.preventDefault(); }
  });
  document.addEventListener('click', event => {
    if (opened && !menu?.contains(event.target) && !event.target.closest('header[role="banner"]')) closeMenu();
    else if (opened && event.target.closest('header[role="banner"] a[href]')) closeMenu();
  });

  function sync(on) {
    if (!on) {
      closeMenu(); cancelAnchor();
      bottomNav?.remove(); bottomNav = null;
      root.classList.remove('x3t-compact');
      for (const node of mediaNodes) node.classList.remove('x3t-tall-media', 'x3t-media-fit');
      mediaNodes.clear();
      return;
    }
    root.classList.add('x3t-compact');
    if (bottomNav?.isConnected) {
      // Retry only while X's navigation is still mounting; no scroll polling.
      if (bottomNav?.querySelector('[aria-disabled]')) syncNav();
      return;
    }
    menu = document.createElement('button');
    menu.type = 'button';
    menu.className = 'x3t-menu-button';
    menu.setAttribute('aria-label', 'メニュー');
    menu.title = 'メニュー';
    menu.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
    menu.setAttribute('aria-expanded', 'false');
    menu.onclick = () => {
      const header = document.querySelector('header[role="banner"]');
      if (!header) return;
      opened = !opened;
      root.classList.toggle('x3t-nav-open', opened);
      menu.setAttribute('aria-expanded', String(opened));
      if (opened) header.querySelector('a[href],button,[tabindex="0"]')?.focus({preventScroll: true});
    };
    createNav();
  }

  function refresh(content) {
    let changed = false;
    const setClass = (node, name, on) => {
      if (node.classList.contains(name) === on) return;
      node.classList.toggle(name, on);
      changed = true;
    };
    // Only known media containers with an actual, loaded portrait image/video.
    // Unknown X markup is left alone. Never rewrite native inline styles.
    for (const box of content.querySelectorAll('[data-testid="tweetPhoto"], [data-testid="videoPlayer"]')) {
      const visual = box.querySelector('video') || box.querySelector('img');
      if (!visual) continue;
      const width = visual.videoWidth || visual.naturalWidth;
      const height = visual.videoHeight || visual.naturalHeight;
      const tall = width > 0 && height / width > 1.25;
      setClass(box, 'x3t-tall-media', tall);
      mediaNodes.add(box);
      for (let node = visual; node && node !== box; node = node.parentElement) {
        setClass(node, 'x3t-media-fit', tall);
        mediaNodes.add(node);
      }
    }
    return changed;
  }
  function beforeLayout() {
    if (anchor || scrollY < 1 || opened) return;
    // Hit-test a few fixed points, not every post on every scroll.
    for (const y of [Math.min(160, innerHeight / 3), innerHeight / 2]) {
      for (const x of [innerWidth / 6, innerWidth / 2, innerWidth * 5 / 6]) {
        const card = document.elementFromPoint(x, y)?.closest('.x3t-card');
        if (!card || card.parentElement.classList.contains('x3t-empty')) continue;
        anchor = {card, top: card.getBoundingClientRect().top, scroll: scrollY, input: inputVersion};
        return;
      }
    }
  }
  function afterLayout() {
    for (const node of mediaNodes) if (!node.isConnected) mediaNodes.delete(node);
    if (!anchor) return;
    cancelAnimationFrame(frame);
    // Allow X's ResizeObserver/native positions to settle. New input or native
    // scroll anchoring wins; never drag the user back while they are scrolling.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const saved = anchor; anchor = null; frame = 0;
        if (!saved || saved.input !== inputVersion || !saved.card.isConnected || Math.abs(scrollY - saved.scroll) > 1) return;
        const delta = saved.card.getBoundingClientRect().top - saved.top;
        if (Math.abs(delta) > 1 && Math.abs(delta) < innerHeight) window.scrollBy({top: delta, behavior: 'instant'});
      });
    });
  }
  document.addEventListener('load', event => {
    const card = event.target.closest?.('.x3t-card');
    if (card && root.classList.contains('x3t-active')) { beforeLayout(); refresh(card); afterLayout(); }
  }, true);
  document.addEventListener('loadedmetadata', event => {
    const card = event.target.closest?.('.x3t-card');
    if (card && root.classList.contains('x3t-active')) { beforeLayout(); refresh(card); afterLayout(); }
  }, true);
  globalThis.X3Reading = {sync, refresh, beforeLayout, afterLayout};
})();
