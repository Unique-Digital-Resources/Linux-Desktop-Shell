function setWallpaper(url) {
    const desktop = document.getElementById('desktop');
    if (desktop && url) {
        desktop.style.backgroundImage = `url('${url}')`;
    }
}

function loadDefaultWallpaper() {
    const desktop = document.getElementById('desktop');
    if (desktop) {
        const currentBg = desktop.style.backgroundImage;
        if (!currentBg || currentBg === 'none') {
            desktop.style.backgroundImage = "url('https://picsum.photos/seed/redwallpaper/1920/1080')";
        }
    }
}

window.setWallpaper = setWallpaper;
window.loadDefaultWallpaper = loadDefaultWallpaper;
