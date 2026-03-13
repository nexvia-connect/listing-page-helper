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
            user-select: none;
        }
        #immo-cmd-header { cursor: grab; background: #2a2a2a; padding: 14px 20px; color: white; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; }
        #immo-cmd-header:active { cursor: grabbing; }
        #immo-cmd-close { cursor: pointer; font-size: 20px; color: #888; font-weight: bold; padding: 0 5px; }
        #immo-cmd-content { padding: 25px; color: #e0e0e0; pointer-events: auto; }
        .immo-section { margin-bottom: 20px; }
        .immo-section-title { font-size: 11px; font-weight: 800; color: #888; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1.5px; }
        .immo-id-tag { display: inline-block; background: #252525; color: #fff; padding: 5px 12px; border-radius: 4px; font-family: monospace; font-size: 13px; margin: 0 6px 6px 0; border: 1px solid #444; }
        .tag-up { border-left: 3px solid #62c462; color: #a3dca3; }
        .tag-down { border-left: 3px solid #ef4444; color: #fca5a5; }
        
        #immo-log-toggle { background: #222; padding: 8px 20px; color: #aaa; font-size: 10px; cursor: pointer; display: flex; justify-content: space-between; border-top: 1px solid #333; border-bottom: 1px solid #333; }
        #immo-log-body { background: #000; color: #0f0; font-family: monospace; font-size: 10px; padding: 10px; height: 120px; overflow-y: auto; display: none; text-align: left; }
        #immo-copy-logs { background: #444; color: #fff; border: none; padding: 2px 8px; border-radius: 3px; font-size: 9px; cursor: pointer; }

        #immo-apply-all {
            width: 100%; padding: 18px; background: #2e7d32; color: white;
            border: none; border-radius: 0 0 12px 12px; font-weight: 800;
            font-size: 15px; cursor: pointer; transition: all 0.2s; text-transform: uppercase;
        }
        #immo-apply-all:hover { background: #388e3c; }
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
        <div id="immo-log-toggle">
            <span>DEBUG LOGS <span id="immo-arrow">▼</span></span>
            <button id="immo-copy-logs">COPY LOGS</button>
        </div>
        <div id="immo-log-body">-- LOG INITIALIZED --\n</div>
        <button id="immo-apply-all">Apply All Actions</button>
    `;
    document.body.appendChild(cmd);

    // Collapsible/Copy Log logic
    const logBody = document.getElementById('immo-log-body');
    const arrow = document.getElementById('immo-arrow');
    document.getElementById('immo-log-toggle').onclick = (e) => {
        if (e.target.id === 'immo-copy-logs') return;
        const isHidden = logBody.style.display === 'none' || logBody.style.display === '';
        logBody.style.display = isHidden ? 'block' : 'none';
        arrow.innerText = isHidden ? '▲' : '▼';
    };
    document.getElementById('immo-copy-logs').onclick = () => {
        navigator.clipboard.writeText(logBody.innerText);
        const btn = document.getElementById('immo-copy-logs');
        btn.innerText = 'COPIED!';
        setTimeout(() => btn.innerText = 'COPY LOGS', 2000);
    };

    const applyBtn = document.getElementById('immo-apply-all');
    applyBtn.onclick = () => {
        applyBtn.disabled = true;
        applyBtn.innerHTML = `Processing...`;
        
        const scriptCode = `
            (async function() {
                const ups = [${upgrades.map(id => '"' + id + '"').join(',')}];
                const downs = [${downgrades.map(id => '"' + id + '"').join(',')}];
                const setStatus = (t) => { const s = document.getElementById('immo-status-bar'); if(s) s.innerText = t; };
                const log = (msg) => { const b = document.getElementById('immo-log-body'); if(b) { b.innerText += msg + "\\n"; b.scrollTop = b.scrollHeight; } };

                async function safeCall(id, val, mode) {
                    log("[" + mode + "] Sending ID: " + id + " (Val: " + val + ")");
                    if (typeof xajax_chListingFeat === 'function') {
                        try {
                            xajax_chListingFeat(id, val);
                            log("   -> Triggered natively");
                        } catch(e) { log("   !! ERROR: " + e.message); }
                    } else { log("   !! ERROR: Function missing"); }
                    await new Promise(r => setTimeout(r, 800));
                }

                for (const id of ups) { setStatus("Upgrading " + id + "..."); await safeCall(id, 2, "UP"); }
                for (const id of downs) { setStatus("Downgrading " + id + "..."); await safeCall(id, 0, "DOWN"); }

                setStatus("Processing Complete!");
                log("-- DONE. RELOADING... --");
                setTimeout(() => window.location.reload(), 2000);
            })();
        `;
        const s = document.createElement('script'); s.textContent = scriptCode;
        document.documentElement.appendChild(s); s.remove();
    };

    // --- CLEAN DRAGGING LOGIC ---
    document.getElementById('immo-cmd-close').onclick = () => { cmd.remove(); window.immoCmdLoaded = false; };
    const header = document.getElementById('immo-cmd-header');
    let offsetX, offsetY, isDragging = false;

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = cmd.getBoundingClientRect();
        
        // Calculate where the mouse is relative to the popup's top-left corner
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        // Transition from Centered (Translate) to Absolute (Top/Left)
        cmd.style.transform = 'none';
        cmd.style.left = rect.left + 'px';
        cmd.style.top = rect.top + 'px';
        cmd.style.position = 'fixed';
        cmd.style.margin = '0';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        cmd.style.left = (e.clientX - offsetX) + 'px';
        cmd.style.top = (e.clientY - offsetY) + 'px';
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

})();
