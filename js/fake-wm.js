function attachWindowEvents(win) {
    const selectWindow = () => {
        if (win.classList.contains('minimized')) {
            win.classList.remove('minimized');
        }

        DEData.maxZIndex++;
        win.style.zIndex = DEData.maxZIndex;
        document.querySelectorAll('.window').forEach(w => w.classList.remove('active-win'));
        win.classList.add('active-win');
        if (typeof updateFirefoxIndicator === 'function') {
            updateFirefoxIndicator();
        }
    };

    win.addEventListener('mousedown', () => {
        selectWindow();
    });

    const closeBtn = win.querySelector('.win-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            win.remove();
            if (typeof updateFirefoxIndicator === 'function') {
                updateFirefoxIndicator();
            }
        });
    }

    const minBtn = win.querySelector('.win-min');
    if (minBtn) {
        minBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            win.classList.toggle('minimized');
            if (win.classList.contains('minimized')) {
                win.classList.remove('active-win');
            } else {
                selectWindow();
            }
            if (typeof updateFirefoxIndicator === 'function') {
                updateFirefoxIndicator();
            }
        });
    }

    const header = win.querySelector('.window-header');
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', (e) => {
        if (win.classList.contains('minimized')) return;

        const container = win.closest('.ws-container');
        if (!container.classList.contains('layout-float')) return;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = win.getBoundingClientRect();
        const parentRect = container.getBoundingClientRect();
        
        initialLeft = rect.left - parentRect.left;
        initialTop = rect.top - parentRect.top;

        win.style.transition = 'none';

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        win.style.left = `${initialLeft + dx}px`;
        win.style.top = `${initialTop + dy}px`;
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

function createWindow(title, content, parentId, top = '60px', left = '60px', zIndex = 100, stateClass = '') {
    const container = document.getElementById(parentId);
    if (!container) return;
    
    const win = document.createElement('div');
    win.className = `window ${stateClass}`;
    win.style.top = top;
    win.style.left = left;
    win.style.zIndex = zIndex;
    
    win.innerHTML = `
        <div class="window-header">
            <div class="win-btn win-close" title="Close"></div>
            <div class="win-btn win-min" title="Minimize"></div>
            <div class="win-btn win-max"></div>
            <div class="win-title">${title}</div>
        </div>
        <div class="window-content">${content}</div>
    `;
    
    container.appendChild(win);
    attachWindowEvents(win);
    if (typeof updateFirefoxIndicator === 'function') {
        updateFirefoxIndicator();
    }
}

function initWindows() {
    createWindow("System Terminal", "user@linux:~$ sudo apt update<br>Hit:1 http://... [In Progress]<br>Reading package lists... Done", "ws-1", "50px", "50px", 100, "state-error");
    createWindow("Web Browser", "<div style='height:100%; width:100%; background:#fff; color:#333; display:flex; align-items:center; justify-content:center; flex-direction:column;'>Google<div style='border-bottom:1px solid #ddd; width:100%; height:30px;'></div><div style='display:flex; gap:10px; width:100%;'><div style='width:100%; height:8px; background:#eee; border-radius:4px;'></div><div style='width:50px; height:8px; background:#ddd; border-radius:4px;'></div></div></div>", "ws-1", "150px", "450px", 101);
    createWindow("File Explorer", "<div style='display:flex; flex-direction:column; height:100%;'><div style='padding:5px; border-bottom:1px solid rgba(255,255,255,0.1);'>/home/user/Desktop</div><div style='display:flex; flex-wrap:wrap; gap:15px; padding:15px;'><div style='width:60px; text-align:center;'><i class='mdi mdi-folder' style='font-size:40px; color:#ffccbc;'></i><div>Work</div></div><div style='width:60px; text-align:center;'><i class='mdi mdi-folder' style='font-size:40px; color:#ffccbc;'></i><div>Photos</div></div><div style='width:60px; text-align:center;'><i class='mdi mdi-check-circle' style='font-size:40px; color:#27c93f;'></i><div>Done!</div></div></div></div>", "ws-1", "100px", "200px", 102, "state-success");
    createWindow("Downloads", "<div style='padding:10px; color:#fff;'>Downloading <b>ubuntu-24.04.iso</b><br><br><div style='width:100%; background:#333; height:20px; border-radius:10px; overflow:hidden;'><div style='width:60%; background:#2196f3; height:100%;'></div></div><br><small>2.4 GB / 4.0 GB</small></div>", "ws-1", "80px", "250px", 103, "state-busy");
}

window.attachWindowEvents = attachWindowEvents;
window.createWindow = createWindow;
window.initWindows = initWindows;
