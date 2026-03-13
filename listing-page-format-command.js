// Github URL: listing-page-format-command.js
(function() {
    'use strict';

    if (window.immoCmdLoaded) return;
    window.immoCmdLoaded = true;

    // 1. Persistent State (Your original logic)
    const STORAGE_KEY = 'immo_sync_logs';
    function getIdsFromUrl() {
        const matches = window.location.search.match(/\d{7,8}/g);
        return matches ? [...new Set(matches)] : [];
    }

    let upgrades = JSON.parse(localStorage.getItem('immo_cmd_up') || "[]");
    const urlIds = getIdsFromUrl();
    if (urlIds.length > 0) {
        upgrades = urlIds;
        localStorage.setItem('immo_cmd_up', JSON.stringify(upgrades));
    }

    const DELAY = 1000;

    // 2. UI (Your original 550px Wide, Professional Dark)
    const style = document.createElement('style');
    style.textContent = `
        #immo-cmd-center {
            position: fixed; top: 100px; right: 20px; z-index: 100000;
            background: #121212; border: 1px solid #333; border-radius: 8px;
            width: 550px; font-family: system-ui, sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            color: #eee; overflow: hidden;
        }
        #immo-cmd-header { padding: 12px 16px; background: #1a1a1a; border-bottom: 1px solid #333; cursor: grab; display: flex; justify-content: space-between; align-items: center; }
        #immo-id-container { padding: 15px; display: flex; flex-wrap: wrap; gap: 8px; background: #000; border-bottom: 1px solid #222; }
        .id-badge { background: #2e7d32; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; border: 1px solid #3e8e41; }
        #immo-status { padding: 20px; text-align: center; font-size: 14px; color: #62c462; font-weight: bold; border-bottom: 1px solid #222; }
        #immo-log { height: 200px; overflow-y: auto; background: #0a0a0a; padding: 12px; font-size: 11px; color: #aaa; display: flex; flex-direction: column-reverse; border-bottom: 1px solid #222; }
        .immo-btn-row { display: flex; }
        .immo-btn { flex: 1; padding: 15px; border: none; font-weight: bold; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; }
        #btn-start { background: #2e7d32; color: white; }
        #btn-copy { background: #333; color: white; border-left: 1px solid #444; }
        .log-entry { margin-bottom: 4px; border-left: 2px solid #444; padding-left: 8px; }
        .log-up { color: #62c462; border-color: #62c462; }
        .log-down { color: #ff6b6b; border-color: #ff6b6b; }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'immo-cmd-center';
    container.innerHTML = `
        <div id="immo-cmd-header"><strong>Action Center</strong><span id="immo-close" style="cursor:pointer">✕</span></div>
        <div id="immo-id-container"></div>
        <div id="immo-status">Ready to process ${upgrades.length} listings.</div>
        <div id="immo-log"></div>
        <div class="immo-btn-row">
            <button id="btn-start" class="immo-btn">Apply Formats</button>
            <button id="btn-copy" class="immo-btn">Copy Logs</button>
        </div>
    `;
    document.body.appendChild(container);

    const logBox = document.getElementById('immo-log');
    const idBox = document.getElementById('immo-id-container');

    // Add those cool little squares for IDs
    upgrades.forEach(id => {
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

    // 3. The Processing Engine (The Network Sync)
    async function sendCommand(internalId, pName) {
        const body = `h_ajax=1&pName=${pName}&pArgs%5B0%5D=${internalId}`;
        await fetch(window.location.href, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
            body: body
        });
    }

    async function processSync() {
        const status = document.getElementById('immo-status');
        const btn = document.getElementById('btn-start');
        btn.disabled = true;
        btn.innerText = "Processing...";

        let toUpgrade = [];
        let toDowngrade = [];
        let page = 1;
        let keepScanning = true;

        addLog("Sync started: Mapping pages...", "up");

        while (keepScanning && page <= 20) {
            status.innerText = `Mapping Page ${page}...`;
            try {
                const res = await fetch(`https://pro.immotop.lu/my-listings/index${page}.html`);
                if (!res.ok || res.redirected) {
                    addLog(`End of list reached at page ${page - 1}.`);
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
                    const isTarget = upgrades.some(id => internalId.includes(id) || publicUrl.includes(id));

                    if (isTarget && !isFirst) toUpgrade.push(internalId);
                    else if (!isTarget && isFirst) toDowngrade.push(internalId);
                });
                page++;
            } catch (e) { keepScanning = false; }
        }

        // STEP 1: DOWNGRADE FIRST
        status.innerText = `Downgrading ${toDowngrade.length} listings...`;
        for (const id of toDowngrade) {
            addLog(`Freeing slot: ${id}`, "down");
            await sendCommand(id, 'chListingFeat');
            await new Promise(r => setTimeout(r, DELAY));
        }

        // STEP 2: UPGRADE
        status.innerText = `Upgrading ${toUpgrade.length} listings...`;
        for (const id of toUpgrade) {
            addLog(`Applying FIRST: ${id}`, "up");
            await sendCommand(id, 'chListingFeat');
            await sendCommand(id, 'vis_ad_refresh');
            await new Promise(r => setTimeout(r, DELAY));
        }

        status.innerText = "All actions complete.";
        addLog("✅ Global Sync Finished.", "up");
        setTimeout(() => window.location.reload(), 2000);
    }

    // 4. Controls
    document.getElementById('btn-start').onclick = processSync;

    document.getElementById('btn-copy').onclick = () => {
        const logs = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]")
            .map(l => `[${l.time}] ${l.msg}`).join('\n');
        navigator.clipboard.writeText(logs).then(() => alert("Logs copied to clipboard!"));
    };

    document.getElementById('immo-close').onclick = () => {
        localStorage.clear();
        sessionStorage.removeItem(STORAGE_KEY);
        container.remove();
    };

    // Movement logic (Restored from your initial code)
    let header = document.getElementById('immo-cmd-header');
    header.onmousedown = function(e) {
        let shiftX = e.clientX - container.getBoundingClientRect().left;
        let shiftY = e.clientY - container.getBoundingClientRect().top;
        document.onmousemove = function(e) {
            container.style.left = e.clientX - shiftX + 'px';
            container.style.top = e.clientY - shiftY + 'px';
            container.style.right = 'auto'; // Break the fixed right positioning
        };
        document.onmouseup = function() { document.onmousemove = null; };
    };
})();
