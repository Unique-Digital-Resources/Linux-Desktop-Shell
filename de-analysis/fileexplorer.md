# FileExplorer.html - Analysis

## Overview

**FileExplorer.html** is a self-contained, single-file web app that emulates a
modern desktop file manager inside a browser. Branded **"Aether — Files"**, it
presents a light, Google Material You-inspired UI (off-white workspace, soft
blue accent `#0B57D0`, rounded surfaces, subtle shadows) using the Inter font
for sans text and JetBrains Mono for code/shortcuts. Icons are provided by the
Lucide icon library (loaded from a CDN with a graceful fallback that draws a
placeholder dot when `window.lucide` is unavailable).

### Visual concept
- Light theme with `--bg-workspace: #FBFAF8`, `--bg-tabbar: #F0EDE8`,
  white sidebar, and `--accent: #0B57D0` (Google-blue) for selections,
  active states, focus rings, and primary buttons.
- Soft elevation via `--shadow-pop` / `--shadow-dialog`, generous use of
  `var(--radius-*)` rounding, and a 100-260 ms cubic-bezier transition system.
- Status colors: `--success` green, `--warning` amber, `--error` red,
  `--info` blue. Storage bars switch color thresholds above 75 % / 90 %.

### Main UI regions
1. **Sidebar** (`aside.sidebar`): brand header ("A" gradient tile + "Aether Files"
   wordmark), a scrollable nav area (Favorites, Places, Directory Tree, Storage
   & Network sections), and a right-edge resize handle.
2. **Tabstrip** (`.tab-strip`): browser-style horizontal tabs with per-tab
   icon, label, close button, an active-tab accent bar (`::after`), and a
   trailing "+" new-tab button. Tabs are right-clickable for a context menu.
3. **Toolbar** (`.toolbar`): back/forward/up/refresh `btn-group`; a
   `dir-bar-wrap` containing the breadcrumb trail plus dir-actions
   (new folder, new file, paste); and a leading-icon search input.
4. **Action bar** (`.action-bar`, auto-hides): copy / cut / rename / delete
   `btn-group` + a more-actions button + a `.selection-info` count pill.
5. **Content area** (`.content` > `.content-scroll`): renders either the
   Dashboard widget view (Win11-inspired image gallery widget with vertical
   masonry or horizontal scroll modes) or a file grid / list / compact list,
   with empty-state placeholders for no results / empty folder.
6. **Status bar** (`.statusbar`): item count + selection summary on the left;
   a `.view-segmented` control (grid/list/compact), a sort button, a divider,
   and a storage indicator on the right.
7. **Dialogs & overlays**: generic modal dialog (rename / new folder / new file
   / confirm-trash), a fixed `.properties-panel` for file details, a
   `.toast-container` for transient notifications, and floating
   `.context-menu` popups (file, background, sort, more, tab).


## HTML Structure

The complete inner HTML of `<body>`, reproduced verbatim. This is the same content as `fileexplorer.body.html`.

```html
<div class="app">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <div class="brand-mark">A</div>
      <div class="brand-name">Aether <span class="dim">Files</span></div>
    </div>
    <div class="sidebar-scroll" id="sidebarScroll"></div>
    <div class="sidebar-resize" id="sidebarResize"></div>
  </aside>

  <main class="workspace">
    <div class="tab-strip" id="tabStrip"></div>

    <div class="toolbar">
      <div class="btn-group">
        <button class="btn-icon" id="backBtn" title="Back"><i data-lucide="arrow-left"></i></button>
        <button class="btn-icon" id="forwardBtn" title="Forward"><i data-lucide="arrow-right"></i></button>
        <button class="btn-icon" id="upBtn" title="Up one level"><i data-lucide="arrow-up"></i></button>
        <button class="btn-icon" id="refreshBtn" title="Refresh"><i data-lucide="refresh-cw"></i></button>
      </div>
      <div class="dir-bar-wrap">
        <div class="breadcrumb" id="breadcrumb"></div>
        <div class="btn-group dir-actions">
          <button class="btn-icon" id="newFolderBtn" title="New folder"><i data-lucide="folder-plus"></i></button>
          <button class="btn-icon" id="newFileBtn" title="New file"><i data-lucide="file-plus"></i></button>
          <button class="btn-icon" id="pasteBtn" title="Paste" disabled><i data-lucide="clipboard-paste"></i></button>
        </div>
      </div>
      <div class="search-wrap">
        <span class="search-icon"><i data-lucide="search"></i></span>
        <input type="text" class="search-input" id="searchInput" placeholder="Search current folder">
      </div>
    </div>

    <div class="action-bar hidden" id="actionBar">
      <div class="btn-group">
        <button class="btn-icon" id="copyBtn" title="Copy" disabled><i data-lucide="copy"></i></button>
        <button class="btn-icon" id="cutBtn" title="Cut" disabled><i data-lucide="scissors"></i></button>
        <button class="btn-icon" id="renameBtn" title="Rename" disabled><i data-lucide="pencil-line"></i></button>
        <button class="btn-icon" id="deleteBtn" title="Move to trash" disabled><i data-lucide="trash-2"></i></button>
      </div>
      <div class="btn-group">
        <button class="btn-icon" id="moreMenuBtn" title="More actions"><i data-lucide="ellipsis"></i></button>
      </div>
      <div class="selection-info" id="selectionInfo"></div>
    </div>

    <div class="content">
      <div class="content-scroll" id="contentScroll"></div>
    </div>

    <div class="statusbar" id="statusbar"></div>
  </main>
</div>

<div class="toast-container" id="toastContainer"></div>

<script>
// ============================================================
//  File System Data Model
// ============================================================

const TYPE_META = {
  folder:  { icon: 'folder',          class: 'icon-folder',  label: 'Folder' },
  image:   { icon: 'image',            class: 'icon-image',   label: 'Image' },
  video:   { icon: 'film',             class: 'icon-video',   label: 'Video' },
  audio:   { icon: 'music',            class: 'icon-audio',   label: 'Audio' },
  pdf:     { icon: 'file-text',        class: 'icon-pdf',     label: 'PDF document' },
  doc:     { icon: 'file-text',        class: 'icon-doc',     label: 'Document' },
  sheet:   { icon: 'file-spreadsheet', class: 'icon-sheet',   label: 'Spreadsheet' },
  archive: { icon: 'file-archive',     class: 'icon-archive', label: 'Archive' },
  code:    { icon: 'file-code-2',      class: 'icon-code',    label: 'Source code' },
  app:     { icon: 'app-window',       class: 'icon-app',     label: 'Application' },
  text:    { icon: 'file-text',        class: 'icon-text',    label: 'Text file' },
  generic: { icon: 'file',             class: 'icon-generic', label: 'File' },
};

let nextId = 1;
const fsNodes = new Map();

function createNode(data) {
  const id = data.id || ('n' + (nextId++));
  const node = {
    id,
    name: data.name,
    type: data.type || 'folder',
    parentId: data.parentId || null,
    children: (data.type === undefined || data.type === 'folder') ? (data.children || []) : null,
    size: data.size || 0,
    modified: data.modified || randomDate(),
    meta: data.meta || {},
    expanded: data.expanded || false,
  };
  fsNodes.set(id, node);
  return node;
}

function randomDate() {
  const days = Math.floor(Math.random() * 120);
  const d = new Date(Date.now() - days * 86400000 - Math.random() * 86400000);
  return d;
}

function getChildByName(parentId, name) {
  const parent = fsNodes.get(parentId);
  if (!parent || !parent.children) return null;
  for (const cid of parent.children) {
    const c = fsNodes.get(cid);
    if (c && c.name === name) return c;
  }
  return null;
}

function getPath(nodeId) {
  const parts = [];
  let n = fsNodes.get(nodeId);
  while (n) {
    parts.unshift({ id: n.id, name: n.name });
    n = n.parentId ? fsNodes.get(n.parentId) : null;
  }
  return parts;
}

function findNodeByPath(parts) {
  let cur = fsNodes.get('root');
  for (const p of parts) {
    if (!cur || !cur.children) return null;
    let found = null;
    for (const cid of cur.children) {
      const c = fsNodes.get(cid);
      if (c && c.name === p) { found = c; break; }
    }
    if (!found) return null;
    cur = found;
  }
  return cur ? cur.id : null;
}

function isAncestor(ancestorId, nodeId) {
  let n = fsNodes.get(nodeId);
  while (n && n.parentId) {
    if (n.parentId === ancestorId) return true;
    n = fsNodes.get(n.parentId);
  }
  return false;
}

function initFilesystem() {
  const root = createNode({ id: 'root', name: 'Computer', type: 'folder' });
  const home = createNode({ name: 'Home', type: 'folder', parentId: 'root', expanded: true });
  root.children.push(home.id);

  const dashboardNode = { id: 'dashboard', name: 'Dashboard', type: 'dashboard', parentId: null };
  fsNodes.set('dashboard', dashboardNode);

  const desktop   = createNode({ name: 'Desktop',   type: 'folder', parentId: home.id });
  const documents = createNode({ name: 'Documents', type: 'folder', parentId: home.id });
  const downloads = createNode({ name: 'Downloads', type: 'folder', parentId: home.id });
  const pictures  = createNode({ name: 'Pictures',  type: 'folder', parentId: home.id });
  const music     = createNode({ name: 'Music',     type: 'folder', parentId: home.id });
  const videos    = createNode({ name: 'Videos',    type: 'folder', parentId: home.id });
  const projects  = createNode({ name: 'Projects',  type: 'folder', parentId: home.id, expanded: true });
  const config    = createNode({ name: '.config',   type: 'folder', parentId: home.id });

  home.children.push(desktop.id, documents.id, downloads.id, pictures.id, music.id, videos.id, projects.id, config.id);

  // Documents
  const work = createNode({ name: 'Work', type: 'folder', parentId: documents.id });
  const personal = createNode({ name: 'Personal', type: 'folder', parentId: documents.id });
  const invoices = createNode({ name: 'Invoices', type: 'folder', parentId: documents.id });
  const q4Strategy = createNode({ name: 'Q4 Strategy', type: 'folder', parentId: work.id });
  work.children.push(q4Strategy.id);
  documents.children.push(work.id, personal.id, invoices.id);

  documents.children.push(
    createNode({ name: 'resume.pdf',            type: 'pdf',     size: 248000,   parentId: documents.id }).id,
    createNode({ name: 'budget-2024.ods',       type: 'sheet',   size: 89200,    parentId: documents.id }).id,
    createNode({ name: 'meeting-notes.md',      type: 'text',    size: 4800,     parentId: documents.id }).id,
    createNode({ name: 'thesis-draft.docx',     type: 'doc',     size: 1842000, parentId: documents.id }).id,
    createNode({ name: 'reading-list.txt',      type: 'text',    size: 1200,    parentId: documents.id }).id,
    createNode({ name: 'lease-agreement.pdf',   type: 'pdf',     size: 512000,  parentId: documents.id }).id,
  );

  personal.children.push(
    createNode({ name: 'journal.md',            type: 'text',    size: 18400,   parentId: personal.id }).id,
    createNode({ name: 'recipes.txt',           type: 'text',    size: 3200,    parentId: personal.id }).id,
    createNode({ name: 'trip-planning.ods',     type: 'sheet',   size: 42000,   parentId: personal.id }).id,
  );

  // Downloads
  downloads.children.push(
    createNode({ name: 'ubuntu-24.04.iso',          type: 'generic', size: 4900000000, parentId: downloads.id }).id,
    createNode({ name: 'firefox-installer.deb',     type: 'generic', size: 62000000,   parentId: downloads.id }).id,
    createNode({ name: 'project-archive.zip',       type: 'archive', size: 184000000,  parentId: downloads.id }).id,
    createNode({ name: 'wallpapers-pack.tar.gz',    type: 'archive', size: 92000000,   parentId: downloads.id }).id,
    createNode({ name: 'backup-2024-03.borg',       type: 'archive', size: 2400000000, parentId: downloads.id }).id,
    createNode({ name: 'sublime-text_build.deb',     type: 'generic', size: 12000000,   parentId: downloads.id }).id,
    createNode({ name: 'vim-config.tar.gz',         type: 'archive', size: 38000,      parentId: downloads.id }).id,
  );

  // Pictures
  const screenshots = createNode({ name: 'Screenshots', type: 'folder', parentId: pictures.id });
  const wallpapers  = createNode({ name: 'Wallpapers',   type: 'folder', parentId: pictures.id });
  const photos      = createNode({ name: 'Photos',       type: 'folder', parentId: pictures.id });
  pictures.children.push(screenshots.id, wallpapers.id, photos.id);

  pictures.children.push(
    createNode({ name: 'aurora-night.png',      type: 'image', size: 4800000, parentId: pictures.id, meta: { w: 3840, h: 2160 } }).id,
    createNode({ name: 'mountain-vista.jpg',     type: 'image', size: 3200000, parentId: pictures.id, meta: { w: 3840, h: 2160 } }).id,
    createNode({ name: 'portrait-001.jpg',       type: 'image', size: 2800000, parentId: pictures.id, meta: { w: 1080, h: 1620 } }).id,
  );

  screenshots.children.push(
    createNode({ name: 'screenshot-001.png', type: 'image', size: 380000, parentId: screenshots.id }).id,
    createNode({ name: 'screenshot-002.png', type: 'image', size: 420000, parentId: screenshots.id }).id,
    createNode({ name: 'screenshot-003.png', type: 'image', size: 510000, parentId: screenshots.id }).id,
    createNode({ name: 'screenshot-004.png', type: 'image', size: 460000, parentId: screenshots.id }).id,
  );

  wallpapers.children.push(
    createNode({ name: 'gradient-mist.jpg',  type: 'image', size: 1800000, parentId: wallpapers.id }).id,
    createNode({ name: 'minimal-dark.png',    type: 'image', size: 2100000, parentId: wallpapers.id }).id,
    createNode({ name: 'forest-calm.jpg',     type: 'image', size: 3400000, parentId: wallpapers.id }).id,
    createNode({ name: 'desert-dusk.jpg',     type: 'image', size: 2900000, parentId: wallpapers.id }).id,
  );

  // Music
  const playlists = createNode({ name: 'Playlists', type: 'folder', parentId: music.id });
  music.children.push(playlists.id);
  music.children.push(
    createNode({ name: 'ambient-mix.mp3',        type: 'audio', size: 8400000,  parentId: music.id }).id,
    createNode({ name: 'podcast-ep42.ogg',       type: 'audio', size: 32000000, parentId: music.id }).id,
    createNode({ name: 'live-recording.flac',    type: 'audio', size: 28000000, parentId: music.id }).id,
    createNode({ name: 'symphony-no9.flac',      type: 'audio', size: 42000000, parentId: music.id }).id,
  );

  // Videos
  videos.children.push(
    createNode({ name: 'conference-talk.mp4',  type: 'video', size: 480000000, parentId: videos.id }).id,
    createNode({ name: 'screen-recording.mkv', type: 'video', size: 184000000, parentId: videos.id }).id,
    createNode({ name: 'holiday-clip.mov',     type: 'video', size: 920000000, parentId: videos.id }).id,
  );

  // Projects
  const webApp  = createNode({ name: 'web-app',   type: 'folder', parentId: projects.id, expanded: true });
  const dotfiles = createNode({ name: 'dotfiles', type: 'folder', parentId: projects.id });
  const cliTool = createNode({ name: 'cli-tool', type: 'folder', parentId: projects.id });
  projects.children.push(webApp.id, dotfiles.id, cliTool.id);

  const srcDir = createNode({ name: 'src', type: 'folder', parentId: webApp.id, expanded: true });
  webApp.children.push(srcDir.id);
  webApp.children.push(
    createNode({ name: 'package.json',  type: 'code', size: 1200, parentId: webApp.id }).id,
    createNode({ name: 'README.md',     type: 'text', size: 3400, parentId: webApp.id }).id,
    createNode({ name: 'tsconfig.json', type: 'code', size: 580,  parentId: webApp.id }).id,
    createNode({ name: 'vite.config.ts', type: 'code', size: 820, parentId: webApp.id }).id,
  );
  srcDir.children.push(
    createNode({ name: 'index.ts',   type: 'code', size: 4200, parentId: srcDir.id }).id,
    createNode({ name: 'app.tsx',    type: 'code', size: 8900, parentId: srcDir.id }).id,
    createNode({ name: 'utils.ts',   type: 'code', size: 2100, parentId: srcDir.id }).id,
    createNode({ name: 'styles.css', type: 'code', size: 3400, parentId: srcDir.id }).id,
  );

  dotfiles.children.push(
    createNode({ name: '.bashrc',     type: 'code', size: 4200, parentId: dotfiles.id }).id,
    createNode({ name: '.gitconfig',  type: 'code', size: 320,  parentId: dotfiles.id }).id,
    createNode({ name: '.tmux.conf',  type: 'code', size: 1800, parentId: dotfiles.id }).id,
  );

  // Desktop
  desktop.children.push(
    createNode({ name: 'README.txt',       type: 'text', size: 480, parentId: desktop.id }).id,
    createNode({ name: 'project-links.url', type: 'generic', size: 120, parentId: desktop.id }).id,
    createNode({ name: 'screenshot.png',   type: 'image', size: 280000, parentId: desktop.id }).id,
  );

  // Config
  config.children.push(
    createNode({ name: 'nvim',  type: 'folder', parentId: config.id }).id,
    createNode({ name: 'fish',  type: 'folder', parentId: config.id }).id,
    createNode({ name: 'gitconfig', type: 'code', size: 320, parentId: config.id }).id,
  );

  return home;
}

// ============================================================
//  Application State
// ============================================================

const state = {
  homeId: null,
  dashboardId: 'dashboard',
  tabs: [],
  activeTabId: null,
  clipboard: null,
  selection: new Set(),
  sortBy: 'name',
  sortDir: 'asc',
  viewMode: 'grid',
  searchQuery: '',
  sidebarWidth: 264,
  nextTabId: 1,
  widgets: {
    imageGallery: { visible: true, orientation: 'vertical' }
  }
};

// ============================================================
//  Tab Management
// ============================================================

function createTab(nodeId) {
  const tabId = 't' + (state.nextTabId++);
  const tab = {
    id: tabId,
    nodeId: nodeId,
    history: [nodeId],
    historyIdx: 0,
    selectedIds: new Set(),
  };
  state.tabs.push(tab);
  state.activeTabId = tabId;
  return tab;
}

function getActiveTab() {
  return state.tabs.find(t => t.id === state.activeTabId);
}

function switchTab(tabId) {
  state.activeTabId = tabId;
  const tab = getActiveTab();
  if (tab) {
    state.selection = tab.selectedIds;
    state.searchQuery = '';
    document.getElementById('searchInput').value = '';
    renderAll();
  }
}

function closeTab(tabId) {
  const idx = state.tabs.findIndex(t => t.id === tabId);
  if (idx < 0) return;
  state.tabs.splice(idx, 1);
  if (state.tabs.length === 0) {
    createTab(state.dashboardId);
  } else if (state.activeTabId === tabId) {
    const newTab = state.tabs[Math.min(idx, state.tabs.length - 1)];
    state.activeTabId = newTab.id;
    state.selection = newTab.selectedIds;
  }
  renderAll();
}

function navigateTo(nodeId) {
  const tab = getActiveTab();
  if (!tab || tab.nodeId === nodeId) return;
  tab.history = tab.history.slice(0, tab.historyIdx + 1);
  tab.history.push(nodeId);
  tab.historyIdx = tab.history.length - 1;
  tab.nodeId = nodeId;
  tab.selectedIds = new Set();
  state.selection = tab.selectedIds;
  state.searchQuery = '';
  document.getElementById('searchInput').value = '';
  renderAll();
}

function goBack() {
  const tab = getActiveTab();
  if (!tab || tab.historyIdx <= 0) return;
  tab.historyIdx--;
  tab.nodeId = tab.history[tab.historyIdx];
  tab.selectedIds = new Set();
  state.selection = tab.selectedIds;
  renderAll();
}

function goForward() {
  const tab = getActiveTab();
  if (!tab || tab.historyIdx >= tab.history.length - 1) return;
  tab.historyIdx++;
  tab.nodeId = tab.history[tab.historyIdx];
  tab.selectedIds = new Set();
  state.selection = tab.selectedIds;
  renderAll();
}

function goUp() {
  const tab = getActiveTab();
  if (!tab) return;
  const node = fsNodes.get(tab.nodeId);
  if (node && node.parentId) {
    navigateTo(node.parentId);
  }
}

// ============================================================
//  Sidebar Rendering
// ============================================================

function getSidebarSections() {
  return [
    { title: 'Favorites', items: [
      { icon: 'layout-dashboard', label: 'Dashboard', nodeId: state.dashboardId },
      { icon: 'clock',      label: 'Recent',    special: 'recent' },
      { icon: 'star',       label: 'Starred',   special: 'starred' },
      { icon: 'trash-2',    label: 'Trash',     special: 'trash' },
    ]},
    { title: 'Places', items: [
      { icon: 'house',      label: 'Home',      nodeId: state.homeId },
      { icon: 'monitor',    label: 'Desktop',   nodeId: findNodeByPath(['Home', 'Desktop']) },
      { icon: 'file-text',  label: 'Documents', nodeId: findNodeByPath(['Home', 'Documents']) },
      { icon: 'download',   label: 'Downloads', nodeId: findNodeByPath(['Home', 'Downloads']) },
      { icon: 'image',      label: 'Pictures',  nodeId: findNodeByPath(['Home', 'Pictures']) },
      { icon: 'music',      label: 'Music',     nodeId: findNodeByPath(['Home', 'Music']) },
      { icon: 'film',       label: 'Videos',    nodeId: findNodeByPath(['Home', 'Videos']) },
    ]},
  ];
}

function getStorageItems() {
  return [
    { id: 'local',     name: 'Local SSD',       icon: 'hard-drive',   used: 380,   total: 500,  status: 'success' },
    { id: 'home-vol',  name: 'home volume',     icon: 'database',     used: 124,   total: 200,  status: 'success' },
    { id: 'usb',       name: 'USB Drive',       icon: 'usb',           used: 12,    total: 64,   status: 'success' },
    { id: 'nas',       name: 'nas.lan',         icon: 'server',        used: 1800,  total: 4000, status: 'success' },
    { id: 'nextcloud', name: 'Nextcloud',       icon: 'cloud',         used: 18,    total: 50,   status: 'success' },
    { id: 'gdrive',    name: 'Google Drive',    icon: 'cloud',         used: 8.4,   total: 15,   status: 'syncing' },
  ];
}

function renderSidebar() {
  const root = document.getElementById('sidebarScroll');
  const tab = getActiveTab();
  const activeNodeId = tab ? tab.nodeId : null;

  let html = '';

  for (const section of getSidebarSections()) {
    html += `<div class="nav-section">`;
    html += `<div class="nav-section-title">${section.title}</div>`;
    for (const item of section.items) {
      const active = item.nodeId && item.nodeId === activeNodeId;
      html += `<div class="nav-item ${active ? 'active' : ''}" data-node-id="${item.nodeId || ''}" data-special="${item.special || ''}">
        <i data-lucide="${item.icon}" class="icon"></i>
        <span class="label">${item.label}</span>
      </div>`;
    }
    html += `</div>`;
  }

  // Directory tree
  html += `<div class="nav-section">
    <div class="nav-section-title">Directory Tree</div>
    <div id="treeRoot">${renderTreeNode(state.homeId, 0, activeNodeId)}</div>
  </div>`;

  // Storage
  html += `<div class="nav-section">
    <div class="nav-section-title">Storage & Network</div>`;
  for (const item of getStorageItems()) {
    const pct = (item.used / item.total) * 100;
    const fillColor = pct > 90 ? 'danger' : pct > 75 ? 'warn' : '';
    const usedLabel = item.total >= 1000 ? `${(item.used/1000).toFixed(1)} TB` : `${item.used} GB`;
    const totalLabel = item.total >= 1000 ? `${(item.total/1000).toFixed(0)} TB` : `${item.total} GB`;
    html += `<div class="storage-item" data-storage="${item.id}">
      <div class="storage-item-head">
        <i data-lucide="${item.icon}" class="icon"></i>
        <span class="name">${item.name}</span>
        <span class="status-dot ${item.status === 'syncing' ? 'syncing' : ''}"></span>
      </div>
      <div class="storage-bar"><div class="storage-bar-fill ${fillColor}" style="width:${pct}%"></div></div>
      <div class="storage-meta"><span>${usedLabel} of ${totalLabel}</span><span>${pct.toFixed(0)}%</span></div>
    </div>`;
  }
  html += `</div>`;

  root.innerHTML = html;

  root.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      const nodeId = el.dataset.nodeId;
      const special = el.dataset.special;
      if (nodeId) {
        navigateTo(nodeId);
      } else if (special) {
        showToast(`${special.charAt(0).toUpperCase() + special.slice(1)} view is illustrative in this demo`, 'info');
      }
    });
  });

  root.querySelectorAll('.tree-arrow').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const nodeId = el.dataset.nodeId;
      const node = fsNodes.get(nodeId);
      if (node) {
        node.expanded = !node.expanded;
        renderSidebar();
      }
    });
  });

  root.querySelectorAll('.tree-item').forEach(el => {
    el.addEventListener('click', () => {
      const nodeId = el.dataset.nodeId;
      if (nodeId) navigateTo(nodeId);
    });
  });

  if (window.lucide) lucide.createIcons();
}

function renderTreeNode(nodeId, depth, activeNodeId) {
  const node = fsNodes.get(nodeId);
  if (!node) return '';

  const hasChildren = node.children && node.children.length > 0 && node.children.some(cid => {
    const c = fsNodes.get(cid);
    return c && c.type === 'folder';
  });
  const isActive = nodeId === activeNodeId;
  const padLeft = 8 + depth * 18;

  let html = `<div class="tree-node">`;
  html += `<div class="tree-item ${isActive ? 'active' : ''}" data-node-id="${nodeId}" style="padding-left:${padLeft}px">`;
  html += `<span class="tree-arrow ${node.expanded ? 'expanded' : ''} ${hasChildren ? '' : 'empty'}" data-node-id="${nodeId}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
  </span>`;
  html += `<i data-lucide="${node.expanded ? 'folder-open' : 'folder'}" class="tree-icon"></i>`;
  html += `<span class="tree-label">${escapeHtml(node.name)}</span>`;
  html += `</div>`;

  if (hasChildren && node.expanded) {
    html += `<div class="tree-children expanded">`;
    for (const cid of node.children) {
      const child = fsNodes.get(cid);
      if (child && child.type === 'folder') {
        html += renderTreeNode(cid, depth + 1, activeNodeId);
      }
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

// ============================================================
//  Breadcrumb
// ============================================================

function renderBreadcrumb() {
  const tab = getActiveTab();
  if (!tab) return;
  const path = getPath(tab.nodeId);
  const el = document.getElementById('breadcrumb');
  let html = '';
  path.forEach((p, i) => {
    if (i > 0) html += `<span class="crumb-sep"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>`;
    const current = i === path.length - 1;
    html += `<span class="crumb ${current ? 'current' : ''}" data-node-id="${p.id}">${escapeHtml(p.name)}</span>`;
  });
  el.innerHTML = html;
  el.querySelectorAll('.crumb').forEach(c => {
    c.addEventListener('click', () => {
      const id = c.dataset.nodeId;
      if (id) navigateTo(id);
    });
  });
}

// ============================================================
//  Tab strip
// ============================================================

function renderTabs() {
  const strip = document.getElementById('tabStrip');
  let html = '';
  for (const tab of state.tabs) {
    const node = fsNodes.get(tab.nodeId);
    const name = node ? node.name : '?';
    const active = tab.id === state.activeTabId;
    
    let iconStr = 'file';
    if (node) {
      if (node.type === 'dashboard') iconStr = 'layout-dashboard';
      else if (node.type === 'folder') iconStr = 'folder';
    }
    
    html += `<div class="tab ${active ? 'active' : ''}" data-tab-id="${tab.id}" title="${escapeHtml(name)}">
      <i data-lucide="${iconStr}" class="icon"></i>
      <span class="tab-label">${escapeHtml(name)}</span>
      <span class="tab-close" data-tab-id="${tab.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </span>
    </div>`;
  }
  html += `<button class="tab-new" id="newTabBtn" title="New tab"><i data-lucide="plus"></i></button>`;
  strip.innerHTML = html;

  strip.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) return;
      switchTab(t.dataset.tabId);
    });
    t.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showTabContextMenu(e.clientX, e.clientY, t.dataset.tabId);
    });
  });
  strip.querySelectorAll('.tab-close').forEach(c => {
    c.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(c.dataset.tabId);
    });
  });
  document.getElementById('newTabBtn').addEventListener('click', () => {
    const tab = getActiveTab();
    createTab(tab ? tab.nodeId : state.dashboardId);
    renderAll();
  });

  if (window.lucide) lucide.createIcons();
}

// ============================================================
//  Content rendering
// ============================================================

// Pre-defined actual images from Unsplash for the gallery
const GALLERY_IMAGES = [
  { src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=240&h=320&fit=crop', name: 'Mountain River' },
  { src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=240&h=200&fit=crop', name: 'Snowy Peaks' },
  { src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=240&h=280&fit=crop', name: 'Forest Cabin' },
  { src: 'https://images.unsplash.com/photo-1546587348-d12660c30c50?w=240&h=360&fit=crop', name: 'Waterfall' },
  { src: 'https://images.unsplash.com/photo-1433086966358-54859d0ed7df?w=240&h=240&fit=crop', name: 'Autumn Leaves' },
  { src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=240&h=300&fit=crop', name: 'Lake Reflection' },
  { src: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=240&h=220&fit=crop', name: 'Desert Dunes' },
  { src: 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=240&h=340&fit=crop', name: 'City Street' },
  { src: 'https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=240&h=260&fit=crop', name: 'Coastal Cliffs' },
  { src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=240&h=380&fit=crop', name: 'Sunset Rays' },
  { src: 'https://images.unsplash.com/photo-1475924156734-496f6ca7a043?w=240&h=210&fit=crop', name: 'Green Valley' },
  { src: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=240&h=290&fit=crop', name: 'Ocean Waves' },
  { src: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=240&h=250&fit=crop', name: 'Misty Forest' },
  { src: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=240&h=330&fit=crop', name: 'Starry Night' }
];

function renderContent() {
  const scroll = document.getElementById('contentScroll');
  const tab = getActiveTab();
  if (!tab) return;

  // Dashboard view shows widgets
  if (tab.nodeId === state.dashboardId && !state.searchQuery) {
    scroll.innerHTML = renderHomeView();
    wireHomeView();
    if (window.lucide) lucide.createIcons();
    return;
  }

  const items = getCurrentItems();

  if (items.length === 0) {
    if (state.searchQuery) {
      scroll.innerHTML = `<div class="empty-state">
        <i data-lucide="search-x"></i>
        <div class="title">No results for "${escapeHtml(state.searchQuery)}"</div>
        <div class="desc">Try a different search term or clear the search</div>
      </div>`;
    } else {
      scroll.innerHTML = `<div class="empty-state">
        <i data-lucide="folder-open"></i>
        <div class="title">This folder is empty</div>
        <div class="desc">Create a new file or folder to get started</div>
      </div>`;
    }
    if (window.lucide) lucide.createIcons();
    return;
  }

  if (state.viewMode === 'grid') {
    scroll.innerHTML = renderGrid(items);
  } else {
    scroll.innerHTML = renderList(items, state.viewMode === 'compact');
  }

  wireFileItems();
  if (window.lucide) lucide.createIcons();
}

// ============================================================
//  Home View — Widgets (Win11 inspired)
// ============================================================

function renderHomeView() {
  let html = `<div class="home-view">`;

  // ---------- Image Gallery Widget ----------
  if (state.widgets.imageGallery.visible) {
    const orient = state.widgets.imageGallery.orientation;
    const orientIcon = orient === 'vertical' ? 'rows-3' : 'columns-3';
    const orientLabel = orient === 'vertical' ? 'Switch to horizontal scroll' : 'Switch to vertical masonry';
    const orientSubtitle = orient === 'vertical'
      ? `${GALLERY_IMAGES.length} images · masonry layout`
      : `${GALLERY_IMAGES.length} images · horizontal scroll`;

    html += `
      <section class="widget-box" id="widget-gallery">
        <header class="widget-header">
          <div class="widget-header-icon"><i data-lucide="image"></i></div>
          <div class="widget-header-text">
            <div class="widget-title">Image Gallery</div>
            <div class="widget-subtitle">${orientSubtitle}</div>
          </div>
        </header>
        <div class="widget-actions">
          <button class="widget-action-btn" data-action="toggle-orientation" title="${orientLabel}">
            <i data-lucide="${orientIcon}"></i>
          </button>
          <button class="widget-action-btn" data-action="refresh-gallery" title="Refresh images">
            <i data-lucide="refresh-cw"></i>
          </button>
          <button class="widget-action-btn danger" data-action="close-gallery" title="Close widget">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="widget-body">
          <div class="masonry-gallery ${orient}">
            ${GALLERY_IMAGES.map((img, i) => {
              return `
              <div class="masonry-item" data-index="${i}" title="${escapeHtml(img.name)}">
                <img src="${img.src}" alt="${escapeHtml(img.name)}" loading="lazy">
                <div class="masonry-name">${escapeHtml(img.name)}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </section>
    `;
  }

  // ---------- Empty state ----------
  if (!state.widgets.imageGallery.visible) {
    html += `
      <div class="widgets-empty">
        <i data-lucide="layout-grid"></i>
        <div style="font-size:14px;font-weight:500;color:var(--text-secondary);">No widgets active</div>
        <div style="font-size:12.5px;">Refresh the page to restore default widgets</div>
      </div>`;
  }

  html += `</div>`;
  return html;
}

function wireHomeView() {
  // Widget action buttons
  document.querySelectorAll('.widget-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      switch (action) {
        case 'toggle-orientation':
          toggleGalleryOrientation();
          break;
        case 'refresh-gallery':
          showToast('Gallery refreshed', 'info');
          renderContent();
          break;
        case 'close-gallery':
          closeWidget('imageGallery');
          break;
      }
    });
  });

  // Click on masonry item -> open properties
  document.querySelectorAll('.masonry-item').forEach(el => {
    el.addEventListener('click', () => {
      const index = el.dataset.index;
      const img = GALLERY_IMAGES[index];
      if (img) showToast(`Selected: ${img.name}`, 'info');
    });
    el.addEventListener('dblclick', () => {
      const index = el.dataset.index;
      const img = GALLERY_IMAGES[index];
      if (img) showToast(`Opening: ${img.name}`, 'info');
    });
  });
}

