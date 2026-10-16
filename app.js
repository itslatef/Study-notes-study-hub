const FOLDER_COLORS = [
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Coral Red', hex: '#ff5733' },
  { name: 'Hot Pink', hex: '#ec4899' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Lime Green', hex: '#84cc16' },
  { name: 'Sky Blue', hex: '#0ea5e9' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Mocha', hex: '#8d5b4c' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Indigo', hex: '#6366f1' }
];

const FOLDER_ICONS = ['','</>','{ }','[ ]','()','=>','!=','&&','||','01','10','∑','∫','∏','√','∞','≈','≠','≤','≥','±','×÷+','∂','∆','∇','λ','π','θ','Ω','μ','σ','α','β','γ','∈','∉','⊂','∪','∩','∀','∃','⊢','⊨','⊕','⊗','⊥','∠','💻','🖥️','⌨️','🖱️','🖧','🌐','📡','🔌','🔋','💾','💿','🗄️','📊','📈','📉','📋','📁','📂','🗂️','📄','📑','🔖','📐','📏','🧮','🔬','🔭','🧪','🧫','🧬','⚛️','⚡','🧲','⚙️','🔧','🔨','🛠️','🧱','⛓️','🔒','🔓','🔑','🛡️','🐛','🤖','🧠','💡','🎓','📚','📖','✏️','✒️','📝','🎯'];

const DEFAULT_SYNC_KEY = 'sn-study-hub-itslatef-v1';
const DB_NAME = 'SamsungNotesStudyHubDB';
const DB_STORE = 'workspace_state';

const state = {
  items: [],
  updatedAt: 0,
  currentFolderId: null,
  expandedFolders: new Set(),
  searchQuery: '',
  editingFolderId: null,
  editingFileId: null,
  viewingFileId: null,
  selectedColor: FOLDER_COLORS[1].hex,
  selectedIcon: '',
  syncKey: new URLSearchParams(location.search).get('sync') || localStorage.getItem('sn_sync_key') || DEFAULT_SYNC_KEY,
  firebaseUrl: localStorage.getItem('sn_firebase_url') || '',
  lastCloudKey: null,
  sse: null
};

// --- Starter Seed Data ---
function getInitialSeed() {
  const now = Date.now();
  return [
    {
      id: 'fld-math',
      parentId: null,
      type: 'folder',
      name: 'Mathematics',
      color: '#eab308',
      icon: '×÷+',
      htmlContent: '',
      updatedAt: now - 3600000
    },
    {
      id: 'fld-cs',
      parentId: null,
      type: 'folder',
      name: 'Computer Science',
      color: '#0ea5e9',
      icon: '</>',
      htmlContent: '',
      updatedAt: now - 3200000
    },
    {
      id: 'fld-db',
      parentId: 'fld-cs',
      type: 'folder',
      name: 'Databases & SQL',
      color: '#a855f7',
      icon: '🗄️',
      htmlContent: '',
      updatedAt: now - 2800000
    },
    {
      id: 'fil-calculus',
      parentId: 'fld-math',
      type: 'file',
      name: 'Calculus Derivatives & Integrals',
      color: '',
      icon: '',
      htmlContent: `<!DOCTYPE html>
<html>
<head>
  <title>Calculus Derivatives & Integrals</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 28px; line-height: 1.6; }
    h1 { color: #facc15; margin-top: 0; }
    .card { background: #1e293b; border-left: 4px solid #facc15; padding: 16px; border-radius: 12px; margin-bottom: 16px; }
    code { color: #38bdf8; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Calculus Derivatives & Integrals</h1>
  <div class="card">
    <h3>Fundamental Theorem of Calculus</h3>
    <p><code>∫ [a to b] f'(x) dx = f(b) - f(a)</code></p>
  </div>
  <div class="card">
    <h3>Common Derivatives</h3>
    <p>• <code>d/dx [x^n] = n·x^(n-1)</code><br>• <code>d/dx [e^x] = e^x</code><br>• <code>d/dx [ln(x)] = 1/x</code></p>
  </div>
</body>
</html>`,
      updatedAt: now - 1800000
    },
    {
      id: 'fil-algo',
      parentId: 'fld-cs',
      type: 'file',
      name: 'Big-O Complexity Cheat Sheet',
      color: '',
      icon: '',
      htmlContent: `<!DOCTYPE html>
<html>
<head>
  <title>Big-O Complexity Cheat Sheet</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #090d16; color: #e2e8f0; padding: 28px; }
    h1 { color: #38bdf8; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; background: #111827; border-radius: 12px; overflow: hidden; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #1f2937; }
    th { background: #1e293b; color: #7dd3fc; }
  </style>
</head>
<body>
  <h1>Big-O Complexity Cheat Sheet</h1>
  <table>
    <tr><th>Data Structure</th><th>Access</th><th>Search</th><th>Insert</th></tr>
    <tr><td>Array</td><td>O(1)</td><td>O(n)</td><td>O(n)</td></tr>
    <tr><td>Hash Table</td><td>N/A</td><td>O(1)</td><td>O(1)</td></tr>
    <tr><td>Binary Search Tree</td><td>O(log n)</td><td>O(log n)</td><td>O(log n)</td></tr>
  </table>
</body>
</html>`,
      updatedAt: now - 900000
    }
  ];
}

// --- IndexedDB Helper ---
function openLocalDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readLocalState() {
  try {
    const db = await openLocalDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(state.syncKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const raw = localStorage.getItem(`sn_data_${state.syncKey}`);
    return raw ? JSON.parse(raw) : null;
  }
}

async function writeLocalState(payload) {
  try {
    const db = await openLocalDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(payload, state.syncKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    localStorage.setItem(`sn_data_${state.syncKey}`, JSON.stringify(payload));
  }
}

// --- Auto-Title Extraction via DOMParser ---
function extractHtmlTitle(htmlCode) {
  if (!htmlCode || !htmlCode.trim()) return 'Untitled HTML Note';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlCode, 'text/html');
    const titleEl = doc.querySelector('title');
    if (titleEl && titleEl.textContent.trim()) {
      return titleEl.textContent.trim();
    }
    const h1El = doc.querySelector('h1');
    if (h1El && h1El.textContent.trim()) {
      return h1El.textContent.trim();
    }
  } catch {
    // Fallback
  }
  return 'Untitled HTML Note';
}

// --- Zero-Config Cloud Sync (Firebase Realtime DB OR Bytebin + Ntfy Realtime) ---
function setSyncIndicator(status, label) {
  const dot = document.getElementById('syncDot');
  const text = document.getElementById('syncStatusText');
  const keyLbl = document.getElementById('syncKeyLabel');
  const displayKey = state.syncKey === DEFAULT_SYNC_KEY
    ? 'Cloud Workspace'
    : state.syncKey.replace(/^sn-study-hub-/i, '');
  keyLbl.textContent = displayKey;

  if (status === 'syncing') {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0';
    text.textContent = label || 'Syncing Cloud...';
  } else if (status === 'online') {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0';
    text.textContent = label || 'Cloud Synced';
  } else {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0';
    text.textContent = label || 'Saved Locally';
  }
}

function getTopicName() {
  const clean = state.syncKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
  return `sn_study_cloud_${clean}`;
}

async function pushToCloud() {
  const payload = {
    items: state.items,
    updatedAt: state.updatedAt
  };
  await writeLocalState(payload);
  setSyncIndicator('syncing');

  try {
    if (state.firebaseUrl) {
      const base = state.firebaseUrl.replace(/\/+$/, '');
      const res = await fetch(`${base}/study_hub/${encodeURIComponent(state.syncKey)}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Firebase PUT failed');
      setSyncIndicator('online', 'Synced (Firebase)');
      return;
    }

    // Zero-config Cloud KV: store full JSON in Bytebin + broadcast pointer to Ntfy room
    const blobRes = await fetch('https://bytebin.lucko.me/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!blobRes.ok) throw new Error('Cloud KV POST failed');
    const { key } = await blobRes.json();
    state.lastCloudKey = key;

    const topic = getTopicName();
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      body: JSON.stringify({ key, updatedAt: state.updatedAt })
    });

    setSyncIndicator('online', 'Cloud Synced');
  } catch {
    setSyncIndicator('local', 'Local + Offline Ready');
  }
}

async function pullFromCloud() {
  setSyncIndicator('syncing', 'Checking Cloud...');
  try {
    if (state.firebaseUrl) {
      const base = state.firebaseUrl.replace(/\/+$/, '');
      const res = await fetch(`${base}/study_hub/${encodeURIComponent(state.syncKey)}.json`);
      if (res.ok) {
        const remote = await res.json();
        if (remote && Array.isArray(remote.items) && (remote.updatedAt || 0) > state.updatedAt) {
          state.items = remote.items;
          state.updatedAt = remote.updatedAt;
          await writeLocalState(remote);
          renderAll();
        }
      }
      setSyncIndicator('online', 'Synced (Firebase)');
      return;
    }

    const topic = getTopicName();
    const res = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=all`);
    if (!res.ok) throw new Error('Ntfy poll failed');
    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);

    let latestPointer = null;
    for (const line of lines) {
      try {
        const evt = JSON.parse(line);
        if (evt.event === 'message' && evt.message) {
          const msg = JSON.parse(evt.message);
          if (msg.key && (!latestPointer || msg.updatedAt > latestPointer.updatedAt)) {
            latestPointer = msg;
          }
        }
      } catch {
        // Ignore malformed event
      }
    }

    if (latestPointer && latestPointer.updatedAt > state.updatedAt) {
      const blobRes = await fetch(`https://bytebin.lucko.me/${latestPointer.key}`);
      if (blobRes.ok) {
        const remoteData = await blobRes.json();
        if (remoteData && Array.isArray(remoteData.items)) {
          state.items = remoteData.items;
          state.updatedAt = remoteData.updatedAt || latestPointer.updatedAt;
          state.lastCloudKey = latestPointer.key;
          await writeLocalState({ items: state.items, updatedAt: state.updatedAt });
          renderAll();
        }
      }
    } else if (!latestPointer && state.items.length > 0) {
      await pushToCloud();
    }

    setSyncIndicator('online', 'Cloud Synced');
  } catch {
    setSyncIndicator('local', 'Saved Locally');
  }
}

function subscribeRealtimeCloud() {
  if (state.sse) {
    state.sse.close();
    state.sse = null;
  }
  if (state.firebaseUrl) return;

  try {
    const topic = getTopicName();
    const es = new EventSource(`https://ntfy.sh/${topic}/sse`);
    es.onmessage = async (e) => {
      try {
        const evt = JSON.parse(e.data);
        if (!evt.message) return;
        const pointer = JSON.parse(evt.message);
        if (pointer.key && pointer.key !== state.lastCloudKey && pointer.updatedAt > state.updatedAt) {
          const blobRes = await fetch(`https://bytebin.lucko.me/${pointer.key}`);
          if (blobRes.ok) {
            const remoteData = await blobRes.json();
            if (remoteData && Array.isArray(remoteData.items)) {
              state.items = remoteData.items;
              state.updatedAt = remoteData.updatedAt || pointer.updatedAt;
              state.lastCloudKey = pointer.key;
              await writeLocalState({ items: state.items, updatedAt: state.updatedAt });
              renderAll();
              setSyncIndicator('online', 'Live Synced');
            }
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    };
    state.sse = es;
  } catch {
    // Ignore SSE connection error
  }
}

// --- Data Helpers ---
function countDirectChildren(folderId) {
  return state.items.filter(item => item.parentId === folderId).length;
}

function getDescendantsIds(folderId) {
  const ids = [folderId];
  const children = state.items.filter(i => i.parentId === folderId);
  for (const child of children) {
    if (child.type === 'folder') {
      ids.push(...getDescendantsIds(child.id));
    } else {
      ids.push(child.id);
    }
  }
  return ids;
}

function getBreadcrumbTrail(folderId) {
  const trail = [];
  let currId = folderId;
  const visited = new Set();
  while (currId && !visited.has(currId)) {
    visited.add(currId);
    const folder = state.items.find(i => i.id === currId && i.type === 'folder');
    if (!folder) break;
    trail.unshift(folder);
    currId = folder.parentId;
  }
  return trail;
}

function expandAncestors(folderId) {
  const trail = getBreadcrumbTrail(folderId);
  for (const f of trail) {
    state.expandedFolders.add(f.id);
  }
}

function formatShortDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// --- Rendering Functions ---
function renderSidebarTree() {
  const treeEl = document.getElementById('folderTree');
  const rootNav = document.getElementById('navAllRoot');
  const totalBadge = document.getElementById('totalItemsBadge');

  totalBadge.textContent = state.items.length;
  rootNav.classList.toggle('active', state.currentFolderId === null && !state.viewingFileId);

  const folders = state.items
    .filter(i => i.type === 'folder')
    .sort((a, b) => a.name.localeCompare(b.name));

  const files = state.items
    .filter(i => i.type === 'file')
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  function buildSubtree(parentId, depth = 0) {
    const childFolders = folders.filter(f => f.parentId === parentId);
    const childFiles = files.filter(f => f.parentId === parentId);
    if (childFolders.length === 0 && childFiles.length === 0) return '';

    const padLeft = 10 + depth * 14;

    const foldersHtml = childFolders
      .map(folder => {
        const hasChildren = folders.some(f => f.parentId === folder.id) || files.some(f => f.parentId === folder.id);
        const isExpanded = state.expandedFolders.has(folder.id);
        const isActive = state.currentFolderId === folder.id && !state.viewingFileId;
        const count = countDirectChildren(folder.id);

        return `
          <div>
            <div class="tree-row ${isActive ? 'active' : ''}" style="padding-left: ${padLeft}px" data-folder-id="${folder.id}">
              <button
                type="button"
                class="tree-toggle w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 shrink-0 ${hasChildren ? '' : 'invisible'}"
                data-toggle-id="${folder.id}"
              >
                <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" class="w-3.5 h-3.5"></i>
              </button>
              <span class="w-3 h-3 rounded-sm shrink-0" style="background-color: ${folder.color || '#ff6b4a'}"></span>
              <span class="flex-1 truncate">${escapeHtml(folder.name)}</span>
              <span class="text-[11px] text-gray-400">${count}</span>
            </div>
            ${hasChildren && isExpanded ? `<div class="space-y-0.5">${buildSubtree(folder.id, depth + 1)}</div>` : ''}
          </div>
        `;
      })
      .join('');

    const filesHtml = childFiles
      .map(file => {
        const isViewing = state.viewingFileId === file.id;
        return `
          <div class="tree-row ${isViewing ? 'active' : ''}" style="padding-left: ${padLeft + 22}px" data-tree-file-id="${file.id}">
            <i data-lucide="file-code" class="w-3.5 h-3.5 text-sky-400 shrink-0"></i>
            <span class="flex-1 truncate text-xs text-gray-300">${escapeHtml(file.name)}</span>
          </div>
        `;
      })
      .join('');

    return foldersHtml + filesHtml;
  }

  treeEl.innerHTML = buildSubtree(null, 0);
}

function renderBreadcrumbs() {
  const bar = document.getElementById('breadcrumbBar');
  const trail = getBreadcrumbTrail(state.currentFolderId);

  let html = `
    <button type="button" data-bc-id="" class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/5 ${
      state.currentFolderId === null ? 'text-white font-semibold' : 'text-gray-400'
    } shrink-0 transition">
      <i data-lucide="home" class="w-4 h-4 text-[#ff6b4a]"></i>
      <span>All Notes</span>
    </button>
  `;

  trail.forEach((folder, idx) => {
    const isLast = idx === trail.length - 1;
    html += `
      <i data-lucide="chevron-right" class="w-4 h-4 text-gray-600 shrink-0"></i>
      <button
        type="button"
        data-bc-id="${folder.id}"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/5 ${
          isLast ? 'text-white font-semibold bg-white/[0.04]' : 'text-gray-400'
        } shrink-0 max-w-[180px] truncate transition"
      >
        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${folder.color}"></span>
        <span class="truncate">${escapeHtml(folder.name)}</span>
      </button>
    `;
  });

  bar.innerHTML = html;
}

function renderGrid() {
  const grid = document.getElementById('itemsGrid');
  const emptyState = document.getElementById('emptyState');
  const query = state.searchQuery.trim().toLowerCase();

  let visibleItems = state.items.filter(item => {
    if (query) {
      return (
        item.name.toLowerCase().includes(query) ||
        (item.icon && item.icon.toLowerCase().includes(query))
      );
    }
    return item.parentId === state.currentFolderId;
  });

  // Sort folders first, then by updatedAt descending
  visibleItems.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  if (visibleItems.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  grid.innerHTML = visibleItems
    .map(item => {
      if (item.type === 'folder') {
        const count = countDirectChildren(item.id);
        const bg = item.color || '#ff5733';
        const icon = item.icon ?? '';

        return `
          <div class="sn-folder-card" style="background: linear-gradient(145deg, ${bg}, ${bg}dd);" data-open-folder="${item.id}">
            <!-- Top Row: Item Count at Top-Left + Edit/Delete Actions -->
            <div class="relative z-10 flex items-center justify-between">
              <span class="inline-flex items-center justify-center min-w-[28px] h-7 px-2.5 rounded-full bg-black/25 backdrop-blur-xs text-white font-bold text-xs shadow-xs">
                ${count}
              </span>
              <div class="sn-card-actions flex items-center gap-1 mr-16">
                <button
                  type="button"
                  title="Edit Folder"
                  data-edit-folder="${item.id}"
                  class="w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition"
                >
                  <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                </button>
                <button
                  type="button"
                  title="Delete Folder"
                  data-delete-item="${item.id}"
                  class="w-7 h-7 rounded-full bg-black/30 hover:bg-rose-600/80 text-white flex items-center justify-center transition"
                >
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>

            <!-- Optional Center Watermark Icon/Symbol -->
            ${icon ? `<div class="sn-folder-watermark">${escapeHtml(icon)}</div>` : ''}

            <!-- Bottom-Left Folder Title -->
            <div class="relative z-10 mt-auto pt-6">
              <h3 class="font-bold text-white text-base sm:text-lg leading-snug line-clamp-2 drop-shadow-xs">
                ${escapeHtml(item.name)}
              </h3>
            </div>
          </div>
        `;
      }

      // File Card with 3-dots (...) menu for Edit Code & Delete
      const menuOpen = state.openMenuFileId === item.id;
      return `
        <div class="sn-file-card group" data-open-file="${item.id}">
          <div class="sn-file-preview-wrap">
            <iframe
              class="sn-file-preview-iframe"
              loading="lazy"
              tabindex="-1"
              srcdoc="${escapeAttr(item.htmlContent)}"
            ></iframe>
            <div class="absolute top-2.5 right-2.5 z-20">
              <button
                type="button"
                title="More Actions"
                data-file-menu="${item.id}"
                class="w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-xs border border-white/15 transition"
              >
                <i data-lucide="more-vertical" class="w-4 h-4"></i>
              </button>
              <div class="${menuOpen ? 'flex' : 'hidden'} flex-col w-36 mt-1.5 right-0 absolute rounded-xl bg-[#222222] border border-white/15 shadow-2xl overflow-hidden z-30">
                <button
                  type="button"
                  data-edit-file="${item.id}"
                  class="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-sky-300 hover:bg-white/10 text-left transition"
                >
                  <i data-lucide="code-2" class="w-3.5 h-3.5"></i>
                  <span>Edit Code</span>
                </button>
                <button
                  type="button"
                  data-delete-item="${item.id}"
                  class="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 text-left border-t border-white/5 transition"
                >
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  <span>Delete</span>
                </button>
              </div>
            </div>
            <span class="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-[10px] font-semibold text-amber-300 uppercase tracking-wider">
              HTML
            </span>
          </div>
          <div class="p-3.5 bg-[#1b1b1b] flex flex-col gap-1">
            <h3 class="font-semibold text-sm text-gray-100 truncate">${escapeHtml(item.name)}</h3>
            <div class="flex items-center justify-between text-[11px] text-gray-400">
              <span>${formatShortDate(item.updatedAt)}</span>
              <span class="text-[#ff6b4a] font-medium group-hover:underline">Open Note →</span>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderAll() {
  renderSidebarTree();
  renderBreadcrumbs();
  renderGrid();
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// --- Admin PIN Protection ---
function requireAdminPin() {
  const expectedPin = localStorage.getItem('study_notes_admin_pin') || '3008';
  const entered = prompt('Enter Admin PIN:');
  if (entered !== expectedPin) {
    alert('Access Denied');
    return false;
  }
  return true;
}

// --- Embedded AI Copilot Sidebar (OpenRouter) ---
const DEFAULT_KEY = 'sk-or-v1-' + '044d11b4ce4b342f8bdd8aee59a493a40cf0bd0341ed037b82d01cf8c235c874';
state.chatHistory = {};
state.modelsLoaded = false;

['study_notes_openrouter_key', 'study_notes_gemini_key'].forEach(k => {
  const val = localStorage.getItem(k);
  if (val && !val.trim().toLowerCase().startsWith('sk-or-')) {
    localStorage.removeItem(k);
  }
});

async function loadFreeOpenRouterModels() {
  if (state.modelsLoaded) return;
  const select = document.getElementById('aiModelSelect');
  if (!select) return;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) return;
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    const freeModels = list.filter(m => typeof m.id === 'string' && m.id.endsWith(':free'));

    const priorityRank = (id) => {
      const lower = id.toLowerCase();
      if (lower.includes('deepseek')) return 1;
      if (lower.includes('qwen')) return 2;
      if (lower.includes('gemini')) return 3;
      if (lower.includes('llama')) return 4;
      return 5;
    };

    freeModels.sort((a, b) => {
      const pa = priorityRank(a.id);
      const pb = priorityRank(b.id);
      if (pa !== pb) return pa - pb;
      return (a.name || a.id).localeCompare(b.name || b.id);
    });

    const currentVal = select.value || 'openrouter/free';
    select.innerHTML = `<option value="openrouter/free">✨ Auto Best Free (Smart Router)</option>` +
      freeModels.map(m => {
        const cleanName = (m.name || m.id).replace(/\s*\(free\)\s*/ig, '').trim();
        return `<option value="${escapeAttr(m.id)}">${escapeHtml(cleanName)}</option>`;
      }).join('');
    if ([...select.options].some(o => o.value === currentVal)) {
      select.value = currentVal;
    }
    state.modelsLoaded = true;
  } catch {
    // Keep default Smart Router option
  }
}

function formatAiMarkdown(text) {
  let safe = escapeHtml(text || '');
  safe = safe.replace(/```([\s\S]*?)```/g, '<pre class="bg-black/60 p-2.5 rounded-lg overflow-x-auto font-mono text-xs text-emerald-300 my-1.5">$1</pre>');
  safe = safe.replace(/`([^`]+)`/g, '<code class="bg-black/50 px-1.5 py-0.5 rounded text-amber-300 font-mono text-xs">$1</code>');
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\n/g, '<br>');
  return safe;
}

function renderAiMessages() {
  const container = document.getElementById('aiMessages');
  if (!container) return;
  const fileId = state.viewingFileId || 'global';
  const historyList = state.chatHistory[fileId] || [];

  if (historyList.length === 0) {
    container.innerHTML = `
      <div dir="auto" class="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-gray-400 leading-relaxed">
        ✨ <strong class="text-gray-200">AI Study Tutor Ready.</strong><br>
        Ask any question about this lesson or highlight text inside the document before sending.
      </div>
    `;
    return;
  }

  container.innerHTML = historyList
    .map(msg => `
      <div dir="auto" class="p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
        msg.role === 'user'
          ? 'bg-[#ff6b4a]/20 border border-[#ff6b4a]/30 text-white ml-6'
          : 'bg-white/[0.06] border border-white/10 text-gray-100 mr-4'
      }">
        ${formatAiMarkdown(msg.text)}
      </div>
    `)
    .join('');
  container.scrollTop = container.scrollHeight;
}

function toggleAiCopilot(forceOpen) {
  const panel = document.getElementById('aiCopilotPanel');
  if (!panel) return;
  const isClosed = panel.classList.contains('translate-x-full');
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : isClosed;
  if (shouldOpen) {
    panel.classList.remove('translate-x-full');
    loadFreeOpenRouterModels();
    renderAiMessages();
  } else {
    panel.classList.add('translate-x-full');
  }
}

// --- Browser History Navigation ---
function pushHistoryState() {
  history.pushState({
    folderId: state.currentFolderId,
    fileId: state.viewingFileId,
    modal: state.activeModal || null
  }, '');
}

function navigateToFolder(folderId) {
  if (state.currentFolderId === folderId) return;
  state.currentFolderId = folderId;
  if (folderId) expandAncestors(folderId);
  pushHistoryState();
  renderAll();
}

// --- Folder Customization Pickers ---
function renderFolderPickers() {
  const colorGrid = document.getElementById('colorPickerGrid');
  const iconGrid = document.getElementById('iconPickerGrid');

  colorGrid.innerHTML = FOLDER_COLORS.map(c => `
    <button
      type="button"
      title="${c.name}"
      data-pick-color="${c.hex}"
      class="swatch-btn ${state.selectedColor === c.hex ? 'selected' : ''}"
      style="background-color: ${c.hex}"
    ></button>
  `).join('');

  iconGrid.innerHTML = FOLDER_ICONS.map(sym => {
    const isNone = sym === '';
    return `
      <button
        type="button"
        title="${isNone ? 'No Icon' : escapeHtml(sym)}"
        data-pick-icon="${escapeHtml(sym)}"
        class="icon-btn ${isNone ? 'col-span-2 text-xs' : 'text-xs'} ${state.selectedIcon === sym ? 'selected' : ''}"
      >${isNone ? '🚫 None' : escapeHtml(sym)}</button>
    `;
  }).join('');
}

// --- Modals & Viewers ---
function openFolderModal(folderId = null) {
  if (!requireAdminPin()) return;
  state.editingFolderId = folderId;
  state.openMenuFileId = null;
  const modal = document.getElementById('folderModal');
  const title = document.getElementById('folderModalTitle');
  const nameInput = document.getElementById('folderNameInput');

  if (folderId) {
    const folder = state.items.find(i => i.id === folderId);
    if (!folder) return;
    title.textContent = 'Edit Folder';
    nameInput.value = folder.name;
    state.selectedColor = folder.color || FOLDER_COLORS[0].hex;
    state.selectedIcon = folder.icon ?? '';
  } else {
    title.textContent = 'New Study Folder';
    nameInput.value = '';
    state.selectedColor = FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)].hex;
    state.selectedIcon = '';
  }

  renderFolderPickers();
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  state.activeModal = 'folder';
  pushHistoryState();
  setTimeout(() => nameInput.focus(), 50);
}

function closeFolderModalDom() {
  const modal = document.getElementById('folderModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  state.editingFolderId = null;
  if (state.activeModal === 'folder') state.activeModal = null;
}

function closeFolderModal() {
  if (state.activeModal === 'folder') {
    history.back();
  } else {
    closeFolderModalDom();
  }
}

function openFileModal(fileId = null) {
  if (!requireAdminPin()) return;
  state.editingFileId = fileId;
  state.openMenuFileId = null;
  const modal = document.getElementById('fileModal');
  const title = document.getElementById('fileModalTitle');
  const codeInput = document.getElementById('htmlCodeInput');
  const overrideInput = document.getElementById('fileTitleOverrideInput');
  const badge = document.getElementById('detectedTitleBadge');

  if (fileId) {
    const file = state.items.find(i => i.id === fileId);
    if (!file) return;
    title.textContent = 'Edit HTML Study File';
    codeInput.value = file.htmlContent;
    const autoName = extractHtmlTitle(file.htmlContent);
    badge.textContent = autoName;
    overrideInput.value = file.name !== autoName ? file.name : '';
  } else {
    title.textContent = 'New HTML Study File';
    codeInput.value = '';
    overrideInput.value = '';
    badge.textContent = 'Untitled HTML Note';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  state.activeModal = 'file';
  pushHistoryState();
  setTimeout(() => codeInput.focus(), 50);
}

function closeFileModalDom() {
  const modal = document.getElementById('fileModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  state.editingFileId = null;
  if (state.activeModal === 'file') state.activeModal = null;
}

function closeFileModal() {
  if (state.activeModal === 'file') {
    history.back();
  } else {
    closeFileModalDom();
  }
}

function closeCloudModalDom() {
  const cloudModal = document.getElementById('cloudModal');
  cloudModal.classList.add('hidden');
  cloudModal.classList.remove('flex');
  if (state.activeModal === 'cloud') state.activeModal = null;
}

function openViewer(fileId, fromHistory = false) {
  const file = state.items.find(i => i.id === fileId && i.type === 'file');
  if (!file) return;
  state.viewingFileId = fileId;
  state.openMenuFileId = null;

  const overlay = document.getElementById('viewerOverlay');
  const iframe = document.getElementById('viewerIframe');

  iframe.srcdoc = file.htmlContent;
  overlay.classList.remove('hidden');
  renderAiMessages();
  if (window.lucide) window.lucide.createIcons();

  if (!fromHistory) {
    pushHistoryState();
  }
}

function closeViewerDom() {
  const overlay = document.getElementById('viewerOverlay');
  const iframe = document.getElementById('viewerIframe');
  iframe.srcdoc = '';
  overlay.classList.add('hidden');
  toggleAiCopilot(false);
  state.viewingFileId = null;
}

function closeViewer() {
  if (state.viewingFileId) {
    history.back();
  } else {
    closeViewerDom();
  }
}

function toggleFabMenu(forceState) {
  const menu = document.getElementById('fabMenu');
  const icon = document.getElementById('fabIcon');
  const isHidden = menu.classList.contains('hidden');
  const shouldOpen = typeof forceState === 'boolean' ? forceState : isHidden;

  if (shouldOpen) {
    menu.classList.remove('hidden');
    menu.classList.add('flex');
    icon.style.transform = 'rotate(45deg)';
  } else {
    menu.classList.add('hidden');
    menu.classList.remove('flex');
    icon.style.transform = 'rotate(0deg)';
  }
}

function toggleMobileSidebar(show) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (show) {
    sidebar.classList.remove('-translate-x-full');
    backdrop.classList.remove('hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.add('hidden');
  }
}

// --- Event Listeners & Initialization ---
async function initApp() {
  localStorage.setItem('sn_sync_key', state.syncKey);

  const localData = await readLocalState();
  if (localData && Array.isArray(localData.items) && localData.items.length > 0) {
    state.items = localData.items;
    state.updatedAt = localData.updatedAt || Date.now();
  } else {
    state.items = getInitialSeed();
    state.updatedAt = 1;
    await writeLocalState({ items: state.items, updatedAt: state.updatedAt });
  }

  state.items.filter(i => i.type === 'folder' && i.parentId === null).forEach(f => {
    state.expandedFolders.add(f.id);
  });

  history.replaceState({ folderId: null, fileId: null, modal: null }, '');

  window.addEventListener('popstate', (e) => {
    const target = e.state || { folderId: null, fileId: null, modal: null };

    // 1. Close any open modal if target state has no modal
    if (state.activeModal && target.modal !== state.activeModal) {
      closeFolderModalDom();
      closeFileModalDom();
      closeCloudModalDom();
    }

    // 2. Close or open file viewer based on history state
    if (state.viewingFileId && target.fileId !== state.viewingFileId) {
      closeViewerDom();
    } else if (!state.viewingFileId && target.fileId) {
      openViewer(target.fileId, true);
    }

    // 3. Step to target folder
    const nextFolderId = target.folderId || null;
    if (state.currentFolderId !== nextFolderId) {
      state.currentFolderId = nextFolderId;
      if (nextFolderId) expandAncestors(nextFolderId);
    }

    state.openMenuFileId = null;
    renderAll();
  });

  renderAll();
  await pullFromCloud();
  subscribeRealtimeCloud();

  // Sidebar navigation events
  document.getElementById('navAllRoot').addEventListener('click', () => {
    navigateToFolder(null);
    toggleMobileSidebar(false);
  });

  document.getElementById('folderTree').addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('[data-toggle-id]');
    if (toggleBtn) {
      e.stopPropagation();
      const id = toggleBtn.getAttribute('data-toggle-id');
      if (state.expandedFolders.has(id)) {
        state.expandedFolders.delete(id);
      } else {
        state.expandedFolders.add(id);
      }
      renderSidebarTree();
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const fileRow = e.target.closest('[data-tree-file-id]');
    if (fileRow) {
      const fileId = fileRow.getAttribute('data-tree-file-id');
      openViewer(fileId);
      renderSidebarTree();
      if (window.lucide) window.lucide.createIcons();
      toggleMobileSidebar(false);
      return;
    }

    const row = e.target.closest('[data-folder-id]');
    if (row) {
      const id = row.getAttribute('data-folder-id');
      state.expandedFolders.add(id);
      navigateToFolder(id);
      toggleMobileSidebar(false);
    }
  });

  // Breadcrumb navigation
  document.getElementById('breadcrumbBar').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-bc-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-bc-id') || null;
    navigateToFolder(id);
  });

  // Main Grid interactions (open folder, open file, 3-dots menu, edit, delete)
  document.getElementById('itemsGrid').addEventListener('click', async (e) => {
    const menuBtn = e.target.closest('[data-file-menu]');
    if (menuBtn) {
      e.stopPropagation();
      const fileId = menuBtn.getAttribute('data-file-menu');
      state.openMenuFileId = state.openMenuFileId === fileId ? null : fileId;
      renderGrid();
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const editFolderBtn = e.target.closest('[data-edit-folder]');
    if (editFolderBtn) {
      e.stopPropagation();
      openFolderModal(editFolderBtn.getAttribute('data-edit-folder'));
      return;
    }

    const editFileBtn = e.target.closest('[data-edit-file]');
    if (editFileBtn) {
      e.stopPropagation();
      openFileModal(editFileBtn.getAttribute('data-edit-file'));
      return;
    }

    const deleteBtn = e.target.closest('[data-delete-item]');
    if (deleteBtn) {
      e.stopPropagation();
      state.openMenuFileId = null;
      if (!requireAdminPin()) return;
      const targetId = deleteBtn.getAttribute('data-delete-item');
      const targetItem = state.items.find(i => i.id === targetId);
      if (!targetItem) return;

      const idsToRemove = targetItem.type === 'folder' ? getDescendantsIds(targetId) : [targetId];
      state.items = state.items.filter(i => !idsToRemove.includes(i.id));
      state.updatedAt = Date.now();
      renderAll();
      await pushToCloud();
      return;
    }

    const folderCard = e.target.closest('[data-open-folder]');
    if (folderCard) {
      const folderId = folderCard.getAttribute('data-open-folder');
      navigateToFolder(folderId);
      return;
    }

    const fileCard = e.target.closest('[data-open-file]');
    if (fileCard) {
      openViewer(fileCard.getAttribute('data-open-file'));
    }
  });

  // Search Input
  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderGrid();
    if (window.lucide) window.lucide.createIcons();
  });

  // Manual Cloud Sync Button
  document.getElementById('manualSyncBtn').addEventListener('click', async () => {
    await pullFromCloud();
  });

  // Mobile Sidebar Toggles
  document.getElementById('openSidebarBtn').addEventListener('click', () => toggleMobileSidebar(true));
  document.getElementById('closeSidebarBtn').addEventListener('click', () => toggleMobileSidebar(false));
  document.getElementById('sidebarBackdrop').addEventListener('click', () => toggleMobileSidebar(false));

  // Floating Action Button (+)
  document.getElementById('fabMainBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFabMenu();
  });

  document.getElementById('fabNewFolderBtn').addEventListener('click', () => {
    toggleFabMenu(false);
    openFolderModal(null);
  });

  document.getElementById('fabNewFileBtn').addEventListener('click', () => {
    toggleFabMenu(false);
    openFileModal(null);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#fabMenu') && !e.target.closest('#fabMainBtn')) {
      toggleFabMenu(false);
    }
    if (state.openMenuFileId && !e.target.closest('[data-file-menu]')) {
      state.openMenuFileId = null;
      renderGrid();
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // Folder Modal Pickers & Submit
  document.getElementById('colorPickerGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pick-color]');
    if (!btn) return;
    state.selectedColor = btn.getAttribute('data-pick-color');
    renderFolderPickers();
  });

  document.getElementById('iconPickerGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pick-icon]');
    if (!btn) return;
    state.selectedIcon = btn.getAttribute('data-pick-icon');
    renderFolderPickers();
  });

  document.getElementById('closeFolderModalBtn').addEventListener('click', closeFolderModal);
  document.getElementById('cancelFolderBtn').addEventListener('click', closeFolderModal);

  document.getElementById('folderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('folderNameInput').value.trim();
    if (!name) return;

    if (state.editingFolderId) {
      const folder = state.items.find(i => i.id === state.editingFolderId);
      if (folder) {
        folder.name = name;
        folder.color = state.selectedColor;
        folder.icon = state.selectedIcon;
        folder.updatedAt = Date.now();
      }
    } else {
      const newFolder = {
        id: 'fld-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        parentId: state.currentFolderId,
        type: 'folder',
        name,
        color: state.selectedColor,
        icon: state.selectedIcon,
        htmlContent: '',
        updatedAt: Date.now()
      };
      state.items.push(newFolder);
      if (state.currentFolderId) state.expandedFolders.add(state.currentFolderId);
    }

    state.updatedAt = Date.now();
    closeFolderModal();
    renderAll();
    await pushToCloud();
  });

  // HTML File Modal Auto-Title & Submit
  document.getElementById('htmlCodeInput').addEventListener('input', (e) => {
    const detected = extractHtmlTitle(e.target.value);
    document.getElementById('detectedTitleBadge').textContent = detected;
  });

  document.getElementById('closeFileModalBtn').addEventListener('click', closeFileModal);
  document.getElementById('cancelFileBtn').addEventListener('click', closeFileModal);

  document.getElementById('fileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const htmlContent = document.getElementById('htmlCodeInput').value;
    if (!htmlContent.trim()) return;

    const overrideName = document.getElementById('fileTitleOverrideInput').value.trim();
    const finalName = overrideName || extractHtmlTitle(htmlContent);

    if (state.editingFileId) {
      const file = state.items.find(i => i.id === state.editingFileId);
      if (file) {
        file.name = finalName;
        file.htmlContent = htmlContent;
        file.updatedAt = Date.now();
      }
      if (state.viewingFileId === state.editingFileId) {
        document.getElementById('viewerIframe').srcdoc = htmlContent;
      }
    } else {
      const newFile = {
        id: 'fil-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        parentId: state.currentFolderId,
        type: 'file',
        name: finalName,
        color: '',
        icon: '',
        htmlContent,
        updatedAt: Date.now()
      };
      state.items.push(newFile);
    }

    state.updatedAt = Date.now();
    closeFileModal();
    renderAll();
    await pushToCloud();
  });

  // Single Circular Exit Button in Lesson Viewer (via history.back())
  document.getElementById('viewerBackBtn').addEventListener('click', () => {
    closeViewer();
  });

  // Embedded Gemini Copilot Sidebar Controls
  document.getElementById('aiToggleBtn').addEventListener('click', () => {
    toggleAiCopilot();
  });

  document.getElementById('aiCloseBtn').addEventListener('click', () => {
    toggleAiCopilot(false);
  });

  document.getElementById('aiKeyBtn').addEventListener('click', () => {
    const current = localStorage.getItem('study_notes_openrouter_key') || '';
    const entered = prompt('Enter Custom OpenRouter API Key (leave empty to use built-in key):', current);
    if (entered !== null) {
      if (entered.trim()) {
        localStorage.setItem('study_notes_openrouter_key', entered.trim());
      } else {
        localStorage.removeItem('study_notes_openrouter_key');
      }
    }
  });

  document.getElementById('aiClearBtn').addEventListener('click', () => {
    const fileId = state.viewingFileId || 'global';
    state.chatHistory[fileId] = [];
    renderAiMessages();
  });

  document.getElementById('aiChatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('aiPromptInput');
    const userMessage = input.value.trim();
    if (!userMessage) return;
    input.value = '';

    const fileId = state.viewingFileId || 'global';
    if (!state.chatHistory[fileId]) state.chatHistory[fileId] = [];

    const iframe = document.getElementById('viewerIframe');
    let pageContext = '';
    let selectedText = '';
    try {
      pageContext = (iframe.contentDocument?.body?.innerText || '').slice(0, 25000);
      selectedText = (iframe.contentWindow?.getSelection()?.toString() || '').trim();
    } catch {
      const currentFile = state.items.find(i => i.id === fileId);
      if (currentFile) pageContext = currentFile.htmlContent.slice(0, 25000);
    }

    state.chatHistory[fileId].push({ role: 'user', text: userMessage });
    renderAiMessages();

    const selectedModel = document.getElementById('aiModelSelect').value || 'openrouter/free';
    const rawKey = localStorage.getItem('study_notes_openrouter_key') || DEFAULT_KEY;
    const activeKey = rawKey.trim().replace(/^Sk-or-v1-/, 'sk-or-v1-');

    const lessonContext = [
      pageContext ? `[Lesson Content]:\n${pageContext}` : '',
      selectedText ? `[Highlighted Text]:\n${selectedText}` : ''
    ].filter(Boolean).join('\n\n');

    const messagesPayload = [
      { role: 'system', content: 'You are an expert University Tutor for Applied CS & Math. Answer in Arabic/German.' },
      { role: 'user', content: `Context:\n${lessonContext}\n\nQuestion:\n${userMessage}` }
    ];

    const callOpenRouter = async (modelId) => {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + activeKey,
          'HTTP-Referer': 'https://itslatef.github.io',
          'X-Title': 'Study Notes',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages: messagesPayload
        })
      });
      return await response.json();
    };

    const sendBtn = document.getElementById('aiSendBtn');
    sendBtn.disabled = true;
    sendBtn.textContent = '...';

    const extractReply = (d) => {
      const m = d?.choices?.[0]?.message;
      return (m?.content && m.content.trim()) || (m?.reasoning && m.reasoning.trim()) || '';
    };

    try {
      let data = await callOpenRouter(selectedModel);
      let aiText = extractReply(data);
      if (!aiText && selectedModel !== 'openrouter/free') {
        data = await callOpenRouter('openrouter/free');
        aiText = extractReply(data);
      }
      if (!aiText) {
        aiText = data?.error?.message ? `API Error: ${data.error.message}` : 'No response.';
      }
      state.chatHistory[fileId].push({ role: 'model', text: aiText });
    } catch (err) {
      state.chatHistory[fileId].push({ role: 'model', text: `Connection Error: ${err.message}` });
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
      renderAiMessages();
    }
  });

  loadFreeOpenRouterModels();

  // Cloud Config Modal
  const cloudModal = document.getElementById('cloudModal');
  document.getElementById('cloudConfigBtn').addEventListener('click', () => {
    document.getElementById('syncKeyInput').value = state.syncKey;
    document.getElementById('firebaseUrlInput').value = state.firebaseUrl;
    cloudModal.classList.remove('hidden');
    cloudModal.classList.add('flex');
    state.activeModal = 'cloud';
    pushHistoryState();
  });

  const closeCloudModal = () => {
    if (state.activeModal === 'cloud') {
      history.back();
    } else {
      closeCloudModalDom();
    }
  };

  document.getElementById('closeCloudModalBtn').addEventListener('click', closeCloudModal);
  document.getElementById('cancelCloudBtn').addEventListener('click', closeCloudModal);

  document.getElementById('copyShareUrlBtn').addEventListener('click', async () => {
    const key = document.getElementById('syncKeyInput').value.trim() || state.syncKey;
    const shareUrl = `${location.origin}${location.pathname}?sync=${encodeURIComponent(key)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      const btn = document.getElementById('copyShareUrlBtn');
      const prev = btn.innerHTML;
      btn.textContent = 'Copied Sync URL!';
      setTimeout(() => {
        btn.innerHTML = prev;
        if (window.lucide) window.lucide.createIcons();
      }, 1500);
    } catch {
      // Fallback
    }
  });

  document.getElementById('cloudForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireAdminPin()) return;
    const newKey = document.getElementById('syncKeyInput').value.trim() || DEFAULT_SYNC_KEY;
    const newFb = document.getElementById('firebaseUrlInput').value.trim();

    state.syncKey = newKey;
    state.firebaseUrl = newFb;
    localStorage.setItem('sn_sync_key', newKey);
    localStorage.setItem('sn_firebase_url', newFb);

    closeCloudModal();
    await pullFromCloud();
    await pushToCloud();
    subscribeRealtimeCloud();
  });
}

document.addEventListener('DOMContentLoaded', initApp);
