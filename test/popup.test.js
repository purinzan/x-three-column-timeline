const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../popup.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
async function setup(initial, failRead = false) {
  const settings = {disabled:true}, status = {}, writes = [];
  const modes = ['on','off'].map(value => ({value,checked:false,addEventListener(_, fn){this.change=fn;}}));
  const storage = {get:async()=>{if(failRead) throw Error(); return {x3tEnabled:initial};},set:async value=>writes.push(value)};
  vm.runInNewContext(source, {document:{querySelector:s=>s==='#settings'?settings:status,querySelectorAll:()=>modes},chrome:{storage:{local:storage}}});
  await tick();
  return {settings,status,modes,writes,storage};
}
(async () => {
  const a = await setup(undefined);
  assert.equal(a.modes[0].checked,true);
  a.modes[0].checked=false; a.modes[1].checked=true;
  await a.modes[1].change();
  assert.equal(a.writes[0].x3tEnabled,false);
  assert.equal(a.modes[1].checked,true);
  a.storage.set=async()=>{throw Error();};
  a.modes[0].checked=true; a.modes[1].checked=false;
  await a.modes[0].change();
  assert.equal(a.modes[1].checked,true);
  assert.equal(a.settings.disabled,false);
  assert.match(a.status.textContent,/保存できません/);
  const b=await setup(false);
  assert.equal(b.modes[1].checked,true);
  const c=await setup(undefined,true);
  assert.equal(c.settings.disabled,true);
  assert.match(c.status.textContent,/読み込めません/);
  console.log('PASS: popup default, saved setting, OFF, save rollback and read failure');
})().catch(error=>{console.error(error);process.exitCode=1;});