function toggleGalleryOrientation() {
  const w = state.widgets.imageGallery;
  w.orientation = w.orientation === 'vertical' ? 'horizontal' : 'vertical';
  renderContent();
  showToast(`Gallery: ${w.orientation === 'vertical' ? 'vertical masonry' : 'horizontal scroll'}`, 'info');
}

function closeWidget(name) {
  if (name === 'imageGallery') state.widgets.imageGallery.visible = false;
  renderContent();
}

function getCurrentItems() {
  const tab = getActiveTab();
  if (!tab || tab.nodeId === 'dashboard') return [];
  
  const node = fsNodes.get(tab.nodeId);
  if (!node || !node.children) return [];
  let items = node.children.map(cid => fsNodes.get(cid)).filter(Boolean);

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    items = items.filter(it => it.name.toLowerCase().includes(q));
  }

  const dir = state.sortDir === 'asc' ? 1 : -1;
  items.sort((a, b) => {
    const aFolder = a.type === 'folder';
    const bFolder = b.type === 'folder';
    if (aFolder !== bFolder) return aFolder ? -1 : 1;
    let av, bv;
    switch (state.sortBy) {
      case 'name':
        av = a.name.toLowerCase(); bv = b.name.toLowerCase();
        return av < bv ? -1 * dir : (av > bv ? 1 * dir : 0);
      case 'size':
        av = a.size; bv = b.size;
        return (av - bv) * dir;
      case 'type':
        av = a.type; bv = b.type;
        return av < bv ? -1 * dir : (av > bv ? 1 * dir : 0);
      case 'modified':
        av = a.modified.getTime(); bv = b.modified.getTime();
        return (av - bv) * dir;
      default: return 0;
    }
  });

  return items;
}

function formatSize(bytes) {
  if (bytes === 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  if (bytes < 1024 * 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  return (bytes / 1024 / 1024 / 1024 / 1024).toFixed(2) + ' TB';
}

function formatDate(d) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today - that) / 86400000);
  if (diffDays === 0) return 'Today, ' + d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return diffDays + ' days ago';
  return d.toLocaleDateString([], {year: 'numeric', month: 'short', day: 'numeric'});
}

function getFileMeta(node) {
  return TYPE_META[node.type] || TYPE_META.generic;
}

function renderGrid(items) {
  let html = `<div class="file-grid">`;
  for (const it of items) {
    const meta = getFileMeta(it);
    const selected = state.selection.has(it.id);
    html += `<div class="file-item ${selected ? 'selected' : ''}" data-node-id="${it.id}">
      <div class="file-checkbox ${selected ? 'checked' : ''}"></div>
      <div class="file-icon-wrap">
        <i data-lucide="${meta.icon}" class="${meta.class}"></i>
      </div>
      <div class="file-name">${escapeHtml(it.name)}</div>
    </div>`;
  }
  html += `</div>`;
  return html;
}

function renderList(items, compact) {
  const sortIcon = state.sortDir === 'asc' ? 'chevron-up' : 'chevron-down';
  let html = `<div class="file-list ${compact ? 'compact' : ''}">`;
  html += `<div class="list-header">
    <div class="col name ${state.sortBy === 'name' ? 'sorted' : ''}" data-sort="name">
      <span>Name</span>
      ${state.sortBy === 'name' ? `<i data-lucide="${sortIcon}"></i>` : ''}
    </div>
    <div class="col size ${state.sortBy === 'size' ? 'sorted' : ''}" data-sort="size">
      <span>Size</span>
      ${state.sortBy === 'size' ? `<i data-lucide="${sortIcon}"></i>` : ''}
    </div>
    <div class="col type ${state.sortBy === 'type' ? 'sorted' : ''}" data-sort="type">
      <span>Type</span>
      ${state.sortBy === 'type' ? `<i data-lucide="${sortIcon}"></i>` : ''}
    </div>
    <div class="col date ${state.sortBy === 'modified' ? 'sorted' : ''}" data-sort="modified">
      <span>Modified</span>
      ${state.sortBy === 'modified' ? `<i data-lucide="${sortIcon}"></i>` : ''}
    </div>
    <div></div>
  </div>`;

  for (const it of items) {
    const meta = getFileMeta(it);
    const selected = state.selection.has(it.id);
    const size = it.type === 'folder' ? '—' : formatSize(it.size);
    html += `<div class="list-row ${selected ? 'selected' : ''}" data-node-id="${it.id}">
      <div class="name-col">
        <div class="file-icon-wrap"><i data-lucide="${meta.icon}" class="${meta.class}"></i></div>
        <span class="name-text">${escapeHtml(it.name)}</span>
      </div>
      <div class="size-col">${size}</div>
      <div class="type-col">${meta.label}</div>
      <div class="date-col">${formatDate(it.modified)}</div>
      <div></div>
    </div>`;
  }
  html += `</div>`;
  return html;
}

function wireFileItems() {
  document.querySelectorAll('.file-item, .list-row').forEach(el => {
    const nodeId = el.dataset.nodeId;

    el.addEventListener('click', (e) => {
      const isCheckbox = e.target.closest('.file-checkbox');

      if (isCheckbox) {
        e.stopPropagation();
        if (state.selection.has(nodeId)) state.selection.delete(nodeId);
        else state.selection.add(nodeId);
      } else if (e.ctrlKey || e.metaKey) {
        if (state.selection.has(nodeId)) state.selection.delete(nodeId);
        else state.selection.add(nodeId);
      } else if (e.shiftKey) {
        const items = getCurrentItems();
        const idx = items.findIndex(i => i.id === nodeId);
        if (idx >= 0 && state.selection.size > 0) {
          const lastSelected = Array.from(state.selection).pop();
          const lastIdx = items.findIndex(i => i.id === lastSelected);
          if (lastIdx >= 0) {
            const start = Math.min(idx, lastIdx);
            const end = Math.max(idx, lastIdx);
            for (let i = start; i <= end; i++) state.selection.add(items[i].id);
          }
        } else {
          state.selection.clear();
          state.selection.add(nodeId);
        }
      } else {
        state.selection.clear();
        state.selection.add(nodeId);
      }

      const tab = getActiveTab();
      if (tab) tab.selectedIds = state.selection;
      updateSelectionUI();
    });

    el.addEventListener('dblclick', () => {
      const node = fsNodes.get(nodeId);
      if (!node) return;
      if (node.type === 'folder') {
        navigateTo(nodeId);
      } else {
        showProperties(nodeId);
      }
    });

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!state.selection.has(nodeId)) {
        state.selection.clear();
        state.selection.add(nodeId);
        const tab = getActiveTab();
        if (tab) tab.selectedIds = state.selection;
        updateSelectionUI();
      }
      showFileContextMenu(e.clientX, e.clientY, nodeId);
    });
  });

  document.querySelectorAll('.list-header .col').forEach(c => {
    c.addEventListener('click', () => {
      const sort = c.dataset.sort;
      if (!sort) return;
      if (state.sortBy === sort) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = sort;
        state.sortDir = 'asc';
      }
      renderContent();
      renderStatusbar();
    });
  });
}

function updateSelectionUI() {
  document.querySelectorAll('.file-item, .list-row').forEach(el => {
    const id = el.dataset.nodeId;
    const selected = state.selection.has(id);
    el.classList.toggle('selected', selected);
    const cb = el.querySelector('.file-checkbox');
    if (cb) cb.classList.toggle('checked', selected);
  });
  renderStatusbar();
  renderSelectionInfo();
  updateActionButtons();
}

