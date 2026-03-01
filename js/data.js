const DEData = {
    layouts: ['float', 'spiral', 'tree', 'horizontal'],
    workspaceThemeData: [
        '#8a0000',
        '#24283b',
        '#1b4332',
        '#fdfcdc',
        '#3a0ca3',
        '#495057',
        '#8a0000',
        '#24283b',
        '#1b4332'
    ],
    workspaceLayouts: [0, 1, 2, 3, 0, 1, 2, 3, 0],
    workspaceLightModes: [false, false, true, false, false, false, true, false, false],
    workspaceThemeNames: [
        'Midnight', 'Cyberpunk', 'Deep', 'Sunny', 'Berry', 'Minimal', 'Midnight', 'Cyberpunk', 'Deep'
    ],
    currentWorkspaceIndex: 1,
    maxZIndex: 1000,
    isDesktopVisible: true,
    isStartMenuOpen: false,
    isThemePopupOpen: false
};

const themes = [
    { name: 'Midnight', color: '#24283b' },
    { name: 'Cyberpunk', color: '#1a0b1a' },
    { name: 'Deep', color: '#1b4332' },
    { name: 'Sunny', color: '#fdfcdc' },
    { name: 'Berry', color: '#3a0ca3' },
    { name: 'Minimal', color: '#495057' }
];

window.DEData = DEData;
window.themes = themes;
