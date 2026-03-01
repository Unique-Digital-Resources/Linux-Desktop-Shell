function switchWorkspace(index) {
    DEData.currentWorkspaceIndex = index;
    
    const wsDots = document.querySelectorAll('.ws-dot');
    const wsContainers = document.querySelectorAll('.ws-container');
    
    wsDots.forEach(d => d.classList.remove('active'));
    wsDots[index-1].classList.add('active'); 
    
    wsContainers.forEach(c => c.classList.remove('active'));
    const target = document.getElementById(`ws-${index}`);
    if(target) target.classList.add('active');

    const layoutIndex = DEData.workspaceLayouts[index - 1];
    const layoutName = DEData.layouts[layoutIndex];
    DEData.layouts.forEach(l => target.classList.remove(`layout-${l}`));
    target.classList.add(`layout-${layoutName}`);
    if (typeof updateLayoutUI === 'function') updateLayoutUI(layoutName);

    const wsColor = DEData.workspaceThemeData[index - 1];
    const wsName = DEData.workspaceThemeNames[index - 1];
    
    document.documentElement.style.setProperty('--bg-color', wsColor);
    document.documentElement.style.setProperty('--accent-color', wsColor);
    if (typeof updateTriggerButtonFromData === 'function') {
        updateTriggerButtonFromData(wsColor, wsName);
    }
    if (typeof syncThemeListSelection === 'function') {
        syncThemeListSelection(wsColor);
    }

    const isLight = DEData.workspaceLightModes[index - 1];
    if (typeof applyDarkLightMode === 'function') {
        applyDarkLightMode(isLight);
    }
}

function nextWorkspace() {
    let next = DEData.currentWorkspaceIndex + 1;
    if (next > 9) next = 1;
    switchWorkspace(next);
}

function prevWorkspace() {
    let prev = DEData.currentWorkspaceIndex - 1;
    if (prev < 1) prev = 9;
    switchWorkspace(prev);
}

function initWorkspaces() {
    const wsDots = document.querySelectorAll('.ws-dot');
    const wsWidget = document.querySelector('.workspace-widget');
    
    wsDots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            switchWorkspace(parseInt(dot.dataset.ws));
        });
    });

    if (wsWidget) {
        wsWidget.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY > 0) nextWorkspace();
            else prevWorkspace();
        });
    }
    
    switchWorkspace(1);
}

window.switchWorkspace = switchWorkspace;
window.nextWorkspace = nextWorkspace;
window.prevWorkspace = prevWorkspace;
window.initWorkspaces = initWorkspaces;
