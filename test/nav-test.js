(() => {
  const visits = [];
  document.querySelector('header nav').addEventListener('click', event => {
    const link = event.target.closest('a');
    if (link) { event.preventDefault(); visits.push(link.getAttribute('href')); }
  });
  const button = document.createElement('button');
  button.textContent = '下部ナビを検証';
  controls.append(button);
  button.onclick = () => {
    visits.length = 0;
    const nav = document.querySelector('.x3t-bottom-nav');
    const expected = ['/home','/explore','/notifications','/i/chat','/fixture-user'];
    const failures = [];
    const links = Array.from(nav.querySelectorAll('a'));
    const menu = nav.querySelector('.x3t-menu-button');
    const rect = menu.getBoundingClientRect();
    if (Math.abs(rect.width-rect.height)>1 || menu.nextElementSibling !== links[0]) failures.push('ホーム隣の正方形でない');
    if (!menu.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2))) failures.push('メニュー操作領域');
    if (document.querySelector('.x3t-tools') || nav.textContent.includes('縮小')) failures.push('旧ボタンが残る');
    if (links.length !== 5) failures.push('5項目なし');
    links.forEach((link, index) => {
      if (link.getAttribute('href') !== expected[index]) failures.push('リンク不一致');
      const rect = link.getBoundingClientRect();
      if (rect.height < 44 || !link.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2))) failures.push('操作領域不一致');
      link.click();
    });
    if (visits.join() !== expected.join()) failures.push('X側クリックに委譲されない');
    X3Reading.sync(false);
    if (document.querySelector('.x3t-bottom-nav')) failures.push('無効時に残る');
    X3Reading.sync(true);
    X3Reading.sync(true);
    if (document.querySelectorAll('.x3t-bottom-nav').length !== 1) failures.push('重複');
    document.querySelector('#result').textContent = failures.length ? 'FAIL: '+failures.join(', ') : 'PASS: 下部5項目・リンク・操作領域・ネイティブ遷移・解除・再表示';
  };
})();
