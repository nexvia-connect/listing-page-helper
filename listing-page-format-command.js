// Github URL: listing-page-format-command.js
(function() {
    'use strict';

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

    const style = document.createElement('style');
    style.textContent = `
        #immo-cmd-center {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 100000; background: #1a1a1a; border-radius: 12px;
            border: 1px solid #333; box-shadow: 0 20px 50px rgba(0,0,0,0.9);
            font-family: system-ui, -apple-system, sans-serif; width: 550px;
            display: flex; flex-direction: column; overflow: hidden;
        }
        #immo-cmd-header {
            cursor: grab; background: #2a2a2a; padding: 14px 20px; color: white;
            display: flex; justify-content: space-between; align-items: center;
            border-bottom: 1px solid #333;
        }
        #immo-cmd-close { cursor: pointer; font-size: 18px; color: #888; transition: color 0.2s; }
        #immo-cmd-content { padding: 20px; color: #e0e0e0; }
        .immo-section { margin-bottom: 16px; }
        .immo-section-title { font-size: 11px; font-weight: 800; color: #888; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; }
        .immo-id-tag { display: inline-block; background: #2a2a2a; color: #fff; padding: 4px 10px; border-radius: 4px; font-family: monospace; font-size: 13px; margin: 0 4px 4px 0; border: 1px solid #444; }
        .tag-up { border-color: #2e7d32; color: #a3dca3; }
        .tag-down { border-color: #7f1d1d; color: #fca5a5; }
        #immo-apply-all {
            width: 100%; padding: 14px; background: #2e7d32; color: white;
            border: none; border-radius: 0 0 12px 12px; font-weight: 800;
            font-size: 14px; cursor: pointer; transition: all 0.2s;
            text-transform: uppercase; letter-spacing: 1px;
        }
        #immo-apply-all:hover { background: #388e3c; }
        #immo-apply-all:disabled { background: #333; color: #666; cursor: not-allowed; }
        .working-spinner {
            display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.3);
            border-radius: 50%; border-top-color: #fff; animation: spin 1s ease-in-out infinite; margin-right: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);

    const cmd = document.createElement('div');
    cmd.id = 'immo-cmd-center';
    
    let upgradeHtml = upgrades.length > 0 ? `<div class="immo-section"><div class="immo-section-title">Upgrading to FIRST</div><div>${upgrades.map(id => `<span class="immo-id-tag tag-up">${id}</span>`).join('')}</div></div>` : '';
    let downgradeHtml = downgrades.length > 0 ? `<div class="immo-section"><div class="immo-section-title">Downgrading to NORMAL</div><div>${downgrades.map(id => `<span class="immo-id-tag tag-down">${id}</span>`).join('')}</div></div>` : '';

    cmd.innerHTML = `
        <div id="immo-cmd-header"><strong>⚡ Command Center</strong><span id="immo-cmd-close">&#x2715;</span></div>
        <div id="immo-cmd-content">${upgradeHtml}${downgradeHtml}</div>
        <button id="immo-apply-all">Apply All Actions</button>
    `;
    document.body.appendChild(cmd);

    // 4. The Real Network Logic
    async function performAction(adId, isUpgrade) {
        const url = window.location.origin + window.location.pathname;
        
        // Step 1: Change listing status
        // Based on your payload: h_ajax=1&pName=chListingFeat&pArgs[0]=ID
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
            body: `h_ajax=1&pName=chListingFeat&pArgs%5B0%5D=${adId}`
        });

        // Step 2: Refresh listing (crucial for it to "stick" and show up)
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
            body: `h_ajax=1&pName=vis_ad_refresh&pArgs%5B0%5D=${adId}`
        });
    }

    const applyBtn = document.getElementById('immo-apply-all');
    applyBtn.onclick = async () => {
        applyBtn.disabled = true;
        applyBtn.innerHTML = `<span class="working-spinner"></span> Processing...`;

        // Process all items
        const allActions = [
            ...upgrades.map(id => ({ id, isUp: true })),
            ...downgrades.map(id => ({ id, isUp: false }))
        ];

        for (const action of allActions) {
            await performAction(action.id, action.isUp);
            await new Promise(r => setTimeout(r, 400)); // Small delay
        }

        applyBtn.innerHTML = `✓ Actions Sent - Refreshing...`;
        applyBtn.style.background = '#1b5e20';
        
        setTimeout(() => {
            window.location.reload(); // Refresh to show the new reality
        }, 1200);
    };

    document.getElementById('immo-cmd-close').onclick = () => cmd.remove();
    const header = document.getElementById('immo-cmd-header');
    let isDragging = false, startX, startY;
    header.onmousedown = (e) => {
        isDragging = true; startX = e.clientX; startY = e.clientY;
        cmd.style.transform = 'none'; cmd.style.left = cmd.offsetLeft + 'px'; cmd.style.top = cmd.offsetTop + 'px';
        window.onmousemove = (ev) => {
            if (!isDragging) return;
            cmd.style.left = (cmd.offsetLeft + (ev.clientX - startX)) + 'px';
            cmd.style.top = (cmd.offsetTop + (ev.clientY - startY)) + 'px';
            startX = ev.clientX; startY = ev.clientY;
        };
        window.onmouseup = () => { isDragging = false; window.onmousemove = null; };
    };
})();
