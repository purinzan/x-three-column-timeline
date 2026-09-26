const assert = require('node:assert/strict');
const {masonry} = require('../layout.js');
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