function renderStatusbar() {
  const items = getCurrentItems();
  const totalSize = state.selection.size > 0
    ? Array.from(state.selection).map(id => fsNodes.get(id)).filter(Boolean).reduce((s, n) => s + (n.size || 0), 0)
    : 0;

  const tab = getActiveTab();
  let storageLabel = 'Local SSD · 120 GB free';
  if (tab) {
    const path = getPath(tab.nodeId);
    if (path.length > 1 && path[1].name === 'Home') storageLabel = 'home volume · 76 GB free';
    else if (tab.nodeId === 'dashboard') storageLabel = 'System Overview';
  }

  const sortLabels = { name: 'Name', size: 'Size', type: 'Type', modified: 'Modified' };
  const sortIcon = state.sortDir === 'asc' ? 'chevron-up' : 'chevron-down';

  const el = document.getElementById('statusbar');
  el.innerHTML = `
    <div class="status-left">
      <div class="status-item">
        <i data-lucide="${tab && tab.nodeId === 'dashboard' ? 'layout-dashboard' : 'folder'}"></i>
        <span>${tab && tab.nodeId === 'dashboard' ? 'Dashboard' : `${items.length} item${items.length !== 1 ? 's' : ''}`}</span>
      </div>
      ${state.selection.size > 0 ? `
        <div class="status-divider"></div>
        <div class="status-item">
          <span class="status-accent">${state.selection.size} selected</span>
          ${totalSize > 0 ? `<span class="status-muted">· ${formatSize(totalSize)}</span>` : ''}
        </div>
      ` : ''}
    </div>
    <div class="status-spacer"></div>
    <div class="status-right-group">
      <div class="view-segmented">
        <button class="seg-btn ${state.viewMode === 'grid' ? 'active' : ''}" data-view="grid" title="Grid view">
          <i data-lucide="grid-3x3"></i>
        </button>
        <button class="seg-btn ${state.viewMode === 'list' ? 'active' : ''}" data-view="list" title="List view">
          <i data-lucide="list"></i>
        </button>
        <button class="seg-btn ${state.viewMode === 'compact' ? 'active' : ''}" data-view="compact" title="Compact view">
          <i data-lucide="rows-3"></i>
        </button>
      </div>
      <button class="sort-btn" id="sortBtn">
        <i data-lucide="arrow-up-down"></i>
        <span>${sortLabels[state.sortBy]}</span>
        <i data-lucide="${sortIcon}" class="chev"></i>
      </button>
      <div class="status-divider"></div>
      <div class="status-item">
        <i data-lucide="hard-drive"></i>
        <span>${storageLabel}</span>
      </div>
    </div>
  `;

  el.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => setViewMode(btn.dataset.view));
  });

  const sortBtn = document.getElementById('sortBtn');
  if (sortBtn) {
    sortBtn.addEventListener('click', () => {
      const rect = sortBtn.getBoundingClientRect();
      showSortMenu(rect.left, rect.top, true);
    });
  }

  if (window.lucide) lucide.createIcons();
}

function renderSelectionInfo() {
  const el = document.getElementById('selectionInfo');
  if (state.selection.size === 0) {
    el.innerHTML = '';
  } else {
    el.innerHTML = `<span class="dot"></span><span class="count">${state.selection.size}</span><span>selected</span>`;
  }
}

function updateActionButtons() {
  const hasSelection = state.selection.size > 0;
  const hasClipboard = state.clipboard && state.clipboard.ids.length > 0;
  const tab = getActiveTab();
  const isDashboard = tab && tab.nodeId === 'dashboard';

  // Directory bar actions
  document.getElementById('pasteBtn').disabled = !hasClipboard || isDashboard;

  // Action bar buttons
  document.getElementById('copyBtn').disabled = !hasSelection;
  document.getElementById('cutBtn').disabled = !hasSelection;
  document.getElementById('renameBtn').disabled = state.selection.size !== 1;
  document.getElementById('deleteBtn').disabled = !hasSelection;

  // Auto-hide action bar
  const actionBar = document.getElementById('actionBar');
  if (hasSelection) {
    actionBar.classList.remove('hidden');
  } else {
    actionBar.classList.add('hidden');
  }
}

function updateNavButtons() {
  const tab = getActiveTab();
  if (!tab) return;
  document.getElementById('backBtn').disabled = tab.historyIdx <= 0;
  document.getElementById('forwardBtn').disabled = tab.historyIdx >= tab.history.length - 1;
  const node = fsNodes.get(tab.nodeId);
  document.getElementById('upBtn').disabled = !node || !node.parentId;
}

function setViewMode(mode) {
  state.viewMode = mode;
  renderContent();
  renderStatusbar();
}

function renderAll() {
  renderSidebar();
  renderTabs();
  renderBreadcrumb();
  renderContent();
  renderStatusbar();
  renderSelectionInfo();
  updateActionButtons();
  updateNavButtons();
}

// ============================================================
//  Context menus
// ============================================================

function closeAllMenus() {
  document.querySelectorAll('.context-menu').forEach(m => m.remove());
}

function positionMenu(menu, x, y, openAbove = false) {
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  let mx = Math.min(x, window.innerWidth - rect.width - 8);
  let my;
  if (openAbove) {
    my = y - rect.height;
    if (my < 8) my = 8;
  } else {
    my = Math.min(y, window.innerHeight - rect.height - 8);
    if (my < 8) my = 8;
  }
  if (mx < 8) mx = 8;
  menu.style.left = mx + 'px';
  menu.style.top = my + 'px';
}

function showFileContextMenu(x, y, nodeId) {
  closeAllMenus();
  const node = fsNodes.get(nodeId);
  if (!node) return;
  const isFolder = node.type === 'folder';
  const multi = state.selection.size > 1;

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    ${multi ? `<div class="menu-section-label">${state.selection.size} items selected</div>` : ''}
    <div class="menu-item" data-action="open">
      <i data-lucide="${isFolder ? 'folder-open' : 'external-link'}" class="icon"></i>
      <span class="label">Open</span>
    </div>
    ${isFolder ? `
      <div class="menu-item" data-action="open-new-tab">
        <i data-lucide="square-arrow-out-up-right" class="icon"></i>
        <span class="label">Open in new tab</span>
      </div>
    ` : `
      <div class="menu-item" data-action="open-with">
        <i data-lucide="app-window" class="icon"></i>
        <span class="label">Open with…</span>
        <i data-lucide="chevron-right" class="menu-arrow"></i>
      </div>
    `}
    <div class="menu-separator"></div>
    <div class="menu-item" data-action="copy">
      <i data-lucide="copy" class="icon"></i>
      <span class="label">Copy</span>
      <span class="shortcut">Ctrl+C</span>
    </div>
    <div class="menu-item" data-action="cut">
      <i data-lucide="scissors" class="icon"></i>
      <span class="label">Cut</span>
      <span class="shortcut">Ctrl+X</span>
    </div>
    <div class="menu-item ${multi ? 'disabled' : ''}" data-action="duplicate">
      <i data-lucide="copy-plus" class="icon"></i>
      <span class="label">Duplicate</span>
    </div>
    <div class="menu-item ${multi ? 'disabled' : ''}" data-action="rename">
      <i data-lucide="pencil-line" class="icon"></i>
      <span class="label">Rename…</span>
      <span class="shortcut">F2</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item" data-action="properties">
      <i data-lucide="info" class="icon"></i>
      <span class="label">Properties</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item danger" data-action="trash">
      <i data-lucide="trash-2" class="icon"></i>
      <span class="label">Move to Trash</span>
      <span class="shortcut">Del</span>
    </div>
  `;

  positionMenu(menu, x, y);
  if (window.lucide) lucide.createIcons();

  menu.querySelectorAll('.menu-item').forEach(mi => {
    mi.addEventListener('click', () => {
      if (mi.classList.contains('disabled')) return;
      const action = mi.dataset.action;
      closeAllMenus();
      handleFileAction(action, nodeId);
    });
  });
}

function handleFileAction(action, nodeId) {
  switch (action) {
    case 'open': {
      const node = fsNodes.get(nodeId);
      if (node) {
        if (node.type === 'folder') navigateTo(nodeId);
        else showProperties(nodeId);
      }
      break;
    }
    case 'open-new-tab':
      createTab(nodeId);
      renderAll();
      break;
    case 'open-with':
      showToast('Application picker is illustrative in this demo', 'info');
      break;
    case 'copy': copySelection(); break;
    case 'cut': cutSelection(); break;
    case 'rename':
      if (state.selection.size === 1) showRenameDialog(nodeId);
      break;
    case 'duplicate': duplicateNode(nodeId); break;
    case 'properties': showProperties(nodeId); break;
    case 'trash': trashSelection(); break;
  }
}

function showBackgroundContextMenu(x, y) {
  closeAllMenus();
  const tab = getActiveTab();
  const isDashboard = tab && tab.nodeId === 'dashboard';
  
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <div class="menu-item ${isDashboard ? 'disabled' : ''}" data-action="new-folder">
      <i data-lucide="folder-plus" class="icon"></i>
      <span class="label">New folder</span>
      <span class="shortcut">Ctrl+Shift+N</span>
    </div>
    <div class="menu-item ${isDashboard ? 'disabled' : ''}" data-action="new-file">
      <i data-lucide="file-plus" class="icon"></i>
      <span class="label">New file</span>
    </div>
    <div class="menu-item" data-action="import">
      <i data-lucide="upload" class="icon"></i>
      <span class="label">Import files…</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item ${(!state.clipboard || isDashboard) ? 'disabled' : ''}" data-action="paste">
      <i data-lucide="clipboard-paste" class="icon"></i>
      <span class="label">Paste</span>
      <span class="shortcut">Ctrl+V</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item" data-action="select-all">
      <i data-lucide="square-mouse-pointer" class="icon"></i>
      <span class="label">Select all</span>
      <span class="shortcut">Ctrl+A</span>
    </div>
    <div class="menu-item" data-action="refresh">
      <i data-lucide="refresh-cw" class="icon"></i>
      <span class="label">Refresh</span>
      <span class="shortcut">F5</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item" data-action="properties-folder">
      <i data-lucide="info" class="icon"></i>
      <span class="label">Properties</span>
    </div>
  `;

  positionMenu(menu, x, y);
  if (window.lucide) lucide.createIcons();

  menu.querySelectorAll('.menu-item').forEach(mi => {
    mi.addEventListener('click', () => {
      if (mi.classList.contains('disabled')) return;
      const action = mi.dataset.action;
      closeAllMenus();
      switch (action) {
        case 'new-folder': showNewFolderDialog(); break;
        case 'new-file': showNewFileDialog(); break;
        case 'import': triggerFileImport(); break;
        case 'paste': pasteClipboard(); break;
        case 'select-all': selectAll(); break;
        case 'refresh':
          renderAll();
          showToast('Refreshed', 'info');
          break;
        case 'properties-folder':
          if (tab) showProperties(tab.nodeId);
          break;
      }
    });
  });
}

function showSortMenu(x, y, openAbove = false) {
  closeAllMenus();
  const options = [
    { key: 'name', label: 'Name' },
    { key: 'size', label: 'Size' },
    { key: 'type', label: 'Type' },
    { key: 'modified', label: 'Date modified' },
  ];
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `<div class="menu-section-label">Sort by</div>` +
    options.map(o => `
      <div class="menu-item" data-sort="${o.key}">
        <i data-lucide="${state.sortBy === o.key ? 'check' : 'circle'}" class="icon" style="${state.sortBy === o.key ? 'color:var(--accent)' : 'opacity:0'}"></i>
        <span class="label">${o.label}</span>
      </div>
    `).join('') +
    `<div class="menu-separator"></div>
    <div class="menu-section-label">Order</div>
    <div class="menu-item" data-dir="asc">
      <i data-lucide="${state.sortDir === 'asc' ? 'check' : 'circle'}" class="icon" style="${state.sortDir === 'asc' ? 'color:var(--accent)' : 'opacity:0'}"></i>
      <span class="label">Ascending</span>
    </div>
    <div class="menu-item" data-dir="desc">
      <i data-lucide="${state.sortDir === 'desc' ? 'check' : 'circle'}" class="icon" style="${state.sortDir === 'desc' ? 'color:var(--accent)' : 'opacity:0'}"></i>
      <span class="label">Descending</span>
    </div>`;
  positionMenu(menu, x, y, openAbove);
  if (window.lucide) lucide.createIcons();

  menu.querySelectorAll('[data-sort]').forEach(mi => {
    mi.addEventListener('click', () => {
      state.sortBy = mi.dataset.sort;
      state.sortDir = 'asc';
      closeAllMenus();
      renderContent();
      renderStatusbar();
    });
  });
  menu.querySelectorAll('[data-dir]').forEach(mi => {
    mi.addEventListener('click', () => {
      state.sortDir = mi.dataset.dir;
      closeAllMenus();
      renderContent();
      renderStatusbar();
    });
  });
}

function showMoreMenu(x, y) {
  closeAllMenus();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <div class="menu-item" data-action="select-all">
      <i data-lucide="square-mouse-pointer" class="icon"></i>
      <span class="label">Select all</span>
      <span class="shortcut">Ctrl+A</span>
    </div>
    <div class="menu-item" data-action="invert">
      <i data-lucide="list-checks" class="icon"></i>
      <span class="label">Invert selection</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item" data-action="terminal">
      <i data-lucide="terminal" class="icon"></i>
      <span class="label">Open terminal here</span>
    </div>
    <div class="menu-item" data-action="import">
      <i data-lucide="upload" class="icon"></i>
      <span class="label">Import files…</span>
    </div>
    <div class="menu-item" data-action="export">
      <i data-lucide="download" class="icon"></i>
      <span class="label">Export listing…</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item" data-action="properties-folder">
      <i data-lucide="info" class="icon"></i>
      <span class="label">Folder properties</span>
    </div>
  `;
  positionMenu(menu, x, y);
  if (window.lucide) lucide.createIcons();

  menu.querySelectorAll('.menu-item').forEach(mi => {
    mi.addEventListener('click', () => {
      const action = mi.dataset.action;
      closeAllMenus();
      switch (action) {
        case 'select-all': selectAll(); break;
        case 'invert': {
          const items = getCurrentItems();
          const newSel = new Set();
          items.forEach(it => { if (!state.selection.has(it.id)) newSel.add(it.id); });
          state.selection = newSel;
          const tab = getActiveTab();
          if (tab) tab.selectedIds = state.selection;
          updateSelectionUI();
          break;
        }
        case 'terminal': showToast('Terminal requires system integration not available in browser', 'info'); break;
        case 'import': triggerFileImport(); break;
        case 'export': showToast('Listing exported to clipboard', 'success'); break;
        case 'properties-folder':
          const tab = getActiveTab();
          if (tab) showProperties(tab.nodeId);
          break;
      }
    });
  });
}

function showTabContextMenu(x, y, tabId) {
  closeAllMenus();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <div class="menu-item" data-action="new-tab-right">
      <i data-lucide="plus" class="icon"></i>
      <span class="label">New tab to the right</span>
    </div>
    <div class="menu-item" data-action="duplicate-tab">
      <i data-lucide="copy" class="icon"></i>
      <span class="label">Duplicate this tab</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item" data-action="close">
      <i data-lucide="x" class="icon"></i>
      <span class="label">Close tab</span>
    </div>
    <div class="menu-item" data-action="close-others">
      <i data-lucide="square-x" class="icon"></i>
      <span class="label">Close other tabs</span>
    </div>
  `;
  positionMenu(menu, x, y);
  if (window.lucide) lucide.createIcons();

  menu.querySelectorAll('.menu-item').forEach(mi => {
    mi.addEventListener('click', () => {
      const action = mi.dataset.action;
      closeAllMenus();
      const tab = state.tabs.find(t => t.id === tabId);
      if (!tab) return;
      switch (action) {
        case 'new-tab-right':
          createTab(tab.nodeId);
          renderAll();
          break;
        case 'duplicate-tab':
          const dup = createTab(tab.nodeId);
          state.activeTabId = dup.id;
          renderAll();
          break;
        case 'close':
          closeTab(tabId);
          break;
        case 'close-others':
          state.tabs = state.tabs.filter(t => t.id === tabId);
          state.activeTabId = tabId;
          renderAll();
          break;
      }
    });
  });
}

// ============================================================
//  File operations
// ============================================================

function copySelection() {
  if (state.selection.size === 0) return;
  state.clipboard = { mode: 'copy', ids: Array.from(state.selection) };
  updateActionButtons();
  showToast(`Copied ${state.selection.size} item${state.selection.size > 1 ? 's' : ''}`, 'success');
}

function cutSelection() {
  if (state.selection.size === 0) return;
  state.clipboard = { mode: 'cut', ids: Array.from(state.selection) };
  updateActionButtons();
  showToast(`Cut ${state.selection.size} item${state.selection.size > 1 ? 's' : ''}`, 'success');
}

function pasteClipboard() {
  if (!state.clipboard) return;
  const tab = getActiveTab();
  if (!tab || tab.nodeId === 'dashboard') return;
  
  const dest = fsNodes.get(tab.nodeId);
  if (!dest || !dest.children) return;

  let count = 0;
  for (const id of state.clipboard.ids) {
    const node = fsNodes.get(id);
    if (!node) continue;
    if (state.clipboard.mode === 'cut' && (id === tab.nodeId || isAncestor(id, tab.nodeId))) continue;

    let newName = node.name;
    if (state.clipboard.mode === 'copy') {
      newName = getUniqueName(dest, node.name);
      cloneNodeTree(node, dest, newName);
    } else {
      const oldParent = fsNodes.get(node.parentId);
      if (oldParent) {
        const idx = oldParent.children.indexOf(id);
        if (idx >= 0) oldParent.children.splice(idx, 1);
      }
      node.parentId = dest.id;
      node.name = newName;
      dest.children.push(id);
    }
    count++;
  }

  if (state.clipboard.mode === 'cut') state.clipboard = null;
  state.selection.clear();
  renderAll();
  if (count > 0) showToast(`Pasted ${count} item${count > 1 ? 's' : ''}`, 'success');
}

function cloneNodeTree(node, parent, name) {
  const clone = createNode({
    name: name,
    type: node.type,
    parentId: parent.id,
    size: node.size,
    meta: { ...node.meta },
  });
  parent.children.push(clone.id);
  if (node.children) {
    for (const cid of node.children) {
      const child = fsNodes.get(cid);
      if (child) cloneNodeTree(child, clone, child.name);
    }
  }
  return clone;
}

function getUniqueName(parent, name) {
  if (!getChildByName(parent.id, name)) return name;
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.substring(0, dot) : name;
  const ext = dot > 0 ? name.substring(dot) : '';
  let i = 1;
  while (getChildByName(parent.id, `${base} (copy${i > 1 ? ' ' + i : ''})${ext}`)) i++;
  return `${base} (copy${i > 1 ? ' ' + i : ''})${ext}`;
}

function trashSelection() {
  if (state.selection.size === 0) return;
  const count = state.selection.size;

  if (count >= 3) {
    showConfirmDialog(
      `Move ${count} items to trash?`,
      `These ${count} items will be moved to the trash. You can restore them later from the Trash.`,
      () => doTrash()
    );
  } else {
    doTrash();
  }
}

function doTrash() {
  const tab = getActiveTab();
  if (!tab) return;
  const parent = fsNodes.get(tab.nodeId);
  if (!parent || !parent.children) return;

  const count = state.selection.size;
  for (const id of state.selection) {
    const idx = parent.children.indexOf(id);
    if (idx >= 0) parent.children.splice(idx, 1);
  }
  state.selection.clear();
  renderAll();
  showToast(`Moved ${count} item${count > 1 ? 's' : ''} to trash`, 'success');
}

function duplicateNode(nodeId) {
  const node = fsNodes.get(nodeId);
  if (!node || !node.parentId) return;
  const parent = fsNodes.get(node.parentId);
  if (!parent) return;
  const newName = getUniqueName(parent, node.name);
  cloneNodeTree(node, parent, newName);
  state.selection.clear();
  renderAll();
  showToast('Item duplicated', 'success');
}

function showRenameDialog(nodeId) {
  const node = fsNodes.get(nodeId);
  if (!node) return;
  showDialog({
    title: 'Rename item',
    desc: 'Enter a new name for this item.',
    input: { value: node.name, selectName: true },
    primaryLabel: 'Rename',
    onPrimary: (val) => {
      if (!val || val === node.name) return;
      const parent = fsNodes.get(node.parentId);
      if (parent && getChildByName(parent.id, val) && val !== node.name) {
        showToast('An item with this name already exists', 'error');
        return;
      }
      node.name = val;
      node.modified = new Date();
      renderAll();
      showToast('Renamed successfully', 'success');
    }
  });
}

function showNewFolderDialog() {
  const tab = getActiveTab();
  if (!tab || tab.nodeId === 'dashboard') {
    showToast('Cannot create folders on the Dashboard', 'info');
    return;
  }
  const parent = fsNodes.get(tab.nodeId);
  if (!parent) return;
  const name = getUniqueName(parent, 'New Folder');
  showDialog({
    title: 'New folder',
    desc: 'Enter a name for the new folder.',
    input: { value: name, selectName: true },
    primaryLabel: 'Create',
    onPrimary: (val) => {
      if (!val) return;
      if (getChildByName(parent.id, val)) {
        showToast('An item with this name already exists', 'error');
        return;
      }
      const node = createNode({ name: val, type: 'folder', parentId: parent.id });
      parent.children.push(node.id);
      parent.expanded = true;
      renderAll();
      showToast('Folder created', 'success');
    }
  });
}

