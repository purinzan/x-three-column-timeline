(() => {
  'use strict';
  const speeds = {slow:40, normal:80, fast:140}; // CSS pixels per second
  let on=false, layout=true, speed='normal', frame=0, last=null, pauseUntil=0;
  let velocity=0, remainder=0;
  let held=false, editing=false, nextCheck=0;
  // Let reading-position correction yield while this controller is moving.
  globalThis.X3AutoScroll = {isMoving: () => velocity > 0};
  const eligible = () => layout && (/^\/home\/?$/.test(location.pathname) ||
    (/^\/search\/?$/.test(location.pathname) && ['', 'live'].includes(new URLSearchParams(location.search).get('f') || '')));
  const focused = () => !document.hidden && document.hasFocus();
  function resetMotion() { last=null; velocity=0; remainder=0; }
  function cancel() { cancelAnimationFrame(frame); frame=0; resetMotion(); }
  function wake() {
    if (on && eligible() && focused() && !frame) frame=requestAnimationFrame(tick);
    else if (!on || !eligible() || !focused()) cancel();
  }
  function pause() { pauseUntil=performance.now()+500; nextCheck=0; resetMotion(); }
  function tick(now) {
    frame=0;
    if (!on || !eligible() || !focused()) { resetMotion(); return; }
    // Never catch up missed frames with a visible jump after a long task.
    const delta=last === null ? 0 : Math.min(32,now-last);
    last=now;
    // Avoid a DOM scan on every animation frame. Pauses never accumulate distance.
    if(now>=nextCheck) {
      editing=!!document.activeElement?.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]') ||
        !!document.querySelector('[role="dialog"],[role="menu"],html.x3t-nav-open') ||
        !!document.getSelection()?.toString();
      nextCheck=now+100;
    }
    if(!held && !editing && now>=pauseUntil) {
      // 180ms ramp, also used for speed changes. Keep subpixel distance instead
      // of losing it to the browser's scroll-coordinate rounding at high Hz.
      const target=speeds[speed];
      velocity += (target-velocity) * (1-Math.exp(-delta/60));
      const distance=velocity*delta/1000+remainder;
      const before=window.scrollY;
      window.scrollBy({top:distance,behavior:'instant'});
      const moved=window.scrollY-before;
      remainder=Math.max(-1,Math.min(1,distance-moved));
    } else { velocity=0; remainder=0; }
    frame=requestAnimationFrame(tick);
  }
  async function stop() {
    if(!on) return;
    on=false; cancel();
    try { await chrome.storage.local.set({x3tAutoScroll:false}); }
    catch { console.warn('X 3-Column: auto-scroll stopped in this tab; saving OFF failed.'); }
  }
  function navigation() {
    if (/\/status\/\d+/.test(location.pathname)) { stop(); return; }
    nextCheck=0; wake();
  }
  window.addEventListener('wheel',pause,{passive:true,capture:true});
  window.addEventListener('keydown',pause,{capture:true});
  window.addEventListener('pointerdown',()=>{held=true;pause();},{passive:true,capture:true});
  for(const event of ['pointerup','pointercancel']) window.addEventListener(event,()=>{held=false;pause();},{passive:true,capture:true});
  document.addEventListener('focusin',()=>{nextCheck=0;},true);
  document.addEventListener('focusout',()=>{nextCheck=0;},true);
  window.addEventListener('blur',()=>{held=false;cancel();});
  window.addEventListener('focus',()=>{nextCheck=0;wake();});
  document.addEventListener('visibilitychange',()=>{nextCheck=0;wake();});
  document.addEventListener('click',event=>{
    const target=event.target;
    const href=target.closest?.('a[href]')?.getAttribute('href') || '';
    const detail=/\/status\/\d+/.test(href);
    const postBody=target.closest?.('article[data-testid="tweet"]') &&
      !target.closest('a,button,input,textarea,video,[role="button"]');
    if(detail || postBody) stop();
    else pause();
  },true);
  window.addEventListener('popstate',navigation);
  window.navigation?.addEventListener('navigatesuccess',navigation);
  function update(values) {
    const wasOn=on;
    if('x3tAutoScroll' in values) on=values.x3tAutoScroll===true;
    if('x3tEnabled' in values) layout=values.x3tEnabled!==false;
    if('x3tAutoSpeed' in values) speed=Object.hasOwn(speeds,values.x3tAutoSpeed)?values.x3tAutoSpeed:'normal';
    if(on && !wasOn) { pauseUntil=0; resetMotion(); }
    navigation();
  }
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    const values={};
    for(const key of ['x3tAutoScroll','x3tAutoSpeed','x3tEnabled']) if(changes[key]) values[key]=changes[key].newValue;
    if(Object.keys(values).length)update(values);
  });
  chrome.storage.local.get(['x3tAutoScroll','x3tAutoSpeed','x3tEnabled']).then(update).catch(()=>{});
})();
