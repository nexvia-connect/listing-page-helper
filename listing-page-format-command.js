// Github URL: listing-page-format-command.js
(function() {
    'use strict';

    if (window.immoCmdLoaded) return;
    window.immoCmdLoaded = true;

    // 1. Persistent State
    let upgrades = JSON.parse(localStorage.getItem('immo_cmd_up') || "[]");
    let downgrades = JSON.parse(localStorage.getItem('immo_cmd_down') || "[]");
    let isRunning = localStorage.getItem('immo_cmd_running') === 'true';
    let isPaused = false;

    // 2. Initial Setup (Parse URL)
    if (!isRunning) {
        const params = new URLSearchParams(window.location.search);
        const ups = params.get('upgrade');
        const downs = params.get('downgrade');
        
        if (ups) upgrades = [...new Set(ups.split(','))];
        if (downs) downgrades = [...new Set(downs.split(','))];
        
        // Handle your custom &123&456 format if needed
        window.location.search.split('&').forEach(p => {
            if (/^\d{6,9}$/.test(p)) upgrades.push(p);
        });

        if (upgrades.length || downgrades.length) {
            localStorage.setItem('immo_cmd_up', JSON.stringify(upgrades));
            localStorage.setItem('immo_cmd_down', JSON.stringify(downgrades));
        }
    }

    if (!upgrades.length && !downgrades.length) {
        window.immoCmdLoaded = false;
        return;
    }

    // 3. UI (550px Wide, Professional Dark)
    const style = document.createElement('style');
    style.textContent = `
        #immo-cmd-center {
            position: fixed; top: 100px; right: 20px; z-index: 100000;
            background: #121212; border: 1px solid #333; border-radius: 8px;
            width: 550px; font-family: system-ui, sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            color: #eee; overflow: hidden;
        }
        #immo-cmd-header { padding: 12px 16px; background: #1a1a1a; border-bottom: 1px solid #333; cursor: grab; display: flex; justify-content: space-between; align-items: center; }
        #immo-status { padding: 20px; text-align: center; font-size: 14px; color: #62c462; font-weight: bold; border-bottom: 1px solid #222; }
        .immo-btn-row { display: flex; }
        .immo-btn { flex: 1; padding: 15px; border: none; font-weight: bold; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; }
        #btn-start { background: #2e7d32; color: white; }
        #btn-pause { background: #333; color: white; border-left: 1px solid #444; }
        #immo-iframe-container { height: 0; width: 0; visibility: hidden; position: absolute; }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'immo-cmd-center';
    container.innerHTML = `
        <div id="immo-cmd-header"><strong>Action Center</strong><span id="immo-close" style="cursor:pointer">✕</span></div>
        <div id="immo-status">Ready to process ${upgrades.length + downgrades.length} listings.</div>
        <div class="immo-btn-row">
            <button id="btn-start" class="immo-btn">Start Automation</button>
            <button id="btn-pause" class="immo-btn">Pause</button>
        </div>
        <div id="immo-iframe-container"></div>
    `;
    document.body.appendChild(container);

    // 4. The Processing Engine
    async function processList() {
        const status = document.getElementById('immo-status');
        
        while (upgrades.length > 0 || downgrades.length > 0) {
            if (isPaused) return;

            const isUp = upgrades.length > 0;
            const id = isUp ? upgrades[0] : downgrades[0];
            const targetVal = isUp ? 2 : 0;
            const modeText = isUp ? "Upgrading" : "Downgrading";

            status.innerText = `${modeText} ${id}...`;

            // Look for button on current page
            let btn = document.querySelector(`a[onclick*="chListingFeat('${id}'"][onclick*=", ${targetVal})"]`);
            
            if (btn) {
                btn.click();
                if (isUp) upgrades.shift(); else downgrades.shift();
                localStorage.setItem('immo_cmd_up', JSON.stringify(upgrades));
                localStorage.setItem('immo_cmd_down', JSON.stringify(downgrades));
                await new Promise(r => setTimeout(r, 1500)); // Wait for server to breath
            } else {
                // If not found, we must go to the next page
                status.innerText = `ID ${id} not found on this page. Moving to next...`;
                const nextUrl = getNextPageUrl();
                if (nextUrl) {
                    localStorage.setItem('immo_cmd_running', 'true');
                    window.location.href = nextUrl;
                    return; // Exit script, will resume on reload
                } else {
                    status.innerText = "Error: Could not find listing on any page.";
                    stop();
                    return;
                }
            }
        }
        
        status.innerText = "All actions complete.";
        stop();
    }

    function getNextPageUrl() {
        const path = window.location.pathname;
        const match = path.match(/index(\d+)\.html/);
        const current = match ? parseInt(match[1]) : 1;
        if (current >= 15) return null; // Safety cap
        return path.replace(/index\d*\.html|$/, `index${current + 1}.html`);
    }

    function stop() {
        localStorage.removeItem('immo_cmd_up');
        localStorage.removeItem('immo_cmd_down');
        localStorage.removeItem('immo_cmd_running');
        setTimeout(() => window.location.reload(), 2000);
    }

    // 5. Controls
    document.getElementById('btn-start').onclick = function() {
        this.disabled = true;
        this.innerText = "Processing...";
        processList();
    };

    document.getElementById('btn-pause').onclick = function() {
        isPaused = !isPaused;
        this.innerText = isPaused ? "Resume" : "Pause";
        if (!isPaused) processList();
    };

    document.getElementById('immo-close').onclick = () => {
        localStorage.clear();
        container.remove();
    };

    if (isRunning) {
        document.getElementById('btn-start').disabled = true;
        document.getElementById('btn-start').innerText = "Processing...";
        setTimeout(processList, 2000);
    }
})();
