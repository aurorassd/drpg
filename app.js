const STORAGE_KEY = 'danbooru_tags_v1';

const seedButton = document.querySelector('#seedButton');
const resetButton = document.querySelector('#resetButton');
const seedStatus = document.querySelector('#seedStatus');
const searchInput = document.querySelector('#searchInput');
const tagGroups = document.querySelector('#tagGroups');
const promptList = document.querySelector('#promptList');
const promptOutput = document.querySelector('#promptOutput');
const copyButton = document.querySelector('#copyButton');
const clearButton = document.querySelector('#clearButton');

let tags = [];
let promptTags = [];
let draggedIndex = null;

async function loadSeedFile() {
  const response = await fetch('./tags.seed.json');
  if (!response.ok) {
    throw new Error('タグシードの読み込みに失敗しました。');
  }
  return response.json();
}

function saveTagsToLocalStorage(newTags) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newTags));
}

function loadTagsFromLocalStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function setStatus(message, isError = false) {
  seedStatus.textContent = message;
  seedStatus.style.color = isError ? '#b91c1c' : '#0f766e';
}

function groupTags(filteredTags) {
  return filteredTags.reduce((acc, tag) => {
    const group = tag.category || 'その他';
    acc[group] = acc[group] || [];
    acc[group].push(tag);
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

    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      draggedIndex = null;
    });

    li.addEventListener('dragover', (event) => {
      event.preventDefault();
    });

    li.addEventListener('drop', () => {
      const dropIndex = Number(li.dataset.index);
      if (draggedIndex === null || draggedIndex === dropIndex) return;
      const [draggedTag] = promptTags.splice(draggedIndex, 1);
      promptTags.splice(dropIndex, 0, draggedTag);
      renderPrompt();
    });

    const text = document.createElement('span');
    text.textContent = tag;

    const remove = document.createElement('button');
    remove.className = 'remove';
    remove.textContent = '×';
    remove.title = '削除';
    remove.addEventListener('click', () => removePromptTag(index));

    li.append(text, remove);
    promptList.append(li);
  });

  promptOutput.value = promptTags.join(', ');
}

function renderTagGroups() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = query
    ? tags.filter((tag) => tag.name.toLowerCase().includes(query))
    : tags;

  const grouped = groupTags(filtered);
  tagGroups.innerHTML = '';

  Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b, 'ja'))
    .forEach(([groupName, groupTags]) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'group';

      const title = document.createElement('h3');
      title.textContent = `${groupName} (${groupTags.length})`;

      const tagsBox = document.createElement('div');
      tagsBox.className = 'tags';

      groupTags.forEach((tag) => {
        const chip = document.createElement('button');
        chip.className = 'tag-chip';
        chip.textContent = tag.name;
        chip.addEventListener('click', () => addPromptTag(tag.name));
        tagsBox.append(chip);
      });

      wrapper.append(title, tagsBox);
      tagGroups.append(wrapper);
    });
}

async function seedTags() {
  try {
    const stored = loadTagsFromLocalStorage();
    if (stored.length > 0) {
      tags = stored;
      setStatus(`既存タグ ${stored.length} 件を使用中（初回一括保存済み）。`);
      renderTagGroups();
      return;
    }

    const initialTags = await loadSeedFile();
    saveTagsToLocalStorage(initialTags);
    tags = initialTags;
    setStatus(`タグ ${initialTags.length} 件を初回一括保存しました。`);
    renderTagGroups();
  } catch (error) {
    setStatus(error.message, true);
  }
}

seedButton.addEventListener('click', seedTags);

resetButton.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  tags = [];
  promptTags = [];
  renderTagGroups();
  renderPrompt();
  setStatus('ローカルDBをリセットしました。再度「初回一括保存」を実行してください。');
});

searchInput.addEventListener('input', renderTagGroups);

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(promptOutput.value);
    setStatus('プロンプトをクリップボードにコピーしました。');
  } catch {
    setStatus('コピーに失敗しました。ブラウザ権限を確認してください。', true);
  }
});

clearButton.addEventListener('click', () => {
  promptTags = [];
  renderPrompt();
});

seedTags();
