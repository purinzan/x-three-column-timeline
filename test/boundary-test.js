(() => {
  const button = document.createElement('button');
  button.textContent = '空要素・全幅境界の回帰';
  controls.append(button);
  button.onclick = async () => {
    button.disabled = true;
    ro.disconnect(); cancelAnimationFrame(frame); frame = 0;
    window.removeEventListener('scroll', schedule);
    let nativeFrame = 0;
    const nativeLayout = () => {
      nativeFrame = 0;
      let y = 0;
      for (const cell of host.children) {
        cell.style.transform = `translateY(${y}px)`;
        y += cell.getBoundingClientRect().height;
      }
      host.style.height = y+'px';
    };
    const observer = new ResizeObserver(() => {
      if (!nativeFrame) nativeFrame = requestAnimationFrame(nativeLayout);
    });
    const wait = () => new Promise(resolve => setTimeout(resolve, 250));
    const snapshot = cells => cells.map(cell => {
      const r = cell.firstElementChild.getBoundingClientRect();
      return {top:r.top-host.getBoundingClientRect().top,height:r.height,col:Number(cell.style.getPropertyValue('--x3t-column'))};
    });
    const failures = [];
    for (const moduleHeight of [0,100]) {
      observer.disconnect(); host.replaceChildren();
      const cards = [600,180,190,600,550,620].map((height,i) => {
        const cell = document.createElement('div');
        cell.dataset.testid = 'cellInnerDiv';
        cell.innerHTML = `<div><article data-testid="tweet" style="height:${height}px"><a href="/fixture/status/boundary-${moduleHeight}-${i}"><time>境界テスト ${i}</time></a></article></div>`;
        host.append(cell); observer.observe(cell); return cell;
      });
      nativeLayout(); await wait();
      const before = snapshot(cards);
      const module = document.createElement('div');
      module.dataset.testid = 'cellInnerDiv';
      module.innerHTML = `<div style="height:${moduleHeight}px">${moduleHeight?'全幅モジュール':''}</div>`;
      host.insertBefore(module,cards[3]); observer.observe(module);
      nativeLayout(); await wait();
      const after = snapshot(cards);
      after.forEach((p,i) => {
        if (p.col!==before[i].col) failures.push('列変更');
        if (!moduleHeight && Math.abs(p.top-before[i].top)>1) failures.push('空要素で位置変更');
      });
      // Empty placeholders may later become visible modules, then empty again.
      for (const h of [moduleHeight,100,0]) {
        module.firstElementChild.style.height=h+'px';
        cards[0].querySelector('article').style.height='800px';
        await wait();
        const boxes=snapshot(cards), m=snapshot([module])[0];
        for (let col=0;col<3;col++) {
          const lane=boxes.filter(b=>b.col===col).concat(h?[m]:[]).sort((a,b)=>a.top-b.top);
          for (let i=1;i<lane.length;i++) if(lane[i].top<lane[i-1].top+lane[i-1].height-1) failures.push('境界で重なり');
        }
      }
    }
    observer.disconnect(); cancelAnimationFrame(nativeFrame);
    document.querySelector('#result').textContent = failures.length ? 'FAIL: '+[...new Set(failures)].join(', ') : 'PASS: 空要素で移動なし・列固定・全幅モジュール・200px伸長・空/表示切替・重なりなし';
  };
})();
