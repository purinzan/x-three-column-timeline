const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../autoscroll.js'),'utf8');
async function setup(speed='normal', hz=50, rounded=false) {
  let now=0,id=0,focus=true,dialog=false,selection='';
  let scrollY=0, bottom=Infinity;
  const frames=new Map(),events={},writes=[],moves=[];
  const add=(name,fn)=>{(events[name]??=[]).push(fn);};
  const document={hidden:false,hasFocus:()=>focus,activeElement:{closest:()=>null},querySelector:()=>dialog?{}:null,getSelection:()=>({toString:()=>selection}),addEventListener:add};
  const location={pathname:'/home',search:''};
  let changed;
  vm.runInNewContext(source,{document,location,URLSearchParams,performance:{now:()=>now},console,
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
    window:{addEventListener:add,navigation:{addEventListener:add},get scrollY(){return scrollY;},scrollBy:value=>{
      const next=Math.min(bottom,rounded?Math.round(scrollY+value.top):scrollY+value.top);
      moves.push(next-scrollY); scrollY=next;
    }},
    chrome:{storage:{local:{get:async()=>({x3tAutoScroll:true,x3tAutoSpeed:speed}),set:async v=>writes.push(v)},onChanged:{addListener:fn=>changed=fn}}}});
  await new Promise(r=>setImmediate(r));
  const fire=(name,event={})=>{for(const fn of events[name]||[])fn(event);};
  const step=ms=>{now+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));};
  const advance=ms=>{for(let i=0;i<Math.round(ms*hz/1000);i++)step(1000/hz);};
  return {moves,writes,frames,fire,advance,step,document,location,changed,setFocus:v=>focus=v,setDialog:v=>dialog=v,setSelection:v=>selection=v,setBottom:v=>bottom=v,getY:()=>scrollY};
}
(async()=>{
  for(const [speed,rate] of [['slow',40],['normal',80],['fast',140]]){
    const t=await setup(speed);t.advance(1600);t.moves.length=0;t.advance(1000);
    assert.ok(Math.abs(t.moves.reduce((a,b)=>a+b,0)-rate)<0.001);
    t.fire('pointerdown');t.moves.length=0;t.advance(2000);assert.equal(t.moves.length,0);
    t.fire('pointerup');t.advance(400);assert.equal(t.moves.length,0);t.advance(200);assert.ok(t.moves.length>0);
    t.fire('wheel');t.moves.length=0;t.advance(400);assert.equal(t.moves.length,0);t.advance(200);assert.ok(t.moves.length>0);
    t.setDialog(true);t.fire('keydown');t.advance(1800);t.moves.length=0;t.advance(500);assert.equal(t.moves.length,0);
    t.setDialog(false);t.advance(300);assert.ok(t.moves.length>0);
    t.setFocus(false);t.fire('blur');assert.equal(t.frames.size,0);
    t.moves.length=0;t.setFocus(true);t.fire('focus');t.advance(100);assert.ok(t.moves.some(x=>x>0));
    t.fire('click',{target:{closest:s=>s==='a[href]'?{getAttribute:()=>'/someone/status/123'}:null}});
    assert.equal(t.frames.size,0);assert.equal(t.writes.at(-1).x3tAutoScroll,false);
    t.advance(3000);assert.equal(t.frames.size,0);
  }
  const t=await setup(); t.location.pathname='/someone/status/123';t.fire('navigatesuccess');assert.equal(t.writes.at(-1).x3tAutoScroll,false);
  t.location.pathname='/home';t.fire('navigatesuccess');assert.equal(t.frames.size,0);
  t.changed({x3tAutoScroll:{newValue:true}},'local');assert.ok(t.frames.size>0);
  t.changed({x3tEnabled:{newValue:false}},'local');assert.equal(t.frames.size,0);
  for(const hz of [60,120,144]) for(const [speed,rate] of [['slow',40],['normal',80],['fast',140]]) {
    const t=await setup(speed,hz,true);
    t.advance(100);assert.ok(t.getY()>0,`${hz}Hz ${speed} must start within 100ms`);
    t.advance(1000);const before=t.getY();t.advance(5000);
    assert.ok(Math.abs(t.getY()-before-rate*5)<=1,`${hz}Hz ${speed} rounding drift`);
    t.moves.length=0;t.step(1000);assert.ok(Math.max(...t.moves)<=6,'no long-frame catch-up');
    t.setBottom(t.getY());t.advance(3000);t.setBottom(Infinity);t.moves.length=0;t.advance(100);
    assert.ok(Math.max(...t.moves)<=4,'no accumulated distance at end of feed');
    t.setSelection('selected');t.fire('pointerup');t.advance(700);t.moves.length=0;t.advance(200);assert.equal(t.moves.length,0);
    t.setSelection('');t.advance(200);assert.ok(t.moves.some(x=>x>0));
    t.document.activeElement={closest:()=>({})};t.fire('focusin');t.advance(200);t.moves.length=0;t.advance(200);assert.equal(t.moves.length,0);
    t.document.activeElement={closest:()=>null};t.fire('focusout');t.advance(100);assert.ok(t.moves.some(x=>x>0));
  }
  console.log('PASS: 3 speeds, immediate start/focus resume, 500ms manual pause, detail stop, editing/selection, 60/120/144Hz rounding, stalled frame and feed boundary.');
})().catch(e=>{console.error(e);process.exitCode=1;});
