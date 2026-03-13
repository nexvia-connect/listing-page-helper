// Github URL: listing-page-format-command.js
(function() {
    'use strict';

    if (window.immoCmdLoaded) return;
    window.immoCmdLoaded = true;

    // 1. Persistent State Management (using localStorage to survive redirects)
    let upgrades = JSON.parse(localStorage.getItem('immo_cmd_up') || "[]");
    let downgrades = JSON.parse(localStorage.getItem('immo_cmd_down') || "[]");
    let isAutoRunning = localStorage.getItem('immo_cmd_running') === 'true';

    // 2. Initial Parse from URL (Only if not already auto-running)
    if (!isAutoRunning) {
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

        // Deduplicate
        upgrades = [...new Set(upgrades)];
        downgrades = [...new Set(downgrades)];

        if (upgrades.length > 0 || downgrades.length > 0) {
            localStorage.setItem('immo_cmd_up', JSON.stringify(upgrades));
            localStorage.setItem('immo_cmd_down', JSON.stringify(downgrades));
        }
    }

    if (upgrades.length === 0 && downgrades.length === 0) {
        localStorage.removeItem('immo_cmd_running');
        window.immoCmdLoaded = false;
        return;
    }

    // 3. UI Styles (550px Wide, Dark Mode)
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
        #immo-apply-all {
            width: 100%; padding: 18px; background: #2e7d32; color: white;
            border: none; border-radius: 0 0 12px 12px; font-weight: 800;
            font-size: 15px; cursor: pointer; transition: all 0.2s; text-transform: uppercase;
        }
        #immo-apply-all:disabled { background: #333; color: #666; cursor: wait; }
        #immo-status-bar { font-size: 12px; color: #62c462; text-align: center; margin-top: 10px; font-weight: 600; min-height: 15px; }
    `;
    document.head.appendChild(style);

    const cmd = document.createElement('div');
    cmd.id = 'immo-cmd-center';
    
    let upHtml = upgrades.length > 0 ? `<div style="margin-bottom:20px"><div class="immo-section-title">🚀 Pending Upgrades (${upgrades.length})</div><div>${upgrades.map(id => `<span class="immo-id-tag tag-up">${id}</span>`).join('')}</div></div>` : '';
    let downHtml = downgrades.length > 0 ? `<div style="margin-bottom:20px"><div class="immo-section-title">📉 Pending Downgrades (${downgrades.length})</div><div>${downgrades.map(id => `<span class="immo-id-tag tag-down">${id}</span>`).join('')}</div></div>` : '';

    cmd.innerHTML = `
        <div id="immo-cmd-header"><strong>⚡ Smart Auto-Format</strong><span id="immo-cmd-close">&#x2715;</span></div>
        <div id="immo-cmd-content">${upHtml}${downHtml}<div id="immo-status-bar">Ready</div></div>
        <button id="immo-apply-all">${isAutoRunning ? 'Scanning...' : 'Start Auto-Processing'}</button>
    `;
    document.body.appendChild(cmd);

    // 4. Automation Logic
    const applyBtn = document.getElementById('immo-apply-all');
    const statusBar = document.getElementById('immo-status-bar');

    async function runAutoCycle() {
        applyBtn.disabled = true;
        let foundOnThisPage = false;

        // Check for Upgrades
        for (let i = upgrades.length - 1; i >= 0; i--) {
            const id = upgrades[i];
            const btn = document.querySelector(`a[onclick*="chListingFeat('${id}'"][onclick*="2)"]`);
            if (btn) {
                statusBar.innerText = `Upgrading ${id}...`;
                btn.click();
                upgrades.splice(i, 1);
                foundOnThisPage = true;
                await new Promise(r => setTimeout(r, 1200));
            }
        }

        // Check for Downgrades
        for (let i = downgrades.length - 1; i >= 0; i--) {
            const id = downgrades[i];
            const btn = document.querySelector(`a[onclick*="chListingFeat('${id}'"][onclick*="0)"]`);
            if (btn) {
                statusBar.innerText = `Downgrading ${id}...`;
                btn.click();
                downgrades.splice(i, 1);
                foundOnThisPage = true;
                await new Promise(r => setTimeout(r, 1200));
            }
        }

        // Save updated lists
        localStorage.setItem('immo_cmd_up', JSON.stringify(upgrades));
        localStorage.setItem('immo_cmd_down', JSON.stringify(downgrades));

        if (upgrades.length === 0 && downgrades.length === 0) {
            statusBar.innerText = "✓ All tasks complete!";
            applyBtn.innerHTML = "FINISHED";
            localStorage.removeItem('immo_cmd_running');
            setTimeout(() => cmd.remove(), 2000);
            return;
        }

        // If we processed everything on this page but more remain elsewhere, go to next page
        statusBar.innerText = "Searching next page...";
        const currentPageMatch = window.location.pathname.match(/index(\d+)\.html/);
        const nextPageIndex = currentPageMatch ? parseInt(currentPageMatch[1]) + 1 : 2;
        
        // Safety: Don't go past page 15
        if (nextPageIndex > 15) {
            statusBar.innerText = "Reached page limit. Stopping.";
            localStorage.removeItem('immo_cmd_running');
            return;
        }

        setTimeout(() => {
            window.location.href = window.location.pathname.replace(/index\d*\.html|$/, `index${nextPageIndex}.html`);
        }, 1500);
    }

    applyBtn.onclick = () => {
        localStorage.setItem('immo_cmd_running', 'true');
        runAutoCycle();
    };

    // Auto-resume if we just redirected
    if (isAutoRunning) {
        setTimeout(runAutoCycle, 2000);
    }

    // Dragging / Closing
    document.getElementById('immo-cmd-close').onclick = () => {
        localStorage.removeItem('immo_cmd_running');
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
