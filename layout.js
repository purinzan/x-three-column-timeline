/* Pure, bounded calculations; no DOM reads, timers or network requests. */
(() => {
  'use strict';
  function extent(heights, order) {
    let total = 0;
    for (let i = 0; i < order.length; i += 3) {
      total += Math.ceil(Math.max(...order.slice(i, i + 3).map(index => heights[index]))) + 8;
    }
    return total;
  }
  function chooseOrder(heights) {
    const original = heights.map((_, index) => index);
    if (heights.length < 6 || heights.length > 30) return original;
    // Keep an incomplete tail at the end so later arrivals can fill it without
    // moving any of the already displayed, complete rows.
    const end = heights.length - heights.length % 3;
    const sorted = original.slice(0, end).sort((a, b) => heights[a] - heights[b] || a - b);
    const groups = [];
    for (let i = 0; i < sorted.length; i += 3) groups.push(sorted.slice(i, i + 3).sort((a, b) => a - b));
    groups.sort((a, b) => a[0] - b[0]);
    const candidate = groups.flat().concat(original.slice(end));
    return extent(heights, original) - extent(heights, candidate) >= 16 ? candidate : original;
  }
  function place(heights, order) {
    const share = extent(heights, order) / heights.length;
    const slots = [];
    let y = 0;
    for (let i = 0; i < order.length; i += 3) {
      const row = order.slice(i, i + 3);
      row.forEach((index, column) => { slots[index] = { column, share, offset: y - share * index }; });
      y += Math.ceil(Math.max(...row.map(index => heights[index]))) + 8;
    }
    return slots;
  }
  function canAppend(row) {
    return !!row && row.items.length < row.limit;
  }
  function repack(heights, current, locked = 0) {
    // Keep read rows and the native order of newly arriving tail items intact.
    const end = Math.min(current.length, Math.ceil(locked / 3) * 3);
    const tail = current.slice(end);
    const candidate = current.slice(0, end).concat(chooseOrder(tail.map(i => heights[i])).map(i => tail[i]));
    return extent(heights, current) - extent(heights, candidate) >= 16 ? candidate : current;
  }
  function masonry(heights, columns = [], carry = [0, 0, 0]) {
    const ends = [...carry], positions = [], assigned = [];
    heights.forEach((height, index) => {
      let column = columns[index];
      if (!Number.isInteger(column) || column < 0 || column > 2) {
        column = ends.indexOf(Math.min(...ends));
      }
      assigned.push(column);
      positions.push(ends[column]);
      ends[column] += Math.max(0, height) + 8;
    });
    // Carry short-lane gaps across measurement blocks; do not align every 30.
    // A tiny native slice avoids zero-height cells in X's virtualizer.
    const total = Math.max(heights.length, ...ends, 0);
    const share = heights.length ? total / heights.length : 0;
    return {columns: assigned, carry: ends.map(end => end - total),
      slots: positions.map((top, index) => ({column: assigned[index], share, offset: top - share * index}))};
  }
  const api = { chooseOrder, place, extent, canAppend, repack, masonry };
  if (typeof module !== 'undefined') module.exports = api;
  else globalThis.X3Layout = api;
})();
