function initStartMenu() {
    const startTabs = document.querySelectorAll('.start-tab');
    const startTabContents = document.querySelectorAll('.start-tab-content');
    
    startTabs.forEach((tab, index) => {
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            
            startTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            startTabContents.forEach(c => c.classList.remove('active'));
            startTabContents[index].classList.add('active');
        });
    });
    
    const wifiBtn = document.querySelector('.wifi-select-btn');
    const wifiOptions = document.querySelector('.wifi-options');
    if (wifiBtn && wifiOptions) {
        wifiBtn.addEventListener('click', () => {
            wifiOptions.classList.toggle('visible');
        });
    }

    const bluetoothSwitch = document.querySelector('.bluetooth-toggle-switch');
    if (bluetoothSwitch) {
        bluetoothSwitch.addEventListener('click', () => {
            bluetoothSwitch.classList.toggle('off');
        });
    }
}

window.initStartMenu = initStartMenu;