function showNewFileDialog() {
  const tab = getActiveTab();
  if (!tab || tab.nodeId === 'dashboard') {
    showToast('Cannot create files on the Dashboard', 'info');
    return;
  }
  const parent = fsNodes.get(tab.nodeId);
  if (!parent) return;
  const name = getUniqueName(parent, 'untitled.txt');
  showDialog({
    title: 'New file',
    desc: 'Enter a name for the new file.',
    input: { value: name, selectName: true },
    primaryLabel: 'Create',
    onPrimary: (val) => {
      if (!val) return;
      if (getChildByName(parent.id, val)) {
        showToast('An item with this name already exists', 'error');
        return;
      }
      const node = createNode({ name: val, type: 'text', parentId: parent.id, size: 0 });
      parent.children.push(node.id);
      renderAll();
      showToast('File created', 'success');
    }
  });
}

// ============================================================
//  Properties panel
// ============================================================

let propertiesPanelEl = null;

function showProperties(nodeId) {
  const node = fsNodes.get(nodeId);
  if (!node || node.type === 'dashboard') return;

  if (propertiesPanelEl) propertiesPanelEl.remove();

  const meta = getFileMeta(node);
  const location = getPath(nodeId).slice(0, -1).map(p => p.name).join(' / ') || '/';

  let preview = `<div class="prop-preview"><i data-lucide="${meta.icon}" class="${meta.class}"></i></div>`;

  let rows = `
    <div class="prop-row"><span class="key">Type</span><span class="val">${meta.label}</span></div>
    <div class="prop-row"><span class="key">Location</span><span class="val" title="${escapeHtml(location)}">${escapeHtml(location)}</span></div>
    <div class="prop-row"><span class="key">Size</span><span class="val">${node.type === 'folder' ? '—' : formatSize(node.size)}</span></div>
    <div class="prop-row"><span class="key">Modified</span><span class="val">${formatDate(node.modified)}</span></div>
  `;

  if (node.type === 'image' && node.meta.w) {
    rows += `<div class="prop-row"><span class="key">Dimensions</span><span class="val">${node.meta.w} × ${node.meta.h}</span></div>`;
  }
  if (node.type === 'folder') {
    const childCount = node.children ? node.children.length : 0;
    rows += `<div class="prop-row"><span class="key">Items</span><span class="val">${childCount}</span></div>`;
  }

  const panel = document.createElement('div');
  panel.className = 'properties-panel';
  panel.innerHTML = `
    <div class="properties-header">
      <div class="icon-wrap"><i data-lucide="${meta.icon}" class="${meta.class}"></i></div>
      <div style="overflow:hidden;flex:1">
        <div class="name">${escapeHtml(node.name)}</div>
        <div class="type">${meta.label}</div>
      </div>
      <button class="properties-close" id="propClose">
        <i data-lucide="x"></i>
      </button>
    </div>
    <div class="properties-body">
      ${preview}
      ${rows}
    </div>
  `;

  document.body.appendChild(panel);
  propertiesPanelEl = panel;
  if (window.lucide) lucide.createIcons();

  document.getElementById('propClose').addEventListener('click', () => {
    panel.remove();
    propertiesPanelEl = null;
  });
}

// ============================================================
//  Dialogs
// ============================================================

function showDialog({ title, desc, input, primaryLabel, onPrimary, danger }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';

  const inputHtml = input ? `<input type="text" class="dialog-input" id="dialogInput" value="${escapeHtml(input.value)}">` : '';

  backdrop.innerHTML = `
    <div class="dialog">
      <div class="dialog-title">${escapeHtml(title)}</div>
      ${desc ? `<div class="dialog-desc">${escapeHtml(desc)}</div>` : ''}
      ${inputHtml}
      <div class="dialog-actions">
        <button class="btn btn-secondary" id="dialogCancel">Cancel</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="dialogPrimary">${escapeHtml(primaryLabel)}</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  if (window.lucide) lucide.createIcons();

  const inputEl = document.getElementById('dialogInput');
  if (inputEl) {
    setTimeout(() => {
      inputEl.focus();
      if (input && input.selectName) {
        const dot = inputEl.value.lastIndexOf('.');
        if (dot > 0) inputEl.setSelectionRange(0, dot);
        else inputEl.select();
      } else {
        inputEl.select();
      }
    }, 30);

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = inputEl.value.trim();
        backdrop.remove();
        if (onPrimary) onPrimary(val);
      } else if (e.key === 'Escape') {
        backdrop.remove();
      }
    });
  }

  document.getElementById('dialogCancel').addEventListener('click', () => backdrop.remove());
  document.getElementById('dialogPrimary').addEventListener('click', () => {
    const val = inputEl ? inputEl.value.trim() : true;
    backdrop.remove();
    if (onPrimary) onPrimary(val);
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });
}

function showConfirmDialog(title, desc, onConfirm) {
  showDialog({
    title, desc, primaryLabel: 'Move to Trash', danger: true, onPrimary: () => onConfirm()
  });
}

// ============================================================
//  Toasts
// ============================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const iconName = type === 'success' ? 'check-circle-2' : type === 'error' ? 'alert-circle' : 'info';
  toast.innerHTML = `<i data-lucide="${iconName}" class="icon"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(24px)';
    toast.style.transition = 'all 200ms';
    setTimeout(() => toast.remove(), 200);
  }, 2600);
}

// ============================================================
//  Utilities
// ============================================================

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function selectAll() {
  const items = getCurrentItems();
  state.selection.clear();
  items.forEach(it => state.selection.add(it.id));
  const tab = getActiveTab();
  if (tab) tab.selectedIds = state.selection;
  updateSelectionUI();
}

