const STORAGE_KEY = 'x3tEnabled';
const checkbox = document.querySelector('#enabled');

async function start() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  checkbox.checked = stored[STORAGE_KEY] !== false;
}

checkbox.addEventListener('change', async () => {
  await chrome.storage.local.set({ [STORAGE_KEY]: checkbox.checked });
});

start();
