const assert = require('node:assert/strict');
const {performance} = require('node:perf_hooks');
const {chooseOrder, place, extent, canAppend, repack} = require('../layout.js');
for (const initial of [1, 2, 4, 5, 7, 8, 28, 29]) {
  const row = {items: Array(initial).fill(null), limit: 30, decided: true};
  while (row.items.length % 3) {
    assert.equal(canAppend(row), true);
    row.items.push(null);
  }
  assert.equal(canAppend(row), row.items.length < 30);
}
const laterHeights = [600,190,180,550,200,620];
assert.deepEqual(repack(laterHeights, [0,1,2,3,4,5]), [0,3,5,1,2,4]);
assert.deepEqual(repack(laterHeights, [0,1,2,3,4,5], 3), [0,1,2,3,4,5]);
const sample = [150, 600, 180, 550, 200, 580];
const chosen = chooseOrder(sample);
assert.deepEqual(chosen, [0, 2, 4, 1, 3, 5]);
assert.equal(extent(sample, [0, 1, 2, 3, 4, 5]) - extent(sample, chosen), 380);
assert.deepEqual(chooseOrder([100, 101, 102, 103, 104, 105]), [0, 1, 2, 3, 4, 5]);
for (let n = 1; n <= 30; n++) {
  for (let seed = 0; seed < 200; seed++) {
    const heights = Array.from({length:n}, (_, i) => 50 + ((seed * 31 + i * 137) % 700));
    const order = chooseOrder(heights), slots = place(heights, order);
    for (const locked of [0,3,6]) {
      const next = repack(heights, order, locked);
      assert.deepEqual(next.slice(0,locked), order.slice(0,locked));
      assert.equal(new Set(next).size,n);
      assert.ok(extent(heights,next) <= extent(heights,order));
    }
    if (n % 3) assert.deepEqual(order.slice(-(n % 3)), Array.from({length:n % 3}, (_, i) => n - n % 3 + i));
    assert.equal(new Set(order).size, n);
    assert.ok(extent(heights, order) <= extent(heights, heights.map((_,i)=>i)));
    let y = 0;
    for (let i = 0; i < n; i += 3) {
      const row = order.slice(i, i+3);
      row.forEach((index, column) => {
        const slot = slots[index];
        assert.equal(slot.column, column);
        assert.ok(Math.abs(index*slot.share+slot.offset-y)<0.001);
      });
      y += Math.ceil(Math.max(...row.map(index=>heights[index])))+8;
    }
    assert.ok(Math.abs(slots.reduce((sum,slot)=>sum+slot.share,0)-y)<0.001);
  }
}
const start=performance.now();
const thirty = Array.from({length:30},(_,i)=>sample[i%6]);
for(let i=0;i<10000;i++) place(thirty,chooseOrder(thirty));
console.log('PASS: 6000 layout cases including partial batches and 30 posts.');
console.log('10000 thirty-post calculations: '+(performance.now()-start).toFixed(1)+' ms (DOM/rendering excluded).');
