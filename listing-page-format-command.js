// Github URL: listing-page-format-command.js
(function() {
    'use strict';

    if (window.immoCmdLoaded) return;
    window.immoCmdLoaded = true;

    // 1. Persistent State Management
    let upgrades = JSON.parse(localStorage.getItem('immo_cmd_up') || "[]");
    let downgrades = JSON.parse(localStorage.getItem('immo_cmd_down') || "[]");
    let isAutoRunning = localStorage.getItem('immo_cmd_running') === 'true';
    let isPaused = localStorage.getItem('immo_cmd_paused') === 'true';

    // 2. Initial Parse from URL (Only if not already in a process)
    if (!isAutoRunning && !isPaused) {
        let searchStr = window.location.search;
        const savedSearch = sessionStorage.getItem('immo_helper_search_command');
        if (savedSearch) searchStr = savedSearch;

        const queryParams = searchStr.replace('?', '').split('&');
        let currentMode = 'upgrade';

        queryParams.forEach(param => {
            const decoded = decodeURIComponent(param);
            if (decoded.startsWith('upgrade=')) {
                currentMode = 'upgrade';
                upgrades.push(decoded.split('=')[1]);
            } else if (decoded.startsWith('downgrade=')) {
                currentMode = 'downgrade';
                downgrades.push(decoded.split('=')[1]);
            } else if (/^\d{6,9}$/.test(decoded)) {
                if (currentMode === 'upgrade') upgrades.push(decoded);
                else downgrades.push(decoded);
            }
        });

        upgrades = [...new Set(upgrades)];
        downgrades = [...new Set(downgrades)];

        if (upgrades.length > 0 || downgrades.length > 0) {
            localStorage.setItem('immo_cmd_up', JSON.stringify(upgrades));
            localStorage.setItem('immo_cmd_down', JSON.stringify(downgrades));
        }
    }

    if (upgrades.length === 0 && downgrades.length === 0) {
        localStorage.removeItem('immo_cmd_running');
        localStorage.removeItem('immo_cmd_paused');
        window.immoCmdLoaded = false;
        return;
    }

    // 3. UI Styles (550px Wide, Professional Dark Mode)
    const style = document.createElement('style');
    style.textContent = `
        #immo-cmd-center {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 100000; background: #1a1a1a; border-radius: 12px;
            border: 1px solid #333; box-shadow: 0 20px 50px rgba(0,0,0,0.9);
            font-family: system-ui, sans-serif; width: 550px;
            display: flex; flex-direction: column; overflow: hidden; user-select: none;
        }
        #immo-cmd-header { cursor: grab; background: #2a2a2a; padding: 14px 20px; color: white; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; }
        #immo-cmd-close { cursor: pointer; font-size: 20px; color: #888; font-weight: bold; }
        #immo-cmd-content { padding: 25px; color: #e0e0e0; }
        .immo-section-title { font-size: 11px; font-weight: 800; color: #888; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1.5px; }
        .immo-id-tag { display: inline-block; background: #252525; color: #fff; padding: 5px 12px; border-radius: 4px; font-family: monospace; font-size: 13px; margin: 0 6px 6px 0; border: 1px solid #444; }
        .tag-up { border-left: 3px solid #62c462; color: #a3dca3; }
        .tag-down { border-left: 3px solid #ef4444; color: #fca5a5; }
        
        #immo-controls { display: flex; width: 100%; border-top: 1px solid #333; }
        .immo-ctrl-btn { flex: 1; padding: 18px; border: none; font-weight: 800; font-size: 14px; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 1px; }
        
        #immo-apply-all { background: #2e7d32; color: white; }
        #immo-apply-all:hover { background: #388e3c; }
        #immo-apply-all:disabled { background: #333; color: #666; cursor: wait; }
        
        #immo-pause-btn { background: #333; color: #fff; border-left: 1px solid #444; display: none; }
        #immo-pause-btn:hover { background: #444; }
        #immo-pause-btn.active { background: #92400e; color: #fff; }

        #immo-status-bar { font-size: 12px; color: #62c462; text-align: center; margin-top: 10px; font-weight: 600; min-height: 15px; }
    `;
    document.head.appendChild(style);

    const cmd = document.createElement('div');
    cmd.id = 'immo-cmd-center';
    
    let upHtml = upgrades.length > 0 ? `<div style="margin-bottom:20px"><div class="immo-section-title">Pending Upgrades (${upgrades.length})</div><div>${upgrades.map(id => `<span class="immo-id-tag tag-up">${id}</span>`).join('')}</div></div>` : '';
    let downHtml = downgrades.length > 0 ? `<div style="margin-bottom:20px"><div class="immo-section-title">Pending Downgrades (${downgrades.length})</div><div>${downgrades.map(id => `<span class="immo-id-tag tag-down">${id}</span>`).join('')}</div></div>` : '';

    cmd.innerHTML = `
        <div id="immo-cmd-header"><strong>Format Command Center</strong><span id="immo-cmd-close">&#x2715;</span></div>
        <div id="immo-cmd-content">${upHtml}${downHtml}<div id="immo-status-bar">Ready</div></div>
        <div id="immo-controls">
            <button id="immo-apply-all" class="immo-ctrl-btn">Start Processing</button>
            <button id="immo-pause-btn" class="immo-ctrl-btn">Pause</button>
        </div>
    `;
    document.body.appendChild(cmd);

    const applyBtn = document.getElementById('immo-apply-all');
    const pauseBtn = document.getElementById('immo-pause-btn');
    const statusBar = document.getElementById('immo-status-bar');

    async function runAutoCycle() {
        if (localStorage.getItem('immo_cmd_paused') === 'true') {
            statusBar.innerText = "Paused";
            return;
        }

        applyBtn.disabled = true;
        pauseBtn.style.display = "block";
        let foundOnThisPage = false;

        for (let i = upgrades.length - 1; i >= 0; i--) {
            if (localStorage.getItem('immo_cmd_paused') === 'true') return;
            const id = upgrades[i];
            const btn = document.querySelector(`a[onclick*="chListingFeat('${id}'"][onclick*="2)"]`);
            if (btn) {
                statusBar.innerText = `Upgrading ${id}...`;
                btn.click();
                upgrades.splice(i, 1);
                foundOnThisPage = true;
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        for (let i = downgrades.length - 1; i >= 0; i--) {
            if (localStorage.getItem('immo_cmd_paused') === 'true') return;
            const id = downgrades[i];
            const btn = document.querySelector(`a[onclick*="chListingFeat('${id}'"][onclick*="0)"]`);
            if (btn) {
                statusBar.innerText = `Downgrading ${id}...`;
                btn.click();
                downgrades.splice(i, 1);
                foundOnThisPage = true;
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        localStorage.setItem('immo_cmd_up', JSON.stringify(upgrades));
        localStorage.setItem('immo_cmd_down', JSON.stringify(downgrades));

        if (upgrades.length === 0 && downgrades.length === 0) {
            statusBar.innerText = "All tasks complete";
            applyBtn.innerHTML = "Finished";
            applyBtn.style.background = "#444";
            localStorage.removeItem('immo_cmd_running');
            localStorage.removeItem('immo_cmd_paused');
            setTimeout(() => cmd.remove(), 2500);
            return;
        }

        statusBar.innerText = "Searching next page...";
        const currentPageMatch = window.location.pathname.match(/index(\d+)\.html/);
        const nextPageIndex = currentPageMatch ? parseInt(currentPageMatch[1]) + 1 : 2;
        
        if (nextPageIndex > 20) {
            statusBar.innerText = "Page limit reached";
            localStorage.removeItem('immo_cmd_running');
            return;
        }

        setTimeout(() => {
            if (localStorage.getItem('immo_cmd_paused') === 'true') return;
            window.location.href = window.location.pathname.replace(/index\d*\.html|$/, `index${nextPageIndex}.html`);
        }, 2000);
    }

    applyBtn.onclick = () => {
        localStorage.setItem('immo_cmd_running', 'true');
        localStorage.setItem('immo_cmd_paused', 'false');
        applyBtn.innerText = "Processing...";
        runAutoCycle();
    };

    pauseBtn.onclick = () => {
        const currentlyPaused = localStorage.getItem('immo_cmd_paused') === 'true';
        if (currentlyPaused) {
            localStorage.setItem('immo_cmd_paused', 'false');
            pauseBtn.innerText = "Pause";
            pauseBtn.classList.remove('active');
            runAutoCycle();
        } else {
            localStorage.setItem('immo_cmd_paused', 'true');
            pauseBtn.innerText = "Resume";
            pauseBtn.classList.add('active');
            statusBar.innerText = "Paused";
        }
    };

    if (isAutoRunning) {
        applyBtn.disabled = true;
        applyBtn.innerText = "Processing...";
        pauseBtn.style.display = "block";
        if (isPaused) {
            pauseBtn.innerText = "Resume";
            pauseBtn.classList.add('active');
            statusBar.innerText = "Paused";
        } else {
            setTimeout(runAutoCycle, 2500);
        }
    }

    document.getElementById('immo-cmd-close').onclick = () => {
        localStorage.removeItem('immo_cmd_running');
        localStorage.removeItem('immo_cmd_paused');
        localStorage.removeItem('immo_cmd_up');
        localStorage.removeItem('immo_cmd_down');
        cmd.remove();
        window.immoCmdLoaded = false;
    };
    
    let offsetX, offsetY, isDragging = false;
    const header = document.getElementById('immo-cmd-header');
    header.onmousedown = (e) => {
        isDragging = true;
        const rect = cmd.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        cmd.style.transform = 'none';
        cmd.style.left = rect.left + 'px';
        cmd.style.top = rect.top + 'px';
        cmd.style.position = 'fixed';
        cmd.style.margin = '0';
    };
    window.onmousemove = (e) => { if (isDragging) { cmd.style.left = (e.clientX - offsetX) + 'px'; cmd.style.top = (e.clientY - offsetY) + 'px'; }};
    window.onmouseup = () => isDragging = false;
})();
