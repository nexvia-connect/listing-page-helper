// Github URL: listing-page-format-command.js
(function() {
    'use strict';

    // 1. Parse the IDs from the URL or sessionStorage
    let targetIds = [];
    let searchStr = window.location.search;
    
    // Check session storage just in case the URL was already stripped by the router
    const savedSearch = sessionStorage.getItem('immo_helper_search_command');
    if (savedSearch) {
        searchStr = savedSearch;
        sessionStorage.removeItem('immo_helper_search_command');
    }

    const queryParams = searchStr.replace('?', '').split('&');
    
    queryParams.forEach(param => {
        if (param.startsWith('upgrade=')) targetIds.push(param.split('=')[1]);
        else if (/^\d{6,8}$/.test(param)) targetIds.push(param);
    });
    
    // Deduplicate IDs just in case
    targetIds = [...new Set(targetIds)];

    // If no targets, don't show the popup
    if (targetIds.length === 0) return;

    // 2. Inject sleek CSS for the popup
    const style = document.createElement('style');
    style.textContent = `
        #immo-cmd {
            position: fixed; bottom: 30px; right: 30px; width: 320px; 
            background: #ffffff; border-radius: 12px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.15); border: 1px solid #e5e7eb;
            z-index: 999999; font-family: system-ui, -apple-system, sans-serif; 
            overflow: hidden; display: flex; flex-direction: column;
        }
        #immo-cmd-header {
            background: #1f2937; color: #ffffff; padding: 16px; 
            font-weight: 700; font-size: 14px; letter-spacing: 0.5px;
            display: flex; justify-content: space-between; align-items: center;
        }
        #immo-cmd-close { cursor: pointer; color: #9ca3af; transition: color 0.2s; }
        #immo-cmd-close:hover { color: #ffffff; }
        #immo-cmd-list {
            padding: 0; margin: 0; list-style: none; 
            max-height: 400px; overflow-y: auto;
        }
        .immo-cmd-item {
            padding: 16px; border-bottom: 1px solid #f3f4f6; 
            display: flex; justify-content: space-between; align-items: center;
            transition: background 0.2s;
        }
        .immo-cmd-item:hover { background: #f9fafb; }
        .immo-cmd-id { font-weight: 600; color: #374151; font-size: 14px; }
        
        /* Button Styles */
        .immo-btn {
            padding: 8px 16px; border: none; border-radius: 6px; 
            font-weight: 700; font-size: 12px; cursor: pointer; 
            transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .immo-btn-first { background: #62c462; color: white; }
        .immo-btn-first:hover { background: #51a351; transform: translateY(-1px); }
        .immo-btn-working { background: #fbbf24; color: #fff; cursor: wait; }
        .immo-btn-done { background: #e5e7eb; color: #6b7280; box-shadow: none; }
        .immo-btn-done:hover { background: #d1d5db; color: #ef4444; } /* Shows red on hover to imply "Unpress" */
    `;
    document.head.appendChild(style);

    // 3. Build the DOM elements
    const cmd = document.createElement('div');
    cmd.id = 'immo-cmd';
    cmd.innerHTML = `
        <div id="immo-cmd-header">
            <span>🚀 Bulk Action Center</span>
            <span id="immo-cmd-close">✖</span>
        </div>
        <ul id="immo-cmd-list"></ul>
    `;
    document.body.appendChild(cmd);

    const list = document.getElementById('immo-cmd-list');

    // Populate the list with our targets
    targetIds.forEach(id => {
        const li = document.createElement('li');
        li.className = 'immo-cmd-item';
        li.innerHTML = `
            <span class="immo-cmd-id">ID: ${id}</span>
            <button class="immo-btn immo-btn-first" data-id="${id}">FIRST THIS</button>
        `;
        list.appendChild(li);
    });

    // Close button logic
    document.getElementById('immo-cmd-close').addEventListener('click', () => {
        cmd.style.display = 'none';
    });

    // 4. The Magic Click Handler (Where the POST request will go)
    list.addEventListener('click', async (e) => {
        if (e.target.tagName === 'BUTTON') {
            const btn = e.target;
            const adId = btn.getAttribute('data-id');
            const currentState = btn.getAttribute('data-state') || 'action';

            if (currentState === 'working') return; // Prevent spam clicking

            if (currentState === 'done') {
                // TODO: Wire up the "Unpress / Downgrade" POST request here
                btn.textContent = 'FIRST THIS';
                btn.className = 'immo-btn immo-btn-first';
                btn.setAttribute('data-state', 'action');
                
            } else {
                // UI feedback while making the request
                btn.textContent = 'WORKING...';
                btn.className = 'immo-btn immo-btn-working';
                btn.setAttribute('data-state', 'working');

                // TODO: Wire up the actual "Upgrade" POST request here using fetch()
                
                // Simulating network delay for now
                setTimeout(() => {
                    btn.textContent = '✓ DONE';
                    btn.className = 'immo-btn immo-btn-done';
                    btn.setAttribute('data-state', 'done');
                }, 800);
            }
        }
    });

})();
