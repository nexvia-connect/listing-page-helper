// Github URL: listing-highlight-helper.js
(function() {
    'use strict';

    const COLOR_FIRST = '#62c462';          
    const COLOR_DOWNGRADE = '#ef4444';      
    const COLOR_FIRST_DONE = '#a3dca3';     
    const COLOR_DOWNGRADE_DONE = '#fca5a5'; 

    let targetIds = [];
    let downgradeId = null;
    let hasScannedPagination = false;

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
            hasScannedPagination = false;
        } else {
            const stored = sessionStorage.getItem('immotop_target_ids');
            if (stored) targetIds = JSON.parse(stored);
        }

        const downgradeParam = queryParams.find(param => param.startsWith('downgrade='));
        if (downgradeParam) {
            downgradeId = downgradeParam.split('=')[1];
            sessionStorage.setItem('immotop_downgrade_id', downgradeId);
            hasScannedPagination = false;
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

    async function scanPaginationPages() {
        if (!isImmotop || hasScannedPagination) return;
        if (targetIds.length === 0 && !downgradeId) return;

        hasScannedPagination = true;

        const numberLinks = Array.from(document.querySelectorAll('#paginator nav ul li a[data-pg]'));
        const visiblePages = numberLinks.map(a => parseInt(a.getAttribute('data-pg'), 10)).filter(n => !isNaN(n));
        
        const minVisible = visiblePages.length > 0 ? Math.min(...visiblePages) : 1;
        const maxVisible = visiblePages.length > 0 ? Math.max(...visiblePages) : 1;

        let basePath = window.location.pathname.replace(/index\d*\.html$/, '');
        if (!basePath.endsWith('/')) basePath += '/';

        let nextState = { firstAction: false, firstDone: false, downAction: false, downDone: false };
        let prevState = { firstAction: false, firstDone: false, downAction: false, downDone: false };

        const MAX_PAGES_TO_SCAN = 30;
        let consecutiveEmptyPages = 0;

        // Tracking mechanisms for early exit
        let foundUpgrades = new Set();
        let foundDown = false;

        for (let p = 1; p <= MAX_PAGES_TO_SCAN; p++) {
            try {
                const url = `${basePath}index${p}.html`;
                const response = await fetch(url);
                
                if (!response.ok) break;

                const html = await response.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const containers = Array.from(doc.querySelectorAll('.search-agency-item-container'));

                if (containers.length === 0) {
                    consecutiveEmptyPages++;
                    if (consecutiveEmptyPages >= 2) break; 
                    continue;
                } else {
                    consecutiveEmptyPages = 0;
                }

                let pageState = { firstAction: false, firstDone: false, downAction: false, downDone: false };
                
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
                            foundUpgrades.add(adId); // Track found upgrade
                            if (nativeBadge) pageState.firstDone = true;
                            else pageState.firstAction = true;
                        } else if (adId === downgradeId) {
                            foundDown = true; // Track found downgrade
                            if (!nativeBadge) pageState.downDone = true;
                            else pageState.downAction = true;
                        }
                    }
                });

                if (p < minVisible) {
                    if (pageState.firstAction) prevState.firstAction = true;
                    if (pageState.firstDone) prevState.firstDone = true;
                    if (pageState.downAction) prevState.downAction = true;
                    if (pageState.downDone) prevState.downDone = true;
                } else if (p > maxVisible) {
                    if (pageState.firstAction) nextState.firstAction = true;
                    if (pageState.firstDone) nextState.firstDone = true;
                    if (pageState.downAction) nextState.downAction = true;
                    if (pageState.downDone) nextState.downDone = true;
                } else {
                    const numberBtn = document.querySelector(`#paginator a[href$="index${p}.html"]:not(.prev-next)`);
                    if (numberBtn && (pageState.firstAction || pageState.firstDone || pageState.downAction || pageState.downDone)) {
                        applyPaginatorStyle(numberBtn.closest('li') || numberBtn, pageState);
                    }
                }

                // Check for early exit condition
                const allUpgradesFound = targetIds.every(id => foundUpgrades.has(id));
                const downgradeSatisfied = downgradeId ? foundDown : true;

                if (allUpgradesFound && downgradeSatisfied) {
                    break; // Stop fetching, we found everything!
                }

            } catch (err) {
                console.error('Immotop Helper: Error during sequential scan', err);
                break;
            }
        }

        const prevArrowBtn = document.querySelector('.arr.pg-btn-left') || document.querySelector('.prev-next:first-of-type');
        const nextArrowBtn = document.querySelector('.arr.pg-btn-right') || document.querySelector('.prev-next:last-of-type');
        
        if (prevArrowBtn && (prevState.firstAction || prevState.firstDone || prevState.downAction || prevState.downDone)) {
            applyPaginatorStyle(prevArrowBtn, prevState);
        }
        if (nextArrowBtn && (nextState.firstAction || nextState.firstDone || nextState.downAction || nextState.downDone)) {
            applyPaginatorStyle(nextArrowBtn, nextState);
        }
    }

    function applyPaginatorStyle(targetElement, state) {
        if (!targetElement) return;

        let colorLeft = state.firstAction ? COLOR_FIRST : (state.firstDone ? COLOR_FIRST_DONE : null);
        let colorRight = state.downAction ? COLOR_DOWNGRADE : (state.downDone ? COLOR_DOWNGRADE_DONE : null);
        let isGlow = (state.firstAction || state.downAction);

        let bgStyle = "";
        let shadowStyle = "";

        if (colorLeft && colorRight) {
            bgStyle = `background: linear-gradient(135deg, ${colorLeft} 0%, ${colorRight} 100%) !important; border: none !important;`;
            shadowStyle = isGlow ? `box-shadow: -4px 0 12px ${colorLeft}, 4px 0 12px ${colorRight} !important; z-index: 10; position: relative;` : '';
        } else if (colorLeft) {
            bgStyle = `background-color: ${colorLeft} !important; border: 1px solid ${colorLeft} !important;`;
            shadowStyle = isGlow ? `box-shadow: 0 0 15px ${colorLeft} !important; z-index: 10; position: relative;` : '';
        } else if (colorRight) {
            bgStyle = `background-color: ${colorRight} !important; border: 1px solid ${colorRight} !important;`;
            shadowStyle = isGlow ? `box-shadow: 0 0 15px ${colorRight} !important; z-index: 10; position: relative;` : '';
        }

        if (bgStyle) {
            targetElement.style.cssText += `
                ${bgStyle}
                ${shadowStyle}
                border-radius: 4px;
                transition: all 0.3s ease;
            `;
            
            const link = targetElement.tagName.toLowerCase() === 'a' ? targetElement : targetElement.querySelector('a');
            if (link) {
                link.style.cssText += `color: #fff !important; font-weight: bold !important; background: transparent !important;`;
                const icon = link.querySelector('i');
                if (icon) icon.style.color = '#fff !important;';
            }
        }
    }

    function initApp() {
        syncState();
        enforceHighlights();
        scanPaginationPages(); 

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
