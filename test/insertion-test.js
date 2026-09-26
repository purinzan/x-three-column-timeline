(() => {
  const button = document.createElement('button');
  button.textContent = '途中挿入・順序変更の重なり回帰';
  controls.append(button);
  button.onclick = async () => {
    button.disabled = true;
    const wait = () => new Promise(resolve => setTimeout(resolve, 180));
    const failures = [];
    const columns = new Map();
    const check = label => {
      const lanes = [[], [], []];
      for (const cell of host.querySelectorAll('.x3t-item:not(.x3t-empty)')) {
        const column = Number(cell.style.getPropertyValue('--x3t-column'));
        if (columns.has(cell) && columns.get(cell) !== column) failures.push(label + ': 列が変化');
        columns.set(cell, column);
        lanes[column].push(cell.firstElementChild.getBoundingClientRect());
      }
      for (const lane of lanes) {
        lane.sort((a,b) => a.top-b.top);
        for (let i=1; i<lane.length; i++) if (lane[i].top < lane[i-1].bottom-1) failures.push(label + ': 重なり');
      }
    };
    ro.disconnect(); cancelAnimationFrame(frame); frame = 0;
    host.replaceChildren(); nodes.clear(); count = 36;
    for (let i=0; i<count; i++) {
      const cell = create(i);
      cell.style.transform = `translateY(${i*100}px)`;
      host.append(cell);
    }
    ro.disconnect();
    await wait(); check('初期');
    // A retained block is split by new posts arriving inside it, not at its tail.
    for (let i=36; i<39; i++) {
      const cell = create(i);
      cell.style.transform = `translateY(${i*100}px)`;
      host.insertBefore(cell, nodes.get(1));
    }
    ro.disconnect();
    await wait(); check('途中挿入');
    host.insertBefore(nodes.get(20), nodes.get(2));
    await wait(); check('順序変更');
    nodes.get(0).querySelector('article').style.minHeight = '700px';
    await wait(); check('後から高さ変更');
    document.querySelector('#result').textContent = failures.length ? 'FAIL: '+[...new Set(failures)].join(', ') : 'PASS: 39件・途中挿入・順序変更・高さ変更・列固定・重なりなし';
  };
})();
