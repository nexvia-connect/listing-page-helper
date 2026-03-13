(function() {
    'use strict';

    if (window.immoSyncLoaded) return;
    window.immoSyncLoaded = true;

    // --- CONFIGURATION ---
    let targetPublicIds = JSON.parse(localStorage.getItem('immo_targets') || "[]");
    const DELAY = 1000; 

    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade')) {
        targetPublicIds = [...new Set(params.get('upgrade').split(','))];
        localStorage.setItem('immo_targets', JSON.stringify(targetPublicIds));
    }

    // UI Setup
    const style = document.createElement('style');
    style.textContent = `
        #immo-sync-panel {
            position: fixed; bottom: 20px; right: 20px; z-index: 10000;
            width: 400px; background: #111; color: #fff; border-radius: 12px;
            font-family: system-ui, sans-serif; box-shadow: 0 12px 40px rgba(0,0,0,0.6);
            border: 1px solid #333; overflow: hidden;
        }
        #immo-header { padding: 15px; background: #1a1a1a; display: flex; justify-content: space-between; border-bottom: 1px solid #333; }
        #immo-log { height: 280px; overflow-y: auto; background: #000; padding: 10px; font-size: 11px; color: #bbb; display: flex; flex-direction: column-reverse; }
        .log-entry { margin-bottom: 4px; border-left: 2px solid #444; padding-left: 8px; }
        .log-up { color: #62c462; border-color: #62c462; }
        .log-down { color: #ff6b6b; border-color: #ff6b6b; }
        .immo-footer { padding: 10px; background: #1a1a1a; }
        #btn-sync { width: 100%; padding: 12px; background: #2e7d32; color: white; border: none; font-weight: bold; border-radius: 6px; cursor: pointer; }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'immo-sync-panel';
    panel.innerHTML = `
        <div id="immo-header"><b>ImmoSync v3 (Auto-Stop)</b> <span id="immo-close" style="cursor:pointer">✕</span></div>
        <div id="immo-log"><div>Waiting to start...</div></div>
        <div class="immo-footer"><button id="btn-sync">SCAN & SYNC ALL PAGES</button></div>
    `;
    document.body.appendChild(panel);

    const addLog = (msg, type = '') => {
        const div = document.createElement('div');
        div.className = `log-entry ${type ? 'log-' + type : ''}`;
        div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
        document.getElementById('immo-log').prepend(div);
    };

    async function sendCommand(internalId, pName) {
        const body = `h_ajax=1&pName=${pName}&pArgs%5B0%5D=${internalId}`;
        await fetch(window.location.href, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
            body: body
        });
    }

    async function startProcess() {
        const btn = document.getElementById('btn-sync');
        btn.disabled = true;
        btn.innerText = "MAPPING...";

        let toUpgrade = [];
        let toDowngrade = [];
        let page = 1;
        let keepScanning = true;

        // PHASE 1: SMART MAPPING
        while (keepScanning && page <= 20) {
            addLog(`Checking page ${page}...`);
            try {
                const res = await fetch(`https://pro.immotop.lu/my-listings/index${page}.html`);
                
                // STOP if page doesn't exist (404) or redirect
                if (!res.ok || res.redirected) {
                    addLog(`Page ${page} not found. Stopping scan.`, "down");
                    keepScanning = false;
                    break;
                }

                const html = await res.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const listings = doc.querySelectorAll('.search-agency-item-container');

                // STOP if page is empty
                if (listings.length === 0) {
                    addLog(`No listings on page ${page}. Stopping scan.`);
                    keepScanning = false;
                    break;
                }

                listings.forEach(row => {
                    const internalId = row.getAttribute('data-id');
                    const publicUrl = row.querySelector('a.domingo')?.href || "";
                    const isFirst = row.querySelector('button[data-role="featured"]')?.classList.contains('active');
                    const isTarget = targetPublicIds.some(id => internalId.includes(id) || publicUrl.includes(id));

                    if (isTarget && !isFirst) toUpgrade.push(internalId);
                    else if (!isTarget && isFirst) toDowngrade.push(internalId);
                });

                page++;
            } catch (e) {
                keepScanning = false;
            }
        }

        addLog(`Map complete: ${toDowngrade.length} to drop, ${toUpgrade.length} to add.`, "up");

        // PHASE 2: EXECUTION
        btn.innerText = "EXECUTING SYNC...";
        
        // 1. Clear slots
        for (const id of toDowngrade) {
            addLog(`Freeing slot: ${id}`, "down");
            await sendCommand(id, 'chListingFeat');
            await new Promise(r => setTimeout(r, DELAY));
        }

        // 2. Add new ones
        for (const id of toUpgrade) {
            addLog(`Applying FIRST: ${id}`, "up");
            await sendCommand(id, 'chListingFeat');
            await sendCommand(id, 'vis_ad_refresh');
            await new Promise(r => setTimeout(r, DELAY));
        }

        addLog("Done! Refreshing page...", "up");
        setTimeout(() => window.location.reload(), 2000);
    }

    document.getElementById('btn-sync').onclick = startProcess;
    document.getElementById('immo-close').onclick = () => panel.remove();
})();