function triggerFileImport() {
  const tab = getActiveTab();
  if (!tab || tab.nodeId === 'dashboard') {
    showToast('Cannot import files directly to the Dashboard', 'info');
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.onchange = (e) => {
    const files = e.target.files;
    const parent = fsNodes.get(tab.nodeId);
    if (!parent) return;
    for (const f of files) {
      const ext = f.name.split('.').pop().toLowerCase();
      let type = 'generic';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) type = 'image';
      else if (['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(ext)) type = 'video';
      else if (['mp3', 'ogg', 'flac', 'wav', 'm4a'].includes(ext)) type = 'audio';
      else if (['zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'borg'].includes(ext)) type = 'archive';
      else if (['js', 'ts', 'tsx', 'jsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'rb', 'php', 'sh', 'json', 'yaml', 'yml', 'toml', 'css', 'html'].includes(ext)) type = 'code';
      else if (['txt', 'md', 'rst'].includes(ext)) type = 'text';
      else if (ext === 'pdf') type = 'pdf';
      else if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) type = 'doc';
      else if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) type = 'sheet';
      else if (['deb', 'rpm', 'appimage', 'snap'].includes(ext)) type = 'app';

      const node = createNode({
        name: f.name,
        type: type,
        size: f.size,
        parentId: parent.id,
      });
      parent.children.push(node.id);
    }
    renderAll();
    showToast(`Imported ${files.length} file${files.length > 1 ? 's' : ''}`, 'success');
  };
  input.click();
}

// ============================================================
//  Event wiring
// ============================================================

function initEvents() {
  document.getElementById('backBtn').addEventListener('click', goBack);
  document.getElementById('forwardBtn').addEventListener('click', goForward);
  document.getElementById('upBtn').addEventListener('click', goUp);
  document.getElementById('refreshBtn').addEventListener('click', () => {
    renderAll();
    showToast('Refreshed', 'info');
  });

  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderContent();
    renderStatusbar();
  });

  document.getElementById('newFolderBtn').addEventListener('click', showNewFolderDialog);
  document.getElementById('newFileBtn').addEventListener('click', showNewFileDialog);
  document.getElementById('pasteBtn').addEventListener('click', pasteClipboard);

  document.getElementById('copyBtn').addEventListener('click', copySelection);
  document.getElementById('cutBtn').addEventListener('click', cutSelection);
  document.getElementById('renameBtn').addEventListener('click', () => {
    if (state.selection.size === 1) showRenameDialog(Array.from(state.selection)[0]);
  });
  document.getElementById('deleteBtn').addEventListener('click', trashSelection);

  document.getElementById('moreMenuBtn').addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    showMoreMenu(rect.left - 120, rect.bottom + 4);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape' && e.target.id === 'searchInput') {
        e.target.value = '';
        state.searchQuery = '';
        renderContent();
        renderStatusbar();
        e.target.blur();
      }
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'c': e.preventDefault(); copySelection(); break;
        case 'x': e.preventDefault(); cutSelection(); break;
        case 'v': e.preventDefault(); pasteClipboard(); break;
        case 'a': e.preventDefault(); selectAll(); break;
        case 't': e.preventDefault();
          const tab = getActiveTab();
          createTab(tab ? tab.nodeId : state.dashboardId);
          renderAll();
          break;
        case 'w': e.preventDefault();
          if (state.activeTabId) closeTab(state.activeTabId);
          break;
      }
    } else {
      switch (e.key) {
        case 'F2':
          e.preventDefault();
          if (state.selection.size === 1) showRenameDialog(Array.from(state.selection)[0]);
          break;
        case 'Delete':
          e.preventDefault();
          trashSelection();
          break;
        case 'Escape':
          if (document.querySelector('.context-menu')) {
            closeAllMenus();
          } else if (propertiesPanelEl) {
            propertiesPanelEl.remove();
            propertiesPanelEl = null;
          } else if (document.querySelector('.dialog-backdrop')) {
            document.querySelector('.dialog-backdrop').remove();
          } else {
            state.selection.clear();
            const tab2 = getActiveTab();
            if (tab2) tab2.selectedIds = state.selection;
            updateSelectionUI();
          }
          break;
        case 'Enter':
          if (state.selection.size === 1 && !document.querySelector('.dialog-backdrop')) {
            const id = Array.from(state.selection)[0];
            const node = fsNodes.get(id);
            if (node) {
              if (node.type === 'folder') navigateTo(id);
              else showProperties(id);
            }
          }
          break;
        case 'Backspace':
          if (!e.target.matches('input,textarea')) {
            e.preventDefault();
            goBack();
          }
          break;
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) closeAllMenus();
  });

  document.getElementById('contentScroll').addEventListener('contextmenu', (e) => {
    if (e.target.closest('.file-item, .list-row, .list-header, .widget-box')) return;
    e.preventDefault();
    showBackgroundContextMenu(e.clientX, e.clientY);
  });

  // Sidebar resize
  const resizeHandle = document.getElementById('sidebarResize');
  let resizing = false;
  resizeHandle.addEventListener('mousedown', (e) => {
    resizing = true;
    resizeHandle.classList.add('sidebar-resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!resizing) return;
    const w = Math.max(220, Math.min(400, e.clientX));
    state.sidebarWidth = w;
    document.documentElement.style.setProperty('--sidebar-w', w + 'px');
  });
  document.addEventListener('mouseup', () => {
    if (resizing) {
      resizing = false;
      resizeHandle.classList.remove('sidebar-resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  window.addEventListener('resize', () => {
    closeAllMenus();
  });

  // Drag and drop file import
  const contentEl = document.getElementById('contentScroll');
  contentEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  contentEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const tab = getActiveTab();
    if (!tab || tab.nodeId === 'dashboard') {
      showToast('Cannot drop files directly to the Dashboard', 'info');
      return;
    }
    const parent = fsNodes.get(tab.nodeId);
    if (!parent) return;
    for (const f of files) {
      const ext = f.name.split('.').pop().toLowerCase();
      let type = 'generic';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) type = 'image';
      else if (['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(ext)) type = 'video';
      else if (['mp3', 'ogg', 'flac', 'wav', 'm4a'].includes(ext)) type = 'audio';
      else if (['zip', 'tar', 'gz', 'bz2', '7z', 'rar'].includes(ext)) type = 'archive';
      else if (['js', 'ts', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'rb', 'php', 'sh', 'json', 'yaml', 'yml', 'toml'].includes(ext)) type = 'code';
      else if (['txt', 'md', 'rst'].includes(ext)) type = 'text';
      else if (ext === 'pdf') type = 'pdf';

      const node = createNode({
        name: f.name,
        type: type,
        size: f.size,
        parentId: parent.id,
      });
      parent.children.push(node.id);
    }
    renderAll();
    showToast(`Dropped ${files.length} file${files.length > 1 ? 's' : ''}`, 'success');
  });

  document.documentElement.style.setProperty('--sidebar-w', state.sidebarWidth + 'px');
}

// ============================================================
//  Initialize
// ============================================================

function init() {
  state.homeId = initFilesystem();
  createTab(state.dashboardId); // Open directly to the Dashboard
  initEvents();
  state.viewMode = 'grid';
  renderAll();

  setTimeout(() => {
    showToast('Welcome to Aether Files', 'info');
  }, 400);
}

if (!window.lucide) {
  window.lucide = { createIcons: () => {
    document.querySelectorAll('[data-lucide]').forEach(el => {
      el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle></svg>';
    });
  }};
}

init();
</script>
```

## CSS Section Index

The `<style>` block defines the full visual language of the app. Below is a
region-by-region index of every selector group.

### Tokens (`:root`)
- `:root` - All design tokens: background tiers (`--bg-sidebar`, `--bg-tabbar`,
  `--bg-workspace`, `--bg-statusbar`, `--bg-elevated`, `--bg-elevated-2`,
  `--bg-group`, `--bg-hover`, `--bg-active`, `--bg-selected`,
  `--bg-selected-hover`), borders (`--border`, `--border-strong`,
  `--border-accent`), text (`--text-primary`, `--text-secondary`,
  `--text-muted`, `--text-faint`), accent (`--accent`, `--accent-hover`,
  `--accent-active`, `--accent-soft`, `--accent-on`), status colors
  (`--success`, `--warning`, `--error`, `--info`), radii (`--radius-sm` 6,
  `--radius-md` 10, `--radius-lg` 14, `--radius-xl` 20), transitions
  (`--tr-fast` 100 ms, `--tr-base` 180 ms, `--tr-slow` 260 ms), shadows
  (`--shadow-pop`, `--shadow-dialog`), layout (`--sidebar-w` 264) and
  font stacks (`--font-sans`, `--font-mono`).

### Layout & resets
- `*` - Box-sizing border-box; zero margin/padding.
- `html, body` - 100 % height, hidden overflow, `--bg-tabbar` background,
  base 13 px Inter typography, antialiased, `user-select: none`.
- `button`, `input` - Font inheritance; borderless buttons.
- `.app` - Two-column CSS grid (`--sidebar-w` + 1fr), 100 vh / 100 vw.

### Sidebar
- `.sidebar` - White column with right border; column-flex; hidden overflow.
- `.sidebar-header` - 56 px brand row with 16/10 padding.
- `.brand-mark` - 28 px rounded blue gradient tile with white "A".
- `.brand-name`, `.brand-name .dim` - Wordmark; dimmed "Files" suffix.
- `.sidebar-scroll` - Flex-grow scrollable nav area.
- `.nav-section`, `.nav-section-title` - Grouping wrapper + uppercase label.
- `.nav-item` - 38 px row button; `.nav-item:hover`, `.nav-item.active`
  (accent-soft bg + accent text); child `.icon` (18 px) and `.label`.

### Directory tree
- `.tree-node` - Position-relative wrapper.
- `.tree-item` - 36 px row; hover and `.active` accents.
- `.tree-arrow` - 20 px disclosure chevron with rotate-on-expand transition,
  hover bg, and `.empty` (hidden) variant for leaf folders.
- `.tree-icon` - 18 px folder/folder-open icon.
- `.tree-label` - Flex label with ellipsis.
- `.tree-children` - Animated sub-list; `max-height` transition between 0 and
  5000 px via `.expanded`.

### Storage items
- `.storage-item` - Padded card; hover bg.
- `.storage-item-head` - Icon + name + status-dot row.
- `.storage-item .icon` / `.name` / `.status-dot` - Card pieces.
- `.status-dot.syncing` - Amber dot with `@keyframes pulse` (1.6 s).
- `.storage-bar` - 4 px capacity track.
- `.storage-bar-fill` - Filled portion with `--tr-slow` width transition;
  `.warn` (amber) and `.danger` (red) variants.
- `.storage-meta` - Tabular-nums meta row with used/total and percent.

### Resize handle
- `.sidebar-resize` - Absolute 4 px column-resize strip on the sidebar's
  right edge; blue tint on hover; `.sidebar-resizing` stronger tint.

### Workspace & tabstrip
- `.workspace` - Right column (column-flex, `--bg-workspace`).
- `.tab-strip` - 44 px horizontal scrollable tab list (hidden scrollbar).
- `.tab` - 36 px tab pill with top corners rounded; `.tab:hover`,
  `.tab.active` (workspace bg, border, top accent bar via `::after`).
- `.tab .icon`, `.tab-label`, `.tab-close` - Tab pieces; close button fades in
  on hover/active and has its own hover bg.
- `.tab-new` - 36 px square "+" button.

### Toolbar
- `.toolbar` - 56 px row with bottom border and 8 px gap.
- `.btn-group` - Grouped buttons container (group bg, 3 px padding, 42 px tall).
- `.btn-icon` - 36 px square icon button with hover/active/disabled states.

### Breadcrumb & dir actions
- `.dir-bar-wrap` - Flex container holding breadcrumb + dir-actions.
- `.breadcrumb` - Horizontal-scroll crumb trail (hidden scrollbar).
- `.crumb` - Clickable crumb; `.crumb.current` bolded.
- `.crumb-sep` - Chevron separator between crumbs.
- `.dir-actions` - Inner group with translucent white bg; smaller `.btn-icon`
  children (32 px).

### Search
- `.search-wrap` - 42 px pill container with group bg.
- `.search-icon` - Absolute-positioned 16 px leading icon.
- `.search-input` - 240 px input that gains accent border, white bg, and
  3 px accent halo on focus.

### Action bar (auto-hides)
- `.action-bar` - 52 px row that collapses to 0 height/opacity when
  `.hidden` (height, opacity, padding, min-height, border-color all
  transitioned; `pointer-events: none` when hidden).
- `.selection-info` - Right-aligned pill with `.count` (accent + 600) and
  `.dot` separator.

### Content & home widgets
- `.content`, `.content-scroll` - Flex-grow content region with 12 px padded
  scroll container.
- `.home-view` - Max-1200 px widget stack.
- `.widget-box` - White card with rounded-lg, soft shadow; hover lift +
  stronger border.
- `.widget-header`, `.widget-header-icon`, `.widget-header-text`,
  `.widget-title`, `.widget-subtitle` - Always-visible header.
- `.widget-actions` - Auto-show floating action cluster on card hover
  (translate-Y/scale-in); `.widget-action-btn` (28 px) with `.danger` variant.
- `.widget-body` - Inner padding.

### Masonry gallery
- `.masonry-gallery.vertical` - CSS `column-count: 5` masonry (responsive to 4
  / 3 / 2 columns at 1100 / 880 / 600 px breakpoints).
- `.masonry-gallery.horizontal` - Flex row with scroll-snap and thin scrollbar.
- `.masonry-item` - Image card with hover lift and 1.06x image zoom.
- `.masonry-name` - Bottom gradient overlay label that fades in on hover.
- `.widgets-empty` - Centered empty-widgets placeholder.

### Grid view
- `.file-grid` - Auto-fill grid (`minmax(104px, 1fr)`), 2 px gap.
- `.file-item` - Rounded cell, column-flex; `.file-item:hover` and
  `.file-item.selected` (and `:hover`) variants.
- `.file-icon-wrap` - 56 px icon stage (48 px svg).
- `.file-name` - 2-line clamped filename.
- `.file-meta` - Small tabular-nums size text.
- `.file-checkbox` - Top-left 18 px checkbox overlay; fades in on
  hover/selected; `.checked` draws an accent-filled check via `::after`.

### List view
- `.file-list` (with `.compact`) - Column container; compact mode shrinks rows
  to 30 px and reduces icon size.
- `.list-header` - Sticky 5-column grid header (`1fr 100px 120px 140px 32px`);
  `.col` cells with hover/sorted accents; `.col.size` right-aligned.
- `.list-row` - 40 px row (30 px in compact); hover/selected variants.
- `.name-col`, `.size-col`, `.type-col`, `.date-col` - Cell variants with
  ellipsis and tabular-nums where appropriate.

### File type colors
- `.icon-folder` (blue), `.icon-image` (purple), `.icon-video` (orange),
  `.icon-audio` (teal), `.icon-pdf` (red), `.icon-doc` (blue),
  `.icon-sheet` (green), `.icon-archive` (amber), `.icon-code` (teal),
  `.icon-app` (red), `.icon-text` (grey), `.icon-generic` (light grey) -
  Per-type icon tints.

### Empty state
- `.empty-state` - Centered placeholder; `.title` and `.desc`.

### Status bar
- `.statusbar` - 52 px row with top border, `--bg-tabbar`.
- `.status-left`, `.status-item`, `.status-divider`, `.status-spacer`,
  `.status-accent`, `.status-muted` - Layout primitives.
- `.status-right-group` - Right-side 42 px pill.
- `.view-segmented` - Inner segmented control with translucent white bg.
- `.seg-btn` - 34 px segment button; `.seg-btn.active` has white bg + accent
  text + tiny shadow.
- `.sort-btn` - Sort trigger with icon, label, and chevron.

### Context menu
- `.context-menu` - Fixed popup with `--shadow-pop`, rounded-lg, 6 px padding,
  `@keyframes menuIn` scale-in animation.
- `.menu-item` - 36 px row; `.disabled` and `.danger` variants; icon, label,
  shortcut sub-elements.
- `.menu-arrow` - Submenu chevron indicator.
- `.menu-separator` - 1 px divider.
- `.menu-section-label` - Uppercase section heading.

### Dialog
- `.dialog-backdrop` - Full-viewport scrim with blur and `@keyframes fadeIn`.
- `.dialog` - Modal card (rounded-xl, `--shadow-dialog`, 420-500 px wide) with
  `@keyframes dialogIn` scale/translate-in.
- `.dialog-title`, `.dialog-desc`, `.dialog-input` (with focus halo),
  `.dialog-actions` - Dialog pieces.
- `.btn` - Base button; `.btn-secondary`, `.btn-primary`, `.btn-danger`
  variants with hover/active transforms.

### Properties panel
- `.properties-panel` - Fixed right-side floating details card.
- `.properties-header`, `.icon-wrap`, `.name`, `.type`,
  `.properties-close` - Header row.
- `.properties-body`, `.prop-row`, `.key`, `.val` - Two-column key/value rows.
- `.prop-preview` - 140 px preview tile.

### Toast
- `.toast-container` - Bottom-right toast stack (z-index 3000).
- `.toast` (with `.success`, `.error`, `.info`) - Dark pill with colored icon
  and `@keyframes toastIn` slide-in.

### Scrollbars
- `::-webkit-scrollbar`, `::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb`
  (with hover), `::-webkit-scrollbar-corner` - Custom thin scrollbars.

### Reduced motion
- `@media (prefers-reduced-motion: reduce)` - Disables all transitions and
  animations globally.

### Responsive
- `@media (max-width: 880px)` - Sidebar 220 px; search shrinks to 160 px (220
  px on focus).
- `@media (max-width: 680px)` - Sidebar collapses to 60 px icon rail (labels,
  section titles, storage bar/meta, tree labels, and brand name hidden); nav
  items center; search shrinks further.


## JS Logic

All `<script>` content, reproduced verbatim. The same JS source lives in `fileexplorer.body.html` between the `<script>` and `</script>` tags.

```javascript
// ============================================================
//  File System Data Model
// ============================================================

const TYPE_META = {
  folder:  { icon: 'folder',          class: 'icon-folder',  label: 'Folder' },
  image:   { icon: 'image',            class: 'icon-image',   label: 'Image' },
  video:   { icon: 'film',             class: 'icon-video',   label: 'Video' },
  audio:   { icon: 'music',            class: 'icon-audio',   label: 'Audio' },
  pdf:     { icon: 'file-text',        class: 'icon-pdf',     label: 'PDF document' },
  doc:     { icon: 'file-text',        class: 'icon-doc',     label: 'Document' },
  sheet:   { icon: 'file-spreadsheet', class: 'icon-sheet',   label: 'Spreadsheet' },
  archive: { icon: 'file-archive',     class: 'icon-archive', label: 'Archive' },
  code:    { icon: 'file-code-2',      class: 'icon-code',    label: 'Source code' },
  app:     { icon: 'app-window',       class: 'icon-app',     label: 'Application' },
  text:    { icon: 'file-text',        class: 'icon-text',    label: 'Text file' },
  generic: { icon: 'file',             class: 'icon-generic', label: 'File' },
};

let nextId = 1;
const fsNodes = new Map();

function createNode(data) {
  const id = data.id || ('n' + (nextId++));
  const node = {
    id,
    name: data.name,
    type: data.type || 'folder',
    parentId: data.parentId || null,
    children: (data.type === undefined || data.type === 'folder') ? (data.children || []) : null,
    size: data.size || 0,
    modified: data.modified || randomDate(),
    meta: data.meta || {},
    expanded: data.expanded || false,
  };
  fsNodes.set(id, node);
  return node;
}

function randomDate() {
  const days = Math.floor(Math.random() * 120);
  const d = new Date(Date.now() - days * 86400000 - Math.random() * 86400000);
  return d;
}

function getChildByName(parentId, name) {
  const parent = fsNodes.get(parentId);
  if (!parent || !parent.children) return null;
  for (const cid of parent.children) {
    const c = fsNodes.get(cid);
    if (c && c.name === name) return c;
  }
  return null;
}

function getPath(nodeId) {
  const parts = [];
  let n = fsNodes.get(nodeId);
  while (n) {
    parts.unshift({ id: n.id, name: n.name });
    n = n.parentId ? fsNodes.get(n.parentId) : null;
  }
  return parts;
}

function findNodeByPath(parts) {
  let cur = fsNodes.get('root');
  for (const p of parts) {
    if (!cur || !cur.children) return null;
    let found = null;
    for (const cid of cur.children) {
      const c = fsNodes.get(cid);
      if (c && c.name === p) { found = c; break; }
    }
    if (!found) return null;
    cur = found;
  }
  return cur ? cur.id : null;
}

function isAncestor(ancestorId, nodeId) {
  let n = fsNodes.get(nodeId);
  while (n && n.parentId) {
    if (n.parentId === ancestorId) return true;
    n = fsNodes.get(n.parentId);
  }
  return false;
}

function initFilesystem() {
  const root = createNode({ id: 'root', name: 'Computer', type: 'folder' });
  const home = createNode({ name: 'Home', type: 'folder', parentId: 'root', expanded: true });
  root.children.push(home.id);

  const dashboardNode = { id: 'dashboard', name: 'Dashboard', type: 'dashboard', parentId: null };
  fsNodes.set('dashboard', dashboardNode);

  const desktop   = createNode({ name: 'Desktop',   type: 'folder', parentId: home.id });
  const documents = createNode({ name: 'Documents', type: 'folder', parentId: home.id });
  const downloads = createNode({ name: 'Downloads', type: 'folder', parentId: home.id });
  const pictures  = createNode({ name: 'Pictures',  type: 'folder', parentId: home.id });
  const music     = createNode({ name: 'Music',     type: 'folder', parentId: home.id });
  const videos    = createNode({ name: 'Videos',    type: 'folder', parentId: home.id });
  const projects  = createNode({ name: 'Projects',  type: 'folder', parentId: home.id, expanded: true });
  const config    = createNode({ name: '.config',   type: 'folder', parentId: home.id });

  home.children.push(desktop.id, documents.id, downloads.id, pictures.id, music.id, videos.id, projects.id, config.id);

  // Documents
  const work = createNode({ name: 'Work', type: 'folder', parentId: documents.id });
  const personal = createNode({ name: 'Personal', type: 'folder', parentId: documents.id });
  const invoices = createNode({ name: 'Invoices', type: 'folder', parentId: documents.id });
  const q4Strategy = createNode({ name: 'Q4 Strategy', type: 'folder', parentId: work.id });
  work.children.push(q4Strategy.id);
  documents.children.push(work.id, personal.id, invoices.id);

  documents.children.push(
    createNode({ name: 'resume.pdf',            type: 'pdf',     size: 248000,   parentId: documents.id }).id,
    createNode({ name: 'budget-2024.ods',       type: 'sheet',   size: 89200,    parentId: documents.id }).id,
    createNode({ name: 'meeting-notes.md',      type: 'text',    size: 4800,     parentId: documents.id }).id,
    createNode({ name: 'thesis-draft.docx',     type: 'doc',     size: 1842000, parentId: documents.id }).id,
    createNode({ name: 'reading-list.txt',      type: 'text',    size: 1200,    parentId: documents.id }).id,
    createNode({ name: 'lease-agreement.pdf',   type: 'pdf',     size: 512000,  parentId: documents.id }).id,
  );

  personal.children.push(
    createNode({ name: 'journal.md',            type: 'text',    size: 18400,   parentId: personal.id }).id,
    createNode({ name: 'recipes.txt',           type: 'text',    size: 3200,    parentId: personal.id }).id,
    createNode({ name: 'trip-planning.ods',     type: 'sheet',   size: 42000,   parentId: personal.id }).id,
  );

  // Downloads
  downloads.children.push(
    createNode({ name: 'ubuntu-24.04.iso',          type: 'generic', size: 4900000000, parentId: downloads.id }).id,
    createNode({ name: 'firefox-installer.deb',     type: 'generic', size: 62000000,   parentId: downloads.id }).id,
    createNode({ name: 'project-archive.zip',       type: 'archive', size: 184000000,  parentId: downloads.id }).id,
    createNode({ name: 'wallpapers-pack.tar.gz',    type: 'archive', size: 92000000,   parentId: downloads.id }).id,
    createNode({ name: 'backup-2024-03.borg',       type: 'archive', size: 2400000000, parentId: downloads.id }).id,
    createNode({ name: 'sublime-text_build.deb',     type: 'generic', size: 12000000,   parentId: downloads.id }).id,
    createNode({ name: 'vim-config.tar.gz',         type: 'archive', size: 38000,      parentId: downloads.id }).id,
  );

  // Pictures
  const screenshots = createNode({ name: 'Screenshots', type: 'folder', parentId: pictures.id });
  const wallpapers  = createNode({ name: 'Wallpapers',   type: 'folder', parentId: pictures.id });
  const photos      = createNode({ name: 'Photos',       type: 'folder', parentId: pictures.id });
  pictures.children.push(screenshots.id, wallpapers.id, photos.id);

  pictures.children.push(
    createNode({ name: 'aurora-night.png',      type: 'image', size: 4800000, parentId: pictures.id, meta: { w: 3840, h: 2160 } }).id,
    createNode({ name: 'mountain-vista.jpg',     type: 'image', size: 3200000, parentId: pictures.id, meta: { w: 3840, h: 2160 } }).id,
    createNode({ name: 'portrait-001.jpg',       type: 'image', size: 2800000, parentId: pictures.id, meta: { w: 1080, h: 1620 } }).id,
  );

  screenshots.children.push(
    createNode({ name: 'screenshot-001.png', type: 'image', size: 380000, parentId: screenshots.id }).id,
    createNode({ name: 'screenshot-002.png', type: 'image', size: 420000, parentId: screenshots.id }).id,
    createNode({ name: 'screenshot-003.png', type: 'image', size: 510000, parentId: screenshots.id }).id,
    createNode({ name: 'screenshot-004.png', type: 'image', size: 460000, parentId: screenshots.id }).id,
  );

  wallpapers.children.push(
    createNode({ name: 'gradient-mist.jpg',  type: 'image', size: 1800000, parentId: wallpapers.id }).id,
    createNode({ name: 'minimal-dark.png',    type: 'image', size: 2100000, parentId: wallpapers.id }).id,
    createNode({ name: 'forest-calm.jpg',     type: 'image', size: 3400000, parentId: wallpapers.id }).id,
    createNode({ name: 'desert-dusk.jpg',     type: 'image', size: 2900000, parentId: wallpapers.id }).id,
  );

  // Music
  const playlists = createNode({ name: 'Playlists', type: 'folder', parentId: music.id });
  music.children.push(playlists.id);
  music.children.push(
    createNode({ name: 'ambient-mix.mp3',        type: 'audio', size: 8400000,  parentId: music.id }).id,
    createNode({ name: 'podcast-ep42.ogg',       type: 'audio', size: 32000000, parentId: music.id }).id,
    createNode({ name: 'live-recording.flac',    type: 'audio', size: 28000000, parentId: music.id }).id,
    createNode({ name: 'symphony-no9.flac',      type: 'audio', size: 42000000, parentId: music.id }).id,
  );

  // Videos
  videos.children.push(
    createNode({ name: 'conference-talk.mp4',  type: 'video', size: 480000000, parentId: videos.id }).id,
    createNode({ name: 'screen-recording.mkv', type: 'video', size: 184000000, parentId: videos.id }).id,
    createNode({ name: 'holiday-clip.mov',     type: 'video', size: 920000000, parentId: videos.id }).id,
  );

  // Projects
  const webApp  = createNode({ name: 'web-app',   type: 'folder', parentId: projects.id, expanded: true });
  const dotfiles = createNode({ name: 'dotfiles', type: 'folder', parentId: projects.id });
  const cliTool = createNode({ name: 'cli-tool', type: 'folder', parentId: projects.id });
  projects.children.push(webApp.id, dotfiles.id, cliTool.id);

  const srcDir = createNode({ name: 'src', type: 'folder', parentId: webApp.id, expanded: true });
  webApp.children.push(srcDir.id);
  webApp.children.push(
    createNode({ name: 'package.json',  type: 'code', size: 1200, parentId: webApp.id }).id,
    createNode({ name: 'README.md',     type: 'text', size: 3400, parentId: webApp.id }).id,
    createNode({ name: 'tsconfig.json', type: 'code', size: 580,  parentId: webApp.id }).id,
    createNode({ name: 'vite.config.ts', type: 'code', size: 820, parentId: webApp.id }).id,
  );
  srcDir.children.push(
    createNode({ name: 'index.ts',   type: 'code', size: 4200, parentId: srcDir.id }).id,
    createNode({ name: 'app.tsx',    type: 'code', size: 8900, parentId: srcDir.id }).id,
    createNode({ name: 'utils.ts',   type: 'code', size: 2100, parentId: srcDir.id }).id,
    createNode({ name: 'styles.css', type: 'code', size: 3400, parentId: srcDir.id }).id,
  );

  dotfiles.children.push(
    createNode({ name: '.bashrc',     type: 'code', size: 4200, parentId: dotfiles.id }).id,
    createNode({ name: '.gitconfig',  type: 'code', size: 320,  parentId: dotfiles.id }).id,
    createNode({ name: '.tmux.conf',  type: 'code', size: 1800, parentId: dotfiles.id }).id,
  );

  // Desktop
  desktop.children.push(
    createNode({ name: 'README.txt',       type: 'text', size: 480, parentId: desktop.id }).id,
    createNode({ name: 'project-links.url', type: 'generic', size: 120, parentId: desktop.id }).id,
    createNode({ name: 'screenshot.png',   type: 'image', size: 280000, parentId: desktop.id }).id,
  );

  // Config
  config.children.push(
    createNode({ name: 'nvim',  type: 'folder', parentId: config.id }).id,
    createNode({ name: 'fish',  type: 'folder', parentId: config.id }).id,
    createNode({ name: 'gitconfig', type: 'code', size: 320, parentId: config.id }).id,
  );

  return home;
}

// ============================================================
//  Application State
// ============================================================

const state = {
  homeId: null,
  dashboardId: 'dashboard',
  tabs: [],
  activeTabId: null,
  clipboard: null,
  selection: new Set(),
  sortBy: 'name',
  sortDir: 'asc',
  viewMode: 'grid',
  searchQuery: '',
  sidebarWidth: 264,
  nextTabId: 1,
  widgets: {
    imageGallery: { visible: true, orientation: 'vertical' }
  }
};

// ============================================================
//  Tab Management
// ============================================================

function createTab(nodeId) {
  const tabId = 't' + (state.nextTabId++);
  const tab = {
    id: tabId,
    nodeId: nodeId,
    history: [nodeId],
    historyIdx: 0,
    selectedIds: new Set(),
  };
  state.tabs.push(tab);
  state.activeTabId = tabId;
  return tab;
}

function getActiveTab() {
  return state.tabs.find(t => t.id === state.activeTabId);
}

function switchTab(tabId) {
  state.activeTabId = tabId;
  const tab = getActiveTab();
  if (tab) {
    state.selection = tab.selectedIds;
    state.searchQuery = '';
    document.getElementById('searchInput').value = '';
    renderAll();
  }
}

function closeTab(tabId) {
  const idx = state.tabs.findIndex(t => t.id === tabId);
  if (idx < 0) return;
  state.tabs.splice(idx, 1);
  if (state.tabs.length === 0) {
    createTab(state.dashboardId);
  } else if (state.activeTabId === tabId) {
    const newTab = state.tabs[Math.min(idx, state.tabs.length - 1)];
    state.activeTabId = newTab.id;
    state.selection = newTab.selectedIds;
  }
  renderAll();
}

function navigateTo(nodeId) {
  const tab = getActiveTab();
  if (!tab || tab.nodeId === nodeId) return;
  tab.history = tab.history.slice(0, tab.historyIdx + 1);
  tab.history.push(nodeId);
  tab.historyIdx = tab.history.length - 1;
  tab.nodeId = nodeId;
  tab.selectedIds = new Set();
  state.selection = tab.selectedIds;
  state.searchQuery = '';
  document.getElementById('searchInput').value = '';
  renderAll();
}

function goBack() {
  const tab = getActiveTab();
  if (!tab || tab.historyIdx <= 0) return;
  tab.historyIdx--;
  tab.nodeId = tab.history[tab.historyIdx];
  tab.selectedIds = new Set();
  state.selection = tab.selectedIds;
  renderAll();
}

function goForward() {
  const tab = getActiveTab();
  if (!tab || tab.historyIdx >= tab.history.length - 1) return;
  tab.historyIdx++;
  tab.nodeId = tab.history[tab.historyIdx];
  tab.selectedIds = new Set();
  state.selection = tab.selectedIds;
  renderAll();
}

function goUp() {
  const tab = getActiveTab();
  if (!tab) return;
  const node = fsNodes.get(tab.nodeId);
  if (node && node.parentId) {
    navigateTo(node.parentId);
  }
}

// ============================================================
//  Sidebar Rendering
// ============================================================

function getSidebarSections() {
  return [
    { title: 'Favorites', items: [
      { icon: 'layout-dashboard', label: 'Dashboard', nodeId: state.dashboardId },
      { icon: 'clock',      label: 'Recent',    special: 'recent' },
      { icon: 'star',       label: 'Starred',   special: 'starred' },
      { icon: 'trash-2',    label: 'Trash',     special: 'trash' },
    ]},
    { title: 'Places', items: [
      { icon: 'house',      label: 'Home',      nodeId: state.homeId },
      { icon: 'monitor',    label: 'Desktop',   nodeId: findNodeByPath(['Home', 'Desktop']) },
      { icon: 'file-text',  label: 'Documents', nodeId: findNodeByPath(['Home', 'Documents']) },
      { icon: 'download',   label: 'Downloads', nodeId: findNodeByPath(['Home', 'Downloads']) },
      { icon: 'image',      label: 'Pictures',  nodeId: findNodeByPath(['Home', 'Pictures']) },
      { icon: 'music',      label: 'Music',     nodeId: findNodeByPath(['Home', 'Music']) },
      { icon: 'film',       label: 'Videos',    nodeId: findNodeByPath(['Home', 'Videos']) },
    ]},
  ];
}

function getStorageItems() {
  return [
    { id: 'local',     name: 'Local SSD',       icon: 'hard-drive',   used: 380,   total: 500,  status: 'success' },
    { id: 'home-vol',  name: 'home volume',     icon: 'database',     used: 124,   total: 200,  status: 'success' },
    { id: 'usb',       name: 'USB Drive',       icon: 'usb',           used: 12,    total: 64,   status: 'success' },
    { id: 'nas',       name: 'nas.lan',         icon: 'server',        used: 1800,  total: 4000, status: 'success' },
    { id: 'nextcloud', name: 'Nextcloud',       icon: 'cloud',         used: 18,    total: 50,   status: 'success' },
    { id: 'gdrive',    name: 'Google Drive',    icon: 'cloud',         used: 8.4,   total: 15,   status: 'syncing' },
  ];
}

function renderSidebar() {
  const root = document.getElementById('sidebarScroll');
  const tab = getActiveTab();
  const activeNodeId = tab ? tab.nodeId : null;

  let html = '';

  for (const section of getSidebarSections()) {
    html += `<div class="nav-section">`;
    html += `<div class="nav-section-title">${section.title}</div>`;
    for (const item of section.items) {
      const active = item.nodeId && item.nodeId === activeNodeId;
      html += `<div class="nav-item ${active ? 'active' : ''}" data-node-id="${item.nodeId || ''}" data-special="${item.special || ''}">
        <i data-lucide="${item.icon}" class="icon"></i>
        <span class="label">${item.label}</span>
      </div>`;
    }
    html += `</div>`;
  }

  // Directory tree
  html += `<div class="nav-section">
    <div class="nav-section-title">Directory Tree</div>
    <div id="treeRoot">${renderTreeNode(state.homeId, 0, activeNodeId)}</div>
  </div>`;

  // Storage
  html += `<div class="nav-section">
    <div class="nav-section-title">Storage & Network</div>`;
  for (const item of getStorageItems()) {
    const pct = (item.used / item.total) * 100;
    const fillColor = pct > 90 ? 'danger' : pct > 75 ? 'warn' : '';
    const usedLabel = item.total >= 1000 ? `${(item.used/1000).toFixed(1)} TB` : `${item.used} GB`;
    const totalLabel = item.total >= 1000 ? `${(item.total/1000).toFixed(0)} TB` : `${item.total} GB`;
    html += `<div class="storage-item" data-storage="${item.id}">
      <div class="storage-item-head">
        <i data-lucide="${item.icon}" class="icon"></i>
        <span class="name">${item.name}</span>
        <span class="status-dot ${item.status === 'syncing' ? 'syncing' : ''}"></span>
      </div>
      <div class="storage-bar"><div class="storage-bar-fill ${fillColor}" style="width:${pct}%"></div></div>
      <div class="storage-meta"><span>${usedLabel} of ${totalLabel}</span><span>${pct.toFixed(0)}%</span></div>
    </div>`;
  }
  html += `</div>`;

  root.innerHTML = html;

  root.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      const nodeId = el.dataset.nodeId;
      const special = el.dataset.special;
      if (nodeId) {
        navigateTo(nodeId);
      } else if (special) {
        showToast(`${special.charAt(0).toUpperCase() + special.slice(1)} view is illustrative in this demo`, 'info');
      }
    });
  });

  root.querySelectorAll('.tree-arrow').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const nodeId = el.dataset.nodeId;
      const node = fsNodes.get(nodeId);
      if (node) {
        node.expanded = !node.expanded;
        renderSidebar();
      }
    });
  });

  root.querySelectorAll('.tree-item').forEach(el => {
    el.addEventListener('click', () => {
      const nodeId = el.dataset.nodeId;
      if (nodeId) navigateTo(nodeId);
    });
  });

  if (window.lucide) lucide.createIcons();
}

