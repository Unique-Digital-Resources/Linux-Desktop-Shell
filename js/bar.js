function initBar() {
    const desktopBox = document.getElementById('desktop-box');
    const eyeIcon = document.getElementById('eye-icon');
    const toggleBtn = document.getElementById('toggle-desktop-btn');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            DEData.isDesktopVisible = !DEData.isDesktopVisible;
            if (DEData.isDesktopVisible) {
                desktopBox.classList.remove('hidden');
                eyeIcon.classList.remove('mdi-eye-off');
                eyeIcon.classList.add('mdi-eye-outline');
            } else {
                desktopBox.classList.add('hidden');
                eyeIcon.classList.remove('mdi-eye-outline');
                eyeIcon.classList.add('mdi-eye-off');
            }
        });
    }
}

function initDock() {
    const startBtn = document.getElementById('start-btn');
    const startMenu = document.getElementById('start-menu');
    
    if (startBtn && startMenu) {
        startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            DEData.isStartMenuOpen = !DEData.isStartMenuOpen;
            if (DEData.isStartMenuOpen) {
                startMenu.classList.add('visible');
            } else {
                startMenu.classList.remove('visible');
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (DEData.isStartMenuOpen && !startMenu.contains(e.target) && !startBtn.contains(e.target)) {
                DEData.isStartMenuOpen = false;
                startMenu.classList.remove('visible');
            }
        });
    }
}

window.initBar = initBar;
window.initDock = initDock;
