(() => {
  const button = document.createElement('button');
  button.textContent = '読みやすさを検証';
  document.querySelector('#controls').append(button);
  const settle = () => new Promise(resolve => setTimeout(resolve, 300));
  button.onclick = async () => {
    const failures = [];
    const result = document.querySelector('#result');
    const portrait = document.createElement('div');
    portrait.dataset.testid = 'tweetPhoto';
    portrait.innerHTML = '<div style="position:relative;padding-bottom:200%"><img alt="縦長テスト画像：上端から下端まで表示" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" src="data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="600"><rect width="300" height="600" fill="#d4ecff"/><text x="20" y="35">TOP</text><circle cx="150" cy="300" r="100" fill="#629fe8"/><text x="20" y="585">BOTTOM</text></svg>') + '"></div>';
    const article = host.querySelector('article');
    article.append(portrait);
    await settle();
    const image = portrait.querySelector('img');
    const compactHeight = portrait.getBoundingClientRect().height;
    if (compactHeight > Math.min(innerHeight / 2, 400) + 1 || getComputedStyle(image).objectFit !== 'contain') failures.push('画像の縮小');
    const menu = document.querySelector('.x3t-menu-button');
    menu.click();
    const nav = document.querySelector('header');
    if (getComputedStyle(nav).display === 'none' || !nav.contains(document.activeElement)) failures.push('メニュー開く');
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    if (getComputedStyle(nav).display !== 'none' || document.activeElement !== menu) failures.push('メニュー閉じる');
    window.scrollTo(0, 800); await settle();
    const card = document.elementFromPoint(innerWidth / 6, 160)?.closest('.x3t-card');
    if (!card || card.contains(article)) failures.push('位置基準なし（変化する投稿より下が必要）');
    else {
      const before = card.getBoundingClientRect().top;
      article.style.minHeight = (article.offsetHeight + 90) + 'px';
      await settle();
      const delta = card.getBoundingClientRect().top - before;
      if (Math.abs(delta) > 2) failures.push('位置ずれ ' + delta.toFixed(1) + 'px');
    }
    window.scrollTo(0, 0); await settle();
    result.textContent = failures.length ? 'FAIL: ' + failures.join(', ') : 'PASS: 画像縮小維持・メニュー・高さ変更時の読書位置';
  };
})();
