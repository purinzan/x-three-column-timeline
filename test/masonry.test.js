const assert = require('node:assert/strict');
const {masonry, needsRegroup} = require('../layout.js');
const blockA = {sequence:0,items:[]}, blockB = {sequence:1,items:[]};
const a = {row:blockA}, b = {row:blockA}, c = {row:blockB};
blockA.items.push(a,b); blockB.items.push(c);
assert.equal(needsRegroup([a,b,c,{}]),false, 'tail append');
assert.equal(needsRegroup([b,c]),false, 'virtualized prefix removal');
assert.equal(needsRegroup([a,{},b,c]),true, 'insert inside retained block');
assert.equal(needsRegroup([{},a,b]),true, 'prepend');
assert.equal(needsRegroup([b,a,c]),true, 'reorder within block');
assert.equal(needsRegroup([a,c,b]),true, 'interleaved blocks');
assert.equal(needsRegroup([c,a]),true, 'reordered blocks');
assert.equal(needsRegroup([a,null,b]),true, 'new module splits block');
assert.equal(needsRegroup([a,b,null,c]),false, 'existing module boundary');
function absolute(result, base=0) {
  return result.slots.map((slot,i)=> ({column:slot.column, top:base+i*slot.share+slot.offset}));
}
for (let seed=0; seed<200; seed++) {
  const heights = Array.from({length:90},(_,i)=>50+(seed*31+i*137)%700);
  const full = masonry(heights), all = absolute(full);
  let carry=[0,0,0], base=0, chunked=[];
  for (let start=0; start<90; start+=30) {
    const part=masonry(heights.slice(start,start+30),[],carry);
    chunked.push(...absolute(part,base));
    base+=part.slots.reduce((sum,s)=>sum+s.share,0);
    carry=part.carry;
  }
  all.forEach((slot,i)=> {
    assert.equal(slot.column,chunked[i].column);
    assert.ok(Math.abs(slot.top-chunked[i].top)<0.001);
  });
  const grown=[...heights]; grown[0]+=333;
  const updated=masonry(grown,full.columns), after=absolute(updated);
  assert.deepEqual(updated.columns,full.columns);
  all.forEach((slot,i)=> {
    const shift=i>0&&slot.column===all[0].column?333:0;
    assert.ok(Math.abs(after[i].top-slot.top-shift)<0.001);
  });
  for(let col=0;col<3;col++) {
    const indices=full.columns.map((c,i)=>c===col?i:-1).filter(i=>i>=0);
    for(let k=1;k<indices.length;k++) {
      const a=indices[k-1],b=indices[k];
      assert.ok(all[b].top>=all[a].top+heights[a]+7.999);
    }
  }
}
let heights=[600,180], assigned=masonry(heights).columns;
heights.push(190,550,200,620);
const added=masonry(heights,assigned);
assert.deepEqual(added.columns.slice(0,2),assigned);
assert.ok(absolute(added)[3].top<600);
console.log('PASS: masonry lane stability, same-lane height propagation, 30-block continuity, incremental append (200 x 90 posts).');

// A zero-height native placeholder is transparent to all three lane ends.
const baseHeights = [602,182,192,602,552,622];
const base = masonry(baseHeights), baseSlots = absolute(base);
for (const moduleHeight of [0,100]) {
  const hs = [...baseHeights.slice(0,3),moduleHeight,...baseHeights.slice(3)];
  const cols = [...base.columns.slice(0,3),-1,...base.columns.slice(3)];
  const result = masonry(hs,cols), positions = absolute(result);
  if (!moduleHeight) baseSlots.forEach((p,i) => assert.ok(Math.abs(p.top-positions[i<3?i:i+1].top)<0.001));
  else {
    assert.equal(positions[3].top,610);
    positions.slice(4).forEach(p => assert.ok(p.top >= 718));
  }
  hs[0] += 200;
  const grown = absolute(masonry(hs,cols));
  for (let col=0;col<3;col++) {
    let end=0;
    grown.forEach((p,i) => {
      if (p.column!==col && p.column!==-1) return;
      if (p.column===-1 && hs[i]===0) return;
      assert.ok(p.top>=end-0.001, 'module/card overlap after growth');
      end=p.top+hs[i];
    });
  }
  // A module at the start of a subsequent block must consume incoming carry.
  const first=masonry(hs.slice(0,3),cols.slice(0,3));
  const second=masonry(hs.slice(3),cols.slice(3),first.carry);
  const offset=first.slots.reduce((sum,s)=>sum+s.share,0);
  absolute(second,offset).forEach((p,i)=>assert.ok(Math.abs(p.top-grown[i+3].top)<0.001));
}
console.log('PASS: empty placeholders, full-width modules, delayed growth and cross-block carry.');
