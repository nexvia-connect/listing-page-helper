(function() {
    'use strict';

    if (window.immoSyncLoaded) return;
    window.immoSyncLoaded = true;

    // --- CONFIGURATION ---
    // These are the public IDs (e.g., from the URL 1891585). 
    // The script will automatically find the internal data-id (e.g., 28692605).
    let targetPublicIds = JSON.parse(localStorage.getItem('immo_targets') || "[]");
    const MAX_PAGES = 15;
    const DELAY = 1000; 

    // 1. Initial Setup: Grab IDs from URL if present
    const params = new URLSearchParams(window.location.search);
    const urlUps = params.get('upgrade');
    if (urlUps) {
        targetPublicIds = [...new Set(urlUps.split(','))];
        localStorage.setItem('immo_targets', JSON.stringify(targetPublicIds));
    }

    // 2. UI Injection
    const style = document.createElement('style');
    style.textContent = `
        #immo-sync-panel {
            position: fixed; bottom: 20px; right: 20px; z-index: 10000;
            width: 380px; background: #111; color: #fff; border-radius: 12px;
            font-family: system-ui, sans-serif; box-shadow: 0 12px 40px rgba(0,0,0,0.6);
            border: 1px solid #333; overflow: hidden;
        }
        #immo-header { padding: 15px; background: #1a1a1a; display: flex; justify-content: space-between; border-bottom: 1px solid #333; }
        #immo-log { height: 250px; overflow-y: auto; background: #000; padding: 10px; font-size: 11px; color: #bbb; line-height: 1.4; }
        .log-entry { margin-bottom: 4px; border-left: 2px solid #444; padding-left: 8px; }
        .log-up { color: #62c462; border-color: #62c462; }
        .log-down { color: #ff6b6b; border-color: #ff6b6b; }
        .immo-footer { padding: 10px; background: #1a1a1a; }
        #btn-sync { width: 100%; padding: 12px; background: #2e7d32; border: none; color: white; font-weight: bold; border-radius: 6px; cursor: pointer; }
        #btn-sync:disabled { background: #444; cursor: not-allowed; }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'immo-sync-panel';
    panel.innerHTML = `
        <div id="immo-header"><b>ImmoSync Pro</b> <span id="immo-close" style="cursor:pointer">✕</span></div>
        <div id="immo-log"><div>Target IDs: ${targetPublicIds.length > 0 ? targetPublicIds.join(', ') : 'None detected. Add ?upgrade=ID,ID to URL.'}</div></div>
        <div class="immo-footer"><button id="btn-sync">START GLOBAL SYNC</button></div>
    `;
    document.body.appendChild(panel);

    const logBox = document.getElementById('immo-log');
    const addLog = (msg, type = '') => {
        const div = document.createElement('div');
        div.className = `log-entry ${type ? 'log-' + type : ''}`;
        div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logBox.prepend(div);
    };

    // 3. API & Engine
    async function sendCommand(internalId, pName) {
        const body = `h_ajax=1&pName=${pName}&pArgs%5B0%5D=${internalId}`;
        try {
            await fetch(window.location.href, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
                body: body
            });
            return true;
        } catch (e) { return false; }
    }

    async function sync() {
        if (targetPublicIds.length === 0) return addLog("No target IDs found!", "down");
        
        const btn = document.getElementById('btn-sync');
        btn.disabled = true;
        addLog("Starting background scan...", "up");

        let foundTargets = [];
        let currentlyFirstButNotTarget = [];

        // Scrape Pages
        for (let i = 1; i <= MAX_PAGES; i++) {
            addLog(`Scanning page ${i}...`);
            const res = await fetch(`https://pro.immotop.lu/my-listings/index${i}.html`);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const listings = doc.querySelectorAll('.search-agency-item-container');

            if (listings.length === 0) break;

            listings.forEach(row => {
                const internalId = row.getAttribute('data-id');
                const publicUrl = row.querySelector('a.domingo')?.href || "";
                const isFirst = row.querySelector('button[data-role="featured"]')?.classList.contains('active');
                
                const isTarget = targetPublicIds.some(id => internalId.includes(id) || publicUrl.includes(id));

                if (isTarget && !isFirst) {
                    foundTargets.push({ internalId, id: internalId });
                } else if (!isTarget && isFirst) {
                    currentlyFirstButNotTarget.push({ internalId, id: internalId });
                }
            });
        }

        // Action: Downgrade first to free up slots
        if (currentlyFirstButNotTarget.length > 0) {
            addLog(`Freeing up ${currentlyFirstButNotTarget.length} slots...`, "down");
            for (const item of currentlyFirstButNotTarget) {
                addLog(`Downgrading ${item.id}...`);
                await sendCommand(item.internalId, 'chListingFeat');
                await new Promise(r => setTimeout(r, DELAY));
            }
        }

        // Action: Upgrade targets
        if (foundTargets.length > 0) {
            addLog(`Applying ${foundTargets.length} upgrades...`, "up");
            for (const item of foundTargets) {
                addLog(`Upgrading ${item.id}...`);
                await sendCommand(item.internalId, 'chListingFeat');
                // Refresh heart-beat
                await sendCommand(item.internalId, 'vis_ad_refresh');
                await new Promise(r => setTimeout(r, DELAY));
            }
        }

        addLog("Sync complete! Reloading...", "up");
        setTimeout(() => window.location.reload(), 2000);
    }

    // 4. Events
    document.getElementById('btn-sync').onclick = sync;
    document.getElementById('immo-close').onclick = () => {
        localStorage.removeItem('immo_targets');
        panel.remove();
    };

})();
