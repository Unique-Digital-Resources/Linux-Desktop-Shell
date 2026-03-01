function getLayoutIconHTML(layoutName) {
    const activeClass = 'solid'; 
    if (layoutName === 'float') {
        return `<div class="mini-win-container mini-float"><div class="m-win m-1"></div><div class="m-win m-2 ${activeClass}"></div></div>`;
    } else if (layoutName === 'spiral') {
        return `<div class="mini-win-container mini-spiral"><div class="m-win ${activeClass}"></div><div class="m-win"></div><div class="m-win"></div></div>`;
    } else if (layoutName === 'tree') {
        return `<div class="mini-win-container mini-tree"><div class="m-win m-left ${activeClass}"></div><div class="m-win m-right"><div class="m-win"></div><div class="m-win"></div></div></div>`;
    } else if (layoutName === 'horizontal') {
        return `<div class="mini-win-container mini-h"><div class="m-win ${activeClass}"></div><div class="m-win"></div><div class="m-win"></div></div>`;
    }
    return '';
}

function updateLayoutUI(layoutName) {
    const layoutIndicator = document.getElementById('layout-indicator');
    if (layoutIndicator) {
        layoutIndicator.innerHTML = getLayoutIconHTML(layoutName);
    }
}

function nextLayout() {
    let currentLayout = DEData.workspaceLayouts[DEData.currentWorkspaceIndex - 1];
    let nextLayout = (currentLayout + 1) % DEData.layouts.length;
    DEData.workspaceLayouts[DEData.currentWorkspaceIndex - 1] = nextLayout;
    
    const layoutName = DEData.layouts[nextLayout];
    const activeWs = document.getElementById(`ws-${DEData.currentWorkspaceIndex}`);
    
    if (activeWs) {
        DEData.layouts.forEach(l => activeWs.classList.remove(`layout-${l}`));
        activeWs.classList.add(`layout-${layoutName}`);
    }
    updateLayoutUI(layoutName);
}

function initWMLayout() {
    const layoutIndicator = document.getElementById('layout-indicator');
    if (layoutIndicator) {
        layoutIndicator.addEventListener('click', (e) => {
            e.stopPropagation();
            nextLayout();
        });
    }
}

window.getLayoutIconHTML = getLayoutIconHTML;
window.updateLayoutUI = updateLayoutUI;
window.nextLayout = nextLayout;
window.initWMLayout = initWMLayout;
