function updateFirefoxIndicator() {
    const windows = Array.from(document.querySelectorAll('.window'));
    const container = document.querySelector('.app-indicator');
    if (!container) return;
    container.innerHTML = '';

    const count = windows.length;
    if (count === 0) return;

    const radius = 14;
    const circumference = 2 * Math.PI * radius;
    const visualGap = 4;

    let dash;
    const segmentLength = circumference / count;
    
    if (count === 1) {
        dash = circumference;
    } else {
        dash = segmentLength - visualGap;
    }

    windows.forEach((win, index) => {
        let color = 'rgba(255,255,255,0.3)'; 
        
        if (win.classList.contains('minimized')) {
            color = 'rgba(0,0,0,0.7)'; 
        } else if (win.classList.contains('state-error')) {
            color = '#ff5f56'; 
        } else if (win.classList.contains('state-success')) {
            color = '#27c93f'; 
        } else if (win.classList.contains('state-busy')) {
            color = '#2196f3'; 
        } else if (win.classList.contains('active-win')) {
            color = '#ffffff'; 
        }

        const offset = -(index * segmentLength);

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", "16");
        circle.setAttribute("cy", "16");
        circle.setAttribute("r", "14");
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke", color);
        circle.setAttribute("stroke-width", "2");
        circle.setAttribute("stroke-linecap", "butt");
        
        const remainder = circumference - dash;
        circle.setAttribute("stroke-dasharray", `${dash} ${remainder}`);
        
        circle.setAttribute("stroke-dashoffset", offset);

        container.appendChild(circle);
    });
}

window.updateFirefoxIndicator = updateFirefoxIndicator;