function renderTreeNode(nodeId, depth, activeNodeId) {
  const node = fsNodes.get(nodeId);
  if (!node) return '';

  const hasChildren = node.children && node.children.length > 0 && node.children.some(cid => {
    const c = fsNodes.get(cid);
    return c && c.type === 'folder';
  });
  const isActive = nodeId === activeNodeId;
  const padLeft = 8 + depth * 18;

  let html = `<div class="tree-node">`;
  html += `<div class="tree-item ${isActive ? 'active' : ''}" data-node-id="${nodeId}" style="padding-left:${padLeft}px">`;
  html += `<span class="tree-arrow ${node.expanded ? 'expanded' : ''} ${hasChildren ? '' : 'empty'}" data-node-id="${nodeId}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
  </span>`;
  html += `<i data-lucide="${node.expanded ? 'folder-open' : 'folder'}" class="tree-icon"></i>`;
  html += `<span class="tree-label">${escapeHtml(node.name)}</span>`;
  html += `</div>`;

  if (hasChildren && node.expanded) {
    html += `<div class="tree-children expanded">`;
    for (const cid of node.children) {
      const child = fsNodes.get(cid);
      if (child && child.type === 'folder') {
        html += renderTreeNode(cid, depth + 1, activeNodeId);
      }
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

// ============================================================
//  Breadcrumb
// ============================================================

function renderBreadcrumb() {
  const tab = getActiveTab();
  if (!tab) return;
  const path = getPath(tab.nodeId);
  const el = document.getElementById('breadcrumb');
  let html = '';
  path.forEach((p, i) => {
    if (i > 0) html += `<span class="crumb-sep"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>`;
    const current = i === path.length - 1;
    html += `<span class="crumb ${current ? 'current' : ''}" data-node-id="${p.id}">${escapeHtml(p.name)}</span>`;
  });
  el.innerHTML = html;
  el.querySelectorAll('.crumb').forEach(c => {
    c.addEventListener('click', () => {
      const id = c.dataset.nodeId;
      if (id) navigateTo(id);
    });
  });
}

// ============================================================
//  Tab strip
// ============================================================

function renderTabs() {
  const strip = document.getElementById('tabStrip');
  let html = '';
  for (const tab of state.tabs) {
    const node = fsNodes.get(tab.nodeId);
    const name = node ? node.name : '?';
    const active = tab.id === state.activeTabId;
    
    let iconStr = 'file';
    if (node) {
      if (node.type === 'dashboard') iconStr = 'layout-dashboard';
      else if (node.type === 'folder') iconStr = 'folder';
    }
    
    html += `<div class="tab ${active ? 'active' : ''}" data-tab-id="${tab.id}" title="${escapeHtml(name)}">
      <i data-lucide="${iconStr}" class="icon"></i>
      <span class="tab-label">${escapeHtml(name)}</span>
      <span class="tab-close" data-tab-id="${tab.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </span>
    </div>`;
  }
  html += `<button class="tab-new" id="newTabBtn" title="New tab"><i data-lucide="plus"></i></button>`;
  strip.innerHTML = html;

  strip.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) return;
      switchTab(t.dataset.tabId);
    });
    t.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showTabContextMenu(e.clientX, e.clientY, t.dataset.tabId);
    });
  });
  strip.querySelectorAll('.tab-close').forEach(c => {
    c.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(c.dataset.tabId);
    });
  });
  document.getElementById('newTabBtn').addEventListener('click', () => {
    const tab = getActiveTab();
    createTab(tab ? tab.nodeId : state.dashboardId);
    renderAll();
  });

  if (window.lucide) lucide.createIcons();
}

// ============================================================
//  Content rendering
// ============================================================

