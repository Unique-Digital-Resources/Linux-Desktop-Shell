function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const timeEl = document.getElementById('clock-time');
    const dayEl = document.getElementById('clock-day');
    const dateEl = document.getElementById('clock-date');
    
    if (timeEl) timeEl.textContent = `${hours}:${minutes} ${ampm}`;
    if (dayEl) dayEl.textContent = days[now.getDay()];
    if (dateEl) dateEl.textContent = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

function initStatus() {
    updateClock();
    setInterval(updateClock, 1000);
}

window.initStatus = initStatus;
