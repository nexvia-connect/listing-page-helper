// Github URL: listing-page-format-command.js
(function() {
    'use strict';

    if (window.immoCmdLoaded) return;
    window.immoCmdLoaded = true;

    let upgrades = [];
    let downgrades = [];
    let searchStr = window.location.search;
    
    const savedSearch = sessionStorage.getItem('immo_helper_search_command');
    if (savedSearch) { searchStr = savedSearch; }

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

    if (upgrades.length === 0 && downgrades.length === 0) {
        window.immoCmdLoaded = false;
        return;
    }
    
    sessionStorage.removeItem('immo_helper_search_command');

    const style = document.createElement('style');
    style.textContent = `
        #immo-cmd-center {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 100000; background: #1a1a1a; border-radius: 12px;
            border: 1px solid #333; box-shadow: 0 20px 50px rgba(0,0,0,0.9);
            font-family: system-ui, sans-serif; width: 550px;
            display: flex; flex-direction: column; overflow: hidden;
        }
        #immo-cmd-header { cursor: grab; background: #2a2a2a; padding: 14px 20px; color: white; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; }
        #immo-cmd-close { cursor: pointer; font-size: 20px; color: #888; font-weight: bold; }
        #immo-cmd-content { padding: 25px; color: #e0e0e0; }
        .immo-section { margin-bottom: 20px; }
        .immo-section-title { font-size: 11px; font-weight: 800; color: #888; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1.5px; }
        .immo-id-tag { display: inline-block; background: #252525; color: #fff; padding: 5px 12px; border-radius: 4px; font-family: monospace; font-size: 13px; margin: 0 6px 6px 0; border: 1px solid #444; }
        .tag-up { border-left: 3px solid #62c462; color: #a3dca3; }
        .tag-down { border-left: 3px solid #ef4444; color: #fca5a5; }
        #immo-apply-all {
            width: 100%; padding: 18px; background: #2e7d32; color: white;
            border: none; border-radius: 0 0 12px 12px; font-weight: 800;
            font-size: 15px; cursor: pointer; transition: all 0.2s; text-transform: uppercase;
        }
        #immo-apply-all:hover { background: #388e3c; }
        #immo-apply-all:disabled { background: #333; color: #666; cursor: not-allowed; }
        #immo-status-bar { font-size: 12px; color: #62c462; text-align: center; margin-top: 10px; font-weight: 600; min-height: 15px; }
    `;
    document.head.appendChild(style);

    const cmd = document.createElement('div');
    cmd.id = 'immo-cmd-center';
    
    let upHtml = upgrades.length > 0 ? `<div class="immo-section"><div class="immo-section-title">🚀 Upgrade to FIRST (${upgrades.length})</div><div>${upgrades.map(id => `<span class="immo-id-tag tag-up">${id}</span>`).join('')}</div></div>` : '';
    let downHtml = downgrades.length > 0 ? `<div class="immo-section"><div class="immo-section-title">📉 Downgrade to NORMAL (${downgrades.length})</div><div>${downgrades.map(id => `<span class="immo-id-tag tag-down">${id}</span>`).join('')}</div></div>` : '';

    cmd.innerHTML = `
        <div id="immo-cmd-header"><strong>⚡ Format Command Center</strong><span id="immo-cmd-close">&#x2715;</span></div>
        <div id="immo-cmd-content">${upHtml}${downHtml}<div id="immo-status-bar"></div></div>
        <button id="immo-apply-all">Apply All Actions</button>
    `;
    document.body.appendChild(cmd);

    const applyBtn = document.getElementById('immo-apply-all');
    applyBtn.onclick = () => {
        applyBtn.disabled = true;
        applyBtn.innerHTML = `Processing...`;
        
        const scriptCode = `
            (async function() {
                const ups = [${upgrades.map(id => '"' + id + '"').join(',')}];
                const downs = [${downgrades.map(id => '"' + id + '"').join(',')}];
                const setStatus = (t) => { const s = document.getElementById('immo-status-bar'); if(s) s.innerText = t; };

                // Use the page's own internal function call
                for (const id of ups) {
                    setStatus("Upgrading " + id + "...");
                    if (typeof xajax_chListingFeat === 'function') {
                        xajax_chListingFeat(id, 2); 
                    }
                    await new Promise(r => setTimeout(r, 600));
                }
                for (const id of downs) {
                    setStatus("Downgrading " + id + "...");
                    if (typeof xajax_chListingFeat === 'function') {
                        xajax_chListingFeat(id, 0);
                    }
                    await new Promise(r => setTimeout(r, 600));
                }
                setStatus("Complete! Reloading...");
                setTimeout(() => window.location.reload(), 1000);
            })();
        `;
        const s = document.createElement('script'); s.textContent = scriptCode;
        document.documentElement.appendChild(s); s.remove();
    };

    document.getElementById('immo-cmd-close').onclick = () => { cmd.remove(); window.immoCmdLoaded = false; };
    const header = document.getElementById('immo-cmd-header');
    let isDragging = false, startX, startY;
    header.onmousedown = (e) => {
        isDragging = true; startX = e.clientX; startY = e.clientY;
        cmd.style.transform = 'none'; cmd.style.left = cmd.offsetLeft + 'px'; cmd.style.top = cmd.offsetTop + 'px';
        window.onmousemove = (ev) => { if (isDragging) {
            cmd.style.left = (cmd.offsetLeft + (ev.clientX - startX)) + 'px';
            cmd.style.top = (cmd.offsetTop + (ev.clientY - startY)) + 'px';
            startX = ev.clientX; startY = ev.clientY;
        }};
        window.onmouseup = () => { isDragging = false; window.onmousemove = null; };
    };
})();
