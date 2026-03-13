// Github URL: listing-page-format-command.js
(function() {
    'use strict';

    let targets = {}; 
    let searchStr = window.location.search;
    
    const savedSearch = sessionStorage.getItem('immo_helper_search_command');
    if (savedSearch) {
        searchStr = savedSearch;
        sessionStorage.removeItem('immo_helper_search_command');
    }

    const queryParams = searchStr.replace('?', '').split('&');
    queryParams.forEach(param => {
        const decoded = decodeURIComponent(param);
        if (decoded.startsWith('upgrade=')) targets[decoded.split('=')[1]] = 'upgrade';
        else if (decoded.startsWith('downgrade=')) targets[decoded.split('=')[1]] = 'downgrade';
        else if (/^\d{6,8}$/.test(decoded)) targets[decoded] = 'upgrade';
    });

    if (Object.keys(targets).length === 0) return;

    const isImmotop = window.location.hostname.includes('immotop.lu');

    // 1. Inject CSS
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
        #immo-cmd-close { cursor: pointer; font-size: 16px; line-height: 1; color: #888; }
        #immo-cmd-list { padding: 0; margin: 0; list-style: none; max-height: 350px; overflow-y: auto; background: #1a1a1a; border-radius: 0 0 8px 8px; }
        .immo-cmd-row { padding: 8px 14px; border-bottom: 1px solid #2a2a2a; display: flex; justify-content: space-between; align-items: center; }
        .immo-cmd-id { font-weight: 500; color: #e0e0e0; font-size: 13px; font-family: monospace; }
        .immo-cmd-actions { display: flex; gap: 6px; }
        .immo-btn { height: 26px; padding: 0 10px; border: none; border-radius: 4px; font-weight: 700; font-size: 10px; cursor: pointer; transition: all 0.2s; }
        .immo-btn-up { background: transparent; border: 1px solid #2e7d32; color: #a3dca3; }
        .immo-btn-up.primary { background: #1e4620; border-color: #62c462; }
        .immo-btn-down { background: transparent; border: 1px solid #7f1d1d; color: #fca5a5; }
        .immo-btn-down.primary { background: #4a1515; border-color: #ef4444; }
        .immo-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .immo-btn-working { background: #92400e !important; color: #fff !important; }
    `;
    document.head.appendChild(style);

    // 2. Build Popup
    const popup = document.createElement('div');
    popup.id = 'immo-cmd-popup';
    popup.innerHTML = `
        <div id="immo-cmd-header"><strong>⚡ Action Center</strong><span id="immo-cmd-close">&#x2715;</span></div>
        <div id="immo-cmd-list"></div>
    `;
    document.body.appendChild(popup);

    const list = document.getElementById('immo-cmd-list');
    Object.keys(targets).forEach(id => {
        const row = document.createElement('div');
        row.className = 'immo-cmd-row';
        row.setAttribute('data-target-id', id);
        row.innerHTML = `
            <span class="immo-cmd-id">${id}</span>
            <div class="immo-cmd-actions">
                <button class="immo-btn immo-btn-down ${targets[id] === 'downgrade' ? 'primary' : ''}" data-action="0">NORMAL</button>
                <button class="immo-btn immo-btn-up ${targets[id] === 'upgrade' ? 'primary' : ''}" data-action="2">FIRST THIS</button>
            </div>
        `;
        list.appendChild(row);
    });

    // 3. The Logic (Hijacking Immotop's xajax)
    async function triggerAction(adId, typeValue, btn) {
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow.xajax_chListingFeat) {
            unsafeWindow.xajax_chListingFeat(adId, typeValue);
        } else if (window.xajax_chListingFeat) {
            window.xajax_chListingFeat(adId, typeValue);
        } else {
            // Fallback: Try to find the button in the actual DOM and click it
            const nativeBtn = document.querySelector(`.search-agency-item-container a[onclick*="xajax_chListingFeat('${adId}'"]`);
            if (nativeBtn) nativeBtn.click();
        }
    }

    list.addEventListener('click', async (e) => {
        if (e.target.tagName === 'BUTTON') {
            const btn = e.target;
            const adId = btn.closest('.immo-cmd-row').getAttribute('data-target-id');
            const typeValue = btn.getAttribute('data-action'); // 2 for First, 0 for Normal

            btn.classList.add('immo-btn-working');
            btn.textContent = '...';
            
            triggerAction(adId, typeValue, btn);

            setTimeout(() => {
                btn.classList.remove('immo-btn-working');
                syncButtonStates();
            }, 1500);
        }
    });

    // 4. State Sync (Graying out what's already done)
    function syncButtonStates() {
        const containers = Array.from(document.querySelectorAll('.search-agency-item-container'));
        Object.keys(targets).forEach(id => {
            const row = document.querySelector(`.immo-cmd-row[data-target-id="${id}"]`);
            if (!row) return;

            const upBtn = row.querySelector('.immo-btn-up');
            const downBtn = row.querySelector('.immo-btn-down');

            let isFirst = false;
            for (let c of containers) {
                if (c.innerHTML.includes(id) && c.querySelector('.ad-badge.first')) {
                    isFirst = true; break;
                }
            }

            if (isFirst) {
                upBtn.disabled = true; upBtn.textContent = '✓ FIRST';
                downBtn.disabled = false; downBtn.textContent = 'DOWNGRADE';
            } else {
                upBtn.disabled = false; upBtn.textContent = 'FIRST THIS';
                downBtn.disabled = true; downBtn.textContent = '✓ NORMAL';
            }
        });
    }

    // 5. Dragging & Init
    document.getElementById('immo-cmd-close').onclick = () => popup.remove();
    const header = document.getElementById('immo-cmd-header');
    let isDragging = false, startX, startY;
    header.onmousedown = (e) => {
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = popup.getBoundingClientRect();
        popup.style.transform = 'none'; popup.style.left = rect.left + 'px'; popup.style.top = rect.top + 'px'; popup.style.right = 'auto';
        window.onmousemove = (ev) => {
            if (!isDragging) return;
            popup.style.left = (parseInt(popup.style.left, 10) + (ev.clientX - startX)) + 'px';
            popup.style.top = (parseInt(popup.style.top, 10) + (ev.clientY - startY)) + 'px';
            startX = ev.clientX; startY = ev.clientY;
        };
        window.onmouseup = () => { isDragging = false; window.onmousemove = null; };
    };

    setInterval(syncButtonStates, 2000);
    syncButtonStates();
})();
