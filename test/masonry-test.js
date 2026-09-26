(() => {
  const snapshot = () => Array.from(host.querySelectorAll('.x3t-item:not(.x3t-empty)')).map(cell => {
    const rect=cell.firstElementChild.getBoundingClientRect();
    return {id:Number(cell.dataset.index),col:Number(cell.style.getPropertyValue('--x3t-column')),rect,card:cell.firstElementChild};
  });
  document.querySelector('#verify').onclick = () => {
    const failures=[], boxes=snapshot();
    for(let col=0;col<3;col++) {
      const lane=boxes.filter(b=>b.col===col).sort((a,b)=>a.rect.top-b.rect.top);
      for(let i=1;i<lane.length;i++) if(lane[i].rect.top<lane[i-1].rect.bottom-1) failures.push('同じ列で重なる');
    }
    for(const b of boxes) {
      if(b.rect.width<innerWidth/3-20||b.rect.width>innerWidth/3) failures.push('幅が不正');
      const x=b.rect.x+b.rect.width/2,y=b.rect.top+30;
      if(y>150&&y<innerHeight-60&&!b.card.contains(document.elementFromPoint(x,y))) failures.push('操作領域の不一致');
    }
    document.querySelector('#result').textContent=failures.length?'FAIL: '+[...new Set(failures)].join(', '):'PASS: 独立3列・重なりなし・操作領域';
  };
  const button=document.createElement('button');
  button.textContent='Masonryの安定性を検証'; controls.append(button);
  button.onclick=async()=> {
    const settle=()=>new Promise(resolve=>setTimeout(resolve,300));
    const failures=[];
    button.disabled=true;
    const before=snapshot(), first=before.find(b=>b.id===0);
    if(!first) {document.querySelector('#result').textContent='FAIL: 先頭に戻して実行';return;}
    const oldTop=scrollY;
    nodes.get(0).querySelector('article').style.minHeight=(nodes.get(0).querySelector('article').offsetHeight+200)+'px';
    await settle();
    const after=snapshot();
    for(const old of before) {
      const next=after.find(b=>b.id===old.id);
      if(!next) continue;
      if(old.col!==next.col) failures.push('列を移動した');
      const delta=(next.rect.top+scrollY)-(old.rect.top+oldTop);
      if(old.id!==0&&old.col!==first.col&&Math.abs(delta)>2) failures.push('他の列が動いた');
      if(old.id>0&&old.col===first.col&&Math.abs(delta-200)>2) failures.push('同じ列の追従不良');
    }
    if(streamingFixture) {
      count+=4; schedule(); await settle();
      const appended=snapshot();
      for(const old of after) if(appended.find(b=>b.id===old.id)?.col!==old.col) failures.push('追加で列が変化');
    }
    // Exposes the former tall-card/short-card row gap: later cards start
    // inside the tall card's vertical span instead of waiting for its bottom.
    if(packingFixture&&!snapshot().some(b=>b.id>2&&b.rect.top<snapshot().find(x=>x.id===2).rect.bottom-50)) failures.push('行揃えが残る');
    document.querySelector('#result').textContent=failures.length?'FAIL: '+[...new Set(failures)].join(', '):'PASS: 列固定・高さ変更は同じ列のみ・行揃えなし';
  };
  const scrollButton=document.createElement('button');
  scrollButton.textContent='Masonryスクロール回帰'; controls.append(scrollButton);
  scrollButton.onclick=async()=> {
    scrollButton.disabled=true;
    const lanes=new Map(), failures=[];
    for(let step=0;step<12;step++) {
      window.scrollTo(0,step<8?step*500:(11-step)*500);
      await new Promise(resolve=>setTimeout(resolve,300));
      const boxes=snapshot();
      for(const box of boxes) {
        if(lanes.has(box.id)&&lanes.get(box.id)!==box.col) failures.push('再生成時に列が変化');
        lanes.set(box.id,box.col);
      }
      for(let col=0;col<3;col++) {
        const lane=boxes.filter(b=>b.col===col).sort((a,b)=>a.rect.top-b.rect.top);
        for(let i=1;i<lane.length;i++) if(lane[i].rect.top<lane[i-1].rect.bottom-2) failures.push('スクロール中に重なる');
      }
    }
    if(!packingFixture&&!stagedFixture&&!streamingFixture&&(count<=30||removed===0)) failures.push('追加・再生成が未実行');
    document.querySelector('#result').textContent=failures.length?'FAIL: '+[...new Set(failures)].join(', '):'PASS: 追加'+count+'件・再生成・列固定・重なりなし';
  };
})();
