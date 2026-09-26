(() => {
  const button = document.createElement('button');
  button.textContent = '検索タブ・画面遷移を検証';
  controls.append(button);
  button.onclick = async () => {
    button.disabled = true;
    const original = location.pathname + location.search;
    const failures = [];
    for (const [url, expected] of [
      ['/search?q=test', true], ['/search?q=test&f=live', true],
      ['/search?q=other&f=live', true], ['/search?q=test&f=user', false],
      ['/search?q=test&f=image', false], ['/search?q=test&f=video', false],
      ['/home', true], ['/fixture-user', false], [original, true]
    ]) {
      history.pushState({}, '', url);
      dispatchEvent(new PopStateEvent('popstate'));
      await new Promise(resolve => setTimeout(resolve, 150));
      if (document.documentElement.classList.contains('x3t-active') !== expected) failures.push(url);
      if (!!host.querySelector('.x3t-card') !== expected) failures.push('カード解除/再適用 '+url);
      if (expected && url.startsWith('/search') && document.querySelector('.x3t-bottom-nav [aria-current]')?.textContent !== '検索') failures.push('検索メニュー選択');
      if (expected) {
        const lanes = [[], [], []];
        for (const cell of host.querySelectorAll('.x3t-item:not(.x3t-empty)')) lanes[Number(cell.style.getPropertyValue('--x3t-column'))].push(cell.firstElementChild.getBoundingClientRect());
        for (const lane of lanes) {
          lane.sort((a,b) => a.top-b.top);
          for (let i=1;i<lane.length;i++) if (lane[i].top < lane[i-1].bottom-1) failures.push('重なり '+url);
        }
      }
    }
    document.querySelector('#result').textContent = failures.length ? 'FAIL: '+failures.join(', ') : 'PASS: 話題・最新・検索語変更・対象外タブ・ホーム復帰・重なりなし';
  };
})();
