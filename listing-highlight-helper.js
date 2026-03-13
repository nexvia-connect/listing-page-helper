// Github URL: listing-highlight-helper.js
(function() {
    'use strict';

    const COLOR_FIRST = '#62c462';          
    const COLOR_DOWNGRADE = '#ef4444';      
    const COLOR_FIRST_DONE = '#a3dca3';     
    const COLOR_DOWNGRADE_DONE = '#fca5a5'; 

    let targetIds = [];
    let downgradeId = null;
    let hasScannedPagination = false; // Prevent infinite background fetches

    const isImmotop = window.location.hostname.includes('immotop.lu');
    const isAthome = window.location.hostname.includes('athome.lu');
    const isWortimmo = window.location.hostname.includes('wortimmo.lu');

    function syncState() {
        let searchStr = window.location.search;
        const savedSearch = sessionStorage.getItem('immo_helper_search_highlight');
        
        if (savedSearch) {
            searchStr = savedSearch;
            sessionStorage.removeItem('immo_helper_search_highlight'); 
        }

        const queryParams = searchStr.replace('?', '').split('&');
        let parsedNewIds = [];

        queryParams.forEach(param => {
            if (param.startsWith('upgrade=')) {
                parsedNewIds.push(param.split('=')[1]);
            } else if (/^\d{6,8}$/.test(param)) { 
                parsedNewIds.push(param);
            }
        });

        if (parsedNewIds.length > 0) {
            targetIds = parsedNewIds;
            sessionStorage.setItem('immotop_target_ids', JSON.stringify(targetIds));
            hasScannedPagination = false; // Reset scan state if new IDs are added
        } else {
            const stored = sessionStorage.getItem('immotop_target_ids');
            if (stored) targetIds = JSON.parse(stored);
        }

        const downgradeParam = queryParams.find(param => param.startsWith('downgrade='));
        if (downgradeParam) {
            downgradeId = downgradeParam.split('=')[1];
            sessionStorage.setItem('immotop_downgrade_id', downgradeId);
            hasScannedPagination = false; // Reset scan state
        } else if (parsedNewIds.length > 0) {
            sessionStorage.removeItem('immotop_downgrade_id');
            downgradeId = null;
        } else {
            const storedDown = sessionStorage.getItem('immotop_downgrade_id');
            if (storedDown) downgradeId = storedDown;
        }
        
        if (queryParams.some(p => p.startsWith('find=')) && parsedNewIds.length === 0 && !downgradeParam) {
            targetIds = [];
            downgradeId = null;
            sessionStorage.removeItem('immotop_target_ids');
            sessionStorage.removeItem('immotop_downgrade_id');
        }
    }

    function addOrUpdateBadge(container, text, bgColor) {
        const targetEl = isAthome ? (container.querySelector('td') || container) : container;
        if (isAthome || isWortimmo) targetEl.style.position = 'relative';

        let badge = targetEl.querySelector('.immo-status-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'immo-status-badge';
            targetEl.appendChild(badge);
        }

        if (badge.textContent !== text) badge.textContent = text;

        const badgeStyles = `
            position: absolute; top: 0; right: 0; background: ${bgColor}; color: white;
            padding: 4px 16px; border-radius: 0 0 0 8px; font-family: system-ui, sans-serif;
            font-size: 12px; font-weight: 800; letter-spacing: 1px;
            box-shadow: -2px 2px 10px rgba(0,0,0,0.2); z-index: 999; pointer-events: none;
        `;

        if (badge.getAttribute('data-style') !== badgeStyles) {
            badge.style.cssText = badgeStyles;
            badge.setAttribute('data-style', badgeStyles);
        }
    }

    function removeBadge(container) {
        const targetEl = isAthome ? (container.querySelector('td') || container) : container;
        const badge = targetEl.querySelector('.immo-status-badge');
        if (badge) badge.remove();
    }

    function enforceHighlights() {
        if (targetIds.length === 0 && !downgradeId) return;

        let containers = [];
        if (isImmotop) {
            containers = Array.from(document.querySelectorAll('.search-agency-item-container'));
        } else if (isAthome) {
            containers = Array.from(document.querySelectorAll('tbody tr.bg-white'));
        } else if (isWortimmo) {
            containers = Array.from(document.querySelectorAll('div[itemprop="itemListElement"]'));
        }

        containers.forEach(container => {
            let matchType = null;
            let adId = null;
            let nativeBadge = null;

            if (isImmotop) {
                const link = container.querySelector('a[href*="/annonces/"]');
                if (link) {
                    const match = link.href.match(/\/annonces\/(\d+)/);
                    if (match && match[1]) adId = match[1];
                }
                nativeBadge = container.querySelector('.ad-badge.first');
            } else if (isAthome) {
                const refSpans = Array.from(container.querySelectorAll('span.text-xs.text-raven'));
                refSpans.forEach(span => {
                    if (span.textContent.includes('ID:')) adId = span.textContent.replace('ID:', '').trim();
                });
            } else if (isWortimmo) {
                if (container.id && container.id.startsWith('obj_')) {
                    adId = container.id.replace('obj_', '');
                }
            }

            if (adId) {
                if (targetIds.includes(adId)) {
                    matchType = 'highlight';
                } else if (adId === downgradeId) {
                    matchType = 'downgrade';
                }
            }

            let newState = 'none';
            if (matchType === 'highlight') {
                newState = !!nativeBadge ? 'highlight_done' : 'highlight_action';
            } else if (matchType === 'downgrade') {
                newState = !nativeBadge ? 'downgrade_done' : 'downgrade_action';
            }

            if (container.dataset.immoHighlightState !== newState) {
                container.dataset.immoHighlightState = newState;

                const applyStyles = (borderColor, isGlow) => {
                    if (isAthome || isWortimmo) {
                        container.style.cssText = `position: relative; outline: 4px solid ${borderColor} !important; outline-offset: -4px; z-index: 10; ${isGlow ? `box-shadow: inset 0 0 20px ${borderColor} !important;` : ''}`;
                    } else {
                        container.style.cssText = `position: relative; border: 4px solid ${borderColor} !important; box-sizing: border-box; ${isGlow ? `box-shadow: 0 0 25px 4px ${borderColor} !important; border-width: 8px !important;` : ''}`;
                    }
                };

                if (newState === 'highlight_done') {
                    applyStyles(COLOR_FIRST_DONE, false);
                    addOrUpdateBadge(container, '\u2713', COLOR_FIRST_DONE);
                    if (nativeBadge) nativeBadge.style.setProperty('background-color', COLOR_FIRST_DONE, 'important');
                } else if (newState === 'highlight_action') {
                    applyStyles(COLOR_FIRST, true);
                    addOrUpdateBadge(container, 'FIRST THIS!', COLOR_FIRST);
                } else if (newState === 'downgrade_done') {
                    applyStyles(COLOR_DOWNGRADE_DONE, false);
                    addOrUpdateBadge(container, '\u2713', COLOR_DOWNGRADE_DONE);
                } else if (newState === 'downgrade_action') {
                    applyStyles(COLOR_DOWNGRADE, true);
                    addOrUpdateBadge(container, 'DOWNGRADE THIS!', COLOR_DOWNGRADE);
                    if (nativeBadge) nativeBadge.style.removeProperty('background-color');
                } else if (newState === 'none') {
                    container.style.cssText = ''; 
                    removeBadge(container);
                    if (nativeBadge) nativeBadge.style.removeProperty('background-color');
                }
            }
        });
    }

    // --- NEW: Background Scanner Logic ---
    async function scanPaginationPages() {
        if (!isImmotop || hasScannedPagination) return;
        if (targetIds.length === 0 && !downgradeId) return;

        const paginatorLinks = Array.from(document.querySelectorAll('#paginator a[href]'));
        if (paginatorLinks.length === 0) return;

        hasScannedPagination = true; // Mark as scanned immediately to prevent re-triggering

        // Collect unique URLs, ignoring current page indicators
        const urlsToScan = new Set();
        const currentUrlBase = window.location.pathname.split('/').pop();

        paginatorLinks.forEach(link => {
            const hrefStr = link.getAttribute('href');
            if (hrefStr && hrefStr.includes('index') && 
                !link.classList.contains('current') && 
                !link.parentElement.classList.contains('is_current') &&
                !hrefStr.includes(currentUrlBase)) {
                urlsToScan.add(link.href);
            }
        });

        for (const url of urlsToScan) {
            try {
                const response = await fetch(url);
                const html = await response.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                
                let pageNeedsFirstAction = false;
                let pageNeedsFirstDone = false;
                let pageNeedsDownAction = false;
                let pageNeedsDownDone = false;

                const containers = Array.from(doc.querySelectorAll('.search-agency-item-container'));
                
                containers.forEach(container => {
                    let adId = null;
                    const link = container.querySelector('a[href*="/annonces/"]');
                    if (link) {
                        const match = link.href.match(/\/annonces\/(\d+)/);
                        if (match && match[1]) adId = match[1];
                    }
                    const nativeBadge = container.querySelector('.ad-badge.first');

                    if (adId) {
                        if (targetIds.includes(adId)) {
                            if (nativeBadge) pageNeedsFirstDone = true;
                            else pageNeedsFirstAction = true;
                        } else if (adId === downgradeId) {
                            if (!nativeBadge) pageNeedsDownDone = true;
                            else pageNeedsDownAction = true;
                        }
                    }
                });

                // Prioritize "Action Needed" over "Done" styles if a page has multiple targets
                let colorToApply = null;
                let isGlow = false;

                if (pageNeedsFirstAction) {
                    colorToApply = COLOR_FIRST;
                    isGlow = true;
                } else if (pageNeedsDownAction) {
                    colorToApply = COLOR_DOWNGRADE;
                    isGlow = true;
                } else if (pageNeedsFirstDone) {
                    colorToApply = COLOR_FIRST_DONE;
                    isGlow = false;
                } else if (pageNeedsDownDone) {
                    colorToApply = COLOR_DOWNGRADE_DONE;
                    isGlow = false;
                }

                if (colorToApply) {
                    // Find all links in the paginator pointing to this specific URL
                    const matchingLinks = document.querySelectorAll(`#paginator a[href$="${new URL(url).pathname.split('/').pop()}"]`);
                    
                    matchingLinks.forEach(link => {
                        // Apply styling to the <li> wrapper if it exists (for pg_wide), otherwise the <a> itself (for pg_small)
                        const targetToStyle = link.closest('li') || link; 
                        
                        targetToStyle.style.cssText = `
                            background-color: ${colorToApply} !important;
                            border: 1px solid ${colorToApply} !important;
                            border-radius: 4px;
                            transition: all 0.3s ease;
                            ${isGlow ? `box-shadow: 0 0 15px ${colorToApply} !important; z-index: 10; position: relative;` : ''}
                        `;
                        link.style.cssText = `color: #fff !important; font-weight: bold !important;`;
                    });
                }

            } catch (err) {
                console.error('Immotop Helper: Error fetching page for pagination highlights', err);
            }
        }
    }
    // --- END NEW LOGIC ---

    function initApp() {
        syncState();
        enforceHighlights();
        scanPaginationPages(); // Trigger background scan on load

        let mutTimeout;
        const observer = new MutationObserver(() => {
            clearTimeout(mutTimeout);
            mutTimeout = setTimeout(enforceHighlights, 150);
        });
        
        const waitForBody = setInterval(() => {
            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true });
                clearInterval(waitForBody);
            }
        }, 50);

        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                syncState();
                enforceHighlights();
                // If URL changes dynamically via pushState, re-scan pagination just in case
                hasScannedPagination = false;
                scanPaginationPages(); 
            }
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();
