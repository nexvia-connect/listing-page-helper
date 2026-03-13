(function() {
    'use strict';

    if (window.immoSyncLoaded) return;
    window.immoSyncLoaded = true;

    // --- CONFIG & PERSISTENCE ---
    const STORAGE_KEY = 'immo_sync_logs';
    
    // 1. IMPROVED PARSING: Pulls IDs from ?upgrade=X,Y,Z OR ?upgrade=X&Y&Z format
    function getIdsFromUrl() {
        const search = window.location.search;
        // Regex looks for any 7 to 8 digit numbers in the URL
        const matches = search.match(/\d{7,8}/g);
        return matches ? [...new Set(matches)] : [];
    }

    let targetPublicIds = JSON.parse(localStorage.getItem('immo_targets') || "[]");
    const urlIds = getIdsFromUrl();
    
    if (urlIds.length > 0) {
        targetPublicIds = urlIds;
        localStorage.setItem('immo_targets', JSON.stringify(targetPublicIds));
    }

    const DELAY = 1000; 

    // --- UI STYLES ---
    const style = document.createElement('style');
    style.textContent = `
        #immo-center {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 100000; width: 550px; background: #121212; color: #eee;
            border-radius: 12px; font-family: system-ui, sans-serif;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8); border: 1px solid #333; overflow: hidden;
        }
        #immo-header { padding: 16px; background: #1a1a1a; display: flex; justify-content: space-between; border-bottom: 1px solid #333; align-items: center; }
        #immo-id-container { padding: 15px; display: flex; flex-wrap: wrap; gap: 8px; background: #000; border-bottom: 1px solid #222; max-height: 100px; overflow-y: auto; }
        .id-badge { background: #2e7d32; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; border: 1px solid #3e8e41; }
        #immo-log { height: 250px; overflow-y: auto; background: #0a0a0a; padding: 12px; font-size: 11px; color: #aaa; display: flex; flex-direction: column-reverse; }
        .log-entry { margin-bottom: 4px; padding-left: 8px; border-left: 2px solid #444; }
        .log-up { color: #62c462; border-left-color: #62c462; }
        .log-down { color: #ff6b6b; border-left-color: #ff6b6b; }
        .immo-actions { padding: 15px; background: #1a1a1a; display: flex; gap: 10px; }
        #btn-apply { flex: 3; padding: 14px; background: #2e7d32; color: white; border: none; font-weight: bold; border-radius: 6px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; }
        #btn-copy { flex: 1; padding: 14px; background: #333; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; }
        #btn-apply:disabled { opacity: 0.5; cursor: not-allowed; }
    `;
    document.head.appendChild(style);

    // --- PANEL ---
    const panel = document.createElement('div');
    panel.id = 'immo-center';
    panel.innerHTML = `
        <div id="immo-header"><strong>Action Center</strong><span id="immo-close" style="cursor:pointer">✕</span></div>
        <div id="immo-id-container"></div>
        <div id="immo-log"></div>
        <div class="immo-actions">
            <button id="btn-apply">Apply Formats</button>
            <button id="btn-copy">Copy Logs</button>
        </div>
    `;
    document.body.appendChild(panel);

    const logBox = document.getElementById('immo-log');
    const idBox = document.getElementById('immo-id-container');

    targetPublicIds.forEach(id => {
        const span = document.createElement('span');
        span.className = 'id-badge';
        span.innerText = id;
        idBox.appendChild(span);
    });

    const addLog = (msg, type = '') => {
        const entry = { time: new Date().toLocaleTimeString(), msg, type };
        const logs = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
        logs.push(entry);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
        renderLogEntry(entry);
    };

    const renderLogEntry = (entry) => {
        const div = document.createElement('div');
        div.className = `log-entry ${entry.type ? 'log-' + entry.type : ''}`;
        div.innerText = `[${entry.time}] ${entry.msg}`;
        logBox.prepend(div);
    };

    JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]").forEach(renderLogEntry);

    // --- ENGINE ---
    async function sendCommand(internalId, pName) {
        const body = `h_ajax=1&pName=${pName}&pArgs%5B0%5D=${internalId}`;
        await fetch(window.location.href, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
            body: body
        });
    }

    async function startSync() {
        const btn = document.getElementById('btn-apply');
        btn.disabled = true;
        btn.innerText = "Processing...";

        let toUpgrade = [];
        let toDowngrade = [];
        let page = 1;
        let keepScanning = true;

        addLog(`Sync started for ${targetPublicIds.length} targets.`, "up");

        while (keepScanning && page <= 20) {
            try {
                const res = await fetch(`https://pro.immotop.lu/my-listings/index${page}.html`);
                if (!res.ok || res.redirected) {
                    addLog(`Reached end of listings at page ${page - 1}.`);
                    keepScanning = false;
                    break;
                }

                const html = await res.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const listings = doc.querySelectorAll('.search-agency-item-container');

                if (listings.length === 0) { keepScanning = false; break; }

                listings.forEach(row => {
                    const internalId = row.getAttribute('data-id');
                    const publicUrl = row.querySelector('a.domingo')?.href || "";
                    const isFirst = row.querySelector('button[data-role="featured"]')?.classList.contains('active');
                    
                    // Match against public ID (from URL) or internal data-id
                    const isTarget = targetPublicIds.some(id => internalId.includes(id) || publicUrl.includes(id));

                    if (isTarget && !isFirst) toUpgrade.push(internalId);
                    else if (!isTarget && isFirst) toDowngrade.push(internalId);
                });
                page++;
            } catch (e) { keepScanning = false; }
        }

        addLog(`Map complete: ${toDowngrade.length} removals, ${toUpgrade.length} additions.`, "up");

        for (const id of toDowngrade) {
            addLog(`Freeing slot: ${id}`, "down");
            await sendCommand(id, 'chListingFeat');
            await new Promise(r => setTimeout(r, DELAY));
        }

        for (const id of toUpgrade) {
            addLog(`Applying FIRST: ${id}`, "up");
            await sendCommand(id, 'chListingFeat');
            await sendCommand(id, 'vis_ad_refresh');
            await new Promise(r => setTimeout(r, DELAY));
        }

        addLog("✅ Sync successful. Reloading...", "up");
        setTimeout(() => window.location.reload(), 2000);
    }

    // --- BUTTONS ---
    document.getElementById('btn-apply').onclick = startSync;

    document.getElementById('btn-copy').onclick = () => {
        const logs = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]")
            .map(l => `[${l.time}] ${l.msg}`).join('\n');
        navigator.clipboard.writeText(logs).then(() => alert("Logs copied!"));
    };

    document.getElementById('immo-close').onclick = () => {
        localStorage.removeItem('immo_targets');
        sessionStorage.removeItem(STORAGE_KEY);
        panel.remove();
    };
})();
