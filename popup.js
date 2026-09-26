const STORAGE_KEY = 'x3tEnabled';
const settings = document.querySelector('#settings');
const status = document.querySelector('#status');
const modes = [...document.querySelectorAll('input[name="mode"]')];
const autoSettings = document.querySelector('#auto-settings');
const autoScroll = document.querySelector('#auto-scroll');
const autoSpeed = document.querySelector('#auto-speed');
let savedAuto=false, savedSpeed='normal';
let savedEnabled;

function render() {
  autoScroll.checked=savedAuto;
  autoSpeed.value=savedSpeed;
  for (const mode of modes) mode.checked = (mode.value === 'on') === savedEnabled;
  status.textContent = savedEnabled ? '有効：ホーム・検索の投稿を3列で表示します。' : '無効：X本来の表示に戻します。';
}

async function start() {
  try {
    const stored = await chrome.storage.local.get([STORAGE_KEY,'x3tAutoScroll','x3tAutoSpeed']);
    savedEnabled = stored[STORAGE_KEY] !== false;
    savedAuto=stored.x3tAutoScroll===true;
    savedSpeed=['slow','normal','fast'].includes(stored.x3tAutoSpeed)?stored.x3tAutoSpeed:'normal';
    render();
    settings.disabled = false;
    autoSettings.disabled = false;
  } catch {
    status.textContent = '設定を読み込めませんでした。閉じて開き直してください。';
  }
}

for (const mode of modes) mode.addEventListener('change', async () => {
  if (!mode.checked || settings.disabled) return;
  settings.disabled = true;
  status.textContent = '保存中…';
  try {
    const next = mode.value === 'on';
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    savedEnabled = next;
    render();
  } catch {
    render();
    status.textContent = '保存できませんでした。設定は変更していません。再度お試しください。';
  } finally {
    settings.disabled = false;
  }
});

for(const control of [autoScroll,autoSpeed]) control.addEventListener('change',async()=>{
  if(autoSettings.disabled)return;
  autoSettings.disabled=true;
  try {
    const nextAuto=autoScroll.checked, nextSpeed=autoSpeed.value;
    await chrome.storage.local.set({x3tAutoScroll:nextAuto,x3tAutoSpeed:nextSpeed});
    savedAuto=nextAuto; savedSpeed=nextSpeed;
    render();
    status.textContent=savedAuto?'自動スクロールON（対象ページ・3列表示が有効なとき）':'自動スクロールOFF';
  }catch{
    render(); status.textContent='保存できませんでした。設定は変更していません。';
  }finally{autoSettings.disabled=false;}
});
chrome.storage.onChanged?.addListener((changes,area)=>{
  if(area!=='local')return;
  if(changes.x3tAutoScroll) savedAuto=changes.x3tAutoScroll.newValue===true;
  if(changes.x3tAutoSpeed) savedSpeed=changes.x3tAutoSpeed.newValue || 'normal';
  if(changes.x3tEnabled) savedEnabled=changes.x3tEnabled.newValue!==false;
  render();
});
start();
