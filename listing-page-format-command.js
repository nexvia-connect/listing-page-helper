// Github URL: listing-page-format-command.js
(function() {
    'use strict';

    // 1. Parse the IDs from the URL or sessionStorage
    let targets = {}; // Maps ID to its primary action: { '123': 'upgrade', '456': 'downgrade' }
    let searchStr = window.location.search;
    
    const savedSearch = sessionStorage.getItem('immo_helper_search_command');
    if (savedSearch) {
        searchStr = savedSearch;
        sessionStorage.removeItem('immo_helper_search_command');
    }

    const queryParams = searchStr.replace('?', '').split('&');
    
    queryParams.forEach(param => {
        if (param.startsWith('upgrade=')) targets[param.split('=')[1]] = 'upgrade';
        else if (param.startsWith('downgrade=')) targets[param.split('=')[1]] = 'downgrade';
        else if (/^\d{6,8}$/.test(param)) targets[param] = 'upgrade'; // Default to upgrade
    });

    if (Object.keys(targets).length === 0) return;

    const isImmotop = window.location.hostname.includes('immotop.lu');
    const isAthome = window.location.hostname.includes('athome.lu');
    const isWortimmo = window.location.hostname.includes('wortimmo.lu');

    // 2. Inject Dark/Compact CSS
    const style = document.createElement('style');
    style.textContent = `
        #immo-cmd-popup {
            position: fixed; top: 80px; right: 30px; z-index: 100000; 
            background: #1a1a1a; border-radius: 8px; border: 1px solid #333; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.8); 
            font-family: system-ui, -apple-system, sans-serif; width: 340px;
            display: flex; flex-direction: column;
        }
        #immo-cmd-header {
            cursor: grab; background: #2a2a2a; padding: 10px 14px; color: white; 
            display: flex; justify-content: space-between; align-items: center; 
            border-radius: 8px 8px 0 0; border-bottom: 1px solid #333;
        }
        #immo-cmd-close { cursor: pointer; font-size: 16px; line-height: 1; color: #888; transition: color 0.2s; }
        #immo-cmd-close:hover { color: #fff; }
        #immo-cmd-list {
            padding: 0; margin: 0; list-style: none; 
            max-height: 350px; overflow-y: auto; background: #1a1a1a; border-radius: 0 0 8px 8px;
        }
        .immo-cmd-row {
            padding: 8px 14px; border-bottom: 1px solid #2a2a2a; 
            display: flex; justify-content: space-between; align-items: center;
        }
        .immo-cmd-row:last-child { border-bottom: none; }
        .immo-cmd-id { font-weight: 500; color: #e0e0e0; font-size: 13px; font-family: monospace; letter-spacing: 0.5px; }
        
        .immo-cmd-actions { display: flex; gap: 6px; }
        
        /* Compact Button Styles */
        .immo-btn {
            height: 26px; padding: 0 10px; border: none; border-radius: 4px; 
            font-weight: 700; font-size: 10px; cursor: pointer; 
            transition: all 0.2s; display: flex; align-items: center; justify-content: center;
            letter-spacing: 0.5px; box-sizing: border-box;
        }
        
        /* First / Upgrade Button */
        .immo-btn-up { background: transparent; border: 1px solid #2e7d32; color: #a3dca3; }
        .immo-btn-up:hover:not(:disabled) { background: #2e7d32; color: #fff; }
        .immo-btn-up.primary { background: #1e4620; border-color: #62c462; box-shadow: 0 0 8px rgba(98,196,98,0.2); }
        .immo-btn-up.primary:hover:not(:disabled) { background: #2e7d32; }
        
        /* Downgrade Button */
        .immo-btn-down { background: transparent; border: 1px solid #7f1d1d; color: #fca5a5; }
        .immo-btn-down:hover:not(:disabled) { background: #7f1d1d; color: #fff; }
        .immo-btn-down.primary { background: #4a1515; border-color: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.2); }
        .immo-btn-down.primary:hover:not(:disabled) { background: #7f1d1d; }

        /* Status States */
        .immo-btn-working { background: #92400e !important; border-color: #d97706 !important; color: #fff !important; cursor: wait !important; }
        .immo-btn:disabled { opacity: 0.4; cursor: not-allowed; filter: grayscale(0.8); background: #333 !important; border-color: #444 !important; color: #888 !important; }
    `;
    document.head.appendChild(style);

    // 3. Build the DOM
    const popup = document.createElement('div');
    popup.id = 'immo-cmd-popup';
    popup.innerHTML = `
        <div id="immo-cmd-header">
            <strong style="margin: 0; font-size: 13px; letter-spacing: 0.5px;">⚡ Action Center</strong>
            <span id="immo-cmd-close">&#x2715;</span>
        </div>
        <div id="immo-cmd-list"></div>
    `;
    document.body.appendChild(popup);

    const list = document.getElementById('immo-cmd-list');

    // Populate the rows
    Object.keys(targets).forEach(id => {
        const row = document.createElement('div');
        row.className = 'immo-cmd-row';
        row.setAttribute('data-target-id', id);
        
        const isUpPrimary = targets[id] === 'upgrade';
        const isDownPrimary = targets[id] === 'downgrade';

        row.innerHTML = `
            <span class="immo-cmd-id">${id}</span>
            <div class="immo-cmd-actions">
                <button class="immo-btn immo-btn-down ${isDownPrimary ? 'primary' : ''}" data-action="down">DOWNGRADE</button>
                <button class="immo-btn immo-btn-up ${isUpPrimary ? 'primary' : ''}" data-action="up">FIRST THIS</button>
            </div>
        `;
        list.appendChild(row);
    });

    // 4. Smart DOM State Checker
    function syncButtonStates() {
        let containers = [];
        if (isImmotop) containers = Array.from(document.querySelectorAll('.search-agency-item-container'));
        else if (isAthome) containers = Array.from(document.querySelectorAll('tbody tr.bg-white'));
        else if (isWortimmo) containers = Array.from(document.querySelectorAll('div[itemprop="itemListElement"]'));

        Object.keys(targets).forEach(id => {
            let adState = 'unknown'; // 'first', 'normal', 'unknown'

            // Look for this ID in the current DOM
            for (let container of containers) {
                let currentId = null;
                let nativeBadge = null;

                if (isImmotop) {
                    const link = container.querySelector('a[href*="/annonces/"]');
                    if (link) {
                        const match = link.href.match(/\/annonces\/(\d+)/);
                        if (match && match[1]) currentId = match[1];
                    }
                    nativeBadge = container.querySelector('.ad-badge.first');
                } 
                // Note: athome/wortimmo badge selectors would go here if needed in the future

                if (currentId === id) {
                    adState = nativeBadge ? 'first' : 'normal';
                    break;
                }
            }

            // Update UI based on DOM findings
            const row = document.querySelector(`.immo-cmd-row[data-target-id="${id}"]`);
            if (!row) return;

            const upBtn = row.querySelector('.immo-btn-up');
            const downBtn = row.querySelector('.immo-btn-down');

            // Skip updating buttons that are actively being clicked ("working" state)
            if (upBtn.classList.contains('immo-btn-working') || downBtn.classList.contains('immo-btn-working')) return;

            if (adState === 'first') {
                upBtn.textContent = '✓ FIRSTED';
                upBtn.disabled = true;
                
                downBtn.textContent = 'DOWNGRADE';
                downBtn.disabled = false;
            } else if (adState === 'normal') {
                upBtn.textContent = 'FIRST THIS';
                upBtn.disabled = false;

                downBtn.textContent = '✓ NORMAL';
                downBtn.disabled = true;
            }
        });
    }

    // 5. Click Handlers
    document.getElementById('immo-cmd-close').addEventListener('click', () => {
        popup.style.display = 'none';
    });

    list.addEventListener('click', async (e) => {
        if (e.target.tagName === 'BUTTON') {
            const btn = e.target;
            if (btn.disabled) return;

            const row = btn.closest('.immo-cmd-row');
            const adId = row.getAttribute('data-target-id');
            const action = btn.getAttribute('data-action'); // 'up' or 'down'

            // UI feedback
            const originalText = btn.textContent;
            btn.textContent = 'WORKING...';
            btn.classList.add('immo-btn-working');
            btn.disabled = true;

            // TODO: Inject actual POST fetch() payload here based on 'action'

            // Simulate network delay
            setTimeout(() => {
                btn.classList.remove('immo-btn-working');
                // Force a DOM state check which will correct the button text automatically
                syncButtonStates(); 
                
                // Fallback text if the listing isn't on the current page to be scanned
                if (btn.textContent === 'WORKING...') {
                    btn.textContent = action === 'up' ? '✓ FIRSTED' : '✓ DOWNGRADED';
                }
            }, 800);
        }
    });

    // 6. Dragging Logic (Copied from find-helper)
    const header = document.getElementById('immo-cmd-header');
    let isDragging = false, startX, startY;
    const doDrag = (e) => {
        if (!isDragging) return;
        popup.style.left = (parseInt(popup.style.left, 10) + (e.clientX - startX)) + 'px';
        popup.style.top = (parseInt(popup.style.top, 10) + (e.clientY - startY)) + 'px';
        startX = e.clientX;
        startY = e.clientY;
    };
    const stopDrag = () => {
        isDragging = false;
        header.style.cursor = 'grab';
        window.removeEventListener('mousemove', doDrag);
        window.removeEventListener('mouseup', stopDrag);
    };
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = popup.getBoundingClientRect();
        popup.style.transform = 'none';
        popup.style.left = rect.left + 'px';
        popup.style.top = rect.top + 'px';
        popup.style.right = 'auto'; // Clear right constraint so left positioning works perfectly
        header.style.cursor = 'grabbing';
        window.addEventListener('mousemove', doDrag);
        window.addEventListener('mouseup', stopDrag);
    });

    // 7. Init & Watch DOM
    syncButtonStates();
    setInterval(syncButtonStates, 1000); // Check DOM periodically for dynamic updates

})();
