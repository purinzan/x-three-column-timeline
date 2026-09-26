const STORAGE_KEY = 'x3tEnabled';
const settings = document.querySelector('#settings');
const status = document.querySelector('#status');
const modes = [...document.querySelectorAll('input[name="mode"]')];
let savedEnabled;

function render() {
  for (const mode of modes) mode.checked = (mode.value === 'on') === savedEnabled;
  status.textContent = savedEnabled ? '有効：ホームを3列で表示します。' : '無効：X本来の表示に戻します。';
}

async function start() {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    savedEnabled = stored[STORAGE_KEY] !== false;
    render();
    settings.disabled = false;
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

start();