// Pre-defined actual images from Unsplash for the gallery
const GALLERY_IMAGES = [
  { src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=240&h=320&fit=crop', name: 'Mountain River' },
  { src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=240&h=200&fit=crop', name: 'Snowy Peaks' },
  { src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=240&h=280&fit=crop', name: 'Forest Cabin' },
  { src: 'https://images.unsplash.com/photo-1546587348-d12660c30c50?w=240&h=360&fit=crop', name: 'Waterfall' },
  { src: 'https://images.unsplash.com/photo-1433086966358-54859d0ed7df?w=240&h=240&fit=crop', name: 'Autumn Leaves' },
  { src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=240&h=300&fit=crop', name: 'Lake Reflection' },
  { src: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=240&h=220&fit=crop', name: 'Desert Dunes' },
  { src: 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=240&h=340&fit=crop', name: 'City Street' },
  { src: 'https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=240&h=260&fit=crop', name: 'Coastal Cliffs' },
  { src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=240&h=380&fit=crop', name: 'Sunset Rays' },
  { src: 'https://images.unsplash.com/photo-1475924156734-496f6ca7a043?w=240&h=210&fit=crop', name: 'Green Valley' },
  { src: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=240&h=290&fit=crop', name: 'Ocean Waves' },
  { src: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=240&h=250&fit=crop', name: 'Misty Forest' },
  { src: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=240&h=330&fit=crop', name: 'Starry Night' }
];

function renderContent() {
  const scroll = document.getElementById('contentScroll');
  const tab = getActiveTab();
  if (!tab) return;

  // Dashboard view shows widgets
  if (tab.nodeId === state.dashboardId && !state.searchQuery) {
    scroll.innerHTML = renderHomeView();
    wireHomeView();
    if (window.lucide) lucide.createIcons();
    return;
  }

  const items = getCurrentItems();

  if (items.length === 0) {
    if (state.searchQuery) {
      scroll.innerHTML = `<div class="empty-state">
        <i data-lucide="search-x"></i>
        <div class="title">No results for "${escapeHtml(state.searchQuery)}"</div>
        <div class="desc">Try a different search term or clear the search</div>
      </div>`;
    } else {
      scroll.innerHTML = `<div class="empty-state">
        <i data-lucide="folder-open"></i>
        <div class="title">This folder is empty</div>
        <div class="desc">Create a new file or folder to get started</div>
      </div>`;
    }
    if (window.lucide) lucide.createIcons();
    return;
  }

  if (state.viewMode === 'grid') {
    scroll.innerHTML = renderGrid(items);
  } else {
    scroll.innerHTML = renderList(items, state.viewMode === 'compact');
  }

  wireFileItems();
  if (window.lucide) lucide.createIcons();
}

// ============================================================
//  Home View — Widgets (Win11 inspired)
// ============================================================

function renderHomeView() {
  let html = `<div class="home-view">`;

  // ---------- Image Gallery Widget ----------
  if (state.widgets.imageGallery.visible) {
    const orient = state.widgets.imageGallery.orientation;
    const orientIcon = orient === 'vertical' ? 'rows-3' : 'columns-3';
    const orientLabel = orient === 'vertical' ? 'Switch to horizontal scroll' : 'Switch to vertical masonry';
    const orientSubtitle = orient === 'vertical'
      ? `${GALLERY_IMAGES.length} images · masonry layout`
      : `${GALLERY_IMAGES.length} images · horizontal scroll`;

    html += `
      <section class="widget-box" id="widget-gallery">
        <header class="widget-header">
          <div class="widget-header-icon"><i data-lucide="image"></i></div>
          <div class="widget-header-text">
            <div class="widget-title">Image Gallery</div>
            <div class="widget-subtitle">${orientSubtitle}</div>
          </div>
        </header>
        <div class="widget-actions">
          <button class="widget-action-btn" data-action="toggle-orientation" title="${orientLabel}">
            <i data-lucide="${orientIcon}"></i>
          </button>
          <button class="widget-action-btn" data-action="refresh-gallery" title="Refresh images">
            <i data-lucide="refresh-cw"></i>
          </button>
          <button class="widget-action-btn danger" data-action="close-gallery" title="Close widget">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="widget-body">
          <div class="masonry-gallery ${orient}">
            ${GALLERY_IMAGES.map((img, i) => {
              return `
              <div class="masonry-item" data-index="${i}" title="${escapeHtml(img.name)}">
                <img src="${img.src}" alt="${escapeHtml(img.name)}" loading="lazy">
                <div class="masonry-name">${escapeHtml(img.name)}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </section>
    `;
  }

  // ---------- Empty state ----------
  if (!state.widgets.imageGallery.visible) {
    html += `
      <div class="widgets-empty">
        <i data-lucide="layout-grid"></i>
        <div style="font-size:14px;font-weight:500;color:var(--text-secondary);">No widgets active</div>
        <div style="font-size:12.5px;">Refresh the page to restore default widgets</div>
      </div>`;
  }

  html += `</div>`;
  return html;
}

function wireHomeView() {
  // Widget action buttons
  document.querySelectorAll('.widget-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      switch (action) {
        case 'toggle-orientation':
          toggleGalleryOrientation();
          break;
        case 'refresh-gallery':
          showToast('Gallery refreshed', 'info');
          renderContent();
          break;
        case 'close-gallery':
          closeWidget('imageGallery');
          break;
      }
    });
  });

  // Click on masonry item -> open properties
  document.querySelectorAll('.masonry-item').forEach(el => {
    el.addEventListener('click', () => {
      const index = el.dataset.index;
      const img = GALLERY_IMAGES[index];
      if (img) showToast(`Selected: ${img.name}`, 'info');
    });
    el.addEventListener('dblclick', () => {
      const index = el.dataset.index;
      const img = GALLERY_IMAGES[index];
      if (img) showToast(`Opening: ${img.name}`, 'info');
    });
  });
}

function toggleGalleryOrientation() {
  const w = state.widgets.imageGallery;
  w.orientation = w.orientation === 'vertical' ? 'horizontal' : 'vertical';
  renderContent();
  showToast(`Gallery: ${w.orientation === 'vertical' ? 'vertical masonry' : 'horizontal scroll'}`, 'info');
}

function closeWidget(name) {
  if (name === 'imageGallery') state.widgets.imageGallery.visible = false;
  renderContent();
}

function getCurrentItems() {
  const tab = getActiveTab();
  if (!tab || tab.nodeId === 'dashboard') return [];
  
  const node = fsNodes.get(tab.nodeId);
  if (!node || !node.children) return [];
  let items = node.children.map(cid => fsNodes.get(cid)).filter(Boolean);

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    items = items.filter(it => it.name.toLowerCase().includes(q));
  }

  const dir = state.sortDir === 'asc' ? 1 : -1;
  items.sort((a, b) => {
    const aFolder = a.type === 'folder';
    const bFolder = b.type === 'folder';
    if (aFolder !== bFolder) return aFolder ? -1 : 1;
    let av, bv;
    switch (state.sortBy) {
      case 'name':
        av = a.name.toLowerCase(); bv = b.name.toLowerCase();
        return av < bv ? -1 * dir : (av > bv ? 1 * dir : 0);
      case 'size':
        av = a.size; bv = b.size;
        return (av - bv) * dir;
      case 'type':
        av = a.type; bv = b.type;
        return av < bv ? -1 * dir : (av > bv ? 1 * dir : 0);
      case 'modified':
        av = a.modified.getTime(); bv = b.modified.getTime();
        return (av - bv) * dir;
      default: return 0;
    }
  });

  return items;
}

function formatSize(bytes) {
  if (bytes === 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  if (bytes < 1024 * 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  return (bytes / 1024 / 1024 / 1024 / 1024).toFixed(2) + ' TB';
}

function formatDate(d) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today - that) / 86400000);
  if (diffDays === 0) return 'Today, ' + d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return diffDays + ' days ago';
  return d.toLocaleDateString([], {year: 'numeric', month: 'short', day: 'numeric'});
}

function getFileMeta(node) {
  return TYPE_META[node.type] || TYPE_META.generic;
}

function renderGrid(items) {
  let html = `<div class="file-grid">`;
  for (const it of items) {
    const meta = getFileMeta(it);
    const selected = state.selection.has(it.id);
    html += `<div class="file-item ${selected ? 'selected' : ''}" data-node-id="${it.id}">
      <div class="file-checkbox ${selected ? 'checked' : ''}"></div>
      <div class="file-icon-wrap">
        <i data-lucide="${meta.icon}" class="${meta.class}"></i>
      </div>
      <div class="file-name">${escapeHtml(it.name)}</div>
    </div>`;
  }
  html += `</div>`;
  return html;
}

function renderList(items, compact) {
  const sortIcon = state.sortDir === 'asc' ? 'chevron-up' : 'chevron-down';
  let html = `<div class="file-list ${compact ? 'compact' : ''}">`;
  html += `<div class="list-header">
    <div class="col name ${state.sortBy === 'name' ? 'sorted' : ''}" data-sort="name">
      <span>Name</span>
      ${state.sortBy === 'name' ? `<i data-lucide="${sortIcon}"></i>` : ''}
    </div>
    <div class="col size ${state.sortBy === 'size' ? 'sorted' : ''}" data-sort="size">
      <span>Size</span>
      ${state.sortBy === 'size' ? `<i data-lucide="${sortIcon}"></i>` : ''}
    </div>
    <div class="col type ${state.sortBy === 'type' ? 'sorted' : ''}" data-sort="type">
      <span>Type</span>
      ${state.sortBy === 'type' ? `<i data-lucide="${sortIcon}"></i>` : ''}
    </div>
    <div class="col date ${state.sortBy === 'modified' ? 'sorted' : ''}" data-sort="modified">
      <span>Modified</span>
      ${state.sortBy === 'modified' ? `<i data-lucide="${sortIcon}"></i>` : ''}
    </div>
    <div></div>
  </div>`;

  for (const it of items) {
    const meta = getFileMeta(it);
    const selected = state.selection.has(it.id);
    const size = it.type === 'folder' ? '—' : formatSize(it.size);
    html += `<div class="list-row ${selected ? 'selected' : ''}" data-node-id="${it.id}">
      <div class="name-col">
        <div class="file-icon-wrap"><i data-lucide="${meta.icon}" class="${meta.class}"></i></div>
        <span class="name-text">${escapeHtml(it.name)}</span>
      </div>
      <div class="size-col">${size}</div>
      <div class="type-col">${meta.label}</div>
      <div class="date-col">${formatDate(it.modified)}</div>
      <div></div>
    </div>`;
  }
  html += `</div>`;
  return html;
}

function wireFileItems() {
  document.querySelectorAll('.file-item, .list-row').forEach(el => {
    const nodeId = el.dataset.nodeId;

    el.addEventListener('click', (e) => {
      const isCheckbox = e.target.closest('.file-checkbox');

      if (isCheckbox) {
        e.stopPropagation();
        if (state.selection.has(nodeId)) state.selection.delete(nodeId);
        else state.selection.add(nodeId);
      } else if (e.ctrlKey || e.metaKey) {
        if (state.selection.has(nodeId)) state.selection.delete(nodeId);
        else state.selection.add(nodeId);
      } else if (e.shiftKey) {
        const items = getCurrentItems();
        const idx = items.findIndex(i => i.id === nodeId);
        if (idx >= 0 && state.selection.size > 0) {
          const lastSelected = Array.from(state.selection).pop();
          const lastIdx = items.findIndex(i => i.id === lastSelected);
          if (lastIdx >= 0) {
            const start = Math.min(idx, lastIdx);
            const end = Math.max(idx, lastIdx);
            for (let i = start; i <= end; i++) state.selection.add(items[i].id);
          }
        } else {
          state.selection.clear();
          state.selection.add(nodeId);
        }
      } else {
        state.selection.clear();
        state.selection.add(nodeId);
      }

      const tab = getActiveTab();
      if (tab) tab.selectedIds = state.selection;
      updateSelectionUI();
    });

    el.addEventListener('dblclick', () => {
      const node = fsNodes.get(nodeId);
      if (!node) return;
      if (node.type === 'folder') {
        navigateTo(nodeId);
      } else {
        showProperties(nodeId);
      }
    });

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!state.selection.has(nodeId)) {
        state.selection.clear();
        state.selection.add(nodeId);
        const tab = getActiveTab();
        if (tab) tab.selectedIds = state.selection;
        updateSelectionUI();
      }
      showFileContextMenu(e.clientX, e.clientY, nodeId);
    });
  });

  document.querySelectorAll('.list-header .col').forEach(c => {
    c.addEventListener('click', () => {
      const sort = c.dataset.sort;
      if (!sort) return;
      if (state.sortBy === sort) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = sort;
        state.sortDir = 'asc';
      }
      renderContent();
      renderStatusbar();
    });
  });
}

function updateSelectionUI() {
  document.querySelectorAll('.file-item, .list-row').forEach(el => {
    const id = el.dataset.nodeId;
    const selected = state.selection.has(id);
    el.classList.toggle('selected', selected);
    const cb = el.querySelector('.file-checkbox');
    if (cb) cb.classList.toggle('checked', selected);
  });
  renderStatusbar();
  renderSelectionInfo();
  updateActionButtons();
}

function renderStatusbar() {
  const items = getCurrentItems();
  const totalSize = state.selection.size > 0
    ? Array.from(state.selection).map(id => fsNodes.get(id)).filter(Boolean).reduce((s, n) => s + (n.size || 0), 0)
    : 0;

  const tab = getActiveTab();
  let storageLabel = 'Local SSD · 120 GB free';
  if (tab) {
    const path = getPath(tab.nodeId);
    if (path.length > 1 && path[1].name === 'Home') storageLabel = 'home volume · 76 GB free';
    else if (tab.nodeId === 'dashboard') storageLabel = 'System Overview';
  }

  const sortLabels = { name: 'Name', size: 'Size', type: 'Type', modified: 'Modified' };
  const sortIcon = state.sortDir === 'asc' ? 'chevron-up' : 'chevron-down';

  const el = document.getElementById('statusbar');
  el.innerHTML = `
    <div class="status-left">
      <div class="status-item">
        <i data-lucide="${tab && tab.nodeId === 'dashboard' ? 'layout-dashboard' : 'folder'}"></i>
        <span>${tab && tab.nodeId === 'dashboard' ? 'Dashboard' : `${items.length} item${items.length !== 1 ? 's' : ''}`}</span>
      </div>
      ${state.selection.size > 0 ? `
        <div class="status-divider"></div>
        <div class="status-item">
          <span class="status-accent">${state.selection.size} selected</span>
          ${totalSize > 0 ? `<span class="status-muted">· ${formatSize(totalSize)}</span>` : ''}
        </div>
      ` : ''}
    </div>
    <div class="status-spacer"></div>
    <div class="status-right-group">
      <div class="view-segmented">
        <button class="seg-btn ${state.viewMode === 'grid' ? 'active' : ''}" data-view="grid" title="Grid view">
          <i data-lucide="grid-3x3"></i>
        </button>
        <button class="seg-btn ${state.viewMode === 'list' ? 'active' : ''}" data-view="list" title="List view">
          <i data-lucide="list"></i>
        </button>
        <button class="seg-btn ${state.viewMode === 'compact' ? 'active' : ''}" data-view="compact" title="Compact view">
          <i data-lucide="rows-3"></i>
        </button>
      </div>
      <button class="sort-btn" id="sortBtn">
        <i data-lucide="arrow-up-down"></i>
        <span>${sortLabels[state.sortBy]}</span>
        <i data-lucide="${sortIcon}" class="chev"></i>
      </button>
      <div class="status-divider"></div>
      <div class="status-item">
        <i data-lucide="hard-drive"></i>
        <span>${storageLabel}</span>
      </div>
    </div>
  `;

  el.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => setViewMode(btn.dataset.view));
  });

  const sortBtn = document.getElementById('sortBtn');
  if (sortBtn) {
    sortBtn.addEventListener('click', () => {
      const rect = sortBtn.getBoundingClientRect();
      showSortMenu(rect.left, rect.top, true);
    });
  }

  if (window.lucide) lucide.createIcons();
}

function renderSelectionInfo() {
  const el = document.getElementById('selectionInfo');
  if (state.selection.size === 0) {
    el.innerHTML = '';
  } else {
    el.innerHTML = `<span class="dot"></span><span class="count">${state.selection.size}</span><span>selected</span>`;
  }
}

function updateActionButtons() {
  const hasSelection = state.selection.size > 0;
  const hasClipboard = state.clipboard && state.clipboard.ids.length > 0;
  const tab = getActiveTab();
  const isDashboard = tab && tab.nodeId === 'dashboard';

  // Directory bar actions
  document.getElementById('pasteBtn').disabled = !hasClipboard || isDashboard;

  // Action bar buttons
  document.getElementById('copyBtn').disabled = !hasSelection;
  document.getElementById('cutBtn').disabled = !hasSelection;
  document.getElementById('renameBtn').disabled = state.selection.size !== 1;
  document.getElementById('deleteBtn').disabled = !hasSelection;

  // Auto-hide action bar
  const actionBar = document.getElementById('actionBar');
  if (hasSelection) {
    actionBar.classList.remove('hidden');
  } else {
    actionBar.classList.add('hidden');
  }
}

function updateNavButtons() {
  const tab = getActiveTab();
  if (!tab) return;
  document.getElementById('backBtn').disabled = tab.historyIdx <= 0;
  document.getElementById('forwardBtn').disabled = tab.historyIdx >= tab.history.length - 1;
  const node = fsNodes.get(tab.nodeId);
  document.getElementById('upBtn').disabled = !node || !node.parentId;
}

function setViewMode(mode) {
  state.viewMode = mode;
  renderContent();
  renderStatusbar();
}

function renderAll() {
  renderSidebar();
  renderTabs();
  renderBreadcrumb();
  renderContent();
  renderStatusbar();
  renderSelectionInfo();
  updateActionButtons();
  updateNavButtons();
}

// ============================================================
//  Context menus
// ============================================================

function closeAllMenus() {
  document.querySelectorAll('.context-menu').forEach(m => m.remove());
}

function positionMenu(menu, x, y, openAbove = false) {
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  let mx = Math.min(x, window.innerWidth - rect.width - 8);
  let my;
  if (openAbove) {
    my = y - rect.height;
    if (my < 8) my = 8;
  } else {
    my = Math.min(y, window.innerHeight - rect.height - 8);
    if (my < 8) my = 8;
  }
  if (mx < 8) mx = 8;
  menu.style.left = mx + 'px';
  menu.style.top = my + 'px';
}

function showFileContextMenu(x, y, nodeId) {
  closeAllMenus();
  const node = fsNodes.get(nodeId);
  if (!node) return;
  const isFolder = node.type === 'folder';
  const multi = state.selection.size > 1;

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    ${multi ? `<div class="menu-section-label">${state.selection.size} items selected</div>` : ''}
    <div class="menu-item" data-action="open">
      <i data-lucide="${isFolder ? 'folder-open' : 'external-link'}" class="icon"></i>
      <span class="label">Open</span>
    </div>
    ${isFolder ? `
      <div class="menu-item" data-action="open-new-tab">
        <i data-lucide="square-arrow-out-up-right" class="icon"></i>
        <span class="label">Open in new tab</span>
      </div>
    ` : `
      <div class="menu-item" data-action="open-with">
        <i data-lucide="app-window" class="icon"></i>
        <span class="label">Open with…</span>
        <i data-lucide="chevron-right" class="menu-arrow"></i>
      </div>
    `}
    <div class="menu-separator"></div>
    <div class="menu-item" data-action="copy">
      <i data-lucide="copy" class="icon"></i>
      <span class="label">Copy</span>
      <span class="shortcut">Ctrl+C</span>
    </div>
    <div class="menu-item" data-action="cut">
      <i data-lucide="scissors" class="icon"></i>
      <span class="label">Cut</span>
      <span class="shortcut">Ctrl+X</span>
    </div>
    <div class="menu-item ${multi ? 'disabled' : ''}" data-action="duplicate">
      <i data-lucide="copy-plus" class="icon"></i>
      <span class="label">Duplicate</span>
    </div>
    <div class="menu-item ${multi ? 'disabled' : ''}" data-action="rename">
      <i data-lucide="pencil-line" class="icon"></i>
      <span class="label">Rename…</span>
      <span class="shortcut">F2</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item" data-action="properties">
      <i data-lucide="info" class="icon"></i>
      <span class="label">Properties</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item danger" data-action="trash">
      <i data-lucide="trash-2" class="icon"></i>
      <span class="label">Move to Trash</span>
      <span class="shortcut">Del</span>
    </div>
  `;

  positionMenu(menu, x, y);
  if (window.lucide) lucide.createIcons();

  menu.querySelectorAll('.menu-item').forEach(mi => {
    mi.addEventListener('click', () => {
      if (mi.classList.contains('disabled')) return;
      const action = mi.dataset.action;
      closeAllMenus();
      handleFileAction(action, nodeId);
    });
  });
}

function handleFileAction(action, nodeId) {
  switch (action) {
    case 'open': {
      const node = fsNodes.get(nodeId);
      if (node) {
        if (node.type === 'folder') navigateTo(nodeId);
        else showProperties(nodeId);
      }
      break;
    }
    case 'open-new-tab':
      createTab(nodeId);
      renderAll();
      break;
    case 'open-with':
      showToast('Application picker is illustrative in this demo', 'info');
      break;
    case 'copy': copySelection(); break;
    case 'cut': cutSelection(); break;
    case 'rename':
      if (state.selection.size === 1) showRenameDialog(nodeId);
      break;
    case 'duplicate': duplicateNode(nodeId); break;
    case 'properties': showProperties(nodeId); break;
    case 'trash': trashSelection(); break;
  }
}

function showBackgroundContextMenu(x, y) {
  closeAllMenus();
  const tab = getActiveTab();
  const isDashboard = tab && tab.nodeId === 'dashboard';
  
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <div class="menu-item ${isDashboard ? 'disabled' : ''}" data-action="new-folder">
      <i data-lucide="folder-plus" class="icon"></i>
      <span class="label">New folder</span>
      <span class="shortcut">Ctrl+Shift+N</span>
    </div>
    <div class="menu-item ${isDashboard ? 'disabled' : ''}" data-action="new-file">
      <i data-lucide="file-plus" class="icon"></i>
      <span class="label">New file</span>
    </div>
    <div class="menu-item" data-action="import">
      <i data-lucide="upload" class="icon"></i>
      <span class="label">Import files…</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item ${(!state.clipboard || isDashboard) ? 'disabled' : ''}" data-action="paste">
      <i data-lucide="clipboard-paste" class="icon"></i>
      <span class="label">Paste</span>
      <span class="shortcut">Ctrl+V</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item" data-action="select-all">
      <i data-lucide="square-mouse-pointer" class="icon"></i>
      <span class="label">Select all</span>
      <span class="shortcut">Ctrl+A</span>
    </div>
    <div class="menu-item" data-action="refresh">
      <i data-lucide="refresh-cw" class="icon"></i>
      <span class="label">Refresh</span>
      <span class="shortcut">F5</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item" data-action="properties-folder">
      <i data-lucide="info" class="icon"></i>
      <span class="label">Properties</span>
    </div>
  `;

  positionMenu(menu, x, y);
  if (window.lucide) lucide.createIcons();

  menu.querySelectorAll('.menu-item').forEach(mi => {
    mi.addEventListener('click', () => {
      if (mi.classList.contains('disabled')) return;
      const action = mi.dataset.action;
      closeAllMenus();
      switch (action) {
        case 'new-folder': showNewFolderDialog(); break;
        case 'new-file': showNewFileDialog(); break;
        case 'import': triggerFileImport(); break;
        case 'paste': pasteClipboard(); break;
        case 'select-all': selectAll(); break;
        case 'refresh':
          renderAll();
          showToast('Refreshed', 'info');
          break;
        case 'properties-folder':
          if (tab) showProperties(tab.nodeId);
          break;
      }
    });
  });
}

function showSortMenu(x, y, openAbove = false) {
  closeAllMenus();
  const options = [
    { key: 'name', label: 'Name' },
    { key: 'size', label: 'Size' },
    { key: 'type', label: 'Type' },
    { key: 'modified', label: 'Date modified' },
  ];
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `<div class="menu-section-label">Sort by</div>` +
    options.map(o => `
      <div class="menu-item" data-sort="${o.key}">
        <i data-lucide="${state.sortBy === o.key ? 'check' : 'circle'}" class="icon" style="${state.sortBy === o.key ? 'color:var(--accent)' : 'opacity:0'}"></i>
        <span class="label">${o.label}</span>
      </div>
    `).join('') +
    `<div class="menu-separator"></div>
    <div class="menu-section-label">Order</div>
    <div class="menu-item" data-dir="asc">
      <i data-lucide="${state.sortDir === 'asc' ? 'check' : 'circle'}" class="icon" style="${state.sortDir === 'asc' ? 'color:var(--accent)' : 'opacity:0'}"></i>
      <span class="label">Ascending</span>
    </div>
    <div class="menu-item" data-dir="desc">
      <i data-lucide="${state.sortDir === 'desc' ? 'check' : 'circle'}" class="icon" style="${state.sortDir === 'desc' ? 'color:var(--accent)' : 'opacity:0'}"></i>
      <span class="label">Descending</span>
    </div>`;
  positionMenu(menu, x, y, openAbove);
  if (window.lucide) lucide.createIcons();

  menu.querySelectorAll('[data-sort]').forEach(mi => {
    mi.addEventListener('click', () => {
      state.sortBy = mi.dataset.sort;
      state.sortDir = 'asc';
      closeAllMenus();
      renderContent();
      renderStatusbar();
    });
  });
  menu.querySelectorAll('[data-dir]').forEach(mi => {
    mi.addEventListener('click', () => {
      state.sortDir = mi.dataset.dir;
      closeAllMenus();
      renderContent();
      renderStatusbar();
    });
  });
}

function showMoreMenu(x, y) {
  closeAllMenus();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <div class="menu-item" data-action="select-all">
      <i data-lucide="square-mouse-pointer" class="icon"></i>
      <span class="label">Select all</span>
      <span class="shortcut">Ctrl+A</span>
    </div>
    <div class="menu-item" data-action="invert">
      <i data-lucide="list-checks" class="icon"></i>
      <span class="label">Invert selection</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item" data-action="terminal">
      <i data-lucide="terminal" class="icon"></i>
      <span class="label">Open terminal here</span>
    </div>
    <div class="menu-item" data-action="import">
      <i data-lucide="upload" class="icon"></i>
      <span class="label">Import files…</span>
    </div>
    <div class="menu-item" data-action="export">
      <i data-lucide="download" class="icon"></i>
      <span class="label">Export listing…</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item" data-action="properties-folder">
      <i data-lucide="info" class="icon"></i>
      <span class="label">Folder properties</span>
    </div>
  `;
  positionMenu(menu, x, y);
  if (window.lucide) lucide.createIcons();

  menu.querySelectorAll('.menu-item').forEach(mi => {
    mi.addEventListener('click', () => {
      const action = mi.dataset.action;
      closeAllMenus();
      switch (action) {
        case 'select-all': selectAll(); break;
        case 'invert': {
          const items = getCurrentItems();
          const newSel = new Set();
          items.forEach(it => { if (!state.selection.has(it.id)) newSel.add(it.id); });
          state.selection = newSel;
          const tab = getActiveTab();
          if (tab) tab.selectedIds = state.selection;
          updateSelectionUI();
          break;
        }
        case 'terminal': showToast('Terminal requires system integration not available in browser', 'info'); break;
        case 'import': triggerFileImport(); break;
        case 'export': showToast('Listing exported to clipboard', 'success'); break;
        case 'properties-folder':
          const tab = getActiveTab();
          if (tab) showProperties(tab.nodeId);
          break;
      }
    });
  });
}

function showTabContextMenu(x, y, tabId) {
  closeAllMenus();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <div class="menu-item" data-action="new-tab-right">
      <i data-lucide="plus" class="icon"></i>
      <span class="label">New tab to the right</span>
    </div>
    <div class="menu-item" data-action="duplicate-tab">
      <i data-lucide="copy" class="icon"></i>
      <span class="label">Duplicate this tab</span>
    </div>
    <div class="menu-separator"></div>
    <div class="menu-item" data-action="close">
      <i data-lucide="x" class="icon"></i>
      <span class="label">Close tab</span>
    </div>
    <div class="menu-item" data-action="close-others">
      <i data-lucide="square-x" class="icon"></i>
      <span class="label">Close other tabs</span>
    </div>
  `;
  positionMenu(menu, x, y);
  if (window.lucide) lucide.createIcons();

  menu.querySelectorAll('.menu-item').forEach(mi => {
    mi.addEventListener('click', () => {
      const action = mi.dataset.action;
      closeAllMenus();
      const tab = state.tabs.find(t => t.id === tabId);
      if (!tab) return;
      switch (action) {
        case 'new-tab-right':
          createTab(tab.nodeId);
          renderAll();
          break;
        case 'duplicate-tab':
          const dup = createTab(tab.nodeId);
          state.activeTabId = dup.id;
          renderAll();
          break;
        case 'close':
          closeTab(tabId);
          break;
        case 'close-others':
          state.tabs = state.tabs.filter(t => t.id === tabId);
          state.activeTabId = tabId;
          renderAll();
          break;
      }
    });
  });
}

// ============================================================
//  File operations
// ============================================================

function copySelection() {
  if (state.selection.size === 0) return;
  state.clipboard = { mode: 'copy', ids: Array.from(state.selection) };
  updateActionButtons();
  showToast(`Copied ${state.selection.size} item${state.selection.size > 1 ? 's' : ''}`, 'success');
}

function cutSelection() {
  if (state.selection.size === 0) return;
  state.clipboard = { mode: 'cut', ids: Array.from(state.selection) };
  updateActionButtons();
  showToast(`Cut ${state.selection.size} item${state.selection.size > 1 ? 's' : ''}`, 'success');
}

function pasteClipboard() {
  if (!state.clipboard) return;
  const tab = getActiveTab();
  if (!tab || tab.nodeId === 'dashboard') return;
  
  const dest = fsNodes.get(tab.nodeId);
  if (!dest || !dest.children) return;

  let count = 0;
  for (const id of state.clipboard.ids) {
    const node = fsNodes.get(id);
    if (!node) continue;
    if (state.clipboard.mode === 'cut' && (id === tab.nodeId || isAncestor(id, tab.nodeId))) continue;

    let newName = node.name;
    if (state.clipboard.mode === 'copy') {
      newName = getUniqueName(dest, node.name);
      cloneNodeTree(node, dest, newName);
    } else {
      const oldParent = fsNodes.get(node.parentId);
      if (oldParent) {
        const idx = oldParent.children.indexOf(id);
        if (idx >= 0) oldParent.children.splice(idx, 1);
      }
      node.parentId = dest.id;
      node.name = newName;
      dest.children.push(id);
    }
    count++;
  }

  if (state.clipboard.mode === 'cut') state.clipboard = null;
  state.selection.clear();
  renderAll();
  if (count > 0) showToast(`Pasted ${count} item${count > 1 ? 's' : ''}`, 'success');
}

function cloneNodeTree(node, parent, name) {
  const clone = createNode({
    name: name,
    type: node.type,
    parentId: parent.id,
    size: node.size,
    meta: { ...node.meta },
  });
  parent.children.push(clone.id);
  if (node.children) {
    for (const cid of node.children) {
      const child = fsNodes.get(cid);
      if (child) cloneNodeTree(child, clone, child.name);
    }
  }
  return clone;
}

function getUniqueName(parent, name) {
  if (!getChildByName(parent.id, name)) return name;
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.substring(0, dot) : name;
  const ext = dot > 0 ? name.substring(dot) : '';
  let i = 1;
  while (getChildByName(parent.id, `${base} (copy${i > 1 ? ' ' + i : ''})${ext}`)) i++;
  return `${base} (copy${i > 1 ? ' ' + i : ''})${ext}`;
}

function trashSelection() {
  if (state.selection.size === 0) return;
  const count = state.selection.size;

  if (count >= 3) {
    showConfirmDialog(
      `Move ${count} items to trash?`,
      `These ${count} items will be moved to the trash. You can restore them later from the Trash.`,
      () => doTrash()
    );
  } else {
    doTrash();
  }
}

function doTrash() {
  const tab = getActiveTab();
  if (!tab) return;
  const parent = fsNodes.get(tab.nodeId);
  if (!parent || !parent.children) return;

  const count = state.selection.size;
  for (const id of state.selection) {
    const idx = parent.children.indexOf(id);
    if (idx >= 0) parent.children.splice(idx, 1);
  }
  state.selection.clear();
  renderAll();
  showToast(`Moved ${count} item${count > 1 ? 's' : ''} to trash`, 'success');
}

function duplicateNode(nodeId) {
  const node = fsNodes.get(nodeId);
  if (!node || !node.parentId) return;
  const parent = fsNodes.get(node.parentId);
  if (!parent) return;
  const newName = getUniqueName(parent, node.name);
  cloneNodeTree(node, parent, newName);
  state.selection.clear();
  renderAll();
  showToast('Item duplicated', 'success');
}

function showRenameDialog(nodeId) {
  const node = fsNodes.get(nodeId);
  if (!node) return;
  showDialog({
    title: 'Rename item',
    desc: 'Enter a new name for this item.',
    input: { value: node.name, selectName: true },
    primaryLabel: 'Rename',
    onPrimary: (val) => {
      if (!val || val === node.name) return;
      const parent = fsNodes.get(node.parentId);
      if (parent && getChildByName(parent.id, val) && val !== node.name) {
        showToast('An item with this name already exists', 'error');
        return;
      }
      node.name = val;
      node.modified = new Date();
      renderAll();
      showToast('Renamed successfully', 'success');
    }
  });
}

function showNewFolderDialog() {
  const tab = getActiveTab();
  if (!tab || tab.nodeId === 'dashboard') {
    showToast('Cannot create folders on the Dashboard', 'info');
    return;
  }
  const parent = fsNodes.get(tab.nodeId);
  if (!parent) return;
  const name = getUniqueName(parent, 'New Folder');
  showDialog({
    title: 'New folder',
    desc: 'Enter a name for the new folder.',
    input: { value: name, selectName: true },
    primaryLabel: 'Create',
    onPrimary: (val) => {
      if (!val) return;
      if (getChildByName(parent.id, val)) {
        showToast('An item with this name already exists', 'error');
        return;
      }
      const node = createNode({ name: val, type: 'folder', parentId: parent.id });
      parent.children.push(node.id);
      parent.expanded = true;
      renderAll();
      showToast('Folder created', 'success');
    }
  });
}

function showNewFileDialog() {
  const tab = getActiveTab();
  if (!tab || tab.nodeId === 'dashboard') {
    showToast('Cannot create files on the Dashboard', 'info');
    return;
  }
  const parent = fsNodes.get(tab.nodeId);
  if (!parent) return;
  const name = getUniqueName(parent, 'untitled.txt');
  showDialog({
    title: 'New file',
    desc: 'Enter a name for the new file.',
    input: { value: name, selectName: true },
    primaryLabel: 'Create',
    onPrimary: (val) => {
      if (!val) return;
      if (getChildByName(parent.id, val)) {
        showToast('An item with this name already exists', 'error');
        return;
      }
      const node = createNode({ name: val, type: 'text', parentId: parent.id, size: 0 });
      parent.children.push(node.id);
      renderAll();
      showToast('File created', 'success');
    }
  });
}

// ============================================================
//  Properties panel
// ============================================================

let propertiesPanelEl = null;

function showProperties(nodeId) {
  const node = fsNodes.get(nodeId);
  if (!node || node.type === 'dashboard') return;

  if (propertiesPanelEl) propertiesPanelEl.remove();

  const meta = getFileMeta(node);
  const location = getPath(nodeId).slice(0, -1).map(p => p.name).join(' / ') || '/';

  let preview = `<div class="prop-preview"><i data-lucide="${meta.icon}" class="${meta.class}"></i></div>`;

  let rows = `
    <div class="prop-row"><span class="key">Type</span><span class="val">${meta.label}</span></div>
    <div class="prop-row"><span class="key">Location</span><span class="val" title="${escapeHtml(location)}">${escapeHtml(location)}</span></div>
    <div class="prop-row"><span class="key">Size</span><span class="val">${node.type === 'folder' ? '—' : formatSize(node.size)}</span></div>
    <div class="prop-row"><span class="key">Modified</span><span class="val">${formatDate(node.modified)}</span></div>
  `;

  if (node.type === 'image' && node.meta.w) {
    rows += `<div class="prop-row"><span class="key">Dimensions</span><span class="val">${node.meta.w} × ${node.meta.h}</span></div>`;
  }
  if (node.type === 'folder') {
    const childCount = node.children ? node.children.length : 0;
    rows += `<div class="prop-row"><span class="key">Items</span><span class="val">${childCount}</span></div>`;
  }

  const panel = document.createElement('div');
  panel.className = 'properties-panel';
  panel.innerHTML = `
    <div class="properties-header">
      <div class="icon-wrap"><i data-lucide="${meta.icon}" class="${meta.class}"></i></div>
      <div style="overflow:hidden;flex:1">
        <div class="name">${escapeHtml(node.name)}</div>
        <div class="type">${meta.label}</div>
      </div>
      <button class="properties-close" id="propClose">
        <i data-lucide="x"></i>
      </button>
    </div>
    <div class="properties-body">
      ${preview}
      ${rows}
    </div>
  `;

  document.body.appendChild(panel);
  propertiesPanelEl = panel;
  if (window.lucide) lucide.createIcons();

  document.getElementById('propClose').addEventListener('click', () => {
    panel.remove();
    propertiesPanelEl = null;
  });
}

// ============================================================
//  Dialogs
// ============================================================

function showDialog({ title, desc, input, primaryLabel, onPrimary, danger }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';

  const inputHtml = input ? `<input type="text" class="dialog-input" id="dialogInput" value="${escapeHtml(input.value)}">` : '';

  backdrop.innerHTML = `
    <div class="dialog">
      <div class="dialog-title">${escapeHtml(title)}</div>
      ${desc ? `<div class="dialog-desc">${escapeHtml(desc)}</div>` : ''}
      ${inputHtml}
      <div class="dialog-actions">
        <button class="btn btn-secondary" id="dialogCancel">Cancel</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="dialogPrimary">${escapeHtml(primaryLabel)}</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  if (window.lucide) lucide.createIcons();

  const inputEl = document.getElementById('dialogInput');
  if (inputEl) {
    setTimeout(() => {
      inputEl.focus();
      if (input && input.selectName) {
        const dot = inputEl.value.lastIndexOf('.');
        if (dot > 0) inputEl.setSelectionRange(0, dot);
        else inputEl.select();
      } else {
        inputEl.select();
      }
    }, 30);

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = inputEl.value.trim();
        backdrop.remove();
        if (onPrimary) onPrimary(val);
      } else if (e.key === 'Escape') {
        backdrop.remove();
      }
    });
  }

  document.getElementById('dialogCancel').addEventListener('click', () => backdrop.remove());
  document.getElementById('dialogPrimary').addEventListener('click', () => {
    const val = inputEl ? inputEl.value.trim() : true;
    backdrop.remove();
    if (onPrimary) onPrimary(val);
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });
}

function showConfirmDialog(title, desc, onConfirm) {
  showDialog({
    title, desc, primaryLabel: 'Move to Trash', danger: true, onPrimary: () => onConfirm()
  });
}

// ============================================================
//  Toasts
// ============================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const iconName = type === 'success' ? 'check-circle-2' : type === 'error' ? 'alert-circle' : 'info';
  toast.innerHTML = `<i data-lucide="${iconName}" class="icon"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(24px)';
    toast.style.transition = 'all 200ms';
    setTimeout(() => toast.remove(), 200);
  }, 2600);
}

// ============================================================
//  Utilities
// ============================================================

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function selectAll() {
  const items = getCurrentItems();
  state.selection.clear();
  items.forEach(it => state.selection.add(it.id));
  const tab = getActiveTab();
  if (tab) tab.selectedIds = state.selection;
  updateSelectionUI();
}

function triggerFileImport() {
  const tab = getActiveTab();
  if (!tab || tab.nodeId === 'dashboard') {
    showToast('Cannot import files directly to the Dashboard', 'info');
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.onchange = (e) => {
    const files = e.target.files;
    const parent = fsNodes.get(tab.nodeId);
    if (!parent) return;
    for (const f of files) {
      const ext = f.name.split('.').pop().toLowerCase();
      let type = 'generic';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) type = 'image';
      else if (['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(ext)) type = 'video';
      else if (['mp3', 'ogg', 'flac', 'wav', 'm4a'].includes(ext)) type = 'audio';
      else if (['zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'borg'].includes(ext)) type = 'archive';
      else if (['js', 'ts', 'tsx', 'jsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'rb', 'php', 'sh', 'json', 'yaml', 'yml', 'toml', 'css', 'html'].includes(ext)) type = 'code';
      else if (['txt', 'md', 'rst'].includes(ext)) type = 'text';
      else if (ext === 'pdf') type = 'pdf';
      else if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) type = 'doc';
      else if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) type = 'sheet';
      else if (['deb', 'rpm', 'appimage', 'snap'].includes(ext)) type = 'app';

      const node = createNode({
        name: f.name,
        type: type,
        size: f.size,
        parentId: parent.id,
      });
      parent.children.push(node.id);
    }
    renderAll();
    showToast(`Imported ${files.length} file${files.length > 1 ? 's' : ''}`, 'success');
  };
  input.click();
}

// ============================================================
//  Event wiring
// ============================================================

function initEvents() {
  document.getElementById('backBtn').addEventListener('click', goBack);
  document.getElementById('forwardBtn').addEventListener('click', goForward);
  document.getElementById('upBtn').addEventListener('click', goUp);
  document.getElementById('refreshBtn').addEventListener('click', () => {
    renderAll();
    showToast('Refreshed', 'info');
  });

  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderContent();
    renderStatusbar();
  });

  document.getElementById('newFolderBtn').addEventListener('click', showNewFolderDialog);
  document.getElementById('newFileBtn').addEventListener('click', showNewFileDialog);
  document.getElementById('pasteBtn').addEventListener('click', pasteClipboard);

  document.getElementById('copyBtn').addEventListener('click', copySelection);
  document.getElementById('cutBtn').addEventListener('click', cutSelection);
  document.getElementById('renameBtn').addEventListener('click', () => {
    if (state.selection.size === 1) showRenameDialog(Array.from(state.selection)[0]);
  });
  document.getElementById('deleteBtn').addEventListener('click', trashSelection);

  document.getElementById('moreMenuBtn').addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    showMoreMenu(rect.left - 120, rect.bottom + 4);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape' && e.target.id === 'searchInput') {
        e.target.value = '';
        state.searchQuery = '';
        renderContent();
        renderStatusbar();
        e.target.blur();
      }
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'c': e.preventDefault(); copySelection(); break;
        case 'x': e.preventDefault(); cutSelection(); break;
        case 'v': e.preventDefault(); pasteClipboard(); break;
        case 'a': e.preventDefault(); selectAll(); break;
        case 't': e.preventDefault();
          const tab = getActiveTab();
          createTab(tab ? tab.nodeId : state.dashboardId);
          renderAll();
          break;
        case 'w': e.preventDefault();
          if (state.activeTabId) closeTab(state.activeTabId);
          break;
      }
    } else {
      switch (e.key) {
        case 'F2':
          e.preventDefault();
          if (state.selection.size === 1) showRenameDialog(Array.from(state.selection)[0]);
          break;
        case 'Delete':
          e.preventDefault();
          trashSelection();
          break;
        case 'Escape':
          if (document.querySelector('.context-menu')) {
            closeAllMenus();
          } else if (propertiesPanelEl) {
            propertiesPanelEl.remove();
            propertiesPanelEl = null;
          } else if (document.querySelector('.dialog-backdrop')) {
            document.querySelector('.dialog-backdrop').remove();
          } else {
            state.selection.clear();
            const tab2 = getActiveTab();
            if (tab2) tab2.selectedIds = state.selection;
            updateSelectionUI();
          }
          break;
        case 'Enter':
          if (state.selection.size === 1 && !document.querySelector('.dialog-backdrop')) {
            const id = Array.from(state.selection)[0];
            const node = fsNodes.get(id);
            if (node) {
              if (node.type === 'folder') navigateTo(id);
              else showProperties(id);
            }
          }
          break;
        case 'Backspace':
          if (!e.target.matches('input,textarea')) {
            e.preventDefault();
            goBack();
          }
          break;
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) closeAllMenus();
  });

  document.getElementById('contentScroll').addEventListener('contextmenu', (e) => {
    if (e.target.closest('.file-item, .list-row, .list-header, .widget-box')) return;
    e.preventDefault();
    showBackgroundContextMenu(e.clientX, e.clientY);
  });

  // Sidebar resize
  const resizeHandle = document.getElementById('sidebarResize');
  let resizing = false;
  resizeHandle.addEventListener('mousedown', (e) => {
    resizing = true;
    resizeHandle.classList.add('sidebar-resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!resizing) return;
    const w = Math.max(220, Math.min(400, e.clientX));
    state.sidebarWidth = w;
    document.documentElement.style.setProperty('--sidebar-w', w + 'px');
  });
  document.addEventListener('mouseup', () => {
    if (resizing) {
      resizing = false;
      resizeHandle.classList.remove('sidebar-resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  window.addEventListener('resize', () => {
    closeAllMenus();
  });

  // Drag and drop file import
  const contentEl = document.getElementById('contentScroll');
  contentEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  contentEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const tab = getActiveTab();
    if (!tab || tab.nodeId === 'dashboard') {
      showToast('Cannot drop files directly to the Dashboard', 'info');
      return;
    }
    const parent = fsNodes.get(tab.nodeId);
    if (!parent) return;
    for (const f of files) {
      const ext = f.name.split('.').pop().toLowerCase();
      let type = 'generic';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) type = 'image';
      else if (['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(ext)) type = 'video';
      else if (['mp3', 'ogg', 'flac', 'wav', 'm4a'].includes(ext)) type = 'audio';
      else if (['zip', 'tar', 'gz', 'bz2', '7z', 'rar'].includes(ext)) type = 'archive';
      else if (['js', 'ts', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'rb', 'php', 'sh', 'json', 'yaml', 'yml', 'toml'].includes(ext)) type = 'code';
      else if (['txt', 'md', 'rst'].includes(ext)) type = 'text';
      else if (ext === 'pdf') type = 'pdf';

      const node = createNode({
        name: f.name,
        type: type,
        size: f.size,
        parentId: parent.id,
      });
      parent.children.push(node.id);
    }
    renderAll();
    showToast(`Dropped ${files.length} file${files.length > 1 ? 's' : ''}`, 'success');
  });

  document.documentElement.style.setProperty('--sidebar-w', state.sidebarWidth + 'px');
}

// ============================================================
//  Initialize
// ============================================================

function init() {
  state.homeId = initFilesystem();
  createTab(state.dashboardId); // Open directly to the Dashboard
  initEvents();
  state.viewMode = 'grid';
  renderAll();

  setTimeout(() => {
    showToast('Welcome to Aether Files', 'info');
  }, 400);
}

if (!window.lucide) {
  window.lucide = { createIcons: () => {
    document.querySelectorAll('[data-lucide]').forEach(el => {
      el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle></svg>';
    });
  }};
}

init();
```

### Bullet summary

### State variables & globals
- `TYPE_META` - Lookup table mapping each file `type` to `{icon, class, label}`
  used for rendering icons and the list "Type" column.
- `nextId` - Auto-increment counter for generated node IDs (`n1`, `n2`, ...).
- `fsNodes` - `Map` of nodeId -> node object. Nodes carry `{id, name, type,
  parentId, children, size, modified (Date), meta, expanded}`.
- `state` - App state: `{homeId, dashboardId: 'dashboard', tabs[],
  activeTabId, clipboard, selection (Set), sortBy, sortDir, viewMode,
  searchQuery, sidebarWidth, nextTabId, widgets: {imageGallery:
  {visible, orientation}}}`.
- `propertiesPanelEl` - Currently open properties panel element (or null).
- `GALLERY_IMAGES` - Array of 14 Unsplash photos (`{src, name}`) used by the
  Dashboard image-gallery widget.
- Fallback `window.lucide = {createIcons}` shim defined at the end of the
  script, in case the CDN script fails to load.

### Data structures & mock filesystem
- The filesystem is a flat Map (parent references via `parentId`, children via
  arrays of ids). `initFilesystem()` builds:
  - `root` ("Computer") -> `Home` (expanded) -> Desktop, Documents, Downloads,
    Pictures, Music, Videos, Projects (expanded), `.config`.
  - Documents -> Work (-> Q4 Strategy), Personal, Invoices + files
    (resume.pdf, budget-2024.ods, meeting-notes.md, thesis-draft.docx,
    reading-list.txt, lease-agreement.pdf).
  - Personal -> journal.md, recipes.txt, trip-planning.ods.
  - Downloads -> ubuntu-24.04.iso, firefox-installer.deb, project-archive.zip,
    wallpapers-pack.tar.gz, backup-2024-03.borg, sublime-text_build.deb,
    vim-config.tar.gz.
  - Pictures -> Screenshots / Wallpapers / Photos subfolders + 3 top-level
    images; Screenshots has 4 PNGs; Wallpapers has 4 images.
  - Music -> Playlists folder + 4 audio files.
  - Videos -> 3 video files.
  - Projects -> web-app (-> src + package.json/README.md/tsconfig.json/
    vite.config.ts; src has index.ts/app.tsx/utils.ts/styles.css), dotfiles
    (.bashrc/.gitconfig/.tmux.conf), cli-tool.
  - Desktop -> README.txt, project-links.url, screenshot.png.
  - .config -> nvim/, fish/, gitconfig.
- A special non-folder `dashboard` node (type `'dashboard'`) is the default
  landing tab - its content is rendered by `renderHomeView()` instead of a
  file listing.

### Functions
- *Filesystem*: `createNode(data)`, `randomDate()`, `getChildByName(parentId,
  name)`, `getPath(nodeId)` (returns breadcrumb parts), `findNodeByPath(parts)`,
  `isAncestor(ancestorId, nodeId)`, `initFilesystem()`, `cloneNodeTree(node,
  parent, name)`, `getUniqueName(parent, name)`.
- *Tab management*: `createTab(nodeId)`, `getActiveTab()`, `switchTab(tabId)`,
  `closeTab(tabId)` (re-creates a dashboard tab if all are closed),
  `navigateTo(nodeId)` (pushes history, clears selection + search),
  `goBack()`, `goForward()`, `goUp()`.
- *Sidebar*: `getSidebarSections()` (Favorites + Places), `getStorageItems()`
  (6 storage volumes with status dots), `renderSidebar()` (renders nav
  sections, directory tree, and storage cards; wires click/arrow handlers),
  `renderTreeNode(nodeId, depth, activeNodeId)` (recursive tree renderer
  with folder-only filtering and depth-based padding).
- *Breadcrumb*: `renderBreadcrumb()` - builds crumb trail from `getPath()`.
- *Tab strip*: `renderTabs()` - renders tabs + new-tab button; wires click,
  contextmenu, and close handlers.
- *Content*: `renderContent()` (dispatches to home view, empty state, grid,
  or list), `renderHomeView()` (image-gallery widget), `wireHomeView()`,
  `toggleGalleryOrientation()`, `closeWidget(name)`,
  `getCurrentItems()` (filter + sort, folders-first), `formatSize(bytes)`,
  `formatDate(d)` ("Today/Yesterday/N days ago" or locale date),
  `getFileMeta(node)`, `renderGrid(items)`, `renderList(items, compact)`,
  `wireFileItems()` (selection logic + dblclick + contextmenu + column
  sort), `updateSelectionUI()`, `renderStatusbar()`, `renderSelectionInfo()`,
  `updateActionButtons()` (toggles disabled states + action-bar visibility),
  `updateNavButtons()`, `setViewMode(mode)`, `renderAll()`.
- *Context menus*: `closeAllMenus()`, `positionMenu(menu, x, y, openAbove)`
  (clamps to viewport), `showFileContextMenu(x, y, nodeId)` (Open / Open in
  new tab / Open with... / Copy / Cut / Duplicate / Rename / Properties / Move
  to Trash), `handleFileAction(action, nodeId)`, `showBackgroundContextMenu`
  (New folder/file, Import, Paste, Select all, Refresh, Properties),
  `showSortMenu(x, y, openAbove)` (Sort by Name/Size/Type/Date modified,
  Asc/Desc), `showMoreMenu(x, y)` (Select all, Invert, Open terminal,
  Import, Export, Folder properties), `showTabContextMenu(x, y, tabId)`
  (New tab to the right, Duplicate, Close, Close others).
- *File operations*: `copySelection()`, `cutSelection()`, `pasteClipboard()`
  (handles both copy-with-unique-name and cut-move semantics, skips
  self/ancestor moves), `trashSelection()` (confirms if >= 3 items),
  `doTrash()`, `duplicateNode(nodeId)`, `showRenameDialog(nodeId)`,
  `showNewFolderDialog()`, `showNewFileDialog()`.
- *Properties*: `showProperties(nodeId)` - builds and appends a floating
  `.properties-panel` with type, location, size, modified, dimensions
  (images), item count (folders); wires close button.
- *Dialogs*: `showDialog({title, desc, input, primaryLabel, onPrimary,
  danger})` - generic modal with auto-focus + name-vs-extension selection
  behavior + Enter/Escape handling + backdrop-click dismiss,
  `showConfirmDialog(title, desc, onConfirm)` (wraps `showDialog` with
  `danger: true`).
- *Toasts*: `showToast(message, type)` - pushes a toast that auto-dismisses
  after 2.6 s with a slide-out.
- *Utilities*: `escapeHtml(str)`, `selectAll()`, `triggerFileImport()`
  (opens a hidden multi-file input and infers `type` from extension).
- *Init*: `initEvents()` (wires every static-element listener + keyboard
  shortcuts + sidebar resize + window resize + drag/drop import),
  `init()` (bootstraps filesystem, opens a dashboard tab, calls
  `renderAll()`, shows a welcome toast after 400 ms).

### Event listeners
- *Sidebar*: `.nav-item` click -> navigate or show "illustrative" toast for
  special items; `.tree-arrow` click (stopPropagation) -> toggle expanded;
  `.tree-item` click -> navigate.
- *Tab strip*: `.tab` click -> switchTab (unless close button clicked);
  `.tab` contextmenu -> tab context menu; `.tab-close` click -> closeTab;
  `#newTabBtn` click -> createTab from active tab's nodeId.
- *File items*: click -> selection logic (single / Ctrl-Cmd toggle / Shift
  range / checkbox toggle); dblclick -> navigate (folder) or showProperties
  (file); contextmenu -> ensure selected, then show file context menu.
- *List header columns*: click -> cycle sort (toggle dir if same column,
  else new column asc).
- *Status bar*: `.seg-btn` click -> setViewMode; `#sortBtn` click -> showSortMenu
  opening above the button.
- *Toolbar*: `#backBtn`, `#forwardBtn`, `#upBtn`, `#refreshBtn`; `#searchInput`
  input -> live filter; `#newFolderBtn`, `#newFileBtn`, `#pasteBtn`;
  `#copyBtn`, `#cutBtn`, `#renameBtn`, `#deleteBtn`; `#moreMenuBtn` ->
  showMoreMenu offset to the left.
- *Document keydown*: Ctrl/Cmd + C/X/V/A/T/W; F2 rename; Del trash; Esc
  (closes menu -> properties -> dialog -> clears selection, in priority
  order); Enter opens single-selected; Backspace goes back (skipped when
  typing in an input/textarea). Search box Esc clears & blurs.
- *Document click*: dismiss any open context menu if click is outside.
- *`#contentScroll` contextmenu*: show background menu (ignored when
  targeting a file item, list header, or widget box).
- *Sidebar resize*: `mousedown` on handle starts resizing (cursor + user-
  select set); `mousemove` clamps width to 220-400 px and updates the
  `--sidebar-w` CSS variable live; `mouseup` ends resizing.
- *Window resize*: `closeAllMenus()`.
- *Drag & drop*: `dragover` prevents default + sets `dropEffect = copy`;
  `drop` infers file types from extensions and creates new nodes under the
  active folder (rejects drops onto the Dashboard).
- *Dialog*: input Enter triggers primary; Escape closes; backdrop click
  closes; primary button click triggers `onPrimary`.
- *Toast*: `setTimeout` fades out and removes after 2.6 s.

### Interactions
- **Selection**: click selects single; Ctrl/Cmd toggles; Shift range-selects
  from the last-selected to the clicked item; clicking the per-item checkbox
  toggles without affecting others; "Select all" and "Invert selection"
  from menus; Escape clears (when no overlays are open).
- **Navigation**: sidebar Favorites/Places, sidebar tree, breadcrumb crumbs,
  double-clicking a folder, Enter on a single-selected folder, Back/Forward
  history, Up one level. Each navigation resets search and selection for
  the tab.
- **Context menus**: file (open / open in new tab / open with... / copy / cut /
  duplicate / rename / properties / trash), background (new folder / new file
  / import / paste / select all / refresh / properties), sort (by name, size,
  type, modified; asc/desc), more (select all / invert / terminal / import /
  export / folder properties), tab (new tab to the right / duplicate / close
  / close others).
- **Dialogs**: rename, new folder, new file (all auto-focus the input and
  pre-select the name portion before the extension), and a confirm-trash
  dialog shown only when 3+ items are being trashed.
- **Drag & drop**: native file drag onto the content area imports files with
  extension-based type detection (images, video, audio, archive, code, text,
  pdf, doc, sheet, app, generic).
- **View switching**: grid / list / compact via the segmented control in the
  status bar; compact mode shrinks row height and icon size.
- **Search**: live filter on input; resets on tab switch or navigation;
  Escape inside the search box clears and blurs.
- **Sort**: list header columns are clickable (toggle direction if same
  column); the status bar sort button opens a sort menu (also accessible
  above the button); folders always sort first.
- **Sidebar resize**: 220-400 px range, live-updates `--sidebar-w`.
- **Properties panel**: opens via double-click on a non-folder file or via
  the "Properties" menu items; closeable via the X button or Escape.
- **Toasts**: success / error / info variants, auto-dismiss after 2.6 s.
- **Tab management**: new tab via the `+` button, Ctrl+T, or tab context
  menu; close via the X, Ctrl+W, or tab context menu; "close others" leaves
  only the right-clicked tab; if all tabs close, a fresh dashboard tab is
  auto-created.
- **Clipboard**: Copy/Cut store `state.clipboard = {mode, ids}`; Paste
  duplicates (copy mode, with `(copy N)` unique-name generation) or moves
  (cut mode, splicing out of the old parent's children and appending to
  the destination); cut mode clears the clipboard after pasting; self/
  ancestor destinations are skipped.
- **Trash**: removes the selected ids from the current parent's children
  array; shows a confirmation dialog when >= 3 items are selected.
- **Dashboard widget**: image-gallery widget supports orientation toggle
  (vertical masonry <-> horizontal scroll), refresh (re-renders), and close
  (replaces the widget with an empty-state placeholder).

