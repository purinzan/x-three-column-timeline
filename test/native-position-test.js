(() => {
  const button = document.createElement('button');
  button.textContent = 'ネイティブ位置ずれ回帰';
  controls.append(button);
  button.onclick = async () => {
    button.disabled = true;
    const wait = () => new Promise(resolve => setTimeout(resolve, 100));
    const failures = [];
    const check = () => {
      const lanes = [[], [], []];
      for (const cell of host.querySelectorAll('.x3t-item:not(.x3t-empty)')) {
        lanes[Number(cell.style.getPropertyValue('--x3t-column'))].push(cell.firstElementChild.getBoundingClientRect());
      }
      for (const lane of lanes) {
        lane.sort((a,b) => a.top-b.top);
        for (let i=1;i<lane.length;i++) {
          const gap = lane[i].top-lane[i-1].bottom;
          if (gap < -1) failures.push('ネイティブ位置更新で重なる');
          if (Math.abs(gap-8) > 2) failures.push('列内の間隔が不正');
        }
      }
    };
    // Freeze the virtualizer, then emulate delayed/non-uniform native offsets
    // without changing any card height. Include a 30-card block boundary.
    ro.disconnect();
    cancelAnimationFrame(frame); frame = 0;
    count = 36;
    for(let i=0;i<count;i++) {
      let cell = nodes.get(i);
      if (!cell) { cell = create(i); host.append(cell); }
      cell.style.transform = `translateY(${i*80}px)`;
    }
    ro.disconnect();
    await wait(); check();
    const before = Array.from(nodes.values(), cell => cell.firstElementChild.getBoundingClientRect().top);
    for(let i=1;i<count;i++) nodes.get(i).style.transform = `translateY(${i*11}px)`;
    await wait(); check();
    Array.from(nodes.values()).forEach((cell,index) => {
      if (Math.abs(cell.firstElementChild.getBoundingClientRect().top-before[index]) > 1) failures.push('ネイティブ更新でカードが移動');
    });
    // The SVG attribute path must also remain usable after 0.8.1's fix.
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    nodes.get(0).querySelector('article').append(svg);
    svg.setAttribute('class','native-icon');
    await wait(); check();
    document.querySelector('#result').textContent = failures.length ? 'FAIL: '+[...new Set(failures)].join(', ') : 'PASS: 36件・不均一/遅延したネイティブ位置・ブロック境界・SVG';
  };
})();
