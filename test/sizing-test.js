(() => {
  const button = document.createElement('button');
  button.textContent = '初回幅・対象範囲・重複更新を検証';
  controls.append(button);
  button.onclick = () => {
    const failures = [];
    const sandbox = document.createElement('div');
    sandbox.className = 'x3t-stream';
    sandbox.style.cssText = 'position:fixed;left:-2000px;top:0;width:600px!important';
    document.body.append(sandbox);
    const cell = document.createElement('div');
    cell.dataset.testid = 'cellInnerDiv';
    cell.style.cssText = 'position:relative;width:100%';
    cell.innerHTML = '<div><article data-testid="tweet"><div data-quote>引用本文</div><div data-testid="tweetPhoto"><img></div></article></div>';
    sandbox.append(cell);
    const card = cell.firstElementChild;
    try {
      // Same synchronous turn as native insertion, BEFORE extension tagging.
      const early = card.getBoundingClientRect().width;
      if (Math.abs(early - (600 - 32) / 3) > 1) failures.push('初回が3列幅でない');
      card.classList.add('x3t-card');
      if (Math.abs(card.getBoundingClientRect().width - early) > 1) failures.push('タグ付与で幅が変化');
      if (card.querySelector('[data-quote]').getBoundingClientRect().width < early / 2) failures.push('引用もさらに3分割');
      card.classList.remove('x3t-card');
      sandbox.classList.remove('x3t-stream');
      if (Math.abs(card.getBoundingClientRect().width - 600) > 1) failures.push('対象外に適用');
      sandbox.classList.add('x3t-stream');
      const module = document.createElement('div');
      module.dataset.testid = 'cellInnerDiv';
      module.style.cssText = 'position:relative;width:100%';
      module.innerHTML = '<div>全幅モジュール</div>';
      sandbox.append(module);
      if (Math.abs(module.firstElementChild.getBoundingClientRect().width - 600) > 1) failures.push('非投稿を縮小');
      cell.append(document.createElement('div'));
      if (Math.abs(card.getBoundingClientRect().width - 600) > 1) failures.push('複数子セルを縮小');
      cell.lastElementChild.remove();
      const observer = new MutationObserver(() => {});
      observer.observe(card, {attributes:true, subtree:true});
      X3Reading.refresh(card);
      observer.takeRecords();
      const changed = X3Reading.refresh(card);
      if (changed || observer.takeRecords().length) failures.push('未変更メディアを書き直す');
      observer.disconnect();
    } finally { sandbox.remove(); X3Reading.afterLayout(); }
    document.querySelector('#result').textContent = failures.length ? 'FAIL: ' + failures.join(', ') : 'PASS: 初回から3列幅・非投稿/対象外/引用の範囲・未変更メディアの書き込みなし';
  };
})();
