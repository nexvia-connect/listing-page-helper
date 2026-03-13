// Github URL: listing-page-format-command.js
(function() {
    'use strict';

    // 1. Parse the IDs from the URL or sessionStorage
    let upgrades = [];
    let downgrades = [];
    let searchStr = window.location.search;
    
    const savedSearch = sessionStorage.getItem('immo_helper_search_command');
    if (savedSearch) {
        searchStr = savedSearch;
        sessionStorage.removeItem('immo_helper_search_command');
    }

    const queryParams = searchStr.replace('?', '').split('&');
    queryParams.forEach(param => {
        const decoded = decodeURIComponent(param);
        if (decoded.startsWith('upgrade=')) {
            upgrades.push(decoded.split('=')[1]);
        } else if (decoded.startsWith('downgrade=')) {
            downgrades.push(decoded.split('=')[1]);
        } else if (/^\d{6,8}$/.test(decoded)) {
            upgrades.push(decoded);
        }
    });

    if (upgrades.length === 0 && downgrades.length === 0) return;

    // 2. Inject CSS for Centered Dashboard
    const style = document.createElement('style');
    style.textContent = `
        #immo-cmd-center {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 100000; background: #1a1a1a; border-radius: 12px;
            border: 1px solid #333; box-shadow: 0 20px 50px rgba(0,0,0,0.9);
            font-family: system-ui, -apple-system, sans-serif; width: 420px;
            display: flex; flex-direction: column; overflow: hidden;
        }
        #immo-cmd-header {
            cursor: grab; background: #2a2a2a; padding: 14px 20px; color: white;
            display: flex; justify-content: space-between; align-items: center;
            border-bottom: 1px solid #333;
        }
        #immo-cmd-close { cursor: pointer; font-size: 18px; color: #888; transition: color 0.2s; }
        #immo-cmd-close:hover { color: #fff; }
        
        #immo-cmd-content { padding: 20px; color: #e0e0e0; }
        .immo-section { margin-bottom: 16px; }
        .immo-section-title { font-size: 11px; font-weight: 800; color: #888; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; }
        .immo-id-tag { 
            display: inline-block; background: #2a2a2a; color: #fff; 
            padding: 4px 10px; border-radius: 4px; font-family: monospace; 
            font-size: 13px; margin: 0 4px 4px 0; border: 1px solid #444;
        }
        .tag-up { border-color: #2e7d32; color: #a3dca3; }
        .tag-down { border-color: #7f1d1d; color: #fca5a5; }

        #immo-apply-all {
            width: 100%; padding: 14px; background: #2e7d32; color: white;
            border: none; border-radius: 0 0 12px 12px; font-weight: 800;
            font-size: 14px; cursor: pointer; transition: all 0.2s;
            text-transform: uppercase; letter-spacing: 1px;
        }
        #immo-apply-all:hover { background: #388e3c; }
        #immo-apply-all:active { transform: scale(0.98); }
        #immo-apply-all:disabled { background: #333; color: #666; cursor: not-allowed; }

        .working-spinner {
            display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.3);
            border-radius: 50%; border-top-color: #fff; animation: spin 1s ease-in-out infinite; margin-right: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);

    // 3. Create the UI
    const cmd = document.createElement('div');
    cmd.id = 'immo-cmd-center';
    
    let upgradeHtml = upgrades.length > 0 ? `
        <div class="immo-section">
            <div class="immo-section-title">Listings to Upgrade (FIRST)</div>
            <div>${upgrades.map(id => `<span class="immo-id-tag tag-up">${id}</span>`).join('')}</div>
        </div>` : '';

    let downgradeHtml = downgrades.length > 0 ? `
        <div class="immo-section">
            <div class="immo-section-title">Listings to Downgrade (NORMAL)</div>
            <div>${downgrades.map(id => `<span class="immo-id-tag tag-down">${id}</span>`).join('')}</div>
        </div>` : '';

    cmd.innerHTML = `
        <div id="immo-cmd-header">
            <strong style="font-size: 14px; letter-spacing: 0.5px;">⚡ Format Command Center</strong>
            <span id="immo-cmd-close">&#x2715;</span>
        </div>
        <div id="immo-cmd-content">
            ${upgradeHtml}
            ${downgradeHtml}
        </div>
        <button id="immo-apply-all">Apply All Actions</button>
    `;
    document.body.appendChild(cmd);

    // 4. Action Logic
    async function performAction(adId, typeValue) {
        // typeValue: 2 for First, 0 for Normal
        const xajaxFunc = (typeof unsafeWindow !== 'undefined' && unsafeWindow.xajax_chListingFeat) 
                          ? unsafeWindow.xajax_chListingFeat 
                          : window.xajax_chListingFeat;

        if (xajaxFunc) {
            xajaxFunc(adId, typeValue);
        } else {
            // Fallback for direct DOM interaction
            const btn = document.querySelector(`.search-agency-item-container a[onclick*="xajax_chListingFeat('${adId}'"]`);
            if (btn) btn.click();
        }
    }

    const applyBtn = document.getElementById('immo-apply-all');
    applyBtn.onclick = async () => {
        applyBtn.disabled = true;
        applyBtn.innerHTML = `<span class="working-spinner"></span> Processing...`;

        // Process Upgrades
        for (const id of upgrades) {
            await performAction(id, 2);
            await new Promise(r => setTimeout(r, 600)); // Slight delay to avoid server spam
        }

        // Process Downgrades
        for (const id of downgrades) {
            await performAction(id, 0);
            await new Promise(r => setTimeout(r, 600));
        }

        applyBtn.innerHTML = `✓ All Actions Applied`;
        applyBtn.style.background = '#1b5e20';
        
        setTimeout(() => {
            cmd.style.opacity = '0';
            cmd.style.transition = 'opacity 0.5s ease';
            setTimeout(() => cmd.remove(), 500);
        }, 1500);
    };

    // 5. Dragging & Closing
    document.getElementById('immo-cmd-close').onclick = () => cmd.remove();
    const header = document.getElementById('immo-cmd-header');
    let isDragging = false, startX, startY;
    header.onmousedown = (e) => {
        isDragging = true; startX = e.clientX; startY = e.clientY;
        cmd.style.transform = 'none';
        cmd.style.left = cmd.offsetLeft + 'px';
        cmd.style.top = cmd.offsetTop + 'px';
        header.style.cursor = 'grabbing';
        window.onmousemove = (ev) => {
            if (!isDragging) return;
            cmd.style.left = (cmd.offsetLeft + (ev.clientX - startX)) + 'px';
            cmd.style.top = (cmd.offsetTop + (ev.clientY - startY)) + 'px';
            startX = ev.clientX; startY = ev.clientY;
        };
        window.onmouseup = () => { isDragging = false; header.style.cursor = 'grab'; window.onmousemove = null; };
    };
})();
