function applyDarkLightMode(isLightMode) {
    const toggleIcon = document.getElementById('toggleIcon');
    const customToggle = document.getElementById('customToggle');
    
    if (!customToggle) return;
    
    if(isLightMode) {
        customToggle.classList.add('active');
        if (toggleIcon) {
            toggleIcon.classList.remove('mdi-white-balance-sunny');
            toggleIcon.classList.add('mdi-weather-night');
        }
        document.documentElement.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.5)');
        document.documentElement.style.setProperty('--glass-border', 'rgba(0, 0, 0, 0.1)');
        const dock = document.getElementById('dock-container');
        if (dock) dock.style.background = 'rgba(255,255,255,0.4)';
    } else {
        customToggle.classList.remove('active');
        if (toggleIcon) {
            toggleIcon.classList.remove('mdi-weather-night');
            toggleIcon.classList.add('mdi-white-balance-sunny');
        }
        document.documentElement.style.setProperty('--glass-bg', 'rgba(30, 30, 30, 0.4)');
        document.documentElement.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.1)');
        const dock = document.getElementById('dock-container');
        if (dock) dock.style.background = 'rgba(255, 255, 255, 0.15)';
    }
}

function updateTriggerButtonFromData(color, name) {
    const themeTriggerBtn = document.getElementById('themeTriggerBtn');
    const themeListItems = document.querySelectorAll('.lang-item');
    if (!themeTriggerBtn) return;
    
    const matchingItem = Array.from(themeListItems).find(i => i.getAttribute('data-color') === color);
    if(matchingItem) {
        const preview = matchingItem.querySelector('.color-plate-preview');
        const clone = preview.cloneNode(true);
        themeTriggerBtn.innerHTML = '';
        themeTriggerBtn.appendChild(clone);
    } else {
        themeTriggerBtn.style.backgroundColor = color;
    }
}

function syncThemeListSelection(color) {
    const items = document.querySelectorAll('.lang-item');
    items.forEach(item => {
        if(item.getAttribute('data-color').toLowerCase() === color.toLowerCase()) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function initThemes() {
    const themeWidget = document.getElementById('themeWidget');
    const themeTriggerBtn = document.getElementById('themeTriggerBtn');
    const themePopupMenu = document.getElementById('themePopupMenu');
    const themeListItems = document.querySelectorAll('.lang-item');
    const customToggle = document.getElementById('customToggle');

    if (!themeTriggerBtn || !themePopupMenu) return;

    function initTheme() {
        const currentColor = DEData.workspaceThemeData[DEData.currentWorkspaceIndex - 1];
        const currentName = DEData.workspaceThemeNames[DEData.currentWorkspaceIndex - 1];
        updateTriggerButtonFromData(currentColor, currentName);
        syncThemeListSelection(currentColor);
    }
    initTheme();

    themeTriggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        DEData.isThemePopupOpen = !DEData.isThemePopupOpen;
        if(DEData.isThemePopupOpen) {
            themePopupMenu.style.display = 'flex';
            syncThemeListSelection(DEData.workspaceThemeData[DEData.currentWorkspaceIndex - 1]);
        } else {
            themePopupMenu.style.display = 'none';
        }
    });

    document.addEventListener('mousedown', (e) => {
        if(DEData.isThemePopupOpen && !themePopupMenu.contains(e.target) && !themeTriggerBtn.contains(e.target)) {
            DEData.isThemePopupOpen = false;
            themePopupMenu.style.display = 'none';
        }
    });

    themeListItems.forEach(item => {
        item.addEventListener('click', () => {
            themeListItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            
            const colorData = item.getAttribute('data-color');
            const nameData = item.getAttribute('data-name');
            
            DEData.workspaceThemeData[DEData.currentWorkspaceIndex - 1] = colorData;
            DEData.workspaceThemeNames[DEData.currentWorkspaceIndex - 1] = nameData;
            
            updateTriggerButtonFromData(colorData, nameData);
            document.documentElement.style.setProperty('--bg-color', colorData);
            document.documentElement.style.setProperty('--accent-color', colorData);

            DEData.isThemePopupOpen = false;
            themePopupMenu.style.display = 'none';
        });
    });

    if (customToggle) {
        customToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            DEData.workspaceLightModes[DEData.currentWorkspaceIndex - 1] = !DEData.workspaceLightModes[DEData.currentWorkspaceIndex - 1];
            const isLight = DEData.workspaceLightModes[DEData.currentWorkspaceIndex - 1];
            applyDarkLightMode(isLight);
        });
    }
}

window.applyDarkLightMode = applyDarkLightMode;
window.updateTriggerButtonFromData = updateTriggerButtonFromData;
window.initThemes = initThemes;
