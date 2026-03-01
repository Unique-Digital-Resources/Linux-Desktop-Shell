function initDesktopGrid() {
    const slider = document.getElementById('waveSlider');
    const trackStack = document.getElementById('waveTrackStack');
    const startTimeEl = document.getElementById('startTime');
    const endTimeEl = document.getElementById('endTime');
    const totalDurationSeconds = 225;

    if (slider && trackStack) {
        function formatTime(seconds) {
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return `${m}:${s.toString().padStart(2, '0')}`;
        }

        function updateWave() {
            const val = slider.value;
            trackStack.style.setProperty('--progress', val + '%');
            if (startTimeEl) startTimeEl.textContent = formatTime((val / 100) * totalDurationSeconds);
            if (endTimeEl) endTimeEl.textContent = formatTime(totalDurationSeconds);
        }
        
        updateWave();
        slider.addEventListener('input', updateWave);
    }

    const clipItems = document.querySelectorAll('.clip-item');
    clipItems.forEach(item => {
        item.addEventListener('click', function() {
            clipItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            const img = this.querySelector('img');
            const currentClipImg = document.getElementById('current-clip-img');
            if (img && currentClipImg) {
                currentClipImg.src = img.src;
            }
        });
    });

    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.style.transform = 'scale(0.9)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });

    const galleryItems = document.querySelectorAll('.gallery-item');
    galleryItems.forEach(item => {
        item.addEventListener('click', function() {
            galleryItems.forEach(i => i.style.transform = '');
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });

    const shortcuts = document.querySelectorAll('.shortcut');
    shortcuts.forEach(shortcut => {
        shortcut.addEventListener('click', function() {
            shortcuts.forEach(s => s.style.background = '');
            this.style.background = 'rgba(255,255,255,0.2)';
            setTimeout(() => {
                this.style.background = '';
            }, 150);
        });
    });

    const controlBtns = document.querySelectorAll('.control-btn');
    controlBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.classList.contains('play-btn')) {
                const icon = this.querySelector('i');
                if (icon) {
                    if (icon.classList.contains('mdi-play')) {
                        icon.classList.remove('mdi-play');
                        icon.classList.add('mdi-pause');
                    } else {
                        icon.classList.remove('mdi-pause');
                        icon.classList.add('mdi-play');
                    }
                }
            }
        });
    });
}

window.initDesktopGrid = initDesktopGrid;
