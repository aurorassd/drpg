const DB_NAME = 'danbooru_tag_db';
const STORE_NAME = 'tags';

const DANBOORU_CATEGORY_MAP = {
  0: '一般',
  1: 'アーティスト',
  3: '著作物',
  4: 'キャラクター',
  5: 'メタ',
};

const seedButton = document.querySelector('#seedButton');
const importDanbooruButton = document.querySelector('#importDanbooruButton');
const pagesInput = document.querySelector('#pagesInput');
const resetButton = document.querySelector('#resetButton');
const seedStatus = document.querySelector('#seedStatus');
const searchInput = document.querySelector('#searchInput');
const tagGroups = document.querySelector('#tagGroups');
const promptList = document.querySelector('#promptList');
const promptOutput = document.querySelector('#promptOutput');
const copyButton = document.querySelector('#copyButton');
const clearButton = document.querySelector('#clearButton');

function setImportButtonsDisabled(disabled) {
  seedButton.disabled = disabled;
  importDanbooruButton.disabled = disabled;
}

let tags = [];
let promptTags = [];
let draggedIndex = null;

function setStatus(message, isError = false) {
  seedStatus.textContent = message;
  seedStatus.style.color = isError ? '#b91c1c' : '#0f766e';
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'name' });
        store.createIndex('category', 'category', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putTags(newTags) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    newTags.forEach((tag) => store.put(tag));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function clearDb() {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadAllTags() {
  const db = await openDb();
  const all = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return all;
}

function groupTags(filteredTags) {
  return filteredTags.reduce((acc, tag) => {
    const key = tag.category || 'その他';
    acc[key] = acc[key] || [];
    acc[key].push(tag);
    return acc;
  }, {});
}

function addPromptTag(tagName) {
  promptTags.push(tagName);
  renderPrompt();
}

function removePromptTag(index) {
  promptTags.splice(index, 1);
  renderPrompt();
}

function renderPrompt() {
  promptList.innerHTML = '';

  promptTags.forEach((tag, index) => {
    const li = document.createElement('li');
    li.className = 'prompt-item';
    li.draggable = true;
    li.dataset.index = String(index);

    li.addEventListener('dragstart', () => {
      draggedIndex = index;
      li.classList.add('dragging');
    });

    li.addEventListener('dragover', (event) => {
      event.preventDefault();
    });

    li.addEventListener('drop', () => {
      const dropIndex = Number(li.dataset.index);
      if (draggedIndex === null || dropIndex === draggedIndex) return;
      const [moved] = promptTags.splice(draggedIndex, 1);
      promptTags.splice(dropIndex, 0, moved);
      renderPrompt();
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      draggedIndex = null;
    });

    const text = document.createElement('span');
    text.textContent = tag;

    const remove = document.createElement('button');
    remove.className = 'remove';
    remove.textContent = '×';
    remove.addEventListener('click', () => removePromptTag(index));

    li.append(text, remove);
    promptList.append(li);
  });

  promptOutput.value = promptTags.join(', ');
}

function renderTagGroups() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = query ? tags.filter((t) => t.name.toLowerCase().includes(query)) : tags;
  const grouped = groupTags(filtered);
  tagGroups.innerHTML = '';

  Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b, 'ja'))
    .forEach(([name, items]) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'group';

      const h3 = document.createElement('h3');
      h3.textContent = `${name} (${items.length})`;

      const box = document.createElement('div');
      box.className = 'tags';

      items
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .forEach((tag) => {
          const chip = document.createElement('button');
          chip.className = 'tag-chip';
          chip.textContent = tag.name;
          chip.title = `count: ${tag.count || 0}`;
          chip.addEventListener('click', () => addPromptTag(tag.name));
          box.append(chip);
        });

      wrapper.append(h3, box);
      tagGroups.append(wrapper);
    });
}

async function loadSeedFile() {
  const res = await fetch('./tags.seed.json');
  if (!res.ok) throw new Error('シードJSONの取得に失敗しました。');
  return res.json();
}

async function fetchDanbooruTags(page) {
  const url = `/api/danbooru-tags?page=${page}&limit=200`;
  const res = await fetch(url);
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.message ? ` (${body.message})` : '';
    } catch {}
    throw new Error(`Danbooru APIエラー: page ${page}, status ${res.status}${detail}`);
  }
  const raw = await res.json();
  return raw.map((t) => ({
    name: t.name,
    category: DANBOORU_CATEGORY_MAP[t.category] || `カテゴリ${t.category}`,
    count: t.post_count || 0,
  }));
}

async function importSeed() {
  try {
    setImportButtonsDisabled(true);
    const current = await loadAllTags();
    if (current.length > 0) {
      tags = current;
      setStatus(`既存タグ ${current.length} 件を利用中です。`);
      renderTagGroups();
      return;
    }

    const seeded = await loadSeedFile();
    await putTags(seeded);
    tags = await loadAllTags();
    setStatus(`シードを一括保存しました（${tags.length}件）。`);
    renderTagGroups();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`取得に失敗: ${message}`, true);
  } finally {
    setImportButtonsDisabled(false);
  }
}

async function importFromDanbooru() {
  try {
    const pages = Math.min(30, Math.max(1, Number(pagesInput.value) || 8));
    setImportButtonsDisabled(true);
    setStatus(`Danbooruから取得中... 0/${pages}`);

    const merged = new Map();
    for (let page = 1; page <= pages; page += 1) {
      const pageTags = await fetchDanbooruTags(page);
      pageTags.forEach((tag) => merged.set(tag.name, tag));
      setStatus(`Danbooruから取得中... ${page}/${pages}`);
    }

    const finalTags = Array.from(merged.values());
    await clearDb();
    await putTags(finalTags);
    tags = await loadAllTags();
    setStatus(`Danbooruタグを初回一括保存しました（${tags.length}件）。`);
    renderTagGroups();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`取得に失敗: ${message}`, true);
  } finally {
    setImportButtonsDisabled(false);
  }
}

seedButton.addEventListener('click', importSeed);
importDanbooruButton.addEventListener('click', importFromDanbooru);
resetButton.addEventListener('click', async () => {
  await clearDb();
  tags = [];
  promptTags = [];
  renderPrompt();
  renderTagGroups();
  setStatus('ローカルDBをリセットしました。');
});

searchInput.addEventListener('input', renderTagGroups);

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(promptOutput.value);
    setStatus('プロンプトをコピーしました。');
  } catch {
    setStatus('コピー失敗（権限未許可の可能性）。', true);
  }
});

clearButton.addEventListener('click', () => {
  promptTags = [];
  renderPrompt();
});

importSeed();
