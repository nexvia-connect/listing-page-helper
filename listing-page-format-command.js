// Github URL: listing-page-format-command.js
(function() {
    'use strict';

    if (window.immoCmdLoaded) return;
    window.immoCmdLoaded = true;

    // --- 1. PERSISTENT STATE & PARSING ---
    const LOG_STORAGE_KEY = 'immo_sync_logs';
    const ID_STORAGE_KEY = 'immo_cmd_up_session';
    
    localStorage.removeItem('immo_cmd_up');

    function getIdsFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const upgradeString = params.get('upgrade') || "";
        return upgradeString.split(',').filter(id => id.trim().length >= 7).map(id => id.trim());
    }

    let upgrades = JSON.parse(sessionStorage.getItem(ID_STORAGE_KEY) || "[]");
    const urlIds = getIdsFromUrl();
    
    if (urlIds.length > 0) {
        upgrades = urlIds;
        sessionStorage.setItem(ID_STORAGE_KEY, JSON.stringify(upgrades));
    }

    if (upgrades.length === 0) {
        return;
    }

    const DELAY = 1000;

    // --- 2. UI (Modernized, Sleek Dark Mode) ---
    const style = document.createElement('style');
    style.textContent = `
        #immo-cmd-center {
            position: fixed; top: 100px; right: 20px; z-index: 100000;
            background: #1e1e1e; border: 1px solid #333; border-radius: 12px;
            width: 480px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            box-shadow: 0 10px 40px rgba(0,0,0,0.4);
            color: #ececec; overflow: hidden;
            display: flex; flex-direction: column;
        }
        #immo-cmd-header { 
            padding: 14px 20px; background: #252525; border-bottom: 1px solid #333; 
            cursor: grab; display: flex; justify-content: space-between; align-items: center; 
            font-size: 14px; font-weight: 600; color: #fff; letter-spacing: 0.5px;
        }
        #immo-id-container { 
            padding: 20px; display: flex; flex-wrap: wrap; gap: 8px; background: #1e1e1e; 
        }
        
        /* Modern Tag Styling */
        .id-badge { 
            background: #2c2c2c; color: #a3a3a3; padding: 6px 12px; border-radius: 20px; 
            font-size: 12px; font-weight: 500; border: 1px solid #404040; 
            transition: all 0.3s ease; 
        }
        .id-badge.active { 
            background: rgba(16, 163, 127, 0.15); color: #10a37f; border-color: rgba(16, 163, 127, 0.4); 
        }

        .immo-btn-row { 
            padding: 0 20px 20px 20px; display: flex; gap: 12px; align-items: center;
        }
        .immo-btn { 
            padding: 10px 18px; border-radius: 6px; font-size: 12px; font-weight: 600; 
            cursor: pointer; transition: all 0.2s ease; border: none; letter-spacing: 0.5px;
        }
        
        /* Modern Green Button */
        #btn-start { 
            background: #10a37f; color: white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        #btn-start:hover:not(:disabled) { background: #0e906f; }
        #btn-start:disabled { background: #2c544a; color: #888; cursor: not-allowed; box-shadow: none; }
        
        /* Low-Contrast Copy Button */
        #btn-copy { 
            background: transparent; color: #a3a3a3; border: 1px solid #404040; 
        }
        #btn-copy:hover { background: #2c2c2c; color: #fff; border-color: #555; }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'immo-cmd-center';
    container.innerHTML = `
        <div id="immo-cmd-header">
            <span>Action Center</span>
            <span id="immo-close" style="cursor:pointer; color: #888; transition: color 0.2s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#888'">✕</span>
        </div>
        <div id="immo-id-container"></div>
        <div class="immo-btn-row">
            <button id="btn-start" class="immo-btn">APPLY ${upgrades.length} FORMATS</button>
            <button id="btn-copy" class="immo-btn">COPY LOGS</button>
        </div>
    `;
    document.body.appendChild(container);

    const idBox = document.getElementById('immo-id-container');
    const badgeMap = {};

    upgrades.forEach(id => {
        const span = document.createElement('span');
        span.className = 'id-badge';
        span.id = `badge-${id}`;
        span.innerText = id;
        idBox.appendChild(span);
        badgeMap[id] = span;
    });

    const addLog = (msg, type = '') => {
        const entry = { time: new Date().toLocaleTimeString(), msg, type };
        const logs = JSON.parse(sessionStorage.getItem(LOG_STORAGE_KEY) || "[]");
        logs.push(entry);
        sessionStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    };

    // --- 3. ENGINE ---
    async function sendCommand(internalId, pName) {
        const body = `h_ajax=1&pName=${pName}&pArgs%5B0%5D=${internalId}`;
        await fetch(window.location.href, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
            body: body
        });
    }

    async function processSync() {
        const btn = document.getElementById('btn-start');
        btn.disabled = true;

        let toUpgrade = []; 
        let toDowngrade = [];
        let page = 1;
        let keepScanning = true;

        addLog("Sync started: Mapping listings to internal IDs...", "up");

        while (keepScanning && page <= 20) {
            btn.innerText = `MAPPING PAGE ${page}...`;
            try {
                const res = await fetch(`https://pro.immotop.lu/my-listings/index${page}.html`);
                if (!res.ok || res.redirected) {
                    addLog(`Scan complete at page ${page - 1}.`);
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
                    
                    const matchedPublicId = upgrades.find(id => internalId.includes(id) || publicUrl.includes(id));

                    if (matchedPublicId) {
                        if (!isFirst) toUpgrade.push({ internalId, publicId: matchedPublicId });
                        else {
                            if (badgeMap[matchedPublicId]) badgeMap[matchedPublicId].classList.add('active');
                        }
                    } else if (isFirst) {
                        toDowngrade.push(internalId);
                    }
                });
                page++;
            } catch (e) { keepScanning = false; }
        }

        btn.innerText = `CLEARING SLOTS (${toDowngrade.length})...`;
        for (const id of toDowngrade) {
            addLog(`Downgrading non-target: ${id}`, "down");
            await sendCommand(id, 'chListingFeat');
            await new Promise(r => setTimeout(r, DELAY));
        }

        btn.innerText = `APPLYING UPGRADES (${toUpgrade.length})...`;
        for (const item of toUpgrade) {
            addLog(`Upgrading target: ${item.publicId}`, "up");
            await sendCommand(item.internalId, 'chListingFeat');
            await sendCommand(item.internalId, 'vis_ad_refresh');
            
            if (badgeMap[item.publicId]) {
                badgeMap[item.publicId].classList.add('active');
            }
            
            await new Promise(r => setTimeout(r, DELAY));
        }

        btn.innerText = "COMPLETE ✓";
        addLog("✅ All background tasks finished.", "up");
        setTimeout(() => window.location.reload(), 2000);
    }

    // --- 4. CONTROLS & DRAGGING ---
    document.getElementById('btn-start').onclick = processSync;

    document.getElementById('btn-copy').onclick = () => {
        const logs = JSON.parse(sessionStorage.getItem(LOG_STORAGE_KEY) || "[]")
            .map(l => `[${l.time}] ${l.msg}`).join('\n');
        
        if (logs.trim().length === 0) {
            alert("Logs are currently empty.");
            return;
        }

        navigator.clipboard.writeText(logs).then(() => {
            const copyBtn = document.getElementById('btn-copy');
            const originalText = copyBtn.innerText;
            copyBtn.innerText = "COPIED!";
            copyBtn.style.color = "#10a37f";
            copyBtn.style.borderColor = "#10a37f";
            
            setTimeout(() => {
                copyBtn.innerText = originalText;
                copyBtn.style.color = "";
                copyBtn.style.borderColor = "";
            }, 2000);
        });
    };

    document.getElementById('immo-close').onclick = () => {
        sessionStorage.removeItem(ID_STORAGE_KEY);
        sessionStorage.removeItem(LOG_STORAGE_KEY);
        container.remove();
    };

    let header = document.getElementById('immo-cmd-header');
    header.onmousedown = function(e) {
        let shiftX = e.clientX - container.getBoundingClientRect().left;
        let shiftY = e.clientY - container.getBoundingClientRect().top;
        document.onmousemove = function(e) {
            container.style.left = e.clientX - shiftX + 'px';
            container.style.top = e.clientY - shiftY + 'px';
            container.style.right = 'auto'; 
        };
        document.onmouseup = function() { document.onmousemove = null; };
    };
})();
